// src/adapters/chat.js
(function () {
  'use strict';
  if (!globalThis.DYEXRL_NEXT) return;

  globalThis.DYEXRL_NEXT.registry.register('adapters.chat', [], function () {
    function getChatInput() {
      return document.querySelector('textarea.ChatSend-txt') || document.querySelector('div.ChatSend-txt');
    }

    function getSendButton() {
      return document.querySelector('.ChatSend-button');
    }

    function setChatText(text) {
      var input = getChatInput();
      if (!input) return false;

      var isDiv = input.tagName.toLowerCase() === 'div';
      if (isDiv) {
        input.innerText = text;
      } else {
        input.value = text;
      }
      input.dispatchEvent(new Event('input', { bubbles: true }));
      return true;
    }

    function sendChatText(text) {
      if (!setChatText(text)) return false;
      var btn = getSendButton();
      if (btn) {
        btn.click();
        return true;
      }
      return false;
    }

    var chatListeners = new Set();
    var isObserverHooked = false;

    function dispatchChat(msg) {
      if (!msg) return;
      chatListeners.forEach(function (fn) {
        try { fn(msg); } catch (e) { console.error('[NEXT Chat] Listener error:', e); }
      });
    }

    function initChatObserver() {
      if (isObserverHooked || typeof document === 'undefined' || !document.body) return;
      var chatContainer = document.querySelector('.Barrage-main') ||
                          document.querySelector('.Barrage-list') ||
                          document.querySelector('.layout-Player-chat');
      if (!chatContainer) return;

      var obs = new MutationObserver(function (mutations) {
        mutations.forEach(function (mut) {
          mut.addedNodes.forEach(function (node) {
            if (node.nodeType !== 1) return;
            var contentEl = node.querySelector('.Barrage-content') || node.querySelector('[class*=\"content\"]');
            var nickEl = node.querySelector('.Barrage-nickName') || node.querySelector('.Barrage-nick') || node.querySelector('[class*=\"nick\"]');
            var text = contentEl ? contentEl.textContent.trim() : node.textContent.trim();
            var nickname = nickEl ? nickEl.textContent.trim() : '';
            var uid = node.getAttribute('data-uid') || '';

            if (text) {
              dispatchChat({ text: text, nickname: nickname, uid: uid, node: node });
            }
          });
        });
      });

      obs.observe(chatContainer, { childList: true, subtree: true });
      isObserverHooked = true;
    }

    function onChat(fn) {
      if (typeof fn === 'function') {
        chatListeners.add(fn);
        initChatObserver();
      }
      return function unsubscribe() {
        chatListeners.delete(fn);
      };
    }

    return {
      getChatInput: getChatInput,
      getSendButton: getSendButton,
      setChatText: setChatText,
      sendChatText: sendChatText,
      onChat: onChat,
      dispatchChat: dispatchChat
    };
  });
})();
