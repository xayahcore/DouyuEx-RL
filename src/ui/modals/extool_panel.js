// src/ui/modals/extool_panel.js
(function () {
  'use strict';
  if (!globalThis.DYEXRL_NEXT) return;

  globalThis.DYEXRL_NEXT.registry.register('ui.modals.extoolPanel', [
    'ui.miuix',
    'ui.icons',
    'ui.giftPicker',
    'store.index',
    'modules.economy.backpack',
    'modules.radar.redpacket'
  ], function (miuix, icons, giftPicker, store, backpack, redpacket) {

    function createExtoolPanel() {
      var panel = miuix.Panel({
        id: 'extool-panel',
        title: '扩展功能',
        subtitle: '核心画质性能、打榜送礼与自动化工具'
      });

      // 1. 播放与性能卡片 (L3-10 / perf-panel)
      var perfCard = document.createElement('div');
      perfCard.className = 'miuix-card extool__player_perf';
      perfCard.innerHTML = `
        <div class="miuix-card__header" style="display: flex; justify-content: space-between; align-items: center;">
          <span class="miuix-card__title">播放与性能</span>
          <span style="font-size: 11px; padding: 2px 6px; border-radius: 4px; background: rgba(0, 102, 255, 0.1); color: #0066FF; font-weight: 600;">原生极清</span>
        </div>
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-top: 6px;">
          <label style="display: flex; align-items: center; gap: 6px; cursor: pointer; font-size: 12px;">
            <input type="checkbox" id="extool-highest-quality" class="miuix-checkbox" />
            <span>自动最高画质</span>
          </label>
          <label style="display: flex; align-items: center; gap: 6px; cursor: pointer; font-size: 12px;">
            <input type="checkbox" id="extool-fullscreen" class="miuix-checkbox" />
            <span>自动网页全屏</span>
          </label>
          <label style="display: flex; align-items: center; gap: 6px; cursor: pointer; font-size: 12px;">
            <input type="checkbox" id="extool-block-p2p" class="miuix-checkbox" />
            <span>阻止p2p上传</span>
          </label>
          <label style="display: flex; align-items: center; gap: 6px; cursor: pointer; font-size: 12px;">
            <input type="checkbox" id="extool-tabswitch" class="miuix-checkbox" />
            <span>防页签冻结</span>
          </label>
        </div>
      `;
      panel.body.appendChild(perfCard);

      // 双向绑定四个核心性能开关
      store.bindCheckbox('#extool-highest-quality', 'core.quality.highestVideoQuality');
      store.bindCheckbox('#extool-fullscreen', 'system.settings.fullScreen');
      store.bindCheckbox('#extool-block-p2p', 'core.p2p.blockUpload');
      store.bindCheckbox('#extool-tabswitch', 'media.background.preventTabFreeze');

      // 2. 打榜送礼卡片 (L3-07 / extool__sendgift)
      var sendGiftCard = document.createElement('div');
      sendGiftCard.className = 'miuix-card extool__sendgift';
      sendGiftCard.innerHTML = `
        <div class="miuix-card__header" style="display: flex; justify-content: space-between; align-items: center;">
          <span class="miuix-card__title">打榜送礼</span>
          <span style="font-size: 11px; color: #94a3b8;">[批量打榜, 任意礼物]</span>
        </div>
        <div class="ex-gift-pick-trigger" id="extool__sendgift_trigger" style="display: flex; align-items: center; gap: 8px; padding: 8px 12px; background: rgba(0, 102, 255, 0.05); border: 1px solid rgba(0, 102, 255, 0.2); border-radius: 8px; cursor: pointer; margin-top: 6px;">
          <span id="extool-sendgift-icon" style="font-size: 16px;">🚀</span>
          <span id="extool-sendgift-name" style="font-weight: 700; font-size: 12px; color: #0066FF;">超级火箭</span>
          <span id="extool-sendgift-price" style="font-size: 11px; padding: 1px 6px; border-radius: 4px; background: rgba(0, 102, 255, 0.15); color: #0066FF;">2000 鱼翅</span>
          <span style="margin-left: auto; font-size: 10px; color: #94a3b8;">▼</span>
          <input type="hidden" id="extool-sendgift-id" value="2000" />
        </div>
        <div style="display: flex; align-items: center; gap: 8px; margin-top: 8px;">
          <label style="display: flex; align-items: center; gap: 4px; font-size: 11.5px;">
            <span>数量:</span>
            <input type="number" id="extool-sendgift-cnt" value="1" min="1" style="width: 50px; padding: 3px 6px; border-radius: 6px; border: 1px solid #cbd5e1; font-size: 11.5px;" />
          </label>
          <label style="display: flex; align-items: center; gap: 4px; font-size: 11.5px;">
            <span>间隔:</span>
            <input type="number" id="extool-sendgift-interval" value="0" min="0" style="width: 50px; padding: 3px 6px; border-radius: 6px; border: 1px solid #cbd5e1; font-size: 11.5px;" />
            <span>ms</span>
          </label>
          <button type="button" id="extool-sendgift-btn" class="miuix-btn miuix-btn--primary" style="margin-left: auto; padding: 4px 16px; font-size: 12px;">送出</button>
        </div>
      `;
      panel.body.appendChild(sendGiftCard);

      // 点击展开 540x410 礼物选择器 (房间模式)
      sendGiftCard.querySelector('#extool__sendgift_trigger').addEventListener('click', function (e) {
        e.stopPropagation();
        giftPicker.open('room', function (gift) {
          if (!gift) return;
          sendGiftCard.querySelector('#extool-sendgift-name').textContent = gift.name;
          sendGiftCard.querySelector('#extool-sendgift-price').textContent = gift.price ? (gift.price + ' 鱼翅') : '已选';
          sendGiftCard.querySelector('#extool-sendgift-id').value = gift.id;
          miuix.Toast('已选择打榜礼物: ' + gift.name, 'info', 1200);
        });
      });

      // 3. 背包送礼卡片 (L3-08 / extool__clearbag)
      var clearbagCard = document.createElement('div');
      clearbagCard.className = 'miuix-card extool__clearbag';
      clearbagCard.innerHTML = `
        <div class="miuix-card__header" style="display: flex; justify-content: space-between; align-items: center;">
          <span class="miuix-card__title">背包送礼</span>
          <span style="font-size: 11px; color: #94a3b8;">[速度适中, 间隔>0.1s]</span>
        </div>
        <div class="ex-gift-pick-trigger" id="extool__clearbag_trigger" style="display: flex; align-items: center; gap: 8px; padding: 8px 12px; background: rgba(16, 185, 129, 0.05); border: 1px solid rgba(16, 185, 129, 0.2); border-radius: 8px; cursor: pointer; margin-top: 6px;">
          <span style="font-size: 16px;">🎒</span>
          <span id="extool-clearbag-name" style="font-weight: 700; font-size: 12px; color: #10b981;">粉丝荧光棒</span>
          <span id="extool-clearbag-tag" style="font-size: 11px; padding: 1px 6px; border-radius: 4px; background: rgba(16, 185, 129, 0.15); color: #10b981;">点击选择</span>
          <span style="margin-left: auto; font-size: 10px; color: #94a3b8;">▼</span>
          <input type="hidden" id="extool-clearbag-id" value="268" />
        </div>
        <div style="display: flex; align-items: center; gap: 8px; margin-top: 8px;">
          <label style="display: flex; align-items: center; gap: 4px; font-size: 11.5px;">
            <span>数量:</span>
            <input type="number" id="extool-clearbag-cnt" value="1" min="1" style="width: 50px; padding: 3px 6px; border-radius: 6px; border: 1px solid #cbd5e1; font-size: 11.5px;" />
          </label>
          <button type="button" id="extool-clearbag-btn" class="miuix-btn miuix-btn--primary" style="margin-left: auto; padding: 4px 16px; font-size: 12px; background: #10b981;">送出</button>
        </div>
      `;
      panel.body.appendChild(clearbagCard);

      // 点击展开 540x410 礼物选择器 (背包模式)
      clearbagCard.querySelector('#extool__clearbag_trigger').addEventListener('click', function (e) {
        e.stopPropagation();
        giftPicker.open('backpack', function (gift) {
          if (!gift) return;
          clearbagCard.querySelector('#extool-clearbag-name').textContent = gift.name;
          clearbagCard.querySelector('#extool-clearbag-tag').textContent = '拥有 ×' + (gift.count || 1);
          clearbagCard.querySelector('#extool-clearbag-id').value = gift.id;
          miuix.Toast('已选择背包道具: ' + gift.name, 'info', 1200);
        });
      });

      // 4. 红包与宝箱卡片 (L3-09)
      var radarCard = document.createElement('div');
      radarCard.className = 'miuix-card';
      radarCard.innerHTML = `
        <div class="miuix-card__header" style="display: flex; justify-content: space-between; align-items: center;">
          <span class="miuix-card__title">房间红包与宝箱</span>
          <span style="font-size: 11px; color: #94a3b8;">自动探测与安全领取</span>
        </div>
        <div style="display: flex; flex-direction: column; gap: 8px; margin-top: 6px;">
          <label style="display: flex; justify-content: space-between; align-items: center; cursor: pointer; font-size: 12px;">
            <span>自动拾取房间红包</span>
            <input type="checkbox" id="extool-auto-redpacket" class="miuix-checkbox" />
          </label>
          <label style="display: flex; justify-content: space-between; align-items: center; cursor: pointer; font-size: 12px;">
            <span>自动参与房间宝箱</span>
            <input type="checkbox" id="extool-auto-treasure" class="miuix-checkbox" />
          </label>
        </div>
      `;
      panel.body.appendChild(radarCard);

      store.bindCheckbox('#extool-auto-redpacket', 'radar.redpacket.autoGrab');
      store.bindCheckbox('#extool-auto-treasure', 'radar.treasure.autoJoin');

      return panel;
    }

    return {
      createExtoolPanel: createExtoolPanel
    };
  });
})();
