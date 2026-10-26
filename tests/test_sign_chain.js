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

/**
 * 签到链路 P0 批回归（audit-wave2 P0-1 / P0-2 / P0-3 + 同链 P1-2 / P1-3 / P1-4 / P1-7）。
 *
 * 钉住的四件事：
 *  ① 鱼吧三个请求（分页 / 补签详情 / 补签）失败或超时都必须 settle —— 旧实现只有 onload，await 永挂；
 *  ② 鱼吧「签到失败」重试要有真正的计次上限 —— 旧实现计数只在成功分支自增，上限形同虚设；
 *  ③ 汇总只许出现一次，且迟到回调不许再弹 —— 旧实现把计数置 null，null == null 恒真；
 *  ④ 客户端签到不再可能把「开始签到」按钮永久按住 —— 旧实现没有 timeout。
 *
 * 复现修复前的红灯：SIGNCHAIN_SRC_DIR 指向 HEAD 快照即可。
 */
const SRC_DIR = process.env.SIGNCHAIN_SRC_DIR || path.join(__dirname, "..");
function readSrc(rel) {
    const text = fs.readFileSync(path.join(SRC_DIR, rel), "utf8");
    assert.ok(text.length > 0, "源码读取为空: " + rel);
    return text;
}

const EXGUARD_SRC = readSrc("src/require/ExGuard/ExGuard.js");
const YUBA_SRC = readSrc("src/packages/Sign/Sign_Yuba.js");
const SIGN_SRC = readSrc("src/packages/Sign/Sign.js");
const ROOM_SRC = readSrc("src/packages/Sign/Sign_Room.js");
const FANS_SRC = readSrc("src/packages/Sign/Sign_FansTree.js");
const STAR_SRC = readSrc("src/packages/Sign/Sign_StarDiscover.js");

/**
 * 通用沙箱：window / document / localStorage / console / setTimeout / clearTimeout 自动注入，
 * 其余全局按 extraNames 顺序给值。ExGuard 永远先拼进去（被测代码直接调 ExGuard_xhr 等）。
 */
function makeSandbox(sources, extraNames, extraValues, exposeExpr, opts) {
    opts = opts || {};
    const dom = new JSDOM("<!DOCTYPE html><html><body></body></html>", { url: "https://www.douyu.com/9999" });
    const win = dom.window;
    const warnings = [];
    const quietConsole = {
        log: function () {},
        warn: function () { warnings.push(Array.prototype.join.call(arguments, " ")); },
        error: function () {}
    };
    const names = ["window", "document", "localStorage", "console", "setTimeout", "clearTimeout"].concat(extraNames);
    assert.strictEqual(names.length, 6 + extraValues.length, "沙箱入参名字与取值数量不一致");
    const factory = new Function(names.join(","), EXGUARD_SRC + "\n" + sources.join("\n") + "\nreturn (" + exposeExpr + ");");
    const setT = opts.setTimeout || win.setTimeout.bind(win);
    const clrT = opts.clearTimeout || win.clearTimeout.bind(win);
    const api = factory.apply(null, [win, win.document, win.localStorage, quietConsole, setT, clrT].concat(extraValues));
    return { dom, win, api, warnings };
}

function tick() {
    return new Promise(function (resolve) { setTimeout(resolve, 0); });
}

function makeGm(requests) {
    return function (req) { requests.push(req); };
}

function byUrl(requests, part) {
    return requests.filter(function (r) { return String(r.url || "").indexOf(part) !== -1; });
}

/* ============ ① 鱼吧请求失败/超时都必须 settle ============ */

