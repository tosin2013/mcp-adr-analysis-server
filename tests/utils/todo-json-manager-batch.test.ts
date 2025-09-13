/**
 * Unit tests for TodoJsonManager batch operations
 * Tests bulk operations, performance, and memory handling
 */

import { jest } from '@jest/globals';
import { TodoJsonManager } from '../../src/utils/todo-json-manager.js';
import { performanceTest, integrationTest, unitTest, PerformanceBenchmark } from './test-helpers.js';
import { testInfrastructure, createTempDir } from './test-infrastructure.js';
import * as fs from 'fs/promises';
import * as path from 'path';

describe('TodoJsonManager Batch Operations', () => {
  let todoManager: TodoJsonManager;
  let tempDir: string;

  beforeEach(async () => {
    tempDir = await createTempDir('todo-batch-test-');
    todoManager = new TodoJsonManager({
      storageDir: tempDir,
      cacheEnabled: true,
      validateTasks: true,
    });

    await todoManager.initialize();
  });

  afterEach(async () => {
    await testInfrastructure.cleanup();
  });

  describe('Batch Task Creation', () => {
    unitTest('should create multiple tasks efficiently', async () => {
      const tasksData = [
        { title: 'Task 1', description: 'First task', priority: 'high' as const },
        { title: 'Task 2', description: 'Second task', priority: 'medium' as const },
        { title: 'Task 3', description: 'Third task', priority: 'low' as const },
      ];

      const taskIds = await todoManager.createTasksBatch(tasksData);

      expect(taskIds).toHaveLength(3);
      expect(taskIds.every(id => typeof id === 'string')).toBe(true);

      // Verify tasks were created
      const tasks = await todoManager.getTasks();
      expect(tasks.tasks).toHaveLength(3);
      expect(tasks.tasks.map(t => t.title)).toEqual(['Task 1', 'Task 2', 'Task 3']);
    });

    unitTest('should handle empty batch creation', async () => {
      const taskIds = await todoManager.createTasksBatch([]);
      
      expect(taskIds).toEqual([]);
      
      const tasks = await todoManager.getTasks();
      expect(tasks.tasks).toHaveLength(0);
    });

    integrationTest('should create tasks with dependencies in batch', async () => {
      // First create some dependency tasks
      const dependencyTasks = await todoManager.createTasksBatch([
        { title: 'Dependency 1', description: 'First dependency' },
        { title: 'Dependency 2', description: 'Second dependency' },
      ]);

      // Then create tasks that depend on them
      const tasksData = [
        {
          title: 'Dependent Task 1',
          description: 'Depends on first',
          dependencies: [dependencyTasks[0]],
        },
        {
          title: 'Dependent Task 2', 
          description: 'Depends on second',
          dependencies: [dependencyTasks[1]],
        },
      ];

      const taskIds = await todoManager.createTasksBatch(tasksData);
      
      expect(taskIds).toHaveLength(2);
      
      // Verify dependencies were set correctly
      const tasks = await todoManager.getTasks();
      const createdTasks = taskIds.map(id => tasks.tasks.find(t => t.id === id)!);
      
      expect(createdTasks[0]!.dependencies).toEqual([dependencyTasks[0]]);
      expect(createdTasks[1]!.dependencies).toEqual([dependencyTasks[1]]);
    });

    performanceTest('should maintain performance under memory pressure', async () => {
      // Create a large batch that might cause memory pressure
      // Reduce size in CI to avoid timeouts
      const isCI = process.env.CI === 'true';
      const taskCount = isCI ? 100 : 500;
      const tasksData = Array.from({ length: taskCount }, (_, i) => ({
        title: `Memory Pressure Task ${i}`,
        description: `Long description for task ${i}`.repeat(10), // Make descriptions larger
        priority: ['low', 'medium', 'high', 'critical'][i % 4] as any,
        tags: Array.from({ length: 5 }, (_, j) => `tag-${i}-${j}`), // Multiple tags per task
      }));

      const startTime = Date.now();
      const initialMemory = process.memoryUsage().heapUsed;

      const taskIds = await todoManager.createTasksBatch(tasksData, {
        batchSize: 50, // Process in smaller batches
        validateBatch: false, // Skip validation for performance
      });

      const endTime = Date.now();
      const finalMemory = process.memoryUsage().heapUsed;
      const duration = endTime - startTime;
      const memoryDelta = finalMemory - initialMemory;

      expect(taskIds).toHaveLength(taskCount);
      expect(duration).toBeLessThan(isCI ? 30000 : 15000); // More time in CI
      
      // Memory should not grow excessively (allow up to 50MB growth)
      expect(memoryDelta).toBeLessThan(50 * 1024 * 1024);
      
      console.log(`Batch creation: ${taskCount} tasks in ${duration}ms, memory delta: ${Math.round(memoryDelta / 1024 / 1024)}MB`);
      
      // Verify a sample of tasks were created correctly
      const tasks = await todoManager.getTasks();
      expect(tasks.tasks).toHaveLength(taskCount);
      
      const firstTask = tasks.tasks.find(t => t.title === 'Memory Pressure Task 0');
      const lastTask = tasks.tasks.find(t => t.title === `Memory Pressure Task ${taskCount - 1}`);
      
      expect(firstTask).toBeDefined();
      expect(lastTask).toBeDefined();
      expect(firstTask!.tags).toHaveLength(5);
      expect(lastTask!.tags).toHaveLength(5);
    });
  });

  describe('Batch Task Updates', () => {
    unitTest('should update multiple tasks efficiently', async () => {
      // Create initial tasks
      const initialTasks = [
        { title: 'Task A', description: 'Original A', priority: 'low' as const },
        { title: 'Task B', description: 'Original B', priority: 'medium' as const },
        { title: 'Task C', description: 'Original C', priority: 'high' as const },
      ];

      const taskIds = await todoManager.createTasksBatch(initialTasks);
      
      // Batch update
      const updates = taskIds.map((id, index) => ({
        id,
        updates: {
          description: `Updated description ${index}`,
          priority: 'critical' as const,
          tags: [`updated-${index}`],
        },
      }));

      const updatedIds = await todoManager.updateTasksBatch(updates);
      
      expect(updatedIds).toEqual(taskIds);
      
      // Verify updates
      const tasks = await todoManager.getTasks();
      const updatedTasks = taskIds.map(id => tasks.tasks.find(t => t.id === id)!);
      
      updatedTasks.forEach((task, index) => {
        expect(task.description).toBe(`Updated description ${index}`);
        expect(task.priority).toBe('critical');
        expect(task.tags).toContain(`updated-${index}`);
      });
    });

    integrationTest('should handle partial batch update failures gracefully', async () => {
      // Create tasks
      const taskIds = await todoManager.createTasksBatch([
        { title: 'Task 1', description: 'First' },
        { title: 'Task 2', description: 'Second' },
        { title: 'Task 3', description: 'Third' },
      ]);

      // Try to update with one invalid task ID
      const updates = [
        { id: taskIds[0], updates: { description: 'Updated first' } },
        { id: 'invalid-id', updates: { description: 'This should fail' } },
        { id: taskIds[2], updates: { description: 'Updated third' } },
      ];

      // Should handle partial failures
      const results = await todoManager.updateTasksBatch(updates, {
        continueOnError: true,
      });

      // Should return successful IDs and skip invalid ones
      expect(results).toEqual([taskIds[0], taskIds[2]]);
      
      // Verify successful updates
      const tasks = await todoManager.getTasks();
      const firstTask = tasks.tasks.find(t => t.id === taskIds[0]);
      const thirdTask = tasks.tasks.find(t => t.id === taskIds[2]);
      
      expect(firstTask!.description).toBe('Updated first');
      expect(thirdTask!.description).toBe('Updated third');
    });
  });

  describe('Batch Task Deletion', () => {
    unitTest('should delete multiple tasks efficiently', async () => {
      // Create tasks to delete
      const taskIds = await todoManager.createTasksBatch([
        { title: 'Delete Me 1', description: 'Will be deleted' },
        { title: 'Delete Me 2', description: 'Will also be deleted' },
        { title: 'Keep Me', description: 'Will remain' },
      ]);

      // Delete first two tasks
      const toDelete = taskIds.slice(0, 2);
      const deletedIds = await todoManager.deleteTasksBatch(toDelete);
      
      expect(deletedIds).toEqual(toDelete);
      
      // Verify deletions
      const remainingTasks = await todoManager.getTasks();
      expect(remainingTasks.tasks).toHaveLength(1);
      expect(remainingTasks.tasks[0].title).toBe('Keep Me');
    });

    integrationTest('should handle cascading deletes with dependencies', async () => {
      // Create dependency chain
      const rootTask = await todoManager.createTask({
        title: 'Root Task',
        description: 'Will be deleted causing cascade',
      });

      const dependentTasks = await todoManager.createTasksBatch([
        { title: 'Dependent 1', dependencies: [rootTask] },
        { title: 'Dependent 2', dependencies: [rootTask] },
      ]);

      // Delete root task (should cascade)
      await todoManager.deleteTasksBatch([rootTask], {
        cascadeDelete: true,
      });

      // All tasks should be deleted due to cascade
      const remainingTasks = await todoManager.getTasks();
      expect(remainingTasks.tasks).toHaveLength(0);
    });
  });

  describe('Batch Operations with Validation', () => {
    integrationTest('should validate entire batch before processing', async () => {
      const mixedTasks = [
        { title: 'Valid Task', description: 'This is valid' },
        { title: '', description: 'Invalid: empty title' }, // Invalid
        { title: 'Another Valid', description: 'Also valid' },
      ];

      // Should fail validation and not create any tasks
      await expect(
        todoManager.createTasksBatch(mixedTasks, { validateBatch: true })
      ).rejects.toThrow(/validation/i);
      
      // No tasks should have been created
      const tasks = await todoManager.getTasks();
      expect(tasks.tasks).toHaveLength(0);
    });

    integrationTest('should allow partial processing with validation disabled', async () => {
      const mixedTasks = [
        { title: 'Valid Task 1', description: 'This is valid' },
        { title: '', description: 'Invalid: empty title' }, // Invalid
        { title: 'Valid Task 2', description: 'Also valid' },
      ];

      // Should create valid tasks and skip invalid ones
      const taskIds = await todoManager.createTasksBatch(mixedTasks, {
        validateBatch: false,
        continueOnError: true,
      });
      
      // Should create only valid tasks
      expect(taskIds).toHaveLength(2);
      
      const tasks = await todoManager.getTasks();
      expect(tasks.tasks).toHaveLength(2);
      expect(tasks.tasks.map(t => t.title)).toEqual(['Valid Task 1', 'Valid Task 2']);
    });
  });

  describe('Performance Benchmarking', () => {
    performanceTest('should efficiently handle large batch operations', async () => {
      const benchmark = new PerformanceBenchmark();
      const batchSize = process.env.CI === 'true' ? 200 : 1000;
      
      benchmark.start();
      
      // Create large batch
      const largeBatch = Array.from({ length: batchSize }, (_, i) => ({
        title: `Perf Test Task ${i}`,
        description: `Performance testing task number ${i}`,
        priority: ['low', 'medium', 'high'][i % 3] as any,
      }));

      const createStart = Date.now();
      const taskIds = await todoManager.createTasksBatch(largeBatch);
      const createTime = Date.now() - createStart;

      // Update half of them
      const updateBatch = taskIds.slice(0, Math.floor(batchSize / 2)).map(id => ({
        id,
        updates: { description: 'Updated in batch' },
      }));

      const updateStart = Date.now();
      await todoManager.updateTasksBatch(updateBatch);
      const updateTime = Date.now() - updateStart;

      // Delete quarter of them
      const deleteBatch = taskIds.slice(0, Math.floor(batchSize / 4));
      
      const deleteStart = Date.now();
      await todoManager.deleteTasksBatch(deleteBatch);
      const deleteTime = Date.now() - deleteStart;

      benchmark.end();
      
      const totalTime = benchmark.getDuration();
      const memoryDelta = benchmark.getMemoryDelta();
      
      // Performance expectations (more lenient for CI)
      const timeLimit = process.env.CI === 'true' ? 60000 : 30000;
      expect(totalTime).toBeLessThan(timeLimit);
      
      // Log performance metrics
      console.log(`\nBatch Performance (${batchSize} tasks):`);
      console.log(`  Create: ${createTime}ms (${(batchSize / createTime * 1000).toFixed(0)} tasks/sec)`);
      console.log(`  Update: ${updateTime}ms (${(updateBatch.length / updateTime * 1000).toFixed(0)} tasks/sec)`);
      console.log(`  Delete: ${deleteTime}ms (${(deleteBatch.length / deleteTime * 1000).toFixed(0)} tasks/sec)`);
      console.log(`  Total: ${totalTime}ms, Memory: ${Math.round(memoryDelta / 1024 / 1024)}MB`);
      
      // Verify final state
      const finalTasks = await todoManager.getTasks();
      const expectedCount = batchSize - deleteBatch.length;
      expect(finalTasks.tasks).toHaveLength(expectedCount);
    });
  });

  describe('Concurrency and Race Conditions', () => {
    integrationTest('should handle concurrent batch operations safely', async () => {
      const batch1 = Array.from({ length: 10 }, (_, i) => ({
        title: `Batch 1 Task ${i}`,
        description: `From first batch`,
      }));

      const batch2 = Array.from({ length: 10 }, (_, i) => ({
        title: `Batch 2 Task ${i}`,
        description: `From second batch`,
      }));

      const batch3 = Array.from({ length: 10 }, (_, i) => ({
        title: `Batch 3 Task ${i}`,
        description: `From third batch`,
      }));

      // Run all batches concurrently
      const [ids1, ids2, ids3] = await Promise.all([
        todoManager.createTasksBatch(batch1),
        todoManager.createTasksBatch(batch2),
        todoManager.createTasksBatch(batch3),
      ]);

      // All batches should succeed
      expect(ids1).toHaveLength(10);
      expect(ids2).toHaveLength(10);
      expect(ids3).toHaveLength(10);

      // Total should be 30 tasks
      const allTasks = await todoManager.getTasks();
      expect(allTasks.tasks).toHaveLength(30);

      // Each batch should be identifiable
      const batch1Tasks = allTasks.tasks.filter(t => t.description === 'From first batch');
      const batch2Tasks = allTasks.tasks.filter(t => t.description === 'From second batch');
      const batch3Tasks = allTasks.tasks.filter(t => t.description === 'From third batch');

      expect(batch1Tasks).toHaveLength(10);
      expect(batch2Tasks).toHaveLength(10);
      expect(batch3Tasks).toHaveLength(10);
    });
  });

  describe('Error Recovery', () => {
    integrationTest('should recover from disk write errors during batch operations', async () => {
      // Create initial successful batch
      const taskIds = await todoManager.createTasksBatch([
        { title: 'Task 1', description: 'First' },
        { title: 'Task 2', description: 'Second' },
      ]);

      // Simulate disk full by making directory read-only temporarily
      const dataFile = path.join(tempDir, 'todos.json');
      
      try {
        // Make file read-only to simulate write failure
        await fs.chmod(dataFile, 0o444);
        
        // This should fail but not crash
        await expect(
          todoManager.createTasksBatch([
            { title: 'Should Fail', description: 'This will fail to write' },
          ])
        ).rejects.toThrow();
        
      } finally {
        // Restore write permissions
        await fs.chmod(dataFile, 0o644);
      }

      // Manager should still be functional
      const newTaskIds = await todoManager.createTasksBatch([
        { title: 'Recovery Task', description: 'This should work after recovery' },
      ]);

      expect(newTaskIds).toHaveLength(1);
      
      const allTasks = await todoManager.getTasks();
      expect(allTasks.tasks).toHaveLength(3); // Original 2 + recovery task
    });
  });
});
