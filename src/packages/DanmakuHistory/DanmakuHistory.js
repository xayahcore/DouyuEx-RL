/* ==================== 弹幕/礼物历史面板（用户卡片入口 + 页内弹窗） ==================== */
/*
 * 数据源（P0 改造，2026-10）：**本机档案**，不再依赖任何第三方数据站。
 *   ArchiveDB.queryUserDay(uid, "YYYY-MM-DD", { offset, limit })
 *     -> Promise<{ ok, list:[{kind, txt, gfn, gfcnt, rid, roomName, ts}], hasMore }>
 *     kind：chat / gift / enter；txt 弹幕正文；gfn 礼物名；gfcnt 礼物份数；ts 毫秒。
 *   ArchiveDB.stats() -> Promise<{ ok, rooms, oldestDay, newestDay, ... }>，用于标题栏「覆盖 N 房间 / M 天」。
 *
 * 三种状态如实显示（本地没数据时不假装有）：
 *   ① 本地有 N 条        —— queryUserDay 返回非空
 *   ② 本地未收录          —— 返回 0 条
 *   ③ 「查本房间回放」     —— 调 ArchiveReplay.queryUserHistory 兜底，结果必须标注「回放抽样口径」
 *                            （回放只有弹幕、没有礼物，且库端疑似抽样，见 .zcode/p0-data/B 报告）
 *
 * 旧实现里「需登录第三方数据站」那一整套（DANMAKU_HISTORY_API / GM_xmlhttpRequest / 登录跳转）
 * 已全部删除：本机档案是本地 IndexedDB，不需要登录、不需要跨域。
 */

const DANMAKU_HISTORY_PAGE_SIZE = 50;
const DANMAKU_HISTORY_CACHE_MAX = 60;
const DANMAKU_HISTORY_SCAN_DEBOUNCE = 200;
const DANMAKU_HISTORY_REPLAY_MAX_PAGES = 10;
const DANMAKU_HISTORY_REPLAY_NOTICE = "回放抽样口径";

let danmakuHistoryPanel = null;
let danmakuHistoryUid = "";
let danmakuHistoryNick = "";
let danmakuHistoryDate = null;
let danmakuHistoryOffset = 0;
let danmakuHistoryLoading = false;
let danmakuHistoryReqSeq = 0;
let danmakuHistoryScanTimer = null;
const danmakuHistoryCache = new Map();
// 房间名待补队列：档案里常常只存 rid，房间名先用「未知直播间」占位，稍后用 ArchiveMeta 补齐。
let danmakuHistoryPendingNames = [];

/* ---------- 日期：一律用本地时间 ---------- */
// 日期格式化统一走 common.js 的 getLocalDateStr（禁用 UTC 的 toISOString，
// 否则国内时区凌晨 8 点前会把"今天"算成前一天，导致按直播日查询整体错位）。
function DanmakuHistory_pad(v) {
  return v < 10 ? "0" + v : "" + v;
}

function DanmakuHistory_today() {
  let n = new Date();
  return new Date(n.getFullYear(), n.getMonth(), n.getDate());
}

function DanmakuHistory_shiftDate(dayOffset) {
  let d = danmakuHistoryDate || DanmakuHistory_today();
  return new Date(d.getFullYear(), d.getMonth(), d.getDate() + dayOffset);
}

function DanmakuHistory_formatTime(ts) {
  let n = Number(ts);
  if (!n || isNaN(n)) return "";
  let d = new Date(n * 1000);
  return DanmakuHistory_pad(d.getMonth() + 1) + "-" + DanmakuHistory_pad(d.getDate())
    + " " + DanmakuHistory_pad(d.getHours()) + ":" + DanmakuHistory_pad(d.getMinutes());
}

/* ---------- 缓存（内存，不落 localStorage） ---------- */
function DanmakuHistory_cacheSet(key, val) {
  if (danmakuHistoryCache.size >= DANMAKU_HISTORY_CACHE_MAX) {
    let oldest = danmakuHistoryCache.keys().next();
    if (!oldest.done) danmakuHistoryCache.delete(oldest.value);
  }
  danmakuHistoryCache.set(key, val);
}

