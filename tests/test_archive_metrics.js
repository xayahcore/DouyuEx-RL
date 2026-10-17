/**
 * tests/test_archive_metrics.js — P0「本地弹幕档案」口径计算（ArchiveMetrics）单元测试
 *
 * 被测对象：src/packages/DanmakuArchive/DanmakuArchive_Metrics.js（纯函数，无 IO）
 * 跑法：node tests/test_archive_metrics.js
 *
 * 钉死的是「口径本身」：
 *   ① 同一 uid 发言 5 次 → danmakuCnt=5，activeUv 只在"当日首次"时为 1
 *   ② 连击 5 条 → 金额只等于 5×单价，绝不能是 1+2+3+4+5 倍
 *   ③ 办卡×6 + 火箭×1 + 价目缺失 → 金额精确、unknownGiftCnt 记 1
 *   ④ uidA 发言 / uidB 送礼 / uidC 进场 → activeUv=2、enterUv=1
 *   ⑤ summarize 的除零与 clamp
 *   ⑥ 异常输入不产生 NaN、不改入参
 *   ⑦ 覆盖率：day / yesterday(1440) / 7d / 30d 的分母与本场无关
 *   ⑧ 多窗口汇总（含 yesterday 等价单日）
 *   ⑨ 事件瘦身后（gift 没有 hits/bf/receiveUid）收入仍然算得对
 *
 * 2026-10-17 删减：minutes 分钟桶、nobleCnt、summarize 的 last60 分支 —— 都已随功能下线删除，
 * 本测试对应断言改成"必须不存在"。
 */

const fs = require("fs");
const path = require("path");
const assert = require("assert");

const SRC_PATH = path.join(__dirname, "../src/packages/DanmakuArchive/DanmakuArchive_Metrics.js");

// 2026-10-17 10:20:47 +08:00 附近的一条真实 cst
const BASE_TS = 1792202447034;

function loadMetrics() {
    const source = fs.readFileSync(SRC_PATH, "utf8");
    // 模块是纯脚本（顶层 var），用 Function 求值后把对象取出来，不污染本进程全局
    const factory = new Function(source + "\nreturn ArchiveMetrics;");
    return factory();
}

function chatEvent(uid, ts, extra) {
    const event = { kind: "chat", uid: uid, nn: "用户" + uid, txt: "弹幕", ts: ts, rid: "9263298", dayKey: "2026-10-17" };
    return Object.assign(event, extra || {});
}

function giftEvent(uid, giftId, giftCount, batchCount, ts, extra) {
    const event = {
        kind: "gift",
        uid: uid,
        nn: "用户" + uid,
        gfid: giftId,
        gfn: "礼物" + giftId,
        gfcnt: giftCount,
        bcnt: batchCount,
        bg: 0,
        ts: ts,
        rid: "9263298",
        dayKey: "2026-10-17"
    };
    return Object.assign(event, extra || {});
}

function enterEvent(uid, ts, extra) {
    const event = { kind: "enter", uid: uid, nn: "路人" + uid, ts: ts, rid: "9263298", dayKey: "2026-10-17" };
    return Object.assign(event, extra || {});
}

function makeDay(metrics, dayKey, fields) {
    return Object.assign(metrics.newRoomDay("9263298", dayKey), fields || {});
}

let passed = 0;
function ok(name) {
    passed++;
    console.log("  ✓ " + name);
}

