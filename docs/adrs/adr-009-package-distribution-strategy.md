# ADR-009: Package Distribution Strategy

## Status

Accepted

## Context

The MCP ADR Analysis Server needs to be distributed as both a library and a CLI tool for different use cases. Based on the package.json configuration, the project uses NPM for distribution with ES modules, TypeScript compilation, and binary CLI access. The distribution strategy affects how users consume and integrate the MCP server.

## Decision

We will distribute the MCP ADR Analysis Server as an NPM package with ES module support, TypeScript compilation, and CLI binary access.

Key components:

- **NPM Package Distribution**: Public NPM registry with semantic versioning
- **ES Module Architecture**: Modern JavaScript modules with `"type": "module"`
- **TypeScript Compilation**: Pre-compiled JavaScript with TypeScript definitions
- **CLI Binary Access**: Executable binary for command-line usage
- **Selective File Distribution**: Only essential files (dist/, README.md, ../../LICENSE) in package
- **Engine Requirements**: Node.js >=20.0.0 and npm >=9.0.0 for modern features
- **Public Access**: Open source distribution with MIT license

## Consequences

**Positive:**

- Wide compatibility through NPM ecosystem integration
- Modern JavaScript features through ES modules
- Type safety for TypeScript consumers
- Dual usage as library and CLI tool
- Reduced package size through selective file inclusion
- Clear version management with semantic versioning
- Professional distribution through established NPM infrastructure

**Negative:**

- Complexity in maintaining both library and CLI interfaces
- Build process overhead for TypeScript compilation
- Potential compatibility issues with older Node.js versions
- Dependency on NPM registry availability and policies
- Need for careful version management to avoid breaking changes
- Additional testing requirements for both distribution modes
