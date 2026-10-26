function initPkg_Shield() {
  // 进场弹幕屏蔽的状态必须在**页面加载时**就应用到真实节点上。
  // 旧实现只在「弹幕屏蔽设置面板被打开过」之后才应用，而 RemoveAD 的 CSS
  // 又用 display:var(--enter-display, none) 兜底成 none —— 两件事合起来
  // 就是"进场弹幕永久消失、开关还写着未开启"。详见 RemoveEnter.js 顶部注释。
  Shield_applyRemoveEnterWhenReady();

  // let t = setInterval(() => {
  //     if (typeof document.getElementsByClassName("ShieldTool-list")[0] !== "undefined") {
  //         clearInterval(t);
  //         initPkg_Shield_RemoveEnter();
  //         initPkg_Shield_RemoveDanmakuBackground();
  //     }
  // }, 1000);

  let t = setInterval(() => {
    if (typeof document.getElementsByClassName("BarrageFilter")[0] !== "undefined") {
      clearInterval(t);
      new DomHook(".BarrageFilter", false, (m) => {
        if (m.length === 0) return;
        if (m[0].addedNodes.length > 0 && m[0].removedNodes.length === 0) {
          const domFilterKeywords = document.getElementsByClassName("FilterKeywords")[0];
          if (domFilterKeywords) {
            initPkg_Shield_Enable();
          } else {
            let t2 = setInterval(() => {
              const domFilterKeywords = document.getElementsByClassName("FilterKeywords")[0];
              if (domFilterKeywords) {
                clearInterval(t2);
                initPkg_Shield_Enable();
              }
            }, 50);
          }
        }
      });
    }
  }, 1000);
}

function initPkg_Shield_Enable() {
  initPkg_Shield_RemoveRepeatedDanmaku();
  initPkg_Shield_RemoveEnter();
  initPkg_Shield_RemoveDanmakuBackground();
}