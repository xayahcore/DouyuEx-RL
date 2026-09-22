const fs = require("fs");
const path = require("path");
const assert = require("assert");
let JSDOM;
try {
    JSDOM = require("jsdom").JSDOM;
} catch (e) {
    JSDOM = require("D:/harness/_cdp/node_modules/jsdom").JSDOM;
}

const SRC_PATH = path.join(__dirname, "../src/core/cdn.js");
const SRC = fs.readFileSync(SRC_PATH, "utf8");

/**
 * 在受控环境里执行真实的核心层 cdn.js。
 * 手法：先用间谍替换 XHR 的 open/send 与 responseText 描述符，
 * 再执行 cdn.js —— 它会把这些间谍当作“原始实现”包起来，
 * 于是我们既能观察改写后的请求体，也能注入伪造的取流响应。
 */
function loadCore(opts = {}) {
    const dom = new JSDOM(`<!DOCTYPE html><html><head></head><body></body></html>`, {
        url: "https://www.douyu.com/9999",
        runScripts: "dangerously",
    });
    const win = dom.window;

    if (opts.savedCdn !== undefined) {
        win.localStorage.setItem("ExSave_CDN", JSON.stringify({ cdn: opts.savedCdn, name: "线路X" }));
    }
    if (opts.savedList) {
        win.localStorage.setItem("ExSave_CDNList", JSON.stringify(opts.savedList));
    }

    const sent = [];
    const opened = [];

    const proto = win.XMLHttpRequest.prototype;
    proto.open = function (method, url) { opened.push(url); this._spyUrl = url; };
    proto.send = function (body) { sent.push(body); };

    // 伪造 responseText，用于驱动「线路清单采集」
    Object.defineProperty(proto, "responseText", {
        get: function () { return this.__fakeText || ""; },
        configurable: true,
    });

    // fetch 分支的间谍（JSDOM 默认无 fetch，需自带）
    const fetched = [];
    win.fetch = function (url, init) {
        fetched.push({ url: url, body: init && init.body });
        return Promise.resolve({
            clone: () => ({ text: () => Promise.resolve(win.__fakeFetchText || "") }),
        });
    };

    // 执行真实核心层源码：其 IIFE 会通过 <script> 注入进页面主上下文
    const s = win.document.createElement("script");
    s.textContent = SRC;
    win.document.head.appendChild(s);

    return { win, sent, opened, fetched, dom };
}

function xhrSend(win, url, body) {
    const x = new win.XMLHttpRequest();
    x.open("POST", url);
    x.send(body);
}

const wait = (ms) => new Promise((r) => setTimeout(r, ms));

