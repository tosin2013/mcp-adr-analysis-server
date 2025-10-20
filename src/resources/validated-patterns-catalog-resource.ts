/**
 * Validated Patterns Catalog Resource
 * URI Pattern: adr://validated_patterns
 *
 * Provides complete catalog of validated deployment patterns
 * for different platforms with metadata and summaries
 */

import { resourceCache, generateETag } from './resource-cache.js';
import { ResourceGenerationResult } from './index.js';
import {
  listAllPatterns,
  type ValidatedPattern,
  type PlatformType,
} from '../utils/validated-pattern-definitions.js';

export interface ValidatedPatternsCatalog {
  patterns: Array<{
    id: string;
    name: string;
    version: string;
    platformType: PlatformType;
    description: string;
    lastUpdated: string;
    source: string;
    tags: string[];
    hasBaseCodeRepository: boolean;
    hasAuthoritativeSources: boolean;
    authoritativeSourceCount: number;
    deploymentPhaseCount: number;
    validationCheckCount: number;
  }>;
  metadata: {
    totalPatterns: number;
    platforms: PlatformType[];
    lastGenerated: string;
  };
}

/**
 * Generate validated patterns catalog resource
 */
export async function generateValidatedPatternsCatalogResource(): Promise<ResourceGenerationResult> {
  const cacheKey = 'validated-patterns-catalog';

  // Check cache
  const cached = await resourceCache.get<ResourceGenerationResult>(cacheKey);
  if (cached) {
    return cached;
  }

  // Get all validated patterns
  const allPatterns = listAllPatterns();

  const patternSummaries = allPatterns.map((pattern: ValidatedPattern) => ({
    id: pattern.id,
    name: pattern.name,
    version: pattern.version,
    platformType: pattern.platformType,
    description: pattern.description,
    lastUpdated: pattern.metadata.lastUpdated,
    source: pattern.metadata.source,
    tags: pattern.metadata.tags,
    hasBaseCodeRepository: !!pattern.baseCodeRepository,
    hasAuthoritativeSources: pattern.authoritativeSources.length > 0,
    authoritativeSourceCount: pattern.authoritativeSources.length,
    deploymentPhaseCount: pattern.deploymentPhases.length,
    validationCheckCount: pattern.validationChecks.length,
  }));

  const catalog: ValidatedPatternsCatalog = {
    patterns: patternSummaries,
    metadata: {
      totalPatterns: allPatterns.length,
      platforms: allPatterns.map((p: ValidatedPattern) => p.platformType),
      lastGenerated: new Date().toISOString(),
    },
  };

  const result: ResourceGenerationResult = {
    data: catalog,
    contentType: 'application/json',
    lastModified: new Date().toISOString(),
    cacheKey,
    ttl: 3600, // 1 hour cache (patterns don't change frequently)
    etag: generateETag(catalog),
  };

  // Cache result
  resourceCache.set(cacheKey, result, result.ttl);

  return result;
}
