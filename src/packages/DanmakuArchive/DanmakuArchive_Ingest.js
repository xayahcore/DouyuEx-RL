/* ==================== P0 本地弹幕档案：报文 → 事件 → 批写 ==================== */
/*
 * 归属：archive-ingest（见 .zcode/p0-data/E-模块契约.md §五 / §六）
 * 上游：src/core/rank_engine.js 注入到**页面主上下文**的 __douyuExTap（白名单 16 类多播旁路；
 *       含付费五类：comm_chatmsg 高能弹幕 / dfobc、dfrbc 钻粉 / prop_order_finish、prop_amountr_finish 道具订单）。
 *       取法固定为：unsafeWindow.__douyuExTap → window.__douyuExTap → 都没有则静默不订阅
 *       （rank_engine 在页面里跑，沙箱侧那份通常是空壳；优先 unsafeWindow 才不会订阅到空壳）。
 * 下游：ArchiveDB.putEvents / upsertRoomDay / putSeen / getSeen / putUsers / setMeta / getMeta
 *
 * 链路：tap 广播 (type, raw) → 单次 split 建字段表 → STT 反转义 → 事件对象
 *       → 立刻按全量折算进「待落库聚合」→ 决定是否存明细（进场不存 / chat 受限额抽样 / gift 全存）
 *       → 满 200 条或 500 ms → putEvents + upsertRoomDay（同一 ridDay 串行）+ putSeen。
 *
 * 设计红线：
 *   1) 永不抛异常：onPacket 是页面 WebSocket 链路上的旁路，抛出去会拖累榜单逻辑。
 *      解析失败只记 parseErrors，坏包只记 dropped。
 *   2) 不信任本机时钟：本机比斗鱼服务端快约 20 s（实测），所以只认 chatmsg.cst /
 *      pingreq.tick，其余类型用「最近一次 tick 校准后的服务端时间」推算。
 *   3) 金额只由 ArchiveMetrics 用 gfcnt × 单价算；本模块只负责把单价查出来塞进 flag。
 *   4) **聚合与明细解耦**：聚合值（danmakuCnt / incomeCents / activeUv …）按**全量事件**
 *      累加，与"这条明细到底存不存"无关。抽样只影响 events 表的行数，绝不影响任何聚合数字
 *      —— 这条是红线，测试已钉死。
 *
 * 口径与已删除项（Lead 2026-10-17，不要再往回加）：
 *   · 文本清洗只剥 `[DouyuEx图片…]` 占位，**不剥** `[表情名]` / `[emot:dy…]`：档案是长期
 *     原文留档，表情名是用户看得见的内容；BarrageSendCheck 的那套剥离是为回执比对服务的，别混用。
 *   · **进场（uenter）不再写 events**：只保留 enterUv 计数（靠 seen 去重）。实测进场占明细
 *     2/3 的行数，且没有任何 UI 读它的明细。
 *   · **minutes 分钟桶已删除**：时段热力功能下线，不再累积也不再写进 deltas。
 *   · **贵宾数（oni/oun）已停止采集**：tap 白名单同步移除这两类，收到也只当没看见。
 *   · 事件字段瘦身：chat 只留 dedupKey / kind / uid / rid / ts / dayKey / txt，
 *     gift 再加 gfid / gfn / gfcnt / bcnt / bg。level / bl / bnn / brid / ic / sahf / pg / rg /
 *     nl / hits / bf / receiveUid 全部删掉（UI 不用、P2P 不需要，实测占 chat 事件一半体积）。
 *   · **事件里也不再存 nn**（昵称）：实测没有任何下游读事件里的 nn（UI 与 DanmakuHistory 各 0 命中）。
 *     昵称改成在解析时**旁挂**到 uid→nn 表，只用于 putUsers 落 users 表 —— 昵称没丢，只是不进 events。
 *
 * 正确性修正（对应实测三处偏差）：
 *   · seen 落库（putSeen / getSeen）+ **seen 就绪闸门**：内存 Set 刷新即清空会让同一 uid 反复算
 *     "当日首次"（实测 activeUv=809 而事件表真实只有 689）；而 loadSeen 是异步的、tap 订阅是同步的，
 *     所以 start() 先关闸、seen 灌完再开闸，闸门期间的事件只缓冲、按序重放 —— 不关闸的话，
 *     刷新后开头几百毫秒的弹幕仍会被算成首次（实测残差 +7%）。
 *   · upsertRoomDay 串行化：并发读改写会丢更新（实测 enterUv=1685 vs 事件表真实 1958）。
 *     同一 ridDay 用一条 promise 链排队，不同 ridDay 仍并行。
 *   · 明细限额 + 抽样：100000 条/房·天封顶，超出后 chat 每 5 条留 1 条；礼物永不抽样。
 *   · **putSeen 只在成功后才清 pending**：旧实现是先夺走并清空、再 await putSeen，只要那一次没落地
 *     （刷新/关闭打断或写失败），这批 uid 就永久丢失 —— 本会话内存 Set 还在所以不重复计，一刷新
 *     内存清空+库里也没有，下次会话把它们全算成"当日首次"（就是 DB 实验里那 +9 的残差）。
 *     现在失败保留、下一次 flush 重试（seenRetry 可见），并在 pagehide / hidden / stop 时尽力再发一次。
 *   · **原子批量提交**：flush 优先走 ArchiveDB.commitBatch({events, seen, roomDays})，一次事务写完
 *     明细+名单+聚合。三次独立写入的错位窗口（明细已写、名单没写）才是刷新后 UV 虚高约 5% 的根；
 *     走事务时不再需要 putSeen 的两段式（一次事务就是一次成败）。老 DB 没有 commitBatch 时
 *     **回落到原来的三条独立路径**，行为与之前完全一致。
 */

// 批写阈值：任一条先到就落库
var ARCHIVE_INGEST_BATCH_MAX = 200;
var ARCHIVE_INGEST_FLUSH_DELAY_MS = 500;

// 需要解析的类型：chatmsg / dgb / comm_chatmsg / dfobc / dfrbc 进 events 表（后三类都是 gift 类事件），
// uenter 只参与聚合（算 enterUv）不进明细
var ARCHIVE_INGEST_PARSE_TYPES = {
  chatmsg: 1, dgb: 1, uenter: 1, comm_chatmsg: 1, dfobc: 1, dfrbc: 1,
  prop_order_finish: 1, prop_amountr_finish: 1
};

// 伪 gfid：不是真礼物，价格要么自带（高能弹幕）、要么折算（钻粉）、要么独立口径（订单）—— 一律不走价目查询
var ARCHIVE_INGEST_PSEUDO_GIFT_IDS = {
  "__comm_chatmsg": 1, "__df_open": 1, "__df_renew": 1, "__order_prop": 1
};

/*
 * 钻粉定价（**按购买月数分档**）。来源：**2026-10-17 真机实测**，斗鱼开通面板原文：
 *   连续包月 158 元/月（「已优惠60元」，到期前自动 158 元续费并延续 30 天）
 *   1 个月   218 元/月
 *   3 个月   158 元/月（「省180元」）
 *   12 个月  138 元/月（「省960元」→ 年卡总价 12 × 138 = 1656 元）
 * 自洽校验（基准 218/月）：3×(218−158)=180 ✅、12×(218−138)=960 ✅、218−158=60 ✅。
 * 结论：218 是**单月原价**（不存在"首开溢价"这种概念），158 是 3 个月档与连续包月的月均价，
 * 138 是 12 个月档的月均价。单位一律 **分**（1 元 = 100 分）。
 */
var ARCHIVE_DF_PRICE_TABLE = {
  singleMonthCents: 21800,   // 单月直购 218 元（面板实测，但实务几乎没人买 —— 默认不启用）
  month3Cents: 15800,        // 3 个月档月均价 158 元/月（实测：省180）
  yearMonthCents: 13800,     // 12 个月档月均价 138 元/月（实测：省960，年卡总价 1656）
  renewMonthCents: 15800,    // 连续包月 / 自动续费 158 元/月（实测面板原文；也是 mn<3 的默认口径）
  assumeSingleMonth: false,  // false（默认）= 不足 3 个月按「连续包月 158」折算；true = 按单月原价 218
  yearMonths: 12
};

// 页面礼物表（DataCenter.global.$GIFT_ALL_CONFIG）缓存时长
var ARCHIVE_INGEST_GIFT_TABLE_TTL_MS = 10 * 60 * 1000;

// seen 集合上限：单房间单日去重键不可能到这个量级；真到了就整批清空（UV 从此刻重新计数，
// 误差有界且可解释），好过把内存吃光。
var ARCHIVE_INGEST_SEEN_MAX = 200000;
// 待落库 seen 的批量上限：**超限丢最旧的**（它们已在内存 Set 里，本会话不会重复计；
// 只是万一下次刷新前没落库，那几条挡不住一次"当日首次"，误差有界且可观测）。
var ARCHIVE_INGEST_SEEN_PENDING_MAX = 20000;

// 观测分钟：分钟桶 key 用「分钟起点秒」
var ARCHIVE_INGEST_MINUTE_SECONDS = 60;
// 观测分钟去重表的 ridDay 上限（跨天累积才可能撞上；真撞上就整表清空，覆盖率的误差有界）
var ARCHIVE_INGEST_OBSERVED_RIDDAY_MAX = 400;

// 明细限额（条/房·天）与超额后的聊天抽样比（固定每 5 条留 1 条；礼物永不抽样）
var ARCHIVE_INGEST_DETAIL_LIMIT_DEFAULT = 100000;
var ARCHIVE_INGEST_DETAIL_SAMPLE_EVERY = 5;

/* ---------- 内部状态 ---------- */

var archiveIngestQueue = [];
var archiveIngestCounters = {
  queued: 0, written: 0, dropped: 0, parseErrors: 0,
  fieldParses: 0, upsertErrors: 0, detailDropped: 0,
  seenLoadFailed: false, droppedBeforeSeen: 0,
  seenRetry: 0, seenLost: 0, commitBatches: 0
};
var archiveIngestClockSkew = 0;
var archiveIngestGiftPriceResolver = null;
var archiveIngestFlushTimer = null;
var archiveIngestStarted = false;
var archiveIngestTapHandler = null;
var archiveIngestTapHostName = "";
var archiveIngestVisibilityBound = false;

// 字段表缓存（同一条报文只 split 一次）
var archiveIngestFieldCacheRaw = null;
var archiveIngestFieldCacheFields = null;

/*
 * 待落库聚合：ridDay → roomDay（自上次 flush 起累加）。
 * 用 ArchiveMetrics.applyEvent 折算，保证口径只写在 Metrics 一处。
 * flush 时取 deltas + 快照字段，然后整条清掉。
 */
var archiveIngestPendingRoomDays = Object.create(null);

/*
 * 观测分钟（覆盖率分子）：
 *   archiveIngestObservedMinutes —— ridDay → { "<分钟起点秒>": 1 }，**跨批保留**，
 *     保证同一分钟不管落库多少次都只算一次（flush 之后也不清）。
 *   archiveIngestObservedDelta —— ridDay → 本批新增的分钟数，flush 时并入
 *     该批 deltas.observedMin 后清零。
 * 两者都用 Object.create(null)：键是外部数据拼出来的，不要碰 Object.prototype。
 */
var archiveIngestObservedMinutes = Object.create(null);
var archiveIngestObservedDelta = Object.create(null);
var archiveIngestObservedTimer = 0;

