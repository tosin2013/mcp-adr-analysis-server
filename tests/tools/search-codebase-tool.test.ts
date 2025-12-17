/**
 * Tests for Search Codebase Tool
 *
 * Tests the atomic search_codebase function with dependency injection.
 * No complex ESM mocking required - uses simple dependency injection.
 */

import { describe, it, expect, _jest, beforeEach } from 'vitest';
import {
  searchCodebase,
  searchCodebaseTool,
  type SearchCodebaseDependencies,
} from '../../src/tools/search-codebase-tool.js';

// Mock dependencies with proper typing
const createMockDeps = (): SearchCodebaseDependencies => {
  const mockReadFile = vi.fn();
  return {
    fs: {
      readFile: mockReadFile,
    } satisfies Partial<SearchCodebaseDependencies['fs']>,
  } satisfies SearchCodebaseDependencies;
};

describe('searchCodebase', () => {
  let mockDeps: SearchCodebaseDependencies;

  beforeEach(() => {
    mockDeps = createMockDeps();
  });

  describe('input validation', () => {
    it('should throw error when query is empty', async () => {
      await expect(searchCodebase({ query: '' }, mockDeps)).rejects.toThrow(
        'Search query is required'
      );
    });

    it('should throw error when query is only whitespace', async () => {
      await expect(searchCodebase({ query: '   ' }, mockDeps)).rejects.toThrow(
        'Search query is required'
      );
    });

    it('should accept valid query', async () => {
      const result = await searchCodebase(
        {
          query: 'Docker configuration',
          projectPath: process.cwd(),
        },
        mockDeps
      );

      expect(result).toBeDefined();
      expect(result.keywords).toBeDefined();
      expect(Array.isArray(result.matches)).toBe(true);
    });
  });

  describe('keyword extraction', () => {
    it('should extract keywords from query', async () => {
      const result = await searchCodebase(
        {
          query: 'How does the Docker configuration work?',
          projectPath: process.cwd(),
        },
        mockDeps
      );

      expect(result.keywords).toContain('docker');
      expect(result.keywords).toContain('configuration');
      expect(result.keywords).toContain('work');
      // Stop words should be excluded
      expect(result.keywords).not.toContain('the');
      expect(result.keywords).not.toContain('how');
      expect(result.keywords).not.toContain('does');
    });

    it('should handle special characters in query', async () => {
      const result = await searchCodebase(
        {
          query: 'kubernetes deployment & CI/CD pipeline!',
          projectPath: process.cwd(),
        },
        mockDeps
      );

      // Keywords can be either individual words or compound words (e.g., "kubernetes-deployment")
      const hasKubernetes = result.keywords.some(k => k.includes('kubernetes'));
      const hasDeployment = result.keywords.some(k => k.includes('deployment'));
      const hasPipeline = result.keywords.some(k => k.includes('pipeline'));

      expect(hasKubernetes).toBe(true);
      expect(hasDeployment).toBe(true);
      expect(hasPipeline).toBe(true);
    });

    it('should remove duplicate keywords', async () => {
      const result = await searchCodebase(
        {
          query: 'Docker docker DOCKER configuration',
          projectPath: process.cwd(),
        },
        mockDeps
      );

      const dockerCount = result.keywords.filter(k => k === 'docker').length;
      expect(dockerCount).toBe(1);
    });
  });

  describe('file discovery', () => {
    it('should discover files based on query intent', async () => {
      const result = await searchCodebase(
        {
          query: 'Docker configuration',
          projectPath: process.cwd(),
        },
        mockDeps
      );

      expect(result.totalFiles).toBeGreaterThanOrEqual(0);
      expect(result.matches).toBeDefined();
    });

    it('should respect maxFiles limit', async () => {
      const result = await searchCodebase(
        {
          query: 'TypeScript files',
          projectPath: process.cwd(),
          maxFiles: 5,
        },
        mockDeps
      );

      expect(result.matches.length).toBeLessThanOrEqual(5);
    });

    it('should handle custom scope patterns', async () => {
      const result = await searchCodebase(
        {
          query: 'test files',
          projectPath: process.cwd(),
          scope: ['tests/**/*.ts', 'src/**/*.test.ts'],
          maxFiles: 10,
        },
        mockDeps
      );

      expect(result.totalFiles).toBeGreaterThanOrEqual(0);
    });
  });

  describe('relevance scoring', () => {
    it('should return matches with relevance scores', async () => {
      const result = await searchCodebase(
        {
          query: 'Jest testing framework',
          projectPath: process.cwd(),
        },
        mockDeps
      );

      if (result.matches.length > 0) {
        result.matches.forEach(match => {
          expect(match.relevance).toBeGreaterThanOrEqual(0);
          expect(match.relevance).toBeLessThanOrEqual(1);
        });
      }
    });

    it('should sort matches by relevance descending', async () => {
      const result = await searchCodebase(
        {
          query: 'TypeScript configuration',
          projectPath: process.cwd(),
        },
        mockDeps
      );

      if (result.matches.length > 1) {
        for (let i = 0; i < result.matches.length - 1; i++) {
          expect(result.matches[i]!.relevance).toBeGreaterThanOrEqual(
            result.matches[i + 1]!.relevance
          );
        }
      }
    });

    it('should filter out low relevance matches', async () => {
      const result = await searchCodebase(
        {
          query: 'quantum computing blockchain AI',
          projectPath: process.cwd(),
        },
        mockDeps
      );

      // All returned matches should have relevance > 0.2
      result.matches.forEach(match => {
        expect(match.relevance).toBeGreaterThan(0.2);
      });
    });
  });

  describe('content inclusion', () => {
    it('should not include content by default', async () => {
      const result = await searchCodebase(
        {
          query: 'package.json',
          projectPath: process.cwd(),
        },
        mockDeps
      );

      if (result.matches.length > 0) {
        expect(result.matches[0]!.content).toBeUndefined();
      }
    });

    it('should include content when requested', async () => {
      const result = await searchCodebase(
        {
          query: 'package.json',
          projectPath: process.cwd(),
          includeContent: true,
        },
        mockDeps
      );

      if (result.matches.length > 0) {
        const packageJsonMatch = result.matches.find(m => m.path.includes('package.json'));
        if (packageJsonMatch) {
          expect(packageJsonMatch.content).toBeDefined();
          expect(typeof packageJsonMatch.content).toBe('string');
        }
      }
    });
  });

  describe('tree-sitter analysis', () => {
    it('should work without tree-sitter when disabled', async () => {
      const result = await searchCodebase(
        {
          query: 'TypeScript files',
          projectPath: process.cwd(),
          enableTreeSitter: false,
        },
        mockDeps
      );

      expect(result.matches).toBeDefined();
      // Parse analysis should not be present
      result.matches.forEach(match => {
        expect(match.parseAnalysis).toBeUndefined();
      });
    });

    it('should include parse analysis when tree-sitter is enabled', async () => {
      const result = await searchCodebase(
        {
          query: 'TypeScript configuration',
          projectPath: process.cwd(),
          enableTreeSitter: true,
          maxFiles: 5,
        },
        mockDeps
      );

      if (result.matches.length > 0) {
        const tsFile = result.matches.find(m => m.path.endsWith('.ts'));
        if (tsFile && tsFile.parseAnalysis) {
          expect(tsFile.parseAnalysis.language).toBeDefined();
          expect(typeof tsFile.parseAnalysis.functionCount).toBe('number');
          expect(typeof tsFile.parseAnalysis.importCount).toBe('number');
        }
      }
    });
  });

  describe('result structure', () => {
    it('should return complete CodebaseSearchResult structure', async () => {
      const result = await searchCodebase(
        {
          query: 'test query',
          projectPath: process.cwd(),
        },
        mockDeps
      );

      expect(result).toHaveProperty('matches');
      expect(result).toHaveProperty('totalFiles');
      expect(result).toHaveProperty('keywords');
      expect(result).toHaveProperty('projectPath');
      expect(result).toHaveProperty('duration');

      expect(Array.isArray(result.matches)).toBe(true);
      expect(typeof result.totalFiles).toBe('number');
      expect(Array.isArray(result.keywords)).toBe(true);
      expect(typeof result.projectPath).toBe('string');
      expect(typeof result.duration).toBe('number');
      expect(result.duration).toBeGreaterThan(0);
    });

    it('should return FileMatch objects with correct structure', async () => {
      const result = await searchCodebase(
        {
          query: 'package.json',
          projectPath: process.cwd(),
        },
        mockDeps
      );

      if (result.matches.length > 0) {
        const match = result.matches[0]!;
        expect(match).toHaveProperty('path');
        expect(match).toHaveProperty('relevance');
        expect(typeof match.path).toBe('string');
        expect(typeof match.relevance).toBe('number');
      }
    });
  });

  describe('intent-based discovery', () => {
    it('should detect Docker-related queries', async () => {
      const result = await searchCodebase(
        {
          query: 'Docker container configuration',
          projectPath: process.cwd(),
        },
        mockDeps
      );

      // Should search for docker-related files
      expect(result.keywords).toContain('docker');
      expect(result.totalFiles).toBeGreaterThanOrEqual(0);
    });

    it('should detect Kubernetes-related queries', async () => {
      const result = await searchCodebase(
        {
          query: 'Kubernetes deployment and pods',
          projectPath: process.cwd(),
        },
        mockDeps
      );

      expect(result.keywords).toContain('kubernetes');
      expect(result.keywords).toContain('deployment');
    });

    it('should detect test-related queries', async () => {
      const result = await searchCodebase(
        {
          query: 'testing framework and test files',
          projectPath: process.cwd(),
        },
        mockDeps
      );

      expect(result.keywords).toContain('testing');
      expect(result.keywords).toContain('test');
      expect(result.keywords).toContain('files');
    });

    it('should detect build/CI queries', async () => {
      const result = await searchCodebase(
        {
          query: 'CI/CD pipeline and build configuration',
          projectPath: process.cwd(),
        },
        mockDeps
      );

      expect(result.keywords).toContain('pipeline');
      expect(result.keywords).toContain('build');
      expect(result.keywords).toContain('configuration');
    });
  });

  describe('error handling', () => {
    it('should handle non-existent project path gracefully', async () => {
      const result = await searchCodebase(
        {
          query: 'test query',
          projectPath: '/non/existent/path',
        },
        mockDeps
      );

      // Should return empty results for non-existent path
      expect(result.matches).toEqual([]);
      expect(result.totalFiles).toBe(0);
    });

    it('should continue on file read errors', async () => {
      const failingDeps: SearchCodebaseDependencies = {
        fs: {
          readFile: vi.fn().mockRejectedValue(new Error('File read error')),
        } as any,
      };

      const result = await searchCodebase(
        {
          query: 'test query',
          projectPath: process.cwd(),
        },
        failingDeps
      );

      // Should still return a valid result even if file reads fail
      expect(result).toBeDefined();
      expect(result.matches).toBeDefined();
    });
  });
});

