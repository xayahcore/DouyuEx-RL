// tests/unit/orchestrator.test.js
const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

function createFullBootstrapEnvironment() {
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
      this.value = '';
      this.dataset = {};
    }
    appendChild(c) { c.parentNode = this; this.children.push(c); return c; }
    removeChild(c) {
      const idx = this.children.indexOf(c);
      if (idx !== -1) { this.children.splice(idx, 1); c.parentNode = null; }
      return c;
    }
    remove() {
      if (this.parentNode && typeof this.parentNode.removeChild === 'function') {
        this.parentNode.removeChild(this);
      }
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
      if (sel.startsWith('#')) {
        const id = sel.slice(1);
        if (this.id === id) return this;
        for (const c of this.children) {
          const res = c.querySelector ? c.querySelector(sel) : null;
          if (res) return res;
        }
      }
      return new MockElement('div');
    }
    querySelectorAll(sel) { return []; }
  }

  const localStorageMock = {
    _data: {
      ExSave_Tail_status: '1',
      ExSave_Tail_txt: ' [自动尾巴测试]'
    },
    getItem(k) { return this._data[k] || null; },
    setItem(k, v) { this._data[k] = String(v); },
    removeItem(k) { delete this._data[k]; },
    clear() { this._data = {}; }
  };

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
    location: { href: 'https://www.douyu.com/9999', pathname: '/9999' },
    globalThis: {
      location: { href: 'https://www.douyu.com/9999', pathname: '/9999' },
      localStorage: localStorageMock
    },
    localStorage: localStorageMock,
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
    URL: URL,
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
    targetWindow: context
  };
}

test('Orchestrator: full bootstrap lifecycle wires migration, core, dock, and panels', () => {
  const { registry, store, targetWindow } = createFullBootstrapEnvironment();
  const orchestrator = registry.resolve('runtime.orchestrator');

  const app = orchestrator.bootstrap(targetWindow);

  try {
    // 1. Check legacy migration happened
    assert.strictEqual(store.get('danmaku.tail.enabled'), true);
    assert.strictEqual(store.get('danmaku.tail.text'), ' [自动尾巴测试]');

    // 2. Check Dock is mounted in body
    const dock = app.getDockInstance();
    assert.ok(dock);
    assert.strictEqual(dock.element.className, 'miuix-dock-wrap');

    // 3. Check Panels are instantiated
    const panels = app.getPanels();
    assert.ok(panels.fans);
    assert.ok(panels.sign);
    assert.ok(panels.livetool);
    assert.ok(panels.media);
    assert.ok(panels.setting);
  } finally {
    // 4. Teardown
    app.destroy();
  }

  assert.strictEqual(app.getActiveRoomScope(), null);
  assert.strictEqual(app.getDockInstance(), null);
});
