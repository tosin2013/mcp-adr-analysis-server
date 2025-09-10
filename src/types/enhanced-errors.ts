/**
 * Enhanced error types for better user experience
 */

export interface ErrorSuggestion {
  action: string;
  description: string;
  example?: string;
}

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
}