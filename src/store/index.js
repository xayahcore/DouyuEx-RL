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
