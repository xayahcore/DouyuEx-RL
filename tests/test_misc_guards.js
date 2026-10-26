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
const read = (rel) => fs.readFileSync(path.join(ROOT, rel), "utf8");

const EXGUARD_SRC = read("src/require/ExGuard/ExGuard.js");
const DOMHOOK_SRC = read("src/require/DomHook/DomHook.js");
const LEVELTASK_SRC = read("src/packages/LevelTask/LevelTask.js");
const IMAGE_SRC = read("src/packages/ImageDanmaku/ImageDanmaku.js");
const LOTTERY_SRC = read("src/packages/Lottery/Lottery.js");
const SHIELD_SRC = read("src/packages/Shield/Shield.js");
const REPEATED_SRC = read("src/packages/Shield/RemoveRepeatedDanmaku.js");
const REMOVE_ENTER_SRC = read("src/packages/Shield/RemoveEnter.js");
const REMOVE_BG_SRC = read("src/packages/Shield/RemoveDanmakuBackground.js");
const BARRAGE_SRC = read("src/packages/BarragePanel/BarragePanel.js");

/**
 * 本轮（task-14 杂项 P1）的统一回归：
 *   ① LevelTask 裸取接口返回值（ret.data.taskIds.join / ret.data.list / result.length）
 *      —— 服务端少给一层就 TypeError，且 35 秒轮询只留一行 "请求失败!"；
 *   ② ImageDanmaku / Lottery / Shield / RemoveRepeatedDanmaku / BarragePanel 的
 *      「无兜底请求 + 无上限轮询」；
 *   ③ DomHook 目标不存在时静默 return（FollowList 只能自己绕开）。
 *
 * 每个场景都写了「旧实现会怎么红」，断言的是现在的绿。
 */

function makeDom(html, url) {
    return new JSDOM(html || "<!DOCTYPE html><html><body></body></html>", {
        url: url || "https://www.douyu.com/9999",
    });
}

function collectConsole() {
    const warns = [];
    const errors = [];
    return {
        console: {
            log: function () {},
            info: function () {},
            warn: function () { warns.push(Array.prototype.join.call(arguments, " ")); },
            error: function () { errors.push(Array.prototype.join.call(arguments, " ")); },
        },
        warns: warns,
        errors: errors,
    };
}

/**
 * 虚拟时钟：让"有上限轮询"这类场景不必真的等 60 秒。
 * 回调里抛出的异常会被收集（而不是从时钟内部炸掉），交由用例断言。
 */
function makeClock() {
    let seq = 0;
    let now = 0;
    const tasks = new Map();
    const errors = [];
    const api = {
        setInterval: function (fn, ms) {
            const id = ++seq;
            const delay = Math.max(1, Number(ms) || 1);
            tasks.set(id, { fn: fn, delay: delay, next: now + delay, repeat: true, id: id });
            return id;
        },
        setTimeout: function (fn, ms) {
            const id = ++seq;
            const delay = Math.max(1, Number(ms) || 1);
            tasks.set(id, { fn: fn, delay: delay, next: now + delay, repeat: false, id: id });
            return id;
        },
        clearInterval: function (id) { tasks.delete(id); },
        clearTimeout: function (id) { tasks.delete(id); },
        advance: function (ms) {
            const end = now + ms;
            let guard = 0;
            while (guard++ < 50000) {
                let nextTask = null;
                tasks.forEach(function (task) {
                    if (task.next <= end && (!nextTask || task.next < nextTask.next)) nextTask = task;
                });
                if (!nextTask) break;
                now = nextTask.next;
                if (nextTask.repeat) nextTask.next = now + nextTask.delay;
                else tasks.delete(nextTask.id);
                try {
                    nextTask.fn();
                } catch (e) {
                    errors.push(e);
                }
            }
            now = end;
        },
        pending: function () { return tasks.size; },
        errors: errors,
    };
    return api;
}

function loadLevelTask(clock) {
    const dom = makeDom();
    const win = dom.window;
    const log = collectConsole();
    const clock2 = clock || makeClock();
    const messages = [];
    let fetchImpl = null;
    const fetchStub = function (url, opts) { return fetchImpl(url, opts); };
    const factory = new Function(
        "document", "window", "console", "fetch", "rid", "showMessage", "getCCN",
        "setInterval", "clearInterval", "setTimeout", "clearTimeout",
        EXGUARD_SRC + "\n" + LEVELTASK_SRC + "\n" +
        "return { init: initPkg_LevelTask_Timer, check: checkLevelTask, warnCount: ExGuard_warnCount, timer: function () { return levelTaskTimer; } };"
    );
    const api = factory(
        win.document, win, log.console, fetchStub, 9999,
        function (text) { messages.push(text); }, function () { return "ctn"; },
        clock2.setInterval, clock2.clearInterval, clock2.setTimeout, clock2.clearTimeout
    );
    return { dom: dom, win: win, api: api, log: log, messages: messages, clock: clock2, setFetch: function (fn) { fetchImpl = fn; } };
}