/* ---------- 数据层：本机档案（ArchiveDB） ---------- */

/** 一条档案记录 -> 渲染记录。字段名照契约 {kind, txt, gfn, gfcnt, rid, roomName, ts}。 */
function DanmakuHistory_normalizeRecord(raw) {
  if (!raw || typeof raw !== "object") return null;
  let kind = raw.kind === "gift" ? "gift" : (raw.kind === "enter" ? "enter" : "chat");
  return {
    kind: kind,
    txt: raw.txt === undefined || raw.txt === null ? "" : String(raw.txt),
    gfn: raw.gfn === undefined || raw.gfn === null ? "" : String(raw.gfn),
    gfcnt: Number(raw.gfcnt) > 0 ? Number(raw.gfcnt) : 1,
    rid: raw.rid === undefined || raw.rid === null ? "" : String(raw.rid),
    roomName: raw.roomName === undefined || raw.roomName === null ? "" : String(raw.roomName),
    ts: Number(raw.ts) || 0
  };
}

/**
 * 读本机档案：uid + 直播日 + offset -> {ok, list, hasMore}。
 * 永不 reject、永不抛：ArchiveDB 缺失 / 抛异常 / 返回形状不对都落在 {ok:false} 上。
 */
function DanmakuHistory_queryLocal(uid, dateStr, offset) {
  let key = uid + "|" + dateStr + "|" + offset;
  let cached = danmakuHistoryCache.get(key);
  if (cached) return Promise.resolve(cached);

  if (typeof ArchiveDB === "undefined" || !ArchiveDB || typeof ArchiveDB.queryUserDay !== "function") {
    return Promise.resolve({ ok: false, reason: "unsupported", list: [], hasMore: false });
  }

  let pending = null;
  try {
    pending = ArchiveDB.queryUserDay(String(uid), String(dateStr), {
      offset: offset > 0 ? offset : 0,
      limit: DANMAKU_HISTORY_PAGE_SIZE
    });
  } catch (e) {
    return Promise.resolve({ ok: false, reason: "exception", list: [], hasMore: false });
  }

  return Promise.resolve(pending).then(function (result) {
    if (!result || result.ok === false) {
      return { ok: false, reason: (result && result.reason) || "exception", list: [], hasMore: false };
    }
    let rawList = Array.isArray(result.list) ? result.list : [];
    let list = [];
    for (let i = 0; i < rawList.length; i++) {
      let record = DanmakuHistory_normalizeRecord(rawList[i]);
      if (record) list.push(record);
    }
    let payload = {
      ok: true,
      list: list,
      // hasMore 以档案层为准（它才知道后面还有没有）；缺省按"本页满"推断。
      hasMore: result.hasMore === undefined ? list.length >= DANMAKU_HISTORY_PAGE_SIZE : !!result.hasMore
    };
    DanmakuHistory_cacheSet(key, payload);
    return payload;
  }, function () {
    return { ok: false, reason: "exception", list: [], hasMore: false };
  });
}

/** 标题栏来源行：本地档案 · 覆盖 N 房间 / M 天（stats 拿不到就只写"本地档案"）。 */
function DanmakuHistory_querySourceText() {
  if (typeof ArchiveDB === "undefined" || !ArchiveDB || typeof ArchiveDB.stats !== "function") {
    return Promise.resolve("本地档案");
  }
  let pending = null;
  try {
    pending = ArchiveDB.stats();
  } catch (e) {
    return Promise.resolve("本地档案");
  }
  return Promise.resolve(pending).then(function (stats) {
    if (!stats || stats.ok === false) return "本地档案";
    let rooms = Number(stats.rooms) > 0 ? Number(stats.rooms) : 0;
    let days = DanmakuHistory_countDays(stats.oldestDay, stats.newestDay);
    if (!rooms && !days) return "本地档案";
    return "本地档案 · 覆盖 " + rooms + " 房间 / " + days + " 天";
  }, function () {
    return "本地档案";
  });
}

