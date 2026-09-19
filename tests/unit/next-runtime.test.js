const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const ROOT_DIR = path.resolve(__dirname, '../..');
const ARTIFACT_PATH = path.join(ROOT_DIR, 'artifacts/next/DouyuEx_RL_NEXT.user.js');

test('NEXT Runtime: full cold-start simulation with zero TDZ / ReferenceError', () => {
  const code = fs.readFileSync(ARTIFACT_PATH, 'utf8');

  class MockEvent { constructor(name) { this.name = name; } }
  class MockWebSocket {}
  class MockFileReader { readAsText() {} }
  class MockMutationObserver { observe() {} disconnect() {} }
  function MockNode() {}
  MockNode.prototype.appendChild = function() {};
  function MockXHR() {}
  MockXHR.prototype.open = function() {};
  MockXHR.prototype.send = function() {};

  const htmlNode = { innerHTML: '<html room_id="9999"></html>' };
  const sandbox = {
    Event: MockEvent,
    Node: MockNode,
    URL: URL,
    XMLHttpRequest: MockXHR,
    WebSocket: MockWebSocket,
    FileReader: MockFileReader,
    MutationObserver: MockMutationObserver,
    location: { href: 'https://www.douyu.com/9999', pathname: '/9999' },
    localStorage: { getItem: () => null, setItem: () => {}, removeItem: () => {}, key: () => null, length: 0 },
    addEventListener: () => {},
    removeEventListener: () => {},
    document: {
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => true,
      createElement: () => ({ style: {}, appendChild: () => {}, append: () => {}, querySelector: () => null, querySelectorAll: () => [], getElementsByTagName: () => [htmlNode], remove: () => {} }),
      getElementById: () => null,
      querySelector: () => null,
      querySelectorAll: () => [],
      getElementsByClassName: () => [],
      getElementsByTagName: (tag) => tag === 'html' ? [htmlNode] : [{ remove: () => {} }],
      documentElement: htmlNode,
      head: { appendChild: () => {} },
      body: { appendChild: () => {}, append: () => {} }
    },
    navigator: { userAgent: 'Chrome/120' },
    setTimeout: () => {},
    clearTimeout: () => {},
    setInterval: () => {},
    clearInterval: () => {},
    GM_registerMenuCommand: () => {},
    GM_getValue: () => null,
    GM_setValue: () => {},
    GM_deleteValue: () => {},
    GM_listValues: () => [],
    GM_openInTab: () => {},
    GM_xmlhttpRequest: () => {},
    console: { log: () => {}, warn: () => {}, error: () => {}, debug: () => {} }
  };
  sandbox.window = sandbox;
  sandbox.unsafeWindow = sandbox;
  sandbox.globalThis = sandbox;

  assert.doesNotThrow(() => {
    vm.runInNewContext(code, sandbox);
  }, 'Cold start initialization must complete without any ReferenceError or TypeError');

  assert.ok(sandbox.DYEXRL_NEXT, 'DYEXRL_NEXT runtime object must be initialized');
  assert.strictEqual(sandbox.DYEXRL_NEXT.status, 'ready', 'Runtime status must reach ready');
});
