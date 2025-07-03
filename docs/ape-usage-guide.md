# APE Framework Usage Guide

## Overview

The Automatic Prompt Engineer (APE) framework provides intelligent prompt optimization capabilities for MCP ADR Analysis Server tools. This guide demonstrates how to integrate APE optimization into tools and configure optimization parameters.

## Quick Start

### Basic APE Optimization
```typescript
import { optimizePromptWithAPE } from '../utils/ape-framework.js';

// Optimize a prompt for better performance
const optimizationResult = await optimizePromptWithAPE(
  originalPrompt,
  {
    candidateCount: 5,
    evaluationCriteria: ['task-completion', 'clarity', 'specificity'],
    optimizationRounds: 2,
    selectionStrategy: 'multi-criteria'
  }
);

// Use the optimized prompt
const enhancedPrompt = optimizationResult.optimizedPrompt;
```

### Tool Integration Example
```typescript
// Example: APE-enhanced ADR suggestion tool
export async function generateOptimizedAdrSuggestions(context: any) {
  // Step 1: Create base prompt
  const basePrompt = createAdrSuggestionPrompt(context);
  
  // Step 2: Apply APE optimization
  const apeResult = await optimizePromptWithAPE(
    basePrompt,
    {
      candidateCount: 7,
      evaluationCriteria: ['task-completion', 'specificity', 'clarity', 'robustness'],
      optimizationRounds: 3,
      selectionStrategy: 'multi-criteria',
      cacheEnabled: true
    }
  );
  
  // Step 3: Return optimized prompt for AI execution
  return {
    content: [{
      type: 'text',
      text: apeResult.optimizedPrompt.prompt
    }],
    metadata: {
      apeOptimization: {
        improvementScore: apeResult.improvementScore,
        candidatesEvaluated: apeResult.candidatesEvaluated,
        optimizationTime: apeResult.totalOptimizationTime
      }
    }
  };
}
```

## Configuration Options

### APE Configuration
```typescript
interface APEConfig {
  candidateCount: number;           // Number of candidates to generate (1-20)
  evaluationCriteria: EvaluationCriterion[];
  optimizationRounds: number;       // Number of optimization iterations (1-10)
  selectionStrategy: SelectionStrategy;
  cacheEnabled: boolean;
  performanceTracking: boolean;
  maxOptimizationTime: number;      // Maximum time in milliseconds
  qualityThreshold: number;         // Minimum quality score (0-1)
  diversityWeight: number;          // Weight for candidate diversity (0-1)
}
```

### Evaluation Criteria Options
```typescript
type EvaluationCriterion =
  | 'task-completion'     // How well the prompt achieves the intended task
  | 'clarity'            // How clear and unambiguous the prompt is
  | 'specificity'        // How specific and actionable the prompt is
  | 'robustness'         // How well the prompt handles edge cases
  | 'efficiency'         // How concise yet comprehensive the prompt is
  | 'context-awareness'; // How well the prompt fits the specific context
```

### Selection Strategy Options
```typescript
type SelectionStrategy =
  | 'highest-score'      // Select candidate with highest overall score
  | 'multi-criteria'     // Balance multiple evaluation criteria
  | 'ensemble'          // Combine strengths of multiple candidates
  | 'context-aware'     // Choose based on context-specific suitability
  | 'balanced';         // Balance quality and diversity
```

## Tool-Specific Configurations

### ADR Generation Tools
```typescript
const adrOptimizationConfig: APEConfig = {
  candidateCount: 7,
  evaluationCriteria: ['task-completion', 'specificity', 'clarity', 'robustness'],
  optimizationRounds: 3,
  selectionStrategy: 'multi-criteria',
  cacheEnabled: true,
  performanceTracking: true,
  maxOptimizationTime: 180000, // 3 minutes
  qualityThreshold: 0.7,
  diversityWeight: 0.3
};
```

### Analysis Tools
```typescript
const analysisOptimizationConfig: APEConfig = {
  candidateCount: 5,
  evaluationCriteria: ['task-completion', 'clarity', 'context-awareness'],
  optimizationRounds: 2,
  selectionStrategy: 'context-aware',
  cacheEnabled: true,
  performanceTracking: true,
  maxOptimizationTime: 120000, // 2 minutes
  qualityThreshold: 0.6,
  diversityWeight: 0.4
};
```

### Research Tools
```typescript
const researchOptimizationConfig: APEConfig = {
  candidateCount: 6,
  evaluationCriteria: ['task-completion', 'specificity', 'efficiency'],
  optimizationRounds: 2,
  selectionStrategy: 'balanced',
  cacheEnabled: true,
  performanceTracking: true,
  maxOptimizationTime: 150000, // 2.5 minutes
  qualityThreshold: 0.65,
  diversityWeight: 0.35
};
```

## Usage Patterns

### Pattern 1: Real-time Optimization
```typescript
// For tools that need immediate optimization
const quickConfig: APEConfig = {
  candidateCount: 3,
  evaluationCriteria: ['task-completion', 'clarity'],
  optimizationRounds: 1,
  selectionStrategy: 'highest-score',
  cacheEnabled: true,
  maxOptimizationTime: 60000 // 1 minute
};
```

### Pattern 2: Comprehensive Optimization
```typescript
// For tools where quality is more important than speed
const comprehensiveConfig: APEConfig = {
  candidateCount: 10,
  evaluationCriteria: ['task-completion', 'clarity', 'specificity', 'robustness', 'efficiency'],
  optimizationRounds: 5,
  selectionStrategy: 'multi-criteria',
  cacheEnabled: true,
  maxOptimizationTime: 300000 // 5 minutes
};
```

