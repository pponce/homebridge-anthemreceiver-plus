# Anthem Receiver Plus 1.2.0

Adds experimental support for the Anthem STR Preamplifier (PA) and STR Integrated Amplifier (IA), together with diagnostics and an owner testing guide. Existing MRX and AVM support is retained.

## STR controls

- Separate PA and IA profiles with one zone, power, mute and normal input selection.
- Volume control from −96 to +7 dB in 0.5 dB steps. The configured maximum applies to the STR slider and volume buttons; 0% mutes.
- Four STR listening modes: Stereo, Mono, Both Left and Both Right.
- Restricted startup and control commands. ARC, brightness, menu navigation and Home Theatre Bypass selection remain disabled for STR pending further evidence.

## Diagnostics and guidance

- Automatically select ten STR diagnostic queries, skip Zone 2 and include listening-mode readings.
- Clearly identify experimental support in the UI, reports and startup log.
- Correct IDN identification to MAC address and hide MAC data in the default report.
- Exclude the BRT query reported to change STR balance on some firmware.
- Add a plain-language guide for regular installation, report collection, Apple Home checks and feedback on missing features. Open Plugins → Anthem Receiver Plus tile → ⋮ → Plugin Config to get started.

## Testing and compatibility

Automated tests cover PA/IA simulations, command confirmation, volume limits, reconnects and preservation of existing MRX listening-mode switches, including None. The repository CI also checks Node.js 22/24, Homebridge 1.8/2.x, browser behavior, migration, packaging and installation.

**Physical STR PA/IA validation is still needed. Experimental support is not a claim of confirmed operation on every model or firmware.** Please follow the [STR testing guide](https://github.com/pponce/homebridge-anthemreceiver-plus/blob/main/STR_TESTING.md) and share your results, including successful tests.

## Update

Install or update homebridge-anthemreceiver-plus normally through Homebridge UI, then restart the relevant Homebridge instance or child bridge. Existing users should keep their configuration and paired accessories.

Requires Node.js 22 or 24 and Homebridge 1.8 or 2.x. The npm package includes compiled dist files; main keeps generated dist untracked.
