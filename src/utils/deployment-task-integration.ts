/**
 * MCP Tasks Integration for Deployment Readiness Tool
 *
 * This module provides standardized task tracking for the deployment readiness tool,
 * implementing ADR-020: MCP Tasks Integration Strategy.
 *
 * Key features:
 * - Creates MCP Tasks for deployment validation operations
 * - Tracks progress through validation phases (tests, history, code quality, ADR compliance)
 * - Supports cancellation between phases
 * - Provides memory integration for deployment assessment tracking
 *
 * @see ADR-020: MCP Tasks Integration Strategy
 * @see https://modelcontextprotocol.io/specification/2025-11-25/basic/utilities/tasks
 */

import { getTaskManager, type AdrTask, type TaskResult, type TaskManager } from './task-manager.js';
import { createComponentLogger, type ComponentLogger } from './enhanced-logging.js';

const logger: ComponentLogger = createComponentLogger('DeploymentTaskIntegration');

/**
 * Deployment validation phases that map to MCP Task phases
 */
export const DEPLOYMENT_PHASES = [
  'initialization',
  'test_validation',
  'code_quality_analysis',
  'deployment_history_analysis',
  'adr_compliance_check',
  'environment_research',
  'blocker_assessment',
  'final_report',
] as const;

export type DeploymentPhase = (typeof DEPLOYMENT_PHASES)[number];

/**
 * Deployment task context for tracking state across validation steps
 */
export interface DeploymentTaskContext {
  taskId: string;
  currentPhase: DeploymentPhase;
  operation: string;
  targetEnvironment: string;
  cancelled: boolean;
  testValidationResult?: {
    passed: boolean;
    failureCount: number;
    coveragePercentage: number;
  };
  codeQualityResult?: {
    score: number;
    securityIssues: number;
    complexity: number;
  };
  historyAnalysisResult?: {
    successRate: number;
    rollbackRate: number;
    recommendedAction: string;
  };
  adrComplianceResult?: {
    score: number;
    compliantAdrs: number;
    totalAdrs: number;
  };
  blockerCount?: number;
}

/**
 * Options for creating a deployment task
 */
export interface CreateDeploymentTaskOptions {
  projectPath: string;
  targetEnvironment: string;
  operation: string;
  strictMode?: boolean;
  enableMemoryIntegration?: boolean;
  enableTreeSitterAnalysis?: boolean;
  enableResearchIntegration?: boolean;
}

/**
 * Result from deployment task execution
 */
export interface DeploymentTaskResult extends TaskResult {
  data?: {
    isDeploymentReady: boolean;
    overallScore: number;
    confidence: number;
    blockerCount: number;
    testsPassed: boolean;
    gitPushStatus: 'allowed' | 'blocked' | 'conditional';
    memoryEntityId?: string;
  };
}

/**
 * Deployment Task Manager - Provides MCP Tasks integration for deployment readiness
 *
 * This class wraps the TaskManager to provide deployment-specific functionality:
 * - Creates tasks with deployment validation phases
 * - Tracks validation progress through multiple checks
 * - Supports cancellation between phases
 * - Integrates with memory for assessment tracking
 */
export class DeploymentTaskManager {
  private taskManager: TaskManager;
  private activeContexts: Map<string, DeploymentTaskContext> = new Map();

  constructor(taskManager?: TaskManager) {
    this.taskManager = taskManager ?? getTaskManager();
  }

  /**
   * Initialize the deployment task manager
   */
  async initialize(): Promise<void> {
    await this.taskManager.initialize();
    logger.info('DeploymentTaskManager initialized');
  }

  /**
   * Create a new deployment task
   *
   * @returns The created task and context
   */
  async createDeploymentTask(options: CreateDeploymentTaskOptions): Promise<{
    task: AdrTask;
    context: DeploymentTaskContext;
  }> {
    const { projectPath, targetEnvironment, operation } = options;

    const task = await this.taskManager.createTask({
      type: 'deployment',
      tool: 'deployment_readiness',
      phases: [...DEPLOYMENT_PHASES],
      projectPath,
      ttl: 600000, // 10 minute TTL for deployment checks
      pollInterval: 1000, // 1 second poll interval
    });

    const context: DeploymentTaskContext = {
      taskId: task.taskId,
      currentPhase: 'initialization',
      operation,
      targetEnvironment,
      cancelled: false,
    };

    this.activeContexts.set(task.taskId, context);

    logger.info('Deployment task created', {
      taskId: task.taskId,
      projectPath,
      targetEnvironment,
      operation,
    });

    return { task, context };
  }

