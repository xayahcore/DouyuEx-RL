/**
 * tests/test_archive_ingest.js — P0「本地弹幕档案」采集入库（ArchiveIngest）单元测试
 *
 * 被测对象：src/packages/DanmakuArchive/DanmakuArchive_Ingest.js（+ 真实 ArchiveMetrics）
 * 跑法：node tests/test_archive_ingest.js
 *
 * 用桩替换的外部依赖：ArchiveDB / ArchiveMeta / tap / window / unsafeWindow / document。
 * 喂进来的报文是**实测原文形状**（去掉长尾字段）。
 *
 * 钉死的契约：
 *   ① chatmsg：nn 不被 bnn 抢占、dedupKey 短化为 cid、9 个画像字段不再入库
 *   ② dgb：dedupKey = g|uid|gfid|bcnt，hits/bf/receiveUid 不再入库
 *   ③ uenter 不再写明细，但 enterUv 计数与 dayKey 归属仍然正确
 *   ④ 批写：满 200 条立即 / 500 ms 定时 / visibilitychange→hidden 立即
 *   ⑤ pingreq 只校准时钟，不入库
 *   ⑥ 解析异常不抛，parseErrors / dropped 分别计数
 *   ⑦ tap 解析顺序 unsafeWindow → window → 都没有
 *   ⑧ 价目：ArchiveMeta.giftPrice 同步取值 + primeGifts 预热
 *   ⑨ 房间日聚合口径
 *   ⑩ observedMin（今日口径覆盖率分子）去重
 *   ⑪ observedMin 按 ridDay 独立
 *   ⑫ patch 只能是纯快照（计数/观测分钟/明细计数一律走 deltas）
 *   ⑬ 单次解析：一条报文只建一次字段表（不再每字段一个正则）
 *   ⑭ seen 启动载入：刷新后同一 uid 不再被当成"当日首次"
 *   ⑮ flush 成功后 putSeen 收到新 key（scope / dayKey / uid）
 *   ⑯ upsertRoomDay 串行：同一 ridDay 不交叠
 *   ⑰ uenter：不产生事件但 enterUv +1
 *   ⑱ 明细限额：超限后 chat 抽样，detailSampled=true，而 danmakuCnt 仍按全量 +1
 */

const fs = require("fs");
const path = require("path");
const assert = require("assert");

const INGEST_PATH = path.join(__dirname, "../src/packages/DanmakuArchive/DanmakuArchive_Ingest.js");
const METRICS_PATH = path.join(__dirname, "../src/packages/DanmakuArchive/DanmakuArchive_Metrics.js");

/* ---------- 实测报文样本（Lead 提供的真实形状） ---------- */

const CHAT_SAMPLE = "type@=chatmsg/rid@=9263298/ct@=1/uid@=158637286/nn@=二I六/txt@=1/cid@=304a0713aaaa/cst@=1792202447034/level@=45/bl@=26/bnn@=小僵尸/brid@=71415/ic@=avatar_v3@S202606@S3eb/";
const GIFT_SAMPLE = "type@=dgb/rid@=9263298/uid@=123456/nn@=大哥/gfid@=268/gfn@=办卡/gfcnt@=6/hits@=6/bcnt@=3/bg@=0/bf@=1/receive_uid@=9999/";
const ENTER_SAMPLE = "type@=uenter/rid@=9263298/uid@=777/nn@=路人/level@=12/";
const PING_SAMPLE = "type@=pingreq/tick@=1792202447000/";
// 贵宾数采集已下线：这条样本现在用来验证"收到也不认"（不解析、不入库、不计观测分钟）
const NOBLE_SAMPLE = "type@=oni/vn@=371/rid@=9263298/list@=num@AA=3@ASsl@AA=20@AS/un@=8203/";

/*
 * 高能弹幕（comm_chatmsg）：内层 chatmsg 是**双重转义**的 STT
 *   inner:  type@=chatmsg/rid@=9263298/uid@=555/nn@=小帅/txt@=高能来了/cst@=1792202447034/
 *   编码:   @ → @AA，/ → @AS          （F-付费消息字段 §3.1）
 */
const COMM_CHAT_SAMPLE = "type@=comm_chatmsg/chatmsg@=type@AA=chatmsg@ASrid@AA=9263298@ASuid@AA=555@ASnn@AA=小帅@AStxt@AA=高能来了@AScst@AA=1792202447034@AS/cmgType@=1/cprice@=1000/crealPrice@=1000/cet@=5/vrid@=v123/";
// 道具券免费：crealPrice=0（明确实付 0 → priceCents=0，绝不回落标价）
const COMM_CHAT_FREE_SAMPLE = "type@=comm_chatmsg/chatmsg@=type@AA=chatmsg@ASrid@AA=9263298@ASuid@AA=555@ASnn@AA=小帅@AStxt@AA=免费高能@AScst@AA=1792202447035@AS/cmgType@=1/cprice@=1000/crealPrice@=0/cet@=5/vrid@=v124/";
// crealPrice 字段**缺失**：才回落 cprice 标价
const COMM_CHAT_NOREAL_SAMPLE = "type@=comm_chatmsg/chatmsg@=type@AA=chatmsg@ASrid@AA=9263298@ASuid@AA=557@ASnn@AA=老哥@AStxt@AA=只给标价@AScst@AA=1792202447036@AS/cmgType@=1/cprice@=1000/cet@=5/vrid@=v125/";
// 钻粉（开通 / 续费）：报文里没有金额字段，只有 mn（月数）
const DF_OPEN_SAMPLE = "type@=dfobc/rid@=9263298/uid@=666/nick@=钻粉哥/mn@=3/cdays@=10/rnick@=主播/";
const DF_RENEW_SAMPLE = "type@=dfrbc/rid@=9263298/uid@=667/nick@=续费哥/mn@=1/cdays@=40/rnick@=主播/";
// mn 缺失：月数不明 → 按 1 个月计 + 打 priceUnknown
const DF_NO_MN_SAMPLE = "type@=dfobc/rid@=9263298/uid@=668/nick@=月数不明/cdays@=1/";
// 年钻（12 个月）
const DF_YEAR_SAMPLE = "type@=dfobc/rid@=9263298/uid@=669/nick@=年钻哥/mn@=12/cdays@=300/";
// 道具订单：带实付价，但没有任何 uid（只有 user_name）
const PROP_ORDER_SAMPLE = "type@=prop_order_finish/rid@=9263298/user_name@=凡凡阿冬/goods_id@=1671413/price@=7900/org_price@=9900/order_type@=1/type@=prop_order_finish/";

const BASE_TS = 1792202447034;

function chatPacket(index) {
    return chatPacketAt(index, BASE_TS);
}

function chatPacketAt(index, cst) {
    return chatPacketWithRid(index, cst, "9263298");
}

function chatPacketWithRid(index, cst, ridText) {
    return "type@=chatmsg/rid@=" + ridText + "/ct@=1/uid@=158637286/nn@=二I六/txt@=第" + index + "条"
        + "/cid@=cid" + index + "/cst@=" + cst + "/level@=45/bl@=26/bnn@=小僵尸/brid@=71415/ic@=avatar_v3@S202606@S3eb/";
}

/* ---------- 环境 ---------- */

function loadMetrics() {
    const source = fs.readFileSync(METRICS_PATH, "utf8");
    const factory = new Function(source + "\nreturn ArchiveMetrics;");
    return factory();
}

function createTap() {
    const subs = new Set();
    return {
        subs: subs,
        on(fn) {
            if (typeof fn === "function") subs.add(fn);
            return fn;
        },
        off(fn) {
            subs.delete(fn);
        },
        emit(type, raw) {
            subs.forEach((fn) => {
                try {
                    fn(type, raw);
                } catch (error) { }
            });
        },
    };
}

function makeEnv(options) {
    const opts = options || {};
    const writtenBatches = [];
    const roomDayWrites = [];
    const seenWrites = [];
    const commitBatches = [];
    let seenCallCount = 0;
    const userWrites = [];
    const primeCalls = [];
    const metaWrites = {};
    const listeners = {};
    const sandboxTap = createTap();
    const upsertRecords = { order: [], inFlight: 0, maxInFlight: 0, seq: 0 };

    const windowStub = { __douyuExTap: opts.noWindowTap ? undefined : sandboxTap };
    let unsafeWindowStub = opts.unsafeWindowTap === undefined ? undefined : opts.unsafeWindowTap;
    if (opts.giftTable) {
        // 页面全局礼物表桩：DataCenter.global.get("$GIFT_ALL_CONFIG")
        unsafeWindowStub = Object.assign({}, unsafeWindowStub || {}, {
            DataCenter: {
                global: {
                    get(key) {
                        return key === "$GIFT_ALL_CONFIG" ? opts.giftTable : null;
                    },
                },
            },
        });
    }

    const ArchiveDB = {
        putEvents(argv) {
            writtenBatches.push({ list: argv.map((item) => Object.assign({}, item)), at: Date.now() });
            if (opts.dbFail) return Promise.resolve({ ok: false, reason: "stub-fail" });
            if (opts.dbThrow) throw new Error("stub putEvents throw");
            return Promise.resolve({ ok: true, added: argv.length, skipped: 0 });
        },
        putSeen(list) {
            seenWrites.push((list || []).map((item) => Object.assign({}, item)));
            seenCallCount += 1;
            if (opts.putSeenNeverResolve) return new Promise(() => { });
            if (opts.putSeenFailTimes && seenCallCount <= opts.putSeenFailTimes) {
                return Promise.reject(new Error("stub putSeen fail"));
            }
            if (opts.putSeenOkFalseOnce && seenCallCount === 1) return Promise.resolve({ ok: false });
            return Promise.resolve({ ok: true });
        },
        getMeta(key) {
            return Promise.resolve(metaWrites[key] === undefined ? 0 : metaWrites[key]);
        },
        setMeta(key, value) {
            metaWrites[key] = value;
            return Promise.resolve({ ok: true });
        },
        putUsers(list) {
            userWrites.push((list || []).map((item) => Object.assign({}, item)));
            return Promise.resolve({ ok: true });
        },
    };
    if (opts.withCommitBatch) {
        ArchiveDB.commitBatch = function (batch) {
            commitBatches.push({
                events: (batch.events || []).map((item) => Object.assign({}, item)),
                seen: (batch.seen || []).map((item) => Object.assign({}, item)),
                roomDays: (batch.roomDays || []).map((item) => ({
                    ridDay: item.ridDay,
                    patch: Object.assign({}, item.roomDay),
                    deltas: Object.assign({}, item.deltas),
                })),
            });
            if (opts.commitBatchFail) return Promise.resolve({ ok: false, reason: "commit-stub-fail" });
            if (opts.commitBatchThrow) throw new Error("stub commitBatch throw");
            const eventCount = (batch.events || []).length;
            return Promise.resolve({
                ok: true,
                added: eventCount,
                skipped: 0,
                seenAdded: (batch.seen || []).length,
                roomDays: (batch.roomDays || []).length,
            });
        };
    }
    if (opts.getSeen) {
        ArchiveDB.getSeen = function (scope, dayKey) {
            const list = opts.getSeen(scope, dayKey);
            const delay = opts.getSeenDelayMs || 0;
            if (opts.getSeenReject) {
                return new Promise((resolve, reject) => {
                    setTimeout(() => reject(new Error("stub getSeen rejected")), delay);
                });
            }
            return new Promise((resolve) => setTimeout(() => resolve(list), delay));
        };
    }
    if (opts.withRoomDay) {
        ArchiveDB.upsertRoomDay = function (ridDay, patch, deltas) {
            upsertRecords.seq += 1;
            const seq = upsertRecords.seq;
            upsertRecords.inFlight += 1;
            if (upsertRecords.inFlight > upsertRecords.maxInFlight) upsertRecords.maxInFlight = upsertRecords.inFlight;
            upsertRecords.order.push("start" + seq);
            roomDayWrites.push({ ridDay: ridDay, rawPatch: patch, deltas: deltas, patch: Object.assign({}, patch, deltas) });
            const delay = opts.upsertDelayMs || 0;
            return new Promise((resolve) => {
                setTimeout(() => {
                    upsertRecords.inFlight -= 1;
                    upsertRecords.order.push("end" + seq);
                    resolve({ ok: true });
                }, delay);
            });
        };
    }

    let ArchiveMeta;
    if (opts.ArchiveMeta === null) {
        ArchiveMeta = undefined;
    } else if (opts.ArchiveMeta) {
        ArchiveMeta = opts.ArchiveMeta;
    } else {
        ArchiveMeta = {
            primeGifts(rid) {
                primeCalls.push(rid);
                return Promise.resolve({ ok: true, count: 3 });
            },
            giftPrice() {
                return null;
            },
        };
    }

    const documentStub = {
        visibilityState: "visible",
        addEventListener(type, fn) {
            if (!listeners[type]) listeners[type] = [];
            listeners[type].push(fn);
        },
        removeEventListener(type, fn) {
            const bucket = listeners[type] || [];
            const at = bucket.indexOf(fn);
            if (at >= 0) bucket.splice(at, 1);
        },
    };

    const source = fs.readFileSync(INGEST_PATH, "utf8");
    const metrics = loadMetrics();
    const factory = new Function(
        "window", "unsafeWindow", "document", "setTimeout", "clearTimeout", "setInterval", "clearInterval",
        "ArchiveDB", "ArchiveMeta", "ArchiveMetrics", "console", "rid",
        source + "\nreturn ArchiveIngest;"
    );
    const ingest = factory(
        windowStub, unsafeWindowStub, documentStub, setTimeout, clearTimeout, setInterval, clearInterval,
        ArchiveDB, ArchiveMeta, metrics, console,
        // 显式传 "" 时必须是空串（⑫b 要用"全局也拿不到 rid"这条分支），不能回落成默认房间号
        opts.rid === undefined ? "9263298" : opts.rid
    );

    return {
        ingest, metrics, writtenBatches, roomDayWrites, seenWrites, userWrites, primeCalls, metaWrites,
        commitBatches,
        listeners, sandboxTap, documentStub, upsertRecords,
    };
}

