# Developer Guidance: Research-Driven Architecture

## Overview

This document provides technical guidance for developers working on the research-driven MCP tool architecture. It outlines implementation patterns, integration requirements, and development best practices.

## Architecture Components

### 1. ResearchOrchestrator

**Location**: `src/utils/research-orchestrator.ts`

**Purpose**: Main coordinator for cascading research through multiple sources.

**Key Implementation Patterns**:

```typescript
export class ResearchOrchestrator {
  private confidenceThreshold: number = 0.6;
  
  async answerResearchQuestion(question: string): Promise<ResearchAnswer> {
    try {
      // 1. Search project files
      const projectData = await this.searchProjectFiles(question);
      
      // 2. Query knowledge graph
      const knowledgeData = await this.queryKnowledgeGraph(question);
      
      // 3. Query environment resources
      const environmentData = await this.queryEnvironmentResources(question);
      
      // 4. Determine if web search needed
      const needsWebSearch = this.calculateConfidence() < this.confidenceThreshold;
      
      return this.synthesizeAnswer(projectData, knowledgeData, environmentData);
    } catch (error) {
      throw new Error(`Failed to answer research question: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
}
```

**Integration Requirements**:
- Must handle cascading fallback gracefully
- Should provide confidence scoring for each source
- Must support configurable confidence thresholds
- Should include comprehensive error handling

### 2. EnvironmentCapabilityRegistry

**Location**: `src/utils/environment-capability-registry.ts`

**Purpose**: Auto-detects and queries runtime environment resources.

**Key Implementation Patterns**:

```typescript
export class EnvironmentCapabilityRegistry {
  private capabilities: Map<string, EnvironmentCapability> = new Map();
  
