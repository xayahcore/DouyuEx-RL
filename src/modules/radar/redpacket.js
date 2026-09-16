// src/modules/radar/redpacket.js
(function () {
  'use strict';
  if (!globalThis.DYEXRL_NEXT) return;

  globalThis.DYEXRL_NEXT.registry.register('modules.radar.redpacket', [
    'api.client',
    'store.index',
    'ui.miuix'
  ], function (client, store, miuix) {

    var isPicking = false;
    var activeTimer = null;

    function detectRedPackets() {
      // Query red packet DOM triggers in room
      var nodes = document.querySelectorAll('.RedPacket-countdown, .Treasure-box, [class*="redPacket"]');
      return Array.from(nodes).map(function (n, idx) {
        return {
          id: idx,
          text: n.textContent?.trim() || '红包/宝箱',
          element: n
        };
      });
    }

    async function pickRedPacket(item) {
      if (!item || !item.element) return false;
      try {
        item.element.click();
        miuix.Toast('已触发红包/宝箱拾取', 'info');
        return true;
      } catch (e) {
        return false;
      }
    }

    function startAutoPicker() {
      var enabled = store.get('radar.autoPick') ?? true;
      if (!enabled || isPicking) return;
      isPicking = true;

      // Scan every 3s
      activeTimer = setInterval(function () {
        if (!store.get('radar.autoPick')) return;
        var list = detectRedPackets();
        if (list.length > 0) {
          list.forEach(function (it) {
            pickRedPacket(it);
          });
        }
      }, 3000);
      return activeTimer;
    }

    function stopAutoPicker() {
      if (activeTimer) {
        clearInterval(activeTimer);
        activeTimer = null;
      }
      isPicking = false;
    }

    return {
      detectRedPackets: detectRedPackets,
      pickRedPacket: pickRedPacket,
      startAutoPicker: startAutoPicker,
      stopAutoPicker: stopAutoPicker
    };
  });
})();
