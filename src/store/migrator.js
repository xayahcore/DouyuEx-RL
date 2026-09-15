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
