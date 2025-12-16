/**
 * Unit tests for architectural-context-resource.ts
 * Tests architectural context generation, caching, and parameter handling
 */

import { URLSearchParams } from 'url';
import { describe, it, expect, beforeAll, beforeEach, afterEach, jest } from '@jest/globals';

// Mock conditional-request (needed for generateETag)
jest.unstable_mockModule('../../src/utils/conditional-request.js', () => ({
  generateStrongETag: jest.fn((data: any) => `etag-${JSON.stringify(data).length}`),
}));

// Mock ResourceCache
const mockCacheGet = jest.fn();
const mockCacheSet = jest.fn();

jest.unstable_mockModule('../../src/resources/resource-cache.js', () => ({
  resourceCache: {
    get: mockCacheGet,
    set: mockCacheSet,
  },
  generateETag: (data: any) => `etag-${JSON.stringify(data).length}`,
  ResourceCache: jest.fn(),
}));

// Mock path module
jest.unstable_mockModule('path', () => ({
  default: {
    resolve: jest.fn((...args: string[]) => args.join('/')),
  },
  resolve: jest.fn((...args: string[]) => args.join('/')),
}));

// Mock ADR discovery
const mockDiscoverAdrs = jest.fn();

jest.unstable_mockModule('../../src/utils/adr-discovery.js', () => ({
  discoverAdrsInDirectory: mockDiscoverAdrs,
}));