function DanmakuHistory_parseDayKey(dayKey) {
  let matched = /^(\d{4})-(\d{1,2})-(\d{1,2})$/.exec(String(dayKey || ""));
  if (!matched) return null;
  let moment = new Date(Number(matched[1]), Number(matched[2]) - 1, Number(matched[3]), 0, 0, 0, 0);
  if (isNaN(moment.getTime())) return null;
  return moment;
}

/** "YYYY-MM-DD" 起止 -> 覆盖天数（含首尾）；任一非法返回 0。 */
function DanmakuHistory_countDays(oldestDay, newestDay) {
  let start = DanmakuHistory_parseDayKey(oldestDay);
  let end = DanmakuHistory_parseDayKey(newestDay);
  if (!start || !end) return 0;
  let span = Math.round((end.getTime() - start.getTime()) / 86400000);
  if (span < 0) return 0;
  return span + 1;
}

/* ---------- 用户卡片探测与按钮注入 ---------- */
/*
 * 斗鱼按用户等级渲染**多种**卡片组件，实测至少三种：
 *   NormalCard（普通）／ SupremeCard（至尊）／ GiftHallCard（礼物展馆）
 * 它们内部结构完全一致：<X>Card > <X>Card-content > <X>Card-action，
 * 按钮类名也随前缀变化（<X>Card-btn）。因此这里一律按后缀匹配，不写死任何一种前缀，
 * 否则每出现一种新卡片就会漏掉（早期版本只匹配 .NormalCard-action，至尊/礼物展馆卡片就没有入口）。
 */
const DANMAKU_HISTORY_ACTION_SELECTOR = '[class*="Card-action"]';
const DANMAKU_HISTORY_CARD_ROOT_RE = /^[A-Za-z]*Card$/;

let DanmakuHistory_outsideBound = false;

function DanmakuHistory_getCardRoot(action) {
  let el = action ? action.parentElement : null;
  while (el && el !== document.body) {
    let toks = String(el.className || "").split(/\s+/);
    for (let i = 0; i < toks.length; i++) {
      if (DANMAKU_HISTORY_CARD_ROOT_RE.test(toks[i])) return el;
    }
    el = el.parentElement;
  }
  return action ? action.parentElement : null;
}

function DanmakuHistory_getUidFromCard(card) {
  if (!card) return "";
  // 三种卡片变体都用同一个跳转端点带出 uid，所以按 href 取，不依赖具体类名
  let links = card.querySelectorAll('a[href*="jumpusercenter"]');
  let i, m;
  for (i = 0; i < links.length; i++) {
    m = String(links[i].getAttribute("href") || "").match(/[?&]id=(\d+)/);
    if (m) return m[1];
  }
  let any = card.querySelectorAll("a[href]");
  for (i = 0; i < any.length; i++) {
    m = String(any[i].getAttribute("href") || "").match(/[?&](?:id|uid)=(\d+)/);
    if (m) return m[1];
  }
  return "";
}

function DanmakuHistory_getNickFromCard(card) {
  if (!card) return "";
  let n = card.querySelector('[class*="Card-name"]');
  return n ? (n.textContent || "").trim() : "";
}

function DanmakuHistory_injectButton(action) {
  // 直接沿用同排原生按钮的类名：卡片前缀不同按钮类名也不同，
  // 克隆现有按钮的类名才能保证每种变体下我们的按钮样式都完全一致（我们零自定义 CSS）。
  let sample = action.querySelector("a, button");
  let btn = document.createElement("a");
  btn.className = (sample && sample.className ? String(sample.className) : "NormalCard-btn") + " dyex-danmaku-history";
  btn.textContent = "弹幕历史";
  btn.addEventListener("click", function (e) {
    e.preventDefault();
    e.stopPropagation();
    DanmakuHistory_openFromButton(btn);
  });
  action.appendChild(btn);
}

function DanmakuHistory_openFromButton(btn) {
  // 点击时现取所属卡片，不在注入时用闭包捕获：斗鱼会复用同一张卡片节点来展示不同用户
  // （实测同一节点被反复标记），闭包捕获有可能停在旧对象上。
  let action = btn.closest ? btn.closest(DANMAKU_HISTORY_ACTION_SELECTOR) : null;
  let card = action ? DanmakuHistory_getCardRoot(action) : null;
  if (!card && btn.parentElement) card = DanmakuHistory_getCardRoot(btn.parentElement);
  DanmakuHistory_open(card, btn);
}

