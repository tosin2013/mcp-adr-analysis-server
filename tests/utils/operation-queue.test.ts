/**
 * Unit tests for operation-queue.ts
 * Tests concurrent operation management, queue limits, and error handling
 */

import { jest } from '@jest/globals';
import { OperationQueue, type QueueOptions } from '../../src/utils/operation-queue.js';
import { unitTest, integrationTest } from './test-helpers.js';

describe('OperationQueue', () => {
  let queue: OperationQueue;

  beforeEach(() => {
    queue = new OperationQueue();
  });

  afterEach(async () => {
    await queue.shutdown();
  });

  describe('Basic Operations', () => {
    unitTest('should initialize with default options', async () => {
      expect(queue.getQueueSize()).toBe(0);
      expect(queue.getActiveCount()).toBe(0);
    });

    unitTest('should accept custom options', async () => {
      const customQueue = new OperationQueue({
        concurrency: 2,
        maxQueueSize: 10,
      });

      // Queue should be initialized but we can't directly test concurrency limit without operations
      expect(customQueue.getQueueSize()).toBe(0);
      expect(customQueue.getActiveCount()).toBe(0);

      await customQueue.shutdown();
    });

    unitTest('should execute single operation', async () => {
      let executed = false;
      const operation = async () => {
        executed = true;
        return 'result';
      };

      const result = await queue.enqueue(operation);
      expect(result).toBe('result');
      expect(executed).toBe(true);
    });

    unitTest('should handle operation that throws error', async () => {
      const operation = async () => {
        throw new Error('Operation failed');
      };

      await expect(queue.enqueue(operation)).rejects.toThrow('Operation failed');
    });

    unitTest('should track queue size correctly', async () => {
      expect(queue.getQueueSize()).toBe(0);

      // Create a slow operation to test queueing
      const slowOperation = () => new Promise(resolve => setTimeout(resolve, 100));
      
      const promise1 = queue.enqueue(slowOperation);
      const promise2 = queue.enqueue(slowOperation);
      
      // At least one should be queued (exact count depends on timing)
      expect(queue.getQueueSize() + queue.getActiveCount()).toBe(2);
      
      await Promise.all([promise1, promise2]);
      expect(queue.getQueueSize()).toBe(0);
      expect(queue.getActiveCount()).toBe(0);
    });
  });

  describe('Concurrency Control', () => {
    integrationTest('should respect concurrency limit', async () => {
      const limitedQueue = new OperationQueue({ concurrency: 2 });
      let activeCount = 0;
      let maxActiveCount = 0;

      const operation = async () => {
        activeCount++;
        maxActiveCount = Math.max(maxActiveCount, activeCount);
        await new Promise(resolve => setTimeout(resolve, 100));
        activeCount--;
        return activeCount;
      };

      // Start 5 operations
      const promises = Array.from({ length: 5 }, () => limitedQueue.enqueue(operation));
      
      await Promise.all(promises);
      
      // Should never exceed concurrency limit of 2
      expect(maxActiveCount).toBeLessThanOrEqual(2);
      expect(activeCount).toBe(0); // All operations completed

      await limitedQueue.shutdown();
    });

    integrationTest('should execute operations in order', async () => {
      const results: number[] = [];
      const orderedQueue = new OperationQueue({ concurrency: 1 });

      const createOperation = (value: number) => async () => {
        await new Promise(resolve => setTimeout(resolve, 10));
        results.push(value);
        return value;
      };

      // Enqueue operations
      const promises = [1, 2, 3, 4, 5].map(i => orderedQueue.enqueue(createOperation(i)));
      
      await Promise.all(promises);
      
      expect(results).toEqual([1, 2, 3, 4, 5]);

      await orderedQueue.shutdown();
    });

    integrationTest('should handle mixed fast and slow operations', async () => {
      const mixedQueue = new OperationQueue({ concurrency: 3 });
      const results: string[] = [];

      const fastOp = async (id: string) => {
        results.push(`fast-${id}`);
        return `fast-${id}`;
      };

      const slowOp = async (id: string) => {
        await new Promise(resolve => setTimeout(resolve, 50));
        results.push(`slow-${id}`);
        return `slow-${id}`;
      };

      // Mix of fast and slow operations
      const promises = [
        mixedQueue.enqueue(() => slowOp('1')),
        mixedQueue.enqueue(() => fastOp('1')),
        mixedQueue.enqueue(() => fastOp('2')),
        mixedQueue.enqueue(() => slowOp('2')),
        mixedQueue.enqueue(() => fastOp('3')),
      ];

      await Promise.all(promises);
      
      // Fast operations should complete first
      expect(results.filter(r => r.startsWith('fast'))).toHaveLength(3);
      expect(results.filter(r => r.startsWith('slow'))).toHaveLength(2);

      await mixedQueue.shutdown();
    });

    integrationTest('should handle queue overflow correctly', async () => {
      const smallQueue = new OperationQueue({ maxQueueSize: 2 });

      // Fill the queue
      const promise1 = smallQueue.enqueue(() => new Promise(resolve => setTimeout(resolve, 100)));
      const promise2 = smallQueue.enqueue(() => new Promise(resolve => setTimeout(resolve, 100)));

      // This should throw due to queue overflow
      await expect(smallQueue.enqueue(() => Promise.resolve())).rejects.toThrow(
        'Operation queue overflow'
      );

      await Promise.all([promise1, promise2]);
    });
  });

  describe('Error Handling', () => {
    unitTest('should handle operation errors without affecting other operations', async () => {
      const goodOperation = async () => 'success';
      const badOperation = async () => {
        throw new Error('Bad operation');
      };

      const promise1 = queue.enqueue(goodOperation);
      const promise2 = queue.enqueue(badOperation);
      const promise3 = queue.enqueue(goodOperation);

      const results = await Promise.allSettled([promise1, promise2, promise3]);
      
      expect(results[0].status).toBe('fulfilled');
      expect(results[1].status).toBe('rejected');
      expect(results[2].status).toBe('fulfilled');
      
      if (results[0].status === 'fulfilled') {
        expect(results[0].value).toBe('success');
      }
      if (results[2].status === 'fulfilled') {
        expect(results[2].value).toBe('success');
      }
    });

    unitTest('should handle timeout errors', async () => {
      const timeoutQueue = new OperationQueue({ 
        operationTimeout: 50 
      });

      const slowOperation = async () => {
        await new Promise(resolve => setTimeout(resolve, 200)); // Longer than timeout
        return 'should not complete';
      };

      await expect(timeoutQueue.enqueue(slowOperation)).rejects.toThrow(/timeout/i);

      await timeoutQueue.shutdown();
    });

    unitTest('should provide detailed error information', async () => {
      const operation = async () => {
        const error = new Error('Detailed error message');
        error.stack = 'Custom stack trace';
        throw error;
      };

      try {
        await queue.enqueue(operation);
        fail('Should have thrown an error');
      } catch (error: any) {
        expect(error.message).toBe('Detailed error message');
        expect(error.stack).toContain('Custom stack trace');
      }
    });
  });

  describe('Lifecycle Management', () => {
    integrationTest('should shutdown gracefully', async () => {
      const shutdownQueue = new OperationQueue({ concurrency: 2 });
      const results: number[] = [];

      // Start some operations
      const promises = Array.from({ length: 3 }, (_, i) => 
        shutdownQueue.enqueue(async () => {
          await new Promise(resolve => setTimeout(resolve, 100));
          results.push(i);
          return i;
        })
      );

      // Shutdown should wait for active operations to complete
      const shutdownPromise = shutdownQueue.shutdown();
      
      await Promise.all([...promises, shutdownPromise]);
      
      expect(results).toHaveLength(3);
      expect(shutdownQueue.getActiveCount()).toBe(0);
      expect(shutdownQueue.getQueueSize()).toBe(0);
    });

    integrationTest('should reject new operations after shutdown', async () => {
      const shutdownQueue = new OperationQueue();
      await shutdownQueue.shutdown();

      await expect(
        shutdownQueue.enqueue(async () => 'should not execute')
      ).rejects.toThrow(/shut down/i);
    });

    integrationTest('should handle multiple shutdown calls gracefully', async () => {
      const multiShutdownQueue = new OperationQueue();
      
      // Multiple shutdown calls should not cause issues
      const shutdown1 = multiShutdownQueue.shutdown();
      const shutdown2 = multiShutdownQueue.shutdown();
      const shutdown3 = multiShutdownQueue.shutdown();

      await Promise.all([shutdown1, shutdown2, shutdown3]);
      
      expect(multiShutdownQueue.getActiveCount()).toBe(0);
    });
  });

  describe('Performance Monitoring', () => {
    integrationTest('should track execution metrics', async () => {
      const metricsQueue = new OperationQueue({ concurrency: 2 });
      
      // Execute operations with different durations
      const promises = [
        metricsQueue.enqueue(async () => {
          await new Promise(resolve => setTimeout(resolve, 50));
          return 'fast';
        }),
        metricsQueue.enqueue(async () => {
          await new Promise(resolve => setTimeout(resolve, 100));
          return 'medium';
        }),
        metricsQueue.enqueue(async () => {
          await new Promise(resolve => setTimeout(resolve, 150));
          return 'slow';
        }),
      ];

      await Promise.all(promises);
      
      // Metrics should be available
      const stats = metricsQueue.getStats();
      expect(stats.completed).toBe(3);
      expect(stats.failed).toBe(0);
      expect(stats.totalExecutionTime).toBeGreaterThan(0);
      expect(stats.averageExecutionTime).toBeGreaterThan(0);

      await metricsQueue.shutdown();
    });

    integrationTest('should track failed operations', async () => {
      const failureQueue = new OperationQueue();
      
      const goodOp = async () => 'success';
      const badOp = async () => { throw new Error('failure'); };

      const promises = [
        failureQueue.enqueue(goodOp).catch(() => {}), // Swallow error
        failureQueue.enqueue(badOp).catch(() => {}), // Swallow error
        failureQueue.enqueue(goodOp).catch(() => {}), // Swallow error
        failureQueue.enqueue(badOp).catch(() => {}), // Swallow error
      ];

      await Promise.all(promises);
      
      const stats = failureQueue.getStats();
      expect(stats.completed).toBe(2);
      expect(stats.failed).toBe(2);

      await failureQueue.shutdown();
    });
  });

  describe('Configuration Validation', () => {
    unitTest('should validate concurrency configuration', async () => {
      expect(() => new OperationQueue({ concurrency: 0 })).toThrow(/concurrency/i);
      expect(() => new OperationQueue({ concurrency: -1 })).toThrow(/concurrency/i);
      
      // Valid configurations should not throw
      const validQueue = new OperationQueue({ concurrency: 1 });
      await validQueue.shutdown();
    });

    unitTest('should validate queue size configuration', async () => {
      expect(() => new OperationQueue({ maxQueueSize: 0 })).toThrow(/queue size/i);
      expect(() => new OperationQueue({ maxQueueSize: -1 })).toThrow(/queue size/i);
      
      // Valid configurations should not throw
      const validQueue = new OperationQueue({ maxQueueSize: 1 });
      await validQueue.shutdown();
    });

    unitTest('should validate timeout configuration', async () => {
      expect(() => new OperationQueue({ operationTimeout: 0 })).toThrow(/timeout/i);
      expect(() => new OperationQueue({ operationTimeout: -1 })).toThrow(/timeout/i);
      
      // Valid configurations should not throw
      const validQueue = new OperationQueue({ operationTimeout: 1000 });
      await validQueue.shutdown();
    });
  });
});
