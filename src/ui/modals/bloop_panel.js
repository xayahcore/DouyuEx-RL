// src/ui/modals/bloop_panel.js
(function () {
  'use strict';
  if (!globalThis.DYEXRL_NEXT) return;

  globalThis.DYEXRL_NEXT.registry.register('ui.modals.bloopPanel', [
    'ui.miuix',
    'store.index',
    'adapters.chat'
  ], function (miuix, store, chatAdapter) {

    function createBloopPanel() {
      var panel = miuix.Panel({
        id: 'bloop-panel',
        title: '弹幕发送小助手',
        subtitle: '多行词库循环、随机顺序与定时发言'
      });

      var card = document.createElement('div');
      card.className = 'miuix-card bloop__card';
      card.innerHTML = `
        <div style="display: flex; flex-direction: column; gap: 8px;">
          <div style="display: flex; justify-content: space-between; align-items: center;">
            <span style="font-size: 12px; font-weight: 700; color: #1e293b;">发言词库 (一行一条)</span>
            <span style="font-size: 11px; color: #94a3b8;">支持组合防拦截</span>
          </div>
          <textarea id="bloop-text-corpus" rows="5" style="width: 100%; box-sizing: border-box; padding: 6px 8px; border-radius: 8px; border: 1px solid #cbd5e1; font-size: 11.5px; resize: none; font-family: sans-serif;">666666
这波太帅了！
主播技术拉满！
学到了学到了</textarea>

          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px;">
            <label style="display: flex; align-items: center; gap: 4px; font-size: 11.5px;">
              <span>间隔 (秒):</span>
              <input type="number" id="bloop-input-interval" value="5" min="3" style="width: 45px; padding: 2px 4px; border-radius: 4px; border: 1px solid #cbd5e1;" />
            </label>
            <label style="display: flex; align-items: center; gap: 4px; font-size: 11.5px;">
              <input type="checkbox" id="bloop-check-random" class="miuix-checkbox" />
              <span>随机乱序</span>
            </label>
          </div>

          <div style="display: flex; gap: 8px; margin-top: 4px;">
            <button type="button" id="bloop-btn-start" class="miuix-btn miuix-btn--primary" style="flex: 1; padding: 7px 0; font-size: 12px; font-weight: 700;">开始自动发送</button>
            <button type="button" id="bloop-btn-stop" class="miuix-btn" style="flex: 1; padding: 7px 0; font-size: 12px; color: #ef4444; display: none;">停止发送</button>
          </div>
        </div>
      `;
      panel.body.appendChild(card);

      var isRunning = false;
      var loopTimer = null;
      var startBtn = card.querySelector('#bloop-btn-start');
      var stopBtn = card.querySelector('#bloop-btn-stop');
      var corpusEl = card.querySelector('#bloop-text-corpus');
      var intervalEl = card.querySelector('#bloop-input-interval');
      var randomEl = card.querySelector('#bloop-check-random');

      function stopLoop() {
        isRunning = false;
        if (loopTimer) {
          clearInterval(loopTimer);
          loopTimer = null;
        }
        startBtn.style.display = 'block';
        stopBtn.style.display = 'none';
        miuix.Toast('弹幕助手已停止', 'info', 1000);
      }

      function startLoop() {
        var lines = corpusEl.value.split('\n').map(function (s) { return s.trim(); }).filter(Boolean);
        if (!lines.length) return miuix.Toast('词库不能为空', 'warning');

        var sec = Math.max(3, Number(intervalEl.value) || 5);
        isRunning = true;
        startBtn.style.display = 'none';
        stopBtn.style.display = 'block';

        var idx = 0;
        loopTimer = setInterval(function () {
          if (!isRunning) return;
          var text = '';
          if (randomEl.checked) {
            text = lines[Math.floor(Math.random() * lines.length)];
          } else {
            text = lines[idx % lines.length];
            idx++;
          }
          chatAdapter.sendChatText(text);
        }, sec * 1000);

        miuix.Toast('弹幕小助手已启动 (每 ' + sec + ' 秒一条)', 'success');
      }

      startBtn.addEventListener('click', startLoop);
      stopBtn.addEventListener('click', stopLoop);

      return panel;
    }

    return {
      createBloopPanel: createBloopPanel
    };
  });
})();
