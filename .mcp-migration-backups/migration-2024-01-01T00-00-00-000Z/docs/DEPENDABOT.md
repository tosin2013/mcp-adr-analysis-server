# Dependabot Security Configuration

This document explains how Dependabot is configured in this repository to automatically address security vulnerabilities like the current malware incident.

## Configuration Overview

Dependabot is configured to:

### 🔒 Security-First Approach

- **Daily checks** for npm package updates (focusing on security patches)
- **Weekly checks** for GitHub Actions updates
- **Priority handling** for security vulnerabilities
- **Automatic PR creation** for available fixes

### 🎯 Current Focus: Debug Package Malware

The remaining 9 critical vulnerabilities stem from the `debug` package malware in `@modelcontextprotocol/sdk`. Dependabot will:

1. **Monitor** for clean versions of `@modelcontextprotocol/sdk` that don't depend on vulnerable `debug`
2. **Create PRs** immediately when security updates are available
3. **Group related updates** to reduce noise while maintaining security focus

### 📋 PR Management

#### Grouping Strategy

- **Production dependencies**: `@modelcontextprotocol/*`, `@types/*`
- **Development dependencies**: Jest, TypeScript, linting tools
- **GitHub Actions**: Workflow security updates

#### Labels Applied

- `dependencies` - All dependency updates
- `security` - Security-related updates (highest priority)
- `github-actions` - Workflow updates

### 🚨 Expected Behavior

When Dependabot detects:

- A new version of `@modelcontextprotocol/sdk` without the malware
- Security patches for any dependencies
- Updated GitHub Actions with security fixes

It will automatically:

1. Create a PR with detailed change information
2. Add appropriate labels for easy identification
3. Request review from @tosin2013
4. Include security analysis in the PR description

### 🔄 Integration with Existing Workflows

Dependabot PRs will trigger:

- **Build validation** (from build.yml)
- **Security audits** (from dependencies.yml)
- **Node.js compatibility checks**
- **Lint checks** (from lint.yml)

### 📊 Benefits

- **Proactive security**: Catch vulnerabilities before they become incidents
- **Automated monitoring**: No manual checking needed
- **Quick response**: Daily checks ensure rapid security patch deployment
- **Organized updates**: Grouped PRs prevent dependency management chaos

## Manual Override

If urgent security fixes are needed:

```bash
# Force update to resolve critical vulnerabilities
npm audit fix --force

# Review breaking changes carefully
npm test
make node-compat
```

Note: The current `debug` malware issue requires waiting for upstream `@modelcontextprotocol/sdk` to release a clean version, which Dependabot will automatically detect and propose.
