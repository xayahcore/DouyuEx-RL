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

const SIGN_POINTS_SRC = fs.readFileSync(path.join(__dirname, "../src/packages/Sign/Sign_Points.js"), "utf8");
const SIGN_WATCH_SRC = fs.readFileSync(path.join(__dirname, "../src/packages/Sign/Sign_WatchPoints.js"), "utf8");
const SIGN_SRC = fs.readFileSync(path.join(__dirname, "../src/packages/Sign/Sign.js"), "utf8");

// WatchPoints 内部的节拍/冷却常量，测试里必须与源码一致；这里直接从源码里抠出来，
// 免得以后改源码了测试还在用旧值静默通过
function readConst(src, name) {
    const m = src.match(new RegExp("const\\s+" + name + "\\s*=\\s*([0-9*\\s]+);"));
    assert.ok(m, "未能从源码解析常量 " + name);
    return Function("return " + m[1])();
}
const TICK_MS = readConst(SIGN_WATCH_SRC, "WATCH_POINTS_TICK_MS");
const COOLDOWN_MS = readConst(SIGN_WATCH_SRC, "WATCH_POINTS_RETRY_COOLDOWN_MS");
const TIER_MAX_ATTEMPTS = readConst(SIGN_WATCH_SRC, "WATCH_POINTS_TIER_MAX_ATTEMPTS");

/** 造一个干净的运行环境：可控 fetch + 可控定时器 + 可覆写的可见性/播放状态。 */
function makeEnv(opts) {
    opts = opts || {};
    const dom = new JSDOM(
        `<!DOCTYPE html><html><body>
            <div class="ex-panel__wrap"></div>
            <div class="layout-Player-videoEntity"><video id="v"></video></div>
        </body></html>`,
        { url: "https://www.douyu.com/9999" }
    );
    const win = dom.window;
    const requests = [];
    const notices = [];
    const warnings = [];
    const errors = [];
    const pending = [];

    // 定时器全部收归测试驱动：真实 setInterval 会让用例变成"等 3 秒看运气"
    const intervals = new Map();
    let timerSeq = 1;
    const fakeSetInterval = (fn, ms) => { const id = timerSeq++; intervals.set(id, { fn, ms }); return id; };
    const fakeClearInterval = (id) => { intervals.delete(id); };
    const timeouts = new Map();
    const fakeSetTimeout = (fn, ms) => { const id = timerSeq++; timeouts.set(id, { fn, ms }); return id; };
    const fakeClearTimeout = (id) => { timeouts.delete(id); };

    // fetch 桩：handler(url, init) 返回 {status, body}；body 为对象则当 JSON 回。
    // 走 Promise.resolve().then 让请求同样异步完成，避免用例误把同步返回当真实时序。
    const fetchStub = (url, init) => {
        const method = ((init && init.method) || "GET").toUpperCase();
        requests.push({ url: String(url), method: method, body: (init && init.body) || "" });
        return Promise.resolve().then(() => {
            const r = (opts.handler || (() => ({ status: 200, body: { error: 0, data: {} } })))(String(url), init || {});
            if (r && r.reject) return Promise.reject(new Error("network"));
            return {
                status: (r && r.status) || 200,
                ok: ((r && r.status) || 200) === 200,
                json: async () => (r && r.body) || {},
                text: async () => JSON.stringify((r && r.body) || {}),
            };
        });
    };

    const factory = new Function(
        "window", "document", "location", "localStorage",
        "setTimeout", "clearTimeout", "setInterval", "clearInterval",
        "fetch", "showMessage", "console",
        `
        function getLocalDateStr(date) {
            let d = date ? new Date(date.getTime()) : new Date();
            let pad = (v) => (v < 10 ? "0" + v : "" + v);
            return d.getFullYear() + "-" + pad(d.getMonth() + 1) + "-" + pad(d.getDate());
        }
        ` + SIGN_POINTS_SRC + "\n" + SIGN_WATCH_SRC + "\n" + SIGN_SRC + `
        return {
            fetchConfig: Sign_Points_fetchConfig,
            inPeriod: Sign_Points_inPeriod,
            isLoginError: Sign_Points_isLoginError,
            apiError: Sign_Points_apiError,
            prizeText: Sign_Points_prizeText,
            unboxList: Sign_Points_unboxList,
            executeSignPoints: executeSignPoints,
            setEnabled: Sign_WatchPoints_setEnabled,
            boot: Sign_WatchPoints_boot,
            checkNow: Sign_WatchPoints_checkNow,
            // state 只挂在 window 上（源码里是 window.Sign_WatchPoints_state 这种一次性赋值），
            // 测试沙箱的 window 是参数不是真全局，所以这里显式从 window 取
            state: function () { return window.Sign_WatchPoints_state(); },
            today: WatchPoints_today,
            isWatching: WatchPoints_isWatching,
            createSignPanel: createSignPanel,
            executeSignEngine: executeSignEngine,
            initPkgSign: initPkg_Sign,
            patchBoot: function (fn) { Sign_WatchPoints_boot = fn; },
            patchSetEnabled: function (fn) { Sign_WatchPoints_setEnabled = fn; },
            patchInitPkgSignDom: function (fn) { initPkg_Sign_Dom = fn; },
        };
        `
    );

    const api = factory(
        win, win.document, win.location, win.localStorage,
        fakeSetTimeout, fakeClearTimeout, fakeSetInterval, fakeClearInterval,
        fetchStub,
        (msg, type) => notices.push({ msg, type }),
        { log: () => {}, error: (...a) => errors.push(a.join(" ")), warn: (...a) => warnings.push(a.join(" ")) }
    );

    return {
        dom, win, api, requests, notices, warnings, errors,
        video: win.document.getElementById("v"),
        fireTicks(n) {
            for (let i = 0; i < (n || 1); i++) {
                intervals.forEach((t) => { if (t.ms === TICK_MS) t.fn(); });
            }
        },
        fireInterval(ms) { intervals.forEach((t) => { if (t.ms === ms) t.fn(); }); },
        flushTimeouts() { const arr = Array.from(timeouts.values()); timeouts.clear(); arr.forEach((t) => t.fn()); },
        intervalCount() { return intervals.size; },
        countRequests(fragment) { return requests.filter((r) => r.url.indexOf(fragment) >= 0); },
    };
}

