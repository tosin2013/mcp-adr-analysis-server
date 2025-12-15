# Pushing Tags to NPM

This guide explains how to publish your package versions to npmjs.com by pushing git tags.

## Quick Start

### 1. Create and Push a Git Tag

```bash
# Create a version tag (e.g., v2.1.16)
git tag v2.1.16

# Push the tag to GitHub
git push origin v2.1.16
```

### 2. Automatic Publishing

When you push a tag matching the pattern `v*` (e.g., `v2.1.16`), the GitHub Actions workflow automatically:

1. ✅ Runs all tests and linting
2. ✅ Builds the project
3. ✅ Verifies package structure
4. ✅ Publishes to npmjs.com
5. ✅ Sets appropriate npm dist-tags (`latest` for stable, `beta` for prereleases)
6. ✅ Creates/updates GitHub release

## How It Works

### Workflow Trigger

The `.github/workflows/publish.yml` workflow is triggered when:

- **Tag push**: Any tag matching `v*` pattern is pushed to GitHub
- **Manual dispatch**: You can manually trigger via GitHub Actions UI
- **Workflow call**: Called from other workflows

### Version Detection

The workflow automatically:

- Extracts version from the git tag (removes `v` prefix)
- Updates `package.json` version if needed
- Publishes with the correct npm dist-tag

### NPM Dist-Tags

- **Stable versions** (e.g., `v2.1.16`): Published with `latest` tag
- **Prerelease versions** (e.g., `v2.1.16-beta.1`): Published with `beta` tag

## Examples

### Publishing a Patch Version

```bash
# Current version: 2.1.15
git tag v2.1.16
git push origin v2.1.16
```

### Publishing a Minor Version

```bash
# Current version: 2.1.15
git tag v2.2.0
git push origin v2.2.0
```

### Publishing a Major Version

```bash
# Current version: 2.1.15
git tag v3.0.0
git push origin v3.0.0
```

### Publishing a Prerelease

```bash
# Beta release
git tag v2.1.16-beta.1
git push origin v2.1.16-beta.1
```

## Verification

After pushing a tag, you can verify publication:

### Check GitHub Actions

1. Go to your repository's Actions tab
2. Find the "Publish to NPM" workflow run
3. Verify all steps completed successfully

### Check NPM Registry

```bash
# View package versions
npm view mcp-adr-analysis-server versions

# View dist-tags
npm view mcp-adr-analysis-server dist-tags

# Check specific version
npm view mcp-adr-analysis-server@2.1.16
```

### Check Package Page

Visit: https://www.npmjs.com/package/mcp-adr-analysis-server

## Troubleshooting

### Tag Not Publishing

1. **Check tag format**: Must start with `v` (e.g., `v2.1.16`)
2. **Verify workflow trigger**: Check Actions tab for workflow run
3. **Check NPM_TOKEN**: Ensure `NPM_TOKEN` secret is set in GitHub
4. **Review workflow logs**: Check for errors in the workflow run

### Version Already Exists

If a version already exists on npm, the publish will fail. Options:

1. **Use a different version**: Increment to next version
2. **Unpublish** (if recently published): `npm unpublish mcp-adr-analysis-server@2.1.16`
   - Note: Unpublishing is only allowed within 72 hours

### Missing NPM Token

If you see authentication errors:

1. Generate an npm access token:
   - Go to https://www.npmjs.com/settings/tokens
   - Create "Automation" token
2. Add to GitHub Secrets:
   - Repository → Settings → Secrets and variables → Actions
   - Add secret named `NPM_TOKEN`

## Manual Publishing (Alternative)

If you need to publish manually without using git tags:

```bash
# Update version in package.json
npm version patch  # or minor, major

# Build and publish
npm run build
npm publish
```

## Best Practices

1. **Semantic Versioning**: Follow semver (major.minor.patch)
2. **Tag Before Push**: Create tag locally, review, then push
3. **Test Locally**: Run `npm run test:package` before tagging
4. **Changelog**: Update CHANGELOG.md before creating release
5. **Release Notes**: Use GitHub Releases for detailed notes

## Related Documentation

- [NPM Publishing Guide](./deploy-your-own-server.md)
- [Version Management](../../docs/VERSION_MANAGEMENT.md)
- [Release Process](../../.github/AUTO-RELEASE-GUIDE.md)
