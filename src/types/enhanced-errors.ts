/**
 * Enhanced error types for better user experience
 * 
 * Provides structured error handling with actionable suggestions
 * and contextual information to help users resolve issues.
 */

/**
 * Represents an actionable suggestion for resolving an error
 */
export interface ErrorSuggestion {
  /** Brief description of the suggested action */
  action: string;
  /** Detailed explanation of how to perform the action */
  description: string;
  /** Optional example showing the correct usage */
  example?: string;
}

/**
 * Enhanced error class for TODO management operations
 * 
 * Provides structured error information with contextual suggestions
 * to help users understand and resolve issues quickly.
 * 
 * @example
 * ```typescript
 * try {
 *   await manager.updateTask({ taskId: "invalid", updates: {} });
 * } catch (error) {
 *   if (error instanceof TodoManagerError) {
 *     console.log(`Error: ${error.message}`);
 *     console.log(`Code: ${error.code}`);
 *     error.suggestions.forEach(s => {
 *       console.log(`- ${s.action}: ${s.description}`);
 *     });
 *   }
 * }
 * ```
 */
export class TodoManagerError extends Error {
  public readonly code: string;
  public readonly field?: string;
  public readonly value?: any;
  public readonly validValues?: any[];
  public readonly suggestions: ErrorSuggestion[];
  public readonly taskId?: string;
  public readonly suggestion?: string;

  constructor(
    message: string,
    code: string,
    options: {
      field?: string;
      value?: any;
      validValues?: any[];
      suggestions?: ErrorSuggestion[];
      taskId?: string;
      suggestion?: string;
    } = {}
  ) {
    super(message);
    this.name = 'TodoManagerError';
    this.code = code;
    if (options.field !== undefined) this.field = options.field;
    this.value = options.value;
    if (options.validValues !== undefined) this.validValues = options.validValues;
    this.suggestions = options.suggestions || [];
    if (options.taskId !== undefined) this.taskId = options.taskId;
    if (options.suggestion !== undefined) this.suggestion = options.suggestion;
  }

  static projectPathNotFound(path: string): TodoManagerError {
    return new TodoManagerError(
      `Project path '${path}' does not exist or is not accessible`,
      'PROJECT_PATH_NOT_FOUND',
      {
        value: path,
        suggestions: [
          {
            action: 'Check the PROJECT_PATH environment variable',
            description: 'Ensure the path points to a valid directory'
          },
          {
            action: 'Create the directory',
            description: `Run: mkdir -p "${path}"`
          },
          {
            action: 'Run from the project root',
            description: 'Make sure you are in the correct project directory'
          }
        ]
      }
    );
  }

  /**
   * Create a task not found error with helpful suggestions
   * 
   * @param taskId - The task ID that could not be found
   * @returns TodoManagerError with suggestions for finding the task
   */
  static taskNotFound(taskId: string): TodoManagerError {
    return new TodoManagerError(
      `Task '${taskId}' not found`,
      'TASK_NOT_FOUND',
      {
        taskId,
        suggestions: [
          {
            action: 'The task may have been deleted',
            description: 'Check if the task was recently removed'
          },
          {
            action: 'Use get_tasks to list all tasks',
            description: 'Verify the task ID exists in the current list'
          },
          {
            action: 'Search for the task using find_task',
            description: 'The task might have a different ID than expected'
          }
        ]
      }
    );
  }

  /**
   * Create an invalid task ID error with format guidance
   * 
   * @param taskId - The invalid task ID that was provided
   * @returns TodoManagerError with suggestions for correct ID format
   */
  static invalidTaskId(taskId: string): TodoManagerError {
    return new TodoManagerError(
      `Invalid task ID format: '${taskId}'`,
      'INVALID_TASK_ID',
      {
        value: taskId,
        suggestions: [
          {
            action: 'Use find_task to search for tasks',
            description: 'Search by title or description instead'
          },
          {
            action: 'Use get_tasks with showFullIds: true',
            description: 'Get the complete UUID for the task'
          },
          {
            action: 'Check the task ID format',
            description: 'Task IDs should be UUIDs or partial UUIDs (8+ characters)'
          }
        ]
      }
    );
  }

  static invalidPriority(value: string, suggestedValue?: string): TodoManagerError {
    const suggestionText = suggestedValue ? `Did you mean "${suggestedValue}"?` : 'Use one of the valid priority values';
    return new TodoManagerError(
      `Invalid priority '${value}'. Must be one of: low, medium, high, critical`,
      'INVALID_PRIORITY',
      {
        field: 'priority',
        value,
        validValues: ['low', 'medium', 'high', 'critical'],
        suggestion: suggestionText,
        suggestions: [
          {
            action: suggestionText,
            description: suggestedValue ? `Replace '${value}' with '${suggestedValue}'` : 'Choose from: low, medium, high, critical'
          }
        ]
      }
    );
  }

