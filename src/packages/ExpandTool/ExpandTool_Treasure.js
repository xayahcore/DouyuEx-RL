var isGetTreasure = false;
// 宝箱延迟的合法区间：旧实现直接 Number(input.value)，填 0 / 负数 / 乱码时
// setTimeout 会立刻执行 —— 表现就是毫无间隔地疯狂抢宝箱（容易被风控）。
const TREASURE_DELAY_MIN = 500;
const TREASURE_DELAY_DEFAULT = 3200;

function initPkg_ExpandTool_Treasure() {
    ExpandTool_Treasure_insertFunc();
    ExpandTool_Treasure_Set();
}

/** 复位宝箱开关：取消勾选 + 落盘（保留用户填的延迟），保证界面与存储一致 */
function ExpandTool_Treasure_reset(message) {
    isGetTreasure = false;
    const box = document.getElementById("extool__treasure_start");
    if (box) box.checked = false;
    saveData_Treasure();
    if (message) showMessage(message, "error");
}

function ExpandTool_Treasure_insertFunc() {
    const box = document.getElementById("extool__treasure_start");
    if (!box) {
        if (typeof ExGuard_warn === "function") ExGuard_warn("自动宝箱", "面板里的开关不存在，本次不绑定（其它扩展功能不受影响）");
        return;
    }
    box.addEventListener("click", function() {
        // 关键：then 之外必须有 catch —— verifyFans 失败时旧实现是 unhandled rejection，
        // 勾选被点成选中、isGetTreasure 却没变、存储也没写。
        verifyFans("5189167", 9).then(r => { // 请尊重作者劳动成果，在此感谢
            if (r == true) {
                if (box.checked == true) {
                    // 开始
                    isGetTreasure = true;
                    getTreasure_Existing();
                } else{
                    // 停止
                    isGetTreasure = false;
                }
                saveData_Treasure();
            } else {
                box.checked = false;
                saveData_Treasure();
                showMessage("本功能需拥有9级歆崽粉丝牌(5189167)才可使用", "error");
            }
        }).catch(err => {
            if (typeof ExGuard_warn === "function") ExGuard_warn("自动宝箱", "粉丝牌校验失败，已复位开关", err);
            ExpandTool_Treasure_reset("【自动宝箱】网络异常，请重试");
        });
	});
}


function saveData_Treasure() {
    const box = document.getElementById("extool__treasure_start");
    if (!box) return;
    isGetTreasure = box.checked;
    // 存"用户原样填的值"，归一化只在真正用的时候做（getTreasureDelay）——
    // 这样刷新后输入框里还是他填的数字，不会被脚本悄悄改写。
    const delayEl = document.getElementById("extool__treasure_delay");
    let data = {
        isGetTreasure: isGetTreasure,
        treasureDelay: delayEl ? delayEl.value : String(TREASURE_DELAY_DEFAULT),
	}
	localStorage.setItem("ExSave_Treasure", JSON.stringify(data)); // 存储弹幕列表
}

function ExpandTool_Treasure_Set() {
	// 设置初始化
    let ret = localStorage.getItem("ExSave_Treasure");
	if (ret == null) return;
    // 本地存了坏数据时旧实现直接 JSON.parse 抛错 → 整个 initPkg_ExpandTool 中断
    let retJson = null;
    try {
        retJson = JSON.parse(ret);
    } catch (e) {
        if (typeof ExGuard_warn === "function") ExGuard_warn("自动宝箱", "本地设置已损坏，按「未开启」处理", e);
        return;
    }
    if (!retJson || typeof retJson !== "object") return;
    const delayEl = document.getElementById("extool__treasure_delay");
    if (delayEl) {
        delayEl.value = ("treasureDelay" in retJson) ? retJson.treasureDelay : String(TREASURE_DELAY_DEFAULT);
    }
    if (retJson.isGetTreasure != true) return;
    verifyFans("5189167", 9).then(r => {
        if (r == true) {
            const box = document.getElementById("extool__treasure_start");
            if (box) box.click();
        } else {
            ExpandTool_Treasure_reset("本功能需拥有9级歆崽粉丝牌(5189167)才可使用");
        }
    }).catch(err => {
        // 网络问题不是「没牌子」：静默复位，别误报
        if (typeof ExGuard_warn === "function") ExGuard_warn("自动宝箱", "恢复上次开关状态时粉丝牌校验失败，已按关闭处理", err);
        ExpandTool_Treasure_reset(null);
    });
}


function getTreasureDelay() {
    const delayEl = document.getElementById("extool__treasure_delay");
    const raw = delayEl ? delayEl.value : "";
    const value = Number(raw);
    // 0 / 负数 / 空 / 乱码一律按默认处理：绝不让 setTimeout 以负延迟立刻触发
    if (!isFinite(value) || value <= 0) return TREASURE_DELAY_DEFAULT;
    return Math.max(TREASURE_DELAY_MIN, Math.floor(value));
}

function getTreasure_Existing() {
    getTslist(data => {
        if (data == null) {
            return;
        }
        if (!data.list) {
            if (typeof ExGuard_warn === "function") ExGuard_warn("自动宝箱", "宝箱列表为空或结构不符合预期，本次不处理");
            return;
        }
        // let list = String(data.list).split("@S/");
        for (let i = 0; i < data.list.length - 1; i++) {
            let item = data.list[i];
            // let rpid = getStrMiddle(list[i], "rpid@A=", "@");
            let rpid = item.rpid;
            // let ot = getStrMiddle(list[i], "Sot@A=", "@");
            let ot = item.ot;
            let did = getCookieValue("dy_did");
            let timeout = Number(ot) - Math.floor(Date.now()/1000);

            let a = document.createElement("div");
            let idName = "Ex_Geetest_no" + String(treasureNum);
            a.id = idName;
            // 容器不在时旧实现 b.appendChild 直接 TypeError，整个 tslist 回调阵亡
            let b = document.getElementById("Ex_Geetest");
            if (!b) {
                if (typeof ExGuard_warn === "function") ExGuard_warn("自动宝箱", "缺少 #Ex_Geetest 容器，本次不处理宝箱");
                return;
            }
            b.appendChild(a);

            if (timeout >= 0) {
                timeout = timeout * 1000 + getTreasureDelay();
                treasureNum++;
                setTimeout(() => {
                    getTreasure(rid, rpid, did, idName);
                }, timeout);
            } else {
                getTreasure(rid, rpid, did, idName);
            }
        }
    });
}

function getTslist(callback) {
    if (unsafeWindow.socketProxy?.socketStream?.subscribe) {
        try {
            unsafeWindow.socketProxy.socketStream.subscribe('tslist', callback);
        } catch(e) {}
    } else {
        let retry = 0;
        let t = setInterval(() => {
            retry++;
            if (unsafeWindow.socketProxy?.socketStream?.subscribe) {
                clearInterval(t);
                try {
                    unsafeWindow.socketProxy.socketStream.subscribe('tslist', callback);
                } catch(e) {}
            } else if (retry > 30) {
                clearInterval(t);
            }
        }, 1000);
    }
}
