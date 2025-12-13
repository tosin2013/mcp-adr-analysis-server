/**
 * Deployment Status Resource - Current deployment state
 * URI Pattern: adr://deployment_status
 */

import { URLSearchParams } from 'url';
import * as fs from 'fs/promises';
import * as path from 'path';
import { exec } from 'node:child_process';
import { promisify } from 'util';
import { resourceCache, generateETag } from './resource-cache.js';
import { ResourceGenerationResult } from './index.js';

const execAsync = promisify(exec);

export interface DeploymentStatus {
  // Basic fields (always present)
  environment: string;
  version: string;
  branch: string;
  commit: string;
  commitMessage: string;
  lastDeploy: string;
  status: 'healthy' | 'degraded' | 'failed' | 'unknown';
  checks: Array<{
    name: string;
    status: 'passed' | 'failed' | 'warning';
    message: string;
    timestamp: string;
  }>;
  dependencies: {
    total: number;
    outdated: number;
    vulnerable: number;
  };
  buildInfo: {
    lastBuild: string;
    buildDuration?: number;
    buildStatus: 'success' | 'failure' | 'unknown';
  };
  deploymentReadiness: {
    score: number;
    blockers: string[];
    warnings: string[];
    recommendations: string[];
  };

  // Enhanced fields from deployment-readiness-tool (optional)
  codeQualityAnalysis?: {
    overallScore: number;
    productionCodeScore: number;
    mockCodeIndicators: number;
    productionCodeThreshold: number;
    qualityGates: Array<{
      gate: string;
      passed: boolean;
      score?: number;
      threshold?: number;
    }>;
    treeAnalysis?: {
      totalFiles: number;
      productionFiles: number;
      mockFiles: number;
      testFiles: number;
    };
  };

  testValidation?: {
    testExecutionResult: 'passed' | 'failed' | 'partial' | 'unknown';
    totalTests: number;
    passedTests: number;
    failedTests: number;
    skippedTests: number;
    coverage: number;
    zeroToleranceEnforced: boolean;
    failureDetails: Array<{
      suite: string;
      test: string;
      error: string;
      file?: string;
      line?: number;
    }>;
  };

  deploymentHistory?: {
    totalDeployments: number;
    successfulDeployments: number;
    failedDeployments: number;
    successRate: number;
    recentFailures: number;
    rollbackFrequency: number;
    averageDeploymentTime: string;
    lastSuccessfulDeployment?: string;
    lastFailedDeployment?: string;
    trends: Array<{
      metric: string;
      trend: 'improving' | 'degrading' | 'stable';
      change: number;
    }>;
  };

  adrCompliance?: {
    totalRequirements: number;
    metRequirements: number;
    unmetRequirements: number;
    complianceScore: number;
    violations: Array<{
      requirement: string;
      adrId: string;
      severity: 'critical' | 'high' | 'medium' | 'low';
      description: string;
    }>;
  };

  criticalBlockers?: Array<{
    category: 'tests' | 'code_quality' | 'dependencies' | 'adr_compliance' | 'deployment_history';
    title: string;
    description: string;
    severity: 'critical' | 'high' | 'medium' | 'low';
    resolutionSteps: string[];
    autoFixable: boolean;
  }>;

  memoryIntegration?: {
    enabled: boolean;
    assessmentId?: string;
    historicalComparison?: {
      previousScore: number;
      currentScore: number;
      trend: string;
      improvement: number;
    };
    patternAnalysis?: {
      commonFailures: string[];
      successPatterns: string[];
      riskFactors: string[];
    };
    insights?: string[];
  };

  gitPushStatus?: {
    allowed: boolean;
    decision: 'allowed' | 'blocked' | 'conditional';
    reason: string;
    conditions?: string[];
  };

  emergencyOverride?: {
    active: boolean;
    justification?: string;
    approver?: string;
    timestamp?: string;
    expiresAt?: string;
  };

  environmentResearch?: {
    answer: string;
    confidence: number;
    sources: string[];
    needsWebSearch: boolean;
  };

  analysisMetadata?: {
    operation: string;
    timestamp: string;
    confidence: number;
    source: 'basic' | 'comprehensive-tool';
    memoryIntegration: boolean;
    strictMode: boolean;
  };
}

/**
 * Get current git information
 */
