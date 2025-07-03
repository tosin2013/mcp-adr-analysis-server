/**
 * Unit tests for Automatic Prompt Engineering (APE) utility module
 * Tests the prompt optimization and evaluation functionality
 */

import { jest } from '@jest/globals';
import {
  optimizePromptWithAPE,
  generatePromptCandidates,
  evaluatePromptPerformance,
  optimizeToolPrompt,
  validateAPEConfig,
  getSupportedGenerationStrategies,
  getSupportedEvaluationCriteria,
  getSupportedSelectionStrategies,
  createToolAPEConfig,
  generateAPECacheKey
} from '../src/utils/automatic-prompt-engineering.js';
import {
  createTestPrompt,
  createTestAPEConfig,
  validateAPEResult,
  measureExecutionTime,
  runBenchmark,
  comparePromptQuality
} from './utils/advanced-prompting-test-utils.js';

describe('Automatic Prompt Engineering (APE) Module', () => {
  
  describe('optimizePromptWithAPE', () => {
    it('should optimize prompt with valid structure', async () => {
      const basePrompt = createTestPrompt();
      const config = createTestAPEConfig();
      
      const result = await optimizePromptWithAPE(basePrompt, config);
      
      expect(validateAPEResult(result)).toBe(true);
      expect(result.prompt).toContain('APE-Optimized Prompt');
      expect(result.context.operation).toBe('ape_optimization');
      expect(typeof result.context.improvementScore).toBe('number');
    });

    it('should handle different generation strategies', async () => {
      const strategies = ['template-variation', 'semantic-variation', 'style-variation'];
      const basePrompt = createTestPrompt();
      
      for (const strategy of strategies) {
        const config = createTestAPEConfig({ 
          generationStrategies: [strategy]
        });
        
        const result = await optimizePromptWithAPE(basePrompt, config);
        
        expect(validateAPEResult(result)).toBe(true);
        expect(result.prompt).toContain(strategy);
      }
    });

    it('should respect candidate count configuration', async () => {
      const basePrompt = createTestPrompt();
      const candidateCounts = [3, 5, 7];
      
      for (const candidateCount of candidateCounts) {
        const config = createTestAPEConfig({ candidateCount });
        const result = await optimizePromptWithAPE(basePrompt, config);
        
        expect(result.prompt).toContain(`${candidateCount} prompt candidates`);
        expect(result.context.candidateCount).toBe(candidateCount);
      }
    });

    it('should apply evaluation criteria correctly', async () => {
      const basePrompt = createTestPrompt();
      const criteria = ['task-completion', 'clarity', 'specificity'];
      const config = createTestAPEConfig({ evaluationCriteria: criteria });
      
      const result = await optimizePromptWithAPE(basePrompt, config);
      
      criteria.forEach(criterion => {
        expect(result.prompt).toContain(criterion);
      });
      expect(result.context.evaluationCriteria).toEqual(criteria);
    });

    it('should handle optimization rounds', async () => {
      const basePrompt = createTestPrompt();
      const rounds = [1, 2, 3];
      
      for (const optimizationRounds of rounds) {
        const config = createTestAPEConfig({ optimizationRounds });
        const result = await optimizePromptWithAPE(basePrompt, config);
        
        expect(result.context.optimizationRounds).toBe(optimizationRounds);
      }
    });

    it('should generate cache key correctly', async () => {
      const basePrompt = createTestPrompt();
      const config = createTestAPEConfig();
      
      const result = await optimizePromptWithAPE(basePrompt, config);
      
      expect(result.context.cacheKey).toBeDefined();
      expect(typeof result.context.cacheKey).toBe('string');
      expect(result.context.cacheKey).toContain('ape');
    });
  });

  describe('generatePromptCandidates', () => {
    it('should generate multiple prompt candidates', async () => {
      const basePrompt = createTestPrompt();
      const strategies = ['template-variation', 'semantic-variation'];
      const candidateCount = 4;
      
      const result = await generatePromptCandidates(basePrompt, strategies, candidateCount);
      
      expect(result.prompt).toContain('Prompt Candidate Generation');
      expect(result.prompt).toContain(`${candidateCount} candidates`);
      strategies.forEach(strategy => {
        expect(result.prompt).toContain(strategy);
      });
    });

    it('should handle single strategy', async () => {
      const basePrompt = createTestPrompt();
      const strategy = 'template-variation';
      
      const result = await generatePromptCandidates(basePrompt, [strategy], 3);
      
      expect(result.prompt).toContain(strategy);
      expect(result.context.strategies).toEqual([strategy]);
    });
  });

  describe('evaluatePromptPerformance', () => {
    it('should evaluate prompt candidates', async () => {
      const candidates = [
        'Candidate prompt 1',
        'Candidate prompt 2',
        'Candidate prompt 3'
      ];
      const criteria = ['task-completion', 'clarity'];
      const context = { task: 'test-evaluation' };
      
      const result = await evaluatePromptPerformance(candidates, criteria, context);
      
      expect(result.prompt).toContain('Prompt Performance Evaluation');
      expect(result.prompt).toContain('3 candidates');
      criteria.forEach(criterion => {
        expect(result.prompt).toContain(criterion);
      });
    });

    it('should handle different evaluation criteria', async () => {
      const candidates = ['Test prompt'];
      const allCriteria = ['task-completion', 'clarity', 'specificity', 'robustness', 'efficiency'];
      
      for (const criterion of allCriteria) {
        const result = await evaluatePromptPerformance(candidates, [criterion], {});
        
        expect(result.prompt).toContain(criterion);
      }
    });
  });

  describe('optimizeToolPrompt', () => {
    it('should optimize tool-specific prompts', async () => {
      const toolNames = ['suggest_adrs', 'generate_adrs_from_prd', 'analyze_project_ecosystem'];
      const basePrompt = createTestPrompt();
      
      for (const toolName of toolNames) {
        const result = await optimizeToolPrompt(toolName, basePrompt);
        
        expect(validateAPEResult(result)).toBe(true);
        expect(result.prompt).toContain(toolName);
        expect(result.context.toolName).toBe(toolName);
      }
    });

    it('should use tool-specific configurations', async () => {
      const basePrompt = createTestPrompt();
      const result = await optimizeToolPrompt('suggest_adrs', basePrompt);
      
      // Should use suggest_adrs specific configuration
      expect(result.context.toolOptimized).toBe(true);
      expect(result.context.toolName).toBe('suggest_adrs');
    });
  });

  describe('Configuration Validation', () => {
    it('should validate correct configuration', () => {
      const validConfig = createTestAPEConfig();
      
      expect(() => validateAPEConfig(validConfig)).not.toThrow();
    });

    it('should reject invalid candidate count', () => {
      const invalidConfig = createTestAPEConfig({ candidateCount: 0 });
      
      expect(() => validateAPEConfig(invalidConfig))
        .toThrow('Candidate count must be between 1 and 10');
    });

    it('should reject invalid optimization rounds', () => {
      const invalidConfig = createTestAPEConfig({ optimizationRounds: 0 });
      
      expect(() => validateAPEConfig(invalidConfig))
        .toThrow('Optimization rounds must be between 1 and 5');
    });

    it('should reject invalid quality threshold', () => {
      const invalidConfig = createTestAPEConfig({ qualityThreshold: 1.5 });
      
      expect(() => validateAPEConfig(invalidConfig))
        .toThrow('Quality threshold must be between 0 and 1');
    });

    it('should reject invalid max optimization time', () => {
      const invalidConfig = createTestAPEConfig({ maxOptimizationTime: -1 });
      
      expect(() => validateAPEConfig(invalidConfig))
        .toThrow('Max optimization time must be positive');
    });
  });

  describe('Utility Functions', () => {
    it('should return supported generation strategies', () => {
      const strategies = getSupportedGenerationStrategies();
      
      expect(Array.isArray(strategies)).toBe(true);
      expect(strategies.length).toBeGreaterThan(0);
      expect(strategies).toContain('template-variation');
      expect(strategies).toContain('semantic-variation');
    });

    it('should return supported evaluation criteria', () => {
      const criteria = getSupportedEvaluationCriteria();
      
      expect(Array.isArray(criteria)).toBe(true);
      expect(criteria).toContain('task-completion');
      expect(criteria).toContain('clarity');
    });

    it('should return supported selection strategies', () => {
      const strategies = getSupportedSelectionStrategies();
      
      expect(Array.isArray(strategies)).toBe(true);
      expect(strategies).toContain('highest-score');
      expect(strategies).toContain('multi-criteria');
    });

    it('should create tool-specific configuration', () => {
      const toolName = 'suggest_adrs';
      const config = createToolAPEConfig(toolName);
      
      expect(config.candidateCount).toBeGreaterThan(0);
      expect(config.evaluationCriteria.length).toBeGreaterThan(0);
      expect(config.qualityThreshold).toBeGreaterThan(0);
    });

    it('should generate consistent cache keys', () => {
      const promptHash = 'test-hash';
      const config = createTestAPEConfig();
      
      const key1 = generateAPECacheKey(promptHash, config);
      const key2 = generateAPECacheKey(promptHash, config);
      
      expect(key1).toBe(key2);
      expect(key1).toContain('ape');
    });
  });

  describe('Performance Tests', () => {
    it('should complete optimization within time limit', async () => {
      const basePrompt = createTestPrompt();
      const config = createTestAPEConfig({ candidateCount: 3 });
      
      const { executionTime } = await measureExecutionTime(async () => {
        return await optimizePromptWithAPE(basePrompt, config);
      });
      
      expect(executionTime).toBeLessThan(2000); // Should complete within 2 seconds
    });

    it('should handle multiple concurrent optimizations', async () => {
      const basePrompt = createTestPrompt();
      const config = createTestAPEConfig({ candidateCount: 3 });
      
      const promises = Array(3).fill(null).map(() => 
        optimizePromptWithAPE(basePrompt, config)
      );
      
      const results = await Promise.all(promises);
      
      results.forEach(result => {
        expect(validateAPEResult(result)).toBe(true);
      });
    });

    it('should scale with candidate count', async () => {
      const basePrompt = createTestPrompt();
      const candidateCounts = [3, 5, 7];
      
      for (const candidateCount of candidateCounts) {
        const config = createTestAPEConfig({ candidateCount });
        
        const benchmark = await runBenchmark(async () => {
          return await optimizePromptWithAPE(basePrompt, config);
        }, { iterations: 2 });
        
        expect(benchmark.averageTime).toBeLessThan(3000); // Should complete within 3 seconds
      }
    });
  });

  describe('Quality Assessment', () => {
    it('should show improvement in prompt quality', async () => {
      const originalPrompt = 'Analyze the project';
      const basePrompt = createTestPrompt({ prompt: originalPrompt });
      const config = createTestAPEConfig();
      
      const result = await optimizePromptWithAPE(basePrompt, config);
      
      // The optimized prompt should be more detailed than the original
      expect(result.prompt.length).toBeGreaterThan(originalPrompt.length);
      
      const qualityComparison = comparePromptQuality(originalPrompt, result.prompt);
      expect(qualityComparison.improvement).toBeGreaterThan(0);
    });

    it('should maintain context relevance', async () => {
      const basePrompt = createTestPrompt({
        context: { projectType: 'web-application', technologies: ['react'] }
      });
      const config = createTestAPEConfig();
      
      const result = await optimizePromptWithAPE(basePrompt, config);
      
      expect(result.prompt.toLowerCase()).toContain('web-application');
      expect(result.prompt.toLowerCase()).toContain('react');
    });
  });

  describe('Error Handling', () => {
    it('should handle empty prompt gracefully', async () => {
      const emptyPrompt = createTestPrompt({ prompt: '' });
      const config = createTestAPEConfig();
      
      await expect(optimizePromptWithAPE(emptyPrompt, config))
        .rejects.toThrow('Prompt cannot be empty');
    });

    it('should handle invalid tool names', async () => {
      const basePrompt = createTestPrompt();
      
      const result = await optimizeToolPrompt('invalid-tool', basePrompt);
      
      // Should not throw, but should use default configuration
      expect(validateAPEResult(result)).toBe(true);
    });

    it('should handle configuration errors gracefully', async () => {
      const basePrompt = createTestPrompt();
      const invalidConfig = { candidateCount: -1 };
      
      await expect(optimizePromptWithAPE(basePrompt, invalidConfig))
        .rejects.toThrow();
    });
  });
});
