/* ==================== 房间元数据 + 礼物价目（P0 本地档案的只读元数据层） ==================== */
/*
 * 三个数据源（全部斗鱼官方、全部匿名可用，实测见 .zcode/p0-data/B-页面与接口数据.md）：
 *   (1) GET https://www.douyu.com/betard/<rid>
 *         -> room.{show_status, show_time, room_name, nickname, owner_uid,
 *                  cate1_id/cate2_id/cate3_id, fans_bn, up_id}
 *         room.up_id 是后续「按房间 + 日期反查回放」的唯一匿名入口（≠ uid）。
 *   (2) GET https://www.douyu.com/swf_api/h5room/<rid>
 *         -> data.{fans, show_status, show_time, owner_uid, nickname}
 *         data.fans 就是关注数（实测 9263298 -> 5981318，与长连接
 *         memberinfores.fans_count=5981316 交叉校验一致）。
 *         data.online 实测恒为 0，**本文件绝不使用**。
 *   (3) GET https://gift.douyucdn.cn/api/gift/v5/web/list?rid=<rid>
 *         -> data.giftList[]，每项 { id, name, priceInfo:{ price, priceType:"YUCHI" } }
 *         priceInfo.price 的单位是 0.01 鱼翅（实测：火箭 50000=500、办卡 600=6、
 *         弱鸡 20=0.2、超级火箭 200000=2000）。本文件原样保存 priceCents，
 *         **不做任何 /100 换算**，换算只在展示层做。
 *
 * 设计约束（与 DanmakuArchive_Replay.js 保持一致）：
 *   · 纯 ES5：函数声明 + var + Promise 链；不用块级声明、箭头函数、模板字符串。
 *   · 永不抛异常、永不 reject：失败一律 resolve 成 { ok:false, reason }。
 *   · 跨域走 GM_xmlhttpRequest（@connect 已含 douyu.com / douyucdn.cn，不新增域名）；
 *     GM 不存在（Node 单测 / 非油猴环境）时退化为 fetch。
 *   · 单请求超时 10 秒；失败重试 1 次、退避 800 ms；同 rid 并发请求合并（in-flight 去重）。
 *   · room() 结果进 30 分钟内存缓存；礼物价目按 rid 记 7 天。
 *   · 价目表持久化走 ArchiveDB.getMeta("gifts:v1") / setMeta；
 *     ArchiveDB 不存在、抛异常、或是异步实现时，退化为纯内存表，绝不报错。
 *
 * 对外形状：
 *   room(rid)            -> { ok, room:{rid, requestedRid, roomName, showTime, showStatus,
 *                                       cate:{cate1,cate2,cate3}, fans, fansBn, upId,
 *                                       nickname, ownerUid},
 *                             fetchedAt, partial?, warnings? } | { ok:false, reason }
 *   primeGifts(rid)      -> { ok, count } | { ok:false, reason }
 *   giftPrice(gfid)      -> { priceCents, name } | null        （同步，绝不抛）
 *   refreshIfStale(ms)   -> Promise<{ ok, refreshed[], dropped[], failed[] }>
 *   clearCache()         -> 清空内存缓存（ArchiveDB 里的价目表保留）
 *
 * reason 取值：
 *   bad-arg / unsupported / exception
 *   betard-<http|network|timeout|parse|shape>
 *   gifts-<http|network|timeout|parse|shape>
 *   （h5room 失败不算整体失败，只降级成 fans:null + partial:true + warnings:["h5room-…"]）
 */

var ARCHIVE_META_BETARD_URL = "https://www.douyu.com/betard/";
var ARCHIVE_META_H5ROOM_URL = "https://www.douyu.com/swf_api/h5room/";
var ARCHIVE_META_GIFT_LIST_URL = "https://gift.douyucdn.cn/api/gift/v5/web/list";
var ARCHIVE_META_GIFT_TABLE_KEY = "gifts:v1";
var ARCHIVE_META_GIFT_UPDATED_KEY = "_updatedAt";

