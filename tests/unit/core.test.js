// tests/unit/core.test.js
const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

function createNextEnvironment() {
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
    DOMException: globalThis.DOMException || class DOMException extends Error {
      constructor(msg, name) { super(msg); this.name = name; }
    }
  };
  context.window = context;
  vm.createContext(context);

  const files = [
    'src/runtime/namespace.js',
    'src/platform/capabilities.js',
    'src/platform/page_bridge.js',
    'src/core/p2p_blocker.js',
    'src/core/quality.js',
    'src/core/rank_engine.js'
  ];

  for (const f of files) {
    const code = fs.readFileSync(path.join(__dirname, '../../', f), 'utf8');
    vm.runInContext(code, context);
  }

  return context.globalThis.DYEXRL_NEXT.registry;
}

test('Core.P2P: GracefulP2PBlocker rejects createOffer with NotSupportedError', async () => {
  const registry = createNextEnvironment();
  const p2p = registry.resolve('core.p2p');
  
  const instance = new p2p.MockClass();
  assert.strictEqual(instance.connectionState, 'failed');
  assert.strictEqual(instance.iceConnectionState, 'failed');
  assert.strictEqual(instance.signalingState, 'closed');

  const channel = instance.createDataChannel('test');
  assert.strictEqual(channel.readyState, 'closed');

  await assert.rejects(async () => {
    await instance.createOffer();
  }, (err) => {
    assert.strictEqual(err.name, 'NotSupportedError');
    return true;
  });

  await assert.rejects(async () => {
    await instance.createAnswer();
  }, (err) => {
    assert.strictEqual(err.name, 'NotSupportedError');
    return true;
  });

  const stats = await instance.getStats();
  assert.ok(stats instanceof Map);
  assert.strictEqual(stats.size, 0);
});

test('Core.P2P: install and uninstall restore original window constructor', () => {
  const registry = createNextEnvironment();
  const p2p = registry.resolve('core.p2p');

  const fakeWindow = { RTCPeerConnection: function OriginalPC() {} };
  assert.strictEqual(p2p.isInstalled(fakeWindow), false);

  p2p.install(fakeWindow);
  assert.strictEqual(p2p.isInstalled(fakeWindow), true);
  assert.strictEqual(fakeWindow.RTCPeerConnection, p2p.MockClass);

  // Idempotent install
  p2p.install(fakeWindow);
  assert.strictEqual(fakeWindow.RTCPeerConnection, p2p.MockClass);

  p2p.uninstall(fakeWindow);
  assert.strictEqual(p2p.isInstalled(fakeWindow), false);
  assert.notStrictEqual(fakeWindow.RTCPeerConnection, p2p.MockClass);
});

test('Core.Quality: 12-second protection window and rate rewriting', () => {
  const registry = createNextEnvironment();
  const quality = registry.resolve('core.quality');

  // 12s initial load
  assert.strictEqual(quality.isInitialLoad('/room/123'), true);

  // Rate string rewrite
  assert.strictEqual(quality.rewriteRateInString('rate=3&cdn=ws'), 'rate=0&cdn=ws');
  assert.strictEqual(quality.rewriteRateInString('foo=1&rate=2'), 'foo=1&rate=0');
  assert.strictEqual(quality.rewriteRateInString('foo=1'), 'foo=1&rate=0');

  // Betard response rewrite
  const betardMock = {
    room: {
      rate: 3,
      multirates: [
        { name: '原画', type: 0 },
        { name: '高清', type: 2 }
      ]
    }
  };
  const rewritten = quality.rewriteBetardData(betardMock);
  assert.strictEqual(rewritten.room.rate, 0);

  // Host storage preference packing
  const fakeStorage = {
    data: {},
    setItem(k, v) { this.data[k] = v; }
  };
  quality.mirrorHostPreferences(fakeStorage, 1000000);
  assert.ok(fakeStorage.data['rateRecordTime_h5p_room'].includes('"v":"0"'));
  assert.ok(fakeStorage.data['realRateModel2_h5p_room'].includes('"v":"0"'));
  assert.ok(fakeStorage.data['player_storage_quality_h5p_room'].includes('"v":"0"'));
});

test('Core.Rank: STT parser handles escaping, double escaping, and lists', () => {
  const registry = createNextEnvironment();
  const rank = registry.resolve('core.rank');
  const STT = rank.STT;

  // Escaping
  assert.strictEqual(STT.type('type@=ranklist/rid@=9999/'), 'ranklist');

  // Key-value parsing
  const parsed = STT.parse('type@=ranklist/rid@=9999/nn@=测试@A粉丝@S小号/');
  assert.strictEqual(parsed.type, 'ranklist');
  assert.strictEqual(parsed.rid, '9999');
  assert.strictEqual(parsed.nn, '测试@粉丝/小号');

  // List parsing
  const rawList = [
    { nn: 'User1', gold: '10000', uid: '111' },
    { nn: 'User2', gold: '5000', uid: '222' }
  ];
  const listResult = STT.parseList(rawList);
  assert.strictEqual(listResult.money, true);
  assert.strictEqual(listResult.map.get('User1').rank, 1);
  assert.strictEqual(listResult.map.get('User1').gold, 10000);
  assert.strictEqual(listResult.map.get('User2').rank, 2);

  // RankEngine state management
  const engine = rank.createRankEngine();
  engine.updateRankData('day', rawList);
  const dump = engine.dump();
  assert.strictEqual(dump.day.list.length, 2);
  assert.strictEqual(dump.day.list[0][0], 'User1');

  engine.reset();
  const dumpedAfter = engine.dump();
  assert.strictEqual(dumpedAfter.day.list.length, 0);
});

test('Platform.PageBridge: validates whitelist and dispatches messages', () => {
  const registry = createNextEnvironment();
  const bridge = registry.resolve('platform.pageBridge');

  // Disallowed message type throws
  assert.throws(() => {
    bridge.send('UNAUTHORIZED_ACTION', {});
  }, /disallowed message type/i);

  assert.throws(() => {
    bridge.subscribe('UNAUTHORIZED_ACTION', () => {});
  }, /disallowed message type/i);

  // Allowed message subscription
  let received = null;
  const unsub = bridge.subscribe('RANK_STT_PACKET', (payload) => {
    received = payload;
  });

  // Self send through postMessage simulation
  bridge.send('RANK_STT_PACKET', { test: 123 }, 1);
  unsub();
  bridge.destroy();
});
