# Architectural Decision Records (ADRs)

This directory contains the Architectural Decision Records for the MCP ADR Analysis Server project.

## ADR Index

| ADR                                                                  | Title                                          | Status   | Date       | Category     |
| -------------------------------------------------------------------- | ---------------------------------------------- | -------- | ---------- | ------------ |
| [ADR-001](adr-001-mcp-protocol-implementation-strategy.md)           | MCP Protocol Implementation Strategy           | Accepted | 2024-01-15 | Architecture |
| [ADR-002](adr-002-ai-integration-and-advanced-prompting-strategy.md) | AI Integration and Advanced Prompting Strategy | Accepted | 2024-01-15 | AI/ML        |
| [ADR-003](adr-003-memory-centric-architecture.md)                    | Memory-Centric Architecture                    | Accepted | 2024-01-15 | Architecture |
| [ADR-004](adr-004-security-and-content-masking-strategy.md)          | Security and Content Masking Strategy          | Accepted | 2024-01-15 | Security     |
| [ADR-005](adr-005-testing-and-quality-assurance-strategy.md)         | Testing and Quality Assurance Strategy         | Accepted | 2024-01-15 | Quality      |
| [ADR-006](adr-006-tree-sitter-integration-strategy.md)               | Tree-Sitter Integration Strategy               | Accepted | 2024-01-15 | Architecture |
| [ADR-007](adr-007-cicd-pipeline-strategy.md)                         | CI/CD Pipeline Strategy                        | Accepted | 2024-01-15 | DevOps       |
| [ADR-008](adr-008-development-workflow-strategy.md)                  | Development Workflow Strategy                  | Accepted | 2024-01-15 | Process      |
| [ADR-009](adr-009-package-distribution-strategy.md)                  | Package Distribution Strategy                  | Accepted | 2024-01-15 | Distribution |

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

### AI/ML

- **ADR-002**: AI Integration and Advanced Prompting Strategy

### Security

- **ADR-004**: Security and Content Masking Strategy

### Quality

- **ADR-005**: Testing and Quality Assurance Strategy

### DevOps

- **ADR-007**: CI/CD Pipeline Strategy

### Process

- **ADR-008**: Development Workflow Strategy

### Distribution

- **ADR-009**: Package Distribution Strategy

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