function DanmakuHistory_scanAndInject() {
  let actions = document.querySelectorAll(DANMAKU_HISTORY_ACTION_SELECTOR);
  for (let i = 0; i < actions.length; i++) {
    let action = actions[i];
    if (action.querySelector(".dyex-danmaku-history")) continue;
    let card = DanmakuHistory_getCardRoot(action);
    if (!card || !DanmakuHistory_getUidFromCard(card)) continue;
    DanmakuHistory_injectButton(action);
  }
}

/* ---------- 弹窗 ---------- */
function DanmakuHistory_ensurePanel() {
  if (danmakuHistoryPanel && danmakuHistoryPanel.isConnected) return danmakuHistoryPanel;

  let p = document.createElement("div");
  p.className = "danmaku-history-panel miuix-modal";
  p.innerHTML = `
    <div class="miuix-modal__body">
      <div class="danmaku-history-panel__toolbar">
        <button type="button" class="danmaku-history-panel__date-btn" data-act="prev" title="前一天">‹</button>
        <span class="danmaku-history-panel__date"></span>
        <button type="button" class="danmaku-history-panel__date-btn" data-act="next" title="后一天">›</button>
        <span class="danmaku-history-panel__count"></span>
        <span class="danmaku-history-panel__source"></span>
      </div>
      <div class="danmaku-history-panel__list"></div>
      <div class="danmaku-history-panel__status">
        <span class="danmaku-history-panel__status-text"></span>
        <button type="button" class="ex-picker-btn danmaku-history-panel__more" data-act="more">加载更多</button>
        <button type="button" class="ex-picker-btn danmaku-history-panel__more danmaku-history-panel__replay" data-act="replay">查本房间回放</button>
      </div>
    </div>
  `;
  document.body.appendChild(p);
  if (typeof ensureMiuixPanelHeader === "function") ensureMiuixPanelHeader(p, "弹幕历史");
  DanmakuHistory_bindOutsideClose();

  danmakuHistoryPanel = p;

  p.querySelector('.danmaku-history-panel__date-btn[data-act="prev"]').addEventListener("click", function () {
    DanmakuHistory_gotoDate(DanmakuHistory_shiftDate(-1));
  });
  p.querySelector('.danmaku-history-panel__date-btn[data-act="next"]').addEventListener("click", function () {
    let next = DanmakuHistory_shiftDate(1);
    if (next.getTime() > DanmakuHistory_today().getTime()) return;
    DanmakuHistory_gotoDate(next);
  });
  p.querySelector('[data-act="more"]').addEventListener("click", function () {
    DanmakuHistory_loadPage(danmakuHistoryOffset + DANMAKU_HISTORY_PAGE_SIZE, false);
  });
  // 第三态兜底：本地没有时，用官方回放接口补一段（结果必须标注抽样口径）。
  p.querySelector('[data-act="replay"]').addEventListener("click", function () {
    DanmakuHistory_loadReplay();
  });

  return p;
}

function DanmakuHistory_syncToolbar() {
  if (!danmakuHistoryPanel) return;
  let today = DanmakuHistory_today();
  let target = danmakuHistoryDate || today;
  let isToday = target.getTime() === today.getTime();

  let dateEl = danmakuHistoryPanel.querySelector(".danmaku-history-panel__date");
  if (dateEl) dateEl.textContent = getLocalDateStr(target) + (isToday ? "（今天）" : "");

  let nextBtn = danmakuHistoryPanel.querySelector('.danmaku-history-panel__date-btn[data-act="next"]');
  if (nextBtn) {
    nextBtn.disabled = isToday;
    nextBtn.classList.toggle("is-disabled", isToday);
  }
}

function DanmakuHistory_clearList() {
  if (!danmakuHistoryPanel) return;
  let listEl = danmakuHistoryPanel.querySelector(".danmaku-history-panel__list");
  if (listEl) listEl.innerHTML = "";
  danmakuHistoryPendingNames = [];
  DanmakuHistory_updateCount();
}

