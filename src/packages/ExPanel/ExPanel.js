let ExPanel_anchorParent = null;
let ExPanel_anchorNextSibling = null;

/* 三级面板统一清单：× 收起、精灵球「全部收敛」、激活指示器都认这一份，
 * 以后新增面板只改这里，不会再出现"某个出口漏掉一个面板"。 */
const EX_THIRD_LEVEL_PANELS = ".sign-panel, .fans-continue-panel, .fans-panel, .extool, .livetool, .bloop, .exlottery, .popup-player-panel, .exupdate-panel, .danmaku-history-panel";

/* ==================== 点击菜单外部自动关闭 ====================
 * 用户要求（2026-11-01）：点菜单外面的任何位置，把二级 / 三级 / 子菜单一次性收掉。
 * 判定靠一份「菜单面」清单 —— 点中其中任意一项（或它们的子孙）算点在菜单里，
 * 点在其它任何地方就算点外面。三级面板直接从 EX_THIRD_LEVEL_PANELS 拆出来，
 * 以后新增面板只改上面那一份，这里不会漏登记。
 */
const EX_MENU_SURFACE_EXTRA = [
  ".ex-panel",                      /* 二级胶囊菜单（工具条本体） */
  ".ex-icon",                       /* 一级精灵球：展开 / 全部收敛的开关 */
  ".ChatToolBar-DanmakuTail-Panel", /* 弹幕小尾巴面板 */
  "#ex-vtoolbar-menu",              /* 视频工具条上的 DouyuEx 菜单 */
  ".ex-gift-picker-modal",          /* 扩展功能里再打开的礼物选择器 */
  ".ex-gift-picker-mask",           /* 它的遮罩：点遮罩由选择器自己收，不连带收走原有面板 */
  ".ex-pip-menu-root",              /* 加强版画中画菜单 */
  "[data-ex-menu-layer]"            /* 运行期追加的次级菜单层（ExPanel_markMenuLayer 打标记） */
];

/** 菜单面总清单：二级胶囊 + 全部三级面板 + 之后任何一层子菜单 */
const EX_MENU_SURFACE_SELECTOR = EX_MENU_SURFACE_EXTRA
  .concat(EX_THIRD_LEVEL_PANELS.split(","))
  .map(function (s) { return String(s).trim(); })
  .filter(function (s) { return !!s; })
  .join(", ");

/* 「开关」不是菜单面：点它们要交给自己的展开 / 收起逻辑，
 * 不能被"点外面"抢先一步收掉（否则同一次点击会变成"先关再开"，看起来像点了没反应）。 */
const EX_MENU_TRIGGER_SELECTOR = ".ex-icon, .ChatToolBar-DanmakuTail";

/** 一次收起所有三级面板（二级菜单的 × 与点精灵球共用） */
function ExPanel_closeAllThirdLevel() {
  const panels = document.querySelectorAll(EX_THIRD_LEVEL_PANELS);
  for (let i = 0; i < panels.length; i++) {
    const p = panels[i];
    p.style.removeProperty("display");
    p.style.setProperty("display", "none", "important");
    p.classList.remove("miuix-modal-in");
  }
  if (typeof updateDockActiveIndicator === "function") {
    updateDockActiveIndicator();
  }
  return panels.length;
}

function isAnyThirdLevelPanelOpen() {
  const panels = document.querySelectorAll(EX_THIRD_LEVEL_PANELS);
  for (let i = 0; i < panels.length; i++) {
    const p = panels[i];
    let isShowing = p.style.display === "flex" || p.style.display === "block" || (window.getComputedStyle(p).display !== "none" && p.style.display !== "none");
    if (isShowing) {
      return true;
    }
  }
  return false;
}