async function testYubaRequestsSettle() {
    console.log("=== ① 鱼吧分页/补签请求：onerror 与 ontimeout 都必须 resolve(null) ===");
    const messages = [];
    const requests = [];
    const env = makeSandbox([YUBA_SRC],
        ["GM_xmlhttpRequest", "showMessage", "sleep", "dyToken"],
        [makeGm(requests), function (m) { messages.push(String(m)); }, function () { return Promise.resolve(); }, "TOKEN"],
        "({ getYubaPage: getYubaPage, signSupplementary: signSupplementary, signYubaList: signYubaList })");

    const p1 = env.api.getYubaPage(1);
    assert.strictEqual(requests.length, 1, "分页请求必须发出");
    assert.strictEqual(typeof requests[0].onerror, "function", "分页请求必须注册 onerror（旧实现只有 onload，接口一挂就永挂）");
    assert.strictEqual(typeof requests[0].ontimeout, "function", "分页请求必须注册 ontimeout");
    assert.ok(Number(requests[0].timeout) > 0, "分页请求必须带 timeout");
    requests[0].onerror({ message: "net::ERR" });
    assert.strictEqual(await p1, null, "onerror 必须 settle 成 null");

    const p2 = env.api.getYubaPage(1);
    requests[1].ontimeout();
    assert.strictEqual(await p2, null, "ontimeout 必须 settle 成 null");

    const p3 = env.api.signSupplementary("1");
    const supReq = requests[requests.length - 1];
    assert.strictEqual(typeof supReq.onerror, "function", "补签请求必须注册 onerror");
    supReq.onerror({ message: "x" });
    assert.strictEqual(await p3, null, "补签失败也必须 settle");
    env.dom.window.close();
    console.log("✓ ① 通过: 三处请求失败/超时全部落地，无悬挂");
}

/* ============ ② 列表拉取失败：给提示、不发签到请求 ============ */

async function testYubaListFailure() {
    console.log("=== ② 鱼吧列表拉取失败：必须提示并且不再往下发签到 ===");
    const messages = [];
    const requests = [];
    const env = makeSandbox([YUBA_SRC],
        ["GM_xmlhttpRequest", "showMessage", "sleep", "dyToken"],
        [makeGm(requests), function (m) { messages.push(String(m)); }, function () { return Promise.resolve(); }, "TOKEN"],
        "({ signYubaList: signYubaList })");

    const p = env.api.signYubaList();
    assert.strictEqual(requests.length, 1);
    requests[0].onerror({ message: "blocked" });
    const summary = await p;
    assert.ok(messages.some(function (m) { return m.indexOf("获取关注鱼吧列表失败") !== -1; }), "列表失败必须提示，实际 " + JSON.stringify(messages));
    assert.strictEqual(summary.listFailed, true, "列表失败必须标记 listFailed（供一键签到汇总）");
    assert.strictEqual(summary.failed, 1, "列表失败要计一次失败");
    assert.strictEqual(summary.total, 0, "没有鱼吧就没有待签数");
    assert.strictEqual(requests.length, 1, "列表失败后不得再发签到请求");
    env.dom.window.close();
    console.log("✓ ② 通过: 失败有提示、不空转");
}
/* ============ ③ 汇总只出现一次；迟到回调无副作用 ============ */

async function testYubaSummaryOnce() {
    console.log("=== ③ 鱼吧汇总只出现一次；迟到回调不许再弹 ===");
    const messages = [];
    const requests = [];
    const env = makeSandbox([YUBA_SRC],
        ["GM_xmlhttpRequest", "showMessage", "sleep", "dyToken"],
        [makeGm(requests), function (m) { messages.push(String(m)); }, function () { return Promise.resolve(); }, "TOKEN"],
        "({ signYubaList: signYubaList, getRun: function () { return signYubaRun; } })");

    const p = env.api.signYubaList();
    requests[0].onload({ response: { data: { list: [{ group_id: "1" }, { group_id: "2" }], count_page: 1 } } });
    // signYubaList 现在会等整批签完才 resolve：这里先只让列表回调落地，再手动喂签到响应
    await tick();

    assert.strictEqual(byUrl(requests, "fastSign").length, 1, "每次批量签到只许打一条极速签到（旧实现 Sign.js 还会再打一条）");
    const signs = byUrl(requests, "topic/sign");
    assert.strictEqual(signs.length, 2, "两个鱼吧各一条签到请求，实际 " + signs.length);

    // 补签请求是每个鱼吧各一条：必须逐条结算，否则信号回调会停在 await 上
    function drainSupplements() {
        byUrl(requests, "supplement").forEach(function (r) {
            if (r.__settled) return;
            r.__settled = true;
            r.onerror({ message: "x" });
        });
    }

    signs[0].onload({ response: { message: "" } });
    await tick();
    const sup = byUrl(requests, "supplement");
    assert.ok(sup.length >= 1, "签成功后会尝试补签");
    drainSupplements();
    await tick();
    signs[1].onload({ response: { message: "今日已签到" } });
    await tick();
    drainSupplements();
    await tick();

    function summaries() {
        return messages.filter(function (m) { return m.indexOf("鱼吧") !== -1 && m.indexOf("签到完成") !== -1; });
    }
    assert.strictEqual(summaries().length, 1, "汇总必须且只能出现一次，实际 " + JSON.stringify(messages));
    assert.ok(summaries()[0].indexOf("1个鱼吧签到完成") !== -1, "只算了 1 个成功，实际 " + summaries()[0]);

    // 迟到回调：旧实现把计数置 null，null == null 恒真 → 会再弹一次汇总
    signs[0].onload({ response: { message: "" } });
    await tick();
    assert.strictEqual(summaries().length, 1, "迟到回调不得再弹一次汇总，实际 " + JSON.stringify(messages));
    const summary = await p;
    assert.strictEqual(summary.total, 2, "批次结果要带上总数，实际 " + JSON.stringify(summary));
    assert.strictEqual(summary.signed, 1, "只算了 1 个成功，实际 " + JSON.stringify(summary));
    env.dom.window.close();
    console.log("✓ ③ 通过: 汇总一次、迟到回调无副作用");
}

