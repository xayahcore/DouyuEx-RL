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
 * 第三轮复查（audit-wave4）里当场修掉的三处：
 *  ① ImageDanmaku：粘贴处理器把 init 时的 chatDom 关进闭包，进房瞬间聊天框没渲染 → 整场粘贴失效；
 *  ② DanmakuCollect：本地收藏删除用严格不等比较，id 字符串 vs 数字导致永远删不掉；
 *  ③ LiveTool/Treasure：领宝箱请求只有 onload、且 ret.data 裸解引用 → 失败静默 + 页面上留空容器。
 */
const SRC_DIR = process.env.WAVE4_SRC_DIR || path.join(__dirname, "..");
function readSrc(rel) {
    const text = fs.readFileSync(path.join(SRC_DIR, rel), "utf8");
    assert.ok(text.length > 0, "源码读取为空: " + rel);
    return text;
}
const EXGUARD_SRC = readSrc("src/require/ExGuard/ExGuard.js");

function makeSandbox(sources, extraNames, extraValues, exposeExpr, overrides) {
    const opts = overrides || {};
    const dom = new JSDOM("<!DOCTYPE html><html><body></body></html>", { url: "https://www.douyu.com/9999" });
    const win = dom.window;
    const warnings = [];
    const quietConsole = {
        log: function () {},
        warn: function () { warnings.push(Array.prototype.join.call(arguments, " ")); },
        error: function () {}
    };
    const names = ["window", "document", "localStorage", "console", "setTimeout", "clearTimeout", "setInterval", "clearInterval"].concat(extraNames);
    const factory = new Function(names.join(","), EXGUARD_SRC + "\n" + sources.join("\n") + "\nreturn (" + exposeExpr + ");");
    const api = factory.apply(null, [win, win.document, opts.localStorage || win.localStorage, quietConsole,
        win.setTimeout, win.clearTimeout, win.setInterval, win.clearInterval].concat(extraValues));
    return { dom, win, api, warnings };
}

/* ============ ① ImageDanmaku：聊天框晚渲染也要能粘贴 ============ */

function testPasteAfterLateRender() {
    console.log("=== ① 图片弹幕：聊天框晚渲染后，粘贴图片仍然生效 ===");
    const env = makeSandbox([readSrc("src/packages/ImageDanmaku/ImageDanmaku.js")],
        ["DomHook", "DOMPurify", "isValidImageFile", "dyToken", "showMessage", "unsafeWindow", "getUploadImageUrl"],
        [
            function () { return { cancel: function () {} }; },
            { sanitize: function (s) { return s; } },
            function () { return true; },
            "TOKEN",
            function () {},
            null,
            function () { return Promise.resolve(""); }
        ],
        "({ init: initPkg_ImageDanmaku_Func, poll: function (v) { ImageDanmaku_pollOpts = v; } })");

    // 轮询上限压到最小，避免留下 60 秒定时器
    env.api.poll({ intervalMs: 1, maxTries: 1 });
    assert.doesNotThrow(function () { env.api.init(); }, "聊天框未渲染时初始化不得抛错");

    // 此刻才渲染出聊天输入框（模拟进房后 2 秒）
    const doc = env.win.document;
    const ta = doc.createElement("textarea");
    ta.className = "ChatSend-txt";
    doc.body.appendChild(ta);
    ta.focus();
    assert.strictEqual(doc.activeElement, ta, "前置：输入框获得焦点");

    const paste = new env.win.Event("paste", { bubbles: true });
    Object.defineProperty(paste, "clipboardData", {
        value: {
            items: [{
                kind: "file",
                type: "image/png",
                getAsFile: function () { return new env.win.File(["x"], "x.png", { type: "image/png" }); }
            }]
        }
    });
    doc.dispatchEvent(paste);
    assert.ok(String(ta.value).indexOf("[DouyuEx图片上传中]") !== -1, "粘贴图片必须落占位符（旧实现闭包里是 null，整场失效），实际 " + JSON.stringify(ta.value));
    env.dom.window.close();
    console.log("✓ ① 通过: 晚渲染的聊天框也能粘贴");
}

/* ============ ② DanmakuCollect：字符串 id 也要能删掉 ============ */

