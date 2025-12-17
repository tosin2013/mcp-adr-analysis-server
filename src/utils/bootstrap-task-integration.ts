/**
 * MCP Tasks Integration for Bootstrap Validation Loop
 *
 * This module provides standardized task tracking for the bootstrap validation loop tool,
 * implementing ADR-020: MCP Tasks Integration Strategy.
 *
 * Key features:
 * - Creates MCP Tasks for bootstrap operations
 * - Tracks progress through phases (platform_detection, infrastructure, application, validation)
 * - Supports cancellation between phases
 * - Migrates from custom executionId to standardized taskId
 *
 * @see ADR-020: MCP Tasks Integration Strategy
 * @see https://modelcontextprotocol.io/specification/2025-11-25/basic/utilities/tasks
 */

import { getTaskManager, type AdrTask, type TaskResult, type TaskManager } from './task-manager.js';
import { createComponentLogger, type ComponentLogger } from './enhanced-logging.js';

const logger: ComponentLogger = createComponentLogger('BootstrapTaskIntegration');

/**
 * Bootstrap phases that map to MCP Task phases
 */
export const BOOTSTRAP_PHASES = [
  'platform_detection',
  'infrastructure_setup',
  'application_deployment',
  'validation',
  'cleanup',
] as const;

export type BootstrapPhase = (typeof BOOTSTRAP_PHASES)[number];

/**
 * Bootstrap task context for tracking state across iterations
 */
export interface BootstrapTaskContext {
  taskId: string;
  currentPhase: BootstrapPhase;
  iteration: number;
  maxIterations: number;
  cancelled: boolean;
  platformDetected?: string;
  infrastructureResult?: {
    success: boolean;
    executedTasks: string[];
    failedTasks: string[];
  };
}

/**
 * Options for creating a bootstrap task
 */
export interface CreateBootstrapTaskOptions {
  projectPath: string;
  adrDirectory: string;
  targetEnvironment: string;
  maxIterations: number;
  autoFix: boolean;
  updateAdrsWithLearnings: boolean;
}

/**
 * Result from bootstrap task execution
 */
export interface BootstrapTaskResult extends TaskResult {
  data?: {
    success: boolean;
    iterations: number;
    platformDetected?: string;
    deploymentPlan?: unknown;
    adrUpdates?: unknown[];
    learnings?: unknown[];
    bootstrapAdrPath?: string;
    contextDocumentPath?: string;
  };
}

/**
 * Bootstrap Task Manager - Provides MCP Tasks integration for bootstrap validation loop
 *
 * This class wraps the TaskManager to provide bootstrap-specific functionality:
 * - Creates tasks with bootstrap-specific phases
 * - Tracks iteration progress
 * - Supports cancellation checks between phases
 * - Converts between executionId and taskId patterns
 */
export class BootstrapTaskManager {
  private taskManager: TaskManager;
  private activeContexts: Map<string, BootstrapTaskContext> = new Map();

  constructor(taskManager?: TaskManager) {
    this.taskManager = taskManager ?? getTaskManager();
  }

  /**
   * Initialize the bootstrap task manager
   */
  async initialize(): Promise<void> {
    await this.taskManager.initialize();
    logger.info('BootstrapTaskManager initialized');
  }

  /**
   * Create a new bootstrap task
   *
   * @returns The created task and context
   */
  async createBootstrapTask(options: CreateBootstrapTaskOptions): Promise<{
    task: AdrTask;
    context: BootstrapTaskContext;
  }> {
    const { projectPath, adrDirectory, maxIterations } = options;

    const task = await this.taskManager.createTask({
      type: 'bootstrap',
      tool: 'bootstrap_validation_loop',
      phases: [...BOOTSTRAP_PHASES],
      projectPath,
      adrDirectory,
      ttl: 1800000, // 30 minute TTL for bootstrap operations
      pollInterval: 2000, // 2 second poll interval
    });

    const context: BootstrapTaskContext = {
      taskId: task.taskId,
      currentPhase: 'platform_detection',
      iteration: 0,
      maxIterations,
      cancelled: false,
    };

    this.activeContexts.set(task.taskId, context);

    logger.info('Bootstrap task created', {
      taskId: task.taskId,
      projectPath,
      maxIterations,
    });

    return { task, context };
  }

  /**
   * Get bootstrap task context
   */
  getContext(taskId: string): BootstrapTaskContext | undefined {
    return this.activeContexts.get(taskId);
  }

