const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { JSDOM } = require("jsdom");
const source = fs.readFileSync(path.join(__dirname, "../src/packages/RoomRevenue/RoomRevenue.js"), "utf8");

const START = new Date(2026, 10, 5, 12, 0, 0).getTime();
const ANCHOR = '<div class="Title-col"><span id="copy-real-live">复制直播流</span><span class="ex-title-time">观看时间 / 开播时间</span><span id="after-title">原生信息</span></div>';
const row = (amount = 99.4, extra = {}) => ({ room_id: "6979222", vip_id: "6657", anchor_name: "玩机器丶Machine", total_income: amount, ...extra });
const payload = (rows = [row()]) => ({ code: 0, data: rows, source: "memory_pool_0ms" });
const flush = async () => { for (let index = 0; index < 5; index++) await Promise.resolve(); };

function environment(options = {}) {
    const dom = new JSDOM("<!doctype html><html><body>" + (options.noAnchor ? "" : ANCHOR) + "</body></html>", { url: "https://www.douyu.com/6657" });
    const win = dom.window;
    let now = START;
    let hidden = !!options.hidden;
    let sequence = 0;
    const timers = new Map();
    const requests = [];
    const menus = new Map();
    const logs = [];
    // Browser state lives on Document.prototype; TabSwitch may shadow instance getters.
    Object.defineProperty(win.Document.prototype, "hidden", { configurable: true, get: () => hidden });
    Object.defineProperty(win.Document.prototype, "visibilityState", { configurable: true, get: () => hidden ? "hidden" : "visible" });
    if (options.disabled) win.localStorage.setItem("ExSave_RoomRevenue", JSON.stringify({ enabled: false }));
    class ClockDate extends Date {
        constructor(...args) { super(...(args.length ? args : [now])); }
        static now() { return now; }
    }
    const schedule = (fn, ms, interval) => {
        const id = ++sequence;
        timers.set(id, { fn, ms: Number(ms) || 0, due: now + (Number(ms) || 0), interval });
        return id;
    };
    const factory = new Function("window", "document", "location", "localStorage", "Date", "setTimeout", "clearTimeout", "setInterval", "clearInterval", "GM_xmlhttpRequest", "GM_registerMenuCommand", "GM_unregisterMenuCommand", "URL", "URLSearchParams", "rid", "console", "ExGuard_warn", source + `
        return { init: initPkg_RoomRevenue, refresh: RoomRevenue_refresh, setEnabled: RoomRevenue_setEnabled,
            setRid: value => { rid = String(value); } };`);
    const api = factory(win, win.document, win.location, win.localStorage, ClockDate,
        (fn, ms) => schedule(fn, ms, false), id => timers.delete(id),
        (fn, ms) => schedule(fn, ms, true), id => timers.delete(id),
        config => {
            const entry = { config, aborted: false };
            requests.push(entry);
            return { abort() { entry.aborted = true; if (config.onabort) config.onabort({}); } };
        },
        (label, callback) => { const id = ++sequence; menus.set(id, { label, callback }); return id; },
        id => menus.delete(id), URL, URLSearchParams, "6979222",
        { log: (...args) => logs.push(args), warn: (...args) => logs.push(args), error: (...args) => logs.push(args) },
        (...args) => logs.push(args));
    return {
        dom, win, api, timers, requests, menus, logs,
        node: () => win.document.querySelector(".ex-room-revenue"),
        value() { return win.document.querySelector(".ex-room-revenue__value")?.textContent || ""; },
        description() { const node = this.node(); return node ? [node.title, ...[...node.querySelectorAll("[title]")].map(element => element.title)].join("\n") : ""; },
        respond(data = payload(), index = requests.length - 1, extra = {}) {
            const entry = requests[index];
            assert.ok(entry, "request must exist before delivering a response");
            entry.config.onload({ status: 200, response: data, responseText: typeof data === "string" ? data : JSON.stringify(data), finalUrl: entry.config.url, ...extra });
        },
        fail(kind = "onerror", index = requests.length - 1) { const callback = requests[index].config[kind]; assert.equal(typeof callback, "function"); callback({}); },
        async advance(ms) {
            const target = now + ms;
            let count = 0;
            while (true) {
                const next = [...timers.entries()].filter(([, timer]) => timer.due <= target).sort((a, b) => a[1].due - b[1].due)[0];
                if (!next) break;
                assert.ok(++count < 1000, "timers must not spin without a bound");
                const [id, timer] = next;
                now = timer.due;
                if (timer.interval) timer.due = now + Math.max(1, timer.ms); else timers.delete(id);
                timer.fn();
                await flush();
            }
            now = target;
            await flush();
        },
        setTime(value) { now = value; },
        hide(value, notify = true) { hidden = value; if (notify) win.document.dispatchEvent(new win.Event("visibilitychange")); },
        navigate(pathname, realRid) { api.setRid(realRid); win.history.pushState({}, "", pathname); win.dispatchEvent(new win.PopStateEvent("popstate")); },
        close() { api.setEnabled(false); dom.window.close(); }
    };
}