  static taskHasDependencies(taskId: string, dependentTasks: string[]): TodoManagerError {
    return new TodoManagerError(
      `Cannot delete task '${taskId}' because it has active dependencies: ${dependentTasks.join(', ')}`,
      'TASK_HAS_DEPENDENCIES',
      {
        taskId,
        value: dependentTasks,
        suggestions: [
          {
            action: 'Complete or delete dependent tasks first',
            description: 'Tasks that depend on this one must be handled first'
          },
          {
            action: 'Use archiveTask instead of deleteTask',
            description: 'Archiving preserves the task for reference while marking it inactive'
          },
          {
            action: 'Remove dependencies from dependent tasks',
            description: 'Update dependent tasks to remove this dependency'
          }
        ]
      }
    );
  }

  /**
   * Create a circular dependency error with resolution suggestions
   * 
   * @param taskIds - Array of task IDs forming the circular dependency chain
   * @returns TodoManagerError with suggestions for breaking the cycle
   */
  static circularDependency(taskIds: string[]): TodoManagerError {
    const chain = taskIds.join(' → ');
    return new TodoManagerError(
      `Circular dependency detected: ${chain}`,
      'CIRCULAR_DEPENDENCY',
      {
        value: taskIds,
        suggestions: [
          {
            action: 'Remove one of the dependencies in the chain',
            description: `Break the cycle by removing a dependency from: ${chain}`
          },
          {
            action: 'Restructure task relationships',
            description: 'Consider breaking down tasks into smaller, independent units'
          },
          {
            action: 'Use task hierarchy instead of dependencies',
            description: 'Consider using parent-child relationships instead of dependencies'
          }
        ]
      }
    );
  }

  static invalidDateFormat(date: string, field: string = 'date'): TodoManagerError {
    return new TodoManagerError(
      `Invalid date format: '${date}'. Expected ISO 8601 format (YYYY-MM-DD or YYYY-MM-DDTHH:mm:ss.sssZ)`,
      'INVALID_DATE_FORMAT',
      {
        field,
        value: date,
        suggestions: [
          {
            action: 'Use ISO 8601 format',
            description: 'Examples: "2024-01-15", "2024-01-15T10:30:00Z"',
            example: '2024-01-15T10:30:00Z'
          },
          {
            action: 'Use relative dates',
            description: 'Examples: "today", "tomorrow", "+1 week", "+2 days"'
          },
          {
            action: 'Check date validity',
            description: 'Ensure the date exists (e.g., February 30th is invalid)'
          }
        ]
      }
    );
  }

  static invalidStatus(value: string, suggestedValue?: string): TodoManagerError {
    const suggestionText = suggestedValue ? `Did you mean "${suggestedValue}"?` : 'Use one of the valid status values';
    return new TodoManagerError(
      `Invalid status '${value}'. Must be one of: pending, in_progress, completed, blocked, cancelled`,
      'INVALID_STATUS',
      {
        field: 'status',
        value,
        validValues: ['pending', 'in_progress', 'completed', 'blocked', 'cancelled'],
        suggestion: suggestionText,
        suggestions: [
          {
            action: suggestionText,
            description: suggestedValue ? `Replace '${value}' with '${suggestedValue}'` : 'Choose from: pending, in_progress, completed, blocked, cancelled'
          }
        ]
      }
    );
  }

  static requiredFieldMissing(field: string): TodoManagerError {
    return new TodoManagerError(
      `Required field '${field}' is missing`,
      'REQUIRED_FIELD_MISSING',
      {
        field,
        suggestions: [
          {
            action: `Provide the '${field}' field`,
            description: `The '${field}' field is required for this operation`
          }
        ]
      }
    );
  }

  static invalidFieldValue(field: string, value: any, expectedType?: string): TodoManagerError {
    const typeInfo = expectedType ? ` (expected ${expectedType})` : '';
    return new TodoManagerError(
      `Invalid value for field '${field}': '${value}'${typeInfo}`,
      'INVALID_FIELD_VALUE',
      {
        field,
        value,
        suggestions: [
          {
            action: `Check the '${field}' field value`,
            description: expectedType ? `Expected type: ${expectedType}` : 'Verify the field value is correct'
          }
        ]
      }
    );
  }

