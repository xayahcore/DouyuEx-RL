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
 * P0-2 回归：弹幕派发链的「单点异常隔离」。
 *
 * 真实现场的因果链只有三步，每一步都必须钉住：
 *  ① 关键词回复里 `let result = regObj.exec(txt); if (result.length > 0)` ——
 *     正则不命中时 exec 返回 null，直接抛 TypeError（Reply.js:252-253 / Mute.js:298-299 旧行号）；
 *  ② LiveTool 的 ws 回调里十几个处理器是裸调的顺序调用，异常一抛，排在后面的
 *     贵宾数（RealAudience）、弹幕回执（BarrageSendCheck）、投票、谢礼物…… 全部不再执行；
 *  ③ Ex_WebSocket_UnLogin 的 onmessage 也没有 try/catch，异常还会顺带杀掉同一帧里的后续分包。
 * 所以这里不只测「不抛错」，还要测「一个处理器炸了，别人照跑」。
 *
 * 本测试挂载的是真实源码（LiveTool / Reply / Mute / BarrageLoop / BarragePanel），
 * 只有「由其它包提供的处理器」用记录桩补位，因为本测试不加载那些包的完整依赖链。
 * 需要复现修复前的红灯时，可以指向旧快照：
 *   LIVETOOL_SRC_DIR=/tmp/douyuex-prefix node tests/test_livetool_dispatch.js
 */
const SRC_DIR = process.env.LIVETOOL_SRC_DIR || path.join(__dirname, "..");
function readSrc(rel) {
    const full = path.join(SRC_DIR, rel);
    const text = fs.readFileSync(full, "utf8");
    assert.ok(text.length > 0, "源码读取为空: " + full);
    return text;
}

const LIVETOOL_SRC = readSrc("src/packages/LiveTool/LiveTool.js");
const REPLY_SRC = readSrc("src/packages/LiveTool/Reply/Reply.js");
const MUTE_SRC = readSrc("src/packages/LiveTool/Mute/Mute.js");
const LOOP_SRC = readSrc("src/packages/BarrageLoop/BarrageLoop.js");
const PANEL_SRC = readSrc("src/packages/BarragePanel/BarragePanel.js");

// getStrMiddle / getType 是整条链的解析底座：直接从真实 common.js 里切出函数体，
// 不用镜像实现，免得「测试里的解析和线上不一样」。
const COMMON_SRC = readSrc("src/common.js");
const G_START = COMMON_SRC.indexOf("function getStrMiddle(str, before, after) {");
assert.ok(G_START !== -1, "未能从 src/common.js 定位 getStrMiddle");
const G_END = COMMON_SRC.indexOf("\n}", G_START);
assert.ok(G_END !== -1, "未能从 src/common.js 定位 getStrMiddle 结尾");
const GET_STR_MIDDLE_SRC = COMMON_SRC.slice(G_START, G_END + 2);
assert.ok(
    GET_STR_MIDDLE_SRC.indexOf("return m ? m[1] : false;") !== -1,
    "getStrMiddle 抽取结果异常，可能是 common.js 结构变了"
);

// 斗鱼长连接的真实报文形态（只保留本测试用到的字段）
function chatmsg(txt, nick, uid) {
    return "type@=chatmsg/rid@=9999/uid@=" + (uid || "88888") + "/nn@=" + (nick || "路人甲") +
        "/txt@=" + txt + "/level@=12/";
}

/**
 * 派发沙箱：LiveTool + Reply + Mute 真实源码 + 其它处理器的记录桩。
 * 桩函数把名字推进 calls，用来断言「别人到底有没有跑」。
 */
const STUB_NAMES = [
    "initPkg_LiveTool_LiveNotice_Handle",
    "initPkg_LiveTool_Gift_Handle",
    "initPkg_LiveTool_Treasure_Handle",
    "initPkg_LiveTool_Enter_Handle",
    "initPkg_LiveTool_Vote_Handle",
    "initPkg_LiveTool_BarrageSpeed_Handle",
    "initPkg_LiveTool_RankList_Handle",
    "initPkg_LiveTool_BarrageSendCheck_Handle",
    "initPkg_RealAudience_Handle"
];
const STUBS = STUB_NAMES.map(function (name) {
    return "function " + name + "(ret) { ExTest_calls.push(" + JSON.stringify(name) + "); }";
}).join("\n");

