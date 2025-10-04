# User Guidance: Research-Driven MCP Tools

## Overview

This guide helps users understand and effectively use the research-driven MCP tools to answer questions about their projects using live, up-to-date information from their actual infrastructure.

## Quick Start

### 1. Ask a Research Question

Start with a simple question about your project:

```json
{
  "tool": "perform_research",
  "args": {
    "question": "What container orchestration platform are we using?"
  }
}
```

### 2. Understand the Response

The system will provide:
- **Summary**: Direct answer to your question
- **Confidence Score**: How reliable the answer is (0-100%)
- **Sources Consulted**: What information sources were used
- **Next Steps**: Recommendations based on the findings

### 3. Follow Up with More Research

Based on the initial findings, ask follow-up questions:

```json
{
  "tool": "perform_research",
  "args": {
    "question": "How is our deployment pipeline configured?",
    "confidenceThreshold": 0.8
  }
}
```

## Research Workflow

### Phase 1: Research Planning

#### Generate Research Questions

Before diving into specific questions, generate a comprehensive research framework:

```json
{
  "tool": "generate_research_questions",
  "args": {
    "analysisType": "comprehensive",
    "researchContext": {
      "topic": "Container Strategy",
      "category": "Infrastructure",
      "scope": "Production Deployment",
      "objectives": [
        "Evaluate current container orchestration approach",
        "Identify optimization opportunities",
        "Plan migration strategy if needed"
      ],
      "timeline": "2 weeks"
    }
  }
}
```

**What this does**:
- Creates structured research questions
- Saves research plan to `./research/`
- Provides task tracking system
- Generates context-aware questions

#### Research Question Types

The system generates different types of questions:

1. **Architectural Questions**: "What container orchestration platform are we using?"
2. **Implementation Questions**: "How is our deployment pipeline configured?"
3. **Optimization Questions**: "What are the performance bottlenecks in our current setup?"
4. **Compliance Questions**: "Do our security practices align with industry standards?"

### Phase 2: Research Execution

#### Perform Research

Use the `perform_research` tool to answer specific questions:

```json
{
  "tool": "perform_research",
  "args": {
    "question": "What authentication methods are implemented?",
    "confidenceThreshold": 0.7,
    "performWebSearch": true
  }
}
```

**Parameters**:
- `question` (required): The research question to investigate
- `confidenceThreshold` (optional): Minimum confidence for results (0-1, default: 0.6)
- `performWebSearch` (optional): Enable web search as fallback (default: true)
- `projectPath` (optional): Path to project root (default: current directory)
- `adrDirectory` (optional): ADR directory relative to project (default: './adrs')

#### Understanding Research Results

**High Confidence (≥80%)**:
- Reliable answer from project sources
- You can proceed with this information
- No additional research needed

**Moderate Confidence (60-79%)**:
- Good answer, may need validation
- Consider checking additional sources
- Review the identified files for details

**Low Confidence (<60%)**:
- Limited information available
- Web search recommended
- Consider manual research

#### Research Sources

The system queries sources in this order:

1. **📁 Project Files** (Local, Fast, Free)
   - Code, configs, documentation
   - Package manifests (package.json, requirements.txt, etc.)
   - Existing ADRs

2. **🧠 Knowledge Graph** (In-Memory, Instant)
   - ADR relationships
   - Technology decisions
   - Pattern usage records

3. **🔧 Environment Resources** (Live Runtime Data)
   - Kubernetes/OpenShift clusters
   - Docker/Podman containers
   - Operating system metrics
   - Ansible inventories

4. **🌐 Web Search** (External, Last Resort)
   - Only when confidence < 60%
   - Provides external best practices and documentation

### Phase 3: Research Integration

#### Incorporate Research Findings

Use the `incorporate_research` tool to integrate findings into ADRs:

```json
{
  "tool": "incorporate_research",
  "args": {
    "analysisType": "comprehensive",
    "researchPath": "./research",
    "adrDirectory": "./adrs",
    "researchFindings": [
      {
        "finding": "Kubernetes with OpenShift extensions in use",
        "evidence": ["k8s/deployment.yaml", "openshift/build-config.yaml"],
        "impact": "High - affects deployment strategy decisions"
      }
    ]
  }
}
```

