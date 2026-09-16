// tests/unit/media.test.js
const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

function createMediaEnvironment() {
  class MockElement {
    constructor(tag) {
      this.tagName = tag.toUpperCase();
      this.id = '';
      this.className = '';
      this.style = {};
      this.children = [];
      this.parentNode = null;
      this.listeners = new Map();
      this.value = '';
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
  }

  const documentMock = {
    createElement(tag) { return new MockElement(tag); },
    getElementById(id) { return null; },
    querySelector(sel) { return new MockElement('video'); },
    querySelectorAll(sel) { return []; },
    body: new MockElement('body'),
    documentElement: new MockElement('html'),
    addEventListener: () => {}
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
    Node: MockElement
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
    store: context.globalThis.DYEXRL_NEXT.registry.resolve('store.index')
  };
}

test('Media.Filters: calculates filter string and resets to defaults', () => {
  const { registry } = createMediaEnvironment();
  const filters = registry.resolve('modules.media.filters');

  const defStr = filters.getFilterString();
  assert.ok(defStr.includes('brightness(100%)'));
  assert.ok(defStr.includes('contrast(100%)'));

  filters.setFilter('brightness', 150);
  const updatedStr = filters.getFilterString();
  assert.ok(updatedStr.includes('brightness(150%)'));

  filters.resetFilters();
  const resetStr = filters.getFilterString();
  assert.ok(resetStr.includes('brightness(100%)'));
});

test('Media.AssExport: records track and generates standard ASS header/events', () => {
  const { registry } = createMediaEnvironment();
  const assExport = registry.resolve('modules.media.assExport');

  assExport.startTracking();
  assExport.recordDanmaku('主播牛逼', 'FFFFFF', 'UserA');
  assExport.recordDanmaku('666666', 'FF0000', 'UserB');

  assert.strictEqual(assExport.count, 2);

  const content = assExport.generateAssContent();
  assert.ok(content.includes('[Script Info]'));
  assert.ok(content.includes('[V4+ Styles]'));
  assert.ok(content.includes('Dialogue: 0,'));
  assert.ok(content.includes('主播牛逼'));
  assert.ok(content.includes('666666'));
});

test('Media.Pip: toggles floating window container', () => {
  const { registry } = createMediaEnvironment();
  const pip = registry.resolve('modules.media.pip');

  assert.strictEqual(pip.isFloating, false);
  const opened = pip.toggleFloatingWindow();
  assert.strictEqual(opened, true);
  assert.strictEqual(pip.isFloating, true);

  const closed = pip.toggleFloatingWindow();
  assert.strictEqual(closed, false);
  assert.strictEqual(pip.isFloating, false);
});
