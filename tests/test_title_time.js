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
const TITLE_TIME_SRC = fs.readFileSync(
    path.join(__dirname, "../src/packages/TitleTime/TitleTime.js"),
    "utf8"
);

/**
 * 标题栏「观看时间 / 开播时间」（用户反馈 4：从「本月消费」左侧滚动条搬过来）。
 *
 * 本用例钉五件事：
 *   ① 位置：节点必须是 #copy-real-live 的紧邻下一个兄弟节点（同一父节点），带 Title-blockInline；
 *   ② 口径：观看时间 ← fsjk 的 todayWatch、开播时间 ← h5room 的 show_time / show_status，
 *      取不到写「—」、未开播写「未开播」，悬停给出完整年月日；
 *   ③ 降级：未登录 / 未开播 / 两个请求全挂都不编数字，且失败不刷告警；
 *   ④ 刷新：150 秒定时器只挂一份，重复 init 不叠表、不插出两份；
 *   ⑤ 标题栏没渲染：有上限等待（≈20 次 × 500ms），等不到只留一条日志，绝不抛错。
 */
const SHOW_TIME = Math.floor(new Date(2026, 9, 27, 18, 30, 0).getTime() / 1000);

// 模拟真实标题栏：.Title-col[4] 里由 CopyRealLive 插入 #copy-real-live，
// 前后都留了空白文本节点 —— 插入点必须仍然紧跟在锚点后面（过掉文本节点）
const TITLE_HTML = [
    '<div class="Title">',
    '    <div class="Title-col"><span class="Title-row-text">标题</span></div>',
    '    <div class="Title-col"><span class="Title-row-text">第二列</span></div>',
    '    <div class="Title-col"><span class="Title-row-text">第三列</span></div>',
    '    <div class="Title-col"><span class="Title-row-text">第四列</span></div>',
    '    <div class="Title-col"><span class="Title-row-text">第五列</span>',
    '        <div class="Title-blockInline" id="copy-real-live"></div>',
    '        <span class="Title-row-text">尾部</span></div>',
    "</div>",
].join("\n");

function makeEnv(options) {
    const opts = options || {};
    const html = opts.html === undefined ? TITLE_HTML : opts.html;
    const dom = new JSDOM('<!DOCTYPE html><html><body>' + html + "</body></html>", {
        url: "https://www.douyu.com/9999",
    });
    const win = dom.window;
    const requests = [];
    const intervals = [];
    const warnings = [];
    const timers = [];
    const polls = [];

    const showInfo = opts.showInfo || { error: 0, data: { show_time: SHOW_TIME, show_status: 1 } };
    const todayWatch = opts.todayWatch || { error: 0, data: { todayWatch: 3725 } };

    const fetchStub = function (url) {
        requests.push(String(url));
        if (opts.fail) return Promise.reject(new Error("blocked"));
        const isShow = String(url).indexOf("h5room") !== -1;
        return Promise.resolve({
            json: function () { return Promise.resolve(isShow ? showInfo : todayWatch); },
        });
    };

    // ExGuard_pollFor 的桩：只记录调用，命中时机交给用例自己控制
    const pollStub = opts.noPoll ? undefined : function (findFn, onFound, cfg) {
        polls.push({ findFn: findFn, onFound: onFound, cfg: cfg || {} });
        return { cancel: function () {}, done: false, tries: polls.length };
    };

    const factory = new Function(
        "window", "document", "location", "localStorage", "unsafeWindow",
        "setTimeout", "clearTimeout", "setInterval", "clearInterval",
        "fetch", "GM_xmlhttpRequest", "console", "ExGuard_warn", "ExGuard_pollFor",
        COMMON_SRC + "\n" + TITLE_TIME_SRC + `
        return {
            init: initPkg_TitleTime,
            insert: TitleTime_insert,
            render: TitleTime_render,
            node: function () { return document.querySelector(".ex-title-time"); },
            findAnchor: TitleTime_findAnchor,
            state: function () { return titleTimeState; }
        };
        `
    );

    const api = factory(
        win, win.document, win.location, win.localStorage, win,
        // 定时器桩：轮询/刷新表交给用例检查，别让真实定时器在用例结束后继续跑
        function (fn, ms) { timers.push({ fn: fn, ms: ms }); return timers.length; },
        function () {},
        function (fn, ms) { intervals.push(ms); return intervals.length; },
        function () {},
        fetchStub, function () {},
        { log: function () {}, warn: function () {}, error: function () {} },
        function (tag, message) { warnings.push(String(tag) + "|" + String(message)); },
        pollStub
    );

    return {
        dom: dom,
        win: win,
        api: api,
        requests: requests,
        intervals: intervals,
        warnings: warnings,
        timers: timers,
        polls: polls,
        nodeCount: function () { return win.document.querySelectorAll(".ex-title-time").length; },
    };
}

