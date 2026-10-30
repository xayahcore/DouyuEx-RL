const fs = require("fs");
const path = require("path");
const assert = require("assert");
let JSDOM, VirtualConsole;
try {
    ({ JSDOM, VirtualConsole } = require("jsdom"));
} catch (e) {
    console.error("[测试] 缺少依赖 jsdom，请先执行：npm install");
    throw e;
}

const ROOT = path.join(__dirname, "..");
const read = (rel) => fs.readFileSync(path.join(ROOT, rel), "utf8");
const EXPANDTOOL_SRC = read("src/packages/ExpandTool/ExpandTool.js");
const MONITOR_SRC = read("src/packages/Monitor/Monitor.js");

// 与 test_dead_source 同一套思路：只禁"代码里还在用"，注释保留来龙去脉
function stripComments(src) {
    return String(src).replace(/\/\*[\s\S]*?\*\//g, " ").replace(/^\s*\/\/.*$/gm, " ");
}

/**
 * 用户反馈 3 的回归：
 * 胶囊条（二级菜单）上的「在线弹幕助手」图标已按用户决定撤下且**不恢复**
 * （Monitor 的 MONITOR_ENTRY_ENABLED = false），跳转能力搬进「扩展功能」面板最后一张卡片。
 *
 * 本用例守四件事：
 *   ① 面板里真的有这张卡片与按钮，文案说清"第三方站点"；
 *   ② 点按钮 → openPage("https://www.douyuex.com/<rid>")，且点击不外冒；
 *   ③ 页面里不许再冒出 .ex-monitor 图标（入口不恢复）；
 *   ④ 缺 openPage / rid 为空 / 缺提示函数时，点击不得抛错（面板交互不能被它带断）。
 */

// 这 9 个兄弟模块在其它文件里（ExpandTool_Treasure.js 等）。
// 单测只加载本文件，必须把它们当参数注入，否则 modules 数组里的裸引用会 ReferenceError。
const SIBLING_MODULES = [
    "initPkg_ExpandTool_Treasure", "initPkg_ExpandTool_RedPacket_Room", "initPkg_ExpandTool_AutoFish",
    "initPkg_ExpandTool_ClearBag", "initPkg_ExpandTool_SendGift", "initPkg_ExpandTool_TabSwitch",
    "initPkg_ExpandTool_P2P", "initPkg_ExpandTool_FullScreen", "initPkg_ExpandTool_AutoBarrageColor",
    "initPkg_ExpandTool_Shield"
];

const PAGE_HTML = `<!DOCTYPE html><html><body>
    <div class="layout-Player-chat"></div>
</body></html>`;

function loadExpandTool(opts) {
    opts = opts || {};
    // jsdom 默认把监听器里抛出的异常交给虚拟控制台：抓起来才能证明"点击真的没抛错"
    const vc = new VirtualConsole();
    const jsdomErrors = [];
    vc.on("jsdomError", (e) => jsdomErrors.push(e));
    const dom = new JSDOM(PAGE_HTML, { url: "https://www.douyu.com/9999", virtualConsole: vc });
    const win = dom.window;

    const opened = [];
    const messages = [];
    const warns = [];
    const rightPanels = [];
    const dbg = { log: () => {}, info: () => {}, warn: () => {}, error: () => {} };

    const stubShowMessage = opts.noHelpers ? undefined : function (msg, type) {
        messages.push([String(msg), String(type)]);
    };
    const stubWarn = opts.noHelpers ? undefined : function (tag, msg) {
        warns.push([String(tag), String(msg)]);
    };
    const stubOpenPage = opts.noOpenPage ? undefined : function (url) {
        opened.push(url);
    };
    const stubRightPanel = function (name) { rightPanels.push(String(name)); };
    const stubModules = SIBLING_MODULES.map(function (name) {
        return function () {
            if (opts.throwOn === name) throw new Error(name + " boom");
        };
    });

    const factory = new Function(
        "document", "window", "localStorage", "console",
        "showMessage", "ExGuard_warn", "openPage", "rid", "showExRightPanel",
        SIBLING_MODULES.join(", "),
        EXPANDTOOL_SRC + `
        return {
            dom: initPkg_ExpandTool_Dom,
            func: initPkg_ExpandTool_Func,
            mod: initPkg_ExpandTool_Module,
            link: initPkg_ExpandTool_MonitorLink,
            roomId: ExpandTool_monitorRoomId
        };`
    );

    const api = factory(
        win.document, win, win.localStorage, dbg,
        stubShowMessage, stubWarn, stubOpenPage,
        ("rid" in opts) ? opts.rid : 9999,
        stubRightPanel,
        ...stubModules
    );

    return { dom, win, api, opened, messages, warns, rightPanels, jsdomErrors };
}

function clickEl(win, el) {
    el.dispatchEvent(new win.Event("click", { bubbles: true }));
}

/* ------------------------------------------------------------------ */
/* 场景 1: 卡片/文案就位 + 点击跳转 + 不外冒 + 幂等                     */
/* ------------------------------------------------------------------ */
function testCardAndJump() {
    const env = loadExpandTool({ rid: 9999 });
    env.api.dom();
    const doc = env.win.document;
    const panel = doc.querySelector(".extool");
    assert.ok(panel, "扩展功能面板必须插出来（.extool）");

    const btn = doc.getElementById("extool__monitor_open");
    assert.ok(btn, "面板里必须具备「在线弹幕助手」按钮 #extool__monitor_open");
    assert.strictEqual(btn.textContent.trim(), "打开", "按钮文案必须是「打开」，实际 " + btn.textContent);
    assert.ok(btn.classList.contains("ex-picker-btn"), "按钮必须复用现成小胶囊样式 ex-picker-btn");

    // 卡片必须排在最后，且与其它卡片同构（.fans-panel__card + .fans-panel__card-header + .sign-options-list）
    const cards = panel.querySelectorAll(".fans-panel__card");
    assert.ok(cards.length >= 2, "面板至少要有两张卡片");
    const lastCard = cards[cards.length - 1];
    assert.strictEqual(lastCard.id, "extool__monitor_card", "在线工具卡必须是最后一张卡片");
    assert.ok(lastCard.contains(btn), "按钮必须挂在最后一张卡片里");
    assert.ok(lastCard.querySelector(".fans-panel__card-header"), "卡片必须有 header（与其它卡片同构）");
    assert.ok(lastCard.querySelector(".fans-panel__card-title"), "卡片必须有标题元素");
    assert.ok(lastCard.querySelector(".sign-option-item"), "卡片内容必须用 .sign-option-item，风格与其它卡片一致");

    const headText = lastCard.querySelector(".fans-panel__card-title").textContent;
    assert.ok(headText.indexOf("在线工具") !== -1, "卡片标题应是「在线工具」，实际 " + headText);
    const cardText = lastCard.textContent.replace(/\s+/g, "");
    assert.ok(cardText.indexOf("在线弹幕助手") !== -1, "卡片里必须有标题「在线弹幕助手」");
    assert.ok(cardText.indexOf("单独网页") !== -1, "说明必须讲清「在单独网页查看」");
    assert.ok(cardText.indexOf("第三方") !== -1, "说明必须点明第三方数据站");
    assert.ok(cardText.indexOf("douyuex.com") !== -1, "说明必须写明站点 douyuex.com");

    // 入口不恢复：胶囊条那个图标不得再出现在页面里
    assert.strictEqual(doc.getElementsByClassName("ex-monitor").length, 0,
        "不得插入 .ex-monitor 图标（胶囊条入口已撤下且不恢复）");

    // 绑定 + 跳转 + 冒泡
    env.api.mod();
    let bubbled = 0;
    panel.addEventListener("click", function () { bubbled++; });
    clickEl(env.win, btn);
    assert.deepStrictEqual(env.opened, ["https://www.douyuex.com/9999"],
        "点击必须跳转到 https://www.douyuex.com/9999，实际 " + JSON.stringify(env.opened));
    assert.strictEqual(bubbled, 0, "点击必须 stopPropagation（不得冒泡到面板，避免顺带触发外层节点）");

    // 幂等：模块被重复初始化不得绑出第二个监听（否则一次点击开两个标签页）
    env.api.mod();
    clickEl(env.win, btn);
    assert.deepStrictEqual(env.opened,
        ["https://www.douyuex.com/9999", "https://www.douyuex.com/9999"],
        "重复初始化后一次点击仍只应开一个标签页，实际 " + JSON.stringify(env.opened));

    assert.strictEqual(env.jsdomErrors.length, 0,
        "点击过程不得有未捕获异常：" + (env.jsdomErrors[0] && env.jsdomErrors[0].message));
    env.dom.window.close();
    console.log("✓ 场景 1 通过: 面板最后一张卡「在线工具/在线弹幕助手」，点击 openPage 到 douyuex.com/9999，无冒泡、无重复绑定");
}

/* ------------------------------------------------------------------ */
/* 场景 2: 面板重复初始化只插一份，图标缺失也不抛                        */
/* ------------------------------------------------------------------ */
function testInsertIsIdempotent() {
    const env = loadExpandTool({});
    env.api.dom();
    env.api.dom();
    const doc = env.win.document;
    assert.strictEqual(doc.querySelectorAll(".extool").length, 1, "重复初始化不得插出第二个面板");
    assert.strictEqual(doc.querySelectorAll("#extool__monitor_open").length, 1,
        "重复初始化不得插出第二个按钮（id 重复会让点击绑到错节点）");
    // 页面没有 .ex-panel__wrap 时插图标必须安全跳过（本用例的页面就没有）
    assert.doesNotThrow(function () { env.api.func(); }, "Dock 缺失时「交互」初始化不得抛错");
    assert.strictEqual(env.jsdomErrors.length, 0, "初始化过程不得有未捕获异常");
    env.dom.window.close();
    console.log("✓ 场景 2 通过: 面板只插一份，Dock 缺失时交互初始化安全跳过");
}

/* ------------------------------------------------------------------ */
/* 场景 3: 缺 openPage / rid 为空 / 缺提示函数 —— 点击都不得抛错         */
/* ------------------------------------------------------------------ */
function testDegradedEnvironments() {
    // ① rid 为空：给提示、不跳转、不抛错
    const emptyRid = loadExpandTool({ rid: "" });
    emptyRid.api.dom();
    emptyRid.api.mod();
    const btn1 = emptyRid.win.document.getElementById("extool__monitor_open");
    assert.doesNotThrow(function () { emptyRid.api.link(); }, "rid 为空时模块初始化不得抛错");
    clickEl(emptyRid.win, btn1);
    assert.deepStrictEqual(emptyRid.opened, [], "rid 为空时不得拼出半截地址去跳转");
    assert.ok(emptyRid.messages.some((m) => m[0].indexOf("房间号") !== -1 && m[1] === "warning"),
        "rid 为空必须给出 showMessage 提示，实际 " + JSON.stringify(emptyRid.messages));
    assert.strictEqual(emptyRid.jsdomErrors.length, 0, "rid 为空时点击不得抛错");
    emptyRid.dom.window.close();

    // ② openPage 不存在：给提示、不抛错
    const noOpen = loadExpandTool({ rid: 9999, noOpenPage: true });
    noOpen.api.dom();
    noOpen.api.mod();
    const btn2 = noOpen.win.document.getElementById("extool__monitor_open");
    clickEl(noOpen.win, btn2);
    assert.ok(noOpen.messages.some((m) => m[0].indexOf("不支持") !== -1),
        "openPage 缺失必须给出可见提示，实际 " + JSON.stringify(noOpen.messages));
    assert.strictEqual(noOpen.jsdomErrors.length, 0, "openPage 缺失时点击不得抛错");
    noOpen.dom.window.close();

    // ③ 连 showMessage / ExGuard_warn / openPage / rid 全都没有：静默降级，仍然不许抛错
    const bare = loadExpandTool({ noHelpers: true, noOpenPage: true, rid: undefined });
    bare.api.dom();
    bare.api.mod();
    const btn3 = bare.win.document.getElementById("extool__monitor_open");
    assert.ok(btn3, "缺提示函数时卡片本身仍必须插出来");
    assert.doesNotThrow(function () { bare.api.link(); }, "全依赖缺失时模块初始化不得抛错");
    assert.doesNotThrow(function () { clickEl(bare.win, btn3); }, "全依赖缺失时点击不得抛错");
    assert.strictEqual(bare.jsdomErrors.length, 0,
        "全依赖缺失时不得有未捕获异常：" + (bare.jsdomErrors[0] && bare.jsdomErrors[0].message));
    bare.dom.window.close();

    // ④ 房间号脏值：当"没拿到"处理，不拼错地址（模块内部出口的单元断言）
    const dirty = loadExpandTool({ rid: "99/99" });
    assert.strictEqual(dirty.api.roomId(), "", "带路径分隔符的脏房间号必须视为无效");
    assert.strictEqual(loadExpandTool({ rid: " 9999 " }).api.roomId(), "9999", "房间号必须 trim 后使用");
    dirty.dom.window.close();

    console.log("✓ 场景 3 通过: rid 为空 / openPage 缺失 / 提示函数全缺 / 脏房间号 四种降级都不抛错");
}

/* ------------------------------------------------------------------ */
/* 场景 4: 与兄弟模块同口径 —— 别的模块炸了不影响本入口                 */
/* ------------------------------------------------------------------ */
function testSiblingIsolation() {
    const env = loadExpandTool({ rid: 9999, throwOn: "initPkg_ExpandTool_Treasure" });
    env.api.dom();
    assert.doesNotThrow(function () { env.api.mod(); }, "单个兄弟模块抛错不得冲出 initPkg_ExpandTool_Module");
    const btn = env.win.document.getElementById("extool__monitor_open");
    clickEl(env.win, btn);
    assert.deepStrictEqual(env.opened, ["https://www.douyuex.com/9999"],
        "兄弟模块失败后本入口仍必须可用，实际 " + JSON.stringify(env.opened));
    assert.ok(env.warns.some((w) => w[1].indexOf("自动宝箱") !== -1),
        "兄弟模块失败必须照旧报出模块名，实际 " + JSON.stringify(env.warns));
    env.dom.window.close();
    console.log("✓ 场景 4 通过: 兄弟模块抛错时本入口照常绑定（逐项隔离同口径）");
}

/* ------------------------------------------------------------------ */
/* 场景 5: 源码级锁 —— 入口不再回胶囊条、Monitor 决策不被翻案           */
/* ------------------------------------------------------------------ */
function testSourceLocks() {
    // ① 模块必须在 modules 列表里注册（否则面板有按钮但点了没反应）
    const start = EXPANDTOOL_SRC.indexOf("function initPkg_ExpandTool_Module() {");
    assert.ok(start !== -1, "ExpandTool.js 结构变化（找不到 initPkg_ExpandTool_Module），测试需同步");
    const end = EXPANDTOOL_SRC.indexOf("function initPkg_ExpandTool_Dom() {", start);
    assert.ok(end !== -1, "ExpandTool.js 结构变化（找不到 initPkg_ExpandTool_Dom），测试需同步");
    const modSrc = EXPANDTOOL_SRC.slice(start, end);
    assert.ok(modSrc.indexOf("initPkg_ExpandTool_MonitorLink") !== -1,
        "「在线弹幕助手」必须注册进 modules 列表（与其它模块同口径逐项兜底）");
    assert.ok(modSrc.indexOf("ExpandTool_tryInit(modules[i][0]") !== -1,
        "新增模块必须仍走 ExpandTool_tryInit 逐个兜底");

    // ② 本包不得再插胶囊条图标：入口撤下且不恢复
    //    只看代码、不看注释 —— 注释里要留着"为什么撤下"的来龙去脉（与 test_dead_source 同一口径）
    assert.strictEqual(stripComments(EXPANDTOOL_SRC).indexOf("ex-monitor"), -1,
        "ExpandTool.js 的代码里不得出现 ex-monitor：胶囊条入口已撤下且不恢复，能力只在面板里");

    // ③ Monitor 侧的定案不许被翻案
    assert.ok(MONITOR_SRC.indexOf("const MONITOR_ENTRY_ENABLED = false;") !== -1,
        "Monitor 的入口开关必须保持 false（用户决定不恢复胶囊条图标）");
    assert.ok(MONITOR_SRC.indexOf("ExpandTool") !== -1,
        "Monitor.js 的注释必须交代跳转能力已搬到 ExpandTool 面板（避免以后有人又加回去）");

    console.log("✓ 场景 5 通过: 模块已注册、本包无 .ex-monitor、Monitor 开关保持 false 且有搬迁说明");
}

// 五个场景全部同步执行：出错直接退出码 1，交给 npm test 串联时能立刻暴露
try {
    testCardAndJump();
    testInsertIsIdempotent();
    testDegradedEnvironments();
    testSiblingIsolation();
    testSourceLocks();
    console.log("=== 「在线弹幕助手」搬进扩展功能面板 5 组场景全部通过 ===");
} catch (e) {
    console.error("测试失败:", e && e.stack ? e.stack : e);
    process.exit(1);
}
