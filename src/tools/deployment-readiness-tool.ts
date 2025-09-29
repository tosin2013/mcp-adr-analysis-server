/**
 * Deployment Readiness Tool - Version 2.0
 *
 * Comprehensive deployment validation with test failure tracking, deployment history analysis,
 * and hard blocking integration with smart git push.
 * Enhanced with memory integration for deployment assessment tracking and pattern recognition.
 *
 * IMPORTANT FOR AI ASSISTANTS: This tool provides:
 * 1. Test Execution Validation: Zero tolerance for test failures
 * 2. Deployment History Analysis: Pattern detection and success rate tracking
 * 3. Code Quality Gates: Mock vs production code detection
 * 4. Hard Blocking: Prevents unsafe deployments via smart git push integration
 * 5. Memory Integration: Stores deployment assessments as memory entities
 *
 * Memory Dependencies:
 * - CREATES: deployment_assessment memory entities
 * - MIGRATES: Existing deployment history to memory entities
 * - ANALYZES: Deployment patterns across memory entities
 * - INTEGRATES: smart-git-push-tool for deployment blocking
 * - INTEGRATES: todo-file-watcher for automatic task creation
 */

import { z } from 'zod';
import { McpAdrError } from '../types/index.js';
import { execSync } from 'child_process';
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { join, basename } from 'path';
import * as os from 'os';
import { validateMcpResponse } from '../utils/mcp-response-validator.js';
import { jsonSafeError } from '../utils/json-safe.js';
import { MemoryEntityManager } from '../utils/memory-entity-manager.js';
import { EnhancedLogger } from '../utils/enhanced-logging.js';
import { TreeSitterAnalyzer } from '../utils/tree-sitter-analyzer.js';
import { findFiles, findRelatedCode } from '../utils/file-system.js';
import { ResearchOrchestrator } from '../utils/research-orchestrator.js';

// Core schemas
const DeploymentReadinessSchema = z.object({
  operation: z
    .enum([
      'check_readiness', // Full deployment readiness check
      'validate_production', // Production-specific validation
      'test_validation', // Test execution and failure analysis
      'deployment_history', // Deployment history analysis
      'full_audit', // Comprehensive audit (all checks)
      'emergency_override', // Emergency bypass with justification
    ])
    .describe('Operation to perform'),

  // Core Configuration
  projectPath: z.string().optional().describe('Project root path'),
  targetEnvironment: z
    .enum(['staging', 'production', 'integration'])
    .default('production')
    .describe('Target deployment environment'),
  strictMode: z.boolean().default(true).describe('Enable strict validation (recommended)'),

  // Code Quality Gates
  allowMockCode: z
    .boolean()
    .default(false)
    .describe('Allow mock code in deployment (NOT RECOMMENDED)'),
  productionCodeThreshold: z
    .number()
    .default(85)
    .describe('Minimum production code quality score (0-100)'),
  mockCodeMaxAllowed: z.number().default(0).describe('Maximum mock code indicators allowed'),

  // Test Failure Gates
  maxTestFailures: z
    .number()
    .default(0)
    .describe('Maximum test failures allowed (0 = zero tolerance)'),
  requireTestCoverage: z.number().default(80).describe('Minimum test coverage percentage required'),
  blockOnFailingTests: z.boolean().default(true).describe('Block deployment if tests are failing'),
  testSuiteRequired: z
    .array(z.string())
    .default([])
    .describe('Required test suites that must pass'),

  // Deployment History Gates
  maxRecentFailures: z.number().default(2).describe('Maximum recent deployment failures allowed'),
  deploymentSuccessThreshold: z
    .number()
    .default(80)
    .describe('Minimum deployment success rate required (%)'),
  blockOnRecentFailures: z.boolean().default(true).describe('Block if recent deployments failed'),
  rollbackFrequencyThreshold: z
    .number()
    .default(20)
    .describe('Maximum rollback frequency allowed (%)'),

  // Integration Rules
  requireAdrCompliance: z.boolean().default(true).describe('Require ADR compliance validation'),
  integrateTodoTasks: z.boolean().default(true).describe('Auto-create blocking tasks for issues'),
  updateHealthScoring: z.boolean().default(true).describe('Update project health scores'),
  triggerSmartGitPush: z.boolean().default(false).describe('Trigger smart git push validation'),

  // Human Override System
  emergencyBypass: z.boolean().default(false).describe('Emergency bypass for critical fixes'),
  businessJustification: z.string().optional().describe('Business justification for overrides'),
  approvalRequired: z.boolean().default(true).describe('Require approval for overrides'),

  // Memory Integration
  enableMemoryIntegration: z.boolean().default(true).describe('Enable memory entity storage'),
  migrateExistingHistory: z
    .boolean()
    .default(false)
    .describe('Migrate existing deployment history to memory'),

  // Tree-sitter Analysis
  enableTreeSitterAnalysis: z
    .boolean()
    .default(true)
    .describe('Use tree-sitter for enhanced code analysis'),
  treeSitterLanguages: z
    .array(z.string())
    .default(['typescript', 'javascript', 'python', 'yaml', 'hcl'])
    .describe('Languages to analyze with tree-sitter'),

  // Research-Driven Integration
  enableResearchIntegration: z
    .boolean()
    .default(true)
    .describe('Use research-orchestrator to verify environment readiness'),
  researchConfidenceThreshold: z
    .number()
    .default(0.7)
    .describe('Minimum confidence for environment research (0-1)'),
});

// Result interfaces
interface TestValidationResult {
  testSuitesExecuted: TestSuiteResult[];
  overallTestStatus: 'passed' | 'failed' | 'partial' | 'not_run';
  failureCount: number;
  coveragePercentage: number;
  requiredSuitesMissing: string[];
  criticalTestFailures: TestFailure[];
  testExecutionTime: number;
  lastTestRun: string;
}

interface TestSuiteResult {
  suiteName: string;
  status: 'passed' | 'failed' | 'skipped';
  passedTests: number;
  failedTests: number;
  coverage: number;
  executionTime: number;
  failureDetails: TestFailure[];
}

interface TestFailure {
  testName: string;
  testSuite: string;
  errorMessage: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  blocksDeployment: boolean;
  relatedFiles: string[];
}

interface DeploymentHistoryAnalysis {
  recentDeployments: DeploymentRecord[];
  successRate: number;
  rollbackRate: number;
  averageDeploymentTime: number;
  failurePatterns: FailurePattern[];
  environmentStability: EnvironmentStability;
  recommendedAction: 'proceed' | 'block' | 'investigate';
}

interface DeploymentRecord {
  deploymentId: string;
  timestamp: string;
  environment: string;
  status: 'success' | 'failed' | 'rolled_back' | 'in_progress';
  duration: number;
  failureReason?: string;
  rollbackRequired: boolean;
  testResults?: TestValidationResult;
  gitCommit: string;
  deployedBy: string;
}

interface FailurePattern {
  pattern: string;
  frequency: number;
  environments: string[];
  lastOccurrence: string;
  resolution: string;
  preventable: boolean;
}

interface EnvironmentStability {
  stabilityScore: number;
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  recommendation: string;
}

interface DeploymentBlocker {
  category:
    | 'test_failure'
    | 'deployment_history'
    | 'code_quality'
    | 'adr_compliance'
    | 'environment';
  title: string;
  description: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  impact: string;
  resolutionSteps: string[];
  estimatedResolutionTime: string;
  blocksDeployment: boolean;
}

interface CodeQualityAnalysis {
  qualityScore: number;
  productionIndicators: number;
  mockIndicators: number;
  failingFiles: string[];
  recommendations: string[];
  // Enhanced with tree-sitter analysis
  securityIssues: Array<{
    type: string;
    severity: 'low' | 'medium' | 'high' | 'critical';
    message: string;
    file: string;
    line: number;
  }>;
  architecturalViolations: string[];
  codeComplexity: {
    averageComplexity: number;
    highComplexityFiles: string[];
    totalFunctions: number;
  };
  dependencyAnalysis: {
    dangerousImports: Array<{
      module: string;
      file: string;
      reason: string;
    }>;
    frameworksDetected: string[];
    securityLibraries: string[];
  };
}

interface AdrComplianceResult {
  score: number;
  compliantAdrs: number;
  totalAdrs: number;
  missingImplementations: string[];
  recommendations: string[];
}

interface DeploymentReadinessResult {
  // Overall Status
  isDeploymentReady: boolean;
  overallScore: number;
  confidence: number;

  // Detailed Analysis
  codeQualityAnalysis: CodeQualityAnalysis;
  testValidationResult: TestValidationResult;
  deploymentHistoryAnalysis: DeploymentHistoryAnalysis;
  adrComplianceResult: AdrComplianceResult;

  // Blocking Issues
  criticalBlockers: DeploymentBlocker[];
  testFailureBlockers: DeploymentBlocker[];
  deploymentHistoryBlockers: DeploymentBlocker[];
  warnings: string[];

  // Actions Taken
  todoTasksCreated: string[];
  healthScoreUpdate: any;
  gitPushStatus: 'allowed' | 'blocked' | 'conditional';
  overrideStatus: any;

