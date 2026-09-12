# Anthem Receiver Plus 1.2.1

Fixes package metadata for Homebridge verification and normal plugin installation.

## Packaging

- Move `homebridge` from `peerDependencies` to `devDependencies`. Homebridge supplies the runtime when loading the plugin; npm should not install another copy as a plugin dependency.
- Keep `engines.homebridge` at `^1.8.0 || ^2.0.0` and retain Node.js 22/24 compatibility.
- Add a package check that rejects Homebridge or HAP-NodeJS in runtime, optional, peer or bundled dependency declarations.

## Updating

Update normally through Homebridge UI, then restart the Homebridge instance or child bridge running this plugin. Keep your existing configuration and paired accessories.

Receiver controls and accessory identities are unchanged by this packaging fix. STR PA/IA support remains experimental; see the [STR testing guide](https://github.com/pponce/homebridge-anthemreceiver-plus/blob/main/STR_TESTING.md).