  /**
   * Get deployment task context
   */
  getContext(taskId: string): DeploymentTaskContext | undefined {
    return this.activeContexts.get(taskId);
  }

  /**
   * Start a deployment phase
   */
  async startPhase(taskId: string, phase: DeploymentPhase, message?: string): Promise<void> {
    const context = this.activeContexts.get(taskId);
    if (!context) {
      logger.warn('No context found for task', { taskId });
      return;
    }

    // Check for cancellation
    if (context.cancelled) {
      throw new Error('Task was cancelled');
    }

    context.currentPhase = phase;

    await this.taskManager.startPhase(taskId, phase);

    // Calculate overall progress based on phase
    const phaseIndex = DEPLOYMENT_PHASES.indexOf(phase);
    const phaseProgress =
      phaseIndex >= 0 ? Math.floor((phaseIndex / DEPLOYMENT_PHASES.length) * 100) : 0;

    await this.taskManager.updateProgress({
      taskId,
      progress: phaseProgress,
      phase,
      phaseProgress: 0,
      message: message ?? `Starting phase: ${phase}`,
    });

    logger.info('Deployment phase started', { taskId, phase, progress: phaseProgress });
  }

  /**
   * Update phase progress
   */
  async updatePhaseProgress(
    taskId: string,
    phase: DeploymentPhase,
    phaseProgress: number,
    message?: string
  ): Promise<void> {
    const context = this.activeContexts.get(taskId);
    if (!context) {
      return;
    }

    // Calculate overall progress
    const phaseIndex = DEPLOYMENT_PHASES.indexOf(phase);
    const phaseFraction = 100 / DEPLOYMENT_PHASES.length;
    const baseProgress = phaseIndex * phaseFraction;
    const overallProgress = Math.floor(baseProgress + (phaseProgress / 100) * phaseFraction);

    await this.taskManager.updateProgress({
      taskId,
      progress: overallProgress,
      phase,
      phaseProgress,
      ...(message !== undefined && { message }),
    });
  }

  /**
   * Complete a deployment phase
   */
  async completePhase(taskId: string, phase: DeploymentPhase, _message?: string): Promise<void> {
    const context = this.activeContexts.get(taskId);
    if (!context) {
      return;
    }

    await this.taskManager.completePhase(taskId, phase);

    logger.info('Deployment phase completed', { taskId, phase });
  }

  /**
   * Fail a deployment phase
   */
  async failPhase(taskId: string, phase: DeploymentPhase, error: string): Promise<void> {
    const context = this.activeContexts.get(taskId);
    if (!context) {
      return;
    }

    await this.taskManager.failPhase(taskId, phase, error);

    logger.warn('Deployment phase failed', { taskId, phase, error });
  }

  /**
   * Store test validation result
   */
  async storeTestValidationResult(
    taskId: string,
    result: { passed: boolean; failureCount: number; coveragePercentage: number }
  ): Promise<void> {
    const context = this.activeContexts.get(taskId);
    if (!context) {
      return;
    }

    context.testValidationResult = result;

    const statusMessage = result.passed
      ? `Tests passed (${result.failureCount} failures, ${result.coveragePercentage}% coverage)`
      : `Tests failed (${result.failureCount} failures, ${result.coveragePercentage}% coverage)`;

    await this.taskManager.updateProgress({
      taskId,
      progress: 25,
      message: statusMessage,
    });

    logger.info('Test validation result stored', { taskId, ...result });
  }

  /**
   * Store code quality result
   */
  async storeCodeQualityResult(
    taskId: string,
    result: { score: number; securityIssues: number; complexity: number }
  ): Promise<void> {
    const context = this.activeContexts.get(taskId);
    if (!context) {
      return;
    }

    context.codeQualityResult = result;

    await this.taskManager.updateProgress({
      taskId,
      progress: 40,
      message: `Code quality score: ${result.score}% (${result.securityIssues} security issues)`,
    });

    logger.info('Code quality result stored', { taskId, ...result });
  }