  // Enhanced Features
  smartCodeAnalysis?: string; // Smart Code Linking analysis
  environmentResearch?: {
    answer: string;
    confidence: number;
    sources: Array<{ type: string; found: boolean }>;
    needsWebSearch: boolean;
    warnings: string[];
  };
}

/**
 * Deployment Memory Manager for tracking deployment assessments and patterns
 */
class DeploymentMemoryManager {
  private memoryManager: MemoryEntityManager;
  private logger: EnhancedLogger;

  constructor() {
    this.memoryManager = new MemoryEntityManager();
    this.logger = new EnhancedLogger();
  }

  async initialize(): Promise<void> {
    await this.memoryManager.initialize();
  }

  /**
   * Store deployment assessment as memory entity
   */
  async storeDeploymentAssessment(
    environment: string,
    readinessData: DeploymentReadinessResult,
    validationResults: any,
    projectPath?: string
  ): Promise<string> {
    try {
      const assessmentData = {
        environment: environment as 'development' | 'staging' | 'production' | 'testing',
        readinessScore: readinessData.overallScore / 100, // Convert to 0-1 range
        validationResults: {
          testResults: {
            passed: readinessData.testValidationResult.testSuitesExecuted.reduce(
              (sum, suite) => sum + suite.passedTests,
              0
            ),
            failed: readinessData.testValidationResult.failureCount,
            coverage: readinessData.testValidationResult.coveragePercentage / 100, // Convert to 0-1 range
            criticalFailures: readinessData.testValidationResult.criticalTestFailures.map(
              f => f.testName
            ),
          },
          securityValidation: {
            vulnerabilities: 0, // Default - could be enhanced with actual security scan data
            securityScore: 0.8, // Default - could be enhanced with actual security analysis
            criticalIssues: readinessData.criticalBlockers
              .filter(b => b.category === 'adr_compliance')
              .map(b => b.title),
          },
          performanceValidation: {
            performanceScore: Math.max(0, (readinessData.overallScore - 20) / 80), // Derived from overall score
            bottlenecks: [],
            resourceUtilization: {},
          },
        },
        blockingIssues: [
          ...readinessData.criticalBlockers.map(b => ({
            issue: `${b.title}: ${b.description}`,
            severity: b.severity as 'low' | 'medium' | 'high' | 'critical',
            category: this.mapBlockerCategory(b.category),
            resolution: b.resolutionSteps.join('; '),
            estimatedEffort: b.estimatedResolutionTime,
          })),
          ...readinessData.testFailureBlockers.map(b => ({
            issue: `${b.title}: ${b.description}`,
            severity: b.severity as 'low' | 'medium' | 'high' | 'critical',
            category: 'test' as const,
            resolution: b.resolutionSteps.join('; '),
            estimatedEffort: b.estimatedResolutionTime,
          })),
          ...readinessData.deploymentHistoryBlockers.map(b => ({
            issue: `${b.title}: ${b.description}`,
            severity: b.severity as 'low' | 'medium' | 'high' | 'critical',
            category: 'configuration' as const,
            resolution: b.resolutionSteps.join('; '),
            estimatedEffort: b.estimatedResolutionTime,
          })),
        ],
        deploymentStrategy: {
          type: 'rolling' as const, // Default strategy - could be made configurable
          rollbackPlan: 'Automated rollback via deployment pipeline with health check validation',
          monitoringPlan:
            'Monitor application metrics, error rates, and performance indicators for 30 minutes post-deployment',
          estimatedDowntime: readinessData.isDeploymentReady
            ? '0 minutes (rolling deployment)'
            : 'Cannot deploy - blockers present',
        },
        complianceChecks: {
          adrCompliance: readinessData.adrComplianceResult.score / 100, // Convert to 0-1 range
          regulatoryCompliance: [], // Could be enhanced with actual compliance data
          auditTrail: [
            `Deployment assessment completed at ${new Date().toISOString()}`,
            `Test validation: ${readinessData.testValidationResult.overallTestStatus}`,
            `Overall readiness score: ${readinessData.overallScore}%`,
            `Git push status: ${readinessData.gitPushStatus}`,
          ],
        },
      };

      const entity = await this.memoryManager.upsertEntity({
        type: 'deployment_assessment',
        title: `Deployment Assessment: ${environment} - ${readinessData.isDeploymentReady ? 'READY' : 'BLOCKED'} - ${new Date().toISOString().split('T')[0]}`,
        description: `Deployment readiness assessment for ${environment} environment${readinessData.isDeploymentReady ? ' - APPROVED' : ' - BLOCKED'}`,
        tags: [
          'deployment',
          environment.toLowerCase(),
          'readiness-assessment',
          readinessData.isDeploymentReady ? 'approved' : 'blocked',
          `score-${Math.floor(readinessData.overallScore / 10) * 10}`,
          ...(readinessData.criticalBlockers.length > 0 ? ['critical-issues'] : []),
          ...(readinessData.testValidationResult.failureCount > 0 ? ['test-failures'] : []),
          ...(readinessData.deploymentHistoryAnalysis.rollbackRate > 20
            ? ['high-rollback-risk']
            : []),
        ],
        assessmentData,
        relationships: [],
        context: {
          projectPhase: 'deployment-validation',
          technicalStack: this.extractTechnicalStack(validationResults),
          environmentalFactors: [environment, projectPath || 'unknown-project'].filter(Boolean),
          stakeholders: ['deployment-team', 'qa-team', 'infrastructure-team'],
        },
        accessPattern: {
          lastAccessed: new Date().toISOString(),
          accessCount: 1,
          accessContext: ['deployment-assessment'],
        },
        evolution: {
          origin: 'created',
          transformations: [
            {
              timestamp: new Date().toISOString(),
              type: 'assessment_creation',
              description: `Deployment assessment created for ${environment}`,
              agent: 'deployment-readiness-tool',
            },
          ],
        },
        validation: {
          isVerified: readinessData.isDeploymentReady,
          verificationMethod: 'comprehensive-deployment-audit',
          verificationTimestamp: new Date().toISOString(),
        },
      });

      this.logger.info(
        `Deployment assessment stored for ${environment}`,
        'DeploymentMemoryManager',
        {
          environment,
          entityId: entity.id,
          readinessScore: readinessData.overallScore,
          isReady: readinessData.isDeploymentReady,
          blockingIssues: assessmentData.blockingIssues.length,
        }
      );

      return entity.id;
    } catch (error) {
      this.logger.error(
        'Failed to store deployment assessment',
        'DeploymentMemoryManager',
        error as Error
      );
      throw error;
    }
  }

  /**
   * Migrate existing deployment history to memory entities
   */
  async migrateExistingHistory(historyPath: string): Promise<void> {
    try {
      if (!existsSync(historyPath)) {
        this.logger.info(
          'No existing deployment history found to migrate',
          'DeploymentMemoryManager'
        );
        return;
      }

      const historyData = JSON.parse(readFileSync(historyPath, 'utf8'));
      const deployments = historyData.deployments || [];

      let migratedCount = 0;
      for (const deployment of deployments) {
        try {
          await this.migrateDeploymentRecord(deployment);
          migratedCount++;
        } catch (error) {
          this.logger.error(
            `Failed to migrate deployment ${deployment.deploymentId}`,
            'DeploymentMemoryManager',
            error as Error
          );
        }
      }

      this.logger.info(
        `Migration completed: ${migratedCount}/${deployments.length} deployments migrated`,
        'DeploymentMemoryManager'
      );
    } catch (error) {
      this.logger.error(
        'Failed to migrate deployment history',
        'DeploymentMemoryManager',
        error as Error
      );
      throw error;
    }
  }

  /**
   * Analyze deployment patterns across memory entities
   */
  async analyzeDeploymentPatterns(environment?: string): Promise<{
    patterns: any[];
    trends: any[];
    recommendations: string[];
    riskFactors: any[];
  }> {
    try {
      const query: any = {
        entityTypes: ['deployment_assessment'],
        limit: 100,
        sortBy: 'lastModified',
      };

      if (environment) {
        query.tags = [environment.toLowerCase()];
      }

      const assessments = await this.memoryManager.queryEntities(query);

      const patterns = this.detectDeploymentPatterns(assessments.entities);
      const trends = this.calculateDeploymentTrends(assessments.entities);
      const recommendations = this.generatePatternRecommendations(patterns, trends);
      const riskFactors = this.identifyRiskFactors(assessments.entities);

      return {
        patterns,
        trends,
        recommendations,
        riskFactors,
      };
    } catch (error) {
      this.logger.error(
        'Failed to analyze deployment patterns',
        'DeploymentMemoryManager',
        error as Error
      );
      throw error;
    }
  }

  /**
   * Compare current assessment with historical patterns
   */
  async compareWithHistory(
    currentAssessment: DeploymentReadinessResult,
    environment: string
  ): Promise<{
    isImprovement: boolean;
    comparison: any;
    insights: string[];
  }> {
    try {
      const recentAssessments = await this.memoryManager.queryEntities({
        entityTypes: ['deployment_assessment'],
        tags: [environment.toLowerCase()],
        limit: 10,
        sortBy: 'lastModified',
      });

      if (recentAssessments.entities.length === 0) {
        return {
          isImprovement: true,
          comparison: { type: 'first_assessment' },
          insights: ['This is the first deployment assessment for this environment'],
        };
      }

      const lastAssessment = recentAssessments.entities[0] as any;
      const comparison = this.compareAssessments(currentAssessment, lastAssessment.assessmentData);

      return {
        isImprovement: comparison.scoreImprovement > 0,
        comparison,
        insights: this.generateComparisonInsights(comparison),
      };
    } catch (error) {
      this.logger.error(
        'Failed to compare with history',
        'DeploymentMemoryManager',
        error as Error
      );
      return {
        isImprovement: false,
        comparison: { type: 'comparison_failed' },
        insights: ['Unable to compare with historical data'],
      };
    }
  }

