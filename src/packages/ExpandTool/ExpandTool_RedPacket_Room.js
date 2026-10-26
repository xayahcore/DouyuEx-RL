let redpackets_room_arr = [];
let redpacket_room_timer; // 时钟句柄
// 连续拉取失败多少次就自动关闭：每 60 秒一轮，接口改版/断网时不能无限重试刷屏
const REDPACKET_ROOM_MAX_FAIL = 3;
// 单个红包最多补抢几次：旧实现 isSuc==2 时无条件递归，接口一旦恒返回 2 就是死循环
const REDPACKET_ROOM_MAX_GRAB = 5;
let redpacketRoomFailCount = 0;

function initPkg_ExpandTool_RedPacket_Room() {
    ExpandTool_RedPacket_Room_insertFunc();
    ExpandTool_RedPacket_Room_Set();
}

/** 关闭自动抢红包并复位界面 + 存储：勾选框状态必须和 isGetRedPacket 一致 */
function ExpandTool_RedPacket_Room_stop(message) {
    const box = document.getElementById("extool__redpacekt_room_start");
    if (box) box.checked = false;
    if (redpacket_room_timer) clearInterval(redpacket_room_timer);
    redpacket_room_timer = 0;
    redpacketRoomFailCount = 0;
    saveData_RedPacket_Room();
    if (message) showMessage(message, "error");
}

function ExpandTool_RedPacket_Room_insertFunc() {
    const box = document.getElementById("extool__redpacekt_room_start");
    if (!box) {
        if (typeof ExGuard_warn === "function") ExGuard_warn("礼物红包", "面板里的开关不存在，本次不绑定（其它扩展功能不受影响）");
        return;
    }
    box.addEventListener("click", function() {
        // 关键：then 之外必须有 catch。verifyFans 内部 fetch / 解析失败时（断网、未登录、页面改版）
        // 旧实现是 unhandled rejection —— 勾选已被点成选中，但定时器没起、存储没写、也没有任何提示。
        verifyFans("5189167", 6).then(r => {
            if (r == true) {
                if (box.checked == true) {
                    // 开始自动抢红包
                    redpacketRoomFailCount = 0;
                    // 先清旧定时器再起新的：连点开关不再叠出多个 60 秒轮询
                    if (redpacket_room_timer) clearInterval(redpacket_room_timer);
                    redpacket_room_timer = setInterval(() => {
                        getRoomRedPacketsList(rid);
                    }, 60000);
                } else {
                    // 停止自动抢红包
                    if (redpacket_room_timer) clearInterval(redpacket_room_timer);
                    redpacket_room_timer = 0;
                    redpacketRoomFailCount = 0;
                }
                saveData_RedPacket_Room();
            } else {
                box.checked = false;
                saveData_RedPacket_Room();
                showMessage("本功能需拥有6级歆崽粉丝牌(5189167)才可使用", "error");
            }
        }).catch(err => {
            if (typeof ExGuard_warn === "function") ExGuard_warn("礼物红包", "粉丝牌校验失败，已复位开关", err);
            ExpandTool_RedPacket_Room_stop("【礼物红包】网络异常，请重试");
        });
	});

}


