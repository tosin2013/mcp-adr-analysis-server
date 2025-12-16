/**
 * Memory Expand Resource - Detailed view of a specific memory entity
 * URI Pattern: adr://memory/{key}
 */

import { URLSearchParams } from 'url';
import { McpAdrError } from '../types/index.js';
import { resourceCache, generateETag } from './resource-cache.js';
import { ResourceGenerationResult } from './index.js';
import { resourceRouter } from './resource-router.js';
import type { MemoryEntityManager } from '../utils/memory-entity-manager.js';

export interface MemoryExpandData {
  key: string;
  entity: {
    id: string;
    type: string;
    name: string;
    content: any;
    metadata: Record<string, any>;
    tags: string[];
    confidence: number;
    lastModified: string;
    created: string;
    accessCount: number;
  } | null;
  relationships: Array<{
    targetId: string;
    targetName: string;
    relationshipType: string;
    strength: number;
  }>;
  relatedEntities: Array<{
    id: string;
    name: string;
    type: string;
    relevance: number;
  }>;
  timestamp: string;
  found: boolean;
}

/**
 * Generate memory expand resource showing detailed entity information.
 *
 * Returns complete details about a specific memory entity including:
 * - Full entity content and metadata
 * - All relationships to other entities
 * - Related entities by relevance
 * - Access statistics
 *
 * **URI Pattern:** `adr://memory/{key}`
 *
 * **Query Parameters:**
 * - `includeRelated`: Include related entities (default: true)
 * - `relationshipDepth`: Depth of relationships to traverse (default: 2)
 * - `maxRelated`: Maximum related entities to return (default: 10)
 *
 * @param params - URL path parameters containing:
 *   - key: Memory entity key/ID
 * @param searchParams - URL query parameters for customization
 * @param memoryManager - Optional memory entity manager instance
 *
 * @returns Promise resolving to resource generation result containing:
 *   - data: Complete memory entity data with relationships
 *   - contentType: "application/json"
 *   - lastModified: ISO timestamp of generation
 *   - cacheKey: Unique identifier "memory-expand:{key}"
 *   - ttl: Cache duration (60 seconds / 1 minute)
 *   - etag: Entity tag for cache validation
 *
 * @throws {McpAdrError} When memory expansion fails
 *
 * @example
 * ```typescript
 * // Get expanded memory entity
 * const memory = await generateMemoryExpandResource(
 *   { key: 'adr-001' },
 *   new URLSearchParams()
 * );
 *
 * console.log(`Entity type: ${memory.data.entity?.type}`);
 * console.log(`Relationships: ${memory.data.relationships.length}`);
 *
 * // With custom depth
 * const deep = await generateMemoryExpandResource(
 *   { key: 'architecture-context' },
 *   new URLSearchParams('relationshipDepth=3&maxRelated=20')
 * );
 * ```
 *
 * @since v2.2.0
 * @see {@link MemoryEntityManager} for memory management
 */
export async function generateMemoryExpandResource(
  params: Record<string, string>,
  searchParams: URLSearchParams,
  memoryManager?: MemoryEntityManager
): Promise<ResourceGenerationResult> {
  const key = params['key'];

  if (!key) {
    throw new McpAdrError('Missing required parameter: key', 'INVALID_PARAMS');
  }

  const includeRelated = searchParams.get('includeRelated') !== 'false';
  const relationshipDepth = parseInt(searchParams.get('relationshipDepth') || '2', 10);
  const maxRelated = parseInt(searchParams.get('maxRelated') || '10', 10);

  const cacheKey = `memory-expand:${key}`;

  // Check cache
  const cached = await resourceCache.get<ResourceGenerationResult>(cacheKey);
  if (cached) {
    return cached;
  }

  try {
    // If no memory manager provided, return a not-found response
    if (!memoryManager) {
      const notFoundData: MemoryExpandData = {
        key,
        entity: null,
        relationships: [],
        relatedEntities: [],
        timestamp: new Date().toISOString(),
        found: false,
      };

      const result: ResourceGenerationResult = {
        data: notFoundData,
        contentType: 'application/json',
        lastModified: new Date().toISOString(),
        cacheKey,
        ttl: 30, // Short cache for not-found
        etag: generateETag(notFoundData),
      };

      return result;
    }

    // Try to get the entity from memory manager
    let entity = null;
    let relationships: MemoryExpandData['relationships'] = [];
    let relatedEntities: MemoryExpandData['relatedEntities'] = [];

    try {
      // Attempt to get entity by ID using queryEntities
      const queryResult = await memoryManager.queryEntities({
        textQuery: key,
        limit: 1,
      });

      const foundEntity = queryResult.entities?.[0];
      if (foundEntity) {
        entity = {
          id: foundEntity.id,
          type: foundEntity.type,
          name: foundEntity.title, // MemoryEntity uses 'title' not 'name'
          content: foundEntity.description, // MemoryEntity uses 'description' not 'content'
          metadata: foundEntity.context || {}, // MemoryEntity uses 'context' object
          tags: foundEntity.tags || [],
          confidence: foundEntity.confidence || 1.0,
          lastModified: foundEntity.lastModified || new Date().toISOString(),
          created: foundEntity.created || new Date().toISOString(),
          accessCount: foundEntity.accessPattern?.accessCount || 0, // Nested in accessPattern
        };

        // Get relationships if requested
        if (includeRelated) {
          try {
            const related = await memoryManager.findRelatedEntities(
              foundEntity.id,
              relationshipDepth
            );

            // Map relationshipPaths to our relationships format
            relationships =
              related.relationshipPaths
                ?.flatMap(
                  (path: any) =>
                    path.relationships?.map((rel: any) => ({
                      targetId: rel.targetId,
                      targetName: rel.targetId,
                      relationshipType: rel.type || 'related',
                      strength: rel.strength || 0.5,
                    })) || []
                )
                .slice(0, maxRelated) || [];

            relatedEntities =
              related.entities?.slice(0, maxRelated).map((ent: any) => ({
                id: ent.id,
                name: ent.title || ent.id, // MemoryEntity uses 'title' not 'name'
                type: ent.type,
                relevance: ent.relevance || 0.5, // Use relevance if available
              })) || [];
          } catch {
            // Relationships not available
          }
        }
      }
    } catch {
      // Entity not found
    }

    const expandData: MemoryExpandData = {
      key,
      entity,
      relationships,
      relatedEntities: relatedEntities.slice(0, maxRelated),
      timestamp: new Date().toISOString(),
      found: entity !== null,
    };

    const result: ResourceGenerationResult = {
      data: expandData,
      contentType: 'application/json',
      lastModified: new Date().toISOString(),
      cacheKey,
      ttl: 60, // 1 minute cache
      etag: generateETag(expandData),
    };

    // Cache result
    resourceCache.set(cacheKey, result, result.ttl);

    return result;
  } catch (error) {
    throw new McpAdrError(
      `Failed to expand memory entity: ${error instanceof Error ? error.message : String(error)}`,
      'RESOURCE_GENERATION_ERROR'
    );
  }
}

// Register route
resourceRouter.register(
  '/memory/{key}',
  generateMemoryExpandResource,
  'Detailed view of a specific memory entity'
);
