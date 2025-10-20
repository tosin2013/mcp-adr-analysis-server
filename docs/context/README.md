# Tool Context Documentation System

## Overview

The Tool Context Documentation System preserves valuable execution results, decisions, and learnings from tool runs as persistent markdown documents. These documents can be referenced in future sessions to maintain consistency, avoid re-work, and provide context across long-running projects.

## Purpose

When tools like `bootstrap_validation_loop`, `deployment_readiness`, or `perform_research` run, they generate valuable context including:

- Platform detection results
- Validated patterns and deployment strategies
- Environment-specific configurations
- Research findings and cached results
- Architectural decisions and their rationale
- Execution learnings (successes, failures, recommendations)

Without persistent context documents, this information is lost after the session ends, forcing developers and AI assistants to:

- Re-discover platform and environment details
- Re-research the same questions
- Risk inconsistent decisions across sessions
- Lose valuable learnings from previous executions

## How It Works

### Context Document Generation

Tools automatically generate context documents during execution using the `ToolContextManager` utility. Each document follows a standardized structure:

```markdown
# Tool Context: {Tool Name}

> **Generated**: {ISO timestamp}
> **Tool Version**: {version}
> **Project**: {project name}

## Quick Reference

Brief summary for immediate use

## Execution Summary

- Status, confidence, key findings

## Detected Context

Platform, environment, technology details

## Generated Artifacts

Files, ADRs, configs created

## Key Decisions

Architectural and deployment decisions

## Learnings & Recommendations

Successes, failures, recommendations

## Usage in Future Sessions

How to reference this context
```

### Storage Structure

Context documents are organized by category in `docs/context/`:

```
docs/context/
├── README.md (this file)
├── bootstrap/
│   ├── latest.md                          # Always points to most recent
│   ├── bootstrap-validation-2025-01-19.md # Timestamped execution
│   └── bootstrap-validation-2025-01-15.md # Historical context
├── deployment/
│   ├── latest.md
│   └── readiness-check-2025-01-19.md
├── environment/
│   ├── latest.md
│   └── analysis-2025-01-18.md
├── research/
│   ├── latest.md
│   ├── openshift-patterns-2025-01-19.md
│   └── kubernetes-research-2025-01-17.md
├── planning/
│   ├── latest.md
│   └── architecture-session-2025-01-16.md
└── validation/
    ├── latest.md
    └── adr-validation-2025-01-18.md
```

### Categories

| Category      | Description                                                  | Example Tools                             |
| ------------- | ------------------------------------------------------------ | ----------------------------------------- |
| `bootstrap`   | Platform detection, validated patterns, deployment plans     | bootstrap_validation_loop                 |
| `deployment`  | Deployment readiness, analysis, execution results            | deployment_readiness, deployment_analysis |
| `environment` | Environment configuration, tool detection, capabilities      | environment_analysis                      |
| `research`    | Research findings, cached results, technology decisions      | perform_research, research_integration    |
| `planning`    | Planning sessions, architectural options, trade-offs         | interactive_adr_planning                  |
| `validation`  | Validation results, compliance checks, quality scores        | adr_validation                            |
| `git`         | Git workflow patterns, commit conventions, branch strategies | smart_git_push                            |

## Usage Patterns

### Pattern 1: Starting a New Session with Context

**Without Context**:

```
User: "Continue the OpenShift deployment"
AI: "Let me detect your platform and analyze your project..."
[Re-runs detection, re-researches, loses previous decisions]
```

**With Context**:

```
User: "Using the context from docs/context/bootstrap/latest.md,
continue the OpenShift deployment"

AI: [Reads context]
"I see from the bootstrap context that:
- Platform: OpenShift (95% confidence)
- Validated pattern: Multicluster GitOps v2.0
- Bootstrap ADR: docs/adrs/bootstrap-deployment-1234.md
- Last execution: Phase 2 complete, Phase 3 pending

Continuing with Phase 3: Deployment Validation..."
```

### Pattern 2: Referencing Context in Prompts

**For AI Assistants**:

```
"Before generating the deployment plan, read the bootstrap context
from docs/context/bootstrap/latest.md to understand the detected
platform and validated pattern."
```

**For Developers**:

```bash
# Check what was previously detected
cat docs/context/bootstrap/latest.md

# Find specific research results
grep -r "Firebase" docs/context/research/

# Compare current vs previous deployment
diff docs/context/deployment/latest.md \
     docs/context/deployment/readiness-check-2025-01-15.md
```

### Pattern 3: Onboarding New Team Members

New developers can quickly understand project-specific patterns:

1. Read `docs/context/README.md` - Understanding the context system
2. Read `docs/context/bootstrap/latest.md` - Current deployment approach
3. Read `docs/context/environment/latest.md` - Environment setup
4. Read relevant ADRs linked in context docs

### Pattern 4: CI/CD Pipeline Consistency

CI/CD pipelines can reference context for consistent deployments:

```yaml
# .github/workflows/deploy.yml
- name: Use Bootstrap Context
  run: |
    echo "Using context from docs/context/bootstrap/latest.md"
    # Extract deployment configuration from context

- name: Deploy
  run: ./bootstrap.sh
```

## Referencing Context Documents

### In AI Prompts

**Claude / GPT-4**:

```
System instructions or prompt:
"When working on deployment tasks, always check:
1. docs/context/bootstrap/latest.md - Platform and deployment context
2. docs/context/environment/latest.md - Environment configuration
3. docs/context/research/latest.md - Research findings

Use this context to inform decisions and maintain consistency."
```

