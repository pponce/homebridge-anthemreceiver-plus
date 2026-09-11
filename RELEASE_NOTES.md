# Anthem Receiver Plus 1.0.0

First stable release of the independent `homebridge-anthemreceiver-plus` project.

- **A more useful Home app volume slider:** set Maximum volume (dB) to match your receiver's limit; the full slider then covers your configured range, with 100% at that limit.
- **Modern settings:** grouped controls, inline validation, readable day/night themes, and a read-only receiver connection preview.
- **More dependable control:** buffered and validated TCP replies, controlled reconnection and state refresh, confirmed state changes, and corrected zone/input handling.
- **Audio Listening Mode None:** a dedicated selection on protocol V02 receivers, preserving existing listening-mode switch identifiers.
- **Homebridge 1/2 and Node 22/24:** automated receiver, migration, browser/theme, and package-install checks.
- **Independent package with continuity:** retains the `AnthemReceiver` platform alias and existing accessory identity rules. Original attribution and license are retained.

## Installation

For a new installation with the Homebridge APT wrapper:

```bash
sudo hb-service stop
sudo hb-service add homebridge-anthemreceiver-plus
sudo hb-service start
```

You can also install or update **homebridge-anthemreceiver-plus** through Homebridge UI. See the [README](https://github.com/pponce/homebridge-anthemreceiver-plus#installing-or-updating).

## Migration and validation limits

Existing users can follow [MIGRATION.md](https://github.com/pponce/homebridge-anthemreceiver-plus/blob/main/MIGRATION.md) before replacing the old package. Do not load both packages for the same receiver or reset the existing bridge, accessory cache, or pairing data.

The owner reported successful receiver testing on an MRX 540 8K and a successful migration to Plus without changing existing scenes or automations. Automated tests cover main-bridge and child-bridge package replacement, including cache reassociation, HAP identifiers, and synthetic pairing records. Other models and custom setups may differ.

Not yet Homebridge verified. STR preamplifier support is not included. See [ACKNOWLEDGEMENTS.md](https://github.com/pponce/homebridge-anthemreceiver-plus/blob/main/ACKNOWLEDGEMENTS.md) for project origins.
