/**
 * Enhanced error types for better user experience
 *
 * Provides structured error handling with actionable suggestions
 * and contextual information to help users resolve issues.
 */

/**
 * Base interface for diagnostic context information
 */
export interface DiagnosticContext {
  /** Component or module where the error occurred */
  component: string;
  /** Operation being performed when error occurred */
  operation: string;
  /** Timestamp when error occurred */
  timestamp: Date;
  /** Additional context data */
  context?: Record<string, any>;
  /** Stack trace or call path */
  stackTrace?: string;
  /** Performance metrics at time of error */
  performanceMetrics?: {
    memoryUsage?: number;
    cpuUsage?: number;
    queueSize?: number;
    activeOperations?: number;
  };
}

/**
 * Enhanced base error class with comprehensive diagnostic information
 */
export abstract class EnhancedError extends Error {
  public readonly code: string;
  public readonly severity: 'critical' | 'high' | 'medium' | 'low';
  public readonly suggestions: ErrorSuggestion[];
  public readonly diagnostics: DiagnosticContext;
  public readonly recoverable: boolean;
  public readonly retryable: boolean;

  constructor(
    message: string,
    code: string,
    options: {
      severity?: 'critical' | 'high' | 'medium' | 'low';
      suggestions?: ErrorSuggestion[];
      diagnostics: DiagnosticContext;
      recoverable?: boolean;
      retryable?: boolean;
      cause?: Error;
    }
  ) {
    super(message, { cause: options.cause });
    this.name = this.constructor.name;
    this.code = code;
    this.severity = options.severity || 'medium';
    this.suggestions = options.suggestions || [];
    this.diagnostics = options.diagnostics;
    this.recoverable = options.recoverable ?? true;
    this.retryable = options.retryable ?? false;
  }

  /**
   * Get formatted error message with diagnostic information
   */
  getDetailedMessage(): string {
    const lines = [
      `${this.name}: ${this.message}`,
      `Code: ${this.code}`,
      `Severity: ${this.severity}`,
      `Component: ${this.diagnostics.component}`,
      `Operation: ${this.diagnostics.operation}`,
      `Timestamp: ${this.diagnostics.timestamp.toISOString()}`,
    ];

    if (this.diagnostics.context && Object.keys(this.diagnostics.context).length > 0) {
      lines.push(`Context: ${JSON.stringify(this.diagnostics.context, null, 2)}`);
    }

    if (this.diagnostics.performanceMetrics) {
      lines.push(`Performance: ${JSON.stringify(this.diagnostics.performanceMetrics, null, 2)}`);
    }

    if (this.suggestions.length > 0) {
      lines.push('Suggestions:');
      this.suggestions.forEach(s => {
        lines.push(`  - ${s.action}: ${s.description}`);
        if (s.example) {
          lines.push(`    Example: ${s.example}`);
        }
      });
    }

    return lines.join('\n');
  }

  /**
   * Convert error to structured object for logging
   */
  toLogObject(): Record<string, any> {
    return {
      name: this.name,
      message: this.message,
      code: this.code,
      severity: this.severity,
      recoverable: this.recoverable,
      retryable: this.retryable,
      diagnostics: this.diagnostics,
      suggestions: this.suggestions,
      stack: this.stack,
      cause: this.cause
        ? {
            name: (this.cause as Error).name,
            message: (this.cause as Error).message,
            stack: (this.cause as Error).stack,
          }
        : undefined,
    };
  }
}

/**
 * Operation Queue specific errors
 */
export class OperationQueueError extends EnhancedError {
  constructor(
    message: string,
    code: string,
    diagnostics: DiagnosticContext,
    options: {
      severity?: 'critical' | 'high' | 'medium' | 'low';
      suggestions?: ErrorSuggestion[];
      recoverable?: boolean;
      retryable?: boolean;
      cause?: Error;
    } = {}
  ) {
    super(message, code, {
      ...options,
      diagnostics: {
        ...diagnostics,
        component: diagnostics.component || 'OperationQueue',
      },
    });
  }

