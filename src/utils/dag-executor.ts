/**
 * DAG Executor for Bootstrap Validation Loop
 *
 * Executes tasks in a Directed Acyclic Graph (DAG) with:
 * - Dependency resolution via topological sort
 * - Parallel execution within layers
 * - Fine-grained error handling and retry logic
 * - Task-level validation and timeout support
 */

import { exec } from 'child_process';
import { promisify } from 'util';
import { EnhancedLogger } from './enhanced-logging.js';
import { SystemCardManager } from './system-card-manager.js';
import { ResourceExtractor } from './resource-extractor.js';

const execAsync = promisify(exec);

/**
 * A single executable task node in the DAG
 */
export interface TaskNode {
  id: string;
  name: string;
  description: string;

  // Execution
  command?: string;
  commandArgs?: string[];
  expectedExitCode?: number;
  timeout?: number; // milliseconds

  // Dependencies
  dependsOn: string[]; // Task IDs that must complete successfully first
  canFailSafely?: boolean; // Continue DAG execution even if this task fails

  // Platform-specific execution
  platforms?: string[]; // Only run on these platforms

  // Retry and error handling
  retryCount?: number;
  retryDelay?: number; // milliseconds

  // Validation
  validationCheck?: (output: string) => boolean;

  // Metadata
  category: 'infrastructure' | 'application';
  severity: 'critical' | 'error' | 'warning' | 'info';
}

/**
 * Result of executing a single task
 */
export interface TaskResult {
  taskId: string;
  success: boolean;
  exitCode?: number;
  stdout: string;
  stderr: string;
  duration: number;
  error?: Error;
  skipped?: boolean;
  skipReason?: string;
}

/**
 * Result of executing the entire DAG
 */
export interface DAGExecutionResult {
  success: boolean;
  executedTasks: string[];
  failedTasks: string[];
  skippedTasks: string[];
  duration: number;
  taskResults: Map<string, TaskResult>;
}

/**
 * DAG Executor with dependency resolution and parallel execution
 */
export class DAGExecutor {
  private logger: EnhancedLogger;
  private maxParallelism: number;
  private systemCardManager: SystemCardManager | undefined;
  private resourceExtractor: ResourceExtractor;

  constructor(maxParallelism: number = 5, systemCardManager?: SystemCardManager) {
    this.logger = new EnhancedLogger();
    this.maxParallelism = maxParallelism;
    this.systemCardManager = systemCardManager;
    this.resourceExtractor = new ResourceExtractor();
  }

