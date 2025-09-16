# Reflexion Framework Usage Guide

## Overview

The Reflexion framework enables MCP ADR Analysis Server tools to learn from mistakes through linguistic feedback and self-reflection. This guide demonstrates how to integrate Reflexion capabilities into tools and configure learning parameters for continuous improvement.

## Quick Start

### Basic Reflexion Integration

```typescript
import { executeWithReflexion } from '../utils/reflexion-framework.js';

// Execute a task with reflexion learning
const reflexionResult = await executeWithReflexion(originalPrompt, {
  memoryEnabled: true,
  reflectionDepth: 'detailed',
  evaluationCriteria: ['task-success', 'quality', 'efficiency'],
  learningRate: 0.7,
});

// Use the enhanced prompt with memory context
const enhancedPrompt = reflexionResult.enhancedPrompt;
```

### Tool Integration Example

```typescript
// Example: Reflexion-enhanced ADR suggestion tool
export async function suggestAdrsWithReflexion(context: any) {
  // Step 1: Create base prompt
  const basePrompt = createAdrSuggestionPrompt(context);

  // Step 2: Apply Reflexion learning
  const reflexionResult = await executeWithReflexion(basePrompt, {
    memoryEnabled: true,
    maxMemoryEntries: 50,
    reflectionDepth: 'comprehensive',
    evaluationCriteria: ['task-success', 'relevance', 'clarity', 'completeness'],
    learningRate: 0.8,
    memoryRetention: 90, // days
  });

  // Step 3: Return enhanced prompt for AI execution
  return {
    content: [
      {
        type: 'text',
        text: reflexionResult.enhancedPrompt.prompt,
      },
    ],
    metadata: {
      reflexionLearning: {
        memoriesUsed: reflexionResult.taskAttempt.relatedMemories.length,
        learningOutcome: reflexionResult.learningOutcome,
        improvementAchieved: reflexionResult.learningOutcome.improvementAchieved,
      },
    },
  };
}
```

## Configuration Options

### Reflexion Configuration

```typescript
interface ReflexionConfig {
  memoryEnabled: boolean; // Enable memory system
  maxMemoryEntries: number; // Maximum memories per type (1-1000)
  reflectionDepth: 'basic' | 'detailed' | 'comprehensive';
  evaluationCriteria: EvaluationCriterion[];
  learningRate: number; // How quickly to adapt (0-1)
  memoryRetention: number; // How long to keep memories (days)
  feedbackIntegration: boolean; // Enable external feedback
  autoCleanup: boolean; // Automatic memory cleanup
  relevanceThreshold: number; // Minimum relevance for memory retrieval (0-1)
  confidenceThreshold: number; // Minimum confidence for lesson application (0-1)
}
```

### Evaluation Criteria Options

```typescript
type EvaluationCriterion =
  | 'task-success' // Did the task succeed?
  | 'quality' // How well was it executed?
  | 'efficiency' // Was the approach optimal?
  | 'accuracy' // How accurate were the results?
  | 'completeness' // Was the task fully completed?
  | 'relevance' // How relevant was the output?
  | 'clarity' // How clear was the communication?
  | 'innovation'; // Was the approach creative/novel?
```

### Reflection Depth Options

```typescript
type ReflectionDepth =
  | 'basic' // Simple success/failure analysis
  | 'detailed' // Comprehensive lesson extraction
  | 'comprehensive'; // Deep analysis with meta-learning
```

## Tool-Specific Configurations

### ADR Generation Tools

```typescript
const adrReflexionConfig: ReflexionConfig = {
  memoryEnabled: true,
  maxMemoryEntries: 100,
  reflectionDepth: 'comprehensive',
  evaluationCriteria: ['task-success', 'relevance', 'clarity', 'completeness'],
  learningRate: 0.8,
  memoryRetention: 90,
  feedbackIntegration: true,
  autoCleanup: true,
  relevanceThreshold: 0.6,
  confidenceThreshold: 0.7,
};
```

### Analysis Tools

