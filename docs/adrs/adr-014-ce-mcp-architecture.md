# ADR-014: CE-MCP (Code Execution with MCP) Architecture

## Status

Proposed

## Date

2025-12-09

## Decision Makers

- Architecture Team
- AI Integration Team

## Context

The MCP ADR Analysis Server has evolved into a comprehensive platform with **82 tools** and **6,145 lines of prompt definitions**. Analysis of the current implementation (see `/tmp/ce_mcp_analysis.md`) reveals significant token inefficiencies:

| Metric                     | Current State           | Impact                      |
| -------------------------- | ----------------------- | --------------------------- |
| Tools loaded per ListTools | 82 complete definitions | ~15K tokens per call        |
| Prompt code loaded         | 6,145 lines             | ~28K tokens in memory       |
| Per-analysis overhead      | 9K-12K tokens           | Context assembly before LLM |
| AI call points             | 121+ instances          | Sequential dependencies     |

### Root Causes of Inefficiency

1. **Monolithic Tool Loading** (`src/index.ts:225-3170`): All 82 tools with full inputSchema returned on every ListTools call

2. **Context Over-Assembly** (`src/index.ts:4383-4830`): Sequential context building (knowledge → reflexion → base → environment) assembles 9,000+ tokens BEFORE any LLM call

3. **Intermediate Result Round-Trips**: Pattern of LLM call → embed result in context → LLM call causes token multiplication (3,500 optimal → 10,500 actual)

4. **Eager Prompt Loading**: All 10 prompt files imported when any tool uses prompts, only 10-15% utilized

### Protocol Evolution Context

- **November 2024**: MCP launched by Anthropic (direct tool-calling model)
- **2025**: CE-MCP paradigm introduced as recommended best practice
- **Key Shift**: LLM role changes from step-by-step planner to holistic code generator

## Decision

We will adopt the **CE-MCP (Code Execution with MCP) architecture** to address token inefficiencies through:

### 1. Progressive Tool Discovery

Replace monolithic tool loading with on-demand discovery:

```
Current: ListTools → 82 tools (15K tokens)
CE-MCP:  ListTools → 20 meta-tools (5K tokens) + search_tools() function
```

Implementation approach:

- Expose tools via file-based directory structure (`./servers/{category}/{tool}/action.ts`)
- Return tool metadata catalog instead of full definitions
- LLM requests specific tools on-demand via `search_tools(category, query)`

### 2. In-Sandbox Context Assembly

Shift context composition from tools to sandbox execution:

```
Current:
  Tool assembles context → Tool calls LLM → LLM returns result → Tool embeds in new context

CE-MCP:
  Tool returns composition directive → LLM orchestrates sandbox → Sandbox returns final result
```

Tools return composition directives:

```typescript
{
  "compose": {
    "sections": [
      { "source": "knowledge_generation", "key": "knowledge" },
      { "source": "file_analysis", "key": "files" },
      { "source": "environment_analysis", "key": "environment" }
    ],
    "template": "ecosystem_analysis_v2"
  }
}
```

### 3. Lazy Prompt Loading

Implement prompt registry with on-demand loading:

```
Current: import * from './prompts/' → 28K tokens loaded
CE-MCP:  Prompt catalog registered → load_prompt('adr_suggestion') → 500 tokens loaded
```

Prompt service architecture:

- Register prompt catalog with metadata (line count, category, dependencies)
- LLM requests specific prompts via `load_prompt(name, section)`
- Cache loaded prompts for session duration

### 4. Sandbox Data Composition

Eliminate recursive tool calls by keeping intermediate data in sandbox:

```
Current:
  analyzeProjectEcosystem()
    → calls analyzeEnvironment() [tool call]
    → embeds result in prompt [context bloat]
    → sends to LLM

CE-MCP:
  analyzeProjectEcosystem()
    → returns sandbox operations
    → LLM executes in sandbox
    → intermediate results stay in sandbox memory
    → only final summary returns to context
```

### 5. Stateful Tool Chains

Replace sequential LLM calls with state machine composition:

