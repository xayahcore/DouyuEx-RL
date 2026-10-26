function initPkg_Shield() {
  // 进场弹幕屏蔽的状态必须在**页面加载时**就应用到真实节点上。
  // 旧实现只在「弹幕屏蔽设置面板被打开过」之后才应用，而 RemoveAD 的 CSS
  // 又用 display:var(--enter-display, none) 兜底成 none —— 两件事合起来
  // 就是"进场弹幕永久消失、开关还写着未开启"。详见 RemoveEnter.js 顶部注释。
  Shield_applyRemoveEnterWhenReady();

  // 旧实现是 1 秒一次的裸 setInterval：弹幕工具条始终不出现时，定时器永久空转，
  // 而控制台里没有任何线索。现在走 ExGuard_pollFor（有次数上限 + 放弃时留痕）。
  ExGuard_pollFor(
    function () {
      return document.getElementsByClassName("BarrageFilter")[0];
    },
    function () {
      new DomHook(".BarrageFilter", false, (m) => {
        if (!m || m.length === 0) return;
        if (!m[0].addedNodes || m[0].addedNodes.length === 0) return;
        if (m[0].removedNodes && m[0].removedNodes.length > 0) return;
        Shield_waitForFilterKeywords(0);
      });
    },
    Object.assign({ tag: "弹幕屏蔽" }, Shield_pollOpts)
  );
}

// 轮询参数（测试会改这份配置来验证上限；真机保持默认）
let Shield_pollOpts = { intervalMs: 1000, maxTries: 60, tag: "弹幕屏蔽" };

/**
 * 屏蔽面板可能比 .BarrageFilter 晚渲染，按 50ms × 100 次（5 秒）有上限地等。
 * 旧实现是一个没有出口的 50ms setInterval。
 */
function Shield_waitForFilterKeywords(tries) {
  const n = tries || 0;
  const dom = document.getElementsByClassName("FilterKeywords")[0];
  if (dom) {
    initPkg_Shield_Enable();
    return true;
  }
  if (n >= 100) {
    ExGuard_warn("弹幕屏蔽", "屏蔽设置面板等了 5 秒仍未出现，本次不注入开关（面板重绘后会再试）");
    return false;
  }
  setTimeout(function () {
    Shield_waitForFilterKeywords(n + 1);
  }, 50);
  return false;
}

/**
 * 三个开关面板逐项隔离：任何一个注入失败（面板结构改版、节点缺失）
 * 都不得把另外两个一起带走 —— 这正是旧实现"只坏了其中一个、其余也消失"的成因。
 */
function initPkg_Shield_Enable() {
  const steps = [
    ["屏蔽重复弹幕", initPkg_Shield_RemoveRepeatedDanmaku],
    ["屏蔽进场弹幕", initPkg_Shield_RemoveEnter],
    ["屏蔽弹幕背景", initPkg_Shield_RemoveDanmakuBackground],
  ];
  for (let i = 0; i < steps.length; i++) {
    const name = steps[i][0];
    const fn = steps[i][1];
    try {
      if (typeof fn === "function") fn();
    } catch (e) {
      ExGuard_warn("弹幕屏蔽", name + " 开关初始化失败（其它开关不受影响）", e);
    }
  }
}
