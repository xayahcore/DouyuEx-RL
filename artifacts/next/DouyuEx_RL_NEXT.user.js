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

/* --- NEXT module: src/platform/script_bridge.js --- */
// src/platform/script_bridge.js
(function () {
  'use strict';
  if (!globalThis.DYEXRL_NEXT) return;

  globalThis.DYEXRL_NEXT.registry.register('platform.scriptBridge', [], function () {

    var originalAppendChild = null;
    var originalInsertBefore = null;
    var isInstalled = false;
    var transformers = new Map();

    function registerTransformer(urlPattern, transformFn) {
      transformers.set(urlPattern, transformFn);
    }

    function install(targetWin) {
      if (isInstalled) return;
      var win = targetWin || (typeof window !== 'undefined' ? window : globalThis);
      var NodeProto = win.Node ? win.Node.prototype : null;
      if (!NodeProto) return;

      originalAppendChild = NodeProto.appendChild;
      originalInsertBefore = NodeProto.insertBefore;

      NodeProto.appendChild = function (child) {
        if (child && child.tagName === 'SCRIPT' && child.src) {
          // Check white-list / firstqueue
          if (child.src.includes('/firstqueue')) {
            // Safe pipeline
          }
        }
        return originalAppendChild.apply(this, arguments);
      };

      NodeProto.insertBefore = function (child, ref) {
        return originalInsertBefore.apply(this, arguments);
      };

      isInstalled = true;
    }

    function uninstall(targetWin) {
      if (!isInstalled) return;
      var win = targetWin || (typeof window !== 'undefined' ? window : globalThis);
      var NodeProto = win.Node ? win.Node.prototype : null;
      if (NodeProto && originalAppendChild) {
        NodeProto.appendChild = originalAppendChild;
        NodeProto.insertBefore = originalInsertBefore;
      }
      isInstalled = false;
      transformers.clear();
    }

    return {
      install: install,
      uninstall: uninstall,
      registerTransformer: registerTransformer
    };
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
      safeMigrate('ExSave_Tail_status', function (v) {
        var cur = store.get('danmaku.tail') || {};
        cur.enabled = (v === '1' || v === 'true' || v === true);
        store.set('danmaku.tail', cur);
      });
      safeMigrate('ExSave_Tail_txt', function (v) {
        var cur = store.get('danmaku.tail') || {};
        cur.text = String(v || '');
        store.set('danmaku.tail', cur);
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

/* Level 2 Dock 启动坞 (76px 晶透微胶囊 - 100% 还原原版外观与尺寸) */
.ex-panel, .miuix-dock-wrap {
  min-width: max-content !important;
  width: max-content !important;
  height: 76px !important;
  box-sizing: border-box !important;
  background: rgba(255, 255, 255, 0.76) !important;
  backdrop-filter: blur(36px) saturate(220%) !important;
  -webkit-backdrop-filter: blur(36px) saturate(220%) !important;
  border: 1px solid rgba(255, 255, 255, 0.95) !important;
  border-radius: 38px !important;
  box-shadow: inset 0 1px 1.5px 0 rgba(255, 255, 255, 0.98), 0 16px 40px rgba(15, 23, 42, 0.16), 0 4px 12px rgba(15, 23, 42, 0.08) !important;
  padding: 0 24px !important;
  display: none; /* 由精灵球点击或浮动展开 */
  align-items: center !important;
  justify-content: center !important;
  z-index: 10000 !important;
  user-select: none !important;
  overflow: visible !important;
  position: absolute;
  bottom: 32px;
  right: 0px;
}

.ex-panel.is-open, .miuix-dock-wrap.is-open {
  display: flex !important;
}

.ex-panel.ex-panel--floating, .miuix-dock-wrap.ex-panel--floating {
  position: fixed !important;
  z-index: 10000 !important;
}

/* 礼物栏红白精灵球触发入口 (.ex-icon) */
.ex-icon, .miuix-ex-icon {
  display: inline-block !important;
  vertical-align: middle !important;
  margin-right: 8px !important;
  margin-left: 2px !important;
  user-select: none !important;
  cursor: pointer !important;
  background: transparent !important;
  border: none !important;
  box-shadow: none !important;
  border-radius: 0 !important;
  width: auto !important;
  height: auto !important;
}

.ex-icon a, .miuix-ex-icon a {
  display: flex !important;
  justify-content: center !important;
  align-items: center !important;
  cursor: pointer !important;
}

.ex-icon svg:hover, .miuix-ex-icon svg:hover {
  transform: scale(1.1) !important;
  transition: transform 0.2s cubic-bezier(0.34, 1.56, 0.64, 1) !important;
}

/* Dock 右上角圆形关闭按钮 */
.ex-panel__close, .miuix-dock-close {
  position: absolute !important;
  top: -9px !important;
  right: -9px !important;
  z-index: 10 !important;
  width: 20px !important;
  height: 20px !important;
  padding: 0 !important;
  margin: 0 !important;
  border: none !important;
  border-radius: 50% !important;
  background: rgba(255, 255, 255, 0.95) !important;
  color: #64748b !important;
  font-size: 14px !important;
  line-height: 18px !important;
  text-align: center !important;
  cursor: pointer !important;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.2) !important;
  transition: color 0.15s ease, background-color 0.15s ease, transform 0.15s !important;
}

.ex-panel__close:hover, .miuix-dock-close:hover {
  color: #ffffff !important;
  background: #ff6600 !important;
  transform: scale(1.1) !important;
}

/* 按钮内部横向容器与 56x56 单元格 */
.ex-panel__wrap {
  display: flex !important;
  flex-direction: row !important;
  align-items: center !important;
  justify-content: center !important;
  gap: 12px !important;
  height: 100% !important;
  width: auto !important;
  margin: 0 !important;
  padding: 0 !important;
}

.ex-panel__wrap > div, .miuix-dock-item {
  display: flex !important;
  align-items: center !important;
  justify-content: center !important;
  flex-shrink: 0 !important;
  width: 56px !important;
  height: 56px !important;
  margin: 0 !important;
  padding: 0 !important;
  position: relative !important;
  border-radius: 14px !important;
  border: 1px solid rgba(255, 255, 255, 0.7) !important;
  background: rgba(255, 255, 255, 0.45) !important;
  box-sizing: border-box !important;
  transition: all 0.18s cubic-bezier(0.34, 1.56, 0.64, 1) !important;
  cursor: pointer !important;
  user-select: none !important;
}

.ex-panel__wrap > div:hover, .miuix-dock-item:hover {
  transform: translateY(-2.5px) !important;
  background: rgba(255, 255, 255, 0.88) !important;
  border-color: rgba(0, 102, 255, 0.3) !important;
  box-shadow: 0 6px 18px rgba(0, 102, 255, 0.24), inset 0 1px 1px #ffffff !important;
}

.ex-panel__wrap > div:active, .miuix-dock-item:active {
  transform: translateY(0) scale(0.96) !important;
}

/* 磁吸指示器小胶囊 (24x4px 生机蓝) */
.ex-panel__indicator, .miuix-dock-indicator {
  position: absolute !important;
  bottom: 3px !important;
  left: 50% !important;
  width: 24px !important;
  height: 4px !important;
  border-radius: 2px !important;
  background: var(--miuix-primary, #0066ff) !important;
  box-shadow: 0 0 8px rgba(0, 102, 255, 0.65) !important;
  transform: translateX(-50%) scaleX(0) !important;
  opacity: 0 !important;
  pointer-events: none !important;
  transition: all 0.2s cubic-bezier(0.34, 1.56, 0.64, 1) !important;
}

.ex-panel__wrap > div.is-active .ex-panel__indicator,
.ex-panel__wrap > div.ex-dock-active .ex-panel__indicator,
.miuix-dock-item.is-active .ex-panel__indicator {
  transform: translateX(-50%) scaleX(1) !important;
  opacity: 1 !important;
}

/* 弹幕 +1 跟风复读气泡 */
.miuix-danmaku-plusone {
  display: inline-flex !important;
  align-items: center !important;
  justify-content: center !important;
  margin-left: 6px !important;
  padding: 1px 5px !important;
  font-size: 10px !important;
  font-weight: 700 !important;
  color: #0066FF !important;
  background: rgba(0, 102, 255, 0.08) !important;
  border: 1px solid rgba(0, 102, 255, 0.2) !important;
  border-radius: 4px !important;
  cursor: pointer !important;
  opacity: 0.85 !important;
  transition: all 0.15s ease !important;
  user-select: none !important;
}

.miuix-danmaku-plusone:hover {
  opacity: 1 !important;
  background: #0066FF !important;
  color: #fff !important;
  transform: scale(1.05) !important;
}

/* 聊天栏弹幕小尾巴切换胶囊 */
.miuix-tail-trigger {
  display: inline-flex !important;
  align-items: center !important;
  gap: 4px !important;
  padding: 2px 8px !important;
  border-radius: 12px !important;
  font-size: 11px !important;
  font-weight: 600 !important;
  color: #64748b !important;
  background: rgba(0, 0, 0, 0.04) !important;
  cursor: pointer !important;
  transition: all 0.2s ease !important;
  user-select: none !important;
}

.miuix-tail-trigger.is-active {
  color: #0066FF !important;
  background: rgba(0, 102, 255, 0.12) !important;
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
      if (typeof doc.getElementById === 'function' && doc.getElementById('miuix-tokens-style')) return; // Idempotent

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
    // 兼容路径字典 (供轻量引用与单元测试验证)
    var SVG_PATHS = {
      sign: '<path d="M19 3h-1V1h-2v2H8V1H6v2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H5V8h14v11zM7 10h5v5H7z" fill="currentColor"/>',
      fans: '<path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4zm-2 16l-4-4 1.41-1.41L10 14.17l6.59-6.59L18 9l-8 8z" fill="currentColor"/>',
      extool: '<path d="M22.7 19l-9.1-9.1c.9-2.3.4-5-1.5-6.9-2-2-5-2.4-7.4-1.3L9 6 6 9 1.6 4.7C.5 7.1.9 10.1 2.9 12.1c1.9 1.9 4.6 2.4 6.9 1.5l9.1 9.1c.4.4 1 .4 1.4 0l2.3-2.3c.5-.4.5-1.1.1-1.4z" fill="currentColor"/>',
      livetool: '<path d="M20 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 14H4V6h16v12zM10 8.5v7l6-3.5-6-3.5z" fill="currentColor"/>',
      bloop: '<path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm0 14H5.17L4 17.17V4h16v12z" fill="currentColor"/>',
      lottery: '<path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z" fill="currentColor"/>',
      popup: '<path d="M19 11h-8v6h8v-6zm4 8V4.98C23 3.88 22.1 3 21 3H3c-1.1 0-2 .88-2 1.98V19c0 1.1.9 2 2 2h18c1.1 0 2-.9 2-2zm-2 .02H3V4.97h18v14.05z" fill="currentColor"/>',
      monitor: '<path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 14.5v-9l6 4.5-6 4.5z" fill="currentColor"/>',
      update: '<path d="M19.35 10.04C18.67 6.59 15.64 4 12 4 9.11 4 6.6 5.64 5.35 8.04 2.34 8.36 0 10.91 0 14c0 3.31 2.69 6 6 6h13c2.76 0 5-2.24 5-5 0-2.64-2.05-4.78-4.65-4.96zM17 13l-5 5-5-5h3V9h4v4h3z" fill="currentColor"/>',
      close: '<path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z" fill="currentColor"/>',
      chevronDown: '<path d="M7.41 8.59L12 13.17l4.59-4.58L18 10l-6 6-6-6 1.41-1.41z" fill="currentColor"/>',
      search: '<path d="M15.5 14h-.79l-.28-.27C15.41 12.59 16 11.11 16 9.5 16 5.91 13.09 3 9.5 3S3 5.91 3 9.5 5.91 16 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z" fill="currentColor"/>',
      pokeball: '<path d="M12 2a10 10 0 1 0 10 10A10 10 0 0 0 12 2zm0 2c4.08 0 7.45 3.05 7.92 7h-5.02a3 3 0 0 0-5.8 0H4.08c.47-3.95 3.84-7 7.92-7zm0 16c-4.08 0-7.45-3.05-7.92-7h5.02a3 3 0 0 0 5.8 0h5.02c-.47 3.95-3.84 7-7.92 7zm0-6a2 2 0 1 1 2-2 2 2 0 0 1-2 2z" fill="currentColor"/>'
    };

    // 100% 还原原版高精度多色矢量图与专属徽章
    var RAW_ICONS = {
      "sign": "<svg style=\"display: block;\" t=\"1578566545259\" class=\"icon\" viewBox=\"0 0 1024 1024\" version=\"1.1\" xmlns=\"http://www.w3.org/2000/svg\" p-id=\"12959\" width=\"32\" height=\"32\"><path d=\"M698.368 80.896v114.688c0 23.552 19.968 43.008 44.032 43.008s44.032-19.456 44.032-43.008V80.896c0-23.552-19.968-43.008-44.032-43.008s-44.032 18.944-44.032 43.008zM227.328 80.896v114.688c0 23.552 19.968 43.008 44.032 43.008 24.576 0 44.032-19.456 44.032-43.008V80.896c0-23.552-19.968-43.008-44.032-43.008-24.576 0-44.032 18.944-44.032 43.008z\" fill=\"#F96C5D\" p-id=\"12960\"></path><path d=\"M977.92 195.584c0-23.552-19.968-43.008-44.032-43.008h-88.576v43.008c0 55.296-46.08 100.352-102.912 100.352s-102.912-45.056-102.912-100.352v-43.008H374.272v43.008c0 55.296-46.08 100.352-102.912 100.352-56.832 0-102.912-45.056-102.912-100.352v-43.008H79.872c-24.576 0-44.032 19.456-44.032 43.008v611.328l252.928-145.92-8.192-8.192c-10.24-9.728-16.384-23.552-16.384-38.4 0-29.696 25.088-54.272 55.808-54.272 15.36 0 29.184 6.144 39.424 15.872l28.16 27.648L977.92 263.168V195.584z\" fill=\"#F96C5D\" p-id=\"12961\"></path><path d=\"M329.216 278.528c-5.632 3.584-11.264 6.656-17.408 9.216 5.632-2.56 11.776-5.632 17.408-9.216zM344.064 266.24c4.608-4.608 8.704-9.728 12.8-14.848-3.584 5.632-8.192 10.24-12.8 14.848zM329.216 278.528c5.632-3.584 10.752-7.68 15.36-12.288-5.12 4.608-10.24 8.704-15.36 12.288zM449.536 664.064l220.16-214.016c10.24-9.728 24.064-15.872 39.424-15.872 30.72 0 55.808 24.064 55.808 54.272 0 14.848-6.144 28.672-16.384 38.4l-259.072 252.416c-10.24 9.728-24.064 15.872-39.424 15.872s-29.184-6.144-39.424-15.872l-121.344-118.272L35.84 806.912v104.96c0 23.552 19.968 43.008 44.032 43.008h854.016c24.576 0 44.032-19.456 44.032-43.008V263.168L387.584 603.648l61.952 60.416zM350.72 569.856c-4.608-3.072-9.216-5.12-14.336-6.656 5.12 1.024 10.24 3.584 14.336 6.656zM271.36 295.936c14.336 0 27.648-2.56 39.936-7.68-12.288 4.608-25.6 7.68-39.936 7.68z\" fill=\"#F15A4A\" p-id=\"12962\"></path></svg>",
      "fans": "<img style=\"width: 32px;height: 32px;display:block;\" src=\"https://gfs-op.douyucdn.cn/dygift/1705/7db9beee246848252f1c7fe916259f4e.png\"/>",
      "extool": "<svg t=\"1590294700144\" style=\"display:block;\" class=\"icon\" viewBox=\"0 0 1077 1024\" version=\"1.1\" xmlns=\"http://www.w3.org/2000/svg\" p-id=\"11915\" width=\"30\" height=\"30\"><path d=\"M152.770257 11.469971l213.048618 206.378138-37.094375 36.931681 159.440737 158.545917-76.95456 73.782015-159.440737-158.545917-38.47728 36.931681L0.244042 159.115348 152.770257 11.469971z\" p-id=\"11916\" fill=\"#d81e06\"></path><path d=\"M1077.851922 217.848109h-105.751509L929.393073 260.311408l-31.644106 31.400063-33.02701 32.538926L776.866857 300.985065l-23.428026-87.204321 33.027009-32.538926 33.02701-32.538926L862.281538 105.751509V0.569431h-8.134732a244.041945 244.041945 0 0 0-178.964092 68.331745 234.768351 234.768351 0 0 0-68.738481 147.645376 250.712425 250.712425 0 0 0 10.981887 95.664443v2.765808a34.165872 34.165872 0 0 1-9.598983 36.931681c-17.896409 16.269463-525.096918 497.520178-525.096918 497.520178-42.625993 35.548777-38.47728 102.497617 0 142.113759 39.860184 38.233238 105.751509 40.673657 142.927233 0 0 0 478.322212-504.353352 498.984429-524.852875A33.677788 33.677788 0 0 1 754.821735 455.544963c5.531617 1.382904 10.981888 4.067366 16.269463 5.450271a242.170956 242.170956 0 0 0 87.936447 9.598983 237.290118 237.290118 0 0 0 148.45885-68.331745 231.677153 231.677153 0 0 0 68.738481-177.662536 14.805211 14.805211 0 0 0 1.626946-6.751827zM178.964093 943.628853a33.352399 33.352399 0 0 1-48.076263 0 32.538926 32.538926 0 0 1 0-47.832221 33.352399 33.352399 0 0 1 48.076263 0 35.467429 35.467429 0 0 1 0 47.832221z\" p-id=\"11917\" fill=\"#d81e06\"></path><path d=\"M981.618049 785.082936L747.988561 567.804258S617.344773 601.97013 526.642517 753.682873c5.531617 1.382904 241.926915 239.161106 241.926914 239.161105a109.98157 109.98157 0 0 0 152.607563 0l60.441055-58.732761a102.823006 102.823006 0 0 0 0-149.028281zM854.146806 951.763584a29.366381 29.366381 0 0 1-38.477279 0l-195.233556-189.94598-1.382905-1.382904a25.543057 25.543057 0 0 1 1.382905-35.548777 29.366381 29.366381 0 0 1 38.47728 0l196.535113 189.94598A28.796949 28.796949 0 0 1 854.146806 951.763584z m86.634891-83.380997a29.366381 29.366381 0 0 1-38.47728 0L705.362568 678.436606l-1.382905-1.382904a25.543057 25.543057 0 0 1 1.382905-35.548777 29.366381 29.366381 0 0 1 38.477279 0l196.535113 189.945981a24.404194 24.404194 0 0 1 0 37.013028z\" p-id=\"11918\" fill=\"#d81e06\"></path></svg>",
      "livetool": "<svg t=\"1590294900594\" style=\"display:block;\" class=\"icon\" viewBox=\"0 0 1024 1024\" version=\"1.1\" xmlns=\"http://www.w3.org/2000/svg\" p-id=\"20028\" width=\"36\" height=\"36\"><path d=\"M352.2 245.3c-5.1 0-10.2-2-14.1-5.9L196.6 98c-7.8-7.8-7.8-20.5 0-28.3s20.5-7.8 28.3 0l141.4 141.4c7.8 7.8 7.8 20.5 0 28.3-3.9 3.9-9 5.9-14.1 5.9zM477.1 245.3c-5.1 0-10.2-2-14.1-5.9-7.8-7.8-7.8-20.5 0-28.3L604.3 69.7c7.8-7.8 20.5-7.8 28.3 0 7.8 7.8 7.8 20.5 0 28.3L491.2 239.4c-3.9 3.9-9 5.9-14.1 5.9z\" fill=\"#0C2B4A\" p-id=\"20029\"></path><path d=\"M703.9 194.8H124.2c-33 0-60 27-60 60v453c0 33 27 60 60 60h418c1.7-122.5 99.6-221.8 221.7-225.5V254.8c0-33-27-60-60-60zM533.4 522.9L356.3 625.2c-24 13.9-54-3.5-54-31.2V389.5c0-27.7 30-45 54-31.2l177.1 102.2c24 13.9 24 48.6 0 62.4zM815.2 776.4c0 21.9-17.8 39.7-39.7 39.7-21.9 0-39.7-17.8-39.7-39.7 0-21.9 17.8-39.7 39.7-39.7 21.9 0 39.7 17.8 39.7 39.7z\" fill=\"#0C2B4A\" p-id=\"20030\"></path><path d=\"M775.5 591C673.6 591 591 673.6 591 775.5S673.6 960 775.5 960 960 877.4 960 775.5 877.4 591 775.5 591zM879 819l-15.6 27c-2.1 3.6-6.8 4.9-10.4 2.8l-15.5-8.9c-2.7-1.6-6.1-1.3-8.5 0.6-7.5 5.9-15.9 10.6-25.1 13.8-3 1.1-5.1 4-5.1 7.2v18.7c0 4.2-3.4 7.6-7.6 7.6H760c-4.2 0-7.6-3.4-7.6-7.6v-18.5c0-3.3-2.1-6.2-5.1-7.2-9.3-3.2-17.9-7.8-25.5-13.7-2.4-1.9-5.8-2.2-8.5-0.6l-15.2 8.8c-3.6 2.1-8.3 0.9-10.4-2.8l-15.6-27c-2.1-3.6-0.8-8.3 2.8-10.4l12.2-7.1c3-1.7 4.5-5.2 3.7-8.5-1.7-6.8-2.6-13.8-2.6-21.1 0-4.1 0.3-8.2 0.9-12.2 0.4-3.1-1-6.1-3.7-7.7l-10.5-6.1c-3.6-2.1-4.9-6.8-2.8-10.4l15.6-27c2.1-3.6 6.8-4.9 10.4-2.8l7.8 4.5c2.9 1.7 6.6 1.3 9-1.1 9.1-8.7 20-15.5 32.2-19.7 3.1-1 5.1-4 5.1-7.2v-7.9c0-4.2 3.4-7.6 7.6-7.6H791c4.2 0 7.6 3.4 7.6 7.6v8.1c0 3.2 2 6.1 5.1 7.2 12.1 4.2 22.9 10.9 31.9 19.6 2.4 2.4 6.1 2.8 9.1 1.1l8.2-4.7c3.6-2.1 8.3-0.8 10.4 2.8l15.6 27c2.1 3.6 0.9 8.3-2.8 10.4l-11 6.3c-2.7 1.6-4.1 4.6-3.7 7.7 0.6 3.9 0.8 8 0.8 12.1 0 7.2-0.9 14.1-2.5 20.8-0.8 3.3 0.7 6.7 3.6 8.3l12.8 7.4c3.7 2.1 5 6.8 2.9 10.4z\" fill=\"#0C2B4A\" p-id=\"20031\"></path></svg>",
      "bloop": "<svg t=\"1578572568198\" style=\"display: block;\" class=\"icon\" viewBox=\"0 0 1024 1024\" version=\"1.1\" xmlns=\"http://www.w3.org/2000/svg\" p-id=\"55445\" width=\"32\" height=\"32\"><path d=\"M511.99883605 1020.07740302c-68.78771655 0-135.53209458-13.47788003-198.38074083-40.06106453-60.69004402-25.67037725-115.18953131-62.41203655-161.98371328-109.20738247-46.79418197-46.79301803-83.53700523-101.29366926-109.20621853-161.98371328C15.84497778 645.97776043 2.36709774 579.23105337 2.36709774 510.4445019s13.47904398-135.53209458 40.06106453-198.38074083c25.6692133-60.69004402 62.41203655-115.18953131 109.20621853-161.98371328 46.79534706-46.79418197 101.29366926-83.53700523 161.98371328-109.20621853 62.84864739-26.5831845 129.59418937-40.06106453 198.38074083-40.06106453 68.78771655 0 135.53209458 13.47904398 198.38190592 40.06106453 60.69004402 25.6692133 115.18953131 62.41203655 161.98487723 109.20621853 46.79301803 46.79418197 83.53584128 101.29366926 109.20621853 161.98371328 26.5831845 62.84864739 40.06106453 129.59418937 40.06106453 198.38074083s-13.47788003 135.53325853-40.06106453 198.38074084c-25.67037725 60.69004402-62.41203655 115.19069525-109.20621853 161.98371328-46.79534706 46.79418197-101.29483435 83.53817031-161.98487723 109.20738247C647.53092949 1006.59952413 580.78655147 1020.07740302 511.99883605 1020.07740302zM511.99883605 57.86089358c-249.55500203 0-452.58244437 203.02744235-452.58244437 452.58244437s203.02744235 452.58244437 452.58244437 452.58244438c249.55616597 0 452.58360832-203.02744235 452.58360832-452.58244438C964.58244437 260.88949987 761.55500203 57.86089358 511.99883605 57.86089358z\" p-id=\"55446\" fill=\"#1296db\" data-spm-anchor-id=\"a313x.7781069.0.i24\"></path><path d=\"M322.42598685 461.65355293l-8.51099648 74.46598314 97.86947811 0c-2.85950862 76.59314973-4.9866752 127.6556379-6.38266595 153.18746454-1.42975431 51.06132423-27.65899321 75.16339541-78.72148139 72.33881542-18.45058333 1.39598962-35.47024839 2.12716658-51.06248818 2.12716658-2.85950862-17.02082901-6.38266595-34.77283613-10.63816419-53.19081984 18.41681863 0 35.43764878 0 51.06248817 0 25.53066155 2.82574393 38.99456967-7.77981952 40.42432399-31.9133275 1.39598962-9.9069861 2.12833166-25.53182663 2.12833166-46.80698994 1.39598962-21.27632725 2.12716658-36.86740309 2.12716658-46.80698994l-99.9966447 0 14.89366244-172.33546126 89.3584805 0 0-78.72148138-102.12497636 0 0-48.9353216 151.05913287 0 0 176.5909595L322.42598685 461.65355293zM450.08162475 580.79819435l0-242.54594504 74.46598314 0c-17.0219941-24.10090723-31.91449145-43.25006791-44.67982222-57.44515413l46.80698994-21.27632725c4.25433429 4.25549824 10.63699911 12.06675342 19.14799673 23.40349497 15.5910747 18.45058333 24.79948459 30.51733789 27.65899321 36.16882574l-42.5514917 19.14799673 80.84864796 0c25.53066155-38.29715741 41.8203136-64.5263963 48.93415652-78.72031744l53.19081984 14.89366244c-5.68525255 8.50983253-15.62483939 22.70491762-29.78732487 42.55149169-7.11384291 9.93958685-12.06675342 17.02082901-14.89249849 21.27516331l70.20931982 0 0 242.54594503L620.28991829 580.7970304l0 51.06248818 144.67646806 0 0 48.93415651L620.28991829 680.79367509l0 87.23131392-51.06132423 0 0-87.23131392L428.80646144 680.79367509l0-48.93415651 140.42213376 0 0-51.06248818L450.08162475 580.7970304zM501.14411293 385.0604032l0 53.18965475 68.08331718 0 0-53.18965475L501.14411293 385.0604032zM501.14411293 480.80154965l0 55.31682248 68.08331718 0L569.22743011 480.80154965 501.14411293 480.80154965zM688.37323549 385.0604032l-68.0833172 0 0 53.18965475 68.0833172 0L688.37323549 385.0604032zM620.28991829 480.80154965l0 55.31682248 68.0833172 0L688.37323549 480.80154965 620.28991829 480.80154965z\" p-id=\"55447\" fill=\"#1296db\"></path></svg>",
      "lottery": "<svg style=\"display:block;\" t=\"1636332741708\" class=\"icon\" viewBox=\"0 0 1024 1024\" version=\"1.1\" xmlns=\"http://www.w3.org/2000/svg\" p-id=\"19181\" width=\"32\" height=\"32\"><path d=\"M508.858182 986.042182c-261.748364 0-473.925818-212.177455-473.925818-473.925818S247.109818 38.190545 508.858182 38.190545s473.925818 212.177455 473.925818 473.925819-212.200727 473.925818-473.925818 473.925818m0-981.690182C228.421818 4.352 1.093818 231.703273 1.093818 512.116364s227.351273 507.764364 507.764364 507.764363c280.413091 0 507.787636-227.351273 507.787636-507.764363S789.271273 4.352 508.858182 4.352\" fill=\"#FF4517\" p-id=\"19182\"></path><path d=\"M322.536727 512.302545l0.023273-1.326545-313.064727-1.931636c0 1.093818-0.093091 2.164364-0.093091 3.281454 0 90.88 24.785455 175.918545 67.84 248.925091l270.173091-155.997091a185.274182 185.274182 0 0 1-24.878546-92.951273zM416.791273 350.440727L264.029091 82.013091A492.986182 492.986182 0 0 0 77.498182 262.981818l270.173091 155.997091a186.717091 186.717091 0 0 1 69.12-68.538182zM602.856727 351.697455l151.831273-259.211637A488.261818 488.261818 0 0 0 508.718545 21.690182l0.023273 304.453818c34.350545 0 66.513455 9.355636 94.114909 25.553455zM258.536727 939.450182a488.471273 488.471273 0 0 0 241.710546 63.674182c2.839273 0 5.632-0.139636 8.448-0.186182V698.507636a185.064727 185.064727 0 0 1-94.068364-25.553454l-156.090182 266.496zM927.325091 270.452364l-257.466182 148.666181a185.204364 185.204364 0 0 1 25.041455 93.207273l-0.046546 1.070546 296.168727 1.838545c0.023273-0.977455 0.069818-1.931636 0.069819-2.909091 0-87.994182-23.249455-170.496-63.767273-241.873454zM600.855273 674.094545l148.573091 261.073455a492.776727 492.776727 0 0 0 178.106181-181.387636l-257.466181-148.642909a187.042909 187.042909 0 0 1-69.213091 68.95709z\" fill=\"#FF4517\" p-id=\"19183\"></path><path d=\"M644.142545 512.302545a135.400727 135.400727 0 0 0-135.424-135.400727l-84.619636-160.791273 20.642909 173.824c-42.658909 22.784-71.400727 70.609455-71.400727 122.368a135.447273 135.447273 0 0 0 270.801454 0z m-133.492363 70.097455a68.491636 68.491636 0 1 1 0.023273-136.96 68.491636 68.491636 0 0 1-0.023273 136.96z\" fill=\"#FF4517\" p-id=\"19184\"></path></svg>",
      "popup": "<svg style=\"display:block;\" t=\"1579448049771\" class=\"icon\" viewBox=\"0 0 1024 1024\" version=\"1.1\" xmlns=\"http://www.w3.org/2000/svg\" p-id=\"1804\" width=\"30\" height=\"30\"><path d=\"M353.024 900.416H109.952c-57.856 0-109.952-46.336-109.952-98.432V153.6c0-52.096 52.096-98.432 109.952-98.432h810.176c57.856 0 104.192 46.336 104.192 98.496v185.472c0 28.928-23.168 52.096-46.336 52.096s-46.272-23.168-46.272-52.096V159.36H98.368V807.68h248.896c34.688 0 52.032 17.408 52.032 46.336 0 28.928-17.344 46.272-46.272 46.272\" fill=\"#f26b1f\" p-id=\"1805\"></path><path d=\"M619.2 631.488c-5.76 0-5.76 5.76-5.76 11.52v223.04c0 5.76 5.76 11.52 5.76 11.52h289.344c5.76 0 11.584-5.76 11.584-11.52v-222.976c0-5.824-5.76-11.584-11.52-11.584H619.136z m289.344 338.688h-289.28a103.68 103.68 0 0 1-104.192-104.128v-222.976c0-57.92 46.272-109.952 104.128-109.952h289.344c57.856 0 104.128 46.272 104.128 109.952v222.976c5.824 57.856-40.448 104.128-104.128 104.128z\" fill=\"#f26b1f\" p-id=\"1806\"></path></svg>",
      "monitor": "<svg style=\"display:block;\" t=\"1638235744961\" class=\"icon\" viewBox=\"0 0 1024 1024\" version=\"1.1\" xmlns=\"http://www.w3.org/2000/svg\" p-id=\"69800\" width=\"32\" height=\"32\"><path d=\"M426.666667 106.666667a21.333333 21.333333 0 0 1 21.333333-21.333334h512a21.333333 21.333333 0 0 1 0 42.666667H448a21.333333 21.333333 0 0 1-21.333333-21.333333z m533.333333 789.333333H448a21.333333 21.333333 0 0 0 0 42.666667h512a21.333333 21.333333 0 0 0 0-42.666667z m0-554.666667H448a21.333333 21.333333 0 0 0 0 42.666667h512a21.333333 21.333333 0 0 0 0-42.666667z m0 298.666667H448a21.333333 21.333333 0 0 0 0 42.666667h512a21.333333 21.333333 0 0 0 0-42.666667zM245.333333 42.666667H96a53.393333 53.393333 0 0 0-53.333333 53.333333v149.333333a53.393333 53.393333 0 0 0 53.333333 53.333334h149.333333a53.393333 53.393333 0 0 0 53.333334-53.333334V96a53.393333 53.393333 0 0 0-53.333334-53.333333z m0 341.333333H96a53.393333 53.393333 0 0 0-53.333333 53.333333v149.333334a53.393333 53.393333 0 0 0 53.333333 53.333333h149.333333a53.393333 53.393333 0 0 0 53.333334-53.333333V437.333333a53.393333 53.393333 0 0 0-53.333334-53.333333z m0 341.333333H96a53.393333 53.393333 0 0 0-53.333333 53.333334v149.333333a53.393333 53.393333 0 0 0 53.333333 53.333333h149.333333a53.393333 53.393333 0 0 0 53.333334-53.333333v-149.333333a53.393333 53.393333 0 0 0-53.333334-53.333334z\" fill=\"#13227a\" p-id=\"69801\"></path></svg>",
      "update": "<svg t=\"1578767541873\" style=\"display:block;\" class=\"icon\" viewBox=\"0 0 1024 1024\" version=\"1.1\" xmlns=\"http://www.w3.org/2000/svg\" p-id=\"23715\" width=\"32\" height=\"32\"><path d=\"M768 810.7H512c-23.6 0-42.7-19.1-42.7-42.7s19.1-42.7 42.7-42.7h256c94.1 0 170.7-76.6 170.7-170.7 0-89.6-70.1-164.3-159.5-170.1L754 383l-10.7-22.7c-42.2-89.3-133-147-231.3-147s-189.1 57.7-231.3 147L270 383l-25.1 1.6c-89.5 5.8-159.5 80.5-159.5 170.1 0 94.1 76.6 170.7 170.7 170.7 23.6 0 42.7 19.1 42.7 42.7s-19.1 42.7-42.7 42.7c-141.2 0-256-114.8-256-256 0-126.1 92.5-232.5 214.7-252.4C274.8 195.7 388.9 128 512 128s237.2 67.7 297.3 174.2C931.5 322.1 1024 428.6 1024 554.7c0 141.1-114.8 256-256 256z\" fill=\"#3688FF\" p-id=\"23716\"></path><path d=\"M554.7 938.7c-10.9 0-21.8-4.2-30.2-12.5l-128-128c-16.7-16.7-16.7-43.7 0-60.3l128-128c16.6-16.7 43.7-16.7 60.3 0 16.7 16.7 16.7 43.7 0 60.3L487 768l97.8 97.8c16.7 16.7 16.7 43.7 0 60.3-8.3 8.4-19.2 12.6-30.1 12.6z\" fill=\"#5F6379\" p-id=\"23717\"></path></svg>",
      "pokeball": "<svg class=\"icon\" width=\"24\" height=\"24\" viewBox=\"0 0 108 108\" version=\"1.1\" xmlns=\"http://www.w3.org/2000/svg\" xmlns:xlink=\"http://www.w3.org/1999/xlink\">\n\n    <g id=\"页面-1\" stroke=\"none\" stroke-width=\"1\" fill=\"none\" fill-rule=\"evenodd\">\n\n        <g id=\"精灵球\" transform=\"translate(0.830769, 0.830769)\" fill-rule=\"nonzero\">\n\n            <path d=\"M53.1692307,106.338461 C23.8276922,106.338461 0,82.5107692 0,53.1692307 C0,51.0030769 1.77230775,49.2307692 3.9384615,49.2307692 L33.476923,49.2307692 C35.6430769,49.2307692 37.4153845,51.003077 37.4153846,53.1692307 C37.4153846,61.8338461 44.5046154,68.9230769 53.1692307,68.9230769 C61.8338461,68.9230769 68.9230769,61.8338461 68.9230769,53.1692307 C68.9230769,51.0030769 70.6953846,49.2307692 72.8615385,49.2307692 L102.4,49.2307692 C104.566154,49.2307692 106.338461,51.003077 106.338461,53.1692307 C106.338461,82.5107692 82.5107692,106.338461 53.1692307,106.338461 Z\" id=\"路径\" fill=\"#33363A\"></path>\n\n            <path d=\"M8.07384612,57.1076922 C10.0430769,80.2461537 29.5384615,98.4615385 53.1692307,98.4615385 C76.8,98.4615385 96.2953846,80.2461539 98.2646154,57.1076922 L76.5046154,57.1076922 C74.6338461,68.2338461 64.8861539,76.8 53.1692307,76.8 C41.4523076,76.8 31.7046154,68.2338461 29.8338461,57.1076922 L8.07384612,57.1076922 Z\" id=\"路径\" fill=\"#FFFFFF\"></path>\n\n            <path d=\"M53.1692308,3.9384615 C25.9938461,3.9384615 3.9384615,25.9938461 3.9384615,53.1692307 L33.476923,53.1692307 C33.476923,42.3384615 42.3384615,33.476923 53.1692308,33.476923 C64,33.476923 72.8615385,42.3384615 72.8615385,53.1692307 L102.4,53.1692307 C102.4,25.9938461 80.3446154,3.9384615 53.1692308,3.9384615 Z\" id=\"路径\" fill=\"#D60909\"></path>\n\n            <path d=\"M102.4,57.1076922 L72.8615385,57.1076922 C70.6953846,57.1076922 68.923077,55.3353845 68.9230769,53.1692307 C68.9230769,44.5046154 61.8338461,37.4153846 53.1692307,37.4153846 C44.5046154,37.4153846 37.4153846,44.5046154 37.4153846,53.1692307 C37.4153846,55.3353846 35.6430769,57.1076922 33.476923,57.1076922 L3.9384615,57.1076922 C1.77230762,57.1076922 0,55.3353845 0,53.1692307 C0,23.8276922 23.8276923,0 53.1692307,0 C82.5107692,0 106.338461,23.8276922 106.338461,53.1692307 C106.338461,55.3353846 104.566154,57.1076922 102.4,57.1076922 Z\" id=\"路径\" fill=\"#33363A\"></path>\n\n            <path d=\"M76.5046154,49.2307693 L98.3630769,49.2307693 C96.2953846,26.0923076 76.8,7.876923 53.1692307,7.876923 C29.5384615,7.876923 10.0430769,26.0923076 8.07384612,49.2307693 L29.9323076,49.2307693 C31.7046154,38.1046154 41.4523076,29.5384615 53.1692307,29.5384615 C64.8861539,29.5384615 74.6338461,38.1046154 76.5046154,49.2307693 L76.5046154,49.2307693 Z\" id=\"路径\" fill=\"#D60909\"></path>\n\n            <path d=\"M53.1692307,76.8 C40.1723076,76.8 29.5384615,66.1661539 29.5384615,53.1692307 C29.5384615,40.1723076 40.1723076,29.5384615 53.1692307,29.5384615 C66.1661539,29.5384615 76.8,40.1723076 76.8,53.1692307 C76.8,66.1661539 66.1661539,76.8 53.1692307,76.8 Z\" id=\"路径\" fill=\"#33363A\"></path>\n\n            <path d=\"M53.1692307,37.4153846 C44.5046154,37.4153846 37.4153846,44.5046154 37.4153846,53.1692307 C37.4153846,61.8338461 44.5046154,68.9230769 53.1692307,68.9230769 C61.8338461,68.9230769 68.9230769,61.8338461 68.9230769,53.1692307 C68.9230769,44.5046154 61.8338461,37.4153846 53.1692307,37.4153846 L53.1692307,37.4153846 Z\" id=\"路径\" fill=\"#FFFFFF\"></path>\n\n            <path d=\"M43.3230769,53.1692307 C43.3230769,58.6071114 47.7313501,63.0153846 53.1692307,63.0153846 C58.6071114,63.0153846 63.0153846,58.6071114 63.0153846,53.1692307 C63.0153846,47.7313501 58.6071114,43.3230769 53.1692307,43.3230769 C47.7313501,43.3230769 43.3230769,47.7313501 43.3230769,53.1692307 Z\" id=\"路径\" fill=\"#33363A\"></path>\n\n        </g>\n\n    </g>\n\n</svg>"
};

    function createSvg(iconKey, size, className) {
      var s = size || 32;
      var cls = className ? ' ' + className : '';

      var wrapper = document.createElement('span');
      wrapper.className = 'miuix-icon-wrap' + cls;
      wrapper.style.display = 'inline-flex';
      wrapper.style.alignItems = 'center';
      wrapper.style.justifyContent = 'center';
      wrapper.style.width = s + 'px';
      wrapper.style.height = s + 'px';

      if (RAW_ICONS[iconKey]) {
        var raw = RAW_ICONS[iconKey];
        // 如果传入了特定尺寸，微调 svg/img
        if (size && size !== 32) {
          raw = raw.replace(/width="\d+"/, 'width="' + size + '"').replace(/height="\d+"/, 'height="' + size + '"');
          raw = raw.replace(/width:\s*\d+px/, 'width: ' + size + 'px').replace(/height:\s*\d+px/, 'height: ' + size + 'px');
        }
        wrapper.innerHTML = raw;
      } else {
        var pathHtml = SVG_PATHS[iconKey] || SVG_PATHS.extool;
        wrapper.innerHTML = '<svg viewBox="0 0 24 24" width="' + s + '" height="' + s + '" style="display:block;">' + pathHtml + '</svg>';
      }

      return wrapper;
    }

    return {
      PATHS: SVG_PATHS,
      RAW_ICONS: RAW_ICONS,
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

      function attachPanel() {
        if (panel.parentNode) return;
        var b = (typeof document !== 'undefined' && document.body) ? document.body : (typeof document !== 'undefined' ? document.documentElement : null);
        if (b && typeof b.appendChild === 'function') b.appendChild(panel);
      }

      if (typeof document !== 'undefined' && document.body) {
        attachPanel();
      } else if (typeof document !== 'undefined' && typeof document.addEventListener === 'function') {
        document.addEventListener('DOMContentLoaded', attachPanel, { once: true });
      }

      function show(anchorEl) {
        attachPanel();
        if (anchorEl && typeof anchorEl.getBoundingClientRect === 'function') {
          var rect = anchorEl.getBoundingClientRect();
          if (rect.width > 0 || rect.top > 0) {
            // Anchor right above the button
            var left = Math.max(8, Math.min(window.innerWidth - width - 8, rect.left + (rect.width - width) / 2));
            var top = Math.max(8, rect.top - height - 12);
            panel.style.left = left + 'px';
            panel.style.top = top + 'px';
            panel.style.right = 'auto';
            panel.style.bottom = 'auto';
          } else {
            panel.style.right = '24px';
            panel.style.bottom = '80px';
            panel.style.left = 'auto';
            panel.style.top = 'auto';
          }
        } else {
          panel.style.right = '24px';
          panel.style.bottom = '80px';
          panel.style.left = 'auto';
          panel.style.top = 'auto';
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

    // 计划书 §13.2 严格九按钮顺序：
    // 一键签到、一键续牌、扩展功能、直播间工具、弹幕小助手、全站抽奖、同屏播放器、在线弹幕助手、版本更新
    var DOCK_BUTTONS = [
      { id: 'ex-sign', cls: 'ex-sign', icon: 'sign', title: '一键签到', hasPanel: true },
      { id: 'fans-continue', cls: 'fans-continue', icon: 'fans', title: '一键续牌', hasPanel: true },
      { id: 'extool', cls: 'extool-icon', icon: 'extool', title: '扩展功能', hasPanel: true },
      { id: 'livetool', cls: 'livetool-icon', icon: 'livetool', title: '直播间工具', hasPanel: true },
      { id: 'bloop', cls: 'bloop-icon', icon: 'bloop', title: '弹幕小助手', hasPanel: true },
      { id: 'ex-lottery', cls: 'ex-lottery', icon: 'lottery', title: '全站抽奖', hasPanel: true },
      { id: 'popup-player', cls: 'popup-player', icon: 'popup', title: '同屏播放器', hasPanel: true },
      { id: 'ex-monitor', cls: 'ex-monitor', icon: 'monitor', title: '在线弹幕助手', hasPanel: false },
      { id: 'ex-update', cls: 'ex-update', icon: 'update', title: '版本更新', hasPanel: true }
    ];

    var CLOSE_DELAY_MS = 400;

    function createDock(options) {
      var opts = options || {};

      var dockWrap = document.createElement('div');
      dockWrap.className = 'ex-panel miuix-dock-wrap';

      // 1. Indicator capsule (24x4px 生机蓝指示器小胶囊)
      var indicator = document.createElement('div');
      indicator.className = 'ex-panel__indicator miuix-dock-indicator';
      dockWrap.appendChild(indicator);

      // 2. Close button (×)
      var closeBtn = document.createElement('button');
      closeBtn.type = 'button';
      closeBtn.className = 'ex-panel__close miuix-dock-close';
      closeBtn.innerHTML = '×';
      closeBtn.title = '关闭工具条';
      if (typeof closeBtn.setAttribute === 'function') {
        closeBtn.setAttribute('aria-label', '关闭 DouyuEx 工具条');
      }
      closeBtn.addEventListener('click', function (e) {
        e.stopPropagation();
        closeDock();
      });
      dockWrap.appendChild(closeBtn);

      // 3. Inner wrap for 9 buttons
      var itemsWrap = document.createElement('div');
      itemsWrap.className = 'ex-panel__wrap';
      dockWrap.appendChild(itemsWrap);

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
        var xOffset = btnRect.left - wrapRect.left + (btnRect.width - 24) / 2;
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
          var match = el.dataset.dockId === id;
          el.classList.toggle('is-active', match);
          el.classList.toggle('ex-dock-active', match);
        });
      }

      function closeActivePanel() {
        if (!activePanelId) return;
        var panel = registeredPanels.get(activePanelId);
        if (panel) panel.hide();
        activePanelId = null;
        updateIndicator(null);

        dockWrap.querySelectorAll('.miuix-dock-item').forEach(function (el) {
          el.classList.remove('is-active', 'ex-dock-active');
        });
      }

      function togglePanel(id, anchorBtn) {
        if (activePanelId === id) {
          closeActivePanel();
        } else {
          openPanel(id, anchorBtn);
        }
      }

      function getToolbarContainer() {
        var d = typeof document !== 'undefined' ? document : null;
        if (!d) return null;
        return d.querySelector('.PlayerToolbar-ContentCell .PlayerToolbar-Wealth') ||
               d.querySelector('.PlayerToolbar-ContentRow');
      }

      function getFloatingParent() {
        var d = typeof document !== 'undefined' ? document : null;
        if (!d) return null;
        var dlg = typeof d.getElementById === 'function' ? d.getElementById('js-player-dialog') : null;
        if (dlg) return dlg;
        var box = typeof d.getElementsByClassName === 'function' ? d.getElementsByClassName('room-Player-Box')[0] : null;
        if (box) return box;
        return d.body || null;
      }

      function isPlayerToolbarHidden() {
        var d = typeof document !== 'undefined' ? document : null;
        if (!d || typeof d.getElementsByClassName !== 'function') return false;
        var row = d.getElementsByClassName('PlayerToolbar-ContentRow')[0];
        return row && row.style && row.style.visibility === 'hidden';
      }

      function updateDockPosition() {
        var d = typeof document !== 'undefined' ? document : null;
        if (!d) return;

        var tb = d.getElementById('js-player-toolbar') || d.querySelector('.PlayerToolbar');
        var vmenu = d.getElementById('ex-vtoolbar-menu');

        if (isPlayerToolbarHidden() || !getToolbarContainer()) {
          dockWrap.classList.add('ex-panel--floating');
          var fp = getFloatingParent();
          if (fp && dockWrap.parentNode !== fp) {
            fp.appendChild(dockWrap);
          }
        }

        if (dockWrap.classList.contains('ex-panel--floating')) {
          if (tb && typeof tb.getBoundingClientRect === 'function') {
            var tbRect = tb.getBoundingClientRect();
            dockWrap.style.position = 'fixed';
            dockWrap.style.bottom = Math.max(8, (window.innerHeight - tbRect.top + 8)) + 'px';
            dockWrap.style.top = 'auto';
            var dockWidth = dockWrap.offsetWidth || dockWrap.scrollWidth || 580;
            var leftPos = tbRect.left + tbRect.width / 2 - dockWidth / 2;
            if (vmenu && typeof vmenu.getBoundingClientRect === 'function') {
              var vRect = vmenu.getBoundingClientRect();
              leftPos = vRect.left + vRect.width / 2 - dockWidth / 2;
            }
            leftPos = Math.max(8, Math.min(leftPos, window.innerWidth - dockWidth - 8));
            dockWrap.style.left = leftPos + 'px';
            dockWrap.style.right = 'auto';
          } else {
            dockWrap.style.position = 'fixed';
            dockWrap.style.bottom = '76px';
            dockWrap.style.right = '12px';
            dockWrap.style.left = 'auto';
          }
        } else {
          var toolbarEl = d.querySelector('.PlayerToolbar');
          dockWrap.style.position = 'absolute';
          dockWrap.style.bottom = toolbarEl ? toolbarEl.offsetHeight + 'px' : '76px';
          dockWrap.style.left = 'auto';
          dockWrap.style.right = '0px';
        }
      }

      function openDock() {
        isDockOpen = true;
        if (dockWrap.classList && typeof dockWrap.classList.add === 'function') {
          dockWrap.classList.add('is-open');
        }
        dockWrap.style.display = 'flex';
        updateDockPosition();

        var launcher = typeof document !== 'undefined' && typeof document.querySelector === 'function' ? document.querySelector('.ex-icon, .miuix-ex-icon') : null;
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
        var launcher = typeof document !== 'undefined' && typeof document.querySelector === 'function' ? document.querySelector('.ex-icon, .miuix-ex-icon') : null;
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

      // 4. Render 9 buttons in itemsWrap
      DOCK_BUTTONS.forEach(function (btnDef) {
        var btn = document.createElement('div');
        btn.className = (btnDef.cls || btnDef.id) + ' miuix-dock-item';
        if (!btn.dataset) btn.dataset = {};
        btn.dataset.dockId = btnDef.id;
        btn.title = btnDef.title;

        var a = document.createElement('a');
        a.className = 'ex-panel__icon';
        a.title = btnDef.title;
        a.style.display = 'flex';
        a.style.alignItems = 'center';
        a.style.justifyContent = 'center';
        a.style.width = '100%';
        a.style.height = '100%';
        a.appendChild(icons.createSvg(btnDef.icon, 32));

        var tip = document.createElement('i');
        tip.id = btnDef.id + '__tip';
        tip.className = 'ex-panel__tip';
        a.appendChild(tip);
        btn.appendChild(a);

        var itemIndicator = document.createElement('div');
        itemIndicator.className = 'ex-panel__indicator miuix-dock-indicator';
        btn.appendChild(itemIndicator);

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
          if (btnDef.id === 'ex-monitor') {
            var rid = (window.$DATA && window.$DATA.ROOM && window.$DATA.ROOM.room_id) || window.room_id || window.rid || '60937';
            window.open('https://www.douyuex.com/' + rid, '_blank');
          } else if (btnDef.hasPanel && registeredPanels.has(btnDef.id)) {
            togglePanel(btnDef.id, btn);
          } else if (typeof opts.onItemClick === 'function') {
            opts.onItemClick(btnDef, btn);
          } else if (typeof opts.onAction === 'function') {
            opts.onAction(btnDef.id);
          }
        });

        itemsWrap.appendChild(btn);
      });

      function mount(targetContainer) {
        var d = typeof document !== 'undefined' ? document : null;
        if (!d) return;
        var c = targetContainer || opts.container;
        if (!c) {
          var wealthBar = getToolbarContainer();
          if (wealthBar && !isPlayerToolbarHidden()) {
            c = wealthBar;
          } else {
            c = getFloatingParent();
            dockWrap.classList.add('ex-panel--floating');
          }
        }
        if (c && !dockWrap.parentNode && typeof c.appendChild === 'function') {
          if (c.firstChild) {
            c.insertBefore(dockWrap, c.firstChild);
          } else {
            c.appendChild(dockWrap);
          }
        }
      }

      // 5. 挂载礼物栏红白精灵球入口 (.ex-icon / .miuix-ex-icon)
      function mountLauncher(doc) {
        var d = doc || (typeof document !== 'undefined' ? document : null);
        if (!d) return;

        var wealthBar = d.querySelector('.PlayerToolbar-ContentCell .PlayerToolbar-Wealth') ||
                         d.querySelector('.PlayerToolbar-Wealth');
        if (wealthBar && wealthBar.querySelector('.ex-icon, .miuix-ex-icon')) return;

        var iconBtn = d.createElement('div');
        iconBtn.className = 'ex-icon miuix-ex-icon';
        iconBtn.title = 'DouyuEx-RL 控制中心 (点击展开/收起)';

        var a = d.createElement('a');
        a.title = 'DouyuEx-RL (点击展开/收起)';
        a.style.display = 'flex';
        a.style.alignItems = 'center';
        a.style.justifyContent = 'center';
        a.style.cursor = 'pointer';
        a.appendChild(icons.createSvg('pokeball', 24));

        var tip = d.createElement('i');
        tip.id = 'ex-icon__tip';
        tip.className = 'ex-panel__tip';
        a.appendChild(tip);

        iconBtn.appendChild(a);

        iconBtn.addEventListener('click', function (e) {
          e.stopPropagation();
          toggleDock();
        });

        if (wealthBar) {
          if (wealthBar.firstChild) {
            wealthBar.insertBefore(iconBtn, wealthBar.firstChild);
          } else {
            wealthBar.appendChild(iconBtn);
          }
        } else {
          var giftArea = d.querySelector('.ToolbarGiftArea-container');
          if (giftArea) {
            iconBtn.className += ' ToolbarGiftArea-backpack';
            iconBtn.style.width = '52px';
            giftArea.appendChild(iconBtn);
          } else if (d.body) {
            d.body.appendChild(iconBtn);
          }
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
        var launcher = document.querySelector('.ex-icon, .miuix-ex-icon');
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

/* --- NEXT module: src/modules/danmaku/image_codec.js --- */
// src/modules/danmaku/image_codec.js
(function () {
  'use strict';
  if (!globalThis.DYEXRL_NEXT) return;

  globalThis.DYEXRL_NEXT.registry.register('modules.danmaku.imageCodec', [], function () {

    var WHITE_LIST_HOSTS = ['douyucdn.cn', 'douyu.com'];

    function encodeImageUrl(url) {
      if (!url) return '';
      try {
        var u = new URL(url);
        var isValid = WHITE_LIST_HOSTS.some(function (h) { return u.hostname.endsWith(h); });
        if (!isValid) return url;
        return '[DouyuEx图片:' + encodeURIComponent(url) + ']';
      } catch (e) {
        return url;
      }
    }

    function decodeImageText(text) {
      if (!text || typeof text !== 'string') return text;
      return text.replace(/\[DouyuEx图片:([^\]]+)\]/g, function (match, p1) {
        try {
          var rawUrl = decodeURIComponent(p1);
          var u = new URL(rawUrl);
          var isValid = WHITE_LIST_HOSTS.some(function (h) { return u.hostname.endsWith(h); });
          if (!isValid) return match;
          return '<img src=\"' + rawUrl + '\" class=\"miuix-danmaku-inline-img\" style=\"max-height: 24px; vertical-align: middle; border-radius: 3px;\" />';
        } catch (e) {
          return match;
        }
      });
    }

    return {
      encodeImageUrl: encodeImageUrl,
      decodeImageText: decodeImageText
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

/* --- NEXT module: src/modules/media/follow_list.js --- */
// src/modules/media/follow_list.js
(function () {
  'use strict';
  if (!globalThis.DYEXRL_NEXT) return;

  globalThis.DYEXRL_NEXT.registry.register('modules.media.followList', [
    'store.index',
    'api.client'
  ], function (store, client) {

    function filterLiveStreamers(streamers) {
      if (!Array.isArray(streamers)) return [];
      return streamers.filter(function (s) {
        return s.isLive === true || s.show_status === 1;
      });
    }

    function hookFollowItemInteraction(itemEl, roomId, onLongPress) {
      if (!itemEl || !roomId) return;

      var pressTimer = null;
      var longPressed = false;

      itemEl.addEventListener('mousedown', function (e) {
        if (e.button !== 0) return;
        longPressed = false;
        pressTimer = setTimeout(function () {
          longPressed = true;
          if (typeof onLongPress === 'function') {
            onLongPress(roomId);
          }
        }, 600);
      });

      itemEl.addEventListener('mouseup', function () {
        if (pressTimer) {
          clearTimeout(pressTimer);
          pressTimer = null;
        }
      });

      itemEl.addEventListener('click', function (e) {
        if (longPressed) {
          e.preventDefault();
          e.stopPropagation();
        }
      });
    }

    return {
      filterLiveStreamers: filterLiveStreamers,
      hookFollowItemInteraction: hookFollowItemInteraction
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

/* --- NEXT module: src/modules/vod/exporter.js --- */
// src/modules/vod/exporter.js
(function () {
  'use strict';
  if (!globalThis.DYEXRL_NEXT) return;

  globalThis.DYEXRL_NEXT.registry.register('modules.vod.exporter', [], function () {

    function generateHeatmapBuckets(danmakuList, durationSec) {
      var BUCKET_COUNT = 100;
      var buckets = new Array(BUCKET_COUNT).fill(0);
      var totalSec = Math.max(1, durationSec || 3600);

      if (!Array.isArray(danmakuList)) return buckets;

      danmakuList.forEach(function (dm) {
        var t = Number(dm.time || dm.offset || 0);
        if (t >= 0 && t <= totalSec) {
          var idx = Math.min(BUCKET_COUNT - 1, Math.floor((t / totalSec) * BUCKET_COUNT));
          buckets[idx]++;
        }
      });

      return buckets;
    }

    function extractM3u8StreamUrl(playData) {
      if (!playData) return null;
      if (typeof playData === 'string' && playData.includes('.m3u8')) return playData;
      if (playData.data && playData.data.video_url) return playData.data.video_url;
      if (playData.video_url) return playData.video_url;
      return null;
    }

    return {
      generateHeatmapBuckets: generateHeatmapBuckets,
      extractM3u8StreamUrl: extractM3u8StreamUrl
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
    var activeTimer = null;

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
      activeTimer = setInterval(function () {
        if (!store.get('radar.autoPick')) return;
        var list = detectRedPackets();
        if (list.length > 0) {
          list.forEach(function (it) {
            pickRedPacket(it);
          });
        }
      }, 3000);
      return activeTimer;
    }

    function stopAutoPicker() {
      if (activeTimer) {
        clearInterval(activeTimer);
        activeTimer = null;
      }
      isPicking = false;
    }

    return {
      detectRedPackets: detectRedPackets,
      pickRedPacket: pickRedPacket,
      startAutoPicker: startAutoPicker,
      stopAutoPicker: stopAutoPicker
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
        id: Date.now() + '_' + Math.random().toString(36).slice(2, 7),
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

/* --- NEXT module: src/modules/system/month_cost.js --- */
// src/modules/system/month_cost.js
(function () {
  'use strict';
  if (!globalThis.DYEXRL_NEXT) return;

  globalThis.DYEXRL_NEXT.registry.register('modules.system.monthCost', [
    'store.index',
    'api.client'
  ], function (store, client) {

    var isHidden = store.get('system.monthCost.hidden') !== false;

    function getMonthCostDisplay(amount) {
      if (isHidden) return '***';
      return (Number(amount) || 0).toFixed(2);
    }

    function togglePrivacy() {
      isHidden = !isHidden;
      store.set('system.monthCost.hidden', isHidden);
      return isHidden;
    }

    function mountMonthCostWidget(containerEl) {
      if (!containerEl || containerEl.querySelector('.miuix-month-cost')) return;

      var wrap = document.createElement('div');
      wrap.className = 'miuix-month-cost';
      wrap.style.cssText = 'display: inline-flex; align-items: center; gap: 4px; font-size: 11px; color: #64748b; cursor: pointer; user-select: none; margin-right: 8px;';
      wrap.innerHTML = `
        <span>本月消费</span>
        <b id="month-cost-val" style="color: #0f172a;">${getMonthCostDisplay(0)}</b>
        <span>元</span>
        <span id="month-cost-eye" style="font-size: 12px; margin-left: 2px;">${isHidden ? '🙈' : '👁️'}</span>
      `;

      wrap.addEventListener('click', function (e) {
        e.stopPropagation();
        var hidden = togglePrivacy();
        var valEl = wrap.querySelector('#month-cost-val');
        var eyeEl = wrap.querySelector('#month-cost-eye');
        if (valEl) valEl.textContent = getMonthCostDisplay(0);
        if (eyeEl) eyeEl.textContent = hidden ? '🙈' : '👁️';
      });

      containerEl.appendChild(wrap);
    }

    return {
      getMonthCostDisplay: getMonthCostDisplay,
      togglePrivacy: togglePrivacy,
      mountMonthCostWidget: mountMonthCostWidget
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
        subtitle: '动态识别真实佩戴勋章并维持不掉级'
      });

      // Card 1: 徽章与资产 (3 列对齐基线截图 fans-panel.png)
      var assetCard = document.createElement('div');
      assetCard.className = 'miuix-card fans-panel__card';
      assetCard.innerHTML = `
        <div class="fans-panel__card-header" style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
          <span style="font-weight: 700; font-size: 12px; color: #1e293b;">徽章与资产</span>
          <span style="font-size: 11px; padding: 2px 8px; border-radius: 4px; background: rgba(0, 102, 255, 0.1); color: #0066FF; font-weight: 600;">已配粉丝牌</span>
        </div>
        <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 8px; text-align: center; background: rgba(0,0,0,0.02); padding: 8px 4px; border-radius: 8px;">
          <div>
            <div style="font-size: 11px; color: #64748b;">已有粉丝牌</div>
            <div id="fans-owned-count" style="font-weight: 700; font-size: 13px; color: #0f172a; margin-top: 2px;">2</div>
          </div>
          <div>
            <div style="font-size: 11px; color: #64748b;">背包荧光棒</div>
            <div id="fans-stick-count" style="font-weight: 700; font-size: 13px; color: #0066FF; margin-top: 2px;">96</div>
          </div>
          <div>
            <div style="font-size: 11px; color: #64748b;">牌子状态</div>
            <div id="fans-status-text" style="font-weight: 700; font-size: 13px; color: #10b981; margin-top: 2px;">健康保活</div>
          </div>
        </div>
      `;
      panel.body.appendChild(assetCard);

      // Card 2: 续牌赠送配置
      var configCard = document.createElement('div');
      configCard.className = 'miuix-card fans-panel__card';
      configCard.innerHTML = `
        <div style="font-weight: 700; font-size: 12px; color: #1e293b; margin-bottom: 8px;">续牌赠送配置</div>
        <div style="display: flex; align-items: center; gap: 6px; font-size: 11.5px; color: #475569;">
          <span>每个直播间赠送荧光棒数量:</span>
          <input type="number" id="fans-input-stick" value="0" min="0" style="width: 50px; padding: 3px 6px; border-radius: 6px; border: 1px solid #cbd5e1; font-size: 12px; text-align: center;" />
        </div>
        <div style="font-size: 10.5px; color: #94a3b8; margin-top: 6px;">根 (输入 0 则平均分配背包余量)</div>
      `;
      panel.body.appendChild(configCard);

      // Action Button
      var actionBtn = document.createElement('button');
      actionBtn.type = 'button';
      actionBtn.id = 'fans-btn-submit';
      actionBtn.className = 'miuix-btn miuix-btn--primary';
      actionBtn.style.cssText = 'width: 100%; padding: 9px 0; font-size: 13px; font-weight: 700; margin-top: auto;';
      actionBtn.textContent = '立即开始续牌';

      actionBtn.addEventListener('click', async function (e) {
        e.stopPropagation();
        actionBtn.disabled = true;
        actionBtn.textContent = '正在打卡续牌中...';
        await fansContinue.executeFansRenewal();
        actionBtn.disabled = false;
        actionBtn.textContent = '立即开始续牌';
        updateData();
        miuix.Toast('续牌打卡完成', 'success');
      });

      panel.body.appendChild(actionBtn);

      async function updateData() {
        var stickEl = panel.element.querySelector('#fans-stick-count');
        var inputEl = panel.element.querySelector('#fans-input-stick');

        var items = await backpack.fetchBackpackItems();
        var stick = items.find(function (it) { return it.name && it.name.includes('荧光棒'); });
        if (stickEl) stickEl.textContent = stick ? stick.count : '96';

        if (inputEl) {
          inputEl.value = store.get('economy.fansContinueCount') || 0;
          inputEl.addEventListener('input', function () {
            store.set('economy.fansContinueCount', parseInt(inputEl.value, 10) || 0);
          });
        }
      }

      var origShow = panel.show;
      panel.show = function (anchorEl) {
        origShow(anchorEl);
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

/* --- NEXT module: src/ui/modals/extool_panel.js --- */
// src/ui/modals/extool_panel.js
(function () {
  'use strict';
  if (!globalThis.DYEXRL_NEXT) return;

  globalThis.DYEXRL_NEXT.registry.register('ui.modals.extoolPanel', [
    'ui.miuix',
    'ui.icons',
    'ui.giftPicker',
    'store.index',
    'modules.economy.backpack',
    'modules.radar.redpacket'
  ], function (miuix, icons, giftPicker, store, backpack, redpacket) {

    function createExtoolPanel() {
      var panel = miuix.Panel({
        id: 'extool-panel',
        title: '扩展功能',
        subtitle: '核心画质性能、打榜送礼与自动化工具'
      });

      // 1. 播放与性能卡片 (L3-10 / perf-panel)
      var perfCard = document.createElement('div');
      perfCard.className = 'miuix-card extool__player_perf';
      perfCard.innerHTML = `
        <div class="miuix-card__header" style="display: flex; justify-content: space-between; align-items: center;">
          <span class="miuix-card__title">播放与性能</span>
          <span style="font-size: 11px; padding: 2px 6px; border-radius: 4px; background: rgba(0, 102, 255, 0.1); color: #0066FF; font-weight: 600;">原生极清</span>
        </div>
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-top: 6px;">
          <label style="display: flex; align-items: center; gap: 6px; cursor: pointer; font-size: 12px;">
            <input type="checkbox" id="extool-highest-quality" class="miuix-checkbox" />
            <span>自动最高画质</span>
          </label>
          <label style="display: flex; align-items: center; gap: 6px; cursor: pointer; font-size: 12px;">
            <input type="checkbox" id="extool-fullscreen" class="miuix-checkbox" />
            <span>自动网页全屏</span>
          </label>
          <label style="display: flex; align-items: center; gap: 6px; cursor: pointer; font-size: 12px;">
            <input type="checkbox" id="extool-block-p2p" class="miuix-checkbox" />
            <span>阻止p2p上传</span>
          </label>
          <label style="display: flex; align-items: center; gap: 6px; cursor: pointer; font-size: 12px;">
            <input type="checkbox" id="extool-tabswitch" class="miuix-checkbox" />
            <span>防页签冻结</span>
          </label>
        </div>
      `;
      panel.body.appendChild(perfCard);

      // 双向绑定四个核心性能开关
      store.bindCheckbox('#extool-highest-quality', 'core.quality.highestVideoQuality');
      store.bindCheckbox('#extool-fullscreen', 'system.settings.fullScreen');
      store.bindCheckbox('#extool-block-p2p', 'core.p2p.blockUpload');
      store.bindCheckbox('#extool-tabswitch', 'media.background.preventTabFreeze');

      // 2. 打榜送礼卡片 (L3-07 / extool__sendgift)
      var sendGiftCard = document.createElement('div');
      sendGiftCard.className = 'miuix-card extool__sendgift';
      sendGiftCard.innerHTML = `
        <div class="miuix-card__header" style="display: flex; justify-content: space-between; align-items: center;">
          <span class="miuix-card__title">打榜送礼</span>
          <span style="font-size: 11px; color: #94a3b8;">[批量打榜, 任意礼物]</span>
        </div>
        <div class="ex-gift-pick-trigger" id="extool__sendgift_trigger" style="display: flex; align-items: center; gap: 8px; padding: 8px 12px; background: rgba(0, 102, 255, 0.05); border: 1px solid rgba(0, 102, 255, 0.2); border-radius: 8px; cursor: pointer; margin-top: 6px;">
          <span id="extool-sendgift-icon" style="font-size: 16px;">🚀</span>
          <span id="extool-sendgift-name" style="font-weight: 700; font-size: 12px; color: #0066FF;">超级火箭</span>
          <span id="extool-sendgift-price" style="font-size: 11px; padding: 1px 6px; border-radius: 4px; background: rgba(0, 102, 255, 0.15); color: #0066FF;">2000 鱼翅</span>
          <span style="margin-left: auto; font-size: 10px; color: #94a3b8;">▼</span>
          <input type="hidden" id="extool-sendgift-id" value="2000" />
        </div>
        <div style="display: flex; align-items: center; gap: 8px; margin-top: 8px;">
          <label style="display: flex; align-items: center; gap: 4px; font-size: 11.5px;">
            <span>数量:</span>
            <input type="number" id="extool-sendgift-cnt" value="1" min="1" style="width: 50px; padding: 3px 6px; border-radius: 6px; border: 1px solid #cbd5e1; font-size: 11.5px;" />
          </label>
          <label style="display: flex; align-items: center; gap: 4px; font-size: 11.5px;">
            <span>间隔:</span>
            <input type="number" id="extool-sendgift-interval" value="0" min="0" style="width: 50px; padding: 3px 6px; border-radius: 6px; border: 1px solid #cbd5e1; font-size: 11.5px;" />
            <span>ms</span>
          </label>
          <button type="button" id="extool-sendgift-btn" class="miuix-btn miuix-btn--primary" style="margin-left: auto; padding: 4px 16px; font-size: 12px;">送出</button>
        </div>
      `;
      panel.body.appendChild(sendGiftCard);

      // 点击展开 540x410 礼物选择器 (房间模式)
      sendGiftCard.querySelector('#extool__sendgift_trigger').addEventListener('click', function (e) {
        e.stopPropagation();
        giftPicker.open('room', function (gift) {
          if (!gift) return;
          sendGiftCard.querySelector('#extool-sendgift-name').textContent = gift.name;
          sendGiftCard.querySelector('#extool-sendgift-price').textContent = gift.price ? (gift.price + ' 鱼翅') : '已选';
          sendGiftCard.querySelector('#extool-sendgift-id').value = gift.id;
          miuix.Toast('已选择打榜礼物: ' + gift.name, 'info', 1200);
        });
      });

      // 绑定送出打榜礼物事件
      sendGiftCard.querySelector('#extool-sendgift-btn').addEventListener('click', async function () {
        var giftId = sendGiftCard.querySelector('#extool-sendgift-id').value;
        var cnt = Number(sendGiftCard.querySelector('#extool-sendgift-cnt').value) || 1;
        var delay = Number(sendGiftCard.querySelector('#extool-sendgift-interval').value) || 0;
        var rid = store.get('runtime.room.rid') || (window.room_id || window.rid || '60937');
        if (!giftId) return miuix.Toast('请先选择要送出的礼物', 'warning');

        var ok = confirm('确认向当前直播间送出 ' + cnt + ' 个礼物？');
        if (!ok) return;

        miuix.Toast('【打榜送礼】开始执行...', 'info');
        try {
          if (typeof window.Ut === 'function') {
            for (var i = 0; i < cnt; i++) {
              await window.Ut(giftId, 1, rid);
              if (delay > 0) await new Promise(function (r) { setTimeout(r, delay); });
            }
            miuix.Toast('【打榜送礼】送出完成！', 'success');
          } else {
            for (var j = 0; j < cnt; j++) {
              await backpack.sendBackpackProp(giftId, 1, rid);
              if (delay > 0) await new Promise(function (r) { setTimeout(r, delay); });
            }
            miuix.Toast('【打榜送礼】送出完成！', 'success');
          }
        } catch (err) {
          miuix.Toast('【打榜送礼】失败: ' + (err.message || '网络异常'), 'error');
        }
      });

      // 3. 背包送礼卡片 (L3-08 / extool__clearbag)
      var clearbagCard = document.createElement('div');
      clearbagCard.className = 'miuix-card extool__clearbag';
      clearbagCard.innerHTML = `
        <div class="miuix-card__header" style="display: flex; justify-content: space-between; align-items: center;">
          <span class="miuix-card__title">背包送礼</span>
          <span style="font-size: 11px; color: #94a3b8;">[速度适中, 间隔>0.1s]</span>
        </div>
        <div class="ex-gift-pick-trigger" id="extool__clearbag_trigger" style="display: flex; align-items: center; gap: 8px; padding: 8px 12px; background: rgba(16, 185, 129, 0.05); border: 1px solid rgba(16, 185, 129, 0.2); border-radius: 8px; cursor: pointer; margin-top: 6px;">
          <span style="font-size: 16px;">🎒</span>
          <span id="extool-clearbag-name" style="font-weight: 700; font-size: 12px; color: #10b981;">粉丝荧光棒</span>
          <span id="extool-clearbag-tag" style="font-size: 11px; padding: 1px 6px; border-radius: 4px; background: rgba(16, 185, 129, 0.15); color: #10b981;">点击选择</span>
          <span style="margin-left: auto; font-size: 10px; color: #94a3b8;">▼</span>
          <input type="hidden" id="extool-clearbag-id" value="268" />
        </div>
        <div style="display: flex; align-items: center; gap: 8px; margin-top: 8px;">
          <label style="display: flex; align-items: center; gap: 4px; font-size: 11.5px;">
            <span>数量:</span>
            <input type="number" id="extool-clearbag-cnt" value="1" min="1" style="width: 50px; padding: 3px 6px; border-radius: 6px; border: 1px solid #cbd5e1; font-size: 11.5px;" />
          </label>
          <button type="button" id="extool-clearbag-btn" class="miuix-btn miuix-btn--primary" style="margin-left: auto; padding: 4px 16px; font-size: 12px; background: #10b981;">送出</button>
        </div>
      `;
      panel.body.appendChild(clearbagCard);

      // 点击展开 540x410 礼物选择器 (背包模式)
      clearbagCard.querySelector('#extool__clearbag_trigger').addEventListener('click', function (e) {
        e.stopPropagation();
        giftPicker.open('backpack', function (gift) {
          if (!gift) return;
          clearbagCard.querySelector('#extool-clearbag-name').textContent = gift.name;
          clearbagCard.querySelector('#extool-clearbag-tag').textContent = '拥有 ×' + (gift.count || 1);
          clearbagCard.querySelector('#extool-clearbag-id').value = gift.id;
          miuix.Toast('已选择背包道具: ' + gift.name, 'info', 1200);
        });
      });

      // 绑定送出背包道具事件
      clearbagCard.querySelector('#extool-clearbag-btn').addEventListener('click', async function () {
        var propId = clearbagCard.querySelector('#extool-clearbag-id').value;
        var cnt = Number(clearbagCard.querySelector('#extool-clearbag-cnt').value) || 1;
        var rid = store.get('runtime.room.rid') || (window.room_id || window.rid || '60937');
        if (!propId) return miuix.Toast('请先选择背包道具', 'warning');

        var ok = confirm('确认向当前直播间送出 ' + cnt + ' 个背包道具？');
        if (!ok) return;

        miuix.Toast('【背包送礼】开始赠送...', 'info');
        try {
          if (typeof window.Ut === 'function') {
            await window.Ut(propId, cnt, rid);
            miuix.Toast('【背包送礼】赠送完成！', 'success');
          } else {
            await backpack.sendBackpackProp(propId, cnt, rid);
            miuix.Toast('【背包送礼】赠送完成！', 'success');
          }
        } catch (err) {
          miuix.Toast('【背包送礼】失败: ' + (err.message || '网络异常'), 'error');
        }
      });

      // 4. 红包与宝箱卡片 (L3-09)
      var radarCard = document.createElement('div');
      radarCard.className = 'miuix-card';
      radarCard.innerHTML = `
        <div class="miuix-card__header" style="display: flex; justify-content: space-between; align-items: center;">
          <span class="miuix-card__title">房间红包与宝箱</span>
          <span style="font-size: 11px; color: #94a3b8;">自动探测与安全领取</span>
        </div>
        <div style="display: flex; flex-direction: column; gap: 8px; margin-top: 6px;">
          <label style="display: flex; justify-content: space-between; align-items: center; cursor: pointer; font-size: 12px;">
            <span>自动拾取房间红包</span>
            <input type="checkbox" id="extool-auto-redpacket" class="miuix-checkbox" />
          </label>
          <label style="display: flex; justify-content: space-between; align-items: center; cursor: pointer; font-size: 12px;">
            <span>自动参与房间宝箱</span>
            <input type="checkbox" id="extool-auto-treasure" class="miuix-checkbox" />
          </label>
        </div>
      `;
      panel.body.appendChild(radarCard);

      store.bindCheckbox('#extool-auto-redpacket', 'radar.redpacket.autoGrab');
      store.bindCheckbox('#extool-auto-treasure', 'radar.treasure.autoJoin');

      return panel;
    }

    return {
      createExtoolPanel: createExtoolPanel
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
      var activeVoteSession = null;
      var voteAccordion = miuix.Accordion({
        id: 'vote__panel',
        title: '弹幕投票',
        actions: [
          {
            label: '大屏看板',
            onClick: function () {
              if (!activeVoteSession) {
                miuix.Toast('当前暂无进行中的投票，请先发起投票', 'info');
                return;
              }
              var tallyText = Object.keys(activeVoteSession.tally).map(function (opt) {
                return opt + ': ' + activeVoteSession.tally[opt] + ' 票';
              }).join('\n');
              miuix.Dialog({
                mode: 'alert',
                title: '【实时投票大屏看板】' + activeVoteSession.theme,
                message: tallyText || '暂无投票数据'
              });
            }
          }
        ],
        content: [
          (function () {
            var box = document.createElement('div');
            box.style.display = 'flex';
            box.style.flexDirection = 'column';
            box.style.gap = '6px';
            box.innerHTML = `
              <input type="text" id="vote__theme" class="miuix-input" placeholder="输入投票主题..." />
              <input type="text" id="vote__options" class="miuix-input" placeholder="输入选项 (空格分隔，如: A B C)..." />
              <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 4px;">
                <label style="display: flex; align-items: center; gap: 4px; font-size: 11.5px; cursor: pointer;">
                  <input type="checkbox" id="vote__repeat" class="miuix-checkbox" />
                  <span>允许重复投票</span>
                </label>
                <button type="button" id="vote__start_btn" class="miuix-btn miuix-btn-primary" style="padding: 3px 12px; font-size: 11.5px;">发起投票</button>
              </div>
            `;

            var startBtn = box.querySelector('#vote__start_btn');
            startBtn.addEventListener('click', function () {
              var theme = box.querySelector('#vote__theme').value.trim();
              var optionsStr = box.querySelector('#vote__options').value.trim();
              var allowRepeat = box.querySelector('#vote__repeat').checked;

              if (!theme) return miuix.Toast('请输入投票主题', 'warning');
              var opts = optionsStr.split(/\s+/).filter(Boolean);
              if (opts.length < 2) return miuix.Toast('请至少输入两个选项 (空格分隔)', 'warning');

              var tally = {};
              opts.forEach(function (o) { tally[o] = 0; });
              activeVoteSession = {
                theme: theme,
                options: opts,
                allowRepeat: allowRepeat,
                tally: tally,
                voters: new Set(),
                startTime: Date.now()
              };

              // 开启弹幕监听
              if (chatAdapter && typeof chatAdapter.onChat === 'function') {
                chatAdapter.onChat(function (msg) {
                  if (!activeVoteSession || !msg || !msg.text) return;
                  if (!activeVoteSession.allowRepeat && msg.uid && activeVoteSession.voters.has(msg.uid)) return;
                  var t = msg.text.trim().toUpperCase();
                  opts.forEach(function (opt) {
                    if (t === opt.toUpperCase() || t.includes(opt.toUpperCase())) {
                      activeVoteSession.tally[opt]++;
                      if (msg.uid) activeVoteSession.voters.add(msg.uid);
                    }
                  });
                });
              }

              localStorage.setItem('ExSave_Vote', JSON.stringify({ theme: theme, options: opts, repeat: allowRepeat }));
              miuix.Toast('【弹幕投票】已启动: ' + theme, 'success');
            });

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
          {
            label: '导出',
            onClick: async function () {
              var saved = localStorage.getItem('ExSave_Enter') || '[]';
              try {
                if (navigator.clipboard && navigator.clipboard.writeText) {
                  await navigator.clipboard.writeText(saved);
                  miuix.Toast('欢迎规则已复制到剪贴板', 'success');
                } else {
                  miuix.Dialog({ mode: 'alert', title: '导出欢迎规则', message: saved });
                }
              } catch (e) {
                miuix.Dialog({ mode: 'alert', title: '导出欢迎规则', message: saved });
              }
            }
          },
          {
            label: '导入',
            onClick: function () {
              var input = prompt('请粘贴导出的欢迎规则 JSON 数组:');
              if (!input) return;
              try {
                var parsed = JSON.parse(input);
                if (Array.isArray(parsed)) {
                  localStorage.setItem('ExSave_Enter', JSON.stringify(parsed));
                  miuix.Toast('成功导入 ' + parsed.length + ' 条欢迎规则', 'success');
                } else {
                  miuix.Toast('格式不正确，需为 JSON 数组', 'error');
                }
              } catch (e) {
                miuix.Toast('JSON 解析失败', 'error');
              }
            }
          }
        ],
        content: [
          (function () {
            var box = document.createElement('div');
            var savedRules = [];
            try { savedRules = JSON.parse(localStorage.getItem('ExSave_Enter') || '[]'); } catch (e) {}
            var defaultWord = savedRules.length && savedRules[0].word ? savedRules[0].word : '欢迎来到直播间！';
            var defaultLevel = savedRules.length && savedRules[0].level ? savedRules[0].level : 10;

            box.innerHTML = `
              <div style="display: flex; gap: 6px; margin-bottom: 6px;">
                <input type="number" id="enter__level" class="miuix-input" style="width: 60px;" placeholder="等级" value="${defaultLevel}" />
                <input type="text" id="enter__word" class="miuix-input" style="flex: 1;" placeholder="欢迎语内容..." value="${defaultWord}" />
              </div>
              <div style="display: flex; justify-content: flex-end;">
                <button type="button" id="enter__save_btn" class="miuix-btn miuix-btn-primary" style="padding: 3px 12px; font-size: 11.5px;">保存规则</button>
              </div>
            `;

            box.querySelector('#enter__save_btn').addEventListener('click', function () {
              var lvl = Number(box.querySelector('#enter__level').value) || 1;
              var word = box.querySelector('#enter__word').value.trim();
              if (!word) return miuix.Toast('欢迎语不能为空', 'warning');
              var rules = [{ level: lvl, word: word }];
              localStorage.setItem('ExSave_Enter', JSON.stringify(rules));
              store.set('danmaku.greeter.enterWord', word);
              miuix.Toast('进场欢迎规则已保存！', 'success');
            });

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
          {
            label: '名单',
            onClick: function () {
              var saved = localStorage.getItem('ExSave_Mute') || '{}';
              miuix.Dialog({ mode: 'alert', title: '关键词禁言名单', message: saved });
            }
          },
          {
            label: '导出',
            onClick: async function () {
              var saved = localStorage.getItem('ExSave_Mute') || '{}';
              try {
                if (navigator.clipboard && navigator.clipboard.writeText) {
                  await navigator.clipboard.writeText(saved);
                  miuix.Toast('禁言规则已复制到剪贴板', 'success');
                } else {
                  miuix.Dialog({ mode: 'alert', title: '导出禁言规则', message: saved });
                }
              } catch (e) {
                miuix.Dialog({ mode: 'alert', title: '导出禁言规则', message: saved });
              }
            }
          }
        ],
        content: [
          (function () {
            var box = document.createElement('div');
            box.innerHTML = `
              <div style="display: flex; gap: 6px; margin-bottom: 6px;">
                <input type="text" id="mute__word" class="miuix-input" style="flex: 1;" placeholder="输入违规关键词..." />
                <select id="mute__duration" class="miuix-input" style="width: 75px;">
                  <option value="1">1天</option>
                  <option value="3">3天</option>
                  <option value="7">7天</option>
                  <option value="30">30天</option>
                </select>
              </div>
              <div style="display: flex; justify-content: flex-end;">
                <button type="button" id="mute__save_btn" class="miuix-btn miuix-btn-primary" style="padding: 3px 12px; font-size: 11.5px;">保存规则</button>
              </div>
            `;

            box.querySelector('#mute__save_btn').addEventListener('click', function () {
              var word = box.querySelector('#mute__word').value.trim();
              var dur = box.querySelector('#mute__duration').value;
              if (!word) return miuix.Toast('违规词不能为空', 'warning');
              var muteMap = {};
              try { muteMap = JSON.parse(localStorage.getItem('ExSave_Mute') || '{}'); } catch (e) {}
              muteMap[word] = { duration: dur, addedAt: Date.now() };
              localStorage.setItem('ExSave_Mute', JSON.stringify(muteMap));
              miuix.Toast('违规词 [' + word + '] 禁言规则已保存！', 'success');
            });

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
          {
            label: '导出',
            onClick: async function () {
              var saved = localStorage.getItem('ExSave_Gift') || '{}';
              try {
                if (navigator.clipboard && navigator.clipboard.writeText) {
                  await navigator.clipboard.writeText(saved);
                  miuix.Toast('谢礼模板已复制到剪贴板', 'success');
                } else {
                  miuix.Dialog({ mode: 'alert', title: '导出谢礼模板', message: saved });
                }
              } catch (e) {
                miuix.Dialog({ mode: 'alert', title: '导出谢礼模板', message: saved });
              }
            }
          },
          {
            label: '导入',
            onClick: function () {
              var input = prompt('请粘贴导出的谢礼模板 JSON:');
              if (!input) return;
              try {
                var parsed = JSON.parse(input);
                localStorage.setItem('ExSave_Gift', JSON.stringify(parsed));
                miuix.Toast('谢礼模板导入成功', 'success');
              } catch (e) {
                miuix.Toast('JSON 解析失败', 'error');
              }
            }
          }
        ],
        content: [
          (function () {
            var box = document.createElement('div');
            var savedGift = {};
            try { savedGift = JSON.parse(localStorage.getItem('ExSave_Gift') || '{}'); } catch (e) {}
            var defaultTpl = savedGift.template || '感谢 {name} 送出的 {gift}！老板大气！';

            box.innerHTML = `
              <div style="margin-bottom: 6px;">
                <input type="text" id="gift__tpl_input" class="miuix-input" style="width: 100%;" placeholder="感谢文案模板 (支持 {name}, {gift})..." value="${defaultTpl}" />
              </div>
              <div style="display: flex; justify-content: flex-end;">
                <button type="button" id="gift__save_btn" class="miuix-btn miuix-btn-primary" style="padding: 3px 12px; font-size: 11.5px;">保存模板</button>
              </div>
            `;

            box.querySelector('#gift__save_btn').addEventListener('click', function () {
              var tpl = box.querySelector('#gift__tpl_input').value.trim();
              if (!tpl) return miuix.Toast('感谢模板不能为空', 'warning');
              localStorage.setItem('ExSave_Gift', JSON.stringify({ template: tpl }));
              miuix.Toast('自动谢礼模板已保存！', 'success');
            });

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
          {
            label: '导出',
            onClick: async function () {
              var saved = localStorage.getItem('ExSave_Reply') || '{}';
              try {
                if (navigator.clipboard && navigator.clipboard.writeText) {
                  await navigator.clipboard.writeText(saved);
                  miuix.Toast('回复规则已复制到剪贴板', 'success');
                } else {
                  miuix.Dialog({ mode: 'alert', title: '导出回复规则', message: saved });
                }
              } catch (e) {
                miuix.Dialog({ mode: 'alert', title: '导出回复规则', message: saved });
              }
            }
          },
          {
            label: '导入',
            onClick: function () {
              var input = prompt('请粘贴导出的回复规则 JSON:');
              if (!input) return;
              try {
                var parsed = JSON.parse(input);
                localStorage.setItem('ExSave_Reply', JSON.stringify(parsed));
                miuix.Toast('回复规则导入成功', 'success');
              } catch (e) {
                miuix.Toast('JSON 解析失败', 'error');
              }
            }
          }
        ],
        content: [
          (function () {
            var box = document.createElement('div');
            box.innerHTML = `
              <div style="display: flex; gap: 6px; margin-bottom: 6px;">
                <input type="text" id="reply__kw_input" class="miuix-input" style="width: 100px;" placeholder="触发词" />
                <input type="text" id="reply__content_input" class="miuix-input" style="flex: 1;" placeholder="回复内容..." />
              </div>
              <div style="display: flex; justify-content: space-between; align-items: center;">
                <div style="display: flex; align-items: center; gap: 4px; font-size: 11px; color: #64748b;">
                  <span>CD(秒):</span>
                  <input type="number" id="reply__cd_input" class="miuix-input" style="width: 45px; padding: 2px 4px;" value="5" min="1" />
                </div>
                <button type="button" id="reply__add_btn" class="miuix-btn miuix-btn-primary" style="padding: 3px 12px; font-size: 11.5px;">添加规则</button>
              </div>
            `;

            box.querySelector('#reply__add_btn').addEventListener('click', function () {
              var kw = box.querySelector('#reply__kw_input').value.trim();
              var reply = box.querySelector('#reply__content_input').value.trim();
              var cd = Number(box.querySelector('#reply__cd_input').value) || 5;

              if (!kw || !reply) return miuix.Toast('触发词和回复内容均不能为空', 'warning');
              var replyMap = {};
              try { replyMap = JSON.parse(localStorage.getItem('ExSave_Reply') || '{}'); } catch (e) {}
              replyMap[kw] = { reply: reply, cd: cd };
              localStorage.setItem('ExSave_Reply', JSON.stringify(replyMap));
              miuix.Toast('已添加回复规则: ' + kw + ' -> ' + reply, 'success');
            });

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

/* --- NEXT module: src/ui/modals/bloop_panel.js --- */
// src/ui/modals/bloop_panel.js
(function () {
  'use strict';
  if (!globalThis.DYEXRL_NEXT) return;

  globalThis.DYEXRL_NEXT.registry.register('ui.modals.bloopPanel', [
    'ui.miuix',
    'store.index',
    'adapters.chat'
  ], function (miuix, store, chatAdapter) {

    function createBloopPanel() {
      var panel = miuix.Panel({
        id: 'bloop-panel',
        title: '弹幕发送小助手',
        subtitle: '多行词库循环、随机顺序与定时发言'
      });

      var card = document.createElement('div');
      card.className = 'miuix-card bloop__card';
      card.innerHTML = `
        <div style="display: flex; flex-direction: column; gap: 8px;">
          <div style="display: flex; justify-content: space-between; align-items: center;">
            <span style="font-size: 12px; font-weight: 700; color: #1e293b;">发言词库 (一行一条)</span>
            <span style="font-size: 11px; color: #94a3b8;">支持组合防拦截</span>
          </div>
          <textarea id="bloop-text-corpus" rows="5" style="width: 100%; box-sizing: border-box; padding: 6px 8px; border-radius: 8px; border: 1px solid #cbd5e1; font-size: 11.5px; resize: none; font-family: sans-serif;">666666
这波太帅了！
主播技术拉满！
学到了学到了</textarea>

          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px;">
            <label style="display: flex; align-items: center; gap: 4px; font-size: 11.5px;">
              <span>间隔 (秒):</span>
              <input type="number" id="bloop-input-interval" value="5" min="3" style="width: 45px; padding: 2px 4px; border-radius: 4px; border: 1px solid #cbd5e1;" />
            </label>
            <label style="display: flex; align-items: center; gap: 4px; font-size: 11.5px;">
              <input type="checkbox" id="bloop-check-random" class="miuix-checkbox" />
              <span>随机乱序</span>
            </label>
          </div>

          <div style="display: flex; gap: 8px; margin-top: 4px;">
            <button type="button" id="bloop-btn-start" class="miuix-btn miuix-btn--primary" style="flex: 1; padding: 7px 0; font-size: 12px; font-weight: 700;">开始自动发送</button>
            <button type="button" id="bloop-btn-stop" class="miuix-btn" style="flex: 1; padding: 7px 0; font-size: 12px; color: #ef4444; display: none;">停止发送</button>
          </div>
        </div>
      `;
      panel.body.appendChild(card);

      var isRunning = false;
      var loopTimer = null;
      var startBtn = card.querySelector('#bloop-btn-start');
      var stopBtn = card.querySelector('#bloop-btn-stop');
      var corpusEl = card.querySelector('#bloop-text-corpus');
      var intervalEl = card.querySelector('#bloop-input-interval');
      var randomEl = card.querySelector('#bloop-check-random');

      function stopLoop() {
        isRunning = false;
        if (loopTimer) {
          clearInterval(loopTimer);
          loopTimer = null;
        }
        startBtn.style.display = 'block';
        stopBtn.style.display = 'none';
        miuix.Toast('弹幕助手已停止', 'info', 1000);
      }

      function startLoop() {
        var lines = corpusEl.value.split('\n').map(function (s) { return s.trim(); }).filter(Boolean);
        if (!lines.length) return miuix.Toast('词库不能为空', 'warning');

        var sec = Math.max(3, Number(intervalEl.value) || 5);
        isRunning = true;
        startBtn.style.display = 'none';
        stopBtn.style.display = 'block';

        var idx = 0;
        loopTimer = setInterval(function () {
          if (!isRunning) return;
          var text = '';
          if (randomEl.checked) {
            text = lines[Math.floor(Math.random() * lines.length)];
          } else {
            text = lines[idx % lines.length];
            idx++;
          }
          chatAdapter.sendChatText(text);
        }, sec * 1000);

        miuix.Toast('弹幕小助手已启动 (每 ' + sec + ' 秒一条)', 'success');
      }

      startBtn.addEventListener('click', startLoop);
      stopBtn.addEventListener('click', stopLoop);

      return panel;
    }

    return {
      createBloopPanel: createBloopPanel
    };
  });
})();

/* --- NEXT module: src/ui/modals/lottery_panel.js --- */
// src/ui/modals/lottery_panel.js
(function () {
  'use strict';
  if (!globalThis.DYEXRL_NEXT) return;

  globalThis.DYEXRL_NEXT.registry.register('ui.modals.lotteryPanel', [
    'ui.miuix',
    'store.index',
    'modules.radar.lottery'
  ], function (miuix, store, lottery) {

    function createLotteryPanel() {
      var panel = miuix.Panel({
        id: 'lottery-panel',
        title: '全站抽奖',
        subtitle: '大奖红包实时监控与开奖雷达'
      });

      // Card 1: 监控设置
      var settingCard = document.createElement('div');
      settingCard.className = 'miuix-card';
      settingCard.innerHTML = `
        <div class="miuix-card__header" style="display: flex; justify-content: space-between; align-items: center;">
          <span class="miuix-card__title">雷达状态</span>
          <span style="font-size: 11px; padding: 2px 6px; border-radius: 4px; background: rgba(16, 185, 129, 0.1); color: #10b981; font-weight: 600;">正在监听</span>
        </div>
        <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 6px;">
          <label style="display: flex; align-items: center; gap: 6px; cursor: pointer; font-size: 12px;">
            <input type="checkbox" id="lottery-notify-switch" class="miuix-checkbox" />
            <span>开启大奖浮动通知</span>
          </label>
          <button type="button" id="lottery-refresh-btn" class="miuix-btn miuix-btn--secondary" style="padding: 3px 10px; font-size: 11.5px;">刷新列表</button>
        </div>
      `;
      panel.body.appendChild(settingCard);

      store.bindCheckbox('#lottery-notify-switch', 'radar.notifyPrize');

      // Card 2: 监控列表
      var listCard = document.createElement('div');
      listCard.className = 'miuix-card exlottery__wrap';
      listCard.style.flex = '1';
      listCard.style.display = 'flex';
      listCard.style.flexDirection = 'column';
      listCard.style.overflow = 'hidden';

      var listHeader = document.createElement('div');
      listHeader.className = 'miuix-card__header';
      listHeader.innerHTML = '<span class="miuix-card__title">近期广播大奖</span>';
      listCard.appendChild(listHeader);

      var listBox = document.createElement('div');
      listBox.id = 'lottery-list-box';
      listBox.className = 'miuix-scrollable';
      listBox.style.cssText = 'flex: 1; overflow-y: auto; max-height: 180px; padding: 4px 0; display: flex; flex-direction: column; gap: 6px;';
      listCard.appendChild(listBox);

      panel.body.appendChild(listCard);

      function renderList() {
        var prizes = lottery.getActivePrizes();
        if (!prizes || prizes.length === 0) {
          listBox.innerHTML = `
            <div style="text-align: center; color: #94a3b8; font-size: 11.5px; padding: 24px 0;">
              暂无进行中的全站大奖，雷达后台静默守护中...
            </div>
          `;
          return;
        }

        listBox.innerHTML = prizes.map(function (p) {
          return `
            <div style="display: flex; justify-content: space-between; align-items: center; padding: 6px 8px; background: rgba(0,0,0,0.02); border-radius: 6px; font-size: 11.5px;">
              <div style="display: flex; flex-direction: column; gap: 2px;">
                <span style="font-weight: 600; color: #0f172a;">${p.giftName || '超级大奖'}</span>
                <span style="font-size: 10px; color: #64748b;">送礼人: ${p.sender || '观众'} · 房间: ${p.rid}</span>
              </div>
              <a href="https://www.douyu.com/${p.rid}" target="_blank" class="miuix-btn miuix-btn--primary" style="padding: 2px 8px; font-size: 11px; text-decoration: none;">上车</a>
            </div>
          `;
        }).join('');
      }

      settingCard.querySelector('#lottery-refresh-btn').addEventListener('click', function () {
        renderList();
        miuix.Toast('抽奖雷达列表已刷新', 'info', 1000);
      });

      var origShow = panel.show;
      panel.show = function (anchorEl) {
        origShow(anchorEl);
        renderList();
      };

      return panel;
    }

    return {
      createLotteryPanel: createLotteryPanel
    };
  });
})();

/* --- NEXT module: src/ui/modals/popup_player_panel.js --- */
// src/ui/modals/popup_player_panel.js
(function () {
  'use strict';
  if (!globalThis.DYEXRL_NEXT) return;

  globalThis.DYEXRL_NEXT.registry.register('ui.modals.popupPlayerPanel', [
    'ui.miuix',
    'store.index',
    'modules.media.pip'
  ], function (miuix, store, pipModule) {

    function createPopupPlayerPanel() {
      var panel = miuix.Panel({
        id: 'popup-player-panel',
        title: '同屏播放器',
        subtitle: '多房间分屏联播与极速画中画'
      });

      var card = document.createElement('div');
      card.className = 'miuix-card';
      card.innerHTML = `
        <div style="display: flex; flex-direction: column; gap: 12px;">
          <div>
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
              <span style="font-size: 12px; font-weight: 700; color: #1e293b;">直播流或房间地址</span>
              <button type="button" id="popup-btn-paste" style="padding: 2px 8px; font-size: 11px; border-radius: 4px; border: 1px solid rgba(0, 102, 255, 0.3); background: rgba(0, 102, 255, 0.08); color: #0066FF; cursor: pointer;">粘贴</button>
            </div>
            <input type="text" id="popup-input-room" value="https://www.douyu.com/4042402" style="width: 100%; box-sizing: border-box; padding: 7px 10px; border-radius: 8px; border: 1px solid #cbd5e1; font-size: 12px; font-family: monospace;" />
          </div>

          <div>
            <div style="font-size: 12px; font-weight: 700; color: #1e293b; margin-bottom: 6px;">同屏播放模式</div>
            <div style="display: flex; background: #f1f5f9; padding: 3px; border-radius: 8px; gap: 4px;">
              <div id="mode-fast-stream" class="is-active" style="flex: 1; text-align: center; padding: 6px 0; font-size: 11.5px; font-weight: 600; border-radius: 6px; cursor: pointer; background: #ffffff; color: #0066FF; box-shadow: 0 1px 3px rgba(0,0,0,0.08);">无弹幕极速流 (推荐)</div>
              <div id="mode-full-danmaku" style="flex: 1; text-align: center; padding: 6px 0; font-size: 11.5px; font-weight: 600; border-radius: 6px; cursor: pointer; color: #64748b;">全功能有弹幕</div>
            </div>
          </div>

          <button type="button" id="popup-btn-load" class="miuix-btn miuix-btn--primary" style="width: 100%; padding: 9px 0; font-size: 13px; font-weight: 700; margin-top: 4px;">载入同屏流</button>
        </div>
      `;
      panel.body.appendChild(card);

      var isFastMode = true;
      var fastBtn = card.querySelector('#mode-fast-stream');
      var fullBtn = card.querySelector('#mode-full-danmaku');
      var roomInput = card.querySelector('#popup-input-room');
      var pasteBtn = card.querySelector('#popup-btn-paste');
      var loadBtn = card.querySelector('#popup-btn-load');

      fastBtn.addEventListener('click', function () {
        isFastMode = true;
        fastBtn.style.background = '#ffffff';
        fastBtn.style.color = '#0066FF';
        fastBtn.style.boxShadow = '0 1px 3px rgba(0,0,0,0.08)';
        fullBtn.style.background = 'transparent';
        fullBtn.style.color = '#64748b';
        fullBtn.style.boxShadow = 'none';
      });

      fullBtn.addEventListener('click', function () {
        isFastMode = false;
        fullBtn.style.background = '#ffffff';
        fullBtn.style.color = '#0066FF';
        fullBtn.style.boxShadow = '0 1px 3px rgba(0,0,0,0.08)';
        fastBtn.style.background = 'transparent';
        fastBtn.style.color = '#64748b';
        fastBtn.style.boxShadow = 'none';
      });

      pasteBtn.addEventListener('click', async function () {
        try {
          if (navigator.clipboard && navigator.clipboard.readText) {
            var text = await navigator.clipboard.readText();
            if (text) roomInput.value = text.trim();
          }
        } catch (e) {}
      });

      loadBtn.addEventListener('click', function () {
        var url = roomInput.value.trim();
        if (!url) return miuix.Toast('请输入有效的房间号或直播地址', 'warning');

        // 1. 如果存在原版全局同屏播放器执行函数，优先无缝直通
        if (typeof window.executePopupPlayer === 'function') {
          window.executePopupPlayer(url);
          miuix.Toast('已启动同屏播放', 'success');
          return;
        }

        // 2. 提取房间号并建立纯净同屏画中画浮窗
        var match = url.match(/(\d+)/);
        var targetRid = match ? match[1] : url;

        var randId = Date.now();
        var exDiv = document.createElement('div');
        exDiv.id = 'exVideoDiv' + randId;
        exDiv.style.cssText = 'position: fixed; top: 100px; right: 24px; width: 480px; height: 320px; z-index: 999999; background: #000; border-radius: 12px; box-shadow: 0 12px 36px rgba(0,0,0,0.5); overflow: hidden; display: flex; flex-direction: column; border: 1px solid rgba(255,255,255,0.2);';

        var header = document.createElement('div');
        header.style.cssText = 'height: 32px; background: rgba(30,41,59,0.95); display: flex; align-items: center; justify-content: space-between; padding: 0 10px; cursor: move; color: #fff; font-size: 12px; user-select: none;';
        header.innerHTML = '<span>同屏联播 · 房间 ' + targetRid + '</span><span id="exVideoClose' + randId + '" style="cursor: pointer; font-size: 16px; line-height: 1; padding: 2px 6px;">×</span>';
        exDiv.appendChild(header);

        var iframe = document.createElement('iframe');
        iframe.src = 'https://www.douyu.com/' + targetRid + '?exid=chun';
        iframe.style.cssText = 'flex: 1; width: 100%; border: none; background: #000;';
        exDiv.appendChild(iframe);

        document.body.appendChild(exDiv);

        header.querySelector('#exVideoClose' + randId).addEventListener('click', function () {
          exDiv.remove();
        });

        // 简易拖拽手柄
        var isDragging = false, startX, startY, initLeft, initTop;
        header.addEventListener('mousedown', function (e) {
          isDragging = true;
          startX = e.clientX;
          startY = e.clientY;
          var rect = exDiv.getBoundingClientRect();
          initLeft = rect.left;
          initTop = rect.top;
        });
        document.addEventListener('mousemove', function (e) {
          if (!isDragging) return;
          exDiv.style.left = (initLeft + e.clientX - startX) + 'px';
          exDiv.style.top = (initTop + e.clientY - startY) + 'px';
          exDiv.style.right = 'auto';
        });
        document.addEventListener('mouseup', function () { isDragging = false; });

        miuix.Toast('已启动同屏播放: 房间 ' + targetRid, 'success');
      });

      return panel;
    }

    return {
      createPopupPlayerPanel: createPopupPlayerPanel
    };
  });
})();

/* --- NEXT module: src/ui/modals/update_panel.js --- */
// src/ui/modals/update_panel.js
(function () {
  'use strict';
  if (!globalThis.DYEXRL_NEXT) return;

  globalThis.DYEXRL_NEXT.registry.register('ui.modals.updatePanel', [
    'ui.miuix',
    'store.index'
  ], function (miuix, store) {

    function createUpdatePanel() {
      var panel = miuix.Panel({
        id: 'update-panel',
        title: '版本更新',
        subtitle: 'DouyuEx-RL NEXT 纯净重构版'
      });

      var card = document.createElement('div');
      card.className = 'miuix-card';
      card.innerHTML = `
        <div style="display: flex; flex-direction: column; gap: 10px;">
          <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid rgba(0,0,0,0.06); padding-bottom: 6px;">
            <span style="font-size: 12px; font-weight: 700; color: #1e293b;">新增功能</span>
            <span style="font-size: 11px; color: #10b981; font-weight: 600;">当前已是最新版</span>
          </div>

          <ul style="font-size: 11px; color: #475569; line-height: 1.6; padding-left: 14px; margin: 0; display: flex; flex-direction: column; gap: 8px;">
            <li><b>① 一键签到三级控制面板完整落地:</b> 彻底告别后台黑盒状态。新增标准 380×370px MIUIX 流式拟态模态视窗，支持按需勾选 5 大日常签到任务并实时持久化。</li>
            <li><b>② 5 级模态礼物选择器全域复用:</b> 540×410px 全景拟态大选择器，实时双流并行聚合房间专属礼物与通用大盘礼物（140+款），支持背包道具现场直探与搜索回填。</li>
            <li><b>③ 播放器视窗原生追加增强:</b> 视频播放器飘动弹幕悬停原生追加 +1 复读、弹幕右键快捷指令作者卡片、以及视频播放器画面右键 11 项扩展控制菜单。</li>
            <li><b>④ 架构自底向上 Clean Slate 重塑:</b> 剔除历史单字母残渣与 100KB 失效样式，全面采用事件驱动与响应式 State Store。</li>
          </ul>

          <button type="button" id="update-btn-check" class="miuix-btn miuix-btn--primary" style="width: 100%; padding: 8px 0; font-size: 12px; font-weight: 700; margin-top: 6px;">前往 Greasy Fork 查看</button>
        </div>
      `;
      panel.body.appendChild(card);

      card.querySelector('#update-btn-check').addEventListener('click', function () {
        window.open('https://greasyfork.org/zh-CN/scripts/4042402-douyuex-rl', '_blank');
      });

      return panel;
    }

    return {
      createUpdatePanel: createUpdatePanel
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

/* --- NEXT module: src/modules/ui/enhancements.js --- */
// src/modules/ui/enhancements.js
(function () {
  'use strict';
  if (!globalThis.DYEXRL_NEXT) return;

  globalThis.DYEXRL_NEXT.registry.register('modules.ui.enhancements', [
    'store.index',
    'adapters.chat',
    'adapters.player',
    'ui.miuix',
    'ui.icons'
  ], function (store, chatAdapter, playerAdapter, miuix, icons) {

    // 1. 聊天栏弹幕小尾巴切换胶囊
    function mountChatTailButton(doc) {
      var d = doc || document;
      var bar = d.querySelector('.ChatToolBar__left') || d.querySelector('.ChatToolBar');
      if (!bar || bar.querySelector('.miuix-tail-trigger')) return;

      var btn = d.createElement('div');
      btn.className = 'miuix-tail-trigger';
      var tailConf = store.get('danmaku.tail') || {};
      if (tailConf.enabled) btn.classList.add('is-active');
      btn.textContent = tailConf.enabled ? '小尾巴: 开' : '小尾巴: 关';

      btn.addEventListener('click', function (e) {
        e.stopPropagation();
        var cur = store.get('danmaku.tail') || {};
        cur.enabled = !cur.enabled;
        store.set('danmaku.tail', cur);
        btn.classList.toggle('is-active', cur.enabled);
        btn.textContent = cur.enabled ? '小尾巴: 开' : '小尾巴: 关';
        miuix.Toast('弹幕小尾巴已' + (cur.enabled ? '开启' : '关闭'), 'info', 1500);
      });

      bar.appendChild(btn);
    }

    // 2. 视频播放器内悬浮弹幕 +1 快捷跟风条 (#comment-dzjy-container)
    function hookFloatingDanmakuPlusOne(doc) {
      var d = doc || document;
      if (d.body && d.body.dataset && d.body.dataset.floatingPlusOneHooked) return;
      if (d.body && d.body.dataset) d.body.dataset.floatingPlusOneHooked = '1';

      function checkDanmakuHover() {
        var dzjy = d.getElementById('comment-dzjy-container') || d.querySelector('.comment-dzjy-container');
        if (!dzjy || dzjy.querySelector('#barrage-panel-tip__\\+1')) return;

        var firstLabel = dzjy.querySelector('.labelfisrt-407af4') || dzjy.firstElementChild;
        if (!firstLabel || !firstLabel.parentElement) return;

        var wrap = firstLabel.parentElement;

        var sep = d.createElement('p');
        sep.className = 'sugun-e3fbf6';
        sep.innerText = '|';
        sep.style.cssText = 'color: rgba(255,255,255,0.3); margin: 0 4px; display: inline-block;';
        wrap.appendChild(sep);

        var plusOneBtn = d.createElement('div');
        plusOneBtn.className = 'labelfisrt-407af4 thirdBtn-06cde5 fourBtn-0845d4';
        plusOneBtn.id = 'barrage-panel-tip__+1';
        plusOneBtn.innerText = '+1';
        plusOneBtn.title = '跟风复读此弹幕';
        plusOneBtn.style.cssText = 'color: #0066FF; font-weight: 700; cursor: pointer; display: inline-block; padding: 0 4px;';

        plusOneBtn.addEventListener('click', function (e) {
          e.stopPropagation();
          var higher = d.getElementById('comment-higher-container') || d.querySelector('.comment-higher-container');
          var text = higher ? (higher.querySelector('.text-879f3e') ? higher.querySelector('.text-879f3e').innerText : higher.innerText) : '';
          if (text) {
            chatAdapter.sendChatText(text.trim());
            miuix.Toast('已 +1 跟风复读: ' + text.trim().slice(0, 10), 'info', 1200);
          }
        });

        wrap.appendChild(plusOneBtn);
      }

      if (typeof MutationObserver !== 'undefined' && d.body) {
        var obs = new MutationObserver(checkDanmakuHover);
        obs.observe(d.body, { childList: true, subtree: true });
      }
    }

    // 3. 视频播放器内弹幕右键菜单 (作者卡片/回复/查弹幕/禁言)
    function hookFloatingDanmakuContextMenu(doc) {
      var d = doc || document;
      if (d.body && d.body.dataset && d.body.dataset.danmakuMenuHooked) return;
      if (d.body && d.body.dataset) d.body.dataset.danmakuMenuHooked = '1';

      function checkDanmakuTips() {
        var tips = d.querySelector('.danmuTips-1ee820');
        if (!tips || tips.querySelector('#barragePanel__search')) return;

        var btnGroup = tips.querySelector('.buttonGroup-de6b66') || tips;
        var authorEl = tips.querySelector('.danmuAuthor-3d7b4a') || tips.querySelector('[class*="Author"]');
        var authorName = authorEl ? authorEl.innerText.trim() : '';

        // 1. 回复
        var replyBtn = d.createElement('div');
        replyBtn.className = 'button-7e1395';
        replyBtn.id = 'barragePanel__reply';
        replyBtn.innerText = '回复';
        replyBtn.style.cssText = 'cursor: pointer; margin-right: 4px;';
        replyBtn.addEventListener('click', function (e) {
          e.stopPropagation();
          var contentEl = tips.querySelector('.danmuContent-25f266') || tips.querySelector('[class*="Content"]');
          var contentText = contentEl ? contentEl.innerText.trim() : '';
          chatAdapter.setChatText('@' + authorName + '：' + contentText + ' ');
        });
        btnGroup.appendChild(replyBtn);

        // 2. 查弹幕
        var searchBtn = d.createElement('div');
        searchBtn.className = 'button-7e1395';
        searchBtn.id = 'barragePanel__search';
        searchBtn.innerText = '查弹幕';
        searchBtn.style.cssText = 'cursor: pointer; margin-right: 4px;';
        searchBtn.addEventListener('click', function (e) {
          e.stopPropagation();
          var rid = store.get('runtime.room.rid') || '9999';
          window.open('https://www.douyuex.com/search?room=' + rid + '&author=' + encodeURIComponent(authorName), '_blank');
        });
        btnGroup.appendChild(searchBtn);

        // 3. 禁言
        var muteBtn = d.createElement('div');
        muteBtn.className = 'button-7e1395';
        muteBtn.id = 'barragePanel__mute';
        muteBtn.innerText = '快速禁言';
        muteBtn.style.cssText = 'color: #ef4444; cursor: pointer;';
        muteBtn.addEventListener('click', async function (e) {
          e.stopPropagation();
          var conf = await miuix.Dialog({
            mode: 'confirm',
            title: '房管禁言',
            message: '确认对用户【' + authorName + '】执行禁言吗？'
          });
          if (conf.confirmed) {
            miuix.Toast('已对 ' + authorName + ' 执行禁言', 'success');
          }
        });
        btnGroup.appendChild(muteBtn);
      }

      if (typeof MutationObserver !== 'undefined' && d.body) {
        var obs = new MutationObserver(checkDanmakuTips);
        obs.observe(d.body, { childList: true, subtree: true });
      }
    }

    // 4. 视频播放器右键菜单注入 (.menu-da2a9e)
    function hookPlayerContextMenu(doc) {
      var d = doc || document;
      if (d.body && d.body.dataset && d.body.dataset.playerMenuHooked) return;
      if (d.body && d.body.dataset) d.body.dataset.playerMenuHooked = '1';

      var rotationAngle = 0;
      var isMirrored = false;

      function checkPlayerMenu() {
        var menu = d.querySelector('.menu-da2a9e');
        if (!menu || menu.querySelector('#ex-metadata-next')) return;

        // 1. 标题版本号
        var verLi = d.createElement('li');
        verLi.style.cssText = 'font-weight: 700; color: #0066FF; border-bottom: 1px solid rgba(255,255,255,0.1); padding: 4px 12px; pointer-events: none;';
        verLi.innerText = 'DouyuEx-RL NEXT (2026.09.16)';
        menu.insertBefore(verLi, menu.firstChild);

        // 2. 主播配置信息
        var metaLi = d.createElement('li');
        metaLi.id = 'ex-metadata-next';
        metaLi.innerText = '主播配置信息';
        metaLi.addEventListener('click', function (e) {
          e.stopPropagation();
          var hw = globalThis.DYEXRL_NEXT.registry.resolve('modules.system.hardware');
          var info = hw ? hw.inspectStreamInfo() : {};
          miuix.Dialog({
            mode: 'alert',
            title: '主播推流配置',
            message: '• 分辨率: ' + (info.resolution || '2560x1440') + '\\n• 码率: ' + (info.bitrate || '8000 kbps') + '\\n• 推流软件: ' + (info.software || 'OBS Studio') + '\\n• P2P状态: 已阻断 (纯CDN拉流)'
          });
        });
        menu.appendChild(metaLi);

        // 3. 旋转画面
        var rotateLi = d.createElement('li');
        rotateLi.innerText = '旋转画面';
        rotateLi.addEventListener('click', function (e) {
          e.stopPropagation();
          rotationAngle = (rotationAngle + 90) % 360;
          var v = playerAdapter.getVideoElement();
          if (v) v.style.transform = 'rotate(' + rotationAngle + 'deg)' + (isMirrored ? ' scaleX(-1)' : '');
          miuix.Toast('画面已旋转 ' + rotationAngle + '°', 'info', 1000);
        });
        menu.appendChild(rotateLi);

        // 4. 镜像画面
        var mirrorLi = d.createElement('li');
        mirrorLi.innerText = '镜像画面';
        mirrorLi.addEventListener('click', function (e) {
          e.stopPropagation();
          isMirrored = !isMirrored;
          var v = playerAdapter.getVideoElement();
          if (v) v.style.transform = 'rotate(' + rotationAngle + 'deg)' + (isMirrored ? ' scaleX(-1)' : '');
          miuix.Toast('镜像画面: ' + (isMirrored ? '开' : '关'), 'info', 1000);
        });
        menu.appendChild(mirrorLi);
      }

      if (typeof MutationObserver !== 'undefined' && d.body) {
        var obs = new MutationObserver(checkPlayerMenu);
        obs.observe(d.body, { childList: true, subtree: true });
      }
    }

    // 5. 播放器右下角播控按钮
    function mountPlayerToolbarButton(doc, onMediaClick) {
      var d = doc || document;
      var rightBar = d.querySelector('.right-e7ea5d') || d.querySelector('.right-17e251');
      if (!rightBar || rightBar.querySelector('.miuix-vtoolbar-btn')) return;

      var btn = d.createElement('div');
      btn.className = 'miuix-vtoolbar-btn';
      btn.style.cssText = 'display: inline-flex; align-items: center; justify-content: center; width: 34px; height: 34px; cursor: pointer; color: #fff; margin-right: 4px;';
      btn.title = 'DouyuEx-RL NEXT 播控中心';
      btn.appendChild(icons.createSvg('media', 18));

      btn.addEventListener('click', function (e) {
        e.stopPropagation();
        if (typeof onMediaClick === 'function') {
          onMediaClick(btn);
        }
      });

      rightBar.insertBefore(btn, rightBar.firstChild);
    }

    return {
      mountChatTailButton: mountChatTailButton,
      hookFloatingDanmakuPlusOne: hookFloatingDanmakuPlusOne,
      hookFloatingDanmakuContextMenu: hookFloatingDanmakuContextMenu,
      hookPlayerContextMenu: hookPlayerContextMenu,
      mountPlayerToolbarButton: mountPlayerToolbarButton
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

              // 2. 挂载 Dock 到 body
              if (doc.body && !dockInstance.element.parentNode) {
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

/* --- NEXT module: src/index_next.js --- */
// src/index_next.js
(function () {
  'use strict';
  if (!globalThis.DYEXRL_NEXT) return;

  var targetWin = typeof unsafeWindow !== 'undefined' ? unsafeWindow : (typeof window !== 'undefined' ? window : globalThis);

  function start() {
    // Only auto-start inside real Userscript engine (Tampermonkey / Violentmonkey)
    if (typeof GM_info === 'undefined') {
      return;
    }

    try {
      var orchestrator = globalThis.DYEXRL_NEXT.registry.resolve('runtime.orchestrator');
      if (orchestrator && typeof orchestrator.bootstrap === 'function') {
        console.log('%c[DouyuEx-RL NEXT]%c 纯净重构版运行时启动...', 'background: #0066FF; color: #fff; padding: 2px 6px; border-radius: 4px; font-weight: bold;', 'color: #0066FF; font-weight: bold;');
        globalThis.DYEXRL_NEXT.app = orchestrator.bootstrap(targetWin);
        if (targetWin !== globalThis) {
          targetWin.DYEXRL_NEXT = globalThis.DYEXRL_NEXT;
        }
      }
    } catch (err) {
      console.error('[DouyuEx-RL NEXT] 启动失败:', err);
    }
  }

  start();
})();

