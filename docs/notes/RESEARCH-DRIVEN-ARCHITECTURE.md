# Research-Driven Architecture

## Overview

The MCP ADR Analysis Server now includes a **Research-Driven Architecture** that answers research questions using cascading sources instead of relying on RAG (Retrieval-Augmented Generation) with vector databases.

## Architecture Principles

### Cascading Research Source Hierarchy

```
Research Question
       ↓
1. PROJECT FILES (Local, Fast, Free)
   ├─ Code, configs, documentation
   ├─ Package manifests (package.json, requirements.txt, etc.)
   └─ Existing ADRs
       ↓ (If insufficient)
2. KNOWLEDGE GRAPH (In-Memory, Instant)
   ├─ ADR relationships
   ├─ Technology decisions
   └─ Pattern usage records
       ↓ (If insufficient)
3. ENVIRONMENT RESOURCES (Live Runtime Data)
   ├─ Kubernetes/OpenShift clusters
   ├─ Docker/Podman containers
   ├─ Operating system metrics
   ├─ Ansible inventories
   └─ Red Hat services
       ↓ (If insufficient)
4. WEB SEARCH (External, Last Resort)
   └─ Only when confidence < 60%
```

## Core Components

### 1. ResearchOrchestrator (`src/utils/research-orchestrator.ts`)

The main coordinator that:
- Manages the cascading search through all sources
- Calculates confidence scores
- Determines when web search is needed
- Synthesizes answers from multiple sources

**Key Methods:**
- `answerResearchQuestion(question: string)` - Main entry point
- `setConfidenceThreshold(threshold: number)` - Configure fallback threshold

### 2. EnvironmentCapabilityRegistry (`src/utils/environment-capability-registry.ts`)

Auto-detects and queries runtime environment resources:
- **Operating System**: CPU, memory, disk, network info
- **Docker**: Containers, images, networks, volumes
- **Podman** (Red Hat): Pods, containers, images
- **Kubernetes**: Pods, deployments, services, nodes
- **OpenShift** (Red Hat): Projects, routes, builds, deployment configs
- **Ansible** (Red Hat): Inventories, playbooks, roles

**Key Methods:**
- `discoverCapabilities()` - Auto-detect available resources
- `query(question: string)` - Query relevant capabilities
- `listCapabilities()` - Get available capability names

### 3. PerformResearchTool (`src/tools/perform-research-tool.ts`)

MCP tool interface for research operations:
```typescript
{
  "tool": "perform_research",
  "args": {
    "question": "What container orchestration are we using?",
    "confidenceThreshold": 0.6,
    "performWebSearch": true
  }
}
```

## Red Hat Support

The system includes first-class support for Red Hat projects and tooling:

### OpenShift

- Detects `oc` CLI availability
- Queries projects, pods, routes, builds
- Retrieves deployment configs and build configs
- Provides cluster version information

### Podman

- Detects Podman runtime
- Queries containers and pods (unique to Podman)
- Retrieves images and networks
- Supports JSON output format

### Ansible

- Detects Ansible installation
- Queries inventories and hosts
- Locates playbooks and roles
- Provides version information

## Usage Examples

### Basic Research Query

```typescript
const research = await orchestrator.answerResearchQuestion(
  "What container technology are we using?"
);

console.log(research.answer);
console.log(`Confidence: ${research.confidence}`);
console.log(`Sources: ${research.sources.map(s => s.type).join(', ')}`);
```

### Project File Search

```typescript
// Automatically searches for:
// - Dockerfile, docker-compose.yml
// - Kubernetes manifests (*.yaml in k8s/)
// - OpenShift configs (*.yaml in openshift/)
// - Package files (package.json, requirements.txt, etc.)
// - ADRs (*.md in ././adrs/)
```

### Environment Queries

```typescript
// Detects and queries:
// - kubectl (if Kubernetes is available)
// - oc (if OpenShift is available)
// - docker ps (if Docker is running)
// - podman ps (if Podman is running)
// - ansible --version (if Ansible is installed)
```

### Confidence-Based Fallback

```typescript
const research = await orchestrator.answerResearchQuestion(
  "What's the best way to deploy this application?"
);

if (research.confidence < 0.6) {
  console.log("Low confidence - web search recommended");
  console.log(research.needsWebSearch); // true
}
```