/* ============ ④ 「签到失败」重试封顶 ============ */

async function testYubaRetryCap() {
    console.log("=== ④ 「签到失败」重试必须封顶（旧实现 2 秒一次无限重试） ===");
    const messages = [];
    const requests = [];
    const env = makeSandbox([YUBA_SRC],
        ["GM_xmlhttpRequest", "showMessage", "sleep", "dyToken"],
        [makeGm(requests), function (m) { messages.push(String(m)); }, function () { return Promise.resolve(); }, "TOKEN"],
        "({ signYubaList: signYubaList })");

    const p = env.api.signYubaList();
    requests[0].onload({ response: { data: { list: [{ group_id: "77" }], count_page: 1 } } });
    await tick();

    let handled = 0;
    for (let i = 0; i < 40; i++) {
        const signs = byUrl(requests, "topic/sign");
        if (handled < signs.length) {
            signs[handled++].onload({ response: { message: "签到失败" } });
            await tick();
            continue;
        }
        await tick();
        if (env.warnings.some(function (w) { return w.indexOf("连续") !== -1; })) break;
    }

    const signs = byUrl(requests, "topic/sign");
    assert.ok(signs.length >= 2, "至少要重试过一次，实际 " + signs.length);
    assert.ok(signs.length <= 12, "重试必须封顶（旧实现无限），实际 " + signs.length);
    assert.ok(env.warnings.some(function (w) { return w.indexOf("连续") !== -1; }), "放弃时必须留痕，实际 " + JSON.stringify(env.warnings));
    assert.ok(messages.some(function (m) { return m.indexOf("均未签成功") !== -1; }), "放弃后仍要给出汇总，实际 " + JSON.stringify(messages));
    env.dom.window.close();
    console.log("✓ ④ 通过: 重试 " + signs.length + " 次后放弃并汇总");
}

/* ============ ⑤ 客户端签到不再可能永挂 ============ */

