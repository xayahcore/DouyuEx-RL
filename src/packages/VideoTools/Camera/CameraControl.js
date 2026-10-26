/**
 * 截图按钮的交互控制器：hover 显隐、单击截图、长按录 gif、落点计算。
 *
 * issue #6 的两个现场问题都在这里收口：
 *  1. 旧实现 initPkg_VideoTools_Camera_Func 用 .layout-Player-video / .room-Player-Box
 *     找宿主节点，新版播放器这两个类名都不存在 → dom 为 null →
 *     "if (!camera || !closeBtn || !dom) return;" 把所有事件绑定整段跳过 →
 *     按钮永远 display:none，点它什么都不发生（真机探针：toDataURL / createObjectURL 调用 0 次）。
 *     所以这里改成「只要拿得到按钮节点就绑事件」，hover 用指针命中测试兜底，不再依赖宿主类名。
 *  2. 旧实现 mousedown 里 clearInterval(timer) 读的 timer 从未声明 → ReferenceError，
 *     即便事件绑上了也会在抓帧前炸掉（Main/Camera.js 里遗留的全局裸变量）。
 *     这里所有状态都放在控制器自己的闭包里，不存在裸标识符。
 *
 * 落点（详见 positionCameraButton 的注释）：贴着视频区域左边缘、垂直居中，内缩 16px。
 * 依据是三条"浏览器/播放器控件保留带"：右上角 56×56、右边缘 48px、底部 64px。
 */

var CameraControl_LONG_PRESS_MS = 250;      // 按住多久算长按（开始录 gif）
var CameraControl_HIDE_DELAY_MS = 2000;     // 鼠标离开播放器后多久隐藏
var CameraControl_HOVER_HIT_INTERVAL_MS = 60; // 全局 mousemove 命中测试的最小间隔
var CameraControl_SUPPRESS_CLICK_MS = 600;  // 长按结束后的这段时间里不再触发截图

var CameraControl_EDGE_GAP = 16;            // 按钮与视频左边缘的间距
var CameraControl_BUTTON_SIZE = 60;         // 与 index.css 的 width/height 保持一致
var CameraControl_TOP_RESERVE = 56;         // 看到下方"落点依据"
var CameraControl_TOP_RESERVE_FULLSCREEN = 72;
var CameraControl_BOTTOM_RESERVE = 64;

/**
 * 网页全屏（fullscreenElement）判定。
 * 注意"网页全屏"专指页面元素进入全屏，和浏览器 F11 是两回事；
 * 但两者的共同点是：播放器矩形会变成视口矩形，所以落点只依赖矩形，不依赖状态本身。
 */
function CameraControl_isWebFullscreen() {
    return !!(document.fullscreenElement || document.webkitFullscreenElement ||
        document.mozFullScreenElement || document.msFullscreenElement);
}

