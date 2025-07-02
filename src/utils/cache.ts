/**
 * Caching system for MCP resources and expensive operations
 * Implements file-based caching with TTL and invalidation
 */

import { promises as fs } from 'fs';
import { join } from 'path';
import { McpAdrError, CacheEntry } from '../types/index.js';

const CACHE_DIR = '.mcp-adr-cache';

export interface CacheOptions {
  ttl?: number; // Time to live in seconds
  invalidateOnChange?: boolean; // Invalidate when source files change
  compression?: boolean; // Compress cached data
}

/**
 * Initialize cache directory
 */
export async function initializeCache(): Promise<void> {
  try {
    await fs.mkdir(CACHE_DIR, { recursive: true });

    // Create cache metadata file
    const metadataPath = join(CACHE_DIR, 'metadata.json');
    try {
      await fs.access(metadataPath);
    } catch {
      const metadata = {
        version: '1.0.0',
        created: new Date().toISOString(),
        lastCleanup: new Date().toISOString(),
      };
      await fs.writeFile(metadataPath, JSON.stringify(metadata, null, 2));
    }
  } catch (error) {
    throw new McpAdrError(
      `Failed to initialize cache: ${error instanceof Error ? error.message : String(error)}`,
      'CACHE_ERROR'
    );
  }
}

/**
 * Generate cache file path from key
 */
function getCacheFilePath(key: string): string {
  // Create safe filename from cache key
  const safeKey = key.replace(/[^a-zA-Z0-9-_]/g, '_');
  return join(CACHE_DIR, `${safeKey}.json`);
}

/**
 * Store data in cache
 */
export async function setCache<T>(key: string, data: T, options: CacheOptions = {}): Promise<void> {
  try {
    await initializeCache();

    const cacheEntry: CacheEntry<T> = {
      key,
      data,
      timestamp: new Date().toISOString(),
      ttl: options.ttl || 3600, // Default 1 hour
      metadata: {
        version: '1.0.0',
        compressed: options.compression || false,
      },
    };

    const filePath = getCacheFilePath(key);
    await fs.writeFile(filePath, JSON.stringify(cacheEntry, null, 2));
  } catch (error) {
    throw new McpAdrError(
      `Failed to set cache: ${error instanceof Error ? error.message : String(error)}`,
      'CACHE_ERROR'
    );
  }
}

/**
 * Retrieve data from cache
 */
export async function getCache<T>(key: string): Promise<T | null> {
  try {
    const filePath = getCacheFilePath(key);

    try {
      const content = await fs.readFile(filePath, 'utf-8');
      const cacheEntry: CacheEntry<T> = JSON.parse(content);

      // Check if cache entry is expired
      const now = new Date();
      const cacheTime = new Date(cacheEntry.timestamp);
      const ageInSeconds = (now.getTime() - cacheTime.getTime()) / 1000;

      if (ageInSeconds > cacheEntry.ttl) {
        // Cache expired, remove it
        await fs.unlink(filePath);
        return null;
      }

      return cacheEntry.data;
    } catch (error) {
      // Cache file doesn't exist or is corrupted
      return null;
    }
  } catch (error) {
    throw new McpAdrError(
      `Failed to get cache: ${error instanceof Error ? error.message : String(error)}`,
      'CACHE_ERROR'
    );
  }
}

/**
 * Check if cache entry exists and is valid
 */
export async function hasValidCache(key: string): Promise<boolean> {
  try {
    const data = await getCache(key);
    return data !== null;
  } catch {
    return false;
  }
}

/**
 * Invalidate specific cache entry
 */
export async function invalidateCache(key: string): Promise<void> {
  try {
    const filePath = getCacheFilePath(key);
    await fs.unlink(filePath);
  } catch {
    // File doesn't exist, which is fine
  }
}

/**
 * Clear all cache entries
 */
export async function clearCache(): Promise<void> {
  try {
    const files = await fs.readdir(CACHE_DIR);

    for (const file of files) {
      if (file.endsWith('.json') && file !== 'metadata.json') {
        await fs.unlink(join(CACHE_DIR, file));
      }
    }
  } catch (error) {
    throw new McpAdrError(
      `Failed to clear cache: ${error instanceof Error ? error.message : String(error)}`,
      'CACHE_ERROR'
    );
  }
}

