/* 弹幕屏蔽三开关：统一放在插件自己的「扩展功能」面板里（斗鱼原生菜单类名带构建哈希，
 * 往里塞节点每次改版都会失效，2026-10-30 已放弃那条路线）。
 * 这里只做 UI 绑定，真实逻辑仍在 Shield/RemoveEnter、RemoveRepeatedDanmaku、RemoveDanmakuBackground。 */
function initPkg_ExpandTool_Shield() {
  // ---- 进场弹幕（发言框上方的「XXX 来了」） ----
  const enterEl = document.getElementById("extool__removeEnter");
  if (enterEl) {
    enterEl.checked = (typeof getLocalIsRemoveEnterBarrage === "function") ? getLocalIsRemoveEnterBarrage() : false;
    enterEl.addEventListener("change", function () {
      if (typeof isRemoveEnterBarrage !== "undefined") isRemoveEnterBarrage = !!enterEl.checked;
      if (typeof Shield_applyRemoveEnter === "function") Shield_applyRemoveEnter();
      if (typeof saveRemoveEnterBarrage === "function") saveRemoveEnterBarrage();
    });
  }

  // ---- 弹幕背景 ----
  const bgEl = document.getElementById("extool__removeDanmakuBg");
  if (bgEl) {
    bgEl.checked = (typeof getLocalIsRemoveDanmakuBackground === "function") ? getLocalIsRemoveDanmakuBackground() : false;
    bgEl.addEventListener("change", function () {
      if (typeof isRemoveDanmakuBackground !== "undefined") isRemoveDanmakuBackground = !!bgEl.checked;
      if (isRemoveDanmakuBackground) {
        if (typeof removeDanmakuBackground === "function") removeDanmakuBackground();
      } else if (typeof StyleHook_remove === "function") {
        StyleHook_remove("Ex_Style_RemoveDanmakuBackground");
      }
      if (typeof saveRemoveDanmakuBackground === "function") saveRemoveDanmakuBackground();
    });
  }

  // ---- 重复弹幕 + 两个参数 ----
  const repEl = document.getElementById("extool__removeRepeated");
  const secEl = document.getElementById("extool__repeatedSeconds");
  const zoomEl = document.getElementById("extool__enlargeDanmaku");

  if (secEl) {
    secEl.value = (typeof getLocalRepeatedDanmakuSeconds === "function") ? getLocalRepeatedDanmakuSeconds() : 5;
    secEl.addEventListener("input", function () {
      let value = parseInt(secEl.value, 10);
      if (isNaN(value) || value < 1) value = 1;
      if (value > 300) value = 300;
      secEl.value = value;
      if (typeof repeatedDanmakuSeconds !== "undefined") repeatedDanmakuSeconds = value;
      if (typeof setLocalRepeatedDanmakuSeconds === "function") setLocalRepeatedDanmakuSeconds(value);
      // 已开启时按新窗口重启一次
      if (typeof isRemoveRepeatedDanmaku !== "undefined" && isRemoveRepeatedDanmaku) {
        if (typeof repeatedDanmakuDomHook !== "undefined" && repeatedDanmakuDomHook) {
          repeatedDanmakuDomHook.closeHook();
          repeatedDanmakuDomHook = null;
        }
        if (typeof stopRepeatedDanmakuCleanupTimer === "function") stopRepeatedDanmakuCleanupTimer();
        if (typeof removeRepeatedDanmaku === "function") removeRepeatedDanmaku();
      }
    });
  }

  if (zoomEl) {
    zoomEl.checked = (typeof getLocalIsEnlargeDanmaku === "function") ? getLocalIsEnlargeDanmaku() : false;
    zoomEl.addEventListener("change", function () {
      if (typeof isEnlargeDanmaku !== "undefined") isEnlargeDanmaku = !!zoomEl.checked;
      if (typeof setLocalIsEnlargeDanmaku === "function") setLocalIsEnlargeDanmaku(isEnlargeDanmaku);
    });
  }

  if (repEl) {
    repEl.checked = (typeof getLocalIsRemoveRepeatedDanmaku === "function") ? getLocalIsRemoveRepeatedDanmaku() : false;
    repEl.addEventListener("change", function () {
      if (typeof isRemoveRepeatedDanmaku !== "undefined") isRemoveRepeatedDanmaku = !!repEl.checked;
      if (isRemoveRepeatedDanmaku) {
        if (typeof removeRepeatedDanmaku === "function") removeRepeatedDanmaku();
      } else {
        if (typeof repeatedDanmakuDomHook !== "undefined" && repeatedDanmakuDomHook) {
          repeatedDanmakuDomHook.closeHook();
          repeatedDanmakuDomHook = null;
        }
        if (typeof stopRepeatedDanmakuCleanupTimer === "function") stopRepeatedDanmakuCleanupTimer();
        if (typeof StyleHook_remove === "function") {
          StyleHook_remove("Ex_Style_RemoveRepeatedDanmaku");
          StyleHook_remove("Ex_Style_RemoveRepeatedDanmaku_Count");
        }
      }
      if (typeof saveRemoveRepeatedDanmaku === "function") saveRemoveRepeatedDanmaku();
    });
  }
}
