#!/usr/bin/env bash
# Run with: bash scripts/publish-release.sh
# Explicit returns keep failures from terminating an interactive SSH shell.
{
  anthem_release_main() {
    local target_repo package_name version release_root npm_user head_sha remote_sha
    local ci_run ci tag archive_name integrity published_integrity latest_version
    local verified attempt tool resume_only=false branch_name worktree_status
    case "${1:-}" in
      '') ;;
      --resume) resume_only=true ;;
      *) echo 'Usage: bash scripts/publish-release.sh [--resume]' >&2; return 1 ;;
    esac
    [[ "$#" -le 1 ]] || { echo 'Too many release arguments.' >&2; return 1; }
    for tool in git gh node npm; do command -v "$tool" >/dev/null || { echo "Missing $tool" >&2; return 1; }; done
    release_root="$(git rev-parse --show-toplevel)" || return
    cd "$release_root" || return
    target_repo='pponce/homebridge-anthemreceiver-plus'
    package_name="$(node -p 'require("./package.json").name')" || return
    version="$(node -p 'require("./package.json").version')" || return
    [[ "$package_name" == 'homebridge-anthemreceiver-plus' && "$version" =~ ^[0-9]+\.[0-9]+\.[0-9]+$ ]] || {
      echo 'This script only publishes Anthem Receiver Plus stable versions.' >&2; return 1;
    }
    [[ -s RELEASE_NOTES.md && -s CHANGELOG.md ]] || {
      echo 'Release notes and changelog must exist before publication.' >&2; return 1;
    }
    branch_name="$(git branch --show-current)" || return
    worktree_status="$(git status --porcelain)" || return
    [[ "$branch_name" == main && -z "$worktree_status" ]] || {
      echo 'Use the clean main branch of the standalone repository.' >&2; return 1;
    }
    case "$(git remote get-url origin)" in
      https://github.com/pponce/homebridge-anthemreceiver-plus.git|git@github.com:pponce/homebridge-anthemreceiver-plus.git) ;;
      *) echo 'Origin is not the standalone Plus repository.' >&2; return 1 ;;
    esac
    gh auth status --hostname github.com || return
    [[ "$(npm config get registry)" == 'https://registry.npmjs.org/' ]] || {
      echo 'Use the public npm registry for this publication; inspect your npm registry setting.' >&2; return 1;
    }
    npm_user="$(npm whoami)" || return
    [[ "$npm_user" == klidec ]] || {
      echo "Expected npm user klidec; currently logged in as $npm_user. Run npm login with the correct account." >&2; return 1;
    }
    echo "Publishing as npm user $npm_user"
    head_sha="$(git rev-parse HEAD)" || return
    remote_sha="$(gh api "repos/$target_repo/commits/main" --jq .sha)" || return
    [[ "$head_sha" == "$remote_sha" ]] || { echo 'Local main must match GitHub main before publication.' >&2; return 1; }
    ci_run="$(gh api "repos/$target_repo/actions/workflows/build.yml/runs?head_sha=$head_sha&branch=main&per_page=20" --jq '[.workflow_runs[] | select(.event == "push" or .event == "workflow_dispatch")][0].id // empty')" || return
    [[ -n "$ci_run" ]] || { echo 'No CI run exists for this commit yet. Try again after GitHub starts the workflow.' >&2; return 1; }
    gh run watch "$ci_run" --repo "$target_repo" --exit-status || return
    ci="$(gh api "repos/$target_repo/actions/runs/$ci_run" --jq .conclusion)" || return
    [[ "$ci" == success ]] || { echo "CI for this commit is $ci; inspect Actions before publishing." >&2; return 1; }

    if npm view "$package_name" maintainers --json --prefer-online >"$task_tmp/maintainers.json" 2>"$task_tmp/owner-error"; then
      node -e 'const fs = require("node:fs"); const value = JSON.parse(fs.readFileSync(process.argv[1], "utf8")); const owners = Array.isArray(value) ? value : [value]; if (!owners.some(owner => typeof owner === "string" ? /^klidec(?:\s|$)/.test(owner) : owner?.name === "klidec")) { console.error("The npm package exists, but klidec is not listed as a maintainer. Inspect ownership before publishing."); process.exitCode = 1; }' "$task_tmp/maintainers.json" || return
    else
      grep -q 'E404' "$task_tmp/owner-error" || { cat "$task_tmp/owner-error" >&2; return 1; }
    fi
    tag="v$version"
    if gh api "repos/$target_repo/git/ref/tags/$tag" >"$task_tmp/tag.json" 2>"$task_tmp/tag-error"; then
      [[ "$(gh api "repos/$target_repo/commits/$tag" --jq .sha)" == "$head_sha" ]] || {
        echo 'The existing release tag points to a different commit.' >&2; return 1;
      }
    else
      grep -q 'HTTP 404' "$task_tmp/tag-error" || { cat "$task_tmp/tag-error" >&2; return 1; }
    fi

    # Match the current CI installation policy; lockfile adoption is tracked separately.
    npm install --ignore-scripts --package-lock=false || return
    npm run lint || return
    npm test || return
    npm run test:migration || return
    npm run check:package || return

    worktree_status="$(git status --porcelain)" || return
    remote_sha="$(gh api "repos/$target_repo/commits/main" --jq .sha)" || return
    [[ -z "$worktree_status" && "$remote_sha" == "$head_sha" ]] || {
      echo 'Source or remote main changed during validation; stop and review before publishing.' >&2; return 1;
    }
    npm pack --ignore-scripts --json --pack-destination "$task_tmp" >"$task_tmp/pack.json" || return
    archive_name="$(node -p 'JSON.parse(require("node:fs").readFileSync(process.argv[1], "utf8"))[0].filename' "$task_tmp/pack.json")" || return
    integrity="$(node -p 'JSON.parse(require("node:fs").readFileSync(process.argv[1], "utf8"))[0].integrity' "$task_tmp/pack.json")" || return

    if npm view "$package_name@$version" dist.integrity --json --prefer-online >"$task_tmp/existing.json" 2>"$task_tmp/npm-error"; then
      published_integrity="$(node -p 'JSON.parse(require("node:fs").readFileSync(process.argv[1], "utf8"))' "$task_tmp/existing.json")" || return
      [[ "$published_integrity" == "$integrity" ]] || {
        echo 'This version already exists with different package contents. Choose a new version; do not overwrite it.' >&2; return 1;
      }
      echo 'The identical stable package is already published; continuing with release checks.'
    else
      grep -q 'E404' "$task_tmp/npm-error" || { cat "$task_tmp/npm-error" >&2; return 1; }
      if [[ "$resume_only" == true ]]; then
        echo 'Resume mode: skipping publication and waiting for the existing npm package.'
      else
        npm publish "$task_tmp/$archive_name" --access public --tag latest || return
      fi
    fi

    # A successful publish can precede registry read visibility. Retry verification,
    # never publication, and only create the GitHub release after both checks agree.
    verified=false
    for attempt in {1..12}; do
      if npm view "$package_name@$version" dist.integrity --json --prefer-online >"$task_tmp/published.json" 2>"$task_tmp/verify-error"; then
        published_integrity="$(node -p 'JSON.parse(require("node:fs").readFileSync(process.argv[1], "utf8"))' "$task_tmp/published.json")" || return
        [[ "$published_integrity" == "$integrity" ]] || {
          echo 'Published package integrity did not match; stop and inspect npm.' >&2; return 1;
        }
        if latest_version="$(npm view "$package_name" dist-tags.latest --prefer-online 2>"$task_tmp/verify-error")"; then
          if [[ "$latest_version" == "$version" ]]; then
            verified=true
            break
          fi
          echo "npm latest currently reports $latest_version; waiting for $version."
        fi
      fi
      if grep -Eq 'E401|E403' "$task_tmp/verify-error"; then
        cat "$task_tmp/verify-error" >&2
        return 1
      fi
      if [[ "$attempt" -lt 12 ]]; then
        echo "Waiting for npm registry verification ($attempt/12); retrying in 5 seconds."
        sleep 5 || return
      fi
    done
    [[ "$verified" == true ]] || {
      cat "$task_tmp/verify-error" >&2
      echo 'Registry verification is still incomplete; the existing or previously accepted npm publication could not be confirmed.' >&2
      echo 'No GitHub release was created. Retry this script later; do not bump the version just for this lookup failure.' >&2
      return 1
    }

    if gh release view "$tag" --repo "$target_repo" >/dev/null 2>&1; then
      gh release edit "$tag" --repo "$target_repo" --draft=false --prerelease=false --latest \
        --title "Anthem Receiver Plus $version" --notes-file RELEASE_NOTES.md || return
    else
      gh release create "$tag" --repo "$target_repo" --target "$head_sha" --latest \
        --title "Anthem Receiver Plus $version" --notes-file RELEASE_NOTES.md || return
    fi
    echo "Published $package_name@$version under npm tag latest and GitHub release $tag."
    printf 'GitHub release: https://github.com/%s/releases/tag/%s\n' "$target_repo" "$tag"
    printf 'npm package: https://www.npmjs.com/package/%s/v/%s\n' "$package_name" "$version"
  }

  anthem_release_run() {
    local task_tmp task_status
    echo "===== BEGIN ANTHEM RECEIVER PLUS RELEASE ====="
    if task_tmp="$(mktemp -d)"; then
      if anthem_release_main "$@"; then
        task_status=0
      else
        task_status=$?
      fi
      rm -rf -- "$task_tmp"
    else
      echo 'Could not create a temporary release directory.' >&2
      task_status=1
    fi
    if [[ "$task_status" -eq 0 ]]; then
      echo "===== END ANTHEM RECEIVER PLUS RELEASE: SUCCESS ====="
    else
      echo "===== END ANTHEM RECEIVER PLUS RELEASE: STOPPED (status $task_status) ====="
    fi
    return "$task_status"
  }

  anthem_release_run "$@"
}
