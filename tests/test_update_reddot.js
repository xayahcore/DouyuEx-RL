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
 * 版本红点语义（audit-wave2 P2-5）与 12 小时探测窗口（P2-6）。
 *
 * 旧语义：红点 = Ex_LastNotifiedVersion !== curVersion，也就是「有没有点过我收到」——
 *   完全不看有没有新版本；升级后不点面板就恒亮。
 * 新语义：红点 = 「远端确实有更新」且「这个远端版本还没被看过」。
 * 窗口：12 小时时间戳只在探测**成功**后写；失败不占用窗口，下次启动会重试。
 */
const SRC_DIR = process.env.UPDGUARD_SRC_DIR || path.join(__dirname, "..");
function readSrc(rel) {
    const text = fs.readFileSync(path.join(SRC_DIR, rel), "utf8");
    assert.ok(text.length > 0, "源码读取为空: " + rel);
    return text;
}

const EXGUARD_SRC = readSrc("src/require/ExGuard/ExGuard.js");
const UPDATE_SRC = readSrc("src/packages/Update/Update.js");
const CUR = String(require("../package.json").version || "2026.09.29.01");
function bump(v) {
    const parts = String(v).split(".");
    const last = parts.length - 1;
    const raw = String(Number(parts[last]) + 1);
    // 版本号末段必须是两位（isVersionLike 的判据），否则探测结果会被当成无效版本丢掉
    parts[last] = raw.length < parts[last].length ? raw.padStart(parts[last].length, "0") : raw;
    return parts.join(".");
}
const NEWER = bump(CUR);

const HTML = '<!DOCTYPE html><html><body><div class="ex-panel__wrap"></div><i id="ex-update__tip" style="display:none"></i></body></html>';

/**
 * 沙箱：GM_* 换成内存 store；长定时器收进队列，由用例手动放行
 * （12 小时探测靠 setTimeout(5000) 触发，直接跑会把测试拖慢 5 秒）。
 */
function makeEnv(opts) {
    const conf = opts || {};
    // 直接用调用方给的 store 对象（用例要在外面断言写入结果，不能拷贝）
    const store = conf.store || {};
    const dom = new JSDOM(HTML, { url: "https://www.douyu.com/9999" });
    const win = dom.window;
    const longTimers = [];
    const requests = [];
    const warnings = [];
    const quietConsole = {
        log: function () {},
        warn: function () { warnings.push(Array.prototype.join.call(arguments, " ")); },
        error: function () {}
    };
    const gm = function (req) {
        requests.push(String(req.url));
        if (typeof conf.respond === "function") {
            conf.respond(req);
            return;
        }
        if (typeof req.onerror === "function") req.onerror({ message: "blocked" });
    };
    // 用 typeof 兜住新版才有的符号：这样拿旧快照跑红灯时，失败发生在断言上而不是「标识符不存在」，
    // 报错信息才能说明真正的行为差异。
    const expose = [
        "return {",
        "  init: initPkg_Update,",
        "  note: (typeof Update_noteRemoteVersion === \"function\") ? Update_noteRemoteVersion : function () {},",
        "  markSeen: (typeof Update_markRemoteSeen === \"function\") ? Update_markRemoteSeen : function () {},",
        "  refresh: (typeof Update_refreshTip === \"function\") ? Update_refreshTip : function () {},",
        "  isNeedUpdate: function () { return isNeedUpdate; },",
        "  latest: function () { return lastestVersion; },",
        "  keys: {",
        "    seen: (typeof UPDATE_SEEN_KEY !== \"undefined\") ? UPDATE_SEEN_KEY : \"Ex_LastSeenRemoteVersion\",",
        "    known: (typeof UPDATE_KNOWN_KEY !== \"undefined\") ? UPDATE_KNOWN_KEY : \"Ex_LastKnownRemoteVersion\",",
        "    checkTime: (typeof UPDATE_CHECK_TIME_KEY !== \"undefined\") ? UPDATE_CHECK_TIME_KEY : \"Ex_LastUpdateCheckTime\"",
        "  }",
        "};"
    ].join("\n");
    const factory = new Function(
        "window", "document", "console", "setTimeout", "clearTimeout",
        "GM_info", "GM_getValue", "GM_setValue", "GM_xmlhttpRequest", "fetch", "showMessage",
        "ensureMiuixPanelHeader", "openMiuixPanelCentered", "updateDockActiveIndicator",
        EXGUARD_SRC + "\n" + UPDATE_SRC + "\n" + expose
    );
    const api = factory(
        win, win.document, quietConsole,
        function (fn, ms) {
            if (Number(ms) >= 1000) { longTimers.push(fn); return longTimers.length; }
            return global.setTimeout(fn, 0);
        },
        function (id) { global.clearTimeout(id); },
        { script: { version: CUR } },
        function (k) { return Object.prototype.hasOwnProperty.call(store, k) ? store[k] : undefined; },
        function (k, v) { store[k] = v; },
        gm,
        function () { return Promise.reject(new Error("no fetch")); },
        function () {},
        function () {},
        function () {},
        function () {}
    );
    function flushTimers() {
        let guard = 0;
        while (longTimers.length && guard++ < 20) {
            const fn = longTimers.shift();
            fn();
        }
    }
    return { dom, win, api, store, requests, warnings, flushTimers };
}

function tipShown(env) {
    return env.win.document.getElementById("ex-update__tip").style.display === "block";
}

/* ============ ① 红点语义 ============ */

