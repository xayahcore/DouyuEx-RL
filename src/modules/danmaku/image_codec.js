// src/modules/danmaku/image_codec.js
(function () {
  'use strict';
  if (!globalThis.DYEXRL_NEXT) return;

  globalThis.DYEXRL_NEXT.registry.register('modules.danmaku.imageCodec', [], function () {

    var WHITE_LIST_HOSTS = ['douyucdn.cn', 'douyu.com'];

    function encodeImageUrl(url) {
      if (!url) return '';
      try {
        var u = new URL(url);
        var isValid = WHITE_LIST_HOSTS.some(function (h) { return u.hostname.endsWith(h); });
        if (!isValid) return url;
        return '[DouyuEx图片:' + encodeURIComponent(url) + ']';
      } catch (e) {
        return url;
      }
    }

    function decodeImageText(text) {
      if (!text || typeof text !== 'string') return text;
      return text.replace(/\[DouyuEx图片:([^\]]+)\]/g, function (match, p1) {
        try {
          var rawUrl = decodeURIComponent(p1);
          var u = new URL(rawUrl);
          var isValid = WHITE_LIST_HOSTS.some(function (h) { return u.hostname.endsWith(h); });
          if (!isValid) return match;
          return '<img src=\"' + rawUrl + '\" class=\"miuix-danmaku-inline-img\" style=\"max-height: 24px; vertical-align: middle; border-radius: 3px;\" />';
        } catch (e) {
          return match;
        }
      });
    }

    return {
      encodeImageUrl: encodeImageUrl,
      decodeImageText: decodeImageText
    };
  });
})();
