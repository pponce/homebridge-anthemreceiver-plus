const { test } = require('node:test');
const assert = require('node:assert/strict');
const { EventEmitter, once } = require('node:events');
const { AnthemReceiverHomebridgePlatform } = require('../dist/platform.js');
const { fakeReceiver } = require('./fake-receiver.cjs');

function apiMock() {
  const kinds = new Map();
  const characteristic = new Proxy({}, { get(_, name) {
    if (!kinds.has(name)) kinds.set(name, { UUID: name, ACTIVE: 1, ABSOLUTE: 1, CONFIGURED: 1, HDMI: 3, ALWAYS_DISCOVERABLE: 1 });
    return kinds.get(name);
  } });
  class MockCharacteristic {
    constructor(type) { this.UUID = type.UUID; this.value = 0; this.props = { perms: ['pr', 'pw'] }; }
    onSet(fn) { this.setter = fn; return this; }
    onGet(fn) { this.getter = fn; return this; }
    updateValue(value) { this.value = value; return this; }
  }
  class MockService {
    constructor(type, name, subtype) { this.UUID = type.UUID; this.displayName = name; this.subtype = subtype; this.characteristics = []; this.links = new Set(); }
    getCharacteristic(type) { let c = this.characteristics.find(c => c.UUID === type.UUID); if (!c) { c = new MockCharacteristic(type); this.characteristics.push(c); } return c; }
    setCharacteristic(type, value) { this.getCharacteristic(type).updateValue(value); return this; }
    updateCharacteristic(type, value) { return this.setCharacteristic(type, value); }
    addLinkedService(service) { this.links.add(service); }
    removeLinkedService(service) { this.links.delete(service); }
  }
  const service = new Proxy({}, { get(_, name) { return { UUID: name }; } });
  class Accessory {
    constructor(name, UUID) { this.UUID = UUID; this.displayName = name; this.services = []; this.addService(service.AccessoryInformation); }
    getService(type) { return this.services.find(s => s.UUID === type.UUID); }
    getServiceById(type, subtype) { return this.services.find(s => s.UUID === type.UUID && s.subtype === subtype); }
    addService(type, name, subtype) { if (this.getServiceById(type, subtype)) throw new Error('Duplicate service'); const s = new MockService(type, name, subtype); this.services.push(s); return s; }
    removeService(service) { this.services = this.services.filter(s => s !== service); }
  }
  const api = new EventEmitter();
  api.hap = { Service: service, Characteristic: characteristic, Perms: { PAIRED_READ: 'pr' }, HAPStatus: { SERVICE_COMMUNICATION_FAILURE: -70402 }, HapStatusError: Error,
    uuid: { generate: s => s }, Categories: { TELEVISION: 31 } };
  api.platformAccessory = Accessory; api.external = []; api.registered = [];
  api.registerPlatformAccessories = (_plugin, _platform, items) => api.registered.push(...items);
  api.updatePlatformAccessories = () => {};
  api.unregisterPlatformAccessories = () => {};
  api.publishExternalAccessories = (_plugin, items) => api.external.push(...items);
  return api;
}
const log = { info() {}, warn() {}, error() {}, debug() {} };
async function start(t, model = 'MRX 740', beforeLaunch = () => {}) {
  const receiver = await fakeReceiver({ model });
  const api = apiMock();
  const platform = new AnthemReceiverHomebridgePlatform(log, { platform: 'AnthemReceiver', Host: '127.0.0.1', Port: receiver.port,
    Zone1: { Active: true, Power: true, Volume: true, Mute: true, MultipleInputs: true, ALM: true }, Zone2: { Active: true, Power: true } }, api);
  t.after(async () => { api.emit('shutdown'); await receiver.close(); });
  const ready = once(platform.Controller, 'ControllerReadyForOperation', { signal: AbortSignal.timeout(2500) });
  beforeLaunch(api, platform);
  api.emit('didFinishLaunching'); await ready;
  return { api, platform, receiver };
}
test('unconfigured and malformed setup stays inactive without an exception', () => {
  for (const config of [{}, { Host: 'receiver', Zone1: [] }]) {
    const api = apiMock(); const platform = new AnthemReceiverHomebridgePlatform(log, config, api);
    assert.doesNotThrow(() => api.emit('didFinishLaunching'));
    assert.equal(platform.Controller.IsReady(), false); api.emit('shutdown');
  }
});
test('two-zone model registers Zone 2; SLM preserves config but publishes only Zone 1', async t => {
  const two = await start(t);
  assert.equal(two.platform.Controller.GetConfiguredZoneNumber(), 2);
  assert.equal(two.api.external.length, 2);
  const slm = await start(t, 'MRX SLM');
  assert.equal(slm.platform.Controller.GetConfiguredZoneNumber(), 1);
  assert.equal(slm.api.external.length, 1);
  assert.equal(slm.platform.config.Zone2.Active, true);
});
test('input renames/repeated refresh preserve service identity and remove obsolete entries', async t => {
  const { api, platform } = await start(t);
  const tv = api.external[0]; const type = api.hap.Service.InputSource;
  const first = tv.getServiceById(type, 'HDMI 1');
  const listeners = platform.Controller.listenerCount('ZoneInputChange');
  for (let i = 0; i < 20; i++) platform.Controller.emit('InputChange', ['Renamed', 'Input two']);
  assert.equal(tv.getServiceById(type, 'HDMI 1'), first);
  assert.equal(tv.services.filter(s => s.UUID === type.UUID).length, 2);
  assert.equal(first.getCharacteristic(api.hap.Characteristic.ConfiguredName).value, 'Renamed');
  assert.equal(platform.Controller.listenerCount('ZoneInputChange'), listeners);
  const inputs = api.registered.find(accessory => accessory.UUID.endsWith('Input Selector NG'));
  assert.equal(inputs.services.filter(s => s.UUID === api.hap.Service.Switch.UUID).length, 2);
});
test('offline reads and writes report communication failure', async t => {
  const { api, platform } = await start(t);
  const power = api.registered.find(accessory => accessory.UUID.endsWith('Power Accessory'));
  const value = power.getService(api.hap.Service.Switch).getCharacteristic(api.hap.Characteristic.On);
  api.emit('shutdown');
  assert.throws(() => value.getter());
  await assert.rejects(value.setter(true));
});

