// src/modules/danmaku/auto_reply.js
(function () {
  'use strict';
  if (!globalThis.DYEXRL_NEXT) return;

  globalThis.DYEXRL_NEXT.registry.register('modules.danmaku.autoReply', [
    'store.index',
    'adapters.chat'
  ], function (store, chatAdapter) {

    var lastReplyTime = 0;

    function handleIncomingDanmaku(text, senderUid) {
      var enabled = store.get('danmaku.autoReplyEnabled');
      if (!enabled || !text) return false;

      var now = Date.now();
      var cdSec = Number(store.get('danmaku.autoReplyCd') || 5);
      if (now - lastReplyTime < cdSec * 1000) return false;

      var rules = store.get('danmaku.autoReplyRules') || [];
      var matchedRule = null;

      if (Array.isArray(rules)) {
        matchedRule = rules.find(r => r.keyword && text.includes(r.keyword));
      } else if (typeof rules === 'object') {
        for (var kw in rules) {
          if (text.includes(kw)) {
            matchedRule = { keyword: kw, content: rules[kw] };
            break;
          }
        }
      }

      if (matchedRule && matchedRule.content) {
        lastReplyTime = now;
        chatAdapter.sendChatText(matchedRule.content);
        return true;
      }
      return false;
    }

    return {
      handleIncomingDanmaku: handleIncomingDanmaku
    };
  });
})();
