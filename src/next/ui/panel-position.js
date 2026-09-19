function* (__imports) {
yield {"anchorPanelToButton": { get: () => anchorPanelToButton, set: value => { anchorPanelToButton = value; } },
"clearSubPanelTimer": { get: () => clearSubPanelTimer, set: value => { clearSubPanelTimer = value; } },
"scheduleSubPanelClose": { get: () => scheduleSubPanelClose, set: value => { scheduleSubPanelClose = value; } },
"updateDockActiveIndicator": { get: () => updateDockActiveIndicator, set: value => { updateDockActiveIndicator = value; } }};
/* ==================== DouyuEx-RL 悬浮防抖连桥与指示器状态管理 ==================== */
var subPanelCloseTimer = null;
function clearSubPanelTimer() {
  if (subPanelCloseTimer) {
    (0, __imports.clearTimeout)(subPanelCloseTimer);
    subPanelCloseTimer = null;
  }
}
function scheduleSubPanelClose() {
  clearSubPanelTimer();
  subPanelCloseTimer = (0, __imports.setTimeout)(function () {
    closeAllSubPanels();
  }, 400);
}
function closeAllSubPanels() {
  clearSubPanelTimer();
  var panels = document.querySelectorAll(
    ".miuix-modal, .extool, .livetool, .bloop, .exlottery, .ChatToolBar-DanmakuTail-Panel, .fans-continue-panel, .popup-player-panel",
  );
  panels.forEach(function (p) {
    p.style.removeProperty("display");
    p.style.setProperty("display", "none", "important");
  });
  updateDockActiveIndicator();
}
function updateDockActiveIndicator(activeCls) {
  var wrap = document.querySelector(".ex-panel__wrap");
  if (!wrap) return;
  for (var i = 0; i < __imports.DOCK_DEFS.length; i++) {
    var item = wrap.querySelector("." + __imports.DOCK_DEFS[i].cls);
    if (item) item.classList.remove("ex-dock-active", "is-active");
  }
  if (activeCls) {
    var target = wrap.querySelector("." + activeCls);
    if (target) target.classList.add("ex-dock-active", "is-active");
  }
}
window.clearSubPanelTimer = clearSubPanelTimer;
window.scheduleSubPanelClose = scheduleSubPanelClose;
window.closeAllSubPanels = closeAllSubPanels;
window.updateDockActiveIndicator = updateDockActiveIndicator;

function anchorPanelToButton(panel, btnEl) {
  if (!panel) return;
  if (!btnEl) {
    if (panel.classList.contains("extool"))
      btnEl = document.querySelector(".extool-icon");
    else if (panel.classList.contains("livetool"))
      btnEl = document.querySelector(".livetool-icon");
    else if (panel.classList.contains("bloop"))
      btnEl = document.querySelector(".bloop-icon");
    else if (
      panel.classList.contains("ex-lottery") ||
      panel.classList.contains("lottery__wrap") ||
      panel.querySelector(".lottery__wrap")
    )
      btnEl = document.querySelector(".ex-lottery");
    else if (panel.classList.contains("fans-continue-panel"))
      btnEl = document.querySelector(".fans-continue");
    else if (panel.classList.contains("popup-player-panel"))
      btnEl = document.querySelector(".popup-player");
    else if (panel.classList.contains("exupdate-panel"))
      btnEl = document.querySelector(".ex-update");
  }
  if (panel.parentElement !== document.body) {
    document.body.appendChild(panel);
  }
  var panelWidth = 380; // 三级面板推荐固定舒适宽度
  panel.style.width = panelWidth + "px";
  var left = (window.innerWidth - panelWidth) / 2;
  var bottom = 90;

  if (btnEl && typeof btnEl.getBoundingClientRect === "function") {
    var rect = btnEl.getBoundingClientRect();
    if (rect.width > 0 || rect.left > 0) {
      left = rect.left + rect.width / 2 - panelWidth / 2;
      left = Math.max(12, Math.min(window.innerWidth - panelWidth - 12, left));
      bottom = Math.max(20, window.innerHeight - rect.top + 12); // 悬浮在按钮上方 12px
    }
  }

  panel.style.setProperty("position", "fixed", "important");
  panel.style.setProperty("width", panelWidth + "px", "important");
  panel.style.setProperty("max-width", panelWidth + "px", "important");
  panel.style.setProperty("left", left + "px", "important");
  panel.style.setProperty("bottom", bottom + "px", "important");
  panel.style.setProperty("right", "auto", "important");
  panel.style.setProperty("top", "auto", "important");
  panel.style.setProperty("z-index", "100000", "important");
  panel.style.setProperty("display", "flex", "important");
  panel.style.setProperty("flex-direction", "column", "important");
  panel.classList.add("miuix-modal-in");
}
window.anchorPanelToButton = anchorPanelToButton;

}
