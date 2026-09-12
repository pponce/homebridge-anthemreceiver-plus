const { test } = require('node:test');
const assert = require('node:assert/strict');
const { once } = require('node:events');
const { AnthemController } = require('../dist/AnthemController.js');
const { fakeReceiver } = require('./fake-receiver.cjs');
const { CommandTransactions } = require('../dist/transactions.js');
const timing = { connect: 1000, handshake: 1000, idle: 3000, keepalive: 2000, reconnect: 25, maxReconnect: 50, command: 300 };

async function ready(t, options = {}) {
  const receiver = await fakeReceiver(options);
  const controller = new AnthemController(timing);
  controller.AddControllingZone(1, 'Zone 1', true);
  controller.on('ControllerError', () => {});
  t.after(async () => { controller.Stop(); await receiver.close(); });
  const started = once(controller, 'ControllerReadyForOperation', { signal: AbortSignal.timeout(2500) });
  controller.Connect('127.0.0.1', receiver.port); await started;
  return { receiver, controller };
}

test('initial handshake and command confirmation over a real TCP socket', async t => {
  const { receiver, controller } = await ready(t);
  assert.equal(controller.IsReady(), true);
  assert.equal(controller.GetInputs().length, 12);
  await controller.RunCommand(() => controller.PowerZone(1, true));
  assert.equal(controller.GetZonePower(1), true);
  await controller.RunCommand(() => controller.SetMute(1, true));
  assert.equal(controller.GetMute(1), true);
  assert.ok(receiver.commands.includes('Z1MUT?'));
  await controller.RunCommand(() => controller.SetZoneInput(1, 10));
  assert.equal(controller.GetZone(1).GetActiveInput(), 10);
});
test('clean socket close reconnects once and refreshes state', async t => {
  const { receiver, controller } = await ready(t);
  const resumed = once(controller, 'ControllerReadyForOperation', { signal: AbortSignal.timeout(2500) });
  for (const socket of receiver.sockets) socket.end();
  await resumed;
  assert.equal(receiver.connections, 2);
  assert.equal(controller.IsReady(), true);
  controller.Stop();
  await assert.rejects(controller.RunCommand(() => controller.PowerZone(1, true)), /ready/);
});
test('multi-digit ARC and Dolby replies update the selected zone', async t => {
  const { controller } = await ready(t);
  controller.GetZone(1).SetActiveInput(10);
  const arc = once(controller, 'ZoneARCEnabledChange');
  const dolby = once(controller, 'ZoneDolbyPostProcessingChange');
  controller.AnalyseResponse(Buffer.from('IS10ARC1;IS10DV2;'));
  assert.deepEqual(await arc, [1, true]);
  assert.deepEqual(await dolby, [1, 2]);
});
test('malformed count is logged and cannot escape parser callback', async t => {
  const { controller } = await ready(t);
  const before = controller.GetInputs().length;
  assert.doesNotThrow(() => controller.AnalyseResponse(Buffer.from('ICNfoo;ICN999999;')));
  assert.equal(controller.GetInputs().length, before);
});
test('MRX 540, older protocol handshake and SLM names remain supported', async t => {
  for (const model of ['MRX 540', 'MRX 710', 'MRX SLM']) {
    const { controller } = await ready(t, { model });
    assert.equal(controller.ReceiverModel, model);
    assert.equal(controller.GetInputs()[0], 'Cinema');
  }
});
test('pending and queued commands fail on disconnect without replay', async () => {
  let sent = 0;
  const queue = new CommandTransactions(async () => { sent++; }, () => true, 100);
  const a = queue.run(() => ['Z1MUT1']);
  const b = queue.run(() => ['Z1POW1']);
  const settled = Promise.allSettled([a, b]);
  await new Promise(resolve => setImmediate(resolve));
  queue.disconnect();
  assert.deepEqual((await settled).map(result => result.status), ['rejected', 'rejected']);
  assert.equal(sent, 1);
});
test('timeout and receiver rejection propagate to caller', async () => {
  const queue = new CommandTransactions(async () => {}, () => true, 20);
  await assert.rejects(queue.run(() => ['Z1MUT1']), /confirm/);
  const action = queue.run(() => ['Z1POW1']);
  const rejected = assert.rejects(action, /rejected/);
  await new Promise(resolve => setImmediate(resolve));
  queue.receive('!EZ1POW1'); await rejected;
});

