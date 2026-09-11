/* global homebridge, AnthemConfig, AnthemDiagnosticReport */
'use strict';
const hb = homebridge;
const message = document.getElementById('message');
const form = document.getElementById('settings');
let blocks, config, revision = 0, syncing = false, timer, testing = false;
let support;
const clone = AnthemConfig.clone;
function node(tag, text, className) {
  const item = document.createElement(tag);
  if (text !== undefined) item.textContent = text;
  if (className) item.className = className;
  return item;
}
function feedback(text, kind = 'info') { message.textContent = text; message.className = `alert alert-${kind}`; }
function get(path) { return path.split('.').reduce((value, key) => value?.[key], config); }
function set(path, value) {
  const keys = path.split('.'); const key = keys.pop();
  let object = config;
  for (const name of keys) object = object[name] ??= {};
  if (value === undefined) delete object[key]; else object[key] = value;
}
function changed(path) {
  revision++; hb.disableSaveButton();
  if (path === 'Host' || path === 'Port') { document.getElementById('diagnostic-results').replaceChildren(); support = undefined; applyCapabilities(); document.getElementById('preview').replaceChildren(); }
  clearTimeout(timer); timer = setTimeout(sync, 180);
}
async function sync() {
  if (syncing) return;
  syncing = true;
  const checkedRevision = revision;
  try {
    for (const input of form.querySelectorAll('input')) input.setAttribute('aria-invalid', String(!input.checkValidity()));
    if (!form.checkValidity()) { feedback('Check the highlighted fields before saving.', 'danger'); return; }
    const result = await hb.request('/validate', clone(config));
    if (checkedRevision !== revision) return;
    if (!result.valid) { feedback(result.error || 'Check your receiver settings.', 'danger'); return; }
    await hb.updatePluginConfig(clone(blocks));
    if (checkedRevision !== revision) return;
    hb.enableSaveButton();
    feedback('Settings are ready. Use Save below to keep them.', 'success');
  } catch {
    hb.disableSaveButton();
    feedback('Could not validate or synchronize settings. Edit a field to retry. Your changes have not been saved.', 'danger');
  } finally {
    syncing = false;
    if (checkedRevision !== revision) { clearTimeout(timer); timer = setTimeout(sync, 0); }
  }
}
function field(parent, path, label, options = {}) {
  const wrapper = node('div', undefined, 'anthem-field');
  const input = document.createElement('input'); input.id = `field-${path.replaceAll('.', '-')}`;
  input.type = options.boolean ? 'checkbox' : options.number ? 'number' : 'text';
  input.className = options.boolean ? 'form-check-input' : 'form-control';
  if (options.boolean) input.checked = get(path) ?? false;
  else input.value = get(path) ?? options.fallback ?? '';
  if (options.required) input.required = true;
  if (options.min !== undefined) input.min = options.min;
  if (options.max !== undefined) input.max = options.max;
  if (options.number) input.step = options.step || '1';
  if (options.maxLength) input.maxLength = options.maxLength;
  if (options.capability) input.dataset.capability = options.capability;
  if (path.startsWith('Zone2.')) input.dataset.zone2 = 'true';
  const title = node('label', label); title.htmlFor = input.id;
  if (options.boolean) { const row = node('div', undefined, 'anthem-toggle'); row.append(input, title); wrapper.append(row); }
  else wrapper.append(title, input);
  if (options.help) { const help = node('small', options.help); help.id = input.id + '-help'; input.setAttribute('aria-describedby', help.id); wrapper.append(help); }
  input.addEventListener('input', () => { set(path, options.boolean ? input.checked : options.number ? input.value === '' ? undefined : Number(input.value) : input.value); changed(path); });
  parent.append(wrapper);
  return input;
}
function applyCapabilities() {
  for (const input of form.querySelectorAll('[data-capability], [data-zone2]')) {
    input.disabled = !!support && ((input.dataset.zone2 && support.zones === 1) || (input.dataset.capability && !support[input.dataset.capability]));
  }
  const note = document.getElementById('capability-note');
  if (note) note.textContent = support ? `Detected ${support.model}. Unavailable controls are disabled; previously saved choices are preserved.` : 'Availability depends on your receiver model. Test the connection to preview supported controls.';
}
function table(headers, rows, captionText) {
  const output = node('table', undefined, 'table table-sm');
  output.append(node('caption', captionText));
  const head = node('thead'); const heading = node('tr');
  for (const title of headers) { const th = node('th', title); th.scope = 'col'; heading.append(th); }
  head.append(heading); output.append(head);
  const body = node('tbody');
  for (const row of rows) { const tr = node('tr'); for (const value of row) tr.append(node('td', String(value))); body.append(tr); }
  output.append(body); return output;
}
async function testConnection() {
  if (testing) return;
  const preview = document.getElementById('preview');
  testing = true; document.getElementById('run-diagnostics').disabled = true; document.getElementById('test').disabled = true; document.getElementById('cancel').hidden = false;
  const testedRevision = revision;
  preview.replaceChildren(node('p', 'Connecting to the receiver…', 'alert alert-info'));
  try {
    const result = await hb.request('/test-connection', clone(config));
    preview.replaceChildren();
    if (testedRevision !== revision) { preview.append(node('p', 'Settings changed during the test. Run it again to check the new values.', 'alert alert-warning')); return; }
    if (!result.ok) { preview.append(node('p', result.error || 'Connection test failed.', 'alert alert-danger')); return; }
    const receiver = result.receiver;
    support = receiver.capabilities; applyCapabilities();
    preview.className = 'anthem-preview';
    preview.append(node('p', `${receiver.model} · Firmware ${receiver.firmware || 'Unknown'} · Serial ${receiver.serial || 'Unknown'}`));
    preview.append(table(['Zone', 'Power', 'Mute', 'Volume', 'Input'], receiver.zones.map(zone => [zone.number,
      zone.power === null ? 'Unknown' : zone.power ? 'On' : 'Off', zone.mute === null ? 'Unknown' : zone.mute ? 'Muted' : 'Unmuted',
      zone.volume === null ? 'Unknown' : `${zone.volume} dB`, zone.input ?? 'Unknown']), `Receiver status checked ${new Date(receiver.checkedAt).toLocaleTimeString()}`));
    if (!receiver.complete) preview.append(node('p', 'Some information was unavailable. Standby mode or model support may limit status replies.', 'anthem-help'));
    if (receiver.inputs.length) {
      const details = node('details'); details.append(node('summary', `${receiver.inputs.length} inputs discovered`));
      details.append(table(['Input', 'Name'], receiver.inputs.map(input => [input.number, input.name]), 'Receiver input names'));
      preview.append(details);
    }
  } catch { preview.replaceChildren(node('p', 'Could not complete the connection test. Check the address and try again.', 'alert alert-danger')); }
  finally { testing = false; document.getElementById('run-diagnostics').disabled = false; document.getElementById('test').disabled = false; document.getElementById('cancel').hidden = true; }
}
async function runDiagnostics() {
  if (testing) return;
  const output = document.getElementById('diagnostic-results');
  output.className = 'anthem-preview';
  const testedRevision = revision;
  const testedConfig = clone(config);
  const context = { reportedModel: document.getElementById('diagnostic-model').value,
    powerState: document.getElementById('diagnostic-power').value };
  testing = true;
  document.getElementById('test').disabled = true;
  document.getElementById('run-diagnostics').disabled = true;
  document.getElementById('cancel').hidden = false;
  output.replaceChildren(node('p', 'Reading diagnostic replies… You can cancel and keep partial results.', 'alert alert-info'));
  try {
    const result = await hb.request('/diagnostics', { config: testedConfig, includeZone2: document.getElementById('diagnostic-zone2').checked });
    output.replaceChildren();
    if (testedRevision !== revision) {
      output.append(node('p', 'Settings changed during diagnostics. Run again to collect a report for the current settings.', 'alert alert-warning')); return;
    }
    if (!result.ok) { output.append(node('p', result.error || 'Diagnostics could not start.', 'alert alert-danger')); return; }
    const report = result.report;
    output.append(node('p', report.connection === 'connected' ? 'TCP connection established.' : 'TCP connection was not established.', 'alert alert-info'));
    output.append(node('p', `${report.model || 'No model identified'} · ${report.recognizedModel ? 'Recognized by this plugin' : 'Not recognized by this plugin'}. Diagnostic replies do not confirm control or HomeKit compatibility.`));
    const summary = AnthemDiagnosticReport.summarize(report);
    output.append(node('p', `Run ended: ${report.finishReason}. ${summary.queries.answered} of ${summary.queries.attempted} attempted queries answered; ${summary.queries.expectedAlternativeRejections} expected alternate-format rejections.`));
    output.append(node('p', `Your observed power state: ${context.powerState === 'unknown' ? 'Not specified' : context.powerState}. Detected states below come from the device replies.`));
    const unknown = value => value === null ? 'Unknown' : value;
    if (summary.detectedState.zones.length) output.append(table(['Zone', 'Power', 'Mute', 'Volume (dB)', 'Volume (%)', 'Input'],
      summary.detectedState.zones.map(zone => [zone.zone, zone.power === null ? 'Unknown' : zone.power === 'on' ? 'On' : 'Off',
        zone.muted === null ? 'Unknown' : zone.muted ? 'Muted' : 'Unmuted', unknown(zone.volumeDb), unknown(zone.volumePercent), unknown(zone.input)]), 'Detected device state'));
    output.append(table(['Query', 'Outcome', 'Time (ms)', 'Meaning'], report.queries.map(query => {
      const detail = AnthemDiagnosticReport.explain(query, report.queries);
      return [query.command, detail.expectedAlternativeRejection ? 'Rejected (expected alternate format)' : query.outcome,
        query.elapsedMs, `${detail.purpose}: ${detail.explanation}`];
    }), 'Read-only diagnostic results'));
    const privacy = document.createElement('input'); privacy.type = 'checkbox'; privacy.className = 'form-check-input'; privacy.id = 'diagnostic-private';
    const privacyLabel = node('label', undefined, 'anthem-toggle'); privacyLabel.append(privacy, document.createTextNode(' Include raw replies and device identifiers'));
    output.append(privacyLabel, node('p', 'The report below is exactly what will be copied or downloaded. Review it before attaching it to an issue. Raw replies can contain serial numbers, input names, and other device information.', 'anthem-help'));
    const preview = node('pre', '', 'anthem-diagnostic-report'); preview.tabIndex = 0; preview.setAttribute('aria-label', 'Diagnostic report preview');
    const refresh = () => { preview.textContent = JSON.stringify(AnthemDiagnosticReport.build(report, context, privacy.checked, testedConfig.Host), null, 2); };
    privacy.addEventListener('change', refresh); refresh(); output.append(preview);
    const actions = node('div', undefined, 'anthem-actions');
    const copy = node('button', 'Copy report', 'btn btn-outline-primary'); copy.type = 'button';
    const download = node('button', 'Download report', 'btn btn-outline-secondary'); download.type = 'button';
    const status = node('p', '', 'anthem-help'); status.setAttribute('role', 'status');
    copy.addEventListener('click', async () => {
      try { await navigator.clipboard.writeText(preview.textContent); status.textContent = 'Report copied.'; }
      catch { status.textContent = 'Clipboard is unavailable here. Use Download report or select the report text to copy it.'; }
    });
    download.addEventListener('click', () => {
      const url = URL.createObjectURL(new Blob([preview.textContent + '\n'], { type: 'application/json' }));
      const link = document.createElement('a'); link.href = url; link.download = 'anthem-diagnostics.json';
      document.body.append(link); link.click(); link.remove(); setTimeout(() => URL.revokeObjectURL(url), 1000);
      status.textContent = 'Report downloaded. Review it before sharing.';
    });
    actions.append(copy, download); output.append(actions, status);
  } catch { output.replaceChildren(node('p', 'Could not complete diagnostics. Check the address and try again.', 'alert alert-danger')); }
  finally {
    testing = false; document.getElementById('test').disabled = false;
    document.getElementById('run-diagnostics').disabled = false; document.getElementById('cancel').hidden = true;
  }
}

