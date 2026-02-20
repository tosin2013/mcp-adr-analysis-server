# 📚 Comprehensive API Reference

**MCP ADR Analysis Server** - Complete Resource & Tool API Documentation

**Version:** 2.0.22+  
**Last Updated:** October 12, 2025

---

## 📖 Table of Contents

1. [Overview](#overview)
2. [Resource APIs (20)](#resource-apis)
3. [Tool APIs (27)](#tool-apis)
4. [Common Patterns](#common-patterns)
5. [Error Handling](#error-handling)
6. [Query Parameters](#query-parameters)
7. [Best Practices](#best-practices)
8. [Examples by Use Case](#examples-by-use-case)

---

## Overview

The MCP ADR Analysis Server provides 47+ APIs across two main categories:

- **20 Resource APIs:** Read-only data access with caching and ETags
- **27 Tool APIs:** Action-oriented operations for analysis and generation

All APIs follow consistent patterns for parameters, error handling, and response formats.

---

## Resource APIs

Resources provide **read-only access** to project data with **automatic caching** and **ETag support**.

### URI Pattern

```
adr://{resource-name}/{optional-id}?{query-parameters}
```

### Common Response Format

```typescript
interface ResourceGenerationResult {
  data: any; // Resource-specific data
  contentType: string; // Usually "application/json"
  lastModified: string; // ISO 8601 timestamp
  cacheKey: string; // Unique cache identifier
  ttl: number; // Cache duration in seconds
  etag?: string; // Entity tag for validation
}
```

---

### 📊 Project Status & Metrics

#### 1. Project Status Resource

**URI:** `adr://project-status`

**Purpose:** Comprehensive project health overview aggregating tasks, research, and rules

**Cache TTL:** 120 seconds (2 minutes)

**Key Data:**

- Overall health score (excellent/good/fair/poor)
- Component status (tasks, research, rules)
- Completion rates and quality scores
- Resource coverage metrics

**Example:**

```typescript
const status = await client.callTool('read_resource', {
  uri: 'adr://project-status',
});

console.log(`Health: ${status.data.overallHealth}`);
console.log(`Completion: ${status.data.metrics.completionRate}%`);
console.log(`Quality: ${status.data.metrics.qualityScore}/100`);
```

**Use Cases:**

- Dashboard displays
- CI/CD status checks
- Progress reports

---

#### 2. Project Metrics Resource

**URI:** `adr://project-metrics`

**Purpose:** Detailed codebase metrics, quality analysis, and productivity tracking

**Cache TTL:** 300 seconds (5 minutes)

**Performance Note:** Executes multiple expensive operations (TypeScript check, test execution, git analysis). Results are cached for 5 minutes.

**Key Data:**

- **Codebase:** File counts, line counts, language breakdown, largest files
- **Quality:** Overall score, maintainability, complexity, documentation, testing
- **Architecture:** ADR count, implementation status, architectural debt
- **Dependencies:** Package health, outdated/vulnerable counts
- **Git:** Commit history, contributors, branch statistics
- **Productivity:** Velocity metrics, change frequency

**Example:**

```typescript
const metrics = await client.callTool('read_resource', {
  uri: 'adr://project-metrics',
});

console.log(`Quality: ${metrics.data.quality.overallScore}%`);
console.log(`Files: ${metrics.data.codebase.totalFiles}`);
console.log(`ADRs: ${metrics.data.architecture.adrCount}`);
console.log(`Vulnerabilities: ${metrics.data.dependencies.vulnerable}`);
```

**Use Cases:**

- Code quality dashboards
- Technical debt tracking
- Team productivity analysis
- Architectural compliance monitoring

---

#### 3. Code Quality Resource

**URI:** `adr://code-quality?scope={scope}&threshold={threshold}`

**Purpose:** TreeSitter AST-based code quality analysis with production code scoring

**Cache TTL:** 300 seconds (5 minutes)

**Query Parameters:**

- `scope`: Analysis scope - "full", "changes", "critical" (default: "full")
- `includeMetrics`: Include detailed metrics - true/false (default: true)
- `includeRecommendations`: Include improvements - true/false (default: true)
- `threshold`: Minimum quality score 0-100 (default: 70)
- `format`: Output format - "summary", "detailed" (default: "detailed")

**Key Data:**

- Production code score with AST analysis
- Mock code indicators and test file classification
- Quality gates with pass/fail status
- Code complexity and maintainability metrics
- Actionable recommendations

**Example:**

```typescript
// Comprehensive analysis
const quality = await client.callTool('read_resource', {
  uri: 'adr://code-quality?scope=full&threshold=80&includeRecommendations=true',
});

console.log(`Production Score: ${quality.data.metrics.productionCodeScore}%`);
console.log(`Grade: ${quality.data.grade}`);
console.log(`Mock indicators: ${quality.data.metrics.mockCodeIndicators}`);

// Quick summary
const summary = await client.callTool('read_resource', {
  uri: 'adr://code-quality?format=summary&includeMetrics=false',
});
```

**Use Cases:**

- Pre-deployment quality gates
- CI/CD quality checks
- Technical debt identification
- Refactoring prioritization

---

### 🚀 Deployment & Environment

#### 4. Deployment Status Resource

**URI:** `adr://deployment-status?operation={op}&environment={env}`

**Purpose:** Multi-dimensional deployment readiness with quality gates and git push logic

**Cache TTL:** 180 seconds (3 minutes)

**Query Parameters:**

- `operation`: Operation type (default: "check_readiness")
- `environment`: Target environment - "production", "staging", "development" (default: NODE_ENV || "production")
- `memory`: Enable memory integration - true/false (default: true)
- `strict`: Enable zero-tolerance mode - true/false (default: true)
- `comprehensive`: Use full analysis - true/false (default: true)

**Comprehensive Mode Includes:**

- TreeSitter AST code quality analysis
- Zero-tolerance test validation
- Deployment history trend analysis
- ADR compliance validation
- Memory-based pattern analysis
- Critical blocker identification with auto-fix suggestions
- Git push allow/block decision logic

**Key Data:**

- Deployment readiness score with blockers/warnings
- Code quality analysis with production score
- Test validation results with failure details
- Git push status (allowed/blocked/conditional)
- Historical comparison and trends
- Emergency override status

**Example:**

```typescript
// Production readiness check
const status = await client.callTool('read_resource', {
  uri: 'adr://deployment-status?environment=production&strict=true',
});

if (status.data.gitPushStatus?.decision === 'blocked') {
  console.error(`❌ Deployment blocked: ${status.data.gitPushStatus.reason}`);
  console.log('Blockers:', status.data.deploymentReadiness.blockers);
  process.exit(1);
}

console.log(`✅ Readiness: ${status.data.deploymentReadiness.score}%`);
console.log(`Quality: ${status.data.codeQualityAnalysis.overallScore}%`);
console.log(
  `Tests: ${status.data.testValidation.passedTests}/${status.data.testValidation.totalTests}`
);
```

**Use Cases:**

- Pre-deployment validation
- CI/CD gating
- Release management
- Quality enforcement

---

#### 5. Deployment History Resource

**URI:** `adr://deployment-history?period={period}&environment={env}`

**Purpose:** Historical deployment analysis with trend detection and failure patterns

**Cache TTL:** 300 seconds (5 minutes)

**Query Parameters:**

- `period`: Time period - "7d", "30d", "90d", "365d", "all" (default: "30d")
- `environment`: Filter by environment - "production", "staging", "all" (default: "all")
- `includeFailures`: Include failure analysis - true/false (default: true)
- `includeMetrics`: Include detailed metrics - true/false (default: true)
- `format`: Output format - "summary", "detailed" (default: "detailed")

**Key Data:**

- Success/failure counts and rates
- Average deployment time
- Rollback frequency
- Failure patterns and common causes
- Trend analysis (improving/stable/degrading)
- Time-series data for visualization
- Improvement recommendations

**Example:**

```typescript
// Last 30 days production deployments
const history = await client.callTool('read_resource', {
  uri: 'adr://deployment-history?period=30d&environment=production',
});

console.log(`Total: ${history.data.totalDeployments}`);
console.log(`Success rate: ${history.data.successRate}%`);
console.log(`Trend: ${history.data.trends[0].trend}`);

// Failure analysis
if (history.data.failurePatterns) {
  console.log('Top failure causes:');
  history.data.failurePatterns.commonCauses.forEach(cause => {
    console.log(`  - ${cause.reason}: ${cause.occurrences}x`);
  });
}
```

**Use Cases:**

- Deployment health monitoring
- Failure pattern analysis
- Process improvement
- Reliability tracking

---

#### 6. Environment Analysis Resource

**URI:** `adr://environment-analysis?type={type}`

**Purpose:** Infrastructure detection, cloud services discovery, and security posture analysis

**Cache TTL:** 300 seconds (5 minutes)

**Query Parameters:**

- `type`: Analysis type - "specs", "infrastructure", "security" (default: "specs")
- `memory`: Enable memory integration - true/false (default: true)
- `comprehensive`: Use full analysis - true/false (default: true)

**Comprehensive Mode Features:**

- Advanced infrastructure detection (Kubernetes, Docker, databases)
- Cloud services discovery (AWS, Azure, GCP, Vercel, Netlify)
- Container security analysis with scoring
- HTTPS/authentication/secrets checks
- Compliance framework detection (SOC2, HIPAA, GDPR, PCI-DSS)
- Real-time health metrics (disk, load, uptime)

**Key Data:**

- System specifications (OS, Node.js, npm versions)
- Project structure (TypeScript, tests, frameworks)
- Infrastructure components
- Containerization and orchestration
- Cloud services configuration
- Security posture and compliance

**Example:**

```typescript
// Comprehensive infrastructure analysis
const env = await client.callTool('read_resource', {
  uri: 'adr://environment-analysis?type=infrastructure&comprehensive=true',
});

console.log(`Platform: ${env.data.system.platform}`);
console.log(`Node: ${env.data.system.nodeVersion}`);

if (env.data.containerization?.detected) {
  console.log(`Containers: ${env.data.containerization.technologies}`);
  console.log(`Security: ${env.data.containerization.security.score}/100`);
}

if (env.data.cloudServices) {
  console.log(`Cloud providers: ${env.data.cloudServices.providers}`);
}
```

**Use Cases:**

- Infrastructure inventory
- Security audits
- Compliance validation
- Environment compatibility checks

---

### 📋 ADR Management

#### 7. ADR by ID Resource

**URI:** `adr://adr/{id}?projectPath={path}`

**Purpose:** Individual ADR retrieval with validation, relationships, and metadata

**Cache TTL:** 600 seconds (10 minutes)

**Path Parameters:**

- `id`: ADR identifier - numeric ("001"), slug ("database-architecture"), or filename

**Query Parameters:**

- `projectPath`: Override project root path (default: process.cwd())

**Key Data:**

- Complete ADR content (title, status, date, context, decision, consequences)
- Structural validation scoring
- Related ADR discovery through content analysis
- Implementation status tracking
- Priority and complexity assessment
- File metadata (size, location, tags)

**Example:**

```typescript
// Get ADR by numeric ID
const adr = await client.callTool('read_resource', {
  uri: 'adr://adr/001',
});

console.log(`Title: ${adr.data.title}`);
console.log(`Status: ${adr.data.status}`);
console.log(`Validation: ${adr.data.validationResults.score}/100`);
console.log(`Related: ${adr.data.relatedAdrs.join(', ')}`);

// Custom project path
const customAdr = await client.callTool('read_resource', {
  uri: 'adr://adr/database-architecture?projectPath=/path/to/project',
});
```

**Use Cases:**

- ADR detail views
- Relationship mapping
- Implementation tracking
- Quality validation

---

### 📝 Task & Research Management

#### 8. Todo List Resource

**URI:** `adr://todo-list`

**Purpose:** Task management with progress tracking and priority-based organization

**Cache TTL:** 120 seconds (2 minutes)

**File Source:** `{projectRoot}/todo.md`

**Supported Task Statuses:**

- `pending`: Not yet started
- `in_progress`: Currently being worked on
- `completed`: Finished

**Supported Priorities:**

- `critical`: Must be done immediately
- `high`: Important, should be done soon
- `medium`: Normal priority
- `low`: Can be deferred

**Key Data:**

- Task array with status, priority, assignee, dependencies
- Summary statistics by status and priority
- Completion rate calculation
- Due date tracking

**Example:**

```typescript
const todoList = await client.callTool('read_resource', {
  uri: 'adr://todo-list',
});

const rate = ((todoList.data.summary.completed / todoList.data.summary.total) * 100).toFixed(1);
console.log(`Completion: ${rate}%`);
console.log(`In progress: ${todoList.data.summary.inProgress}`);

// Filter critical tasks
const critical = todoList.data.tasks.filter(
  t => t.priority === 'critical' && t.status !== 'completed'
);
console.log(`Critical remaining: ${critical.length}`);
```

**Use Cases:**

- Project dashboards
- Sprint planning
- Progress tracking
- Priority management

---

#### 9. Todo by ID Resource

**URI:** `adr://todo/{id}`

**Purpose:** Individual task retrieval with full details

**Cache TTL:** 120 seconds (2 minutes)

**Example:**

```typescript
const task = await client.callTool('read_resource', {
  uri: 'adr://todo/task-001',
});
```

---

#### 10. Research Index Resource

**URI:** `adr://research-index`

**Purpose:** Research document catalog with metadata and categorization

**Cache TTL:** 300 seconds (5 minutes)

**Scanned Directories:**

- `docs/research/` - Primary research documentation
- `custom/research/` - Custom user research notes

**Document Metadata:**

- Title (from H1 heading or filename)
- Topic (from filename prefix)
- Word count
- File size
- Last modified timestamp

**Key Data:**

- Documents array with metadata
- Summary by topic
- Total word count statistics
- Average document length

**Example:**

```typescript
const research = await client.callTool('read_resource', {
  uri: 'adr://research-index',
});

console.log(`Total docs: ${research.data.summary.total}`);
console.log(`Topics: ${Object.keys(research.data.summary.byTopic).length}`);

// Find by topic
const securityDocs = research.data.documents.filter(doc => doc.topic === 'security');

// Sort by recency
const recent = research.data.documents
  .sort((a, b) => new Date(b.lastModified) - new Date(a.lastModified))
  .slice(0, 5);
```

**Use Cases:**

- Research documentation discovery
- Knowledge base browsing
- Topic exploration
- Recent updates tracking

---

#### 11. Research by Topic Resource

**URI:** `adr://research/{topic}`

**Purpose:** Topic-specific research document retrieval

**Cache TTL:** 300 seconds (5 minutes)

**Example:**

```typescript
const securityResearch = await client.callTool('read_resource', {
  uri: 'adr://research/security',
});
```

---

### 🎯 Rule & Pattern Management

#### 12. Rule Catalog Resource

**URI:** `adr://rule-catalog`

**Purpose:** Comprehensive rule management with compliance tracking

**Cache TTL:** 300 seconds (5 minutes)

**Rule Sources:**

- **ADR-based rules:** Extracted from architectural decisions
- **Inferred rules:** Derived from codebase patterns
- **Custom rules:** User-defined via configuration

**Rule Types:**

- `architecture`: Patterns and structures
- `security`: Security policies
- `performance`: Optimization guidelines
- `testing`: Coverage and quality requirements
- `documentation`: Documentation standards

**Severity Levels:**

- `critical`: Violations block deployment
- `high`: Must fix before release
- `medium`: Should fix soon
- `low`: Nice to fix

**Example:**

```typescript
const rules = await client.callTool('read_resource', {
  uri: 'adr://rule-catalog',
});

console.log(`Total rules: ${rules.data.summary.total}`);
console.log(`Enabled: ${rules.data.summary.enabled}`);

// Critical security rules
const criticalSecurity = rules.data.rules.filter(
  r => r.type === 'security' && r.severity === 'critical' && r.enabled
);

console.log(`Critical security: ${criticalSecurity.length}`);
```

**Use Cases:**

- Governance enforcement
- Compliance monitoring
- Policy management
- Quality gates

---

#### 13. Rule by ID Resource

**URI:** `adr://rule/{id}`

**Purpose:** Individual rule retrieval with details

**Cache TTL:** 300 seconds (5 minutes)

---

#### 14. Rule Generation Resource

**URI:** `adr://rule-generation`

**Purpose:** AI-powered rule generation from codebase analysis

**Cache TTL:** 600 seconds (10 minutes)

---

### 🔍 Technology & Pattern Discovery

#### 15. Technology by Name Resource

**URI:** `adr://technology/{name}`

**Purpose:** Technology stack detection and usage analysis

**Cache TTL:** 600 seconds (10 minutes)

**Example:**

```typescript
const react = await client.callTool('read_resource', {
  uri: 'adr://technology/react',
});
```

---

#### 16. Pattern by Name Resource

**URI:** `adr://pattern/{name}`

**Purpose:** Architectural pattern detection and application tracking

**Cache TTL:** 600 seconds (10 minutes)

**Example:**

```typescript
const singleton = await client.callTool('read_resource', {
  uri: 'adr://pattern/singleton',
});
```

---

### 💾 Memory & Learning System

#### 17. Memory Snapshots Resource

**URI:** `adr://memory-snapshots?type={type}&projectId={id}`

**Purpose:** Knowledge graph and learning system access with temporal queries

**Cache TTL:** 60 seconds (1 minute)

**Query Parameters:**

- `type`: Snapshot type - "current", "historical", "all" (default: "current")
- `projectId`: Filter by project identifier
- `since`: ISO timestamp for historical queries
- `limit`: Maximum snapshots (default: 10, max: 100)

**Memory System Features:**

- Project analysis history with patterns/predictions
- Recommendation tracking with success metrics
- Deployment history with trend analysis
- Configuration changes and impacts
- Cross-project learning and insights

**Key Data:**

- Memory snapshots with metadata and timestamps
- Summary by memory type
- Recent analyses, recommendations, deployments
- Learned patterns and predictions
- Relationship graphs

**Example:**

```typescript
// Current snapshot
const memory = await client.callTool('read_resource', {
  uri: 'adr://memory-snapshots?type=current',
});

console.log(`Total memories: ${memory.data.summary.total}`);
console.log(`Patterns: ${memory.data.insights.patterns.length}`);

// Historical query
const historical = await client.callTool('read_resource', {
  uri: 'adr://memory-snapshots?type=historical&since=2025-10-01T00:00:00Z',
});

// Project-specific
const projectMem = await client.callTool('read_resource', {
  uri: 'adr://memory-snapshots?projectId=my-project',
});
```

**Use Cases:**

- Pattern analysis
- Predictive insights
- Learning system access
- Historical trend analysis

---

### 🔧 Internal Resources

#### 18-20. Resource Cache, Router, and Index

**Purpose:** Internal resource management infrastructure

**Cache TTL:** Varies

---

## Tool APIs

Tools provide **action-oriented operations** for analysis, generation, and system management.

### URI Pattern

Tools are invoked via the Model Context Protocol's `tools/call` method:

```typescript
await client.callTool(toolName, arguments);
```

---

### 📊 Analysis Tools

#### ADR Analysis & Validation

**1. `analyze_project_ecosystem`**

- Comprehensive project analysis with technology detection
- Returns: Architecture overview, tech stack, patterns, recommendations

**2. `validate_adr`**

- ADR structural validation with scoring
- Returns: Validation results, issues, suggestions

**3. `suggest_adrs`**

- AI-powered ADR suggestions based on codebase analysis
- Returns: Suggested decisions with priority and rationale

---

#### Code Quality & Deployment

**4. `deployment_readiness`**

- Multi-dimensional deployment readiness check
- Returns: Quality scores, test results, blockers

**5. `smart_git_push`**

- Intelligent git push with quality gates
- Returns: Push decision, blockers, override options

---

### 🔧 Generation Tools

#### ADR Generation

**6. `generate_adr_from_template`**

- Create new ADR from standard template
- Returns: ADR file path, content preview

**7. `generate_adrs_from_prd`**

- Extract and generate ADRs from PRD document
- Returns: Generated ADR list, todo.md

---

#### Rule & Configuration Generation

**8. `generate_rules`**

- Generate architectural rules from codebase analysis
- Returns: Rule catalog with severity levels

---

### 🔍 Search & Discovery

#### Research & Web Search

**9. `perform_research`**

- AI-powered research with web search integration
- Returns: Research findings, sources, insights

**10. `llm_web_search`**

- Web search with result parsing
- Returns: Search results with relevance scoring

---

### 💾 Memory & Learning

#### Knowledge Graph Access

**11. `conversation_memory`**

- Store/retrieve conversation context
- Returns: Memory entries with timestamps

**12. `memory_loading`**

- Bulk memory loading and import
- Returns: Load status, entry counts

---

### 🚀 Workflow & Orchestration

#### Interactive Tools

**13. `interactive_adr_planning`**

- Guided ADR creation workflow
- Returns: Step-by-step planning assistance

**14. `troubleshoot_guided_workflow`**

- Interactive troubleshooting assistant
- Returns: Diagnostic steps, solutions

---

#### Tool Chain Orchestration

**15. `tool_chain_orchestrator`**

- Multi-tool workflow execution
- Returns: Workflow results, execution log

---

### 🔒 Security & Compliance

**16. `content_masking`**

- Detect and mask sensitive content
- Returns: Masked content, detection log

---

### 📝 Specialized Tools

**17. `bootstrap_validation_loop`**

- Iterative ADR bootstrap validation
- Returns: Validation cycles, convergence status

**18. `expand_analysis`**

- Deep-dive analysis expansion
- Returns: Detailed findings, recommendations

**19. `research_integration`**

- Integrate research findings into documentation
- Returns: Integration status, updates

**20-27. Additional specialized tools**

- Environment analysis
- Database management
- Cloud management
- Deployment guidance
- MCP planning
- Context retrieval
- ADR review
- Research questioning

---

## Common Patterns

### 1. Error Handling

All APIs use consistent error patterns:

```typescript
try {
  const result = await client.callTool('read_resource', {
    uri: 'adr://project-status',
  });
  // Handle success
} catch (error) {
  if (error.code === 'RESOURCE_NOT_FOUND') {
    // Handle missing resource
  } else if (error.code === 'INVALID_PARAMS') {
    // Handle invalid parameters
  } else {
    // Handle general error
  }
}
```

**Common Error Codes:**

- `RESOURCE_NOT_FOUND`: Resource doesn't exist
- `INVALID_PARAMS`: Invalid or missing parameters
- `RESOURCE_GENERATION_ERROR`: Failed to generate resource
- `MCP_ADR_ERROR`: General MCP server error

---

### 2. Caching Strategy

Resources implement automatic caching with ETags:

```typescript
// First call - generates and caches
const result1 = await client.callTool('read_resource', {
  uri: 'adr://project-metrics',
});
// Cache miss, takes 5-10 seconds

// Second call within TTL - returns cached
const result2 = await client.callTool('read_resource', {
  uri: 'adr://project-metrics',
});
// Cache hit, returns instantly

// ETag validation
if (result2.etag === previousETag) {
  console.log('Data unchanged since last fetch');
}
```

**Cache TTL by Resource Type:**

- Real-time status: 60-120 seconds
- Metrics/Analysis: 300 seconds (5 min)
- Static content: 600 seconds (10 min)

---

### 3. Query Parameter Patterns

Standard query parameter conventions:

```typescript
// Boolean parameters (default usually true)
'adr://deployment-status?strict=false';

// Enum parameters
'adr://code-quality?scope=changes&format=summary';

// Numeric parameters
'adr://memory-snapshots?limit=50';

// ISO timestamp parameters
'adr://deployment-history?since=2025-10-01T00:00:00Z';

// Path parameters
'adr://adr/001?projectPath=/custom/path';
```

---

## Best Practices

### 1. Resource Selection

**Use Resources When:**

- ✅ Reading data
- ✅ Need caching
- ✅ Frequent access
- ✅ Dashboard displays
- ✅ Monitoring/metrics

**Use Tools When:**

- ✅ Performing actions
- ✅ Generating content
- ✅ Modifying state
- ✅ Complex workflows
- ✅ AI-powered operations

---

### 2. Performance Optimization

```typescript
// ✅ Good: Parallel resource fetching
const [status, metrics, quality] = await Promise.all([
  client.callTool('read_resource', { uri: 'adr://project-status' }),
  client.callTool('read_resource', { uri: 'adr://project-metrics' }),
  client.callTool('read_resource', { uri: 'adr://code-quality' }),
]);

// ❌ Bad: Sequential fetching
const status = await client.callTool('read_resource', { uri: 'adr://project-status' });
const metrics = await client.callTool('read_resource', { uri: 'adr://project-metrics' });
const quality = await client.callTool('read_resource', { uri: 'adr://code-quality' });
```

---

### 3. Error Resilience

```typescript
// ✅ Good: Graceful degradation
async function getProjectHealth() {
  try {
    const status = await client.callTool('read_resource', {
      uri: 'adr://project-status',
    });
    return status.data.overallHealth;
  } catch (error) {
    console.warn('Failed to get status, using fallback');
    return 'unknown';
  }
}

// ✅ Good: Retry with exponential backoff
async function retryFetch(uri, maxRetries = 3) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await client.callTool('read_resource', { uri });
    } catch (error) {
      if (i === maxRetries - 1) throw error;
      await new Promise(resolve => setTimeout(resolve, 1000 * Math.pow(2, i)));
    }
  }
}
```

---

### 4. Data Freshness

```typescript
// Check cache freshness
const result = await client.callTool('read_resource', {
  uri: 'adr://project-metrics',
});

const age = Date.now() - new Date(result.lastModified).getTime();
const isFresh = age < result.ttl * 1000;

if (!isFresh) {
  console.log('Data may be stale, consider refetch');
}
```

---

## Examples by Use Case

### Dashboard Display

```typescript
async function buildDashboard() {
  // Fetch all dashboard data in parallel
  const [status, metrics, deploymentStatus, rules] = await Promise.all([
    client.callTool('read_resource', { uri: 'adr://project-status' }),
    client.callTool('read_resource', { uri: 'adr://project-metrics' }),
    client.callTool('read_resource', { uri: 'adr://deployment-status' }),
    client.callTool('read_resource', { uri: 'adr://rule-catalog' }),
  ]);

  return {
    health: status.data.overallHealth,
    quality: metrics.data.quality.overallScore,
    readiness: deploymentStatus.data.deploymentReadiness.score,
    compliance: (rules.data.summary.enabled / rules.data.summary.total) * 100,
  };
}
```

---

### CI/CD Quality Gate

```typescript
async function checkQualityGate() {
  const status = await client.callTool('read_resource', {
    uri: 'adr://deployment-status?environment=production&strict=true',
  });

  if (status.data.gitPushStatus?.decision === 'blocked') {
    console.error('❌ Quality gate failed');
    console.error('Blockers:', status.data.deploymentReadiness.blockers);
    process.exit(1);
  }

  console.log('✅ Quality gate passed');
  console.log(`Readiness: ${status.data.deploymentReadiness.score}%`);
}
```

---

### Progress Tracking

```typescript
async function trackProgress() {
  const [todos, adrs, research] = await Promise.all([
    client.callTool('read_resource', { uri: 'adr://todo-list' }),
    client.callTool('read_resource', { uri: 'adr://project-metrics' }),
    client.callTool('read_resource', { uri: 'adr://research-index' }),
  ]);

  const completionRate = (todos.data.summary.completed / todos.data.summary.total) * 100;
  const adrCount = adrs.data.architecture.adrCount;
  const researchDocs = research.data.summary.total;

  console.log(`
    📊 Progress Report
    ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    Tasks Complete: ${completionRate.toFixed(1)}%
    ADRs Documented: ${adrCount}
    Research Docs: ${researchDocs}
  `);
}
```

---

### Research Discovery

```typescript
async function findRelevantResearch(topic) {
  const research = await client.callTool('read_resource', {
    uri: 'adr://research-index',
  });

  return research.data.documents
    .filter(doc => doc.topic === topic || doc.title.toLowerCase().includes(topic))
    .sort((a, b) => new Date(b.lastModified) - new Date(a.lastModified));
}
```

---

## Additional Resources

- **[Installation Guide](../tutorials/01-first-steps.md)** - Getting started
- **[MCP Client Configuration](./mcp-client-config.md)** - Client setup
- **[Environment Configuration](./environment-config.md)** - Environment variables
- **[Troubleshooting Guide](../how-to-guides/troubleshooting.md)** - Common issues
- **[Contributing Guide](https://github.com/tosin2013/mcp-adr-analysis-server/blob/main/CONTRIBUTING.md)** - How to contribute

---

## Support

- **Issues:** [GitHub Issues](https://github.com/tosin2013/mcp-adr-analysis-server/issues)
- **Discussions:** [GitHub Discussions](https://github.com/tosin2013/mcp-adr-analysis-server/discussions)
- **Documentation:** [Full Documentation](../diataxis-index.md)

---

**Last Updated:** October 12, 2025  
**Version:** 2.0.22+  
**License:** MIT
