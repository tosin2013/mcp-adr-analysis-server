/**
 * Memory Stats Resource - Conversation memory statistics
 * URI Pattern: adr://memory/stats
 */

import { URLSearchParams } from 'url';
import { McpAdrError } from '../types/index.js';
import { resourceCache, generateETag } from './resource-cache.js';
import { ResourceGenerationResult } from './index.js';
import { resourceRouter } from './resource-router.js';
import type { ConversationMemoryManager } from '../utils/conversation-memory-manager.js';
import type { ConversationMemoryStats } from '../types/conversation-memory.js';

export interface MemoryStatsData extends ConversationMemoryStats {
  timestamp: string;
  storageSizeKB: number;
}

/**
 * Generate memory statistics resource showing conversation memory metrics.
 *
 * Returns comprehensive statistics about stored conversation memory:
 * - Total and active session counts
 * - Turn counts and averages
 * - Expandable content tracking
 * - Storage size metrics
 *
 * **URI Pattern:** `adr://memory/stats`
 *
 * **Query Parameters:** (none)
 *
 * @param params - URL path parameters (none for this resource)
 * @param searchParams - URL query parameters (none used)
 * @param memoryManager - ConversationMemoryManager instance (injected by MCP server)
 *
 * @returns Promise resolving to resource generation result containing:
 *   - data: Memory statistics with all metrics
 *   - contentType: "application/json"
 *   - lastModified: ISO timestamp of generation
 *   - cacheKey: Unique identifier "memory-stats"
 *   - ttl: Cache duration (30 seconds)
 *   - etag: Entity tag for cache validation
 *
 * @throws {McpAdrError} When:
 *   - RESOURCE_GENERATION_ERROR: Memory manager not provided or stats retrieval fails
 *
 * @example
 * ```typescript
 * // Get memory statistics
 * const stats = await generateMemoryStatsResource(
 *   {},
 *   new URLSearchParams(),
 *   memoryManager
 * );
 *
 * console.log(`Total Sessions: ${stats.data.totalSessions}`);
 * console.log(`Active Sessions: ${stats.data.activeSessions}`);
 * console.log(`Storage Size: ${stats.data.storageSizeKB} KB`);
 *
 * // Expected output structure:
 * {
 *   data: {
 *     totalSessions: 15,
 *     activeSessions: 3,
 *     archivedSessions: 12,
 *     totalTurns: 147,
 *     totalExpandableContent: 28,
 *     avgTurnsPerSession: 9.8,
 *     totalStorageBytes: 524288,
 *     storageSizeKB: 512,
 *     timestamp: "2025-12-16T04:30:00.000Z"
 *   },
 *   contentType: "application/json",
 *   cacheKey: "memory-stats",
 *   ttl: 30
 * }
 * ```
 *
 * @since v2.2.0
 * @see {@link ConversationMemoryManager.getStats} for stats calculation logic
 */
export async function generateMemoryStatsResource(
  _params: Record<string, string>,
  _searchParams: URLSearchParams,
  memoryManager?: ConversationMemoryManager
): Promise<ResourceGenerationResult> {
  const cacheKey = 'memory-stats';

  // Check cache
  const cached = await resourceCache.get<ResourceGenerationResult>(cacheKey);
  if (cached) {
    return cached;
  }

  try {
    if (!memoryManager) {
      throw new McpAdrError(
        'Memory stats require initialized memory manager. Access this resource through the MCP server.',
        'RESOURCE_GENERATION_ERROR'
      );
    }

    // Get stats from memory manager
    const stats = await memoryManager.getStats();

    // Enrich with computed values
    const statsData: MemoryStatsData = {
      ...stats,
      timestamp: new Date().toISOString(),
      storageSizeKB: parseFloat((stats.totalStorageBytes / 1024).toFixed(2)),
    };

    const result: ResourceGenerationResult = {
      data: statsData,
      contentType: 'application/json',
      lastModified: new Date().toISOString(),
      cacheKey,
      ttl: 30, // 30 seconds cache (stats change moderately frequently)
      etag: generateETag(statsData),
    };

    // Cache result
    resourceCache.set(cacheKey, result, result.ttl);

    return result;
  } catch (error) {
    throw new McpAdrError(
      `Failed to generate memory stats: ${error instanceof Error ? error.message : String(error)}`,
      'RESOURCE_GENERATION_ERROR'
    );
  }
}

// Register route
resourceRouter.register('/memory/stats', generateMemoryStatsResource, 'Conversation memory statistics');
