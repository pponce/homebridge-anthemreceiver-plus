'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

// Fake external commands exercise release ordering without network or publication.
const mock = `#!${process.execPath}
const fs = require('node:fs');
const path = require('node:path');
const tool = path.basename(process.argv[1]);
const args = process.argv.slice(2);
const scenario = process.env.RELEASE_SCENARIO;
const root = process.env.RELEASE_FIXTURE;
const statePath = path.join(root, 'state.json');
const state = JSON.parse(fs.readFileSync(statePath, 'utf8'));
fs.appendFileSync(path.join(root, 'calls.log'), tool + ' ' + args.join(' ') + '\\n');
const out = value => console.log(value);
const fail = value => { console.error(value); process.exitCode = 1; };
const sha = 'a'.repeat(40);
if (tool === 'git') {
  if (args[0] === 'rev-parse') out(args[1] === 'HEAD' ? sha : root);
  else if (args[0] === 'branch') out('main');
  else if (args[0] === 'remote') out('git@github.com:pponce/homebridge-anthemreceiver-plus.git');
  else if (args[0] !== 'status') fail('Unexpected git command');
} else if (tool === 'gh') {
  if (args[0] === 'api') {
    if (args[1].endsWith('/commits/main')) out(sha);
    else if (args[1].includes('/actions/workflows/')) out('99');
    else if (args[1].endsWith('/actions/runs/99')) out('success');
    else if (args[1].includes('/git/ref/tags/')) fail('HTTP 404');
    else fail('Unexpected gh API request');
  } else if (args[0] === 'release' && args[1] === 'view') fail('HTTP 404');
  else if (!['auth', 'run', 'release'].includes(args[0])) fail('Unexpected gh command');
} else if (tool === 'npm') {
  if (args[0] === 'config') out('https://registry.npmjs.org/');
  else if (args[0] === 'whoami') scenario === 'auth' ? fail('E401') : out('klidec');
  else if (args[0] === 'view' && args[2] === 'maintainers') out(JSON.stringify(['klidec <test@example.invalid>']));
  else if (args[0] === 'view' && args[2] === 'dist.integrity') {
    state.reads++;
    if (scenario === 'mismatch') out(JSON.stringify('sha512-different'));
    else if (scenario === 'delayed' || scenario === 'resume') {
      if (state.reads <= 3) fail('E404');
      else out(JSON.stringify('sha512-fixture'));
    } else if (scenario === 'timeout' && state.reads > 1) fail('E404');
    else out(JSON.stringify('sha512-fixture'));
  } else if (args[0] === 'view' && args[2] === 'dist-tags.latest') {
    state.tags++;
    out(scenario === 'delayed' && state.tags === 1 ? '0.9.0' : '1.0.0');
  } else if (args[0] === 'pack') out(JSON.stringify([{filename:'fixture.tgz', integrity:'sha512-fixture'}]));
  else if (args[0] === 'test' && scenario === 'test-failure') fail('Test failed');
  else if (!['install', 'run', 'test', 'publish'].includes(args[0])) fail('Unexpected npm command');
} else if (tool !== 'sleep') fail('Unexpected tool');
fs.writeFileSync(statePath, JSON.stringify(state));
`;

function run(scenario, resume = false, source = false) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'anthem-release-test-'));
  try {
    const bin = path.join(root, 'bin');
    fs.mkdirSync(bin);
    fs.writeFileSync(path.join(root, 'package.json'), JSON.stringify({name:'homebridge-anthemreceiver-plus', version:'1.0.0'}));
    fs.writeFileSync(path.join(root, 'CHANGELOG.md'), 'fixture');
    fs.writeFileSync(path.join(root, 'RELEASE_NOTES.md'), 'fixture');
    fs.writeFileSync(path.join(root, 'state.json'), JSON.stringify({reads:0,tags:0}));
    for (const tool of ['git','gh','npm','sleep']) fs.writeFileSync(path.join(bin, tool), mock, {mode:0o755});
    const script = path.resolve(__dirname, '../scripts/publish-release.sh');
    const args = source ? ['-c', 'script=$1; shift; source "$script"; printf "SHELL_STILL_RUNNING\\n"', 'bash', script] : [script, ...(resume ? ['--resume'] : [])];
    const result = spawnSync('bash', args, {cwd:root, encoding:'utf8', timeout:20000,
      env:{...process.env, PATH:bin + path.delimiter + process.env.PATH, RELEASE_SCENARIO:scenario, RELEASE_FIXTURE:root}});
    assert.ifError(result.error);
    return {...result, calls:fs.readFileSync(path.join(root, 'calls.log'), 'utf8'), state:JSON.parse(fs.readFileSync(path.join(root, 'state.json'), 'utf8'))};
  } finally { fs.rmSync(root, {recursive:true, force:true}); }
}

test('successful publish retries registry reads and stale latest without republishing', () => {
  const r = run('delayed');
  assert.equal(r.status, 0, r.stdout + r.stderr);
  assert.equal((r.calls.match(/^npm publish /gm) || []).length, 1);
  assert.equal((r.calls.match(/^gh release create /gm) || []).length, 1);
  assert.ok(r.calls.lastIndexOf('dist-tags.latest') < r.calls.indexOf('gh release create'));
  assert.match(r.stdout, /BEGIN ANTHEM RECEIVER PLUS RELEASE/);
  assert.match(r.stdout, /END ANTHEM RECEIVER PLUS RELEASE: SUCCESS/);
});

test('resume tolerates registry delay and never invokes publication', () => {
  const r = run('resume', true);
  assert.equal(r.status, 0, r.stdout + r.stderr);
  assert.doesNotMatch(r.calls, /^npm publish /m);
  assert.match(r.calls, /^gh release create /m);
});

test('an identical published package completes the release without republishing', () => {
  const r = run('existing');
  assert.equal(r.status, 0, r.stdout + r.stderr);
  assert.doesNotMatch(r.calls, /^npm publish /m);
  assert.match(r.calls, /^gh release create /m);
});

for (const scenario of ['mismatch', 'auth', 'test-failure', 'timeout']) {
  test(scenario + ' stops before publication or GitHub release with an END marker', () => {
    const r = run(scenario, true);
    assert.notEqual(r.status, 0);
    assert.doesNotMatch(r.calls, /^(npm publish|gh release create) /m);
    assert.match(r.stdout, /END ANTHEM RECEIVER PLUS RELEASE: STOPPED/);
    if (scenario === 'timeout') assert.equal(r.state.reads, 13);
  });
}

test('sourcing a failed release preserves the calling shell', () => {
  const r = run('auth', false, true);
  assert.equal(r.status, 0);
  assert.match(r.stdout, /SHELL_STILL_RUNNING/);
  assert.match(r.stdout, /END ANTHEM RECEIVER PLUS RELEASE: STOPPED/);
});
