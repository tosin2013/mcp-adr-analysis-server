---
title: CE-MCP Migration Playbook
sidebar_label: CE-MCP Migration
description: Step-by-step guide for migrating tools from OpenRouter-based execution to CE-MCP directive architecture.
---

# CE-MCP Migration Playbook

This guide documents the process for migrating tools from legacy OpenRouter-based execution to CE-MCP (Claude-Enriched Model Context Protocol) directive-based architecture.

## Overview

CE-MCP migration converts tools from direct AI execution to orchestration directive returns, achieving:

- **60-70% token reduction** across tool calls
- **Elimination of intermediate LLM calls**
- **Improved composability** with host LLM
- **Standardized sandbox operations**

## Migration Pattern

### Before: Legacy Tool

```typescript
// Legacy: Direct AI execution
async function analyzeProjectLegacy(args: AnalyzeArgs): Promise<ToolResult> {
  // 1. Eager context assembly (~9K tokens)
  const knowledge = await generateArchitecturalKnowledge();
  const memories = await retrieveRelevantMemories();
  const structure = await analyzeProjectStructure();
  const environment = await analyzeEnvironment();

  // 2. Direct OpenRouter call
  const result = await aiExecutor.execute({
    prompt: buildAnalysisPrompt(knowledge, memories, structure, environment),
    // Total: ~12K tokens per call
  });

  return { content: [{ type: 'text', text: result }] };
}
```

### After: CE-MCP Directive

```typescript
// CE-MCP: Return orchestration directive
function createAnalyzeProjectDirective(args: AnalyzeArgs): OrchestrationDirective {
  return {
    type: 'orchestration_directive',
    version: '1.0',
    tool: 'analyze_project',
    description: 'Comprehensive project analysis',
    sandbox_operations: [
      { op: 'analyzeFiles', args: { patterns: ['**/*.ts'] }, store: 'files' },
      { op: 'scanEnvironment', store: 'environment' },
      { op: 'loadKnowledge', args: { domain: 'architecture' }, store: 'knowledge' },
      { op: 'loadPrompt', args: { name: 'analysis' }, store: 'prompt' },
      {
        op: 'composeResult',
        inputs: ['files', 'environment', 'knowledge', 'prompt'],
        return: true,
      },
    ],
    metadata: {
      estimated_tokens: 4000, // Down from ~12K
      cacheable: true,
    },
  };
}
```

## Step-by-Step Migration Process

### Step 1: Identify Tool Complexity

Categorize your tool:

| Category    | Characteristics            | Directive Type           |
| ----------- | -------------------------- | ------------------------ |
| **Simple**  | Single operation, no state | `OrchestrationDirective` |
| **Medium**  | 2-3 sequential operations  | `OrchestrationDirective` |
| **Complex** | Multi-step with branching  | `StateMachineDirective`  |

### Step 2: Map Operations to Sandbox Operations

Available sandbox operations:

```typescript
type SandboxOperationType =
  | 'loadKnowledge' // Load domain knowledge
  | 'loadPrompt' // Lazy load prompts
  | 'analyzeFiles' // Scan project files
  | 'scanEnvironment' // Read environment config
  | 'generateContext' // Build combined context
  | 'validateOutput' // Validate results
  | 'cacheResult' // Cache for reuse
  | 'retrieveCache' // Retrieve cached data
  | 'composeResult'; // Final composition
```

### Step 3: Create Directive Function

For **OrchestrationDirective** (simple/medium tools):

```typescript
export function createMyToolDirective(args: MyToolArgs): OrchestrationDirective {
  return {
    type: 'orchestration_directive',
    version: '1.0',
    tool: 'my_tool',
    description: 'Tool description',
    sandbox_operations: [
      // Map legacy operations to sandbox ops
    ],
    metadata: {
      estimated_tokens: 1500, // Target token count
      cacheable: true,
      cache_key: `my-tool:${args.projectPath}`,
    },
  };
}
```

For **StateMachineDirective** (complex tools):