function makeDispatchSandbox() {
    const dom = new JSDOM("<!DOCTYPE html><html><body></body></html>", {
        url: "https://www.douyu.com/9999"
    });
    const win = dom.window;
    const sent = [];
    const calls = [];
    const errors = [];
    const warnings = [];

    const quietConsole = {
        log: function () {},
        warn: function () { warnings.push(Array.prototype.join.call(arguments, " ")); },
        error: function () { errors.push(Array.prototype.join.call(arguments, " ")); }
    };

    const wsCbs = [];
    const factory = new Function(
        "window", "document", "localStorage", "console",
        "setTimeout", "clearTimeout", "getRandom",
        "rid", "my_uid", "sendBarrage", "showMessage", "showMessageWindow",
        "addMuteUser", "dateFormat", "ExTest_calls", "Ex_WebSocket_UnLogin",
        STUBS + "\n" + GET_STR_MIDDLE_SRC + "\n" + LIVETOOL_SRC + "\n" + REPLY_SRC + "\n" + MUTE_SRC + `
        return {
            handleReply: initPkg_LiveTool_Reply_Handle,
            handleMute: initPkg_LiveTool_Mute_Handle,
            dispatch: typeof LiveTool_dispatchBarrage === "function" ? LiveTool_dispatchBarrage : null,
            handlers: typeof LiveTool_barrageHandlers === "function" ? LiveTool_barrageHandlers : null,
            ruleHit: typeof LiveTool_keywordRuleHit === "function" ? LiveTool_keywordRuleHit : null,
            parseRule: typeof LiveTool_parseKeywordRule === "function" ? LiveTool_parseKeywordRule : null,
            setReply: function (on, list) { isReplyOn = on; replyWordList = list || {}; },
            setMute: function (on, list) { isMuteOn = on; muteWordList = list || {}; },
            getMuteIdList: function () { return muteIdList; },
            overrideReply: function (fn) { initPkg_LiveTool_Reply_Handle = fn; },
            overrideMute: function (fn) { initPkg_LiveTool_Mute_Handle = fn; },
            overrideRealAudience: function (fn) { initPkg_RealAudience_Handle = fn; },
            // 真实入口：initPkg_LiveTool_HandleFunc 里注册的 ws 回调
            startWs: function () { initPkg_LiveTool_HandleFunc(); }
        };
        `
    );

    const api = factory(
        win, win.document, win.localStorage, quietConsole,
        win.setTimeout, win.clearTimeout, function (min, max) { return max; },
        "9999", "99999999",
        function (text) { sent.push(text); },
        function () {},
        function () {},
        function () { return Promise.resolve({ msg: "添加成功" }); },
        function () { return "2026年10月26日00时00分00秒"; },
        calls,
        function (roomid, cb) { wsCbs.push(cb); }
    );

    return { dom, win, api, sent, calls, errors, warnings, wsCbs };
}

function waitTick() {
    return new Promise(function (resolve) { setTimeout(resolve, 0); });
}

/* ============================ ① 关键词回复：exec 返回 null ============================ */

function testReplyExecNull() {
    console.log("=== ① 关键词回复：正则不命中（exec 返回 null）不得抛错 ===");
    const { dom, api, sent } = makeDispatchSandbox();

    api.setReply(true, { "re(^抽奖$)=中奖": { reply: "恭喜<id>拿到<txt>" } });
    const text = chatmsg("今晚吃什么", "路人甲");

    // 旧实现：regObj.exec(txt) 为 null -> result.length 抛 TypeError
    assert.doesNotThrow(function () {
        api.handleReply(text);
    }, "正则不命中时关键词回复处理器抛异常（P0-2 根因：exec 返回 null 后仍取 .length）");
    assert.deepStrictEqual(sent, [], "没命中就不许发弹幕");

    // 命中时依然要正常发出去（回归保护：别为了不抛错把功能改废）
    api.setReply(true, { "re(^666$)=666": { reply: "恭喜<id>：<txt>" } });
    assert.doesNotThrow(function () {
        api.handleReply(chatmsg("666", "路人甲"));
    });
    assert.deepStrictEqual(sent, ["恭喜路人甲：666"], "命中规则的弹幕必须照旧发出，且占位符要被替换");

    // 普通词（非正则）的老规则不能被改坏
    api.setReply(true, { "抽奖": { reply: "已收到<id>的抽奖" } });
    api.handleReply(chatmsg("一起来抽奖吧", "阿伟"));
    assert.deepStrictEqual(sent[1], "已收到阿伟的抽奖", "普通词规则必须仍然按「包含即命中」工作");

    console.log("✓ ① 通过: 不命中不抛错、命中照发、普通词规则未回归");
    dom.window.close();
}

