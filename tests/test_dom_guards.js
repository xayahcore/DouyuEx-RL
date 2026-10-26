const fs = require("fs");
const path = require("path");
const assert = require("assert");
let JSDOM, VirtualConsole;
try {
    JSDOM = require("jsdom").JSDOM;
    VirtualConsole = require("jsdom").VirtualConsole;
} catch (e) {
    console.error("[测试] 缺少依赖 jsdom，请先执行：npm install");
    throw e;
}

/**
 * DOM 红线批（AGENTS 四节）：LiveTool / BarrageLoop 里所有 `getElementsByClassName(...)[0].xxx`
 * 的裸解引用与按钮 `[0].click()`。
 *
 * 现场：页面切房 / 面板重绘时这些节点会短暂不存在，旧的写法直接抛 TypeError：
 *  ① insertBefore 抛 → 该模块面板不插入，还会沿着 initPkg 链条把后面的模块一起带走；
 *  ② 抽屉标题 `[0].style` 抛 → 点一下标题就报错，抽屉打不开；
 *  ③ .ChatSend-button[0].click() 抛 → 发送小助手/关键词回复整轮发送中断。
 * 目标口径：节点不在 = 该功能这一轮不启用 + 一条 ExGuard 告警（不是异常）。
 *
 * 复现修复前的红灯（HEAD 快照即可）：
 *   DOMGUARD_SRC_DIR=/tmp/douyuex-head node tests/test_dom_guards.js
 */
const SRC_DIR = process.env.DOMGUARD_SRC_DIR || path.join(__dirname, "..");
function readSrc(rel) {
    const full = path.join(SRC_DIR, rel);
    const text = fs.readFileSync(full, "utf8");
    assert.ok(text.length > 0, "源码读取为空: " + full);
    return text;
}

const EXGUARD_SRC = readSrc("src/require/ExGuard/ExGuard.js");
const LIVETOOL_SRC = readSrc("src/packages/LiveTool/LiveTool.js");
const LOOP_SRC = readSrc("src/packages/BarrageLoop/BarrageLoop.js");
const COMMON_SRC = readSrc("src/common.js");

// 真实 getStrMiddle（getType 的底座），从 common.js 里切函数体，不做镜像实现
const G_START = COMMON_SRC.indexOf("function getStrMiddle(str, before, after) {");
assert.ok(G_START !== -1, "未能从 src/common.js 定位 getStrMiddle");
const G_END = COMMON_SRC.indexOf("\n}", G_START);
const GET_STR_MIDDLE_SRC = COMMON_SRC.slice(G_START, G_END + 2);

const MODULES = {
    Enter: { file: "src/packages/LiveTool/Enter/Enter.js", tag: "自动欢迎", title: "enter__title", panel: "enter__panel", insertDom: "LiveTool_Enter_insertDom", insertFunc: "LiveTool_Enter_insertFunc" },
    Gift: { file: "src/packages/LiveTool/Gift/Gift.js", tag: "自动谢礼物", title: "gift__title", panel: "gift__panel", insertDom: "LiveTool_Gift_insertDom", insertFunc: "LiveTool_Gift_insertFunc" },
    Mute: { file: "src/packages/LiveTool/Mute/Mute.js", tag: "关键词禁言", title: "mute__title", panel: "mute__panel", insertDom: "LiveTool_Mute_insertDom", insertFunc: "LiveTool_Mute_insertFunc" },
    Reply: { file: "src/packages/LiveTool/Reply/Reply.js", tag: "关键词回复", title: "reply__title", panel: "reply__panel", insertDom: "LiveTool_Reply_insertDom", insertFunc: "LiveTool_Reply_insertFunc" },
    Vote: { file: "src/packages/LiveTool/Vote/Vote.js", tag: "弹幕投票", title: "vote__title", panel: "vote__panel", insertDom: "LiveTool_Vote_insertDom", insertFunc: "LiveTool_Vote_insertFunc" },
    Treasure: { file: "src/packages/LiveTool/Treasure/Treasure.js", tag: "自动抢宝箱", title: "", panel: "", insertDom: "LiveTool_Treasure_insertModal", insertFunc: "" },
    BarrageSpeed: { file: "src/packages/LiveTool/BarrageSpeed/BarrageSpeed.js", tag: "弹幕时速", title: "", panel: "", insertDom: "LiveTool_BarrageSpeed_Dom", insertFunc: "" }
};

