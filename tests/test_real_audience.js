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
 * 2026-10-27：右上角统计条（.real-audience）整条撤下 —— 数据站停服后它只剩一个贵宾数，
 * 用户判定无意义。本测试因此只钉两件事：
 *   ① room_id 运行时解析（它决定了 h5room / fsjk 这些接口拿哪个号，与统计条无关，照旧保留）；
 *   ② 统计条真的不再出现，而头像框那三个入口（回看/投稿/鱼吧）与赛事聊天室入口的隐藏没有跟着丢。
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
    const avatarDom = opts.avatar === false ? "" : `
            <div class="VideoEntry-tabItem"><a href="${url}">视频</a></div>
            <div class="Title-anchorPicBack"></div>
            <div class="MatchSystemChatRoomEntry">赛事聊天室</div>`;

    const dom = new JSDOM(
        `<!DOCTYPE html><html><head>${canonical}</head><body>
            <div class="layout-Player-videoEntity"><video></video></div>
            ${announce}
            ${rankAll}
            ${avatarDom}
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
    const styles = [];
    const opened = [];
    const polls = [];
    let pollIndex = 0;

    const factory = new Function(
        "window", "document", "location", "unsafeWindow",
        "setTimeout", "clearTimeout", "setInterval", "clearInterval",
        "fetch", "GM_xmlhttpRequest", "StyleHook_set", "getType", "showMessage", "GM_openInTab",
        "ExGuard_pollFor", "console",
        COMMON_SRC + "\n" + REAL_AUDIENCE_SRC + `
        return {
            getRid: function () { return rid; },
            parseRealRid: exParseRealRid,
            refreshRid: exRefreshRid,
            pathShortId: exPathShortId,
            isConfident: function () { return exRidConfident; },
            init: initPkg_RealAudience
        };
        `
    );

    const api = factory(
        win, win.document, win.location, win,
        win.setTimeout, win.clearTimeout, win.setInterval, win.clearInterval,
        () => Promise.resolve({ json: async () => ({ error: 0, data: {} }) }),
        () => {},
        (name, css) => styles.push(String(css || "")),
        () => "unknown",
        () => {},
        (target) => opened.push(target),
        (findFn, onFound, cfg) => {
            polls.push({ findFn: findFn, onFound: onFound, cfg: cfg || {} });
            return { cancel: () => {}, done: false, tries: pollIndex++ };
        },
        quietConsole
    );

    return { dom, win, api, warnings, styles, opened, polls };
}

function wait(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
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
        console.log("✓ 场景 1 通过: rid 15000 → " + api.getRid() + "（短号已被真实号替换）");
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

function testStatsBarRemoved() {
    console.log("=== 统计条撤下（2026-10-27：只剩贵宾数的横条整体取消） ===");

    // === 场景 5: 初始化不得再插入任何统计条节点 ===
    {
        console.log("--> 场景 5: initPkg_RealAudience 后不得出现 .real-audience / 贵宾数节点...");
        const { dom, win, api } = loadRealAudience({ url: "https://www.douyu.com/74751" });
        api.init();
        assert.strictEqual(
            win.document.querySelectorAll(".real-audience").length,
            0,
            "右上角统计条已整体取消，不得再插入 .real-audience"
        );
        ["real-audience__noble", "real-audience__time", "real-audience__watchtime"].forEach((id) => {
            assert.strictEqual(win.document.getElementById(id), null, "统计条节点 #" + id + " 不得再存在");
        });
        console.log("✓ 场景 5 通过: 初始化后没有任何统计条节点");
        dom.window.close();
    }

    // === 场景 6: 排行榜不再被顶开 34px（横条腾出的空间要还回去） ===
    {
        console.log("--> 场景 6: 样式钩子只藏 .VideoEntry，不再改 .layout-Player-rank 的 top...");
        const { dom, api, styles } = loadRealAudience({ url: "https://www.douyu.com/74751" });
        api.init();
        const css = styles.join("\n");
        assert.ok(css.indexOf(".VideoEntry{display:none") !== -1, "视频投稿入口仍必须隐藏，实际样式: " + JSON.stringify(css));
        assert.strictEqual(
            css.indexOf("layout-Player-rank"),
            -1,
            "统计条撤下后不得再把排行榜往下顶 34px，实际样式: " + JSON.stringify(css)
        );
        console.log("✓ 场景 6 通过: 排行榜回到页面原生位置");
        dom.window.close();
    }

    // === 场景 7: 头像框三个入口（回看 / 投稿 / 鱼吧）不能跟着统计条一起消失 ===
    {
        console.log("--> 场景 7: 回看 / 投稿 / 鱼吧 三个入口照旧插入并可点击...");
        const { dom, win, api, opened } = loadRealAudience({ url: "https://www.douyu.com/74751" });
        api.init();
        ["Ex_VideoReview", "Ex_VideoSubmit", "Ex_EnterYuba"].forEach((id) => {
            assert.ok(win.document.getElementById(id), "#" + id + " 必须仍然被插入（它跟统计条无关）");
        });
        win.document.getElementById("Ex_VideoSubmit").dispatchEvent(new win.Event("click", { bubbles: true }));
        assert.deepStrictEqual(
            opened,
            ["https://www.douyu.com/74751?type=video"],
            "点击投稿必须打开投稿页，实际 " + JSON.stringify(opened)
        );
        console.log("✓ 场景 7 通过: 三个入口与跳转都还在");
        dom.window.close();
    }

    // === 场景 8: 赛事聊天室入口照旧被藏掉（以前挂在统计条那条路径上） ===
    {
        console.log("--> 场景 8: .MatchSystemChatRoomEntry 仍然必须被隐藏...");
        const { dom, win, api } = loadRealAudience({ url: "https://www.douyu.com/74751" });
        api.init();
        const entry = win.document.querySelector(".MatchSystemChatRoomEntry");
        assert.ok(entry, "前置条件：页面里有赛事聊天室入口");
        assert.strictEqual(entry.style.display, "none", "赛事聊天室入口必须仍然被隐藏（它跟数据源无关）");
        console.log("✓ 场景 8 通过: 推广入口没有跟着统计条一起放回来");
        dom.window.close();
    }

    // === 场景 9: 入口晚渲染时用有上限轮询补藏，且不无限重试 ===
    {
        console.log("--> 场景 9: 入口晚渲染 → 有上限轮询补藏（不刷屏）...");
        const { dom, win, api, polls } = loadRealAudience({ url: "https://www.douyu.com/74751", avatar: false });
        // 先没有入口，再补一个进去
        api.init();
        assert.strictEqual(polls.length, 1, "入口不存在时必须挂一次有上限轮询，实际 " + polls.length);
        assert.strictEqual(polls[0].findFn, ".MatchSystemChatRoomEntry", "轮询目标必须就是这个入口");
        assert.strictEqual(polls[0].cfg.maxTries, 20, "轮询必须有上限（20 次），不无限重试");
        const late = win.document.createElement("div");
        late.className = "MatchSystemChatRoomEntry";
        win.document.body.appendChild(late);
        const found = typeof polls[0].findFn === "function"
            ? polls[0].findFn()
            : win.document.querySelector(polls[0].findFn);
        polls[0].onFound(found);
        assert.strictEqual(late.style.display, "none", "轮询命中后必须把入口藏掉");
        console.log("✓ 场景 9 通过: 晚渲染入口由 20×500ms 的有上限轮询补藏");
        dom.window.close();
    }

    // === 场景 10: 页面什么都没有时初始化不得抛异常 ===
    {
        console.log("--> 场景 10: 容器与头像框全缺失 → initPkg_RealAudience 不得抛错...");
        const { dom, win, api } = loadRealAudience({
            url: "https://www.douyu.com/74751",
            announce: false,
            rankAll: false,
            avatar: false
        });
        assert.doesNotThrow(() => api.init(), "节点缺失时初始化必须安全返回");
        assert.strictEqual(win.document.querySelectorAll(".real-audience").length, 0, "缺节点时也不得插统计条");
        console.log("✓ 场景 10 通过: 缺节点不抛错、不留残留");
        dom.window.close();
    }

    console.log("=== 统计条撤下 6/6 场景全部通过 ===");
}

(async function main() {
    await testRealRid();
    testStatsBarRemoved();
    console.log("=== RealAudience 回归测试 100% 通过 ===");
})().catch((e) => {
    console.error("测试失败:", e && e.stack ? e.stack : e);
    process.exit(1);
});
