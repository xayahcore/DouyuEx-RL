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
	if (ret != null) {
		let retJson = JSON.parse(ret);
        if (retJson.isFullScreen) {
            fullScreen();
        }
	}
}

function fullScreen() {
    function tryClick() {
        let dom = document.querySelector("div.wfs-2a8e83");
        if (dom) {
            dom.click();
            return true;
        }
        let icons = document.querySelectorAll(".icon-c8be96");
        if (icons.length >= 2) {
            icons[icons.length - 2].click();
            return true;
        }
        return false;
    }

    if (tryClick()) return;

    let obs = new MutationObserver(() => {
        if (tryClick()) {
            obs.disconnect();
            obs = null;
        }
    });

    let target = document.querySelector(".layout-Player") || document.body;
    obs.observe(target, { childList: true, subtree: true });
    setTimeout(() => {
        if (obs) {
            obs.disconnect();
            obs = null;
        }
    }, 15000);
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
	// core/quality.js 按首流实际 multirates 选择档位；12 秒后允许手动切换。
}

function highestVideoQuality() {
    // 保留旧入口，不另启轮询，避免与核心层有界补选发生二次切流。
}