  /**
   * Start a bootstrap phase
   */
  async startPhase(taskId: string, phase: BootstrapPhase, message?: string): Promise<void> {
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
    const phaseIndex = BOOTSTRAP_PHASES.indexOf(phase);
    const phaseProgress =
      phaseIndex >= 0 ? Math.floor((phaseIndex / BOOTSTRAP_PHASES.length) * 100) : 0;

    await this.taskManager.updateProgress({
      taskId,
      progress: phaseProgress,
      phase,
      phaseProgress: 0,
      message: message ?? `Starting phase: ${phase}`,
    });

    logger.info('Bootstrap phase started', { taskId, phase, progress: phaseProgress });
  }

  /**
   * Update phase progress
   */
  async updatePhaseProgress(
    taskId: string,
    phase: BootstrapPhase,
    phaseProgress: number,
    message?: string
  ): Promise<void> {
    const context = this.activeContexts.get(taskId);
    if (!context) {
      return;
    }

    // Calculate overall progress
    const phaseIndex = BOOTSTRAP_PHASES.indexOf(phase);
    const phaseFraction = 100 / BOOTSTRAP_PHASES.length;
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
   * Complete a bootstrap phase
   */
  async completePhase(taskId: string, phase: BootstrapPhase, _message?: string): Promise<void> {
    const context = this.activeContexts.get(taskId);
    if (!context) {
      return;
    }

    await this.taskManager.completePhase(taskId, phase);

    logger.info('Bootstrap phase completed', { taskId, phase });
  }

  /**
   * Fail a bootstrap phase
   */
  async failPhase(taskId: string, phase: BootstrapPhase, error: string): Promise<void> {
    const context = this.activeContexts.get(taskId);
    if (!context) {
      return;
    }

    await this.taskManager.failPhase(taskId, phase, error);

    logger.warn('Bootstrap phase failed', { taskId, phase, error });
  }

  /**
   * Update iteration progress
   */
  async updateIteration(taskId: string, iteration: number): Promise<void> {
    const context = this.activeContexts.get(taskId);
    if (!context) {
      return;
    }

    context.iteration = iteration;

    await this.taskManager.updateProgress({
      taskId,
      progress: this.taskManager.getProgress(taskId) ?? 0,
      message: `Iteration ${iteration}/${context.maxIterations}`,
    });

    logger.info('Bootstrap iteration updated', {
      taskId,
      iteration,
      maxIterations: context.maxIterations,
    });
  }

  /**
   * Store platform detection result
   */
  async storePlatformDetection(
    taskId: string,
    platform: string,
    confidence: number
  ): Promise<void> {
    const context = this.activeContexts.get(taskId);
    if (!context) {
      return;
    }

    context.platformDetected = platform;

    await this.taskManager.updateProgress({
      taskId,
      progress: 20, // Platform detection is ~20% of bootstrap
      message: `Platform detected: ${platform} (${(confidence * 100).toFixed(0)}% confidence)`,
    });

    logger.info('Platform detection stored', { taskId, platform, confidence });
  }

  /**
   * Store infrastructure result
   */
  async storeInfrastructureResult(
    taskId: string,
    result: { success: boolean; executedTasks: string[]; failedTasks: string[] }
  ): Promise<void> {
    const context = this.activeContexts.get(taskId);
    if (!context) {
      return;
    }

    context.infrastructureResult = result;

    const progress = result.success ? 50 : 40;
    await this.taskManager.updateProgress({
      taskId,
      progress,
      message: result.success
        ? `Infrastructure setup complete (${result.executedTasks.length} tasks executed)`
        : `Infrastructure setup failed (${result.failedTasks.length} tasks failed)`,
    });

    logger.info('Infrastructure result stored', {
      taskId,
      success: result.success,
      executed: result.executedTasks.length,
      failed: result.failedTasks.length,
    });
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
   * Cancel a bootstrap task
   */
  async cancelTask(taskId: string, reason?: string): Promise<void> {
    const context = this.activeContexts.get(taskId);
    if (context) {
      context.cancelled = true;
    }

    await this.taskManager.cancelTask(taskId, reason ?? 'Bootstrap cancelled by user');
    this.activeContexts.delete(taskId);

    logger.info('Bootstrap task cancelled', { taskId, reason });
  }

  /**
   * Complete a bootstrap task successfully
   */
  async completeTask(taskId: string, result: BootstrapTaskResult): Promise<void> {
    await this.taskManager.completeTask(taskId, result);
    this.activeContexts.delete(taskId);

    logger.info('Bootstrap task completed', { taskId, success: result.success });
  }

  /**
   * Fail a bootstrap task
   */
  async failTask(taskId: string, error: string): Promise<void> {
    await this.taskManager.failTask(taskId, error);
    this.activeContexts.delete(taskId);

    logger.error('Bootstrap task failed', undefined, { taskId, error });
  }

  /**
   * Get task status
   */
  async getTaskStatus(taskId: string): Promise<{
    task: AdrTask | null;
    context: BootstrapTaskContext | undefined;
  }> {
    const task = await this.taskManager.getTask(taskId);
    const context = this.activeContexts.get(taskId);
    return { task, context };
  }
}

/**
 * Get the global BootstrapTaskManager instance
 */
let globalBootstrapTaskManager: BootstrapTaskManager | null = null;

export function getBootstrapTaskManager(): BootstrapTaskManager {
  if (!globalBootstrapTaskManager) {
    globalBootstrapTaskManager = new BootstrapTaskManager();
  }
  return globalBootstrapTaskManager;
}

/**
 * Reset the global BootstrapTaskManager (for testing)
 */
export async function resetBootstrapTaskManager(): Promise<void> {
  globalBootstrapTaskManager = null;
}

/**
 * Helper function to wrap bootstrap execution with task tracking
 *
 * This can be used by the bootstrap_validation_loop tool to automatically
 * track progress through MCP Tasks.
 *
 * @example
 * ```typescript
 * const result = await executeWithTaskTracking(
 *   {
 *     projectPath: '/path/to/project',
 *     adrDirectory: 'docs/adrs',
 *     targetEnvironment: 'development',
 *     maxIterations: 5,
 *     autoFix: true,
 *     updateAdrsWithLearnings: true,
 *   },
 *   async (tracker) => {
 *     // Platform detection phase
 *     await tracker.startPhase('platform_detection');
 *     const platform = await detectPlatform();
 *     await tracker.storePlatformDetection(platform.name, platform.confidence);
 *     await tracker.completePhase('platform_detection');
 *
 *     // Infrastructure phase
 *     await tracker.startPhase('infrastructure_setup');
 *     const infraResult = await runInfrastructure();
 *     await tracker.storeInfrastructureResult(infraResult);
 *     await tracker.completePhase('infrastructure_setup');
 *
 *     // Return final result
 *     return { success: true, iterations: 3 };
 *   }
 * );
 * ```
 */
export async function executeWithTaskTracking<T extends BootstrapTaskResult>(
  options: CreateBootstrapTaskOptions,
  executor: (tracker: TaskTracker) => Promise<T['data']>
): Promise<{ taskId: string; result: T }> {
  const btm = getBootstrapTaskManager();
  await btm.initialize();

  const { task, context } = await btm.createBootstrapTask(options);
  const taskId = task.taskId;

  // Create a tracker interface for the executor
  const tracker: TaskTracker = {
    taskId,
    startPhase: (phase, message) => btm.startPhase(taskId, phase, message),
    updatePhaseProgress: (phase, progress, message) =>
      btm.updatePhaseProgress(taskId, phase, progress, message),
    completePhase: (phase, message) => btm.completePhase(taskId, phase, message),
    failPhase: (phase, error) => btm.failPhase(taskId, phase, error),
    updateIteration: iteration => btm.updateIteration(taskId, iteration),
    storePlatformDetection: (platform, confidence) =>
      btm.storePlatformDetection(taskId, platform, confidence),
    storeInfrastructureResult: result => btm.storeInfrastructureResult(taskId, result),
    isCancelled: () => btm.isCancelled(taskId),
    getContext: () => context,
  };

  try {
    const resultData = await executor(tracker);

    const result = {
      success: resultData?.success ?? true,
      data: resultData,
    } as T;

    await btm.completeTask(taskId, result);

    return { taskId, result };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    await btm.failTask(taskId, errorMessage);

    return {
      taskId,
      result: {
        success: false,
        error: {
          code: 'BOOTSTRAP_ERROR',
          message: errorMessage,
          recoverable: false,
        },
      } as T,
    };
  }
}

/**
 * Task tracker interface provided to bootstrap executor
 */
export interface TaskTracker {
  taskId: string;
  startPhase: (phase: BootstrapPhase, message?: string) => Promise<void>;
  updatePhaseProgress: (phase: BootstrapPhase, progress: number, message?: string) => Promise<void>;
  completePhase: (phase: BootstrapPhase, message?: string) => Promise<void>;
  failPhase: (phase: BootstrapPhase, error: string) => Promise<void>;
  updateIteration: (iteration: number) => Promise<void>;
  storePlatformDetection: (platform: string, confidence: number) => Promise<void>;
  storeInfrastructureResult: (result: {
    success: boolean;
    executedTasks: string[];
    failedTasks: string[];
  }) => Promise<void>;
  isCancelled: () => Promise<boolean>;
  getContext: () => BootstrapTaskContext;
}
