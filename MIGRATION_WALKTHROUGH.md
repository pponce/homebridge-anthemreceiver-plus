# Existing-user migration walkthrough

**Keep the existing TV accessories and child bridge paired in Apple Home. Do not remove, reset, or re-pair them as a migration step.** Replace the plugin package while retaining its existing configuration and Homebridge data.

This guide is being piloted by the maintainer before claiming a successful real Apple Home migration. Commands target the **Homebridge APT installation on Linux**, service `homebridge`, and storage `/var/lib/homebridge`. Docker, macOS, global npm installations, custom storage, and linked development plugins need commands adapted to their actual installation. See [migration details](MIGRATION.md) for the underlying identity-preservation mechanism.

The first walkthrough installs the published stable **1.0.0** package. A source-code merge, such as the TypeScript 7 build update, does not change that published package. Keep runtime upgrades and development-branch changes separate from this migration test.

## What to keep

| Existing item | Action |
| --- | --- |
| Power/Input TV accessory for each enabled zone | Keep it paired, in its existing room. These are separately published external TV accessories, including when the plugin runs in a child bridge. |
| Anthem child bridge in Apple Home | Keep it paired. Do not select Remove Bridge. |
| Child bridge in Homebridge UI | Keep its existing assignment. Do not toggle child-bridge mode or create a replacement bridge. |
| `platform: "AnthemReceiver"` block | Keep the block and all receiver, zone, and volume settings. Do not add a second block for Plus. |
| Existing `_bridge` object | Preserve all fields, especially `username`, `port`, `pin`, and `setupID` if present. |
| `accessories/` and `persist/` | Preserve these directories. Do not reset cached accessories or pairing data. |
| Installed npm package | Replace `homebridge-anthemreceiver` with `homebridge-anthemreceiver-plus`. |
| Apple Home scenes and automations | Leave them in place and test them after replacement. |

Homebridge derives the child bridge cache filename from `_bridge.username`. A changed plugin label in Homebridge UI does not itself mean that the child bridge needs pairing again.

## Step 1 — Record the working baseline

While the old plugin is running:

1. Record its version, the Homebridge version, and the Node version used by the running service. Plus supports Homebridge 1.8/2.x and Node 22/24. If a runtime upgrade is needed, complete and validate it separately first.
2. In the configuration editor, locate the existing `AnthemReceiver` platform and its `_bridge` object. Inspect without editing or saving.
3. In Apple Home, record the rooms and names of the TV accessories and ordinary power/volume/mute controls. Screenshot a few relevant scenes and automations.
4. Test power, volume, mute, input selection, and one existing scene now. This distinguishes pre-existing issues from migration failures.

## Step 2 — Download a Homebridge backup

