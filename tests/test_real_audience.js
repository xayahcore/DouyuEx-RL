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

const COMMON_SRC = fs.readFileSync(path.join(__dirname, "../src/common.js"), "utf8");
const REAL_AUDIENCE_SRC = fs.readFileSync(
    path.join(__dirname, "../src/packages/RealAudience/RealAudience.js"),
    "utf8"
);

/**
 * 挂载"真实源码"（非镜像实现）：common.js 的全局 rid 解析 + RealAudience 模块本体。
 * 每个用例独立 jsdom、独立函数作用域，避免模块级 let/const 互相污染。
 *
 * 关于 document-start 的复刻：jsdom 默认不执行内联 <script>（未开 runScripts），
 * 这恰好对应真实处境 —— 页面里那行房间号只作为 HTML 文本存在，能不能解析出来
 * 完全取决于 exParseRealRid；而 window.room_id 由用例在"页面脚本跑起来之后"补上。
 */
function loadRealAudience(opts) {
    opts = opts || {};
    const url = opts.url || "https://www.douyu.com/9999";
    const canonical = opts.canonical === false ? "" : `<link rel="canonical" href="${opts.canonical || url}">`;
    // 斗鱼内联脚本用的是不带引号的 roomID: 形式（"room_id" 带引号那种只在部分页面版本里出现）
    const inlineRoomId = opts.inlineRoomId ? `<script>var cfg = {roomID:${opts.inlineRoomId},rate:0};</script>` : "";
    const inlineRoom = opts.inlineRoom ? `<script>var $ROOM = {}; $ROOM.room_id = ${opts.inlineRoom};</script>` : "";
    const announce = opts.announce === false ? "" : `<div class="layout-Player-announce"></div>`;
    const rankAll = opts.rankAll === false ? "" : `<div class="layout-Player-rankAll"></div>`;

    const dom = new JSDOM(
        `<!DOCTYPE html><html><head>${canonical}</head><body>
            <div class="layout-Player-videoEntity"><video></video></div>
            ${announce}
            ${rankAll}
            <div class="Barrage-main"><ul class="Barrage-list"></ul></div>
            ${inlineRoomId}${inlineRoom}
        </body></html>`,
        { url }
    );

    const win = dom.window;
    const warnings = [];
    const quietConsole = {
        log: () => {},
        error: () => {},
        warn: (...args) => warnings.push(args.join(" "))
    };

    const factory = new Function(
        "window", "document", "location", "unsafeWindow",
        "setTimeout", "clearTimeout", "setInterval", "clearInterval",
        "fetch", "GM_xmlhttpRequest", "StyleHook_set", "getType", "showMessage", "console",
        COMMON_SRC + "\n" + REAL_AUDIENCE_SRC + `
        return {
            getRid: function () { return rid; },
            parseRealRid: exParseRealRid,
            refreshRid: exRefreshRid,
            pathShortId: exPathShortId,
            isConfident: function () { return exRidConfident; },
            initDom: initPkg_RealAudience_Dom,
            ensure: realAudienceEnsure,
            switchWatch: switchRealAndTodayWatch,
            setViewer: setRealViewer
        };
        `
    );

    const api = factory(
        win, win.document, win.location, win,
        win.setTimeout, win.clearTimeout, win.setInterval, win.clearInterval,
        () => Promise.resolve({ json: async () => ({ error: 0, data: { todayWatch: 0 } }) }),
        (req) => { if (req && typeof req.onload === "function") req.onload({ response: { data: {} } }); },
        () => {},
        () => "unknown",
        () => {},
        quietConsole
    );

    return { dom, win, api, warnings };
}

