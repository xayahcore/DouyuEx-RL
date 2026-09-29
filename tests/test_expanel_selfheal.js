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

const EXPANEL_SRC = fs.readFileSync(path.join(__dirname, "../src/packages/ExPanel/ExPanel.js"), "utf8");

/**
 * 工具条（Dock）自愈回归。
 * 报障现象：工具条"加载出来后刷新又消失"，而且再也回不来（精灵球就在工具条里，
 * 所以用户连点一下让它出来都做不到）。
 * 根因：Dock 只插一次，插入点是页面框架自己渲染的礼物流水条单元格，框架重绘把它换掉后
 * 没有任何代码补插。
 * 这条测试要守两件事：① 脱离文档后必须自动挂回；② 只能搬回原节点，不许重建
 * （重建会丢九个按钮与它们的事件绑定）。
 */
function makeEnv() {
    const dom = new JSDOM(
        `<!DOCTYPE html><html><body>
            <div class="room-Player-Box">
                <div class="PlayerToolbar">
                    <div class="PlayerToolbar-ContentRow">
                        <div class="PlayerToolbar-ContentCell"><div class="PlayerToolbar-Wealth"></div></div>
                    </div>
                </div>
            </div>
            <div id="js-player-dialog"></div>
        </body></html>`,
        { url: "https://www.douyu.com/9999" }
    );
    const win = dom.window;
    // 定时器收归测试驱动：自愈是靠 setInterval 跑的，用真定时器测不了也测不快
    const timers = new Map();
    let seq = 1;
    const warnings = [];

    const factory = new Function(
        "window", "document", "localStorage", "setTimeout", "clearTimeout", "setInterval", "clearInterval", "console",
        EXPANEL_SRC + `
        return {
            boot: initPkg_ExPanel,
            ensureAttached: ExPanel_ensureAttached,
            insertDom: initPkg_ExPanel_insertDom,
            dock: function () { return ExPanel_dockNode; },
            isFloating: ExPanel_isGiftBarHidden,
            updateFloatingPosition: ExPanel_updateFloatingPosition,
            ensureDockIndicators: ensureDockIndicators
        };
        `
    );
    const api = factory(
        win, win.document, win.localStorage,
        (fn, ms) => { const id = seq++; timers.set(id, { fn, ms }); return id; },
        (id) => timers.delete(id),
        (fn, ms) => { const id = seq++; timers.set(id, { fn, ms }); return id; },
        (id) => timers.delete(id),
        { log: () => {}, error: () => {}, warn: (...a) => warnings.push(a.join(" ")) }
    );
    return {
        dom, win, api, warnings, timers,
        fireHeal() { timers.forEach((t) => t.fn()); },
    };
}

function testDockDetachedThenRestored() {
    const env = makeEnv();
    env.api.boot();
    const node = env.api.dock();
    assert.ok(node, "初始化后应持有 Dock 节点引用");
    assert.ok(env.win.document.contains(node), "Dock 初始必须已插入文档");
    assert.ok(env.timers.size >= 1, "自愈定时器应已启动");

    // 给 Dock 塞两个"包插入的按钮"（模拟九个包各自 insertIcon 的结果）
    const wrap = node.querySelector(".ex-panel__wrap");
    ["ex-sign", "extool-icon"].forEach((cls) => {
        const b = env.win.document.createElement("div");
        b.className = cls;
        wrap.appendChild(b);
    });
    const buttonsBefore = wrap.children.length;

    // 模拟框架重绘：把整个礼物流水条单元格换掉（Dock 随之脱离文档）
    const cell = env.win.document.querySelector(".PlayerToolbar-ContentCell");
    cell.parentNode.removeChild(cell);
    assert.strictEqual(env.win.document.contains(node), false, "重绘后 Dock 应已脱离文档");

    env.fireHeal();
    assert.strictEqual(env.win.document.contains(node), true, "自愈必须把 Dock 挂回文档");
    assert.strictEqual(node.querySelector(".ex-panel__wrap").children.length, buttonsBefore,
        "必须搬回原节点、按钮原样保留（重建会丢按钮与事件）");
    assert.ok(env.warnings.some((w) => /重新挂回/.test(w)), "自愈要留一条线索，便于判断页面重绘频率");
    env.dom.window.close();
    console.log("✓ 场景 1 通过: Dock 被重绘摘掉后自动挂回，按钮原样保留");
}

function testRepeatedWipesStaySingle() {
    const env = makeEnv();
    env.api.boot();
    const node = env.api.dock();
    // 反复模拟框架重绘：每次都摘掉宿主，自愈都要能挂回，且永远只有一份 Dock
    for (let i = 0; i < 3; i++) {
        const cell = env.win.document.querySelector(".PlayerToolbar-ContentCell");
        if (cell && cell.parentNode) cell.parentNode.removeChild(cell);
        const holder = env.win.document.querySelector(".ex-panel");
        if (holder && holder.parentNode) holder.parentNode.removeChild(holder);
        env.fireHeal();
        assert.strictEqual(env.win.document.contains(node), true, "第 " + (i + 1) + " 次重绘后应挂回");
        assert.strictEqual(env.win.document.querySelectorAll(".ex-panel").length, 1,
            "自愈不得复制出第二个 Dock（第 " + (i + 1) + " 次）");
    }
    // 宿主彻底不在时退到浮动态宿主，仍要在文档里
    assert.ok(env.win.document.contains(node), "宿主全无时也必须挂在浮动态宿主上");
    env.dom.window.close();
    console.log("✓ 场景 2 通过: 反复被重绘摘掉都能挂回，且始终只有一份 Dock");
}

function testNoopWhenAttached() {
    const env = makeEnv();
    env.api.boot();
    const node = env.api.dock();
    env.warnings.length = 0;
    for (let i = 0; i < 5; i++) env.fireHeal();
    assert.strictEqual(env.win.document.contains(node), true);
    assert.strictEqual(env.warnings.length, 0, "一切正常时自愈必须完全静默，不能刷屏");
    assert.strictEqual(env.api.ensureAttached(), true);
    env.dom.window.close();
    console.log("✓ 场景 3 通过: 未脱离文档时自愈完全静默（不打扰、不报错）");
}

(async function main() {
    testDockDetachedThenRestored();
    testRepeatedWipesStaySingle();
    testNoopWhenAttached();
    console.log("=== 工具条自愈回归测试 3 组场景全部通过 ===");
})().catch((e) => {
    console.error("测试失败:", e && e.stack ? e.stack : e);
    process.exit(1);
});