function initPkg_ExPanel() {
  initPkg_ExPanel_insertDom();

  // 二级菜单生命周期完全由用户驱动：仅「点击精灵球」展开、「点击 ×」或「点菜单外面」关闭，
  // 不悬停自动打开、不因鼠标移出而自动关闭。
  let exPanelDOM = document.querySelector(`.ex-panel`);
  if (exPanelDOM) {
    const closeBtn = exPanelDOM.querySelector(".ex-panel__close");
    if (closeBtn) {
      closeBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        ExPanel_closeAllMenus();
      });
    }
  }

  ExPanel_startSelfHeal();
  ExPanel_bindClickOutside();
}

/* ==================== 点击菜单外部自动关闭 ==================== */
/* 用 var 不用 let：产物是「所有包拼进同一个作用域」的一份脚本，任何人都可能在声明语句执行前
 * 就调到 ExPanel_bindClickOutside()，let 会在这里撞 TDZ 把整根脚本掐断（ExGuard 那次事故同款）。
 * var 在脚本启动时就存在（值 undefined，判假），最多是多绑一次，绝不会抛。 */
var ExPanel_outsideClickBound = false;

/** 事件 target 可能是文本节点，统一归一到元素节点 */
function ExPanel_elementOf(node) {
  if (!node) return null;
  if (node.nodeType === 1) return node;
  return node.parentElement || null;
}

/** 节点是否落在 selector 命中的元素里（含自身） */
function ExPanel_matchesAny(node, selector) {
  const el = ExPanel_elementOf(node);
  if (!el || typeof el.closest !== "function") return false;
  try {
    return !!el.closest(selector);
  } catch (e) {
    return false;
  }
}

/** 这次点击算不算「点在菜单里」：菜单面本身 / 它的子孙 / 开关按钮都算 */
function ExPanel_isInsideMenu(node) {
  return ExPanel_matchesAny(node, EX_MENU_SURFACE_SELECTOR) || ExPanel_matchesAny(node, EX_MENU_TRIGGER_SELECTOR);
}

/**
 * 面板里再开出来的子菜单（下拉、选择器、弹层）打上这个标记，
 * 之后点它内部就不会被当成「点菜单外面」。返回传入的节点，方便链式调用。
 */
function ExPanel_markMenuLayer(node) {
  if (!node || node.nodeType !== 1 || typeof node.setAttribute !== "function") return node || null;
  node.setAttribute("data-ex-menu-layer", "1");
  return node;
}

/** 此刻是否还有任意一层菜单展开着（二级 / 三级 / 子菜单层） */
function ExPanel_hasOpenMenu() {
  const dock = document.querySelector(".ex-panel");
  if (dock && (dock.style.display === "flex" || dock.style.display === "block")) return true;
  if (isAnyThirdLevelPanelOpen()) return true;
  const layers = document.querySelectorAll("[data-ex-menu-layer]");
  for (let i = 0; i < layers.length; i++) {
    if (ExPanel_panelIsShown(layers[i])) return true;
  }
  return false;
}

/**
 * 一次收起整套菜单：三级面板 + 运行期子菜单层 + 二级胶囊菜单。
 * 「点菜单外面」、精灵球的「全部收敛」、二级菜单的 × 都走这一个出口，
 * 以后新增层只要登记进 EX_MENU_SURFACE_EXTRA，三条出口自动跟上。
 */
function ExPanel_closeAllMenus() {
  let closed = ExPanel_closeAllThirdLevel();

  const layers = document.querySelectorAll("[data-ex-menu-layer]");
  for (let i = 0; i < layers.length; i++) {
    const layer = layers[i];
    if (!ExPanel_panelIsShown(layer)) continue;
    layer.style.removeProperty("display");
    layer.style.setProperty("display", "none", "important");
    layer.classList.remove("miuix-modal-in");
    closed++;
  }

  const dock = document.querySelector(".ex-panel");
  if (dock && (dock.style.display === "flex" || dock.style.display === "block")) {
    hideExPanel();
    closed++;
  }

  if (typeof updateDockActiveIndicator === "function") updateDockActiveIndicator();
  return closed;
}

