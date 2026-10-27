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

const COMMON_SRC = fs.readFileSync(path.join(__dirname, "../src/common.js"), "utf8");
const MONTH_COST_SRC = fs.readFileSync(
    path.join(__dirname, "../src/packages/MonthCost/MonthCost.js"),
    "utf8"
);

/**
 * 「本月消费」左侧的滚动条：观看时间 / 开播时间。
 *
 * 2026-10-27：右上角统计条整条撤下（数据站停服后只剩贵宾数，没有参照），
 * 两项本机算得出来的数据搬到「本月消费」左侧滚动显示。本用例钉四件事：
 *   ① 位置：滚动条是 .month-cost 里第一个元素，在「本月消费」左边；
 *   ② 口径：观看时间 ← fsjk 的 todayWatch、开播时间 ← h5room 的 show_time；
 *      取不到（失败 / 未登录 / 未开播）就写「— / 未开播」，绝不编数字；
 *   ③ 滚动：真正溢出才滚（两份副本 + translateX(-50%) 无缝），放得下就静态停住；
 *   ④ 刷新：150 秒一次的定时器只挂一份，重复初始化不叠表。
 */
const SHOW_TIME = Math.floor(new Date(2026, 9, 27, 18, 30, 0).getTime() / 1000);

function makeEnv(opts) {
    opts = opts || {};
    const showInfo = opts.showInfo || { data: { show_time: SHOW_TIME, show_status: 1 } };
    const todayWatch = opts.todayWatch || { error: 0, data: { todayWatch: 3725 } };

    const dom = new JSDOM(
        `<!DOCTYPE html><html><body>
            <div class="PlayerToolbar">
                <div class="PlayerToolbar-ContentRow">
                    <div class="PlayerToolbar-ContentCell" id="js-backpack-enter">背包</div>
                </div>
            </div>
        </body></html>`,
        { url: "https://www.douyu.com/9999" }
    );
    const win = dom.window;
    const requests = [];
    const intervals = [];
    const warnings = [];

    const fetchStub = function (url) {
        requests.push(String(url));
        if (opts.fail) return Promise.reject(new Error("blocked"));
        const isShow = String(url).indexOf("h5room") !== -1;
        return Promise.resolve({ json: () => Promise.resolve(isShow ? showInfo : todayWatch) });
    };

    const factory = new Function(
        "window", "document", "location", "localStorage", "unsafeWindow",
        "setTimeout", "clearTimeout", "setInterval", "clearInterval",
        "fetch", "GM_xmlhttpRequest", "console", "ExGuard_warn", "ExGuard_pollFor",
        COMMON_SRC + "\n" + MONTH_COST_SRC + `
        return {
            init: initPkg_MonthCost,
            insert: MonthCost_insertIcon,
            render: MonthCost_renderTicker,
            text: MonthCost_tickerText,
            state: function () { return monthCostTickerState; },
            wrap: MonthCost_getTickerDom,
            track: MonthCost_getTickerTrackDom,
            copies: function () { return document.getElementsByClassName("monthcost__ticker-copy"); }
        };
        `
    );

    const api = factory(
        win, win.document, win.location, win.localStorage, win,
        // 定时器桩：ticker 刷新表交给用例检查，不让真实定时器在用例结束后继续跑
        function () { return 0; }, function () {},
        function (fn, ms) { intervals.push(ms); return intervals.length; }, function () {},
        fetchStub, function () {},
        { log: function () {}, warn: function () { warnings.push(Array.prototype.join.call(arguments, " ")); }, error: function () {} },
        function () {},
        function () { return { cancel: function () {}, done: false, tries: 0 }; }
    );

    return { dom, win, api, requests, intervals, warnings };
}

function waitTick() {
    return new Promise(function (resolve) { setTimeout(resolve, 5); });
}

function textOf(el) {
    return el ? String(el.textContent || "") : "";
}

