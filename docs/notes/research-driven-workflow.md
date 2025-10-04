# Research-Driven MCP Tool Workflow

## Overview

The MCP ADR Analysis Server implements a **Research-Driven Architecture** that answers questions using cascading data sources instead of traditional RAG approaches. This workflow ensures accurate, up-to-date information by querying live environment resources.

## Core Philosophy

**Why Research-Driven vs RAG?**

| Aspect | RAG Approach | Research-Driven |
|--------|-------------|-----------------|
| **Data Source** | Static documents | Live runtime data |
| **Accuracy** | Can be outdated | Always current |
| **Setup Cost** | High (embeddings) | Low (auto-detect) |
| **Maintenance** | Document updates | Self-updating |
| **Architecture Fit** | Generic advice | Your specific infra |

## Research Source Hierarchy

The system follows a cascading approach, querying sources in order of reliability and speed:

```
Research Question
       ↓
1. 📁 PROJECT FILES (Local, Fast, Free)
   ├─ Code, configs, documentation
   ├─ Package manifests (package.json, requirements.txt, etc.)
   └─ Existing ADRs
       ↓ (If insufficient)
2. 🧠 KNOWLEDGE GRAPH (In-Memory, Instant)
   ├─ ADR relationships
   ├─ Technology decisions
   └─ Pattern usage records
       ↓ (If insufficient)
3. 🔧 ENVIRONMENT RESOURCES (Live Runtime Data)
   ├─ Kubernetes/OpenShift clusters
   ├─ Docker/Podman containers
   ├─ Operating system metrics
   ├─ Ansible inventories
   └─ Red Hat services
       ↓ (If insufficient)
4. 🌐 WEB SEARCH (External, Last Resort)
   └─ Only when confidence < 60%
```

## Complete Research Workflow

### Phase 1: Research Planning

#### 1.1 Generate Research Questions

Use the `generate_research_questions` tool to create a comprehensive research framework:

```json
{
  "tool": "generate_research_questions",
  "args": {
    "analysisType": "comprehensive",
    "researchContext": {
      "topic": "Container Orchestration Strategy",
      "category": "Infrastructure",
      "scope": "Production Deployment",
      "objectives": [
        "Evaluate current container orchestration approach",
        "Identify optimization opportunities",
        "Plan migration strategy if needed"
      ],
      "timeline": "2 weeks"
    },
    "projectPath": ".",
    "knowledgeEnhancement": true,
    "enhancedMode": true
  }
}
```

**Output**: Structured research questions, task tracking system, and documentation saved to `./research/`

#### 1.2 Research Question Types

The system generates different types of research questions:

- **Architectural Questions**: "What container orchestration platform are we using?"
- **Implementation Questions**: "How is our deployment pipeline configured?"
- **Optimization Questions**: "What are the performance bottlenecks in our current setup?"
- **Compliance Questions**: "Do our security practices align with industry standards?"

### Phase 2: Research Execution

#### 2.1 Perform Research

Use the `perform_research` tool to answer specific questions:

```json
{
  "tool": "perform_research",
  "args": {
    "question": "What container orchestration platform are we using?",
    "confidenceThreshold": 0.8,
    "performWebSearch": false,
    "projectPath": "."
  }
}
```

**Research Process**:
1. **Project Files Search** (<100ms)
   - Searches for Docker, Kubernetes, OpenShift configs
   - Analyzes package.json, requirements.txt for container references
   - Reviews existing ADRs for architectural decisions

2. **Knowledge Graph Query** (<50ms)
   - Queries in-memory ADR relationships
   - Checks technology decision history
   - Analyzes pattern usage records

3. **Environment Resources** (100-500ms)
   - Auto-detects available tools (kubectl, oc, docker, podman)
   - Queries live cluster information
   - Retrieves current deployment status

4. **Web Search** (1-3s, fallback only)
   - Only triggered if confidence < 60%
   - Provides external best practices and documentation

#### 2.2 Research Results Format