function CameraControl_create(options) {
    const config = options || {};
    const cameraId = config.cameraId || "ex-camera";

    let cameraNode = null;
    let attached = false;
    let gifInstance = null;
    let frameTimer = 0;
    let longPressTimer = 0;
    let hideTimer = 0;
    let recording = false;
    let suppressClickUntil = 0;
    let lastHitTestAt = 0;

    function getCameraNode() {
        if (!cameraNode || !cameraNode.isConnected) cameraNode = document.getElementById(cameraId);
        return cameraNode;
    }

    function getVideoNode() {
        return typeof config.resolveVideo === "function" ? config.resolveVideo() : null;
    }

    function getAnchorName() {
        return typeof config.getAnchorName === "function" ? config.getAnchorName() : "";
    }

    // 关闭状态 / 7 天隐藏都由宿主注入，控制器自己不碰存储。
    function isHidden() {
        return typeof config.isHidden === "function" ? !!config.isHidden() : false;
    }

    function notifyUser(message, type) {
        if (typeof showMessage === "function") showMessage(message, type);
    }

    function reportFailure(outcome, prefix) {
        const label = prefix || "截图";
        const text = CameraCapture_failureText(outcome);
        if (typeof console !== "undefined" && console.error) {
            console.error("[DouyuEx][" + label + "] 失败：" + text);
        }
        notifyUser("【" + label + "】失败：" + text, "error");
    }

    function clearHideTimer() {
        if (!hideTimer) return;
        clearTimeout(hideTimer);
        hideTimer = 0;
    }

    /**
     * 落点计算。规则只有一条：视频区域左边缘内缩 16px，垂直居中并夹在保留带内。
     *
     * 为什么是左边而不是右边（issue 原文："网页全屏时和 Firefox 画中画按钮重叠、非全屏也靠太近"）：
     *  - 右上角 56×56 是 Firefox 的画中画按钮 / Chrome 的媒体控件带，鼠标移进视频就会出现；
     *  - 右边缘 48px 是 Edge 侧边栏（垂直条）与"网页全屏"下的悬浮滚动条；
     *  - 底部 64px 是播放器自己的控制条（倍速/画质/网页全屏按钮都在这）与弹幕输入框；
     *  - 左上角 56px 是斗鱼的房间标题/主播信息浮层。
     * 左边缘垂直居中同时避开这四块，且左右两侧状态（全屏/非全屏）都成立 ——
     * 因为位置是从"视频矩形"算出来的，全屏时矩形等于视口，规则自动跟着走。
     */
    function positionCameraButton() {
        const camera = getCameraNode();
        if (!camera) return null;

        const video = getVideoNode();
        if (!video || typeof video.getBoundingClientRect !== "function") return null;

        const videoRect = video.getBoundingClientRect();
        if (!videoRect || videoRect.width < 80 || videoRect.height < 80) return null;

        // offsetParent 为空说明没有定位祖先，absolute 的参照物是初始包含块（documentElement）。
        // 注意：display:none 时 offsetParent 也为空，所以必须先显示再定位。
        const host = camera.offsetParent || document.documentElement;
        if (!host || typeof host.getBoundingClientRect !== "function") return null;
        const hostRect = host.getBoundingClientRect();

        const size = CameraControl_BUTTON_SIZE;
        const fullscreen = CameraControl_isWebFullscreen();
        const topReserve = fullscreen ? CameraControl_TOP_RESERVE_FULLSCREEN : CameraControl_TOP_RESERVE;

        const left = videoRect.left + CameraControl_EDGE_GAP;
        const centeredTop = videoRect.top + (videoRect.height - size) / 2;
        const minTop = videoRect.top + topReserve;
        const maxTop = videoRect.bottom - CameraControl_BOTTOM_RESERVE - size;
        const top = maxTop >= minTop ? Math.min(Math.max(centeredTop, minTop), maxTop) : minTop;

        const offsetX = Math.round(left - hostRect.left - (host.clientLeft || 0));
        const offsetY = Math.round(top - hostRect.top - (host.clientTop || 0));

        camera.style.position = "absolute";
        camera.style.left = Math.max(0, offsetX) + "px";
        camera.style.top = Math.max(0, offsetY) + "px";
        camera.style.right = "auto";
        camera.style.bottom = "auto";

        // 二次校正：当祖先带 transform（视频滤镜的旋转/镜像）时，绝对定位的实际包含块可能
        // 不是 offsetParent，first-pass 会偏。量一次真实矩形再把差值补回去。
        // 布局尚未完成（宽高为 0，例如 display:none 或测试环境）时跳过。
        if (typeof camera.getBoundingClientRect === "function") {
            const actual = camera.getBoundingClientRect();
            if (actual && actual.width > 0 && actual.height > 0) {
                const deltaX = Math.round(left - actual.left);
                const deltaY = Math.round(top - actual.top);
                if (Math.abs(deltaX) > 1 || Math.abs(deltaY) > 1) {
                    camera.style.left = Math.max(0, offsetX + deltaX) + "px";
                    camera.style.top = Math.max(0, offsetY + deltaY) + "px";
                }
            }
        }

        return {
            left: Math.round(left),
            top: Math.round(top),
            size: size,
            fullscreen: fullscreen,
            videoRect: videoRect
        };
    }

    function show() {
        const camera = getCameraNode();
        if (!camera || isHidden()) return;
        camera.style.display = "flex";
        positionCameraButton();
    }

    function hide() {
        const camera = getCameraNode();
        if (camera) camera.style.display = "none";
    }

    function hideSoon(delay) {
        clearHideTimer();
        const wait = typeof delay === "number" ? delay : CameraControl_HIDE_DELAY_MS;
        hideTimer = setTimeout(function () {
            hideTimer = 0;
            hide();
        }, wait);
    }

    function isPointerInsidePlayer(clientX, clientY) {
        const video = getVideoNode();
        if (!video || typeof video.getBoundingClientRect !== "function") return false;
        const rect = video.getBoundingClientRect();
        if (!rect || rect.width < 1 || rect.height < 1) return false;
        const slack = 4;
        return clientX >= rect.left - slack && clientX <= rect.right + slack &&
            clientY >= rect.top - slack && clientY <= rect.bottom + slack;
    }

    // 全局 mousemove 命中测试：不依赖宿主类名，播放器换 DOM 结构也照样能显示按钮。
    function onDocumentMouseMove(event) {
        if (isHidden()) return;
        const now = Date.now();
        if (now - lastHitTestAt < CameraControl_HOVER_HIT_INTERVAL_MS) return;
        lastHitTestAt = now;

        if (isPointerInsidePlayer(event.clientX, event.clientY)) {
            show();
            hideSoon();
            return;
        }
        const camera = getCameraNode();
        if (camera && camera.style.display !== "none") hideSoon(400);
    }

    function onViewportChange() {
        const camera = getCameraNode();
        if (camera && camera.style.display !== "none") positionCameraButton();
    }

    function takeScreenshot() {
        const video = getVideoNode();
        const canvas = typeof config.getScreenshotCanvas === "function" ? config.getScreenshotCanvas(video) : null;
        CameraCapture_captureAndSave({
            video: video,
            canvas: canvas,
            anchorName: getAnchorName(),
            onResult: function (outcome) {
                if (outcome && outcome.ok) {
                    notifyUser("【截图】已保存：" + outcome.fileName, "success");
                    if (typeof config.onCaptured === "function") config.onCaptured(outcome);
                } else {
                    reportFailure(outcome, "截图");
                }
            }
        });
    }

    function startRecording() {
        const video = getVideoNode();
        if (!video) {
            reportFailure({ reason: "no-video" }, "录制");
            return false;
        }
        if (typeof GIF !== "function") {
            notifyUser("【录制】gif 组件未加载（gif.js 被拦截？），本次只支持单击截图", "error");
            return false;
        }
        if (typeof config.prepareRecording !== "function") return false;

        const prepared = config.prepareRecording(video);
        if (!prepared || !prepared.canvas) return false;

        abortRecording();
        gifInstance = new GIF({
            workers: 5,
            quality: 3,
            width: prepared.width,
            height: prepared.height,
            workerScript: config.workerScript
        });
        recording = true;
        config.addFrame(video, prepared.canvas, gifInstance);
        frameTimer = setInterval(function () {
            if (gifInstance) config.addFrame(video, prepared.canvas, gifInstance);
        }, config.fps || 83);
        return true;
    }

    function abortRecording() {
        if (frameTimer) {
            clearInterval(frameTimer);
            frameTimer = 0;
        }
        const instance = gifInstance;
        gifInstance = null;
        recording = false;
        if (instance && typeof instance.abort === "function") {
            try { instance.abort(); } catch (error) {}
        }
        return instance;
    }

    function finishRecording() {
        if (frameTimer) {
            clearInterval(frameTimer);
            frameTimer = 0;
        }
        const instance = gifInstance;
        gifInstance = null;
        recording = false;
        if (!instance) return;

        notifyUser("【录制】正在生成 gif ...", "info");
        instance.on("finished", function (blob) {
            const saved = CameraCapture_saveBlob(blob, CameraCapture_buildFileName(getAnchorName(), new Date(), "gif"));
            if (saved.ok) notifyUser("【录制】gif 已保存：" + saved.fileName, "success");
            else reportFailure(saved, "录制");
        });
        try {
            instance.render();
        } catch (error) {
            reportFailure({ reason: "encode-failed", detail: CameraCapture_errorDetail(error) }, "录制");
        }
    }

    function isCloseButton(target) {
        return !!(target && target.id === "ex-camera-close");
    }

    function onCameraMouseEnter() {
        if (isHidden()) return;
        clearHideTimer();
        show();
    }

    function onCameraMouseDown(event) {
        if (isCloseButton(event.target)) return;
        event.stopPropagation();
        clearHideTimer();
        suppressClickUntil = 0;
        if (longPressTimer) clearTimeout(longPressTimer);
        longPressTimer = setTimeout(function () {
            longPressTimer = 0;
            startRecording();
        }, CameraControl_LONG_PRESS_MS);
    }

    function onCameraMouseUp(event) {
        if (isCloseButton(event.target)) return;
        event.stopPropagation();
        if (longPressTimer) {
            clearTimeout(longPressTimer);
            longPressTimer = 0;
        }
        if (recording) {
            finishRecording();
            // 长按结束会紧跟一个 click，必须吃掉，否则会多截一张图。
            suppressClickUntil = Date.now() + CameraControl_SUPPRESS_CLICK_MS;
        }
        hideSoon();
    }

    function onCameraClick(event) {
        if (isCloseButton(event.target)) return;
        event.stopPropagation();
        if (typeof event.preventDefault === "function") event.preventDefault();
        if (Date.now() < suppressClickUntil) {
            suppressClickUntil = 0;
            return;
        }
        takeScreenshot();
    }

    function onCameraMouseLeave() {
        if (longPressTimer) {
            clearTimeout(longPressTimer);
            longPressTimer = 0;
        }
        if (recording) {
            finishRecording();
            suppressClickUntil = Date.now() + CameraControl_SUPPRESS_CLICK_MS;
        }
        hideSoon(400);
    }

    function attach() {
        if (attached) return false;
        const camera = getCameraNode();
        if (!camera) return false;

        camera.addEventListener("mouseenter", onCameraMouseEnter);
        camera.addEventListener("mousedown", onCameraMouseDown);
        camera.addEventListener("mouseup", onCameraMouseUp);
        camera.addEventListener("click", onCameraClick);
        camera.addEventListener("mouseleave", onCameraMouseLeave);
        document.addEventListener("mousemove", onDocumentMouseMove, true);
        document.addEventListener("fullscreenchange", onViewportChange);
        document.addEventListener("webkitfullscreenchange", onViewportChange);
        window.addEventListener("resize", onViewportChange);
        attached = true;
        return true;
    }

    function detach() {
        if (!attached) return;
        const camera = getCameraNode();
        if (camera) {
            camera.removeEventListener("mouseenter", onCameraMouseEnter);
            camera.removeEventListener("mousedown", onCameraMouseDown);
            camera.removeEventListener("mouseup", onCameraMouseUp);
            camera.removeEventListener("click", onCameraClick);
            camera.removeEventListener("mouseleave", onCameraMouseLeave);
        }
        document.removeEventListener("mousemove", onDocumentMouseMove, true);
        document.removeEventListener("fullscreenchange", onViewportChange);
        document.removeEventListener("webkitfullscreenchange", onViewportChange);
        window.removeEventListener("resize", onViewportChange);
        abortRecording();
        clearHideTimer();
        attached = false;
    }

    return {
        attach: attach,
        detach: detach,
        show: show,
        hide: hide,
        hideSoon: hideSoon,
        position: positionCameraButton,
        takeScreenshot: takeScreenshot,
        isRecording: function () { return recording; },
        getCameraNode: getCameraNode,
        getVideoNode: getVideoNode
    };
}
