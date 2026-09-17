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
      var activeVoteSession = null;
      var voteAccordion = miuix.Accordion({
        id: 'vote__panel',
        title: '弹幕投票',
        actions: [
          {
            label: '大屏看板',
            onClick: function () {
              if (!activeVoteSession) {
                miuix.Toast('当前暂无进行中的投票，请先发起投票', 'info');
                return;
              }
              var tallyText = Object.keys(activeVoteSession.tally).map(function (opt) {
                return opt + ': ' + activeVoteSession.tally[opt] + ' 票';
              }).join('\n');
              miuix.Dialog({
                mode: 'alert',
                title: '【实时投票大屏看板】' + activeVoteSession.theme,
                message: tallyText || '暂无投票数据'
              });
            }
          }
        ],
        content: [
          (function () {
            var box = document.createElement('div');
            box.style.display = 'flex';
            box.style.flexDirection = 'column';
            box.style.gap = '6px';
            box.innerHTML = `
              <input type="text" id="vote__theme" class="miuix-input" placeholder="输入投票主题..." />
              <input type="text" id="vote__options" class="miuix-input" placeholder="输入选项 (空格分隔，如: A B C)..." />
              <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 4px;">
                <label style="display: flex; align-items: center; gap: 4px; font-size: 11.5px; cursor: pointer;">
                  <input type="checkbox" id="vote__repeat" class="miuix-checkbox" />
                  <span>允许重复投票</span>
                </label>
                <button type="button" id="vote__start_btn" class="miuix-btn miuix-btn-primary" style="padding: 3px 12px; font-size: 11.5px;">发起投票</button>
              </div>
            `;

            var startBtn = box.querySelector('#vote__start_btn');
            startBtn.addEventListener('click', function () {
              var theme = box.querySelector('#vote__theme').value.trim();
              var optionsStr = box.querySelector('#vote__options').value.trim();
              var allowRepeat = box.querySelector('#vote__repeat').checked;

              if (!theme) return miuix.Toast('请输入投票主题', 'warning');
              var opts = optionsStr.split(/\s+/).filter(Boolean);
              if (opts.length < 2) return miuix.Toast('请至少输入两个选项 (空格分隔)', 'warning');

              var tally = {};
              opts.forEach(function (o) { tally[o] = 0; });
              activeVoteSession = {
                theme: theme,
                options: opts,
                allowRepeat: allowRepeat,
                tally: tally,
                voters: new Set(),
                startTime: Date.now()
              };

              // 开启弹幕监听
              if (chatAdapter && typeof chatAdapter.onChat === 'function') {
                chatAdapter.onChat(function (msg) {
                  if (!activeVoteSession || !msg || !msg.text) return;
                  if (!activeVoteSession.allowRepeat && msg.uid && activeVoteSession.voters.has(msg.uid)) return;
                  var t = msg.text.trim().toUpperCase();
                  opts.forEach(function (opt) {
                    if (t === opt.toUpperCase() || t.includes(opt.toUpperCase())) {
                      activeVoteSession.tally[opt]++;
                      if (msg.uid) activeVoteSession.voters.add(msg.uid);
                    }
                  });
                });
              }

              localStorage.setItem('ExSave_Vote', JSON.stringify({ theme: theme, options: opts, repeat: allowRepeat }));
              miuix.Toast('【弹幕投票】已启动: ' + theme, 'success');
            });

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
          {
            label: '导出',
            onClick: async function () {
              var saved = localStorage.getItem('ExSave_Enter') || '[]';
              try {
                if (navigator.clipboard && navigator.clipboard.writeText) {
                  await navigator.clipboard.writeText(saved);
                  miuix.Toast('欢迎规则已复制到剪贴板', 'success');
                } else {
                  miuix.Dialog({ mode: 'alert', title: '导出欢迎规则', message: saved });
                }
              } catch (e) {
                miuix.Dialog({ mode: 'alert', title: '导出欢迎规则', message: saved });
              }
            }
          },
          {
            label: '导入',
            onClick: function () {
              var input = prompt('请粘贴导出的欢迎规则 JSON 数组:');
              if (!input) return;
              try {
                var parsed = JSON.parse(input);
                if (Array.isArray(parsed)) {
                  localStorage.setItem('ExSave_Enter', JSON.stringify(parsed));
                  miuix.Toast('成功导入 ' + parsed.length + ' 条欢迎规则', 'success');
                } else {
                  miuix.Toast('格式不正确，需为 JSON 数组', 'error');
                }
              } catch (e) {
                miuix.Toast('JSON 解析失败', 'error');
              }
            }
          }
        ],
        content: [
          (function () {
            var box = document.createElement('div');
            var savedRules = [];
            try { savedRules = JSON.parse(localStorage.getItem('ExSave_Enter') || '[]'); } catch (e) {}
            var defaultWord = savedRules.length && savedRules[0].word ? savedRules[0].word : '欢迎来到直播间！';
            var defaultLevel = savedRules.length && savedRules[0].level ? savedRules[0].level : 10;

            box.innerHTML = `
              <div style="display: flex; gap: 6px; margin-bottom: 6px;">
                <input type="number" id="enter__level" class="miuix-input" style="width: 60px;" placeholder="等级" value="${defaultLevel}" />
                <input type="text" id="enter__word" class="miuix-input" style="flex: 1;" placeholder="欢迎语内容..." value="${defaultWord}" />
              </div>
              <div style="display: flex; justify-content: flex-end;">
                <button type="button" id="enter__save_btn" class="miuix-btn miuix-btn-primary" style="padding: 3px 12px; font-size: 11.5px;">保存规则</button>
              </div>
            `;

            box.querySelector('#enter__save_btn').addEventListener('click', function () {
              var lvl = Number(box.querySelector('#enter__level').value) || 1;
              var word = box.querySelector('#enter__word').value.trim();
              if (!word) return miuix.Toast('欢迎语不能为空', 'warning');
              var rules = [{ level: lvl, word: word }];
              localStorage.setItem('ExSave_Enter', JSON.stringify(rules));
              store.set('danmaku.greeter.enterWord', word);
              miuix.Toast('进场欢迎规则已保存！', 'success');
            });

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
          {
            label: '名单',
            onClick: function () {
              var saved = localStorage.getItem('ExSave_Mute') || '{}';
              miuix.Dialog({ mode: 'alert', title: '关键词禁言名单', message: saved });
            }
          },
          {
            label: '导出',
            onClick: async function () {
              var saved = localStorage.getItem('ExSave_Mute') || '{}';
              try {
                if (navigator.clipboard && navigator.clipboard.writeText) {
                  await navigator.clipboard.writeText(saved);
                  miuix.Toast('禁言规则已复制到剪贴板', 'success');
                } else {
                  miuix.Dialog({ mode: 'alert', title: '导出禁言规则', message: saved });
                }
              } catch (e) {
                miuix.Dialog({ mode: 'alert', title: '导出禁言规则', message: saved });
              }
            }
          }
        ],
        content: [
          (function () {
            var box = document.createElement('div');
            box.innerHTML = `
              <div style="display: flex; gap: 6px; margin-bottom: 6px;">
                <input type="text" id="mute__word" class="miuix-input" style="flex: 1;" placeholder="输入违规关键词..." />
                <select id="mute__duration" class="miuix-input" style="width: 75px;">
                  <option value="1">1天</option>
                  <option value="3">3天</option>
                  <option value="7">7天</option>
                  <option value="30">30天</option>
                </select>
              </div>
              <div style="display: flex; justify-content: flex-end;">
                <button type="button" id="mute__save_btn" class="miuix-btn miuix-btn-primary" style="padding: 3px 12px; font-size: 11.5px;">保存规则</button>
              </div>
            `;

            box.querySelector('#mute__save_btn').addEventListener('click', function () {
              var word = box.querySelector('#mute__word').value.trim();
              var dur = box.querySelector('#mute__duration').value;
              if (!word) return miuix.Toast('违规词不能为空', 'warning');
              var muteMap = {};
              try { muteMap = JSON.parse(localStorage.getItem('ExSave_Mute') || '{}'); } catch (e) {}
              muteMap[word] = { duration: dur, addedAt: Date.now() };
              localStorage.setItem('ExSave_Mute', JSON.stringify(muteMap));
              miuix.Toast('违规词 [' + word + '] 禁言规则已保存！', 'success');
            });

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
          {
            label: '导出',
            onClick: async function () {
              var saved = localStorage.getItem('ExSave_Gift') || '{}';
              try {
                if (navigator.clipboard && navigator.clipboard.writeText) {
                  await navigator.clipboard.writeText(saved);
                  miuix.Toast('谢礼模板已复制到剪贴板', 'success');
                } else {
                  miuix.Dialog({ mode: 'alert', title: '导出谢礼模板', message: saved });
                }
              } catch (e) {
                miuix.Dialog({ mode: 'alert', title: '导出谢礼模板', message: saved });
              }
            }
          },
          {
            label: '导入',
            onClick: function () {
              var input = prompt('请粘贴导出的谢礼模板 JSON:');
              if (!input) return;
              try {
                var parsed = JSON.parse(input);
                localStorage.setItem('ExSave_Gift', JSON.stringify(parsed));
                miuix.Toast('谢礼模板导入成功', 'success');
              } catch (e) {
                miuix.Toast('JSON 解析失败', 'error');
              }
            }
          }
        ],
        content: [
          (function () {
            var box = document.createElement('div');
            var savedGift = {};
            try { savedGift = JSON.parse(localStorage.getItem('ExSave_Gift') || '{}'); } catch (e) {}
            var defaultTpl = savedGift.template || '感谢 {name} 送出的 {gift}！老板大气！';

            box.innerHTML = `
              <div style="margin-bottom: 6px;">
                <input type="text" id="gift__tpl_input" class="miuix-input" style="width: 100%;" placeholder="感谢文案模板 (支持 {name}, {gift})..." value="${defaultTpl}" />
              </div>
              <div style="display: flex; justify-content: flex-end;">
                <button type="button" id="gift__save_btn" class="miuix-btn miuix-btn-primary" style="padding: 3px 12px; font-size: 11.5px;">保存模板</button>
              </div>
            `;

            box.querySelector('#gift__save_btn').addEventListener('click', function () {
              var tpl = box.querySelector('#gift__tpl_input').value.trim();
              if (!tpl) return miuix.Toast('感谢模板不能为空', 'warning');
              localStorage.setItem('ExSave_Gift', JSON.stringify({ template: tpl }));
              miuix.Toast('自动谢礼模板已保存！', 'success');
            });

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
          {
            label: '导出',
            onClick: async function () {
              var saved = localStorage.getItem('ExSave_Reply') || '{}';
              try {
                if (navigator.clipboard && navigator.clipboard.writeText) {
                  await navigator.clipboard.writeText(saved);
                  miuix.Toast('回复规则已复制到剪贴板', 'success');
                } else {
                  miuix.Dialog({ mode: 'alert', title: '导出回复规则', message: saved });
                }
              } catch (e) {
                miuix.Dialog({ mode: 'alert', title: '导出回复规则', message: saved });
              }
            }
          },
          {
            label: '导入',
            onClick: function () {
              var input = prompt('请粘贴导出的回复规则 JSON:');
              if (!input) return;
              try {
                var parsed = JSON.parse(input);
                localStorage.setItem('ExSave_Reply', JSON.stringify(parsed));
                miuix.Toast('回复规则导入成功', 'success');
              } catch (e) {
                miuix.Toast('JSON 解析失败', 'error');
              }
            }
          }
        ],
        content: [
          (function () {
            var box = document.createElement('div');
            box.innerHTML = `
              <div style="display: flex; gap: 6px; margin-bottom: 6px;">
                <input type="text" id="reply__kw_input" class="miuix-input" style="width: 100px;" placeholder="触发词" />
                <input type="text" id="reply__content_input" class="miuix-input" style="flex: 1;" placeholder="回复内容..." />
              </div>
              <div style="display: flex; justify-content: space-between; align-items: center;">
                <div style="display: flex; align-items: center; gap: 4px; font-size: 11px; color: #64748b;">
                  <span>CD(秒):</span>
                  <input type="number" id="reply__cd_input" class="miuix-input" style="width: 45px; padding: 2px 4px;" value="5" min="1" />
                </div>
                <button type="button" id="reply__add_btn" class="miuix-btn miuix-btn-primary" style="padding: 3px 12px; font-size: 11.5px;">添加规则</button>
              </div>
            `;

            box.querySelector('#reply__add_btn').addEventListener('click', function () {
              var kw = box.querySelector('#reply__kw_input').value.trim();
              var reply = box.querySelector('#reply__content_input').value.trim();
              var cd = Number(box.querySelector('#reply__cd_input').value) || 5;

              if (!kw || !reply) return miuix.Toast('触发词和回复内容均不能为空', 'warning');
              var replyMap = {};
              try { replyMap = JSON.parse(localStorage.getItem('ExSave_Reply') || '{}'); } catch (e) {}
              replyMap[kw] = { reply: reply, cd: cd };
              localStorage.setItem('ExSave_Reply', JSON.stringify(replyMap));
              miuix.Toast('已添加回复规则: ' + kw + ' -> ' + reply, 'success');
            });

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
