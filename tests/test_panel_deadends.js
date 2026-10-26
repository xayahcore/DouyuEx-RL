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
    const dom = makeDom("<!DOCTYPE html><html><body></body></html>");
    const win = dom.window;
    const log = collectConsole();
    const clock = makeClock();
    const messages = [];
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
    return { dom: dom, win: win, api: api, log: log, clock: clock, messages: messages };
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

function loadFansBadgeList(html) {
    const dom = makeDom(html);
    const win = dom.window;
    const log = collectConsole();
    const factory = new Function(
        "document", "window", "console",
        EXGUARD_SRC + "\n" + DATEFORMAT_SRC + "\n" + FANSBADGE_SRC + "\nreturn { init: initPkg_FansBadgeList };"
    );
    const api = factory(win.document, win, log.console);
    return { dom: dom, win: win, api: api, log: log };
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
    const factory = new Function(
        "document", "window", "console", "fetch", "DOMParser", "rid",
        EXGUARD_SRC + "\n" + GETVALIDDOM_SRC + "\n" + ROOMVIP_SRC +
        "\nreturn { run: setRoomVipExpireDays, insert: initPkg_RoomVip_Dom };"
    );
    const api = factory(win.document, win, log.console, function (u) { return fetchImpl(u); }, win.DOMParser, options.rid || "9999");
    return { dom: dom, win: win, api: api, log: log };
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
    assert.ok(noDock.log.warns.some(function (s) { return s.indexOf("背包入口") !== -1; }),
        "插不进去必须留痕，实际 " + JSON.stringify(noDock.log.warns));

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
        "document", "window", "localStorage", "my_uid", "fetch", "console",
        "setTimeout", "clearTimeout", "setInterval", "clearInterval",
        EXGUARD_SRC + "\n" + GETVALIDDOM_SRC + "\n" + MONTHCOST_SRC +
        "\nreturn { init: initPkg_MonthCost, refresh: MonthCost_refreshCost, getCost: getMonthCost, " +
        "update: MonthCost_updateCost, money: MonthCost_getMoneyDom, total: function () { return totalMonthCost; }, " +
        "detail: function () { return typeDetail; }, setSee: function (v) { seeStatus = v; } };"
    );
    const api = factory(
        win.document, win, win.localStorage, options.uid || "12345",
        function (url) { calls.push(url); return fetchImpl(url); },
        log.console, fastTimeout, function () {}, function () {}, function () {}
    );
    return { dom: dom, win: win, api: api, log: log, calls: calls };
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
        "bound: function () { return chatMemoryBound; } };"
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
    console.log("=== task-17 回归（common.js 死代码 + 面板死路）9 组场景全部通过 ===");
})().catch(function (e) {
    console.error("测试失败:", e && e.stack ? e.stack : e);
    process.exit(1);
});
