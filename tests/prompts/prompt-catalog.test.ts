/**
 * Tests for CE-MCP Prompt Catalog
 *
 * Tests lazy loading behavior, section extraction, cache functionality,
 * and token estimation accuracy.
 *
 * @see ADR-014: CE-MCP Architecture
 */

import {
  PROMPT_CATALOG,
  getTotalPromptTokens,
  getPromptsByCategory,
  getPromptMetadata,
  PromptLoader,
  getPromptLoader,
  resetPromptLoader,
  calculateTokenSavings,
} from '../../src/prompts/prompt-catalog.js';

describe('PromptCatalog', () => {
  describe('PROMPT_CATALOG constant', () => {
    it('should contain expected prompt entries', () => {
      const expectedPrompts = [
        'adr-suggestion',
        'deployment-analysis',
        'environment-analysis',
        'research-question',
        'rule-generation',
        'analysis',
        'research-integration',
        'validated-pattern',
        'security',
        'index',
      ];

      for (const prompt of expectedPrompts) {
        expect(PROMPT_CATALOG[prompt]).toBeDefined();
      }
    });

    it('should have valid metadata for each entry', () => {
      for (const [name, entry] of Object.entries(PROMPT_CATALOG)) {
        expect(entry.file).toBeDefined();
        expect(entry.file).toMatch(/\.ts$/);
        expect(entry.tokens).toBeGreaterThan(0);
        expect(['adr', 'deployment', 'analysis', 'research', 'security', 'rules']).toContain(
          entry.category
        );
        expect(Array.isArray(entry.sections)).toBe(true);
        expect(entry.sections.length).toBeGreaterThan(0);
        expect(typeof entry.loadOnDemand).toBe('boolean');
      }
    });

    it('should have dependencies only for prompts that need them', () => {
      // Only index prompt should have dependencies
      expect(PROMPT_CATALOG['index'].dependencies).toBeDefined();
      expect(PROMPT_CATALOG['index'].dependencies).toContain('adr-suggestion');

      // Most prompts should not have dependencies
      expect(PROMPT_CATALOG['adr-suggestion'].dependencies).toBeUndefined();
      expect(PROMPT_CATALOG['security'].dependencies).toBeUndefined();
    });

    it('should mark index as not load-on-demand', () => {
      expect(PROMPT_CATALOG['index'].loadOnDemand).toBe(false);
    });

    it('should mark most prompts as load-on-demand', () => {
      const loadOnDemandPrompts = Object.entries(PROMPT_CATALOG).filter(
        ([name, entry]) => entry.loadOnDemand
      );
      // All except 'index' should be load-on-demand
      expect(loadOnDemandPrompts.length).toBe(Object.keys(PROMPT_CATALOG).length - 1);
    });
  });

  describe('getTotalPromptTokens', () => {
    it('should return sum of all prompt tokens', () => {
      const total = getTotalPromptTokens();
      const manualSum = Object.values(PROMPT_CATALOG).reduce((sum, entry) => sum + entry.tokens, 0);
      expect(total).toBe(manualSum);
    });

    it('should return a reasonable token count', () => {
      const total = getTotalPromptTokens();
      // Based on catalog, total should be around 24-25K tokens
      expect(total).toBeGreaterThan(20000);
      expect(total).toBeLessThan(30000);
    });
  });

  describe('getPromptsByCategory', () => {
    it('should return prompts for adr category', () => {
      const adrPrompts = getPromptsByCategory('adr');
      expect(adrPrompts).toContain('adr-suggestion');
    });

    it('should return prompts for deployment category', () => {
      const deploymentPrompts = getPromptsByCategory('deployment');
      expect(deploymentPrompts).toContain('deployment-analysis');
      expect(deploymentPrompts).toContain('validated-pattern');
    });

    it('should return prompts for analysis category', () => {
      const analysisPrompts = getPromptsByCategory('analysis');
      expect(analysisPrompts).toContain('analysis');
      expect(analysisPrompts).toContain('environment-analysis');
      expect(analysisPrompts).toContain('index');
    });

    it('should return prompts for research category', () => {
      const researchPrompts = getPromptsByCategory('research');
      expect(researchPrompts).toContain('research-question');
      expect(researchPrompts).toContain('research-integration');
    });

    it('should return prompts for security category', () => {
      const securityPrompts = getPromptsByCategory('security');
      expect(securityPrompts).toContain('security');
    });

    it('should return prompts for rules category', () => {
      const rulesPrompts = getPromptsByCategory('rules');
      expect(rulesPrompts).toContain('rule-generation');
    });

    it('should return empty array for unknown category', () => {
      const unknownPrompts = getPromptsByCategory('unknown' as any);
      expect(unknownPrompts).toEqual([]);
    });
  });

  describe('getPromptMetadata', () => {
    it('should return metadata for existing prompt', () => {
      const metadata = getPromptMetadata('adr-suggestion');
      expect(metadata).toBeDefined();
      expect(metadata?.file).toBe('adr-suggestion-prompts.ts');
      expect(metadata?.tokens).toBe(1830);
      expect(metadata?.category).toBe('adr');
    });

    it('should return undefined for non-existent prompt', () => {
      const metadata = getPromptMetadata('non-existent-prompt');
      expect(metadata).toBeUndefined();
    });
  });

  describe('PromptLoader', () => {
    let loader: PromptLoader;

    beforeEach(() => {
      loader = new PromptLoader(3600);
    });

    describe('loadPrompt', () => {
      it('should load a prompt by name', async () => {
        const content = await loader.loadPrompt('adr-suggestion');
        expect(content).toBeDefined();
        expect(content).toContain('PROMPT_FILE');
      });

      it('should throw error for unknown prompt', async () => {
        await expect(loader.loadPrompt('unknown-prompt')).rejects.toThrow('Unknown prompt');
      });

      it('should cache loaded prompts', async () => {
        await loader.loadPrompt('adr-suggestion');
        const stats = loader.getCacheStats();
        expect(stats.size).toBe(1);
        expect(stats.entries).toContain('adr-suggestion');
      });

      it('should return cached content on subsequent calls', async () => {
        const content1 = await loader.loadPrompt('adr-suggestion');
        const content2 = await loader.loadPrompt('adr-suggestion');
        expect(content1).toBe(content2);
      });

      it('should throw error for non-existent section', async () => {
        await expect(loader.loadPrompt('adr-suggestion', 'non-existent-section')).rejects.toThrow(
          "Section 'non-existent-section' not found"
        );
      });
    });

    describe('preloadPromptGroup', () => {
      it('should preload multiple prompts', async () => {
        await loader.preloadPromptGroup(['adr-suggestion', 'security']);
        const stats = loader.getCacheStats();
        expect(stats.size).toBe(2);
        expect(stats.entries).toContain('adr-suggestion');
        expect(stats.entries).toContain('security');
      });
    });

    describe('getEstimatedTokens', () => {
      it('should return tokens for known prompt', () => {
        const tokens = loader.getEstimatedTokens('adr-suggestion');
        expect(tokens).toBe(1830);
      });

      it('should return 0 for unknown prompt', () => {
        const tokens = loader.getEstimatedTokens('unknown');
        expect(tokens).toBe(0);
      });

      it('should estimate section tokens as portion of total', () => {
        const totalTokens = loader.getEstimatedTokens('adr-suggestion');
        const sectionTokens = loader.getEstimatedTokens('adr-suggestion', 'implicit_decisions');

        // Section should be fraction of total
        expect(sectionTokens).toBeLessThan(totalTokens);
        expect(sectionTokens).toBeGreaterThan(0);

        // With 5 sections, each section should be ~1/5 of total
        const expectedPerSection = Math.ceil(totalTokens / 5);
        expect(sectionTokens).toBe(expectedPerSection);
      });
    });

    describe('getLoadRecommendations', () => {
      it('should recommend prompts for adr_analysis task', () => {
        const recommendations = loader.getLoadRecommendations('adr_analysis');
        expect(recommendations).toContain('adr-suggestion');
        expect(recommendations).toContain('analysis');
      });

      it('should recommend prompts for deployment task', () => {
        const recommendations = loader.getLoadRecommendations('deployment');
        expect(recommendations).toContain('deployment-analysis');
        expect(recommendations).toContain('validated-pattern');
        expect(recommendations).toContain('environment-analysis');
      });

      it('should recommend prompts for security task', () => {
        const recommendations = loader.getLoadRecommendations('security');
        expect(recommendations).toContain('security');
        expect(recommendations).toContain('analysis');
      });

      it('should recommend prompts for research task', () => {
        const recommendations = loader.getLoadRecommendations('research');
        expect(recommendations).toContain('research-question');
        expect(recommendations).toContain('research-integration');
      });

      it('should recommend prompts for rules task', () => {
        const recommendations = loader.getLoadRecommendations('rules');
        expect(recommendations).toContain('rule-generation');
        expect(recommendations).toContain('analysis');
      });

      it('should return default for unknown task', () => {
        const recommendations = loader.getLoadRecommendations('unknown_task');
        expect(recommendations).toEqual(['analysis']);
      });
    });

    describe('clearCache', () => {
      it('should clear all cached prompts', async () => {
        await loader.loadPrompt('adr-suggestion');
        await loader.loadPrompt('security');
        expect(loader.getCacheStats().size).toBe(2);

        loader.clearCache();
        expect(loader.getCacheStats().size).toBe(0);
      });
    });

    describe('getCacheStats', () => {
      it('should return empty stats initially', () => {
        const stats = loader.getCacheStats();
        expect(stats.size).toBe(0);
        expect(stats.entries).toEqual([]);
      });

      it('should track cached entries', async () => {
        await loader.loadPrompt('adr-suggestion');
        await loader.loadPrompt('deployment-analysis');

        const stats = loader.getCacheStats();
        expect(stats.size).toBe(2);
        expect(stats.entries).toHaveLength(2);
      });
    });

    describe('cache expiration', () => {
      it('should expire cache entries after TTL', async () => {
        // Create loader with very short TTL (1 second)
        const shortTTLLoader = new PromptLoader(0.001); // 1ms TTL

        await shortTTLLoader.loadPrompt('adr-suggestion');

        // Wait for cache to expire
        await new Promise(resolve => setTimeout(resolve, 10));

        // This should trigger a cache miss and reload
        const content = await shortTTLLoader.loadPrompt('adr-suggestion');
        expect(content).toBeDefined();
      });
    });
  });

  describe('Global PromptLoader', () => {
    beforeEach(() => {
      resetPromptLoader();
    });

    afterEach(() => {
      resetPromptLoader();
    });

    it('should return same instance from getPromptLoader', () => {
      const loader1 = getPromptLoader();
      const loader2 = getPromptLoader();
      expect(loader1).toBe(loader2);
    });

    it('should reset global instance', () => {
      const loader1 = getPromptLoader();
      resetPromptLoader();
      const loader2 = getPromptLoader();
      expect(loader1).not.toBe(loader2);
    });

    it('should accept cacheTTL on first call', () => {
      const loader = getPromptLoader(7200);
      // The loader should be created with the specified TTL
      expect(loader).toBeDefined();
    });
  });

  describe('calculateTokenSavings', () => {
    it('should calculate savings when no prompts loaded', () => {
      const savings = calculateTokenSavings([]);
      const total = getTotalPromptTokens();

      expect(savings.loaded).toBe(0);
      expect(savings.total).toBe(total);
      expect(savings.saved).toBe(total);
      expect(savings.percentage).toBe(100);
    });

    it('should calculate savings when some prompts loaded', () => {
      const savings = calculateTokenSavings(['adr-suggestion', 'security']);
      const total = getTotalPromptTokens();
      const loaded = 1830 + 1270; // adr-suggestion + security tokens

      expect(savings.loaded).toBe(loaded);
      expect(savings.total).toBe(total);
      expect(savings.saved).toBe(total - loaded);
      expect(savings.percentage).toBeGreaterThan(80); // Should save >80%
    });

    it('should calculate savings when all prompts loaded', () => {
      const allPrompts = Object.keys(PROMPT_CATALOG);
      const savings = calculateTokenSavings(allPrompts);
      const total = getTotalPromptTokens();

      expect(savings.loaded).toBe(total);
      expect(savings.saved).toBe(0);
      expect(savings.percentage).toBe(0);
    });

    it('should handle unknown prompts gracefully', () => {
      const savings = calculateTokenSavings(['unknown-prompt', 'adr-suggestion']);

      // Should only count known prompts
      expect(savings.loaded).toBe(1830); // Only adr-suggestion
    });
  });

  describe('Token estimation accuracy', () => {
    it('should have consistent token estimates across catalog', () => {
      const entries = Object.values(PROMPT_CATALOG);

      // Token estimates should be reasonable for file sizes
      for (const entry of entries) {
        // Minimum ~500 tokens for any useful prompt
        expect(entry.tokens).toBeGreaterThanOrEqual(1000);
        // Maximum ~5000 tokens for any single prompt
        expect(entry.tokens).toBeLessThanOrEqual(5000);
      }
    });

    it('should estimate section tokens proportionally', () => {
      const loader = new PromptLoader();

      for (const [name, entry] of Object.entries(PROMPT_CATALOG)) {
        const totalTokens = entry.tokens;
        const sectionCount = entry.sections.length;
        const expectedPerSection = Math.ceil(totalTokens / sectionCount);

        // Each section's estimate should be proportional
        for (const section of entry.sections) {
          const sectionEstimate = loader.getEstimatedTokens(name, section);
          expect(sectionEstimate).toBe(expectedPerSection);
        }
      }
    });
  });
});