/* ============================ ② 关键词禁言：async 处理器同样判空 ============================ */

async function testMuteExecNull() {
    console.log("=== ② 关键词禁言：async 处理器不得因 exec 返回 null 产生 rejection ===");
    const { dom, api } = makeDispatchSandbox();

    api.setMute(true, { "re(^广告$)=广告": { count: "5", time: "10" } });

    // 旧实现是 async 函数，异常会变成一条无人接的 rejection
    await assert.doesNotReject(
        Promise.resolve().then(function () { return api.handleMute(chatmsg("正常聊天")); }),
        "关键词禁言处理器在正则不命中时抛错（async 处理器 = 一条 unhandled rejection）"
    );
    assert.deepStrictEqual(api.getMuteIdList(), {}, "没命中就不该往禁言计数里写任何东西");

    // 命中时计数照旧累加
    api.setMute(true, { "re(^广告$)=广告": { count: "5", time: "10" } });
    await api.handleMute(chatmsg("广告", "刷屏号"));
    const list = api.getMuteIdList();
    assert.ok(list["刷屏号"], "命中规则必须建立禁言计数（回归保护）");
    assert.strictEqual(String(list["刷屏号"].count), "1", "首次命中计数应为 1");

    console.log("✓ ② 通过: 不命中无 rejection、命中计数照旧");
    dom.window.close();
}

/* ============================ ③ 规则解析：坏正则与被改写的语法 ============================ */

function testRuleParsing() {
    console.log("=== ③ 规则解析：坏正则只算不命中，re(正则)=期望匹配 语法按新文案解析 ===");
    const { dom, api, warnings } = makeDispatchSandbox();

    assert.strictEqual(typeof api.ruleHit, "function", "缺少 LiveTool_keywordRuleHit（判空与解析的唯一入口）");
    assert.deepStrictEqual(
        api.parseRule("re(^\\d+$)=666"),
        { kind: "regex", source: "^\\d+$", expect: "666" },
        "re(正则)=期望匹配 的解析结果必须与面板文案一致"
    );
    assert.deepStrictEqual(
        api.parseRule("普通词"),
        { kind: "literal", word: "普通词" },
        "不含 re( 的规则必须按普通词解析"
    );

    // 用户把正则写坏（未闭合的方括号）时，构造 RegExp 会 SyntaxError —— 只能算不命中
    assert.doesNotThrow(function () {
        assert.strictEqual(api.ruleHit("re([)=x", "任意弹幕"), false);
    }, "非法正则规则必须被跳过，不允许把异常抛进派发链");
    assert.ok(
        warnings.some(function (w) { return w.indexOf("无效的正则关键词规则") !== -1; }),
        "非法正则必须留下 warn 线索，不能静默: " + JSON.stringify(warnings)
    );

    // 语法：re(正则)=期望匹配 —— 正则的首个匹配必须与「期望匹配」完全相等
    assert.strictEqual(api.ruleHit("re(^\\d+$)=666", "666"), true, "完全相等的匹配必须命中");
    assert.strictEqual(api.ruleHit("re(^\\d+$)=666", "6666"), false, "正则命中但期望值不等，不得算命中");
    assert.strictEqual(api.ruleHit("re(\\d+)=666", "编号666"), true, "未锚定的正则按「首个匹配」比较");
    assert.strictEqual(api.ruleHit("re(abc)", "abc"), false, "缺少「=期望匹配」的旧式半截规则视为无效，不命中");
    assert.strictEqual(api.ruleHit("普通词", "这里包含普通词哦"), true, "普通词规则按包含判断");
    assert.strictEqual(api.ruleHit("普通词", "这里没有"), false);

    // 期望值里带 "=" 时不能被 key.split("=") 截断
    assert.strictEqual(api.ruleHit("re(^a=b$)=a=b", "a=b"), true, "期望值含 = 时解析不得被截断");

    console.log("✓ ③ 通过: 坏正则安全跳过、语法语义与面板文案一致");
    dom.window.close();
}

/* ============================ ④ 派发链隔离：一个炸了，别人照跑 ============================ */