  static queueOverflow(
    queueSize: number,
    maxSize: number,
    diagnostics: DiagnosticContext
  ): OperationQueueError {
    return new OperationQueueError(
      `Operation queue overflow: ${queueSize}/${maxSize} operations`,
      'QUEUE_OVERFLOW',
      diagnostics,
      {
        severity: 'high',
        retryable: true,
        suggestions: [
          {
            action: 'Reduce operation frequency',
            description: 'Slow down the rate of operations being queued',
          },
          {
            action: 'Increase queue size',
            description: `Consider increasing maxQueueSize from ${maxSize} to handle peak loads`,
          },
          {
            action: 'Enable backpressure',
            description: 'Use backpressure handling to automatically throttle operations',
          },
          {
            action: 'Check for stuck operations',
            description: 'Verify that operations are completing and not hanging indefinitely',
          },
        ],
      }
    );
  }

  static operationTimeout(
    operationId: string,
    timeoutMs: number,
    diagnostics: DiagnosticContext
  ): OperationQueueError {
    return new OperationQueueError(
      `Operation ${operationId} timed out after ${timeoutMs}ms`,
      'OPERATION_TIMEOUT',
      diagnostics,
      {
        severity: 'medium',
        retryable: true,
        suggestions: [
          {
            action: 'Increase timeout value',
            description: `Consider increasing timeout from ${timeoutMs}ms for complex operations`,
          },
          {
            action: 'Break down large operations',
            description: 'Split complex operations into smaller, faster chunks',
          },
          {
            action: 'Check system resources',
            description: 'Verify system has adequate CPU and memory for the operation',
          },
          {
            action: 'Review operation complexity',
            description: 'Analyze if the operation can be optimized for better performance',
          },
        ],
      }
    );
  }

  static concurrencyViolation(
    activeCount: number,
    maxConcurrency: number,
    diagnostics: DiagnosticContext
  ): OperationQueueError {
    return new OperationQueueError(
      `Concurrency limit exceeded: ${activeCount}/${maxConcurrency} active operations`,
      'CONCURRENCY_VIOLATION',
      diagnostics,
      {
        severity: 'high',
        recoverable: false,
        suggestions: [
          {
            action: 'Check semaphore implementation',
            description: 'Verify that concurrency control is working correctly',
          },
          {
            action: 'Review operation lifecycle',
            description: 'Ensure operations are properly cleaned up when completed',
          },
          {
            action: 'Increase concurrency limit',
            description: `Consider increasing maxConcurrency from ${maxConcurrency} if system can handle it`,
          },
        ],
      }
    );
  }

  static shutdownInProgress(diagnostics: DiagnosticContext): OperationQueueError {
    return new OperationQueueError(
      'Cannot queue operation: shutdown in progress',
      'SHUTDOWN_IN_PROGRESS',
      diagnostics,
      {
        severity: 'medium',
        recoverable: false,
        retryable: false,
        suggestions: [
          {
            action: 'Wait for shutdown to complete',
            description: 'Allow the current shutdown process to finish',
          },
          {
            action: 'Create new queue instance',
            description: 'Initialize a new operation queue after shutdown completes',
          },
        ],
      }
    );
  }
}

/**
 * Performance Optimizer specific errors
 */
export class PerformanceOptimizerError extends EnhancedError {
  constructor(
    message: string,
    code: string,
    diagnostics: DiagnosticContext,
    options: {
      severity?: 'critical' | 'high' | 'medium' | 'low';
      suggestions?: ErrorSuggestion[];
      recoverable?: boolean;
      retryable?: boolean;
      cause?: Error;
    } = {}
  ) {
    super(message, code, {
      ...options,
      diagnostics: {
        ...diagnostics,
        component: diagnostics.component || 'PerformanceOptimizer',
      },
    });
  }