// 当日首次判定：键 `<dayKey>|<uid>`，按 scope 分桶（active = chat ∪ gift，其余分指标）。
//
// ⚠ 键里**故意不含 rid**：DB 的 seen 表主键是 `scope|dayKey|uid`（没有 rid）。原先内存键带 rid，
// 一旦 `rid` 在会话中途被纠偏（靓号房间短号 → 真实号，common.js 的 exParseRealRid 是异步的），
// 载入时写入的键与事件处理时查询的键就对不上 —— 名单明明有（DB missing=0），判定却看不到，
// 于是同一个 uid 被再算一次"当日首次"。去掉 rid 后两边口径完全一致。
var archiveIngestSeenKeys = {
  active: new Set(),
  chat: new Set(),
  gift: new Set(),
  paid: new Set(),
  enter: new Set()
};

// loadSeen 必须把这 5 个 scope 全载回来：只载 active/enter 的话，刷新后 chatUv/giftUv/paidUv
// 会把每个"又说话了"的老用户重新算一次首次（这是刷新增量的另一半来源）。
var ARCHIVE_INGEST_SEEN_SCOPES = ["active", "chat", "gift", "paid", "enter"];

// 待落库的 seen（flush 成功时 putSeen）
var archiveIngestSeenPending = [];
var archiveIngestSeenSeq = 0;
// 上一批 putSeen 是否还在飞：在飞时不重复发（pending 没被清，内容也没变；重复发只会放大写入量）
var archiveIngestSeenInFlight = false;

/*
 * 首次判定探针（默认**关闭**：不开启连对象都不建，零开销）。
 * 真机上 UV 残差只能靠它抓：名单全、条数全，多出来的只可能是"首次"被判多了。
 * 记录形状：{ countedByUid: { uid: [{ts, kind, rid, dayKey, source, scopes}] }, totalTrue }
 *   source ∈ "direct"（tap 直通）/ "gate-replay"（闸门开闸重放）/ "flush-retry"（预留）/ "unknown"
 */
var archiveIngestSeenProbe = null;
var ARCHIVE_INGEST_PROBE_MAX = 5000;

/*
 * seen 就绪闸门。
 *
 * 为什么要有它：start() 里的 loadSeen 是**异步**的，而 tap 订阅是同步立刻生效的。页面开头
 * 那几百毫秒到达的弹幕，会因为内存 Set 还没灌完 seen 而被判成"当日首次"→ UV 重复计数。
 * 实测（v3，70 s → 刷新 → 70 s）：真实 58/57，库里 62/61，残差 +7%。
 *
 * 规则：
 *   · 闸门关闭期间：解析照做（昵称旁挂也照做），但**不聚合、不入队、不写库**，
 *     只把事件推进缓冲（上限 2000，超了丢弃并计 droppedBeforeSeen）。
 *   · 开闸时按原顺序逐条重放**同一条处理函数**，保证聚合与入库顺序与直通路径完全一致。
 *   · loadSeen 失败 / getSeen 不存在 / 超过 1500 ms 硬超时：**也要开闸**（记 seenLoadFailed），
 *     绝不让一个可选依赖把采集永久挂死。
 *   · 默认就是"开闸"状态：测试或补偿通道直接调 onPacket 时不该被拦。
 */
var ARCHIVE_INGEST_SEEN_GATE_TIMEOUT_MS = 1500;
var ARCHIVE_INGEST_GATE_BUFFER_MAX = 2000;
var archiveIngestSeenReady = true;
var archiveIngestPendingForGate = [];
var archiveIngestSeenGateTimer = null;

/*
 * uid→nn 旁挂表：事件里不存昵称（体积），但 users 表要昵称，所以解析时先记在这里。
 * 有界：超过上限就整表清空（只影响 users 表的昵称新鲜度，不影响任何聚合/去重）。
 */
var ARCHIVE_INGEST_NICK_MAX = 5000;
var archiveIngestUserNames = Object.create(null);
var archiveIngestUserNameCount = 0;

// 明细限额：计数 / 抽样标记（detailSampled 进 patch，其余进 deltas）
var archiveIngestDetailCount = Object.create(null);
var archiveIngestDetailDropped = Object.create(null);
var archiveIngestDetailSampled = Object.create(null);
var archiveIngestDetailRestored = Object.create(null);
var archiveIngestDetailLimit = ARCHIVE_INGEST_DETAIL_LIMIT_DEFAULT;

// upsertRoomDay 的串行链：ridDay → 尾部 promise
var archiveIngestUpsertChains = Object.create(null);

/* ---------- 宿主环境取值（全部判空、全部吞异常） ---------- */

function archiveIngestWindowApi() {
  try {
    if (typeof window !== "undefined" && window) return window;
  } catch (error) { }
  return null;
}

/*
 * 采集通道的宿主解析顺序：unsafeWindow（页面主上下文）→ window（沙箱）→ 都没有返回 null。
 * rank_engine 在页面里执行，所以真实环境里 tap 挂在 unsafeWindow 上；沙箱侧那份通常是空的。
 * 两者都在时优先 unsafeWindow —— 否则会订阅到一个永远不 emit 的空壳，界面表现为"零采集"。
 */
function archiveIngestResolveTap() {
  try {
    if (typeof unsafeWindow !== "undefined" && unsafeWindow && unsafeWindow.__douyuExTap) {
      archiveIngestTapHostName = "unsafeWindow";
      return unsafeWindow.__douyuExTap;
    }
  } catch (error) { }
  try {
    var windowApi = archiveIngestWindowApi();
    if (windowApi && windowApi.__douyuExTap) {
      archiveIngestTapHostName = "window";
      return windowApi.__douyuExTap;
    }
  } catch (error) { }
  archiveIngestTapHostName = "";
  return null;
}

function archiveIngestDocumentApi() {
  try {
    if (typeof document !== "undefined" && document) return document;
  } catch (error) { }
  return null;
}

function archiveIngestDbApi() {
  try {
    if (typeof ArchiveDB !== "undefined" && ArchiveDB) return ArchiveDB;
  } catch (error) { }
  return null;
}

function archiveIngestMetricsApi() {
  try {
    if (typeof ArchiveMetrics !== "undefined" && ArchiveMetrics) return ArchiveMetrics;
  } catch (error) { }
  return null;
}

function archiveIngestMetaApi() {
  try {
    if (typeof ArchiveMeta !== "undefined" && ArchiveMeta) return ArchiveMeta;
  } catch (error) { }
  return null;
}

// 报文里没有 rid 时的兜底：全局 rid（common.js 解析出的真实房间号）
function archiveIngestRidFallback() {
  try {
    if (typeof rid === "undefined" || rid === null) return "";
    return String(rid);
  } catch (error) {
    return "";
  }
}

/* ---------- 基础工具 ---------- */

function archiveIngestNumber(value) {
  var number = Number(value);
  if (!isFinite(number)) return 0;
  return number;
}

function archiveIngestText(value) {
  if (value === null || value === undefined) return "";
  return String(value);
}

// 本地时区 00:00 换日。禁用 toISOString().slice(0,10) —— 那是 UTC 日期，
// 国内 00:00–08:00 会整体算成前一天，直播日 / 用户历史全部错位一天。
function archiveIngestDayKey(ms) {
  var stamp = Number(ms);
  if (!isFinite(stamp) || stamp <= 0) stamp = Date.now();
  var date = new Date(stamp);
  var month = date.getMonth() + 1;
  var day = date.getDate();
  return date.getFullYear() + "-" + (month < 10 ? "0" + month : "" + month)
    + "-" + (day < 10 ? "0" + day : "" + day);
}

/*
 * 报文 → 字段表：**一条报文只 split 一次**。
 * STT 的值里 "/" 已被转义成 @S，所以可以安全地按 "/" 切段，再按第一个 "@=" 切 key/value。
 * 旧实现是每取一个字段就 new RegExp 一次（一条 chatmsg 十几次正则编译），实测是 CPU 大头。
 */
function archiveIngestParseFields(raw) {
  var fields = Object.create(null);
  var text = raw === null || raw === undefined ? "" : String(raw);
  if (!text) return fields;
  var segments = text.split("/");
  for (var index = 0; index < segments.length; index++) {
    var segment = segments[index];
    var marker = segment.indexOf("@=");
    if (marker <= 0) continue;
    var key = segment.slice(0, marker);
    if (!key || fields[key] !== undefined) continue;
    fields[key] = segment.slice(marker + 2);
  }
  return fields;
}

/*
 * 字段取值：调用点保持不变（archiveIngestField(raw, key)），内部按「同一条 raw 只解析一次」缓存。
 * 边界问题由 split 天然解决：bnn@= 不会再被当成 nn@=（旧正则需要 (?:^|/) 前缀来防这个）。
 */
function archiveIngestField(raw, key) {
  if (raw === null || raw === undefined) return "";
  var text = String(raw);
  if (!text) return "";
  var fields;
  if (archiveIngestFieldCacheRaw === text) {
    fields = archiveIngestFieldCacheFields;
  } else {
    fields = archiveIngestParseFields(text);
    archiveIngestFieldCacheRaw = text;
    archiveIngestFieldCacheFields = fields;
    archiveIngestCounters.fieldParses += 1;
  }
  var value = fields ? fields[key] : undefined;
  return value === undefined ? "" : value;
}

/*
 * STT 反转义：@S → "/"，@A → "@"。
 * 单遍替换（正则交替），不做二次替换 —— 否则 "a@S@A" 这类值会被多解一层。
 * "@=" 是键值分隔符，取值阶段已经用掉了，不在这里还原。
 */
function archiveIngestUnescape(value) {
  if (value === null || value === undefined) return "";
  return String(value).replace(/@(S|A)/g, function (whole, code) {
    return code === "S" ? "/" : "@";
  });
}

// 弹幕正文清洗：反转义 → 去掉我们自己的图片弹幕占位 → 压缩空白 → trim
function archiveIngestCleanText(value) {
  var text = archiveIngestUnescape(value);
  if (!text) return "";
  text = text.replace(/\[DouyuEx图片[^\]]*\]/g, " ");
  text = text.replace(/\s+/g, " ");
  return text.trim();
}

// 昵称清洗：只需反转义 + 压空白（昵称里不会有图片占位）
function archiveIngestCleanNick(value) {
  var text = archiveIngestUnescape(value);
  if (!text) return "";
  return text.replace(/\s+/g, " ").trim();
}

// 服务端"现在"。ts 一律存服务端时钟域（与 chatmsg.cst 同域），避免整条时间轴偏移 20 s。
function archiveIngestServerNow() {
  return Date.now() - archiveIngestNumber(archiveIngestClockSkew);
}

/*
 * 记昵称：事件对象里不存 nn（省字段），但 users 表要昵称，所以在这里按 uid 旁挂。
 * 只在真有昵称时才写；表满了整表清空（有界兜底，丢掉的是昵称新鲜度而不是数据正确性）。
 */
function archiveIngestRememberNick(uid, nick) {
  try {
    var uidText = archiveIngestText(uid);
    if (!uidText) return false;
    var nickText = archiveIngestCleanNick(nick);
    var exists = archiveIngestUserNames[uidText] !== undefined;
    if (!exists && archiveIngestUserNameCount >= ARCHIVE_INGEST_NICK_MAX) {
      archiveIngestUserNames = Object.create(null);
      archiveIngestUserNameCount = 0;
      exists = false;
    }
    if (!nickText) return exists;
    if (!exists) {
      archiveIngestUserNameCount += 1;
    }
    archiveIngestUserNames[uidText] = nickText;
    return true;
  } catch (error) {
    return false;
  }
}