## Benefits vs RAG

| Aspect | RAG Approach | Research-Driven |
|--------|-------------|-----------------|
| **Data Source** | Static documents | Live runtime data |
| **Accuracy** | Can be outdated | Always current |
| **Setup Cost** | High (embeddings) | Low (auto-detect) |
| **Maintenance** | Document updates | Self-updating |
| **LLM Requirements** | Good reasoning | Works with small LLMs |
| **Architecture Fit** | Generic advice | Your specific infra |

## Configuration

### Confidence Threshold

```typescript
orchestrator.setConfidenceThreshold(0.7); // 70% minimum before web search
```

### Environment Detection

The system automatically detects available capabilities on startup:

```
✅ Capability registered: operating-system
✅ Capability registered: docker
✅ Capability registered: kubernetes
✅ Capability registered: openshift
❌ Capability not available: podman
✅ Capability registered: ansible
```

## Performance

- **Project file search**: <100ms (typical)
- **Knowledge graph query**: <50ms (in-memory)
- **Environment query**: 100-500ms (depends on resources)
- **Web search**: 1-3s (external, fallback only)
- **Cached results**: <10ms (instant retrieval)

**Caching**: Research results are automatically cached for 5 minutes to improve performance for repeated queries.

## Future Enhancements

1. **Cloud Provider Integration**
   - AWS (ECS, EKS, EC2)
   - Azure (AKS, Container Instances)
   - GCP (GKE, Cloud Run)

2. **Database Capabilities**
   - PostgreSQL introspection
   - MongoDB queries
   - Redis info

3. **API Capabilities**
   - REST endpoint discovery
   - GraphQL schema inspection
   - gRPC service discovery

4. **Smart Caching**
   - Cache environment queries
   - Invalidate on detected changes
   - TTL-based refresh

## Testing

Run the research system tests:

```bash
npm test -- research-orchestrator
npm test -- environment-capability-registry
npm test -- perform-research-tool
```

## Troubleshooting

### No Environment Capabilities Detected

```typescript
// Check what's available
const registry = new EnvironmentCapabilityRegistry();
await registry.discoverCapabilities();
console.log(registry.listCapabilities());
```

### Low Confidence Answers

- Check if relevant project files exist
- Verify environment tools are installed (kubectl, docker, etc.)
- Consider running with web search enabled
- Review ADRs for architectural context

### Capability Detection Fails

Ensure tools are in PATH:
```bash
which kubectl
which oc
which docker
which podman
which ansible
```

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────┐
│                   Research Question                     │
└───────────────────┬─────────────────────────────────────┘
                    │
                    ▼
┌───────────────────────────────────────────────────────┐
│             ResearchOrchestrator                      │
│                                                       │
│  ┌──────────────┐  ┌──────────────┐  ┌────────────┐ │
│  │ Project File │  │ Knowledge    │  │ Environment││
│  │ Searcher     │  │ Graph Manager│  │ Registry   ││
│  └──────────────┘  └──────────────┘  └────────────┘ │
└───────────────────────────────────────────────────────┘
                    │
                    ▼
┌───────────────────────────────────────────────────────┐
│              Synthesized Answer                       │
│  ┌────────────────────────────────────────────┐       │
│  │ • Sources consulted                        │       │
│  │ • Confidence score                         │       │
│  │ • Web search recommendation                │       │
│  │ • Metadata (duration, files analyzed)      │       │
│  └────────────────────────────────────────────┘       │
└───────────────────────────────────────────────────────┘
```

## Contributing

To add a new environment capability:

1. Implement the `EnvironmentCapability` interface
2. Add detection logic in `detector()` function
3. Implement query logic in `executor()` function
4. Register in `EnvironmentCapabilityRegistry.discoverCapabilities()`

Example:

```typescript
{
  name: 'my-capability',
  type: 'custom',
  detector: async () => {
    try {
      await execAsync('my-tool --version');
      return true;
    } catch {
      return false;
    }
  },
  executor: async (query) => {
    // Query logic here
    return { ... };
  }
}
```

## License

Same as parent project (check root ../../LICENSE file).