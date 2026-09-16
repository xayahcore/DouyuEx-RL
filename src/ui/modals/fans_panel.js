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
        subtitle: '维持粉丝牌不掉级'
      });

      // Card 1: 真实佩戴牌子检测与资产展示
      var assetCard = document.createElement('div');
      assetCard.className = 'miuix-card';
      assetCard.innerHTML = `
        <div class="miuix-card__header">
          <span class="miuix-card__title">当前粉丝牌</span>
          <span id="fans-panel-badge-name" style="font-size: 11px; font-weight: 700; color: #0066FF;">当前粉丝牌</span>
        </div>
        <div style="display: flex; justify-content: space-between; font-size: 11px; color: #64748b;">
          <span>背包荧光棒存量：</span>
          <span id="fans-panel-stick-count" style="font-weight: 700; color: #0f172a;">--</span>
        </div>
      `;
      panel.body.appendChild(assetCard);

      // Card 2: 赠送数量设置
      var inputCard = document.createElement('div');
      inputCard.className = 'miuix-card';
      inputCard.innerHTML = `
        <div class="miuix-card__header">
          <span class="miuix-card__title">续牌赠送数量</span>
        </div>
        <div style="display: flex; align-items: center; justify-content: space-between; gap: 8px;">
          <input type="number" id="fans-panel-stick-input" class="miuix-input" min="0" style="width: 80px;" value="0" />
          <span style="font-size: 10.5px; color: #94a3b8;">[留0自动均分]</span>
        </div>
      `;
      panel.body.appendChild(inputCard);

      // Action Button
      var actionWrap = document.createElement('div');
      actionWrap.style.display = 'flex';
      actionWrap.style.justifyContent = 'flex-end';
      actionWrap.style.marginTop = 'auto';

      var submitBtn = document.createElement('button');
      submitBtn.type = 'button';
      submitBtn.className = 'miuix-btn miuix-btn-primary';
      submitBtn.style.width = '100%';
      submitBtn.textContent = '一键赠送续牌';
      submitBtn.addEventListener('click', async function (e) {
        e.stopPropagation();
        submitBtn.disabled = true;
        submitBtn.textContent = '正在打卡...';
        await fansContinue.executeFansRenewal();
        submitBtn.disabled = false;
        submitBtn.textContent = '一键赠送续牌';
        updateData();
      });
      actionWrap.appendChild(submitBtn);
      panel.body.appendChild(actionWrap);

      async function updateData() {
        var badgeEl = panel.element.querySelector('#fans-panel-badge-name');
        var stickEl = panel.element.querySelector('#fans-panel-stick-count');
        var inputEl = panel.element.querySelector('#fans-panel-stick-input');

        var realBadge = store.get('runtime.user.activeBadgeName') || '当前佩戴';
        if (badgeEl) badgeEl.textContent = realBadge;

        var items = await backpack.fetchBackpackItems();
        var stick = items.find(it => it.name && it.name.includes('荧光棒'));
        if (stickEl) stickEl.textContent = stick ? stick.count + ' 个' : '0 个';

        if (inputEl) {
          inputEl.value = store.get('economy.fansContinueCount') || 0;
          inputEl.addEventListener('input', function () {
            store.set('economy.fansContinueCount', parseInt(inputEl.value, 10) || 0);
          });
        }
      }

      var originalShow = panel.show;
      panel.show = function (anchorEl) {
        originalShow(anchorEl);
        updateData();
      };

      return panel;
    }

    return {
      createFansPanel: createFansPanel
    };
  });
})();
