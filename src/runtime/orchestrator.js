// src/runtime/orchestrator.js
(function () {
  'use strict';
  if (!globalThis.DYEXRL_NEXT) return;

  globalThis.DYEXRL_NEXT.registry.register('runtime.orchestrator', [
    'router.index',
    'store.index',
    'store.migrator',
    'runtime.scope',
    'ui.tokens',
    'ui.dock',
    'ui.miuix',
    'core.p2p',
    'core.quality',
    'core.rank',
    'modules.danmaku.tail',
    'modules.radar.redpacket',
    'ui.modals.fansPanel',
    'ui.modals.signPanel',
    'ui.modals.livetoolPanel',
    'ui.modals.mediaPanel',
    'ui.modals.settingPanel'
  ], function (
    router,
    store,
    migrator,
    scope,
    tokens,
    dock,
    miuix,
    p2p,
    quality,
    rank,
    danmakuTail,
    redpacket,
    fansPanel,
    signPanel,
    livetoolPanel,
    mediaPanel,
    settingPanel
  ) {
    var activeRoomScope = null;
    var routerInstance = null;
    var dockInstance = null;
    var panelInstances = {};

    function bootstrap(targetWindow) {
      var win = targetWindow || (typeof window !== 'undefined' ? window : globalThis);
      var doc = win.document || (typeof document !== 'undefined' ? document : null);

      // 1. Inject MIUIX pure CSS variables and tokens
      if (doc) {
        tokens.injectTokens(doc);
      }

      // 2. Run safe legacy data migration (idempotent)
      migrator.migrateLegacyData({ storage: win.localStorage, force: true });

      // 3. Install core interceptors (P2P blocker, quality locks)
      p2p.install(win);
      quality.install(win);

      // 4. Initialize router
      routerInstance = router.initRouter(win);

      // 5. Initialize Dock and Modals for Live Rooms
      function setupRouteScope(routeEvent) {
        if (activeRoomScope) {
          activeRoomScope.destroy();
          activeRoomScope = null;
        }

        // Clean existing dock if any
        if (dockInstance && dockInstance.element) {
          dockInstance.element.remove();
          dockInstance = null;
        }

        if (routeEvent.role === 'R-01' || routeEvent.role === 'R-02') {
          activeRoomScope = scope.createScope({ generation: routeEvent.generation });
          store.set('runtime.room', {
            rid: routeEvent.rid || '',
            generation: routeEvent.generation,
            isLive: true
          });

          if (doc && typeof doc.createElement === 'function') {
            // Lazy instantiate panels
            panelInstances.fans = fansPanel.createFansPanel();
            panelInstances.sign = signPanel.createSignPanel();
            panelInstances.livetool = livetoolPanel.createLivetoolPanel();
            panelInstances.media = mediaPanel.createMediaPanel();
            panelInstances.setting = settingPanel.createSettingPanel();

            // Create Dock
            dockInstance = dock.createDock({
              onItemClick: function (itemDef, btnEl) {
                if (itemDef.id === 'fans-continue' && panelInstances.fans) {
                  panelInstances.fans.show(btnEl);
                } else if (itemDef.id === 'ex-sign' && panelInstances.sign) {
                  panelInstances.sign.show(btnEl);
                } else if (itemDef.id === 'livetool' && panelInstances.livetool) {
                  panelInstances.livetool.show(btnEl);
                } else if (itemDef.id === 'media-panel' && panelInstances.media) {
                  panelInstances.media.show(btnEl);
                } else if (itemDef.id === 'ex-setting' && panelInstances.setting) {
                  panelInstances.setting.show(btnEl);
                } else if (itemDef.id === 'ex-update') {
                  miuix.Toast('当前已是最新 DouyuEx-RL NEXT 构建版本', 'info');
                } else {
                  miuix.Toast('【' + itemDef.title + '】面板准备就绪', 'info');
                }
              }
            });

            function mountDock() {
              if (doc && doc.body && dockInstance && dockInstance.element && !dockInstance.element.parentNode) {
                doc.body.appendChild(dockInstance.element);
              }
            }

            if (doc.body) {
              mountDock();
            } else {
              doc.addEventListener('DOMContentLoaded', mountDock, { once: true });
              if (typeof win.addEventListener === 'function') {
                win.addEventListener('load', mountDock, { once: true });
              }
            }

            // Initialize danmaku tail and background pickers
            danmakuTail.initTailListener();
            var pickTimer = redpacket.startAutoPicker();
            if (pickTimer && activeRoomScope) {
              activeRoomScope.add(function () {
                redpacket.stopAutoPicker();
              });
            }
          }
        }
      }

      setupRouteScope({
        role: routerInstance.role,
        rid: routerInstance.rid,
        generation: routerInstance.generation
      });

      routerInstance.subscribe(setupRouteScope);

      return {
        router: routerInstance,
        getDockInstance: function () { return dockInstance; },
        getPanels: function () { return panelInstances; },
        getActiveRoomScope: function () { return activeRoomScope; },
        destroy: function () {
          if (activeRoomScope) {
            activeRoomScope.destroy();
            activeRoomScope = null;
          }
          if (dockInstance && dockInstance.element) {
            dockInstance.element.remove();
            dockInstance = null;
          }
          redpacket.stopAutoPicker();
          p2p.uninstall();
          quality.uninstall();
          store.destroy();
        }
      };
    }

    return {
      bootstrap: bootstrap
    };
  });
})();
