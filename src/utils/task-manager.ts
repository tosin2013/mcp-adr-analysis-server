/**
 * Task Manager for MCP Tasks Integration
 *
 * This module provides a unified interface for managing MCP Tasks across
 * long-running operations in the mcp-adr-analysis-server.
 *
 * Implements ADR-018: MCP Tasks Integration Strategy
 *
 * @experimental MCP Tasks is an experimental feature in the MCP specification
 */

import { randomBytes } from 'node:crypto';
import { createComponentLogger, ComponentLogger } from './enhanced-logging.js';
import {
  TaskPersistence,
  createTaskPersistence,
  type TaskPersistenceConfig,
} from './task-persistence.js';

const logger: ComponentLogger = createComponentLogger('TaskManager');

/**
 * Task status values from MCP spec
 */
export type McpTaskStatus = 'working' | 'input_required' | 'completed' | 'failed' | 'cancelled';

/**
 * Task types supported by this server
 * From ADR-020: bootstrap, deployment, research, orchestration, troubleshooting, validation, planning, adr_planning
 */
export type TaskType =
  | 'bootstrap'
  | 'deployment'
  | 'research'
  | 'orchestration'
  | 'troubleshooting'
  | 'validation'
  | 'planning'
  | 'adr_planning';

/**
 * Phase information for multi-phase operations
 */
export interface PhaseInfo {
  name: string;
  description: string;
  progress: number; // 0-100 within this phase
  status: 'pending' | 'running' | 'completed' | 'failed' | 'skipped';
  startTime?: string;
  endTime?: string;
  error?: string;
}

/**
 * Extended metadata for ADR-specific tasks
 */
export interface AdrTaskMetadata {
  type: TaskType;
  tool: string;
  phases?: PhaseInfo[];
  dependencies?: string[];
  projectPath?: string;
  adrDirectory?: string;
  customData?: Record<string, unknown>;
}

/**
 * MCP Task structure (matches SDK spec)
 */
export interface McpTask {
  taskId: string;
  status: McpTaskStatus;
  ttl: number | null;
  createdAt: string;
  lastUpdatedAt: string;
  pollInterval?: number;
  statusMessage?: string;
}

/**
 * Task with ADR-specific metadata
 */
export interface AdrTask extends McpTask {
  metadata?: AdrTaskMetadata;
  result?: unknown;
}

/**
 * Options for creating a new task
 */
export interface CreateAdrTaskOptions {
  type: TaskType;
  tool: string;
  phases?: string[];
  dependencies?: string[];
  projectPath?: string;
  adrDirectory?: string;
  ttl?: number | null;
  pollInterval?: number;
}

/**
 * Progress update for a task
 */
export interface TaskProgressUpdate {
  taskId: string;
  progress: number; // 0-100
  phase?: string;
  phaseProgress?: number; // 0-100 within current phase
  message?: string;
}

/**
 * Result type for task completion
 */
export interface TaskResult {
  success: boolean;
  data?: unknown;
  error?: {
    code: string;
    message: string;
    recoverable?: boolean;
  };
}

/**
 * Check if a task status represents a terminal state
 */
export function isTerminalStatus(status: McpTaskStatus): boolean {
  return status === 'completed' || status === 'failed' || status === 'cancelled';
}

/**
 * Generate a unique task ID
 */
function generateTaskId(): string {
  return randomBytes(16).toString('hex');
}

/**
 * Options for TaskManager configuration
 */
export interface TaskManagerOptions {
  /** Persistence configuration */
  persistence?: Partial<TaskPersistenceConfig>;
  /** Whether to enable persistence (default: true) */
  enablePersistence?: boolean;
}

/**
 * Task Manager for coordinating long-running operations
 *
 * Features:
 * - Creates and tracks tasks for tool operations
 * - Updates task progress and status
 * - Supports multi-phase operations with individual phase tracking
 * - Provides cancellation support
 * - File-based persistence for durability across restarts
 * - Designed to work with MCP SDK experimental tasks API
 */
