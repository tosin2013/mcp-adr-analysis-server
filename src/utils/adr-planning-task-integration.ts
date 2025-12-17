/**
 * MCP Tasks Integration for Interactive ADR Planning Tool
 *
 * This module provides standardized task tracking for the interactive ADR planning tool,
 * implementing ADR-020: MCP Tasks Integration Strategy.
 *
 * Key features:
 * - Creates MCP Tasks for ADR planning sessions
 * - Tracks progress through planning phases (problem_definition, research, options, decision, impact, implementation, generation)
 * - Supports cancellation between phases
 * - Handles input_required state for interactive planning
 * - Provides memory integration for planning context tracking
 *
 * @see ADR-020: MCP Tasks Integration Strategy
 * @see https://modelcontextprotocol.io/specification/2025-11-25/basic/utilities/tasks
 */

import { getTaskManager, type AdrTask, type TaskResult, type TaskManager } from './task-manager.js';
import { createComponentLogger, type ComponentLogger } from './enhanced-logging.js';

const logger: ComponentLogger = createComponentLogger('AdrPlanningTaskIntegration');

/**
 * ADR Planning phases that map to MCP Task phases
 */
export const ADR_PLANNING_PHASES = [
  'problem_definition',
  'research_analysis',
  'option_exploration',
  'decision_making',
  'impact_assessment',
  'implementation_planning',
  'adr_generation',
] as const;

export type AdrPlanningPhase = (typeof ADR_PLANNING_PHASES)[number];

/**
 * ADR planning task context for tracking state across planning steps
 */
export interface AdrPlanningTaskContext {
  taskId: string;
  sessionId: string;
  currentPhase: AdrPlanningPhase;
  cancelled: boolean;
  awaitingInput: boolean;
  problemStatement?: string;
  researchCount?: number;
  optionCount?: number;
  selectedOption?: string;
  impactAssessment?: {
    technicalImpacts: number;
    businessImpacts: number;
    risks: number;
  };
  todoCount?: number;
  adrGenerated?: boolean;
}

/**
 * Options for creating an ADR planning task
 */
export interface CreateAdrPlanningTaskOptions {
  projectPath: string;
  adrDirectory?: string;
  sessionId?: string;
  initialProblem?: string;
  enableResearchIntegration?: boolean;
  enableTodoGeneration?: boolean;
}

/**
 * Result from ADR planning task execution
 */
export interface AdrPlanningTaskResult extends TaskResult {
  data?: {
    success: boolean;
    sessionId: string;
    phase: AdrPlanningPhase | 'completed';
    adrPath?: string;
    adrTitle?: string;
    todoCount?: number;
    researchFindingsCount?: number;
    optionsEvaluated?: number;
    awaitingInput?: boolean;
    inputPrompt?: string;
  };
}

/**
 * ADR Planning Task Manager - Provides MCP Tasks integration for interactive ADR planning
 *
 * This class wraps the TaskManager to provide ADR planning-specific functionality:
 * - Creates tasks with ADR planning phases
 * - Tracks planning progress through multiple steps
 * - Supports input_required state for interactive workflows
 * - Supports cancellation between phases
 * - Integrates with memory for planning context tracking
 */
export class AdrPlanningTaskManager {
  private taskManager: TaskManager;
  private activeContexts: Map<string, AdrPlanningTaskContext> = new Map();

  constructor(taskManager?: TaskManager) {
    this.taskManager = taskManager ?? getTaskManager();
  }

  /**
   * Initialize the ADR planning task manager
   */
  async initialize(): Promise<void> {
    await this.taskManager.initialize();
    logger.info('AdrPlanningTaskManager initialized');
  }

  /**
   * Create a new ADR planning task
   *
   * @returns The created task and context
   */
  async createAdrPlanningTask(options: CreateAdrPlanningTaskOptions): Promise<{
    task: AdrTask;
    context: AdrPlanningTaskContext;
  }> {
    const { projectPath, adrDirectory = 'docs/adrs', sessionId } = options;

    const generatedSessionId = sessionId ?? `adr-planning-${Date.now()}`;

    const task = await this.taskManager.createTask({
      type: 'adr_planning',
      tool: 'interactive_adr_planning',
      phases: [...ADR_PLANNING_PHASES],
      projectPath,
      adrDirectory,
      ttl: 3600000, // 1 hour TTL for interactive planning sessions
      pollInterval: 2000, // 2 second poll interval
    });

    const context: AdrPlanningTaskContext = {
      taskId: task.taskId,
      sessionId: generatedSessionId,
      currentPhase: 'problem_definition',
      cancelled: false,
      awaitingInput: false,
    };

    this.activeContexts.set(task.taskId, context);

    logger.info('ADR planning task created', {
      taskId: task.taskId,
      sessionId: generatedSessionId,
      projectPath,
      adrDirectory,
    });

    return { task, context };
  }

