/* ==================== 回放弹幕反查（本地无档案时按「房间 + 日期」兜底） ==================== */
/*
 * 数据源：斗鱼官方回放三段匿名接口（见 .zcode/p0-data/B-页面与接口数据.md 第四节）
 *   (1) GET https://www.douyu.com/betard/<rid>
 *         -> room.up_id
 *   (2) GET https://v.douyu.com/wgapi/vod/center/authorShowVideoList
 *         ?page=1&limit=20&up_id=<upId>[&start_time=<秒>&end_time=<秒>]
 *         -> data.list[].video_list[].hash_id
 *   (3) GET https://v.douyu.com/wgapi/vod/center/getBarrageListByPage
 *         ?vid=<hashId>&offset=<游标>
 *         -> data.list[].uid / nn / ctt / sts，data.pre 是下一页游标
 *
 * 实测结论（照抄实测报告，不要再试错）：
 *   · 翻页必须用 data.pre。实测用 data.next 六页 600 条只有 105 条唯一；
 *     用 pre 链十页 548 条全唯一。本文件只认 data.pre，next 一律不碰。
 *   · up_id 不等于 uid；authorShowVideoList?uid=<uid> 返回空 count:0。
 *     betard.room.up_id 是唯一的匿名获取途径。
 *   · 回放只有弹幕、没有礼物（mtype / ft 全为 0），礼物流水无法用回放兜底。
 *   · 库端疑似抽样：yyf 房 30 页 3000 条覆盖 83 分钟约 36 条/分钟，明显低于直播实时量。
 *     -> 结果永远带 sampled:true，调用方必须按「抽样口径」展示。
 *   · 只有「有回放」的场次才有数据：主播关回放或平台不存，该天直接没有。
 *   · 三段接口全部匿名可用，无需登录；@connect 已含 douyu.com / douyucdn.cn，无需新增域名。
 *
 * 对外形状：{ ok, items:[{uid,nn,txt,ts,rid}], sampled:true, pages, truncated, reason? }
 *   items 按 sts 升序（ts 为毫秒）；sampled 恒为 true；truncated 表示「预算用完但还有数据」。
 * 失败一律 resolve 成 {ok:false, ...}，reason 取值：
 *   bad-arg / bad-date / unsupported
 *   betard-<http|network|timeout|parse> / no-up-id
 *   shows-<http|network|timeout|parse|shape>
 *   barrage-<http|network|timeout|parse|shape>
 *   budget（请求数硬上限）/ exception（兜底，绝不该出现）
 */

var ARCHIVE_REPLAY_BETARD_URL = "https://www.douyu.com/betard/";
var ARCHIVE_REPLAY_SHOW_LIST_URL = "https://v.douyu.com/wgapi/vod/center/authorShowVideoList";
var ARCHIVE_REPLAY_BARRAGE_URL = "https://v.douyu.com/wgapi/vod/center/getBarrageListByPage";

var ARCHIVE_REPLAY_BARRAGE_PAGE_SIZE = 100;      // 实测每页固定 100 条
var ARCHIVE_REPLAY_SHOW_PAGE_LIMIT = 20;         // 场次清单单页 20 场（约覆盖 10 天的日更主播）
var ARCHIVE_REPLAY_FIXED_REQUESTS = 2;           // betard + 场次清单，弹幕页之外固定消耗
var ARCHIVE_REPLAY_DEFAULT_MAX_PAGES = 10;       // 默认最多 10 页弹幕（1000 条）
var ARCHIVE_REPLAY_MAX_PAGES_CAP = 60;           // 硬顶，防止误传大数字把接口打穿
var ARCHIVE_REPLAY_REQUEST_GAP_MS = 300;         // 串行 + 每请求之间至少 300 ms
var ARCHIVE_REPLAY_REQUEST_TIMEOUT_MS = 8000;
var ARCHIVE_REPLAY_RETRY_BACKOFF_MS = 1000;      // 指数退避基数：1s、2s…
var ARCHIVE_REPLAY_MAX_RETRY = 1;                // 每个逻辑请求最多重试 1 次
var ARCHIVE_REPLAY_UP_ID_TTL_MS = 30 * 60 * 1000; // up_id 内存缓存 30 分钟
var ARCHIVE_REPLAY_DAY_SECONDS = 86400;

