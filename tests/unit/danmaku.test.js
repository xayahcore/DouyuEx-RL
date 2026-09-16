// tests/unit/danmaku.test.js
const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

function createDanmakuEnvironment() {
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
    click() {
      const s = this.listeners.get('click');
      if (s) s.forEach(fn => fn({ stopPropagation: () => {}, preventDefault: () => {} }));
    }
    addEventListener(t, fn) {
      if (!this.listeners.has(t)) this.listeners.set(t, new Set());
      this.listeners.get(t).add(fn);
    }
    dispatchEvent(ev) { return true; }
    contains(target) { return true; }
  }

  const documentMock = {
    createElement(tag) { return new MockElement(tag); },
    getElementById(id) { return null; },
    querySelector(sel) { return new MockElement('textarea'); },
    querySelectorAll(sel) { return []; },
    body: new MockElement('body'),
    documentElement: new MockElement('html'),
    addEventListener: (t, fn) => {}
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
    Event: class { constructor(t) { this.type = t; } }
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

test('Danmaku.Tail: appends prefix/suffix correctly without duplication', () => {
  const { registry, store } = createDanmakuEnvironment();
  const tail = registry.resolve('modules.danmaku.tail');

  store.set('danmaku.tail', { enabled: true, text: ' [666]', type: '2' });
  const res1 = tail.appendTailToText('主播牛逼');
  assert.strictEqual(res1, '主播牛逼 [666]');

  // No duplicate
  const res2 = tail.appendTailToText('主播牛逼 [666]');
  assert.strictEqual(res2, '主播牛逼 [666]');
});

test('Danmaku.Collect: deduplicates and adds to collection list', () => {
  const { registry, store } = createDanmakuEnvironment();
  const collect = registry.resolve('modules.danmaku.collect');

  collect.addCollection('这是第一条弹幕');
  collect.addCollection('这是第一条弹幕'); // duplicate
  collect.addCollection('这是第二条弹幕');

  const list = store.get('danmaku.collections');
  assert.strictEqual(list.length, 2);
  assert.strictEqual(list[0].content, '这是第二条弹幕');
});

test('Danmaku.AutoReply: triggers reply when keyword matches rule', () => {
  const { registry, store } = createDanmakuEnvironment();
  const autoReply = registry.resolve('modules.danmaku.autoReply');

  store.set('danmaku.autoReplyEnabled', true);
  store.set('danmaku.autoReplyRules', [
    { keyword: '背景音乐', content: 'BGM是: The Next Episode' }
  ]);

  const replied = autoReply.handleIncomingDanmaku('求背景音乐是什么？', '12345');
  assert.strictEqual(replied, true);

  // CD check (5s)
  const repliedAgain = autoReply.handleIncomingDanmaku('背景音乐歌名？', '12345');
  assert.strictEqual(repliedAgain, false);
});

test('Danmaku.Filter: detects and removes repeated danmaku within time window', () => {
  const { registry, store } = createDanmakuEnvironment();
  const filter = registry.resolve('modules.danmaku.filter');

  store.set('danmaku.filter', { removeRepeated: true, repeatWindowSeconds: 5 });

  const f1 = filter.shouldFilterMessage('刷屏测试123');
  assert.strictEqual(f1, false);

  const f2 = filter.shouldFilterMessage('刷屏测试123');
  assert.strictEqual(f2, true); // Filtered!
});