**Gemini** (limited context window):

```
"Before answering, read these context documents:
- docs/context/bootstrap/latest.md
- docs/context/environment/latest.md

Then proceed with the task using the information from these documents."
```

### In Code and Scripts

```typescript
import { ToolContextManager } from './utils/context-document-manager';

const contextManager = new ToolContextManager(projectPath);

// Load latest bootstrap context
const contexts = await contextManager.listContexts('bootstrap');
const latestContext = contexts[0]; // Most recent

// Reference in decision-making
console.log(`Using platform from context: ${latestContext}`);
```

## Retention Policy

- **latest.md**: Always points to the most recent context for that category
- **Historical**: Last 10 executions per category are kept by default
- **Archive**: Older contexts can be moved to `archive/` subdirectory
- **Cleanup**: Use `cleanupOldContexts()` method to prune old contexts

```typescript
// Clean up old contexts, keeping last 10
await contextManager.cleanupOldContexts('bootstrap', 10);
```

## Benefits

### For Developers

- ✅ **Faster onboarding** - Context docs provide project-specific knowledge
- ✅ **Consistent decisions** - Reference previous validated patterns
- ✅ **Reduced re-work** - Avoid re-discovering platform, environment, configs
- ✅ **Better troubleshooting** - Historical context for debugging
- ✅ **Knowledge preservation** - Decisions and learnings persist beyond individual sessions

### For AI Assistants

- ✅ **Context preservation** - Overcome limited context windows
- ✅ **Decision consistency** - Maintain architectural alignment across sessions
- ✅ **Reduced hallucination** - Ground decisions in documented context
- ✅ **Faster execution** - Skip re-analysis, use cached research
- ✅ **Continuity** - Pick up exactly where previous session left off

### For Teams

- ✅ **Knowledge sharing** - Context docs are team knowledge base
- ✅ **Audit trail** - Historical decisions and their rationale
- ✅ **Compliance** - Document deployment decisions for governance
- ✅ **Collaboration** - Shared understanding of project state

## Examples

### Bootstrap Context Example

See a complete example in the design document: `docs/how-to-guides/tool-context-documentation-plan.md`

A typical bootstrap context document includes:

- Detected platform (OpenShift, Kubernetes, Docker, etc.)
- Validated pattern selection (Multicluster GitOps, etc.)
- Authoritative sources consulted
- Deployment plan with required files and steps
- Environment configuration
- Generated artifacts (ADRs, scripts)
- Key decisions and their rationale

### Research Context Example

Research context documents capture:

- Research question asked
- Sources consulted (documentation, GitHub, Stack Overflow)
- Research findings with confidence scores
- Technology decisions based on research
- Cached results for future reference

## Best Practices

1. **Always check for existing context** before starting analysis or research
2. **Reference context in prompts** to maintain consistency
3. **Update context after significant changes** to keep it current
4. **Link related contexts** in the relatedDocuments section
5. **Use descriptive quick references** for easy scanning
6. **Include confidence scores** for transparency
7. **Document learnings** - both successes and failures
8. **Keep rawData optional** - only include when needed for debugging

## Tools That Generate Context

| Tool                      | Context Category | Generated Document                                       |
| ------------------------- | ---------------- | -------------------------------------------------------- |
| bootstrap_validation_loop | bootstrap        | Platform detection, validated patterns, deployment plans |
| deployment_readiness      | deployment       | Readiness assessment, blockers, compliance checks        |
| deployment_analysis       | deployment       | Current state analysis, optimizations                    |
| environment_analysis      | environment      | Environment config, tools, capabilities                  |
| perform_research          | research         | Research findings, cached results, decisions             |
| interactive_adr_planning  | planning         | Planning decisions, options considered, trade-offs       |
| adr_validation            | validation       | Validation results, quality scores, recommendations      |
| smart_git_push            | git              | Git workflow patterns, conventions, push validation      |

## Troubleshooting

### Context document not found

```bash
# List all contexts in a category
ls -la docs/context/bootstrap/

# Check if category directory exists
ls -la docs/context/
```

### Context is outdated

```bash
# View all contexts sorted by date
ls -lt docs/context/bootstrap/

# Compare with current project state
cat docs/context/bootstrap/latest.md
```

### Too many old contexts

```bash
# Clean up old contexts (manual)
cd docs/context/bootstrap
ls -t | tail -n +11 | xargs rm

# Or use the cleanup method in code
await contextManager.cleanupOldContexts('bootstrap', 10);
```

## Future Enhancements

### Planned Features (v2.0)

- **Semantic search** across all context documents
- **Context diff tool** for visual comparison
- **Context validation** to ensure docs match current project state
- **Auto-expiration** based on relevance, not just age

### Future Vision (v3.0)

- **Context graph** showing relationships between contexts, ADRs, and code
- **AI-powered summarization** of context documents
- **Context recommendations** suggesting relevant docs for current task
- **Cross-project context** sharing validated patterns across multiple projects

## Contributing

To add context generation to a new tool:

1. Import `ToolContextManager`
2. Create context document after tool execution
3. Save to appropriate category
4. Return context path in tool results
5. Document in this README

See the implementation plan in `docs/how-to-guides/tool-context-documentation-plan.md` for detailed guidance.

---

**Need help?** See the [Tool Context Documentation Plan](../how-to-guides/tool-context-documentation-plan.md) for complete implementation details.
