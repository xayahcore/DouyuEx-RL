/* ==================== P0 本地弹幕档案：口径计算（纯函数，无 IO / 无 DOM / 无定时器） ==================== */
/*
 * 归属：archive-ingest（见 .zcode/p0-data/E-模块契约.md §七）
 * 职责：把「一条已解析事件」折算进「房间日聚合」，再把聚合压成面板要的展示值。
 *
 * 为什么必须纯函数：
 *   聚合结果要能复算、能在测试里钉死、能被 DB 层原子读改写。任何 Date.now() / DOM /
 *   定时器都会让「同样的报文 → 同样的数字」这条性质失效，指标就无法验收。
 *   因此 updatedAt 取「事件 ts 与旧值取大」，而不是墙上时钟。
 *
 * 硬约束：
 *   1) 不修改入参：applyEvent 返回新对象。
 *   2) 永不抛异常、永不产出 NaN：所有数值过 metricsNumber()，缺字段一律按 0。
 *   3) 金额只认 gfcnt × 单价，**绝不使用 hits**（hits 是连击累计值，用它乘单价会
 *      把一次连击重复计 1+2+3+4+5 倍，实测虚高一个量级）。
 *
 * 口径（测试 tests/test_archive_metrics.js 已钉死）：
 *   · danmakuCnt 只由 kind==="chat" 递增（1 条弹幕 = 1）。
 *   · incomeCents 只由 kind==="gift" 递增，= gfcnt × opt.giftPrice（单位 0.01 鱼翅）。
 *     giftPrice 缺失（null / undefined / 非有限数）时**不加金额**，只 unknownGiftCnt + 1。
 *     giftPrice === 0 视为免费礼物：不加金额，freeCnt + 1。
 *   · activeUv 只由 chat / gift 递增，且只有 opt.isNewActiveUid === true 才 +1；
 *     enter 只计 enterUv，永不参与 activeUv。
 *   · giftCnt += gfcnt；bagCnt（bg === 1）单独记，不影响金额。
 *   · firstTs / lastTs 取 min / max。
 *   · avgPerUser = danmakuCnt / max(chatUv, 1)（除零安全）。
 *   · lurkRate = clamp((enterUv - activeUv) / max(enterUv, 1), 0, 1)。
 *   · 覆盖率 coverageOf = 观测分钟 / 窗口分钟 × 100（day 的分母 = 00:00 到 now 的分钟数）。
 *   · 三窗口 summarizeWindow：7d/30d 的 activeUv 相加得到的是「人日」而不是「人数」，
 *     由 activeUvIsPersonDay 标志出来，UI 必须按人日读（详见函数注释）。
 *
 * 2026-10-17 删减（Lead 决定，别再往回加）：
 *   · **minutes 分钟桶**：时段热力功能已删除，没人读；聚合不再累积，也不再写进 deltas。
 *   · **nobleCnt**：贵宾数已停止采集（tap 白名单也移除了 oni/oun），字段从聚合形状里去掉。
 *   · **summarize 的 last60 分支**：分钟桶没了，窗口化弹幕数无从谈起。
 */

var ARCHIVE_METRICS_CENTS_PER_YC = 100;

// 覆盖率分母（分钟）：day 另算（00:00 到 now）；yesterday 恒定 1440；7d / 30d 固定窗口。
var ARCHIVE_METRICS_WINDOW_MINUTES_YESTERDAY = 1440;
var ARCHIVE_METRICS_WINDOW_MINUTES_7D = 10080;
var ARCHIVE_METRICS_WINDOW_MINUTES_30D = 43200;

// roomDay 的全部数值字段（克隆时逐个过数，漏一个就会把 undefined 带进 DB）
var ARCHIVE_METRICS_NUMBER_FIELDS = [
  "danmakuCnt", "incomeCents", "giftCnt", "activeUv", "chatUv", "giftUv",
  "paidUv", "enterUv", "bagCnt", "freeCnt", "unknownGiftCnt",
  // 独立口径，不进 incomeCents：道具订单实付 / 钻粉月数与折算金额
  "orderCents", "orderCount", "dfMonths", "dfCents",
  "firstTs", "lastTs", "updatedAt"
];

