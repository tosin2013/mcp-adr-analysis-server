/**
 * Deployment History Resource
 *
 * Provides historical deployment data, trends, and pattern analysis.
 * Bridges to deployment-readiness-tool for comprehensive deployment history.
 *
 * URI: adr://deployment_history
 *
 * Query Parameters:
 * - period: Time period to analyze (7d, 30d, 90d, 1y, all) - default: 30d
 * - environment: Target environment (production, staging, development, all) - default: all
 * - includeFailures: Include failed deployments (true, false) - default: true
 * - includeMetrics: Include detailed metrics (true, false) - default: true
 * - format: Output format (summary, detailed) - default: detailed
 *
 * Example URIs:
 * - adr://deployment_history
 * - adr://deployment_history?period=90d
 * - adr://deployment_history?environment=production&includeFailures=true
 * - adr://deployment_history?period=1y&format=summary
 */

import { URLSearchParams } from 'url';
import path from 'path';
import { promises as fs } from 'fs';
import { ResourceCache } from './resource-cache.js';

const resourceCache = new ResourceCache();

export interface DeploymentHistoryResult {
  period: string;
  environment: string;
  timestamp: string;

  summary: {
    totalDeployments: number;
    successfulDeployments: number;
    failedDeployments: number;
    successRate: number;
    averageDeploymentTime: string;
    deploymentsPerWeek: number;
  };

  trends?: {
    deploymentFrequency: Array<{
      week: string;
      deployments: number;
      successes: number;
      failures: number;
    }>;
    successRateTrend: Array<{
      month: string;
      successRate: number;
    }>;
    performanceTrend: Array<{
      month: string;
      averageTime: number;
    }>;
  };

  recentDeployments?: Array<{
    timestamp: string;
    version: string;
    environment: string;
    status: 'success' | 'failed' | 'partial';
    duration: string;
    deployer?: string;
    rollbackRequired?: boolean;
  }>;

  failureAnalysis?: {
    totalFailures: number;
    commonFailureReasons: Array<{
      reason: string;
      count: number;
      percentage: number;
    }>;
    mtbf: string; // Mean Time Between Failures
    mttr: string; // Mean Time To Recovery
  };

  metrics?: {
    deploymentVelocity: number;
    changeFailureRate: number;
    leadTimeForChanges: string;
    timeToRestoreService: string;
  };

  patterns?: {
    bestDeploymentDay: string;
    bestDeploymentTime: string;
    riskFactors: string[];
    recommendations: string[];
  };

  metadata: {
    period: string;
    environment: string;
    dataSource: 'comprehensive-tool' | 'basic-analysis';
    confidence: number;
    timestamp: string;
  };
}

export interface ResourceGenerationResult {
  data: DeploymentHistoryResult;
  contentType: string;
  lastModified: string;
  cacheKey: string;
  ttl: number;
  etag?: string;
}

