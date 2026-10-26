const fs = require("fs");
const path = require("path");
const assert = require("assert");
let JSDOM;
try {
    JSDOM = require("jsdom").JSDOM;
} catch (e) {
    console.error("[测试] 缺少依赖 jsdom，请先执行：npm install");
    throw e;
}

/**
 * 截图功能回归（issue #6）。
 *
 * 报障现象：「相比于原版 reborn 版本的截图功能完全失效」。真机探针结论：按钮在 DOM 里，
 * 但永远 display:none，点击时 toDataURL / createObjectURL 调用 0 次 —— 事件根本没绑上。
 *
 * 这条测试要钉住三件事：
 *  ① 官网 DOM（没有 .layout-Player-video / .room-Player-Box）下也必须绑上事件、hover 能显示；
 *  ② 单击必须真的走到 canvas 抓帧 -> toBlob('image/png') -> <a download> 落盘（文件名带 .png）；
 *  ③ 每一条失败分支都必须有 error 提示，不许静默。
 */

const SRC_FILES = [
    "src/packages/VideoTools/Camera/CameraCapture.js",
    "src/packages/VideoTools/Camera/CameraControl.js",
    "src/packages/VideoTools/Camera/Main/Camera.js"
];
const SRC = SRC_FILES.map((file) => fs.readFileSync(path.join(__dirname, "..", file), "utf8")).join("\n");

// 真机结构的简化版：只有 #js-player-dialog 这一条链，没有 .layout-Player-video / .room-Player-Box
const PLAYER_HTML = [
    '<!DOCTYPE html><html><body>',
    '    <div id="js-player-main" class="main__a3F0Y">',
    '        <div class="player__jsy1T">',
    '            <div class="stream__T55I3">',
    '                <div class="video__VfhVg">',
    '                    <div id="js-player-dialog" class="core__6FoUQ">',
    '                        <video id="__video2"></video>',
    '                    </div>',
    '                </div>',
    '            </div>',
    '        </div>',
    '        <div class="Title-anchorName">测试主播</div>',
    '    </div>',
    '</body></html>'
].join("\n");

const DEFAULT_VIDEO_RECT = { left: 100, top: 80, width: 1280, height: 720 };

function makeRect(rect) {
    return {
        left: rect.left, top: rect.top, width: rect.width, height: rect.height,
        right: rect.left + rect.width, bottom: rect.top + rect.height,
        x: rect.left, y: rect.top
    };
}

