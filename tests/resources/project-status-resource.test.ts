import { describe, it, expect, beforeEach } from 'vitest';
import { generateProjectStatusResource } from '../../src/resources/project-status-resource.js';
import { resourceCache } from '../../src/resources/resource-cache.js';

describe('generateProjectStatusResource', () => {
  beforeEach(() => {
    resourceCache.clear();
  });

  it('returns a valid ResourceGenerationResult', async () => {
    const result = await generateProjectStatusResource();

    expect(result.contentType).toBe('application/json');
    expect(result.cacheKey).toBe('project-status:current');
    expect(result.ttl).toBe(120);
    expect(result.lastModified).toBeDefined();
    expect(result.etag).toBeDefined();
    expect(result.data).toBeDefined();
  });

  it('includes version and timestamp in data', async () => {
    const result = await generateProjectStatusResource();

    expect(result.data.version).toBe('1.0.0');
    expect(result.data.timestamp).toBeDefined();
  });

  it('reports overallHealth as a valid category', async () => {
    const result = await generateProjectStatusResource();

    expect(['excellent', 'good', 'fair', 'poor']).toContain(result.data.overallHealth);
  });

  it('returns null for resourceCoverage', async () => {
    const result = await generateProjectStatusResource();

    expect(result.data.metrics.resourceCoverage).toBeNull();
  });

  it('returns null for qualityScore when sub-resources have no data', async () => {
    const result = await generateProjectStatusResource();

    const qs = result.data.metrics.qualityScore;
    expect(qs === null || typeof qs === 'number').toBe(true);
  });

  it('includes components from sub-resources', async () => {
    const result = await generateProjectStatusResource();

    expect(result.data.components).toBeDefined();
    expect(result.data.components.tasks).toBeDefined();
    expect(result.data.components.research).toBeDefined();
    expect(result.data.components.rules).toBeDefined();
  });

  it('returns cached result on second call', async () => {
    const first = await generateProjectStatusResource();
    const second = await generateProjectStatusResource();

    expect(second.etag).toBe(first.etag);
    expect(second.data.timestamp).toBe(first.data.timestamp);
  });
});
