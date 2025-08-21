# Knowledge Generation Framework - Usage Guide

## Overview

The Knowledge Generation framework enhances MCP tools by generating domain-specific architectural knowledge before making decisions. This guide provides practical examples and integration patterns for tool developers.

## Quick Start

### Basic Knowledge Generation
```typescript
import { generateArchitecturalKnowledge } from '../utils/knowledge-generation.js';

// Generate knowledge for web applications
const result = await generateArchitecturalKnowledge(
  { 
    projectPath: './my-project',
    technologies: ['React', 'TypeScript', 'Node.js']
  },
  {
    domains: ['web-applications', 'api-design'],
    depth: 'intermediate',
    cacheEnabled: true
  }
);

// Use the enhanced prompt
const enhancedPrompt = result.enhancedPrompt;
```

### Integration with Existing Tools
```typescript
// In suggest_adrs tool
export async function generateAdrSuggestions(context: any) {
  // Step 1: Generate domain knowledge
  const knowledgeResult = await generateArchitecturalKnowledge(
    context.architecturalContext,
    {
      domains: ['web-applications', 'microservices'],
      depth: 'advanced',
      cacheEnabled: true,
      cacheTTL: 3600
    }
  );

  // Step 2: Combine with original prompt
  const originalPrompt = createAdrSuggestionPrompt(context);
  const enhancedPrompt = combinePrompts(
    knowledgeResult.knowledgePrompt,
    originalPrompt
  );

  // Step 3: Return enhanced prompt for AI execution
  return {
    content: [{
      type: 'text',
      text: enhancedPrompt.prompt
    }]
  };
}
```

## Configuration Options

### Knowledge Generation Config
```typescript
interface KnowledgeGenerationConfig {
  domains?: ArchitecturalDomain[];           // Target domains
  depth?: 'basic' | 'intermediate' | 'advanced';  // Knowledge depth
  cacheEnabled?: boolean;                    // Enable caching
  cacheTTL?: number;                        // Cache time-to-live (seconds)
  securityValidation?: boolean;             // Enable security checks
  maxKnowledgeItems?: number;               // Limit knowledge items
  relevanceThreshold?: number;              // Minimum relevance (0-1)
  parallelGeneration?: boolean;             // Generate domains in parallel
}
```

### Tool-Specific Configuration
```typescript
interface ToolKnowledgeConfig {
  enableKnowledgeGeneration: boolean;
  domains: ArchitecturalDomain[];
  knowledgeDepth: 'basic' | 'intermediate' | 'advanced';
  cacheStrategy: 'aggressive' | 'moderate' | 'minimal';
  autoDetectDomains?: boolean;
  customKnowledgeTemplates?: string[];
}
```

## Domain Detection

### Automatic Domain Detection
```typescript
import { detectArchitecturalDomains } from '../utils/knowledge-generation.js';

const projectContext = {
  path: './project',
  technologies: ['React', 'Express', 'PostgreSQL'],
  fileTypes: ['.tsx', '.ts', '.sql'],
  packageFiles: ['package.json'],
  configFiles: ['webpack.config.js', 'tsconfig.json']
};

const detectionResult = await detectArchitecturalDomains(projectContext);
// Returns: ['web-applications', 'api-design', 'database-design']
```

### Manual Domain Selection
```typescript
const manualDomains: ArchitecturalDomain[] = [
  'microservices',
  'cloud-infrastructure',
  'security-patterns'
];

const knowledgeResult = await generateArchitecturalKnowledge(
  context,
  { domains: manualDomains }
);
```

## Integration Patterns

### Pattern 1: Knowledge-Enhanced ADR Suggestions
```typescript
// 1. Detect project domains
const domains = await detectArchitecturalDomains(projectContext);

// 2. Generate domain knowledge
const knowledge = await generateArchitecturalKnowledge(
  { projectContext, existingAdrs },
  { domains, depth: 'intermediate' }
);

// 3. Create enhanced ADR suggestion prompt
const adrPrompt = createAdrSuggestionPrompt(context);
const enhancedPrompt = combinePrompts(knowledge.knowledgePrompt, adrPrompt);

// 4. Return for AI execution
return { content: [{ type: 'text', text: enhancedPrompt.prompt }] };
```

### Pattern 2: Context-Aware Analysis
```typescript
// 1. Analyze project ecosystem
const ecosystemAnalysis = await analyzeProjectEcosystem(projectPath);

// 2. Generate relevant knowledge based on detected technologies
const relevantDomains = mapTechnologiesToDomains(ecosystemAnalysis.technologies);
const knowledge = await generateArchitecturalKnowledge(
  { technologies: ecosystemAnalysis.technologies },
  { domains: relevantDomains, depth: 'advanced' }
);

// 3. Enhance analysis with domain knowledge
const analysisPrompt = createEcosystemAnalysisPrompt(ecosystemAnalysis);
const enhancedAnalysis = combinePrompts(knowledge.knowledgePrompt, analysisPrompt);
```