async function testRedDotSemantics() {
    console.log("=== ① 红点 = 有新版本且没看过（不再等于「没点过我收到」） ===");

    // 1) 没有任何已知新版本 → 必须隐藏（旧实现这里会亮：lastNotified 为空）
    let env = makeEnv({ store: {} });
    env.api.init();
    assert.strictEqual(tipShown(env), false, "没有新版本时红点必须隐藏");
    assert.strictEqual(env.api.isNeedUpdate(), false, "没有新版本时 isNeedUpdate 必须为 false");
    env.dom.window.close();

    // 2) 上次探测到新版本 → 亮
    env = makeEnv({ store: { Ex_LastKnownRemoteVersion: NEWER } });
    env.api.init();
    assert.strictEqual(tipShown(env), true, "远端有更新时红点必须亮");
    assert.strictEqual(env.api.isNeedUpdate(), true, "远端有更新时 isNeedUpdate 必须为 true");
    assert.strictEqual(env.api.latest(), NEWER, "latestestVersion 要等于远端版本");
    env.dom.window.close();

    // 3) 已读 → 熄灭 + 落盘
    const store = { Ex_LastKnownRemoteVersion: NEWER };
    env = makeEnv({ store });
    env.api.init();
    assert.strictEqual(tipShown(env), true, "前置：红点亮着");
    env.api.markSeen();
    assert.strictEqual(tipShown(env), false, "已读后必须熄灭");
    assert.strictEqual(store.Ex_LastSeenRemoteVersion, NEWER, "已看过的版本要落盘");
    env.dom.window.close();

    // 4) 刷新后仍熄灭；又出现更新版本 → 重新点亮
    env = makeEnv({ store: store });
    env.api.init();
    assert.strictEqual(tipShown(env), false, "已看过的版本刷新后不应再亮");
    env.api.note(bump(NEWER));
    assert.strictEqual(tipShown(env), true, "又出现更新的版本时必须重新点亮");
    env.dom.window.close();

    console.log("✓ ① 通过: 有更新才亮、看过即灭、新版本再亮");
}

/* ============ ② 12 小时探测窗口 ============ */

async function testCheckWindow() {
    console.log("=== ② 12 小时窗口：成功才占用；失败下次重试 ===");

    // 5) 探测失败 → 不写时间戳
    let env = makeEnv({ store: {} });
    env.api.init();
    env.flushTimers();
    assert.strictEqual(env.store.Ex_LastUpdateCheckTime, undefined, "探测失败不得写入时间戳（旧实现会先写，白占 12 小时）");
    assert.ok(env.warnings.some(function (w) { return w.indexOf("版本更新") !== -1; }), "探测失败要留痕，实际 " + JSON.stringify(env.warnings));
    assert.strictEqual(tipShown(env), false, "探测失败不该点亮红点");
    env.dom.window.close();

    // 6) 探测成功且有更新 → 写时间戳 + 记已知版本 + 亮红点
    env = makeEnv({
        store: {},
        respond: function (req) {
            req.onload({ status: 200, responseText: "// ==UserScript==\n// @version " + NEWER + "\n// ==/UserScript==\n" });
        }
    });
    env.api.init();
    env.flushTimers();
    assert.ok(Number(env.store.Ex_LastUpdateCheckTime) > 0, "探测成功后必须写入时间戳");
    assert.strictEqual(env.store.Ex_LastKnownRemoteVersion, NEWER, "成功探测要把远端版本记下来");
    assert.strictEqual(tipShown(env), true, "探到更新要点亮红点");
    env.dom.window.close();

    // 7) 窗口内不再探测
    env = makeEnv({ store: { Ex_LastUpdateCheckTime: String(Date.now()) } });
    env.api.init();
    const before = env.requests.length;
    env.flushTimers();
    assert.strictEqual(env.requests.length, before, "12 小时窗口内不得再探测");
    env.dom.window.close();

    // 8) 探测成功但没有更新 → 时间戳照样更新，红点不亮
    env = makeEnv({
        store: {},
        respond: function (req) {
            req.onload({ status: 200, responseText: "// @version " + CUR + "\n" });
        }
    });
    env.api.init();
    env.flushTimers();
    assert.ok(Number(env.store.Ex_LastUpdateCheckTime) > 0, "成功（即使无更新）也要写时间戳");
    assert.strictEqual(tipShown(env), false, "没有更新时红点必须隐藏");
    env.dom.window.close();

    console.log("✓ ② 通过: 失败不占窗口、成功才推进");
}

// 只在复现红灯时用：UPDGUARD_ONLY=红点 / 窗口
const ONLY = process.env.UPDGUARD_ONLY || "";
const SCENARIOS = [
    ["红点", testRedDotSemantics],
    ["窗口", testCheckWindow]
];

(async function main() {
    let ran = 0;
    for (let i = 0; i < SCENARIOS.length; i++) {
        if (ONLY && SCENARIOS[i][0].indexOf(ONLY) === -1) continue;
        await SCENARIOS[i][1]();
        ran++;
    }
    assert.ok(ran > 0, "UPDGUARD_ONLY 没有匹配到任何场景: " + ONLY);
    console.log("=== 版本红点 / 探测窗口回归测试" + (ONLY ? "（仅 " + ONLY + "）" : "") + " 100% 通过 ===");
})().catch(function (e) {
    console.error("测试失败:", e && e.stack ? e.stack : e);
    process.exit(1);
});
