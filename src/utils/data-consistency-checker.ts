/**
 * Data Consistency Checker for TodoJsonManager
 *
 * Provides comprehensive data validation and consistency checks
 * to ensure data integrity after rapid operations.
 */

import { TodoJsonData, TodoTask } from '../types/todo-json-schemas.js';
// import { TodoError } from './todo-json-manager.js';

export interface ConsistencyCheckResult {
  isValid: boolean;
  errors: ConsistencyError[];
  warnings: ConsistencyWarning[];
  fixedIssues: string[];
}

export interface ConsistencyError {
  type: string;
  message: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  affectedItems: string[];
  suggestedFix?: string;
}

export interface ConsistencyWarning {
  type: string;
  message: string;
  affectedItems: string[];
  recommendation?: string;
}

export class DataConsistencyChecker {
  /**
   * Perform comprehensive consistency check on todo data
   *
   * Validates data integrity across all TODO data structures and
   * optionally auto-fixes common issues.
   *
   * @param data - TodoJsonData to validate
   * @param options - Configuration options
   * @param options.autoFix - Whether to automatically fix detected issues
   * @param options.strictMode - Whether to use strict validation rules
   *
   * @returns Promise resolving to detailed consistency check results
   *
   * @example
   * ```typescript
   * const result = await DataConsistencyChecker.checkConsistency(data, {
   *   autoFix: true,
   *   strictMode: false
   * });
   *
   * if (!result.isValid) {
   *   console.log(`Found ${result.errors.length} errors`);
   *   result.errors.forEach(error => console.log(`- ${error.message}`));
   * }
   * ```
   */
  static async checkConsistency(
    data: TodoJsonData,
    options: {
      autoFix?: boolean;
      strictMode?: boolean;
    } = {}
  ): Promise<ConsistencyCheckResult> {
    const result: ConsistencyCheckResult = {
      isValid: true,
      errors: [],
      warnings: [],
      fixedIssues: [],
    };

    // Check task-section consistency
    await this.checkTaskSectionConsistency(data, result, options);

    // Check metadata consistency
    await this.checkMetadataConsistency(data, result, options);

    // Check dependency consistency
    await this.checkDependencyConsistency(data, result, options);

    // Check data integrity
    await this.checkDataIntegrity(data, result, options);

    // Check for orphaned references
    await this.checkOrphanedReferences(data, result, options);

    // Check scoring sync consistency
    await this.checkScoringSyncConsistency(data, result, options);

    result.isValid = result.errors.length === 0;

    return result;
  }

  /**
   * Check that all tasks in sections exist in tasks object and vice versa
   */
  private static async checkTaskSectionConsistency(
    data: TodoJsonData,
    result: ConsistencyCheckResult,
    options: { autoFix?: boolean }
  ): Promise<void> {
    // Add null/undefined checking to prevent crashes
    if (!data.tasks || typeof data.tasks !== 'object') {
      result.errors.push({
        type: 'INVALID_TASKS_OBJECT',
        message: 'Tasks object is null, undefined, or not an object',
        severity: 'critical',
        affectedItems: ['tasks'],
        suggestedFix: 'Initialize tasks as an empty object',
      });
      return;
    }

    if (!data.sections || !Array.isArray(data.sections)) {
      result.errors.push({
        type: 'INVALID_SECTIONS_ARRAY',
        message: 'Sections is null, undefined, or not an array',
        severity: 'critical',
        affectedItems: ['sections'],
        suggestedFix: 'Initialize sections as an empty array',
      });
      return;
    }

    const tasksInSections = new Set<string>();
    const tasksInObject = new Set(Object.keys(data.tasks));

    // Collect all task IDs from sections
    for (const section of data.sections) {
      for (const taskId of section.tasks) {
        if (tasksInSections.has(taskId)) {
          result.errors.push({
            type: 'DUPLICATE_TASK_IN_SECTIONS',
            message: `Task ${taskId} appears in multiple sections`,
            severity: 'high',
            affectedItems: [taskId],
            suggestedFix: 'Remove duplicate references',
          });
        }
        tasksInSections.add(taskId);

        // Check if task exists in tasks object
        if (!tasksInObject.has(taskId)) {
          result.errors.push({
            type: 'MISSING_TASK_OBJECT',
            message: `Task ${taskId} referenced in section ${section.id} but not found in tasks object`,
            severity: 'critical',
            affectedItems: [taskId],
            suggestedFix: 'Remove reference from section or restore task object',
          });

          // Auto-fix: remove from section
          if (options.autoFix) {
            section.tasks = section.tasks.filter(id => id !== taskId);
            result.fixedIssues.push(
              `Removed orphaned task reference ${taskId} from section ${section.id}`
            );
          }
        }
      }
    }

    // Check for tasks not in any section
    for (const taskId of tasksInObject) {
      if (!tasksInSections.has(taskId)) {
        const task = data.tasks[taskId];
        if (task && !task.archived) {
          result.warnings.push({
            type: 'TASK_NOT_IN_SECTION',
            message: `Task ${taskId} exists but is not in any section`,
            affectedItems: [taskId],
            recommendation: 'Add task to appropriate section based on status',
          });

          // Auto-fix: add to appropriate section
          if (options.autoFix) {
            const targetSection = data.sections.find(s => s.id === task.status) || data.sections[0];
            if (targetSection) {
              targetSection.tasks.push(taskId);
              result.fixedIssues.push(`Added task ${taskId} to section ${targetSection.id}`);
            }
          }
        }
      }
    }
  }