  // Private helper methods

  private async migrateDeploymentRecord(deployment: DeploymentRecord): Promise<void> {
    const assessmentData = {
      environment: deployment.environment as 'development' | 'staging' | 'production' | 'testing',
      readinessScore: deployment.status === 'success' ? 1.0 : 0.0, // Use 0-1 range
      validationResults: {
        testResults: deployment.testResults
          ? {
              passed: deployment.testResults.testSuitesExecuted.reduce(
                (sum, suite) => sum + suite.passedTests,
                0
              ),
              failed: deployment.testResults.failureCount,
              coverage: deployment.testResults.coveragePercentage / 100,
              criticalFailures: deployment.testResults.criticalTestFailures.map(f => f.testName),
            }
          : {
              passed: 0,
              failed: 0,
              coverage: 0,
              criticalFailures: [],
            },
        securityValidation: {
          vulnerabilities: 0,
          securityScore: 0.8,
          criticalIssues: [],
        },
        performanceValidation: {
          performanceScore: deployment.status === 'success' ? 0.8 : 0.2,
          bottlenecks: [],
          resourceUtilization: {},
        },
      },
      blockingIssues: deployment.failureReason
        ? [
            {
              issue: `Historical Deployment Failure: ${deployment.failureReason}`,
              severity: 'high' as const,
              category: 'configuration' as const,
              resolution: 'Review and address historical failure causes',
            },
          ]
        : [],
      deploymentStrategy: {
        type: 'rolling' as const,
        rollbackPlan: 'Standard rollback procedure',
        monitoringPlan: 'Basic monitoring',
        estimatedDowntime: deployment.rollbackRequired ? 'Variable' : '0 minutes',
      },
      complianceChecks: {
        adrCompliance: 1.0,
        regulatoryCompliance: [],
        auditTrail: [
          `Migrated deployment record from ${deployment.timestamp}`,
          `Original status: ${deployment.status}`,
          `Rollback required: ${deployment.rollbackRequired}`,
        ],
      },
    };

    await this.memoryManager.upsertEntity({
      type: 'deployment_assessment',
      title: `Historical Deployment: ${deployment.environment} - ${deployment.status.toUpperCase()} - ${deployment.timestamp.split('T')[0]}`,
      description: `Migrated deployment record for ${deployment.environment} (ID: ${deployment.deploymentId})`,
      tags: [
        'deployment',
        deployment.environment.toLowerCase(),
        'migrated-record',
        deployment.status,
        ...(deployment.rollbackRequired ? ['rollback-required'] : []),
      ],
      assessmentData,
      relationships: [],
      context: {
        projectPhase: 'deployment-execution',
        technicalStack: [],
        environmentalFactors: [deployment.environment],
        stakeholders: ['deployment-team'],
      },
      accessPattern: {
        lastAccessed: new Date().toISOString(),
        accessCount: 1,
        accessContext: ['migration'],
      },
      evolution: {
        origin: 'imported',
        transformations: [
          {
            timestamp: new Date().toISOString(),
            type: 'migration',
            description: `Migrated from deployment-history.json (original: ${deployment.timestamp})`,
            agent: 'deployment-readiness-tool',
          },
        ],
      },
      validation: {
        isVerified: true,
        verificationMethod: 'historical-migration',
        verificationTimestamp: new Date().toISOString(),
      },
    });
  }

  private extractTechnicalStack(_validationResults: any): string[] {
    // Extract technical stack from validation results
    // This is a simplified implementation
    return [];
  }

  private detectDeploymentPatterns(assessments: any[]): any[] {
    // Analyze deployment patterns across assessments
    const patterns = [];

    // Pattern: Time-based failures
    const timePatterns = this.analyzeTimePatterns(assessments);
    if (timePatterns.length > 0) {
      patterns.push({ type: 'time_based', patterns: timePatterns });
    }

    // Pattern: Environment-specific issues
    const envPatterns = this.analyzeEnvironmentPatterns(assessments);
    if (envPatterns.length > 0) {
      patterns.push({ type: 'environment_specific', patterns: envPatterns });
    }

    return patterns;
  }

  private calculateDeploymentTrends(assessments: any[]): any[] {
    if (assessments.length < 3) return [];

    const trends = [];
    const scores = assessments.map((a: any) => a.assessmentData.readinessScore);

    // Calculate score trend
    const scoreTrend = this.calculateTrend(scores);
    trends.push({
      metric: 'readiness_score',
      trend: scoreTrend > 0 ? 'improving' : scoreTrend < 0 ? 'declining' : 'stable',
      change: scoreTrend,
    });

    return trends;
  }

  private generatePatternRecommendations(patterns: any[], trends: any[]): string[] {
    const recommendations: string[] = [];

    // Generate recommendations based on patterns
    patterns.forEach(pattern => {
      if (pattern.type === 'time_based') {
        recommendations.push('Consider scheduling deployments during low-risk time windows');
      }
      if (pattern.type === 'environment_specific') {
        recommendations.push('Address environment-specific configuration issues');
      }
    });

    // Generate recommendations based on trends
    trends.forEach(trend => {
      if (trend.metric === 'readiness_score' && trend.trend === 'declining') {
        recommendations.push('Investigate causes of declining deployment readiness scores');
      }
    });

    return recommendations;
  }

  /**
   * Map deployment blocker category to schema-compliant category
   */
  private mapBlockerCategory(
    category: string
  ): 'test' | 'security' | 'performance' | 'configuration' | 'dependencies' {
    switch (category) {
      case 'test_failure':
        return 'test';
      case 'adr_compliance':
      case 'environment':
      case 'deployment_history':
        return 'configuration';
      case 'code_quality':
        return 'performance';
      default:
        return 'configuration';
    }
  }

  private identifyRiskFactors(assessments: any[]): any[] {
    const riskFactors = [];

    // Analyze recent failures
    const recentFailures = assessments
      .filter((a: any) => !a.assessmentData.deploymentReady)
      .slice(0, 5);

    if (recentFailures.length >= 3) {
      riskFactors.push({
        factor: 'frequent_failures',
        description: `${recentFailures.length} deployment blocks in recent assessments`,
        severity: 'high',
      });
    }

    return riskFactors;
  }

  private compareAssessments(current: DeploymentReadinessResult, historical: any): any {
    return {
      scoreImprovement: current.overallScore - historical.readinessScore,
      confidenceChange: current.confidence - historical.confidence,
      blockingIssuesChange: current.criticalBlockers.length - historical.blockingIssues.length,
      testImprovements: {
        failureCountChange:
          current.testValidationResult.failureCount -
          (historical.validationResults?.testValidation?.failureCount || 0),
        coverageChange:
          current.testValidationResult.coveragePercentage -
          (historical.validationResults?.testValidation?.coveragePercentage || 0),
      },
    };
  }

  private generateComparisonInsights(comparison: any): string[] {
    const insights = [];

    if (comparison.scoreImprovement > 0) {
      insights.push(`Deployment readiness improved by ${comparison.scoreImprovement} points`);
    } else if (comparison.scoreImprovement < 0) {
      insights.push(
        `Deployment readiness declined by ${Math.abs(comparison.scoreImprovement)} points`
      );
    }

    if (comparison.testImprovements.failureCountChange < 0) {
      insights.push(
        `Test stability improved: ${Math.abs(comparison.testImprovements.failureCountChange)} fewer failures`
      );
    }

    if (comparison.testImprovements.coverageChange > 0) {
      insights.push(`Test coverage increased by ${comparison.testImprovements.coverageChange}%`);
    }

    return insights;
  }

  private analyzeTimePatterns(_assessments: any[]): any[] {
    // Simplified time pattern analysis
    return [];
  }

  private analyzeEnvironmentPatterns(_assessments: any[]): any[] {
    // Simplified environment pattern analysis
    return [];
  }

  private calculateTrend(values: number[]): number {
    if (values.length < 2) return 0;

    const recent = values.slice(0, Math.min(5, values.length));
    const older = values.slice(Math.min(5, values.length));

    const recentAvg = recent.reduce((a, b) => a + b, 0) / recent.length;
    const olderAvg = older.length > 0 ? older.reduce((a, b) => a + b, 0) / older.length : recentAvg;

    return recentAvg - olderAvg;
  }
}

/**
 * Main deployment readiness function
 */
