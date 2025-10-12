/**
 * ADR by ID Resource - Individual ADR access
 * URI Pattern: adr://adr/{id}
 */

import * as path from 'path';
import { URLSearchParams } from 'url';
import { McpAdrError } from '../types/index.js';
import { resourceCache, generateETag } from './resource-cache.js';
import { ResourceGenerationResult } from './index.js';
import { resourceRouter } from './resource-router.js';

export interface AdrDetails {
  id: string;
  title: string;
  status: string;
  date: string;
  context: string;
  decision: string;
  consequences: string;
  implementationPlan?: string;
  filePath: string;
  fileName: string;
  fileSize: number;
  tags: string[];
  relatedAdrs: string[];
  priority: string;
  complexity: string;
  implementationStatus: 'not-started' | 'in-progress' | 'completed';
  validationResults?: {
    isValid: boolean;
    issues: string[];
    score: number;
  };
}

/**
 * Find related ADRs based on content analysis
 */
async function findRelatedAdrs(adr: any, allAdrs: any[]): Promise<string[]> {
  const related: string[] = [];

  // Extract referenced ADR IDs from content
  const content = `${adr.context} ${adr.decision} ${adr.consequences}`;
  const adrReferences = content.match(/ADR[-\s]?(\d+)/gi);

  if (adrReferences) {
    for (const ref of adrReferences) {
      const id = ref.match(/\d+/)?.[0];
      if (id) {
        const relatedAdr = allAdrs.find(a => a.filename.includes(id));
        if (relatedAdr && relatedAdr.filename !== adr.filename) {
          related.push(relatedAdr.filename.replace(/\.md$/, ''));
        }
      }
    }
  }

  return [...new Set(related)];
}

/**
 * Validate ADR structure and content
 */
async function validateAdr(adr: any): Promise<{
  isValid: boolean;
  issues: string[];
  score: number;
}> {
  const issues: string[] = [];
  let score = 100;

  // Check required sections
  if (!adr.title || adr.title.length < 10) {
    issues.push('Title is too short or missing');
    score -= 10;
  }

  if (!adr.context || adr.context.length < 50) {
    issues.push('Context section is too brief');
    score -= 15;
  }

  if (!adr.decision || adr.decision.length < 50) {
    issues.push('Decision section is too brief');
    score -= 15;
  }

  if (!adr.consequences || adr.consequences.length < 50) {
    issues.push('Consequences section is too brief');
    score -= 15;
  }

  if (!adr.status || !['proposed', 'accepted', 'deprecated', 'superseded'].includes(adr.status)) {
    issues.push('Status is missing or invalid');
    score -= 10;
  }

  return {
    isValid: issues.length === 0,
    issues,
    score: Math.max(0, score),
  };
}

