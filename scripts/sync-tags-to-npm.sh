#!/bin/bash

# Reconcile GitHub release tags with the npm registry, and (optionally) publish
# any v* tags that are missing from npm.
#
# Background: the package has a stuck v3.0.0 on npm (mistaken publish on
# 2025-07-04) while the maintained line is v2.x. Because of that, every npm
# publish on the v2 line MUST pass `--tag latest` explicitly — otherwise npm
# refuses with `Cannot implicitly apply the "latest" tag because previously
# published version 3.0.0 is higher`. This script handles that automatically.
#
# Modes:
#   ./sync-tags-to-npm.sh             # report-only, recent gap (default)
#   ./sync-tags-to-npm.sh --all       # report-only, include historical missing tags
#   ./sync-tags-to-npm.sh --publish   # publish recent gap (newer than npm latest)
#   ./sync-tags-to-npm.sh --publish --all  # publish ALL missing tags (use with care)
#
# "Recent" means tags whose version is greater than the current npm `latest`
# dist-tag. Historical gaps (older patch versions never published) are usually
# abandoned and not worth backfilling; --all opts back into seeing them.
#
# Requirements (for --publish):
#   - `npm whoami` must succeed (i.e. you have an authenticated ~/.npmrc)
#   - clean working tree (the script will checkout tags and return you to your
#     original branch when done)

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
BOLD='\033[1m'
NC='\033[0m'

PACKAGE="mcp-adr-analysis-server"
PUBLISH=false
SHOW_ALL=false
for arg in "$@"; do
    case "$arg" in
        --publish) PUBLISH=true ;;
        --all)     SHOW_ALL=true ;;
        -h|--help)
            sed -n '3,18p' "$0" | sed 's/^# //;s/^#//'
            exit 0 ;;
        *)
            echo "Unknown argument: $arg" >&2
            echo "Run with --help for usage." >&2
            exit 2 ;;
    esac
done

echo "================================================"
echo "GitHub Tags <-> npm Reconciliation"
echo "================================================"
echo ""
echo -e "${BLUE}Package:${NC} $PACKAGE"
echo -e "${BLUE}Mode:${NC}    $([ "$PUBLISH" == "true" ] && echo -e "${BOLD}PUBLISH${NC}" || echo -e "report-only (pass --publish to actually publish)")"
echo -e "${BLUE}Scope:${NC}   $([ "$SHOW_ALL" == "true" ] && echo "ALL missing tags (including abandoned history)" || echo "recent gap only (newer than npm latest); pass --all for full history)")"
echo ""

# Track original branch so we can restore it after tag checkouts
ORIGINAL_BRANCH=$(git rev-parse --abbrev-ref HEAD)
if [[ "$ORIGINAL_BRANCH" == "HEAD" ]]; then
    ORIGINAL_BRANCH=$(git rev-parse HEAD)
fi

# Pre-flight checks for --publish mode
if [[ "$PUBLISH" == "true" ]]; then
    echo "Pre-flight checks..."
    if ! NPM_USER=$(npm whoami 2>/dev/null); then
        echo -e "${RED}✗ npm whoami failed.${NC} Run \`npm login\` first."
        exit 1
    fi
    echo -e "  ${GREEN}✓${NC} npm authenticated as: ${BOLD}$NPM_USER${NC}"

    if ! git diff-index --quiet HEAD --; then
        echo -e "${RED}✗ Working tree has uncommitted changes.${NC} Commit or stash first."
        exit 1
    fi
    echo -e "  ${GREEN}✓${NC} working tree is clean"
    echo ""
fi

# Fetch tags so we have the freshest view
echo "Fetching tags from origin..."
git fetch --tags --quiet 2>/dev/null || true

# Build the list of v* tags from git, sorted by semver. Use a portable
# read-into-array pattern (mapfile is bash 4+; macOS ships 3.2 by default).
GITHUB_TAGS=()
while IFS= read -r tag; do
    GITHUB_TAGS+=("$tag")