/**
 * 用 mousedown 的捕获阶段判定，而不是 click：
 * 捕获阶段动手时，本次点击自己的 click 处理器还一次都没跑 ——
 * 「点在别处 → 先收菜单 → 目标自己的 click 再打开新面板」这个顺序天然成立，
 * 不会出现「刚点开的面板被同一次点击立刻收掉」。
 * 另外按下在菜单里、拖到外面松手（框选 / 拖拽）也不会被误判成点外面。
 */
function ExPanel_onMenuOutsideMouseDown(e) {
  if (!e) return;
  if (typeof e.button === "number" && e.button !== 0) return; // 只认左键
  if (ExPanel_isInsideMenu(e.target)) return;
  if (!ExPanel_hasOpenMenu()) return;
  ExPanel_closeAllMenus();
}

function ExPanel_bindClickOutside() {
  if (ExPanel_outsideClickBound) return;
  if (typeof document === "undefined" || !document || !document.addEventListener) return;
  ExPanel_outsideClickBound = true;
  document.addEventListener("mousedown", ExPanel_onMenuOutsideMouseDown, true);
}

/* ==================== Dock 自愈 ====================
 * 症状（用户报障）：工具条"加载出来后刷新又消失"，且再也回不来 —— 连精灵球都找不到。
 * 根因：Dock 只在 initPkg_ExPanel 里插一次，插入点是播放器礼物流水条的单元格，
 * 而那是页面框架自己渲染的区域；框架重绘时把整个单元格换掉，Dock 随之脱离文档，
 * 此后没有任何代码再把它插回去（精灵球在 Dock 内部，所以用户连"点一下让它出来"都做不到）。
 *
 * ⚠ 自愈只能"搬回原节点"，绝不能重建：九个按钮是九个包在各自 init 里插进去的
 * （Sign_insertIcon 之类都不做去重，重建后调用会得到重复图标），而且按钮上的事件绑定
 * 都在节点上。框架摘掉的是 DOM 位置，节点对象本身还活着、子节点与监听器都在，
 * 所以把它原样挂回就是完整恢复。
 */
let ExPanel_dockNode = null;
let ExPanel_healTimer = 0;

/* 巡检节奏：健康时逐次降档，一旦真的搬回就立刻回到快速档。
 * —— 旧实现是 setInterval(…, 3000) 永不停止、也不判可见性：整场直播每 3 秒摸一次 DOM，
 *    后台页签照跑。现在改成 setTimeout 链（换档不需要重开定时器）+ 两档节流 + 后台跳过；
 *    降档只降"没事可做"的巡检频率，页面真重绘时它仍会在一分钟内发现并搬回。 */
const EXPANEL_HEAL_FAST_MS = 3000;
const EXPANEL_HEAL_SLOW_MS = 30000;
const EXPANEL_HEAL_QUIET_TICKS = 20; // 连续 20 次（≈60 秒）都无事 → 降到 30 秒一档
let ExPanel_healCadence = EXPANEL_HEAL_FAST_MS;
let ExPanel_healQuietTicks = 0;

function ExPanel_startSelfHeal() {
  if (ExPanel_healTimer) return;
  ExPanel_healCadence = EXPANEL_HEAL_FAST_MS;
  ExPanel_healQuietTicks = 0;
  ExPanel_healTimer = setInterval(ExPanel_healTick, ExPanel_healCadence);
}

/** 停表（页面切走 / 测试收尾用） */
function ExPanel_stopSelfHeal() {
  if (!ExPanel_healTimer) return;
  clearInterval(ExPanel_healTimer);
  ExPanel_healTimer = 0;
}

/** 换档：只有档位真的变了才重开定时器（每个 tick 都重建会把定时器句柄抖没） */
function ExPanel_applyHealCadence(ms) {
  ExPanel_healCadence = ms;
  if (!ExPanel_healTimer) return;
  clearInterval(ExPanel_healTimer);
  ExPanel_healTimer = setInterval(ExPanel_healTick, ExPanel_healCadence);
}