  /**
   * Execute DAG with topological sort and parallel execution
   */
  async execute(tasks: TaskNode[]): Promise<DAGExecutionResult> {
    const startTime = Date.now();

    this.logger.info(`🔄 Starting DAG execution with ${tasks.length} tasks`, 'DAGExecutor');

    // 1. Validate DAG structure
    this.validateDAG(tasks);

    // 2. Build dependency graph
    const graph = this.buildDependencyGraph(tasks);

    // 3. Topological sort to determine execution layers
    const sortedLayers = this.topologicalSort(graph);

    this.logger.info(
      `📊 DAG topology: ${sortedLayers.length} layers, max parallelism: ${this.maxParallelism}`,
      'DAGExecutor'
    );

    // 4. Execute layer by layer (parallel within layer)
    const results = new Map<string, TaskResult>();
    const failedTasks: string[] = [];
    const skippedTasks: string[] = [];

    for (let layerIndex = 0; layerIndex < sortedLayers.length; layerIndex++) {
      const layer = sortedLayers[layerIndex];

      if (!layer) {
        continue;
      }

      this.logger.info(
        `🔹 Executing layer ${layerIndex + 1}/${sortedLayers.length} with ${layer.length} tasks`,
        'DAGExecutor'
      );

      // Execute all tasks in this layer in parallel (up to maxParallelism)
      const layerResults = await this.executeLayer(layer, results);

      for (const [taskId, result] of layerResults) {
        results.set(taskId, result);

        if (result.skipped) {
          skippedTasks.push(taskId);
        } else if (!result.success) {
          failedTasks.push(taskId);

          // Mark dependent tasks as skipped
          const task = tasks.find(t => t.id === taskId);
          if (task && !task.canFailSafely) {
            const dependents = this.getDependentTasks(taskId, tasks);
            for (const depId of dependents) {
              if (!results.has(depId)) {
                results.set(depId, {
                  taskId: depId,
                  success: false,
                  stdout: '',
                  stderr: '',
                  duration: 0,
                  skipped: true,
                  skipReason: `Dependency ${taskId} failed`,
                });
                skippedTasks.push(depId);
              }
            }
          }
        }
      }

      // Stop if critical task failed
      const criticalTaskFailed = layer.some(
        task => !results.get(task.id)?.success && task.severity === 'critical'
      );

      if (criticalTaskFailed) {
        this.logger.error('❌ Critical task failed, stopping DAG execution', 'DAGExecutor');

        // Mark remaining tasks as skipped
        for (const task of tasks) {
          if (!results.has(task.id)) {
            results.set(task.id, {
              taskId: task.id,
              success: false,
              stdout: '',
              stderr: '',
              duration: 0,
              skipped: true,
              skipReason: 'Critical task failed in earlier layer',
            });
            skippedTasks.push(task.id);
          }
        }

        break;
      }
    }

    const duration = Date.now() - startTime;
    const executedTasks = Array.from(results.keys()).filter(id => !results.get(id)?.skipped);

    const success = failedTasks.length === 0;

    this.logger.info(
      `${success ? '✅' : '❌'} DAG execution ${success ? 'completed' : 'failed'}: ${executedTasks.length} executed, ${failedTasks.length} failed, ${skippedTasks.length} skipped (${duration}ms)`,
      'DAGExecutor'
    );

    return {
      success,
      executedTasks,
      failedTasks,
      skippedTasks,
      duration,
      taskResults: results,
    };
  }

  /**
   * Execute all tasks in a layer in parallel (with concurrency limit)
   */
  private async executeLayer(
    layer: TaskNode[],
    previousResults: Map<string, TaskResult>
  ): Promise<Map<string, TaskResult>> {
    const results = new Map<string, TaskResult>();

    // Filter tasks whose dependencies are met
    const executableTasks: TaskNode[] = [];

    for (const task of layer) {
      const dependenciesMet = task.dependsOn.every(depId => {
        const depResult = previousResults.get(depId);
        return depResult?.success === true;
      });

      if (!dependenciesMet) {
        // Check if any dependency failed and wasn't safe to fail
        const failedDep = task.dependsOn.find(depId => {
          const depResult = previousResults.get(depId);
          return depResult && !depResult.success;
        });

        results.set(task.id, {
          taskId: task.id,
          success: false,
          stdout: '',
          stderr: `Dependencies not met: ${failedDep || 'unknown'}`,
          duration: 0,
          skipped: true,
          skipReason: `Dependency ${failedDep} failed`,
        });
      } else {
        executableTasks.push(task);
      }
    }

    if (executableTasks.length === 0) {
      return results;
    }

    // Execute tasks with concurrency limit
    const taskResults = await this.executeWithConcurrencyLimit(
      executableTasks,
      this.maxParallelism
    );

    for (let i = 0; i < executableTasks.length; i++) {
      const task = executableTasks[i];
      const result = taskResults[i];

      if (task && result) {
        results.set(task.id, result);
      }
    }

    return results;
  }

  /**
   * Execute tasks with concurrency limit
   */
  private async executeWithConcurrencyLimit(
    tasks: TaskNode[],
    concurrencyLimit: number
  ): Promise<TaskResult[]> {
    const promises: Promise<TaskResult>[] = [];
    const executing: Promise<TaskResult>[] = [];

    for (const task of tasks) {
      const promise = this.executeTask(task).then(result => {
        executing.splice(executing.indexOf(promise), 1);
        return result;
      });

      executing.push(promise);
      promises.push(promise);

      if (executing.length >= concurrencyLimit) {
        await Promise.race(executing);
      }
    }

    return Promise.all(promises);
  }