async function initialize() {
  hb.disableSaveButton();
  try {
    const loaded = AnthemConfig.load(await hb.getPluginConfig()); blocks = loaded.blocks; config = loaded.config;
    field(document.getElementById('connection'), 'Host', 'Receiver IP address or hostname', { required: true, maxLength: 253, help: 'Example: 192.168.1.50' });
    field(document.getElementById('connection'), 'Port', 'TCP port', { number: true, min: 1, max: 65535, fallback: 14999, help: 'The default Anthem control port is 14999.' });
    const zones = document.getElementById('zones');
    const note = node('p', '', 'anthem-help'); note.id = 'capability-note'; zones.append(note);
    for (const number of [1, 2]) {
      const key = `Zone${number}`; const card = node('section', undefined, 'anthem-card'); card.setAttribute('aria-label', `Zone ${number} settings`);
      card.append(node('h3', `Zone ${number}`));
      const grid = node('div', undefined, 'anthem-grid'); card.append(grid);
      field(grid, `${key}.Name`, 'Zone name', { fallback: `Zone ${number}`, maxLength: 128 });
      field(grid, `${key}.Active`, 'TV accessory and Apple Remote', { boolean: true, help: 'Pair this accessory separately in Apple Home after restarting.' });
      const controls = node('div', undefined, 'anthem-grid anthem-options'); card.append(controls);
      for (const [property, label, capability] of [['Power', 'Power switch'], ['Mute', 'Mute switch'], ['Volume', 'Volume control', 'volume'], ['MultipleInputs', 'Separate input switches']]) {
        field(controls, `${key}.${property}`, label, { boolean: true, capability });
      }
      const advanced = node('details', undefined, 'anthem-options'); advanced.append(node('summary', 'Audio processing controls'));
      const audio = node('div', undefined, 'anthem-grid'); advanced.append(audio);
      if (number === 1) {
        field(audio, `${key}.ARC`, 'Anthem Room Correction (ARC)', { boolean: true, help: 'Controls room correction for the active input, when ARC is configured on the receiver.' });
        field(audio, `${key}.ALM`, 'Listening-mode switches', { boolean: true, capability: 'directListeningMode', help: 'Older receivers can still cycle listening modes from Apple Remote.' });
      }
      field(audio, `${key}.DolbyPostProcessing`, 'Dolby audio processing', { boolean: true, capability: 'dolby' });
      card.append(advanced); zones.append(card);
    }
    field(document.getElementById('display'), 'PanelBrightness', 'Front-panel brightness control', { boolean: true, capability: 'brightness' });
    field(document.getElementById('display'), 'MaxVolumeDB', 'Maximum volume (dB)', { number: true, min: -89.5, max: 10, step: '0.5', help: 'Optional. Match the maximum set on your receiver. Maps HomeKit 1–100% to this dB range; 0% mutes. Leave blank for receiver percentage control.' });
    form.hidden = false; applyCapabilities();
    document.getElementById('test').addEventListener('click', testConnection);
    document.getElementById('run-diagnostics').addEventListener('click', runDiagnostics);
    document.getElementById('cancel').addEventListener('click', () => { void hb.request('/cancel-test').catch(() => {}); });
    form.addEventListener('submit', event => event.preventDefault());
    await sync();
  } catch (error) { feedback(error instanceof Error ? error.message : 'Could not load settings.', 'danger'); }
}
void initialize();

