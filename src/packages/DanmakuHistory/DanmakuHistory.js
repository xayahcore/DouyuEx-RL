/* ==================== 历史弹幕查询（用户卡片入口 + 页内弹窗） ==================== */
/*
 * 数据源：doseeing.com（在看排行）—— 斗鱼第三方数据站，@connect 已在 main.js 声明。
 * 接口契约（2026-09-22 实机实测）：
 *   GET /data/api/user_feed?uid=&dt=<YYYY-MM-DD>&offset=<n>&order=<chat|gift>
 *   · 必须登录，匿名一律 302 跳 /login（用 finalUrl 判定）
 *   · 单页固定 50 条，offset 递增翻页，返回不足 50 即无更多
 *   · 按 ts 时间正序；order 参数实测无过滤作用（chat/gift/chat,gift 返回完全一致）
 *   · dt 是「直播日」锚点，窗口约 [dt-1 20:00, dt 20:00]
 *   · dt=0（"全部"模式）已 502，禁用
 */

const DANMAKU_HISTORY_API = "https://www.doseeing.com/data/api/user_feed";
const DANMAKU_HISTORY_PAGE_SIZE = 50;
const DANMAKU_HISTORY_TIMEOUT = 8000;
const DANMAKU_HISTORY_CACHE_MAX = 60;
const DANMAKU_HISTORY_SCAN_DEBOUNCE = 200;

let danmakuHistoryPanel = null;
let danmakuHistoryUid = "";
let danmakuHistoryNick = "";
let danmakuHistoryDate = null;
let danmakuHistoryOffset = 0;
let danmakuHistoryLoading = false;
let danmakuHistoryReqSeq = 0;
let danmakuHistoryScanTimer = null;
const danmakuHistoryCache = new Map();

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