/* ---------- 基础工具 ---------- */

// 任何东西 → 有限数（NaN / Infinity / "" / null / undefined 全部归 0）
function metricsNumber(value) {
  var number = Number(value);
  if (!isFinite(number)) return 0;
  return number;
}

// 保留若干位小数（避免 0.30000000000000004 这类浮点噪声进 UI）
function metricsRound(value, digits) {
  var safeDigits = Math.max(0, Math.min(6, metricsNumber(digits)));
  var factor = Math.pow(10, safeDigits);
  return Math.round(metricsNumber(value) * factor) / factor;
}

// 文本化：null / undefined → ""，其余 String()
function metricsText(value) {
  if (value === null || value === undefined) return "";
  return String(value);
}

/* ---------- 房间日聚合 ---------- */

// 空的房间日聚合。所有数值 0、ridDay = rid + "|" + dayKey（与 DB 主键一致）
function metricsNewRoomDay(rid, dayKey) {
  var ridText = metricsText(rid);
  var dayKeyText = metricsText(dayKey);
  return {
    ridDay: ridText + "|" + dayKeyText,
    rid: ridText,
    dayKey: dayKeyText,
    danmakuCnt: 0,
    incomeCents: 0,
    giftCnt: 0,
    activeUv: 0,
    chatUv: 0,
    giftUv: 0,
    paidUv: 0,
    enterUv: 0,
    bagCnt: 0,
    freeCnt: 0,
    unknownGiftCnt: 0,
    // 道具订单（prop_order_finish / prop_amountr_finish）独立口径：实付合计与笔数。
    // **不计入 incomeCents** —— 那是礼物口径，混进去就是重复计。
    orderCents: 0,
    orderCount: 0,
    // 钻粉（dfobc / dfrbc）月数合计与按 Ingest 定价表折算出的金额合计
    dfMonths: 0,
    dfCents: 0,
    firstTs: 0,
    lastTs: 0,
    updatedAt: 0
  };
}

// 深克隆（数值逐个过数）—— applyEvent 的"不改入参"靠它
function metricsCloneRoomDay(roomDay) {
  var base = roomDay && typeof roomDay === "object" ? roomDay : {};
  var cloned = metricsNewRoomDay(base.rid, base.dayKey);
  for (var index = 0; index < ARCHIVE_METRICS_NUMBER_FIELDS.length; index++) {
    var field = ARCHIVE_METRICS_NUMBER_FIELDS[index];
    cloned[field] = metricsNumber(base[field]);
  }
  return cloned;
}

// 只有 chat / gift 属于"活跃事件"（enter 单独计 enterUv，不参与活跃人数）
function metricsIsActiveEvent(event) {
  if (!event || typeof event !== "object") return false;
  return event.kind === "chat" || event.kind === "gift";
}

// 单价归一：未知（null / undefined / 非有限数）返回 null，其余返回数字（可能为 0）
function metricsNormalizePrice(price) {
  if (price === null || price === undefined) return null;
  var number = Number(price);
  if (!isFinite(number)) return null;
  return number;
}

/*
 * 把一条事件折算进房间日聚合，返回**新的** roomDay。
 * opt 全部可选：
 *   isNewActiveUid  true 才把该 uid 计入 activeUv（由调用方的「当日首次」判定给出）
 *   isNewChatUid / isNewGiftUid / isNewPaidUid
 *                   分指标的去重标志；未给时 chat/gift 沿用 isNewActiveUid、paid 沿用 isNewActiveUid
 *   isNewEnterUid   false 表示"当日非首次进场"→ 不计 enterUv；未给时按「进场事件计」
 *   giftPrice       该礼物的单价（单位 0.01 鱼翅）；null / undefined = 未知
 */