```typescript
const analysisReflexionConfig: ReflexionConfig = {
  memoryEnabled: true,
  maxMemoryEntries: 75,
  reflectionDepth: 'detailed',
  evaluationCriteria: ['accuracy', 'completeness', 'efficiency'],
  learningRate: 0.7,
  memoryRetention: 60,
  feedbackIntegration: true,
  autoCleanup: true,
  relevanceThreshold: 0.5,
  confidenceThreshold: 0.6,
};
```

### Research Tools

```typescript
const researchReflexionConfig: ReflexionConfig = {
  memoryEnabled: true,
  maxMemoryEntries: 60,
  reflectionDepth: 'detailed',
  evaluationCriteria: ['quality', 'relevance', 'innovation'],
  learningRate: 0.75,
  memoryRetention: 120,
  feedbackIntegration: true,
  autoCleanup: true,
  relevanceThreshold: 0.55,
  confidenceThreshold: 0.65,
};
```

## Usage Patterns

### Pattern 1: Continuous Learning

```typescript
// For tools that should learn and improve over time
const continuousLearningConfig: ReflexionConfig = {
  memoryEnabled: true,
  maxMemoryEntries: 200,
  reflectionDepth: 'comprehensive',
  evaluationCriteria: ['task-success', 'quality', 'efficiency', 'innovation'],
  learningRate: 0.8,
  memoryRetention: 180,
  feedbackIntegration: true,
  autoCleanup: true,
};
```

### Pattern 2: Quick Adaptation

```typescript
// For tools that need rapid learning from immediate feedback
const quickAdaptationConfig: ReflexionConfig = {
  memoryEnabled: true,
  maxMemoryEntries: 50,
  reflectionDepth: 'detailed',
  evaluationCriteria: ['task-success', 'efficiency'],
  learningRate: 0.9,
  memoryRetention: 30,
  feedbackIntegration: true,
  autoCleanup: true,
};
```

### Pattern 3: Conservative Learning

```typescript
// For tools where stability is more important than rapid adaptation
const conservativeLearningConfig: ReflexionConfig = {
  memoryEnabled: true,
  maxMemoryEntries: 100,
  reflectionDepth: 'basic',
  evaluationCriteria: ['task-success', 'quality'],
  learningRate: 0.5,
  memoryRetention: 365,
  feedbackIntegration: false,
  autoCleanup: false,
};
```

## Memory Management

### Memory Types and Usage

```typescript
// Retrieve specific types of memories
const episodicMemories = await retrieveMemories({
  memoryTypes: ['episodic'],
  taskType: 'adr-suggestion',
  maxResults: 10,
});

const semanticMemories = await retrieveMemories({
  memoryTypes: ['semantic'],
  keywords: ['microservices', 'scalability'],
  relevanceThreshold: 0.7,
});

const proceduralMemories = await retrieveMemories({
  memoryTypes: ['procedural'],
  context: { domain: 'web-applications' },
  maxResults: 5,
});
```

### Memory Persistence

```typescript
// Manually persist important memories
const importantMemory: ReflexionMemory = {
  memoryId: 'critical_lesson_001',
  memoryType: 'semantic',
  content: {
    summary: 'Always validate ADR assumptions with stakeholders',
    lessons: ['Stakeholder validation prevents misaligned decisions'],
    applicableScenarios: ['adr-generation', 'decision-making'],
  },
  relevanceScore: 0.95,
  tags: ['stakeholder-alignment', 'validation', 'critical'],
};

await persistReflexionMemory(importantMemory);
```

## Learning Progress Tracking

### Monitor Learning Effectiveness

```typescript
// Get learning progress for a specific task type
const progress = await getLearningProgress('adr-suggestion');
console.log('Learning Progress:', {
  successRate: progress.successRate,
  improvementTrend: progress.improvementTrend,
  keyLessons: progress.keyLessons,
  persistentIssues: progress.persistentIssues,
});
```

### Detect Learning Plateaus

```typescript
// Check if learning has plateaued and needs intervention
const plateauAnalysis = progress.plateauDetection;
if (plateauAnalysis.isOnPlateau) {
  console.log('Learning plateau detected:', {
    duration: plateauAnalysis.plateauDuration,
    suggestedInterventions: plateauAnalysis.suggestedInterventions,
  });
}
```

## Integration Examples

### Example 1: ADR Suggestion with Reflexion

