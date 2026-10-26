/**
 * 直播间截图 / gif 录制的「取帧 → 编码 → 落盘」实现（纯函数，不持有状态）。
 *
 * 为什么要单独抽出来：tests/test_camera_capture.js 要在 jsdom 里钉住
 * 「单击 → canvas 抓帧 → toBlob('image/png') → <a download> 落盘」整条链路，
 * 以及"每一条失败分支都必须有可诊断提示"。逻辑留在事件回调里就没法脱离真实页面测。
 *
 * 与旧实现的三点差异（都属于 issue #6「截图完全失效」的成因）：
 *  1. 抓帧前先校验 readyState / videoWidth：旧实现直接 drawImage，视频没首帧时抛
 *     InvalidStateError，异常在事件回调里被吞掉 —— 用户看到的就是"点了没反应"。
 *  2. 落盘文件名强制带扩展名（.png/.gif）：旧实现 a.download 没有后缀，部分环境会存成
 *     无扩展名文件，用户以为没下载成功。
 *  3. 失败绝不静默：每个失败分支都给出 reason + detail，由调用方 showMessage + console.error。
 */

var CameraCapture_MIME_PNG = "image/png";
var CameraCapture_MIME_GIF = "image/gif";

// 视频拿到首帧之前 readyState 只有 0/1，此时 drawImage 会抛 InvalidStateError。
var CameraCapture_MIN_READY_STATE = 2;

// 失败原因 → 给用户看的中文说明。键名同时作为 console 诊断码。
var CameraCapture_REASON_TEXT = {
    "no-video": "没有找到视频元素（播放器还没渲染出来，等画面出来再点）",
    "video-not-ready": "视频还没出首帧，浏览器不允许抓帧（等画面出来再点一次）",
    "video-no-dimension": "视频尺寸是 0×0（视频未加载或已被隐藏）",
    "no-2d-context": "浏览器没有给出 2d 画布上下文",
    "draw-image-failed": "抓帧失败（drawImage 抛错）",
    "canvas-tainted": "画布被跨域视频污染，读不到像素（这类流只能改用 flv.js/MSE 播放）",
    "encode-failed": "图片编码没有返回数据",
    "download-blocked": "下载没有触发（浏览器拦截了自动下载）"
};

function CameraCapture_padNumber(value) {
    return value < 10 ? "0" + value : "" + value;
}

/**
 * 文件名时间戳自己算，不复用全局 dateFormat：截图文件名要稳定可读、可按字典序排序，
 * 必须固定 24 小时制零填充，不能依赖 dateFormat 里那套 RegExp.$1 的替换顺序。
 */
function CameraCapture_timestamp(date) {
    const moment = date || new Date();
    return moment.getFullYear() + "-" + CameraCapture_padNumber(moment.getMonth() + 1) + "-" +
        CameraCapture_padNumber(moment.getDate()) + " " + CameraCapture_padNumber(moment.getHours()) + "-" +
        CameraCapture_padNumber(moment.getMinutes()) + "-" + CameraCapture_padNumber(moment.getSeconds());
}

