// src/platform/capabilities.js
(function () {
  'use strict';
  if (!globalThis.DYEXRL_NEXT) return;

  globalThis.DYEXRL_NEXT.registry.register('platform.capabilities', [], function () {
    var win = typeof window !== 'undefined' ? window : globalThis;

    var caps = {
      hasDocumentPictureInPicture: typeof win.documentPictureInPicture !== 'undefined' && typeof win.documentPictureInPicture.requestWindow === 'function',
      hasWeakMap: typeof WeakMap === 'function',
      hasOffscreenCanvas: typeof OffscreenCanvas === 'function',
      hasPerformanceMemory: typeof performance !== 'undefined' && typeof performance.memory === 'object' && performance.memory !== null,
      hasGMCookie: typeof GM_cookie === 'function',
      hasGMXmlHttpRequest: typeof GM_xmlhttpRequest === 'function',
      hasGMSetClipboard: typeof GM_setClipboard === 'function',
      isEdge: typeof navigator !== 'undefined' && /Edg/i.test(navigator.userAgent),
      isChromium: typeof navigator !== 'undefined' && /Chrome|Chromium/i.test(navigator.userAgent)
    };

    return caps;
  });
})();
