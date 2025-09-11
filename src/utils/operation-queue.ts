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

  constructor(options: {
    maxConcurrency?: number;
    operationTimeout?: number;
    maxQueueSize?: number;
  } = {}) {
    this.maxConcurrency = options.maxConcurrency || 1;
    this.operationTimeout = options.operationTimeout || 30000;
    this.maxQueueSize = options.maxQueueSize || 100;
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
    if (this.queue.length >= this.maxQueueSize) {
      throw new Error(`Operation queue is full (${this.maxQueueSize} operations)`);
    }

    const operationId = `op_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    return new Promise((resolve, reject) => {
      let isResolved = false;
      
      const queuedOp: QueuedOperation = {
        id: operationId,
        operation: async () => {
          try {
            const startTime = Date.now();
            const result = await operation();
            const executionTime = Date.now() - startTime;
            
            return {
              success: true,
              result,
              executionTime
            } as OperationResult;
          } catch (error) {
            const executionTime = Date.now() - Date.now();
            return {
              success: false,
              error: error as Error,
              executionTime
            } as OperationResult;
          }
        },
        priority,
        timestamp: Date.now(),
        timeout: timeout || this.operationTimeout
      };

      // Set up timeout for this specific operation
      const timeoutId = setTimeout(() => {
        if (!isResolved) {
          isResolved = true;
          this.removeFromQueue(operationId);
          reject(new Error(`Operation ${operationId} timed out after ${queuedOp.timeout}ms`));
        }
      }, queuedOp.timeout);

      // Store resolve/reject for later use
      (queuedOp as any).resolve = (result: OperationResult) => {
        if (!isResolved) {
          isResolved = true;
          clearTimeout(timeoutId);
          if (result.success) {
            resolve(result.result);
          } else {
            reject(result.error);
          }
        }
      };

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
    if (this.processing) return;
    
    this.processing = true;

    try {
      while (this.queue.length > 0 && this.activeOperations.size < this.maxConcurrency) {
        const operation = this.queue.shift();
        if (!operation) continue;

        this.activeOperations.add(operation.id);

        // Execute operation
        const executeOperation = async () => {
          try {
            const result = await operation.operation();
            
            // Resolve the promise
            if ((operation as any).resolve) {
              (operation as any).resolve(result);
            }
          } catch (error) {
            // Reject the promise
            if ((operation as any).resolve) {
              (operation as any).resolve({
                success: false,
                error: error as Error,
                executionTime: 0
              });
            }
          } finally {
            this.activeOperations.delete(operation.id);
            
            // Continue processing if there are more operations and we're not at max concurrency
            if (this.queue.length > 0 && this.activeOperations.size < this.maxConcurrency) {
              setImmediate(() => this.processQueue());
            } else if (this.activeOperations.size === 0) {
              this.processing = false;
            }
          }
        };

        // For sequential processing (maxConcurrency = 1), await each operation
        if (this.maxConcurrency === 1) {
          await executeOperation();
        } else {
          // For concurrent processing, don't await
          executeOperation();
        }
      }
    } finally {
      // Only set processing to false if no active operations and queue is empty
      if (this.activeOperations.size === 0 && this.queue.length === 0) {
        this.processing = false;
      }
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
      processing: this.processing
    };
  }

  /**
   * Clear all pending operations
   */
  clear(): void {
    this.queue = [];
  }

  /**
   * Wait for all operations to complete
   */
  async drain(): Promise<void> {
    return new Promise((resolve) => {
      const checkEmpty = () => {
        if (this.queue.length === 0 && this.activeOperations.size === 0) {
          resolve();
        } else {
          setTimeout(checkEmpty, 10);
        }
      };
      checkEmpty();
    });
  }

  /**
   * Set concurrency level
   */
  setConcurrency(maxConcurrency: number): void {
    this.maxConcurrency = Math.max(1, maxConcurrency);
  }
}