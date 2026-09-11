# Migrating to Anthem Receiver Plus

For the staged Linux APT procedure, including backups, child bridge preservation, checks, and rollback, use the [existing-user walkthrough](MIGRATION_WALKTHROUGH.md). Keep existing TV accessories and the child bridge paired in Apple Home throughout. The maintainer's first live walkthrough is still pending.

The goal is to replace `homebridge-anthemreceiver` with `homebridge-anthemreceiver-plus` while preserving the same receiver configuration, Homebridge identity, cached accessories, and pairing data. A new npm name alone does not require new Apple Home accessories. Keeping display names alone is not sufficient to preserve them.

## What changes and what stays

| Item | Plus behavior |
| --- | --- |
| Package / registered plugin identifier | `homebridge-anthemreceiver-plus` |
| Platform / schema alias | `AnthemReceiver` stays unchanged |
| Config keys and zone settings | Existing keys are retained |
| Accessory UUID generation | Unchanged from the merged predecessor baseline |
| Service UUIDs and subtypes | Unchanged; includes the previously added ALM None switch |
| Main bridge or child bridge username and pairing data | Must be preserved during replacement |
| External TV accessory identity | Same model/serial/zone UUID formula; persistent pairing data must remain |

Homebridge 1.8.5 and 2.0.0 source include a cache-restoration path that looks up an active dynamic platform when the previous package cannot be found, then reassigns the cached accessory to the replacement plugin. This depends on a unique matching platform. Do not load the old and new packages together for the same receiver.

The Plus integration test starts actual Homebridge with a legacy-name fixture and then Plus using the same storage and configuration. It covers both main-bridge and existing child-bridge configurations, comparing bridged and external TV accessory AIDs/IIDs, cache ownership, signing identities, and synthetic controller pairing records. The legacy fixture uses the same compiled implementation with only its package/plugin name changed, isolating the rename from older functional differences. This is not an end-to-end Apple Home migration test and does not prove migration from every upstream release.

Both automated migration paths passed on all four Node 22/24 × Homebridge 1/2 combinations in [CI run 34638561132](https://github.com/pponce/homebridge-anthemreceiver-plus/actions/runs/34638561132). This confirms the tested host-level rename mechanism, not real Apple Home scene preservation.

## Before touching the running installation

1. Select a published, tested Plus release. The standalone repository exists; it does not need to be created again. The initial walkthrough uses published stable version `1.0.0`.
2. Use Homebridge UI to download a full backup. Record the current installed commit/version and keep the previous package source available.
3. Record a few existing Apple Home scenes and automations to check after migration. A Homebridge backup is not a complete backup of Apple's Home database.
4. Check the current plugin configuration. Keep `platform: "AnthemReceiver"`, the existing zone flags, and any `_bridge` configuration exactly as they are. A qualified platform name, plugin allowlist, or plugin-specific child-bridge setup needs a targeted adjustment to the new package name while retaining the existing bridge username/storage. Do not create a new child bridge to perform the migration.
5. Keep the same receiver model and serial identity. Do not reset cached accessories, Homebridge persistence, or Apple Home pairing.

## Replacement sequence for the owner's APT installation

The previously confirmed host uses the Homebridge APT `hb-service` wrapper and installs plugins under `/var/lib/homebridge`. The replacement sequence must occur while Homebridge stays stopped:

1. Stop Homebridge.
2. Remove only the old npm package from the existing installation prefix, with lifecycle scripts disabled. Do not use a UI action that also removes its configuration, child bridge, cached accessories, or pairing data.
3. Install the selected published stable Plus release into that same prefix using the existing APT installation method.
4. Confirm that only Plus is installed and the saved configuration/bridge identity remains present.
5. Start Homebridge and inspect the migration logs before changing anything in Apple Home.

The walkthrough starts with a read-only preflight to confirm the actual prefix and bridge setup before selecting the replacement commands. Your development checkout can safely exist alongside the old checkout; only the running Homebridge plugin installation must avoid loading both packages.

## Validation on the real receiver

- Confirm the existing tiles, rooms, and external Power/Input television accessories are still paired.
- Run existing scenes and automations, including volume, mute, input and ALM controls.
- Test None selection, receiver power-on readiness, and settings in day/night themes.
- Restart once more and verify that no duplicate accessories appear and no re-pairing is requested.
- If this uses a child bridge, verify that its original username, cache, pairing data and process assignment were preserved.

If accessories appear as new or unpaired, stop and inspect the backup and identity comparison before deleting anything in Home. Restoring Homebridge data cannot necessarily repair scene references after an accessory has been removed from Apple's Home database.

## Remaining limits

Matching platform names is one part of migration, not a guarantee. Old and new packages registering the same platform can be ambiguous; removing cached/persistent data breaks continuity; moving to a different bridge changes identity. Our owner-reported receiver testing covers the predecessor's MRX 540 8K behavior, not yet the Plus package replacement. Other model/firmware combinations and child-bridge migration need their own checks.

Sources: [Homebridge 1.8.5 cache restoration](https://github.com/homebridge/homebridge/blob/v1.8.5/src/bridgeService.ts), [Homebridge 2.0.0 cache restoration](https://github.com/homebridge/homebridge/blob/v2.0.0/src/bridgeService.ts).