async function testClientSignTimeout() {
    console.log("=== ⑤ 客户端签到：GM 一声不吭也必须走完（按钮不会被永久按住） ===");
    const logs = [];
    const longTimers = [];
    const requests = [];
    const env = makeSandbox([SIGN_SRC],
        ["GM_xmlhttpRequest", "showMessage", "dyToken", "getToken", "sleep"],
        [makeGm(requests), function () {}, "TOKEN", function () { return "TOKEN"; }, function () { return Promise.resolve(); }],
        "({ engine: executeSignEngine })",
        {
            setTimeout: function (fn, ms) {
                if (Number(ms) >= 5000) { longTimers.push(fn); return -1; }
                return global.setTimeout(fn, 0);
            },
            clearTimeout: function (id) { global.clearTimeout(id); }
        });

    const opts = { room: false, client: true, yuba: false, fanshome: false, stardiscover: false, points: false, watchpoints: false };
    const done = env.api.engine(opts, function (m) { logs.push(String(m)); });
    await tick();
    assert.strictEqual(requests.length, 1, "应当只发出客户端签到一条请求，实际 " + requests.length);
    assert.ok(Number(requests[0].timeout) > 0, "请求必须带 GM 自己的 timeout");
    assert.strictEqual(longTimers.length, 1, "必须再挂一层本地硬上限（ExGuard_withTimeout），实际 " + longTimers.length);

    longTimers[0]();   // 模拟 16 秒到点：旧实现这里会永远不返回
    const summary = await done;
    assert.ok(logs.some(function (m) { return m.indexOf("请求失败或超时") !== -1; }), "超时必须如实提示，实际 " + JSON.stringify(logs));
    assert.ok(logs.some(function (m) { return m.indexOf("签到结束") !== -1 || m.indexOf("执行完毕") !== -1; }), "引擎必须走到底（对应 finally 里的按钮复位），实际 " + JSON.stringify(logs));
    assert.strictEqual(summary.fail, 1, "超时必须计入失败数，实际 " + JSON.stringify(summary));
    env.dom.window.close();
    console.log("✓ ⑤ 通过: 无响应也能落地并提示");
}

/* ============ ⑥ 房间签到：真实成败 + 探测失败提示 ============ */

async function testRoomSignSummary() {
    console.log("=== ⑥ 房间签到：汇总按真实成败；探测页失败要提示 ===");
    const messages = [];
    const gmReqs = [];
    function okJson(payload) {
        return Promise.resolve({ json: function () { return Promise.resolve(payload); } });
    }
    const fetchGood = function (url) {
        if (String(url).indexOf("page=1428") !== -1) return okJson({ data: { pageCount: 1, total: 2 } });
        return okJson({ data: { list: [{ room_id: "111", show_status: "1" }, { room_id: "222", show_status: "1" }] } });
    };
    const env = makeSandbox([ROOM_SRC], ["fetch", "GM_xmlhttpRequest", "showMessage", "dyToken"],
        [fetchGood, makeGm(gmReqs), function (m) { messages.push(String(m)); }, "TOKEN"],
        "({ all: signAllRoom })");
    env.api.all(true);
    await tick();
    await tick();
    assert.strictEqual(gmReqs.length, 2, "两个房间各一条 checkIn，实际 " + gmReqs.length);
    gmReqs[0].onload({ response: { error: 0 } });
    gmReqs[1].onload({ response: { error: 1 } });
    await tick();
    assert.ok(messages.some(function (m) { return m.indexOf("成功 1 个，失败 1 个") !== -1; }), "汇总必须按真实成败，实际 " + JSON.stringify(messages));
    env.dom.window.close();

    // 探测页返回不含 data（未登录/风控）
    const messages2 = [];
    const env2 = makeSandbox([ROOM_SRC], ["fetch", "GM_xmlhttpRequest", "showMessage", "dyToken"],
        [function () { return okJson({}); }, makeGm([]), function (m) { messages2.push(String(m)); }, "TOKEN"],
        "({ all: signAllRoom })");
    env2.api.all(true);
    await tick();
    await tick();
    assert.ok(messages2.some(function (m) { return m.indexOf("获取关注房间列表失败") !== -1; }), "探测页异常必须提示，实际 " + JSON.stringify(messages2));
    env2.dom.window.close();
    console.log("✓ ⑥ 通过: 真实成败 + 探测失败提示");
}

/* ============ ⑦ 粉丝家园：单房间失败不拖垮整批 ============ */

async function testFansHomePartialFailure() {
    console.log("=== ⑦ 粉丝家园：一个房间失败不得让整批停掉 ===");
    const messages = [];
    const bodies = [];
    const fetchStub = function (url, init) {
        const body = (init && init.body) ? String(init.body) : "";
        bodies.push(body);
        if (/(^|&)rid=1$/.test(body)) return Promise.reject(new Error("net::ERR"));
        return Promise.resolve({ json: function () { return Promise.resolve({ error: 0 }); } });
    };
    const env = makeSandbox([FANS_SRC], ["fetch", "showMessage", "myFansBadgeList", "getCCN"],
        [fetchStub, function (m) { messages.push(String(m)); }, ["1", "2"], function () { return "CCN"; }],
        "({ run: initPkg_Sign_FansTree })");
    const res = await env.api.run();
    assert.strictEqual(bodies.length, 2, "两个房间都要尝试（旧实现第一个失败就整批停），实际 " + bodies.length);
    assert.deepStrictEqual(res, { ok: 1, fail: 1 }, "一个失败一个成功，实际 " + JSON.stringify(res));
    assert.ok(messages.some(function (m) { return m.indexOf("完成 1 个，失败 1 个") !== -1; }), "失败要有汇总提示，实际 " + JSON.stringify(messages));
    env.dom.window.close();
    console.log("✓ ⑦ 通过: 单房间异常不再拖垮整批");
}

