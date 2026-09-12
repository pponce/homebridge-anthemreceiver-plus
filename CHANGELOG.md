# Changelog

## Unreleased

## 1.2.0 — 2026-09-12

- Add experimental, separate STR PA/IA profiles for one-zone power, mute, normal inputs, dB volume and the four STR listening modes. Physical-device validation is pending.
- Apply the STR −96 to +7 dB range and half-dB steps, including configured caps for STR volume buttons. Preserve receiver-family volume and existing MRX listening-mode identities.
- Restrict STR control/startup commands; omit unsupported receiver features and bypass selection. Select ten STR diagnostic queries, skip Zone 2, expose mode evidence and mark experimental status.
- Correct IDN diagnostics to MAC-address identity and redact MAC data explicitly. Clarify the known STR BRT query side effect.
- Add a plain-language STR testing guide covering regular installation through Homebridge UI or hb-service, diagnostic reports, physical control checks and feedback for additional features; link it from Plugin Config and README.

## 1.1.0 — 2026-09-11

- Fix Homebridge version discovery when package exports hide its manifest. Add detected-state and query-count summaries, distinguish optional user-reported power state, and explain rejected alternate-format queries in the UI and schema-v2 JSON reports.

- Add generic advanced diagnostics to the configuration UI for recognized and unknown Anthem hardware, without changing runtime model support. Collect bounded read-only query outcomes, partial results, and optional raw reply/hex evidence.
- Add report preview, copy/download actions, default privacy filtering, optional Zone 2 probing, and shared test cancellation/concurrency/cooldown safeguards.

- Upgrade the build compiler to TypeScript 7.0.2 or compatible 7.x updates. Resolve its CLI through the exported package manifest so builds and direct GitHub installations work with TypeScript 7's package exports.
- Remove the unused `ts-node` development dependency; development watching already builds JavaScript before starting Homebridge.

## 1.0.0 — First stable Plus release

- Add the project icon in `assets/icon.png` and display it above the README title.
- Add a confirmed Audio Listening Mode **None** switch on protocol V02 models, preserving existing ALM accessory and service identifiers (upstream issue #19). Keep all mode switches off while the zone is off and restore actual mode state after switch-off requests.
- Introduce the independent `homebridge-anthemreceiver-plus` package and maintainership; preserve `AnthemReceiver`, accessory UUID rules, service types, and subtypes for migration.
- Add a real-Homebridge restart migration regression covering cache reassociation and HAP identifiers, plus standalone repository setup and stable publication instructions.
- Buffer and validate TCP replies, including fragmented UTF-8 input names and multi-digit ARC/Dolby responses.
- Normalize configuration and correctly register supported zones; preserve SLM's single-zone behavior.
- Reconnect after clean close/end/error/timeout with owned timers and refresh existing accessories after initialization.
- Serialize HomeKit control requests, confirm supported state changes, and report offline/failed operations.
- Reconcile TV inputs and standalone input switches without rebuilding unchanged services.
- Add a custom Homebridge settings UI with grouped zone controls, validation, and read-only receiver preview.
- Fix Homebridge night-theme contrast across settings text, form fields, help, tables, and buttons; add theme-aware browser contrast checks.
- Include compiled output and UI files explicitly in npm package contents while keeping dist out of Git; document npm and APT hb-service GitHub installation.
- Add a stable-release script checking npm account klidec, exact-commit CI, built package integrity, npm latest, and the matching GitHub release.

The standalone repository's initial five CI jobs passed, including browser/night-theme, migration, archive and GitHub-install checks. The 1.0.0 release script requires passing CI for the exact release commit. Owner testing covers the predecessor on an MRX 540 8K; live Plus migration and child-bridge scene preservation remain to be validated. See IMPROVEMENT_PLAN.md for validation history.

