# Testing your Anthem STR with Homebridge

This guide walks you through installing the test version, sending a diagnostic report, and trying the controls in Apple Home. You do not need to understand the command names or edit any code.

It covers both the **STR Preamplifier (PA)** and **STR Integrated Amplifier (IA)**. Support is experimental: we need owners to check it on real equipment. The test version offers power, mute, normal input selection, volume, and four listening modes. ARC, front-panel brightness, menu navigation, and Home Theatre Bypass selection are not enabled yet.

## 1. Install the test version

These commands are for a Linux system with Homebridge installed through the **Homebridge APT package**, where you use `sudo hb-service add` to install plugins. They assume Homebridge is already installed. If you use Docker, macOS, or another installation method, use the installation instructions for your setup instead.

Download a Homebridge backup before updating. If you already use Anthem Receiver Plus, keep its configuration and existing Apple Home accessories. You do not need another Anthem plugin for this test.

1. Open an **SSH session to the computer running Homebridge**. Use SSH rather than the terminal inside Homebridge UI, because the installation temporarily stops that UI.
2. Copy and paste the whole block below, including its opening `{` and closing `}`.
3. Wait for **PASS: Test version installed and Homebridge started.** Installation can take several minutes. If you see **STOP**, save the output and resolve that error before continuing.

```bash
{
  printf '\n===== BEGIN STR TEST VERSION INSTALL =====\n'
  if sudo hb-service stop; then
    if sudo hb-service add 'pponce/homebridge-anthemreceiver-plus#str-experimental-install'; then
      if sudo hb-service start; then
        printf '\nPASS: Test version installed and Homebridge started.\n'
        printf 'Open Homebridge UI in your browser and continue with step 2.\n'
      else
        printf '\nSTOP: Installed, but Homebridge did not start. Save the output above.\n'
      fi
    else
      printf '\nSTOP: Installation failed. Save the output above.\n'
      printf 'Homebridge is stopped. Use the return-to-stable instructions below to recover.\n'
    fi
  else
    printf '\nSTOP: Could not stop Homebridge; no installation was attempted.\n'
  fi
  printf '\n===== END STR TEST VERSION INSTALL =====\n'
}
```

This installs the special STR test version directly from this project. It also updates an existing installation of **Anthem Receiver Plus**. It does not install a second copy of Plus. Keep the command output with your test notes so we know which build you installed; the displayed version number can be the same as a regular release.

The block has no `exit` or `set -e` commands and will not close your SSH session. The Homebridge browser page will be unavailable while the service is stopped, then return after it starts.

## 2. Get ready to collect a report

Turn the STR on, wait for it to finish starting, and note its IP address. You can usually find the address in your router's list of connected devices. Check that network control is enabled on the STR using its manual. Set the volume to a quiet level you normally use.

Close the Anthem mobile app, if you use it, while running the test.

**First time testing the STR?** If you have not already saved a configuration connecting this plugin to the STR, there is normally no Homebridge connection to stop. Continue to step 3. Leave Homebridge and its browser UI running.

**Already configured this test plugin to control the same STR?** Pause its normal connection while collecting reports. This prevents the diagnostic test and the plugin from competing for the STR's connection:

1. In Homebridge UI, open **Plugins**.
2. Find the **Anthem Receiver Plus** plugin tile.
3. Click the **vertical three dots (⋮)** on that tile.
4. Select **Stop Child Bridge**, if that option is present. A child bridge is simply a way to run this plugin separately from your other plugins. Stopping it temporarily pauses its Apple Home controls but leaves Homebridge UI available.
5. If this plugin has no child bridge, select **Disable** instead, confirm, and restart Homebridge when prompted. You can still open **Plugin Config** to run the diagnostic. Do not uninstall the plugin or delete its configuration.

If you happen to use another app or integration that connects to this same STR, pause that connection too. This is optional troubleshooting for an existing connection; it does **not** assume another working Homebridge STR plugin exists. Leave plugins for unrelated devices alone.

Do not run `hb-service stop` for the report itself: that would also close the browser UI you need. The stop/start commands in step 1 are only for installation.

## 3. Open Plugin Config and run the first test

1. In Homebridge UI, open **Plugins**.
2. Find the **Anthem Receiver Plus** tile and click its **vertical three dots (⋮)**.
3. Choose **Plugin Config**.
4. Enter the STR's address under **Receiver IP address or hostname**. Leave **TCP port** at **14999**, unless you know yours is different.
5. Expand **Advanced diagnostics / Test unsupported device**. Use this section even if the plugin already recognizes your STR.
6. Under **Model printed on the device**, enter **STR Preamplifier** or **STR Integrated Amplifier**.
7. Under **Your observed power state**, choose **On**.
8. Leave **Also query Zone 2** unchecked. The STR has one zone.
9. Click **Run diagnostics**. Wait for the report to appear; it can take up to 30 seconds. Leave the STR's controls alone during the run.

