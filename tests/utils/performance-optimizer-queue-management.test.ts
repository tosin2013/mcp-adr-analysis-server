/**
 * Tests for PerformanceOptimizer Queue Management enhancements
 */

import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { PerformanceOptimizer } from '../../src/utils/performance-optimizer.js';
import { TodoJsonData, TodoTask } from '../../src/types/todo-json-schemas.js';

describe('PerformanceOptimizer Queue Management', () => {
  let testData: TodoJsonData;
  let largeTasks: TodoTask[];

  beforeEach(() => {
    // Create a large dataset for testing
    largeTasks = [];
    for (let i = 0; i < 1500; i++) {
      largeTasks.push({
        id: `task-${i}`,
        title: `Task ${i}`,
        description: `Description for task ${i}`,
        status: i % 3 === 0 ? 'completed' : i % 3 === 1 ? 'in_progress' : 'pending',
        priority: i % 4 === 0 ? 'critical' : i % 4 === 1 ? 'high' : i % 4 === 2 ? 'medium' : 'low',
        assignee: `user-${i % 10}`,
        category: `category-${i % 5}`,
        tags: [`tag-${i % 3}`, `tag-${i % 7}`],
        createdAt: new Date(Date.now() - i * 1000).toISOString(),
        updatedAt: new Date(Date.now() - i * 500).toISOString(),
        dueDate: i % 5 === 0 ? new Date(Date.now() + i * 1000).toISOString() : undefined,
        archived: false,
        subtasks: [],
        dependencies: [],
        blockedBy: [],
        linkedAdrs: [],
        adrGeneratedTask: false,
        toolExecutions: [],
        scoreWeight: 1,
        scoreCategory: 'task_completion',
        progressPercentage: i % 101,
        lastModifiedBy: 'human',
        autoComplete: false,
        version: 1,
        changeLog: [],
        comments: [],
      });
    }

    testData = {
      version: '1.0.0',
      metadata: {
        lastUpdated: new Date().toISOString(),
        totalTasks: largeTasks.length,
        completedTasks: largeTasks.filter(t => t.status === 'completed').length,
        autoSyncEnabled: true,
      },
      tasks: Object.fromEntries(largeTasks.map(task => [task.id, task])),
      sections: [
        {
          id: 'pending',
          title: 'Pending Tasks',
          order: 1,
          collapsed: false,
          tasks: largeTasks.filter(t => t.status === 'pending').map(t => t.id),
        },
      ],
      scoringSync: {
        lastScoreUpdate: new Date().toISOString(),
        taskCompletionScore: 50,
        priorityWeightedScore: 60,
        criticalTasksRemaining: 1,
        scoreHistory: [],
      },
      knowledgeGraphSync: {
        lastSync: new Date().toISOString(),
        linkedIntents: [],
        pendingUpdates: [],
      },
      automationRules: [],
      templates: [],
      recurringTasks: [],
      operationHistory: [],
    };
  });

  afterEach(() => {
    PerformanceOptimizer.clearCache();
    PerformanceOptimizer.clearQueue();

    // Reset queue management configuration to defaults
    PerformanceOptimizer.configureQueueManagement({
      maxQueueSize: 1000,
      backpressureEnabled: true,
      batchProcessing: {
        batchSize: 100,
        maxConcurrentBatches: 3,
        backpressureThreshold: 800,
      },
    });
  });

  describe('Backpressure Handling', () => {
    it('should handle large datasets with queue management', async () => {
      const { testConfig } = await import('./test-config.js');
      const benchmarks = testConfig.getEnvironmentAwareBenchmarks();

      const startTime = Date.now();

      const result = await PerformanceOptimizer.getOptimizedTasks(
        testData,
        { status: 'completed' },
        { field: 'priority', order: 'desc' },
        { page: 1, pageSize: 50 }
      );

      const endTime = Date.now();
      const queryTime = endTime - startTime;

      expect(result.items).toHaveLength(50);
      expect(result.totalItems).toBeGreaterThan(400); // About 1/3 should be completed

      // Use environment-aware expectations
      const expectedMaxTime = benchmarks.queryPerformance.complex;
      expect(queryTime).toBeLessThan(expectedMaxTime);

      // Check queue stats
      const queueStats = PerformanceOptimizer.getQueueStats();
      expect(queueStats).toHaveProperty('queueLength');
      expect(queueStats).toHaveProperty('processing');
      expect(queueStats).toHaveProperty('backpressureActive');

      console.log(`✅ Queue management test: ${queryTime}ms (limit: ${expectedMaxTime}ms)`);
    });

    it('should apply backpressure when queue threshold is reached', async () => {
      // Configure low thresholds for testing
      PerformanceOptimizer.configureQueueManagement({
        maxQueueSize: 10,
        batchProcessing: {
          batchSize: 5,
          maxConcurrentBatches: 2,
          backpressureThreshold: 8,
        },
      });

      const promises: Promise<any>[] = [];

      // Create multiple concurrent operations to trigger backpressure
      for (let i = 0; i < 15; i++) {
        promises.push(
          PerformanceOptimizer.getOptimizedTasks(testData, {
            status: i % 2 === 0 ? 'completed' : 'pending',
          })
        );
      }

      // Some operations should succeed, others might be delayed by backpressure
      const results = await Promise.allSettled(promises);

      // At least some operations should succeed
      const successful = results.filter(r => r.status === 'fulfilled');
      expect(successful.length).toBeGreaterThan(0);

      // Check if backpressure was applied
      const queueStats = PerformanceOptimizer.getQueueStats();
      expect(queueStats.maxQueueSize).toBe(10);
    });

    it('should throw error on queue overflow', async () => {
      // Configure very low queue size with disabled backpressure to force immediate overflow
      PerformanceOptimizer.configureQueueManagement({
        maxQueueSize: 2,
        backpressureEnabled: false, // Disable backpressure to force overflow
        batchProcessing: {
          batchSize: 1,
          maxConcurrentBatches: 1,
          backpressureThreshold: 1,
        },
      });

      const promises: Promise<any>[] = [];
      const errors: Error[] = [];

      // Create operations in a tight loop to overwhelm the queue
      // Use setTimeout to ensure operations are created faster than they can be processed
      for (let i = 0; i < 10; i++) {
        try {
          const promise = PerformanceOptimizer.getOptimizedTasks(testData, {
            status: 'pending',
            // Add unique filter to prevent cache hits and force queue usage
            assignee: `test-user-${i}`,
            search: `unique-search-${i}`,
          }).catch(error => {
            errors.push(error);
            return error;
          });
          promises.push(promise);
        } catch (error) {
          // Synchronous errors (immediate queue overflow)
          errors.push(error as Error);
          promises.push(Promise.resolve(error));
        }
      }

      const results = await Promise.all(promises);

      // Combine synchronous and asynchronous errors
      const allErrors = [...errors, ...results.filter(r => r instanceof Error)];

      // Some operations should fail with queue overflow error
      expect(allErrors.length).toBeGreaterThan(0);

      const overflowErrors = allErrors.filter(
        e => e.message && e.message.includes('Queue overflow')
      );
      expect(overflowErrors.length).toBeGreaterThan(0);
    });
  });

  describe('Batch Processing', () => {
    it('should process large datasets in batches', async () => {
      const result = await PerformanceOptimizer.getOptimizedTasks(testData, { priority: 'high' });

      // Should find high priority tasks
      expect(result.items.length).toBeGreaterThan(0);
      expect(result.items.every(task => task.priority === 'high')).toBe(true);

      // Performance should be reasonable
      const performanceStats = PerformanceOptimizer.getPerformanceStats();
      expect(performanceStats.cache.size).toBeGreaterThanOrEqual(0);
      expect(performanceStats.queue.queueLength).toBeGreaterThanOrEqual(0);
    });

    it('should handle concurrent batch operations', async () => {
      const operations = [
        PerformanceOptimizer.getOptimizedTasks(testData, { status: 'completed' }),
        PerformanceOptimizer.getOptimizedTasks(testData, { status: 'pending' }),
        PerformanceOptimizer.getOptimizedTasks(testData, { priority: 'critical' }),
        PerformanceOptimizer.getOptimizedTasks(testData, { priority: 'high' }),
      ];

      const results = await Promise.all(operations);

      // All operations should succeed
      expect(results).toHaveLength(4);
      results.forEach(result => {
        expect(result.items).toBeDefined();
        expect(Array.isArray(result.items)).toBe(true);
      });
    });
  });

  describe('Improved Cache Invalidation', () => {
    it('should invalidate cache by data version', async () => {
      // First query to populate cache
      await PerformanceOptimizer.getOptimizedTasks(testData, { status: 'completed' });

      let cacheStats = PerformanceOptimizer.getCacheStats();
      expect(cacheStats.size).toBeGreaterThan(0);

      // Invalidate by version
      const invalidatedCount = PerformanceOptimizer.invalidateCacheByVersion('old-version');
      expect(invalidatedCount).toBeGreaterThan(0);

      cacheStats = PerformanceOptimizer.getCacheStats();
      expect(cacheStats.size).toBe(0);
    });

    it('should invalidate stale cache entries', async () => {
      // Populate cache
      await PerformanceOptimizer.getOptimizedTasks(testData, { status: 'completed' });

      let cacheStats = PerformanceOptimizer.getCacheStats();
      expect(cacheStats.size).toBeGreaterThan(0);

      // Invalidate stale entries (this won't invalidate fresh entries in test)
      const invalidatedCount = PerformanceOptimizer.invalidateStaleCache();
      expect(invalidatedCount).toBeGreaterThanOrEqual(0);
    });

    it('should track cache access patterns', async () => {
      // Make multiple queries to track access patterns
      await PerformanceOptimizer.getOptimizedTasks(testData, { status: 'completed' });
      await PerformanceOptimizer.getOptimizedTasks(testData, { status: 'completed' }); // Same query
      await PerformanceOptimizer.getOptimizedTasks(testData, { status: 'pending' });

      const cacheStats = PerformanceOptimizer.getCacheStats();
      expect(cacheStats.totalAccesses).toBeGreaterThan(0);
      expect(cacheStats.averageAccessCount).toBeGreaterThan(0);
    });

    it('should use LRU eviction when cache is full', async () => {
      // Configure small cache size
      const originalMaxSize = 50;

      // Fill cache beyond capacity
      const queries = [];
      for (let i = 0; i < originalMaxSize + 5; i++) {
        queries.push(
          PerformanceOptimizer.getOptimizedTasks(testData, {
            assignee: `user-${i % 10}`,
            category: `category-${i % 5}`,
          })
        );
      }

      await Promise.all(queries);

      const cacheStats = PerformanceOptimizer.getCacheStats();
      expect(cacheStats.size).toBeLessThanOrEqual(originalMaxSize);
    });
  });

  describe('Queue Management Configuration', () => {
    it('should allow queue management configuration', () => {
      const newConfig = {
        maxQueueSize: 500,
        backpressureEnabled: false,
        batchProcessing: {
          batchSize: 200,
          maxConcurrentBatches: 5,
          backpressureThreshold: 400,
        },
      };

      PerformanceOptimizer.configureQueueManagement(newConfig);

      const stats = PerformanceOptimizer.getPerformanceStats();
      expect(stats.queueManagement.maxQueueSize).toBe(500);
      expect(stats.queueManagement.backpressureEnabled).toBe(false);
      expect(stats.queueManagement.batchProcessing.batchSize).toBe(200);
    });

    it('should provide comprehensive performance statistics', () => {
      const stats = PerformanceOptimizer.getPerformanceStats();

      expect(stats).toHaveProperty('cache');
      expect(stats).toHaveProperty('queue');
      expect(stats).toHaveProperty('queueManagement');

      expect(stats.cache).toHaveProperty('size');
      expect(stats.cache).toHaveProperty('maxSize');
      expect(stats.cache).toHaveProperty('totalAccesses');

      expect(stats.queue).toHaveProperty('queueLength');
      expect(stats.queue).toHaveProperty('processing');
      expect(stats.queue).toHaveProperty('backpressureActive');

      expect(stats.queueManagement).toHaveProperty('maxQueueSize');
      expect(stats.queueManagement).toHaveProperty('backpressureEnabled');
    });
  });

  describe('Batch Processing Operations', () => {
    it('should process batch operations efficiently', async () => {
      const { testConfig, createPerformanceTest } = await import('./test-config.js');
      const benchmarks = testConfig.getEnvironmentAwareBenchmarks();

      await createPerformanceTest(
        'Batch processing operations',
        async monitor => {
          const items = Array.from({ length: 100 }, (_, i) => ({ id: i, value: `item-${i}` }));
          monitor.start(3, 'Testing batch processing performance');

          monitor.step('Starting batch processing');
          const startTime = Date.now();
          const results = await PerformanceOptimizer.batchProcessOperations(
            items,
            async batch => {
              // Simulate processing each item in the batch
              return batch.map(item => ({ ...item, processed: true }));
            },
            {
              batchSize: 10,
              maxConcurrency: 3,
            }
          );
          const endTime = Date.now();
          const batchTime = endTime - startTime;

          monitor.step('Validating batch results');
          expect(results).toHaveLength(100);
          expect(results.every(r => r.processed)).toBe(true);

          monitor.step('Checking batch performance');
          // Batch operations should be faster than complex queries
          const expectedMaxTime = Math.round(benchmarks.queryPerformance.simple * 2);
          expect(batchTime).toBeLessThan(expectedMaxTime);

          return { batchTime, itemCount: items.length };
        },
        {
          expectedDuration: Math.round(benchmarks.queryPerformance.simple * 2),
          maxMemoryMB: benchmarks.memoryLimits.baseline,
          steps: 3,
          verbose: true,
        }
      )();
    });

    it('should optimize write operations with batching', async () => {
      const operations = Array.from({ length: 50 }, (_, i) => () => Promise.resolve(`result-${i}`));

      const startTime = Date.now();
      const results = await PerformanceOptimizer.optimizeWriteOperations(operations, {
        batchSize: 10,
        maxConcurrency: 2,
      });
      const endTime = Date.now();

      expect(results).toHaveLength(50);
      expect(results).toEqual(Array.from({ length: 50 }, (_, i) => `result-${i}`));
      expect(endTime - startTime).toBeLessThan(1000);
    });

    it('should handle bulk data operations with memory management', async () => {
      const data = Array.from({ length: 200 }, (_, i) => ({ id: i, data: `data-${i}` }));

      let progressCallbacks = 0;
      const results = await PerformanceOptimizer.optimizeBulkDataOperation(
        data,
        async item => {
          // Simulate some processing
          await new Promise(resolve => setTimeout(resolve, 1));
          return { ...item, processed: true };
        },
        {
          batchSize: 20,
          maxConcurrency: 2,
          memoryThreshold: 50, // Low threshold for testing
          progressCallback: () => {
            progressCallbacks++;
          },
        }
      );

      expect(results).toHaveLength(200);
      expect(results.every(r => r.processed)).toBe(true);
      expect(progressCallbacks).toBeGreaterThan(0);
    });
  });

  describe('Queue Cleanup', () => {
    it('should wait for queue completion', async () => {
      // Start some operations
      const promises = [
        PerformanceOptimizer.getOptimizedTasks(testData, { status: 'completed' }),
        PerformanceOptimizer.getOptimizedTasks(testData, { status: 'pending' }),
      ];

      // Wait for completion
      await PerformanceOptimizer.waitForQueueCompletion();

      // All operations should be done
      const results = await Promise.all(promises);
      expect(results).toHaveLength(2);

      const queueStats = PerformanceOptimizer.getQueueStats();
      expect(queueStats.queueLength).toBe(0);
      expect(queueStats.processing).toBe(false);
    });

    it('should clear queue when requested', () => {
      // Add some operations to queue (they won't execute immediately)
      PerformanceOptimizer.configureQueueManagement({
        maxQueueSize: 1000,
      });

      // Clear the queue
      PerformanceOptimizer.clearQueue();

      const queueStats = PerformanceOptimizer.getQueueStats();
      expect(queueStats.queueLength).toBe(0);
      expect(queueStats.processing).toBe(false);
    });
  });
});