function wait(ms) {
    return new Promise(function (resolve) { setTimeout(resolve, ms); });
}

/** 读某一项的显示值（观看时间 / 开播时间的 .ex-title-time__value） */
function valueOf(env, which) {
    const node = env.api.node();
    if (!node) return null;
    const value = node.querySelector('[data-title-time="' + which + '"] .ex-title-time__value');
    return value ? String(value.textContent) : null;
}

function textOf(env) {
    const node = env.api.node();
    return node ? String(node.textContent) : "";
}

async function testPlacement() {
    console.log("=== ① 位置：紧跟在 #copy-real-live 之后，同父节点、带 Title-blockInline ===");
    const env = makeEnv();
    env.api.init();

    const anchor = env.win.document.getElementById("copy-real-live");
    const node = env.api.node();
    assert.ok(anchor, "用例前提：标题栏里必须有 #copy-real-live");
    assert.ok(node, "观看时间 / 开播时间节点必须被插入");
    assert.strictEqual(node.parentNode, anchor.parentNode, "必须与 #copy-real-live 同一父节点");
    assert.strictEqual(anchor.nextElementSibling, node, "必须是 #copy-real-live 紧邻的下一个兄弟节点");
    assert.ok(node.className.indexOf("ex-title-time") !== -1, "class 必须含 ex-title-time，实际 " + node.className);
    assert.ok(node.className.indexOf("Title-blockInline") !== -1, "必须带 Title-blockInline 沿用标题栏排版，实际 " + node.className);
    assert.strictEqual(env.nodeCount(), 1, "只允许插入一份，实际 " + env.nodeCount());

    assert.strictEqual(valueOf(env, "watch"), "—", "初始观看时间必须是占位符「—」");
    assert.strictEqual(valueOf(env, "start"), "—", "初始开播时间必须是占位符「—」");
    const text = textOf(env);
    assert.ok(text.indexOf("观看时间") !== -1, "必须有「观看时间」前缀，实际 " + JSON.stringify(text));
    assert.ok(text.indexOf("开播时间") !== -1, "必须有「开播时间」前缀，实际 " + JSON.stringify(text));
    const title = String(node.title);
    assert.ok(title.indexOf("观看时间") !== -1 && title.indexOf("今日累计") !== -1 && title.indexOf("需登录") !== -1,
        "悬停必须说明观看时间的口径（今日累计 / 官方接口 / 需登录），实际 " + JSON.stringify(title));
    assert.ok(title.indexOf("开播时间") !== -1, "悬停必须含开播时间说明，实际 " + JSON.stringify(title));
    assert.deepStrictEqual(env.intervals, [150000], "插入成功后必须挂一份 150 秒刷新表，实际 " + JSON.stringify(env.intervals));

    console.log("✓ ① 通过: 位置紧邻锚点、初始占位、悬停口径齐全、刷新表已挂");
    env.dom.window.close();
}

async function testData() {
    console.log("=== ② 数据口径：观看时间 ← fsjk / 开播时间 ← h5room（与搬走前一致） ===");
    const env = makeEnv();
    env.api.init();
    await wait(20);

    assert.ok(
        env.requests.some(function (u) { return u.indexOf("https://www.douyu.com/swf_api/h5room/9999") !== -1; }),
        "必须按 rid 请求 h5room 取开播时间，实际 " + JSON.stringify(env.requests)
    );
    assert.ok(
        env.requests.some(function (u) { return u.indexOf("https://www.douyu.com/japi/interactnc/web/fsjk/getCardTaskInfo?rid=9999") !== -1; }),
        "必须按 rid 请求 fsjk 取今日观看时长，实际 " + JSON.stringify(env.requests)
    );

    assert.strictEqual(valueOf(env, "watch"), "1小时2分5秒", "3725 秒必须格式化 1小时2分5秒，实际 " + JSON.stringify(valueOf(env, "watch")));
    assert.strictEqual(valueOf(env, "start"), "10-27 18:30", "开播时间必须写成 月-日 时:分，实际 " + JSON.stringify(valueOf(env, "start")));
    const text = textOf(env);
    assert.ok(text.indexOf("1小时2分5秒") !== -1, "界面文本必须出现观看时长，实际 " + JSON.stringify(text));
    assert.ok(text.indexOf("10-27 18:30") !== -1, "界面文本必须出现开播时间，实际 " + JSON.stringify(text));

    const node = env.api.node();
    assert.ok(String(node.title).indexOf("2026-10-27 18:30") !== -1,
        "悬停必须给出完整开播时间，实际 " + JSON.stringify(node.title));
    const startItem = node.querySelector('[data-title-time="start"]');
    assert.ok(String(startItem.title).indexOf("2026-10-27 18:30") !== -1,
        "开播时间那一项自己的悬停也要给完整时间，实际 " + JSON.stringify(startItem.title));

    console.log("✓ ② 通过: 两项都取自官方接口，短格式在栏里、完整时间在悬停里");
    env.dom.window.close();
}