// 只让"页面可见 + 视频在播"这一条成立；visibilityState/paused/readyState 在 jsdom 里
// 都是原型上的只读访问器，必须在实例上覆写才生效
function setWatching(env, watching) {
    const doc = env.win.document;
    Object.defineProperty(doc, "visibilityState", { value: watching ? "visible" : "hidden", configurable: true });
    Object.defineProperty(env.video, "paused", { value: !watching, configurable: true });
    Object.defineProperty(env.video, "ended", { value: false, configurable: true });
    Object.defineProperty(env.video, "readyState", { value: watching ? 4 : 0, configurable: true });
}

function flush() {
    return new Promise((resolve) => setImmediate(resolve));
}

async function flushAll(n) {
    for (let i = 0; i < (n || 6); i++) await flush();
}

const NOW = () => Math.floor(Date.now() / 1000);

function goodConfig(over) {
    return Object.assign({
        error: 0,
        data: {
            actAlias: "ACT1",
            signAlias: "SIGN1",
            startTime: NOW() - 3600,
            endTime: NOW() + 3600,
            signPrize: { "1": [{ name: "积分", num: 20 }] },
            viewTask: [
                { id: 1, time: 300, status: 0, num: 10, bagAlias: "b1" },
                { id: 2, time: 900, status: 0, num: 10, bagAlias: "b1" },
            ],
        },
    }, over || {});
}

/* ---------------- A. 纯函数 ---------------- */