function ExPanel_healTick() {
  // 后台页签不巡检：用户看不见，浏览器本来就在节流定时器，搬回去也没有意义。
  // 定时器本身留着（回到前台立刻恢复巡检），只是这一跳不摸 DOM。
  if (document.hidden) return;
  let healed = false;
  try {
    healed = ExPanel_healDock();
  } catch (e) {
    if (typeof ExGuard_warn === "function") ExGuard_warn("工具条", "自愈巡检抛错（本次跳过，下轮继续）", e);
  }
  if (healed) {
    ExPanel_healQuietTicks = 0;
    if (ExPanel_healCadence !== EXPANEL_HEAL_FAST_MS) ExPanel_applyHealCadence(EXPANEL_HEAL_FAST_MS);
    return;
  }
  if (ExPanel_healQuietTicks < EXPANEL_HEAL_QUIET_TICKS) {
    ExPanel_healQuietTicks++;
    if (ExPanel_healQuietTicks >= EXPANEL_HEAL_QUIET_TICKS) ExPanel_applyHealCadence(EXPANEL_HEAL_SLOW_MS);
  }
}

/**
 * 巡检一次：真的动过 DOM（搬回 / 归位 / 采纳新节点）返回 true。
 * 定时器换档用它判断"这一跳有没有干活"，对外契约仍由下面的 ExPanel_ensureAttached() 保持。
 */
function ExPanel_healDock() {
  // 切房 / 框架重绘可能连 Dock 本体一起换掉：页面里已经有一个"不是我们记的那个" .ex-panel 时，
  // 以页面里那个为准 —— 否则我们会把旧节点再插进新页面，变成两套工具条
  //（旧那套的按钮事件还都绑在上面，用户点了会得到莫名其妙的结果）。
  const liveDock = document.querySelector(".ex-panel");
  if (liveDock && liveDock !== ExPanel_dockNode) {
    ExPanel_dockNode = liveDock;
    ExPanel_saveAnchor(liveDock);
  }
  const node = ExPanel_dockNode;
  if (!node) return false;
  if (document.contains(node)) {
    // 归位巡检：上一次是被搬进"浮动宿主"的（当时礼物流水条不可用），
    // 现在锚点回来了就搬回原位 —— 旧实现只看 document.contains，浮动状态会一直挂到用户刷新。
    if (node.classList.contains("ex-panel--floating")) {
      const anchorNow = ExPanel_getGiftBarAnchor();
      if (anchorNow && !ExPanel_isGiftBarHidden()) {
        ExPanel_restoreToGiftBar();
        if (typeof ensureDockIndicators === "function") ensureDockIndicators();
        console.warn("[DouyuEx] 工具条已从浮动状态归位到礼物流水条");
        return true;
      }
    }
    return false;
  }

  // 已经脱离文档：按当前页面状态挑宿主挂回去（礼物流水条优先，否则回浮动态）
  const anchor = ExPanel_getGiftBarAnchor();
  if (anchor && !ExPanel_isGiftBarHidden()) {
    anchor.insertBefore(node, anchor.childNodes[0]);
    node.classList.remove("ex-panel--floating");
    node.style.removeProperty("position");
    node.style.removeProperty("left");
    node.style.removeProperty("right");
    node.style.removeProperty("top");
    if (typeof ensureDockIndicators === "function") ensureDockIndicators();
  } else {
    ExPanel_getFloatingHost().appendChild(node);
    node.classList.add("ex-panel--floating");
    ExPanel_updateFloatingPosition();
    if (typeof ensureDockIndicators === "function") ensureDockIndicators();
  }
  console.warn("[DouyuEx] 工具条被页面重绘移除，已重新挂回（按钮与事件原样保留）");
  return true;
}

/** 对外契约不变：Dock 现在是否挂在文档里（老调用方与既有测试都按这个语义用） */
function ExPanel_ensureAttached() {
  ExPanel_healDock();
  return !!(ExPanel_dockNode && document.contains(ExPanel_dockNode));
}