function DanmakuHistory_updateCount() {
  if (!danmakuHistoryPanel) return;
  let listEl = danmakuHistoryPanel.querySelector(".danmaku-history-panel__list");
  let n = listEl ? listEl.querySelectorAll(".danmaku-history-panel__row").length : 0;
  let countEl = danmakuHistoryPanel.querySelector(".danmaku-history-panel__count");
  if (countEl) countEl.textContent = n > 0 ? "已加载 " + n + " 条" : "";
}

function DanmakuHistory_renderRow(item) {
  let isGift = !!item && item.kind === "gift";

  let row = document.createElement("div");
  row.className = "sign-option-item danmaku-history-panel__row";

  let badge = document.createElement("span");
  badge.className = "danmaku-history-panel__badge " + (isGift ? "is-gift" : "is-chat");
  if (isGift && item.img) {
    let img = document.createElement("img");
    img.className = "danmaku-history-panel__gift-img";
    img.src = item.img;
    img.alt = "礼物";
    img.loading = "lazy";
    badge.appendChild(img);
  } else {
    badge.textContent = isGift ? "礼" : "弹";
  }
  badge.title = isGift ? "礼物" : "弹幕";
  row.appendChild(badge);

  let textBox = document.createElement("div");
  textBox.className = "sign-option-text";

  let title = document.createElement("span");
  title.className = "sign-option-title";
  if (isGift) {
    let giftName = item.gfn || "";
    let count = item.gfcnt || 1;
    title.textContent = giftName ? ("赠送 " + giftName + " ×" + count) : String(item.txt || "礼物");
  } else {
    title.textContent = String(item.txt || "");
  }
  textBox.appendChild(title);

  let desc = document.createElement("span");
  desc.className = "sign-option-desc";
  desc.textContent = String(item.roomName || "未知直播间") + " · " + DanmakuHistory_formatTime(item.ts);
  textBox.appendChild(desc);

  // 档案里没存房间名：先按「未知直播间」渲染，稍后用 ArchiveMeta.room(rid) 补（30 分钟缓存）。
  if (!item.roomName && item.rid) {
    danmakuHistoryPendingNames.push({ el: desc, rid: String(item.rid), ts: item.ts });
  }

  row.appendChild(textBox);

  if (item.rid) {
    let go = document.createElement("button");
    go.type = "button";
    go.className = "ex-picker-btn danmaku-history-panel__room";
    go.textContent = "去房间";
    go.title = "在新标签页打开该直播间";
    go.addEventListener("click", function (e) {
      e.stopPropagation();
      openPage("https://www.douyu.com/" + item.rid, true);
    });
    row.appendChild(go);
  }

  return row;
}

function DanmakuHistory_appendRows(list) {
  if (!danmakuHistoryPanel) return;
  let listEl = danmakuHistoryPanel.querySelector(".danmaku-history-panel__list");
  if (!listEl) return;
  let wrap = listEl.querySelector(".sign-options-list");
  if (!wrap) {
    wrap = document.createElement("div");
    wrap.className = "sign-options-list";
    listEl.appendChild(wrap);
  }
  for (let i = 0; i < list.length; i++) {
    wrap.appendChild(DanmakuHistory_renderRow(list[i]));
  }
}

function DanmakuHistory_setStatus(text, kind, action, titleText) {
  if (!danmakuHistoryPanel) return;
  let box = danmakuHistoryPanel.querySelector(".danmaku-history-panel__status-text");
  if (!box) return;

  box.textContent = text || "";
  box.className = "danmaku-history-panel__status-text" + (kind ? " is-" + kind : "");
  box.onclick = null;
  box.title = titleText || "";

  if (action === "retry") {
    box.title = titleText || "点击重试";
    box.onclick = function () {
      DanmakuHistory_loadPage(danmakuHistoryOffset, danmakuHistoryOffset === 0);
    };
  }
}

function DanmakuHistory_setMoreVisible(visible) {
  if (!danmakuHistoryPanel) return;
  let btn = danmakuHistoryPanel.querySelector('[data-act="more"]');
  if (btn) btn.classList.toggle("is-visible", !!visible);
}

