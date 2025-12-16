/**
 * Unit tests for adrs-discovered-resource.ts
 * Tests ADR discovery, filtering, and caching
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

// Mock adr-discovery
const mockDiscoverAdrsInDirectory = jest.fn();

jest.unstable_mockModule('../../src/utils/adr-discovery.js', () => ({
  discoverAdrsInDirectory: mockDiscoverAdrsInDirectory,
}));

describe('ADRs Discovered Resource', () => {
  let generateAdrsDiscoveredResource: any;

  beforeAll(async () => {
    const module = await import('../../src/resources/adrs-discovered-resource.js');
    generateAdrsDiscoveredResource = module.generateAdrsDiscoveredResource;
  });

  beforeEach(() => {
    jest.clearAllMocks();

    // Default: no cache hit
    mockCacheGet.mockResolvedValue(null);

    // Mock ADR discovery result
    mockDiscoverAdrsInDirectory.mockResolvedValue({
      directory: '/project/docs/adrs',
      totalAdrs: 3,
      adrs: [
        {
          filename: '001-use-postgresql.md',
          title: 'Use PostgreSQL for primary database',
          status: 'accepted',
          date: '2025-01-15',
          path: '/project/docs/adrs/001-use-postgresql.md',
          metadata: {
            number: '001',
            category: 'database',
            tags: ['postgresql', 'database'],
          },
        },
        {
          filename: '002-api-design.md',
          title: 'RESTful API Design',
          status: 'accepted',
          date: '2025-01-20',
          path: '/project/docs/adrs/002-api-design.md',
          metadata: {
            number: '002',
            category: 'api',
            tags: ['rest', 'api'],
          },
        },
        {
          filename: '003-caching-strategy.md',
          title: 'Redis Caching Strategy',
          status: 'proposed',
          date: '2025-02-01',
          path: '/project/docs/adrs/003-caching-strategy.md',
          metadata: {
            number: '003',
            category: 'infrastructure',
            tags: ['redis', 'caching'],
          },
        },
      ],
      summary: {
        byStatus: {
          accepted: 2,
          proposed: 1,
        },
        byCategory: {
          database: 1,
          api: 1,
          infrastructure: 1,
        },
      },
      recommendations: ['Consider reviewing proposed ADRs', '1 ADR needs decision'],
    });
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('Basic Resource Generation', () => {
    it('should generate ADR discovery results with default parameters', async () => {
      const result = await generateAdrsDiscoveredResource({}, new URLSearchParams());

      expect(result).toBeDefined();
      expect(result.data).toBeDefined();
      expect(result.data.directory).toBe('/project/docs/adrs');
      expect(result.data.totalAdrs).toBe(3);
      expect(result.data.adrs).toHaveLength(3);
      expect(result.contentType).toBe('application/json');
    });

    it('should include timestamp in response', async () => {
      const result = await generateAdrsDiscoveredResource({}, new URLSearchParams());

      expect(result.data.timestamp).toBeDefined();
      expect(new Date(result.data.timestamp).getTime()).toBeGreaterThan(0);
    });

    it('should call discoverAdrsInDirectory with default options', async () => {
      await generateAdrsDiscoveredResource({}, new URLSearchParams());

      expect(mockDiscoverAdrsInDirectory).toHaveBeenCalledWith(
        expect.stringContaining('docs/adrs'),
        expect.any(String),
        {
          includeContent: false,
          includeTimeline: false,
        }
      );
    });
  });

  describe('Query Parameter Handling', () => {
    it('should use custom projectPath when provided', async () => {
      const customPath = '/custom/project';
      await generateAdrsDiscoveredResource({}, new URLSearchParams(`projectPath=${customPath}`));

      expect(mockDiscoverAdrsInDirectory).toHaveBeenCalledWith(
        expect.stringContaining(customPath),
        customPath,
        expect.any(Object)
      );
    });

    it('should use custom adrDirectory when provided', async () => {
      await generateAdrsDiscoveredResource({}, new URLSearchParams('adrDirectory=decisions'));

      expect(mockDiscoverAdrsInDirectory).toHaveBeenCalledWith(
        expect.stringContaining('decisions'),
        expect.any(String),
        expect.any(Object)
      );
    });

    it('should include content when requested', async () => {
      await generateAdrsDiscoveredResource({}, new URLSearchParams('includeContent=true'));

      expect(mockDiscoverAdrsInDirectory).toHaveBeenCalledWith(expect.any(String), expect.any(String), {
        includeContent: true,
        includeTimeline: false,
      });
    });

    it('should include timeline when requested', async () => {
      await generateAdrsDiscoveredResource({}, new URLSearchParams('includeTimeline=true'));

      expect(mockDiscoverAdrsInDirectory).toHaveBeenCalledWith(expect.any(String), expect.any(String), {
        includeContent: false,
        includeTimeline: true,
      });
    });
  });

  describe('ADR Data Structure', () => {
    it('should include basic ADR metadata', async () => {
      const result = await generateAdrsDiscoveredResource({}, new URLSearchParams());

      const adr = result.data.adrs[0];
      expect(adr.filename).toBe('001-use-postgresql.md');
      expect(adr.title).toBe('Use PostgreSQL for primary database');
      expect(adr.status).toBe('accepted');
      expect(adr.date).toBe('2025-01-15');
      expect(adr.path).toBe('/project/docs/adrs/001-use-postgresql.md');
    });

    it('should include metadata fields', async () => {
      const result = await generateAdrsDiscoveredResource({}, new URLSearchParams());

      const adr = result.data.adrs[0];
      expect(adr.number).toBe('001');
      expect(adr.category).toBe('database');
      expect(adr.tags).toEqual(['postgresql', 'database']);
    });

    it('should exclude full content by default', async () => {
      const result = await generateAdrsDiscoveredResource({}, new URLSearchParams());

      const adr = result.data.adrs[0];
      expect(adr).not.toHaveProperty('content');
    });

    it('should include all discovered ADRs', async () => {
      const result = await generateAdrsDiscoveredResource({}, new URLSearchParams());

      expect(result.data.adrs).toHaveLength(3);
      expect(result.data.adrs[0].filename).toBe('001-use-postgresql.md');
      expect(result.data.adrs[1].filename).toBe('002-api-design.md');
      expect(result.data.adrs[2].filename).toBe('003-caching-strategy.md');
    });
  });

  describe('Summary Statistics', () => {
    it('should include summary with status breakdown', async () => {
      const result = await generateAdrsDiscoveredResource({}, new URLSearchParams());

      expect(result.data.summary.byStatus).toEqual({
        accepted: 2,
        proposed: 1,
      });
    });

    it('should include summary with category breakdown', async () => {
      const result = await generateAdrsDiscoveredResource({}, new URLSearchParams());

      expect(result.data.summary.byCategory).toEqual({
        database: 1,
        api: 1,
        infrastructure: 1,
      });
    });

    it('should include recommendations', async () => {
      const result = await generateAdrsDiscoveredResource({}, new URLSearchParams());

      expect(result.data.recommendations).toHaveLength(2);
      expect(result.data.recommendations[0]).toBe('Consider reviewing proposed ADRs');
    });
  });

  describe('Empty Results', () => {
    it('should handle no ADRs found', async () => {
      mockDiscoverAdrsInDirectory.mockResolvedValue({
        directory: '/project/docs/adrs',
        totalAdrs: 0,
        adrs: [],
        summary: {
          byStatus: {},
          byCategory: {},
        },
        recommendations: ['No ADRs found. Consider creating your first ADR.'],
      });

      const result = await generateAdrsDiscoveredResource({}, new URLSearchParams());

      expect(result.data.totalAdrs).toBe(0);
      expect(result.data.adrs).toHaveLength(0);
    });
  });

  describe('Caching', () => {
    it('should return cached result when available', async () => {
      const cachedResult = {
        data: {
          directory: '/cached/adrs',
          totalAdrs: 5,
          adrs: [],
          summary: { byStatus: {}, byCategory: {} },
          recommendations: [],
          timestamp: new Date().toISOString(),
        },
        contentType: 'application/json',
        cacheKey: 'adrs-discovered',
      };

      mockCacheGet.mockResolvedValue(cachedResult);

      const result = await generateAdrsDiscoveredResource({}, new URLSearchParams());

      expect(result).toBe(cachedResult);
      expect(mockDiscoverAdrsInDirectory).not.toHaveBeenCalled();
    });

    it('should cache result after generation', async () => {
      await generateAdrsDiscoveredResource({}, new URLSearchParams());

      expect(mockCacheSet).toHaveBeenCalledWith(
        'adrs-discovered',
        expect.objectContaining({
          data: expect.any(Object),
          contentType: 'application/json',
          cacheKey: 'adrs-discovered',
          ttl: 120,
        }),
        120
      );
    });

    it('should use project-specific cache key for custom paths', async () => {
      await generateAdrsDiscoveredResource({}, new URLSearchParams('projectPath=/custom'));

      expect(mockCacheSet).toHaveBeenCalledWith(
        'adrs-discovered:/custom',
        expect.anything(),
        120
      );
    });

    it('should use 2-minute TTL for occasionally changing data', async () => {
      const result = await generateAdrsDiscoveredResource({}, new URLSearchParams());

      expect(result.ttl).toBe(120);
    });
  });

  describe('Error Handling', () => {
    it('should throw RESOURCE_NOT_FOUND when directory not found', async () => {
      mockDiscoverAdrsInDirectory.mockRejectedValue(new Error('Directory not found'));

      await expect(generateAdrsDiscoveredResource({}, new URLSearchParams())).rejects.toThrow(
        'ADR directory not found'
      );
    });

    it('should throw RESOURCE_GENERATION_ERROR on discovery failure', async () => {
      mockDiscoverAdrsInDirectory.mockRejectedValue(new Error('Parse error'));

      await expect(generateAdrsDiscoveredResource({}, new URLSearchParams())).rejects.toThrow(
        'Failed to discover ADRs'
      );
    });
  });

  describe('Response Structure', () => {
    it('should return properly structured ResourceGenerationResult', async () => {
      const result = await generateAdrsDiscoveredResource({}, new URLSearchParams());

      expect(result).toMatchObject({
        data: expect.objectContaining({
          directory: expect.any(String),
          totalAdrs: expect.any(Number),
          adrs: expect.any(Array),
          summary: expect.any(Object),
          recommendations: expect.any(Array),
          timestamp: expect.any(String),
        }),
        contentType: 'application/json',
        lastModified: expect.any(String),
        cacheKey: expect.any(String),
        ttl: 120,
        etag: expect.any(String),
      });
    });

    it('should generate valid etag', async () => {
      const result = await generateAdrsDiscoveredResource({}, new URLSearchParams());

      expect(result.etag).toBeDefined();
      expect(typeof result.etag).toBe('string');
      expect(result.etag.length).toBeGreaterThan(0);
    });
  });
});