/*
 * 记一次"当日首次"：返回 true 表示这是该 scope 该 uid 今天第一次。
 * 新键同时进 pending，flush 成功后 putSeen 落库 —— 否则刷新页面内存 Set 一清，
 * 同一个 uid 会被再算一次首次，activeUv / chatUv / giftUv / enterUv 全部虚高
 * （实测 activeUv=809，而事件表里真实不同 uid 只有 689）。
 */
function archiveIngestMarkSeen(scopeName, ridText, dayKey, uid) {
  var bucket = archiveIngestSeenKeys[scopeName];
  if (!bucket) return false;
  if (bucket.size >= ARCHIVE_INGEST_SEEN_MAX) bucket.clear();
  var uidText = archiveIngestText(uid);
  if (!uidText) return false;
  var dayKeyText = archiveIngestText(dayKey);
  var key = archiveIngestSeenKeyOf(dayKeyText, uidText);
  if (bucket.has(key)) return false;
  bucket.add(key);
  archiveIngestPushSeenPending({ scope: scopeName, dayKey: dayKeyText, uid: uidText });
  return true;
}

// 与 DB 的 seen 主键完全同一口径：dayKey + uid（不带 rid，见上面的说明）
function archiveIngestSeenKeyOf(dayKeyText, uidText) {
  return archiveIngestText(dayKeyText) + "|" + archiveIngestText(uidText);
}

/* ---------- 首次判定探针（默认关闭，零开销） ---------- */

function archiveIngestSetSeenProbe(enabled) {
  if (enabled === true) {
    if (!archiveIngestSeenProbe) {
      archiveIngestSeenProbe = { countedByUid: Object.create(null), totalTrue: 0 };
    }
    return true;
  }
  archiveIngestSeenProbe = null;
  return false;
}

function archiveIngestGetSeenProbe() {
  if (!archiveIngestSeenProbe) return null;
  return {
    countedByUid: archiveIngestSeenProbe.countedByUid,
    totalTrue: archiveIngestSeenProbe.totalTrue
  };
}

// 只在该"首次"判定为真时调用；探针关闭时这条判断本身也只是一次对象判空
function archiveIngestProbeFirstSeen(event, flags, source, scopeNames) {
  if (!archiveIngestSeenProbe) return;
  try {
    if (archiveIngestSeenProbe.totalTrue >= ARCHIVE_INGEST_PROBE_MAX) return;
    var uidText = archiveIngestText(event.uid);
    if (!uidText) return;
    var bucket = archiveIngestSeenProbe.countedByUid[uidText];
    if (!bucket) {
      bucket = [];
      archiveIngestSeenProbe.countedByUid[uidText] = bucket;
    }
    bucket.push({
      ts: archiveIngestNumber(event.ts),
      kind: archiveIngestText(event.kind),
      rid: archiveIngestText(event.rid),
      dayKey: archiveIngestText(event.dayKey),
      source: source || "unknown",
      scopes: scopeNames
    });
    archiveIngestSeenProbe.totalTrue += 1;
  } catch (error) { }
}

/*
 * 待落库 seen 的入队：带自增 seq（提交时按 seq 精确摘除，不受并发写的干扰）。
 * 超上限时**成批丢最旧的**（splice 摊还，避免每条 shift 的 O(n)），并计 seenLost。
 */
function archiveIngestPushSeenPending(item) {
  if (archiveIngestSeenPending.length >= ARCHIVE_INGEST_SEEN_PENDING_MAX) {
    var dropCount = Math.max(1, Math.floor(ARCHIVE_INGEST_SEEN_PENDING_MAX / 4));
    archiveIngestSeenPending.splice(0, dropCount);
    archiveIngestCounters.seenLost += dropCount;
  }
  archiveIngestSeenSeq += 1;
  archiveIngestSeenPending.push({
    scope: item.scope,
    dayKey: item.dayKey,
    uid: item.uid,
    seq: archiveIngestSeenSeq
  });
}

/*
 * 启动时把当日已落库的 seen 灌回内存。
 * getSeen(scope, dayKey) 回来的是「该日全站 uid 集合」，这里按当前 rid 并进内存：
 * 多并没有关系 —— 只会让"首次判定"更保守（宁可少算一次首次，也不重复计数）。
 *
 * onSettled(failed)：两个 scope 都落地（成功/失败都算）后回调；没有 getSeen 也立刻回调。
 * 闸门靠它决定何时放行 —— 这个函数因此**必须保证回调恰好一次**。
 */
function archiveIngestLoadSeen(onSettled) {
  var settled = false;
  var settle = function (failed) {
    if (settled) return;
    settled = true;
    if (typeof onSettled === "function") {
      try { onSettled(failed === true); } catch (error) { }
    }
  };

  try {
    var db = archiveIngestDbApi();
    if (!db || typeof db.getSeen !== "function") {
      settle(false);
      return false;
    }
    var dayKey = archiveIngestDayKey(archiveIngestServerNow());
    var scopes = ARCHIVE_INGEST_SEEN_SCOPES;
    var remaining = scopes.length;
    var anyFailed = false;
    var mergeSeen = function (scopeName, list) {
      try {
        if (!list) return;
        var items = Array.isArray(list) ? list : [list];
        var bucket = archiveIngestSeenKeys[scopeName];
        if (!bucket) return;
        for (var cursor = 0; cursor < items.length; cursor++) {
          var raw = items[cursor];
          var uid = archiveIngestText(raw && typeof raw === "object" ? raw.uid : raw);
          if (!uid) continue;
          // 与 MarkSeen 同一口径：dayKey|uid（不带 rid），否则载进来的键永远匹配不上事件
          bucket.add(archiveIngestSeenKeyOf(dayKey, uid));
        }
      } catch (error) { }
    };
    var markSettled = function (ok) {
      if (!ok) anyFailed = true;
      remaining -= 1;
      if (remaining <= 0) settle(anyFailed);
    };

    for (var index = 0; index < scopes.length; index++) {
      (function (scopeName) {
        try {
          var task = db.getSeen(scopeName, dayKey);
          if (task && typeof task.then === "function") {
            task.then(function (list) {
              mergeSeen(scopeName, list);
              markSettled(true);
            }, function () {
              markSettled(false);
            });
          } else {
            mergeSeen(scopeName, task);
            markSettled(true);
          }
        } catch (error) {
          markSettled(false);
        }
      })(scopes[index]);
    }
    return true;
  } catch (error) {
    settle(true);
    return false;
  }
}

/* ---------- seen 就绪闸门 ---------- */

function archiveIngestClearSeenGateTimer() {
  if (archiveIngestSeenGateTimer === null) return;
  try {
    if (typeof clearTimeout === "function") clearTimeout(archiveIngestSeenGateTimer);
  } catch (error) { }
  archiveIngestSeenGateTimer = null;
}

/*
 * 开闸：把闸门期间缓冲的事件**按原顺序**逐条重放。
 * 重放走的是与直通路径同一个处理函数（archiveIngestHandleParsedEvent），所以聚合与入库顺序不变。
 * 幂等：已经开闸且缓冲为空时直接返回（硬超时与 loadSeen 回调可能先后到达）。
 */
function archiveIngestReleaseGate(failed) {
  try {
    if (archiveIngestSeenReady && !archiveIngestPendingForGate.length) return false;
    archiveIngestClearSeenGateTimer();
    archiveIngestSeenReady = true;
    if (failed === true) archiveIngestCounters.seenLoadFailed = true;

    var buffered = archiveIngestPendingForGate;
    archiveIngestPendingForGate = [];
    for (var index = 0; index < buffered.length; index++) {
      try {
        archiveIngestHandleParsedEvent(buffered[index].event, "gate-replay");
      } catch (error) {
        archiveIngestCounters.parseErrors += 1;
      }
    }
    return true;
  } catch (error) {
    archiveIngestSeenReady = true;
    return false;
  }
}

// 闸门期间只暂存事件本身：flags（"当日首次"）必须在 seen 灌完之后再算，这正是本闸门的意义
function archiveIngestBufferForGate(event) {
  if (archiveIngestPendingForGate.length >= ARCHIVE_INGEST_GATE_BUFFER_MAX) {
    archiveIngestCounters.droppedBeforeSeen += 1;
    return false;
  }
  archiveIngestPendingForGate.push({ event: event });
  return true;
}

/*
 * 记一个"观测分钟"（今日口径）：这个 ridDay 的这个分钟第一次收到事件 → 本批 observedMin +1。
 * 统计的是**采集完整度**（这段时间我们真的在收），与有没有人发言无关。
 * 无法确定 rid 或 ts 的直接不计（覆盖率宁可少算，也不能凭空造出观测过的分钟）。
 */
function archiveIngestCountObservedMinute(ridText, tsMs) {
  var roomId = archiveIngestText(ridText);
  if (!roomId) return false;
  var stamp = archiveIngestNumber(tsMs);
  if (stamp <= 0) return false;

  if (Object.keys(archiveIngestObservedMinutes).length >= ARCHIVE_INGEST_OBSERVED_RIDDAY_MAX) {
    archiveIngestObservedMinutes = Object.create(null);
  }

  var minuteKey = String(Math.floor(stamp / 1000 / ARCHIVE_INGEST_MINUTE_SECONDS) * ARCHIVE_INGEST_MINUTE_SECONDS);
  var ridDay = roomId + "|" + archiveIngestDayKey(stamp);
  var seenMinutes = archiveIngestObservedMinutes[ridDay];
  if (!seenMinutes) {
    seenMinutes = Object.create(null);
    archiveIngestObservedMinutes[ridDay] = seenMinutes;
  }
  if (seenMinutes[minuteKey]) return false;
  seenMinutes[minuteKey] = 1;
  archiveIngestObservedDelta[ridDay] = archiveIngestNumber(archiveIngestObservedDelta[ridDay]) + 1;
  return true;
}

// 待落库的观测分钟总数（诊断用；flush 成功后归零）
function archiveIngestObservedPending() {
  var total = 0;
  var ridDays = Object.keys(archiveIngestObservedDelta);
  for (var index = 0; index < ridDays.length; index++) {
    total += archiveIngestNumber(archiveIngestObservedDelta[ridDays[index]]);
  }
  return total;
}

// 页面礼物表缓存：{ at, map: gfid → 单价（分） }
var archiveIngestGiftTableCache = { at: 0, map: null };

/*
 * 页面上下文里的礼物表 `DataCenter.global.get("$GIFT_ALL_CONFIG")`：
 * 条目含 id / name / price / priceType / priceInfo，`price` 单位 = 分（与 cprice 同一口径）。
 * 它比我们自己打 HTTP 礼物接口更准更全，所以**优先**用它，查不到再回落 ArchiveMeta。
 * 全部判空 + try/catch：页面私有对象随时可能不在或被改。
 */
function archiveIngestPageGiftTable() {
  try {
    var pageHost = (typeof unsafeWindow !== "undefined" && unsafeWindow) ? unsafeWindow : null;
    if (!pageHost) return null;
    var dataCenter = pageHost.DataCenter;
    if (!dataCenter || !dataCenter.global || typeof dataCenter.global.get !== "function") return null;
    var list = dataCenter.global.get("$GIFT_ALL_CONFIG");
    if (!list) return null;
    return Array.isArray(list) ? list : [list];
  } catch (error) {
    return null;
  }
}

