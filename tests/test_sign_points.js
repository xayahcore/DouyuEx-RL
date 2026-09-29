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

// 常量直接从源码里抠出来，免得改了源码测试还在用旧值静默通过
function readConst(src, name) {
    const m = src.match(new RegExp("const\\s+" + name + "\\s*=\\s*([0-9*\\s]+);"));
    assert.ok(m, "未能从源码解析常量 " + name);
    return Function("return " + m[1])();
}
const POLL_MS = readConst(SIGN_WATCH_SRC, "WATCH_POINTS_POLL_MS");
const REARM_MS = readConst(SIGN_WATCH_SRC, "WATCH_POINTS_REARM_MS");
const CLAIM_COOLDOWN_MS = readConst(SIGN_WATCH_SRC, "WATCH_POINTS_CLAIM_COOLDOWN_MS");

const NOW = () => Math.floor(Date.now() / 1000);

function goodConfig(over) {
    return Object.assign({
        error: 0,
        data: {
            actAlias: "ACT1",
            signAlias: "SIGN1",
            startTime: NOW() - 3600,
            endTime: NOW() + 3600,
            signPrize: { "1": [{ name: "积分", num: 20 }], "3": [{ name: "积分", num: 20 }] },
            viewTask: [
                { id: 1, time: 300, status: 0, num: 10, bagAlias: "b1" },
                { id: 2, time: 900, status: 0, num: 10, bagAlias: "b1" },
            ],
        },
    }, over || {});
}

/** 造一个干净的运行环境：可控 fetch + 可控定时器 + 可覆写的可见性。 */
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
    win.document.cookie = "acf_ccn=TESTCCN";
    if (!opts.noCsrfCookie) win.document.cookie = "cvl_csrf_token=TESTCSRF";
    const requests = [];
    const notices = [];
    const warnings = [];

    const intervals = new Map();
    const timeouts = new Map();
    let timerSeq = 1;
    const fakeSetInterval = (fn, ms) => { const id = timerSeq++; intervals.set(id, { fn, ms }); return id; };
    const fakeClearInterval = (id) => { intervals.delete(id); };
    const fakeSetTimeout = (fn, ms) => { const id = timerSeq++; timeouts.set(id, { fn, ms }); return id; };
    const fakeClearTimeout = (id) => { timeouts.delete(id); };

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
            inPeriod: Sign_Points_inPeriod,
            isLoginError: Sign_Points_isLoginError,
            isVerifyError: Sign_Points_isVerifyError,
            apiError: Sign_Points_apiError,
            prizeText: Sign_Points_prizeText,
            executeSignPoints: executeSignPoints,
            setEnabled: Sign_WatchPoints_setEnabled,
            boot: Sign_WatchPoints_boot,
            checkNow: Sign_WatchPoints_checkNow,
            state: function () { return window.Sign_WatchPoints_state(); },
            today: WatchPoints_today,
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
        { log: () => {}, error: () => {}, warn: (...a) => warnings.push(a.join(" ")) }
    );

    return {
        dom, win, api, requests, notices, warnings,
        fireInterval(ms) { intervals.forEach((t) => { if (t.ms === ms) t.fn(); }); },
        flushTimeouts() { const arr = Array.from(timeouts.values()); timeouts.clear(); arr.forEach((t) => t.fn()); },
        intervalCount() { return intervals.size; },
        countRequests(fragment) { return requests.filter((r) => r.url.indexOf(fragment) >= 0); },
    };
}

function setVisible(env, visible) {
    Object.defineProperty(env.win.document, "visibilityState", { value: visible ? "visible" : "hidden", configurable: true });
}

function flush() {
    return new Promise((resolve) => setImmediate(resolve));
}
async function flushAll(n) {
    for (let i = 0; i < (n || 6); i++) await flush();
}

/* ---------------- A. 纯函数 ---------------- */

