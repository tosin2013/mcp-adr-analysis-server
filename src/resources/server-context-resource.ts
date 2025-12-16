/**
 * Server Context Resource - Current server state and capabilities
 * URI Pattern: adr://server/context
 */

import { URLSearchParams } from 'url';
import { McpAdrError } from '../types/index.js';
import { resourceCache, generateETag } from './resource-cache.js';
import { ResourceGenerationResult } from './index.js';
import { resourceRouter } from './resource-router.js';
import type { KnowledgeGraphManager } from '../utils/knowledge-graph-manager.js';
import type { MemoryEntityManager } from '../utils/memory-entity-manager.js';
import type { ConversationMemoryManager } from '../utils/conversation-memory-manager.js';

export interface ServerContextData {
  context: string;
  timestamp: string;
  projectPath: string;
  includeDetailed: boolean;
  maxRecentItems: number;
}

/**
 * Generate server context resource showing current state, memory, and capabilities.
 *
 * Returns a comprehensive markdown-formatted context that includes:
 * - Server configuration and status
 * - Validated deployment patterns
 * - MCP resources catalog
 * - Memory and knowledge graph status
 * - Recent deployment activity
 * - Usage recommendations
 *
 * **URI Pattern:** `adr://server/context`
 *
 * **Query Parameters:**
 * - `includeDetailed`: Include detailed information (default: true)
 * - `maxRecentItems`: Maximum number of recent items to show (default: 5)
 * - `projectPath`: Override project root path (default: process.cwd())
 *
 * @param params - URL path parameters (none for this resource)
 * @param searchParams - URL query parameters for customization
 *
 * @returns Promise resolving to resource generation result containing:
 *   - data: Server context data with markdown content
 *   - contentType: "application/json"
 *   - lastModified: ISO timestamp of generation
 *   - cacheKey: Unique identifier "server-context"
 *   - ttl: Cache duration (60 seconds / 1 minute)
 *   - etag: Entity tag for cache validation
 *
 * @throws {McpAdrError} When context generation fails
 *
 * @example
 * ```typescript
 * // Get server context with defaults
 * const context = await generateServerContextResource(
 *   {},
 *   new URLSearchParams()
 * );
 *
 * console.log(context.data.context); // Markdown-formatted context
 *
 * // Get abbreviated context
 * const brief = await generateServerContextResource(
 *   {},
 *   new URLSearchParams('includeDetailed=false&maxRecentItems=3')
 * );
 * ```
 *
 * @since v2.2.0
 * @see {@link ServerContextGenerator} for context generation logic
 */
export async function generateServerContextResource(
  _params: Record<string, string>,
  searchParams: URLSearchParams,
  kgManager?: KnowledgeGraphManager,
  memoryManager?: MemoryEntityManager,
  conversationManager?: ConversationMemoryManager
): Promise<ResourceGenerationResult> {
  const cacheKey = 'server-context';

  // Check cache
  const cached = await resourceCache.get<ResourceGenerationResult>(cacheKey);
  if (cached) {
    return cached;
  }

  try {
    const includeDetailed = searchParams.get('includeDetailed') !== 'false';
    const maxRecentItems = parseInt(searchParams.get('maxRecentItems') || '5', 10);
    const projectPath = searchParams.get('projectPath') || process.cwd();

    // If managers are not provided, we'll generate basic context
    // In practice, these should be injected from the MCP server
    if (!kgManager || !memoryManager || !conversationManager) {
      throw new McpAdrError(
        'Server context requires initialized managers. Access this resource through the MCP server.',
        'RESOURCE_GENERATION_ERROR'
      );
    }

    // Generate context using ServerContextGenerator
    const { ServerContextGenerator: Generator } = await import(
      '../utils/server-context-generator.js'
    );
    const generator = new Generator();
    const contextContent = await generator.generateContext(
      kgManager,
      memoryManager,
      conversationManager,
      { includeDetailed, maxRecentItems }
    );

    const contextData: ServerContextData = {
      context: contextContent,
      timestamp: new Date().toISOString(),
      projectPath,
      includeDetailed,
      maxRecentItems,
    };

    const result: ResourceGenerationResult = {
      data: contextData,
      contentType: 'application/json',
      lastModified: new Date().toISOString(),
      cacheKey,
      ttl: 60, // 1 minute cache (context changes frequently)
      etag: generateETag(contextData),
    };

    // Cache result
    resourceCache.set(cacheKey, result, result.ttl);

    return result;
  } catch (error) {
    throw new McpAdrError(
      `Failed to generate server context: ${error instanceof Error ? error.message : String(error)}`,
      'RESOURCE_GENERATION_ERROR'
    );
  }
}

// Register route
resourceRouter.register(
  '/server/context',
  generateServerContextResource,
  'Current server state and capabilities'
);