var ARCHIVE_META_ROOM_TTL_MS = 30 * 60 * 1000;        // 房间元数据内存缓存 30 分钟
var ARCHIVE_META_GIFT_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 价目按 rid 记 7 天
var ARCHIVE_META_REQUEST_TIMEOUT_MS = 10000;          // 单请求超时 10 秒
var ARCHIVE_META_RETRY_BACKOFF_MS = 800;              // 重试退避 800 ms
var ARCHIVE_META_MAX_RETRY = 1;                       // 每个逻辑请求最多重试 1 次

// 房间缓存：rid -> { result, fetchedAt }
var archiveMetaRoomCache = Object.create(null);
// 同 rid 并发合并：rid -> Promise
var archiveMetaRoomInFlight = Object.create(null);
// 价目内存表：gfid -> { name, priceCents, priceType }
var archiveMetaGiftTable = Object.create(null);
// 价目拉取时间戳：rid -> ms
var archiveMetaGiftFetchedAt = Object.create(null);
// 价目拉取并发合并：rid -> Promise
var archiveMetaGiftInFlight = Object.create(null);
// 价目表是否已尝试从 ArchiveDB 装载（失败也只试一次，避免反复读存储）
var archiveMetaGiftTableLoaded = false;

/* ---------- 通用小工具（全部判空，绝不抛） ---------- */

function archiveMeta_trimText(value) {
  if (value === undefined || value === null) return "";
  return String(value).replace(/^\s+|\s+$/g, "");
}

/** 转有限数字；空值 / 非数字 / Infinity 一律 null（不要 0，0 会冒充"已知为零"）。 */
function archiveMeta_toFiniteNumber(value) {
  if (value === undefined || value === null || value === "") return null;
  var number = Number(value);
  if (!isFinite(number)) return null;
  return number;
}

function archiveMeta_delay(milliseconds) {
  return new Promise(function (resolve) {
    setTimeout(resolve, milliseconds > 0 ? milliseconds : 0);
  });
}

/** 房间号归一化：只留数字（betard 路径段必须是纯数字）；非法返回 ""。 */
function archiveMeta_normalizeRid(value) {
  var text = archiveMeta_trimText(value);
  if (!text) return "";
  var digits = text.replace(/[^0-9]/g, "");
  if (!digits || digits.length > 12) return "";
  return digits;
}

/** 当前页面路径上的展示短号（靓号）；拿不到返回 ""。只用于判断"是否本房间"。 */
function archiveMeta_pageShortId() {
  var pathname = "";
  try {
    if (typeof window !== "undefined" && window && window.location) {
      pathname = String(window.location.pathname || "");
    }
  } catch (error) {
    pathname = "";
  }
  if (!pathname) {
    try {
      if (typeof location !== "undefined" && location) pathname = String(location.pathname || "");
    } catch (error) {
      pathname = "";
    }
  }
  var matched = /\/(\d{3,12})(?:\/|$)/.exec(pathname);
  return matched ? matched[1] : "";
}

/**
 * rid -> 真实 room_id。靓号房间（如 /15000）页面展示号不是真实 room_id，
 * 需要 exParseRealRid() 换算。但 exParseRealRid() 读的是「当前页面」，
 * 所以只有「传入 rid 恰好就是当前页面的展示号」时才采用换算结果 ——
 * 否则给别的房间补档案会被串成当前房间，这个坑必须自己挡。
 */
function archiveMeta_resolveRid(rid) {
  var requestedRid = archiveMeta_normalizeRid(rid);
  if (!requestedRid) return "";
  if (typeof exParseRealRid !== "function") return requestedRid;
  var realRid = "";
  try {
    realRid = archiveMeta_normalizeRid(exParseRealRid());
  } catch (error) {
    realRid = "";
  }
  if (!realRid) return requestedRid;
  var shortId = archiveMeta_pageShortId();
  if (shortId && shortId === requestedRid) return realRid;
  return requestedRid;
}

/* ---------- ArchiveDB 适配（不存在 / 抛异常 / 异步实现都退化成纯内存） ---------- */

function archiveMeta_db() {
  try {
    if (typeof ArchiveDB !== "undefined" && ArchiveDB) return ArchiveDB;
  } catch (error) {
    // 未声明的全局在 typeof 下不会抛，这里只兜真正取不到的极端情况。
  }
  try {
    if (typeof window !== "undefined" && window && window.ArchiveDB) return window.ArchiveDB;
  } catch (error) {
    return null;
  }
  return null;
}