describe('Architectural Context Resource', () => {
  let generateArchitecturalContextResource: any;
  let mockKgManager: any;

  beforeAll(async () => {
    const module = await import('../../src/resources/architectural-context-resource.js');
    generateArchitecturalContextResource = module.generateArchitecturalContextResource;
  });

  beforeEach(() => {
    jest.clearAllMocks();

    // Default: no cache hit
    mockCacheGet.mockResolvedValue(null);

    // Default: successful ADR discovery
    mockDiscoverAdrs.mockResolvedValue({
      adrs: [
        {
          filename: 'adr-001-database-architecture.md',
          title: 'Use PostgreSQL for Primary Database',
          status: 'accepted',
          context: 'We need a reliable database for storing user data',
          decision: 'Use PostgreSQL with TypeScript and connection pooling',
          consequences: 'Improved data integrity, requires PostgreSQL expertise',
        },
        {
          filename: 'adr-002-api-design.md',
          title: 'RESTful API Design',
          status: 'accepted',
          context: 'Need to expose functionality via API',
          decision: 'Use REST with GraphQL for complex queries',
          consequences: 'Good developer experience, learning curve for GraphQL',
        },
        {
          filename: 'adr-003-caching-strategy.md',
          title: 'Redis Caching Strategy',
          status: 'proposed',
          context: 'Performance improvements needed',
          decision: 'Implement Redis caching with circuit breaker pattern',
          consequences: 'Better performance, additional infrastructure',
        },
        {
          filename: 'adr-004-legacy-auth.md',
          title: 'Legacy Authentication System',
          status: 'deprecated',
          context: 'Old authentication approach',
          decision: 'Use basic auth',
          consequences: 'Simple but insecure',
        },
      ],
      totalAdrs: 4,
      adrDirectory: '/test/project/docs/adrs',
    });

    // Mock knowledge graph manager - uses loadKnowledgeGraph, not getKnowledgeGraph
    mockKgManager = {
      loadKnowledgeGraph: jest.fn().mockResolvedValue({
        intents: [
          {
            id: 'intent-1',
            parsedGoals: ['Implement React framework', 'Use Repository Pattern'],
          },
        ],
      }),
    };
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('Basic Resource Generation', () => {
    it('should generate architectural context with default parameters', async () => {
      const result = await generateArchitecturalContextResource(
        {},
        new URLSearchParams(),
        mockKgManager
      );

      expect(result).toBeDefined();
      expect(result.data).toBeDefined();
      expect(result.data.summary).toBeDefined();
      expect(result.contentType).toBe('application/json');
      expect(result.cacheKey).toBe('architectural-context');
      expect(result.ttl).toBe(300); // 5 minutes
    });

    it('should include timestamp in response', async () => {
      const result = await generateArchitecturalContextResource(
        {},
        new URLSearchParams(),
        mockKgManager
      );

      expect(result.data.timestamp).toBeDefined();
      expect(new Date(result.data.timestamp).getTime()).toBeGreaterThan(0);
    });

    it('should include project path in response', async () => {
      const result = await generateArchitecturalContextResource(
        {},
        new URLSearchParams(),
        mockKgManager
      );

      expect(result.data.projectPath).toBe(process.cwd());
    });
  });

  describe('Summary Generation', () => {
    it('should count ADRs by status', async () => {
      const result = await generateArchitecturalContextResource(
        {},
        new URLSearchParams(),
        mockKgManager
      );

      expect(result.data.summary.totalAdrs).toBe(4);
      expect(result.data.summary.activeDecisions).toBe(2);
      expect(result.data.summary.deprecatedDecisions).toBe(1);
      expect(result.data.summary.proposedDecisions).toBe(1);
    });

    it('should extract technologies from ADR content', async () => {
      const result = await generateArchitecturalContextResource(
        {},
        new URLSearchParams(),
        mockKgManager
      );

      expect(result.data.summary.technologiesUsed).toContain('PostgreSQL');
      expect(result.data.summary.technologiesUsed).toContain('TypeScript');
      expect(result.data.summary.technologiesUsed).toContain('Redis');
      expect(result.data.summary.technologiesUsed).toContain('GraphQL');
    });

    it('should extract architectural patterns', async () => {
      const result = await generateArchitecturalContextResource(
        {},
        new URLSearchParams(),
        mockKgManager
      );

      expect(result.data.summary.architecturalPatterns).toContain('Circuit Breaker');
    });
  });

  describe('Decisions List', () => {
    it('should return list of decisions', async () => {
      const result = await generateArchitecturalContextResource(
        {},
        new URLSearchParams(),
        mockKgManager
      );

      expect(result.data.decisions).toBeInstanceOf(Array);
      expect(result.data.decisions.length).toBeGreaterThan(0);
    });

    it('should include decision metadata', async () => {
      const result = await generateArchitecturalContextResource(
        {},
        new URLSearchParams(),
        mockKgManager
      );

      const decision = result.data.decisions[0];
      expect(decision).toMatchObject({
        id: expect.any(String),
        title: expect.any(String),
        status: expect.any(String),
        category: expect.any(String),
        impact: expect.stringMatching(/^(high|medium|low)$/),
        dependencies: expect.any(Array),
      });
    });

    it('should respect maxDecisions parameter', async () => {
      const result = await generateArchitecturalContextResource(
        {},
        new URLSearchParams('maxDecisions=2'),
        mockKgManager
      );

      expect(result.data.decisions.length).toBeLessThanOrEqual(2);
    });
  });

  describe('Technology Stack', () => {
    it('should categorize technologies by layer', async () => {
      const result = await generateArchitecturalContextResource(
        {},
        new URLSearchParams(),
        mockKgManager
      );

      expect(result.data.technologyStack).toBeDefined();
      expect(result.data.technologyStack.frontend).toBeInstanceOf(Array);
      expect(result.data.technologyStack.backend).toBeInstanceOf(Array);
      expect(result.data.technologyStack.database).toBeInstanceOf(Array);
      expect(result.data.technologyStack.infrastructure).toBeInstanceOf(Array);
      expect(result.data.technologyStack.devops).toBeInstanceOf(Array);
    });

    it('should place PostgreSQL in database category', async () => {
      const result = await generateArchitecturalContextResource(
        {},
        new URLSearchParams(),
        mockKgManager
      );

      expect(result.data.technologyStack.database).toContain('PostgreSQL');
    });

    it('should place TypeScript in frontend category', async () => {
      const result = await generateArchitecturalContextResource(
        {},
        new URLSearchParams(),
        mockKgManager
      );

      expect(result.data.technologyStack.frontend).toContain('TypeScript');
    });
  });

  describe('Query Parameter Handling', () => {
    it('should exclude deprecated decisions when includeDeprecated is false', async () => {
      const result = await generateArchitecturalContextResource(
        {},
        new URLSearchParams('includeDeprecated=false'),
        mockKgManager
      );

      const hasDeprecated = result.data.decisions.some(
        (d: any) => d.status.toLowerCase() === 'deprecated'
      );
      expect(hasDeprecated).toBe(false);
    });

    it('should exclude proposed decisions when includeProposed is false', async () => {
      const result = await generateArchitecturalContextResource(
        {},
        new URLSearchParams('includeProposed=false'),
        mockKgManager
      );

      const hasProposed = result.data.decisions.some(
        (d: any) => d.status.toLowerCase() === 'proposed'
      );
      expect(hasProposed).toBe(false);
    });

    it('should use custom projectPath when provided', async () => {
      const customPath = '/custom/project/path';
      const result = await generateArchitecturalContextResource(
        {},
        new URLSearchParams(`projectPath=${customPath}`),
        mockKgManager
      );

      expect(result.data.projectPath).toBe(customPath);
    });
  });

  describe('Knowledge Graph Integration', () => {
    it('should call loadKnowledgeGraph when manager is provided', async () => {
      const result = await generateArchitecturalContextResource(
        {},
        new URLSearchParams(),
        mockKgManager
      );

      expect(mockKgManager.loadKnowledgeGraph).toHaveBeenCalled();
      // Technologies come from ADR content, not KG
      expect(result.data.summary.technologiesUsed).toContain('PostgreSQL');
    });

    it('should extract patterns from ADR content', async () => {
      const result = await generateArchitecturalContextResource(
        {},
        new URLSearchParams(),
        mockKgManager
      );

      // Patterns are extracted from ADR content (circuit breaker is in mock data)
      expect(result.data.summary.architecturalPatterns).toContain('Circuit Breaker');
    });

    it('should handle missing knowledge graph gracefully', async () => {
      mockKgManager.loadKnowledgeGraph.mockRejectedValue(new Error('KG not available'));

      const result = await generateArchitecturalContextResource(
        {},
        new URLSearchParams(),
        mockKgManager
      );

      expect(result.data.summary).toBeDefined();
      // Should still work without KG data
    });

    it('should work without knowledge graph manager', async () => {
      const result = await generateArchitecturalContextResource({}, new URLSearchParams());

      expect(result.data.summary).toBeDefined();
      expect(result.data.decisions).toBeInstanceOf(Array);
    });
  });

  describe('Recommendations', () => {
    it('should generate recommendations based on analysis', async () => {
      const result = await generateArchitecturalContextResource(
        {},
        new URLSearchParams(),
        mockKgManager
      );

      expect(result.data.recommendations).toBeInstanceOf(Array);
      expect(result.data.recommendations.length).toBeGreaterThan(0);
    });

    it('should recommend reviewing proposed ADRs when count is high', async () => {
      mockDiscoverAdrs.mockResolvedValue({
        adrs: Array(5)
          .fill(null)
          .map((_, i) => ({
            filename: `adr-00${i}.md`,
            title: `Proposed ADR ${i}`,
            status: 'proposed',
          })),
        totalAdrs: 5,
      });

      const result = await generateArchitecturalContextResource(
        {},
        new URLSearchParams(),
        mockKgManager
      );

      const hasProposedRecommendation = result.data.recommendations.some((r: string) =>
        r.toLowerCase().includes('proposed')
      );
      expect(hasProposedRecommendation).toBe(true);
    });

    it('should recommend reviewing deprecated ADRs', async () => {
      const result = await generateArchitecturalContextResource(
        {},
        new URLSearchParams(),
        mockKgManager
      );

      const hasDeprecatedRecommendation = result.data.recommendations.some((r: string) =>
        r.toLowerCase().includes('deprecated')
      );
      expect(hasDeprecatedRecommendation).toBe(true);
    });
  });

  describe('Patterns Analysis', () => {
    it('should return list of detected patterns', async () => {
      const result = await generateArchitecturalContextResource(
        {},
        new URLSearchParams(),
        mockKgManager
      );

      expect(result.data.patterns).toBeInstanceOf(Array);
    });

    it('should include pattern descriptions', async () => {
      const result = await generateArchitecturalContextResource(
        {},
        new URLSearchParams(),
        mockKgManager
      );

      if (result.data.patterns.length > 0) {
        const pattern = result.data.patterns[0];
        expect(pattern).toMatchObject({
          name: expect.any(String),
          description: expect.any(String),
          usedIn: expect.any(Array),
          relatedAdrs: expect.any(Array),
        });
      }
    });
  });

  describe('Caching', () => {
    it('should return cached result when available', async () => {
      const cachedResult = {
        data: {
          summary: { totalAdrs: 10 },
          timestamp: new Date().toISOString(),
        },
        contentType: 'application/json',
        cacheKey: 'architectural-context',
      };

      mockCacheGet.mockResolvedValue(cachedResult);

      const result = await generateArchitecturalContextResource(
        {},
        new URLSearchParams(),
        mockKgManager
      );

      expect(result).toBe(cachedResult);
      expect(mockDiscoverAdrs).not.toHaveBeenCalled();
    });

    it('should cache result after generation', async () => {
      await generateArchitecturalContextResource({}, new URLSearchParams(), mockKgManager);

      expect(mockCacheSet).toHaveBeenCalledWith(
        'architectural-context',
        expect.objectContaining({
          data: expect.any(Object),
          contentType: 'application/json',
          cacheKey: 'architectural-context',
          ttl: 300,
        }),
        300
      );
    });

    it('should use 5 minute TTL for context data', async () => {
      const result = await generateArchitecturalContextResource(
        {},
        new URLSearchParams(),
        mockKgManager
      );

      expect(result.ttl).toBe(300);
    });
  });

  describe('Error Handling', () => {
    it('should throw error when ADR discovery fails', async () => {
      mockDiscoverAdrs.mockRejectedValue(new Error('Discovery failed'));

      await expect(
        generateArchitecturalContextResource({}, new URLSearchParams(), mockKgManager)
      ).rejects.toThrow('Failed to generate architectural context');
    });

    it('should handle empty ADR list', async () => {
      mockDiscoverAdrs.mockResolvedValue({
        adrs: [],
        totalAdrs: 0,
      });

      const result = await generateArchitecturalContextResource(
        {},
        new URLSearchParams(),
        mockKgManager
      );

      expect(result.data.summary.totalAdrs).toBe(0);
      expect(result.data.decisions).toEqual([]);
    });
  });

  describe('Response Structure', () => {
    it('should return properly structured ResourceGenerationResult', async () => {
      const result = await generateArchitecturalContextResource(
        {},
        new URLSearchParams(),
        mockKgManager
      );

      expect(result).toMatchObject({
        data: expect.objectContaining({
          summary: expect.objectContaining({
            totalAdrs: expect.any(Number),
            activeDecisions: expect.any(Number),
            deprecatedDecisions: expect.any(Number),
            proposedDecisions: expect.any(Number),
            technologiesUsed: expect.any(Array),
            architecturalPatterns: expect.any(Array),
          }),
          decisions: expect.any(Array),
          technologyStack: expect.objectContaining({
            frontend: expect.any(Array),
            backend: expect.any(Array),
            database: expect.any(Array),
            infrastructure: expect.any(Array),
            devops: expect.any(Array),
          }),
          patterns: expect.any(Array),
          recommendations: expect.any(Array),
          timestamp: expect.any(String),
          projectPath: expect.any(String),
        }),
        contentType: 'application/json',
        lastModified: expect.any(String),
        cacheKey: 'architectural-context',
        ttl: 300,
        etag: expect.any(String),
      });
    });

    it('should generate valid etag', async () => {
      const result = await generateArchitecturalContextResource(
        {},
        new URLSearchParams(),
        mockKgManager
      );

      expect(result.etag).toBeDefined();
      expect(typeof result.etag).toBe('string');
      expect(result.etag.length).toBeGreaterThan(0);
    });
  });
});