// gfid → 单价（分）；表不可用 / 查不到 → null。结果缓存 10 分钟（表很大，逐条扫太贵）
function archiveIngestGiftPriceFromPage(gfid) {
  try {
    var now = Date.now();
    var cache = archiveIngestGiftTableCache;
    if (!cache.map || (now - archiveIngestNumber(cache.at)) >= ARCHIVE_INGEST_GIFT_TABLE_TTL_MS) {
      var list = archiveIngestPageGiftTable();
      var map = Object.create(null);
      if (list) {
        for (var index = 0; index < list.length; index++) {
          var item = list[index];
          if (!item || typeof item !== "object") continue;
          var giftId = archiveIngestText(item.id !== undefined ? item.id : item.gfid);
          if (!giftId) continue;
          var price = Number(item.price);
          if (!isFinite(price) && item.priceInfo && typeof item.priceInfo === "object") {
            price = Number(item.priceInfo.price);
          }
          if (!isFinite(price)) continue;
          map[giftId] = price;
        }
      }
      cache.map = map;
      cache.at = now;
    }
    if (!cache.map) return null;
    var value = cache.map[archiveIngestText(gfid)];
    if (value === undefined || value === null) return null;
    var priceCents = Number(value);
    return isFinite(priceCents) ? priceCents : null;
  } catch (error) {
    return null;
  }
}

/*
 * 礼物单价：**同步**取值，三个来源按优先级排：
 *   1) setGiftPriceResolver 注入的解析器（测试缝 / 外部替换）
 *   2) 页面礼物表 $GIFT_ALL_CONFIG（最准最全）
 *   3) ArchiveMeta.giftPrice(gfid)（同步，{priceCents} | null）
 * 返回 0.01 鱼翅为单位的数字，或 null（未知）。
 *
 * 命中不到价目时**必须**返回 null，绝不能退回 0：0 是"确定免费"，null 才是"不知道"。
 */
function archiveIngestResolveGiftPrice(gfid) {
  try {
    var giftId = archiveIngestText(gfid);
    if (typeof archiveIngestGiftPriceResolver === "function") {
      var injected = archiveIngestGiftPriceResolver(giftId);
      if (injected !== undefined) return archiveIngestPriceOf(injected);
    }
    var fromPage = archiveIngestGiftPriceFromPage(giftId);
    if (fromPage !== null) return fromPage;
    return archiveIngestPriceFromMeta(giftId);
  } catch (error) {
    return null;
  }
}

function archiveIngestPriceFromMeta(gfid) {
  try {
    var meta = archiveIngestMetaApi();
    if (!meta || typeof meta.giftPrice !== "function") return null;
    return archiveIngestPriceOf(meta.giftPrice(gfid));
  } catch (error) {
    return null;
  }
}

// {priceCents} / 数字 / null → 数字或 null（非法值、Promise 一律 null）
function archiveIngestPriceOf(resolved) {
  if (resolved === null || resolved === undefined) return null;
  if (typeof resolved === "object" && typeof resolved.then === "function") return null;
  var priceValue;
  if (typeof resolved === "object") {
    priceValue = resolved.priceCents;
  } else {
    priceValue = resolved;
  }
  if (priceValue === null || priceValue === undefined) return null;
  var priceNumber = Number(priceValue);
  if (!isFinite(priceNumber)) return null;
  return priceNumber;
}

/* ---------- 报文解析（每种类型一个纯函数，返回 null 表示"没有 uid，丢弃"） ---------- */

// 注：三个 parser 都会返回 nn，但 onPacket 会把它旁挂到 uid→nn 表后从事件对象里摘掉 ——
// 所以**落库的 events 里没有 nn**（省体积），users 表里的昵称照旧。

function archiveIngestParseChatmsg(raw, ridFallback, serverNowMs) {
  var uid = archiveIngestText(archiveIngestField(raw, "uid"));
  if (!uid) return null;

  var text = archiveIngestCleanText(archiveIngestField(raw, "txt"));
  var serverTs = archiveIngestNumber(archiveIngestField(raw, "cst"));
  var ts = serverTs > 0 ? serverTs : serverNowMs;
  var cid = archiveIngestText(archiveIngestField(raw, "cid"));
  var roomId = archiveIngestText(archiveIngestField(raw, "rid")) || archiveIngestText(ridFallback);

  return {
    // dedupKey 短化：cid 是服务端给每条弹幕的唯一 id，直接拿来用（无 cid 才退化到三元组）
    dedupKey: cid ? cid : uid + ":" + ts + ":" + text,
    kind: "chat",
    uid: uid,
    nn: archiveIngestCleanNick(archiveIngestField(raw, "nn")),
    rid: roomId,
    ts: ts,
    dayKey: archiveIngestDayKey(ts),
    txt: text
  };
}

function archiveIngestParseGift(raw, ridFallback, serverNowMs) {
  var uid = archiveIngestText(archiveIngestField(raw, "uid"));
  if (!uid) return null;

  var giftId = archiveIngestText(archiveIngestField(raw, "gfid"));
  var giftCount = archiveIngestNumber(archiveIngestField(raw, "gfcnt"));
  if (giftCount < 0) giftCount = 0;
  var batchCount = archiveIngestText(archiveIngestField(raw, "bcnt"));
  var roomId = archiveIngestText(archiveIngestField(raw, "rid")) || archiveIngestText(ridFallback);

  // dgb 无 cst：极少数报文自带 tick 时用它，否则用校准后的服务端时间推算
  var ownTick = archiveIngestNumber(archiveIngestField(raw, "tick"));
  var ts = ownTick > 0 ? ownTick : serverNowMs;

  return {
    dedupKey: "g|" + uid + "|" + giftId + "|" + batchCount,
    kind: "gift",
    uid: uid,
    nn: archiveIngestCleanNick(archiveIngestField(raw, "nn")),
    rid: roomId,
    ts: ts,
    dayKey: archiveIngestDayKey(ts),
    gfid: giftId,
    gfn: archiveIngestCleanNick(archiveIngestField(raw, "gfn")),
    gfcnt: giftCount,
    bcnt: batchCount,
    bg: archiveIngestNumber(archiveIngestField(raw, "bg"))
  };
}

/*
 * 进场只参与聚合（enterUv），**不进 events 表**。
 * 实测进场占明细行数的 2/3，且没有任何 UI 读它的明细 —— 存下来只烧磁盘和写入耗时。
 */
function archiveIngestParseEnter(raw, ridFallback, serverNowMs) {
  var uid = archiveIngestText(archiveIngestField(raw, "uid"));
  if (!uid) return null;

  var ts = serverNowMs;
  var roomId = archiveIngestText(archiveIngestField(raw, "rid")) || archiveIngestText(ridFallback);

  return {
    kind: "enter",
    uid: uid,
    nn: archiveIngestCleanNick(archiveIngestField(raw, "nn")),
    rid: roomId,
    ts: ts,
    dayKey: archiveIngestDayKey(ts)
  };
}

/* ---------- 付费类消息（高能弹幕 / 钻粉） ---------- */

/*
 * 嵌套 STT 解包：`comm_chatmsg` 的内层 chatmsg 是**双重转义**的。
 * 顺序很关键（长的先处理，否则 @AA= 会被 @A 提前吃掉）：
 *   @AA= → "@="（内层键分隔）、@AS → "/"（内层斜杠）、@AA → "@"、@S → "/"、@A → "@"
 */
function archiveIngestUnescapeNested(value) {
  var text = archiveIngestText(value);
  if (!text) return "";
  text = text.replace(/@AA=/g, "@=");
  text = text.replace(/@AS/g, "/");
  text = text.replace(/@AA/g, "@");
  text = text.replace(/@S/g, "/");
  text = text.replace(/@A/g, "@");
  return text;
}

/*
 * comm_chatmsg = 高能弹幕（F-付费消息字段 §3）。形状：
 *   type@=comm_chatmsg/chatmsg@=<双重转义的内层 chatmsg STT>/cmgType@=1/cprice@=<分>/crealPrice@=<分>/cet@=/vrid@=
 * 落成一个 gift 类事件（进 giftCnt / giftUv / paidUv / incomeCents），价格**直接带在事件上**：
 *   ① crealPrice 字段存在（含 0）→ 就用它：0 = 道具券免费，priceCents = 0（**不回落标价**）
 *   ② crealPrice 字段缺失 → 才回落 cprice（标价）
 *   ③ 两个字段都没有 → 不带 priceCents（→ 计 unknownGiftCnt）
 * 为什么 0 不回落标价：收入是"房间实际收到的钱"，用道具券发的免费高能弹幕没有产生收入，
 * 按标价计会让收入虚高（F-付费消息字段 §3：realPrice 为 0 时页面显示「免费」）。
 */
function archiveIngestParseCommChatmsg(raw, ridFallback, serverNowMs) {
  var innerText = archiveIngestUnescapeNested(archiveIngestField(raw, "chatmsg"));
  var inner = archiveIngestParseFields(innerText);
  var uid = archiveIngestText(inner.uid);
  if (!uid) return null;

  var serverTs = archiveIngestNumber(inner.cst);
  if (serverTs <= 0) serverTs = archiveIngestNumber(inner.ts);
  var ts = serverTs > 0 ? serverTs : serverNowMs;
  var roomId = archiveIngestText(inner.rid) || archiveIngestText(archiveIngestField(raw, "rid"))
    || archiveIngestText(ridFallback);
  var vrid = archiveIngestText(archiveIngestField(raw, "vrid")) || archiveIngestText(inner.vrid);

  // 价格：crealPrice 存在（含 0）就用它（0 = 道具券免费，绝不回落标价）；缺失才回落 cprice
  var realPriceRaw = archiveIngestField(raw, "crealPrice");
  var listPriceRaw = archiveIngestField(raw, "cprice");
  var priceCents = null;
  if (realPriceRaw !== "") {
    priceCents = archiveIngestNumber(realPriceRaw);
  } else if (listPriceRaw !== "") {
    priceCents = archiveIngestNumber(listPriceRaw);
  }

  var event = {
    // vrid 是服务端给的语音弹幕 id，优先用它保证唯一；没有才退到时间戳
    dedupKey: "cm:" + (vrid || ts) + ":" + uid,
    kind: "gift",
    uid: uid,
    nn: archiveIngestCleanNick(inner.nn || inner.nickname),
    rid: roomId,
    ts: ts,
    dayKey: archiveIngestDayKey(ts),
    gfid: "__comm_chatmsg",
    gfn: "高能弹幕",
    gfcnt: 1,
    bcnt: archiveIngestText(ts),
    bg: 0,
    txt: archiveIngestCleanText(inner.txt)
  };
  // 0 也要带上（= 明确免费），只有"两个字段都没有"才不带 → Metrics 侧计 unknown
  if (priceCents !== null) event.priceCents = priceCents;
  return event;
}

// 钻粉定价表：局部覆盖（未来若面板调价，改这里即可；测试也用它注入边界值）
function archiveIngestSetDfPriceTable(patch) {
  if (!patch || typeof patch !== "object") return false;
  if (patch.singleMonthCents !== undefined) ARCHIVE_DF_PRICE_TABLE.singleMonthCents = archiveIngestNumber(patch.singleMonthCents);
  if (patch.month3Cents !== undefined) ARCHIVE_DF_PRICE_TABLE.month3Cents = archiveIngestNumber(patch.month3Cents);
  if (patch.yearMonthCents !== undefined) ARCHIVE_DF_PRICE_TABLE.yearMonthCents = archiveIngestNumber(patch.yearMonthCents);
  if (patch.renewMonthCents !== undefined) ARCHIVE_DF_PRICE_TABLE.renewMonthCents = archiveIngestNumber(patch.renewMonthCents);
  if (patch.assumeSingleMonth !== undefined) ARCHIVE_DF_PRICE_TABLE.assumeSingleMonth = patch.assumeSingleMonth === true;
  if (patch.yearMonths !== undefined) ARCHIVE_DF_PRICE_TABLE.yearMonths = Math.max(1, archiveIngestNumber(patch.yearMonths));
  return true;
}