/* ---------- 数据层 ---------- */
function DanmakuHistory_fetch(uid, dateStr, offset) {
  let key = uid + "|" + dateStr + "|" + offset;
  let cached = danmakuHistoryCache.get(key);
  if (cached) return Promise.resolve(cached);

  return new Promise(function (resolve) {
    let settled = false;
    // 成功、失败、超时三条路径都必须回调并复位，否则界面会永远停在"加载中"。
    let done = function (payload) {
      if (settled) return;
      settled = true;
      if (payload && payload.ok) DanmakuHistory_cacheSet(key, payload);
      resolve(payload);
    };

    if (typeof GM_xmlhttpRequest !== "function") {
      done({ ok: false, reason: "unsupported" });
      return;
    }

    GM_xmlhttpRequest({
      method: "GET",
      url: DANMAKU_HISTORY_API
        + "?uid=" + encodeURIComponent(uid)
        + "&dt=" + encodeURIComponent(dateStr)
        + "&offset=" + offset
        + "&order=chat,gift",
      timeout: DANMAKU_HISTORY_TIMEOUT,
      onload: function (res) {
        let finalUrl = String((res && res.finalUrl) || "");
        if (finalUrl.indexOf("/login") !== -1) { done({ ok: false, reason: "login" }); return; }
        if (!res || res.status !== 200) { done({ ok: false, reason: "http" }); return; }
        let raw = String(res.responseText || "");
        let json = null;
        try {
          json = (res.response && typeof res.response === "object") ? res.response : JSON.parse(raw);
        } catch (e) { json = null; }
        if (!json || !Array.isArray(json.result)) {
          // finalUrl 缺失时的兜底：未登录会被 302 到 /login，拿到的是登录页而不是 JSON。
          // 宁可多认一次"需登录"，也不要把它误报成"数据源异常"。
          let looksLikeLogin = /\/login|sign\s*in/i.test(finalUrl + raw.slice(0, 600));
          done({ ok: false, reason: looksLikeLogin ? "login" : "parse" });
          return;
        }
        done({ ok: true, list: json.result });
      },
      onerror: function () { done({ ok: false, reason: "network" }); },
      ontimeout: function () { done({ ok: false, reason: "timeout" }); },
      onabort: function () { done({ ok: false, reason: "abort" }); }
    });
  });
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
      </div>
      <div class="danmaku-history-panel__list"></div>
      <div class="danmaku-history-panel__status">
        <span class="danmaku-history-panel__status-text"></span>
        <button type="button" class="ex-picker-btn danmaku-history-panel__more">加载更多</button>
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
  p.querySelector(".danmaku-history-panel__more").addEventListener("click", function () {
    DanmakuHistory_loadPage(danmakuHistoryOffset + DANMAKU_HISTORY_PAGE_SIZE, false);
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
  let isGift = !!item && item.type === "gift";

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
    let giftName = item.name || "";
    let count = item.c || 1;
    title.textContent = giftName ? ("赠送 " + giftName + " ×" + count) : String(item.txt || "礼物");
  } else {
    title.textContent = String(item.txt || "");
  }
  textBox.appendChild(title);

  let desc = document.createElement("span");
  desc.className = "sign-option-desc";
  desc.textContent = String(item["room.nn"] || "未知直播间") + " · " + DanmakuHistory_formatTime(item.ts);
  textBox.appendChild(desc);

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

function DanmakuHistory_setStatus(text, kind, action) {
  if (!danmakuHistoryPanel) return;
  let box = danmakuHistoryPanel.querySelector(".danmaku-history-panel__status-text");
  if (!box) return;

  box.textContent = text || "";
  box.className = "danmaku-history-panel__status-text" + (kind ? " is-" + kind : "");
  box.onclick = null;
  box.title = "";

  if (action === "login") {
    box.title = "点击前往 doseeing 登录";
    box.onclick = function () { openPage("https://www.doseeing.com/login", true); };
  } else if (action === "retry") {
    box.title = "点击重试";
    box.onclick = function () {
      DanmakuHistory_loadPage(danmakuHistoryOffset, danmakuHistoryOffset === 0);
    };
  }
}

function DanmakuHistory_setMoreVisible(visible) {
  if (!danmakuHistoryPanel) return;
  let btn = danmakuHistoryPanel.querySelector(".danmaku-history-panel__more");
  if (btn) btn.classList.toggle("is-visible", !!visible);
}

function DanmakuHistory_renderError(reason) {
  let msg = "加载失败，请稍后重试";
  let action = "retry";
  if (reason === "login") {
    msg = "需先登录 doseeing 才能查询历史弹幕";
    action = "login";
  } else if (reason === "timeout") {
    msg = "请求超时，请重试";
  } else if (reason === "parse") {
    msg = "数据源返回异常，请重试";
  } else if (reason === "unsupported") {
    msg = "当前环境不支持跨域请求";
    action = "";
  }
  DanmakuHistory_setStatus(msg, "error", action);
  DanmakuHistory_setMoreVisible(false);
}

/* ---------- 加载流程 ---------- */
function DanmakuHistory_loadPage(offset, reset) {
  if (!danmakuHistoryPanel || !danmakuHistoryUid || danmakuHistoryLoading) return;

  danmakuHistoryLoading = true;
  danmakuHistoryOffset = offset;
  let seq = ++danmakuHistoryReqSeq;

  DanmakuHistory_setStatus("加载中…", "loading", "");
  DanmakuHistory_setMoreVisible(false);

  DanmakuHistory_fetch(danmakuHistoryUid, getLocalDateStr(danmakuHistoryDate), offset)
    .then(function (res) {
      // 快速切换日期时丢弃过期响应，否则会串台
      if (seq !== danmakuHistoryReqSeq) return;
      danmakuHistoryLoading = false;

      if (!res || !res.ok) {
        DanmakuHistory_renderError(res ? res.reason : "network");
        return;
      }

      if (reset) DanmakuHistory_clearList();
      let list = res.list || [];
      DanmakuHistory_appendRows(list);
      DanmakuHistory_updateCount();

      let hasMore = list.length >= DANMAKU_HISTORY_PAGE_SIZE;
      if (list.length === 0) {
        DanmakuHistory_setStatus(offset === 0 ? "这一天没有记录" : "没有更多了", "empty", "");
      } else if (hasMore) {
        DanmakuHistory_setStatus("", "", "");
      } else {
        DanmakuHistory_setStatus("没有更多了", "empty", "");
      }
      DanmakuHistory_setMoreVisible(hasMore);
    });
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
