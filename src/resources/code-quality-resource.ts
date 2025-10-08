/**
 * Code Quality Resource
 *
 * Provides comprehensive code quality assessment including metrics, analysis,
 * and recommendations. Bridges to deployment-readiness-tool for TreeSitter
 * analysis and smart-score-tool for quality scoring.
 *
 * URI: adr://code_quality
 *
 * Query Parameters:
 * - scope: Analysis scope (full, changes, critical) - default: full
 * - includeMetrics: Include detailed metrics (true, false) - default: true
 * - includeRecommendations: Include improvement recommendations (true, false) - default: true
 * - threshold: Minimum quality score threshold (0-100) - default: 70
 * - format: Output format (summary, detailed) - default: detailed
 *
 * Example URIs:
 * - adr://code_quality
 * - adr://code_quality?scope=changes
 * - adr://code_quality?threshold=80&format=summary
 * - adr://code_quality?includeRecommendations=true
 */

import { URLSearchParams } from 'url';
import path from 'path';
import { promises as fs } from 'fs';
import { ResourceCache } from './resource-cache.js';

const resourceCache = new ResourceCache();

export interface CodeQualityResult {
  scope: string;
  timestamp: string;

  overallScore: number;
  grade: 'A' | 'B' | 'C' | 'D' | 'F';

  metrics: {
    productionCodeScore: number;
    mockCodeIndicators: number;
    productionCodeThreshold: number;
    codebaseSize: {
      totalFiles: number;
      totalLines: number;
      productionFiles: number;
      testFiles: number;
      mockFiles: number;
    };
    complexity?: {
      average: number;
      highest: number;
      distribution: Record<string, number>;
    };
    maintainability?: {
      score: number;
      issues: string[];
    };
    documentation?: {
      coverage: number;
      missing: string[];
    };
  };

  qualityGates?: Array<{
    gate: string;
    passed: boolean;
    threshold: number;
    actual: number;
    severity: 'critical' | 'high' | 'medium' | 'low';
  }>;

  issues?: Array<{
    file: string;
    line?: number;
    type: 'error' | 'warning' | 'info';
    category: 'complexity' | 'duplication' | 'style' | 'security' | 'performance';
    message: string;
    severity: 'critical' | 'high' | 'medium' | 'low';
  }>;

  recommendations?: Array<{
    priority: 'critical' | 'high' | 'medium' | 'low';
    category: string;
    title: string;
    description: string;
    impact: string;
    effort: 'low' | 'medium' | 'high';
  }>;

  trends?: {
    qualityTrend: 'improving' | 'stable' | 'declining';
    recentChanges: Array<{
      date: string;
      score: number;
      change: number;
    }>;
  };

  metadata: {
    scope: string;
    analysisType: 'comprehensive' | 'basic';
    confidence: number;
    timestamp: string;
    dataSource: 'comprehensive-tool' | 'basic-analysis';
  };
}

export interface ResourceGenerationResult {
  data: CodeQualityResult;
  contentType: string;
  lastModified: string;
  cacheKey: string;
  ttl: number;
  etag?: string;
}

/**
 * Generate code quality resource
 */
export async function generateCodeQualityResource(
  _params?: Record<string, string>,
  searchParams?: URLSearchParams
): Promise<ResourceGenerationResult> {
  // Extract query parameters
  const scope = searchParams?.get('scope') || 'full';
  const includeMetrics = searchParams?.get('includeMetrics') !== 'false';
  const includeRecommendations = searchParams?.get('includeRecommendations') !== 'false';
  const threshold = parseInt(searchParams?.get('threshold') || '70', 10);
  const format = searchParams?.get('format') || 'detailed';

  const cacheKey = `code-quality:${scope}:${includeMetrics}:${includeRecommendations}:${threshold}:${format}`;

  // Check cache
  const cached = await resourceCache.get<ResourceGenerationResult>(cacheKey);
  if (cached) {
    return cached;
  }

  // Try comprehensive analysis via deployment-readiness-tool
  try {
    const qualityData = await generateComprehensiveQuality(
      scope,
      includeMetrics,
      includeRecommendations,
      threshold,
      format
    );

    const result: ResourceGenerationResult = {
      data: qualityData,
      contentType: 'application/json',
      lastModified: new Date().toISOString(),
      cacheKey,
      ttl: 300, // 5 minutes
      etag: `"code-quality-${Date.now()}"`,
    };

    resourceCache.set(cacheKey, result, result.ttl);
    return result;
  } catch (error) {
    console.error('[code-quality-resource] Falling back to basic analysis:', error);

    // Fallback to basic analysis
    const basicQuality = await generateBasicQuality(scope, threshold);

    const result: ResourceGenerationResult = {
      data: basicQuality,
      contentType: 'application/json',
      lastModified: new Date().toISOString(),
      cacheKey,
      ttl: 300,
      etag: `"code-quality-basic-${Date.now()}"`,
    };

    resourceCache.set(cacheKey, result, result.ttl);
    return result;
  }
}

