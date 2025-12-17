/**
 * Task Persistence for MCP Tasks Integration
 *
 * Provides file-based persistence for tasks to survive server restarts.
 * Uses JSON files stored in a configurable cache directory.
 *
 * Implements ADR-018: MCP Tasks Integration Strategy
 *
 * @experimental MCP Tasks is an experimental feature in the MCP specification
 */

import * as fs from 'fs/promises';
import * as path from 'path';
import { createComponentLogger, ComponentLogger } from './enhanced-logging.js';
import type { AdrTask } from './task-manager.js';

const logger: ComponentLogger = createComponentLogger('TaskPersistence');

/**
 * Configuration for task persistence
 */
export interface TaskPersistenceConfig {
  /** Directory to store task data (default: .mcp-adr-cache/tasks) */
  cacheDir: string;
  /** Whether persistence is enabled (default: true) */
  enabled: boolean;
  /** Maximum age of persisted tasks in ms (default: 7 days) */
  maxAge: number;
  /** Write delay in ms for debouncing (default: 1000) */
  writeDelay: number;
}

/**
 * Persisted task data structure
 */
interface PersistedTaskData {
  version: number;
  lastSaved: string;
  tasks: AdrTask[];
  progress: Record<string, number>;
}

const CURRENT_VERSION = 1;
const DEFAULT_CONFIG: TaskPersistenceConfig = {
  cacheDir: '.mcp-adr-cache/tasks',
  enabled: true,
  maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
  writeDelay: 1000,
};

/**
 * Task Persistence Manager
 *
 * Handles saving and loading tasks to/from disk for durability across
 * server restarts. Uses debounced writes to avoid excessive disk I/O.
 */
export class TaskPersistence {
  private config: TaskPersistenceConfig;
  private writeTimer: ReturnType<typeof setTimeout> | null = null;
  private pendingWrite: PersistedTaskData | null = null;
  private initialized = false;

  constructor(config: Partial<TaskPersistenceConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Initialize persistence - create cache directory if needed
   */
  async initialize(): Promise<void> {
    if (!this.config.enabled) {
      logger.info('Task persistence disabled');
      return;
    }

    try {
      await fs.mkdir(this.config.cacheDir, { recursive: true });
      this.initialized = true;
      logger.info('Task persistence initialized', { cacheDir: this.config.cacheDir });
    } catch (error) {
      logger.error(
        'Failed to initialize task persistence',
        error instanceof Error ? error : undefined,
        {
          cacheDir: this.config.cacheDir,
        }
      );
      // Don't throw - persistence is optional
      this.config.enabled = false;
    }
  }

  /**
   * Get the path to the tasks file
   */
  private getTasksFilePath(): string {
    return path.join(this.config.cacheDir, 'tasks.json');
  }

  /**
   * Load persisted tasks from disk
   */
  async load(): Promise<{ tasks: Map<string, AdrTask>; progress: Map<string, number> }> {
    const tasks = new Map<string, AdrTask>();
    const progress = new Map<string, number>();

    if (!this.config.enabled || !this.initialized) {
      return { tasks, progress };
    }

    const filePath = this.getTasksFilePath();

    try {
      const data = await fs.readFile(filePath, 'utf-8');
      const parsed: PersistedTaskData = JSON.parse(data);

      // Version check
      if (parsed.version !== CURRENT_VERSION) {
        logger.warn('Task persistence version mismatch, migrating', {
          savedVersion: parsed.version,
          currentVersion: CURRENT_VERSION,
        });
        // For now, just load what we can
      }

      const now = Date.now();
      let expiredCount = 0;

      for (const task of parsed.tasks) {
        // Skip expired tasks
        const taskAge = now - new Date(task.lastUpdatedAt).getTime();
        if (taskAge > this.config.maxAge) {
          expiredCount++;
          continue;
        }

        tasks.set(task.taskId, task);
        const taskProgress = parsed.progress[task.taskId];
        if (taskProgress !== undefined) {
          progress.set(task.taskId, taskProgress);
        }
      }

      logger.info('Tasks loaded from persistence', {
        loadedCount: tasks.size,
        expiredCount,
        lastSaved: parsed.lastSaved,
      });
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        logger.debug('No persisted tasks file found');
      } else {
        logger.error('Failed to load persisted tasks', error instanceof Error ? error : undefined);
      }
    }

    return { tasks, progress };
  }