async function testTickerPlacement() {
    console.log("=== ① 位置：滚动条在「本月消费」左侧，金额节点仍在 ===");
    const env = makeEnv();
    env.api.init();

    const container = env.win.document.querySelector(".month-cost");
    assert.ok(container, "「本月消费」入口必须被插入");
    const first = container.firstElementChild;
    assert.ok(first, "「本月消费」里必须有子节点");
    assert.strictEqual(first.className, "monthcost__ticker", "第一个元素必须是滚动条（也就是在「本月消费」左侧）");
    assert.ok(textOf(container).indexOf("本月消费") !== -1, "「本月消费」文案必须还在");
    assert.ok(env.win.document.getElementById("monthcost__money"), "金额节点不得被滚动条挤掉");
    assert.ok(env.win.document.querySelector(".monthcost__icon"), "眼睛图标必须还在");
    assert.deepStrictEqual(env.intervals, [150000], "刷新定时器必须是 150 秒一份，实际 " + JSON.stringify(env.intervals));

    console.log("✓ ① 通过: 滚动条在最左侧，本月消费结构完整，150 秒刷新表已挂");
    env.dom.window.close();
}

async function testTickerData() {
    console.log("=== ② 数据口径：观看时间 ← fsjk，开播时间 ← h5room ===");
    const env = makeEnv();
    env.api.init();
    await waitTick();

    assert.ok(
        env.requests.some(function (u) { return u.indexOf("/swf_api/h5room/9999") !== -1; }),
        "必须按 rid 请求 h5room 取开播时间，实际 " + JSON.stringify(env.requests)
    );
    assert.ok(
        env.requests.some(function (u) { return u.indexOf("fsjk/getCardTaskInfo?rid=9999") !== -1; }),
        "必须按 rid 请求 fsjk 取今日观看时长，实际 " + JSON.stringify(env.requests)
    );

    const wrap = env.api.wrap();
    assert.ok(wrap, "滚动条节点必须存在");
    const text = textOf(wrap);
    assert.ok(text.indexOf("已观看:1小时2分5秒") !== -1, "3725 秒必须格式化 1小时2分5秒，实际 " + JSON.stringify(text));
    assert.ok(text.indexOf("开播:10-27 18:30") !== -1, "开播时间必须写成 月-日 时:分，实际 " + JSON.stringify(text));
    assert.ok(
        String(wrap.title).indexOf("2026-10-27 18:30") !== -1,
        "悬停必须给出完整开播时间，实际 " + JSON.stringify(wrap.title)
    );

    const copies = env.api.copies();
    assert.ok(copies.length >= 2, "滚动必须准备两份副本，实际 " + copies.length);
    assert.strictEqual(textOf(copies[0]), textOf(copies[1]), "两份副本内容必须完全一致（否则滚动会跳）");

    console.log("✓ ② 通过: 两项数据都来自本机可算的官方接口，悬停给出完整时间");
    env.dom.window.close();
}

async function testTickerHonestPlaceholders() {
    console.log("=== ③ 取不到就写「—」：未登录 / 未开播 / 请求失败都不编数字 ===");

    // 未登录：fsjk 返回 error != 0
    {
        const env = makeEnv({ todayWatch: { error: 1000 } });
        env.api.init();
        await waitTick();
        const text = textOf(env.api.wrap());
        assert.ok(text.indexOf("已观看:—") !== -1, "未登录时必须写「—」，实际 " + JSON.stringify(text));
        assert.strictEqual(env.win.document.querySelector(".month-cost").textContent.indexOf("已观看:0秒"), -1,
            "不得拿 0 秒假装有数据");
        console.log("  - 未登录 → 已观看:—");
        env.dom.window.close();
    }

    // 未开播：h5room show_status = 2
    {
        const env = makeEnv({ showInfo: { data: { show_time: SHOW_TIME, show_status: 2 } } });
        env.api.init();
        await waitTick();
        const text = textOf(env.api.wrap());
        assert.ok(text.indexOf("开播:未开播") !== -1, "未开播时必须直说，实际 " + JSON.stringify(text));
        console.log("  - 未开播 → 开播:未开播");
        env.dom.window.close();
    }

    // 请求全挂：两个请求都 reject，界面停在占位符且不抛错
    {
        const env = makeEnv({ fail: true });
        env.api.init();
        await waitTick();
        const text = textOf(env.api.wrap());
        assert.ok(text.indexOf("已观看:—") !== -1 && text.indexOf("开播:—") !== -1,
            "请求失败时必须停在占位符，实际 " + JSON.stringify(text));
        assert.deepStrictEqual(env.warnings, [], "失败不得刷告警（每 150 秒一次会把 console 打满）: " + JSON.stringify(env.warnings));
        console.log("  - 请求失败 → 已观看:— / 开播:—，无告警");
        env.dom.window.close();
    }

    console.log("✓ ③ 通过: 三条失败路径都写占位符，没有一条编数字");
}