  async discoverCapabilities(): Promise<void> {
    try {
      const capabilityDetectors = [
        { name: 'kubernetes', detector: this.detectKubernetes },
        { name: 'openshift', detector: this.detectOpenShift },
        { name: 'docker', detector: this.detectDocker },
        { name: 'podman', detector: this.detectPodman },
        { name: 'ansible', detector: this.detectAnsible }
      ];
      
      for (const { name, detector } of capabilityDetectors) {
        try {
          const available = await detector();
          if (available) {
            this.capabilities.set(name, await this.createCapability(name));
          }
        } catch (error) {
          this.logger.warn(`Failed to detect ${name}: ${error instanceof Error ? error.message : String(error)}`);
        }
      }
    } catch (error) {
      throw new Error(`Failed to discover capabilities: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
  
  async query(question: string): Promise<EnvironmentQueryResult> {
    try {
      const relevantCapabilities = this.findRelevantCapabilities(question);
      const results = await Promise.all(
        relevantCapabilities.map(cap => cap.query(question))
      );
      return this.mergeResults(results);
    } catch (error) {
      throw new Error(`Failed to query environment capabilities: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
}
```

**Integration Requirements**:
- Must auto-detect available tools without configuration
- Should gracefully handle missing tools
- Must provide structured query results
- Should support Red Hat ecosystem tools (OpenShift, Podman, Ansible)

### 3. Research Tools Integration

**Pattern**: All research tools should follow this integration pattern:

```typescript
export async function yourResearchTool(args: YourToolArgs): Promise<any> {
  try {
    // 1. Validate input
    const validatedArgs = YourToolSchema.parse(args);
    
    // 2. Create research orchestrator
    const orchestrator = new ResearchOrchestrator(
      validatedArgs.projectPath,
      validatedArgs.adrDirectory
    );
    
    // 3. Set confidence threshold if provided
    if (validatedArgs.confidenceThreshold) {
      orchestrator.setConfidenceThreshold(validatedArgs.confidenceThreshold);
    }
    
    // 4. Perform research
    const research = await orchestrator.answerResearchQuestion(
      validatedArgs.question
    );
    
    // 5. Format response
    return formatResearchResponse(research);
    
  } catch (error) {
    throw new McpAdrError(
      `Research tool failed: ${error.message}`,
      'RESEARCH_ERROR'
    );
  }
}
```

## Integration Checklist

### For New Research Tools

- [ ] **Input Validation**: Use Zod schemas for parameter validation
- [ ] **Research Orchestrator**: Integrate with `ResearchOrchestrator`
- [ ] **Confidence Thresholding**: Support configurable confidence levels
- [ ] **Error Handling**: Use `McpAdrError` for consistent error reporting
- [ ] **Response Formatting**: Follow MCP response format standards
- [ ] **Logging**: Use `EnhancedLogger` for structured logging
- [ ] **Testing**: Include unit tests for research functionality
- [ ] **Documentation**: Document parameters and usage examples

### For Existing Tools (Research Integration)

- [ ] **Research Integration**: Add `ResearchOrchestrator` dependency
- [ ] **Environment Queries**: Integrate with `EnvironmentCapabilityRegistry`
- [ ] **Confidence Scoring**: Add confidence-based decision making
- [ ] **Source Attribution**: Include source information in responses
- [ ] **Fallback Logic**: Implement cascading source fallback
- [ ] **Performance**: Ensure sub-second response times for local sources
- [ ] **Caching**: Implement appropriate caching for environment queries
- [ ] **Monitoring**: Add metrics for research performance

## Development Patterns

### 1. Source Query Pattern

```typescript
async function querySource(question: string, sourceType: string): Promise<SourceResult> {
  const startTime = Date.now();
  
  try {
    this.logger.info(`Querying ${sourceType} for: "${question}"`);
    
    const result = await this.performSourceQuery(question);
    
    const duration = Date.now() - startTime;
    this.logger.info(`${sourceType} query completed in ${duration}ms`);
    
    return {
      found: result.data.length > 0,
      data: result.data,
      confidence: result.confidence,
      duration,
      sourceType
    };
    
  } catch (error) {
    this.logger.error(`${sourceType} query failed: ${error.message}`);
    return {
      found: false,
      data: null,
      confidence: 0,
      duration: Date.now() - startTime,
      sourceType,
      error: error.message
    };
  }
}
```

### 2. Confidence Calculation Pattern

```typescript
function calculateConfidence(sources: SourceResult[]): number {
  if (sources.length === 0) return 0;
  
  // Weight sources by reliability and speed
  const weights = {
    project_files: 0.4,
    knowledge_graph: 0.3,
    environment: 0.2,
    web_search: 0.1
  };
  
  let weightedSum = 0;
  let totalWeight = 0;
  
  for (const source of sources) {
    if (source.found) {
      const weight = weights[source.sourceType] || 0.1;
      weightedSum += source.confidence * weight;
      totalWeight += weight;
    }
  }
  
  return totalWeight > 0 ? weightedSum / totalWeight : 0;
}
```

### 3. Response Formatting Pattern

```typescript
function formatResearchResponse(research: ResearchAnswer): any {
  const response = {
    content: [
      {
        type: 'text',
        text: `# Research Results: ${research.question}

## Summary
${research.answer || 'No conclusive answer found from available sources.'}

## Confidence Score: ${(research.confidence * 100).toFixed(1)}%

## Sources Consulted
${formatSources(research.sources)}

## Research Metadata
- **Duration**: ${research.metadata.duration}ms
- **Sources Queried**: ${research.metadata.sourcesQueried.join(', ')}
- **Files Analyzed**: ${research.metadata.filesAnalyzed}
- **Overall Confidence**: ${(research.confidence * 100).toFixed(1)}%

## Next Steps
${generateNextSteps(research.confidence, research.sources)}`
      }
    ]
  };
  
  return response;
}
```

## Environment Capability Development

### Adding New Environment Capabilities

1. **Implement Capability Interface**:

```typescript
interface EnvironmentCapability {
  name: string;
  type: 'container' | 'orchestration' | 'automation' | 'monitoring' | 'custom';
  detector: () => Promise<boolean>;
  executor: (query: string) => Promise<CapabilityResult>;
  metadata: {
    version?: string;
    description: string;
    commands: string[];
  };
}
```

2. **Add Detection Logic**:

```typescript
async function detectYourCapability(): Promise<boolean> {
  try {
    const result = await execAsync('your-tool --version');
    return result.stdout.includes('your-tool');
  } catch {
    return false;
  }
}
```

3. **Implement Query Logic**:

```typescript
async function queryYourCapability(question: string): Promise<CapabilityResult> {
  // Parse question to determine relevant queries
  const queries = parseQuestion(question);
  
  const results = await Promise.all(
    queries.map(query => executeQuery(query))
  );
  
  return {
    found: results.some(r => r.found),
    data: results,
    confidence: calculateConfidence(results),
    metadata: {
      capability: 'your-capability',
      queries: queries.length,
      timestamp: new Date().toISOString()
    }
  };
}
```

4. **Register in Capability Registry**:

```typescript
// In EnvironmentCapabilityRegistry.discoverCapabilities()
const yourCapability = {
  name: 'your-capability',
  type: 'custom',
  detector: detectYourCapability,
  executor: queryYourCapability,
  metadata: {
    description: 'Your custom capability description',
    commands: ['your-tool --version', 'your-tool query']
  }
};

if (await yourCapability.detector()) {
  this.capabilities.set('your-capability', yourCapability);
}
```

## Testing Patterns

### 1. Research Orchestrator Tests

```typescript
describe('ResearchOrchestrator', () => {
  let orchestrator: ResearchOrchestrator;
  
  beforeEach(() => {
    orchestrator = new ResearchOrchestrator('/test/project', './adrs');
  });
  
  it('should cascade through sources correctly', async () => {
    const result = await orchestrator.answerResearchQuestion(
      'What container technology is used?'
    );
    
    expect(result.sources).toHaveLength(3); // project, knowledge, environment
    expect(result.confidence).toBeGreaterThan(0);
    expect(result.metadata.sourcesQueried).toContain('project_files');
  });
  
  it('should handle low confidence gracefully', async () => {
    orchestrator.setConfidenceThreshold(0.9);
    
    const result = await orchestrator.answerResearchQuestion(
      'What is the meaning of life?'
    );
    
    expect(result.needsWebSearch).toBe(true);
    expect(result.confidence).toBeLessThan(0.9);
  });
});
```

### 2. Environment Capability Tests

```typescript
describe('EnvironmentCapabilityRegistry', () => {
  let registry: EnvironmentCapabilityRegistry;
  
  beforeEach(async () => {
    registry = new EnvironmentCapabilityRegistry();
    await registry.discoverCapabilities();
  });
  
  it('should detect available capabilities', () => {
    const capabilities = registry.listCapabilities();
    expect(capabilities.length).toBeGreaterThan(0);
  });
  
  it('should query relevant capabilities', async () => {
    const result = await registry.query('What containers are running?');
    
    expect(result.found).toBe(true);
    expect(result.data).toBeDefined();
  });
});
```

## Performance Considerations

### 1. Response Time Targets

- **Project file search**: <100ms
- **Knowledge graph query**: <50ms
- **Environment query**: 100-500ms
- **Web search**: 1-3s (fallback only)

### 2. Caching Strategy

```typescript
class ResearchCache {
  private cache = new Map<string, CachedResult>();
  private ttl = 5 * 60 * 1000; // 5 minutes
  
  get(key: string): CachedResult | null {
    const cached = this.cache.get(key);
    if (cached && Date.now() - cached.timestamp < this.ttl) {
      return cached;
    }
    this.cache.delete(key);
    return null;
  }
  
  set(key: string, result: any): void {
    this.cache.set(key, {
      data: result,
      timestamp: Date.now()
    });
  }
}
```

### 3. Parallel Query Execution

```typescript
async function queryMultipleSources(question: string): Promise<SourceResult[]> {
  const queries = [
    this.queryProjectFiles(question),
    this.queryKnowledgeGraph(question),
    this.queryEnvironment(question)
  ];
  
  const results = await Promise.allSettled(queries);
  
  return results
    .filter(result => result.status === 'fulfilled')
    .map(result => (result as PromiseFulfilledResult<SourceResult>).value);
}
```

## Error Handling Patterns

### 1. Graceful Degradation

```typescript
async function queryWithFallback(question: string): Promise<SourceResult> {
  try {
    return await this.primaryQuery(question);
  } catch (error) {
    this.logger.warn(`Primary query failed: ${error.message}`);
    
    try {
      return await this.fallbackQuery(question);
    } catch (fallbackError) {
      this.logger.error(`Fallback query failed: ${fallbackError.message}`);
      return {
        found: false,
        data: null,
        confidence: 0,
        error: 'All query methods failed'
      };
    }
  }
}
```

### 2. Error Recovery

```typescript
async function resilientQuery(question: string, maxRetries = 3): Promise<SourceResult> {
  let lastError: Error;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await this.performQuery(question);
    } catch (error) {
      lastError = error;
      this.logger.warn(`Query attempt ${attempt} failed: ${error.message}`);
      
      if (attempt < maxRetries) {
        await this.delay(1000 * attempt); // Exponential backoff
      }
    }
  }
  
  throw new McpAdrError(
    `Query failed after ${maxRetries} attempts: ${lastError.message}`,
    'QUERY_FAILED'
  );
}
```

## Monitoring and Observability

### 1. Metrics Collection

```typescript
class ResearchMetrics {
  private metrics = {
    queriesTotal: 0,
    queriesBySource: new Map<string, number>(),
    averageResponseTime: 0,
    confidenceDistribution: new Map<string, number>(),
    errorsTotal: 0
  };
  