async function testHonestPlaceholders() {
    console.log("=== ③ 取不到就写「—」：未登录 / 未开播 / 请求失败都不编数字 ===");

    // 未登录：fsjk 返回 error != 0（0 才是登录且取到）
    {
        const env = makeEnv({ todayWatch: { error: 1000 } });
        env.api.init();
        await wait(20);
        assert.strictEqual(valueOf(env, "watch"), "—", "未登录时观看时间必须写「—」，实际 " + JSON.stringify(valueOf(env, "watch")));
        assert.strictEqual(valueOf(env, "start"), "10-27 18:30", "未登录不影响开播时间，实际 " + JSON.stringify(valueOf(env, "start")));
        console.log("  - 未登录 → 观看时间 —");
        env.dom.window.close();
    }

    // 未开播：h5room show_status = 2
    {
        const env = makeEnv({ showInfo: { error: 0, data: { show_time: SHOW_TIME, show_status: 2 } } });
        env.api.init();
        await wait(20);
        assert.strictEqual(valueOf(env, "start"), "未开播", "未开播时必须直说，实际 " + JSON.stringify(valueOf(env, "start")));
        assert.strictEqual(valueOf(env, "watch"), "1小时2分5秒", "未开播不影响观看时长，实际 " + JSON.stringify(valueOf(env, "watch")));
        console.log("  - 未开播 → 开播时间 未开播");
        env.dom.window.close();
    }

    // 两个请求全挂：界面停在占位符，且不得刷告警（150 秒一次会把 console 打满）
    {
        const env = makeEnv({ fail: true });
        env.api.init();
        await wait(20);
        assert.strictEqual(valueOf(env, "watch"), "—", "请求失败时观看时间必须停在「—」，实际 " + JSON.stringify(valueOf(env, "watch")));
        assert.strictEqual(valueOf(env, "start"), "—", "请求失败时开播时间必须停在「—」，实际 " + JSON.stringify(valueOf(env, "start")));
        assert.deepStrictEqual(env.warnings, [], "失败不得刷告警，实际 " + JSON.stringify(env.warnings));
        assert.strictEqual(env.api.state().watchOk, false, "失败时不得标记为已取到（否则界面会拿 0 秒冒充）");
        console.log("  - 请求失败 → 双 —，无告警");
        env.dom.window.close();
    }

    console.log("✓ ③ 通过: 三条失败路径都写占位符，没有一条编数字");
}

async function testRefreshIdempotent() {
    console.log("=== ④ 重复 init 不叠表、不插两份：150 秒刷新表只有一份 ===");
    const env = makeEnv();
    env.api.init();
    await wait(20);
    env.api.init();
    env.api.init();
    await wait(20);

    assert.deepStrictEqual(env.intervals, [150000], "重复 init 不得再挂刷新表，实际 " + JSON.stringify(env.intervals));
    assert.strictEqual(env.nodeCount(), 1, "重复 init 不得插出第二份，实际 " + env.nodeCount());
    assert.strictEqual(valueOf(env, "watch"), "1小时2分5秒", "重复 init 后数据仍要正常显示");
    assert.strictEqual(env.api.state().watchOk, true, "重复 init 不得把已取到的状态清空");

    console.log("✓ ④ 通过: 定时器与节点都幂等");
    env.dom.window.close();
}

