const { test } = require('node:test');
const assert = require('node:assert/strict');
const net = require('node:net');
const { once } = require('node:events');
const { AnthemDiagnostics } = require('../dist/diagnostics.js');
const { ConnectionTester } = require('../dist/ui-test.js');
const { capabilities } = require('../dist/capabilities.js');
const reportBuilder = require('../homebridge-ui/public/diagnostic-report.js');

async function device(t, respond) {
  const commands = [], sockets = new Set(); let connections = 0;
  const server = net.createServer(socket => {
    connections++; sockets.add(socket); socket.on('error', () => {}); socket.on('close', () => sockets.delete(socket));
    let pending = '';
    socket.on('data', data => {
      pending += data;
      while (pending.includes(';')) {
        const index = pending.indexOf(';'), command = pending.slice(0, index); pending = pending.slice(index + 1);
        commands.push(command); respond(command, socket);
      }
    });
  }).listen(0, '127.0.0.1');
  await once(server, 'listening');
  t.after(async () => { for (const socket of sockets) socket.destroy(); await new Promise(resolve => server.close(resolve)); });
  return { config: { Host: '127.0.0.1', Port: server.address().port }, commands, get connections() { return connections; } };
}
function normal(command, socket) {
  const replies = { 'IDM?': 'IDMFuture Anthem Stereo', 'IDS?': 'IDS2.0', 'GSN?': 'GSNSECRET123', 'IDN?': '!I',
    'ICN?': 'ICN2', 'IS1IN?': 'IS1INPrivate room', 'ISN01?': '!I', 'Z1POW?': 'Z1POW1',
    'Z1MUT?': 'Z1MUT0', 'Z1VOL?': 'Z1VOL-42.5', 'Z1PVOL?': 'Z1PVOL35', 'Z1INP?': 'Z1INP1' };
  socket.write((replies[command] || '!I') + ';');
}

