let current_barrage_status = 0; // 0没被简化 1被简化

function initPkg_Refresh_Barrage() {
	initPkg_Refresh_Barrage_Dom();
    initPkg_Refresh_Barrage_Func();
    initPkg_Refresh_Barrage_Set();
}

function initPkg_Refresh_Barrage_Dom() {
	Refresh_Barrage_insertIcon();
}
function Refresh_Barrage_insertIcon() {
	let a = document.createElement("a");
    a.className = "refresh-barrage";
    a.id = "refresh-barrage";
	a.innerHTML = '<svg t="1588051109604" id="refresh-barrage__svg" class="icon" viewBox="0 0 1024 1024" version="1.1" xmlns="http://www.w3.org/2000/svg" p-id="3095" width="16" height="16"><path d="M588.416 516.096L787.2 317.312a54.016 54.016 0 1 0-76.416-76.416L512 439.68 313.216 241.024A54.016 54.016 0 1 0 236.8 317.376l198.784 198.848-198.016 197.888a54.016 54.016 0 1 0 76.416 76.416L512 592.576l197.888 197.952a54.016 54.016 0 1 0 76.416-76.416L588.416 516.096z" fill="#AFAFAF" p-id="3096"></path></svg><i class="Barrage-toolbarIcon"></i><span id="refresh-barrage__text" class="Barrage-toolbarText">前缀</span>';
	let b = document.getElementsByClassName("Barrage-toolbar")[0];
	if (b) b.insertBefore(a, b.childNodes[0]);
}

/** 两态外观：文案跟着状态走（关=「前缀」/ 开=「恢复前缀」） */
function Refresh_Barrage_applyUI(active) {
    const btn = document.getElementById("refresh-barrage");
    if (btn) btn.classList[active ? "add" : "remove"]("ex-active");
    const text = document.getElementById("refresh-barrage__text");
    if (text) {
        text.style.color = active ? "#fff" : "";
        text.innerText = active ? "恢复前缀" : "前缀";
    }
    const svg = document.getElementById("refresh-barrage__svg");
    if (svg) {
        const p = svg.getElementsByTagName("path")[0];
        if (p) p.setAttribute("fill", active ? "#ffffff" : "#AFAFAF");
    }
}

function initPkg_Refresh_Barrage_Func() {
	let btn = document.getElementById("refresh-barrage");
	if (btn) {
		btn.addEventListener("click", function() {
        if (current_barrage_status == 0) {
            const doApply = function () {
                setRefreshBarrage();
                saveData_Refresh();
            };
            // 弹窗库是全局依赖：没带上时不能让按钮变成"点了没反应"
            if (typeof PostbirdAlertBox === "undefined") {
                if (typeof showMessage === "function") {
                    showMessage("【简洁模式】缺少确认弹窗组件，已直接屏蔽弹幕前缀", "warning");
                }
                doApply();
                return;
            }
            PostbirdAlertBox.confirm({
                'title': '提示',
                'content': '是否屏蔽弹幕前缀（如粉丝牌、钻粉、贵族等标志）',
                'okBtn': '确定',
                'cancelBtn': '取消',
                'onConfirm': doApply,
                'onCancel': function () {
                }
            });
        } else {
            cancelRefreshBarrage();
	            saveData_Refresh();
	        }
	    });
	} else {
		// 弹幕工具条还没渲染：按钮没插进去，这里没有可绑的东西
		if (typeof ExGuard_warn === "function") ExGuard_warn("简洁模式", "「前缀」按钮不存在，本次不绑定");
	}
}


function refresh_Barrage_getStatus() {
    if (current_barrage_status == 1) {
        // 被简化
        return true;
    } else {
        // 没被简化
        return false;
    }
}

function initPkg_Refresh_Barrage_Set() {
    const saved = Refresh_readSave();
    const cfg = saved.barrage;
    if (!cfg || cfg.status != true) return;
    // 存储里开着就真的恢复（样式与状态都恢复），不依赖按钮是否已经插进 DOM
    setRefreshBarrage();
}
 
function setRefreshBarrage() {
    let cssText = `
    .UserCsgoGameDataMedal,.Barrage-honor,.Barrage-listItem .Barrage-icon,.Barrage-listItem .FansMedal.is-made,.Barrage-listItem .RoomLevel,.Barrage-listItem .Motor,.Barrage-listItem .ChatAchievement,.Barrage-listItem .Barrage-hiIcon,.Barrage-listItem .Medal,.Barrage-listItem .MatchSystemTeamMedal{display:none !important;}
    /*.Barrage-listItem .UserLevel{display:none !important;}*/
    .Barrage-listItem .Baby{display:none !important;}
    .FansMedalWrap{display:none !important;}
    `;
    StyleHook_set("Ex_Style_RefreshBarrage", cssText);
    current_barrage_status = 1;
    // 外观全部判空：.Barrage-toolbar 不在时按钮根本没插进去，
    // 旧实现这里裸取 .classList / .style → 恢复路径（Set 调用）当场抛（W6）
    Refresh_Barrage_applyUI(true);
}

function cancelRefreshBarrage() {
    StyleHook_remove("Ex_Style_RefreshBarrage");
    current_barrage_status = 0;
    Refresh_Barrage_applyUI(false);
}
