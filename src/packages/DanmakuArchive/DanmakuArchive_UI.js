/* ==================== P0 数据档案：第 10 个 Dock 面板（瘦身版） ==================== */
/*
 * 职责：只做"读 + 展示 + 两个维护动作"，自己不碰 IndexedDB、不碰报文解析。
 * 数据一律经 ArchiveDB / ArchiveMetrics 取得，任何一项缺失或失败都如实显示
 * 「未收录 / 不可用 / —」，**绝不显示 0 假装有数据**。
 *
 * 内容只剩两块：
 *   ① 概览   —— 今天 / 昨天 / 近 7 天 三档窗口；弹幕值 / 收入值 / 活跃值 三个大数字；
 *               次级一行（弹幕人数、送礼人数、进场人数、人均发言）+ 数据覆盖率。
 *   ② 维护   —— 一行留存体积摘要 + 刷新 / 导出 CSV / 清理本地档案。
 *
 * 三条硬规则（踩过就知道疼）：
 *   1. Dock 图标必须插在「检查更新」(.ex-update) 的**前面**：
 *      wrap.insertBefore(node, updateIcon)；锚点缺失时才退化为插到首位。
 *      九个老包都用 prepend（插到最前），DOM 顺序 = init 顺序的倒序，
 *      靠 init 顺序去"碰"位置必然翻车，只能锚点定位。
 *   2. 面板同时挂 .miuix-modal：宽度/高度/磨砂/打开态全部由 ExPanel.css 第 2 节铁壁组
 *      自动继承，**本包 CSS 一律不写 width / height**（全产物只允许存在一条模态宽度声明，
 *      多写一处就等于包级静默覆盖，构建期门禁会挂）。
 *   3. 所有跨模块取值都走 typeof 判空（沙箱里裸引用未声明标识符会抛 ReferenceError，
 *      而 typeof 是安全的）；所有 Promise 都收口成 resolve，绝不向外抛。
 */

var ARCHIVE_UI_STATE = {
  inited: false,
  pollTimer: 0,
  pollCount: 0,
  dockNode: null,
  panel: null,
  refreshSeq: 0,
  windowKey: "day",
  lastData: null,
  mutualTimer: 0,
  hoverTimer: 0,
  hoverCloseTimer: 0,
  liveTimer: 0
};

var ARCHIVE_UI_DOCK_POLL_INTERVAL_MS = 1000;
var ARCHIVE_UI_DOCK_POLL_MAX = 15;

/* 三档窗口：day / yesterday / 7d（今天 / 昨天 / 近 7 天）。
   from/to 的偏移都以「今天」为原点：今天 [0,0]、昨天 [-1,-1]、近 7 天 [-6,0]。 */
var ARCHIVE_UI_WINDOWS = ["day", "yesterday", "7d"];
var ARCHIVE_UI_WINDOW_LABELS = { day: "今天", yesterday: "昨天", "7d": "近 7 天" };
var ARCHIVE_UI_WINDOW_FROM_OFFSET = { day: 0, yesterday: -1, "7d": -6 };
var ARCHIVE_UI_WINDOW_TO_OFFSET = { day: 0, yesterday: -1, "7d": 0 };
var ARCHIVE_UI_WINDOW_DAY_COUNTS = { day: 1, yesterday: 1, "7d": 7 };
var ARCHIVE_UI_MINUTES_PER_DAY = 1440;
var ARCHIVE_UI_MUTUAL_INTERVAL_MS = 600;
/* 钻粉价目（元/月，2026-10-17 真机开通面板实测）：
   1 个月 218 元/月（省 0）、3 个月 158 元/月（省 180）、12 个月 138 元/月（省 960，年卡总价 1656）。
   连续包月同为 158 元/月（到期自动续费）。这里只用于 tooltip 文案说明，不参与金额计算。 */
var ARCHIVE_UI_DF_SINGLE_YUAN = 218;
var ARCHIVE_UI_DF_MONTH3_YUAN = 158;
var ARCHIVE_UI_DF_YEAR_YUAN = 138;
var ARCHIVE_UI_HOVER_DELAY_MS = 120;
/* 移开后多久收起：只够鼠标从图标移进面板，再长就是"移开了还赖着" */
var ARCHIVE_UI_HOVER_CLOSE_DELAY_MS = 90;
/* 面板打开期间的自动刷新间隔：数据覆盖率的分母是"今日已过分钟"，
   必须随时间重算，否则面板挂在那里数字就冻在打开那一刻。30 秒足够，读库成本可忽略。 */
var ARCHIVE_UI_LIVE_REFRESH_MS = 30000;

/* --------------------------------------------------------------------------
 * 0. 跨模块取用（全部 typeof 判空；沙箱里不能对未声明标识符做裸引用）
 * -------------------------------------------------------------------------- */

function archiveUi_getDB() {
  try {
    return typeof ArchiveDB !== "undefined" && ArchiveDB ? ArchiveDB : null;
  } catch (e) {
    return null;
  }
}

function archiveUi_getMetrics() {
  try {
    return typeof ArchiveMetrics !== "undefined" && ArchiveMetrics ? ArchiveMetrics : null;
  } catch (e) {
    return null;
  }
}

function archiveUi_getSnapshot() {
  try {
    if (typeof ArchiveRuntime_snapshot === "function") {
      var snapshot = ArchiveRuntime_snapshot();
      return snapshot && typeof snapshot === "object" ? snapshot : null;
    }
  } catch (e) { }
  return null;
}

function archiveUi_currentRid() {
  try {
    if (typeof rid !== "undefined" && rid !== null && rid !== undefined) {
      var text = String(rid);
      if (text) return text;
    }
  } catch (e) { }
  return "";
}

function archiveUi_todayKey() {
  try {
    if (typeof getLocalDateStr === "function") return String(getLocalDateStr(new Date()));
  } catch (e) { }
  return archiveUi_fallbackDayKey(new Date());
}

function archiveUi_dayKeyShift(dayOffset) {
  var now = new Date();
  var shifted = new Date(now.getFullYear(), now.getMonth(), now.getDate() + (Number(dayOffset) || 0));
  try {
    if (typeof getLocalDateStr === "function") return String(getLocalDateStr(shifted));
  } catch (e) { }
  return archiveUi_fallbackDayKey(shifted);
}

/* common.js 未加载时的兜底（正常路径永远走 getLocalDateStr） */
function archiveUi_fallbackDayKey(date) {
  var pad = function (value) { return value < 10 ? "0" + value : "" + value; };
  return date.getFullYear() + "-" + pad(date.getMonth() + 1) + "-" + pad(date.getDate());
}

function archiveUi_isWindowKey(value) {
  for (var i = 0; i < ARCHIVE_UI_WINDOWS.length; i++) {
    if (ARCHIVE_UI_WINDOWS[i] === value) return true;
  }
  return false;
}

function archiveUi_windowLabel(windowKey) {
  return ARCHIVE_UI_WINDOW_LABELS[windowKey] || ARCHIVE_UI_WINDOW_LABELS.day;
}

/* 单日窗口：今天 / 昨天（"人·日"与多日汇总只对近 7 天成立） */
function archiveUi_isSingleDayWindow(windowKey) {
  return windowKey === "day" || windowKey === "yesterday";
}

/* dayKey 加减天数（纯日期运算，不碰时分秒） */
function archiveUi_dayKeyAdd(dayKey, dayOffset) {
  var parts = String(dayKey).split("-");
  var base = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
  var shifted = new Date(base.getFullYear(), base.getMonth(), base.getDate() + (Number(dayOffset) || 0));
  try {
    if (typeof getLocalDateStr === "function") return String(getLocalDateStr(shifted));
  } catch (e) { }
  return archiveUi_fallbackDayKey(shifted);
}

/* 窗口 → 取数区间：今天 [今天,今天]、昨天 [昨天,昨天]、近 7 天 [今天-6, 今天] */
function archiveUi_windowRange(windowKey, todayKey) {
  var key = archiveUi_isWindowKey(windowKey) ? windowKey : "day";
  var fromOffset = ARCHIVE_UI_WINDOW_FROM_OFFSET[key];
  var toOffset = ARCHIVE_UI_WINDOW_TO_OFFSET[key];
  if (typeof todayKey === "string" && /^\d{4}-\d{2}-\d{2}$/.test(todayKey)) {
    return {
      fromDayKey: archiveUi_dayKeyAdd(todayKey, fromOffset),
      toDayKey: archiveUi_dayKeyAdd(todayKey, toOffset)
    };
  }
  return {
    fromDayKey: archiveUi_dayKeyShift(fromOffset),
    toDayKey: archiveUi_dayKeyShift(toOffset)
  };
}

