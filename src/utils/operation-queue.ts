/**
 * Operation Queue for TodoJsonManager
 *
 * Provides concurrency control and operation queuing to prevent race conditions
 * and ensure data consistency during rapid successive operations.
 * Enhanced with p-queue for improved reliability and performance.
 */

import PQueue from 'p-queue';
import pTimeout from 'p-timeout';
import { OperationQueueError, DiagnosticContext } from '../types/enhanced-errors.js';
import { createComponentLogger, ComponentLogger } from './enhanced-logging.js';

export interface QueuedOperation {
  id: string;
  operation: () => Promise<any>;
  priority: number; // Higher numbers = higher priority
  timestamp: number;
  timeout?: number;
  resolve: (value: any) => void;
  reject: (error: Error) => void;
}

export interface OperationResult {
  success: boolean;
  result?: any;
  error?: Error;
  executionTime: number;
}

export class OperationQueue {
  private pqueue: PQueue;
  private operationTimeout: number = 30000; // 30 seconds default timeout
  private maxQueueSize: number = 1000; // Increased default queue size
  private shutdownRequested: boolean = false;
  private resourceCleanupCallbacks: Set<() => void> = new Set(); // Track cleanup callbacks
  private logger: ComponentLogger;

  constructor(
    options: {
      maxConcurrency?: number;
      operationTimeout?: number;
      maxQueueSize?: number;
    } = {}
  ) {
    this.operationTimeout = options.operationTimeout || 30000;
    this.maxQueueSize = options.maxQueueSize || 1000; // Increased default
    this.shutdownRequested = false;
    this.logger = createComponentLogger('OperationQueue');

    // Initialize p-queue with enhanced options
    this.pqueue = new PQueue({
      concurrency: options.maxConcurrency || 1,
      timeout: this.operationTimeout,
      throwOnTimeout: true,
      // Removed intervalCap to avoid queue throttling issues
      carryoverConcurrencyCount: true,
    });

    this.logger.info('Operation queue initialized with p-queue', {
      maxConcurrency: this.pqueue.concurrency,
      operationTimeout: this.operationTimeout,
      maxQueueSize: this.maxQueueSize,
    });
  }

  /**
   * Add operation to queue with priority
   *
   * @param operation - Async function to execute
   * @param priority - Operation priority (higher numbers execute first)
   * @param timeout - Optional timeout override for this operation
   *
   * @returns Promise resolving to the operation result
   *
   * @throws Error when queue is full or operation times out
   *
   * @example
   * ```typescript
   * const queue = new OperationQueue({ maxConcurrency: 1 });
   *
   * const result = await queue.enqueue(
   *   async () => await someAsyncOperation(),
   *   5, // High priority
   *   10000 // 10 second timeout
   * );
   * ```
   */
  async enqueue<T>(
    operation: () => Promise<T>,
    priority: number = 0,
    timeout?: number
  ): Promise<T> {
    const operationId = this.generateOperationId();
    const diagnostics: DiagnosticContext = {
      component: 'OperationQueue',
      operation: 'enqueue',
      timestamp: new Date(),
      context: {
        operationId,
        priority,
        timeout,
        queueSize: this.pqueue.size,
        pendingOperations: this.pqueue.pending,
      },
      performanceMetrics: {
        queueSize: this.pqueue.size,
        activeOperations: this.pqueue.pending,
      },
    };

    if (this.shutdownRequested) {
      const error = OperationQueueError.shutdownInProgress(diagnostics);
      this.logger.logEnhancedError(error);
      throw error;
    }

    // Check if queue is full, but allow some buffer for high-priority operations
    const effectiveMaxSize = this.maxQueueSize + (priority > 5 ? 50 : 0);
    if (this.pqueue.size >= effectiveMaxSize) {
      const error = OperationQueueError.queueOverflow(
        this.pqueue.size,
        this.maxQueueSize,
        diagnostics
      );
      this.logger.logEnhancedError(error);
      throw error;
    }

    const startTime = Date.now();
    const logOperationId = this.logger.logOperationStart('enqueue_operation', {
      operationId,
      priority,
      timeout: timeout || this.operationTimeout,
    });

    try {
      // Use p-queue with priority and timeout (invert priority since p-queue uses lower = higher)
      const result = (await this.pqueue.add(
        async () => {
          const operationStartTime = Date.now();
          const execLogId = this.logger.logOperationStart('execute_operation', {
            operationId,
            priority,
          });

          try {
            // Apply timeout using p-timeout if specified
            const timeoutMs = timeout || this.operationTimeout;
            const result = await pTimeout(operation(), {
              milliseconds: timeoutMs,
              message: `Operation ${operationId} timed out after ${timeoutMs}ms`,
            });

            const duration = Date.now() - operationStartTime;
            this.logger.logOperationComplete(execLogId, 'execute_operation', duration, {
              operationId,
              success: true,
            });

            return result;
          } catch (error) {
            const duration = Date.now() - operationStartTime;
            this.logger.logOperationFailure(
              execLogId,
              'execute_operation',
              error as Error,
              duration,
              {
                operationId,
                priority,
              }
            );
            throw error;
          }
        },
        { priority: -priority } // Invert priority: higher input numbers become lower p-queue numbers (higher priority)
      )) as T;

      const duration = Date.now() - startTime;
      this.logger.logOperationComplete(logOperationId, 'enqueue_operation', duration, {
        operationId,
        success: true,
      });

      return result;
    } catch (error) {
      const duration = Date.now() - startTime;
      this.logger.logOperationFailure(
        logOperationId,
        'enqueue_operation',
        error as Error,
        duration,
        {
          operationId,
          priority,
        }
      );

      // Convert p-queue timeout errors to our enhanced errors
      if (error instanceof Error && error.message.includes('timed out')) {
        const timeoutError = OperationQueueError.operationTimeout(
          operationId,
          timeout || this.operationTimeout,
          diagnostics
        );
        this.logger.logEnhancedError(timeoutError);
        throw timeoutError;
      }

      throw error;
    }
  }

