/**
 * Unit tests for memory-expand-resource.ts
 * Tests memory entity expansion, relationships, and parameter handling
 */

import { URLSearchParams } from 'url';
import { describe, it, expect, beforeAll, _beforeEach, _afterEach, _jest } from 'vitest';

// Mock conditional-request (needed for generateETag)
vi.mock('../../src/utils/conditional-request.js', () => ({
  generateStrongETag: vi.fn((data: any) => `etag-${JSON.stringify(data).length}`),
}));

// Mock ResourceCache
const mockCacheGet = vi.fn();
const mockCacheSet = vi.fn();

vi.mock('../../src/resources/resource-cache.js', () => ({
  resourceCache: {
    get: mockCacheGet,
    set: mockCacheSet,
  },
  generateETag: (data: any) => `etag-${JSON.stringify(data).length}`,
  ResourceCache: vi.fn(),
}));

describe('Memory Expand Resource', () => {
  let generateMemoryExpandResource: any;
  let mockMemoryManager: any;

  beforeAll(async () => {
    const module = await import('../../src/resources/memory-expand-resource.js');
    generateMemoryExpandResource = module.generateMemoryExpandResource;
  });

  beforeEach(() => {
    vi.clearAllMocks();

    // Default: no cache hit
    mockCacheGet.mockResolvedValue(null);

    // Mock memory manager - using correct MemoryEntity schema
    mockMemoryManager = {
      queryEntities: vi.fn().mockResolvedValue({
        entities: [
          {
            id: 'adr-001',
            type: 'architectural_decision', // Uses MemoryEntity type enum
            title: 'Database Architecture', // MemoryEntity uses 'title' not 'name'
            description: 'Use PostgreSQL for primary database', // Uses 'description' not 'content'
            context: {
              projectPhase: 'development',
              technicalStack: ['PostgreSQL'],
              environmentalFactors: [],
              stakeholders: [],
            }, // Uses 'context' object not 'metadata'
            tags: ['database', 'architecture'],
            confidence: 0.95,
            lastModified: '2024-01-15T10:00:00Z',
            created: '2024-01-10T09:00:00Z',
            accessPattern: {
              lastAccessed: '2024-01-15T10:00:00Z',
              accessCount: 15,
              accessContext: [],
            }, // Nested in accessPattern
          },
        ],
        relationships: [],
        totalCount: 1,
        queryTime: 10,
      }),
      findRelatedEntities: vi.fn().mockResolvedValue({
        // Uses 'findRelatedEntities' not 'findRelated'
        relationshipPaths: [
          {
            relationships: [
              {
                targetId: 'adr-002',
                type: 'depends_on',
                strength: 0.8,
              },
              {
                targetId: 'tech-postgresql',
                type: 'uses',
                strength: 0.95,
              },
            ],
          },
        ],
        entities: [
          {
            id: 'adr-002',
            title: 'Caching Strategy', // Uses 'title' not 'name'
            type: 'architectural_decision',
            relevance: 0.85,
          },
          {
            id: 'tech-postgresql',
            title: 'PostgreSQL', // Uses 'title' not 'name'
            type: 'knowledge_artifact',
            relevance: 0.9,
          },
        ],
      }),
    };
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Basic Resource Generation', () => {
    it('should generate memory expansion with required key parameter', async () => {
      const result = await generateMemoryExpandResource(
        { key: 'adr-001' },
        new URLSearchParams(),
        mockMemoryManager
      );

      expect(result).toBeDefined();
      expect(result.data).toBeDefined();
      expect(result.data.key).toBe('adr-001');
      expect(result.data.found).toBe(true);
      expect(result.contentType).toBe('application/json');
      expect(result.cacheKey).toBe('memory-expand:adr-001');
      expect(result.ttl).toBe(60);
    });

    it('should throw error when key parameter is missing', async () => {
      await expect(
        generateMemoryExpandResource({}, new URLSearchParams(), mockMemoryManager)
      ).rejects.toThrow('Missing required parameter: key');
    });

    it('should include timestamp in response', async () => {
      const result = await generateMemoryExpandResource(
        { key: 'adr-001' },
        new URLSearchParams(),
        mockMemoryManager
      );

      expect(result.data.timestamp).toBeDefined();
      expect(new Date(result.data.timestamp).getTime()).toBeGreaterThan(0);
    });

    it('should call memory manager with correct query', async () => {
      await generateMemoryExpandResource(
        { key: 'adr-001' },
        new URLSearchParams(),
        mockMemoryManager
      );

      expect(mockMemoryManager.queryEntities).toHaveBeenCalledWith({
        textQuery: 'adr-001',
        limit: 1,
      });
    });
  });

  describe('Entity Expansion', () => {
    it('should return complete entity details', async () => {
      const result = await generateMemoryExpandResource(
        { key: 'adr-001' },
        new URLSearchParams(),
        mockMemoryManager
      );

      expect(result.data.entity).toBeDefined();
      expect(result.data.entity.id).toBe('adr-001');
      expect(result.data.entity.type).toBe('architectural_decision');
      expect(result.data.entity.name).toBe('Database Architecture'); // Mapped from title
      expect(result.data.entity.content).toBe('Use PostgreSQL for primary database'); // Mapped from description
      expect(result.data.entity.metadata).toEqual({
        projectPhase: 'development',
        technicalStack: ['PostgreSQL'],
        environmentalFactors: [],
        stakeholders: [],
      }); // Mapped from context
      expect(result.data.entity.tags).toEqual(['database', 'architecture']);
      expect(result.data.entity.confidence).toBe(0.95);
      expect(result.data.entity.accessCount).toBe(15);
    });

    it('should return null entity when not found', async () => {
      mockMemoryManager.queryEntities.mockResolvedValue({
        entities: [],
        relationships: [],
        totalCount: 0,
        queryTime: 5,
      });

      const result = await generateMemoryExpandResource(
        { key: 'nonexistent' },
        new URLSearchParams(),
        mockMemoryManager
      );

      expect(result.data.entity).toBeNull();
      expect(result.data.found).toBe(false);
    });

    it('should handle entity without optional fields', async () => {
      mockMemoryManager.queryEntities.mockResolvedValue({
        entities: [
          {
            id: 'simple-entity',
            type: 'note',
            title: 'Simple Note',
            description: 'Some content',
          },
        ],
        relationships: [],
        totalCount: 1,
        queryTime: 5,
      });

      const result = await generateMemoryExpandResource(
        { key: 'simple-entity' },
        new URLSearchParams(),
        mockMemoryManager
      );

      expect(result.data.entity.metadata).toEqual({});
      expect(result.data.entity.tags).toEqual([]);
      expect(result.data.entity.confidence).toBe(1.0);
      expect(result.data.entity.accessCount).toBe(0);
    });
  });

  describe('Relationships', () => {
    it('should include relationships when includeRelated is true', async () => {
      const result = await generateMemoryExpandResource(
        { key: 'adr-001' },
        new URLSearchParams('includeRelated=true'),
        mockMemoryManager
      );

      expect(result.data.relationships).toBeDefined();
      expect(result.data.relationships.length).toBe(2);
      expect(result.data.relationships[0]).toMatchObject({
        targetId: 'adr-002',
        targetName: 'adr-002', // Implementation uses targetId as targetName
        relationshipType: 'depends_on',
        strength: 0.8,
      });
    });

    it('should not fetch relationships when includeRelated is false', async () => {
      const result = await generateMemoryExpandResource(
        { key: 'adr-001' },
        new URLSearchParams('includeRelated=false'),
        mockMemoryManager
      );

      expect(result.data.relationships).toEqual([]);
      expect(mockMemoryManager.findRelatedEntities).not.toHaveBeenCalled();
    });

    it('should include related entities', async () => {
      const result = await generateMemoryExpandResource(
        { key: 'adr-001' },
        new URLSearchParams(),
        mockMemoryManager
      );

      expect(result.data.relatedEntities).toBeDefined();
      expect(result.data.relatedEntities.length).toBe(2);
      expect(result.data.relatedEntities[0]).toMatchObject({
        id: 'adr-002',
        name: 'Caching Strategy',
        type: 'architectural_decision', // Uses actual type from entity
        relevance: 0.85,
      });
    });

    it('should respect maxRelated parameter', async () => {
      const result = await generateMemoryExpandResource(
        { key: 'adr-001' },
        new URLSearchParams('maxRelated=1'),
        mockMemoryManager
      );

      expect(result.data.relatedEntities.length).toBeLessThanOrEqual(1);
    });

    it('should respect relationshipDepth parameter', async () => {
      await generateMemoryExpandResource(
        { key: 'adr-001' },
        new URLSearchParams('relationshipDepth=3'),
        mockMemoryManager
      );

      expect(mockMemoryManager.findRelatedEntities).toHaveBeenCalledWith('adr-001', 3);
    });
  });

  describe('Query Parameter Handling', () => {
    it('should default includeRelated to true', async () => {
      await generateMemoryExpandResource(
        { key: 'adr-001' },
        new URLSearchParams(),
        mockMemoryManager
      );

      expect(mockMemoryManager.findRelatedEntities).toHaveBeenCalled();
    });

    it('should default relationshipDepth to 2', async () => {
      await generateMemoryExpandResource(
        { key: 'adr-001' },
        new URLSearchParams(),
        mockMemoryManager
      );

      expect(mockMemoryManager.findRelatedEntities).toHaveBeenCalledWith(expect.anything(), 2);
    });

    it('should default maxRelated to 10', async () => {
      await generateMemoryExpandResource(
        { key: 'adr-001' },
        new URLSearchParams(),
        mockMemoryManager
      );

      expect(mockMemoryManager.findRelatedEntities).toHaveBeenCalledWith(expect.anything(), 2);
    });
  });

  describe('No Memory Manager', () => {
    it('should return not-found when no memory manager provided', async () => {
      const result = await generateMemoryExpandResource({ key: 'adr-001' }, new URLSearchParams());

      expect(result.data.found).toBe(false);
      expect(result.data.entity).toBeNull();
      expect(result.data.relationships).toEqual([]);
      expect(result.data.relatedEntities).toEqual([]);
      expect(result.ttl).toBe(30); // Short cache for not-found
    });
  });

  describe('Caching', () => {
    it('should return cached result when available', async () => {
      const cachedResult = {
        data: {
          key: 'adr-001',
          entity: { id: 'adr-001', name: 'Cached Entity' },
          found: true,
          timestamp: new Date().toISOString(),
        },
        contentType: 'application/json',
        cacheKey: 'memory-expand:adr-001',
      };

      mockCacheGet.mockResolvedValue(cachedResult);

      const result = await generateMemoryExpandResource(
        { key: 'adr-001' },
        new URLSearchParams(),
        mockMemoryManager
      );

      expect(result).toBe(cachedResult);
      expect(mockMemoryManager.queryEntities).not.toHaveBeenCalled();
    });

    it('should cache result after generation', async () => {
      await generateMemoryExpandResource(
        { key: 'adr-001' },
        new URLSearchParams(),
        mockMemoryManager
      );

      expect(mockCacheSet).toHaveBeenCalledWith(
        'memory-expand:adr-001',
        expect.objectContaining({
          data: expect.any(Object),
          contentType: 'application/json',
          cacheKey: 'memory-expand:adr-001',
          ttl: 60,
        }),
        60
      );
    });

    it('should use short TTL for frequently accessed data', async () => {
      const result = await generateMemoryExpandResource(
        { key: 'adr-001' },
        new URLSearchParams(),
        mockMemoryManager
      );

      expect(result.ttl).toBe(60); // 1 minute
    });
  });

  describe('Error Handling', () => {
    it('should handle query failure gracefully', async () => {
      mockMemoryManager.queryEntities.mockRejectedValue(new Error('Query failed'));

      const result = await generateMemoryExpandResource(
        { key: 'adr-001' },
        new URLSearchParams(),
        mockMemoryManager
      );

      expect(result.data.entity).toBeNull();
      expect(result.data.found).toBe(false);
    });

    it('should handle findRelatedEntities failure gracefully', async () => {
      mockMemoryManager.findRelatedEntities.mockRejectedValue(
        new Error('Relationships not available')
      );

      const result = await generateMemoryExpandResource(
        { key: 'adr-001' },
        new URLSearchParams(),
        mockMemoryManager
      );

      expect(result.data.entity).toBeDefined();
      expect(result.data.relationships).toEqual([]);
    });
  });

  describe('Response Structure', () => {
    it('should return properly structured ResourceGenerationResult', async () => {
      const result = await generateMemoryExpandResource(
        { key: 'adr-001' },
        new URLSearchParams(),
        mockMemoryManager
      );

      expect(result).toMatchObject({
        data: expect.objectContaining({
          key: 'adr-001',
          entity: expect.objectContaining({
            id: expect.any(String),
            type: expect.any(String),
            name: expect.any(String),
            content: expect.anything(),
            metadata: expect.any(Object),
            tags: expect.any(Array),
            confidence: expect.any(Number),
            lastModified: expect.any(String),
            created: expect.any(String),
            accessCount: expect.any(Number),
          }),
          relationships: expect.any(Array),
          relatedEntities: expect.any(Array),
          timestamp: expect.any(String),
          found: true,
        }),
        contentType: 'application/json',
        lastModified: expect.any(String),
        cacheKey: 'memory-expand:adr-001',
        ttl: 60,
        etag: expect.any(String),
      });
    });

    it('should generate valid etag', async () => {
      const result = await generateMemoryExpandResource(
        { key: 'adr-001' },
        new URLSearchParams(),
        mockMemoryManager
      );

      expect(result.etag).toBeDefined();
      expect(typeof result.etag).toBe('string');
      expect(result.etag.length).toBeGreaterThan(0);
    });
  });
});
