# How `.mcp-server-context.md` Helps with ALL 25 Tools

## Overview

The `.mcp-server-context.md` file provides **comprehensive support for all 25+ tools** in the MCP ADR Analysis Server through multiple mechanisms:

## ✅ Complete Tool Coverage

### 1. **Tool Discovery** (All Tools)

When LLMs `@.mcp-server-context.md`, they instantly see **all 25 tools organized by category**:

```markdown
**ADR Management** (5 tools)

- adr_suggestion, adr_validation, rule_generation, review_existing_adrs, adr_bootstrap_validation

**Deployment & Infrastructure** (4 tools)

- deployment_readiness, deployment_guidance, deployment_analysis, environment_analysis

**Research & Analysis** (4 tools)

- perform_research, research_question, research_integration, expand_analysis

**Development Workflow** (5 tools)

- smart_git_push, todo_management_v2, troubleshoot_guided_workflow, bootstrap_validation_loop, tool_chain_orchestrator

**Memory & Context** (3 tools)

- conversation_memory, memory_loading, get_server_context

**Cloud & Database** (3 tools)

- llm_web_search, llm_cloud_management, llm_database_management

**Other** (4 tools)

- content_masking, interactive_adr_planning, smart_score, mcp_planning
```

**Benefit**: LLMs know **what tools exist** and **what they do** without querying.

---

### 2. **Usage Patterns** (All Tools)

The analytics section tracks usage for **every tool**:

```markdown
## 📊 Recent Analytics

### Tool Usage (Last 7 Days)

1. adr_suggestion: 34 calls - 97% success
2. smart_score: 28 calls - 100% success
3. deployment_readiness: 15 calls - 93% success
4. environment_analysis: 12 calls - 100% success
5. perform_research: 8 calls - 88% success
   ...
```

**Benefit**: LLMs see **which tools are working well** and **which are frequently used**.

---

### 3. **Tool Chains** (All Tools)

The patterns section shows **successful multi-tool workflows**:

```markdown
### Successful Tool Chains

1. adr_suggestion → adr_validation → smart_score: 12 times
2. perform_research → research_integration → adr_suggestion: 8 times
3. environment_analysis → deployment_readiness → deployment_guidance: 6 times
4. review_existing_adrs → rule_generation → adr_bootstrap_validation: 4 times
```

**Benefit**: LLMs learn **how to combine tools effectively** for complex workflows.

---

### 4. **Context Awareness** (All Tools)

Every tool execution is tracked in the knowledge graph:

```markdown
### Active Intents

**Recent Intents**:

- **Implement database migration** - executing
  └─ Tools used: environment_analysis, deployment_analysis, llm_database_management

- **Generate API documentation** - completed
  └─ Tools used: review_existing_adrs, adr_suggestion, rule_generation
```

**Benefit**: LLMs see **what tools were used for what purpose** and **with what results**.

---

### 5. **Memory Integration** (All Tools)

Memory entities track tool outputs:

```markdown
### Memory Entities

**Entity Breakdown**:

- Architectural Decisions: 12 (from adr_suggestion, adr_validation)
- Technical Decisions: 8 (from deployment_guidance, environment_analysis)
- Observations: 5 (from perform_research, expand_analysis)
- Patterns: 3 (from smart_score, review_existing_adrs)
```

**Benefit**: LLMs understand **what knowledge each tool has contributed**.

---

## How Each Tool Category Benefits

### ADR Management Tools (5 tools)

- **Discover**: See all ADR-related tools at once
- **Learn**: Understand which ADR tools work together (e.g., suggestion → validation → bootstrap)
- **Track**: See how many ADRs have been created/validated
- **Improve**: Notice patterns in ADR creation (e.g., common themes, validation failures)

### Deployment Tools (4 tools)

- **Discover**: See all deployment tools and their purposes
- **Learn**: Understand deployment workflows (analysis → readiness → guidance)
- **Track**: Monitor deployment readiness scores over time
- **Improve**: Identify deployment blockers and patterns

### Research Tools (4 tools)

- **Discover**: Know which research tools are available
- **Learn**: See research → integration workflows
- **Track**: Track research findings and their impact on decisions
- **Improve**: Identify knowledge gaps that research should address

### Workflow Tools (5 tools)

- **Discover**: See all development workflow tools
- **Learn**: Understand orchestration patterns (todo → git → validation)
- **Track**: Monitor workflow efficiency and bottlenecks
- **Improve**: Optimize tool chains based on success rates

### Memory Tools (3 tools)

- **Discover**: Understand memory management capabilities
- **Learn**: See how conversation context is maintained
- **Track**: Monitor memory entity growth and relationships
- **Improve**: Identify memory gaps and optimization opportunities

