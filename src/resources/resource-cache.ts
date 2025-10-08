/**
 * Resource-level caching infrastructure for MCP resources
 * Provides efficient caching with TTL support, cache management,
 * and conditional request support (ETags, Last-Modified)
 */

import { generateStrongETag } from '../utils/conditional-request.js';
import type { ResourceMetadata } from '../utils/resource-versioning.js';

export interface CacheEntry {
  data: any;
  expiry: number;
  createdAt: number;
  accessCount: number;
  lastAccessed: number;
  etag?: string;
  lastModified?: string;
  version?: string;
  metadata?: ResourceMetadata;
}

export interface CacheStats {
  totalEntries: number;
  validEntries: number;
  expiredEntries: number;
  cacheSize: number;
  hitRate: number;
  totalHits: number;
  totalMisses: number;
}

/**
 * Resource cache with TTL support and statistics tracking
 */
export class ResourceCache {
  private cache = new Map<string, CacheEntry>();
  private hits = 0;
  private misses = 0;

  /**
   * Get cached resource by key
   * @param key Cache key
   * @returns Cached data or null if not found/expired
   */
  async get<T>(key: string): Promise<T | null> {
    const entry = this.cache.get(key);

    if (!entry) {
      this.misses++;
      return null;
    }

    // Check if expired
    if (entry.expiry <= Date.now()) {
      this.cache.delete(key);
      this.misses++;
      return null;
    }

    // Update access stats
    entry.accessCount++;
    entry.lastAccessed = Date.now();
    this.hits++;

    return entry.data as T;
  }

  /**
   * Get cached resource with conditional request support
   * @param key Cache key
   * @param conditionalHeaders Optional conditional headers
   * @returns Result with data, metadata, and notModified flag
   */
  async getWithConditional<T>(
    key: string,
    conditionalHeaders?: {
      ifNoneMatch?: string;
      ifModifiedSince?: string;
    }
  ): Promise<{
    data: T | null;
    notModified: boolean;
    etag?: string;
    lastModified?: string;
    version?: string;
    metadata?: ResourceMetadata;
  }> {
    const entry = this.cache.get(key);

    if (!entry) {
      this.misses++;
      return { data: null, notModified: false };
    }

    // Check if expired
    if (entry.expiry <= Date.now()) {
      this.cache.delete(key);
      this.misses++;
      return { data: null, notModified: false };
    }

    // Check conditional request headers
    if (conditionalHeaders && entry.etag && entry.lastModified) {
      const { ifNoneMatch, ifModifiedSince } = conditionalHeaders;

      // Import conditional request utilities
      const { evaluateConditionalRequest } = await import('../utils/conditional-request.js');

      // Build params object without undefined values
      const params: {
        currentETag: string;
        lastModified: string;
        ifNoneMatch?: string;
        ifModifiedSince?: string;
      } = {
        currentETag: entry.etag,
        lastModified: entry.lastModified,
      };

      if (ifNoneMatch) {
        params.ifNoneMatch = ifNoneMatch;
      }
      if (ifModifiedSince) {
        params.ifModifiedSince = ifModifiedSince;
      }

      const result = evaluateConditionalRequest(params);

      if (result.notModified) {
        // Resource not modified, don't return data
        entry.accessCount++;
        entry.lastAccessed = Date.now();
        this.hits++;

        const response: {
          data: null;
          notModified: true;
          etag?: string;
          lastModified?: string;
          version?: string;
          metadata?: ResourceMetadata;
        } = {
          data: null,
          notModified: true,
          etag: entry.etag,
          lastModified: entry.lastModified,
        };

        if (entry.version) {
          response.version = entry.version;
        }
        if (entry.metadata) {
          response.metadata = entry.metadata;
        }

        return response;
      }
    }

    // Update access stats
    entry.accessCount++;
    entry.lastAccessed = Date.now();
    this.hits++;

    // Build return object without undefined values
    const result: {
      data: T | null;
      notModified: boolean;
      etag?: string;
      lastModified?: string;
      version?: string;
      metadata?: ResourceMetadata;
    } = {
      data: entry.data as T,
      notModified: false,
    };

    if (entry.etag) {
      result.etag = entry.etag;
    }
    if (entry.lastModified) {
      result.lastModified = entry.lastModified;
    }
    if (entry.version) {
      result.version = entry.version;
    }
    if (entry.metadata) {
      result.metadata = entry.metadata;
    }

    return result;
  }

  /**
   * Set cached resource with TTL
   * @param key Cache key
   * @param data Data to cache
   * @param ttl Time to live in seconds
   * @param metadata Optional metadata (etag, lastModified, version, resourceMetadata)
   */
  set(
    key: string,
    data: any,
    ttl: number,
    metadata?: {
      etag?: string;
      lastModified?: string;
      version?: string;
      resourceMetadata?: ResourceMetadata;
    }
  ): void {
    const now = Date.now();
    const lastModified = metadata?.lastModified || new Date(now).toISOString();
    const etag = metadata?.etag || generateStrongETag(data);
    const version = metadata?.version;
    const resourceMetadata = metadata?.resourceMetadata;

    const entry: CacheEntry = {
      data,
      expiry: now + ttl * 1000,
      createdAt: now,
      accessCount: 0,
      lastAccessed: now,
      etag,
      lastModified,
    };

    if (version) {
      entry.version = version;
    }
    if (resourceMetadata) {
      entry.metadata = resourceMetadata;
    }

    this.cache.set(key, entry);
  }