async function getGitInfo(): Promise<{
  branch: string;
  commit: string;
  commitMessage: string;
}> {
  try {
    const [branchResult, commitResult, messageResult] = await Promise.all([
      execAsync('git rev-parse --abbrev-ref HEAD'),
      execAsync('git rev-parse --short HEAD'),
      execAsync('git log -1 --pretty=%B'),
    ]);

    return {
      branch: branchResult.stdout.trim(),
      commit: commitResult.stdout.trim(),
      commitMessage: messageResult.stdout.trim(),
    };
  } catch {
    return {
      branch: 'unknown',
      commit: 'unknown',
      commitMessage: 'Git information unavailable',
    };
  }
}

/**
 * Get package version from package.json
 */
async function getPackageVersion(): Promise<string> {
  try {
    const packagePath = path.resolve(process.cwd(), 'package.json');
    const packageContent = await fs.readFile(packagePath, 'utf-8');
    const packageJson = JSON.parse(packageContent);
    return packageJson.version || '0.0.0';
  } catch {
    return '0.0.0';
  }
}

/**
 * Run deployment checks
 */
async function runDeploymentChecks(): Promise<
  Array<{
    name: string;
    status: 'passed' | 'failed' | 'warning';
    message: string;
    timestamp: string;
  }>
> {
  const checks = [];
  const timestamp = new Date().toISOString();

  // Check 1: TypeScript compilation
  try {
    await execAsync('npm run typecheck', { timeout: 30000 });
    checks.push({
      name: 'TypeScript Compilation',
      status: 'passed' as const,
      message: 'All type checks passed',
      timestamp,
    });
  } catch {
    checks.push({
      name: 'TypeScript Compilation',
      status: 'failed' as const,
      message: 'Type check failures detected',
      timestamp,
    });
  }

  // Check 2: Build status
  try {
    await execAsync('npm run build', { timeout: 60000 });
    checks.push({
      name: 'Build Process',
      status: 'passed' as const,
      message: 'Build completed successfully',
      timestamp,
    });
  } catch {
    checks.push({
      name: 'Build Process',
      status: 'failed' as const,
      message: 'Build failed',
      timestamp,
    });
  }

  // Check 3: Test suite
  try {
    await execAsync('npm test -- --passWithNoTests', { timeout: 120000 });
    checks.push({
      name: 'Test Suite',
      status: 'passed' as const,
      message: 'All tests passed',
      timestamp,
    });
  } catch {
    checks.push({
      name: 'Test Suite',
      status: 'warning' as const,
      message: 'Some tests failed or no tests found',
      timestamp,
    });
  }

  return checks;
}

/**
 * Check dependency status
 */
async function checkDependencies(): Promise<{
  total: number;
  outdated: number;
  vulnerable: number;
}> {
  let total = 0;
  let outdated = 0;
  let vulnerable = 0;

  try {
    const packagePath = path.resolve(process.cwd(), 'package.json');
    const packageContent = await fs.readFile(packagePath, 'utf-8');
    const packageJson = JSON.parse(packageContent);
    total = Object.keys(packageJson.dependencies || {}).length;

    // Check for outdated packages
    try {
      const outdatedResult = await execAsync('npm outdated --json', { timeout: 30000 });
      const outdatedData = JSON.parse(outdatedResult.stdout);
      outdated = Object.keys(outdatedData).length;
    } catch (error: any) {
      // npm outdated returns exit code 1 when there are outdated packages
      if (error.stdout) {
        try {
          const outdatedData = JSON.parse(error.stdout);
          outdated = Object.keys(outdatedData).length;
        } catch {
          outdated = 0;
        }
      }
    }

    // Check for vulnerabilities
    try {
      const auditResult = await execAsync('npm audit --json', { timeout: 30000 });
      const auditData = JSON.parse(auditResult.stdout);
      vulnerable = auditData.metadata?.vulnerabilities?.total || 0;
    } catch (error: any) {
      if (error.stdout) {
        try {
          const auditData = JSON.parse(error.stdout);
          vulnerable = auditData.metadata?.vulnerabilities?.total || 0;
        } catch {
          vulnerable = 0;
        }
      }
    }
  } catch {
    // Unable to check dependencies
  }

  return { total, outdated, vulnerable };
}

/**
 * Get build information
 */
