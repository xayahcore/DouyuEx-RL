// tests/unit/economy.test.js
const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

function createEconomyEnvironment() {
  class MockElement {
    constructor(tag) {
      this.tagName = tag.toUpperCase();
      this.id = '';
      this.className = '';
      this.style = {};
      this.children = [];
      this.parentNode = null;
      this.listeners = new Map();
      this.textContent = '';
      this.innerHTML = '';
      this.checked = false;
      this.value = '';
    }
    appendChild(c) { c.parentNode = this; this.children.push(c); return c; }
    removeChild(c) {
      const idx = this.children.indexOf(c);
      if (idx !== -1) { this.children.splice(idx, 1); c.parentNode = null; }
      return c;
    }
    addEventListener(t, fn) {
      if (!this.listeners.has(t)) this.listeners.set(t, new Set());
      this.listeners.get(t).add(fn);
    }
    removeEventListener(t, fn) {
      const s = this.listeners.get(t);
      if (s) s.delete(fn);
    }
    querySelector(sel) {
      if (sel.startsWith('#')) {
        const id = sel.slice(1);
        if (this.id === id) return this;
        for (const child of this.children) {
          const res = child.querySelector ? child.querySelector(sel) : null;
          if (res) return res;
        }
      }
      return null;
    }
  }

  const documentMock = {
    createElement(tag) { return new MockElement(tag); },
    getElementById(id) { return null; },
    querySelector(sel) { return null; },
    body: new MockElement('body'),
    documentElement: new MockElement('html')
  };

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
    document: documentMock,
    Node: MockElement,
    fetch: async (url, opts) => {
      // Mock APIs
      if (url.includes('backpack/web/v5')) {
        return {
          ok: true,
          text: async () => JSON.stringify({
            error: 0,
            data: {
              list: [
                { id: 268, name: '粉丝荧光棒', count: 20 },
                { id: 1001, name: '弱鸡', count: 5 }
              ]
            }
          })
        };
      }
      if (url.includes('donate/mainsite/v1')) {
        return {
          ok: true,
          text: async () => JSON.stringify({ error: 0, msg: 'success' })
        };
      }
      if (url.includes('fishing/homePage')) {
        return {
          ok: true,
          text: async () => JSON.stringify({
            error: 0,
            data: {
              user: { baitNum: 10 },
              fishing: { stat: 0, fishEtMs: 0 }
            }
          })
        };
      }
      return {
        ok: true,
        text: async () => JSON.stringify({ error: 0, msg: 'success', data: {} })
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

test('Economy.Backpack: fetches backpack items and maps props correctly', async () => {
  const registry = createEconomyEnvironment();
  const backpack = registry.resolve('modules.economy.backpack');

  const items = await backpack.fetchBackpackItems('9999');
  assert.strictEqual(items.length, 2);
  assert.strictEqual(items[0].name, '粉丝荧光棒');
  assert.strictEqual(items[0].count, 20);
});

test('Economy.FansContinue: identifies glow stick and donates quota', async () => {
  const registry = createEconomyEnvironment();
  const fans = registry.resolve('modules.economy.fansContinue');

  const res = await fans.executeFansRenewal({ count: 5 });
  assert.strictEqual(res.success, true);
  assert.strictEqual(res.count, 5);
});

test('Economy.SignEngine: executes full 5-task sign pipeline', async () => {
  const registry = createEconomyEnvironment();
  const signEngine = registry.resolve('modules.economy.signEngine');

  const logs = [];
  const res = await signEngine.executeSignPipeline(null, (l) => logs.push(l));

  assert.strictEqual(res.success, true);
  assert.ok(logs.some(l => l.includes('签到环境')));
  assert.ok(logs.some(l => l.includes('全部已选签到任务执行完毕')));
});

test('Economy.AutoFish: recognizes contest time window and status', () => {
  const registry = createEconomyEnvironment();
  const autofish = registry.resolve('modules.economy.autofish');

  assert.strictEqual(autofish.isRunning, false);
  assert.strictEqual(typeof autofish.isContestTime, 'function');
});
