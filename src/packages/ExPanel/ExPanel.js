let ExPanel_anchorParent = null;
let ExPanel_anchorNextSibling = null;

function initPkg_ExPanel() {
  initPkg_ExPanel_insertDom();

  let exPanelDOM = document.querySelector(`.ex-panel`);
  if (exPanelDOM) {
    exPanelDOM.addEventListener(`mouseenter`, () => {
      clearTimeout(exPanelTimer);
    });
    // 400ms 黄金渐隐防抖，消灭误关
    exPanelDOM.addEventListener(`mouseleave`, () => {
      clearTimeout(exPanelTimer);
      exPanelTimer = setTimeout(autoCloseExPanelHandle, 400);
    });
    const closeBtn = exPanelDOM.querySelector(".ex-panel__close");
    if (closeBtn) {
      closeBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        hideExPanel();
      });
    }
  }
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
  ExPanel_saveAnchor(a);
  if (ExPanel_isGiftBarHidden()) {
    ExPanel_attachToFloatingHost();
  }
}

function ensureDockIndicators() {
  let dockWrap = document.querySelector(".ex-panel__wrap");
  if (!dockWrap) return;
  dockWrap.querySelectorAll(":scope > div").forEach((btn) => {
    if (!btn.querySelector(".ex-panel__indicator")) {
      let ind = document.createElement("span");
      ind.className = "ex-panel__indicator";
      btn.appendChild(ind);
    }
  });
}

function hideExPanel() {
  const exPanelDOM = document.querySelector(".ex-panel");
  if (!exPanelDOM) return;
  clearTimeout(exPanelTimer);
  exPanelTimer = null;
  exPanelDOM.classList.remove("miuix-dock-in");
  exPanelDOM.classList.add("miuix-dock-out");
  setTimeout(() => {
    if (exPanelDOM.classList.contains("miuix-dock-out")) {
      exPanelDOM.style.display = "none";
      exPanelDOM.classList.remove("miuix-dock-out");
    }
  }, 160);
}

function autoCloseExPanelHandle() {
  hideExPanel();
}

function showExPanel() {
  let a = document.getElementsByClassName("ex-panel")[0];
  if (!a) return;
  ExPanel_syncHost();
  ensureDockIndicators();
  let isShown = a.style.display === "flex" || a.style.display === "block";
  if (!isShown) {
    a.classList.remove("miuix-dock-out");
    a.classList.add("miuix-dock-in");
    a.style.display = "flex";
    clearTimeout(exPanelTimer);
    if (a.classList.contains("ex-panel--floating")) {
      ExPanel_updateFloatingPosition();
    }
  } else {
    hideExPanel();
  }
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

  // 自动将非 header 子节点收拢至 .miuix-modal__body，使滚动条起始点统一为顶栏正下方
  if (!el.querySelector(".miuix-modal__body")) {
    let bodyWrap = document.createElement("div");
    bodyWrap.className = "miuix-modal__body";
    let children = Array.from(el.childNodes).filter((node) => node !== header);
    children.forEach((child) => bodyWrap.appendChild(child));
    el.appendChild(bodyWrap);
  }

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
    ".sign-panel, .fans-continue-panel, .fans-panel, .extool, .livetool, .bloop, .exlottery, .popup-player-panel, .exupdate-panel, .ChatToolBar-DanmakuTail-Panel"
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
