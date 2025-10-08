/**
 * Research by Topic Resource - Topic-specific research documents
 * URI Pattern: adr://research/{topic}
 */

import { URLSearchParams } from 'url';
import * as path from 'path';
import * as fs from 'fs/promises';
import { McpAdrError } from '../types/index.js';
import { resourceCache, generateETag } from './resource-cache.js';
import { ResourceGenerationResult } from './index.js';
import { resourceRouter } from './resource-router.js';

export interface ResearchDocument {
  id: string;
  title: string;
  topic: string;
  path: string;
  content: string;
  lastModified: string;
  wordCount: number;
  size: number;
}

/**
 * Extract title from markdown content
 */
function extractTitle(content: string): string {
  const titleMatch = content.match(/^#\s+(.+)$/m);
  if (titleMatch && titleMatch[1]) {
    return titleMatch[1].trim();
  }
  return 'Untitled';
}

/**
 * Generate topic summary from documents
 */
function generateTopicSummary(documents: ResearchDocument[]): {
  totalWords: number;
  totalSize: number;
  lastUpdated: string;
  documentCount: number;
} {
  const firstDoc = documents[0];
  return {
    totalWords: documents.reduce((sum, doc) => sum + doc.wordCount, 0),
    totalSize: documents.reduce((sum, doc) => sum + doc.size, 0),
    lastUpdated:
      documents.length > 0 && firstDoc
        ? documents.reduce(
            (latest, doc) => (doc.lastModified > latest ? doc.lastModified : latest),
            firstDoc.lastModified
          )
        : new Date().toISOString(),
    documentCount: documents.length,
  };
}

/**
 * Check if a file matches the topic
 */
function matchesTopic(filename: string, content: string, topic: string): boolean {
  const normalizedTopic = topic.toLowerCase().replace(/-/g, '_');
  const normalizedFilename = filename.toLowerCase();
  const normalizedContent = content.toLowerCase();

  // Check filename
  if (
    normalizedFilename.includes(topic.toLowerCase()) ||
    normalizedFilename.includes(normalizedTopic)
  ) {
    return true;
  }

  // Check content (first 1000 characters for keywords)
  const contentPreview = normalizedContent.substring(0, 1000);
  if (contentPreview.includes(topic.toLowerCase()) || contentPreview.includes(normalizedTopic)) {
    return true;
  }

  return false;
}

/**
 * Generate research by topic resource
 */
export async function generateResearchByTopicResource(
  params: Record<string, string>,
  _searchParams: URLSearchParams
): Promise<ResourceGenerationResult> {
  const topic = params['topic'];

  if (!topic) {
    throw new McpAdrError('Missing required parameter: topic', 'INVALID_PARAMS');
  }

  const cacheKey = `research-topic:${topic}`;

  // Check cache
  const cached = await resourceCache.get<ResourceGenerationResult>(cacheKey);
  if (cached) {
    return cached;
  }

  const researchDirs = ['docs/research', 'custom/research'];
  const relatedDocs: ResearchDocument[] = [];

  // Scan research directories
  for (const dir of researchDirs) {
    const fullPath = path.resolve(process.cwd(), dir);

    try {
      const files = await fs.readdir(fullPath);

      for (const file of files) {
        if (file.endsWith('.md')) {
          const filePath = path.join(fullPath, file);
          const content = await fs.readFile(filePath, 'utf-8');

          // Check if file matches topic
          if (matchesTopic(file, content, topic)) {
            const stats = await fs.stat(filePath);

            relatedDocs.push({
              id: file.replace('.md', ''),
              title: extractTitle(content),
              topic,
              path: path.join(dir, file),
              content,
              lastModified: stats.mtime.toISOString(),
              wordCount: content.split(/\s+/).length,
              size: stats.size,
            });
          }
        }
      }
    } catch {
      // Directory doesn't exist or can't be read, skip silently
      continue;
    }
  }

  // Sort by last modified (newest first)
  relatedDocs.sort((a, b) => b.lastModified.localeCompare(a.lastModified));

  if (relatedDocs.length === 0) {
    throw new McpAdrError(`No research documents found for topic: ${topic}`, 'RESOURCE_NOT_FOUND');
  }

  const topicData = {
    topic,
    documentCount: relatedDocs.length,
    documents: relatedDocs,
    summary: generateTopicSummary(relatedDocs),
  };

  const result: ResourceGenerationResult = {
    data: topicData,
    contentType: 'application/json',
    lastModified: new Date().toISOString(),
    cacheKey,
    ttl: 600, // 10 minutes cache
    etag: generateETag(topicData),
  };

  // Cache result
  resourceCache.set(cacheKey, result, result.ttl);

  return result;
}

// Register route
resourceRouter.register(
  '/research/{topic}',
  generateResearchByTopicResource,
  'Research documents filtered by topic'
);