function archiveIngestGetDfPriceTable() {
  return {
    singleMonthCents: archiveIngestNumber(ARCHIVE_DF_PRICE_TABLE.singleMonthCents),
    month3Cents: archiveIngestNumber(ARCHIVE_DF_PRICE_TABLE.month3Cents),
    yearMonthCents: archiveIngestNumber(ARCHIVE_DF_PRICE_TABLE.yearMonthCents),
    renewMonthCents: archiveIngestNumber(ARCHIVE_DF_PRICE_TABLE.renewMonthCents),
    assumeSingleMonth: ARCHIVE_DF_PRICE_TABLE.assumeSingleMonth === true,
    yearMonths: archiveIngestNumber(ARCHIVE_DF_PRICE_TABLE.yearMonths)
  };
}

// 年卡总价（分）= yearMonths × 年档月均价；mn>=12 时按"整年 × 年卡总价 + 余月 × 158"算
function archiveIngestDfYearUnitCents() {
  var yearMonths = Math.max(1, archiveIngestNumber(ARCHIVE_DF_PRICE_TABLE.yearMonths));
  return yearMonths * archiveIngestNumber(ARCHIVE_DF_PRICE_TABLE.yearMonthCents);
}

/*
 * 钻粉金额折算（分）——按购买月数分档（真机价目表，见表头注释）：
 *   · 续费/自动续费（dfrbc）：年档按 138/月（整年走年卡总价），其余一律 158/月；
 *   · 新购（dfobc）：
 *       mn >= 12 → floor(mn/12) × 年卡总价 + 余月 × 158
 *       mn === 3..11 → mn × 158（3 个月档月均价）
 *       mn === 1 → 218（单月原价）
 *       mn === 2 → 2 × 218（没有 2 个月档，按两次单月）
 * 余月统一按 158（面板上没有"余月单买 218"的档位）。
 * mn 缺失时由调用方先归一成 1 个月，并打 priceUnknown。
 */
function archiveIngestDfCentsFor(months, isRenew) {
  var table = ARCHIVE_DF_PRICE_TABLE;
  var yearMonths = Math.max(1, archiveIngestNumber(table.yearMonths));
  var totalMonths = Math.max(0, archiveIngestNumber(months));
  if (totalMonths <= 0) return 0;

  var renewMonthly = archiveIngestNumber(table.renewMonthCents);
  var wholeYears = Math.floor(totalMonths / yearMonths);
  var restMonths = totalMonths - wholeYears * yearMonths;

  if (wholeYears > 0) {
    return wholeYears * archiveIngestDfYearUnitCents() + restMonths * renewMonthly;
  }
  if (isRenew === true) return totalMonths * renewMonthly;
  if (totalMonths >= 3) return totalMonths * archiveIngestNumber(table.month3Cents);
  /*
   * 不足 3 个月：实务上没人买 218 元的"单月直购"，绝大多数是买「连续包月 158」再手动关掉自动续费
   * （2026-10-17 用户口述 + 面板「已优惠60元」印证）。所以默认按连续包月 158 折算；
   * 单月原价 218 只在 assumeSingleMonth=true 时启用，避免每笔开通常年虚高 60 元。
   */
  if (table.assumeSingleMonth === true) return totalMonths * archiveIngestNumber(table.singleMonthCents);
  return totalMonths * renewMonthly;
}

/*
 * 钻粉开通 / 续费（dfobc / dfrbc，见 F 文档 §2）：
 *   报文**没有任何金额字段**，唯一与钱沾边的是 mn（月数）；金额靠上面的定价表折算。
 * 折算后的价格写进事件的 priceCents（Metrics 侧天然计入 incomeCents 与 paidUv）。
 * mn 缺失/非数字 → 按 1 个月计，并打 priceUnknown（"月数不明"不等于"免费"）。
 */
function archiveIngestParseDiamondFans(raw, typeName, ridFallback, serverNowMs) {
  var uid = archiveIngestText(archiveIngestField(raw, "uid"));
  if (!uid) return null;

  var monthsRaw = archiveIngestField(raw, "mn");
  var months = archiveIngestNumber(monthsRaw);
  var monthsKnown = monthsRaw !== "" && months > 0 && isFinite(Number(monthsRaw));
  if (!monthsKnown) months = 1;
  var isRenew = typeName === "dfrbc" || typeName === "rdfpbc";

  var serverTs = archiveIngestNumber(archiveIngestField(raw, "cst"));
  if (serverTs <= 0) serverTs = archiveIngestNumber(archiveIngestField(raw, "bid"));
  if (serverTs <= 0) serverTs = archiveIngestNumber(archiveIngestField(raw, "cet"));
  var ts = serverTs > 0 ? serverTs : serverNowMs;
  var roomId = archiveIngestText(archiveIngestField(raw, "rid")) || archiveIngestText(ridFallback);

  var event = {
    dedupKey: "df:" + uid + ":" + months + ":" + ts,
    kind: "gift",
    uid: uid,
    // df* 的昵称字段是 nick（不是 nn）；两个都认，取到就走 uid→nn 旁挂表
    nn: archiveIngestCleanNick(archiveIngestField(raw, "nick") || archiveIngestField(raw, "nn")),
    rid: roomId,
    ts: ts,
    dayKey: archiveIngestDayKey(ts),
    gfid: isRenew ? "__df_renew" : "__df_open",
    gfn: isRenew ? "钻粉续费" : "钻粉开通",
    gfcnt: months,
    bcnt: archiveIngestText(ts),
    bg: 0,
    // 按购买月数分档折算（价目表见文件头）：这一笔的总额，Metrics 侧不能再乘 gfcnt
    priceCents: archiveIngestDfCentsFor(months, isRenew),
    priceIsTotal: true
  };
  if (!monthsKnown) event.priceUnknown = true; // Metrics 侧据此再记一次 unknownGiftCnt
  return event;
}

/*
 * 道具订单（prop_order_finish / prop_amountr_finish，见 F 文档 §4.2）：
 *   带**实付价** price（分）与原价 org_price，但**没有 uid**（只有 user_name）。
 * 落成 gift 类事件专供 orderCents / orderCount 两个独立计数 ——
 * **绝不并入 incomeCents/paidUv/giftCnt**（那是礼物口径，混进去就是重复计）。
 */
function archiveIngestParsePropOrder(raw, typeName, ridFallback, serverNowMs) {
  var price = archiveIngestNumber(archiveIngestField(raw, "price"));
  var orgPrice = archiveIngestNumber(archiveIngestField(raw, "org_price"));
  var goodsId = archiveIngestText(archiveIngestField(raw, "goods_id"));
  var userName = archiveIngestCleanNick(archiveIngestField(raw, "user_name"));
  if (!goodsId && !userName) return null;

  var serverTs = archiveIngestNumber(archiveIngestField(raw, "cst"));
  if (serverTs <= 0) serverTs = archiveIngestNumber(archiveIngestField(raw, "ts"));
  if (serverTs <= 0) serverTs = archiveIngestNumber(archiveIngestField(raw, "bid"));
  var ts = serverTs > 0 ? serverTs : serverNowMs;
  var roomId = archiveIngestText(archiveIngestField(raw, "rid")) || archiveIngestText(ridFallback);

  return {
    dedupKey: "po:" + goodsId + ":" + ts + ":" + userName,
    kind: "gift",
    uid: "",                     // 报文没有 uid：不参与任何去重口径，只做房间级计数
    nn: userName,
    rid: roomId,
    ts: ts,
    dayKey: archiveIngestDayKey(ts),
    gfid: "__order_prop",
    gfn: "道具订单",
    gfcnt: 1,
    bcnt: archiveIngestText(ts),
    bg: 0,
    priceCents: price,
    orgPriceCents: orgPrice,
    orderType: typeName,
    isOrder: true
  };
}

/* ---------- 非事件类型 ---------- */

// pingreq：唯一可靠的时钟锚点。clockSkew = 本机时钟 − 服务端时钟。
function archiveIngestHandlePingreq(raw) {
  var tick = archiveIngestNumber(archiveIngestField(raw, "tick"));
  if (tick <= 0) return null;
  archiveIngestClockSkew = Date.now() - tick;
  return archiveIngestClockSkew;
}

/*
 * oni / oun 已从采集面移除（2026-10-17：贵宾数不再采集，tap 白名单也从 13 类降到 11 类）。
 * 若这里仍收到 oni（旧版 tap 或测试直接喂包）：没有任何用途，直接忽略 —— 不解析、不入库、
 * 不参与覆盖率分母。
 */

/* ---------- 聚合与明细决策 ---------- */

// 把一条事件折算进「待落库聚合」。**每条事件都算**，与是否存明细无关。
function archiveIngestAccumulate(event, flags) {
  var metrics = archiveIngestMetricsApi();
  if (!metrics || typeof metrics.applyEvent !== "function" || typeof metrics.newRoomDay !== "function") return false;
  try {
    var ridDay = archiveIngestText(event.rid) + "|" + archiveIngestText(event.dayKey);
    var current = archiveIngestPendingRoomDays[ridDay];
    if (!current) {
      current = metrics.newRoomDay(event.rid, event.dayKey);
      archiveIngestPendingRoomDays[ridDay] = current;
    }
    archiveIngestPendingRoomDays[ridDay] = metrics.applyEvent(current, event, flags || {});
    return true;
  } catch (error) {
    return false;
  }
}

/*
 * 明细计数：每日首次从 meta 恢复（重启后接着算），之后纯内存累加。
 * 只增不减，异步恢复回来的旧值若更大就顶上去（内存里可能已经又加了若干条）。
 */
function archiveIngestEnsureDetailCounter(ridDay) {
  if (archiveIngestDetailRestored[ridDay]) return;
  archiveIngestDetailRestored[ridDay] = true;
  if (archiveIngestDetailCount[ridDay] !== undefined) return;
  archiveIngestDetailCount[ridDay] = 0;
  var db = archiveIngestDbApi();
  if (!db || typeof db.getMeta !== "function") return;
  try {
    var task = db.getMeta("detailCount:" + ridDay);
    if (task && typeof task.then === "function") {
      task.then(function (value) {
        var restored = archiveIngestNumber(value);
        if (restored > archiveIngestNumber(archiveIngestDetailCount[ridDay])) {
          archiveIngestDetailCount[ridDay] = restored;
        }
      }, function () { });
    } else {
      var direct = archiveIngestNumber(task);
      if (direct > archiveIngestNumber(archiveIngestDetailCount[ridDay])) {
        archiveIngestDetailCount[ridDay] = direct;
      }
    }
  } catch (error) { }
}

/*
 * 限额 + 抽样：返回 true 表示这条 chat 明细可以入库。
 * 计数对象是"尝试写入的 chat 明细条数"；被抽掉的弹幕**仍然计入 danmakuCnt**
 * （聚合已在 archiveIngestAccumulate 里加过），所以聚合值永不受抽样影响。
 * 礼物不调用本函数 —— 礼物量小且是收入值的明细依据，永不抽样、永不丢。
 */
function archiveIngestShouldStoreChat(ridDay) {
  archiveIngestEnsureDetailCounter(ridDay);
  var count = archiveIngestNumber(archiveIngestDetailCount[ridDay]) + 1;
  archiveIngestDetailCount[ridDay] = count;
  var limit = Math.max(1, archiveIngestNumber(archiveIngestDetailLimit));
  if (count <= limit) return true;
  if (count % ARCHIVE_INGEST_DETAIL_SAMPLE_EVERY === 0) return true;
  archiveIngestDetailDropped[ridDay] = archiveIngestNumber(archiveIngestDetailDropped[ridDay]) + 1;
  archiveIngestDetailSampled[ridDay] = true;
  archiveIngestCounters.detailDropped += 1;
  return false;
}