async function testTickerScroll() {
    console.log("=== ④ 滚动：溢出才滚（两份副本、8 秒左右一轮），放得下就静态停住 ===");
    const env = makeEnv();
    env.api.init();
    await waitTick();

    const wrap = env.api.wrap();
    const copies = env.api.copies();
    const track = env.api.track();
    assert.ok(track, "轨道节点必须存在");

    // 溢出：一份副本 300px、可视宽 100px → 必须滚，时长 = 300 / 40 = 8 秒
    Object.defineProperty(wrap, "clientWidth", { value: 100, configurable: true });
    Object.defineProperty(copies[0], "offsetWidth", { value: 300, configurable: true });
    env.api.render();
    assert.ok(
        String(track.style.animation).indexOf("monthcost-ticker") !== -1,
        "溢出时必须挂 monthcost-ticker 动画，实际 " + JSON.stringify(track.style.animation)
    );
    assert.ok(String(track.style.animation).indexOf("8s") !== -1, "时长必须按宽度算（300/40 = 8s），实际 " + JSON.stringify(track.style.animation));
    assert.strictEqual(copies[1].style.display, "", "溢出时第二份副本必须显示（无缝滚动的关键）");

    // 放得下：可视宽 400px → 不滚，第二份副本藏起来（否则会看到两遍相同文字）
    Object.defineProperty(wrap, "clientWidth", { value: 400, configurable: true });
    env.api.render();
    assert.strictEqual(track.style.animation, "", "放得下时不得滚动，实际 " + JSON.stringify(track.style.animation));
    assert.strictEqual(copies[1].style.display, "none", "放得下时第二份副本必须隐藏");

    // 量不到宽度（jsdom / 隐藏容器）：按不滚处理，不得除零或抛错
    Object.defineProperty(copies[0], "offsetWidth", { value: 0, configurable: true });
    assert.doesNotThrow(function () { env.api.render(); }, "量不到宽度时渲染不得抛错");

    console.log("✓ ④ 通过: 溢出才滚、宽度自适应、量不到宽度安全降级");
    env.dom.window.close();
}

async function testTickerTimerIdempotent() {
    console.log("=== ⑤ 重复初始化不叠表：150 秒刷新定时器只挂一份 ===");
    const env = makeEnv();
    env.api.init();
    await waitTick();
    env.api.init();
    env.api.init();
    assert.deepStrictEqual(env.intervals, [150000], "重复初始化不得再挂刷新表，实际 " + JSON.stringify(env.intervals));
    assert.strictEqual(env.win.document.querySelectorAll(".month-cost").length, 1, "「本月消费」也只能有一份");
    console.log("✓ ⑤ 通过: 定时器与入口都幂等");
    env.dom.window.close();
}

(async function main() {
    await testTickerPlacement();
    await testTickerData();
    await testTickerHonestPlaceholders();
    await testTickerScroll();
    await testTickerTimerIdempotent();
    console.log("=== 本月消费滚动条（观看时间 / 开播时间）5 组场景全部通过 ===");
})().catch(function (e) {
    console.error("测试失败:", e && e.stack ? e.stack : e);
    process.exit(1);
});