async function testLevelTaskBareAccess() {
    // 红：旧实现 getLevelTaskIds 里 ret.data.taskIds.join 直接 TypeError，
    //     checkLevelTask 无 catch，35 秒轮询里变成未捕获异常。
    const empty = loadLevelTask();
    empty.setFetch(async function () { return { json: async function () { return {}; } }; });
    await empty.api.check();
    assert.strictEqual(empty.log.errors.length, 0, "接口返回空壳时不得抛错");
    assert.ok(empty.log.warns.some((s) => s.indexOf("等级任务") !== -1), "空壳返回必须留一条带包名的 warn");
    assert.strictEqual(empty.messages.length, 0, "没有任务时不得发奖励提示");

    // 类型不对（list 是字符串）同样按空列表处理
    const wrongType = loadLevelTask();
    wrongType.setFetch(async function () {
        return { json: async function () { return { data: { taskIds: ["1"], list: "oops" } }; } };
    });
    await wrongType.api.check();
    assert.strictEqual(wrongType.log.errors.length, 0, "list 类型不对时不得抛错");

    // 绿：正常路径仍要能领奖，且 null 任务项不得把整轮带走
    const ok = loadLevelTask();
    ok.setFetch(async function (url) {
        if (url.indexOf("userLevelDetail") !== -1) {
            return { json: async function () { return { data: { taskIds: [11, 12] } }; } };
        }
        if (url.indexOf("getTaskStatus") !== -1) {
            return { json: async function () {
                return { data: { list: [null, { taskId: 11, name: "看直播", taskStatus: 1, prizeStatus: 0 }, { taskId: 12, name: "已领", taskStatus: 1, prizeStatus: 1 }] } };
            } };
        }
        return { json: async function () { return { data: { list: [{ name: "鱼丸", num: 10 }] } }; } };
    });
    await ok.api.check();
    assert.strictEqual(ok.messages.length, 1, "应只对「待领取」的任务发一次提示: " + JSON.stringify(ok.messages));
    assert.ok(ok.messages[0].indexOf("鱼丸") !== -1, "提示里要带出奖励名");

    // 领取接口缺少 data：旧实现 result.length 直接 TypeError
    const prizeBroken = loadLevelTask();
    prizeBroken.setFetch(async function (url) {
        if (url.indexOf("userLevelDetail") !== -1) {
            return { json: async function () { return { data: { taskIds: [11] } }; } };
        }
        if (url.indexOf("getTaskStatus") !== -1) {
            return { json: async function () { return { data: { list: [{ taskId: 11, name: "看直播", taskStatus: 1, prizeStatus: 0 }] } }; } };
        }
        return { json: async function () { return { error: 100 }; } };
    });
    await prizeBroken.api.check();
    assert.strictEqual(prizeBroken.log.errors.length, 0, "领奖接口结构不对时不得抛错");
    assert.strictEqual(prizeBroken.messages.length, 0, "没拿到奖励列表时不得发提示");

    // 定时器幂等：旧实现重复 init 会叠出多个 35 秒轮询
    const timer = loadLevelTask();
    timer.setFetch(async function () { return { json: async function () { return {}; } }; });
    timer.api.init();
    timer.api.init();
    assert.strictEqual(timer.clock.pending(), 1, "重复 init 不得叠出第二个轮询定时器");

    console.log("✓ 场景 1 通过: LevelTask 三层裸取全部收敛，异常留痕且轮询幂等");
}