### Pattern 3: Knowledge-Driven Research Questions
```typescript
// 1. Generate domain knowledge to identify gaps
const knowledge = await generateArchitecturalKnowledge(
  projectContext,
  { domains: ['web-applications', 'performance-optimization'] }
);

// 2. Create research questions based on knowledge gaps
const researchPrompt = createResearchQuestionPrompt(
  knowledge.domainKnowledge,
  projectContext
);

// 3. Combine for comprehensive research planning
const enhancedResearch = combinePrompts(knowledge.knowledgePrompt, researchPrompt);
```

## Caching Strategies

### Cache Configuration
```typescript
// Aggressive caching (best for stable knowledge)
const aggressiveConfig = {
  cacheEnabled: true,
  cacheTTL: 86400, // 24 hours
  cacheStrategy: 'aggressive'
};

// Moderate caching (balanced approach)
const moderateConfig = {
  cacheEnabled: true,
  cacheTTL: 3600, // 1 hour
  cacheStrategy: 'moderate'
};

// Minimal caching (for dynamic knowledge)
const minimalConfig = {
  cacheEnabled: true,
  cacheTTL: 300, // 5 minutes
  cacheStrategy: 'minimal'
};
```

### Cache Key Strategies
```typescript
// Domain-based caching
const domainCacheKey = `knowledge:${domains.join('+')}-${depth}`;

// Context-aware caching
const contextCacheKey = `knowledge:${hashContext(context)}-${domains.join('+')}`;

// Project-specific caching
const projectCacheKey = `knowledge:${projectId}-${domains.join('+')}-${version}`;
```

## Security and Validation

### Security Configuration
```typescript
const secureConfig = {
  securityValidation: true,
  relevanceThreshold: 0.7, // Only high-relevance knowledge
  maxKnowledgeItems: 50,   // Limit knowledge volume
  customTemplates: []      // No custom templates for security
};
```

### Validation Checks
```typescript
// Validate generated knowledge
const validationResult = await validateKnowledgeGeneration(knowledgeResult);

if (!validationResult.isValid) {
  console.warn('Knowledge validation failed:', validationResult.issues);
  // Fallback to basic knowledge or skip enhancement
}
```

## Performance Optimization

### Parallel Generation
```typescript
const config = {
  parallelGeneration: true,
  maxConcurrentDomains: 3,
  timeoutPerDomain: 5000 // 5 seconds
};
```

### Memory Management
```typescript
const performanceConfig = {
  maxKnowledgeItems: 100,
  relevanceThreshold: 0.6,
  compressionEnabled: true,
  memoryLimit: 50 * 1024 * 1024 // 50MB
};
```

## Error Handling

### Graceful Degradation
```typescript
try {
  const knowledge = await generateArchitecturalKnowledge(context, config);
  return enhancePromptWithKnowledge(originalPrompt, knowledge);
} catch (error) {
  console.warn('Knowledge generation failed, using original prompt:', error);
  return originalPrompt; // Fallback to original functionality
}
```

### Retry Strategies
```typescript
const retryConfig = {
  maxRetries: 3,
  retryDelay: 1000,
  exponentialBackoff: true,
  fallbackToCache: true
};
```

## Monitoring and Metrics

### Performance Tracking
```typescript
const metrics = await getKnowledgePerformanceMetrics();
console.log('Knowledge Generation Metrics:', {
  averageGenerationTime: metrics.generationTime,
  cacheHitRate: metrics.cacheHitRate,
  averageQuality: metrics.averageKnowledgeQuality,
  errorRate: metrics.errorRate
});
```

### Quality Assessment
```typescript
const qualityMetrics = await assessKnowledgeQuality(knowledgeResult);
if (qualityMetrics.overallScore < 0.7) {
  // Consider regenerating or using different domains
}
```

## Best Practices

### 1. Domain Selection
- Use automatic domain detection when possible
- Combine related domains for comprehensive knowledge
- Avoid too many domains to prevent information overload

### 2. Caching Strategy
- Use aggressive caching for stable architectural principles
- Use moderate caching for technology-specific knowledge
- Use minimal caching for project-specific contexts

### 3. Integration Approach
- Always provide fallback to original functionality
- Validate knowledge quality before integration
- Monitor performance impact on tool response times

### 4. Security Considerations
- Enable security validation for production use
- Set appropriate relevance thresholds
- Limit knowledge volume to prevent prompt injection

### 5. Performance Optimization
- Use parallel generation for multiple domains
- Implement proper error handling and timeouts
- Monitor memory usage and cache efficiency

This framework provides a solid foundation for enhancing MCP tools with domain-specific architectural knowledge while maintaining performance, security, and reliability standards.