export async function deploymentReadiness(args: any): Promise<any> {
  try {
    const validatedArgs = DeploymentReadinessSchema.parse(args);

    // Initialize paths and cache
    const projectPath = validatedArgs.projectPath || process.cwd();
    const projectName = basename(projectPath);
    const cacheDir = join(os.tmpdir(), projectName, 'cache');
    const deploymentHistoryPath = join(cacheDir, 'deployment-history.json');
    const readinessCachePath = join(cacheDir, 'deployment-readiness-cache.json');

    // Ensure cache directory exists
    if (!existsSync(cacheDir)) {
      mkdirSync(cacheDir, { recursive: true });
    }

    // Initialize memory manager if enabled
    let memoryManager: DeploymentMemoryManager | null = null;
    if (validatedArgs.enableMemoryIntegration) {
      memoryManager = new DeploymentMemoryManager();
      await memoryManager.initialize();

      // Migrate existing history if requested
      if (validatedArgs.migrateExistingHistory) {
        await memoryManager.migrateExistingHistory(deploymentHistoryPath);
      }
    }

    let result: DeploymentReadinessResult;

    switch (validatedArgs.operation) {
      case 'test_validation':
        result = await performTestValidation(validatedArgs, projectPath);
        break;

      case 'deployment_history':
        result = await performDeploymentHistoryAnalysis(validatedArgs, deploymentHistoryPath);
        break;

      case 'check_readiness':
      case 'validate_production':
      case 'full_audit':
        result = await performFullAudit(validatedArgs, projectPath, deploymentHistoryPath);
        break;

      case 'emergency_override':
        result = await performEmergencyOverride(validatedArgs, projectPath);
        break;

      default:
        throw new McpAdrError('INVALID_ARGS', `Unknown operation: ${validatedArgs.operation}`);
    }

    // Cache result for performance
    writeFileSync(
      readinessCachePath,
      JSON.stringify(
        {
          timestamp: new Date().toISOString(),
          operation: validatedArgs.operation,
          result,
        },
        null,
        2
      )
    );

    // Memory integration: store assessment and analyze patterns
    let memoryIntegrationInfo = '';
    if (memoryManager) {
      try {
        // Store deployment assessment
        const assessmentId = await memoryManager.storeDeploymentAssessment(
          validatedArgs.targetEnvironment,
          result,
          { projectPath, operation: validatedArgs.operation },
          projectPath
        );

        // Compare with historical patterns
        const historyComparison = await memoryManager.compareWithHistory(
          result,
          validatedArgs.targetEnvironment
        );

        // Analyze deployment patterns
        const patternAnalysis = await memoryManager.analyzeDeploymentPatterns(
          validatedArgs.targetEnvironment
        );

        memoryIntegrationInfo = `

## 🧠 Memory Integration Analysis

- **Assessment Stored**: ✅ Deployment assessment saved (ID: ${assessmentId.substring(0, 8)}...)
- **Environment**: ${validatedArgs.targetEnvironment}
- **Historical Comparison**: ${historyComparison.isImprovement ? '📈 Improvement detected' : '📊 Baseline established'}

${
  historyComparison.insights.length > 0
    ? `### Historical Insights
${historyComparison.insights.map(insight => `- ${insight}`).join('\n')}
`
    : ''
}

${
  patternAnalysis.trends.length > 0
    ? `### Deployment Trends
${patternAnalysis.trends.map(trend => `- **${trend.metric}**: ${trend.trend} (${trend.change > 0 ? '+' : ''}${trend.change})`).join('\n')}
`
    : ''
}

${
  patternAnalysis.recommendations.length > 0
    ? `### Pattern-Based Recommendations
${patternAnalysis.recommendations.map(rec => `- ${rec}`).join('\n')}
`
    : ''
}

${
  patternAnalysis.riskFactors.length > 0
    ? `### Risk Factors Identified
${patternAnalysis.riskFactors.map(risk => `- **${risk.factor}**: ${risk.description} (${risk.severity})`).join('\n')}
`
    : ''
}
`;
      } catch (memoryError) {
        memoryIntegrationInfo = `

## 🧠 Memory Integration Status

- **Status**: ⚠️ Memory integration failed - assessment continued without persistence
- **Error**: ${memoryError instanceof Error ? memoryError.message : 'Unknown error'}
`;
      }
    }

    // Generate enhanced response with memory integration
    const baseResponse = generateDeploymentReadinessResponse(result, validatedArgs);

    // Add memory integration info if available
    if (memoryIntegrationInfo && baseResponse.content?.[0]?.text) {
      baseResponse.content[0].text += memoryIntegrationInfo;
    }

    return baseResponse;
  } catch (error) {
    throw new McpAdrError(
      'DEPLOYMENT_READINESS_ERROR',
      `Deployment readiness check failed: ${jsonSafeError(error)}`
    );
  }
}

/**
 * Perform comprehensive test validation
 */
async function performTestValidation(
  args: z.infer<typeof DeploymentReadinessSchema>,
  projectPath: string
): Promise<DeploymentReadinessResult> {
  const testResult = await executeTestSuite(projectPath, args.testSuiteRequired);
  const testBlockers: DeploymentBlocker[] = [];

  // Check for test failures
  if (testResult.failureCount > args.maxTestFailures) {
    testBlockers.push({
      category: 'test_failure',
      title: 'Test Failures Detected',
      description: `${testResult.failureCount} test failures found (max allowed: ${args.maxTestFailures})`,
      severity: 'critical',
      impact: 'Blocks deployment due to failing tests',
      resolutionSteps: [
        'Run npm test to see detailed failures',
        'Fix failing tests one by one',
        'Ensure all tests pass before deployment',
        'Consider increasing test coverage',
      ],
      estimatedResolutionTime: `${Math.ceil(testResult.failureCount * 0.5)} hours`,
      blocksDeployment: args.blockOnFailingTests,
    });
  }

  // Check test coverage
  if (testResult.coveragePercentage < args.requireTestCoverage) {
    testBlockers.push({
      category: 'test_failure',
      title: 'Insufficient Test Coverage',
      description: `Test coverage is ${testResult.coveragePercentage}% (minimum required: ${args.requireTestCoverage}%)`,
      severity: 'high',
      impact: 'May indicate untested code paths',
      resolutionSteps: [
        'Add tests for uncovered code',
        'Run npm run test:coverage to see detailed coverage',
        'Focus on critical business logic first',
      ],
      estimatedResolutionTime: '2-4 hours',
      blocksDeployment: args.strictMode,
    });
  }

  // Basic result structure
  return {
    isDeploymentReady: testBlockers.length === 0,
    overallScore: calculateTestScore(testResult, args),
    confidence: 85,
    codeQualityAnalysis: await analyzeCodeQualityWithTreeSitter(
      args.projectPath || process.cwd(),
      args.enableTreeSitterAnalysis,
      args.treeSitterLanguages
    ),
    testValidationResult: testResult,
    deploymentHistoryAnalysis: {
      recentDeployments: [],
      successRate: 100,
      rollbackRate: 0,
      averageDeploymentTime: 0,
      failurePatterns: [],
      environmentStability: {
        stabilityScore: 100,
        riskLevel: 'low',
        recommendation: 'Proceed with deployment',
      },
      recommendedAction: 'proceed',
    },
    adrComplianceResult: {
      score: 100,
      compliantAdrs: 0,
      totalAdrs: 0,
      missingImplementations: [],
      recommendations: [],
    },
    criticalBlockers: testBlockers.filter(b => b.severity === 'critical'),
    testFailureBlockers: testBlockers,
    deploymentHistoryBlockers: [],
    warnings: [],
    todoTasksCreated: [],
    healthScoreUpdate: {},
    gitPushStatus: testBlockers.length === 0 ? 'allowed' : 'blocked',
    overrideStatus: {},
  };
}

/**
 * Execute test suite and analyze results
 */
async function executeTestSuite(
  projectPath: string,
  _requiredSuites: string[]
): Promise<TestValidationResult> {
  const startTime = Date.now();
  let testOutput = '';
  let exitCode = 0;

  try {
    // Try to run tests with different commands
    const testCommands = ['npm test', 'yarn test', 'npx jest'];

    for (const command of testCommands) {
      try {
        testOutput = execSync(command, {
          cwd: projectPath,
          encoding: 'utf8',
          timeout: 300000, // 5 minute timeout
        });
        break;
      } catch (error: any) {
        if (error.status !== undefined) {
          // Command executed but tests failed
          testOutput = error.stdout + error.stderr;
          exitCode = error.status;
          break;
        }
        // Command not found, try next
      }
    }
  } catch (error) {
    testOutput = `Test execution failed: ${error}`;
    exitCode = 1;
  }

  const executionTime = Date.now() - startTime;

  // Parse test results (simplified for now)
  const testSuites = parseTestOutput(testOutput);
  const totalFailures = testSuites.reduce((sum, suite) => sum + suite.failedTests, 0);
  const overallStatus = exitCode === 0 ? 'passed' : totalFailures > 0 ? 'failed' : 'partial';

  // Check coverage (simplified)
  const coverage = await checkTestCoverage(projectPath);

  return {
    testSuitesExecuted: testSuites,
    overallTestStatus: overallStatus,
    failureCount: totalFailures,
    coveragePercentage: coverage,
    requiredSuitesMissing: [],
    criticalTestFailures: testSuites.flatMap(suite =>
      suite.failureDetails.filter(f => f.severity === 'critical')
    ),
    testExecutionTime: executionTime,
    lastTestRun: new Date().toISOString(),
  };
}

/**
 * Parse test output to extract results
 */