  recordQuery(source: string, duration: number, confidence: number, success: boolean): void {
    this.metrics.queriesTotal++;
    this.metrics.queriesBySource.set(
      source, 
      (this.metrics.queriesBySource.get(source) || 0) + 1
    );
    
    if (!success) {
      this.metrics.errorsTotal++;
    }
    
    // Update average response time
    this.metrics.averageResponseTime = 
      (this.metrics.averageResponseTime + duration) / 2;
    
    // Record confidence distribution
    const confidenceBucket = Math.floor(confidence * 10) / 10;
    this.metrics.confidenceDistribution.set(
      confidenceBucket.toString(),
      (this.metrics.confidenceDistribution.get(confidenceBucket.toString()) || 0) + 1
    );
  }
  
  getMetrics(): ResearchMetricsData {
    return {
      ...this.metrics,
      queriesBySource: Object.fromEntries(this.metrics.queriesBySource),
      confidenceDistribution: Object.fromEntries(this.metrics.confidenceDistribution)
    };
  }
}
```

### 2. Logging Patterns

```typescript
class ResearchLogger {
  private logger: EnhancedLogger;
  
  constructor() {
    this.logger = new EnhancedLogger();
  }
  
  logResearchStart(question: string): void {
    this.logger.info(`Starting research: "${question}"`, 'ResearchOrchestrator');
  }
  