export class TaskManager {
  private tasks: Map<string, AdrTask> = new Map();
  private taskProgress: Map<string, number> = new Map();
  private cleanupTimers: Map<string, ReturnType<typeof setTimeout>> = new Map();
  private persistence: TaskPersistence | null = null;
  private initialized = false;

  constructor(options: TaskManagerOptions = {}) {
    const { persistence, enablePersistence = true } = options;

    if (enablePersistence) {
      this.persistence = createTaskPersistence(persistence);
    }

    logger.info('TaskManager initialized', { persistenceEnabled: enablePersistence });
  }

  /**
   * Initialize the TaskManager - loads persisted tasks
   */
  async initialize(): Promise<void> {
    if (this.initialized) {
      return;
    }

    if (this.persistence) {
      await this.persistence.initialize();
      const { tasks, progress } = await this.persistence.load();

      // Restore tasks and progress
      for (const [taskId, task] of tasks) {
        this.tasks.set(taskId, task);

        // Re-establish TTL timers for non-terminal tasks
        if (!isTerminalStatus(task.status) && task.ttl !== null && task.ttl > 0) {
          const elapsed = Date.now() - new Date(task.createdAt).getTime();
          const remainingTtl = Math.max(0, task.ttl - elapsed);
          if (remainingTtl > 0) {
            const timer = setTimeout(() => {
              this.cleanupTask(taskId);
            }, remainingTtl);
            this.cleanupTimers.set(taskId, timer);
          } else {
            // Task expired while server was down
            this.cleanupTask(taskId);
          }
        }
      }

      for (const [taskId, prog] of progress) {
        this.taskProgress.set(taskId, prog);
      }

      logger.info('TaskManager restored from persistence', { taskCount: this.tasks.size });
    }

    this.initialized = true;
  }

  /**
   * Persist current state to disk
   */
  private async persistState(): Promise<void> {
    if (this.persistence?.isEnabled()) {
      await this.persistence.save(this.tasks, this.taskProgress);
    }
  }

  /**
   * Create a new task for a tool operation
   */
  async createTask(options: CreateAdrTaskOptions): Promise<AdrTask> {
    const {
      type,
      tool,
      phases,
      dependencies,
      projectPath,
      adrDirectory,
      ttl = 3600000, // Default 1 hour TTL
      pollInterval = 1000,
    } = options;

    const now = new Date().toISOString();
    const taskId = generateTaskId();

    // Initialize metadata
    const metadata: AdrTaskMetadata = {
      type,
      tool,
    };

    // Only add optional properties if they have values
    if (projectPath !== undefined) {
      metadata.projectPath = projectPath;
    }
    if (adrDirectory !== undefined) {
      metadata.adrDirectory = adrDirectory;
    }
    if (dependencies !== undefined && dependencies.length > 0) {
      metadata.dependencies = dependencies;
    }

    // Initialize phases if provided
    if (phases !== undefined && phases.length > 0) {
      metadata.phases = phases.map((name, index) => ({
        name,
        description: `Phase ${index + 1}: ${name}`,
        progress: 0,
        status: 'pending' as const,
      }));
    }

    const task: AdrTask = {
      taskId,
      status: 'working',
      ttl,
      createdAt: now,
      lastUpdatedAt: now,
      pollInterval,
      metadata,
    };

    this.tasks.set(taskId, task);
    this.taskProgress.set(taskId, 0);

    // Set up automatic cleanup if TTL is specified
    if (ttl !== null && ttl > 0) {
      const timer = setTimeout(() => {
        this.cleanupTask(taskId);
      }, ttl);
      this.cleanupTimers.set(taskId, timer);
    }

    logger.info('Task created', {
      taskId,
      type,
      tool,
      phaseCount: phases?.length ?? 0,
    });

    // Persist state
    await this.persistState();

    return task;
  }