describe('searchCodebaseTool', () => {
  describe('MCP tool wrapper', () => {
    it('should return CallToolResult structure', async () => {
      const result = await searchCodebaseTool({
        query: 'package.json',
        projectPath: process.cwd(),
      });

      expect(result).toHaveProperty('content');
      expect(Array.isArray(result.content)).toBe(true);
      expect(result.content[0]).toHaveProperty('type');
      expect(result.content[0]).toHaveProperty('text');
      expect(result.content[0]!.type).toBe('text');
    });

    it('should format output with search results', async () => {
      const result = await searchCodebaseTool({
        query: 'TypeScript configuration',
        projectPath: process.cwd(),
        maxFiles: 3,
      });

      const output = result.content[0]!.text;
      expect(output).toContain('Codebase Search Results');
      expect(output).toContain('Query');
      expect(output).toContain('Matches');
      expect(output).toContain('Duration');
      expect(output).toContain('Keywords');
    });

    it('should handle errors gracefully', async () => {
      const result = await searchCodebaseTool({
        query: '',
        projectPath: process.cwd(),
      });

      expect(result.isError).toBe(true);
      expect(result.content[0]!.text).toContain('Search failed');
    });

    it('should show "No files found" when no matches', async () => {
      const result = await searchCodebaseTool({
        query: 'xyzabc123nonexistentquery999',
        projectPath: process.cwd(),
      });

      if (!result.isError) {
        const output = result.content[0]!.text;
        expect(output).toContain('No files found matching the query');
      }
    });

    it('should include content preview when requested', async () => {
      const result = await searchCodebaseTool({
        query: 'package.json',
        projectPath: process.cwd(),
        includeContent: true,
        maxFiles: 1,
      });

      if (!result.isError) {
        const output = result.content[0]!.text;
        if (output.includes('package.json')) {
          expect(output).toContain('Content Preview');
        }
      }
    });
  });
});
