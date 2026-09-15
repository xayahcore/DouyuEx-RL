// src/adapters/room.js
(function () {
  'use strict';
  if (!globalThis.DYEXRL_NEXT) return;

  globalThis.DYEXRL_NEXT.registry.register('adapters.room', [], function () {
    function getNumericRoomId() {
      if (typeof window === 'undefined') return '';
      if (window.room_id && !isNaN(Number(window.room_id))) return String(window.room_id);
      if (typeof unsafeWindow !== 'undefined') {
        if (unsafeWindow.room_id && !isNaN(Number(unsafeWindow.room_id))) return String(unsafeWindow.room_id);
        if (unsafeWindow.$DATA && unsafeWindow.$DATA.ROOM && unsafeWindow.$DATA.ROOM.room_id) {
          return String(unsafeWindow.$DATA.ROOM.room_id);
        }
      }
      var m = location.pathname.match(/^\/(\d+)/);
      return m ? m[1] : '';
    }

    function getAnchorName() {
      var el = document.querySelector('.Title-anchorName') || document.querySelector('.anchor-name');
      return el ? el.textContent.trim() : '';
    }

    return {
      getNumericRoomId: getNumericRoomId,
      getAnchorName: getAnchorName
    };
  });
})();
