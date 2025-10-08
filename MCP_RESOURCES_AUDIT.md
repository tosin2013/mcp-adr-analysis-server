# MCP Resources Audit and Gap Analysis

**Date**: 2025-10-07
**Project**: MCP ADR Analysis Server
**Audit Scope**: Resources, Tools, and Prompts alignment with MCP best practices

## Executive Summary

This audit evaluates the MCP resources implementation against best practices. The server currently exposes **3 resources**, **40+ tools**, and **45+ prompts**. Analysis reveals **significant gaps** in resource exposure, with many read-only data sources accessible only through tools instead of resources.

### Key Findings
- ✅ **Strengths**: Well-structured tools and comprehensive prompts
- ⚠️ **Critical Gap**: Only 3 resources vs 40+ tools (7.5% resource coverage)
- ❌ **Architecture Issue**: Resources return prompts instead of actual data
- 🔴 **Missing**: Templated resources for individual entity access

---

## Current State

### Existing Resources (3)

| URI | Name | Purpose | MIME Type |
|-----|------|---------|-----------|
| `adr://architectural_knowledge_graph` | Architectural Knowledge Graph | Complete architectural knowledge graph | application/json |
| `adr://analysis_report` | Analysis Report | Comprehensive project analysis report | application/json |
| `adr://adr_list` | ADR List | List of all ADRs | application/json |

**Implementation Issue**: All resources currently return AI prompts for generation rather than actual data. This violates MCP resource principles where resources should provide data, not require AI execution.

### Existing Tools (40+)

<details>
<summary>Click to expand full tool list</summary>

**Project Analysis**
- `analyze_project_ecosystem`
- `get_architectural_context`
- `smart_score`

**ADR Management**
- `suggest_adrs`
- `generate_adr_from_decision`
- `generate_adr_bootstrap`
- `discover_existing_adrs`
- `review_existing_adrs`
- `validate_adr`
- `validate_all_adrs`
- `generate_adrs_from_prd`
- `compare_adr_progress`

**Research & Analysis**
- `generate_research_questions`
- `perform_research`
- `incorporate_research`
- `create_research_template`

**Rules & Validation**
- `generate_rules`
- `validate_rules`
- `create_rule_set`

**Environment & Deployment**
- `analyze_environment`
- `analyze_deployment_progress`
- `check_ai_execution_status`
- `get_workflow_guidance`
- `get_development_guidance`
- `generate_deployment_guidance`
- `deployment_readiness`

**Security & Masking**
- `analyze_content_security`
- `generate_content_masking`
- `configure_custom_patterns`
- `apply_basic_content_masking`
- `validate_content_masking`

**Infrastructure & Operations**
- `smart_git_push`
- `troubleshoot_guided_workflow`
- `tool_chain_orchestrator`
- `manage_cache`
- `configure_output_masking`

**Memory & Context**
- `memory_loading`
- `expand_memory`
- `query_conversation_history`
- `get_conversation_snapshot`
- `get_memory_stats`
- `expand_analysis_section`

**Planning & Orchestration**
- `mcp_planning`
- `interactive_adr_planning`
- `request_action_confirmation`

**External Integration**
- `llm_web_search`
- `llm_cloud_management`
- `llm_database_management`

**File Operations**
- `list_roots`
- `read_directory`
- `read_file`
- `write_file`
- `list_directory`

</details>

### Existing Prompts (45+)

**Static Templates**: 10 prompts including goal specification, action confirmation, ambiguity resolution, custom rule definition, baseline analysis, secret prevention, TODO management

**Dynamic Function-Based**: 35+ prompts across analysis, ADR suggestions, deployment, environment, research, rules, and security domains

---

## MCP Best Practices Review

### Principle Compliance

According to MCP specification:

