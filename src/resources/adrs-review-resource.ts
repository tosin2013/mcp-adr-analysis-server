/**
 * ADRs Review Resource - Review specific ADR against code implementation
 * URI Pattern: adr://adrs/{id}/review
 */

import { URLSearchParams } from 'url';
import { McpAdrError } from '../types/index.js';
import { resourceCache, generateETag } from './resource-cache.js';
import { ResourceGenerationResult } from './index.js';
import { resourceRouter } from './resource-router.js';

export interface AdrReviewData {
  adrId: string;
  title: string;
  status: string;
  complianceScore: number;
  codeCompliance: {
    implemented: boolean;
    partiallyImplemented: boolean;
    notImplemented: boolean;
    evidence: string[];
    gaps: string[];
  };
  recommendations: {
    updateAdr: boolean;
    updateCode: boolean;
    createPlan: boolean;
    actions: string[];
  };
  analysis: string;
  timestamp: string;
  projectPath: string;
  analysisDepth: string;
}

/**
 * Generate ADR review resource showing compliance analysis against code.
 *
 * Returns a comprehensive review of a specific ADR including:
 * - Compliance score against actual implementation
 * - Evidence of implementation found in code
 * - Gaps between ADR decisions and code
 * - Recommendations for updates
 *
 * **URI Pattern:** `adr://adrs/{id}/review`
 *
 * **Query Parameters:**
 * - `projectPath`: Override project root path (default: process.cwd())
 * - `analysisDepth`: 'basic' | 'detailed' | 'comprehensive' (default: 'detailed')
 * - `includeTreeSitter`: Use tree-sitter for analysis (default: true)
 *
 * @param params - URL path parameters containing:
 *   - id: ADR identifier (e.g., "001", "database-architecture")
 * @param searchParams - URL query parameters for customization
 *
 * @returns Promise resolving to resource generation result containing:
 *   - data: Complete ADR review data with compliance analysis
 *   - contentType: "application/json"
 *   - lastModified: ISO timestamp of generation
 *   - cacheKey: Unique identifier "adr-review:{id}"
 *   - ttl: Cache duration (180 seconds / 3 minutes)
 *   - etag: Entity tag for cache validation
 *
 * @throws {McpAdrError} When review generation fails
 *
 * @example
 * ```typescript
 * // Get review for ADR 001
 * const review = await generateAdrsReviewResource(
 *   { id: '001' },
 *   new URLSearchParams()
 * );
 *
 * console.log(`Compliance score: ${review.data.complianceScore}/10`);
 * console.log(`Gaps: ${review.data.codeCompliance.gaps.join(', ')}`);
 *
 * // Comprehensive review with custom project path
 * const detailed = await generateAdrsReviewResource(
 *   { id: 'database-architecture' },
 *   new URLSearchParams('analysisDepth=comprehensive&projectPath=/my/project')
 * );
 * ```
 *
 * @since v2.2.0
 * @see {@link reviewExistingAdrs} for the underlying review logic
 */
export async function generateAdrsReviewResource(
  params: Record<string, string>,
  searchParams: URLSearchParams
): Promise<ResourceGenerationResult> {
  const id = params['id'];

  if (!id) {
    throw new McpAdrError('Missing required parameter: id', 'INVALID_PARAMS');
  }

  const projectPath = searchParams.get('projectPath') || process.cwd();
  const analysisDepth = (searchParams.get('analysisDepth') || 'detailed') as
    | 'basic'
    | 'detailed'
    | 'comprehensive';
  const includeTreeSitter = searchParams.get('includeTreeSitter') !== 'false';

  const cacheKey = `adr-review:${id}:${analysisDepth}`;

  // Check cache
  const cached = await resourceCache.get<ResourceGenerationResult>(cacheKey);
  if (cached) {
    return cached;
  }

  try {
    // Import the review tool dynamically to avoid circular dependencies
    const { reviewExistingAdrs } = await import('../tools/review-existing-adrs-tool.js');

    // Perform the review for the specific ADR
    const reviewResult = await reviewExistingAdrs({
      projectPath,
      specificAdr: id,
      analysisDepth,
      includeTreeSitter,
      generateUpdatePlan: true,
    });

    // Parse the review result to extract structured data
    const reviewText = reviewResult.content?.[0]?.text || '';

    // Extract compliance score from the review
    const scoreMatch = reviewText.match(/Compliance Score[:\s]*(\d+(?:\.\d+)?)/i);
    const complianceScore = scoreMatch ? parseFloat(scoreMatch[1]) : 5;

    // Extract title
    const titleMatch = reviewText.match(/###\s*([^\n]+)/);
    const title = titleMatch ? titleMatch[1].trim() : `ADR ${id}`;

    // Extract status
    const statusMatch = reviewText.match(/Status[:\s]*(\w+)/i);
    const status = statusMatch ? statusMatch[1] : 'unknown';

    // Build structured review data
    const reviewData: AdrReviewData = {
      adrId: id,
      title,
      status,
      complianceScore,
      codeCompliance: {
        implemented: complianceScore >= 8,
        partiallyImplemented: complianceScore >= 5 && complianceScore < 8,
        notImplemented: complianceScore < 5,
        evidence: extractListItems(reviewText, 'Evidence Found'),
        gaps: extractListItems(reviewText, 'Gaps Identified'),
      },
      recommendations: {
        updateAdr: complianceScore < 7,
        updateCode: complianceScore < 5,
        createPlan: complianceScore < 5,
        actions: extractListItems(reviewText, 'Recommendations'),
      },
      analysis: reviewText,
      timestamp: new Date().toISOString(),
      projectPath,
      analysisDepth,
    };

    const result: ResourceGenerationResult = {
      data: reviewData,
      contentType: 'application/json',
      lastModified: new Date().toISOString(),
      cacheKey,
      ttl: 180, // 3 minutes cache (reviews are somewhat expensive)
      etag: generateETag(reviewData),
    };

    // Cache result
    resourceCache.set(cacheKey, result, result.ttl);

    return result;
  } catch (error) {
    throw new McpAdrError(
      `Failed to generate ADR review: ${error instanceof Error ? error.message : String(error)}`,
      'RESOURCE_GENERATION_ERROR'
    );
  }
}

/**
 * Extract list items from a section in the review text
 */
function extractListItems(text: string, sectionName: string): string[] {
  const items: string[] = [];

  // Find the section
  const sectionRegex = new RegExp(
    `(?:#{1,4}\\s*)?${sectionName}[^\\n]*\\n([\\s\\S]*?)(?=#{1,4}|$)`,
    'i'
  );
  const sectionMatch = text.match(sectionRegex);

  if (sectionMatch && sectionMatch[1]) {
    const sectionContent = sectionMatch[1];
    // Extract list items (lines starting with - or *)
    const listMatches = sectionContent.match(/^[\s]*[-*]\s*(.+)$/gm);
    if (listMatches) {
      listMatches.forEach(match => {
        const item = match.replace(/^[\s]*[-*]\s*/, '').trim();
        if (item && !item.startsWith('No ')) {
          items.push(item);
        }
      });
    }
  }

  return items;
}

// Register route
resourceRouter.register(
  '/adrs/{id}/review',
  generateAdrsReviewResource,
  'Review specific ADR against code implementation'
);