function wait(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

function statsBarEl(win) {
    return win.document.getElementById("real-audience__total");
}

function countBars(win) {
    return win.document.querySelectorAll(".real-audience").length;
}

async function testRealRid() {
    console.log("=== 真实 room_id 运行时解析（issue #1 问题二：靓号房间统计全 0） ===");

    // === 场景 1: 靓号房间——URL 只是展示短号，页面自己用的 room_id 才是真实号 ===
    {
        console.log("--> 场景 1: /15000（靓号）→ 必须解析出真实号 796449 而不是 15000...");
        const { dom, win, api } = loadRealAudience({ url: "https://www.douyu.com/15000" });
        assert.strictEqual(api.pathShortId(), "15000", "pathname 短号必须被识别为 15000");
        assert.strictEqual(api.getRid(), "15000", "document-start 首帧只能兜底到短号（这正是原 bug 的起点）");
        assert.strictEqual(api.isConfident(), false, "兜底到短号时不得标记为已确认，否则不会再纠偏");

        // 页面自己的脚本跑起来后，window.room_id 才可见
        win.room_id = "796449";
        await wait(900);
        assert.strictEqual(api.getRid(), "796449", "生命周期纠偏后 rid 必须变成真实 room_id");
        assert.strictEqual(api.isConfident(), true, "拿到页面真实号后必须标记为已确认，停止无谓重算");
        console.log(`✓ 场景 1 通过: rid ${"15000"} → ${api.getRid()}（短号已被真实号替换）`);
        dom.window.close();
    }

    // === 场景 2: 页面没有 window.room_id，只有 HTML 内联 $ROOM.room_id ===
    {
        console.log("--> 场景 2: 仅内联 $ROOM.room_id = 5526219（URL /123455）...");
        const { dom, api } = loadRealAudience({
            url: "https://www.douyu.com/123455",
            inlineRoom: "5526219"
        });
        assert.strictEqual(api.getRid(), "5526219", "必须能从 HTML 内联脚本解析出真实号并排除 URL 短号");
        assert.strictEqual(api.isConfident(), true, "内联脚本命中即为可信来源");
        console.log("✓ 场景 2 通过: 内联 $ROOM.room_id 解析正确，短号 123455 未被采用");
        dom.window.close();
    }

    // === 场景 3: 普通房间——真实 room_id 恰好等于 URL 数字，不得被改坏 ===
    {
        console.log("--> 场景 3: 普通房间 /74751（真实号等于 URL 数字）...");
        const { dom, api } = loadRealAudience({
            url: "https://www.douyu.com/74751",
            inlineRoomId: "74751"
        });
        assert.strictEqual(api.getRid(), "74751", "真实号等于短号时必须原样返回，不得被清空或改写");
        assert.strictEqual(api.isConfident(), true, "roomID: 命中即为可信来源");
        console.log("✓ 场景 3 通过: 普通房间 rid 保持 74751");
        dom.window.close();
    }

    // === 场景 4: 限流页——页面里没有任何房间号字段，只能退回短号且不得抛异常 ===
    {
        console.log("--> 场景 4: 限流页（无任何房间号字段，URL /15000）...");
        const { dom, api, warnings } = loadRealAudience({ url: "https://www.douyu.com/15000" });
        assert.strictEqual(api.getRid(), "15000", "无任何字段时回退到 URL 短号");
        assert.strictEqual(api.isConfident(), false, "无字段时不得标记为已确认");
        assert.doesNotThrow(() => api.refreshRid(), "反复重算不得抛异常");
        assert.strictEqual(warnings.length, 0, "解析过程不得产生告警: " + JSON.stringify(warnings));
        console.log("✓ 场景 4 通过: 限流页安全回退，无异常无告警");
        dom.window.close();
    }

    console.log("=== 真实 room_id 解析 4/4 场景全部通过 ===");
}

async function testStatsBarSustain() {
    console.log("=== 统计条落点与自愈（issue #1 问题一：刷新后统计条不显示） ===");

    // === 场景 5: 容器就绪时必须插到播放器区块，绝不落到 .Barrage-main ===
    {
        console.log("--> 场景 5: 播放器区块已渲染 → 统计条必须落在 .layout-Player-announce...");
        const { dom, win, api } = loadRealAudience({ url: "https://www.douyu.com/74751" });
        assert.strictEqual(api.initDom(), true, "容器存在时插入必须成功");
        const bar = statsBarEl(win);
        assert.ok(bar, "统计条节点必须存在");
        assert.ok(
            win.document.querySelector(".layout-Player-announce .real-audience"),
            "统计条必须挂在 .layout-Player-announce 内"
        );
        assert.strictEqual(
            win.document.querySelectorAll(".Barrage-main .real-audience").length,
            0,
            "统计条绝不允许落到持续重绘的 .Barrage-main 里"
        );
        console.log("✓ 场景 5 通过: 统计条落点正确，弹幕区内无残留");
        dom.window.close();
    }

    // === 场景 6: 容器尚未渲染 → 不得落弹幕区，且容器出现后必须补插 ===
    {
        console.log("--> 场景 6: 播放器区块未渲染 → 不落弹幕区，容器出现后 500ms 轮询补插...");
        const { dom, win, api } = loadRealAudience({
            url: "https://www.douyu.com/74751",
            announce: false,
            rankAll: false
        });
        assert.strictEqual(api.initDom(), false, "容器缺失时插入必须返回 false");
        assert.strictEqual(
            win.document.querySelectorAll(".Barrage-main .real-audience").length,
            0,
            "容器缺失时绝不能退而求其次塞进 .Barrage-main"
        );

        // 模拟播放器区块稍后渲染出来
        const announce = win.document.createElement("div");
        announce.className = "layout-Player-announce";
        win.document.body.insertBefore(announce, win.document.querySelector(".layout-Player-rankAll"));
        await wait(800);

        assert.ok(statsBarEl(win), "容器出现后必须由轮询把统计条补插上去");
        assert.ok(
            win.document.querySelector(".layout-Player-announce .real-audience"),
            "补插后的统计条必须落在播放器区块内"
        );
        console.log("✓ 场景 6 通过: 轮询补插成功，全程未污染弹幕区");
        dom.window.close();
    }

    // === 场景 7: 统计条被页面重绘冲掉后必须自愈，且不得留下重复节点 ===
    {
        console.log("--> 场景 7: 模拟页面重绘冲掉统计条 → 必须自愈且无重复...");
        const { dom, win, api } = loadRealAudience({ url: "https://www.douyu.com/74751" });
        api.initDom();
        assert.strictEqual(countBars(win), 1, "初始应只有一条统计条");

        // 页面重绘把节点连根拔掉（这正是 F5 后统计条消失的现场）
        win.document.querySelectorAll(".real-audience").forEach((el) => el.remove());
        assert.strictEqual(statsBarEl(win), null, "前置条件：统计条已被冲掉");

        assert.strictEqual(api.ensure(), true, "自愈必须成功");
        assert.ok(statsBarEl(win), "自愈后统计条必须重新存在");
        assert.ok(
            win.document.querySelector(".layout-Player-announce .real-audience"),
            "自愈后必须重新挂回播放器区块"
        );
        assert.strictEqual(countBars(win), 1, "自愈不得留下重复统计条");
        console.log("✓ 场景 7 通过: 统计条自愈成功且无重复");
        dom.window.close();
    }

    // === 场景 8: 节点与容器都不在时，定时器回调必须静默跳过而不是抛 TypeError ===
    {
        console.log("--> 场景 8: 节点与容器均缺失 → switchRealAndTodayWatch 不得抛异常...");
        const { dom, win, api } = loadRealAudience({ url: "https://www.douyu.com/74751" });
        api.initDom();
        win.document.querySelectorAll(".real-audience").forEach((el) => el.remove());
        win.document.querySelector(".layout-Player-announce").remove();
        win.document.querySelector(".layout-Player-rankAll").remove();
        assert.strictEqual(api.ensure(), false, "容器缺失时自愈必须安全返回 false");

        assert.doesNotThrow(() => api.switchWatch(), "节点缺失时切换回调必须安全返回");
        await assert.doesNotReject(() => api.setViewer(), "节点缺失时数据刷新必须安全返回");
        console.log("✓ 场景 8 通过: 节点缺失时两个定时器回调均静默跳过，不再每 5 秒抛一次 TypeError");
        dom.window.close();
    }

    console.log("=== 统计条落点与自愈 4/4 场景全部通过 ===");
}

(async function main() {
    await testRealRid();
    await testStatsBarSustain();
    console.log("=== 真实人数统计条回归测试 100% 通过 ===");
})().catch((e) => {
    console.error("测试失败:", e && e.stack ? e.stack : e);
    process.exit(1);
});