function testDispatchIsolation() {
    console.log("=== ④ 派发链隔离：关键词回复抛错，贵宾数/回执等后续处理器必须照常执行 ===");
    const { dom, api, calls, errors } = makeDispatchSandbox();

    assert.strictEqual(typeof api.dispatch, "function", "缺少 LiveTool_dispatchBarrage：派发链仍未做逐项隔离");
    assert.strictEqual(typeof api.handlers, "function", "缺少 LiveTool_barrageHandlers：派发表不可枚举");
    const names = api.handlers().map(function (h) { return h[0]; });
    ["关键词回复", "关键词禁言", "贵宾数", "弹幕回执"].forEach(function (n) {
        assert.ok(names.indexOf(n) !== -1, "派发表缺少处理器: " + n + "，实际 " + JSON.stringify(names));
    });

    // 模拟「关键词回复」炸掉（这是修复前的真实行为：exec 返回 null 抛 TypeError）
    api.overrideReply(function () {
        throw new TypeError("Cannot read properties of null (reading 'length')");
    });

    const failed = api.dispatch(chatmsg("随便一句"));

    assert.deepStrictEqual(failed, ["关键词回复"], "失败的处理器必须被如实记下来: " + JSON.stringify(failed));
    assert.ok(
        calls.indexOf("initPkg_RealAudience_Handle") !== -1,
        "贵宾数处理器必须照常执行（这正是 P0-2 被掐掉的后果）: " + JSON.stringify(calls)
    );
    assert.ok(
        calls.indexOf("initPkg_LiveTool_BarrageSendCheck_Handle") !== -1,
        "弹幕回执处理器必须照常执行: " + JSON.stringify(calls)
    );
    assert.strictEqual(
        calls.length,
        STUB_NAMES.length,
        "其余处理器一个都不能少: 期望 " + STUB_NAMES.length + " 个，实际 " + JSON.stringify(calls)
    );
    assert.ok(
        errors.some(function (e) { return e.indexOf("关键词回复") !== -1; }),
        "处理器异常必须留 error 线索（自证信息），实际 " + JSON.stringify(errors)
    );

    console.log("✓ ④ 通过: 单个处理器抛错只记日志，其余 " + STUB_NAMES.length + " 个照跑");
    dom.window.close();
}

/* ============================ ⑤ 原始缺陷端到端：不命中也不许中断后续 ============================ */

function testOriginalBugEndToEnd() {
    console.log("=== ⑤ 端到端：不命中正则的弹幕走一遍完整派发，后面的人一个都不能停 ===");
    const { dom, api, calls, sent, errors } = makeDispatchSandbox();

    // 真实的关键词回复规则：正则永远不命中这条弹幕
    api.setReply(true, { "re(^抽奖$)=中奖": { reply: "恭喜<id>" } });

    const failed = api.dispatch(chatmsg("今晚吃什么", "路人甲"));

    assert.deepStrictEqual(failed, [], "不命中正则不该产生任何失败（修复前这里会 TypeError）: " + JSON.stringify(failed));
    assert.deepStrictEqual(sent, [], "不命中的弹幕不该被回复");
    assert.deepStrictEqual(errors, [], "不命中正则不该留下 error: " + JSON.stringify(errors));
    assert.strictEqual(calls.length, STUB_NAMES.length, "后续处理器必须全部执行: " + JSON.stringify(calls));

    console.log("✓ ⑤ 通过: 一条不命中正则的弹幕不再打崩整条链");
    dom.window.close();
}

/* ==================== ⑤B 真实入口：ws 回调本身就是派发链的起点 ==================== */

function testRealWebSocketEntry() {
    console.log("=== ⑤B 真实入口：ws 回调收到不命中正则的弹幕，不得抛错也不得中断后续处理器 ===");
    const { dom, api, calls, sent, wsCbs } = makeDispatchSandbox();

    // 走真实注册路径：initPkg_LiveTool_HandleFunc 里 new Ex_WebSocket_UnLogin(rid, cb)
    api.startWs();
    assert.strictEqual(wsCbs.length, 1, "ws 回调必须完成注册");

    api.setReply(true, { "re(^抽奖$)=中奖": { reply: "恭喜<id>" } });

    // 修复前：异常从 Reply 处理器一路冒到 ws 回调外，onmessage 也没有 try/catch
    assert.doesNotThrow(function () {
        wsCbs[0](chatmsg("今晚吃什么", "路人甲"));
    }, "ws 回调入口不得抛错（旧实现在这里抛 TypeError 并中断同帧后续分包）");

    assert.deepStrictEqual(sent, [], "不命中的弹幕不该被回复");
    assert.strictEqual(
        calls.length,
        STUB_NAMES.length,
        "贵宾数/回执等后续处理器必须全部执行（这正是 P0-2 被掐掉的部分）: " + JSON.stringify(calls)
    );

    console.log("✓ ⑤B 通过: 从 ws 入口进来的不命中弹幕不再打崩派发链");
    dom.window.close();
}

