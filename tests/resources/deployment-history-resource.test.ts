/**
 * Unit tests for deployment-history-resource.ts
 * Tests deployment history resource generation, query parameter handling, and caching
 */

import { URLSearchParams } from 'url';
import { describe, it, expect, beforeAll, _beforeEach, _afterEach, _jest } from 'vitest';

// Mock ResourceCache with module-level mock functions
vi.mock('../../src/resources/resource-cache.js', () => {
  const mockCacheGet = vi.fn().mockResolvedValue(null);
  const mockCacheSet = vi.fn().mockResolvedValue(undefined);
  return {
    ResourceCache: class MockResourceCache {
      get = mockCacheGet;
      set = mockCacheSet;
    },
    // Expose for test access
    __mockCacheGet: mockCacheGet,
    __mockCacheSet: mockCacheSet,
  };
});

// Get mock references after module import
let mockCacheGet: ReturnType<typeof vi.fn>;
let mockCacheSet: ReturnType<typeof vi.fn>;

// Mock deployment-readiness-tool
const mockDeploymentReadiness = vi.fn();

vi.mock('../../src/tools/deployment-readiness-tool.js', () => ({
  deploymentReadiness: mockDeploymentReadiness,
}));

// Mock file system for fallback
const mockReadFile = vi.fn();

vi.mock('fs', () => ({
  promises: {
    readFile: mockReadFile,
    readdir: vi.fn().mockResolvedValue([]),
  },
}));

