// tests/unit/registry.test.js
const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

function createSandbox() {
  const context = { globalThis: {} };
  vm.createContext(context);
  const namespaceCode = fs.readFileSync(path.join(__dirname, '../../src/runtime/namespace.js'), 'utf8');
  vm.runInContext(namespaceCode, context);
  return context.globalThis.DYEXRL_NEXT.registry;
}

test('Registry: registers and resolves simple module', () => {
  const registry = createSandbox();
  registry.register('test.a', [], () => ({ val: 42 }));
  
  const modA = registry.resolve('test.a');
  assert.strictEqual(modA.val, 42);
  // Singleton instance
  assert.strictEqual(registry.resolve('test.a'), modA);
});

test('Registry: resolves dependencies in order', () => {
  const registry = createSandbox();
  registry.register('test.b', [], () => ({ name: 'B' }));
  registry.register('test.c', ['test.b'], (b) => ({ name: 'C', bName: b.name }));

  const modC = registry.resolve('test.c');
  assert.strictEqual(modC.name, 'C');
  assert.strictEqual(modC.bName, 'B');
});

test('Registry: rejects duplicate registration', () => {
  const registry = createSandbox();
  registry.register('test.dup', [], () => 1);
  assert.throws(() => {
    registry.register('test.dup', [], () => 2);
  }, /Duplicate module registration/);
});

test('Registry: rejects missing dependency', () => {
  const registry = createSandbox();
  registry.register('test.consumer', ['test.missing'], () => ({}));
  assert.throws(() => {
    registry.resolve('test.consumer');
  }, /Missing module: test\.missing/);
});

test('Registry: detects circular dependency', () => {
  const registry = createSandbox();
  registry.register('test.x', ['test.y'], () => ({}));
  registry.register('test.y', ['test.x'], () => ({}));
  assert.throws(() => {
    registry.resolve('test.x');
  }, /Circular dependency detected/);
});