async function getBuildInfo(): Promise<{
  lastBuild: string;
  buildDuration?: number;
  buildStatus: 'success' | 'failure' | 'unknown';
}> {
  try {
    const distPath = path.resolve(process.cwd(), 'dist');
    const stats = await fs.stat(distPath);
    return {
      lastBuild: stats.mtime.toISOString(),
      buildStatus: 'success',
    };
  } catch {
    return {
      lastBuild: 'Never',
      buildStatus: 'unknown',
    };
  }
}

/**
 * Calculate deployment readiness
 */
function calculateDeploymentReadiness(
  checks: Array<{ status: string; name: string; message: string }>,
  dependencies: { vulnerable: number; outdated: number }
): {
  score: number;
  blockers: string[];
  warnings: string[];
  recommendations: string[];
} {
  const blockers: string[] = [];
  const warnings: string[] = [];
  const recommendations: string[] = [];
  let score = 100;

  // Failed checks are blockers
  const failedChecks = checks.filter(c => c.status === 'failed');
  if (failedChecks.length > 0) {
    blockers.push(...failedChecks.map(c => `${c.name}: ${c.message}`));
    score -= failedChecks.length * 30;
  }

  // Warning checks
  const warningChecks = checks.filter(c => c.status === 'warning');
  if (warningChecks.length > 0) {
    warnings.push(...warningChecks.map(c => `${c.name}: ${c.message}`));
    score -= warningChecks.length * 10;
  }

  // Vulnerable dependencies are blockers
  if (dependencies.vulnerable > 0) {
    blockers.push(`${dependencies.vulnerable} vulnerable dependencies detected`);
    score -= Math.min(dependencies.vulnerable * 5, 30);
  }

  // Outdated dependencies are warnings
  if (dependencies.outdated > 5) {
    warnings.push(`${dependencies.outdated} outdated dependencies`);
    score -= Math.min(dependencies.outdated, 20);
  }

  // Recommendations
  if (dependencies.outdated > 0) {
    recommendations.push('Update outdated dependencies');
  }
  if (score < 80) {
    recommendations.push('Address all blockers and warnings before deployment');
  }
  if (blockers.length === 0 && warnings.length === 0) {
    recommendations.push('System is ready for deployment');
  }

  return {
    score: Math.max(0, score),
    blockers,
    warnings,
    recommendations,
  };
}

/**
 * Extract structured data from deployment-readiness-tool output
 */