  /**
   * Check metadata consistency with actual task data
   */
  private static async checkMetadataConsistency(
    data: TodoJsonData,
    result: ConsistencyCheckResult,
    options: { autoFix?: boolean }
  ): Promise<void> {
    // Add null/undefined checking
    if (!data.tasks || typeof data.tasks !== 'object') {
      return; // Already handled in checkTaskSectionConsistency
    }

    if (!data.metadata || typeof data.metadata !== 'object') {
      result.errors.push({
        type: 'INVALID_METADATA_OBJECT',
        message: 'Metadata object is null, undefined, or not an object',
        severity: 'critical',
        affectedItems: ['metadata'],
        suggestedFix: 'Initialize metadata object with required fields',
      });
      return;
    }

    const actualTotal = Object.keys(data.tasks).length;
    const actualCompleted = Object.values(data.tasks).filter(
      t => t && t.status === 'completed'
    ).length;

    // Store original values for accurate reporting
    const originalTotalTasks = data.metadata.totalTasks;
    const originalCompletedTasks = data.metadata.completedTasks;

    if (data.metadata.totalTasks !== actualTotal) {
      // Only add warning if not auto-fixing, to prevent double-counting
      if (!options.autoFix) {
        result.warnings.push({
          type: 'METADATA_MISMATCH',
          message: `Metadata totalTasks (${data.metadata.totalTasks}) doesn't match actual count (${actualTotal})`,
          affectedItems: ['metadata'],
          recommendation: 'Update metadata to reflect actual task count',
        });
      }

      if (options.autoFix) {
        data.metadata.totalTasks = actualTotal;
        result.fixedIssues.push(
          `Updated metadata totalTasks from ${originalTotalTasks} to ${actualTotal}`
        );
      }
    }

    if (data.metadata.completedTasks !== actualCompleted) {
      // Only add warning if not auto-fixing, to prevent double-counting
      if (!options.autoFix) {
        result.warnings.push({
          type: 'METADATA_MISMATCH',
          message: `Metadata completedTasks (${data.metadata.completedTasks}) doesn't match actual count (${actualCompleted})`,
          affectedItems: ['metadata'],
          recommendation: 'Update metadata to reflect actual completed task count',
        });
      }

      if (options.autoFix) {
        data.metadata.completedTasks = actualCompleted;
        result.fixedIssues.push(
          `Updated metadata completedTasks from ${originalCompletedTasks} to ${actualCompleted}`
        );
      }
    }
  }