### Pattern 3: Context-Specific Optimization
```typescript
// For tools that need context-aware optimization
const contextAwareConfig: APEConfig = {
  candidateCount: 6,
  evaluationCriteria: ['task-completion', 'context-awareness', 'specificity'],
  optimizationRounds: 3,
  selectionStrategy: 'context-aware',
  cacheEnabled: true,
  maxOptimizationTime: 180000 // 3 minutes
};
```

## Performance Considerations

### Optimization Time vs Quality Trade-offs
- **Quick Optimization** (1-2 minutes): 3-5 candidates, 1-2 rounds
- **Balanced Optimization** (2-3 minutes): 5-7 candidates, 2-3 rounds
- **Comprehensive Optimization** (3-5 minutes): 7-10 candidates, 3-5 rounds

### Caching Strategy
```typescript
// Enable caching for frequently used prompts
const cachedConfig: APEConfig = {
  cacheEnabled: true,
  // Cache TTL is automatically managed based on prompt type
  // ADR prompts: 24 hours
  // Analysis prompts: 6 hours
  // Research prompts: 12 hours
};
```

### Resource Management
```typescript
// Configure resource limits
const resourceOptimizedConfig: APEConfig = {
  candidateCount: 5,
  maxOptimizationTime: 120000, // 2 minutes max
  qualityThreshold: 0.6,       // Accept good enough results
  diversityWeight: 0.3         // Focus more on quality than diversity
};
```

## Monitoring and Feedback

### Performance Tracking
```typescript
// Enable performance tracking to monitor optimization effectiveness
const trackedConfig: APEConfig = {
  performanceTracking: true,
  // Automatically collects:
  // - Optimization time
  // - Improvement scores
  // - Success rates
  // - Resource usage
};
```

### Accessing Optimization Metrics
```typescript
// Get optimization performance metrics
const metrics = await getAPEPerformanceMetrics();
console.log('APE Performance:', {
  averageImprovementScore: metrics.averageImprovementScore,
  optimizationSuccessRate: metrics.successRate,
  averageOptimizationTime: metrics.averageOptimizationTime,
  cacheHitRate: metrics.cacheHitRate
});
```

## Error Handling and Fallbacks

### Graceful Degradation
```typescript
async function optimizePromptSafely(
  originalPrompt: PromptObject,
  config: APEConfig
): Promise<PromptObject> {
  try {
    const result = await optimizePromptWithAPE(originalPrompt, config);
    return result.optimizedPrompt;
  } catch (error) {
    console.warn('APE optimization failed, using original prompt:', error);
    return originalPrompt; // Fallback to original
  }
}
```

### Timeout Handling
```typescript
const timeoutSafeConfig: APEConfig = {
  maxOptimizationTime: 120000, // 2 minutes
  qualityThreshold: 0.5,       // Lower threshold for timeout scenarios
  // If optimization times out, return best candidate found so far
};
```

## Best Practices

### 1. Configuration Selection
- **High-frequency tools**: Use quick optimization with caching
- **Critical tools**: Use comprehensive optimization
- **Context-sensitive tools**: Use context-aware selection

### 2. Evaluation Criteria Selection
- **Always include**: `task-completion` (core requirement)
- **For user-facing tools**: Add `clarity` and `specificity`
- **For complex tasks**: Add `robustness` and `efficiency`
- **For domain-specific tools**: Add `context-awareness`

### 3. Performance Optimization
- Enable caching for repeated optimizations
- Set appropriate time limits based on tool usage patterns
- Monitor optimization metrics to tune configurations
- Use fallback strategies for critical tools

### 4. Quality Assurance
- Set quality thresholds based on tool requirements
- Monitor improvement scores to validate optimization effectiveness
- Collect user feedback on optimized prompts
- Regularly review and update optimization configurations

## Integration Examples

### Example 1: ADR Suggestion Tool
```typescript
export async function suggestAdrsWithAPE(context: any) {
  const basePrompt = createAdrSuggestionPrompt(context);
  
  const apeResult = await optimizePromptWithAPE(basePrompt, {
    candidateCount: 6,
    evaluationCriteria: ['task-completion', 'specificity', 'clarity'],
    optimizationRounds: 2,
    selectionStrategy: 'multi-criteria',
    cacheEnabled: true,
    qualityThreshold: 0.7
  });
  
  return {
    content: [{ type: 'text', text: apeResult.optimizedPrompt.prompt }],
    metadata: { apeOptimization: apeResult.metadata }
  };
}
```

### Example 2: Research Question Generation
```typescript
export async function generateResearchQuestionsWithAPE(context: any) {
  const basePrompt = createResearchQuestionPrompt(context);
  
  const apeResult = await optimizePromptWithAPE(basePrompt, {
    candidateCount: 5,
    evaluationCriteria: ['task-completion', 'specificity', 'efficiency'],
    optimizationRounds: 2,
    selectionStrategy: 'balanced',
    cacheEnabled: true,
    qualityThreshold: 0.65
  });
  
  return {
    content: [{ type: 'text', text: apeResult.optimizedPrompt.prompt }],
    metadata: { apeOptimization: apeResult.metadata }
  };
}
```

This usage guide provides comprehensive guidance for integrating APE optimization into MCP tools while maintaining the 100% prompt-driven architecture and ensuring optimal performance.