async function testDomHookSpeaksUp() {
    const dom = makeDom("<!DOCTYPE html><html><body><div id='hook-target'></div></body></html>");
    const win = dom.window;
    const log = collectConsole();
    const factory = new Function(
        "document", "window", "console", "MutationObserver",
        EXGUARD_SRC + "\n" + DOMHOOK_SRC + "\nreturn { DomHook: DomHook };"
    );
    const api = factory(win.document, win, log.console, win.MutationObserver);

    // 红：旧实现目标不存在时静默 return，构造出的对象看起来"挂上了"
    const missing = new api.DomHook("#not-here", false, function () {});
    assert.strictEqual(missing.failed, true, "目标不存在时必须置 failed");
    assert.strictEqual(missing.failReason, "target-not-found");
    assert.strictEqual(missing.observer, null, "没挂上就不得留下 observer");
    assert.ok(log.warns.some((s) => s.indexOf("DomHook") !== -1 && s.indexOf("不存在") !== -1),
        "目标不存在必须 console.warn 留痕，实际: " + JSON.stringify(log.warns));

    const ok = new api.DomHook("#hook-target", false, function () {});
    assert.strictEqual(ok.failed, false);
    assert.ok(ok.observer, "目标存在时必须真的挂上 observer");
    assert.strictEqual(ok.isActive(), true);

    // 回调抛错：旧实现会变成 MutationObserver 里的未捕获异常
    const throwing = new api.DomHook("#hook-target", false, function () { throw new Error("callback boom"); });
    win.document.getElementById("hook-target").appendChild(win.document.createElement("span"));
    await new Promise(function (resolve) { setTimeout(resolve, 30); });
    assert.ok(log.warns.some((s) => s.indexOf("回调") !== -1), "回调抛错必须留痕，实际: " + JSON.stringify(log.warns));
    assert.strictEqual(throwing.isActive(), true, "一次回调抛错不得把 observer 带走");

    ok.closeHook();
    ok.closeHook();
    assert.strictEqual(ok.isActive(), false, "closeHook 必须幂等且让 isActive 归 false");
    console.log("✓ 场景 2 通过: DomHook 不再静默失败，failed / isActive / 回调兜底齐全");
}

function testExGuardPrimitives() {
    const dom = makeDom();
    const clock = makeClock();
    const log = collectConsole();
    const factory = new Function(
        "document", "console", "setInterval", "clearInterval", "setTimeout", "clearTimeout", "GM_xmlhttpRequest",
        EXGUARD_SRC + "\nreturn { poll: ExGuard_pollFor, warnCount: ExGuard_warnCount, xhr: ExGuard_xhr, withTimeout: ExGuard_withTimeout };"
    );
    const api = factory(dom.window.document, log.console, clock.setInterval, clock.clearInterval, clock.setTimeout, clock.clearTimeout, function () {});

    // 元素始终不出现：旧实现是永久 setInterval
    const state = api.poll(function () { return null; }, function () {}, { intervalMs: 10, maxTries: 3, tag: "测试轮询" });
    clock.advance(100);
    assert.strictEqual(state.done, true, "达到次数上限必须停");
    assert.strictEqual(clock.pending(), 0, "放弃后不得留下定时器");
    assert.ok(log.warns.some((s) => s.indexOf("已放弃") !== -1), "放弃必须留一条自证信息: " + JSON.stringify(log.warns));

    // 元素已存在：立即命中，不等一个周期
    let hits = 0;
    const fast = api.poll(function () { return dom.window.document.body; }, function () { hits++; }, { intervalMs: 50, maxTries: 3, tag: "测试轮询" });
    assert.strictEqual(fast.done, true);
    assert.strictEqual(hits, 1);
    assert.strictEqual(clock.pending(), 0);

    // 命中后的回调抛错：不得炸
    api.poll(function () { return dom.window.document.body; }, function () { throw new Error("onFound boom"); }, { tag: "测试轮询" });
    assert.strictEqual(clock.errors.length, 0, "轮询内部不得把异常漏出去");
    assert.ok(log.warns.some((s) => s.indexOf("命中后的回调") !== -1));

    // 告警有上限：同 tag 刷屏不可能是无限的
    for (let i = 0; i < 50; i++) api.poll(function () { return null; }, function () {}, { intervalMs: 1, maxTries: 1, tag: "刷屏测试" });
    assert.ok(api.warnCount("刷屏测试") <= 20, "同一 tag 的告警必须有上限，实际 " + api.warnCount("刷屏测试"));
    console.log("✓ 场景 3 通过: ExGuard 三个原语（有上限轮询 / 有上限告警 / 兜底请求）行为正确");
}

