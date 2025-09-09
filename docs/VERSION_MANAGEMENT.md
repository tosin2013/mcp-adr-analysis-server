# Version Management

## Overview

The MCP ADR Analysis Server uses a robust version management system that automatically reads the version from `package.json` and provides future-proof fallback handling.

## How It Works

### Version Resolution Strategy

The `getPackageVersion()` function uses multiple strategies to determine the version:

1. **Primary Strategy**: Search for `package.json` in multiple locations:
   - Current directory
   - Parent directory
   - Grandparent directory  
   - Process working directory

2. **Environment Strategy**: Use `process.env.npm_package_version` when available (during npm scripts)

3. **Generic Fallback**: Use `'unknown'` instead of hardcoded version numbers

### Future-Proof Design

The version system is designed to be **future-proof**:

- ✅ **No hardcoded version numbers** in fallback logic
- ✅ **Generic fallback** that doesn't need updates
- ✅ **Automatic version detection** from package.json
- ✅ **Comprehensive test coverage** for version scenarios

## Previous Issue

Before this improvement:
- Fallback versions were hardcoded (e.g., `'2.0.2'`, `'2.0.15'`)
- Each version update required manual code changes
- Risk of version mismatch between package.json and fallback values

## Current Solution

After the improvement:
- Fallback uses generic `'unknown'` value
- No code changes needed when package.json version updates
- Multiple strategies ensure version is found in most scenarios
- Clear documentation prevents future hardcoding

## Usage

```bash
# Check version
npx mcp-adr-analysis-server --version

# Example output:
# MCP ADR Analysis Server v2.0.15
```

## Testing

The version system includes comprehensive tests:

```bash
npm test -- tests/version.test.ts
```

Tests verify:
- Correct version reading from package.json
- Generic fallback behavior  
- Future-proof implementation (no hardcoded version numbers)

## Maintenance

**When updating the package version:**

1. Update `package.json` version field ✅
2. **No code changes needed** ✅
3. Version command automatically shows new version ✅

This design eliminates the need for manual code updates when the version changes.