/* --------------------------------------------------------------------------
 * 1. 通用小工具：Promise 收口 / 格式化 / DOM 建节点
 * -------------------------------------------------------------------------- */

/* 把任意模块方法调用收口成 Promise，永不 reject、永不抛 */
function archiveUi_callModule(target, methodName, args, fallback) {
  var result = null;
  try {
    if (!target || typeof target[methodName] !== "function") return Promise.resolve(fallback);
    result = target[methodName].apply(target, args || []);
  } catch (e) {
    return Promise.resolve(fallback);
  }
  if (result && typeof result.then === "function") {
    return result.then(function (value) {
      return value === undefined || value === null ? fallback : value;
    }, function () {
      return fallback;
    });
  }
  return Promise.resolve(result === undefined || result === null ? fallback : result);
}

function archiveUi_isNumber(value) {
  return typeof value === "number" && isFinite(value);
}

function archiveUi_toNumber(value) {
  if (typeof value === "number" && isFinite(value)) return value;
  if (typeof value === "string" && value !== "") {
    var parsed = Number(value);
    if (isFinite(parsed)) return parsed;
  }
  return null;
}

/* 从候选字段名里取第一个有效数字（各模块字段命名可能略有出入） */
function archiveUi_pickNumber(source, keys) {
  if (!source || typeof source !== "object") return null;
  for (var i = 0; i < keys.length; i++) {
    var value = source[keys[i]];
    if (value === undefined || value === null || value === "") continue;
    var parsed = archiveUi_toNumber(value);
    if (parsed !== null) return parsed;
  }
  return null;
}

function archiveUi_formatCount(value) {
  if (!archiveUi_isNumber(value)) return "不可用";
  return String(Math.round(value));
}

function archiveUi_formatFishChip(cents) {
  if (!archiveUi_isNumber(cents)) return "不可用";
  return (cents / 100).toFixed(1);
}

function archiveUi_formatRatio(value, digits) {
  if (!archiveUi_isNumber(value)) return "不可用";
  return value.toFixed(digits);
}

function archiveUi_formatPercent(value) {
  if (!archiveUi_isNumber(value)) return "不可用";
  return value.toFixed(1) + "%";
}

function archiveUi_formatBytes(bytes) {
  if (!archiveUi_isNumber(bytes) || bytes < 0) return "";
  return (bytes / 1048576).toFixed(1) + " MB";
}

function archiveUi_createElement(tagName, className, text) {
  var node = document.createElement(tagName);
  if (className) node.className = className;
  if (text !== undefined && text !== null) node.textContent = String(text);
  return node;
}

function archiveUi_setText(panel, fieldName, text) {
  if (!panel) return;
  var node = panel.querySelector('[data-field="' + fieldName + '"]');
  if (node) node.textContent = String(text);
}

function archiveUi_setNodeVisible(panel, fieldName, visible) {
  if (!panel) return;
  var node = panel.querySelector('[data-field="' + fieldName + '"]');
  if (node) node.style.display = visible ? "" : "none";
}

function archiveUi_setTitle(panel, fieldName, title) {
  if (!panel) return;
  var node = panel.querySelector('[data-field="' + fieldName + '"]');
  if (node) node.setAttribute("title", title || "");
}

function archiveUi_notify(message, type) {
  try {
    if (typeof showMessage === "function") showMessage(message, type || "info");
  } catch (e) { }
}

/* --------------------------------------------------------------------------
 * 2. Dock 图标：锚点插到「检查更新」之前 + 短轮询等待容器 + 幂等
 * -------------------------------------------------------------------------- */

function archiveUi_buildDockNode() {
  var node = document.createElement("div");
  node.className = "ex-archive";
  node.innerHTML =
    '<a class="ex-panel__icon" title="数据档案">' +
    '<svg t="1792203000000" class="icon" viewBox="0 0 1024 1024" version="1.1" ' +
    'xmlns="http://www.w3.org/2000/svg" width="32" height="32">' +
    '<path d="M192 160h640a64 64 0 0 1 64 64v96H128v-96a64 64 0 0 1 64-64z" fill="#0C2B4A"/>' +
    '<path d="M128 352h768v448a64 64 0 0 1-64 64H192a64 64 0 0 1-64-64V352z" fill="#0C2B4A" opacity="0.82"/>' +
    '<path d="M384 448h256v64H384z" fill="#FFFFFF"/>' +
    '<path d="M384 576h256v64H384z" fill="#FFFFFF" opacity="0.82"/>' +
    '<path d="M384 704h160v64H384z" fill="#FFFFFF" opacity="0.64"/>' +
    '</svg>' +
    '<i id="ex-archive__tip" class="ex-panel__tip"></i>' +
    "</a>";
  return node;
}

function archiveUi_dockWrap() {
  try {
    return document.querySelector(".ex-panel__wrap");
  } catch (e) {
    return null;
  }
}

/* 插入（或搬回）Dock 图标。返回 true 表示本次已就位。 */
function archiveUi_insertDockNode(force) {
  var wrap = archiveUi_dockWrap();
  if (!wrap) return false;

  var existing = ARCHIVE_UI_STATE.dockNode;
  if (existing && existing.parentNode === wrap && !force) return true;

  if (!existing) {
    existing = archiveUi_buildDockNode();
    ARCHIVE_UI_STATE.dockNode = existing;
  }

  /* 幂等：容器里已经有一个 .ex-archive 且不是我们持有的节点，说明是上一次生命周期
     插进去的那份（例如脚本被重复注入），直接用现有的，不重复插第二个。 */
  var duplicate = wrap.querySelector(".ex-archive");
  if (duplicate && duplicate !== existing) {
    ARCHIVE_UI_STATE.dockNode = duplicate;
    existing = duplicate;
    if (existing.parentNode === wrap) {
      archiveUi_bindDockEntry(existing);
      return true;
    }
  }

  var updateIcon = wrap.querySelector(".ex-update");
  try {
    if (updateIcon && updateIcon.parentNode === wrap) {
      wrap.insertBefore(existing, updateIcon);
    } else {
      wrap.insertBefore(existing, wrap.childNodes[0] || null);
    }
  } catch (e) {
    return false;
  }
  archiveUi_bindDockEntry(existing);
  return true;
}

/* 悬浮即开（与扩展功能/直播间工具一致）：120ms 防抖，快速划过一排图标不会挨个弹面板；
   移开只清掉未触发的定时器，**不关闭**已打开的面板（收起仍靠点外部/关闭按钮，与其它三级面板一致）。
   绑定用属性打标记，重复 init() 不会叠加第二组监听。 */
function archiveUi_bindDockEntry(node) {
  archiveUi_bindDockClick(node);
  archiveUi_bindDockHover(node);
}

function archiveUi_bindDockHover(node) {
  if (!node) return;
  var icon = node.querySelector ? node.querySelector("a.ex-panel__icon") : null;
  if (!icon) icon = node;
  if (icon.getAttribute("data-ex-archive-hover-bound") === "1") return;
  icon.setAttribute("data-ex-archive-hover-bound", "1");
  icon.addEventListener("mouseenter", function () {
    archiveUi_cancelHoverClose();
    archiveUi_scheduleHoverOpen(icon);
  });
  icon.addEventListener("mouseleave", function () {
    archiveUi_cancelHoverOpen();
    // 移开就收起。给一小段宽限（默认 90ms）让鼠标能从图标移进面板里点按钮；
    // 真正移开的人感知到的就是"移开即消失"。
    archiveUi_scheduleHoverClose(ARCHIVE_UI_HOVER_CLOSE_DELAY_MS);
  });
}

/*
 * 悬浮收起的两个入口：
 *   · 图标 mouseleave → 90ms 宽限后收起（宽限期间进入面板会取消）
 *   · 面板 mouseleave → 立即收起（0ms）
 * 面板是三级模态、挂在 body 上，不一定贴着图标，所以必须允许"移进面板继续操作"，
 * 否则刷新/导出/清理三个按钮永远点不到。
 */
function archiveUi_scheduleHoverClose(delayMs) {
  archiveUi_cancelHoverClose();
  var wait = typeof delayMs === "number" ? delayMs : ARCHIVE_UI_HOVER_CLOSE_DELAY_MS;
  ARCHIVE_UI_STATE.hoverCloseTimer = setTimeout(function () {
    ARCHIVE_UI_STATE.hoverCloseTimer = 0;
    var panel = ARCHIVE_UI_STATE.panel;
    if (!panel || !archiveUi_isPanelShowing(panel)) return;
    ArchiveUI_hide();
  }, wait);
}