function metricsApplyEvent(roomDay, event, opt) {
  var next;
  try {
    next = metricsCloneRoomDay(roomDay);
    if (!event || typeof event !== "object") return next;

    var options = opt && typeof opt === "object" ? opt : {};
    var kind = metricsText(event.kind);
    var eventTs = metricsNumber(event.ts);
    var isNewActiveUid = options.isNewActiveUid === true;

    // 未知 kind 一律不碰：连时间轴都不写，否则一条脏事件就能把 firstTs/lastTs 带偏
    if (kind !== "chat" && kind !== "gift" && kind !== "enter") return next;

    // 时间轴：只认正数 ts，异常 ts 不污染 firstTs / lastTs
    if (eventTs > 0) {
      if (next.firstTs <= 0 || eventTs < next.firstTs) next.firstTs = eventTs;
      if (eventTs > next.lastTs) next.lastTs = eventTs;
      if (eventTs > next.updatedAt) next.updatedAt = eventTs;
    }

    if (kind === "chat") {
      next.danmakuCnt += 1;
      var isNewChatUid = options.isNewChatUid === undefined ? isNewActiveUid : options.isNewChatUid === true;
      if (isNewChatUid) next.chatUv += 1;
      if (isNewActiveUid) next.activeUv += 1;
      return next;
    }

    if (kind === "gift") {
      var giftCount = metricsNumber(event.gfcnt);
      if (giftCount < 0) giftCount = 0;

      /*
       * 道具订单（prop_order_finish / prop_amountr_finish）：**独立口径**。
       * 只累加 orderCents / orderCount，绝不碰 giftCnt / giftUv / paidUv / incomeCents ——
       * 它和礼物流水是两笔不同的钱，混进去收入就重复计了。
       * 订单报文没有 uid，所以也不参与任何 UV。
       */
      if (event.isOrder === true || metricsText(event.gfid) === "__order_prop") {
        next.orderCents += metricsNumber(event.priceCents);
        next.orderCount += 1;
        return next;
      }

      next.giftCnt += giftCount;

      /*
       * 单价来源：事件自带 priceCents（高能弹幕 / 钻粉折算 / 订单）优先，其次 opt.giftPrice（价目表）。
       * 口径：
       *   · 高能弹幕 priceCents>0 → 计 incomeCents 与 paidUv；priceCents=0（道具券免费）只计份数。
       *   · 钻粉（dfobc / dfrbc）由 Ingest 按定价表折算成 priceCents → 计入 incomeCents 与 paidUv，
       *     同时单独累加 dfMonths / dfCents 供 UI 拆解；月数不明时事件带 priceUnknown，
       *     这里额外记一次 unknownGiftCnt（"月数不明"不等于"免费"，但也不该被当成正常价）。
       *   · 价目表没命中（无价礼物）→ 只记 unknownGiftCnt；它**计 giftUv 但不计 paidUv**
       *     —— 付费人数只认"有价"，把无价事件算成付费人数等于把"不知道多少钱"谎报成"付过钱"。
       */
      var eventPrice = event.priceCents;
      var unitPrice = metricsNormalizePrice(
        eventPrice === undefined || eventPrice === null ? options.giftPrice : eventPrice
      );
      if (unitPrice === null) {
        next.unknownGiftCnt += 1;
      } else if (unitPrice > 0) {
        // 钻粉的 priceCents 是"这一笔的总额"（mn 个月折算完），不能再乘 gfcnt；
        // 普通礼物/高能弹幕的 priceCents(或 giftPrice) 是单价，乘份数才对。
        var billableCents = event.priceIsTotal === true ? unitPrice : giftCount * unitPrice;
        next.incomeCents += billableCents;
      } else {
        next.freeCnt += 1;
      }
      if (event.priceUnknown === true) next.unknownGiftCnt += 1;

      var giftId = metricsText(event.gfid);
      if (giftId === "__df_open" || giftId === "__df_renew") {
        next.dfMonths += giftCount;
        next.dfCents += metricsNumber(eventPrice);
      }

      if (metricsNumber(event.bg) === 1) next.bagCnt += 1;

      var isNewGiftUid = options.isNewGiftUid === undefined ? isNewActiveUid : options.isNewGiftUid === true;
      if (isNewGiftUid) next.giftUv += 1;

      // 付费人数只统计"已知单价且大于 0"的礼物；免费 / 未知都不计入
      if (unitPrice !== null && unitPrice > 0) {
        var isNewPaidUid = options.isNewPaidUid === undefined ? isNewActiveUid : options.isNewPaidUid === true;
        if (isNewPaidUid) next.paidUv += 1;
      }

      if (isNewActiveUid) next.activeUv += 1;
      return next;
    }

    if (kind === "enter") {
      // 默认按「进场事件」计数；调用方判定过"当日首次"时可显式给 true，判定为非首次给 false
      if (options.isNewEnterUid !== false) next.enterUv += 1;
      return next;
    }

    return next;
  } catch (error) {
    return metricsCloneRoomDay(roomDay);
  }
}