/** 「查本房间回放」按钮：只有 ArchiveReplay 可用、且知道当前房间号时才渲染。 */
function DanmakuHistory_setReplayVisible(visible) {
  if (!danmakuHistoryPanel) return;
  let btn = danmakuHistoryPanel.querySelector('[data-act="replay"]');
  if (btn) btn.classList.toggle("is-visible", !!visible);
}

function DanmakuHistory_renderError(reason) {
  let msg = "读取本机档案失败，请稍后重试";
  let action = "retry";
  if (reason === "unsupported") {
    msg = "本机档案不可用（当前环境不支持 IndexedDB）";
    action = "";
  } else if (reason === "bad-arg") {
    msg = "缺少用户或日期，无法查询本机档案";
    action = "";
  } else if (reason === "exception") {
    msg = "读取本机档案出错，请重试";
  }
  DanmakuHistory_setStatus(msg, "error", action);
  DanmakuHistory_setMoreVisible(false);
}

/* ---------- 加载流程 ---------- */
function DanmakuHistory_loadedRowCount() {
  if (!danmakuHistoryPanel) return 0;
  let listEl = danmakuHistoryPanel.querySelector(".danmaku-history-panel__list");
  if (!listEl) return 0;
  return listEl.querySelectorAll(".danmaku-history-panel__row").length;
}

function DanmakuHistory_loadPage(offset, reset) {
  if (!danmakuHistoryPanel || !danmakuHistoryUid || danmakuHistoryLoading) return;

  danmakuHistoryLoading = true;
  danmakuHistoryOffset = offset;
  let seq = ++danmakuHistoryReqSeq;

  DanmakuHistory_setStatus("读取本机档案…", "loading", "");
  DanmakuHistory_setMoreVisible(false);

  DanmakuHistory_queryLocal(danmakuHistoryUid, getLocalDateStr(danmakuHistoryDate), offset)
    .then(function (res) {
      // 快速切换日期/用户时丢弃过期响应，否则会串台
      if (seq !== danmakuHistoryReqSeq) return;
      danmakuHistoryLoading = false;

      if (!res || !res.ok) {
        DanmakuHistory_renderError(res ? res.reason : "exception");
        DanmakuHistory_setReplayVisible(DanmakuHistory_canReplay());
        return;
      }

      if (reset) DanmakuHistory_clearList();
      let list = res.list || [];
      DanmakuHistory_appendRows(list);
      DanmakuHistory_fillRoomNames();
      DanmakuHistory_updateCount();

      if (list.length === 0) {
        // ② 本地未收录：如实说"没有"，同时把第三态（查回放）露出来
        DanmakuHistory_setStatus(offset === 0 ? "本地未收录" : "没有更多了", "empty", "");
      } else {
        // ① 本地有 N 条（N = 已渲染行数，翻页后是累计值）
        let loaded = DanmakuHistory_loadedRowCount();
        DanmakuHistory_setStatus(
          "本地有 " + loaded + " 条" + (res.hasMore ? "（还有更多）" : "（已全部加载）"),
          "ok",
          ""
        );
      }
      DanmakuHistory_setMoreVisible(!!res.hasMore);
      DanmakuHistory_setReplayVisible(DanmakuHistory_canReplay());
    });
}

/* ---------- 第三态：查本房间回放（官方回放接口，抽样口径） ---------- */

/** 面板按钮里的"本房间"= 当前直播间 rid；拿不到返回 ""（这时按钮不渲染）。 */
function DanmakuHistory_currentRid() {
  try {
    if (typeof rid !== "undefined" && rid) return String(rid);
  } catch (e) {
    return "";
  }
  return "";
}

function DanmakuHistory_canReplay() {
  if (typeof ArchiveReplay === "undefined" || !ArchiveReplay) return false;
  if (typeof ArchiveReplay.queryUserHistory !== "function") return false;
  return !!DanmakuHistory_currentRid();
}