function wait(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

function expectedDayKey(ms) {
    const date = new Date(ms);
    const pad = (value) => (value < 10 ? "0" + value : "" + value);
    return date.getFullYear() + "-" + pad(date.getMonth() + 1) + "-" + pad(date.getDate());
}

// 串行化的 upsert 会晚一拍落到 roomDayWrites 上：读完 flush 结果后再等一个小节拍
async function flushSettled(env) {
    const result = await env.ingest.flush();
    await wait(15);
    return result;
}

function lastWrittenEvent(env) {
    const batch = env.writtenBatches[env.writtenBatches.length - 1];
    assert.ok(batch, "应该有落库批次");
    return batch.list[batch.list.length - 1];
}

let passed = 0;
function ok(name) {
    passed++;
    console.log("  ✓ " + name);
}

/* ---------- 用例 ---------- */

async function run() {
    console.log("=== 正在运行 ArchiveIngest 采集入库单元测试 ===\n");

    // ---------- ① chatmsg：瘦身后的字段集 + dedupKey 短化 ----------
    {
        const env = makeEnv();
        env.ingest.onPacket("chatmsg", CHAT_SAMPLE);
        assert.strictEqual(env.ingest.getCounters().queued, 1, "解析成功应入队 1 条");
        const result = await flushSettled(env);
        assert.strictEqual(result.ok, true);
        assert.strictEqual(result.written, 1);

        const event = lastWrittenEvent(env);
        assert.strictEqual(event.kind, "chat");
        // 核心约束：事件里不存昵称，但昵称不能丢 —— 它必须已经进了 users 表
        assert.strictEqual(Object.prototype.hasOwnProperty.call(event, "nn"), false,
            "chat 事件不得带 nn（昵称不进 events，体积）");
        assert.notStrictEqual(event.nn, "小僵尸", "既不能带 nn，也绝不能把 bnn 混进来");
        assert.strictEqual(event.uid, "158637286", "uid 必须字符串化");
        assert.strictEqual(event.rid, "9263298");
        assert.strictEqual(event.txt, "1");
        assert.strictEqual(event.dedupKey, "304a0713aaaa", "dedupKey 短化：有 cid 就直接用 cid");
        assert.strictEqual(event.ts, BASE_TS, "ts 取 chatmsg.cst（服务端毫秒）");
        assert.strictEqual(event.dayKey, expectedDayKey(BASE_TS), "dayKey 必须是本地时区日锚");
        assert.deepStrictEqual(
            Object.keys(event).sort(),
            ["dayKey", "dedupKey", "kind", "rid", "ts", "txt", "uid"],
            "chat 事件只保留这 7 个字段（nn 与画像字段都已瘦身）"
        );
        ["level", "nl", "bl", "bnn", "brid", "ic", "sahf", "pg", "rg", "nn"].forEach((field) => {
            assert.strictEqual(Object.prototype.hasOwnProperty.call(event, field), false,
                "该字段不得再入库：" + field);
        });
        // 昵称没丢：putUsers 的 profile 里必须有正确昵称（且不是 bnn）
        assert.strictEqual(env.userWrites.length, 1, "flush 成功后必须 putUsers 一次");
        const chatProfile = env.userWrites[0].filter((item) => item.uid === "158637286")[0];
        assert.ok(chatProfile, "putUsers 必须收到该 uid 的档案");
        assert.strictEqual(chatProfile.nn, "二I六", "users 表里的昵称必须正确（取自旁挂表）");
        env.ingest.stop();
        ok("① chatmsg：事件无 nn（7 字段）、dedupKey=cid，而 users 里的昵称仍是「二I六」");
    }

    // ---------- ①b 无 cid 时 dedupKey 降级 ----------
    {
        const env = makeEnv();
        env.ingest.onPacket("chatmsg", "type@=chatmsg/rid@=9263298/uid@=42/nn@=无名/txt@=嗨@S你在/cst@=" + BASE_TS + "/");
        await flushSettled(env);
        const event = lastWrittenEvent(env);
        assert.strictEqual(event.txt, "嗨/你在", "txt 的 @S 必须还原成 /");
        assert.strictEqual(event.dedupKey, "42:" + BASE_TS + ":嗨/你在", "无 cid 时降级为 uid:ts:txt");
        env.ingest.stop();
        ok("①b 无 cid → dedupKey 降级 uid:ts:txt，txt 反转义正确");
    }

    // ---------- ② dgb：dedupKey = g|uid|gfid|bcnt，瘦身后无 hits/bf/receiveUid ----------
    {
        const env = makeEnv();
        env.ingest.onPacket("dgb", GIFT_SAMPLE);
        await flushSettled(env);
        const event = lastWrittenEvent(env);
        assert.strictEqual(event.kind, "gift");
        // 核心约束（礼物同理）：事件里不存昵称，users 表里必须有
        assert.strictEqual(Object.prototype.hasOwnProperty.call(event, "nn"), false,
            "gift 事件不得带 nn（昵称不进 events）");
        assert.strictEqual(event.dedupKey, "g|123456|268|3", "dgb 的 dedupKey 必须是 g|uid|gfid|bcnt");
        assert.strictEqual(event.uid, "123456");
        assert.strictEqual(event.gfid, "268");
        assert.strictEqual(event.gfn, "办卡");
        assert.strictEqual(event.gfcnt, 6);
        assert.strictEqual(event.bcnt, "3");
        assert.strictEqual(event.bg, 0);
        assert.strictEqual(event.rid, "9263298");
        assert.deepStrictEqual(
            Object.keys(event).sort(),
            ["bcnt", "bg", "dayKey", "dedupKey", "gfcnt", "gfid", "gfn", "kind", "rid", "ts", "uid"],
            "gift 事件只保留这 11 个字段（nn 已瘦身）"
        );
        ["hits", "bf", "receiveUid", "level", "bl", "bnn", "ic", "nn"].forEach((field) => {
            assert.strictEqual(Object.prototype.hasOwnProperty.call(event, field), false,
                "该字段不得再入库：" + field);
        });
        assert.ok(Math.abs(event.ts - Date.now()) < 5000, "dgb 无 cst：按校准值推算（未校准即本机时间）");
        const giftProfile = env.userWrites[0].filter((item) => item.uid === "123456")[0];
        assert.ok(giftProfile, "putUsers 必须收到送礼用户的档案");
        assert.strictEqual(giftProfile.nn, "大哥", "users 表里的昵称必须正确（事件无 nn 不代表昵称丢了）");
        env.ingest.stop();
        ok("② dgb：事件无 nn（11 字段）、dedupKey=g|uid|gfid|bcnt，而 users 里昵称仍是「大哥」");
    }

    // ---------- ③ uenter：不写明细，但 dayKey 归属与 enterUv 正确 ----------
    {
        const env = makeEnv({ withRoomDay: true });
        const today = new Date();
        const midnight = new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime();
        const beforeMidnight = midnight - 30000; // 昨天 23:59:30
        const afterMidnight = midnight + 30000;  // 今天 00:00:30

        env.ingest.setClockSkew(Date.now() - beforeMidnight);
        env.ingest.onPacket("uenter", "type@=uenter/rid@=9263298/uid@=901/nn@=路人甲/");
        await flushSettled(env);
        const firstPatch = env.roomDayWrites[0];
        assert.strictEqual(firstPatch.ridDay, "9263298|" + expectedDayKey(beforeMidnight),
            "00:00 前 30 秒必须归前一天（dayKey 由推算 ts 决定）");
        assert.strictEqual(firstPatch.deltas.enterUv, 1, "进场要计入 enterUv");
        assert.strictEqual(env.writtenBatches.length, 0, "进场不得写 events 明细");

        env.ingest.setClockSkew(Date.now() - afterMidnight);
        env.ingest.onPacket("uenter", "type@=uenter/rid@=9263298/uid@=902/nn@=路人乙/");
        await flushSettled(env);
        const secondPatch = env.roomDayWrites[env.roomDayWrites.length - 1];
        assert.strictEqual(secondPatch.ridDay, "9263298|" + expectedDayKey(afterMidnight),
            "00:00 后 30 秒必须归当天");
        assert.notStrictEqual(firstPatch.ridDay, secondPatch.ridDay, "跨零点前后必须落在不同 ridDay");
        env.ingest.stop();
        ok("③ uenter 不写明细，但 dayKey（跨零点前后各 30 秒）与 enterUv 归属正确");
    }

    // ---------- ④ 批写：200 条立即落库 / 500 ms 定时落库 / hidden 立即落库 ----------
    {
        const env = makeEnv();
        for (let index = 0; index < 199; index++) env.ingest.onPacket("chatmsg", chatPacket(index));
        await wait(5);
        assert.strictEqual(env.writtenBatches.length, 0, "199 条不该立即落库（在等 500 ms 定时器）");
        assert.strictEqual(env.ingest.getCounters().pending, 199);

        env.ingest.onPacket("chatmsg", chatPacket(199));
        await wait(5);
        assert.strictEqual(env.writtenBatches.length, 1, "第 200 条必须立即落库");
        assert.strictEqual(env.writtenBatches[0].list.length, 200, "一次批写 200 条");
        assert.strictEqual(env.ingest.getCounters().pending, 0);
        assert.strictEqual(env.ingest.getCounters().written, 200);

        await wait(600);
        assert.strictEqual(env.writtenBatches.length, 1, "满批落库后不得再被 500 ms 定时器重复落库");
        env.ingest.stop();
        ok("④a 满 200 条立即落库，且定时器已复位（不会重复落库）");
    }
    {
        const env = makeEnv();
        env.ingest.onPacket("chatmsg", CHAT_SAMPLE);
        await wait(120);
        assert.strictEqual(env.writtenBatches.length, 0, "500 ms 未到不该落库");
        await wait(600);
        assert.strictEqual(env.writtenBatches.length, 1, "500 ms 到点必须落库");
        assert.strictEqual(env.writtenBatches[0].list.length, 1);
        env.ingest.stop();
        ok("④b 单条 500 ms 后落库（定时批写生效）");
    }
    {
        const env = makeEnv();
        assert.strictEqual(env.ingest.start(), true);
        env.ingest.onPacket("chatmsg", CHAT_SAMPLE);
        assert.strictEqual(env.writtenBatches.length, 0);
        env.documentStub.visibilityState = "hidden";
        assert.ok(env.listeners.visibilitychange && env.listeners.visibilitychange.length >= 1, "必须已绑定 visibilitychange");
        env.listeners.visibilitychange.forEach((fn) => fn());
        await wait(20);
        assert.strictEqual(env.writtenBatches.length, 1, "页面进后台必须立即 flush（后台定时器会被节流）");
        env.ingest.stop();
        ok("④c visibilitychange→hidden 立即落库");
    }

    // ---------- ⑤ pingreq：只更新 clockSkew，绝不入库 ----------
    {
        const env = makeEnv();
        env.ingest.onPacket("pingreq", PING_SAMPLE);
        assert.strictEqual(env.ingest.getCounters().queued, 0, "pingreq 不得进事件队列");
        await flushSettled(env);
        assert.strictEqual(env.writtenBatches.length, 0, "pingreq 不得落库");
        const recordedSkew = env.ingest.getCounters().clockSkew;
        assert.ok(Math.abs(recordedSkew - (Date.now() - 1792202447000)) < 2000,
            "clockSkew = 本机 − 服务端 tick，实际 " + recordedSkew);
        ok("⑤a pingreq 只校准时钟，不入库；clockSkew 计算正确");

        const offsetMs = 3600 * 1000;
        const serverTick = Date.now() - offsetMs;
        env.ingest.onPacket("pingreq", "type@=pingreq/tick@=" + serverTick + "/");
        env.ingest.onPacket("uenter", ENTER_SAMPLE);
        await flushSettled(env);
        const patch = env.roomDayWrites.length ? env.roomDayWrites[env.roomDayWrites.length - 1] : null;
        assert.strictEqual(patch, null, "没有 upsertRoomDay 时不该有房间日写入");
        const counters = env.ingest.getCounters();
        assert.strictEqual(counters.queued, 0, "uenter 不写明细，队列必须为空");
        ok("⑤b 校准生效：uenter 不写明细、不入队；clockSkew 已按 tick 覆盖");
    }

    // ---------- ⑥ 解析异常不抛；无 uid 计 dropped ----------
    {
        const env = makeEnv();
        assert.doesNotThrow(() => env.ingest.onPacket("chatmsg", null));
        assert.doesNotThrow(() => env.ingest.onPacket(null, CHAT_SAMPLE));
        assert.doesNotThrow(() => env.ingest.onPacket("chatmsg", 12345));
        assert.doesNotThrow(() => env.ingest.onPacket("dgb", "完全不是报文的垃圾串"));
        assert.doesNotThrow(() => env.ingest.onPacket("未知类型", "x"));
        const counters = env.ingest.getCounters();
        assert.ok(counters.parseErrors >= 2, "空 raw / 空 type 必须计入 parseErrors，实际 " + counters.parseErrors);
        assert.strictEqual(counters.queued, 0, "坏包不得入队");

        env.ingest.onPacket("chatmsg", "type@=chatmsg/rid@=9263298/txt@=没有uid/cid@=x/");
        assert.ok(env.ingest.getCounters().dropped >= 1, "缺 uid 的包计 dropped（无法定位用户）");
        const result = await flushSettled(env);
        assert.strictEqual(result.ok, true);
        assert.strictEqual(result.written, 0, "空队列 flush 必须安全返回");
        env.ingest.stop();
        ok("⑥ 异常报文不抛异常、parseErrors / dropped 分别计数");
    }

    // ---------- ⑦ tap 解析顺序 ----------
    {
        const pageTap = createTap();
        const env = makeEnv({ unsafeWindowTap: { __douyuExTap: pageTap } });
        assert.strictEqual(env.ingest.start(), true);
        assert.strictEqual(env.ingest.getCounters().tapHost, "unsafeWindow", "页面主上下文优先");
        pageTap.emit("chatmsg", CHAT_SAMPLE);
        assert.ok(env.ingest.getCounters().queued >= 1, "页面侧 tap 的广播必须进队列");
        const queuedAfterPage = env.ingest.getCounters().queued;
        env.sandboxTap.emit("chatmsg", CHAT_SAMPLE);
        assert.strictEqual(env.ingest.getCounters().queued, queuedAfterPage, "沙箱侧空壳 tap 不得重复采集");
        env.ingest.stop();
        pageTap.emit("chatmsg", CHAT_SAMPLE);
        assert.strictEqual(env.ingest.getCounters().queued, queuedAfterPage, "stop 之后不得再收");
        await flushSettled(env);
        ok("⑦a tap 优先 unsafeWindow；stop 后真正退订");
    }
    {
        const env = makeEnv();
        assert.strictEqual(env.ingest.start(), true);
        assert.strictEqual(env.ingest.getCounters().tapHost, "window", "没有 unsafeWindow 时回落到 window");
        env.sandboxTap.emit("chatmsg", CHAT_SAMPLE);
        assert.ok(env.ingest.getCounters().queued >= 1);
        env.ingest.stop();
        ok("⑦b tap 回落 window");
    }
    {
        const env = makeEnv({ noWindowTap: true });
        assert.strictEqual(env.ingest.start(), false, "两侧都没有 tap 时 start 必须安全返回 false");
        assert.strictEqual(env.ingest.getCounters().tapHost, "", "未接入时 tapHost 为空串（UI 据此显示未采集）");
        assert.doesNotThrow(() => env.ingest.onPacket("chatmsg", CHAT_SAMPLE), "未订阅也要能被直接喂包（测试/补偿通道）");
        await flushSettled(env);
        env.ingest.stop();
        ok("⑦c 两侧都没有 tap → 静默不订阅，但 onPacket 仍可用");
    }

    // ---------- ⑧ 价目：ArchiveMeta.giftPrice 同步取值 + primeGifts 预热 ----------
    {
        const primeCalls = [];
        const env = makeEnv({
            withRoomDay: true,
            ArchiveMeta: {
                primeGifts(rid) {
                    primeCalls.push(rid);
                    return Promise.resolve({ ok: true, count: 12 });
                },
                giftPrice(gfid) {
                    if (gfid === "268") return { priceCents: 600, name: "办卡" };
                    return null;
                },
            },
        });
        assert.strictEqual(env.ingest.start(), true);
        assert.deepStrictEqual(primeCalls, ["9263298"], "start() 必须顺手预热当前 rid 的价目表");

        env.ingest.onPacket("dgb", GIFT_SAMPLE);
        await flushSettled(env);
        assert.strictEqual(env.roomDayWrites.length, 1, "有 upsertRoomDay 时必须写房间日聚合");
        const patch = env.roomDayWrites[0].patch;
        assert.strictEqual(patch.incomeCents, 6 * 600, "价目命中 → 金额 = gfcnt × priceCents");
        assert.strictEqual(patch.unknownGiftCnt, 0, "价目命中不得计入 unknown");

        env.ingest.onPacket("dgb", "type@=dgb/rid@=9263298/uid@=123457/nn@=二哥/gfid@=888888/gfn@=未知礼/gfcnt@=2/hits@=2/bcnt@=1/");
        await flushSettled(env);
        const patchAfter = env.roomDayWrites[env.roomDayWrites.length - 1].patch;
        assert.strictEqual(patchAfter.unknownGiftCnt, 1, "价目缺失只计 unknownGiftCnt");
        assert.strictEqual(patchAfter.incomeCents, 0, "价目缺失不得产生金额（绝不退回 0 成免费）");
        assert.strictEqual(patchAfter.freeCnt, 0, "价目缺失不等于免费礼物");
        assert.strictEqual(patchAfter.giftCnt, 2, "giftCnt 照常累加（未知单价也记份数）");
        env.ingest.stop();
        ok("⑧a ArchiveMeta.giftPrice 同步取价生效；primeGifts 在 start() 被调用；缺价只记 unknownGiftCnt");
    }
    {
        const env = makeEnv({
            withRoomDay: true,
            ArchiveMeta: {
                primeGifts() {
                    return Promise.reject(new Error("价目接口挂了"));
                },
                giftPrice() {
                    return null;
                },
            },
        });
        assert.strictEqual(env.ingest.start(), true, "primeGifts 失败不得影响订阅");
        env.ingest.onPacket("dgb", GIFT_SAMPLE);
        await flushSettled(env);
        const patch = env.roomDayWrites[0].patch;
        assert.strictEqual(patch.unknownGiftCnt, 1, "价目没到 → 先记 unknown");
        assert.strictEqual(patch.incomeCents, 0, "价目没到 → 不加金额");
        env.ingest.stop();
        await wait(10);
        ok("⑧b primeGifts reject 被吞掉：订阅照常、礼物先记 unknown（事后不回填）");
    }
    {
        const env = makeEnv({ withRoomDay: true, ArchiveMeta: null });
        assert.doesNotThrow(() => env.ingest.start());
        env.ingest.onPacket("dgb", GIFT_SAMPLE);
        await flushSettled(env);
        const patch = env.roomDayWrites[0].patch;
        assert.strictEqual(patch.unknownGiftCnt, 1, "ArchiveMeta 整个缺失时一律记 unknown，不抛");
        assert.strictEqual(patch.incomeCents, 0);
        env.ingest.stop();
        ok("⑧c ArchiveMeta 缺失：不抛、礼物计入 unknownGiftCnt");
    }
    {
        const env = makeEnv({
            withRoomDay: true,
            ArchiveMeta: {
                primeGifts() {
                    return Promise.resolve({ ok: true });
                },
                giftPrice() {
                    return { priceCents: 600 };
                },
            },
        });
        env.ingest.setGiftPriceResolver(() => null);
        env.ingest.onPacket("dgb", GIFT_SAMPLE);
        await flushSettled(env);
        const patch = env.roomDayWrites[0].patch;
        assert.strictEqual(patch.incomeCents, 0, "注入解析器返回 null 表示未知，不得回落到 meta");
        assert.strictEqual(patch.unknownGiftCnt, 1);
        env.ingest.setGiftPriceResolver(null);
        env.ingest.onPacket("dgb", "type@=dgb/rid@=9263298/uid@=123456/nn@=大哥/gfid@=268/gfn@=办卡/gfcnt@=1/hits@=1/bcnt@=9/");
        await flushSettled(env);
        const patch2 = env.roomDayWrites[env.roomDayWrites.length - 1].patch;
        assert.strictEqual(patch2.incomeCents, 600, "解析器撤掉后回落到 ArchiveMeta.giftPrice");
        env.ingest.stop();
        ok("⑧d 解析器优先级高于 ArchiveMeta；撤掉后回落；null ≠ 0");
    }

    // ---------- ⑨ 房间日聚合 ----------
    {
        const env = makeEnv({ withRoomDay: true });
        env.ingest.onPacket("chatmsg", CHAT_SAMPLE);
        env.ingest.onPacket("chatmsg", CHAT_SAMPLE); // 同一 uid 第二条（cid 相同→同 dedupKey，UV 不重复计）
        env.ingest.onPacket("dgb", GIFT_SAMPLE);
        env.ingest.onPacket("uenter", ENTER_SAMPLE);
        await flushSettled(env);
        const patch = env.roomDayWrites[0].patch;
        assert.strictEqual(patch.danmakuCnt, 2);
        assert.strictEqual(patch.chatUv, 1, "同一 uid 的发言只算 1 个发言用户");
        assert.strictEqual(patch.giftUv, 1);
        assert.strictEqual(patch.activeUv, 2, "activeUv = |chat ∪ gift|");
        assert.strictEqual(patch.enterUv, 1, "进场只计 enterUv");
        assert.strictEqual(env.roomDayWrites[0].deltas.danmakuCnt, 2, "deltas 与本批增量一致");
        assert.strictEqual(env.roomDayWrites[0].ridDay, "9263298|" + expectedDayKey(BASE_TS));
        assert.strictEqual(Object.prototype.hasOwnProperty.call(env.roomDayWrites[0].deltas, "minutes"), false,
            "minutes 分钟桶已删除，不得再进 deltas");
        env.ingest.stop();
        ok("⑨ 房间日聚合：danmakuCnt/chatUv/giftUv/activeUv/enterUv 全部正确（无 minutes）");
    }
    {
        const env = makeEnv({ dbFail: true });
        env.ingest.onPacket("chatmsg", CHAT_SAMPLE);
        const result = await flushSettled(env);
        assert.strictEqual(result.ok, false);
        assert.strictEqual(result.reason, "stub-fail");
        assert.strictEqual(env.ingest.getCounters().dropped, 1, "DB 失败计入 dropped，不重排队（避免内存堆积）");
        env.ingest.stop();
        ok("⑨b DB 写入失败：flush 返回 ok:false，计 dropped，不抛");
    }
    {
        const env = makeEnv({ dbThrow: true });
        env.ingest.onPacket("chatmsg", CHAT_SAMPLE);
        const result = await flushSettled(env);
        assert.strictEqual(result.ok, false, "同步抛异常也必须收敛成 ok:false");
        assert.strictEqual(result.reason, "exception");
        env.ingest.stop();
        ok("⑨c putEvents 同步抛异常：收敛为 ok:false，绝不冒泡");
    }

    // ---------- ⑩ 观测分钟 observedMin（今日口径覆盖率分子）：同一分钟只算一次 ----------
    {
        const env = makeEnv({ withRoomDay: true });
        for (let index = 0; index < 5; index++) env.ingest.onPacket("chatmsg", chatPacket(index));
        assert.strictEqual(env.ingest.getCounters().observedMinPending, 1, "同一分钟的 5 条只算 1 个观测分钟");
        await flushSettled(env);
        assert.strictEqual(env.roomDayWrites[0].deltas.observedMin, 1, "deltas.observedMin 必须是 1");
        assert.strictEqual(env.ingest.getCounters().observedMinPending, 0, "落库后增量清零");
        env.ingest.stop();
        ok("⑩a 同一分钟连喂 5 条 chatmsg → deltas.observedMin = 1");
    }
    {
        const env = makeEnv({ withRoomDay: true });
        env.ingest.onPacket("chatmsg", chatPacketAt(0, BASE_TS));
        await flushSettled(env);
        assert.strictEqual(env.roomDayWrites[0].deltas.observedMin, 1);

        env.ingest.onPacket("chatmsg", chatPacketAt(1, BASE_TS + 5000));
        await flushSettled(env);
        assert.strictEqual(env.roomDayWrites[1].deltas.observedMin, 0, "同一分钟跨批不得重复计（Set 保留）");

        env.ingest.onPacket("chatmsg", chatPacketAt(2, BASE_TS + 90000));
        await flushSettled(env);
        assert.strictEqual(env.roomDayWrites[2].deltas.observedMin, 1, "下一分钟必须再算 1 个观测分钟");
        env.ingest.stop();
        ok("⑩b 跨批去重：同分钟再落库计 0；下一分钟计 1");
    }
    {
        const env = makeEnv({ withRoomDay: true });
        env.ingest.onPacket("chatmsg", chatPacketAt(0, BASE_TS));
        env.ingest.onPacket("chatmsg", chatPacketAt(1, BASE_TS + 90000));
        await flushSettled(env);
        assert.strictEqual(env.roomDayWrites[0].deltas.observedMin, 2, "同一批里的两个不同分钟 → 2");
        env.ingest.stop();
        ok("⑩c 同一批里跨两个分钟 → deltas.observedMin = 2");
    }

    // ---------- ⑪ 观测分钟按 ridDay 独立 ----------
    {
        const env = makeEnv({ withRoomDay: true });
        env.ingest.onPacket("chatmsg", chatPacketWithRid(0, BASE_TS, "9263298"));
        env.ingest.onPacket("chatmsg", chatPacketWithRid(1, BASE_TS, "8888888"));
        await flushSettled(env);
        assert.strictEqual(env.roomDayWrites.length, 2, "两个房间各自一批房间日聚合");
        const observedByRidDay = {};
        env.roomDayWrites.forEach((write) => {
            observedByRidDay[write.ridDay] = write.deltas.observedMin;
        });
        const dayKey = expectedDayKey(BASE_TS);
        assert.strictEqual(observedByRidDay["9263298|" + dayKey], 1, "房间 9263298 计 1");
        assert.strictEqual(observedByRidDay["8888888|" + dayKey], 1, "房间 8888888 也计 1（按 ridDay 独立）");
        env.ingest.stop();
        ok("⑪ 两个不同 rid 的事件各自计 1 个观测分钟");
    }

    // ---------- ⑫ patch 只能是纯快照 ----------
    {
        const env = makeEnv({ withRoomDay: true });
        env.ingest.onPacket("chatmsg", chatPacket(0));
        await flushSettled(env);
        const write = env.roomDayWrites[0];
        assert.ok(Object.prototype.hasOwnProperty.call(write.deltas, "observedMin"), "deltas 必须带 observedMin");
        assert.strictEqual(write.deltas.observedMin, 1);
        ["danmakuCnt", "incomeCents", "giftCnt", "activeUv", "chatUv", "giftUv", "paidUv", "enterUv",
            "bagCnt", "freeCnt", "unknownGiftCnt", "minutes", "observedMin", "detailKept", "detailDropped",
            "updatedAt", "nobleCnt"].forEach((field) => {
                assert.strictEqual(Object.prototype.hasOwnProperty.call(write.rawPatch, field), false,
                    "patch 里绝不允许出现增量字段：" + field);
            });
        ["rid", "dayKey", "firstTs", "lastTs"].forEach((field) => {
            assert.ok(Object.prototype.hasOwnProperty.call(write.rawPatch, field),
                "patch 必须保留快照字段：" + field);
        });
        assert.strictEqual(write.rawPatch.detailSampled, undefined, "没触发抽样时不得带 detailSampled");
        env.ingest.stop();
        ok("⑫a observedMin / 明细计数只走 deltas；patch 仍是纯快照（无计数/无分钟桶）");
    }
    {
        const env = makeEnv({ withRoomDay: true, rid: "" });
        env.ingest.onPacket("chatmsg", "type@=chatmsg/uid@=42/nn@=无名/txt@=没有房间/cid@=norid1/cst@=" + BASE_TS + "/");
        await flushSettled(env);
        assert.strictEqual(env.roomDayWrites[0].deltas.observedMin, 0, "rid 缺失时不得计观测分钟");
        assert.strictEqual(env.ingest.getCounters().observedMinPending, 0);
        env.ingest.onPacket("pingreq", PING_SAMPLE);
        env.ingest.onPacket("oni", NOBLE_SAMPLE);
        assert.strictEqual(env.ingest.getCounters().observedMinPending, 0, "pingreq / oni 不得计入观测分钟");
        env.ingest.stop();
        ok("⑫b rid 缺失不计；pingreq / oni 也不计（只有能定位 rid+ts 的事件的分钟才算）");
    }
    {
        // 反向断言：贵宾数采集已下线 —— 喂 oni 也不得让 patch/deltas 冒出 nobleCnt，更不得产生事件
        const env = makeEnv({ withRoomDay: true });
        env.ingest.onPacket("chatmsg", chatPacket(0));
        env.ingest.onPacket("oni", "type@=oni/vn@=1752/rid@=9263298/list@=num@AA=3@ASsl@AA=40@AS/un@=1752/");
        await flushSettled(env);
        const write = env.roomDayWrites[env.roomDayWrites.length - 1];
        assert.strictEqual(Object.prototype.hasOwnProperty.call(write.rawPatch, "nobleCnt"), false,
            "收到 oni 后 patch 也不得带 nobleCnt（采集链路已删除）");
        assert.strictEqual(Object.prototype.hasOwnProperty.call(write.deltas, "nobleCnt"), false,
            "deltas 里也不该有 nobleCnt");
        assert.strictEqual(env.writtenBatches[0].list.length, 1, "oni 不得产生事件（只应有那 1 条 chatmsg）");

        const envOnly = makeEnv({ withRoomDay: true });
        envOnly.ingest.onPacket("oni", "type@=oni/vn@=1752/rid@=9263298/");
        assert.strictEqual(envOnly.ingest.getCounters().queued, 0, "oni 不得进事件队列");
        await flushSettled(envOnly);
        assert.strictEqual(envOnly.writtenBatches.length, 0, "oni 不得落库");
        assert.strictEqual(envOnly.roomDayWrites.length, 0, "纯 oni 不得产生房间日聚合写入");
        env.ingest.stop();
        envOnly.ingest.stop();
        ok("⑫c 贵宾数已停采：喂 oni 后 patch / deltas 均无 nobleCnt，且不产生任何事件与写入");
    }

    // ---------- ⑬ 单次解析：一条报文只建一次字段表 ----------
    {
        const env = makeEnv();
        const before = env.ingest.getCounters().fieldParses;
        env.ingest.onPacket("chatmsg", CHAT_SAMPLE);
        const afterOne = env.ingest.getCounters().fieldParses;
        assert.strictEqual(afterOne - before, 1,
            "一条 chatmsg 只能建一次字段表（旧实现每字段 new RegExp 十几次），实际 " + (afterOne - before));

        env.ingest.onPacket("dgb", GIFT_SAMPLE);
        assert.strictEqual(env.ingest.getCounters().fieldParses - afterOne, 1, "换一条报文再 +1");
        await flushSettled(env);
        assert.strictEqual(env.ingest.getCounters().fieldParses, afterOne + 1, "落库过程不得再触发解析");
        env.ingest.stop();
        ok("⑬ 单次解析：一条报文只 split 一次（fieldParses 每条 +1）");
    }

    // ---------- ⑭ seen 启动载入：刷新后同一 uid 不再算"当日首次" ----------
    {
        const env = makeEnv({
            withRoomDay: true,
            getSeen(scope) {
                return scope === "active" ? ["158637286"] : [];
            },
        });
        assert.strictEqual(env.ingest.start(), true);
        await wait(20); // 等 getSeen 的 Promise 把 uid 并进内存 Set

        env.ingest.onPacket("chatmsg", CHAT_SAMPLE); // uid 158637286，已在 seen 里
        await flushSettled(env);
        const deltas = env.roomDayWrites[0].deltas;
        assert.strictEqual(deltas.activeUv, 0,
            "载入 seen 后同一 uid 不得再被计入 activeUv（实测重复计数：809 vs 真实 689）");
        assert.strictEqual(deltas.chatUv, 1, "chat scope 未载入（只载 active/enter），所以发言人数照常 +1");
        assert.strictEqual(deltas.danmakuCnt, 1, "弹幕条数与去重无关，仍然 +1");
        env.ingest.stop();
        ok("⑭ seen 启动载入：已落库的 uid 不再算首次（activeUv 不重复计数）");
    }

    // ---------- ⑮ putSeen：flush 成功后落库新 key ----------
    {
        const env = makeEnv();
        env.ingest.onPacket("chatmsg", CHAT_SAMPLE);
        await flushSettled(env);
        assert.strictEqual(env.seenWrites.length, 1, "flush 成功后必须调用 putSeen 一次");
        const seenList = env.seenWrites[0];
        const dayKey = expectedDayKey(BASE_TS);
        const activeEntry = seenList.filter((item) => item.scope === "active")[0];
        assert.ok(activeEntry, "putSeen 必须包含 active 的新 key");
        assert.strictEqual(activeEntry.uid, "158637286", "key 里必须带 uid");
        assert.strictEqual(activeEntry.dayKey, dayKey, "key 里必须带 dayKey");
        assert.ok(seenList.some((item) => item.scope === "chat" && item.uid === "158637286"),
            "分指标 scope（chat）也要落库");

        // 同一个 uid 再来一条：不是新 key，putSeen 不应该再收到它
        env.ingest.onPacket("chatmsg", chatPacket(9));
        await flushSettled(env);
        const secondBatch = env.seenWrites[1] || [];
        assert.strictEqual(secondBatch.filter((item) => item.uid === "158637286").length, 0,
            "已见过的 uid 不得重复写 seen");
        env.ingest.stop();
        ok("⑮ flush 后 putSeen 收到 {scope, dayKey, uid}，重复 uid 不再写");
    }

    // ---------- ⑯ upsertRoomDay 串行：同一 ridDay 不交叠 ----------
    {
        const env = makeEnv({ withRoomDay: true, upsertDelayMs: 30 });
        env.ingest.onPacket("chatmsg", chatPacket(0));
        await flushSettled(env);
        env.ingest.onPacket("chatmsg", chatPacket(1));
        await flushSettled(env);
        await wait(150);
        assert.strictEqual(env.upsertRecords.maxInFlight, 1,
            "同一 ridDay 的 upsert 必须串行（实测并发读改写会丢更新：enterUv 1685 vs 真实 1958），实际最大并发 "
            + env.upsertRecords.maxInFlight);
        assert.deepStrictEqual(env.upsertRecords.order, ["start1", "end1", "start2", "end2"],
            "第二个 upsert 必须等第一个 resolve 之后才发，实际 " + JSON.stringify(env.upsertRecords.order));
        env.ingest.stop();
        ok("⑯ upsertRoomDay 串行化：同一 ridDay 两次 flush 不交叠（maxInFlight=1）");
    }

    // ---------- ⑰ uenter：不写明细但 enterUv +1 ----------
    {
        const env = makeEnv({ withRoomDay: true });
        env.ingest.onPacket("uenter", ENTER_SAMPLE);
        const result = await flushSettled(env);
        assert.strictEqual(result.ok, true);
        assert.strictEqual(env.writtenBatches.length, 0, "进场不得调用 putEvents（不存明细）");
        assert.strictEqual(env.ingest.getCounters().written, 0, "written 计数也不该增加");
        assert.strictEqual(env.roomDayWrites.length, 1, "但仍要写一条房间日聚合");
        assert.strictEqual(env.roomDayWrites[0].deltas.enterUv, 1, "enterUv 必须 +1");
        assert.strictEqual(env.roomDayWrites[0].deltas.danmakuCnt, 0, "进场不得影响弹幕条数");
        env.ingest.stop();
        ok("⑰ uenter 只计 enterUv、不产生任何 events 明细");
    }

    // ---------- ⑱ 明细限额：超限后 chat 抽样，聚合仍按全量 ----------
    {
        const env = makeEnv({ withRoomDay: true });
        env.ingest.setDetailLimit(3);
        for (let index = 0; index < 10; index++) env.ingest.onPacket("chatmsg", chatPacket(index));
        await flushSettled(env);

        const patch = env.roomDayWrites[0].patch;
        assert.strictEqual(patch.danmakuCnt, 10, "聚合值绝不受抽样影响：10 条弹幕必须计 10");
        assert.strictEqual(patch.detailSampled, true, "触发抽样后 patch 必须带 detailSampled=true");
        assert.strictEqual(env.roomDayWrites[0].deltas.detailKept, 5, "上限 3 条后每 5 条留 1 条 → 共留 5 条");
        assert.strictEqual(env.roomDayWrites[0].deltas.detailDropped, 5, "被抽掉 5 条");
        assert.strictEqual(env.writtenBatches[0].list.length, 5, "events 明细只写 5 条");
        assert.strictEqual(env.ingest.getCounters().detailDropped, 5, "计数器累计被抽掉的条数");
        env.writtenBatches[0].list.forEach((item) => {
            assert.strictEqual(item.kind, "chat", "被抽掉的只可能是 chat");
        });

        // 礼物永不被抽样：即使已达上限
        env.ingest.onPacket("dgb", GIFT_SAMPLE);
        await flushSettled(env);
        assert.strictEqual(env.writtenBatches[1].list.length, 1, "礼物明细必须照常入库");
        assert.strictEqual(env.writtenBatches[1].list[0].kind, "gift");
        env.ingest.stop();
        ok("⑱ 明细限额：超限后 chat 抽样（detailSampled=true），danmakuCnt 仍按全量 +1，礼物不抽样");
    }

    // ---------- ⑲ 事件无 nn、users 有昵称（chat + gift 同批，本轮核心约束） ----------
    {
        const env = makeEnv();
        env.ingest.onPacket("chatmsg", CHAT_SAMPLE); // uid 158637286 / 二I六
        env.ingest.onPacket("dgb", GIFT_SAMPLE);     // uid 123456 / 大哥
        await flushSettled(env);
        const events = env.writtenBatches[0].list;
        assert.strictEqual(events.length, 2, "两条明细都要落库");

        events.forEach((event) => {
            assert.strictEqual(Object.prototype.hasOwnProperty.call(event, "nn"), false,
                "任何落库事件都不得带 nn（kind=" + event.kind + "）");
            assert.strictEqual(event.nn, undefined);
        });

        const profiles = env.userWrites[0];
        const profilesByUid = {};
        profiles.forEach((item) => { profilesByUid[item.uid] = item; });
        assert.strictEqual(profilesByUid["158637286"] && profilesByUid["158637286"].nn, "二I六",
            "chat 用户的昵称必须进 users 表（来源是解析时旁挂的 uid→nn）");
        assert.strictEqual(profilesByUid["123456"] && profilesByUid["123456"].nn, "大哥",
            "gift 用户的昵称必须进 users 表");
        assert.strictEqual(profilesByUid["158637286"].cnt, 1, "users 的 cnt 照常累加");
        assert.strictEqual(profilesByUid["123456"].cnt, 1);
        env.ingest.stop();
        ok("⑲ 同批 chat+gift：events 里两个都没有 nn，users 里两个昵称都在");
    }

    // ---------- ⑳ seen 就绪闸门：闸门期间不聚合、不入队、不写库 ----------
    {
        const env = makeEnv({
            withRoomDay: true,
            getSeenDelayMs: 200,
            getSeen(scope) {
                return scope === "active" ? ["158637286"] : [];
            },
        });
        assert.strictEqual(env.ingest.start(), true);
        assert.strictEqual(env.ingest.getCounters().seenReady, false, "刚 start 时闸门必须是关闭的");

        env.ingest.onPacket("chatmsg", CHAT_SAMPLE); // uid 158637286（已落库过）
        assert.strictEqual(env.ingest.getCounters().seenGatePending, 1, "闸门期间事件只缓冲");
        assert.strictEqual(env.ingest.getCounters().queued, 0, "闸门期间不得入队");
        assert.strictEqual(env.writtenBatches.length, 0, "闸门期间不得 putEvents");
        assert.strictEqual(env.roomDayWrites.length, 0, "闸门期间不得写房间日聚合（不聚合）");

        await wait(260); // 越过 200 ms 的 getSeen 延迟
        assert.strictEqual(env.ingest.getCounters().seenReady, true, "seen 落地后必须开闸");
        assert.strictEqual(env.ingest.getCounters().seenGatePending, 0, "开闸后缓冲必须清空");

        await flushSettled(env);
        const deltas = env.roomDayWrites[0].deltas;
        assert.strictEqual(deltas.activeUv, 0,
            "开闸后该 uid 已被 seen 挡住，不得计入 activeUv（这正是 +7% 残差的来源）");
        assert.strictEqual(deltas.danmakuCnt, 1, "弹幕条数仍按全量 +1");
        assert.strictEqual(env.writtenBatches[0].list.length, 1, "缓冲的事件最终必须落库");
        env.ingest.stop();
        ok("⑳ 闸门生效：期间零聚合零入库，开闸后按 seen 判定（activeUv 不被重复计）");
    }

    // ---------- ㉑ 开闸冲刷顺序不变（A→B→C） ----------
    {
        const env = makeEnv({ getSeenDelayMs: 120, getSeen() { return []; } });
        assert.strictEqual(env.ingest.start(), true);
        assert.strictEqual(env.ingest.getCounters().seenReady, false);

        const packetA = "type@=chatmsg/rid@=9263298/uid@=1001/nn@=甲/txt@=A/cid@=cidA/cst@=" + BASE_TS + "/";
        const packetB = "type@=chatmsg/rid@=9263298/uid@=1002/nn@=乙/txt@=B/cid@=cidB/cst@=" + (BASE_TS + 1000) + "/";
        const packetC = "type@=chatmsg/rid@=9263298/uid@=1003/nn@=丙/txt@=C/cid@=cidC/cst@=" + (BASE_TS + 2000) + "/";
        env.ingest.onPacket("chatmsg", packetA);
        env.ingest.onPacket("chatmsg", packetB);
        env.ingest.onPacket("chatmsg", packetC);
        assert.strictEqual(env.ingest.getCounters().seenGatePending, 3, "三条都要进缓冲");

        await wait(160);
        assert.strictEqual(env.ingest.getCounters().seenReady, true);
        await flushSettled(env);
        const stored = env.writtenBatches[0].list;
        assert.deepStrictEqual(
            stored.map((item) => item.dedupKey),
            ["cidA", "cidB", "cidC"],
            "开闸冲刷必须保持原顺序（不许乱序），实际 " + JSON.stringify(stored.map((item) => item.dedupKey))
        );
        assert.deepStrictEqual(stored.map((item) => item.txt), ["A", "B", "C"]);
        env.ingest.stop();
        ok("㉑ 开闸冲刷按原顺序重放（A→B→C）");
    }

    // ---------- ㉒ getSeen 失败也要开闸 ----------
    {
        const env = makeEnv({ withRoomDay: true, getSeenDelayMs: 30, getSeenReject: true, getSeen() { return []; } });
        assert.strictEqual(env.ingest.start(), true, "getSeen 挂了也不能影响订阅");
        assert.strictEqual(env.ingest.getCounters().seenReady, false);
        assert.doesNotThrow(() => env.ingest.onPacket("chatmsg", CHAT_SAMPLE));

        await wait(80);
        assert.strictEqual(env.ingest.getCounters().seenReady, true, "reject 之后必须照常开闸");
        assert.strictEqual(env.ingest.getCounters().seenLoadFailed, true, "失败要如实记在 counters 上");

        await flushSettled(env);
        assert.strictEqual(env.writtenBatches[0].list.length, 1, "失败兜底后事件照常处理并落库");
        assert.strictEqual(env.roomDayWrites[0].deltas.danmakuCnt, 1);
        env.ingest.stop();
        ok("㉒ getSeen reject → 闸门仍开、事件照常处理、seenLoadFailed=true、不抛");
    }

    // ---------- ㉓ putSeen 失败：pending 保留、下一次 flush 重试 ----------
    {
        const env = makeEnv({ putSeenFailTimes: 1 });
        env.ingest.onPacket("chatmsg", CHAT_SAMPLE);
        await flushSettled(env);
        await wait(20);

        assert.ok(env.ingest.getCounters().seenRetry >= 1, "putSeen reject 必须计入 seenRetry");
        assert.ok(env.ingest.getCounters().seenPending > 0,
            "失败时 pending 绝不能被清空（否则刷新后这批 uid 全被重算成当日首次）");

        await env.ingest.flush(); // 第二次：putSeen 这次会 resolve
        await wait(20);
        assert.strictEqual(env.ingest.getCounters().seenPending, 0, "成功之后 pending 必须清空");
        assert.strictEqual(env.seenWrites.length, 2, "第二次 flush 必须把同一批 uid 再送一次");
        const retried = env.seenWrites[1].filter((item) => item.scope === "active" && item.uid === "158637286");
        assert.strictEqual(retried.length, 1, "重试必须仍然包含第一次没落地的那个 uid（active scope）");
        assert.strictEqual(retried[0].scope, "active", "重试的 key 结构必须完整（scope/dayKey/uid）");
        assert.ok(retried[0].dayKey, "重试的 key 里 dayKey 不能丢");
        env.ingest.stop();
        ok("㉓ putSeen 失败保留 pending，第二次 flush 重试成功后才清空");
    }

    // ---------- ㉔ 刷新打断：putSeen 没落地时 pending 必须还在 ----------
    {
        const env = makeEnv({ putSeenNeverResolve: true });
        env.ingest.onPacket("chatmsg", CHAT_SAMPLE);
        await flushSettled(env);
        await wait(20);

        assert.ok(env.ingest.getCounters().seenPending > 0,
            "putSeen 永不 resolve 时 pending 必须保留（页面刷新后靠下一次会话重试）");
        assert.strictEqual(env.ingest.getCounters().seenRetry, 0, "既没成功也没失败 → 不算重试");
        const before = env.ingest.getCounters().seenPending;

        // 下一次 flush（例如 hidden / pagehide 触发）仍然带着它
        await env.ingest.flush();
        await wait(20);
        assert.ok(env.ingest.getCounters().seenPending >= before, "pending 不得因为一次未落地的发送而减少");
        env.ingest.stop();
        ok("㉔ putSeen 悬空（刷新打断）：pending 不被提前清空，下一轮仍会再试");
    }

    // ---------- ㉕ pending 上限：狂喂 25000 个 uid 也不爆 ----------
    {
        const env = makeEnv({ putSeenNeverResolve: true });
        const startedAt = Date.now();
        for (let index = 0; index < 25000; index++) {
            env.ingest.onPacket(
                "chatmsg",
                "type@=chatmsg/rid@=9263298/uid@=" + (500000 + index) + "/nn@=用户/cid@=bulk" + index + "/cst@=" + BASE_TS + "/"
            );
        }
        const counters = env.ingest.getCounters();
        assert.ok(counters.seenPending <= 20000, "pending 必须不超上限（20000），实际 " + counters.seenPending);
        assert.ok(counters.seenLost > 0, "因超限被丢弃的必须计入 seenLost，实际 " + counters.seenLost);
        assert.ok(Date.now() - startedAt < 60000, "不得耗时过长（实际 " + (Date.now() - startedAt) + " ms）");
        assert.doesNotThrow(() => env.ingest.flush());
        env.ingest.stop();
        ok("㉕ pending 上限生效：25000 个 uid 下 seenPending≤20000、seenLost>0、不超时不抛");
    }

    // ---------- ㉖ 原子批量提交：一次 flush 只调一次 commitBatch ----------
    {
        const env = makeEnv({ withCommitBatch: true, withRoomDay: true });
        env.ingest.onPacket("chatmsg", CHAT_SAMPLE);
        env.ingest.onPacket("dgb", GIFT_SAMPLE);
        const result = await env.ingest.flush();
        await wait(30);

        assert.strictEqual(result.ok, true);
        assert.strictEqual(env.commitBatches.length, 1, "一次 flush 只能调 commitBatch 一次");
        const batch = env.commitBatches[0];
        assert.strictEqual(batch.events.length, 2, "events 必须带上本批两条明细");
        assert.ok(batch.seen.length > 0, "seen 必须随同一个事务提交");
        assert.ok(batch.seen.every((item) => item.scope && item.dayKey && item.uid),
            "seen 项结构必须是 {scope, dayKey, uid}");
        assert.strictEqual(batch.roomDays.length, 1, "本批只涉及一个 ridDay");
        assert.strictEqual(batch.roomDays[0].ridDay, "9263298|" + expectedDayKey(BASE_TS));
        assert.strictEqual(batch.roomDays[0].deltas.danmakuCnt, 1, "roomDays 里必须带 deltas");
        assert.strictEqual(batch.roomDays[0].deltas.enterUv, 0);
        assert.ok(batch.roomDays[0].patch && batch.roomDays[0].patch.ridDay === undefined,
            "patch 仍是纯快照（ridDay 在外层）");
        const ridDayList = batch.roomDays.map((item) => item.ridDay);
        assert.strictEqual(new Set(ridDayList).size, ridDayList.length, "同一 ridDay 只能出现一条");

        // 走事务时三条回落路径一次都不许被单独调用
        assert.strictEqual(env.writtenBatches.length, 0, "走 commitBatch 时不得再单独调 putEvents");
        assert.strictEqual(env.seenWrites.length, 0, "走 commitBatch 时不得再单独调 putSeen");
        assert.strictEqual(env.roomDayWrites.length, 0, "走 commitBatch 时不得再单独调 upsertRoomDay");
        assert.strictEqual(env.ingest.getCounters().commitBatches, 1, "commitBatches 计数必须 +1");
        assert.strictEqual(env.ingest.getCounters().seenPending, 0, "事务成功后 seen pending 必须清零");
        assert.strictEqual(env.ingest.getCounters().written, 2, "written 按事务返回的 added 累加");
        env.ingest.stop();
        ok("㉖ 单事务提交：flush 只调一次 commitBatch，events/seen/roomDays 齐全且 ridDay 不重复");
    }

    // ---------- ㉗ 事务失败：整体不落地、三条路径都不得被单独调用 ----------
    {
        const env = makeEnv({ withCommitBatch: true, commitBatchFail: true, withRoomDay: true });
        env.ingest.onPacket("chatmsg", CHAT_SAMPLE);
        env.ingest.onPacket("dgb", GIFT_SAMPLE);
        const result = await env.ingest.flush();
        await wait(30);

        assert.strictEqual(result.ok, false, "事务失败时 flush 必须返回 ok:false");
        assert.strictEqual(result.reason, "commit-stub-fail");
        assert.strictEqual(env.writtenBatches.length, 0, "putEvents 一次都不许被单独调用");
        assert.strictEqual(env.seenWrites.length, 0, "putSeen 一次都不许被单独调用");
        assert.strictEqual(env.roomDayWrites.length, 0, "upsertRoomDay 一次都不许被单独调用");
        assert.strictEqual(env.ingest.getCounters().written, 0, "没有任何事件被写入");
        assert.ok(env.ingest.getCounters().dropped >= 2, "本批事件必须计入 dropped（不重排队）");
        assert.ok(env.ingest.getCounters().seenPending > 0, "失败时 seen pending 必须保留待重试");
        assert.ok(env.ingest.getCounters().seenRetry >= 1, "失败必须计入 seenRetry");
        assert.strictEqual(env.ingest.getCounters().commitBatches, 0, "失败不算一次成功提交");
        env.ingest.stop();
        ok("㉗ commitBatch 返回 ok:false → 整体不落地，三条路径零调用，dropped/seenRetry 增加");
    }

    // ---------- ㉘ 回落路径：没有 commitBatch 时仍是原来三条路 ----------
    {
        const env = makeEnv({ withRoomDay: true }); // 不注入 commitBatch
        env.ingest.onPacket("chatmsg", CHAT_SAMPLE);
        env.ingest.onPacket("dgb", GIFT_SAMPLE);
        await flushSettled(env);
        await wait(40);

        assert.strictEqual(env.commitBatches.length, 0, "没有 commitBatch 时不得调用它");
        assert.ok(env.writtenBatches.length >= 1, "回落必须走 putEvents");
        assert.ok(env.seenWrites.length >= 1, "回落必须走 putSeen");
        assert.ok(env.roomDayWrites.length >= 1, "回落必须走 upsertRoomDay");
        assert.strictEqual(env.writtenBatches[0].list.length, 2, "回落路径的事件数不变");
        assert.strictEqual(env.ingest.getCounters().seenPending, 0, "回落路径成功后同样清 pending");
        assert.strictEqual(env.ingest.getCounters().commitBatches, 0);
        assert.strictEqual(env.ingest.getCounters().written, 2);
        env.ingest.stop();
        ok("㉘ 没有 commitBatch → 回落三条独立路径，行为与之前一致");
    }

    // ---------- ㉙ 复现「刷新后 UV 虚高」：只载 active/enter 会漏掉 chat/gift/paid ----------
    {
        // —— 会话 1：采集一轮，把真正会写进 DB 的 seen 收下来 ——
        const meta = {
            primeGifts() { return Promise.resolve({ ok: true }); },
            giftPrice() { return { priceCents: 600 }; },
        };
        const session1 = makeEnv({ withRoomDay: true, ArchiveMeta: meta });
        session1.ingest.onPacket("chatmsg", CHAT_SAMPLE); // uid 158637286
        session1.ingest.onPacket("dgb", GIFT_SAMPLE);     // uid 123456
        await flushSettled(session1);
        await wait(20);
        const dbSeen = {};
        session1.seenWrites.forEach((batch) => {
            batch.forEach((item) => {
                if (!dbSeen[item.scope]) dbSeen[item.scope] = [];
                if (dbSeen[item.scope].indexOf(item.uid) === -1) dbSeen[item.scope].push(item.uid);
            });
        });
        assert.ok(dbSeen.active && dbSeen.active.length >= 2, "会话 1 必须把 active 名单写进库");
        assert.ok(dbSeen.chat && dbSeen.chat.length >= 1, "会话 1 必须把 chat 名单写进库");
        assert.ok(dbSeen.gift && dbSeen.gift.length >= 1, "会话 1 必须把 gift 名单写进库");
        assert.ok(dbSeen.paid && dbSeen.paid.length >= 1, "会话 1 必须把 paid 名单写进库");
        session1.ingest.stop();

        // —— 会话 2：模拟刷新（内存清空），getSeen 按 DB 的真实内容返回 ——
        const session2 = makeEnv({
            withRoomDay: true,
            ArchiveMeta: meta,
            getSeen(scope) { return dbSeen[scope] || []; },
        });
        assert.strictEqual(session2.ingest.start(), true);
        await wait(30);

        // 同一批用户又说话了 / 又送礼了（都是新事件，但都该被名单挡住）
        session2.ingest.onPacket("chatmsg", "type@=chatmsg/rid@=9263298/uid@=158637286/nn@=二I六/txt@=又一次/cid@=again1/cst@=" + (BASE_TS + 60000) + "/");
        session2.ingest.onPacket("dgb", "type@=dgb/rid@=9263298/uid@=123456/nn@=大哥/gfid@=268/gfn@=办卡/gfcnt@=2/hits@=2/bcnt@=9/bg@=0/");
        await flushSettled(session2);
        await wait(30);

        const deltas = session2.roomDayWrites[0].deltas;
        assert.strictEqual(deltas.activeUv, 0, "刷新后老用户不得再计入 activeUv（真实人数已落库）");
        assert.strictEqual(deltas.chatUv, 0,
            "刷新后老用户不得再计入 chatUv —— 修复前只载 active/enter，这个值会变成 1（残差来源）");
        assert.strictEqual(deltas.giftUv, 0, "刷新后老用户不得再计入 giftUv");
        assert.strictEqual(deltas.paidUv, 0, "刷新后老用户不得再计入 paidUv");
        assert.strictEqual(deltas.danmakuCnt, 1, "条数不受影响：新弹幕仍然 +1");
        assert.strictEqual(deltas.giftCnt, 2, "礼物份数不受影响：gfcnt=2 照常累加");
        session2.ingest.stop();
        ok("㉙ 刷新后 UV 不再虚高：5 个 scope 全载入 → chatUv/giftUv/paidUv 全部归 0（修补前为 1）");
    }

    // ---------- ㉚ seen 键不含 rid：靓号房间 rid 纠偏后仍能挡住重复计 ----------
    {
        const env = makeEnv({
            withRoomDay: true,
            rid: "15000",                                  // 全局 rid 还是短号
            getSeen(scope) { return scope === "active" || scope === "chat" ? ["158637286"] : []; },
        });
        assert.strictEqual(env.ingest.start(), true);
        await wait(30);
        // 报文里带的是真实 room_id（靓号房间：URL 15000 → 真实 796449）
        env.ingest.onPacket("chatmsg", "type@=chatmsg/rid@=796449/uid@=158637286/nn@=二I六/txt@=hi/cid@=realrid1/cst@=" + BASE_TS + "/");
        await flushSettled(env);
        const deltas = env.roomDayWrites[env.roomDayWrites.length - 1].deltas;
        assert.strictEqual(deltas.activeUv, 0,
            "seen 键若带 rid，载入时用短号 15000、判定时用真实号 796449 → 必然匹配不上（这就是残差的一类来源）");
        assert.strictEqual(deltas.chatUv, 0, "chat scope 同理");
        env.ingest.stop();
        ok("㉚ seen 键不含 rid：rid 纠偏（短号→真实号）后同一 uid 仍被挡住");
    }

    // ---------- ㉛ 探针：默认关闭零开销，开启后能指出「首次」从哪条路径进来 ----------
    {
        const env = makeEnv();
        assert.strictEqual(env.ingest.getSeenProbe(), null, "探针默认关闭：getSeenProbe() 必须返回 null");

        assert.strictEqual(env.ingest.setSeenProbe(true), true);
        env.ingest.onPacket("chatmsg", CHAT_SAMPLE);
        const probe = env.ingest.getSeenProbe();
        assert.ok(probe, "开启后必须拿到探针对象");
        assert.strictEqual(probe.totalTrue, 1, "一条新 uid 的弹幕只应记 1 次首次判定");
        const entries = probe.countedByUid["158637286"];
        assert.ok(entries && entries.length === 1, "必须按 uid 记账");
        assert.strictEqual(entries[0].source, "direct", "直通路径的 source 必须是 direct");
        assert.strictEqual(entries[0].scopes, "active+chat", "要能看出这次命中了哪些 scope");
        assert.strictEqual(entries[0].kind, "chat");
        assert.strictEqual(entries[0].rid, "9263298");
        assert.strictEqual(entries[0].dayKey, expectedDayKey(BASE_TS));

        // 同一条再来一次：不该再记（不是首次）
        env.ingest.onPacket("chatmsg", CHAT_SAMPLE);
        assert.strictEqual(env.ingest.getSeenProbe().totalTrue, 1, "非首次不得记账");
        await env.ingest.flush();
        assert.strictEqual(env.ingest.setSeenProbe(false), false, "关闭探针");
        assert.strictEqual(env.ingest.getSeenProbe(), null, "关闭后必须回到 null（不再持有账本）");
        env.ingest.stop();
        ok("㉛ 探针默认 null、开启后记录 source/scopes、关闭即释放");
    }
    {
        // 闸门重放路径的 source 必须是 gate-replay（真机上区分"直通"与"开闸补算"全靠它）
        const env = makeEnv({ getSeenDelayMs: 120, getSeen() { return []; } });
        assert.strictEqual(env.ingest.start(), true);
        env.ingest.setSeenProbe(true);
        env.ingest.onPacket("chatmsg", CHAT_SAMPLE);
        await wait(160);
        const probe = env.ingest.getSeenProbe();
        assert.strictEqual(probe.totalTrue, 1);
        assert.strictEqual(probe.countedByUid["158637286"][0].source, "gate-replay",
            "闸门期间缓冲、开闸后重放的事件必须标成 gate-replay");
        env.ingest.stop();
        ok("㉜ 闸门重放路径的首次判定标记为 gate-replay");
    }

    // ---------- ㉝ comm_chatmsg：解开嵌套 chatmsg，价格取 crealPrice（为 0 回落 cprice） ----------
    {
        const env = makeEnv({ withRoomDay: true });
        env.ingest.onPacket("comm_chatmsg", COMM_CHAT_SAMPLE);
        await flushSettled(env);
        const event = lastWrittenEvent(env);
        assert.strictEqual(event.kind, "gift", "高能弹幕落成 gift 类事件");
        assert.strictEqual(event.uid, "555", "uid 必须从嵌套 chatmsg 里解出来");
        assert.strictEqual(event.txt, "高能来了", "txt 必须从嵌套 chatmsg 里解出来（二次 STT 解包）");
        assert.strictEqual(event.gfid, "__comm_chatmsg");
        assert.strictEqual(event.gfn, "高能弹幕");
        assert.strictEqual(event.gfcnt, 1);
        assert.strictEqual(event.priceCents, 1000, "价格优先取 crealPrice（1000 分 = 10 鱼翅）");
        assert.strictEqual(event.dedupKey, "cm:v123:555", "dedupKey = cm:<vrid>:<uid>");
        assert.strictEqual(event.rid, "9263298");
        assert.strictEqual(env.roomDayWrites[0].patch.incomeCents, 1000, "incomeCents 按事件自带的价累加");
        assert.strictEqual(env.roomDayWrites[0].patch.paidUv, 1, "有价高能弹幕计入付费人数");

        // ① crealPrice=0（道具券免费）→ priceCents=0，绝不回落标价；不产生收入、不计付费人数
        env.ingest.onPacket("comm_chatmsg", COMM_CHAT_FREE_SAMPLE);
        await flushSettled(env);
        const freeEvent = lastWrittenEvent(env);
        assert.strictEqual(freeEvent.txt, "免费高能");
        assert.strictEqual(freeEvent.priceCents, 0,
            "crealPrice=0 就是明确免费：priceCents 必须为 0，不许回落 cprice 标价");
        const freePatch = env.roomDayWrites[env.roomDayWrites.length - 1].patch;
        assert.strictEqual(freePatch.incomeCents, 0, "道具券免费不产生收入（incomeCents 不变）");
        assert.strictEqual(freePatch.paidUv, 0, "道具券免费不计付费人数（paidUv 不变）");
        assert.strictEqual(freePatch.freeCnt, 1, "免费高能弹幕计入 freeCnt");
        assert.strictEqual(freePatch.giftCnt, 1, "份数照常 +1");
        assert.strictEqual(freePatch.unknownGiftCnt, 0, "明确为 0 不是未知");

        // ② crealPrice 字段**缺失** → 才回落 cprice 标价
        env.ingest.onPacket("comm_chatmsg", COMM_CHAT_NOREAL_SAMPLE);
        await flushSettled(env);
        const noRealEvent = lastWrittenEvent(env);
        assert.strictEqual(noRealEvent.priceCents, 1000, "crealPrice 缺失时回落 cprice（回落路径仍然存在）");
        assert.strictEqual(noRealEvent.uid, "557");
        assert.strictEqual(env.roomDayWrites[env.roomDayWrites.length - 1].patch.incomeCents, 1000,
            "回落标价的那条才产生收入");
        env.ingest.stop();
        ok("㉝ comm_chatmsg 嵌套解包：crealPrice>0 用实付、=0 记免费、缺失才回落标价");
    }

    // ---------- ㉝b 同批：一条券免费 + 一条实付 1000 → 收入只加 1000、paidUv=1、freeCnt=1 ----------
    {
        const env = makeEnv({ withRoomDay: true });
        env.ingest.onPacket("comm_chatmsg", COMM_CHAT_FREE_SAMPLE); // crealPrice=0
        env.ingest.onPacket("comm_chatmsg", COMM_CHAT_SAMPLE);      // crealPrice=1000
        await flushSettled(env);
        const patch = env.roomDayWrites[0].patch;
        assert.strictEqual(patch.incomeCents, 1000, "同一批里只有实付那条产生收入（1000 分）");
        assert.strictEqual(patch.paidUv, 1, "只有实付的那条计入付费人数");
        assert.strictEqual(patch.freeCnt, 1, "券免费那条计入 freeCnt");
        assert.strictEqual(patch.giftCnt, 2, "两条都计份数");
        env.ingest.stop();
        ok("㉝b 同批两条高能弹幕（券免费 + 实付 1000）→ incomeCents=1000、paidUv=1、freeCnt=1");
    }

    // ---------- ㉞ comm_chatmsg 的 dedupKey 唯一，重复投递被去重 ----------
    {
        const env = makeEnv({ withCommitBatch: true });
        env.ingest.onPacket("comm_chatmsg", COMM_CHAT_SAMPLE);
        env.ingest.onPacket("comm_chatmsg", COMM_CHAT_SAMPLE); // 同一条再来一次
        await flushSettled(env);
        assert.strictEqual(env.commitBatches.length, 1);
        assert.strictEqual(env.commitBatches[0].events.length, 1, "同一 dedupKey 的重复投递必须被去重成 1 条");
        assert.strictEqual(env.commitBatches[0].events[0].dedupKey, "cm:v123:555");
        env.ingest.stop();
        ok("㉞ comm_chatmsg：dedupKey 唯一，同一条重复投递只落 1 条明细");
    }

    // ---------- ㉟ 钻粉折算：mn 个月 × 月价（原价 158 元/月 = 15800 分） ----------
    {
        const env = makeEnv({ withRoomDay: true });
        env.ingest.onPacket("dfobc", DF_OPEN_SAMPLE);   // mn=3
        env.ingest.onPacket("dfrbc", DF_RENEW_SAMPLE);  // mn=1
        await flushSettled(env);
        const events = env.writtenBatches[0].list;
        const openEvent = events.filter((item) => item.gfid === "__df_open")[0];
        const renewEvent = events.filter((item) => item.gfid === "__df_renew")[0];
        assert.ok(openEvent && renewEvent, "开通/续费各落一条 gift 事件");
        assert.strictEqual(openEvent.gfcnt, 3, "gfcnt 取 mn（3 个月）");
        assert.strictEqual(openEvent.priceCents, 3 * 15800, "mn=3 → 3 × 15800 = 47400 分（3 个月档月均价）");
        assert.strictEqual(renewEvent.priceCents, 15800, "mn=1 → 15800 分");
        const patch = env.roomDayWrites[0].patch;
        assert.strictEqual(patch.incomeCents, 47400 + 15800, "3 个月档 47400 + 续费 15800 都计入收入");
        assert.strictEqual(patch.paidUv, 2, "有价的钻粉计入付费人数");
        assert.strictEqual(patch.unknownGiftCnt, 0, "月数明确时不算 unknown");
        assert.strictEqual(patch.giftCnt, 4, "giftCnt 按 mn 累加（3+1）");
        env.ingest.stop();
        ok("㉟ 钻粉折算：mn=3 → 47400 分、mn=1 → 15800 分，收入与付费人数都进账");
    }

    // ---------- ㊱ 页面礼物表优先于 ArchiveMeta ----------
    {
        const meta = {
            primeGifts() { return Promise.resolve({ ok: true }); },
            giftPrice() { return { priceCents: 600 }; }, // 元数据说 600
        };
        const env = makeEnv({
            withRoomDay: true,
            ArchiveMeta: meta,
            giftTable: [{ id: "268", name: "办卡", price: 1000, priceType: "YUCHI" }],
        });
        env.ingest.onPacket("dgb", GIFT_SAMPLE); // gfid 268
        await flushSettled(env);
        assert.strictEqual(env.roomDayWrites[0].patch.incomeCents, 6 * 1000,
            "页面 $GIFT_ALL_CONFIG 优先：单价 1000 分（10 鱼翅）× 6 份");
        env.ingest.stop();

        // 没有页面礼物表时回落到 ArchiveMeta.giftPrice
        const fallbackEnv = makeEnv({ withRoomDay: true, ArchiveMeta: meta });
        fallbackEnv.ingest.onPacket("dgb", GIFT_SAMPLE);
        await flushSettled(fallbackEnv);
        assert.strictEqual(fallbackEnv.roomDayWrites[0].patch.incomeCents, 6 * 600,
            "没有页面礼物表时回落到 ArchiveMeta（600 分 × 6）");
        fallbackEnv.ingest.stop();
        ok("㊱ 页面礼物表 $GIFT_ALL_CONFIG 优先取价，缺失时回落 ArchiveMeta");
    }

    // ---------- ㊲ 伪 gfid 不查价目 ----------
    {
        const lookedUp = [];
        const env = makeEnv({
            withRoomDay: true,
            giftTable: [{ id: "__df_open", price: 99999 }, { id: "268", price: 600 }],
        });
        env.ingest.setGiftPriceResolver((gfid) => {
            lookedUp.push(gfid);
            return undefined; // 交回给上层链（页面表 → ArchiveMeta）
        });
        env.ingest.onPacket("comm_chatmsg", COMM_CHAT_SAMPLE); // 自带 priceCents
        env.ingest.onPacket("dfobc", DF_OPEN_SAMPLE);          // 伪 gfid：价由钻粉定价表折算
        env.ingest.onPacket("dgb", GIFT_SAMPLE);               // 真礼物
        await flushSettled(env);

        assert.deepStrictEqual(lookedUp, ["268"],
            "伪 gfid（__comm_chatmsg / __df_open）一律不查价目，只有真礼物才查");
        const patch = env.roomDayWrites[0].patch;
        assert.strictEqual(patch.unknownGiftCnt, 0, "三类都自带/折算出了价 → 没有 unknown");
        assert.strictEqual(patch.incomeCents, 1000 + 6 * 600 + 3 * 15800,
            "收入 = 高能 1000 + 真礼物 6×600 + 钻粉 47400（伪 gfid 不吃礼物表里的 99999）");
        env.ingest.stop();
        ok("㊲ 伪 gfid 不走价目查询：钻粉按定价表折算，礼物表里的同名假价不生效");
    }

    // ---------- ㊳ 年卡档：mn=12 → 12 × 138 元/月（真机价目：12 个月档月均 138） ----------
    {
        const env = makeEnv({ withRoomDay: true });
        const table = env.ingest.getDfPriceTable();
        assert.strictEqual(table.singleMonthCents, 21800, "单月原价 218 元 = 21800 分");
        assert.strictEqual(table.month3Cents, 15800, "3 个月档月均 158 元 = 15800 分");
        assert.strictEqual(table.yearMonthCents, 13800, "12 个月档月均 138 元 = 13800 分");

        env.ingest.onPacket("dfobc", DF_YEAR_SAMPLE);
        await flushSettled(env);
        assert.strictEqual(env.writtenBatches[0].list[0].priceCents, 12 * table.yearMonthCents,
            "mn=12 必须按年卡档：12 × 13800 = 165600（≠ 12 × 15800）");

        // 把年卡月均改成与 3 个月档不同，证明代码走的确实是年卡分支
        assert.strictEqual(env.ingest.setDfPriceTable({ yearMonthCents: 10000 }), true);
        env.ingest.onPacket("dfobc", "type@=dfobc/rid@=9263298/uid@=670/nick@=年钻二号/mn@=12/cdays@=1/");
        await flushSettled(env);
        const yearEvent = lastWrittenEvent(env);
        assert.strictEqual(yearEvent.priceCents, 120000, "改表后 mn=12 必须取新的年卡月均（12 × 10000）");
        assert.notStrictEqual(yearEvent.priceCents, 12 * table.month3Cents,
            "年卡总价与 12 × 3 个月档月均不同 → 证明走的是年卡分支");
        env.ingest.stop();
        ok("㊳ 年卡：mn=12 → 12 × 13800 = 165600（改表后随之变化，证明走年卡档）");
    }

    // ---------- ㊴ mn 缺失：按 1 月计并打 priceUnknown ----------
    {
        const env = makeEnv({ withRoomDay: true });
        env.ingest.onPacket("dfobc", DF_NO_MN_SAMPLE);
        await flushSettled(env);
        const event = lastWrittenEvent(env);
        assert.strictEqual(event.gfcnt, 1, "mn 缺失按 1 个月计");
        assert.strictEqual(event.priceCents, 15800, "mn 缺失按 1 个月 → 默认按连续包月 158 元（不是 218 单月直购）");
        assert.strictEqual(event.priceUnknown, true, "月数不明必须打 priceUnknown");
        const patch = env.roomDayWrites[0].patch;
        assert.strictEqual(patch.unknownGiftCnt, 1, "月数不明 → 额外计一次 unknownGiftCnt（不是免费）");
        assert.strictEqual(patch.incomeCents, 15800, "仍按 1 个月（158 元）计收入（不谎报为 0）");
        env.ingest.stop();
        ok("㊴ mn 缺失：按 1 月计（218 元）+ priceUnknown + unknownGiftCnt+1");
    }

    // ---------- ㊵ 道具订单：独立口径，不进收入/不碰UV ----------
    {
        const env = makeEnv({ withRoomDay: true });
        env.ingest.onPacket("prop_order_finish", PROP_ORDER_SAMPLE);
        await flushSettled(env);
        const event = lastWrittenEvent(env);
        assert.strictEqual(event.gfid, "__order_prop");
        assert.strictEqual(event.gfn, "道具订单");
        assert.strictEqual(event.priceCents, 7900, "实付价 7900 分（79 元）");
        assert.strictEqual(event.isOrder, true);
        assert.strictEqual(event.dedupKey, "po:1671413:" + event.ts + ":凡凡阿冬",
            "dedupKey = po:<goods_id>:<ts>:<user_name>");
        const patch = env.roomDayWrites[0].patch;
        assert.strictEqual(patch.incomeCents, 0, "订单**不进** incomeCents（避免与礼物重复计）");
        assert.strictEqual(patch.paidUv, 0, "订单没有 uid，也不碰付费人数");
        assert.strictEqual(patch.giftUv, 0, "订单不碰送礼人数");
        assert.strictEqual(patch.giftCnt, 0, "订单不碰礼物份数");
        assert.strictEqual(patch.orderCents, 7900, "订单实付单独累加 orderCents");
        assert.strictEqual(patch.orderCount, 1, "订单笔数单独累加 orderCount");
        env.ingest.stop();
        ok("㊵ 道具订单：只累加 orderCents/orderCount，incomeCents 与 UV 全不受影响");
    }

    // ---------- ㊶ 同批「钻粉 mn=1 + 订单 7900」：两条口径各走各的 ----------
    {
        const env = makeEnv({ withRoomDay: true });
        env.ingest.onPacket("dfrbc", DF_RENEW_SAMPLE);
        env.ingest.onPacket("prop_order_finish", PROP_ORDER_SAMPLE);
        await flushSettled(env);
        const patch = env.roomDayWrites[0].patch;
        assert.strictEqual(patch.incomeCents, 15800, "只有钻粉计入收入（1 个月 × 15800）");
        assert.strictEqual(patch.orderCents, 7900, "订单单独计入 orderCents");
        assert.strictEqual(patch.orderCount, 1);
        assert.strictEqual(patch.paidUv, 1, "只有钻粉（有价、有 uid）计入付费人数");
        assert.strictEqual(patch.dfMonths, 1);
        assert.strictEqual(patch.dfCents, 15800);
        env.ingest.stop();
        ok("㊶ 同批钻粉 + 订单：incomeCents=15800、orderCents=7900，互不串味");
    }

    // ---------- ㊷ dfMonths / dfCents：钻粉月数与折算金额 ----------
    {
        const env = makeEnv({ withRoomDay: true });
        env.ingest.onPacket("dfobc", DF_OPEN_SAMPLE);  // mn=3
        env.ingest.onPacket("dfrbc", DF_RENEW_SAMPLE); // mn=1
        await flushSettled(env);
        const patch = env.roomDayWrites[0].patch;
        assert.strictEqual(patch.dfMonths, 4, "钻粉月数合计 = 3 + 1");
        assert.strictEqual(patch.dfCents, 47400 + 15800, "钻粉折算金额合计 = 47400 + 15800");
        env.ingest.stop();
        ok("㊷ dfMonths=4、dfCents=47400+15800（两条钻粉累加）");
    }

    // ---------- ㊸ 无价事件不得计入 dfCents ----------
    {
        const env = makeEnv({ withRoomDay: true });
        env.ingest.onPacket("dfrbc", DF_RENEW_SAMPLE);            // 钻粉 mn=1 → 15800
        env.ingest.onPacket("comm_chatmsg", COMM_CHAT_FREE_SAMPLE); // 高能弹幕 priceCents=0
        env.ingest.onPacket("dgb", "type@=dgb/rid@=9263298/uid@=999/nn@=无名/gfid@=999999/gfn@=未知礼/gfcnt@=1/bcnt@=1/");
        await flushSettled(env);
        const patch = env.roomDayWrites[0].patch;
        assert.strictEqual(patch.dfMonths, 1, "只有钻粉计入 dfMonths");
        assert.strictEqual(patch.dfCents, 15800, "免费高能弹幕与无价礼物都不得计入 dfCents");
        assert.strictEqual(patch.unknownGiftCnt, 1, "无价 dgb 仍计 unknown（与 dfCents 无关）");
        env.ingest.stop();
        ok("㊸ dfCents 只来自钻粉：券免费/无价事件一分都不进");
    }

    // ---------- ㊼ 钻粉定价（真机价目表，按购买月数分档） ----------
    {
        const env = makeEnv({ withRoomDay: true });
        const packet = (type, uid, mn, cst) => "type@=" + type + "/rid@=9263298/uid@=" + uid
            + "/nick@=钻粉用户/mn@=" + mn + "/cst@=" + cst + "/";
        const table = env.ingest.getDfPriceTable();
        assert.strictEqual(table.singleMonthCents, 21800, "单月原价 218 元");
        assert.strictEqual(table.month3Cents, 15800, "3 个月档月均价 158 元");
        assert.strictEqual(table.yearMonthCents, 13800, "12 个月档月均价 138 元");
        assert.strictEqual(table.renewMonthCents, 15800, "连续包月 158 元");

        // ① mn=1 → 15800（连续包月，实务口径）
        env.ingest.onPacket("dfobc", packet("dfobc", "901", 1, BASE_TS));
        await flushSettled(env);
        assert.strictEqual(lastWrittenEvent(env).priceCents, 15800, "① mn=1 → 15800（连续包月 158，不是单月直购 218）");

        // ② mn=3 → 3×15800
        env.ingest.onPacket("dfobc", packet("dfobc", "902", 3, BASE_TS + 1));
        await flushSettled(env);
        assert.strictEqual(lastWrittenEvent(env).priceCents, 3 * 15800, "② mn=3 → 3×15800 = 47400");

        // ③ mn=12 → 12×13800（年卡总价）
        env.ingest.onPacket("dfobc", packet("dfobc", "903", 12, BASE_TS + 2));
        await flushSettled(env);
        const yearEvent = lastWrittenEvent(env);
        assert.strictEqual(yearEvent.priceCents, 12 * 13800, "③ mn=12 → 年卡总价 165600（138/月）");
        assert.notStrictEqual(yearEvent.priceCents, 12 * 15800,
            "年卡不是 12×158（189600）—— 月均价 138 才是年档口径");

        // ④ mn=24 → 两倍年卡总价
        env.ingest.onPacket("dfobc", packet("dfobc", "904", 24, BASE_TS + 3));
        await flushSettled(env);
        assert.strictEqual(lastWrittenEvent(env).priceCents, 2 * 165600, "④ mn=24 → 2×165600 = 331200");

        // ⑤ mn=2 → 两次单月（没有 2 个月档）
        env.ingest.onPacket("dfobc", packet("dfobc", "905", 2, BASE_TS + 4));
        await flushSettled(env);
        assert.strictEqual(lastWrittenEvent(env).priceCents, 2 * 15800, "⑤ mn=2 → 2×15800 = 31600（无 2 个月档，按连续包月）");

        // ⑥ dfrbc 续费：mn=1 → 15800；mn=12 → 年卡价 165600
        env.ingest.onPacket("dfrbc", packet("dfrbc", "906", 1, BASE_TS + 5));
        await flushSettled(env);
        assert.strictEqual(lastWrittenEvent(env).priceCents, 15800, "⑥ dfrbc mn=1 → 续费价 15800");
        env.ingest.onPacket("dfrbc", packet("dfrbc", "907", 12, BASE_TS + 6));
        await flushSettled(env);
        assert.strictEqual(lastWrittenEvent(env).priceCents, 165600, "⑥ dfrbc mn=12 → 年卡续费 165600（138/月）");
        env.ingest.stop();
        ok("㊼ 钻粉分档定价：218/1月、158/3月、138/12月、2×年卡、续费 158 与年卡续 165600");
    }
    console.log("\n=== ArchiveIngest 采集入库测试全部通过（" + passed + " 项） ===");
}

run().then(() => process.exit(0)).catch((error) => {
    console.error("\n✗ 测试失败:", error && error.message);
    if (error && error.stack) console.error(error.stack.split("\n").slice(1, 6).join("\n"));
    process.exit(1);
});
