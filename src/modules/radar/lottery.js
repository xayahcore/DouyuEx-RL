// src/modules/radar/lottery.js
(function () {
  'use strict';
  if (!globalThis.DYEXRL_NEXT) return;

  globalThis.DYEXRL_NEXT.registry.register('modules.radar.lottery', [
    'store.index',
    'ui.miuix'
  ], function (store, miuix) {

    var activePrizes = [];

    function handleBroadcastMessage(msg) {
      if (!msg || typeof msg !== 'object') return;

      // Broadcast types: spbc (全站广播), lottery_notice
      if (msg.type === 'spbc' || msg.type === 'lottery_notice' || msg.type === 'gbroadcast') {
        var prize = {
          id: Date.now() + Math.random(),
          rid: msg.rid || msg.drid || '',
          sender: msg.snick || msg.src_n || '神秘观众',
          giftName: msg.gn || msg.n || '超级大奖',
          timestamp: Date.now()
        };

        activePrizes.unshift(prize);
        if (activePrizes.length > 50) activePrizes.pop();

        store.set('runtime.radar.latestPrize', prize);

        if (store.get('radar.notifyPrize')) {
          miuix.Toast('【全站雷达】房间 ' + prize.rid + ' 出现大奖: ' + prize.giftName, 'info', 3000);
        }
      }
    }

    function getActivePrizes() {
      return activePrizes.slice();
    }

    return {
      handleBroadcastMessage: handleBroadcastMessage,
      getActivePrizes: getActivePrizes
    };
  });
})();