async function testInPeriod() {
    const env = makeEnv();
    const f = env.api.inPeriod;
    assert.strictEqual(f({ startTime: NOW() - 10, endTime: NOW() + 10 }).ok, true);
    const ended = f({ endTime: NOW() - 10 });
    assert.strictEqual(ended.ok, false);
    assert.strictEqual(ended.why, "活动已结束");
    assert.strictEqual(f({ startTime: NOW() + 100 }).why, "活动尚未开始");
    assert.strictEqual(f({ startTime: 0, endTime: 0 }).ok, true, "缺省时间等于不限时间，不能拦住签到");
    assert.strictEqual(f(null).ok, false);
    env.dom.window.close();
    console.log("✓ A1 通过: 活动有效期判定（缺省时间不拦截）");
}

async function testErrorClassification() {
    const env = makeEnv();
    const f = env.api.isLoginError, v = env.api.isVerifyError, api = env.api.apiError;
    assert.strictEqual(f({ error: 300, msg: "请登录" }), true, "carnivalApi 登录码 300");
    assert.strictEqual(f({ error: 1006900016, msg: "未登录" }), true, "gametask 登录码 1006900016");
    assert.strictEqual(f(null), false, "拿不到响应不算登录错误");
    assert.strictEqual(v({ error: 1, message: "请完成滑块验证" }), true);
    assert.strictEqual(v({ error: 1, msg: "极验失败" }), true);
    assert.strictEqual(v({ error: 1, msg: "活动已结束" }), false);
    assert.ok(api({ error: 300, msg: "请登录" }).indexOf("未登录") >= 0);
    // 极验无法自动完成，必须让用户知道要手动去点，而不是笼统报"失败"
    assert.ok(api({ error: 1, message: "请完成验证" }).indexOf("手动签到") >= 0);
    assert.strictEqual(api({ error: 9, msg: "活动不存在" }), "活动不存在");
    env.dom.window.close();
    console.log("✓ A2 通过: 登录 / 极验 / 普通错误三分归一到人话");
}

async function testPrizeText() {
    const env = makeEnv();
    assert.strictEqual(env.api.prizeText({ signPrize: { "1": [{ name: "积分", num: 20 }] } }, 0), "积分x20");
    assert.strictEqual(env.api.prizeText({ signPrize: { "3": [{ name: "积分", num: 5 }, { name: "礼物", num: 1 }] } }, 2), "积分x5、礼物x1");
    assert.strictEqual(env.api.prizeText({ signPrize: {} }, 0), "", "查不到奖励就返回空串，不编造");
    assert.strictEqual(env.api.prizeText(null, 0), "");
    env.dom.window.close();
    console.log("✓ A3 通过: 奖励文案按天取，取不到返回空串");
}

/* ---------------- B. executeSignPoints ---------------- */

