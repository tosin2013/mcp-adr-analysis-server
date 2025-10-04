# Research Integration Guide

## Overview

This guide explains how to integrate the research-driven architecture of the MCP ADR Analysis Server into your development workflow. The server provides cascading research capabilities that combine project files, knowledge graphs, environment analysis, and web search to provide comprehensive insights for architectural decision-making.

## Research Architecture

### Source Hierarchy

The research system uses a cascading approach with four primary sources:

1. **📁 Project Files** - Code, configuration, and documentation
2. **🧠 Knowledge Graph** - ADR relationships and architectural decisions
3. **🔧 Environment Resources** - Live system data and capabilities
4. **🌐 Web Search** - External information and best practices

### Confidence Scoring

Each source provides a confidence score (0-1):
- **High (≥80%)**: Reliable answer from project sources
- **Moderate (60-79%)**: Good answer, may need validation
- **Low (<60%)**: Limited information, web search recommended

## Getting Started

### 1. Basic Research

Start with simple research questions:

```bash
# Research authentication methods
mcp-adr perform_research --question "What authentication methods are used in this project?"

# Investigate deployment patterns
mcp-adr perform_research --question "How is the application deployed?"
```

### 2. Advanced Research

Use research for complex architectural decisions:

```bash
# Research with custom confidence threshold
mcp-adr perform_research \
  --question "What are the performance bottlenecks in this system?" \
  --confidence-threshold 0.8 \
  --perform-web-search true

# Research with specific project context
mcp-adr perform_research \
  --question "How does this project handle database connections?" \
  --project-path /path/to/project \
  --adr-directory ./adrs
```

## Research Workflow

### Phase 1: Question Formulation
1. **Define Research Scope**: What do you need to understand?
2. **Identify Key Terms**: Extract important concepts and technologies
3. **Set Confidence Requirements**: Determine acceptable confidence levels

### Phase 2: Research Execution
1. **Project File Analysis**: Search codebase for relevant information
2. **Knowledge Graph Query**: Check ADR relationships and decisions
3. **Environment Analysis**: Examine live system capabilities
4. **Web Search Fallback**: External information when needed

### Phase 3: Result Analysis
1. **Confidence Assessment**: Evaluate result reliability
2. **Source Attribution**: Understand information origins
3. **Gap Identification**: Identify missing information
4. **Action Planning**: Determine next steps

## Integration Patterns

### Development Workflow Integration

```bash
# Before making architectural changes
mcp-adr perform_research --question "What are the current architectural patterns for data storage?"

# During code review
mcp-adr perform_research --question "How does this change align with existing ADRs?"

# After implementation
mcp-adr perform_research --question "What are the implications of this architectural decision?"
```

### ADR Creation Integration

```bash
# Research before creating ADR
mcp-adr perform_research --question "What are best practices for API versioning?"

# Generate ADR based on research
mcp-adr generate_adrs_from_prd --prd-path requirements.md

# Validate ADR against research
mcp-adr validate_rules --adr-dir ./adrs
```

### Continuous Integration

```bash
# Research in CI pipeline
mcp-adr perform_research --question "Are there any security vulnerabilities in recent changes?"

# Validate architectural compliance
mcp-adr analyze_content_security --project-path /path/to/project
```

## Advanced Features

### Knowledge Graph Integration

The knowledge graph provides context-aware research:

```bash
# Query related ADRs
mcp-adr perform_research --question "What ADRs are related to database architecture?"

# Find decision dependencies
mcp-adr perform_research --question "What decisions depend on the authentication ADR?"
```

### Environment Analysis

Live system analysis provides real-time insights:

```bash
# Check available capabilities
mcp-adr perform_research --question "What cloud services are available in this environment?"

# Analyze deployment status
mcp-adr perform_research --question "What is the current deployment configuration?"
```

### Web Search Integration

External research for comprehensive coverage:

```bash
# Research industry best practices
mcp-adr perform_research --question "What are current best practices for microservices architecture?"

# Find security recommendations
mcp-adr perform_research --question "What are the latest security recommendations for web applications?"
```

## Performance Considerations

### Caching
- Research results are cached for 5 minutes
- Repeated queries return cached results instantly
- Cache automatically expires for fresh information

### Optimization
- Use specific questions for better results
- Set appropriate confidence thresholds
- Leverage project context for relevance

### Monitoring
- Track research performance metrics
- Monitor cache hit rates
- Analyze research patterns

## Best Practices

### Question Formulation
- Be specific and focused
- Include relevant context
- Use clear, unambiguous language
- Consider multiple perspectives

### Research Strategy
- Start with project sources
- Use knowledge graph for context
- Leverage environment analysis
- Fall back to web search when needed

### Result Interpretation
- Consider confidence scores
- Evaluate source reliability
- Identify information gaps
- Plan follow-up research

## Troubleshooting

### Common Issues
- **Low Confidence Results**: Try more specific questions
- **Missing Information**: Check project structure and ADR completeness
- **Performance Issues**: Use caching and optimize queries

### Getting Help
- Check the [troubleshooting guide](./troubleshooting.md)
- Review [API reference](./reference/api-reference.md)
- Consult [developer guidance](./DEVELOPER_GUIDANCE.md)

## Next Steps

- [Interactive ADR Planning Guide](./interactive-adr-planning.md)
- [Research-Driven Workflow Guide](./research-driven-workflow.md)
- [Security Analysis Guide](./security-analysis.md)
- [API Reference](./reference/api-reference.md)

## Related Documentation

- [Research-Driven Architecture](./RESEARCH-DRIVEN-ARCHITECTURE.md)
- [Developer Guidance](./DEVELOPER_GUIDANCE.md)
- [User Guidance](./USER_GUIDANCE.md)
- [Testing Guide](./TESTING_GUIDE.md)