/* ---------- 汇总 ---------- */

// 窗口名解析：既接受 "day" 字符串，也接受 {window:"day"}（兼容 E §七 写法）
function metricsResolveWindow(windowOption) {
  if (typeof windowOption === "string" && windowOption) return windowOption;
  if (windowOption && typeof windowOption === "object" && windowOption.window) {
    return metricsText(windowOption.window);
  }
  return "day";
}

/*
 * 压成面板展示值（**只有当日口径**）。
 *
 * 分钟桶（minutes）已随"时段热力"功能一起删除，所以原来那个 "last60" 分支也没了：
 * 传入任何 window 都按当日累计返回 —— 参数保留只为兼容既有调用点，不再有窗口化语义。
 * UI 侧如果需要"最近一小时"，只能靠事件明细自行聚合，聚合表不再提供。
 */
function metricsSummarize(roomDay, windowOption) {
  var base = metricsCloneRoomDay(roomDay);

  var avgPerUser = metricsRound(base.danmakuCnt / Math.max(base.chatUv, 1), 2);

  var lurkerBase = Math.max(base.enterUv, 1);
  var lurkRate = (base.enterUv - base.activeUv) / lurkerBase;
  if (!isFinite(lurkRate)) lurkRate = 0;
  if (lurkRate < 0) lurkRate = 0;
  if (lurkRate > 1) lurkRate = 1;

  return {
    danmakuValue: base.danmakuCnt,
    giftCnt: base.giftCnt,
    incomeYc: metricsRound(base.incomeCents / ARCHIVE_METRICS_CENTS_PER_YC, 2),
    activeUv: base.activeUv,
    chatUv: base.chatUv,
    giftUv: base.giftUv,
    enterUv: base.enterUv,
    avgPerUser: avgPerUser,
    lurkRate: metricsRound(lurkRate, 4)
  };
}

/* ---------- 覆盖率（观测分钟 / 窗口分钟） ---------- */

/*
 * "day" 窗口的分母：本地 00:00 到 nowMs 已经过去的分钟数。
 * 不足 1 分钟按 1 计（避免开播第一秒就除零）；其余窗口固定 yesterday 1440 / 7d / 30d。
 * nowMs 缺省取 Date.now() —— 这是唯一允许看墙上时钟的地方（它描述的是"现在几点"，
 * 不是"数据算出来是多少"），所以由调用方传入即可完全可测。
 */
function metricsMinutesSinceLocalMidnight(nowMs) {
  var stamp = Number(nowMs);
  if (!isFinite(stamp) || stamp <= 0) stamp = Date.now();
  var date = new Date(stamp);
  var midnight = new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
  var elapsedMinutes = (stamp - midnight) / 60000;
  if (!isFinite(elapsedMinutes)) return 1;
  if (elapsedMinutes < 1) return 1;
  return Math.ceil(elapsedMinutes);
}