| Primitive | Control | Purpose | Current Status |
|-----------|---------|---------|----------------|
| **Tools** | Model-controlled | Add capabilities to Claude | ✅ Well implemented (40+ tools) |
| **Resources** | App-controlled | Provide data to apps/UI | ❌ Under-utilized (3 resources) |
| **Prompts** | User-controlled | User workflows & starters | ✅ Comprehensive (45+ prompts) |

### Critical Gap: Resources vs Tools Imbalance

**Problem**: Many tools perform read-only data retrieval operations that should be resources:

```
Tools for read-only data:   ~15 tools (37.5%)
Resources for read data:     3 resources
Ratio:                       5:1 (tools:resources)
```

**MCP Best Practice**: Read-only data access should be resources, not tools. Tools should be for actions and capabilities.

---

## Gap Analysis

### 1. Missing Static Resources

Data sources that exist but aren't exposed as resources:

#### High Priority

| Missing Resource | Current Access | Use Case |
|------------------|---------------|----------|
| `adr://todo_list` | Tool only | Task management, progress tracking |
| `adr://research_findings` | File system only | Research documentation, knowledge base |
| `adr://rule_sets` | Tool only | Rule validation, compliance checking |
| `adr://deployment_status` | Tool only | Deployment tracking, CI/CD monitoring |
| `adr://memory_snapshots` | Tool only | Conversation history, context retrieval |
| `adr://environment_analysis` | Tool only | Environment configuration, capability detection |
| `adr://project_metrics` | Tool only | Analytics, progress dashboards |
| `adr://knowledge_graph_summary` | Partial (full graph only) | Quick relationship queries |

#### Medium Priority

| Missing Resource | Current Access | Use Case |
|------------------|---------------|----------|
| `adr://validation_results` | Tool only | ADR validation reports |
| `adr://security_scan_results` | Tool only | Security analysis reports |
| `adr://git_status` | Tool only | Repository state, changes tracking |
| `adr://cache_status` | Tool only | Cache management, performance monitoring |

### 2. Missing Templated Resources

Individual entity access via parameterized URIs:

#### Essential Templated Resources

| Resource Template | Purpose | Example URI |
|-------------------|---------|-------------|
| `adr://adr/{id}` | Single ADR access | `adr://adr/0001-auth-strategy` |
| `adr://research/{topic}` | Research by topic | `adr://research/authentication` |
| `adr://todo/{task-id}` | Single task details | `adr://todo/task-123` |
| `adr://rule/{rule-id}` | Individual rule | `adr://rule/no-secrets-in-code` |
| `adr://memory/{timestamp}` | Historical snapshot | `adr://memory/2025-10-07T10:00:00Z` |
| `adr://deployment/{environment}` | Environment status | `adr://deployment/production` |
| `adr://technology/{name}` | Technology details | `adr://technology/docker` |
| `adr://pattern/{name}` | Pattern usage info | `adr://pattern/microservices` |

### 3. Resource Quality Issues

#### Current Implementation Problems

**Problem 1: Prompt-Driven Resources**
```typescript
// Current: Returns prompts instead of data
return {
  data: {
    prompt: knowledgeGraphPrompt,
    instructions: `Submit this to AI for analysis`
  }
}

// Expected: Returns actual data
return {
  data: {
    projectId: "xyz",
    technologies: [...],
    patterns: [...]
  }
}
```

**Problem 2: No Caching Strategy**
- Resources claim to support caching (TTL specified)
- But caching implementation not visible in handlers
- Cache keys generated but never used

**Problem 3: Missing Metadata**
- No versioning information
- No ETag support
- Limited MIME type usage
- Missing last-modified tracking

**Problem 4: No Resource Discovery**
- Static resource list only
- No dynamic resource enumeration
- No resource relationships or links

---

## Impact Analysis

### For AI Assistants (Claude)
- **Current**: Must use tools for all data access → inefficient, confusing
- **With Resources**: Can directly read data without tool execution
- **Benefit**: Clearer separation between reading and actions