async function testInPeriod() {
    const env = makeEnv();
    const inPeriod = env.api.inPeriod;
    assert.strictEqual(inPeriod({ startTime: NOW() - 10, endTime: NOW() + 10 }).ok, true);
    const ended = inPeriod({ endTime: NOW() - 10 });
    assert.strictEqual(ended.ok, false);
    assert.strictEqual(ended.why, "活动已结束");
    const notStarted = inPeriod({ startTime: NOW() + 100 });
    assert.strictEqual(notStarted.ok, false);
    assert.strictEqual(notStarted.why, "活动尚未开始");
    // 缺省时间等于"不限时间"，不能因此拦住签到
    assert.strictEqual(inPeriod({ startTime: 0, endTime: 0 }).ok, true);
    assert.strictEqual(inPeriod(null).ok, false);
    env.dom.window.close();
    console.log("✓ A1 通过: 活动有效期判定（含缺省时间不拦截）");
}

async function testLoginErrorProbe() {
    const env = makeEnv();
    const f = env.api.isLoginError;
    assert.strictEqual(f({ error: 300, msg: "请登录" }), true, "carnivalApi 的登录错误码 300");
    assert.strictEqual(f({ error: 1006900016, msg: "未登录" }), true, "gametask 的登录错误码 1006900016");
    assert.strictEqual(f({ error: 0, msg: "请登录" }), true, "只靠 msg 也要认出来");
    assert.strictEqual(f({ error: 0, msg: "success" }), false);
    assert.strictEqual(f(null), false, "拿不到响应不算登录错误");
    // 登录错误必须翻译成人话，而不是把错误码直接丢给用户
    assert.ok(env.api.apiError({ error: 300, msg: "请登录" }).indexOf("未登录") >= 0);
    assert.strictEqual(env.api.apiError({ error: 9, msg: "活动不存在" }), "活动不存在");
    env.dom.window.close();
    console.log("✓ A2 通过: 两套登录错误码归一为「未登录」");
}

async function testPrizeText() {
    const env = makeEnv();
    assert.strictEqual(env.api.prizeText({ signPrize: { "1": [{ name: "积分", num: 20 }] } }, 0), "积分x20");
    assert.strictEqual(env.api.prizeText({ signPrize: { "3": [{ name: "积分", num: 5 }, { name: "礼物", num: 1 }] } }, 2), "积分x5、礼物x1");
    assert.strictEqual(env.api.prizeText({ signPrize: {} }, 0), "", "查不到奖励就返回空串，不编造");
    assert.strictEqual(env.api.prizeText(null, 0), "");

    // 礼包列表结构没能实机复现过（未登录时接口只回"请登录"），所以要做兼容：
    // 数组直接用；包一层的对象取第一个数组字段；都不像就空手退出并留痕，绝不静默漏领
    assert.deepStrictEqual(env.api.unboxList([{ giftAlias: "a" }]), [{ giftAlias: "a" }]);
    assert.deepStrictEqual(env.api.unboxList({ list: [{ giftAlias: "b" }] }), [{ giftAlias: "b" }]);
    assert.deepStrictEqual(env.api.unboxList({}), []);
    assert.deepStrictEqual(env.api.unboxList(null), []);
    assert.ok(env.warnings.join("\n").indexOf("礼包列表结构未识别") >= 0, "结构不认识时要留线索");
    env.dom.window.close();
    console.log("✓ A3 通过: 奖励文案按今天第几天取；礼包列表结构做兼容并留痕");
}

/* ---------------- B. executeSignPoints 端点与动词 ---------------- */

