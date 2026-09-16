// src/modules/danmaku/tail.js
(function () {
  'use strict';
  if (!globalThis.DYEXRL_NEXT) return;

  globalThis.DYEXRL_NEXT.registry.register('modules.danmaku.tail', [
    'store.index',
    'adapters.chat'
  ], function (store, chatAdapter) {

    function appendTailToText(rawText) {
      var conf = store.get('danmaku.tail') || {};
      if (!conf.enabled || !conf.text) return rawText;

      var tail = String(conf.text);
      var type = String(conf.type || '2'); // '1': 前缀, '2': 后缀
      var t = String(rawText || '');

      if (!t.trim()) return t;

      if (type === '1') {
        if (!t.startsWith(tail)) return tail + t;
      } else {
        if (!t.endsWith(tail)) return t + tail;
      }
      return t;
    }

    function initTailListener() {
      var isComposing = false;

      document.addEventListener('compositionstart', function () {
        isComposing = true;
      }, true);

      document.addEventListener('compositionend', function () {
        isComposing = false;
      }, true);

      document.addEventListener('keydown', function (e) {
        if (e.key !== 'Enter' || e.shiftKey || isComposing) return;
        var input = chatAdapter.getChatInput();
        if (!input || !input.contains(e.target)) return;

        var conf = store.get('danmaku.tail') || {};
        if (!conf.enabled || !conf.text) return;

        var isDiv = input.tagName.toLowerCase() === 'div';
        var currentText = isDiv ? input.innerText : input.value;
        var withTail = appendTailToText(currentText);

        if (withTail !== currentText) {
          if (isDiv) input.innerText = withTail;
          else input.value = withTail;
          input.dispatchEvent(new Event('input', { bubbles: true }));
        }
      }, true);
    }

    return {
      appendTailToText: appendTailToText,
      initTailListener: initTailListener
    };
  });
})();