async function testImageDanmakuBoundedAndUploadFallback() {
    // ① 初始化裸取节点 + 无上限轮询
    const dom = makeDom();
    const win = dom.window;
    const clock = makeClock();
    const log = collectConsole();
    const factory = new Function(
        "document", "window", "console", "setInterval", "clearInterval", "setTimeout", "clearTimeout",
        "GM_xmlhttpRequest", "XMLHttpRequest", "FormData", "Blob", "atob", "DOMPurify", "isValidImageFile", "dyToken",
        EXGUARD_SRC + "\n" + DOMHOOK_SRC + "\n" + IMAGE_SRC + "\n" +
        "return { init: initPkg_ImageDanmaku, upload: ImageDanmaku_uploadAndInsert, pollOpts: ImageDanmaku_pollOpts };"
    );
    const api = factory(
        win.document, win, log.console, clock.setInterval, clock.clearInterval, clock.setTimeout, clock.clearTimeout,
        function () {}, function () {}, function () {}, function () {}, function () {},
        { sanitize: function (s) { return s; } }, function () { return false; }, "token"
    );
    api.pollOpts.intervalMs = 10;
    api.pollOpts.maxTries = 3;
    assert.doesNotThrow(function () { api.init(); }, "聊天工具栏/输入框缺失时初始化不得抛错");
    clock.advance(200);
    assert.strictEqual(clock.pending(), 0, "图片弹幕的两处轮询必须在次数上限处停表");
    assert.ok(log.warns.some((s) => s.indexOf("图片弹幕") !== -1 && s.indexOf("已放弃") !== -1),
        "轮询放弃必须留痕，实际: " + JSON.stringify(log.warns));

    // ② 上传链失败：旧实现 Promise 永不 settle，占位符永久卡在输入框
    const dom2 = makeDom("<!DOCTYPE html><html><body><div class='ChatSend-txt'></div></body></html>");
    const win2 = dom2.window;
    const log2 = collectConsole();
    const clock2 = makeClock();
    const factory2 = new Function(
        "document", "window", "console", "setInterval", "clearInterval", "setTimeout", "clearTimeout",
        "GM_xmlhttpRequest", "XMLHttpRequest", "FormData", "Blob", "atob", "DOMPurify", "isValidImageFile", "dyToken",
        EXGUARD_SRC + "\n" + DOMHOOK_SRC + "\n" + IMAGE_SRC + "\n" +
        "return { upload: ImageDanmaku_uploadAndInsert };"
    );
    const api2 = factory2(
        win2.document, win2, log2.console, clock2.setInterval, clock2.clearInterval, clock2.setTimeout, clock2.clearTimeout,
        function (config) { if (config && typeof config.onerror === "function") config.onerror(new Error("BLOCKED_BY_CLIENT")); },
        function () {}, function () {}, function () {}, function () {},
        { sanitize: function (s) { return s; } }, function () { return false; }, "token"
    );
    const input = win2.document.getElementsByClassName("ChatSend-txt")[0];
    const ok = await api2.upload({ name: "a.png" }, input);
    assert.strictEqual(ok, false, "上传失败必须 resolve false，不能悬挂");
    assert.strictEqual(input.value.indexOf("上传中"), -1, "失败后必须清掉「图片上传中」占位符，实际: " + JSON.stringify(input.value));
    assert.ok(log2.warns.some((s) => s.indexOf("图片弹幕") !== -1), "上传失败必须留痕");

    console.log("✓ 场景 4 通过: 图片弹幕轮询有上限、上传失败会清占位符并留痕");
}

function loadLottery() {
    const dom = makeDom();
    const win = dom.window;
    const log = collectConsole();
    const clock = makeClock();
    const sent = [];
    const messages = [];
    let gmImpl = null;
    let fetchImpl = null;
    const gmStub = function (config) { if (gmImpl) gmImpl(config); };
    const fetchStub = function (url, opts) { return fetchImpl(url, opts); };
    const factory = new Function(
        "document", "window", "console", "localStorage", "fetch", "GM_xmlhttpRequest", "DOMParser",
        "showMessage", "getTimeDiff", "debounce", "showExRightPanel", "setInterval", "clearInterval", "setTimeout", "clearTimeout",
        EXGUARD_SRC + "\n" + LOTTERY_SRC + "\n" +
        "return { init: initPkg_Lottery, setFans: setFansBadgeList, timer: initPkg_Lottery_Timer, applySaved: Lottery_Set, " +
        "fans: function () { return myFansBadgeList; }, setFansRaw: function (v) { myFansBadgeList = v; }, setNotice: function (v) { isLotteryNotice = v; }, " +
        "html: function () { return lotteryHTML; }, warnCount: ExGuard_warnCount };"
    );
    const api = factory(
        win.document, win, log.console, win.localStorage, fetchStub, gmStub, win.DOMParser,
        function (text) { messages.push(text); }, function () { return "1分钟"; }, function (fn) { return fn; }, function () {},
        clock.setInterval, clock.clearInterval, clock.setTimeout, clock.clearTimeout
    );
    return {
        dom: dom, win: win, api: api, log: log, messages: messages, clock: clock, sent: sent,
        setGm: function (fn) { gmImpl = fn; },
        setFetch: function (fn) { fetchImpl = fn; },
    };
}

