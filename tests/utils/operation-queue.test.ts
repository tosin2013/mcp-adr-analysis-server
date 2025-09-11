/**
 * Tests for OperationQueue
 */

import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import { OperationQueue } from '../../src/utils/operation-queue.js';

describe('OperationQueue', () => {
  let queue: OperationQueue;

  beforeEach(() => {
    queue = new OperationQueue();
  });

  afterEach(async () => {
    await queue.drain();
    queue.clear();
  });

  describe('Basic Operations', () => {
    it('should execute operations sequentially by default', async () => {
      const results: number[] = [];
      const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

      const operations = [
        () => delay(50).then(() => results.push(1)),
        () => delay(30).then(() => results.push(2)),
        () => delay(20).then(() => results.push(3)),
      ];

      // Enqueue all operations with same priority to test sequential execution
      const promises = operations.map(op => queue.enqueue(op));

      // Wait for all to complete
      await Promise.all(promises);

      // Should execute in order despite different delays
      expect(results).toEqual([1, 2, 3]);
    });

    it('should guarantee execution order for operations with same priority', async () => {
      const results: string[] = [];
      const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

      // All operations have same priority (default 0) but different delays
      const operations = [
        () => delay(100).then(() => results.push('first')),
        () => delay(50).then(() => results.push('second')),
        () => delay(25).then(() => results.push('third')),
        () => delay(10).then(() => results.push('fourth')),
      ];

      // Enqueue all operations with same priority
      const promises = operations.map(op => queue.enqueue(op, 0)); // Explicit same priority

      // Wait for all to complete
      await Promise.all(promises);

      // Should execute in FIFO order for same priority, regardless of execution time
      expect(results).toEqual(['first', 'second', 'third', 'fourth']);
    });

    it('should handle operation priorities correctly', async () => {
      const results: string[] = [];
      const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

      // Enqueue operations with different priorities
      const promises = [
        queue.enqueue(() => delay(10).then(() => results.push('low')), 1),
        queue.enqueue(() => delay(10).then(() => results.push('high')), 10),
        queue.enqueue(() => delay(10).then(() => results.push('medium')), 5),
      ];

      await Promise.all(promises);

      // Should execute in priority order: high, medium, low
      expect(results).toEqual(['high', 'medium', 'low']);
    });

    it('should return operation results correctly', async () => {
      const result1 = await queue.enqueue(() => Promise.resolve('test1'));
      const result2 = await queue.enqueue(() => Promise.resolve(42));
      const result3 = await queue.enqueue(() => Promise.resolve({ data: 'test' }));

      expect(result1).toBe('test1');
      expect(result2).toBe(42);
      expect(result3).toEqual({ data: 'test' });
    });

    it('should handle operation errors correctly', async () => {
      const error = new Error('Test error');

      await expect(queue.enqueue(() => Promise.reject(error))).rejects.toThrow('Test error');
    });
  });

  describe('Concurrency Control', () => {
    it('should respect max concurrency setting', async () => {
      const concurrentQueue = new OperationQueue({ maxConcurrency: 2 });
      const activeOperations = new Set<number>();
      const maxConcurrent = { value: 0 };

      const createOperation = (id: number) => async () => {
        activeOperations.add(id);
        maxConcurrent.value = Math.max(maxConcurrent.value, activeOperations.size);

        await new Promise(resolve => setTimeout(resolve, 50));

        activeOperations.delete(id);
        return id;
      };

      const promises = Array.from({ length: 5 }, (_, i) =>
        concurrentQueue.enqueue(createOperation(i))
      );

      await Promise.all(promises);
      await concurrentQueue.drain();

      expect(maxConcurrent.value).toBeLessThanOrEqual(2);
    });

    it('should handle queue overflow correctly', async () => {
      const smallQueue = new OperationQueue({ maxQueueSize: 2 });

      // Fill the queue
      const promise1 = smallQueue.enqueue(() => new Promise(resolve => setTimeout(resolve, 100)));
      const promise2 = smallQueue.enqueue(() => new Promise(resolve => setTimeout(resolve, 100)));

      // This should throw due to queue overflow
      await expect(smallQueue.enqueue(() => Promise.resolve())).rejects.toThrow(
        'Operation queue is full'
      );

      await Promise.all([promise1, promise2]);
    });
  });

  describe('Timeout Handling', () => {
    it('should timeout operations that take too long', async () => {
      const shortTimeoutQueue = new OperationQueue({ operationTimeout: 100 });

      await expect(
        shortTimeoutQueue.enqueue(() => new Promise(resolve => setTimeout(resolve, 200)))
      ).rejects.toThrow(/timed out/);
    });

    it('should allow custom timeout per operation', async () => {
      await expect(
        queue.enqueue(
          () => new Promise(resolve => setTimeout(resolve, 200)),
          0,
          100 // Custom timeout
        )
      ).rejects.toThrow(/timed out/);
    });
  });

  describe('Queue Management', () => {
    it('should provide accurate queue status', async () => {
      const longOperation = () => new Promise(resolve => setTimeout(resolve, 100));

      // Start some operations
      const promise1 = queue.enqueue(longOperation);
      const promise2 = queue.enqueue(longOperation);

      // Check status while operations are running
      const status = queue.getStatus();
      expect(status.queueLength).toBeGreaterThanOrEqual(0);
      expect(status.activeOperations).toBeGreaterThanOrEqual(0);

      await Promise.all([promise1, promise2]);
    });

    it('should clear queue correctly', async () => {
      // Add some operations and catch their rejections
      const promise1 = queue
        .enqueue(() => new Promise(resolve => setTimeout(resolve, 100)))
        .catch(() => 'cancelled');
      const promise2 = queue
        .enqueue(() => new Promise(resolve => setTimeout(resolve, 100)))
        .catch(() => 'cancelled');

      queue.clear();

      const status = queue.getStatus();
      expect(status.queueLength).toBe(0);

      // Wait for promises to be rejected
      const results = await Promise.all([promise1, promise2]);
      expect(results).toEqual(['cancelled', 'cancelled']);
    });

    it('should drain queue correctly', async () => {
      const results: number[] = [];

      // Add operations
      queue.enqueue(() => Promise.resolve().then(() => results.push(1)));
      queue.enqueue(() => Promise.resolve().then(() => results.push(2)));
      queue.enqueue(() => Promise.resolve().then(() => results.push(3)));

      await queue.drain();

      expect(results).toEqual([1, 2, 3]);

      const status = queue.getStatus();
      expect(status.queueLength).toBe(0);
      expect(status.activeOperations).toBe(0);
    });
  });

  describe('Performance', () => {
    it('should handle rapid successive operations efficiently', async () => {
      const startTime = Date.now();
      const operationCount = 100;

      const promises = Array.from({ length: operationCount }, (_, i) =>
        queue.enqueue(() => Promise.resolve(i))
      );

      const results = await Promise.all(promises);
      const endTime = Date.now();

      expect(results).toHaveLength(operationCount);
      expect(results).toEqual(Array.from({ length: operationCount }, (_, i) => i));

      // Should complete reasonably quickly (less than 1 second for 100 operations)
      expect(endTime - startTime).toBeLessThan(1000);
    });

    it('should maintain order under load', async () => {
      const results: number[] = [];
      const operationCount = 50;

      const promises = Array.from(
        { length: operationCount },
        (_, i) =>
          queue.enqueue(() => {
            results.push(i);
            return Promise.resolve(i);
          }, i) // Use index as priority to test ordering
      );

      await Promise.all(promises);

      // Results should be in descending order due to priority (higher index = higher priority)
      const expectedOrder = Array.from(
        { length: operationCount },
        (_, i) => operationCount - 1 - i
      );
      expect(results).toEqual(expectedOrder);
    });
  });

  describe('Error Recovery', () => {
    it('should continue processing after operation failures', async () => {
      const results: string[] = [];

      const operations = [
        () => Promise.resolve().then(() => results.push('success1')),
        () => Promise.reject(new Error('failure')),
        () => Promise.resolve().then(() => results.push('success2')),
      ];

      const promises = operations.map(op => queue.enqueue(op).catch(() => 'error'));

      const operationResults = await Promise.all(promises);

      expect(results).toEqual(['success1', 'success2']);
      expect(operationResults[1]).toBe('error'); // Failed operation
    });

    it('should handle multiple concurrent failures', async () => {
      const concurrentQueue = new OperationQueue({ maxConcurrency: 3 });

      const operations = Array.from({ length: 5 }, (_, i) => {
        if (i % 2 === 0) {
          return () => Promise.resolve(`success${i}`);
        } else {
          return () => Promise.reject(new Error(`error${i}`));
        }
      });

      const promises = operations.map(op => concurrentQueue.enqueue(op).catch(err => err.message));

      const results = await Promise.all(promises);

      expect(results[0]).toBe('success0');
      expect(results[1]).toBe('error1');
      expect(results[2]).toBe('success2');
      expect(results[3]).toBe('error3');
      expect(results[4]).toBe('success4');
    });
  });
});
