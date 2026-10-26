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

const COMMON_SRC = read("src/common.js");
const EXGUARD_SRC = read("src/require/ExGuard/ExGuard.js");
const MENU_SRC = read("src/packages/Menu/Menu.js");
const NOLOGIN_SRC = read("src/packages/NoLogin/NoLogin.js");
const DANMAKUTAIL_SRC = read("src/packages/DanmakuTail/DanmakuTail.js");
const FANSBADGE_SRC = read("src/packages/FansBadgeList/FansBadgeList.js");
const ROOMVIP_SRC = read("src/packages/RoomVip/RoomVip.js");
const LASTLIVETIME_SRC = read("src/packages/LastLiveTime/LastLiveTime.js");
const MONTHCOST_SRC = read("src/packages/MonthCost/MonthCost.js");
const CHATMEMORY_SRC = read("src/packages/ChatTools/ChatMemory/ChatMemory.js");
const MAIN_SRC = read("src/main.js");

/**
 * task-17 的统一回归：
 *   ① common.js 两处历史死代码（verifyFans 首行 return true / getUserName 无调用方）
 *      —— 门禁不许动，但也不许再留裸解引用的雷；
 *   ② 「按钮点了没反应 / 一直显示加载中」这一类死路扫查里能确定修的那些：
 *      Menu 的检查更新菜单、DanmakuTail 坏设置与聊天框迟到、FansBadgeList 缺列、
 *      RoomVip 坏 JSON 与插入失败、MonthCost 限流无限重试与未捕获 rejection、
 *      ChatMemory 聊天框迟到与空记忆。
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

/** 虚拟时钟：让「有上限轮询」不必真的等 10 秒 */
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

/** 从 common.js 里切出被各包依赖的底座函数（与线上同一份实现，不写镜像） */
function sliceSource(src, startMarker, endMarker, label) {
    const start = src.indexOf(startMarker);
    assert.ok(start !== -1, "未能在 common.js 定位 " + (label || startMarker) + "，测试需同步更新");
    const end = src.indexOf(endMarker, start);
    assert.ok(end !== -1, "未能在 common.js 定位 " + endMarker + "，测试需同步更新");
    return src.slice(start, end);
}