/** 造一个只装了 ExGuard + 指定源码的沙箱；console.warn 的文本全部收集起来当断言依据 */
function makeSandbox(sources, html, exposeExpr) {
    // jsdom 不会把事件监听器里抛的异常冒出来，而是丢进 virtualConsole 的 jsdomError。
    // 抽屉标题是 addEventListener 绑的，必须把这路异常也收进来，否则红灯会被吞成假绿。
    const listenerErrors = [];
    const virtualConsole = new VirtualConsole();
    virtualConsole.on("jsdomError", function (err) { listenerErrors.push(err); });
    const dom = new JSDOM(html, { url: "https://www.douyu.com/9999", virtualConsole });
    const win = dom.window;
    const warns = [];
    const errors = [];
    const plain = function () {};
    const quietConsole = {
        log: plain,
        warn: function () { warns.push(Array.prototype.join.call(arguments, " ")); },
        error: function () { errors.push(Array.prototype.join.call(arguments, " ")); }
    };

    const factory = new Function(
        "window", "document", "localStorage", "console",
        "setTimeout", "clearTimeout", "setInterval", "clearInterval",
        "rid", "my_uid", "getStrMiddle", "sendBarrage", "showMessage", "showMessageWindow",
        "GM_setClipboard", "GM_xmlhttpRequest", "getRandom", "dateFormat",
        "showExRightPanel", "PostbirdAlertBox", "addMuteUser", "deleteMuteUser", "getTreasureDelay", "getCookieValue",
        EXGUARD_SRC + "\n" + GET_STR_MIDDLE_SRC + "\n" + sources.join("\n") + "\nreturn (" + exposeExpr + ");"
    );

    const noop = function () {};
    const api = factory(
        win, win.document, win.localStorage, quietConsole,
        win.setTimeout, win.clearTimeout, win.setInterval, win.clearInterval,
        "9999", "99999999", null,
        noop, noop, noop,
        noop, noop, function (min, max) { return max; }, function () { return "t"; },
        noop, { prompt: noop }, function () { return Promise.resolve({}); }, function () { return Promise.resolve({}); },
        function () { return 0; }, function () { return ""; }
    );

    // getStrMiddle 由拼进来的真实源码提供（上面同名形参只是占位）
    return { dom, win, api, warns, errors, listenerErrors };
}

/* ================= ① insertDom：容器缺失时不得抛错，必须留痕 ================= */

function testInsertGuards() {
    console.log("=== ① 插入点判空：.livetool / .Barrage-main / .Chat 缺失时只告警不抛 ===");
    const cases = [
        ["Enter", '<!DOCTYPE html><html><body><div class="nothing"></div></body></html>'],
        ["Gift", '<!DOCTYPE html><html><body><div class="nothing"></div></body></html>'],
        ["Mute", '<!DOCTYPE html><html><body><div class="nothing"></div></body></html>'],
        ["Reply", '<!DOCTYPE html><html><body><div class="nothing"></div></body></html>'],
        ["Vote", '<!DOCTYPE html><html><body><div class="nothing"></div></body></html>'],
        ["Treasure", '<!DOCTYPE html><html><body><div class="nothing"></div></body></html>'],
        ["BarrageSpeed", '<!DOCTYPE html><html><body><div class="nothing"></div></body></html>']
    ];

    for (let i = 0; i < cases.length; i++) {
        const name = cases[i][0];
        const mod = MODULES[name];
        const src = readSrc(mod.file);
        const env = makeSandbox([LIVETOOL_SRC, src], cases[i][1],
            "({ insert: " + mod.insertDom + ", warnCount: ExGuard_warnCount })");

        assert.doesNotThrow(function () {
            env.api.insert();
        }, name + " 的插入点在容器缺失时抛错了（旧的 [0].insertBefore 裸解引用）");

        assert.ok(
            env.api.warnCount(mod.tag) > 0,
            name + " 容器缺失必须留下 ExGuard 告警（tag=" + mod.tag + "），实际 " + JSON.stringify(env.warns)
        );
        assert.ok(
            env.warns.some(function (w) { return w.indexOf(mod.tag) !== -1; }),
            "告警文本里必须带模块名便于定位: " + JSON.stringify(env.warns)
        );
        env.dom.window.close();
    }
    console.log("✓ ① 通过: 7 个插入点全部「节点不在 = 只告警」");
}

