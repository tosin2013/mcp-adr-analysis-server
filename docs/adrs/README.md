# Architectural Decision Records (ADRs)

This directory contains the Architectural Decision Records for the MCP ADR Analysis Server project.

## ADR Index

| ADR                                                                    | Title                                            | Status   | Date       | Category      |
| ---------------------------------------------------------------------- | ------------------------------------------------ | -------- | ---------- | ------------- |
| [ADR-001](adr-001-mcp-protocol-implementation-strategy.md)             | MCP Protocol Implementation Strategy             | Accepted | 2024-01-15 | Architecture  |
| [ADR-002](adr-002-ai-integration-and-advanced-prompting-strategy.md)   | AI Integration and Advanced Prompting Strategy   | Accepted | 2024-01-15 | AI/ML         |
| [ADR-003](adr-003-memory-centric-architecture.md)                      | Memory-Centric Architecture                      | Accepted | 2024-01-15 | Architecture  |
| [ADR-004](adr-004-security-and-content-masking-strategy.md)            | Security and Content Masking Strategy            | Accepted | 2024-01-15 | Security      |
| [ADR-005](adr-005-testing-and-quality-assurance-strategy.md)           | Testing and Quality Assurance Strategy           | Accepted | 2024-01-15 | Quality       |
| [ADR-006](adr-006-tree-sitter-integration-strategy.md)                 | Tree-Sitter Integration Strategy                 | Accepted | 2024-01-15 | Architecture  |
| [ADR-007](adr-007-cicd-pipeline-strategy.md)                           | CI/CD Pipeline Strategy                          | Accepted | 2024-01-15 | DevOps        |
| [ADR-008](adr-008-development-workflow-strategy.md)                    | Development Workflow Strategy                    | Accepted | 2024-01-15 | Process       |
| [ADR-009](adr-009-package-distribution-strategy.md)                    | Package Distribution Strategy                    | Accepted | 2024-01-15 | Distribution  |
| [ADR-010](adr-010-bootstrap-deployment-architecture.md)                | Bootstrap Deployment Architecture                | Accepted | 2025-01-23 | Deployment    |
| [ADR-011](adr-011-adr-timeline-tracking-and-context-aware-analysis.md) | ADR Timeline Tracking and Context-Aware Analysis | Accepted | 2025-11-19 | Architecture  |
| [ADR-012](adr-012-validated-patterns-framework.md)                     | Validated Patterns Framework                     | Proposed | 2025-01-16 | Deployment    |
| [ADR-013](adr-013-documentation-platform-strategy.md)                  | Documentation Platform Strategy                  | Proposed | 2025-11-21 | Documentation |
| [ADR-014](adr-014-ce-mcp-architecture.md)                              | CE-MCP Architecture                              | Proposed | 2025-12-09 | Architecture  |
| [ADR-015](adr-015-ape-optimization-strategy.md)                        | APE Optimization Strategy                        | Accepted | 2025-12-12 | AI/ML         |
| [ADR-017](adr-017-tree-sitter-version-strategy.md)                     | Tree-Sitter Version Strategy                     | Accepted | 2025-12-13 | Architecture  |
| [ADR-018](adr-018-atomic-tools-architecture.md)                        | Atomic Tools Architecture                        | Accepted | 2025-12-16 | Architecture  |

## Legacy ADRs (Sample Project)

The following ADRs exist in the `sample-project/././adrs/` directory and serve as examples:

| ADR                                                                | Title                           | Status     | Category  |
| ------------------------------------------------------------------ | ------------------------------- | ---------- | --------- |
| [001](../../sample-project/docs/adrs/001-database-architecture.md) | Database Architecture Selection | Accepted   | Database  |
| [002](../../sample-project/docs/adrs/002-api-authentication.md)    | API Authentication Strategy     | Proposed   | Security  |
| [003](../../sample-project/docs/adrs/003-legacy-data-migration.md) | Legacy Data Migration Strategy  | Deprecated | Migration |

## ADR Categories

### Architecture

- **ADR-001**: MCP Protocol Implementation Strategy
- **ADR-003**: Memory-Centric Architecture
- **ADR-006**: Tree-Sitter Integration Strategy
- **ADR-011**: ADR Timeline Tracking and Context-Aware Analysis
- **ADR-014**: CE-MCP Architecture (Code Execution with MCP)
- **ADR-017**: Tree-Sitter Version Strategy
- **ADR-018**: Atomic Tools Architecture

### AI/ML

- **ADR-002**: AI Integration and Advanced Prompting Strategy
- **ADR-015**: APE Optimization Strategy

### Security

- **ADR-004**: Security and Content Masking Strategy

### Quality

- **ADR-005**: Testing and Quality Assurance Strategy
- **ADR-018**: Atomic Tools Architecture (Testing Infrastructure)

### DevOps

- **ADR-007**: CI/CD Pipeline Strategy

### Process

- **ADR-008**: Development Workflow Strategy

### Distribution

- **ADR-009**: Package Distribution Strategy

### Deployment

- **ADR-010**: Bootstrap Deployment Architecture
- **ADR-012**: Validated Patterns Framework

### Documentation

