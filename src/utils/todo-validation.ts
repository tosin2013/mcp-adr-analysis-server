/**
 * Comprehensive validation utilities for TODO management
 */

import { TodoManagerError } from '../types/enhanced-errors.js';

export interface ValidationResult {
  isValid: boolean;
  error?: TodoManagerError;
}

export class TodoValidator {
  private static readonly VALID_PRIORITIES = ['low', 'medium', 'high', 'critical'];
  private static readonly VALID_STATUSES = [
    'pending',
    'in_progress',
    'completed',
    'blocked',
    'cancelled',
  ];

  private static readonly PRIORITY_SUGGESTIONS: Record<string, string> = {
    urgent: 'critical',
    normal: 'medium',
    important: 'high',
    minor: 'low',
    major: 'high',
    blocker: 'critical',
    trivial: 'low',
  };

  private static readonly STATUS_SUGGESTIONS: Record<string, string> = {
    todo: 'pending',
    doing: 'in_progress',
    done: 'completed',
    complete: 'completed',
    finished: 'completed',
    started: 'in_progress',
    working: 'in_progress',
    stuck: 'blocked',
    waiting: 'blocked',
    canceled: 'cancelled',
    cancelled: 'cancelled',
  };

  /**
   * Validate priority value
   */
  static validatePriority(priority: string): ValidationResult {
    if (!priority) {
      return { isValid: false, error: TodoManagerError.requiredFieldMissing('priority') };
    }

    if (this.VALID_PRIORITIES.includes(priority.toLowerCase())) {
      return { isValid: true };
    }

    const suggestion = this.PRIORITY_SUGGESTIONS[priority.toLowerCase()];
    return {
      isValid: false,
      error: TodoManagerError.invalidPriority(priority, suggestion),
    };
  }

  /**
   * Validate status value
   */
  static validateStatus(status: string): ValidationResult {
    if (!status) {
      return { isValid: false, error: TodoManagerError.requiredFieldMissing('status') };
    }

    if (this.VALID_STATUSES.includes(status.toLowerCase())) {
      return { isValid: true };
    }

    const suggestion = this.STATUS_SUGGESTIONS[status.toLowerCase()];
    return {
      isValid: false,
      error: TodoManagerError.invalidStatus(status, suggestion),
    };
  }

  /**
   * Validate date format
   */
  static validateDate(dateString: string, fieldName: string = 'date'): ValidationResult {
    if (!dateString) {
      return { isValid: true }; // Optional field
    }

    // Try parsing as ISO date
    const date = new Date(dateString);
    if (isNaN(date.getTime())) {
      return {
        isValid: false,
        error: TodoManagerError.invalidDateFormat(dateString, fieldName),
      };
    }

    // Check if date is in the past for due dates
    if (fieldName === 'dueDate' && date < new Date()) {
      return {
        isValid: false,
        error: new TodoManagerError(`Due date '${dateString}' is in the past`, 'DATE_IN_PAST', {
          field: fieldName,
          value: dateString,
          suggestions: [
            {
              action: 'Use a future date',
              description: 'Due dates should be in the future',
            },
            {
              action: 'Use relative dates',
              description: 'Examples: "tomorrow", "+1 week", "+3 days"',
            },
          ],
        }),
      };
    }

    return { isValid: true };
  }

  /**
   * Validate progress percentage
   */
  static validateProgressPercentage(progress: number): ValidationResult {
    if (progress < 0 || progress > 100) {
      return {
        isValid: false,
        error: new TodoManagerError(
          `Progress percentage must be between 0 and 100, got ${progress}`,
          'INVALID_PROGRESS_PERCENTAGE',
          {
            field: 'progressPercentage',
            value: progress,
            suggestions: [
              {
                action: 'Use a value between 0 and 100',
                description: 'Progress is measured as a percentage (0-100)',
              },
            ],
          }
        ),
      };
    }

    return { isValid: true };
  }

  /**
   * Validate task title
   */
  static validateTitle(title: string): ValidationResult {
    if (!title || title.trim().length === 0) {
      return {
        isValid: false,
        error: TodoManagerError.requiredFieldMissing('title'),
      };
    }

    if (title.length > 200) {
      return {
        isValid: false,
        error: new TodoManagerError(
          `Task title is too long (${title.length} characters). Maximum is 200 characters.`,
          'TITLE_TOO_LONG',
          {
            field: 'title',
            value: title,
            suggestions: [
              {
                action: 'Shorten the title',
                description: 'Use a concise title and put details in the description',
              },
              {
                action: 'Move details to description',
                description: 'Keep the title brief and use the description field for details',
              },
            ],
          }
        ),
      };
    }

    return { isValid: true };
  }

  /**
   * Validate task ID format
   */
  static validateTaskId(taskId: string): ValidationResult {
    if (!taskId || taskId.trim().length === 0) {
      return {
        isValid: false,
        error: TodoManagerError.requiredFieldMissing('taskId'),
      };
    }

    // Allow UUIDs (full or partial) and simple alphanumeric IDs
    const uuidPattern = /^[0-9a-f]{8,}(-[0-9a-f]{4}){0,3}(-[0-9a-f]{12})?$/i;
    const simpleIdPattern = /^[a-zA-Z0-9_-]{3,}$/;

    if (!uuidPattern.test(taskId) && !simpleIdPattern.test(taskId)) {
      return {
        isValid: false,
        error: TodoManagerError.invalidTaskId(taskId),
      };
    }

    return { isValid: true };
  }