/* ================= ② 抽屉标题：兄弟面板缺失时点一下不得抛错 ================= */

function testDrawerTitleGuards() {
    console.log("=== ② 抽屉标题展开：只存在自己的面板时，点标题必须能正常展开 ===");
    const names = ["Enter", "Gift", "Mute", "Reply", "Vote"];

    for (let i = 0; i < names.length; i++) {
        const name = names[i];
        const mod = MODULES[name];
        const env = makeSandbox(
            [LIVETOOL_SRC, readSrc(mod.file)],
            '<!DOCTYPE html><html><body><div class="livetool"></div></body></html>',
            "({ insertDom: " + mod.insertDom + ", insertFunc: " + mod.insertFunc + " })"
        );

        env.api.insertDom();
        env.api.insertFunc();

        const title = env.win.document.getElementById(mod.title);
        assert.ok(title, name + " 的标题节点必须已插入（前置条件）");

        // 修复前：这里读到 mute__panel / enter__panel … 的 [0].style 直接 TypeError
        assert.doesNotThrow(function () {
            title.click();
        }, name + " 标题展开时抛错了（兄弟面板缺失导致的 [0].style 裸解引用）");

        // jsdom 把监听器里的异常收进 jsdomError：必须断言为空，否则红灯会被吞成假绿
        const listenerErrors = env.listenerErrors.map(function (e) { return String((e && e.detail && e.detail.message) || (e && e.message) || e); });
        assert.deepStrictEqual(listenerErrors, [], name + " 点击标题时监听器内抛错：" + listenerErrors.join(" | "));

        const panel = env.win.document.getElementsByClassName(mod.panel)[0];
        assert.strictEqual(panel.style.display, "block", name + " 点击标题后自己的面板必须展开");

        // 再点一次必须能收起（回归保护：别把开关改成只能开）
        title.click();
        assert.strictEqual(panel.style.display, "none", name + " 再次点击必须收起面板");

        env.dom.window.close();
    }
    console.log("✓ ② 通过: 五个抽屉在「只剩自己」的场景下都能开合");
}

/* ================= ③ 共享 helper 的语义：只收别人，不动自己 ================= */

function testHideDrawerPanelsExcept() {
    console.log("=== ③ LiveTool_hideDrawerPanelsExcept：只收其它抽屉，不碰自己 ===");
    const env = makeSandbox(
        [LIVETOOL_SRC, readSrc(MODULES.Enter.file), readSrc(MODULES.Mute.file)],
        '<!DOCTYPE html><html><body><div class="livetool"></div></body></html>',
        "({ insertEnter: LiveTool_Enter_insertDom, insertMute: LiveTool_Mute_insertDom, hideExcept: LiveTool_hideDrawerPanelsExcept })"
    );
    env.api.insertEnter();
    env.api.insertMute();

    const doc = env.win.document;
    const enterPanel = doc.getElementsByClassName("enter__panel")[0];
    const mutePanel = doc.getElementsByClassName("mute__panel")[0];
    enterPanel.style.display = "block";
    mutePanel.style.display = "block";

    assert.doesNotThrow(function () {
        env.api.hideExcept("mute__panel");
    }, "收起其它抽屉时不得抛错");
    assert.strictEqual(enterPanel.style.display, "none", "非当前抽屉必须被收起");
    assert.strictEqual(mutePanel.style.display, "block", "当前抽屉不得被自己收起");

    console.log("✓ ③ 通过: helper 只收别人");
    env.dom.window.close();
}