/** 读持久化价目表；读不到 / 形状不对 / 是异步实现（thenable）一律 null。 */
function archiveMeta_readGiftTableFromDb() {
  var database = archiveMeta_db();
  if (!database || typeof database.getMeta !== "function") return null;
  var stored = null;
  try {
    stored = database.getMeta(ARCHIVE_META_GIFT_TABLE_KEY);
  } catch (error) {
    return null;
  }
  if (!stored || typeof stored !== "object") return null;
  if (typeof stored.then === "function") return null; // 异步实现：本层不阻塞，按无持久化处理
  return stored;
}

/** 价目表快照（含 _updatedAt），供 setMeta 落盘。 */
function archiveMeta_snapshotGiftTable(updatedAt) {
  var snapshot = Object.create(null);
  var key = "";
  for (key in archiveMetaGiftTable) {
    if (!Object.prototype.hasOwnProperty.call(archiveMetaGiftTable, key)) continue;
    var entry = archiveMetaGiftTable[key];
    if (!entry || typeof entry !== "object") continue;
    snapshot[key] = {
      name: entry.name,
      priceCents: entry.priceCents,
      priceType: entry.priceType
    };
  }
  snapshot[ARCHIVE_META_GIFT_UPDATED_KEY] = updatedAt;
  return snapshot;
}

function archiveMeta_writeGiftTableToDb(updatedAt) {
  var database = archiveMeta_db();
  if (!database || typeof database.setMeta !== "function") return false;
  try {
    database.setMeta(ARCHIVE_META_GIFT_TABLE_KEY, archiveMeta_snapshotGiftTable(updatedAt));
    return true;
  } catch (error) {
    return false;
  }
}

/** 首次用到价目时把持久化表并进内存（内存已有的条目优先，不覆盖刚拉的新价）。 */
function archiveMeta_ensureGiftTableLoaded() {
  if (archiveMetaGiftTableLoaded) return;
  archiveMetaGiftTableLoaded = true;
  var stored = archiveMeta_readGiftTableFromDb();
  if (!stored) return;
  var key = "";
  for (key in stored) {
    if (!Object.prototype.hasOwnProperty.call(stored, key)) continue;
    if (key === ARCHIVE_META_GIFT_UPDATED_KEY) continue;
    if (archiveMetaGiftTable[key]) continue;
    var entry = stored[key];
    if (!entry || typeof entry !== "object") continue;
    var priceCents = archiveMeta_toFiniteNumber(entry.priceCents);
    if (priceCents === null) continue;
    archiveMetaGiftTable[key] = {
      name: entry.name === undefined || entry.name === null ? "" : String(entry.name),
      priceCents: priceCents,
      priceType: entry.priceType === undefined || entry.priceType === null ? "" : String(entry.priceType)
    };
  }
}

/* ---------- 请求层：GM_xmlhttpRequest 优先，fetch 退化；超时 10 秒 + 重试 1 次 ---------- */

function archiveMeta_requestViaGm(url) {
  return new Promise(function (resolve) {
    var settled = false;
    var finish = function (payload) {
      if (settled) return;
      settled = true;
      resolve(payload);
    };
    try {
      GM_xmlhttpRequest({
        method: "GET",
        url: url,
        timeout: ARCHIVE_META_REQUEST_TIMEOUT_MS,
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
        ontimeout: function () { finish({ ok: false, reason: "timeout" }); },
        onabort: function () { finish({ ok: false, reason: "network" }); }
      });
    } catch (error) {
      finish({ ok: false, reason: "network" });
    }
  });
}