// 与 test_dead_source 同一套思路：只禁"代码里还在用"，注释保留来龙去脉
function stripComments(src) {
    return String(src).replace(/\/\*[\s\S]*?\*\//g, " ").replace(/^\s*\/\/.*$/gm, " ");
}

const DATEFORMAT_SRC = sliceSource(COMMON_SRC, "function dateFormat(fmt, date) {", "function timeago(old) {", "dateFormat");
const GETVALIDDOM_SRC = sliceSource(COMMON_SRC, "function getValidDom(queryList) {", "function getValidDomList(queryList) {", "getValidDom");
const TEXTAREA_POS_SRC = sliceSource(COMMON_SRC, "function getTextareaPosition(element) {", "function showExRightPanel(", "getTextareaPosition");

const VERIFY_GATE = "\treturn true; // 2020年12月22日18:28:18\n";

/* ------------------------------------------------------------------ */
/* 场景 1: common.js verifyFans（门禁常开 + 三层判空）                 */
/* ------------------------------------------------------------------ */

function loadCommon(opts) {
    const options = opts || {};
    const dom = makeDom();
    const win = dom.window;
    const log = collectConsole();
    const clock = makeClock();
    let src = COMMON_SRC;
    if (options.openGate) {
        assert.ok(src.indexOf(VERIFY_GATE) !== -1,
            "verifyFans 的常开门禁（首行 return true）不见了，测试与源码需同步");
        src = src.replace(VERIFY_GATE, "");
    }
    const factory = new Function(
        "window", "document", "location", "unsafeWindow",
        "setTimeout", "clearTimeout", "setInterval", "clearInterval",
        "fetch", "DOMParser", "console",
        src + "\nreturn { verifyFans: verifyFans, getUserName: getUserName };"
    );
    const api = factory(
        win, win.document, win.location, win,
        clock.setTimeout, clock.clearTimeout, clock.setInterval, clock.clearInterval,
        options.fetch || function () { return Promise.reject(new Error("no fetch")); },
        win.DOMParser, log.console
    );
    return { dom: dom, win: win, api: api, log: log, clock: clock };
}

function fansListHtml(inner) {
    return "<html><body><div class='fans-badge-list'><div></div><div>" + inner + "</div></div></body></html>";
}

function respondWith(html) {
    return function () {
        return Promise.resolve({ text: function () { return Promise.resolve(html); } });
    };
}

async function testVerifyFansGate() {
    // ① 门禁不许动：不做任何校验也必须返回 true（ExpandTool 的红包/宝箱靠它放行）
    const gate = loadCommon({ fetch: function () { return Promise.reject(new Error("blocked")); } });
    assert.strictEqual(await gate.api.verifyFans("5189167", 9), true, "门禁必须常开（首行 return true）");

    // ② 把门禁拿掉之后，下面那段历史实现必须自己扛住：不再裸解引用
    const broken = loadCommon({ openGate: true, fetch: function () { return Promise.reject(new Error("blocked")); } });
    assert.strictEqual(await broken.api.verifyFans("5189167", 9), false, "请求失败时不得抛错，按「不是粉丝」处理");
    assert.strictEqual(broken.log.errors.length, 0, "请求失败不得留下未处理异常");

    const noList = loadCommon({ openGate: true, fetch: respondWith("<html><body>公告页</body></html>") });
    assert.strictEqual(await noList.api.verifyFans("5189167", 9), false, "缺 .fans-badge-list 时不得抛错");

    const emptyList = loadCommon({ openGate: true, fetch: respondWith("<html><body><div class='fans-badge-list'></div></body></html>") });
    assert.strictEqual(await emptyList.api.verifyFans("5189167", 9), false, "列表为空（lastElementChild 为 null）时不得抛错");

    const hit = loadCommon({
        openGate: true,
        fetch: respondWith(fansListHtml("<div data-fans-room='5189167' data-fans-level='9'></div>")),
    });
    assert.strictEqual(await hit.api.verifyFans("5189167", 9), true, "真结构仍要能判成粉丝（功能不能被判空吃掉）");

    const miss = loadCommon({
        openGate: true,
        fetch: respondWith(fansListHtml("<div data-fans-room='111' data-fans-level='3'></div>")),
    });
    assert.strictEqual(await miss.api.verifyFans("5189167", 9), false, "不匹配时必须返回 false");

    console.log("✓ 场景 1 通过: verifyFans 门禁常开照旧，门禁拿掉后三层判空也不抛");
}

async function testGetUserNameAlwaysSettles() {
    // 红：旧实现 uname_con[0].title 取空 → TypeError → catch 只打日志 → Promise 永不 settle，
    //     调用方的 .then 再也不会执行（"一直加载中"）。
    const withTimeout = function (promise, label) {
        return Promise.race([
            promise,
            new Promise(function (_, reject) {
                setTimeout(function () { reject(new Error(label + " 超时：Promise 永不 settle")); }, 1500);
            }),
        ]);
    };

    const failed = loadCommon({ fetch: function () { return Promise.reject(new Error("blocked")); } });
    assert.strictEqual(await withTimeout(failed.api.getUserName(), "getUserName(请求失败)"), "",
        "请求失败必须 resolve 成空串");

    const noNode = loadCommon({ fetch: respondWith("<html><body>公告页</body></html>") });
    assert.strictEqual(await withTimeout(noNode.api.getUserName(), "getUserName(缺节点)"), "",
        "缺 .uname_con 必须 resolve 成空串");

    const byTitle = loadCommon({ fetch: respondWith("<html><body><div class='uname_con' title='老司机'></div></body></html>") });
    assert.strictEqual(await withTimeout(byTitle.api.getUserName(), "getUserName(title)"), "老司机",
        "正常页面必须解析出昵称");

    const byText = loadCommon({ fetch: respondWith("<html><body><div class='uname_con'>文本昵称</div></body></html>") });
    assert.strictEqual(await withTimeout(byText.api.getUserName(), "getUserName(兜底文本)"), "文本昵称",
        "没有 title 时必须兜底取文本内容");

    const syncThrow = loadCommon({ fetch: function () { throw new Error("fetch is not a function"); } });
    assert.strictEqual(await withTimeout(syncThrow.api.getUserName(), "getUserName(同步抛错)"), "",
        "fetch 同步抛错也必须 resolve");

    console.log("✓ 场景 2 通过: getUserName 五条失败路径全部 settle，不再悬挂");
}

/* ------------------------------------------------------------------ */
/* 场景 3: Menu「检查更新」不再是空点击                                */
/* ------------------------------------------------------------------ */

function loadMenu(opts) {
    const options = opts || {};
    const dom = makeDom();
    const win = dom.window;
    const log = collectConsole();
    const registered = [];
    const opened = [];
    const messages = [];
    const factory = new Function(
        "document", "window", "console", "GM_registerMenuCommand",
        "showExRightPanel", "createExUpdatePanel", "showMessage",
        EXGUARD_SRC + "\n" + MENU_SRC + "\nreturn { init: initPkg_Menu };"
    );
    const api = factory(
        win.document, win, log.console,
        options.noMenuApi ? undefined : function (name, fn) { registered.push({ name: name, fn: fn }); },
        options.panelThrows
            ? function () { throw new Error("panel boom"); }
            : function (name, btn, force) { opened.push({ name: name, btn: btn, force: force }); },
        function () { opened.push({ name: "__createExUpdatePanel__" }); },
        function (text, type) { messages.push({ text: text, type: type }); }
    );
    return { api: api, registered: registered, opened: opened, messages: messages, log: log };
}

function testMenuCheckUpdate() {
    // 红：菜单项调用的 Update_checkVersion() 是空函数（Update.js 里已"彻底去掉进房弹窗"），
    //     点下去屏幕上一丝反应都没有。
    const m = loadMenu();
    m.api.init();
    assert.strictEqual(m.registered.length, 1, "必须注册且只注册一个菜单项");
    assert.strictEqual(m.registered[0].name, "检查更新");
    m.registered[0].fn();
    assert.strictEqual(m.opened.length, 1, "点菜单必须真的打开面板（旧实现是空点击）");
    assert.strictEqual(m.opened[0].name, "版本更新", "应打开「版本更新」面板，实际 " + JSON.stringify(m.opened));
    assert.strictEqual(m.opened[0].force, true, "必须强制打开，避免被上一次的开关状态吃掉");

    // 面板异常：要有可见提示，不能又变成"点了没反应"
    const broken = loadMenu({ panelThrows: true });
    broken.api.init();
    assert.doesNotThrow(function () { broken.registered[0].fn(); }, "面板异常不得抛到 GM 回调外");
    assert.strictEqual(broken.messages.length, 1, "面板打不开时必须给用户一句提示");

    // 脚本管理器没有 GM_registerMenuCommand：不得抛（init() 是平铺调用，抛了会带走后面的包）
    const noApi = loadMenu({ noMenuApi: true });
    assert.doesNotThrow(function () { noApi.api.init(); }, "缺少 GM_registerMenuCommand 时不得抛错");
    assert.ok(noApi.log.warns.some(function (s) { return s.indexOf("GM_registerMenuCommand") !== -1; }),
        "缺少菜单 API 时必须留痕，实际 " + JSON.stringify(noApi.log.warns));

    console.log("✓ 场景 3 通过: 检查更新菜单真的打开版本更新面板，缺 API / 面板异常都不再是空点击");
}

/* ------------------------------------------------------------------ */
/* 场景 4: DanmakuTail 坏设置、缺节点、聊天框迟到                      */
/* ------------------------------------------------------------------ */

function loadDanmakuTail(opts) {
    const options = opts || {};
    const dom = makeDom(options.html || "<!DOCTYPE html><html><body></body></html>");
    const win = dom.window;
    const log = collectConsole();
    const clock = makeClock();
    const messages = [];
    // 记录真实注册进去的监听器：jsdom 的 isTrusted 是事件对象上的不可配置自有属性，
    // 造不出"可信事件"，所以回车的用例直接把真 handler 拿来用假事件调用
    //（被测的是包里的实现，不是镜像实现）。
    const listeners = [];
    const rawAdd = win.EventTarget.prototype.addEventListener;
    win.EventTarget.prototype.addEventListener = function (type, fn, opts2) {
        listeners.push({ target: this, type: type, fn: fn });
        return rawAdd.call(this, type, fn, opts2);
    };
    if (options.stored !== undefined) {
        win.localStorage.setItem("ExSave_DanmakuTail", options.stored);
    }
    const factory = new Function(
        "document", "window", "localStorage", "showMessage", "console", "Event",
        "setInterval", "clearInterval", "setTimeout", "clearTimeout",
        EXGUARD_SRC + "\n" + DANMAKUTAIL_SRC + "\n" +
        "return { init: initPkg_DanmakuTail, save: saveData_DanmakuTail, handle: initPkg_DanmakuTail_HandleFunc };"
    );
    const api = factory(
        win.document, win, win.localStorage,
        function (text, type) { messages.push({ text: text, type: type }); },
        log.console, win.Event,
        clock.setInterval, clock.clearInterval, clock.setTimeout, clock.clearTimeout
    );
    return { dom: dom, win: win, api: api, log: log, clock: clock, messages: messages, listeners: listeners };
}

function testDanmakuTailDeadEnds() {
    // ① 本地设置坏了：旧实现 JSON.parse 直接抛，整个 initPkg_DanmakuTail 中断，
    //    小尾巴面板从此点不开。
    const broken = loadDanmakuTail({ stored: "{broken" });
    assert.doesNotThrow(function () { broken.api.init(); }, "本地设置损坏时初始化不得抛错");
    assert.ok(broken.log.warns.some(function (s) { return s.indexOf("已损坏") !== -1; }),
        "设置损坏必须留痕，实际 " + JSON.stringify(broken.log.warns));
    assert.ok(broken.win.document.querySelector(".ChatToolBar-DanmakuTail-Panel"), "面板仍必须建出来");

    // ② 类型值非法：旧实现 querySelector 取空后 .checked 直接 TypeError
    const badType = loadDanmakuTail({ stored: JSON.stringify({ isTailEnabled: false, tailContent: "x", type: "9" }) });
    assert.doesNotThrow(function () { badType.api.init(); }, "类型值非法时不得抛错");
    const fallbackRadio = badType.win.document.querySelector('input[name="DanmakuTailType"][value="2"]');
    assert.strictEqual(fallbackRadio.checked, true, "非法类型值必须回退到默认「后缀」");

    // ③ 开关开着但聊天框迟到：旧实现 enable() 里直接 return，
    //    用户看到「开关是开的，但没有小尾巴」。现在必须有上限地等它出现再绑。
    const late = loadDanmakuTail({ stored: JSON.stringify({ isTailEnabled: true, tailContent: "尾巴", type: "2" }) });
    late.api.init();
    const checkbox = late.win.document.getElementById("DanmakuTail-checkbox");
    assert.strictEqual(checkbox.checked, true, "上次的小尾巴开关状态必须被恢复");
    assert.ok(late.clock.pending() > 0, "聊天框还没出现时必须挂上有上限的等待，而不是静默放弃");

    late.win.document.body.insertAdjacentHTML("beforeend",
        "<textarea class='ChatSend-txt'></textarea><button class='ChatSend-button'></button>");
    late.clock.advance(600);
    const textarea = late.win.document.querySelector(".ChatSend-txt");
    const button = late.win.document.querySelector(".ChatSend-button");
    assert.ok(textarea && button, "测试用的聊天框必须插入成功");
    textarea.value = "你好";
    button.dispatchEvent(new late.win.Event("click"));
    assert.strictEqual(textarea.value, "你好尾巴", "等到聊天框后必须真的加上小尾巴，实际 " + JSON.stringify(textarea.value));

    // ④ 单选组全空：旧实现 saveData 里 querySelector(':checked').value 直接 TypeError
    const noRadio = loadDanmakuTail();
    noRadio.api.init();
    noRadio.win.document.querySelectorAll('input[name="DanmakuTailType"]').forEach(function (el) { el.checked = false; });
    assert.doesNotThrow(function () { noRadio.api.save(); }, "没有选中项时保存不得抛错");
    const saved = JSON.parse(noRadio.win.localStorage.getItem("ExSave_DanmakuTail"));
    assert.strictEqual(saved.type, "2", "没有选中项时应保存默认「后缀」，实际 " + JSON.stringify(saved));

    console.log("✓ 场景 4 通过: 小尾巴坏设置不炸、非法类型回退、聊天框迟到会等、无选中项可保存");
}

/* ------------------------------------------------------------------ */
/* 场景 5: FansBadgeList 缺列 / 缺时间                                */
/* ------------------------------------------------------------------ */

function loadFansBadgeList(html, opts) {
    const options = opts || {};
    const dom = makeDom(html);
    const win = dom.window;
    const log = collectConsole();
    const clock = options.clock || makeClock();
    const factory = new Function(
        "document", "window", "console", "setInterval", "clearInterval", "setTimeout", "clearTimeout",
        EXGUARD_SRC + "\n" + DATEFORMAT_SRC + "\n" + FANSBADGE_SRC + "\nreturn { init: initPkg_FansBadgeList, annotate: FansBadgeList_annotateRows };"
    );
    const api = factory(win.document, win, log.console,
        clock.setInterval, clock.clearInterval, clock.setTimeout, clock.clearTimeout);
    return { dom: dom, win: win, api: api, log: log, clock: clock };
}

function testFansBadgeListRows() {
    // 红：第二行缺第二列 → item.getElementsByTagName("td")[1] 是 undefined →
    //     td.innerHTML 直接 TypeError → 整个循环中断，后面的行全都没有注释。
    const ts = 1700000000; // 2023-11-15 前后
    const html =
        "<!DOCTYPE html><html><body><table class='fans-badge-list'>" +
        "<tr><th>房间</th><th>牌子</th></tr>" +
        "<tr data-fans-gbdgts='" + ts + "'><td>a</td><td>b</td></tr>" +
        "<tr><td>只有一列</td></tr>" +
        "<tr data-fans-gbdgts='not-a-number'><td>c</td><td>d</td></tr>" +
        "<tr data-fans-gbdgts='" + ts + "'><td>e</td><td>f</td></tr>" +
        "</table></body></html>";
    const page = loadFansBadgeList(html);
    assert.doesNotThrow(function () { page.api.init(); }, "缺列的行不得中断整张表");
    const rows = page.win.document.querySelectorAll(".fans-badge-list tr");
    assert.ok(rows[1].innerHTML.indexOf("已获取") !== -1, "第一行必须被注释");
    assert.ok(rows[2].innerHTML.indexOf("已获取") === -1, "缺第二列的行只跳过它自己");
    assert.ok(rows[3].innerHTML.indexOf("已获取") === -1, "坏时间戳不得写出 NaN 天");
    assert.ok(rows[3].innerHTML.indexOf("NaN") === -1, "坏时间戳不得渲染出 NaN 日期");
    assert.ok(rows[4].innerHTML.indexOf("已获取") !== -1, "最后一行的注释必须照常（旧实现在这里就断了）");
    assert.ok(page.log.warns.some(function (s) { return s.indexOf("2 行") !== -1; }),
        "跳过行数必须留痕，实际 " + JSON.stringify(page.log.warns));

    console.log("✓ 场景 5 通过: 粉丝牌表格缺列/坏时间只跳过该行，后续行照常注释");
}

/* ------------------------------------------------------------------ */
/* 场景 6: RoomVip 坏 JSON / 插入失败                                 */
/* ------------------------------------------------------------------ */

function loadRoomVip(opts) {
    const options = opts || {};
    const dom = makeDom(options.html || "<!DOCTYPE html><html><body></body></html>");
    const win = dom.window;
    const log = collectConsole();
    let fetchImpl = options.fetch || function () { return Promise.resolve({ text: function () { return Promise.resolve(""); } }); };
    const clock = options.clock || makeClock();
    const factory = new Function(
        "document", "window", "console", "fetch", "DOMParser", "rid",
        "setTimeout", "clearTimeout", "setInterval", "clearInterval",
        EXGUARD_SRC + "\n" + GETVALIDDOM_SRC + "\n" + ROOMVIP_SRC +
        "\nreturn { run: setRoomVipExpireDays, insert: initPkg_RoomVip_Dom, show: RoomVip_showDays, " +
        "findAnchor: RoomVip_findAnchor, writeDays: RoomVip_writeDays };"
    );
    const api = factory(win.document, win, log.console, function (u) { return fetchImpl(u); }, win.DOMParser, options.rid || "9999",
        clock.setTimeout, clock.clearTimeout, clock.setInterval, clock.clearInterval);
    return { dom: dom, win: win, api: api, log: log, clock: clock };
}

function effectListHtml(entries) {
    const inner = entries.map(function (detail) {
        return "<div class='show-effect-more' data-detail='" + detail + "'></div>";
    }).join("");
    return "<html><body><div class='enter-wraper is-effect'>" + inner + "</div></body></html>";
}

async function testRoomVipDeadEnds() {
    const wait = function (ms) { return new Promise(function (r) { setTimeout(r, ms); }); };

    // ① data-detail 是坏 JSON：旧实现 JSON.parse 抛 → 整个 .then 变 rejection →
    //    .catch 打一行「请求失败!」—— 明明是数据坏了，日志却指向请求。
    const badJson = loadRoomVip({ fetch: function () { return Promise.resolve({ text: function () { return Promise.resolve(effectListHtml(["{oops"])); } }); } });
    assert.doesNotThrow(function () { badJson.api.run(); }, "坏 JSON 不得同步抛出");
    await wait(30);
    assert.strictEqual(badJson.log.errors.length, 0, "坏 JSON 不得留下未处理异常");
    assert.ok(badJson.log.warns.some(function (s) { return s.indexOf("JSON") !== -1; }),
        "坏 JSON 必须留痕，实际 " + JSON.stringify(badJson.log.warns));
    assert.ok(badJson.log.warns.every(function (s) { return s.indexOf("请求失败") === -1; }),
        "数据坏了不得报成「请求失败」");

    // ② 背包入口不在：节点插不进去，旧实现紧接着 getElementById(...).innerText 直接 TypeError
    const noDock = loadRoomVip({
        fetch: function () {
            return Promise.resolve({
                text: function () {
                    return Promise.resolve(effectListHtml(['{"property_id":"1646","show_id_list":"9999","expire_time":"' + Math.floor((Date.now() + 3 * 86400000) / 1000) + '"}']));
                },
            });
        },
    });
    assert.doesNotThrow(function () { noDock.api.run(); }, "没有背包入口时不得抛错");
    await wait(30);
    assert.strictEqual(noDock.log.errors.length, 0, "没有背包入口时不得留下未处理异常");
    assert.strictEqual(noDock.win.document.querySelector(".room-vip"), null, "锚点不在时不得凭空插节点");
    // 新版：锚点不在会走有上限等待（5 秒 = 10 次 × 500ms），等不到才留痕
    noDock.clock.advance(500 * 25);
    assert.ok(noDock.log.warns.some(function (s) { return s.indexOf("已放弃") !== -1; }),
        "等不到锚点必须留痕，实际 " + JSON.stringify(noDock.log.warns));

    // ③ 正常路径：仍然要把天数真的写进节点（功能不能被判空吃掉）
    const expire = Math.floor((Date.now() + 5 * 86400000) / 1000);
    const ok = loadRoomVip({
        html: "<!DOCTYPE html><html><body><div id='js-backpack-enter'></div></body></html>",
        fetch: function () {
            return Promise.resolve({
                text: function () {
                    return Promise.resolve(effectListHtml([
                        '{"property_id":"1646","show_id_list":"9999","expire_time":"' + expire + '"}',
                    ]));
                },
            });
        },
    });
    ok.api.run();
    await wait(30);
    const days = ok.win.document.getElementById("room-vip-expire-days");
    assert.ok(days, "正常的 VIP 记录必须插出节点");
    assert.strictEqual(String(days.innerText), "4", "必须写出真实剩余天数，实际 " + String(days.innerText));

    console.log("✓ 场景 6 通过: 坏 JSON 只跳过该条、插不进去不再 TypeError、正常路径天数照常");
}

/* ------------------------------------------------------------------ */
/* 场景 7: MonthCost 限流无限重试 / 未捕获 rejection（一直加载中）      */
/* ------------------------------------------------------------------ */

function loadMonthCost(opts) {
    const options = opts || {};
    const dom = makeDom(options.html || "<!DOCTYPE html><html><body><div id='js-backpack-enter'></div></body></html>");
    const win = dom.window;
    const log = collectConsole();
    const calls = [];
    let fetchImpl = options.fetch || function () { return Promise.resolve({ json: function () { return Promise.resolve({ error: 0, data: [] }); } }); };
    // 重试等待不必真的等 2 秒
    const fastTimeout = function (fn) { Promise.resolve().then(fn); return 0; };
    const factory = new Function(
        "document", "window", "localStorage", "my_uid", "fetch", "console", "Date",
        "setTimeout", "clearTimeout", "setInterval", "clearInterval",
        EXGUARD_SRC + "\n" + GETVALIDDOM_SRC + "\n" + MONTHCOST_SRC +
        "\nreturn { init: initPkg_MonthCost, refresh: MonthCost_refreshCost, getCost: getMonthCost, " +
        "update: MonthCost_updateCost, money: MonthCost_getMoneyDom, isStale: MonthCost_isStale, " +
        "insertIcon: MonthCost_insertIcon, waitAnchor: MonthCost_waitAnchor, findAnchor: MonthCost_findAnchor, " +
        "total: function () { return totalMonthCost; }, " +
        "detail: function () { return typeDetail; }, setSee: function (v) { seeStatus = v; } };"
    );
    const clock = options.clock || null;
    const api = factory(
        win.document, win, win.localStorage, options.uid || "12345",
        function (url) { calls.push(url); return fetchImpl(url); },
        log.console, options.nowMs ? makeFakeDate(options.nowMs) : Date,
        fastTimeout, function () {},
        clock ? clock.setInterval : function () {}, clock ? clock.clearInterval : function () {}
    );
    return { dom: dom, win: win, api: api, log: log, calls: calls, clock: clock };
}

/** 固定"现在"的 Date：new Date() / new Date(ts) / Date.now() 都按约定工作 */
function makeFakeDate(nowMs) {
    const Real = Date;
    function Fake(value) {
        if (!(this instanceof Fake)) return new Real(nowMs).toString();
        if (arguments.length === 0) return new Real(nowMs);
        return new Real(value);
    }
    Fake.now = function () { return nowMs; };
    Fake.parse = Real.parse;
    Fake.UTC = Real.UTC;
    return Fake;
}

async function testMonthCostDeadEnds() {
    // ① 接口一直返回 error=1000（限流）：旧实现同一个 url 无限重试，
    //    面板上的「加载中」永远不结束，还在后台每 2 秒打一次接口。
    const limited = loadMonthCost({
        fetch: function () { return Promise.resolve({ json: function () { return Promise.resolve({ error: 1000 }); } }); },
    });
    await limited.api.getCost();
    const giftCalls = limited.calls.filter(function (u) { return u.indexOf("giftList") !== -1; }).length;
    assert.ok(giftCalls <= 4, "限流重试必须有上限（1 次 + 最多 3 次重试），实际 " + giftCalls);
    assert.ok(giftCalls >= 2, "至少要真的重试过一次，实际 " + giftCalls);
    assert.ok(limited.log.warns.some(function (s) { return s.indexOf("限流") !== -1; }),
        "达到重试上限必须留痕，实际 " + JSON.stringify(limited.log.warns));

    // ② 明细里混进 null / 坏 amount：旧实现 item.amount 直接 TypeError，
    //    抛出点在 async 链里 = 未捕获 rejection，金额永远停在「加载中」。
    const dirty = loadMonthCost({
        fetch: function (url) {
            if (url.indexOf("giftList") !== -1) {
                return Promise.resolve({
                    json: function () {
                        return Promise.resolve({ error: 0, data: [
                            { amount: 100, consumeTypeDesc: "礼物" },
                            null,
                            { amount: "oops" },
                            { amount: 200, consumeTypeDesc: "礼物" },
                        ] });
                    },
                });
            }
            return Promise.resolve({ json: function () { return Promise.resolve({ error: 0, data: { list: [] } }); } });
        },
    });
    await dirty.api.getCost();
    assert.strictEqual(dirty.api.total(), 300, "坏记录必须跳过、好记录照常累加，实际 " + dirty.api.total());
    assert.strictEqual(dirty.api.detail().length, 1, "分类明细不应被坏记录污染");

    // ③ 末条没有 id（无法翻页）：旧实现 nextData[last].id 直接 TypeError
    const noId = loadMonthCost({
        fetch: function (url) {
            if (url.indexOf("giftList") !== -1) {
                const list = [];
                for (let i = 0; i < 20; i++) list.push({ amount: 100, consumeTypeDesc: "礼物", id: i < 19 ? i + 1 : undefined });
                return Promise.resolve({ json: function () { return Promise.resolve({ error: 0, data: list }); } });
            }
            return Promise.resolve({ json: function () { return Promise.resolve({ error: 0, data: { list: [] } }); } });
        },
    });
    await noId.api.getCost();
    const noIdCalls = noId.calls.filter(function (u) { return u.indexOf("giftList") !== -1; }).length;
    assert.strictEqual(noIdCalls, 1, "末条没有 id 时必须收尾，不得继续翻页，实际 " + noIdCalls);
    assert.strictEqual(noId.api.total(), 2000, "已取到的记录仍要统计，实际 " + noId.api.total());

    // ④ 统计链整条炸掉：界面必须收敛成「—」，而不是永远显示加载中
    const boom = loadMonthCost({ fetch: function () { throw new Error("fetch boom"); } });
    boom.api.init();
    boom.api.setSee(1);
    boom.api.refresh();
    await new Promise(function (r) { setTimeout(r, 50); });
    const moneyDom = boom.api.money();
    assert.ok(moneyDom, "金额节点必须存在");
    assert.strictEqual(String(moneyDom.innerText), "—", "加载失败必须收敛成「—」，实际 " + String(moneyDom.innerText));
    assert.ok(boom.log.warns.some(function (s) { return s.indexOf("加载失败") !== -1; }),
        "加载失败必须留痕，实际 " + JSON.stringify(boom.log.warns));

    console.log("✓ 场景 7 通过: 限流重试有上限、坏记录跳过、末条缺 id 收尾、失败收敛成「—」");
}

/* ------------------------------------------------------------------ */
/* 场景 8: ChatMemory 聊天框迟到 / 空记忆                             */
/* ------------------------------------------------------------------ */

function loadChatMemory(opts) {
    const options = opts || {};
    const dom = makeDom();
    const win = dom.window;
    const log = collectConsole();
    const clock = makeClock();
    if (options.withInput) {
        win.document.body.innerHTML = "<textarea class='ChatSend-txt'></textarea><button class='ChatSend-button'></button>";
    }
    const factory = new Function(
        "document", "window", "console", "setInterval", "clearInterval", "setTimeout", "clearTimeout",
        EXGUARD_SRC + "\n" + TEXTAREA_POS_SRC + "\n" + CHATMEMORY_SRC +
        "\nreturn { init: initPkg_ChatMemory, push: chatMemory_pushBarrage, mem: function () { return barrageMemoryArr; }, " +
        "bound: function () { return chatMemory_isBound(); } };"
    );
    const api = factory(
        win.document, win, log.console,
        clock.setInterval, clock.clearInterval, clock.setTimeout, clock.clearTimeout
    );
    return { dom: dom, win: win, api: api, log: log, clock: clock };
}

function dispatchKey(el, keyCode) {
    const ev = new el.ownerDocument.defaultView.Event("keydown", { bubbles: true });
    ev.keyCode = keyCode;
    el.dispatchEvent(ev);
}

function testChatMemoryDeadEnds() {
    // ① 聊天框迟到：旧实现只取一次 [0]，取不到就什么都不做（功能静默失效）
    const late = loadChatMemory();
    late.api.init();
    assert.strictEqual(late.clock.pending(), 1, "聊天框没出现时必须挂一个有上限的等待");
    late.api.init();
    assert.strictEqual(late.clock.pending(), 1, "重复 init 不得叠出第二个等待（会重复绑定、按一次 ↑ 回忆两次）");

    late.win.document.body.innerHTML = "<textarea class='ChatSend-txt'></textarea><button class='ChatSend-button'></button>";
    late.clock.advance(600);
    assert.strictEqual(late.api.bound(), true, "聊天框出现后必须完成绑定");

    const textarea = late.win.document.querySelector(".ChatSend-txt");
    textarea.value = "第一句";
    dispatchKey(textarea, 13);
    assert.strictEqual(late.api.mem().length, 1, "回车发送必须记住这一句");

    // ② 空内容不入记忆：旧实现会把空串压进数组，按 ↑ 回忆到空串 → 看起来"没反应"
    textarea.value = "   ";
    dispatchKey(textarea, 13);
    assert.strictEqual(late.api.mem().length, 1, "空内容不得进入记忆，实际 " + JSON.stringify(late.api.mem()));

    // ③ 回忆仍然可用
    textarea.value = "";
    dispatchKey(textarea, 38);
    assert.strictEqual(textarea.value, "第一句", "按 ↑ 必须回忆上一条，实际 " + JSON.stringify(textarea.value));

    console.log("✓ 场景 8 通过: 聊天框迟到会等且只绑一次、空内容不入记忆、↑ 回忆照常");
}

/* ------------------------------------------------------------------ */
/* 场景 10: main.js init() 逐项隔离                                    */
/* ------------------------------------------------------------------ */

function loadInit() {
    const names = [
        "initPkg_PopupPlayer_MergeDanmaku_ScriptHook",
        "initPkg_Shield_RemoveRepeatedDanmaku_ScriptHook",
        "initPkg_ShowDanmaku_ScriptHook",
        "initScriptHook",
        "initResponseHook",
        "initPkg_ShowDanmaku",
        "Update_checkVersion",
        "initKillP2P",
        "initFullScreen",
        "initHighestVideoQuality",
        "initPkg_NoLogin",
        "removeAD",
        "initPkg_Console",
        "initPkg_Menu",
        "initPkg_Reset",
        "initPkg_FollowList"
    ];
    const start = MAIN_SRC.indexOf("function init() {");
    assert.ok(start !== -1, "src/main.js 里找不到 init()，测试需同步更新");
    const end = MAIN_SRC.indexOf("function initPkg() {", start);
    assert.ok(end !== -1, "src/main.js 里找不到 initPkg()（切分标记），测试需同步更新");
    const INIT_SRC = MAIN_SRC.slice(start, end);

    const safeStart = MAIN_SRC.indexOf("function initPkg_Safe(name, fn) {");
    assert.ok(safeStart !== -1, "src/main.js 里找不到 initPkg_Safe，测试需同步更新");
    const safeEnd = MAIN_SRC.indexOf("function initPkg_Timer() {", safeStart);
    assert.ok(safeEnd !== -1, "src/main.js 里找不到 initPkg_Timer()（切分标记），测试需同步更新");
    const SAFE_SRC = MAIN_SRC.slice(safeStart, safeEnd);

    const factory = new Function(names.join(", ") + ", console",
        SAFE_SRC + "\n" + INIT_SRC + "\nreturn { init: init };");

    return {
        names: names,
        INIT_SRC: INIT_SRC,
        build: function (log, throwOn) {
            const order = [];
            const handlers = names.map(function (n) {
                return function () {
                    order.push(n);
                    if (n === throwOn) throw new Error(n + " boom");
                };
            });
            const api = factory.apply(null, handlers.concat([log.console]));
            return { api: api, order: order };
        },
    };
}

function testInitIsolation() {
    const page = loadInit();

    // 绿：16 步全跑，顺序与改造前逐行一致
    const clean = page.build(collectConsole());
    clean.api.init();
    assert.deepStrictEqual(clean.order, page.names, "init() 必须按原顺序调用全部 16 步");

    // 红：旧实现是 16 句裸平铺直调 —— 第 6 句一抛，后面的 Console/Menu/Reset/FollowList
    //     全部不再执行（用户侧就是「某几个功能没了」）。现在必须照常往下走。
    const log = collectConsole();
    const broken = page.build(log, "initPkg_ShowDanmaku");
    assert.doesNotThrow(function () { broken.api.init(); }, "单步抛错不得冲出 init()");
    assert.deepStrictEqual(broken.order, page.names,
        "一步失败后其余步骤必须照常执行且顺序不变，实际 " + JSON.stringify(broken.order));
    assert.ok(log.errors.some(function (s) { return s.indexOf("ShowDanmaku") !== -1; }),
        "失败必须报出包名，实际 " + JSON.stringify(log.errors));

    // 静态：不得再回到裸平铺
    assert.ok(!/^\s*(?:initPkg_[A-Za-z0-9_]+|init[A-Z][A-Za-z0-9_]*|removeAD|Update_checkVersion)\(\);\s*$/m.test(page.INIT_SRC),
        "init() 不得再有裸平铺直调");

    console.log("✓ 场景 10 通过: init() 16 步按原顺序逐项隔离，单步抛错不再连坐");
}

/* ------------------------------------------------------------------ */
/* 场景 11: MonthCost 跨日判断改按自然日边界                          */
/* ------------------------------------------------------------------ */

async function testMonthCostStaleness() {
    const wait = function (ms) { return new Promise(function (r) { setTimeout(r, ms); }); };
    const nowMs = new Date(2026, 10, 5, 10, 0, 0).getTime(); // 2026-11-05 10:00（本地时区）
    const uid = "12345";
    const okFetch = function () {
        return Promise.resolve({ json: function () { return Promise.resolve({ error: -1, data: [] }); } });
    };
    const page = function (entry) {
        const p = loadMonthCost({ nowMs: nowMs, fetch: okFetch });
        p.win.localStorage.setItem("ExSave_MonthCost_SeeStatus", "1");
        p.win.localStorage.setItem("ExSave_MonthCost", JSON.stringify({ "12345": entry }));
        return p;
    };
    assert.strictEqual(uid, "12345");

    // ① 缓存就是今天：显示缓存值，一次请求都不发
    const today = page({ monthCost: 1234, updateTime: new Date(2026, 10, 5, 9, 0, 0).getTime(), typeDetail: [] });
    today.api.init();
    await wait(20);
    assert.strictEqual(today.calls.length, 0, "当天缓存不得触发刷新，实际 " + JSON.stringify(today.calls));
    assert.strictEqual(String(today.api.money().innerText), "12.34", "必须显示缓存金额");

    // ② 红：10-05 的缓存 —— 旧实现 |5-5| = 0 永不刷新（月初到现在都不更新）
    const crossMonth = page({ monthCost: 1234, updateTime: new Date(2026, 9, 5, 9, 0, 0).getTime(), typeDetail: [] });
    crossMonth.api.init();
    await wait(30);
    assert.ok(crossMonth.calls.length > 0, "跨月同一号必须判为过期并刷新（旧实现差 0 = 永不刷新）");

    // ③ 昨天：必须刷新
    const yesterday = page({ monthCost: 1234, updateTime: new Date(2026, 10, 4, 23, 0, 0).getTime(), typeDetail: [] });
    yesterday.api.init();
    await wait(30);
    assert.ok(yesterday.calls.length > 0, "昨天的缓存必须刷新");

    // ④ 没有/坏掉的时间戳：必须刷新
    const noStamp = page({ monthCost: 500, typeDetail: [] });
    noStamp.api.init();
    await wait(30);
    assert.ok(noStamp.calls.length > 0, "缺少缓存时间戳时必须刷新");

    // ⑤ 直接验 isStale：只有「同一天」才算新鲜
    const probe = loadMonthCost({ nowMs: nowMs });
    assert.strictEqual(probe.api.isStale(new Date(2026, 10, 5, 0, 0, 0).getTime()), false, "同一天不得判过期");
    assert.strictEqual(probe.api.isStale(new Date(2026, 10, 4, 23, 59, 59).getTime()), true, "前一天必须判过期");
    assert.strictEqual(probe.api.isStale(new Date(2026, 9, 5, 10, 0, 0).getTime()), true, "上个月同一号必须判过期");
    assert.strictEqual(probe.api.isStale(undefined), true, "没有时间戳必须判过期");

    console.log("✓ 场景 11 通过: 跨日判断改按自然日边界，跨月同号不再「永不刷新」也不会误刷");
}

/* ------------------------------------------------------------------ */
/* 场景 12: RoomVip 过期不再显示「距VIP到期 -12 天」                   */
/* ------------------------------------------------------------------ */

async function testRoomVipExpiredWording() {
    const wait = function (ms) { return new Promise(function (r) { setTimeout(r, ms); }); };
    // 过期 12.5 天：Math.floor 之后是 -13，绝对值 13
    const expireSec = Math.floor((Date.now() - 12.5 * 86400000) / 1000);
    const page = loadRoomVip({
        html: "<!DOCTYPE html><html><body><div id='js-backpack-enter'></div></body></html>",
        fetch: function () {
            return Promise.resolve({
                text: function () {
                    return Promise.resolve(effectListHtml([
                        '{"property_id":"1646","show_id_list":"9999","expire_time":"' + expireSec + '"}',
                    ]));
                },
            });
        },
    });
    page.api.run();
    await wait(30);
    const badge = page.win.document.querySelector(".room-vip");
    assert.ok(badge, "过期的 VIP 记录仍要插出节点（days <= 5 的既有口径不变）");
    const text = String(badge.textContent || "");
    assert.ok(text.indexOf("已过期") !== -1, "负数必须说「已过期」，实际 " + JSON.stringify(text));
    assert.ok(text.indexOf("距VIP到期") === -1, "过期时不得再拼「距VIP到期 … 天」，实际 " + JSON.stringify(text));
    assert.ok(text.indexOf("-") === -1 && text.indexOf("−") === -1, "不得再出现负号天数，实际 " + JSON.stringify(text));
    assert.strictEqual(page.log.errors.length, 0, "过期分支不得抛错");

    console.log("✓ 场景 12 通过: VIP 过期显示「VIP 已过期 N 天」，不再出现负号天数");
}

/* ------------------------------------------------------------------ */
/* 场景 13: DanmakuTail 只在发送按钮可用时拦截回车                     */
/* ------------------------------------------------------------------ */

function testDanmakuTailEnterGuard() {
    const page = loadDanmakuTail({
        html: "<!DOCTYPE html><html><body><textarea class='ChatSend-txt'></textarea><button class='ChatSend-button'></button></body></html>",
        stored: JSON.stringify({ isTailEnabled: true, tailContent: "尾巴", type: "2" }),
    });
    page.api.init();
    const textarea = page.win.document.querySelector(".ChatSend-txt");
    const button = page.win.document.querySelector(".ChatSend-button");
    const keydown = page.listeners.filter(function (l) {
        return l.type === "keydown" && l.target === textarea;
    }).pop();
    assert.ok(keydown, "小尾巴必须在输入框上真的挂了 keydown");

    let clicks = 0;
    button.click = function () { clicks++; };
    const fire = function (extra) {
        const ev = {
            isTrusted: true,
            key: (extra && extra.key) || "Enter",
            shiftKey: !!(extra && extra.shiftKey),
            prevented: false,
            stopped: false,
            preventDefault: function () { this.prevented = true; },
            stopPropagation: function () { this.stopped = true; },
        };
        keydown.fn.call(textarea, ev);
        return ev;
    };

    // 按钮可用：拦截回车并代点一次（保持既有行为）
    let ev = fire({});
    assert.strictEqual(ev.prevented, true, "按钮可用时必须拦截回车");
    assert.strictEqual(clicks, 1, "必须代点一次发送按钮");
    assert.strictEqual(ev.stopped, true, "拦截时必须 stopPropagation，避免页面再发一次");

    // 红：按钮 disabled 时旧实现照样 preventDefault —— 回车被吞，弹幕根本发不出去
    button.disabled = true;
    ev = fire({});
    assert.strictEqual(ev.prevented, false, "按钮 disabled 时不得吞回车");
    assert.strictEqual(clicks, 1, "按钮 disabled 时不得代点");
    button.disabled = false;

    // 按钮已不在文档里（聊天区被重绘）：同样放行
    button.remove();
    ev = fire({});
    assert.strictEqual(ev.prevented, false, "按钮脱离文档时不得吞回车");

    // Shift+Enter 是换行，本来就不该拦截
    const back = page.win.document.createElement("button");
    back.className = "ChatSend-button";
    page.win.document.body.appendChild(back);
    ev = fire({ shiftKey: true });
    assert.strictEqual(ev.prevented, false, "Shift+Enter 不得拦截");

    assert.strictEqual(page.log.errors.length, 0, "回车分支不得抛错");
    console.log("✓ 场景 13 通过: 回车只在发送按钮可用时被拦截，disabled / 脱文档都放行");
}

/* ------------------------------------------------------------------ */
/* 场景 14: 自动钓鱼四个包装器必须 settle（P0-4）                      */
/* ------------------------------------------------------------------ */

const AUTOFISH_SRC = read("src/packages/ExpandTool/ExpandTool_AutoFish.js");
const SENDGIFT_SRC = read("src/packages/ExpandTool/ExpandTool_SendGift.js");
const REDPACKET_SRC = read("src/packages/ExpandTool/ExpandTool_RedPacket_Room.js");
const TREASURE_SRC = read("src/packages/ExpandTool/ExpandTool_Treasure.js");

function loadAutoFish(opts) {
    const options = opts || {};
    const dom = makeDom(options.html || "<!DOCTYPE html><html><body>" +
        "<input type='checkbox' id='extool__autofish_start'>" +
        "<input type='radio' name='autofish_mode' value='all' checked>" +
        "<input type='radio' name='autofish_mode' value='contest'>" +
        "</body></html>");
    const win = dom.window;
    const log = collectConsole();
    const clock = makeClock();
    const messages = [];
    let fetchImpl = options.fetch || function () { return Promise.reject(new Error("blocked")); };
    const factory = new Function(
        "document", "window", "localStorage", "console", "fetch", "showMessage", "rid", "getCCN", "sleep",
        "setTimeout", "clearTimeout", "setInterval", "clearInterval",
        EXGUARD_SRC + "\n" + AUTOFISH_SRC +
        "\nreturn { init: initPkg_ExpandTool_AutoFish, getFishInfo: AutoFish_getFishInfo, " +
        "getHomepageData: AutoFish_getHomepageData, startFish: AutoFish_startFish, endFish: AutoFish_endFish, " +
        "lockMode: AutoFish_lockMode };"
    );
    const api = factory(
        win.document, win, win.localStorage, log.console,
        function (u, o) { return fetchImpl(u, o); },
        function (text, type) { messages.push({ text: String(text), type: type }); },
        "9999", function () { return "ctn"; },
        function (ms) { return new Promise(function (r) { clock.setTimeout(r, ms || 0); }); },
        clock.setTimeout, clock.clearTimeout, clock.setInterval, clock.clearInterval
    );
    return { dom: dom, win: win, api: api, log: log, clock: clock, messages: messages, setFetch: function (fn) { fetchImpl = fn; } };
}

async function testAutoFishAlwaysSettles() {
    const wait = function (ms) { return new Promise(function (r) { setTimeout(r, ms); }); };
    const race = function (promise, label) {
        return Promise.race([promise, new Promise(function (_, rej) {
            setTimeout(function () { rej(new Error(label + " 超时：Promise 永不 settle")); }, 1000);
        })]);
    };

    // ① 四个包装器在 fetch 失败时必须 resolve(null)（旧实现 .catch 只 console.log → 永远 pending）
    const failing = loadAutoFish({ fetch: function () { return Promise.reject(new Error("ERR_BLOCKED_BY_CLIENT")); } });
    assert.strictEqual(await race(failing.api.getFishInfo(), "getFishInfo"), null, "成就列表失败必须 resolve(null)");
    assert.strictEqual(await race(failing.api.getHomepageData(), "getHomepageData"), null, "活动首页失败必须 resolve(null)");
    assert.strictEqual(await race(failing.api.startFish(), "startFish"), null, "下杆失败必须 resolve(null)");
    assert.strictEqual(await race(failing.api.endFish(), "endFish"), null, "收杆失败必须 resolve(null)");
    assert.ok(failing.log.warns.some(function (s) { return s.indexOf("自动钓鱼") !== -1; }), "失败必须留痕");

    // ② 连接黑洞（fetch 永不返回）：到超时点也必须 resolve(null)
    const hanging = loadAutoFish({ fetch: function () { return new Promise(function () {}); } });
    const pending = hanging.api.startFish();
    hanging.clock.advance(15000);
    assert.strictEqual(await race(pending, "startFish(超时)"), null, "超过 15s 未返回必须按失败处理");
    assert.ok(hanging.log.warns.some(function (s) { return s.indexOf("未返回") !== -1; }), "超时必须留痕");

    // ③ 成功路径不能被吃：正常响应仍要原样返回
    const ok = loadAutoFish({
        fetch: function (u) {
            if (u.indexOf("accList") !== -1) return Promise.resolve({ json: function () { return Promise.resolve({ data: { accList: [{ fishId: 1, name: "鲫鱼" }] } }); } });
            if (u.indexOf("homePage") !== -1) return Promise.resolve({ json: function () { return Promise.resolve({ data: { bait: 1 } }); } });
            return Promise.resolve({ json: function () { return Promise.resolve({ error: 0, data: { fish: { id: 1, wei: 2 } } }); } });
        },
    });
    assert.deepStrictEqual(await ok.api.getFishInfo(), [{ fishId: 1, name: "鲫鱼" }], "成功时必须返回成就列表");
    assert.deepStrictEqual((await ok.api.getHomepageData()).data, { bait: 1 }, "成功时必须返回首页数据");
    assert.strictEqual((await ok.api.endFish()).error, 0, "成功时必须返回响应体");

    // ④ 点开关后拿不到活动信息：旧实现卡在 await —— 勾选保持选中、模式单选被锁死、零提示
    const clickFail = loadAutoFish({ fetch: function () { return Promise.reject(new Error("blocked")); } });
    clickFail.api.init(); // 必须先绑定 click，否则测的是空点击
    const box = clickFail.win.document.getElementById("extool__autofish_start");
    box.checked = true;
    box.dispatchEvent(new clickFail.win.Event("click"));
    await wait(60);
    assert.strictEqual(box.checked, false, "拿不到活动信息时必须取消勾选");
    const radios = clickFail.win.document.querySelectorAll('input[name="autofish_mode"]');
    assert.strictEqual(radios[0].disabled, false, "必须解锁模式单选（旧实现锁死到刷新）");
    assert.ok(clickFail.messages.some(function (m) { return m.text.indexOf("活动信息获取失败") !== -1; }),
        "必须明确提示，实际 " + JSON.stringify(clickFail.messages));
    assert.strictEqual(JSON.parse(clickFail.win.localStorage.getItem("ExSave_AutoFish") || "{}").rids.length || 0, 0,
        "存储必须与界面一致（不再记录这个房间）");

    console.log("✓ 场景 14 通过: 自动钓鱼四个包装器失败/超时全部 settle，界面复位并提示");
}

/* ------------------------------------------------------------------ */
/* 场景 15: 送礼完成判定按真实计数（P0-5）                             */
/* ------------------------------------------------------------------ */

function loadSendGift(opts) {
    const options = opts || {};
    const dom = makeDom("<!DOCTYPE html><html><body><div class='extool'></div></body></html>");
    const win = dom.window;
    const log = collectConsole();
    const messages = [];
    const calls = [];
    let fetchImpl = options.fetch || function () { return Promise.resolve({ json: function () { return Promise.resolve({ msg: "ok", data: { priceType: 1 } }); } }); };
    const factory = new Function(
        "document", "window", "localStorage", "console", "fetch", "showMessage", "rid", "sleep", "confirm", "Event",
        EXGUARD_SRC + "\n" + SENDGIFT_SRC +
        "\nreturn { insertDom: ExpandTool_SendGift_insertDom, insertFunc: ExpandTool_SendGift_insertFunc, " +
        "save: saveData_ExpandTool_SendGift };"
    );
    const api = factory(
        win.document, win, win.localStorage, log.console,
        function (u, o) { calls.push(u); return fetchImpl(u, o); },
        function (text, type) { messages.push({ text: String(text), type: type }); },
        "9999", function () { return Promise.resolve(); },
        function () { return options.confirm === undefined ? true : options.confirm; },
        win.Event
    );
    return { dom: dom, win: win, api: api, log: log, messages: messages, calls: calls };
}

async function testSendGiftRealCount() {
    const wait = function (ms) { return new Promise(function (r) { setTimeout(r, ms); }); };
    let call = 0;
    const page = loadSendGift({
        fetch: function () {
            call++;
            if (call === 2) return Promise.reject(new Error("network down"));
            return Promise.resolve({ json: function () { return Promise.resolve({ msg: "ok", data: { priceType: 2 } }); } });
        },
    });
    page.api.insertDom();
    page.api.insertFunc();
    const doc = page.win.document;
    doc.getElementById("extool__sendgift_cnt").value = "3";
    doc.getElementById("extool__sendgift_delay").value = "0";

    doc.getElementById("extool__sendgift_btn").dispatchEvent(new page.win.Event("click"));
    await wait(80);

    assert.strictEqual(page.calls.length, 3, "数量 3 必须真的发 3 次，实际 " + page.calls.length);
    // 红：旧实现把「完毕」判定写在异步回调里（i 恒为末值），第一个回调回来就宣布完毕，
    //     而「执行中」写在循环之后 → 顺序颠倒。现在第一条必须是"执行中"。
    assert.ok(page.messages.length >= 2, "必须至少有「执行中」和「完成」两条提示，实际 " + JSON.stringify(page.messages));
    assert.ok(page.messages[0].text.indexOf("执行中") !== -1,
        "第一条提示必须是「执行中」，实际 " + JSON.stringify(page.messages[0]));
    const last = page.messages[page.messages.length - 1];
    assert.ok(last.text.indexOf("成功 2/3") !== -1, "完成提示必须是真实计数，实际 " + JSON.stringify(last.text));
    assert.ok(last.text.indexOf("失败 1") !== -1, "失败数必须体现，实际 " + JSON.stringify(last.text));

    // 全失败：必须是 error 类型且 0/2
    const bad = loadSendGift({ fetch: function () { return Promise.reject(new Error("boom")); } });
    bad.api.insertDom();
    bad.api.insertFunc();
    bad.win.document.getElementById("extool__sendgift_cnt").value = "2";
    bad.win.document.getElementById("extool__sendgift_btn").dispatchEvent(new bad.win.Event("click"));
    await wait(80);
    const badLast = bad.messages[bad.messages.length - 1];
    assert.ok(badLast.text.indexOf("全部失败") !== -1, "全失败必须明确说全部失败，实际 " + JSON.stringify(badLast.text));
    assert.strictEqual(badLast.type, "error", "全失败必须用 error 类型");

    console.log("✓ 场景 15 通过: 送礼按真实回调计数判断完成，「执行中」先于发送，失败数如实汇总");
}

/* ------------------------------------------------------------------ */
/* 场景 16: 红包 verifyFans 的 catch 与轮询失败上限（P0-6 / P1-11）     */
/* ------------------------------------------------------------------ */

function loadRedPacket(opts) {
    const options = opts || {};
    const dom = makeDom("<!DOCTYPE html><html><body><input type='checkbox' id='extool__redpacekt_room_start'></body></html>");
    const win = dom.window;
    const log = collectConsole();
    const clock = makeClock();
    const messages = [];
    let verifyImpl = options.verify || function () { return Promise.resolve(false); };
    let fetchImpl = options.fetch || function () { return Promise.resolve({ json: function () { return Promise.resolve({ data: { list: [] } }); } }); };
    const factory = new Function(
        "document", "window", "localStorage", "console", "fetch", "verifyFans", "showMessage", "rid", "getCCN",
        "setTimeout", "clearTimeout", "setInterval", "clearInterval",
        EXGUARD_SRC + "\n" + REDPACKET_SRC +
        "\nreturn { init: initPkg_ExpandTool_RedPacket_Room, list: getRoomRedPacketsList, grab: getRoomRedPacket, " +
        "stop: ExpandTool_RedPacket_Room_stop };"
    );
    const api = factory(
        win.document, win, win.localStorage, log.console,
        function (u, o) { return fetchImpl(u, o); },
        function (room, level) { return verifyImpl(room, level); },
        function (text, type) { messages.push({ text: String(text), type: type }); },
        "9999", function () { return "ctn"; },
        clock.setTimeout, clock.clearTimeout, clock.setInterval, clock.clearInterval
    );
    return {
        dom: dom, win: win, api: api, log: log, clock: clock, messages: messages,
        setVerify: function (fn) { verifyImpl = fn; },
        setFetch: function (fn) { fetchImpl = fn; },
    };
}

async function testRedPacketCatchAndBounded() {
    const wait = function (ms) { return new Promise(function (r) { setTimeout(r, ms); }); };

    // ① verifyFans 失败（断网 / 未登录 / 页面改版）：旧实现无 catch → unhandled rejection，
    //    勾选保持选中、定时器没起、存储没写、零提示。
    const fail = loadRedPacket({ verify: function () { return Promise.reject(new Error("network down")); } });
    fail.api.init();
    const box = fail.win.document.getElementById("extool__redpacekt_room_start");
    box.checked = true;
    box.dispatchEvent(new fail.win.Event("click"));
    await wait(60);
    assert.strictEqual(box.checked, false, "校验失败必须取消勾选");
    assert.strictEqual(fail.clock.pending(), 0, "校验失败不得留下轮询定时器");
    assert.ok(fail.messages.some(function (m) { return m.text.indexOf("网络异常") !== -1; }),
        "必须提示网络异常，实际 " + JSON.stringify(fail.messages));
    assert.strictEqual(JSON.parse(fail.win.localStorage.getItem("ExSave_RedPacket_Room") || "{}").isGetRedPacket, false,
        "存储必须与界面一致");

    // ② 拉取列表连续失败 3 次：必须自动关闭（旧实现定时器一直转、每 tick 一条 unhandled rejection）
    const broken = loadRedPacket({
        verify: function () { return Promise.resolve(true); },
        fetch: function () { return Promise.resolve({ json: function () { return Promise.resolve({ data: {} }); } }); },
    });
    broken.api.init();
    const box2 = broken.win.document.getElementById("extool__redpacekt_room_start");
    box2.checked = true;
    box2.dispatchEvent(new broken.win.Event("click"));
    await wait(20);
    assert.strictEqual(broken.clock.pending(), 1, "校验通过后必须真的起了 60 秒轮询");
    await broken.api.list("9999");
    await broken.api.list("9999");
    assert.strictEqual(box2.checked, true, "失败 2 次还不该关闭");
    await broken.api.list("9999");
    await wait(20);
    assert.strictEqual(box2.checked, false, "连续 3 次失败必须自动关闭");
    assert.strictEqual(broken.clock.pending(), 0, "自动关闭后不得留下定时器");
    assert.ok(broken.messages.some(function (m) { return m.text.indexOf("连续 3 次") !== -1; }),
        "必须提示已自动关闭，实际 " + JSON.stringify(broken.messages));

    // ③ 补抢递归必须有上限：接口恒返回 isSuc=2 时旧实现会无限打接口
    let grabs = 0;
    const grabPage = loadRedPacket({ fetch: function () { grabs++; return Promise.resolve({ json: function () { return Promise.resolve({ data: { isSuc: 2 } }); } }); } });
    grabPage.api.grab("rpid-1");
    await wait(80);
    assert.ok(grabs <= 5, "补抢次数必须有上限（5），实际 " + grabs);
    assert.ok(grabs >= 2, "至少补抢一次，实际 " + grabs);

    console.log("✓ 场景 16 通过: 红包校验有 catch、连续失败自动关闭、补抢有上限");
}

/* ------------------------------------------------------------------ */
/* 场景 17: 宝箱延迟校验与 catch（P0-6 / P1-12）                       */
/* ------------------------------------------------------------------ */

function loadTreasure(opts) {
    const options = opts || {};
    const dom = makeDom("<!DOCTYPE html><html><body>" +
        "<input type='checkbox' id='extool__treasure_start'>" +
        "<input id='extool__treasure_delay' value='3200'>" +
        "</body></html>");
    const win = dom.window;
    const log = collectConsole();
    const messages = [];
    let verifyImpl = options.verify || function () { return Promise.resolve(false); };
    const factory = new Function(
        "document", "window", "localStorage", "console", "verifyFans", "showMessage", "getCookieValue", "getTreasure", "treasureNum",
        "unsafeWindow", "setTimeout", "clearTimeout", "setInterval", "clearInterval",
        EXGUARD_SRC + "\n" + TREASURE_SRC +
        "\nreturn { init: initPkg_ExpandTool_Treasure, delay: getTreasureDelay, set: ExpandTool_Treasure_Set, " +
        "save: saveData_Treasure, isOn: function () { return isGetTreasure; } };"
    );
    const api = factory(
        win.document, win, win.localStorage, log.console,
        function (room, level) { return verifyImpl(room, level); },
        function (text, type) { messages.push({ text: String(text), type: type }); },
        function () { return "did"; }, function () {}, 0,
        win, win.setTimeout, win.clearTimeout, win.setInterval, win.clearInterval
    );
    return { dom: dom, win: win, api: api, log: log, messages: messages, setVerify: function (fn) { verifyImpl = fn; } };
}

async function testTreasureDelayAndCatch() {
    const wait = function (ms) { return new Promise(function (r) { setTimeout(r, ms); }); };
    const page = loadTreasure();

    // ① 延迟校验：0 / 负数 / 乱码 / 空 都不得让 setTimeout 立刻触发
    const input = page.win.document.getElementById("extool__treasure_delay");
    const cases = [["0", 3200], ["-100", 3200], ["abc", 3200], ["", 3200], ["100", 500], ["3000", 3000]];
    cases.forEach(function (pair) {
        input.value = pair[0];
        assert.strictEqual(page.api.delay(), pair[1], "延迟 " + JSON.stringify(pair[0]) + " 应归一成 " + pair[1]);
    });

    // ② 本地设置损坏：不得中断整个 ExpandTool 初始化
    page.win.localStorage.setItem("ExSave_Treasure", "{broken");
    assert.doesNotThrow(function () { page.api.set(); }, "损坏的宝箱设置不得抛错");
    assert.ok(page.log.warns.some(function (s) { return s.indexOf("已损坏") !== -1; }), "必须留痕");

    // ③ verifyFans 失败：旧实现无 catch → unhandled rejection + 勾选与 isGetTreasure 不一致
    page.setVerify(function () { return Promise.reject(new Error("network down")); });
    page.api.init();
    const box = page.win.document.getElementById("extool__treasure_start");
    box.checked = true;
    box.dispatchEvent(new page.win.Event("click"));
    await wait(60);
    assert.strictEqual(box.checked, false, "校验失败必须取消勾选");
    assert.strictEqual(page.api.isOn(), false, "isGetTreasure 必须同步为 false");
    assert.ok(page.messages.some(function (m) { return m.text.indexOf("网络异常") !== -1; }),
        "必须提示网络异常，实际 " + JSON.stringify(page.messages));

    console.log("✓ 场景 17 通过: 宝箱延迟归一化、坏设置不炸、校验失败复位并提示");
}

/* ------------------------------------------------------------------ */
/* 场景 18: ChatMemory 切房后重新绑定（P1-10）                          */
/* ------------------------------------------------------------------ */

function testChatMemoryRebindAfterRoomSwitch() {
    const page = loadChatMemory({ withInput: true });
    page.api.init();
    assert.strictEqual(page.api.bound(), true, "首次初始化必须绑上");
    assert.strictEqual(page.clock.pending(), 0, "输入框已在场时不该再挂轮询");

    const oldInput = page.win.document.querySelector(".ChatSend-txt");
    oldInput.value = "第一句";
    dispatchKey(oldInput, 13);
    assert.strictEqual(page.api.mem().length, 1, "先记一句");

    // 红：切房把整个聊天区换掉 —— 旧实现 chatMemoryBound 置 true 后永不复位，
    //     新节点上没有 keydown，按 ↑ 永远没反应。
    const newInput = page.win.document.createElement("textarea");
    newInput.className = "ChatSend-txt";
    oldInput.parentNode.replaceChild(newInput, oldInput);
    assert.strictEqual(page.api.bound(), false, "节点被替换后绑定应判定失效");

    newInput.value = "";
    dispatchKey(newInput, 38);
    assert.strictEqual(newInput.value, "第一句", "切房后按 ↑ 必须回忆上一条（补绑要在同一次按键内生效）");

    // 多次切房不得叠事件（一次按键只回忆一次）
    const third = page.win.document.createElement("textarea");
    third.className = "ChatSend-txt";
    newInput.parentNode.replaceChild(third, newInput);
    third.value = "第二句";
    dispatchKey(third, 13);
    assert.strictEqual(page.api.mem().length, 2, "换节点后回车仍然只记一条，实际 " + JSON.stringify(page.api.mem()));
    third.value = "";
    dispatchKey(third, 38);
    assert.strictEqual(third.value, "第二句", "第三次换节点后 ↑ 仍然可用");

    console.log("✓ 场景 18 通过: 聊天区被替换后自动补绑，↑ 回忆在切房后仍然可用");
}

/* ------------------------------------------------------------------ */
/* 场景 19: ExPanel 自愈巡检的节流与归位（P1-9）                        */
/* ------------------------------------------------------------------ */

const EXPANEL_SRC = read("src/packages/ExPanel/ExPanel.js");

function loadExPanel() {
    const dom = makeDom("<!DOCTYPE html><html><body>" +
        "<div class='room-Player'><div class='PlayerToolbar'>" +
        "<div class='PlayerToolbar-ContentRow'><div class='PlayerToolbar-ContentCell'><div class='PlayerToolbar-Wealth'></div></div></div>" +
        "</div></div><div id='js-player-dialog'></div></body></html>");
    const win = dom.window;
    const log = collectConsole();
    const clock = makeClock();
    const factory = new Function(
        "document", "window", "console", "setTimeout", "clearTimeout", "setInterval", "clearInterval",
        EXGUARD_SRC + "\n" + EXPANEL_SRC +
        "\nreturn { insertDom: initPkg_ExPanel_insertDom, start: ExPanel_startSelfHeal, stop: ExPanel_stopSelfHeal, " +
        "ensure: ExPanel_ensureAttached, heal: ExPanel_healDock, chip: function () { return ExPanel_healCadence; }, " +
        "dock: function () { return ExPanel_dockNode; }, timer: function () { return ExPanel_healTimer; } };"
    );
    const api = factory(
        win.document, win, log.console,
        clock.setTimeout, clock.clearTimeout, clock.setInterval, clock.clearInterval
    );
    return { dom: dom, win: win, api: api, log: log, clock: clock };
}

function testExPanelSelfHealBackoff() {
    const page = loadExPanel();
    page.api.insertDom();
    const dock = page.api.dock();
    assert.ok(dock, "Dock 必须建出来");
    assert.strictEqual(dock.parentNode.className.indexOf("PlayerToolbar-Wealth") !== -1, true, "首次应插进礼物流水条");

    // jsdom 默认 visibilityState=prerender（document.hidden = true），先摆成"前台可见"
    Object.defineProperty(page.win.document, "hidden", { value: false, configurable: true });

    page.api.start();
    assert.strictEqual(page.clock.pending(), 1, "自愈必须只挂一个定时器（旧实现是 setInterval 也只有一个，但永不换档）");

    // ① 健康巡检：逐次降档到 30 秒——不是每 3 秒摸一次 DOM 摸到关页面
    page.clock.advance(3000 * 20 + 100);
    assert.strictEqual(page.api.chip(), 30000, "连续健康 20 次后必须降到 30 秒一档，实际 " + page.api.chip());
    assert.strictEqual(page.clock.pending(), 1, "任何时候都只允许有一个待执行的巡检");

    // ② 后台页签跳过：document.hidden 时搬不搬都不该动 DOM
    Object.defineProperty(page.win.document, "hidden", { value: true, configurable: true });
    dock.remove();
    page.clock.advance(30000);
    assert.strictEqual(dock.isConnected, false, "后台页签不得做 DOM 搬家");
    Object.defineProperty(page.win.document, "hidden", { value: false, configurable: true });

    // ③ 页面重绘把 Dock 摘掉：下一次巡检必须原样挂回，并立刻回到快速档
    page.clock.advance(30000);
    assert.strictEqual(dock.isConnected, true, "重绘后必须自动挂回（自愈语义不变）");
    assert.strictEqual(page.api.chip(), 3000, "刚搬回就回到快速档");
    assert.ok(page.log.warns.some(function (s) { return s.indexOf("已重新挂回") !== -1; }), "搬回要留痕");

    // ④ 浮动态归位：曾经被搬进浮动宿主，礼物流水条回来后必须搬回去
    //   （旧实现只看 document.contains，"浮着"会一直挂到刷新）
    page.win.document.getElementById("js-player-dialog").appendChild(dock);
    dock.classList.add("ex-panel--floating");
    assert.strictEqual(page.api.heal(), true, "锚点回来后应执行一次归位（这次巡检确实动过 DOM）");
    assert.strictEqual(page.api.ensure(), true, "对外契约不变：ensureAttached 仍返回\"Dock 现在挂在文档里\"");
    assert.strictEqual(dock.classList.contains("ex-panel--floating"), false, "必须摘掉浮动标记");
    assert.ok(dock.parentNode && String(dock.parentNode.className).indexOf("PlayerToolbar-Wealth") !== -1,
        "必须搬回礼物流水条");

    page.api.stop();
    assert.strictEqual(page.clock.pending(), 0, "stopSelfHeal 之后不得再留定时器");

    console.log("✓ 场景 19 通过: 自愈改有判据的节流巡检（后台跳过 / 降档 / 搬回复位 / 浮动归位）");
}

/* ------------------------------------------------------------------ */
/* 场景 20: FollowList 覆盖式渲染（P1-8）                              */
/* ------------------------------------------------------------------ */

const FOLLOWLIST_SRC = read("src/packages/FollowList/FollowList.js");

function loadFollowList() {
    const dom = makeDom("<!DOCTYPE html><html><body>" +
        "<div class='Header-follow-tab is-active'>全部</div>" +
        "<div class='Header-follow-listWrap'><li class='DropPaneList page-own'>页面自带条目</li></div>" +
        "</body></html>");
    const win = dom.window;
    const log = collectConsole();
    const messages = [];
    const cclicks = [];
    class FakeCClick {
        constructor(el) { this.el = el; this.handlers = []; cclicks.push(this); }
        click(fn) { this.handlers.push(fn); }
    }
    const fetchImpl = function () {
        return Promise.resolve({
            json: function () {
                return Promise.resolve({
                    error: "0",
                    data: {
                        list: [
                            { show_status: "1", videoLoop: "0", room_id: "111", nickname: "A", room_name: "A的房", online: 1, avatar_small: "a_big.jpg", show_time: 1000 },
                            { show_status: "1", videoLoop: "0", room_id: "222", nickname: "B", room_name: "B的房", online: 2, avatar_small: "b_big.jpg", show_time: 1000 },
                            { show_status: "0", videoLoop: "0", room_id: "333", nickname: "C", room_name: "C的房", online: 0 }
                        ],
                    },
                });
            },
        });
    };
    const factory = new Function(
        "document", "window", "console", "fetch", "showMessage", "GM_getValue", "GM_setValue",
        "formatSeconds", "CClick", "openPage",
        EXGUARD_SRC + "\n" + FOLLOWLIST_SRC +
        "\nreturn { render: setNewFollowList };"
    );
    const api = factory(
        win.document, win, log.console, fetchImpl,
        function (text, type) { messages.push({ text: String(text), type: type }); },
        function () { return Promise.resolve(false); },
        function () { return Promise.resolve(); },
        function (s) { return s + "秒"; },
        FakeCClick, function () {}
    );
    return { dom: dom, win: win, api: api, log: log, messages: messages, cclicks: cclicks };
}

async function testFollowListNoDuplicate() {
    const page = loadFollowList();
    const panel = page.win.document.getElementsByClassName("Header-follow-listWrap")[0];
    const pageOwnNode = panel.querySelector(".page-own");

    await page.api.render(panel);
    assert.strictEqual(panel.querySelectorAll(".ExFollowListItem").length, 2, "只有 2 个在播房间应渲染 2 条");
    assert.strictEqual(panel.querySelectorAll("#refreshFollowList").length, 1, "刷新条只该有一条");

    // 红：DomHook 每次回调（切 tab）都会再走一遍，旧实现 innerHTML += 会追加
    await page.api.render(panel);
    await page.api.render(panel);
    assert.strictEqual(panel.querySelectorAll(".ExFollowListItem").length, 2,
        "重复渲染不得追加，实际 " + panel.querySelectorAll(".ExFollowListItem").length);
    assert.strictEqual(panel.querySelectorAll("#refreshFollowList").length, 1,
        "刷新条不得叠成多条，实际 " + panel.querySelectorAll("#refreshFollowList").length);

    // innerHTML += 会把整个容器重解析，页面自己的节点被克隆替换 → 页面监听器全丢
    assert.strictEqual(panel.querySelector(".page-own"), pageOwnNode, "页面自带节点必须还是同一个对象（不得被重解析）");
    assert.strictEqual(panel.firstElementChild, pageOwnNode, "页面自带节点必须仍在原位");

    // 每个条目只应有一份事件绑定
    assert.strictEqual(page.cclicks.length, 2 * 3, "三次渲染各绑一次新节点（旧节点已移除），实际 " + page.cclicks.length);

    console.log("✓ 场景 20 通过: 关注列表改覆盖式渲染，切 tab 不再翻倍、页面自带节点不被重解析");
}

/* ------------------------------------------------------------------ */
/* 场景 21: ExpandTool 初始化链逐项隔离（P2-1）                        */
/* ------------------------------------------------------------------ */

const EXPANDTOOL_SRC = read("src/packages/ExpandTool/ExpandTool.js");

function loadExpandToolInit() {
    const start = EXPANDTOOL_SRC.indexOf("function initPkg_ExpandTool() {");
    assert.ok(start !== -1, "ExpandTool.js 里找不到 initPkg_ExpandTool，测试需同步");
    const end = EXPANDTOOL_SRC.indexOf("function initPkg_ExpandTool_Dom() {", start);
    assert.ok(end !== -1, "ExpandTool.js 结构变化（找不到 Dom 初始化），测试需同步");
    const INIT_SRC = EXPANDTOOL_SRC.slice(start, end);
    const tops = ["initPkg_ExpandTool_Dom", "initPkg_ExpandTool_Func"];
    const mods = [
        "initPkg_ExpandTool_Treasure", "initPkg_ExpandTool_RedPacket_Room", "initPkg_ExpandTool_AutoFish",
        "initPkg_ExpandTool_ClearBag", "initPkg_ExpandTool_SendGift", "initPkg_ExpandTool_TabSwitch",
        "initPkg_ExpandTool_P2P", "initPkg_ExpandTool_FullScreen", "initPkg_ExpandTool_AutoBarrageColor"
    ];
    const names = tops.concat(mods);
    const factory = new Function(names.join(", ") + ", console",
        EXGUARD_SRC + "\n" + INIT_SRC + "\nreturn { init: initPkg_ExpandTool };");
    return {
        names: names,
        build: function (log, throwOn) {
            const order = [];
            const handlers = names.map(function (n) {
                return function () {
                    order.push(n);
                    if (n === throwOn) throw new Error(n + " boom");
                };
            });
            const api = factory.apply(null, handlers.concat([log.console]));
            return { api: api, order: order };
        },
    };
}

function testExpandToolInitIsolation() {
    const page = loadExpandToolInit();

    // 绿：12 个入口按原顺序全部执行（面板 → 交互 → 9 个模块）
    const clean = page.build(collectConsole());
    clean.api.init();
    assert.deepStrictEqual(clean.order, page.names, "ExpandTool 必须按原顺序初始化全部入口");

    // 红：旧实现任一模块抛错就中断在它自己 —— 排在后面的模块（打榜送礼 / Tab / P2P / 全屏 / 颜色）全都没了，
    //     外层 initPkg_Safe 只兜一次，日志里只有一行。
    const log = collectConsole();
    const broken = page.build(log, "initPkg_ExpandTool_Treasure");
    assert.doesNotThrow(function () { broken.api.init(); }, "单模块抛错不得冲出 initPkg_ExpandTool");
    assert.deepStrictEqual(broken.order, page.names,
        "一个模块失败后其余模块必须照常执行，实际 " + JSON.stringify(broken.order));
    assert.ok(log.warns.some(function (s) { return s.indexOf("自动宝箱") !== -1 && s.indexOf("初始化失败") !== -1; }),
        "失败必须报出模块名，实际 " + JSON.stringify(log.warns));

    // 面板本身抛错：交互与九个模块也不能连坐
    const log2 = collectConsole();
    const noPanel = page.build(log2, "initPkg_ExpandTool_Dom");
    noPanel.api.init();
    assert.deepStrictEqual(noPanel.order, page.names, "面板初始化失败时后续步骤仍要全跑");

    console.log("✓ 场景 21 通过: ExpandTool 12 个初始化入口逐项隔离，单点失败不再连坐");
}

/* ------------------------------------------------------------------ */
/* 场景 22: 固定锚点失效（MonthCost / RoomVip，P2-7 同族）             */
/* ------------------------------------------------------------------ */

async function testFixedAnchorFallback() {
    const wait = function (ms) { return new Promise(function (r) { setTimeout(r, ms); }); };

    // ① MonthCost：没有 #js-backpack-enter，但页面给了 .BackpackButton
    const mc = loadMonthCost({ html: "<!DOCTYPE html><html><body><div class='PlayerToolbar'><div class='BackpackButton'></div></div></body></html>" });
    assert.ok(mc.api.findAnchor(), "必须认到 .BackpackButton 这个兜底锚点");
    assert.strictEqual(mc.api.insertIcon(), true, "兜底锚点命中时必须真的插进去");
    assert.ok(mc.win.document.querySelector(".month-cost"), "本月消费入口必须插出来（旧实现整块静默消失）");
    mc.api.insertIcon();
    assert.strictEqual(mc.win.document.querySelectorAll(".month-cost").length, 1, "重复调用不得插出第二个");

    // ② 三个锚点都没有：起有上限轮询，锚点晚到也能补插
    const clock = makeClock();
    const late = loadMonthCost({ html: "<!DOCTYPE html><html><body><div id='later'></div></body></html>", clock: clock });
    late.api.init();
    assert.ok(clock.pending() >= 1, "锚点不在时必须起有上限轮询");
    assert.strictEqual(late.win.document.querySelector(".month-cost"), null, "锚点不在时不能凭空插");
    late.win.document.body.insertAdjacentHTML("beforeend", "<div class='BackpackButton'></div>");
    clock.advance(600);
    assert.ok(late.win.document.querySelector(".month-cost"), "锚点出现后必须补插");

    // ③ 一直等不到：必须留痕（旧实现静默消失）
    const give = loadMonthCost({ html: "<!DOCTYPE html><html><body></body></html>", clock: makeClock() });
    give.api.init();
    give.clock.advance(500 * 25);
    assert.ok(give.log.warns.some(function (s) { return s.indexOf("已放弃") !== -1; }),
        "等不到锚点必须留痕，实际 " + JSON.stringify(give.log.warns));
    assert.strictEqual(give.win.document.querySelector(".month-cost"), null);

    // ④ RoomVip：同样走多选择器 + 有上限等待
    const expireSec = Math.floor((Date.now() + 5 * 86400000) / 1000);
    const vipFetch = function () {
        return Promise.resolve({
            text: function () {
                return Promise.resolve(effectListHtml([
                    '{"property_id":"1646","show_id_list":"9999","expire_time":"' + expireSec + '"}',
                ]));
            },
        });
    };
    const vip = loadRoomVip({ html: "<!DOCTYPE html><html><body><div class='BackpackButton'></div></body></html>", fetch: vipFetch });
    vip.api.run();
    await wait(30);
    assert.ok(vip.win.document.querySelector(".room-vip"), "兜底锚点命中时也要显示 VIP 到期天数");

    const vipClock = makeClock();
    const lateVip = loadRoomVip({ html: "<!DOCTYPE html><html><body><div id='late'></div></body></html>", clock: vipClock, fetch: vipFetch });
    lateVip.api.run();
    await wait(30);
    assert.strictEqual(lateVip.win.document.querySelector(".room-vip"), null, "锚点不在时先不插");
    assert.ok(vipClock.pending() >= 1, "必须有有上限的等待");
    lateVip.win.document.body.insertAdjacentHTML("beforeend", "<div class='BackpackButton'></div>");
    vipClock.advance(600);
    const lateBadge = lateVip.win.document.querySelector(".room-vip");
    assert.ok(lateBadge, "锚点出现后必须补插 VIP 节点");
    // jsdom 不实现 innerText（写进去只是个属性），所以读属性本身，不读 textContent
    const lateDay = lateBadge.querySelector("#room-vip-expire-days");
    assert.strictEqual(String(lateDay.innerText), "4", "补插后仍要写上天数，实际 " + String(lateDay.innerText));

    console.log("✓ 场景 22 通过: 背包入口多选择器兜底 + 有上限等待 + 找不到留痕");
}

/* ------------------------------------------------------------------ */
/* 场景 23: LastLiveTime 不再串化整个 body（P2/成本）                  */
/* ------------------------------------------------------------------ */

const LASTLIVE_SRC = read("src/packages/LastLiveTime/LastLiveTime.js");

function loadLastLive(opts) {
    const options = opts || {};
    const dom = makeDom(options.html || "<!DOCTYPE html><html><body></body></html>");
    const win = dom.window;
    const log = collectConsole();
    const clock = makeClock();
    const TIMEAGO_SRC = sliceSource(COMMON_SRC, "function timeago(old) {", "function getRandom(min, max) {", "timeago");
    const factory = new Function(
        "document", "window", "unsafeWindow", "console", "setInterval", "clearInterval", "setTimeout", "clearTimeout",
        EXGUARD_SRC + "\n" + DATEFORMAT_SRC + "\n" + TIMEAGO_SRC + "\n" + LASTLIVE_SRC +
        "\nreturn { read: LastLiveTime_readPageRoom, init: initPkg_LastLiveTime };"
    );
    const api = factory(
        win.document, win, options.unsafeWindow || win, log.console,
        clock.setInterval, clock.clearInterval, clock.setTimeout, clock.clearTimeout
    );
    return { dom: dom, win: win, api: api, log: log, clock: clock };
}

function testLastLiveTimeCheapProbe() {
    // ① 页面全局 $ROOM：最便宜的判据，直接拿到状态
    const byGlobal = loadLastLive({
        unsafeWindow: { $ROOM: { show_status: "0", show_time: 1700000000 } },
        html: "<!DOCTYPE html><html><body></body></html>",
    });
    const g = byGlobal.api.read();
    assert.strictEqual(g.isLive, false, "下播状态要判对");
    assert.strictEqual(g.showTime, 1700000000, "必须直接取到 show_time");
    assert.ok(String(g.from).indexOf("$ROOM") !== -1, "应走页面全局这条快路径，实际 " + g.from);

    // ② 没有全局变量时只扫内联脚本（不再把整棵 DOM 串成字符串）
    const byScript = loadLastLive({
        unsafeWindow: {},
        html: "<!DOCTYPE html><html><body><script>var cfg = {\"show_status\":0,\"show_time\":1700000000};</script></body></html>",
    });
    const s = byScript.api.read();
    assert.strictEqual(s.isLive, false);
    assert.strictEqual(s.showTime, 1700000000, "内联脚本兜底必须仍能取到 show_time");

    // ③ 在播：直接返回，不折腾 DOM
    const live = loadLastLive({ unsafeWindow: { $ROOM: { show_status: "1" } } });
    assert.strictEqual(live.api.read().isLive, true, "在播状态要判对");

    // ④ 完全没有线索：返回空，不抛错
    const none = loadLastLive({ unsafeWindow: {} });
    const n = none.api.read();
    assert.strictEqual(n.showTime, null);
    assert.strictEqual(n.isLive, false);

    // ⑤ 源码级：不许再出现整份 body 串化
    assert.ok(stripComments(LASTLIVE_SRC).indexOf("document.body.innerHTML") === -1,
        "LastLiveTime 不得再把 document.body.innerHTML 整份串化（注释里保留来龙去脉不算）");
    assert.ok(LASTLIVE_SRC.indexOf("document.scripts") !== -1, "兜底必须只扫内联脚本");

    console.log("✓ 场景 23 通过: 上次开播时间改走 $ROOM 快路径 + 内联脚本兜底，不再串化整个 body");
}

/* ------------------------------------------------------------------ */
/* 场景 24: FansBadgeList 房间内嵌形态 + 幂等（P2）                     */
/* ------------------------------------------------------------------ */

function testFansBadgeLateMount() {
    // ① 房间内嵌形态：表格是异步渲染的 —— 旧实现取一次就 return，永远是 0 行
    const late = loadFansBadgeList("<!DOCTYPE html><html><body><div id='later'></div></body></html>");
    late.api.init();
    assert.ok(late.clock.pending() >= 1, "表格不在时必须有有上限的等待");
    late.win.document.body.insertAdjacentHTML("beforeend",
        "<table class='fans-badge-list'><tr><th>房间</th><th>牌子</th></tr>" +
        "<tr data-fans-gbdgts='1700000000'><td>a</td><td>b</td></tr></table>");
    late.clock.advance(600);
    const rows = late.win.document.querySelectorAll(".fans-badge-list tr");
    assert.ok(rows[1].innerHTML.indexOf("已获取") !== -1, "表格晚渲染也必须补上注释");

    // ② 幂等：独立页与房间浮层两个入口先后都调到这里，同一行不能被注释两遍
    late.api.init();
    late.api.annotate();
    const again = late.win.document.querySelectorAll(".fans-badge-list tr");
    const count = (again[1].innerHTML.match(/已获取/g) || []).length;
    assert.strictEqual(count, 1, "同一行只允许注释一次，实际 " + count);

    console.log("✓ 场景 24 通过: 粉丝牌表格晚渲染也能挂上，且重复入口不会注释两遍");
}

/* ------------------------------------------------------------------ */
/* 场景 25-27: Refresh 包（P1 批：保存阶段裸解引用 / 恢复路径 / DomHook） */
/* ------------------------------------------------------------------ */

const REFRESH_SRC = read("src/packages/Refresh/Refresh.js");
const REFRESH_BARRAGE_SRC = read("src/packages/Refresh/Refresh_Barrage.js");
const REFRESH_FRAME_SRC = read("src/packages/Refresh/Refresh_BarrageFrame.js");
const REFRESH_VIDEO_SRC = read("src/packages/Refresh/Refresh_Video.js");

function getValidDomImpl(queryList) {
    for (const query of queryList) {
        const el = document.querySelector(query);
        if (el) return el;
    }
    return null;
}

function loadRefresh(opts) {
    const options = opts || {};
    const dom = makeDom(options.html || "<!DOCTYPE html><html><body></body></html>");
    const win = dom.window;
    const log = collectConsole();
    const clock = options.clock || makeClock();
    const messages = [];
    const styles = { set: [], removed: [] };
    const hooks = [];
    class FakeDomHook {
        constructor(selector, subtree, cb) { hooks.push({ selector: selector, subtree: subtree, cb: cb }); }
    }
    const factory = new Function(
        "document", "window", "localStorage", "console",
        "setTimeout", "clearTimeout", "setInterval", "clearInterval",
        "StyleHook_set", "StyleHook_remove", "DomHook", "showMessage", "getValidDom", "resizeWindow", "PostbirdAlertBox",
        EXGUARD_SRC + "\n" + GETVALIDDOM_SRC + "\n" +
        REFRESH_SRC + "\n" + REFRESH_BARRAGE_SRC + "\n" + REFRESH_FRAME_SRC + "\n" + REFRESH_VIDEO_SRC +
        "\nreturn { initPkg: initPkg_Refresh, save: saveData_Refresh, readSave: Refresh_readSave, " +
        "initFrame: initPkg_Refresh_BarrageFrame, initVideo: initPkg_Refresh_Video, initBarrage: initPkg_Refresh_Barrage, " +
        "initVideoSet: initPkg_Refresh_Video_Set, " +
        "frameStatus: refresh_BarrageFrame_getStatus, barrageStatus: refresh_Barrage_getStatus, videoStatus: refresh_Video_getStatus, " +
        "frameApply: Refresh_BarrageFrame_apply, setBarrage: setRefreshBarrage, cancelBarrage: cancelRefreshBarrage };"
    );
    const api = factory(
        win.document, win, win.localStorage, log.console,
        clock.setTimeout, clock.clearTimeout, clock.setInterval, clock.clearInterval,
        function (id, css) { styles.set.push({ id: id, css: css }); },
        function (id) { styles.removed.push(id); },
        FakeDomHook,
        function (text, type) { messages.push({ text: String(text), type: type }); },
        getValidDomImpl, function () {},
        options.noAlertBox ? undefined : { confirm: function (cfg) { if (cfg && cfg.onConfirm) cfg.onConfirm(); } }
    );
    return { dom: dom, win: win, api: api, log: log, clock: clock, messages: messages, styles: styles, hooks: hooks };
}

function testRefreshSaveAndClickWithoutNodes() {
    // ① 非直播间（没有 .layout-Player-rank）：旧实现 saveData_Refresh → getStatus 裸取 .style 抛，
    //    于是「拉高 / 前缀 / 隐藏礼物栏」三处操作全部在**保存阶段**炸掉。
    const noRank = loadRefresh();
    assert.doesNotThrow(function () { noRank.api.save(); }, "没有日榜节点时保存不得抛错");
    const saved = JSON.parse(noRank.win.localStorage.getItem("ExSave_Refresh"));
    assert.strictEqual(saved.barrageFrame.status, false, "节点不在时按「没拉高」落盘");
    assert.strictEqual(noRank.api.frameStatus(), false, "getStatus 必须安全返回 false");

    // ② 点「拉高」但页面没有 .Barrage（新版版式）：旧实现在回调里裸取 dom_rank.style / dom_topBarrage.className
    const clickNoNode = loadRefresh({ html: "<!DOCTYPE html><html><body><div class='Barrage-toolbar'></div></body></html>" });
    clickNoNode.api.initFrame();
    const btn = clickNoNode.win.document.getElementById("refresh-barrage-frame");
    assert.ok(btn, "「拉高」按钮必须插进 .Barrage-toolbar");
    assert.doesNotThrow(function () { btn.dispatchEvent(new clickNoNode.win.Event("click")); }, "节点缺失时点击不得抛错");
    assert.ok(clickNoNode.log.warns.some(function (s) { return s.indexOf("拉高") !== -1; }), "必须留痕");
    const saved2 = JSON.parse(clickNoNode.win.localStorage.getItem("ExSave_Refresh") || "{}");
    assert.strictEqual(saved2.barrageFrame ? saved2.barrageFrame.status : false, false, "没执行成功就不该写成已拉高");

    // ③ 正常房间（有日榜 + 弹幕区，但没有活动区）：必须真的拉高，且不因缺 #js-room-activity 而抛
    const okHtml = "<!DOCTYPE html><html><body><div class='Barrage-toolbar'></div>" +
        "<div class='layout-Player-rank'></div><div class='Barrage'></div></body></html>";
    const ok = loadRefresh({ html: okHtml });
    ok.api.initFrame();
    const okBtn = ok.win.document.getElementById("refresh-barrage-frame");
    assert.doesNotThrow(function () { okBtn.dispatchEvent(new ok.win.Event("click")); }, "缺活动区不得抛错");
    assert.strictEqual(ok.win.document.querySelector(".layout-Player-rank").style.display, "none", "日榜必须被隐藏");
    assert.strictEqual(ok.win.document.querySelector(".Barrage").className, "Barrage top-0-important", "弹幕区必须拉高");
    assert.strictEqual(JSON.parse(ok.win.localStorage.getItem("ExSave_Refresh")).barrageFrame.status, true, "状态必须落盘");
    // W10：两态文案必须不同
    const text = ok.win.document.getElementById("refresh-barrage-frame__text");
    assert.strictEqual(text.innerText, "恢复高度", "开启态文案必须是反向的，实际 " + text.innerText);
    okBtn.dispatchEvent(new ok.win.Event("click"));
    assert.strictEqual(ok.win.document.querySelector(".layout-Player-rank").style.display, "block", "再点一次必须恢复");
    assert.strictEqual(text.innerText, "拉高", "关闭态文案必须回到「拉高」");

    console.log("✓ 场景 25 通过: 非直播间保存不抛、缺活动区照样拉高、两态文案相反");
}

function testRefreshRestorePaths() {
    // ① 存储里开着「拉高」，但页面没有日榜节点：必须跳过 + 留痕，且**不**把状态回写成 false
    const frameMissing = loadRefresh({ html: "<!DOCTYPE html><html><body><div class='Barrage-toolbar'></div></body></html>" });
    frameMissing.win.localStorage.setItem("ExSave_Refresh", JSON.stringify({ barrageFrame: { status: true } }));
    assert.doesNotThrow(function () { frameMissing.api.initFrame(); }, "恢复路径缺节点不得抛错");
    assert.ok(frameMissing.log.warns.some(function (s) { return s.indexOf("恢复") !== -1 && s.indexOf("拉高") !== -1; }),
        "必须留痕，实际 " + JSON.stringify(frameMissing.log.warns));
    assert.strictEqual(JSON.parse(frameMissing.win.localStorage.getItem("ExSave_Refresh")).barrageFrame.status, true,
        "存储里开着就必须保持开着（下次进房还要自动恢复）");

    // ② 存储里开着且节点齐全：必须真的恢复
    const frameOk = loadRefresh({
        html: "<!DOCTYPE html><html><body><div class='Barrage-toolbar'></div>" +
            "<div class='layout-Player-rank'></div><div class='Barrage'></div></body></html>",
    });
    frameOk.win.localStorage.setItem("ExSave_Refresh", JSON.stringify({ barrageFrame: { status: true } }));
    frameOk.api.initFrame();
    assert.strictEqual(frameOk.win.document.querySelector(".layout-Player-rank").style.display, "none", "存储里开着就必须真的恢复");
    assert.strictEqual(frameOk.win.document.getElementById("refresh-barrage-frame__text").innerText, "恢复高度", "恢复后文案要对");

    // ③ 隐藏礼物栏：旧实现恢复路径四个节点全裸 → 刷新即抛、Refresh 包初始化中断
    const videoMissing = loadRefresh({ html: "<!DOCTYPE html><html><body></body></html>" });
    videoMissing.win.localStorage.setItem("ExSave_Refresh", JSON.stringify({ video: { status: true } }));
    assert.doesNotThrow(function () { videoMissing.api.initVideoSet(); }, "缺节点时恢复不得抛错");
    assert.ok(videoMissing.log.warns.some(function (s) { return s.indexOf("隐藏礼物栏") !== -1; }), "缺节点恢复必须留痕");
    assert.strictEqual(videoMissing.api.videoStatus(), false, "节点不在时状态如实为 false");

    const videoOk = loadRefresh({
        html: "<!DOCTYPE html><html><body><div class='right-e7ea5d'></div>" +
            "<div class='PlayerToolbar-ContentRow'></div><div class='layout-Player-video'></div>" +
            "<div id='js-player-dialog'></div></body></html>",
    });
    videoOk.win.localStorage.setItem("ExSave_Refresh", JSON.stringify({ video: { status: true } }));
    videoOk.win.localStorage.setItem("ExSave_FullScreen", JSON.stringify({ isFullScreen: true }));
    videoOk.api.initVideo();
    videoOk.clock.advance(1600);
    assert.strictEqual(videoOk.win.document.querySelector(".PlayerToolbar-ContentRow").style.visibility, "hidden",
        "存储里开着就必须真的隐藏礼物栏");
    assert.strictEqual(videoOk.api.videoStatus(), true, "恢复后状态必须为 true");

    // ④ 前缀：按钮没插进去（无 .Barrage-toolbar）时恢复路径不得抛（W6）
    const barrageNoBtn = loadRefresh({ html: "<!DOCTYPE html><html><body></body></html>" });
    barrageNoBtn.win.localStorage.setItem("ExSave_Refresh", JSON.stringify({ barrage: { status: true } }));
    assert.doesNotThrow(function () { barrageNoBtn.api.initBarrage(); }, "按钮不在时恢复不得抛错");
    assert.strictEqual(barrageNoBtn.api.barrageStatus(), true, "样式与状态必须照常恢复");
    assert.strictEqual(barrageNoBtn.styles.set.length, 1, "样式必须真的注入");

    // ⑤ 脏存储（手工改成非 JSON）：旧实现四处裸 JSON.parse → 整个包初始化中断
    const broken = loadRefresh({ html: "<!DOCTYPE html><html><body></body></html>" });
    broken.win.localStorage.setItem("ExSave_Refresh", "oops");
    assert.doesNotThrow(function () { broken.api.initPkg(); }, "存储损坏时初始化不得抛错");
    assert.ok(broken.log.warns.some(function (s) { return s.indexOf("已损坏") !== -1; }),
        "存储损坏必须留痕，实际 " + JSON.stringify(broken.log.warns));

    console.log("✓ 场景 26 通过: 三条恢复路径都「开着就恢复、缺节点只跳过并留痕」，脏存储不炸");
}

function testRefreshZIndexHooks() {
    // W4：changeToolBarZIndex 挂在三个 DomHook 上，节点短暂消失就会在回调里抛
    const page = loadRefresh({
        html: "<!DOCTYPE html><html><body><div class='right-e7ea5d'></div><div class='layout-Player-video'></div><div id='js-player-dialog'></div></body></html>",
    });
    page.api.initVideo();
    page.clock.advance(1600);
    assert.ok(page.hooks.length >= 3, "三个 DomHook 必须都挂上，实际 " + page.hooks.length);
    assert.doesNotThrow(function () {
        page.hooks.forEach(function (h) { h.cb([{ target: { className: "toggle__P8TKM" } }]); });
    }, "没有播放器工具条时回调不得抛错");
    assert.ok(page.log.warns.some(function (s) { return s.indexOf("播放器工具条") !== -1; }), "必须留痕");

    // 有工具条 + 新版布局：z-index 要真的写
    const withToolbar = loadRefresh({
        html: "<!DOCTYPE html><html><body><div class='right-e7ea5d'></div><div class='layout-Player-video'></div>" +
            "<div id='js-player-dialog'><div id='js-player-toolbar'></div></div>" +
            "<div class='live-next-body'></div></body></html>",
    });
    withToolbar.api.initVideo();
    withToolbar.clock.advance(1600);
    assert.doesNotThrow(function () { withToolbar.hooks.forEach(function (h) { h.cb([{ target: { className: "toggle__P8TKM" } }]); }); });
    const toolbar = withToolbar.win.document.getElementById("js-player-toolbar");
    assert.ok(String(toolbar.getAttribute("style") || "").indexOf("z-index") !== -1,
        "工具条必须被写上 z-index，实际 " + toolbar.getAttribute("style"));

    console.log("✓ 场景 27 通过: changeToolBarZIndex 缺节点只留痕，节点齐全照常写 z-index");
}

/* ------------------------------------------------------------------ */
/* 场景 9: 源码级守卫（本轮所有判空与上限都在位）                       */
/* ------------------------------------------------------------------ */

function testStaticGuardRails() {
    // ① common.js：门禁仍在，且两个历史死代码函数都有判空/兜底
    assert.ok(COMMON_SRC.indexOf(VERIFY_GATE) !== -1, "verifyFans 的首行 return true 不得删除（门禁常开）");
    assert.ok(COMMON_SRC.indexOf("let list = doc ? doc.getElementsByClassName(\"fans-badge-list\")[0] : null;") !== -1,
        "verifyFans 必须对 .fans-badge-list 判空");
    assert.ok(COMMON_SRC.indexOf("if (!a || !a.children) return false;") !== -1,
        "verifyFans 必须对 lastElementChild 判空");
    assert.ok(COMMON_SRC.indexOf("finish(") !== -1 && COMMON_SRC.indexOf("settled") !== -1,
        "getUserName 必须用 settled 保证只 settle 一次");
    assert.ok(COMMON_SRC.indexOf("node.getAttribute(\"title\") || node.textContent") !== -1,
        "getUserName 必须有 title → 文本内容的兜底解析");

    // ② Menu：不再直接调用被架空的 Update_checkVersion（注释里保留来龙去脉不算）
    assert.ok(stripComments(MENU_SRC).indexOf("Update_checkVersion") === -1,
        "Menu 不得再调用空实现的 Update_checkVersion（那就是「点了没反应」本身）");
    assert.ok(MENU_SRC.indexOf("typeof GM_registerMenuCommand !== \"function\"") !== -1,
        "Menu 必须判 GM_registerMenuCommand 是否存在");

    // ③ DanmakuTail / ChatMemory / RoomVip / FansBadgeList / LastLiveTime / MonthCost
    assert.ok(DANMAKUTAIL_SRC.indexOf("ExGuard_pollFor") !== -1, "DanmakuTail 等聊天框必须走有上限轮询");
    assert.ok(CHATMEMORY_SRC.indexOf("ExGuard_pollFor") !== -1, "ChatMemory 等聊天框必须走有上限轮询");
    assert.ok(CHATMEMORY_SRC.indexOf("chatMemoryWaiting") !== -1, "ChatMemory 必须有等待重入保护");
    assert.ok(ROOMVIP_SRC.indexOf("return null;") !== -1, "RoomVip 插入失败必须显式返回 null");
    assert.ok(FANSBADGE_SRC.indexOf("isFinite(tt)") !== -1, "粉丝牌页必须校验获取时间");
    assert.ok(LASTLIVETIME_SRC.indexOf("document.body") !== -1, "LastLiveTime 必须先判 body 存在");
    assert.ok(LASTLIVETIME_SRC.indexOf("本次不显示") !== -1, "LastLiveTime 放弃轮询必须留痕");
    assert.ok(MONTHCOST_SRC.indexOf("MONTH_COST_MAX_RETRY") !== -1, "MonthCost 限流重试必须有上限");
    assert.ok(MONTHCOST_SRC.indexOf("MonthCost_refreshCost") !== -1, "MonthCost 必须有统一的可 catch 刷新出口");
    assert.ok(NOLOGIN_SRC.indexOf("Array.isArray(data)") !== -1, "未登录优化必须排除数组型脏数据");

    // ⑤ task-19 的四条（本文件场景 10-13 的行为断言之外的源码级保险）
    assert.ok(MAIN_SRC.indexOf('initPkg_Safe("Menu"') !== -1, "init() 必须逐项隔离（Menu 走 initPkg_Safe）");
    assert.ok(MONTHCOST_SRC.indexOf("MonthCost_isStale") !== -1, "本月消费必须用自然日边界判断缓存是否过期");
    assert.ok(MONTHCOST_SRC.indexOf("Math.abs(now - new Date(item.updateTime).getDate())") === -1,
        "不得再用「日期号相减」判断跨日");
    assert.ok(MONTHCOST_SRC.indexOf("cached.getFullYear() === today.getFullYear()") !== -1,
        "跨日判断必须按年月日三元组比较");
    assert.ok(ROOMVIP_SRC.indexOf("VIP 已过期") !== -1, "房间VIP 过期必须说「已过期」");
    assert.ok(DANMAKUTAIL_SRC.indexOf("button.disabled") !== -1, "小尾巴回车必须判发送按钮是否可用");

    // ⑥ task-22 的 ExpandTool 四条（场景 14-17 的行为断言之外，钉住"不得回退"的源码特征）
    assert.ok(AUTOFISH_SRC.indexOf("AutoFish_requestJson") !== -1, "自动钓鱼四个包装器必须走统一的可 settle 请求");
    assert.ok(AUTOFISH_SRC.indexOf("AUTOFISH_REQUEST_TIMEOUT") !== -1, "自动钓鱼请求必须有超时上限");
    assert.ok(AUTOFISH_SRC.indexOf('console.log("请求失败!", err)') === -1,
        "自动钓鱼的 .catch 不得再只打日志不 resolve（那正是 await 卡死的原因）");
    assert.ok(AUTOFISH_SRC.indexOf("AutoFish_abort") !== -1, "自动钓鱼失败必须复位界面");
    assert.ok(SENDGIFT_SRC.indexOf("okCount") !== -1, "送礼完成判定必须按真实回调计数");
    assert.ok(SENDGIFT_SRC.indexOf("i == Number(gcnt)") === -1, "送礼不得再用循环变量 i 判定完成");
    assert.ok(REDPACKET_SRC.indexOf("REDPACKET_ROOM_MAX_FAIL") !== -1, "红包轮询必须有连续失败上限");
    assert.ok(REDPACKET_SRC.indexOf("REDPACKET_ROOM_MAX_GRAB") !== -1, "红包补抢递归必须有上限");
    assert.ok(REDPACKET_SRC.indexOf("ExpandTool_RedPacket_Room_stop") !== -1, "红包校验失败必须复位开关");
    assert.ok(TREASURE_SRC.indexOf("TREASURE_DELAY_MIN") !== -1, "宝箱延迟必须归一化（不得为 0/负数）");
    assert.ok(TREASURE_SRC.indexOf("ExpandTool_Treasure_reset") !== -1, "宝箱校验失败必须复位开关");

    // ⑦ task-24：ExPanel 自愈节流 / FollowList 覆盖式渲染 / ChatMemory 切房补绑
    assert.ok(EXPANEL_SRC.indexOf("setInterval(ExPanel_ensureAttached") === -1,
        "ExPanel 自愈不得再用 3 秒一次的 setInterval（必须可换档）");
    assert.ok(EXPANEL_SRC.indexOf("EXPANEL_HEAL_SLOW_MS") !== -1, "ExPanel 自愈必须有降档档位");
    assert.ok(EXPANEL_SRC.indexOf("document.hidden") !== -1, "ExPanel 自愈必须跳过后台页签");
    assert.ok(EXPANEL_SRC.indexOf("ex-panel--floating") !== -1 && EXPANEL_SRC.indexOf("ExPanel_restoreToGiftBar") !== -1,
        "ExPanel 自愈必须能处理浮动态归位");
    assert.ok(stripComments(FOLLOWLIST_SRC).indexOf("panel.innerHTML +=") === -1,
        "FollowList 不得再用 innerHTML += 追加（会翻倍；注释里保留来龙去脉不算）");
    assert.ok(FOLLOWLIST_SRC.indexOf("insertAdjacentHTML") !== -1, "FollowList 必须改成追加式渲染且不动页面原有节点");
    assert.ok(CHATMEMORY_SRC.indexOf("chatMemory_bindInput") !== -1, "ChatMemory 必须有可换绑的绑定函数");
    assert.ok(CHATMEMORY_SRC.indexOf("chatMemory_isBound") !== -1, "ChatMemory 必须能判断当前绑定是否失效");
    assert.ok(CHATMEMORY_SRC.indexOf('classList.contains("ChatSend-txt")') !== -1, "ChatMemory 必须在按键时识别新聊天框");

    // ⑧ task-25：ExpandTool 逐项隔离 / 固定锚点兜底 / 字符串探针 / 挂载形态
    assert.ok(EXPANDTOOL_SRC.indexOf("ExpandTool_tryInit") !== -1, "ExpandTool 必须逐项隔离初始化");
    assert.ok(EXPANDTOOL_SRC.indexOf("ExpandTool_tryInit(modules[i][0]") !== -1, "ExpandTool 的九个模块必须逐个兜底");
    assert.ok(MONTHCOST_SRC.indexOf("MONTH_COST_ANCHOR_SELECTORS") !== -1, "本月消费必须用多选择器锚点");
    assert.ok(MONTHCOST_SRC.indexOf("MonthCost_waitAnchor") !== -1, "本月消费锚点缺失必须有有上限等待");
    assert.ok(MONTHCOST_SRC.indexOf('getValidDom(["#js-backpack-enter"])') === -1, "本月消费不得再只认单个固定锚点");
    assert.ok(ROOMVIP_SRC.indexOf("ROOM_VIP_ANCHOR_SELECTORS") !== -1, "房间VIP 必须用多选择器锚点");
    assert.ok(ROOMVIP_SRC.indexOf("RoomVip_showDays") !== -1, "房间VIP 必须走可等待的展示入口");
    assert.ok(ROOMVIP_SRC.indexOf('getValidDom(["#js-backpack-enter"])') === -1, "房间VIP 不得再只认单个固定锚点");
    assert.ok(stripComments(LASTLIVE_SRC).indexOf("document.body.innerHTML") === -1, "LastLiveTime 不得再串化整个 body");
    assert.ok(LASTLIVE_SRC.indexOf("document.scripts") !== -1, "LastLiveTime 兜底必须只扫内联脚本");
    assert.ok(FANSBADGE_SRC.indexOf("ExGuard_pollFor") !== -1, "粉丝牌页必须等表格渲染（有上限）");
    assert.ok(FANSBADGE_SRC.indexOf("exFansAnnotated") !== -1, "粉丝牌页必须幂等（同一行不注释两遍）");

    // ⑨ task-27：Refresh 的保存/恢复/DomHook 三条路径
    assert.ok(REFRESH_SRC.indexOf("Refresh_readSave") !== -1, "Refresh 必须有统一的存储读取口");
    assert.ok(REFRESH_SRC.indexOf("Refresh_tryInit") !== -1, "Refresh 三个子模块必须逐项隔离");
    assert.ok(REFRESH_SRC.indexOf("Refresh_readFullScreen") !== -1, "跨包只读键必须有带注释的封装");
    [["Refresh_Barrage", REFRESH_BARRAGE_SRC], ["Refresh_BarrageFrame", REFRESH_FRAME_SRC], ["Refresh_Video", REFRESH_VIDEO_SRC]].forEach(function (pair) {
        assert.ok(stripComments(pair[1]).indexOf("JSON.parse") === -1, pair[0] + " 不得再自己裸 JSON.parse（统一走 Refresh_readSave）");
    });
    assert.ok(REFRESH_FRAME_SRC.indexOf("Refresh_BarrageFrame_apply(") !== -1, "「拉高」必须有统一的判空执行口");
    assert.ok(REFRESH_FRAME_SRC.indexOf("if (!dom_rank || !dom_topBarrage)") !== -1, "「拉高」必须判日榜/弹幕区节点");
    assert.ok(REFRESH_FRAME_SRC.indexOf("恢复高度") !== -1, "「拉高」开启态文案必须反向");
    assert.ok(REFRESH_VIDEO_SRC.indexOf("Refresh_readFullScreen") !== -1, "隐藏礼物栏必须走封装的跨包读取");
    assert.ok(REFRESH_VIDEO_SRC.indexOf("if (isBeta && dom_player_toolbar && dom_player_toolbar.parentElement)") !== -1,
        "changeToolBarZIndex 的 parentElement 必须判空");
    assert.ok(REFRESH_BARRAGE_SRC.indexOf("Refresh_Barrage_applyUI") !== -1, "「前缀」外观更新必须判空");
    assert.ok(REFRESH_BARRAGE_SRC.indexOf("typeof PostbirdAlertBox === \"undefined\"") !== -1, "弹窗库缺失必须有兜底");
    assert.ok(REFRESH_FRAME_SRC.indexOf("typeof PostbirdAlertBox === \"undefined\"") !== -1, "弹窗库缺失必须有兜底（拉高）");

    // ④ LastLiveTime 在没有目标节点的页面上不得抛错
    const dom = makeDom("<!DOCTYPE html><html><body><div>普通页面</div></body></html>");
    const log = collectConsole();
    const TIMEAGO_SRC = sliceSource(COMMON_SRC, "function timeago(old) {", "function getRandom(min, max) {", "timeago");
    const factory = new Function(
        "document", "window", "console", "setInterval", "clearInterval", "setTimeout", "clearTimeout",
        EXGUARD_SRC + "\n" + DATEFORMAT_SRC + "\n" + TIMEAGO_SRC + "\n" + LASTLIVETIME_SRC +
        "\nreturn { init: initPkg_LastLiveTime };"
    );
    const clock = makeClock();
    const api = factory(dom.window.document, dom.window, log.console,
        clock.setInterval, clock.clearInterval, clock.setTimeout, clock.clearTimeout);
    assert.doesNotThrow(function () { api.init(); }, "上次开播时间初始化不得抛错");

    console.log("✓ 场景 9 通过: 本轮所有判空/上限/自证信息都在源码里");
}

(async function main() {
    await testVerifyFansGate();
    await testGetUserNameAlwaysSettles();
    testMenuCheckUpdate();
    testDanmakuTailDeadEnds();
    testFansBadgeListRows();
    await testRoomVipDeadEnds();
    await testMonthCostDeadEnds();
    testChatMemoryDeadEnds();
    testStaticGuardRails();
    testInitIsolation();
    await testMonthCostStaleness();
    await testRoomVipExpiredWording();
    testDanmakuTailEnterGuard();
    await testAutoFishAlwaysSettles();
    await testSendGiftRealCount();
    await testRedPacketCatchAndBounded();
    await testTreasureDelayAndCatch();
    testChatMemoryRebindAfterRoomSwitch();
    testExPanelSelfHealBackoff();
    await testFollowListNoDuplicate();
    testExpandToolInitIsolation();
    await testFixedAnchorFallback();
    testLastLiveTimeCheapProbe();
    testFansBadgeLateMount();
    testRefreshSaveAndClickWithoutNodes();
    testRefreshRestorePaths();
    testRefreshZIndexHooks();
    console.log("=== task-17/19/22/24/25/27 回归（死代码 + 面板死路 + 各级隔离 + 锚点/探针/挂载 + Refresh）27 组场景全部通过 ===");
})().catch(function (e) {
    console.error("测试失败:", e && e.stack ? e.stack : e);
    process.exit(1);
});
