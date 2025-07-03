/**
 * Unit tests for Knowledge Generation utility module
 * Tests the prompt-driven knowledge generation functionality
 */

import {
  generateArchitecturalKnowledge,
  generateDomainKnowledge,
  enhancePromptWithKnowledge,
  validateKnowledgeConfig,
  getSupportedDomains,
  getSupportedDepths,
  createDomainKnowledgeConfig,
  generateKnowledgeCacheKey
} from '../src/utils/knowledge-generation.js';
import {
  ArchitecturalDomain,
  KnowledgeDepth,
  KnowledgeGenerationConfig
} from '../src/types/knowledge-generation.js';
import {
  createTestPrompt,
  createTestKnowledgeConfig,
  validateKnowledgeResult,
  measureExecutionTime,
  runBenchmark
} from './utils/advanced-prompting-test-utils.js';

describe('Knowledge Generation Module', () => {
  
  describe('generateArchitecturalKnowledge', () => {
    it('should generate knowledge prompt with valid structure', async () => {
      const projectInfo = {
        projectPath: './test-project',
        technologies: ['react', 'node'],
        patterns: ['mvc'],
        projectType: 'web-application'
      };
      
      const config = createTestKnowledgeConfig();
      
      const result = await generateArchitecturalKnowledge(projectInfo, config);
      
      expect(validateKnowledgeResult(result)).toBe(true);
      expect(result.prompt).toContain('Knowledge Generation Request');
      expect(result.context.operation).toBe('knowledge_generation');
      expect(result.context.domains).toEqual(config.domains);
    });

    it('should handle different project types', async () => {
      const projectTypes = ['web-application', 'mobile-app', 'microservices', 'data-platform'];
      
      for (const projectType of projectTypes) {
        const projectInfo = {
          projectPath: './test-project',
          technologies: [],
          patterns: [],
          projectType
        };
        
        const result = await generateArchitecturalKnowledge(projectInfo, createTestKnowledgeConfig());
        
        expect(validateKnowledgeResult(result)).toBe(true);
        expect(result.prompt).toContain(projectType);
      }
    });

    it('should include all specified technologies in prompt', async () => {
      const technologies = ['react', 'node', 'postgresql', 'redis'];
      const projectInfo = {
        projectPath: './test-project',
        technologies,
        patterns: [],
        projectType: 'web-application'
      };
      
      const result = await generateArchitecturalKnowledge(projectInfo, createTestKnowledgeConfig());
      
      technologies.forEach(tech => {
        expect(result.prompt.toLowerCase()).toContain(tech.toLowerCase());
      });
    });

    it('should respect depth configuration', async () => {
      const projectInfo = {
        projectPath: './test-project',
        technologies: ['react'],
        patterns: [],
        projectType: 'web-application'
      };
      
      const depths = ['basic', 'intermediate', 'advanced'];
      
      for (const depth of depths) {
        const config = createTestKnowledgeConfig({ depth });
        const result = await generateArchitecturalKnowledge(projectInfo, config);
        
        expect(result.prompt).toContain(depth);
        expect(result.context.depth).toBe(depth);
      }
    });

    it('should handle empty technologies gracefully', async () => {
      const projectInfo = {
        projectPath: './test-project',
        technologies: [],
        patterns: [],
        projectType: 'general'
      };
      
      const result = await generateArchitecturalKnowledge(projectInfo, createTestKnowledgeConfig());
      
      expect(validateKnowledgeResult(result)).toBe(true);
      expect(result.prompt).toContain('auto-detect');
    });

    it('should generate cache key correctly', async () => {
      const projectInfo = {
        projectPath: './test-project',
        technologies: ['react'],
        patterns: [],
        projectType: 'web-application'
      };
      
      const config = createTestKnowledgeConfig();
      const result = await generateArchitecturalKnowledge(projectInfo, config);
      
      expect(result.context.cacheKey).toBeDefined();
      expect(typeof result.context.cacheKey).toBe('string');
      expect(result.context.cacheKey).toContain('knowledge');
    });
  });

  describe('generateDomainKnowledge', () => {
    it('should generate domain-specific knowledge', async () => {
      const domains: ArchitecturalDomain[] = ['api-design', 'database-design'];

      for (const domain of domains) {
        const result = await generateDomainKnowledge(domain, 'intermediate' as KnowledgeDepth);
        
        expect(validateKnowledgeResult(result)).toBe(true);
        expect(result.prompt).toContain(domain);
        expect(result.context.domain).toBe(domain);
      }
    });

    it('should handle invalid domains gracefully', async () => {
      await expect(generateDomainKnowledge('invalid-domain' as ArchitecturalDomain, 'basic' as KnowledgeDepth))
        .rejects.toThrow('Unsupported domain');
    });
  });

  describe('enhancePromptWithKnowledge', () => {
    it('should enhance prompt with knowledge context', async () => {
      const basePrompt = createTestPrompt();
      const domains: ArchitecturalDomain[] = ['api-design', 'database-design'];

      const result = await enhancePromptWithKnowledge(basePrompt, domains);
      
      expect(result.prompt).toContain(basePrompt.prompt);
      expect(result.prompt).toContain('api-design');
      expect(result.context.knowledgeEnhanced).toBe(true);
    });

    it('should preserve original context', async () => {
      const basePrompt = createTestPrompt({
        context: { customField: 'customValue' }
      });
      const domains: ArchitecturalDomain[] = ['web-applications'];

      const result = await enhancePromptWithKnowledge(basePrompt, domains);
      
      expect(result.context.customField).toBe('customValue');
      expect(result.context.knowledgeEnhanced).toBe(true);
    });
  });

  describe('Configuration Validation', () => {
    it('should validate correct configuration', () => {
      const validConfig = createTestKnowledgeConfig();
      
      expect(() => validateKnowledgeConfig(validConfig)).not.toThrow();
    });

    it('should reject invalid max tokens', () => {
      const invalidConfig = createTestKnowledgeConfig({ maxTokens: -1 });
      
      expect(() => validateKnowledgeConfig(invalidConfig))
        .toThrow('Max tokens must be positive');
    });

    it('should reject invalid depth', () => {
      const invalidConfig = createTestKnowledgeConfig({ depth: 'invalid' });
      
      expect(() => validateKnowledgeConfig(invalidConfig))
        .toThrow('Invalid depth');
    });

    it('should reject empty domains', () => {
      const invalidConfig = createTestKnowledgeConfig({ domains: [] });
      
      expect(() => validateKnowledgeConfig(invalidConfig))
        .toThrow('At least one domain must be specified');
    });
  });

  describe('Utility Functions', () => {
    it('should return supported domains', () => {
      const domains = getSupportedDomains();
      
      expect(Array.isArray(domains)).toBe(true);
      expect(domains.length).toBeGreaterThan(0);
      expect(domains).toContain('api-design');
      expect(domains).toContain('database-design');
    });

    it('should return supported depths', () => {
      const depths = getSupportedDepths();
      
      expect(Array.isArray(depths)).toBe(true);
      expect(depths).toEqual(['basic', 'intermediate', 'advanced']);
    });

    it('should create domain-specific configuration', () => {
      const config = createDomainKnowledgeConfig('api-design');
      
      expect(config.domains).toContain('api-design');
      expect(config.depth).toBeDefined();
      expect(config.cacheEnabled).toBe(true);
    });

    it('should generate consistent cache keys', () => {
      const domains: ArchitecturalDomain[] = ['web-applications', 'api-design'];
      const context = {
        projectPath: './test',
        technologies: ['react'],
        patterns: [],
        projectType: 'web-app'
      };
      const config: KnowledgeGenerationConfig = createTestKnowledgeConfig();

      const key1 = generateKnowledgeCacheKey(domains, context, config);
      const key2 = generateKnowledgeCacheKey(domains, context, config);
      
      expect(key1).toBe(key2);
      expect(key1).toContain('knowledge');
    });
  });

  describe('Performance Tests', () => {
    it('should complete knowledge generation within time limit', async () => {
      const projectInfo = {
        projectPath: './test-project',
        technologies: ['react', 'node'],
        patterns: [],
        projectType: 'web-application'
      };
      
      const { executionTime } = await measureExecutionTime(async () => {
        return await generateArchitecturalKnowledge(projectInfo, createTestKnowledgeConfig());
      });
      
      expect(executionTime).toBeLessThan(1000); // Should complete within 1 second
    });

    it('should handle multiple concurrent requests', async () => {
      const projectInfo = {
        projectPath: './test-project',
        technologies: ['react'],
        patterns: [],
        projectType: 'web-application'
      };
      
      const promises = Array(5).fill(null).map(() => 
        generateArchitecturalKnowledge(projectInfo, createTestKnowledgeConfig())
      );
      
      const results = await Promise.all(promises);
      
      results.forEach(result => {
        expect(validateKnowledgeResult(result)).toBe(true);
      });
    });

    it('should maintain performance with large technology lists', async () => {
      const largeTechList = Array(20).fill(null).map((_, i) => `tech-${i}`);
      const projectInfo = {
        projectPath: './test-project',
        technologies: largeTechList,
        patterns: [],
        projectType: 'web-application'
      };
      
      const benchmark = await runBenchmark(async () => {
        return await generateArchitecturalKnowledge(projectInfo, createTestKnowledgeConfig());
      }, { iterations: 3 });
      
      expect(benchmark.averageTime).toBeLessThan(2000); // Should average under 2 seconds
      expect(benchmark.memoryUsage).toBeLessThan(50); // Should use less than 50MB
    });
  });

  describe('Error Handling', () => {
    it('should handle missing project path', async () => {
      const projectInfo = {
        projectPath: '',
        technologies: [],
        patterns: [],
        projectType: 'web-application'
      };
      
      await expect(generateArchitecturalKnowledge(projectInfo, createTestKnowledgeConfig()))
        .rejects.toThrow('Project path is required');
    });

    it('should handle invalid project type', async () => {
      const projectInfo = {
        projectPath: './test',
        technologies: [],
        patterns: [],
        projectType: 'invalid-type'
      };
      
      const result = await generateArchitecturalKnowledge(projectInfo, createTestKnowledgeConfig());
      
      // Should not throw, but should handle gracefully
      expect(validateKnowledgeResult(result)).toBe(true);
    });
  });
});