test('None selection fails when the receiver does not confirm mode zero', async t => {
  const { controller, receiver } = await ready(t, { ignore: command => command === 'Z1ALM0' });
  await controller.RunCommand(() => controller.PowerZone(1, true));
  await assert.rejects(controller.RunCommand(() => controller.SetAudioListeningMode(1, 0)), /confirm/);
  assert.equal(receiver.states.Z1ALM, 1);
  assert.equal(controller.GetZone(1).GetALM(), 1);
});

for (const model of ['STR PA', 'STR IA']) {
  test(`${model}: handshake, basic controls and read-back use only STR commands`, async t => {
    const {controller: c, receiver: r} = await ready(t, { model });
    assert.equal(c.GetCapabilities().experimental, true);
    assert.equal(c.SerialNumber, 'AA:BB:CC:DD:EE:01');
    assert.equal(c.GetCapabilities().zones, 1);
    await c.RunCommand(() => c.PowerZone(1, true));
    await c.RunCommand(() => c.SetMute(1, true));
    await c.RunCommand(() => c.ToggleMute(1));
    assert.equal(c.GetMute(1), false);
    await c.RunCommand(() => c.SetZoneInput(1, 10));
    assert.equal(c.GetZone(1).GetActiveInput(), 10);
    for (const mode of [7, 9, 11, 12]) {
      await c.RunCommand(() => c.SetAudioListeningMode(1, mode));
      assert.equal(c.GetZone(1).GetALM(), mode);
    }
    await c.RunCommand(() => c.ToggleAudioListeningMode(1, true));
    assert.equal(c.GetZone(1).GetALM(), 7);
    await c.RunCommand(() => c.SetZoneVolumePercentage(1, 1));
    assert.equal(r.states.Z1VOL, -96);
    await c.RunCommand(() => c.SetZoneVolumePercentage(1, 100));
    assert.equal(r.states.Z1VOL, 7);
    await c.RunCommand(() => c.SetZoneVolumePercentage(1, 0));
    assert.equal(r.states.Z1MUT, 1);
    assert.equal(r.states.Z1VOL, 7);
    await c.RunCommand(() => c.PowerZone(1, false));
    assert.equal(c.GetZonePower(1), false);
    assert.deepEqual(r.rejected, []);
    assert.ok(!r.commands.some(command => /BRT|PVOL|ARC|GCFPB|SMD|SIM|^Z2|^GSN|^IS\d+IN/.test(command)));
  });
  test(`${model}: volume cap, half-dB feedback, reconnect and unsupported actions`, async t => {
    const {controller: c, receiver: r} = await ready(t, { model, states: {Z1POW: 1, Z1VOL: -45.5} });
    c.SetMaxVolumeDB(-10.2);
    await c.RunCommand(() => c.SetZoneVolumePercentage(1, 100));
    assert.equal(r.states.Z1VOL, -10.5);
    await c.RunCommand(() => c.VolumeUp(1));
    assert.equal(r.states.Z1VOL, -10.5);
    await c.RunCommand(() => c.VolumeDown(1));
    assert.equal(r.states.Z1VOL, -11);
    await assert.rejects(c.RunCommand(() => c.SetAudioListeningMode(1, 0)), /unavailable/);
    await assert.rejects(c.RunCommand(() => c.SetZoneARCEnabled(1, true)), /not enabled/);
    await assert.rejects(c.RunCommand(() => c.ToggleConfigMenu()), /not enabled/);
    await assert.rejects(c.RunCommand(() => c.SetZoneInput(1, 32)), /normal STR input/);
    const resumed = once(c, 'ControllerReadyForOperation', {signal: AbortSignal.timeout(2500)});
    r.states.Z1VOL = -42.5;
    for (const socket of r.sockets) socket.end();
    await resumed;
    assert.equal(c.GetZone(1).GetVolume(), -42.5);
    assert.ok(c.GetZone(1).GetVolumePercentage() > 1);
    assert.deepEqual(r.rejected, []);
  });
}

test('STR volume failures keep the confirmed state and fail the caller', async t => {
  const {controller: c, receiver: r} = await ready(t, { model: 'STR PA', ignore: command => command === 'Z1VOL-96.0' });
  await c.RunCommand(() => c.PowerZone(1, true));
  await assert.rejects(c.RunCommand(() => c.SetZoneVolumePercentage(1, 1)), /confirm/);
  assert.equal(r.states.Z1VOL, -40);
  assert.equal(c.GetZone(1).GetVolume(), -40);
});
