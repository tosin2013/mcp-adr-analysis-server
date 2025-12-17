/**
 * Unit tests for code-quality-resource.ts
 * Tests code quality assessment, query parameter handling, and caching
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
const mockReaddir = vi.fn();

vi.mock('fs', () => ({
  promises: {
    readFile: mockReadFile,
    readdir: mockReaddir,
  },
}));

describe('Code Quality Resource', () => {
  let generateCodeQualityResource: any;

  beforeAll(async () => {
    // Get mock references from the mocked module
    const cacheModule = await import('../../src/resources/resource-cache.js');
    mockCacheGet = (cacheModule as any).__mockCacheGet;
    mockCacheSet = (cacheModule as any).__mockCacheSet;

    const module = await import('../../src/resources/code-quality-resource.js');
    generateCodeQualityResource = module.generateCodeQualityResource;
  });

  beforeEach(() => {
    vi.clearAllMocks();

    // Default: no cache hit
    mockCacheGet.mockResolvedValue(null);

    // Default: successful tool execution with quality data
    mockDeploymentReadiness.mockResolvedValue({
      content: [
        {
          text: `
Code Quality Analysis
=====================

Production Code Score: 85.5%

Codebase Statistics:
Total Files: 150
Production Files: 120
Test Files: 25
Mock Files: 5

Mock: 5 indicators found
          `,
        },
      ],
    });

    // Default: file system mocks for fallback
    mockReaddir.mockResolvedValue([
      'index.ts',
      'tools/deployment-readiness-tool.ts',
      'resources/code-quality-resource.ts',
    ]);

    mockReadFile.mockResolvedValue('// Sample TypeScript file\nconst x = 1;');
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Basic Resource Generation', () => {
    it('should generate code quality assessment with default parameters', async () => {
      const result = await generateCodeQualityResource();

      expect(result).toBeDefined();
      expect(result.data).toBeDefined();
      expect(result.data.scope).toBe('full');
      expect(result.data.overallScore).toBeDefined();
      expect(result.data.grade).toBeDefined();
      expect(result.data.metrics).toBeDefined();
      expect(result.contentType).toBe('application/json');
    });

    it('should include required metadata', async () => {
      const result = await generateCodeQualityResource();

      expect(result.data.metadata).toBeDefined();
      expect(result.data.metadata.scope).toBe('full');
      expect(result.data.metadata.analysisType).toBe('comprehensive');
      expect(result.data.metadata.dataSource).toBe('comprehensive-tool');
      expect(result.data.metadata.confidence).toBe(0.9);
      expect(result.data.metadata.timestamp).toBeDefined();
    });

    it('should include cache metadata', async () => {
      const result = await generateCodeQualityResource();

      expect(result.cacheKey).toBeDefined();
      expect(result.cacheKey).toContain('code-quality');
      expect(result.ttl).toBe(300); // 5 minutes
      expect(result.etag).toBeDefined();
      expect(result.lastModified).toBeDefined();
    });
  });

  describe('Query Parameter Support', () => {
    it('should handle scope parameter', async () => {
      const searchParams = new URLSearchParams({ scope: 'changes' });
      const result = await generateCodeQualityResource(undefined, searchParams);

      expect(result.data.scope).toBe('changes');
    });

    it('should handle includeMetrics parameter', async () => {
      const searchParams = new URLSearchParams({ includeMetrics: 'true' });
      const result = await generateCodeQualityResource(undefined, searchParams);

      expect(result.data.qualityGates).toBeDefined();
    });

    it('should exclude metrics when includeMetrics is false', async () => {
      const searchParams = new URLSearchParams({ includeMetrics: 'false' });
      const result = await generateCodeQualityResource(undefined, searchParams);

      expect(result.data.qualityGates).toBeUndefined();
    });

    it('should handle includeRecommendations parameter', async () => {
      mockDeploymentReadiness.mockResolvedValue({
        content: [{ text: 'Mock: 10 indicators\nFailed: 2 tests' }],
      });

      const searchParams = new URLSearchParams({ includeRecommendations: 'true' });
      const result = await generateCodeQualityResource(undefined, searchParams);

      expect(result.data.recommendations).toBeDefined();
      expect(result.data.recommendations?.length).toBeGreaterThan(0);
    });

    it('should handle threshold parameter', async () => {
      const searchParams = new URLSearchParams({ threshold: '80' });
      const result = await generateCodeQualityResource(undefined, searchParams);

      expect(result.data.metrics.productionCodeThreshold).toBe(70); // Default threshold used in implementation
      expect(result.cacheKey).toContain('80');
    });

    it('should handle multiple query parameters', async () => {
      const searchParams = new URLSearchParams({
        scope: 'critical',
        includeMetrics: 'true',
        includeRecommendations: 'true',
        threshold: '90',
        format: 'summary',
      });

      const result = await generateCodeQualityResource(undefined, searchParams);

      expect(result.data.scope).toBe('critical');
      expect(result.cacheKey).toContain('critical');
      expect(result.cacheKey).toContain('90');
    });

    it('should use default values when parameters are missing', async () => {
      const searchParams = new URLSearchParams({});
      const result = await generateCodeQualityResource(undefined, searchParams);

      expect(result.data.scope).toBe('full');
      expect(result.data.metrics.productionCodeThreshold).toBe(70);
    });
  });

  describe('Data Extraction from Tool Output', () => {
    it('should extract production code score', async () => {
      mockDeploymentReadiness.mockResolvedValue({
        content: [{ text: 'Production code score: 92.3%' }],
      });

      const result = await generateCodeQualityResource();

      expect(result.data.metrics.productionCodeScore).toBe(92.3);
      expect(result.data.overallScore).toBe(92.3);
    });

    it('should extract mock indicators', async () => {
      mockDeploymentReadiness.mockResolvedValue({
        content: [{ text: 'Mock: 15 indicators found' }],
      });

      const result = await generateCodeQualityResource();

      expect(result.data.metrics.mockCodeIndicators).toBe(15);
    });

    it('should extract file counts', async () => {
      mockDeploymentReadiness.mockResolvedValue({
        content: [
          {
            text: `
Total files: 200
Production files: 150
Test files: 40
Mock files: 10
            `,
          },
        ],
      });

      const result = await generateCodeQualityResource();

      expect(result.data.metrics.codebaseSize.totalFiles).toBe(200);
      expect(result.data.metrics.codebaseSize.productionFiles).toBe(150);
      expect(result.data.metrics.codebaseSize.testFiles).toBe(40);
      expect(result.data.metrics.codebaseSize.mockFiles).toBe(10);
    });

    it('should extract quality gates when includeMetrics is true', async () => {
      mockDeploymentReadiness.mockResolvedValue({
        content: [
          {
            text: 'Gate: Coverage: 85 / 80\nCheck: Complexity: 15 / 20',
          },
        ],
      });

      const searchParams = new URLSearchParams({ includeMetrics: 'true' });
      const result = await generateCodeQualityResource(undefined, searchParams);

      expect(result.data.qualityGates).toBeDefined();
      expect(result.data.qualityGates?.length).toBeGreaterThan(0);
    });
  });

  describe('Grade Calculation', () => {
    it('should assign grade A for score >= 90', async () => {
      mockDeploymentReadiness.mockResolvedValue({
        content: [{ text: 'Production code score: 95%' }],
      });

      const result = await generateCodeQualityResource();

      expect(result.data.grade).toBe('A');
    });

    it('should assign grade B for score >= 80', async () => {
      mockDeploymentReadiness.mockResolvedValue({
        content: [{ text: 'Production code score: 85%' }],
      });

      const result = await generateCodeQualityResource();

      expect(result.data.grade).toBe('B');
    });

    it('should assign grade C for score >= 70', async () => {
      mockDeploymentReadiness.mockResolvedValue({
        content: [{ text: 'Production code score: 75%' }],
      });

      const result = await generateCodeQualityResource();

      expect(result.data.grade).toBe('C');
    });

    it('should assign grade D for score >= 60', async () => {
      mockDeploymentReadiness.mockResolvedValue({
        content: [{ text: 'Production code score: 65%' }],
      });

      const result = await generateCodeQualityResource();

      expect(result.data.grade).toBe('D');
    });

    it('should assign grade F for score < 60', async () => {
      mockDeploymentReadiness.mockResolvedValue({
        content: [{ text: 'Production code score: 55%' }],
      });

      const result = await generateCodeQualityResource();

      expect(result.data.grade).toBe('F');
    });
  });

  describe('Recommendations Extraction', () => {
    it('should recommend reducing mock code when mocks detected', async () => {
      mockDeploymentReadiness.mockResolvedValue({
        content: [{ text: 'mock: 20 indicators\ntest coverage: 80%' }],
      });

      const searchParams = new URLSearchParams({ includeRecommendations: 'true' });
      const result = await generateCodeQualityResource(undefined, searchParams);

      expect(result.data.recommendations).toBeDefined();
      const mockRecommendation = result.data.recommendations?.find(r =>
        r.title.includes('Reduce Mock Code')
      );
      expect(mockRecommendation).toBeDefined();
      expect(mockRecommendation?.priority).toBe('high');
    });

    it('should recommend fixing test failures when errors detected', async () => {
      mockDeploymentReadiness.mockResolvedValue({
        content: [{ text: 'Failed: 5 tests\nError: Build failed' }],
      });

      const searchParams = new URLSearchParams({ includeRecommendations: 'true' });
      const result = await generateCodeQualityResource(undefined, searchParams);

      expect(result.data.recommendations).toBeDefined();
      const failureRecommendation = result.data.recommendations?.find(r =>
        r.title.includes('Fix Test Failures')
      );
      expect(failureRecommendation).toBeDefined();
      expect(failureRecommendation?.priority).toBe('critical');
    });
  });

  describe('Caching Behavior', () => {
    it('should return cached result when available', async () => {
      const cachedResult = {
        data: {
          scope: 'full',
          timestamp: new Date().toISOString(),
          overallScore: 85,
          grade: 'B' as const,
          metrics: {
            productionCodeScore: 85,
            mockCodeIndicators: 5,
            productionCodeThreshold: 70,
            codebaseSize: {
              totalFiles: 100,
              totalLines: 5000,
              productionFiles: 80,
              testFiles: 15,
              mockFiles: 5,
            },
          },
          metadata: {
            scope: 'full',
            analysisType: 'comprehensive' as const,
            confidence: 0.9,
            timestamp: new Date().toISOString(),
            dataSource: 'comprehensive-tool' as const,
          },
        },
        contentType: 'application/json',
        lastModified: new Date().toISOString(),
        cacheKey: 'code-quality:full:true:true:70:detailed',
        ttl: 300,
        etag: '"cached-456"',
      };

      mockCacheGet.mockResolvedValue(cachedResult);

      const result = await generateCodeQualityResource();

      expect(result).toBe(cachedResult);
      expect(mockDeploymentReadiness).not.toHaveBeenCalled();
      expect(mockCacheSet).not.toHaveBeenCalled();
    });

    it('should cache new results', async () => {
      mockCacheGet.mockResolvedValue(null);

      const result = await generateCodeQualityResource();

      expect(mockCacheSet).toHaveBeenCalledWith(
        expect.stringContaining('code-quality'),
        result,
        300
      );
    });

    it('should use granular cache keys based on query parameters', async () => {
      const searchParams = new URLSearchParams({
        scope: 'changes',
        includeMetrics: 'false',
        includeRecommendations: 'false',
        threshold: '80',
        format: 'summary',
      });

      await generateCodeQualityResource(undefined, searchParams);

      expect(mockCacheSet).toHaveBeenCalledWith(
        'code-quality:changes:false:false:80:summary',
        expect.any(Object),
        300
      );
    });
  });

  describe('Graceful Fallback', () => {
    it('should fall back to basic analysis when tool fails', async () => {
      mockDeploymentReadiness.mockRejectedValue(new Error('Tool unavailable'));

      const result = await generateCodeQualityResource();

      expect(result).toBeDefined();
      expect(result.data.metadata.dataSource).toBe('basic-analysis');
      expect(result.data.metadata.analysisType).toBe('basic');
      expect(result.data.metadata.confidence).toBe(0.5);
    });

    it('should count TypeScript files in fallback mode', async () => {
      mockDeploymentReadiness.mockRejectedValue(new Error('Tool unavailable'));

      mockReaddir.mockResolvedValue(['file1.ts', 'file2.ts', 'file3.ts']);
      mockReadFile.mockResolvedValue('const x = 1;\nconst y = 2;\nconst z = 3;');

      const result = await generateCodeQualityResource();

      expect(result.data.metrics.codebaseSize.totalFiles).toBe(3);
      expect(result.data.metrics.codebaseSize.totalLines).toBeGreaterThan(0);
    });

    it('should assign default score in fallback mode', async () => {
      mockDeploymentReadiness.mockRejectedValue(new Error('Tool unavailable'));
      mockReaddir.mockResolvedValue(['file1.ts']);

      const result = await generateCodeQualityResource();

      expect(result.data.overallScore).toBe(75);
      expect(result.data.grade).toBe('C');
    });

    it('should handle file system errors gracefully', async () => {
      mockDeploymentReadiness.mockRejectedValue(new Error('Tool unavailable'));
      mockReaddir.mockRejectedValue(new Error('Directory not found'));

      const result = await generateCodeQualityResource();

      expect(result.data.overallScore).toBe(0);
      expect(result.data.grade).toBe('F');
      expect(result.data.metrics.codebaseSize.totalFiles).toBe(0);
    });
  });

  describe('Bridge Integration', () => {
    it('should call deployment-readiness-tool with correct operation', async () => {
      await generateCodeQualityResource();

      expect(mockDeploymentReadiness).toHaveBeenCalledWith(
        expect.objectContaining({
          operation: 'check_readiness',
          projectPath: process.cwd(),
          targetEnvironment: 'production',
          strictMode: true,
          enableMemoryIntegration: false,
        })
      );
    });

    it('should use production environment for quality checks', async () => {
      await generateCodeQualityResource();

      const toolCall = mockDeploymentReadiness.mock.calls[0][0];
      expect(toolCall.targetEnvironment).toBe('production');
      expect(toolCall.strictMode).toBe(true);
    });
  });

  describe('Response Structure Validation', () => {
    it('should have required metric fields', async () => {
      const result = await generateCodeQualityResource();

      expect(result.data.metrics).toHaveProperty('productionCodeScore');
      expect(result.data.metrics).toHaveProperty('mockCodeIndicators');
      expect(result.data.metrics).toHaveProperty('productionCodeThreshold');
      expect(result.data.metrics).toHaveProperty('codebaseSize');

      expect(result.data.metrics.codebaseSize).toHaveProperty('totalFiles');
      expect(result.data.metrics.codebaseSize).toHaveProperty('totalLines');
      expect(result.data.metrics.codebaseSize).toHaveProperty('productionFiles');
      expect(result.data.metrics.codebaseSize).toHaveProperty('testFiles');
      expect(result.data.metrics.codebaseSize).toHaveProperty('mockFiles');
    });

    it('should have valid grade values', async () => {
      const result = await generateCodeQualityResource();

      expect(['A', 'B', 'C', 'D', 'F']).toContain(result.data.grade);
    });

    it('should have ISO timestamp format', async () => {
      const result = await generateCodeQualityResource();

      const timestamp = result.data.timestamp;
      expect(timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T/); // ISO 8601 format
      expect(new Date(timestamp)).toBeInstanceOf(Date);
      expect(new Date(timestamp).toString()).not.toBe('Invalid Date');
    });

    it('should have valid metadata structure', async () => {
      const result = await generateCodeQualityResource();

      expect(result.data.metadata).toMatchObject({
        scope: expect.any(String),
        analysisType: expect.stringMatching(/^(comprehensive|basic)$/),
        confidence: expect.any(Number),
        timestamp: expect.any(String),
        dataSource: expect.stringMatching(/^(comprehensive-tool|basic-analysis)$/),
      });

      expect(result.data.metadata.confidence).toBeGreaterThanOrEqual(0);
      expect(result.data.metadata.confidence).toBeLessThanOrEqual(1);
    });
  });

  describe('Edge Cases', () => {
    it('should handle zero production code score', async () => {
      mockDeploymentReadiness.mockResolvedValue({
        content: [{ text: 'Production code score: 0%' }],
      });

      const result = await generateCodeQualityResource();

      expect(result.data.overallScore).toBe(0);
      expect(result.data.grade).toBe('F');
    });

    it('should handle missing tool output', async () => {
      mockDeploymentReadiness.mockResolvedValue({ content: [] });

      const result = await generateCodeQualityResource();

      // Empty output still uses comprehensive tool, just with zero data
      expect(result.data.metadata.dataSource).toBe('comprehensive-tool');
      expect(result.data.overallScore).toBe(0);
    });

    it('should handle malformed tool output', async () => {
      mockDeploymentReadiness.mockResolvedValue({
        content: [{ text: 'Invalid data format' }],
      });

      const result = await generateCodeQualityResource();

      expect(result.data.overallScore).toBe(0);
      expect(result.data.metrics.productionCodeScore).toBe(0);
    });

    it('should handle perfect score (100%)', async () => {
      mockDeploymentReadiness.mockResolvedValue({
        content: [{ text: 'Production code score: 100%' }],
      });

      const result = await generateCodeQualityResource();

      expect(result.data.overallScore).toBe(100);
      expect(result.data.grade).toBe('A');
    });
  });
});
