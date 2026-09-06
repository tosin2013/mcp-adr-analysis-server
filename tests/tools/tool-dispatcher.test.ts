/**
 * Tool Dispatcher Tests
 *
 * Updated after ADR-023 Phase 0 (#1673): search_tools removed from the wire,
 * getToolListForMCP simplified to full-only mode.
 */

import {
  executeSearchTools,
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

    it('should NOT return removed host-native tools', () => {
      const removedTools = [
        'read_file',
        'write_file',
        'list_directory',
        'read_directory',
        'list_roots',
        'search_tools',
        'load_prompt',
        'get_current_datetime',
        'check_ai_execution_status',
      ];
      const result = executeSearchTools({ limit: 100 });
      const returnedNames = result.tools.map(t => t.name);
      for (const removed of removedTools) {
        expect(returnedNames).not.toContain(removed);
      }
    });
  });

  describe('getToolListForMCP', () => {
    it('should return full mode with all schemas', () => {
      const result = getToolListForMCP({ mode: 'full' });

      expect(result.tools.length).toBeGreaterThan(50);
      const tool = result.tools.find(t => t.name === 'analyze_project_ecosystem');
      expect(tool?.inputSchema.properties).toBeDefined();
    });

    it('should default to full mode', () => {
      const result = getToolListForMCP({});

      expect(result.tools.length).toBeGreaterThan(50);
      const tool = result.tools.find(t => t.name === 'analyze_project_ecosystem');
      expect(tool?.inputSchema.properties).toBeDefined();
    });

    it('should NOT include removed host-native tools', () => {
      const result = getToolListForMCP({ mode: 'full' });
      const names = result.tools.map(t => t.name);

      expect(names).not.toContain('read_file');
      expect(names).not.toContain('write_file');
      expect(names).not.toContain('list_directory');
      expect(names).not.toContain('read_directory');
      expect(names).not.toContain('list_roots');
      expect(names).not.toContain('search_tools');
      expect(names).not.toContain('load_prompt');
      expect(names).not.toContain('get_current_datetime');
      expect(names).not.toContain('check_ai_execution_status');
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
      expect(toolExists('manage_cache')).toBe(true);
    });

    it('should return false for non-existent tools', () => {
      expect(toolExists('non_existent_tool')).toBe(false);
      expect(toolExists('')).toBe(false);
    });

    it('should return false for removed host-native tools', () => {
      expect(toolExists('get_current_datetime')).toBe(false);
      expect(toolExists('read_file')).toBe(false);
      expect(toolExists('search_tools')).toBe(false);
      expect(toolExists('check_ai_execution_status')).toBe(false);
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

    it('should return undefined for removed tools', () => {
      expect(getToolMetadata('get_current_datetime')).toBeUndefined();
      expect(getToolMetadata('search_tools')).toBeUndefined();
    });
  });
});