function archiveUi_cancelHoverClose() {
  if (ARCHIVE_UI_STATE.hoverCloseTimer) {
    clearTimeout(ARCHIVE_UI_STATE.hoverCloseTimer);
    ARCHIVE_UI_STATE.hoverCloseTimer = 0;
  }
}

/* 面板自身的进出：进入即取消收起，离开立即收起（与其它悬浮面板一致） */
function archiveUi_bindPanelHover(panel) {
  if (!panel || panel.getAttribute("data-ex-archive-hover-close-bound") === "1") return;
  panel.setAttribute("data-ex-archive-hover-close-bound", "1");
  panel.addEventListener("mouseenter", function () {
    archiveUi_cancelHoverClose();
  });
  panel.addEventListener("mouseleave", function () {
    archiveUi_scheduleHoverClose(0);
  });
}

function archiveUi_scheduleHoverOpen(icon) {
  archiveUi_cancelHoverOpen();
  ARCHIVE_UI_STATE.hoverTimer = setTimeout(function () {
    ARCHIVE_UI_STATE.hoverTimer = 0;
    ArchiveUI_open(icon);
  }, ARCHIVE_UI_HOVER_DELAY_MS);
}

function archiveUi_cancelHoverOpen() {
  if (ARCHIVE_UI_STATE.hoverTimer) {
    clearTimeout(ARCHIVE_UI_STATE.hoverTimer);
    ARCHIVE_UI_STATE.hoverTimer = 0;
  }
}

function archiveUi_bindDockClick(node) {
  if (!node || node.getAttribute("data-ex-archive-bound") === "1") return;
  node.setAttribute("data-ex-archive-bound", "1");
  node.addEventListener("click", function (event) {
    if (event && typeof event.stopPropagation === "function") event.stopPropagation();
    var button = node.querySelector(".ex-panel__icon") || node;
    ArchiveUI_open(button);
  });
}

function archiveUi_stopDockPoll() {
  if (ARCHIVE_UI_STATE.pollTimer) {
    clearInterval(ARCHIVE_UI_STATE.pollTimer);
    ARCHIVE_UI_STATE.pollTimer = 0;
  }
}

/* 容器/Dock 可能比本包晚建出来，也可能被页面重绘摘掉：1s × 15 次短轮询。
   锚点（.ex-update）也可能迟到 —— 它一旦出现而我们还站在兜底首位，就补一次锚点定位，
   否则"位置在检查更新之前"这条硬要求会在慢启动的页面上静默失效。 */
function archiveUi_startDockPoll() {
  if (ARCHIVE_UI_STATE.pollTimer) return;
  ARCHIVE_UI_STATE.pollCount = 0;
  ARCHIVE_UI_STATE.pollTimer = setInterval(function () {
    ARCHIVE_UI_STATE.pollCount++;
    archiveUi_insertDockNode(false);

    var wrap = archiveUi_dockWrap();
    var node = ARCHIVE_UI_STATE.dockNode;
    var updateIcon = wrap ? wrap.querySelector(".ex-update") : null;
    if (wrap && node && updateIcon) {
      if (node.nextElementSibling === updateIcon) {
        archiveUi_stopDockPoll();
        return;
      }
      archiveUi_insertDockNode(true);
      if (node.nextElementSibling === updateIcon) {
        archiveUi_stopDockPoll();
        return;
      }
    }

    if (ARCHIVE_UI_STATE.pollCount >= ARCHIVE_UI_DOCK_POLL_MAX) {
      archiveUi_stopDockPoll();
    }
  }, ARCHIVE_UI_DOCK_POLL_INTERVAL_MS);
}

/* --------------------------------------------------------------------------
 * 3. 面板骨架（三级模态规范）
 * -------------------------------------------------------------------------- */

function archiveUi_panelMarkup() {
  var subLines = [
    ["sub-chatuv", "弹幕人数"],
    ["sub-giftuv", "送礼人数"],
    ["sub-enteruv", "进场人数"],
    ["sub-avg", "人均发言"]
  ];
  var subHtml = "";
  for (var i = 0; i < subLines.length; i++) {
    subHtml += '<span class="ex-archive-subline" data-field="' + subLines[i][0] + '">' +
      subLines[i][1] + ' —</span>';
  }

  var windowHtml = "";
  for (var w = 0; w < ARCHIVE_UI_WINDOWS.length; w++) {
    var key = ARCHIVE_UI_WINDOWS[w];
    windowHtml += '<button type="button" class="ex-archive-chip' +
      (key === "day" ? " is-active" : "") + '" data-window="' + key + '">' +
      ARCHIVE_UI_WINDOW_LABELS[key] + "</button>";
  }

  return (
    '<div class="miuix-modal__body ex-archive-panel__body">' +
    "<!-- ① 概览 -->" +
    '<div class="ex-archive-section ex-archive-overview">' +
    '<div class="ex-archive-section__head">' +
    '<span class="ex-archive-section__title">概览</span>' +
    '<span class="ex-archive-switch">' + windowHtml + "</span>" +
    "</div>" +
    '<div class="ex-archive-metrics">' +
    '<div class="ex-archive-metric" data-field="metric-danmaku"><span class="ex-archive-metric__label">弹幕值</span>' +
    '<span class="ex-archive-metric__value" data-field="overview-danmaku">—</span>' +
    '<span class="ex-archive-metric__unit" data-field="overview-danmaku-unit">条</span></div>' +
    '<div class="ex-archive-metric" data-field="metric-income"><span class="ex-archive-metric__label">收入值</span>' +
    '<span class="ex-archive-metric__value" data-field="overview-income">—</span>' +
    '<span class="ex-archive-metric__unit" data-field="overview-income-unit">鱼翅</span></div>' +
    '<div class="ex-archive-metric" data-field="metric-active"><span class="ex-archive-metric__label">活跃值</span>' +
    '<span class="ex-archive-metric__value" data-field="overview-active">—</span>' +
    '<span class="ex-archive-metric__unit" data-field="overview-active-unit">人</span></div>' +
    "</div>" +
    '<div class="ex-archive-sublines">' + subHtml + "</div>" +
    '<div class="ex-archive-sublines">' +
    '<span class="ex-archive-coverage" data-field="coverage-line">数据覆盖率 —</span>' +
    "</div>" +
    '<div class="ex-archive-note" data-field="sample-note" style="display:none"></div>' +
    '<div class="ex-archive-note" data-field="overview-note"></div>' +
    "</div>" +

    "<!-- ② 外部工具入口：在线弹幕助手（一个链接，不是可展开区块） -->" +
    '<div class="ex-archive-linkrow" data-field="assistant-row">' +
    '<a class="ex-archive-link" data-action="open-assistant" data-field="assistant-link">在线弹幕助手</a>' +
    "</div>" +

    "<!-- ③ 维护 -->" +
    '<div class="ex-archive-section ex-archive-maintain">' +
    '<div class="ex-archive-section__head">' +
    '<span class="ex-archive-section__title">维护</span>' +
    "</div>" +
    '<div class="ex-archive-retention" data-field="maintain-retention">已留存数据：—</div>' +
    '<div class="ex-archive-actions">' +
    '<button type="button" class="ex-archive-btn" data-action="refresh">刷新</button>' +
    '<button type="button" class="ex-archive-btn" data-action="export">导出 CSV</button>' +
    '<button type="button" class="ex-archive-btn ex-archive-btn--danger" data-action="clear">清理本地档案</button>' +
    "</div>" +
    '<div class="ex-archive-note ex-archive-note--error" data-field="maintain-note"></div>' +
    '<div class="ex-archive-note" data-field="order-note" style="display:none"></div>' +
    "</div>" +
    "</div>"
  );
}

function archiveUi_ensurePanel() {
  if (ARCHIVE_UI_STATE.panel && ARCHIVE_UI_STATE.panel.isConnected) {
    return ARCHIVE_UI_STATE.panel;
  }
  var panel = document.createElement("div");
  panel.className = "ex-archive-panel miuix-modal";
  panel.innerHTML = archiveUi_panelMarkup();
  if (document.body) document.body.appendChild(panel);

  /* 顶栏与 body 结构由 ExPanel 统一引擎生成；缺失时自己兜底一个可关闭的顶栏 */
  if (typeof ensureMiuixPanelHeader === "function") {
    try {
      ensureMiuixPanelHeader(panel, "数据档案");
    } catch (e) { }
  } else {
    archiveUi_fallbackHeader(panel, "数据档案");
  }

  archiveUi_bindPanelEvents(panel);
  /* 悬浮收起：进入面板取消收起、离开面板立即收起（与图标 mouseleave 配合） */
  archiveUi_bindPanelHover(panel);
  /* 首帧就把入口落成可用/禁用，避免开面板瞬间看着像可点 */
  archiveUi_renderAssistant(panel);
  ARCHIVE_UI_STATE.panel = panel;
  return panel;
}


