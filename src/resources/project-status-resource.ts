/**
 * Project Status Resource
 * Provides comprehensive project status and health metrics
 */

import { McpAdrError } from '../types/index.js';
import { resourceCache, generateETag } from './resource-cache.js';
import { ResourceGenerationResult } from './index.js';
import { generateTodoListResource } from './todo-list-resource.js';
import { generateResearchIndexResource } from './research-index-resource.js';
import { generateRuleCatalogResource } from './rule-catalog-resource.js';

export interface ProjectStatus {
  version: string;
  timestamp: string;
  overallHealth: 'excellent' | 'good' | 'fair' | 'poor';
  components: {
    tasks: any;
    research: any;
    rules: any;
  };
  metrics: {
    completionRate: number;
    qualityScore: number;
    resourceCoverage: number;
  };
}

/**
 * Calculate overall health score
 */
function calculateOverallHealth(components: any[]): 'excellent' | 'good' | 'fair' | 'poor' {
  // Simple heuristic based on completion rates and issues
  let score = 0;
  let maxScore = 0;

  for (const component of components) {
    if (component && typeof component === 'object') {
      maxScore += 100;

      if (component.summary) {
        // Score based on completion
        if (component.summary.completed !== undefined && component.summary.total !== undefined) {
          const completionRate =
            component.summary.total > 0
              ? (component.summary.completed / component.summary.total) * 100
              : 100;
          score += completionRate;
        } else {
          score += 75; // Neutral score if no completion data
        }
      } else {
        score += 50; // Lower score for missing data
      }
    }
  }

  const avgScore = maxScore > 0 ? (score / maxScore) * 100 : 50;

  if (avgScore >= 90) return 'excellent';
  if (avgScore >= 75) return 'good';
  if (avgScore >= 50) return 'fair';
  return 'poor';
}

/**
 * Calculate completion rate from todo statistics
 */
function calculateCompletionRate(todoStats: any): number {
  if (!todoStats || !todoStats.summary) return 0;

  const { total, completed } = todoStats.summary;
  return total > 0 ? (completed / total) * 100 : 0;
}

/**
 * Calculate quality score from various metrics
 */
function calculateQualityScore(components: any): number {
  // Simplified quality score calculation
  // In production, this would analyze code quality, test coverage, etc.
  let score = 75; // Baseline score

  // Adjust based on rule compliance
  if (components.rules && components.rules.summary) {
    const { enabled, total } = components.rules.summary;
    if (total > 0) {
      score += (enabled / total) * 10;
    }
  }

  // Adjust based on research documentation
  if (components.research && components.research.summary) {
    const { total } = components.research.summary;
    if (total > 5) {
      score += 5; // Bonus for good documentation
    }
  }

  return Math.min(Math.max(score, 0), 100);
}

/**
 * Calculate resource coverage
 */
function calculateResourceCoverage(): number {
  // Currently: 7 resources (3 original refactored + 4 new)
  // Target: 20+ resources
  const current = 7;
  const target = 20;

  return (current / target) * 100;
}

/**
 * Generate comprehensive project status resource aggregating data from multiple sources.
 *
 * This function provides a holistic view of the project's current state by combining
 * task management, research documentation, and rule compliance metrics.
 *
 * @returns Promise resolving to resource generation result containing:
 *   - data: Complete project status including health metrics and component breakdown
 *   - contentType: "application/json"
 *   - lastModified: ISO timestamp of generation
 *   - cacheKey: Unique identifier for caching
 *   - ttl: Cache duration (120 seconds)
 *   - etag: Entity tag for cache validation
 *
 * @throws {McpAdrError} When resource generation fails due to:
 *   - Inability to generate todo/research/rules resources
 *   - Invalid data structure from component resources
 *   - Cache operation failures
 *
 * @example
 * ```typescript
 * const status = await generateProjectStatusResource();
 * console.log(`Project health: ${status.data.overallHealth}`);
 * console.log(`Completion rate: ${status.data.metrics.completionRate}%`);
 *
 * // Expected output structure:
 * {
 *   data: {
 *     version: "1.0.0",
 *     timestamp: "2025-10-12T17:00:00.000Z",
 *     overallHealth: "good",
 *     components: {
 *       tasks: { summary: { total: 10, completed: 7 } },
 *       research: { summary: { total: 5 } },
 *       rules: { summary: { enabled: 15, total: 20 } }
 *     },
 *     metrics: {
 *       completionRate: 70,
 *       qualityScore: 85,
 *       resourceCoverage: 35
 *     }
 *   },
 *   contentType: "application/json",
 *   cacheKey: "project-status:current",
 *   ttl: 120
 * }
 * ```
 *
 * @since v2.0.0
 * @see {@link generateTodoListResource} for task management data
 * @see {@link generateResearchIndexResource} for research documentation
 * @see {@link generateRuleCatalogResource} for rule compliance
 */
export async function generateProjectStatusResource(): Promise<ResourceGenerationResult> {
  try {
    const cacheKey = 'project-status:current';

    // Check cache
    const cached = await resourceCache.get<ResourceGenerationResult>(cacheKey);
    if (cached) {
      return cached;
    }

    // Aggregate status from multiple sources
    const todoResource = await generateTodoListResource();
    const researchResource = await generateResearchIndexResource();
    const rulesResource = await generateRuleCatalogResource();

    const components = {
      tasks: todoResource.data,
      research: researchResource.data,
      rules: rulesResource.data,
    };

    const projectStatusData: ProjectStatus = {
      version: '1.0.0',
      timestamp: new Date().toISOString(),
      overallHealth: calculateOverallHealth([
        todoResource.data,
        researchResource.data,
        rulesResource.data,
      ]),
      components,
      metrics: {
        completionRate: calculateCompletionRate(todoResource.data),
        qualityScore: calculateQualityScore(components),
        resourceCoverage: calculateResourceCoverage(),
      },
    };

    const result: ResourceGenerationResult = {
      data: projectStatusData,
      contentType: 'application/json',
      lastModified: new Date().toISOString(),
      cacheKey,
      ttl: 120, // 2 minutes cache (status changes frequently)
      etag: generateETag(projectStatusData),
    };

    // Cache result
    resourceCache.set(cacheKey, result, result.ttl);

    return result;
  } catch (error) {
    throw new McpAdrError(
      `Failed to generate project status resource: ${error instanceof Error ? error.message : String(error)}`,
      'RESOURCE_GENERATION_ERROR'
    );
  }
}
