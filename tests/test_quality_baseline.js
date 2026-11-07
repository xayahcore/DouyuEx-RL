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
const SRC = fs.readFileSync(path.join(ROOT, "src/core/quality.js"), "utf8").replace(/\r\n/g, "\n");
const tick = (ms) => new Promise((r) => setTimeout(r, ms || 0));

function ladderPayload(list, actual) {
    return { error: 0, msg: "ok", data: { rate: actual, multirates: list.map((m) => ({ rate: m.rate, name: m.name, bit: 1000 })) } };
}

function environment(options) {
    options = options || {};
    const dom = new JSDOM("<!doctype html><html><head></head><body></body></html>", {
        url: "https://www.douyu.com/6657",
        runScripts: "dangerously",
        pretendToBeVisual: true
    });
    const win = dom.window;
    const doc = win.document;
    win.Response = Response;
    win.Blob = Blob;
    win.Request = Request;

    const ladder = options.ladder || [];
    const requests = [];
    // 服务端行为：按请求里的 rate 回包；没带 rate 就回 actualDefault；forceActual 模拟「请求了也不给」
    win.fetch = async function (url, init) {
        const body = init && init.body ? String(init.body) : "";
        const asked = (body.match(/[&?]rate=([^&]*)/) || [])[1];
        requests.push({ url: String(url), body, asked });
        const actual = options.forceActual !== undefined
            ? options.forceActual
            : (asked === undefined ? (options.actualDefault === undefined ? 4 : options.actualDefault) : Number(asked));
        return new Response(JSON.stringify(ladderPayload(ladder, actual)), { status: 200, headers: { "content-type": "application/json" } });
    };

    win.localStorage.setItem("ExSave_HighestVideoQuality", JSON.stringify({ isHighestVideoQuality: true }));
    if (options.baseline) win.localStorage.setItem("ExSave_QualityBaseline", JSON.stringify(options.baseline));

    const s = doc.createElement("script");
    s.textContent = SRC;
    doc.head.appendChild(s);

    return {
        win, doc, requests,
        pref: () => {
            try { return JSON.parse(JSON.parse(win.localStorage.getItem("realRateModel2_h5p_room")).v); } catch (e) { return null; }
        },
        baseline: (room) => {
            try { const all = JSON.parse(win.localStorage.getItem("ExSave_QualityBaseline") || "{}"); return all[room || "6657"] || null; } catch (e) { return null; }
        },
        dbg: () => (win.__exQualityDebug || []).slice(0),
        close: () => dom.window.close()
    };
}

const FULL = [{ rate: 15, name: "2K超高清" }, { rate: 0, name: "原画1080P60" }, { rate: 4, name: "蓝光4M" }];
const PLAIN = [{ rate: 0, name: "原画1080P60" }, { rate: 4, name: "蓝光4M" }];

async function testBaselineHit() {
    const env = environment({ ladder: FULL, baseline: { "6657": { rate: 15, at: Date.now() } }, actualDefault: 15 });
    await tick(60);
    assert.equal(env.pref(), 15, "基线命中时偏好应写成 15");
    await env.win.fetch("https://www.douyu.com/lapi/live/getH5PlayV1/6657", { method: "POST", body: "enc_data=abc&rate=15&did=x" });
    await tick(120);
    console.log("  dbg=" + JSON.stringify(env.dbg()) + " reqs=" + JSON.stringify(env.requests.map((r) => r.asked)) + " base=" + JSON.stringify(env.baseline()));
    assert.equal(env.requests.filter((r) => r.asked === "15").length, 1, "基线对得上时不该补取第二次");
    env.close();
    console.log("✓ 基线命中：偏好直写 15，且不补取");
}

async function testNewTopReplays() {
    const env = environment({ ladder: FULL, baseline: { "6657": { rate: 0, at: Date.now() } }, actualDefault: 0 });
    await tick(60);
    await env.win.fetch("https://www.douyu.com/lapi/live/getH5PlayV1/6657", { method: "POST", body: "enc_data=abc&rate=0&did=x" });
    await tick(200);
    const rec = env.baseline();
    assert.equal(rec.rate, 15, "发现首档 15 后基线应更新为 15");
    assert.ok(env.requests.some((r) => r.asked === "15"), "应用 15 补取一次");
    env.close();
    console.log("✓ 场景 A：基线 0 → 读到首档 15 → 用 15 补取，基线写回 15");
}

