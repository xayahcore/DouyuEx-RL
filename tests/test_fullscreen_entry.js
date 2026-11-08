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

const ROOT = path.join(__dirname, "..");
const read = (rel) => fs.readFileSync(path.join(ROOT, rel), "utf8");
const SRC = read("src/packages/ExpandTool/ExpandTool_FullScreen.js");

/**
 * 自动网页全屏回归（2026-11-08 重写）。
 *
 * 报障：开启「自动网页全屏」后进直播间没有全屏。
 * 真机探针结论：
 *   ① 站点没有 setWebFullScreen / setFullScreen 可调 API；
 *   ② 旧主选择器 div.wfs-2a8e83 已 0 命中；
 *   ③ 旧兜底按 .icon-c8be96 固定下标盲点，且 observe(document.body) 在 document-start 会抛。
 * 现在的实现：图标签名优先 → 旧选择器 → 控制条尾部候选；每点一个校验 body.is-fullScreen，
 * 同一个按钮不点第二次。本用例守这三条。
 */

function makeEnv(opts) {
    opts = opts || {};
    const dom = new JSDOM(`<!DOCTYPE html><html><body>${opts.html || ""}</body></html>`, {
        url: "https://www.douyu.com/9999",
    });
    const win = dom.window;
    const timers = [];
    const infos = [];
    const clicked = [];

    if (opts.alreadyFull) win.document.body.classList.add("is-fullScreen");

    const factory = new Function(
        "window", "document", "localStorage", "setTimeout", "console", "showMessage",
        SRC + "\nreturn { initFullScreen: initFullScreen };"
    );
    const api = factory(
        win, win.document, win.localStorage,
        function (fn) { timers.push(fn); return timers.length; },
        { log: function () {}, info: function () { infos.push(Array.prototype.join.call(arguments, " ")); }, warn: function () {}, error: function () {} },
        function () {}
    );

    return {
        win, api, timers, infos, clicked,
        runTimers: function () {
            let guard = 0;
            while (timers.length && guard++ < 20) {
                let fn = timers.shift();
                fn();
            }
        },
        sizeIcons: function () {
            Array.prototype.forEach.call(win.document.querySelectorAll(".icon-c8be96"), function (el) {
                el.getBoundingClientRect = function () { return { width: 32, height: 32, top: 0, left: 0, right: 32, bottom: 32 }; };
            });
        },
        close: function () { win.close(); },
    };
}

function icon(win, svgPath, label) {
    const el = win.document.createElement("i");
    el.className = "icon-c8be96";
    el.innerHTML = '<svg><path d="' + svgPath + '"></path></svg>';
    el.addEventListener("click", function () {
        el.__clicked = (el.__clicked || 0) + 1;
        if (label === "web") win.document.body.classList.add("is-fullScreen");
    });
    win.document.body.appendChild(el);
    return el;
}

function testSignatureIconWins() {
    const env = makeEnv();
    // 第一枚是别的图标；第二枚是网页全屏（实测“进入网页全屏”的 path 以 M20 25h6v-6 开头）
    const other = icon(env.win, "M5 10h5.5L16 6v20", "other");
    const web = icon(env.win, "M20 25h6v-6M14 7H8v6", "web");
    const tail = icon(env.win, "M20 25h5v-5", "tail");
    env.sizeIcons();
    env.win.localStorage.setItem("ExSave_FullScreen", JSON.stringify({ isFullScreen: true }));

    env.api.initFullScreen();
    env.runTimers();

    assert.strictEqual(web.__clicked, 1, "必须优先点图标签名命中的那枚");
    assert.ok(!other.__clicked, "不得误点其它图标");
    assert.ok(!tail.__clicked, "签名命中后不该再试兜底候选");
    assert.ok(env.infos.some(function (s) { return s.indexOf("已进入") !== -1; }), "成功后必须留自证日志");
    env.close();
    console.log("✓ 全屏 1 通过: 图标签名优先命中，不依赖固定下标");
}

function testFallbackToTailIcon() {
    const env = makeEnv();
    // 没有签名图标：退回旧的“控制条倒数第二枚”候选
    const a = icon(env.win, "M5 10h5.5L16 6v20", "other");
    const web = icon(env.win, "M19 12.571V7H7v12h5.429", "web");   // 倒数第二枚
    const tail = icon(env.win, "M7 7h18v18H7z", "other2");
    env.sizeIcons();
    env.win.localStorage.setItem("ExSave_FullScreen", JSON.stringify({ isFullScreen: true }));

    env.api.initFullScreen();
    env.runTimers();

    assert.strictEqual(web.__clicked, 1, "没有签名图标时必须退到尾部候选并成功进入");
    assert.ok(!a.__clicked, "前面的候选不点");
    assert.ok(!tail.__clicked, "尾部候选命中后不再继续点");
    env.close();
    console.log("✓ 全屏 2 通过: 选择器失效时退到控制条尾部候选，点一次并校验");
}

function testAlreadyFullScreenAndBadStorage() {
    // 已经在网页全屏：不得再点任何按钮（否则会把自己点出去）
    const env = makeEnv({ alreadyFull: true });
    const web = icon(env.win, "M20 25h6v-6M14 7H8v6", "web");
    env.sizeIcons();
    env.win.localStorage.setItem("ExSave_FullScreen", JSON.stringify({ isFullScreen: true }));
    env.api.initFullScreen();
    env.runTimers();
    assert.strictEqual(web.__clicked || 0, 0, "已全屏时不得再点");
    env.close();

    // 存储被写坏：按“没开”处理，不抛
    const bad = makeEnv();
    bad.win.localStorage.setItem("ExSave_FullScreen", "{not-json");
    assert.doesNotThrow(function () { bad.api.initFullScreen(); }, "坏存储不得抛错");
    assert.strictEqual(bad.win.document.body.className, "", "坏存储不得动页面");
    bad.close();
    console.log("✓ 全屏 3 通过: 已全屏不重复点击，坏存储按未开启处理");
}

testSignatureIconWins();
testFallbackToTailIcon();
testAlreadyFullScreenAndBadStorage();
console.log("=== 自动网页全屏回归 3 组场景全部通过 ===");