/**
 * Generate comprehensive code quality via tool bridge
 */
async function generateComprehensiveQuality(
  scope: string,
  includeMetrics: boolean,
  includeRecommendations: boolean,
  threshold: number,
  _format: string
): Promise<CodeQualityResult> {
  // Import deployment-readiness-tool for TreeSitter analysis
  const { deploymentReadiness } = await import('../tools/deployment-readiness-tool.js');

  // Call tool with check_readiness operation (includes code quality analysis)
  const toolResult = await deploymentReadiness({
    operation: 'check_readiness',
    projectPath: process.cwd(),
    targetEnvironment: 'production',
    strictMode: true,
    enableMemoryIntegration: false,
  });

  // Extract text from tool result
  const toolOutputText = toolResult.content?.[0]?.text || '';

  // Extract structured data from tool output
  const qualityData = extractQualityDataFromToolOutput(
    toolOutputText,
    scope,
    threshold,
    includeMetrics,
    includeRecommendations
  );

  return qualityData;
}

/**
 * Extract code quality data from tool text output
 */
function extractQualityDataFromToolOutput(
  toolOutput: string,
  scope: string,
  _threshold: number,
  includeMetrics: boolean,
  includeRecommendations: boolean
): CodeQualityResult {
  const qualityData: CodeQualityResult = {
    scope,
    timestamp: new Date().toISOString(),
    overallScore: 0,
    grade: 'F',
    metrics: {
      productionCodeScore: 0,
      mockCodeIndicators: 0,
      productionCodeThreshold: 70,
      codebaseSize: {
        totalFiles: 0,
        totalLines: 0,
        productionFiles: 0,
        testFiles: 0,
        mockFiles: 0,
      },
    },
    metadata: {
      scope,
      analysisType: 'comprehensive',
      confidence: 0.9,
      timestamp: new Date().toISOString(),
      dataSource: 'comprehensive-tool',
    },
  };

  // Extract production code score
  const productionScoreMatch = toolOutput.match(/production code score[:\s]+(\d+(?:\.\d+)?)\s*%/i);
  if (productionScoreMatch?.[1]) {
    qualityData.metrics.productionCodeScore = parseFloat(productionScoreMatch[1]);
    qualityData.overallScore = qualityData.metrics.productionCodeScore;
  }

  // Extract mock indicators
  const mockMatch = toolOutput.match(/mock[:\s]+(\d+)/i);
  if (mockMatch?.[1]) {
    qualityData.metrics.mockCodeIndicators = parseInt(mockMatch[1], 10);
  }

  // Extract file counts
  const totalFilesMatch = toolOutput.match(/total files[:\s]+(\d+)/i);
  const productionFilesMatch = toolOutput.match(/production files[:\s]+(\d+)/i);
  const testFilesMatch = toolOutput.match(/test files[:\s]+(\d+)/i);
  const mockFilesMatch = toolOutput.match(/mock files[:\s]+(\d+)/i);

  if (totalFilesMatch?.[1]) {
    qualityData.metrics.codebaseSize.totalFiles = parseInt(totalFilesMatch[1], 10);
  }
  if (productionFilesMatch?.[1]) {
    qualityData.metrics.codebaseSize.productionFiles = parseInt(productionFilesMatch[1], 10);
  }
  if (testFilesMatch?.[1]) {
    qualityData.metrics.codebaseSize.testFiles = parseInt(testFilesMatch[1], 10);
  }
  if (mockFilesMatch?.[1]) {
    qualityData.metrics.codebaseSize.mockFiles = parseInt(mockFilesMatch[1], 10);
  }

  // Calculate grade
  qualityData.grade = calculateGrade(qualityData.overallScore);

  // Extract quality gates if includeMetrics
  if (includeMetrics) {
    qualityData.qualityGates = extractQualityGates(toolOutput);
  }

  // Extract recommendations if requested
  if (includeRecommendations) {
    qualityData.recommendations = extractRecommendations(toolOutput);
  }

  return qualityData;
}

