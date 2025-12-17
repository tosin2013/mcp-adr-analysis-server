/**
 * Unit tests for tool-catalog-resource.ts
 * Tests tool catalog generation, filtering, and caching
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

// Mock tool-catalog
const mockGetCatalogSummary = vi.fn();
const mockSearchTools = vi.fn();
const mockToolCatalog = new Map();

vi.mock('../../src/tools/tool-catalog.js', () => ({
  TOOL_CATALOG: mockToolCatalog,
  getCatalogSummary: mockGetCatalogSummary,
  searchTools: mockSearchTools,
}));

describe('Tool Catalog Resource', () => {
  let generateToolCatalogResource: any;

  beforeAll(async () => {
    const module = await import('../../src/resources/tool-catalog-resource.js');
    generateToolCatalogResource = module.generateToolCatalogResource;
  });

  beforeEach(() => {
    vi.clearAllMocks();

    // Default: no cache hit
    mockCacheGet.mockResolvedValue(null);

    // Mock catalog summary
    mockGetCatalogSummary.mockReturnValue({
      totalTools: 60,
      byCategory: {
        analysis: 10,
        adr: 15,
        deployment: 8,
        research: 7,
        memory: 5,
        'file-system': 4,
        'content-security': 4,
        rules: 3,
        workflow: 2,
        utility: 2,
      },
      cemcpEnabled: 25,
      highTokenCost: 12,
    });

    // Mock search tools result
    mockSearchTools.mockReturnValue({
      tools: [
        {
          name: 'analyze_project_ecosystem',
          shortDescription: 'Analyze project structure',
          fullDescription: 'Comprehensive analysis of project ecosystem',
          category: 'analysis',
          complexity: 'complex',
          tokenCost: { min: 5000, max: 15000 },
          hasCEMCPDirective: true,
          requiresAI: true,
          relatedTools: ['get_architectural_context'],
          keywords: ['analysis', 'ecosystem', 'project'],
          inputSchema: { type: 'object', properties: {} },
        },
        {
          name: 'suggest_adrs',
          shortDescription: 'Suggest ADRs for decisions',
          fullDescription: 'Generate ADR suggestions based on context',
          category: 'adr',
          complexity: 'moderate',
          tokenCost: { min: 2000, max: 5000 },
          hasCEMCPDirective: false,
          requiresAI: true,
          relatedTools: ['generate_adr_from_decision'],
          keywords: ['adr', 'suggestion', 'decision'],
          inputSchema: { type: 'object', properties: {} },
        },
      ],
      totalCount: 2,
      categories: {
        analysis: 1,
        adr: 1,
        deployment: 0,
        research: 0,
        memory: 0,
        'file-system': 0,
        'content-security': 0,
        rules: 0,
        workflow: 0,
        utility: 0,
      },
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Basic Resource Generation', () => {
    it('should generate tool catalog with default parameters', async () => {
      const result = await generateToolCatalogResource({}, new URLSearchParams());

      expect(result).toBeDefined();
      expect(result.data).toBeDefined();
      expect(result.data.summary).toBeDefined();
      expect(result.data.tools).toBeDefined();
      expect(result.data.summary.totalTools).toBe(60);
      expect(result.contentType).toBe('application/json');
    });

    it('should include timestamp in response', async () => {
      const result = await generateToolCatalogResource({}, new URLSearchParams());

      expect(result.data.timestamp).toBeDefined();
      expect(new Date(result.data.timestamp).getTime()).toBeGreaterThan(0);
    });

    it('should call getCatalogSummary', async () => {
      await generateToolCatalogResource({}, new URLSearchParams());

      expect(mockGetCatalogSummary).toHaveBeenCalled();
    });

    it('should call searchTools with default parameters', async () => {
      await generateToolCatalogResource({}, new URLSearchParams());

      expect(mockSearchTools).toHaveBeenCalledWith({
        includeSchema: false,
        limit: 1000,
      });
    });
  });

  describe('Query Parameter Handling', () => {
    it('should filter by category when specified', async () => {
      await generateToolCatalogResource({}, new URLSearchParams('category=adr'));

      expect(mockSearchTools).toHaveBeenCalledWith({
        category: 'adr',
        includeSchema: false,
        limit: 1000,
      });
    });

    it('should include schemas when requested', async () => {
      const result = await generateToolCatalogResource(
        {},
        new URLSearchParams('includeSchema=true')
      );

      expect(mockSearchTools).toHaveBeenCalledWith({
        includeSchema: true,
        limit: 1000,
      });

      // Check that schemas are included in tools
      expect(result.data.tools[0]).toHaveProperty('inputSchema');
    });

    it('should return lightweight catalog when requested', async () => {
      const result = await generateToolCatalogResource({}, new URLSearchParams('lightweight=true'));

      // Lightweight tools should only have basic fields
      const tool = result.data.tools[0];
      expect(tool).toHaveProperty('name');
      expect(tool).toHaveProperty('description');
      expect(tool).toHaveProperty('category');
      expect(tool).toHaveProperty('hasCEMCPDirective');

      // Should NOT have these fields
      expect(tool).not.toHaveProperty('complexity');
      expect(tool).not.toHaveProperty('tokenCost');
      expect(tool).not.toHaveProperty('relatedTools');
    });

    it('should use short description for lightweight catalog', async () => {
      const result = await generateToolCatalogResource({}, new URLSearchParams('lightweight=true'));

      expect(result.data.tools[0].description).toBe('Analyze project structure');
    });
  });

  describe('Tool Data Structure', () => {
    it('should include full tool metadata by default', async () => {
      const result = await generateToolCatalogResource({}, new URLSearchParams());

      const tool = result.data.tools[0];
      expect(tool.name).toBe('analyze_project_ecosystem');
      expect(tool.description).toBe('Comprehensive analysis of project ecosystem');
      expect(tool.category).toBe('analysis');
      expect(tool.complexity).toBe('complex');
      expect(tool.tokenCost).toEqual({ min: 5000, max: 15000 });
      expect(tool.hasCEMCPDirective).toBe(true);
      expect(tool.requiresAI).toBe(true);
      expect(tool.relatedTools).toEqual(['get_architectural_context']);
      expect(tool.keywords).toEqual(['analysis', 'ecosystem', 'project']);
    });

    it('should exclude schemas by default', async () => {
      const result = await generateToolCatalogResource({}, new URLSearchParams());

      expect(result.data.tools[0]).not.toHaveProperty('inputSchema');
    });

    it('should include all tools from search results', async () => {
      const result = await generateToolCatalogResource({}, new URLSearchParams());

      expect(result.data.tools).toHaveLength(2);
      expect(result.data.tools[0].name).toBe('analyze_project_ecosystem');
      expect(result.data.tools[1].name).toBe('suggest_adrs');
    });
  });

  describe('Summary Statistics', () => {
    it('should include complete summary', async () => {
      const result = await generateToolCatalogResource({}, new URLSearchParams());

      expect(result.data.summary).toMatchObject({
        totalTools: 60,
        cemcpEnabled: 25,
        highTokenCost: 12,
      });
    });

    it('should include category breakdown', async () => {
      const result = await generateToolCatalogResource({}, new URLSearchParams());

      expect(result.data.summary.byCategory).toBeDefined();
      expect(result.data.summary.byCategory.analysis).toBe(10);
      expect(result.data.summary.byCategory.adr).toBe(15);
    });
  });

  describe('Caching', () => {
    it('should return cached result when available', async () => {
      const cachedResult = {
        data: {
          summary: { totalTools: 50 },
          tools: [],
          timestamp: new Date().toISOString(),
        },
        contentType: 'application/json',
        cacheKey: 'tool-catalog',
      };

      mockCacheGet.mockResolvedValue(cachedResult);

      const result = await generateToolCatalogResource({}, new URLSearchParams());

      expect(result).toBe(cachedResult);
      expect(mockSearchTools).not.toHaveBeenCalled();
    });

    it('should cache result after generation', async () => {
      await generateToolCatalogResource({}, new URLSearchParams());

      expect(mockCacheSet).toHaveBeenCalledWith(
        'tool-catalog',
        expect.objectContaining({
          data: expect.any(Object),
          contentType: 'application/json',
          cacheKey: 'tool-catalog',
          ttl: 300,
        }),
        300
      );
    });

    it('should use category-specific cache key when filtering', async () => {
      await generateToolCatalogResource({}, new URLSearchParams('category=adr'));

      expect(mockCacheSet).toHaveBeenCalledWith('tool-catalog:adr', expect.anything(), 300);
    });

    it('should use 5-minute TTL for relatively static data', async () => {
      const result = await generateToolCatalogResource({}, new URLSearchParams());

      expect(result.ttl).toBe(300);
    });
  });

  describe('Error Handling', () => {
    it('should throw error when catalog generation fails', async () => {
      mockGetCatalogSummary.mockImplementation(() => {
        throw new Error('Catalog generation failed');
      });

      await expect(generateToolCatalogResource({}, new URLSearchParams())).rejects.toThrow(
        'Failed to generate tool catalog'
      );
    });

    it('should throw error when search fails', async () => {
      mockSearchTools.mockImplementation(() => {
        throw new Error('Search failed');
      });

      await expect(generateToolCatalogResource({}, new URLSearchParams())).rejects.toThrow(
        'Failed to generate tool catalog'
      );
    });
  });

  describe('Response Structure', () => {
    it('should return properly structured ResourceGenerationResult', async () => {
      const result = await generateToolCatalogResource({}, new URLSearchParams());

      expect(result).toMatchObject({
        data: expect.objectContaining({
          summary: expect.any(Object),
          tools: expect.any(Array),
          timestamp: expect.any(String),
        }),
        contentType: 'application/json',
        lastModified: expect.any(String),
        cacheKey: 'tool-catalog',
        ttl: 300,
        etag: expect.any(String),
      });
    });

    it('should generate valid etag', async () => {
      const result = await generateToolCatalogResource({}, new URLSearchParams());

      expect(result.etag).toBeDefined();
      expect(typeof result.etag).toBe('string');
      expect(result.etag.length).toBeGreaterThan(0);
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty tool list', async () => {
      mockSearchTools.mockReturnValue({
        tools: [],
        totalCount: 0,
        categories: {},
      });

      const result = await generateToolCatalogResource({}, new URLSearchParams());

      expect(result.data.tools).toHaveLength(0);
    });

    it('should handle category with no tools', async () => {
      mockSearchTools.mockReturnValue({
        tools: [],
        totalCount: 0,
        categories: {
          workflow: 0,
        },
      });

      const result = await generateToolCatalogResource(
        {},
        new URLSearchParams('category=workflow')
      );

      expect(result.data.tools).toHaveLength(0);
    });
  });
});