  /**
   * Get a task by ID
   */
  async getTask(taskId: string): Promise<AdrTask | null> {
    const task = this.tasks.get(taskId);
    return task ?? null;
  }

  /**
   * Get task result
   */
  async getTaskResult(taskId: string): Promise<TaskResult | null> {
    const task = this.tasks.get(taskId);
    if (!task) return null;
    return (task.result as TaskResult | null) ?? null;
  }

  /**
   * List all tasks
   */
  async listTasks(cursor?: string): Promise<{ tasks: AdrTask[]; nextCursor?: string }> {
    const allTasks = Array.from(this.tasks.values());
    // Simple pagination: cursor is the index to start from
    const startIndex = cursor ? parseInt(cursor, 10) : 0;
    const pageSize = 50;
    const tasks = allTasks.slice(startIndex, startIndex + pageSize);

    // Handle nextCursor properly for exactOptionalPropertyTypes
    if (startIndex + pageSize < allTasks.length) {
      return { tasks, nextCursor: String(startIndex + pageSize) };
    }
    return { tasks };
  }

  /**
   * Update task progress
   */
  async updateProgress(update: TaskProgressUpdate): Promise<void> {
    const { taskId, progress, phase, phaseProgress, message } = update;

    const task = this.tasks.get(taskId);
    if (!task) {
      logger.warn('Task not found for progress update', { taskId });
      return;
    }

    // Update overall progress
    this.taskProgress.set(taskId, progress);
    task.lastUpdatedAt = new Date().toISOString();

    // Update phase progress if applicable
    if (phase !== undefined && task.metadata?.phases !== undefined) {
      const phases = task.metadata.phases;
      const phaseIndex = phases.findIndex(p => p.name === phase);
      if (phaseIndex >= 0) {
        const currentPhase = phases[phaseIndex];
        if (currentPhase !== undefined) {
          currentPhase.progress = phaseProgress ?? progress;
          if (phaseProgress === 100) {
            currentPhase.status = 'completed';
            currentPhase.endTime = new Date().toISOString();

            // Start next phase if available
            const nextPhase = phases[phaseIndex + 1];
            if (nextPhase !== undefined) {
              nextPhase.status = 'running';
              nextPhase.startTime = new Date().toISOString();
            }
          }
        }
      }
    }

    // Update status message if provided
    if (message !== undefined) {
      task.statusMessage = message;
    }

    logger.debug('Task progress updated', {
      taskId,
      progress,
      phase,
      phaseProgress,
    });

    // Persist state
    await this.persistState();
  }

  /**
   * Start a phase
   */
  async startPhase(taskId: string, phaseName: string): Promise<void> {
    const task = this.tasks.get(taskId);
    if (!task?.metadata?.phases) return;

    const phase = task.metadata.phases.find(p => p.name === phaseName);
    if (phase !== undefined) {
      phase.status = 'running';
      phase.startTime = new Date().toISOString();
      task.statusMessage = `Starting phase: ${phaseName}`;
      task.lastUpdatedAt = new Date().toISOString();

      logger.info('Phase started', { taskId, phaseName });

      // Persist state
      await this.persistState();
    }
  }

  /**
   * Complete a phase
   */
  async completePhase(taskId: string, phaseName: string): Promise<void> {
    const task = this.tasks.get(taskId);
    if (!task?.metadata?.phases) return;

    const phases = task.metadata.phases;
    const phaseIndex = phases.findIndex(p => p.name === phaseName);
    if (phaseIndex >= 0) {
      const phase = phases[phaseIndex];
      if (phase !== undefined) {
        phase.status = 'completed';
        phase.progress = 100;
        phase.endTime = new Date().toISOString();

        // Calculate overall progress based on completed phases
        const completedCount = phases.filter(p => p.status === 'completed').length;
        const totalProgress = Math.round((completedCount / phases.length) * 100);
        this.taskProgress.set(taskId, totalProgress);

        // Start next phase if available
        const nextPhase = phases[phaseIndex + 1];
        if (nextPhase !== undefined) {
          nextPhase.status = 'running';
          nextPhase.startTime = new Date().toISOString();
        }

        task.lastUpdatedAt = new Date().toISOString();
        logger.info('Phase completed', { taskId, phaseName, totalProgress });

        // Persist state
        await this.persistState();
      }
    }
  }