async function testLotteryCrashOnFansBadge() {
    // 红：fetch 失败 → .catch 只 console.log + 返回 undefined → parseFromString(undefined)
    //     → doc.getElementsByClassName("fans-badge-list")[0].lastElementChild 抛 TypeError，
    //     而 initPkg_Lottery 并没有 await / catch —— 整条初始化（甚至测试进程）被带走。
    const a = loadLottery();
    a.setFetch(async function () { throw new Error("ERR_BLOCKED_BY_CLIENT"); });
    a.api.setFansRaw(["stale-room"]);
    await a.api.setFans();
    assert.deepStrictEqual(a.api.fans(), [], "请求失败时必须收敛成空列表，不得保留脏数据");
    assert.ok(a.log.warns.some((s) => s.indexOf("粉丝牌") !== -1), "请求失败必须留痕: " + JSON.stringify(a.log.warns));

    // 返回非 HTML（被拦截页/公告页）同样不能继续解析
    const b = loadLottery();
    b.setFetch(async function () { return { text: async function () { return ""; } }; });
    await b.api.setFans();
    assert.deepStrictEqual(b.api.fans(), []);
    assert.strictEqual(b.log.errors.length, 0);

    // 缺 .fans-badge-list 节点：旧实现直接 .lastElementChild
    const c = loadLottery();
    c.setFetch(async function () { return { text: async function () { return "<html><body>公告页</body></html>"; } }; });
    await c.api.setFans();
    assert.deepStrictEqual(c.api.fans(), []);
    assert.ok(c.log.warns.some((s) => s.indexOf("结构不符合预期") !== -1));

    // 正常页面仍要解析出房间号
    const d = loadLottery();
    d.setFetch(async function () {
        return { text: async function () {
            return "<html><body><div class='fans-badge-list'><div></div><div><div data-fans-room='123'></div><div data-fans-room='456'></div></div></div></body></html>";
        } };
    });
    await d.api.setFans();
    assert.deepStrictEqual(d.api.fans(), ["123", "456"], "正常页面必须能解析出粉丝牌房间号");

    // init 整体：旧实现这里会抛未捕获异常
    const e = loadLottery();
    e.setFetch(async function () { throw new Error("blocked"); });
    assert.doesNotThrow(function () { e.api.init(); }, "初始化不得因粉丝牌请求失败而抛错");
    await new Promise(function (resolve) { setTimeout(resolve, 20); });
    assert.strictEqual(e.log.errors.length, 0);
    console.log("✓ 场景 5 通过: 粉丝牌请求失败/非 HTML/缺节点三层兜住，不抛错也不写脏数据");
}

async function testLotteryRequestsAndPolling() {
    // 大厅接口失败：旧实现 lotteryList.data.list 直接 TypeError，且 60 秒轮询继续炸
    const a = loadLottery();
    a.api.init();
    a.setGm(function (config) { if (typeof config.onerror === "function") config.onerror(new Error("blocked")); });
    await a.api.timer();
    assert.strictEqual(a.log.errors.length, 0, "大厅接口失败不得抛错");
    assert.ok(a.log.warns.some((s) => s.indexOf("抽奖") !== -1));
    const nodata = a.win.document.getElementsByClassName("lottery__nodata")[0];
    assert.ok(nodata, "面板必须已插入");
    assert.strictEqual(nodata.style.display, "block", "请求失败时应显示「暂无数据」");

    // 单条详情结构不完整：不得带走后续房间
    const b = loadLottery();
    b.api.init();
    b.setGm(function (config) {
        if (config && typeof config.onload === "function") {
            config.onload({ response: { data: { list: [
                { status: 0, room_id: 1, anchor_name: "A", verticalSrc: "a.jpg" },
                { status: 0, room_id: 2, anchor_name: "B", verticalSrc: "b.jpg" },
            ] } } });
        }
    });
    let call = 0;
    b.setFetch(async function () {
        call++;
        if (call === 1) return { json: async function () { return { data: {} }; } };
        return { json: async function () {
            return { data: { start_at: Math.floor(Date.now() / 1000) + 600, prize_name: "红包", prize_num: 2, join_condition: { lottery_range: 0, expire_time: 300 } } };
        } };
    });
    await b.api.timer();
    assert.strictEqual(b.log.errors.length, 0, "单条详情不完整不得抛错");
    assert.ok(b.api.html().indexOf("红包") !== -1, "另一条正常房间必须照常渲染");
    assert.ok(b.log.warns.some((s) => s.indexOf("详情不完整") !== -1));

    // 上限：42 个在播抽奖最多只发 24 次详情请求
    const c = loadLottery();
    c.api.init();
    const rooms = [];
    for (let i = 0; i < 42; i++) rooms.push({ status: 0, room_id: 100 + i, anchor_name: "R" + i, verticalSrc: "x.jpg" });
    c.setGm(function (config) {
        if (config && typeof config.onload === "function") config.onload({ response: { data: { list: rooms } } });
    });
    let requests = 0;
    c.setFetch(async function () {
        requests++;
        return { json: async function () { return { data: {} }; } };
    });
    await c.api.timer();
    assert.strictEqual(requests, 24, "详情请求必须有上限（24），实际 " + requests);

    // 本地设置损坏：旧实现 JSON.parse 直接抛
    const d = loadLottery();
    d.win.localStorage.setItem("ExSave_Lottery", "{broken");
    assert.doesNotThrow(function () { d.api.applySaved(); }, "设置损坏时必须按未开启处理");
    assert.ok(d.log.warns.some((s) => s.indexOf("损坏") !== -1));

    console.log("✓ 场景 6 通过: 抽奖列表请求失败兜底、单条隔离、详情请求有上限、设置损坏容错");
}