**You do not need to click Save or restart Homebridge to run diagnostics.** The test uses the address you just entered. Save comes later, when you are ready to try Apple Home control.

The detected model should normally be **STR PA** for the preamplifier or **STR IA** for the integrated amplifier. If it shows something else, keep the report and tell us. You do not need to change a model selection.

## 4. Save and send your report

1. Leave **Include raw replies and device identifiers** unchecked.
2. Click **Download report**. Your browser downloads a file called `anthem-diagnostics.json`.
3. Rename it to something memorable, such as `str-pa-on.json` or `str-ia-on.json`.
4. Attach the file to the [GitHub issue where you are discussing STR support](https://github.com/pponce/homebridge-anthemreceiver-plus/issues), or open a new issue there.
5. Include the short note below. Fill in what you know; **not sure** is fine.

```text
My device: STR Preamplifier / STR Integrated Amplifier
Firmware version, if known:
Installed using the STR test-version command: yes / no
The STR was: on / standby
Did you close the Anthem app, if used?
Was this plugin already configured for this STR?
If yes, did you stop its child bridge or disable it for this test?
Report filename:
What worked, failed, or looked unexpected?
What additional feature would you like?
```

**Copy report** is an alternative if you prefer to paste the report into your issue. It contains the same information as the downloaded file, including the results and counts. There is no need to copy the table separately, and nothing is sent automatically.

You do not need to interpret every line. **Answered** means the STR replied. **Rejected** or **Timeout** means that part of the test did not get the expected answer; send the report anyway. Some readings may be unavailable in standby. Volume **percentage** may show **Unknown** on STR even when the volume in **dB** is read correctly.

The default report hides device identifiers and input names. Do not attach your complete Homebridge configuration, passwords, or pairing code. Only enable the raw-reply option if the maintainer requests it and explains how to share it.

## 5. Help us check more features

A powered-on report is a useful first step. If you have time, collect a second report with the STR in standby. Choose **Standby** in the dropdown before running that test, and save it with `standby` in the filename. Then turn the STR back on. Tell us if testing only works while it is on.

For more detailed checks, change **one thing at a time using the STR's front panel or its own remote**, then run diagnostics again. Keep the plugin paused if you paused it earlier. Wait at least five seconds between runs.

| What to check | What to do | What to tell us |
| --- | --- | --- |
| Mute | Save one report unmuted and another muted. | Which report is which. |
| Volume | At a quiet level, change the volume by 0.5 dB and save another report. | The dB value shown on the STR before and after. |
| Inputs | Select a different normal input and save another report. | Which input was selected for each report. Generic names such as “Input A” are fine. |
| Listening modes | Try Stereo, Mono, Both Left, and Both Right, if available, saving a report for each. | The mode selected for each report. |

Give each file a different name so you can tell them apart. Do not change controls during a diagnostic run. Restore your normal input, listening mode, mute and volume when finished.

**Want a feature that is not listed here?** Describe what it does and how you use it on the STR. A manual page or photo of the relevant screen is helpful. You do not need to find or type technical commands.

The report checks a limited set of features. It cannot discover every possible command. For example, adding ARC or balance may require the maintainer to provide a new test version first. We will tell you which action to try and which reports to send. Do not experiment with commands found online: some receiver commands can do something different on an STR.

For **Home Theatre Bypass**, please say whether you have the preamplifier or integrated amplifier and describe how you currently enter and leave bypass using the device itself. They behave differently. This test version does not offer bypass selection in Apple Home.

## 6. Try controlling the STR from Apple Home

Do this after collecting your diagnostic reports. It checks whether the controls actually work, not just whether the STR answers questions.

1. Keep the STR on at a quiet volume.
2. Go to **Plugins → Anthem Receiver Plus tile → ⋮ → Plugin Config**.
3. Check the address and click **Test connection**. If the STR is not recognized or the connection fails, send the report before continuing.
4. Under **Zone 1**, enable the controls you want to test, such as **Power switch**, **Mute switch**, and **Volume control**. **Listening-mode switches** is under **Audio processing controls**. Leave Zone 2 off.
5. Set **Maximum volume (dB)** to match a suitable maximum already configured on your STR. Use your usual limit; you do not need to test loud levels. If this field is blank, the STR slider can reach +7 dB at 100%.
6. Click **Save**.
7. If you selected **Disable** earlier, return to the tile's **⋮** menu and select **Enable**. Restart Homebridge as prompted. If you stopped its child bridge, select **Start Child Bridge** after saving; restart it if prompted. If neither applies, restart Homebridge to load the saved configuration.
8. Open Apple Home and try one control at a time. If you set up a new child bridge, pair it using the QR code shown by Homebridge UI. If you enabled **TV accessory and Apple Remote**, also follow the [separate Power/Input pairing instructions](README.md#adding-the-powerinput-accessory-to-the-home-app).

Try power, mute, a normal input, a small volume change, and a listening mode. Record what you tapped, what the STR actually did, and whether Apple Home showed the right result. Then change something on the STR itself and check whether Apple Home catches up.

The separate volume control looks like a light in Apple Home: its slider changes volume and its on/off switch changes mute. Turn the STR on with its power control first. At 0% the slider mutes; above 0% it unmutes and changes the volume. You do not need to move it to 100% for this test.

If you can, also restart the plugin once while the STR is on and once while it is in standby. Tell us whether it reconnects and keeps the same accessories. Pause normal control again before collecting any further diagnostic reports.

To view recent Homebridge logs from SSH, paste this block. It prints recent lines and returns to your prompt:

```bash
{
  printf '\n===== BEGIN RECENT HOMEBRIDGE LOGS =====\n'
  sudo hb-service view
  printf '\n===== END RECENT HOMEBRIDGE LOGS =====\n'
}
```

Send only the relevant lines if requested, removing private information first.

## 7. Finish testing or return to the regular release

If you want to keep using the test version, make sure this plugin is enabled and its child bridge is running, if it uses one. Reopen any apps you closed when you have finished testing.

To return to the regular npm release of Anthem Receiver Plus, paste this block in SSH. **That release may not include STR support yet**, so STR controls may stop working after switching back. Existing Plus users can instead restore the particular release they were using before testing.

```bash
{
  printf '\n===== BEGIN RETURN TO REGULAR ANTHEM RELEASE =====\n'
  if sudo hb-service stop; then
    if sudo hb-service add homebridge-anthemreceiver-plus@latest; then
      if sudo hb-service start; then
        printf '\nPASS: Regular release installed and Homebridge started.\n'
      else
        printf '\nSTOP: Installed, but Homebridge did not start. Save the output above.\n'
      fi
    else
      printf '\nSTOP: Installation failed; Homebridge remains stopped. Save the output above.\n'
    fi
  else
    printf '\nSTOP: Could not stop Homebridge; no installation was attempted.\n'
  fi
  printf '\n===== END RETURN TO REGULAR ANTHEM RELEASE =====\n'
}
```

Changing the installed version does not undo a **Disable** selection. If you disabled the plugin earlier and want to use it again, select **Enable** from its **⋮** menu and restart Homebridge. Start its child bridge too if it remains stopped.

<details>
<summary>Optional: technical details and background</summary>

The installation branch is `str-experimental-install`; it includes compiled files. The source PR uses `str-experimental-support`. Maintainers should merge only the source PR.

After identifying an STR, diagnostics use ten queries: `IDM?`, `IDS?`, `IDN?`, `ICN?`, `ISN01?`, `Z1POW?`, `Z1MUT?`, `Z1VOL?`, `Z1INP?`, and `Z1ALM?`. Only the first input name is sampled. STR listening-mode values are Stereo `7`, Mono `9`, Both Left `11`, and Both Right `12`. `IDN?` reads the MAC address, hidden in the default report. The diagnostic does not request native volume percentage; HomeKit volume is calculated from dB.

The STR volume range is −96 to +7 dB in 0.5 dB steps. A configured maximum applies to the STR slider and up/down buttons. Diagnostics do not change that maximum.

The report marks support as experimental. It cannot confirm physical control behavior, and it is not a recorder of all traffic sent by other apps.

Initial evidence comes from [python-anthemav PR #40](https://github.com/nugget/python-anthemav/pull/40). Its owner reports distinguish PA/IA bypass behavior and describe a `Z1BRT?` query that can change STR balance. This plugin never sends that command. Report an unexpected balance change and stop that test if you encounter one. The upstream PR was open and unmerged when reviewed on 2026-09-12; physical PA/IA testing remains necessary.

The Linux installation commands follow the [Homebridge APT command wrapper](https://github.com/homebridge/homebridge-apt-pkg/blob/latest/deb/opt/homebridge/hb-service-shim). The plugin-menu actions are defined by [Homebridge UI](https://github.com/homebridge/homebridge-config-ui-x/blob/latest/ui/src/app/modules/plugins/plugin-card/plugin-card.component.html).

</details>