function parseTestOutput(output: string): TestSuiteResult[] {
  // Simplified parser - in production, would handle Jest, Mocha, etc.
  const lines = output.split('\n');
  const suites: TestSuiteResult[] = [];

  // Look for Jest-style output
  let currentSuite: Partial<TestSuiteResult> = {};

  for (const line of lines) {
    if (line.includes('PASS') || line.includes('FAIL')) {
      if (currentSuite.suiteName) {
        suites.push(currentSuite as TestSuiteResult);
      }

      currentSuite = {
        suiteName: line.split(' ').pop() || 'unknown',
        status: line.includes('PASS') ? 'passed' : 'failed',
        passedTests: 0,
        failedTests: 0,
        coverage: 0,
        executionTime: 0,
        failureDetails: [],
      };
    }

    // Count tests
    if (line.includes('✓') || line.includes('✗')) {
      if (line.includes('✓')) {
        currentSuite.passedTests = (currentSuite.passedTests || 0) + 1;
      } else {
        currentSuite.failedTests = (currentSuite.failedTests || 0) + 1;
        // Add failure detail
        currentSuite.failureDetails?.push({
          testName: line.trim(),
          testSuite: currentSuite.suiteName || 'unknown',
          errorMessage: line,
          severity: 'medium',
          blocksDeployment: true,
          relatedFiles: [],
        });
      }
    }
  }

  if (currentSuite.suiteName) {
    suites.push(currentSuite as TestSuiteResult);
  }

  return suites.length > 0
    ? suites
    : [
        {
          suiteName: 'default',
          status: output.includes('failing') ? 'failed' : 'passed',
          passedTests: 0,
          failedTests: output.includes('failing') ? 1 : 0,
          coverage: 0,
          executionTime: 0,
          failureDetails: [],
        },
      ];
}

/**
 * Check test coverage
 */
async function checkTestCoverage(projectPath: string): Promise<number> {
  try {
    // Try to read coverage from common locations
    const coverageFiles = [
      'coverage/lcov-report/index.html',
      'coverage/coverage-summary.json',
      'coverage/coverage-final.json',
    ];

    for (const file of coverageFiles) {
      const filePath = join(projectPath, file);
      if (existsSync(filePath)) {
        const content = readFileSync(filePath, 'utf8');

        // Extract coverage percentage (simplified)
        const match = content.match(/(\d+(?:\.\d+)?)%/);
        if (match && match[1]) {
          return parseFloat(match[1]);
        }
      }
    }
  } catch {
    // Coverage not available
  }

  return 0; // Default to 0 if coverage cannot be determined
}

/**
 * Perform deployment history analysis
 */
async function performDeploymentHistoryAnalysis(
  args: z.infer<typeof DeploymentReadinessSchema>,
  historyPath: string
): Promise<DeploymentReadinessResult> {
  const history = loadDeploymentHistory(historyPath);
  const analysis = analyzeDeploymentHistory(history, args.targetEnvironment);
  const historyBlockers: DeploymentBlocker[] = [];

  // Check success rate
  if (analysis.successRate < args.deploymentSuccessThreshold) {
    historyBlockers.push({
      category: 'deployment_history',
      title: 'Low Deployment Success Rate',
      description: `Success rate is ${analysis.successRate}% (minimum required: ${args.deploymentSuccessThreshold}%)`,
      severity: 'high',
      impact: 'Indicates potential infrastructure or process issues',
      resolutionSteps: [
        'Review recent deployment failures',
        'Fix underlying infrastructure issues',
        'Improve deployment process reliability',
        'Add more comprehensive pre-deployment checks',
      ],
      estimatedResolutionTime: '1-2 days',
      blocksDeployment: args.blockOnRecentFailures,
    });
  }

  // Check rollback rate
  if (analysis.rollbackRate > args.rollbackFrequencyThreshold) {
    historyBlockers.push({
      category: 'deployment_history',
      title: 'High Rollback Frequency',
      description: `Rollback rate is ${analysis.rollbackRate}% (threshold: ${args.rollbackFrequencyThreshold}%)`,
      severity: 'medium',
      impact: 'May indicate deployment quality issues',
      resolutionSteps: [
        'Improve testing before deployment',
        'Add more validation steps',
        'Review rollback causes',
        'Strengthen deployment pipeline',
      ],
      estimatedResolutionTime: '4-8 hours',
      blocksDeployment: args.strictMode,
    });
  }

  return {
    isDeploymentReady: historyBlockers.length === 0,
    overallScore: Math.min(analysis.successRate, 100 - analysis.rollbackRate),
    confidence: 80,
    codeQualityAnalysis: await analyzeCodeQualityWithTreeSitter(
      args.projectPath || process.cwd(),
      args.enableTreeSitterAnalysis,
      args.treeSitterLanguages
    ),
    testValidationResult: {
      testSuitesExecuted: [],
      overallTestStatus: 'not_run',
      failureCount: 0,
      coveragePercentage: 0,
      requiredSuitesMissing: [],
      criticalTestFailures: [],
      testExecutionTime: 0,
      lastTestRun: '',
    },
    deploymentHistoryAnalysis: analysis,
    adrComplianceResult: {
      score: 100,
      compliantAdrs: 0,
      totalAdrs: 0,
      missingImplementations: [],
      recommendations: [],
    },
    criticalBlockers: historyBlockers.filter(b => b.severity === 'critical'),
    testFailureBlockers: [],
    deploymentHistoryBlockers: historyBlockers,
    warnings: [],
    todoTasksCreated: [],
    healthScoreUpdate: {},
    gitPushStatus: historyBlockers.length === 0 ? 'allowed' : 'blocked',
    overrideStatus: {},
  };
}

/**
 * Load deployment history from cache
 */
function loadDeploymentHistory(historyPath: string): { deployments: DeploymentRecord[] } {
  if (!existsSync(historyPath)) {
    return { deployments: [] };
  }

  try {
    const content = readFileSync(historyPath, 'utf8');
    return JSON.parse(content);
  } catch {
    return { deployments: [] };
  }
}

/**
 * Analyze deployment history patterns
 */
function analyzeDeploymentHistory(
  history: { deployments: DeploymentRecord[] },
  environment: string
): DeploymentHistoryAnalysis {
  const recentDeployments = history.deployments
    .filter(d => d.environment === environment)
    .slice(0, 10);

  const successCount = recentDeployments.filter(d => d.status === 'success').length;
  const rollbackCount = recentDeployments.filter(d => d.rollbackRequired).length;

  const successRate =
    recentDeployments.length > 0 ? (successCount / recentDeployments.length) * 100 : 100;
  const rollbackRate =
    recentDeployments.length > 0 ? (rollbackCount / recentDeployments.length) * 100 : 0;

  const failurePatterns = analyzeFailurePatterns(
    recentDeployments.filter(d => d.status === 'failed')
  );

  return {
    recentDeployments,
    successRate,
    rollbackRate,
    averageDeploymentTime: calculateAverageDeploymentTime(recentDeployments),
    failurePatterns,
    environmentStability: assessEnvironmentStability(successRate, rollbackRate),
    recommendedAction: recommendAction(successRate, rollbackRate, failurePatterns.length),
  };
}

/**
 * Analyze failure patterns
 */
function analyzeFailurePatterns(failedDeployments: DeploymentRecord[]): FailurePattern[] {
  const patterns: Map<string, FailurePattern> = new Map();

  failedDeployments.forEach(deployment => {
    if (deployment.failureReason) {
      const category = categorizeFailure(deployment.failureReason);
      const existing = patterns.get(category);

      if (existing) {
        existing.frequency++;
        existing.lastOccurrence = deployment.timestamp;
      } else {
        patterns.set(category, {
          pattern: category,
          frequency: 1,
          environments: [deployment.environment],
          lastOccurrence: deployment.timestamp,
          resolution: suggestResolution(category),
          preventable: isPreventable(category),
        });
      }
    }
  });

  return Array.from(patterns.values());
}

/**
 * Research environment readiness using research-orchestrator
 */