/* ============ ⑧ 一键签到必须真的等到子任务结束 ============ */

async function testEngineAwaitsSubtasks() {
    console.log("=== ⑧ executeSignEngine：批次没签完就不许宣布「已完成」 ===");
    const messages = [];
    const requests = [];
    const env = makeSandbox([YUBA_SRC, SIGN_SRC],
        ["GM_xmlhttpRequest", "showMessage", "sleep", "dyToken", "getToken"],
        [makeGm(requests), function (m) { messages.push(String(m)); }, function () { return Promise.resolve(); }, "TOKEN", function () { return "TOKEN"; }],
        "({ engine: executeSignEngine })");

    let resolved = null;
    const opts = { yuba: true, client: false, room: false, fanshome: false, stardiscover: false, points: false, watchpoints: false };
    const p = env.api.engine(opts, function (m) { messages.push(String(m)); }).then(function (r) { resolved = r; return r; });

    await tick();
    requests[0].onload({ response: { data: { list: [{ group_id: "1" }], count_page: 1 } } });
    await tick();
    const signs = byUrl(requests, "topic/sign");
    assert.strictEqual(signs.length, 1, "应当发出一个鱼吧签到请求，实际 " + signs.length);
    assert.strictEqual(resolved, null, "鱼吧批次还没签完，引擎就不能结束（旧实现发完请求就报「已完成」）");

    signs[0].onload({ response: { message: "" } });
    await tick();
    byUrl(requests, "supplement").forEach(function (r) {
        if (r.__settled) return;
        r.__settled = true;
        r.onerror({ message: "x" });
    });
    await tick();
    await p;

    assert.ok(resolved, "批次结束后引擎必须返回汇总");
    assert.strictEqual(resolved.ok, 1, "成功 1 个，实际 " + JSON.stringify(resolved));
    assert.strictEqual(resolved.fail, 0, "不该有失败项，实际 " + JSON.stringify(resolved));
    assert.ok(messages.some(function (m) { return m.indexOf("所有已选签到任务执行完毕") !== -1; }), "全成功时才允许说「执行完毕」，实际 " + JSON.stringify(messages));
    env.dom.window.close();
    console.log("✓ ⑧ 通过: 引擎等到了真实批次结果");
}

/* ============ ⑨ 星推：诚实汇报 + 只取关自己关注过的 ============ */

function starRoutes(mode, calls) {
    return function (url, init) {
        const u = String(url);
        calls.push(u + " " + ((init && init.body) ? String(init.body) : ""));
        const json = function (payload) {
            return Promise.resolve({ json: function () { return Promise.resolve(payload); } });
        };
        if (u.indexOf("task/report") !== -1) return json({ error: 500, msg: "活动未开始" });
        if (u.indexOf("rank/info") !== -1) return json({ data: { rankItemList: [{ rid: "111" }] } });
        if (u.indexOf("task/list") !== -1) return json({ data: { taskList: [{ type: 4, curCompleteNum: 0 }] } });
        if (u.indexOf("follow/add") !== -1) return json(mode === "already" ? { error: 1, msg: "已关注" } : { error: 0 });
        if (u.indexOf("follow/rm") !== -1) return json({ error: -1, msg: "风控拦截" });
        if (u.indexOf("follow/list") !== -1) return json({ data: { list: [] } });
        if (u.indexOf("introduce") !== -1) return json({ data: { list: [] } });
        return json({});
    };
}