function CameraCapture_sanitizeName(anchorName) {
    let text = String(anchorName == null ? "" : anchorName)
        .replace(/[\\/:*?"<>|\r\n\t]+/g, "_")
        .replace(/\s+/g, " ")
        .trim();
    if (!text) text = "斗鱼";
    if (text.length > 40) text = text.slice(0, 40);
    return text;
}

// 【主播名】2026-10-26 23-59-59.png —— 扩展名必带，否则部分环境存成无后缀文件。
function CameraCapture_buildFileName(anchorName, date, extension) {
    const suffix = extension || "png";
    return "【" + CameraCapture_sanitizeName(anchorName) + "】" + CameraCapture_timestamp(date) + "." + suffix;
}

function CameraCapture_reasonText(outcome) {
    const result = outcome || {};
    return CameraCapture_REASON_TEXT[result.reason] || ("未知失败（" + (result.reason || "no-reason") + "）");
}

// 用户可见的完整失败原因：中文说明 + 诊断细节（readyState、异常名等）。
function CameraCapture_failureText(outcome) {
    const result = outcome || {};
    return result.detail ? CameraCapture_reasonText(result) + "｜" + result.detail : CameraCapture_reasonText(result);
}

function CameraCapture_errorDetail(error) {
    if (!error) return "";
    const name = error.name || "Error";
    const message = error.message || String(error);
    return name + ": " + message;
}

// 跨域污染的两种表现：SecurityError，或 Chrome/Firefox 的 "tainted canvases may not be exported"。
function CameraCapture_isTaintError(error) {
    if (!error) return false;
    if (error.name === "SecurityError") return true;
    return /taint|cross-origin|not allowed to export/i.test(error.message || "");
}

/**
 * 把当前视频帧画进 canvas。成功返回 { ok:true, canvas, width, height }，
 * 失败返回 { ok:false, reason, detail } —— 调用方据此给出可诊断提示。
 */
function CameraCapture_captureFrame(video, canvas) {
    if (!video) return { ok: false, reason: "no-video" };

    const width = video.videoWidth || 0;
    const height = video.videoHeight || 0;
    if (!width || !height) {
        return { ok: false, reason: "video-no-dimension", detail: width + "×" + height };
    }

    const readyState = typeof video.readyState === "number" ? video.readyState : CameraCapture_MIN_READY_STATE;
    if (readyState < CameraCapture_MIN_READY_STATE) {
        return { ok: false, reason: "video-not-ready", detail: "readyState=" + readyState };
    }

    const target = canvas || document.createElement("canvas");
    target.width = width;
    target.height = height;

    let context = null;
    try {
        context = target.getContext("2d");
    } catch (error) {
        context = null;
    }
    if (!context) return { ok: false, reason: "no-2d-context" };

    try {
        context.drawImage(video, 0, 0, width, height);
    } catch (error) {
        return {
            ok: false,
            reason: CameraCapture_isTaintError(error) ? "canvas-tainted" : "draw-image-failed",
            detail: CameraCapture_errorDetail(error)
        };
    }

    return { ok: true, canvas: target, width: width, height: height };
}

/**
 * 点一次 <a download>。
 * 用 anchor.click() 而不是 document.createEvent("MouseEvents") + dispatchEvent：
 * 前者是规范里的下载触发方式，后者在部分浏览器上不会启动下载。
 */
function CameraCapture_clickAnchor(href, fileName) {
    if (!href) return false;
    const host = document.body || document.documentElement;
    if (!host) return false;

    const anchor = document.createElement("a");
    anchor.href = href;
    anchor.download = fileName;
    anchor.rel = "noopener";
    anchor.style.display = "none";
    host.appendChild(anchor);

    let clicked = false;
    try {
        if (typeof anchor.click === "function") {
            anchor.click();
            clicked = true;
        } else {
            const event = document.createEvent("MouseEvents");
            event.initEvent("click", false, false);
            anchor.dispatchEvent(event);
            clicked = true;
        }
    } catch (error) {
        clicked = false;
    }

    if (anchor.parentNode) anchor.parentNode.removeChild(anchor);
    return clicked;
}

function CameraCapture_saveBlob(blob, fileName) {
    if (!blob) return { ok: false, reason: "encode-failed", detail: "blob 为空" };

    const canCreateObjectUrl = typeof URL !== "undefined" && URL && typeof URL.createObjectURL === "function";
    if (!canCreateObjectUrl) {
        return { ok: false, reason: "download-blocked", detail: "URL.createObjectURL 不可用" };
    }

    let objectUrl = "";
    try {
        objectUrl = URL.createObjectURL(blob);
    } catch (error) {
        return { ok: false, reason: "download-blocked", detail: CameraCapture_errorDetail(error) };
    }

    const clicked = CameraCapture_clickAnchor(objectUrl, fileName);
    if (!clicked) {
        try { URL.revokeObjectURL(objectUrl); } catch (error) {}
        return { ok: false, reason: "download-blocked", detail: fileName };
    }

    // 立刻 revoke 会让有些浏览器还没读完就失效，延迟释放。
    setTimeout(function () {
        try { URL.revokeObjectURL(objectUrl); } catch (error) {}
    }, 1500);

    return { ok: true, fileName: fileName, mime: blob.type || "" };
}

function CameraCapture_saveDataUrl(dataUrl, fileName) {
    if (!dataUrl || dataUrl.indexOf("data:") !== 0) {
        return { ok: false, reason: "encode-failed", detail: "dataURL 为空" };
    }
    const clicked = CameraCapture_clickAnchor(dataUrl, fileName);
    if (!clicked) return { ok: false, reason: "download-blocked", detail: fileName };
    return { ok: true, fileName: fileName, mime: dataUrl.slice(5, dataUrl.indexOf(";")) };
}

// toBlob 不可用 / 返回 null 时的退路：toDataURL 也能落盘，只是内存占用大。
function CameraCapture_encodeDataUrl(canvas, mime) {
    try {
        const dataUrl = canvas.toDataURL(mime || CameraCapture_MIME_PNG);
        if (!dataUrl || dataUrl.indexOf("data:") !== 0) return { ok: false, reason: "encode-failed" };
        return { ok: true, dataUrl: dataUrl };
    } catch (error) {
        return {
            ok: false,
            reason: CameraCapture_isTaintError(error) ? "canvas-tainted" : "encode-failed",
            detail: CameraCapture_errorDetail(error)
        };
    }
}

/**
 * 截图主入口。所有结果（成功 / 失败）都只通过 onResult 回传一次，调用方无需区分同步异步。
 *   settings.video      必填，video 元素
 *   settings.canvas     可选，复用一块全分辨率 canvas（缺省则临时创建）
 *   settings.anchorName 可选，文件名里的主播名
 *   settings.now        可选，注入时间（便于测试）
 *   settings.mime       可选，默认 image/png
 *   settings.onResult   必填，({ok:true, fileName, mime} | {ok:false, reason, detail})
 */
function CameraCapture_captureAndSave(settings) {
    const config = settings || {};
    const notify = typeof config.onResult === "function" ? config.onResult : function () {};
    let delivered = false;
    const deliver = function (result) {
        if (delivered) return;
        delivered = true;
        notify(result);
    };

    const fileName = config.fileName || CameraCapture_buildFileName(config.anchorName, config.now, "png");
    const frame = CameraCapture_captureFrame(config.video, config.canvas);
    if (!frame.ok) {
        deliver(frame);
        return;
    }

    const mime = config.mime || CameraCapture_MIME_PNG;
    const canvas = frame.canvas;

    // 优先 toBlob：1080p PNG 的 base64 字符串有十几 MB，toDataURL 会明显卡顿。
    if (typeof canvas.toBlob === "function") {
        try {
            canvas.toBlob(function (blob) {
                if (blob) {
                    deliver(CameraCapture_saveBlob(blob, fileName));
                    return;
                }
                const encoded = CameraCapture_encodeDataUrl(canvas, mime);
                deliver(encoded.ok ? CameraCapture_saveDataUrl(encoded.dataUrl, fileName) : encoded);
            }, mime);
        } catch (error) {
            deliver({
                ok: false,
                reason: CameraCapture_isTaintError(error) ? "canvas-tainted" : "encode-failed",
                detail: CameraCapture_errorDetail(error)
            });
        }
        return;
    }

    const encoded = CameraCapture_encodeDataUrl(canvas, mime);
    deliver(encoded.ok ? CameraCapture_saveDataUrl(encoded.dataUrl, fileName) : encoded);
}
