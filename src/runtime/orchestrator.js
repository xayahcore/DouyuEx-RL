// src/runtime/orchestrator.js
(function () {
  'use strict';
  if (!globalThis.DYEXRL_NEXT) return;

  globalThis.DYEXRL_NEXT.registry.register('runtime.orchestrator', [
    'router.index',
    'store.index',
    'store.migrator',
    'runtime.scope'
  ], function (router, store, migrator, scope) {
    var activeRoomScope = null;
    var routerInstance = null;

    function bootstrap(targetWindow) {
      var win = targetWindow || (typeof window !== 'undefined' ? window : globalThis);

      // 1. Run safe legacy data migration (idempotent)
      migrator.migrateLegacyData();

      // 2. Initialize router
      routerInstance = router.initRouter(win);

      // 3. Handle route changes
      function setupRouteScope(routeEvent) {
        if (activeRoomScope) {
          activeRoomScope.destroy();
          activeRoomScope = null;
        }

        if (routeEvent.role === 'R-01') {
          activeRoomScope = scope.createScope({ generation: routeEvent.generation });
          store.set('runtime.room', {
            rid: routeEvent.rid || '',
            generation: routeEvent.generation,
            isLive: true
          });
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
        getActiveRoomScope: function () { return activeRoomScope; },
        destroy: function () {
          if (activeRoomScope) {
            activeRoomScope.destroy();
            activeRoomScope = null;
          }
          store.destroy();
        }
      };
    }

    return {
      bootstrap: bootstrap
    };
  });
})();
