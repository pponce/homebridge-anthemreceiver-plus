'use strict';
const fs = require('node:fs');
const path = require('node:path');

// Resolve the public entry point, then read its owning manifest from disk.
// Homebridge's exports deliberately do not expose homebridge/package.json.
function getHomebridgeVersion(resolveEntry = () => require.resolve('homebridge')) {
  try {
    let directory = path.dirname(fs.realpathSync(resolveEntry()));
    while (true) {
      const manifest = path.join(directory, 'package.json');
      if (fs.existsSync(manifest)) {
        const pkg = JSON.parse(fs.readFileSync(manifest, 'utf8'));
        if (pkg.name === 'homebridge' && typeof pkg.version === 'string') return pkg.version;
      }
      const parent = path.dirname(directory);
      if (parent === directory) break;
      directory = parent;
    }
  } catch { /* The UI may run where Homebridge is not resolvable. */ }
  return 'Unavailable';
}
module.exports = { getHomebridgeVersion };