// rid -> { upId, fetchedAt }。up_id 稳定不变，缓存只为省掉重复的 betard 请求。
var archiveReplayUpIdCache = Object.create(null);
// 上一次请求的落地时刻，用于保证请求间隔。
var archiveReplayLastRequestAt = 0;

/* ---------- 通用小工具（全部判空） ---------- */

function archiveReplay_trimText(value) {
  if (value === undefined || value === null) return "";
  return String(value).replace(/^\s+|\s+$/g, "");
}

function archiveReplay_delay(milliseconds) {
  return new Promise(function (resolve) {
    setTimeout(resolve, milliseconds > 0 ? milliseconds : 0);
  });
}

/** 进度回调：window.archiveOnProgress 存在就每页调一次，回调自身抛错不得影响反查。 */
function archiveReplay_emitProgress(info) {
  if (typeof window === "undefined" || !window) return;
  if (typeof window.archiveOnProgress !== "function") return;
  try {
    window.archiveOnProgress(info);
  } catch (error) {
    // UI 侧异常一律吞掉：进度只是装饰，不能拖垮数据链路。
  }
}

/* ---------- 日期窗口：本地时区 00:00 换日 ---------- */

/**
 * "YYYY-MM-DD" -> 本地当天 00:00:00 的 Date；格式或数值非法返回 null。
 * 不做 UTC 换算（toISOString 那套在国内时区凌晨 8 点前会整体错位一天）。
 */
function archiveReplay_parseDayKey(dayKey) {
  if (dayKey === undefined || dayKey === null) return null;
  var matched = /^(\d{4})-(\d{1,2})-(\d{1,2})$/.exec(archiveReplay_trimText(dayKey));
  if (!matched) return null;
  var year = Number(matched[1]);
  var month = Number(matched[2]);
  var day = Number(matched[3]);
  if (!isFinite(year) || !isFinite(month) || !isFinite(day)) return null;
  if (month < 1 || month > 12 || day < 1 || day > 31) return null;
  var date = new Date(year, month - 1, day, 0, 0, 0, 0);
  // 反向校验：2 月 31 日会被 Date 静默滚到 3 月，这里必须拦住。
  if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) return null;
  return date;
}

/**
 * 日期窗口 -> unix 秒闭开区间 [startTime, endTime)。
 * 起点 = fromDayKey 当天本地 00:00:00；终点 = toDayKey 的次日本地 00:00:00（含 toDayKey 全天）。
 * 只给一端时另一端按「当天全天」补齐；起止颠倒时自动交换（用户手输不至于白查）。
 * 两端都没给 -> {ok:true, startTime:null, endTime:null}（不限日期）。
 */
function archiveReplay_dayKeyToUnixRange(fromDayKey, toDayKey) {
  var hasFrom = fromDayKey !== undefined && fromDayKey !== null && fromDayKey !== "";
  var hasTo = toDayKey !== undefined && toDayKey !== null && toDayKey !== "";
  if (!hasFrom && !hasTo) return { ok: true, startTime: null, endTime: null };

  var fromDate = hasFrom ? archiveReplay_parseDayKey(fromDayKey) : null;
  if (hasFrom && !fromDate) return { ok: false, reason: "bad-date" };
  var toDate = hasTo ? archiveReplay_parseDayKey(toDayKey) : null;
  if (hasTo && !toDate) return { ok: false, reason: "bad-date" };

  if (!fromDate) fromDate = new Date(toDate.getTime());
  if (!toDate) toDate = new Date(fromDate.getTime());
  if (fromDate.getTime() > toDate.getTime()) {
    var swapDate = fromDate;
    fromDate = toDate;
    toDate = swapDate;
  }
  // 用「年月日 +1」而不是毫秒加法：跨月、跨年、夏令时都由 Date 自己算对。
  var endDate = new Date(toDate.getFullYear(), toDate.getMonth(), toDate.getDate() + 1, 0, 0, 0, 0);
  return {
    ok: true,
    startTime: Math.floor(fromDate.getTime() / 1000),
    endTime: Math.floor(endDate.getTime() / 1000)
  };
}

