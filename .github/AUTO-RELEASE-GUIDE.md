# Auto-Release Setup Guide

This repository now supports **automatic releases** when PRs are merged to the main branch! 🚀

## How It Works

When you merge a PR to `main`, the system will:

1. **Analyze the PR** to determine the appropriate version bump
2. **Run `npm version` locally** to compute the new version
3. **Create a git tag** on the merge commit SHA (e.g., `v2.0.25`)
4. **Publish a GitHub Release** (from Release Drafter draft or new)
5. **Open a version-bump PR** updating `package.json` and `package-lock.json`
   - The PR carries a `no-release` label so merging it does **not** trigger another release
   - Auto-merge is enabled (squash) so it lands without manual intervention
6. **Trigger AI release notes** generation
7. **Publish to NPM** automatically

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

- `dependabot[bot]` PRs use their own workflow
- Other bots can be configured in the config file

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
PR Merge → Auto Release → Tag + Release + Version-Bump PR → AI Release Notes → NPM Publish
```

1. **Auto Release** (`auto-release-on-merge.yml`): Tags merge commit, publishes release, opens version-bump PR
2. **Version-Bump PR**: Merges automatically via auto-merge (`no-release` label prevents loop)
3. **AI Release Notes** (`ai-release-notes.yml`): Enhances release with AI-generated notes
4. **NPM Publish** (`publish.yml`): Publishes package to NPM

## Fallback for Issues

If auto-release fails:

- ✅ **Manual release still works**: Use the existing release workflows
- ✅ **Dependabot still works**: Has its own dedicated workflow
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
  },
  "excludeAuthors": ["dependabot[bot]"]
}
```

## Benefits

- 🚀 **Faster releases**: No manual intervention needed
- 📝 **Consistent versioning**: Automated semantic versioning
- 🤖 **AI-enhanced notes**: Professional release notes automatically
- 📦 **Immediate availability**: NPM publish happens automatically
- 🔒 **Safe**: Easy to disable or skip for specific PRs

---

**Ready to test?** Merge PR #146 and watch the magic happen! ✨