  static cacheCorruption(
    cacheKey: string,
    diagnostics: DiagnosticContext
  ): PerformanceOptimizerError {
    return new PerformanceOptimizerError(
      `Cache corruption detected for key: ${cacheKey}`,
      'CACHE_CORRUPTION',
      diagnostics,
      {
        severity: 'high',
        recoverable: true,
        suggestions: [
          {
            action: 'Clear corrupted cache',
            description: 'Remove the corrupted cache entry and regenerate',
          },
          {
            action: 'Validate cache integrity',
            description: 'Run cache validation to check for other corrupted entries',
          },
          {
            action: 'Review cache size limits',
            description: 'Ensure cache is not exceeding memory limits causing corruption',
          },
        ],
      }
    );
  }

  static dateContextInvalid(
    dateContext: any,
    diagnostics: DiagnosticContext
  ): PerformanceOptimizerError {
    return new PerformanceOptimizerError(
      `Invalid date context provided: ${JSON.stringify(dateContext)}`,
      'INVALID_DATE_CONTEXT',
      diagnostics,
      {
        severity: 'medium',
        recoverable: true,
        suggestions: [
          {
            action: 'Provide valid date context',
            description: 'Ensure dateContext has a valid currentDate property',
            example: '{ currentDate: new Date(), timezone: "UTC" }',
          },
          {
            action: 'Use default date context',
            description: 'Allow the system to use current date if no context provided',
          },
          {
            action: 'Check date format',
            description: 'Verify the date is a valid Date object or ISO string',
          },
        ],
      }
    );
  }

  static batchProcessingFailure(
    batchSize: number,
    failedCount: number,
    diagnostics: DiagnosticContext
  ): PerformanceOptimizerError {
    return new PerformanceOptimizerError(
      `Batch processing failed: ${failedCount}/${batchSize} operations failed`,
      'BATCH_PROCESSING_FAILURE',
      diagnostics,
      {
        severity: 'medium',
        retryable: true,
        suggestions: [
          {
            action: 'Reduce batch size',
            description: `Consider reducing batch size from ${batchSize} to handle failures better`,
          },
          {
            action: 'Retry failed operations individually',
            description: 'Process failed items one by one to identify specific issues',
          },
          {
            action: 'Check system resources',
            description: 'Verify adequate memory and CPU for batch processing',
          },
        ],
      }
    );
  }

  static memoryPressure(
    currentUsage: number,
    threshold: number,
    diagnostics: DiagnosticContext
  ): PerformanceOptimizerError {
    return new PerformanceOptimizerError(
      `Memory pressure detected: ${currentUsage}MB exceeds threshold of ${threshold}MB`,
      'MEMORY_PRESSURE',
      diagnostics,
      {
        severity: 'high',
        recoverable: true,
        suggestions: [
          {
            action: 'Clear caches',
            description: 'Free up memory by clearing non-essential caches',
          },
          {
            action: 'Reduce batch sizes',
            description: 'Process smaller batches to reduce memory usage',
          },
          {
            action: 'Enable garbage collection',
            description: 'Force garbage collection to free unused memory',
          },
          {
            action: 'Increase memory limits',
            description: 'Consider increasing available memory for the process',
          },
        ],
      }
    );
  }

  static queueOverflow(
    queueSize: number,
    maxSize: number,
    diagnostics: DiagnosticContext
  ): PerformanceOptimizerError {
    return new PerformanceOptimizerError(
      `Performance optimizer queue overflow: ${queueSize}/${maxSize} operations`,
      'QUEUE_OVERFLOW',
      diagnostics,
      {
        severity: 'high',
        retryable: true,
        suggestions: [
          {
            action: 'Reduce operation frequency',
            description: 'Slow down the rate of operations being queued',
          },
          {
            action: 'Increase queue size',
            description: `Consider increasing maxQueueSize from ${maxSize} to handle peak loads`,
          },
          {
            action: 'Enable backpressure',
            description: 'Use backpressure handling to automatically throttle operations',
          },
          {
            action: 'Optimize operations',
            description: 'Review operations for efficiency improvements to reduce queue pressure',
          },
        ],
      }
    );
  }
}