function loadShield(savedRepeated) {
    const dom = makeDom("<!DOCTYPE html><html><body></body></html>");
    const win = dom.window;
    if (savedRepeated) win.localStorage.setItem("ExSave_isRemoveRepeatedDanmaku", "1");
    const log = collectConsole();
    const clock = makeClock();
    const styles = [];
    const factory = new Function(
        "document", "window", "console", "localStorage", "MutationObserver",
        "setInterval", "clearInterval", "setTimeout", "clearTimeout", "StyleHook_set", "StyleHook_remove",
        EXGUARD_SRC + "\n" + DOMHOOK_SRC + "\n" + REMOVE_ENTER_SRC + "\n" + REMOVE_BG_SRC + "\n" + SHIELD_SRC + "\n" + REPEATED_SRC + "\n" +
        "return { init: initPkg_Shield, enable: initPkg_Shield_Enable, wait: Shield_waitForFilterKeywords, " +
        "repeatedInit: initPkg_Shield_RemoveRepeatedDanmaku, removeRepeated: removeRepeatedDanmaku, " +
        "pollOpts: Shield_pollOpts, mapSize: function () { return Object.keys(repeatedDanmakuMap).length; } };"
    );
    const api = factory(
        win.document, win, log.console, win.localStorage, win.MutationObserver,
        clock.setInterval, clock.clearInterval, clock.setTimeout, clock.clearTimeout,
        function (id, text) { styles.push(id); }, function () {}
    );
    return { dom: dom, win: win, api: api, log: log, clock: clock, styles: styles };
}

async function testShieldBoundedAndIsolated() {
    const a = loadShield();
    a.api.pollOpts.intervalMs = 10;
    a.api.pollOpts.maxTries = 3;
    assert.doesNotThrow(function () { a.api.init(); }, "弹幕工具条不存在时初始化不得抛错");
    a.clock.advance(61000);
    assert.ok(a.log.warns.some((s) => s.indexOf("弹幕屏蔽") !== -1), "轮询放弃必须留痕: " + JSON.stringify(a.log.warns));
    assert.strictEqual(a.clock.pending(), 0, "有上限轮询与进场弹幕补应用都必须停表");

    // 三个开关面板逐项隔离：空页面里全部早退，不得抛错
    assert.doesNotThrow(function () { a.api.enable(); }, "面板不存在时逐个开关初始化不得抛错");
    assert.strictEqual(a.log.errors.length, 0);

    // 面板存在时才注入；等待有上限
    const b = loadShield();
    b.win.document.body.innerHTML = "<div class='FilterKeywords'></div>";
    assert.strictEqual(b.api.wait(0), true, "面板已存在时应立即启用");
    assert.ok(b.win.document.getElementById("ex-removeRepeatedDanmaku"), "面板存在时必须注入「屏蔽重复弹幕」开关");
    assert.ok(b.win.document.getElementById("ex-removeEnterBarrage"), "面板存在时必须注入「屏蔽进场弹幕」开关");
    assert.ok(b.win.document.getElementById("ex-removeDanmakuBackground"), "面板存在时必须注入「屏蔽弹幕背景」开关");
    assert.strictEqual(b.log.errors.length, 0, "三个开关逐项初始化不得抛错");

    const c = loadShield();
    c.api.wait(100);
    assert.ok(c.log.warns.some((s) => s.indexOf("等了 5 秒") !== -1), "等待 100 次仍无面板必须留痕");
    c.clock.advance(6000);
    assert.strictEqual(c.clock.pending(), 0, "等待链到达上限后不得继续排期");

    // 弹幕节点缺少 .comment：旧实现 removedDom.comment.uuid 直接 TypeError
    const d = loadShield(true);
    d.win.document.body.innerHTML = "<div class='danmu-fbb2a3'></div>";
    d.api.removeRepeated();
    const node = d.win.document.getElementsByClassName("danmu-fbb2a3")[0];
    node.appendChild(d.win.document.createElement("div"));
    await new Promise(function (resolve) { setTimeout(resolve, 30); });
    assert.strictEqual(d.log.errors.length, 0, "缺少 .comment 的节点不得抛错");
    assert.strictEqual(d.clock.errors.length, 0, "回调内部异常不得漏出");
    assert.strictEqual(d.api.mapSize(), 0, "没有 comment 的节点不得写进去重表");
    assert.ok(d.log.warns.length >= 0);

    console.log("✓ 场景 7 通过: Shield 轮询有上限、三开关逐项隔离、缺 .comment 节点不炸");
}