function archiveMeta_requestViaFetch(url) {
  if (typeof fetch !== "function") return Promise.resolve({ ok: false, reason: "unsupported" });
  return new Promise(function (resolve) {
    var settled = false;
    var timer = null;
    var controller = null;
    var finish = function (payload) {
      if (settled) return;
      settled = true;
      if (timer) {
        clearTimeout(timer);
        timer = null;
      }
      resolve(payload);
    };
    timer = setTimeout(function () {
      finish({ ok: false, reason: "timeout" });
      try {
        if (controller) controller.abort();
      } catch (error) {
        // abort 失败不影响结果语义。
      }
    }, ARCHIVE_META_REQUEST_TIMEOUT_MS);
    try {
      var init = { method: "GET", credentials: "include" };
      if (typeof AbortController === "function") {
        controller = new AbortController();
        init.signal = controller.signal;
      }
      fetch(url, init).then(function (response) {
        if (!response || response.status !== 200) {
          finish({
            ok: false,
            reason: "http",
            status: response && response.status !== undefined ? response.status : 0
          });
          return null;
        }
        return response.text();
      }).then(function (text) {
        if (text === null || text === undefined) return; // 已在上一步 finish
        var parsed = null;
        try {
          parsed = JSON.parse(String(text));
        } catch (error) {
          parsed = null;
        }
        if (!parsed || typeof parsed !== "object") {
          finish({ ok: false, reason: "parse" });
          return;
        }
        finish({ ok: true, json: parsed });
      })["catch"](function () {
        finish({ ok: false, reason: "network" });
      });
    } catch (error) {
      finish({ ok: false, reason: "network" });
    }
  });
}

/** GET 一个 JSON 接口。永不 reject：{ ok:true, json } | { ok:false, reason, status? }。 */
function archiveMeta_requestJson(url) {
  var attemptIndex = 0;

  function attemptOnce() {
    var pending = null;
    if (typeof GM_xmlhttpRequest === "function") {
      pending = archiveMeta_requestViaGm(url);
    } else {
      pending = archiveMeta_requestViaFetch(url);
    }
    return pending.then(function (result) {
      if (result && result.ok) return result;
      // 环境不支持（既没 GM 也没 fetch）：重试没有意义。
      if (!result || result.reason === "unsupported") {
        return result || { ok: false, reason: "unsupported" };
      }
      if (attemptIndex >= ARCHIVE_META_MAX_RETRY) return result;
      attemptIndex++;
      return archiveMeta_delay(ARCHIVE_META_RETRY_BACKOFF_MS).then(attemptOnce);
    });
  }

  try {
    return attemptOnce();
  } catch (error) {
    return Promise.resolve({ ok: false, reason: "exception" });
  }
}

/* ---------- 三段接口的解析（全部判空，形状不对返回 null） ---------- */

/**
 * betard -> { roomName, showTime, showStatus, cate, fansBn, upId, nickname, ownerUid }
 * 只认 betard 独有的字段：room_name / show_time / fans_bn / up_id / cate*_id。
 */
function archiveMeta_parseBetard(json) {
  if (!json || typeof json !== "object") return null;
  var room = json.room;
  if (!room || typeof room !== "object") return null;

  var cate = {
    cate1: archiveMeta_trimText(room.cate1_id),
    cate2: archiveMeta_trimText(room.cate2_id),
    cate3: archiveMeta_trimText(room.cate3_id)
  };

  return {
    roomName: archiveMeta_trimText(room.room_name),
    showTime: archiveMeta_toFiniteNumber(room.show_time),
    showStatus: archiveMeta_toFiniteNumber(room.show_status),
    cate: cate,
    fansBn: archiveMeta_parseFansBadge(room.fans_bn),
    upId: archiveMeta_trimText(room.up_id),
    nickname: archiveMeta_trimText(room.nickname),
    ownerUid: archiveMeta_trimText(room.owner_uid)
  };
}

/**
 * room.fans_bn 实测是 JSON 字符串（"{\"bn\":\"若若呐\",\"flag\":1}"）。
 * 解析成 { bn, flag }；解析不了就原样返回字符串（别把粉丝牌名丢掉）。
 */
function archiveMeta_parseFansBadge(rawValue) {
  if (rawValue === undefined || rawValue === null || rawValue === "") return "";
  if (typeof rawValue === "object") return rawValue;
  var text = archiveMeta_trimText(rawValue);
  if (!text) return "";
  var parsed = null;
  try {
    parsed = JSON.parse(text);
  } catch (error) {
    parsed = null;
  }
  if (!parsed || typeof parsed !== "object") return text;
  return {
    bn: parsed.bn === undefined || parsed.bn === null ? "" : String(parsed.bn),
    flag: archiveMeta_toFiniteNumber(parsed.flag)
  };
}