- **ADR-013**: Documentation Platform Strategy

## ADR Relationships

This section documents the dependencies and relationships between ADRs.

```
ADR-001 (MCP Protocol) ─────┬──► ADR-002 (AI Integration)
                            │
                            ├──► ADR-003 (Memory Architecture)
                            │
                            └──► ADR-011 (Timeline Tracking)

ADR-003 (Memory) ───────────┬──► ADR-011 (Timeline Tracking)
                            │
                            └──► ADR-012 (Validated Patterns)

ADR-004 (Security) ─────────┬──► ADR-006 (Tree-Sitter)
                            │
                            └──► ADR-008 (Dev Workflow)

ADR-010 (Bootstrap) ────────┬──► ADR-001 (MCP Protocol)
                            │
                            ├──► ADR-002 (AI Integration)
                            │
                            └──► ADR-012 (Validated Patterns)

ADR-012 (Validated Patterns) ──► ADR-010 (Bootstrap)

ADR-013 (Documentation) ────────┬──► ADR-007 (CI/CD Pipeline)
                                │
                                └──► ADR-008 (Dev Workflow)

ADR-014 (CE-MCP Architecture) ──┬──► ADR-001 (MCP Protocol) [EVOLVES]
                                │
                                ├──► ADR-002 (AI Integration) [EVOLVES]
                                │
                                ├──► ADR-010 (Bootstrap) [ALIGNS]
                                │
                                └──► ADR-012 (Validated Patterns) [ALIGNS]

ADR-015 (APE Optimization) ─────┬──► ADR-002 (AI Integration) [OPTIMIZES]
                                │
                                └──► ADR-014 (CE-MCP) [ALIGNS]

ADR-017 (Tree-Sitter Version) ─────► ADR-006 (Tree-Sitter Integration) [EVOLVES]

ADR-018 (Atomic Tools) ─────────┬──► ADR-003 (Memory Architecture) [EVOLVES]
                                │
                                ├──► ADR-005 (Testing Strategy) [EVOLVES]
                                │
                                └──► ADR-014 (CE-MCP) [ALIGNS]
```

### Cross-Reference Matrix

| ADR     | Depends On                | Influences                                  |
| ------- | ------------------------- | ------------------------------------------- |
| ADR-001 | -                         | ADR-002, ADR-003, ADR-010, ADR-011          |
| ADR-002 | ADR-001                   | ADR-010                                     |
| ADR-003 | ADR-001                   | ADR-011, ADR-012                            |
| ADR-004 | -                         | ADR-006, ADR-008                            |
| ADR-005 | ADR-007                   | ADR-008                                     |
| ADR-006 | ADR-004                   | ADR-004                                     |
| ADR-007 | -                         | ADR-005, ADR-008, ADR-010                   |
| ADR-008 | ADR-005, ADR-007          | -                                           |
| ADR-009 | ADR-007                   | -                                           |
| ADR-010 | ADR-001, ADR-002, ADR-007 | ADR-012                                     |
| ADR-011 | ADR-001, ADR-003          | -                                           |
| ADR-012 | ADR-003, ADR-010          | ADR-010                                     |
| ADR-013 | ADR-007, ADR-008          | -                                           |
| ADR-014 | ADR-001, ADR-002          | ADR-010, ADR-012 (evolves ADR-001, ADR-002) |
| ADR-015 | ADR-002, ADR-014          | - (optimizes APE from ADR-002)              |
| ADR-017 | ADR-006                   | - (evolves Tree-Sitter integration)         |
| ADR-018 | ADR-003, ADR-005, ADR-014 | - (evolves testing and architecture)        |

## Archived/Test ADRs

The following files exist for testing purposes and should not be considered production ADRs:

| File                                    | Purpose                  | Status    |
| --------------------------------------- | ------------------------ | --------- |
| `adr-0001-test-decision.md`             | Unit test fixture        | Test Only |
| `adr-0001-integration-test-decision.md` | Integration test fixture | Test Only |

## ADR Template

We use the [NYGARD template](https://thinkrelevance.com/blog/2011/11/15/documenting-architecture-decisions) for our ADRs:

```markdown
# ADR-XXX: [Title]

## Status

[Proposed | Accepted | Deprecated | Superseded]

## Context

[Description of the problem and context]

## Decision

[Description of the architectural decision]

## Consequences

**Positive:**

- [Positive consequence 1]
- [Positive consequence 2]

**Negative:**

- [Negative consequence 1]
- [Negative consequence 2]
```

## Contributing

When creating new ADRs:

1. Use the next available ADR number
2. Follow the NYGARD template format
3. Include clear context, decision, and consequences
4. Update this README.md index
5. Link related ADRs where appropriate

## Tools

This project includes MCP tools for ADR management:

- `mcp0_discover_existing_adrs`: Discover and catalog existing ADRs
- `mcp0_suggest_adrs`: Suggest new ADRs based on code analysis
- `mcp0_generate_adr_from_decision`: Generate ADRs from decision data
- `mcp0_review_existing_adrs`: Review ADRs against implementation
- `mcp0_generate_adr_todo`: Generate implementation tasks from ADRs
