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

/**
 * P0 回归：进场弹幕被永久隐藏 + 开关口径与现实相反。
 *
 * 旧实现：
 *   ① RemoveAD 的 CSS 写 display:var(--enter-display, none) !important（回退值 none）；
 *   ② 唯一写 --enter-display 的地方在 RemoveEnter，且只在 .FilterKeywords
 *      （弹幕屏蔽设置面板）渲染后被调用一次。
 *   → 不去点弹幕设置，就没人写变量 → 回退值 none 生效 → 进场弹幕永久消失，
 *     而开关上写着「未开启」。
 *
 * 现在：CSS 不再碰这个容器；Shield/RemoveEnter 在页面加载时就按存储状态
 * 用内联 display 直接控制真实节点，且不需要任何面板先渲染出来。
 */
function loadEnter(opts = {}) {
    const dom = new JSDOM(
        `<!DOCTYPE html><html><body>
            <div id="js-barrage-extend-container"></div>
            <div class="FilterKeywords"></div>
            <div class="Barrage-main"></div>
        </body></html>`,
        { url: "https://www.douyu.com/9999" }
    );
    const win = dom.window;
    if (opts.savedRemoved) win.localStorage.setItem("ExSave_isRemoveEnterBarrage", "1");
    if (opts.withPanel === false) {
        const fk = win.document.querySelector(".FilterKeywords");
        if (fk) fk.remove();
    }

    const factory = new Function(
        "document", "window", "localStorage", "setTimeout", "clearTimeout", "console",
        REMOVE_ENTER_SRC + `
        return {
            apply: Shield_applyRemoveEnter,
            applyWhenReady: Shield_applyRemoveEnterWhenReady,
            init: initPkg_Shield_RemoveEnter,
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

function switchDom(win) {
    return win.document.getElementById("ex-removeEnterBarrage");
}

// 断言"代码里不再使用"时必须先摘掉注释 —— 注释里保留来龙去脉是好事，
// 若连同注释一起禁，等于逼着后来人把坑抹掉，下次还会踩。
function stripComments(src) {
    return String(src).replace(/\/\*[\s\S]*?\*\//g, " ").replace(/^\s*\/\/.*$/gm, " ");
}

function testCssNoLongerHides() {
    const adCode = stripComments(REMOVE_AD_SRC);
    const enterCode = stripComments(REMOVE_ENTER_SRC);

    // ① RemoveAD 里那条把回退值写成 none 的规则必须整体退场
    assert.ok(
        adCode.indexOf("#js-barrage-extend-container") === -1,
        "RemoveAD 不得再出现 #js-barrage-extend-container 的样式覆盖（P0 根因就是它）"
    );
    assert.ok(
        adCode.indexOf("var(--enter-display") === -1,
        "RemoveAD 不得再用 var(--enter-display, none)：变量没人写时回退值会把内容藏掉"
    );
    assert.ok(
        enterCode.indexOf("setProperty(\"--enter-display\"") === -1 &&
            enterCode.indexOf("CSS.supports('--enter-display'") === -1,
        "RemoveEnter 不得再写 --enter-display / 做 CSS.supports 兼容分支：改为内联 display 直接控制真实节点"
    );

    // ② Shield 入口必须无条件先应用一次状态（不能等屏蔽面板出现）
    assert.ok(
        /function initPkg_Shield\(\)\s*\{[\s\S]{0,400}?Shield_applyRemoveEnterWhenReady\(\)/.test(SHIELD_SRC),
        "initPkg_Shield 必须一进来就调用 Shield_applyRemoveEnterWhenReady()（页面加载即应用状态）"
    );
    console.log("✓ 场景 1 通过: 回退值陷阱已拆除，状态应用挂在 Shield 入口而不是面板回调上");
}

function testDefaultOffTouchesNothing() {
    const { dom, win, api } = loadEnter();
    const el = extendContainer(win);
    el.style.display = "block"; // 模拟页面原生写过的内联值
    assert.strictEqual(api.apply(), true, "容器存在时必须应用成功");
    assert.strictEqual(el.style.display, "", "未勾选屏蔽时必须移除内联 display，交还原生布局");
    assert.notStrictEqual(dom.window.getComputedStyle(el).display, "none",
        "未勾选屏蔽时进场弹幕容器不得是 display:none（这正是用户看到的「进场弹幕没了」）");
    dom.window.close();
    console.log("✓ 场景 2 通过: 默认（未勾选）不藏任何东西，且不猜原生 display 值");
}

function testSavedOnAppliesWithoutPanel() {
    // 关键回归：没有 .FilterKeywords 面板，也必须把状态应用上
    const { dom, win, api } = loadEnter({ savedRemoved: true, withPanel: false });
    assert.strictEqual(win.document.querySelector(".FilterKeywords"), null, "前置：本用例没有屏蔽面板");
    assert.strictEqual(api.state(), true, "前置：存储里是「已开启」");

    api.applyWhenReady();
    const el = extendContainer(win);
    assert.ok(String(el.style.display).indexOf("none") !== -1,
        "没有屏蔽面板时也必须把进场弹幕藏掉（旧实现只需打开过面板才生效，是 bug）");
    dom.window.close();
    console.log("✓ 场景 3 通过: 屏蔽状态不依赖屏蔽面板是否渲染过");
}

function testToggleWritesRealStateAndText() {
    const { dom, win, api } = loadEnter();
    api.init();
    const box = switchDom(win);
    assert.ok(box, "面板存在时必须注入开关");
    const status = box.querySelector(".FilterSwitchStatus-status");
    assert.strictEqual(status.textContent, "未开启", "默认应显示未开启");

    // 点一下 → 真实节点被藏 + 文案变成已开启（顺序必须是先改页面再改文案）
    box.dispatchEvent(new win.Event("click", { bubbles: true }));
    assert.strictEqual(api.state(), true, "点击后状态应为已开启");
    assert.ok(String(extendContainer(win).style.display).indexOf("none") !== -1,
        "点击后进场弹幕必须真的被藏起来（不能只改文案）");
    assert.strictEqual(status.textContent, "已开启", "点击后文案必须变成已开启");
    assert.strictEqual(win.localStorage.getItem("ExSave_isRemoveEnterBarrage"), "1", "状态必须落盘");

    // 再点一下 → 解除隐藏 + 文案变回未开启
    box.dispatchEvent(new win.Event("click", { bubbles: true }));
    assert.strictEqual(api.state(), false, "再点一次状态应回未开启");
    assert.strictEqual(extendContainer(win).style.display, "", "关闭后必须移除内联 display");
    assert.strictEqual(status.textContent, "未开启", "关闭后文案必须变回未开启");
    assert.strictEqual(win.localStorage.getItem("ExSave_isRemoveEnterBarrage"), "0", "关闭状态也必须落盘");
    dom.window.close();
    console.log("✓ 场景 4 通过: 开关 → 真实显隐 → 文案 → 存储 四者同步，口径不再相反");
}

function testUiInjectionIsIdempotent() {
    const { dom, win, api } = loadEnter();
    api.init();
    api.init();
    api.init();
    assert.strictEqual(win.document.querySelectorAll("#ex-removeEnterBarrage").length, 1,
        "屏蔽面板会反复重绘，重复注入会得到两个开关（幂等失败）");
    dom.window.close();
    console.log("✓ 场景 5 通过: 开关 UI 注入幂等（面板重绘不会插出第二个开关）");
}

(async function main() {
    testCssNoLongerHides();
    testDefaultOffTouchesNothing();
    testSavedOnAppliesWithoutPanel();
    testToggleWritesRealStateAndText();
    testUiInjectionIsIdempotent();
    console.log("=== 进场弹幕屏蔽 P0 回归测试 5 组场景全部通过 ===");
})().catch((e) => {
    console.error("测试失败:", e && e.stack ? e.stack : e);
    process.exit(1);
});
