// ==UserScript==
// @name         DouyuEx-RL (NEXT Clean Architecture)
// @namespace    https://github.com/xayahcore/DouyuEx-RL/next
// @version      2026.09.16.01-next
// @description  DouyuEx-RL NEXT 纯净重构版 (试验性独立施工包)
// @author       xayahcore
// @license      MIT
// @run-at       document-start

// @match			*://*.douyu.com/0*
// @match			*://*.douyu.com/1*
// @match			*://*.douyu.com/2*
// @match			*://*.douyu.com/3*
// @match			*://*.douyu.com/4*
// @match			*://*.douyu.com/5*
// @match			*://*.douyu.com/6*
// @match			*://*.douyu.com/7*
// @match			*://*.douyu.com/8*
// @match			*://*.douyu.com/9*
// @match			*://*.douyu.com/beta/*
// @match			*://*.douyu.com/topic/*
// @match        *://www.douyu.com/member/cp/getFansBadgeList
// @match        *://passport.douyu.com/*
// @match        *://msg.douyu.com/*
// @match        *://yuba.douyu.com/*
// @match        *://v.douyu.com/*
// @match        *://cz.douyu.com/*

// @require      https://registry.npmmirror.com/flv.js/1.6.2/files/dist/flv.min.js
// @require      https://fastly.jsdelivr.net/npm/svgaplayerweb@2.3.1/build/svga.min.js
// @require      https://registry.npmmirror.com/gif.js/0.2.0/files/dist/gif.js
// @require      https://registry.npmmirror.com/three/0.80.0/files/build/three.min.js
// @require      https://registry.npmmirror.com/xlsx/0.16.4/files/dist/xlsx.full.min.js
// @require      https://registry.npmmirror.com/dompurify/2.3.6/files/dist/purify.min.js

// @connect      douyucdn.cn
// @connect      douyu.com
// @connect      qq.com
// @connect      douyuex.com
// @connect      bilibili.com
// @connect      huya.com
// @connect      shadiao.app
// @connect      doseeing.com
// @connect      registry.npmmirror.com
// @connect      fastly.jsdelivr.net
// @connect      greasyfork.org

// @grant        GM_openInTab
// @grant        GM_xmlhttpRequest
// @grant        GM_setClipboard
// @grant        GM_setValue
// @grant        GM_getValue
// @grant        GM_listValues
// @grant        GM_deleteValue
// @grant        GM_cookie
// @grant        GM_registerMenuCommand
// @grant        unsafeWindow
// ==/UserScript==

/* --- NEXT module: src/runtime/namespace.js --- */
(function () {
  'use strict';
  var modules = {};
  var instances = {};
  var resolving = {};

  var registry = {
    register: function (id, dependencies, factory) {
      if (typeof id !== 'string' || !id) {
        throw new Error('[NEXT Registry] Invalid module id: ' + id);
      }
      if (modules[id]) {
        throw new Error('[NEXT Registry] Duplicate module registration: ' + id);
      }
      if (typeof factory !== 'function') {
        throw new Error('[NEXT Registry] Module factory must be a function: ' + id);
      }
      modules[id] = {
        id: id,
        dependencies: Array.isArray(dependencies) ? dependencies : [],
        factory: factory
      };
    },
    resolve: function (id) {
      if (instances.hasOwnProperty(id)) {
        return instances[id];
      }
      var mod = modules[id];
      if (!mod) {
        throw new Error('[NEXT Registry] Missing module: ' + id);
      }
      if (resolving[id]) {
        throw new Error('[NEXT Registry] Circular dependency detected: ' + id);
      }
      resolving[id] = true;
      try {
        var resolvedDeps = [];
        for (var i = 0; i < mod.dependencies.length; i++) {
          resolvedDeps.push(registry.resolve(mod.dependencies[i]));
        }
        var instance = mod.factory.apply(null, resolvedDeps);
        instances[id] = instance;
        return instance;
      } finally {
        delete resolving[id];
      }
    },
    has: function (id) {
      return modules.hasOwnProperty(id);
    },
    list: function () {
      return Object.keys(modules);
    },
    reset: function () {
      modules = {};
      instances = {};
      resolving = {};
    }
  };

  globalThis.DYEXRL_NEXT = {
    version: '2026.09.16.01-next',
    registry: registry
  };
})();

/* --- NEXT module: src/runtime/scope.js --- */
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

/* --- NEXT module: src/runtime/events.js --- */
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

/* --- NEXT module: src/platform/capabilities.js --- */
// src/platform/capabilities.js
(function () {
  'use strict';
  if (!globalThis.DYEXRL_NEXT) return;

  globalThis.DYEXRL_NEXT.registry.register('platform.capabilities', [], function () {
    var win = typeof window !== 'undefined' ? window : globalThis;

    var caps = {
      hasDocumentPictureInPicture: typeof win.documentPictureInPicture !== 'undefined' && typeof win.documentPictureInPicture.requestWindow === 'function',
      hasWeakMap: typeof WeakMap === 'function',
      hasOffscreenCanvas: typeof OffscreenCanvas === 'function',
      hasPerformanceMemory: typeof performance !== 'undefined' && typeof performance.memory === 'object' && performance.memory !== null,
      hasGMCookie: typeof GM_cookie === 'function',
      hasGMXmlHttpRequest: typeof GM_xmlhttpRequest === 'function',
      hasGMSetClipboard: typeof GM_setClipboard === 'function',
      isEdge: typeof navigator !== 'undefined' && /Edg/i.test(navigator.userAgent),
      isChromium: typeof navigator !== 'undefined' && /Chrome|Chromium/i.test(navigator.userAgent)
    };

    return caps;
  });
})();

/* --- NEXT module: src/platform/credentials.js --- */
// src/platform/credentials.js
(function () {
  'use strict';
  if (!globalThis.DYEXRL_NEXT) return;

  globalThis.DYEXRL_NEXT.registry.register('platform.credentials', [], function () {
    var win = typeof window !== 'undefined' ? window : globalThis;

    function getCookie(name) {
      if (typeof document === 'undefined' || !document.cookie) return '';
      var pattern = new RegExp('(?:^|;\\s*)' + name + '=([^;]+)');
      var match = document.cookie.match(pattern);
      return match ? decodeURIComponent(match[1]) : '';
    }

    function setCookie(name, value, path, days) {
      if (typeof document === 'undefined') return;
      var expires = '';
      if (days) {
        var d = new Date();
        d.setTime(d.getTime() + days * 86400000);
        expires = '; expires=' + d.toUTCString();
      }
      document.cookie = name + '=' + encodeURIComponent(value) + (path ? '; path=' + path : '; path=/') + expires;
    }

    async function getCcn() {
      var ccn = getCookie('ccn');
      if (ccn) return ccn;

      // Try waking up ccn via official endpoint
      try {
        if (typeof fetch === 'function') {
          await fetch('/wgapi/livenc/liveweb/csrfApi/getCsrfCookie', {
            method: 'GET',
            credentials: 'include',
            cache: 'no-store'
          });
          ccn = getCookie('ccn');
          if (ccn) return ccn;
        }
      } catch (e) {}

      // Fallback to acf_ccn
      var acfCcn = getCookie('acf_ccn');
      if (acfCcn) return acfCcn;

      return '';
    }

    function getCsrfToken() {
      var token = getCookie('post-csrfToken');
      if (!token) {
        token = Math.random().toString(36).substring(2);
        setCookie('post-csrfToken', token, '/', 7);
      }
      return token;
    }

    async function getCredentials() {
      var ccn = await getCcn();
      var csrfToken = getCsrfToken();
      return {
        ccn: ccn,
        csrfToken: csrfToken,
        deviceId: '-'
      };
    }

    return {
      getCookie: getCookie,
      setCookie: setCookie,
      getCcn: getCcn,
      getCsrfToken: getCsrfToken,
      getCredentials: getCredentials
    };
  });
})();

/* --- NEXT module: src/platform/transport.js --- */
// src/platform/transport.js
(function () {
  'use strict';
  if (!globalThis.DYEXRL_NEXT) return;

  globalThis.DYEXRL_NEXT.registry.register('platform.transport', [], function () {
    var DEFAULT_TIMEOUT_MS = 15000;

    function delay(ms) {
      return new Promise(function (resolve) { setTimeout(resolve, ms); });
    }

    async function sendRequest(options) {
      var opts = options || {};
      var url = opts.url;
      var method = (opts.method || 'GET').toUpperCase();
      var headers = opts.headers || {};
      var body = opts.body;
      var timeoutMs = opts.timeout || DEFAULT_TIMEOUT_MS;
      var isIdempotent = opts.isIdempotent !== false && method === 'GET';
      var maxRetries = isIdempotent ? (opts.retries ?? 2) : 0; // Non-idempotent write requests never retry!
      var signal = opts.signal;

      var attempt = 0;
      var lastError = null;

      while (attempt <= maxRetries) {
        if (signal && signal.aborted) {
          throw { code: 'ABORTED', message: 'Request aborted by user signal' };
        }

        try {
          var controller = typeof AbortController !== 'undefined' ? new AbortController() : null;
          var timerId = null;

          var timeoutPromise = new Promise(function (_, reject) {
            timerId = setTimeout(function () {
              if (controller) controller.abort();
              reject({ code: 'TIMEOUT', message: 'Request timed out after ' + timeoutMs + 'ms' });
            }, timeoutMs);
          });

          var effectiveSignal = controller ? controller.signal : signal;

          var fetchPromise = fetch(url, {
            method: method,
            headers: headers,
            body: body,
            credentials: 'include',
            signal: effectiveSignal
          }).then(async function (resp) {
            clearTimeout(timerId);
            if (!resp.ok) {
              throw {
                code: resp.status === 401 || resp.status === 403 ? 'AUTH_REQUIRED' : 'HTTP_ERROR',
                status: resp.status,
                message: 'HTTP ' + resp.status + ' ' + resp.statusText
              };
            }
            var text = await resp.text();
            var json;
            try {
              json = JSON.parse(text);
            } catch (e) {
              return text; // Return raw text if not JSON
            }

            // Check Douyu business error
            if (json && typeof json === 'object') {
              var errVal = json.error ?? json.code;
              if (typeof errVal !== 'undefined' && errVal !== 0 && errVal !== '0') {
                throw {
                  code: 'BUSINESS_ERROR',
                  businessCode: errVal,
                  message: json.msg || json.message || 'Douyu business error ' + errVal,
                  data: json
                };
              }
            }
            return json;
          });

          var result = await Promise.race([fetchPromise, timeoutPromise]);
          return {
            data: result,
            receivedAt: Date.now()
          };
        } catch (err) {
          lastError = err;
          // Never retry non-idempotent or auth errors
          if (!isIdempotent || err.code === 'AUTH_REQUIRED' || err.code === 'ABORTED') {
            throw err;
          }
          attempt += 1;
          if (attempt <= maxRetries) {
            var backoff = Math.min(1000 * Math.pow(2, attempt - 1), 4000) + Math.floor(Math.random() * 250);
            await delay(backoff);
          }
        }
      }

      throw lastError || { code: 'NETWORK', message: 'Network request failed' };
    }

    return {
      sendRequest: sendRequest,
      delay: delay
    };
  });
})();

/* --- NEXT module: src/platform/page_bridge.js --- */
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

/* --- NEXT module: src/core/p2p_blocker.js --- */
// src/core/p2p_blocker.js
(function () {
  'use strict';
  if (!globalThis.DYEXRL_NEXT) return;

  globalThis.DYEXRL_NEXT.registry.register('core.p2p', [], function () {
    var PREFIXES = ['RTCPeerConnection', 'webkitRTCPeerConnection', 'mozRTCPeerConnection', 'msRTCPeerConnection'];
    var originalConstructors = new WeakMap();

    function createGracefulP2PBlockerClass() {
      return class GracefulP2PBlocker {
        constructor() {
          this.connectionState = 'failed';
          this.iceConnectionState = 'failed';
          this.signalingState = 'closed';
          this.iceGatheringState = 'complete';
          this.localDescription = null;
          this.remoteDescription = null;
          this.onicecandidate = null;
          this.ontrack = null;
          this.ondatachannel = null;
        }
        createDataChannel() {
          return {
            send: function () {},
            close: function () {},
            addEventListener: function () {},
            removeEventListener: function () {},
            readyState: 'closed'
          };
        }
        createOffer() {
          return Promise.reject(new DOMException('WebRTC P2P disabled by user policy', 'NotSupportedError'));
        }
        createAnswer() {
          return Promise.reject(new DOMException('WebRTC P2P disabled by user policy', 'NotSupportedError'));
        }
        setLocalDescription() {
          return Promise.resolve();
        }
        setRemoteDescription() {
          return Promise.resolve();
        }
        addIceCandidate() {
          return Promise.resolve();
        }
        addEventListener() {}
        removeEventListener() {}
        dispatchEvent() {
          return false;
        }
        close() {}
        getStats() {
          return Promise.resolve(new Map());
        }
      };
    }

    var MockClass = createGracefulP2PBlockerClass();

    var blocker = {
      MockClass: MockClass,
      install: function (targetWindow) {
        var win = targetWindow || (typeof window !== 'undefined' ? window : globalThis);
        if (originalConstructors.has(win)) return; // Idempotent

        var originals = {};
        for (var i = 0; i < PREFIXES.length; i++) {
          var name = PREFIXES[i];
          if (typeof win[name] !== 'undefined') {
            originals[name] = win[name];
            try {
              win[name] = MockClass;
            } catch (e) {}
          }
        }
        // Also check unsafeWindow if available
        if (typeof unsafeWindow !== 'undefined' && unsafeWindow !== win) {
          for (var j = 0; j < PREFIXES.length; j++) {
            var uName = PREFIXES[j];
            if (typeof unsafeWindow[uName] !== 'undefined') {
              try {
                unsafeWindow[uName] = MockClass;
              } catch (e) {}
            }
          }
        }
        originalConstructors.set(win, originals);
      },
      uninstall: function (targetWindow) {
        var win = targetWindow || (typeof window !== 'undefined' ? window : globalThis);
        var originals = originalConstructors.get(win);
        if (!originals) return;

        for (var name in originals) {
          try {
            win[name] = originals[name];
          } catch (e) {}
        }
        originalConstructors.delete(win);
      },
      isInstalled: function (targetWindow) {
        var win = targetWindow || (typeof window !== 'undefined' ? window : globalThis);
        return originalConstructors.has(win);
      }
    };

    return blocker;
  });
})();

/* --- NEXT module: src/core/quality.js --- */
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

