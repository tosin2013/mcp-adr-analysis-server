# NPM Publishing Guide

This document explains how to publish the MCP ADR Analysis Server to npmjs.com using the automated GitHub Actions workflow.

## 🚀 Quick Start

### Automatic Publishing (Recommended)

1. **Create a version tag:**

   ```bash
   git tag v1.0.1
   git push origin v1.0.1
   ```

2. **The GitHub Actions workflow will automatically:**
   - Run all tests and linting
   - Build the project
   - Test MCP server functionality
   - Publish to npmjs.com
   - Create a GitHub release

### Manual Publishing

1. **Test the package locally:**

   ```bash
   npm run test:package
   ```

2. **Publish manually:**
   ```bash
   npm publish
   ```

## 📋 Prerequisites

### NPM Token Setup

1. **Create an NPM account** at https://www.npmjs.com/
2. **Generate an access token:**
   - Go to https://www.npmjs.com/settings/tokens
   - Click "Generate New Token"
   - Choose "Automation" type
   - Copy the token

3. **Add token to GitHub Secrets:**
   - Go to your repository settings
   - Navigate to "Secrets and variables" → "Actions"
   - Add a new secret named `NPM_TOKEN`
   - Paste your NPM token as the value

## 🔧 Publishing Workflow Features

### Automated Quality Checks

- ✅ ESLint code quality validation
- ✅ Jest test suite execution
- ✅ TypeScript compilation verification
- ✅ MCP server functionality testing
- ✅ Package structure validation

### Version Management

- **Tag-based publishing**: Push a version tag to trigger publishing
- **Manual versioning**: Use workflow dispatch with version input
- **Automatic version updates**: Updates package.json version

### Package Optimization

- **Selective file inclusion**: Only includes necessary files
- **Size optimization**: ~173 KB optimized package
- **Binary setup**: Includes CLI binary for global installation

## 📦 Package Information

### Installation

```bash
# Global installation
npm install -g mcp-adr-analysis-server

# Local installation
npm install mcp-adr-analysis-server
```

### Usage

```bash
# Run as CLI tool
mcp-adr-analysis-server

# Or use as Node.js module
node node_modules/mcp-adr-analysis-server/dist/src/index.js
```

### Package Contents

- **Main entry**: `dist/src/index.js`
- **Binary**: `mcp-adr-analysis-server` command
- **Documentation**: README.md and LICENSE
- **Type definitions**: Full TypeScript support

## 🔄 Version Management

### Semantic Versioning

- **Patch** (1.0.1): Bug fixes and minor updates
- **Minor** (1.1.0): New features, backward compatible
- **Major** (2.0.0): Breaking changes

### Publishing Commands

```bash
# Patch version (1.0.0 → 1.0.1)
git tag v1.0.1 && git push origin v1.0.1

# Minor version (1.0.0 → 1.1.0)
git tag v1.1.0 && git push origin v1.1.0

# Major version (1.0.0 → 2.0.0)
git tag v2.0.0 && git push origin v2.0.0
```

### Manual Workflow Dispatch

You can also trigger publishing manually:

1. Go to GitHub Actions tab
2. Select "Publish to NPM" workflow
3. Click "Run workflow"
4. Choose version type (patch/minor/major/prerelease)

## 🛡️ Security & Best Practices

### Token Security

- ✅ NPM token stored as GitHub secret
- ✅ Token only accessible to authorized workflows
- ✅ Automatic token rotation recommended

### Quality Gates

- ✅ All tests must pass before publishing
- ✅ Linting must pass before publishing
- ✅ Build must succeed before publishing
- ✅ MCP server functionality verified

### Package Integrity

- ✅ Package contents verified before publishing
- ✅ Main entry point validated
- ✅ Binary accessibility confirmed
- ✅ Size optimization applied

## 📊 Monitoring & Maintenance

### NPM Package Stats

- **Package page**: https://www.npmjs.com/package/mcp-adr-analysis-server
- **Download stats**: Available on NPM package page
- **Version history**: Tracked in NPM registry

### GitHub Releases

- **Automatic releases**: Created for each published version
- **Release notes**: Generated with feature highlights
- **Asset downloads**: Package tarballs available

## 🔧 Troubleshooting

### Common Issues

1. **NPM Token Invalid**
   - Regenerate token on npmjs.com
   - Update GitHub secret

2. **Tests Failing**
   - Check test output in GitHub Actions
   - Fix issues locally and push

3. **Package Size Too Large**
   - Review .npmignore file
   - Remove unnecessary files

4. **Binary Not Working**
   - Verify package.json bin configuration
   - Test locally with `npm run test:package`

### Support

For issues with the publishing process, check:

- GitHub Actions logs
- NPM package page
- Repository issues section