function testCollectDeleteById() {
    console.log("=== ② 弹幕收藏：用字符串 id 删除本地条目必须生效 ===");
    const env = makeSandbox([readSrc("src/packages/DanmakuCollect/DanmakuCollect.js")],
        ["responseHook", "DomHook", "showMessage", "GM_xmlhttpRequest", "fetch"],
        [
            function () {}, function () { return { cancel: function () {} }; }, function () {},
            function () {}, function () { return Promise.resolve({ json: function () { return Promise.resolve({}); } }); }
        ],
        "({ add: addLocalDanmakuCollect, del: delLocalDanmakuCollect, get: getLocalDanmakuCollect })");

    env.api.add("第一条收藏");
    env.api.add("第二条收藏");
    const list = env.api.get();
    assert.strictEqual(list.length, 2, "前置：两条本地收藏");
    const target = list[0];
    assert.strictEqual(typeof target.id, "number", "本地 id 是时间戳数字");

    // 线上删除请求里的 id 是字符串（来自 response body）
    env.api.del(String(target.id));
    const after = env.api.get();
    assert.strictEqual(after.length, 1, "字符串 id 必须能删掉对应条目（旧实现严格不等比较永远删不掉）");
    assert.strictEqual(after[0].content, "第一条收藏", "留下的必须是被删那条之外的另��条");
    env.dom.window.close();
    console.log("✓ ② 通过: 字符串 id 删除生效");
}

/* ============ ③ Treasure：失败要清容器、要留痕 ============ */

function testTreasureFailure() {
    console.log("=== ③ 自动抢宝箱：请求失败/返回异常必须清掉空容器并留痕 ===");
    const requests = [];
    const env = makeSandbox([readSrc("src/packages/LiveTool/Treasure/Treasure.js")],
        ["GM_xmlhttpRequest", "dyToken", "showMessage", "unsafeWindow", "getCookieValue", "getTreasureDelay"],
        [
            function (req) { requests.push(req); }, "TOKEN", function () {}, null,
            function () { return "did"; }, function () { return 0; }
        ],
        "({ getTreasure: getTreasure })");

    const doc = env.win.document;
    const makeSlot = function () {
        const div = doc.createElement("div");
        div.id = "Ex_Geetest_no1";
        doc.body.appendChild(div);
        return div;
    };

    // 网络失败
    makeSlot();
    env.api.getTreasure("1", "2", "3", "Ex_Geetest_no1");
    const req = requests[requests.length - 1];
    assert.strictEqual(typeof req.onerror, "function", "领宝箱请求必须注册 onerror（旧实现只有 onload）");
    assert.strictEqual(typeof req.ontimeout, "function", "领宝箱请求必须注册 ontimeout");
    req.onerror({ message: "net" });
    assert.strictEqual(doc.getElementById("Ex_Geetest_no1"), null, "失败后必须清掉空容器");
    assert.ok(env.warnings.some(function (w) { return w.indexOf("自动抢宝箱") !== -1; }), "失败要留痕，实际 " + JSON.stringify(env.warnings));

    // 返回体没有 data（风控/改版）
    makeSlot();
    env.api.getTreasure("1", "2", "3", "Ex_Geetest_no1");
    const req2 = requests[requests.length - 1];
    assert.doesNotThrow(function () { req2.onload({ response: { error: 500 } }); }, "返回体缺 data 时 onload 不得抛错");
    assert.strictEqual(doc.getElementById("Ex_Geetest_no1"), null, "返回体异常后同样要清掉容器");

    // 正常"已领过"分支也要清容器
    makeSlot();
    env.api.getTreasure("1", "2", "3", "Ex_Geetest_no1");
    requests[requests.length - 1].onload({ response: { data: { code: "0", msg: "领取失败" } } });
    assert.strictEqual(doc.getElementById("Ex_Geetest_no1"), null, "非验证分支也必须把容器收掉");

    env.dom.window.close();
    console.log("✓ ③ 通过: 失败/异常都清理并留痕");
}

/* ============ ④ 本地收藏上限：滚动淘汰 ============ */

function testCollectLimit() {
    console.log("=== ④ 本地弹幕收藏：超过上限要滚动淘汰，不能无限长 ===");
    const env = makeSandbox([readSrc("src/packages/DanmakuCollect/DanmakuCollect.js")],
        ["responseHook", "DomHook", "showMessage", "GM_xmlhttpRequest", "fetch"],
        [
            function () {}, function () { return { cancel: function () {} }; }, function () {},
            function () {}, function () { return Promise.resolve({ json: function () { return Promise.resolve({}); } }); }
        ],
        "({ add: addLocalDanmakuCollect, get: getLocalDanmakuCollect, limit: function () { return (typeof DANMAKU_COLLECT_LIMIT !== \"undefined\") ? DANMAKU_COLLECT_LIMIT : 0; } })");

    const limit = env.api.limit();
    assert.ok(limit > 0, "必须有一个明确的条数上限");
    for (let i = 0; i < limit + 10; i++) env.api.add("收藏第 " + i + " 条");
    const list = env.api.get();
    assert.strictEqual(list.length, limit, "超过上限必须滚动淘汰，实际 " + list.length);
    assert.strictEqual(list[0].content, "收藏第 " + (limit + 9) + " 条", "最新的必须留在最前");
    assert.strictEqual(list[list.length - 1].content, "收藏第 10 条", "最旧的 10 条必须被淘汰");
    env.dom.window.close();
    console.log("✓ ④ 通过: 只保留最近 " + limit + " 条");
}