test('ALM upgrade reuses all eight cached switches and appends a confirmed None selection', async t => {
  const names = ['ANTHEM LOGIC CINEMA', 'ANTHEM LOGIC MUSIC', 'DOLBY SURROUND', 'DTS NEURAL X',
    'DTS VIRTUAL X', 'ALL CHANNEL STEREO', 'MONO', 'ALL CHANNEL MONO'];
  let cached, previous;
  const { api, platform, receiver } = await start(t, 'MRX 740', (api, platform) => {
    cached = new api.platformAccessory('Zone1 ALM', 'TEST-RECEIVER1ALM NG');
    previous = names.map(name => cached.addService(api.hap.Service.Switch, name, name));
    platform.configureAccessory(cached);
  });
  assert.ok(platform.CreatedAccessories.includes(cached));
  assert.equal(api.registered.some(a => a.UUID === cached.UUID), false);
  assert.equal(cached.services.filter(s => s.UUID === api.hap.Service.Switch.UUID).length, 9);
  names.forEach((name, i) => assert.equal(cached.getServiceById(api.hap.Service.Switch, name), previous[i]));
  const on = name => cached.getServiceById(api.hap.Service.Switch, name).getCharacteristic(api.hap.Characteristic.On);
  assert.equal(on('None').value, false);
  await platform.Controller.RunCommand(() => platform.Controller.PowerZone(1, true));
  // Every pre-existing service still sends its original mode number.
  for (const [i, name] of names.entries()) {
    await on(name).setter(true);
    assert.equal(receiver.states.Z1ALM, i + 1);
  }
  await on('None').setter(true);
  assert.equal(receiver.states.Z1ALM, 0);
  assert.ok(receiver.commands.includes('Z1ALM0'));
  assert.ok(receiver.commands.includes('Z1ALM?'));
  assert.equal(on('None').value, true);
  names.forEach(name => assert.equal(on(name).value, false));
  await on('DOLBY SURROUND').setter(true);
  assert.equal(on('None').value, false);
  assert.equal(on('DOLBY SURROUND').value, true);
  // External receiver changes and reconnection restore the zero mode too.
  receiver.states.Z1ALM = 0;
  const changed = once(platform.Controller, 'ZoneALMChange');
  for (const socket of receiver.sockets) socket.write('Z1ALM0;');
  await changed;
  assert.equal(on('None').value, true);
  assert.equal(on('DOLBY SURROUND').value, false);
  const resumed = once(platform.Controller, 'ControllerReadyForOperation', { signal: AbortSignal.timeout(6000) });
  for (const socket of receiver.sockets) socket.end();
  await resumed;
  assert.equal(on('None').value, true);
  assert.equal(cached.services.filter(s => s.UUID === api.hap.Service.Switch.UUID).length, 9);
});

