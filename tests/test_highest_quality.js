const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const source = fs.readFileSync(path.join(__dirname, "../src/core/quality.js"), "utf8");

function environment(enabled = true, seed = {}) {
    let now = 100000;
    const storage = new Map([["ExSave_HighestVideoQuality", JSON.stringify({ isHighestVideoQuality: enabled })]]);
    Object.entries(seed).forEach(([key, value]) => storage.set(key, value));
    const calls = [];
    const replies = [];
    const timers = new Map();
    let timerSequence = 0;
    class FakeXHR {
        constructor() { this.responseType = ""; this.readyState = 0; this.listeners = {}; }
        open(method, url) { this.method = method; this.url = url; }
        send(body) { this.sentBody = body; }
        addEventListener(type, fn) { (this.listeners[type] ||= []).push(fn); }
        complete(data) {
            this.raw = JSON.stringify(data);
            this.readyState = 4;
            this.responseURL = this.url;
            for (const type of ["readystatechange", "load"]) for (const fn of this.listeners[type] || []) fn.call(this);
        }
        get responseText() { if (this.responseType === "json") throw new Error("InvalidStateError"); return this.raw || ""; }
        get response() { return this.responseType === "json" ? JSON.parse(this.raw) : this.responseText; }
    }
    const context = vm.createContext({
        console, URL, URLSearchParams, Request, Response, Headers, Blob, FormData, AbortController, AbortSignal, DOMException,
        setTimeout: (fn, delay) => { fn.delay = delay; timers.set(++timerSequence, fn); return timerSequence; },
        clearTimeout: id => timers.delete(id),
        Date: class extends Date { static now() { return now; } },
        location: { pathname: "/1001", href: "https://www.douyu.com/1001" },
        localStorage: { getItem: key => storage.get(key) ?? null, setItem: (key, value) => storage.set(key, value), removeItem: key => storage.delete(key) },
        XMLHttpRequest: FakeXHR,
        fetch: async (input, init) => {
            calls.push({ input, init });
            if (input instanceof Request) calls.at(-1).body = await input.text();
            const reply = replies.shift();
            return typeof reply === "function" ? reply() : new Response(JSON.stringify(reply || { error: 0 }), { headers: { "content-type": "application/json" } });
        }
    });
    context.window = context;
    context.document = {
        createElement: () => ({ textContent: "", remove() {} }),
        querySelectorAll: () => [],
        querySelector: () => null,
        head: { appendChild: element => vm.runInContext(element.textContent, context) }
    };
    vm.runInContext(source, context);
    return { context, storage, calls, replies, timers, advance: amount => { now += amount; }, navigate: pathname => { context.location.pathname = pathname; context.location.href = "https://www.douyu.com" + pathname; }, tick: () => { const pending = [...timers.values()]; timers.clear(); pending.forEach(fn => fn()); } };
}

// Keep the real /getH5PlayV1/6979222 order (page /6657): first is 2K,
// followed by 1080P60 despite its larger bitrate. This is the player's menu order.
const rates = [
    { rate: 15, name: "2K超高清", bit: 14000, diamondFan: 0 },
    { rate: 0, name: "原画1080P60", bit: 16228, diamondFan: 0 },
    { rate: 8, name: "蓝光8M", bit: 8000, diamondFan: 0 }
];
function metadata(multirates = rates) { return { room: { room_id: "1001", rate: 0, multirates } }; }
function stream(rate, multirates = rates) { return { error: 0, data: { room_id: "6979222", rate, multirates, rtmp_live: "actual-stream-" + rate } }; }
const streamURL = "https://www.douyu.com/lapi/live/getH5PlayV1/6979222";
const form = rate => ({ method: "POST", body: "cdn=ws-h5&rate=" + rate });

