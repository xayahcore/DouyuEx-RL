// src/index_next.js
(function () {
  'use strict';
  if (!globalThis.DYEXRL_NEXT) return;

  var targetWin = typeof unsafeWindow !== 'undefined' ? unsafeWindow : (typeof window !== 'undefined' ? window : globalThis);

  function start() {
    // Only auto-start inside real Userscript engine (Tampermonkey / Violentmonkey)
    if (typeof GM_info === 'undefined') {
      return;
    }

    try {
      var orchestrator = globalThis.DYEXRL_NEXT.registry.resolve('runtime.orchestrator');
      if (orchestrator && typeof orchestrator.bootstrap === 'function') {
        console.log('%c[DouyuEx-RL NEXT]%c 纯净重构版运行时启动...', 'background: #0066FF; color: #fff; padding: 2px 6px; border-radius: 4px; font-weight: bold;', 'color: #0066FF; font-weight: bold;');
        globalThis.DYEXRL_NEXT.app = orchestrator.bootstrap(targetWin);
        if (targetWin !== globalThis) {
          targetWin.DYEXRL_NEXT = globalThis.DYEXRL_NEXT;
        }
      }
    } catch (err) {
      console.error('[DouyuEx-RL NEXT] 启动失败:', err);
    }
  }

  start();
})();