/* ---------- 请求层：串行 + 间隔 + 超时 + 重试 + 次数硬上限 ---------- */

/** 逻辑请求数上限折算：maxPages 页 + 固定两段，每个逻辑请求允许重试 1 次。 */
function archiveReplay_createBudget(maxPages) {
  var logicalLimit = Math.floor(maxPages) + ARCHIVE_REPLAY_FIXED_REQUESTS;
  return { left: logicalLimit * (1 + ARCHIVE_REPLAY_MAX_RETRY) };
}

/** 与上一次请求落地时刻至少间隔 300 ms。 */
function archiveReplay_waitForRequestGap() {
  var elapsed = Date.now() - archiveReplayLastRequestAt;
  var waitMs = ARCHIVE_REPLAY_REQUEST_GAP_MS - elapsed;
  if (waitMs <= 0) return Promise.resolve();
  return archiveReplay_delay(waitMs);
}

/**
 * GET 一个 JSON 接口。永不 reject：
 *   {ok:true, json} | {ok:false, reason, status?}
 * status 只在 reason === "http" 时有值，便于上层把状态码写进 reason。
 */
function archiveReplay_requestJson(url, budget) {
  var attemptIndex = 0;

  function attemptOnce() {
    if (budget && budget.left <= 0) return Promise.resolve({ ok: false, reason: "budget" });
    if (budget) budget.left--;
    if (typeof GM_xmlhttpRequest !== "function") {
      return Promise.resolve({ ok: false, reason: "unsupported" });
    }
    return archiveReplay_waitForRequestGap().then(function () {
      return new Promise(function (resolve) {
        var settled = false;
        var finish = function (payload) {
          if (settled) return;
          settled = true;
          // 间隔从「落地时刻」算起，保证 300 ms 是真空档而不是启动间隔。
          archiveReplayLastRequestAt = Date.now();
          resolve(payload);
        };
        try {
          archiveReplayLastRequestAt = Date.now();
          GM_xmlhttpRequest({
            method: "GET",
            url: url,
            timeout: ARCHIVE_REPLAY_REQUEST_TIMEOUT_MS,
            onload: function (response) {
              if (!response || response.status !== 200) {
                finish({
                  ok: false,
                  reason: "http",
                  status: response && response.status !== undefined ? response.status : 0
                });
                return;
              }
              var parsed = null;
              try {
                parsed = JSON.parse(String(response.responseText || ""));
              } catch (error) {
                parsed = null;
              }
              if (!parsed || typeof parsed !== "object") {
                finish({ ok: false, reason: "parse" });
                return;
              }
              finish({ ok: true, json: parsed });
            },
            onerror: function () { finish({ ok: false, reason: "network" }); },
            ontimeout: function () { finish({ ok: false, reason: "timeout" }); }
          });
        } catch (error) {
          finish({ ok: false, reason: "network" });
        }
      });
    }).then(function (result) {
      if (result.ok) return result;
      // 环境不支持 / 预算用尽：重试也没意义，且绝不能变相突破请求上限。
      if (result.reason === "unsupported" || result.reason === "budget") return result;
      if (attemptIndex >= ARCHIVE_REPLAY_MAX_RETRY) return result;
      attemptIndex++;
      var backoffMs = ARCHIVE_REPLAY_RETRY_BACKOFF_MS * Math.pow(2, attemptIndex - 1);
      return archiveReplay_delay(backoffMs).then(attemptOnce);
    });
  }

  return attemptOnce();
}

/* ---------- 三段接口的解析（全部判空，形状不对返回 null） ---------- */

/** (1) betard -> room.up_id */
function archiveReplay_extractUpId(json) {
  if (!json || typeof json !== "object") return "";
  var room = json.room;
  if (!room || typeof room !== "object") return "";
  return archiveReplay_trimText(room.up_id);
}

