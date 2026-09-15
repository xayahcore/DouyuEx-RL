// src/runtime/events.js
(function () {
  'use strict';
  if (!globalThis.DYEXRL_NEXT) return;

  globalThis.DYEXRL_NEXT.registry.register('runtime.events', [], function () {
    function createEventBus() {
      var listeners = new Map();

      function on(event, callback) {
        if (typeof event !== 'string' || typeof callback !== 'function') {
          throw new Error('[NEXT EventBus] Invalid event or callback');
        }
        if (!listeners.has(event)) {
          listeners.set(event, new Set());
        }
        listeners.get(event).add(callback);

        return function off() {
          var set = listeners.get(event);
          if (set) {
            set.delete(callback);
            if (set.size === 0) listeners.delete(event);
          }
        };
      }

      function emit(event, data) {
        var set = listeners.get(event);
        if (!set) return;
        set.forEach(function (fn) {
          try {
            fn(data);
          } catch (err) {
            console.error('[NEXT EventBus] Listener error on ' + event + ':', err);
          }
        });
      }

      function clear() {
        listeners.clear();
      }

      return {
        on: on,
        emit: emit,
        clear: clear
      };
    }

    return { createEventBus: createEventBus };
  });
})();