/* ExPanel 未加载时的兜底顶栏（正常产物里不会走到） */
function archiveUi_fallbackHeader(panel, title) {
  if (!panel) return;
  var header = document.createElement("div");
  header.className = "ex-archive-header";
  var titleNode = archiveUi_createElement("span", "ex-archive-header__title", title);
  var closeNode = archiveUi_createElement("button", "ex-archive-header__close", "×");
  closeNode.setAttribute("type", "button");
  closeNode.addEventListener("click", function () {
    ArchiveUI_hide();
  });
  header.appendChild(titleNode);
  header.appendChild(closeNode);
  panel.insertBefore(header, panel.firstChild);
}

function archiveUi_bindPanelEvents(panel) {
  if (!panel || panel.getAttribute("data-ex-archive-events") === "1") return;
  panel.setAttribute("data-ex-archive-events", "1");

  panel.addEventListener("click", function (event) {
    var target = event ? event.target : null;
    if (!target) return;

    var windowBtn = target.closest ? target.closest("[data-window]") : null;
    if (windowBtn) {
      event.stopPropagation();
      ArchiveUI_setWindow(windowBtn.getAttribute("data-window"));
      return;
    }

    var actionBtn = target.closest ? target.closest("[data-action]") : null;
    if (actionBtn) {
      event.stopPropagation();
      archiveUi_handleAction(actionBtn.getAttribute("data-action"));
    }
  });
}

function archiveUi_handleAction(action) {
  if (action === "refresh") {
    ArchiveUI_refresh();
    return;
  }
  if (action === "export") {
    archiveUi_exportCsv();
    return;
  }
  if (action === "clear") {
    archiveUi_clearArchive();
    return;
  }
  if (action === "open-assistant") {
    archiveUi_openAssistant();
  }
}

/* --------------------------------------------------------------------------
 * 4. 打开 / 关闭 / 互相排斥
 * -------------------------------------------------------------------------- */

function ArchiveUI_open(triggerButton) {
  var panel = archiveUi_ensurePanel();
  if (!panel) return;
  /* 幂等：已经打开时再 hover / 再点击都什么都不做 ——
     既不重复创建节点，也不触发一轮新的取数（否则划过图标会变成刷新风暴）。 */
  if (archiveUi_isPanelShowing(panel)) return;

  if (typeof openMiuixPanelCentered === "function") {
    try {
      openMiuixPanelCentered(panel, triggerButton || null);
    } catch (e) {
      archiveUi_fallbackOpen(panel);
    }
  } else {
    archiveUi_fallbackOpen(panel);
  }
  if (!panel.isConnected && document.body) document.body.appendChild(panel);

  archiveUi_cancelHoverClose();
  archiveUi_startMutualWatch();
  archiveUi_startLiveRefresh();
  ArchiveUI_refresh();
}

/* openMiuixPanelCentered 缺失时的兜底：浮到视口中央偏下 */
function archiveUi_fallbackOpen(panel) {
  if (!panel) return;
  if (panel.parentNode !== document.body && document.body) document.body.appendChild(panel);
  panel.style.position = "fixed";
  panel.style.left = "50%";
  panel.style.bottom = "90px";
  panel.style.transform = "translateX(-50%)";
  panel.style.zIndex = "100030";
  panel.style.removeProperty("display");
  panel.style.setProperty("display", "flex", "important");
  panel.classList.remove("miuix-modal-out");
  panel.classList.add("miuix-modal-in");
}

function ArchiveUI_hide() {
  var panel = ARCHIVE_UI_STATE.panel;
  archiveUi_cancelHoverClose();
  archiveUi_stopLiveRefresh();
  archiveUi_stopMutualWatch();
  if (!panel) return;
  panel.style.removeProperty("display");
  panel.style.setProperty("display", "none", "important");
  panel.classList.remove("miuix-modal-in");
  try {
    if (typeof updateDockActiveIndicator === "function") updateDockActiveIndicator();
  } catch (e) { }
}

function archiveUi_isPanelShowing(node) {
  if (!node) return false;
  var display = String((node.style && node.style.display) || "");
  if (display === "none") return false;
  if (display === "flex" || display === "block") return true;
  return !!(node.classList && node.classList.contains("miuix-modal-in"));
}

/* 其他三级面板被划开时把自己收起：ExPanel 的互斥清单由 Lead 维护，
   本包不改别人的文件，靠自己看着（只在面板打开期间挂 600ms 轮询）。 */
var ARCHIVE_UI_OTHER_PANELS = ".sign-panel, .fans-continue-panel, .extool, .livetool, .bloop, .exlottery, .popup-player-panel, .exupdate-panel, .danmaku-history-panel";

function archiveUi_startMutualWatch() {
  if (ARCHIVE_UI_STATE.mutualTimer) return;
  ARCHIVE_UI_STATE.mutualTimer = setInterval(function () {
    var panel = ARCHIVE_UI_STATE.panel;
    if (!panel || !archiveUi_isPanelShowing(panel)) {
      archiveUi_stopMutualWatch();
      return;
    }
    var others = document.querySelectorAll(ARCHIVE_UI_OTHER_PANELS);
    for (var i = 0; i < others.length; i++) {
      if (others[i] !== panel && archiveUi_isPanelShowing(others[i])) {
        ArchiveUI_hide();
        return;
      }
    }
  }, ARCHIVE_UI_MUTUAL_INTERVAL_MS);
}

function archiveUi_stopMutualWatch() {
  if (ARCHIVE_UI_STATE.mutualTimer) {
    clearInterval(ARCHIVE_UI_STATE.mutualTimer);
    ARCHIVE_UI_STATE.mutualTimer = 0;
  }
}

/* --------------------------------------------------------------------------
 * 5. 数据采集（一次抓齐，render 阶段不再 await）
 * -------------------------------------------------------------------------- */

function archiveUi_gatherData() {
  var db = archiveUi_getDB();
  var windowKey = ARCHIVE_UI_STATE.windowKey;
  var todayKey = archiveUi_todayKey();
  var windowRange = archiveUi_windowRange(windowKey, todayKey);

  var data = {
    rid: archiveUi_currentRid(),
    windowKey: windowKey,
    todayKey: todayKey,
    fromDayKey: windowRange.fromDayKey,
    toDayKey: windowRange.toDayKey,
    days: null,
    sum: null,
    sourcesReady: false,
    usedDayFallback: false,
    stats: null,
    snapshot: archiveUi_getSnapshot(),
    summary: null,
    coveragePercent: null,
    observedMin: null,
    dbMissing: !db
  };

  if (!data.rid) {
    data.ridMissing = true;
    return Promise.resolve(data);
  }

  var tasks = [];

  /* 新接口：ArchiveDB.sumRoomDays(rid, fromDayKey, toDayKey)
     → { ok, days（天数，number）, sum:{...,observedMin} }（其快照字段本面板不消费）
     面板只消费 sum / observedMin；模块缺失时"今日"窗口回落到 getRoomDay。 */
  tasks.push(archiveUi_callModule(db, "sumRoomDays", [data.rid, data.fromDayKey, data.toDayKey], null)
    .then(function (value) {
      var normalized = archiveUi_normalizeSumResult(value);
      if (normalized) {
        data.days = normalized.days;
        data.sum = normalized.sum;
        data.sourcesReady = true;
      }
    }));

  tasks.push(archiveUi_callModule(db, "stats", [], null).then(function (value) {
    data.stats = value && typeof value === "object" ? value : null;
  }));

  return Promise.all(tasks).then(function () {
    if (data.sourcesReady) return null;
    /* 兼容路径：sumRoomDays 未就位时，至少把"今日"窗口用单日 room_day 撑起来 */
    if (!archiveUi_isSingleDayWindow(windowKey) || !db || typeof db.getRoomDay !== "function") return null;
    return archiveUi_callModule(db, "getRoomDay", [data.rid, data.fromDayKey], null).then(function (roomDay) {
      if (roomDay && typeof roomDay === "object") {
        data.days = [roomDay];
        data.sum = roomDay;
        data.sourcesReady = true;
        data.usedDayFallback = true;
      }
    });
  }).then(function () {
    data.sampling = archiveUi_collectSampling(data);
    return archiveUi_resolveSummary(data);
  }).then(function () {
    return archiveUi_resolveCoverage(data);
  }).then(function () {
    return data;
  });
}

