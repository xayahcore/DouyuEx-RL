function initPkg_ExpandTool_FullScreen() {
    ExpandTool_FullScreen_insertFunc();
    ExpandTool_HighestVideoQuality_insertFunc();
    initPkg_ExpandTool_FullScreen_Set();
    initPkg_ExpandTool_HighestVideoQuality_Set();
}

function getFullScreen() {
    return document.getElementById("extool__fullscreen").checked;
}
function ExpandTool_FullScreen_insertFunc() {
    document.getElementById("extool__fullscreen").addEventListener("click", function() {
        saveData_FullScreen();
        if (getFullScreen()) {
            showMessage("刷新页面生效", "success");
        }
    });
}

function saveData_FullScreen() {
	let data = {
		isFullScreen: getFullScreen()
	}
	localStorage.setItem("ExSave_FullScreen", JSON.stringify(data));
}
function initPkg_ExpandTool_FullScreen_Set() {
	// 设置初始化
	let ret = localStorage.getItem("ExSave_FullScreen");
	if (ret != null) {
		let retJson = JSON.parse(ret);
        if (retJson.isFullScreen) {
            document.getElementById("extool__fullscreen").checked = retJson.isFullScreen;
        }
	}
}


function initFullScreen() {
	let ret = localStorage.getItem("ExSave_FullScreen");
	if (ret == null) return;
	let retJson = null;
	try {
		retJson = JSON.parse(ret);
	} catch (e) {
		return; // 存储被写坏按“没开”处理，不炸初始化
	}
	if (retJson && retJson.isFullScreen) {
		ExpandTool_autoWebFullScreen();
	}
}

/* ==================== 自动网页全屏（2026-11-08 重写） ====================
 * 真机探针结论（房间 9999）：
 *   ① 站点没有 setWebFullScreen / setFullScreen 之类可调 API
 *      （window.__player.onFullScreen 是浏览器全屏的回调，不是网页全屏开关）；
 *   ② 页面启动默认普通布局，网页全屏只能由播放器控制条上的按钮触发；
 *   ③ 旧主选择器 div.wfs-2a8e83 已 0 命中；旧兜底靠 .icon-c8be96 的固定下标盲点，
 *      而且 observe(document.body) 在 document-start 会是 null —— 重试链当场就死了。
 * 现在：先用图标签名（“进入网页全屏”那枚 SVG 的 path 固定以 M20 25h6v-6 开头；
 *   全屏态会换成退出图标，但那时函数已经直接 return，不需要匹配），
 * 再退到旧选择器与控制条尾部候选；每点一个都校验 body.is-fullScreen，成功即停，
 * 同一个按钮绝不点第二次（避免“进去又被自己点出来”）。
 * ========================================================================= */
const FULLSCREEN_ICON_SIGN = "M20 25h6v-6";
const FULLSCREEN_WAIT_MS = 6000;     // 等控制条 + 逐个候选尝试的总预算
const FULLSCREEN_VERIFY_MS = 400;    // 点完等站点把 class 写上

function ExpandTool_isWebFullScreen() {
	return !!(document.body && document.body.classList.contains("is-fullScreen"));
}

/** 候选按可信度排序：图标签名 → 旧选择器 → 控制条尾部两枚 */
function ExpandTool_fullScreenCandidates() {
	let list = [];
	let icons = Array.prototype.slice.call(document.querySelectorAll(".icon-c8be96"));
	icons.forEach(function (el) {
		let svg = el.querySelector("svg");
		if (svg && String(svg.innerHTML).indexOf(FULLSCREEN_ICON_SIGN) >= 0) list.push(el);
	});
	let legacy = document.querySelector("div.wfs-2a8e83");
	if (legacy) list.push(legacy);
	if (icons.length >= 2) list.push(icons[icons.length - 2]);
	if (icons.length >= 3) list.push(icons[icons.length - 3]);
	return list;
}

function ExpandTool_autoWebFullScreen() {
	let deadline = Date.now() + FULLSCREEN_WAIT_MS;
	let tried = [];
	(function tick() {
		if (ExpandTool_isWebFullScreen()) {
			console.info("[DouyuEx] 自动网页全屏：已进入");
			return;
		}
		if (Date.now() > deadline) {
			console.info("[DouyuEx] 自动网页全屏：等不到可用的控制条按钮，本次放弃");
			return;
		}
		let candidate = ExpandTool_fullScreenCandidates().filter(function (el) {
			if (!el || tried.indexOf(el) >= 0) return false;
			let rect = el.getBoundingClientRect ? el.getBoundingClientRect() : null;
			return !rect || rect.width > 0; // 收起态/隐藏按钮不点
		})[0];
		if (!candidate) {
			setTimeout(tick, 300);
			return;
		}
		tried.push(candidate);
		try {
			candidate.click();
		} catch (e) {
			// 单个候选点不动不算错，继续试下一个
		}
		setTimeout(tick, FULLSCREEN_VERIFY_MS);
	})();
}

function getHighestVideoQuality() {
    return document.getElementById("extool__highestvideoquality").checked;
}
function ExpandTool_HighestVideoQuality_insertFunc() {
    document.getElementById("extool__highestvideoquality").addEventListener("click", function() {
        saveData_HighestVideoQuality();
        if (getHighestVideoQuality()) {
            showMessage("自动最高画质已开启（刷新生效）", "success");
        }
    });
}

function saveData_HighestVideoQuality() {
	let data = {
		isHighestVideoQuality: getHighestVideoQuality()
	}
	localStorage.setItem("ExSave_HighestVideoQuality", JSON.stringify(data));
}
function initPkg_ExpandTool_HighestVideoQuality_Set() {
	// 设置初始化
	let ret = localStorage.getItem("ExSave_HighestVideoQuality");
	if (ret != null) {
		let retJson = JSON.parse(ret);
        if (retJson.isHighestVideoQuality) {
            document.getElementById("extool__highestvideoquality").checked = retJson.isHighestVideoQuality;
        }
	}
}

function initHighestVideoQuality() {
	// 已由 src/core/quality.js 在原生主上下文最早期全链路接管，此处保持开关状态同步
}

function highestVideoQuality() {
    // 0 轮询协议层强锁，避免与 core/quality.js 发生二次切流冲突
}