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

