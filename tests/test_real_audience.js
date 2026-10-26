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

    // 第三方数据站（doseeing）已于 2026-09-30 全线停服，RealAudience 不再向它发请求。
    // 这个桩现在只剩"计数"职责：calls 必须恒为 0，用例会断言（死源依赖是否真的摘干净）。
    const gmState = {
        calls: 0,
        fail: !!opts.gmFail,
        payload: opts.gmPayload || { error: 0, data: {} }
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
            info: function () { return real_info; },
            initDom: initPkg_RealAudience_Dom,
            ensure: realAudienceEnsure,
            switchWatch: switchRealAndTodayWatch,
            setViewer: setRealViewer,
            handleNoble: initPkg_RealAudience_Handle
        };
        `
    );

    const api = factory(
        win, win.document, win.location, win,
        win.setTimeout, win.clearTimeout, win.setInterval, win.clearInterval,
        () => Promise.resolve({ json: async () => ({ error: 0, data: { todayWatch: 0 } }) }),
        (req) => {
            if (!req) return;
            gmState.calls++;
            if (gmState.fail) {
                if (typeof req.onerror === "function") req.onerror(new Error("blocked"));
                return;
            }
            if (typeof req.onload === "function") req.onload({ response: gmState.payload });
        },
        () => {},
        // getType：按 sendBarrage 报文的真实形态取 type@=xxx，供「贵宾数」用例驱动
        (str) => {
            const m = String(str).match(/type@=([^\/]*)/);
            return m ? m[1] : "unknown";
        },
        () => {},
        quietConsole
    );

    return { dom, win, api, warnings, gmState };
}

function wait(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

function statsBarEl(win) {
    // 存活性探针改看「已播」节点：#real-audience__total 属于死源三项，
    // 2026-10-26 起连同节点一起撤掉了（数据站停服）。
    return win.document.getElementById("real-audience__time");
}

function countBars(win) {
    return win.document.querySelectorAll(".real-audience").length;
}

/**
 * 读统计条的“已写入值”。
 * 真实代码走 realAudienceSet(id, "innerText", v)，写的是 innerText 属性；
 * jsdom 不实现 innerText（不会反映到 textContent），HTML 里的 **** 占位符却在 textContent 上。
 * 所以读值必须读属性本身，两者不能混为一谈。
 */
function statValue(win, id) {
    const el = win.document.getElementById(id);
    if (!el) return null;
    return el.innerText === undefined ? null : String(el.innerText);
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

    // === 场景 9: 死源已停服 → 零请求、死块不渲染、本机项照写 ===
    {
        console.log("--> 场景 9: 数据站已停服 → 零请求、死块不渲染、已播/贵宾照写...");
        const { dom, win, api, warnings, gmState } = loadRealAudience({ url: "https://www.douyu.com/74751" });
        api.initDom();
        await api.setViewer();

        // ① 一条请求都不许发：对方站点对所有路径只返回「停止服务公告」页
        assert.strictEqual(
            gmState.calls,
            0,
            "数据源停服后不得再向 doseeing 发任何请求，实际发了 " + gmState.calls + " 次"
        );
        assert.ok(
            !warnings.some((w) => w.indexOf("真实人数") !== -1),
            "既然不再请求，就不得再产生「真实人数请求失败」噪声告警：" + JSON.stringify(warnings)
        );

        // ② 死源三项：节点必须干脆不存在，而不是留着永远显示 **** / 0
        ["real-audience__total", "real-audience__barrage", "real-audience__money_yc", "real-audience__t"].forEach((id) => {
            assert.strictEqual(
                win.document.getElementById(id),
                null,
                "死源节点 #" + id + " 不得存在（留着只会永远显示 **** 或 0，等于骗人）"
            );
        });

        // ③ 本机算得出来的项照旧有值：已播（h5room showtime）
        const timeVal = statValue(win, "real-audience__time");
        assert.ok(
            timeVal !== null && timeVal.indexOf("已播:") === 0 && timeVal.indexOf("****") === -1,
            "「已播」只用本地 showtime，必须照写，实际 " + JSON.stringify(timeVal)
        );

        // ④ 贵宾数：来自长连接 oni.vn，与死源无关，同样照写（12345 → 1.2万）
        api.handleNoble("type@=oni/rid@=74751/vn@=12345/");
        await api.setViewer();
        assert.strictEqual(
            statValue(win, "real-audience__noble"),
            "1.2万",
            "「贵宾数」来自长连接，必须照写，实际 " + JSON.stringify(statValue(win, "real-audience__noble"))
        );

        // ⑤ 整条带停服说明：用户悬停能知道为什么少了三项
        const bar = win.document.getElementsByClassName("real-audience")[0];
        assert.ok(
            String(bar.getAttribute("title")).indexOf("停止服务") !== -1,
            "统计条必须带「数据源已停止服务」的悬停说明，实际 " + JSON.stringify(bar.getAttribute("title"))
        );
        console.log("✓ 场景 9 通过: 零请求 + 死块不渲染 + 已播/贵宾照写 + 停服说明在位");
        dom.window.close();
    }

    // === 场景 10: 自愈重建出来的只是空壳，必须自动补一次数据 ===
    {
        console.log("--> 场景 10: 自愈后必须自动补数据，不能只恢复空壳等 150 秒...");
        const { dom, win, api } = loadRealAudience({ url: "https://www.douyu.com/74751" });
        api.initDom();
        await api.setViewer();
        const before = statValue(win, "real-audience__time");

        // 页面重绘把节点连根拔掉，再由**外部调用方**（switchRealAndTodayWatch 那条路）触发自愈
        win.document.querySelectorAll(".real-audience").forEach((el) => el.remove());
        assert.strictEqual(api.ensure(), true, "自愈必须成功");
        assert.strictEqual(
            win.document.getElementById("real-audience__time").textContent,
            "已播:****",
            "重建后的节点带的是 HTML 里的 **** 占位符（前提：数据必须靠补刷回来）"
        );

        await wait(80); // 让自愈排的那次补刷跑完
        const after = statValue(win, "real-audience__time");
        assert.strictEqual(
            String(after),
            String(before),
            "自愈必须自动补一次数据 —— 否则要等下一次 setRealViewer（150 秒）才有人数，实际 " + after
        );
        assert.ok(String(after).indexOf("****") === -1, "补刷后的【已播】不得仍是占位符");
        console.log("✓ 场景 10 通过: 自愈后自动补数据，不再空等 150 秒");
        dom.window.close();
    }

    console.log("=== 统计条落点与自愈 6/6 场景全部通过 ===");
}

(async function main() {
    await testRealRid();
    await testStatsBarSustain();
    console.log("=== 真实人数统计条回归测试 100% 通过 ===");
})().catch((e) => {
    console.error("测试失败:", e && e.stack ? e.stack : e);
    process.exit(1);
});