/** (2) 场次清单 -> hash_id 数组（保持接口顺序：新场次在前）；形状不对返回 null。 */
function archiveReplay_extractVideoIds(json) {
  var data = json && json.data;
  var showList = data && data.list;
  if (!Array.isArray(showList)) return null;
  var videoIds = [];
  for (var index = 0; index < showList.length; index++) {
    var show = showList[index];
    if (!show || typeof show !== "object") continue;
    var videos = show.video_list;
    if (Array.isArray(videos)) {
      for (var videoIndex = 0; videoIndex < videos.length; videoIndex++) {
        var video = videos[videoIndex];
        if (video && typeof video === "object" && video.hash_id) videoIds.push(String(video.hash_id));
      }
      continue;
    }
    // 兜底：极少数场次把 hash_id 直接挂在场上，别整场丢掉。
    if (show.hash_id) videoIds.push(String(show.hash_id));
  }
  return videoIds;
}

/** 游标归一化："0" / "" / null / undefined 一律视作「没有下一页」。 */
function archiveReplay_normalizeCursor(value) {
  if (value === undefined || value === null) return "";
  var text = archiveReplay_trimText(value);
  if (!text || text === "0" || text === "null" || text === "undefined") return "";
  return text;
}

/** (3) 弹幕页 -> {items, pre}；形状不对返回 null。 */
function archiveReplay_extractBarragePage(json) {
  var data = json && json.data;
  if (!data || typeof data !== "object") return null;
  if (!Array.isArray(data.list)) return null;
  return {
    items: data.list,
    pre: archiveReplay_normalizeCursor(data.pre)
  };
}

function archiveReplay_buildDedupKey(raw, record) {
  if (raw.sid !== undefined && raw.sid !== null && raw.sid !== "") return "s:" + String(raw.sid);
  if (raw.mid !== undefined && raw.mid !== null && raw.mid !== "") return "m:" + String(raw.mid);
  return "t:" + record.uid + ":" + record.ts + ":" + record.txt;
}

/** 一条回放弹幕 -> 内部记录 {uid,nn,txt,ts,rid,dedupKey}；关键字段缺失返回 null。 */
function archiveReplay_normalizeItem(raw, rid) {
  if (!raw || typeof raw !== "object") return null;
  var uidValue = raw.uid;
  if (uidValue === undefined || uidValue === null || uidValue === "") return null;
  var sentSeconds = Number(raw.sts);
  if (!isFinite(sentSeconds) || sentSeconds <= 0) return null;
  var record = {
    uid: String(uidValue),
    nn: raw.nn === undefined || raw.nn === null ? "" : String(raw.nn),
    txt: raw.ctt === undefined || raw.ctt === null ? "" : String(raw.ctt),
    ts: Math.floor(sentSeconds * 1000),
    rid: String(rid)
  };
  record.dedupKey = archiveReplay_buildDedupKey(raw, record);
  return record;
}

/** 内部记录 -> 对外形状（契约只认这五个字段，不把内部去重键漏出去）。 */
function archiveReplay_toPublicItem(record) {
  return {
    uid: record.uid,
    nn: record.nn,
    txt: record.txt,
    ts: record.ts,
    rid: record.rid
  };
}

/* ---------- 主链路 ---------- */

/** (1) rid -> up_id；命中 30 分钟内存缓存则一次请求都不发。 */
function archiveReplay_getUpId(rid, budget) {
  var ridKey = String(rid);
  var cached = archiveReplayUpIdCache[ridKey];
  if (cached && cached.upId && (Date.now() - cached.fetchedAt) < ARCHIVE_REPLAY_UP_ID_TTL_MS) {
    return Promise.resolve({ ok: true, upId: cached.upId, cached: true });
  }
  return archiveReplay_requestJson(ARCHIVE_REPLAY_BETARD_URL + encodeURIComponent(ridKey), budget)
    .then(function (result) {
      if (!result.ok) {
        return { ok: false, reason: "betard-" + result.reason, status: result.status };
      }
      var upId = archiveReplay_extractUpId(result.json);
      if (!upId) return { ok: false, reason: "no-up-id" };
      archiveReplayUpIdCache[ridKey] = { upId: upId, fetchedAt: Date.now() };
      return { ok: true, upId: upId, cached: false };
    });
}

function archiveReplay_buildShowListUrl(upId, range) {
  var url = ARCHIVE_REPLAY_SHOW_LIST_URL
    + "?page=1&limit=" + ARCHIVE_REPLAY_SHOW_PAGE_LIMIT
    + "&up_id=" + encodeURIComponent(upId);
  if (range && range.startTime !== null && range.startTime !== undefined) {
    url += "&start_time=" + range.startTime;
  }
  if (range && range.endTime !== null && range.endTime !== undefined) {
    url += "&end_time=" + range.endTime;
  }
  return url;
}