  /**
   * Execute a single task with retry logic
   */
  private async executeTask(task: TaskNode): Promise<TaskResult> {
    const startTime = Date.now();

    this.logger.info(`▶️  Executing: ${task.name}`, 'DAGExecutor');

    try {
      if (!task.command) {
        throw new Error(`Task ${task.id} has no command defined`);
      }

      // Build full command
      const fullCommand = task.commandArgs
        ? `${task.command} ${task.commandArgs.join(' ')}`
        : task.command;

      // Execute command with timeout
      const timeout = task.timeout || 30000;

      const { stdout, stderr } = await this.executeCommand(fullCommand, timeout);
      const duration = Date.now() - startTime;

      // Check exit code (execAsync throws on non-zero exit)
      const success = true;

      // Run custom validation if defined
      let validationPassed = true;
      if (task.validationCheck) {
        validationPassed = task.validationCheck(stdout);
        if (!validationPassed) {
          this.logger.warn(`❌ Validation failed for task: ${task.name}`, 'DAGExecutor');
        }
      }

      const finalSuccess = success && validationPassed;

      if (finalSuccess) {
        this.logger.info(`✅ Completed: ${task.name} (${duration}ms)`, 'DAGExecutor');

        // Extract resources from command output and update SystemCard
        if (this.systemCardManager) {
          try {
            const extractionResult = this.resourceExtractor.extract(
              fullCommand,
              stdout,
              stderr,
              task.id
            );

            if (extractionResult.resources.length > 0) {
              await this.systemCardManager.addResources(extractionResult.resources, {
                phase: task.category,
                taskId: task.id,
              });

              this.logger.info(
                `📝 Tracked ${extractionResult.resources.length} resources from task: ${task.name}`,
                'DAGExecutor'
              );
            }

            if (extractionResult.warnings.length > 0) {
              this.logger.warn(
                `Resource extraction warnings: ${extractionResult.warnings.join(', ')}`,
                'DAGExecutor'
              );
            }
          } catch (error) {
            // Log but don't fail the task if resource extraction fails
            this.logger.warn(
              `Failed to extract resources from task ${task.name}: ${(error as Error).message}`,
              'DAGExecutor'
            );
          }
        }
      } else {
        this.logger.error(`❌ Failed: ${task.name} (${duration}ms)`, 'DAGExecutor');
      }

      return {
        taskId: task.id,
        success: finalSuccess,
        exitCode: 0,
        stdout,
        stderr,
        duration,
      };
    } catch (error: any) {
      const duration = Date.now() - startTime;

      // Retry logic
      if (task.retryCount && task.retryCount > 0) {
        this.logger.warn(
          `🔄 Task ${task.name} failed, retrying (${task.retryCount} retries left)...`,
          'DAGExecutor'
        );

        if (task.retryDelay) {
          await new Promise(resolve => setTimeout(resolve, task.retryDelay));
        }

        // Recursively retry with decremented retry count
        const retryTask = { ...task, retryCount: task.retryCount - 1 };
        return this.executeTask(retryTask);
      }

      this.logger.error(`❌ Task failed: ${task.name} - ${error.message}`, 'DAGExecutor');

      return {
        taskId: task.id,
        success: false,
        exitCode: error.code || 1,
        stdout: error.stdout || '',
        stderr: error.stderr || error.message,
        duration,
        error,
      };
    }
  }

  /**
   * Execute shell command with timeout
   */
  private async executeCommand(
    command: string,
    timeout: number
  ): Promise<{ stdout: string; stderr: string }> {
    try {
      const { stdout, stderr } = await execAsync(command, {
        timeout,
        maxBuffer: 10 * 1024 * 1024, // 10MB
      });

      return { stdout, stderr };
    } catch (error: any) {
      // Re-throw with consistent structure
      throw {
        code: error.code,
        message: error.message,
        stdout: error.stdout || '',
        stderr: error.stderr || '',
      };
    }
  }