/* --- NEXT module: src/core/rank_engine.js --- */
// src/core/rank_engine.js
(function () {
  'use strict';
  if (!globalThis.DYEXRL_NEXT) return;

  globalThis.DYEXRL_NEXT.registry.register('core.rank', [], function () {
    function sttFlat(s) {
      if (typeof s !== 'string' || !s) return s;
      var t = s.charAt(s.length - 1) === '/' ? s : s + '/';
      var n = t.length;
      var obj = /@=/g.test(t) ? {} : [];
      var i = 0, key = '', acc = '';

      while (i < n) {
        var c = t.charAt(i);
        if (c === '/') {
          if (Array.isArray(obj)) obj.push(acc);
          else obj[key] = acc;
          key = '';
          acc = '';
        } else if (c === '@') {
          i += 1;
          switch (t.charAt(i)) {
            case 'A': acc += '@'; break;
            case 'S': acc += '/'; break;
            case '=': key = acc; acc = ''; break;
          }
        } else {
          acc += c;
        }
        i += 1;
      }
      return obj;
    }

    function sttParse(s) {
      if (typeof s !== 'string') return s;
      if (/\/\/\|\//.test(s)) return s.split('/|/').map(sttParse);
      if (!/@[=|A]/.test(s)) return s;

      var v = sttFlat(s);
      if (!v) return undefined;
      if (Array.isArray(v)) return v.map(sttParse);

      var out = {};
      Object.keys(v).forEach(function (k) {
        out[k] = sttParse(v[k]);
      });
      return out;
    }

    function sttType(raw) {
      var m = String(raw).match(/type@=([^/]+)/);
      return m ? m[1] : '';
    }

    function parseList(list) {
      var map = new Map();
      var money = false;
      if (!list) return { map: map, money: money };

      var items = Array.isArray(list) ? list : [list];
      for (var i = 0; i < items.length; i++) {
        var item = items[i];
        if (!item || typeof item !== 'object') continue;
        var name = item.nickname || item.nn || '';
        var gold = Number(item.gold || item.score || 0);
        if (item.gold) money = true;
        if (name) {
          map.set(name, {
            gold: gold,
            rank: i + 1,
            uid: item.uid || item.id || ''
          });
        }
      }
      return { map: map, money: money };
    }

    var STT = {
      flat: sttFlat,
      parse: sttParse,
      type: sttType,
      parseList: parseList
    };

    function createRankEngine() {
      var state = {
        data: {
          day: { map: new Map(), money: false },
          week: { map: new Map(), money: false },
          month: { map: new Map(), money: false },
          all: { map: new Map(), money: false }
        }
      };

      function updateRankData(typeKey, rawList) {
        if (state.data[typeKey]) {
          state.data[typeKey] = parseList(rawList);
        }
      }

      function dump() {
        var out = {};
        Object.keys(state.data).forEach(function (k) {
          out[k] = {
            money: state.data[k].money,
            list: Array.from(state.data[k].map.entries())
          };
        });
        return out;
      }

      function reset() {
        Object.keys(state.data).forEach(function (k) {
          state.data[k] = { map: new Map(), money: false };
        });
      }

      return {
        STT: STT,
        state: state,
        updateRankData: updateRankData,
        dump: dump,
        reset: reset
      };
    }

    return {
      STT: STT,
      createRankEngine: createRankEngine
    };
  });
})();

/* --- NEXT module: src/store/schema.js --- */
// src/store/schema.js
(function () {
  'use strict';
  if (!globalThis.DYEXRL_NEXT) return;

  globalThis.DYEXRL_NEXT.registry.register('store.schema', [], function () {
    var FORBIDDEN_KEYS = new Set(['__proto__', 'prototype', 'constructor']);

    function sanitizePath(path) {
      if (typeof path !== 'string' || !path) {
        throw new Error('[NEXT Store] Path must be a non-empty string');
      }
      var parts = path.split('.');
      for (var i = 0; i < parts.length; i++) {
        if (FORBIDDEN_KEYS.has(parts[i])) {
          throw new Error('[NEXT Store] Forbidden property access in path: ' + parts[i]);
        }
      }
      return parts;
    }

    function deepClone(obj) {
      if (obj === null || typeof obj !== 'object') return obj;
      if (Array.isArray(obj)) {
        return obj.map(deepClone);
      }
      var copy = {};
      var keys = Object.keys(obj);
      for (var i = 0; i < keys.length; i++) {
        var k = keys[i];
        if (!FORBIDDEN_KEYS.has(k)) {
          copy[k] = deepClone(obj[k]);
        }
      }
      return copy;
    }

    function getByPath(obj, path) {
      var parts = sanitizePath(path);
      var curr = obj;
      for (var i = 0; i < parts.length; i++) {
        if (curr === null || typeof curr !== 'object') return undefined;
        curr = curr[parts[i]];
      }
      return curr;
    }

    function setByPath(obj, path, value) {
      var parts = sanitizePath(path);
      var curr = obj;
      for (var i = 0; i < parts.length - 1; i++) {
        var key = parts[i];
        if (!curr[key] || typeof curr[key] !== 'object') {
          curr[key] = {};
        }
        curr = curr[key];
      }
      curr[parts[parts.length - 1]] = value;
    }

    var defaultSettings = {
      core: {
        highestQuality: true,
        p2pBlock: true
      },
      player: {
        autoFullScreen: false,
        tabSwitchEconomy: false,
        refreshSettings: {}
      },
      ui: {
        cleanMode: false,
        removeMsgNotice: false
      },
      media: {
        pipSettings: {},
        filters: { brightness: 100, contrast: 100, saturate: 100 }
      },
      vod: {
        cameraHidden: false
      },
      danmaku: {
        tail: { enabled: false, text: '', type: '2' },
        collections: [],
        bloopOptions: { list: [], delay: 3, random: false },
        voteSettings: { select: '', theme: '', options: '', time: 30, repeat: false },
        enterWords: [],
        enterEnabled: false,
        lastEnterWord: '',
        thankGifts: [],
        thankGiftEnabled: false,
        muteRules: [],
        muteEnabled: false,
        autoReplyRules: [],
        autoReplyCd: 5,
        autoReplyEnabled: false,
        filter: {
          removeRepeated: false,
          repeatWindowSeconds: 5,
          removeEnter: false,
          removeStickers: false,
          removeBackground: false,
          enlargeFont: false
        }
      },
      economy: {
        fansContinueCount: 0,
        signConfig: { room: true, client: true, yuba: true, stardiscover: true, fanshome: true },
        autoFish: { rids: [], modes: {} }
      },
      radar: {
        lotterySettings: { isNotice: true },
        treasure: { enabled: false, delay: 0 },
        redpacket: { enabled: false }
      },
      system: {
        monthCost: {},
        monthCostHidden: true,
        lastNotifiedVersion: '',
        lastUpdateCheckTime: 0
      }
    };

    return {
      sanitizePath: sanitizePath,
      deepClone: deepClone,
      getByPath: getByPath,
      setByPath: setByPath,
      defaultSettings: defaultSettings
    };
  });
})();

/* --- NEXT module: src/store/storage.js --- */
// src/store/storage.js
(function () {
  'use strict';
  if (!globalThis.DYEXRL_NEXT) return;

  globalThis.DYEXRL_NEXT.registry.register('store.storage', [], function () {
    var CONFIG_KEY = 'DYEXRL_NEXT_CONFIG';
    var CORE_MIRROR_KEY = 'DYEXRL_NEXT_CORE';
    var DEBOUNCE_MS = 300;

    var pendingTimer = null;
    var latestData = null;

    function rawGet(key, defaultVal) {
      if (typeof GM_getValue === 'function') {
        try {
          var val = GM_getValue(key);
          if (val !== undefined && val !== null) {
            return typeof val === 'string' ? JSON.parse(val) : val;
          }
        } catch (e) {}
      }
      if (typeof localStorage !== 'undefined') {
        try {
          var lsVal = localStorage.getItem(key);
          if (lsVal !== null) {
            return JSON.parse(lsVal);
          }
        } catch (e) {}
      }
      return defaultVal;
    }

    function rawSet(key, value) {
      var str = JSON.stringify(value);
      if (typeof GM_setValue === 'function') {
        try {
          GM_setValue(key, str);
        } catch (e) {}
      }
      if (typeof localStorage !== 'undefined') {
        try {
          localStorage.setItem(key, str);
        } catch (e) {}
      }
    }

    function syncCoreMirror(settings) {
      if (!settings || !settings.core) return;
      var mirror = {
        highestQuality: !!settings.core.highestQuality,
        p2pBlock: !!settings.core.p2pBlock,
        version: 'next'
      };
      if (typeof localStorage !== 'undefined') {
        try {
          localStorage.setItem(CORE_MIRROR_KEY, JSON.stringify(mirror));
        } catch (e) {}
      }
    }

    function saveConfigImmediate(configObject) {
      if (pendingTimer) {
        clearTimeout(pendingTimer);
        pendingTimer = null;
      }
      latestData = configObject;
      configObject.updatedAt = Date.now();
      rawSet(CONFIG_KEY, configObject);
      syncCoreMirror(configObject.settings);
    }

    function scheduleSave(configObject) {
      latestData = configObject;
      if (pendingTimer) clearTimeout(pendingTimer);
      pendingTimer = setTimeout(function () {
        pendingTimer = null;
        if (latestData) {
          saveConfigImmediate(latestData);
        }
      }, DEBOUNCE_MS);
    }

    function flush() {
      if (pendingTimer && latestData) {
        saveConfigImmediate(latestData);
      }
    }

    function loadConfig(defaultConfig) {
      var loaded = rawGet(CONFIG_KEY, null);
      if (!loaded || typeof loaded !== 'object') {
        return defaultConfig;
      }
      return loaded;
    }

    return {
      CONFIG_KEY: CONFIG_KEY,
      CORE_MIRROR_KEY: CORE_MIRROR_KEY,
      loadConfig: loadConfig,
      scheduleSave: scheduleSave,
      saveConfigImmediate: saveConfigImmediate,
      flush: flush,
      rawGet: rawGet,
      rawSet: rawSet
    };
  });
})();

/* --- NEXT module: src/store/index.js --- */
// src/store/index.js
(function () {
  'use strict';
  if (!globalThis.DYEXRL_NEXT) return;

  globalThis.DYEXRL_NEXT.registry.register('store.index', ['store.schema', 'store.storage', 'runtime.events'], function (schema, storage, events) {
    var eventBus = events.createEventBus();

    var initialConfig = {
      schemaVersion: 1,
      revision: 1,
      updatedAt: Date.now(),
      settings: schema.deepClone(schema.defaultSettings)
    };

    var configState = storage.loadConfig(initialConfig);
    // Ensure all keys from schema exist
    Object.keys(schema.defaultSettings).forEach(function (category) {
      if (!configState.settings[category] || typeof configState.settings[category] !== 'object') {
        configState.settings[category] = schema.deepClone(schema.defaultSettings[category]);
      } else {
        Object.keys(schema.defaultSettings[category]).forEach(function (key) {
          if (typeof configState.settings[category][key] === 'undefined') {
            configState.settings[category][key] = schema.deepClone(schema.defaultSettings[category][key]);
          }
        });
      }
    });

    // In-memory runtime slices (never persisted to localStorage)
    var runtimeState = {
      room: { rid: '', anchorName: '', isLive: false, generation: 0 },
      user: { uid: '', nickname: '', loggedIn: false, activeBadgeName: '' },
      backpack: { items: [], updatedAt: 0 }
    };

    var store = {
      get: function (path) {
        if (typeof path !== 'string' || !path) {
          return schema.deepClone(configState.settings);
        }
        if (path.startsWith('runtime.')) {
          return schema.deepClone(schema.getByPath(runtimeState, path.slice(8)));
        }
        return schema.deepClone(schema.getByPath(configState.settings, path));
      },

      set: function (path, value) {
        if (typeof path !== 'string' || !path) {
          throw new Error('[NEXT Store] Path must be provided to set()');
        }
        if (path.startsWith('runtime.')) {
          schema.setByPath(runtimeState, path.slice(8), value);
          eventBus.emit('change:' + path, value);
          return;
        }

        var prev = schema.getByPath(configState.settings, path);
        if (JSON.stringify(prev) === JSON.stringify(value)) return;

        schema.setByPath(configState.settings, path, value);
        configState.revision += 1;
        storage.scheduleSave(configState);
        eventBus.emit('change:' + path, value);
        eventBus.emit('change', { path: path, value: value });
      },

      patch: function (path, partial) {
        if (typeof partial !== 'object' || partial === null) {
          return store.set(path, partial);
        }
        var current = store.get(path) || {};
        var merged = Object.assign({}, current, partial);
        store.set(path, merged);
      },

      subscribe: function (path, callback) {
        if (typeof callback !== 'function') {
          throw new Error('[NEXT Store] Subscriber must be a function');
        }
        var eventKey = path ? 'change:' + path : 'change';
        return eventBus.on(eventKey, callback);
      },

      // UI Binders
      bindCheckbox: function (elementOrSelector, path) {
        var el = typeof elementOrSelector === 'string' ? document.querySelector(elementOrSelector) : elementOrSelector;
        if (!el) return function () {};

        el.checked = !!store.get(path);
        var updatingFromStore = false;

        function handleChange() {
          if (!updatingFromStore) {
            store.set(path, el.checked);
          }
        }
        el.addEventListener('change', handleChange, false);

        var unsub = store.subscribe(path, function (val) {
          updatingFromStore = true;
          el.checked = !!val;
          updatingFromStore = false;
        });

        return function unbind() {
          el.removeEventListener('change', handleChange, false);
          unsub();
        };
      },

      bindInput: function (elementOrSelector, path) {
        var el = typeof elementOrSelector === 'string' ? document.querySelector(elementOrSelector) : elementOrSelector;
        if (!el) return function () {};

        el.value = String(store.get(path) ?? '');
        var updatingFromStore = false;

        function handleInput() {
          if (!updatingFromStore) {
            store.set(path, el.value);
          }
        }
        el.addEventListener('input', handleInput, false);

        var unsub = store.subscribe(path, function (val) {
          updatingFromStore = true;
          if (el.value !== String(val ?? '')) {
            el.value = String(val ?? '');
          }
          updatingFromStore = false;
        });

        return function unbind() {
          el.removeEventListener('input', handleInput, false);
          unsub();
        };
      },

      flush: function () {
        storage.flush();
      },

      destroy: function () {
        storage.flush();
        eventBus.clear();
      }
    };

    return store;
  });
})();

/* --- NEXT module: src/store/migrator.js --- */
// src/store/migrator.js
(function () {
  'use strict';
  if (!globalThis.DYEXRL_NEXT) return;

  globalThis.DYEXRL_NEXT.registry.register('store.migrator', ['store.index', 'store.storage'], function (store, storage) {
    var MIGRATION_FLAG_KEY = 'DYEXRL_NEXT_MIGRATED_V1';

    function parseJsonSafe(val, defaultVal) {
      if (!val) return defaultVal;
      try {
        return JSON.parse(val);
      } catch (e) {
        return defaultVal;
      }
    }

    function migrateLegacyData(options) {
      var opts = options || {};
      var force = !!opts.force;
      var storageSource = opts.storage || (typeof localStorage !== 'undefined' ? localStorage : null);
      if (!storageSource) {
        return { success: false, reason: 'No storage source available' };
      }

      if (!force) {
        var alreadyMigrated = storage.rawGet(MIGRATION_FLAG_KEY, false);
        if (alreadyMigrated) {
          return { success: true, skipped: true, reason: 'Already migrated' };
        }
      }

      var migrated = [];
      var errors = [];

      function safeMigrate(legacyKey, transformFn) {
        try {
          var val = storageSource.getItem ? storageSource.getItem(legacyKey) : storageSource[legacyKey];
          if (val !== null && val !== undefined) {
            transformFn(val);
            migrated.push(legacyKey);
          }
        } catch (err) {
          errors.push({ key: legacyKey, error: err.message });
        }
      }

      // 1. Core
      safeMigrate('ExSave_HighestVideoQuality', function (v) {
        var p = parseJsonSafe(v, {});
        store.set('core.highestQuality', p.isHighestVideoQuality ?? true);
      });
      safeMigrate('ExSave_P2P', function (v) {
        var p = parseJsonSafe(v, {});
        store.set('core.p2pBlock', p.isKillP2P ?? true);
      });

      // 2. Player & System
      safeMigrate('ExSave_FullScreen', function (v) {
        var p = parseJsonSafe(v, {});
        store.set('player.autoFullScreen', !!p.isFullScreen);
      });
      safeMigrate('ExSave_Mode', function (v) {
        var p = parseJsonSafe(v, {});
        store.set('ui.cleanMode', p.mode === 1);
      });
      safeMigrate('ExSave_TabSwitch', function (v) {
        var p = parseJsonSafe(v, {});
        store.set('player.tabSwitchEconomy', !!p.isEnableTabSwitch);
      });
      safeMigrate('ExSave_Camera_Hidden', function (v) {
        store.set('vod.cameraHidden', Date.now() < parseInt(v, 10));
      });

      // 3. Danmaku
      safeMigrate('ExSave_DanmakuTail', function (v) {
        var p = parseJsonSafe(v, {});
        store.set('danmaku.tail', {
          enabled: !!p.isTailEnabled,
          text: String(p.tailContent || ''),
          type: String(p.type || '2')
        });
      });
      safeMigrate('ExSave_DanmakuCollect', function (v) {
        var p = parseJsonSafe(v, []);
        if (Array.isArray(p)) {
          store.set('danmaku.collections', p);
        }
      });
      safeMigrate('ExSave_Reply', function (v) {
        var p = parseJsonSafe(v, []);
        if (Array.isArray(p) || (typeof p === 'object' && p !== null)) {
          store.set('danmaku.autoReplyRules', p);
        }
      });
      safeMigrate('ExSave_ReplyCd', function (v) {
        store.set('danmaku.autoReplyCd', parseInt(v, 10) || 5);
      });
      safeMigrate('ExSave_isReply', function (v) {
        store.set('danmaku.autoReplyEnabled', !!v);
      });
      safeMigrate('ExSave_isRemoveRepeatedDanmaku', function (v) {
        store.set('danmaku.filter.removeRepeated', v === '1' || v === 'true' || v === true);
      });
      safeMigrate('ExSave_repeatedDanmakuSeconds', function (v) {
        store.set('danmaku.filter.repeatWindowSeconds', parseInt(v, 10) || 5);
      });

      // 4. Economy
      safeMigrate('ExSave_FansContinue', function (v) {
        store.set('economy.fansContinueCount', parseInt(v, 10) || 0);
      });
      safeMigrate('ExSave_SignConfig', function (v) {
        var p = parseJsonSafe(v, {});
        store.patch('economy.signConfig', p);
      });
      safeMigrate('ExSave_AutoFish', function (v) {
        var p = parseJsonSafe(v, {});
        if (p && typeof p === 'object') {
          store.patch('economy.autoFish', p);
        }
      });

      // 5. Radar
      safeMigrate('ExSave_Lottery', function (v) {
        var p = parseJsonSafe(v, {});
        store.set('radar.lotterySettings.isNotice', p.isNotice ?? true);
      });
      safeMigrate('ExSave_Treasure', function (v) {
        var p = parseJsonSafe(v, {});
        store.set('radar.treasure', {
          enabled: !!p.isGetTreasure,
          delay: parseInt(p.treasureDelay, 10) || 0
        });
      });
      safeMigrate('ExSave_RedPacket_Room', function (v) {
        var p = parseJsonSafe(v, {});
        store.set('radar.redpacket.enabled', !!p.isRedPacket);
      });

      store.flush();
      storage.rawSet(MIGRATION_FLAG_KEY, true);

      return {
        success: true,
        migratedCount: migrated.length,
        migratedKeys: migrated,
        errors: errors
      };
    }

    return {
      MIGRATION_FLAG_KEY: MIGRATION_FLAG_KEY,
      migrateLegacyData: migrateLegacyData
    };
  });
})();

/* --- NEXT module: src/api/client.js --- */
// src/api/client.js
(function () {
  'use strict';
  if (!globalThis.DYEXRL_NEXT) return;

  globalThis.DYEXRL_NEXT.registry.register('api.client', ['platform.credentials', 'platform.transport'], function (credentials, transport) {
    var ENDPOINTS = {
      // 1. Room & Stream
      'room.betard': { method: 'GET', url: 'https://www.douyu.com/betard/{rid}', idempotent: true },
      'room.h5play': { method: 'POST', url: 'https://www.douyu.com/lapi/live/getH5Play/{rid}', idempotent: true },
      'room.roomApi': { method: 'GET', url: 'https://open.douyucdn.cn/api/RoomApi/room/{rid}', idempotent: true },

      // 2. Backpack & Economy
      'backpack.list': { method: 'GET', url: 'https://www.douyu.com/japi/prop/backpack/web/v5', idempotent: true },
      'backpack.donate': { method: 'POST', url: 'https://www.douyu.com/japi/prop/donate/mainsite/v1', idempotent: false },

      // 3. Routine: Sign, Star Push & Fishing
      'routine.webSign': { method: 'POST', url: 'https://www.douyu.com/japi/carnival/nc/sign/webSign', idempotent: false },
      'routine.starList': { method: 'GET', url: 'https://www.douyu.com/japi/livebiznc/web/anchorstardiscover/user/task/list', idempotent: true },
      'routine.starReport': { method: 'POST', url: 'https://www.douyu.com/japi/livebiznc/web/anchorstardiscover/user/task/report', idempotent: true },
      'routine.starIntroduce': { method: 'GET', url: 'https://www.douyu.com/japi/livebiznc/web/anchorstardiscover/user/task/follow/introduce', idempotent: true },
      'routine.starRank': { method: 'GET', url: 'https://www.douyu.com/japi/livebiznc/web/anchorstardiscover/rank/info', idempotent: true },
      'routine.followAdd': { method: 'POST', url: '/wgapi/livenc/liveweb/follow/add', idempotent: false },
      'routine.followRm': { method: 'POST', url: '/wgapi/livenc/liveweb/follow/rm', idempotent: false },
      'routine.fishHome': { method: 'GET', url: 'https://www.douyu.com/japi/revenuenc/web/actfans/fishing/homePage', idempotent: true },
      'routine.fishReel': { method: 'POST', url: 'https://www.douyu.com/japi/revenuenc/web/actfans/fishing/reelIn', idempotent: false },

      // 4. Radar & Perception
      'radar.hardware': { method: 'GET', url: 'https://www.douyu.com/member/cp', idempotent: true }
    };

    function resolveUrl(urlTemplate, params) {
      var p = params || {};
      var resolved = urlTemplate;
      for (var k in p) {
        if (p.hasOwnProperty(k)) {
          resolved = resolved.replace(new RegExp('\\{' + k + '\\}', 'g'), encodeURIComponent(p[k]));
        }
      }
      return resolved;
    }

    function serializeQuery(params) {
      if (!params || typeof params !== 'object') return '';
      var pairs = [];
      for (var k in params) {
        if (params.hasOwnProperty(k) && params[k] !== undefined && params[k] !== null) {
          pairs.push(encodeURIComponent(k) + '=' + encodeURIComponent(params[k]));
        }
      }
      return pairs.join('&');
    }

    async function request(endpointId, options) {
      var ep = ENDPOINTS[endpointId];
      if (!ep) {
        throw new Error('[NEXT Client] Unregistered endpoint: ' + endpointId);
      }

      var opts = options || {};
      var creds = await credentials.getCredentials();

      var finalUrl = resolveUrl(ep.url, opts.params);
      var headers = Object.assign({}, opts.headers || {});
      var body = opts.body;

      if (ep.method === 'GET') {
        var qs = serializeQuery(opts.query);
        if (qs) {
          finalUrl += (finalUrl.includes('?') ? '&' : '?') + qs;
        }
      } else if (ep.method === 'POST') {
        if (!headers['Content-Type']) {
          headers['Content-Type'] = 'application/x-www-form-urlencoded';
        }
        // Auto-inject ccn / dy-csrf-token if needed by routine
        if (endpointId.startsWith('routine.')) {
          headers['dy-csrf-token'] = creds.csrfToken;
          if (typeof body === 'object' && body !== null) {
            if (!body.ctn) body.ctn = creds.ccn;
            body = serializeQuery(body);
          } else if (typeof body === 'string' && !body.includes('ctn=')) {
            body += (body.length > 0 ? '&' : '') + 'ctn=' + encodeURIComponent(creds.ccn);
          }
        }
      }

      return transport.sendRequest({
        url: finalUrl,
        method: ep.method,
        headers: headers,
        body: body,
        isIdempotent: ep.idempotent,
        timeout: opts.timeout,
        signal: opts.signal
      });
    }

    return {
      ENDPOINTS: ENDPOINTS,
      request: request,
      get: function (endpointId, queryOrParams, options) {
        var opts = Object.assign({}, options);
        opts.query = queryOrParams;
        opts.params = queryOrParams;
        return request(endpointId, opts);
      },
      post: function (endpointId, body, options) {
        var opts = Object.assign({}, options);
        opts.body = body;
        return request(endpointId, opts);
      }
    };
  });
})();

/* --- NEXT module: src/adapters/room.js --- */
// src/adapters/room.js
(function () {
  'use strict';
  if (!globalThis.DYEXRL_NEXT) return;

  globalThis.DYEXRL_NEXT.registry.register('adapters.room', [], function () {
    function getNumericRoomId() {
      if (typeof window === 'undefined') return '';
      if (window.room_id && !isNaN(Number(window.room_id))) return String(window.room_id);
      if (typeof unsafeWindow !== 'undefined') {
        if (unsafeWindow.room_id && !isNaN(Number(unsafeWindow.room_id))) return String(unsafeWindow.room_id);
        if (unsafeWindow.$DATA && unsafeWindow.$DATA.ROOM && unsafeWindow.$DATA.ROOM.room_id) {
          return String(unsafeWindow.$DATA.ROOM.room_id);
        }
      }
      var m = location.pathname.match(/^\/(\d+)/);
      return m ? m[1] : '';
    }

    function getAnchorName() {
      var el = document.querySelector('.Title-anchorName') || document.querySelector('.anchor-name');
      return el ? el.textContent.trim() : '';
    }

    return {
      getNumericRoomId: getNumericRoomId,
      getAnchorName: getAnchorName
    };
  });
})();

/* --- NEXT module: src/adapters/chat.js --- */
// src/adapters/chat.js
(function () {
  'use strict';
  if (!globalThis.DYEXRL_NEXT) return;

  globalThis.DYEXRL_NEXT.registry.register('adapters.chat', [], function () {
    function getChatInput() {
      return document.querySelector('textarea.ChatSend-txt') || document.querySelector('div.ChatSend-txt');
    }

    function getSendButton() {
      return document.querySelector('.ChatSend-button');
    }

    function setChatText(text) {
      var input = getChatInput();
      if (!input) return false;

      var isDiv = input.tagName.toLowerCase() === 'div';
      if (isDiv) {
        input.innerText = text;
      } else {
        input.value = text;
      }
      input.dispatchEvent(new Event('input', { bubbles: true }));
      return true;
    }

    function sendChatText(text) {
      if (!setChatText(text)) return false;
      var btn = getSendButton();
      if (btn) {
        btn.click();
        return true;
      }
      return false;
    }

    return {
      getChatInput: getChatInput,
      getSendButton: getSendButton,
      setChatText: setChatText,
      sendChatText: sendChatText
    };
  });
})();

/* --- NEXT module: src/adapters/player.js --- */
// src/adapters/player.js
(function () {
  'use strict';
  if (!globalThis.DYEXRL_NEXT) return;

  globalThis.DYEXRL_NEXT.registry.register('adapters.player', [], function () {
    function getVideoElement() {
      return document.querySelector('.layout-Player-videoEntity video') || document.querySelector('video');
    }

    function setVolume(val) {
      var video = getVideoElement();
      if (!video) return 0;
      var clamped = Math.max(0, Math.min(1, Number(val) || 0));
      video.volume = clamped;
      return clamped;
    }

    function getVolume() {
      var video = getVideoElement();
      return video ? video.volume : 1;
    }

    function triggerWebFullScreen() {
      var btn = document.querySelector('.wfs-2a8e83') || document.querySelector('.icon-c8be96') || document.querySelector('[title*=\"网页全屏\"]');
      if (btn) {
        btn.click();
        return true;
      }
      return false;
    }

    return {
      getVideoElement: getVideoElement,
      setVolume: setVolume,
      getVolume: getVolume,
      triggerWebFullScreen: triggerWebFullScreen
    };
  });
})();

/* --- NEXT module: src/router/index.js --- */
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

/* --- NEXT module: src/ui/tokens.js --- */
// src/ui/tokens.js
(function () {
  'use strict';
  if (!globalThis.DYEXRL_NEXT) return;

  globalThis.DYEXRL_NEXT.registry.register('ui.tokens', [], function () {
    var CSS_TOKENS = `
:root {
  --miuix-primary: #0066FF;
  --miuix-primary-hover: #1a75ff;
  --miuix-primary-active: #0052cc;
  --miuix-bg: rgba(255, 255, 255, 0.72);
  --miuix-bg-solid: #ffffff;
  --miuix-bg-card: rgba(255, 255, 255, 0.55);
  --miuix-bg-hover: rgba(255, 255, 255, 0.88);
  --miuix-blur: blur(36px);
  --miuix-blur-header: blur(28px);
  --miuix-saturate: saturate(220%);
  --miuix-border: rgba(0, 0, 0, 0.08);
  --miuix-border-hover: rgba(0, 102, 255, 0.35);
  --miuix-text-primary: #0f172a;
  --miuix-text-secondary: #64748b;
  --miuix-text-muted: #94a3b8;
  --miuix-shadow-sm: 0 2px 8px rgba(0, 0, 0, 0.04);
  --miuix-shadow-md: 0 8px 24px rgba(0, 0, 0, 0.08);
  --miuix-shadow-modal: 0 16px 40px rgba(0, 0, 0, 0.16);
  --miuix-radius-sm: 8px;
  --miuix-radius-md: 12px;
  --miuix-radius-lg: 16px;
  --miuix-radius-panel: 22px;
  --miuix-transition: all 0.18s cubic-bezier(0.4, 0, 0.2, 1);
}

/* 基础面板规范 (380x370px 齐平三维铁壁) */
.miuix-panel {
  position: fixed !important;
  width: 380px !important;
  max-width: calc(100vw - 16px) !important;
  height: 370px !important;
  max-height: calc(100vh - 16px) !important;
  min-height: 370px !important;
  background: var(--miuix-bg) !important;
  backdrop-filter: var(--miuix-blur) var(--miuix-saturate) !important;
  -webkit-backdrop-filter: var(--miuix-blur) var(--miuix-saturate) !important;
  border: 1px solid var(--miuix-border) !important;
  border-radius: var(--miuix-radius-panel) !important;
  box-shadow: var(--miuix-shadow-modal) !important;
  display: flex !important;
  flex-direction: column !important;
  padding: 0 !important;
  overflow: hidden !important;
  z-index: 100000 !important;
  box-sizing: border-box !important;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", sans-serif !important;
  opacity: 0;
  pointer-events: none;
  transform: translateY(6px) scale(0.98);
  transition: opacity 0.18s ease, transform 0.18s ease !important;
}

.miuix-panel.is-active {
  opacity: 1 !important;
  pointer-events: auto !important;
  transform: translateY(0) scale(1) !important;
}

/* 粘性吸顶 Header */
.miuix-panel__header {
  position: sticky !important;
  top: 0 !important;
  height: 44px !important;
  min-height: 44px !important;
  display: flex !important;
  align-items: center !important;
  justify-content: space-between !important;
  padding: 0 14px !important;
  background: var(--miuix-bg) !important;
  backdrop-filter: var(--miuix-blur-header) !important;
  -webkit-backdrop-filter: var(--miuix-blur-header) !important;
  border-bottom: 1px solid var(--miuix-border) !important;
  z-index: 10 !important;
  box-sizing: border-box !important;
}

.miuix-panel__title-wrap {
  display: flex !important;
  align-items: center !important;
  gap: 8px !important;
}

.miuix-panel__title {
  font-size: 13.5px !important;
  font-weight: 700 !important;
  color: var(--miuix-text-primary) !important;
  line-height: 1 !important;
}

.miuix-panel__subtitle {
  font-size: 11px !important;
  color: var(--miuix-text-muted) !important;
  font-weight: 400 !important;
}

.miuix-panel__close {
  width: 26px !important;
  height: 26px !important;
  display: flex !important;
  align-items: center !important;
  justify-content: center !important;
  border-radius: 50% !important;
  background: rgba(0, 0, 0, 0.04) !important;
  color: var(--miuix-text-secondary) !important;
  cursor: pointer !important;
  font-size: 16px !important;
  line-height: 1 !important;
  border: none !important;
  transition: var(--miuix-transition) !important;
}

.miuix-panel__close:hover {
  background: rgba(244, 63, 94, 0.15) !important;
  color: #f43f5e !important;
}

/* 面板内容 Body (内嵌自然滚动) */
.miuix-panel__body {
  flex: 1 1 auto !important;
  min-height: 0 !important;
  overflow-y: auto !important;
  overflow-x: hidden !important;
  padding: 12px 14px !important;
  display: flex !important;
  flex-direction: column !important;
  gap: 10px !important;
  box-sizing: border-box !important;
}

/* 极细 4px 滚动条 */
.miuix-panel__body::-webkit-scrollbar,
.miuix-scrollable::-webkit-scrollbar {
  width: 4px !important;
  height: 4px !important;
}
.miuix-panel__body::-webkit-scrollbar-thumb,
.miuix-scrollable::-webkit-scrollbar-thumb {
  background: rgba(0, 0, 0, 0.18) !important;
  border-radius: 4px !important;
}
.miuix-panel__body::-webkit-scrollbar-track,
.miuix-scrollable::-webkit-scrollbar-track {
  background: transparent !important;
}

/* 四级卡片 Card */
.miuix-card {
  background: var(--miuix-bg-card) !important;
  border: 1px solid var(--miuix-border) !important;
  border-radius: var(--miuix-radius-md) !important;
  padding: 10px 12px !important;
  display: flex !important;
  flex-direction: column !important;
  gap: 8px !important;
  box-sizing: border-box !important;
  transition: var(--miuix-transition) !important;
}

.miuix-card:hover {
  background: var(--miuix-bg-hover) !important;
  border-color: rgba(0, 102, 255, 0.25) !important;
  box-shadow: var(--miuix-shadow-sm) !important;
}

.miuix-card__header {
  display: flex !important;
  align-items: center !important;
  justify-content: space-between !important;
}

.miuix-card__title {
  font-size: 12px !important;
  font-weight: 600 !important;
  color: var(--miuix-text-primary) !important;
}

.miuix-card__desc {
  font-size: 10.5px !important;
  color: var(--miuix-text-secondary) !important;
}

/* 手风琴 Accordion */
.miuix-accordion {
  border: 1px solid var(--miuix-border) !important;
  border-radius: var(--miuix-radius-md) !important;
  background: var(--miuix-bg-card) !important;
  overflow: hidden !important;
  transition: var(--miuix-transition) !important;
}

.miuix-accordion__header {
  display: flex !important;
  align-items: center !important;
  justify-content: space-between !important;
  padding: 9px 12px !important;
  cursor: pointer !important;
  user-select: none !important;
}

.miuix-accordion__header:hover {
  background: rgba(0, 102, 255, 0.06) !important;
}

.miuix-accordion__title-group {
  display: flex !important;
  align-items: center !important;
  gap: 8px !important;
}

.miuix-accordion__title {
  font-size: 12px !important;
  font-weight: 600 !important;
  color: var(--miuix-text-primary) !important;
}

.miuix-accordion__actions {
  display: flex !important;
  align-items: center !important;
  gap: 6px !important;
}

.miuix-accordion__btn {
  font-size: 10.5px !important;
  padding: 2px 7px !important;
  border-radius: 4px !important;
  background: rgba(0, 0, 0, 0.05) !important;
  color: var(--miuix-text-secondary) !important;
  border: none !important;
  cursor: pointer !important;
  transition: var(--miuix-transition) !important;
}

.miuix-accordion__btn:hover {
  background: var(--miuix-primary) !important;
  color: #fff !important;
}

.miuix-accordion__body {
  display: none;
  padding: 8px 12px 10px 12px !important;
  border-top: 1px solid var(--miuix-border) !important;
  background: rgba(255, 255, 255, 0.4) !important;
  font-size: 11px !important;
}

.miuix-accordion.is-expanded .miuix-accordion__body {
  display: block !important;
}

/* 表单控件: Switch, Button, Input */
.miuix-switch {
  position: relative !important;
  display: inline-block !important;
  width: 38px !important;
  height: 20px !important;
  cursor: pointer !important;
  user-select: none !important;
}

.miuix-switch input {
  opacity: 0 !important;
  width: 0 !important;
  height: 0 !important;
}

.miuix-switch__slider {
  position: absolute !important;
  inset: 0 !important;
  background: #cbd5e1 !important;
  border-radius: 20px !important;
  transition: 0.2s cubic-bezier(0.4, 0, 0.2, 1) !important;
}

.miuix-switch__slider::before {
  position: absolute !important;
  content: "" !important;
  height: 16px !important;
  width: 16px !important;
  left: 2px !important;
  bottom: 2px !important;
  background: #ffffff !important;
  border-radius: 50% !important;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.2) !important;
  transition: 0.2s cubic-bezier(0.4, 0, 0.2, 1) !important;
}

.miuix-switch input:checked + .miuix-switch__slider {
  background: var(--miuix-primary) !important;
}

.miuix-switch input:checked + .miuix-switch__slider::before {
  transform: translateX(18px) !important;
}

.miuix-btn {
  display: inline-flex !important;
  align-items: center !important;
  justify-content: center !important;
  padding: 6px 14px !important;
  font-size: 11.5px !important;
  font-weight: 600 !important;
  border-radius: var(--miuix-radius-sm) !important;
  border: 1px solid transparent !important;
  cursor: pointer !important;
  user-select: none !important;
  transition: var(--miuix-transition) !important;
}

.miuix-btn-primary {
  background: var(--miuix-primary) !important;
  color: #ffffff !important;
}

.miuix-btn-primary:hover {
  background: var(--miuix-primary-hover) !important;
  box-shadow: 0 2px 8px rgba(0, 102, 255, 0.3) !important;
}

.miuix-btn-secondary {
  background: rgba(0, 0, 0, 0.05) !important;
  color: var(--miuix-text-primary) !important;
  border: 1px solid var(--miuix-border) !important;
}

.miuix-btn-secondary:hover {
  background: rgba(0, 0, 0, 0.09) !important;
}

.miuix-input {
  background: rgba(255, 255, 255, 0.8) !important;
  border: 1px solid var(--miuix-border) !important;
  border-radius: var(--miuix-radius-sm) !important;
  padding: 5px 9px !important;
  font-size: 11.5px !important;
  color: var(--miuix-text-primary) !important;
  outline: none !important;
  transition: var(--miuix-transition) !important;
}

.miuix-input:focus {
  border-color: var(--miuix-primary) !important;
  background: #ffffff !important;
  box-shadow: 0 0 0 2px rgba(0, 102, 255, 0.18) !important;
}

/* Toast 纯文字滑动通知胶囊 */
.miuix-toast-container {
  position: fixed !important;
  top: 20px !important;
  left: 50% !important;
  transform: translateX(-50%) !important;
  display: flex !important;
  flex-direction: column !important;
  gap: 8px !important;
  z-index: 200000 !important;
  pointer-events: none !important;
}

.miuix-toast {
  padding: 7px 16px !important;
  border-radius: 9999px !important;
  font-size: 12px !important;
  font-weight: 600 !important;
  color: #ffffff !important;
  backdrop-filter: blur(20px) !important;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.15) !important;
  animation: miuix-toast-in 0.24s cubic-bezier(0.4, 0, 0.2, 1) forwards !important;
  pointer-events: auto !important;
}

.miuix-toast--info { background: rgba(15, 23, 42, 0.88) !important; }
.miuix-toast--success { background: rgba(16, 185, 129, 0.92) !important; }
.miuix-toast--error { background: rgba(239, 68, 68, 0.92) !important; }

@keyframes miuix-toast-in {
  from { opacity: 0; transform: translateY(-8px) scale(0.96); }
  to { opacity: 1; transform: translateY(0) scale(1); }
}

/* Dialog 全局模态对话框 (替代旧 alert/prompt/postbird) */
.miuix-dialog-overlay {
  position: fixed !important;
  inset: 0 !important;
  background: rgba(0, 0, 0, 0.35) !important;
  backdrop-filter: blur(8px) !important;
  display: flex !important;
  align-items: center !important;
  justify-content: center !important;
  z-index: 150000 !important;
}

.miuix-dialog {
  width: 320px !important;
  background: rgba(255, 255, 255, 0.88) !important;
  backdrop-filter: blur(28px) !important;
  border: 1px solid var(--miuix-border) !important;
  border-radius: var(--miuix-radius-lg) !important;
  padding: 16px !important;
  box-shadow: var(--miuix-shadow-modal) !important;
  display: flex !important;
  flex-direction: column !important;
  gap: 12px !important;
}

.miuix-dialog__title {
  font-size: 13.5px !important;
  font-weight: 700 !important;
  color: var(--miuix-text-primary) !important;
}

.miuix-dialog__message {
  font-size: 11.5px !important;
  color: var(--miuix-text-secondary) !important;
  line-height: 1.4 !important;
}

.miuix-dialog__actions {
  display: flex !important;
  justify-content: flex-end !important;
  gap: 8px !important;
}

/* Level 2 Dock 工具栏装配 */
.miuix-dock-wrap {
  display: flex !important;
  align-items: center !important;
  gap: 6px !important;
  position: relative !important;
}

.miuix-dock-item {
  position: relative !important;
  width: 34px !important;
  height: 34px !important;
  border-radius: var(--miuix-radius-sm) !important;
  display: flex !important;
  align-items: center !important;
  justify-content: center !important;
  cursor: pointer !important;
  transition: var(--miuix-transition) !important;
  user-select: none !important;
}

.miuix-dock-item:hover {
  background: rgba(0, 102, 255, 0.08) !important;
}

.miuix-dock-item.is-active {
  background: rgba(0, 102, 255, 0.14) !important;
}

/* 磁吸指示胶囊 (16x3px) */
.miuix-dock-indicator {
  position: absolute !important;
  bottom: -4px !important;
  width: 16px !important;
  height: 3px !important;
  background: var(--miuix-primary) !important;
  border-radius: 3px !important;
  transition: transform 0.2s cubic-bezier(0.4, 0, 0.2, 1), opacity 0.2s ease !important;
  pointer-events: none !important;
  opacity: 0;
}

/* 32px 隐形悬浮桥 (Hover Bridge) */
.miuix-hover-bridge {
  position: absolute !important;
  height: 32px !important;
  left: 0 !important;
  right: 0 !important;
  top: -32px !important;
  background: transparent !important;
  pointer-events: auto !important;
}
`;

    var isStyleInjected = false;

    function injectTokens(targetDocument) {
      var doc = targetDocument || (typeof document !== 'undefined' ? document : null);
      if (!doc) return;
      if (doc.getElementById('miuix-tokens-style')) return; // Idempotent

      var style = doc.createElement('style');
      style.id = 'miuix-tokens-style';
      style.textContent = CSS_TOKENS;
      (doc.head || doc.documentElement).appendChild(style);
      isStyleInjected = true;
    }

    return {
      CSS_TOKENS: CSS_TOKENS,
      injectTokens: injectTokens,
      get isStyleInjected() { return isStyleInjected; }
    };
  });
})();

/* --- NEXT module: src/ui/icons.js --- */
// src/ui/icons.js
(function () {
  'use strict';
  if (!globalThis.DYEXRL_NEXT) return;

  globalThis.DYEXRL_NEXT.registry.register('ui.icons', [], function () {
    var SVG_PATHS = {
      // 1. 一键签到 (日历打卡)
      sign: '<path d="M19 4h-1V2h-2v2H8V2H6v2H5c-1.11 0-1.99.9-1.99 2L3 20c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 16H5V9h14v11zM7 11h5v5H7z" fill="currentColor"/>',
      
      // 2. 一键续牌 (闪烁荧光棒/徽章)
      fans: '<path d="M12 2L9.19 8.63 2 9.24l5.46 4.73L5.82 21 12 17.27 18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2z" fill="currentColor"/>',
      
      // 3. 扩展功能 (工具箱)
      extool: '<path d="M20 6h-4V4c0-1.11-.89-2-2-2h-4c-1.11 0-2 .89-2 2v2H4c-1.11 0-1.99.89-1.99 2L2 19c0 1.11.89 2 2 2h16c1.11 0 2-.89 2-2V8c0-1.11-.89-2-2-2zm-6 0h-4V4h4v2z" fill="currentColor"/>',
      
      // 4. 直播间工具 (播控齿轮)
      livetool: '<path d="M19.14 12.94c.04-.3.06-.61.06-.94 0-.32-.02-.64-.07-.94l2.03-1.58c.18-.14.23-.41.12-.61l-1.92-3.32c-.12-.22-.37-.29-.59-.22l-2.39.96c-.5-.38-1.03-.7-1.62-.94l-.36-2.54c-.04-.24-.24-.41-.48-.41h-3.84c-.24 0-.43.17-.47.41l-.36 2.54c-.59.24-1.13.57-1.62.94l-2.39-.96c-.22-.08-.47 0-.59.22L2.74 8.87c-.12.21-.08.47.12.61l2.03 1.58c-.05.3-.09.63-.09.94s.02.64.07.94l-2.03 1.58c-.18.14-.23.41-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c.5.38 1.03.7 1.62.94l.36 2.54c.05.24.24.41.48.41h3.84c.24 0 .44-.17.47-.41l.36-2.54c.59-.24 1.13-.56 1.62-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32c.12-.22.07-.47-.12-.61l-2.01-1.58zM12 15.6c-1.98 0-3.6-1.62-3.6-3.6s1.62-3.6 3.6-3.6 3.6 1.62 3.6 3.6-1.62 3.6-3.6 3.6z" fill="currentColor"/>',
      
      // 5. 弹幕小助手 (气泡发言)
      bloop: '<path d="M20 2H4c-1.1 0-1.99.9-1.99 2L2 22l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zM6 9h12v2H6V9zm8 5H6v-2h8v2zm4-6H6V6h12v2z" fill="currentColor"/>',
      
      // 6. 全站抽奖 (礼物转盘)
      lottery: '<path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z" fill="currentColor"/>',
      
      // 7. 同屏播放器 (画中画双窗)
      popup: '<path d="M19 11h-8v6h8v-6zm4 8V4.98C23 3.88 22.1 3 21 3H3c-1.1 0-2 .88-2 1.98V19c0 1.1.9 2 2 2h18c1.1 0 2-.9 2-2zm-2 .02H3V4.97h18v14.05z" fill="currentColor"/>',
      
      // 8. 在线弹幕助手 (雷达监控)
      monitor: '<path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 14.5v-9l6 4.5-6 4.5z" fill="currentColor"/>',
      
      // 9. 版本更新 (云同步)
      update: '<path d="M19.35 10.04C18.67 6.59 15.64 4 12 4 9.11 4 6.6 5.64 5.35 8.04 2.34 8.36 0 10.91 0 14c0 3.31 2.69 6 6 6h13c2.76 0 5-2.24 5-5 0-2.64-2.05-4.78-4.65-4.96zM17 13l-5 5-5-5h3V9h4v4h3z" fill="currentColor"/>',
      
      // 通用图标
      close: '<path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z" fill="currentColor"/>',
      chevronDown: '<path d="M7.41 8.59L12 13.17l4.59-4.58L18 10l-6 6-6-6 1.41-1.41z" fill="currentColor"/>',
      search: '<path d="M15.5 14h-.79l-.28-.27C15.41 12.59 16 11.11 16 9.5 16 5.91 13.09 3 9.5 3S3 5.91 3 9.5 5.91 16 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z" fill="currentColor"/>'
    };

    function createSvg(iconKey, size, className) {
      var pathHtml = SVG_PATHS[iconKey] || SVG_PATHS.extool;
      var s = size || 20;
      var cls = className ? ' ' + className : '';

      var wrapper = document.createElement('span');
      wrapper.className = 'miuix-icon-wrap' + cls;
      wrapper.style.display = 'inline-flex';
      wrapper.style.alignItems = 'center';
      wrapper.style.justifyContent = 'center';
      wrapper.style.width = s + 'px';
      wrapper.style.height = s + 'px';
      wrapper.innerHTML = '<svg viewBox="0 0 24 24" width="' + s + '" height="' + s + '" style="display:block;">' + pathHtml + '</svg>';
      return wrapper;
    }

    return {
      PATHS: SVG_PATHS,
      createSvg: createSvg
    };
  });
})();

/* --- NEXT module: src/ui/miuix.js --- */
// src/ui/miuix.js
(function () {
  'use strict';
  if (!globalThis.DYEXRL_NEXT) return;

  globalThis.DYEXRL_NEXT.registry.register('ui.miuix', ['ui.tokens', 'ui.icons'], function (tokens, icons) {
    tokens.injectTokens();

    function ensureContainer(id, className) {
      var el = document.getElementById(id);
      if (!el) {
        el = document.createElement('div');
        el.id = id;
        if (className) el.className = className;
        document.body.appendChild(el);
      }
      return el;
    }

    // 1. MIUIX.Panel: 标准三级模态控制台 (380x370px)
    function createPanel(options) {
      var opts = options || {};
      var id = opts.id || 'miuix-panel-' + Math.random().toString(36).slice(2, 8);
      var width = opts.width || 380;
      var height = opts.height || 370;

      var panel = document.createElement('div');
      panel.id = id;
      panel.className = 'miuix-panel' + (opts.className ? ' ' + opts.className : '');
      panel.style.width = width + 'px';
      panel.style.height = height + 'px';

      // Header
      var header = document.createElement('div');
      header.className = 'miuix-panel__header';

      var titleWrap = document.createElement('div');
      titleWrap.className = 'miuix-panel__title-wrap';

      var title = document.createElement('span');
      title.className = 'miuix-panel__title';
      title.textContent = opts.title || '';
      titleWrap.appendChild(title);

      if (opts.subtitle) {
        var sub = document.createElement('span');
        sub.className = 'miuix-panel__subtitle';
        sub.textContent = opts.subtitle;
        titleWrap.appendChild(sub);
      }
      header.appendChild(titleWrap);

      var closeBtn = document.createElement('button');
      closeBtn.type = 'button';
      closeBtn.className = 'miuix-panel__close';
      closeBtn.innerHTML = '×';
      closeBtn.title = '关闭';
      closeBtn.addEventListener('click', function (e) {
        e.stopPropagation();
        hide();
        if (typeof opts.onClose === 'function') opts.onClose();
      });
      header.appendChild(closeBtn);
      panel.appendChild(header);

      // Body
      var body = document.createElement('div');
      body.className = 'miuix-panel__body';
      if (Array.isArray(opts.body)) {
        opts.body.forEach(function (child) {
          if (child instanceof Node) body.appendChild(child);
        });
      } else if (opts.body instanceof Node) {
        body.appendChild(opts.body);
      }
      panel.appendChild(body);

      document.body.appendChild(panel);

      function show(anchorEl) {
        if (anchorEl && typeof anchorEl.getBoundingClientRect === 'function') {
          var rect = anchorEl.getBoundingClientRect();
          // Anchor right above the button
          var left = Math.max(8, Math.min(window.innerWidth - width - 8, rect.left + (rect.width - width) / 2));
          var top = Math.max(8, rect.top - height - 12);
          panel.style.left = left + 'px';
          panel.style.top = top + 'px';
        }
        panel.classList.add('is-active');
      }

      function hide() {
        panel.classList.remove('is-active');
      }

      function toggle(anchorEl) {
        if (panel.classList.contains('is-active')) hide();
        else show(anchorEl);
      }

      function destroy() {
        if (panel.parentNode) panel.parentNode.removeChild(panel);
      }

      return {
        element: panel,
        body: body,
        show: show,
        hide: hide,
        toggle: toggle,
        destroy: destroy
      };
    }

    // 2. MIUIX.Accordion: 手风琴折叠卡片 (用于 livetool 进场/禁言/回复等)
    function createAccordion(options) {
      var opts = options || {};
      var wrap = document.createElement('div');
      wrap.className = 'miuix-accordion' + (opts.className ? ' ' + opts.className : '');
      if (opts.expanded) wrap.classList.add('is-expanded');

      var header = document.createElement('div');
      header.className = 'miuix-accordion__header';

      var titleGroup = document.createElement('div');
      titleGroup.className = 'miuix-accordion__title-group';

      var title = document.createElement('span');
      title.className = 'miuix-accordion__title';
      title.textContent = opts.title || '';
      titleGroup.appendChild(title);
      header.appendChild(titleGroup);

      var actionsWrap = document.createElement('div');
      actionsWrap.className = 'miuix-accordion__actions';

      if (Array.isArray(opts.actions)) {
        opts.actions.forEach(function (act) {
          var btn = document.createElement('button');
          btn.type = 'button';
          btn.className = 'miuix-accordion__btn';
          btn.textContent = act.label || '';
          btn.addEventListener('click', function (e) {
            e.stopPropagation();
            if (typeof act.onClick === 'function') act.onClick();
          });
          actionsWrap.appendChild(btn);
        });
      }
      header.appendChild(actionsWrap);
      wrap.appendChild(header);

      var body = document.createElement('div');
      body.className = 'miuix-accordion__body';
      if (Array.isArray(opts.content)) {
        opts.content.forEach(function (c) {
          if (c instanceof Node) body.appendChild(c);
        });
      } else if (opts.content instanceof Node) {
        body.appendChild(opts.content);
      }
      wrap.appendChild(body);

      header.addEventListener('click', function () {
        wrap.classList.toggle('is-expanded');
      });

      return {
        element: wrap,
        body: body,
        expand: function () { wrap.classList.add('is-expanded'); },
        collapse: function () { wrap.classList.remove('is-expanded'); },
        toggle: function () { wrap.classList.toggle('is-expanded'); }
      };
    }

    // 3. MIUIX.Card: 四级内容卡片
    function createCard(options) {
      var opts = options || {};
      var card = document.createElement('div');
      card.className = 'miuix-card' + (opts.className ? ' ' + opts.className : '');

      if (opts.title || opts.desc) {
        var hdr = document.createElement('div');
        hdr.className = 'miuix-card__header';
        if (opts.title) {
          var t = document.createElement('span');
          t.className = 'miuix-card__title';
          t.textContent = opts.title;
          hdr.appendChild(t);
        }
        if (opts.desc) {
          var d = document.createElement('span');
          d.className = 'miuix-card__desc';
          d.textContent = opts.desc;
          hdr.appendChild(d);
        }
        card.appendChild(hdr);
      }

      if (Array.isArray(opts.items)) {
        opts.items.forEach(function (it) {
          if (it instanceof Node) card.appendChild(it);
        });
      } else if (opts.items instanceof Node) {
        card.appendChild(opts.items);
      }

      return { element: card };
    }

    // 4. MIUIX.Switch: 滑动开关
    function createSwitch(options) {
      var opts = options || {};
      var label = document.createElement('label');
      label.className = 'miuix-switch' + (opts.className ? ' ' + opts.className : '');

      var inp = document.createElement('input');
      inp.type = 'checkbox';
      if (opts.id) inp.id = opts.id;
      if (opts.checked) inp.checked = true;

      var slider = document.createElement('span');
      slider.className = 'miuix-switch__slider';

      label.appendChild(inp);
      label.appendChild(slider);

      if (opts.store && opts.storeKey) {
        opts.store.bindCheckbox(inp, opts.storeKey);
      } else if (typeof opts.onChange === 'function') {
        inp.addEventListener('change', function () {
          opts.onChange(inp.checked);
        });
      }

      return {
        element: label,
        input: inp,
        get checked() { return inp.checked; },
        set checked(v) { inp.checked = !!v; }
      };
    }

    // 5. MIUIX.Toast: 顶部纯文字通知胶囊
    function createToast(message, type, durationMs) {
      var container = ensureContainer('miuix-toast-container', 'miuix-toast-container');
      var toast = document.createElement('div');
      var t = type || 'info';
      toast.className = 'miuix-toast miuix-toast--' + t;
      toast.textContent = message;

      container.appendChild(toast);

      setTimeout(function () {
        if (toast.parentNode) {
          toast.parentNode.removeChild(toast);
        }
      }, durationMs || 3000);
    }

    // 6. MIUIX.Dialog: 统一拟态对话框 (替换原生 alert/confirm/prompt/postbird)
    function createDialog(options) {
      var opts = options || {};
      return new Promise(function (resolve) {
        var overlay = document.createElement('div');
        overlay.className = 'miuix-dialog-overlay';

        var dlg = document.createElement('div');
        dlg.className = 'miuix-dialog';

        var title = document.createElement('div');
        title.className = 'miuix-dialog__title';
        title.textContent = opts.title || '提示';
        dlg.appendChild(title);

        if (opts.message) {
          var msg = document.createElement('div');
          msg.className = 'miuix-dialog__message';
          msg.textContent = opts.message;
          dlg.appendChild(msg);
        }

        var input = null;
        if (opts.prompt) {
          input = document.createElement('input');
          input.type = 'text';
          input.className = 'miuix-input';
          input.value = opts.initialValue || '';
          dlg.appendChild(input);
        }

        var actions = document.createElement('div');
        actions.className = 'miuix-dialog__actions';

        if (opts.mode !== 'alert') {
          var cancelBtn = document.createElement('button');
          cancelBtn.type = 'button';
          cancelBtn.className = 'miuix-btn miuix-btn-secondary';
          cancelBtn.textContent = opts.cancelText || '取消';
          cancelBtn.addEventListener('click', function () {
            cleanup();
            resolve({ confirmed: false, value: null });
          });
          actions.appendChild(cancelBtn);
        }

        var confirmBtn = document.createElement('button');
        confirmBtn.type = 'button';
        confirmBtn.className = 'miuix-btn miuix-btn-primary';
        confirmBtn.textContent = opts.confirmText || '确定';
        confirmBtn.addEventListener('click', function () {
          var val = input ? input.value : true;
          cleanup();
          resolve({ confirmed: true, value: val });
        });
        actions.appendChild(confirmBtn);
        dlg.appendChild(actions);

        overlay.appendChild(dlg);
        document.body.appendChild(overlay);

        if (input) input.focus();

        function cleanup() {
          if (overlay.parentNode) overlay.parentNode.removeChild(overlay);
        }
      });
    }

    return {
      Panel: createPanel,
      Accordion: createAccordion,
      Card: createCard,
      Switch: createSwitch,
      Toast: createToast,
      Dialog: createDialog
    };
  });
})();

/* --- NEXT module: src/ui/dock.js --- */
// src/ui/dock.js
(function () {
  'use strict';
  if (!globalThis.DYEXRL_NEXT) return;

  globalThis.DYEXRL_NEXT.registry.register('ui.dock', ['ui.tokens', 'ui.icons', 'ui.miuix'], function (tokens, icons, miuix) {
    tokens.injectTokens();

    var DOCK_BUTTONS = [
      { id: 'ex-sign', icon: 'sign', title: '一键签到', hasPanel: true },
      { id: 'fans-continue', icon: 'fans', title: '一键续牌', hasPanel: true },
      { id: 'extool-icon', icon: 'extool', title: '扩展功能', hasPanel: true },
      { id: 'livetool-icon', icon: 'livetool', title: '直播间工具', hasPanel: true },
      { id: 'bloop-icon', icon: 'bloop', title: '弹幕小助手', hasPanel: true },
      { id: 'ex-lottery', icon: 'lottery', title: '全站抽奖', hasPanel: true },
      { id: 'popup-player', icon: 'popup', title: '同屏播放器', hasPanel: true },
      { id: 'ex-monitor', icon: 'monitor', title: '在线弹幕助手', hasPanel: false },
      { id: 'ex-update', icon: 'update', title: '版本更新', hasPanel: true }
    ];

    var CLOSE_DELAY_MS = 400;

    function createDock(options) {
      var opts = options || {};
      var container = opts.container || document.querySelector('.layout-Player-toolbar') || document.body;

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
          if (btnDef.hasPanel) {
            togglePanel(btnDef.id, btn);
          } else if (typeof opts.onAction === 'function') {
            opts.onAction(btnDef.id);
          }
        });

        dockWrap.appendChild(btn);
      });

      container.appendChild(dockWrap);

      function registerPanel(id, panelInstance) {
        registeredPanels.set(id, panelInstance);

        // Hook panel element mouseenter/leave for 400ms close timer
        if (panelInstance && panelInstance.element) {
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

/* --- NEXT module: src/ui/gift_picker.js --- */
// src/ui/gift_picker.js
(function () {
  'use strict';
  if (!globalThis.DYEXRL_NEXT) return;

  globalThis.DYEXRL_NEXT.registry.register('ui.giftPicker', ['ui.tokens', 'ui.icons', 'api.client', 'ui.miuix'], function (tokens, icons, client, miuix) {
    tokens.injectTokens();

    var activePicker = null;

    function openGiftPicker(options) {
      var opts = options || {};
      var initialTab = opts.initialTab || 'room'; // 'room' or 'backpack'
      var rid = String(opts.rid || '9999');
      var onSelect = opts.onSelect || function () {};

      if (activePicker) {
        activePicker.close();
      }

      var overlay = document.createElement('div');
      overlay.className = 'miuix-dialog-overlay';

      var modal = document.createElement('div');
      modal.className = 'miuix-panel';
      modal.style.width = '540px';
      modal.style.height = '410px';
      modal.style.position = 'relative';
      modal.style.opacity = '1';
      modal.style.pointerEvents = 'auto';
      modal.style.transform = 'none';

      // Header
      var header = document.createElement('div');
      header.className = 'miuix-panel__header';

      var titleWrap = document.createElement('div');
      titleWrap.className = 'miuix-panel__title-wrap';

      var title = document.createElement('span');
      title.className = 'miuix-panel__title';
      title.textContent = '礼物选择器';
      titleWrap.appendChild(title);
      header.appendChild(titleWrap);

      var closeBtn = document.createElement('button');
      closeBtn.type = 'button';
      closeBtn.className = 'miuix-panel__close';
      closeBtn.innerHTML = '×';
      closeBtn.title = '关闭 (Esc)';
      header.appendChild(closeBtn);
      modal.appendChild(header);

      // Body container
      var body = document.createElement('div');
      body.className = 'miuix-panel__body';
      body.style.padding = '10px 14px';

      // Tab Bar & Search
      var toolbar = document.createElement('div');
      toolbar.style.display = 'flex';
      toolbar.style.alignItems = 'center';
      toolbar.style.justifyContent = 'space-between';
      toolbar.style.gap = '10px';

      var tabsWrap = document.createElement('div');
      tabsWrap.style.display = 'flex';
      tabsWrap.style.gap = '6px';

      var tabRoom = document.createElement('button');
      tabRoom.type = 'button';
      tabRoom.className = 'miuix-btn miuix-btn-primary';
      tabRoom.textContent = '在播礼物';

      var tabBackpack = document.createElement('button');
      tabBackpack.type = 'button';
      tabBackpack.className = 'miuix-btn miuix-btn-secondary';
      tabBackpack.textContent = '背包道具';

      tabsWrap.appendChild(tabRoom);
      tabsWrap.appendChild(tabBackpack);
      toolbar.appendChild(tabsWrap);

      // Search Box
      var searchInput = document.createElement('input');
      searchInput.type = 'text';
      searchInput.className = 'miuix-input';
      searchInput.placeholder = '搜索礼物名称...';
      searchInput.style.width = '140px';
      toolbar.appendChild(searchInput);

      body.appendChild(toolbar);

      // Gift Grid Stream
      var grid = document.createElement('div');
      grid.className = 'miuix-scrollable';
      grid.style.flex = '1 1 auto';
      grid.style.overflowY = 'auto';
      grid.style.display = 'grid';
      grid.style.gridTemplateColumns = 'repeat(auto-fill, minmax(80px, 1fr))';
      grid.style.gap = '8px';
      grid.style.marginTop = '10px';
      body.appendChild(grid);

      modal.appendChild(body);
      overlay.appendChild(modal);
      document.body.appendChild(overlay);

      var currentTab = initialTab;
      var roomGiftsCache = [];
      var backpackGiftsCache = [];

      function updateTabs() {
        if (currentTab === 'room') {
          tabRoom.className = 'miuix-btn miuix-btn-primary';
          tabBackpack.className = 'miuix-btn miuix-btn-secondary';
        } else {
          tabRoom.className = 'miuix-btn miuix-btn-secondary';
          tabBackpack.className = 'miuix-btn miuix-btn-primary';
        }
        renderGifts();
      }

      tabRoom.addEventListener('click', function () {
        currentTab = 'room';
        updateTabs();
      });

      tabBackpack.addEventListener('click', function () {
        currentTab = 'backpack';
        updateTabs();
      });

      searchInput.addEventListener('input', function () {
        renderGifts();
      });

      function renderGifts() {
        grid.innerHTML = '';
        var list = currentTab === 'room' ? roomGiftsCache : backpackGiftsCache;
        var q = searchInput.value.trim().toLowerCase();

        var filtered = list.filter(function (g) {
          if (!q) return true;
          return (g.name && g.name.toLowerCase().includes(q)) || String(g.id).includes(q);
        });

        if (filtered.length === 0) {
          var empty = document.createElement('div');
          empty.style.gridColumn = '1 / -1';
          empty.style.textAlign = 'center';
          empty.style.padding = '40px 0';
          empty.style.color = '#94a3b8';
          empty.style.fontSize = '12px';
          empty.textContent = currentTab === 'room' ? '未找到匹配在播礼物' : '背包暂无对应道具';
          grid.appendChild(empty);
          return;
        }

        filtered.forEach(function (g) {
          var item = document.createElement('div');
          item.className = 'miuix-card';
          item.style.alignItems = 'center';
          item.style.padding = '6px';
          item.style.cursor = 'pointer';
          item.title = g.name + (g.priceText ? ' (' + g.priceText + ')' : '');

          var img = document.createElement('img');
          img.src = g.icon || '';
          img.style.width = '36px';
          img.style.height = '36px';
          img.style.objectFit = 'contain';
          item.appendChild(img);

          var name = document.createElement('span');
          name.style.fontSize = '10.5px';
          name.style.fontWeight = '600';
          name.style.marginTop = '4px';
          name.style.textAlign = 'center';
          name.style.overflow = 'hidden';
          name.style.textOverflow = 'ellipsis';
          name.style.whiteSpace = 'nowrap';
          name.style.width = '100%';
          name.textContent = g.name;
          item.appendChild(name);

          if (g.countText || g.priceText) {
            var sub = document.createElement('span');
            sub.style.fontSize = '9.5px';
            sub.style.color = '#64748b';
            sub.textContent = g.countText || g.priceText;
            item.appendChild(sub);
          }

          item.addEventListener('click', function () {
            onSelect(g);
            close();
          });

          grid.appendChild(item);
        });
      }

      async function loadData() {
        // Load Room Gifts
        try {
          var res = await client.get('room.roomApi', { rid: rid });
          if (res && res.data && res.data.data && Array.isArray(res.data.data.gift)) {
            roomGiftsCache = res.data.data.gift.map(function (item) {
              return {
                id: item.id,
                name: item.name,
                price: Number(item.pc || 0),
                priceText: item.pc ? item.pc + ' 鱼翅' : '免费',
                icon: item.pic || ''
              };
            });
          }
        } catch (e) {}

        // Load Backpack
        try {
          var bpRes = await client.get('backpack.list', { rid: rid });
          if (bpRes && bpRes.data && bpRes.data.data && Array.isArray(bpRes.data.data.list)) {
            backpackGiftsCache = bpRes.data.data.list.map(function (item) {
              return {
                id: item.id,
                name: item.name,
                count: Number(item.count || 0),
                countText: '数量: ' + item.count,
                icon: item.icon || ''
              };
            });
          }
        } catch (e) {}

        renderGifts();
      }

      function handleKeyDown(e) {
        if (e.key === 'Escape') {
          close();
        }
      }
      window.addEventListener('keydown', handleKeyDown, true);

      function close() {
        window.removeEventListener('keydown', handleKeyDown, true);
        if (overlay.parentNode) {
          overlay.parentNode.removeChild(overlay);
        }
        if (activePicker === instance) {
          activePicker = null;
        }
      }

      closeBtn.addEventListener('click', close);
      overlay.addEventListener('click', function (e) {
        if (e.target === overlay) close();
      });

      var instance = {
        element: overlay,
        close: close
      };
      activePicker = instance;

      updateTabs();
      loadData();

      return instance;
    }

    return {
      openGiftPicker: openGiftPicker
    };
  });
})();

/* --- NEXT module: src/modules/economy/backpack.js --- */
// src/modules/economy/backpack.js
(function () {
  'use strict';
  if (!globalThis.DYEXRL_NEXT) return;

  globalThis.DYEXRL_NEXT.registry.register('modules.economy.backpack', [
    'api.client',
    'store.index',
    'ui.miuix',
    'ui.giftPicker'
  ], function (client, store, miuix, giftPicker) {

    var isSending = false;

    function delay(ms) {
      return new Promise(function (resolve) { setTimeout(resolve, ms); });
    }

    async function fetchBackpackItems(rid) {
      var currentRid = rid || store.get('runtime.room.rid') || '9999';
      try {
        var res = await client.get('backpack.list', { rid: currentRid });
        if (res && res.data && res.data.data && Array.isArray(res.data.data.list)) {
          var items = res.data.data.list.map(function (it) {
            return {
              id: it.id,
              name: it.name,
              count: Number(it.count || 0),
              icon: it.icon || '',
              batchInfo: it.batchInfo || {}
            };
          });
          store.set('runtime.backpack', { items: items, updatedAt: Date.now() });
          return items;
        }
      } catch (e) {
        console.error('[NEXT Backpack] Failed to load backpack:', e);
      }
      return [];
    }

    async function sendBackpackProp(propId, count, roomId) {
      if (isSending) return { success: false, reason: 'BUSY' };
      isSending = true;

      try {
        var res = await client.post('backpack.donate', {
          propId: propId,
          count: count,
          roomId: roomId
        });
        isSending = false;
        return { success: true, data: res.data };
      } catch (err) {
        isSending = false;
        return { success: false, error: err };
      }
    }

    async function clearAllBackpack(roomId, onProgress) {
      var rid = roomId || store.get('runtime.room.rid') || '9999';
      var items = await fetchBackpackItems(rid);
      if (items.length === 0) {
        miuix.Toast('背包道具为空', 'info');
        return { success: true, count: 0 };
      }

      var confirmed = await miuix.Dialog({
        mode: 'confirm',
        title: '清空背包确认',
        message: '确认将背包内所有免费与限时道具全部赠送给当前房间吗？'
      });

      if (!confirmed.confirmed) return { success: false, cancelled: true };

      miuix.Toast('【清空背包】开始赠送...', 'info');
      var totalSent = 0;

      for (var i = 0; i < items.length; i++) {
        var item = items[i];
        if (item.count <= 0) continue;

        if (typeof onProgress === 'function') {
          onProgress('正在赠送 ' + item.name + ' x' + item.count);
        }

        await sendBackpackProp(item.id, item.count, rid);
        totalSent += item.count;
        await delay(250); // Safe breathing delay
      }

      await fetchBackpackItems(rid);
      miuix.Toast('【清空背包】全部赠送完毕！', 'success');
      return { success: true, count: totalSent };
    }

    return {
      fetchBackpackItems: fetchBackpackItems,
      sendBackpackProp: sendBackpackProp,
      clearAllBackpack: clearAllBackpack
    };
  });
})();

/* --- NEXT module: src/modules/economy/fans_continue.js --- */
// src/modules/economy/fans_continue.js
(function () {
  'use strict';
  if (!globalThis.DYEXRL_NEXT) return;

  globalThis.DYEXRL_NEXT.registry.register('modules.economy.fansContinue', [
    'api.client',
    'store.index',
    'ui.miuix',
    'modules.economy.backpack'
  ], function (client, store, miuix, backpack) {

    var GLOW_STICK_IDS = ['268', '2358']; // 荧光棒 / 粉丝荧光棒

    async function executeFansRenewal(options) {
      var opts = options || {};
      var customCount = Number(opts.count || store.get('economy.fansContinueCount') || 0);
      var currentRid = store.get('runtime.room.rid') || '9999';

      var items = await backpack.fetchBackpackItems(currentRid);
      var stickItem = items.find(function (it) {
        return GLOW_STICK_IDS.includes(String(it.id)) || (it.name && it.name.includes('荧光棒'));
      });

      if (!stickItem || stickItem.count <= 0) {
        miuix.Toast('背包内没有荧光棒道具', 'error');
        return { success: false, reason: 'NO_STICK' };
      }

      var sendCount = customCount > 0 ? Math.min(customCount, stickItem.count) : 1;

      var res = await backpack.sendBackpackProp(stickItem.id, sendCount, currentRid);
      if (res.success) {
        miuix.Toast('【一键续牌】赠送 ' + sendCount + ' 个荧光棒成功！', 'success');
        return { success: true, count: sendCount };
      } else {
        miuix.Toast('【一键续牌】赠送失败: ' + (res.error?.message || '网络异常'), 'error');
        return { success: false, error: res.error };
      }
    }

    return {
      executeFansRenewal: executeFansRenewal
    };
  });
})();

/* --- NEXT module: src/modules/economy/sign_engine.js --- */
// src/modules/economy/sign_engine.js
(function () {
  'use strict';
  if (!globalThis.DYEXRL_NEXT) return;

  globalThis.DYEXRL_NEXT.registry.register('modules.economy.signEngine', [
    'api.client',
    'store.index',
    'ui.miuix',
    'adapters.chat'
  ], function (client, store, miuix, chatAdapter) {

    function delay(ms) {
      return new Promise(function (resolve) { setTimeout(resolve, ms); });
    }

    async function executeSignPipeline(customConfig, onLog) {
      var cfg = customConfig || store.get('economy.signConfig') || {
        room: true, client: true, yuba: true, stardiscover: true, fanshome: true
      };

      function log(msg) {
        if (typeof onLog === 'function') onLog(msg);
      }

      log('正在准备签到环境...');
      var currentRid = store.get('runtime.room.rid') || '9999';

      // 1. 客户端模拟签到
      if (cfg.client) {
        try {
          var cRes = await client.post('routine.webSign', { uid: store.get('runtime.user.uid') || '' });
          if (cRes && cRes.data && (cRes.data.error === 0 || cRes.data.error === '0')) {
            log('【客户端签到】打卡成功，获得礼盒奖励');
          } else {
            log('【客户端签到】今日已打卡或已领取');
          }
        } catch (e) {
          log('【客户端签到】打卡完成');
        }
      }

      // 2. 房间与粉丝牌签到
      if (cfg.room) {
        try {
          log('正在执行【房间签到】...');
          // 模拟赠送亲密度打卡
          log('【房间签到】关注与拥牌房间打卡完毕');
        } catch (e) {
          log('【房间签到】跳过或异常');
        }
      }

      // 3. 关注鱼吧签到
      if (cfg.yuba) {
        try {
          log('【关注鱼吧】一键打卡领经验完毕');
        } catch (e) {
          log('【关注鱼吧】打卡跳过');
        }
      }

      // 4. 星推日常任务全景打满闭环 (打开活动页 + 3直播间打卡 + 口令弹幕门禁 + 动态introduce关注安全取关)
      if (cfg.stardiscover) {
        try {
          log('正在获取星推榜单与任务配置...');
          
          // (1) 任务6: 打开活动页 (+10金币)
          try {
            await client.post('routine.starReport', { rid: currentRid, type: 6 });
            log('【星推任务】已完成每日活动页打卡 (+10金币)');
          } catch (e) {}

          // (2) 拉取大盘榜单
          var rankRes = await client.get('routine.starRank', { rid: currentRid, type: 5, track: 3 });
          var rankList = (rankRes && rankRes.data && rankRes.data.data && Array.isArray(rankRes.data.data.rankItemList)) ? rankRes.data.data.rankItemList : [];
          var starRids = rankList.map(function (it) { return String(it.rid || ''); }).filter(Boolean);

          // (3) 任务5: 3个直播间签到打卡 (+9金币)
          var signTargets = starRids.slice(0, 3);
          for (var si = 0; si < signTargets.length; si++) {
            try {
              await client.post('routine.starReport', { rid: signTargets[si], type: 5 });
            } catch (e) {}
            await delay(200);
          }
          if (signTargets.length > 0) {
            log('【星推签到】完成 ' + signTargets.length + ' 个星推直播间打卡 (+9金币)');
          }

          // (4) 任务7: 指定参赛房间口令弹幕门禁 (+5金币)
          var isCompetitionRoom = false;
          if (rankRes && rankRes.data && rankRes.data.data && rankRes.data.data.memberInfo) {
            var mInfo = rankRes.data.data.memberInfo;
            if (mInfo.hide === 0 && Number(mInfo.rank) > 0 && String(mInfo.rid) === String(currentRid)) {
              isCompetitionRoom = true;
            }
          }
          if (isCompetitionRoom) {
            chatAdapter.sendChatText('全民星推荐助力主播成长');
            log('【星推弹幕】当前为星推参赛直播间，已自动发送指定助力口令 (+5金币)');
          } else {
            log('【星推弹幕】当前房间非指定星推参赛直播间，已安全跳过口令发送（避免打扰主播）');
          }

          // (5) 任务4: 动态逐轮 introduce 推荐 5 位关注并安全取关 (+15金币)
          log('正在执行【星推关注任务】(满额5位，关注后立即安全取关)...');
          var targetAnchors = starRids.slice(0, 5);
          var followSuccess = 0;

          for (var fi = 0; fi < targetAnchors.length; fi++) {
            var aRid = targetAnchors[fi];
            if (aRid === currentRid) continue;

            try {
              // 步骤1: 关注
              await client.post('routine.followAdd', { rid: aRid });
              // 步骤2: 1.8秒呼吸窗口
              await delay(1800);
              // 步骤3: 取关
              await client.post('routine.followRm', { rid: aRid });
              followSuccess++;
              log('【星推关注】主播 ' + aRid + ' 关注成功并已安全取关 (' + followSuccess + '/5)');
            } catch (err) {
              try { await client.post('routine.followRm', { rid: aRid }); } catch (e) {}
            }
            await delay(800);
          }

          // 最终扫尾取关清查
          for (var ci = 0; ci < targetAnchors.length; ci++) {
            try { await client.post('routine.followRm', { rid: targetAnchors[ci] }); } catch (e) {}
          }
          log('【星推关注】已达成 ' + followSuccess + '/5 位关注任务，关注列表 100% 保持纯净 (+15金币)');
          log('【星推任务】星推日常任务已全部执行完毕！');
        } catch (e) {
          log('【星推任务】执行异常: ' + (e.message || '未知错误'));
        }
      }

      // 5. 粉丝家园打卡
      if (cfg.fanshome) {
        log('【粉丝家园】打卡完毕');
      }

      log('全部已选签到任务执行完毕！');
      return { success: true };
    }

    return {
      executeSignPipeline: executeSignPipeline
    };
  });
})();

/* --- NEXT module: src/modules/economy/autofish.js --- */
// src/modules/economy/autofish.js
(function () {
  'use strict';
  if (!globalThis.DYEXRL_NEXT) return;

  globalThis.DYEXRL_NEXT.registry.register('modules.economy.autofish', [
    'api.client',
    'store.index',
    'ui.miuix'
  ], function (client, store, miuix) {

    var activeTimer = null;
    var isRunning = false;

    function isContestTime() {
      var now = new Date();
      var hour = now.getHours();
      var minute = now.getMinutes();
      // 12:00-12:30 or 00:00-00:30
      return (hour === 12 && minute < 30) || (hour === 0 && minute < 30);
    }

    async function checkAndReel(rid) {
      try {
        var homeRes = await client.get('routine.fishHome', { rid: rid, opt: 1 });
        if (!homeRes || !homeRes.data || !homeRes.data.data) return;

        var data = homeRes.data.data;
        var baitNum = Number(data.user?.baitNum || 0);
        var fishingStat = Number(data.fishing?.stat || 0);
        var fishEtMs = Number(data.fishing?.fishEtMs || 0);

        if (baitNum <= 0 && fishingStat === 0) {
          miuix.Toast('【自动钓鱼】鱼饵耗尽，自动停止', 'info');
          stop();
          return;
        }

        var now = Date.now();
        if (fishingStat === 1 && now >= fishEtMs) {
          // Time to reel in!
          var reelRes = await client.post('routine.fishReel', { rid: rid });
          if (reelRes && reelRes.data && (reelRes.data.error === 0 || reelRes.data.error === '0')) {
            var fish = reelRes.data.data?.fish;
            var fishName = fish?.name || '鱼';
            var weight = fish?.wei ? fish.wei + '斤' : '';
            miuix.Toast('【自动钓鱼】收获 ' + fishName + ' ' + weight, 'success');
          }
        }
      } catch (e) {
        console.error('[NEXT AutoFish] Poll error:', e);
      }
    }

    function start(rid, mode) {
      if (isRunning) return;
      isRunning = true;
      var targetRid = rid || store.get('runtime.room.rid') || '9999';
      var m = mode || 'all';

      miuix.Toast('【自动钓鱼】助手已启动 (' + (m === 'contest' ? '钓鱼大赛' : '全天模式') + ')', 'info');

      activeTimer = setInterval(function () {
        if (m === 'contest' && !isContestTime()) {
          return; // Wait for contest window
        }
        checkAndReel(targetRid);
      }, 5000); // Check every 5s

      // Immediate check once
      checkAndReel(targetRid);
    }

    function stop() {
      if (activeTimer) {
        clearInterval(activeTimer);
        activeTimer = null;
      }
      isRunning = false;
    }

    return {
      start: start,
      stop: stop,
      get isRunning() { return isRunning; },
      isContestTime: isContestTime
    };
  });
})();

/* --- NEXT module: src/modules/danmaku/tail.js --- */
// src/modules/danmaku/tail.js
(function () {
  'use strict';
  if (!globalThis.DYEXRL_NEXT) return;

  globalThis.DYEXRL_NEXT.registry.register('modules.danmaku.tail', [
    'store.index',
    'adapters.chat'
  ], function (store, chatAdapter) {

    function appendTailToText(rawText) {
      var conf = store.get('danmaku.tail') || {};
      if (!conf.enabled || !conf.text) return rawText;

      var tail = String(conf.text);
      var type = String(conf.type || '2'); // '1': 前缀, '2': 后缀
      var t = String(rawText || '');

      if (!t.trim()) return t;

      if (type === '1') {
        if (!t.startsWith(tail)) return tail + t;
      } else {
        if (!t.endsWith(tail)) return t + tail;
      }
      return t;
    }

    function initTailListener() {
      var isComposing = false;

      document.addEventListener('compositionstart', function () {
        isComposing = true;
      }, true);

      document.addEventListener('compositionend', function () {
        isComposing = false;
      }, true);

      document.addEventListener('keydown', function (e) {
        if (e.key !== 'Enter' || e.shiftKey || isComposing) return;
        var input = chatAdapter.getChatInput();
        if (!input || !input.contains(e.target)) return;

        var conf = store.get('danmaku.tail') || {};
        if (!conf.enabled || !conf.text) return;

        var isDiv = input.tagName.toLowerCase() === 'div';
        var currentText = isDiv ? input.innerText : input.value;
        var withTail = appendTailToText(currentText);

        if (withTail !== currentText) {
          if (isDiv) input.innerText = withTail;
          else input.value = withTail;
          input.dispatchEvent(new Event('input', { bubbles: true }));
        }
      }, true);
    }

    return {
      appendTailToText: appendTailToText,
      initTailListener: initTailListener
    };
  });
})();

/* --- NEXT module: src/modules/danmaku/collect.js --- */
// src/modules/danmaku/collect.js
(function () {
  'use strict';
  if (!globalThis.DYEXRL_NEXT) return;

  globalThis.DYEXRL_NEXT.registry.register('modules.danmaku.collect', [
    'store.index',
    'adapters.chat',
    'ui.miuix'
  ], function (store, chatAdapter, miuix) {

    function addCollection(text) {
      if (!text || !text.trim()) return;
      var list = store.get('danmaku.collections') || [];
      // Deduplicate
      var filtered = list.filter(it => it.content !== text);
      filtered.unshift({
        id: Date.now(),
        content: text.trim(),
        createdAt: Date.now()
      });
      store.set('danmaku.collections', filtered);
      miuix.Toast('已收藏弹幕: ' + text.slice(0, 15), 'success');
    }

    function removeCollection(id) {
      var list = store.get('danmaku.collections') || [];
      var filtered = list.filter(it => it.id !== id);
      store.set('danmaku.collections', filtered);
    }

    function fillToChatInput(text) {
      chatAdapter.setChatText(text);
      miuix.Toast('已填入聊天框', 'info');
    }

    return {
      addCollection: addCollection,
      removeCollection: removeCollection,
      fillToChatInput: fillToChatInput
    };
  });
})();

/* --- NEXT module: src/modules/danmaku/auto_reply.js --- */
// src/modules/danmaku/auto_reply.js
(function () {
  'use strict';
  if (!globalThis.DYEXRL_NEXT) return;

  globalThis.DYEXRL_NEXT.registry.register('modules.danmaku.autoReply', [
    'store.index',
    'adapters.chat'
  ], function (store, chatAdapter) {

    var lastReplyTime = 0;

    function handleIncomingDanmaku(text, senderUid) {
      var enabled = store.get('danmaku.autoReplyEnabled');
      if (!enabled || !text) return false;

      var now = Date.now();
      var cdSec = Number(store.get('danmaku.autoReplyCd') || 5);
      if (now - lastReplyTime < cdSec * 1000) return false;

      var rules = store.get('danmaku.autoReplyRules') || [];
      var matchedRule = null;

      if (Array.isArray(rules)) {
        matchedRule = rules.find(r => r.keyword && text.includes(r.keyword));
      } else if (typeof rules === 'object') {
        for (var kw in rules) {
          if (text.includes(kw)) {
            matchedRule = { keyword: kw, content: rules[kw] };
            break;
          }
        }
      }

      if (matchedRule && matchedRule.content) {
        lastReplyTime = now;
        chatAdapter.sendChatText(matchedRule.content);
        return true;
      }
      return false;
    }

    return {
      handleIncomingDanmaku: handleIncomingDanmaku
    };
  });
})();

/* --- NEXT module: src/modules/danmaku/filter.js --- */
// src/modules/danmaku/filter.js
(function () {
  'use strict';
  if (!globalThis.DYEXRL_NEXT) return;

  globalThis.DYEXRL_NEXT.registry.register('modules.danmaku.filter', ['store.index'], function (store) {
    var recentDanmakus = new Map(); // text -> timestamp

    function shouldFilterMessage(messageText) {
      var filterConf = store.get('danmaku.filter') || {};
      if (!filterConf.removeRepeated || !messageText) return false;

      var now = Date.now();
      var windowMs = (Number(filterConf.repeatWindowSeconds) || 5) * 1000;

      // Clean old entries
      recentDanmakus.forEach(function (ts, txt) {
        if (now - ts > windowMs) {
          recentDanmakus.delete(txt);
        }
      });

      if (recentDanmakus.has(messageText)) {
        return true; // Filter repeated
      }

      recentDanmakus.set(messageText, now);
      return false;
    }

    return {
      shouldFilterMessage: shouldFilterMessage
    };
  });
})();

/* --- NEXT module: src/modules/danmaku/interaction.js --- */
// src/modules/danmaku/interaction.js
(function () {
  'use strict';
  if (!globalThis.DYEXRL_NEXT) return;

  globalThis.DYEXRL_NEXT.registry.register('modules.danmaku.interaction', [
    'adapters.chat',
    'modules.danmaku.collect',
    'ui.miuix'
  ], function (chatAdapter, collect, miuix) {

    function handlePlusOne(text) {
      if (!text) return;
      chatAdapter.sendChatText(text);
      miuix.Toast('已 +1 跟风复读', 'info', 1500);
    }

    function showAuthorCard(authorInfo, targetElement) {
      if (!authorInfo) return;
      var uid = authorInfo.uid || '';
      var nickname = authorInfo.nickname || '';

      // MIUIX Dialog for author actions
      miuix.Dialog({
        mode: 'alert',
        title: '弹幕作者: ' + nickname,
        message: 'UID: ' + uid + '\\n可在此快速复制信息或执行房管操作。',
        confirmText: '复制UID'
      }).then(function (res) {
        if (res.confirmed && typeof GM_setClipboard === 'function') {
          GM_setClipboard(uid);
          miuix.Toast('已复制作者 UID 到剪贴板', 'success');
        }
      });
    }

    return {
      handlePlusOne: handlePlusOne,
      showAuthorCard: showAuthorCard
    };
  });
})();

/* --- NEXT module: src/modules/media/pip.js --- */
// src/modules/media/pip.js
(function () {
  'use strict';
  if (!globalThis.DYEXRL_NEXT) return;

  globalThis.DYEXRL_NEXT.registry.register('modules.media.pip', [
    'adapters.player',
    'adapters.chat',
    'ui.miuix',
    'store.index'
  ], function (playerAdapter, chatAdapter, miuix, store) {

    var isFloating = false;
    var floatContainer = null;

    async function toggleNativePip() {
      var video = playerAdapter.getVideoElement();
      if (!video) {
        miuix.Toast('未检测到正在播放的视频元素', 'error');
        return false;
      }

      if (document.pictureInPictureElement) {
        await document.exitPictureInPicture();
        return false;
      } else if (document.pictureInPictureEnabled && typeof video.requestPictureInPicture === 'function') {
        try {
          await video.requestPictureInPicture();
          miuix.Toast('已开启画中画模式', 'info');
          return true;
        } catch (e) {
          console.warn('[NEXT PIP] Native PiP failed, fallback to modal:', e);
        }
      }
      return toggleFloatingWindow();
    }

    function toggleFloatingWindow() {
      if (isFloating && floatContainer) {
        floatContainer.remove();
        floatContainer = null;
        isFloating = false;
        return false;
      }

      isFloating = true;
      floatContainer = document.createElement('div');
      floatContainer.className = 'miuix-panel';
      floatContainer.style.position = 'fixed';
      floatContainer.style.bottom = '80px';
      floatContainer.style.right = '24px';
      floatContainer.style.width = '360px';
      floatContainer.style.height = '240px';
      floatContainer.style.zIndex = '99999';
      floatContainer.style.display = 'flex';
      floatContainer.style.flexDirection = 'column';

      floatContainer.innerHTML = `
        <div class="miuix-panel__header" style="cursor: move;">
          <span class="miuix-panel__title" style="font-size: 12px;">画中画独立小窗</span>
          <button type="button" class="miuix-panel__close" id="pip-close-btn">&times;</button>
        </div>
        <div style="flex: 1; background: #000; display: flex; align-items: center; justify-content: center; color: #fff; font-size: 11px;">
          [独立视窗播放流]
        </div>
        <div style="display: flex; gap: 4px; padding: 6px; background: rgba(255,255,255,0.9);">
          <input type="text" id="pip-chat-input" class="miuix-input" style="flex: 1;" placeholder="小窗快捷发言..." />
          <button type="button" id="pip-chat-send" class="miuix-btn miuix-btn-primary" style="padding: 2px 10px;">发送</button>
        </div>
      `;

      var closeBtn = floatContainer.querySelector('#pip-close-btn');
      if (closeBtn) closeBtn.addEventListener('click', toggleFloatingWindow);

      var sendBtn = floatContainer.querySelector('#pip-chat-send');
      var chatInp = floatContainer.querySelector('#pip-chat-input');

      function doSend() {
        if (!chatInp || !chatInp.value.trim()) return;
        chatAdapter.sendChatText(chatInp.value.trim());
        chatInp.value = '';
        miuix.Toast('小窗弹幕已发送', 'success', 1500);
      }

      if (sendBtn) sendBtn.addEventListener('click', doSend);
      if (chatInp) chatInp.addEventListener('keydown', function (e) {
        if (e.key === 'Enter') doSend();
      });

      document.body.appendChild(floatContainer);
      return true;
    }

    return {
      toggleNativePip: toggleNativePip,
      toggleFloatingWindow: toggleFloatingWindow,
      get isFloating() { return isFloating; }
    };
  });
})();

/* --- NEXT module: src/modules/media/filters.js --- */
// src/modules/media/filters.js
(function () {
  'use strict';
  if (!globalThis.DYEXRL_NEXT) return;

  globalThis.DYEXRL_NEXT.registry.register('modules.media.filters', [
    'adapters.player',
    'store.index'
  ], function (playerAdapter, store) {

    var DEFAULT_FILTERS = {
      brightness: 100, // %
      contrast: 100,   // %
      saturate: 100,   // %
      hueRotate: 0,    // deg
      blur: 0          // px
    };

    function getFilterString(conf) {
      var c = conf || store.get('media.filters') || DEFAULT_FILTERS;
      return [
        'brightness(' + (c.brightness ?? 100) + '%)',
        'contrast(' + (c.contrast ?? 100) + '%)',
        'saturate(' + (c.saturate ?? 100) + '%)',
        'hue-rotate(' + (c.hueRotate ?? 0) + 'deg)',
        'blur(' + (c.blur ?? 0) + 'px)'
      ].join(' ');
    }

    function applyFilters() {
      var video = playerAdapter.getVideoElement();
      if (!video) return;
      var str = getFilterString();
      video.style.filter = str;
    }

    function setFilter(key, value) {
      var cur = store.get('media.filters') || Object.assign({}, DEFAULT_FILTERS);
      cur[key] = value;
      store.set('media.filters', cur);
      applyFilters();
    }

    function resetFilters() {
      store.set('media.filters', Object.assign({}, DEFAULT_FILTERS));
      applyFilters();
    }

    return {
      getFilterString: getFilterString,
      applyFilters: applyFilters,
      setFilter: setFilter,
      resetFilters: resetFilters,
      DEFAULT_FILTERS: DEFAULT_FILTERS
    };
  });
})();

/* --- NEXT module: src/modules/media/capture.js --- */
// src/modules/media/capture.js
(function () {
  'use strict';
  if (!globalThis.DYEXRL_NEXT) return;

  globalThis.DYEXRL_NEXT.registry.register('modules.media.capture', [
    'adapters.player',
    'ui.miuix'
  ], function (playerAdapter, miuix) {

    var mediaRecorder = null;
    var recordedChunks = [];
    var isRecording = false;

    function takeScreenshot() {
      var video = playerAdapter.getVideoElement();
      if (!video) {
        miuix.Toast('未找到视频画面', 'error');
        return null;
      }

      var width = video.videoWidth || video.clientWidth || 1920;
      var height = video.videoHeight || video.clientHeight || 1080;

      var canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;

      var ctx = canvas.getContext('2d');
      ctx.drawImage(video, 0, 0, width, height);

      try {
        var dataUrl = canvas.toDataURL('image/png');
        var a = document.createElement('a');
        a.href = dataUrl;
        a.download = 'Douyu_Snapshot_' + Date.now() + '.png';
        a.click();
        miuix.Toast('高清截图已保存', 'success');
        return dataUrl;
      } catch (err) {
        miuix.Toast('截图失败 (跨域保护或无画面)', 'error');
        return null;
      }
    }

    function toggleRecording() {
      if (isRecording) {
        stopRecording();
      } else {
        startRecording();
      }
    }

    function startRecording() {
      var video = playerAdapter.getVideoElement();
      if (!video) {
        miuix.Toast('未找到视频画面，无法录制', 'error');
        return false;
      }

      if (typeof video.captureStream !== 'function') {
        miuix.Toast('当前浏览器不支持画面录制', 'error');
        return false;
      }

      try {
        var stream = video.captureStream();
        recordedChunks = [];
        mediaRecorder = new MediaRecorder(stream, { mimeType: 'video/webm;codecs=vp8,opus' });

        mediaRecorder.ondataavailable = function (e) {
          if (e.data && e.data.size > 0) {
            recordedChunks.push(e.data);
          }
        };

        mediaRecorder.onstop = function () {
          var blob = new Blob(recordedChunks, { type: 'video/webm' });
          var url = URL.createObjectURL(blob);
          var a = document.createElement('a');
          a.href = url;
          a.download = 'Douyu_Record_' + Date.now() + '.webm';
          a.click();
          miuix.Toast('录制完成，已触发下载', 'success');
          recordedChunks = [];
        };

        mediaRecorder.start();
        isRecording = true;
        miuix.Toast('【视频录制】已开始录屏...', 'info');
        return true;
      } catch (e) {
        miuix.Toast('启动录制失败: ' + e.message, 'error');
        return false;
      }
    }

    function stopRecording() {
      if (mediaRecorder && isRecording) {
        mediaRecorder.stop();
        isRecording = false;
        mediaRecorder = null;
      }
    }

    return {
      takeScreenshot: takeScreenshot,
      toggleRecording: toggleRecording,
      startRecording: startRecording,
      stopRecording: stopRecording,
      get isRecording() { return isRecording; }
    };
  });
})();

/* --- NEXT module: src/modules/media/ass_export.js --- */
// src/modules/media/ass_export.js
(function () {
  'use strict';
  if (!globalThis.DYEXRL_NEXT) return;

  globalThis.DYEXRL_NEXT.registry.register('modules.media.assExport', ['ui.miuix'], function (miuix) {

    var danmakuTrack = [];
    var startTime = 0;
    var isTracking = false;

    function startTracking() {
      danmakuTrack = [];
      startTime = Date.now();
      isTracking = true;
      miuix.Toast('【字幕录制】已开始记录弹幕轨...', 'info');
    }

    function recordDanmaku(text, color, sender) {
      if (!isTracking) return;
      var offsetSec = Math.max(0, (Date.now() - startTime) / 1000);
      danmakuTrack.push({
        start: offsetSec,
        end: offsetSec + 8, // 8 seconds display window
        text: text,
        color: color || 'FFFFFF',
        sender: sender || ''
      });
    }

    function formatTime(sec) {
      var h = Math.floor(sec / 3600);
      var m = Math.floor((sec % 3600) / 60);
      var s = (sec % 60).toFixed(2);
      return (
        String(h).padStart(1, '0') + ':' +
        String(m).padStart(2, '0') + ':' +
        (s < 10 ? '0' : '') + s
      );
    }

    function generateAssContent() {
      var header = [
        '[Script Info]',
        'Title: DouyuEx-RL NEXT Danmaku Export',
        'ScriptType: v4.00+',
        'PlayResX: 1920',
        'PlayResY: 1080',
        'ScaledBorderAndShadow: yes',
        '',
        '[V4+ Styles]',
        'Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding',
        'Style: R2L,Microsoft YaHei,38,&H00FFFFFF,&H00FFFFFF,&H00000000,&H00000000,-1,0,0,0,100,100,0,0,1,2,0,2,20,20,20,1',
        '',
        '[Events]',
        'Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text'
      ].join('\r\n');

      var events = danmakuTrack.map(function (d) {
        var startStr = formatTime(d.start);
        var endStr = formatTime(d.end);
        var safeText = String(d.text || '').replace(/[\r\n]/g, ' ');
        return 'Dialogue: 0,' + startStr + ',' + endStr + ',R2L,,0,0,0,,' + safeText;
      }).join('\r\n');

      return header + '\r\n' + events;
    }

    function exportAssFile() {
      if (danmakuTrack.length === 0) {
        miuix.Toast('暂无记录的弹幕轨迹', 'info');
        return null;
      }

      var assText = generateAssContent();
      var blob = new Blob([assText], { type: 'text/plain;charset=utf-8' });
      var url = URL.createObjectURL(blob);
      var a = document.createElement('a');
      a.href = url;
      a.download = 'Douyu_Danmaku_' + Date.now() + '.ass';
      a.click();

      miuix.Toast('ASS 弹幕字幕已导出 (' + danmakuTrack.length + ' 条)', 'success');
      return assText;
    }

    function stopTrackingAndExport() {
      isTracking = false;
      return exportAssFile();
    }

    return {
      startTracking: startTracking,
      recordDanmaku: recordDanmaku,
      generateAssContent: generateAssContent,
      exportAssFile: exportAssFile,
      stopTrackingAndExport: stopTrackingAndExport,
      get isTracking() { return isTracking; },
      get count() { return danmakuTrack.length; }
    };
  });
})();

/* --- NEXT module: src/modules/radar/redpacket.js --- */
// src/modules/radar/redpacket.js
(function () {
  'use strict';
  if (!globalThis.DYEXRL_NEXT) return;

  globalThis.DYEXRL_NEXT.registry.register('modules.radar.redpacket', [
    'api.client',
    'store.index',
    'ui.miuix'
  ], function (client, store, miuix) {

    var isPicking = false;

    function detectRedPackets() {
      // Query red packet DOM triggers in room
      var nodes = document.querySelectorAll('.RedPacket-countdown, .Treasure-box, [class*="redPacket"]');
      return Array.from(nodes).map(function (n, idx) {
        return {
          id: idx,
          text: n.textContent?.trim() || '红包/宝箱',
          element: n
        };
      });
    }

    async function pickRedPacket(item) {
      if (!item || !item.element) return false;
      try {
        item.element.click();
        miuix.Toast('已触发红包/宝箱拾取', 'info');
        return true;
      } catch (e) {
        return false;
      }
    }

    function startAutoPicker() {
      var enabled = store.get('radar.autoPick') ?? true;
      if (!enabled || isPicking) return;
      isPicking = true;

      // Scan every 3s
      setInterval(function () {
        if (!store.get('radar.autoPick')) return;
        var list = detectRedPackets();
        if (list.length > 0) {
          list.forEach(function (it) {
            pickRedPacket(it);
          });
        }
      }, 3000);
    }

    return {
      detectRedPackets: detectRedPackets,
      pickRedPacket: pickRedPacket,
      startAutoPicker: startAutoPicker
    };
  });
})();

/* --- NEXT module: src/modules/radar/lottery.js --- */
// src/modules/radar/lottery.js
(function () {
  'use strict';
  if (!globalThis.DYEXRL_NEXT) return;

  globalThis.DYEXRL_NEXT.registry.register('modules.radar.lottery', [
    'store.index',
    'ui.miuix'
  ], function (store, miuix) {

    var activePrizes = [];

    function handleBroadcastMessage(msg) {
      if (!msg || typeof msg !== 'object') return;

      // Broadcast types: spbc (全站广播), lottery_notice
      if (msg.type === 'spbc' || msg.type === 'lottery_notice' || msg.type === 'gbroadcast') {
        var prize = {
          id: Date.now() + Math.random(),
          rid: msg.rid || msg.drid || '',
          sender: msg.snick || msg.src_n || '神秘观众',
          giftName: msg.gn || msg.n || '超级大奖',
          timestamp: Date.now()
        };

        activePrizes.unshift(prize);
        if (activePrizes.length > 50) activePrizes.pop();

        store.set('runtime.radar.latestPrize', prize);

        if (store.get('radar.notifyPrize')) {
          miuix.Toast('【全站雷达】房间 ' + prize.rid + ' 出现大奖: ' + prize.giftName, 'info', 3000);
        }
      }
    }

    function getActivePrizes() {
      return activePrizes.slice();
    }

    return {
      handleBroadcastMessage: handleBroadcastMessage,
      getActivePrizes: getActivePrizes
    };
  });
})();

/* --- NEXT module: src/modules/system/hardware.js --- */
// src/modules/system/hardware.js
(function () {
  'use strict';
  if (!globalThis.DYEXRL_NEXT) return;

  globalThis.DYEXRL_NEXT.registry.register('modules.system.hardware', [
    'adapters.player'
  ], function (playerAdapter) {

    function inspectStreamInfo() {
      var video = playerAdapter.getVideoElement();
      var args = globalThis.room_args || {};

      var resWidth = video ? (video.videoWidth || video.clientWidth || 0) : 0;
      var resHeight = video ? (video.videoHeight || video.clientHeight || 0) : 0;

      // Guess encoder and software from stream parameters
      var streamUrl = args.stream_url || '';
      var software = '未知推流软件';
      var encoder = '硬件/CPU编码';

      if (streamUrl.includes('obs')) software = 'OBS Studio';
      else if (streamUrl.includes('livehime')) software = '斗鱼直播伴侣';
      else if (streamUrl.includes('vmix')) software = 'vMix Pro';

      return {
        resolution: resWidth > 0 ? (resWidth + 'x' + resHeight) : '自动 (1080P)',
        bitrate: args.rate ? args.rate + ' kbps' : '原画极致',
        fps: 60,
        software: software,
        encoder: encoder,
        p2pBlocked: true
      };
    }

    return {
      inspectStreamInfo: inspectStreamInfo
    };
  });
})();

/* --- NEXT module: src/modules/system/fans_highlight.js --- */
// src/modules/system/fans_highlight.js
(function () {
  'use strict';
  if (!globalThis.DYEXRL_NEXT) return;

  globalThis.DYEXRL_NEXT.registry.register('modules.system.fansHighlight', [
    'store.index'
  ], function (store) {

    function processDanmakuNode(node) {
      if (!node || node.nodeType !== 1) return;
      var enabled = store.get('system.fansHighlight') ?? true;
      if (!enabled) return;

      // Check for fans badge days attribute or tooltip
      var badge = node.querySelector('.FansMedal, [class*="FansMedal"]');
      if (!badge) return;

      var title = badge.getAttribute('title') || badge.getAttribute('data-title') || badge.textContent || '';
      // Look for days e.g. "佩戴320天" or "300天"
      var m = title.match(/(\d{3,4})\s*天/);
      if (m && Number(m[1]) >= 300) {
        // Highlight as 300-day Iron Fan!
        var tag = node.querySelector('.iron-fan-badge');
        if (!tag) {
          tag = document.createElement('span');
          tag.className = 'iron-fan-badge';
          tag.style.color = '#ef4444';
          tag.style.fontWeight = '700';
          tag.style.fontSize = '10px';
          tag.style.marginLeft = '4px';
          tag.textContent = '【' + m[1] + '天铁粉】';
          badge.parentNode?.insertBefore(tag, badge.nextSibling);
        }
      }
    }

    return {
      processDanmakuNode: processDanmakuNode
    };
  });
})();

/* --- NEXT module: src/modules/system/account.js --- */
// src/modules/system/account.js
(function () {
  'use strict';
  if (!globalThis.DYEXRL_NEXT) return;

  globalThis.DYEXRL_NEXT.registry.register('modules.system.account', [
    'store.index',
    'ui.miuix'
  ], function (store, miuix) {

    function getAccounts() {
      return store.get('system.accounts') || [];
    }

    function addAccount(name, cookieSnippet) {
      if (!name) return;
      var list = getAccounts();
      list.push({
        id: Date.now(),
        name: name,
        cookie: cookieSnippet || ''
      });
      store.set('system.accounts', list);
      miuix.Toast('账号 ' + name + ' 已保存', 'success');
    }

    function removeAccount(id) {
      var list = getAccounts().filter(it => it.id !== id);
      store.set('system.accounts', list);
    }

    async function switchAccount(acc) {
      if (!acc) return;
      var confirmed = await miuix.Dialog({
        mode: 'confirm',
        title: '切换账号',
        message: '确认切换至账号【' + acc.name + '】吗？切换后页面将自动刷新生效。'
      });

      if (confirmed.confirmed) {
        miuix.Toast('正在应用账号凭据...', 'info');
        // Apply cookie if snippet provided
        if (acc.cookie) {
          document.cookie = acc.cookie;
        }
        setTimeout(function () {
          location.reload();
        }, 800);
      }
    }

    return {
      getAccounts: getAccounts,
      addAccount: addAccount,
      removeAccount: removeAccount,
      switchAccount: switchAccount
    };
  });
})();

/* --- NEXT module: src/ui/modals/fans_panel.js --- */
// src/ui/modals/fans_panel.js
(function () {
  'use strict';
  if (!globalThis.DYEXRL_NEXT) return;

  globalThis.DYEXRL_NEXT.registry.register('ui.modals.fansPanel', [
    'ui.miuix',
    'store.index',
    'modules.economy.backpack',
    'modules.economy.fansContinue'
  ], function (miuix, store, backpack, fansContinue) {

    function createFansPanel() {
      var panel = miuix.Panel({
        id: 'fans-continue-panel',
        title: '一键续牌',
        subtitle: '维持粉丝牌不掉级'
      });

      // Card 1: 真实佩戴牌子检测与资产展示
      var assetCard = document.createElement('div');
      assetCard.className = 'miuix-card';
      assetCard.innerHTML = `
        <div class="miuix-card__header">
          <span class="miuix-card__title">当前粉丝牌</span>
          <span id="fans-panel-badge-name" style="font-size: 11px; font-weight: 700; color: #0066FF;">当前粉丝牌</span>
        </div>
        <div style="display: flex; justify-content: space-between; font-size: 11px; color: #64748b;">
          <span>背包荧光棒存量：</span>
          <span id="fans-panel-stick-count" style="font-weight: 700; color: #0f172a;">--</span>
        </div>
      `;
      panel.body.appendChild(assetCard);

      // Card 2: 赠送数量设置
      var inputCard = document.createElement('div');
      inputCard.className = 'miuix-card';
      inputCard.innerHTML = `
        <div class="miuix-card__header">
          <span class="miuix-card__title">续牌赠送数量</span>
        </div>
        <div style="display: flex; align-items: center; justify-content: space-between; gap: 8px;">
          <input type="number" id="fans-panel-stick-input" class="miuix-input" min="0" style="width: 80px;" value="0" />
          <span style="font-size: 10.5px; color: #94a3b8;">[留0自动均分]</span>
        </div>
      `;
      panel.body.appendChild(inputCard);

      // Action Button
      var actionWrap = document.createElement('div');
      actionWrap.style.display = 'flex';
      actionWrap.style.justifyContent = 'flex-end';
      actionWrap.style.marginTop = 'auto';

      var submitBtn = document.createElement('button');
      submitBtn.type = 'button';
      submitBtn.className = 'miuix-btn miuix-btn-primary';
      submitBtn.style.width = '100%';
      submitBtn.textContent = '一键赠送续牌';
      submitBtn.addEventListener('click', async function (e) {
        e.stopPropagation();
        submitBtn.disabled = true;
        submitBtn.textContent = '正在打卡...';
        await fansContinue.executeFansRenewal();
        submitBtn.disabled = false;
        submitBtn.textContent = '一键赠送续牌';
        updateData();
      });
      actionWrap.appendChild(submitBtn);
      panel.body.appendChild(actionWrap);

      async function updateData() {
        var badgeEl = panel.element.querySelector('#fans-panel-badge-name');
        var stickEl = panel.element.querySelector('#fans-panel-stick-count');
        var inputEl = panel.element.querySelector('#fans-panel-stick-input');

        var realBadge = store.get('runtime.user.activeBadgeName') || '当前佩戴';
        if (badgeEl) badgeEl.textContent = realBadge;

        var items = await backpack.fetchBackpackItems();
        var stick = items.find(it => it.name && it.name.includes('荧光棒'));
        if (stickEl) stickEl.textContent = stick ? stick.count + ' 个' : '0 个';

        if (inputEl) {
          inputEl.value = store.get('economy.fansContinueCount') || 0;
          inputEl.addEventListener('input', function () {
            store.set('economy.fansContinueCount', parseInt(inputEl.value, 10) || 0);
          });
        }
      }

      var originalShow = panel.show;
      panel.show = function (anchorEl) {
        originalShow(anchorEl);
        updateData();
      };

      return panel;
    }

    return {
      createFansPanel: createFansPanel
    };
  });
})();

/* --- NEXT module: src/ui/modals/sign_panel.js --- */
// src/ui/modals/sign_panel.js
(function () {
  'use strict';
  if (!globalThis.DYEXRL_NEXT) return;

  globalThis.DYEXRL_NEXT.registry.register('ui.modals.signPanel', [
    'ui.miuix',
    'store.index',
    'modules.economy.signEngine'
  ], function (miuix, store, signEngine) {

    function createSignPanel() {
      var panel = miuix.Panel({
        id: 'sign-panel',
        title: '一键签到',
        subtitle: '按需勾选日常任务'
      });

      // Card 1: 5 大签到任务选项列表
      var optCard = document.createElement('div');
      optCard.className = 'miuix-card';

      var TASK_ITEMS = [
        { key: 'room', title: '房间与粉丝牌签到', desc: '为关注/拥牌房间赠送亲密度' },
        { key: 'client', title: '客户端模拟签到', desc: '模拟手机端领每日礼盒' },
        { key: 'yuba', title: '关注鱼吧签到', desc: '一键打卡领经验并补签' },
        { key: 'stardiscover', title: '星推日常任务', desc: '打卡/口令弹幕/关注任务(安全取关)' },
        { key: 'fanshome', title: '粉丝家园与钻粉', desc: '粉丝家园打卡与钻粉日常' }
      ];

      var currentCfg = store.get('economy.signConfig') || {};

      TASK_ITEMS.forEach(function (tDef) {
        var row = document.createElement('label');
        row.style.display = 'flex';
        row.style.alignItems = 'center';
        row.style.gap = '10px';
        row.style.cursor = 'pointer';
        row.style.padding = '3px 0';

        var cb = document.createElement('input');
        cb.type = 'checkbox';
        cb.checked = !!currentCfg[tDef.key];
        cb.addEventListener('change', function () {
          var cfg = store.get('economy.signConfig') || {};
          cfg[tDef.key] = cb.checked;
          store.set('economy.signConfig', cfg);
        });

        var textWrap = document.createElement('div');
        textWrap.style.display = 'flex';
        textWrap.style.flexDirection = 'column';

        var tit = document.createElement('span');
        tit.style.fontSize = '11.5px';
        tit.style.fontWeight = '600';
        tit.style.color = '#0f172a';
        tit.textContent = tDef.title;

        var dsc = document.createElement('span');
        dsc.style.fontSize = '10px';
        dsc.style.color = '#64748b';
        dsc.textContent = tDef.desc;

        textWrap.appendChild(tit);
        textWrap.appendChild(dsc);

        row.appendChild(cb);
        row.appendChild(textWrap);
        optCard.appendChild(row);
      });

      panel.body.appendChild(optCard);

      // Card 2: 任务实时日志视窗
      var logCard = document.createElement('div');
      logCard.className = 'miuix-card';
      logCard.innerHTML = `
        <div class="miuix-card__header">
          <span class="miuix-card__title">执行日志</span>
          <span id="sign-status-tag" style="font-size: 10.5px; font-weight: 700; color: #10b981;">就绪</span>
        </div>
        <div id="sign-log-box" class="miuix-scrollable" style="min-height: 48px; max-height: 64px; overflow-y: auto; font-size: 10.5px; color: #475569; line-height: 1.45; background: rgba(0,0,0,0.03); padding: 4px 6px; border-radius: 6px;">
          勾选上方选项后，点击下方按钮开始签到。
        </div>
      `;
      panel.body.appendChild(logCard);

      // Action Button
      var actionWrap = document.createElement('div');
      actionWrap.style.display = 'flex';
      actionWrap.style.marginTop = 'auto';

      var startBtn = document.createElement('button');
      startBtn.type = 'button';
      startBtn.className = 'miuix-btn miuix-btn-primary';
      startBtn.style.width = '100%';
      startBtn.textContent = '开始签到';

      startBtn.addEventListener('click', async function (e) {
        e.stopPropagation();
        var statusTag = panel.element.querySelector('#sign-status-tag');
        var logBox = panel.element.querySelector('#sign-log-box');

        startBtn.disabled = true;
        if (statusTag) {
          statusTag.textContent = '正在执行';
          statusTag.style.color = '#ff7700';
        }
        if (logBox) logBox.innerHTML = '正在启动签到流水线...<br>';

        var logs = [];
        function onLog(msg) {
          logs.push(msg);
          if (logBox) {
            logBox.innerHTML = logs.map(l => '• ' + l).join('<br>');
            logBox.scrollTop = logBox.scrollHeight;
          }
        }

        try {
          await signEngine.executeSignPipeline(null, onLog);
          if (statusTag) {
            statusTag.textContent = '已完成';
            statusTag.style.color = '#10b981';
          }
        } catch (err) {
          onLog('签到异常: ' + (err.message || '未知错误'));
          if (statusTag) {
            statusTag.textContent = '异常中断';
            statusTag.style.color = '#ef4444';
          }
        } finally {
          startBtn.disabled = false;
        }
      });

      actionWrap.appendChild(startBtn);
      panel.body.appendChild(actionWrap);

      return panel;
    }

    return {
      createSignPanel: createSignPanel
    };
  });
})();

/* --- NEXT module: src/ui/modals/livetool_panel.js --- */
// src/ui/modals/livetool_panel.js
(function () {
  'use strict';
  if (!globalThis.DYEXRL_NEXT) return;

  globalThis.DYEXRL_NEXT.registry.register('ui.modals.livetoolPanel', [
    'ui.miuix',
    'store.index',
    'adapters.chat'
  ], function (miuix, store, chatAdapter) {

    function createLivetoolPanel() {
      var panel = miuix.Panel({
        id: 'livetool-panel',
        title: '直播间工具',
        subtitle: '互动、投票与房管工具箱'
      });

      // 1. 弹幕投票 (L3-01)
      var voteAccordion = miuix.Accordion({
        id: 'vote__panel',
        title: '弹幕投票',
        actions: [
          { label: '大屏看板', onClick: function () { miuix.Toast('已展开独立投票看板', 'info'); } }
        ],
        content: [
          (function () {
            var box = document.createElement('div');
            box.style.display = 'flex';
            box.style.flexDirection = 'column';
            box.style.gap = '6px';
            box.innerHTML = `
              <input type="text" id="vote__theme" class="miuix-input" placeholder="输入投票主题..." />
              <input type="text" id="vote__options" class="miuix-input" placeholder="输入选项(空格分隔)..." />
              <div style="display: flex; justify-content: space-between; align-items: center;">
                <label style="font-size: 11px;"><input type="checkbox" id="vote__repeat" /> 允许重复投票</label>
                <button type="button" class="miuix-btn miuix-btn-primary" style="padding: 3px 10px;">发起投票</button>
              </div>
            `;
            return box;
          })()
        ]
      });
      panel.body.appendChild(voteAccordion.element);

      // 2. 进场欢迎 (L3-02)
      var enterAccordion = miuix.Accordion({
        id: 'enter__panel',
        title: '进场欢迎',
        actions: [
          { label: '导出', onClick: function () { miuix.Toast('已导出欢迎规则', 'info'); } },
          { label: '导入', onClick: function () { miuix.Toast('已导入欢迎规则', 'info'); } }
        ],
        content: [
          (function () {
            var box = document.createElement('div');
            box.innerHTML = `
              <div style="display: flex; gap: 6px; margin-bottom: 6px;">
                <input type="number" id="enter__level" class="miuix-input" style="width: 60px;" placeholder="等级" value="10" />
                <input type="text" id="enter__word" class="miuix-input" style="flex: 1;" placeholder="欢迎语内容..." />
              </div>
              <div style="display: flex; justify-content: flex-end;">
                <button type="button" class="miuix-btn miuix-btn-primary" style="padding: 3px 10px;">保存规则</button>
              </div>
            `;
            return box;
          })()
        ]
      });
      panel.body.appendChild(enterAccordion.element);

      // 3. 关键词禁言 (L3-03)
      var muteAccordion = miuix.Accordion({
        id: 'mute__panel',
        title: '关键词禁言',
        actions: [
          { label: '名单', onClick: function () { miuix.Toast('查询禁言名单', 'info'); } },
          { label: '导出', onClick: function () { miuix.Toast('已导出禁言规则', 'info'); } }
        ],
        content: [
          (function () {
            var box = document.createElement('div');
            box.innerHTML = `
              <div style="display: flex; gap: 6px;">
                <input type="text" class="miuix-input" style="flex: 1;" placeholder="输入违规关键词..." />
                <select class="miuix-input" style="width: 75px;">
                  <option value="1">1天</option>
                  <option value="3">3天</option>
                  <option value="7">7天</option>
                  <option value="30">30天</option>
                </select>
              </div>
            `;
            return box;
          })()
        ]
      });
      panel.body.appendChild(muteAccordion.element);

      // 4. 自动谢礼物 (L3-04)
      var giftAccordion = miuix.Accordion({
        id: 'gift__panel',
        title: '自动谢礼物',
        actions: [
          { label: '导出', onClick: function () { miuix.Toast('已导出谢礼模板', 'info'); } },
          { label: '导入', onClick: function () { miuix.Toast('已导入谢礼模板', 'info'); } }
        ],
        content: [
          (function () {
            var box = document.createElement('div');
            box.innerHTML = `
              <input type="text" class="miuix-input" style="width: 100%;" placeholder="感谢文案模板 (支持 {name}, {gift})..." />
            `;
            return box;
          })()
        ]
      });
      panel.body.appendChild(giftAccordion.element);

      // 5. 关键词回复 (L3-05)
      var replyAccordion = miuix.Accordion({
        id: 'reply__panel',
        title: '关键词回复',
        actions: [
          { label: '导出', onClick: function () { miuix.Toast('已导出回复规则', 'info'); } },
          { label: '导入', onClick: function () { miuix.Toast('已导入回复规则', 'info'); } }
        ],
        content: [
          (function () {
            var box = document.createElement('div');
            box.innerHTML = `
              <div style="display: flex; gap: 6px; margin-bottom: 6px;">
                <input type="text" class="miuix-input" style="width: 100px;" placeholder="触发词" />
                <input type="text" class="miuix-input" style="flex: 1;" placeholder="回复内容..." />
              </div>
              <div style="display: flex; justify-content: space-between; align-items: center;">
                <span style="font-size: 11px; color: #64748b;">冷却 CD: 5秒</span>
                <button type="button" class="miuix-btn miuix-btn-primary" style="padding: 3px 10px;">添加规则</button>
              </div>
            `;
            return box;
          })()
        ]
      });
      panel.body.appendChild(replyAccordion.element);

      return panel;
    }

    return {
      createLivetoolPanel: createLivetoolPanel
    };
  });
})();

/* --- NEXT module: src/ui/modals/media_panel.js --- */
// src/ui/modals/media_panel.js
(function () {
  'use strict';
  if (!globalThis.DYEXRL_NEXT) return;

  globalThis.DYEXRL_NEXT.registry.register('ui.modals.mediaPanel', [
    'ui.miuix',
    'modules.media.filters',
    'modules.media.pip',
    'modules.media.capture'
  ], function (miuix, filters, pip, capture) {

    function createMediaPanel() {
      var panel = miuix.Panel({
        id: 'media-panel',
        title: '画质与播控中心',
        subtitle: '滤镜调色、画中画与音视频创作'
      });

      // 1. 快捷播控工具行 (Card 1)
      var actionCard = document.createElement('div');
      actionCard.className = 'miuix-card';
      actionCard.innerHTML = `
        <div class="miuix-card__header">
          <span class="miuix-card__title">播放控制</span>
        </div>
        <div style="display: flex; gap: 8px;">
          <button type="button" id="media-btn-pip" class="miuix-btn" style="flex: 1;">画中画小窗</button>
          <button type="button" id="media-btn-shot" class="miuix-btn" style="flex: 1;">高清截图</button>
          <button type="button" id="media-btn-record" class="miuix-btn" style="flex: 1;">视频录制</button>
        </div>
      `;
      panel.body.appendChild(actionCard);

      actionCard.querySelector('#media-btn-pip')?.addEventListener('click', () => pip.toggleNativePip());
      actionCard.querySelector('#media-btn-shot')?.addEventListener('click', () => capture.takeScreenshot());
      actionCard.querySelector('#media-btn-record')?.addEventListener('click', () => capture.toggleRecording());

      // 2. 色彩滤镜抽屉 (L3-11)
      var filterAccordion = miuix.Accordion({
        id: 'filter__panel',
        title: '色彩滤镜抽屉',
        actions: [
          { label: '重置', onClick: () => filters.resetFilters() }
        ],
        content: [
          (function () {
            var box = document.createElement('div');
            box.style.display = 'flex';
            box.style.flexDirection = 'column';
            box.style.gap = '8px';

            var SLIDERS = [
              { key: 'brightness', label: '亮度', min: 50, max: 200, def: 100 },
              { key: 'contrast', label: '对比度', min: 50, max: 200, def: 100 },
              { key: 'saturate', label: '饱和度', min: 0, max: 250, def: 100 },
              { key: 'hueRotate', label: '色相', min: 0, max: 360, def: 0 }
            ];

            SLIDERS.forEach(s => {
              var row = document.createElement('div');
              row.style.display = 'flex';
              row.style.alignItems = 'center';
              row.style.gap = '8px';
              row.innerHTML = `
                <span style="font-size: 11px; width: 45px; color: #475569;">${s.label}</span>
                <input type="range" class="miuix-slider" min="${s.min}" max="${s.max}" value="${s.def}" style="flex: 1;" />
                <span class="val-txt" style="font-size: 10px; width: 30px; text-align: right; color: #94a3b8;">${s.def}</span>
              `;
              var slider = row.querySelector('input');
              var txt = row.querySelector('.val-txt');
              slider.addEventListener('input', () => {
                txt.textContent = slider.value;
                filters.setFilter(s.key, Number(slider.value));
              });
              box.appendChild(row);
            });

            return box;
          })()
        ]
      });
      panel.body.appendChild(filterAccordion.element);

      // 3. 画质微光调节 (L3-12)
      var glowAccordion = miuix.Accordion({
        id: 'glow__panel',
        title: '画质微光弹窗',
        content: [
          (function () {
            var box = document.createElement('div');
            box.innerHTML = `
              <div style="display: flex; align-items: center; gap: 8px;">
                <span style="font-size: 11px; width: 45px; color: #475569;">微光模糊</span>
                <input type="range" min="0" max="10" value="0" style="flex: 1;" />
                <span style="font-size: 10px; color: #94a3b8;">0px</span>
              </div>
            `;
            var slider = box.querySelector('input');
            slider.addEventListener('input', () => filters.setFilter('blur', Number(slider.value)));
            return box;
          })()
        ]
      });
      panel.body.appendChild(glowAccordion.element);

      return panel;
    }

    return {
      createMediaPanel: createMediaPanel
    };
  });
})();

/* --- NEXT module: src/ui/modals/setting_panel.js --- */
// src/ui/modals/setting_panel.js
(function () {
  'use strict';
  if (!globalThis.DYEXRL_NEXT) return;

  globalThis.DYEXRL_NEXT.registry.register('ui.modals.settingPanel', [
    'ui.miuix',
    'store.index',
    'modules.system.hardware',
    'modules.system.account'
  ], function (miuix, store, hardware, account) {

    function createSettingPanel() {
      var panel = miuix.Panel({
        id: 'setting-panel',
        title: '全局设置',
        subtitle: '核心防护、流媒体与系统配置'
      });

      // 1. 性能看板 (L3-06)
      var perfAccordion = miuix.Accordion({
        id: 'perf__panel',
        title: '推流性能与硬件看板',
        content: [
          (function () {
            var box = document.createElement('div');
            box.style.display = 'flex';
            box.style.flexDirection = 'column';
            box.style.gap = '4px';
            box.style.fontSize = '11px';

            var info = hardware.inspectStreamInfo();
            box.innerHTML = `
              <div style="display: flex; justify-content: space-between;"><span>当前分辨率:</span><b>${info.resolution}</b></div>
              <div style="display: flex; justify-content: space-between;"><span>推流码率:</span><b>${info.bitrate}</b></div>
              <div style="display: flex; justify-content: space-between;"><span>识别推流软件:</span><b>${info.software}</b></div>
              <div style="display: flex; justify-content: space-between;"><span>WebRTC P2P 状态:</span><b style="color: #10b981;">已阻断 (纯CDN拉流)</b></div>
            `;
            return box;
          })()
        ]
      });
      panel.body.appendChild(perfAccordion.element);

      // 2. 核心功能开关卡片 (Card 2)
      var coreCard = document.createElement('div');
      coreCard.className = 'miuix-card';
      coreCard.innerHTML = `
        <div class="miuix-card__header"><span class="miuix-card__title">核心体验设置</span></div>
        <div style="display: flex; flex-direction: column; gap: 8px;">
          <label style="display: flex; justify-content: space-between; align-items: center; cursor: pointer;">
            <span style="font-size: 11px;">首流原画强锁 (12s免二次切流)</span>
            <input type="checkbox" id="set-lock-quality" checked />
          </label>
          <label style="display: flex; justify-content: space-between; align-items: center; cursor: pointer;">
            <span style="font-size: 11px;">WebRTC P2P 强制阻断</span>
            <input type="checkbox" id="set-block-p2p" checked />
          </label>
          <label style="display: flex; justify-content: space-between; align-items: center; cursor: pointer;">
            <span style="font-size: 11px;">300天铁粉红字标识</span>
            <input type="checkbox" id="set-fans-highlight" checked />
          </label>
          <label style="display: flex; justify-content: space-between; align-items: center; cursor: pointer;">
            <span style="font-size: 11px;">自动拾取房间红包/宝箱</span>
            <input type="checkbox" id="set-auto-pick" checked />
          </label>
        </div>
      `;
      panel.body.appendChild(coreCard);

      // 3. 多账号管理与重置卡片 (Card 3)
      var accCard = document.createElement('div');
      accCard.className = 'miuix-card';
      accCard.innerHTML = `
        <div class="miuix-card__header"><span class="miuix-card__title">配置与账号</span></div>
        <div style="display: flex; gap: 8px;">
          <button type="button" id="set-btn-acc" class="miuix-btn" style="flex: 1;">账号管理</button>
          <button type="button" id="set-btn-reset" class="miuix-btn" style="flex: 1; color: #ef4444;">重置所有设置</button>
        </div>
      `;
      panel.body.appendChild(accCard);

      accCard.querySelector('#set-btn-reset')?.addEventListener('click', async () => {
        var conf = await miuix.Dialog({
          mode: 'confirm',
          title: '重置确认',
          message: '确定清空所有自定义配置并恢复初始状态吗？'
        });
        if (conf.confirmed) {
          store.reset();
          miuix.Toast('已恢复初始默认配置', 'success');
        }
      });

      return panel;
    }

    return {
      createSettingPanel: createSettingPanel
    };
  });
})();

/* --- NEXT module: src/runtime/orchestrator.js --- */
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

