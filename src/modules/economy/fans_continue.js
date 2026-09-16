// src/modules/economy/fans_continue.js
(function () {
  'use strict';
  if (!globalThis.DYEXRL_NEXT) return;

  globalThis.DYEXRL_NEXT.registry.register('modules.economy.fansContinue', [
    'api.client',
    'store.index',
    'ui.miuix',
    'modules.economy.backpack'
  ], function (client, store, miuix, backpack) {

    var GLOW_STICK_IDS = ['268', '2358']; // 荧光棒 / 粉丝荧光棒

    async function executeFansRenewal(options) {
      var opts = options || {};
      var customCount = Number(opts.count || store.get('economy.fansContinueCount') || 0);
      var currentRid = store.get('runtime.room.rid') || '9999';

      var items = await backpack.fetchBackpackItems(currentRid);
      var stickItem = items.find(function (it) {
        return GLOW_STICK_IDS.includes(String(it.id)) || (it.name && it.name.includes('荧光棒'));
      });

      if (!stickItem || stickItem.count <= 0) {
        miuix.Toast('背包内没有荧光棒道具', 'error');
        return { success: false, reason: 'NO_STICK' };
      }

      var sendCount = customCount > 0 ? Math.min(customCount, stickItem.count) : 1;

      var res = await backpack.sendBackpackProp(stickItem.id, sendCount, currentRid);
      if (res.success) {
        miuix.Toast('【一键续牌】赠送 ' + sendCount + ' 个荧光棒成功！', 'success');
        return { success: true, count: sendCount };
      } else {
        miuix.Toast('【一键续牌】赠送失败: ' + (res.error?.message || '网络异常'), 'error');
        return { success: false, error: res.error };
      }
    }

    return {
      executeFansRenewal: executeFansRenewal
    };
  });
})();
