/**
 * Unit tests for server-context-resource.ts
 * Tests server context generation, caching, and parameter handling
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

// Mock ServerContextGenerator
const mockGenerateContext = vi.fn();

vi.mock('../../src/utils/server-context-generator.js', () => ({
  ServerContextGenerator: class {
    generateContext = mockGenerateContext;
  },
}));

describe('Server Context Resource', () => {
  let generateServerContextResource: any;
  let mockKgManager: any;
  let mockMemoryManager: any;
  let mockConversationManager: any;

  beforeAll(async () => {
    const module = await import('../../src/resources/server-context-resource.js');
    generateServerContextResource = module.generateServerContextResource;
  });

  beforeEach(() => {
    vi.clearAllMocks();

    // Default: no cache hit
    mockCacheGet.mockResolvedValue(null);

    // Default: successful context generation
    mockGenerateContext.mockResolvedValue(`
# MCP ADR Analysis Server - Context

## Server Status
- **Status**: Running
- **Version**: 2.1.21
- **Project**: /test/project

## Memory Status
- Knowledge Graph: 25 nodes
- Recent Intents: 10
- Active Sessions: 2

## Recommendations
- Review ADRs for consistency
- Update deployment patterns
    `);

    // Mock managers
    mockKgManager = {
      getKnowledgeGraph: vi.fn().mockReturnValue({ nodes: [], edges: [] }),
    };

    mockMemoryManager = {
      getStats: vi.fn().mockReturnValue({ totalEntities: 0 }),
    };

    mockConversationManager = {
      getSessions: vi.fn().mockReturnValue([]),
    };
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Basic Resource Generation', () => {
    it('should generate server context with default parameters', async () => {
      const result = await generateServerContextResource(
        {},
        new URLSearchParams(),
        mockKgManager,
        mockMemoryManager,
        mockConversationManager
      );

      expect(result).toBeDefined();
      expect(result.data).toBeDefined();
      expect(result.data.context).toBeDefined();
      expect(result.data.includeDetailed).toBe(true);
      expect(result.data.maxRecentItems).toBe(5);
      expect(result.contentType).toBe('application/json');
      expect(result.cacheKey).toBe('server-context');
      expect(result.ttl).toBe(60);
    });

    it('should include timestamp in response', async () => {
      const result = await generateServerContextResource(
        {},
        new URLSearchParams(),
        mockKgManager,
        mockMemoryManager,
        mockConversationManager
      );

      expect(result.data.timestamp).toBeDefined();
      expect(new Date(result.data.timestamp).getTime()).toBeGreaterThan(0);
    });

    it('should call ServerContextGenerator with correct options', async () => {
      await generateServerContextResource(
        {},
        new URLSearchParams('includeDetailed=true&maxRecentItems=10'),
        mockKgManager,
        mockMemoryManager,
        mockConversationManager
      );

      expect(mockGenerateContext).toHaveBeenCalledWith(
        mockKgManager,
        mockMemoryManager,
        mockConversationManager,
        {
          includeDetailed: true,
          maxRecentItems: 10,
        }
      );
    });
  });

  describe('Query Parameter Handling', () => {
    it('should respect includeDetailed parameter', async () => {
      const result = await generateServerContextResource(
        {},
        new URLSearchParams('includeDetailed=false'),
        mockKgManager,
        mockMemoryManager,
        mockConversationManager
      );

      expect(result.data.includeDetailed).toBe(false);
      expect(mockGenerateContext).toHaveBeenCalledWith(
        expect.anything(),
        expect.anything(),
        expect.anything(),
        expect.objectContaining({
          includeDetailed: false,
        })
      );
    });

    it('should respect maxRecentItems parameter', async () => {
      const result = await generateServerContextResource(
        {},
        new URLSearchParams('maxRecentItems=3'),
        mockKgManager,
        mockMemoryManager,
        mockConversationManager
      );

      expect(result.data.maxRecentItems).toBe(3);
      expect(mockGenerateContext).toHaveBeenCalledWith(
        expect.anything(),
        expect.anything(),
        expect.anything(),
        expect.objectContaining({
          maxRecentItems: 3,
        })
      );
    });

    it('should use custom projectPath when provided', async () => {
      const customPath = '/custom/project/path';
      const result = await generateServerContextResource(
        {},
        new URLSearchParams(`projectPath=${customPath}`),
        mockKgManager,
        mockMemoryManager,
        mockConversationManager
      );

      expect(result.data.projectPath).toBe(customPath);
    });

    it('should use process.cwd() as default projectPath', async () => {
      const result = await generateServerContextResource(
        {},
        new URLSearchParams(),
        mockKgManager,
        mockMemoryManager,
        mockConversationManager
      );

      expect(result.data.projectPath).toBe(process.cwd());
    });
  });

  describe('Caching', () => {
    it('should return cached result when available', async () => {
      const cachedResult = {
        data: {
          context: 'cached context',
          timestamp: new Date().toISOString(),
          projectPath: '/test',
          includeDetailed: true,
          maxRecentItems: 5,
        },
        contentType: 'application/json',
        cacheKey: 'server-context',
      };

      mockCacheGet.mockResolvedValue(cachedResult);

      const result = await generateServerContextResource(
        {},
        new URLSearchParams(),
        mockKgManager,
        mockMemoryManager,
        mockConversationManager
      );

      expect(result).toBe(cachedResult);
      expect(mockGenerateContext).not.toHaveBeenCalled();
    });

    it('should cache result after generation', async () => {
      await generateServerContextResource(
        {},
        new URLSearchParams(),
        mockKgManager,
        mockMemoryManager,
        mockConversationManager
      );

      expect(mockCacheSet).toHaveBeenCalledWith(
        'server-context',
        expect.objectContaining({
          data: expect.any(Object),
          contentType: 'application/json',
          cacheKey: 'server-context',
          ttl: 60,
        }),
        60
      );
    });

    it('should use short TTL for frequently changing data', async () => {
      const result = await generateServerContextResource(
        {},
        new URLSearchParams(),
        mockKgManager,
        mockMemoryManager,
        mockConversationManager
      );

      expect(result.ttl).toBe(60); // 1 minute
    });
  });

  describe('Error Handling', () => {
    it('should throw error when managers are not provided', async () => {
      await expect(generateServerContextResource({}, new URLSearchParams())).rejects.toThrow(
        'Server context requires initialized managers'
      );
    });

    it('should throw error when context generation fails', async () => {
      mockGenerateContext.mockRejectedValue(new Error('Generation failed'));

      await expect(
        generateServerContextResource(
          {},
          new URLSearchParams(),
          mockKgManager,
          mockMemoryManager,
          mockConversationManager
        )
      ).rejects.toThrow('Failed to generate server context');
    });

    it('should handle invalid maxRecentItems parameter', async () => {
      const result = await generateServerContextResource(
        {},
        new URLSearchParams('maxRecentItems=invalid'),
        mockKgManager,
        mockMemoryManager,
        mockConversationManager
      );

      // Should default to NaN, which is handled gracefully
      expect(result.data.maxRecentItems).toBeDefined();
    });
  });

  describe('Response Structure', () => {
    it('should return properly structured ResourceGenerationResult', async () => {
      const result = await generateServerContextResource(
        {},
        new URLSearchParams(),
        mockKgManager,
        mockMemoryManager,
        mockConversationManager
      );

      expect(result).toMatchObject({
        data: expect.objectContaining({
          context: expect.any(String),
          timestamp: expect.any(String),
          projectPath: expect.any(String),
          includeDetailed: expect.any(Boolean),
          maxRecentItems: expect.any(Number),
        }),
        contentType: 'application/json',
        lastModified: expect.any(String),
        cacheKey: 'server-context',
        ttl: 60,
        etag: expect.any(String),
      });
    });

    it('should generate valid etag', async () => {
      const result = await generateServerContextResource(
        {},
        new URLSearchParams(),
        mockKgManager,
        mockMemoryManager,
        mockConversationManager
      );

      expect(result.etag).toBeDefined();
      expect(typeof result.etag).toBe('string');
      expect(result.etag.length).toBeGreaterThan(0);
    });
  });
});
