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

const REAL_AUDIENCE_SRC = fs.readFileSync(path.join(__dirname, "../src/packages/RealAudience/RealAudience.js"), "utf8");

/**
 * 「真实人数」统计条的点击必须只开一个页面。
 * 回归背景：initPkg_RealAudience_Dom 插入成功时会自己调一次 initPkg_RealAudience_Func，
 * 而 initPkg_RealAudience() 紧接着又调一次 —— 用 addEventListener 时同一个节点被绑两次，
 * 点一下会连开两个 doseeing 标签页（用户实测报障）。这里把"调多少次"都钉住。
 */
function makeEnv() {
    const dom = new JSDOM(
        `<!DOCTYPE html><html><body>
            <div class="layout-Player-announce"></div>
            <div class="layout-Player-rankAll"></div>
            <div class="layout-Player-videoEntity"><video></video></div>
        </body></html>`,
        { url: "https://www.douyu.com/9999" }
    );
    const win = dom.window;
    const opened = [];
    const factory = new Function(
        "window", "document", "location", "localStorage",
        "setTimeout", "clearTimeout", "setInterval", "clearInterval",
        "openPage", "getValidDom", "console", "rid",
        "StyleHook_set", "fetch",
        REAL_AUDIENCE_SRC + `
        return {
            insertDom: initPkg_RealAudience_Dom,
            bindClick: initPkg_RealAudience_Func,
            init: initPkg_RealAudience,
            ensure: realAudienceEnsure
        };
        `
    );
    const api = factory(
        win, win.document, win.location, win.localStorage,
        // 定时器桩：init 会挂 150 秒刷新与 5 秒切换两个 setInterval，
        // 用真定时器会在用例关掉 jsdom 窗口之后才触发，反向把测试进程搞崩
        () => 0, () => {}, () => 0, () => {},
        (url) => opened.push(url),
        (list) => {
            for (const sel of list) {
                const el = win.document.querySelector(sel);
                if (el) return el;
            }
            return null;
        },
        { log: () => {}, error: () => {}, warn: () => {} },
        9999,
        () => {},
        // 永不 resolve：让 setRealViewer 停在 await 上，用例只关心点击绑定
        () => new Promise(() => {})
    );
    return { dom, win, api, opened };
}

function clickBar(win) {
    const bar = win.document.getElementsByClassName("real-audience")[0];
    assert.ok(bar, "统计条应该已插入");
    bar.dispatchEvent(new win.Event("click", { bubbles: true }));
}

function testClickBindsOnce() {
    const env = makeEnv();
    // 复刻真实调用序列：Dom 内部先绑一次，调用方紧接着再绑一次
    assert.strictEqual(env.api.insertDom(), true, "统计条应插入成功");
    env.api.bindClick();
    clickBar(env.win);
    assert.strictEqual(env.opened.length, 1, "点一次只应打开一个页面，实际 " + env.opened.length);
    assert.ok(env.opened[0].indexOf("https://www.doseeing.com/room/9999") === 0, env.opened[0]);

    // 再怎么重复绑定，也还是一个
    env.api.bindClick();
    env.api.bindClick();
    clickBar(env.win);
    assert.strictEqual(env.opened.length, 2, "重复绑定不得叠加监听，实际 " + (env.opened.length - 1) + " 次多余");
    env.dom.window.close();
    console.log("✓ 场景 1 通过: 点击统计条只开一个页面（重复调用绑定也不会叠加）");
}

function testSelfHealKeepsSingleBinding() {
    const env = makeEnv();
    env.api.insertDom();
    env.api.bindClick();
    // 节点被页面重绘冲掉 → 自愈重建 → 新节点重新绑一次，旧节点已不在
    env.win.document.querySelectorAll(".real-audience").forEach((el) => el.parentNode.removeChild(el));
    assert.strictEqual(env.api.ensure(), true, "自愈应重建统计条");
    env.api.bindClick();
    clickBar(env.win);
    assert.strictEqual(env.opened.length, 1, "自愈后点击仍只应开一个页面，实际 " + env.opened.length);
    env.dom.window.close();
    console.log("✓ 场景 2 通过: 节点重建自愈后点击仍然只开一个页面");
}

function testInitPathAlsoSingle() {
    const env = makeEnv();
    // 走完整 init 路径（内部 Dom→Func + 外层 Func 两次调用），这才是线上真实序列
    env.api.init();
    clickBar(env.win);
    assert.strictEqual(env.opened.length, 1, "initPkg_RealAudience 后点击只应开一个页面，实际 " + env.opened.length);
    env.dom.window.close();
    console.log("✓ 场景 3 通过: 完整初始化路径下点击也只开一个页面");
}

(async function main() {
    testClickBindsOnce();
    testSelfHealKeepsSingleBinding();
    testInitPathAlsoSingle();
    console.log("=== 真实人数点击绑定回归测试 3 组场景全部通过 ===");
})().catch((e) => {
    console.error("测试失败:", e && e.stack ? e.stack : e);
    process.exit(1);
});