/*
 * 时间覆盖率（0–100，一位小数）= 观测到的分钟数 / 窗口分钟数 × 100。
 *
 * 窗口：day（00:00 → now）/ yesterday（恒 1440）/ 7d（10080）/ 30d（43200）。
 * 分母只表示"这个窗口一共有多少分钟"，与有没有人说话无关；分子是采集侧真正
 * 观测过的分钟（ArchiveIngest 按 ridDay+分钟 去重累加的 observedMin）。
 * 因此它衡量的是**采集完整度**，不是"房间热闹程度"。
 *
 * 注意：分子可能来自多个 ridDay 的累加（多房间/多批次），此时结果可能 > 100。
 * 这里不做 clamp —— 出现 > 100 恰恰说明分子里混了多个房间，属于要暴露的事实，
 * 悄悄截断只会让人以为覆盖完整。
 * 分母非法或 <= 0 → 返回 0；分子非法（null / NaN / 负数）→ 按 0。
 */
function metricsCoverageOf(observedMin, windowOption, nowMs) {
  try {
    var windowName = metricsResolveWindow(windowOption);
    var denominatorMinutes = 0;
    if (windowName === "day") {
      denominatorMinutes = metricsMinutesSinceLocalMidnight(nowMs);
    } else if (windowName === "yesterday") {
      denominatorMinutes = ARCHIVE_METRICS_WINDOW_MINUTES_YESTERDAY;
    } else if (windowName === "7d") {
      denominatorMinutes = ARCHIVE_METRICS_WINDOW_MINUTES_7D;
    } else if (windowName === "30d") {
      denominatorMinutes = ARCHIVE_METRICS_WINDOW_MINUTES_30D;
    }
    if (!isFinite(denominatorMinutes) || denominatorMinutes <= 0) return 0;

    var numeratorMinutes = metricsNumber(observedMin);
    if (numeratorMinutes < 0) numeratorMinutes = 0;

    var coverage = numeratorMinutes / denominatorMinutes * 100;
    if (!isFinite(coverage)) return 0;
    return Math.round(coverage * 10) / 10;
  } catch (error) {
    return 0;
  }
}

/* ---------- 多窗口汇总（day / yesterday / 7d / 30d） ---------- */

// 多日求和的数值字段（observedMin 也要一起加，覆盖率才有分子）
var ARCHIVE_METRICS_SUM_FIELDS = [
  "danmakuCnt", "incomeCents", "giftCnt", "activeUv", "chatUv", "giftUv",
  "paidUv", "enterUv", "bagCnt", "freeCnt", "unknownGiftCnt", "observedMin",
  "orderCents", "orderCount", "dfMonths", "dfCents"
];

function metricsEmptySum() {
  var sum = {};
  for (var index = 0; index < ARCHIVE_METRICS_SUM_FIELDS.length; index++) {
    sum[ARCHIVE_METRICS_SUM_FIELDS[index]] = 0;
  }
  return sum;
}

function metricsAddIntoSum(sum, source) {
  if (!source || typeof source !== "object") return sum;
  for (var index = 0; index < ARCHIVE_METRICS_SUM_FIELDS.length; index++) {
    var field = ARCHIVE_METRICS_SUM_FIELDS[index];
    sum[field] = metricsNumber(sum[field]) + metricsNumber(source[field]);
  }
  return sum;
}

// 哪一天"更新"：先比 dayKey（YYYY-MM-DD 可按字典序比），再退到 lastTs
function metricsDayIsNewer(candidate, current) {
  if (!candidate || typeof candidate !== "object") return false;
  if (!current || typeof current !== "object") return true;
  var candidateKey = metricsText(candidate.dayKey);
  var currentKey = metricsText(current.dayKey);
  if (candidateKey || currentKey) return candidateKey > currentKey;
  return metricsNumber(candidate.lastTs) > metricsNumber(current.lastTs);
}

/*
 * 把三种入参统一折算成"一个和"：
 *   ① room_day 数组（逐项相加）
 *   ② sumRoomDays 的返回 {sum, latest}（只取 sum 求和；latest 只用于 dayKey 语义，不再取 nobleCnt）
 *   ③ 本身就是一个 sum 对象（含 danmakuCnt 等字段，直接当和用）
 * 无法识别 → 全 0 兜底（绝不 NaN / null）。
 */
