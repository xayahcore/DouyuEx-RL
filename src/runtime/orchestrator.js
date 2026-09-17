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
    'ui.modals.extoolPanel',
    'ui.modals.livetoolPanel',
    'ui.modals.bloopPanel',
    'ui.modals.lotteryPanel',
    'ui.modals.popupPlayerPanel',
    'ui.modals.updatePanel',
    'ui.modals.mediaPanel',
    'ui.modals.settingPanel',
    'modules.ui.enhancements'
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
    extoolPanel,
    livetoolPanel,
    bloopPanel,
    lotteryPanel,
    popupPlayerPanel,
    updatePanel,
    mediaPanel,
    settingPanel,
    enhancements
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
          dockInstance.destroy();
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
            // 实例化 5 大一级面板 + 辅助面板
            panelInstances.sign = signPanel.createSignPanel();
            panelInstances.fans = fansPanel.createFansPanel();
            panelInstances.extool = extoolPanel.createExtoolPanel();
            panelInstances.livetool = livetoolPanel.createLivetoolPanel();
            panelInstances.bloop = bloopPanel.createBloopPanel();
            panelInstances.lottery = lotteryPanel.createLotteryPanel();
            panelInstances.popup = popupPlayerPanel.createPopupPlayerPanel();
            panelInstances.update = updatePanel.createUpdatePanel();
            panelInstances.media = mediaPanel.createMediaPanel();
            panelInstances.setting = settingPanel.createSettingPanel();

            // 创建遵循计划书 §13.2 规范的 9 按钮 Dock
            dockInstance = dock.createDock({
              onItemClick: function (itemDef, btnEl) {
                if (itemDef.id === 'ex-sign' && panelInstances.sign) {
                  panelInstances.sign.show(btnEl);
                } else if (itemDef.id === 'fans-continue' && panelInstances.fans) {
                  panelInstances.fans.show(btnEl);
                } else if (itemDef.id === 'extool' && panelInstances.extool) {
                  panelInstances.extool.show(btnEl);
                } else if (itemDef.id === 'livetool' && panelInstances.livetool) {
                  panelInstances.livetool.show(btnEl);
                } else if (itemDef.id === 'bloop' && panelInstances.bloop) {
                  panelInstances.bloop.show(btnEl);
                } else if (itemDef.id === 'ex-lottery' && panelInstances.lottery) {
                  panelInstances.lottery.show(btnEl);
                } else if (itemDef.id === 'popup-player' && panelInstances.popup) {
                  panelInstances.popup.show(btnEl);
                } else if (itemDef.id === 'ex-update' && panelInstances.update) {
                  panelInstances.update.show(btnEl);
                } else if (itemDef.id === 'ex-monitor') {
                  var rid = store.get('runtime.room.rid') || '60937';
                  window.open('https://www.douyuex.com/' + rid, '_blank');
                } else {
                  miuix.Toast('【' + itemDef.title + '】面板准备就绪', 'info');
                }
              }
            });

            // 注册面板至 Dock 槽位
            dockInstance.registerPanel('ex-sign', panelInstances.sign);
            dockInstance.registerPanel('fans-continue', panelInstances.fans);
            dockInstance.registerPanel('extool', panelInstances.extool);
            dockInstance.registerPanel('livetool', panelInstances.livetool);
            dockInstance.registerPanel('bloop', panelInstances.bloop);
            dockInstance.registerPanel('ex-lottery', panelInstances.lottery);
            dockInstance.registerPanel('popup-player', panelInstances.popup);
            dockInstance.registerPanel('ex-update', panelInstances.update);

            function mountAllUI() {
              if (!doc || !dockInstance || !dockInstance.element) return;

              // 1. 挂载礼物栏红白精灵球入口 (.miuix-ex-icon)
              dockInstance.mountLauncher(doc);

              // 2. 挂载 Dock
              if (typeof dockInstance.mount === 'function') {
                dockInstance.mount();
              } else if (doc.body && !dockInstance.element.parentNode) {
                doc.body.appendChild(dockInstance.element);
              }

              // 3. 挂载播放器视窗增强
              enhancements.mountChatTailButton(doc);
              enhancements.hookFloatingDanmakuPlusOne(doc);
              enhancements.hookFloatingDanmakuContextMenu(doc);
              enhancements.hookPlayerContextMenu(doc);
              enhancements.mountPlayerToolbarButton(doc, function (btnEl) {
                if (panelInstances.media) panelInstances.media.show(btnEl);
              });
            }

            if (doc.body) {
              mountAllUI();
            } else {
              doc.addEventListener('DOMContentLoaded', mountAllUI, { once: true });
              if (typeof win.addEventListener === 'function') {
                win.addEventListener('load', mountAllUI, { once: true });
              }
            }

            // 持续观察 SPA DOM 水合
            var watchTimer = setInterval(mountAllUI, 1200);
            if (activeRoomScope) {
              activeRoomScope.add(function () {
                clearInterval(watchTimer);
              });
            }

            // 初始化弹幕小尾巴与后台红包轮询
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
            dockInstance.destroy();
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
