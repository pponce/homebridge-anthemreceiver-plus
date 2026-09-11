# Standalone project and stable release workflow

The independent [pponce/homebridge-anthemreceiver-plus](https://github.com/pponce/homebridge-anthemreceiver-plus) repository is created with `main` as its default branch and the inherited history preserved. The previous repository and local checkout are retained.

The initial standalone [CI run 34622442946](https://github.com/pponce/homebridge-anthemreceiver-plus/actions/runs/34622442946) passed all five jobs at `3a9bba33b5c69384a7a4bb266794a9fae188da09`. This covers Node 22/24 × Homebridge 1/2, receiver and migration tests, browser themes, archive installation, and direct GitHub installation.

## Publish 1.0.0

Use the development checkout, not the running Homebridge plugin directory. Run without sudo:

```bash
(
  set -euo pipefail
  cd ~/devProjects/homebridge-anthemreceiver-plus
  [[ "$(git branch --show-current)" == main && -z "$(git status --porcelain)" ]] || {
    echo 'Use a clean main checkout before releasing.' >&2
    exit 1
  }
  git pull --ff-only origin main
  bash scripts/publish-release.sh
)
```

If npm authentication is missing or uses a different account, run `npm login` as `klidec` and retry. GitHub CLI must also be authenticated with access to this repository. Authentication and 2FA prompts remain in your terminal.

The script:
- Requires the correct package, a stable version, a clean main branch, and the standalone origin.
- Verifies npm account `klidec`, the public registry, and existing package maintainership if the name is already published.
- Waits for CI on the exact main commit and stops if it fails.
- Checks existing release-tag identity, builds/tests the source, checks package contents, and packs compiled dist and UI files.
- Publishes the archive under npm `latest`, verifies its integrity and dist-tag, and creates the matching GitHub release with RELEASE_NOTES.md.
- Allows an identical already-published package to complete the GitHub release on a rerun. A version with different published contents must not be overwritten.

The script does not modify your running Homebridge installation or submit a Homebridge verification request. No compiled output needs to be committed to Git. The older publish-beta.sh remains historical tooling and rejects stable package versions.

## Migration and verification

Read [MIGRATION.md](MIGRATION.md) before replacing the old installed package. Preserve configuration, bridge/child-bridge identity, cache, and pairing data. Do not install both packages together for the same receiver.

The predecessor was tested by the owner on an MRX 540 8K. 

Use [VERIFICATION_PREPARATION.md](VERIFICATION_PREPARATION.md) for the later Homebridge request and recheck its current requirements. The new package is not yet Homebridge verified; no request has been sent.

