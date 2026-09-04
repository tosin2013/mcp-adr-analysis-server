import { describe, it, expect, beforeEach } from 'vitest';
import { generateProjectMetricsResource } from '../../src/resources/project-metrics-resource.js';
import { resourceCache } from '../../src/resources/resource-cache.js';

describe('generateProjectMetricsResource', () => {
  beforeEach(() => {
    resourceCache.clear();
  });

  it('returns a valid ResourceGenerationResult', async () => {
    const result = await generateProjectMetricsResource();

    expect(result.contentType).toBe('application/json');
    expect(result.cacheKey).toBe('project-metrics');
    expect(result.ttl).toBe(300);
    expect(result.lastModified).toBeDefined();
    expect(result.etag).toBeDefined();
    expect(result.data).toBeDefined();
  }, 120_000);

  it('reports technologiesUsed and patternsApplied as 0', async () => {
    const result = await generateProjectMetricsResource();

    expect(result.data.architecture.technologiesUsed).toBe(0);
    expect(result.data.architecture.patternsApplied).toBe(0);
  }, 120_000);

  it('reports avgCommitSize as unknown', async () => {
    const result = await generateProjectMetricsResource();

    expect(result.data.productivity.avgCommitSize).toBe('unknown');
  }, 120_000);

  it('reports complexity as 100 (constant)', async () => {
    const result = await generateProjectMetricsResource();

    expect(result.data.quality.complexity).toBe(100);
  }, 120_000);

  it('includes codebase stats', async () => {
    const result = await generateProjectMetricsResource();

    expect(result.data.codebase.totalFiles).toBeGreaterThan(0);
    expect(result.data.codebase.totalLines).toBeGreaterThan(0);
    expect(result.data.codebase.totalSize).toBeDefined();
    expect(result.data.codebase.languages).toBeDefined();
    expect(Array.isArray(result.data.codebase.largestFiles)).toBe(true);
  }, 120_000);

  it('includes git stats', async () => {
    const result = await generateProjectMetricsResource();

    expect(result.data.git.totalCommits).toBeGreaterThan(0);
    expect(result.data.git.contributors).toBeGreaterThan(0);
    expect(result.data.git.branches).toBeGreaterThan(0);
    expect(result.data.git.lastCommit).toBeDefined();
    expect(result.data.git.activity).toBeDefined();
  }, 120_000);

  it('returns cached result on second call', async () => {
    const first = await generateProjectMetricsResource();
    const second = await generateProjectMetricsResource();

    expect(second.etag).toBe(first.etag);
    expect(second.data.codebase.totalFiles).toBe(first.data.codebase.totalFiles);
  }, 120_000);
});