  /**
   * Store deployment history analysis result
   */
  async storeHistoryAnalysisResult(
    taskId: string,
    result: { successRate: number; rollbackRate: number; recommendedAction: string }
  ): Promise<void> {
    const context = this.activeContexts.get(taskId);
    if (!context) {
      return;
    }

    context.historyAnalysisResult = result;

    await this.taskManager.updateProgress({
      taskId,
      progress: 55,
      message: `Deployment history: ${result.successRate}% success, ${result.rollbackRate}% rollback`,
    });

    logger.info('History analysis result stored', { taskId, ...result });
  }

  /**
   * Store ADR compliance result
   */
  async storeAdrComplianceResult(
    taskId: string,
    result: { score: number; compliantAdrs: number; totalAdrs: number }
  ): Promise<void> {
    const context = this.activeContexts.get(taskId);
    if (!context) {
      return;
    }

    context.adrComplianceResult = result;

    await this.taskManager.updateProgress({
      taskId,
      progress: 70,
      message: `ADR compliance: ${result.score}% (${result.compliantAdrs}/${result.totalAdrs} ADRs)`,
    });

    logger.info('ADR compliance result stored', { taskId, ...result });
  }

  /**
   * Store blocker count
   */
  async storeBlockerCount(taskId: string, blockerCount: number): Promise<void> {
    const context = this.activeContexts.get(taskId);
    if (!context) {
      return;
    }

    context.blockerCount = blockerCount;

    const statusMessage =
      blockerCount === 0
        ? 'No deployment blockers found'
        : `${blockerCount} deployment blocker(s) found`;

    await this.taskManager.updateProgress({
      taskId,
      progress: 85,
      message: statusMessage,
    });

    logger.info('Blocker count stored', { taskId, blockerCount });
  }

  /**
   * Check if task is cancelled
   */
  async isCancelled(taskId: string): Promise<boolean> {
    const context = this.activeContexts.get(taskId);
    if (!context) {
      return false;
    }

    // Check if task was cancelled externally
    const task = await this.taskManager.getTask(taskId);
    if (task?.status === 'cancelled') {
      context.cancelled = true;
    }

    return context.cancelled;
  }

  /**
   * Cancel a deployment task
   */
  async cancelTask(taskId: string, reason?: string): Promise<void> {
    const context = this.activeContexts.get(taskId);
    if (context) {
      context.cancelled = true;
    }

    await this.taskManager.cancelTask(taskId, reason ?? 'Deployment validation cancelled by user');
    this.activeContexts.delete(taskId);

    logger.info('Deployment task cancelled', { taskId, reason });
  }

  /**
   * Complete a deployment task successfully
   */
  async completeTask(taskId: string, result: DeploymentTaskResult): Promise<void> {
    await this.taskManager.completeTask(taskId, result);
    this.activeContexts.delete(taskId);

    logger.info('Deployment task completed', { taskId, success: result.success });
  }

  /**
   * Fail a deployment task
   */
  async failTask(taskId: string, error: string): Promise<void> {
    await this.taskManager.failTask(taskId, error);
    this.activeContexts.delete(taskId);

    logger.error('Deployment task failed', undefined, { taskId, error });
  }

  /**
   * Get task status
   */
  async getTaskStatus(taskId: string): Promise<{
    task: AdrTask | null;
    context: DeploymentTaskContext | undefined;
  }> {
    const task = await this.taskManager.getTask(taskId);
    const context = this.activeContexts.get(taskId);
    return { task, context };
  }
}

/**
 * Get the global DeploymentTaskManager instance
 */
let globalDeploymentTaskManager: DeploymentTaskManager | null = null;

export function getDeploymentTaskManager(): DeploymentTaskManager {
  if (!globalDeploymentTaskManager) {
    globalDeploymentTaskManager = new DeploymentTaskManager();
  }
  return globalDeploymentTaskManager;
}

/**
 * Reset the global DeploymentTaskManager (for testing)
 */
export async function resetDeploymentTaskManager(): Promise<void> {
  globalDeploymentTaskManager = null;
}

