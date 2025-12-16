/**
 * Unit tests for memory-stats-resource.ts
 * Tests memory statistics generation, caching, and error handling
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

describe('Memory Stats Resource', () => {
  let generateMemoryStatsResource: any;
  let mockMemoryManager: any;

  beforeAll(async () => {
    const module = await import('../../src/resources/memory-stats-resource.js');
    generateMemoryStatsResource = module.generateMemoryStatsResource;
  });

  beforeEach(() => {
    jest.clearAllMocks();

    // Default: no cache hit
    mockCacheGet.mockResolvedValue(null);

    // Mock memory manager with typical stats
    mockMemoryManager = {
      getStats: jest.fn().mockResolvedValue({
        totalSessions: 15,
        activeSessions: 3,
        archivedSessions: 12,
        totalTurns: 147,
        totalExpandableContent: 28,
        avgTurnsPerSession: 9.8,
        totalStorageBytes: 524288, // 512 KB
      }),
    };
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('Basic Resource Generation', () => {
    it('should generate memory stats', async () => {
      const result = await generateMemoryStatsResource({}, new URLSearchParams(), mockMemoryManager);

      expect(result).toBeDefined();
      expect(result.data).toBeDefined();
      expect(result.data.totalSessions).toBe(15);
      expect(result.data.activeSessions).toBe(3);
      expect(result.data.archivedSessions).toBe(12);
      expect(result.data.totalTurns).toBe(147);
      expect(result.data.totalExpandableContent).toBe(28);
      expect(result.data.avgTurnsPerSession).toBe(9.8);
      expect(result.contentType).toBe('application/json');
    });

    it('should include timestamp in response', async () => {
      const result = await generateMemoryStatsResource({}, new URLSearchParams(), mockMemoryManager);

      expect(result.data.timestamp).toBeDefined();
      expect(new Date(result.data.timestamp).getTime()).toBeGreaterThan(0);
    });

    it('should convert storage bytes to KB', async () => {
      const result = await generateMemoryStatsResource({}, new URLSearchParams(), mockMemoryManager);

      expect(result.data.storageSizeKB).toBe(512);
      expect(result.data.totalStorageBytes).toBe(524288);
    });

    it('should call memory manager getStats method', async () => {
      await generateMemoryStatsResource({}, new URLSearchParams(), mockMemoryManager);

      expect(mockMemoryManager.getStats).toHaveBeenCalledTimes(1);
    });
  });

  describe('Storage Size Conversion', () => {
    it('should handle small storage sizes', async () => {
      mockMemoryManager.getStats.mockResolvedValue({
        totalSessions: 1,
        activeSessions: 1,
        archivedSessions: 0,
        totalTurns: 5,
        totalExpandableContent: 0,
        avgTurnsPerSession: 5,
        totalStorageBytes: 1024, // 1 KB
      });

      const result = await generateMemoryStatsResource({}, new URLSearchParams(), mockMemoryManager);

      expect(result.data.storageSizeKB).toBe(1);
    });

    it('should handle large storage sizes', async () => {
      mockMemoryManager.getStats.mockResolvedValue({
        totalSessions: 100,
        activeSessions: 10,
        archivedSessions: 90,
        totalTurns: 1500,
        totalExpandableContent: 300,
        avgTurnsPerSession: 15,
        totalStorageBytes: 10485760, // 10 MB = 10240 KB
      });

      const result = await generateMemoryStatsResource({}, new URLSearchParams(), mockMemoryManager);

      expect(result.data.storageSizeKB).toBe(10240);
    });

    it('should round KB to 2 decimal places', async () => {
      mockMemoryManager.getStats.mockResolvedValue({
        totalSessions: 1,
        activeSessions: 1,
        archivedSessions: 0,
        totalTurns: 1,
        totalExpandableContent: 0,
        avgTurnsPerSession: 1,
        totalStorageBytes: 1536, // 1.5 KB
      });

      const result = await generateMemoryStatsResource({}, new URLSearchParams(), mockMemoryManager);

      expect(result.data.storageSizeKB).toBe(1.5);
    });
  });

  describe('Caching', () => {
    it('should return cached result when available', async () => {
      const cachedResult = {
        data: {
          totalSessions: 10,
          activeSessions: 2,
          archivedSessions: 8,
          totalTurns: 100,
          totalExpandableContent: 20,
          avgTurnsPerSession: 10,
          totalStorageBytes: 262144,
          storageSizeKB: 256,
          timestamp: new Date().toISOString(),
        },
        contentType: 'application/json',
        cacheKey: 'memory-stats',
      };

      mockCacheGet.mockResolvedValue(cachedResult);

      const result = await generateMemoryStatsResource({}, new URLSearchParams(), mockMemoryManager);

      expect(result).toBe(cachedResult);
      expect(mockMemoryManager.getStats).not.toHaveBeenCalled();
    });

    it('should cache result after generation', async () => {
      await generateMemoryStatsResource({}, new URLSearchParams(), mockMemoryManager);

      expect(mockCacheSet).toHaveBeenCalledWith(
        'memory-stats',
        expect.objectContaining({
          data: expect.any(Object),
          contentType: 'application/json',
          cacheKey: 'memory-stats',
          ttl: 30,
        }),
        30
      );
    });

    it('should use 30-second TTL for moderately changing data', async () => {
      const result = await generateMemoryStatsResource({}, new URLSearchParams(), mockMemoryManager);

      expect(result.ttl).toBe(30);
    });
  });

  describe('Error Handling', () => {
    it('should throw error when memory manager is not provided', async () => {
      await expect(generateMemoryStatsResource({}, new URLSearchParams())).rejects.toThrow(
        'Memory stats require initialized memory manager'
      );
    });

    it('should throw error when getStats fails', async () => {
      mockMemoryManager.getStats.mockRejectedValue(new Error('Stats retrieval failed'));

      await expect(
        generateMemoryStatsResource({}, new URLSearchParams(), mockMemoryManager)
      ).rejects.toThrow('Failed to generate memory stats');
    });

    it('should handle manager with null stats', async () => {
      mockMemoryManager.getStats.mockResolvedValue(null);

      await expect(
        generateMemoryStatsResource({}, new URLSearchParams(), mockMemoryManager)
      ).rejects.toThrow();
    });
  });

  describe('Response Structure', () => {
    it('should return properly structured ResourceGenerationResult', async () => {
      const result = await generateMemoryStatsResource({}, new URLSearchParams(), mockMemoryManager);

      expect(result).toMatchObject({
        data: expect.objectContaining({
          totalSessions: expect.any(Number),
          activeSessions: expect.any(Number),
          archivedSessions: expect.any(Number),
          totalTurns: expect.any(Number),
          totalExpandableContent: expect.any(Number),
          avgTurnsPerSession: expect.any(Number),
          totalStorageBytes: expect.any(Number),
          storageSizeKB: expect.any(Number),
          timestamp: expect.any(String),
        }),
        contentType: 'application/json',
        lastModified: expect.any(String),
        cacheKey: 'memory-stats',
        ttl: 30,
        etag: expect.any(String),
      });
    });

    it('should generate valid etag', async () => {
      const result = await generateMemoryStatsResource({}, new URLSearchParams(), mockMemoryManager);

      expect(result.etag).toBeDefined();
      expect(typeof result.etag).toBe('string');
      expect(result.etag.length).toBeGreaterThan(0);
    });

    it('should include all original stats fields', async () => {
      const result = await generateMemoryStatsResource({}, new URLSearchParams(), mockMemoryManager);

      expect(result.data).toHaveProperty('totalSessions');
      expect(result.data).toHaveProperty('activeSessions');
      expect(result.data).toHaveProperty('archivedSessions');
      expect(result.data).toHaveProperty('totalTurns');
      expect(result.data).toHaveProperty('totalExpandableContent');
      expect(result.data).toHaveProperty('avgTurnsPerSession');
      expect(result.data).toHaveProperty('totalStorageBytes');
    });
  });

  describe('Edge Cases', () => {
    it('should handle zero sessions', async () => {
      mockMemoryManager.getStats.mockResolvedValue({
        totalSessions: 0,
        activeSessions: 0,
        archivedSessions: 0,
        totalTurns: 0,
        totalExpandableContent: 0,
        avgTurnsPerSession: 0,
        totalStorageBytes: 0,
      });

      const result = await generateMemoryStatsResource({}, new URLSearchParams(), mockMemoryManager);

      expect(result.data.totalSessions).toBe(0);
      expect(result.data.storageSizeKB).toBe(0);
    });

    it('should handle very large numbers', async () => {
      mockMemoryManager.getStats.mockResolvedValue({
        totalSessions: 1000000,
        activeSessions: 100,
        archivedSessions: 999900,
        totalTurns: 50000000,
        totalExpandableContent: 10000000,
        avgTurnsPerSession: 50,
        totalStorageBytes: 1073741824, // 1 GB
      });

      const result = await generateMemoryStatsResource({}, new URLSearchParams(), mockMemoryManager);

      expect(result.data.totalSessions).toBe(1000000);
      expect(result.data.storageSizeKB).toBe(1048576); // 1 GB in KB
    });
  });
});