/**
 * h5room -> { fans, showStatus, showTime, nickname, ownerUid, cate2 }
 * 只认 h5room 独有的 fans；data.online 恒为 0，绝不读取。
 */
function archiveMeta_parseH5Room(json) {
  if (!json || typeof json !== "object") return null;
  var data = json.data;
  if (!data || typeof data !== "object") return null;
  return {
    fans: archiveMeta_toFiniteNumber(data.fans),
    showStatus: archiveMeta_toFiniteNumber(data.show_status),
    showTime: archiveMeta_toFiniteNumber(data.show_time),
    nickname: archiveMeta_trimText(data.nickname),
    ownerUid: archiveMeta_trimText(data.owner_uid),
    cate2: archiveMeta_trimText(data.cate_id)
  };
}

/** 礼物价目 -> { gfid: {name, priceCents, priceType} }；形状不对返回 null。 */
function archiveMeta_parseGiftList(json) {
  if (!json || typeof json !== "object") return null;
  var data = json.data;
  if (!data || typeof data !== "object") return null;
  var giftList = data.giftList;
  if (!Array.isArray(giftList)) return null;
  var table = Object.create(null);
  var count = 0;
  for (var index = 0; index < giftList.length; index++) {
    var gift = giftList[index];
    if (!gift || typeof gift !== "object") continue;
    var giftId = archiveMeta_trimText(gift.id);
    if (!giftId) continue;
    var priceInfo = gift.priceInfo && typeof gift.priceInfo === "object" ? gift.priceInfo : {};
    // priceCents 就是接口原值，不做 /100：0.01 鱼翅为单位的整数。
    var priceCents = archiveMeta_toFiniteNumber(priceInfo.price);
    if (priceCents === null) continue;
    table[giftId] = {
      name: archiveMeta_trimText(gift.name),
      priceCents: priceCents,
      priceType: archiveMeta_trimText(priceInfo.priceType)
    };
    count++;
  }
  if (!count) return null;
  return table;
}

/* ---------- room()：betard + h5room 合并，30 分钟缓存，并发合并 ---------- */

function archiveMeta_buildRoomFailure(reason) {
  return { ok: false, reason: reason, room: null, fetchedAt: 0 };
}

/**
 * 合并两份元数据。取值优先级写死在这里，改动等于改契约：
 *   roomName / showTime / showStatus / cate / fansBn / upId  <- betard
 *   fans                                                     <- h5room（betard 没有）
 *   任一为主源缺失时用另一源兜底，仍然缺失就 null/""（绝不填 0 冒充已知）。
 */
function archiveMeta_buildRoom(requestedRid, realRid, betardInfo, h5Info, warnings) {
  var cate = { cate1: "", cate2: "", cate3: "" };
  if (betardInfo && betardInfo.cate) {
    cate.cate1 = betardInfo.cate.cate1 || "";
    cate.cate2 = betardInfo.cate.cate2 || "";
    cate.cate3 = betardInfo.cate.cate3 || "";
  }
  if (!cate.cate2 && h5Info && h5Info.cate2) cate.cate2 = h5Info.cate2;

  var roomName = "";
  if (betardInfo && betardInfo.roomName) roomName = betardInfo.roomName;

  var nickname = "";
  if (betardInfo && betardInfo.nickname) nickname = betardInfo.nickname;
  else if (h5Info && h5Info.nickname) nickname = h5Info.nickname;

  var ownerUid = "";
  if (betardInfo && betardInfo.ownerUid) ownerUid = betardInfo.ownerUid;
  else if (h5Info && h5Info.ownerUid) ownerUid = h5Info.ownerUid;

  var showTime = betardInfo ? betardInfo.showTime : null;
  if (showTime === null && h5Info && h5Info.showTime !== null) showTime = h5Info.showTime;

  var showStatus = betardInfo ? betardInfo.showStatus : null;
  if (showStatus === null && h5Info && h5Info.showStatus !== null) showStatus = h5Info.showStatus;

  var result = {
    ok: true,
    room: {
      rid: realRid,
      requestedRid: requestedRid,
      roomName: roomName,
      showTime: showTime,
      showStatus: showStatus,
      cate: cate,
      // fans 只认 h5room（betard 不提供关注数）；拿不到就是 null，不是 0。
      fans: h5Info ? h5Info.fans : null,
      fansBn: betardInfo ? betardInfo.fansBn : "",
      upId: betardInfo ? betardInfo.upId : "",
      nickname: nickname,
      ownerUid: ownerUid
    },
    fetchedAt: Date.now()
  };
  if (warnings && warnings.length) {
    result.partial = true;
    result.warnings = warnings;
  }
  return result;
}