function ExPanel_getGiftBarAnchor() {
  return document.querySelector(".PlayerToolbar-ContentCell .PlayerToolbar-Wealth")
    || document.querySelector(".PlayerToolbar-ContentRow");
}

function ExPanel_isGiftBarHidden() {
  const row = document.getElementsByClassName("PlayerToolbar-ContentRow")[0];
  return !!(row && row.style.visibility === "hidden");
}

function ExPanel_getFloatingHost() {
  return document.getElementById("js-player-dialog")
    || document.getElementsByClassName("room-Player-Box")[0]
    || document.body;
}

function ExPanel_saveAnchor(panel) {
  if (!ExPanel_anchorParent) {
    ExPanel_anchorParent = panel.parentNode;
    ExPanel_anchorNextSibling = panel.nextSibling;
  }
}

function ExPanel_updateFloatingPosition() {
  const panel = document.querySelector(".ex-panel.ex-panel--floating");
  if (!panel) return;
  const playerToolbar = document.getElementById("js-player-toolbar");
  const vtoolbarMenu = document.getElementById("ex-vtoolbar-menu");
  const gap = 8;
  panel.style.position = "fixed";
  panel.style.top = "auto";

  if (vtoolbarMenu) {
    const menuRect = vtoolbarMenu.getBoundingClientRect();
    panel.style.bottom = `${window.innerHeight - menuRect.top + gap}px`;
    const panelWidth = panel.offsetWidth || panel.scrollWidth || 360;
    let left = menuRect.left + menuRect.width / 2 - panelWidth / 2;
    left = Math.max(8, Math.min(left, window.innerWidth - panelWidth - 8));
    panel.style.left = `${left}px`;
    panel.style.right = "auto";
  } else if (playerToolbar) {
    const toolbarRect = playerToolbar.getBoundingClientRect();
    panel.style.bottom = `${window.innerHeight - toolbarRect.top + gap}px`;
    const panelWidth = panel.offsetWidth || panel.scrollWidth || 360;
    let left = toolbarRect.left + toolbarRect.width / 2 - panelWidth / 2;
    left = Math.max(8, Math.min(left, window.innerWidth - panelWidth - 8));
    panel.style.left = `${left}px`;
    panel.style.right = "auto";
  } else {
    panel.style.bottom = "76px";
    panel.style.right = "12px";
    panel.style.left = "";
  }
}

function ExPanel_attachToFloatingHost() {
  const panel = document.querySelector(".ex-panel");
  if (!panel || panel.classList.contains("ex-panel--floating")) {
    ExPanel_updateFloatingPosition();
    return;
  }
  ExPanel_saveAnchor(panel);
  ExPanel_getFloatingHost().appendChild(panel);
  panel.classList.add("ex-panel--floating");
  ExPanel_updateFloatingPosition();
}

function ExPanel_restoreToGiftBar() {
  const panel = document.querySelector(".ex-panel");
  const anchor = ExPanel_getGiftBarAnchor();
  if (!panel || !anchor || !panel.classList.contains("ex-panel--floating")) {
    return;
  }
  if (ExPanel_anchorNextSibling && ExPanel_anchorNextSibling.parentNode === anchor) {
    anchor.insertBefore(panel, ExPanel_anchorNextSibling);
  } else {
    anchor.insertBefore(panel, anchor.childNodes[0]);
  }
  panel.classList.remove("ex-panel--floating");
}

function ExPanel_syncHost() {
  if (ExPanel_isGiftBarHidden()) {
    ExPanel_attachToFloatingHost();
  } else {
    ExPanel_restoreToGiftBar();
  }
}

function ExPanel_onGiftBarHide() {
  const panel = document.querySelector(".ex-panel");
  if (panel && panel.style.display === "block") {
    ExPanel_attachToFloatingHost();
    ExPanel_updateFloatingPosition();
  }
}

function ExPanel_onGiftBarShow() {
  ExPanel_restoreToGiftBar();
}

