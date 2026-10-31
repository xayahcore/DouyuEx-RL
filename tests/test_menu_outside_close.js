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
 * 菜单「点外面就关」回归（2026-11-01 用户要求）：
 *   点在菜单外面的任意位置，二级胶囊菜单 + 三级面板 + 面板里再开出来的子菜单，一次全部收起。
 *   反过来，点菜单内部、点精灵球 / 弹幕小尾巴入口这类开关，一律不能把菜单抢断。
 *
 * 判定用 document 捕获阶段的 mousedown：捕获阶段动手时本次点击的 click 处理器还没跑，
 * 所以「点外面 → 先收菜单 → 目标自己的 click 再开新面板」的顺序天然成立。
 */
function load() {
    const dom = new JSDOM(
        `<!DOCTYPE html><html><body>
            <div id="page-area"><span id="page-text">页面内容</span></div>
            <div class="ex-icon"></div>
            <div class="extool" style="display:flex">
              <div class="extool__row"><button id="inside-btn">面板里的按钮</button></div>
            </div>
            <div class="sign-panel" style="display:none"></div>
            <div class="ChatToolBar-DanmakuTail"><div class="ChatToolBar-DanmakuTail-tip"></div></div>
            <div class="ChatToolBar-DanmakuTail-Panel" style="display:none"></div>
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
            bindOutside: ExPanel_bindClickOutside,
            closeAllMenus: ExPanel_closeAllMenus,
            closeAllThird: ExPanel_closeAllThirdLevel,
            anyOpen: isAnyThirdLevelPanelOpen,
            hasOpenMenu: ExPanel_hasOpenMenu,
            isInsideMenu: ExPanel_isInsideMenu,
            markMenuLayer: ExPanel_markMenuLayer,
            surfaceSelector: function () { return EX_MENU_SURFACE_SELECTOR; }
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
    return { dom: dom, win: win, doc: win.document, api: api, flush: flush };
}

/** 一次左键按下（判定就发生在这一刻） */
function press(el, win) {
    el.dispatchEvent(new win.MouseEvent("mousedown", { bubbles: true, cancelable: true, button: 0 }));
}
function click(el, win) {
    el.dispatchEvent(new win.Event("click", { bubbles: true }));
}
function realClick(el, win) {
    press(el, win);
    click(el, win);
}

/** 起一个「二级菜单 + 三级面板都开着」的现场 */
function openEverything() {
    const env = load();
    env.api.initPanel();
    const dock = env.doc.querySelector(".ex-panel");
    dock.style.display = "flex";
    env.doc.querySelector(".extool").style.display = "flex";
    return { env: env, dock: dock };
}

function testClickOutsideClosesEverything() {
    const ctx = openEverything();
    const env = ctx.env;
    assert.strictEqual(env.api.hasOpenMenu(), true, "前置：二级菜单与三级面板都展开着");

    press(env.doc.getElementById("page-text"), env.win);

    assert.strictEqual(env.doc.querySelector(".extool").style.display, "none", "点菜单外面必须收起展开的三级面板");
    assert.strictEqual(env.api.anyOpen(), false, "收起后不应再有展开的三级面板");
    env.flush();
    assert.strictEqual(ctx.dock.style.display, "none", "点菜单外面必须同时收起二级胶囊菜单");
    env.dom.window.close();
    console.log("✓ ① 通过: 点菜单外面 = 二级菜单 + 三级面板一次全收");
}

function testClickInsidePanelKeepsItOpen() {
    const ctx = openEverything();
    const env = ctx.env;

    press(env.doc.getElementById("inside-btn"), env.win);
    env.flush();

    assert.strictEqual(env.doc.querySelector(".extool").style.display, "flex", "点面板内部不得收起面板");
    assert.strictEqual(ctx.dock.style.display, "flex", "点面板内部不得收起二级菜单");
    env.dom.window.close();
    console.log("✓ ② 通过: 点三级面板内部保持展开");
}

function testClickInsideDockKeepsItOpen() {
    const ctx = openEverything();
    const env = ctx.env;
    const btn = ctx.dock.querySelector(".ex-panel__wrap") || ctx.dock;

    press(btn, env.win);
    env.flush();

    assert.strictEqual(ctx.dock.style.display, "flex", "点二级菜单内部不得收起二级菜单");
    assert.strictEqual(env.doc.querySelector(".extool").style.display, "flex", "点二级菜单内部也不得连带收面板");
    env.dom.window.close();
    console.log("✓ ③ 通过: 点二级菜单内部保持展开");
}

function testPokeballIsNotStolenByOutsideClose() {
    const ctx = openEverything();
    const env = ctx.env;
    env.api.initIcon();

    // 精灵球是「开关」，不能先被"点外面"收一遍再重新展开 —— 那会让"全部收敛"变成"再打开一次"
    realClick(env.doc.querySelector(".ex-icon"), env.win);

    assert.strictEqual(env.doc.querySelector(".extool").style.display, "none", "点精灵球仍须收起展开中的三级面板");
    assert.strictEqual(env.api.anyOpen(), false, "收敛后不应再有展开的三级面板");
    env.flush();
    assert.strictEqual(ctx.dock.style.display, "none", "点精灵球必须是「全部收敛」，不能变成把二级菜单重新展开");
    env.dom.window.close();
    console.log("✓ ④ 通过: 精灵球不被「点外面」抢断，仍走全部收敛");
}

function testDanmakuTailTriggerIsNotStolen() {
    const ctx = openEverything();
    const env = ctx.env;

    realClick(env.doc.querySelector(".ChatToolBar-DanmakuTail"), env.win);
    env.flush();

    assert.strictEqual(ctx.dock.style.display, "flex", "弹幕小尾巴入口是开关，点它不能把菜单收掉");
    assert.strictEqual(env.doc.querySelector(".extool").style.display, "flex", "同上：三级面板也不能被收掉");
    env.dom.window.close();
    console.log("✓ ⑤ 通过: 弹幕小尾巴入口不被「点外面」抢断");
}

function testSubMenuLayerCountsAsInside() {
    const ctx = openEverything();
    const env = ctx.env;

    const layer = env.api.markMenuLayer(env.doc.createElement("div"));
    layer.className = "ex-submenu-demo";
    layer.style.display = "block";
    layer.innerHTML = '<button id="layer-btn">子菜单项</button>';
    env.doc.body.appendChild(layer);
    assert.strictEqual(layer.getAttribute("data-ex-menu-layer"), "1", "标记后必须带 data-ex-menu-layer");
    assert.strictEqual(env.api.hasOpenMenu(), true, "子菜单层展开也算有菜单开着");

    press(env.doc.getElementById("layer-btn"), env.win);
    env.flush();
    assert.strictEqual(layer.style.display, "block", "点子菜单层内部不得把它收掉");
    assert.strictEqual(ctx.dock.style.display, "flex", "点子菜单层内部不得收起更上层的菜单");
    assert.strictEqual(env.doc.querySelector(".extool").style.display, "flex", "点子菜单层内部不得收起三级面板");

    // 子菜单层是「后续子菜单」：点它外面同样一次全收
    press(env.doc.getElementById("page-text"), env.win);
    assert.strictEqual(layer.style.display, "none", "点菜单外面必须把子菜单层一并收起");
    assert.strictEqual(env.doc.querySelector(".extool").style.display, "none", "点菜单外面必须把三级面板一并收起");
    env.dom.window.close();
    console.log("✓ ⑥ 通过: 面板里再开出来的子菜单层一并纳入「点外面就关」");
}

function testNothingOpenIsHarmless() {
    const env = load();
    env.api.initPanel();
    const dock = env.doc.querySelector(".ex-panel");
    dock.style.display = "none";
    env.doc.querySelector(".extool").style.display = "none";

    assert.strictEqual(env.api.hasOpenMenu(), false, "前置：没有任何菜单展开");
    press(env.doc.getElementById("page-text"), env.win);
    env.flush();

    assert.strictEqual(env.api.anyOpen(), false, "没有菜单展开时点外面不得凭空打开面板");
    assert.strictEqual(dock.style.display, "none", "没有菜单展开时点外面不得改动二级菜单");
    env.dom.window.close();
    console.log("✓ ⑦ 通过: 没有菜单展开时点外面无副作用");
}

function testDragFromInsideDoesNotClose() {
    const ctx = openEverything();
    const env = ctx.env;

    // 框选 / 拖拽：按下在面板里、松手和 click 落在外面的页面上，不算「点菜单外面」
    press(env.doc.getElementById("inside-btn"), env.win);
    click(env.doc.getElementById("page-area"), env.win);
    env.flush();

    assert.strictEqual(env.doc.querySelector(".extool").style.display, "flex", "从面板里往外拖不应收起面板");
    assert.strictEqual(ctx.dock.style.display, "flex", "从面板里往外拖不应收起二级菜单");
    env.dom.window.close();
    console.log("✓ ⑧ 通过: 按下在菜单里、松手在外面（拖拽 / 框选）不误判");
}

function testRightButtonIgnored() {
    const ctx = openEverything();
    const env = ctx.env;

    env.doc.getElementById("page-text").dispatchEvent(
        new env.win.MouseEvent("mousedown", { bubbles: true, cancelable: true, button: 2 })
    );
    env.flush();
    assert.strictEqual(env.doc.querySelector(".extool").style.display, "flex", "右键按下不触发「点外面就关」");
    env.dom.window.close();
    console.log("✓ ⑨ 通过: 只认左键");
}

function testBindIsIdempotent() {
    const env = load();
    env.api.initPanel();
    const doc = env.doc;
    const realAdd = doc.addEventListener.bind(doc);
    let bound = 0;
    doc.addEventListener = function (type, fn, opts) {
        if (type === "mousedown" && opts === true) bound++;
        return realAdd(type, fn, opts);
    };
    env.api.bindOutside();
    env.api.bindOutside();
    env.api.bindOutside();
    doc.addEventListener = realAdd;
    assert.strictEqual(bound, 0, "initPanel 已绑过一次，重复调用不得再绑");
    env.dom.window.close();

    const env2 = load();
    const doc2 = env2.doc;
    const realAdd2 = doc2.addEventListener.bind(doc2);
    let bound2 = 0;
    doc2.addEventListener = function (type, fn, opts) {
        if (type === "mousedown" && opts === true) bound2++;
        return realAdd2(type, fn, opts);
    };
    env2.api.bindOutside();
    env2.api.bindOutside();
    doc2.addEventListener = realAdd2;
    assert.strictEqual(bound2, 1, "连续绑定多次只能挂一个 mousedown 监听");
    env2.dom.window.close();
    console.log("✓ ⑩ 通过: 监听幂等，重复初始化不会叠出多个监听");
}

function testSourceGuards() {
    assert.ok(EXPANEL_SRC.indexOf("EX_THIRD_LEVEL_PANELS.split") !== -1,
        "菜单面清单必须从 EX_THIRD_LEVEL_PANELS 拆出来（新增面板只改那一份）");
    assert.ok(EXPANEL_SRC.indexOf("[data-ex-menu-layer]") !== -1,
        "后续子菜单层必须靠 data-ex-menu-layer 标记纳入判定");
    assert.ok(EXPANEL_SRC.indexOf('document.addEventListener("mousedown", ExPanel_onMenuOutsideMouseDown, true)') !== -1,
        "「点外面就关」必须挂在 document 捕获阶段的 mousedown 上");
    assert.ok(/var ExPanel_outsideClickBound/.test(EXPANEL_SRC),
        "去重标记必须用 var 声明（全包同域，let 会在声明语句之前被调用时撞 TDZ 掐断整根脚本）");
    assert.ok(!/^\s*let\s+ExPanel_outsideClickBound/m.test(EXPANEL_SRC), "去重标记不得用 let");
    assert.ok(EXPANEL_SRC.indexOf("ExPanel_bindClickOutside();") !== -1, "initPkg_ExPanel 必须接线绑监听");
    assert.ok(EXPANEL_SRC.indexOf("ExPanel_closeAllMenus") !== -1, "点外面必须走统一收敛出口");
    assert.strictEqual(
        (EXPANEL_SRC.match(/const EX_THIRD_LEVEL_PANELS/g) || []).length, 1,
        "三级面板清单仍然只能有一份"
    );

    const surfaces = EXPANEL_SRC.indexOf("EX_MENU_SURFACE_EXTRA");
    assert.ok(surfaces !== -1, "菜单面清单必须是具名常量，便于以后追加");
    console.log("✓ ⑪ 通过: 源码级护栏在位（清单同源 / 子菜单层标记 / 捕获阶段绑定 / 幂等）");
}

(async function main() {
    testClickOutsideClosesEverything();
    testClickInsidePanelKeepsItOpen();
    testClickInsideDockKeepsItOpen();
    testPokeballIsNotStolenByOutsideClose();
    testDanmakuTailTriggerIsNotStolen();
    testSubMenuLayerCountsAsInside();
    testNothingOpenIsHarmless();
    testDragFromInsideDoesNotClose();
    testRightButtonIgnored();
    testBindIsIdempotent();
    testSourceGuards();
    console.log("=== 菜单「点外面就关」回归 11 组场景全部通过 ===");
})().catch(function (e) {
    console.error("测试失败:", e && e.stack ? e.stack : e);
    process.exit(1);
});