/* ---------- 队列与批写 ---------- */

function archiveIngestClearFlushTimer() {
  if (archiveIngestFlushTimer === null) return;
  try {
    if (typeof clearTimeout === "function") clearTimeout(archiveIngestFlushTimer);
  } catch (error) { }
  archiveIngestFlushTimer = null;
}

function archiveIngestScheduleFlush() {
  if (archiveIngestFlushTimer !== null) return;
  if (typeof setTimeout !== "function") return;
  try {
    archiveIngestFlushTimer = setTimeout(function () {
      archiveIngestFlushTimer = null;
      archiveIngestFlush();
    }, ARCHIVE_INGEST_FLUSH_DELAY_MS);
  } catch (error) {
    archiveIngestFlushTimer = null;
  }
}

function archiveIngestEnqueue(event) {
  archiveIngestQueue.push(event);
  archiveIngestCounters.queued += 1;
  if (archiveIngestQueue.length >= ARCHIVE_INGEST_BATCH_MAX) {
    archiveIngestFlush();
    return;
  }
  archiveIngestScheduleFlush();
}

// 纯增量字段（时间轴、快照类字段都不算增量）
function archiveIngestDeltasOf(roomDay) {
  var fields = [
    "danmakuCnt", "incomeCents", "giftCnt", "activeUv", "chatUv",
    "giftUv", "paidUv", "enterUv", "bagCnt", "freeCnt", "unknownGiftCnt",
    // 独立口径（不进 incomeCents）：道具订单实付 / 钻粉月数与折算金额
    "orderCents", "orderCount", "dfMonths", "dfCents"
  ];
  var deltas = {};
  for (var index = 0; index < fields.length; index++) {
    deltas[fields[index]] = archiveIngestNumber(roomDay[fields[index]]);
  }
  return deltas;
}

/*
 * 本批的房间日 patch/deltas。
 * ⚠ patch 只能放「快照字段」，**绝不能放计数**（db 侧先 patch 覆盖、再 deltas 累加；
 *   把批次计数塞进 patch 会让累计值每次都被重置成本批值）。
 * ⚠ observedMin / detailKept / detailDropped 只走 deltas，patch 里一个都不许出现。
 * 取走即清零：聚合、观测增量、抽样增量都在本批结清（失败也只丢这一批，不重排队）。
 */
function archiveIngestBuildPatches(eventList) {
  var patchList = [];
  var keptByRidDay = Object.create(null);
  for (var cursor = 0; cursor < eventList.length; cursor++) {
    var item = eventList[cursor];
    if (!item || item.kind !== "chat") continue;
    var keptKey = archiveIngestText(item.rid) + "|" + archiveIngestText(item.dayKey);
    keptByRidDay[keptKey] = archiveIngestNumber(keptByRidDay[keptKey]) + 1;
  }

  var ridDays = Object.keys(archiveIngestPendingRoomDays);
  for (var index = 0; index < ridDays.length; index++) {
    var ridDay = ridDays[index];
    var roomDay = archiveIngestPendingRoomDays[ridDay];
    if (!roomDay) continue;

    var patch = { rid: roomDay.rid, dayKey: roomDay.dayKey };
    // 时间轴只在有值时下发，避免把库里已有的 firstTs/lastTs 覆盖成 0
    if (archiveIngestNumber(roomDay.firstTs) > 0) patch.firstTs = archiveIngestNumber(roomDay.firstTs);
    if (archiveIngestNumber(roomDay.lastTs) > 0) patch.lastTs = archiveIngestNumber(roomDay.lastTs);
    if (archiveIngestDetailSampled[ridDay]) patch.detailSampled = true;

    var deltas = archiveIngestDeltasOf(roomDay);
    deltas.observedMin = archiveIngestNumber(archiveIngestObservedDelta[ridDay]);
    deltas.detailKept = archiveIngestNumber(keptByRidDay[ridDay]);
    deltas.detailDropped = archiveIngestNumber(archiveIngestDetailDropped[ridDay]);

    patchList.push({ ridDay: ridDay, roomDay: patch, deltas: deltas });

    delete archiveIngestPendingRoomDays[ridDay];
    delete archiveIngestObservedDelta[ridDay];
    delete archiveIngestDetailDropped[ridDay];
  }
  return patchList;
}

/*
 * upsertRoomDay 串行化：同一 ridDay 一条 promise 链，前一个 resolve 才发下一个。
 * 并发读改写会丢更新（实测 enterUv=1685，而事件表里真实 1958 条进场）。
 * 不同 ridDay 各自一条链，互不阻塞。
 * 失败只计数（upsertErrors）、不阻塞队列 —— 聚合少写一次远好过整条链卡死。
 */
function archiveIngestEnqueueUpsert(patch) {
  if (!patch || !patch.ridDay) return;
  var db = archiveIngestDbApi();
  if (!db || typeof db.upsertRoomDay !== "function") return;
  var ridDay = patch.ridDay;
  var previous = archiveIngestUpsertChains[ridDay];
  if (!previous) previous = Promise.resolve();

  var next = previous.then(function () {
    var result;
    try {
      result = db.upsertRoomDay(ridDay, patch.roomDay, patch.deltas);
    } catch (error) {
      archiveIngestCounters.upsertErrors += 1;
      return null;
    }
    return Promise.resolve(result).then(function (value) {
      if (value && value.ok === false) archiveIngestCounters.upsertErrors += 1;
      return value;
    }, function () {
      archiveIngestCounters.upsertErrors += 1;
      return null;
    });
  });

  archiveIngestUpsertChains[ridDay] = next;
  next.then(function () {
    if (archiveIngestUpsertChains[ridDay] === next) delete archiveIngestUpsertChains[ridDay];
  }, function () {
    delete archiveIngestUpsertChains[ridDay];
  });
}

function archiveIngestApplyRoomDayPatches(patchList) {
  for (var index = 0; index < patchList.length; index++) {
    archiveIngestEnqueueUpsert(patchList[index]);
  }
}

/*
 * seen 落库：**成功才清 pending**，失败保留给下一次 flush 重试。
 *
 * 这是上一版最贵的一个 bug：旧实现 flush 时先把 pending 整段夺走并清空，之后才 await putSeen；
 * 只要这次 putSeen 没落地（页面刷新/关闭打断、或写失败），这批 uid 就永久没了 —— 本会话内存
 * Set 还在所以不重复计，一刷新内存清空、库里也没有 → 下次会话把它们全重算成"当日首次"
 * （正是 DB 同事实验里那 +9 的残差；不是 DB 并发覆盖，IndexedDB 的重叠 readwrite 事务本来就串行）。
 *
 * 现在的做法：取快照 → putSeen → 成功回调里按 seq 精确摘除；失败/超时/不支持都**保留**。
 */
function archiveIngestFlushSeen() {
  if (!archiveIngestSeenPending.length) return false;
  if (archiveIngestSeenInFlight) return false;
  var db = archiveIngestDbApi();
  if (!db || typeof db.putSeen !== "function") {
    archiveIngestCounters.seenRetry += 1;
    return false;
  }

  var snapshot = archiveIngestSeenPending.slice();
  var payload = [];
  for (var index = 0; index < snapshot.length; index++) {
    payload.push({ scope: snapshot[index].scope, dayKey: snapshot[index].dayKey, uid: snapshot[index].uid });
  }

  archiveIngestSeenInFlight = true;
  var commit = function () {
    archiveIngestSeenInFlight = false;
    archiveIngestCommitSeen(snapshot);
  };
  var fail = function () {
    archiveIngestSeenInFlight = false;
    archiveIngestCounters.seenRetry += 1;
  };

  try {
    var task = db.putSeen(payload);
    if (task && typeof task.then === "function") {
      task.then(function (result) {
        if (result && result.ok === false) { fail(); return; }
        commit();
      }, fail);
      return true;
    }
    if (task && task.ok === false) { fail(); return false; }
    commit();
    return true;
  } catch (error) {
    fail();
    return false;
  }
}

// 按 seq 摘除已成功落库的那一批（快照之后新加的项 seq 更大，必须留下）
function archiveIngestCommitSeen(snapshot) {
  if (!snapshot || !snapshot.length) return;
  if (!archiveIngestSeenPending.length) return;
  var lastSeq = archiveIngestNumber(snapshot[snapshot.length - 1].seq);
  var kept = [];
  for (var index = 0; index < archiveIngestSeenPending.length; index++) {
    var item = archiveIngestSeenPending[index];
    if (archiveIngestNumber(item.seq) > lastSeq) kept.push(item);
  }
  archiveIngestSeenPending = kept;
}

// 尽力而为：不等结果，把当前 pending 的请求立刻发出去（pagehide / stop 收尾用）
function archiveIngestPutSeenNow() {
  try {
    archiveIngestFlushSeen();
  } catch (error) { }
}

/*
 * 侧写：用户轻档案 + 两条 meta + 明细计数。都只服务覆盖率/UI 自证，失败一律静默。
 *   users：同一 uid 合并（cnt 累加），用于「用户数」；昵称从旁挂的 uid→nn 表取（事件里没有 nn）
 *   meta.lastFlush：面板的「最近写入」
 *   meta.clockSkew：面板的「时钟偏差」
 *   meta.detailCount:<ridDay>：明细计数（重启后接着算限额）
 */
function archiveIngestWriteSideData(eventList, patchList) {
  var db = archiveIngestDbApi();
  if (!db) return;
  try {
    if (typeof db.putUsers === "function" && eventList && eventList.length) {
      var byUid = Object.create(null);
      var profileList = [];
      for (var index = 0; index < eventList.length; index++) {
        var item = eventList[index];
        if (!item || !item.uid) continue;
        var uidText = archiveIngestText(item.uid);
        if (!uidText) continue;
        if (!byUid[uidText]) {
          byUid[uidText] = {
            uid: uidText,
            nn: archiveIngestText(archiveIngestUserNames[uidText]),
            lastSeen: 0,
            cnt: 0
          };
          profileList.push(byUid[uidText]);
        }
        var profile = byUid[uidText];
        if (item.nn) profile.nn = item.nn;
        var ts = archiveIngestNumber(item.ts);
        if (ts > profile.lastSeen) profile.lastSeen = ts;
        profile.cnt += 1;
      }
      if (profileList.length) {
        var userTask = db.putUsers(profileList);
        if (userTask && typeof userTask.then === "function") userTask.then(null, function () { });
      }
    }
    if (typeof db.setMeta === "function") {
      var flushTask = db.setMeta("lastFlush", Date.now());
      if (flushTask && typeof flushTask.then === "function") flushTask.then(null, function () { });
      var skewTask = db.setMeta("clockSkew", archiveIngestNumber(archiveIngestClockSkew));
      if (skewTask && typeof skewTask.then === "function") skewTask.then(null, function () { });
      for (var cursor = 0; cursor < patchList.length; cursor++) {
        var ridDay = patchList[cursor].ridDay;
        var countTask = db.setMeta("detailCount:" + ridDay, archiveIngestNumber(archiveIngestDetailCount[ridDay]));
        if (countTask && typeof countTask.then === "function") countTask.then(null, function () { });
      }
    }
  } catch (error) { }
}

/*
 * 落库。永远返回 resolved 的 Promise（绝不 reject）：
 *   {ok:true, written, skipped} / {ok:false, reason, written:0, skipped}
 * 失败不重排队：DB 挂了的话重排队会把内存吃光，dropped 计数器就是为这种情况准备的。
 * 只有聚合（无明细）的批次同样会走完：事件表为空也要把 deltas/patch 写下去。
 */
