#!/usr/bin/env bash
# Publish a tested stable npm package and its matching GitHub release.
set -euo pipefail
for tool in git gh node npm; do command -v "$tool" >/dev/null || { echo "Missing $tool" >&2; exit 1; }; done
cd "$(git rev-parse --show-toplevel)"
target_repo='pponce/homebridge-anthemreceiver-plus'
package_name="$(node -p 'require("./package.json").name')"
version="$(node -p 'require("./package.json").version')"
[[ "$package_name" == 'homebridge-anthemreceiver-plus' && "$version" =~ ^[0-9]+\.[0-9]+\.[0-9]+$ ]] || {
  echo 'This script only publishes Anthem Receiver Plus stable versions.' >&2; exit 1;
}
[[ -s RELEASE_NOTES.md && -s CHANGELOG.md ]] || {
  echo 'Release notes and changelog must exist before publication.' >&2; exit 1;
}
[[ "$(git branch --show-current)" == main && -z "$(git status --porcelain)" ]] || {
  echo 'Use the clean main branch of the standalone repository.' >&2; exit 1;
}
case "$(git remote get-url origin)" in
  https://github.com/pponce/homebridge-anthemreceiver-plus.git|git@github.com:pponce/homebridge-anthemreceiver-plus.git) ;;
  *) echo 'Origin is not the standalone Plus repository.' >&2; exit 1 ;;
esac
gh auth status --hostname github.com
[[ "$(npm config get registry)" == 'https://registry.npmjs.org/' ]] || {
  echo 'Use the public npm registry for this publication; inspect your npm registry setting.' >&2; exit 1;
}
npm_user="$(npm whoami)"
[[ "$npm_user" == klidec ]] || {
  echo "Expected npm user klidec; currently logged in as $npm_user. Run npm login with the correct account." >&2; exit 1;
}
echo "Publishing as npm user $npm_user"
head_sha="$(git rev-parse HEAD)"
remote_sha="$(gh api "repos/$target_repo/commits/main" --jq .sha)"
[[ "$head_sha" == "$remote_sha" ]] || { echo 'Local main must match GitHub main before publication.' >&2; exit 1; }
ci_run="$(gh api "repos/$target_repo/actions/workflows/build.yml/runs?head_sha=$head_sha&branch=main&per_page=20" --jq '[.workflow_runs[] | select(.event == "push" or .event == "workflow_dispatch")][0].id // empty')"
[[ -n "$ci_run" ]] || { echo 'No CI run exists for this commit yet. Try again after GitHub starts the workflow.' >&2; exit 1; }
gh run watch "$ci_run" --repo "$target_repo" --exit-status
ci="$(gh api "repos/$target_repo/actions/runs/$ci_run" --jq .conclusion)"
[[ "$ci" == success ]] || { echo "CI for this commit is $ci; inspect Actions before publishing." >&2; exit 1; }

task_tmp="$(mktemp -d)"
trap 'rm -rf "$task_tmp"' EXIT
if npm view "$package_name" maintainers --json --prefer-online >"$task_tmp/maintainers.json" 2>"$task_tmp/owner-error"; then
  node -e 'const fs = require("node:fs"); const value = JSON.parse(fs.readFileSync(process.argv[1], "utf8")); const owners = Array.isArray(value) ? value : [value]; if (!owners.some(owner => typeof owner === "string" ? /^klidec(?:\s|$)/.test(owner) : owner?.name === "klidec")) { console.error("The npm package exists, but klidec is not listed as a maintainer. Inspect ownership before publishing."); process.exit(1); }' "$task_tmp/maintainers.json"
else
  grep -q 'E404' "$task_tmp/owner-error" || { cat "$task_tmp/owner-error" >&2; exit 1; }
fi
tag="v$version"
if gh api "repos/$target_repo/git/ref/tags/$tag" >"$task_tmp/tag.json" 2>"$task_tmp/tag-error"; then
  [[ "$(gh api "repos/$target_repo/commits/$tag" --jq .sha)" == "$head_sha" ]] || {
    echo 'The existing release tag points to a different commit.' >&2; exit 1;
  }
else
  grep -q 'HTTP 404' "$task_tmp/tag-error" || { cat "$task_tmp/tag-error" >&2; exit 1; }
fi

# Match the current CI installation policy; lockfile adoption is tracked separately.
npm install --ignore-scripts --package-lock=false
npm run lint
npm test
npm run test:migration
npm run check:package

[[ -z "$(git status --porcelain)" && "$(gh api "repos/$target_repo/commits/main" --jq .sha)" == "$head_sha" ]] || {
  echo 'Source or remote main changed during validation; stop and review before publishing.' >&2; exit 1;
}
npm pack --ignore-scripts --json --pack-destination "$task_tmp" >"$task_tmp/pack.json"
archive_name="$(node -p 'JSON.parse(require("node:fs").readFileSync(process.argv[1], "utf8"))[0].filename' "$task_tmp/pack.json")"
integrity="$(node -p 'JSON.parse(require("node:fs").readFileSync(process.argv[1], "utf8"))[0].integrity' "$task_tmp/pack.json")"

if npm view "$package_name@$version" dist.integrity --json --prefer-online >"$task_tmp/existing.json" 2>"$task_tmp/npm-error"; then
  published_integrity="$(node -p 'JSON.parse(require("node:fs").readFileSync(process.argv[1], "utf8"))' "$task_tmp/existing.json")"
  [[ "$published_integrity" == "$integrity" ]] || {
    echo 'This version already exists with different package contents. Choose a new version; do not overwrite it.' >&2; exit 1;
  }
  echo 'The identical stable package is already published; continuing with release checks.'
else
  grep -q 'E404' "$task_tmp/npm-error" || { cat "$task_tmp/npm-error" >&2; exit 1; }
  npm publish "$task_tmp/$archive_name" --access public --tag latest
fi

npm view "$package_name@$version" dist.integrity --json --prefer-online >"$task_tmp/published.json"
published_integrity="$(node -p 'JSON.parse(require("node:fs").readFileSync(process.argv[1], "utf8"))' "$task_tmp/published.json")"
[[ "$published_integrity" == "$integrity" ]] || { echo 'Published package integrity did not match; stop and inspect npm.' >&2; exit 1; }
latest_version="$(npm view "$package_name" dist-tags.latest --prefer-online)"
[[ "$latest_version" == "$version" ]] || {
  echo "npm latest points to $latest_version, not $version. Inspect dist-tags before changing them." >&2; exit 1;
}

if gh release view "$tag" --repo "$target_repo" >/dev/null 2>&1; then
  gh release edit "$tag" --repo "$target_repo" --draft=false --prerelease=false --latest \
    --title "Anthem Receiver Plus $version" --notes-file RELEASE_NOTES.md
else
  gh release create "$tag" --repo "$target_repo" --target "$head_sha" --latest \
    --title "Anthem Receiver Plus $version" --notes-file RELEASE_NOTES.md
fi
echo "Published $package_name@$version under npm tag latest and GitHub release $tag."
printf 'GitHub release: https://github.com/%s/releases/tag/%s\n' "$target_repo" "$tag"
printf 'npm package: https://www.npmjs.com/package/%s/v/%s\n' "$package_name" "$version"
