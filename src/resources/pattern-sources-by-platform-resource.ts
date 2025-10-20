/**
 * Pattern Authoritative Sources by Platform Resource
 * URI Pattern: adr://pattern_sources/{platform}
 *
 * Provides authoritative documentation and repository sources
 * for LLMs to query when implementing validated patterns
 */

import { URLSearchParams } from 'url';
import { McpAdrError } from '../types/index.js';
import { resourceCache, generateETag } from './resource-cache.js';
import { ResourceGenerationResult } from './index.js';
import { resourceRouter } from './resource-router.js';
import {
  getPattern,
  type PlatformType,
  type PatternSource,
} from '../utils/validated-pattern-definitions.js';

export interface PatternSourcesResponse {
  platform: PlatformType;
  patternName: string;
  sources: PatternSource[];
  metadata: {
    totalSources: number;
    requiredForDeployment: number;
    highestPriority: number;
    sourceTypes: string[];
  };
}

/**
 * Generate pattern sources by platform resource
 */
export async function generatePatternSourcesByPlatformResource(
  params: Record<string, string>,
  _searchParams: URLSearchParams
): Promise<ResourceGenerationResult> {
  const platform = params['platform'] as PlatformType;

  if (!platform) {
    throw new McpAdrError('Missing required parameter: platform', 'INVALID_PARAMS');
  }

  const cacheKey = `pattern-sources:${platform}`;

  // Check cache
  const cached = await resourceCache.get<ResourceGenerationResult>(cacheKey);
  if (cached) {
    return cached;
  }

  // Get pattern for platform
  const pattern = getPattern(platform);

  if (!pattern) {
    throw new McpAdrError(
      `No validated pattern found for platform: ${platform}. Valid platforms: openshift, kubernetes, docker, nodejs, python, mcp, a2a`,
      'RESOURCE_NOT_FOUND'
    );
  }

  // Sort sources by priority (highest first)
  const sortedSources = [...pattern.authoritativeSources].sort((a, b) => b.priority - a.priority);

  const sourcesData: PatternSourcesResponse = {
    platform: pattern.platformType,
    patternName: pattern.name,
    sources: sortedSources,
    metadata: {
      totalSources: pattern.authoritativeSources.length,
      requiredForDeployment: pattern.authoritativeSources.filter(s => s.requiredForDeployment)
        .length,
      highestPriority: Math.max(...pattern.authoritativeSources.map(s => s.priority)),
      sourceTypes: [...new Set(pattern.authoritativeSources.map(s => s.type))],
    },
  };

  const result: ResourceGenerationResult = {
    data: sourcesData,
    contentType: 'application/json',
    lastModified: pattern.metadata.lastUpdated,
    cacheKey,
    ttl: 3600, // 1 hour cache
    etag: generateETag(sourcesData),
  };

  // Cache result
  resourceCache.set(cacheKey, result, result.ttl);

  return result;
}

// Register route
resourceRouter.register(
  '/pattern_sources/{platform}',
  generatePatternSourcesByPlatformResource,
  'Authoritative sources for a platform pattern'
);