/* ============================ ⑥ async 处理器的 rejection 也要兜住 ============================ */

async function testAsyncHandlerRejection() {
    console.log("=== ⑥ async 处理器 reject 不得变成无人接的异常 ===");
    const { dom, api, calls, errors } = makeDispatchSandbox();

    api.overrideMute(function () {
        return Promise.reject(new Error("禁言接口炸了"));
    });

    const failed = api.dispatch(chatmsg("随便一句"));
    await waitTick();

    assert.deepStrictEqual(failed, [], "async 处理器是 reject 而不是同步抛错，不该记进 failed 数组");
    assert.ok(
        errors.some(function (e) { return e.indexOf("关键词禁言") !== -1 && e.indexOf("禁言接口炸了") !== -1; }),
        "async 处理器的 reject 必须被接住并留 error 线索: " + JSON.stringify(errors)
    );
    assert.strictEqual(calls.length, STUB_NAMES.length, "async 处理器 reject 后其余处理器仍须跑完");

    console.log("✓ ⑥ 通过: async rejection 被捕获，派发链不受影响");
    dom.window.close();
}

/* ============================ ⑦ BarrageLoop：一次失败不再永久停 ============================ */

function makeTiangouSandbox() {
    const dom = new JSDOM(`<!DOCTYPE html><html><body>
        <div class="bloop">
            <input type="checkbox" id="bloop__checkbox_tiangou" checked>
            <input type="checkbox" id="bloop__checkbox_random">
            <input id="bloop__text_speed1" value="2000">
            <input id="bloop__text_speed2" value="2000">
            <input id="bloop__text_stoptime" value="5">
            <textarea id="bloop__textarea"></textarea>
        </div>
        <div class="ChatSend-txt"></div>
        <div class="ChatSend-button"></div>
    </body></html>`, { url: "https://www.douyu.com/9999" });
    const win = dom.window;

    const timers = [];
    const warnings = [];
    const requests = [];

    // GM_xmlhttpRequest 打桩：用例决定这次请求怎么结束，函数本身只负责发出去
    const gm = function (req) { requests.push(req); };

    const factory = new Function(
        "window", "document", "localStorage", "console",
        "setTimeout", "clearTimeout", "getRandom", "GM_xmlhttpRequest",
        "rid", "my_uid", "showMessage", "showMessageWindow",
        LOOP_SRC + `
        return {
            doLoop: doLoopBarrage,
            tiangou: getBarrageTxt_Tiangou,
            setChangeColor: function (v) { isChangeColor = v; },
            setArr: function (arr) { barrageArr = arr; barrageLength = arr.length - 1; },
            sentHint: function () { return document.getElementsByClassName("ChatSend-txt")[0].innerText; }
        };
        `
    );

    const api = factory(
        win, win.document, win.localStorage,
        { log: function () {}, warn: function () { warnings.push(Array.prototype.join.call(arguments, " ")); }, error: function () {} },
        function (fn, ms) { timers.push({ fn: fn, ms: ms }); return timers.length; },
        function () {},
        function (min, max) { return max; },
        gm,
        "9999", "99999999",
        function () {},
        function () {}
    );

    return { dom, win, api, timers, warnings, requests };
}

async function testBarrageLoopKeepsRunning() {
    console.log("=== ⑦ 弹幕发送小助手：舔狗接口失败不得让循环永久停摆 ===");
    const { dom, api, timers, warnings, requests } = makeTiangouSandbox();
    api.setChangeColor(false);

    // ① 请求失败（旧实现：Promise 永不 settle -> await 卡死 -> 不会再排下一轮）
    let finished = false;
    const first = api.doLoop().then(function () { finished = true; });
    await waitTick();
    assert.ok(requests.length === 1, "应当发出一次舔狗请求，实际 " + requests.length);
    requests[0].onerror({ message: "net::ERR_CONNECTION_RESET" });
    await first;
    assert.ok(finished, "请求失败后 doLoopBarrage 必须能走完（旧实现会永远停在 await 上）");
    assert.strictEqual(timers.length, 1, "失败后必须照常排下一轮: " + JSON.stringify(timers));
    assert.ok(
        warnings.some(function (w) { return w.indexOf("舔狗弹幕") !== -1; }),
        "请求失败必须留 warn 线索: " + JSON.stringify(warnings)
    );

    // ② 超时
    timers.length = 0;
    const second = api.doLoop();
    await waitTick();
    requests[1].ontimeout();
    await second;
    assert.strictEqual(timers.length, 1, "超时后同样必须继续下一轮");

    // ③ 返回体形状不对（旧实现 ret.response 为 null 时在 onload 里直接抛）
    timers.length = 0;
    const third = api.doLoop();
    await waitTick();
    requests[2].onload({ response: null });
    await third;
    assert.strictEqual(timers.length, 1, "返回体异常也必须继续下一轮");

    // ④ 正常返回：照旧把「他」换成「她」发出去
    timers.length = 0;
    const fourth = api.doLoop();
    await waitTick();
    requests[3].onload({ response: { data: { text: "他来了" } } });
    await fourth;
    assert.strictEqual(api.sentHint(), "她来了", "正常返回时必须照旧替换并发送，实际 " + JSON.stringify(api.sentHint()));
    assert.strictEqual(timers.length, 1, "正常一轮之后也要继续下一轮");

    console.log("✓ ⑦ 通过: 失败/超时/异常返回体都只跳过本条，循环始终在跑");
    dom.window.close();
}

