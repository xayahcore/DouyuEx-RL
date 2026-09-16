// src/ui/modals/sign_panel.js
(function () {
  'use strict';
  if (!globalThis.DYEXRL_NEXT) return;

  globalThis.DYEXRL_NEXT.registry.register('ui.modals.signPanel', [
    'ui.miuix',
    'store.index',
    'modules.economy.signEngine'
  ], function (miuix, store, signEngine) {

    function createSignPanel() {
      var panel = miuix.Panel({
        id: 'sign-panel',
        title: '一键签到',
        subtitle: '按需勾选日常任务'
      });

      // Card 1: 5 大签到任务选项列表
      var optCard = document.createElement('div');
      optCard.className = 'miuix-card';

      var TASK_ITEMS = [
        { key: 'room', title: '房间与粉丝牌签到', desc: '为关注/拥牌房间赠送亲密度' },
        { key: 'client', title: '客户端模拟签到', desc: '模拟手机端领每日礼盒' },
        { key: 'yuba', title: '关注鱼吧签到', desc: '一键打卡领经验并补签' },
        { key: 'stardiscover', title: '星推日常任务', desc: '打卡/口令弹幕/关注任务(安全取关)' },
        { key: 'fanshome', title: '粉丝家园与钻粉', desc: '粉丝家园打卡与钻粉日常' }
      ];

      var currentCfg = store.get('economy.signConfig') || {};

      TASK_ITEMS.forEach(function (tDef) {
        var row = document.createElement('label');
        row.style.display = 'flex';
        row.style.alignItems = 'center';
        row.style.gap = '10px';
        row.style.cursor = 'pointer';
        row.style.padding = '3px 0';

        var cb = document.createElement('input');
        cb.type = 'checkbox';
        cb.checked = !!currentCfg[tDef.key];
        cb.addEventListener('change', function () {
          var cfg = store.get('economy.signConfig') || {};
          cfg[tDef.key] = cb.checked;
          store.set('economy.signConfig', cfg);
        });

        var textWrap = document.createElement('div');
        textWrap.style.display = 'flex';
        textWrap.style.flexDirection = 'column';

        var tit = document.createElement('span');
        tit.style.fontSize = '11.5px';
        tit.style.fontWeight = '600';
        tit.style.color = '#0f172a';
        tit.textContent = tDef.title;

        var dsc = document.createElement('span');
        dsc.style.fontSize = '10px';
        dsc.style.color = '#64748b';
        dsc.textContent = tDef.desc;

        textWrap.appendChild(tit);
        textWrap.appendChild(dsc);

        row.appendChild(cb);
        row.appendChild(textWrap);
        optCard.appendChild(row);
      });

      panel.body.appendChild(optCard);

      // Card 2: 任务实时日志视窗
      var logCard = document.createElement('div');
      logCard.className = 'miuix-card';
      logCard.innerHTML = `
        <div class="miuix-card__header">
          <span class="miuix-card__title">执行日志</span>
          <span id="sign-status-tag" style="font-size: 10.5px; font-weight: 700; color: #10b981;">就绪</span>
        </div>
        <div id="sign-log-box" class="miuix-scrollable" style="min-height: 48px; max-height: 64px; overflow-y: auto; font-size: 10.5px; color: #475569; line-height: 1.45; background: rgba(0,0,0,0.03); padding: 4px 6px; border-radius: 6px;">
          勾选上方选项后，点击下方按钮开始签到。
        </div>
      `;
      panel.body.appendChild(logCard);

      // Action Button
      var actionWrap = document.createElement('div');
      actionWrap.style.display = 'flex';
      actionWrap.style.marginTop = 'auto';

      var startBtn = document.createElement('button');
      startBtn.type = 'button';
      startBtn.className = 'miuix-btn miuix-btn-primary';
      startBtn.style.width = '100%';
      startBtn.textContent = '开始签到';

      startBtn.addEventListener('click', async function (e) {
        e.stopPropagation();
        var statusTag = panel.element.querySelector('#sign-status-tag');
        var logBox = panel.element.querySelector('#sign-log-box');

        startBtn.disabled = true;
        if (statusTag) {
          statusTag.textContent = '正在执行';
          statusTag.style.color = '#ff7700';
        }
        if (logBox) logBox.innerHTML = '正在启动签到流水线...<br>';

        var logs = [];
        function onLog(msg) {
          logs.push(msg);
          if (logBox) {
            logBox.innerHTML = logs.map(l => '• ' + l).join('<br>');
            logBox.scrollTop = logBox.scrollHeight;
          }
        }

        try {
          await signEngine.executeSignPipeline(null, onLog);
          if (statusTag) {
            statusTag.textContent = '已完成';
            statusTag.style.color = '#10b981';
          }
        } catch (err) {
          onLog('签到异常: ' + (err.message || '未知错误'));
          if (statusTag) {
            statusTag.textContent = '异常中断';
            statusTag.style.color = '#ef4444';
          }
        } finally {
          startBtn.disabled = false;
        }
      });

      actionWrap.appendChild(startBtn);
      panel.body.appendChild(actionWrap);

      return panel;
    }

    return {
      createSignPanel: createSignPanel
    };
  });
})();
