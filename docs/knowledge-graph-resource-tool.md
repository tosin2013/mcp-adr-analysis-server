# Knowledge Graph Resource and Tool (ADR-018)

## Overview

The Knowledge Graph has been refactored to follow the ADR-018 Atomic Tools pattern, providing:
- **Zero token cost** for reading graph data via MCP Resource
- **Simple CRUD operations** for modifying graph via Tool
- **Consistent behavior** - data is queryable, not actively managed

## Architecture

### Resource: `knowledge://graph`

Read-only access to the knowledge graph structure with nodes, edges, and metadata.

**URI**: `knowledge://graph`

**Returns**:
```json
{
  "nodes": [
    { "id": "adr-001", "type": "adr", "title": "Use React", "status": "accepted" },
    { "id": "intent-123", "type": "intent", "name": "Add auth", "status": "executing" },
    { "id": "tool-analyze", "type": "tool", "name": "analyze_project_ecosystem" }
  ],
  "edges": [
    { "source": "intent-123", "target": "adr-001", "relationship": "created" },
    { "source": "intent-123", "target": "tool-analyze", "relationship": "uses", "success": true }
  ],
  "metadata": {
    "lastUpdated": "2025-12-16T13:00:00.000Z",
    "nodeCount": 42,
    "edgeCount": 18,
    "intentCount": 15,
    "adrCount": 8,
    "toolCount": 5,
    "version": "1.0.0"
  },
  "analytics": {
    "totalIntents": 15,
    "completedIntents": 10,
    "activeIntents": 5,
    "averageGoalCompletion": 0.67,
    "mostUsedTools": [...]
  }
}
```

**Benefits**:
- **Zero token cost** - Resources are free to query in MCP
- **Caching** - 60-second cache for performance
- **Consistent data** - Always returns current graph state

### Tool: `update_knowledge`

Simple CRUD operations for modifying the knowledge graph.

**Operations**:
1. `add_entity` - Add a new node (intent, ADR, tool, code file, decision)
2. `remove_entity` - Remove an existing node
3. `add_relationship` - Add an edge between two nodes
4. `remove_relationship` - Remove an edge between two nodes

**Example - Add an Entity**:
```json
{
  "operation": "add_entity",
  "entity": "adr-019",
  "entityType": "adr",
  "metadata": {
    "title": "Use GraphQL",
    "status": "proposed"
  }
}
```

**Example - Add a Relationship**:
```json
{
  "operation": "add_relationship",
  "relationship": "implements",
  "source": "adr-019",
  "target": "src/api/graphql.ts"
}
```

**Example - Remove an Entity**:
```json
{
  "operation": "remove_entity",
  "entity": "adr-015"
}
```

**Response**:
```json
{
  "success": true,
  "message": "Successfully executed add_entity",
  "graphState": {
    "nodeCount": 43,
    "edgeCount": 19,
    "intentCount": 15,
    "adrCount": 9,
    "lastUpdated": "2025-12-16T13:05:00.000Z"
  }
}
```

## Migration Guide

### For Tool Developers

**Old Pattern** (using KnowledgeGraphManager):
```typescript
const kgManager = new KnowledgeGraphManager();
const snapshot = await kgManager.loadKnowledgeGraph();
const results = await kgManager.queryKnowledgeGraph("what ADRs exist?");
```

**New Pattern** (using Resource):
```typescript
// Read graph - zero token cost via MCP Resource
const graph = await readResource('knowledge://graph');
const adrs = graph.nodes.filter(n => n.type === 'adr');

// Modify graph - use CRUD tool
await callTool('update_knowledge', {
  operation: 'add_entity',
  entity: 'adr-019',
  entityType: 'adr',
  metadata: { title: 'New Decision' }
});
```

### For LLM Prompts

**Reading Graph**:
- Query `knowledge://graph` resource for current state
- Filter nodes by type: `intent`, `adr`, `tool`, `code`, `decision`
- Traverse edges by relationship: `implements`, `uses`, `created`, `depends-on`, `supersedes`

**Modifying Graph**:
- Use `update_knowledge` tool with appropriate operation
- Always check `success` field in response
- Use `graphState` to see updated counts

## Benefits

### Zero Token Cost for Reads
Resources in MCP have zero token cost for clients. Reading graph state via `knowledge://graph` is free, unlike querying via tools.

### Simple Testing
Resources return pure data - no complex mocking needed. Tool operations are atomic and testable.

### LLM Control
LLM decides when to query graph, not an active manager. Better aligns with AI decision-making patterns.

### Consistent Behavior
Data is data. No stateful manager with inconsistent behavior between calls.

## Deprecation Notice

`KnowledgeGraphManager` is marked `@deprecated` and will be removed in v3.0.0. Internal code can still use it, but new external tools should use the resource/tool pattern.

### Internal vs External

**Internal** (can still use KnowledgeGraphManager):
- Core MCP server code
- Existing tools being migrated gradually
- Internal managers and utilities

**External** (should use resource/tool):
- New tools and resources
- User prompts and queries
- AI assistant integrations

## Implementation Details

### Files
- **Resource**: `src/resources/knowledge-graph-resource.ts`
- **Tool**: `src/tools/update-knowledge-tool.ts`
- **Tests**: `tests/resources/knowledge-graph-resource.test.ts`, `tests/tools/update-knowledge-tool.test.ts`
- **Deprecated**: `src/utils/knowledge-graph-manager.ts` (marked with `@deprecated`)

### Registration
- Resource registered in `index.ts` ListResourcesRequestSchema
- Tool registered in `index.ts` ListToolsRequestSchema
- Special handler for `knowledge://graph` in readResource() to inject KnowledgeGraphManager
- Tool handler calls `updateKnowledge()` with manager instance

## References

- **ADR-018**: Atomic Tools Architecture (not yet created - this implementation follows the pattern)
- **ADR-003**: Memory-Centric Architecture (evolved by this change)
- **Issue #311**: Test Infrastructure Improvements (EPIC)

## Future Work

### Next Steps
1. Migrate dependent tools to use resource/tool pattern
2. Add more relationship types as needed
3. Consider adding bulk operations for efficiency
4. Remove KnowledgeGraphManager in v3.0.0

### Potential Enhancements
- **Graph queries**: Add query DSL for complex graph traversals
- **Bulk operations**: Add batch add/remove for performance
- **Versioning**: Track graph changes over time
- **Relationships metadata**: Add weights, timestamps to edges