/**
 * 逐场翻弹幕页，页数累计进 state.pageCount，直到 maxPages / 条数用尽 / 出错。
 * 翻页只用 data.pre（见文件头实测结论），next 一律不碰。
 */
function archiveReplay_collectVideoPages(videoId, state) {
  var offset = "0";

  function step() {
    if (state.error) return Promise.resolve();
    if (state.pageCount >= state.maxPages) {
      state.truncated = true;
      return Promise.resolve();
    }
    var url = ARCHIVE_REPLAY_BARRAGE_URL
      + "?vid=" + encodeURIComponent(videoId)
      + "&offset=" + encodeURIComponent(offset);
    return archiveReplay_requestJson(url, state.budget).then(function (result) {
      if (!result.ok) {
        state.error = "barrage-" + result.reason;
        return;
      }
      var page = archiveReplay_extractBarragePage(result.json);
      if (!page) {
        state.error = "barrage-shape";
        return;
      }
      state.pageCount++;
      for (var index = 0; index < page.items.length; index++) {
        var record = archiveReplay_normalizeItem(page.items[index], state.targetRid);
        if (!record) continue;
        if (record.uid !== state.targetUid) continue;
        if (state.seenKeys[record.dedupKey]) continue;
        state.seenKeys[record.dedupKey] = true;
        state.collected.push(record);
      }
      archiveReplay_emitProgress({ stage: "barrage", page: state.pageCount, got: page.items.length });

      // 到底判定：空页 / 没有 pre 游标 / 不足一页 / 游标原地打转。
      if (!page.items.length) return;
      if (!page.pre || page.pre === offset) return;
      if (page.items.length < ARCHIVE_REPLAY_BARRAGE_PAGE_SIZE) return;
      // 还有下一页，但预算已经用完 -> 如实标注截断，别装作抓全了。
      if (state.pageCount >= state.maxPages) {
        state.truncated = true;
        return;
      }
      offset = page.pre;
      return step();
    });
  }

  return step();
}

/** 按接口顺序（新场次在前）逐场拉；预算用尽时优先保住最近的场次。 */
function archiveReplay_walkVideoList(videoIds, state) {
  var index = 0;

  function step() {
    if (state.error) return Promise.resolve();
    if (index >= videoIds.length) return Promise.resolve();
    if (state.pageCount >= state.maxPages) {
      state.truncated = true;
      return Promise.resolve();
    }
    var videoId = videoIds[index];
    index++;
    return archiveReplay_collectVideoPages(videoId, state).then(step);
  }

  return step();
}

function archiveReplay_normalizeMaxPages(value) {
  var pageCount = Number(value);
  if (!isFinite(pageCount) || pageCount <= 0) return ARCHIVE_REPLAY_DEFAULT_MAX_PAGES;
  pageCount = Math.floor(pageCount);
  if (pageCount > ARCHIVE_REPLAY_MAX_PAGES_CAP) return ARCHIVE_REPLAY_MAX_PAGES_CAP;
  return pageCount;
}

function archiveReplay_compareByTs(left, right) {
  return left.ts - right.ts;
}

function archiveReplay_buildFailure(reason, state) {
  return {
    ok: false,
    items: [],
    sampled: true,
    pages: state ? state.pageCount : 0,
    truncated: state ? !!state.truncated : false,
    reason: reason
  };
}

function archiveReplay_buildSuccess(state, giftPriceMode) {
  var sorted = state.collected.slice().sort(archiveReplay_compareByTs);
  var items = [];
  for (var index = 0; index < sorted.length; index++) items.push(archiveReplay_toPublicItem(sorted[index]));
  var result = {
    ok: true,
    items: items,
    sampled: true,
    pages: state.pageCount,
    truncated: !!state.truncated,
    // 回放只有弹幕没有礼物（实测 mtype/ft 全 0），礼物流水不能靠它兜底。
    hasGiftStream: false
  };
  if (giftPriceMode) result.giftPriceModeIgnored = true;
  return result;
}