  /**
   * Check dependency consistency and circular dependencies
   */
  private static async checkDependencyConsistency(
    data: TodoJsonData,
    result: ConsistencyCheckResult,
    _options: { autoFix?: boolean }
  ): Promise<void> {
    // Add null/undefined checking
    if (!data.tasks || typeof data.tasks !== 'object') {
      return; // Already handled in checkTaskSectionConsistency
    }

    for (const [taskId, task] of Object.entries(data.tasks)) {
      // Add null/undefined checking for task object
      if (!task || typeof task !== 'object') {
        continue; // Already handled in checkDataIntegrity
      }
      // Check if dependencies exist
      for (const depId of task.dependencies || []) {
        if (!data.tasks[depId]) {
          result.errors.push({
            type: 'MISSING_DEPENDENCY',
            message: `Task ${taskId} depends on non-existent task ${depId}`,
            severity: 'medium',
            affectedItems: [taskId, depId],
            suggestedFix: 'Remove invalid dependency or restore missing task',
          });
        }
      }

      // Check for circular dependencies
      const visited = new Set<string>();
      const recursionStack = new Set<string>();

      if (this.hasCircularDependency(taskId, data.tasks, visited, recursionStack)) {
        result.errors.push({
          type: 'CIRCULAR_DEPENDENCY',
          message: `Circular dependency detected involving task ${taskId}`,
          severity: 'high',
          affectedItems: Array.from(recursionStack),
          suggestedFix: 'Remove one or more dependencies to break the cycle',
        });
      }
    }
  }

  /**
   * Check for circular dependencies using DFS
   */
  private static hasCircularDependency(
    taskId: string,
    tasks: Record<string, TodoTask>,
    visited: Set<string>,
    recursionStack: Set<string>
  ): boolean {
    if (recursionStack.has(taskId)) {
      return true; // Circular dependency found
    }

    if (visited.has(taskId)) {
      return false; // Already processed
    }

    visited.add(taskId);
    recursionStack.add(taskId);

    const task = tasks[taskId];
    if (task && task.dependencies) {
      for (const depId of task.dependencies) {
        if (this.hasCircularDependency(depId, tasks, visited, recursionStack)) {
          return true;
        }
      }
    }

    recursionStack.delete(taskId);
    return false;
  }

  /**
   * Check general data integrity
   */
  private static async checkDataIntegrity(
    data: TodoJsonData,
    result: ConsistencyCheckResult,
    _options: { autoFix?: boolean }
  ): Promise<void> {
    // Add null/undefined checking
    if (!data.tasks || typeof data.tasks !== 'object') {
      return; // Already handled in checkTaskSectionConsistency
    }

    // Check for required fields
    for (const [taskId, task] of Object.entries(data.tasks)) {
      // Add comprehensive null/undefined checking for task object
      if (!task || typeof task !== 'object') {
        result.errors.push({
          type: 'INVALID_TASK_OBJECT',
          message: `Task ${taskId} is null, undefined, or not an object`,
          severity: 'critical',
          affectedItems: [taskId],
          suggestedFix: 'Remove invalid task or restore valid task object',
        });
        continue;
      }
      if (!task.id || task.id !== taskId) {
        result.errors.push({
          type: 'INVALID_TASK_ID',
          message: `Task ${taskId} has invalid or missing ID field`,
          severity: 'critical',
          affectedItems: [taskId],
          suggestedFix: 'Fix task ID field to match object key',
        });
      }

      if (!task.title || task.title.trim() === '') {
        result.errors.push({
          type: 'MISSING_TITLE',
          message: `Task ${taskId} has empty or missing title`,
          severity: 'medium',
          affectedItems: [taskId],
          suggestedFix: 'Add a descriptive title to the task',
        });
      }

      if (!task.createdAt || !task.updatedAt) {
        result.warnings.push({
          type: 'MISSING_TIMESTAMPS',
          message: `Task ${taskId} has missing timestamps`,
          affectedItems: [taskId],
          recommendation: 'Add createdAt and updatedAt timestamps',
        });
      }

      // Check date validity
      if (task.dueDate) {
        const date = new Date(task.dueDate);
        if (isNaN(date.getTime())) {
          result.errors.push({
            type: 'INVALID_DATE',
            message: `Task ${taskId} has invalid due date: ${task.dueDate}`,
            severity: 'medium',
            affectedItems: [taskId],
            suggestedFix: 'Use valid ISO date format',
          });
        }
      }
    }
  }