  logSourceQuery(source: string, question: string, duration: number): void {
    this.logger.info(
      `Source query completed: ${source} in ${duration}ms`,
      'ResearchOrchestrator',
      { source, question, duration }
    );
  }
  
  logResearchComplete(question: string, confidence: number, sources: string[]): void {
    this.logger.info(
      `Research completed: confidence=${confidence}, sources=[${sources.join(', ')}]`,
      'ResearchOrchestrator',
      { question, confidence, sources }
    );
  }
}
```

## Deployment Considerations

### 1. Environment Requirements

- **Node.js**: 18+ (for native fetch support)
- **System Tools**: kubectl, oc, docker, podman, ansible (optional)
- **Permissions**: Read access to project files, execute permissions for system tools
- **Network**: Internet access for web search fallback

### 2. Configuration

```typescript
interface ResearchConfig {
  confidenceThreshold: number;
  enableWebSearch: boolean;
  cacheEnabled: boolean;
  cacheTtl: number;
  maxConcurrentQueries: number;
  timeoutMs: number;
  environmentCapabilities: string[];
}

const defaultConfig: ResearchConfig = {
  confidenceThreshold: 0.6,
  enableWebSearch: true,
  cacheEnabled: true,
  cacheTtl: 5 * 60 * 1000, // 5 minutes
  maxConcurrentQueries: 3,
  timeoutMs: 30000, // 30 seconds
  environmentCapabilities: ['kubernetes', 'openshift', 'docker', 'podman', 'ansible']
};
```

### 3. Health Checks

```typescript
async function healthCheck(): Promise<HealthStatus> {
  const checks = await Promise.allSettled([
    checkProjectFiles(),
    checkKnowledgeGraph(),
    checkEnvironmentCapabilities(),
    checkWebSearch()
  ]);
  
  const status: HealthStatus = {
    healthy: true,
    checks: {}
  };
  
  checks.forEach((check, index) => {
    const checkName = ['project_files', 'knowledge_graph', 'environment', 'web_search'][index];
    status.checks[checkName] = {
      healthy: check.status === 'fulfilled',
      error: check.status === 'rejected' ? check.reason.message : undefined
    };
    
    if (check.status === 'rejected') {
      status.healthy = false;
    }
  });
  
  return status;
}
```

## Future Enhancements

### 1. Cloud Provider Integration

- AWS (ECS, EKS, EC2)
- Azure (AKS, Container Instances)
- GCP (GKE, Cloud Run)

### 2. Database Capabilities

- PostgreSQL introspection
- MongoDB queries
- Redis info

### 3. API Capabilities

- REST endpoint discovery
- GraphQL schema inspection
- gRPC service discovery

### 4. Smart Caching

- Cache environment queries
- Invalidate on detected changes
- TTL-based refresh

## Contributing Guidelines

1. **Follow TypeScript best practices** with strict type checking
2. **Use Zod schemas** for all input validation
3. **Implement comprehensive error handling** with `McpAdrError`
4. **Add unit tests** for all new functionality
5. **Update documentation** for any API changes
6. **Follow the established logging patterns** with `EnhancedLogger`
7. **Ensure performance targets** are met for response times
8. **Test with Red Hat ecosystem tools** (OpenShift, Podman, Ansible)

## Resources

- [Research-Driven Architecture](./RESEARCH-DRIVEN-ARCHITECTURE.md)
- [API Reference](./reference/api-reference.md)
- [Research Workflow Guide](./how-to-guides/research-driven-workflow.md)
- [Testing Guide](./TESTING_GUIDE.md)
- [Contributing Guidelines](../CONTRIBUTING.md)