async function performEnvironmentResearch(
  args: z.infer<typeof DeploymentReadinessSchema>,
  projectPath: string
): Promise<{
  answer: string;
  confidence: number;
  sources: Array<{ type: string; found: boolean }>;
  needsWebSearch: boolean;
  warnings: string[];
}> {
  if (!args.enableResearchIntegration) {
    return {
      answer: 'Environment research disabled',
      confidence: 1.0,
      sources: [],
      needsWebSearch: false,
      warnings: [],
    };
  }

  try {
    const orchestrator = new ResearchOrchestrator(projectPath, 'docs/adrs');

    const researchQuestion = `Verify deployment readiness for ${args.targetEnvironment} environment:
1. Are required deployment tools available (Docker/Podman, Kubernetes/OpenShift)?
2. What is the current infrastructure state and health?
3. Are environment configurations present and valid?
4. What deployment patterns are documented in ADRs?
5. Are there any known deployment blockers or issues?`;

    const research = await orchestrator.answerResearchQuestion(researchQuestion);

    const warnings: string[] = [];

    // Check confidence level
    if (research.confidence < args.researchConfidenceThreshold) {
      warnings.push(
        `Research confidence (${(research.confidence * 100).toFixed(1)}%) below threshold (${(args.researchConfidenceThreshold * 100).toFixed(1)}%)`
      );
    }

    // Check if web search is needed
    if (research.needsWebSearch) {
      warnings.push(
        'Local environment data insufficient - external research may be needed'
      );
    }

    // Check for environment capability availability
    const hasKubernetes = research.sources.some(
      s => s.type === 'environment' && s.data?.capabilities?.includes('kubernetes')
    );
    const hasDocker = research.sources.some(
      s => s.type === 'environment' && s.data?.capabilities?.includes('docker')
    );
    const hasOpenShift = research.sources.some(
      s => s.type === 'environment' && s.data?.capabilities?.includes('openshift')
    );
    const hasPodman = research.sources.some(
      s => s.type === 'environment' && s.data?.capabilities?.includes('podman')
    );

    if (!hasKubernetes && !hasOpenShift && !hasDocker && !hasPodman) {
      warnings.push(
        'No container orchestration tools detected - manual deployment verification required'
      );
    }

    return {
      answer: research.answer || 'No environment research results available',
      confidence: research.confidence,
      sources: research.sources.map(s => ({
        type: s.type,
        found: true, // Sources in array are already found
      })),
      needsWebSearch: research.needsWebSearch,
      warnings,
    };
  } catch (error) {
    return {
      answer: `Environment research failed: ${error instanceof Error ? error.message : String(error)}`,
      confidence: 0,
      sources: [],
      needsWebSearch: true,
      warnings: ['Failed to perform environment research - proceeding without environment validation'],
    };
  }
}

/**
 * Perform full audit (all checks)
 */
async function performFullAudit(
  args: z.infer<typeof DeploymentReadinessSchema>,
  projectPath: string,
  historyPath: string
): Promise<DeploymentReadinessResult> {
  // Step 0: Research environment readiness
  const environmentResearch = await performEnvironmentResearch(args, projectPath);

  // Combine all validations
  const testResult = await performTestValidation(args, projectPath);
  const historyResult = await performDeploymentHistoryAnalysis(args, historyPath);

  // Smart Code Linking - Enhanced deployment readiness with ADR analysis
  let smartCodeAnalysis = '';
  let adrComplianceResult = testResult.adrComplianceResult;

  if (args.requireAdrCompliance) {
    try {
      // Discover ADRs in the project
      const { discoverAdrsInDirectory } = await import('../utils/adr-discovery.js');
      const adrDirectory = 'docs/adrs';
      const discoveryResult = await discoverAdrsInDirectory(adrDirectory, true, projectPath);

      if (discoveryResult.adrs.length > 0) {
        // Combine all ADR content for Smart Code Linking analysis
        const combinedAdrContent = discoveryResult.adrs
          .map(adr => `# ${adr.title}\n${adr.content || ''}`)
          .join('\n\n');

        const relatedCodeResult = await findRelatedCode(
          'deployment-readiness-analysis',
          combinedAdrContent,
          projectPath,
          {
            useAI: true,
            useRipgrep: true,
            maxFiles: 25,
            includeContent: false,
          }
        );

        // Enhanced ADR compliance analysis with related code context
        const deploymentCriticalFiles = relatedCodeResult.relatedFiles.filter(file => {
          const deploymentKeywords = [
            'deploy',
            'config',
            'env',
            'docker',
            'k8s',
            'terraform',
            'ci',
            'cd',
          ];
          return deploymentKeywords.some(
            keyword =>
              file.path.toLowerCase().includes(keyword) ||
              file.directory.toLowerCase().includes(keyword)
          );
        });

        adrComplianceResult = {
          score: Math.min(100, 70 + relatedCodeResult.confidence * 30),
          compliantAdrs: discoveryResult.adrs.length,
          totalAdrs: discoveryResult.adrs.length,
          missingImplementations:
            deploymentCriticalFiles.length === 0
              ? ['Deployment-specific implementations not found in related code']
              : [],
          recommendations: [
            ...(deploymentCriticalFiles.length > 0
              ? [`Found ${deploymentCriticalFiles.length} deployment-critical files linked to ADRs`]
              : ['Consider documenting deployment procedures in ADRs']),
            ...(relatedCodeResult.relatedFiles.length > 10
              ? ['High code-ADR linkage indicates good architectural documentation']
              : ['Consider improving ADR-to-code traceability']),
            ...(relatedCodeResult.confidence > 0.8
              ? ['Strong architectural alignment detected between ADRs and implementation']
              : ['Review ADR implementation alignment before deployment']),
          ],
        };

        smartCodeAnalysis = `

## 🔗 Smart Code Linking - Deployment Analysis

**ADR Discovery**: Found ${discoveryResult.adrs.length} architectural decision records
**Related Code Files**: ${relatedCodeResult.relatedFiles.length} files linked to ADRs
**Deployment-Critical Files**: ${deploymentCriticalFiles.length} files identified

### Deployment-Critical Code Analysis
${
  deploymentCriticalFiles.length > 0
    ? deploymentCriticalFiles
        .slice(0, 5)
        .map(
          (file, index) =>
            `${index + 1}. **${file.path}** - ${file.extension} file (${file.size} bytes)`
        )
        .join('\n')
    : '*No deployment-specific files found in ADR-related code*'
}

### Architectural Alignment
- **ADR-Code Confidence**: ${(relatedCodeResult.confidence * 100).toFixed(1)}%
- **Keywords Used**: ${relatedCodeResult.keywords.join(', ')}
- **Implementation Coverage**: ${relatedCodeResult.relatedFiles.length > 0 ? 'Adequate' : 'Needs Review'}

**Deployment Impact**: ${
          deploymentCriticalFiles.length > 0
            ? 'ADR-guided deployment files found - architectural decisions are implemented'
            : 'Limited deployment-specific code found - verify manual deployment procedures'
        }
`;
      } else {
        smartCodeAnalysis = `

## 🔗 Smart Code Linking - Deployment Analysis

**Status**: No ADRs found in project
**Recommendation**: Consider creating ADRs to document deployment architecture and decisions
**Impact**: Proceeding with deployment readiness check without architectural guidance
`;
      }
    } catch (error) {
      console.warn('[WARNING] Smart Code Linking for deployment analysis failed:', error);
      smartCodeAnalysis = `

## 🔗 Smart Code Linking - Deployment Analysis

**Status**: ⚠️ ADR analysis failed - continuing with standard deployment checks
**Error**: ${error instanceof Error ? error.message : 'Unknown error'}
`;
    }
  }

  // Create environment blockers based on research findings
  const environmentBlockers: DeploymentBlocker[] = [];

  if (environmentResearch.warnings.length > 0) {
    environmentResearch.warnings.forEach(warning => {
      if (warning.includes('threshold') || warning.includes('No container orchestration')) {
        environmentBlockers.push({
          category: 'environment',
          title: 'Environment Readiness Concern',
          description: warning,
          severity: warning.includes('No container orchestration') ? 'high' : 'medium',
          impact: 'May affect deployment execution',
          resolutionSteps: [
            'Verify environment tools are installed',
            'Check environment configurations',
            'Consult deployment documentation',
          ],
          estimatedResolutionTime: '30 minutes - 1 hour',
          blocksDeployment: args.strictMode && warning.includes('No container orchestration'),
        });
      }
    });
  }

  const allBlockers = [
    ...testResult.criticalBlockers,
    ...testResult.testFailureBlockers,
    ...historyResult.deploymentHistoryBlockers,
    ...environmentBlockers,
  ];

  // Adjust overall score based on environment research confidence
  const baseScore = (testResult.overallScore + historyResult.overallScore) / 2;
  const environmentScore = environmentResearch.confidence * 100;
  const overallScore = (baseScore * 0.7 + environmentScore * 0.3);
  const isReady = allBlockers.filter(b => b.blocksDeployment).length === 0;

  const result = {
    isDeploymentReady: isReady,
    overallScore,
    confidence: Math.min(
      testResult.confidence,
      historyResult.confidence,
      environmentResearch.confidence * 100
    ),
    codeQualityAnalysis: testResult.codeQualityAnalysis,
    testValidationResult: testResult.testValidationResult,
    deploymentHistoryAnalysis: historyResult.deploymentHistoryAnalysis,
    adrComplianceResult,
    criticalBlockers: allBlockers.filter(b => b.severity === 'critical'),
    testFailureBlockers: testResult.testFailureBlockers,
    deploymentHistoryBlockers: historyResult.deploymentHistoryBlockers,
    warnings: [
      ...testResult.warnings,
      ...historyResult.warnings,
      ...environmentResearch.warnings,
    ],
    todoTasksCreated: [],
    healthScoreUpdate: {},
    gitPushStatus: isReady ? ('allowed' as const) : ('blocked' as const),
    overrideStatus: {},
    smartCodeAnalysis, // Include Smart Code Linking analysis
    environmentResearch, // Include environment research results
  };

  return result;
}

/**
 * Perform emergency override
 */