  /**
   * Check for orphaned references
   */
  private static async checkOrphanedReferences(
    data: TodoJsonData,
    result: ConsistencyCheckResult,
    _options: { autoFix?: boolean }
  ): Promise<void> {
    // Add null/undefined checking
    if (!data.tasks || typeof data.tasks !== 'object') {
      return; // Already handled in checkTaskSectionConsistency
    }

    const taskIds = new Set(Object.keys(data.tasks));

    // Check parent-child relationships
    for (const [taskId, task] of Object.entries(data.tasks)) {
      // Add null/undefined checking for task object
      if (!task || typeof task !== 'object') {
        continue; // Already handled in checkDataIntegrity
      }
      if (task.parentTaskId && !taskIds.has(task.parentTaskId)) {
        result.errors.push({
          type: 'ORPHANED_PARENT_REFERENCE',
          message: `Task ${taskId} references non-existent parent ${task.parentTaskId}`,
          severity: 'medium',
          affectedItems: [taskId],
          suggestedFix: 'Remove parent reference or restore parent task',
        });
      }

      // Check subtask references
      for (const subtaskId of task.subtasks || []) {
        if (!taskIds.has(subtaskId)) {
          result.errors.push({
            type: 'ORPHANED_SUBTASK_REFERENCE',
            message: `Task ${taskId} references non-existent subtask ${subtaskId}`,
            severity: 'medium',
            affectedItems: [taskId],
            suggestedFix: 'Remove subtask reference or restore subtask',
          });
        }
      }
    }
  }

  /**
   * Check scoring sync consistency
   */
  private static async checkScoringSyncConsistency(
    data: TodoJsonData,
    result: ConsistencyCheckResult,
    _options: { autoFix?: boolean }
  ): Promise<void> {
    if (!data.scoringSync) {
      result.warnings.push({
        type: 'MISSING_SCORING_SYNC',
        message: 'Scoring sync data is missing',
        affectedItems: ['scoringSync'],
        recommendation: 'Initialize scoring sync data',
      });
      return;
    }

    // Add null/undefined checking for metadata
    if (!data.metadata || typeof data.metadata !== 'object') {
      return; // Already handled in checkMetadataConsistency
    }

    // Check if scoring data is stale
    const lastUpdate = new Date(data.scoringSync.lastScoreUpdate);
    const lastDataUpdate = new Date(data.metadata.lastUpdated);

    if (lastUpdate < lastDataUpdate) {
      result.warnings.push({
        type: 'STALE_SCORING_DATA',
        message: 'Scoring data appears to be stale compared to task data',
        affectedItems: ['scoringSync'],
        recommendation: 'Update scoring data to reflect current task state',
      });
    }
  }

  /**
   * Quick consistency check for performance-critical operations
   */
  static async quickCheck(data: TodoJsonData): Promise<boolean> {
    try {
      // Add null/undefined checking
      if (!data || typeof data !== 'object') {
        return false;
      }

      if (!data.tasks || typeof data.tasks !== 'object') {
        return false;
      }

      if (!data.sections || !Array.isArray(data.sections)) {
        return false;
      }

      if (!data.metadata || typeof data.metadata !== 'object') {
        return false;
      }

      // Basic checks only
      const taskIds = new Set(Object.keys(data.tasks));

      // Check task-section consistency
      for (const section of data.sections) {
        if (!section || !Array.isArray(section.tasks)) {
          return false;
        }
        for (const taskId of section.tasks) {
          if (!taskIds.has(taskId)) {
            return false;
          }
        }
      }

      // Check basic metadata
      const actualTotal = Object.keys(data.tasks).length;
      if (
        typeof data.metadata.totalTasks !== 'number' ||
        Math.abs(data.metadata.totalTasks - actualTotal) > 1
      ) {
        return false;
      }

      return true;
    } catch {
      return false;
    }
  }
}
