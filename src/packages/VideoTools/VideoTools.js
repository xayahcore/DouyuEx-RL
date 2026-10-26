var liveVideoNode; // 直播video标签节点
var isInput = false;
let videotools_num = 0;
function initPkg_VideoTools() {
    let timer = setInterval(() => {
        const controlbar = getValidDom([".right-e7ea5d", ".right-17e251"]);
        if (controlbar) {
            clearInterval(timer);
            liveVideoNode = document.querySelector(".layout-Player-videoEntity video");
            // 版本水印只是自证信息，节点不在就跳过；不能让一行 [0].innerHTML 打断模块/事件初始化
            let versionNode = document.getElementsByClassName("disable-23f484")[0];
            if (versionNode) {
                versionNode.innerHTML = `DouyuEx_${curVersion}`;
            } else {
                ExGuard_warn("视频工具", "未找到版本水印节点（.disable-23f484），版本号未写入（其余功能不受影响）");
            }
            initPkg_VideoTools_Module();
            initPkg_VideoTools_Func();
        }
        videotools_num++;
        if (videotools_num >= 100) {
            clearInterval(timer);
        }
    }, 1500);
}

function initPkg_VideoTools_Module() {
    // 添加模块
    initPkg_VideoTools_VideoToolbarMenu();
    initPkg_VideoTools_Joysound();
    initPkg_VideoTools_VideoSpeed();
    initPkg_VideoTools_Cinema();
    initPkg_VideoTools_VideoSync();
    initPkg_VideoTools_VideoRecall();
    initPkg_VideoTools_Filter();
    initPkg_VideoTools_Camera();
    initPkg_VideoTools_VideoZoom();
    initPkg_VideoTools_MetaData();
    initPkg_PictureInPictureControl();
}

function initPkg_VideoTools_Func() {
    const hideFilterOnLeave = () => {
        if (typeof VideoToolbarMenu_hideFilterPanel === "function") {
            VideoToolbarMenu_hideFilterPanel();
        } else if (typeof Filter_hidePanel === "function") {
            Filter_hidePanel();
        }
    };
    let tb = document.getElementById("js-player-toolbar");
    if (tb) tb.addEventListener("mouseover", hideFilterOnLeave);
    let aside = document.getElementById("js-player-asideMain");
    if (aside) aside.addEventListener("mouseover", hideFilterOnLeave);
    let inputView = getValidDom([".inputView-2a65aa", ".inputView-620ab7"]);
    if (inputView) {
        inputView.addEventListener("focus", () => {
            isInput = true;
        });
        inputView.addEventListener("blur", () => {
            isInput = false;
        });
    }
    let m = new DomHook(".app-f0f9c7", false, (m) => {
        if (m.length > 0) {
            if (m[0].addedNodes.length > 0) {
                isInput = true;
            } else if (m[0].removedNodes.length > 0) {
                isInput = false;
            }
        }
    });
}
