/**
 * Pattern Base Code Repository by Platform Resource
 * URI Pattern: adr://pattern_base_code/{platform}
 *
 * Provides base code repository information for pattern integration
 * including URLs, integration instructions, and required files
 */

import { URLSearchParams } from 'url';
import { McpAdrError } from '../types/index.js';
import { resourceCache, generateETag } from './resource-cache.js';
import { ResourceGenerationResult } from './index.js';
import { resourceRouter } from './resource-router.js';
import { getPattern, type PlatformType } from '../utils/validated-pattern-definitions.js';

export interface PatternBaseCodeResponse {
  platform: PlatformType;
  patternName: string;
  repository: {
    url: string;
    purpose: string;
    integrationInstructions: string;
    requiredFiles: string[];
    scriptEntrypoint?: string;
  };
  integrationChecklist: Array<{
    step: number;
    description: string;
    required: boolean;
  }>;
  metadata: {
    lastUpdated: string;
    source: string;
  };
}

/**
 * Generate pattern base code by platform resource
 */
export async function generatePatternBaseCodeByPlatformResource(
  params: Record<string, string>,
  _searchParams: URLSearchParams
): Promise<ResourceGenerationResult> {
  const platform = params['platform'] as PlatformType;

  if (!platform) {
    throw new McpAdrError('Missing required parameter: platform', 'INVALID_PARAMS');
  }

  const cacheKey = `pattern-base-code:${platform}`;

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

  // Parse integration instructions to create checklist
  const instructionSteps = pattern.baseCodeRepository.integrationInstructions
    .split(/\d+\)/)
    .filter(s => s.trim().length > 0)
    .map((step, index) => ({
      step: index + 1,
      description: step.trim(),
      required: true,
    }));

  const baseCodeData: PatternBaseCodeResponse = {
    platform: pattern.platformType,
    patternName: pattern.name,
    repository: {
      url: pattern.baseCodeRepository.url,
      purpose: pattern.baseCodeRepository.purpose,
      integrationInstructions: pattern.baseCodeRepository.integrationInstructions,
      requiredFiles: pattern.baseCodeRepository.requiredFiles,
      ...(pattern.baseCodeRepository.scriptEntrypoint && {
        scriptEntrypoint: pattern.baseCodeRepository.scriptEntrypoint,
      }),
    },
    integrationChecklist: instructionSteps,
    metadata: {
      lastUpdated: pattern.metadata.lastUpdated,
      source: pattern.metadata.source,
    },
  };

  const result: ResourceGenerationResult = {
    data: baseCodeData,
    contentType: 'application/json',
    lastModified: pattern.metadata.lastUpdated,
    cacheKey,
    ttl: 3600, // 1 hour cache
    etag: generateETag(baseCodeData),
  };

  // Cache result
  resourceCache.set(cacheKey, result, result.ttl);

  return result;
}

// Register route
resourceRouter.register(
  '/pattern_base_code/{platform}',
  generatePatternBaseCodeByPlatformResource,
  'Base code repository information for a platform pattern'
);
