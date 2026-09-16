// src/modules/media/follow_list.js
(function () {
  'use strict';
  if (!globalThis.DYEXRL_NEXT) return;

  globalThis.DYEXRL_NEXT.registry.register('modules.media.followList', [
    'store.index',
    'api.client'
  ], function (store, client) {

    function filterLiveStreamers(streamers) {
      if (!Array.isArray(streamers)) return [];
      return streamers.filter(function (s) {
        return s.isLive === true || s.show_status === 1;
      });
    }

    function hookFollowItemInteraction(itemEl, roomId, onLongPress) {
      if (!itemEl || !roomId) return;

      var pressTimer = null;
      var longPressed = false;

      itemEl.addEventListener('mousedown', function (e) {
        if (e.button !== 0) return;
        longPressed = false;
        pressTimer = setTimeout(function () {
          longPressed = true;
          if (typeof onLongPress === 'function') {
            onLongPress(roomId);
          }
        }, 600);
      });

      itemEl.addEventListener('mouseup', function () {
        if (pressTimer) {
          clearTimeout(pressTimer);
          pressTimer = null;
        }
      });

      itemEl.addEventListener('click', function (e) {
        if (longPressed) {
          e.preventDefault();
          e.stopPropagation();
        }
      });
    }

    return {
      filterLiveStreamers: filterLiveStreamers,
      hookFollowItemInteraction: hookFollowItemInteraction
    };
  });
})();
