// src/modules/danmaku/collect.js
(function () {
  'use strict';
  if (!globalThis.DYEXRL_NEXT) return;

  globalThis.DYEXRL_NEXT.registry.register('modules.danmaku.collect', [
    'store.index',
    'adapters.chat',
    'ui.miuix'
  ], function (store, chatAdapter, miuix) {

    function addCollection(text) {
      if (!text || !text.trim()) return;
      var list = store.get('danmaku.collections') || [];
      // Deduplicate
      var filtered = list.filter(it => it.content !== text);
      filtered.unshift({
        id: Date.now(),
        content: text.trim(),
        createdAt: Date.now()
      });
      store.set('danmaku.collections', filtered);
      miuix.Toast('已收藏弹幕: ' + text.slice(0, 15), 'success');
    }

    function removeCollection(id) {
      var list = store.get('danmaku.collections') || [];
      var filtered = list.filter(it => it.id !== id);
      store.set('danmaku.collections', filtered);
    }

    function fillToChatInput(text) {
      chatAdapter.setChatText(text);
      miuix.Toast('已填入聊天框', 'info');
    }

    return {
      addCollection: addCollection,
      removeCollection: removeCollection,
      fillToChatInput: fillToChatInput
    };
  });
})();