async function run() {
    console.log("=== 正在运行自选直播线路 CDN 核心层单元测试（真实源码 + XHR 间谍） ===");
    const PLAY = "https://www.douyu.com/lapi/live/getH5PlayV1/9999";
    const BODY = "enc_data=abc&tt=1&did=x&auth=y&cdn=&rate=0&hevc=0&fa=0&ive=0";

    // ---------- Case 1: 未选线路 → 请求体必须完全透明放行 ----------
    {
        const { win, sent } = loadCore({});
        xhrSend(win, PLAY, BODY);
        assert.strictEqual(sent.length, 1, "必须放行请求");
        assert.strictEqual(sent[0], BODY, "未选择线路时请求体不得有任何改动");
        console.log("✓ Case 1 通过: 未选线路时请求体透明放行");
    }

    // ---------- Case 2: 选定线路 → 请求体中的空 cdn 必须被替换 ----------
    {
        const { win, sent } = loadCore({ savedCdn: "hs-h5" });
        xhrSend(win, PLAY, BODY);
        assert.ok(sent[0].includes("cdn=hs-h5"), `必须替换为空值 cdn，实际: ${sent[0]}`);
        assert.ok(!sent[0].includes("cdn=&"), "不得残留空 cdn 参数");
        assert.ok(sent[0].includes("rate=0") && sent[0].includes("enc_data=abc"), "其它参数必须原样保留");
        console.log("✓ Case 2 通过: 选定线路后 cdn 参数被正确替换");
    }

    // ---------- Case 3: 选定线路 + 请求体已有非空 cdn → 覆盖为所选 ----------
    {
        const { win, sent } = loadCore({ savedCdn: "hw-h5" });
        xhrSend(win, PLAY, "auth=y&cdn=old-cdn&rate=0");
        assert.ok(sent[0].includes("cdn=hw-h5"), "必须覆盖已有 cdn 值");
        assert.ok(!sent[0].includes("old-cdn"), "旧线路值不得残留");
        console.log("✓ Case 3 通过: 已有 cdn 值被正确覆盖");
    }

    // ---------- Case 4: 选定线路 + 请求体完全不含 cdn → 追加 ----------
    {
        const { win, sent } = loadCore({ savedCdn: "hs-h5" });
        xhrSend(win, PLAY, "auth=y&rate=0");
        assert.ok(sent[0].includes("cdn=hs-h5"), "缺少 cdn 参数时必须追加");
        console.log("✓ Case 4 通过: 缺少 cdn 参数时正确追加");
    }

    // ---------- Case 5: 非取流请求一律不得被改动 ----------
    {
        const { win, sent } = loadCore({ savedCdn: "hs-h5" });
        const other = "auth=y&cdn=&rate=0";
        xhrSend(win, "https://www.douyu.com/lapi/live/betard/9999", other);
        xhrSend(win, "https://www.douyu.com/some/other/api", other);
        sent.forEach((b, i) => assert.strictEqual(b, other, `第 ${i + 1} 条非取流请求不得被改动`));
        console.log("✓ Case 5 通过: /betard/ 与普通接口请求未被误改");
    }

    // ---------- Case 6: 线路清单采集 —— 从取流响应中抓 cdnsWithName 并写入本地 ----------
    {
        const { win } = loadCore({});
        const payload = JSON.stringify({
            error: 0,
            data: {
                cdnsWithName: [
                    { name: "线路7", cdn: "hw-h5", isH265: true },
                    { name: "线路13", cdn: "hs-h5", isH265: true },
                ],
            },
        });
        const x = new win.XMLHttpRequest();
        x.open("POST", PLAY);
        x.__fakeText = payload;
        x.send("auth=y");
        void x.responseText; // 触发 getter
        const saved = JSON.parse(win.localStorage.getItem("ExSave_CDNList") || "null");
        assert.ok(saved, "必须采集到线路清单");
        assert.strictEqual(saved.rid, "9999", "清单必须带房间号归属");
        assert.strictEqual(saved.list.length, 2, "必须采集到 2 条线路");
        assert.strictEqual(saved.list[0].name, "线路7");
        assert.strictEqual(saved.list[0].cdn, "hw-h5");
        console.log("✓ Case 6 通过: 从播放器自身响应中采集线路清单（含房间归属）");
    }

    // ---------- Case 7: 非 JSON / 空清单响应不得污染已存清单 ----------
    {
        const { win } = loadCore({ savedList: { rid: "9999", list: [{ name: "旧", cdn: "old" }] } });
        const x = new win.XMLHttpRequest();
        x.open("POST", PLAY);
        x.__fakeText = "<!DOCTYPE html><html>Just a moment...</html>";
        x.send("auth=y");
        void x.responseText;
        const saved = JSON.parse(win.localStorage.getItem("ExSave_CDNList"));
        assert.strictEqual(saved.list[0].cdn, "old", "HTML 等垃圾响应不得覆盖已采集清单");
        console.log("✓ Case 7 通过: HTML 垃圾响应不会污染已采集的线路清单");
    }

    // ---------- Case 8: fetch 通路同样改写并对齐采集 ----------
    {
        const { win, fetched } = loadCore({ savedCdn: "hs-h5" });
        win.__fakeFetchText = JSON.stringify({ error: 0, data: { cdnsWithName: [{ name: "线路9", cdn: "n9" }] } });
        await win.fetch(PLAY, { method: "POST", body: BODY });
        await wait(30);
        assert.strictEqual(fetched.length, 1, "fetch 必须被放行");
        assert.ok(fetched[0].body.includes("cdn=hs-h5"), `fetch 请求体也必须被改写，实际: ${fetched[0].body}`);
        const saved = JSON.parse(win.localStorage.getItem("ExSave_CDNList") || "null");
        assert.ok(saved && saved.list[0].cdn === "n9", "fetch 通路也必须采集线路清单");
        console.log("✓ Case 8 通过: fetch 通路同样完成请求改写与清单采集");
    }

    console.log("=== 全部 8 项自选线路核心层测试 100% 通过 ===");
}

run().catch((err) => {
    console.error("Test failed:", err);
    process.exit(1);
});
