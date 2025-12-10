/**
 * Tool Catalog Tests
 *
 * Tests for the dynamic tool discovery system.
 */

import {
  TOOL_CATALOG,
  ToolCategory,
  getCatalogEntry,
  searchTools,
  getToolsByCategory,
  getCEMCPTools,
  getHighTokenCostTools,
  getCatalogSummary,
  toMCPTool,
  getLightweightToolList,
} from '../../src/tools/tool-catalog.js';

describe('Tool Catalog', () => {
  describe('TOOL_CATALOG registry', () => {
    it('should contain all registered tools', () => {
      // Verify we have a substantial number of tools
      expect(TOOL_CATALOG.size).toBeGreaterThanOrEqual(50);
    });

    it('should have unique tool names', () => {
      const names = Array.from(TOOL_CATALOG.keys());
      const uniqueNames = new Set(names);
      expect(uniqueNames.size).toBe(names.length);
    });

    it('should have valid metadata for each tool', () => {
      for (const [name, metadata] of TOOL_CATALOG) {
        expect(metadata.name).toBe(name);
        expect(metadata.shortDescription).toBeTruthy();
        expect(metadata.shortDescription.length).toBeLessThanOrEqual(100);
        expect(metadata.fullDescription).toBeTruthy();
        expect(metadata.category).toBeTruthy();
        expect(metadata.complexity).toMatch(/^(simple|moderate|complex)$/);
        expect(metadata.tokenCost.min).toBeGreaterThanOrEqual(0);
        expect(metadata.tokenCost.max).toBeGreaterThanOrEqual(metadata.tokenCost.min);
        expect(typeof metadata.hasCEMCPDirective).toBe('boolean');
        expect(Array.isArray(metadata.relatedTools)).toBe(true);
        expect(Array.isArray(metadata.keywords)).toBe(true);
        expect(typeof metadata.requiresAI).toBe('boolean');
        expect(metadata.inputSchema).toBeDefined();
      }
    });

    it('should have valid categories', () => {
      const validCategories: ToolCategory[] = [
        'analysis',
        'adr',
        'content-security',
        'research',
        'deployment',
        'memory',
        'file-system',
        'rules',
        'workflow',
        'utility',
      ];

      for (const [, metadata] of TOOL_CATALOG) {
        expect(validCategories).toContain(metadata.category);
      }
    });
  });

  describe('getCatalogEntry', () => {
    it('should return entry for existing tool', () => {
      const entry = getCatalogEntry('analyze_project_ecosystem');
      expect(entry).toBeDefined();
      expect(entry!.name).toBe('analyze_project_ecosystem');
      expect(entry!.isHighTokenCost).toBe(true); // 15K max
    });

    it('should return undefined for non-existent tool', () => {
      const entry = getCatalogEntry('non_existent_tool');
      expect(entry).toBeUndefined();
    });

    it('should compute isHighTokenCost correctly', () => {
      // High token cost tool
      const highCost = getCatalogEntry('analyze_project_ecosystem');
      expect(highCost!.isHighTokenCost).toBe(true);

      // Low token cost tool
      const lowCost = getCatalogEntry('get_current_datetime');
      expect(lowCost!.isHighTokenCost).toBe(false);
    });
  });

  describe('searchTools', () => {
    it('should return all tools when no options provided', () => {
      const result = searchTools();
      expect(result.totalCount).toBeGreaterThanOrEqual(50);
      expect(result.tools.length).toBeLessThanOrEqual(20); // default limit
    });

    it('should filter by category', () => {
      const result = searchTools({ category: 'adr' });
      expect(result.totalCount).toBeGreaterThan(0);
      for (const tool of result.tools) {
        expect(tool.category).toBe('adr');
      }
    });

    it('should filter by complexity', () => {
      const result = searchTools({ complexity: 'simple' });
      expect(result.totalCount).toBeGreaterThan(0);
      for (const tool of result.tools) {
        expect(tool.complexity).toBe('simple');
      }
    });

    it('should filter by CE-MCP availability', () => {
      const result = searchTools({ cemcpOnly: true });
      expect(result.totalCount).toBeGreaterThan(0);
      for (const tool of result.tools) {
        expect(tool.hasCEMCPDirective).toBe(true);
      }
    });

    it('should search by query', () => {
      const result = searchTools({ query: 'adr' });
      expect(result.totalCount).toBeGreaterThan(0);
      // Results should be scored by relevance
      expect(result.tools[0].searchScore).toBeGreaterThan(0);
    });

    it('should rank name matches higher than description matches', () => {
      const result = searchTools({ query: 'suggest_adrs', limit: 10 });
      expect(result.tools[0].name).toBe('suggest_adrs');
    });

    it('should respect limit option', () => {
      const result = searchTools({ limit: 5 });
      expect(result.tools.length).toBeLessThanOrEqual(5);
    });

    it('should include schema when requested', () => {
      const withSchema = searchTools({ limit: 1, includeSchema: true });
      expect(withSchema.tools[0].inputSchema).toBeDefined();

      const withoutSchema = searchTools({ limit: 1, includeSchema: false });
      expect((withoutSchema.tools[0] as Record<string, unknown>)['inputSchema']).toBeUndefined();
    });

    it('should return category counts', () => {
      const result = searchTools({ limit: 100 });
      expect(result.categories).toBeDefined();
      expect(typeof result.categories['adr']).toBe('number');
      expect(typeof result.categories['analysis']).toBe('number');
    });

    it('should combine multiple filters', () => {
      const result = searchTools({
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

  describe('getToolsByCategory', () => {
    it('should return all tools in a category', () => {
      const adrTools = getToolsByCategory('adr');
      expect(adrTools.length).toBeGreaterThan(0);
      for (const tool of adrTools) {
        expect(tool.category).toBe('adr');
      }
    });

    it('should return tools for all categories', () => {
      const categories: ToolCategory[] = [
        'analysis',
        'adr',
        'content-security',
        'research',
        'deployment',
        'memory',
        'file-system',
        'rules',
        'workflow',
        'utility',
      ];

      for (const category of categories) {
        const tools = getToolsByCategory(category);
        expect(tools.length).toBeGreaterThanOrEqual(0);
      }
    });
  });

  describe('getCEMCPTools', () => {
    it('should return only tools with CE-MCP directives', () => {
      const cemcpTools = getCEMCPTools();
      expect(cemcpTools.length).toBeGreaterThan(0);
      for (const tool of cemcpTools) {
        expect(tool.hasCEMCPDirective).toBe(true);
      }
    });

    it('should include known CE-MCP tools', () => {
      const cemcpTools = getCEMCPTools();
      const toolNames = cemcpTools.map(t => t.name);

      expect(toolNames).toContain('analyze_project_ecosystem');
      expect(toolNames).toContain('suggest_adrs');
      expect(toolNames).toContain('generate_rules');
      expect(toolNames).toContain('analyze_environment');
      expect(toolNames).toContain('deployment_readiness');
    });
  });

  describe('getHighTokenCostTools', () => {
    it('should return only high token cost tools', () => {
      const highCostTools = getHighTokenCostTools();
      expect(highCostTools.length).toBeGreaterThan(0);
      for (const tool of highCostTools) {
        expect(tool.tokenCost.max).toBeGreaterThan(5000);
      }
    });

    it('should include known high-cost tools', () => {
      const highCostTools = getHighTokenCostTools();
      const toolNames = highCostTools.map(t => t.name);

      expect(toolNames).toContain('analyze_project_ecosystem');
      expect(toolNames).toContain('perform_research');
    });
  });

  describe('getCatalogSummary', () => {
    it('should return summary statistics', () => {
      const summary = getCatalogSummary();

      expect(summary.totalTools).toBeGreaterThanOrEqual(50);
      expect(summary.cemcpEnabled).toBeGreaterThan(0);
      expect(summary.highTokenCost).toBeGreaterThan(0);
      expect(summary.byCategory).toBeDefined();
    });

    it('should have category counts matching total', () => {
      const summary = getCatalogSummary();
      const categoryTotal = Object.values(summary.byCategory).reduce((a, b) => a + b, 0);
      expect(categoryTotal).toBe(summary.totalTools);
    });
  });

  describe('toMCPTool', () => {
    it('should convert catalog entry to MCP Tool format', () => {
      const entry = getCatalogEntry('analyze_project_ecosystem')!;
      const mcpTool = toMCPTool(entry);

      expect(mcpTool.name).toBe('analyze_project_ecosystem');
      expect(mcpTool.description).toBe(entry.fullDescription);
      expect(mcpTool.inputSchema).toBe(entry.inputSchema);
    });

    it('should work with raw metadata', () => {
      const metadata = TOOL_CATALOG.get('suggest_adrs')!;
      const mcpTool = toMCPTool(metadata);

      expect(mcpTool.name).toBe('suggest_adrs');
      expect(mcpTool.description).toBeTruthy();
      expect(mcpTool.inputSchema).toBeDefined();
    });
  });

  describe('getLightweightToolList', () => {
    it('should return list without schemas', () => {
      const list = getLightweightToolList();
      expect(list.length).toBeGreaterThanOrEqual(50);

      for (const item of list) {
        expect(item.name).toBeTruthy();
        expect(item.description).toBeTruthy();
        expect(item.category).toBeTruthy();
        expect(typeof item.hasCEMCPDirective).toBe('boolean');
        // Should NOT have inputSchema
        expect((item as Record<string, unknown>)['inputSchema']).toBeUndefined();
      }
    });

    it('should be sorted alphabetically by name', () => {
      const list = getLightweightToolList();
      const names = list.map(t => t.name);
      const sortedNames = [...names].sort();
      expect(names).toEqual(sortedNames);
    });

    it('should have significantly smaller token footprint', () => {
      // Estimate token count based on string length
      const lightweightList = getLightweightToolList();
      const lightweightJson = JSON.stringify(lightweightList);

      // Full list with schemas
      const fullList = searchTools({ limit: 1000, includeSchema: true }).tools;
      const fullJson = JSON.stringify(fullList);

      // Lightweight should be significantly smaller
      expect(lightweightJson.length).toBeLessThan(fullJson.length * 0.5);
    });
  });

  describe('Token Savings Validation', () => {
    it('should achieve target token reduction for listing', () => {
      // Full tool list with schemas
      const fullList = searchTools({ limit: 1000, includeSchema: true }).tools;
      const fullTokenEstimate = JSON.stringify(fullList).length / 4; // Rough estimate

      // Lightweight list
      const lightList = getLightweightToolList();
      const lightTokenEstimate = JSON.stringify(lightList).length / 4;

      // Target: 15K -> 5K (66% reduction)
      const reduction = 1 - lightTokenEstimate / fullTokenEstimate;
      expect(reduction).toBeGreaterThan(0.5); // At least 50% reduction
    });
  });

  describe('Related Tools Validation', () => {
    it('should have valid related tool references', () => {
      const allToolNames = new Set(TOOL_CATALOG.keys());

      for (const [_name, metadata] of TOOL_CATALOG) {
        for (const relatedTool of metadata.relatedTools) {
          expect(allToolNames.has(relatedTool)).toBe(true);
        }
      }
    });
  });

  describe('Specific Tool Entries', () => {
    it('should have analyze_project_ecosystem with correct metadata', () => {
      const entry = getCatalogEntry('analyze_project_ecosystem');
      expect(entry).toBeDefined();
      expect(entry!.category).toBe('analysis');
      expect(entry!.complexity).toBe('complex');
      expect(entry!.hasCEMCPDirective).toBe(true);
      expect(entry!.requiresAI).toBe(true);
      expect(entry!.tokenCost.max).toBeGreaterThanOrEqual(10000);
    });

    it('should have suggest_adrs with correct metadata', () => {
      const entry = getCatalogEntry('suggest_adrs');
      expect(entry).toBeDefined();
      expect(entry!.category).toBe('adr');
      expect(entry!.hasCEMCPDirective).toBe(true);
      expect(entry!.relatedTools).toContain('generate_adr_from_decision');
    });

    it('should have get_current_datetime as simple utility', () => {
      const entry = getCatalogEntry('get_current_datetime');
      expect(entry).toBeDefined();
      expect(entry!.category).toBe('utility');
      expect(entry!.complexity).toBe('simple');
      expect(entry!.requiresAI).toBe(false);
      expect(entry!.tokenCost.max).toBeLessThan(500);
    });
  });
});