/* ================= ④ BarrageLoop：按钮/发送节点缺失时只告警 ================= */

function testBarrageLoopGuards() {
    console.log("=== ④ 弹幕小助手：.ChatSend-* / 切色按钮 / 图标缺失时的裸解引用 ===");

    // ① 什么节点都没有：图标插入 + 事件绑定都必须安全
    let env = makeSandbox([LOOP_SRC], '<!DOCTYPE html><html><body></body></html>',
        "({ insertIcon: BarrageLoop_insertIcon, initFunc: initPkg_BarrageLoop_Func, send: sendBarrage, selectColor: selectBarrageColor, setMatch: function (v) { isMatch = v; }, warnCount: ExGuard_warnCount })");

    assert.doesNotThrow(function () {
        env.api.insertIcon();
    }, "缺少 .ex-panel__wrap 时插入图标抛错");
    assert.ok(env.api.warnCount("弹幕小助手") > 0, "图标插入失败必须留 ExGuard 告警");

    assert.doesNotThrow(function () {
        env.api.initFunc();
    }, "缺少 .bloop-icon 时事件绑定抛错");

    assert.strictEqual(env.api.send("测试"), false, "聊天输入框缺失时 sendBarrage 必须返回 false");
    assert.ok(env.api.warnCount("弹幕发送") > 0, "发送失败必须留 ExGuard 告警");

    env.api.setMatch(false);
    assert.doesNotThrow(function () {
        env.api.selectColor(0);
    }, "缺少 .FansBarrageSwitcher 时改色抛错");
    env.api.setMatch(true);
    assert.doesNotThrow(function () {
        env.api.selectColor(0);
    }, "缺少 .MatchSystemFansBarrageSwitcher 时改色抛错");
    env.dom.window.close();

    // ② 节点都在：行为必须和以前一样（回归保护）
    env = makeSandbox([LOOP_SRC], `<!DOCTYPE html><html><body>
        <div class="ChatSend-txt"></div>
        <div class="ChatSend-button"></div>
        <div class="FansBarrageSwitcher"></div>
        <div class="FansBarrageColor-item"></div>
    </body></html>`, "({ send: sendBarrage, selectColor: selectBarrageColor, setMatch: function (v) { isMatch = v; }, clicks: (function () { let n = 0; return { inc: function () { n++; }, get: function () { return n; } }; })() })");

    let buttonClicks = 0;
    env.win.document.getElementsByClassName("ChatSend-button")[0].addEventListener("click", function () { buttonClicks++; });
    assert.strictEqual(env.api.send("你好"), true, "节点齐备时 sendBarrage 必须返回 true");
    assert.strictEqual(env.win.document.getElementsByClassName("ChatSend-txt")[0].innerText, "你好", "输入框必须写入待发弹幕");
    assert.strictEqual(buttonClicks, 1, "必须真的点一次发送按钮");
    assert.doesNotThrow(function () {
        env.api.setMatch(false);
        env.api.selectColor(0);
    }, "节点齐备时改色不得抛错");
    env.dom.window.close();

    console.log("✓ ④ 通过: 缺失只告警、齐备照旧发送");
}

/* ================= ⑤ 源码级护栏：不允许再出现 [0]. 裸解引用 ================= */

