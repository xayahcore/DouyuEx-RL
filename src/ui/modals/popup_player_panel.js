// src/ui/modals/popup_player_panel.js
(function () {
  'use strict';
  if (!globalThis.DYEXRL_NEXT) return;

  globalThis.DYEXRL_NEXT.registry.register('ui.modals.popupPlayerPanel', [
    'ui.miuix',
    'store.index',
    'modules.media.pip'
  ], function (miuix, store, pipModule) {

    function createPopupPlayerPanel() {
      var panel = miuix.Panel({
        id: 'popup-player-panel',
        title: '同屏播放器',
        subtitle: '多房间分屏联播与极速画中画'
      });

      var card = document.createElement('div');
      card.className = 'miuix-card';
      card.innerHTML = `
        <div style="display: flex; flex-direction: column; gap: 12px;">
          <div>
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
              <span style="font-size: 12px; font-weight: 700; color: #1e293b;">直播流或房间地址</span>
              <button type="button" id="popup-btn-paste" style="padding: 2px 8px; font-size: 11px; border-radius: 4px; border: 1px solid rgba(0, 102, 255, 0.3); background: rgba(0, 102, 255, 0.08); color: #0066FF; cursor: pointer;">粘贴</button>
            </div>
            <input type="text" id="popup-input-room" value="https://www.douyu.com/4042402" style="width: 100%; box-sizing: border-box; padding: 7px 10px; border-radius: 8px; border: 1px solid #cbd5e1; font-size: 12px; font-family: monospace;" />
          </div>

          <div>
            <div style="font-size: 12px; font-weight: 700; color: #1e293b; margin-bottom: 6px;">同屏播放模式</div>
            <div style="display: flex; background: #f1f5f9; padding: 3px; border-radius: 8px; gap: 4px;">
              <div id="mode-fast-stream" class="is-active" style="flex: 1; text-align: center; padding: 6px 0; font-size: 11.5px; font-weight: 600; border-radius: 6px; cursor: pointer; background: #ffffff; color: #0066FF; box-shadow: 0 1px 3px rgba(0,0,0,0.08);">无弹幕极速流 (推荐)</div>
              <div id="mode-full-danmaku" style="flex: 1; text-align: center; padding: 6px 0; font-size: 11.5px; font-weight: 600; border-radius: 6px; cursor: pointer; color: #64748b;">全功能有弹幕</div>
            </div>
          </div>

          <button type="button" id="popup-btn-load" class="miuix-btn miuix-btn--primary" style="width: 100%; padding: 9px 0; font-size: 13px; font-weight: 700; margin-top: 4px;">载入同屏流</button>
        </div>
      `;
      panel.body.appendChild(card);

      var isFastMode = true;
      var fastBtn = card.querySelector('#mode-fast-stream');
      var fullBtn = card.querySelector('#mode-full-danmaku');
      var roomInput = card.querySelector('#popup-input-room');
      var pasteBtn = card.querySelector('#popup-btn-paste');
      var loadBtn = card.querySelector('#popup-btn-load');

      fastBtn.addEventListener('click', function () {
        isFastMode = true;
        fastBtn.style.background = '#ffffff';
        fastBtn.style.color = '#0066FF';
        fastBtn.style.boxShadow = '0 1px 3px rgba(0,0,0,0.08)';
        fullBtn.style.background = 'transparent';
        fullBtn.style.color = '#64748b';
        fullBtn.style.boxShadow = 'none';
      });

      fullBtn.addEventListener('click', function () {
        isFastMode = false;
        fullBtn.style.background = '#ffffff';
        fullBtn.style.color = '#0066FF';
        fullBtn.style.boxShadow = '0 1px 3px rgba(0,0,0,0.08)';
        fastBtn.style.background = 'transparent';
        fastBtn.style.color = '#64748b';
        fastBtn.style.boxShadow = 'none';
      });

      pasteBtn.addEventListener('click', async function () {
        try {
          if (navigator.clipboard && navigator.clipboard.readText) {
            var text = await navigator.clipboard.readText();
            if (text) roomInput.value = text.trim();
          }
        } catch (e) {}
      });

      loadBtn.addEventListener('click', function () {
        var url = roomInput.value.trim();
        if (!url) return miuix.Toast('请输入有效的房间号或直播地址', 'warning');
        pipModule.togglePiP();
        miuix.Toast('已启动同屏画中画', 'success');
      });

      return panel;
    }

    return {
      createPopupPlayerPanel: createPopupPlayerPanel
    };
  });
})();
