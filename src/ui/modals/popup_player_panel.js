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

        // 1. 如果存在原版全局同屏播放器执行函数，优先无缝直通
        if (typeof window.executePopupPlayer === 'function') {
          window.executePopupPlayer(url);
          miuix.Toast('已启动同屏播放', 'success');
          return;
        }

        // 2. 提取房间号并建立纯净同屏画中画浮窗
        var match = url.match(/(\d+)/);
        var targetRid = match ? match[1] : url;

        var randId = Date.now();
        var exDiv = document.createElement('div');
        exDiv.id = 'exVideoDiv' + randId;
        exDiv.style.cssText = 'position: fixed; top: 100px; right: 24px; width: 480px; height: 320px; z-index: 999999; background: #000; border-radius: 12px; box-shadow: 0 12px 36px rgba(0,0,0,0.5); overflow: hidden; display: flex; flex-direction: column; border: 1px solid rgba(255,255,255,0.2);';

        var header = document.createElement('div');
        header.style.cssText = 'height: 32px; background: rgba(30,41,59,0.95); display: flex; align-items: center; justify-content: space-between; padding: 0 10px; cursor: move; color: #fff; font-size: 12px; user-select: none;';
        header.innerHTML = '<span>同屏联播 · 房间 ' + targetRid + '</span><span id="exVideoClose' + randId + '" style="cursor: pointer; font-size: 16px; line-height: 1; padding: 2px 6px;">×</span>';
        exDiv.appendChild(header);

        var iframe = document.createElement('iframe');
        iframe.src = 'https://www.douyu.com/' + targetRid + '?exid=chun';
        iframe.style.cssText = 'flex: 1; width: 100%; border: none; background: #000;';
        exDiv.appendChild(iframe);

        document.body.appendChild(exDiv);

        // 简易拖拽手柄 (规范生命周期，防止 document 事件泄漏)
        var startX, startY, initLeft, initTop;
        function onMouseMove(e) {
          exDiv.style.left = (initLeft + e.clientX - startX) + 'px';
          exDiv.style.top = (initTop + e.clientY - startY) + 'px';
          exDiv.style.right = 'auto';
        }
        function onMouseUp() {
          document.removeEventListener('mousemove', onMouseMove);
          document.removeEventListener('mouseup', onMouseUp);
        }

        header.addEventListener('mousedown', function (e) {
          if (e.target.id === 'exVideoClose' + randId) return;
          startX = e.clientX;
          startY = e.clientY;
          var rect = exDiv.getBoundingClientRect();
          initLeft = rect.left;
          initTop = rect.top;
          document.addEventListener('mousemove', onMouseMove);
          document.addEventListener('mouseup', onMouseUp);
        });

        header.querySelector('#exVideoClose' + randId).addEventListener('click', function () {
          onMouseUp();
          exDiv.remove();
        });

        miuix.Toast('已启动同屏播放: 房间 ' + targetRid, 'success');
      });

      return panel;
    }

    return {
      createPopupPlayerPanel: createPopupPlayerPanel
    };
  });
})();
