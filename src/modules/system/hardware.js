// src/modules/system/hardware.js
(function () {
  'use strict';
  if (!globalThis.DYEXRL_NEXT) return;

  globalThis.DYEXRL_NEXT.registry.register('modules.system.hardware', [
    'adapters.player'
  ], function (playerAdapter) {

    function inspectStreamInfo() {
      var video = playerAdapter.getVideoElement();
      var args = globalThis.room_args || {};

      var resWidth = video ? (video.videoWidth || video.clientWidth || 0) : 0;
      var resHeight = video ? (video.videoHeight || video.clientHeight || 0) : 0;

      // Guess encoder and software from stream parameters
      var streamUrl = args.stream_url || '';
      var software = '未知推流软件';
      var encoder = '硬件/CPU编码';

      if (streamUrl.includes('obs')) software = 'OBS Studio';
      else if (streamUrl.includes('livehime')) software = '斗鱼直播伴侣';
      else if (streamUrl.includes('vmix')) software = 'vMix Pro';

      return {
        resolution: resWidth > 0 ? (resWidth + 'x' + resHeight) : '自动 (1080P)',
        bitrate: args.rate ? args.rate + ' kbps' : '原画极致',
        fps: 60,
        software: software,
        encoder: encoder,
        p2pBlocked: true
      };
    }

    return {
      inspectStreamInfo: inspectStreamInfo
    };
  });
})();
