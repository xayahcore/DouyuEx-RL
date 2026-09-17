// src/ui/dock.js
(function () {
  'use strict';
  if (!globalThis.DYEXRL_NEXT) return;

  globalThis.DYEXRL_NEXT.registry.register('ui.dock', ['ui.tokens', 'ui.icons', 'ui.miuix'], function (tokens, icons, miuix) {
    tokens.injectTokens();

    // 计划书 §13.2 严格九按钮顺序：
    // 一键签到、一键续牌、扩展功能、直播间工具、弹幕小助手、全站抽奖、同屏播放器、在线弹幕助手、版本更新
    var DOCK_BUTTONS = [
      { id: 'ex-sign', cls: 'ex-sign', icon: 'sign', title: '一键签到', hasPanel: true },
      { id: 'fans-continue', cls: 'fans-continue', icon: 'fans', title: '一键续牌', hasPanel: true },
      { id: 'extool', cls: 'extool-icon', icon: 'extool', title: '扩展功能', hasPanel: true },
      { id: 'livetool', cls: 'livetool-icon', icon: 'livetool', title: '直播间工具', hasPanel: true },
      { id: 'bloop', cls: 'bloop-icon', icon: 'bloop', title: '弹幕小助手', hasPanel: true },
      { id: 'ex-lottery', cls: 'ex-lottery', icon: 'lottery', title: '全站抽奖', hasPanel: true },
      { id: 'popup-player', cls: 'popup-player', icon: 'popup', title: '同屏播放器', hasPanel: true },
      { id: 'ex-monitor', cls: 'ex-monitor', icon: 'monitor', title: '在线弹幕助手', hasPanel: false },
      { id: 'ex-update', cls: 'ex-update', icon: 'update', title: '版本更新', hasPanel: true }
    ];

    var CLOSE_DELAY_MS = 400;

    function createDock(options) {
      var opts = options || {};

      var dockWrap = document.createElement('div');
      dockWrap.className = 'ex-panel miuix-dock-wrap';

      // 1. Indicator capsule (24x4px 生机蓝指示器小胶囊)
      var indicator = document.createElement('div');
      indicator.className = 'ex-panel__indicator miuix-dock-indicator';
      dockWrap.appendChild(indicator);

      // 2. Close button (×)
      var closeBtn = document.createElement('button');
      closeBtn.type = 'button';
      closeBtn.className = 'ex-panel__close miuix-dock-close';
      closeBtn.innerHTML = '×';
      closeBtn.title = '关闭工具条';
      if (typeof closeBtn.setAttribute === 'function') {
        closeBtn.setAttribute('aria-label', '关闭 DouyuEx 工具条');
      }
      closeBtn.addEventListener('click', function (e) {
        e.stopPropagation();
        closeDock();
      });
      dockWrap.appendChild(closeBtn);

      // 3. Inner wrap for 9 buttons
      var itemsWrap = document.createElement('div');
      itemsWrap.className = 'ex-panel__wrap';
      dockWrap.appendChild(itemsWrap);

      var registeredPanels = new Map();
      var activePanelId = null;
      var closeTimer = null;
      var isDockOpen = false;

      function clearCloseTimer() {
        if (closeTimer) {
          clearTimeout(closeTimer);
          closeTimer = null;
        }
      }

      function scheduleClose() {
        clearCloseTimer();
        closeTimer = setTimeout(function () {
          closeTimer = null;
          closeActivePanel();
        }, CLOSE_DELAY_MS);
      }

      function updateIndicator(targetBtnEl) {
        if (!targetBtnEl) {
          indicator.style.opacity = '0';
          return;
        }
        var btnRect = targetBtnEl.getBoundingClientRect();
        var wrapRect = dockWrap.getBoundingClientRect();
        var xOffset = btnRect.left - wrapRect.left + (btnRect.width - 24) / 2;
        indicator.style.transform = 'translateX(' + xOffset + 'px)';
        indicator.style.opacity = '1';
      }

      function openPanel(id, anchorBtn) {
        clearCloseTimer();
        var panel = registeredPanels.get(id);
        if (!panel) return;

        if (activePanelId && activePanelId !== id) {
          var prev = registeredPanels.get(activePanelId);
          if (prev) prev.hide();
        }

        activePanelId = id;
        panel.show(anchorBtn);
        updateIndicator(anchorBtn);

        dockWrap.querySelectorAll('.miuix-dock-item').forEach(function (el) {
          var match = el.dataset.dockId === id;
          el.classList.toggle('is-active', match);
          el.classList.toggle('ex-dock-active', match);
        });
      }

      function closeActivePanel() {
        if (!activePanelId) return;
        var panel = registeredPanels.get(activePanelId);
        if (panel) panel.hide();
        activePanelId = null;
        updateIndicator(null);

        dockWrap.querySelectorAll('.miuix-dock-item').forEach(function (el) {
          el.classList.remove('is-active', 'ex-dock-active');
        });
      }

      function togglePanel(id, anchorBtn) {
        if (activePanelId === id) {
          closeActivePanel();
        } else {
          openPanel(id, anchorBtn);
        }
      }

      function getToolbarContainer() {
        var d = typeof document !== 'undefined' ? document : null;
        if (!d) return null;
        return d.querySelector('.PlayerToolbar-ContentCell .PlayerToolbar-Wealth') ||
               d.querySelector('.PlayerToolbar-ContentRow');
      }

      function getFloatingParent() {
        var d = typeof document !== 'undefined' ? document : null;
        if (!d) return null;
        var dlg = typeof d.getElementById === 'function' ? d.getElementById('js-player-dialog') : null;
        if (dlg) return dlg;
        var box = typeof d.getElementsByClassName === 'function' ? d.getElementsByClassName('room-Player-Box')[0] : null;
        if (box) return box;
        return d.body || null;
      }

      function isPlayerToolbarHidden() {
        var d = typeof document !== 'undefined' ? document : null;
        if (!d || typeof d.getElementsByClassName !== 'function') return false;
        var row = d.getElementsByClassName('PlayerToolbar-ContentRow')[0];
        return row && row.style && row.style.visibility === 'hidden';
      }

      function updateDockPosition() {
        var d = typeof document !== 'undefined' ? document : null;
        if (!d) return;

        var tb = d.getElementById('js-player-toolbar') || d.querySelector('.PlayerToolbar');
        var vmenu = d.getElementById('ex-vtoolbar-menu');

        var t = getToolbarContainer();
        if (isPlayerToolbarHidden() || !t) {
          dockWrap.classList.add('ex-panel--floating');
          var fp = getFloatingParent();
          if (fp && dockWrap.parentNode !== fp) {
            fp.appendChild(dockWrap);
          }
        } else {
          dockWrap.classList.remove('ex-panel--floating');
          if (dockWrap.parentNode !== t) {
            if (t.firstChild) {
              t.insertBefore(dockWrap, t.firstChild);
            } else {
              t.appendChild(dockWrap);
            }
          }
        }

        if (dockWrap.classList.contains('ex-panel--floating')) {
          if (tb && typeof tb.getBoundingClientRect === 'function') {
            var tbRect = tb.getBoundingClientRect();
            dockWrap.style.position = 'fixed';
            dockWrap.style.bottom = Math.max(8, (window.innerHeight - tbRect.top + 8)) + 'px';
            dockWrap.style.top = 'auto';
            var dockWidth = dockWrap.offsetWidth || dockWrap.scrollWidth || 580;
            var leftPos = tbRect.left + tbRect.width / 2 - dockWidth / 2;
            if (vmenu && typeof vmenu.getBoundingClientRect === 'function') {
              var vRect = vmenu.getBoundingClientRect();
              leftPos = vRect.left + vRect.width / 2 - dockWidth / 2;
            }
            leftPos = Math.max(8, Math.min(leftPos, window.innerWidth - dockWidth - 8));
            dockWrap.style.left = leftPos + 'px';
            dockWrap.style.right = 'auto';
          } else {
            dockWrap.style.position = 'fixed';
            dockWrap.style.bottom = '76px';
            dockWrap.style.right = '12px';
            dockWrap.style.left = 'auto';
          }
        } else {
          var toolbarEl = d.querySelector('.PlayerToolbar');
          dockWrap.style.position = 'absolute';
          dockWrap.style.bottom = toolbarEl ? toolbarEl.offsetHeight + 'px' : '76px';
          dockWrap.style.left = 'auto';
          dockWrap.style.right = '0px';
        }
      }

      function openDock() {
        isDockOpen = true;
        if (dockWrap.classList && typeof dockWrap.classList.add === 'function') {
          dockWrap.classList.add('is-open');
        }
        dockWrap.style.display = 'flex';
        updateDockPosition();

        var launcher = typeof document !== 'undefined' && typeof document.querySelector === 'function' ? document.querySelector('.ex-icon, .miuix-ex-icon') : null;
        if (launcher && launcher.classList && typeof launcher.classList.add === 'function') {
          launcher.classList.add('is-active');
        }
      }

      function closeDock() {
        isDockOpen = false;
        closeActivePanel();
        if (dockWrap.classList && typeof dockWrap.classList.remove === 'function') {
          dockWrap.classList.remove('is-open');
        }
        dockWrap.style.display = 'none';
        var launcher = typeof document !== 'undefined' && typeof document.querySelector === 'function' ? document.querySelector('.ex-icon, .miuix-ex-icon') : null;
        if (launcher && launcher.classList && typeof launcher.classList.remove === 'function') {
          launcher.classList.remove('is-active');
        }
      }

      function toggleDock() {
        if (isDockOpen) {
          closeDock();
        } else {
          openDock();
        }
      }

      // 4. Render 9 buttons in itemsWrap
      DOCK_BUTTONS.forEach(function (btnDef) {
        var btn = document.createElement('div');
        btn.className = (btnDef.cls || btnDef.id) + ' miuix-dock-item';
        if (!btn.dataset) btn.dataset = {};
        btn.dataset.dockId = btnDef.id;
        btn.title = btnDef.title;

        var a = document.createElement('a');
        a.className = 'ex-panel__icon';
        a.title = btnDef.title;
        a.style.display = 'flex';
        a.style.alignItems = 'center';
        a.style.justifyContent = 'center';
        a.style.width = '100%';
        a.style.height = '100%';
        a.appendChild(icons.createSvg(btnDef.icon, 32));

        var tip = document.createElement('i');
        tip.id = btnDef.id + '__tip';
        tip.className = 'ex-panel__tip';
        a.appendChild(tip);
        btn.appendChild(a);

        var itemIndicator = document.createElement('div');
        itemIndicator.className = 'ex-panel__indicator miuix-dock-indicator';
        btn.appendChild(itemIndicator);

        // 32px hover bridge (attached to button)
        var bridge = document.createElement('div');
        bridge.className = 'miuix-hover-bridge';
        btn.appendChild(bridge);

        // Hover events
        btn.addEventListener('mouseenter', function () {
          clearCloseTimer();
          if (btnDef.hasPanel) {
            openPanel(btnDef.id, btn);
          }
        });

        btn.addEventListener('mouseleave', function () {
          if (btnDef.hasPanel) {
            scheduleClose();
          }
        });

        // Click events
        btn.addEventListener('click', function (e) {
          e.stopPropagation();
          if (btnDef.id === 'ex-monitor') {
            var rid = (window.$DATA && window.$DATA.ROOM && window.$DATA.ROOM.room_id) || window.room_id || window.rid || '60937';
            window.open('https://www.douyuex.com/' + rid, '_blank');
          } else if (btnDef.hasPanel && registeredPanels.has(btnDef.id)) {
            togglePanel(btnDef.id, btn);
          } else if (typeof opts.onItemClick === 'function') {
            opts.onItemClick(btnDef, btn);
          } else if (typeof opts.onAction === 'function') {
            opts.onAction(btnDef.id);
          }
        });

        itemsWrap.appendChild(btn);
      });

      function mount(targetContainer) {
        var d = typeof document !== 'undefined' ? document : null;
        if (!d) return;
        var c = targetContainer || opts.container;
        if (!c) {
          var wealthBar = getToolbarContainer();
          if (wealthBar && !isPlayerToolbarHidden()) {
            c = wealthBar;
          } else {
            c = getFloatingParent();
            dockWrap.classList.add('ex-panel--floating');
          }
        }
        if (c && !dockWrap.parentNode && typeof c.appendChild === 'function') {
          if (c.firstChild) {
            c.insertBefore(dockWrap, c.firstChild);
          } else {
            c.appendChild(dockWrap);
          }
        }
      }

      // 5. 挂载礼物栏红白精灵球入口 (.ex-icon / .miuix-ex-icon)
      function mountLauncher(doc) {
        var d = doc || (typeof document !== 'undefined' ? document : null);
        if (!d) return;

        var wealthBar = d.querySelector('.PlayerToolbar-ContentCell .PlayerToolbar-Wealth') ||
                         d.querySelector('.PlayerToolbar-Wealth');
        if (wealthBar && wealthBar.querySelector('.ex-icon, .miuix-ex-icon')) return;

        var iconBtn = d.createElement('div');
        iconBtn.className = 'ex-icon miuix-ex-icon';
        iconBtn.title = 'DouyuEx-RL 控制中心 (点击展开/收起)';

        var a = d.createElement('a');
        a.title = 'DouyuEx-RL (点击展开/收起)';
        a.style.display = 'flex';
        a.style.alignItems = 'center';
        a.style.justifyContent = 'center';
        a.style.cursor = 'pointer';
        a.appendChild(icons.createSvg('pokeball', 24));

        var tip = d.createElement('i');
        tip.id = 'ex-icon__tip';
        tip.className = 'ex-panel__tip';
        a.appendChild(tip);

        iconBtn.appendChild(a);

        iconBtn.addEventListener('click', function (e) {
          e.stopPropagation();
          toggleDock();
        });

        if (wealthBar) {
          if (wealthBar.firstChild) {
            wealthBar.insertBefore(iconBtn, wealthBar.firstChild);
          } else {
            wealthBar.appendChild(iconBtn);
          }
        } else {
          var giftArea = d.querySelector('.ToolbarGiftArea-container');
          if (giftArea) {
            iconBtn.className += ' ToolbarGiftArea-backpack';
            iconBtn.style.width = '52px';
            giftArea.appendChild(iconBtn);
          } else if (d.body) {
            d.body.appendChild(iconBtn);
          }
        }
      }

      if (opts.autoMount !== false) {
        if (typeof document !== 'undefined' && document.body) {
          mount();
          mountLauncher();
        } else if (typeof document !== 'undefined' && typeof document.addEventListener === 'function') {
          document.addEventListener('DOMContentLoaded', function () {
            mount();
            mountLauncher();
          }, { once: true });
        }
      }

      function registerPanel(id, panelInstance) {
        registeredPanels.set(id, panelInstance);

        if (panelInstance && panelInstance.element && typeof panelInstance.element.addEventListener === 'function') {
          panelInstance.element.addEventListener('mouseenter', clearCloseTimer);
          panelInstance.element.addEventListener('mouseleave', scheduleClose);
        }
      }

      function destroy() {
        clearCloseTimer();
        closeDock();
        if (dockWrap.parentNode) dockWrap.parentNode.removeChild(dockWrap);
        var launcher = document.querySelector('.ex-icon, .miuix-ex-icon');
        if (launcher && launcher.parentNode) launcher.parentNode.removeChild(launcher);
        registeredPanels.clear();
      }

      return {
        element: dockWrap,
        registerPanel: registerPanel,
        openPanel: openPanel,
        closeActivePanel: closeActivePanel,
        togglePanel: togglePanel,
        openDock: openDock,
        closeDock: closeDock,
        toggleDock: toggleDock,
        mountLauncher: mountLauncher,
        destroy: destroy
      };
    }

    return {
      DOCK_BUTTONS: DOCK_BUTTONS,
      createDock: createDock
    };
  });
})();