  /**
   * Get ADR planning task context
   */
  getContext(taskId: string): AdrPlanningTaskContext | undefined {
    return this.activeContexts.get(taskId);
  }

  /**
   * Start an ADR planning phase
   */
  async startPhase(taskId: string, phase: AdrPlanningPhase, message?: string): Promise<void> {
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
    context.awaitingInput = false;

    await this.taskManager.startPhase(taskId, phase);

    // Calculate overall progress based on phase
    const phaseIndex = ADR_PLANNING_PHASES.indexOf(phase);
    const phaseProgress =
      phaseIndex >= 0 ? Math.floor((phaseIndex / ADR_PLANNING_PHASES.length) * 100) : 0;

    await this.taskManager.updateProgress({
      taskId,
      progress: phaseProgress,
      phase,
      phaseProgress: 0,
      message: message ?? `Starting phase: ${phase}`,
    });

    logger.info('ADR planning phase started', { taskId, phase, progress: phaseProgress });
  }

  /**
   * Update phase progress
   */
  async updatePhaseProgress(
    taskId: string,
    phase: AdrPlanningPhase,
    phaseProgress: number,
    message?: string
  ): Promise<void> {
    const context = this.activeContexts.get(taskId);
    if (!context) {
      return;
    }

    // Calculate overall progress
    const phaseIndex = ADR_PLANNING_PHASES.indexOf(phase);
    const phaseFraction = 100 / ADR_PLANNING_PHASES.length;
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
   * Complete an ADR planning phase
   */
  async completePhase(taskId: string, phase: AdrPlanningPhase, _message?: string): Promise<void> {
    const context = this.activeContexts.get(taskId);
    if (!context) {
      return;
    }

    await this.taskManager.completePhase(taskId, phase);
    context.awaitingInput = false;

    logger.info('ADR planning phase completed', { taskId, phase });
  }

  /**
   * Fail an ADR planning phase
   */
  async failPhase(taskId: string, phase: AdrPlanningPhase, error: string): Promise<void> {
    const context = this.activeContexts.get(taskId);
    if (!context) {
      return;
    }

    await this.taskManager.failPhase(taskId, phase, error);

    logger.warn('ADR planning phase failed', { taskId, phase, error });
  }

  /**
   * Request input from user (sets task to input_required state)
   */
  async requestInput(taskId: string, prompt: string): Promise<void> {
    const context = this.activeContexts.get(taskId);
    if (!context) {
      return;
    }

    context.awaitingInput = true;

    await this.taskManager.requestInput(taskId, prompt);

    logger.info('ADR planning awaiting input', { taskId, prompt });
  }

  /**
   * Resume task after receiving input
   */
  async resumeAfterInput(taskId: string): Promise<void> {
    const context = this.activeContexts.get(taskId);
    if (!context) {
      return;
    }

    context.awaitingInput = false;

    await this.taskManager.resumeTask(taskId);

    logger.info('ADR planning resumed after input', { taskId });
  }

  /**
   * Store problem definition result
   */
  async storeProblemDefinition(taskId: string, problemStatement: string): Promise<void> {
    const context = this.activeContexts.get(taskId);
    if (!context) {
      return;
    }

    context.problemStatement = problemStatement;

    await this.taskManager.updateProgress({
      taskId,
      progress: 14,
      message: `Problem defined: ${problemStatement.substring(0, 50)}...`,
    });

    logger.info('Problem definition stored', { taskId, problemLength: problemStatement.length });
  }

  /**
   * Store research findings
   */
  async storeResearchFindings(taskId: string, findingsCount: number): Promise<void> {
    const context = this.activeContexts.get(taskId);
    if (!context) {
      return;
    }

    context.researchCount = findingsCount;

    await this.taskManager.updateProgress({
      taskId,
      progress: 28,
      message: `Research completed: ${findingsCount} findings gathered`,
    });

    logger.info('Research findings stored', { taskId, findingsCount });
  }

  /**
   * Store options explored
   */
  async storeOptionsExplored(taskId: string, optionCount: number): Promise<void> {
    const context = this.activeContexts.get(taskId);
    if (!context) {
      return;
    }

    context.optionCount = optionCount;

    await this.taskManager.updateProgress({
      taskId,
      progress: 42,
      message: `Options explored: ${optionCount} alternatives evaluated`,
    });

    logger.info('Options explored stored', { taskId, optionCount });
  }

  /**
   * Store decision made
   */
  async storeDecision(taskId: string, selectedOption: string, _rationale: string): Promise<void> {
    const context = this.activeContexts.get(taskId);
    if (!context) {
      return;
    }

    context.selectedOption = selectedOption;

    await this.taskManager.updateProgress({
      taskId,
      progress: 56,
      message: `Decision made: ${selectedOption}`,
    });

    logger.info('Decision stored', { taskId, selectedOption });
  }

  /**
   * Store impact assessment result
   */
  async storeImpactAssessment(
    taskId: string,
    assessment: { technicalImpacts: number; businessImpacts: number; risks: number }
  ): Promise<void> {
    const context = this.activeContexts.get(taskId);
    if (!context) {
      return;
    }

    context.impactAssessment = assessment;

    const totalImpacts = assessment.technicalImpacts + assessment.businessImpacts;
    await this.taskManager.updateProgress({
      taskId,
      progress: 70,
      message: `Impact assessed: ${totalImpacts} impacts, ${assessment.risks} risks identified`,
    });

    logger.info('Impact assessment stored', { taskId, ...assessment });
  }

  /**
   * Store implementation plan result
   */
  async storeImplementationPlan(taskId: string, todoCount: number): Promise<void> {
    const context = this.activeContexts.get(taskId);
    if (!context) {
      return;
    }

    context.todoCount = todoCount;

    await this.taskManager.updateProgress({
      taskId,
      progress: 85,
      message: `Implementation planned: ${todoCount} tasks generated`,
    });

    logger.info('Implementation plan stored', { taskId, todoCount });
  }

  /**
   * Store ADR generation result
   */
  async storeAdrGenerated(taskId: string, adrPath: string): Promise<void> {
    const context = this.activeContexts.get(taskId);
    if (!context) {
      return;
    }

    context.adrGenerated = true;

    await this.taskManager.updateProgress({
      taskId,
      progress: 100,
      message: `ADR generated: ${adrPath}`,
    });

    logger.info('ADR generation stored', { taskId, adrPath });
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
   * Check if task is awaiting input
   */
  isAwaitingInput(taskId: string): boolean {
    const context = this.activeContexts.get(taskId);
    return context?.awaitingInput ?? false;
  }

  /**
   * Cancel an ADR planning task
   */
  async cancelTask(taskId: string, reason?: string): Promise<void> {
    const context = this.activeContexts.get(taskId);
    if (context) {
      context.cancelled = true;
    }

    await this.taskManager.cancelTask(taskId, reason ?? 'ADR planning cancelled by user');
    this.activeContexts.delete(taskId);

    logger.info('ADR planning task cancelled', { taskId, reason });
  }

  /**
   * Complete an ADR planning task successfully
   */
  async completeTask(taskId: string, result: AdrPlanningTaskResult): Promise<void> {
    await this.taskManager.completeTask(taskId, result);
    this.activeContexts.delete(taskId);

    logger.info('ADR planning task completed', { taskId, success: result.success });
  }

  /**
   * Fail an ADR planning task
   */
  async failTask(taskId: string, error: string): Promise<void> {
    await this.taskManager.failTask(taskId, error);
    this.activeContexts.delete(taskId);

    logger.error('ADR planning task failed', undefined, { taskId, error });
  }

  /**
   * Get task status
   */
  async getTaskStatus(taskId: string): Promise<{
    task: AdrTask | null;
    context: AdrPlanningTaskContext | undefined;
  }> {
    const task = await this.taskManager.getTask(taskId);
    const context = this.activeContexts.get(taskId);
    return { task, context };
  }
}

/**
 * Get the global AdrPlanningTaskManager instance
 */
let globalAdrPlanningTaskManager: AdrPlanningTaskManager | null = null;

export function getAdrPlanningTaskManager(): AdrPlanningTaskManager {
  if (!globalAdrPlanningTaskManager) {
    globalAdrPlanningTaskManager = new AdrPlanningTaskManager();
  }
  return globalAdrPlanningTaskManager;
}

/**
 * Reset the global AdrPlanningTaskManager (for testing)
 */
export async function resetAdrPlanningTaskManager(): Promise<void> {
  globalAdrPlanningTaskManager = null;
}

/**
 * Helper function to wrap ADR planning execution with task tracking
 *
 * This can be used by the interactive_adr_planning tool to automatically
 * track progress through MCP Tasks.
 *
 * @example
 * ```typescript
 * const result = await executeAdrPlanningWithTaskTracking(
 *   {
 *     projectPath: '/path/to/project',
 *     adrDirectory: 'docs/adrs',
 *   },
 *   async (tracker) => {
 *     // Problem definition phase
 *     await tracker.startPhase('problem_definition');
 *     const problem = await getProblemStatement();
 *     await tracker.storeProblemDefinition(problem);
 *     await tracker.completePhase('problem_definition');
 *
 *     // Research phase
 *     await tracker.startPhase('research_analysis');
 *     const findings = await conductResearch();
 *     await tracker.storeResearchFindings(findings.length);
 *     await tracker.completePhase('research_analysis');
 *
 *     // Return final result
 *     return {
 *       success: true,
 *       sessionId: tracker.sessionId,
 *       phase: 'completed',
 *       adrPath: '/path/to/adr.md',
 *     };
 *   }
 * );
 * ```
 */
export async function executeAdrPlanningWithTaskTracking<T extends AdrPlanningTaskResult>(
  options: CreateAdrPlanningTaskOptions,
  executor: (tracker: AdrPlanningTaskTracker) => Promise<T['data']>
): Promise<{ taskId: string; result: T }> {
  const apm = getAdrPlanningTaskManager();
  await apm.initialize();

  const { task, context } = await apm.createAdrPlanningTask(options);
  const taskId = task.taskId;

  // Create a tracker interface for the executor
  const tracker: AdrPlanningTaskTracker = {
    taskId,
    sessionId: context.sessionId,
    startPhase: (phase, message) => apm.startPhase(taskId, phase, message),
    updatePhaseProgress: (phase, progress, message) =>
      apm.updatePhaseProgress(taskId, phase, progress, message),
    completePhase: (phase, message) => apm.completePhase(taskId, phase, message),
    failPhase: (phase, error) => apm.failPhase(taskId, phase, error),
    requestInput: prompt => apm.requestInput(taskId, prompt),
    resumeAfterInput: () => apm.resumeAfterInput(taskId),
    storeProblemDefinition: problem => apm.storeProblemDefinition(taskId, problem),
    storeResearchFindings: count => apm.storeResearchFindings(taskId, count),
    storeOptionsExplored: count => apm.storeOptionsExplored(taskId, count),
    storeDecision: (option, rationale) => apm.storeDecision(taskId, option, rationale),
    storeImpactAssessment: assessment => apm.storeImpactAssessment(taskId, assessment),
    storeImplementationPlan: todoCount => apm.storeImplementationPlan(taskId, todoCount),
    storeAdrGenerated: adrPath => apm.storeAdrGenerated(taskId, adrPath),
    isCancelled: () => apm.isCancelled(taskId),
    isAwaitingInput: () => apm.isAwaitingInput(taskId),
    getContext: () => context,
  };

  try {
    const resultData = await executor(tracker);

    const result = {
      success: resultData?.success ?? false,
      data: resultData,
    } as T;

    await apm.completeTask(taskId, result);

    return { taskId, result };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    await apm.failTask(taskId, errorMessage);

    return {
      taskId,
      result: {
        success: false,
        error: {
          code: 'ADR_PLANNING_ERROR',
          message: errorMessage,
          recoverable: false,
        },
      } as T,
    };
  }
}

/**
 * Task tracker interface provided to ADR planning executor
 */
export interface AdrPlanningTaskTracker {
  taskId: string;
  sessionId: string;
  startPhase: (phase: AdrPlanningPhase, message?: string) => Promise<void>;
  updatePhaseProgress: (
    phase: AdrPlanningPhase,
    progress: number,
    message?: string
  ) => Promise<void>;
  completePhase: (phase: AdrPlanningPhase, message?: string) => Promise<void>;
  failPhase: (phase: AdrPlanningPhase, error: string) => Promise<void>;
  requestInput: (prompt: string) => Promise<void>;
  resumeAfterInput: () => Promise<void>;
  storeProblemDefinition: (problem: string) => Promise<void>;
  storeResearchFindings: (count: number) => Promise<void>;
  storeOptionsExplored: (count: number) => Promise<void>;
  storeDecision: (option: string, rationale: string) => Promise<void>;
  storeImpactAssessment: (assessment: {
    technicalImpacts: number;
    businessImpacts: number;
    risks: number;
  }) => Promise<void>;
  storeImplementationPlan: (todoCount: number) => Promise<void>;
  storeAdrGenerated: (adrPath: string) => Promise<void>;
  isCancelled: () => Promise<boolean>;
  isAwaitingInput: () => boolean;
  getContext: () => AdrPlanningTaskContext;
}
