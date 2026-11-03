const fs = require("fs");
const path = require("path");
const vm = require("vm");
const assert = require("assert");

const source = fs.readFileSync(path.join(__dirname, "../src/packages/VideoTools/PictureInPictureControl/PictureInPictureControl.js"), "utf8");

class VideoStub extends EventTarget {
    constructor() {
        super();
        this.paused = false;
        this.playCount = 0;
        this.pauseCount = 0;
        this.srcObject = {};
    }
    play() {
        this.playCount++;
        return Promise.resolve();
    }
    pause() {
        this.pauseCount++;
    }
    emitPlayback(type) {
        this.paused = type === "pause";
        this.dispatchEvent(new Event(type));
    }
}

function makeEnvironment() {
    const intervals = new Map();
    let nextTimer = 0;
    const context = vm.createContext({
        window: {},
        document: { getElementById: () => null, querySelector: () => null },
        comboMap: new Map(),
        comboCleanerTimer: null,
        PictureInPictureControl_clearWsDedup() {},
        setInterval(callback) {
            const id = ++nextTimer;
            intervals.set(id, callback);
            return id;
        },
        clearInterval(id) { intervals.delete(id); },
        clearTimeout() {},
    });
    vm.runInContext(source, context);
    function makeWindow() {
        const pipWindow = new EventTarget();
        pipWindow.closed = false;
        pipWindow.close = () => {
            pipWindow.closed = true;
            pipWindow.dispatchEvent(new Event("pagehide"));
        };
        return pipWindow;
    }
    function open(sourceVideo, pipVideo) {
        const pipWindow = makeWindow();
        context.window.__pip_window__ = pipWindow;
        context.PictureInPictureControl_bindVideoSync(sourceVideo, pipVideo);
        context.PictureInPictureControl_bindCleanup(sourceVideo, pipWindow, pipVideo);
        return pipWindow;
    }
    return { context, intervals, open, makeWindow };
}

let failures = 0;
function test(name, callback) {
    try {
        callback();
        console.log("✓ " + name);
    } catch (error) {
        failures++;
        console.error("✗ " + name + "\n" + error.stack);
    }
}

test("关闭增强画中画后不再同步，重复关闭保留页面原有监听", () => {
    const { context, open } = makeEnvironment();
    const sourceVideo = new VideoStub();
    const pipVideo = new VideoStub();
    let pagePlays = 0;
    let pagePauses = 0;
    sourceVideo.addEventListener("play", () => pagePlays++);
    sourceVideo.addEventListener("pause", () => pagePauses++);
    const pipWindow = open(sourceVideo, pipVideo);

    sourceVideo.emitPlayback("play");
    sourceVideo.emitPlayback("pause");
    assert.strictEqual(pipVideo.playCount, 1);
    assert.strictEqual(pipVideo.pauseCount, 1);

    context.PictureInPictureControl_cleanupEnhancedPip(pipWindow, pipVideo);
    context.PictureInPictureControl_cleanupEnhancedPip(pipWindow, pipVideo);
    sourceVideo.emitPlayback("play");
    sourceVideo.emitPlayback("pause");
    assert.strictEqual(pipVideo.playCount, 1, "已关闭的画中画不能再收到 play");
    assert.strictEqual(pipVideo.pauseCount, 1, "已关闭的画中画不能再收到 pause");
    assert.strictEqual(pagePlays, 2, "不能移除页面自己的 play 监听");
    assert.strictEqual(pagePauses, 2, "不能移除页面自己的 pause 监听");
});

test("连续开关三次，旧画中画视频不被后续播放事件调用", () => {
    const { context, open } = makeEnvironment();
    const sourceVideo = new VideoStub();
    const closedVideos = [];
    for (let index = 0; index < 3; index++) {
        const pipVideo = new VideoStub();
        const pipWindow = open(sourceVideo, pipVideo);
        sourceVideo.emitPlayback("play");
        sourceVideo.emitPlayback("pause");
        context.PictureInPictureControl_cleanupEnhancedPip(pipWindow, pipVideo);
        closedVideos.push(pipVideo);
    }
    sourceVideo.emitPlayback("play");
    sourceVideo.emitPlayback("pause");
    assert.deepStrictEqual(closedVideos.map(video => [video.playCount, video.pauseCount]), [[1, 1], [1, 1], [1, 1]]);
});

test("pagehide 与关闭窗口轮询都释放播放同步", () => {
    for (const closeVia of ["pagehide", "poll"]) {
        const { intervals, open } = makeEnvironment();
        const sourceVideo = new VideoStub();
        const pipVideo = new VideoStub();
        const pipWindow = open(sourceVideo, pipVideo);
        if (closeVia === "pagehide") pipWindow.close();
        else pipWindow.closed = true;
        for (const callback of [...intervals.values()]) callback();
        sourceVideo.emitPlayback("play");
        sourceVideo.emitPlayback("pause");
        assert.strictEqual(pipVideo.playCount, 0, closeVia + " 必须释放 play 监听");
        assert.strictEqual(pipVideo.pauseCount, 0, closeVia + " 必须释放 pause 监听");
    }
});

test("同一画中画重新绑定或更换源视频时不会叠加旧监听", () => {
    const { context, open } = makeEnvironment();
    const oldSource = new VideoStub();
    const newSource = new VideoStub();
    const pipVideo = new VideoStub();
    open(oldSource, pipVideo);
    context.PictureInPictureControl_bindVideoSync(oldSource, pipVideo);
    oldSource.emitPlayback("play");
    assert.strictEqual(pipVideo.playCount, 1, "重复绑定只应同步一次");
    context.PictureInPictureControl_bindVideoSync(newSource, pipVideo);
    oldSource.emitPlayback("play");
    oldSource.emitPlayback("pause");
    assert.strictEqual(pipVideo.playCount, 1, "更换源视频必须解绑旧源");
    assert.strictEqual(pipVideo.pauseCount, 0);
    newSource.emitPlayback("play");
    newSource.emitPlayback("pause");
    assert.strictEqual(pipVideo.playCount, 2);
    assert.strictEqual(pipVideo.pauseCount, 1);
});

test("未进入激活状态也能清理已绑定的同步监听", () => {
    const { context, makeWindow } = makeEnvironment();
    const sourceVideo = new VideoStub();
    const pipVideo = new VideoStub();
    context.PictureInPictureControl_bindVideoSync(sourceVideo, pipVideo);
    context.PictureInPictureControl_cleanupEnhancedPip(makeWindow(), pipVideo);
    sourceVideo.emitPlayback("play");
    sourceVideo.emitPlayback("pause");
    assert.strictEqual(pipVideo.playCount, 0);
    assert.strictEqual(pipVideo.pauseCount, 0);
});

if (failures) process.exitCode = 1;
