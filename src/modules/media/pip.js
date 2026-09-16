// src/modules/media/pip.js
(function () {
  'use strict';
  if (!globalThis.DYEXRL_NEXT) return;

  globalThis.DYEXRL_NEXT.registry.register('modules.media.pip', [
    'adapters.player',
    'adapters.chat',
    'ui.miuix',
    'store.index'
  ], function (playerAdapter, chatAdapter, miuix, store) {

    var isFloating = false;
    var floatContainer = null;

    async function toggleNativePip() {
      var video = playerAdapter.getVideoElement();
      if (!video) {
        miuix.Toast('未检测到正在播放的视频元素', 'error');
        return false;
      }

      if (document.pictureInPictureElement) {
        await document.exitPictureInPicture();
        return false;
      } else if (document.pictureInPictureEnabled && typeof video.requestPictureInPicture === 'function') {
        try {
          await video.requestPictureInPicture();
          miuix.Toast('已开启画中画模式', 'info');
          return true;
        } catch (e) {
          console.warn('[NEXT PIP] Native PiP failed, fallback to modal:', e);
        }
      }
      return toggleFloatingWindow();
    }

    function toggleFloatingWindow() {
      if (isFloating && floatContainer) {
        floatContainer.remove();
        floatContainer = null;
        isFloating = false;
        return false;
      }

      isFloating = true;
      floatContainer = document.createElement('div');
      floatContainer.className = 'miuix-panel';
      floatContainer.style.position = 'fixed';
      floatContainer.style.bottom = '80px';
      floatContainer.style.right = '24px';
      floatContainer.style.width = '360px';
      floatContainer.style.height = '240px';
      floatContainer.style.zIndex = '99999';
      floatContainer.style.display = 'flex';
      floatContainer.style.flexDirection = 'column';

      floatContainer.innerHTML = `
        <div class="miuix-panel__header" style="cursor: move;">
          <span class="miuix-panel__title" style="font-size: 12px;">画中画独立小窗</span>
          <button type="button" class="miuix-panel__close" id="pip-close-btn">&times;</button>
        </div>
        <div style="flex: 1; background: #000; display: flex; align-items: center; justify-content: center; color: #fff; font-size: 11px;">
          [独立视窗播放流]
        </div>
        <div style="display: flex; gap: 4px; padding: 6px; background: rgba(255,255,255,0.9);">
          <input type="text" id="pip-chat-input" class="miuix-input" style="flex: 1;" placeholder="小窗快捷发言..." />
          <button type="button" id="pip-chat-send" class="miuix-btn miuix-btn-primary" style="padding: 2px 10px;">发送</button>
        </div>
      `;

      var closeBtn = floatContainer.querySelector('#pip-close-btn');
      if (closeBtn) closeBtn.addEventListener('click', toggleFloatingWindow);

      var sendBtn = floatContainer.querySelector('#pip-chat-send');
      var chatInp = floatContainer.querySelector('#pip-chat-input');

      function doSend() {
        if (!chatInp || !chatInp.value.trim()) return;
        chatAdapter.sendChatText(chatInp.value.trim());
        chatInp.value = '';
        miuix.Toast('小窗弹幕已发送', 'success', 1500);
      }

      if (sendBtn) sendBtn.addEventListener('click', doSend);
      if (chatInp) chatInp.addEventListener('keydown', function (e) {
        if (e.key === 'Enter') doSend();
      });

      document.body.appendChild(floatContainer);
      return true;
    }

    return {
      toggleNativePip: toggleNativePip,
      toggleFloatingWindow: toggleFloatingWindow,
      get isFloating() { return isFloating; }
    };
  });
})();
