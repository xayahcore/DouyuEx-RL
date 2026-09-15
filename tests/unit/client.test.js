// tests/unit/client.test.js
const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

function createClientEnvironment() {
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
    document: { cookie: 'ccn=test_ccn_123; post-csrfToken=test_csrf_456' },
    fetch: async (url, opts) => {
      // Mock fetch
      return {
        ok: true,
        status: 200,
        statusText: 'OK',
        text: async () => JSON.stringify({ error: 0, msg: 'success', data: { testUrl: url, body: opts.body } })
      };
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

  return context.globalThis.DYEXRL_NEXT.registry;
}

test('Client: resolves endpoint URLs and injects query params', async () => {
  const registry = createClientEnvironment();
  const client = registry.resolve('api.client');

  const res = await client.get('room.betard', { rid: '9999' });
  assert.strictEqual(res.data.error, 0);
  assert.ok(res.data.data.testUrl.includes('/betard/9999'));
});

test('Client: automatically injects ccn and csrfToken for routine endpoints', async () => {
  const registry = createClientEnvironment();
  const client = registry.resolve('api.client');

  const res = await client.post('routine.followAdd', { rid: '12877029' });
  assert.strictEqual(res.data.error, 0);
  assert.ok(res.data.data.body.includes('ctn=test_ccn_123'));
  assert.ok(res.data.data.body.includes('rid=12877029'));
});

test('Client: throws on unregistered endpoint', async () => {
  const registry = createClientEnvironment();
  const client = registry.resolve('api.client');

  await assert.rejects(async () => {
    await client.get('non.existent.endpoint');
  }, /Unregistered endpoint/);
});