/* 抽样标注：采集侧对超高流量房间的聊天明细做限额抽样，会在 room_day 上写
   detailSampled / detailKept / detailDropped。抽样只影响"能翻到多少条原始弹幕"，
   统计数字仍是全量精确，所以这里只做说明、不在数字上加任何"约"或星号。 */
function archiveUi_collectSampling(data) {
  if (!data) return null;
  /* days 是逐日行时优先用它（真实 DB 的 days 可能是天数(number)，那就退回 sum）；
     两者不叠加，避免同一行被算两遍。 */
  var rows = (Object.prototype.toString.call(data.days) === "[object Array]" && data.days.length)
    ? data.days
    : (data.sum ? [data.sum] : []);
  var sampled = false;
  var kept = null;
  var dropped = null;
  for (var i = 0; i < rows.length; i++) {
    var row = rows[i];
    if (!row || typeof row !== "object") continue;
    if (row.detailSampled !== true && row.detailSampled !== "true") continue;
    sampled = true;
    var keptValue = archiveUi_pickNumber(row, ["detailKept"]);
    if (keptValue !== null) kept = (kept === null ? 0 : kept) + keptValue;
    var droppedValue = archiveUi_pickNumber(row, ["detailDropped"]);
    if (droppedValue !== null) dropped = (dropped === null ? 0 : dropped) + droppedValue;
  }
  if (!sampled) return null;
  return { sampled: true, kept: kept, dropped: dropped };
}

/* { ok, days, sum } → 内部形状；失败/空一律 null（快照字段不消费，采集侧已停采） */
function archiveUi_normalizeSumResult(value) {
  if (!value || typeof value !== "object") return null;
  if (value.ok === false) return null;

  var days = Object.prototype.toString.call(value.days) === "[object Array]" ? value.days : null;
  var sum = value.sum && typeof value.sum === "object" ? value.sum : null;

  /* 只给了 days 没给 sum：自己按字段相加（本机数据，纯加总，不涉及去重语义变更） */
  if (!sum && days && days.length) sum = archiveUi_aggregateDays(days);
  if (!sum) return null;

  return { days: days, sum: sum };
}

function archiveUi_aggregateDays(days) {
  var sum = { days: days.length };
  var numericKeys = ["danmakuCnt", "incomeCents", "giftCnt", "activeUv", "chatUv", "giftUv", "paidUv", "enterUv", "observedMin"];
  for (var i = 0; i < numericKeys.length; i++) {
    var total = 0;
    var touched = false;
    for (var j = 0; j < days.length; j++) {
      var value = archiveUi_pickNumber(days[j], [numericKeys[i]]);
      if (value === null) continue;
      total += value;
      touched = true;
    }
    if (touched) sum[numericKeys[i]] = total;
  }
  return sum;
}

/* 口径：优先 ArchiveMetrics.summarizeWindow(days, window)；
   缺失时"今日"窗口退一步用 ArchiveMetrics.summarize(roomDay, {window:"day"})；
   再不行就用 sum 里的原始字段自己算（弹幕值/收入值/活跃值 + 各 UV）。 */
function archiveUi_resolveSummary(data) {
  if (!data || (!data.sum && !(data.days && data.days.length))) return Promise.resolve();
  var metrics = archiveUi_getMetrics();

  /* 口径模块吃两种入参：逐日 room_day 数组，或一个"和"对象（真实实现里 metricsSumOfDays
     的第三种情形就是直接拿 sum 当和用）。注意「sumRoomDays().days」是**天数(number)**
     而不是数组，所以必须先用 Array.isArray 判型，否则永远拿不到逐日列表。 */
  var hasDayList = Array.isArray(data.days) && data.days.length > 0;
  var summarizeInput = hasDayList ? data.days : (data.sum || null);

  var chain = Promise.resolve(null);

  if (metrics && typeof metrics.summarizeWindow === "function" && summarizeInput) {
    chain = archiveUi_callModule(metrics, "summarizeWindow", [summarizeInput, data.windowKey], null)
      .then(function (result) {
        var summary = archiveUi_normalizeSummary(result);
        return summary && archiveUi_summaryHasCore(summary) ? summary : null;
      });
  }

  return chain.then(function (summary) {
    if (summary) return summary;
    if (!archiveUi_isSingleDayWindow(data.windowKey)) return null;
    if (!metrics || typeof metrics.summarize !== "function") return null;
    var singleDay = data.days && data.days.length
      ? data.days[data.days.length - 1]
      : data.sum;
    if (!singleDay || typeof singleDay !== "object") return null;
    return archiveUi_callModule(metrics, "summarize", [singleDay, { window: data.windowKey }], null)
      .then(function (result) {
        var fallbackSummary = archiveUi_normalizeSummary(result);
        return fallbackSummary && archiveUi_summaryHasCore(fallbackSummary) ? fallbackSummary : null;
      });
  }).then(function (summary) {
    data.summary = summary || archiveUi_summaryFromSum(data);
    return null;
  });
}

/* sum 兜底：只认契约里的原始字段，算不出来就留空（render 显示"不可用"，绝不填 0） */
function archiveUi_summaryFromSum(data) {
  var sum = data && data.sum ? data.sum : null;
  if (!sum) return null;

  var summary = {
    danmakuCnt: archiveUi_pickNumber(sum, ["danmakuCnt"]),
    incomeCents: archiveUi_pickNumber(sum, ["incomeCents"]),
    activeUv: archiveUi_pickNumber(sum, ["activeUv"]),
    chatUv: archiveUi_pickNumber(sum, ["chatUv"]),
    giftUv: archiveUi_pickNumber(sum, ["giftUv"]),
    enterUv: archiveUi_pickNumber(sum, ["enterUv"]),
    paidUv: archiveUi_pickNumber(sum, ["paidUv"]),
    giftCnt: archiveUi_pickNumber(sum, ["giftCnt"]),
    avgPerUser: null,
    lurkRate: null,
    observedMin: archiveUi_pickNumber(sum, ["observedMin", "observedMinutes"]),
    activeUvIsPersonDay: !archiveUi_isSingleDayWindow(data.windowKey)
  };
  return archiveUi_summaryHasCore(summary) ? summary : null;
}

/* 归一化口径结果：与 DanmakuArchive_Metrics.js 的返回值对齐。
 * 真实模块给 { danmakuValue, giftCnt, incomeYc(鱼翅), activeUv, chatUv, giftUv,
 *             enterUv, avgPerUser, lurkRate }；这里统一折算成「分」与原始条数，
 * 内部一律以分为单位（cents），展示再除 100，避免两处小数口径打架。 */
function archiveUi_normalizeSummary(raw) {
  if (!raw || typeof raw !== "object") return null;
  var incomeYc = archiveUi_pickNumber(raw, ["incomeYc", "incomeYuan", "incomeFishChip"]);
  var incomeCents = archiveUi_pickNumber(raw, ["incomeCents", "income"]);
  if (incomeYc !== null) incomeCents = incomeYc * 100;

  return {
    danmakuCnt: archiveUi_pickNumber(raw, ["danmakuValue", "danmakuCnt", "danmaku", "chatCnt", "chat", "msgCnt"]),
    incomeCents: incomeCents,
    activeUv: archiveUi_pickNumber(raw, ["activeUv", "active", "activeUsers", "activeCount"]),
    chatUv: archiveUi_pickNumber(raw, ["chatUv", "chatUsers", "danmakuUv"]),
    giftUv: archiveUi_pickNumber(raw, ["giftUv", "giftUsers"]),
    enterUv: archiveUi_pickNumber(raw, ["enterUv", "enterUsers"]),
    paidUv: archiveUi_pickNumber(raw, ["paidUv", "paidUsers"]),
    giftCnt: archiveUi_pickNumber(raw, ["giftCnt", "giftCount"]),
    avgPerUser: archiveUi_pickNumber(raw, ["avgPerUser", "avgChat"]),
    lurkRate: archiveUi_pickNumber(raw, ["lurkRate", "lurk"]),
    observedMin: archiveUi_pickNumber(raw, ["observedMin", "observedMinutes"]),
    activeUvIsPersonDay: raw.activeUvIsPersonDay === true
  };
}

