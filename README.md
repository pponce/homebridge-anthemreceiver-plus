<p align="center">
  <img src="https://raw.githubusercontent.com/pponce/homebridge-anthemreceiver-plus/main/assets/icon.png" alt="Anthem Receiver Plus icon" width="180" height="180">
</p>

# homebridge-anthemreceiver-plus

**Independent successor maintained by Pedro Ponce de Leon.** This project retains the `AnthemReceiver` platform name and existing accessory identifiers to support migration from `homebridge-anthemreceiver`. It is not yet verified by Homebridge. See [migration guidance](MIGRATION.md) before replacing an existing installation, and [project origins](ACKNOWLEDGEMENTS.md) for upstream credit.

**Release status:** `1.0.0` is prepared as the first stable Plus release. Published versions and release notes are listed in [GitHub Releases](https://github.com/pponce/homebridge-anthemreceiver-plus/releases); npm publication is a separate step.

Control your Anthem receiver from Apple Home and the Apple TV Remote on your iPhone. Choose the controls you want for each supported zone, including power, volume, mute, and input selection.

## Highlights

- **A volume slider that fits your listening range.** Set **Maximum volume (dB)** to match the limit on your receiver. The Home app's full slider then spans your usable range, with 100% representing your chosen maximum. [See how volume control works](#volume-control-in-apple-home).
- **Modern settings with readable day and night themes.** Grouped connection, zone, and display settings make setup easier, with inline validation and Homebridge's familiar Save button.
- **A read-only connection preview.** Check the receiver's model, firmware, inputs, and available zone status without changing playback or volume.
- **More reliable everyday control.** Improved reply handling, automatic reconnection, and state refresh help HomeKit stay in sync. Supported commands wait for receiver confirmation and report communication failures.
- **Stable accessory and input handling.** Corrected Zone 2 setup and input updates preserve existing accessory identities and reuse unchanged input services.
- **Select “None” for listening mode.** A dedicated **None** switch lets supported receivers return to listening mode None from Apple Home or a scene, while preserving existing listening-mode switch identifiers.

## Controls and supported models

Available controls depend on the model and enabled zones:

- Zone 1 and Zone 2 combined **Power/Input** accessories, paired separately in Apple Home for Apple TV Remote access.
- Separate zone controls for **Power, Volume, Mute, Input, and Dolby Audio Processing**.
- Zone 1 **ARC** and **Audio Listening Mode** controls, including a dedicated **None** listening-mode switch on protocol V02 models.
- **Front Panel Brightness** control.

Supported receiver families:

- AVM 60, AVM 70, AVM 90
- MRX 310, MRX 510, MRX 710
- MRX 520, MRX 720, MRX 1120
- MRX 540, MRX 740, MRX 1140
- MRX SLM (single zone)

The owner has reported successful testing of these changes on an **MRX 540 8K**. This is not a claim of hardware testing across every supported model.

Homebridge 1.8 and 2.x on Node.js 22 or 24 are supported. Automated checks cover those combinations; see [package.json](package.json) for the declared engine ranges. The original plugin's broader, untested Node engine ranges are not carried into this new package.

![Anthem controls in Apple Home](AR6.jpg)

## Getting started

1. Install Homebridge and Homebridge UI.
2. For a new installation, follow [Installing or updating](#installing-or-updating) below. Published npm packages include the compiled plugin and are the recommended release installation path. Existing users must follow [MIGRATION.md](MIGRATION.md) to replace the old package without resetting their setup.
3. Enable **Connected Standby** on the receiver. On supported models, this is in the receiver's web UI under **System Setup → General → General Settings**.
4. Open the plugin's settings in Homebridge UI, enter the receiver address, and enable the accessories you want.
5. Optionally set **Maximum volume (dB)** to match your receiver's maximum volume setting.
6. Save and restart the relevant Homebridge instance or child bridge.

Enabled standalone controls appear through Homebridge. Combined **Power/Input** accessories require the separate pairing step below.

## Adding the Power/Input accessory on an iPhone

Pair each enabled zone's Power/Input accessory once to make it available in Apple Home and the Apple TV Remote in Control Center.

1. Enable **Power/Input** for the zone in the plugin settings, save, and restart Homebridge.
2. Open the **Home** app on your iPhone.
3. Tap **+ → Add Accessory → More Options**.
4. Select the zone's Power/Input television accessory, such as **Zone1** or **Zone2**.
5. Follow the pairing prompts, using the Homebridge pairing code when requested.

Wording and placement can vary by iOS version. Repeat for a second enabled zone. Existing paired accessories do not need to be removed and added again for a normal plugin update.

## Apple TV Remote in Control Center

Open the **Apple TV Remote** in your iPhone's Control Center and select the paired zone accessory. Available controls depend on the receiver model and the buttons shown by iOS.

| Control | Receiver action |
| --- | --- |
| iPhone's physical volume buttons | Adjust volume while using the receiver remote |
| Up / Down | Adjust volume |
| Play / Pause | Toggle mute |
| Left / Right | Select input in the main zone |
| Back | Cycle listening mode in the main zone |
| Info | Show or hide the main-zone menu |
| Center | Select a main-zone menu option |

## Audio Listening Mode in Apple Home

Enable Zone 1 **Audio Listening Mode** in the plugin settings to expose the mode switches on a protocol V02 receiver. With the zone powered on, turn **None** on to select the receiver's None listening mode. The plugin waits for receiver confirmation and updates the other mode switches from receiver feedback. None selects a listening mode; it does not mute the receiver or change ARC.

The switches act as a mode selector: turn the mode you want on. Turning the selected switch off restores its confirmed state; to leave None, turn another mode on. All mode switches show Off when the zone is powered off.

The None switch is added to the existing ALM accessory after updating and restarting Homebridge. Existing accessory and switch identifiers are preserved, so existing scenes and automations do not need to be recreated. Add None to any scene where you want to select it explicitly.

## Volume control in Apple Home

Enable the zone's **Volume** accessory to get a slider in the Home app. HomeKit exposes this separate control as a lightbulb-style accessory: its brightness slider adjusts receiver volume, and its on/off control unmutes or mutes a powered-on zone. Use the zone's power control to turn the receiver on first.

### Make the full slider useful

If you limit your Anthem to a maximum such as **−10 dB**, set the plugin's **Maximum volume (dB)** to the same value. The slider then spreads volume adjustments across that listening range. **100% means your chosen −10 dB maximum**, making the top of the slider meaningful instead of leaving part of its travel above the receiver's allowed range.

The mapping also applies to volume feedback, so a change made on the receiver is reflected on the same scale in HomeKit. This setting applies to the plugin's percentage-based volume controls; it does not rescale the relative up/down buttons on the remote.

With a maximum of **−10 dB**, the slider behaves like this:

| Home app slider | Receiver setting |
| --- | --- |
| 0% | Mute |
| 1% | −89.5 dB |
| 50% | Approximately −50 dB |
| 100% | −10 dB |

Values from 1–100% map linearly in dB, rounded to the receiver's 0.5 dB steps. A percentage is a position within your configured range, not a percentage of perceived loudness. Moving above 0% sends an unmute command as well as the requested volume.

**Set the maximum on the receiver itself, then enter the same value in the plugin.** The plugin setting controls slider mapping; it does not change the Anthem's own maximum-volume setting or limit other remotes. One plugin value is shared by both zones, so check your zone limits if you use Zone 2.

Leave **Maximum volume (dB)** blank to retain the receiver's native percentage control (`PVOL`). In JSON, the setting is named `MaxVolumeDB`; for example, this configuration enables the Zone 1 volume accessory:

```json
{
  "platform": "AnthemReceiver",
  "Host": "192.168.1.50",
  "Port": 14999,
  "MaxVolumeDB": -10,
  "Zone1": {
    "Volume": true
  }
}
```

## Configuration UI

The custom settings page groups receiver connection details, Zone 1/Zone 2 accessories, display and volume settings, and iPhone pairing help. Day and night themes include contrasting text, fields, help text, buttons, and borders.

- **Test connection** reads model, firmware, inputs, and available zone status using the address currently entered. It does not send power, volume, mute, input-change, or remote-key commands.
- The preview is timestamped. Missing status is shown as unknown rather than Off, and model-specific options account for restrictions such as the SLM's single zone.
- You can save valid settings while the receiver is offline. Opening, editing, or testing settings does not save them automatically: use Homebridge's **Save** button, then restart the relevant instance or child bridge.
- Existing configuration keys and Homebridge metadata are preserved.

## Reliability and stability improvements

The receiver communication and accessory handling have been updated to make everyday use more dependable:

| Improvement | What it means in use |
| --- | --- |
| Complete TCP reply buffering | Replies split across network packets are reassembled, so partial messages no longer silently lose state updates. |
| Response validation | Malformed receiver data is rejected, and ARC/Dolby feedback works for multi-digit input numbers. |
| Connection recovery and cleanup | Closed connections, errors, and timeouts trigger controlled retries. Old sockets and timers are cleaned up, and a fresh handshake refreshes existing accessories. |
| Confirmed state changes | HomeKit requests are processed in order and supported state changes wait for feedback or a read-back. Power-on waits for basic zone readiness; offline or unconfirmed operations report failure. |
| Correct zone and configuration handling | Missing optional configuration sections and the default port are handled consistently. Zone 2 registers on compatible receivers, while SLM remains single-zone. |
| Stable input updates | Refreshed input lists update using stable identifiers, reusing unchanged services and removing stale ones. Standalone input accessories no longer need to be removed and re-added to pick up the refreshed list. |
| Listening-mode None selection | A dedicated None switch resolves the missing selection described in [upstream issue #19](https://github.com/EHylands/homebridge-anthemreceiver/issues/19), using receiver confirmation and preserving existing ALM switch identities. |
| Automated regression checks | CI covers receiver simulations, configuration, command handling, browser themes, package contents, and direct GitHub installation. |

Commands are not automatically replayed after a disconnect, avoiding repeated toggles or volume steps. Relative volume/listening-mode controls verify a subsequent state reply. Navigation and menu keys can only confirm that the command was written to the connection; the protocol does not provide equivalent confirmation of their effect.

For contributor setup, stable publication, and verification, see [SUCCESSOR_SETUP.md](SUCCESSOR_SETUP.md).

See [CHANGELOG.md](CHANGELOG.md) for the change summary and [IMPROVEMENT_PLAN.md](IMPROVEMENT_PLAN.md) for validation history and remaining follow-up work.

## Installing or updating

**Migrating from `homebridge-anthemreceiver`?** Follow [MIGRATION.md](MIGRATION.md) first. The commands below are for a new installation or an update to an already-installed Plus package. Installing both plugins together is not the migration procedure. Keep the existing `AnthemReceiver` platform configuration, bridge identity, cached accessories, and pairing data when replacing the old package.

### Published releases from npm

Published npm packages include the compiled plugin and custom settings UI. No local checkout or manual build is required. After a stable release is published, you can search for **homebridge-anthemreceiver-plus** in Homebridge UI and install it there.

For the **Homebridge APT package's `hb-service` wrapper**, install or update to the published stable version:

```bash
sudo hb-service stop &&
sudo hb-service add homebridge-anthemreceiver-plus &&
sudo hb-service start
```

The bare npm package name selects npm's `latest` tag. You can also write `homebridge-anthemreceiver-plus@latest` explicitly.

You can replace the tag with an exact published version, for example `homebridge-anthemreceiver-plus@1.0.0`. The prepared version in this repository does not establish npm availability; the package/version must have been published first.

### Installing or updating from GitHub

To install this repository directly with the same APT wrapper:

```bash
sudo hb-service stop &&
sudo hb-service add pponce/homebridge-anthemreceiver-plus &&
sudo hb-service start
```

The `pponce/` prefix selects GitHub. Without a revision suffix, this installs the default branch, `main`, which may contain changes newer than the latest release. It does **not** select the newest GitHub Release or npm package.

To select a particular GitHub revision, append `#` and a published tag, branch name, or commit SHA. For example, after the corresponding release tag exists:

```bash
sudo hb-service stop &&
sudo hb-service add 'pponce/homebridge-anthemreceiver-plus#v1.0.0' &&
sudo hb-service start
```

GitHub installation builds the source through npm's `prepare` script, so npm lifecycle scripts must be enabled and build dependencies must be available. The direct GitHub installation path is covered by CI. [npm Git installation behavior](https://docs.npmjs.com/cli/v11/commands/npm-install/#description)

### Compiled files, changelog, and release notes

The running plugin needs `dist`, but **compiled files do not need to be committed to this repository**. They are already ignored by Git. The publication process builds and checks the compiled files, then includes `dist` and the custom UI in the npm package. Installing that published package does not require compiling the plugin on your Homebridge machine.

[CHANGELOG.md](CHANGELOG.md) records changes in the project, and [GitHub Releases](https://github.com/pponce/homebridge-anthemreceiver-plus/releases) provide version-specific release notes. Creating a GitHub Release does not publish to npm or compile GitHub's automatic source ZIP/tarball downloads; npm publication is a separate step. [The stable publishing script](scripts/publish-release.sh) publishes the built npm package under `latest` and creates the matching non-prerelease GitHub release.

### After installation

Open the plugin settings in Homebridge UI and restart as shown above. For normal Plus updates, keep the existing configuration and paired accessories. With the APT wrapper, inspect startup logs using:

```bash
sudo hb-service view
```

The `&&` sequence starts Homebridge only after a successful installation. If installation fails, Homebridge stays stopped; inspect the error before retrying or reinstalling your previous version.

These commands are for the APT wrapper, which passes package specifications to npm. Other `hb-service` implementations may accept only npm package names and versions; use Homebridge UI or the installer appropriate to your setup. [APT wrapper source](https://github.com/homebridge/homebridge-apt-pkg/blob/latest/deb/opt/homebridge/hb-service-shim)

## Compatibility and troubleshooting

- **Startup readiness:** a receiver can still take a few seconds to become ready after power-on. The plugin now waits for basic zone status within a bounded deadline and reports a timeout if readiness is not confirmed; it cannot eliminate hardware boot time.
- **Refreshing inputs:** input lists are read during initialization/reconnection and zone power-on. After editing inputs on the receiver, restart the relevant Homebridge instance or child bridge, or power-cycle the zone, to trigger a refresh. Updated lists are reconciled without removing accessories. If the Home app still shows an old list, close and reopen it.
- **Switch names in Apple Home:** if Input or Audio Listening Mode switches show a generic zone name, open each switch's details and clear the custom name so Home can use the supplied default. The previously reported Home app naming behavior has not been verified as fixed by this PR.
- **Listening modes:** direct listening-mode switches, including **None**, require a protocol V02 model. Select None by turning its switch on; turning all mode switches off is not how to select it. Older receivers retain Apple Remote listening-mode cycling.
- **Standby connectivity:** keep Connected Standby enabled so the receiver can remain reachable when powered off.
- **Connection preview:** this uses a separate read-only connection. Behavior on models that limit simultaneous control connections needs model-specific testing.