done < <(git tag -l 'v*' | sort -V)
if [[ ${#GITHUB_TAGS[@]} -eq 0 ]]; then
    echo -e "${RED}✗ No v* tags found locally. Did you fetch?${NC}"
    exit 1
fi

# Pull the full version list from npm in one call (~1 round-trip vs N)
echo "Reading npm version list..."
NPM_VERSIONS_JSON=$(npm view "$PACKAGE" versions --json 2>/dev/null)
if [[ -z "$NPM_VERSIONS_JSON" ]]; then
    echo -e "${RED}✗ Could not read npm versions for $PACKAGE.${NC}"
    exit 1
fi

# What is currently `latest` on npm? Used to filter "recent" gaps.
NPM_LATEST=$(npm view "$PACKAGE" dist-tags.latest 2>/dev/null)

# Compare GitHub tags vs npm. Classify each missing tag as "recent" (newer
# than npm latest) or "historical" (older — typically abandoned).
MISSING_RECENT=()
MISSING_HISTORICAL=()
PRESENT=()
for tag in "${GITHUB_TAGS[@]}"; do
    version="${tag#v}"
    if echo "$NPM_VERSIONS_JSON" | jq -e --arg v "$version" 'index($v)' >/dev/null; then
        PRESENT+=("$tag")
    else
        # `sort -V` puts higher versions later; use it to compare against
        # NPM_LATEST without pulling in a semver dependency.
        if [[ -n "$NPM_LATEST" ]] && [[ "$version" == "$(printf '%s\n%s\n' "$version" "$NPM_LATEST" | sort -V | tail -1)" ]] && [[ "$version" != "$NPM_LATEST" ]]; then
            MISSING_RECENT+=("$tag")
        else
            MISSING_HISTORICAL+=("$tag")
        fi
    fi
done

# Pick the working set based on --all
if [[ "$SHOW_ALL" == "true" ]]; then
    MISSING=("${MISSING_RECENT[@]}" "${MISSING_HISTORICAL[@]}")
else
    MISSING=("${MISSING_RECENT[@]}")
fi

# Report
echo ""
echo "================================================"
echo "Reconciliation Report"
echo "================================================"
echo -e "GitHub v* tags:           ${BOLD}${#GITHUB_TAGS[@]}${NC}"
echo -e "Already on npm:           ${GREEN}${BOLD}${#PRESENT[@]}${NC}"
echo -e "Missing (recent gap):     ${RED}${BOLD}${#MISSING_RECENT[@]}${NC}"
echo -e "Missing (historical):     ${YELLOW}${BOLD}${#MISSING_HISTORICAL[@]}${NC}  (use --all to act on these)"
echo ""

# Show recent tag status (last 10 GitHub tags by semver)
echo -e "${BLUE}Recent GitHub tags and their npm status:${NC}"
START=$(( ${#GITHUB_TAGS[@]} > 10 ? ${#GITHUB_TAGS[@]} - 10 : 0 ))
for ((i=START; i<${#GITHUB_TAGS[@]}; i++)); do
    tag="${GITHUB_TAGS[$i]}"
    version="${tag#v}"
    if echo "$NPM_VERSIONS_JSON" | jq -e --arg v "$version" 'index($v)' >/dev/null; then
        printf "  ${GREEN}✓${NC} %-12s %s\n" "$tag" "(on npm)"
    else
        printf "  ${RED}✗${NC} %-12s %s\n" "$tag" "(MISSING)"
    fi
done

# Always surface the current dist-tag situation since it changes publish args
echo ""
echo -e "${BLUE}Current npm dist-tags:${NC}"
npm view "$PACKAGE" dist-tags --json 2>/dev/null | jq -r 'to_entries | .[] | "  \(.key): \(.value)"'
HIGHEST_NPM=$(echo "$NPM_VERSIONS_JSON" | jq -r 'sort_by(. | split(".") | map(tonumber? // 0)) | last')
echo -e "${BLUE}Highest published version on npm:${NC} $HIGHEST_NPM"
if [[ "$HIGHEST_NPM" != "$NPM_LATEST" ]]; then
    echo -e "  ${YELLOW}⚠${NC} Highest version ($HIGHEST_NPM) does NOT match latest tag ($NPM_LATEST)."
    echo -e "  ${YELLOW}  All v2.x publishes must pass \`--tag latest\` to override npm's default.${NC}"
fi

if [[ ${#MISSING[@]} -eq 0 ]]; then
    echo ""
    echo -e "${GREEN}✓ All GitHub v* tags are already published to npm.${NC}"
    exit 0
fi

# Print missing tags (chronological / semver order)
echo ""
echo -e "${RED}Missing tags (need publish):${NC}"
for tag in "${MISSING[@]}"; do
    echo "  - $tag"
done

# In report mode, surface the exact commands the user (or this script with
# --publish) would run.
if [[ "$PUBLISH" != "true" ]]; then
    echo ""
    echo "================================================"
    echo "To publish locally (requires npm auth + clean tree):"
    echo "================================================"
    echo "  ./scripts/sync-tags-to-npm.sh --publish"
    echo ""
    echo "Or per-tag manually:"
    for tag in "${MISSING[@]}"; do
        echo "  git checkout $tag && npm ci && npm run build && npm publish --tag latest --access public --ignore-scripts"
    done
    echo ""
    echo "After publishing, return to your branch with:"
    echo "  git checkout $ORIGINAL_BRANCH"
    exit 0
fi

# --publish path
# ----------------------------------------------------------------------------
# Pre-validate EVERY missing tag before we publish ANYTHING. The
# auto-release-on-merge workflow has historically created tags whose
# `package.json` does NOT match the tag name (e.g. v2.5.5 was tagged on a
# commit where package.json still said 2.5.4). If we don't catch that now,
# `npm publish` will silently rebuild the WRONG version, get rejected with
# "You cannot publish over the previously published versions: X" — and the
# script will already be partway through its sweep with you in detached HEAD.
# Fail fast with a clear diagnosis instead.
echo ""
echo "================================================"
echo "Pre-flight: validating tag <-> package.json"
echo "================================================"
MISMATCHED=()
for tag in "${MISSING[@]}"; do
    expected="${tag#v}"
    actual=$(git show "$tag:package.json" 2>/dev/null | jq -r '.version' 2>/dev/null || echo "?")
    if [[ "$expected" == "$actual" ]]; then
        printf "  ${GREEN}✓${NC} %-12s package.json=%s\n" "$tag" "$actual"
    else
        printf "  ${RED}✗${NC} %-12s package.json=%s (expected %s)\n" "$tag" "$actual" "$expected"
        MISMATCHED+=("$tag (pkg=$actual)")
    fi
done

if [[ ${#MISMATCHED[@]} -gt 0 ]]; then
    echo ""
    echo -e "${RED}ABORTING:${NC} ${#MISMATCHED[@]} tag(s) point at a commit whose package.json"
    echo -e "${RED}does NOT match the tag name.${NC} Publishing them would rebuild the wrong"
    echo "version and either be rejected by npm or, worse, silently overwrite"
    echo "the wrong version slot."
    echo ""
    echo "Mismatched tags:"
    for entry in "${MISMATCHED[@]}"; do echo "  - $entry"; done
    echo ""
    echo "Likely cause: the auto-release-on-merge.yml workflow created the tag"
    echo "BEFORE its 'git push origin main' of the bump commit succeeded (or"
    echo "before that bump commit existed at all). Look for a 'chore: bump"
    echo "version to vX.Y.Z' commit on main — if one exists, re-point the tag:"
    echo ""
    echo "  git tag -f vX.Y.Z <bump-commit-sha>"
    echo "  git push --force origin vX.Y.Z"
    echo ""
    echo "If no bump commit exists, the tag is orphaned and should either be"
    echo "deleted ('git push origin :vX.Y.Z') or backfilled with a manual"
    echo "bump PR before this script can publish it."
    git checkout "$ORIGINAL_BRANCH" --quiet 2>/dev/null || true
    exit 1
fi

echo ""
echo "================================================"
echo "Publishing missing tags"
echo "================================================"

FAILED=()
for tag in "${MISSING[@]}"; do
    version="${tag#v}"
    echo ""
    echo -e "${YELLOW}── $tag ──${NC}"

    echo "  → checkout $tag"
    git checkout "$tag" --quiet

    echo "  → npm ci"
    npm ci --silent

    echo "  → npm run build"
    npm run build >/dev/null

    # --tag latest is mandatory while v3.0.0 sits above us; --ignore-scripts
    # avoids the prepublishOnly hook (which re-runs the full build + lint).
    echo "  → npm publish --tag latest --access public --ignore-scripts"
    if npm publish --tag latest --access public --ignore-scripts; then
        echo -e "  ${GREEN}✓ published $tag${NC}"
    else
        echo -e "  ${RED}✗ failed to publish $tag${NC}"
        FAILED+=("$tag")
    fi
done

# Restore original branch
echo ""
echo "Restoring original branch: $ORIGINAL_BRANCH"
git checkout "$ORIGINAL_BRANCH" --quiet

# Summary
echo ""
echo "================================================"
echo "Final Results"
echo "================================================"
SUCCESS_COUNT=$(( ${#MISSING[@]} - ${#FAILED[@]} ))
echo -e "${GREEN}Published:${NC} $SUCCESS_COUNT / ${#MISSING[@]}"
if [[ ${#FAILED[@]} -gt 0 ]]; then
    echo -e "${RED}Failed:${NC} ${#FAILED[@]}"
    for tag in "${FAILED[@]}"; do
        echo "  - $tag"
    done
    exit 1
fi
echo ""
echo "Verify at: https://www.npmjs.com/package/$PACKAGE?activeTab=versions"
