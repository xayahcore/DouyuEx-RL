function* (__imports) {
yield {"openFeaturePanel": { get: () => openFeaturePanel, set: value => { openFeaturePanel = value; } }};
function openFeaturePanel(t, forceShow, btnEl) {
  var o = [
    {
      name: "弹幕发送小助手",
      className: "bloop",
      title: "弹幕小助手",
      dockCls: "bloop-icon",
    },
    {
      name: "扩展功能",
      className: "extool",
      title: "扩展功能",
      dockCls: "extool-icon",
    },
    {
      name: "直播间工具",
      className: "livetool",
      title: "直播间工具",
      dockCls: "livetool-icon",
    },
    {
      name: "全站抽奖信息",
      className: "exlottery",
      title: "全站抽奖",
      dockCls: "ex-lottery",
    },
    {
      name: "弹幕小尾巴",
      className: "ChatToolBar-DanmakuTail-Panel",
      title: "弹幕小尾巴",
      dockCls: "ChatToolBar-DanmakuTail",
    },
    {
      name: "一键续牌",
      className: "fans-continue-panel",
      title: "一键续牌",
      dockCls: "fans-continue",
    },
    {
      name: "一键签到",
      className: "sign-panel",
      title: "一键签到",
      dockCls: "ex-sign",
    },
    {
      name: "同屏播放",
      className: "popup-player-panel",
      title: "同屏播放器",
      dockCls: "popup-player",
    },
    {
      name: "版本更新",
      className: "exupdate-panel",
      title: "版本更新",
      dockCls: "ex-update",
    },
  ];
  var activeDockCls = null;
  for (var e = 0; e < o.length; e++) {
    var item = o[e];
    if (
      item.className === "exupdate-panel" &&
      typeof __imports.createExUpdatePanel === "function"
    ) {
      (0, __imports.createExUpdatePanel)();
    }
    var panel = document.getElementsByClassName(item.className)[0];
    if (panel) {
      if (t === item.name) {
        var isHidden = forceShow
          ? true
          : panel.style.display === "none" || !panel.style.display;
        try {
          if (!forceShow && typeof getComputedStyle === "function") {
            isHidden = isHidden || getComputedStyle(panel).display === "none";
          }
        } catch (err) {}
        if (isHidden) {
          panel.style.setProperty("display", "flex", "important");
          panel.style.setProperty("flex-direction", "column", "important");
          if (typeof __imports.ensureMiuixPanelHeader === "function") {
            (0, __imports.ensureMiuixPanelHeader)(panel, item.title);
          }
          if (typeof __imports.anchorPanelToButton === "function") {
            (0, __imports.anchorPanelToButton)(
              panel,
              btnEl || document.querySelector("." + item.dockCls),
            );
          }
          activeDockCls = item.dockCls;
        } else {
          panel.style.setProperty("display", "none", "important");
        }
      } else {
        panel.style.setProperty("display", "none", "important");
      }
    }
  }
  if (typeof __imports.updateDockActiveIndicator === "function") {
    (0, __imports.updateDockActiveIndicator)(activeDockCls);
  }
}

}
