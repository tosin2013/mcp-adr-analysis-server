/**
 * Unit tests for adrs-review-resource.ts
 * Tests ADR review resource generation, caching, and parameter handling
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

// Mock reviewExistingAdrs tool
const mockReviewExistingAdrs = jest.fn();

jest.unstable_mockModule('../../src/tools/review-existing-adrs-tool.js', () => ({
  reviewExistingAdrs: mockReviewExistingAdrs,
}));

describe('ADR Review Resource', () => {
  let generateAdrsReviewResource: any;

  beforeAll(async () => {
    const module = await import('../../src/resources/adrs-review-resource.js');
    generateAdrsReviewResource = module.generateAdrsReviewResource;
  });

  beforeEach(() => {
    jest.clearAllMocks();

    // Default: no cache hit
    mockCacheGet.mockResolvedValue(null);

    // Default: successful review
    mockReviewExistingAdrs.mockResolvedValue({
      content: [
        {
          type: 'text',
          text: `
### ADR 001 - Database Architecture

**Status**: Accepted

## Compliance Score: 8.5/10

## Evidence Found
- Database schema matches ADR specification
- Connection pooling implemented as described
- Migration scripts follow defined patterns

## Gaps Identified
- Backup strategy not fully implemented
- Monitoring dashboards missing

## Recommendations
- Implement automated backups
- Add performance monitoring
- Update ADR with current configuration
          `,
        },
      ],
    });
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('Basic Resource Generation', () => {
    it('should generate ADR review with required id parameter', async () => {
      const result = await generateAdrsReviewResource({ id: '001' }, new URLSearchParams());

      expect(result).toBeDefined();
      expect(result.data).toBeDefined();
      expect(result.data.adrId).toBe('001');
      expect(result.contentType).toBe('application/json');
      expect(result.cacheKey).toBe('adr-review:001:detailed');
      expect(result.ttl).toBe(180);
    });

    it('should throw error when id parameter is missing', async () => {
      await expect(generateAdrsReviewResource({}, new URLSearchParams())).rejects.toThrow(
        'Missing required parameter: id'
      );
    });

    it('should include timestamp in response', async () => {
      const result = await generateAdrsReviewResource({ id: '001' }, new URLSearchParams());

      expect(result.data.timestamp).toBeDefined();
      expect(new Date(result.data.timestamp).getTime()).toBeGreaterThan(0);
    });

    it('should call reviewExistingAdrs with correct parameters', async () => {
      await generateAdrsReviewResource(
        { id: '001' },
        new URLSearchParams('analysisDepth=comprehensive&projectPath=/test/project')
      );

      expect(mockReviewExistingAdrs).toHaveBeenCalledWith({
        projectPath: '/test/project',
        specificAdr: '001',
        analysisDepth: 'comprehensive',
        includeTreeSitter: true,
        generateUpdatePlan: true,
      });
    });
  });

  describe('Query Parameter Handling', () => {
    it('should respect analysisDepth parameter', async () => {
      const result = await generateAdrsReviewResource(
        { id: '001' },
        new URLSearchParams('analysisDepth=basic')
      );

      expect(result.data.analysisDepth).toBe('basic');
      expect(result.cacheKey).toBe('adr-review:001:basic');
      expect(mockReviewExistingAdrs).toHaveBeenCalledWith(
        expect.objectContaining({
          analysisDepth: 'basic',
        })
      );
    });

    it('should default analysisDepth to detailed', async () => {
      const result = await generateAdrsReviewResource({ id: '001' }, new URLSearchParams());

      expect(result.data.analysisDepth).toBe('detailed');
    });

    it('should respect includeTreeSitter parameter', async () => {
      await generateAdrsReviewResource(
        { id: '001' },
        new URLSearchParams('includeTreeSitter=false')
      );

      expect(mockReviewExistingAdrs).toHaveBeenCalledWith(
        expect.objectContaining({
          includeTreeSitter: false,
        })
      );
    });

    it('should use custom projectPath when provided', async () => {
      const customPath = '/custom/project/path';
      const result = await generateAdrsReviewResource(
        { id: '001' },
        new URLSearchParams(`projectPath=${customPath}`)
      );

      expect(result.data.projectPath).toBe(customPath);
    });

    it('should use process.cwd() as default projectPath', async () => {
      const result = await generateAdrsReviewResource({ id: '001' }, new URLSearchParams());

      expect(result.data.projectPath).toBe(process.cwd());
    });
  });

  describe('Compliance Score Extraction', () => {
    it('should extract compliance score from review text', async () => {
      const result = await generateAdrsReviewResource({ id: '001' }, new URLSearchParams());

      expect(result.data.complianceScore).toBe(8.5);
    });

    it('should default to 5 when score not found', async () => {
      mockReviewExistingAdrs.mockResolvedValue({
        content: [{ type: 'text', text: 'Review without score' }],
      });

      const result = await generateAdrsReviewResource({ id: '001' }, new URLSearchParams());

      expect(result.data.complianceScore).toBe(5);
    });

    it('should determine implementation status based on score', async () => {
      const result = await generateAdrsReviewResource({ id: '001' }, new URLSearchParams());

      expect(result.data.codeCompliance.implemented).toBe(true);
      expect(result.data.codeCompliance.partiallyImplemented).toBe(false);
      expect(result.data.codeCompliance.notImplemented).toBe(false);
    });

    it('should mark as partially implemented for medium scores', async () => {
      mockReviewExistingAdrs.mockResolvedValue({
        content: [{ type: 'text', text: 'Compliance Score: 6.5/10' }],
      });

      const result = await generateAdrsReviewResource({ id: '001' }, new URLSearchParams());

      expect(result.data.codeCompliance.implemented).toBe(false);
      expect(result.data.codeCompliance.partiallyImplemented).toBe(true);
      expect(result.data.codeCompliance.notImplemented).toBe(false);
    });

    it('should mark as not implemented for low scores', async () => {
      mockReviewExistingAdrs.mockResolvedValue({
        content: [{ type: 'text', text: 'Compliance Score: 3/10' }],
      });

      const result = await generateAdrsReviewResource({ id: '001' }, new URLSearchParams());

      expect(result.data.codeCompliance.implemented).toBe(false);
      expect(result.data.codeCompliance.partiallyImplemented).toBe(false);
      expect(result.data.codeCompliance.notImplemented).toBe(true);
    });
  });

  describe('Evidence and Gaps Extraction', () => {
    it('should extract evidence from review text', async () => {
      const result = await generateAdrsReviewResource({ id: '001' }, new URLSearchParams());

      expect(result.data.codeCompliance.evidence).toBeInstanceOf(Array);
      expect(result.data.codeCompliance.evidence.length).toBeGreaterThan(0);
    });

    it('should extract gaps from review text', async () => {
      const result = await generateAdrsReviewResource({ id: '001' }, new URLSearchParams());

      expect(result.data.codeCompliance.gaps).toBeInstanceOf(Array);
      expect(result.data.codeCompliance.gaps.length).toBeGreaterThan(0);
    });

    it('should extract recommendations from review text', async () => {
      const result = await generateAdrsReviewResource({ id: '001' }, new URLSearchParams());

      expect(result.data.recommendations.actions).toBeInstanceOf(Array);
      expect(result.data.recommendations.actions.length).toBeGreaterThan(0);
    });
  });

  describe('Caching', () => {
    it('should return cached result when available', async () => {
      const cachedResult = {
        data: {
          adrId: '001',
          title: 'Cached ADR',
          complianceScore: 9,
          timestamp: new Date().toISOString(),
        },
        contentType: 'application/json',
        cacheKey: 'adr-review:001:detailed',
      };

      mockCacheGet.mockResolvedValue(cachedResult);

      const result = await generateAdrsReviewResource({ id: '001' }, new URLSearchParams());

      expect(result).toBe(cachedResult);
      expect(mockReviewExistingAdrs).not.toHaveBeenCalled();
    });

    it('should cache result after generation', async () => {
      await generateAdrsReviewResource({ id: '001' }, new URLSearchParams());

      expect(mockCacheSet).toHaveBeenCalledWith(
        'adr-review:001:detailed',
        expect.objectContaining({
          data: expect.any(Object),
          contentType: 'application/json',
          cacheKey: 'adr-review:001:detailed',
          ttl: 180,
        }),
        180
      );
    });

    it('should use different cache keys for different analysis depths', async () => {
      mockCacheGet.mockResolvedValue(null);

      await generateAdrsReviewResource({ id: '001' }, new URLSearchParams('analysisDepth=basic'));

      expect(mockCacheSet).toHaveBeenCalledWith('adr-review:001:basic', expect.any(Object), 180);
    });
  });

  describe('Error Handling', () => {
    it('should throw error when review fails', async () => {
      mockReviewExistingAdrs.mockRejectedValue(new Error('Review failed'));

      await expect(
        generateAdrsReviewResource({ id: '001' }, new URLSearchParams())
      ).rejects.toThrow('Failed to generate ADR review');
    });

    it('should handle empty review result', async () => {
      mockReviewExistingAdrs.mockResolvedValue({
        content: [],
      });

      const result = await generateAdrsReviewResource({ id: '001' }, new URLSearchParams());

      expect(result.data.analysis).toBe('');
      expect(result.data.complianceScore).toBe(5); // default
    });
  });

  describe('Response Structure', () => {
    it('should return properly structured ResourceGenerationResult', async () => {
      const result = await generateAdrsReviewResource({ id: '001' }, new URLSearchParams());

      expect(result).toMatchObject({
        data: expect.objectContaining({
          adrId: '001',
          title: expect.any(String),
          status: expect.any(String),
          complianceScore: expect.any(Number),
          codeCompliance: expect.objectContaining({
            implemented: expect.any(Boolean),
            partiallyImplemented: expect.any(Boolean),
            notImplemented: expect.any(Boolean),
            evidence: expect.any(Array),
            gaps: expect.any(Array),
          }),
          recommendations: expect.objectContaining({
            updateAdr: expect.any(Boolean),
            updateCode: expect.any(Boolean),
            createPlan: expect.any(Boolean),
            actions: expect.any(Array),
          }),
          analysis: expect.any(String),
          timestamp: expect.any(String),
          projectPath: expect.any(String),
          analysisDepth: expect.any(String),
        }),
        contentType: 'application/json',
        lastModified: expect.any(String),
        cacheKey: expect.any(String),
        ttl: 180,
        etag: expect.any(String),
      });
    });

    it('should generate valid etag', async () => {
      const result = await generateAdrsReviewResource({ id: '001' }, new URLSearchParams());

      expect(result.etag).toBeDefined();
      expect(typeof result.etag).toBe('string');
      expect(result.etag.length).toBeGreaterThan(0);
    });
  });
});
