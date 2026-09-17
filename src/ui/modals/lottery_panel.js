// src/ui/modals/lottery_panel.js
(function () {
  'use strict';
  if (!globalThis.DYEXRL_NEXT) return;

  globalThis.DYEXRL_NEXT.registry.register('ui.modals.lotteryPanel', [
    'ui.miuix',
    'store.index',
    'modules.radar.lottery'
  ], function (miuix, store, lottery) {

    function createLotteryPanel() {
      var panel = miuix.Panel({
        id: 'lottery-panel',
        title: '全站抽奖',
        subtitle: '大奖红包实时监控与开奖雷达'
      });

      // Card 1: 监控设置
      var settingCard = document.createElement('div');
      settingCard.className = 'miuix-card';
      settingCard.innerHTML = `
        <div class="miuix-card__header" style="display: flex; justify-content: space-between; align-items: center;">
          <span class="miuix-card__title">雷达状态</span>
          <span style="font-size: 11px; padding: 2px 6px; border-radius: 4px; background: rgba(16, 185, 129, 0.1); color: #10b981; font-weight: 600;">正在监听</span>
        </div>
        <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 6px;">
          <label style="display: flex; align-items: center; gap: 6px; cursor: pointer; font-size: 12px;">
            <input type="checkbox" id="lottery-notify-switch" class="miuix-checkbox" />
            <span>开启大奖浮动通知</span>
          </label>
          <button type="button" id="lottery-refresh-btn" class="miuix-btn miuix-btn--secondary" style="padding: 3px 10px; font-size: 11.5px;">刷新列表</button>
        </div>
      `;
      panel.body.appendChild(settingCard);

      store.bindCheckbox('#lottery-notify-switch', 'radar.notifyPrize');

      // Card 2: 监控列表
      var listCard = document.createElement('div');
      listCard.className = 'miuix-card exlottery__wrap';
      listCard.style.flex = '1';
      listCard.style.display = 'flex';
      listCard.style.flexDirection = 'column';
      listCard.style.overflow = 'hidden';

      var listHeader = document.createElement('div');
      listHeader.className = 'miuix-card__header';
      listHeader.innerHTML = '<span class="miuix-card__title">近期广播大奖</span>';
      listCard.appendChild(listHeader);

      var listBox = document.createElement('div');
      listBox.id = 'lottery-list-box';
      listBox.className = 'miuix-scrollable';
      listBox.style.cssText = 'flex: 1; overflow-y: auto; max-height: 180px; padding: 4px 0; display: flex; flex-direction: column; gap: 6px;';
      listCard.appendChild(listBox);

      panel.body.appendChild(listCard);

      function renderList() {
        var prizes = lottery.getActivePrizes();
        if (!prizes || prizes.length === 0) {
          listBox.innerHTML = `
            <div style="text-align: center; color: #94a3b8; font-size: 11.5px; padding: 24px 0;">
              暂无进行中的全站大奖，雷达后台静默守护中...
            </div>
          `;
          return;
        }

        listBox.innerHTML = prizes.map(function (p) {
          return `
            <div style="display: flex; justify-content: space-between; align-items: center; padding: 6px 8px; background: rgba(0,0,0,0.02); border-radius: 6px; font-size: 11.5px;">
              <div style="display: flex; flex-direction: column; gap: 2px;">
                <span style="font-weight: 600; color: #0f172a;">${p.giftName || '超级大奖'}</span>
                <span style="font-size: 10px; color: #64748b;">送礼人: ${p.sender || '观众'} · 房间: ${p.rid}</span>
              </div>
              <a href="https://www.douyu.com/${p.rid}" target="_blank" class="miuix-btn miuix-btn--primary" style="padding: 2px 8px; font-size: 11px; text-decoration: none;">上车</a>
            </div>
          `;
        }).join('');
      }

      settingCard.querySelector('#lottery-refresh-btn').addEventListener('click', function () {
        renderList();
        miuix.Toast('抽奖雷达列表已刷新', 'info', 1000);
      });

      var origShow = panel.show;
      panel.show = function (anchorEl) {
        origShow(anchorEl);
        renderList();
      };

      return panel;
    }

    return {
      createLotteryPanel: createLotteryPanel
    };
  });
})();