test('unknown Anthem models return evidence without gaining runtime support; probe is read-only', async t => {
  const d = await device(t, normal);
  const result = await new AnthemDiagnostics(100, 3000, 0).run(d.config);
  assert.equal(result.model, 'Future Anthem Stereo'); assert.equal(result.recognizedModel, false);
  assert.equal(result.connection, 'connected'); assert.equal(result.finishReason, 'finished');
  assert.equal(result.queries.length, 12); assert.equal(d.connections, 1);
  assert.throws(() => capabilities(result.model), /Unsupported/);
  assert.ok(d.commands.every(command => /^[A-Z0-9]+\?$/.test(command)));
  assert.ok(d.commands.every(command => !command.startsWith('Z2')));
  assert.equal(result.queries.find(q => q.command === 'IDN?').outcome, 'rejected');
  assert.equal(result.queries.find(q => q.command === 'Z1VOL?').outcome, 'answered');
});
test('fragmented identity and unsolicited replies are retained; Zone 2 requires explicit selection', async t => {
  const d = await device(t, (command, socket) => {
    if (command === 'IDM?') { socket.write('IDM'); setTimeout(() => socket.write('MRX 740;Z1POW1;'), 5); }
    else normal(command, socket);
  });
  const report = await new AnthemDiagnostics(100, 3000, 0).run(d.config, true);
  assert.equal(report.model, 'MRX 740'); assert.equal(report.recognizedModel, true);
  assert.ok(report.unsolicitedReplies.includes('Z1POW1')); assert.ok(d.commands.includes('Z2POW?'));
});
test('missing identity and timeout preserve results and reconnect before the next query', async t => {
  const d = await device(t, (command, socket) => { if (command !== 'IDM?') normal(command, socket); });
  const report = await new AnthemDiagnostics(40, 3000, 0).run(d.config);
  assert.equal(report.queries[0].outcome, 'timeout'); assert.equal(report.model, '');
  assert.equal(report.firmware, '2.0'); assert.equal(d.connections, 2);
});
test('malformed values and unrelated replies are not accepted as valid status', async t => {
  const d = await device(t, (command, socket) => {
    if (command === 'Z1VOL?') socket.write('Z1VOLLOUD;');
    else if (command === 'Z1MUT?') socket.write('UNKNOWN SECRET123;');
    else normal(command, socket);
  });
  const report = await new AnthemDiagnostics(40, 3000, 0).run(d.config);
  assert.equal(report.queries.find(q => q.command === 'Z1VOL?').outcome, 'unrecognized');
  assert.equal(report.queries.find(q => q.command === 'Z1MUT?').outcome, 'unrecognized');
  assert.equal(report.queries.at(-1).outcome, 'answered');
});
test('cancel preserves completed identity and ends the pending query', async t => {
  let onSecond; const second = new Promise(resolve => { onSecond = resolve; });
  const d = await device(t, (command, socket) => { if (command === 'IDM?') normal(command, socket); else onSecond(); });
  const runner = new AnthemDiagnostics(500, 3000, 0);
  const pending = runner.run(d.config); await second; runner.stop();
  const report = await pending;
  assert.equal(report.model, 'Future Anthem Stereo'); assert.equal(report.finishReason, 'cancelled');
  assert.equal(report.queries.at(-1).outcome, 'cancelled');
});
test('overall deadline bounds nonresponsive hardware', async t => {
  const d = await device(t, () => {});
  const report = await new AnthemDiagnostics(500, 40, 0).run(d.config);
  assert.equal(report.finishReason, 'time-limit'); assert.equal(report.queries.length, 1);
});
test('connection closure and oversized replies preserve partial diagnostic evidence', async t => {
  for (const oversized of [false, true]) {
    const d = await device(t, (command, socket) => {
      if (command === 'IDM?') normal(command, socket);
      else if (oversized) socket.write('X'.repeat(9000)); else socket.end();
    });
    const report = await new AnthemDiagnostics(100, 3000, 0).run(d.config);
    assert.equal(report.model, 'Future Anthem Stereo');
    assert.equal(report.finishReason, oversized ? 'response-limit' : 'connection-closed');
  }
});
test('ordinary preview and diagnostics share cancellation, concurrency, and cooldown', async t => {
  let reached; const received = new Promise(resolve => { reached = resolve; });
  const d = await device(t, () => reached());
  const tester = new ConnectionTester(100, 5000);
  const pending = tester.diagnose(d.config); await received;
  await assert.rejects(tester.test(d.config), /already running/);
  await assert.rejects(tester.diagnose(d.config), /already running/);
  tester.stop(); assert.equal((await pending).finishReason, 'cancelled');
  await assert.rejects(tester.test(d.config), /five seconds/);
});
test('default report omits private replies and configuration, and raw export requires opt-in', async t => {
  const d = await device(t, normal);
  const report = await new AnthemDiagnostics(100, 3000, 0).run(d.config);
  report.unsolicitedReplies.push('unknown confidential device data');
  report.config = { Host: '10.20.30.40', _bridge: { pin: '123-45-678' } };
  const redacted = JSON.stringify(reportBuilder.build(report, { reportedModel: 'Anthem at 10.20.30.40' }, false, '10.20.30.40'));
  for (const secret of ['SECRET123', 'Private room', 'confidential', '10.20.30.40', '123-45-678']) assert.ok(!redacted.includes(secret), secret);
  const raw = JSON.stringify(reportBuilder.build(report, {}, true));
  assert.ok(raw.includes('SECRET123')); assert.ok(raw.includes('Private room')); assert.ok(!raw.includes('_bridge'));
});
test('unframed responses retain bounded byte evidence only in the private export', async t => {
  const d = await device(t, (command, socket) => { if (command === 'IDM?') socket.write('Different protocol\r\n'); else normal(command, socket); });
  const report = await new AnthemDiagnostics(40, 3000, 0).run(d.config);
  assert.equal(report.queries[0].outcome, 'unrecognized');
  assert.equal(Buffer.from(report.queries[0].responseHex, 'hex').toString(), 'Different protocol\r\n');
  assert.ok(report.queries[0].receivedBytes > 0);
  assert.equal(reportBuilder.build(report).queries[0].responseHex, undefined);
});
test('unreachable endpoint returns a useful report and runner can be reused', async t => {
  const server = net.createServer().listen(0, '127.0.0.1'); await once(server, 'listening');
  const port = server.address().port; await new Promise(resolve => server.close(resolve));
  const runner = new AnthemDiagnostics(50, 500, 0);
  const report = await runner.run({ Host: '127.0.0.1', Port: port });
  assert.equal(report.connection, 'not-connected'); assert.equal(report.finishReason, 'connection-error');
  const d = await device(t, normal); assert.equal((await runner.run(d.config)).finishReason, 'finished');
});
test('report separates user observation from detected state and explains alternate-format rejections', async t => {
  const d = await device(t, normal);
  const report = await new AnthemDiagnostics(100, 3000, 0).run(d.config);
  const result = reportBuilder.build(report, { powerState: 'unknown' });
  assert.equal(result.schemaVersion, 2);
  assert.equal(result.userContext.userReportedPowerState, null);
  assert.equal(result.userContext.powerState, undefined);
  assert.deepEqual(result.summary.queries, { attempted: 12, answered: 10, rejected: 2, expectedAlternativeRejections: 2, otherOutcomes: 0 });
  assert.deepEqual(result.summary.detectedState, { inputCount: 2, zones: [{ zone: 1, power: 'on', muted: false, volumeDb: -42.5, volumePercent: 35, input: 1 }] });
  const serial = result.queries.find(q => q.command === 'IDN?');
  assert.equal(serial.errorCode, '!I'); assert.match(serial.explanation, /GSN\? answered/);
  const observed = reportBuilder.build(report, { powerState: 'standby' });
  assert.equal(observed.userContext.userReportedPowerState, 'standby');
  assert.equal(observed.summary.detectedState.zones[0].power, 'on');
});
test('missing state is never reported as off and unexpected rejections stay unexplained by alternatives', () => {
  const report = { queries: [
    { command: 'Z1POW?', outcome: 'timeout', replies: [] },
    { command: 'IDN?', outcome: 'rejected', replies: ['!I'] },
    { command: 'GSN?', outcome: 'timeout', replies: [] },
  ] };
  const summary = reportBuilder.summarize(report);
  assert.equal(summary.detectedState.zones[0].power, null);
  assert.equal(summary.queries.expectedAlternativeRejections, 0);
  assert.equal(summary.queries.otherOutcomes, 2);
  assert.equal(reportBuilder.explain(report.queries[1], report.queries).expectedAlternativeRejection, false);
});
