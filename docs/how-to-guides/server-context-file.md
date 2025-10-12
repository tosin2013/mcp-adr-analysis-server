# Server Context File for LLM @ Referencing

## Overview

The **`.mcp-server-context.md`** file is a living document that bridges the gap between the server's internal memory systems (stored in `/tmp` as JSON) and your LLM's working context. By `@` mentioning this file, LLMs instantly gain awareness of:

- Available tools and capabilities
- Recent activity and intents
- Memory entities and relationships
- Discovered patterns
- Active recommendations
- Knowledge gaps

## What Problem Does This Solve?

**Before**: Your MCP server has powerful memory systems (`KnowledgeGraphManager`, `MemoryEntityManager`, `ConversationMemoryManager`) but they're invisible to the LLM unless explicitly queried.

**After**: LLMs can `@.mcp-server-context.md` to instantly understand:

- What's been happening recently
- What architectural decisions exist
- What patterns have been discovered
- What the server recommends doing next

## How It Works

### Auto-Generated Content

The file is populated from three memory systems:

1. **Knowledge Graph** → Active intents, tool usage, score trends
2. **Memory Entities** → Architectural decisions, relationships, patterns
3. **Conversation Memory** → Active sessions, turn count, context

### Real-Time Updates

The context file updates automatically:

- ✅ After every tool execution
- ✅ When memory entities change
- ✅ When conversation sessions start/end
- ✅ On server restart
- ✅ On manual request via MCP tool

## Usage Examples

### Starting a New Conversation

```
@.mcp-server-context.md I'm new to this project. What architectural
decisions have been made?
```

**LLM Response**: "Based on the context file, I can see we have 12 architectural
decisions documented, with 3 active intents. The most recent decision was about..."

### Resuming Work

```
@.mcp-server-context.md What was I working on? Show me the active intents
```

**LLM Response**: "Looking at the context, you have 2 active intents:

1. Database migration strategy (started 2h ago)
2. API gateway selection (started yesterday)"

### Understanding Patterns

```
@.mcp-server-context.md What patterns have we discovered in our architecture?
```

**LLM Response**: "The context shows 3 discovered patterns:

1. Microservices pattern (85% confidence)
2. Event-driven architecture (72% confidence)
3. CQRS pattern (68% confidence)"

### Checking Progress

```
@.mcp-server-context.md How has our architecture score changed?
```

**LLM Response**: "Your current project score is 87/100, up 12 points from
the initial baseline. The top improvements came from..."

## Integration Steps

### 1. Register the Tool (in `src/index.ts`)

```typescript
import { getServerContext, getServerContextMetadata } from './tools/get-server-context-tool.js';

// In your tool registration:
case 'get_server_context':
  return await getServerContext(
    args as GetServerContextArgs,
    {
      kgManager: this.kgManager,
      memoryManager: this.memoryManager,
      conversationManager: this.conversationMemoryManager,
    }
  );
```

### 2. Add to Tool List

```typescript
{
  name: 'get_server_context',
  description: 'Generate a comprehensive context file showing the server\'s current state',
  inputSchema: getServerContextMetadata.inputSchema,
}
```

### 3. Auto-Update on Tool Execution

Add this hook to your tool execution handler:

```typescript
// After successful tool execution
async function afterToolExecution() {
  const generator = new ServerContextGenerator();
  await generator.writeContextFile(kgManager, memoryManager, conversationManager);
}
```

### 4. Update on Server Startup

In your `McpAdrAnalysisServer` constructor:

```typescript
async initialize() {
  // ... existing initialization ...

  // Generate initial context file
  const generator = new ServerContextGenerator();
  await generator.writeContextFile(
    this.kgManager,
    this.memoryManager,
    this.conversationMemoryManager
  );

  this.logger.info('Server context file created', 'McpAdrAnalysisServer');
}
```

## File Structure

```markdown
# MCP Server Context & Memory

## 🎯 Server Quick Reference

- Server name, purpose, paths
- Available tools (quick reference list)

## 🧠 Memory & Knowledge Graph Status

- Active intents (last 5)
- Memory entities breakdown
- Conversation context

## 📊 Recent Analytics

- Tool usage (most used)
- Score trends
- Top impacting intents

## 🔍 Discovered Patterns

- Architectural patterns with confidence
- Suggested relationships

## 🎯 Recommendations for This Session

- Next actions
- Knowledge gaps
- Optimization opportunities

## 📝 How to Use This Context

- Usage examples

## 🔄 Context Refresh

- Auto-update triggers
- Manual refresh instructions
```

## Benefits

### 1. **Instant Context Awareness**

LLMs don't need to query multiple tools to understand the server state - just `@` the file.

### 2. **Conversation Continuity**

When resuming work, `@` the file to recover context from previous sessions.

### 3. **Pattern Recognition**

LLMs can see discovered patterns and make better architectural recommendations.

### 4. **Guided Workflows**

The recommendations section guides LLMs toward high-value actions.

### 5. **Memory Bridge**

Connects JSON-based memory systems to human-readable markdown that LLMs can process.

## Example Context File

```markdown
# MCP Server Context & Memory

> **Last Updated**: 2025-01-12T15:30:00Z

## 🎯 Server Quick Reference

**Name**: mcp-adr-analysis-server
**Project Path**: `/home/user/my-project`
**ADR Directory**: `docs/adrs`

### Available Tools

1. **adr_suggestion** - Suggest new ADRs
2. **smart_score** - Score architecture (0-100)
3. **deployment_readiness** - Validate deployment
   ...

## 🧠 Memory & Knowledge Graph Status

### Active Intents

**Total**: 15 | **Active**: 2 | **Completed**: 13

**Recent Intents**:

- **Implement database migration strategy** - executing - 2h ago
- **Select API gateway solution** - planning - 1d ago
  ...

### Memory Entities

**Total Entities**: 28
**Relationships**: 45
**Average Confidence**: 87%

**Entity Breakdown**:

- Architectural Decisions: 12
- Technical Decisions: 8
- Observations: 5
- Patterns: 3

## 📊 Recent Analytics

### Tool Usage

1. **adr_suggestion**: 34 calls
2. **smart_score**: 28 calls
3. **deployment_readiness**: 15 calls

### Score Trends

- **Current Score**: 87/100
- **Improvement**: +12 points
  ...
```

## Troubleshooting

### File Not Updating

**Check**: Is the tool execution hook in place?

```typescript
// After tool execution
await generator.writeContextFile(...);
```

### File Missing on Startup

**Check**: Is the initialization call present?

```typescript
// In server constructor
await generator.writeContextFile(...);
```

### Outdated Information

**Solution**: Manually trigger update:

```
Use MCP tool: get_server_context with writeToFile: true
```

## Advanced Configuration

### Custom Output Path

```typescript
await generator.writeContextFile(
  kgManager,
  memoryManager,
  conversationManager,
  '/custom/path/context.md'
);
```

### Limit Recent Items

```typescript
await generator.generateContext(kgManager, memoryManager, conversationManager, {
  maxRecentItems: 10,
});
```

### Disable Detailed Info

```typescript
await generator.generateContext(kgManager, memoryManager, conversationManager, {
  includeDetailed: false,
});
```

## Related Documentation

- [Memory Architecture](../explanation/memory-architecture.md)
- [Knowledge Graph](../explanation/knowledge-graph.md)
- [Tool Context](../reference/tool-context.md)

---

**💡 Pro Tip**: Add `.mcp-server-context.md` to your `.gitignore` since it's auto-generated and changes frequently. But do commit it once with sample data so other developers understand what it's for!