function archiveUi_summaryHasCore(summary) {
  if (!summary) return false;
  return archiveUi_isNumber(summary.danmakuCnt) ||
    archiveUi_isNumber(summary.incomeCents) ||
    archiveUi_isNumber(summary.activeUv);
}

/* 数据覆盖率的分子：本机在该房间该窗口内实际观测到的分钟数 */
function archiveUi_pickObservedMin(data) {
  if (!data) return null;
  var observed = data.sum ? archiveUi_pickNumber(data.sum, ["observedMin", "observedMinutes"]) : null;
  /* ArchiveMetrics.summarizeWindow 也会回传 observedMin（它是多日求和的字段之一），
     DB 的 sum 少这一项时用它兜底。 */
  if (observed === null && data.summary) {
    observed = archiveUi_pickNumber(data.summary, ["observedMin", "observedMinutes"]);
  }
  if (observed === null) return null;
  return Math.max(0, observed);
}

/* 数据覆盖率的本地口径（口径由产品钉死，不要自己改）：
 *   今天   : 分母 = 当天 00:00 到现在的分钟数（不足 1 分钟按 1 计）
 *   昨天   : 分母 = 1440（全天）
 *   近 7 天: 分母 = 7 × 1440 = 10080
 *   分母口径：observedMin ÷ 分母 × 100，一位小数 */
function archiveUi_coverageTotalMinutes(windowKey, nowMs) {
  if (windowKey === "yesterday") return ARCHIVE_UI_MINUTES_PER_DAY;
  if (windowKey === "7d") return 7 * ARCHIVE_UI_MINUTES_PER_DAY;

  var now = archiveUi_isNumber(nowMs) ? nowMs : Date.now();
  var date = new Date(now);
  var startOfDay = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  var elapsedMinutes = Math.floor((now - startOfDay.getTime()) / 60000);
  return Math.max(1, elapsedMinutes);
}

function archiveUi_coverageFallback(observedMin, windowKey, nowMs) {
  if (!archiveUi_isNumber(observedMin) || observedMin < 0) return null;
  var total = archiveUi_coverageTotalMinutes(windowKey, nowMs);
  if (!total || total <= 0) return null;
  var percent = (observedMin / total) * 100;
  if (!isFinite(percent)) return null;
  return Math.round(percent * 10) / 10;
}

function archiveUi_resolveCoverage(data) {
  if (!data) return Promise.resolve();
  data.observedMin = archiveUi_pickObservedMin(data);
  if (data.observedMin === null) return Promise.resolve();

  var nowMs = Date.now();
  var metrics = archiveUi_getMetrics();
  var windowKey = data.windowKey;

  var localPercent = archiveUi_coverageFallback(data.observedMin, windowKey, nowMs);
  return archiveUi_callModule(metrics, "coverageOf", [data.observedMin, windowKey, nowMs], null)
    .then(function (percent) {
      if (!archiveUi_isNumber(percent)) {
        data.coveragePercent = localPercent;
        return;
      }
      var normalized = Math.round(percent * 10) / 10;
      /* 口径模块对未知窗口会返回 0（分母算不出来）。分子 > 0 却被算成 0 时
         说明该窗口分支还没落地，改用自己的同口径计算，避免显示谎报的 0.0%。 */
      if (normalized === 0 && archiveUi_isNumber(localPercent) && localPercent > 0) {
        normalized = localPercent;
      }
      data.coveragePercent = normalized;
    });
}

/* --------------------------------------------------------------------------
 * 6. 渲染
 * -------------------------------------------------------------------------- */

function archiveUi_startLiveRefresh() {
  if (ARCHIVE_UI_STATE.liveTimer) return;
  ARCHIVE_UI_STATE.liveTimer = setInterval(function () {
    var panel = ARCHIVE_UI_STATE.panel;
    if (!panel || !archiveUi_isPanelShowing(panel)) {
      archiveUi_stopLiveRefresh();
      return;
    }
    ArchiveUI_refresh();
  }, ARCHIVE_UI_LIVE_REFRESH_MS);
}

function archiveUi_stopLiveRefresh() {
  if (ARCHIVE_UI_STATE.liveTimer) {
    clearInterval(ARCHIVE_UI_STATE.liveTimer);
    ARCHIVE_UI_STATE.liveTimer = 0;
  }
}

function ArchiveUI_refresh() {
  var panel = archiveUi_ensurePanel();
  if (!panel) return Promise.resolve();

  var seq = ++ARCHIVE_UI_STATE.refreshSeq;
  archiveUi_setText(panel, "maintain-note", "刷新中…");

  return archiveUi_gatherData().then(function (data) {
    if (seq !== ARCHIVE_UI_STATE.refreshSeq) return null; /* 过期响应，丢弃 */
    ARCHIVE_UI_STATE.lastData = data;
    archiveUi_renderAll(panel, data);
    return data;
  })["catch"](function (error) {
    if (seq !== ARCHIVE_UI_STATE.refreshSeq) return null;
    ARCHIVE_UI_STATE.lastData = null;
    archiveUi_renderAll(panel, null);
    archiveUi_setText(panel, "maintain-note", "读取失败：" + String((error && error.message) || error || "未知"));
    return null;
  });
}

function archiveUi_renderAll(panel, data) {
  if (!panel) return;
  archiveUi_renderOverview(panel, data);
  archiveUi_renderMaintain(panel, data);
  /* 在线弹幕助手入口：只同步"可用/禁用"这一行状态，不重建任何控件 */
  archiveUi_renderAssistant(panel);
  archiveUi_syncSwitches(panel);
  archiveUi_syncTipDot(data);
}

function archiveUi_syncSwitches(panel) {
  if (!panel) return;
  var buttons = panel.querySelectorAll("[data-window]");
  for (var i = 0; i < buttons.length; i++) {
    if (buttons[i].getAttribute("data-window") === ARCHIVE_UI_STATE.windowKey) {
      buttons[i].classList.add("is-active");
    } else {
      buttons[i].classList.remove("is-active");
    }
  }
}

function archiveUi_syncTipDot(data) {
  var tip = null;
  try {
    tip = document.getElementById("ex-archive__tip");
  } catch (e) {
    tip = null;
  }
  if (!tip) return;
  var hasError = !!(data && data.snapshot && data.snapshot.lastError);
  tip.style.display = hasError ? "block" : "none";
}

/* ① 概览 */
function archiveUi_renderOverview(panel, data) {
  if (!panel) return;
  var summary = data ? data.summary : null;
  var windowKey = ARCHIVE_UI_STATE.windowKey;
  var isSingleDay = archiveUi_isSingleDayWindow(windowKey);

  var danmakuValue = summary ? summary.danmakuCnt : null;
  var incomeCents = summary ? summary.incomeCents : null;
  var activeValue = summary ? summary.activeUv : null;

  archiveUi_setText(panel, "overview-danmaku", summary ? archiveUi_formatCount(danmakuValue) : "未收录");
  archiveUi_setText(panel, "overview-income", summary ? archiveUi_formatFishChip(incomeCents) : "未收录");
  archiveUi_setText(panel, "overview-active", summary ? archiveUi_formatCount(activeValue) : "未收录");

  /* 拿不到数值时单位要一起收起来，否则会读成「未收录条 / 未收录鱼翅」 */
  archiveUi_setNodeVisible(panel, "overview-danmaku-unit", archiveUi_isNumber(danmakuValue));
  archiveUi_setNodeVisible(panel, "overview-income-unit", archiveUi_isNumber(incomeCents));
  archiveUi_setNodeVisible(panel, "overview-active-unit", archiveUi_isNumber(activeValue));

  /* 多日窗口的活跃值是"人·日"（各日去重后相加），必须在 tooltip 里写明 */
  var isPersonDay = summary && summary.activeUvIsPersonDay === true ? true : !isSingleDay;
  archiveUi_setTitle(panel, "metric-active", isPersonDay
    ? "人·日（各日去重后相加，非跨日去重）"
    : "该日发过言或送过礼物的去重人数");
  archiveUi_renderIncomeTooltip(panel, data);

  var chatUv = summary ? summary.chatUv : null;
  var giftUv = summary ? summary.giftUv : null;
  var enterUv = summary ? summary.enterUv : null;

  var average = null;
  if (summary && archiveUi_isNumber(summary.avgPerUser)) {
    average = summary.avgPerUser;
  } else if (archiveUi_isNumber(danmakuValue) && archiveUi_isNumber(chatUv) && chatUv > 0) {
    average = danmakuValue / chatUv;
  }

  archiveUi_setText(panel, "sub-chatuv", "弹幕人数 " + archiveUi_formatCount(chatUv));
  archiveUi_setText(panel, "sub-giftuv", "送礼人数 " + archiveUi_formatCount(giftUv));
  archiveUi_setText(panel, "sub-enteruv", "进场人数 " + archiveUi_formatCount(enterUv));
  archiveUi_setText(panel, "sub-avg", "人均发言 " + (average === null ? "不可用" : archiveUi_formatRatio(average, 1) + " 条"));

  /* 数据覆盖率 */
  var coverageText = data && archiveUi_isNumber(data.coveragePercent)
    ? "数据覆盖率 " + archiveUi_formatPercent(data.coveragePercent)
    : "数据覆盖率 —";
  archiveUi_setText(panel, "coverage-line", coverageText);
  archiveUi_setTitle(panel, "coverage-line", archiveUi_coverageTooltip(windowKey, data));

  archiveUi_renderSampleNote(panel, data);

  archiveUi_setText(panel, "overview-note", archiveUi_overviewNote(data, windowKey));
}

