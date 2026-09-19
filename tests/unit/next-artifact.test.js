const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const crypto = require('node:crypto');

const ROOT_DIR = path.resolve(__dirname, '../..');
const ARTIFACT_PATH = path.join(ROOT_DIR, 'artifacts/next/DouyuEx_RL_NEXT.user.js');
const EXPECTED_SHA256 = '98638294eeddad4852bed52a05c4153ab7e50563fb3b7859dbf1864e8322b999';
const EXPECTED_SIZE = 890032;

test('NEXT Artifact: exact byte size and SHA-256 verification', () => {
    assert.ok(fs.existsSync(ARTIFACT_PATH), 'Artifact file must exist');
    const buffer = fs.readFileSync(ARTIFACT_PATH);
    assert.strictEqual(buffer.length, EXPECTED_SIZE, `Exact byte size must be ${EXPECTED_SIZE}`);
    const hash = crypto.createHash('sha256').update(buffer).digest('hex');
    assert.strictEqual(hash, EXPECTED_SHA256, `SHA-256 must match canonical ${EXPECTED_SHA256}`);
});

test('NEXT Artifact: V8 Script syntax compilation with zero errors', () => {
    const code = fs.readFileSync(ARTIFACT_PATH, 'utf8');
    assert.doesNotThrow(() => {
        new vm.Script(code, { filename: 'DouyuEx_RL_NEXT.user.js' });
    }, 'V8 Script compilation must succeed without syntax errors');
});

test('NEXT Artifact: Userscript metadata header compliance', () => {
    const code = fs.readFileSync(ARTIFACT_PATH, 'utf8');
    assert.ok(code.startsWith('// ==UserScript=='), 'Must start with UserScript header');
    assert.ok(code.includes('// @name         DouyuEx-RL (NEXT Main Compatibility)'));
    assert.ok(code.includes('// @namespace    https://github.com/xayahcore/DouyuEx-RL/next'));
    assert.ok(code.includes('// @match        *://*.douyu.com/*'));
    assert.ok(code.includes('// @run-at       document-start'));
    assert.ok(!code.includes('@require      https://registry.npmmirror.com'), 'Must not require from npmmirror');
    assert.ok(code.includes('https://fastly.jsdelivr.net/npm/'), 'Must use fastly jsDelivr for external libraries');
});

test('NEXT Artifact: Singleton claim guard and isolated localStorage proxy', () => {
    const code = fs.readFileSync(ARTIFACT_PATH, 'utf8');
    assert.ok(code.includes('DYEXRL_NEXT_COMPAT_CLAIM'), 'Must implement singleton event claim');
    assert.ok(code.includes("const storagePrefix = 'DYEXRL_NEXT:';"), 'Must configure isolated storage prefix');
    assert.ok(code.includes('backingStorage.getItem(storageKey(key))'), 'Must route storage through prefix proxy');
});

test('NEXT Artifact: 76 linked module definitions and contracts completeness', () => {
    const manifestPath = path.join(ROOT_DIR, 'build/next-manifest.json');
    const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
    const contractsPath = path.join(ROOT_DIR, 'build/module-contracts.json');
    const contracts = JSON.parse(fs.readFileSync(contractsPath, 'utf8'));

    const code = fs.readFileSync(ARTIFACT_PATH, 'utf8');
    const moduleFiles = manifest.files.filter(f => f !== 'src/next/runtime/start.js' && f !== 'src/next/runtime/end.js');
    assert.strictEqual(moduleFiles.length, 76, 'Must contain exactly 76 modular files');

    for (const mod of moduleFiles) {
        assert.ok(code.includes(`"${mod}":\nfunction* (__imports)`), `Artifact must define module ${mod}`);
        assert.ok(contracts[mod], `Contracts must define interface for ${mod}`);
        const diskFile = path.join(ROOT_DIR, mod);
        assert.ok(fs.existsSync(diskFile), `Disk file ${mod} must exist`);
    }
});
