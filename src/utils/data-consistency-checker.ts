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
      // Add null/undefined checking for section.tasks to prevent crashes
      if (!section || !Array.isArray(section.tasks)) {
        // Auto-fix: initialize empty tasks array
        if (options.autoFix && section) {
          section.tasks = [];
          result.fixedIssues.push(`Initialized empty tasks array for section ${section.id}`);
          // Continue processing this section now that it's fixed
        } else {
          // Only report error if not auto-fixing
          result.errors.push({
            type: 'INVALID_SECTION_TASKS',
            message: `Section ${section?.id || 'unknown'} has invalid tasks array (null, undefined, or not an array)`,
            severity: 'critical',
            affectedItems: [section?.id || 'unknown'],
            suggestedFix: 'Initialize section tasks as an empty array',
          });
          continue;
        }
      }

      // Create a copy of tasks array to avoid modification during iteration
      const sectionTasks = [...section.tasks];

      for (const taskId of sectionTasks) {
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
          // Auto-fix: remove from section atomically
          if (options.autoFix) {
            section.tasks = section.tasks.filter(id => id !== taskId);
            result.fixedIssues.push(
              `Removed orphaned task reference ${taskId} from section ${section.id}`
            );
          } else {
            // Only report error if not auto-fixing
            result.errors.push({
              type: 'MISSING_TASK_OBJECT',
              message: `Task ${taskId} referenced in section ${section.id} but not found in tasks object`,
              severity: 'critical',
              affectedItems: [taskId],
              suggestedFix: 'Remove reference from section or restore task object',
            });
          }
        }
      }
    }

    // Check for tasks not in any section
    for (const taskId of tasksInObject) {
      if (!tasksInSections.has(taskId)) {
        const task = data.tasks[taskId];
        // Add comprehensive null/undefined checking for task object
        if (task && typeof task === 'object' && !task.archived) {
          result.warnings.push({
            type: 'TASK_NOT_IN_SECTION',
            message: `Task ${taskId} exists but is not in any section`,
            affectedItems: [taskId],
            recommendation: 'Add task to appropriate section based on status',
          });

          // Auto-fix: add to appropriate section atomically
          if (options.autoFix) {
            const targetSection = data.sections.find(s => s.id === task.status) || data.sections[0];
            if (targetSection && Array.isArray(targetSection.tasks)) {
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

    // Perform atomic metadata updates to prevent inconsistent state
    const metadataUpdates: Array<{ field: string; from: number; to: number }> = [];

    if (data.metadata.totalTasks !== actualTotal) {
      // Only add warning if not auto-fixing, to prevent double-counting
      if (!options.autoFix) {
        result.warnings.push({
          type: 'METADATA_MISMATCH',
          message: `Metadata totalTasks (${data.metadata.totalTasks}) doesn't match actual count (${actualTotal})`,
          affectedItems: ['metadata'],
          recommendation: 'Update metadata to reflect actual task count',
        });
      } else {
        metadataUpdates.push({
          field: 'totalTasks',
          from: originalTotalTasks,
          to: actualTotal,
        });
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
      } else {
        metadataUpdates.push({
          field: 'completedTasks',
          from: originalCompletedTasks,
          to: actualCompleted,
        });
      }
    }

    // Apply all metadata updates atomically
    if (options.autoFix && metadataUpdates.length > 0) {
      try {
        // Apply all updates in a single operation to ensure atomicity
        for (const update of metadataUpdates) {
          if (update.field === 'totalTasks') {
            data.metadata.totalTasks = update.to;
          } else if (update.field === 'completedTasks') {
            data.metadata.completedTasks = update.to;
          }
        }

        // Report fixes only after successful atomic update
        for (const update of metadataUpdates) {
          result.fixedIssues.push(
            `Updated metadata ${update.field} from ${update.from} to ${update.to}`
          );
        }
      } catch (error) {
        // If atomic update fails, report error and don't claim fixes were made
        result.errors.push({
          type: 'METADATA_UPDATE_FAILED',
          message: `Failed to update metadata atomically: ${error instanceof Error ? error.message : 'Unknown error'}`,
          severity: 'high',
          affectedItems: ['metadata'],
          suggestedFix: 'Check metadata object structure and permissions',
        });
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

      // Check date validity with robust validation
      if (task.dueDate) {
        const dateValidationResult = this.validateDateFormat(task.dueDate, taskId);
        if (!dateValidationResult.isValid) {
          result.errors.push(dateValidationResult.error!);
        }
      }

      // Check other date fields for validity
      if (task.createdAt) {
        const createdAtValidation = this.validateDateFormat(task.createdAt, taskId, 'createdAt');
        if (!createdAtValidation.isValid) {
          result.errors.push(createdAtValidation.error!);
        }
      }

      if (task.updatedAt) {
        const updatedAtValidation = this.validateDateFormat(task.updatedAt, taskId, 'updatedAt');
        if (!updatedAtValidation.isValid) {
          result.errors.push(updatedAtValidation.error!);
        }
      }

      // Check timezone consistency across all date fields in the task
      const timezoneConsistencyResult = this.checkTimezoneConsistency(task, taskId);
      if (!timezoneConsistencyResult.isValid) {
        result.warnings.push({
          type: 'TIMEZONE_INCONSISTENCY',
          message: timezoneConsistencyResult.message!,
          affectedItems: [taskId],
          recommendation: 'Use consistent timezone format across all date fields in the task',
        });
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
   * Validate date format with robust edge case handling
   *
   * This method provides comprehensive date validation that catches edge cases
   * that the standard JavaScript Date constructor might miss or handle incorrectly.
   * It also ensures timezone consistency as required by requirement 4.3.
   */
  private static validateDateFormat(
    dateString: string,
    taskId: string,
    fieldName: string = 'dueDate'
  ): { isValid: boolean; error?: ConsistencyError } {
    if (!dateString || typeof dateString !== 'string') {
      return {
        isValid: false,
        error: {
          type: 'INVALID_DATE',
          message: `Task ${taskId} has empty or non-string ${fieldName}`,
          severity: 'medium',
          affectedItems: [taskId],
          suggestedFix: 'Provide a valid ISO date string (YYYY-MM-DDTHH:mm:ss.sssZ)',
        },
      };
    }

    // First check if it's a valid Date object
    const date = new Date(dateString);
    if (isNaN(date.getTime())) {
      return {
        isValid: false,
        error: {
          type: 'INVALID_DATE',
          message: `Task ${taskId} has invalid ${fieldName}: ${dateString}`,
          severity: 'medium',
          affectedItems: [taskId],
          suggestedFix:
            'Use valid ISO date format (YYYY-MM-DDTHH:mm:ss.sssZ or YYYY-MM-DDTHH:mm:ss±HH:mm)',
        },
      };
    }

    // Check for edge cases that JavaScript Date constructor handles incorrectly
    // by parsing the date string and validating components
    const isoDateRegex =
      /^(\d{4})-(\d{2})-(\d{2})(?:T(\d{2}):(\d{2}):(\d{2})(?:\.(\d{3}))?(?:Z|([+-]\d{2}):?(\d{2})))?$/;
    const match = dateString.match(isoDateRegex);

    if (match) {
      const [
        ,
        year,
        month,
        day,
        hour = '0',
        minute = '0',
        second = '0',
        millisecond = '0',
        tzHour,
        tzMinute,
      ] = match;

      // Ensure we have the required components
      if (!year || !month || !day) {
        return {
          isValid: false,
          error: {
            type: 'INVALID_DATE',
            message: `Task ${taskId} has ${fieldName} with missing date components: ${dateString}`,
            severity: 'medium',
            affectedItems: [taskId],
            suggestedFix: 'Use complete ISO date format (YYYY-MM-DDTHH:mm:ss.sssZ)',
          },
        };
      }

      // Validate year (reasonable range)
      const yearNum = parseInt(year, 10);
      if (yearNum < 1900 || yearNum > 2100) {
        return {
          isValid: false,
          error: {
            type: 'INVALID_DATE',
            message: `Task ${taskId} has ${fieldName} with unreasonable year: ${year}`,
            severity: 'medium',
            affectedItems: [taskId],
            suggestedFix: 'Use a year between 1900 and 2100',
          },
        };
      }

      // Validate month (1-12)
      const monthNum = parseInt(month, 10);
      if (monthNum < 1 || monthNum > 12) {
        return {
          isValid: false,
          error: {
            type: 'INVALID_DATE',
            message: `Task ${taskId} has ${fieldName} with invalid month: ${month}`,
            severity: 'medium',
            affectedItems: [taskId],
            suggestedFix: 'Use month values between 01 and 12',
          },
        };
      }

      // Validate day (1-31, accounting for month)
      const dayNum = parseInt(day, 10);
      const daysInMonth = new Date(yearNum, monthNum, 0).getDate();
      if (dayNum < 1 || dayNum > daysInMonth) {
        return {
          isValid: false,
          error: {
            type: 'INVALID_DATE',
            message: `Task ${taskId} has ${fieldName} with invalid day: ${day} for month ${month}`,
            severity: 'medium',
            affectedItems: [taskId],
            suggestedFix: `Use day values between 01 and ${daysInMonth.toString().padStart(2, '0')} for month ${month}`,
          },
        };
      }

      // Validate hour (0-23)
      const hourNum = parseInt(hour, 10);
      if (hourNum < 0 || hourNum > 23) {
        return {
          isValid: false,
          error: {
            type: 'INVALID_DATE',
            message: `Task ${taskId} has ${fieldName} with invalid hour: ${hour}`,
            severity: 'medium',
            affectedItems: [taskId],
            suggestedFix: 'Use hour values between 00 and 23',
          },
        };
      }

      // Validate minute (0-59)
      const minuteNum = parseInt(minute, 10);
      if (minuteNum < 0 || minuteNum > 59) {
        return {
          isValid: false,
          error: {
            type: 'INVALID_DATE',
            message: `Task ${taskId} has ${fieldName} with invalid minute: ${minute}`,
            severity: 'medium',
            affectedItems: [taskId],
            suggestedFix: 'Use minute values between 00 and 59',
          },
        };
      }

      // Validate second (0-59)
      const secondNum = parseInt(second, 10);
      if (secondNum < 0 || secondNum > 59) {
        return {
          isValid: false,
          error: {
            type: 'INVALID_DATE',
            message: `Task ${taskId} has ${fieldName} with invalid second: ${second}`,
            severity: 'medium',
            affectedItems: [taskId],
            suggestedFix: 'Use second values between 00 and 59',
          },
        };
      }

      // Validate timezone offset if present
      if (tzHour && tzMinute) {
        const tzHourNum = parseInt(tzHour, 10);
        const tzMinuteNum = parseInt(tzMinute, 10);

        if (Math.abs(tzHourNum) > 14 || (Math.abs(tzHourNum) === 14 && tzMinuteNum !== 0)) {
          return {
            isValid: false,
            error: {
              type: 'INVALID_DATE',
              message: `Task ${taskId} has ${fieldName} with invalid timezone offset: ${tzHour}:${tzMinute}`,
              severity: 'medium',
              affectedItems: [taskId],
              suggestedFix: 'Use timezone offsets between -14:00 and +14:00',
            },
          };
        }

        if (tzMinuteNum < 0 || tzMinuteNum > 59) {
          return {
            isValid: false,
            error: {
              type: 'INVALID_DATE',
              message: `Task ${taskId} has ${fieldName} with invalid timezone minute: ${tzMinute}`,
              severity: 'medium',
              affectedItems: [taskId],
              suggestedFix: 'Use timezone minute values between 00 and 59',
            },
          };
        }
      }

      // Additional validation: check if the parsed date matches the original string
      // This catches cases where JavaScript Date constructor "corrects" invalid dates
      const reconstructedDate = new Date(
        yearNum,
        monthNum - 1,
        dayNum,
        hourNum,
        minuteNum,
        secondNum,
        parseInt(millisecond, 10)
      );
      if (
        reconstructedDate.getFullYear() !== yearNum ||
        reconstructedDate.getMonth() !== monthNum - 1 ||
        reconstructedDate.getDate() !== dayNum ||
        reconstructedDate.getHours() !== hourNum ||
        reconstructedDate.getMinutes() !== minuteNum ||
        reconstructedDate.getSeconds() !== secondNum
      ) {
        return {
          isValid: false,
          error: {
            type: 'INVALID_DATE',
            message: `Task ${taskId} has ${fieldName} that was auto-corrected by date parser: ${dateString}`,
            severity: 'medium',
            affectedItems: [taskId],
            suggestedFix:
              'Use a valid date that exists in the calendar (e.g., February 30th does not exist)',
          },
        };
      }
    } else {
      // If it doesn't match ISO format, check for common invalid formats
      const commonInvalidFormats = [
        /^\d{4}\/\d{2}\/\d{2}/, // YYYY/MM/DD
        /^\d{2}-\d{2}-\d{4}/, // DD-MM-YYYY
        /^\d{2}\/\d{2}\/\d{4}/, // MM/DD/YYYY
        /^[a-zA-Z]/, // Starts with letters
      ];

      let suggestedFix = 'Use valid ISO date format (YYYY-MM-DDTHH:mm:ss.sssZ)';

      if (commonInvalidFormats[0]?.test(dateString)) {
        suggestedFix = 'Replace "/" with "-" and use ISO format: YYYY-MM-DDTHH:mm:ss.sssZ';
      } else if (
        commonInvalidFormats[1]?.test(dateString) ||
        commonInvalidFormats[2]?.test(dateString)
      ) {
        suggestedFix = 'Reorder to YYYY-MM-DD format and add time: YYYY-MM-DDTHH:mm:ss.sssZ';
      } else if (commonInvalidFormats[3]?.test(dateString)) {
        suggestedFix = 'Use numeric date format instead of text: YYYY-MM-DDTHH:mm:ss.sssZ';
      }

      return {
        isValid: false,
        error: {
          type: 'INVALID_DATE',
          message: `Task ${taskId} has ${fieldName} in unrecognized format: ${dateString}`,
          severity: 'medium',
          affectedItems: [taskId],
          suggestedFix,
        },
      };
    }

    return { isValid: true };
  }

  /**
   * Check timezone consistency across all date fields in a task
   *
   * This ensures that all dates in a task use consistent timezone formatting
   * to prevent confusion and ensure accurate date comparisons.
   */
  private static checkTimezoneConsistency(
    task: TodoTask,
    taskId: string
  ): { isValid: boolean; message?: string } {
    const dateFields = [
      { field: 'createdAt', value: task.createdAt },
      { field: 'updatedAt', value: task.updatedAt },
      { field: 'dueDate', value: task.dueDate },
    ].filter(field => field.value);

    if (dateFields.length < 2) {
      return { isValid: true }; // Not enough dates to compare
    }

    const timezoneFormats = dateFields.map(field => {
      const value = field.value!;
      if (value.endsWith('Z')) {
        return 'UTC';
      } else if (value.includes('+') || value.includes('-')) {
        const match = value.match(/([+-]\d{2}):?(\d{2})$/);
        return match ? `${match[1]}:${match[2]}` : 'UNKNOWN';
      } else {
        return 'LOCAL'; // No timezone specified
      }
    });

    const uniqueFormats = new Set(timezoneFormats);

    if (uniqueFormats.size > 1) {
      const formatList = Array.from(uniqueFormats).join(', ');
      return {
        isValid: false,
        message: `Task ${taskId} has inconsistent timezone formats: ${formatList}`,
      };
    }

    return { isValid: true };
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

      // Basic date validation for critical date fields
      for (const [, task] of Object.entries(data.tasks)) {
        if (!task || typeof task !== 'object') {
          return false;
        }

        // Quick date validation - just check if dates are parseable
        const dateFields = [task.createdAt, task.updatedAt, task.dueDate].filter(
          Boolean
        ) as string[];
        for (const dateField of dateFields) {
          const date = new Date(dateField);
          if (isNaN(date.getTime())) {
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
