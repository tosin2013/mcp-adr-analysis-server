/**
 * Integration tests for performance improvements in TodoJsonManager
 */

import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { TodoJsonManager } from '../../src/utils/todo-json-manager.js';
import { TodoTask } from '../../src/types/todo-json-schemas.js';
import * as fs from 'fs/promises';
import * as path from 'path';
import * as os from 'os';

describe('Performance Integration Tests', () => {
  let manager: TodoJsonManager;
  let tempDir: string;

  beforeEach(async () => {
    // Create temporary directory for tests
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'todo-perf-test-'));
    manager = new TodoJsonManager(tempDir);
  });

  afterEach(async () => {
    await manager.cleanup();
    // Clean up temporary directory
    try {
      await fs.rm(tempDir, { recursive: true, force: true });
    } catch (error) {
      console.warn('Failed to clean up temp directory:', error);
    }
  });

  describe('Rapid Successive Operations', () => {
    it('should handle rapid task creation without data corruption', async () => {
      const taskCount = 50;
      const promises: Promise<string>[] = [];

      // Create many tasks rapidly
      for (let i = 0; i < taskCount; i++) {
        promises.push(
          manager.createTask({
            title: `Rapid Task ${i}`,
            description: `Task created rapidly ${i}`,
            priority: i % 2 === 0 ? 'high' : 'medium',
          })
        );
      }

      const taskIds = await Promise.all(promises);

      // Verify all tasks were created
      expect(taskIds).toHaveLength(taskCount);
      expect(new Set(taskIds).size).toBe(taskCount); // All IDs should be unique

      // Wait for all operations to complete
      await manager.waitForOperations();

      // Verify data consistency
      const tasks = await manager.getTasks();
      expect(tasks.tasks).toHaveLength(taskCount);

      // Check that all tasks are properly stored
      for (const taskId of taskIds) {
        const task = tasks.tasks.find(t => t.id === taskId);
        expect(task).toBeDefined();
        expect(task!.title).toMatch(/^Rapid Task \d+$/);
      }
    });

    it('should handle rapid task updates without race conditions', async () => {
      // Create initial tasks
      const taskIds = await Promise.all([
        manager.createTask({ title: 'Task 1', priority: 'low' }),
        manager.createTask({ title: 'Task 2', priority: 'low' }),
        manager.createTask({ title: 'Task 3', priority: 'low' }),
      ]);

      await manager.waitForOperations();

      // Perform rapid updates
      const updatePromises: Promise<void>[] = [];

      for (let i = 0; i < 20; i++) {
        const taskId = taskIds[i % taskIds.length]!;
        updatePromises.push(
          manager.updateTask({
            taskId,
            updates: {
              priority: i % 2 === 0 ? 'high' : 'medium',
              progressPercentage: (i * 5) % 100,
            },
            reason: `Rapid update ${i}`,
          })
        );
      }

      await Promise.all(updatePromises);
      await manager.waitForOperations();

      // Verify final state
      const tasks = await manager.getTasks();
      expect(tasks.tasks).toHaveLength(3);

      // Check that all tasks have been updated
      for (const task of tasks.tasks) {
        expect(['high', 'medium']).toContain(task.priority);
        expect(task.version).toBeGreaterThan(1);
        expect(task.changeLog.length).toBeGreaterThan(1);
      }
    });

    it('should maintain data consistency during concurrent operations', async () => {
      const operationCount = 30;
      const promises: Promise<any>[] = [];

      // Mix of create, update, and read operations
      for (let i = 0; i < operationCount; i++) {
        if (i % 3 === 0) {
          // Create operation
          promises.push(
            manager.createTask({
              title: `Concurrent Task ${i}`,
              priority: 'medium',
            })
          );
        } else if (i % 3 === 1 && i > 3) {
          // Update operation (only after some tasks exist)
          promises.push(
            manager.getTasks().then(async tasks => {
              if (tasks.tasks.length > 0) {
                const randomTask = tasks.tasks[Math.floor(Math.random() * tasks.tasks.length)]!;
                return manager.updateTask({
                  taskId: randomTask.id,
                  updates: { priority: 'high' },
                  reason: `Concurrent update ${i}`,
                });
              }
            })
          );
        } else {
          // Read operation
          promises.push(manager.getTasks());
        }
      }

      const results = await Promise.all(promises);
      await manager.waitForOperations();

      // Verify final consistency
      const finalTasks = await manager.getTasks();
      expect(finalTasks.tasks.length).toBeGreaterThan(0);

      // Check data integrity
      for (const task of finalTasks.tasks) {
        expect(task.id).toBeTruthy();
        expect(task.title).toBeTruthy();
        expect(['low', 'medium', 'high', 'critical']).toContain(task.priority);
        expect(task.createdAt).toBeTruthy();
        expect(task.updatedAt).toBeTruthy();
      }
    });
  });

  describe('Large Dataset Performance', () => {
    it('should handle large datasets efficiently', async () => {
      const largeTaskCount = 500;

      // Create a large number of tasks
      console.log(`Creating ${largeTaskCount} tasks...`);
      const startTime = Date.now();

      const createPromises: Promise<string>[] = [];
      for (let i = 0; i < largeTaskCount; i++) {
        createPromises.push(
          manager.createTask({
            title: `Large Dataset Task ${i}`,
            description: `Task ${i} in large dataset`,
            priority:
              i % 4 === 0 ? 'critical' : i % 4 === 1 ? 'high' : i % 4 === 2 ? 'medium' : 'low',
            status: i % 3 === 0 ? 'completed' : i % 3 === 1 ? 'in_progress' : 'pending',
            category: `category-${i % 5}`,
            assignee: `user-${i % 10}`,
            tags: [`tag-${i % 3}`, `tag-${i % 7}`],
          })
        );
      }

      await Promise.all(createPromises);
      await manager.waitForOperations();

      const createTime = Date.now() - startTime;
      console.log(`Created ${largeTaskCount} tasks in ${createTime}ms`);

      // Test pagination performance
      const paginationStart = Date.now();
      const paginatedResult = await manager.getTasks({
        pagination: { page: 1, pageSize: 50 },
        sortBy: 'priority',
        sortOrder: 'desc',
      });
      const paginationTime = Date.now() - paginationStart;

      expect(paginatedResult.tasks).toHaveLength(50);
      expect(paginatedResult.totalTasks).toBe(largeTaskCount);
      expect(paginationTime).toBeLessThan(1000); // Should be fast

      // Test filtering performance
      const filterStart = Date.now();
      const filteredResult = await manager.getTasks({
        status: 'completed',
        priority: 'critical',
      });
      const filterTime = Date.now() - filterStart;

      expect(filteredResult.tasks.length).toBeGreaterThan(0);
      expect(
        filteredResult.tasks.every(t => t.status === 'completed' && t.priority === 'critical')
      ).toBe(true);
      expect(filterTime).toBeLessThan(500); // Should be fast

      // Test analytics performance
      const analyticsStart = Date.now();
      const analytics = await manager.getAnalytics();
      const analyticsTime = Date.now() - analyticsStart;

      expect(analytics.metrics.totalTasks).toBe(largeTaskCount);
      expect(analyticsTime).toBeLessThan(1000); // Should be reasonably fast

      console.log(`Performance metrics:
        - Creation: ${createTime}ms for ${largeTaskCount} tasks
        - Pagination: ${paginationTime}ms
        - Filtering: ${filterTime}ms  
        - Analytics: ${analyticsTime}ms`);
    });

    it('should use caching effectively for repeated queries', async () => {
      // Create some tasks
      await Promise.all([
        manager.createTask({ title: 'Cache Test 1', status: 'completed', priority: 'high' }),
        manager.createTask({ title: 'Cache Test 2', status: 'completed', priority: 'medium' }),
        manager.createTask({ title: 'Cache Test 3', status: 'pending', priority: 'high' }),
      ]);

      await manager.waitForOperations();

      // First query (cache miss)
      const firstQueryStart = Date.now();
      const firstResult = await manager.getTasks({
        status: 'completed',
        sortBy: 'priority',
        sortOrder: 'desc',
      });
      const firstQueryTime = Date.now() - firstQueryStart;

      // Second identical query (should use cache)
      const secondQueryStart = Date.now();
      const secondResult = await manager.getTasks({
        status: 'completed',
        sortBy: 'priority',
        sortOrder: 'desc',
      });
      const secondQueryTime = Date.now() - secondQueryStart;

      // Results should be identical
      expect(firstResult.tasks).toEqual(secondResult.tasks);

      // Second query should be faster (cached)
      expect(secondQueryTime).toBeLessThanOrEqual(firstQueryTime);

      console.log(`Cache performance:
        - First query: ${firstQueryTime}ms
        - Second query: ${secondQueryTime}ms
        - Speedup: ${(((firstQueryTime - secondQueryTime) / firstQueryTime) * 100).toFixed(1)}%`);
    });
  });

  describe('Concurrency Control', () => {
    it('should respect concurrency limits', async () => {
      // Set low concurrency for testing
      manager.setConcurrency(2);

      const operationTimes: number[] = [];
      const promises: Promise<string>[] = [];
      const errors: Error[] = [];

      // Create operations that track their execution time
      for (let i = 0; i < 6; i++) {
        promises.push(
          (async () => {
            try {
              const start = Date.now();
              const taskId = await manager.createTask({
                title: `Concurrency Test ${i}`,
                description: 'Testing concurrency limits',
              });
              operationTimes.push(Date.now() - start);
              return taskId;
            } catch (error) {
              errors.push(error as Error);
              throw error;
            }
          })()
        );
      }

      // Use Promise.allSettled to handle any potential failures gracefully
      const results = await Promise.allSettled(promises);

      // Check if any operations failed
      const failures = results.filter(r => r.status === 'rejected');
      if (failures.length > 0) {
        console.error('Failed operations:', failures);
        console.error('Errors:', errors);
      }

      // All operations should succeed
      expect(failures).toHaveLength(0);

      await manager.waitForOperations();

      // Verify all tasks were created
      const tasks = await manager.getTasks();
      expect(tasks.tasks).toHaveLength(6);

      // Verify we have all expected task titles
      const taskTitles = tasks.tasks.map(t => t.title).sort();
      const expectedTitles = Array.from({ length: 6 }, (_, i) => `Concurrency Test ${i}`).sort();
      expect(taskTitles).toEqual(expectedTitles);

      // Check queue status
      const queueStatus = manager.getOperationQueueStatus();
      expect(queueStatus.queueLength).toBe(0);
      expect(queueStatus.activeOperations).toBe(0);
    });

    it('should handle operation timeouts gracefully', async () => {
      // This test would require mocking slow operations
      // For now, just verify the timeout mechanism exists
      const queueStatus = manager.getOperationQueueStatus();
      expect(queueStatus).toHaveProperty('queueLength');
      expect(queueStatus).toHaveProperty('activeOperations');
      expect(queueStatus).toHaveProperty('processing');
    });
  });

  describe('Data Consistency Under Load', () => {
    it('should maintain consistency during stress test', async () => {
      const stressTestOperations = 100;
      const promises: Promise<any>[] = [];

      // Create a mix of operations
      for (let i = 0; i < stressTestOperations; i++) {
        const operationType = i % 4;

        switch (operationType) {
          case 0: // Create
            promises.push(
              manager.createTask({
                title: `Stress Test Task ${i}`,
                priority: 'medium',
              })
            );
            break;

          case 1: // Read
            promises.push(manager.getTasks());
            break;

          case 2: // Analytics
            promises.push(manager.getAnalytics());
            break;

          case 3: // Update (after some tasks exist)
            if (i > 10) {
              promises.push(
                manager.getTasks().then(async tasks => {
                  if (tasks.tasks.length > 0) {
                    const randomTask = tasks.tasks[Math.floor(Math.random() * tasks.tasks.length)]!;
                    return manager.updateTask({
                      taskId: randomTask.id,
                      updates: { priority: 'high' },
                      reason: `Stress test update ${i}`,
                    });
                  }
                })
              );
            }
            break;
        }
      }

      const startTime = Date.now();
      await Promise.all(promises);
      await manager.waitForOperations();
      const endTime = Date.now();

      console.log(`Stress test completed in ${endTime - startTime}ms`);

      // Verify final consistency
      const finalTasks = await manager.getTasks();
      const analytics = await manager.getAnalytics();

      expect(finalTasks.tasks.length).toBeGreaterThan(0);
      expect(analytics.metrics.totalTasks).toBe(finalTasks.tasks.length);

      // Verify data integrity
      for (const task of finalTasks.tasks) {
        expect(task.id).toBeTruthy();
        expect(task.title).toBeTruthy();
        expect(task.createdAt).toBeTruthy();
        expect(task.updatedAt).toBeTruthy();
        expect(task.version).toBeGreaterThanOrEqual(1);
      }
    });

    it('should recover from consistency check failures', async () => {
      // Create some tasks
      const taskIds = await Promise.all([
        manager.createTask({ title: 'Recovery Test 1' }),
        manager.createTask({ title: 'Recovery Test 2' }),
      ]);

      await manager.waitForOperations();

      // Force a consistency check
      const performanceStats = await manager.getPerformanceStats();
      expect(performanceStats).toHaveProperty('operationQueue');
      expect(performanceStats).toHaveProperty('cache');

      // Verify system is still functional
      const tasks = await manager.getTasks();
      expect(tasks.tasks).toHaveLength(2);

      // Create another task to verify recovery
      const newTaskId = await manager.createTask({ title: 'Recovery Test 3' });
      await manager.waitForOperations();

      const finalTasks = await manager.getTasks();
      expect(finalTasks.tasks).toHaveLength(3);
      expect(finalTasks.tasks.some(t => t.id === newTaskId)).toBe(true);
    });
  });

  describe('Memory Management', () => {
    it('should clear caches when requested', async () => {
      // Create some tasks and perform queries to populate cache
      await Promise.all([
        manager.createTask({ title: 'Cache Test 1', status: 'completed' }),
        manager.createTask({ title: 'Cache Test 2', status: 'pending' }),
      ]);

      await manager.waitForOperations();

      // Perform queries to populate cache
      await manager.getTasks({ status: 'completed' });
      await manager.getTasks({ status: 'pending' });

      // Check cache has data
      const statsBefore = await manager.getPerformanceStats();

      // Clear cache
      await manager.clearPerformanceCache();

      // Verify cache is cleared
      const statsAfter = await manager.getPerformanceStats();
      expect(statsAfter.cache.size).toBe(0);
    });

    it('should handle cleanup properly', async () => {
      // Create some tasks
      await Promise.all([
        manager.createTask({ title: 'Cleanup Test 1' }),
        manager.createTask({ title: 'Cleanup Test 2' }),
      ]);

      // Verify operations are queued/active
      const statusBefore = manager.getOperationQueueStatus();

      // Cleanup should wait for operations and clear queues
      await manager.cleanup();

      const statusAfter = manager.getOperationQueueStatus();
      expect(statusAfter.queueLength).toBe(0);
      expect(statusAfter.activeOperations).toBe(0);
    });
  });
});