function testSourceGuard() {
    console.log("=== ⑤ 源码级护栏：LiveTool / BarrageLoop / AccountList / RestoreYuba / VideoTools 不得再有 [0]. 裸解引用 ===");
    const files = [
        "src/packages/LiveTool/LiveTool.js",
        "src/packages/LiveTool/Enter/Enter.js",
        "src/packages/LiveTool/Gift/Gift.js",
        "src/packages/LiveTool/Mute/Mute.js",
        "src/packages/LiveTool/Reply/Reply.js",
        "src/packages/LiveTool/Vote/Vote.js",
        "src/packages/LiveTool/Treasure/Treasure.js",
        "src/packages/LiveTool/BarrageSpeed/BarrageSpeed.js",
        "src/packages/BarrageLoop/BarrageLoop.js",
        "src/packages/AccountList/AccountList.js",
        "src/packages/RestoreYuba/RestoreYuba.js",
        "src/packages/VideoTools/VideoTools.js"
    ];
    // 接收者不一定是 document：item.getElementsByClassName(...)[0].addEventListener 同样是裸解引用
    const naked = /[A-Za-z_$][\w$]*\.getElementsByClassName\([^)]*\)\s*\[\s*0\s*\]\s*\.|document\.querySelector(All)?\([^)]*\)\s*\[\s*0\s*\]\s*\./;
    const offenders = [];

    files.forEach(function (rel) {
        const lines = readSrc(rel).split(/\r?\n/);
        lines.forEach(function (text, idx) {
            const trimmed = text.trim();
            if (!trimmed || trimmed.indexOf("//") === 0 || trimmed.indexOf("*") === 0 || trimmed.indexOf("/*") === 0) return;
            // 去掉行尾注释再判，避免注释里的示例被误判
            const code = text.replace(/\/\/.*$/, "");
            if (naked.test(code)) offenders.push(rel + ":" + (idx + 1) + " -> " + trimmed);
        });
    });

    assert.deepStrictEqual(offenders, [], "仍有 [0]. 裸解引用：\n" + offenders.join("\n"));

    // 护栏本体必须在：ExGuard_warn 是唯一留痕入口
    const guardUses = files.filter(function (rel) { return readSrc(rel).indexOf("ExGuard_warn(") !== -1; });
    assert.ok(guardUses.length >= 7, "判空失败必须有 ExGuard_warn 留痕，实际只有 " + guardUses.length + " 个文件");

    console.log("✓ ⑤ 通过: " + files.length + " 个文件零裸解引用，判空处均有 ExGuard 留痕");
}

/* ============ ⑥ 跨包三处：[0]. 裸解引用（账号删除按钮 / 鱼吧群名 / 版本水印） ============ */

/**
 * 通用沙箱：window / document / localStorage / console 自动注入，
 * 其它全局按 extraNames 顺序给值（要比 makeSandbox 更灵活，跨包测试用）。
 */
function makeFreeSandbox(extraNames, extraValues, sources, html, exposeExpr) {
    const listenerErrors = [];
    const virtualConsole = new VirtualConsole();
    virtualConsole.on("jsdomError", function (err) { listenerErrors.push(err); });
    const dom = new JSDOM(html, { url: "https://www.douyu.com/9999", virtualConsole });
    const win = dom.window;
    const warns = [];
    const quietConsole = {
        log: function () {},
        warn: function () { warns.push(Array.prototype.join.call(arguments, " ")); },
        error: function () {}
    };
    const paramNames = ["window", "document", "localStorage", "console"].concat(extraNames);
    assert.strictEqual(paramNames.length, 4 + extraValues.length, "沙箱入参名字与取值数量不一致");
    const factory = new Function(paramNames.join(","), EXGUARD_SRC + "\n" + sources.join("\n") + "\nreturn (" + exposeExpr + ");");
    const api = factory.apply(null, [win, win.document, win.localStorage, quietConsole].concat(extraValues));
    return { dom, win, api, warns, listenerErrors };
}

