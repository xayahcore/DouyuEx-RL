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
