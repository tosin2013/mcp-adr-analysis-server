# Interactive ADR Planning Guide

## Overview

This guide explains how to use the MCP ADR Analysis Server for interactive architectural decision record (ADR) planning. The server provides AI-driven assistance for creating, analyzing, and managing ADRs throughout your project lifecycle.

## Prerequisites

- MCP ADR Analysis Server installed and configured
- Access to your project repository
- Basic understanding of ADR concepts

## Getting Started

### 1. Initialize ADR Planning

Start by analyzing your project to understand the current architectural state:

```bash
# Analyze project ecosystem
mcp-adr analyze_project_ecosystem --project-path /path/to/project

# Generate initial ADR suggestions
mcp-adr suggest_adrs --project-path /path/to/project
```

### 2. Interactive ADR Creation

Use the interactive planning tools to create ADRs:

```bash
# Generate ADRs from Product Requirements Document
mcp-adr generate_adrs_from_prd --prd-path requirements.md --output-dir ./adrs

# Create ADR TODO with task breakdown
mcp-adr generate_adr_todo --adr-dir ./adrs --output-file TODO.md
```

### 3. Research-Driven Planning

Leverage the research capabilities for informed decision-making:

```bash
# Research architectural patterns
mcp-adr perform_research --question "What are the best practices for microservices architecture?"

# Analyze code patterns
mcp-adr analyze_code_patterns --project-path /path/to/project
```

## Planning Workflow

### Phase 1: Discovery

1. **Project Analysis**: Understand current architecture
2. **Requirement Gathering**: Identify architectural needs
3. **Research**: Investigate best practices and patterns

### Phase 2: Decision Making

1. **ADR Creation**: Document architectural decisions
2. **Impact Analysis**: Assess decision implications
3. **Validation**: Ensure decisions align with project goals

### Phase 3: Implementation

1. **TODO Generation**: Create actionable tasks
2. **Progress Tracking**: Monitor implementation status
3. **Validation**: Verify decisions are implemented correctly

## Best Practices

### ADR Structure

- Use clear, descriptive titles
- Include context and decision rationale
- Document consequences and trade-offs
- Maintain decision status

### Interactive Planning

- Use research tools for informed decisions
- Validate decisions against project constraints
- Track progress with TODO management
- Regular review and updates

### Collaboration

- Share ADRs with team members
- Use version control for ADR changes
- Document discussions and feedback
- Maintain decision history

## Advanced Features

### Research Integration

- Leverage knowledge graph for context
- Use environment analysis for constraints
- Apply web search for external insights
- Cache results for performance

### Validation and Compliance

- Check architectural rule compliance
- Validate against project standards
- Ensure security requirements
- Monitor implementation progress

## Troubleshooting

### Common Issues

- **Missing ADR Directory**: Ensure `./adrs` exists
- **Permission Errors**: Check file system permissions
- **Configuration Issues**: Verify MCP server configuration

### Getting Help

- Check the [troubleshooting guide](./troubleshooting.md)
- Review [API reference](../reference/api-reference.md)
- Consult [developer guidance](../notes/DEVELOPER_GUIDANCE.md)

## Next Steps

- [Research Integration Guide](./research-integration.md)
- [Security Analysis Guide](./security-analysis.md)
- [Deployment Readiness Guide](./deployment-readiness.md)
- [API Reference](../reference/api-reference.md)

## Related Documentation

- [Research-Driven Architecture](../notes/RESEARCH-DRIVEN-ARCHITECTURE.md)
- [Developer Guidance](../notes/DEVELOPER_GUIDANCE.md)
- [User Guidance](../notes/USER_GUIDANCE.md)
- [Testing Guide](../TESTING_GUIDE.md)