```json
{
  "content": [
    {
      "type": "text",
      "text": "# Research Results: What container orchestration platform are we using?\n\n## Summary\nKubernetes with OpenShift extensions detected in production environment.\n\n## Confidence Score: 95.0%\n\n## Sources Consulted\n\n### 📁 Project Files\n- **Confidence**: 90.0%\n- **Files Found**: 12\n- **Relevant Files**:\n  - `k8s/deployment.yaml` (relevance: 95%)\n  - `openshift/build-config.yaml` (relevance: 90%)\n  - `package.json` (relevance: 85%)\n\n### 🔧 Environment Resources\n- **Confidence**: 95.0%\n- **Available Capabilities**: kubernetes, openshift, docker\n- **Environment Data**:\n  - **kubernetes**: ✅ Data found\n  - **openshift**: ✅ Data found\n  - **docker**: ✅ Data found\n\n## Research Metadata\n- **Duration**: 245ms\n- **Sources Queried**: project-files, environment\n- **Files Analyzed**: 12\n- **Overall Confidence**: 95.0%\n\n## Next Steps\n✅ High confidence answer. You can proceed with this information.\n\n### Recommended Actions\n1. Review the identified project files for detailed implementation information\n2. Check for any related configuration files or documentation\n3. Consider creating or updating ADRs to document findings"
    }
  ]
}
```

### Phase 3: Research Integration

#### 3.1 Incorporate Research Findings

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

#### 3.2 Interactive ADR Planning

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

## Red Hat Ecosystem Support

### OpenShift Integration

The system provides first-class support for Red Hat OpenShift:

```typescript
// Auto-detects and queries:
// - oc CLI availability
// - Projects, pods, routes, builds
// - Deployment configs and build configs
// - Cluster version information
```

### Podman Support

```typescript
// Auto-detects and queries:
// - Podman runtime
// - Containers and pods (unique to Podman)
// - Images and networks
// - JSON output format support
```

### Ansible Integration

```typescript
// Auto-detects and queries:
// - Ansible installation
// - Inventories and hosts
// - Playbooks and roles
// - Version information
```

## Workflow Examples

### Example 1: Container Strategy Research

**Step 1: Generate Research Questions**
```bash
# Generate comprehensive research framework
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

**Step 2: Execute Research**
```bash
# Research specific questions
{
  "tool": "perform_research",
  "args": {
    "question": "What container orchestration platform are we using?",
    "confidenceThreshold": 0.8
  }
}
```

**Step 3: Integrate Findings**
```bash
# Incorporate research into ADRs
{
  "tool": "incorporate_research",
  "args": {
    "analysisType": "comprehensive",
    "researchFindings": [/* results from step 2 */]
  }
}
```

### Example 2: Security Analysis Research

**Step 1: Security Research Questions**
```bash
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
```bash
{
  "tool": "perform_research",
  "args": {
    "question": "What authentication and authorization mechanisms are implemented?",
    "confidenceThreshold": 0.7,
    "performWebSearch": true
  }
}
```

## Best Practices

### 1. Research Question Formulation

**Good Questions**:
- "What container orchestration platform are we using?"
- "How is our deployment pipeline configured?"
- "What authentication methods are implemented?"

**Poor Questions**:
- "How do I deploy this?" (too vague)
- "What's the best way to do X?" (opinion-based)
- "Can you help me with Y?" (not research-focused)

### 2. Confidence Thresholds

- **High (≥80%)**: Reliable answer from project sources
- **Moderate (60-79%)**: Good answer, may need validation
- **Low (<60%)**: Limited information, web search recommended

### 3. Research Documentation

- All research questions saved to `./research/`
- Research findings integrated into ADRs
- Progress tracked through research task system
- Quality assurance built into workflow

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

## Next Steps

1. **Start with Research Planning**: Use `generate_research_questions`
2. **Execute Research**: Use `perform_research` for specific questions
3. **Integrate Findings**: Use `incorporate_research` to update ADRs
4. **Plan Implementation**: Use `interactive_adr_planning` for guided ADR creation
5. **Track Progress**: Monitor research progress through task tracking system

## Related Documentation

- [Research-Driven Architecture](./RESEARCH-DRIVEN-ARCHITECTURE.md)
- [API Reference](.././reference/api-reference.md)
- [Interactive ADR Planning Guide](./interactive-adr-planning.md)
- [Research Integration Guide](./research-integration.md)
