# STR PA / IA testing and diagnostic reports

This guide is for owners helping validate **experimental** support in `homebridge-anthemreceiver-plus` and investigate additional STR commands. `STR PA` is the STR Preamplifier; `STR IA` is the STR Integrated Amplifier. A recognized model or an answered query does not mean the plugin has been physically validated on that device.

The initial implementation covers one zone, power, mute, discovered normal inputs, dB volume, and four listening modes. ARC control, front-panel brightness, menu navigation, and Home Theatre Bypass selection are not enabled. This is a plugin limitation, not a claim that the hardware lacks those features.

## 1. Prepare the device and record your setup

1. Use the experimental build supplied by the maintainer. Record the installed plugin version **and branch/commit**; a test branch may have the same package version as a stable release. The source PR uses `str-experimental-support`; the companion `str-experimental-install` branch includes compiled `dist` for installations that require it. Merge the source PR only.
2. Record whether you have the **Preamplifier (PA)** or **Integrated Amplifier (IA)**, its firmware version, and whether Home Theatre Bypass is configured. Do not assume the model string based only on its front-panel name.
3. Turn the STR on and wait for it to finish starting. Ensure its network control is enabled, using the settings described in your STR manual. Receiver web-UI instructions for MRX models may not apply to STR.
4. Close the Anthem mobile app and other control integrations for the test. A second connection can displace an existing connection on some devices. If the plugin already controls the STR, temporarily stop its **child bridge**, leaving Homebridge UI running. Do not stop the entire UI service if you need it to run diagnostics. For a setup without a separate child bridge, ask the maintainer for an isolation procedure if competing connections prevent testing.
5. Note the device address privately and the control port (normally **14999**). You do not need to include the address in a public report.

## 2. Capture a powered-on baseline

1. Open **Homebridge UI → Plugins → Anthem Receiver Plus → Settings**.
2. Enter the STR address and port under the connection settings. Running the diagnostic against these entered values does not require saving them or restarting Homebridge.
3. Expand **Advanced diagnostics / Test unsupported device**. The section is also useful for experimental models already recognized by the plugin.
4. Enter `STR Preamplifier` or `STR Integrated Amplifier` in **Model printed on the device**. Choose **On** under **Your observed power state**.
5. Leave **Also query Zone 2** unchecked. Both STR profiles have one zone; the probe skips Zone 2 even if selected.
6. Select **Run diagnostics** and wait for completion (up to 30 seconds). Do not change input, mute, power, or volume during the run: queries are sequential, not a simultaneous snapshot.
7. Check the detected model. The expected identity reply is `IDMSTR PA` or `IDMSTR IA`. If it differs, save the report and tell the maintainer; do not edit the reply or force an MRX model.
8. Leave **Include raw replies and device identifiers** unchecked. Review the JSON, then use **Download report** or **Copy report**. Save it as `str-pa-on-baseline.json` or `str-ia-on-baseline.json`.

Copy and Download contain the same JSON shown in the preview, including query counts, explanations, and detected states. You do not need to duplicate the results table. Nothing is sent to the maintainer automatically.

## 3. Understand the STR query results

Once the device identifies itself as PA or IA, this build uses ten selected queries:

| Query | Evidence it provides | What to compare physically |
| --- | --- | --- |
| `IDM?` | Model identity | PA versus IA |
| `IDS?` | Firmware information | Device's firmware screen |
| `IDN?` | MAC identity, redacted by default | Whether identity was answered; no public MAC needed |
| `ICN?` | Reported input count | Normal configured inputs |
| `ISN01?` | First input's name, redacted by default | Whether the first-input naming query works |
| `Z1POW?` | Zone power | On or standby |
| `Z1MUT?` | Mute state | Muted or unmuted |
| `Z1VOL?` | Volume in dB | Front-panel dB value |
| `Z1INP?` | Selected input number | Input you selected manually |
| `Z1ALM?` | Listening-mode number | Stereo `7`, Mono `9`, Both Left `11`, Both Right `12` |

`recognizedModel: true` with `experimental: true` means this build has an experimental profile. It does not certify compatibility. `queryProfile` identifies `str-pa` or `str-ia`.

The STR probe does not query `GSN?`, `IS1IN?`, or `Z1PVOL?`. Volume percentage may therefore appear as **Unknown** in the diagnostic table; the plugin derives its HomeKit percentage from dB. The optional observed-power dropdown is your statement; detected power comes from `Z1POW?`.

An **answered** query confirms a readable response, not that its corresponding control command works. **Rejected** means the STR returned a protocol error; **timeout** means no matching response arrived in time. Either can depend on standby, firmware, startup, or another control connection. Keep partial reports even when a run fails.

## 4. Collect a small set of before/after reports

Use the STR front panel or supplied remote for these changes, then let the state settle and run diagnostics again. This tests whether the plugin can read physical changes independently of whether plugin control works. Keep other settings unchanged between each pair and wait at least five seconds between runs.

