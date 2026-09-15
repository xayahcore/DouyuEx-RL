// src/adapters/player.js
(function () {
  'use strict';
  if (!globalThis.DYEXRL_NEXT) return;

  globalThis.DYEXRL_NEXT.registry.register('adapters.player', [], function () {
    function getVideoElement() {
      return document.querySelector('.layout-Player-videoEntity video') || document.querySelector('video');
    }

    function setVolume(val) {
      var video = getVideoElement();
      if (!video) return 0;
      var clamped = Math.max(0, Math.min(1, Number(val) || 0));
      video.volume = clamped;
      return clamped;
    }

    function getVolume() {
      var video = getVideoElement();
      return video ? video.volume : 1;
    }

    function triggerWebFullScreen() {
      var btn = document.querySelector('.wfs-2a8e83') || document.querySelector('.icon-c8be96') || document.querySelector('[title*=\"网页全屏\"]');
      if (btn) {
        btn.click();
        return true;
      }
      return false;
    }

    return {
      getVideoElement: getVideoElement,
      setVolume: setVolume,
      getVolume: getVolume,
      triggerWebFullScreen: triggerWebFullScreen
    };
  });
})();