function makeEnv(options) {
    const config = options || {};
    const dom = new JSDOM(PLAYER_HTML, { url: "https://www.douyu.com/91124" });
    const win = dom.window;
    const doc = win.document;

    // ---- 媒体元素：jsdom 没有真实解码，尺寸/就绪状态只能打桩 ----
    const video = doc.getElementById("__video2");
    Object.defineProperty(video, "videoWidth", { value: config.videoWidth === undefined ? 1280 : config.videoWidth, configurable: true });
    Object.defineProperty(video, "videoHeight", { value: config.videoHeight === undefined ? 720 : config.videoHeight, configurable: true });
    Object.defineProperty(video, "readyState", { value: config.readyState === undefined ? 4 : config.readyState, configurable: true });
    let videoRect = makeRect(config.videoRect || DEFAULT_VIDEO_RECT);
    video.getBoundingClientRect = () => videoRect;

    // ---- canvas：整套桩，记录"到底有没有走到编码/落盘" ----
    const canvasCalls = { getContext: 0, drawImage: 0, toBlob: 0, toDataURL: 0, blobMime: null, dataUrlMime: null, drawnTarget: null };
    const drawError = config.drawError || null;
    win.HTMLCanvasElement.prototype.getContext = function () {
        canvasCalls.getContext++;
        if (config.noContext) return null;
        return {
            drawImage(target) {
                if (drawError) throw drawError;
                canvasCalls.drawImage++;
                canvasCalls.drawnTarget = target;
            }
        };
    };
    if (config.noToBlob) {
        delete win.HTMLCanvasElement.prototype.toBlob;
    } else {
        win.HTMLCanvasElement.prototype.toBlob = function (callback, mime) {
            canvasCalls.toBlob++;
            canvasCalls.blobMime = mime;
            callback(config.toBlobNull ? null : new win.Blob(["png-bytes"], { type: mime || "image/png" }));
        };
    }
    win.HTMLCanvasElement.prototype.toDataURL = function (mime) {
        canvasCalls.toDataURL++;
        canvasCalls.dataUrlMime = mime;
        return "data:image/png;base64,QUJD";
    };

    // ---- 下载链路：createObjectURL + <a download>.click() ----
    const objectUrls = [];
    const downloads = [];
    const URLStub = {
        createObjectURL(blob) {
            const url = "blob:https://www.douyu.com/mock-" + objectUrls.length;
            objectUrls.push({ url: url, blob: blob });
            return url;
        },
        revokeObjectURL() {}
    };
    win.HTMLAnchorElement.prototype.click = function () {
        downloads.push({
            href: this.getAttribute("href"),
            download: this.getAttribute("download"),
            attached: doc.body.contains(this)
        });
    };

    // ---- 通知 / 定时器 / 日志：全部收归测试驱动 ----
    const messages = [];
    const consoleErrors = [];
    const showMessage = (msg, type) => messages.push({ msg: msg, type: type });
    const timers = new Map();
    let seq = 0;
    const schedule = (fn, ms) => { const id = ++seq; timers.set(id, { fn: fn, ms: ms }); return id; };
    const cancel = (id) => { timers.delete(id); };
    const getValidDom = (queries) => {
        for (const query of queries) {
            const node = typeof query === "string" ? doc.querySelector(query) : query;
            if (node) return node;
        }
        return null;
    };

    // ---- gif.js 桩：长按路径要能走到 render() ----
    const gifRecord = { created: 0, frames: 0, rendered: 0, aborted: 0 };
    function GIF(options) {
        gifRecord.created++;
        const handlers = {};
        return {
            options: options,
            on(name, fn) { handlers[name] = fn; },
            abort() { gifRecord.aborted++; },
            addFrame() { gifRecord.frames++; },
            render() {
                gifRecord.rendered++;
                if (handlers.finished) handlers.finished(new win.Blob(["gif-bytes"], { type: "image/gif" }));
            }
        };
    }

    const factory = new Function(
        "window", "document", "localStorage", "URL", "Blob",
        "setTimeout", "clearTimeout", "setInterval", "clearInterval",
        "showMessage", "getValidDom", "GIF", "console", "liveVideoNode",
        "camera_canvas", "camera_canvas_img", "camera_width", "camera_height",
        "camera_anchorName", "camera_fps", "cameraAddFrame", "gifworkerBlob",
        SRC + "\n;return { init: initPkg_VideoTools_Camera, controller: function () { return camera_controller; } };"
    );

    const api = factory(
        win, doc, win.localStorage, URLStub, win.Blob,
        schedule, cancel, schedule, cancel,
        showMessage, getValidDom, GIF,
        { log() {}, warn() {}, error: (...args) => consoleErrors.push(args.join(" ")) },
        null,
        null, null, 0, 0, "", 83,
        function (node, canvas, gif) { if (gif) gif.addFrame(); },
        "blob:https://www.douyu.com/mock-worker"
    );

    return {
        dom: dom, win: win, doc: doc, video: video, api: api,
        canvasCalls: canvasCalls, downloads: downloads, messages: messages,
        consoleErrors: consoleErrors, gifRecord: gifRecord, timers: timers,
        setVideoRect(rect) { videoRect = makeRect(rect); },
        runTimers() { Array.from(timers.entries()).forEach(([id, timer]) => { timers.delete(id); timer.fn(); }); },
        fire(type, target, extra) {
            const event = new win.MouseEvent(type, Object.assign({ bubbles: true, cancelable: true, clientX: 200, clientY: 200 }, extra || {}));
            (target || doc.getElementById("ex-camera")).dispatchEvent(event);
            return event;
        },
        clickCamera() {
            const camera = doc.getElementById("ex-camera");
            this.fire("mousedown", camera);
            this.fire("mouseup", camera);
            this.fire("click", camera);
        },
        close() { dom.window.close(); }
    };
}

