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
  private activeOperations: Map<string, QueuedOperation> = new Map(); // Track active operations with details
  private operationTimeout: number = 30000; // 30 seconds default timeout
  private maxQueueSize: number = 1000; // Increased default queue size
  private shutdownRequested: boolean = false;
  private semaphore: number = 0; // Current active operation count for semaphore-based control
  private resourceCleanupCallbacks: Set<() => void> = new Set(); // Track cleanup callbacks

  constructor(
    options: {
      maxConcurrency?: number;
      operationTimeout?: number;
      maxQueueSize?: number;
    } = {}
  ) {
    this.maxConcurrency = options.maxConcurrency || 1;
    this.operationTimeout = options.operationTimeout || 30000;
    this.maxQueueSize = options.maxQueueSize || 1000; // Increased default
    this.shutdownRequested = false;
    this.semaphore = 0;
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

    // Check if queue is full, but allow some buffer for high-priority operations
    const effectiveMaxSize = this.maxQueueSize + (priority > 5 ? 50 : 0);
    if (this.queue.length >= effectiveMaxSize) {
      throw new Error(`Operation queue is full (${this.maxQueueSize} operations)`);
    }

    const operationId = `op_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;

    return new Promise<T>((resolve, reject) => {
      let isResolved = false;
      let timeoutId: NodeJS.Timeout | null = null;
      let cleanupCallback: (() => void) | null = null;

      const queuedOp: QueuedOperation = {
        id: operationId,
        operation,
        priority,
        timestamp: Date.now(),
        timeout: timeout || this.operationTimeout,
        resolve: (result: T) => {
          if (!isResolved) {
            isResolved = true;
            this.cleanupOperation(operationId, timeoutId, cleanupCallback);
            resolve(result);
          }
        },
        reject: (error: Error) => {
          if (!isResolved) {
            isResolved = true;
            this.cleanupOperation(operationId, timeoutId, cleanupCallback);
            reject(error);
          }
        },
      };

      // Set up timeout for this specific operation with proper cleanup
      timeoutId = setTimeout(() => {
        if (!isResolved) {
          isResolved = true;
          // Remove from queue if still pending
          this.removeFromQueue(operationId);
          // Release semaphore if operation was active
          if (this.activeOperations.has(operationId)) {
            this.semaphore = Math.max(0, this.semaphore - 1);
          }
          this.cleanupOperation(operationId, null, cleanupCallback);
          reject(new Error(`Operation ${operationId} timed out after ${queuedOp.timeout}ms`));
        }
      }, queuedOp.timeout);

      // Register cleanup callback for graceful shutdown
      cleanupCallback = () => {
        if (!isResolved) {
          isResolved = true;
          this.cleanupOperation(operationId, timeoutId, null);
          reject(new Error('Operation cancelled due to shutdown'));
        }
      };
      this.resourceCleanupCallbacks.add(cleanupCallback);

      this.queue.push(queuedOp);
      this.sortQueue();

      // Start processing if not already running
      if (!this.processing) {
        setImmediate(() => this.processQueue());
      }
    });
  }

  /**
   * Process operations in the queue with proper semaphore-based concurrency control
   */
  private async processQueue(): Promise<void> {
    if (this.processing || this.shutdownRequested) return;

    this.processing = true;

    try {
      // For sequential processing (maxConcurrency = 1), process one at a time with explicit await
      if (this.maxConcurrency === 1) {
        while (this.queue.length > 0 && !this.shutdownRequested) {
          const operation = this.queue.shift();
          if (!operation) continue;

          // Acquire semaphore
          this.semaphore++;
          this.activeOperations.set(operation.id, operation);

          try {
            const result = await operation.operation();
            operation.resolve(result);
          } catch (error) {
            operation.reject(error as Error);
          } finally {
            // Release semaphore and cleanup
            this.semaphore--;
            this.activeOperations.delete(operation.id);
          }
        }
      } else {
        // For concurrent processing, use proper semaphore-based control
        const runningOperations = new Set<Promise<void>>();

        while ((this.queue.length > 0 || runningOperations.size > 0) && !this.shutdownRequested) {
          // Start new operations up to concurrency limit
          while (
            this.queue.length > 0 &&
            this.semaphore < this.maxConcurrency &&
            !this.shutdownRequested
          ) {
            const operation = this.queue.shift();
            if (!operation) continue;

            // Acquire semaphore immediately
            this.semaphore++;
            this.activeOperations.set(operation.id, operation);

            // Create and track the operation promise with proper cleanup
            const operationPromise = this.executeOperationAsync(operation).finally(() => {
              runningOperations.delete(operationPromise);
            });
            runningOperations.add(operationPromise);
          }

          // Wait for at least one operation to complete if we have any running
          if (runningOperations.size > 0) {
            await Promise.race(Array.from(runningOperations));
          }
        }
      }
    } finally {
      // Only set processing to false when we're done starting operations
      this.processing = false;

      // If there are still operations and we have capacity, continue processing
      if (
        this.queue.length > 0 &&
        this.semaphore < this.maxConcurrency &&
        !this.shutdownRequested
      ) {
        setImmediate(() => this.processQueue());
      }
    }
  }

  /**
   * Execute operation asynchronously with proper resource management
   */
  private async executeOperationAsync(operation: QueuedOperation): Promise<void> {
    try {
      const result = await operation.operation();
      operation.resolve(result);
    } catch (error) {
      operation.reject(error as Error);
    } finally {
      // Release semaphore and cleanup - ensure semaphore never goes negative
      this.semaphore = Math.max(0, this.semaphore - 1);
      this.activeOperations.delete(operation.id);

      // Continue processing if there are more operations and capacity
      if (
        this.queue.length > 0 &&
        this.semaphore < this.maxConcurrency &&
        !this.shutdownRequested &&
        !this.processing
      ) {
        setImmediate(() => this.processQueue());
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
   * Remove operation from queue and clean up resources
   */
  private removeFromQueue(operationId: string): void {
    // Remove from pending queue
    this.queue = this.queue.filter(op => op.id !== operationId);

    // If operation was active, release semaphore
    if (this.activeOperations.has(operationId)) {
      this.semaphore = Math.max(0, this.semaphore - 1);
    }

    this.activeOperations.delete(operationId);
  }

  /**
   * Clean up operation resources
   */
  private cleanupOperation(
    operationId: string,
    timeoutId: NodeJS.Timeout | null,
    cleanupCallback: (() => void) | null
  ): void {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
    if (cleanupCallback) {
      this.resourceCleanupCallbacks.delete(cleanupCallback);
    }
    this.activeOperations.delete(operationId);
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
      queueLength: this.queue.length,
      activeOperations: this.activeOperations.size,
      processing: this.processing,
      semaphoreCount: this.semaphore,
      maxConcurrency: this.maxConcurrency,
    };
  }

  /**
   * Clear all pending operations with proper cleanup
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

    // Clear active operations (they should complete naturally)
    // but remove them from tracking to prevent memory leaks
    this.activeOperations.clear();
    this.semaphore = 0;
  }

  /**
   * Wait for all operations to complete with timeout protection
   */
  async drain(timeoutMs: number = 30000): Promise<void> {
    return new Promise((resolve, reject) => {
      const startTime = Date.now();

      const checkEmpty = () => {
        const elapsed = Date.now() - startTime;

        if (elapsed > timeoutMs) {
          reject(new Error(`Drain operation timed out after ${timeoutMs}ms`));
          return;
        }

        if (this.queue.length === 0 && this.activeOperations.size === 0 && this.semaphore === 0) {
          resolve();
        } else {
          setTimeout(checkEmpty, 10);
        }
      };

      checkEmpty();
    });
  }

  /**
   * Gracefully shutdown the queue with resource tracking
   */
  async shutdown(timeoutMs: number = 10000): Promise<void> {
    this.shutdownRequested = true;

    // Cancel all pending operations
    while (this.queue.length > 0) {
      const operation = this.queue.shift();
      if (operation) {
        operation.reject(new Error('Operation cancelled due to shutdown'));
      }
    }

    // Execute all cleanup callbacks
    for (const cleanup of this.resourceCleanupCallbacks) {
      try {
        cleanup();
      } catch (error) {
        // Log but don't throw to ensure all cleanups are attempted
        console.warn('Cleanup callback failed:', error);
      }
    }
    this.resourceCleanupCallbacks.clear();

    // Wait for active operations to complete with timeout
    try {
      await this.drain(timeoutMs);
    } catch (error) {
      // Force cleanup if drain times out
      console.warn(`Shutdown timeout after ${timeoutMs}ms, forcing cleanup`);

      // Cancel any remaining active operations
      for (const [, operation] of this.activeOperations) {
        try {
          operation.reject(new Error('Operation cancelled due to forced shutdown'));
        } catch (e) {
          // Ignore errors during forced cleanup
        }
      }

      this.activeOperations.clear();
      this.semaphore = 0;
      throw error;
    }
  }

  /**
   * Set concurrency level
   */
  setConcurrency(maxConcurrency: number): void {
    this.maxConcurrency = Math.max(1, maxConcurrency);
  }
}