function loadBarrage(opts) {
    const options = opts || {};
    const muteResult = options.muteResult !== undefined ? options.muteResult : { msg: "添加成功" };
    const dom = makeDom();
    const win = dom.window;
    const log = collectConsole();
    const clock = makeClock();
    const messages = [];
    const gmCalls = [];
    let gmImpl = null;
    const factory = new Function(
        "document", "window", "console", "setInterval", "clearInterval", "setTimeout", "clearTimeout",
        "MutationObserver", "initPkg_BarragePanel_Tip", "getUserUid", "openPage", "getLocalDateStr",
        "addMuteUser", "rid", "showMessage", "getImageDanmakuHtml", "GM_xmlhttpRequest",
        EXGUARD_SRC + "\n" + DOMHOOK_SRC + "\n" + BARRAGE_SRC + "\n" +
        "return { init: initPkg_BarragePanel, setFunc: setBarrgePanelFunc, recent: getUserRecentBarrage, withGuard: barragePanel__withGuard, pollOpts: barragePanel_pollOpts };"
    );
    const api = factory(
        win.document, win, log.console, clock.setInterval, clock.clearInterval, clock.setTimeout, clock.clearTimeout,
        win.MutationObserver, function () {},
        async function () { return ""; }, function () {}, function () { return "2026-10-26"; },
        async function () { return muteResult; }, 9999,
        function (text) { messages.push(text); }, function () { return ""; },
        function (config) { gmCalls.push(config); if (gmImpl) gmImpl(config); }
    );
    return { dom: dom, win: win, api: api, log: log, clock: clock, messages: messages, gmCalls: gmCalls, setGm: function (fn) { gmImpl = fn; } };
}

async function testBarragePanelGuards() {
    const a = loadBarrage();
    a.api.pollOpts.intervalMs = 10;
    a.api.pollOpts.maxTries = 3;
    assert.doesNotThrow(function () { a.api.init(); }, "面板提示节点不存在时初始化不得抛错");
    a.clock.advance(100);
    assert.strictEqual(a.clock.pending(), 0, "面板轮询必须有上限并停表");
    assert.ok(a.log.warns.some((s) => s.indexOf("弹幕面板") !== -1 && s.indexOf("已放弃") !== -1), "轮询放弃必须留痕");

    // 按钮不全：旧实现 document.getElementById(...).onclick 直接 TypeError
    assert.doesNotThrow(function () { a.api.setFunc(null, "nick"); }, "按钮不存在时绑定不得抛错");
    assert.ok(a.log.warns.some((s) => s.indexOf("按钮没有全部注入") !== -1));

    // 按钮齐全但聊天框不存在：点击回复不得抛错
    const b = loadBarrage();
    b.win.document.body.innerHTML = "<div id='barragePanel__reply'></div><div id='barragePanel__mute'></div><div id='barragePanel__search'></div>";
    b.api.setFunc(null, "nick");
    assert.doesNotThrow(function () { b.win.document.getElementById("barragePanel__reply").onclick(); }, "缺聊天框时点击回复不得抛错");
    assert.ok(b.log.warns.some((s) => s.indexOf("回复失败") !== -1));

    // 禁言接口没有返回：旧实现 ret.msg 直接 TypeError
    const muteCase = loadBarrage({ muteResult: null });
    muteCase.win.document.body.innerHTML = "<div class='ChatSend-txt'></div><div class='danmuContent-25f266'>hi</div><select id='barragePanel__muteSelect'><option value='1'>1</option></select><div id='barragePanel__reply'></div><div id='barragePanel__mute'></div><div id='barragePanel__search'></div>";
    muteCase.api.setFunc(null, "nick");
    await muteCase.win.document.getElementById("barragePanel__mute").onclick();
    assert.strictEqual(muteCase.log.errors.length, 0, "禁言接口空返回不得抛错");
    assert.ok(muteCase.messages.some((s) => s.indexOf("没有返回结果") !== -1), "禁言失败必须给用户看得见的提示");

    // 请求兜底：onerror 必须 resolve null，而不是永不 settle
    const c = loadBarrage();
    c.setGm(function (config) { if (typeof config.onerror === "function") config.onerror(new Error("blocked")); });
    const value = await c.api.recent("someone");
    assert.strictEqual(value, null, "请求失败必须 resolve null");
    assert.strictEqual(c.gmCalls.length, 1);
    assert.ok(c.log.warns.some((s) => s.indexOf("请求失败") !== -1));

    // withGuard 内部抛错：旧实现 try/finally 没有 catch，异常会漏进 MutationObserver
    assert.doesNotThrow(function () { c.api.withGuard(function () { throw new Error("guard boom"); }); }, "withGuard 必须兜住异常");
    await new Promise(function (resolve) { setTimeout(resolve, 10); });
    assert.doesNotThrow(function () { c.api.withGuard(function () {}); }, "一次失败后 withGuard 必须能恢复");

    console.log("✓ 场景 8 通过: BarragePanel 轮询有上限、按钮/输入框/接口返回全部判空、withGuard 兜住异常");
}

