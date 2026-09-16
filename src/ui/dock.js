// src/ui/dock.js
(function () {
  'use strict';
  if (!globalThis.DYEXRL_NEXT) return;

  globalThis.DYEXRL_NEXT.registry.register('ui.dock', ['ui.tokens', 'ui.icons', 'ui.miuix'], function (tokens, icons, miuix) {
    tokens.injectTokens();

    // 计划书 §13.2 严格九按钮顺序：
    // 一键签到、一键续牌、扩展功能、直播间工具、弹幕小助手、全站抽奖、同屏播放器、在线弹幕助手、版本更新
    var DOCK_BUTTONS = [
      { id: 'ex-sign', icon: 'sign', title: '一键签到', hasPanel: true },
      { id: 'fans-continue', icon: 'fans', title: '一键续牌', hasPanel: true },
      { id: 'extool', icon: 'extool', title: '扩展功能', hasPanel: true },
      { id: 'livetool', icon: 'livetool', title: '直播间工具', hasPanel: true },
      { id: 'bloop', icon: 'bloop', title: '弹幕小助手', hasPanel: true },
      { id: 'ex-lottery', icon: 'lottery', title: '全站抽奖', hasPanel: false },
      { id: 'popup-player', icon: 'popup', title: '同屏播放器', hasPanel: true },
      { id: 'ex-monitor', icon: 'monitor', title: '在线弹幕助手', hasPanel: false },
      { id: 'ex-update', icon: 'update', title: '版本更新', hasPanel: true }
    ];

    var CLOSE_DELAY_MS = 400;

    function createDock(options) {
      var opts = options || {};

      var dockWrap = document.createElement('div');
      dockWrap.className = 'miuix-dock-wrap';

      // 1. Indicator capsule (16x3px)
      var indicator = document.createElement('div');
      indicator.className = 'miuix-dock-indicator';
      dockWrap.appendChild(indicator);

      // 2. Close button (×)
      var closeBtn = document.createElement('div');
      closeBtn.className = 'miuix-dock-close';
      closeBtn.innerHTML = '×';
      closeBtn.title = '关闭工具条';
      closeBtn.addEventListener('click', function (e) {
        e.stopPropagation();
        closeDock();
      });
      dockWrap.appendChild(closeBtn);

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

      function openDock() {
        isDockOpen = true;
        if (dockWrap.classList && typeof dockWrap.classList.add === 'function') {
          dockWrap.classList.add('is-open');
        }
        dockWrap.style.display = 'flex';
        var launcher = typeof document !== 'undefined' && typeof document.querySelector === 'function' ? document.querySelector('.miuix-ex-icon') : null;
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
        var launcher = typeof document !== 'undefined' && typeof document.querySelector === 'function' ? document.querySelector('.miuix-ex-icon') : null;
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

      // 3. Render 9 buttons
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
        var d = typeof document !== 'undefined' ? document : null;
        if (!d) return;
        var c = targetContainer || opts.container || d.body;
        if (c && !dockWrap.parentNode && typeof c.appendChild === 'function') {
          c.appendChild(dockWrap);
        }
      }

      // 4. 挂载礼物栏红白精灵球入口 (.miuix-ex-icon)
      function mountLauncher(doc) {
        var d = doc || (typeof document !== 'undefined' ? document : null);
        if (!d) return;

        var wealthBar = d.querySelector('.PlayerToolbar-ContentCell .PlayerToolbar-Wealth') ||
                         d.querySelector('.PlayerToolbar-Wealth') ||
                         d.querySelector('.ToolbarGiftArea-container') ||
                         d.querySelector('.PlayerToolbar');
        if (!wealthBar || wealthBar.querySelector('.miuix-ex-icon')) return;

        var iconBtn = d.createElement('div');
        iconBtn.className = 'miuix-ex-icon';
        iconBtn.title = 'DouyuEx-RL NEXT 控制中心 (点击展开/收起)';
        iconBtn.appendChild(icons.createSvg('pokeball', 20));

        iconBtn.addEventListener('click', function (e) {
          e.stopPropagation();
          toggleDock();
        });

        // 插入在财富/礼物栏头部
        if (wealthBar.firstChild) {
          wealthBar.insertBefore(iconBtn, wealthBar.firstChild);
        } else {
          wealthBar.appendChild(iconBtn);
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
        var launcher = document.querySelector('.miuix-ex-icon');
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