function initPkg_ExPanel_insertDom() {
  let a = document.createElement("div");
  a.className = "ex-panel";
  a.innerHTML = `<button type="button" class="ex-panel__close" title="关闭工具条" aria-label="关闭 DouyuEx 工具条">×</button><div class="ex-panel__wrap"></div>`;

  let b = ExPanel_getGiftBarAnchor();
  if (!b) {
    b = ExPanel_getFloatingHost();
    a.classList.add("ex-panel--floating");
  } else {
    const domPlayerToolbar = document.querySelector(".PlayerToolbar");
    if (domPlayerToolbar) {
      a.style.bottom = (domPlayerToolbar.offsetHeight + 4) + "px";
    } else {
      a.style.bottom = "76px";
    }
  }
  b.insertBefore(a, b.childNodes[0]);
  // 记住 Dock 节点本体：页面重绘把它摘掉后，自愈要靠这个引用把它原样搬回来
  ExPanel_dockNode = a;
  ExPanel_saveAnchor(a);
  if (ExPanel_isGiftBarHidden()) {
    ExPanel_attachToFloatingHost();
  }
}

function ensureDockIndicators() {
  let dockWrap = document.querySelector(".ex-panel__wrap");
  if (!dockWrap) return;

  const mapping = {
    "ex-sign": "一键签到",
    "fans-continue": "一键续牌",
    "extool-icon": "扩展功能",
    "livetool-icon": "直播间工具",
    "bloop-icon": "弹幕发送小助手",
    "ex-lottery": "全站抽奖信息",
    "exlottery-icon": "全站抽奖信息",
    "popup-player": "同屏播放",
    "ex-update": "版本更新"
  };

  dockWrap.querySelectorAll(":scope > div").forEach((btn) => {
    if (!btn.querySelector(".ex-panel__indicator")) {
      let ind = document.createElement("span");
      ind.className = "ex-panel__indicator";
      btn.appendChild(ind);
    }

    if (!btn.dataset.hoverBound) {
      btn.dataset.hoverBound = "1";
      btn.style.cursor = "pointer";
      btn.addEventListener("mouseenter", () => {
        for (let cls in mapping) {
          if (btn.classList.contains(cls)) {
            if (typeof showExRightPanel === "function") {
              showExRightPanel(mapping[cls], btn, true);
            }
            break;
          }
        }
      });
    }
  });
}

/* ==================== Dock 激活指示器 ====================
 * 八个 Dock 按钮的「展开态」原先只有一半：openMiuixPanelCentered 会给当前按钮加上
 * is-active / ex-dock-active（CSS 据此点亮图标底部那枚 24×4 蓝色小条），但全项目没有任何地方
 * 把它摘下来；而所有关闭出口调用的 updateDockActiveIndicator() 根本没有定义 —— 那些调用
 * （Sign / DanmakuHistory / PopupPlayer / 二级菜单 ×、面板 ×）其实全是空操作。
 * 于是图标底下的蓝条一旦亮起就永远亮着，看不出面板到底开没开。
 * 这里补齐：按「面板此刻是否真的显示着」逐个按钮复位，打开与关闭两侧都调它。
 */
const EX_DOCK_PANEL_MAP = [
  ["ex-sign", ".sign-panel"],
  ["fans-continue", ".fans-continue-panel"],
  ["extool-icon", ".extool"],
  ["livetool-icon", ".livetool"],
  ["bloop-icon", ".bloop"],
  ["ex-lottery", ".exlottery"],
  ["exlottery-icon", ".exlottery"],
  ["popup-player", ".popup-player-panel"],
  ["ex-update", ".exupdate-panel"],
  ["danmaku-history", ".danmaku-history-panel"]
];

function ExPanel_panelIsShown(el) {
  if (!el) return false;
  const d = el.style.display;
  if (d === "flex" || d === "block") return true;
  if (d === "none") return false;
  try { return window.getComputedStyle(el).display !== "none"; } catch (e) { return false; }
}