/** 真正发请求并合并。betard 失败 = 整体失败；h5room 失败 = 降级（fans:null）。 */
function archiveMeta_loadRoom(requestedRid, realRid) {
  var warnings = [];
  return Promise.all([
    archiveMeta_requestJson(ARCHIVE_META_BETARD_URL + realRid),
    archiveMeta_requestJson(ARCHIVE_META_H5ROOM_URL + realRid)
  ]).then(function (responses) {
    var betardResponse = responses ? responses[0] : null;
    var h5Response = responses ? responses[1] : null;

    if (!betardResponse || !betardResponse.ok) {
      return archiveMeta_buildRoomFailure("betard-" + ((betardResponse && betardResponse.reason) || "exception"));
    }
    var betardInfo = archiveMeta_parseBetard(betardResponse.json);
    if (!betardInfo) return archiveMeta_buildRoomFailure("betard-shape");

    var h5Info = null;
    if (!h5Response || !h5Response.ok) {
      warnings.push("h5room-" + ((h5Response && h5Response.reason) || "exception"));
    } else {
      h5Info = archiveMeta_parseH5Room(h5Response.json);
      if (!h5Info) warnings.push("h5room-shape");
    }

    return archiveMeta_buildRoom(requestedRid, realRid, betardInfo, h5Info, warnings);
  });
}

function archiveMeta_getRoom(rid) {
  var requestedRid = archiveMeta_normalizeRid(rid);
  if (!requestedRid) return Promise.resolve(archiveMeta_buildRoomFailure("bad-arg"));
  var realRid = archiveMeta_resolveRid(requestedRid);
  if (!realRid) return Promise.resolve(archiveMeta_buildRoomFailure("bad-arg"));

  var cached = archiveMetaRoomCache[realRid];
  if (cached && (Date.now() - cached.fetchedAt) < ARCHIVE_META_ROOM_TTL_MS) {
    return Promise.resolve(cached.result);
  }

  var inFlight = archiveMetaRoomInFlight[realRid];
  if (inFlight) return inFlight;

  var pending = archiveMeta_loadRoom(requestedRid, realRid).then(function (result) {
    delete archiveMetaRoomInFlight[realRid];
    // 只缓存成功结果：失败要允许下一次重试真的重发。
    if (result && result.ok) {
      archiveMetaRoomCache[realRid] = { result: result, fetchedAt: result.fetchedAt };
    }
    return result;
  })["catch"](function () {
    delete archiveMetaRoomInFlight[realRid];
    return archiveMeta_buildRoomFailure("exception");
  });

  archiveMetaRoomInFlight[realRid] = pending;
  return pending;
}

/* ---------- primeGifts() / giftPrice()：价目表 ---------- */

function archiveMeta_countGiftTable() {
  var count = 0;
  var key = "";
  for (key in archiveMetaGiftTable) {
    if (!Object.prototype.hasOwnProperty.call(archiveMetaGiftTable, key)) continue;
    if (key === ARCHIVE_META_GIFT_UPDATED_KEY) continue;
    count++;
  }
  return count;
}