/**
 * Data Consistency Checker specific errors
 */
export class DataConsistencyError extends EnhancedError {
  constructor(
    message: string,
    code: string,
    diagnostics: DiagnosticContext,
    options: {
      severity?: 'critical' | 'high' | 'medium' | 'low';
      suggestions?: ErrorSuggestion[];
      recoverable?: boolean;
      retryable?: boolean;
      cause?: Error;
    } = {}
  ) {
    super(message, code, {
      ...options,
      diagnostics: {
        ...diagnostics,
        component: diagnostics.component || 'DataConsistencyChecker',
      },
    });
  }

  static validationFailure(
    validationType: string,
    affectedItems: string[],
    diagnostics: DiagnosticContext
  ): DataConsistencyError {
    return new DataConsistencyError(
      `Data validation failed for ${validationType}: ${affectedItems.length} items affected`,
      'VALIDATION_FAILURE',
      diagnostics,
      {
        severity: 'high',
        recoverable: true,
        suggestions: [
          {
            action: 'Review affected items',
            description: `Check the ${affectedItems.length} items that failed validation`,
          },
          {
            action: 'Run auto-fix if available',
            description: 'Use auto-fix functionality to correct common issues',
          },
          {
            action: 'Manual data correction',
            description: 'Manually review and correct the data inconsistencies',
          },
          {
            action: 'Restore from backup',
            description: 'Consider restoring from a known good backup if corruption is extensive',
          },
        ],
      }
    );
  }

  static metadataSyncFailure(
    taskCount: number,
    metadataCount: number,
    diagnostics: DiagnosticContext
  ): DataConsistencyError {
    return new DataConsistencyError(
      `Metadata sync failure: ${taskCount} tasks vs ${metadataCount} metadata entries`,
      'METADATA_SYNC_FAILURE',
      diagnostics,
      {
        severity: 'medium',
        recoverable: true,
        suggestions: [
          {
            action: 'Regenerate metadata',
            description: 'Rebuild metadata from current task data',
          },
          {
            action: 'Remove orphaned metadata',
            description: 'Clean up metadata entries without corresponding tasks',
          },
          {
            action: 'Create missing metadata',
            description: 'Generate metadata for tasks that are missing it',
          },
        ],
      }
    );
  }

  static dateValidationFailure(
    invalidDates: string[],
    diagnostics: DiagnosticContext
  ): DataConsistencyError {
    return new DataConsistencyError(
      `Date validation failed: ${invalidDates.length} invalid dates found`,
      'DATE_VALIDATION_FAILURE',
      diagnostics,
      {
        severity: 'medium',
        recoverable: true,
        suggestions: [
          {
            action: 'Fix date formats',
            description: 'Convert invalid dates to ISO 8601 format (YYYY-MM-DDTHH:mm:ss.sssZ)',
            example: '2024-01-15T10:30:00.000Z',
          },
          {
            action: 'Remove invalid dates',
            description: 'Clear invalid date fields and let system set defaults',
          },
          {
            action: 'Use date parsing utilities',
            description: 'Implement robust date parsing to handle various formats',
          },
        ],
      }
    );
  }

