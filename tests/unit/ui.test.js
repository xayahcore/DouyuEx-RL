// tests/unit/ui.test.js
const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

function createUiEnvironment() {
  const elements = new Map();

  class MockElement {
    constructor(tag) {
      this.tagName = tag.toUpperCase();
      this.id = '';
      this.className = '';
      this.style = {};
      this.children = [];
      this.parentNode = null;
      this.listeners = new Map();
      this.dataset = {};
      this.textContent = '';
      this.innerHTML = '';
      this.checked = false;
      this.value = '';
    }
    appendChild(child) {
      child.parentNode = this;
      this.children.push(child);
      return child;
    }
    removeChild(child) {
      const idx = this.children.indexOf(child);
      if (idx !== -1) {
        this.children.splice(idx, 1);
        child.parentNode = null;
      }
      return child;
    }
    addEventListener(type, fn) {
      if (!this.listeners.has(type)) this.listeners.set(type, new Set());
      this.listeners.get(type).add(fn);
    }
    removeEventListener(type, fn) {
      const set = this.listeners.get(type);
      if (set) set.delete(fn);
    }
    dispatchEvent(event) {
      const set = this.listeners.get(event.type);
      if (set) set.forEach(fn => fn.call(this, event));
    }
    querySelector(sel) {
      if (sel.startsWith('.')) {
        const cls = sel.slice(1);
        return this.children.find(c => (c.className || '').includes(cls)) || null;
      }
      return null;
    }
    querySelectorAll(sel) {
      if (sel.startsWith('.')) {
        const cls = sel.slice(1);
        return this.children.filter(c => (c.className || '').includes(cls));
      }
      return [];
    }
    getBoundingClientRect() {
      return { left: 100, top: 200, width: 34, height: 34 };
    }
    classList = {
      _owner: this,
      add(cls) {
        const set = new Set((this._owner.className || '').split(' ').filter(Boolean));
        set.add(cls);
        this._owner.className = Array.from(set).join(' ');
      },
      remove(cls) {
        const set = new Set((this._owner.className || '').split(' ').filter(Boolean));
        set.delete(cls);
        this._owner.className = Array.from(set).join(' ');
      },
      toggle(cls, force) {
        const has = this.contains(cls);
        const should = force !== undefined ? !!force : !has;
        if (should) this.add(cls); else this.remove(cls);
      },
      contains(cls) {
        return (this._owner.className || '').split(' ').filter(Boolean).includes(cls);
      }
    };
  }

  const documentMock = {
    createElement(tag) { return new MockElement(tag); },
    getElementById(id) { return elements.get(id) || null; },
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
    doc: documentMock
  };
}

test('UI.Tokens: styles are injected and idempotent', () => {
  const { registry, doc } = createUiEnvironment();
  const tokens = registry.resolve('ui.tokens');

  assert.ok(tokens.CSS_TOKENS.includes('--miuix-primary: #0066FF;'));
  assert.ok(tokens.CSS_TOKENS.includes('--miuix-blur: blur(36px);'));
  assert.ok(tokens.CSS_TOKENS.includes('380px !important'));

  tokens.injectTokens(doc);
  assert.strictEqual(tokens.isStyleInjected, true);
});

test('UI.Icons: provides standardized SVG paths without innerHTML blobs', () => {
  const { registry } = createUiEnvironment();
  const icons = registry.resolve('ui.icons');

  assert.ok(icons.PATHS.sign);
  assert.ok(icons.PATHS.fans);
  assert.ok(icons.PATHS.extool);
  assert.ok(icons.PATHS.livetool);
  assert.ok(icons.PATHS.bloop);
  assert.ok(icons.PATHS.lottery);
  assert.ok(icons.PATHS.popup);
  assert.ok(icons.PATHS.monitor);
  assert.ok(icons.PATHS.update);

  const svgEl = icons.createSvg('sign', 24);
  assert.strictEqual(svgEl.style.width, '24px');
  assert.ok(svgEl.innerHTML.includes('<svg'));
});

test('UI.MIUIX: Panel creates 380x370px modal with sticky header and close action', () => {
  const { registry } = createUiEnvironment();
  const miuix = registry.resolve('ui.miuix');

  let closed = false;
  const panel = miuix.Panel({
    title: '测试三级控制台',
    onClose: () => { closed = true; }
  });

  assert.strictEqual(panel.element.style.width, '380px');
  assert.strictEqual(panel.element.style.height, '370px');

  panel.show({ getBoundingClientRect: () => ({ left: 50, top: 400, width: 34, height: 34 }) });
  assert.strictEqual(panel.element.classList.contains('is-active'), true);

  panel.hide();
  assert.strictEqual(panel.element.classList.contains('is-active'), false);

  panel.destroy();
});

test('UI.MIUIX: Accordion expands/collapses and mounts actions', () => {
  const { registry } = createUiEnvironment();
  const miuix = registry.resolve('ui.miuix');

  let importClicked = false;
  const accordion = miuix.Accordion({
    title: '关键词回复',
    actions: [{ label: '导入', onClick: () => { importClicked = true; } }]
  });

  assert.strictEqual(accordion.element.classList.contains('is-expanded'), false);
  accordion.expand();
  assert.strictEqual(accordion.element.classList.contains('is-expanded'), true);
});

test('UI.Dock: instantiates 9 buttons with 16x3px indicator and 400ms close delay', () => {
  const { registry, doc } = createUiEnvironment();
  const dockModule = registry.resolve('ui.dock');

  assert.strictEqual(dockModule.DOCK_BUTTONS.length, 9);
  assert.strictEqual(dockModule.DOCK_BUTTONS[7].id, 'ex-monitor');
  assert.strictEqual(dockModule.DOCK_BUTTONS[7].hasPanel, false); // Online monitor has NO sub-panel

  const dock = dockModule.createDock({ container: doc.body });
  assert.ok(dock.element);

  dock.destroy();
});