```
Current (rule generation):
  AI Call 1: templates → AI Call 2: validation → AI Call 3: refinement

CE-MCP:
  Return state machine definition
  LLM executes transitions in sandbox
  State passed through sandbox memory, not context
```

## Implementation Priorities

| Priority | Target                    | Current      | After        | Savings | Effort    |
| -------- | ------------------------- | ------------ | ------------ | ------- | --------- |
| P1       | `analyzeProjectEcosystem` | 12K tokens   | 4K tokens    | 67%     | 3-4 hours |
| P2       | Prompt service            | 28K loaded   | 1K on-demand | 96%     | 6-8 hours |
| P3       | Dynamic tool discovery    | 15K per call | 5K per call  | 67%     | 4-5 hours |
| P4       | Sandbox composition       | 8K overhead  | 2K overhead  | 75%     | 5-6 hours |

## Specific Code Locations for Refactoring

### High Priority

1. **analyzeProjectEcosystem main loop**
   - File: `src/index.ts:4383-4830`
   - Issue: Sequential context assembly
   - Fix: Return composition directives

2. **Prompt module organization**
   - Files: `src/prompts/*.ts`
   - Issue: Eager loading of 6,145 lines
   - Fix: Lazy-loading prompt registry

3. **Tool list in ListTools handler**
   - File: `src/index.ts:225-3170`
   - Issue: 82 complete tools returned
   - Fix: Return metadata + dynamic discovery

4. **Tool invocation switch statement**
   - File: `src/index.ts:3209-3409`
   - Issue: 82-case static routing
   - Fix: Dynamic tool dispatcher

### Medium Priority

5. **Environment analysis recursion** (`src/index.ts:4556-4577`)
6. **Knowledge context assembly** (`src/index.ts:4489-4519`)
7. **Rule generation tool chain** (`src/tools/rule-generation-tool.ts`)
8. **ADR suggestion enhancements** (`src/tools/adr-suggestion-tool.ts:95-200`)

## Consequences

### Positive

- **60-70% token reduction** in average tool execution cost
- **Faster response times** through fewer LLM roundtrips
- **Lower API costs** aligned with usage patterns
- **Better composability** with LLM-orchestrated tool chains
- **Improved maintainability** without context embedding logic
- **Alignment with Anthropic's recommended MCP best practices**

### Negative

- **Significant refactoring effort** (estimated 20-25 hours total)
- **Breaking changes** to tool invocation patterns
- **Learning curve** for new sandbox composition model
- **Testing complexity** for state machine tool chains
- **Migration period** where both patterns may coexist

### Risks

- Sandbox security requires careful process isolation
- State machine complexity may introduce debugging challenges
- Backward compatibility with existing clients during transition

## Compatibility with Existing ADRs

| ADR     | Relationship   | Notes                                                                                        |
| ------- | -------------- | -------------------------------------------------------------------------------------------- |
| ADR-001 | **Evolves**    | SSE/JSON-RPC remains transport; MCP's role shifts to RPC interface for code-executing agents |
| ADR-002 | **Evolves**    | LLM role shifts from step-by-step planner to holistic code generator                         |
| ADR-003 | **Compatible** | JSON storage, knowledge graph supports sandbox state management                              |
| ADR-010 | **Aligns**     | DAG executor already implements CE-MCP concepts (deterministic orchestration)                |
| ADR-012 | **Aligns**     | File-based YAML patterns match CE-MCP progressive discovery model                            |

## Related ADRs

- ADR-001: MCP Protocol Implementation Strategy (evolved by this ADR)
- ADR-002: AI Integration and Advanced Prompting Strategy (evolved by this ADR)
- ADR-010: Bootstrap Deployment Architecture (aligns with CE-MCP execution model)
- ADR-012: Validated Patterns Framework (aligns with progressive discovery)

## References

- CE-MCP Refactoring Assessment: `/tmp/ce_mcp_analysis.md`
- Anthropic MCP Documentation: Protocol evolution and best practices
- Token optimization research: 2025 CE-MCP paradigm studies
