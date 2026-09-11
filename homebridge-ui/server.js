'use strict';
const { HomebridgePluginUiServer } = require('@homebridge/plugin-ui-utils');
const { normalizeConfig } = require('../dist/config');
const { ConnectionTester } = require('../dist/ui-test');

class AnthemUiServer extends HomebridgePluginUiServer {
  constructor() {
    super();
    const tester = new ConnectionTester();
    this.onRequest('/validate', config => {
      try { normalizeConfig(config); return { valid: true }; }
      catch (error) { return { valid: false, error: error instanceof Error ? error.message : 'Invalid receiver settings' }; }
    });
    this.onRequest('/test-connection', async config => {
      try { return { ok: true, receiver: await tester.test(config) }; }
      catch (error) { return { ok: false, error: error instanceof Error ? error.message : 'Connection test failed' }; }
    });
    this.onRequest('/diagnostics', async request => {
      try {
        const report = await tester.diagnose(request?.config, request?.includeZone2 === true);
        let homebridgeVersion = 'Unavailable';
        try { homebridgeVersion = require('homebridge/package.json').version; } catch { /* Optional environment detail. */ }
        return { ok: true, report: { ...report, environment: {
          plugin: require('../package.json').version, node: process.version,
          platform: process.platform, architecture: process.arch, homebridge: homebridgeVersion,
        } } };
      } catch (error) { return { ok: false, error: error instanceof Error ? error.message : 'Diagnostics could not start' }; }
    });
    this.onRequest('/cancel-test', () => { tester.stop(); return { ok: true }; });
    process.once('disconnect', () => tester.stop());
    this.ready();
  }
}
new AnthemUiServer();

