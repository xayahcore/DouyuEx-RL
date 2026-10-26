function initPkg_Refresh_BarrageFrame() {
	initPkg_Refresh_BarrageFrame_Dom();
    initPkg_Refresh_BarrageFrame_Func();
    initPkg_Refresh_BarrageFrame_Set();
}

function initPkg_Refresh_BarrageFrame_Dom() {
	Refresh_BarrageFrame_insertIcon();
}
function Refresh_BarrageFrame_insertIcon() {
	let a = document.createElement("a");
    a.className = "refresh-barrage";
    a.id = "refresh-barrage-frame";
	a.innerHTML = '<svg t="1588051109604" id="refresh-barrage-frame__svg" class="icon" viewBox="0 0 1024 1024" version="1.1" xmlns="http://www.w3.org/2000/svg" p-id="3095" width="16" height="16"><path d="M512 128 192 448h192v448h256V448h192L512 128z" fill="#AFAFAF" p-id="3096"></path></svg><i class="Barrage-toolbarIcon"></i><span id="refresh-barrage-frame__text" class="Barrage-toolbarText">拉高</span>';
	let b = document.getElementsByClassName("Barrage-toolbar")[0];
	if (b) b.insertBefore(a, b.childNodes[0]);
}

/**
 * 两态外观：文案跟着状态走（关=「拉高」/ 开=「恢复高度」），不再只靠颜色区分。
 * 节点缺失就跳过 —— 外观失败不该影响功能本体。
 */
function Refresh_BarrageFrame_applyUI(active) {
    const btn = document.getElementById("refresh-barrage-frame");
    if (btn) btn.classList[active ? "add" : "remove"]("ex-active");
    const text = document.getElementById("refresh-barrage-frame__text");
    if (text) {
        text.style.color = active ? "#fff" : "";
        text.innerText = active ? "恢复高度" : "拉高";
    }
    const svg = document.getElementById("refresh-barrage-frame__svg");
    if (svg) {
        const p = svg.getElementsByTagName("path")[0];
        if (p) p.setAttribute("fill", active ? "#ffffff" : "#AFAFAF");
    }
}

/**
 * 真正执行「拉高 / 恢复」的 DOM 动作。
 * 缺节点（新版房间页多数已没有 #js-room-activity；首页/鱼吧连 .layout-Player-rank 都没有）
 * → 返回 false 并留痕，绝不裸解引用。
 * @param {boolean} raise true=拉高，false=恢复
 * @param {string} scene 触发场景，用于留痕定位（"点击" / "恢复"）
 */
function Refresh_BarrageFrame_apply(raise, scene) {
    const dom_rank = document.getElementsByClassName("layout-Player-rank")[0];
    const dom_activity = document.getElementById("js-room-activity");
    const dom_topBarrage = document.getElementsByClassName("Barrage")[0];
    if (!dom_rank || !dom_topBarrage) {
        if (typeof ExGuard_warn === "function") {
            ExGuard_warn("简洁模式", "缺少日榜或弹幕区节点，「拉高」本次未执行（场景：" + (scene || "未知") + "）");
        }
        return false;
    }
    if (raise) {
        dom_rank.style.display = "none";
        if (dom_activity) dom_activity.style.display = "none";
        dom_topBarrage.className = "Barrage top-0-important";
    } else {
        dom_rank.style.display = "block";
        if (dom_activity) dom_activity.style.display = "block";
        dom_topBarrage.className = "Barrage";
    }
    Refresh_BarrageFrame_applyUI(raise);
    return true;
}

function initPkg_Refresh_BarrageFrame_Func() {
	let btn = document.getElementById("refresh-barrage-frame");
	if (!btn) {
		// 弹幕工具条还没渲染：按钮没插进去，这里没有可绑的东西
		if (typeof ExGuard_warn === "function") ExGuard_warn("简洁模式", "「拉高」按钮不存在，本次不绑定");
		return;
	}
	btn.addEventListener("click", function() {
        // 当前是否已拉高：看日榜节点的真实 display（节点不在 = 没拉高）
        if (refresh_BarrageFrame_getStatus()) {
            if (Refresh_BarrageFrame_apply(false, "点击")) saveData_Refresh();
            return;
        }
        const doRaise = function () {
            if (Refresh_BarrageFrame_apply(true, "点击")) saveData_Refresh();
        };
        // 弹窗库是全局依赖：某个精简构建没带上时不能让按钮变成"点了没反应"
        if (typeof PostbirdAlertBox === "undefined") {
            if (typeof showMessage === "function") {
                showMessage("【简洁模式】缺少确认弹窗组件，已直接拉高弹幕框", "warning");
            }
            doRaise();
            return;
        }
        PostbirdAlertBox.confirm({
            'title': '提示',
            'content': '是否拉高弹幕框，隐藏日榜周榜',
            'okBtn': '确定',
            'cancelBtn': '取消',
            'onConfirm': doRaise,
            'onCancel': function () {
            }
        });
    });
}


function refresh_BarrageFrame_getStatus() {
    const dom_rank = document.getElementsByClassName("layout-Player-rank")[0];
    // 节点不在（首页 / 鱼吧 / 活动页，或直播间日榜还没渲染）→ 按「没拉高」处理。
    // 它是 saveData_Refresh() 的一部分，而保存动作被「拉高 / 前缀 / 隐藏礼物栏」三处共用：
    // 旧实现这里裸取 .style，于是非直播间点任何图标都会在**保存阶段**抛 TypeError。
    if (!dom_rank) return false;
    return dom_rank.style.display == "none";
}

function initPkg_Refresh_BarrageFrame_Set() {
    const saved = Refresh_readSave();
    const cfg = saved.barrageFrame;
    if (!cfg || cfg.status != true) return;
    // 存储里开着就真的恢复；节点不在时只跳过并留痕，**不**把手里的状态回写成 false
    //（下次进房 / 版式恢复后它还要能自动生效）。
    Refresh_BarrageFrame_apply(true, "恢复");
}