function run() {
    console.log("=== 正在运行 ArchiveMetrics 口径单元测试 ===\n");
    const metrics = loadMetrics();

    // ---------- 0. newRoomDay 形状（minutes / nobleCnt 已删） ----------
    {
        const roomDay = metrics.newRoomDay("9263298", "2026-10-17");
        assert.strictEqual(roomDay.ridDay, "9263298|2026-10-17", "ridDay 必须是 rid|dayKey（DB 主键）");
        const numberFields = [
            "danmakuCnt", "incomeCents", "giftCnt", "activeUv", "chatUv", "giftUv",
            "paidUv", "enterUv", "bagCnt", "freeCnt", "unknownGiftCnt",
            "firstTs", "lastTs", "updatedAt",
        ];
        numberFields.forEach((field) => {
            assert.strictEqual(roomDay[field], 0, "数值字段 " + field + " 初始必须是 0");
        });
        assert.strictEqual(Object.prototype.hasOwnProperty.call(roomDay, "minutes"), false,
            "minutes 分钟桶已删除（时段热力功能下线），聚合里不得再有这个字段");
        assert.strictEqual(Object.prototype.hasOwnProperty.call(roomDay, "nobleCnt"), false,
            "nobleCnt 已删除（贵宾数停止采集）");
        ok("newRoomDay：ridDay 正确、14 个数值字段全 0、无 minutes / 无 nobleCnt");
    }

    // ---------- ① 同 uid 发言 5 次 ----------
    {
        const base = metrics.newRoomDay("9263298", "2026-10-17");
        const baseSnapshot = JSON.stringify(base);
        let roomDay = base;
        for (let index = 0; index < 5; index++) {
            roomDay = metrics.applyEvent(roomDay, chatEvent("111", BASE_TS + index * 1000), {
                isNewActiveUid: index === 0,
                isNewChatUid: index === 0,
            });
        }
        assert.strictEqual(roomDay.danmakuCnt, 5, "5 条弹幕必须计 5");
        assert.strictEqual(roomDay.activeUv, 1, "同一 uid 只算 1 个活跃用户");
        assert.strictEqual(roomDay.chatUv, 1, "同一 uid 只算 1 个发言用户");
        assert.strictEqual(roomDay.giftCnt, 0, "发言不得增加礼物份数");
        assert.strictEqual(roomDay.incomeCents, 0, "发言不得产生金额");
        assert.strictEqual(JSON.stringify(base), baseSnapshot, "applyEvent 不得修改入参");
        assert.ok(roomDay !== base, "applyEvent 必须返回新对象");
        assert.strictEqual(Object.prototype.hasOwnProperty.call(roomDay, "minutes"), false, "不得再累积分钟桶");
        ok("① 同 uid 发言 5 次 → danmakuCnt=5、activeUv=1、chatUv=1、入参未被改");
    }

    // ---------- ② 连击 5 条：金额只能用 gfcnt×单价 ----------
    {
        const unitPrice = 100; // 单位 0.01 鱼翅 → 1 鱼翅
        let roomDay = metrics.newRoomDay("9263298", "2026-10-17");
        // 瘦身后 gift 事件里没有 hits 字段：金额只能来自 gfcnt × 单价
        for (let index = 0; index < 5; index++) {
            roomDay = metrics.applyEvent(
                roomDay,
                giftEvent("222", "268", 1, index + 1, BASE_TS + index * 1000),
                { giftPrice: unitPrice, isNewActiveUid: index === 0, isNewGiftUid: index === 0 }
            );
        }
        assert.strictEqual(roomDay.incomeCents, 5 * unitPrice, "5 条连击（各 gfcnt=1）金额必须是 5×单价");
        assert.strictEqual(roomDay.giftCnt, 5, "giftCnt 按 gfcnt 累加");
        assert.strictEqual(roomDay.giftUv, 1, "同一 uid 只算 1 个送礼用户");
        assert.strictEqual(roomDay.activeUv, 1, "送礼也算活跃，但仍只有 1 个 uid");
        ok("② 连击 5 条 → 金额 = 5×单价、giftCnt=5（事件里没有 hits 也不影响）");
    }

    // ---------- ③ 办卡×6 + 火箭×1 + 价目缺失 ----------
    {
        let roomDay = metrics.newRoomDay("9263298", "2026-10-17");
        roomDay = metrics.applyEvent(
            roomDay,
            giftEvent("301", "268", 6, 1, BASE_TS),
            { giftPrice: 600, isNewActiveUid: true, isNewGiftUid: true, isNewPaidUid: true }
        );
        roomDay = metrics.applyEvent(
            roomDay,
            giftEvent("302", "20002", 1, 1, BASE_TS + 1000),
            { giftPrice: 50000, isNewActiveUid: true, isNewGiftUid: true, isNewPaidUid: true }
        );
        roomDay = metrics.applyEvent(
            roomDay,
            giftEvent("303", "999999", 3, 1, BASE_TS + 2000),
            { giftPrice: null, isNewActiveUid: true, isNewGiftUid: true }
        );
        assert.strictEqual(roomDay.incomeCents, 6 * 600 + 50000, "办卡×6 + 火箭×1 的金额必须精确");
        assert.strictEqual(roomDay.unknownGiftCnt, 1, "价目缺失只记 unknownGiftCnt，不加金额");
        assert.strictEqual(roomDay.giftCnt, 6 + 1 + 3, "giftCnt 仍按 gfcnt 累加（6+1+3）");
        assert.strictEqual(roomDay.paidUv, 2, "两笔已知付费礼物的两个 uid 计入 paidUv");
        ok("③ 办卡×6+火箭×1+未知价 → incomeCents=53600、unknownGiftCnt=1、paidUv=2");
    }

    // ---------- ③b 免费礼物 / 背包礼物单独记 ----------
    {
        let roomDay = metrics.newRoomDay("9263298", "2026-10-17");
        roomDay = metrics.applyEvent(roomDay, giftEvent("401", "1", 4, 1, BASE_TS, { bg: 1 }), { giftPrice: 0 });
        assert.strictEqual(roomDay.incomeCents, 0, "单价 0 的免费礼物不得产生金额");
        assert.strictEqual(roomDay.freeCnt, 1, "免费礼物记 freeCnt");
        assert.strictEqual(roomDay.bagCnt, 1, "bg===1 记 bagCnt");
        assert.strictEqual(roomDay.paidUv, 0, "免费礼物不计付费人数");
        assert.strictEqual(roomDay.unknownGiftCnt, 0, "单价已知为 0 不算 unknown");
        ok("③b 免费礼物（单价 0）不加金额，freeCnt / bagCnt 分开记");
    }

    // ---------- ④ activeUv 只由 chat/gift 递增，enter 只计 enterUv ----------
    {
        let roomDay = metrics.newRoomDay("9263298", "2026-10-17");
        roomDay = metrics.applyEvent(roomDay, chatEvent("uidA", BASE_TS), { isNewActiveUid: true, isNewChatUid: true });
        roomDay = metrics.applyEvent(roomDay, giftEvent("uidB", "268", 1, 1, BASE_TS), { giftPrice: 100, isNewActiveUid: true, isNewGiftUid: true, isNewPaidUid: true });
        roomDay = metrics.applyEvent(roomDay, enterEvent("uidC", BASE_TS), {});
        assert.strictEqual(roomDay.activeUv, 2, "activeUv = |chat ∪ gift| = 2，进场用户不算活跃");
        assert.strictEqual(roomDay.enterUv, 1, "进场单独计 enterUv=1");
        assert.strictEqual(roomDay.chatUv, 1);
        assert.strictEqual(roomDay.giftUv, 1);

        roomDay = metrics.applyEvent(roomDay, enterEvent("uidC", BASE_TS + 5000), { isNewEnterUid: false });
        assert.strictEqual(roomDay.enterUv, 1, "isNewEnterUid=false 时不得再累加 enterUv");
        assert.strictEqual(roomDay.activeUv, 2, "进场永远不得影响 activeUv");
        ok("④ uidA 发言 / uidB 送礼 / uidC 进场 → activeUv=2、enterUv=1");
    }

    // ---------- ⑤ summarize：除零与 clamp ----------
    {
        const empty = metrics.summarize(metrics.newRoomDay("9263298", "2026-10-17"), "day");
        assert.strictEqual(empty.avgPerUser, 0, "空房间 avgPerUser 必须是 0 而不是 NaN/Infinity");
        assert.strictEqual(empty.lurkRate, 0, "空房间 lurkRate 必须是 0");
        assert.strictEqual(empty.incomeYc, 0);
        assert.strictEqual(empty.danmakuValue, 0);

        const sample = makeDay(metrics, "2026-10-17", {
            danmakuCnt: 5, chatUv: 2, giftUv: 2, activeUv: 4, enterUv: 10, incomeCents: 53600,
        });
        const summary = metrics.summarize(sample, "day");
        assert.strictEqual(summary.avgPerUser, 2.5, "avgPerUser = 5 / 2");
        assert.strictEqual(summary.lurkRate, 0.6, "lurkRate = (10-4)/10");
        assert.strictEqual(summary.incomeYc, 536, "incomeYc = incomeCents / 100");
        assert.deepStrictEqual(
            Object.keys(summary).sort(),
            ["activeUv", "avgPerUser", "chatUv", "danmakuValue", "enterUv", "giftCnt", "giftUv", "incomeYc", "lurkRate"],
            "summarize 的字段集合必须是契约里的那 9 项"
        );

        const negative = makeDay(metrics, "2026-10-17", { enterUv: 1, activeUv: 3 });
        assert.strictEqual(metrics.summarize(negative, "day").lurkRate, 0, "activeUv > enterUv 时必须 clamp 到 0");

        const allLurk = makeDay(metrics, "2026-10-17", { enterUv: 10, activeUv: 0 });
        assert.strictEqual(metrics.summarize(allLurk, "day").lurkRate, 1, "零活跃时必须 clamp 到 1");

        const zeroChatUv = makeDay(metrics, "2026-10-17", { danmakuCnt: 7, chatUv: 0 });
        assert.strictEqual(metrics.summarize(zeroChatUv, "day").avgPerUser, 7, "chatUv=0 时按 max(…,1) 除，得 7");
        ok("⑤ summarize：除零安全、lurkRate 双向 clamp、字段集合固定");
    }

    // ---------- ⑤b last60 分支已删除：传 last60 也只按当日累计返回 ----------
    {
        let roomDay = metrics.newRoomDay("9263298", "2026-10-17");
        roomDay = metrics.applyEvent(roomDay, chatEvent("555", BASE_TS), { isNewActiveUid: true, isNewChatUid: true });
        roomDay = metrics.applyEvent(roomDay, giftEvent("556", "268", 2, 1, BASE_TS), { giftPrice: 600, isNewActiveUid: true, isNewGiftUid: true });
        const daySummary = metrics.summarize(roomDay, "day");
        const legacySummary = metrics.summarize(roomDay, { window: "last60" });
        assert.deepStrictEqual(legacySummary, daySummary, "last60 分支已删除：任何 window 都是当日累计，且不再有 null");
        assert.strictEqual(legacySummary.danmakuValue, 1);
        assert.strictEqual(legacySummary.incomeYc, 12, "2 份 × 600 分 = 1200 分 = 12 鱼翅");
        assert.strictEqual(typeof legacySummary.activeUv, "number", "不得再返回 null（分钟桶没了）");
        ok("⑤b last60 已删除：传 last60 与 day 结果完全一致");
    }

    // ---------- ⑥ 异常输入：不抛、不 NaN、未知 kind 不污染 ----------
    {
        const base = metrics.newRoomDay("9263298", "2026-10-17");
        const baseSnapshot = JSON.stringify(base);

        const badTs = metrics.applyEvent(base, chatEvent("666", "不是数字"), { isNewActiveUid: true, isNewChatUid: true });
        assert.strictEqual(badTs.danmakuCnt, 1, "ts 异常时仍应计弹幕条数");
        assert.strictEqual(badTs.firstTs, 0, "ts 异常时不得写 firstTs");
        assert.strictEqual(badTs.lastTs, 0, "ts 异常时不得写 lastTs");

        const weird = metrics.applyEvent(base, { kind: "unknown-kind", ts: BASE_TS }, {});
        assert.strictEqual(JSON.stringify(weird), JSON.stringify(metrics.newRoomDay("9263298", "2026-10-17")), "未知 kind 不得改动任何指标");

        const nullEvent = metrics.applyEvent(base, null, {});
        assert.strictEqual(JSON.stringify(nullEvent), JSON.stringify(metrics.newRoomDay("9263298", "2026-10-17")), "event 为 null 时返回等价的空聚合");

        const negativeCount = metrics.applyEvent(base, giftEvent("777", "268", -5, 1, BASE_TS), { giftPrice: 100 });
        assert.strictEqual(negativeCount.giftCnt, 0, "负数 gfcnt 归零");

        const noRoomDay = metrics.applyEvent(null, chatEvent("888", BASE_TS), {});
        assert.strictEqual(noRoomDay.danmakuCnt, 1, "roomDay 为 null 时也要能起一个新聚合");

        const serialized = JSON.stringify([badTs, weird, nullEvent, negativeCount, noRoomDay]);
        assert.ok(serialized.indexOf("NaN") === -1, "任何路径都不得产出 NaN: " + serialized);
        assert.strictEqual(JSON.stringify(base), baseSnapshot, "全程不得修改入参");
        ok("⑥ 异常 ts / 未知 kind / null event / 负数 / null roomDay：不抛、不 NaN、不改入参");
    }

    // ---------- ⑦ isActiveEvent；minuteKeyOf 已随分钟桶删除 ----------
    {
        assert.strictEqual(metrics.isActiveEvent({ kind: "chat" }), true);
        assert.strictEqual(metrics.isActiveEvent({ kind: "gift" }), true);
        assert.strictEqual(metrics.isActiveEvent({ kind: "enter" }), false, "enter 不是活跃事件");
        assert.strictEqual(metrics.isActiveEvent(null), false, "null 必须安全返回 false");
        assert.strictEqual(metrics.activeUvDelta({ kind: "gift" }), true, "activeUvDelta 是 isActiveEvent 的兼容别名");
        assert.strictEqual(typeof metrics.minuteKeyOf, "undefined", "minuteKeyOf 已随分钟桶一起删除");
        ok("⑦ isActiveEvent / activeUvDelta 边界正确；minuteKeyOf 已删除");
    }

    // ---------- ⑧ 覆盖率 coverageOf：day / yesterday / 7d / 30d ----------
    {
        const today = new Date();
        const atThirteen = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 13, 0, 0).getTime();
        const atMidnightPlus30s = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 0, 0, 30).getTime();

        const dayCoverage = metrics.coverageOf(60, "day", atThirteen);
        assert.strictEqual(typeof dayCoverage, "number", "coverageOf 必须返回 number");
        assert.strictEqual(dayCoverage, 7.7, "coverageOf(60, day, 13:00) 必须约等于 7.7，实际 " + dayCoverage);
        assert.ok(Math.abs(dayCoverage - 7.7) <= 0.2, "允许 ±0.2 误差");

        assert.strictEqual(metrics.coverageOf(1, "day", atMidnightPlus30s), 100, "不足 1 分钟的分母按 1 计");
        assert.strictEqual(metrics.coverageOf(0, "day", atThirteen), 0, "观测 0 分钟 → 覆盖率 0");
        assert.strictEqual(metrics.coverageOf(60, "7d", atThirteen), 0.6, "60/10080×100 = 0.595 → 0.6");
        assert.strictEqual(metrics.coverageOf(1440, "30d", atThirteen), 3.3, "1440/43200×100 = 3.33 → 3.3");
        assert.strictEqual(metrics.coverageOf(43200, "30d", atThirteen), 100, "整窗都观测到 → 100");
        // 分子可能混了多个 ridDay：不 clamp，>100 是要暴露的事实
        assert.strictEqual(metrics.coverageOf(50000, "30d", atThirteen), 115.7, "多房间累加允许 >100（不悄悄截断）");
        // yesterday 分母恒 1440，与当前时刻无关
        assert.strictEqual(metrics.coverageOf(720, "yesterday", atThirteen), 50, "720/1440 = 50%");
        assert.strictEqual(metrics.coverageOf(720, "yesterday", atMidnightPlus30s), 50, "yesterday 分母不受 now 影响");
        assert.strictEqual(metrics.coverageOf(1440, "yesterday", atThirteen), 100);
        ok("⑧a coverageOf：day 7.7 / 7d 0.6 / 30d 3.3 / yesterday 恒 1440（720→50%）");
    }
    {
        const now = Date.now();
        const today = new Date();
        const atThirteen = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 13, 0, 0).getTime();
        assert.doesNotThrow(() => metrics.coverageOf(null, "day", now));
        assert.strictEqual(metrics.coverageOf(null, "day", now), 0, "null → 0");
        assert.strictEqual(metrics.coverageOf(undefined, "7d", now), 0, "undefined → 0");
        assert.strictEqual(metrics.coverageOf("-100", "7d", now), 0, "负数字符串 → 0（不出现负覆盖率）");
        assert.strictEqual(metrics.coverageOf("不是数字", "7d", now), 0, "非数字串 → 0");
        assert.strictEqual(metrics.coverageOf(NaN, "7d", now), 0, "NaN → 0");
        assert.strictEqual(metrics.coverageOf(60, "未知窗口", now), 0, "未知窗口 → 分母 0 → 0");
        assert.strictEqual(
            metrics.coverageOf(60, undefined, atThirteen),
            metrics.coverageOf(60, "day", atThirteen),
            "window 缺省按 day 处理"
        );
        assert.strictEqual(metrics.coverageOf(null, "yesterday", now), 0, "yesterday 的非法分子同样 0");
        const invalidNow = metrics.coverageOf(60, "day", 0);
        assert.ok(typeof invalidNow === "number" && isFinite(invalidNow), "nowMs 非法时回落 Date.now()，仍是有限数");
        ok("⑧b coverageOf 非法输入全部安全返回 0，不抛不 NaN");
    }

    // ---------- ⑨ 三窗口汇总 summarizeWindow（nobleCnt 已删） ----------
    {
        const day1 = makeDay(metrics, "2026-10-17", { danmakuCnt: 10, incomeCents: 10000, activeUv: 5, chatUv: 4, giftUv: 2, enterUv: 20, observedMin: 30 });
        const day2 = makeDay(metrics, "2026-10-18", { danmakuCnt: 20, incomeCents: 20000, activeUv: 7, chatUv: 6, giftUv: 3, enterUv: 10, observedMin: 60 });
        const day3 = makeDay(metrics, "2026-10-19", { danmakuCnt: 30, incomeCents: 30000, activeUv: 9, chatUv: 8, giftUv: 4, enterUv: 5, observedMin: 90 });

        const single = metrics.summarizeWindow([day1], "day");
        assert.strictEqual(single.danmakuValue, 10);
        assert.strictEqual(single.incomeYc, 100, "incomeCents 10000 → 100 鱼翅");
        assert.strictEqual(single.activeUv, 5);
        assert.strictEqual(single.chatUv, 4);
        assert.strictEqual(single.giftUv, 2);
        assert.strictEqual(single.enterUv, 20);
        assert.strictEqual(single.observedMin, 30);
        assert.strictEqual(single.activeUvIsPersonDay, false, "day 窗口的 activeUv 是真人去重数");
        assert.strictEqual(single.avgPerUser, 2.5, "10 / 4 = 2.5（一位小数）");
        assert.strictEqual(single.window, "day");
        assert.strictEqual(Object.prototype.hasOwnProperty.call(single, "nobleCnt"), false, "nobleCnt 已删除");

        const three = metrics.summarizeWindow([day1, day2, day3], "7d");
        assert.strictEqual(three.danmakuValue, 60, "10+20+30");
        assert.strictEqual(three.incomeYc, 600, "100+200+300");
        assert.strictEqual(three.activeUv, 21, "5+7+9（人日）");
        assert.strictEqual(three.chatUv, 18);
        assert.strictEqual(three.giftUv, 9);
        assert.strictEqual(three.enterUv, 35);
        assert.strictEqual(three.observedMin, 180);
        assert.strictEqual(three.activeUvIsPersonDay, true, "7d 的 activeUv 是人日，必须标志出来");
        assert.strictEqual(three.avgPerUser, 3.3, "60 / 18 = 3.33 → 一位小数 3.3");
        assert.strictEqual(three.window, "7d");

        const empty = metrics.summarizeWindow([], "30d");
        assert.deepStrictEqual(
            Object.keys(empty).sort(),
            ["activeUv", "activeUvIsPersonDay", "avgPerUser", "chatUv", "danmakuValue", "dfCents", "dfMonths",
                "enterUv", "giftUv", "incomeYc", "observedMin", "orderCents", "orderCount", "window"],
            "summarizeWindow 必须返回契约里的 14 个字段（含订单/钻粉独立口径）"
        );
        ["danmakuValue", "incomeYc", "activeUv", "chatUv", "giftUv", "enterUv", "observedMin", "avgPerUser",
            "orderCents", "orderCount", "dfMonths", "dfCents"].forEach((field) => {
            assert.strictEqual(empty[field], 0, "空数组的 " + field + " 必须是 0（不是 NaN/null）");
        });
        assert.strictEqual(empty.activeUvIsPersonDay, true, "非 day 窗口恒为人日口径");
        assert.strictEqual(empty.window, "30d");
        ok("⑨ 三窗口汇总：单日 / 3 天 / 空数组，字段和与 activeUvIsPersonDay 正确（无 nobleCnt）");
    }

    // ---------- ⑩ 两种入参形状兼容（room_day[] 与 sum+latest） ----------
    {
        const day1 = makeDay(metrics, "2026-10-17", { danmakuCnt: 10, incomeCents: 10000, activeUv: 5, chatUv: 4, giftUv: 2, enterUv: 20, observedMin: 30 });
        const day2 = makeDay(metrics, "2026-10-18", { danmakuCnt: 20, incomeCents: 20000, activeUv: 7, chatUv: 6, giftUv: 3, enterUv: 10, observedMin: 60 });

        const fromArray = metrics.summarizeWindow([day1, day2], "7d");
        const sumObject = metrics.sumOfDays([day1, day2]);
        const fromSum = metrics.summarizeWindow(sumObject, "7d");
        assert.deepStrictEqual(fromSum, fromArray, "直接给 sum 对象必须与给数组等价");

        const fromPairs = metrics.summarizeWindow({
            sum: { danmakuCnt: 12, incomeCents: 536, activeUv: 3, chatUv: 2, giftUv: 1, enterUv: 6, observedMin: 40 },
            latest: { dayKey: "2026-10-19" },
        }, "30d");
        assert.strictEqual(fromPairs.danmakuValue, 12, "sum.danmakuCnt 直接用");
        assert.strictEqual(fromPairs.incomeYc, 5.36, "incomeCents 536 → 5.36（两位小数）");
        assert.strictEqual(fromPairs.observedMin, 40);
        assert.strictEqual(fromPairs.activeUvIsPersonDay, true);
        assert.strictEqual(fromPairs.window, "30d");
        assert.strictEqual(Object.prototype.hasOwnProperty.call(fromPairs, "nobleCnt"), false, "latest 里的 nobleCnt 不再被取用");

        assert.doesNotThrow(() => metrics.summarizeWindow(null, "day"));
        assert.strictEqual(metrics.summarizeWindow(null, "day").danmakuValue, 0);
        assert.strictEqual(metrics.summarizeWindow("垃圾入参", "7d").danmakuValue, 0);
        ok("⑩ summarizeWindow 兼容 room_day[] / sum 对象 / {sum,latest}，非法入参全 0");
    }

    // ---------- ⑪ yesterday 等价单日（Lead ⑧） ----------
    {
        const day1 = makeDay(metrics, "2026-10-16", { danmakuCnt: 42, incomeCents: 12345, activeUv: 9, chatUv: 7, giftUv: 3, enterUv: 30, observedMin: 720 });
        const yesterday = metrics.summarizeWindow([day1], "yesterday");
        const asDay = metrics.summarizeWindow([day1], "day");
        assert.strictEqual(yesterday.danmakuValue, asDay.danmakuValue, "yesterday 与 day 的数值完全一致");
        assert.strictEqual(yesterday.incomeYc, 123.45, "12345 分 → 123.45 鱼翅");
        assert.strictEqual(yesterday.activeUv, 9);
        assert.strictEqual(yesterday.observedMin, 720);
        assert.strictEqual(yesterday.window, "yesterday", "窗口名必须如实回显");
        assert.strictEqual(yesterday.activeUvIsPersonDay, true, "yesterday 不是当日实时口径 → 人日标志为 true");
        assert.strictEqual(metrics.summarizeWindow([day1, day1], "yesterday").danmakuValue, 84, "放两天就是两天之和");
        ok("⑪ summarizeWindow 的 yesterday：等价单日汇总（窗口名如实回显）");
    }

    // ---------- ⑫ 事件瘦身后仍算得对收入（Lead ⑨） ----------
    {
        // 瘦身后的 gift 事件只有 gfid/gfn/gfcnt/bcnt/bg —— 没有 hits / bf / receiveUid
        const slim = { kind: "gift", uid: "9", nn: "大哥", rid: "9263298", ts: BASE_TS, dayKey: "2026-10-17", gfid: "268", gfn: "办卡", gfcnt: 6, bcnt: "1", bg: 0 };
        let roomDay = metrics.newRoomDay("9263298", "2026-10-17");
        roomDay = metrics.applyEvent(roomDay, slim, { giftPrice: 600, isNewActiveUid: true, isNewGiftUid: true, isNewPaidUid: true });
        assert.strictEqual(roomDay.incomeCents, 3600, "6 × 600 = 3600 分（没有 hits 也不会算错）");
        assert.strictEqual(roomDay.giftCnt, 6);
        assert.strictEqual(roomDay.paidUv, 1, "付费人数按单价>0 判定，不依赖 bf 字段");
        assert.strictEqual(roomDay.bagCnt, 0, "bg=0 不计背包");
        // 缺 gfcnt 的脏事件也不许 NaN
        const broken = metrics.applyEvent(roomDay, { kind: "gift", uid: "10", ts: BASE_TS, gfid: "268" }, { giftPrice: 600 });
        assert.strictEqual(broken.incomeCents, 3600, "缺 gfcnt 时金额不变（按 0 份）");
        assert.ok(JSON.stringify(broken).indexOf("NaN") === -1, "缺字段也不得产出 NaN");
        const noPrice = metrics.applyEvent(roomDay, { kind: "gift", uid: "11", ts: BASE_TS, gfcnt: 2 }, { giftPrice: null });
        assert.strictEqual(noPrice.incomeCents, 3600, "价目缺失不加金额");
        assert.strictEqual(noPrice.unknownGiftCnt, 1);
        ok("⑫ 瘦身后 gift（无 hits/bf/receiveUid）收入仍精确，缺字段不产生 NaN");
    }

    // ---------- ⑬ 高能弹幕（事件自带 priceCents）：有价计收入与付费，免费只计份数 ----------
    {
        let roomDay = metrics.newRoomDay("9263298", "2026-10-17");
        const energy = { kind: "gift", uid: "555", rid: "9263298", ts: BASE_TS, dayKey: "2026-10-17", gfid: "__comm_chatmsg", gfn: "高能弹幕", gfcnt: 1, bcnt: String(BASE_TS), bg: 0, priceCents: 1000 };
        roomDay = metrics.applyEvent(roomDay, energy, { isNewActiveUid: true, isNewGiftUid: true, isNewPaidUid: true });
        assert.strictEqual(roomDay.incomeCents, 1000, "priceCents=1000（10 鱼翅）必须计入收入");
        assert.strictEqual(roomDay.paidUv, 1, "有价高能弹幕计入付费人数");
        assert.strictEqual(roomDay.giftUv, 1);
        assert.strictEqual(roomDay.giftCnt, 1);
        assert.strictEqual(roomDay.unknownGiftCnt, 0, "自带价格 → 不算未知");

        const freeEnergy = { kind: "gift", uid: "556", rid: "9263298", ts: BASE_TS + 1000, dayKey: "2026-10-17", gfid: "__comm_chatmsg", gfn: "高能弹幕", gfcnt: 1, bcnt: "b", bg: 0, priceCents: 0 };
        roomDay = metrics.applyEvent(roomDay, freeEnergy, { isNewActiveUid: true, isNewGiftUid: true, isNewPaidUid: true });
        assert.strictEqual(roomDay.incomeCents, 1000, "priceCents=0（道具券免费）不得增加收入");
        assert.strictEqual(roomDay.paidUv, 1, "免费高能弹幕不计付费人数");
        assert.strictEqual(roomDay.giftCnt, 2, "份数照常 +1");
        assert.strictEqual(roomDay.freeCnt, 1, "单价 0 记为免费");
        assert.strictEqual(roomDay.unknownGiftCnt, 0, "明确为 0 不是未知");
        ok("⑬ 高能弹幕：priceCents=1000 → 收入+1000/paidUv+1；=0 → 只计份数与免费");
    }

    // ---------- ⑭ 钻粉（无价）：计送礼人数与 unknown，绝不计收入与付费 ----------
    {
        let roomDay = metrics.newRoomDay("9263298", "2026-10-17");
        const diamondFans = { kind: "gift", uid: "666", rid: "9263298", ts: BASE_TS, dayKey: "2026-10-17", gfid: "__df_open", gfn: "钻粉开通", gfcnt: 3, bcnt: String(BASE_TS), bg: 0 };
        roomDay = metrics.applyEvent(roomDay, diamondFans, { isNewActiveUid: true, isNewGiftUid: true, giftPrice: null });
        assert.strictEqual(roomDay.giftUv, 1, "钻粉要计入送礼人数");
        assert.strictEqual(roomDay.giftCnt, 3, "gfcnt = mn（3 个月）");
        assert.strictEqual(roomDay.incomeCents, 0, "钻粉无价 → 收入不变");
        assert.strictEqual(roomDay.unknownGiftCnt, 1, "钻粉无价 → 计 unknownGiftCnt");
        assert.strictEqual(roomDay.paidUv, 0, "钻粉不计付费人数（付费人数只认有价礼物）");
        assert.strictEqual(roomDay.freeCnt, 0, "无价不等于免费");
        ok("⑭ 钻粉：giftUv+1、giftCnt+=mn、incomeCents 不变、unknownGiftCnt+1、paidUv 不变");
    }

    // ---------- ⑮ 道具订单：只走独立口径，不污染礼物/收入/UV ----------
    {
        let roomDay = metrics.newRoomDay("9263298", "2026-10-17");
        const order = {
            kind: "gift", uid: "", rid: "9263298", ts: BASE_TS, dayKey: "2026-10-17",
            gfid: "__order_prop", gfn: "道具订单", gfcnt: 1, bcnt: String(BASE_TS), bg: 0,
            priceCents: 7900, isOrder: true,
        };
        // 即便调用方误传了 isNewActiveUid，订单也不该碰任何 UV
        roomDay = metrics.applyEvent(roomDay, order, { isNewActiveUid: true, isNewGiftUid: true, isNewPaidUid: true });
        assert.strictEqual(roomDay.orderCents, 7900, "订单实付进 orderCents");
        assert.strictEqual(roomDay.orderCount, 1, "订单笔数进 orderCount");
        assert.strictEqual(roomDay.incomeCents, 0, "订单**不**进 incomeCents（避免与礼物重复计）");
        assert.strictEqual(roomDay.giftCnt, 0, "订单不计礼物份数");
        assert.strictEqual(roomDay.giftUv, 0, "订单不计送礼人数");
        assert.strictEqual(roomDay.paidUv, 0, "订单不计付费人数");
        assert.strictEqual(roomDay.activeUv, 0, "订单没有 uid，不进活跃人数");
        assert.strictEqual(roomDay.unknownGiftCnt, 0, "订单有明确实付，不算 unknown");

        // 两笔订单累加
        roomDay = metrics.applyEvent(roomDay, Object.assign({}, order, { priceCents: 2100, ts: BASE_TS + 1000 }), {});
        assert.strictEqual(roomDay.orderCents, 10000, "两笔订单累加 7900 + 2100");
        assert.strictEqual(roomDay.orderCount, 2);
        ok("⑮ __order_prop：只累加 orderCents/orderCount，giftUv/giftCnt/paidUv/incomeCents 全为 0");
    }

    // ---------- ⑯ 钻粉：priceCents 是总额（不再乘 mn），并单独累 dfMonths/dfCents ----------
    {
        let roomDay = metrics.newRoomDay("9263298", "2026-10-17");
        const dfOpen = {
            kind: "gift", uid: "666", rid: "9263298", ts: BASE_TS, dayKey: "2026-10-17",
            gfid: "__df_open", gfn: "钻粉开通", gfcnt: 3, bcnt: String(BASE_TS), bg: 0,
            priceCents: 3 * 15800, priceIsTotal: true,
        };
        roomDay = metrics.applyEvent(roomDay, dfOpen, { isNewActiveUid: true, isNewGiftUid: true, isNewPaidUid: true });
        assert.strictEqual(roomDay.incomeCents, 47400, "priceIsTotal：收入按总额 47400 计，**不是** 3 × 47400");
        assert.strictEqual(roomDay.dfMonths, 3, "dfMonths 累加 mn");
        assert.strictEqual(roomDay.dfCents, 47400, "dfCents 累加折算金额");
        assert.strictEqual(roomDay.paidUv, 1, "有价钻粉计入付费人数");
        assert.strictEqual(roomDay.giftCnt, 3, "giftCnt 仍按 mn 累加");

        // 月数不明：仍按 1 个月计收入，但额外记一次 unknownGiftCnt
        const dfUnknown = {
            kind: "gift", uid: "668", rid: "9263298", ts: BASE_TS + 1000, dayKey: "2026-10-17",
            gfid: "__df_open", gfn: "钻粉开通", gfcnt: 1, bcnt: "b", bg: 0,
            priceCents: 15800, priceIsTotal: true, priceUnknown: true,
        };
        roomDay = metrics.applyEvent(roomDay, dfUnknown, { isNewActiveUid: true, isNewGiftUid: true, isNewPaidUid: true });
        assert.strictEqual(roomDay.unknownGiftCnt, 1, "priceUnknown=true 时额外计一次 unknownGiftCnt");
        assert.strictEqual(roomDay.incomeCents, 47400 + 15800, "但收入仍按 1 个月计入（不谎报 0）");
        assert.strictEqual(roomDay.dfCents, 47400 + 15800);
        ok("⑯ 钻粉：总额口径（不乘 mn）+ dfMonths/dfCents 累加 + priceUnknown 额外记 unknown");
    }

    console.log("\n=== ArchiveMetrics 口径测试全部通过（" + passed + " 项） ===");
}

try {
    run();
    process.exit(0);
} catch (error) {
    console.error("\n✗ 测试失败:", error && error.message);
    if (error && error.stack) console.error(error.stack.split("\n").slice(1, 5).join("\n"));
    process.exit(1);
}
