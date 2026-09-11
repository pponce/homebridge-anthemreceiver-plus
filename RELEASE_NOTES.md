# Anthem Receiver Plus 1.0.0

First stable release of the independent `homebridge-anthemreceiver-plus` project.

- **A more useful Home app volume slider:** set Maximum volume (dB) to match your receiver's limit; the full slider then covers your configured range, with 100% at that limit.
- **Modern settings:** grouped controls, inline validation, readable day/night themes, and a read-only receiver connection preview.
- **More dependable control:** buffered and validated TCP replies, controlled reconnection and state refresh, confirmed state changes, and corrected zone/input handling.
- **Audio Listening Mode None:** a dedicated selection on protocol V02 receivers, preserving existing listening-mode switch identifiers.
- **Homebridge 1/2 and Node 22/24:** automated receiver, migration, browser/theme, and package-install checks.
- **Independent package with continuity:** retains the `AnthemReceiver` platform alias and existing accessory identity rules. Original attribution and license are retained.

## Installation

For a new installation with the Homebridge APT wrapper, after npm publication:

```bash
sudo hb-service stop &&
sudo hb-service add homebridge-anthemreceiver-plus &&
sudo hb-service start
```

The npm package includes compiled `dist` and the custom settings UI. GitHub installation is also supported; see the [README](https://github.com/pponce/homebridge-anthemreceiver-plus#installing-or-updating).

## Migration and validation limits

Existing users must follow [MIGRATION.md](https://github.com/pponce/homebridge-anthemreceiver-plus/blob/main/MIGRATION.md) before replacing the old package. Do not load both packages for the same receiver or reset the existing bridge, accessory cache, or pairing data.

The owner reported successful predecessor testing on an MRX 540 8K. Automated tests cover package-rename cache reassociation, HAP identifiers, and synthetic pairing records. Live Plus migration with existing Apple Home scenes/automations and child bridges remains to be validated; the stable version label does not expand that test coverage.

Not yet Homebridge verified. STR preamplifier support is not included. See [ACKNOWLEDGEMENTS.md](https://github.com/pponce/homebridge-anthemreceiver-plus/blob/main/ACKNOWLEDGEMENTS.md) for project origins.