function updateDockActiveIndicator() {
  const dockWrap = document.querySelector(".ex-panel__wrap");
  if (!dockWrap) return;
  EX_DOCK_PANEL_MAP.forEach(function (pair) {
    const btn = dockWrap.querySelector(":scope > div." + pair[0]);
    if (!btn) return;
    const on = ExPanel_panelIsShown(document.querySelector(pair[1]));
    btn.classList.toggle("is-active", on);
    btn.classList.toggle("ex-dock-active", on);
  });
}

function openExPanel() {
  let a = document.getElementsByClassName("ex-panel")[0];
  if (!a) return;
  ExPanel_syncHost();
  ensureDockIndicators();
  // 「收起动画还没走完就又被点开」必须真的重新展开：hideExPanel 的 display:none 要等 160ms 才落地，
  // 旧判断只看 display，这中间点精灵球会变成"再收一次"，用户看到的是点了没反应。
  const pendingClose = a.classList.contains("miuix-dock-out");
  let isShown = a.style.display === "flex" || a.style.display === "block";
  if (isShown && !pendingClose) return;
  a.classList.remove("miuix-dock-out");
  a.classList.add("miuix-dock-in");
  a.style.display = "flex";
  if (a.classList.contains("ex-panel--floating")) {
    ExPanel_updateFloatingPosition();
  }
}

function hideExPanel() {
  const exPanelDOM = document.querySelector(".ex-panel");
  if (!exPanelDOM) return;
  exPanelDOM.classList.remove("miuix-dock-in");
  exPanelDOM.classList.add("miuix-dock-out");
  setTimeout(() => {
    if (exPanelDOM.classList.contains("miuix-dock-out")) {
      exPanelDOM.style.display = "none";
      exPanelDOM.classList.remove("miuix-dock-out");
    }
  }, 160);
}

function toggleExPanel() {
  let a = document.getElementsByClassName("ex-panel")[0];
  if (!a) return;
  let isShown = (a.style.display === "flex" || a.style.display === "block") && !a.classList.contains("miuix-dock-out");
  if (isShown) {
    hideExPanel();
  } else {
    openExPanel();
  }
}

function showExPanel() {
  openExPanel();
}

/* ==================== 三维模态脱离聊天区居中锚定与 Sticky Header ==================== */
function ensureMiuixPanelHeader(el, title) {
  if (!el) return;
  el.classList.add("miuix-modal");

  var oldCloses = el.querySelectorAll(".extool__close, .livetool__close, .bloop__close, #vote__result-close, .lottery__func, .ChatToolBar-DanmakuTail-title");
  oldCloses.forEach((c) => {
    c.style.setProperty("display", "none", "important");
  });

  var header = el.querySelector(".miuix-modal__header");
  if (!header) {
    header = document.createElement("div");
    header.className = "miuix-modal__header";
    header.innerHTML = `
      <div class="miuix-modal__title-box">
        <span class="miuix-modal__title">${title}</span>
      </div>
      <button type="button" class="miuix-modal__close" title="关闭面板" aria-label="关闭">×</button>
    `;
    el.insertBefore(header, el.firstChild);
  } else {
    var titleEl = header.querySelector(".miuix-modal__title");
    if (titleEl) titleEl.textContent = title;
  }

  // 滚动条起始点统一规定在顶栏下方：将所有非 Header 内容封装进 .miuix-modal__body
  var body = el.querySelector(":scope > .miuix-modal__body");
  if (!body) {
    body = document.createElement("div");
    body.className = "miuix-modal__body";
    el.appendChild(body);
  }
  var nodesToMove = [];
  for (var i = 0; i < el.childNodes.length; i++) {
    var node = el.childNodes[i];
    if (node !== header && node !== body) {
      nodesToMove.push(node);
    }
  }
  nodesToMove.forEach((n) => {
    body.appendChild(n);
  });

  var closeBtn = header.querySelector(".miuix-modal__close");
  if (closeBtn) {
    closeBtn.onclick = function (e) {
      e.stopPropagation();
      el.style.removeProperty("display");
      el.style.setProperty("display", "none", "important");
      el.classList.remove("miuix-modal-in");
      if (typeof updateDockActiveIndicator === "function") {
        updateDockActiveIndicator();
      }
      // 三级菜单关闭后二级菜单保持展开，仅由「×」显式关闭二级菜单
    };
  }
}

