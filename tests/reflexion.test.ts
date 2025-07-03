/**
 * Unit tests for Reflexion utility module
 * Tests the Actor-Evaluator-Self-Reflection pattern implementation
 */

import { jest } from '@jest/globals';
import {
  executeWithReflexion,
  retrieveRelevantMemories,
  persistReflexionMemory,
  getLearningProgress,
  generateReflexionCacheKey,
  getDefaultReflexionConfig,
  validateReflexionConfig,
  getSupportedMemoryTypes,
  getSupportedEvaluationCriteria,
  getSupportedReflectionDepths,
  createToolReflexionConfig,
  generateMemoryId,
  calculateMemoryExpiration,
  createMemoryQuery,
  enhancePromptWithMemories
} from '../src/utils/reflexion.js';
import {
  createTestPrompt,
  createTestReflexionConfig,
  createTestMemory,
  validateReflexionResult,
  validateMemoryObject,
  measureExecutionTime,
  runBenchmark
} from './utils/advanced-prompting-test-utils.js';

describe('Reflexion Module', () => {
  
  describe('executeWithReflexion', () => {
    it('should execute with reflexion learning', async () => {
      const basePrompt = createTestPrompt();
      const config = createTestReflexionConfig();
      
      const result = await executeWithReflexion(basePrompt, config);
      
      expect(validateReflexionResult(result)).toBe(true);
      expect(result.prompt).toContain('Reflexion-Enhanced Task Execution');
      expect(result.context.operation).toBe('reflexion_execution');
      expect(Array.isArray(result.context.memoriesUsed)).toBe(true);
    });

    it('should handle different reflection depths', async () => {
      const basePrompt = createTestPrompt();
      const depths = ['basic', 'detailed', 'comprehensive'];
      
      for (const depth of depths) {
        const config = createTestReflexionConfig({ reflectionDepth: depth });
        const result = await executeWithReflexion(basePrompt, config);
        
        expect(result.prompt).toContain(depth);
        expect(result.context.reflectionDepth).toBe(depth);
      }
    });

    it('should apply evaluation criteria correctly', async () => {
      const basePrompt = createTestPrompt();
      const criteria = ['task-success', 'quality', 'efficiency'];
      const config = createTestReflexionConfig({ evaluationCriteria: criteria });
      
      const result = await executeWithReflexion(basePrompt, config);
      
      criteria.forEach(criterion => {
        expect(result.prompt).toContain(criterion);
      });
    });

    it('should respect memory configuration', async () => {
      const basePrompt = createTestPrompt();
      const config = createTestReflexionConfig({
        memoryEnabled: true,
        maxMemoryEntries: 50
      });
      
      const result = await executeWithReflexion(basePrompt, config);
      
      expect(result.prompt).toContain('Memory Enabled: true');
      expect(result.prompt).toContain('Max Memory Entries: 50');
    });

    it('should generate cache key correctly', async () => {
      const basePrompt = createTestPrompt();
      const config = createTestReflexionConfig();
      
      const result = await executeWithReflexion(basePrompt, config);
      
      expect(result.context.cacheKey).toBeDefined();
      expect(typeof result.context.cacheKey).toBe('string');
      expect(result.context.cacheKey).toContain('reflexion');
    });
  });

  describe('retrieveRelevantMemories', () => {
    it('should retrieve memories for task type', async () => {
      const taskType = 'adr-suggestion';
      const context = { projectPath: './test', technologies: ['react'] };
      const query = { maxResults: 5, relevanceThreshold: 0.6 };
      
      const result = await retrieveRelevantMemories(taskType, context, query);
      
      expect(result.prompt).toContain('Memory Retrieval Request');
      expect(result.prompt).toContain(taskType);
      expect(result.context.operation).toBe('memory_retrieval');
      expect(result.context.taskType).toBe(taskType);
    });

    it('should handle different memory query parameters', async () => {
      const taskType = 'ecosystem-analysis';
      const context = { technologies: ['node', 'postgresql'] };
      const queries = [
        { maxResults: 3, relevanceThreshold: 0.7 },
        { maxResults: 10, relevanceThreshold: 0.5 },
        { memoryTypes: ['episodic', 'semantic'] }
      ];
      
      for (const query of queries) {
        const result = await retrieveRelevantMemories(taskType, context, query);
        
        expect(result.prompt).toContain('Memory Retrieval Request');
        if (query.maxResults) {
          expect(result.prompt).toContain(`Max Results: ${query.maxResults}`);
        }
        if (query.relevanceThreshold) {
          expect(result.prompt).toContain(`Relevance Threshold: ${query.relevanceThreshold}`);
        }
      }
    });

    it('should extract keywords from context', async () => {
      const taskType = 'test-task';
      const context = {
        technologies: ['react', 'node'],
        domain: 'web-applications',
        description: 'Complex architectural analysis'
      };
      
      const result = await retrieveRelevantMemories(taskType, context);
      
      expect(result.prompt).toContain('react');
      expect(result.prompt).toContain('node');
      expect(result.prompt).toContain('web-applications');
    });
  });

  describe('persistReflexionMemory', () => {
    it('should persist memory with correct structure', async () => {
      const memory = createTestMemory();
      
      const result = await persistReflexionMemory(memory);
      
      expect(result.prompt).toContain('Memory Persistence Request');
      expect(result.prompt).toContain(memory.memoryId);
      expect(result.prompt).toContain(memory.memoryType);
      expect(result.context.operation).toBe('memory_persistence');
    });

    it('should handle different memory types', async () => {
      const memoryTypes = ['episodic', 'semantic', 'procedural', 'meta'];
      
      for (const memoryType of memoryTypes) {
        const memory = createTestMemory({ memoryType });
        const result = await persistReflexionMemory(memory);
        
        expect(result.prompt).toContain(memoryType);
        expect(result.context.memoryType).toBe(memoryType);
      }
    });

    it('should include file path information', async () => {
      const memory = createTestMemory({
        memoryType: 'episodic',
        metadata: { category: 'strategy' }
      });
      
      const result = await persistReflexionMemory(memory);
      
      expect(result.prompt).toContain('docs/reflexion-memory/episodic/strategy/');
      expect(result.context.filePath).toContain('docs/reflexion-memory/episodic/strategy/');
    });
  });

  describe('getLearningProgress', () => {
    it('should analyze learning progress for task type', async () => {
      const taskType = 'adr-suggestion';
      
      const result = await getLearningProgress(taskType);
      
      expect(result.prompt).toContain('Learning Progress Analysis Request');
      expect(result.prompt).toContain(taskType);
      expect(result.context.operation).toBe('learning_progress_analysis');
      expect(result.context.taskType).toBe(taskType);
    });

    it('should include comprehensive analysis requirements', async () => {
      const taskType = 'ecosystem-analysis';
      
      const result = await getLearningProgress(taskType);
      
      const analysisSteps = [
        'Memory Collection',
        'Performance Trend Analysis',
        'Learning Effectiveness Assessment',
        'Knowledge Gap Identification',
        'Plateau Detection'
      ];
      
      analysisSteps.forEach(step => {
        expect(result.prompt).toContain(step);
      });
    });
  });

  describe('Configuration Validation', () => {
    it('should validate correct configuration', () => {
      const validConfig = createTestReflexionConfig();
      
      expect(() => validateReflexionConfig(validConfig)).not.toThrow();
    });

    it('should reject invalid max memory entries', () => {
      const invalidConfig = createTestReflexionConfig({ maxMemoryEntries: 0 });
      
      expect(() => validateReflexionConfig(invalidConfig))
        .toThrow('Max memory entries must be between 1 and 1000');
    });

    it('should reject invalid learning rate', () => {
      const invalidConfig = createTestReflexionConfig({ learningRate: 1.5 });
      
      expect(() => validateReflexionConfig(invalidConfig))
        .toThrow('Learning rate must be between 0 and 1');
    });

    it('should reject invalid memory retention', () => {
      const invalidConfig = createTestReflexionConfig({ memoryRetention: 400 });
      
      expect(() => validateReflexionConfig(invalidConfig))
        .toThrow('Memory retention must be between 1 and 365 days');
    });

    it('should reject invalid relevance threshold', () => {
      const invalidConfig = createTestReflexionConfig({ relevanceThreshold: -0.1 });
      
      expect(() => validateReflexionConfig(invalidConfig))
        .toThrow('Relevance threshold must be between 0 and 1');
    });
  });

  describe('Utility Functions', () => {
    it('should return supported memory types', () => {
      const types = getSupportedMemoryTypes();
      
      expect(Array.isArray(types)).toBe(true);
      expect(types).toContain('episodic');
      expect(types).toContain('semantic');
      expect(types).toContain('procedural');
      expect(types).toContain('meta');
    });

    it('should return supported evaluation criteria', () => {
      const criteria = getSupportedEvaluationCriteria();
      
      expect(Array.isArray(criteria)).toBe(true);
      expect(criteria).toContain('task-success');
      expect(criteria).toContain('quality');
      expect(criteria).toContain('efficiency');
    });

    it('should return supported reflection depths', () => {
      const depths = getSupportedReflectionDepths();
      
      expect(Array.isArray(depths)).toBe(true);
      expect(depths).toEqual(['basic', 'detailed', 'comprehensive']);
    });

    it('should create tool-specific configuration', () => {
      const toolName = 'suggest_adrs';
      const config = createToolReflexionConfig(toolName);
      
      expect(config.maxMemoryEntries).toBeGreaterThan(0);
      expect(config.evaluationCriteria.length).toBeGreaterThan(0);
      expect(config.learningRate).toBeGreaterThan(0);
    });

    it('should generate unique memory IDs', () => {
      const id1 = generateMemoryId('episodic', 'strategy');
      const id2 = generateMemoryId('episodic', 'strategy');
      
      expect(id1).not.toBe(id2);
      expect(id1).toContain('episodic_strategy');
      expect(id2).toContain('episodic_strategy');
    });

    it('should calculate memory expiration correctly', () => {
      const retentionDays = 30;
      const importance = 'high';
      
      const expiration = calculateMemoryExpiration(retentionDays, importance);
      
      expect(typeof expiration).toBe('string');
      expect(new Date(expiration).getTime()).toBeGreaterThan(Date.now());
    });

    it('should create memory query from context', () => {
      const taskType = 'test-task';
      const context = {
        technologies: ['react', 'node'],
        domain: 'web-applications'
      };
      
      const query = createMemoryQuery(taskType, context);
      
      expect(query.taskType).toBe(taskType);
      expect(query.context).toBe(context);
      expect(Array.isArray(query.keywords)).toBe(true);
      expect(query.keywords.length).toBeGreaterThan(0);
    });

    it('should generate consistent cache keys', () => {
      const promptHash = 'test-hash';
      const config = createTestReflexionConfig();
      
      const key1 = generateReflexionCacheKey(promptHash, config);
      const key2 = generateReflexionCacheKey(promptHash, config);
      
      expect(key1).toBe(key2);
      expect(key1).toContain('reflexion');
    });
  });

  describe('enhancePromptWithMemories', () => {
    it('should enhance prompt with memory context', async () => {
      const basePrompt = createTestPrompt();
      const memories = [createTestMemory(), createTestMemory({ memoryId: 'test_memory_002' })];
      
      const result = await enhancePromptWithMemories(basePrompt, memories);
      
      expect(result.prompt).toContain(basePrompt.prompt);
      expect(result.prompt).toContain('Memory-Enhanced Task Execution');
      expect(result.context.memoriesUsed).toEqual(['test_memory_001', 'test_memory_002']);
      expect(result.context.memoryEnhanced).toBe(true);
    });

    it('should preserve original context', async () => {
      const basePrompt = createTestPrompt({
        context: { customField: 'customValue' }
      });
      const memories = [createTestMemory()];
      
      const result = await enhancePromptWithMemories(basePrompt, memories);
      
      expect(result.context.customField).toBe('customValue');
      expect(result.context.memoryEnhanced).toBe(true);
    });
  });

  describe('Performance Tests', () => {
    it('should complete reflexion execution within time limit', async () => {
      const basePrompt = createTestPrompt();
      const config = createTestReflexionConfig();
      
      const { executionTime } = await measureExecutionTime(async () => {
        return await executeWithReflexion(basePrompt, config);
      });
      
      expect(executionTime).toBeLessThan(1500); // Should complete within 1.5 seconds
    });

    it('should handle multiple concurrent reflexion requests', async () => {
      const basePrompt = createTestPrompt();
      const config = createTestReflexionConfig();
      
      const promises = Array(3).fill(null).map(() => 
        executeWithReflexion(basePrompt, config)
      );
      
      const results = await Promise.all(promises);
      
      results.forEach(result => {
        expect(validateReflexionResult(result)).toBe(true);
      });
    });

    it('should maintain performance with large memory configurations', async () => {
      const basePrompt = createTestPrompt();
      const config = createTestReflexionConfig({
        maxMemoryEntries: 100,
        reflectionDepth: 'comprehensive'
      });
      
      const benchmark = await runBenchmark(async () => {
        return await executeWithReflexion(basePrompt, config);
      }, { iterations: 3 });
      
      expect(benchmark.averageTime).toBeLessThan(2000); // Should average under 2 seconds
      expect(benchmark.memoryUsage).toBeLessThan(50); // Should use less than 50MB
    });
  });

  describe('Memory Object Validation', () => {
    it('should validate correct memory objects', () => {
      const validMemory = createTestMemory();
      
      expect(validateMemoryObject(validMemory)).toBe(true);
    });

    it('should reject invalid memory objects', () => {
      const invalidMemory = { memoryId: 'test' }; // Missing required fields
      
      expect(validateMemoryObject(invalidMemory)).toBe(false);
    });

    it('should validate relevance score range', () => {
      const invalidMemory1 = createTestMemory({ relevanceScore: -0.1 });
      const invalidMemory2 = createTestMemory({ relevanceScore: 1.1 });
      const validMemory = createTestMemory({ relevanceScore: 0.8 });
      
      expect(validateMemoryObject(invalidMemory1)).toBe(false);
      expect(validateMemoryObject(invalidMemory2)).toBe(false);
      expect(validateMemoryObject(validMemory)).toBe(true);
    });
  });

  describe('Error Handling', () => {
    it('should handle empty prompt gracefully', async () => {
      const emptyPrompt = createTestPrompt({ prompt: '' });
      const config = createTestReflexionConfig();
      
      await expect(executeWithReflexion(emptyPrompt, config))
        .rejects.toThrow('Prompt cannot be empty');
    });

    it('should handle invalid memory objects', async () => {
      const invalidMemory = { memoryId: 'invalid' }; // Missing required fields
      
      await expect(persistReflexionMemory(invalidMemory))
        .rejects.toThrow();
    });

    it('should handle configuration errors gracefully', async () => {
      const basePrompt = createTestPrompt();
      const invalidConfig = { maxMemoryEntries: -1 };
      
      await expect(executeWithReflexion(basePrompt, invalidConfig))
        .rejects.toThrow();
    });
  });
});
