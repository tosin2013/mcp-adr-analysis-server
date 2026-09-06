import { describe, it, expect, beforeEach } from 'vitest';
import { generatePatternByNameResource } from '../../src/resources/pattern-by-name-resource.js';
import { resourceCache } from '../../src/resources/resource-cache.js';
import { URLSearchParams } from 'url';

describe('generatePatternByNameResource', () => {
  beforeEach(() => {
    resourceCache.clear();
  });

  it('throws when name param is missing', async () => {
    await expect(generatePatternByNameResource({}, new URLSearchParams())).rejects.toThrow(
      'Missing required parameter: name'
    );
  });

  it('throws when pattern is not found', async () => {
    await expect(
      generatePatternByNameResource({ name: 'NonExistentPattern' }, new URLSearchParams())
    ).rejects.toThrow('Pattern not found: NonExistentPattern');
  });

  it('returns valid result for known pattern MVC', async () => {
    const result = await generatePatternByNameResource({ name: 'MVC' }, new URLSearchParams());
    expect(result.contentType).toBe('application/json');
    expect(result.data.name).toBe('MVC');
    expect(result.data.category).toBe('architectural');
    expect(result.cacheKey).toBe('pattern:MVC');
    expect(result.ttl).toBe(300);
    expect(result.etag).toBeDefined();
  });

  it('returns testability as null after #1590 change', async () => {
    const result = await generatePatternByNameResource({ name: 'MVC' }, new URLSearchParams());
    expect(result.data.quality.testability).toBeNull();
  });

  it('returns empty examples array after #1590 change', async () => {
    const result = await generatePatternByNameResource({ name: 'MVC' }, new URLSearchParams());
    expect(result.data.examples).toEqual([]);
  });

  it('returns cached result on second call', async () => {
    const first = await generatePatternByNameResource(
      { name: 'Repository' },
      new URLSearchParams()
    );
    const second = await generatePatternByNameResource(
      { name: 'Repository' },
      new URLSearchParams()
    );
    expect(second.etag).toBe(first.etag);
  });

  it('matches pattern name case-insensitively', async () => {
    const result = await generatePatternByNameResource({ name: 'mvc' }, new URLSearchParams());
    expect(result.data.name).toBe('MVC');
  });
});