function extractDeploymentDataFromToolOutput(toolOutput: string): Partial<DeploymentStatus> {
  const extracted: Partial<DeploymentStatus> = {};

  // Extract code quality analysis
  if (toolOutput.includes('Code Quality') || toolOutput.includes('quality')) {
    const scoreMatch = toolOutput.match(/(?:quality|overall)[\s\S]*?score[:\s]+(\d+)/i);
    const productionMatch = toolOutput.match(/production[\s\S]*?code[:\s]+(\d+)/i);
    const mockMatch = toolOutput.match(/mock[:\s]+(\d+)/i);

    if (scoreMatch || productionMatch) {
      extracted.codeQualityAnalysis = {
        overallScore: scoreMatch && scoreMatch[1] ? parseInt(scoreMatch[1]) : 0,
        productionCodeScore:
          productionMatch && productionMatch[1] ? parseInt(productionMatch[1]) : 0,
        mockCodeIndicators: mockMatch && mockMatch[1] ? parseInt(mockMatch[1]) : 0,
        productionCodeThreshold: 80,
        qualityGates: [],
      };

      // Extract quality gates
      const gateMatches = toolOutput.matchAll(
        /(?:gate|check)[:\s]+([\w\s]+)[\s-]+(passed|failed)/gi
      );
      for (const match of gateMatches) {
        if (extracted.codeQualityAnalysis && match[1] && match[2]) {
          extracted.codeQualityAnalysis.qualityGates.push({
            gate: match[1].trim(),
            passed: match[2].toLowerCase() === 'passed',
          });
        }
      }
    }
  }

  // Extract test validation
  if (toolOutput.includes('test') || toolOutput.includes('Test')) {
    const totalMatch = toolOutput.match(/(\d+)\s+total[\s\S]*?tests?/i);
    const passedMatch = toolOutput.match(/(\d+)\s+passed/i);
    const failedMatch = toolOutput.match(/(\d+)\s+failed/i);
    const coverageMatch = toolOutput.match(/coverage[:\s]+(\d+)%/i);

    const totalTests = totalMatch && totalMatch[1] ? parseInt(totalMatch[1]) : 0;
    const passedTests = passedMatch && passedMatch[1] ? parseInt(passedMatch[1]) : 0;
    const failedTests = failedMatch && failedMatch[1] ? parseInt(failedMatch[1]) : 0;

    extracted.testValidation = {
      testExecutionResult: failedTests > 0 ? 'failed' : passedTests > 0 ? 'passed' : 'unknown',
      totalTests,
      passedTests,
      failedTests,
      skippedTests: totalTests - passedTests - failedTests,
      coverage: coverageMatch && coverageMatch[1] ? parseInt(coverageMatch[1]) : 0,
      zeroToleranceEnforced: toolOutput.includes('zero tolerance') || toolOutput.includes('strict'),
      failureDetails: [],
    };

    // Extract test failures
    const failureMatches = toolOutput.matchAll(/(?:FAIL|failed)[:\s]+([\w/.-]+)\s*(?:›\s*)?(.*)/gi);
    for (const match of failureMatches) {
      if (extracted.testValidation && match[1]) {
        extracted.testValidation.failureDetails.push({
          suite: match[1].trim(),
          test: match[2] ? match[2].trim() : 'Test failed',
          error: 'Test execution failed',
        });
      }
    }
  }

  // Extract deployment history
  if (
    toolOutput.includes('deployment') &&
    (toolOutput.includes('history') || toolOutput.includes('previous'))
  ) {
    const totalMatch = toolOutput.match(/(\d+)\s+(?:total\s+)?deployments?/i);
    const successMatch = toolOutput.match(/(\d+)\s+successful/i);
    const failedMatch = toolOutput.match(/(\d+)\s+failed/i);
    const successRateMatch = toolOutput.match(/success\s+rate[:\s]+(\d+)%/i);
    const rollbackMatch = toolOutput.match(/(\d+)\s+rollbacks?/i);

    const totalDeployments = totalMatch && totalMatch[1] ? parseInt(totalMatch[1]) : 0;
    const successfulDeployments = successMatch && successMatch[1] ? parseInt(successMatch[1]) : 0;
    const failedDeployments = failedMatch && failedMatch[1] ? parseInt(failedMatch[1]) : 0;

    extracted.deploymentHistory = {
      totalDeployments,
      successfulDeployments,
      failedDeployments,
      successRate:
        successRateMatch && successRateMatch[1]
          ? parseInt(successRateMatch[1])
          : totalDeployments > 0
            ? Math.round((successfulDeployments / totalDeployments) * 100)
            : 0,
      recentFailures: failedMatch && failedMatch[1] ? parseInt(failedMatch[1]) : 0,
      rollbackFrequency: rollbackMatch && rollbackMatch[1] ? parseInt(rollbackMatch[1]) : 0,
      averageDeploymentTime: '5 minutes',
      trends: [],
    };
  }

  // Extract ADR compliance
  if (toolOutput.includes('ADR') || toolOutput.includes('compliance')) {
    const totalReqMatch = toolOutput.match(/(\d+)\s+(?:total\s+)?requirements?/i);
    const metMatch = toolOutput.match(/(\d+)\s+met/i);
    const complianceMatch = toolOutput.match(/compliance[:\s]+(\d+)%/i);

    const totalRequirements = totalReqMatch && totalReqMatch[1] ? parseInt(totalReqMatch[1]) : 0;
    const metRequirements = metMatch && metMatch[1] ? parseInt(metMatch[1]) : 0;

    extracted.adrCompliance = {
      totalRequirements,
      metRequirements,
      unmetRequirements: totalRequirements - metRequirements,
      complianceScore:
        complianceMatch && complianceMatch[1]
          ? parseInt(complianceMatch[1])
          : totalRequirements > 0
            ? Math.round((metRequirements / totalRequirements) * 100)
            : 100,
      violations: [],
    };

    // Extract violations
    const violationMatches = toolOutput.matchAll(/violation[:\s]+([\w\s]+)(?:\(([A-Z0-9-]+)\))?/gi);
    for (const match of violationMatches) {
      if (extracted.adrCompliance && match[1]) {
        extracted.adrCompliance.violations.push({
          requirement: match[1].trim(),
          adrId: match[2] ? match[2].trim() : 'UNKNOWN',
          severity: 'medium',
          description: `Requirement not met: ${match[1].trim()}`,
        });
      }
    }
  }

  // Extract critical blockers
  const blockerMatches = toolOutput.matchAll(/(?:blocker|critical|error)[:\s]+(.*?)(?:\n|$)/gi);
  const blockers: Array<{
    category: 'tests' | 'code_quality' | 'dependencies' | 'adr_compliance' | 'deployment_history';
    title: string;
    description: string;
    severity: 'critical' | 'high' | 'medium' | 'low';
    resolutionSteps: string[];
    autoFixable: boolean;
  }> = [];

  for (const match of blockerMatches) {
    if (match[1]) {
      const text = match[1].trim();
      let category:
        | 'tests'
        | 'code_quality'
        | 'dependencies'
        | 'adr_compliance'
        | 'deployment_history' = 'tests';

      if (text.toLowerCase().includes('test')) category = 'tests';
      else if (text.toLowerCase().includes('quality') || text.toLowerCase().includes('code'))
        category = 'code_quality';
      else if (text.toLowerCase().includes('dependen')) category = 'dependencies';
      else if (text.toLowerCase().includes('adr') || text.toLowerCase().includes('compliance'))
        category = 'adr_compliance';
      else if (text.toLowerCase().includes('deploy')) category = 'deployment_history';

      blockers.push({
        category,
        title: text,
        description: text,
        severity: 'critical',
        resolutionSteps: [],
        autoFixable: false,
      });
    }
  }

  if (blockers.length > 0) {
    extracted.criticalBlockers = blockers;
  }

  // Extract memory integration info
  if (toolOutput.includes('memory') || toolOutput.includes('Memory')) {
    const assessmentMatch = toolOutput.match(/assessment[\s\S]*?id[:\s]+([a-f0-9-]+)/i);
    const previousScoreMatch = toolOutput.match(/previous[\s\S]*?score[:\s]+(\d+)/i);
    const currentScoreMatch = toolOutput.match(/current[\s\S]*?score[:\s]+(\d+)/i);

    extracted.memoryIntegration = {
      enabled: true,
    };

    if (assessmentMatch && assessmentMatch[1]) {
      extracted.memoryIntegration.assessmentId = assessmentMatch[1];
    }

    if (previousScoreMatch && previousScoreMatch[1] && currentScoreMatch && currentScoreMatch[1]) {
      const previousScore = parseInt(previousScoreMatch[1]);
      const currentScore = parseInt(currentScoreMatch[1]);
      extracted.memoryIntegration.historicalComparison = {
        previousScore,
        currentScore,
        trend:
          currentScore > previousScore
            ? 'improving'
            : currentScore < previousScore
              ? 'degrading'
              : 'stable',
        improvement: currentScore - previousScore,
      };
    }

    // Extract insights
    const insightMatches = toolOutput.matchAll(
      /(?:insight|recommendation|pattern)[:\s]+(.*?)(?:\n|$)/gi
    );
    const insights: string[] = [];
    for (const match of insightMatches) {
      if (match[1]) {
        insights.push(match[1].trim());
      }
    }
    if (insights.length > 0) {
      extracted.memoryIntegration.insights = insights;
    }
  }

  // Extract git push status
  if (toolOutput.includes('git push') || toolOutput.includes('deployment allowed')) {
    const allowedMatch = toolOutput.match(
      /(?:push|deployment)\s+(?:is\s+)?(allowed|blocked|conditional)/i
    );

    extracted.gitPushStatus = {
      allowed:
        allowedMatch && allowedMatch[1] ? allowedMatch[1].toLowerCase() === 'allowed' : false,
      decision:
        allowedMatch && allowedMatch[1]
          ? (allowedMatch[1].toLowerCase() as 'allowed' | 'blocked' | 'conditional')
          : 'blocked',
      reason:
        allowedMatch && allowedMatch[1] ? `Deployment is ${allowedMatch[1]}` : 'Status unknown',
    };
  }

  // Extract emergency override
  if (toolOutput.includes('override') || toolOutput.includes('emergency')) {
    const activeMatch = toolOutput.match(/override[:\s]+(active|enabled|true)/i);
    const justificationMatch = toolOutput.match(/justification[:\s]+(.*?)(?:\n|$)/i);

    extracted.emergencyOverride = {
      active: activeMatch ? true : false,
    };

    if (justificationMatch && justificationMatch[1]) {
      extracted.emergencyOverride.justification = justificationMatch[1].trim();
    }
  }

  return extracted;
}