  /**
   * Fail a phase
   */
  async failPhase(taskId: string, phaseName: string, error: string): Promise<void> {
    const task = this.tasks.get(taskId);
    if (!task?.metadata?.phases) return;

    const phase = task.metadata.phases.find(p => p.name === phaseName);
    if (phase !== undefined) {
      phase.status = 'failed';
      phase.error = error;
      phase.endTime = new Date().toISOString();
      task.lastUpdatedAt = new Date().toISOString();

      logger.error('Phase failed', undefined, { taskId, phaseName, errorMessage: error });

      // Persist state
      await this.persistState();
    }
  }

  /**
   * Complete a task successfully
   */
  async completeTask(taskId: string, result: TaskResult): Promise<void> {
    const task = this.tasks.get(taskId);
    if (!task) {
      throw new Error(`Task ${taskId} not found`);
    }

    task.status = 'completed';
    task.result = result;
    task.lastUpdatedAt = new Date().toISOString();
    this.taskProgress.set(taskId, 100);

    // Mark all pending/running phases as completed
    if (task.metadata?.phases) {
      for (const phase of task.metadata.phases) {
        if (phase.status !== 'failed') {
          phase.status = 'completed';
          phase.progress = 100;
          if (!phase.endTime) {
            phase.endTime = new Date().toISOString();
          }
        }
      }
    }

    logger.info('Task completed', { taskId });

    // Persist state
    await this.persistState();
  }

  /**
   * Fail a task
   */
  async failTask(taskId: string, error: string): Promise<void> {
    const task = this.tasks.get(taskId);
    if (!task) {
      throw new Error(`Task ${taskId} not found`);
    }

    task.status = 'failed';
    task.result = {
      success: false,
      error: {
        code: 'TASK_FAILED',
        message: error,
        recoverable: false,
      },
    };
    task.statusMessage = error;
    task.lastUpdatedAt = new Date().toISOString();

    logger.error('Task failed', undefined, { taskId, errorMessage: error });

    // Persist state
    await this.persistState();
  }

  /**
   * Cancel a task
   */
  async cancelTask(taskId: string, reason?: string): Promise<void> {
    const task = this.tasks.get(taskId);
    if (!task) {
      throw new Error(`Task ${taskId} not found`);
    }

    if (isTerminalStatus(task.status)) {
      throw new Error(`Task ${taskId} is already in terminal state: ${task.status}`);
    }

    task.status = 'cancelled';
    task.statusMessage = reason ?? 'Cancelled by user';
    task.lastUpdatedAt = new Date().toISOString();

    // Mark running/pending phases as skipped
    if (task.metadata?.phases) {
      for (const phase of task.metadata.phases) {
        if (phase.status === 'running' || phase.status === 'pending') {
          phase.status = 'skipped';
          phase.endTime = new Date().toISOString();
        }
      }
    }

    logger.info('Task cancelled', { taskId, reason });

    // Persist state
    await this.persistState();
  }

  /**
   * Check if a task is still running
   */
  async isTaskRunning(taskId: string): Promise<boolean> {
    const task = this.tasks.get(taskId);
    return task !== undefined && !isTerminalStatus(task.status);
  }

  /**
   * Request input from the user (sets task to input_required state)
   * Used for interactive tools that need user input during execution
   */
  async requestInput(taskId: string, prompt: string): Promise<void> {
    const task = this.tasks.get(taskId);
    if (!task) {
      logger.warn('Task not found for input request', { taskId });
      return;
    }

    task.status = 'input_required';
    task.statusMessage = prompt;
    task.lastUpdatedAt = new Date().toISOString();

    logger.info('Task awaiting input', { taskId, prompt });

    // Persist state
    await this.persistState();
  }