function metricsSumOfDays(days) {
  var sum = metricsEmptySum();
  if (!days) return sum;

  if (Array.isArray(days)) {
    var latest = null;
    for (var index = 0; index < days.length; index++) {
      var day = days[index];
      if (!day || typeof day !== "object") continue;
      metricsAddIntoSum(sum, day);
      if (metricsDayIsNewer(day, latest)) latest = day;
    }
    return sum;
  }

  if (typeof days !== "object") return sum;

  if (days.sum && typeof days.sum === "object") {
    metricsAddIntoSum(sum, days.sum);
    return sum;
  }

  metricsAddIntoSum(sum, days);
  return sum;
}

/*
 * 多窗口汇总：window = "day" | "yesterday" | "7d" | "30d"。
 *   · yesterday 等价"单日汇总"（数组里通常只放昨天那一天；放多天就是多天之和）
 *
 * ⚠ activeUvIsPersonDay：跨天把每天的 activeUv 相加，得到的是「人日」不是「人数」——
 *   同一个人连着三天来，会被计 3。所以 window !== "day" 时该标志为 true，
 *   UI 必须把 activeUv 读作"人日"（或在标签上写清楚），不能直呼"人数"。
 * ⚠ nobleCnt 已删除：贵宾数停止采集，聚合里没有这个字段，也就无从返回。
 */
function metricsSummarizeWindow(days, windowOption) {
  try {
    var windowName = metricsResolveWindow(windowOption);
    var sum = metricsSumOfDays(days);
    var danmakuValue = metricsNumber(sum.danmakuCnt);
    var chatUv = metricsNumber(sum.chatUv);
    return {
      danmakuValue: danmakuValue,
      incomeYc: metricsRound(metricsNumber(sum.incomeCents) / ARCHIVE_METRICS_CENTS_PER_YC, 2),
      activeUv: metricsNumber(sum.activeUv),
      chatUv: chatUv,
      giftUv: metricsNumber(sum.giftUv),
      enterUv: metricsNumber(sum.enterUv),
      observedMin: metricsNumber(sum.observedMin),
      // 独立口径：订单实付 / 钻粉（都不进 incomeCents）
      orderCents: metricsNumber(sum.orderCents),
      orderCount: metricsNumber(sum.orderCount),
      dfMonths: metricsNumber(sum.dfMonths),
      dfCents: metricsNumber(sum.dfCents),
      activeUvIsPersonDay: windowName !== "day",
      avgPerUser: metricsRound(danmakuValue / Math.max(chatUv, 1), 1),
      window: windowName
    };
  } catch (error) {
    return {
      danmakuValue: 0,
      incomeYc: 0,
      activeUv: 0,
      chatUv: 0,
      giftUv: 0,
      enterUv: 0,
      observedMin: 0,
      orderCents: 0,
      orderCount: 0,
      dfMonths: 0,
      dfCents: 0,
      activeUvIsPersonDay: metricsResolveWindow(windowOption) !== "day",
      avgPerUser: 0,
      window: metricsResolveWindow(windowOption)
    };
  }
}

/* ---------- 对外 ---------- */

var ArchiveMetrics = {
  newRoomDay: metricsNewRoomDay,
  applyEvent: metricsApplyEvent,
  isActiveEvent: metricsIsActiveEvent,
  // E §七 的旧名：语义等同"这条事件该不该把 uid 计入 activeUv"（去重标志仍由调用方给）
  activeUvDelta: metricsIsActiveEvent,
  summarize: metricsSummarize,
  // P0 报告层：时间覆盖率（day/yesterday/7d/30d）+ 多窗口汇总
  coverageOf: metricsCoverageOf,
  summarizeWindow: metricsSummarizeWindow,
  // 同包其它模块复用的纯工具（不改变对外口径）
  cloneRoomDay: metricsCloneRoomDay,
  sumOfDays: metricsSumOfDays
};