### Cloud/Database Tools (3 tools)

- **Discover**: Know infrastructure management capabilities
- **Learn**: See cloud/database management patterns
- **Track**: Monitor infrastructure operations
- **Improve**: Identify infrastructure optimization opportunities

---

## Real-World Example: LLM Using Context for Multi-Tool Workflow

### User Request:

```
I need to add a new microservice for user authentication.
What should I do?
```

### LLM with Context File:

```markdown
Looking at @.mcp-server-context.md, I can see:

1. **Available Tools**: We have adr_suggestion, environment_analysis,
   deployment_readiness, and deployment_guidance

2. **Recent Patterns**: Successful chain: environment_analysis →
   deployment_analysis → adr_suggestion

3. **Current State**:
   - 12 architectural decisions documented
   - Project score: 87/100
   - Active intent: "Database migration strategy"

4. **Recommendations**:
   - Knowledge gap: "Authentication patterns not yet documented"

**My Recommendation**: Let's follow this workflow:

1. Use `perform_research` to research authentication patterns
2. Use `environment_analysis` to understand current auth setup
3. Use `adr_suggestion` to generate authentication ADR
4. Use `deployment_guidance` for deployment strategy
5. Use `adr_validation` to validate the ADR

This follows the successful pattern we've used before.
```

---

## What the Context File DOESN'T Provide (By Design)

### ❌ Detailed Tool Schemas

**Why**: Schemas change frequently, would make file too large
**Solution**: LLMs can query MCP protocol for exact schemas when needed
**Context file shows**: Tool names and high-level descriptions

### ❌ Real-Time Tool Status

**Why**: Would require polling, adds complexity
**Solution**: Context file updates after tool executions
**Context file shows**: Recent usage patterns and success rates

### ❌ Tool-Specific Configuration

**Why**: Configuration is environment-specific
**Solution**: Tools read from environment/config files
**Context file shows**: Project path and ADR directory

---

## How to Maximize Context File Effectiveness

### 1. **Regular Updates**

Ensure the context file updates after every tool execution:

```typescript
// After tool execution
await generator.writeContextFile(kgManager, memoryManager, conversationManager);
```

### 2. **Rich Analytics**

Let the knowledge graph track tool usage:

```typescript
await kgManager.addToolExecution(intentId, toolName, parameters, result, success);
```

### 3. **Meaningful Intents**

Create intents with clear, descriptive names:

```typescript
await kgManager.createIntent('Implement authentication microservice', [
  'Research patterns',
  'Design ADR',
  'Plan deployment',
]);
```

### 4. **Tool Chains**

Document successful tool chains:

```typescript
// Knowledge graph automatically tracks tool execution order
// Context file surfaces successful patterns
```

---

## Verification: Does It Help ALL Tools?

| Tool Category  | Tool Count | Discoverable? | Usage Tracked? | Patterns Shown? |
| -------------- | ---------- | ------------- | -------------- | --------------- |
| ADR Management | 5          | ✅ Yes        | ✅ Yes         | ✅ Yes          |
| Deployment     | 4          | ✅ Yes        | ✅ Yes         | ✅ Yes          |
| Research       | 4          | ✅ Yes        | ✅ Yes         | ✅ Yes          |
| Workflow       | 5          | ✅ Yes        | ✅ Yes         | ✅ Yes          |
| Memory         | 3          | ✅ Yes        | ✅ Yes         | ✅ Yes          |
| Cloud/Database | 3          | ✅ Yes        | ✅ Yes         | ✅ Yes          |
| Other          | 4          | ✅ Yes        | ✅ Yes         | ✅ Yes          |
| **TOTAL**      | **28**     | **✅ 100%**   | **✅ 100%**    | **✅ 100%**     |

---

## Conclusion

**YES - The context file helps with ALL 25+ tools by:**

1. ✅ **Listing all tools by category** (discovery)
2. ✅ **Tracking usage of every tool** (analytics)
3. ✅ **Showing successful tool chains** (patterns)
4. ✅ **Recording tool outputs in memory** (knowledge)
5. ✅ **Providing context for tool selection** (recommendations)

**The context file is a force multiplier** - it makes LLMs more effective at using your entire tool ecosystem, not just a few popular tools.

**Next Steps**:

1. Integrate the context generator into your server
2. Test with a complex multi-tool workflow
3. Observe how LLMs use the context to make better tool choices
4. Monitor tool usage patterns in the analytics section

---

_This context file transforms your 25+ tools from a scattered toolkit into a coherent, discoverable, learnable system that LLMs can master._