  /**
   * Check if key exists and is valid
   * @param key Cache key
   * @returns True if key exists and is not expired
   */
  has(key: string): boolean {
    const entry = this.cache.get(key);
    if (!entry) return false;

    if (entry.expiry <= Date.now()) {
      this.cache.delete(key);
      return false;
    }

    return true;
  }

  /**
   * Delete cached resource
   * @param key Cache key
   * @returns True if key was deleted
   */
  delete(key: string): boolean {
    return this.cache.delete(key);
  }

  /**
   * Clear cache entries matching pattern
   * @param pattern Optional pattern to match keys (substring match)
   */
  clear(pattern?: string): void {
    if (!pattern) {
      this.cache.clear();
      this.hits = 0;
      this.misses = 0;
      return;
    }

    const keysToDelete: string[] = [];
    for (const key of this.cache.keys()) {
      if (key.includes(pattern)) {
        keysToDelete.push(key);
      }
    }

    keysToDelete.forEach(key => this.cache.delete(key));
  }

  /**
   * Clean up expired entries
   * @returns Number of entries removed
   */
  cleanup(): number {
    const now = Date.now();
    let removed = 0;

    for (const [key, entry] of this.cache.entries()) {
      if (entry.expiry <= now) {
        this.cache.delete(key);
        removed++;
      }
    }

    return removed;
  }

  /**
   * Get cache statistics
   * @returns Cache statistics object
   */
  getStats(): CacheStats {
    const entries = Array.from(this.cache.values());
    const now = Date.now();
    const validEntries = entries.filter(e => e.expiry > now);
    const expiredEntries = entries.filter(e => e.expiry <= now);

    const totalRequests = this.hits + this.misses;
    const hitRate = totalRequests > 0 ? this.hits / totalRequests : 0;

    return {
      totalEntries: this.cache.size,
      validEntries: validEntries.length,
      expiredEntries: expiredEntries.length,
      cacheSize: JSON.stringify(entries).length,
      hitRate,
      totalHits: this.hits,
      totalMisses: this.misses,
    };
  }

  /**
   * Get all cache keys
   * @returns Array of all cache keys
   */
  keys(): string[] {
    return Array.from(this.cache.keys());
  }

  /**
   * Get cache entries sorted by access count
   * @param limit Maximum number of entries to return
   * @returns Top entries by access count
   */
  getTopEntries(limit: number = 10): Array<{ key: string; accessCount: number }> {
    const entries = Array.from(this.cache.entries())
      .map(([key, entry]) => ({
        key,
        accessCount: entry.accessCount,
      }))
      .sort((a, b) => b.accessCount - a.accessCount)
      .slice(0, limit);

    return entries;
  }

  /**
   * Get least recently used entries
   * @param limit Maximum number of entries to return
   * @returns Least recently used entries
   */
  getLRUEntries(limit: number = 10): Array<{ key: string; lastAccessed: number }> {
    const entries = Array.from(this.cache.entries())
      .map(([key, entry]) => ({
        key,
        lastAccessed: entry.lastAccessed,
      }))
      .sort((a, b) => a.lastAccessed - b.lastAccessed)
      .slice(0, limit);

    return entries;
  }

  /**
   * Evict least recently used entries to reduce cache size
   * @param targetSize Target number of entries
   * @returns Number of entries evicted
   */
  evictLRU(targetSize: number): number {
    if (this.cache.size <= targetSize) return 0;

    const entriesToEvict = this.cache.size - targetSize;
    const lruEntries = this.getLRUEntries(entriesToEvict);

    lruEntries.forEach(({ key }) => this.cache.delete(key));

    return entriesToEvict;
  }

  /**
   * Reset cache statistics
   */
  resetStats(): void {
    this.hits = 0;
    this.misses = 0;
  }
}

/**
 * Singleton resource cache instance
 */
export const resourceCache = new ResourceCache();

/**
 * Start automatic cleanup interval
 * Cleans up expired entries every 5 minutes
 */
let cleanupInterval: NodeJS.Timeout | null = null;

export function startAutomaticCleanup(intervalMs: number = 5 * 60 * 1000): void {
  if (cleanupInterval) {
    clearInterval(cleanupInterval);
  }

  cleanupInterval = setInterval(() => {
    const removed = resourceCache.cleanup();
    if (removed > 0) {
      console.log(`[ResourceCache] Cleaned up ${removed} expired entries`);
    }
  }, intervalMs);
}

export function stopAutomaticCleanup(): void {
  if (cleanupInterval) {
    clearInterval(cleanupInterval);
    cleanupInterval = null;
  }
}

/**
 * Generate ETag for resource data
 * @deprecated Use generateStrongETag from conditional-request.ts instead
 * @param data Resource data
 * @returns ETag string
 */
export function generateETag(data: any): string {
  return generateStrongETag(data);
}