/**
 * Get cache statistics
 */
export async function getCacheStats(): Promise<{
  totalEntries: number;
  totalSize: number;
  oldestEntry: string | null;
  newestEntry: string | null;
}> {
  try {
    await initializeCache();

    const files = await fs.readdir(CACHE_DIR);
    const cacheFiles = files.filter(f => f.endsWith('.json') && f !== 'metadata.json');

    let totalSize = 0;
    let oldestTime = Infinity;
    let newestTime = 0;
    let oldestEntry: string | null = null;
    let newestEntry: string | null = null;

    for (const file of cacheFiles) {
      const filePath = join(CACHE_DIR, file);
      const stats = await fs.stat(filePath);
      totalSize += stats.size;

      const content = await fs.readFile(filePath, 'utf-8');
      const cacheEntry = JSON.parse(content);
      const entryTime = new Date(cacheEntry.timestamp).getTime();

      if (entryTime < oldestTime) {
        oldestTime = entryTime;
        oldestEntry = cacheEntry.key;
      }

      if (entryTime > newestTime) {
        newestTime = entryTime;
        newestEntry = cacheEntry.key;
      }
    }

    return {
      totalEntries: cacheFiles.length,
      totalSize,
      oldestEntry,
      newestEntry,
    };
  } catch (error) {
    throw new McpAdrError(
      `Failed to get cache stats: ${error instanceof Error ? error.message : String(error)}`,
      'CACHE_ERROR'
    );
  }
}

/**
 * Cleanup expired cache entries
 */
export async function cleanupCache(): Promise<number> {
  try {
    await initializeCache();

    const files = await fs.readdir(CACHE_DIR);
    const cacheFiles = files.filter(f => f.endsWith('.json') && f !== 'metadata.json');

    let cleanedCount = 0;
    const now = new Date();

    for (const file of cacheFiles) {
      const filePath = join(CACHE_DIR, file);

      try {
        const content = await fs.readFile(filePath, 'utf-8');
        const cacheEntry = JSON.parse(content);

        const cacheTime = new Date(cacheEntry.timestamp);
        const ageInSeconds = (now.getTime() - cacheTime.getTime()) / 1000;

        if (ageInSeconds > cacheEntry.ttl) {
          await fs.unlink(filePath);
          cleanedCount++;
        }
      } catch {
        // Corrupted cache file, remove it
        await fs.unlink(filePath);
        cleanedCount++;
      }
    }

    // Update metadata
    const metadataPath = join(CACHE_DIR, 'metadata.json');
    try {
      const metadata = JSON.parse(await fs.readFile(metadataPath, 'utf-8'));
      metadata.lastCleanup = now.toISOString();
      await fs.writeFile(metadataPath, JSON.stringify(metadata, null, 2));
    } catch {
      // Metadata file corrupted, recreate it
      const metadata = {
        version: '1.0.0',
        created: now.toISOString(),
        lastCleanup: now.toISOString(),
      };
      await fs.writeFile(metadataPath, JSON.stringify(metadata, null, 2));
    }

    return cleanedCount;
  } catch (error) {
    throw new McpAdrError(
      `Failed to cleanup cache: ${error instanceof Error ? error.message : String(error)}`,
      'CACHE_ERROR'
    );
  }
}

/**
 * Get or set cache with automatic management
 */
export async function getCachedOrGenerate<T>(
  key: string,
  generator: () => Promise<T>,
  options: CacheOptions = {}
): Promise<T> {
  try {
    // Try to get from cache first
    const cached = await getCache<T>(key);
    if (cached !== null) {
      return cached;
    }

    // Generate new data
    const data = await generator();

    // Store in cache
    await setCache(key, data, options);

    return data;
  } catch (error) {
    throw new McpAdrError(
      `Failed to get cached or generate: ${error instanceof Error ? error.message : String(error)}`,
      'CACHE_ERROR'
    );
  }
}