function archiveMeta_primeGifts(rid) {
  var requestedRid = archiveMeta_normalizeRid(rid);
  if (!requestedRid) return Promise.resolve({ ok: false, count: 0, reason: "bad-arg" });
  var realRid = archiveMeta_resolveRid(requestedRid);
  if (!realRid) return Promise.resolve({ ok: false, count: 0, reason: "bad-arg" });

  var fetchedAt = archiveMetaGiftFetchedAt[realRid];
  if (fetchedAt && (Date.now() - fetchedAt) < ARCHIVE_META_GIFT_TTL_MS) {
    return Promise.resolve({ ok: true, count: archiveMeta_countGiftTable() });
  }

  var inFlight = archiveMetaGiftInFlight[realRid];
  if (inFlight) return inFlight;

  var pending = archiveMeta_requestJson(ARCHIVE_META_GIFT_LIST_URL + "?rid=" + realRid)
    .then(function (response) {
      if (!response || !response.ok) {
        return { ok: false, count: 0, reason: "gifts-" + ((response && response.reason) || "exception") };
      }
      var table = archiveMeta_parseGiftList(response.json);
      if (!table) return { ok: false, count: 0, reason: "gifts-shape" };

      var key = "";
      for (key in table) {
        if (!Object.prototype.hasOwnProperty.call(table, key)) continue;
        archiveMetaGiftTable[key] = table[key];
      }
      var updatedAt = Date.now();
      archiveMetaGiftFetchedAt[realRid] = updatedAt;
      // 表必须带上 _updatedAt 才能判定"表是哪次写的"，落盘前统一补。
      archiveMetaGiftTable[ARCHIVE_META_GIFT_UPDATED_KEY] = updatedAt;
      archiveMeta_writeGiftTableToDb(updatedAt);
      return { ok: true, count: archiveMeta_countGiftTable() };
    })["catch"](function () {
      return { ok: false, count: 0, reason: "exception" };
    })["then"](function (result) {
      delete archiveMetaGiftInFlight[realRid];
      return result;
    });

  archiveMetaGiftInFlight[realRid] = pending;
  return pending;
}

/** gfid -> { priceCents, name } | null。同步；先内存，再 ArchiveDB 持久表。 */
function archiveMeta_getGiftPrice(gfid) {
  var key = archiveMeta_trimText(gfid);
  if (!key) return null;
  if (key === ARCHIVE_META_GIFT_UPDATED_KEY) return null;
  archiveMeta_ensureGiftTableLoaded();
  var entry = archiveMetaGiftTable[key];
  if (!entry || typeof entry !== "object") return null;
  var priceCents = archiveMeta_toFiniteNumber(entry.priceCents);
  // 价目缺失 / 非法一律 null —— 绝不返回 priceCents:0 冒充"免费礼物"。
  if (priceCents === null) return null;
  return {
    priceCents: priceCents,
    name: entry.name === undefined || entry.name === null ? "" : String(entry.name)
  };
}

/* ---------- refreshIfStale() / clearCache() ---------- */

/**
 * 把超过 maxAgeMs 的缓存当作过期并主动重取：
 *   · 房间缓存 -> 重新请求并刷新
 *   · 价目 rid 时间戳 -> 丢弃（下一次 primeGifts 会重拉）
 * maxAgeMs 非法时按 30 分钟（room TTL）处理。永不 reject。
 */
function archiveMeta_refreshIfStale(maxAgeMs) {
  var limit = archiveMeta_toFiniteNumber(maxAgeMs);
  if (limit === null || limit < 0) limit = ARCHIVE_META_ROOM_TTL_MS;

  var now = Date.now();
  var staleRids = [];
  var rid = "";
  for (rid in archiveMetaRoomCache) {
    if (!Object.prototype.hasOwnProperty.call(archiveMetaRoomCache, rid)) continue;
    var cached = archiveMetaRoomCache[rid];
    var age = now - (cached && cached.fetchedAt !== undefined ? cached.fetchedAt : 0);
    if (age >= limit) staleRids.push(rid);
  }

  var dropped = [];
  for (rid in archiveMetaGiftFetchedAt) {
    if (!Object.prototype.hasOwnProperty.call(archiveMetaGiftFetchedAt, rid)) continue;
    if ((now - archiveMetaGiftFetchedAt[rid]) >= limit) {
      dropped.push(rid);
      delete archiveMetaGiftFetchedAt[rid];
    }
  }

  if (!staleRids.length) {
    return Promise.resolve({ ok: true, refreshed: [], dropped: dropped, failed: [] });
  }

  // 先失效再重取：即便重取失败，也不会把更旧的结果当成新鲜数据继续发出去。
  var refreshed = [];
  var failed = [];
  var chain = Promise.resolve();
  for (var index = 0; index < staleRids.length; index++) {
    (function (targetRid) {
      chain = chain.then(function () {
        delete archiveMetaRoomCache[targetRid];
        return archiveMeta_getRoom(targetRid).then(function (result) {
          if (result && result.ok) refreshed.push(targetRid);
          else failed.push({ rid: targetRid, reason: (result && result.reason) || "exception" });
        });
      });
    })(staleRids[index]);
  }

  return chain.then(function () {
    return { ok: failed.length === 0, refreshed: refreshed, dropped: dropped, failed: failed };
  })["catch"](function () {
    return { ok: false, refreshed: refreshed, dropped: dropped, failed: failed };
  });
}

