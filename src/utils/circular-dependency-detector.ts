/**
 * Circular dependency detection utility for TODO tasks
 */

import { TodoManagerError } from '../types/enhanced-errors.js';
import { TodoTask } from '../types/todo-json-schemas.js';

export interface DependencyPath {
  taskId: string;
  title?: string;
}

export interface CircularDependencyResult {
  hasCircularDependency: boolean;
  circularPath?: DependencyPath[];
  error?: TodoManagerError;
}

export class CircularDependencyDetector {
  /**
   * Check for circular dependencies when adding new dependencies to a task
   */
  static checkForCircularDependency(
    taskId: string,
    newDependencies: string[],
    allTasks: Record<string, TodoTask>
  ): CircularDependencyResult {
    // Build a dependency graph
    const dependencyGraph = this.buildDependencyGraph(allTasks);

    // Add the new dependencies to the graph temporarily
    const tempGraph = { ...dependencyGraph };
    tempGraph[taskId] = [...(tempGraph[taskId] || []), ...newDependencies];

    // Check for cycles starting from the task being updated
    const result = this.detectCycle(taskId, tempGraph, allTasks);

    if (result.hasCircularDependency && result.circularPath) {
      const pathIds = result.circularPath.map(p => p.taskId);
      return {
        hasCircularDependency: true,
        circularPath: result.circularPath,
        error: TodoManagerError.circularDependency(pathIds),
      };
    }

    return { hasCircularDependency: false };
  }

  /**
   * Check for circular dependencies in the entire task system
   */
  static checkAllCircularDependencies(
    allTasks: Record<string, TodoTask>
  ): CircularDependencyResult[] {
    const dependencyGraph = this.buildDependencyGraph(allTasks);
    const results: CircularDependencyResult[] = [];

    for (const taskId of Object.keys(allTasks)) {
      const result = this.detectCycle(taskId, dependencyGraph, allTasks);
      if (result.hasCircularDependency) {
        results.push(result);
      }
    }

    return results;
  }

  /**
   * Build a dependency graph from all tasks
   */
  private static buildDependencyGraph(
    allTasks: Record<string, TodoTask>
  ): Record<string, string[]> {
    const graph: Record<string, string[]> = {};

    for (const [taskId, task] of Object.entries(allTasks)) {
      graph[taskId] = task.dependencies || [];
    }

    return graph;
  }

  /**
   * Detect cycles using DFS with path tracking
   */
  private static detectCycle(
    startTaskId: string,
    dependencyGraph: Record<string, string[]>,
    allTasks: Record<string, TodoTask>,
    visited: Set<string> = new Set(),
    recursionStack: Set<string> = new Set(),
    currentPath: DependencyPath[] = []
  ): CircularDependencyResult {
    // Add current task to the path
    const currentTask = allTasks[startTaskId];
    const currentPathEntry: DependencyPath = {
      taskId: startTaskId,
      title: currentTask?.title || 'Unknown Task',
    };
    currentPath.push(currentPathEntry);

    // Mark as visited and add to recursion stack
    visited.add(startTaskId);
    recursionStack.add(startTaskId);

    // Check all dependencies
    const dependencies = dependencyGraph[startTaskId] || [];

    for (const depId of dependencies) {
      // If dependency is in recursion stack, we found a cycle
      if (recursionStack.has(depId)) {
        // Find where the cycle starts in the current path
        const cycleStartIndex = currentPath.findIndex(p => p.taskId === depId);
        const cyclePath = currentPath.slice(cycleStartIndex);

        // Add the dependency that closes the cycle
        const depTask = allTasks[depId];
        cyclePath.push({
          taskId: depId,
          title: depTask?.title || 'Unknown Task',
        });

        return {
          hasCircularDependency: true,
          circularPath: cyclePath,
        };
      }

      // If not visited, recursively check
      if (!visited.has(depId)) {
        const result = this.detectCycle(
          depId,
          dependencyGraph,
          allTasks,
          visited,
          recursionStack,
          [...currentPath] // Pass a copy of the current path
        );

        if (result.hasCircularDependency) {
          return result;
        }
      }
    }

    // Remove from recursion stack when backtracking
    recursionStack.delete(startTaskId);

    return { hasCircularDependency: false };
  }

  /**
   * Get a human-readable description of a circular dependency
   */
  static formatCircularDependencyPath(path: DependencyPath[]): string {
    if (path.length === 0) return 'Unknown circular dependency';

    const pathDescription = path
      .map(p => `${p.taskId}${p.title ? ` (${p.title})` : ''}`)
      .join(' → ');

    return `Circular dependency: ${pathDescription}`;
  }

  /**
   * Get suggestions for resolving a circular dependency
   */
  static getResolutionSuggestions(path: DependencyPath[]): string[] {
    if (path.length < 2) return [];

    const suggestions = [
      `Remove the dependency from ${path[0]?.taskId} to ${path[1]?.taskId}`,
      `Break down one of the tasks in the cycle into smaller, independent tasks`,
      `Use task hierarchy (parent-child) instead of dependencies for some relationships`,
    ];

    // Add specific suggestions based on the cycle length
    if (path.length === 2) {
      suggestions.push('Consider if these tasks can be merged into a single task');
    } else if (path.length > 3) {
      suggestions.push('Consider restructuring the workflow to reduce complex dependencies');
    }

    return suggestions;
  }

  /**
   * Validate dependencies before creating or updating a task
   */
  static validateDependencies(
    taskId: string,
    dependencies: string[],
    allTasks: Record<string, TodoTask>
  ): { isValid: boolean; error?: TodoManagerError } {
    // Check if all dependencies exist
    for (const depId of dependencies) {
      if (!allTasks[depId]) {
        return {
          isValid: false,
          error: new TodoManagerError(
            `Dependency task '${depId}' does not exist`,
            'DEPENDENCY_NOT_FOUND',
            {
              field: 'dependencies',
              value: depId,
              suggestions: [
                {
                  action: 'Check the dependency task ID',
                  description: 'Ensure the dependency task exists',
                },
                {
                  action: 'Use find_task to locate the correct task',
                  description: 'Search for the task to get its correct ID',
                },
                {
                  action: 'Create the dependency task first',
                  description: 'Create the required dependency before adding it',
                },
              ],
            }
          ),
        };
      }
    }

    // Check for self-dependency
    if (dependencies.includes(taskId)) {
      return {
        isValid: false,
        error: new TodoManagerError(`Task cannot depend on itself: ${taskId}`, 'SELF_DEPENDENCY', {
          field: 'dependencies',
          value: taskId,
          suggestions: [
            {
              action: 'Remove self-reference from dependencies',
              description: 'A task cannot depend on itself',
            },
            {
              action: 'Break down the task',
              description: 'Consider splitting this into multiple independent tasks',
            },
          ],
        }),
      };
    }

    // Check for circular dependencies
    const circularResult = this.checkForCircularDependency(taskId, dependencies, allTasks);
    if (circularResult.hasCircularDependency && circularResult.error) {
      return {
        isValid: false,
        error: circularResult.error,
      };
    }

    return { isValid: true };
  }
}