async function testSignHappyPath() {
    const env = makeEnv({
        handler: (url) => {
            if (url.indexOf("/gametask/config") >= 0) return { status: 200, body: goodConfig() };
            if (url.indexOf("/nc/sign/getStatus") >= 0) return { status: 200, body: { error: 0, data: { todaySigned: 0, signDays: 3, todayOffset: 0 } } };
            if (url.indexOf("/sign/doSign") >= 0) return { status: 200, body: { error: 0, data: {} } };
            if (url.indexOf("/sign/bagList") >= 0) return { status: 200, body: { error: 0, data: [{ giftAlias: "g1" }, { giftAlias: "g2", isFull: true }] } };
            if (url.indexOf("/sign/takeBag") >= 0) return { status: 200, body: { error: 0 } };
            if (url.indexOf("/sign/takeFullSignBag") >= 0) return { status: 200, body: { error: 0 } };
            throw new Error("未预期的请求: " + url);
        },
    });
    const logs = [];
    const ok = await env.api.executeSignPoints((m, s) => logs.push(m));
    await flushAll();
    assert.strictEqual(ok, true);

    // 动词是实机校准过的：getStatus/bagList 只认 GET，doSign/takeBag 只认 POST。
    // 写反了就是静默失败（405），所以这里逐个钉死。
    assert.strictEqual(env.countRequests("/nc/sign/getStatus")[0].method, "GET");
    assert.strictEqual(env.countRequests("/sign/bagList")[0].method, "GET");
    assert.strictEqual(env.countRequests("/sign/doSign")[0].method, "POST", "doSign 必须 POST（GET 会 405）");
    assert.ok(env.countRequests("/sign/doSign")[0].body.indexOf("signAlias=SIGN1") >= 0);
    assert.strictEqual(env.countRequests("/sign/takeBag")[0].method, "POST");
    assert.strictEqual(env.countRequests("/sign/takeFullSignBag")[0].method, "POST", "连签整包走 takeFullSignBag");

    const text = logs.join("\n");
    assert.ok(text.indexOf("签到成功") >= 0, text);
    assert.ok(text.indexOf("积分x20") >= 0, "签到日志要带上奖励内容: " + text);
    assert.ok(text.indexOf("成功 2 个") >= 0, text);

    // 不传日志回调时（window.executeSignPoints 被单独调用）也必须通知到用户，不能一声不吭
    env.notices.length = 0;
    await env.api.executeSignPoints();
    await flushAll();
    assert.ok(env.notices.length >= 1, "默认路径要落到左下角通知");
    assert.ok(env.notices.some((n) => /今日已签到|签到成功/.test(n.msg)), JSON.stringify(env.notices));
    env.dom.window.close();
    console.log("✓ B1 通过: 签到 → 领礼包全链路，动词逐个校准（doSign/takeBag=POST），默认通知路径也通");
}

async function testSignAlreadySigned() {
    const env = makeEnv({
        handler: (url) => {
            if (url.indexOf("/gametask/config") >= 0) return { status: 200, body: goodConfig() };
            if (url.indexOf("/nc/sign/getStatus") >= 0) return { status: 200, body: { error: 0, data: { todaySigned: 1, signDays: 4, todayOffset: 3 } } };
            if (url.indexOf("/sign/bagList") >= 0) return { status: 200, body: { error: 0, data: [] } };
            throw new Error("不该发出的请求: " + url);
        },
    });
    const logs = [];
    await env.api.executeSignPoints((m) => logs.push(m));
    await flushAll();
    assert.strictEqual(env.countRequests("/sign/doSign").length, 0, "今天已签就不该再签一次");
    assert.ok(logs.join("\n").indexOf("今日已签到") >= 0);
    env.dom.window.close();
    console.log("✓ B2 通过: 今日已签则不再调用 doSign");
}

async function testSignLoginWall() {
    const env = makeEnv({
        handler: (url) => {
            if (url.indexOf("/gametask/config") >= 0) return { status: 200, body: goodConfig() };
            return { status: 200, body: { error: 300, msg: "请登录", data: null } };
        },
    });
    const logs = [];
    const ok = await env.api.executeSignPoints((m) => logs.push(m));
    await flushAll();
    assert.strictEqual(ok, false, "未登录必须返回失败");
    assert.ok(logs.join("\n").indexOf("未登录") >= 0, logs.join("\n"));
    assert.ok(logs.join("\n").indexOf("签到成功") < 0, "绝不能谎报成功");
    assert.strictEqual(env.countRequests("/sign/doSign").length, 0);
    env.dom.window.close();
    console.log("✓ B3 通过: 未登录时如实报错、且不谎报成功");
}

