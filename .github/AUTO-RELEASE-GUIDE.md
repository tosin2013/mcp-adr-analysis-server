# Auto-Release Setup Guide

This repository now supports **automatic releases** when PRs are merged to the main branch! 🚀

## How It Works

When you merge a PR to `main`, the system will:

1. **Analyze the PR** to determine the appropriate version bump
2. **Run `npm version --no-git-tag-version`** to compute the new version
3. **Open a version-bump PR** updating `package.json` and `package-lock.json`
   - The PR carries a `no-release` label so merging it does **not** trigger another release
   - Auto-merge is enabled (squash) so it lands without manual intervention
4. **Wait for that PR to merge** (polls up to 20 minutes)
5. **Create a git tag** on the **version-bump commit** (e.g., `v2.0.25`), after verifying
   that commit's `package.json` matches the tag
6. **Publish a GitHub Release** (from Release Drafter draft or new)
7. **Trigger AI release notes** generation
8. **Publish to NPM**, then to the MCP Registry

## Version Bump Logic

The system automatically determines the version bump type based on:

### 🚨 Major Version (e.g., 2.0.0 → 3.0.0)

- PR title contains: `BREAKING`, `breaking`, `major`
- PR labels: `breaking`, `major`, `breaking-change`
- PR body contains: `BREAKING CHANGE`

### ✨ Minor Version (e.g., 2.0.0 → 2.1.0)

- PR title contains: `feat`, `feature`, `minor`
- PR labels: `feature`, `enhancement`, `minor`

### 🔧 Patch Version (e.g., 2.0.0 → 2.0.1)

- PR title contains: `fix`, `patch`, `chore`, `docs`, `refactor`
- PR labels: `bug`, `fix`, `patch`, `documentation`, `maintenance`
- **Default for all other PRs**

## Configuration

### Enable/Disable Auto-Release

Edit `.github/auto-release.config.json`:

```json
{
  "enabled": true, // Set to false to disable
  "skipLabels": ["no-release", "skip-release", "documentation"]
  // ... other settings
}
```

### Skip Specific PRs

Add any of these labels to a PR to skip auto-release:

- `no-release`
- `skip-release`
- `documentation`

### Excluded Authors

None. Every merged PR releases, Dependabot included — `auto-release-on-merge.yml` is
the single owner of releases. Use a skip label above if you need to suppress one.

(Previously `dependabot[bot]` was excluded here and routed to a dedicated
`dependabot-auto-release.yml`. That workflow never fired and tagged the wrong commit,
so the exclusion only ever produced tagged-but-unpublished orphans. Retired; see #1335.)

## Examples

### Example 1: Dependency Update (Patch)

```
PR Title: "chore: update ts-jest from 29.4.1 to 29.4.2"
Result: v2.0.24 → v2.0.25 (patch bump)
```

### Example 2: New Feature (Minor)

```
PR Title: "feat: add new ADR analysis tool"
Result: v2.0.24 → v2.1.0 (minor bump)
```

### Example 3: Breaking Change (Major)

```
PR Title: "BREAKING: redesign API endpoints"
Result: v2.0.24 → v3.0.0 (major bump)
```

## Manual Override

If you need to skip auto-release for a specific PR:

1. **Add a skip label**: `no-release`, `skip-release`, or `documentation`
2. **Or temporarily disable**: Set `"enabled": false` in config

## Testing the Setup

To test with PR #146 (the ts-jest update):

1. ✅ **Merge the PR** - This will trigger auto-release
2. 🔍 **Monitor the workflow** at: Actions → Auto Release on PR Merge
3. 📦 **Check the result**: New tag created, version bumped, NPM published

## Workflow Chain

```
PR Merge → Version-Bump PR → (bump merges) → Tag at bump commit → Release → NPM Publish
```

1. **Auto Release** (`auto-release-on-merge.yml`): computes the new version and opens a
   version-bump PR touching only `package.json` / `package-lock.json`
2. **Version-Bump PR**: merges via auto-merge (`no-release` label prevents a loop)
3. **Tag**: created on the **version-bump commit**, not the original merge commit, and
   guarded by a sanity check — `git show "$BUMP_SHA:package.json"` must match the tag,
   otherwise the workflow fails rather than mint a mismatched tag
4. **Release**: publishes the Release Drafter draft, or creates a fresh release
5. **NPM Publish** (`publish.yml`): publishes via OIDC trusted publishing, then
   `publish-mcp-registry.yml` pushes to the MCP Registry

> Tagging the bump commit (step 3) is deliberate. Tagging the original merge commit
> would produce a tag whose `package.json` still held the previous version — the bug
> that `dependabot-auto-release.yml` had when it was retired (#1337).

## Fallback for Issues

If auto-release fails:

- ✅ **Manual release still works**: push the tag yourself to fire `publish.yml`
  (`git push origin vX.Y.Z`). Verify `git show vX.Y.Z:package.json` matches the tag first.
- ✅ **Stalled version-bump PR**: if the poll times out because `RELEASE_TOKEN` is not
  set (#1336), an admin can merge it directly — `gh pr merge <n> --squash --admin`
- ✅ **Easy to disable**: Just set `"enabled": false` in config

## Configuration Reference

```json
{
  "enabled": true,
  "skipLabels": ["no-release", "skip-release", "documentation"],
  "versionBumpRules": {
    "major": {
      "keywords": ["BREAKING", "breaking", "major"],
      "labels": ["breaking", "major", "breaking-change"]
    },
    "minor": {
      "keywords": ["feat", "feature", "minor"],
      "labels": ["feature", "enhancement", "minor"]
    },
    "patch": {
      "keywords": ["fix", "patch", "chore", "docs", "refactor"],
      "labels": ["bug", "fix", "patch", "documentation", "maintenance"]
    }
  }
}
```

> **No author exclusion.** Dependabot merges release like any other PR. An
> `excludeAuthors` key used to be listed here, but no workflow ever read it, and the
> equivalent guard that _was_ live (`PR_AUTHOR == 'dependabot[bot]'` in the publish
> gate) caused `auto-release-on-merge.yml` to bump the version and create the tag but
> refuse to publish it — producing orphan tags. Removed; see #1335.
>
> Recursion on the workflow's own version-bump PR is prevented by the `no-release`
> entry in `skipLabels`, not by author.

## Benefits

- 🚀 **Faster releases**: No manual intervention needed
- 📝 **Consistent versioning**: Automated semantic versioning
- 🤖 **AI-enhanced notes**: Professional release notes automatically
- 📦 **Immediate availability**: NPM publish happens automatically
- 🔒 **Safe**: Easy to disable or skip for specific PRs

---

**Ready to test?** Merge PR #146 and watch the magic happen! ✨