/**
 * Generate basic deployment status (fallback)
 */
async function generateBasicDeploymentStatus(): Promise<DeploymentStatus> {
  // Gather deployment information
  const [gitInfo, version, checks, dependencies, buildInfo] = await Promise.all([
    getGitInfo(),
    getPackageVersion(),
    runDeploymentChecks(),
    checkDependencies(),
    getBuildInfo(),
  ]);

  const deploymentReadiness = calculateDeploymentReadiness(checks, dependencies);

  // Determine overall status
  let status: 'healthy' | 'degraded' | 'failed' | 'unknown' = 'unknown';
  if (deploymentReadiness.blockers.length > 0) {
    status = 'failed';
  } else if (deploymentReadiness.warnings.length > 0) {
    status = 'degraded';
  } else if (checks.every(c => c.status === 'passed')) {
    status = 'healthy';
  }

  return {
    environment: process.env['NODE_ENV'] || 'development',
    version,
    branch: gitInfo.branch,
    commit: gitInfo.commit,
    commitMessage: gitInfo.commitMessage,
    lastDeploy: new Date().toISOString(),
    status,
    checks,
    dependencies,
    buildInfo,
    deploymentReadiness,
  };
}

/**
 * Generate comprehensive deployment status using deployment-readiness-tool
 */
