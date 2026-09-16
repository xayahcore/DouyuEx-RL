// src/ui/dock.js
(function () {
  'use strict';
  if (!globalThis.DYEXRL_NEXT) return;

  globalThis.DYEXRL_NEXT.registry.register('ui.dock', ['ui.tokens', 'ui.icons', 'ui.miuix'], function (tokens, icons, miuix) {
    tokens.injectTokens();

    var DOCK_BUTTONS = [
      { id: 'fans-continue', icon: 'fans', title: '一键续牌', hasPanel: true },
      { id: 'ex-sign', icon: 'sign', title: '一键签到', hasPanel: true },
      { id: 'livetool', icon: 'livetool', title: '直播间工具', hasPanel: true },
      { id: 'media-panel', icon: 'media', title: '画质与播控', hasPanel: true },
      { id: 'ex-setting', icon: 'setting', title: '全局设置', hasPanel: true },
      { id: 'ex-lottery', icon: 'lottery', title: '全站抽奖', hasPanel: false },
      { id: 'popup-player', icon: 'popup', title: '画中画/同屏', hasPanel: false },
      { id: 'ex-monitor', icon: 'monitor', title: '在线弹幕助手', hasPanel: false },
      { id: 'ex-update', icon: 'update', title: '检查更新', hasPanel: false }
    ];

    var CLOSE_DELAY_MS = 400;

    function createDock(options) {
      var opts = options || {};

      var dockWrap = document.createElement('div');
      dockWrap.className = 'miuix-dock-wrap';

      // Indicator capsule (16x3px)
      var indicator = document.createElement('div');
      indicator.className = 'miuix-dock-indicator';
      dockWrap.appendChild(indicator);

      var registeredPanels = new Map();
      var activePanelId = null;
      var closeTimer = null;

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
        var xOffset = btnRect.left - wrapRect.left + (btnRect.width - 16) / 2;
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

        // Highlight active dock item
        dockWrap.querySelectorAll('.miuix-dock-item').forEach(function (el) {
          el.classList.toggle('is-active', el.dataset.dockId === id);
        });
      }

      function closeActivePanel() {
        if (!activePanelId) return;
        var panel = registeredPanels.get(activePanelId);
        if (panel) panel.hide();
        activePanelId = null;
        updateIndicator(null);

        dockWrap.querySelectorAll('.miuix-dock-item').forEach(function (el) {
          el.classList.remove('is-active');
        });
      }

      function togglePanel(id, anchorBtn) {
        if (activePanelId === id) {
          closeActivePanel();
        } else {
          openPanel(id, anchorBtn);
        }
      }

      // Render 9 buttons
      DOCK_BUTTONS.forEach(function (btnDef) {
        var btn = document.createElement('div');
        btn.className = 'miuix-dock-item';
        if (!btn.dataset) btn.dataset = {};
        btn.dataset.dockId = btnDef.id;
        btn.title = btnDef.title;

        var iconSvg = icons.createSvg(btnDef.icon, 20);
        btn.appendChild(iconSvg);

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
          if (btnDef.hasPanel && registeredPanels.has(btnDef.id)) {
            togglePanel(btnDef.id, btn);
          } else if (typeof opts.onItemClick === 'function') {
            opts.onItemClick(btnDef, btn);
          } else if (typeof opts.onAction === 'function') {
            opts.onAction(btnDef.id);
          }
        });

        dockWrap.appendChild(btn);
      });

      function mount(targetContainer) {
        var c = targetContainer || opts.container || (typeof document !== 'undefined' ? (document.querySelector('.PlayerToolbar-ContentRow') || document.querySelector('.layout-Player-toolbar') || document.body) : null);
        if (c && !dockWrap.parentNode && typeof c.appendChild === 'function') {
          c.appendChild(dockWrap);
        }
      }

      if (opts.autoMount !== false) {
        if (typeof document !== 'undefined' && document.body) {
          mount();
        } else if (typeof document !== 'undefined' && typeof document.addEventListener === 'function') {
          document.addEventListener('DOMContentLoaded', function () { mount(); }, { once: true });
        }
      }

      function registerPanel(id, panelInstance) {
        registeredPanels.set(id, panelInstance);

        // Hook panel element mouseenter/leave for 400ms close timer
        if (panelInstance && panelInstance.element && typeof panelInstance.element.addEventListener === 'function') {
          panelInstance.element.addEventListener('mouseenter', clearCloseTimer);
          panelInstance.element.addEventListener('mouseleave', scheduleClose);
        }
      }

      function destroy() {
        clearCloseTimer();
        closeActivePanel();
        if (dockWrap.parentNode) dockWrap.parentNode.removeChild(dockWrap);
        registeredPanels.clear();
      }

      return {
        element: dockWrap,
        registerPanel: registerPanel,
        openPanel: openPanel,
        closeActivePanel: closeActivePanel,
        togglePanel: togglePanel,
        destroy: destroy
      };
    }

    return {
      DOCK_BUTTONS: DOCK_BUTTONS,
      createDock: createDock
    };
  });
})();
