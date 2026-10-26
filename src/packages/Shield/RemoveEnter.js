let isRemoveEnterBarrage = getLocalIsRemoveEnterBarrage();

/* ==================== 进场弹幕屏蔽（P0 修复，2026-10-26） ====================
 * 旧实现的根因是"两半各自成立、合起来必错"：
 *   ① RemoveAD 的 CSS 里写着
 *        #js-barrage-extend-container{display:none;display:var(--enter-display,none)!important}
 *      回退值是 none；
 *   ② 全项目唯一写 --enter-display 的地方就在本文件，而它只在 `.FilterKeywords`
 *      （弹幕屏蔽设置面板）渲染出来之后、被 initPkg_Shield_Enable 调一次。
 * 于是：新开一个直播间、不去点弹幕屏蔽设置 → 变量没人写 → 回退值 none 生效
 * → 进场弹幕永久不显示；而同一个状态的开关上却写着「未开启」。
 *
 * 现在的契约（三条，缺一条就会重演）：
 *   1) 状态应用与 UI 注入解耦：Shield_applyRemoveEnter 由 initPkg_Shield() 在
 *      页面加载时无条件调用，容器晚出现时按 500ms、最多 60 秒补应用；
 *   2) 直接改真实节点的内联 display：屏蔽 = none!important，
 *      不屏蔽 = removeProperty（交还页面原生值，不猜它原本是 block 还是 flex）；
 *   3) UI 注入幂等：设置面板会被页面反复重绘，重复插入会变成两个开关。
 * 因此 CSS 变量那套（含 CSS.supports 兼容分支）已整体退场，不再猜回退值。
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

function initPkg_Shield_RemoveEnter() {
  const shieldTool = document.getElementsByClassName("FilterKeywords")[0];
  if (!shieldTool) return;

  // 面板出现时再应用一次：容器可能刚好在这时渲染出来
  Shield_applyRemoveEnter();

  // 幂等：内置开关面板每重绘一次都会走到这里
  if (document.getElementById("ex-removeEnterBarrage")) return;

  shieldTool.insertAdjacentHTML(
    "afterbegin",
    `<div class="FilterSwitchStatus" id="ex-removeEnterBarrage">
    <h3>屏蔽进场弹幕</h3>
    <div>
      <span class="FilterSwitchStatus-status ${isRemoveEnterBarrage ? "is-checked" : "is-noChecked"}">${isRemoveEnterBarrage ? "已开启" : "未开启"}</span>
      <span class="FilterSwitchStatus-switch ${isRemoveEnterBarrage ? "is-checked" : "is-noChecked"}">
        <span class="FilterSwitchStatus-switch-inner"></span>
      </span>
    </div>
  </div>`
  );

  const dom = document.getElementById("ex-removeEnterBarrage");
  if (!dom) return;
  const statusSpan = dom.querySelector(".FilterSwitchStatus-status");
  const switchSpan = dom.querySelector(".FilterSwitchStatus-switch");
  if (!statusSpan || !switchSpan) return;

  dom.addEventListener("click", () => {
    isRemoveEnterBarrage = !isRemoveEnterBarrage;
    // 先改真实节点、再改文案：顺序反了就是旧实现的病 ——
    // 开关说"已开启"而页面没变，或者页面藏了而开关说"未开启"。
    Shield_applyRemoveEnter();
    if (isRemoveEnterBarrage) {
      statusSpan.className = statusSpan.className.replace("is-noChecked", "is-checked");
      statusSpan.textContent = "已开启";
      switchSpan.className = switchSpan.className.replace("is-noChecked", "is-checked");
    } else {
      statusSpan.className = statusSpan.className.replace("is-checked", "is-noChecked");
      statusSpan.textContent = "未开启";
      switchSpan.className = switchSpan.className.replace("is-checked", "is-noChecked");
    }
    saveRemoveEnterBarrage();
  });
}

function getLocalIsRemoveEnterBarrage() {
  const ret = localStorage.getItem("ExSave_isRemoveEnterBarrage");
  return ret ? Number(ret) === 1 : false; // 默认为false（不屏蔽进场弹幕）
}

function saveRemoveEnterBarrage() {
  localStorage.setItem("ExSave_isRemoveEnterBarrage", isRemoveEnterBarrage ? 1 : 0);
}
