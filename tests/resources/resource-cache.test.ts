/**
 * The cache Map was unbounded (#1542).
 *
 * Three eviction mechanisms existed. One worked:
 *
 *   - lazy expiry on read (`get`) deleted an expired entry when it was read again
 *   - `cleanup()`, the bulk sweep, was scheduled only by `startAutomaticCleanup`,
 *     which had zero callers
 *   - `evictLRU()` had zero callers, so nothing capped the size
 *
 * So the entries that accumulated were exactly the ones NEVER READ AGAIN — one-off
 * resource URIs, per-project keys, anything queried once. Under stdio transport the
 * process is long-lived, so that is the whole session.
 *
 * The fix bounds on write rather than on a timer. A `setInterval` under stdio keeps
 * the event loop alive, and a cache whose correctness depends on a background timer
 * having been started is a cache that is unbounded whenever it was not.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { ResourceCache, MAX_CACHE_ENTRIES } from '../../src/resources/resource-cache.js';

describe('ResourceCache bounds (#1542)', () => {
  let cache: ResourceCache;

  beforeEach(() => {
    cache = new ResourceCache();
  });

  it('does not grow without bound when entries expire unread', async () => {
    // The exact leak: written, expired, never read back, so lazy expiry never fires.
    for (let i = 0; i < MAX_CACHE_ENTRIES * 2; i++) {
      cache.set(`expired-${i}`, { i }, -1); // already expired
    }

    expect(cache.getStats().totalEntries).toBeLessThanOrEqual(MAX_CACHE_ENTRIES);
  });

  it('caps live entries and evicts least-recently-used first', async () => {
    for (let i = 0; i < MAX_CACHE_ENTRIES; i++) {
      cache.set(`live-${i}`, { i }, 3600);
    }
    // Touch the oldest so it is no longer the LRU candidate.
    expect(await cache.get('live-0')).not.toBeNull();

    for (let i = 0; i < 10; i++) {
      cache.set(`overflow-${i}`, { i }, 3600);
    }

    expect(cache.getStats().totalEntries).toBeLessThanOrEqual(MAX_CACHE_ENTRIES);
    expect(
      await cache.get('live-0'),
      'a recently-read entry should survive eviction'
    ).not.toBeNull();
    expect(await cache.get('overflow-9'), 'the newest entry should survive').not.toBeNull();
  });

  it('prefers dropping expired entries over evicting live ones', async () => {
    for (let i = 0; i < MAX_CACHE_ENTRIES; i++) {
      cache.set(`stale-${i}`, { i }, -1);
    }
    cache.set('fresh', { v: 1 }, 3600);

    expect(
      await cache.get('fresh'),
      'a live entry must not be evicted to make room'
    ).not.toBeNull();

    // The discriminating assertion: sweeping expired entries first clears all of
    // them, so the cache collapses to roughly the live set. Evicting by LRU alone
    // would only shed enough to get under the cap, leaving the rest of the dead
    // entries resident.
    expect(cache.getStats().totalEntries).toBeLessThan(MAX_CACHE_ENTRIES / 2);
  });

  it('still serves what it stores', async () => {
    cache.set('k', { v: 42 }, 3600);
    expect(await cache.get('k')).toEqual({ v: 42 });
  });

  it('exposes no timer-based cleanup API', async () => {
    // Correctness must not depend on a background interval having been started,
    // and no interval should be able to hold the stdio event loop open.
    const mod: Record<string, unknown> = await import('../../src/resources/resource-cache.js');
    expect(mod['startAutomaticCleanup']).toBeUndefined();
    expect(mod['stopAutomaticCleanup']).toBeUndefined();
  });
});
