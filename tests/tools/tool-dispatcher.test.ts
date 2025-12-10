/**
 * Tool Dispatcher Tests
 */

import {
  executeSearchTools,
  getSearchToolsDefinition,
  getToolListForMCP,
  getToolCategories,
  getCEMCPSummary,
  toolExists,
  getToolMetadata,
} from '../../src/tools/tool-dispatcher.js';

describe('Tool Dispatcher', () => {
  describe('executeSearchTools', () => {
    it('should return tools matching a query', () => {
      const result = executeSearchTools({ query: 'adr' });

      expect(result.success).toBe(true);
      expect(result.tools.length).toBeGreaterThan(0);
      expect(result.summary.totalFound).toBeGreaterThan(0);
    });

    it('should filter by category', () => {
      const result = executeSearchTools({ category: 'adr' });

      expect(result.success).toBe(true);
      for (const tool of result.tools) {
        expect(tool.category).toBe('adr');
      }
    });

    it('should filter by complexity', () => {
      const result = executeSearchTools({ complexity: 'simple' });

      expect(result.success).toBe(true);
      for (const tool of result.tools) {
        expect(tool.complexity).toBe('simple');
      }
    });

    it('should filter by CE-MCP availability', () => {
      const result = executeSearchTools({ cemcpOnly: true });

      expect(result.success).toBe(true);
      for (const tool of result.tools) {
        expect(tool.hasCEMCPDirective).toBe(true);
      }
    });

    it('should include token cost info', () => {
      const result = executeSearchTools({ limit: 5 });

      expect(result.success).toBe(true);
      for (const tool of result.tools) {
        expect(tool.tokenCost).toBeDefined();
        expect(tool.tokenCost!.min).toBeGreaterThanOrEqual(0);
        expect(tool.tokenCost!.max).toBeGreaterThanOrEqual(tool.tokenCost!.min);
      }
    });

    it('should include schemas when requested', () => {
      const withSchema = executeSearchTools({ limit: 1, includeSchema: true });
      const withoutSchema = executeSearchTools({ limit: 1, includeSchema: false });

      expect(withSchema.tools[0].inputSchema).toBeDefined();
      expect(withoutSchema.tools[0].inputSchema).toBeUndefined();
    });

    it('should respect limit parameter', () => {
      const result = executeSearchTools({ limit: 3 });

      expect(result.tools.length).toBeLessThanOrEqual(3);
    });

    it('should return catalog summary', () => {
      const result = executeSearchTools({});

      expect(result.summary.totalInCatalog).toBeGreaterThanOrEqual(50);
      expect(result.summary.byCategory).toBeDefined();
    });

    it('should combine multiple filters', () => {
      const result = executeSearchTools({
        category: 'adr',
        complexity: 'simple',
        limit: 50,
      });

      for (const tool of result.tools) {
        expect(tool.category).toBe('adr');
        expect(tool.complexity).toBe('simple');
      }
    });
  });

  describe('getSearchToolsDefinition', () => {
    it('should return valid MCP tool definition', () => {
      const def = getSearchToolsDefinition();

      expect(def.name).toBe('search_tools');
      expect(def.description).toBeTruthy();
      expect(def.inputSchema).toBeDefined();
      expect(def.inputSchema.type).toBe('object');
    });

    it('should have all expected properties', () => {
      const def = getSearchToolsDefinition();
      const props = def.inputSchema.properties as Record<string, unknown>;

      expect(props['category']).toBeDefined();
      expect(props['query']).toBeDefined();
      expect(props['complexity']).toBeDefined();
      expect(props['cemcpOnly']).toBeDefined();
      expect(props['includeSchema']).toBeDefined();
      expect(props['limit']).toBeDefined();
    });
  });

  describe('getToolListForMCP', () => {
    it('should return summary mode with only search_tools', () => {
      const result = getToolListForMCP({ mode: 'summary' });

      expect(result.tools.length).toBe(1);
      expect(result.tools[0].name).toBe('search_tools');
    });

    it('should return lightweight mode with all tools', () => {
      const result = getToolListForMCP({ mode: 'lightweight' });

      expect(result.tools.length).toBeGreaterThan(50);
      // First tool should be search_tools
      expect(result.tools[0].name).toBe('search_tools');
    });

    it('should include category in lightweight descriptions', () => {
      const result = getToolListForMCP({ mode: 'lightweight' });

      // Skip search_tools, check others
      const toolWithCategory = result.tools.find(t => t.name === 'suggest_adrs');
      expect(toolWithCategory?.description).toContain('[adr]');
    });

    it('should mark CE-MCP tools in lightweight mode', () => {
      const result = getToolListForMCP({ mode: 'lightweight' });

      const cemcpTool = result.tools.find(t => t.name === 'analyze_project_ecosystem');
      expect(cemcpTool?.description).toContain('(CE-MCP)');
    });

    it('should return full mode with all schemas', () => {
      const result = getToolListForMCP({ mode: 'full' });

      expect(result.tools.length).toBeGreaterThan(50);
      // Tools should have proper inputSchema
      const tool = result.tools.find(t => t.name === 'analyze_project_ecosystem');
      expect(tool?.inputSchema.properties).toBeDefined();
    });

    it('should default to lightweight mode', () => {
      const result = getToolListForMCP({});

      expect(result.tools.length).toBeGreaterThan(50);
      // Lightweight tools have placeholder schemas
      const tool = result.tools.find(t => t.name === 'suggest_adrs');
      expect(tool?.inputSchema.description).toContain('search_tools');
    });
  });

  describe('getToolCategories', () => {
    it('should return all categories with counts', () => {
      const categories = getToolCategories();

      expect(categories['analysis']).toBeDefined();
      expect(categories['adr']).toBeDefined();
      expect(categories['deployment']).toBeDefined();
      expect(categories['utility']).toBeDefined();
    });

    it('should have descriptions for all categories', () => {
      const categories = getToolCategories();

      for (const [, info] of Object.entries(categories)) {
        expect(info.description).toBeTruthy();
        expect(typeof info.count).toBe('number');
      }
    });

    it('should have positive counts for main categories', () => {
      const categories = getToolCategories();

      expect(categories['adr'].count).toBeGreaterThan(0);
      expect(categories['analysis'].count).toBeGreaterThan(0);
    });
  });

  describe('getCEMCPSummary', () => {
    it('should return list of CE-MCP enabled tools', () => {
      const summary = getCEMCPSummary();

      expect(summary.enabled.length).toBeGreaterThan(0);
      expect(summary.enabled).toContain('analyze_project_ecosystem');
      expect(summary.enabled).toContain('suggest_adrs');
    });

    it('should return high token cost tools', () => {
      const summary = getCEMCPSummary();

      expect(summary.highTokenCost.length).toBeGreaterThan(0);
      expect(summary.highTokenCost).toContain('analyze_project_ecosystem');
    });

    it('should include token savings explanation', () => {
      const summary = getCEMCPSummary();

      expect(summary.totalTokenSavings).toContain('60-70%');
    });
  });

  describe('toolExists', () => {
    it('should return true for existing tools', () => {
      expect(toolExists('analyze_project_ecosystem')).toBe(true);
      expect(toolExists('suggest_adrs')).toBe(true);
      expect(toolExists('get_current_datetime')).toBe(true);
    });

    it('should return false for non-existent tools', () => {
      expect(toolExists('non_existent_tool')).toBe(false);
      expect(toolExists('')).toBe(false);
    });
  });

  describe('getToolMetadata', () => {
    it('should return tool definition for existing tool', () => {
      const tool = getToolMetadata('analyze_project_ecosystem');

      expect(tool).toBeDefined();
      expect(tool!.name).toBe('analyze_project_ecosystem');
      expect(tool!.description).toBeTruthy();
      expect(tool!.inputSchema).toBeDefined();
    });

    it('should return undefined for non-existent tool', () => {
      const tool = getToolMetadata('non_existent_tool');

      expect(tool).toBeUndefined();
    });
  });

  describe('Token Savings', () => {
    it('should achieve token reduction in lightweight mode', () => {
      const full = getToolListForMCP({ mode: 'full' });
      const lightweight = getToolListForMCP({ mode: 'lightweight' });

      const fullSize = JSON.stringify(full).length;
      const lightSize = JSON.stringify(lightweight).length;

      // Lightweight should be smaller (placeholder schemas replace full schemas)
      const reduction = 1 - lightSize / fullSize;
      // Note: lightweight mode adds category prefixes to descriptions,
      // so reduction is modest (~17%). The real savings come from:
      // 1. Summary mode (93%+ reduction)
      // 2. search_tools returning only relevant tools on-demand
      expect(reduction).toBeGreaterThan(0.1); // At least 10% reduction
    });

    it('should achieve maximum reduction in summary mode', () => {
      const full = getToolListForMCP({ mode: 'full' });
      const summary = getToolListForMCP({ mode: 'summary' });

      const fullSize = JSON.stringify(full).length;
      const summarySize = JSON.stringify(summary).length;

      // Summary should be dramatically smaller (only search_tools)
      const reduction = 1 - summarySize / fullSize;
      expect(reduction).toBeGreaterThan(0.9); // At least 90% reduction
    });

    it('should have search_tools enable on-demand schema loading', () => {
      // The key insight: clients use search_tools to get specific tool schemas
      // instead of loading all 50+ schemas upfront
      const searchResult = executeSearchTools({ query: 'adr', includeSchema: true, limit: 5 });

      // Only 5 tools returned with schemas instead of 50+
      expect(searchResult.tools.length).toBeLessThanOrEqual(5);

      // Each returned tool has schema for immediate use
      for (const tool of searchResult.tools) {
        expect(tool.inputSchema).toBeDefined();
      }
    });
  });
});
