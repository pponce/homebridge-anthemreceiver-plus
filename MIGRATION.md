# Migrating to Anthem Receiver Plus

If you already use `homebridge-anthemreceiver` and keep the default `"platform": "AnthemReceiver"` in your existing configuration, replacing the package should preserve your accessories, pairings, scenes, and automations. Do not remove any TV accessory bridge that was created by the older homebridge-anthemreceiver plugin. Do not remove the child bridge for the older plugin either. 

The maintainer completed this migration successfully and reported that no changes to existing scenes or automations were needed. Other setups can differ, so **download a full backup from Homebridge UI before starting**.

## Migration steps

Keep your existing receiver configuration, bridge or child bridge, and paired Apple Home accessories. Do not reset cached accessories or pairing data.

On a Linux installation using the **Homebridge APT `hb-service` wrapper**, run these commands in order:

```bash
sudo hb-service stop
sudo hb-service remove homebridge-anthemreceiver
sudo hb-service add homebridge-anthemreceiver-plus
sudo hb-service start
```

The new package comes from npm. Keep Homebridge stopped between removing the old plugin and installing Plus. If a command fails, resolve the error before proceeding; start Homebridge only after the new package installs successfully.

After startup, check the existing accessories and run a few scenes and automations. They should work without being recreated or paired again.

## A few notes

- Keep the exact platform name `AnthemReceiver`, and retain any existing `_bridge` settings. Do not add a second platform block for Plus in the homebridge conf.
- Run only the new plugin after migration; both packages register the same platform.
- If you explicitly qualified the platform with the old package name or use a `plugins` allowlist, update that package reference to Plus while keeping your existing bridge settings.
- These commands are for the Homebridge APT installation. Other installation methods need the equivalent package replacement while retaining configuration and pairing data.
- If something does not reconnect, check Homebridge logs before removing anything from Apple Home. Use your backup to restore the previous setup if needed.

Automated migration checks also cover main-bridge and child-bridge identity preservation. They complement the maintainer's successful live migration; they do not guarantee every older plugin version or custom setup.