function getRoomRedPacketsList(room_id) {
    return fetch("https://www.douyu.com/japi/interactnc/web/propredpacket/getPrpList?type_id=1&room_id=" + room_id, {
        method: 'GET',
        mode: 'no-cors',
        credentials: 'include',
        headers: {'Content-Type': 'application/x-www-form-urlencoded'},
    }).then(res => {
        return res.json();
    }).then(ret => {
        // 判空：接口改版 / 风控页返回时 ret.data 或 list 都可能不在，
        // 旧实现 ret.data.list.length 直接 TypeError（每个 60 秒 tick 抛一次）
        const list = ret && ret.data && Array.isArray(ret.data.list) ? ret.data.list : null;
        if (!list) throw new Error("红包列表结构不符合预期（缺少 data.list）");
        redpacketRoomFailCount = 0; // 本轮成功，失败计数清零
        if (list.length === 0) return;
        for (let i = 0; i < list.length; i++) {
            let rpid = list[i].activityid;
            let offset = redpackets_room_arr.indexOf(rpid);
            let startTime = list[i].startTime;
            let to = Number(startTime) - Math.round(new Date().getTime()/1000);
            to = 1000 * to - 2000;
            if (offset == -1) {
                redpackets_room_arr.push(rpid);
                if (to > 0) {
                    setTimeout(() => {
                        getRoomRedPacket(rpid);
                        getRoomRedPacket(rpid);
                        getRoomRedPacket(rpid);
                        showMessage("【礼物红包】抢红包执行完毕！", "success");
                    }, to);
                } else {
                    getRoomRedPacket(rpid);
                    getRoomRedPacket(rpid);
                    getRoomRedPacket(rpid);
                    showMessage("【礼物红包】抢红包执行完毕！", "success");
                }
            }
        }
    }).catch(err => {
        redpacketRoomFailCount++;
        if (typeof ExGuard_warn === "function") {
            ExGuard_warn("礼物红包", "第 " + redpacketRoomFailCount + " 次拉取红包列表失败（每 60 秒重试一次）", err);
        }
        if (redpacketRoomFailCount >= REDPACKET_ROOM_MAX_FAIL) {
            ExpandTool_RedPacket_Room_stop("【礼物红包】连续 " + REDPACKET_ROOM_MAX_FAIL + " 次拉取失败，已自动关闭");
        }
    });
}



function getRoomRedPacket(rpid, attempt) {
    const tried = Number(attempt) || 0;
    return fetch("https://www.douyu.com/japi/interactnc/web/propredpacket/grab_prp", {
        method: 'POST',
        mode: 'no-cors',
        credentials: 'include',
        headers: {'Content-Type': 'application/x-www-form-urlencoded'},
        body: 'activityid=' + rpid + '&ctn=' + getCCN()
    }).then(res => {
        return res.json();
    }).then((ret) =>{
        const isSuc = ret && ret.data ? ret.data.isSuc : null;
        if (isSuc != 2) return;
        // 需要补抢：旧实现无条件递归，接口恒返回 2 时会无限打接口
        if (tried + 1 >= REDPACKET_ROOM_MAX_GRAB) {
            if (typeof ExGuard_warn === "function") {
                ExGuard_warn("礼物红包", "红包 " + rpid + " 补抢 " + REDPACKET_ROOM_MAX_GRAB + " 次仍未成功，放弃");
            }
            return;
        }
        getRoomRedPacket(rpid, tried + 1);
    }).catch(err => {
        // 旧实现没有 catch：抢红包请求失败就是一条 unhandled rejection
        if (typeof ExGuard_warn === "function") ExGuard_warn("礼物红包", "抢红包请求失败（" + rpid + "）", err);
    });
}


function saveData_RedPacket_Room() {
	const box = document.getElementById("extool__redpacekt_room_start");
	if (!box) return;
	let data = {
		isGetRedPacket: box.checked
	};
	localStorage.setItem("ExSave_RedPacket_Room", JSON.stringify(data)); // 存储弹幕列表
}

function ExpandTool_RedPacket_Room_Set() {
	// 设置初始化
    let ret = localStorage.getItem("ExSave_RedPacket_Room");
	if (ret == null) return;
    // 本地存了坏数据时旧实现直接 JSON.parse 抛错 → 整个 initPkg_ExpandTool 中断
    let retJson = null;
    try {
        retJson = JSON.parse(ret);
    } catch (e) {
        if (typeof ExGuard_warn === "function") ExGuard_warn("礼物红包", "本地设置已损坏，按「未开启」处理", e);
        return;
    }
    if (!retJson || retJson.isGetRedPacket != true) return;
    verifyFans("5189167", 6).then(r => {
        if (r == true) {
            const box = document.getElementById("extool__redpacekt_room_start");
            if (box) box.click();
        } else {
            ExpandTool_RedPacket_Room_stop("本功能需拥有6级歆崽粉丝牌(5189167)才可使用");
        }
    }).catch(err => {
        // 网络问题不是「没牌子」：静默复位即可，别误报粉丝牌不足
        if (typeof ExGuard_warn === "function") ExGuard_warn("礼物红包", "恢复上次开关状态时粉丝牌校验失败，已按关闭处理", err);
        ExpandTool_RedPacket_Room_stop(null);
    });
}

