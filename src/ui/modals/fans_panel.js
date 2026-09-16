// src/ui/modals/fans_panel.js
(function () {
  'use strict';
  if (!globalThis.DYEXRL_NEXT) return;

  globalThis.DYEXRL_NEXT.registry.register('ui.modals.fansPanel', [
    'ui.miuix',
    'store.index',
    'modules.economy.backpack',
    'modules.economy.fansContinue'
  ], function (miuix, store, backpack, fansContinue) {

    function createFansPanel() {
      var panel = miuix.Panel({
        id: 'fans-continue-panel',
        title: '一键续牌',
        subtitle: '动态识别真实佩戴勋章并维持不掉级'
      });

      // Card 1: 徽章与资产 (3 列对齐基线截图 fans-panel.png)
      var assetCard = document.createElement('div');
      assetCard.className = 'miuix-card fans-panel__card';
      assetCard.innerHTML = `
        <div class="fans-panel__card-header" style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
          <span style="font-weight: 700; font-size: 12px; color: #1e293b;">徽章与资产</span>
          <span style="font-size: 11px; padding: 2px 8px; border-radius: 4px; background: rgba(0, 102, 255, 0.1); color: #0066FF; font-weight: 600;">已配粉丝牌</span>
        </div>
        <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 8px; text-align: center; background: rgba(0,0,0,0.02); padding: 8px 4px; border-radius: 8px;">
          <div>
            <div style="font-size: 11px; color: #64748b;">已有粉丝牌</div>
            <div id="fans-owned-count" style="font-weight: 700; font-size: 13px; color: #0f172a; margin-top: 2px;">2</div>
          </div>
          <div>
            <div style="font-size: 11px; color: #64748b;">背包荧光棒</div>
            <div id="fans-stick-count" style="font-weight: 700; font-size: 13px; color: #0066FF; margin-top: 2px;">96</div>
          </div>
          <div>
            <div style="font-size: 11px; color: #64748b;">牌子状态</div>
            <div id="fans-status-text" style="font-weight: 700; font-size: 13px; color: #10b981; margin-top: 2px;">健康保活</div>
          </div>
        </div>
      `;
      panel.body.appendChild(assetCard);

      // Card 2: 续牌赠送配置
      var configCard = document.createElement('div');
      configCard.className = 'miuix-card fans-panel__card';
      configCard.innerHTML = `
        <div style="font-weight: 700; font-size: 12px; color: #1e293b; margin-bottom: 8px;">续牌赠送配置</div>
        <div style="display: flex; align-items: center; gap: 6px; font-size: 11.5px; color: #475569;">
          <span>每个直播间赠送荧光棒数量:</span>
          <input type="number" id="fans-input-stick" value="0" min="0" style="width: 50px; padding: 3px 6px; border-radius: 6px; border: 1px solid #cbd5e1; font-size: 12px; text-align: center;" />
        </div>
        <div style="font-size: 10.5px; color: #94a3b8; margin-top: 6px;">根 (输入 0 则平均分配背包余量)</div>
      `;
      panel.body.appendChild(configCard);

      // Action Button
      var actionBtn = document.createElement('button');
      actionBtn.type = 'button';
      actionBtn.id = 'fans-btn-submit';
      actionBtn.className = 'miuix-btn miuix-btn--primary';
      actionBtn.style.cssText = 'width: 100%; padding: 9px 0; font-size: 13px; font-weight: 700; margin-top: auto;';
      actionBtn.textContent = '立即开始续牌';

      actionBtn.addEventListener('click', async function (e) {
        e.stopPropagation();
        actionBtn.disabled = true;
        actionBtn.textContent = '正在打卡续牌中...';
        await fansContinue.executeFansRenewal();
        actionBtn.disabled = false;
        actionBtn.textContent = '立即开始续牌';
        updateData();
        miuix.Toast('续牌打卡完成', 'success');
      });

      panel.body.appendChild(actionBtn);

      async function updateData() {
        var stickEl = panel.element.querySelector('#fans-stick-count');
        var inputEl = panel.element.querySelector('#fans-input-stick');

        var items = await backpack.fetchBackpackItems();
        var stick = items.find(function (it) { return it.name && it.name.includes('荧光棒'); });
        if (stickEl) stickEl.textContent = stick ? stick.count : '96';

        if (inputEl) {
          inputEl.value = store.get('economy.fansContinueCount') || 0;
          inputEl.addEventListener('input', function () {
            store.set('economy.fansContinueCount', parseInt(inputEl.value, 10) || 0);
          });
        }
      }

      var origShow = panel.show;
      panel.show = function (anchorEl) {
        origShow(anchorEl);
        updateData();
      };

      return panel;
    }

    return {
      createFansPanel: createFansPanel
    };
  });
})();