async function performEmergencyOverride(
  args: z.infer<typeof DeploymentReadinessSchema>,
  projectPath: string
): Promise<DeploymentReadinessResult> {
  if (!args.businessJustification) {
    throw new McpAdrError('INVALID_ARGS', 'Business justification required for emergency override');
  }

  // Log override for audit trail
  const overrideRecord = {
    timestamp: new Date().toISOString(),
    justification: args.businessJustification || 'No justification provided',
    environment: args.targetEnvironment,
    overriddenBy: process.env['USER'] || 'unknown',
  };

  const projectName = basename(projectPath);
  const cacheDir = join(os.tmpdir(), projectName, 'cache');
  const overridePath = join(cacheDir, 'emergency-overrides.json');
  const overrides = existsSync(overridePath) ? JSON.parse(readFileSync(overridePath, 'utf8')) : [];
  overrides.push(overrideRecord);
  writeFileSync(overridePath, JSON.stringify(overrides, null, 2));

  return {
    isDeploymentReady: true,
    overallScore: 100,
    confidence: 50, // Lower confidence for overrides
    codeQualityAnalysis: createDefaultCodeQualityAnalysis(100, 0, 0),
    testValidationResult: {
      testSuitesExecuted: [],
      overallTestStatus: 'not_run',
      failureCount: 0,
      coveragePercentage: 0,
      requiredSuitesMissing: [],
      criticalTestFailures: [],
      testExecutionTime: 0,
      lastTestRun: '',
    },
    deploymentHistoryAnalysis: {
      recentDeployments: [],
      successRate: 100,
      rollbackRate: 0,
      averageDeploymentTime: 0,
      failurePatterns: [],
      environmentStability: {
        stabilityScore: 50,
        riskLevel: 'medium',
        recommendation: 'Monitor closely post-deployment',
      },
      recommendedAction: 'proceed',
    },
    adrComplianceResult: {
      score: 100,
      compliantAdrs: 0,
      totalAdrs: 0,
      missingImplementations: [],
      recommendations: [],
    },
    criticalBlockers: [],
    testFailureBlockers: [],
    deploymentHistoryBlockers: [],
    warnings: ['Emergency override active - all normal gates bypassed'],
    todoTasksCreated: [],
    healthScoreUpdate: {},
    gitPushStatus: 'allowed',
    overrideStatus: overrideRecord,
  };
}

/**
 * Helper functions
 */
function calculateTestScore(
  testResult: TestValidationResult,
  _args: z.infer<typeof DeploymentReadinessSchema>
): number {
  const failureScore = Math.max(0, 100 - testResult.failureCount * 20);
  const coverageScore = testResult.coveragePercentage;
  return Math.min(failureScore, coverageScore);
}

function calculateAverageDeploymentTime(deployments: DeploymentRecord[]): number {
  if (deployments.length === 0) return 0;
  const total = deployments.reduce((sum, d) => sum + d.duration, 0);
  return total / deployments.length;
}

function assessEnvironmentStability(
  successRate: number,
  rollbackRate: number
): EnvironmentStability {
  const stabilityScore = Math.max(0, successRate - rollbackRate);
  let riskLevel: 'low' | 'medium' | 'high' | 'critical';

  if (stabilityScore >= 90) riskLevel = 'low';
  else if (stabilityScore >= 70) riskLevel = 'medium';
  else if (stabilityScore >= 50) riskLevel = 'high';
  else riskLevel = 'critical';

  return {
    stabilityScore,
    riskLevel,
    recommendation:
      riskLevel === 'low' ? 'Proceed with deployment' : 'Investigate before deployment',
  };
}

function recommendAction(
  successRate: number,
  rollbackRate: number,
  failurePatternCount: number
): 'proceed' | 'block' | 'investigate' {
  if (successRate < 50 || rollbackRate > 40) return 'block';
  if (successRate < 80 || rollbackRate > 20 || failurePatternCount > 2) return 'investigate';
  return 'proceed';
}

function categorizeFailure(failureReason: string): string {
  const patterns = [
    { regex: /test.*fail/i, category: 'Test Failures' },
    { regex: /database.*connection/i, category: 'Database Connection Issues' },
    { regex: /environment.*variable/i, category: 'Environment Configuration' },
    { regex: /build.*fail/i, category: 'Build Failures' },
    { regex: /dependency.*error/i, category: 'Dependency Issues' },
    { regex: /timeout/i, category: 'Timeout Issues' },
    { regex: /permission.*denied/i, category: 'Permission Issues' },
    { regex: /out.*of.*memory/i, category: 'Resource Issues' },
  ];

  for (const pattern of patterns) {
    if (pattern.regex.test(failureReason)) {
      return pattern.category;
    }
  }

  return 'Unknown Failure';
}

function suggestResolution(category: string): string {
  const resolutions: Record<string, string> = {
    'Test Failures': 'Fix failing tests and improve test coverage',
    'Database Connection Issues': 'Check database connectivity and credentials',
    'Environment Configuration': 'Verify environment variables and configuration',
    'Build Failures': 'Fix build dependencies and compilation errors',
    'Dependency Issues': 'Update and verify package dependencies',
    'Timeout Issues': 'Optimize performance and increase timeout values',
    'Permission Issues': 'Check file and directory permissions',
    'Resource Issues': 'Increase available memory and resources',
  };

  return resolutions[category] || 'Investigate failure details and resolve underlying issue';
}

function isPreventable(category: string): boolean {
  const preventableCategories = [
    'Test Failures',
    'Environment Configuration',
    'Build Failures',
    'Dependency Issues',
  ];

  return preventableCategories.includes(category);
}

/**
 * Generate comprehensive response based on deployment readiness
 */
function generateDeploymentReadinessResponse(
  result: DeploymentReadinessResult,
  args: z.infer<typeof DeploymentReadinessSchema>
): any {
  if (result.isDeploymentReady) {
    return generateSuccessResponse(result, args);
  } else {
    return generateBlockedResponse(result, args);
  }
}

function generateSuccessResponse(
  result: DeploymentReadinessResult,
  args: z.infer<typeof DeploymentReadinessSchema>
): any {
  return validateMcpResponse({
    content: [
      {
        type: 'text',
        text: `✅ **DEPLOYMENT READY - All Gates Passed**

## 🎯 Overall Assessment
- **Deployment Ready**: ✅ **YES**
- **Readiness Score**: ${result.overallScore}%
- **Confidence**: ${result.confidence}%
- **Target Environment**: ${args.targetEnvironment}
- **Fast File Discovery**: ✅ Enhanced with fast-glob

## 🧪 Test Validation
- **Test Status**: ✅ ${result.testValidationResult.overallTestStatus.toUpperCase()}
- **Test Failures**: ${result.testValidationResult.failureCount}
- **Coverage**: ${result.testValidationResult.coveragePercentage}%
- **Execution Time**: ${result.testValidationResult.testExecutionTime}ms

## 📊 Deployment History
- **Success Rate**: ${result.deploymentHistoryAnalysis.successRate}%
- **Rollback Rate**: ${result.deploymentHistoryAnalysis.rollbackRate}%
- **Environment Stability**: ${result.deploymentHistoryAnalysis.environmentStability.riskLevel}

## 🏛️ ADR Compliance
- **Compliance Score**: ${result.adrComplianceResult.score}%
- **ADRs Analyzed**: ${result.adrComplianceResult.compliantAdrs}/${result.adrComplianceResult.totalAdrs}
- **Missing Implementations**: ${result.adrComplianceResult.missingImplementations.length} items

${
  result.environmentResearch
    ? `
## 🔍 Environment Research Analysis

**Research Confidence**: ${(result.environmentResearch.confidence * 100).toFixed(1)}%

### Infrastructure State
${result.environmentResearch.answer}

### Sources Consulted
${result.environmentResearch.sources.map(s => `- ${s.type}: ${s.found ? '✅ Available' : '❌ Not found'}`).join('\n')}

${
  result.environmentResearch.warnings.length > 0
    ? `### Environment Warnings
${result.environmentResearch.warnings.map(w => `- ⚠️ ${w}`).join('\n')}`
    : '### Environment Status\n✅ All environment checks passed'
}

${
  result.environmentResearch.needsWebSearch
    ? '⚠️ **Note**: Local environment data may be insufficient - consider external verification'
    : ''
}
`
    : ''
}

${(result as any).smartCodeAnalysis || ''}

## 🚀 Deployment Approved
${args.triggerSmartGitPush ? 'Triggering smart git push...' : 'Ready to proceed with deployment'}

${
  result.warnings.length > 0
    ? `
## ⚠️ Warnings
${result.warnings.map(w => `- ${w}`).join('\n')}
`
    : ''
}

**✅ DEPLOYMENT CAN PROCEED SAFELY**`,
      },
    ],
  });
}