  /**
   * Resume a task after receiving input (sets task back to working state)
   */
  async resumeTask(taskId: string): Promise<void> {
    const task = this.tasks.get(taskId);
    if (!task) {
      logger.warn('Task not found for resume', { taskId });
      return;
    }

    if (task.status !== 'input_required') {
      logger.warn('Task not in input_required state', { taskId, status: task.status });
      return;
    }

    task.status = 'working';
    task.statusMessage = 'Resumed after input';
    task.lastUpdatedAt = new Date().toISOString();

    logger.info('Task resumed', { taskId });

    // Persist state
    await this.persistState();
  }

  /**
   * Get task progress (0-100)
   */
  getProgress(taskId: string): number {
    return this.taskProgress.get(taskId) ?? 0;
  }

  /**
   * Get task metadata
   */
  getMetadata(taskId: string): AdrTaskMetadata | undefined {
    const task = this.tasks.get(taskId);
    return task?.metadata;
  }

  /**
   * Get all tasks for a specific tool
   */
  async getTasksByTool(tool: string): Promise<AdrTask[]> {
    const { tasks } = await this.listTasks();
    return tasks.filter(task => task.metadata?.tool === tool);
  }

  /**
   * Get all tasks of a specific type
   */
  async getTasksByType(type: TaskType): Promise<AdrTask[]> {
    const { tasks } = await this.listTasks();
    return tasks.filter(task => task.metadata?.type === type);
  }

  /**
   * Clean up a specific task
   */
  private cleanupTask(taskId: string): void {
    const timer = this.cleanupTimers.get(taskId);
    if (timer) {
      clearTimeout(timer);
      this.cleanupTimers.delete(taskId);
    }
    this.tasks.delete(taskId);
    this.taskProgress.delete(taskId);
    logger.debug('Task cleaned up', { taskId });
  }

  /**
   * Cleanup completed/failed tasks older than specified duration
   */
  async cleanup(maxAgeMs: number = 24 * 60 * 60 * 1000): Promise<number> {
    const now = Date.now();
    let cleanedCount = 0;

    for (const [taskId, task] of this.tasks) {
      if (isTerminalStatus(task.status)) {
        const updatedAt = new Date(task.lastUpdatedAt).getTime();
        if (now - updatedAt > maxAgeMs) {
          this.cleanupTask(taskId);
          cleanedCount++;
        }
      }
    }

    if (cleanedCount > 0) {
      logger.info('Cleaned up old tasks', { count: cleanedCount });
    }

    return cleanedCount;
  }

  /**
   * Cleanup all tasks and timers (for graceful shutdown)
   */
  async shutdown(): Promise<void> {
    // Flush persistence before clearing data
    if (this.persistence?.isEnabled()) {
      await this.persistence.saveImmediate(this.tasks, this.taskProgress);
      await this.persistence.shutdown();
    }

    for (const timer of this.cleanupTimers.values()) {
      clearTimeout(timer);
    }
    this.cleanupTimers.clear();
    this.tasks.clear();
    this.taskProgress.clear();
    this.initialized = false;
    logger.info('TaskManager shut down');
  }
}

// Singleton instance for global use
let globalTaskManager: TaskManager | null = null;

/**
 * Get the global TaskManager instance
 */
export function getTaskManager(): TaskManager {
  if (!globalTaskManager) {
    globalTaskManager = new TaskManager();
  }
  return globalTaskManager;
}

/**
 * Set the global TaskManager instance (for testing or custom stores)
 */
export function setTaskManager(manager: TaskManager): void {
  globalTaskManager = manager;
}

/**
 * Reset the global TaskManager (for testing)
 */
export async function resetTaskManager(): Promise<void> {
  if (globalTaskManager) {
    await globalTaskManager.shutdown();
    globalTaskManager = null;
  }
}