  static taskAlreadyExists(taskId: string): TodoManagerError {
    return new TodoManagerError(
      `Task with ID '${taskId}' already exists`,
      'TASK_ALREADY_EXISTS',
      {
        taskId,
        suggestions: [
          {
            action: 'Use update_task instead',
            description: 'If you want to modify an existing task, use the update operation'
          },
          {
            action: 'Generate a new task ID',
            description: 'Create a new task with a unique ID'
          },
          {
            action: 'Check if this is a duplicate',
            description: 'Verify you are not accidentally creating the same task twice'
          }
        ]
      }
    );
  }

  static bulkOperationPartialFailure(successful: number, failed: number, errors: string[]): TodoManagerError {
    return new TodoManagerError(
      `Bulk operation completed with ${successful} successes and ${failed} failures`,
      'BULK_OPERATION_PARTIAL_FAILURE',
      {
        value: { successful, failed, errors },
        suggestions: [
          {
            action: 'Review failed operations',
            description: 'Check the error details for each failed operation'
          },
          {
            action: 'Retry failed operations individually',
            description: 'Process failed items one by one to identify specific issues'
          },
          {
            action: 'Use dry-run mode first',
            description: 'Test bulk operations with dry-run to identify issues beforehand'
          }
        ]
      }
    );
  }

  static operationNotSupported(operation: string): TodoManagerError {
    return new TodoManagerError(
      `Operation '${operation}' is not supported`,
      'OPERATION_NOT_SUPPORTED',
      {
        value: operation,
        suggestions: [
          {
            action: 'Check available operations',
            description: 'Use get_operations or check documentation for supported operations'
          },
          {
            action: 'Check operation spelling',
            description: 'Verify the operation name is spelled correctly'
          }
        ]
      }
    );
  }

  static concurrencyConflict(taskId: string): TodoManagerError {
    return new TodoManagerError(
      `Concurrency conflict: Task '${taskId}' was modified by another operation`,
      'CONCURRENCY_CONFLICT',
      {
        taskId,
        suggestions: [
          {
            action: 'Retry the operation',
            description: 'The task may have been updated by another process'
          },
          {
            action: 'Refresh task data',
            description: 'Get the latest task data before making changes'
          },
          {
            action: 'Use force update if necessary',
            description: 'Override the conflict if you are sure about the changes'
          }
        ]
      }
    );
  }

  static dataCorruption(details: string): TodoManagerError {
    return new TodoManagerError(
      `Data corruption detected: ${details}`,
      'DATA_CORRUPTION',
      {
        value: details,
        suggestions: [
          {
            action: 'Restore from backup',
            description: 'Use the most recent backup to restore data integrity'
          },
          {
            action: 'Run data validation',
            description: 'Check for and repair data inconsistencies'
          },
          {
            action: 'Contact support',
            description: 'If the issue persists, seek technical assistance'
          }
        ]
      }
    );
  }

  static undoNotAvailable(reason: string): TodoManagerError {
    return new TodoManagerError(
      `Undo operation not available: ${reason}`,
      'UNDO_NOT_AVAILABLE',
      {
        value: reason,
        suggestions: [
          {
            action: 'Check operation history',
            description: 'Use get_undo_history to see available undo operations'
          },
          {
            action: 'Manual recovery',
            description: 'You may need to manually recreate or restore the desired state'
          }
        ]
      }
    );
  }

  static searchQueryInvalid(query: string, reason: string): TodoManagerError {
    return new TodoManagerError(
      `Invalid search query '${query}': ${reason}`,
      'SEARCH_QUERY_INVALID',
      {
        value: query,
        suggestions: [
          {
            action: 'Simplify the search query',
            description: 'Try using simpler search terms'
          },
          {
            action: 'Check regex syntax',
            description: 'If using regex search, verify the pattern syntax'
          },
          {
            action: 'Use fuzzy search instead',
            description: 'Fuzzy search is more forgiving of typos and variations'
          }
        ]
      }
    );
  }

  static multipleTasksFound(partialId: string, matches: string[]): TodoManagerError {
    return new TodoManagerError(
      `Multiple tasks found for '${partialId}': ${matches.join(', ')}`,
      'MULTIPLE_TASKS_FOUND',
      {
        value: partialId,
        validValues: matches,
        suggestions: [
          {
            action: 'Use a more specific ID',
            description: 'Provide more characters to uniquely identify the task'
          },
          {
            action: 'Use the full task ID',
            description: 'Copy the complete UUID from the task list'
          },
          {
            action: 'Use find_task to search by title',
            description: 'Search by task title or description instead of ID'
          }
        ]
      }
    );
  }
}