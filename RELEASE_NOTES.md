# Anthem Receiver Plus 1.1.0

Adds advanced read-only diagnostics for recognized and unknown Anthem hardware, with shareable reports for troubleshooting and future compatibility investigations.

## Changes

- Fix Homebridge version discovery when package exports hide its manifest. Add detected-state and query-count summaries, distinguish optional user-reported power state, and explain rejected alternate-format queries in the UI and schema-v2 JSON reports.

- Add generic advanced diagnostics to the configuration UI for recognized and unknown Anthem hardware, without changing runtime model support. Collect bounded read-only query outcomes, partial results, and optional raw reply/hex evidence.
- Add report preview, copy/download actions, default privacy filtering, optional Zone 2 probing, and shared test cancellation/concurrency/cooldown safeguards.

- Upgrade the build compiler to TypeScript 7.0.2 or compatible 7.x updates. Resolve its CLI through the exported package manifest so builds and direct GitHub installations work with TypeScript 7's package exports.
- Remove the unused `ts-node` development dependency; development watching already builds JavaScript before starting Homebridge.

## Testing and compatibility

- The maintainer tested the diagnostics workflow on an MRX 540 8K.
- Unknown-model diagnostics collect evidence; this release does not add STR or other new hardware to the supported-model list.
- Report schema 2 separates user-reported power state from detected state and includes query counts and explanations. Copy and download contain the previewed JSON.
- Existing settings and HomeKit accessory identities are preserved.

## Update

Update homebridge-anthemreceiver-plus through Homebridge UI, then restart the relevant Homebridge instance or child bridge. Existing users do not need to remove accessories or reset pairing data.

For users testing the GitHub branch: switch back to the npm package to receive stable releases.

Requires Node.js 22 or 24 and Homebridge 1.8 or 2.x. Compiled dist files are included in the npm package and remain untracked in Git.