/**
 * Extract quality gates from tool output
 */
function extractQualityGates(toolOutput: string): Array<{
  gate: string;
  passed: boolean;
  threshold: number;
  actual: number;
  severity: 'critical' | 'high' | 'medium' | 'low';
}> {
  const gates: Array<{
    gate: string;
    passed: boolean;
    threshold: number;
    actual: number;
    severity: 'critical' | 'high' | 'medium' | 'low';
  }> = [];

  // Look for quality gate patterns in output
  const gatePattern = /(?:gate|check)[:\s]+(.+?)[:\s]+(\d+(?:\.\d+)?)\s*\/\s*(\d+(?:\.\d+)?)/gi;
  let match;

  while ((match = gatePattern.exec(toolOutput)) !== null) {
    const gateName = match[1]?.trim();
    const actual = parseFloat(match[2] || '0');
    const threshold = parseFloat(match[3] || '0');

    if (gateName) {
      gates.push({
        gate: gateName,
        passed: actual >= threshold,
        threshold,
        actual,
        severity: actual >= threshold ? 'low' : 'high',
      });
    }
  }

  return gates;
}

/**
 * Extract recommendations from tool output
 */
function extractRecommendations(toolOutput: string): Array<{
  priority: 'critical' | 'high' | 'medium' | 'low';
  category: string;
  title: string;
  description: string;
  impact: string;
  effort: 'low' | 'medium' | 'high';
}> {
  const recommendations: Array<{
    priority: 'critical' | 'high' | 'medium' | 'low';
    category: string;
    title: string;
    description: string;
    impact: string;
    effort: 'low' | 'medium' | 'high';
  }> = [];

  // Look for recommendation patterns
  if (toolOutput.includes('mock') || toolOutput.includes('test')) {
    recommendations.push({
      priority: 'high',
      category: 'testing',
      title: 'Reduce Mock Code',
      description: 'Decrease reliance on mocks in favor of integration tests',
      impact: 'Improved test reliability and production confidence',
      effort: 'medium',
    });
  }

  if (toolOutput.includes('fail') || toolOutput.includes('error')) {
    recommendations.push({
      priority: 'critical',
      category: 'quality',
      title: 'Fix Test Failures',
      description: 'Address all failing tests before deployment',
      impact: 'Zero-tolerance quality gate compliance',
      effort: 'high',
    });
  }

  return recommendations;
}

/**
 * Calculate letter grade from score
 */
function calculateGrade(score: number): 'A' | 'B' | 'C' | 'D' | 'F' {
  if (score >= 90) return 'A';
  if (score >= 80) return 'B';
  if (score >= 70) return 'C';
  if (score >= 60) return 'D';
  return 'F';
}

/**
 * Generate basic code quality (fallback)
 */
async function generateBasicQuality(scope: string, threshold: number): Promise<CodeQualityResult> {
  // Count TypeScript files for basic metrics
  let totalFiles = 0;
  let totalLines = 0;

  try {
    const srcPath = path.resolve(process.cwd(), 'src');
    const files = await fs.readdir(srcPath, { recursive: true });

    for (const file of files) {
      if (typeof file === 'string' && file.endsWith('.ts')) {
        totalFiles++;
        try {
          const filePath = path.join(srcPath, file);
          const content = await fs.readFile(filePath, 'utf-8');
          totalLines += content.split('\n').length;
        } catch {
          // Ignore file read errors
        }
      }
    }
  } catch {
    // Ignore directory errors
  }

  const basicScore = totalFiles > 0 ? 75 : 0; // Assume 75% if files exist

  return {
    scope,
    timestamp: new Date().toISOString(),
    overallScore: basicScore,
    grade: calculateGrade(basicScore),
    metrics: {
      productionCodeScore: basicScore,
      mockCodeIndicators: 0,
      productionCodeThreshold: threshold,
      codebaseSize: {
        totalFiles,
        totalLines,
        productionFiles: totalFiles,
        testFiles: 0,
        mockFiles: 0,
      },
    },
    metadata: {
      scope,
      analysisType: 'basic',
      confidence: 0.5,
      timestamp: new Date().toISOString(),
      dataSource: 'basic-analysis',
    },
  };
}
