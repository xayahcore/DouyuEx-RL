let ExPanel_anchorParent = null;
let ExPanel_anchorNextSibling = null;

function isAnyThirdLevelPanelOpen() {
  const panels = document.querySelectorAll(
    ".sign-panel, .fans-continue-panel, .fans-panel, .extool, .livetool, .bloop, .exlottery, .popup-player-panel, .exupdate-panel, .danmaku-history-panel"
  );
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

  // 二级菜单生命周期完全由用户驱动：仅「点击精灵球」展开、「点击 ×」关闭，
  // 不悬停自动打开、不因鼠标移出而自动关闭。
  let exPanelDOM = document.querySelector(`.ex-panel`);
  if (exPanelDOM) {
    const closeBtn = exPanelDOM.querySelector(".ex-panel__close");
    if (closeBtn) {
      closeBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        hideExPanel();
        var allPanels = document.querySelectorAll(
          ".sign-panel, .fans-continue-panel, .fans-panel, .extool, .livetool, .bloop, .exlottery, .popup-player-panel, .exupdate-panel, .danmaku-history-panel"
        );
        allPanels.forEach((p) => {
          p.style.removeProperty("display");
          p.style.setProperty("display", "none", "important");
          p.classList.remove("miuix-modal-in");
        });
        if (typeof updateDockActiveIndicator === "function") {
          updateDockActiveIndicator();
        }
      });
    }
  }

  ExPanel_startSelfHeal();
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

function ExPanel_startSelfHeal() {
  if (ExPanel_healTimer) return;
  ExPanel_healTimer = setInterval(ExPanel_ensureAttached, 3000);
}

function ExPanel_ensureAttached() {
  const node = ExPanel_dockNode;
  if (!node) return false;
  if (document.contains(node)) return true;

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

function openExPanel() {
  let a = document.getElementsByClassName("ex-panel")[0];
  if (!a) return;
  ExPanel_syncHost();
  ensureDockIndicators();
  let isShown = a.style.display === "flex" || a.style.display === "block";
  if (!isShown) {
    a.classList.remove("miuix-dock-out");
    a.classList.add("miuix-dock-in");
    a.style.display = "flex";
    if (a.classList.contains("ex-panel--floating")) {
      ExPanel_updateFloatingPosition();
    }
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
  let isShown = a.style.display === "flex" || a.style.display === "block";
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
}

window.ensureMiuixPanelHeader = ensureMiuixPanelHeader;
window.openMiuixPanelCentered = openMiuixPanelCentered;
window.openExPanel = openExPanel;
window.hideExPanel = hideExPanel;
window.toggleExPanel = toggleExPanel;
window.showExPanel = showExPanel;
window.isAnyThirdLevelPanelOpen = isAnyThirdLevelPanelOpen;
