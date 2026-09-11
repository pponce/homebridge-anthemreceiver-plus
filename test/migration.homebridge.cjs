'use strict';
// Run the actual installed Homebridge twice with a legacy-name fixture and Plus.
// This tests host migration/persistence, not a real iPhone's Home database.
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const net = require('node:net');
const http = require('node:http');
const crypto = require('node:crypto');
const { spawn } = require('node:child_process');
const { once } = require('node:events');
const { fakeReceiver } = require('./fake-receiver.cjs');
const root = path.resolve(__dirname, '..');
const legacyName = 'homebridge-anthemreceiver';
const plusName = 'homebridge-anthemreceiver-plus';
const pause = ms => new Promise(resolve => setTimeout(resolve, ms));

async function freePort() {
  const server = net.createServer();
  server.listen(0, '127.0.0.1'); await once(server, 'listening');
  const port = server.address().port;
  await new Promise(resolve => server.close(resolve)); return port;
}

function accessories(port) {
  return new Promise((resolve, reject) => {
    const request = http.get({ hostname: '127.0.0.1', port, path: '/accessories', timeout: 1000 }, response => {
      let body = ''; response.on('data', chunk => { body += chunk; });
      response.on('end', () => {
        try {
          assert.equal(response.statusCode, 200);
          resolve(JSON.parse(body).accessories);
        } catch (error) { reject(error); }
      });
    });
    request.on('timeout', () => request.destroy(new Error('HTTP deadline')));
    request.on('error', reject);
  });
}

function identities(items) {
  return items.map(a => ({ aid: a.aid, services: a.services.map(s => ({
    iid: s.iid, type: s.type, linked: s.linked,
    characteristics: s.characteristics.map(c => ({ iid: c.iid, type: c.type, perms: c.perms })),
  })) }));
}