describe('Deployment History Resource', () => {
  let generateDeploymentHistoryResource: any;

  beforeAll(async () => {
    // Get mock references from the mocked module
    const cacheModule = await import('../../src/resources/resource-cache.js');
    mockCacheGet = (cacheModule as any).__mockCacheGet;
    mockCacheSet = (cacheModule as any).__mockCacheSet;

    const module = await import('../../src/resources/deployment-history-resource.js');
    generateDeploymentHistoryResource = module.generateDeploymentHistoryResource;
  });

  beforeEach(() => {
    vi.clearAllMocks();

    // Default: no cache hit
    mockCacheGet.mockResolvedValue(null);

    // Default: successful tool execution
    mockDeploymentReadiness.mockResolvedValue({
      content: [
        {
          text: `
Deployment History Analysis
===========================

Period: Last 30 days
Environment: all

Summary
-------
Total: 10 deployments
Successful: 9
Failed: 1
Success rate: 90.0%

Metrics
-------
MTBF: 7.2 days
MTTR: 15 minutes
          `,
        },
      ],
    });

    // Default: package.json for fallback
    mockReadFile.mockResolvedValue(JSON.stringify({ version: '1.0.0' }));
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Basic Resource Generation', () => {
    it('should generate deployment history with default parameters', async () => {
      const result = await generateDeploymentHistoryResource();

      expect(result).toBeDefined();
      expect(result.data).toBeDefined();
      expect(result.data.period).toBe('30d');
      expect(result.data.environment).toBe('all');
      expect(result.data.summary).toBeDefined();
      expect(result.contentType).toBe('application/json');
    });

    it('should include required metadata', async () => {
      const result = await generateDeploymentHistoryResource();

      expect(result.data.metadata).toBeDefined();
      expect(result.data.metadata.period).toBe('30d');
      expect(result.data.metadata.environment).toBe('all');
      expect(result.data.metadata.dataSource).toBe('comprehensive-tool');
      expect(result.data.metadata.confidence).toBe(0.9);
      expect(result.data.metadata.timestamp).toBeDefined();
    });

    it('should include cache metadata', async () => {
      const result = await generateDeploymentHistoryResource();

      expect(result.cacheKey).toBeDefined();
      expect(result.cacheKey).toContain('deployment-history');
      expect(result.ttl).toBe(300); // 5 minutes
      expect(result.etag).toBeDefined();
      expect(result.lastModified).toBeDefined();
    });
  });

  describe('Query Parameter Support', () => {
    it('should handle period parameter', async () => {
      const searchParams = new URLSearchParams({ period: '90d' });
      const result = await generateDeploymentHistoryResource(undefined, searchParams);

      expect(result.data.period).toBe('90d');
      expect(mockDeploymentReadiness).toHaveBeenCalled();
    });

    it('should handle environment parameter', async () => {
      const searchParams = new URLSearchParams({ environment: 'production' });
      const result = await generateDeploymentHistoryResource(undefined, searchParams);

      expect(result.data.environment).toBe('production');

      const toolCall = mockDeploymentReadiness.mock.calls[0][0];
      expect(toolCall.targetEnvironment).toBe('production');
    });

    it('should handle multiple query parameters', async () => {
      const searchParams = new URLSearchParams({
        period: '7d',
        environment: 'staging',
        includeFailures: 'true',
        includeMetrics: 'true',
        format: 'summary',
      });

      const result = await generateDeploymentHistoryResource(undefined, searchParams);

      expect(result.data.period).toBe('7d');
      expect(result.data.environment).toBe('staging');
      expect(result.cacheKey).toContain('7d');
      expect(result.cacheKey).toContain('staging');
    });

    it('should use default values when parameters are missing', async () => {
      const searchParams = new URLSearchParams({});
      const result = await generateDeploymentHistoryResource(undefined, searchParams);

      expect(result.data.period).toBe('30d');
      expect(result.data.environment).toBe('all');
    });
  });

  describe('Data Extraction from Tool Output', () => {
    it('should extract deployment counts', async () => {
      mockDeploymentReadiness.mockResolvedValue({
        content: [
          {
            text: 'Total: 15 deployments\nSuccessful: 12\nFailed: 3\nSuccess rate: 80.0%',
          },
        ],
      });

      const result = await generateDeploymentHistoryResource();

      expect(result.data.summary.totalDeployments).toBe(15);
      expect(result.data.summary.successfulDeployments).toBe(12);
      expect(result.data.summary.failedDeployments).toBe(3);
      expect(result.data.summary.successRate).toBe(80.0);
    });

    it('should extract failure metrics', async () => {
      mockDeploymentReadiness.mockResolvedValue({
        content: [
          {
            text: 'MTBF: 10 days\nMTTR: 30 minutes',
          },
        ],
      });

      const result = await generateDeploymentHistoryResource();

      expect(result.data.failureAnalysis).toBeDefined();
      expect(result.data.failureAnalysis?.mtbf).toBe('10 days');
      expect(result.data.failureAnalysis?.mttr).toBe('30 minutes');
    });

    it('should calculate success rate if not provided', async () => {
      mockDeploymentReadiness.mockResolvedValue({
        content: [
          {
            text: 'Total: 10\nSuccessful: 8\nFailed: 2',
          },
        ],
      });

      const result = await generateDeploymentHistoryResource();

      expect(result.data.summary.successRate).toBe(80); // (8/10) * 100
    });
  });

  describe('Caching Behavior', () => {
    it('should return cached result when available', async () => {
      const cachedResult = {
        data: {
          period: '30d',
          environment: 'all',
          timestamp: new Date().toISOString(),
          summary: {
            totalDeployments: 5,
            successfulDeployments: 5,
            failedDeployments: 0,
            successRate: 100,
            averageDeploymentTime: '5m',
            deploymentsPerWeek: 1,
          },
          metadata: {
            period: '30d',
            environment: 'all',
            dataSource: 'comprehensive-tool' as const,
            confidence: 0.9,
            timestamp: new Date().toISOString(),
          },
        },
        contentType: 'application/json',
        lastModified: new Date().toISOString(),
        cacheKey: 'deployment-history:30d:all:true:true:detailed',
        ttl: 300,
        etag: '"cached-123"',
      };

      mockCacheGet.mockResolvedValue(cachedResult);

      const result = await generateDeploymentHistoryResource();

      expect(result).toBe(cachedResult);
      expect(mockDeploymentReadiness).not.toHaveBeenCalled();
      expect(mockCacheSet).not.toHaveBeenCalled();
    });

    it('should cache new results', async () => {
      mockCacheGet.mockResolvedValue(null);

      const result = await generateDeploymentHistoryResource();

      expect(mockCacheSet).toHaveBeenCalledWith(
        expect.stringContaining('deployment-history'),
        result,
        300
      );
    });

    it('should use granular cache keys based on query parameters', async () => {
      const searchParams = new URLSearchParams({
        period: '7d',
        environment: 'production',
        includeFailures: 'false',
        includeMetrics: 'false',
        format: 'summary',
      });

      await generateDeploymentHistoryResource(undefined, searchParams);

      expect(mockCacheSet).toHaveBeenCalledWith(
        'deployment-history:7d:production:false:false:summary',
        expect.any(Object),
        300
      );
    });
  });

  describe('Graceful Fallback', () => {
    it('should fall back to basic analysis when tool fails', async () => {
      mockDeploymentReadiness.mockRejectedValue(new Error('Tool unavailable'));

      const result = await generateDeploymentHistoryResource();

      expect(result).toBeDefined();
      expect(result.data.metadata.dataSource).toBe('basic-analysis');
      expect(result.data.metadata.confidence).toBe(0.5);
      expect(result.data.summary.totalDeployments).toBe(1);
    });

    it('should include version from package.json in fallback', async () => {
      mockDeploymentReadiness.mockRejectedValue(new Error('Tool unavailable'));
      mockReadFile.mockResolvedValue(JSON.stringify({ version: '2.3.4' }));

      const result = await generateDeploymentHistoryResource();

      expect(result.data.recentDeployments).toBeDefined();
      expect(result.data.recentDeployments?.[0]?.version).toBe('2.3.4');
    });

    it('should handle package.json read errors in fallback', async () => {
      mockDeploymentReadiness.mockRejectedValue(new Error('Tool unavailable'));
      mockReadFile.mockRejectedValue(new Error('File not found'));

      const result = await generateDeploymentHistoryResource();

      expect(result.data.recentDeployments?.[0]?.version).toBe('0.0.0');
    });
  });

  describe('Bridge Integration', () => {
    it('should call deployment-readiness-tool with correct operation', async () => {
      await generateDeploymentHistoryResource();

      expect(mockDeploymentReadiness).toHaveBeenCalledWith(
        expect.objectContaining({
          operation: 'deployment_history',
          projectPath: process.cwd(),
          strictMode: false,
          enableMemoryIntegration: true,
        })
      );
    });

    it('should pass environment to tool', async () => {
      const searchParams = new URLSearchParams({ environment: 'staging' });

      await generateDeploymentHistoryResource(undefined, searchParams);

      expect(mockDeploymentReadiness).toHaveBeenCalledWith(
        expect.objectContaining({
          targetEnvironment: 'staging',
        })
      );
    });
  });

  describe('Response Structure Validation', () => {
    it('should have required summary fields', async () => {
      const result = await generateDeploymentHistoryResource();

      expect(result.data.summary).toHaveProperty('totalDeployments');
      expect(result.data.summary).toHaveProperty('successfulDeployments');
      expect(result.data.summary).toHaveProperty('failedDeployments');
      expect(result.data.summary).toHaveProperty('successRate');
      expect(result.data.summary).toHaveProperty('averageDeploymentTime');
      expect(result.data.summary).toHaveProperty('deploymentsPerWeek');
    });

    it('should have ISO timestamp format', async () => {
      const result = await generateDeploymentHistoryResource();

      const timestamp = result.data.timestamp;
      expect(timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T/); // ISO 8601 format
      expect(new Date(timestamp)).toBeInstanceOf(Date);
      expect(new Date(timestamp).toString()).not.toBe('Invalid Date');
    });

    it('should have valid metadata structure', async () => {
      const result = await generateDeploymentHistoryResource();

      expect(result.data.metadata).toMatchObject({
        period: expect.any(String),
        environment: expect.any(String),
        dataSource: expect.stringMatching(/^(comprehensive-tool|basic-analysis)$/),
        confidence: expect.any(Number),
        timestamp: expect.any(String),
      });
    });
  });

  describe('Edge Cases', () => {
    it('should handle zero deployments', async () => {
      mockDeploymentReadiness.mockResolvedValue({
        content: [{ text: 'Total: 0\nSuccessful: 0\nFailed: 0' }],
      });

      const result = await generateDeploymentHistoryResource();

      expect(result.data.summary.totalDeployments).toBe(0);
      expect(result.data.summary.successRate).toBe(0);
    });

    it('should handle missing tool output', async () => {
      mockDeploymentReadiness.mockResolvedValue({ content: [] });

      const result = await generateDeploymentHistoryResource();

      // Empty output still uses comprehensive tool, just with zero data
      expect(result.data.metadata.dataSource).toBe('comprehensive-tool');
      expect(result.data.summary.totalDeployments).toBe(0);
    });

    it('should handle malformed tool output', async () => {
      mockDeploymentReadiness.mockResolvedValue({
        content: [{ text: 'Invalid data format' }],
      });

      const result = await generateDeploymentHistoryResource();

      expect(result.data.summary.totalDeployments).toBe(0);
    });
  });
});