// 保留带断言：按钮矩形不得进入浏览器/播放器控件区
function assertOutsideReservedBands(position, videoRect, fullscreen) {
    const topReserve = fullscreen ? 72 : 56;
    const right = position.left + position.size;
    const bottom = position.top + position.size;
    assert.ok(position.left >= videoRect.left + 16, "落点必须离视频左边缘至少 16px");
    assert.ok(right <= videoRect.left + videoRect.width - 48,
        "按钮不得进入右边缘 48px（Edge 侧边栏 / 网页全屏滚动条），实际右边界 " + right);
    assert.ok(bottom <= videoRect.top + videoRect.height - 64,
        "按钮不得压到底部 64px 控制条，实际下边界 " + bottom);
    assert.ok(position.top >= videoRect.top + topReserve,
        "按钮不得进入顶部 " + topReserve + "px 的浏览器控件带，实际上边界 " + position.top);
}

function testBindAndScreenshotOnOfficialDom() {
    const env = makeEnv();
    // 现场前提：这两个类名在新版播放器里都不存在 —— 旧代码正是拿它们做前置条件
    assert.strictEqual(env.doc.querySelector(".layout-Player-video"), null);
    assert.strictEqual(env.doc.querySelector(".room-Player-Box"), null);

    env.api.init();
    const camera = env.doc.getElementById("ex-camera");
    assert.ok(camera, "官网结构下必须插得出截图按钮");
    assert.ok(env.api.controller(), "控制器必须被创建（旧代码在这里整段 return 掉了）");

    // hover：全局 mousemove 命中测试 -> 按钮显示（旧代码永远 display:none）
    env.doc.dispatchEvent(new env.win.MouseEvent("mousemove", { bubbles: true, clientX: 400, clientY: 300 }));
    assert.strictEqual(camera.style.display, "flex", "鼠标进入播放器区域后按钮必须显示");

    // 单击 -> 抓帧 -> toBlob('image/png') -> 下载
    env.clickCamera();
    assert.strictEqual(env.canvasCalls.drawImage, 1, "单击必须真的抓一帧（drawImage）");
    assert.strictEqual(env.canvasCalls.drawnTarget, env.video, "抓帧对象必须是页面上的真实 video");
    assert.strictEqual(env.canvasCalls.toBlob, 1, "必须走到 toBlob 编码");
    assert.strictEqual(env.canvasCalls.blobMime, "image/png", "MIME 必须是 image/png");
    assert.strictEqual(env.downloads.length, 1, "必须触发一次下载");
    assert.strictEqual(env.downloads[0].attached, true, "下载用的 a 标签必须先挂进文档再点");
    assert.ok(/^blob:/.test(env.downloads[0].href), "下载地址应是 createObjectURL 产出的 blob URL");
    assert.ok(/\.png$/.test(env.downloads[0].download), "文件名必须带 .png 后缀，实际 " + env.downloads[0].download);
    assert.ok(env.downloads[0].download.indexOf("测试主播") >= 0, "文件名应带主播名，实际 " + env.downloads[0].download);
    assert.strictEqual(env.messages.filter((m) => m.type === "error").length, 0, "成功路径不该有 error 提示");
    assert.ok(env.messages.some((m) => m.type === "success" && m.msg.indexOf("已保存") >= 0), "成功应有落盘提示");

    env.close();
    console.log("✓ 场景 1 通过: 官网 DOM 下能绑上事件，单击真的走到 toBlob 并触发 .png 下载");
}

