/**
 * Test utilities for advanced prompting techniques
 * Provides common test helpers, mocks, and validation functions
 */

import { jest } from '@jest/globals';

// ============================================================================
// Test Data Generators
// ============================================================================

/**
 * Generate test prompt object
 */
export function createTestPrompt(overrides: any = {}) {
  return {
    prompt: 'Test prompt for architectural analysis',
    instructions: 'Please analyze the provided context and generate recommendations',
    context: {
      projectPath: './test-project',
      technologies: ['react', 'node', 'postgresql'],
      domain: 'web-application',
      ...overrides.context
    },
    ...overrides
  };
}

/**
 * Generate test knowledge generation config
 */
export function createTestKnowledgeConfig(overrides: any = {}) {
  return {
    domains: ['api-design', 'database-design'],
    depth: 'intermediate',
    cacheEnabled: true,
    maxTokens: 5000,
    ...overrides
  };
}

/**
 * Generate test APE config
 */
export function createTestAPEConfig(overrides: any = {}) {
  return {
    candidateCount: 3,
    evaluationCriteria: ['task-completion', 'clarity'],
    optimizationRounds: 1,
    selectionStrategy: 'highest-score',
    qualityThreshold: 0.7,
    cacheEnabled: true,
    ...overrides
  };
}

/**
 * Generate test Reflexion config
 */
export function createTestReflexionConfig(overrides: any = {}) {
  return {
    memoryEnabled: true,
    maxMemoryEntries: 10,
    reflectionDepth: 'basic',
    evaluationCriteria: ['task-success', 'quality'],
    learningRate: 0.7,
    memoryRetention: 30,
    ...overrides
  };
}

/**
 * Generate test memory object
 */
export function createTestMemory(overrides: any = {}) {
  return {
    memoryId: 'test_memory_001',
    memoryType: 'episodic',
    content: {
      summary: 'Test memory for validation',
      details: 'Detailed test memory content',
      context: { test: true },
      lessons: ['Test lesson 1'],
      applicableScenarios: ['test-scenario'],
      relatedMemories: [],
      evidence: ['test evidence'],
      outcomes: ['positive outcome'],
      strategies: ['test strategy'],
      warnings: []
    },
    relevanceScore: 0.8,
    accessCount: 1,
    lastAccessed: new Date().toISOString(),
    createdAt: new Date().toISOString(),
    tags: ['test', 'validation'],
    metadata: {
      source: 'test',
      quality: 0.8,
      reliability: 0.9,
      generalizability: 0.7,
      category: 'test',
      importance: 'medium'
    },
    relationships: [],
    ...overrides
  };
}

// ============================================================================
// Mock Functions
// ============================================================================

/**
 * Mock knowledge generation function
 */
export function createMockKnowledgeGeneration() {
  return jest.fn<() => Promise<{prompt: string; instructions: string; context: any}>>().mockResolvedValue({
    prompt: 'Mock generated knowledge prompt',
    instructions: 'Mock knowledge instructions',
    context: {
      operation: 'knowledge_generation',
      domains: ['api-design'],
      knowledgeGenerated: true
    }
  });
}

/**
 * Mock APE optimization function
 */
export function createMockAPEOptimization() {
  return jest.fn<() => Promise<{prompt: string; instructions: string; context: any}>>().mockResolvedValue({
    prompt: 'Mock optimized prompt',
    instructions: 'Mock optimization instructions',
    context: {
      operation: 'ape_optimization',
      optimizationApplied: true,
      improvementScore: 0.15
    }
  });
}

/**
 * Mock Reflexion execution function
 */
export function createMockReflexionExecution() {
  return jest.fn<() => Promise<{prompt: string; instructions: string; context: any}>>().mockResolvedValue({
    prompt: 'Mock reflexion-enhanced prompt',
    instructions: 'Mock reflexion instructions',
    context: {
      operation: 'reflexion_execution',
      memoriesUsed: ['memory_001'],
      learningApplied: true
    }
  });
}

/**
 * Mock memory retrieval function
 */
export function createMockMemoryRetrieval() {
  return jest.fn<() => Promise<{prompt: string; instructions: string; context: any}>>().mockResolvedValue({
    prompt: 'Mock memory retrieval prompt',
    instructions: 'Mock memory retrieval instructions',
    context: {
      operation: 'memory_retrieval',
      memoriesFound: 3
    }
  });
}

// ============================================================================
// Validation Functions
// ============================================================================

/**
 * Validate prompt object structure
 */
export function validatePromptObject(promptObj: any): boolean {
  const requiredFields = ['prompt', 'instructions', 'context'];
  return requiredFields.every(field => field in promptObj && promptObj[field]);
}

/**
 * Validate knowledge generation result
 */
export function validateKnowledgeResult(result: any): boolean {
  return validatePromptObject(result) && 
         result.context?.operation === 'knowledge_generation' &&
         typeof result.prompt === 'string' &&
         result.prompt.length > 0;
}

/**
 * Validate APE optimization result
 */
export function validateAPEResult(result: any): boolean {
  return validatePromptObject(result) && 
         result.context?.operation === 'ape_optimization' &&
         typeof result.context?.improvementScore === 'number';
}

/**
 * Validate Reflexion execution result
 */
export function validateReflexionResult(result: any): boolean {
  return validatePromptObject(result) && 
         result.context?.operation === 'reflexion_execution' &&
         Array.isArray(result.context?.memoriesUsed);
}

