// src/core/quality.js
(function () {
  'use strict';
  if (!globalThis.DYEXRL_NEXT) return;

  globalThis.DYEXRL_NEXT.registry.register('core.quality', [], function () {
    var PROTECT_WINDOW_MS = 12000;
    var installedWindows = new WeakMap();

    function createQualityInterceptor() {
      var _lastPath = '';
      var _roomEnterTime = 0;

      function isInitialLoad(currentPath) {
        var path = currentPath || (typeof location !== 'undefined' ? location.pathname : '');
        if (_lastPath !== path) {
          _lastPath = path;
          _roomEnterTime = Date.now();
        }
        return (Date.now() - _roomEnterTime) < PROTECT_WINDOW_MS;
      }

      function resetProtectionWindow() {
        _roomEnterTime = Date.now();
      }

      function rewriteRateInString(str) {
        if (typeof str !== 'string') return str;
        var replaced = str.replace(/(^|&)rate=[^&]*/, '$1rate=0');
        if (!replaced.includes('rate=')) {
          replaced += (replaced.includes('?') ? '&' : (replaced.length > 0 ? '&' : '')) + 'rate=0';
        }
        return replaced;
      }

      function rewriteBetardData(data) {
        if (!data || typeof data !== 'object') return data;
        if (data.room && Array.isArray(data.room.multirates) && data.room.multirates.length > 0) {
          var topRate = data.room.multirates[0].type;
          if (typeof topRate !== 'undefined') {
            data.room.rate = topRate;
          }
        }
        return data;
      }

      function packHostPreference(val, nowMs) {
        var now = nowMs || Date.now();
        var forever = now + 86400000 * 365;
        return JSON.stringify({ c: now, e: forever, v: JSON.stringify(val), r: 1 });
      }

      function mirrorHostPreferences(storage, nowMs) {
        if (!storage) return;
        try {
          var packed = packHostPreference(0, nowMs);
          storage.setItem('rateRecordTime_h5p_room', packed);
          storage.setItem('realRateModel2_h5p_room', packed);
          storage.setItem('player_storage_quality_h5p_room', packed);
          storage.setItem('player_storage_rate_h5p_room', packed);
          storage.setItem('realRateModel2', packed);
          storage.setItem('player_storage_quality', packed);
        } catch (e) {}
      }

      function install(targetWindow) {
        var win = targetWindow || (typeof window !== 'undefined' ? window : globalThis);
        if (installedWindows.has(win)) return; // Idempotent

        var origFetch = win.fetch;
        var origXhrOpen = win.XMLHttpRequest ? win.XMLHttpRequest.prototype.open : null;
        var origXhrSend = win.XMLHttpRequest ? win.XMLHttpRequest.prototype.send : null;

        var disposers = [];

        // 1. Mirror host preferences
        if (win.localStorage) {
          mirrorHostPreferences(win.localStorage);
        }

        // 2. preloadStreamUrlPromise getter
        try {
          var _preloadVal = undefined;
          var origDescriptor = Object.getOwnPropertyDescriptor(win, 'preloadStreamUrlPromise');
          Object.defineProperty(win, 'preloadStreamUrlPromise', {
            configurable: true,
            enumerable: true,
            get: function () {
              return isInitialLoad() ? undefined : _preloadVal;
            },
            set: function (v) {
              _preloadVal = v;
            }
          });
          disposers.push(function () {
            try {
              if (origDescriptor) Object.defineProperty(win, 'preloadStreamUrlPromise', origDescriptor);
              else delete win.preloadStreamUrlPromise;
            } catch (e) {}
          });
        } catch (e) {}

        // 3. getLegacyFirstStream hook
        try {
          var _origFirstStream = undefined;
          var origFirstStreamDesc = Object.getOwnPropertyDescriptor(win, 'getLegacyFirstStream');
          Object.defineProperty(win, 'getLegacyFirstStream', {
            configurable: true,
            enumerable: true,
            get: function () { return _origFirstStream; },
            set: function (fn) {
              if (typeof fn === 'function') {
                _origFirstStream = function (opts) {
                  try {
                    if (opts && typeof opts === 'object' && isInitialLoad()) {
                      opts.rate = 0;
                    }
                  } catch (err) {}
                  return fn.call(this, opts);
                };
              } else {
                _origFirstStream = fn;
              }
            }
          });
          disposers.push(function () {
            try {
              if (origFirstStreamDesc) Object.defineProperty(win, 'getLegacyFirstStream', origFirstStreamDesc);
              else delete win.getLegacyFirstStream;
            } catch (e) {}
          });
        } catch (e) {}

        installedWindows.set(win, function () {
          disposers.forEach(function (d) { try { d(); } catch (e) {} });
        });
      }

      function uninstall(targetWindow) {
        var win = targetWindow || (typeof window !== 'undefined' ? window : globalThis);
        var cleanup = installedWindows.get(win);
        if (cleanup) {
          cleanup();
          installedWindows.delete(win);
        }
      }

      return {
        isInitialLoad: isInitialLoad,
        resetProtectionWindow: resetProtectionWindow,
        rewriteRateInString: rewriteRateInString,
        rewriteBetardData: rewriteBetardData,
        packHostPreference: packHostPreference,
        mirrorHostPreferences: mirrorHostPreferences,
        install: install,
        uninstall: uninstall,
        PROTECT_WINDOW_MS: PROTECT_WINDOW_MS
      };
    }

    return createQualityInterceptor();
  });
})();