async function testSignHappyPath() {
    let signed = false;
    const env = makeEnv({
        handler: (url) => {
            if (url.indexOf("/gametask/config") >= 0) return { status: 200, body: goodConfig() };
            if (url.indexOf("/nc/sign/getStatus") >= 0) {
                return { status: 200, body: { error: 0, data: { todaySigned: signed ? 1 : 0, signDays: signed ? 3 : 2, todayOffset: 2 } } };
            }
            if (url.indexOf("/sign/doSign") >= 0) { signed = true; return { status: 200, body: { error: 0, data: {} } }; }
            if (url.indexOf("/sign/takeBag") >= 0) return { status: 200, body: { error: 0 } };
            throw new Error("未预期的请求: " + url);
        },
    });
    const logs = [];
    const ok = await env.api.executeSignPoints((m) => logs.push(m));
    await flushAll();
    assert.strictEqual(ok, true);

    assert.strictEqual(env.countRequests("/nc/sign/getStatus")[0].method, "GET");
    const doSign = env.countRequests("/sign/doSign")[0];
    assert.strictEqual(doSign.method, "POST");
    // 令牌规则按官方 dy() 包装器：carnivalApi 的 POST 带 csrfToken（不是 ctn），
    // 实机给 takeBag 只带 ctn 会回「CSRF校验不通过！(1006)」，所以这里逐个钉住
    assert.ok(doSign.body.indexOf("signAlias=SIGN1") >= 0, doSign.body);
    assert.ok(doSign.body.indexOf("useJiYan=true") >= 0, "官方固定带 useJiYan=true: " + doSign.body);
    assert.ok(doSign.body.indexOf("csrfToken=TESTCSRF") >= 0, "carnivalApi 的 POST 必须带 csrfToken: " + doSign.body);
    assert.ok(doSign.body.indexOf("ctn=") < 0, "carnivalApi 的 POST 不该带 ctn（两者二选一）: " + doSign.body);

    const bag = env.countRequests("/sign/takeBag")[0];
    assert.strictEqual(bag.method, "POST");
    assert.ok(bag.body.indexOf("offset=2") >= 0, "礼包按天数偏移领，不是按 giftAlias: " + bag.body);
    assert.ok(bag.body.indexOf("csrfToken=TESTCSRF") >= 0, bag.body);

    const text = logs.join("\n");
    assert.ok(text.indexOf("签到成功") >= 0, text);
    assert.ok(text.indexOf("积分x20") >= 0, "签到日志要带上奖励内容: " + text);
    assert.ok(text.indexOf("签到礼包已领取") >= 0, text);
    assert.strictEqual(env.countRequests("/sign/bagList").length, 0, "官方前端从不调用 bagList，这里也不该调");

    env.notices.length = 0;
    await env.api.executeSignPoints();
    await flushAll();
    assert.ok(env.notices.length >= 1, "不传日志回调时也要通知到用户");
    env.dom.window.close();
    console.log("✓ B1 通过: 签到 → 按偏移领礼包；useJiYan/ctn/offset 与官方逐字对齐");
}

