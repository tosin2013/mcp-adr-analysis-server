import { describe, it, expect, beforeEach } from 'vitest';
import { generateRuleCatalogResource } from '../../src/resources/rule-catalog-resource.js';
import { resourceCache } from '../../src/resources/resource-cache.js';

describe('generateRuleCatalogResource', () => {
  beforeEach(() => {
    resourceCache.clear();
  });

  it('returns valid resource structure', async () => {
    const result = await generateRuleCatalogResource();

    expect(result.contentType).toBe('application/json');
    expect(result.cacheKey).toBe('rule-catalog:current');
    expect(result.ttl).toBe(600);
    expect(result.etag).toBeDefined();
    expect(result.lastModified).toBeDefined();
    expect(result.data).toBeDefined();
  });

  it('returns empty catalog when all sources return []', async () => {
    const result = await generateRuleCatalogResource();
    const { summary, rules } = result.data;

    expect(rules).toEqual([]);
    expect(summary.total).toBe(0);
    expect(summary.enabled).toBe(0);
    expect(summary.disabled).toBe(0);
    expect(summary.byType).toEqual({});
    expect(summary.bySeverity).toEqual({});
  });

  it('reports zero for all rule sources', async () => {
    const result = await generateRuleCatalogResource();
    const { bySource } = result.data.summary;

    expect(bySource.adr).toBe(0);
    expect(bySource.inferred).toBe(0);
    expect(bySource.user_defined).toBe(0);
  });

  it('includes version and timestamp', async () => {
    const result = await generateRuleCatalogResource();

    expect(result.data.version).toBe('1.0.0');
    expect(result.data.timestamp).toBeDefined();
  });

  it('returns cached result on second call', async () => {
    const first = await generateRuleCatalogResource();
    const second = await generateRuleCatalogResource();

    expect(second.etag).toBe(first.etag);
    expect(second.cacheKey).toBe(first.cacheKey);
  });
});
