/**
 * Validated Pattern by Platform Resource
 * URI Pattern: adr://validated_pattern/{platform}
 *
 * Provides complete validated pattern for a specific platform
 * including bill of materials, deployment phases, validation checks
 */

import { URLSearchParams } from 'url';
import { McpAdrError } from '../types/index.js';
import { resourceCache, generateETag } from './resource-cache.js';
import { ResourceGenerationResult } from './index.js';
import { resourceRouter } from './resource-router.js';
import { getPattern, type PlatformType } from '../utils/validated-pattern-definitions.js';

/**
 * Generate validated pattern by platform resource
 */
export async function generateValidatedPatternByPlatformResource(
  params: Record<string, string>,
  _searchParams: URLSearchParams
): Promise<ResourceGenerationResult> {
  const platform = params['platform'] as PlatformType;

  if (!platform) {
    throw new McpAdrError('Missing required parameter: platform', 'INVALID_PARAMS');
  }

  const cacheKey = `validated-pattern:${platform}`;

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

  const result: ResourceGenerationResult = {
    data: pattern,
    contentType: 'application/json',
    lastModified: pattern.metadata.lastUpdated,
    cacheKey,
    ttl: 3600, // 1 hour cache
    etag: generateETag(pattern),
  };

  // Cache result
  resourceCache.set(cacheKey, result, result.ttl);

  return result;
}

// Register route
resourceRouter.register(
  '/validated_pattern/{platform}',
  generateValidatedPatternByPlatformResource,
  'Individual validated pattern by platform type'
);
