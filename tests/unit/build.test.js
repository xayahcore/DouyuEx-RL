// tests/unit/build.test.js
const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const { execSync } = require('node:child_process');

const ROOT_DIR = path.join(__dirname, '../../');
const ARTIFACT_PATH = path.join(ROOT_DIR, 'artifacts/next/DouyuEx_RL_NEXT.user.js');

test('Build NEXT: deterministic output between two consecutive runs', () => {
  // Run build --next once
  execSync('node build.js --next', { cwd: ROOT_DIR, stdio: 'pipe' });
  const firstHash = fs.readFileSync(ARTIFACT_PATH, 'utf8');

  // Run build --next again
  execSync('node build.js --next', { cwd: ROOT_DIR, stdio: 'pipe' });
  const secondHash = fs.readFileSync(ARTIFACT_PATH, 'utf8');

  assert.strictEqual(firstHash, secondHash, 'Build output must be strictly deterministic');
  assert.ok(firstHash.includes('// ==UserScript=='), 'Must contain userscript header');
  assert.ok(firstHash.includes('DYEXRL_NEXT'), 'Must contain namespace');
});

test('Build NEXT: does not modify root DouyuEx_RL.user.js', () => {
  const rootArtifactPath = path.join(ROOT_DIR, 'DouyuEx_RL.user.js');
  const statBefore = fs.statSync(rootArtifactPath).mtimeMs;

  execSync('node build.js --next', { cwd: ROOT_DIR, stdio: 'pipe' });

  const statAfter = fs.statSync(rootArtifactPath).mtimeMs;
  assert.strictEqual(statBefore, statAfter, 'Root artifact must not be touched by --next build');
});