  /**
   * Get queue status with enhanced monitoring
   */
  getStatus(): {
    queueLength: number;
    activeOperations: number;
    processing: boolean;
    semaphoreCount: number;
    maxConcurrency: number;
  } {
    return {
      queueLength: this.pqueue.size,
      activeOperations: this.pqueue.pending,
      processing: this.pqueue.pending > 0,
      semaphoreCount: this.pqueue.pending,
      maxConcurrency: this.pqueue.concurrency,
    };
  }

  /**
   * Clear all pending operations with proper cleanup
   */
  clear(): void {
    // Clear the p-queue
    this.pqueue.clear();

    // Execute cleanup callbacks
    for (const cleanup of this.resourceCleanupCallbacks) {
      try {
        cleanup();
      } catch (error) {
        this.logger.warn('Cleanup callback failed during clear:', {
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }
    this.resourceCleanupCallbacks.clear();

    this.logger.info('Operation queue cleared');
  }

  /**
   * Wait for all operations to complete with timeout protection
   */
  async drain(timeoutMs: number = 30000): Promise<void> {
    try {
      await pTimeout(this.pqueue.onIdle(), {
        milliseconds: timeoutMs,
        message: `Drain operation timed out after ${timeoutMs}ms`,
      });
    } catch (error) {
      if (error instanceof Error && error.message.includes('timed out')) {
        this.logger.warn(`Queue drain timed out after ${timeoutMs}ms`, {
          queueSize: this.pqueue.size,
          pendingOperations: this.pqueue.pending,
        });
      }
      throw error;
    }
  }

  /**
   * Gracefully shutdown the queue with resource tracking
   */
  async shutdown(timeoutMs: number = 10000): Promise<void> {
    this.shutdownRequested = true;

    // Clear pending operations
    this.pqueue.clear();

    // Execute all cleanup callbacks
    for (const cleanup of this.resourceCleanupCallbacks) {
      try {
        cleanup();
      } catch (error) {
        this.logger.warn('Cleanup callback failed during shutdown:', {
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }
    this.resourceCleanupCallbacks.clear();

    // Wait for active operations to complete with timeout
    try {
      await this.drain(timeoutMs);
    } catch (error) {
      this.logger.warn(`Shutdown timeout after ${timeoutMs}ms, forcing cleanup`);
      throw error;
    }

    this.logger.info('Operation queue shutdown completed');
  }

  /**
   * Set concurrency level
   */
  setConcurrency(maxConcurrency: number): void {
    this.pqueue.concurrency = Math.max(1, maxConcurrency);
    this.logger.info('Concurrency level updated', {
      newMaxConcurrency: this.pqueue.concurrency,
      currentPendingOperations: this.pqueue.pending,
      queueSize: this.pqueue.size,
    });
  }

  /**
   * Generate unique operation ID
   */
  private generateOperationId(): string {
    return `op_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
  }

  /**
   * Get queue statistics for monitoring
   */
  getStatistics(): {
    queueSize: number;
    activeOperations: number;
    maxConcurrency: number;
    semaphoreCount: number;
    processing: boolean;
    shutdownRequested: boolean;
  } {
    return {
      queueSize: this.pqueue.size,
      activeOperations: this.pqueue.pending,
      maxConcurrency: this.pqueue.concurrency,
      semaphoreCount: this.pqueue.pending,
      processing: this.pqueue.pending > 0,
      shutdownRequested: this.shutdownRequested,
    };
  }

  /**
   * Validate queue state for debugging
   */
  validateState(): { isValid: boolean; issues: string[] } {
    const issues: string[] = [];

    if (this.pqueue.pending < 0) {
      issues.push(`Negative pending count: ${this.pqueue.pending}`);
    }

    if (this.pqueue.pending > this.pqueue.concurrency && this.pqueue.concurrency > 1) {
      issues.push(
        `Pending exceeds concurrency: ${this.pqueue.pending} > ${this.pqueue.concurrency}`
      );
    }

    if (this.pqueue.size > this.maxQueueSize) {
      issues.push(`Queue size exceeds limit: ${this.pqueue.size} > ${this.maxQueueSize}`);
    }

    return {
      isValid: issues.length === 0,
      issues,
    };
  }
}
