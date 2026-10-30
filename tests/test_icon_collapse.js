const fs = require("fs");
const path = require("path");
const assert = require("assert");
let JSDOM;
try { JSDOM = require("jsdom").JSDOM; } catch (e) { console.error("[测试] 缺少依赖 jsdom，请先执行：npm install"); throw e; }

const ROOT = path.join(__dirname, "..");
const EXPANEL_SRC = fs.readFileSync(path.join(ROOT, "src/packages/ExPanel/ExPanel.js"), "utf8");
const EXICON_SRC = fs.readFileSync(path.join(ROOT, "src/packages/ExIcon/ExIcon.js"), "utf8");
const EXICON_FN_SRC = EXICON_SRC.slice(EXICON_SRC.indexOf("function initPkg_ExIcon_Func()"));

/**
 * 精灵球「全部收敛」回归（2026-10-30 用户要求）：
 *   三级面板（扩展功能 / 一键签到 / 一键续牌 …）展开后，点一次精灵球必须把它们全部收起，
 *   并且二级胶囊菜单也一并折起 —— 和二级菜单自己的折叠语义一致。
 *   没有三级面板展开时，保持原来的展开/折叠切换。
 */
function load() {
    const dom = new JSDOM(
        `<!DOCTYPE html><html><body>
            <div class="ex-panel" style="display:none">
              <div class="ex-panel__wrap">
                <div class="extool-icon"><span class="ex-panel__indicator"></span></div>
              </div>
              <a class="ex-panel__close"></a>
            </div>
            <div class="extool" style="display:flex"></div>
            <div class="sign-panel" style="display:none"></div>
            <div class="ex-icon"></div>
        </body></html>`,
        { url: "https://www.douyu.com/9999" }
    );
    const win = dom.window;
    const timers = [];
    const stubSetTimeout = function (fn) { timers.push(fn); return timers.length; };
    const noopTimer = function () { return 0; };
    const factory = new Function(
        "document", "window", "localStorage", "console", "setTimeout", "clearTimeout",
        "setInterval", "clearInterval", "MutationObserver", "DomHook", "curVersion",
        EXPANEL_SRC + "\n" + EXICON_FN_SRC + `
        return {
            initIcon: initPkg_ExIcon_Func,
            initPanel: initPkg_ExPanel,
            closeAll: ExPanel_closeAllThirdLevel,
            anyOpen: isAnyThirdLevelPanelOpen,
            hide: hideExPanel
        };`
    );
    const api = factory(
        win.document, win, win.localStorage,
        { log: function () {}, warn: function () {}, error: function () {} },
        stubSetTimeout, function () {}, noopTimer, noopTimer,
        win.MutationObserver,
        function (sel) { this.closeHook = function () {}; this.observe = function () {}; },
        "test-version"
    );
    const flush = function () { while (timers.length) { const fn = timers.shift(); fn(); } };
    return { dom: dom, win: win, api: api, flush: flush, timers: timers };
}

function click(el, win) {
    el.dispatchEvent(new win.Event("click", { bubbles: true }));
}

function testClickPokeballCollapsesEverything() {
    const env = load();
    env.api.initIcon();
    const doc = env.win.document;
    assert.strictEqual(env.api.anyOpen(), true, "前置：三级面板处于展开态");

    click(doc.querySelector(".ex-icon"), env.win);

    assert.strictEqual(doc.querySelector(".extool").style.display, "none", "点精灵球必须收起展开中的三级面板");
    assert.strictEqual(doc.querySelector(".sign-panel").style.display, "none", "未展开的面板也保持收起");
    assert.strictEqual(env.api.anyOpen(), false, "收敛后不应再有展开的三级面板");
    env.flush();
    assert.strictEqual(doc.querySelector(".ex-panel").style.display, "none", "二级胶囊菜单必须一并折起（全部收敛）");
    env.dom.window.close();
    console.log("✓ ① 通过: 有三级面板时点精灵球 = 全部收敛（面板 + 二级菜单）");
}

function testClickPokeballTogglesWhenNothingOpen() {
    const env = load();
    env.api.initIcon();
    const doc = env.win.document;
    doc.querySelector(".extool").style.setProperty("display", "none", "important");
    assert.strictEqual(env.api.anyOpen(), false, "前置：没有三级面板展开");

    click(doc.querySelector(".ex-icon"), env.win);
    assert.notStrictEqual(doc.querySelector(".ex-panel").style.display, "none",
        "没有三级面板时，点精灵球仍然要展开二级菜单（原行为不能变）");
    assert.strictEqual(doc.querySelector(".extool").style.display, "none", "不得凭空打开三级面板");
    env.dom.window.close();
    console.log("✓ ② 通过: 没有面板展开时保持原来的展开/折叠切换");
}

function testDockCloseStillCollapsesAll() {
    const env = load();
    env.api.initPanel();
    const doc = env.win.document;
    click(doc.querySelector(".ex-panel__close"), env.win);
    assert.strictEqual(doc.querySelector(".extool").style.display, "none", "二级菜单的 × 仍须收起全部三级面板");
    env.dom.window.close();
    console.log("✓ ③ 通过: 二级菜单 × 与精灵球共用同一份收敛逻辑");
}

function testSourceGuards() {
    assert.ok(EXICON_FN_SRC.indexOf("isAnyThirdLevelPanelOpen") !== -1,
        "精灵球点击必须判断是否已有三级面板展开");
    assert.ok(EXICON_FN_SRC.indexOf("ExPanel_closeAllThirdLevel") !== -1,
        "精灵球点击必须调用统一的收敛函数");
    assert.strictEqual(
        (EXPANEL_SRC.match(/const EX_THIRD_LEVEL_PANELS/g) || []).length, 1,
        "三级面板清单只能有一份（新增面板只改这里）"
    );
    console.log("✓ ④ 通过: 源码级护栏在位");
}

(async function main() {
    testClickPokeballCollapsesEverything();
    testClickPokeballTogglesWhenNothingOpen();
    testDockCloseStillCollapsesAll();
    testSourceGuards();
    console.log("=== 精灵球「全部收敛」回归 4 组场景全部通过 ===");
})().catch(function (e) {
    console.error("测试失败:", e && e.stack ? e.stack : e);
    process.exit(1);
});
