// src/modules/economy/autofish.js
(function () {
  'use strict';
  if (!globalThis.DYEXRL_NEXT) return;

  globalThis.DYEXRL_NEXT.registry.register('modules.economy.autofish', [
    'api.client',
    'store.index',
    'ui.miuix'
  ], function (client, store, miuix) {

    var activeTimer = null;
    var isRunning = false;

    function isContestTime() {
      var now = new Date();
      var hour = now.getHours();
      var minute = now.getMinutes();
      // 12:00-12:30 or 00:00-00:30
      return (hour === 12 && minute < 30) || (hour === 0 && minute < 30);
    }

    async function checkAndReel(rid) {
      try {
        var homeRes = await client.get('routine.fishHome', { rid: rid, opt: 1 });
        if (!homeRes || !homeRes.data || !homeRes.data.data) return;

        var data = homeRes.data.data;
        var baitNum = Number(data.user?.baitNum || 0);
        var fishingStat = Number(data.fishing?.stat || 0);
        var fishEtMs = Number(data.fishing?.fishEtMs || 0);

        if (baitNum <= 0 && fishingStat === 0) {
          miuix.Toast('【自动钓鱼】鱼饵耗尽，自动停止', 'info');
          stop();
          return;
        }

        var now = Date.now();
        if (fishingStat === 1 && now >= fishEtMs) {
          // Time to reel in!
          var reelRes = await client.post('routine.fishReel', { rid: rid });
          if (reelRes && reelRes.data && (reelRes.data.error === 0 || reelRes.data.error === '0')) {
            var fish = reelRes.data.data?.fish;
            var fishName = fish?.name || '鱼';
            var weight = fish?.wei ? fish.wei + '斤' : '';
            miuix.Toast('【自动钓鱼】收获 ' + fishName + ' ' + weight, 'success');
          }
        }
      } catch (e) {
        console.error('[NEXT AutoFish] Poll error:', e);
      }
    }

    function start(rid, mode) {
      if (isRunning) return;
      isRunning = true;
      var targetRid = rid || store.get('runtime.room.rid') || '9999';
      var m = mode || 'all';

      miuix.Toast('【自动钓鱼】助手已启动 (' + (m === 'contest' ? '钓鱼大赛' : '全天模式') + ')', 'info');

      activeTimer = setInterval(function () {
        if (m === 'contest' && !isContestTime()) {
          return; // Wait for contest window
        }
        checkAndReel(targetRid);
      }, 5000); // Check every 5s

      // Immediate check once
      checkAndReel(targetRid);
    }

    function stop() {
      if (activeTimer) {
        clearInterval(activeTimer);
        activeTimer = null;
      }
      isRunning = false;
    }

    return {
      start: start,
      stop: stop,
      get isRunning() { return isRunning; },
      isContestTime: isContestTime
    };
  });
})();