### For Applications
- **Current**: Cannot build UI dashboards without triggering tools
- **With Resources**: Can poll resources for real-time data display
- **Benefit**: Better app architecture, reduced tool load

### For Users
- **Current**: Limited visibility into system state
- **With Resources**: Direct access to project data
- **Benefit**: Enhanced transparency and control

### Performance Impact
- **Current**: Every data read executes tool logic
- **With Resources**: Cacheable, optimized data access
- **Benefit**: Improved response times, reduced server load

---

## Implementation Recommendations

### Phase 1: Critical Resources (Week 1-2)

**Priority 1: Fix Existing Resources**
- [ ] Refactor resources to return actual data instead of prompts
- [ ] Implement proper caching with cache key usage
- [ ] Add resource metadata (version, ETag, last-modified)

**Priority 2: Add Essential Static Resources**
- [ ] `adr://todo_list` - Todo task list
- [ ] `adr://research_index` - Research documents index
- [ ] `adr://rule_catalog` - Available rules catalog
- [ ] `adr://project_status` - Current project status

### Phase 2: Templated Resources (Week 3-4)

**Individual Entity Access**
- [ ] `adr://adr/{id}` - Single ADR retrieval
- [ ] `adr://research/{topic}` - Research by topic
- [ ] `adr://todo/{task-id}` - Single task
- [ ] `adr://rule/{rule-id}` - Individual rule

### Phase 3: Advanced Resources (Week 5-6)

**Enhanced Data Resources**
- [ ] `adr://deployment_status` - Deployment tracking
- [ ] `adr://environment_analysis` - Environment info
- [ ] `adr://memory_snapshots` - Conversation history
- [ ] `adr://project_metrics` - Analytics and metrics

**Resource Relationships**
- [ ] Link headers for related resources
- [ ] Resource discovery mechanism
- [ ] Hierarchical resource structure

### Phase 4: Optimization (Week 7-8)

**Performance & Quality**
- [ ] Implement resource-level caching
- [ ] Add conditional request support (ETags, If-Modified-Since)
- [ ] Resource versioning strategy
- [ ] Resource access logging and analytics

---

## Technical Implementation Guide

### Resource Implementation Pattern

```typescript
// Good: Direct data resource
export async function generateTodoListResource(): Promise<ResourceGenerationResult> {
  const todos = await loadTodosFromFile();

  return {
    data: {
      version: "1.0",
      timestamp: new Date().toISOString(),
      todos: todos.map(todo => ({
        id: todo.id,
        title: todo.title,
        status: todo.status,
        priority: todo.priority,
        dependencies: todo.dependencies
      }))
    },
    contentType: 'application/json',
    lastModified: new Date().toISOString(),
    cacheKey: `todo-list:${Date.now()}`,
    ttl: 60, // 1 minute cache
    etag: generateETag(todos)
  };
}

// Bad: Prompt-based resource (current implementation)
export async function generateTodoListResource(): Promise<ResourceGenerationResult> {
  return {
    data: {
      prompt: "Generate a todo list by analyzing...",
      instructions: "Submit this to AI..."
    },
    contentType: 'application/json',
    ttl: 3600
  };
}
```

### Templated Resource Handler

```typescript
// Example: Individual ADR resource
this.server.setRequestHandler(ReadResourceRequestSchema, async request => {
  const { uri } = request.params;
  const url = new URL(uri);

  // Parse templated URI: adr://adr/0001-auth-strategy
  const pathParts = url.pathname.split('/').filter(Boolean);

  if (pathParts[0] === 'adr' && pathParts[1]) {
    const adrId = pathParts[1];
    const adr = await loadAdrById(adrId);

    return {
      contents: [{
        uri,
        mimeType: 'application/json',
        text: JSON.stringify(adr, null, 2)
      }]
    };
  }

  // ... other resource handlers
});
```

### Caching Implementation