async function run() {
    const preloadEnv = environment();
    const preload = Promise.resolve(stream(15));
    preloadEnv.context.preloadStreamUrlPromise = preload;
    assert.equal(preloadEnv.context.preloadStreamUrlPromise, preload, "startup must preserve the native preload promise, including an already-correct stream");
    assert.equal((await preloadEnv.context.preloadStreamUrlPromise).data.rate, 15);
    assert.equal(preloadEnv.calls.length, 0, "reading a native preload must not request another stream");
    console.log("✓ native preload remains immediately available without another request");

    const shared = environment();
    let releaseSharedUpgrade;
    const sharedCompletions = [];
    shared.replies.push(stream(0), stream(0), () => new Promise(resolve => { releaseSharedUpgrade = resolve; }));
    const sharedFirst = shared.context.fetch(streamURL, form(0)).then(response => { sharedCompletions.push("first"); return response; });
    const sharedSecond = shared.context.fetch(streamURL, form(0)).then(response => { sharedCompletions.push("second"); return response; });
    for (let step = 0; step < 30 && shared.calls.length < 3; step++) await new Promise(setImmediate);
    await new Promise(setImmediate);
    assert.equal(shared.calls.length, 3, "concurrent initial requests share one upgrade request");
    assert.deepEqual(sharedCompletions, [], "a concurrent low stream must not escape while the shared upgrade is pending");
    releaseSharedUpgrade(new Response(JSON.stringify(stream(15))));
    const sharedResponses = await Promise.all([sharedFirst, sharedSecond]);
    assert.notEqual(sharedResponses[0], sharedResponses[1], "callers need separately consumable response bodies");
    assert.deepEqual(await Promise.all(sharedResponses.map(async response => (await response.json()).data.rate)), [15, 15]);
    shared.replies.push(stream(4));
    assert.equal((await (await shared.context.fetch(streamURL, form(4))).json()).data.rate, 4);
    assert.equal(new URLSearchParams(shared.calls.at(-1).init.body).get("rate"), "4", "the first successful upgrade must immediately release later quality choices");
    console.log("✓ concurrent startup responses share the upgrade; success immediately releases later choices");

    const sharedCancel = environment();
    const cancelledCaller = new AbortController();
    let releaseRemainingUpgrade;
    sharedCancel.replies.push(stream(0), stream(0), () => new Promise(resolve => { releaseRemainingUpgrade = resolve; }));
    const cancelledRequest = sharedCancel.context.fetch(streamURL, { ...form(0), signal: cancelledCaller.signal });
    const remainingRequest = sharedCancel.context.fetch(streamURL, form(0));
    for (let step = 0; step < 30 && sharedCancel.calls.length < 3; step++) await new Promise(setImmediate);
    assert.equal(sharedCancel.calls.length, 3);
    const cancellation = new Error("cancel just one initial request");
    const cancelledAssertion = assert.rejects(cancelledRequest, error => error === cancellation);
    cancelledCaller.abort(cancellation);
    await cancelledAssertion;
    assert.equal(sharedCancel.calls[2].init.signal.aborted, false, "one caller must not abort the upgrade still needed by another");
    releaseRemainingUpgrade(new Response(JSON.stringify(stream(15))));
    assert.equal((await (await remainingRequest).json()).data.rate, 15);
    assert.equal(sharedCancel.timers.size, 0);
    console.log("✓ cancelling one startup caller leaves the other caller's upgrade alive");

    const lateInitial = environment();
    let releaseLateInitial;
    lateInitial.replies.push(stream(0), () => new Promise(resolve => { releaseLateInitial = resolve; }), stream(15));
    const upgradedInitial = lateInitial.context.fetch(streamURL, form(0));
    const lateInitialRequest = lateInitial.context.fetch(streamURL, form(0));
    assert.equal((await (await upgradedInitial).json()).data.rate, 15);
    lateInitial.replies.push(stream(4));
    assert.equal((await (await lateInitial.context.fetch(streamURL, form(4))).json()).data.rate, 4);
    releaseLateInitial(new Response(JSON.stringify(stream(0))));
    assert.equal((await (await lateInitialRequest).json()).data.rate, 15, "an already-in-flight startup response must use the shared result even after automatic selection ends");
    console.log("✓ late initial responses cannot restore the low stream after the upgrade");

    const cancelAll = environment();
    const callers = [new AbortController(), new AbortController()];
    cancelAll.replies.push(stream(0), stream(0), () => new Promise(() => {}));
    const allRequests = callers.map(caller => cancelAll.context.fetch(streamURL, { ...form(0), signal: caller.signal }));
    const allCancelled = allRequests.map(request => assert.rejects(request, error => error.name === "AbortError"));
    for (let step = 0; step < 30 && cancelAll.calls.length < 3; step++) await new Promise(setImmediate);
    callers[0].abort();
    assert.equal(cancelAll.calls[2].init.signal.aborted, false);
    callers[1].abort();
    await Promise.all(allCancelled);
    await new Promise(setImmediate);
    assert.equal(cancelAll.calls[2].init.signal.aborted, true, "abort shared network work when no startup caller needs it");
    assert.equal(cancelAll.timers.size, 0);
    console.log("✓ cancelling every startup caller aborts the shared request and clears its timer");

    const nativeHighest = environment();
    nativeHighest.replies.push(stream(15));
    await nativeHighest.context.fetch(streamURL, form(0));
    assert.equal(nativeHighest.calls.length, 1, "a native highest stream needs no replay");
    nativeHighest.context.getLegacyFirstStream = options => options;
    assert.equal(nativeHighest.context.getLegacyFirstStream({ rate: 4 }).rate, 4, "native highest-quality success ends first-stream interception immediately");
    nativeHighest.replies.push(stream(4));
    await nativeHighest.context.fetch(streamURL, form(4));
    assert.equal(new URLSearchParams(nativeHighest.calls.at(-1).init.body).get("rate"), "4");
    console.log("✓ native highest-quality success also releases later choices without waiting 12 seconds");

    const sharedRooms = environment();
    let releaseOldUpgrade;
    sharedRooms.replies.push(stream(0), () => new Promise(resolve => { releaseOldUpgrade = resolve; }));
    const oldRoomRequest = sharedRooms.context.fetch(streamURL, form(0));
    for (let step = 0; step < 30 && sharedRooms.calls.length < 2; step++) await new Promise(setImmediate);
    sharedRooms.navigate("/2002");
    const newRoomRates = [{ rate: 16, name: "4K" }, { rate: 4, name: "蓝光4M" }];
    sharedRooms.replies.push(stream(4, newRoomRates), stream(16, newRoomRates));
    assert.equal((await (await sharedRooms.context.fetch("https://www.douyu.com/lapi/live/getH5PlayV1/2002", form(4))).json()).data.rate, 16);
    releaseOldUpgrade(new Response(JSON.stringify(stream(15))));
    assert.equal((await (await oldRoomRequest).json()).data.rate, 0, "the old room's late replay is not applied after navigation");
    const newRoomCache = JSON.parse(sharedRooms.storage.get("ExSave_HighestQualityRate"));
    assert.equal(newRoomCache.path, "/2002");
    assert.equal(newRoomCache.rate, 16, "old task completion cannot replace the new room's preference");
    console.log("✓ a late shared upgrade cannot change the next room's quality state");

    for (const variant of [
        { input: streamURL, init: { method: "POST", body: "cdn=other&rate=4" } },
        { input: streamURL, init: { method: "POST", body: "cdn=ws-h5&rate=4&codec=h265" } },
        { input: streamURL, init: { ...form(4), headers: { "x-playback": "different" } } },
        { input: streamURL.replace("getH5PlayV1", "getH5PlayV2"), init: form(4) },
        { input: new Request(streamURL, { ...form(4), headers: { "content-type": "application/x-www-form-urlencoded" } }) }
    ]) {
        const incompatible = environment();
        let releaseCompatibleUpgrade;
        incompatible.replies.push(stream(0), () => new Promise(resolve => { releaseCompatibleUpgrade = resolve; }));
        const originalStartup = incompatible.context.fetch(streamURL, form(0));
        for (let step = 0; step < 30 && incompatible.calls.length < 2; step++) await new Promise(setImmediate);
        const nativeResponse = new Response(JSON.stringify(stream(4)));
        incompatible.replies.push(() => Promise.resolve(nativeResponse));
        const bypassed = await incompatible.context.fetch(variant.input, variant.init);
        assert.equal(bypassed, nativeResponse, "different endpoint/CDN/codec/headers or an unverified Request must retain its own native response");
        assert.equal(new URLSearchParams(incompatible.calls.at(-1).body || incompatible.calls.at(-1).init.body).get("rate"), "4", "native line recovery must not be retargeted while another startup request upgrades");
        releaseCompatibleUpgrade(new Response(JSON.stringify(stream(15))));
        assert.equal((await (await originalStartup).json()).data.rate, 15);
    }
    console.log("✓ incompatible startup requests retain their own endpoint, line, payload and response");

    const nativeCancel = environment();
    const nativeCaller = new AbortController();
    const nativeReady = new Response(JSON.stringify(stream(15)));
    const nativeClone = nativeReady.clone;
    nativeReady.clone = function() {
        if (nativeCaller.signal.aborted) throw new TypeError("aborted native response body");
        return nativeClone.call(this);
    };
    Object.defineProperties(nativeReady, { url: { value: streamURL }, type: { value: "cors" }, redirected: { value: true } });
    let releaseNativeFollower;
    nativeCancel.replies.push(() => Promise.resolve(nativeReady), () => new Promise(resolve => { releaseNativeFollower = resolve; }));
    const nativeLeader = nativeCancel.context.fetch(streamURL, { ...form(0), signal: nativeCaller.signal });
    const nativeFollower = nativeCancel.context.fetch(streamURL, form(0));
    const leaderResponse = await nativeLeader;
    const leaderClone = leaderResponse.clone();
    assert.equal(leaderClone.url, streamURL);
    assert.equal(leaderClone.type, "cors");
    assert.equal(leaderClone.redirected, true);
    assert.equal((await leaderResponse.json()).data.rate, 15);
    assert.throws(() => leaderResponse.clone(), TypeError, "snapshot clone must still reject a consumed body");
    nativeCaller.abort();
    releaseNativeFollower(new Response(JSON.stringify(stream(0))));
    const followerResponse = await nativeFollower;
    assert.equal(followerResponse.url, streamURL);
    assert.equal((await followerResponse.json()).data.rate, 15, "late callers must not depend on the first caller's abortable native body");
    console.log("✓ shared response snapshots preserve metadata and isolate native-body cancellation");

    const env = environment();
    env.replies.push(metadata());
    const data = await (await env.context.fetch("https://www.douyu.com/betard/1001")).json();
    assert.equal(data.room.rate, 15, "issue #10: choose the first advertised 2K entry, not fixed rate 0");
    const options = { method: "POST", body: "cdn=ws-h5&rate=0&rid=1001" };
    await env.context.fetch("https://www.douyu.com/lapi/live/getH5PlayV1/1001", options);
    assert.equal(new URLSearchParams(env.calls.at(-1).init.body).get("rate"), "15");
    assert.equal(options.body, "cdn=ws-h5&rate=0&rid=1001", "do not mutate caller-owned fetch options");
    console.log("✓ highest available quality overrides the fixed 1080P60 rate");

    const initial = environment();
    initial.navigate("/6657");
    initial.replies.push(stream(0), stream(15));
    const actual = await (await initial.context.fetch(streamURL, form(-1))).json();
    assert.equal(initial.calls.length, 2, "first ladder permits exactly one upgrade request");
    assert.equal(actual.data.rtmp_live, "actual-stream-15", "return the actual upgraded stream, not a forged quality label");
    assert.equal(new URLSearchParams(initial.calls[0].init.body).get("rate"), "-1", "unknown room must not be forced to 0");
    assert.equal(new URLSearchParams(initial.calls[1].init.body).get("rate"), "15");
    assert.equal(JSON.parse(initial.storage.get("player_storage_quality_h5p_room")).v, "15");
    assert.equal(initial.storage.has("rateRecordTime_h5p_room"), false, "do not overwrite the no-login limit marker");
    initial.replies.push(stream(0));
    await initial.context.fetch(streamURL, form(0));
    assert.equal(initial.calls.length, 3, "no repeated upgrade loop");
    initial.advance(12000);
    initial.replies.push(stream(4));
    const manual = await (await initial.context.fetch(streamURL, form(4))).json();
    assert.equal(new URLSearchParams(initial.calls.at(-1).init.body).get("rate"), "4");
    assert.equal(manual.data.rate, 4, "manual choice after the startup window stays untouched");
    console.log("✓ real stream ladder, relayed RID, preference cache, bounded upgrade, manual downgrade");

    const failed = environment();
    failed.replies.push(stream(0), { error: 1 });
    assert.equal((await (await failed.context.fetch(streamURL, form(0))).json()).data.rtmp_live, "actual-stream-0");
    assert.equal(failed.calls.length, 2);
    failed.replies.push(stream(4));
    await failed.context.fetch(streamURL, form(4));
    assert.equal(new URLSearchParams(failed.calls.at(-1).init.body).get("rate"), "4", "after a denied upgrade, do not keep pinning the denied quality");
    const noLadder = environment();
    noLadder.replies.push(stream(4, []));
    assert.equal((await (await noLadder.context.fetch(streamURL, form(4))).json()).data.rate, 4);
    assert.equal(noLadder.calls.length, 1);
    const disabled = environment(false);
    disabled.replies.push(stream(0));
    await disabled.context.fetch(streamURL, form(4));
    assert.equal(new URLSearchParams(disabled.calls[0].init.body).get("rate"), "4");
    console.log("✓ failure/missing ladder/disabled mode preserve playable streams");

    const requestEnv = environment();
    requestEnv.replies.push(stream(0), stream(15));
    const request = new Request(streamURL, { ...form(0), headers: { "content-type": "application/x-www-form-urlencoded", "x-test": "retained" } });
    assert.equal((await (await requestEnv.context.fetch(request)).json()).data.rate, 15);
    assert.equal(new URLSearchParams(requestEnv.calls[1].body).get("rate"), "15");
    assert.equal(requestEnv.calls[1].input.headers.get("x-test"), "retained");
    const params = new URLSearchParams("rate=4&cdn=test");
    await requestEnv.context.fetch(new URL(streamURL), { method: "POST", body: params });
    assert.equal(requestEnv.calls.at(-1).init.body.get("rate"), "4", "after highest-quality success, later URLSearchParams choices stay unchanged");
    assert.equal(params.get("rate"), "4");
    console.log("✓ Request/URL/URLSearchParams supported without mutating caller bodies");

    const xhrEnv = environment();
    const xhr = new xhrEnv.context.XMLHttpRequest();
    xhr.responseType = "json";
    xhr.open("GET", "https://www.douyu.com/betard/1001");
    xhr.send();
    xhr.complete(metadata());
    assert.equal(xhr.response.room.rate, 15);
    const xhrStream = new xhrEnv.context.XMLHttpRequest();
    xhrStream.open("POST", streamURL);
    xhrStream.send("rate=0");
    assert.equal(new URLSearchParams(xhrStream.sentBody).get("rate"), "0", "XHR cannot transparently recover a denied forced rate; leave native requests untouched");
    xhrStream.complete(stream(0));
    assert.equal(JSON.parse(xhrStream.responseText).data.rate, 0, "XHR must never falsify the rate of an existing stream");
    let clicks = 0;
    xhrEnv.context.document.querySelector = selector => selector.includes("input") ? { parentElement: { querySelectorAll: () => [{ textContent: "2K超高清", click: () => clicks++ }] } } : null;
    xhrEnv.tick();
    assert.equal(clicks, 1);
    xhrEnv.advance(12000);
    const manualXHR = new xhrEnv.context.XMLHttpRequest();
    manualXHR.open("POST", streamURL);
    manualXHR.send("rate=4");
    assert.equal(manualXHR.sentBody, "rate=4");
    console.log("✓ XHR JSON/text metadata, one menu fallback, startup expiry");

    const cached = environment(true, { ExSave_HighestQualityRate: JSON.stringify({ path: "/1001", at: 99999, rate: 15, name: "2K超高清" }) });
    await cached.context.fetch(streamURL, form(4));
    assert.equal(new URLSearchParams(cached.calls[0].init.body).get("rate"), "15");
    cached.navigate("/2002");
    await cached.context.fetch("https://www.douyu.com/lapi/live/getH5PlayV1/2002", form(4));
    assert.equal(new URLSearchParams(cached.calls.at(-1).init.body).get("rate"), "4", "old room cache cannot pin a new room's rate");
    const stale = environment(true, { ExSave_HighestQualityRate: JSON.stringify({ path: "/1001", at: -999999, rate: 15 }) });
    await stale.context.fetch(streamURL, form(4));
    assert.equal(new URLSearchParams(stale.calls[0].init.body).get("rate"), "4");
    console.log("✓ cache is bounded by room and age; SPA room changes reset selection");

    const delayed = environment();
    let release;
    delayed.replies.push(() => new Promise(resolve => { release = resolve; }));
    const pending = delayed.context.fetch(streamURL, form(0));
    delayed.navigate("/2002");
    release(new Response(JSON.stringify(stream(0))));
    assert.equal((await (await pending).json()).data.rate, 0);
    assert.equal(delayed.calls.length, 1, "late response from old room cannot cause an upgrade");
    console.log("✓ in-flight old-room responses cannot contaminate the new room");

    const reuse = environment();
    const reusedXHR = new reuse.context.XMLHttpRequest();
    reusedXHR.open("GET", "https://www.douyu.com/betard/1001");
    reusedXHR.send();
    reusedXHR.complete(metadata());
    assert.equal(JSON.parse(reusedXHR.responseText).room.rate, 15);
    reusedXHR.open("GET", "https://www.douyu.com/unrelated");
    reusedXHR.send();
    reusedXHR.complete(metadata());
    assert.equal(JSON.parse(reusedXHR.responseText).room.rate, 0, "reused XHR must not retain the old metadata getter");
    assert.equal(Object.hasOwn(reusedXHR, "responseText"), false);
    const jsonXHR = new reuse.context.XMLHttpRequest();
    jsonXHR.open("POST", streamURL);
    jsonXHR.send(JSON.stringify({ rate: 4 }));
    assert.equal(jsonXHR.sentBody, '{"rate":4}', "unknown body encodings remain untouched");
    console.log("✓ XHR reuse and unrelated/unknown payloads remain transparent");

    const paid = environment();
    const paidRates = [{ rate: 15, name: "2K超高清", diamondFan: 1 }, ...rates];
    paid.replies.push(stream(0, paidRates), stream(15, paidRates));
    assert.equal((await (await paid.context.fetch(streamURL, form(0))).json()).data.rate, 15, "diamondFan is not proof this account lacks access");
    const concurrent = environment();
    concurrent.replies.push(stream(0), stream(0), stream(15));
    await Promise.all([concurrent.context.fetch(streamURL, form(0)), concurrent.context.fetch(streamURL, form(0))]);
    assert.equal(concurrent.calls.length, 3, "concurrent responses share one upgrade budget");
    console.log("✓ account entitlement stays server-controlled; concurrent responses cannot multiply retries");

    const legacy = environment();
    legacy.replies.push(metadata([{ type: 15, name: "2K超高清" }, { type: 0, name: "原画1080P60" }]));
    await legacy.context.fetch("https://www.douyu.com/betard/1001");
    legacy.context.getLegacyFirstStream = options => options;
    const originalOptions = { rate: 4, cdn: "test" };
    assert.equal(legacy.context.getLegacyFirstStream(originalOptions).rate, 15);
    assert.equal(originalOptions.rate, 4);
    legacy.advance(12000);
    assert.equal(legacy.context.getLegacyFirstStream(originalOptions).rate, 4);
    const expiringXHR = environment();
    const slowXHR = new expiringXHR.context.XMLHttpRequest();
    slowXHR.open("GET", "https://www.douyu.com/betard/1001");
    slowXHR.send();
    expiringXHR.advance(12000);
    slowXHR.complete(metadata());
    assert.equal(JSON.parse(slowXHR.responseText).room.rate, 0);
    console.log("✓ legacy type metadata and first-stream options obey startup expiry");

    const withdrawn = environment(true, { ExSave_HighestQualityRate: JSON.stringify({ path: "/1001", at: 99999, rate: 15, name: "2K超高清" }) });
    withdrawn.replies.push({ error: 1 }, stream(0, [{ rate: 0, name: "原画1080P60" }]));
    assert.equal((await (await withdrawn.context.fetch(streamURL, form(0))).json()).data.rtmp_live, "actual-stream-0");
    assert.equal(new URLSearchParams(withdrawn.calls[0].init.body).get("rate"), "15");
    assert.equal(new URLSearchParams(withdrawn.calls[1].init.body).get("rate"), "0");
    assert.equal(withdrawn.calls.length, 2);
    await withdrawn.context.fetch(streamURL, form(4));
    assert.equal(new URLSearchParams(withdrawn.calls.at(-1).init.body).get("rate"), "4");
    console.log("✓ a withdrawn/unauthorized cached quality falls back to the original request");

    const selectedMenu = environment();
    const selectedXHR = new selectedMenu.context.XMLHttpRequest();
    selectedXHR.open("POST", streamURL);
    selectedXHR.send("rate=0");
    selectedXHR.complete(stream(0));
    let repeatedClicks = 0;
    selectedMenu.context.document.querySelector = selector => selector.includes("input") ? { parentElement: { querySelectorAll: () => [{ textContent: "2K超高清", className: "selected-ab049e", click: () => repeatedClicks++ }] } } : null;
    selectedMenu.tick();
    assert.equal(repeatedClicks, 0);
    assert.equal(selectedMenu.timers.size, 0);
    console.log("✓ menu fallback stays in the quality group and does not reselect an active item");

    const foreign = environment();
    foreign.replies.push({ room: { rate: 0, multirates: [{ rate: 8, name: "蓝光8M" }] } });
    await foreign.context.fetch("https://www.douyu.com/betard/2222");
    await foreign.context.fetch(streamURL, form(0));
    assert.equal(new URLSearchParams(foreign.calls.at(-1).init.body).get("rate"), "0", "another room's betard must not set the main player's quality");
    console.log("✓ unrelated room metadata cannot contaminate initial selection");

    const hanging = environment();
    let lateReply;
    hanging.replies.push(stream(0), () => new Promise(resolve => { lateReply = resolve; }));
    const hangingResult = hanging.context.fetch(streamURL, form(0));
    for (let step = 0; step < 20 && hanging.calls.length < 2; step++) await new Promise(setImmediate);
    assert.equal(hanging.timers.size, 1, "a hanging upgrade must have a timeout");
    assert.equal([...hanging.timers.values()][0].delay, 2500);
    hanging.advance(2500);
    hanging.tick();
    assert.equal((await (await hangingResult).json()).data.rate, 0);
    assert.equal(hanging.calls[1].init.signal.aborted, true, "timed out upgrade must cancel its network request");
    lateReply(new Response(JSON.stringify(stream(15))));
    await new Promise(setImmediate);
    await hanging.context.fetch(streamURL, form(4));
    assert.equal(new URLSearchParams(hanging.calls.at(-1).init.body).get("rate"), "4");
    console.log("✓ a hung upgrade returns the playable stream after 2.5s; late replies do not revive selection");

    const expiring = environment();
    expiring.advance(11500);
    expiring.replies.push(stream(0), () => new Promise(() => {}));
    const expiringResult = expiring.context.fetch(streamURL, form(0));
    for (let step = 0; step < 20 && expiring.calls.length < 2; step++) await new Promise(setImmediate);
    assert.equal([...expiring.timers.values()][0].delay, 500, "upgrade cannot extend the startup guard");
    expiring.advance(500);
    expiring.tick();
    assert.equal((await (await expiringResult).json()).data.rate, 0);
    console.log("✓ upgrade timeout is capped by the remaining startup window");

    const cancelled = environment();
    const caller = new AbortController();
    cancelled.replies.push(stream(0), () => new Promise(() => {}));
    const cancelledResult = cancelled.context.fetch(streamURL, { ...form(0), signal: caller.signal });
    for (let step = 0; step < 20 && cancelled.calls.length < 2; step++) await new Promise(setImmediate);
    const reason = new Error("user cancelled playback");
    caller.abort(reason);
    await assert.rejects(cancelledResult, error => error === reason, "propagate caller cancellation instead of returning a fallback stream");
    assert.equal(cancelled.calls[1].init.signal.aborted, true);
    assert.equal(cancelled.timers.size, 0);
    console.log("✓ caller cancellation propagates and cancels the upgrade request");

    const fallbackHang = environment(true, { ExSave_HighestQualityRate: JSON.stringify({ path: "/1001", at: 99999, rate: 15, name: "2K超高清" }) });
    fallbackHang.replies.push({ error: 1 }, () => new Promise(() => {}));
    const fallbackResult = fallbackHang.context.fetch(streamURL, form(0));
    for (let step = 0; step < 20 && fallbackHang.calls.length < 2; step++) await new Promise(setImmediate);
    fallbackHang.advance(2500);
    fallbackHang.tick();
    assert.equal((await (await fallbackResult).json()).error, 1, "failed cached-request fallback cannot hang indefinitely either");
    assert.equal(fallbackHang.calls[1].init.signal.aborted, true);
    console.log("✓ invalid-cache fallback uses the same bounded timeout");

    for (const [expected, ladder] of [
        [0, [{ rate: 0, name: "原画" }, { rate: 8, name: "蓝光8M" }]],
        [16, [{ rate: 16, name: "4K" }, { rate: 15, name: "2K超高清" }, { rate: 0, name: "原画1080P60" }]],
        [0, [{ rate: 0, name: "原画720P" }, { rate: 4, name: "蓝光4M" }]],
        [2, [{ rate: 2, name: "高清" }]],
        [91, [{ rate: 91, name: "自定义最高档" }, { rate: 99, name: "其他档" }]]
    ]) {
        const room = environment();
        room.replies.push(stream(4, ladder), stream(expected, ladder));
        const result = await (await room.context.fetch(streamURL, form(4))).json();
        assert.equal(result.data.rate, expected, "highest rate must come from each room's ladder, not a fixed 0/15");
    }
    const changing = environment();
    changing.replies.push(stream(0), stream(15));
    await changing.context.fetch(streamURL, form(0));
    changing.navigate("/2002");
    const secondLadder = [{ rate: 0, name: "原画" }, { rate: 4, name: "蓝光4M" }];
    changing.replies.push(stream(4, secondLadder), stream(0, secondLadder));
    assert.equal((await (await changing.context.fetch("https://www.douyu.com/lapi/live/getH5PlayV1/2002", form(4))).json()).data.rate, 0);
    console.log("✓ multiple room ladders and SPA changes select 0/16/2/91 dynamically, without pinning 15");

    const ordered = environment();
    ordered.replies.push(metadata([
        { rate: 7, name: "720P", bit: 3000 },
        { rate: 99, name: "4K", bit: 45000 }
    ]));
    assert.equal((await (await ordered.context.fetch("https://www.douyu.com/betard/1001")).json()).room.rate, 7,
        "the server's first valid entry wins even if later names, bitrates and rate IDs look larger");
    console.log("✓ server order is authoritative; no reordering by name, resolution, bitrate or rate ID");

    const invalidEntries = [null, {}, { rate: -1 }, { rate: "bad" }, { rate: 1.5 }, { rate: true }, { rate: " " }, { rate: [] }];
    const validAfterInvalid = environment();
    validAfterInvalid.replies.push(metadata([...invalidEntries, { type: "16", name: "4K" }, { rate: 99, name: "8K" }]));
    assert.equal((await (await validAfterInvalid.context.fetch("https://www.douyu.com/betard/1001")).json()).room.rate, 16);
    const invalidOnly = environment();
    invalidOnly.replies.push(stream(4, invalidEntries));
    assert.equal((await (await invalidOnly.context.fetch(streamURL, form(4))).json()).data.rate, 4);
    assert.equal(invalidOnly.calls.length, 1);
    assert.equal(invalidOnly.storage.has("ExSave_HighestQualityRate"), false);
    console.log("✓ skip malformed entries; an entirely invalid ladder stays transparent");
}
run().catch(error => { console.error(error); process.exitCode = 1; });
