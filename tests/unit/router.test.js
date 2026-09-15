// tests/unit/router.test.js
const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

function createRouterEnvironment() {
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
    URL: URL,
    location: { href: 'https://www.douyu.com/9999', pathname: '/9999' }
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

test('Router: correctly classifies all 8 normalized route roles with priority', () => {
  const registry = createRouterEnvironment();
  const router = registry.resolve('router.index');

  // R-07: Clean pipeline (Priority 1)
  assert.strictEqual(router.matchRoute('https://yuba.douyu.com/clean?exClean&domain=test').role, 'R-07');
  assert.strictEqual(router.matchRoute('https://msg.douyu.com/web?exClean&domain=test').role, 'R-07');

  // R-05: Passport pipeline (Priority 2)
  const r05 = router.matchRoute('https://passport.douyu.com/index?exid=chun&cmd=switch&uid=123');
  assert.strictEqual(r05.role, 'R-05');
  assert.strictEqual(r05.cmd, 'switch');

  // R-06: Fans badge stats (Priority 3)
  assert.strictEqual(router.matchRoute('https://www.douyu.com/member/cp/getFansBadgeList').role, 'R-06');

  // R-04: Yuba restore and general (Priority 4)
  const r04 = router.matchRoute('https://yuba.douyu.com/group/123?exRestore');
  assert.strictEqual(r04.role, 'R-04');
  assert.strictEqual(r04.isRestore, true);

  // R-03: VOD playback (Priority 5)
  const r03 = router.matchRoute('https://v.douyu.com/show/abcd123');
  assert.strictEqual(r03.role, 'R-03');
  assert.strictEqual(r03.vid, 'abcd123');

  // R-02: Pure popup player stream (Priority 6)
  assert.strictEqual(router.matchRoute('https://www.douyu.com/9999?exid=chun').role, 'R-02');

  // R-01: Standard live room (Priority 7)
  const r01 = router.matchRoute('https://www.douyu.com/9999');
  assert.strictEqual(r01.role, 'R-01');
  assert.strictEqual(r01.rid, '9999');

  // R-08: Excluded template/h5 (Priority 8)
  assert.strictEqual(router.matchRoute('https://www.douyu.com/template/123').role, 'R-08');
  assert.strictEqual(router.matchRoute('https://www.douyu.com/h5/456').role, 'R-08');
});

test('Orchestrator: initializes router, manages generation and cleans roomScope on navigation', () => {
  const registry = createRouterEnvironment();
  const orchestrator = registry.resolve('runtime.orchestrator');

  const instance = orchestrator.bootstrap();
  assert.ok(instance.router);
  assert.strictEqual(instance.router.role, 'R-01');
  assert.strictEqual(instance.router.rid, '9999');

  const scope1 = instance.getActiveRoomScope();
  assert.ok(scope1);
  assert.strictEqual(scope1.isDestroyed, false);

  instance.destroy();
  assert.strictEqual(scope1.isDestroyed, true);
});