#### Interactive ADR Planning

Use the `interactive_adr_planning` tool for guided ADR creation:

```json
{
  "tool": "interactive_adr_planning",
  "args": {
    "projectPath": ".",
    "adrDirectory": "./adrs",
    "problemStatement": "Need to document our container orchestration strategy",
    "researchFindings": [
      {
        "source": "perform_research",
        "insight": "Kubernetes with OpenShift extensions detected",
        "relevance": "Critical for architectural documentation"
      }
    ]
  }
}
```

## Best Practices

### 1. Formulating Good Research Questions

**Good Questions**:
- "What container orchestration platform are we using?"
- "How is our deployment pipeline configured?"
- "What authentication methods are implemented?"
- "What are the performance bottlenecks in our current setup?"

**Poor Questions**:
- "How do I deploy this?" (too vague)
- "What's the best way to do X?" (opinion-based)
- "Can you help me with Y?" (not research-focused)

### 2. Using Confidence Thresholds

**High Threshold (0.8-0.9)**:
- Use when you need very reliable information
- Good for critical architectural decisions
- May require more research if threshold not met

**Medium Threshold (0.6-0.7)**:
- Good balance of reliability and coverage
- Default for most research questions
- Provides web search fallback when needed

**Low Threshold (0.4-0.5)**:
- Use when you want maximum coverage
- Good for exploratory research
- Will include more speculative information

### 3. Research Documentation

- All research questions are automatically saved to `./research/`
- Research findings are integrated into ADRs
- Progress is tracked through the research task system
- Quality assurance is built into the workflow

## Common Use Cases

### 1. Container Strategy Research

**Step 1: Generate Research Framework**
```json
{
  "tool": "generate_research_questions",
  "args": {
    "analysisType": "comprehensive",
    "researchContext": {
      "topic": "Container Strategy",
      "category": "Infrastructure",
      "scope": "Production",
      "objectives": ["Evaluate current approach", "Identify improvements"]
    }
  }
}
```

**Step 2: Research Specific Questions**
```json
{
  "tool": "perform_research",
  "args": {
    "question": "What container orchestration platform are we using?",
    "confidenceThreshold": 0.8
  }
}
```

**Step 3: Integrate Findings**
```json
{
  "tool": "incorporate_research",
  "args": {
    "analysisType": "comprehensive",
    "researchFindings": [/* results from step 2 */]
  }
}
```

### 2. Security Analysis Research

**Step 1: Security Research Questions**
```json
{
  "tool": "generate_research_questions",
  "args": {
    "analysisType": "comprehensive",
    "researchContext": {
      "topic": "Security Practices",
      "category": "Security",
      "scope": "Application Security",
      "objectives": ["Assess current security", "Identify gaps", "Plan improvements"]
    }
  }
}
```

**Step 2: Security Research Execution**
```json
{
  "tool": "perform_research",
  "args": {
    "question": "What authentication and authorization mechanisms are implemented?",
    "confidenceThreshold": 0.7,
    "performWebSearch": true
  }
}
```

### 3. Performance Optimization Research

**Step 1: Performance Research Framework**
```json
{
  "tool": "generate_research_questions",
  "args": {
    "analysisType": "comprehensive",
    "researchContext": {
      "topic": "Performance Optimization",
      "category": "Performance",
      "scope": "Application Performance",
      "objectives": ["Identify bottlenecks", "Plan optimizations", "Measure improvements"]
    }
  }
}
```

**Step 2: Performance Research Execution**
```json
{
  "tool": "perform_research",
  "args": {
    "question": "What are the performance bottlenecks in our current setup?",
    "confidenceThreshold": 0.6,
    "performWebSearch": true
  }
}
```

## Red Hat Ecosystem Support

### OpenShift Integration

The system provides first-class support for Red Hat OpenShift:

- Auto-detects `oc` CLI availability
- Queries projects, pods, routes, builds
- Retrieves deployment configs and build configs
- Provides cluster version information

### Podman Support

- Auto-detects Podman runtime
- Queries containers and pods (unique to Podman)
- Retrieves images and networks
- Supports JSON output format

### Ansible Integration

