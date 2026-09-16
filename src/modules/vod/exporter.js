// src/modules/vod/exporter.js
(function () {
  'use strict';
  if (!globalThis.DYEXRL_NEXT) return;

  globalThis.DYEXRL_NEXT.registry.register('modules.vod.exporter', [], function () {

    function generateHeatmapBuckets(danmakuList, durationSec) {
      var BUCKET_COUNT = 100;
      var buckets = new Array(BUCKET_COUNT).fill(0);
      var totalSec = Math.max(1, durationSec || 3600);

      if (!Array.isArray(danmakuList)) return buckets;

      danmakuList.forEach(function (dm) {
        var t = Number(dm.time || dm.offset || 0);
        if (t >= 0 && t <= totalSec) {
          var idx = Math.min(BUCKET_COUNT - 1, Math.floor((t / totalSec) * BUCKET_COUNT));
          buckets[idx]++;
        }
      });

      return buckets;
    }

    function extractM3u8StreamUrl(playData) {
      if (!playData) return null;
      if (typeof playData === 'string' && playData.includes('.m3u8')) return playData;
      if (playData.data && playData.data.video_url) return playData.data.video_url;
      if (playData.video_url) return playData.video_url;
      return null;
    }

    return {
      generateHeatmapBuckets: generateHeatmapBuckets,
      extractM3u8StreamUrl: extractM3u8StreamUrl
    };
  });
})();