async function testSignOutOfPeriod() {
    const env = makeEnv({
        handler: (url) => {
            if (url.indexOf("/gametask/config") >= 0) {
                return { status: 200, body: goodConfig({ data: Object.assign(goodConfig().data, { endTime: NOW() - 10 }) }) };
            }
            throw new Error("活动已结束就不该再发请求: " + url);
        },
    });
    const logs = [];
    const ok = await env.api.executeSignPoints((m) => logs.push(m));
    await flushAll();
    assert.strictEqual(ok, false);
    assert.ok(logs.join("\n").indexOf("活动已结束") >= 0);
    assert.strictEqual(env.requests.length, 1, "只允许那次配置查询");
    env.dom.window.close();
    console.log("✓ B4 通过: 活动已结束 → 提前止损，只发一次配置查询");
}

/* ---------------- C. 看播积分：计时 / 领取 / 节流 ---------------- */

function watchHandler(state) {
    return (url) => {
        if (url.indexOf("/gametask/config") >= 0) return { status: 200, body: state.config || goodConfig() };
        if (url.indexOf("/gametask/viewStatus") >= 0) return { status: 200, body: state.status || { error: 0, data: { taskList: { "1": { status: 0 }, "2": { status: 0 } } } } };
        if (url.indexOf("/gametask/viewReport") >= 0) return { status: 200, body: state.report || { error: 0, data: "" } };
        throw new Error("未预期的请求: " + url);
    };
}

async function testWatchVisibleOnly() {
    const state = {};
    const env = makeEnv({ handler: watchHandler(state) });
    setWatching(env, false);
    env.api.setEnabled(true);
    await flushAll();
    env.fireTicks(5);
    assert.strictEqual(env.api.state().seconds, 0, "页面不可见/视频未播时不该计时");
    setWatching(env, true);
    env.fireTicks(5);
    assert.strictEqual(env.api.state().seconds, 5, "可见且在播时才累计");
    // 不可见一次都不该累计：改成隐藏后再走 5 拍
    setWatching(env, false);
    env.fireTicks(5);
    assert.strictEqual(env.api.state().seconds, 5, "中途切到后台必须停止累计");
    env.api.setEnabled(false);
    env.dom.window.close();
    console.log("✓ C1 通过: 只统计「页面可见 + 视频在播」的时长");
}

async function testWatchThresholdClaimOnce() {
    const state = { status: { error: 0, data: { taskList: { "1": { status: 2 }, "2": { status: 0 } } } }, report: { error: 0, data: "" } };
    const env = makeEnv({ handler: watchHandler(state) });
    setWatching(env, true);
    env.api.setEnabled(true);
    await flushAll();
    assert.strictEqual(env.api.state().tiers.length, 2, "档位应来自活动的 viewTask");

    // 第 300 秒整跨过第一档 → 触发一次领取
    env.fireTicks(300);
    await flushAll();
    const reports1 = env.countRequests("/gametask/viewReport").length;
    assert.strictEqual(reports1, 1, "跨过门槛应恰好上报一次，实际 " + reports1);
    assert.strictEqual(env.api.state().claimed["1"], true, "回读状态后应把已领档位标记掉");

    // 之后继续走时间：冷却期内的重试必须被打住（这是"每秒重发"的回归点）
    env.fireTicks(120);
    await flushAll();
    assert.strictEqual(
        env.countRequests("/gametask/viewReport").length,
        1,
        "冷却期内不得重复上报"
    );

    // 冷却结束后，跨过第二档才允许再发一次
    env.api.state().lastClaimAt = 0;
    env.fireTicks(1000);
    await flushAll();
    assert.strictEqual(env.countRequests("/gametask/viewReport").length, 2, "冷却过后跨下一档应再上报一次");
    env.api.setEnabled(false);
    env.dom.window.close();
    console.log("✓ C2 通过: 跨门槛只上报一次，冷却期内不重复发请求");
}

