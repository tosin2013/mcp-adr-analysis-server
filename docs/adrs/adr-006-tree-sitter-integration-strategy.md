---
tags:
  - architecture
---

# ADR-006: Tree-Sitter Integration Strategy

## Status

Accepted

## Context

The MCP ADR Analysis Server requires deep code analysis capabilities beyond simple pattern matching. Based on the project analysis and tree-sitter integration memories, the system implements comprehensive AST-level analysis using tree-sitter parsers for multiple languages including TypeScript, Python, YAML, and others. This enables accurate architectural pattern detection, security analysis, and code quality assessment.

## Decision

We will implement comprehensive tree-sitter integration across all analysis tools, providing AST-level code analysis with multi-language support and graceful fallbacks to regex-based analysis when parsers are unavailable.

Key components:

- **Multi-Language AST Analysis**: Support for TypeScript, Python, YAML and Bash
  (see Corrections — two of the originally listed grammars were later removed)
- **Enterprise DevOps Analysis**: Specialized analysis for Ansible, Kubernetes, Docker Compose
- **Security-Focused Parsing**: AST-level secret detection and security vulnerability analysis
- **Architectural Pattern Detection**: Code structure analysis for architectural compliance
- **Performance Optimization**: Efficient parsing with file size limits and recursion controls
- **Graceful Fallbacks**: Regex-based analysis when tree-sitter parsers unavailable

## Consequences

**Positive:**

- Accurate code analysis through AST parsing reduces false positives
- Multi-language support enables comprehensive codebase analysis
- Enterprise DevOps analysis provides specialized infrastructure code insights
- Security analysis at AST level improves secret detection accuracy
- Architectural pattern detection enables sophisticated compliance validation
- Graceful fallbacks ensure analysis continuity even with parser issues

**Negative:**

- Increased complexity in managing multiple language parsers and their dependencies
- Performance impact on large codebases due to comprehensive AST parsing
- Memory requirements for parsing and storing AST representations
- Maintenance overhead for keeping parsers updated with language evolution
- Potential parsing failures requiring robust error handling and fallback mechanisms
- Learning curve for developers working with AST-based analysis logic

## Corrections

**2026-08-27 (#1507) — HCL and Dockerfile AST support was removed by ADR-017.**

This ADR originally listed HCL and Dockerfile among the supported grammars. ADR-017
downgraded the tree-sitter ecosystem to 0.21.x, and neither `tree-sitter-hcl` nor
`tree-sitter-dockerfile` is a dependency in `package.json` today. The capability list
above is corrected; this note records what it used to say and why it changed.

The decision this ADR makes — integrate tree-sitter for AST analysis — still stands, which
is why the status remains `Accepted` rather than `Deprecated`. Only the grammar inventory
drifted.

## Related ADRs

- ADR-004: Security and Content Masking Strategy (AST-level secret detection)
- ADR-014: CE-MCP Architecture (code analysis for sandbox execution)
