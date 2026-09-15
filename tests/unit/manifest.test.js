// tests/unit/manifest.test.js
const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');

const ROOT_DIR = path.join(__dirname, '../../');
const MANIFEST_PATH = path.join(ROOT_DIR, 'build/next-manifest.json');

test('Manifest: exists and has valid JSON format', () => {
  assert.ok(fs.existsSync(MANIFEST_PATH), 'next-manifest.json must exist');
  const content = fs.readFileSync(MANIFEST_PATH, 'utf8');
  const data = JSON.parse(content);
  assert.ok(data.meta, 'manifest must specify meta');
  assert.ok(data.output, 'manifest must specify output');
  assert.ok(Array.isArray(data.files), 'manifest files must be an array');
});

test('Manifest: all files exist on disk with no duplicates', () => {
  const data = JSON.parse(fs.readFileSync(MANIFEST_PATH, 'utf8'));
  const seen = new Set();
  
  for (const relPath of data.files) {
    assert.strictEqual(seen.has(relPath), false, `Duplicate file in manifest: ${relPath}`);
    seen.add(relPath);
    const fullPath = path.join(ROOT_DIR, relPath);
    assert.ok(fs.existsSync(fullPath), `Manifest file must exist: ${relPath}`);
  }
});