async function testWatchRetryCap() {
    // 服务端一直不让领（已按时会回「今日观看活动已结束请刷新页面」）：同一档重试到上限就停手
    const state = { report: { error: 1, msg: "今日观看活动已结束请刷新页面" }, status: { error: 0, data: { taskList: { "1": { status: 0 }, "2": { status: 0 } } } } };
    const env = makeEnv({ handler: watchHandler(state) });
    setWatching(env, true);
    env.api.setEnabled(true);
    await flushAll();
    const logs = [];
    env.api.state().limitWarned = false;
    env.fireTicks(300);
    for (let i = 0; i < TIER_MAX_ATTEMPTS + 3; i++) {
        await flushAll();
        env.api.state().lastClaimAt = 0; // 跳过冷却，专门验证"每档尝试次数上限"这道闸
        env.fireTicks(1);
        await flushAll();
    }
    assert.strictEqual(
        env.countRequests("/gametask/viewReport").length,
        TIER_MAX_ATTEMPTS,
        "同一档位失败重试上限应为 " + TIER_MAX_ATTEMPTS + "，实际 " + env.countRequests("/gametask/viewReport").length
    );
    assert.ok(env.warnings.join("\n").indexOf("看播积分领取未成功") >= 0, "失败要有线索，但不能刷屏: " + env.warnings.join("|"));
    assert.ok(env.notices.filter((n) => /看播积分/.test(n.msg)).length === 0, "正常失败不该在左下角弹通知");
    void logs;
    env.api.setEnabled(false);
    env.dom.window.close();
    console.log("✓ C3 通过: 同一档位失败重试 " + TIER_MAX_ATTEMPTS + " 次即止，改由 10 分钟兜底接手");
}

async function testWatchLoginWallStops() {
    const state = { report: { error: 1006900016, msg: "未登录", data: "" } };
    const env = makeEnv({ handler: watchHandler(state) });
    setWatching(env, true);
    env.api.setEnabled(true);
    await flushAll();
    env.fireTicks(300);
    await flushAll();
    assert.strictEqual(env.api.state().loginBlocked, true, "撞到登录墙应停止自动领取");
    assert.ok(env.notices.some((n) => /未登录/.test(n.msg)), "要如实告诉用户未登录");
    const before = env.countRequests("/gametask/viewReport").length;
    env.api.state().lastClaimAt = 0;
    env.fireTicks(600);
    await flushAll();
    assert.strictEqual(env.countRequests("/gametask/viewReport").length, before, "登录墙后不得再发领取请求");
    env.api.setEnabled(false);
    env.dom.window.close();
    console.log("✓ C4 通过: 未登录时停止自动领取并如实提示");
}

async function testWatchAllDoneGoesIdle() {
    // 配置里全是 status 2（今天已领完）：一次请求都不该多发，连状态查询也要停
    const cfg = goodConfig();
    cfg.data.viewTask = [
        { id: 1, time: 300, status: 2, num: 10 },
        { id: 2, time: 900, status: 2, num: 10 },
    ];
    const state = { config: cfg };
    const env = makeEnv({ handler: watchHandler(state) });
    setWatching(env, true);
    env.api.setEnabled(true);
    await flushAll(8);
    assert.strictEqual(env.api.state().allDone, true, "配置已显示全部领完就该收工");
    const afterIdle = env.requests.length;
    env.fireInterval(10 * 60 * 1000);
    env.fireTicks(60);
    await flushAll();
    assert.strictEqual(env.countRequests("/gametask/viewReport").length, 0, "领完了就别再发领取请求");
    assert.strictEqual(env.requests.length, afterIdle, "领完后连状态查询都应停止");
    env.api.setEnabled(false);
    env.dom.window.close();
    console.log("✓ C5 通过: 全部领完后彻底停手（仅保留不发请求的跨天自检）");
}