/*
 * 批内按 dedupKey 去重（同一条 cid 在同一批里重复出现时只留一条）。
 * 跨批去重仍由 DB 的 unique 索引负责；这里只是别把明显重复的东西塞进同一个事务。
 */
function archiveIngestDedupeEvents(eventList) {
  var deduped = [];
  var seenKeys = Object.create(null);
  for (var index = 0; index < eventList.length; index++) {
    var item = eventList[index];
    if (!item || typeof item !== "object") continue;
    var key = archiveIngestText(item.dedupKey);
    if (!key) {
      deduped.push(item);
      continue;
    }
    if (seenKeys[key]) continue;
    seenKeys[key] = 1;
    deduped.push(item);
  }
  return deduped;
}

// seen 快照 → 落库载荷（去掉内部 seq，保持 {scope, dayKey, uid}）
function archiveIngestSeenPayload(seenSnapshot) {
  var payload = [];
  for (var index = 0; index < seenSnapshot.length; index++) {
    payload.push({
      scope: seenSnapshot[index].scope,
      dayKey: seenSnapshot[index].dayKey,
      uid: seenSnapshot[index].uid
    });
  }
  return payload;
}

/*
 * 原子批量提交：明细 + 名单 + 聚合**一次事务**写完。
 *
 * 为什么必须原子：三次独立写入时，若页面在"明细已写、名单没写"之间被刷新/强杀，
 * 下次会话会把同一批 uid 重算成"当日首次"，表现为刷新后 UV 虚高约 5%。
 *
 * 走这条路时**不需要** putSeen 那套"先发、成功再清 pending"的两段式：一次事务就是一次成败，
 * 成功即按 seq 精确清 pending，失败则 pending 原样保留（下次 flush 重试）。
 * 回落路径（老 DB 没有 commitBatch）保留两段式，作为兼容保险。
 */
function archiveIngestCommitAtomic(db, batch, seenSnapshot, eventList) {
  var task;
  try {
    task = Promise.resolve(db.commitBatch(batch));
  } catch (error) {
    task = Promise.resolve({ ok: false, reason: "exception" });
  }

  return task.then(function (result) {
    if (!result || result.ok === false) {
      // 整体不落地：事件不重排队（避免把内存吃光），seen 保留待重试
      archiveIngestCounters.dropped += eventList.length;
      archiveIngestCounters.seenRetry += 1;
      return {
        ok: false,
        reason: (result && result.reason) || "commit-failed",
        written: 0,
        skipped: eventList.length
      };
    }
    var added = typeof result.added === "number" ? result.added : eventList.length;
    var skipped = Math.max(0, eventList.length - added);
    archiveIngestCounters.written += added;
    archiveIngestCounters.dropped += skipped;
    archiveIngestCounters.commitBatches += 1;
    // 事务成功 = 名单与明细同一时刻落地，这里才清 pending
    archiveIngestCommitSeen(seenSnapshot);
    // users / 两条 meta 是"自证用"的附带写入，失败不影响主链路（也不与主事务耦合）
    archiveIngestWriteSideData(eventList, batch.roomDays || []);
    return { ok: true, written: added, skipped: skipped };
  }).then(null, function (error) {
    archiveIngestCounters.dropped += eventList.length;
    archiveIngestCounters.seenRetry += 1;
    return { ok: false, reason: "exception", written: 0, skipped: eventList.length };
  });
}

// 回落：老 DB（没有 commitBatch）仍走 putEvents → upsertRoomDay → putSeen 三条独立路径
function archiveIngestCommitFallback(db, eventList, patchList, seenSnapshot) {
  var writePromise;
  try {
    if (!eventList.length) {
      writePromise = Promise.resolve({ ok: true, added: 0, skipped: 0 });
    } else if (db && typeof db.putEvents === "function") {
      writePromise = Promise.resolve(db.putEvents(eventList));
    } else {
      writePromise = Promise.resolve({ ok: false, reason: "no-db" });
    }
  } catch (error) {
    writePromise = Promise.resolve({ ok: false, reason: "exception" });
  }

  return writePromise.then(function (result) {
    var isOk = !!result && result.ok !== false;
    if (!isOk) {
      archiveIngestCounters.dropped += eventList.length;
      if (seenSnapshot && seenSnapshot.length) archiveIngestCounters.seenRetry += 1;
      return {
        ok: false,
        reason: (result && result.reason) || "db-error",
        written: 0,
        skipped: eventList.length
      };
    }
    var added = result && typeof result.added === "number" ? result.added : eventList.length;
    var skipped = Math.max(0, eventList.length - added);
    archiveIngestCounters.written += added;
    archiveIngestCounters.dropped += skipped;
    archiveIngestApplyRoomDayPatches(patchList);
    archiveIngestWriteSideData(eventList, patchList);
    // 回落路径的两段式：seen 走"成功才清 pending"
    archiveIngestFlushSeen();
    return { ok: true, written: added, skipped: skipped };
  }).then(null, function (error) {
    archiveIngestCounters.dropped += eventList.length;
    return { ok: false, reason: "exception", written: 0, skipped: eventList.length };
  });
}

function archiveIngestFlush() {
  var eventList = [];
  var patchList = [];
  var seenSnapshot = [];
  try {
    archiveIngestClearFlushTimer();
    var hasPendingRooms = Object.keys(archiveIngestPendingRoomDays).length > 0;
    var hasPendingSeen = archiveIngestSeenPending.length > 0;
    if (!archiveIngestQueue.length && !hasPendingRooms) {
      // 队列空但 seen 还有欠账时，也要把 seen 再送一次（上一次没落地的重试）
      if (hasPendingSeen) archiveIngestFlushSeen();
      return Promise.resolve({ ok: true, written: 0, skipped: 0 });
    }
    eventList = archiveIngestQueue;
    archiveIngestQueue = [];
    patchList = archiveIngestBuildPatches(eventList);
    // 取快照但**不清空**：只有真正落地（事务成功 / putSeen 成功）才按 seq 摘除
    seenSnapshot = archiveIngestSeenPending.slice();
  } catch (error) {
    return Promise.resolve({ ok: false, reason: "exception", written: 0, skipped: 0 });
  }

  var db = archiveIngestDbApi();
  // 批内先按 dedupKey 去重：两条一模一样的报文（同一 cid / 同一 vrid）不该在同一个事务里写两遍
  var persistList = archiveIngestDedupeEvents(eventList);
  if (db && typeof db.commitBatch === "function") {
    var batch = {
      events: persistList,
      seen: archiveIngestSeenPayload(seenSnapshot),
      roomDays: patchList
    };
    return archiveIngestCommitAtomic(db, batch, seenSnapshot, eventList);
  }
  return archiveIngestCommitFallback(db, persistList, patchList, seenSnapshot);
}

/* ---------- 入口 ---------- */

/*
 * 收到的每个报文走一遍。type / raw 全判空；任何异常都收敛成 parseErrors + 返回 false。
 * 可被测试直接调用（不需要先 start()）。
 */
function archiveIngestOnPacket(type, raw) {
  try {
    if (type === null || type === undefined || type === "") {
      archiveIngestCounters.parseErrors += 1;
      return false;
    }
    var typeName = String(type);

    if (typeName === "pingreq") {
      archiveIngestHandlePingreq(raw);
      return true;
    }
    if (typeName === "oni" || typeName === "oun") {
      // 贵宾数已停止采集（tap 白名单也同步移除了这两类）。若旧版 tap 仍广播、或测试直接喂包，
      // 一律忽略：不解析、不入库、不参与覆盖率分母。
      return true;
    }
    if (!Object.prototype.hasOwnProperty.call(ARCHIVE_INGEST_PARSE_TYPES, typeName)) {
      return false;
    }
    if (raw === null || raw === undefined) {
      archiveIngestCounters.parseErrors += 1;
      return false;
    }

    var serverNow = archiveIngestServerNow();
    var ridFallback = archiveIngestRidFallback();
    var event = null;
    if (typeName === "chatmsg") {
      event = archiveIngestParseChatmsg(raw, ridFallback, serverNow);
    } else if (typeName === "dgb") {
      event = archiveIngestParseGift(raw, ridFallback, serverNow);
    } else if (typeName === "uenter") {
      event = archiveIngestParseEnter(raw, ridFallback, serverNow);
    } else if (typeName === "comm_chatmsg") {
      event = archiveIngestParseCommChatmsg(raw, ridFallback, serverNow);
    } else if (typeName === "dfobc" || typeName === "dfrbc") {
      event = archiveIngestParseDiamondFans(raw, typeName, ridFallback, serverNow);
    } else if (typeName === "prop_order_finish" || typeName === "prop_amountr_finish") {
      event = archiveIngestParsePropOrder(raw, typeName, ridFallback, serverNow);
    }
    if (!event) {
      // 解析没崩、但缺 uid：无法定位用户，也没有可用的去重键
      archiveIngestCounters.dropped += 1;
      return false;
    }

    // 昵称不进 events（体积），但 users 表要用 —— 先旁挂到 uid→nn，再把事件上的 nn 摘掉
    archiveIngestRememberNick(event.uid, event.nn);
    if (event.nn !== undefined) delete event.nn;

    // seen 还没灌完：只缓冲，不聚合、不入队、不写库 —— 否则开头几百毫秒的弹幕会被判成
    // "当日首次"，把 activeUv/chatUv 抬高（实测 +7%）。开闸时按原顺序重放。
    if (archiveIngestSeenReady !== true) {
      archiveIngestBufferForGate(event);
      return true;
    }

    return archiveIngestHandleParsedEvent(event, "direct");
  } catch (error) {
    archiveIngestCounters.parseErrors += 1;
    return false;
  }
}

/*
 * 解析之后的所有处理：观测分钟 → 当日首次判定 → 聚合 → 明细决策 → 入队。
 * 直通路径与"开闸重放"共用这一个函数，保证两条路径的聚合/入库顺序完全一致。
 */