  /**
   * Save tasks to disk (debounced)
   */
  async save(tasks: Map<string, AdrTask>, progress: Map<string, number>): Promise<void> {
    if (!this.config.enabled || !this.initialized) {
      return;
    }

    // Prepare data for persistence
    const data: PersistedTaskData = {
      version: CURRENT_VERSION,
      lastSaved: new Date().toISOString(),
      tasks: Array.from(tasks.values()),
      progress: Object.fromEntries(progress),
    };

    // Debounce writes
    this.pendingWrite = data;

    if (this.writeTimer) {
      return; // Already scheduled
    }

    this.writeTimer = setTimeout(async () => {
      this.writeTimer = null;
      if (this.pendingWrite) {
        await this.writeToFile(this.pendingWrite);
        this.pendingWrite = null;
      }
    }, this.config.writeDelay);
  }

  /**
   * Force immediate save (for shutdown)
   */
  async saveImmediate(tasks: Map<string, AdrTask>, progress: Map<string, number>): Promise<void> {
    if (!this.config.enabled || !this.initialized) {
      return;
    }

    // Cancel pending debounced write
    if (this.writeTimer) {
      clearTimeout(this.writeTimer);
      this.writeTimer = null;
    }
    this.pendingWrite = null;

    const data: PersistedTaskData = {
      version: CURRENT_VERSION,
      lastSaved: new Date().toISOString(),
      tasks: Array.from(tasks.values()),
      progress: Object.fromEntries(progress),
    };

    await this.writeToFile(data);
  }

  /**
   * Write data to file
   */
  private async writeToFile(data: PersistedTaskData): Promise<void> {
    const filePath = this.getTasksFilePath();
    const tempPath = `${filePath}.tmp`;

    try {
      // Write to temp file first
      await fs.writeFile(tempPath, JSON.stringify(data, null, 2), 'utf-8');

      // Atomic rename
      await fs.rename(tempPath, filePath);

      logger.debug('Tasks persisted to disk', { taskCount: data.tasks.length });
    } catch (error) {
      logger.error('Failed to persist tasks', error instanceof Error ? error : undefined);

      // Try to clean up temp file
      try {
        await fs.unlink(tempPath);
      } catch {
        // Ignore cleanup errors
      }
    }
  }

  /**
   * Delete persisted task data
   */
  async clear(): Promise<void> {
    if (!this.config.enabled) {
      return;
    }

    const filePath = this.getTasksFilePath();

    try {
      await fs.unlink(filePath);
      logger.info('Cleared persisted tasks');
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
        logger.error('Failed to clear persisted tasks', error instanceof Error ? error : undefined);
      }
    }
  }

  /**
   * Cleanup old task files
   */
  async cleanup(): Promise<number> {
    if (!this.config.enabled || !this.initialized) {
      return 0;
    }

    // Load current tasks, which will filter out expired ones
    const { tasks, progress } = await this.load();

    // Re-save to remove expired tasks from file
    if (tasks.size > 0) {
      await this.saveImmediate(tasks, progress);
    } else {
      await this.clear();
    }

    return 0; // We handled cleanup during load
  }

  /**
   * Shutdown persistence - flush pending writes
   */
  async shutdown(): Promise<void> {
    if (this.writeTimer) {
      clearTimeout(this.writeTimer);
      this.writeTimer = null;
    }

    if (this.pendingWrite) {
      await this.writeToFile(this.pendingWrite);
      this.pendingWrite = null;
    }

    logger.info('Task persistence shut down');
  }

  /**
   * Check if persistence is enabled
   */
  isEnabled(): boolean {
    return this.config.enabled && this.initialized;
  }
}

// Factory function for creating persistence with custom config
export function createTaskPersistence(config?: Partial<TaskPersistenceConfig>): TaskPersistence {
  return new TaskPersistence(config);
}