function DanmakuHistory_loadReplay() {
  if (!danmakuHistoryPanel || !danmakuHistoryUid) return;
  if (!DanmakuHistory_canReplay()) return;

  let ridText = DanmakuHistory_currentRid();
  let dayKey = getLocalDateStr(danmakuHistoryDate);
  // 复用同一个序号：换日期 / 换用户都会让这次回放结果作废（否则会串到别人那一天）。
  let seq = ++danmakuHistoryReqSeq;
  danmakuHistoryLoading = true;
  DanmakuHistory_setStatus("正在查本房间回放…", "loading", "");

  let pending = null;
  try {
    pending = ArchiveReplay.queryUserHistory(danmakuHistoryUid, ridText, {
      fromDayKey: dayKey,
      toDayKey: dayKey,
      maxPages: DANMAKU_HISTORY_REPLAY_MAX_PAGES
    });
  } catch (e) {
    pending = null;
  }

  Promise.resolve(pending).then(function (result) {
    if (seq !== danmakuHistoryReqSeq) return;
    danmakuHistoryLoading = false;
    if (!result || !result.ok) {
      DanmakuHistory_setStatus("回放查询失败（" + ((result && result.reason) || "exception") + "）", "error", "retry");
      return;
    }
    let items = Array.isArray(result.items) ? result.items : [];
    let rows = [];
    for (let i = 0; i < items.length; i++) {
      let raw = items[i];
      if (!raw || typeof raw !== "object") continue;
      rows.push({
        kind: "chat",
        txt: raw.txt === undefined || raw.txt === null ? "" : String(raw.txt),
        gfn: "",
        gfcnt: 1,
        rid: raw.rid ? String(raw.rid) : ridText,
        roomName: "",
        ts: Number(raw.ts) || 0
      });
    }
    DanmakuHistory_appendRows(rows);
    DanmakuHistory_fillRoomNames();
    DanmakuHistory_updateCount();
    // ★口径必须写在脸上：回放只有弹幕、没有礼物，且库端疑似抽样（见 B 报告第四节）。
    DanmakuHistory_setStatus(
      DANMAKU_HISTORY_REPLAY_NOTICE + " · 追加 " + rows.length + " 条（本机档案未收录；回放不含礼物）",
      "notice",
      "",
      "回放弹幕是抽样口径：只有弹幕没有礼物，且只有存在回放的场次才有数据"
    );
    DanmakuHistory_setMoreVisible(false);
    DanmakuHistory_setReplayVisible(false);
  }, function () {
    if (seq !== danmakuHistoryReqSeq) return;
    danmakuHistoryLoading = false;
    DanmakuHistory_setStatus("回放查询失败（exception）", "error", "retry");
  });
}

/** 房间名缺失时用 ArchiveMeta.room(rid) 补（它自带 30 分钟缓存，重复调用不额外发请求）。 */
function DanmakuHistory_fillRoomNames() {
  if (!danmakuHistoryPendingNames.length) return;
  if (typeof ArchiveMeta === "undefined" || !ArchiveMeta || typeof ArchiveMeta.room !== "function") {
    danmakuHistoryPendingNames = [];
    return;
  }
  let queue = danmakuHistoryPendingNames;
  danmakuHistoryPendingNames = [];
  for (let i = 0; i < queue.length; i++) {
    (function (entry) {
      let pending = null;
      try {
        pending = ArchiveMeta.room(entry.rid);
      } catch (e) {
        return;
      }
      Promise.resolve(pending).then(function (result) {
        if (!result || !result.ok || !result.room) return;
        let roomName = result.room.roomName ? String(result.room.roomName) : "";
        if (!roomName) return;
        if (!entry.el || !entry.el.parentNode) return;
        entry.el.textContent = roomName + " · " + DanmakuHistory_formatTime(entry.ts);
      }, function () {});
    })(queue[i]);
  }
}

/** 标题栏来源行：本地档案 · 覆盖 N 房间 / M 天。 */
function DanmakuHistory_setSourceText() {
  if (!danmakuHistoryPanel) return;
  let el = danmakuHistoryPanel.querySelector(".danmaku-history-panel__source");
  if (!el) return;
  el.textContent = "本地档案";
  DanmakuHistory_querySourceText().then(function (text) {
    if (!danmakuHistoryPanel) return;
    let target = danmakuHistoryPanel.querySelector(".danmaku-history-panel__source");
    if (target) target.textContent = text || "本地档案";
  }, function () {});
}