async function testBaselineGoneReplays() {
    const env = environment({ ladder: PLAIN, baseline: { "6657": { rate: 15, at: Date.now() } }, actualDefault: 4 });
    await tick(60);
    await env.win.fetch("https://www.douyu.com/lapi/live/getH5PlayV1/6657", { method: "POST", body: "enc_data=abc&rate=15&did=x" });
    await tick(200);
    const rec = env.baseline();
    assert.equal(rec.rate, 0, "档位表里没有 15 时基线应回落到 0");
    assert.ok(env.requests.some((r) => r.asked === "0"), "应用 0 补取一次");
    env.close();
    console.log("✓ 场景 B：基线 15 已失效 → 用 0 补取，基线写回 0");
}

async function testTopUnchangedNoSwitch() {
    // 基线 15、档位表首档也是 15，服务端这次只回了 4（回落）→ 不属于那两个场景，不得补取
    const env = environment({ ladder: FULL, baseline: { "6657": { rate: 15, at: Date.now() } }, forceActual: 4 });
    await tick(60);
    await env.win.fetch("https://www.douyu.com/lapi/live/getH5PlayV1/6657", { method: "POST", body: "enc_data=abc&rate=15&did=x" });
    await tick(400);
    assert.equal(env.requests.length, 1, "档位表首档与基线一致时不得切流，实际发了 " + env.requests.length + " 次");
    assert.equal(env.baseline().rate, 15, "不切流时基线应保持 15");
    env.close();
    console.log("✓ 首档未变、服务端回落：不切流（只有 A / B 两个场景才切）");
}

async function testSecondRequestUsesNewBaseline() {
    // 基线 0 → 读到首档 15 → 补取并写回 15；同一窗口内的第二次取流必须按 15 走，
    // 不能还按旧的 0（否则切上 2K 后又被自己的改写打回原画）
    const env = environment({ ladder: FULL, baseline: { "6657": { rate: 0, at: Date.now() } }, actualDefault: 0 });
    await tick(60);
    await env.win.fetch("https://www.douyu.com/lapi/live/getH5PlayV1/6657", { method: "POST", body: "enc_data=abc&rate=0&did=x" });
    await tick(200);
    await env.win.fetch("https://www.douyu.com/lapi/live/getH5PlayV1/6657", { method: "POST", body: "enc_data=abc&rate=0&did=x" });
    await tick(200);
    const last = env.requests[env.requests.length - 1];
    assert.equal(last.asked, "15", "切档后同一会话内的后续请求应使用新基线 15，实际：" + last.asked);
    env.close();
    console.log("✓ 切档后内存基线同步：第二次取流按 15 下发");
}

async function testReplayBudgetFallsBack() {
    const env = environment({ ladder: FULL, baseline: { "6657": { rate: 0, at: Date.now() } }, actualDefault: 0 });
    // 让补取请求永不返回，验证预算到期后保留原响应、不挂死
    let count = 0;
    const realFetch = env.win.fetch;
    env.win.fetch = function (url, init) {
        count++;
        if (count > 1) return new Promise(() => {});
        return realFetch(url, init);
    };
    await tick(60);
    const started = Date.now();
    const resp = await env.win.fetch("https://www.douyu.com/lapi/live/getH5PlayV1/6657", { method: "POST", body: "enc_data=abc&rate=0&did=x" });
    const body = await resp.text();
    assert.ok(/multirates/.test(body), "补取超时也必须把原响应还给调用方");
    assert.ok(Date.now() - started < 4000, "补取超时应在预算内结束，实际 " + (Date.now() - started) + "ms");
    env.close();
    console.log("✓ 补取超时：保留原响应，调用方不会卡死");
}

async function testRequestRewritten() {
    const env = environment({ ladder: FULL, baseline: { "6657": { rate: 15, at: Date.now() } }, actualDefault: 15 });
    await tick(60);
    await env.win.fetch("https://www.douyu.com/lapi/live/getH5PlayV1/6657", { method: "POST", body: "enc_data=abc&rate=4&did=abc" });
    await tick(120);
    const first = env.requests[0];
    assert.ok(/rate=15(?!\d)/.test(first.body), "保护期内请求 rate 应被改写成基线 15，实际：" + first.body);
    env.close();
    console.log("✓ 保护期内把取流请求的 rate 改写成基线值");
}

(async () => {
    await testBaselineHit();
    await testNewTopReplays();
    await testBaselineGoneReplays();
    await testTopUnchangedNoSwitch();
    await testSecondRequestUsesNewBaseline();
    await testReplayBudgetFallsBack();
    await testRequestRewritten();
    console.log("=== 画质基线（QualityBaseline）测试 100% 通过 ===");
})().catch((e) => {
    console.error("[测试失败]", e && e.message ? e.message : e);
    process.exit(1);
});