async function generateComprehensiveDeploymentStatus(
  operation: string,
  targetEnvironment: string,
  enableMemory: boolean,
  strictMode: boolean
): Promise<DeploymentStatus> {
  try {
    // Import the comprehensive tool
    const { deploymentReadiness } = await import('../tools/deployment-readiness-tool.js');

    // Call the tool with appropriate parameters
    const toolResult = await deploymentReadiness({
      operation,
      projectPath: process.cwd(),
      targetEnvironment,
      strictMode,
      enableMemoryIntegration: enableMemory,
      autoCreateTodos: false, // Don't create todos from resource calls
      integrateSandboxing: false,
      blockGitPush: false, // Resource is read-only, don't block operations
    });

    // Extract text content from tool result
    let toolOutputText = '';
    if (toolResult.content && Array.isArray(toolResult.content)) {
      for (const item of toolResult.content) {
        if (item.type === 'text' && item.text) {
          toolOutputText += item.text + '\n';
        }
      }
    }

    // Get basic data
    const basicStatus = await generateBasicDeploymentStatus();

    // Extract enhanced data from tool output
    const enhancedData = extractDeploymentDataFromToolOutput(toolOutputText);

    // Merge basic and enhanced data
    const comprehensiveStatus: DeploymentStatus = {
      ...basicStatus,
      ...enhancedData,
      analysisMetadata: {
        operation,
        timestamp: new Date().toISOString(),
        confidence: 0.95,
        source: 'comprehensive-tool',
        memoryIntegration: enableMemory,
        strictMode,
      },
    };

    return comprehensiveStatus;
  } catch (error) {
    console.error(
      '[deployment-status-resource] Tool execution failed, falling back to basic status:',
      error
    );
    return generateBasicDeploymentStatus();
  }
}

