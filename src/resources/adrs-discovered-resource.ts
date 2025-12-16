/**
 * ADRs Discovered Resource - ADR discovery and summary
 * URI Pattern: adr://adrs/discovered
 */

import { URLSearchParams } from 'url';
import * as path from 'path';
import { McpAdrError } from '../types/index.js';
import { resourceCache, generateETag } from './resource-cache.js';
import { ResourceGenerationResult } from './index.js';
import { resourceRouter } from './resource-router.js';

export interface AdrsDiscoveredData {
  directory: string;
  totalAdrs: number;
  adrs: Array<{
    filename: string;
    title: string;
    status: string;
    date?: string;
    path: string;
    number?: string;
    category?: string;
    tags?: string[];
  }>;
  summary: {
    byStatus: Record<string, number>;
    byCategory: Record<string, number>;
  };
  recommendations: string[];
  timestamp: string;
}

/**
 * Generate ADRs discovered resource with discovery results and summary.
 *
 * Discovers and catalogs all Architectural Decision Records (ADRs) in a project:
 * - Scans configured ADR directory for decision records
 * - Extracts metadata (title, status, date, category)
 * - Generates summary statistics by status and category
 * - Provides recommendations for ADR management
 *
 * **URI Pattern:** `adr://adrs/discovered`
 *
 * **Query Parameters:**
 * - `projectPath`: Override project root path (default: process.cwd())
 * - `adrDirectory`: Override ADR directory (default: docs/adrs)
 * - `includeContent`: Include full ADR content (default: false)
 * - `includeTimeline`: Include timeline analysis (default: false)
 *
 * @param params - URL path parameters (none for this resource)
 * @param searchParams - URL query parameters for customization
 *
 * @returns Promise resolving to resource generation result containing:
 *   - data: ADR discovery results with summaries
 *   - contentType: "application/json"
 *   - lastModified: ISO timestamp of generation
 *   - cacheKey: Unique identifier "adrs-discovered" or "adrs-discovered:{projectPath}"
 *   - ttl: Cache duration (120 seconds / 2 minutes)
 *   - etag: Entity tag for cache validation
 *
 * @throws {McpAdrError} When:
 *   - RESOURCE_NOT_FOUND: ADR directory not found or inaccessible
 *   - RESOURCE_GENERATION_ERROR: ADR discovery or parsing fails
 *
 * @example
 * ```typescript
 * // Discover ADRs in default location
 * const discovered = await generateAdrsDiscoveredResource(
 *   {},
 *   new URLSearchParams()
 * );
 *
 * console.log(`Found ${discovered.data.totalAdrs} ADRs`);
 * console.log(`Accepted: ${discovered.data.summary.byStatus.accepted}`);
 * console.log(`Proposed: ${discovered.data.summary.byStatus.proposed}`);
 *
 * // Discover ADRs in custom location
 * const custom = await generateAdrsDiscoveredResource(
 *   {},
 *   new URLSearchParams('projectPath=/custom/path&adrDirectory=decisions')
 * );
 *
 * // Expected output structure:
 * {
 *   data: {
 *     directory: "/project/docs/adrs",
 *     totalAdrs: 25,
 *     adrs: [
 *       {
 *         filename: "001-use-postgresql.md",
 *         title: "Use PostgreSQL for primary database",
 *         status: "accepted",
 *         date: "2025-01-15",
 *         path: "/project/docs/adrs/001-use-postgresql.md",
 *         number: "001",
 *         category: "database",
 *         tags: ["postgresql", "database"]
 *       },
 *       ...
 *     ],
 *     summary: {
 *       byStatus: {
 *         accepted: 20,
 *         proposed: 3,
 *         deprecated: 2
 *       },
 *       byCategory: {
 *         database: 5,
 *         api: 8,
 *         infrastructure: 7,
 *         security: 5
 *       }
 *     },
 *     recommendations: [
 *       "Consider reviewing deprecated ADRs",
 *       "3 proposed ADRs need decisions"
 *     ],
 *     timestamp: "2025-12-16T04:30:00.000Z"
 *   },
 *   contentType: "application/json",
 *   cacheKey: "adrs-discovered",
 *   ttl: 120
 * }
 * ```
 *
 * @since v2.2.0
 * @see {@link discoverAdrsInDirectory} for ADR discovery logic
 */
export async function generateAdrsDiscoveredResource(
  params: Record<string, string>,
  searchParams: URLSearchParams
): Promise<ResourceGenerationResult> {
  const projectPath = searchParams.get('projectPath') || process.cwd();
  const adrDirectoryParam = searchParams.get('adrDirectory') || process.env['ADR_DIRECTORY'] || 'docs/adrs';
  const includeContent = searchParams.get('includeContent') === 'true';
  const includeTimeline = searchParams.get('includeTimeline') === 'true';

  const cacheKey = projectPath === process.cwd() ? 'adrs-discovered' : `adrs-discovered:${projectPath}`;

  // Check cache
  const cached = await resourceCache.get<ResourceGenerationResult>(cacheKey);
  if (cached) {
    return cached;
  }

  try {
    // Dynamically import ADR discovery to avoid circular dependencies
    const { discoverAdrsInDirectory } = await import('../utils/adr-discovery.js');

    // Resolve ADR directory
    const adrDirectory = path.resolve(projectPath, adrDirectoryParam);

    // Discover ADRs
    const discoveryResult = await discoverAdrsInDirectory(adrDirectory, projectPath, {
      includeContent,
      includeTimeline,
    });

    // Format ADR list (exclude content for lighter response)
    const adrs = discoveryResult.adrs.map(adr => ({
      filename: adr.filename,
      title: adr.title,
      status: adr.status,
      date: adr.date,
      path: adr.path,
      number: adr.metadata?.number,
      category: adr.metadata?.category,
      tags: adr.metadata?.tags,
    }));

    const discoveredData: AdrsDiscoveredData = {
      directory: discoveryResult.directory,
      totalAdrs: discoveryResult.totalAdrs,
      adrs,
      summary: discoveryResult.summary,
      recommendations: discoveryResult.recommendations,
      timestamp: new Date().toISOString(),
    };

    const result: ResourceGenerationResult = {
      data: discoveredData,
      contentType: 'application/json',
      lastModified: new Date().toISOString(),
      cacheKey,
      ttl: 120, // 2 minutes cache (ADRs change occasionally)
      etag: generateETag(discoveredData),
    };

    // Cache result
    resourceCache.set(cacheKey, result, result.ttl);

    return result;
  } catch (error) {
    // Check if it's a directory not found error
    if (error instanceof Error && error.message.includes('not found')) {
      throw new McpAdrError(
        `ADR directory not found: ${adrDirectoryParam}`,
        'RESOURCE_NOT_FOUND'
      );
    }

    throw new McpAdrError(
      `Failed to discover ADRs: ${error instanceof Error ? error.message : String(error)}`,
      'RESOURCE_GENERATION_ERROR'
    );
  }
}

// Register route
resourceRouter.register('/adrs/discovered', generateAdrsDiscoveredResource, 'Discovered ADRs with summary');