async function testWatchLoginWallInFallback() {
    const state = { status: { error: 1006900016, msg: "未登录", data: "" } };
    const env = makeEnv({ handler: watchHandler(state) });
    setWatching(env, true);
    env.api.setEnabled(true);
    await flushAll();
    env.flushTimeouts(); // 启动后 8 秒那次兜底
    await flushAll();
    assert.strictEqual(env.api.state().loginBlocked, true, "兜底查询撞到登录墙也要停下");
    assert.strictEqual(env.countRequests("/gametask/viewReport").length, 0);
    env.api.setEnabled(false);
    env.dom.window.close();
    console.log("✓ C6 通过: 兜底路径同样识别登录墙");
}

async function testWatchCrossDayReset() {
    const state = {};
    const env = makeEnv({ handler: watchHandler(state) });
    setWatching(env, true);
    env.api.setEnabled(true);
    await flushAll();
    env.fireTicks(100);
    assert.strictEqual(env.api.state().seconds, 100);
    env.api.state().claimed["1"] = true;
    env.api.state().date = "1999-01-01"; // 假装页面从昨天挂到现在
    env.fireTicks(1); // 这一拍只负责发现跨天并结转
    await flushAll();
    assert.strictEqual(env.api.state().seconds, 0, "跨天应清零");
    assert.strictEqual(env.api.state().claimed["1"], undefined, "跨天应清掉已领标记");
    assert.strictEqual(env.api.state().date, env.api.today());
    env.fireTicks(1); // 结转之后的下一拍才重新开始累计
    assert.strictEqual(env.api.state().seconds, 1, "跨天后应重新累计");
    assert.strictEqual(env.api.state().allDone, false, "跨天后必须解除收工态");
    env.api.setEnabled(false);
    env.dom.window.close();
    console.log("✓ C7 通过: 跨天自动重置累计与已领标记");
}

async function testWatchBootRespectsSavedConfig() {
    const state = {};
    const env = makeEnv({ handler: watchHandler(state) });
    env.win.localStorage.setItem("ExSave_SignConfig", JSON.stringify({ watchpoints: false }));
    env.api.boot();
    assert.strictEqual(env.api.state().enabled, false, "没勾选就不能启动计时");
    assert.strictEqual(env.intervalCount(), 0, "没勾选就不该挂任何定时器（零开销）");

    env.win.localStorage.setItem("ExSave_SignConfig", JSON.stringify({ watchpoints: true }));
    env.api.boot();
    assert.strictEqual(env.api.state().enabled, true);
    assert.ok(env.intervalCount() > 0, "勾选了才挂定时器");
    // 幂等：boot 再来一次不该叠加定时器
    const n = env.intervalCount();
    env.api.boot();
    assert.strictEqual(env.intervalCount(), n, "boot 必须幂等");
    env.api.setEnabled(false);
    assert.strictEqual(env.intervalCount(), 0, "关闭后定时器应全部清掉");
    env.dom.window.close();
    console.log("✓ C8 通过: 开关严格跟随 ExSave_SignConfig，关闭后零定时器");
}

/* ---------------- D. 面板接线 ---------------- */