/* ---------- 对外入口 ---------- */

var ArchiveMeta = {
  /**
   * 房间元数据（betard + h5room 合并）。30 分钟内存缓存，同 rid 并发合并。
   * @param rid 房间号（靓号会经 exParseRealRid 换算，且只在"当前页就是它"时才换算）
   * @returns Promise<{ ok, room, fetchedAt, partial?, warnings? } | { ok:false, reason }>
   */
  room: function (rid) {
    var promise = null;
    try {
      promise = archiveMeta_getRoom(rid);
    } catch (error) {
      promise = null;
    }
    if (promise && typeof promise.then === "function") return promise;
    return Promise.resolve(archiveMeta_buildRoomFailure("exception"));
  },

  /**
   * 拉一次礼物价目表并写入内存 + ArchiveDB。按 rid 记 7 天，同 rid 并发合并。
   * @returns Promise<{ ok, count } | { ok:false, count:0, reason }>
   */
  primeGifts: function (rid) {
    var promise = null;
    try {
      promise = archiveMeta_primeGifts(rid);
    } catch (error) {
      promise = null;
    }
    if (promise && typeof promise.then === "function") return promise;
    return Promise.resolve({ ok: false, count: 0, reason: "exception" });
  },

  /**
   * 礼物单价查询（同步）。priceCents 是接口原值（0.01 鱼翅），不要在这里除 100。
   * @returns { priceCents, name } | null
   */
  giftPrice: function (gfid) {
    try {
      return archiveMeta_getGiftPrice(gfid);
    } catch (error) {
      return null;
    }
  },

  /** 过期缓存主动重取；返回 { ok, refreshed, dropped, failed }。 */
  refreshIfStale: function (maxAgeMs) {
    var promise = null;
    try {
      promise = archiveMeta_refreshIfStale(maxAgeMs);
    } catch (error) {
      promise = null;
    }
    if (promise && typeof promise.then === "function") return promise;
    return Promise.resolve({ ok: false, refreshed: [], dropped: [], failed: [] });
  },

  /**
   * 清空内存缓存（房间缓存 / 价目内存表 / 拉取时间戳 / in-flight）。
   * ArchiveDB 里已落盘的价目表保留：清完之后下一次 giftPrice() 会从存储重新装载。
   */
  clearCache: function () {
    try {
      archiveMetaRoomCache = Object.create(null);
      archiveMetaRoomInFlight = Object.create(null);
      archiveMetaGiftTable = Object.create(null);
      archiveMetaGiftFetchedAt = Object.create(null);
      archiveMetaGiftInFlight = Object.create(null);
      archiveMetaGiftTableLoaded = false;
    } catch (error) {
      // 清缓存失败不影响后续调用（最坏是继续用旧值）。
    }
  },

  defaults: {
    roomTtlMs: ARCHIVE_META_ROOM_TTL_MS,
    giftTtlMs: ARCHIVE_META_GIFT_TTL_MS,
    requestTimeoutMs: ARCHIVE_META_REQUEST_TIMEOUT_MS,
    retryBackoffMs: ARCHIVE_META_RETRY_BACKOFF_MS,
    maxRetry: ARCHIVE_META_MAX_RETRY,
    giftTableKey: ARCHIVE_META_GIFT_TABLE_KEY
  }
};
