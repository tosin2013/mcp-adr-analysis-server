/**
 * Conversation Snapshot Resource - Current conversation context
 * URI Pattern: adr://conversation/snapshot
 */

import { URLSearchParams } from 'url';
import { McpAdrError } from '../types/index.js';
import { resourceCache, generateETag } from './resource-cache.js';
import { ResourceGenerationResult } from './index.js';
import { resourceRouter } from './resource-router.js';
import type { ConversationMemoryManager } from '../utils/conversation-memory-manager.js';
import type { ConversationContextSnapshot } from '../types/conversation-memory.js';

export interface ConversationSnapshotData {
  snapshot: ConversationContextSnapshot | null;
  timestamp: string;
  recentTurnCount: number;
}

/**
 * Generate conversation snapshot resource showing current session context.
 *
 * Returns a snapshot of the active conversation session including:
 * - Recent conversation turns
 * - Active knowledge graph intents
 * - Recorded architectural decisions
 * - Current conversation focus and next steps
 *
 * **URI Pattern:** `adr://conversation/snapshot`
 *
 * **Query Parameters:**
 * - `recentTurnCount`: Number of recent turns to include (default: 5)
 *
 * @param params - URL path parameters (none for this resource)
 * @param searchParams - URL query parameters for customization
 * @param memoryManager - ConversationMemoryManager instance (injected by MCP server)
 *
 * @returns Promise resolving to resource generation result containing:
 *   - data: Conversation snapshot with session context (null if no active session)
 *   - contentType: "application/json"
 *   - lastModified: ISO timestamp of generation
 *   - cacheKey: Unique identifier "conversation-snapshot"
 *   - ttl: Cache duration (10 seconds)
 *   - etag: Entity tag for cache validation
 *
 * @throws {McpAdrError} When:
 *   - RESOURCE_GENERATION_ERROR: Memory manager not provided or snapshot retrieval fails
 *
 * @example
 * ```typescript
 * // Get conversation snapshot with default settings
 * const snapshot = await generateConversationSnapshotResource(
 *   {},
 *   new URLSearchParams(),
 *   memoryManager
 * );
 *
 * if (snapshot.data.snapshot) {
 *   console.log(`Session: ${snapshot.data.snapshot.sessionId}`);
 *   console.log(`Recent turns: ${snapshot.data.snapshot.recentTurns.length}`);
 *   console.log(`Active intents: ${snapshot.data.snapshot.activeIntents.length}`);
 * }
 *
 * // Get snapshot with more recent turns
 * const detailed = await generateConversationSnapshotResource(
 *   {},
 *   new URLSearchParams('recentTurnCount=10'),
 *   memoryManager
 * );
 *
 * // Expected output structure:
 * {
 *   data: {
 *     snapshot: {
 *       sessionId: "session-123",
 *       recentTurns: [...],
 *       activeIntents: [...],
 *       decisionsRecorded: [...],
 *       conversationFocus: {
 *         topic: "Database architecture",
 *         phase: "Decision making",
 *         nextSteps: ["Review options", "Make decision"]
 *       }
 *     },
 *     timestamp: "2025-12-16T04:30:00.000Z",
 *     recentTurnCount: 5
 *   },
 *   contentType: "application/json",
 *   cacheKey: "conversation-snapshot",
 *   ttl: 10
 * }
 * ```
 *
 * @since v2.2.0
 * @see {@link ConversationMemoryManager.getContextSnapshot} for snapshot generation logic
 */
export async function generateConversationSnapshotResource(
  params: Record<string, string>,
  searchParams: URLSearchParams,
  memoryManager?: ConversationMemoryManager
): Promise<ResourceGenerationResult> {
  const cacheKey = 'conversation-snapshot';

  // Check cache
  const cached = await resourceCache.get<ResourceGenerationResult>(cacheKey);
  if (cached) {
    return cached;
  }

  try {
    if (!memoryManager) {
      throw new McpAdrError(
        'Conversation snapshot requires initialized memory manager. Access this resource through the MCP server.',
        'RESOURCE_GENERATION_ERROR'
      );
    }

    const recentTurnCount = parseInt(searchParams.get('recentTurnCount') || '5', 10);

    // Get snapshot from memory manager
    const snapshot = await memoryManager.getContextSnapshot(recentTurnCount);

    const snapshotData: ConversationSnapshotData = {
      snapshot,
      timestamp: new Date().toISOString(),
      recentTurnCount,
    };

    const result: ResourceGenerationResult = {
      data: snapshotData,
      contentType: 'application/json',
      lastModified: new Date().toISOString(),
      cacheKey,
      ttl: 10, // 10 seconds cache (conversation context changes very frequently)
      etag: generateETag(snapshotData),
    };

    // Cache result
    resourceCache.set(cacheKey, result, result.ttl);

    return result;
  } catch (error) {
    throw new McpAdrError(
      `Failed to generate conversation snapshot: ${error instanceof Error ? error.message : String(error)}`,
      'RESOURCE_GENERATION_ERROR'
    );
  }
}

// Register route
resourceRouter.register(
  '/conversation/snapshot',
  generateConversationSnapshotResource,
  'Current conversation context snapshot'
);