function DanmakuHistory_gotoDate(date) {
  if (date.getTime() > DanmakuHistory_today().getTime()) return;
  danmakuHistoryDate = date;
  danmakuHistoryOffset = 0;
  DanmakuHistory_syncToolbar();
  DanmakuHistory_clearList();
  DanmakuHistory_loadPage(0, true);
}

function DanmakuHistory_hidePanel() {
  if (!danmakuHistoryPanel) return;
  danmakuHistoryPanel.style.removeProperty("display");
  danmakuHistoryPanel.style.setProperty("display", "none", "important");
  danmakuHistoryPanel.classList.remove("miuix-modal-in");
  if (typeof updateDockActiveIndicator === "function") updateDockActiveIndicator();
}

/*
 * 弹窗会盖住聊天区（实测弹窗 x2024-2404/y353-723，而弹幕用户名就在这一带）。
 * 若不在点击别处时收起，用户就没法继续点弹幕里其它用户名 —— 点了会打在弹窗上，
 * 看起来就像"换了个人但没重新查询"。因此打开期间挂一次性外部点击监听。
 */
function DanmakuHistory_bindOutsideClose() {
  if (DanmakuHistory_outsideBound) return;
  DanmakuHistory_outsideBound = true;
  document.addEventListener("mousedown", function (e) {
    let p = danmakuHistoryPanel;
    if (!p || !p.isConnected || p.style.display === "none") return;
    let t = e.target;
    if (t && p.contains(t)) return;
    if (t && t.closest && t.closest(".dyex-danmaku-history")) return;
    DanmakuHistory_hidePanel();
  }, true);
}

function DanmakuHistory_open(card, triggerBtn) {
  let uid = DanmakuHistory_getUidFromCard(card);
  if (!uid) {
    showMessage("未能识别该用户 ID，无法查询弹幕历史", "error");
    return;
  }

  let p = DanmakuHistory_ensurePanel();
  danmakuHistoryUid = uid;
  danmakuHistoryNick = DanmakuHistory_getNickFromCard(card);
  danmakuHistoryDate = DanmakuHistory_today();
  danmakuHistoryOffset = 0;
  danmakuHistoryLoading = false;

  ensureMiuixPanelHeader(p, "弹幕历史" + (danmakuHistoryNick ? " · " + danmakuHistoryNick : ""));
  DanmakuHistory_syncToolbar();
  DanmakuHistory_setSourceText();
  DanmakuHistory_setReplayVisible(false);
  DanmakuHistory_clearList();
  openMiuixPanelCentered(p, triggerBtn);

  // 斗鱼卡片与我们的弹窗区域重叠，且我们 z-index 更高，不关掉会像"弹窗被卡片穿透"。
  // 卡片有 NormalCard / SupremeCard / GiftHallCard 多种变体，关闭按钮同样按后缀匹配。
  let cardClose = (card && card.querySelector('[class*="Card-close"]')) || document.querySelector('[class*="Card-close"]');
  if (cardClose) cardClose.click();

  DanmakuHistory_loadPage(0, true);
}

/* ---------- 入口 ---------- */
function initPkg_DanmakuHistory() {
  if (typeof MutationObserver !== "function" || !document.body) return;

  // 用户在弹幕列表里点用户名才会生成 .NormalCard，且每次点击都是新节点。
  // 弹幕列表每秒突变多次，所以回调只做去抖置位，真正的扫描 200ms 合并执行一次，
  // 把整页 querySelectorAll 压到每秒最多 5 次。
  let observer = new MutationObserver(function () {
    if (danmakuHistoryScanTimer) return;
    danmakuHistoryScanTimer = setTimeout(function () {
      danmakuHistoryScanTimer = null;
      DanmakuHistory_scanAndInject();
    }, DANMAKU_HISTORY_SCAN_DEBOUNCE);
  });
  observer.observe(document.body, { childList: true, subtree: true });

  DanmakuHistory_scanAndInject();
}