In Homebridge UI, open **Settings → Backup & Restore → Backup Now**, and save the downloaded backup to your computer. See [Homebridge's backup guide](https://github.com/homebridge/homebridge/wiki/Backup-and-Restore). Keep backups private: they contain configuration and pairing material.

A Homebridge backup is not a backup of Apple's Home database. Step 4 additionally preserves the actual installed plugin files, including an unpublished predecessor build that may not be reproducible by reinstalling its version number from npm.

## Step 3 — Run the read-only preflight

Run this on the Homebridge host through SSH. It does not stop Homebridge or modify configuration, and prints selected identifiers and fingerprints rather than pairing PINs, keys, or the complete configuration.

```bash
{
  echo "===== BEGIN ANTHEM MIGRATION PREFLIGHT ====="
  echo "Service state:"
  systemctl show homebridge -p ActiveState -p SubState
  echo "Diagnostic Node version:"
  node --version
  sudo node - "$(command -v hb-service)" <<'NODE'
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const root = '/var/lib/homebridge';
const issues = [];
try {
  const shim = process.argv[2];
  const apt = Boolean(shim && fs.readFileSync(fs.realpathSync(shim), 'utf8').includes('provided by Homebridge APT Package'));
  console.log('APT hb-service wrapper:', apt ? 'yes' : 'not confirmed');
  if (!apt) issues.push('Installer type needs review.');
  const raw = fs.readFileSync(path.join(root, 'config.json'));
  const config = JSON.parse(raw);
  console.log('Storage:', root);
  const mounted = fs.readFileSync('/proc/self/mountinfo', 'utf8').split('\n').some(line => line.split(' ')[4] === root);
  if (mounted || fs.lstatSync(root).isSymbolicLink()) issues.push('Storage is a mount point or symlink; backup/rollback commands need adjustment.');
  console.log('Config fingerprint:', crypto.createHash('sha256').update(raw).digest('hex'));
  for (const name of ['homebridge', 'homebridge-anthemreceiver', 'homebridge-anthemreceiver-plus']) {
    const dir = path.join(root, 'node_modules', name);
    if (!fs.existsSync(path.join(dir, 'package.json'))) {
      console.log(name + ': not installed at this prefix');
      if (name !== 'homebridge-anthemreceiver-plus') issues.push(name + ' was not found.');
      continue;
    }
    const pkg = JSON.parse(fs.readFileSync(path.join(dir, 'package.json'), 'utf8'));
    console.log(name + ': version ' + pkg.version);
    if (name === 'homebridge') {
      const [major, minor] = pkg.version.split('.').map(Number);
      if (!(major === 2 || (major === 1 && minor >= 8))) issues.push('Homebridge version is outside the supported range.');
    }
    if (name === 'homebridge-anthemreceiver-plus') issues.push('Plus is already installed; inspect before replacing anything.');
    if (name === 'homebridge-anthemreceiver') {
      console.log('Legacy package is linked:', fs.lstatSync(dir).isSymbolicLink());
      if (fs.lstatSync(dir).isSymbolicLink()) issues.push('Linked legacy source needs a separate backup and tailored replacement.');
    }
  }
  const platforms = (config.platforms || []).filter(p => /^(?:homebridge-anthemreceiver(?:-plus)?\.)?AnthemReceiver$/.test(p.platform || ''));
  console.log('Anthem platform blocks:', platforms.length);
  if (platforms.length !== 1) issues.push('Expected exactly one Anthem platform block.');
  for (const p of platforms) {
    console.log('Platform alias:', p.platform);
    console.log('Bridge mode:', p._bridge ? 'child bridge' : 'main bridge');
    if (p._bridge) {
      console.log('Child bridge username:', p._bridge.username);
      console.log('Child bridge port:', p._bridge.port ?? 'automatic');
      console.log('Child bridge config fingerprint:', crypto.createHash('sha256').update(JSON.stringify(p._bridge)).digest('hex'));
      if (!p._bridge.username) issues.push('Child bridge has no username.');
    }
    if (p.platform !== 'AnthemReceiver') issues.push('Qualified platform identifier needs a targeted migration review.');
  }
  console.log('Plugin allowlist configured:', Array.isArray(config.plugins));
  if (Array.isArray(config.plugins)) issues.push('Review the plugin allowlist before replacement.');
  const disabled = (config.disabledPlugins || []).filter(x => ['homebridge-anthemreceiver', 'homebridge-anthemreceiver-plus'].includes(x));
  console.log('Disabled Anthem packages:', disabled.length ? disabled.join(', ') : 'none');
  if (disabled.length) issues.push('Review disabled-plugin settings.');
  for (const dir of ['accessories', 'persist']) {
    if (!fs.existsSync(path.join(root, dir))) issues.push('Missing ' + dir + ' storage directory.');
  }
  console.log(issues.length ? 'REVIEW REQUIRED before proceeding:' : 'PASS: common APT replacement path identified.');
  for (const issue of issues) console.log('- ' + issue);
} catch (error) {
  console.log('REVIEW REQUIRED:', error.message);
  process.exitCode = 1;
}
NODE
  echo "===== END ANTHEM MIGRATION PREFLIGHT ====="
}
```

Continue only after the output identifies the common APT path and the service/storage shown in Homebridge UI match `/var/lib/homebridge`. For the maintainer's first migration, share this output before running the replacement steps.

If it says **REVIEW REQUIRED**, resolve that item first. A qualified platform identifier or `plugins` allowlist needs a targeted package-name review; do not work around this by deleting the platform or creating a new child bridge. A linked legacy plugin requires a separate source backup. A mount point, symlink, or different installation prefix needs adapted backup/rollback commands.

## Step 4 — Stop Homebridge and take an exact local snapshot

Use the same SSH session for subsequent blocks: they reuse `anthem_migration_backup`. After a disconnect, set that variable to the exact backup path printed below before continuing. Do not guess or automatically select a backup from another attempt.

This stops **the entire Homebridge service**, including other child bridges and the web UI. Homebridge accessories will temporarily show No Response; SSH remains available. The archive includes all of `/var/lib/homebridge`, including installed packages, so allow enough free disk space.

```bash
{
  echo "===== BEGIN ANTHEM MIGRATION BACKUP ====="
  anthem_migration_backup="$HOME/homebridge-migration-backups/anthem-$(date +%Y%m%d-%H%M%S)"
  if mkdir -p "$anthem_migration_backup" &&
     chmod 700 "$anthem_migration_backup" &&
     sudo hb-service stop &&
     [ "$(systemctl is-active homebridge)" = "inactive" ] &&
     sudo tar -czpf "$anthem_migration_backup/homebridge-storage.tar.gz" -C /var/lib/homebridge . &&
     sudo tar -tzf "$anthem_migration_backup/homebridge-storage.tar.gz" >/dev/null &&
     sudo cp -a /var/lib/homebridge/config.json "$anthem_migration_backup/config.before.json" &&
     sudo cp -a /var/lib/homebridge/accessories "$anthem_migration_backup/accessories.before" &&
     sudo cp -a /var/lib/homebridge/persist "$anthem_migration_backup/persist.before" &&
     sudo cp -a /var/lib/homebridge/node_modules/homebridge/package.json "$anthem_migration_backup/homebridge.before.json"
  then
    echo "PASS: Snapshot complete. Homebridge remains stopped."
    echo "BACKUP PATH: $anthem_migration_backup"
  else
    echo "STOPPED: Snapshot incomplete. Do not remove any plugin."
    echo "Check service state and resolve the backup failure first."
  fi
  echo "===== END ANTHEM MIGRATION BACKUP ====="
}
```

Proceed only after **PASS: Snapshot complete**. Keep this snapshot and the downloaded UI backup through the migration and normal-use checks.

## Step 5 — Replace only the package

Use this block only after preflight and backup passed. These APT-wrapper commands operate on npm packages; they do not use a Homebridge UI flow that removes configuration or child bridges. `--ignore-scripts` is suitable because the published npm package already contains compiled `dist`; it is not the GitHub-source installation procedure.

```bash
{
  echo "===== BEGIN ANTHEM PACKAGE REPLACEMENT ====="
  if [ -n "${anthem_migration_backup:-}" ] &&
     sudo test -s "$anthem_migration_backup/homebridge-storage.tar.gz" &&
     sudo test -s "$anthem_migration_backup/config.before.json" &&
     [ "$(systemctl is-active homebridge)" = "inactive" ] &&
     sudo hb-service remove homebridge-anthemreceiver --ignore-scripts &&
     sudo hb-service add homebridge-anthemreceiver-plus@1.0.0 --ignore-scripts
  then
    echo "PASS: Package replacement completed. Homebridge remains stopped."
    echo "Run the identity and package checks before starting Homebridge."
  else
    echo "STOPPED: Replacement did not complete. Do not start Homebridge yet."
    echo "Keep the backup and inspect the error. Restore the snapshot if needed."
  fi
  echo "===== END ANTHEM PACKAGE REPLACEMENT ====="
}
```

Do not start Homebridge between removal and installation: a startup with no matching platform can cause cached accessories to be treated as orphaned.

## Step 6 — Verify preserved data, then start

The next block compares configuration, caches, and pairing files **before the first Plus startup**. It verifies that only Plus is installed at this prefix, its entry point loads, and Homebridge's version did not change. After startup, Homebridge is expected to update cached plugin ownership and other normal persistence fields; byte-for-byte cache comparison is not an after-startup requirement.

```bash
{
  echo "===== BEGIN ANTHEM MIGRATION VERIFY AND START ====="
  if [ -n "${anthem_migration_backup:-}" ] &&
     [ "$(systemctl is-active homebridge)" = "inactive" ] &&
     sudo cmp -s "$anthem_migration_backup/config.before.json" /var/lib/homebridge/config.json &&
     sudo diff -qr "$anthem_migration_backup/accessories.before" /var/lib/homebridge/accessories &&
     sudo diff -qr "$anthem_migration_backup/persist.before" /var/lib/homebridge/persist &&
     sudo node - "$anthem_migration_backup" <<'NODE'
const fs = require('node:fs');
const assert = require('node:assert/strict');
const root = '/var/lib/homebridge/node_modules/';
const before = JSON.parse(fs.readFileSync(process.argv[2] + '/homebridge.before.json', 'utf8'));
assert.equal(require(root + 'homebridge/package.json').version, before.version, 'Homebridge version changed');
assert.equal(fs.existsSync(root + 'homebridge-anthemreceiver'), false, 'Old package is still installed');
assert.equal(require(root + 'homebridge-anthemreceiver-plus/package.json').version, '1.0.0');
assert.equal(typeof require(root + 'homebridge-anthemreceiver-plus'), 'function', 'Plus entry point did not load');
console.log('PASS: Configuration, identity files, package, and Homebridge version verified.');
NODE
  then
    if sudo hb-service start
    then
      echo "Homebridge service started. Check logs and existing Apple Home accessories."
    else
      echo "STOPPED: Homebridge did not start successfully. Inspect the error."
    fi
  else
    echo "STOPPED: Verification failed. Keep Homebridge stopped and inspect before proceeding."
  fi
  echo "===== END ANTHEM MIGRATION VERIFY AND START ====="
}
```

Open Homebridge UI again and read startup logs. Look for:

- Plus `1.0.0` loaded, with the original child bridge username if applicable.
- Existing accessories loaded from cache. Homebridge may report **Plugin association is now being transformed** on the first migration startup. Absence of that line alone does not prove failure, particularly for TV-only configurations.
- The receiver reaching **Starting Controller Operation**.
- No repeated **Failed to find plugin to handle accessory**, **Removing orphaned accessory**, duplicate-platform, or missing-plugin errors.

For a terminal log view:

```bash
{
  echo "===== BEGIN ANTHEM STARTUP LOG REVIEW ====="
  sudo hb-service view
  echo "===== END ANTHEM STARTUP LOG REVIEW ====="
}
```

Read logs locally before sharing; redact pairing codes, setup URIs, and unrelated sensitive plugin output. A successful service start alone does not establish successful receiver startup.

## Step 7 — Test the existing Apple Home setup

1. Give the existing tiles a short time to reconnect, then open the existing TV accessory. Do not use Add Accessory.
2. Verify the same TVs, ordinary controls, names, and rooms are present without duplicates.
3. Verify the original child bridge remains paired. Do not scan a QR code or enter a pairing PIN for migration.
4. Test power, mute, a small volume adjustment, and input selection through the existing controls.
5. Open iPhone Control Center's Apple TV Remote and select the same receiver/zone accessory. Test its controls.
6. Run the scenes recorded in Step 1 and exercise relevant automations. Confirm existing accessory references still work.
7. Inspect Plus settings. The original receiver, zone, volume, and child bridge settings should already exist. Do not save fresh defaults over them.
8. If Audio Listening Mode is enabled on a supported receiver, test None. A newly supported control does not imply that the existing bridge or TV needs pairing again.

If Home requests new bridge/TV pairing or scene references break, **stop and investigate; do not delete the old objects to make new ones work**. Preserve them for rollback.

## Step 8 — Restart once more and record the result

After the first checks pass:

```bash
{
  echo "===== BEGIN ANTHEM MIGRATION SECOND RESTART ====="
  if sudo hb-service restart
  then
    echo "Restart requested. Repeat the existing TV, child bridge, and scene checks."
  else
    echo "STOPPED: Restart failed. Inspect the service logs."
  fi
  echo "===== END ANTHEM MIGRATION SECOND RESTART ====="
}
```

Record the old version/source, Plus version, Homebridge/Node versions, receiver model, bridge mode, and whether TV pairing, child bridge pairing, rooms, scenes, and automations survived both starts. Keep backup archives private; share results and relevant redacted errors. Hardware migration remains unverified until these checks actually pass.

## Rollback for the common APT path

Restore with Homebridge stopped and Apple Home objects still paired. This restores the **whole Homebridge instance**, including all plugins and settings, to the stopped snapshot. Failed migration files are moved aside rather than deleted. Use only for the preflight-confirmed regular `/var/lib/homebridge` directory, not a mount point, symlink, or Docker volume.

```bash
{
  echo "===== BEGIN ANTHEM MIGRATION ROLLBACK ====="
  anthem_failed_storage="/var/lib/homebridge.after-anthem-$(date +%Y%m%d-%H%M%S)"
  if [ -n "${anthem_migration_backup:-}" ] &&
     sudo test -s "$anthem_migration_backup/homebridge-storage.tar.gz" &&
     sudo tar -tzf "$anthem_migration_backup/homebridge-storage.tar.gz" >/dev/null &&
     sudo hb-service stop &&
     [ "$(systemctl is-active homebridge)" = "inactive" ] &&
     ! mountpoint -q /var/lib/homebridge &&
     ! sudo test -L /var/lib/homebridge &&
     ! sudo test -e "$anthem_failed_storage" &&
     sudo mv /var/lib/homebridge "$anthem_failed_storage" &&
     sudo mkdir /var/lib/homebridge &&
     sudo tar -xzpf "$anthem_migration_backup/homebridge-storage.tar.gz" -C /var/lib/homebridge &&
     sudo hb-service start
  then
    echo "Previous Homebridge snapshot restored. Check the old plugin and existing Apple Home controls."
    echo "Failed migration files retained at: $anthem_failed_storage"
  else
    echo "STOPPED: Rollback incomplete. Inspect the error before starting or changing anything else."
    echo "Backup: ${anthem_migration_backup:-not set}"
    echo "Possible retained storage: $anthem_failed_storage"
  fi
  echo "===== END ANTHEM MIGRATION ROLLBACK ====="
}
```

Restoring Homebridge cannot necessarily repair scene references after an accessory has been removed from Apple's Home database. Removing/re-pairing is therefore not part of this guide.

## Evidence and limits

The integration test runs actual Homebridge before and after the package rename with the same storage and configuration. It covers a main bridge and an existing child bridge, each with two external TVs, checking cache ownership, HAP AIDs/IIDs, signing identities, and synthetic controller pairing records. Both paths passed across Node 22/24 and Homebridge 1/2 in [CI run 34638561132](https://github.com/pponce/homebridge-anthemreceiver-plus/actions/runs/34638561132).

The legacy fixture uses the same compiled implementation with only the package/plugin name changed. It isolates the rename mechanism; it does not prove migration from every older upstream version or preservation of a real iPhone's Home database. The maintainer's first live walkthrough remains pending.

Sources: [APT installer](https://github.com/homebridge/homebridge-apt-pkg/blob/latest/deb/opt/homebridge/hb-service-shim), [child bridge identity and cache naming](https://github.com/homebridge/homebridge/blob/v1.8.5/src/childBridgeService.ts), [cached plugin reassociation](https://github.com/homebridge/homebridge/blob/v1.8.5/src/bridgeService.ts).
