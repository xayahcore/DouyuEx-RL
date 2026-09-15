// src/router/index.js
(function () {
  'use strict';
  if (!globalThis.DYEXRL_NEXT) return;

  globalThis.DYEXRL_NEXT.registry.register('router.index', ['runtime.events'], function (events) {
    var eventBus = events.createEventBus();
    var currentRole = null;
    var currentRid = '';
    var generation = 0;

    function parseNumericRoomId(pathname) {
      if (!pathname) return '';
      var m = pathname.match(/^\/(\d+)/);
      return m ? m[1] : '';
    }

    function matchRoute(urlStr) {
      var url;
      try {
        url = new URL(urlStr, 'https://www.douyu.com');
      } catch (e) {
        return { role: 'R-08', name: 'NO_OP', url: urlStr };
      }

      var host = url.hostname;
      var path = url.pathname;
      var search = url.search;

      // 1. R-07: Clean pipeline (Priority 1)
      if ((host.includes('msg.douyu.com') || host.includes('yuba.douyu.com') || host.includes('cz.douyu.com') || host.includes('v.douyu.com')) && search.includes('exClean')) {
        return { role: 'R-07', name: 'CLEAN_PIPELINE', host: host };
      }

      // 2. R-05: Passport switch pipeline (Priority 2)
      if (host.includes('passport.douyu.com') && search.includes('exid=chun')) {
        var cmd = url.searchParams.get('cmd') || '';
        var uid = url.searchParams.get('uid') || '';
        return { role: 'R-05', name: 'PASSPORT_PIPELINE', cmd: cmd, uid: uid };
      }

      // 3. R-06: Fans badge stats (Priority 3)
      if (path.includes('/member/cp/getFansBadgeList')) {
        return { role: 'R-06', name: 'BADGE_STATS' };
      }

      // 4. R-04: Yuba restore or general (Priority 4)
      if (host.includes('yuba.douyu.com')) {
        var isRestore = search.includes('exRestore');
        return { role: 'R-04', name: 'YUBA', isRestore: isRestore };
      }

      // 5. R-03: VOD video playback (Priority 5)
      if (host.includes('v.douyu.com') && path.includes('/show/')) {
        var vid = path.split('/show/')[1] || '';
        return { role: 'R-03', name: 'VOD', vid: vid };
      }

      // 6. R-02: Pure popup player stream (Priority 6)
      if (search.includes('exid=chun')) {
        return { role: 'R-02', name: 'POPUP_STREAM' };
      }

      // 7. R-01: Standard live room (Priority 7)
      if (!path.includes('/template/') && !path.includes('/h5/')) {
        var numRid = parseNumericRoomId(path);
        if (numRid || path.includes('/beta/') || path.includes('/topic/')) {
          return { role: 'R-01', name: 'LIVE_ROOM', rid: numRid };
        }
      }

      // 8. R-08: Default no-op
      return { role: 'R-08', name: 'NO_OP' };
    }

    function initRouter(targetWindow) {
      var win = targetWindow || (typeof window !== 'undefined' ? window : globalThis);
      var initialMatch = matchRoute(win.location ? win.location.href : 'https://www.douyu.com/9999');
      currentRole = initialMatch.role;
      currentRid = initialMatch.rid || '';
      generation = 1;

      // Hook SPA history navigation
      if (win.history && typeof win.history.pushState === 'function') {
        var origPushState = win.history.pushState;
        var origReplaceState = win.history.replaceState;

        win.history.pushState = function () {
          var res = origPushState.apply(this, arguments);
          handleLocationChange(win.location.href);
          return res;
        };

        win.history.replaceState = function () {
          var res = origReplaceState.apply(this, arguments);
          handleLocationChange(win.location.href);
          return res;
        };

        win.addEventListener('popstate', function () {
          handleLocationChange(win.location.href);
        }, false);
      }

      function handleLocationChange(newUrl) {
        var match = matchRoute(newUrl);
        var newRid = match.rid || '';
        if (match.role === currentRole && newRid === currentRid) return; // Same room

        var prevRid = currentRid;
        currentRole = match.role;
        currentRid = newRid;
        generation += 1;

        eventBus.emit('route.changed', {
          role: currentRole,
          previousRid: prevRid,
          rid: currentRid,
          generation: generation
        });
      }

      return {
        get role() { return currentRole; },
        get rid() { return currentRid; },
        get generation() { return generation; },
        matchRoute: matchRoute,
        subscribe: function (fn) {
          return eventBus.on('route.changed', fn);
        }
      };
    }

    return {
      matchRoute: matchRoute,
      parseNumericRoomId: parseNumericRoomId,
      initRouter: initRouter
    };
  });
})();
