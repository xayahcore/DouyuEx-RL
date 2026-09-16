// src/modules/economy/backpack.js
(function () {
  'use strict';
  if (!globalThis.DYEXRL_NEXT) return;

  globalThis.DYEXRL_NEXT.registry.register('modules.economy.backpack', [
    'api.client',
    'store.index',
    'ui.miuix',
    'ui.giftPicker'
  ], function (client, store, miuix, giftPicker) {

    var isSending = false;

    function delay(ms) {
      return new Promise(function (resolve) { setTimeout(resolve, ms); });
    }

    async function fetchBackpackItems(rid) {
      var currentRid = rid || store.get('runtime.room.rid') || '9999';
      try {
        var res = await client.get('backpack.list', { rid: currentRid });
        if (res && res.data && res.data.data && Array.isArray(res.data.data.list)) {
          var items = res.data.data.list.map(function (it) {
            return {
              id: it.id,
              name: it.name,
              count: Number(it.count || 0),
              icon: it.icon || '',
              batchInfo: it.batchInfo || {}
            };
          });
          store.set('runtime.backpack', { items: items, updatedAt: Date.now() });
          return items;
        }
      } catch (e) {
        console.error('[NEXT Backpack] Failed to load backpack:', e);
      }
      return [];
    }

    async function sendBackpackProp(propId, count, roomId) {
      if (isSending) return { success: false, reason: 'BUSY' };
      isSending = true;

      try {
        var res = await client.post('backpack.donate', {
          propId: propId,
          count: count,
          roomId: roomId
        });
        isSending = false;
        return { success: true, data: res.data };
      } catch (err) {
        isSending = false;
        return { success: false, error: err };
      }
    }

    async function clearAllBackpack(roomId, onProgress) {
      var rid = roomId || store.get('runtime.room.rid') || '9999';
      var items = await fetchBackpackItems(rid);
      if (items.length === 0) {
        miuix.Toast('背包道具为空', 'info');
        return { success: true, count: 0 };
      }

      var confirmed = await miuix.Dialog({
        mode: 'confirm',
        title: '清空背包确认',
        message: '确认将背包内所有免费与限时道具全部赠送给当前房间吗？'
      });

      if (!confirmed.confirmed) return { success: false, cancelled: true };

      miuix.Toast('【清空背包】开始赠送...', 'info');
      var totalSent = 0;

      for (var i = 0; i < items.length; i++) {
        var item = items[i];
        if (item.count <= 0) continue;

        if (typeof onProgress === 'function') {
          onProgress('正在赠送 ' + item.name + ' x' + item.count);
        }

        await sendBackpackProp(item.id, item.count, rid);
        totalSent += item.count;
        await delay(250); // Safe breathing delay
      }

      await fetchBackpackItems(rid);
      miuix.Toast('【清空背包】全部赠送完毕！', 'success');
      return { success: true, count: totalSent };
    }

    return {
      fetchBackpackItems: fetchBackpackItems,
      sendBackpackProp: sendBackpackProp,
      clearAllBackpack: clearAllBackpack
    };
  });
})();