/* ============================ ⑧ BarragePanel：查弹幕不得点了没反应 ============================ */

async function testBarragePanelUserUid() {
    console.log("=== ⑧ 查弹幕：接口失败/返回体缺字段必须给出结果，不能让按钮点了没反应 ===");
    const dom = new JSDOM("<!DOCTYPE html><html><body></body></html>", { url: "https://www.douyu.com/9999" });
    const win = dom.window;
    const warnings = [];
    const requests = [];

    const factory = new Function(
        "window", "document", "localStorage", "console", "setTimeout", "clearTimeout",
        "GM_xmlhttpRequest", "rid", "showMessage", "openPage", "getLocalDateStr",
        PANEL_SRC + `
        return { getUserUid: getUserUid };
        `
    );
    const api = factory(
        win, win.document, win.localStorage,
        { log: function () {}, warn: function () { warnings.push(Array.prototype.join.call(arguments, " ")); }, error: function () {} },
        win.setTimeout, win.clearTimeout,
        function (req) { requests.push(req); },
        "9999", function () {}, function () {}, function () { return "2026-10-26"; }
    );

    // ① 请求失败
    const p1 = api.getUserUid("某观众");
    await waitTick();
    requests[0].onerror({ message: "blocked" });
    assert.strictEqual(await p1, "", "请求失败必须 resolve 成空串（旧实现永不 resolve）");

    // ② 返回体为 null / 缺 suggest / fan 为空 / 昵称对不上
    const cases = [
        { response: null },
        { response: {} },
        { response: { suggest: {} } },
        { response: { suggest: { fan: [] } } },
        { response: { suggest: { fan: [{ nickname: "别人", user_id: "123" }] } } }
    ];
    for (let i = 0; i < cases.length; i++) {
        const p = api.getUserUid("某观众");
        await waitTick();
        assert.doesNotThrow(function () {
            requests[requests.length - 1].onload(cases[i]);
        }, "返回体异常时 onload 不得抛错: " + JSON.stringify(cases[i]));
        assert.strictEqual(await p, "", "异常返回体必须 resolve 成空串: " + JSON.stringify(cases[i]));
    }

    // ③ 正常命中
    const ok = api.getUserUid("某观众");
    await waitTick();
    requests[requests.length - 1].onload({ response: { suggest: { fan: [{ nickname: "某观众", user_id: "abc123" }] } } });
    assert.strictEqual(await ok, "abc123", "命中时必须返回 user_id（回归保护）");

    assert.ok(
        warnings.some(function (w) { return w.indexOf("查弹幕接口") !== -1; }),
        "请求失败必须留 warn 线索: " + JSON.stringify(warnings)
    );

    console.log("✓ ⑧ 通过: 失败/超时/畸形返回体全部安全落地，正常查询不受影响");
    dom.window.close();
}

(async function main() {
    testReplyExecNull();
    await testMuteExecNull();
    testRuleParsing();
    testDispatchIsolation();
    testOriginalBugEndToEnd();
    testRealWebSocketEntry();
    await testAsyncHandlerRejection();
    await testBarrageLoopKeepsRunning();
    await testBarragePanelUserUid();
    console.log("=== P0-2 弹幕派发链隔离回归测试 100% 通过 ===");
})().catch(function (e) {
    console.error("测试失败:", e && e.stack ? e.stack : e);
    process.exit(1);
});
