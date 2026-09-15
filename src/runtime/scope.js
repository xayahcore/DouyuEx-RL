// src/runtime/scope.js
(function () {
  'use strict';
  if (!globalThis.DYEXRL_NEXT) return;

  globalThis.DYEXRL_NEXT.registry.register('runtime.scope', [], function () {
    function createScope(options) {
      var opts = options || {};
      var generation = opts.generation || 0;
      var parentSignal = opts.signal;
      var disposers = [];
      var timers = new Set();
      var isDestroyed = false;

      function add(disposeFn) {
        if (typeof disposeFn === 'function' && !isDestroyed) {
          disposers.push(disposeFn);
        }
        return disposeFn;
      }

      function timeout(fn, ms) {
        if (isDestroyed) return function () {};
        var timerId = setTimeout(function () {
          timers.delete(timerId);
          if (!isDestroyed) fn();
        }, ms);
        timers.add(timerId);

        return function cancel() {
          clearTimeout(timerId);
          timers.delete(timerId);
        };
      }

      function destroy() {
        if (isDestroyed) return;
        isDestroyed = true;
        timers.forEach(function (id) {
          clearTimeout(id);
        });
        timers.clear();
        for (var i = disposers.length - 1; i >= 0; i--) {
          try {
            disposers[i]();
          } catch (err) {
            console.error('[NEXT Scope] Disposer error:', err);
          }
        }
        disposers = [];
      }

      if (parentSignal && typeof parentSignal.addEventListener === 'function') {
        parentSignal.addEventListener('abort', destroy, { once: true });
      }

      return {
        generation: generation,
        get isDestroyed() { return isDestroyed; },
        add: add,
        timeout: timeout,
        destroy: destroy
      };
    }

    return { createScope: createScope };
  });
})();