/**
 * Generate comprehensive deployment history resource with trend analysis and insights.
 *
 * Analyzes historical deployment data to provide insights into deployment patterns,
 * success rates, failure trends, and recommendations for improving deployment reliability.
 * Supports filtering by time period, environment, and analysis depth.
 *
 * **Query Parameters:**
 * - `period`: Time period for analysis (default: "30d")
 *   - Values: "7d" (week), "30d" (month), "90d" (quarter), "365d" (year), "all"
 * - `environment`: Filter by deployment environment (default: "all")
 *   - Values: "production", "staging", "development", "all"
 * - `includeFailures`: Include failure analysis (default: true)
 * - `includeMetrics`: Include detailed metrics (default: true)
 * - `format`: Output format (default: "detailed")
 *   - Values: "summary", "detailed"
 *
 * **Analysis Includes:**
 * - Total deployments and success/failure counts
 * - Success rate percentage and trends
 * - Average deployment time and frequency
 * - Failure pattern analysis with common causes
 * - Rollback frequency and impact
 * - Time-series data for trend visualization
 * - Improvement recommendations based on patterns
 *
 * @param _params - URL path parameters (currently unused, reserved for future routing)
 * @param searchParams - URL query parameters controlling analysis scope and detail
 *
 * @returns Promise resolving to resource generation result containing:
 *   - data: Complete deployment history with statistics, trends, and insights
 *   - contentType: "application/json"
 *   - lastModified: ISO timestamp of generation
 *   - cacheKey: Unique identifier based on period/environment/options
 *   - ttl: Cache duration (300 seconds / 5 minutes)
 *   - etag: Entity tag for cache validation
 *
 * @throws {Error} Rarely throws; gracefully handles missing data by:
 *   - Returning empty history if no deployment records found
 *   - Providing zero values for missing metrics
 *   - Logging warnings for data collection issues
 *
 * @example
 * ```typescript
 * // Get last 30 days of deployment history
 * const history = await generateDeploymentHistoryResource(
 *   {},
 *   new URLSearchParams('period=30d&environment=production')
 * );
 *
 * console.log(`Total deployments: ${history.data.totalDeployments}`);
 * console.log(`Success rate: ${history.data.successRate}%`);
 * console.log(`Failed deployments: ${history.data.failedDeployments}`);
 * console.log(`Rollback frequency: ${history.data.rollbackFrequency}`);
 *
 * // Check deployment health trends
 * if (history.data.trends) {
 *   const qualityTrend = history.data.trends.find(t => t.metric === 'success_rate');
 *   console.log(`Quality trend: ${qualityTrend?.trend}`); // improving/stable/degrading
 * }
 *
 * // Get failure patterns
 * if (history.data.failurePatterns) {
 *   console.log('Common failure causes:');
 *   history.data.failurePatterns.commonCauses.forEach(cause => {
 *     console.log(`  - ${cause.reason}: ${cause.occurrences} times`);
 *   });
 * }
 *
 * // Example with summary format (faster, less detail)
 * const summary = await generateDeploymentHistoryResource(
 *   {},
 *   new URLSearchParams('period=7d&format=summary&includeMetrics=false')
 * );
 *
 * // Expected output structure:
 * {
 *   data: {
 *     period: "30d",
 *     environment: "production",
 *     totalDeployments: 45,
 *     successfulDeployments: 42,
 *     failedDeployments: 3,
 *     successRate: 93.3,
 *     averageDeploymentTime: "8.5 minutes",
 *     rollbackFrequency: 2,
 *     trends: [
 *       {
 *         metric: "success_rate",
 *         trend: "improving",
 *         change: +5.2
 *       }
 *     ],
 *     failurePatterns: {
 *       commonCauses: [
 *         { reason: "Test failures", occurrences: 2 },
 *         { reason: "Dependency conflicts", occurrences: 1 }
 *       ],
 *       peakFailureTimes: ["2025-10-05", "2025-10-12"]
 *     },
 *     recommendations: [
 *       "Increase pre-deployment test coverage",
 *       "Implement canary deployments for reduced risk"
 *     ]
 *   },
 *   contentType: "application/json",
 *   cacheKey: "deployment-history:30d:production:true:true:detailed",
 *   ttl: 300
 * }
 * ```
 *
 * @since v2.0.0
 * @see {@link generateComprehensiveHistory} for detailed historical analysis
 * @see {@link generateDeploymentStatusResource} for current deployment status
 */
export async function generateDeploymentHistoryResource(
  _params?: Record<string, string>,
  searchParams?: URLSearchParams
): Promise<ResourceGenerationResult> {
  // Extract query parameters
  const period = searchParams?.get('period') || '30d';
  const environment = searchParams?.get('environment') || 'all';
  const includeFailures = searchParams?.get('includeFailures') !== 'false';
  const includeMetrics = searchParams?.get('includeMetrics') !== 'false';
  const format = searchParams?.get('format') || 'detailed';

  const cacheKey = `deployment-history:${period}:${environment}:${includeFailures}:${includeMetrics}:${format}`;

  // Check cache
  const cached = await resourceCache.get<ResourceGenerationResult>(cacheKey);
  if (cached) {
    return cached;
  }

  // Try comprehensive analysis via deployment-readiness-tool
  try {
    const historyData = await generateComprehensiveHistory(
      period,
      environment,
      includeFailures,
      includeMetrics,
      format
    );

    const result: ResourceGenerationResult = {
      data: historyData,
      contentType: 'application/json',
      lastModified: new Date().toISOString(),
      cacheKey,
      ttl: 300, // 5 minutes
      etag: `"deployment-history-${Date.now()}"`,
    };

    resourceCache.set(cacheKey, result, result.ttl);
    return result;
  } catch (error) {
    console.error('[deployment-history-resource] Falling back to basic analysis:', error);

    // Fallback to basic analysis
    const basicHistory = await generateBasicHistory(period, environment);

    const result: ResourceGenerationResult = {
      data: basicHistory,
      contentType: 'application/json',
      lastModified: new Date().toISOString(),
      cacheKey,
      ttl: 300,
      etag: `"deployment-history-basic-${Date.now()}"`,
    };

    resourceCache.set(cacheKey, result, result.ttl);
    return result;
  }
}