- Auto-detects Ansible installation
- Queries inventories and hosts
- Locates playbooks and roles
- Provides version information

## Troubleshooting

### Low Confidence Answers

1. **Check Project Files**: Ensure relevant configs exist
2. **Verify Environment Tools**: Check if kubectl, docker, etc. are available
3. **Enable Web Search**: Set `performWebSearch: true`
4. **Review ADRs**: Check for existing architectural context

### Environment Detection Issues

```bash
# Verify tools are in PATH
which kubectl
which oc
which docker
which podman
which ansible
```

### Research Integration Problems

1. **Check Research Directory**: Ensure `./research/` exists
2. **Verify ADR Directory**: Check `././adrs/` structure
3. **Review Research Findings**: Ensure findings are properly formatted

## Performance Expectations

- **Project file search**: <100ms (typical)
- **Knowledge graph query**: <50ms (in-memory)
- **Environment query**: 100-500ms (depends on resources)
- **Web search**: 1-3s (external, fallback only)
- **Cached results**: <10ms (instant retrieval)

**Caching**: Research results are automatically cached for 5 minutes to improve performance for repeated queries.

## Advanced Usage

### 1. Custom Research Contexts

Create custom research contexts for specific domains:

```json
{
  "tool": "generate_research_questions",
  "args": {
    "analysisType": "comprehensive",
    "researchContext": {
      "topic": "Microservices Architecture",
      "category": "Architecture",
      "scope": "Service Communication",
      "objectives": [
        "Analyze current service communication patterns",
        "Identify coupling issues",
        "Plan service mesh implementation"
      ],
      "constraints": ["Budget: $50k", "Timeline: 3 months"],
      "timeline": "3 months"
    }
  }
}
```

### 2. Research Question Tracking

Monitor research progress through the task tracking system:

```json
{
  "tool": "generate_research_questions",
  "args": {
    "analysisType": "tracking",
    "researchQuestions": [
      {
        "id": "research-001",
        "question": "What container orchestration platform are we using?",
        "status": "completed",
        "progress": 100,
        "findings": ["Kubernetes with OpenShift extensions detected"],
        "blockers": []
      }
    ]
  }
}
```

### 3. Research Integration Patterns

Use research integration for different types of updates:

```json
{
  "tool": "incorporate_research",
  "args": {
    "analysisType": "evaluate_impact",
    "researchFindings": [
      {
        "finding": "New security vulnerability identified",
        "evidence": ["security-scan-results.json", "vulnerability-report.md"],
        "impact": "Critical - requires immediate attention"
      }
    ],
    "updateType": "consequences"
  }
}
```

## Getting Help

### 1. Documentation Resources

- [Research-Driven Architecture](./RESEARCH-DRIVEN-ARCHITECTURE.md)
- [API Reference](./reference/api-reference.md)
- [Research Workflow Guide](./how-to-guides/research-driven-workflow.md)
- [Developer Guidance](./DEVELOPER_GUIDANCE.md)

### 2. Common Issues

- **No environment capabilities detected**: Check if tools are in PATH
- **Low confidence answers**: Enable web search or check project files
- **Research integration fails**: Verify directory structure and permissions

### 3. Best Practices

- Start with research planning before execution
- Use appropriate confidence thresholds for your needs
- Document research findings in ADRs
- Follow up on low-confidence answers with additional research

## Next Steps

1. **Start with Research Planning**: Use `generate_research_questions`
2. **Execute Research**: Use `perform_research` for specific questions
3. **Integrate Findings**: Use `incorporate_research` to update ADRs
4. **Plan Implementation**: Use `interactive_adr_planning` for guided ADR creation
5. **Track Progress**: Monitor research progress through task tracking system

## Related Documentation

- [Research-Driven Architecture](./RESEARCH-DRIVEN-ARCHITECTURE.md)
- [API Reference](./reference/api-reference.md)
- [Research Workflow Guide](./how-to-guides/research-driven-workflow.md)
- [Developer Guidance](./DEVELOPER_GUIDANCE.md)
- [Interactive ADR Planning Guide](./how-to-guides/interactive-adr-planning.md)
- [Research Integration Guide](./how-to-guides/research-integration.md)
