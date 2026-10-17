/**
 * tests/test_archive_meta.js — 房间元数据 + 礼物价目（DanmakuArchive_Meta.js）契约测试
 *
 * 不连网：把 GM_xmlhttpRequest 换成桩，按 URL 三段（betard / h5room / gift list）返回
 * 构造好的假响应（字段名与取值照 .zcode/p0-data/B-页面与接口数据.md 的实测原样）。
 *
 * 覆盖：
 *   1. room() 正常合并：fans 取 h5room（betard 根本没有）、roomName/showTime 取 betard
 *   2. 30 分钟内存缓存：重复调用只发一轮请求
 *   3. primeGifts() 解析 64 个礼物 + giftPrice(火箭) = 50000（原值，不除 100）+ 落盘 ArchiveDB
 *   4. 价目缺失的 gfid 返回 null（不是 priceCents:0）
 *   5. betard 500 → {ok:false, reason:"betard-http"}，不抛异常、不进缓存
 *   6. 同 rid 并发两次 room() 只发一轮请求（in-flight 合并）
 *   7. ArchiveDB 不存在 → 纯内存降级仍可用
 *   8. h5room 失败 → 降级 ok:true + fans:null + partial + warnings
 *   9. 失败重试 1 次：首次 500、二次 200 → ok:true 且请求 2 次（退避 800ms 由测试压平）
 *  10. 靓号：exParseRealRid 只在"当前页就是这个短号"时采用，别房不串号
 *  11. clearCache 后重新请求；价目表从 ArchiveDB 重新装载
 *  12. primeGifts 按 rid 记 7 天：第二次不再请求
 *  13. GM_xmlhttpRequest 不存在 → 退化 fetch
 *  14. refreshIfStale：过期刷新、未过期不动
 *  15. betard 非 JSON → reason betard-parse；空 rid → bad-arg
 */

const fs = require("fs");
const path = require("path");
const assert = require("assert");

const SRC_PATH = path.join(__dirname, "../src/packages/DanmakuArchive/DanmakuArchive_Meta.js");

const ROOM_RID = "9263298";       // 实测样本房间：若若跑的贼快
const UP_ID = "z97JRz0peX7k";     // 实测 betard.room.up_id（≠ uid）
const FANS_FROM_H5ROOM = 5981318; // 实测 h5room.data.fans = "5981318"

/* ---------------- 载入被测源码（真实源码 + GM / ArchiveDB / fetch 桩） ---------------- */

function loadModule(options) {
    const settings = options || {};
    const requests = [];
    const fetchCalls = [];
    const metaWrites = [];
    const host = settings.window || {};

    // 压平等待：重试退避 800ms、请求超时 10s 一律缩到 5ms，测试不会真的等。
    const fastSetTimeout = (fn, ms) => setTimeout(fn, Math.min(typeof ms === "number" ? ms : 0, 5));

    const GM_xmlhttpRequest = (request) => {
        requests.push(request);
        if (settings.neverRespond) return;
        const plan = (settings.plan || defaultPlan)(request.url, requests.length) || { reason: "http", status: 404 };
        setTimeout(() => {
            if (plan.reason === "timeout") { if (request.ontimeout) request.ontimeout(); return; }
            if (plan.reason === "network") { if (request.onerror) request.onerror(); return; }
            if (plan.reason === "http") {
                request.onload({ status: plan.status || 500, responseText: "upstream error" });
                return;
            }
            if (plan.reason === "parse") {
                request.onload({ status: 200, responseText: "<html>not json</html>" });
                return;
            }
            request.onload({ status: 200, responseText: JSON.stringify(plan.body) });
        }, 0);
    };

    const fetchStub = (url) => {
        fetchCalls.push(url);
        const plan = (settings.plan || defaultPlan)(url, fetchCalls.length) || { reason: "http", status: 404 };
        if (plan.reason === "http") return Promise.resolve({ status: plan.status || 500, ok: false, text: () => Promise.resolve("upstream error") });
        if (plan.reason === "parse") return Promise.resolve({ status: 200, ok: true, text: () => Promise.resolve("<html>not json</html>") });
        if (plan.reason === "network") return Promise.reject(new Error("network down"));
        return Promise.resolve({ status: 200, ok: true, text: () => Promise.resolve(JSON.stringify(plan.body)) });
    };

    const ArchiveDB = settings.noArchiveDB ? undefined : (settings.ArchiveDB || {
        getMeta: (key) => {
            if (settings.dbGetThrows) throw new Error("storage 炸了");
            const table = settings.dbSeed && settings.dbSeed[key];
            return table === undefined ? null : table;
        },
        setMeta: (key, value) => {
            if (settings.dbSetThrows) throw new Error("storage 炸了");
            metaWrites.push({ key, value });
        },
    });

    const exParseRealRid = settings.exParseRealRid;

    const factory = new Function(
        "GM_xmlhttpRequest", "window", "setTimeout", "clearTimeout",
        "ArchiveDB", "exParseRealRid", "fetch",
        fs.readFileSync(SRC_PATH, "utf8") + "\nreturn ArchiveMeta;"
    );
    const api = factory(
        settings.noGm ? undefined : GM_xmlhttpRequest,
        host,
        fastSetTimeout,
        clearTimeout,
        ArchiveDB,
        exParseRealRid,
        settings.noGm ? fetchStub : fetchStub
    );
    return { api, requests, fetchCalls, metaWrites, host };
}