async function testMissingAnchor() {
    console.log("=== ⑤ 标题栏还没渲染：有上限等待，不抛错、不提前挂表 ===");

    // a) 有 ExGuard_pollFor 时走它：500ms × 20 次，命中才插入 + 挂表
    const noAnchor = makeEnv({ html: '<div class="Title"><div class="Title-col"><span class="Title-row-text">标题</span></div></div>' });
    assert.doesNotThrow(function () { noAnchor.api.init(); }, "没有 #copy-real-live 时初始化不得抛错");
    assert.strictEqual(noAnchor.polls.length, 1, "必须交给 ExGuard_pollFor 做有上限等待");
    assert.strictEqual(noAnchor.polls[0].cfg.intervalMs, 500, "轮询间隔必须是 500ms，实际 " + noAnchor.polls[0].cfg.intervalMs);
    assert.strictEqual(noAnchor.polls[0].cfg.maxTries, 20, "轮询上限必须是 20 次，实际 " + noAnchor.polls[0].cfg.maxTries);
    assert.ok(typeof noAnchor.polls[0].cfg.tag === "string" && noAnchor.polls[0].cfg.tag.length > 0, "轮询必须带 tag（放弃时要留痕）");
    assert.strictEqual(noAnchor.api.node(), null, "锚点不在时不得凭空插节点");
    assert.deepStrictEqual(noAnchor.intervals, [], "节点没插上之前不得挂 150 秒刷新表");
    assert.strictEqual(noAnchor.polls[0].findFn(), null, "findFn 在锚点缺失时应返回 null");

    noAnchor.api.init();
    assert.strictEqual(noAnchor.polls.length, 1, "等待期间重复 init 不得叠出第二条轮询");

    // 模拟标题栏晚渲染：补上 #copy-real-live，让轮询命中
    const col = noAnchor.win.document.querySelector(".Title-col");
    const lateAnchor = noAnchor.win.document.createElement("div");
    lateAnchor.className = "Title-blockInline";
    lateAnchor.id = "copy-real-live";
    col.appendChild(lateAnchor);
    noAnchor.polls[0].onFound();
    assert.ok(noAnchor.api.node(), "轮询命中后必须插入节点");
    assert.strictEqual(lateAnchor.nextElementSibling, noAnchor.api.node(), "命中后同样必须紧邻 #copy-real-live");
    assert.deepStrictEqual(noAnchor.intervals, [150000], "插入成功后才允许挂刷新表，实际 " + JSON.stringify(noAnchor.intervals));
    noAnchor.dom.window.close();

    // b) 没有 ExGuard_pollFor 时的等价兜底：同样 20 次 × 500ms，等不到留一条日志
    const fallback = makeEnv({ html: '<div class="Title"></div>', noPoll: true });
    assert.doesNotThrow(function () { fallback.api.init(); }, "ExGuard 缺失时初始化不得抛错");
    const pollTimers = function () { return fallback.timers.filter(function (t) { return t.ms === 500; }); };
    assert.strictEqual(pollTimers().length, 1, "兜底轮询必须挂在 500ms 上");
    let cursor = 0;
    while (cursor < pollTimers().length && cursor < 100) {
        const timer = pollTimers()[cursor++];
        assert.doesNotThrow(function () { timer.fn(); }, "兜底轮询的每一拍都不得抛错");
    }
    // 首拍是同步的（init 内直接跑一次），之后每一拍再排下一拍：20 次尝试 = 首拍 + 19 个定时器
    assert.strictEqual(cursor, 19, "兜底轮询必须正好跑满 20 次尝试（首拍 + 19 个 500ms 定时器），实际 " + cursor);
    assert.strictEqual(pollTimers().length, 19, "兜底轮询不得再排第 21 拍（有上限），实际 " + pollTimers().length);
    assert.strictEqual(fallback.api.node(), null, "等不到锚点不得凭空插节点");
    assert.deepStrictEqual(fallback.intervals, [], "等不到锚点不得挂刷新表");
    assert.strictEqual(fallback.warnings.length, 1, "等不到锚点必须留一条自证日志，实际 " + JSON.stringify(fallback.warnings));
    assert.ok(fallback.warnings[0].indexOf("已放弃") !== -1, "日志必须说明已放弃，实际 " + JSON.stringify(fallback.warnings));

    // 放弃之后再来一次初始化必须能重新等：斗鱼是单页应用，换房间/换版式会再走一遍 init，
    // 卡死在第一轮的等待会让功能永久缺席
    fallback.api.init();
    assert.strictEqual(pollTimers().length, 20, "放弃之后再次 init 必须能重新起一条有上限的轮询，实际 " + pollTimers().length);
    assert.strictEqual(fallback.warnings.length, 1, "重新等待期间不得凭空多刷告警，实际 " + JSON.stringify(fallback.warnings));

    console.log("✓ ⑤ 通过: 有上限等待、命中才挂表、等不到只留一条日志");
    fallback.dom.window.close();
}

(async function main() {
    await testPlacement();
    await testData();
    await testHonestPlaceholders();
    await testRefreshIdempotent();
    await testMissingAnchor();
    console.log("=== 标题栏「观看时间 / 开播时间」5 组场景全部通过 ===");
})().catch(function (e) {
    console.error("测试失败:", e && e.stack ? e.stack : e);
    process.exit(1);
});