function testPositionAvoidsBrowserControls() {
    const env = makeEnv();
    env.api.init();
    const camera = env.doc.getElementById("ex-camera");
    camera.style.display = "flex";

    const normal = env.api.controller().position();
    assert.ok(normal, "非全屏状态必须能算出落点");
    assert.strictEqual(normal.left, 116, "非全屏：视频左边缘 100 + 16");
    assert.strictEqual(normal.top, 410, "非全屏：视频垂直居中 (720-60)/2 + 80");
    assertOutsideReservedBands(normal, makeRect(DEFAULT_VIDEO_RECT), false);

    // 网页全屏：视口铺满 + fullscreenElement 有值
    Object.defineProperty(env.doc, "fullscreenElement", { value: env.doc.documentElement, configurable: true });
    env.setVideoRect({ left: 0, top: 0, width: 2560, height: 1440 });
    const full = env.api.controller().position();
    assert.ok(full, "网页全屏状态必须能算出落点");
    assert.strictEqual(full.left, 16, "网页全屏：视口左边缘 + 16");
    assert.strictEqual(full.top, 690, "网页全屏：垂直居中 (1440-60)/2");
    assert.strictEqual(full.fullscreen, true, "必须识别到网页全屏");
    assertOutsideReservedBands(full, makeRect({ left: 0, top: 0, width: 2560, height: 1440 }), true);

    // CSS 兜底值也得是同一套规则，且旧值（右边 20 / 底部 240）必须已经清掉
    // 注释里会写到旧值做对照，扫描前先剥掉注释，否则断言会被自己的说明文字骗过去
    const css = fs.readFileSync(path.join(__dirname, "../src/packages/VideoTools/Camera/index.css"), "utf8")
        .replace(/\/\*[\s\S]*?\*\//g, "");
    assert.ok(/#ex-camera\s*\{[^}]*left:\s*16px/.test(css), "CSS 兜底落点必须是 left:16px");
    assert.ok(!/right:\s*20px/.test(css), "旧的 right:20px（压在浏览器控件那一条）必须删掉");
    assert.ok(!/bottom:\s*240px/.test(css), "旧的 bottom:240px 必须删掉");

    env.close();
    console.log("✓ 场景 2 通过: 全屏/非全屏落点都避开右上角浏览器控件、右边缘与底部控制条");
}

function testFailureBranchIsLoud() {
    // ① 视频没首帧
    const envNoReady = makeEnv({ readyState: 0 });
    envNoReady.api.init();
    envNoReady.clickCamera();
    assert.strictEqual(envNoReady.downloads.length, 0, "没首帧时不该产生下载");
    assert.strictEqual(envNoReady.canvasCalls.toBlob, 0, "没首帧时连编码都不该开始");
    const notReady = envNoReady.messages.filter((m) => m.type === "error");
    assert.strictEqual(notReady.length, 1, "失败必须且只能提示一次，实际 " + notReady.length);
    assert.ok(/截图/.test(notReady[0].msg), "提示里要说明是截图失败");
    assert.ok(/首帧|readyState/.test(notReady[0].msg), "提示要带可诊断原因，实际：" + notReady[0].msg);
    assert.ok(envNoReady.consoleErrors.some((line) => line.indexOf("readyState") >= 0), "console 必须留下诊断码");
    envNoReady.close();

    // ② 画布被跨域污染
    const taintError = new Error("Tainted canvases may not be exported.");
    taintError.name = "SecurityError";
    const envTaint = makeEnv({ drawError: taintError });
    envTaint.api.init();
    envTaint.clickCamera();
    assert.strictEqual(envTaint.downloads.length, 0, "图像被污染时不该产生下载");
    const tainted = envTaint.messages.filter((m) => m.type === "error");
    assert.strictEqual(tainted.length, 1, "污染失败必须提示一次");
    assert.ok(/跨域/.test(tainted[0].msg), "提示要说清是跨域污染，实际：" + tainted[0].msg);
    envTaint.close();

    console.log("✓ 场景 3 通过: 没首帧 / 跨域污染两种失败都有可诊断的 error 提示，绝不静默");
}

function testDataUrlFallbackWhenToBlobMissing() {
    const env = makeEnv({ noToBlob: true });
    env.api.init();
    env.clickCamera();
    assert.strictEqual(env.canvasCalls.toBlob, 0, "toBlob 不可用时不该调用它");
    assert.strictEqual(env.canvasCalls.toDataURL, 1, "必须退回 toDataURL");
    assert.strictEqual(env.canvasCalls.dataUrlMime, "image/png");
    assert.strictEqual(env.downloads.length, 1, "退路同样必须触发下载");
    assert.ok(/^data:image\/png/.test(env.downloads[0].href), "退路的 href 应是 dataURL");
    assert.ok(/\.png$/.test(env.downloads[0].download), "退路文件名也要带 .png");
    env.close();
    console.log("✓ 场景 4 通过: toBlob 缺失时退回 toDataURL，下载照常发生且后缀为 .png");
}

function testLongPressAndClickDoNotEatEachOther() {
    const env = makeEnv();
    env.api.init();
    const camera = env.doc.getElementById("ex-camera");
    camera.style.display = "flex";

    // 长按：mousedown -> 长按定时器 -> 开始录制 -> mouseup 收尾出 gif
    env.fire("mousedown", camera);
    assert.strictEqual(env.gifRecord.created, 0, "刚按下还不能建 gif（避免单击也起 worker）");
    env.runTimers(); // 触发长按定时器
    assert.strictEqual(env.gifRecord.created, 1, "长按到阈值必须开始录 gif");
    assert.strictEqual(env.api.controller().isRecording(), true);
    env.fire("mouseup", camera);
    assert.strictEqual(env.gifRecord.rendered, 1, "松手必须走 render 生成 gif");
    assert.strictEqual(env.downloads.length, 1, "gif 必须落盘一次");
    assert.ok(/\.gif$/.test(env.downloads[0].download), "gif 文件名必须带 .gif 后缀");

    // 长按后的那次 click 必须被吃掉，不能多截一张图
    env.fire("click", camera);
    assert.strictEqual(env.canvasCalls.toBlob, 0, "长按结束后紧跟的 click 不得触发截图");
    assert.strictEqual(env.downloads.length, 1, "不得多出第二个下载");

    // 普通单击不受影响
    env.fire("mousedown", camera);
    env.fire("mouseup", camera);
    env.fire("click", camera);
    assert.strictEqual(env.canvasCalls.toBlob, 1, "普通单击仍要正常截图");
    assert.strictEqual(env.downloads.length, 2, "普通单击应新增一次下载");

    env.close();
    console.log("✓ 场景 5 通过: 长按录 gif 与单击截图互不吞并，长按结束的 click 被吃掉");
}

function testSourceHasNoObsoleteHostSelectors() {
    const mainSource = fs.readFileSync(path.join(__dirname, "../src/packages/VideoTools/Camera/Main/Camera.js"), "utf8");
    const stripped = mainSource.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:])\/\/.*$/gm, "$1");
    assert.ok(stripped.indexOf("room-Player-Box") < 0, "不得再把已经消失的 .room-Player-Box 当宿主");
    assert.ok(stripped.indexOf("clearInterval(timer)") < 0, "不得再读未声明的 timer（ReferenceError 会让点击整段失效）");
    assert.ok(stripped.indexOf("js-player-dialog") >= 0, "视频宿主必须包含现役的 #js-player-dialog");
    console.log("✓ 场景 6 通过: 源码不再引用已消失的宿主类名与裸变量 timer");
}

(async function main() {
    testBindAndScreenshotOnOfficialDom();
    testPositionAvoidsBrowserControls();
    testFailureBranchIsLoud();
    testDataUrlFallbackWhenToBlobMissing();
    testLongPressAndClickDoNotEatEachOther();
    testSourceHasNoObsoleteHostSelectors();
    console.log("=== 截图回归测试 6 组场景全部通过 ===");
})().catch((e) => {
    console.error("测试失败:", e && e.stack ? e.stack : e);
    process.exit(1);
});
