let isRemoveEnterBarrage = getLocalIsRemoveEnterBarrage();

/* ==================== 进场弹幕屏蔽 ====================
 * 状态应用与开关 UI 解耦：
 *   1) Shield_applyRemoveEnter 由 initPkg_Shield() 在页面加载时无条件调用，容器晚出现时按
 *      500ms、最多 60 秒补应用；
 *   2) 直接改真实节点的内联 display：屏蔽 = none!important，不屏蔽 = removeProperty；
 *   3) 开关本身挂在斗鱼原生新菜单（.shieldSettingPanel，见 ShieldMenu.js）里，
 *      不再依赖旧面板 .FilterKeywords —— 那套面板 2026-10 起不再渲染，开关会彻底消失；
 *   4) UI 注入幂等：菜单会被 React 反复重绘，重复插入会变成两个开关。
 */

/**
 * 按存下来的状态，把「进场弹幕」容器的真实显隐改对。
 * @returns {boolean} 容器存在并已应用（false = 容器还没渲染，需要重试）
 */
function Shield_applyRemoveEnter() {
  const el = document.getElementById("js-barrage-extend-container");
  if (!el) return false;
  if (isRemoveEnterBarrage) {
    el.style.setProperty("display", "none", "important");
  } else {
    el.style.removeProperty("display");
  }
  return true;
}

/**
 * 容器可能晚于脚本渲染（冷启动、切房），做有上限的补应用：
 * 500ms × 120 = 60 秒后放弃 —— 容器始终不存在时也没什么可藏的。
 */
function Shield_applyRemoveEnterWhenReady(tries) {
  const n = tries || 0;
  if (Shield_applyRemoveEnter()) return true;
  if (n >= 120) return false;
  setTimeout(function () {
    Shield_applyRemoveEnterWhenReady(n + 1);
  }, 500);
  return false;
}

function getLocalIsRemoveEnterBarrage() {
  const ret = localStorage.getItem("ExSave_isRemoveEnterBarrage");
  // 2026-10-30 用户反馈（Greasy Fork / rikka147）：「发言框上面的『XXX 来了』以前插件是屏蔽的，现在又有了」。
  // 未存储过 = 老用户，按老观感默认屏蔽；显式关掉过的（存了 "0"）继续不屏蔽。
  return ret ? Number(ret) === 1 : true;
}

function saveRemoveEnterBarrage() {
  localStorage.setItem("ExSave_isRemoveEnterBarrage", isRemoveEnterBarrage ? 1 : 0);
}
