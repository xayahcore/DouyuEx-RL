// src/ui/modals/update_panel.js
(function () {
  'use strict';
  if (!globalThis.DYEXRL_NEXT) return;

  globalThis.DYEXRL_NEXT.registry.register('ui.modals.updatePanel', [
    'ui.miuix',
    'store.index'
  ], function (miuix, store) {

    function createUpdatePanel() {
      var panel = miuix.Panel({
        id: 'update-panel',
        title: '版本更新',
        subtitle: 'DouyuEx-RL NEXT 纯净重构版'
      });

      var card = document.createElement('div');
      card.className = 'miuix-card';
      card.innerHTML = `
        <div style="display: flex; flex-direction: column; gap: 10px;">
          <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid rgba(0,0,0,0.06); padding-bottom: 6px;">
            <span style="font-size: 12px; font-weight: 700; color: #1e293b;">新增功能</span>
            <span style="font-size: 11px; color: #10b981; font-weight: 600;">当前已是最新版</span>
          </div>

          <ul style="font-size: 11px; color: #475569; line-height: 1.6; padding-left: 14px; margin: 0; display: flex; flex-direction: column; gap: 8px;">
            <li><b>① 一键签到三级控制面板完整落地:</b> 彻底告别后台黑盒状态。新增标准 380×370px MIUIX 流式拟态模态视窗，支持按需勾选 5 大日常签到任务并实时持久化。</li>
            <li><b>② 5 级模态礼物选择器全域复用:</b> 540×410px 全景拟态大选择器，实时双流并行聚合房间专属礼物与通用大盘礼物（140+款），支持背包道具现场直探与搜索回填。</li>
            <li><b>③ 播放器视窗原生追加增强:</b> 视频播放器飘动弹幕悬停原生追加 +1 复读、弹幕右键快捷指令作者卡片、以及视频播放器画面右键 11 项扩展控制菜单。</li>
            <li><b>④ 架构自底向上 Clean Slate 重塑:</b> 剔除历史单字母残渣与 100KB 失效样式，全面采用事件驱动与响应式 State Store。</li>
          </ul>

          <button type="button" id="update-btn-check" class="miuix-btn miuix-btn--primary" style="width: 100%; padding: 8px 0; font-size: 12px; font-weight: 700; margin-top: 6px;">前往 Greasy Fork 查看</button>
        </div>
      `;
      panel.body.appendChild(card);

      card.querySelector('#update-btn-check').addEventListener('click', function () {
        window.open('https://greasyfork.org/zh-CN/scripts/4042402-douyuex-rl', '_blank');
      });

      return panel;
    }

    return {
      createUpdatePanel: createUpdatePanel
    };
  });
})();