test('ALM switch-off restores actual selection; power-off and failed writes cannot select None', async t => {
  const { api, platform, receiver } = await start(t);
  const accessory = api.registered.find(a => a.UUID.endsWith('ALM NG'));
  const on = name => accessory.getServiceById(api.hap.Service.Switch, name).getCharacteristic(api.hap.Characteristic.On);
  await assert.rejects(on('None').setter(true));
  assert.equal(receiver.commands.includes('Z1ALM0'), false);
  assert.equal(on('None').value, false);
  await platform.Controller.RunCommand(() => platform.Controller.PowerZone(1, true));
  await on('None').setter(true);
  const count = receiver.commands.filter(c => /^Z1ALM\d+$/.test(c)).length;
  await on('None').setter(false);
  await on('DOLBY SURROUND').setter(false);
  await new Promise(resolve => setTimeout(resolve, 150));
  assert.equal(on('None').value, true);
  assert.equal(on('DOLBY SURROUND').value, false);
  assert.equal(receiver.commands.filter(c => /^Z1ALM\d+$/.test(c)).length, count);
  // A delayed switch-off restoration must not turn None back on after power-off.
  await on('None').setter(false);
  await platform.Controller.RunCommand(() => platform.Controller.PowerZone(1, false));
  platform.Controller.PublishSnapshot();
  await new Promise(resolve => setTimeout(resolve, 150));
  for (const service of accessory.services.filter(s => s.UUID === api.hap.Service.Switch.UUID)) {
    assert.equal(service.getCharacteristic(api.hap.Characteristic.On).value, false);
  }
  api.emit('shutdown');
  await assert.rejects(on('None').setter(true));
  assert.equal(on('None').value, false);
});

test('older protocol models do not gain direct ALM switches', async t => {
  const { platform } = await start(t, 'MRX 710');
  assert.equal(platform.CreatedAccessories.some(a => a.UUID.endsWith('ALM NG')), false);
});

for (const model of ['STR PA', 'STR IA']) test(`${model} publishes one zone, volume and four confirmed listening modes`, async t => {
  const { api, platform, receiver } = await start(t, model, (_api, p) => {
    p.config.Zone1.ARC = true; p.config.PanelBrightness = true; p.config.Zone1.DolbyPostProcessing = true;
  });
  assert.equal(api.external.length, 1);
  assert.equal(platform.Controller.GetConfiguredZoneNumber(), 1);
  assert.equal(platform.config.Zone2.Active, true);
  assert.ok(api.registered.some(a => a.UUID.endsWith('Volume')));
  assert.ok(!api.registered.some(a => /ARC|Brightness|Dolby/.test(a.UUID)));
  const accessory = api.registered.find(a => a.UUID.endsWith('ALM NG'));
  const switches = accessory.services.filter(s => s.UUID === api.hap.Service.Switch.UUID);
  assert.deepEqual(switches.map(s => s.subtype), ['Stereo', 'Mono', 'Both Left', 'Both Right']);
  await platform.Controller.RunCommand(() => platform.Controller.PowerZone(1, true));
  const right = accessory.getServiceById(api.hap.Service.Switch, 'Both Right').getCharacteristic(api.hap.Characteristic.On);
  await right.setter(true);
  assert.equal(receiver.states.Z1ALM, 12);
  assert.equal(right.value, true);
  assert.deepEqual(receiver.rejected, []);
});