function archiveIngestHandleParsedEvent(event, source) {
  try {
    // 覆盖率分子：这一分钟该 ridDay 是否算"观测过"（rid / ts 缺一不可）
    archiveIngestCountObservedMinute(event.rid, event.ts);

    var flags = {
      isNewActiveUid: false,
      isNewChatUid: false,
      isNewGiftUid: false,
      isNewPaidUid: false,
      isNewEnterUid: false,
      giftPrice: null
    };
    if (event.kind === "chat") {
      flags.isNewActiveUid = archiveIngestMarkSeen("active", event.rid, event.dayKey, event.uid);
      flags.isNewChatUid = archiveIngestMarkSeen("chat", event.rid, event.dayKey, event.uid);
    } else if (event.kind === "gift") {
      flags.isNewActiveUid = archiveIngestMarkSeen("active", event.rid, event.dayKey, event.uid);
      flags.isNewGiftUid = archiveIngestMarkSeen("gift", event.rid, event.dayKey, event.uid);
      if (event.priceCents !== undefined && event.priceCents !== null) {
        // 高能弹幕：价格就带在事件上，不再查价目
        flags.giftPrice = archiveIngestNumber(event.priceCents);
      } else if (Object.prototype.hasOwnProperty.call(ARCHIVE_INGEST_PSEUDO_GIFT_IDS, event.gfid)) {
        // 钻粉等伪礼物：报文没有金额，只记 unknownGiftCnt（绝不拿 0 冒充免费）
        flags.giftPrice = null;
      } else {
        flags.giftPrice = archiveIngestResolveGiftPrice(event.gfid);
      }
      if (flags.giftPrice !== null && flags.giftPrice > 0) {
        flags.isNewPaidUid = archiveIngestMarkSeen("paid", event.rid, event.dayKey, event.uid);
      }
    } else if (event.kind === "enter") {
      flags.isNewEnterUid = archiveIngestMarkSeen("enter", event.rid, event.dayKey, event.uid);
    }

    // 探针：只有真的判了"首次"才记一笔（关闭时这里只是一次对象判空）
    if (flags.isNewActiveUid || flags.isNewChatUid || flags.isNewGiftUid || flags.isNewPaidUid || flags.isNewEnterUid) {
      var scopeNames = [];
      if (flags.isNewActiveUid) scopeNames.push("active");
      if (flags.isNewChatUid) scopeNames.push("chat");
      if (flags.isNewGiftUid) scopeNames.push("gift");
      if (flags.isNewPaidUid) scopeNames.push("paid");
      if (flags.isNewEnterUid) scopeNames.push("enter");
      archiveIngestProbeFirstSeen(event, flags, source, scopeNames.join("+"));
    }

    // 聚合按**全量事件**走，先于任何"存不存明细"的判断
    archiveIngestAccumulate(event, flags);

    // 进场：只留 enterUv，不写明细
    if (event.kind === "enter") {
      archiveIngestScheduleFlush();
      return true;
    }

    // 聊天：受明细限额抽样；被抽掉也不影响上面已经加过的聚合
    if (event.kind === "chat") {
      var chatRidDay = archiveIngestText(event.rid) + "|" + archiveIngestText(event.dayKey);
      if (!archiveIngestShouldStoreChat(chatRidDay)) {
        archiveIngestScheduleFlush();
        return true;
      }
    }

    archiveIngestEnqueue(event);
    return true;
  } catch (error) {
    archiveIngestCounters.parseErrors += 1;
    return false;
  }
}

/*
 * 页面要走了（刷新/关闭/进后台）：尽力而为地收尾。
 *   · flush()：把事件队列与聚合发出去；
 *   · putSeenNow()：把 pending seen 立刻再发一次（不等结果 —— 等就来不及了）。
 * 不依赖外部调用者（DanmakuArchive.js 的 pagehide 走的是 stop()，两条路都能兜住）。
 */
function archiveIngestOnPageHide() {
  try {
    archiveIngestFlush();
  } catch (error) { }
  try {
    archiveIngestPutSeenNow();
  } catch (error) { }
}

// 页面进后台时立刻落库：后台标签页的 setTimeout 会被节流到分钟级，不能等定时器
function archiveIngestOnVisibilityChange() {
  try {
    var doc = archiveIngestDocumentApi();
    var state = doc && typeof doc.visibilityState === "string" ? doc.visibilityState : "";
    if (state !== "hidden") return;
    archiveIngestFlush();
    archiveIngestPutSeenNow();
  } catch (error) { }
}

function archiveIngestBindVisibility() {
  if (archiveIngestVisibilityBound) return;
  var doc = archiveIngestDocumentApi();
  if (!doc || typeof doc.addEventListener !== "function") return;
  try {
    doc.addEventListener("visibilitychange", archiveIngestOnVisibilityChange, false);
    // pagehide：刷新/关闭时的最后机会（比 unload 可靠，且被 bfcache 兼容）
    doc.addEventListener("pagehide", archiveIngestOnPageHide, false);
    archiveIngestVisibilityBound = true;
  } catch (error) { }
}

/*
 * 价目表预热：primeGifts 返回 Promise，只是"抢跑"，不阻塞采集。
 * 失败/超时/ArchiveMeta 缺失全部忽略 —— 价目没到之前收到的礼物照常入库，
 * 只是那段时间计入 unknownGiftCnt，事后不回算（见文件头"不回填"口径）。
 */
function archiveIngestPrimeGiftPrices() {
  try {
    var meta = archiveIngestMetaApi();
    if (!meta || typeof meta.primeGifts !== "function") return false;
    var result = meta.primeGifts(archiveIngestRidFallback());
    if (result && typeof result.then === "function") {
      result.then(function () { }, function () { });
    }
    return true;
  } catch (error) {
    return false;
  }
}

/*
 * 观测心跳：每 60 秒把"当前这一分钟"记成已观测。
 *
 * 为什么要它：覆盖率回答的是「本机在这一小时里到底有没有在收」，与"这分钟有没有人说话"无关。
 * 只靠事件触发的话，一个安静的房间里我们明明守着 1 小时，覆盖率也会显示 0，
 * 那就把"数据可信度"算成了"房间活跃度"。心跳与事件两条路都走，同一分钟会被去重。
 */
function archiveIngestObservedHeartbeat() {
  try {
    if (!archiveIngestStarted) return false;
    var roomId = "";
    try {
      roomId = typeof rid !== "undefined" && rid ? archiveIngestText(rid) : "";
    } catch (e) {
      roomId = "";
    }
    if (!roomId) return false;
    return archiveIngestCountObservedMinute(roomId, archiveIngestServerNow());
  } catch (error) {
    return false;
  }
}

function archiveIngestClearObservedTimer() {
  if (archiveIngestObservedTimer) {
    clearInterval(archiveIngestObservedTimer);
    archiveIngestObservedTimer = 0;
  }
}

/*
 * 订阅采集。返回 true 表示真订阅上了；false 表示没找到 tap（页面还没注入 / 上下文不同），
 * 这不是错误：静默降级，由 getCounters().tapHost 如实反映"未接入"。
 */
function archiveIngestStart() {
  try {
    if (archiveIngestStarted) return true;
    /*
     * seen 就绪闸门：**先关闸、再订阅**。
     * 顺序反了就会出现"tap 已生效、seen 还没灌完"的窗口，那几百毫秒的弹幕全被算成当日首次
     * （实测残差 +7%）。关闸期间的事件只缓冲，loadSeen 落地/失败/超时后再按序重放。
     */
    archiveIngestSeenReady = false;
    archiveIngestClearSeenGateTimer();
    if (typeof setTimeout === "function") {
      try {
        archiveIngestSeenGateTimer = setTimeout(function () {
          archiveIngestSeenGateTimer = null;
          archiveIngestReleaseGate(true); // 硬超时兜底：可选依赖不能把采集挂死
        }, ARCHIVE_INGEST_SEEN_GATE_TIMEOUT_MS);
      } catch (error) {
        archiveIngestSeenGateTimer = null;
      }
    }
    // 把当日 seen 灌回内存（异步）；灌完 / 失败 / 超时都会开闸。没有 getSeen 时同步开闸。
    archiveIngestLoadSeen(function (failed) {
      archiveIngestReleaseGate(failed);
    });
    // 预热价目与订阅解耦：即使 tap 还没就绪，先把礼物价目拉起来（失败无副作用）
    archiveIngestPrimeGiftPrices();
    var tap = archiveIngestResolveTap();
    if (!tap || typeof tap.on !== "function") return false;
    archiveIngestTapHandler = function (type, raw) {
      archiveIngestOnPacket(type, raw);
    };
    tap.on(archiveIngestTapHandler);
    archiveIngestStarted = true;
    archiveIngestBindVisibility();
    // 观测心跳：进房先记一分钟，之后每分钟补一次（安静房间也要算我们在收）
    archiveIngestObservedHeartbeat();
    archiveIngestClearObservedTimer();
    archiveIngestObservedTimer = setInterval(archiveIngestObservedHeartbeat, 60000);
    return true;
  } catch (error) {
    archiveIngestSeenReady = true;
    return false;
  }
}

function archiveIngestStop() {
  try {
    archiveIngestClearFlushTimer();
    archiveIngestClearObservedTimer();
    // 停采集也要把闸门打开并冲刷缓冲，否则缓冲里的事件会静默烂在内存里
    archiveIngestReleaseGate(false);
    archiveIngestClearSeenGateTimer();
    if (archiveIngestTapHandler) {
      var tap = archiveIngestResolveTap();
      if (tap && typeof tap.off === "function") tap.off(archiveIngestTapHandler);
    }
    archiveIngestTapHandler = null;
    archiveIngestStarted = false;
    // 尽力而为收尾：队列、聚合、pending seen 的请求都立刻发出去（不等结果）
    try {
      archiveIngestFlush();
    } catch (error) { }
    archiveIngestPutSeenNow();
    return true;
  } catch (error) {
    return false;
  }
}

function archiveIngestSetClockSkew(ms) {
  archiveIngestClockSkew = archiveIngestNumber(ms);
  return archiveIngestClockSkew;
}

function archiveIngestSetGiftPriceResolver(resolver) {
  archiveIngestGiftPriceResolver = typeof resolver === "function" ? resolver : null;
  return archiveIngestGiftPriceResolver !== null;
}

// 明细上限注入（测试与未来配置共用；生产默认 100000 条/房·天）
function archiveIngestSetDetailLimit(limit) {
  archiveIngestDetailLimit = Math.max(1, archiveIngestNumber(limit));
  return archiveIngestDetailLimit;
}

// 计数器快照（拷贝出去，调用方改不动内部状态）
function archiveIngestGetCounters() {
  return {
    queued: archiveIngestCounters.queued,
    written: archiveIngestCounters.written,
    dropped: archiveIngestCounters.dropped,
    parseErrors: archiveIngestCounters.parseErrors,
    pending: archiveIngestQueue.length,
    clockSkew: archiveIngestNumber(archiveIngestClockSkew),
    tapHost: archiveIngestTapHostName,
    subscribed: archiveIngestStarted === true,
    // 覆盖率分子：已经记下但还没落库的观测分钟数（落库后归零）
    observedMinPending: archiveIngestObservedPending(),
    // 字段表构建次数（一条报文只该 +1，用来盯住"每字段一个正则"的回退）
    fieldParses: archiveIngestCounters.fieldParses,
    upsertErrors: archiveIngestCounters.upsertErrors,
    detailDropped: archiveIngestCounters.detailDropped,
    // seen 闸门：是否已开闸 / 载入是否失败 / 闸门期间因缓冲满而丢弃的条数
    seenReady: archiveIngestSeenReady === true,
    seenGatePending: archiveIngestPendingForGate.length,
    seenLoadFailed: archiveIngestCounters.seenLoadFailed === true,
    droppedBeforeSeen: archiveIngestCounters.droppedBeforeSeen,
    // seen 落库欠账：还有多少条没落地 / 重试次数 / 因超上限被丢的条数
    seenPending: archiveIngestSeenPending.length,
    seenRetry: archiveIngestCounters.seenRetry,
    seenLost: archiveIngestCounters.seenLost,
    // 成功落地的原子事务数（走回落路径时恒为 0）
    commitBatches: archiveIngestCounters.commitBatches
  };
}

/* ---------- 对外 ---------- */

var ArchiveIngest = {
  start: archiveIngestStart,
  stop: archiveIngestStop,
  flush: archiveIngestFlush,
  onPacket: archiveIngestOnPacket,
  setClockSkew: archiveIngestSetClockSkew,
  setGiftPriceResolver: archiveIngestSetGiftPriceResolver,
  setDetailLimit: archiveIngestSetDetailLimit,
  getCounters: archiveIngestGetCounters,
  // 钻粉定价表（用户口述的唯一权威来源；活动价/年钻价由这里切）
  setDfPriceTable: archiveIngestSetDfPriceTable,
  getDfPriceTable: archiveIngestGetDfPriceTable,
  // 首次判定探针：真机抓 UV 残差用，默认关闭（不开启不建对象、零开销）
  setSeenProbe: archiveIngestSetSeenProbe,
  getSeenProbe: archiveIngestGetSeenProbe
};