```typescript
export async function suggestAdrsWithReflexion(context: any) {
  // Step 1: Retrieve relevant memories
  const memories = await retrieveRelevantMemories('adr-suggestion', context);

  // Step 2: Create memory-enhanced prompt
  const basePrompt = createAdrSuggestionPrompt(context);
  const enhancedPrompt = await enhancePromptWithMemories(basePrompt, memories);

  // Step 3: Execute with reflexion tracking
  const result = await executeWithReflexion(enhancedPrompt, {
    memoryEnabled: true,
    reflectionDepth: 'comprehensive',
    evaluationCriteria: ['task-success', 'relevance', 'clarity'],
    learningRate: 0.8,
  });

  // Step 4: Return enhanced prompt for AI execution
  return {
    content: [{ type: 'text', text: result.enhancedPrompt.prompt }],
    metadata: {
      reflexionData: {
        memoriesUsed: result.taskAttempt.relatedMemories,
        learningOutcome: result.learningOutcome,
        recommendations: result.recommendations,
      },
    },
  };
}
```

### Example 2: Project Analysis with Learning

```typescript
export async function analyzeProjectWithReflexion(projectPath: string) {
  const basePrompt = createProjectAnalysisPrompt(projectPath);

  const result = await executeWithReflexion(basePrompt, {
    memoryEnabled: true,
    reflectionDepth: 'detailed',
    evaluationCriteria: ['accuracy', 'completeness', 'efficiency'],
    learningRate: 0.7,
    memoryRetention: 60,
  });

  return {
    content: [{ type: 'text', text: result.enhancedPrompt.prompt }],
    metadata: {
      learningMetrics: {
        improvementAchieved: result.learningOutcome.improvementAchieved,
        lessonsLearned: result.learningOutcome.lessonsLearned,
        memoriesCreated: result.learningOutcome.memoriesCreated,
      },
    },
  };
}
```

## Performance Considerations

### Memory Optimization

```typescript
// Configure memory limits for performance
const performanceOptimizedConfig: ReflexionConfig = {
  maxMemoryEntries: 50, // Limit memory storage
  relevanceThreshold: 0.7, // Only high-relevance memories
  autoCleanup: true, // Automatic cleanup
  memoryRetention: 30, // Shorter retention for performance
};
```

### Learning Efficiency

```typescript
// Balance learning speed with stability
const balancedConfig: ReflexionConfig = {
  learningRate: 0.6, // Moderate learning rate
  confidenceThreshold: 0.7, // High confidence requirement
  reflectionDepth: 'detailed', // Balanced reflection depth
  feedbackIntegration: true, // Use external feedback
};
```

## Error Handling and Fallbacks

### Graceful Degradation

```typescript
async function executeWithReflexionSafely(
  prompt: PromptObject,
  config: ReflexionConfig
): Promise<PromptObject> {
  try {
    const result = await executeWithReflexion(prompt, config);
    return result.enhancedPrompt;
  } catch (error) {
    console.warn('Reflexion failed, using original prompt:', error);
    return prompt; // Fallback to original
  }
}
```

### Memory Recovery

```typescript
// Handle memory corruption or loss
async function recoverFromMemoryIssues(taskType: string) {
  try {
    await validateMemoryIntegrity(taskType);
  } catch (error) {
    console.warn('Memory issues detected, rebuilding from backups');
    await rebuildMemoryFromBackups(taskType);
  }
}
```

## Best Practices

### 1. Configuration Selection

- **High-stakes tools**: Use comprehensive reflection with conservative learning
- **Experimental tools**: Use detailed reflection with higher learning rates
- **Stable tools**: Use basic reflection with low learning rates

### 2. Memory Management

- Set appropriate memory limits based on tool usage patterns
- Use relevant memory types for different learning objectives
- Implement regular memory cleanup and validation

### 3. Learning Optimization

- Monitor learning progress and adjust configurations
- Use external feedback when available
- Balance learning speed with stability requirements

### 4. Performance Monitoring

- Track memory usage and retrieval performance
- Monitor learning effectiveness and plateau detection
- Adjust configurations based on performance metrics

This usage guide provides comprehensive guidance for integrating Reflexion learning capabilities into MCP tools while maintaining the 100% prompt-driven architecture and ensuring effective continuous improvement.