/**
 * Validate memory object structure
 */
export function validateMemoryObject(memory: any): boolean {
  const requiredFields = ['memoryId', 'memoryType', 'content', 'relevanceScore', 'metadata'];
  return requiredFields.every(field => field in memory) &&
         typeof memory.relevanceScore === 'number' &&
         memory.relevanceScore >= 0 && memory.relevanceScore <= 1;
}

// ============================================================================
// Performance Testing Utilities
// ============================================================================

/**
 * Measure function execution time
 */
export async function measureExecutionTime<T>(
  fn: () => Promise<T>
): Promise<{ result: T; executionTime: number }> {
  const startTime = performance.now();
  const result = await fn();
  const endTime = performance.now();
  
  return {
    result,
    executionTime: endTime - startTime
  };
}

/**
 * Performance benchmark configuration
 */
export interface BenchmarkConfig {
  iterations: number;
  warmupIterations: number;
  maxExecutionTime: number; // milliseconds
  memoryThreshold: number; // MB
}

/**
 * Default benchmark configuration
 */
export const DEFAULT_BENCHMARK_CONFIG: BenchmarkConfig = {
  iterations: 10,
  warmupIterations: 3,
  maxExecutionTime: 5000, // 5 seconds
  memoryThreshold: 100 // 100 MB
};

/**
 * Run performance benchmark
 */
export async function runBenchmark<T>(
  fn: () => Promise<T>,
  config: Partial<BenchmarkConfig> = {}
): Promise<{
  averageTime: number;
  minTime: number;
  maxTime: number;
  iterations: number;
  memoryUsage: number;
}> {
  const benchConfig = { ...DEFAULT_BENCHMARK_CONFIG, ...config };
  const times: number[] = [];
  
  // Warmup iterations
  for (let i = 0; i < benchConfig.warmupIterations; i++) {
    await fn();
  }
  
  // Measure memory before benchmark
  const memoryBefore = process.memoryUsage().heapUsed;
  
  // Actual benchmark iterations
  for (let i = 0; i < benchConfig.iterations; i++) {
    const { executionTime } = await measureExecutionTime(fn);
    times.push(executionTime);
    
    // Check if execution time exceeds threshold
    if (executionTime > benchConfig.maxExecutionTime) {
      throw new Error(`Execution time ${executionTime}ms exceeds threshold ${benchConfig.maxExecutionTime}ms`);
    }
  }
  
  // Measure memory after benchmark
  const memoryAfter = process.memoryUsage().heapUsed;
  const memoryUsage = (memoryAfter - memoryBefore) / 1024 / 1024; // Convert to MB
  
  // Check memory usage
  if (memoryUsage > benchConfig.memoryThreshold) {
    console.warn(`Memory usage ${memoryUsage.toFixed(2)}MB exceeds threshold ${benchConfig.memoryThreshold}MB`);
  }
  
  return {
    averageTime: times.reduce((sum, time) => sum + time, 0) / times.length,
    minTime: Math.min(...times),
    maxTime: Math.max(...times),
    iterations: benchConfig.iterations,
    memoryUsage
  };
}

// ============================================================================
// Quality Assessment Utilities
// ============================================================================

/**
 * Assess prompt quality based on various criteria
 */
export function assessPromptQuality(prompt: string): {
  score: number;
  criteria: Record<string, number>;
  feedback: string[];
} {
  const criteria = {
    length: Math.min(prompt.length / 1000, 1), // Normalize to 0-1
    clarity: prompt.includes('Please') || prompt.includes('Analyze') ? 0.8 : 0.4,
    specificity: (prompt.match(/\b(specific|detailed|comprehensive)\b/gi) || []).length * 0.2,
    structure: prompt.includes('#') || prompt.includes('##') ? 0.8 : 0.4,
    actionability: (prompt.match(/\b(generate|create|analyze|provide)\b/gi) || []).length * 0.1
  };
  
  // Normalize criteria scores to 0-1
  Object.entries(criteria).forEach(([key, value]) => {
    (criteria as any)[key] = Math.min(value, 1);
  });
  
  const score = Object.values(criteria).reduce((sum, value) => sum + value, 0) / Object.keys(criteria).length;
  
  const feedback: string[] = [];
  if (criteria.length < 0.3) feedback.push('Prompt may be too short');
  if (criteria.clarity < 0.5) feedback.push('Prompt could be clearer');
  if (criteria.specificity < 0.3) feedback.push('Prompt lacks specificity');
  if (criteria.structure < 0.5) feedback.push('Prompt could benefit from better structure');
  if (criteria.actionability < 0.3) feedback.push('Prompt could be more actionable');
  
  return { score, criteria, feedback };
}

/**
 * Compare two prompts for quality improvement
 */
export function comparePromptQuality(originalPrompt: string, enhancedPrompt: string): {
  improvement: number;
  originalScore: number;
  enhancedScore: number;
  significantImprovement: boolean;
} {
  const originalAssessment = assessPromptQuality(originalPrompt);
  const enhancedAssessment = assessPromptQuality(enhancedPrompt);
  
  const improvement = enhancedAssessment.score - originalAssessment.score;
  const significantImprovement = improvement > 0.1; // 10% improvement threshold
  
  return {
    improvement,
    originalScore: originalAssessment.score,
    enhancedScore: enhancedAssessment.score,
    significantImprovement
  };
}
