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

// 与 test_enter_display 同一套思路：只禁"代码里还在用"，注释保留来龙去脉
function stripComments(src) {
    return String(src).replace(/\/\*[\s\S]*?\*\//g, " ").replace(/^\s*\/\/.*$/gm, " ");
}

const MAIN_SRC = read("src/main.js");
const REAL_AUDIENCE_SRC = read("src/packages/RealAudience/RealAudience.js");
const REAL_AUDIENCE_CSS = read("src/packages/RealAudience/RealAudience.css");
const MONTH_COST_SRC = read("src/packages/MonthCost/MonthCost.js");
const LIVETOOL_SRC = read("src/packages/LiveTool/LiveTool.js");
const DANMAKU_HISTORY_SRC = read("src/packages/DanmakuHistory/DanmakuHistory.js");
const MONITOR_SRC = read("src/packages/Monitor/Monitor.js");

/**
 * Issue #4 的收尾守卫：第三方数据站「在看直播（doseeing.com）」自 2026-09-30 全线停服，
 * 它对所有路径只返回同一张「停止服务公告」页（HTTP 200、非 JSON）。
 * 本用例把"死源依赖必须清零"钉在源码层，防止以后有人顺手把它加回来。
 */
function testNoDoseeingDependency() {
    // ① 权限声明：@connect 已摘（否则油猴仍然允许往死站发请求）
    assert.ok(
        MAIN_SRC.indexOf("@connect      doseeing.com") === -1,
        "main.js 头部不得再声明 @connect doseeing.com（数据源已停服）"
    );
    // 仍然需要的域名不能被误删
    ["douyu.com", "douyuex.com", "shadiao.app"].forEach((host) => {
        assert.ok(
            MAIN_SRC.indexOf("@connect      " + host) !== -1,
            "main.js 头部必须保留 @connect " + host + "（本次只摘 doseeing）"
        );
    });

    const raCode = stripComments(REAL_AUDIENCE_SRC);
    assert.ok(
        raCode.indexOf("doseeing.com") === -1,
        "RealAudience 不得再出现 doseeing 的任何地址"
    );
    assert.ok(
        raCode.indexOf("GM_xmlhttpRequest(") === -1,
        "RealAudience 不得再发 GM_xmlhttpRequest（那是死源唯一的出口）"
    );
    assert.ok(
        raCode.indexOf("getRealViewer") === -1,
        "getRealViewer 已整体删除，不得残留调用/定义"
    );
    ["real-audience__total", "real-audience__barrage", "real-audience__money_yc"].forEach((id) => {
        assert.ok(
            raCode.indexOf(id) === -1,
            "死源三项节点 " + id + " 不得再出现在 RealAudience 里（留着只会永远显示 ****/0）"
        );
    });

    // ③ 统计条已整体撤下（2026-10-27）：数据站停服后它只剩贵宾数，用户判定无意义。
    //    类名与节点 id 都不得回潮；同时确认两项数据是「搬家」而不是「删掉」。
    ["real-audience", "贵宾数"].forEach(function (needle) {
        assert.strictEqual(
            raCode.indexOf(needle),
            -1,
            "RealAudience 不得再出现「" + needle + "」（统计条已整条撤下）"
        );
    });
    assert.strictEqual(
        REAL_AUDIENCE_CSS.indexOf(".real-audience"),
        -1,
        "RealAudience.css 不得再定义统计条样式（横条已撤）"
    );
    assert.strictEqual(
        raCode.indexOf("layout-Player-rank"),
        -1,
        "统计条撤下后不得再把排行榜往下顶（.layout-Player-rank 的 top 覆盖必须一起撤）"
    );

    const ltCode = stripComments(LIVETOOL_SRC);
    assert.strictEqual(
        ltCode.indexOf("initPkg_RealAudience_Handle"),
        -1,
        "LiveTool 不得再注册「贵宾数」处理器（统计条撤下后它没有出口）"
    );

    const mcCode = stripComments(MONTH_COST_SRC);
    ["monthcost__ticker", "swf_api/h5room/", "fsjk/getCardTaskInfo"].forEach(function (needle) {
        assert.ok(
            mcCode.indexOf(needle) !== -1,
            "观看时间 / 开播时间必须搬到 MonthCost 左侧滚动条（缺少 " + needle + "）"
        );
    });

    // ② 历史弹幕：不得再引导用户去死站登录
    const dhCode = stripComments(DANMAKU_HISTORY_SRC);
    assert.ok(
        dhCode.indexOf("doseeing.com/login") === -1,
        "DanmakuHistory 不得再打开 doseeing 登录页（死链）"
    );
    assert.ok(
        dhCode.indexOf("需先登录") === -1,
        "DanmakuHistory 不得再把停服误报成「需先登录」"
    );

    console.log("✓ 场景 1 通过: 死源依赖已清零（@connect / 请求 / 节点 / 登录引导 / 统计条撤下 / 数据搬家）");
}

function loadMonitor(opts = {}) {
    const dom = new JSDOM(
        `<!DOCTYPE html><html><body>
            <div class="ex-panel"><div class="ex-panel__wrap"></div></div>
        </body></html>`,
        { url: "https://www.douyu.com/9999" }
    );
    const win = dom.window;
    if (opts.noDock) {
        const wrap = win.document.querySelector(".ex-panel__wrap");
        if (wrap) wrap.remove();
    }
    const opened = [];
    const infos = [];
    let src = MONITOR_SRC;
    if (opts.enable) {
        const from = "const MONITOR_ENTRY_ENABLED = false;";
        if (src.indexOf(from) === -1) {
            throw new Error("Monitor 入口开关常量已改名，测试需同步更新（避免静默失效）");
        }
        src = src.replace(from, "const MONITOR_ENTRY_ENABLED = true;");
    }
    const factory = new Function(
        "document", "window", "openPage", "rid", "console",
        src + `
        return { init: initPkg_Monitor, insert: Monitor_insertIcon, bind: initPkg_Monitor_Func };`
    );
    const api = factory(
        win.document, win, (url) => opened.push(url), 9999,
        { log: () => {}, warn: () => {}, error: () => {}, info: (...a) => infos.push(a.join(" ")) }
    );
    return { dom, win, api, opened, infos };
}

function testMonitorEntryConverged() {
    // 默认：胶囊条上不得再出现「在线弹幕助手」图标
    const off = loadMonitor();
    off.api.init();
    assert.strictEqual(off.win.document.getElementsByClassName("ex-monitor").length, 0,
        "默认必须撤下第三方数据站入口（图标不得插入）");
    assert.ok(off.infos.some((s) => s.indexOf("入口已撤下") !== -1),
        "撤下时必须在 console 留一条自证信息，便于用户报障时定位：" + JSON.stringify(off.infos));
    off.dom.window.close();

    // 回滚通道：开关改成 true 就应完整恢复（包体没被删掉）
    const on = loadMonitor({ enable: true });
    on.api.init();
    const icons = on.win.document.getElementsByClassName("ex-monitor");
    assert.strictEqual(icons.length, 1, "开关打开后必须恢复图标（可回滚）");
    icons[0].dispatchEvent(new on.win.Event("click", { bubbles: true }));
    assert.deepStrictEqual(on.opened, ["https://www.douyuex.com/9999"],
        "回滚后点击仍应指向原地址，实际 " + JSON.stringify(on.opened));
    on.dom.window.close();

    // Dock 未就绪时不得抛异常（旧实现是裸 [0]，一抛整包就废）
    const noDock = loadMonitor({ enable: true, noDock: true });
    assert.doesNotThrow(() => noDock.api.init(), "Dock 缺失时初始化不得抛异常");
    assert.strictEqual(noDock.api.insert(), false, "Dock 缺失时插入应安全返回 false");
    assert.doesNotThrow(() => noDock.api.bind(), "图标不存在时绑定点击不得抛异常");
    noDock.dom.window.close();

    console.log("✓ 场景 2 通过: Monitor 入口默认撤下、console 有自证、开关可回滚、缺 Dock 不抛");
}

(async function main() {
    testNoDoseeingDependency();
    testMonitorEntryConverged();
    console.log("=== 停服数据源收尾守卫 2 组场景全部通过 ===");
})().catch((e) => {
    console.error("测试失败:", e && e.stack ? e.stack : e);
    process.exit(1);
});