async function testSignAlreadySigned() {
    const env = makeEnv({
        handler: (url) => {
            if (url.indexOf("/gametask/config") >= 0) return { status: 200, body: goodConfig() };
            if (url.indexOf("/nc/sign/getStatus") >= 0) return { status: 200, body: { error: 0, data: { todaySigned: 1, signDays: 4, todayOffset: 3 } } };
            if (url.indexOf("/sign/takeBag") >= 0) return { status: 200, body: { error: 0 } };
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

async function testSignFalseSuccess() {
    // 关键诚实性场景：doSign 回 error 0，但状态回读仍显示今天没签 —— 必须报失败，不能报成功
    const env = makeEnv({
        handler: (url) => {
            if (url.indexOf("/gametask/config") >= 0) return { status: 200, body: goodConfig() };
            if (url.indexOf("/nc/sign/getStatus") >= 0) return { status: 200, body: { error: 0, data: { todaySigned: 0, signDays: 2, todayOffset: 2 } } };
            if (url.indexOf("/sign/doSign") >= 0) return { status: 200, body: { error: 0, data: "" } };
            throw new Error("不该发出的请求: " + url);
        },
    });
    const logs = [];
    const ok = await env.api.executeSignPoints((m) => logs.push(m));
    await flushAll();
    assert.strictEqual(ok, false, "服务端状态没变就必须算失败");
    const text = logs.join("\n");
    assert.ok(text.indexOf("签到失败") >= 0, text);
    assert.ok(text.indexOf("签到成功") < 0, "绝不能谎报成功: " + text);
    assert.strictEqual(env.countRequests("/sign/takeBag").length, 0, "没签上就不该去领礼包");
    env.dom.window.close();
    console.log("✓ B3 通过: 以服务端状态回读为准，返回码说成功也不算成功");
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
    assert.strictEqual(ok, false);
    assert.ok(logs.join("\n").indexOf("未登录") >= 0, logs.join("\n"));
    assert.strictEqual(env.countRequests("/sign/doSign").length, 0);
    env.dom.window.close();
    console.log("✓ B4 通过: 未登录如实报错且不谎报成功");
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
    console.log("✓ B5 通过: 活动已结束提前止损，只发一次配置查询");
}

async function testSignBenignBagCode() {
    // 31203 = 官方源码里列为"已领过/没得领"的良性码，不该报失败
    const env = makeEnv({
        handler: (url) => {
            if (url.indexOf("/gametask/config") >= 0) return { status: 200, body: goodConfig() };
            if (url.indexOf("/nc/sign/getStatus") >= 0) return { status: 200, body: { error: 0, data: { todaySigned: 1, signDays: 2, todayOffset: 1 } } };
            if (url.indexOf("/sign/takeBag") >= 0) return { status: 200, body: { error: 31203, msg: "已领取" } };
            throw new Error("未预期: " + url);
        },
    });
    const logs = [];
    await env.api.executeSignPoints((m) => logs.push(m));
    await flushAll();
    const text = logs.join("\n");
    assert.ok(text.indexOf("没有新的签到礼包") >= 0, text);
    assert.ok(text.indexOf("领取失败") < 0, "良性码不该报失败: " + text);
    env.dom.window.close();
    console.log("✓ B6 通过: 官方良性错误码按「没有新礼包」处理，不误报失败");
}

async function testCsrfBootstrap() {
    // csrfToken 不在时，必须先 POST generateCsrf 拿令牌（它会种 cookie cvl_csrf_token）
    let env = null;
    env = makeEnv({
        noCsrfCookie: true,
        handler: (url) => {
            if (url.indexOf("/common/generateCsrf") >= 0) {
                env.win.document.cookie = "cvl_csrf_token=NEWTOKEN";
                return { status: 200, body: { error: 0, msg: "操作成功", data: {} } };
            }
            if (url.indexOf("/gametask/config") >= 0) return { status: 200, body: goodConfig() };
            if (url.indexOf("/nc/sign/getStatus") >= 0) return { status: 200, body: { error: 0, data: { todaySigned: 1, signDays: 2, todayOffset: 1 } } };
            if (url.indexOf("/sign/takeBag") >= 0) return { status: 200, body: { error: 31000, msg: "需连续签到6天才可以领取" } };
            throw new Error("未预期的请求: " + url);
        },
    });
    const logs = [];
    await env.api.executeSignPoints((m) => logs.push(m));
    await flushAll(8);
    assert.strictEqual(env.countRequests("/common/generateCsrf").length, 1, "缺令牌时要先生成一次");
    const bag = env.countRequests("/sign/takeBag")[0];
    assert.ok(bag.body.indexOf("csrfToken=NEWTOKEN") >= 0, "要用刚生成的令牌: " + bag.body);
    // 31000 = 官方列出的良性码（没到领取条件），不该报失败
    assert.ok(logs.join("\n").indexOf("没有新的签到礼包") >= 0, logs.join("\n"));
    env.dom.window.close();
    console.log("✓ B7 通过: csrfToken 缺失时自动生成并复用；良性码 31000 不误报");
}

/* ---------------- C. 看播积分 ---------------- */

function watchHandler(state) {
    return (url) => {
        if (url.indexOf("/gametask/config") >= 0) return { status: 200, body: state.config || goodConfig() };
        if (url.indexOf("/gametask/viewStatus") >= 0) {
            return { status: 200, body: { error: 0, data: { curTime: NOW(), startTime: 1700000000, endTime: NOW() + 600, taskList: state.taskList } } };
        }
        if (url.indexOf("/gametask/takeGift") >= 0) {
            state.gifts = (state.gifts || 0) + 1;
            if (state.giftFails) return { status: 200, body: { error: 1, msg: "领取失败" } };
            state.taskList = state.afterClaim || state.taskList;
            return { status: 200, body: state.giftBody || { error: 0, data: "" } };
        }
        throw new Error("未预期的请求: " + url);
    };
}

async function testWatchClaimsAndGoesIdle() {
    const state = {
        taskList: { "1": { status: 2, eventTime: 1 }, "2": { status: 3, eventTime: 2 } },
        afterClaim: { "1": { status: 3, eventTime: 1 }, "2": { status: 3, eventTime: 2 } },
    };
    const env = makeEnv({ handler: watchHandler(state) });
    setVisible(env, true);
    env.api.setEnabled(true);
    await flushAll();
    env.flushTimeouts(); // 启动 5 秒后的首次检查
    await flushAll(8);

    const gifts = env.countRequests("/gametask/takeGift");
    assert.strictEqual(gifts.length, 1, "status=2（已观看）就该领，实际 " + gifts.length);
    const b = gifts[0].body;
    assert.strictEqual(gifts[0].method, "POST");
    assert.ok(b.indexOf("id=1") >= 0, "领取要带档位 id: " + b);
    assert.ok(b.indexOf("actAlias=ACT1") >= 0, b);
    assert.ok(b.indexOf("startTime=1700000000") >= 0, "必须回带当日起点 startTime: " + b);
    assert.ok(b.indexOf("ctn=TESTCCN") >= 0, "POST 必须带 ctn: " + b);
    // status=3 的档位不该被重复领
    assert.ok(b.indexOf("id=2") < 0, "已领取的档位不能再领: " + b);

    assert.ok(env.notices.some((n) => /已领取/.test(n.msg)), JSON.stringify(env.notices));
    assert.strictEqual(env.api.state().allDone, true, "全部变 3 之后应进入收工态");
    const before = env.requests.length;
    env.fireInterval(POLL_MS);
    await flushAll();
    assert.strictEqual(env.requests.length, before, "收工后不该再发任何请求");
    env.api.setEnabled(false);
    env.dom.window.close();
    console.log("✓ C1 通过: status=2 即刻 takeGift 领取，领完回读确认并彻底停手");
}

async function testWatchNotClaimedWhenUnwatched() {
    // status=1（未观看）不能领 —— 早先的实现正是把可领的 2 当成已领，反向错在这里
    const state = { taskList: { "1": { status: 1 }, "2": { status: 1 } } };
    const env = makeEnv({ handler: watchHandler(state) });
    setVisible(env, true);
    env.api.setEnabled(true);
    await flushAll();
    env.flushTimeouts();
    await flushAll(8);
    assert.strictEqual(env.countRequests("/gametask/takeGift").length, 0, "没达标就不该领");
    assert.strictEqual(env.api.state().allDone, false, "没领完就不该收工");
    env.api.setEnabled(false);
    env.dom.window.close();
    console.log("✓ C2 通过: status=1（未观看）不会被误领");
}

async function testWatchIdleWhenAllClaimed() {
    const state = { taskList: { "1": { status: 3 }, "2": { status: 3 } } };
    const env = makeEnv({ handler: watchHandler(state) });
    setVisible(env, true);
    env.api.setEnabled(true);
    await flushAll();
    env.flushTimeouts();
    await flushAll(8);
    assert.strictEqual(env.countRequests("/gametask/takeGift").length, 0);
    assert.strictEqual(env.api.state().allDone, true);
    const before = env.requests.length;
    env.fireInterval(POLL_MS);
    await flushAll();
    assert.strictEqual(env.requests.length, before, "领完就该停手");
    env.api.setEnabled(false);
    env.dom.window.close();
    console.log("✓ C3 通过: 已是全部已领取时直接收工，一次请求都不多发");
}

async function testWatchHiddenPageNoRequests() {
    const state = { taskList: { "1": { status: 2 } }, afterClaim: { "1": { status: 3 } } };
    const env = makeEnv({ handler: watchHandler(state) });
    setVisible(env, false);
    env.api.setEnabled(true);
    await flushAll();
    env.fireInterval(POLL_MS);
    env.flushTimeouts();
    await flushAll(8);
    assert.strictEqual(env.countRequests("/gametask/viewStatus").length, 0, "后台标签页不该发请求");
    setVisible(env, true);
    env.fireInterval(POLL_MS);
    await flushAll(8);
    assert.strictEqual(env.countRequests("/gametask/takeGift").length, 1, "回到前台后正常领取");
    env.api.setEnabled(false);
    env.dom.window.close();
    console.log("✓ C4 通过: 后台标签页零请求，回前台立即补领");
}

async function testWatchLoginWall() {
    const env = makeEnv({
        handler: (url) => {
            if (url.indexOf("/gametask/config") >= 0) return { status: 200, body: goodConfig() };
            return { status: 200, body: { error: 1006900016, msg: "未登录", data: "" } };
        },
    });
    setVisible(env, true);
    env.api.setEnabled(true);
    await flushAll();
    env.flushTimeouts();
    await flushAll(8);
    assert.strictEqual(env.api.state().loginBlocked, true);
    assert.ok(env.notices.some((n) => /未登录/.test(n.msg)), JSON.stringify(env.notices));
    const before = env.requests.length;
    env.fireInterval(POLL_MS);
    await flushAll();
    assert.strictEqual(env.requests.length, before, "登录墙后不再发请求");
    env.api.setEnabled(false);
    env.dom.window.close();
    console.log("✓ C5 通过: 未登录停止轮询并如实提示");
}

async function testWatchFailureCooldownNoStorm() {
    const state = { taskList: { "1": { status: 2 } }, giftFails: true };
    const env = makeEnv({ handler: watchHandler(state) });
    setVisible(env, true);
    env.api.setEnabled(true);
    await flushAll();
    env.flushTimeouts();
    await flushAll(8);
    assert.strictEqual(env.countRequests("/gametask/takeGift").length, 1);
    assert.ok(env.api.state().claims === 1);
    // 冷却期内即使连续轮询也不该重复领取（防请求风暴）
    for (let i = 0; i < 5; i++) {
        env.fireInterval(POLL_MS);
        await flushAll(6);
    }
    assert.strictEqual(env.countRequests("/gametask/takeGift").length, 1, "冷却期内不得重复领取");
    assert.ok(env.warnings.some((w) => /看播积分/.test(w)), "失败要留线索: " + env.warnings.join("|"));
    void CLAIM_COOLDOWN_MS;
    env.api.setEnabled(false);
    env.dom.window.close();
    console.log("✓ C6 通过: 领取失败有冷却，不会每次轮询都重发");
}

async function testWatchCrossDayReset() {
    const state = { taskList: { "1": { status: 3 }, "2": { status: 3 } } };
    const env = makeEnv({ handler: watchHandler(state) });
    setVisible(env, true);
    env.api.setEnabled(true);
    await flushAll();
    env.flushTimeouts();
    await flushAll(8);
    assert.strictEqual(env.api.state().allDone, true);
    const giftsBefore = env.countRequests("/gametask/takeGift").length;
    env.api.state().date = "1999-01-01"; // 假装页面挂了一整天
    state.taskList = { "1": { status: 2 }, "2": { status: 3 } };
    state.afterClaim = { "1": { status: 3 }, "2": { status: 3 } };
    // 收工态下轮询定时器已被清掉，跨天由那个不发请求的自检定时器负责
    env.fireInterval(REARM_MS);
    await flushAll(8);
    assert.strictEqual(env.api.state().date, env.api.today(), "跨天要重置日期");
    assert.strictEqual(
        env.countRequests("/gametask/takeGift").length,
        giftsBefore + 1,
        "跨天后新的一天可领档位要重新领"
    );
    assert.strictEqual(env.api.state().claims, 1, "跨天后领取限额要清零重算");
    assert.strictEqual(env.api.state().allDone, true, "跨天领完应重新进入收工态");
    env.api.setEnabled(false);
    env.dom.window.close();
    console.log("✓ C7 通过: 跨天自动重置并重新领取，领完再收工");
}

async function testWatchBootRespectsSavedConfig() {
    const state = { taskList: { "1": { status: 3 }, "2": { status: 3 } } };
    const env = makeEnv({ handler: watchHandler(state) });
    env.win.localStorage.setItem("ExSave_SignConfig", JSON.stringify({ watchpoints: false }));
    env.api.boot();
    assert.strictEqual(env.api.state().enabled, false);
    assert.strictEqual(env.intervalCount(), 0, "没勾选就不该挂任何定时器（零开销）");

    env.win.localStorage.setItem("ExSave_SignConfig", JSON.stringify({ watchpoints: true }));
    env.api.boot();
    assert.strictEqual(env.api.state().enabled, true);
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
    assert.strictEqual(points.checked, true, "积分签到默认开");
    assert.strictEqual(watch.checked, false, "看播积分默认关（常驻项不替用户默认打开）");
    assert.strictEqual(doc.querySelectorAll(".sign-options-list .sign-checkbox").length, 7);

    const calls = [];
    env.api.patchSetEnabled((on) => calls.push(on));
    watch.checked = true;
    watch.dispatchEvent(new env.win.Event("change"));
    assert.strictEqual(JSON.parse(env.win.localStorage.getItem("ExSave_SignConfig")).watchpoints, true, "勾选要落盘");
    assert.deepStrictEqual(calls, [true], "勾选要立刻生效，不必等重开页面");

    const booted = [];
    env.api.patchInitPkgSignDom(() => {});
    env.api.patchBoot(() => booted.push(1));
    env.api.initPkgSign();
    assert.strictEqual(booted.length, 1, "initPkg_Sign 必须引导一次看播积分");
    env.dom.window.close();
    console.log("✓ D1 通过: 面板 7 项、看播开关即时生效并落盘、初始化会引导常驻逻辑");
}

async function testEngineSteps() {
    const env = makeEnv({
        handler: (url) => {
            if (url.indexOf("/gametask/config") >= 0) return { status: 200, body: goodConfig() };
            if (url.indexOf("/nc/sign/getStatus") >= 0) return { status: 200, body: { error: 0, data: { todaySigned: 1, signDays: 1, todayOffset: 0 } } };
            if (url.indexOf("/sign/takeBag") >= 0) return { status: 200, body: { error: 0 } };
            if (url.indexOf("/gametask/viewStatus") >= 0) return { status: 200, body: { error: 0, data: { startTime: 1, taskList: { "1": { status: 2 } } } } };
            if (url.indexOf("/gametask/takeGift") >= 0) return { status: 200, body: { error: 0, data: "" } };
            throw new Error("未预期的请求: " + url);
        },
    });
    const logs = [];
    const onLog = (m) => logs.push(m);
    // jsdom 默认 visibilityState 是 "prerender"（不是 "visible"），
    // 而项目约定（同 PictureInPictureControl）就是判 !== "visible"，所以这里显式置为可见
    setVisible(env, true);
    await env.api.executeSignEngine({ points: true, watchpoints: true }, onLog);
    await flushAll(8);
    const text = logs.join("\n");
    assert.ok(text.indexOf("今日已签到") >= 0, "积分签到要作为一键签到的一步跑: " + text);
    assert.ok(text.indexOf("自动领取已启动") >= 0, "勾了看播就该启动常驻轮询: " + text);
    assert.strictEqual(env.api.state().enabled, true);
    assert.strictEqual(env.countRequests("/gametask/takeGift").length, 1, "点开始签到时顺手把可领的领掉");

    await env.api.executeSignEngine({ watchpoints: false }, onLog);
    assert.strictEqual(env.api.state().enabled, false, "取消勾选要停掉轮询");
    env.dom.window.close();
    console.log("✓ D2 通过: 一键签到步骤接线（勾选即启动 / 取消即停）");
}

(async function main() {
    await testInPeriod();
    await testErrorClassification();
    await testPrizeText();
    await testSignHappyPath();
    await testSignAlreadySigned();
    await testSignFalseSuccess();
    await testSignLoginWall();
    await testSignOutOfPeriod();
    await testSignBenignBagCode();
    await testCsrfBootstrap();
    await testWatchClaimsAndGoesIdle();
    await testWatchNotClaimedWhenUnwatched();
    await testWatchIdleWhenAllClaimed();
    await testWatchHiddenPageNoRequests();
    await testWatchLoginWall();
    await testWatchFailureCooldownNoStorm();
    await testWatchCrossDayReset();
    await testWatchBootRespectsSavedConfig();
    await testPanelWiring();
    await testEngineSteps();
    console.log("=== 签到/看播领积分回归测试 20 组场景全部通过 ===");
})().catch((e) => {
    console.error("测试失败:", e && e.stack ? e.stack : e);
    process.exit(1);
});