  /**
   * Validate DAG structure (no cycles, valid dependencies)
   */
  private validateDAG(tasks: TaskNode[]): void {
    const taskIds = new Set(tasks.map(t => t.id));

    // Check for duplicate task IDs
    if (taskIds.size !== tasks.length) {
      throw new Error('Duplicate task IDs detected in DAG');
    }

    // Check all dependencies exist
    for (const task of tasks) {
      for (const depId of task.dependsOn) {
        if (!taskIds.has(depId)) {
          throw new Error(`Task ${task.id} depends on non-existent task: ${depId}`);
        }
      }
    }

    // Check for cycles using depth-first search
    this.detectCycles(tasks);
  }

  /**
   * Detect cycles in DAG using DFS
   */
  private detectCycles(tasks: TaskNode[]): void {
    const visited = new Set<string>();
    const recursionStack = new Set<string>();
    const graph = this.buildDependencyGraph(tasks);

    const dfs = (taskId: string): boolean => {
      visited.add(taskId);
      recursionStack.add(taskId);

      const task = graph.get(taskId);
      if (!task) {
        return false;
      }

      for (const depId of task.dependsOn) {
        if (!visited.has(depId)) {
          if (dfs(depId)) {
            return true;
          }
        } else if (recursionStack.has(depId)) {
          throw new Error(`Circular dependency detected: ${taskId} -> ${depId}`);
        }
      }

      recursionStack.delete(taskId);
      return false;
    };

    for (const task of tasks) {
      if (!visited.has(task.id)) {
        dfs(task.id);
      }
    }
  }

  /**
   * Build dependency graph from tasks
   */
  private buildDependencyGraph(tasks: TaskNode[]): Map<string, TaskNode> {
    const graph = new Map<string, TaskNode>();

    for (const task of tasks) {
      graph.set(task.id, task);
    }

    return graph;
  }

  /**
   * Topological sort to determine execution order (Kahn's algorithm)
   */
  private topologicalSort(graph: Map<string, TaskNode>): TaskNode[][] {
    const layers: TaskNode[][] = [];
    const inDegree = new Map<string, number>();
    const visited = new Set<string>();

    // Calculate in-degrees
    for (const [id, task] of graph) {
      if (!inDegree.has(id)) {
        inDegree.set(id, 0);
      }

      for (const _depId of task.dependsOn) {
        inDegree.set(id, (inDegree.get(id) || 0) + 1);
      }
    }

    // Process nodes layer by layer
    while (visited.size < graph.size) {
      const layer: TaskNode[] = [];

      // Find all nodes with in-degree 0 (no unmet dependencies)
      for (const [id, task] of graph) {
        if (!visited.has(id) && (inDegree.get(id) || 0) === 0) {
          layer.push(task);
        }
      }

      if (layer.length === 0) {
        // This shouldn't happen if cycle detection works
        throw new Error('Cannot resolve DAG - circular dependency detected');
      }

      layers.push(layer);

      // Mark layer as visited and update in-degrees
      for (const task of layer) {
        visited.add(task.id);

        // Decrease in-degree for dependent tasks
        for (const [id, t] of graph) {
          if (t.dependsOn.includes(task.id)) {
            inDegree.set(id, (inDegree.get(id) || 0) - 1);
          }
        }
      }
    }

    return layers;
  }

  /**
   * Get all tasks that depend on the given task (recursively)
   */
  private getDependentTasks(taskId: string, allTasks: TaskNode[]): string[] {
    const dependents: string[] = [];
    const queue = [taskId];
    const visited = new Set<string>();

    while (queue.length > 0) {
      const current = queue.shift()!;

      if (visited.has(current)) {
        continue;
      }

      visited.add(current);

      for (const task of allTasks) {
        if (task.dependsOn.includes(current) && !visited.has(task.id)) {
          dependents.push(task.id);
          queue.push(task.id);
        }
      }
    }

    return dependents;
  }
}
