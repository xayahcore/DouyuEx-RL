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