```typescript
// Resource-level caching
class ResourceCache {
  private cache = new Map<string, { data: any; expiry: number }>();

  async get(key: string): Promise<any | null> {
    const cached = this.cache.get(key);
    if (cached && cached.expiry > Date.now()) {
      return cached.data;
    }
    this.cache.delete(key);
    return null;
  }

  set(key: string, data: any, ttl: number): void {
    this.cache.set(key, {
      data,
      expiry: Date.now() + ttl * 1000
    });
  }
}

// Usage in resource handler
const cached = await resourceCache.get(result.cacheKey);
if (cached) {
  return {
    contents: [{
      uri,
      mimeType: 'application/json',
      text: JSON.stringify(cached, null, 2)
    }]
  };
}
```

---

## Migration Strategy

### Tool → Resource Migration

**Criteria for Migration**:
1. Tool performs read-only operations
2. Data is frequently accessed
3. No side effects or state changes
4. Cacheable result
5. Useful for UI/app display

**Migration Process**:
1. Create new resource implementation
2. Add resource to ListResources handler
3. Implement ReadResource handler
4. Update documentation
5. Mark tool as deprecated (keep for backward compatibility)
6. After 2 releases, remove deprecated tool

**Example Migration**:

```typescript
// Before: Tool-based access
{
  name: 'get_todo_list',
  description: 'Retrieve current todo list',
  inputSchema: { ... }
}

// After: Resource-based access
{
  uri: 'adr://todo_list',
  name: 'Todo List',
  description: 'Current project task list',
  mimeType: 'application/json'
}
```

---

## Success Metrics

### Quantitative Metrics

- **Resource Coverage**: Target 20+ resources (from current 3)
- **Tool Reduction**: Reduce read-only tools by 50%
- **Cache Hit Rate**: Target 60%+ for frequently accessed resources
- **Response Time**: 50% faster data access via resources vs tools
- **Resource Usage**: Track resource access frequency

### Qualitative Metrics

- **Developer Experience**: Easier to build apps with resource access
- **Claude Efficiency**: Clearer when to use tools vs resources
- **User Satisfaction**: Better visibility into project state
- **Code Maintainability**: Cleaner separation of concerns

---

## Appendix

### A. MCP Resource Best Practices

1. **Resources are for data, not actions**
2. **Use static URIs for lists, templated URIs for items**
3. **Implement caching with appropriate TTL**
4. **Include proper MIME types and metadata**
5. **Support conditional requests (ETags)**
6. **Provide resource discovery mechanisms**
7. **Version resources for backward compatibility**
8. **Use link headers for resource relationships**

### B. Resource Naming Conventions

- **Static Lists**: `adr://entity_list` (e.g., `adr://adr_list`)
- **Templated Items**: `adr://entity/{id}` (e.g., `adr://adr/{id}`)
- **Filtered Views**: `adr://entity_list?filter=value`
- **Relationships**: `adr://entity/{id}/related`

### C. Resource Response Format

```typescript
interface ResourceResponse {
  contents: Array<{
    uri: string;
    mimeType: string;
    text?: string;
    blob?: string;
  }>;
  // Optional metadata
  _meta?: {
    version: string;
    lastModified: string;
    etag: string;
    links?: {
      self: string;
      related?: string[];
    };
  };
}
```

---

## Conclusion

This audit reveals a significant gap in resource implementation. The current 3-resource setup fails to leverage MCP's resource capabilities effectively. Implementing the recommended 20+ resources will:

1. **Improve architecture** by properly separating read operations from actions
2. **Enhance performance** through caching and optimized data access
3. **Enable better apps** with direct data access for UIs
4. **Clarify intent** for AI assistants on when to read vs act

**Recommendation**: Prioritize Phase 1 (critical resources) immediately, with Phases 2-4 following in subsequent sprints.

---

**Document Version**: 1.0
**Last Updated**: 2025-10-07
**Next Review**: After Phase 1 completion
