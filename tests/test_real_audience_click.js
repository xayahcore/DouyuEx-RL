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
 * 统计条「不再有跳转入口」的回归测试。
 *
 * 改动前：点统计条会 openPage("https://www.doseeing.com/room/<rid>")，
 * 而且 initPkg_RealAudience_Dom 插入成功时自己会调一次绑定、initPkg_RealAudience()
 * 又调一次，用 addEventListener 时同一个节点被绑两次，点一下连开两个标签页（用户实测报障）。
 *
 * 改动后：数据站（在看排行）自 2026-09-30 全线停服，跳过去只有一张公告页 ——
 * 比"点了没反应"更糟。所以入口整体撤下：无论绑定被调用多少次、节点被自愈重建多少次，
 * 点击都不得打开任何页面；同时整条要带停服说明（悬停可读）。
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
        // 用真定时器会拖到用例关窗之后才触发，反向把测试进程搞崩
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

function testNoNavigationEver() {
    const env = makeEnv();
    assert.strictEqual(env.api.insertDom(), true, "统计条应插入成功");

    // 复刻真实调用序列：Dom 内部先调一次绑定，调用方紧接着再调一次（历史上就是这里重复绑定）
    env.api.bindClick();
    clickBar(env.win);
    env.api.bindClick();
    env.api.bindClick();
    clickBar(env.win);
    assert.strictEqual(env.opened.length, 0,
        "点击统计条不得打开任何页面（数据站已停服，入口已撤），实际打开 " + JSON.stringify(env.opened));
    env.dom.window.close();
    console.log("✓ 场景 1 通过: 统计条点击不再跳任何页面（重复绑定也不会）");
}

function testSelfHealAlsoNoNavigation() {
    const env = makeEnv();
    env.api.insertDom();
    env.api.bindClick();
    // 节点被页面重绘冲掉 → 自愈重建 → 重新走一次 Dom（内部会再调绑定）
    env.win.document.querySelectorAll(".real-audience").forEach((el) => el.parentNode.removeChild(el));
    assert.strictEqual(env.api.ensure(), true, "自愈应重建统计条");
    env.api.bindClick();
    clickBar(env.win);
    assert.strictEqual(env.opened.length, 0, "自愈重建后点击同样不得打开页面");
    env.dom.window.close();
    console.log("✓ 场景 2 通过: 自愈重建后点击依然不跳转");
}

function testInitPathAlsoNoNavigation() {
    const env = makeEnv();
    // 走完整 init 路径（内部 Dom→Func + 外层 Func 两次调用），这才是线上真实序列
    env.api.init();
    clickBar(env.win);
    assert.strictEqual(env.opened.length, 0,
        "initPkg_RealAudience 后点击不得打开页面，实际 " + JSON.stringify(env.opened));
    env.dom.window.close();
    console.log("✓ 场景 3 通过: 完整初始化路径下点击也不跳转");
}

function testBarCarriesDeadSourceNote() {
    const env = makeEnv();
    env.api.insertDom();
    const bar = env.win.document.getElementsByClassName("real-audience")[0];
    const title = bar.getAttribute("title") || "";
    assert.ok(title.indexOf("停止服务") !== -1,
        "统计条必须带「数据源已停止服务」的悬停说明，实际 title=" + JSON.stringify(title));
    assert.ok(title.indexOf("2026-09-30") !== -1,
        "说明里必须给出停服日期，便于用户/客服判断，实际 title=" + JSON.stringify(title));
    env.dom.window.close();
    console.log("✓ 场景 4 通过: 统计条带停服说明（含停服日期）");
}

(async function main() {
    testNoNavigationEver();
    testSelfHealAlsoNoNavigation();
    testInitPathAlsoNoNavigation();
    testBarCarriesDeadSourceNote();
    console.log("=== 统计条入口撤下回归测试 4 组场景全部通过 ===");
})().catch((e) => {
    console.error("测试失败:", e && e.stack ? e.stack : e);
    process.exit(1);
});