/**
 * Helper function to wrap deployment execution with task tracking
 *
 * This can be used by the deployment_readiness tool to automatically
 * track progress through MCP Tasks.
 *
 * @example
 * ```typescript
 * const result = await executeDeploymentWithTaskTracking(
 *   {
 *     projectPath: '/path/to/project',
 *     targetEnvironment: 'production',
 *     operation: 'full_audit',
 *   },
 *   async (tracker) => {
 *     // Test validation phase
 *     await tracker.startPhase('test_validation');
 *     const testResult = await runTests();
 *     await tracker.storeTestValidationResult(testResult);
 *     await tracker.completePhase('test_validation');
 *
 *     // Code quality phase
 *     await tracker.startPhase('code_quality_analysis');
 *     const qualityResult = await analyzeCodeQuality();
 *     await tracker.storeCodeQualityResult(qualityResult);
 *     await tracker.completePhase('code_quality_analysis');
 *
 *     // Return final result
 *     return { isDeploymentReady: true, overallScore: 95 };
 *   }
 * );
 * ```
 */
export async function executeDeploymentWithTaskTracking<T extends DeploymentTaskResult>(
  options: CreateDeploymentTaskOptions,
  executor: (tracker: DeploymentTaskTracker) => Promise<T['data']>
): Promise<{ taskId: string; result: T }> {
  const dtm = getDeploymentTaskManager();
  await dtm.initialize();

  const { task, context } = await dtm.createDeploymentTask(options);
  const taskId = task.taskId;

  // Create a tracker interface for the executor
  const tracker: DeploymentTaskTracker = {
    taskId,
    startPhase: (phase, message) => dtm.startPhase(taskId, phase, message),
    updatePhaseProgress: (phase, progress, message) =>
      dtm.updatePhaseProgress(taskId, phase, progress, message),
    completePhase: (phase, message) => dtm.completePhase(taskId, phase, message),
    failPhase: (phase, error) => dtm.failPhase(taskId, phase, error),
    storeTestValidationResult: result => dtm.storeTestValidationResult(taskId, result),
    storeCodeQualityResult: result => dtm.storeCodeQualityResult(taskId, result),
    storeHistoryAnalysisResult: result => dtm.storeHistoryAnalysisResult(taskId, result),
    storeAdrComplianceResult: result => dtm.storeAdrComplianceResult(taskId, result),
    storeBlockerCount: count => dtm.storeBlockerCount(taskId, count),
    isCancelled: () => dtm.isCancelled(taskId),
    getContext: () => context,
  };

  try {
    const resultData = await executor(tracker);

    const result = {
      success: resultData?.isDeploymentReady ?? false,
      data: resultData,
    } as T;

    await dtm.completeTask(taskId, result);

    return { taskId, result };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    await dtm.failTask(taskId, errorMessage);

    return {
      taskId,
      result: {
        success: false,
        error: {
          code: 'DEPLOYMENT_READINESS_ERROR',
          message: errorMessage,
          recoverable: false,
        },
      } as T,
    };
  }
}

/**
 * Task tracker interface provided to deployment executor
 */
export interface DeploymentTaskTracker {
  taskId: string;
  startPhase: (phase: DeploymentPhase, message?: string) => Promise<void>;
  updatePhaseProgress: (
    phase: DeploymentPhase,
    progress: number,
    message?: string
  ) => Promise<void>;
  completePhase: (phase: DeploymentPhase, message?: string) => Promise<void>;
  failPhase: (phase: DeploymentPhase, error: string) => Promise<void>;
  storeTestValidationResult: (result: {
    passed: boolean;
    failureCount: number;
    coveragePercentage: number;
  }) => Promise<void>;
  storeCodeQualityResult: (result: {
    score: number;
    securityIssues: number;
    complexity: number;
  }) => Promise<void>;
  storeHistoryAnalysisResult: (result: {
    successRate: number;
    rollbackRate: number;
    recommendedAction: string;
  }) => Promise<void>;
  storeAdrComplianceResult: (result: {
    score: number;
    compliantAdrs: number;
    totalAdrs: number;
  }) => Promise<void>;
  storeBlockerCount: (count: number) => Promise<void>;
  isCancelled: () => Promise<boolean>;
  getContext: () => DeploymentTaskContext;
}