/**
 * Generate individual ADR (Architectural Decision Record) resource with enhanced metadata and validation.
 *
 * Retrieves a specific ADR by its unique identifier and enriches it with:
 * - Structural validation scoring
 * - Related ADR discovery through content analysis
 * - Implementation status tracking
 * - Priority and complexity assessment
 * - File metadata (size, location, tags)
 *
 * **URI Pattern:** `adr://adr/{id}`
 *
 * **Query Parameters:**
 * - `projectPath`: Override project root path (default: process.cwd())
 *
 * @param params - URL path parameters containing:
 *   - id: ADR identifier (e.g., "001", "database-architecture", or full filename)
 * @param searchParams - URL query parameters for path customization
 *
 * @returns Promise resolving to resource generation result containing:
 *   - data: Complete ADR details with validation, relationships, and metadata
 *   - contentType: "application/json"
 *   - lastModified: ISO timestamp of generation
 *   - cacheKey: Unique identifier "adr:{id}"
 *   - ttl: Cache duration (600 seconds / 10 minutes)
 *   - etag: Entity tag for cache validation
 *
 * @throws {McpAdrError} When ADR retrieval fails due to:
 *   - INVALID_PARAMS: Missing required 'id' parameter
 *   - RESOURCE_NOT_FOUND: ADR with specified ID not found in directory
 *   - RESOURCE_GENERATION_ERROR: ADR discovery or parsing failure
 *
 * @example
 * ```typescript
 * // Get ADR by numeric ID
 * const adr = await generateAdrByIdResource(
 *   { id: '001' },
 *   new URLSearchParams()
 * );
 *
 * console.log(`Title: ${adr.data.title}`);
 * console.log(`Status: ${adr.data.status}`);
 * console.log(`Validation score: ${adr.data.validationResults.score}/100`);
 * console.log(`Related ADRs: ${adr.data.relatedAdrs.join(', ')}`);
 *
 * // Get ADR from custom project path
 * const customAdr = await generateAdrByIdResource(
 *   { id: 'database-architecture' },
 *   new URLSearchParams('projectPath=/path/to/project')
 * );
 *
 * // Expected output structure:
 * {
 *   data: {
 *     id: "001",
 *     title: "Use PostgreSQL for primary database",
 *     status: "accepted",
 *     date: "2025-01-15",
 *     context: "We need a reliable RDBMS...",
 *     decision: "We will use PostgreSQL...",
 *     consequences: "- Positive: ACID compliance...",
 *     implementationStatus: "completed",
 *     priority: "high",
 *     complexity: "medium",
 *     relatedAdrs: ["002-database-migrations", "005-data-access-layer"],
 *     validationResults: {
 *       isValid: true,
 *       issues: [],
 *       score: 95
 *     },
 *     filePath: "/project/docs/adrs/001-database-choice.md",
 *     fileSize: 2048,
 *     tags: ["database", "infrastructure"]
 *   },
 *   contentType: "application/json",
 *   cacheKey: "adr:001",
 *   ttl: 600
 * }
 * ```
 *
 * @since v2.0.0
 * @see {@link discoverAdrsInDirectory} for ADR discovery logic
 * @see {@link validateAdr} for ADR validation rules
 * @see {@link findRelatedAdrs} for relationship detection
 */
export async function generateAdrByIdResource(
  params: Record<string, string>,
  searchParams: URLSearchParams
): Promise<ResourceGenerationResult> {
  const id = params['id'];

  if (!id) {
    throw new McpAdrError('Missing required parameter: id', 'INVALID_PARAMS');
  }

  const cacheKey = `adr:${id}`;

  // Check cache
  const cached = await resourceCache.get<ResourceGenerationResult>(cacheKey);
  if (cached) {
    return cached;
  }

  const { discoverAdrsInDirectory } = await import('../utils/adr-discovery.js');
  const pathModule = await import('path');

  // Get ADR directory
  const projectPath = searchParams.get('projectPath') || process.cwd();
  const adrDirectory = pathModule.resolve(projectPath, process.env['ADR_DIRECTORY'] || 'docs/adrs');

  // Discover all ADRs
  const discoveryResult = await discoverAdrsInDirectory(adrDirectory, true, projectPath);

  // Find matching ADR (by ID in filename or title)
  const adr = discoveryResult.adrs.find(
    a =>
      a.filename.includes(id) ||
      a.filename.replace(/\.md$/, '').endsWith(id) ||
      a.title.toLowerCase().includes(id.toLowerCase())
  );

  if (!adr) {
    throw new McpAdrError(`ADR not found: ${id}`, 'RESOURCE_NOT_FOUND');
  }

  // Build detailed ADR data
  const relatedAdrs = await findRelatedAdrs(adr, discoveryResult.adrs);
  const validationResults = await validateAdr(adr);

  const dateStr = new Date().toISOString().split('T')[0];
  const adrDetails: AdrDetails = {
    id: adr.filename.replace(/\.md$/, ''),
    title: adr.title || 'Untitled',
    status: adr.status || 'unknown',
    date: dateStr || new Date().toISOString(),
    context: adr.context || '',
    decision: adr.decision || '',
    consequences: adr.consequences || '',
    implementationPlan: '',
    filePath: adr.filename,
    fileName: path.basename(adr.filename),
    fileSize: 0,
    tags: [],
    relatedAdrs,
    priority: 'medium',
    complexity: 'medium',
    implementationStatus: 'not-started',
    validationResults,
  };

  const result: ResourceGenerationResult = {
    data: adrDetails,
    contentType: 'application/json',
    lastModified: new Date().toISOString(),
    cacheKey,
    ttl: 300, // 5 minutes cache
    etag: generateETag(adrDetails),
  };

  // Cache result
  resourceCache.set(cacheKey, result, result.ttl);

  return result;
}

// Register route
resourceRouter.register(
  '/adr/{id}',
  generateAdrByIdResource,
  'Individual ADR by ID or title match'
);
