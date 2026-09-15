// src/platform/page_bridge.js
(function () {
  'use strict';
  if (!globalThis.DYEXRL_NEXT) return;

  globalThis.DYEXRL_NEXT.registry.register('platform.pageBridge', [], function () {
    var win = typeof window !== 'undefined' ? window : globalThis;
    var MESSAGE_PREFIX = 'DYEXRL_PAGE_BRIDGE:';

    var ALLOWED_TYPES = new Set([
      'RANK_STT_PACKET',
      'QUALITY_STATE',
      'PLAYER_EVENT',
      'PING',
      'PONG'
    ]);

    var listeners = new Map();
    var isListening = false;

    function handleMessage(event) {
      if (!event || event.source !== win) return;
      var raw = event.data;
      if (typeof raw !== 'string' || !raw.startsWith(MESSAGE_PREFIX)) return;

      var parsed;
      try {
        parsed = JSON.parse(raw.slice(MESSAGE_PREFIX.length));
      } catch (e) {
        return;
      }

      if (!parsed || typeof parsed.type !== 'string') return;
      if (!ALLOWED_TYPES.has(parsed.type)) return;

      var typeListeners = listeners.get(parsed.type);
      if (typeListeners) {
        typeListeners.forEach(function (fn) {
          try {
            fn(parsed.payload, parsed.generation);
          } catch (err) {
            console.error('[NEXT PageBridge] Listener error:', err);
          }
        });
      }
    }

    function ensureListener() {
      if (!isListening && typeof win.addEventListener === 'function') {
        win.addEventListener('message', handleMessage, false);
        isListening = true;
      }
    }

    var bridge = {
      send: function (type, payload, generation) {
        if (!ALLOWED_TYPES.has(type)) {
          throw new Error('[NEXT PageBridge] Disallowed message type: ' + type);
        }
        var msg = MESSAGE_PREFIX + JSON.stringify({
          type: type,
          payload: payload,
          generation: generation || 0,
          timestamp: Date.now()
        });
        if (typeof win.postMessage === 'function') {
          win.postMessage(msg, '*');
        }
      },
      subscribe: function (type, callback) {
        if (!ALLOWED_TYPES.has(type)) {
          throw new Error('[NEXT PageBridge] Cannot subscribe to disallowed message type: ' + type);
        }
        if (typeof callback !== 'function') {
          throw new Error('[NEXT PageBridge] Callback must be a function');
        }
        ensureListener();
        if (!listeners.has(type)) {
          listeners.set(type, new Set());
        }
        listeners.get(type).add(callback);

        return function unsubscribe() {
          var set = listeners.get(type);
          if (set) {
            set.delete(callback);
            if (set.size === 0) {
              listeners.delete(type);
            }
          }
        };
      },
      destroy: function () {
        if (isListening && typeof win.removeEventListener === 'function') {
          win.removeEventListener('message', handleMessage, false);
          isListening = false;
        }
        listeners.clear();
      }
    };

    return bridge;
  });
})();