| Test | Manual change | Suggested report names |
| --- | --- | --- |
| Power | Put the STR in standby; choose **Standby** in the observation dropdown | `str-pa-standby.json`, then `str-pa-on-again.json` |
| Mute | Toggle mute while powered on | `str-pa-muted.json`, `str-pa-unmuted.json` |
| Volume | At your normal quiet level, change the front-panel value by **0.5 dB** | `str-pa-volume-before.json`, `str-pa-volume-after.json` |
| Input | Select a second normal configured input | `str-pa-input-before.json`, `str-pa-input-after.json` |
| Listening mode | Select each of the available four STR listening modes | `str-pa-stereo.json`, `str-pa-mono.json`, `str-pa-left.json`, `str-pa-right.json` |

Use `str-ia-` filenames for an integrated amplifier. Do only the tests available on your setup. Tell the maintainer which physical input or mode corresponds to each report, using generic labels if you prefer to keep input names private. Restore your original input, mode, mute and volume afterward.

For standby failures, specify whether network control remains enabled in standby and whether the run recovered when you turned the STR on again. A standby timeout alone does not establish lack of power-on support.

## 5. Separately validate control from Apple Home

After collecting diagnostics, restore the plugin child bridge and use **Test connection** to preview the recognized experimental profile. Enable the desired Zone 1 controls, save, and restart the relevant bridge. Pair the TV/Power/Input accessory separately if using Apple Remote, following the README.

Start at a quiet, familiar volume and set the plugin's **Maximum volume (dB)** to match a suitable limit on the STR. The STR slider always uses dB commands: 1% is −96 dB, 100% is the configured cap or +7 dB if blank, and 0% mutes. Values round to 0.5 dB. STR up/down buttons also honor this cap. You do not need to test the maximum or sweep the full slider.

For each of power, mute, a normal input, a small volume change, and a listening-mode selection, record:

- What you requested in Apple Home.
- What actually changed on the STR's display or audio output.
- Whether Apple Home showed the confirmed result or an error.
- Whether a subsequent front-panel change appeared in Apple Home.

Also test one bridge restart while the STR is on and one while it is in standby. Report readiness, reconnect behavior, and whether accessories retain their names and state. Diagnostic success does not replace these checks. Do not run diagnostics concurrently with these control tests.

## 6. Provide evidence for an additional feature

Describe the missing feature precisely: for example, ARC enable/disable, balance, a particular input, or bypass. Include the exact model, firmware, the relevant control-protocol document/revision/page if available, and how the feature behaves when used manually.

The current diagnostic has a fixed selection of queries; it is **not a command console or packet recorder**. For a feature such as balance or ARC that it does not query, before/after reports may establish surrounding power/input state but cannot reveal that feature's command or value. The maintainer must first review the model's documentation and provide a build with an appropriate query before asking you to collect its responses. Do not guess commands or append `?` to an arbitrary command.

In particular, upstream STR testing reports that **`Z1BRT?` can change channel balance**, despite looking like a query. This plugin does not send it. Report an unexpected balance change immediately and stop that test.

Home Theatre Bypass needs separate PA/IA investigation:

- **PA:** upstream owner reports describe bypass through standby and physical relays. Describe how your configured PA behaves; do not treat it as a normal selectable input.
- **IA:** upstream owner reports identify a special input `32` while powered on. This experimental build does not synthesize or select that bypass input. Report its behavior through the front panel and provide the model-specific documentation before requesting plugin control.

If input discovery is incomplete, include the separate **Test connection** result and the number of inputs shown physically. Advanced diagnostics samples only input 1; it does not enumerate all input names or test every selectable input.

## 7. Share the report with the maintainer

Create an issue in [homebridge-anthemreceiver-plus](https://github.com/pponce/homebridge-anthemreceiver-plus/issues), or reply to the issue where testing was requested. Attach the redacted JSON reports and this completed template:

```text
Device: STR PA / STR IA
Firmware:
Plugin version:
Test branch and commit:
Homebridge / Node versions (if unavailable in the report):
Network control enabled in standby: yes / no / unknown
Anthem app and other controllers closed: yes / no
Plugin child bridge stopped during diagnostics: yes / no / not applicable
Home Theatre Bypass configured: yes / no

Report filename -> physical state/action:

Confirmed working controls:
Failing controls (request -> physical result -> HomeKit result):
Behavior after bridge restart, standby, or disconnect:

Additional feature requested:
How it works using the front panel/remote:
Control-protocol document link, revision, and page:
```

Default reports omit MAC/serial identifiers, input names, unknown reply contents and raw hex, and redact the configured address. Raw export is optional and can expose identifying data, including data encoded as hex. Use it only when the maintainer needs missing protocol evidence; review it and agree on an appropriate sharing method. Do not attach your full Homebridge configuration or pairing credentials. Add a short relevant log excerpt only if needed, redacting private data.

## Implementation evidence

The starting evidence is [python-anthemav PR #40](https://github.com/nugget/python-anthemav/pull/40) and its owner discussions, including model identity, command differences, volume range and bypass behavior. That PR was open and unmerged when reviewed on 2026-09-12. The initial plugin implementation has simulated-device coverage; owner reports from each physical PA/IA firmware remain necessary before marking support confirmed.