/* ============ ⑤ 写盘失败不得冒回 responseHook ============ */

function testCollectQuotaFailure() {
    console.log("=== ⑤ 本地收藏写盘失败：只告警不抛（否则会弄坏收藏请求的响应） ===");
    const data = {};
    const throwingLS = {
        getItem: function (k) { return Object.prototype.hasOwnProperty.call(data, k) ? data[k] : null; },
        setItem: function () { throw new Error("QuotaExceededError"); },
        removeItem: function (k) { delete data[k]; }
    };
    const env = makeSandbox([readSrc("src/packages/DanmakuCollect/DanmakuCollect.js")],
        ["responseHook", "DomHook", "showMessage", "GM_xmlhttpRequest", "fetch"],
        [
            function () {}, function () { return { cancel: function () {} }; }, function () {},
            function () {}, function () { return Promise.resolve({ json: function () { return Promise.resolve({}); } }); }
        ],
        "({ add: addLocalDanmakuCollect })",
        { localStorage: throwingLS });

    let ret;
    assert.doesNotThrow(function () { ret = env.api.add("配额爆炸的第 " + Date.now() + " 条"); },
        "写盘失败必须被兜住（它发生在 responseHook 里，抛出会弄坏收藏请求的响应）");
    assert.strictEqual(ret, false, "写盘失败要返回 false");
    assert.ok(env.warnings.some(function (w) { return w.indexOf("弹幕收藏") !== -1; }), "写盘失败要留痕，实际 " + JSON.stringify(env.warnings));
    env.dom.window.close();
    console.log("✓ ⑤ 通过: 配额爆炸只告警");
}

/* ============ ⑥ BarrageLoop 初始化逐项隔离 ============ */

function testBarrageLoopInitIsolation() {
    console.log("=== ⑥ 弹幕小助手：Dom 步骤抛错不得拖垮 Func / Set ===");
    const stubExpr = "({ init: initPkg_BarrageLoop, stub: function (calls) {"
        + " initPkg_BarrageLoop_Dom = function () { throw new Error(\"panel insert boom\"); };"
        + " initPkg_BarrageLoop_Func = function () { calls.push(\"Func\"); };"
        + " initPkg_BarrageLoop_Set = function () { calls.push(\"Set\"); };"
        + " }, tryInit: (typeof BarrageLoop_tryInit === \"function\") ? BarrageLoop_tryInit : null })";
    const env = makeSandbox([readSrc("src/packages/BarrageLoop/BarrageLoop.js")],
        ["GM_xmlhttpRequest", "showMessage", "showExRightPanel", "rid", "my_uid", "getRandom", "dyToken"],
        [function () {}, function () {}, function () {}, "9999", "1", function (a, b) { return b; }, "T"],
        stubExpr);

    const calls = [];
    env.api.stub(calls);
    // 先看行为：Dom 抛错时 init 本身不得把异常冒出来（旧实现三步裸调，这里会直接抛）
    assert.doesNotThrow(function () { env.api.init(); }, "Dom 步骤抛错不得冒出 initPkg_BarrageLoop");
    assert.strictEqual(typeof env.api.tryInit, "function", "必须提供 BarrageLoop_tryInit（逐项隔离入口）");
    assert.deepStrictEqual(calls, ["Func", "Set"], "Dom 抛错后 Func / Set 必须照跑，实际 " + JSON.stringify(calls));
    assert.ok(env.warnings.some(function (w) { return w.indexOf("初始化失败") !== -1; }), "失败步骤要留痕，实际 " + JSON.stringify(env.warnings));
    env.dom.window.close();
    console.log("✓ ⑥ 通过: 单步失败不连坐");
}
// 只在复现红灯时用：WAVE4_ONLY=粘贴 / 收藏 / 宝箱 / 上限 / 配额 / 隔离
const ONLY = process.env.WAVE4_ONLY || "";
const SCENARIOS = [
    ["粘贴", testPasteAfterLateRender],
    ["收藏", testCollectDeleteById],
    ["宝箱", testTreasureFailure],
    ["上限", testCollectLimit],
    ["配额", testCollectQuotaFailure],
    ["隔离", testBarrageLoopInitIsolation]
];

(async function main() {
    let ran = 0;
    for (let i = 0; i < SCENARIOS.length; i++) {
        if (ONLY && SCENARIOS[i][0].indexOf(ONLY) === -1) continue;
        SCENARIOS[i][1]();
        ran++;
    }
    assert.ok(ran > 0, "WAVE4_ONLY 没有匹配到任何场景: " + ONLY);
    console.log("=== audit-wave4 修复回归测试" + (ONLY ? "（仅 " + ONLY + "）" : "") + " 100% 通过 ===");
})().catch(function (e) {
    console.error("测试失败:", e && e.stack ? e.stack : e);
    process.exit(1);
});