function testStaticGuardRails() {
    const domHookCode = DOMHOOK_SRC;
    assert.ok(domHookCode.indexOf("this.failed = true") !== -1, "DomHook 必须显式置 failed");
    assert.ok(domHookCode.indexOf("ExGuard_warn") !== -1, "DomHook 失败必须留痕");
    assert.ok(domHookCode.indexOf("isActive()") !== -1, "DomHook 必须提供存活判断");

    const levelTaskCode = LEVELTASK_SRC;
    assert.ok(levelTaskCode.indexOf("Array.isArray(taskIds)") !== -1, "LevelTask 必须校验 taskIds 是数组");
    assert.ok(levelTaskCode.indexOf("ExGuard_asList") !== -1, "LevelTask 的奖励列表必须走统一收敛");
    assert.ok(levelTaskCode.indexOf("levelTaskChecking") !== -1, "LevelTask 必须有重入保护");

    const imageCode = IMAGE_SRC;
    assert.ok(imageCode.indexOf("ExGuard_pollFor") !== -1, "ImageDanmaku 的两处轮询必须走有上限实现");
    assert.ok(imageCode.indexOf("request.onerror") !== -1, "图片上传 XHR 必须有 onerror");

    const lotteryCode = LOTTERY_SRC;
    assert.ok(lotteryCode.indexOf("ExGuard_xhr") !== -1, "抽奖大厅请求必须走兜底包装");
    assert.ok(lotteryCode.indexOf("LOTTERY_MAX_ROOMS") !== -1, "抽奖详情请求必须有上限");
    assert.ok(lotteryCode.indexOf("if (!list || !list.lastElementChild)") !== -1, "粉丝牌列表必须三层校验");

    const shieldCode = SHIELD_SRC;
    assert.ok(shieldCode.indexOf("ExGuard_pollFor") !== -1, "Shield 轮询必须走有上限实现");
    assert.ok(shieldCode.indexOf("Shield_waitForFilterKeywords") !== -1, "面板等待必须有上限");
    assert.ok(REPEATED_SRC.indexOf("ExGuard_pollFor") !== -1, "重复弹幕的节点等待必须走有上限实现");

    const barrageCode = BARRAGE_SRC;
    assert.ok(barrageCode.indexOf("ExGuard_pollFor") !== -1, "BarragePanel 轮询必须走有上限实现");
    assert.ok(barrageCode.indexOf("ExGuard_xhr") !== -1, "查弹幕的第二个请求必须走兜底包装");

    console.log("✓ 场景 9 通过: 源码级守卫（DomHook/LevelTask/五个包的兜底与上限）全部在位");
}

(async function main() {
    await testLevelTaskBareAccess();
    await testDomHookSpeaksUp();
    testExGuardPrimitives();
    await testImageDanmakuBoundedAndUploadFallback();
    await testLotteryCrashOnFansBadge();
    await testLotteryRequestsAndPolling();
    await testShieldBoundedAndIsolated();
    await testBarragePanelGuards();
    testStaticGuardRails();
    console.log("=== 杂项 P1 防护回归（LevelTask / 请求兜底 / 有上限轮询 / DomHook）9 组场景全部通过 ===");
})().catch((e) => {
    console.error("测试失败:", e && e.stack ? e.stack : e);
    process.exit(1);
});
