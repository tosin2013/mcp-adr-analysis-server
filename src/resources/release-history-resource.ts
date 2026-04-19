/**
 * Release History Resource
 * Provides read-only access to release tracking state including
 * releases, ADR mappings, milestones, and tracking metadata.
 */

import { McpAdrError } from '../types/index.js';
import { generateETag } from './resource-cache.js';
import { ResourceGenerationResult } from './index.js';
import { loadTrackingState } from '../utils/release-tracker.js';

/**
 * Generate release history resource content
 */
export async function generateReleaseHistoryResource(
  projectPath: string,
  _searchParams?: URLSearchParams
): Promise<ResourceGenerationResult> {
  try {
    const state = loadTrackingState(projectPath);

    const data = state
      ? {
          projectType: state.projectType,
          detectedPhase: state.detectedPhase,
          totalReleases: state.releases.length,
          releases: state.releases.map(r => ({
            version: r.version,
            date: r.date,
            source: r.source,
            adrCount: r.adrs.length,
            featureCount: r.features.length,
            bugfixCount: r.bugfixes.length,
            breakingChangeCount: r.breakingChanges.length,
            adrs: r.adrs.map(a => ({
              filename: a.adrFilename,
              title: a.adrTitle,
              status: a.adrStatus,
              changeType: a.changeType,
              confidence: a.confidence,
              mappingMethod: a.mappingMethod,
            })),
          })),
          unmappedAdrs: state.unmappedAdrs,
          milestones: state.milestones,
          lastScanTimestamp: state.lastScanTimestamp,
        }
      : {
          message:
            'No release tracking data available. Run release_tracking with detect_releases first.',
          projectType: 'unknown',
          totalReleases: 0,
          releases: [],
          unmappedAdrs: [],
          milestones: [],
        };

    const cacheKey = `release_history:${projectPath}`;

    return {
      data,
      contentType: 'application/json',
      lastModified: new Date().toISOString(),
      cacheKey,
      ttl: 60,
      etag: generateETag(data),
    };
  } catch (error) {
    throw new McpAdrError(
      `Failed to generate release history resource: ${error instanceof Error ? error.message : String(error)}`,
      'RESOURCE_ERROR'
    );
  }
}
