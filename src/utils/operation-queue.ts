/**
 * Operation Queue for TodoJsonManager
 *
 * Provides concurrency control and operation queuing to prevent race conditions
 * and ensure data consistency during rapid successive operations.
 */

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
  private queue: QueuedOperation[] = [];
  private processing: boolean = false;
  private maxConcurrency: number = 1; // Sequential processing by default
  private activeOperations: Set<string> = new Set();
  private operationTimeout: number = 30000; // 30 seconds default timeout
  private maxQueueSize: number = 100;
  private shutdownRequested: boolean = false;

  constructor(
    options: {
      maxConcurrency?: number;
      operationTimeout?: number;
      maxQueueSize?: number;
    } = {}
  ) {
    this.maxConcurrency = options.maxConcurrency || 1;
    this.operationTimeout = options.operationTimeout || 30000;
    this.maxQueueSize = options.maxQueueSize || 100;
    this.shutdownRequested = false;
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
    if (this.shutdownRequested) {
      throw new Error('Operation queue is shutting down');
    }

    if (this.queue.length >= this.maxQueueSize) {
      throw new Error(`Operation queue is full (${this.maxQueueSize} operations)`);
    }

    const operationId = `op_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    return new Promise<T>((resolve, reject) => {
      let isResolved = false;
      let timeoutId: NodeJS.Timeout | null = null;

      const queuedOp: QueuedOperation = {
        id: operationId,
        operation,
        priority,
        timestamp: Date.now(),
        timeout: timeout || this.operationTimeout,
        resolve: (result: T) => {
          if (!isResolved) {
            isResolved = true;
            if (timeoutId) {
              clearTimeout(timeoutId);
              timeoutId = null;
            }
            resolve(result);
          }
        },
        reject: (error: Error) => {
          if (!isResolved) {
            isResolved = true;
            if (timeoutId) {
              clearTimeout(timeoutId);
              timeoutId = null;
            }
            reject(error);
          }
        },
      };

      // Set up timeout for this specific operation
      timeoutId = setTimeout(() => {
        if (!isResolved) {
          isResolved = true;
          this.removeFromQueue(operationId);
          reject(new Error(`Operation ${operationId} timed out after ${queuedOp.timeout}ms`));
        }
      }, queuedOp.timeout);

      this.queue.push(queuedOp);
      this.sortQueue();

      // Start processing if not already running
      if (!this.processing) {
        setImmediate(() => this.processQueue());
      }
    });
  }

  /**
   * Process operations in the queue
   */
  private async processQueue(): Promise<void> {
    if (this.processing || this.shutdownRequested) return;

    this.processing = true;

    try {
      // For sequential processing (maxConcurrency = 1), process one at a time
      if (this.maxConcurrency === 1) {
        while (this.queue.length > 0 && !this.shutdownRequested) {
          const operation = this.queue.shift();
          if (!operation) continue;

          this.activeOperations.add(operation.id);

          try {
            const result = await operation.operation();
            operation.resolve(result);
          } catch (error) {
            operation.reject(error as Error);
          } finally {
            this.activeOperations.delete(operation.id);
          }
        }
      } else {
        // For concurrent processing, start operations up to the concurrency limit
        while (
          this.queue.length > 0 &&
          this.activeOperations.size < this.maxConcurrency &&
          !this.shutdownRequested
        ) {
          const operation = this.queue.shift();
          if (!operation) continue;

          this.activeOperations.add(operation.id);

          // Execute operation concurrently
          const executeOperation = async (): Promise<void> => {
            try {
              const result = await operation.operation();
              operation.resolve(result);
            } catch (error) {
              operation.reject(error as Error);
            } finally {
              this.activeOperations.delete(operation.id);

              // Continue processing if there are more operations and we're not at max concurrency
              if (
                this.queue.length > 0 &&
                this.activeOperations.size < this.maxConcurrency &&
                !this.shutdownRequested
              ) {
                setImmediate(() => this.processQueue());
              }
            }
          };

          // Start the operation without awaiting
          executeOperation().catch(() => {
            // Error already handled in executeOperation
          });
        }
      }
    } finally {
      // Set processing to false when we're done starting operations
      this.processing = false;
    }
  }

  /**
   * Sort queue by priority (higher priority first) and timestamp (older first)
   */
  private sortQueue(): void {
    this.queue.sort((a, b) => {
      if (a.priority !== b.priority) {
        return b.priority - a.priority; // Higher priority first
      }
      return a.timestamp - b.timestamp; // Older first for same priority
    });
  }

  /**
   * Remove operation from queue
   */
  private removeFromQueue(operationId: string): void {
    this.queue = this.queue.filter(op => op.id !== operationId);
  }

  /**
   * Get queue status
   */
  getStatus(): {
    queueLength: number;
    activeOperations: number;
    processing: boolean;
  } {
    return {
      queueLength: this.queue.length,
      activeOperations: this.activeOperations.size,
      processing: this.processing,
    };
  }

  /**
   * Clear all pending operations
   */
  clear(): void {
    // Reject all pending operations
    while (this.queue.length > 0) {
      const operation = this.queue.shift();
      if (operation) {
        operation.reject(new Error('Operation cancelled'));
      }
    }
    this.queue = [];
  }

  /**
   * Wait for all operations to complete
   */
  async drain(): Promise<void> {
    return new Promise(resolve => {
      const checkEmpty = () => {
        if (this.queue.length === 0 && this.activeOperations.size === 0 && !this.processing) {
          resolve();
        } else {
          setTimeout(checkEmpty, 10);
        }
      };
      checkEmpty();
    });
  }

  /**
   * Gracefully shutdown the queue
   */
  async shutdown(): Promise<void> {
    this.shutdownRequested = true;

    // Cancel all pending operations
    while (this.queue.length > 0) {
      const operation = this.queue.shift();
      if (operation) {
        operation.reject(new Error('Operation cancelled due to shutdown'));
      }
    }

    // Wait for active operations to complete
    await this.drain();
  }

  /**
   * Set concurrency level
   */
  setConcurrency(maxConcurrency: number): void {
    this.maxConcurrency = Math.max(1, maxConcurrency);
  }
}