  static circularDependencyDetected(
    cycle: string[],
    diagnostics: DiagnosticContext
  ): DataConsistencyError {
    return new DataConsistencyError(
      `Circular dependency detected: ${cycle.join(' → ')}`,
      'CIRCULAR_DEPENDENCY',
      diagnostics,
      {
        severity: 'high',
        recoverable: true,
        suggestions: [
          {
            action: 'Break dependency cycle',
            description: `Remove one dependency from the cycle: ${cycle.join(' → ')}`,
          },
          {
            action: 'Restructure task relationships',
            description: 'Consider using task hierarchy instead of dependencies',
          },
          {
            action: 'Review task design',
            description: 'Break down complex tasks to eliminate circular dependencies',
          },
        ],
      }
    );
  }
}

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
            description: 'Ensure the path points to a valid directory',
          },
          {
            action: 'Create the directory',
            description: `Run: mkdir -p "${path}"`,
          },
          {
            action: 'Run from the project root',
            description: 'Make sure you are in the correct project directory',
          },
        ],
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
    return new TodoManagerError(`Task '${taskId}' not found`, 'TASK_NOT_FOUND', {
      taskId,
      suggestions: [
        {
          action: 'The task may have been deleted',
          description: 'Check if the task was recently removed',
        },
        {
          action: 'Use get_tasks to list all tasks',
          description: 'Verify the task ID exists in the current list',
        },
        {
          action: 'Search for the task using find_task',
          description: 'The task might have a different ID than expected',
        },
      ],
    });
  }

  /**
   * Create an invalid task ID error with format guidance
   *
   * @param taskId - The invalid task ID that was provided
   * @returns TodoManagerError with suggestions for correct ID format
   */
  static invalidTaskId(taskId: string): TodoManagerError {
    return new TodoManagerError(`Invalid task ID format: '${taskId}'`, 'INVALID_TASK_ID', {
      value: taskId,
      suggestions: [
        {
          action: 'Use find_task to search for tasks',
          description: 'Search by title or description instead',
        },
        {
          action: 'Use get_tasks with showFullIds: true',
          description: 'Get the complete UUID for the task',
        },
        {
          action: 'Check the task ID format',
          description: 'Task IDs should be UUIDs or partial UUIDs (8+ characters)',
        },
      ],
    });
  }

  static invalidPriority(value: string, suggestedValue?: string): TodoManagerError {
    const suggestionText = suggestedValue
      ? `Did you mean "${suggestedValue}"?`
      : 'Use one of the valid priority values';
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
            description: suggestedValue
              ? `Replace '${value}' with '${suggestedValue}'`
              : 'Choose from: low, medium, high, critical',
          },
        ],
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
            description: 'Tasks that depend on this one must be handled first',
          },
          {
            action: 'Use archiveTask instead of deleteTask',
            description: 'Archiving preserves the task for reference while marking it inactive',
          },
          {
            action: 'Remove dependencies from dependent tasks',
            description: 'Update dependent tasks to remove this dependency',
          },
        ],
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
    return new TodoManagerError(`Circular dependency detected: ${chain}`, 'CIRCULAR_DEPENDENCY', {
      value: taskIds,
      suggestions: [
        {
          action: 'Remove one of the dependencies in the chain',
          description: `Break the cycle by removing a dependency from: ${chain}`,
        },
        {
          action: 'Restructure task relationships',
          description: 'Consider breaking down tasks into smaller, independent units',
        },
        {
          action: 'Use task hierarchy instead of dependencies',
          description: 'Consider using parent-child relationships instead of dependencies',
        },
      ],
    });
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
            example: '2024-01-15T10:30:00Z',
          },
          {
            action: 'Use relative dates',
            description: 'Examples: "today", "tomorrow", "+1 week", "+2 days"',
          },
          {
            action: 'Check date validity',
            description: 'Ensure the date exists (e.g., February 30th is invalid)',
          },
        ],
      }
    );
  }

  static invalidStatus(value: string, suggestedValue?: string): TodoManagerError {
    const suggestionText = suggestedValue
      ? `Did you mean "${suggestedValue}"?`
      : 'Use one of the valid status values';
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
            description: suggestedValue
              ? `Replace '${value}' with '${suggestedValue}'`
              : 'Choose from: pending, in_progress, completed, blocked, cancelled',
          },
        ],
      }
    );
  }

  static requiredFieldMissing(field: string): TodoManagerError {
    return new TodoManagerError(`Required field '${field}' is missing`, 'REQUIRED_FIELD_MISSING', {
      field,
      suggestions: [
        {
          action: `Provide the '${field}' field`,
          description: `The '${field}' field is required for this operation`,
        },
      ],
    });
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
            description: expectedType
              ? `Expected type: ${expectedType}`
              : 'Verify the field value is correct',
          },
        ],
      }
    );
  }

  static taskAlreadyExists(taskId: string): TodoManagerError {
    return new TodoManagerError(`Task with ID '${taskId}' already exists`, 'TASK_ALREADY_EXISTS', {
      taskId,
      suggestions: [
        {
          action: 'Use update_task instead',
          description: 'If you want to modify an existing task, use the update operation',
        },
        {
          action: 'Generate a new task ID',
          description: 'Create a new task with a unique ID',
        },
        {
          action: 'Check if this is a duplicate',
          description: 'Verify you are not accidentally creating the same task twice',
        },
      ],
    });
  }

  static bulkOperationPartialFailure(
    successful: number,
    failed: number,
    errors: string[]
  ): TodoManagerError {
    return new TodoManagerError(
      `Bulk operation completed with ${successful} successes and ${failed} failures`,
      'BULK_OPERATION_PARTIAL_FAILURE',
      {
        value: { successful, failed, errors },
        suggestions: [
          {
            action: 'Review failed operations',
            description: 'Check the error details for each failed operation',
          },
          {
            action: 'Retry failed operations individually',
            description: 'Process failed items one by one to identify specific issues',
          },
          {
            action: 'Use dry-run mode first',
            description: 'Test bulk operations with dry-run to identify issues beforehand',
          },
        ],
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
            description: 'Use get_operations or check documentation for supported operations',
          },
          {
            action: 'Check operation spelling',
            description: 'Verify the operation name is spelled correctly',
          },
        ],
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
            description: 'The task may have been updated by another process',
          },
          {
            action: 'Refresh task data',
            description: 'Get the latest task data before making changes',
          },
          {
            action: 'Use force update if necessary',
            description: 'Override the conflict if you are sure about the changes',
          },
        ],
      }
    );
  }

  static dataCorruption(details: string): TodoManagerError {
    return new TodoManagerError(`Data corruption detected: ${details}`, 'DATA_CORRUPTION', {
      value: details,
      suggestions: [
        {
          action: 'Restore from backup',
          description: 'Use the most recent backup to restore data integrity',
        },
        {
          action: 'Run data validation',
          description: 'Check for and repair data inconsistencies',
        },
        {
          action: 'Contact support',
          description: 'If the issue persists, seek technical assistance',
        },
      ],
    });
  }

  static undoNotAvailable(reason: string): TodoManagerError {
    return new TodoManagerError(`Undo operation not available: ${reason}`, 'UNDO_NOT_AVAILABLE', {
      value: reason,
      suggestions: [
        {
          action: 'Check operation history',
          description: 'Use get_undo_history to see available undo operations',
        },
        {
          action: 'Manual recovery',
          description: 'You may need to manually recreate or restore the desired state',
        },
      ],
    });
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
            description: 'Try using simpler search terms',
          },
          {
            action: 'Check regex syntax',
            description: 'If using regex search, verify the pattern syntax',
          },
          {
            action: 'Use fuzzy search instead',
            description: 'Fuzzy search is more forgiving of typos and variations',
          },
        ],
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
            description: 'Provide more characters to uniquely identify the task',
          },
          {
            action: 'Use the full task ID',
            description: 'Copy the complete UUID from the task list',
          },
          {
            action: 'Use find_task to search by title',
            description: 'Search by task title or description instead of ID',
          },
        ],
      }
    );
  }
}
