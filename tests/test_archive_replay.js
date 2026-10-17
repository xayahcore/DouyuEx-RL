/**
 * 回放弹幕反查专项测试（DanmakuArchive_Replay.js）
 *
 * 不连网：把 GM_xmlhttpRequest 换成桩，按 URL 三段（betard / authorShowVideoList /
 * getBarrageListByPage）返回构造好的假响应，逐条核对实测报告里踩过的坑。
 *
 * 覆盖：
 *   1. 正常链路：1 场次 + 2 页弹幕（第二页走 pre 游标）→ 过滤目标 uid、sts 升序、sampled:true
 *   2. 分页方向：next 回第一页重复数据、pre 回新数据 → 必须只用 pre（结果无重复、请求次数对得上）
 *   3. 异常：betard 500（重试 1 次后 ok:false，不抛）/ up_id 缺失 / 参数非法 / 场次清单解析失败
 *   4. maxPages 上限：给 20 页只取 3 页 → truncated:true 且请求次数符合预期
 *   5. 日期窗口：本地时区 00:00 换日 → start_time / end_time 秒值精确
 *   6. up_id 30 分钟内存缓存 + clearCache
 *   7. 进度回调：每页回调一次，回调抛错不得拖垮链路
 */

const fs = require("fs");
const path = require("path");
const assert = require("assert");

const SRC_PATH = path.join(__dirname, "../src/packages/DanmakuArchive/DanmakuArchive_Replay.js");

const TARGET_UID = "499514170";     // 被测的目标用户（回放弹幕里的 uid 数字/字符串都可能）
const ROOM_RID = "9263298";         // 实测样本房间：若若跑的贼快
const UP_ID = "z97JRz0peX7k";       // 实测 betard.room.up_id（≠ uid）
const HASH_ID = "Yo4evyG9KLxM8L62"; // 实测场次 hash_id

/* ---------------- 载入被测源码（真实源码 + GM 桩） ---------------- */

