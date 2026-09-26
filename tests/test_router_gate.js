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

const ROUTER_SRC = fs.readFileSync(path.join(__dirname, "../src/routers/router.js"), "utf8");

/**
 * 直播间初始化门槛回归。
 * 报障现象："总是需要刷新一次脚本才能加载出来"。
 * 根因：initRouter_DouyuRoom_Main 是整份插件**唯一**的初始化入口，而它的门槛要求
 * 「弹幕区」与「背包入口」同时在场；背包入口跟插件毫无关系，一旦页面版式变化或
 * 用户装了清理页面元素的扩展把它去掉，这里就每秒空跑、永不放弃 ——
 * 整份插件永不初始化。本测试守住"最多等 N 秒必须初始化"。
 */
const GATE_WAIT_SECONDS = 15;

function makeEnv(opts) {
    const dom = new JSDOM(
        `<!DOCTYPE html><html><body>
            ${opts.barrage === false ? "" : '<div class="Barrage-main"></div>'}
            ${opts.backpackButton ? '<div class="BackpackButton"></div>' : ""}
            ${opts.backpackEnter ? '<div id="js-backpack-enter"></div>' : ""}
        </body></html>`,
        { url: "https://www.douyu.com/9999" }
    );
    const win = dom.window;
    const calls = [];
    const warnings = [];
    const intervals = new Map();
    const timeouts = new Map();
    let seq = 1;

    const factory = new Function(
        "window", "document", "location", "localStorage",
        "setTimeout", "clearTimeout", "setInterval", "clearInterval", "console",
        "record",
        `function init(){ record("init"); } function initStyles(){ record("initStyles"); }
         function initPkg(){ record("initPkg"); } function initPkgSpecial(){ record("initPkgSpecial"); }
         function initTimer(){ record("initTimer"); }`
        + "\n" + ROUTER_SRC + `
        return { run: initRouter_DouyuRoom_Main };
        `
    );
    const record = (n) => calls.push(n);
    const api = factory(
        win, win.document, win.location, win.localStorage,
        (fn, ms) => { const id = seq++; timeouts.set(id, { fn, ms }); return id; },
        (id) => timeouts.delete(id),
        (fn, ms) => { const id = seq++; intervals.set(id, { fn, ms }); return id; },
        (id) => intervals.delete(id),
        { log: () => {}, error: () => {}, warn: (...a) => warnings.push(a.join(" ")) },
        record
    );
    return {
        dom, win, api, calls, warnings,
        tick(n) {
            for (let i = 0; i < (n || 1); i++) intervals.forEach((t) => t.fn());
        },
        flushTimeouts() { const a = Array.from(timeouts.values()); timeouts.clear(); a.forEach((t) => t.fn()); },
        liveIntervals() { return intervals.size; },
    };
}

function testReadyPageInitializesFast() {
    const env = makeEnv({ barrage: true, backpackEnter: true });
    env.api.run();
    assert.deepStrictEqual(env.calls, ["init"], "init() 应立即执行");
    env.tick(1);
    env.flushTimeouts();
    const tail = env.calls.slice(1);
    // 注意不含 initPkgSpecial：它在 router.js 里就是空实现（且同文件里的声明会覆盖本测试的桩）
    assert.deepStrictEqual(tail, ["initStyles", "initPkg", "initTimer"],
        "元素齐全时应在第一次轮询就初始化");
    assert.strictEqual(env.liveIntervals(), 0, "初始化后必须清掉轮询定时器");
    assert.strictEqual(env.warnings.length, 0, "正常路径不该有告警");
    env.dom.window.close();
    console.log("✓ 场景 1 通过: 页面元素齐全时第一拍即初始化，无告警");
}

function testMissingBackpackEventuallyInitializes() {
    // 报障场景：弹幕区在、背包入口不在（版式变化或被扩展清掉）
    const env = makeEnv({ barrage: true, backpackButton: false, backpackEnter: false });
    env.api.run();
    env.tick(1);
    assert.strictEqual(env.calls.indexOf("initPkg"), -1, "第一拍不该急着初始化");
    env.tick(GATE_WAIT_SECONDS - 2);
    assert.strictEqual(env.calls.indexOf("initPkg"), -1, "等够之前不该初始化");
    env.tick(2);
    env.flushTimeouts();
    assert.ok(env.calls.indexOf("initPkg") >= 0, "等到上限后必须照常初始化，不能永不加载");
    assert.ok(env.warnings.some((w) => /未等到预期页面元素/.test(w)), "要留下可定位的线索: " + env.warnings.join("|"));
    assert.strictEqual(env.liveIntervals(), 0, "初始化后必须停掉轮询");
    env.dom.window.close();
    console.log("✓ 场景 2 通过: 缺背包入口时最多等 " + GATE_WAIT_SECONDS + " 秒仍会初始化并留线索");
}

function testEmptyPageAlsoBounded() {
    // 极端情形：连弹幕区都没渲染出来。同样必须有界，不能把整份插件挂死
    const env = makeEnv({ barrage: false });
    env.api.run();
    env.tick(GATE_WAIT_SECONDS + 1);
    env.flushTimeouts();
    assert.ok(env.calls.indexOf("initPkg") >= 0, "元素全缺时也必须到点初始化（单包异常已有隔离）");
    assert.ok(env.warnings.some((w) => /弹幕区: false/.test(w)), env.warnings.join("|"));
    env.dom.window.close();
    console.log("✓ 场景 3 通过: 元素全缺时同样有界，不会把插件挂死");
}

(async function main() {
    testReadyPageInitializesFast();
    testMissingBackpackEventuallyInitializes();
    testEmptyPageAlsoBounded();
    console.log("=== 初始化门槛回归测试 3 组场景全部通过 ===");
})().catch((e) => {
    console.error("测试失败:", e && e.stack ? e.stack : e);
    process.exit(1);
});
