/**
 * Tests for Search Codebase Tool
 *
 * #1519: these tests used to pass `projectPath: process.cwd()` — the real
 * working tree — as their subject. That made them non-hermetic (adding or
 * deleting any unrelated file changed what they read) and slow enough to lose a
 * per-test timeout on a loaded runner: 170s for this file alone. Most of the
 * assertions were vacuous (`toBeGreaterThanOrEqual(0)` and bodies wrapped in
 * `if (result.matches.length > 0)`), so 114k lines were scanned to check that a
 * result object had five keys.
 *
 * Every test now runs against FIXTURE, a ten-file project built here from
 * literal content. Because the contents are known, the assertions are exact.
 *
 * Doing that made four defects visible that the old assertions could not fail
 * on. They are pinned in the `known defects` block at the bottom rather than
 * fixed here — scope is hermeticity, not relevance scoring — and are filed
 * separately. Those tests assert what the tool DOES, and are written to break
 * when it starts doing the right thing.
 */

import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import { mkdtemp, mkdir, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import {
  searchCodebase,
  searchCodebaseTool,
  type SearchCodebaseDependencies,
} from '../../src/tools/search-codebase-tool.js';

/**
 * The fixture project. Each file is present to exercise one discovery path:
 * Docker, Kubernetes, package, config, environment, build, CI, test, source.
 * Nothing here matches `xyzabc123nonexistentquery999` or `quantum blockchain`,
 * which the no-match tests rely on.
 */
const FIXTURE_FILES: Record<string, string> = {
  Dockerfile: 'FROM node:22-alpine\nWORKDIR /app\nCOPY package.json .\nRUN npm ci\n',
  'docker-compose.yml': 'services:\n  app:\n    build: .\n    ports:\n      - "3000:3000"\n',
  'package.json':
    '{"name":"fixture-project","version":"1.0.0","dependencies":{"express":"^4.18.0"}}',
  'tsconfig.json': '{"compilerOptions":{"target":"ES2022","strict":true}}',
  Makefile: 'build:\n\tnpm run build\n',
  '.env.example': 'DATABASE_URL=postgres://localhost:5432/app\nPORT=3000\n',
  'k8s/deployment.yaml': 'apiVersion: apps/v1\nkind: Deployment\nmetadata:\n  name: fixture-app\n',
  '.github/workflows/ci.yml': 'name: ci\non: [push]\njobs:\n  build:\n    runs-on: ubuntu-latest\n',
  'src/database.config.ts':
    'export const configuration = { port: 3000 };\n\nexport function connect(): void {}\n',
  'tests/example.test.ts': "import { describe } from 'vitest';\n\ndescribe('example', () => {});\n",
};

let FIXTURE: string;

/** Discovery yields a mix of absolute and project-relative paths; see `known defects`. */
const relativePaths = (result: { matches: Array<{ path: string }> }): string[] => [
  ...new Set(
    result.matches.map(m => (path.isAbsolute(m.path) ? path.relative(FIXTURE, m.path) : m.path))
  ),
];

beforeAll(async () => {
  FIXTURE = await mkdtemp(path.join(tmpdir(), 'search-codebase-fixture-'));
  for (const [relative, content] of Object.entries(FIXTURE_FILES)) {
    const target = path.join(FIXTURE, relative);
    await mkdir(path.dirname(target), { recursive: true });
    await writeFile(target, content, 'utf-8');
  }
});

afterAll(async () => {
  if (FIXTURE) await rm(FIXTURE, { recursive: true, force: true });
});

describe('searchCodebase', () => {
  describe('input validation', () => {
    it('should throw error when query is empty', async () => {
      await expect(searchCodebase({ query: '', projectPath: FIXTURE })).rejects.toThrow(
        'Search query is required'
      );
    });

    it('should throw error when query is only whitespace', async () => {
      await expect(searchCodebase({ query: '   ', projectPath: FIXTURE })).rejects.toThrow(
        'Search query is required'
      );
    });

    it('should accept valid query', async () => {
      const result = await searchCodebase({
        query: 'deployment configuration',
        projectPath: FIXTURE,
      });

      expect(result.projectPath).toBe(FIXTURE);
      expect(result.keywords).toEqual(['deployment', 'configuration']);
      expect(relativePaths(result)).toEqual(['k8s/deployment.yaml']);
    });
  });

  describe('keyword extraction', () => {
    it('should extract keywords from query', async () => {
      const result = await searchCodebase({
        query: 'How does the Docker configuration work?',
        projectPath: FIXTURE,
      });

      expect(result.keywords).toEqual(['docker', 'configuration', 'work']);
    });

    it('should handle special characters in query', async () => {
      const result = await searchCodebase({
        query: 'Kubernetes deployment (k8s) - CI/CD pipeline!',
        projectPath: FIXTURE,
      });

      expect(result.keywords).toContain('kubernetes');
      expect(result.keywords).toContain('deployment');
      expect(result.keywords).toContain('pipeline');
    });

    it('should remove duplicate keywords', async () => {
      const result = await searchCodebase({
        query: 'Docker docker DOCKER container',
        projectPath: FIXTURE,
      });

      expect(result.keywords.filter(k => k === 'docker')).toHaveLength(1);
    });
  });

  describe('file discovery', () => {
    it('should discover files based on query intent', async () => {
      const docker = await searchCodebase({ query: 'Docker configuration', projectPath: FIXTURE });
      const kubernetes = await searchCodebase({
        query: 'Kubernetes pods',
        projectPath: FIXTURE,
      });

      // Intent routing reaches different files for different queries — the
      // point of the phase. Exact counts, not `>= 0`.
      expect(docker.totalFiles).toBe(4);
      expect(kubernetes.totalFiles).toBe(2);
    });

    it('should respect maxFiles limit', async () => {
      const unlimited = await searchCodebase({ query: 'build pipeline', projectPath: FIXTURE });
      const limited = await searchCodebase({
        query: 'build pipeline',
        projectPath: FIXTURE,
        maxFiles: 1,
      });

      // The limit must actually bite, or this asserts nothing.
      expect(unlimited.matches.length).toBeGreaterThan(1);
      expect(limited.matches).toHaveLength(1);
    });

    it('should handle custom scope patterns', async () => {
      const unscoped = await searchCodebase({
        query: 'deployment configuration',
        projectPath: FIXTURE,
      });
      const scoped = await searchCodebase({
        query: 'deployment configuration',
        projectPath: FIXTURE,
        scope: ['src/**/*.ts'],
      });

      expect(relativePaths(unscoped)).not.toContain('src/database.config.ts');
      expect(relativePaths(scoped)).toContain('src/database.config.ts');
    });
  });

  describe('relevance scoring', () => {
    it('should return matches with relevance scores', async () => {
      const result = await searchCodebase({
        query: 'deployment configuration',
        projectPath: FIXTURE,
      });

      expect(result.matches.length).toBeGreaterThan(0);
      result.matches.forEach(match => {
        expect(match.relevance).toBeGreaterThan(0);
        expect(match.relevance).toBeLessThanOrEqual(1);
      });
    });

    it('should sort matches by relevance descending', async () => {
      const result = await searchCodebase({
        query: 'deployment configuration',
        projectPath: FIXTURE,
        scope: ['src/**/*.ts'],
      });

      expect(result.matches.length).toBeGreaterThan(1);
      const relevances = result.matches.map(m => m.relevance);
      expect(relevances).toEqual([...relevances].sort((a, b) => b - a));
    });

    it('should filter out low relevance matches', async () => {
      const result = await searchCodebase({
        query: 'quantum computing blockchain',
        projectPath: FIXTURE,
      });

      // Nothing in the fixture is about any of those.
      expect(result.matches).toEqual([]);
      expect(result.totalFiles).toBe(0);
    });
  });

  describe('content inclusion', () => {
    it('should not include content by default', async () => {
      const result = await searchCodebase({
        query: 'deployment configuration',
        projectPath: FIXTURE,
      });

      expect(result.matches.length).toBeGreaterThan(0);
      result.matches.forEach(match => expect(match.content).toBeUndefined());
    });

    it('should include content when requested', async () => {
      const result = await searchCodebase({
        query: 'deployment configuration',
        projectPath: FIXTURE,
        includeContent: true,
      });

      const match = result.matches.find(m => m.path.endsWith('k8s/deployment.yaml'));
      expect(match).toBeDefined();
      expect(match!.content).toBe(FIXTURE_FILES['k8s/deployment.yaml']);
    });
  });

  describe('tree-sitter analysis', () => {
    it('should work without tree-sitter when disabled', async () => {
      const result = await searchCodebase({
        query: 'deployment configuration',
        projectPath: FIXTURE,
        enableTreeSitter: false,
      });

      expect(result.matches.length).toBeGreaterThan(0);
      result.matches.forEach(match => expect(match.parseAnalysis).toBeUndefined());
    });

    it('should include parse analysis when tree-sitter is enabled', async () => {
      const result = await searchCodebase({
        query: 'deployment configuration',
        projectPath: FIXTURE,
        enableTreeSitter: true,
        scope: ['src/**/*.ts'],
      });

      const yaml = result.matches.find(m => m.path.endsWith('.yaml'));
      const typescript = result.matches.find(m => m.path.endsWith('.ts'));

      expect(yaml?.parseAnalysis?.language).toBe('yaml');
      expect(typescript?.parseAnalysis?.language).toBe('typescript');
    });
  });

  describe('result structure', () => {
    it('should return complete CodebaseSearchResult structure', async () => {
      const result = await searchCodebase({
        query: 'deployment configuration',
        projectPath: FIXTURE,
      });

      expect(result).toHaveProperty('matches');
      expect(result).toHaveProperty('totalFiles');
      expect(result).toHaveProperty('keywords');
      expect(result).toHaveProperty('projectPath');
      expect(result).toHaveProperty('duration');

      expect(result.projectPath).toBe(FIXTURE);
      expect(result.keywords).toEqual(['deployment', 'configuration']);
      expect(result.totalFiles).toBe(4);
      expect(result.duration).toBeGreaterThan(0);
    });

    it('should return FileMatch objects with correct structure', async () => {
      const result = await searchCodebase({
        query: 'deployment configuration',
        projectPath: FIXTURE,
      });

      const match = result.matches[0];
      expect(match).toBeDefined();
      expect(match!.path).toContain('k8s/deployment.yaml');
      expect(typeof match!.relevance).toBe('number');
    });
  });

  describe('intent-based discovery', () => {
    it('should detect Docker-related queries', async () => {
      const result = await searchCodebase({
        query: 'Docker container configuration',
        projectPath: FIXTURE,
      });

      expect(result.keywords).toContain('docker');
      // Discovery reaches the Docker files even though scoring drops them —
      // see `known defects > filename is never scored`.
      expect(result.totalFiles).toBe(4);
    });

    it('should detect Kubernetes-related queries', async () => {
      const result = await searchCodebase({
        query: 'Kubernetes deployment and pods',
        projectPath: FIXTURE,
      });

      expect(result.keywords).toContain('kubernetes');
      expect(result.keywords).toContain('deployment');
      expect(relativePaths(result)).toEqual(['k8s/deployment.yaml']);
    });

    it('should detect test-related queries', async () => {
      const result = await searchCodebase({
        query: 'testing framework and test files',
        projectPath: FIXTURE,
      });

      expect(result.keywords).toEqual(['testing', 'framework', 'test', 'files']);
      expect(result.totalFiles).toBeGreaterThan(0);
    });

    it('should detect build/CI queries', async () => {
      const result = await searchCodebase({
        query: 'CI/CD pipeline and build configuration',
        projectPath: FIXTURE,
      });

      expect(result.keywords).toContain('pipeline');
      expect(result.keywords).toContain('build');
      expect(relativePaths(result).sort()).toEqual(['.github/workflows/ci.yml', 'Makefile']);
    });
  });

  describe('error handling', () => {
    it('should handle non-existent project path gracefully', async () => {
      const result = await searchCodebase({
        query: 'deployment configuration',
        projectPath: path.join(FIXTURE, 'no', 'such', 'directory'),
      });

      expect(result.matches).toEqual([]);
      expect(result.totalFiles).toBe(0);
    });

    it('should continue on file read errors', async () => {
      const readFile = vi.fn().mockRejectedValue(new Error('File read error'));
      const failingDeps = { fs: { readFile } } as unknown as SearchCodebaseDependencies;

      const result = await searchCodebase(
        { query: 'deployment configuration', projectPath: FIXTURE },
        failingDeps
      );

      // Discovery still succeeds and is reported; only scoring is lost.
      expect(readFile).toHaveBeenCalled();
      expect(result.totalFiles).toBe(4);
      expect(result.matches).toEqual([]);
    });
  });
});

describe('searchCodebaseTool', () => {
  describe('MCP tool wrapper', () => {
    it('should return CallToolResult structure', async () => {
      const result = await searchCodebaseTool({
        query: 'deployment configuration',
        projectPath: FIXTURE,
      });

      expect(Array.isArray(result.content)).toBe(true);
      expect(result.content[0]!.type).toBe('text');
      expect(typeof result.content[0]!.text).toBe('string');
    });

    it('should format output with search results', async () => {
      const result = await searchCodebaseTool({
        query: 'deployment configuration',
        projectPath: FIXTURE,
        maxFiles: 3,
      });

      const output = result.content[0]!.text;
      expect(output).toContain('Codebase Search Results');
      expect(output).toContain('Query');
      expect(output).toContain('Matches');
      expect(output).toContain('Duration');
      expect(output).toContain('Keywords');
      expect(output).toContain('k8s/deployment.yaml');
    });

    it('should handle errors gracefully', async () => {
      const result = await searchCodebaseTool({ query: '', projectPath: FIXTURE });

      expect(result.isError).toBe(true);
      expect(result.content[0]!.text).toContain('Search failed');
    });

    it('should show "No files found" when no matches', async () => {
      const result = await searchCodebaseTool({
        query: 'xyzabc123nonexistentquery999',
        projectPath: FIXTURE,
      });

      expect(result.isError).toBeFalsy();
      expect(result.content[0]!.text).toContain('No files found matching the query');
    });

    it('should include content preview when requested', async () => {
      const result = await searchCodebaseTool({
        query: 'deployment configuration',
        projectPath: FIXTURE,
        includeContent: true,
        maxFiles: 1,
      });

      expect(result.isError).toBeFalsy();
      const output = result.content[0]!.text;
      expect(output).toContain('Content Preview');
      expect(output).toContain('kind: Deployment');
    });
  });
});

/**
 * Defects the old `process.cwd()` assertions could not fail on.
 *
 * These pin CURRENT behaviour, not desired behaviour. Each is written so that
 * fixing the underlying defect breaks the test — which is the point: the fix
 * should have to come back here and say so.
 */
describe('searchCodebase — known defects (pinned, not endorsed)', () => {
  it('returns the same file twice, once absolute and once relative', async () => {
    const result = await searchCodebase({
      query: 'deployment configuration',
      projectPath: FIXTURE,
    });

    // `scanProjectStructure` yields absolute paths, `findFiles` yields relative
    // ones, and both feed the same `discoveredFiles` Set — so a file found by
    // both routes is scored, returned and counted twice.
    expect(result.matches).toHaveLength(2);
    expect(result.matches.filter(m => path.isAbsolute(m.path))).toHaveLength(1);
    expect(result.matches.filter(m => !path.isAbsolute(m.path))).toHaveLength(1);
    expect(relativePaths(result)).toHaveLength(1);
  });

  it('never scores a filename, so searching "docker" cannot return Dockerfile', async () => {
    const result = await searchCodebase({ query: 'Docker configuration', projectPath: FIXTURE });

    // Both Docker files are discovered...
    expect(result.totalFiles).toBe(4);
    // ...and none is returned, because relevance is computed from file CONTENT
    // only and neither file contains the string "docker".
    expect(result.matches).toEqual([]);
  });

  it('reports hasInfrastructure for a file with no infrastructure', async () => {
    const result = await searchCodebase({
      query: 'deployment configuration',
      projectPath: FIXTURE,
      scope: ['src/**/*.ts'],
    });

    const typescript = result.matches.find(m => m.path.endsWith('database.config.ts'));
    expect(typescript?.parseAnalysis).toBeDefined();
    // `hasInfrastructure: !!analysis.infraStructure` — an empty array is truthy,
    // so this is true for every parsed file regardless of content.
    expect(typescript!.parseAnalysis!.hasInfrastructure).toBe(true);
  });
});