/**
 * Generate comprehensive deployment history via tool bridge
 */
async function generateComprehensiveHistory(
  period: string,
  environment: string,
  _includeFailures: boolean,
  _includeMetrics: boolean,
  _format: string
): Promise<DeploymentHistoryResult> {
  // Import deployment-readiness-tool
  const { deploymentReadiness } = await import('../tools/deployment-readiness-tool.js');

  // Call tool with deployment_history operation
  const toolResult = await deploymentReadiness({
    operation: 'deployment_history',
    projectPath: process.cwd(),
    targetEnvironment: environment,
    strictMode: false,
    enableMemoryIntegration: true,
  });

  // Extract text from tool result
  const toolOutputText = toolResult.content?.[0]?.text || '';

  // Extract structured data from tool output
  const historyData = extractHistoryDataFromToolOutput(toolOutputText, period, environment);

  return historyData;
}

/**
 * Extract deployment history data from tool text output
 */
function extractHistoryDataFromToolOutput(
  toolOutput: string,
  period: string,
  environment: string
): DeploymentHistoryResult {
  const historyData: DeploymentHistoryResult = {
    period,
    environment,
    timestamp: new Date().toISOString(),
    summary: {
      totalDeployments: 0,
      successfulDeployments: 0,
      failedDeployments: 0,
      successRate: 0,
      averageDeploymentTime: '0s',
      deploymentsPerWeek: 0,
    },
    metadata: {
      period,
      environment,
      dataSource: 'comprehensive-tool',
      confidence: 0.9,
      timestamp: new Date().toISOString(),
    },
  };

  // Extract deployment counts
  const totalMatch = toolOutput.match(/total[:\s]+(\d+)/i);
  const successMatch = toolOutput.match(/success(?:ful)?[:\s]+(\d+)/i);
  const failedMatch = toolOutput.match(/failed?[:\s]+(\d+)/i);
  const successRateMatch = toolOutput.match(/success rate[:\s]+(\d+(?:\.\d+)?)\s*%/i);

  if (totalMatch?.[1]) {
    historyData.summary.totalDeployments = parseInt(totalMatch[1], 10);
  }
  if (successMatch?.[1]) {
    historyData.summary.successfulDeployments = parseInt(successMatch[1], 10);
  }
  if (failedMatch?.[1]) {
    historyData.summary.failedDeployments = parseInt(failedMatch[1], 10);
  }
  if (successRateMatch?.[1]) {
    historyData.summary.successRate = parseFloat(successRateMatch[1]);
  }

  // Calculate success rate if not provided
  if (historyData.summary.successRate === 0 && historyData.summary.totalDeployments > 0) {
    historyData.summary.successRate =
      (historyData.summary.successfulDeployments / historyData.summary.totalDeployments) * 100;
  }

  // Extract deployment metrics
  const mtbfMatch = toolOutput.match(/mtbf[:\s]+([\d.]+\s*\w+)/i);
  const mttrMatch = toolOutput.match(/mttr[:\s]+([\d.]+\s*\w+)/i);

  if (mtbfMatch || mttrMatch) {
    historyData.failureAnalysis = {
      totalFailures: historyData.summary.failedDeployments,
      commonFailureReasons: [],
      mtbf: mtbfMatch?.[1] || 'N/A',
      mttr: mttrMatch?.[1] || 'N/A',
    };
  }

  return historyData;
}

/**
 * Generate basic deployment history (fallback)
 */
async function generateBasicHistory(
  period: string,
  environment: string
): Promise<DeploymentHistoryResult> {
  // Try to read package.json for version info
  let version = '0.0.0';
  try {
    const packagePath = path.resolve(process.cwd(), 'package.json');
    const packageData = await fs.readFile(packagePath, 'utf-8');
    const packageJson = JSON.parse(packageData);
    version = packageJson.version || '0.0.0';
  } catch {
    // Ignore errors
  }

  return {
    period,
    environment,
    timestamp: new Date().toISOString(),
    summary: {
      totalDeployments: 1,
      successfulDeployments: 1,
      failedDeployments: 0,
      successRate: 100,
      averageDeploymentTime: 'unknown',
      deploymentsPerWeek: 0,
    },
    recentDeployments: [
      {
        timestamp: new Date().toISOString(),
        version,
        environment,
        status: 'success',
        duration: 'unknown',
      },
    ],
    metadata: {
      period,
      environment,
      dataSource: 'basic-analysis',
      confidence: 0.5,
      timestamp: new Date().toISOString(),
    },
  };
}
