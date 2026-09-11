'use strict';
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
// Resolve the compiler before removing old output, so a missing compiler is explicit.
// TypeScript 7 exports package.json, but no longer exports the bin/tsc subpath.
const manifestPath = require.resolve('typescript/package.json');
const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
if (typeof manifest.bin?.tsc !== 'string') throw new Error('TypeScript does not declare a tsc executable');
const compiler = path.resolve(path.dirname(manifestPath), manifest.bin.tsc);
fs.accessSync(compiler, fs.constants.R_OK);
fs.rmSync('dist', { recursive: true, force: true });
const result = spawnSync(process.execPath, [compiler], { stdio: 'inherit' });
if (result.error) throw result.error;
process.exitCode = result.status ?? 1;