async function runHomebridge(t, fixture, storage, port) {
  const homebridgeRoot = path.dirname(path.dirname(require.resolve('homebridge')));
  const meta = JSON.parse(fs.readFileSync(path.join(homebridgeRoot, 'package.json'), 'utf8'));
  const child = spawn(process.execPath, [path.join(homebridgeRoot, meta.bin.homebridge),
    '-U', storage, '-P', fixture, '--strict-plugin-resolution', '-I', '-Q'],
  { cwd: root, env: { ...process.env, NO_COLOR: '1' }, stdio: ['ignore', 'pipe', 'pipe'] });
  let logs = '';
  const capture = chunk => { logs += chunk.toString().replace(/\u001b\[[0-9;]*m/g, ''); };
  child.stdout.on('data', capture);
  child.stderr.on('data', capture);
  let stopped = false;
  const stop = async () => {
    if (stopped) return;
    stopped = true;
    if (child.exitCode !== null || child.signalCode !== null) return;
    const ended = once(child, 'exit');
    child.kill('SIGTERM');
    const deadline = setTimeout(() => child.kill('SIGKILL'), 7000);
    try { await ended; } finally { clearTimeout(deadline); }
  };
  t.after(stop);
  const deadline = Date.now() + 25000;
  let probeError = 'HTTP probe not reached';
  while (Date.now() < deadline) {
    if (child.exitCode !== null || child.signalCode !== null) throw new Error('Homebridge exited during migration fixture startup');
    // HAP can append a four-character identity suffix to external display names.
    const externalPorts = [...logs.matchAll(/Migration Zone ([12])(?: [0-9A-Fa-f]{4})? is running on port (\d+)/g)];
    if (logs.includes('Starting Controller Operation') && externalPorts.length === 2) {
      try {
        const main = await accessories(port);
        if (main.length > 1) {
          const external = {};
          for (const match of externalPorts) external[match[1]] = identities(await accessories(Number(match[2])));
          return { main: identities(main), external, stop, logs: () => logs };
        }
      } catch (error) { probeError = error.message; }
    }
    await pause(100);
  }
  // Exclude setup codes and arbitrary receiver/configuration values from diagnostics.
  const diagnostic = logs.split('\n').filter(line => /ERROR|Error|failed|Cannot|No plugin|Could not|is running on port/.test(line)).join(' | ');
  throw new Error(`Migration fixture not ready: controller=${logs.includes('Starting Controller Operation')}; probe=${probeError}; ${diagnostic}`);
}

function installFixture(parent, name) {
  const directory = path.join(parent, name); fs.mkdirSync(directory, { recursive: true });
  fs.cpSync(path.join(root, 'dist'), path.join(directory, 'dist'), { recursive: true });
  const meta = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
  meta.name = name;
  fs.writeFileSync(path.join(directory, 'package.json'), JSON.stringify(meta));
  fs.symlinkSync(path.join(root, 'node_modules'), path.join(directory, 'node_modules'), 'dir');
  if (name === legacyName) {
    const settings = path.join(directory, 'dist/settings.js');
    const original = fs.readFileSync(settings, 'utf8');
    assert.ok(original.includes(plusName));
    fs.writeFileSync(settings, original.replaceAll(plusName, legacyName));
  }
  return directory;
}

function pairingSnapshot(storage, seed = false, expectedIdentities = 3) {
  const persist = path.join(storage, 'persist');
  const files = fs.readdirSync(persist).filter(name => /^AccessoryInfo\..*\.json$/.test(name)).sort();
  assert.equal(files.length, expectedIdentities, 'bridge and external TV identities should persist');
  return files.map(name => {
    const filename = path.join(persist, name);
    const info = JSON.parse(fs.readFileSync(filename, 'utf8'));
    if (seed) {
      // Synthetic admin record exercises preservation without an Apple controller.
      info.pairedClients = { 'migration-test-controller': crypto.randomBytes(32).toString('hex') };
      info.pairedClientsPermission = { 'migration-test-controller': 1 };
      fs.writeFileSync(filename, JSON.stringify(info));
    }
    const identity = { signSk: info.signSk, signPk: info.signPk, pairedClients: info.pairedClients,
      pairedClientsPermission: info.pairedClientsPermission };
    assert.ok(identity.signSk && identity.signPk);
    assert.ok(identity.pairedClients['migration-test-controller']);
    return { name, fingerprint: crypto.createHash('sha256').update(JSON.stringify(identity)).digest('hex') };
  });
}

for (const childBridge of [false, true]) {
test(`package rename preserves ${childBridge ? 'child-bridge' : 'main-bridge'} cached accessories, HAP AIDs/IIDs, and seeded pairing records`, { timeout: 75000 }, async t => {
  assert.equal(require('../dist/settings.js').PLATFORM_NAME, 'AnthemReceiver');
  assert.equal(require('../dist/settings.js').PLUGIN_NAME, plusName);
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'anthem-plus-migration-'));
  const receiver = await fakeReceiver({ model: 'MRX 540' });
  const cleanups = [];
  const lifecycle = { after: fn => cleanups.push(fn) };
  t.after(async () => {
    for (const cleanup of cleanups) await cleanup();
    await receiver.close();
    fs.rmSync(directory, { recursive: true, force: true });
  });
  const storage = path.join(directory, 'storage'); fs.mkdirSync(storage);
  const port = await freePort();
  const username = 'CC:' + [...crypto.randomBytes(5)].map(b => b.toString(16).padStart(2, '0')).join(':').toUpperCase();
  const config = { bridge: { name: 'Migration Test', username, pin: '031-45-154', port, bind: '127.0.0.1', advertiser: 'ciao' },
    platforms: [{ platform: 'AnthemReceiver', Host: '127.0.0.1', Port: receiver.port, MaxVolumeDB: -10,
      Zone1: { Name: 'Migration Zone 1', Active: true, Power: true, Mute: true, Volume: true, MultipleInputs: true, ALM: true },
      Zone2: { Name: 'Migration Zone 2', Active: true, Power: true, Volume: true } }] };
  fs.writeFileSync(path.join(storage, 'config.json'), JSON.stringify(config));
  const controlPort = childBridge ? await freePort() : port;
  if (childBridge) {
    config.platforms[0]._bridge = { name: 'Migration Child Bridge', port: controlPort,
      username: 'CD:' + [...crypto.randomBytes(5)].map(b => b.toString(16).padStart(2, '0')).join(':').toUpperCase() };
    fs.writeFileSync(path.join(storage, 'config.json'), JSON.stringify(config));
  }
  const configBefore = fs.readFileSync(path.join(storage, 'config.json'), 'utf8');
  const legacy = installFixture(path.join(directory, 'legacy'), legacyName);
  const before = await runHomebridge(lifecycle, legacy, storage, controlPort);
  await before.stop();
  const pairingBefore = pairingSnapshot(storage, true, childBridge ? 4 : 3);
  // No startup occurs between removing the legacy package and installing Plus.
  fs.rmSync(path.join(directory, 'legacy'), { recursive: true, force: true });
  const plus = installFixture(path.join(directory, 'plus'), plusName);
  const after = await runHomebridge(lifecycle, plus, storage, controlPort);
  assert.deepEqual(after.main, before.main, 'bridged service and characteristic identifiers changed');
  assert.deepEqual(after.external, before.external, 'external TV identifiers changed');
  assert.match(after.logs(), /Plugin association is now being transformed/);
  await after.stop();
  assert.deepEqual(pairingSnapshot(storage, false, childBridge ? 4 : 3), pairingBefore, 'pairing identity changed');
  assert.equal(fs.readFileSync(path.join(storage, 'config.json'), 'utf8'), configBefore);
  const cacheName = childBridge ? 'cachedAccessories.' + config.platforms[0]._bridge.username.replaceAll(':', '') : 'cachedAccessories';
  const cache = fs.readFileSync(path.join(storage, 'accessories', cacheName), 'utf8');
  assert.ok(cache.includes(plusName));
  assert.equal(cache.includes('"' + legacyName + '"'), false);
});
}