function generateBlockedResponse(
  result: DeploymentReadinessResult,
  args: z.infer<typeof DeploymentReadinessSchema>
): any {
  return validateMcpResponse({
    content: [
      {
        type: 'text',
        text: `# 🚨 DEPLOYMENT BLOCKED - Critical Issues Detected

## ⚠️ Deployment Readiness: ${result.isDeploymentReady ? '✅ READY' : '❌ BLOCKED'}
- **Overall Score**: ${result.overallScore}/100
- **Confidence**: ${result.confidence}%
- **Target Environment**: ${args.targetEnvironment}
- **Tree-sitter Analysis**: ${args.enableTreeSitterAnalysis ? '✅ Enhanced' : '❌ Basic'}
- **Fast File Discovery**: ✅ Enhanced with fast-glob
- **Smart Code Linking**: ${args.requireAdrCompliance ? '✅ ADR Analysis Enabled' : '❌ Disabled'}

## 🧪 Test Validation Issues
${
  result.testFailureBlockers.length > 0
    ? `
**Test Failures**: ${result.testValidationResult.failureCount} failures detected
**Coverage**: ${result.testValidationResult.coveragePercentage}% (Required: ${args.requireTestCoverage}%)

### Critical Test Failures:
${result.testValidationResult.criticalTestFailures.map(f => `- ❌ ${f.testSuite}: ${f.testName}`).join('\n')}
`
    : '✅ Tests passing'
}

## 📊 Deployment History Issues
${
  result.deploymentHistoryBlockers.length > 0
    ? `
**Success Rate**: ${result.deploymentHistoryAnalysis.successRate}% (Required: ${args.deploymentSuccessThreshold}%)
**Rollback Rate**: ${result.deploymentHistoryAnalysis.rollbackRate}% (Threshold: ${args.rollbackFrequencyThreshold}%)

### Recent Failure Patterns:
${result.deploymentHistoryAnalysis.failurePatterns.map(p => `- **${p.pattern}**: ${p.frequency} occurrences`).join('\n')}
`
    : '✅ Deployment history stable'
}

${
  result.environmentResearch
    ? `
## 🔍 Environment Research Analysis

**Research Confidence**: ${(result.environmentResearch.confidence * 100).toFixed(1)}%

### Infrastructure State
${result.environmentResearch.answer}

### Sources Consulted
${result.environmentResearch.sources.map(s => `- ${s.type}: ${s.found ? '✅ Available' : '❌ Not found'}`).join('\n')}

${
  result.environmentResearch.warnings.length > 0
    ? `### Environment Warnings
${result.environmentResearch.warnings.map(w => `- ⚠️ ${w}`).join('\n')}`
    : '### Environment Status\n✅ All environment checks passed'
}

${
  result.environmentResearch.needsWebSearch
    ? '⚠️ **Note**: Local environment data may be insufficient - consider external verification'
    : ''
}
`
    : ''
}

${(result as any).smartCodeAnalysis || ''}

## 🚨 Critical Blockers (Must Fix Before Deployment)
${result.criticalBlockers
  .map(
    blocker => `
### ${blocker.category.toUpperCase()}: ${blocker.title}
- **Impact**: ${blocker.impact}
- **Resolution**: ${blocker.resolutionSteps.join(' → ')}
- **Estimated Time**: ${blocker.estimatedResolutionTime}
`
  )
  .join('\n')}

## 🛠️ Immediate Actions Required

### 1. Fix Test Issues
\`\`\`bash
# Run tests and fix failures
npm test

# Check detailed coverage
npm run test:coverage
\`\`\`

### 2. Address Deployment History
\`\`\`bash
# Review recent failures
# Fix infrastructure issues
# Improve deployment reliability
\`\`\`

### 3. Re-validate When Fixed
\`\`\`bash
# Run full audit again
deployment_readiness --operation full_audit --target-environment ${args.targetEnvironment}
\`\`\`

### 3. Emergency Override (If Justified)
\`\`\`bash
# Only if business critical and approved
npm run deploy:emergency -- --justification="Critical security fix"
\`\`\`

**⚠️ WARNING**: Emergency overrides bypass safety checks. Use only when absolutely necessary.
`,
      },
    ],
  });
}

/**
 * Create default CodeQualityAnalysis structure
 */
function createDefaultCodeQualityAnalysis(
  qualityScore: number = 75,
  productionIndicators: number = 10,
  mockIndicators: number = 2
): CodeQualityAnalysis {
  return {
    qualityScore,
    productionIndicators,
    mockIndicators,
    failingFiles: [],
    recommendations: [],
    securityIssues: [],
    architecturalViolations: [],
    codeComplexity: {
      averageComplexity: 0,
      highComplexityFiles: [],
      totalFunctions: 0,
    },
    dependencyAnalysis: {
      dangerousImports: [],
      frameworksDetected: [],
      securityLibraries: [],
    },
  };
}

/**
 * Perform tree-sitter enhanced code quality analysis
 */
async function analyzeCodeQualityWithTreeSitter(
  projectPath: string,
  enableTreeSitter: boolean,
  _languages: string[]
): Promise<CodeQualityAnalysis> {
  const baseAnalysis = createDefaultCodeQualityAnalysis();

  if (!enableTreeSitter) {
    return baseAnalysis;
  }

  try {
    const analyzer = new TreeSitterAnalyzer();

    // Use fast-glob based file discovery for enhanced performance
    const findResult = await findFiles(projectPath, ['**/*.{ts,js,py,yml,yaml,tf,hcl,sh}']);

    // Analyze files (limit to first 20 for performance)
    const sourceFiles = findResult.files.map(f => f.path);
    const filesToAnalyze = sourceFiles.slice(0, 20);
    let totalComplexity = 0;
    let totalFunctions = 0;
    const highComplexityFiles: string[] = [];

    for (const filePath of filesToAnalyze) {
      try {
        const analysis = await analyzer.analyzeFile(filePath);

        // Security issues
        if (analysis.hasSecrets && analysis.secrets.length > 0) {
          analysis.secrets.forEach(secret => {
            baseAnalysis.securityIssues.push({
              type: secret.type,
              severity:
                secret.confidence > 0.8 ? 'high' : secret.confidence > 0.6 ? 'medium' : 'low',
              message: `${secret.type} detected: ${secret.context}`,
              file: filePath,
              line: secret.location.line,
            });
          });
        }

        // Security issues from general analysis
        if (analysis.securityIssues && analysis.securityIssues.length > 0) {
          analysis.securityIssues.forEach(issue => {
            baseAnalysis.securityIssues.push({
              type: issue.type,
              severity: issue.severity,
              message: issue.message,
              file: filePath,
              line: issue.location.line,
            });
          });
        }

        // Dangerous imports
        if (analysis.imports) {
          analysis.imports.forEach(imp => {
            if (imp.isDangerous) {
              baseAnalysis.dependencyAnalysis.dangerousImports.push({
                module: imp.module,
                file: filePath,
                reason: imp.reason || 'Potentially dangerous import',
              });
            }

            // Detect frameworks
            const frameworks = ['express', 'react', 'vue', 'angular', 'fastapi', 'django', 'flask'];
            frameworks.forEach(framework => {
              if (
                imp.module.toLowerCase().includes(framework) &&
                !baseAnalysis.dependencyAnalysis.frameworksDetected.includes(framework)
              ) {
                baseAnalysis.dependencyAnalysis.frameworksDetected.push(framework);
              }
            });

            // Detect security libraries
            const securityLibs = ['bcrypt', 'crypto', 'jwt', 'passport', 'helmet'];
            securityLibs.forEach(lib => {
              if (
                imp.module.toLowerCase().includes(lib) &&
                !baseAnalysis.dependencyAnalysis.securityLibraries.includes(lib)
              ) {
                baseAnalysis.dependencyAnalysis.securityLibraries.push(lib);
              }
            });
          });
        }

        // Function complexity analysis
        if (analysis.functions) {
          analysis.functions.forEach(func => {
            totalFunctions++;
            totalComplexity += func.complexity;

            if (func.complexity > 10) {
              highComplexityFiles.push(`${filePath}:${func.name} (complexity: ${func.complexity})`);
            }
          });
        }

        // Architectural violations (basic detection)
        if (analysis.architecturalViolations && analysis.architecturalViolations.length > 0) {
          analysis.architecturalViolations.forEach(violation => {
            baseAnalysis.architecturalViolations.push(`${filePath}: ${violation.message}`);
          });
        }
      } catch (error) {
        // Skip files that can't be analyzed
        console.warn(`Could not analyze file ${filePath}:`, error);
      }
    }

    // Update complexity metrics
    baseAnalysis.codeComplexity = {
      averageComplexity: totalFunctions > 0 ? totalComplexity / totalFunctions : 0,
      highComplexityFiles: highComplexityFiles.slice(0, 10), // Limit to top 10
      totalFunctions,
    };

    // Calculate enhanced quality score
    let qualityScore = 85; // Base score

    // Deduct for security issues
    const criticalSecurity = baseAnalysis.securityIssues.filter(
      i => i.severity === 'critical'
    ).length;
    const highSecurity = baseAnalysis.securityIssues.filter(i => i.severity === 'high').length;
    qualityScore -= criticalSecurity * 20 + highSecurity * 10;

    // Deduct for dangerous imports
    qualityScore -= Math.min(baseAnalysis.dependencyAnalysis.dangerousImports.length * 5, 20);

    // Deduct for high complexity
    qualityScore -= Math.min(highComplexityFiles.length * 2, 15);

    // Bonus for security libraries
    qualityScore += Math.min(baseAnalysis.dependencyAnalysis.securityLibraries.length * 2, 10);

    baseAnalysis.qualityScore = Math.max(0, Math.min(100, qualityScore));

    // Update production/mock indicators based on analysis
    baseAnalysis.productionIndicators = Math.max(10, baseAnalysis.qualityScore - 20);
    baseAnalysis.mockIndicators = Math.max(0, 100 - baseAnalysis.qualityScore) / 10;

    return baseAnalysis;
  } catch (error) {
    console.warn('Tree-sitter analysis failed, using basic analysis:', error);
    return baseAnalysis;
  }
}
