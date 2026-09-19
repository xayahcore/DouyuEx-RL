function* (__imports) {
yield {"anchorPanelToButton": { get: () => anchorPanelToButton, set: value => { anchorPanelToButton = value; } },
"clearSubPanelTimer": { get: () => clearSubPanelTimer, set: value => { clearSubPanelTimer = value; } },
"scheduleSubPanelClose": { get: () => scheduleSubPanelClose, set: value => { scheduleSubPanelClose = value; } },
"updateDockActiveIndicator": { get: () => updateDockActiveIndicator, set: value => { updateDockActiveIndicator = value; } }};
/**
 * DouyuEx-RL 三级面板悬停防抖连桥与 24×4px 磁吸指示器定位中枢
 */
let subPanelCloseTimer = null;

/**
 * 清除延迟收起定时器
 */
function clearSubPanelTimer() {
  if (subPanelCloseTimer) {
    (0, __imports.clearTimeout)(subPanelCloseTimer);
    subPanelCloseTimer = null;
  }
}

/**
 * 计划 400ms 后收起所有打开的三级子面板
 */
function scheduleSubPanelClose() {
  clearSubPanelTimer();
  subPanelCloseTimer = (0, __imports.setTimeout)(() => {
    closeAllSubPanels();
  }, 400);
}

/**
 * 立即关闭所有三级子控制台并熄灭指示灯
 */
function closeAllSubPanels() {
  clearSubPanelTimer();
  const panels = document.querySelectorAll(
    ".miuix-modal, .extool, .livetool, .bloop, .exlottery, .ChatToolBar-DanmakuTail-Panel, .fans-continue-panel, .popup-player-panel"
  );
  panels.forEach((p) => {
    p.style.removeProperty("display");
    p.style.setProperty("display", "none", "important");
  });
  updateDockActiveIndicator();
}

/**
 * 更新 Dock 栏对应按钮的生机蓝激活指示胶囊 (.ex-panel__indicator)
 * @param {string} [activeCls] - 当前激活的按钮类名
 */
function updateDockActiveIndicator(activeCls) {
  const wrap = document.querySelector(".ex-panel__wrap");
  if (!wrap) return;

  for (let i = 0; i < __imports.DOCK_DEFS.length; i++) {
    const item = wrap.querySelector(`.${__imports.DOCK_DEFS[i].cls}`);
    if (item) {
      item.classList.remove("ex-dock-active", "is-active");
    }
  }

  if (activeCls) {
    const target = wrap.querySelector(`.${activeCls}`);
    if (target) {
      target.classList.add("ex-dock-active", "is-active");
    }
  }
}

// 导出至主上下文
window.clearSubPanelTimer = clearSubPanelTimer;
window.scheduleSubPanelClose = scheduleSubPanelClose;
window.closeAllSubPanels = closeAllSubPanels;
window.updateDockActiveIndicator = updateDockActiveIndicator;

/**
 * 三级控制台物理锚定算法：固定 380px 宽度，水平居中对齐按钮，悬停于按钮正上方 12px
 * @param {HTMLElement} panel - 控制台模态容器
 * @param {HTMLElement} [btnEl] - 关联的 Dock 按钮
 */
function anchorPanelToButton(panel, btnEl) {
  if (!panel) return;

  let targetBtn = btnEl;
  if (!targetBtn) {
    if (panel.classList.contains("extool")) targetBtn = document.querySelector(".extool-icon");
    else if (panel.classList.contains("livetool")) targetBtn = document.querySelector(".livetool-icon");
    else if (panel.classList.contains("bloop")) targetBtn = document.querySelector(".bloop-icon");
    else if (panel.classList.contains("ex-lottery") || panel.classList.contains("lottery__wrap") || panel.querySelector(".lottery__wrap"))
      targetBtn = document.querySelector(".ex-lottery");
    else if (panel.classList.contains("fans-continue-panel")) targetBtn = document.querySelector(".fans-continue");
    else if (panel.classList.contains("popup-player-panel")) targetBtn = document.querySelector(".popup-player");
    else if (panel.classList.contains("exupdate-panel")) targetBtn = document.querySelector(".ex-update");
  }

  if (panel.parentElement !== document.body) {
    document.body.appendChild(panel);
  }

  const panelWidth = 380; // 三级面板规范统一 380px 宽度
  panel.style.width = panelWidth + "px";
  let left = (window.innerWidth - panelWidth) / 2;
  let bottom = 90;

  if (targetBtn && typeof targetBtn.getBoundingClientRect === "function") {
    const rect = targetBtn.getBoundingClientRect();
    if (rect.width > 0 || rect.left > 0) {
      left = rect.left + rect.width / 2 - panelWidth / 2;
      left = Math.max(12, Math.min(window.innerWidth - panelWidth - 12, left));
      bottom = Math.max(20, window.innerHeight - rect.top + 12); // 悬浮在按钮上方 12px
    }
  }

  panel.style.setProperty("position", "fixed", "important");
  panel.style.setProperty("width", `${panelWidth}px`, "important");
  panel.style.setProperty("max-width", `${panelWidth}px`, "important");
  panel.style.setProperty("left", `${left}px`, "important");
  panel.style.setProperty("bottom", `${bottom}px`, "important");
  panel.style.setProperty("right", "auto", "important");
  panel.style.setProperty("top", "auto", "important");
  panel.style.setProperty("z-index", "100000", "important");
  panel.style.setProperty("display", "flex", "important");
  panel.style.setProperty("flex-direction", "column", "important");
  panel.classList.add("miuix-modal-in");
}

window.anchorPanelToButton = anchorPanelToButton;

}
