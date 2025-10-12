/**
 * Research Index Resource
 * Provides access to research documents and findings
 */

import * as fs from 'fs/promises';
import * as path from 'path';
import { McpAdrError } from '../types/index.js';
import { resourceCache, generateETag } from './resource-cache.js';
import { ResourceGenerationResult } from './index.js';

export interface ResearchDocument {
  id: string;
  title: string;
  topic: string;
  path: string;
  lastModified: string;
  wordCount: number;
  size: number;
}

/**
 * Extract title from markdown content
 */
function extractTitle(content: string): string {
  const lines = content.split('\n');
  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.startsWith('# ')) {
      return trimmed.substring(2).trim();
    }
  }
  return 'Untitled';
}

/**
 * Extract topic from filename
 */
function extractTopic(filename: string): string {
  // Remove extension and parse filename
  // Example: perform_research_test_research_001.md -> research
  const baseName = filename.replace(/\.md$/, '');
  const parts = baseName.split('_');

  // Try to find meaningful topic
  if (parts.includes('research')) {
    const researchIndex = parts.indexOf('research');
    if (researchIndex > 0) {
      return parts.slice(0, researchIndex + 1).join('_');
    }
    return 'research';
  }

  return parts[0] || 'general';
}

/**
 * Group documents by topic
 */
function groupByTopic(docs: ResearchDocument[]): Record<string, number> {
  const grouped: Record<string, number> = {};

  for (const doc of docs) {
    grouped[doc.topic] = (grouped[doc.topic] || 0) + 1;
  }

  return grouped;
}

/**
 * Generate comprehensive research document index resource with metadata and categorization.
 *
 * Scans project research directories and builds an index of all research documents with
 * metadata including titles, topics, word counts, file sizes, and last modified dates.
 * Supports multiple research directories for organizational flexibility.
 *
 * **Scanned Directories:**
 * - `docs/research/` - Primary research documentation
 * - `custom/research/` - Custom user research notes
 *
 * **Document Extraction:**
 * - Title: Extracted from first H1 heading or filename
 * - Topic: Derived from filename prefix or directory structure
 * - Metadata: Word count, file size, last modified timestamp
 *
 * @returns Promise resolving to resource generation result containing:
 *   - data: Complete research index with documents array and summary statistics
 *   - contentType: "application/json"
 *   - lastModified: ISO timestamp of generation
 *   - cacheKey: "research-index:current"
 *   - ttl: Cache duration (300 seconds / 5 minutes)
 *   - etag: Entity tag for cache validation
 *
 * @throws {McpAdrError} When research index generation fails due to:
 *   - RESOURCE_GENERATION_ERROR: File system access errors or markdown parsing failures
 *   - Cache operation failures
 *
 * @example
 * ```typescript
 * const researchIndex = await generateResearchIndexResource();
 *
 * console.log(`Total research documents: ${researchIndex.data.summary.total}`);
 * console.log(`Topics covered: ${researchIndex.data.summary.byTopic.length}`);
 * console.log(`Total words: ${researchIndex.data.summary.totalWords}`);
 *
 * // Find research by topic
 * const architectureDocs = researchIndex.data.documents.filter(
 *   doc => doc.topic === 'architecture'
 * );
 * console.log(`Architecture research docs: ${architectureDocs.length}`);
 *
 * // Sort by recency
 * const recentDocs = researchIndex.data.documents
 *   .sort((a, b) => new Date(b.lastModified).getTime() - new Date(a.lastModified).getTime())
 *   .slice(0, 5);
 *
 * // Expected output structure:
 * {
 *   data: {
 *     version: "1.0.0",
 *     timestamp: "2025-10-12T17:00:00.000Z",
 *     summary: {
 *       total: 55,
 *       byTopic: {
 *         "performance": 12,
 *         "security": 8,
 *         "architecture": 15
 *       },
 *       totalWords: 45000,
 *       averageWordCount: 818
 *     },
 *     documents: [
 *       {
 *         id: "perform_research_research_001",
 *         title: "TypeScript Performance Optimization",
 *         topic: "performance",
 *         path: "docs/research/perform_research_research_001.md",
 *         lastModified: "2025-10-10T12:00:00.000Z",
 *         wordCount: 1250,
 *         size: 8192
 *       }
 *     ]
 *   },
 *   contentType: "application/json",
 *   cacheKey: "research-index:current",
 *   ttl: 300
 * }
 * ```
 *
 * @since v2.0.0
 * @see {@link extractTitle} for title extraction logic
 * @see {@link extractTopic} for topic categorization
 */
export async function generateResearchIndexResource(): Promise<ResourceGenerationResult> {
  try {
    const cacheKey = 'research-index:current';

    // Check cache
    const cached = await resourceCache.get<ResourceGenerationResult>(cacheKey);
    if (cached) {
      return cached;
    }

    const researchDirs = ['docs/research', 'custom/research'];
    const researchDocs: ResearchDocument[] = [];

    for (const dir of researchDirs) {
      const fullPath = path.resolve(process.cwd(), dir);

      try {
        await fs.access(fullPath);
        const files = await fs.readdir(fullPath);

        for (const file of files) {
          if (file.endsWith('.md')) {
            const filePath = path.join(fullPath, file);
            const content = await fs.readFile(filePath, 'utf-8');
            const stats = await fs.stat(filePath);

            researchDocs.push({
              id: file.replace(/\.md$/, ''),
              title: extractTitle(content),
              topic: extractTopic(file),
              path: path.join(dir, file),
              lastModified: stats.mtime.toISOString(),
              wordCount: content.split(/\s+/).filter(w => w.length > 0).length,
              size: stats.size,
            });
          }
        }
      } catch {
        // Directory doesn't exist or can't be accessed, skip
        console.warn(`[ResearchIndexResource] Cannot access directory: ${fullPath}`);
      }
    }

    // Sort by last modified (newest first)
    researchDocs.sort(
      (a, b) => new Date(b.lastModified).getTime() - new Date(a.lastModified).getTime()
    );

    const researchIndexData = {
      version: '1.0.0',
      timestamp: new Date().toISOString(),
      summary: {
        total: researchDocs.length,
        byTopic: groupByTopic(researchDocs),
        totalWordCount: researchDocs.reduce((sum, doc) => sum + doc.wordCount, 0),
        totalSize: researchDocs.reduce((sum, doc) => sum + doc.size, 0),
      },
      documents: researchDocs,
    };

    const result: ResourceGenerationResult = {
      data: researchIndexData,
      contentType: 'application/json',
      lastModified: new Date().toISOString(),
      cacheKey,
      ttl: 300, // 5 minutes cache
      etag: generateETag(researchIndexData),
    };

    // Cache result
    resourceCache.set(cacheKey, result, result.ttl);

    return result;
  } catch (error) {
    throw new McpAdrError(
      `Failed to generate research index resource: ${error instanceof Error ? error.message : String(error)}`,
      'RESOURCE_GENERATION_ERROR'
    );
  }
}