async function testPanelWiring() {
    const env = makeEnv();
    env.api.createSignPanel();
    const doc = env.win.document;
    const points = doc.querySelector('[data-key="points"]');
    const watch = doc.querySelector('[data-key="watchpoints"]');
    assert.ok(points, "面板必须有「活动中心签到领积分」勾选项");
    assert.ok(watch, "面板必须有「看直播领积分」勾选项");
    assert.strictEqual(points.checked, true, "积分签到默认开（属于一键签到的常规项）");
    assert.strictEqual(watch.checked, false, "看播积分默认关（常驻项，不该替用户默认打开）");
    assert.strictEqual(doc.querySelectorAll(".sign-options-list .sign-checkbox").length, 7);

    // 勾选/取消要立刻作用于常驻计时，而不是等下次开页面
    const calls = [];
    env.api.patchSetEnabled((on) => calls.push(on));
    watch.checked = true;
    watch.dispatchEvent(new env.win.Event("change"));
    const saved = JSON.parse(env.win.localStorage.getItem("ExSave_SignConfig"));
    assert.strictEqual(saved.watchpoints, true, "勾选要落盘");
    assert.deepStrictEqual(calls, [true], "勾选要立刻启动");
    assert.strictEqual(typeof saved.points, "boolean", "同一次改动要把整份配置一起落盘");

    // 面板初始化要引导常驻计时（否则不打开面板就永远不跑）
    const booted = [];
    env.api.patchInitPkgSignDom(() => {});
    env.api.patchBoot(() => booted.push(1));
    env.api.initPkgSign();
    assert.strictEqual(booted.length, 1, "initPkg_Sign 必须引导一次看播积分");
    env.dom.window.close();
    console.log("✓ D1 通过: 面板 7 个勾选项、看播开关即时生效并落盘、初始化会引导常驻计时");
}

async function testEngineSteps() {
    const env = makeEnv({
        handler: (url) => {
            if (url.indexOf("/gametask/config") >= 0) return { status: 200, body: goodConfig() };
            if (url.indexOf("/nc/sign/getStatus") >= 0) return { status: 200, body: { error: 0, data: { todaySigned: 1, signDays: 1, todayOffset: 0 } } };
            if (url.indexOf("/sign/bagList") >= 0) return { status: 200, body: { error: 0, data: [] } };
            if (url.indexOf("/gametask/viewStatus") >= 0) return { status: 200, body: { error: 0, data: { taskList: { "1": { status: 1 }, "2": { status: 0 } } } } };
            if (url.indexOf("/gametask/viewReport") >= 0) return { status: 200, body: { error: 0, data: "" } };
            throw new Error("未预期的请求: " + url);
        },
    });
    const logs = [];
    const onLog = (m) => logs.push(m);
    await env.api.executeSignEngine({ points: true, watchpoints: true }, onLog);
    await flushAll();
    const text = logs.join("\n");
    assert.ok(text.indexOf("今日已签到") >= 0, "积分签到要作为一键签到的一步跑: " + text);
    assert.ok(text.indexOf("本地计时已启动") >= 0, "勾了看播就该启动常驻计时: " + text);
    assert.strictEqual(env.api.state().enabled, true);

    // 明确不勾选时要停掉，而不是继续在后台跑
    await env.api.executeSignEngine({ watchpoints: false }, onLog);
    assert.strictEqual(env.api.state().enabled, false, "取消勾选要停掉常驻计时");
    assert.ok(logs.join("\n").indexOf("未勾选") >= 0);
    env.dom.window.close();
    console.log("✓ D2 通过: 一键签到的步骤接线（勾选即启动 / 取消即停）");
}

(async function main() {
    await testInPeriod();
    await testLoginErrorProbe();
    await testPrizeText();
    await testSignHappyPath();
    await testSignAlreadySigned();
    await testSignLoginWall();
    await testSignOutOfPeriod();
    await testWatchVisibleOnly();
    await testWatchThresholdClaimOnce();
    await testWatchRetryCap();
    await testWatchLoginWallStops();
    await testWatchAllDoneGoesIdle();
    await testWatchLoginWallInFallback();
    await testWatchCrossDayReset();
    await testWatchBootRespectsSavedConfig();
    await testPanelWiring();
    await testEngineSteps();
    console.log("=== 签到/看播领积分回归测试 17 组场景全部通过 ===");
})().catch((e) => {
    console.error("测试失败:", e && e.stack ? e.stack : e);
    process.exit(1);
});
