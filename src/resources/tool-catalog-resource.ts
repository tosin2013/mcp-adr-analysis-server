/**
 * Tool Catalog Resource - Comprehensive tool metadata registry
 * URI Pattern: adr://tools/catalog
 */

import { URLSearchParams } from 'url';
import { McpAdrError } from '../types/index.js';
import { resourceCache, generateETag } from './resource-cache.js';
import { ResourceGenerationResult } from './index.js';
import { resourceRouter } from './resource-router.js';

export interface ToolCatalogData {
  summary: {
    totalTools: number;
    byCategory: Record<string, number>;
    cemcpEnabled: number;
    highTokenCost: number;
  };
  tools: Array<{
    name: string;
    description: string;
    category: string;
    complexity: string;
    tokenCost: { min: number; max: number };
    hasCEMCPDirective: boolean;
    requiresAI: boolean;
    relatedTools: string[];
    keywords: string[];
  }>;
  timestamp: string;
}

/**
 * Generate tool catalog resource with comprehensive tool metadata.
 *
 * Returns a complete catalog of all available MCP tools with:
 * - Tool metadata (name, description, category, complexity)
 * - Token cost estimates and CE-MCP availability
 * - Related tools and keyword tags
 * - Summary statistics by category
 *
 * **URI Pattern:** `adr://tools/catalog`
 *
 * **Query Parameters:**
 * - `category`: Filter by tool category (optional)
 * - `includeSchema`: Include full input schemas (default: false)
 * - `lightweight`: Return minimal metadata only (default: false)
 *
 * @param params - URL path parameters (none for this resource)
 * @param searchParams - URL query parameters for filtering
 *
 * @returns Promise resolving to resource generation result containing:
 *   - data: Complete tool catalog with metadata
 *   - contentType: "application/json"
 *   - lastModified: ISO timestamp of generation
 *   - cacheKey: Unique identifier "tool-catalog" or "tool-catalog:{category}"
 *   - ttl: Cache duration (300 seconds / 5 minutes)
 *   - etag: Entity tag for cache validation
 *
 * @throws {McpAdrError} When catalog generation fails
 *
 * @example
 * ```typescript
 * // Get full tool catalog
 * const catalog = await generateToolCatalogResource(
 *   {},
 *   new URLSearchParams()
 * );
 *
 * console.log(`Total tools: ${catalog.data.summary.totalTools}`);
 * console.log(`CE-MCP enabled: ${catalog.data.summary.cemcpEnabled}`);
 *
 * // Filter by category
 * const adrTools = await generateToolCatalogResource(
 *   {},
 *   new URLSearchParams('category=adr')
 * );
 *
 * // Get lightweight catalog (minimal metadata)
 * const lightweight = await generateToolCatalogResource(
 *   {},
 *   new URLSearchParams('lightweight=true')
 * );
 *
 * // Expected output structure:
 * {
 *   data: {
 *     summary: {
 *       totalTools: 60,
 *       byCategory: {
 *         analysis: 10,
 *         adr: 15,
 *         deployment: 8,
 *         ...
 *       },
 *       cemcpEnabled: 25,
 *       highTokenCost: 12
 *     },
 *     tools: [
 *       {
 *         name: "analyze_project_ecosystem",
 *         description: "Comprehensive project analysis...",
 *         category: "analysis",
 *         complexity: "complex",
 *         tokenCost: { min: 5000, max: 15000 },
 *         hasCEMCPDirective: true,
 *         requiresAI: true,
 *         relatedTools: ["get_architectural_context"],
 *         keywords: ["analysis", "ecosystem", "project"]
 *       },
 *       ...
 *     ],
 *     timestamp: "2025-12-16T04:30:00.000Z"
 *   },
 *   contentType: "application/json",
 *   cacheKey: "tool-catalog",
 *   ttl: 300
 * }
 * ```
 *
 * @since v2.2.0
 * @see {@link TOOL_CATALOG} for the underlying tool registry
 */
export async function generateToolCatalogResource(
  _params: Record<string, string>,
  searchParams: URLSearchParams
): Promise<ResourceGenerationResult> {
  const category = searchParams.get('category');
  const includeSchema = searchParams.get('includeSchema') === 'true';
  const lightweight = searchParams.get('lightweight') === 'true';

  const cacheKey = category ? `tool-catalog:${category}` : 'tool-catalog';

  // Check cache
  const cached = await resourceCache.get<ResourceGenerationResult>(cacheKey);
  if (cached) {
    return cached;
  }

  try {
    // Dynamically import the tool catalog to avoid circular dependencies
    const { getCatalogSummary, searchTools } = await import('../tools/tool-catalog.js');

    // Get summary statistics
    const summary = getCatalogSummary();

    // Get tools (filtered by category if specified)
    const searchResult = category
      ? searchTools({ category: category as any, includeSchema, limit: 1000 })
      : searchTools({ includeSchema, limit: 1000 });

    // Format tools based on lightweight flag
    const tools = searchResult.tools.map(tool => {
      if (lightweight) {
        return {
          name: tool.name,
          description: tool.shortDescription,
          category: tool.category,
          hasCEMCPDirective: tool.hasCEMCPDirective,
        };
      }

      const formatted: any = {
        name: tool.name,
        description: tool.fullDescription,
        category: tool.category,
        complexity: tool.complexity,
        tokenCost: tool.tokenCost,
        hasCEMCPDirective: tool.hasCEMCPDirective,
        requiresAI: tool.requiresAI,
        relatedTools: tool.relatedTools,
        keywords: tool.keywords,
      };

      if (includeSchema) {
        formatted.inputSchema = tool.inputSchema;
      }

      return formatted;
    });

    const catalogData: ToolCatalogData = {
      summary,
      tools,
      timestamp: new Date().toISOString(),
    };

    const result: ResourceGenerationResult = {
      data: catalogData,
      contentType: 'application/json',
      lastModified: new Date().toISOString(),
      cacheKey,
      ttl: 300, // 5 minutes cache (catalog is relatively static)
      etag: generateETag(catalogData),
    };

    // Cache result
    resourceCache.set(cacheKey, result, result.ttl);

    return result;
  } catch (error) {
    throw new McpAdrError(
      `Failed to generate tool catalog: ${error instanceof Error ? error.message : String(error)}`,
      'RESOURCE_GENERATION_ERROR'
    );
  }
}

// Register route
resourceRouter.register('/tools/catalog', generateToolCatalogResource, 'Comprehensive tool metadata registry');