/* ---------------- 假响应（字段与取值照实测原样） ---------------- */

function betardBody() {
    return {
        room_gg: { show: "", status: 0 },
        room: {
            show_status: 1,
            show_time: 1792169158,
            end_time: "1828165558",
            show_id: 437472838,
            room_id: 9263298,
            room_name: "和平集市即将上新！",
            nickname: "若若跑的贼快",
            owner_uid: 335920043,
            cate1_id: "9",
            cate2_id: "350",
            cate3_id: "847",
            fans_bn: "{\"bn\":\"\u82e5\u82e5\u54df\",\"flag\":1}",
            up_id: UP_ID,
            show_details: "和平精英QQ群：788930190",
        },
    };
}

function h5roomBody() {
    return {
        error: 0,
        data: {
            room_id: "9263298",
            room_name: "和平集市即将上新！",
            show_status: "1",
            show_time: "1792000000",   // 故意与 betard 不同：合并必须以 betard 为准
            owner_uid: "335920043",
            nickname: "h5room 的昵称",  // 故意与 betard 不同
            cate_id: "350",
            online: 0,                 // 实测恒为 0：本模块绝不使用
            fans: String(FANS_FROM_H5ROOM),
        },
    };
}

/** 64 个礼物的价目表，价格照实测原值（0.01 鱼翅为单位）。 */
function giftListBody() {
    const known = [
        { id: 20002, name: "办卡", price: 600 },
        { id: 20001, name: "弱鸡", price: 20 },
        { id: 20006, name: "赞", price: 10 },
        { id: 20003, name: "飞机", price: 10000 },
        { id: 20004, name: "火箭", price: 50000 },
        { id: 20005, name: "超级火箭", price: 200000 },
        { id: 23335, name: "宇宙飞船", price: 500000 },
        { id: 24967, name: "萌星飞碟", price: 10000 },
    ];
    const giftList = known.map((gift) => ({
        id: gift.id,
        name: gift.name,
        priceInfo: { price: gift.price, priceType: "YUCHI" },
        skinIds: ["9"],
    }));
    for (let index = giftList.length; index < 64; index++) {
        giftList.push({
            id: 30000 + index,
            name: "礼物" + index,
            priceInfo: { price: 100 + index, priceType: "YUCHI" },
            skinIds: [],
        });
    }
    return { data: { giftList: giftList, onceLimit: [], skinData: {}, tabs: [], tid: 0 }, error: 0, msg: "ok" };
}

function defaultPlan(url) {
    const kind = urlKind(url);
    if (kind === "betard") return { body: betardBody() };
    if (kind === "h5room") return { body: h5roomBody() };
    if (kind === "gifts") return { body: giftListBody() };
    return { reason: "http", status: 404 };
}

/* ---------------- 小工具 ---------------- */

function urlKind(url) {
    if (url.indexOf("/betard/") !== -1) return "betard";
    if (url.indexOf("/swf_api/h5room/") !== -1) return "h5room";
    if (url.indexOf("gift.douyucdn.cn/api/gift/v5/web/list") !== -1) return "gifts";
    return "unknown";
}

