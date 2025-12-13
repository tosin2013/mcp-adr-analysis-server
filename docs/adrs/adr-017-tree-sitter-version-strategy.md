# ADR-017: Tree-sitter Version Strategy - Downgrade to 0.21.x for Maximum Language Compatibility

## Status

Accepted

## Date

2025-12-13

## Context

The MCP ADR Analysis Server uses tree-sitter for syntax-aware code parsing across multiple programming languages. We discovered a critical version incompatibility issue:

### Problem Discovery

When running `validate_all_adrs`, the TypeScript parser was failing with:

```
Failed to load typescript parser: TypeError: Invalid language object
    at Parser.setLanguage (node_modules/tree-sitter/index.js:351:17)
```

### Root Cause Analysis

The tree-sitter ecosystem is currently split between two major version lines:

| Version Line | Core Library             | Ecosystem State                 |
| ------------ | ------------------------ | ------------------------------- |
| **0.21.x**   | Stable, widely adopted   | Most language parsers available |
| **0.25.x**   | Latest, breaking changes | Limited parser availability     |

Our configuration had:

- `tree-sitter@0.25.0` (core library)
- `tree-sitter-typescript@0.23.2` (requires `^0.21.0`)
- Other parsers at 0.25.x

This version mismatch caused the TypeScript parser to fail because the native bindings are incompatible between 0.21.x and 0.25.x.

### Version Compatibility Matrix (Researched 2025-12-13)

| Language   | 0.21.x Version | 0.25.x Version          | Notes                                        |
| ---------- | -------------- | ----------------------- | -------------------------------------------- |
| TypeScript | 0.21.2         | 0.23.2 (incompatible)   | **Broken on 0.25.x**                         |
| JavaScript | 0.21.4         | 0.25.0                  | Works on both                                |
| Python     | 0.21.0         | 0.25.0                  | Works on both                                |
| Java       | 0.21.0         | -                       | Works on 0.21.x only                         |
| Go         | 0.21.2         | 0.25.0                  | Works on both                                |
| Rust       | 0.21.0         | 0.24.0                  | Works on both                                |
| C          | 0.21.4         | 0.24.1                  | Works on both                                |
| C++        | 0.21.0         | 0.23.4                  | Works on both                                |
| Ruby       | 0.21.0         | 0.23.1                  | Works on both                                |
| Bash       | 0.21.0         | 0.25.0                  | Works on both                                |
| JSON       | 0.21.0         | 0.24.8                  | Works on both                                |
| YAML       | 0.5.0          | 0.5.0                   | **Incompatible with 0.21.x** - uses fallback |
| CSS        | 0.21.1         | 0.23.2                  | Works on both                                |
| HTML       | 0.20.4         | 0.23.4                  | Needs 0.20.x                                 |
| HCL        | -              | 1.2.0 (requires 0.25.x) | **Only on 0.25.x**                           |
| PHP        | -              | 0.24.2                  | No 0.21.x version                            |

## Decision

**Downgrade to tree-sitter 0.21.x ecosystem** to maximize language support and fix the TypeScript parser issue.

### Packages to Install (0.21.x compatible)

```json
{
  "tree-sitter": "^0.21.1",
  "tree-sitter-typescript": "^0.21.2",
  "tree-sitter-javascript": "^0.21.4",
  "tree-sitter-python": "^0.21.0",
  "tree-sitter-java": "^0.21.0",
  "tree-sitter-go": "^0.21.2",
  "tree-sitter-rust": "^0.21.0",
  "tree-sitter-c": "^0.21.4",
  "tree-sitter-cpp": "^0.21.0",
  "tree-sitter-ruby": "^0.21.0",
  "tree-sitter-bash": "^0.21.0",
  "tree-sitter-json": "^0.21.0",
  "tree-sitter-css": "^0.21.1",
  "tree-sitter-yaml": "^0.5.0"
}
```

### Packages to Remove

- `@tree-sitter-grammars/tree-sitter-hcl` - Requires 0.25.x, incompatible
- `tree-sitter-dockerfile` - Security placeholder package, not functional

### Languages Gained vs Lost

**Gained (13 languages with native tree-sitter parsing):**

- TypeScript/TSX (was broken)
- JavaScript
- Python
- Java (new)
- Go (new)
- Rust (new)
- C (new)
- C++ (new)
- Ruby (new)
- Bash
- JSON
- CSS (new)

**Using fallback regex analysis:**

- YAML - tree-sitter-yaml 0.5.0 is incompatible with tree-sitter 0.21.x (uses fallback)

**Lost (2 languages):**

- HCL (Terraform) - No 0.21.x compatible version exists
- PHP - No 0.21.x version available

## Consequences

### Positive

1. **TypeScript Support Restored**: Critical for analyzing TypeScript/React projects
2. **Expanded Language Coverage**: From 7 languages to 14 languages
3. **Stable Ecosystem**: 0.21.x is mature and well-tested
4. **Consistent Versioning**: All parsers on same major version reduces conflicts
5. **Java/Quarkus Support**: Important for enterprise Java projects
6. **Go Support**: Important for cloud-native projects
7. **Rust Support**: Growing ecosystem coverage

### Negative

1. **No HCL/Terraform Support**: Cannot parse `.tf` files until ecosystem catches up
2. **No PHP Support**: Limited web framework coverage
3. **Older Version**: May miss newer parser improvements in 0.25.x
4. **Future Migration**: Will need to migrate when 0.25.x ecosystem matures

### Neutral

1. **Native Compilation**: Still requires node-gyp for native modules
2. **Platform Support**: Same cross-platform requirements

## Alternatives Considered

### Alternative 1: Use @sengac Fork Ecosystem

A community fork (`@sengac/tree-sitter-typescript@0.25.15`) exists that's compatible with 0.25.x.

**Rejected because:**

- Requires entire forked ecosystem (`@sengac/tree-sitter`)
- Not official packages, less maintained
- Vendor lock-in to fork

### Alternative 2: Keep 0.25.x with TypeScript Disabled

Accept that TypeScript parsing doesn't work and rely on fallback methods.

**Rejected because:**

- TypeScript is critical for this project (written in TypeScript)
- Many target projects use TypeScript/React
- Degrades analysis quality significantly

### Alternative 3: Wait for Official 0.25.x TypeScript Parser

Wait for the official `tree-sitter-typescript` to release a 0.25.x compatible version.

**Rejected because:**

- No timeline for release
- Current version (0.23.2) released Nov 2024, still requires 0.21.x
- Blocks current functionality

## Implementation Notes

### Code Changes Required

1. Update `package.json` dependencies
2. Remove `overrides` section that forces 0.25.0
3. Update `src/utils/tree-sitter-analyzer.ts`:
   - Add new language mappings (Java, Go, Rust, C, C++, Ruby, CSS)
   - Remove HCL support
   - Update TypeScript loading (may need adjustment for 0.21.x module format)
4. Run `npm install` to rebuild native modules
5. Test all language parsers

### Monitoring

When tree-sitter-typescript releases a 0.25.x compatible version:

1. Create new ADR to evaluate migration
2. Test compatibility with current setup
3. Consider re-adding HCL support

## References

- [tree-sitter GitHub](https://github.com/tree-sitter/tree-sitter)
- [tree-sitter-typescript GitHub](https://github.com/tree-sitter/tree-sitter-typescript)
- [npm tree-sitter](https://www.npmjs.com/package/tree-sitter)
- [ADR-016: Replace ripgrep with tree-sitter](./adr-016-replace-ripgrep-with-tree-sitter.md)

## Related ADRs

- ADR-016: Replace ripgrep with tree-sitter (predecessor decision)