  /**
   * Validate array of tags
   */
  static validateTags(tags: string[]): ValidationResult {
    if (!Array.isArray(tags)) {
      return {
        isValid: false,
        error: TodoManagerError.invalidFieldValue('tags', tags, 'array of strings'),
      };
    }

    for (const tag of tags) {
      if (typeof tag !== 'string') {
        return {
          isValid: false,
          error: TodoManagerError.invalidFieldValue('tags', tag, 'string'),
        };
      }

      if (tag.length > 50) {
        return {
          isValid: false,
          error: new TodoManagerError(
            `Tag '${tag}' is too long (${tag.length} characters). Maximum is 50 characters.`,
            'TAG_TOO_LONG',
            {
              field: 'tags',
              value: tag,
              suggestions: [
                {
                  action: 'Shorten the tag',
                  description: 'Use shorter, more concise tags',
                },
                {
                  action: 'Use abbreviations',
                  description: 'Consider using common abbreviations for long terms',
                },
              ],
            }
          ),
        };
      }
    }

    return { isValid: true };
  }

  /**
   * Validate array of dependencies
   */
  static validateDependencies(dependencies: string[]): ValidationResult {
    if (!Array.isArray(dependencies)) {
      return {
        isValid: false,
        error: TodoManagerError.invalidFieldValue('dependencies', dependencies, 'array of strings'),
      };
    }

    for (const dep of dependencies) {
      const result = this.validateTaskId(dep);
      if (!result.isValid) {
        return {
          isValid: false,
          error: new TodoManagerError(
            `Invalid dependency task ID: ${dep}`,
            'INVALID_DEPENDENCY_ID',
            {
              field: 'dependencies',
              value: dep,
              suggestions: [
                {
                  action: 'Check the dependency task ID',
                  description: 'Ensure the dependency task exists and has a valid ID',
                },
                {
                  action: 'Use find_task to locate the correct ID',
                  description: 'Search for the task to get its correct ID',
                },
              ],
            }
          ),
        };
      }
    }

    return { isValid: true };
  }

  /**
   * Validate email format for assignee
   */
  static validateAssignee(assignee: string): ValidationResult {
    if (!assignee) {
      return { isValid: true }; // Optional field
    }

    // Simple email validation or username validation
    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const usernamePattern = /^[a-zA-Z0-9_.-]{2,50}$/;

    if (!emailPattern.test(assignee) && !usernamePattern.test(assignee)) {
      return {
        isValid: false,
        error: new TodoManagerError(
          `Invalid assignee format: '${assignee}'. Expected email address or username.`,
          'INVALID_ASSIGNEE_FORMAT',
          {
            field: 'assignee',
            value: assignee,
            suggestions: [
              {
                action: 'Use email format',
                description: 'Example: user@example.com',
                example: 'user@example.com',
              },
              {
                action: 'Use username format',
                description: 'Example: john_doe or john.doe',
                example: 'john_doe',
              },
            ],
          }
        ),
      };
    }

    return { isValid: true };
  }

  /**
   * Comprehensive validation for task creation
   */
  static validateCreateTask(taskData: any): ValidationResult {
    // Validate required fields
    const titleResult = this.validateTitle(taskData.title);
    if (!titleResult.isValid) return titleResult;

    // Validate optional fields if provided
    if (taskData.priority) {
      const priorityResult = this.validatePriority(taskData.priority);
      if (!priorityResult.isValid) return priorityResult;
    }

    if (taskData.dueDate) {
      const dateResult = this.validateDate(taskData.dueDate, 'dueDate');
      if (!dateResult.isValid) return dateResult;
    }

    if (taskData.assignee) {
      const assigneeResult = this.validateAssignee(taskData.assignee);
      if (!assigneeResult.isValid) return assigneeResult;
    }

    if (taskData.tags) {
      const tagsResult = this.validateTags(taskData.tags);
      if (!tagsResult.isValid) return tagsResult;
    }

    if (taskData.dependencies) {
      const depsResult = this.validateDependencies(taskData.dependencies);
      if (!depsResult.isValid) return depsResult;
    }

    return { isValid: true };
  }

  /**
   * Comprehensive validation for task updates
   */
  static validateUpdateTask(updates: any): ValidationResult {
    // Validate each field that's being updated
    if (updates.title !== undefined) {
      const titleResult = this.validateTitle(updates.title);
      if (!titleResult.isValid) return titleResult;
    }

    if (updates.status !== undefined) {
      const statusResult = this.validateStatus(updates.status);
      if (!statusResult.isValid) return statusResult;
    }

    if (updates.priority !== undefined) {
      const priorityResult = this.validatePriority(updates.priority);
      if (!priorityResult.isValid) return priorityResult;
    }

    if (updates.dueDate !== undefined) {
      const dateResult = this.validateDate(updates.dueDate, 'dueDate');
      if (!dateResult.isValid) return dateResult;
    }

    if (updates.assignee !== undefined) {
      const assigneeResult = this.validateAssignee(updates.assignee);
      if (!assigneeResult.isValid) return assigneeResult;
    }

    if (updates.progressPercentage !== undefined) {
      const progressResult = this.validateProgressPercentage(updates.progressPercentage);
      if (!progressResult.isValid) return progressResult;
    }

    if (updates.tags !== undefined) {
      const tagsResult = this.validateTags(updates.tags);
      if (!tagsResult.isValid) return tagsResult;
    }

    return { isValid: true };
  }
}