function openMiuixPanelCentered(panel, btnEl) {
  if (!panel) return;
  if (panel.parentNode !== document.body) {
    document.body.appendChild(panel);
  }

  // 互斥关闭所有其他三级面板
  var allPanels = document.querySelectorAll(
    ".sign-panel, .fans-continue-panel, .fans-panel, .extool, .livetool, .bloop, .exlottery, .popup-player-panel, .exupdate-panel, .ChatToolBar-DanmakuTail-Panel, .danmaku-history-panel"
  );
  allPanels.forEach((p) => {
    if (p !== panel) {
      p.style.removeProperty("display");
      p.style.setProperty("display", "none", "important");
      p.classList.remove("miuix-modal-in");
    }
  });

  // 更新 Dock 激活指示器
  if (typeof updateDockActiveIndicator === "function") {
    updateDockActiveIndicator();
    if (btnEl) {
      var btnWrap = btnEl.closest ? btnEl.closest(".ex-panel__wrap > div") : null;
      if (btnWrap) {
        btnWrap.classList.add("is-active", "ex-dock-active");
      }
    }
  }

  var panelWidth = 380;
  panel.style.width = panelWidth + "px";
  var left = (window.innerWidth - panelWidth) / 2;
  var bottom = 90;

  if (btnEl && typeof btnEl.getBoundingClientRect === "function") {
    var rect = btnEl.getBoundingClientRect();
    if (rect.width > 0 || rect.left > 0) {
      left = rect.left + rect.width / 2 - panelWidth / 2;
      left = Math.max(12, Math.min(window.innerWidth - panelWidth - 12, left));
      bottom = Math.max(20, window.innerHeight - rect.top + 12);
    }
  }

  panel.style.position = "fixed";
  panel.style.left = left + "px";
  panel.style.bottom = bottom + "px";
  panel.style.top = "auto";
  panel.style.right = "auto";
  panel.style.zIndex = "100030";
  panel.style.removeProperty("display");
  panel.style.setProperty("display", "flex", "important");
  panel.classList.remove("miuix-modal-out");
  panel.classList.add("miuix-modal-in");

  /* 所有入口（Dock 图标点击 / 二级菜单悬停 / 快捷键）打开三级面板都会走到这里。
   * 需要"打开即刷新"的面板（例如一键续牌的徽章与资产）自己监听这条事件 ——
   * 旧实现只在图标点击那条路上调 update，悬停打开时面板就一直是占位符。 */
  try {
    document.dispatchEvent(new CustomEvent("DouyuEx:thirdLevelOpened", { detail: { panel: panel } }));
  } catch (e) {}
}

window.ensureMiuixPanelHeader = ensureMiuixPanelHeader;
window.openMiuixPanelCentered = openMiuixPanelCentered;
window.openExPanel = openExPanel;
window.ExPanel_closeAllThirdLevel = ExPanel_closeAllThirdLevel;
window.ExPanel_closeAllMenus = ExPanel_closeAllMenus;
window.ExPanel_isInsideMenu = ExPanel_isInsideMenu;
window.ExPanel_markMenuLayer = ExPanel_markMenuLayer;
window.ExPanel_bindClickOutside = ExPanel_bindClickOutside;
window.isAnyThirdLevelPanelOpen = isAnyThirdLevelPanelOpen;
window.hideExPanel = hideExPanel;
window.toggleExPanel = toggleExPanel;
window.showExPanel = showExPanel;
window.isAnyThirdLevelPanelOpen = isAnyThirdLevelPanelOpen;
window.updateDockActiveIndicator = updateDockActiveIndicator;
