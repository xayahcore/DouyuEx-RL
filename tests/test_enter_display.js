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
const REMOVE_AD_SRC = fs.readFileSync(path.join(ROOT, "src/packages/RemoveAD/RemoveAD.js"), "utf8");
const REMOVE_ENTER_SRC = fs.readFileSync(path.join(ROOT, "src/packages/Shield/RemoveEnter.js"), "utf8");
const SHIELD_SRC = fs.readFileSync(path.join(ROOT, "src/packages/Shield/Shield.js"), "utf8");
const EXPAND_SRC = fs.readFileSync(path.join(ROOT, "src/packages/ExpandTool/ExpandTool.js"), "utf8");
const EXPAND_SHIELD_SRC = fs.readFileSync(path.join(ROOT, "src/packages/ExpandTool/ExpandTool_Shield.js"), "utf8");

/**
 * 进场弹幕屏蔽回归。
 *
 * 历史坑：RemoveAD 的 CSS 写过 display:var(--enter-display, none) !important（回退 none），
 * 而唯一写变量的地方只在旧面板 .FilterKeywords 渲染后触发一次 —— 不去点面板就永久隐藏。
 * 现在：CSS 不再碰这个容器；状态在页面加载时按存储值用内联 display 应用。
 *
 * 2026-10-30：开关统一放进插件自己的「扩展功能」面板（不再往斗鱼原生菜单里塞节点）。
 */
function loadEnter(opts = {}) {
    const dom = new JSDOM(
        `<!DOCTYPE html><html><body>
            <div id="js-barrage-extend-container"></div>
            <div class="Barrage-main"></div>
        </body></html>`,
        { url: "https://www.douyu.com/9999" }
    );
    const win = dom.window;
    if (opts.savedRemoved) win.localStorage.setItem("ExSave_isRemoveEnterBarrage", "1");
    // savedRemoved === false 表示用户显式关掉过（存 "0"）；不传则是「从未设置过」的老用户
    if (opts.savedRemoved === false) win.localStorage.setItem("ExSave_isRemoveEnterBarrage", "0");

    const factory = new Function(
        "document", "window", "localStorage", "setTimeout", "clearTimeout", "console",
        REMOVE_ENTER_SRC + `
        return {
            apply: Shield_applyRemoveEnter,
            applyWhenReady: Shield_applyRemoveEnterWhenReady,
            state: function () { return isRemoveEnterBarrage; }
        };`
    );
    const api = factory(
        win.document, win, win.localStorage,
        // 定时器桩：applyWhenReady 会递归排期，用例里只要"能立刻应用"这条路径
        () => 0, () => {},
        { log: () => {}, warn: () => {}, error: () => {} }
    );
    return { dom, win, api };
}

function extendContainer(win) {
    return win.document.getElementById("js-barrage-extend-container");
}

// 断言"代码里不再使用"时必须先摘掉注释 —— 注释里保留来龙去脉是好事，
// 若连同注释一起禁，等于逼着后来人把坑抹掉，下次还会踩。
function stripComments(src) {
    return String(src).replace(/\/\*[\s\S]*?\*\//g, " ").replace(/^\s*\/\/.*$/gm, " ");
}

function testCssNoLongerHides() {
    const adCode = stripComments(REMOVE_AD_SRC);
    const enterCode = stripComments(REMOVE_ENTER_SRC);

    assert.ok(
        adCode.indexOf("#js-barrage-extend-container") === -1,
        "RemoveAD 不得再出现 #js-barrage-extend-container 的样式覆盖（P0 根因就是它）"
    );
    assert.ok(
        adCode.indexOf("var(--enter-display") === -1,
        "RemoveAD 不得再用 var(--enter-display, none)：变量没人写时回退值会把内容藏掉"
    );
    assert.ok(
        (/function initPkg_Shield\(\)\s*\{[\s\S]{0,300}?Shield_applyRemoveEnterWhenReady\(\)/).test(SHIELD_SRC),
        "initPkg_Shield 必须一进来就调用 Shield_applyRemoveEnterWhenReady()（页面加载即应用状态）"
    );
    // 开关放在插件自己的面板里，不再往斗鱼原生菜单塞节点
    assert.ok(EXPAND_SRC.indexOf('id="extool__removeEnter"') !== -1, "扩展功能面板必须有「屏蔽进场弹幕」开关");
    assert.ok(EXPAND_SRC.indexOf("initPkg_ExpandTool_Shield") !== -1, "扩展功能必须接线 initPkg_ExpandTool_Shield");
    assert.ok(EXPAND_SHIELD_SRC.indexOf("Shield_applyRemoveEnter") !== -1, "开关必须真的调用 Shield_applyRemoveEnter");
    assert.ok(enterCode.indexOf("shieldSettingPanel") === -1, "RemoveEnter 不得再依赖斗鱼原生菜单节点");
    console.log("✓ 场景 1 通过: 回退值陷阱已拆除，开关放在扩展功能面板");
}

function testDefaultOffTouchesNothing() {
    const { dom, win, api } = loadEnter({ savedRemoved: false });
    const el = extendContainer(win);
    el.style.display = "block";
    assert.strictEqual(api.apply(), true, "容器存在时必须应用成功");
    assert.strictEqual(el.style.display, "", "关掉屏蔽时必须移除内联 display，交还原生布局");
    assert.notStrictEqual(dom.window.getComputedStyle(el).display, "none",
        "关掉屏蔽时进场弹幕容器不得是 display:none");
    dom.window.close();
    console.log("✓ 场景 2 通过: 显式关掉时不藏任何东西，且不猜原生 display 值");
}

function testUnsetDefaultsToHidden() {
    const { dom, win, api } = loadEnter();
    assert.strictEqual(win.localStorage.getItem("ExSave_isRemoveEnterBarrage"), null, "前置：存储里没有这个键");
    api.applyWhenReady();
    const el = extendContainer(win);
    assert.ok(String(el.style.display).indexOf("none") !== -1,
        "未设置过的用户默认必须屏蔽进场弹幕（否则老用户会突然看见「XXX 来了」）");
    dom.window.close();
    console.log("✓ 场景 2b 通过: 未设置过的老用户默认屏蔽");
}

function testSavedOnAppliesEvenWithoutAnyPanel() {
    const { dom, win, api } = loadEnter({ savedRemoved: true });
    assert.strictEqual(dom.window.document.querySelector(".FilterKeywords"), null, "前置：页面上没有任何屏蔽面板");
    assert.strictEqual(api.state(), true, "前置：存储里是「已开启」");
    api.applyWhenReady();
    const el = extendContainer(win);
    assert.ok(String(el.style.display).indexOf("none") !== -1,
        "没有任何面板时也必须把进场弹幕藏掉（旧实现只需打开过面板才生效，是 bug）");
    dom.window.close();
    console.log("✓ 场景 3 通过: 屏蔽状态不依赖任何面板是否渲染过");
}

(async function main() {
    testCssNoLongerHides();
    testDefaultOffTouchesNothing();
    testUnsetDefaultsToHidden();
    testSavedOnAppliesEvenWithoutAnyPanel();
    console.log("=== 进场弹幕屏蔽回归测试 4 组场景全部通过 ===");
})().catch((e) => {
    console.error("测试失败:", e && e.stack ? e.stack : e);
    process.exit(1);
});
