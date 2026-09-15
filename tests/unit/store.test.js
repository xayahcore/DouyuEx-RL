// tests/unit/store.test.js
const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

function createNextStoreEnvironment(mockStorage = {}) {
  const context = {
    globalThis: {},
    window: {},
    console: console,
    Date: Date,
    JSON: JSON,
    Map: Map,
    Set: Set,
    Array: Array,
    Object: Object,
    String: String,
    Number: Number,
    Boolean: Boolean,
    Promise: Promise,
    setTimeout: setTimeout,
    clearTimeout: clearTimeout,
    localStorage: {
      _data: { ...mockStorage },
      getItem(k) { return this._data.hasOwnProperty(k) ? this._data[k] : null; },
      setItem(k, v) { this._data[k] = String(v); },
      removeItem(k) { delete this._data[k]; }
    }
  };
  context.window = context;
  vm.createContext(context);

  const manifestPath = path.join(__dirname, '../../build/next-manifest.json');
  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));

  for (const relFile of manifest.files) {
    const code = fs.readFileSync(path.join(__dirname, '../../', relFile), 'utf8');
    vm.runInContext(code, context);
  }

  return {
    registry: context.globalThis.DYEXRL_NEXT.registry,
    context: context
  };
}

test('Runtime.Scope: disposers, timers and lifecycle destruction', () => {
  const { registry } = createNextStoreEnvironment();
  const { createScope } = registry.resolve('runtime.scope');

  const scope = createScope({ generation: 1 });
  assert.strictEqual(scope.isDestroyed, false);

  let disposedA = false;
  let disposedB = false;
  let timerFired = false;

  scope.add(() => { disposedA = true; });
  scope.add(() => { disposedB = true; });
  scope.timeout(() => { timerFired = true; }, 100);

  scope.destroy();
  assert.strictEqual(scope.isDestroyed, true);
  assert.strictEqual(disposedA, true);
  assert.strictEqual(disposedB, true);
  assert.strictEqual(timerFired, false); // Cancelled timer
});

test('Store.Schema: rejects prototype pollution attacks', () => {
  const { registry } = createNextStoreEnvironment();
  const schema = registry.resolve('store.schema');

  assert.throws(() => {
    schema.sanitizePath('__proto__.polluted');
  }, /Forbidden property access/);

  assert.throws(() => {
    schema.sanitizePath('settings.constructor.name');
  }, /Forbidden property access/);

  const obj = { a: { b: 10 } };
  schema.setByPath(obj, 'a.c', 20);
  assert.strictEqual(schema.getByPath(obj, 'a.c'), 20);
});

test('Store.Index: reactive state, subscription and path updates', () => {
  const { registry } = createNextStoreEnvironment();
  const store = registry.resolve('store.index');

  let notifiedVal = null;
  const unsub = store.subscribe('danmaku.autoReplyCd', (val) => {
    notifiedVal = val;
  });

  store.set('danmaku.autoReplyCd', 15);
  assert.strictEqual(store.get('danmaku.autoReplyCd'), 15);
  assert.strictEqual(notifiedVal, 15);

  unsub();
  store.set('danmaku.autoReplyCd', 20);
  assert.strictEqual(notifiedVal, 15); // Not notified after unsubscribe
});

test('Store.Migrator: migrates legacy ExSave keys and is idempotent', () => {
  const mockLegacy = {
    'ExSave_DanmakuTail': JSON.stringify({ isTailEnabled: true, tailContent: ' [尾巴测试]', type: '1' }),
    'ExSave_SignConfig': JSON.stringify({ room: true, client: false, yuba: true }),
    'ExSave_FansContinue': '10'
  };

  const { registry } = createNextStoreEnvironment(mockLegacy);
  const store = registry.resolve('store.index');
  const migrator = registry.resolve('store.migrator');

  const result = migrator.migrateLegacyData();
  assert.strictEqual(result.success, true);
  assert.ok(result.migratedCount >= 3);

  // Check store values
  assert.strictEqual(store.get('danmaku.tail.enabled'), true);
  assert.strictEqual(store.get('danmaku.tail.text'), ' [尾巴测试]');
  assert.strictEqual(store.get('danmaku.tail.type'), '1');
  assert.strictEqual(store.get('economy.fansContinueCount'), 10);
  assert.strictEqual(store.get('economy.signConfig.client'), false);

  // Second run skips idempotently
  const secondRun = migrator.migrateLegacyData();
  assert.strictEqual(secondRun.success, true);
  assert.strictEqual(secondRun.skipped, true);
});