/* --------------------------------------------------------------------------
 * 「在线弹幕助手」入口：只是一个链接，不是可展开区块
 * --------------------------------------------------------------------------
 * 房间号（真 rid）缺失时**禁用**这一行：既不渲染死链，也绝不导航到
 * douyuex.com/undefined。URL 规则直接内置在本包里（2026-10-17 起 Monitor 包已删除，
 * 「在线弹幕助手」不再有自己的胶囊图标与三级面板，只作为数据档案面板里的一项功能存在）。
 */
function archiveUi_assistantUrl() {
  var roomId = "";
  try {
    roomId = archiveUi_currentRid();
  } catch (e) {
    roomId = "";
  }
  if (!roomId || !/^\d{2,12}$/.test(roomId)) return "";
  return "https://www.douyuex.com/" + roomId;
}

function archiveUi_renderAssistant(panel) {
  if (!panel) return;
  var link = panel.querySelector('[data-field="assistant-link"]');
  if (!link) return;
  var url = archiveUi_assistantUrl();
  if (url) {
    link.classList.remove("is-disabled");
    link.setAttribute("data-href", url);
    link.removeAttribute("aria-disabled");
    link.setAttribute("title", "在新标签页打开 " + url);
  } else {
    link.classList.add("is-disabled");
    link.removeAttribute("data-href");
    link.setAttribute("aria-disabled", "true");
    link.setAttribute("title", "未能识别当前房间号，暂不可用");
  }
}

/* 点击入口：openPage 判空 → 没有就退化为 window.open */
function archiveUi_openAssistant() {
  var url = archiveUi_assistantUrl();
  if (!url) return false;
  try {
    if (typeof openPage === "function") {
      openPage(url, true);
      return true;
    }
  } catch (e) { }
  try {
    if (typeof window !== "undefined" && window && typeof window.open === "function") {
      window.open(url, "_blank");
      return true;
    }
  } catch (e2) { }
  return false;
}
/* 抽样提示：只有当前窗口的数据带了 detailSampled=true 才出现，否则整行不渲染（不留空行） */
function archiveUi_renderSampleNote(panel, data) {
  if (!panel) return;
  var sampling = data ? data.sampling : null;
  if (!sampling || sampling.sampled !== true) {
    archiveUi_setText(panel, "sample-note", "");
    archiveUi_setNodeVisible(panel, "sample-note", false);
    return;
  }
  var keptText = archiveUi_isNumber(sampling.kept) ? String(Math.round(sampling.kept)) : "未知";
  var droppedText = archiveUi_isNumber(sampling.dropped) ? String(Math.round(sampling.dropped)) : "未知";
  archiveUi_setText(panel, "sample-note",
    "该窗口明细为抽样（保留 " + keptText + " 条 / 丢弃 " + droppedText + " 条），弹幕值等统计仍为全量精确");
  archiveUi_setNodeVisible(panel, "sample-note", true);
}

function archiveUi_coverageTooltip(windowKey, data) {
  var total = archiveUi_coverageTotalMinutes(windowKey, Date.now());
  var share;
  if (windowKey === "day") {
    share = "今天 00:00 至今共 " + total + " 分钟";
  } else if (windowKey === "yesterday") {
    share = "昨天全天共 " + total + " 分钟";
  } else {
    share = archiveUi_windowLabel(windowKey) + "共 " + total + " 分钟（" + (ARCHIVE_UI_WINDOW_DAY_COUNTS[windowKey] || 1) + " × 1440）";
  }
  var observed = data && archiveUi_isNumber(data.observedMin) ? data.observedMin : null;
  var observedText = observed === null ? "本机观测分钟数未收录" : "本机实际观测 " + observed + " 分钟";
  return "数据覆盖率 = 本机观测分钟数 ÷ 窗口总分钟数。" + share + "；" + observedText + "。";
}

function archiveUi_overviewNote(data, windowKey) {
  if (!data) return "本地档案不可用";
  if (data.ridMissing) return "未能识别当前房间号，无法读取本地档案";
  if (data.dbMissing) return "ArchiveDB 未就绪：本地档案不可用";
  var windowLabel = archiveUi_windowLabel(windowKey);
  if (!data.sourcesReady) {
    return archiveUi_isSingleDayWindow(windowKey)
      ? windowLabel + "尚未收录本房间数据"
      : "多日窗口需要 ArchiveDB.sumRoomDays（尚未就绪），暂不可用";
  }
  if (!data.summary) return windowLabel + "尚未收录本房间数据";
  if (data.usedDayFallback) return "数据来自单日档案（sumRoomDays 尚未就绪）";
  return windowKey === "day" ? "收入值为估算值（Σ 份数 × 单价）" : windowLabel + "口径；收入值为估算值";
}

/* --------------------------------------------------------------------------
 * 收入值拆解：礼物 / 钻粉折算 / 单价未知次数 / 道具订单实付
 * --------------------------------------------------------------------------
 * 采集侧在 room_day 上写 dfMonths / dfCents / orderCents（unknownGiftCnt 早就有），
 * sumRoomDays 的 sum 会把它们带过来；这里多源兜底读取，缺字段就整行不渲染。
 * 注意：**主数字不动**，收入值仍然只等于 incomeCents；订单实付只是另起一行说明。
 */
function archiveUi_pickBreakdown(data) {
  var sources = [];
  if (data) {
    if (data.summary && typeof data.summary === "object") sources.push(data.summary);
    if (data.sum && typeof data.sum === "object") sources.push(data.sum);
    if (Object.prototype.toString.call(data.days) === "[object Array]") {
      for (var i = 0; i < data.days.length; i++) {
        if (data.days[i] && typeof data.days[i] === "object") sources.push(data.days[i]);
      }
    }
  }
  var pick = function (keys) {
    for (var s = 0; s < sources.length; s++) {
      var value = archiveUi_pickNumber(sources[s], keys);
      if (value !== null) return value;
    }
    return null;
  };
  return {
    dfMonths: pick(["dfMonths"]),
    dfCents: pick(["dfCents"]),
    orderCents: pick(["orderCents"]),
    unknownGiftCnt: pick(["unknownGiftCnt", "unknownGiftCount"])
  };
}

/* 鱼翅金额，整数部分带千分位（3,120.5） */
function archiveUi_formatFishChipGrouped(cents) {
  if (!archiveUi_isNumber(cents)) return "不可用";
  var text = (cents / 100).toFixed(1);
  var parts = text.split(".");
  var intPart = parts[0];
  var sign = "";
  if (intPart.charAt(0) === "-") {
    sign = "-";
    intPart = intPart.substring(1);
  }
  var grouped = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  return sign + grouped + "." + parts[1];
}

