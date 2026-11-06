# Development

This branch remains a draft until the gates in [IMPROVEMENT_PLAN.md](IMPROVEMENT_PLAN.md) pass.

## Verification

Use a clean checkout with Node 22, 24, or 26 and npm access:

```bash
npm install
npm run lint
npm test
npm run check:package
npx playwright install chromium
npm run test:ui
```

`npm test` builds TypeScript and runs Node tests with loopback fake receivers and mocked HAP objects. The browser tests use a mocked Homebridge configuration API; real Homebridge and receiver testing remains necessary. Generate and review package-lock.json after a successful dependency install, then use npm ci in CI.

The runtime build is always produced by TypeScript. Do not hand-edit dist or claim source-transformed tests constitute a successful production build. Git installs run prepare when npm lifecycle scripts are enabled; the installed archive must contain every runtime module and UI asset.

State-setting transactions use bounded confirmation/read-back. Queries may repeat while waiting; control commands are not automatically replayed after disconnect. Navigation/menu operations without a protocol acknowledgement only confirm the write, not the physical action.

## GitHub releases

A push to `main` with the commit subject `release: v<package-version>` publishes the matching stable GitHub release after every compatibility and GitHub-install job passes. The version must be a stable semantic version in `package.json`, and `RELEASE_NOTES.md` supplies the release description. The release job checks that the tested commit still matches `main` and that any existing tag points to that commit.

GitHub release publication does not publish to npm. Use `bash scripts/publish-release.sh` from a clean, current `main` checkout to validate and publish the npm package; it also supports a GitHub release that already exists at the same commit.