async function testCrossPkgGuards() {
    console.log("=== ⑥ 跨包三处：账号删除按钮 / 鱼吧群名群简介 / 版本水印 ===");

    // ---- ① 账号管理：条目在、删除按钮不在时只告警；按钮在时照旧干活 ----
    {
        // 只注入本文件之外才有的全局：deleteAccount / setPassportCmd / switchAccount 都是 AccountList 自己定义的，
        // 传进来也会被函数声明盖掉，断言要看它们真实副作用（showMessage 文案 + iframe 写入）。
        const messages = [];
        const env = makeFreeSandbox(
            ["showMessage", "GM_getValue", "GM_setValue"],
            [
                function (msg) { messages.push(String(msg)); },
                function () { return "{}"; },
                function () {}
            ],
            [readSrc("src/packages/AccountList/AccountList.js")],
            // #ex-accountList-iframe 是这个模块既有的容器（setPassportCmd 往里写 iframe），缺了会在 click 里抛，与本次判空无关
            '<!DOCTYPE html><html><body><div id="ex-accountList-content"></div><div id="ex-accountList-iframe"></div></body></html>',
            "({ render: renderAccountList, stubHtml: function (h) { getAccountListHtml = function () { return h; }; } })"
        );

        // 渲染结构变了：条目还在，删除按钮没了
        env.api.stubHtml('<div class="ex-accountList-item" uid="1"></div><div id="ex-accountList-item-add"></div>');
        assert.doesNotThrow(function () {
            env.api.render({});
        }, "账号条目缺删除按钮时整张列表渲染抛错（AccountList.js:118 的 [0].addEventListener）");
        assert.ok(
            env.warns.some(function (w) { return w.indexOf("账号管理") !== -1; }),
            "缺删除按钮必须留 ExGuard 告警: " + JSON.stringify(env.warns)
        );

        // 正常结构：删除按钮必须照旧触发删除流程（回归保护）
        env.api.stubHtml('<div class="ex-accountList-item" uid="1"><div class="ex-accountList-item__btn">删除</div></div><div id="ex-accountList-item-add"></div>');
        env.api.render({});
        env.win.document.getElementsByClassName("ex-accountList-item__btn")[0].click();
        assert.ok(
            messages.some(function (m) { return m.indexOf("正在删除") !== -1; }),
            "删除按钮必须照旧触发删除流程，实际 " + JSON.stringify(messages)
        );
        assert.ok(
            !messages.some(function (m) { return m.indexOf("正在切换账号") !== -1; }),
            "删除按钮的 e.stopPropagation() 必须生效，不能连带触发切号：" + JSON.stringify(messages)
        );
        assert.deepStrictEqual(
            env.listenerErrors.map(function (e) { return String((e && e.detail && e.detail.message) || e); }),
            [],
            "点击删除按钮时监听器内抛错"
        );
        env.dom.window.close();
    }

    // ---- ② 鱼吧恢复：三个节点都不在时只告警，document.title 仍然落地 ----
    {
        const fetchStub = function () {
            return Promise.resolve({
                json: function () {
                    return Promise.resolve({ data: { generalOP: [{ avatar: "a.png", nick_name: "新昵称" }] } });
                }
            });
        };
        const DomHookStub = function (sel, deep, cb) { return { cancel: function () {} }; };
        const env = makeFreeSandbox(
            ["fetch", "DomHook", "unsafeWindow", "responseHook"],
            [fetchStub, DomHookStub, null, function () {}],
            [readSrc("src/packages/RestoreYuba/RestoreYuba.js")],
            '<!DOCTYPE html><html><body></body></html>',
            "({ change: RestoreYuba_changeDom })"
        );

        await assert.doesNotReject(env.api.change("1", "2"), "鱼吧节点缺失时恢复流程抛错了（[0].innerText / querySelector().src 裸解引用）");
        assert.ok(
            env.warns.some(function (w) { return w.indexOf("鱼吧恢复") !== -1; }),
            "节点缺失必须留 ExGuard 告警: " + JSON.stringify(env.warns)
        );
        assert.strictEqual(env.win.document.title, "新昵称的鱼吧", "节点缺失时 document.title 仍必须落地（这条不依赖 DOM）");
        env.dom.window.close();

        // 节点齐备：三处都必须写进去（回归保护）
        const env2 = makeFreeSandbox(
            ["fetch", "DomHook", "unsafeWindow", "responseHook"],
            [fetchStub, DomHookStub, null, function () {}],
            [readSrc("src/packages/RestoreYuba/RestoreYuba.js")],
            '<!DOCTYPE html><html><body>' +
                '<div class="groupavatar__9mD1S"><div class="image__GNnZC"></div></div>' +
                '<div class="groupname__BUzOM"></div>' +
                '<div class="groupdesc__b8-53"></div>' +
            '</body></html>',
            "({ change: RestoreYuba_changeDom })"
        );
        await assert.doesNotReject(env2.api.change("1", "2"), "节点齐备时恢复流程不得抛错");
        const doc2 = env2.win.document;
        assert.ok(
            String(doc2.querySelector(".groupavatar__9mD1S .image__GNnZC").src).indexOf("a.png") !== -1,
            "群头像必须被替换"
        );
        assert.strictEqual(doc2.getElementsByClassName("groupname__BUzOM")[0].innerText, "新昵称", "群名必须被替换");
        assert.strictEqual(doc2.getElementsByClassName("groupdesc__b8-53")[0].innerText, "新昵称的鱼吧", "群简介必须被替换");
        env2.dom.window.close();
    }

    // ---- ③ 视频工具：版本水印节点缺失只告警，模块/事件初始化必须继续 ----
    {
        const calls = [];
        const timers = [];
        const env = makeFreeSandbox(
            ["getValidDom", "curVersion", "setInterval", "clearInterval", "fetch", "unsafeWindow",
                "DomHook", "ExTest_calls", "ExTest_timers"],
            [
                function () { return {}; }, "2026.09.29.01",
                function (fn) { timers.push(fn); return timers.length; }, function () {},
                function () { return Promise.resolve({ json: function () { return Promise.resolve({}); } }); }, null,
                function () { return { cancel: function () {} }; }, calls, timers
            ],
            [readSrc("src/packages/VideoTools/VideoTools.js")],
            '<!DOCTYPE html><html><body><div class="right-e7ea5d"></div></body></html>',
            "({ start: initPkg_VideoTools, stubInit: function () { initPkg_VideoTools_Module = function () { ExTest_calls.push('module'); }; initPkg_VideoTools_Func = function () { ExTest_calls.push('func'); }; }, calls: ExTest_calls, timers: ExTest_timers })"
        );

        env.api.stubInit();
        assert.doesNotThrow(function () {
            env.api.start();
        }, "启动 VideoTools 轮询抛错");
        assert.strictEqual(env.api.timers.length, 1, "应当挂上一个轮询定时器");

        // 手动跑一次轮询回调：controlbar 命中、版本水印节点不存在
        assert.doesNotThrow(function () {
            env.api.timers[0]();
        }, "版本水印节点缺失时轮询回调抛错（VideoTools.js:10 的 [0].innerHTML）");
        assert.ok(
            env.warns.some(function (w) { return w.indexOf("视频工具") !== -1; }),
            "水印缺失必须留 ExGuard 告警: " + JSON.stringify(env.warns)
        );
        assert.deepStrictEqual(env.api.calls, ["module", "func"], "水印缺失不得打断模块/事件初始化，实际 " + JSON.stringify(env.api.calls));
        env.dom.window.close();
    }

    console.log("✓ ⑥ 通过: 三处跨包裸解引用都改成「节点不在 = 只告警 / 该功能不启用」");
}

// 只在复现红灯时用：DOMGUARD_ONLY=抽屉标题 之类，可单独跑一组场景
const ONLY = process.env.DOMGUARD_ONLY || "";
const SCENARIOS = [
    ["插入点", testInsertGuards],
    ["抽屉标题", testDrawerTitleGuards],
    ["helper", testHideDrawerPanelsExcept],
    ["弹幕小助手", testBarrageLoopGuards],
    ["源码护栏", testSourceGuard],
    ["跨包三处", testCrossPkgGuards]
];

(async function main() {
    let ran = 0;
    for (let i = 0; i < SCENARIOS.length; i++) {
        if (ONLY && SCENARIOS[i][0].indexOf(ONLY) === -1) continue;
        await SCENARIOS[i][1]();
        ran++;
    }
    assert.ok(ran > 0, "DOMGUARD_ONLY 没有匹配到任何场景: " + ONLY);
    console.log("=== DOM 红线批（LiveTool / BarrageLoop / AccountList / RestoreYuba / VideoTools）回归测试" + (ONLY ? "（仅 " + ONLY + "）" : "") + " 100% 通过 ===");
})().catch(function (e) {
    console.error("测试失败:", e && e.stack ? e.stack : e);
    process.exit(1);
});
