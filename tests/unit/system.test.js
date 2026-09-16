// tests/unit/system.test.js
const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

function createSystemEnvironment() {
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
      this.attrs = new Map();
      this.nodeType = 1;
    }
    setAttribute(k, v) { this.attrs.set(k, v); }
    getAttribute(k) { return this.attrs.get(k) || null; }
    appendChild(c) { c.parentNode = this; this.children.push(c); return c; }
    removeChild(c) {
      const idx = this.children.indexOf(c);
      if (idx !== -1) { this.children.splice(idx, 1); c.parentNode = null; }
      return c;
    }
    insertBefore(n, ref) {
      this.children.push(n);
      n.parentNode = this;
      return n;
    }
    addEventListener(t, fn) {
      if (!this.listeners.has(t)) this.listeners.set(t, new Set());
      this.listeners.get(t).add(fn);
    }
    click() {
      const s = this.listeners.get('click');
      if (s) s.forEach(fn => fn({ stopPropagation: () => {}, preventDefault: () => {} }));
    }
    querySelector(sel) {
      if (sel.includes('FansMedal')) {
        return this.children.find(c => c.className.includes('FansMedal')) || null;
      }
      return null;
    }
  }

  const documentMock = {
    createElement(tag) { return new MockElement(tag); },
    getElementById(id) { return null; },
    querySelector(sel) { return new MockElement('div'); },
    querySelectorAll(sel) { return []; },
    body: new MockElement('body'),
    documentElement: new MockElement('html'),
    addEventListener: () => {}
  };

  const context = {
    globalThis: {
      room_args: { rate: '8000', stream_url: 'http://live.douyu.com/obs_live.flv' }
    },
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
    setInterval: setInterval,
    clearInterval: clearInterval,
    document: documentMock,
    Node: MockElement
  };
  context.window = context;
  context.globalThis.window = context;
  vm.createContext(context);

  const manifestPath = path.join(__dirname, '../../build/next-manifest.json');
  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));

  for (const relFile of manifest.files) {
    const code = fs.readFileSync(path.join(__dirname, '../../', relFile), 'utf8');
    vm.runInContext(code, context);
  }

  return {
    registry: context.globalThis.DYEXRL_NEXT.registry,
    store: context.globalThis.DYEXRL_NEXT.registry.resolve('store.index'),
    MockElement: MockElement
  };
}

test('System.Hardware: inspects stream info, detects OBS and bitrate', () => {
  const { registry } = createSystemEnvironment();
  const hardware = registry.resolve('modules.system.hardware');

  const info = hardware.inspectStreamInfo();
  assert.strictEqual(info.software, 'OBS Studio');
  assert.strictEqual(info.bitrate, '8000 kbps');
  assert.strictEqual(info.p2pBlocked, true);
});

test('System.Lottery: parses broadcast message and tracks prize history', () => {
  const { registry } = createSystemEnvironment();
  const lottery = registry.resolve('modules.radar.lottery');

  lottery.handleBroadcastMessage({
    type: 'spbc',
    rid: '9999',
    snick: '超级神豪',
    gn: '幻神神龙'
  });

  const prizes = lottery.getActivePrizes();
  assert.strictEqual(prizes.length, 1);
  assert.strictEqual(prizes[0].rid, '9999');
  assert.strictEqual(prizes[0].sender, '超级神豪');
  assert.strictEqual(prizes[0].giftName, '幻神神龙');
});

test('System.FansHighlight: marks 300-day iron fan label', () => {
  const { registry, MockElement } = createSystemEnvironment();
  const fansHighlight = registry.resolve('modules.system.fansHighlight');

  const parent = new MockElement('div');
  const medal = new MockElement('span');
  medal.className = 'FansMedal';
  medal.setAttribute('title', '佩戴320天');
  parent.appendChild(medal);

  fansHighlight.processDanmakuNode(parent);

  const tag = parent.children.find(c => c.className === 'iron-fan-badge');
  assert.ok(tag);
  assert.strictEqual(tag.textContent, '【320天铁粉】');
});

test('System.Account: stores and retrieves multi-account profiles', () => {
  const { registry, store } = createSystemEnvironment();
  const account = registry.resolve('modules.system.account');

  account.addAccount('小号A', 'acf_uid=1111; dy_did=aaa;');
  account.addAccount('大号B', 'acf_uid=2222; dy_did=bbb;');

  const list = account.getAccounts();
  assert.strictEqual(list.length, 2);
  assert.strictEqual(list[0].name, '小号A');
  assert.strictEqual(list[1].name, '大号B');

  account.removeAccount(list[0].id);
  assert.strictEqual(account.getAccounts().length, 1);
});
