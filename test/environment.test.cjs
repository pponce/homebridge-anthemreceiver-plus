const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { createRequire } = require('node:module');
const { getHomebridgeVersion } = require('../homebridge-ui/environment.js');

test('version lookup works with exports hiding package.json and does not execute Homebridge', t => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'anthem-version-'));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  const directory = path.join(root, 'node_modules/homebridge');
  fs.mkdirSync(path.join(directory, 'dist'), { recursive: true });
  fs.writeFileSync(path.join(directory, 'package.json'), JSON.stringify({ name: 'homebridge', version: '2.4.0', exports: './dist/index.js' }));
  fs.writeFileSync(path.join(directory, 'dist/index.js'), 'throw new Error("Must not execute Homebridge");');
  const fromFixture = createRequire(path.join(root, 'plugin.js'));
  assert.throws(() => fromFixture('homebridge/package.json'), { code: 'ERR_PACKAGE_PATH_NOT_EXPORTED' });
  assert.equal(getHomebridgeVersion(() => fromFixture.resolve('homebridge')), '2.4.0');
});
test('missing Homebridge retains an explicit version fallback', () => {
  assert.equal(getHomebridgeVersion(() => { throw new Error('not installed'); }), 'Unavailable');
});