function assertUnavailable(env) {
    assert.match(env.value(), /—|不可用|暂无|未收录|未找到|获取失败/);
    assert.doesNotMatch(env.value(), /(?:^|\D)0(?:\.0+)?\s*鱼翅/, "missing data must not masquerade as a genuine zero");
}

async function main() {
    {
        const env = environment();
        env.api.init();
        env.api.init();
        await flush();
        assert.equal(env.win.document.querySelectorAll(".ex-room-revenue").length, 1);
        const copy = env.win.document.getElementById("copy-real-live");
        const time = env.win.document.querySelector(".ex-title-time");
        assert.equal(copy.nextElementSibling, time, "TitleTime must stay immediately after CopyRealLive");
        assert.equal(time.nextElementSibling, env.node());
        assert.equal(env.requests.length, 1, "repeated init must share the first request");
        assert.equal(env.menus.size, 1);
        const request = env.requests[0].config;
        const url = new URL(request.url);
        assert.equal(url.origin, "https://dy.roozj.com");
        assert.equal(url.pathname, "/api/ranking/anchors");
        assert.equal(url.searchParams.get("startDate"), "2026-11-05");
        assert.equal(url.searchParams.get("endDate"), "2026-11-05");
        assert.equal(url.searchParams.get("clubName"), "all");
        assert.equal(url.searchParams.get("limit"), "50");
        assert.ok(["6657", "6979222"].includes(url.searchParams.get("search")));
        assert.equal(request.method, "GET");
        assert.equal(request.anonymous, true);
        assert.equal(request.timeout, 8000);
        assert.equal(request.responseType, "json");
        for (const forbidden of ["data", "user", "password", "cookie"]) assert.equal(request[forbidden], undefined);
        assert.ok(!Object.keys(request.headers || {}).some(key => /authorization|cookie/i.test(key)));
        env.respond();
        await flush();
        assert.match(env.value(), /今日流水\s*99\.4\s*鱼翅/, "public income is already in fish fins; do not divide by 100");
        assert.match(env.description(), /2026-11-05/);
        assert.equal(env.node().querySelector(".ex-room-revenue__source").href, "https://dy.roozj.com/");
        assert.ok(env.node().querySelector(".ex-room-revenue__refresh"));
        env.close();
        console.log("✓ enabled by default, idempotent title placement, anonymous public aggregate request and correct units");
    }
    {
        const env = environment();
        env.api.init();
        env.respond(payload([row(999, { room_id: "2222", vip_id: "66570" }), row(0)]));
        await flush();
        assert.match(env.value(), /今日流水\s*0(?:\.0+)?\s*鱼翅/);
        env.api.refresh(true);
        env.respond(payload([row("12.5", { room_id: "8000", vip_id: "6657" })]));
        await flush();
        assert.match(env.value(), /12\.5\s*鱼翅/);
        env.close();
        console.log("✓ exact room/vip matches skip fuzzy hits, genuine zero and numeric strings remain valid");
    }
    {
        const invalid = [
            payload([row(null)]), payload([row(undefined, { total_income: undefined })]),
            payload([row(-1)]), payload([row(Infinity)]), payload([row(NaN)]),
            payload([row("")]), payload([row(" ")]), payload([row(true)]), payload([row({})]),
            payload([row("<img src=x onerror=alert(1)>")]), payload([row(9, { isMasked: true })]),
            { code: 1, data: [row()] }, "<html>Service unavailable</html>",
            payload([row(999, { room_id: "2222", vip_id: "66570" })]), payload([])
        ];
        for (const data of invalid) {
            const env = environment();
            env.api.init();
            env.respond(data);
            await flush();
            assertUnavailable(env);
            assert.equal(env.node().querySelector("img"), null, "response content must never become HTML");
            env.close();
        }
        const http = environment();
        http.api.init();
        http.respond(payload(), 0, { status: 503 });
        await flush();
        assertUnavailable(http);
        http.close();
        console.log("✓ masked/null/invalid income, HTML, HTTP/API errors and missing exact rooms never display fake zero");
    }
    {
        const env = environment();
        env.api.init();
        env.api.refresh(true);
        assert.equal(env.requests.length, 1, "manual and automatic refresh share an in-flight request");
        env.respond();
        await flush();
        env.api.refresh();
        assert.equal(env.requests.length, 1, "valid TTL cache avoids redundant network requests");
        await env.advance(149999);
        assert.equal(env.requests.length, 1);
        await env.advance(1);
        assert.equal(env.requests.length, 2, "visible rooms refresh after 150 seconds");
        env.fail("ontimeout");
        await flush();
        assert.match(env.value(), /99\.4/);
        assert.match(env.value() + " " + env.description(), /上次|旧/);
        env.node().querySelector(".ex-room-revenue__refresh").click();
        await flush();
        assert.equal(env.requests.length, 3, "manual refresh can retry before the next automatic interval");
        env.respond(payload([row(101)]));
        await flush();
        assert.match(env.value(), /101\s*鱼翅/);
        assert.doesNotMatch(env.value(), /上次|旧/);
        env.close();
        console.log("✓ 150-second refresh, TTL/in-flight deduplication and stale-value failure recovery");
    }
    {
        const env = environment({ hidden: true });
        env.api.init();
        await env.advance(450000);
        assert.equal(env.requests.length, 0, "hidden tabs must not start network traffic");
        env.hide(false);
        await flush();
        assert.equal(env.requests.length, 1);
        env.respond();
        await flush();
        env.hide(true);
        await env.advance(450000);
        assert.equal(env.requests.length, 1);
        env.hide(false);
        await flush();
        assert.equal(env.requests.length, 2, "becoming visible refreshes expired data once");
        env.close();
        console.log("✓ hidden tabs pause network work and visibility resumes only expired data");
    }
    {
        const env = environment();
        env.api.init();
        env.navigate("/1234", "1234");
        env.api.refresh();
        await flush();
        assert.equal(env.requests.length, 2);
        env.respond(payload([row(777)]), 0);
        await flush();
        assert.doesNotMatch(env.value(), /777/, "late old-room data cannot enter the current room display");
        env.respond(payload([row(20, { room_id: "1234", vip_id: "1234" })]), 1);
        await flush();
        assert.match(env.value(), /20\s*鱼翅/);
        assert.ok(env.requests[0].aborted, "room switch should cancel the obsolete request when abort is supported");
        env.close();
        console.log("✓ room changes invalidate cached identity, abort obsolete work and ignore late responses");
    }
    {
        const env = environment();
        env.api.init();
        env.api.setEnabled(false);
        assert.equal(env.requests[0].aborted, true);
        assert.equal(env.timers.size, 0, "disabling clears both refresh and mounting timers");
        assert.equal(JSON.parse(env.win.localStorage.getItem("ExSave_RoomRevenue")).enabled, false);
        await env.advance(450000);
        assert.equal(env.requests.length, 1);
        env.api.setEnabled(true);
        await flush();
        assert.equal(env.requests.length, 2);
        env.respond(payload([row(777)]), 0);
        await flush();
        assert.doesNotMatch(env.value(), /777/);
        env.respond(payload([row(30)]), 1);
        await flush();
        assert.match(env.value(), /30\s*鱼翅/);
        [...env.menus.values()][0].callback();
        assert.equal(JSON.parse(env.win.localStorage.getItem("ExSave_RoomRevenue")).enabled, false, "userscript menu toggles the setting");
        assert.equal(env.timers.size, 0);
        env.close();
        const off = environment({ disabled: true });
        off.api.init();
        assert.equal(off.requests.length, 0);
        assert.equal(off.timers.size, 0);
        assert.equal(off.menus.size, 1, "disabled users can reenable the feature through the menu");
        off.close();
        console.log("✓ disabling persists, aborts requests and clears timers; reenable and menu toggles work");
    }
    {
        const late = environment({ noAnchor: true });
        late.api.init();
        late.api.init();
        assert.equal(late.requests.length, 0);
        await late.advance(1000);
        late.win.document.body.innerHTML = ANCHOR;
        await late.advance(500);
        assert.equal(late.requests.length, 1);
        assert.equal(late.win.document.querySelectorAll(".ex-room-revenue").length, 1);
        late.close();
        const absent = environment({ noAnchor: true });
        absent.api.init();
        await absent.advance(11000);
        assert.equal(absent.requests.length, 0);
        assert.equal(absent.timers.size, 0, "missing title anchor must not cause endless polling");
        absent.close();
        console.log("✓ late title anchors mount once; absent anchors stop polling within the bound");
    }
    {
        const env = environment();
        env.api.init();
        env.respond();
        await flush();
        env.setTime(new Date(2026, 10, 6, 0, 0, 1).getTime());
        env.api.refresh();
        await flush();
        assert.equal(env.requests.length, 2, "a new local day invalidates the previous daily cache");
        const url = new URL(env.requests[1].config.url);
        assert.equal(url.searchParams.get("startDate"), "2026-11-06");
        assert.equal(url.searchParams.get("endDate"), "2026-11-06");
        env.respond(payload([row(0)]));
        await flush();
        assert.match(env.value(), /0(?:\.0+)?\s*鱼翅/);
        assert.match(env.description(), /2026-11-06/);
        env.close();
        console.log("✓ local date rollover changes the request period, cache key and displayed date");
    }
    {
        const env = environment();
        env.api.init();
        env.respond(payload([row(0)]));
        await flush();
        env.api.refresh();
        assert.equal(env.requests.length, 1, "zero is a cached value, not a cache miss");
        env.navigate("/1234", "1234");
        env.respond(payload([row(2, { room_id: "1234", vip_id: "1234" })]));
        await flush();
        const beforeReturn = env.requests.length;
        env.navigate("/6657", "6979222");
        await flush();
        assert.equal(env.requests.length, beforeReturn, "returning to a room reuses its fresh daily cache");
        assert.match(env.value(), /今日流水\s*0(?:\.0+)?\s*鱼翅/);
        env.close();
        console.log("✓ a genuine zero survives same-key cache reads and returning to a previous room");
    }
    {
        for (const data of [null, { code: 0, data: {} }, { code: 0, data: [null, true, "not a row"] }, { ...payload(), isMasked: true }]) {
            const env = environment();
            env.api.init();
            assert.doesNotThrow(() => env.respond(data));
            await flush();
            assertUnavailable(env);
            env.api.refresh(true);
            assert.equal(env.requests.length, 2, "a malformed payload must release the in-flight guard");
            env.respond();
            await flush();
            assert.match(env.value(), /99\.4\s*鱼翅/);
            env.close();
        }
        const redirected = environment();
        redirected.api.init();
        redirected.respond(payload(), 0, { finalUrl: "https://dy.roozj.com/api/anchor/6657" });
        await flush();
        assertUnavailable(redirected);
        redirected.close();
        console.log("✓ malformed/masked payloads release pending state and non-public-page redirects stay unavailable");
    }
    {
        const env = environment();
        env.api.init();
        env.hide(true);
        assert.equal(env.requests[0].aborted, true);
        assert.equal(env.timers.size, 0);
        env.respond(payload([row(777)]), 0);
        await flush();
        assert.doesNotMatch(env.value(), /777/);
        env.api.refresh(true);
        assert.equal(env.requests.length, 1, "even forced refresh cannot start traffic while hidden");
        env.hide(false);
        assert.equal(env.requests.length, 2);
        env.respond();
        await flush();
        assert.match(env.value(), /99\.4\s*鱼翅/);
        env.close();
        console.log("✓ hiding an in-flight room aborts work and ignores late data until visibility resumes");
    }
    {
        const env = environment();
        env.api.init();
        env.navigate("/1234", "6979222"); // The site's global room ID has not caught up yet.
        env.respond(payload([row(3, { room_id: "4444", vip_id: "1234" })]));
        await flush();
        assert.match(env.value(), /3\s*鱼翅/, "with stale real RID, exact new-path VIP matching remains usable");
        env.navigate("/5678", "6979222"); // A second quick navigation must not revive that old RID.
        env.respond(payload([row(777)]));
        await flush();
        assertUnavailable(env);
        assert.doesNotMatch(env.value(), /777/);
        env.api.setRid("5555");
        env.api.refresh();
        env.respond(payload([row(5, { room_id: "5555", vip_id: "5678" })]));
        await flush();
        assert.match(env.value(), /5\s*鱼翅/, "accept a newly resolved real RID after it changes");
        env.close();
        console.log("✓ repeated SPA navigation cannot revive stale room IDs while exact new VIP IDs still work");
    }
    {
        const env = environment();
        // Same mechanism as the existing TabSwitch feature: page getters always say visible,
        // and the page's capture handler consumes visibilitychange at document.
        Object.defineProperty(env.win.document, "hidden", { configurable: true, value: false });
        Object.defineProperty(env.win.document, "visibilityState", { configurable: true, value: "visible" });
        env.win.document.addEventListener("visibilitychange", event => event.stopImmediatePropagation(), true);
        env.api.init();
        env.respond();
        await flush();
        env.hide(true);
        assert.equal(env.win.document.hidden, false, "precondition: the page's anti-freeze setting masks visibility");
        await env.advance(450000);
        assert.equal(env.requests.length, 1, "use real browser visibility even when the page getter lies");
        assert.equal(env.timers.size, 0, "capture visibility before document listeners can swallow it");
        env.hide(false);
        await flush();
        assert.equal(env.requests.length, 2);
        env.close();
        console.log("✓ anti-freeze instance overrides and swallowed document events do not defeat hidden-tab pausing");
    }
    {
        const env = environment();
        env.api.init();
        env.respond(payload([row(99.4, { total_fans: 2995, paid_fans: 255 })]));
        await flush();
        assert.match(env.description(), /(?:^|\n)送礼人数[:：]\s*(?:2995|2,995)/);
        assert.match(env.description(), /付费送礼人数[:：]\s*255/);
        assert.match(env.value(), /99\.4\s*鱼翅/);
        env.api.refresh(true);
        env.respond(payload([row(0, { total_fans: 0, paid_fans: 0 })]));
        await flush();
        env.api.refresh();
        assert.equal(env.requests.length, 2);
        assert.match(env.description(), /(?:^|\n)送礼人数[:：]\s*0(?:\D|$)/);
        assert.match(env.description(), /付费送礼人数[:：]\s*0(?:\D|$)/);
        env.navigate("/1234", "1234");
        env.respond(payload([row(20, { room_id: "1234", vip_id: "1234" })]));
        await flush();
        env.navigate("/6657", "6979222");
        assert.match(env.description(), /付费送礼人数[:：]\s*0(?:\D|$)/, "a cached real zero count remains visible");
        env.api.refresh(true);
        env.respond(payload([row(99.4, { total_fans: null, paid_fans: -1 })]));
        await flush();
        assert.match(env.value(), /99\.4\s*鱼翅/, "invalid optional counts cannot invalidate valid income");
        assert.doesNotMatch(env.description(), /送礼人数[:：]\s*0(?:\D|$)/, "missing or invalid optional counts must not become zero");
        assert.doesNotMatch(env.description(), /送礼人数[:：]\s*-1/);
        env.close();
        console.log("✓ optional donor counts use gift-specific labels, retain real zeros in cache and never invent missing counts");
    }
    {
        const env = environment();
        env.api.init();
        env.respond(payload([row(0.001, { total_fans: 1.5, paid_fans: "2.5" })]));
        await flush();
        assert.match(env.value(), /<0\.01\s*鱼翅/, "a positive sub-cent value must not round down to a displayed zero");
        assert.match(env.description(), /0\.001\s*鱼翅/, "the exact public number remains available in the tooltip");
        assert.doesNotMatch(env.description(), /送礼人数[:：]/, "fractional counts must not be rounded into people");
        env.api.refresh();
        assert.equal(env.requests.length, 1);
        assert.match(env.value(), /<0\.01\s*鱼翅/);
        env.close();
        console.log("✓ small positive income stays distinct from zero and fractional optional counts are rejected");
    }
    {
        const env = environment();
        env.api.init();
        env.hide(true, false); // Visibility may flip just before its event reaches listeners.
        env.respond();
        await flush();
        env.hide(false);
        await flush();
        assert.equal(env.requests.length, 2, "a callback while hidden must release busy state even before the visibility event");
        env.respond(payload([row(7)]));
        await flush();
        assert.match(env.value(), /7\s*鱼翅/);
        env.close();
        console.log("✓ response/visibility ordering cannot strand the in-flight guard");
    }
    {
        const env = environment();
        env.api.init();
        env.respond();
        await flush();
        env.navigate("/directory/all", "6979222");
        env.api.refresh(true);
        await flush();
        assert.equal(env.requests.length, 1, "a non-room path must not reuse the previous room's unresolved global ID");
        assert.doesNotMatch(env.value(), /99\.4/);
        env.navigate("/1234", "6979222");
        env.respond(payload([row(8, { room_id: "4444", vip_id: "1234" })]));
        await flush();
        assert.match(env.value(), /8\s*鱼翅/);
        env.close();
        console.log("✓ non-room navigation suppresses stale global room IDs without blocking a later exact VIP match");
    }
    {
        const env = environment();
        env.api.init();
        await env.advance(1000); // A real request does not finish at the instant it starts.
        env.respond();
        await flush();
        await env.advance(149000);
        assert.equal(env.requests.length, 2, "request latency must not make the 150-second tick skip until 300 seconds");
        env.close();
        console.log("✓ first-response latency does not double the automatic refresh period through the TTL cache");
    }
}

main().catch(error => { console.error(error); process.exitCode = 1; });
