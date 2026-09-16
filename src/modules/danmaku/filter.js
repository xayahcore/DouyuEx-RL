// src/modules/danmaku/filter.js
(function () {
  'use strict';
  if (!globalThis.DYEXRL_NEXT) return;

  globalThis.DYEXRL_NEXT.registry.register('modules.danmaku.filter', ['store.index'], function (store) {
    var recentDanmakus = new Map(); // text -> timestamp

    function shouldFilterMessage(messageText) {
      var filterConf = store.get('danmaku.filter') || {};
      if (!filterConf.removeRepeated || !messageText) return false;

      var now = Date.now();
      var windowMs = (Number(filterConf.repeatWindowSeconds) || 5) * 1000;

      // Clean old entries
      recentDanmakus.forEach(function (ts, txt) {
        if (now - ts > windowMs) {
          recentDanmakus.delete(txt);
        }
      });

      if (recentDanmakus.has(messageText)) {
        return true; // Filter repeated
      }

      recentDanmakus.set(messageText, now);
      return false;
    }

    return {
      shouldFilterMessage: shouldFilterMessage
    };
  });
})();
