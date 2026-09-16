// src/ui/modals/setting_panel.js
(function () {
  'use strict';
  if (!globalThis.DYEXRL_NEXT) return;

  globalThis.DYEXRL_NEXT.registry.register('ui.modals.settingPanel', [
    'ui.miuix',
    'store.index',
    'modules.system.hardware',
    'modules.system.account'
  ], function (miuix, store, hardware, account) {

    function createSettingPanel() {
      var panel = miuix.Panel({
        id: 'setting-panel',
        title: '全局设置',
        subtitle: '核心防护、流媒体与系统配置'
      });

      // 1. 性能看板 (L3-06)
      var perfAccordion = miuix.Accordion({
        id: 'perf__panel',
        title: '推流性能与硬件看板',
        content: [
          (function () {
            var box = document.createElement('div');
            box.style.display = 'flex';
            box.style.flexDirection = 'column';
            box.style.gap = '4px';
            box.style.fontSize = '11px';

            var info = hardware.inspectStreamInfo();
            box.innerHTML = `
              <div style="display: flex; justify-content: space-between;"><span>当前分辨率:</span><b>${info.resolution}</b></div>
              <div style="display: flex; justify-content: space-between;"><span>推流码率:</span><b>${info.bitrate}</b></div>
              <div style="display: flex; justify-content: space-between;"><span>识别推流软件:</span><b>${info.software}</b></div>
              <div style="display: flex; justify-content: space-between;"><span>WebRTC P2P 状态:</span><b style="color: #10b981;">已阻断 (纯CDN拉流)</b></div>
            `;
            return box;
          })()
        ]
      });
      panel.body.appendChild(perfAccordion.element);

      // 2. 核心功能开关卡片 (Card 2)
      var coreCard = document.createElement('div');
      coreCard.className = 'miuix-card';
      coreCard.innerHTML = `
        <div class="miuix-card__header"><span class="miuix-card__title">核心体验设置</span></div>
        <div style="display: flex; flex-direction: column; gap: 8px;">
          <label style="display: flex; justify-content: space-between; align-items: center; cursor: pointer;">
            <span style="font-size: 11px;">首流原画强锁 (12s免二次切流)</span>
            <input type="checkbox" id="set-lock-quality" checked />
          </label>
          <label style="display: flex; justify-content: space-between; align-items: center; cursor: pointer;">
            <span style="font-size: 11px;">WebRTC P2P 强制阻断</span>
            <input type="checkbox" id="set-block-p2p" checked />
          </label>
          <label style="display: flex; justify-content: space-between; align-items: center; cursor: pointer;">
            <span style="font-size: 11px;">300天铁粉红字标识</span>
            <input type="checkbox" id="set-fans-highlight" checked />
          </label>
          <label style="display: flex; justify-content: space-between; align-items: center; cursor: pointer;">
            <span style="font-size: 11px;">自动拾取房间红包/宝箱</span>
            <input type="checkbox" id="set-auto-pick" checked />
          </label>
        </div>
      `;
      panel.body.appendChild(coreCard);

      // 3. 多账号管理与重置卡片 (Card 3)
      var accCard = document.createElement('div');
      accCard.className = 'miuix-card';
      accCard.innerHTML = `
        <div class="miuix-card__header"><span class="miuix-card__title">配置与账号</span></div>
        <div style="display: flex; gap: 8px;">
          <button type="button" id="set-btn-acc" class="miuix-btn" style="flex: 1;">账号管理</button>
          <button type="button" id="set-btn-reset" class="miuix-btn" style="flex: 1; color: #ef4444;">重置所有设置</button>
        </div>
      `;
      panel.body.appendChild(accCard);

      accCard.querySelector('#set-btn-reset')?.addEventListener('click', async () => {
        var conf = await miuix.Dialog({
          mode: 'confirm',
          title: '重置确认',
          message: '确定清空所有自定义配置并恢复初始状态吗？'
        });
        if (conf.confirmed) {
          store.reset();
          miuix.Toast('已恢复初始默认配置', 'success');
        }
      });

      return panel;
    }

    return {
      createSettingPanel: createSettingPanel
    };
  });
})();