function archiveUi_renderIncomeTooltip(panel, data) {
  if (!panel) return;
  var summary = data ? data.summary : null;
  var incomeCents = summary ? summary.incomeCents : null;
  if (!archiveUi_isNumber(incomeCents)) {
    archiveUi_setTitle(panel, "metric-income", "");
    return;
  }

  var breakdown = archiveUi_pickBreakdown(data);
  var dfMonths = breakdown.dfMonths;
  var dfCents = breakdown.dfCents;
  var showDf = archiveUi_isNumber(dfMonths) && dfMonths > 0 && archiveUi_isNumber(dfCents);

  /* 收入值 = 礼物 + 钻粉折算（+ 高能弹幕）；展示时把钻粉摘出来，剩下的记作"礼物" */
  var giftCents = incomeCents - (showDf ? dfCents : 0);
  if (giftCents < 0) giftCents = incomeCents;

  var lines = ["收入值为估算值（Σ 份数 × 单价）"];
  lines.push("· 礼物 " + archiveUi_formatFishChipGrouped(giftCents) + " 鱼翅");
  if (showDf) {
    lines.push("· 钻粉折算 " + archiveUi_formatFishChipGrouped(dfCents) +
      " 鱼翅（" + dfMonths + " 个月；按连续包月 " + ARCHIVE_UI_DF_MONTH3_YUAN +
      " 元/月、12 个月档 " + ARCHIVE_UI_DF_YEAR_YUAN + " 元/月折算；单月直购 " +
      ARCHIVE_UI_DF_SINGLE_YUAN + " 元极少见，不采用）");
  }
  if (archiveUi_isNumber(breakdown.unknownGiftCnt) && breakdown.unknownGiftCnt > 0) {
    lines.push("· " + breakdown.unknownGiftCnt + " 次礼物单价未知（未计入）");
  }
  archiveUi_setTitle(panel, "metric-income", lines.join("\n"));
}

/* ② 维护 */
function archiveUi_renderMaintain(panel, data) {
  if (!panel) return;
  var stats = data ? data.stats : null;
  var statsUsable = !!stats && stats.ok !== false;
  var bytesText = statsUsable ? archiveUi_formatBytes(archiveUi_pickNumber(stats, ["bytes"])) : "";
  var rooms = statsUsable ? archiveUi_pickNumber(stats, ["rooms"]) : null;

  var retention;
  if (statsUsable && bytesText && archiveUi_isNumber(rooms)) {
    retention = "已留存数据：已用体积 " + bytesText + " · 房间数 " + Math.round(rooms);
  } else {
    retention = "已留存数据：不可用";
  }
  archiveUi_setText(panel, "maintain-retention", retention);

  var error = data && data.snapshot && data.snapshot.lastError ? String(data.snapshot.lastError) : "";
  archiveUi_setText(panel, "maintain-note", error ? "最近错误：" + error : "");
  archiveUi_setNodeVisible(panel, "maintain-note", !!error);

  /* 道具/套装订单实付：**不并入**上面的收入值，只是另起一行说明（有值才显示） */
  var orderCents = data ? archiveUi_pickBreakdown(data).orderCents : null;
  if (archiveUi_isNumber(orderCents) && orderCents > 0) {
    archiveUi_setText(panel, "order-note",
      "另有道具订单实付 " + archiveUi_formatFishChipGrouped(orderCents) + " 鱼翅（未并入收入值）");
    archiveUi_setNodeVisible(panel, "order-note", true);
  } else {
    archiveUi_setText(panel, "order-note", "");
    archiveUi_setNodeVisible(panel, "order-note", false);
  }
}

/* --------------------------------------------------------------------------
 * 7. 维护动作：清理 / 导出
 * -------------------------------------------------------------------------- */

function archiveUi_confirm(message) {
  try {
    if (typeof confirm === "function") return !!confirm(message);
  } catch (e) { }
  try {
    if (typeof window !== "undefined" && window && typeof window.confirm === "function") {
      return !!window.confirm(message);
    }
  } catch (e2) { }
  return false;
}

function archiveUi_clearArchive() {
  var db = archiveUi_getDB();
  if (!db || typeof db.clearAll !== "function") {
    archiveUi_notify("本地档案不可用，无法清理", "error");
    return;
  }
  if (!archiveUi_confirm("确定清理本地档案吗？\n\n将删除本机已归档的全部房间/事件/用户数据，此操作不可恢复。")) {
    return;
  }
  var panel = ARCHIVE_UI_STATE.panel;
  archiveUi_setText(panel, "maintain-note", "正在清理…");
  archiveUi_setNodeVisible(panel, "maintain-note", true);
  archiveUi_callModule(db, "clearAll", [], { ok: false }).then(function (result) {
    var ok = !!(result && result.ok);
    archiveUi_notify(ok ? "本地档案已清理" : "清理未完成（可查看面板上的最近错误）", ok ? "success" : "error");
    return ArchiveUI_refresh();
  });
}

function archiveUi_exportCsv() {
  var data = ARCHIVE_UI_STATE.lastData;
  if (!data) {
    archiveUi_notify("暂无数据可导出", "error");
    return;
  }
  var summary = data.summary || {};
  var windowKey = data.windowKey || "day";
  var header = ["指标", "值"];
  var body = [
    ["房间号", data.rid || "未知"],
    ["窗口", archiveUi_windowLabel(windowKey) + "（" + data.fromDayKey + " ~ " + data.toDayKey + "）"],
    ["弹幕值(条)", archiveUi_formatCount(summary.danmakuCnt)],
    ["收入值(鱼翅)", archiveUi_formatFishChip(summary.incomeCents)],
    ["活跃值(人)", archiveUi_formatCount(summary.activeUv)],
    ["弹幕人数", archiveUi_formatCount(summary.chatUv)],
    ["送礼人数", archiveUi_formatCount(summary.giftUv)],
    ["进场人数", archiveUi_formatCount(summary.enterUv)],
    ["人均发言", summary.avgPerUser === null || summary.avgPerUser === undefined ? "不可用" : archiveUi_formatRatio(summary.avgPerUser, 1)],
    ["数据覆盖率", archiveUi_isNumber(data.coveragePercent) ? archiveUi_formatPercent(data.coveragePercent) : "不可用"]
  ];

  var fileName = "数据档案_" + (data.rid || "room") + "_" + windowKey + "_" + data.toDayKey;

  /* 优先复用公共导出（XLSX）；缺失或抛错时退化为 CSV Blob 下载 */
  try {
    if (typeof exportJsonToExcel === "function") {
      exportJsonToExcel(header, body, fileName + ".xlsx");
      archiveUi_notify("已导出 " + fileName + ".xlsx", "success");
      return;
    }
  } catch (e) { }

  if (archiveUi_downloadCsv(fileName + ".csv", header, body)) {
    archiveUi_notify("已导出 " + fileName + ".csv", "success");
  } else {
    archiveUi_notify("当前环境不支持导出", "error");
  }
}

function archiveUi_toCsvText(header, body) {
  var lines = [];
  var escapeCell = function (cell) {
    var text = cell === undefined || cell === null ? "" : String(cell);
    if (text.indexOf('"') !== -1) text = text.replace(/"/g, '""');
    if (text.indexOf(",") !== -1 || text.indexOf('"') !== -1 || text.indexOf("\n") !== -1) {
      return '"' + text + '"';
    }
    return text;
  };
  lines.push(header.map(escapeCell).join(","));
  for (var i = 0; i < body.length; i++) lines.push(body[i].map(escapeCell).join(","));
  return lines.join("\r\n");
}

function archiveUi_downloadCsv(fileName, header, body) {
  try {
    var text = archiveUi_toCsvText(header, body);
    var blob = new Blob(["\ufeff" + text], { type: "text/csv;charset=utf-8" });
    var url = null;
    try {
      url = (typeof URL !== "undefined" && URL && typeof URL.createObjectURL === "function")
        ? URL.createObjectURL(blob) : null;
    } catch (e) {
      url = null;
    }
    if (!url) return false;

    var link = document.createElement("a");
    link.href = url;
    link.download = fileName;
    link.style.display = "none";
    if (document.body) document.body.appendChild(link);
    link.click();
    setTimeout(function () {
      try {
        if (link.parentNode) link.parentNode.removeChild(link);
        URL.revokeObjectURL(url);
      } catch (e2) { }
    }, 1500);
    return true;
  } catch (e) {
    return false;
  }
}

/* --------------------------------------------------------------------------
 * 8. 窗口切换
 * -------------------------------------------------------------------------- */

function ArchiveUI_setWindow(windowKey) {
  var next = archiveUi_isWindowKey(windowKey) ? windowKey : "day";
  if (ARCHIVE_UI_STATE.windowKey === next) return;
  ARCHIVE_UI_STATE.windowKey = next;
  ArchiveUI_refresh();
}

/* --------------------------------------------------------------------------
 * 9. 对外入口
 * -------------------------------------------------------------------------- */

function ArchiveUI_init() {
  ARCHIVE_UI_STATE.inited = true;
  var placed = archiveUi_insertDockNode(false);
  archiveUi_startDockPoll();
  return placed;
}

var ArchiveUI = {
  init: ArchiveUI_init,
  open: ArchiveUI_open,
  refresh: ArchiveUI_refresh,
  hide: ArchiveUI_hide,
  setWindow: ArchiveUI_setWindow,
  state: ARCHIVE_UI_STATE
};
