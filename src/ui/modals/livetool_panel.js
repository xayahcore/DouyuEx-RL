// src/ui/modals/livetool_panel.js
(function () {
  'use strict';
  if (!globalThis.DYEXRL_NEXT) return;

  globalThis.DYEXRL_NEXT.registry.register('ui.modals.livetoolPanel', [
    'ui.miuix',
    'store.index',
    'adapters.chat'
  ], function (miuix, store, chatAdapter) {

    function createLivetoolPanel() {
      var panel = miuix.Panel({
        id: 'livetool-panel',
        title: '直播间工具',
        subtitle: '互动、投票与房管工具箱'
      });

      // 1. 弹幕投票 (L3-01)
      var voteAccordion = miuix.Accordion({
        id: 'vote__panel',
        title: '弹幕投票',
        actions: [
          { label: '大屏看板', onClick: function () { miuix.Toast('已展开独立投票看板', 'info'); } }
        ],
        content: [
          (function () {
            var box = document.createElement('div');
            box.style.display = 'flex';
            box.style.flexDirection = 'column';
            box.style.gap = '6px';
            box.innerHTML = `
              <input type="text" id="vote__theme" class="miuix-input" placeholder="输入投票主题..." />
              <input type="text" id="vote__options" class="miuix-input" placeholder="输入选项(空格分隔)..." />
              <div style="display: flex; justify-content: space-between; align-items: center;">
                <label style="font-size: 11px;"><input type="checkbox" id="vote__repeat" /> 允许重复投票</label>
                <button type="button" class="miuix-btn miuix-btn-primary" style="padding: 3px 10px;">发起投票</button>
              </div>
            `;
            return box;
          })()
        ]
      });
      panel.body.appendChild(voteAccordion.element);

      // 2. 进场欢迎 (L3-02)
      var enterAccordion = miuix.Accordion({
        id: 'enter__panel',
        title: '进场欢迎',
        actions: [
          { label: '导出', onClick: function () { miuix.Toast('已导出欢迎规则', 'info'); } },
          { label: '导入', onClick: function () { miuix.Toast('已导入欢迎规则', 'info'); } }
        ],
        content: [
          (function () {
            var box = document.createElement('div');
            box.innerHTML = `
              <div style="display: flex; gap: 6px; margin-bottom: 6px;">
                <input type="number" id="enter__level" class="miuix-input" style="width: 60px;" placeholder="等级" value="10" />
                <input type="text" id="enter__word" class="miuix-input" style="flex: 1;" placeholder="欢迎语内容..." />
              </div>
              <div style="display: flex; justify-content: flex-end;">
                <button type="button" class="miuix-btn miuix-btn-primary" style="padding: 3px 10px;">保存规则</button>
              </div>
            `;
            return box;
          })()
        ]
      });
      panel.body.appendChild(enterAccordion.element);

      // 3. 关键词禁言 (L3-03)
      var muteAccordion = miuix.Accordion({
        id: 'mute__panel',
        title: '关键词禁言',
        actions: [
          { label: '名单', onClick: function () { miuix.Toast('查询禁言名单', 'info'); } },
          { label: '导出', onClick: function () { miuix.Toast('已导出禁言规则', 'info'); } }
        ],
        content: [
          (function () {
            var box = document.createElement('div');
            box.innerHTML = `
              <div style="display: flex; gap: 6px;">
                <input type="text" class="miuix-input" style="flex: 1;" placeholder="输入违规关键词..." />
                <select class="miuix-input" style="width: 75px;">
                  <option value="1">1天</option>
                  <option value="3">3天</option>
                  <option value="7">7天</option>
                  <option value="30">30天</option>
                </select>
              </div>
            `;
            return box;
          })()
        ]
      });
      panel.body.appendChild(muteAccordion.element);

      // 4. 自动谢礼物 (L3-04)
      var giftAccordion = miuix.Accordion({
        id: 'gift__panel',
        title: '自动谢礼物',
        actions: [
          { label: '导出', onClick: function () { miuix.Toast('已导出谢礼模板', 'info'); } },
          { label: '导入', onClick: function () { miuix.Toast('已导入谢礼模板', 'info'); } }
        ],
        content: [
          (function () {
            var box = document.createElement('div');
            box.innerHTML = `
              <input type="text" class="miuix-input" style="width: 100%;" placeholder="感谢文案模板 (支持 {name}, {gift})..." />
            `;
            return box;
          })()
        ]
      });
      panel.body.appendChild(giftAccordion.element);

      // 5. 关键词回复 (L3-05)
      var replyAccordion = miuix.Accordion({
        id: 'reply__panel',
        title: '关键词回复',
        actions: [
          { label: '导出', onClick: function () { miuix.Toast('已导出回复规则', 'info'); } },
          { label: '导入', onClick: function () { miuix.Toast('已导入回复规则', 'info'); } }
        ],
        content: [
          (function () {
            var box = document.createElement('div');
            box.innerHTML = `
              <div style="display: flex; gap: 6px; margin-bottom: 6px;">
                <input type="text" class="miuix-input" style="width: 100px;" placeholder="触发词" />
                <input type="text" class="miuix-input" style="flex: 1;" placeholder="回复内容..." />
              </div>
              <div style="display: flex; justify-content: space-between; align-items: center;">
                <span style="font-size: 11px; color: #64748b;">冷却 CD: 5秒</span>
                <button type="button" class="miuix-btn miuix-btn-primary" style="padding: 3px 10px;">添加规则</button>
              </div>
            `;
            return box;
          })()
        ]
      });
      panel.body.appendChild(replyAccordion.element);

      return panel;
    }

    return {
      createLivetoolPanel: createLivetoolPanel
    };
  });
})();