function archiveReplay_queryUserHistory(uid, rid, options) {
  var targetUid = archiveReplay_trimText(uid);
  var targetRid = archiveReplay_trimText(rid);
  if (!targetUid || !targetRid) return Promise.resolve(archiveReplay_buildFailure("bad-arg", null));

  var maxPages = archiveReplay_normalizeMaxPages(options.maxPages);
  var range = archiveReplay_dayKeyToUnixRange(options.fromDayKey, options.toDayKey);
  if (!range.ok) return Promise.resolve(archiveReplay_buildFailure(range.reason, null));

  var state = {
    targetUid: targetUid,
    targetRid: targetRid,
    maxPages: maxPages,
    pageCount: 0,
    truncated: false,
    collected: [],
    seenKeys: Object.create(null),
    budget: archiveReplay_createBudget(maxPages),
    error: null
  };

  return archiveReplay_getUpId(targetRid, state.budget)
    .then(function (upIdResult) {
      if (!upIdResult.ok) return { ok: false, reason: upIdResult.reason };
      archiveReplay_emitProgress({ stage: "upid", page: 1, got: upIdResult.cached ? 0 : 1 });
      return archiveReplay_requestJson(archiveReplay_buildShowListUrl(upIdResult.upId, range), state.budget)
        .then(function (showResult) {
          if (!showResult.ok) return { ok: false, reason: "shows-" + showResult.reason };
          var videoIds = archiveReplay_extractVideoIds(showResult.json);
          if (videoIds === null) return { ok: false, reason: "shows-shape" };
          archiveReplay_emitProgress({ stage: "shows", page: 1, got: videoIds.length });
          return { ok: true, videoIds: videoIds };
        });
    })
    .then(function (stepResult) {
      if (!stepResult || !stepResult.ok) {
        return archiveReplay_buildFailure((stepResult && stepResult.reason) || "exception", state);
      }
      return archiveReplay_walkVideoList(stepResult.videoIds, state).then(function () {
        if (state.error) return archiveReplay_buildFailure(state.error, state);
        return archiveReplay_buildSuccess(state, options.giftPriceMode === true);
      });
    })
    .catch(function () {
      // 链路任何意外都在这里收口，绝不把异常抛给调用方。
      return archiveReplay_buildFailure("exception", state);
    });
}

/* ---------- 对外入口 ---------- */

var ArchiveReplay = {
  /**
   * 按「用户 + 房间 + 日期窗口」反查历史弹幕。永不抛异常、永不 reject。
   * @param uid  目标用户 uid（数字或字符串）
   * @param rid  真实房间号（靓号请先用 exParseRealRid 换算）
   * @param opts {fromDayKey, toDayKey, maxPages, giftPriceMode}
   * @returns Promise<{ok, items, sampled:true, pages, truncated, reason?}>
   */
  queryUserHistory: function (uid, rid, opts) {
    var options = opts && typeof opts === "object" ? opts : {};
    var promise = null;
    try {
      promise = archiveReplay_queryUserHistory(uid, rid, options);
    } catch (error) {
      promise = null;
    }
    if (promise && typeof promise.then === "function") return promise;
    return Promise.resolve(archiveReplay_buildFailure("exception", null));
  },

  /** 日期窗口换算（供 UI 预览与测试直测；本地时区 00:00 换日）。 */
  dayKeyToUnixRange: archiveReplay_dayKeyToUnixRange,

  /** 清空 up_id 内存缓存（房间换主播 / 手动刷新时用）。 */
  clearCache: function () {
    archiveReplayUpIdCache = Object.create(null);
  },

  defaults: {
    maxPages: ARCHIVE_REPLAY_DEFAULT_MAX_PAGES,
    maxPagesCap: ARCHIVE_REPLAY_MAX_PAGES_CAP,
    pageSize: ARCHIVE_REPLAY_BARRAGE_PAGE_SIZE,
    requestGapMs: ARCHIVE_REPLAY_REQUEST_GAP_MS,
    upIdTtlMs: ARCHIVE_REPLAY_UP_ID_TTL_MS,
    daySeconds: ARCHIVE_REPLAY_DAY_SECONDS
  }
};
