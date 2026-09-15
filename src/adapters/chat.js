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

    return {
      getChatInput: getChatInput,
      getSendButton: getSendButton,
      setChatText: setChatText,
      sendChatText: sendChatText
    };
  });
})();