function countKind(requests, kind) {
    return requests.filter((request) => urlKind(request.url) === kind).length;
}

let passed = 0;
function ok(name) {
    passed++;
    console.log("  ✓ " + name);
}

/* ---------------- 测试正文 ---------------- */

async function run() {
    console.log("=== 正在运行房间元数据 + 礼物价目专项单元测试（真实源码 + 三段接口桩） ===\n");

    assert.ok(fs.existsSync(SRC_PATH), "被测源码必须存在：" + SRC_PATH);

    // ---------- 1. 正常合并 ----------
    {
        const module = loadModule({});
        const result = await module.api.room(ROOM_RID);

        assert.strictEqual(result.ok, true, "正常响应必须 ok:true");
        assert.strictEqual(result.room.rid, ROOM_RID);
        assert.strictEqual(result.room.requestedRid, ROOM_RID);
        // fans 只能来自 h5room：betard 里根本没这个字段
        assert.strictEqual(result.room.fans, FANS_FROM_H5ROOM, "fans 必须取 h5room.data.fans（数字化）");
        assert.strictEqual(betardBody().room.fans, undefined, "fixture 自检：betard 不含 fans");
        // roomName / showTime / showStatus 取 betard
        assert.strictEqual(result.room.roomName, "和平集市即将上新！");
        assert.strictEqual(result.room.showTime, 1792169158, "showTime 必须取 betard（h5room 那份是 1792000000）");
        assert.strictEqual(result.room.showStatus, 1);
        assert.strictEqual(result.room.nickname, "若若跑的贼快", "nickname 优先 betard");
        assert.strictEqual(result.room.ownerUid, "335920043");
        assert.strictEqual(result.room.upId, UP_ID, "up_id 是回放反查的入口，必须带出来");
        assert.deepStrictEqual(result.room.cate, { cate1: "9", cate2: "350", cate3: "847" });
        // 实测原值 room.fans_bn = "{\"bn\":\"\\u82e5\\u82e5\\u54df\",\"flag\":1}" -> bn = 若若哟
        assert.strictEqual(result.room.fansBn.bn, "若若哟", "fans_bn 是 JSON 字符串，必须解析出 bn");
        assert.strictEqual(result.room.fansBn.flag, 1);
        assert.strictEqual(typeof result.fetchedAt, "number");
        assert.ok(result.fetchedAt > 0);
        // data.online 恒为 0，不得出现在结果里
        assert.strictEqual("online" in result.room, false, "h5room.data.online 恒为 0，绝不能带进结果");
        assert.strictEqual(result.partial, undefined, "两段都成功时不该有 partial 标记");

        assert.strictEqual(countKind(module.requests, "betard"), 1);
        assert.strictEqual(countKind(module.requests, "h5room"), 1);
        assert.strictEqual(countKind(module.requests, "gifts"), 0, "room() 不该顺带拉价目表");
        assert.ok(module.requests[0].url.indexOf("https://www.douyu.com/betard/" + ROOM_RID) === 0);
        assert.ok(module.requests.every((request) => request.method === "GET"), "三段接口都是 GET");
        assert.ok(module.requests.every((request) => request.timeout === 10000), "单请求超时必须 10 秒");
        ok("room() 合并：fans 取 h5room、roomName/showTime/showStatus 取 betard、fansBn 解析、online 不采信");
    }

    // ---------- 2. 30 分钟缓存 ----------
    {
        const module = loadModule({});
        await module.api.room(ROOM_RID);
        await module.api.room(ROOM_RID);
        await module.api.room(Number(ROOM_RID)); // 数字 rid 命中同一份缓存
        assert.strictEqual(countKind(module.requests, "betard"), 1, "30 分钟内重复调用不该再打 betard");
        assert.strictEqual(countKind(module.requests, "h5room"), 1);
        assert.strictEqual(module.api.defaults.roomTtlMs, 30 * 60 * 1000, "缓存 TTL 必须是 30 分钟");
        ok("30 分钟内存缓存：连打三次（含数字 rid）只发一轮请求");
    }

    // ---------- 3. primeGifts：64 个礼物 + 火箭 50000 ----------
    {
        const module = loadModule({});
        const primed = await module.api.primeGifts(ROOM_RID);

        assert.strictEqual(primed.ok, true, "价目表拉取必须 ok:true");
        assert.strictEqual(primed.count, 64, "实测 giftList 有 64 项，必须全部入表");
        assert.strictEqual(countKind(module.requests, "gifts"), 1);

        const rocket = module.api.giftPrice(20004);
        assert.ok(rocket, "火箭必须查得到价");
        assert.strictEqual(rocket.priceCents, 50000, "priceCents 是接口原值：火箭 50000（不是 500）");
        assert.strictEqual(rocket.name, "火箭");

        assert.strictEqual(module.api.giftPrice("20002").priceCents, 600, "办卡 600");
        assert.strictEqual(module.api.giftPrice(20001).priceCents, 20, "弱鸡 20（0.2 鱼翅，不得取整成 0）");
        assert.strictEqual(module.api.giftPrice(20005).priceCents, 200000, "超级火箭 200000");

        // 落盘：键名 gifts:v1，表里带 _updatedAt，条目形状 {name, priceCents, priceType}
        assert.strictEqual(module.metaWrites.length, 1, "拉完价目必须写一次 ArchiveDB");
        assert.strictEqual(module.metaWrites[0].key, "gifts:v1");
        const snapshot = module.metaWrites[0].value;
        assert.deepStrictEqual(snapshot["20004"], { name: "火箭", priceCents: 50000, priceType: "YUCHI" });
        assert.strictEqual(typeof snapshot._updatedAt, "number", "表必须带 _updatedAt 时间戳");
        assert.strictEqual(Object.keys(snapshot).length, 65, "64 个礼物 + _updatedAt = 65 个键");
        ok("primeGifts() 解析 64 个礼物、priceCents 保持原值（火箭 50000）、按 gifts:v1 落盘");
    }

    // ---------- 4. 缺失 gfid → null ----------
    {
        const module = loadModule({});
        await module.api.primeGifts(ROOM_RID);
        assert.strictEqual(module.api.giftPrice(999999), null, "查不到的 gfid 必须返回 null");
        assert.strictEqual(module.api.giftPrice("999999"), null, "字符串形式的未知 gfid 也是 null");
        assert.strictEqual(module.api.giftPrice(0), null, "gfid=0 不是合法 id，返回 null");
        assert.strictEqual(module.api.giftPrice(""), null);
        assert.strictEqual(module.api.giftPrice(null), null);
        assert.strictEqual(module.api.giftPrice(undefined), null);
        assert.strictEqual(module.api.giftPrice("_updatedAt"), null, "_updatedAt 是元信息键，不能当礼物返回");
        // 关键：绝不能返回 {priceCents:0} 冒充"免费礼物"
        const unknown = module.api.giftPrice(123456);
        assert.notDeepStrictEqual(unknown, { priceCents: 0, name: "" }, "价目缺失不得退化成 priceCents:0");
        ok("价目缺失的 gfid 一律 null（含 0/空/未知/_updatedAt），绝不返回 priceCents:0");
    }

    // ---------- 5. betard 500 → ok:false，不抛、不进缓存 ----------
    {
        const module = loadModule({
            plan: (url) => (urlKind(url) === "betard" ? { reason: "http", status: 500 } : defaultPlan(url)),
        });
        let thrown = null;
        const result = await module.api.room(ROOM_RID).catch((error) => { thrown = error; return null; });
        assert.strictEqual(thrown, null, "room() 永不 reject");
        assert.strictEqual(result.ok, false);
        assert.strictEqual(result.reason, "betard-http", "reason 必须标明是哪一段的哪种失败");
        assert.strictEqual(result.room, null);
        assert.strictEqual(result.fetchedAt, 0);
        assert.strictEqual(countKind(module.requests, "betard"), 2, "失败必须重试 1 次（共 2 次）");
        assert.strictEqual(countKind(module.requests, "h5room"), 1, "h5room 与 betard 并行发出，只发 1 次");

        // 失败不进缓存：再调一次必须真的重发
        await module.api.room(ROOM_RID);
        assert.strictEqual(countKind(module.requests, "betard"), 4, "失败结果不得进缓存，下一次必须重发");
        ok("betard 500 → {ok:false, reason:'betard-http'} 不抛异常、失败结果不进缓存");
    }

    // ---------- 6. 并发两次 room() 只发一轮 ----------
    {
        const module = loadModule({});
        const both = await Promise.all([module.api.room(ROOM_RID), module.api.room(ROOM_RID)]);
        assert.strictEqual(both[0].ok, true);
        assert.strictEqual(both[1].ok, true);
        assert.strictEqual(countKind(module.requests, "betard"), 1, "并发请求必须合并成一次 betard");
        assert.strictEqual(countKind(module.requests, "h5room"), 1);
        assert.deepStrictEqual(both[0].room, both[1].room, "并发两路拿到同一份结果");
        ok("同 rid 并发两次 room() 只发一轮请求（in-flight 去重）");
    }

    // ---------- 7. ArchiveDB 不存在 → 纯内存降级 ----------
    {
        const module = loadModule({ noArchiveDB: true });
        const primed = await module.api.primeGifts(ROOM_RID);
        assert.strictEqual(primed.ok, true, "没有 ArchiveDB 也必须拉得到价目");
        assert.strictEqual(module.api.giftPrice(20004).priceCents, 50000, "纯内存表照常可查");
        assert.strictEqual(module.metaWrites.length, 0, "没有 ArchiveDB 时不写任何存储");

        // 存储抛异常同样不得影响主链路
        const throwing = loadModule({ dbGetThrows: true, dbSetThrows: true });
        const throwingPrimed = await throwing.api.primeGifts(ROOM_RID);
        assert.strictEqual(throwingPrimed.ok, true, "ArchiveDB 抛异常必须被吞掉");
        assert.strictEqual(throwing.api.giftPrice(20004).priceCents, 50000);
        const throwingRoom = await throwing.api.room(ROOM_RID);
        assert.strictEqual(throwingRoom.ok, true);
        ok("ArchiveDB 不存在 / getMeta+setMeta 抛异常 → 纯内存降级，主链路不受影响");
    }

    // ---------- 8. h5room 失败 → 降级 ----------
    {
        const module = loadModule({
            plan: (url) => (urlKind(url) === "h5room" ? { reason: "http", status: 500 } : defaultPlan(url)),
        });
        const result = await module.api.room(ROOM_RID);
        assert.strictEqual(result.ok, true, "h5room 挂了不该让整个房间元数据失败");
        assert.strictEqual(result.room.fans, null, "拿不到关注数就是 null，不是 0");
        assert.strictEqual(result.room.roomName, "和平集市即将上新！", "betard 那半边照常可用");
        assert.strictEqual(result.partial, true);
        assert.deepStrictEqual(result.warnings, ["h5room-http"], "必须如实记录降级原因");
        assert.strictEqual(countKind(module.requests, "h5room"), 2, "h5room 也要重试 1 次");
        ok("h5room 500 → ok:true + fans:null + partial:true + warnings:['h5room-http']");
    }

    // ---------- 9. 重试 1 次：首次 500、二次 200 ----------
    {
        const module = loadModule({
            plan: (url, attempt) => {
                if (urlKind(url) !== "betard") return defaultPlan(url);
                return attempt === 1 ? { reason: "http", status: 500 } : { body: betardBody() };
            },
        });
        const result = await module.api.room(ROOM_RID);
        assert.strictEqual(result.ok, true, "重试成功必须 ok:true");
        assert.strictEqual(result.room.upId, UP_ID);
        assert.strictEqual(countKind(module.requests, "betard"), 2, "第一次 500 → 重试一次后成功");
        assert.strictEqual(module.api.defaults.retryBackoffMs, 800, "退避基数必须是 800 ms");
        assert.strictEqual(module.api.defaults.maxRetry, 1, "最多重试 1 次");
        ok("失败重试 1 次（退避 800ms）：首次 500、二次 200 → ok:true 且请求 2 次");
    }

    // ---------- 10. 靓号换算 ----------
    {
        const vipModule = loadModule({
            exParseRealRid: () => "796449",
            window: { location: { pathname: "/15000" } },
        });
        const vipResult = await vipModule.api.room("15000");
        assert.strictEqual(vipResult.ok, true);
        assert.strictEqual(vipResult.room.rid, "796449", "当前页是靓号 15000 → 必须换算出真实 room_id");
        assert.strictEqual(vipResult.room.requestedRid, "15000");
        assert.ok(vipModule.requests[0].url.indexOf("/betard/796449") !== -1, "请求必须打真实 room_id");
        assert.ok(vipModule.requests[0].url.indexOf("15000") === -1, "绝不能拿展示短号去请求");

        // 给**别的**房间补档案：exParseRealRid 读的是当前页，绝不能串号
        const otherModule = loadModule({
            exParseRealRid: () => "796449",
            window: { location: { pathname: "/15000" } },
        });
        const otherResult = await otherModule.api.room("888888");
        assert.strictEqual(otherResult.room.rid, "888888", "查别房时必须用传入 rid，不许套用当前页换算值");
        assert.ok(otherModule.requests[0].url.indexOf("/betard/888888") !== -1);

        // 没有 exParseRealRid（Node / 非油猴环境）直接用传入 rid
        const plainModule = loadModule({});
        const plainResult = await plainModule.api.room("15000");
        assert.strictEqual(plainResult.room.rid, "15000");
        ok("靓号：仅当传入 rid 等于当前页展示号时才用 exParseRealRid 换算，别房不串号；无该函数时直用传入值");
    }

    // ---------- 11. clearCache ----------
    {
        const module = loadModule({});
        await module.api.room(ROOM_RID);
        await module.api.primeGifts(ROOM_RID);
        assert.strictEqual(module.api.giftPrice(20004).priceCents, 50000);

        module.api.clearCache();
        assert.strictEqual(module.api.giftPrice(20004), null, "clearCache 清空内存价目表（持久表另算）");
        await module.api.room(ROOM_RID);
        assert.strictEqual(countKind(module.requests, "betard"), 2, "clearCache 后必须重新取房间元数据");
        await module.api.primeGifts(ROOM_RID);
        assert.strictEqual(countKind(module.requests, "gifts"), 2, "clearCache 后必须重新拉价目（时间戳也清了）");
        assert.strictEqual(module.api.giftPrice(20004).priceCents, 50000);
        ok("clearCache()：房间缓存与价目时间戳一并失效，之后调用重新请求");
    }

    // ---------- 12. 价目 7 天缓存 ----------
    {
        const module = loadModule({});
        await module.api.primeGifts(ROOM_RID);
        await module.api.primeGifts(ROOM_RID);
        assert.strictEqual(countKind(module.requests, "gifts"), 1, "7 天内不该重复拉价目表");
        assert.strictEqual(module.api.defaults.giftTtlMs, 7 * 24 * 60 * 60 * 1000, "价目 TTL 必须是 7 天");

        // 同 rid 并发合并
        const concurrent = loadModule({});
        await Promise.all([concurrent.api.primeGifts(ROOM_RID), concurrent.api.primeGifts(ROOM_RID)]);
        assert.strictEqual(countKind(concurrent.requests, "gifts"), 1, "并发拉价目必须合并成一次");
        ok("primeGifts 按 rid 记 7 天 + 并发合并：重复/并发调用都只拉一次");
    }

    // ---------- 13. GM 不存在 → 退化 fetch ----------
    {
        const module = loadModule({ noGm: true });
        const result = await module.api.room(ROOM_RID);
        assert.strictEqual(result.ok, true, "没有 GM_xmlhttpRequest 时必须退化 fetch 把事办成");
        assert.strictEqual(result.room.fans, FANS_FROM_H5ROOM);
        assert.strictEqual(module.requests.length, 0, "GM 不存在时一张 GM 请求都不该发");
        assert.strictEqual(module.fetchCalls.length, 2, "betard + h5room 各一次 fetch");

        const primed = await module.api.primeGifts(ROOM_RID);
        assert.strictEqual(primed.ok, true);
        assert.strictEqual(primed.count, 64);
        ok("GM_xmlhttpRequest 不存在 → 退化 fetch，三段接口照样跑通");
    }

    // ---------- 14. refreshIfStale ----------
    {
        const module = loadModule({});
        await module.api.room(ROOM_RID);
        assert.strictEqual(countKind(module.requests, "betard"), 1);

        const fresh = await module.api.refreshIfStale(30 * 60 * 1000);
        assert.strictEqual(fresh.ok, true);
        assert.deepStrictEqual(fresh.refreshed, [], "未过期不该刷新");
        assert.strictEqual(countKind(module.requests, "betard"), 1, "未过期不该产生请求");

        const stale = await module.api.refreshIfStale(0);
        assert.strictEqual(stale.ok, true);
        assert.deepStrictEqual(stale.refreshed, [ROOM_RID], "maxAge=0 时全部视为过期");
        assert.strictEqual(countKind(module.requests, "betard"), 2, "过期必须真的重取");

        const noCache = loadModule({});
        const empty = await noCache.api.refreshIfStale(1000);
        assert.deepStrictEqual(empty, { ok: true, refreshed: [], dropped: [], failed: [] }, "空缓存直接回空结果");
        ok("refreshIfStale：未过期不动、过期重取、空缓存回 {ok:true, refreshed:[]}");
    }

    // ---------- 15. 异常输入 ----------
    {
        const module = loadModule({});
        const emptyRid = await module.api.room("");
        assert.strictEqual(emptyRid.ok, false);
        assert.strictEqual(emptyRid.reason, "bad-arg");
        const nullRid = await module.api.room(null);
        assert.strictEqual(nullRid.reason, "bad-arg");
        assert.strictEqual(module.requests.length, 0, "非法 rid 不该发任何请求");
        const emptyPrime = await module.api.primeGifts(undefined);
        assert.strictEqual(emptyPrime.ok, false);
        assert.strictEqual(emptyPrime.reason, "bad-arg");

        const parseModule = loadModule({
            plan: (url) => (urlKind(url) === "betard" ? { reason: "parse" } : defaultPlan(url)),
        });
        const parseResult = await parseModule.api.room(ROOM_RID);
        assert.strictEqual(parseResult.ok, false);
        assert.strictEqual(parseResult.reason, "betard-parse", "非 JSON 响应该报 parse");

        const timeoutModule = loadModule({
            plan: (url) => (urlKind(url) === "gifts" ? { reason: "timeout" } : defaultPlan(url)),
        });
        const timeoutPrime = await timeoutModule.api.primeGifts(ROOM_RID);
        assert.strictEqual(timeoutPrime.ok, false);
        assert.strictEqual(timeoutPrime.reason, "gifts-timeout", "超时必须如实报 gifts-timeout");
        assert.strictEqual(timeoutPrime.count, 0);

        const shapeModule = loadModule({
            plan: (url) => (urlKind(url) === "gifts" ? { body: { data: { giftList: "not-an-array" } } } : defaultPlan(url)),
        });
        const shapePrime = await shapeModule.api.primeGifts(ROOM_RID);
        assert.strictEqual(shapePrime.ok, false);
        assert.strictEqual(shapePrime.reason, "gifts-shape");
        ok("异常输入：空 rid → bad-arg（零请求）、betard-parse / gifts-timeout / gifts-shape 各自如实上报");
    }

    // ---------- 16. 纯内存表跨调用 + 无 GM 无 fetch 的极端环境 ----------
    {
        const module = loadModule({ dbSeed: { "gifts:v1": { "20004": { name: "火箭", priceCents: 50000, priceType: "YUCHI" }, _updatedAt: 1 } } });
        // 没拉过价目表，但持久表里已有：先内存、再 ArchiveDB
        assert.strictEqual(module.api.giftPrice(20004).priceCents, 50000, "内存没有时必须回落到 ArchiveDB 持久表");
        assert.strictEqual(module.api.giftPrice("20004").name, "火箭");
        assert.strictEqual(module.requests.length, 0, "读持久表不该发请求");
        ok("giftPrice 先内存、再 ArchiveDB.getMeta('gifts:v1')：冷启动也能立刻查价");
    }

    console.log(`\n=== 房间元数据 + 礼物价目专项测试全部通过（${passed} 项） ===`);
}

run().then(() => process.exit(0)).catch((error) => {
    console.error("\n✗ 测试失败:", error && error.message);
    if (error && error.stack) console.error(error.stack.split("\n").slice(1, 4).join("\n"));
    process.exit(1);
});