function loadModule(options) {
    const settings = options || {};
    const requests = [];
    const progress = [];
    const host = {};
    if (typeof settings.progress === "function") host.archiveOnProgress = settings.progress;

    const GM_xmlhttpRequest = (request) => {
        requests.push(request);
        if (settings.neverRespond) return;
        const plan = settings.plan(request.url, requests.length) || { reason: "http", status: 404 };
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

    // 模块是 ES5 纯函数集合，只依赖这几个宿主能力，用 Function 注入即可（无需 jsdom）。
    const factory = new Function(
        "GM_xmlhttpRequest", "window", "setTimeout",
        fs.readFileSync(SRC_PATH, "utf8") + "\nreturn ArchiveReplay;"
    );
    const api = factory(GM_xmlhttpRequest, host, setTimeout);
    return { api, requests, progress, host };
}

/* ---------------- URL / 假响应小工具 ---------------- */

function urlKind(url) {
    if (url.indexOf("/betard/") !== -1) return "betard";
    if (url.indexOf("authorShowVideoList") !== -1) return "shows";
    if (url.indexOf("getBarrageListByPage") !== -1) return "barrage";
    return "unknown";
}

function queryParam(url, name) {
    const matched = new RegExp("[?&]" + name + "=([^&]*)").exec(url);
    return matched ? decodeURIComponent(matched[1]) : null;
}

function countKind(requests, kind) {
    return requests.filter((request) => urlKind(request.url) === kind).length;
}

function barrageOffsets(requests) {
    return requests
        .filter((request) => urlKind(request.url) === "barrage")
        .map((request) => queryParam(request.url, "offset"));
}

function betardBody() {
    return { room: { up_id: UP_ID, owner_uid: "1234567", nickname: "若若跑的贼快", show_status: 2 } };
}

function showListBody(hashIds) {
    return {
        data: {
            count: hashIds.length,
            list: hashIds.map((hashId, index) => ({
                show_id: 437471495 + index,
                date_format: "10-16",
                time_format: "23:18",
                time: "2026-10-16 23点场",
                replay_duration: "01:27:50",
                video_list: [{ hash_id: hashId, type1: 5, start_time: 1792163885, video_str_duration: "1:27:50" }],
            })),
        },
    };
}

/** 一条回放弹幕，字段名照 getBarrageListByPage 的实测返回（uid/nn/ctt/sts/sid/mid）。 */
function barrageItem(index, sid, uid, sts, text) {
    return {
        col: 0, ctt: text, ft: 0, mid: "mid-" + sid, mtype: 0, nn: "用户" + uid,
        rl: 0, sts: sts, tl: index * 1000, uid: uid, v: 3, vid: "45590081", sid: sid, lnum: 0,
    };
}

/** 造 count 条无关弹幕（uid 互不相同，保证不会被目标 uid 过滤器收进来）。 */
function fillerItems(pageTag, count, baseUid, baseSts) {
    const items = [];
    for (let index = 0; index < count; index++) {
        items.push(barrageItem(index, pageTag + "-" + index, String(baseUid + index),
            baseSts + index, "[" + pageTag + "] " + index));
    }
    return items;
}

/** 统一底座 plan：betard / 场次清单正常，弹幕页交给 barragePlan(offset)。 */
function makePlan(barragePlan, hashIds) {
    const hashList = hashIds || [HASH_ID];
    return (url) => {
        const kind = urlKind(url);
        if (kind === "betard") return { body: betardBody() };
        if (kind === "shows") return { body: showListBody(hashList) };
        if (kind === "barrage") return barragePlan(queryParam(url, "offset"));
        return { reason: "http", status: 404 };
    };
}

let passed = 0;
function ok(name) {
    passed++;
    console.log("  ✓ " + name);
}

/* ---------------- 测试正文 ---------------- */

async function run() {
    console.log("=== 正在运行回放弹幕反查专项单元测试（真实源码 + 三段接口桩） ===\n");

    assert.ok(fs.existsSync(SRC_PATH), "被测源码必须存在：" + SRC_PATH);

    // ---------- 1. 正常链路：1 场次 / 2 页 / pre 游标 ----------
    {
        const LATER_STS = 1792166943;
        const EARLIER_STS = 1792165000;
        const PRE_OF_PAGE_ONE = "1792175262039000";
        const NEXT_OF_PAGE_ONE = "1792175264250000";

        const pageOne = fillerItems("alpha", 100, 700000, LATER_STS);
        // 第一页里目标弹幕的 sts 更大：最终结果必须整体升序，而不是按"抓取顺序"堆叠
        pageOne[97] = barrageItem(97, "alpha-target", TARGET_UID, LATER_STS, "回放里的后一句");

        const pageTwo = fillerItems("beta", 37, 800000, EARLIER_STS);
        pageTwo[5] = barrageItem(5, "beta-target", TARGET_UID, EARLIER_STS, "回放里的前一句");

        const module = loadModule({
            plan: makePlan((offset) => {
                if (offset === "0") {
                    return { body: { data: { count: 100, next: NEXT_OF_PAGE_ONE, pre: PRE_OF_PAGE_ONE, list: pageOne } } };
                }
                if (offset === PRE_OF_PAGE_ONE) {
                    return { body: { data: { count: 37, next: "", pre: "", list: pageTwo } } };
                }
                return { reason: "http", status: 404 };
            }),
        });
        const result = await module.api.queryUserHistory(TARGET_UID, ROOM_RID, {
            fromDayKey: "2026-10-16", toDayKey: "2026-10-16",
        });

        assert.strictEqual(result.ok, true, "正常链路必须 ok:true");
        assert.strictEqual(result.items.length, 2, "应只保留目标 uid 的 2 条弹幕");
        assert.strictEqual(result.pages, 2, "应实际翻了 2 页弹幕");
        assert.strictEqual(result.truncated, false, "条数自然用尽不算截断");
        assert.strictEqual(result.sampled, true, "回放库疑似抽样，结果必须恒带 sampled:true");

        assert.ok(result.items[0].ts < result.items[1].ts, "items 必须按 sts 升序");
        assert.strictEqual(result.items[0].ts, EARLIER_STS * 1000, "sts(秒) 必须换算成毫秒 ts");
        assert.strictEqual(result.items[0].txt, "回放里的前一句", "最早那条应排在首位");
        assert.strictEqual(result.items[1].txt, "回放里的后一句");
        assert.strictEqual(result.items[0].uid, TARGET_UID, "uid 必须字符串化后原样返回");
        assert.strictEqual(result.items[0].rid, ROOM_RID, "每条都要带查询用的 rid");
        assert.deepStrictEqual(Object.keys(result.items[0]).sort(), ["nn", "rid", "ts", "txt", "uid"],
            "对外形状只能是契约里的五个字段，不能漏内部去重键");
        ok("正常链路：1 场次 2 页弹幕 → 过滤目标 uid、sts 升序（秒转毫秒）、sampled:true");

        const offsets = barrageOffsets(module.requests);
        assert.deepStrictEqual(offsets, ["0", PRE_OF_PAGE_ONE],
            "第二页必须用上一页的 data.pre 当 offset，实际：" + JSON.stringify(offsets));
        assert.strictEqual(countKind(module.requests, "betard"), 1, "up_id 只取一次");
        ok("翻页游标取自 data.pre（第二页 offset = 第一页的 pre）");
    }

    // ---------- 2. 分页方向：next 回重复、pre 回新数据 → 只准用 pre ----------
    {
        const PRE_OF_PAGE_ONE = "1844100000000001";
        const NEXT_OF_PAGE_ONE = "1844200000000002";
        const PRE_OF_PAGE_TWO = "1844300000000003";

        const firstPage = fillerItems("dup", 100, 500000, 1792167000);
        firstPage[10] = barrageItem(10, "dup-target-a", TARGET_UID, 1792167010, "首屏-目标A");
        firstPage[20] = barrageItem(20, "dup-target-b", TARGET_UID, 1792167020, "首屏-目标B");

        const secondPage = fillerItems("fresh", 45, 600000, 1792168000);
        secondPage[7] = barrageItem(7, "fresh-target", TARGET_UID, 1792168007, "二屏-目标C");

        const module = loadModule({
            plan: makePlan((offset) => {
                // 陷阱复刻：沿 next 走会拿回和第一页一模一样的 100 条（实测 600 条只有 105 条唯一）
                if (offset === "0" || offset === NEXT_OF_PAGE_ONE) {
                    return {
                        body: {
                            data: {
                                count: 100,
                                next: offset === "0" ? NEXT_OF_PAGE_ONE : PRE_OF_PAGE_TWO,
                                pre: PRE_OF_PAGE_ONE,
                                list: firstPage,
                            },
                        },
                    };
                }
                if (offset === PRE_OF_PAGE_ONE) {
                    return { body: { data: { count: 45, next: "", pre: "", list: secondPage } } };
                }
                return { reason: "http", status: 404 };
            }),
        });

        const result = await module.api.queryUserHistory(TARGET_UID, ROOM_RID, {});

        assert.strictEqual(result.ok, true);
        assert.strictEqual(result.items.length, 3, "两页各命中目标用户 2+1 条，不得出现 next 造成的重复");
        const distinctTexts = result.items.map((item) => item.txt);
        assert.strictEqual(new Set(distinctTexts).size, 3, "结果不得有重复弹幕：" + JSON.stringify(distinctTexts));
        ok("分页方向：pre 链两页得 3 条目标弹幕且全唯一（next 的重复数据一条没进来）");

        const offsets = barrageOffsets(module.requests);
        assert.deepStrictEqual(offsets, ["0", PRE_OF_PAGE_ONE],
            "只准用 pre 翻页，实际请求的 offset：" + JSON.stringify(offsets));
        assert.strictEqual(offsets.indexOf(NEXT_OF_PAGE_ONE), -1, "next 游标绝不允许被当成分页游标");
        assert.strictEqual(countKind(module.requests, "barrage"), 2, "翻页方向错会导致请求次数虚高");
        assert.strictEqual(result.pages, 2);
        ok("只发了 2 次弹幕请求，且 next 游标一次都没出现在请求里");
    }

    // ---------- 3. 异常路径：一律 ok:false，不抛 ----------
    {
        // 3.1 betard 500
        const module500 = loadModule({ plan: () => ({ reason: "http", status: 500 }) });
        let threw = false;
        let result = null;
        try {
            result = await module500.api.queryUserHistory(TARGET_UID, ROOM_RID, {});
        } catch (error) {
            threw = true;
        }
        assert.strictEqual(threw, false, "接口 500 也必须 resolve，不能抛异常");
        assert.strictEqual(result.ok, false, "betard 500 应返回 ok:false");
        assert.strictEqual(result.reason, "betard-http", "reason 应指明失败环节与类型");
        assert.deepStrictEqual(result.items, [], "失败时不得返回半截数据");
        assert.strictEqual(result.sampled, true, "失败结果同样带 sampled 标记，UI 不会误读");
        assert.strictEqual(module500.requests.length, 2, "HTTP 失败必须且只能重试 1 次");
        ok("betard 500 → {ok:false, reason:'betard-http'}，重试 1 次后放弃且不抛异常");

        // 3.2 up_id 缺失（接口 200 但没有 up_id 字段）
        const moduleNoUpId = loadModule({
            plan: () => ({ body: { room: { nickname: "若若跑的贼快", show_status: 2 } } }),
        });
        result = await moduleNoUpId.api.queryUserHistory(TARGET_UID, ROOM_RID, {});
        assert.strictEqual(result.ok, false, "拿不到 up_id 必须 ok:false");
        assert.strictEqual(result.reason, "no-up-id", "reason 必须是 no-up-id，便于 UI 区分「无回放」与「网络故障」");
        assert.strictEqual(moduleNoUpId.requests.length, 1, "字段缺失不是网络错误，不该重试");
        ok("betard 200 但缺 up_id → {ok:false, reason:'no-up-id'}，不做无意义重试");

        // 3.3 参数非法（uid 空）
        const moduleBadArg = loadModule({ plan: () => ({ reason: "http", status: 500 }) });
        result = await moduleBadArg.api.queryUserHistory("", ROOM_RID, {});
        assert.strictEqual(result.ok, false);
        assert.strictEqual(result.reason, "bad-arg");
        assert.strictEqual(moduleBadArg.requests.length, 0, "参数非法时一个请求都不该发");
        ok("uid 为空 → {ok:false, reason:'bad-arg'}，零请求");

        // 3.4 场次清单返回非 JSON
        const moduleBadJson = loadModule({
            plan: (url) => (urlKind(url) === "betard" ? { body: betardBody() } : { reason: "parse" }),
        });
        result = await moduleBadJson.api.queryUserHistory(TARGET_UID, ROOM_RID, {});
        assert.strictEqual(result.ok, false);
        assert.strictEqual(result.reason, "shows-parse");
        assert.strictEqual(moduleBadJson.requests.length, 3, "betard 1 次 + 场次清单失败重试 1 次（共 2 次）");
        ok("场次清单返回 HTML → {ok:false, reason:'shows-parse'}（解析失败同样只重试 1 次）");
    }

    // ---------- 4. maxPages 硬上限：给 20 页只取 3 页 ----------
    {
        const module = loadModule({
            plan: makePlan((offset) => {
                const pageIndex = offset === "0" ? 0 : Number(String(offset).replace("cursor-", ""));
                const items = fillerItems("pg" + pageIndex, 100, 300000 + pageIndex * 1000,
                    1792169000 + pageIndex * 100);
                if (pageIndex === 1) items[0] = barrageItem(0, "pg1-target", TARGET_UID, 1792169100, "第二页的目标弹幕");
                // 每页都是满 100 条 + 有新 pre 游标 = 永远「还有下一页」（共 20 页可用）
                return {
                    body: {
                        data: {
                            count: 100,
                            next: "next-" + pageIndex,
                            pre: "cursor-" + (pageIndex + 1),
                            list: items,
                        },
                    },
                };
            }, ["truncate-video"]),
        });

        const result = await module.api.queryUserHistory(TARGET_UID, ROOM_RID, { maxPages: 3 });

        assert.strictEqual(result.ok, true, "被截断不等于失败，仍应 ok:true 并把已拿到的数据给出去");
        assert.strictEqual(result.truncated, true, "预算用尽且还有下一页时必须标注 truncated:true");
        assert.strictEqual(result.pages, 3, "只准翻 maxPages=3 页");
        assert.strictEqual(result.items.length, 1, "已抓到的页里命中的目标弹幕照常返回");
        const offsets = barrageOffsets(module.requests);
        assert.deepStrictEqual(offsets, ["0", "cursor-1", "cursor-2"], "第 4 页绝不允许发出去");
        assert.strictEqual(offsets.filter((item) => String(item).indexOf("next-") === 0).length, 0,
            "next 游标不得出现在请求里");
        assert.strictEqual(module.requests.length, 5,
            "预期请求数 = betard 1 + 场次清单 1 + 弹幕 3 = 5，实际 " + module.requests.length);
        ok("maxPages=3：只翻 3 页（共 5 次请求）、truncated:true，第 4 页一次都没请求");
    }

    // ---------- 5. 日期窗口：本地时区 00:00 换日 ----------
    {
        const module = loadModule({ plan: makePlan(() => ({ reason: "http", status: 404 }), []) });
        const result = await module.api.queryUserHistory(TARGET_UID, ROOM_RID, {
            fromDayKey: "2026-10-16", toDayKey: "2026-10-17",
        });

        assert.strictEqual(result.ok, true, "窗口内没有回放场次应 ok:true + 空列表，而不是失败");
        assert.deepStrictEqual(result.items, []);
        assert.strictEqual(result.pages, 0);
        assert.strictEqual(result.truncated, false);
        assert.strictEqual(result.hasGiftStream, false, "回放只有弹幕没有礼物，必须如实告知");
        assert.strictEqual(result.giftPriceModeIgnored, undefined, "未要求礼物口径时不得出现该标记");
        ok("窗口内零场次 → {ok:true, items:[], pages:0}（无回放不算错误，且声明无礼物流）");

        // 回放不含礼物：即使调用方要求礼物口径，也只如实降级，绝不造假礼物行
        const giftModeResult = await module.api.queryUserHistory(TARGET_UID, ROOM_RID, {
            fromDayKey: "2026-10-16", toDayKey: "2026-10-17", giftPriceMode: true,
        });
        assert.strictEqual(giftModeResult.ok, true);
        assert.strictEqual(giftModeResult.giftPriceModeIgnored, true,
            "回放无礼物事件，giftPriceMode:true 必须显式标记为被忽略");
        assert.strictEqual(giftModeResult.hasGiftStream, false);
        assert.deepStrictEqual(giftModeResult.items, [], "不得凭空造出礼物条目");
        ok("giftPriceMode:true → 不造假礼物行，只回 giftPriceModeIgnored:true");

        const showsUrl = module.requests.filter((request) => urlKind(request.url) === "shows")[0].url;
        const startTime = Number(queryParam(showsUrl, "start_time"));
        const endTime = Number(queryParam(showsUrl, "end_time"));
        assert.strictEqual(startTime, Math.floor(new Date(2026, 9, 16, 0, 0, 0, 0).getTime() / 1000),
            "start_time 必须是 fromDayKey 当天本地 00:00:00 的秒值");
        assert.strictEqual(endTime, Math.floor(new Date(2026, 9, 18, 0, 0, 0, 0).getTime() / 1000),
            "end_time 必须是 toDayKey 次日本地 00:00:00（含 toDayKey 全天）");
        assert.strictEqual(endTime - startTime, 2 * 86400, "两天窗口应恰好 172800 秒");
        assert.strictEqual(new Date(startTime * 1000).getHours(), 0, "窗口起点必须落在本地 00:00 整");
        assert.strictEqual(new Date(endTime * 1000).getHours(), 0, "窗口终点必须落在本地 00:00 整");
        assert.strictEqual(new Date(startTime * 1000).getDate(), 16, "起点日期必须是 16 号");
        assert.ok(showsUrl.indexOf("up_id=" + UP_ID) !== -1, "场次清单必须带 up_id（不是 uid）");
        assert.ok(showsUrl.indexOf("uid=" + TARGET_UID) === -1, "绝不能拿 uid 当 up_id 用");
        assert.strictEqual(queryParam(showsUrl, "page"), "1");
        assert.strictEqual(queryParam(showsUrl, "limit"), "20");
        ok("日期窗口：本地 00:00 换日，start_time/end_time 精确（两天 = 172800 秒）、只带 up_id 不带 uid");

        // 直接单测换算函数
        const singleDay = module.api.dayKeyToUnixRange("2026-10-16", "2026-10-16");
        assert.strictEqual(singleDay.ok, true);
        assert.strictEqual(singleDay.endTime - singleDay.startTime, 86400, "同一天窗口应覆盖该日全天 86400 秒");

        const forward = module.api.dayKeyToUnixRange("2026-10-16", "2026-10-18");
        const reversed = module.api.dayKeyToUnixRange("2026-10-18", "2026-10-16");
        assert.deepStrictEqual(reversed, forward, "起止颠倒时自动交换，结果与正序完全一致");
        assert.strictEqual(forward.endTime - forward.startTime, 3 * 86400, "16→18 是三天窗口");

        const noWindow = module.api.dayKeyToUnixRange(null, null);
        assert.deepStrictEqual(noWindow, { ok: true, startTime: null, endTime: null }, "不给日期就是不限日期");

        const badDate = module.api.dayKeyToUnixRange("2026-13-01", null);
        assert.strictEqual(badDate.ok, false);
        assert.strictEqual(badDate.reason, "bad-date", "非法日期必须明确报 bad-date");

        const overflowDate = module.api.dayKeyToUnixRange("2026-02-31", null);
        assert.strictEqual(overflowDate.ok, false, "2 月 31 日不得被 Date 静默滚成 3 月");
        ok("日期换算函数：单日 86400、起止颠倒自动交换、缺省为不限、非法日期 bad-date");
    }

    // ---------- 6. up_id 30 分钟缓存 ----------
    {
        const module = loadModule({ plan: makePlan(() => ({ reason: "http", status: 404 }), []) });
        await module.api.queryUserHistory(TARGET_UID, ROOM_RID, {});
        await module.api.queryUserHistory(TARGET_UID, ROOM_RID, undefined);
        assert.strictEqual(countKind(module.requests, "betard"), 1,
            "up_id 必须在内存里缓存 30 分钟，第二次查询不该再打 betard");
        assert.strictEqual(typeof module.api.defaults.upIdTtlMs, "number");
        assert.strictEqual(module.api.defaults.upIdTtlMs, 30 * 60 * 1000, "缓存 TTL 必须是 30 分钟");
        ok("up_id 30 分钟内存缓存：连续两次查询只取一次 betard（opts 省略也能跑）");

        module.api.clearCache();
        await module.api.queryUserHistory(TARGET_UID, ROOM_RID, {});
        assert.strictEqual(countKind(module.requests, "betard"), 2, "clearCache 后必须重新取 up_id");
        ok("clearCache 生效：清缓存后重新请求 betard");
    }

    // ---------- 7. 进度回调（存在才调，抛错不得拖垮链路） ----------
    {
        const events = [];
        const module = loadModule({
            progress: (info) => { events.push(info); },
            plan: makePlan((offset) => {
                if (offset === "0") return { body: { data: { count: 0, pre: "", list: [] } } };
                return { reason: "http", status: 404 };
            }),
        });
        const result = await module.api.queryUserHistory(TARGET_UID, ROOM_RID, {});
        assert.strictEqual(result.ok, true);
        const stages = events.map((info) => info.stage);
        assert.ok(stages.indexOf("upid") !== -1, "应回调 up_id 阶段进度，实际：" + JSON.stringify(stages));
        assert.ok(stages.indexOf("shows") !== -1, "应回调场次清单阶段进度");
        const barrageEvents = events.filter((info) => info.stage === "barrage");
        assert.strictEqual(barrageEvents.length, 1, "每页弹幕回调一次进度");
        assert.strictEqual(barrageEvents[0].page, 1);
        assert.strictEqual(barrageEvents[0].got, 0, "got 是这一页收到的原始条数（空页为 0）");
        ok("window.archiveOnProgress 每页回调一次 {stage,page,got}");

        const throwing = loadModule({
            progress: () => { throw new Error("UI 炸了"); },
            plan: makePlan(() => ({ reason: "http", status: 404 }), []),
        });
        const throwingResult = await throwing.api.queryUserHistory(TARGET_UID, ROOM_RID, {});
        assert.strictEqual(throwingResult.ok, true, "进度回调抛错绝不能污染数据链路");

        const silent = loadModule({ plan: makePlan(() => ({ reason: "http", status: 404 }), []) });
        const silentResult = await silent.api.queryUserHistory(TARGET_UID, ROOM_RID, {});
        assert.strictEqual(silentResult.ok, true, "没有 archiveOnProgress 时必须照常跑");
        ok("进度回调抛异常被吞掉、回调不存在也照常查询");
    }

    console.log(`\n=== 回放弹幕反查专项测试全部通过（${passed} 项） ===`);
}

run().then(() => process.exit(0)).catch((error) => {
    console.error("\n✗ 测试失败:", error && error.message);
    if (error && error.stack) console.error(error.stack.split("\n").slice(1, 4).join("\n"));
    process.exit(1);
});