```typescript
export function createMyComplexToolDirective(args: MyToolArgs): StateMachineDirective {
  return {
    type: 'state_machine_directive',
    version: '1.0',
    initial_state: { ...args },
    transitions: [
      {
        name: 'step_1',
        from: 'initial',
        operation: { op: 'loadKnowledge' },
        next_state: 'step_2',
        on_error: 'skip', // or 'abort' for critical steps
      },
      // Additional transitions...
    ],
    final_state: 'done',
  };
}
```

### Step 4: Register with CE-MCP Dispatcher

Add to `src/tools/ce-mcp-tools.ts`:

```typescript
// 1. Add to cemcpTools list
const cemcpTools = [
  'analyze_project_ecosystem',
  'suggest_adrs',
  'my_tool', // Add your tool
  // ...
];

// 2. Add case to getCEMCPDirective
export function getCEMCPDirective(toolName: string, args: Record<string, unknown>) {
  switch (toolName) {
    case 'my_tool':
      return createMyToolDirective(args as MyToolArgs);
    // ...
  }
}
```

### Step 5: Write Migration Tests

Create tests in `tests/integration/`:

```typescript
describe('my_tool Migration', () => {
  it('should produce equivalent output schema', () => {
    const directive = createMyToolDirective({ projectPath: '/test' });

    expect(isOrchestrationDirective(directive)).toBe(true);
    expect(directive.tool).toBe('my_tool');
    // Verify output schema matches legacy
  });

  it('should achieve 60%+ token reduction', () => {
    const directive = createMyToolDirective({ projectPath: '/test' });

    const legacyTokens = 4000; // Your legacy token count
    const directiveTokens = directive.metadata?.estimated_tokens ?? 0;
    const reduction = ((legacyTokens - directiveTokens) / legacyTokens) * 100;

    expect(reduction).toBeGreaterThanOrEqual(60);
  });
});
```

### Step 6: Update IMPLEMENTATION-PLAN.md

Track migration status in `docs/planning/IMPLEMENTATION-PLAN.md`:

```markdown
| Tool      | Current Tokens | Directive Tokens | Status |
| --------- | -------------- | ---------------- | ------ |
| `my_tool` | 4K             | 1.5K             | ✅     |
```

## Rollback Procedure

If CE-MCP directive fails:

### 1. Immediate Rollback

Set execution mode to legacy:

```bash
export EXECUTION_MODE=full
```

This bypasses CE-MCP directives and uses OpenRouter directly.

### 2. Per-Tool Rollback

Remove tool from `cemcpTools` list:

```typescript
const cemcpTools = [
  'analyze_project_ecosystem',
  // 'my_tool', // Commented out - rolled back
];
```

### 3. Verify Rollback

Run migration tests to confirm legacy behavior:

```bash
npm test -- tests/integration/ce-mcp-migration.test.ts
```

## Token Savings Reference

| Tool                        | Legacy Tokens | CE-MCP Tokens | Reduction |
| --------------------------- | ------------- | ------------- | --------- |
| `analyze_project_ecosystem` | 12,000        | 4,000         | 67%       |
| `suggest_adrs`              | 3,500         | 1,500         | 57%       |
| `generate_rules`            | 4,000         | 1,500         | 62.5%     |
| `analyze_environment`       | 2,500         | 1,000         | 60%       |
| `deployment_readiness`      | 2,000         | 800           | 60%       |

## Validation Checklist

Before marking migration complete:

- [ ] Directive produces valid structure
- [ ] Output schema matches legacy format
- [ ] Token reduction >= 60%
- [ ] Migration tests passing
- [ ] Rollback tested
- [ ] Documentation updated

## Related Documentation

- [ADR-014: CE-MCP Architecture](../adrs/adr-014-ce-mcp-architecture.md)
- [IMPLEMENTATION-PLAN.md](../planning/IMPLEMENTATION-PLAN.md)
- [ce-mcp-tools.ts](../../src/tools/ce-mcp-tools.ts)