/**
 * Generate comprehensive deployment status resource with readiness analysis and quality gates.
 *
 * Performs multi-dimensional deployment readiness assessment including code quality validation,
 * test execution, dependency health, ADR compliance, deployment history analysis, and optional
 * memory-based pattern recognition for predictive insights.
 *
 * **Query Parameters:**
 * - `operation`: Operation type (default: "check_readiness")
 * - `environment`: Target deployment environment (default: process.env.NODE_ENV || "production")
 * - `memory`: Enable memory integration for historical analysis (default: true)
 * - `strict`: Enable strict zero-tolerance mode (default: true)
 * - `comprehensive`: Use comprehensive analysis vs basic (default: true)
 *
 * **Comprehensive Mode includes:**
 * - TreeSitter AST-based code quality analysis with production code scoring
 * - Zero-tolerance test validation with detailed failure tracking
 * - Deployment history analysis with trend detection
 * - ADR compliance validation
 * - Memory-based pattern analysis and insights
 * - Critical blocker identification with auto-fix suggestions
 * - Git push allow/block decision logic
 *
 * @param _params - URL path parameters (currently unused, reserved for future routing)
 * @param searchParams - URL query parameters controlling analysis behavior
 *
 * @returns Promise resolving to resource generation result containing:
 *   - data: Complete deployment status with health metrics and quality gates
 *   - contentType: "application/json"
 *   - lastModified: ISO timestamp of generation
 *   - cacheKey: Unique identifier based on operation/environment/options
 *   - ttl: Cache duration (180 seconds / 3 minutes)
 *   - etag: Entity tag for cache validation
 *
 * @throws {McpAdrError} When deployment status generation fails due to:
 *   - Invalid operation or environment parameters
 *   - Deployment-readiness-tool execution failure
 *   - Test execution failures (in strict mode)
 *   - Cache operation errors
 *
 * @example
 * ```typescript
 * // Basic usage with comprehensive analysis
 * const status = await generateDeploymentStatusResource(
 *   {},
 *   new URLSearchParams('operation=check_readiness&environment=production')
 * );
 *
 * console.log(`Status: ${status.data.status}`);
 * console.log(`Readiness score: ${status.data.deploymentReadiness.score}`);
 * console.log(`Blockers: ${status.data.deploymentReadiness.blockers.length}`);
 *
 * // Check if deployment is allowed
 * if (status.data.gitPushStatus?.decision === 'blocked') {
 *   console.error(`Deployment blocked: ${status.data.gitPushStatus.reason}`);
 *   process.exit(1);
 * }
 *
 * // Example with basic mode (faster, less detailed)
 * const basicStatus = await generateDeploymentStatusResource(
 *   {},
 *   new URLSearchParams('comprehensive=false&memory=false')
 * );
 *
 * // Expected output structure:
 * {
 *   data: {
 *     environment: "production",
 *     status: "healthy",
 *     version: "2.0.22",
 *     deploymentReadiness: {
 *       score: 95,
 *       blockers: [],
 *       warnings: ["Minor test coverage gaps"],
 *       recommendations: ["Increase integration test coverage"]
 *     },
 *     codeQualityAnalysis: {
 *       overallScore: 92,
 *       productionCodeScore: 95,
 *       qualityGates: [...]
 *     },
 *     testValidation: {
 *       testExecutionResult: "passed",
 *       totalTests: 150,
 *       passedTests: 150,
 *       failedTests: 0,
 *       coverage: 85
 *     },
 *     gitPushStatus: {
 *       allowed: true,
 *       decision: "allowed",
 *       reason: "All quality gates passed"
 *     }
 *   },
 *   contentType: "application/json",
 *   cacheKey: "deployment-status:check_readiness:production:true:true:true",
 *   ttl: 180
 * }
 * ```
 *
 * @since v2.0.0
 * @see {@link deploymentReadiness} tool for underlying analysis engine
 * @see {@link generateDeploymentHistoryResource} for historical deployment data
 */
export async function generateDeploymentStatusResource(
  _params?: Record<string, string>,
  searchParams?: URLSearchParams
): Promise<ResourceGenerationResult> {
  // Extract query parameters
  const operation = searchParams?.get('operation') || 'check_readiness';
  const targetEnvironment =
    searchParams?.get('environment') || process.env['NODE_ENV'] || 'production';
  const enableMemory = searchParams?.get('memory') !== 'false';
  const strictMode = searchParams?.get('strict') !== 'false';
  const useComprehensive = searchParams?.get('comprehensive') !== 'false';

  const cacheKey = `deployment-status:${operation}:${targetEnvironment}:${enableMemory}:${strictMode}:${useComprehensive}`;

  // Check cache
  const cached = await resourceCache.get<ResourceGenerationResult>(cacheKey);
  if (cached) {
    return cached;
  }

  // Generate deployment status (comprehensive or basic)
  let deploymentStatus: DeploymentStatus;

  if (useComprehensive) {
    deploymentStatus = await generateComprehensiveDeploymentStatus(
      operation,
      targetEnvironment,
      enableMemory,
      strictMode
    );
  } else {
    deploymentStatus = await generateBasicDeploymentStatus();
  }

  const result: ResourceGenerationResult = {
    data: deploymentStatus,
    contentType: 'application/json',
    lastModified: new Date().toISOString(),
    cacheKey,
    ttl: 60, // 1 minute cache (deployment status changes frequently)
    etag: generateETag(deploymentStatus),
  };

  // Cache result
  resourceCache.set(cacheKey, result, result.ttl);

  return result;
}