async function testStarDiscoverHonest() {
    console.log("=== ⑨ 星推任务：失败要说失败；取关失败进待办；已关注的不许取关 ===");

    // ① 关键步骤全失败 + 取关被风控
    const messages = [];
    const calls = [];
    const env = makeSandbox([STAR_SRC], ["fetch", "getDouyuCtn", "sleep", "showMessage", "rid"],
        [starRoutes("new", calls), function () { return Promise.resolve("CTN"); }, function () { return Promise.resolve(); },
         function (m) { messages.push(String(m)); }, "9999"],
        "({ run: executeStarDiscoverSign })");
    const res = (await env.api.run(function (m) { messages.push(String(m)); })) || {};

    // 先看文案：旧实现无论成败都宣布「已全部执行完毕」
    assert.ok(!messages.some(function (m) { return m.indexOf("已全部执行完毕") !== -1; }), "失败时不许宣布全部完成，实际 " + JSON.stringify(messages));
    assert.ok(messages.some(function (m) { return m.indexOf("未成功") !== -1; }), "失败要有明确措辞，实际 " + JSON.stringify(messages));
    assert.ok(res.fail > 0, "有失败步骤时 fail 必须 > 0，实际 " + JSON.stringify(res));

    const pending = JSON.parse(env.win.localStorage.getItem("ExSave_StarFollowPending") || "[]");
    assert.deepStrictEqual(pending, ["111"], "取关失败的主播必须留在待办清单，实际 " + JSON.stringify(pending));
    assert.ok(env.warnings.some(function (w) { return w.indexOf("待办") !== -1; }), "取关失败要留痕，实际 " + JSON.stringify(env.warnings));
    env.dom.window.close();

    // ② 白名单保护：add 返回「已关注」时绝不能出现在待办里，更不能发取关请求
    const messages2 = [];
    const calls2 = [];
    const env2 = makeSandbox([STAR_SRC], ["fetch", "getDouyuCtn", "sleep", "showMessage", "rid"],
        [starRoutes("already", calls2), function () { return Promise.resolve("CTN"); }, function () { return Promise.resolve(); },
         function (m) { messages2.push(String(m)); }, "9999"],
        "({ run: executeStarDiscoverSign })");
    await env2.api.run(function (m) { messages2.push(String(m)); });
    const rmCalls = calls2.filter(function (c) { return c.indexOf("follow/rm") !== -1; });
    assert.strictEqual(rmCalls.length, 0, "用户已关注的主播绝不能被取关，实际 " + JSON.stringify(rmCalls));
    const pending2 = JSON.parse(env2.win.localStorage.getItem("ExSave_StarFollowPending") || "[]");
    assert.deepStrictEqual(pending2, [], "已关注的主播不产生待办，实际 " + JSON.stringify(pending2));
    env2.dom.window.close();
    console.log("✓ ⑨ 通过: 诚实汇报 + 待办留痕 + 白名单保护");
}
// 只在复现红灯时用：SIGNCHAIN_ONLY=鱼吧 / 客户端 / 房间 / 粉丝家园 之类，可单独跑一组场景
const ONLY = process.env.SIGNCHAIN_ONLY || "";
const SCENARIOS = [
    ["鱼吧落地", testYubaRequestsSettle],
    ["列表失败", testYubaListFailure],
    ["汇总一次", testYubaSummaryOnce],
    ["重试封顶", testYubaRetryCap],
    ["客户端", testClientSignTimeout],
    ["房间", testRoomSignSummary],
    ["粉丝家园", testFansHomePartialFailure],
    ["引擎等待", testEngineAwaitsSubtasks],
    ["星推诚实", testStarDiscoverHonest]
];

(async function main() {
    let ran = 0;
    for (let i = 0; i < SCENARIOS.length; i++) {
        if (ONLY && SCENARIOS[i][0].indexOf(ONLY) === -1) continue;
        await SCENARIOS[i][1]();
        ran++;
    }
    assert.ok(ran > 0, "SIGNCHAIN_ONLY 没有匹配到任何场景: " + ONLY);
    console.log("=== 签到链路（P0 批 + P1 收尾）回归测试" + (ONLY ? "（仅 " + ONLY + "）" : "") + " 100% 通过 ===");
})().catch(function (e) {
    console.error("测试失败:", e && e.stack ? e.stack : e);
    process.exit(1);
});
