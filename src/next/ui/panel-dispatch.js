function* (__imports) {
yield {"openFeaturePanel": { get: () => openFeaturePanel, set: value => { openFeaturePanel = value; } }};
/**
 * 三级控制台互斥调度分发器
 * 保证同一时刻至多仅有一个三级控制台展示，并联动指示器与吸顶 Header
 * @param {string} panelName - 目标面板中文/标识名
 * @param {boolean} [forceShow=false] - 是否强制显示 (悬停模式)
 * @param {HTMLElement} [btnEl] - 触发的按钮节点
 */
function openFeaturePanel(panelName, forceShow = false, btnEl) {
  const panelRegistry = [
    { name: "弹幕发送小助手", className: "bloop", title: "弹幕小助手", dockCls: "bloop-icon" },
    { name: "扩展功能", className: "extool", title: "扩展功能", dockCls: "extool-icon" },
    { name: "直播间工具", className: "livetool", title: "直播间工具", dockCls: "livetool-icon" },
    { name: "全站抽奖信息", className: "exlottery", title: "全站抽奖", dockCls: "ex-lottery" },
    { name: "弹幕小尾巴", className: "ChatToolBar-DanmakuTail-Panel", title: "弹幕小尾巴", dockCls: "ChatToolBar-DanmakuTail" },
    { name: "一键续牌", className: "fans-continue-panel", title: "一键续牌", dockCls: "fans-continue" },
    { name: "一键签到", className: "sign-panel", title: "一键签到", dockCls: "ex-sign" },
    { name: "同屏播放", className: "popup-player-panel", title: "同屏播放器", dockCls: "popup-player" },
    { name: "版本更新", className: "exupdate-panel", title: "版本更新", dockCls: "ex-update" },
  ];

  let activeDockCls = null;

  for (let i = 0; i < panelRegistry.length; i++) {
    const item = panelRegistry[i];

    if (item.className === "exupdate-panel" && typeof __imports.createExUpdatePanel === "function") {
      (0, __imports.createExUpdatePanel)();
    }

    const panelEl = document.getElementsByClassName(item.className)[0];
    if (!panelEl) continue;

    if (panelName === item.name) {
      let isHidden = forceShow ? true : (panelEl.style.display === "none" || !panelEl.style.display);
      try {
        if (!forceShow && typeof getComputedStyle === "function") {
          isHidden = isHidden || getComputedStyle(panelEl).display === "none";
        }
      } catch {}

      if (isHidden) {
        panelEl.style.setProperty("display", "flex", "important");
        panelEl.style.setProperty("flex-direction", "column", "important");

        if (typeof __imports.ensureMiuixPanelHeader === "function") {
          (0, __imports.ensureMiuixPanelHeader)(panelEl, item.title);
        }
        if (typeof __imports.anchorPanelToButton === "function") {
          (0, __imports.anchorPanelToButton)(
            panelEl,
            btnEl || document.querySelector("." + item.dockCls)
          );
        }
        activeDockCls = item.dockCls;
      } else {
        panelEl.style.setProperty("display", "none", "important");
      }
    } else {
      // 互斥关闭其他非目标控制台
      panelEl.style.setProperty("display", "none", "important");
    }
  }

  if (typeof __imports.updateDockActiveIndicator === "function") {
    (0, __imports.updateDockActiveIndicator)(activeDockCls);
  }
}

}
