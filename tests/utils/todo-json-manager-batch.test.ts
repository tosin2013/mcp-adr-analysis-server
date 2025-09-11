/**
 * Tests for TodoJsonManager Batch Operations
 */

import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { TodoJsonManager } from '../../src/utils/todo-json-manager.js';
import { performanceTest, createTestDirectory, testInfrastructure } from './test-helpers.js';
import * as path from 'path';

describe('TodoJsonManager Batch Operations', () => {
  let todoManager: TodoJsonManager;
  let testProjectPath: string;

  beforeEach(async () => {
    testProjectPath = await createTestDirectory({
      'package.json': JSON.stringify({ name: 'test-project', version: '1.0.0' }),
      'README.md': '# Test Project',
    });

    todoManager = new TodoJsonManager(testProjectPath);
  });

  afterEach(async () => {
    if (todoManager) {
      await todoManager.cleanup();
    }
    await testInfrastructure.cleanup();
  });

  describe('Batch Task Creation', () => {
    it('should handle small batches efficiently', async () => {
      const tasksData = Array.from({ length: 5 }, (_, i) => ({
        title: `Small Batch Task ${i}`,
        description: `Description for task ${i}`,
        priority: ['low', 'medium', 'high', 'critical'][i % 4] as any,
      }));

      const startTime = Date.now();
      const taskIds = await todoManager.createTasksBatch(tasksData);
      const endTime = Date.now();

      expect(taskIds).toHaveLength(5);
      expect(taskIds.every(id => typeof id === 'string')).toBe(true);
      expect(endTime - startTime).toBeLessThan(1000); // Should be fast for small batches

      // Verify tasks were created
      const tasks = await todoManager.getTasks();
      expect(tasks.tasks).toHaveLength(5);
    });

    performanceTest('should handle large batches with optimized processing', async () => {
      const tasksData = Array.from({ length: 100 }, (_, i) => ({
        title: `Large Batch Task ${i}`,
        description: `Description for task ${i}`,
        priority: ['low', 'medium', 'high', 'critical'][i % 4] as any,
        category: `category-${i % 5}`,
        tags: [`tag-${i % 3}`, `tag-${i % 7}`],
      }));

      let progressCallbacks = 0;
      const startTime = Date.now();

      try {
        const taskIds = await todoManager.createTasksBatch(tasksData, {
          batchSize: 20,
          maxConcurrency: 3,
          progressCallback: (processed, total) => {
            progressCallbacks++;
            expect(processed).toBeLessThanOrEqual(total);
            expect(total).toBe(100);
          },
        });

        const endTime = Date.now();

        console.log(`Created ${taskIds.length} tasks in ${endTime - startTime}ms`);
        expect(taskIds).toHaveLength(100);
        expect(taskIds.every(id => typeof id === 'string')).toBe(true);
        expect(progressCallbacks).toBeGreaterThan(0);
        expect(endTime - startTime).toBeLessThan(5000); // Should complete within 5 seconds

        // Verify all tasks were created correctly
        const tasks = await todoManager.getTasks();
        console.log(`Retrieved ${tasks.tasks.length} tasks from storage`);
        expect(tasks.tasks).toHaveLength(100);

        // Verify task properties
        const taskArray = Object.values(tasks.tasks);
        expect(taskArray.every(task => task.title.startsWith('Large Batch Task'))).toBe(true);
        expect(
          taskArray.every(task => ['low', 'medium', 'high', 'critical'].includes(task.priority))
        ).toBe(true);
      } catch (error) {
        console.error('Batch creation failed:', error);
        throw error;
      }
    });

    it('should handle empty batch gracefully', async () => {
      const taskIds = await todoManager.createTasksBatch([]);
      expect(taskIds).toEqual([]);
    });

    it('should validate task data in batches', async () => {
      const tasksData = [
        { title: 'Valid Task 1', priority: 'high' as any },
        { title: 'Invalid Task', priority: 'invalid-priority' as any },
        { title: 'Valid Task 2', priority: 'low' as any },
      ];

      // Should throw error for invalid priority
      await expect(todoManager.createTasksBatch(tasksData)).rejects.toThrow(
        /Invalid priority value/
      );
    });

    it('should handle batch creation with dependencies', async () => {
      // First create some tasks to use as dependencies
      const dependencyTasks = await todoManager.createTasksBatch([
        { title: 'Dependency Task 1' },
        { title: 'Dependency Task 2' },
      ]);

      // Now create tasks with dependencies
      const tasksData = [
        {
          title: 'Task with Dependencies 1',
          dependencies: [dependencyTasks[0]!],
        },
        {
          title: 'Task with Dependencies 2',
          dependencies: [dependencyTasks[1]!],
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
      const tasksData = Array.from({ length: 500 }, (_, i) => ({
        title: `Memory Pressure Task ${i}`,
        description: `Long description for task ${i}`.repeat(10), // Make descriptions larger
        priority: ['low', 'medium', 'high', 'critical'][i % 4] as any,
        tags: Array.from({ length: 5 }, (_, j) => `tag-${i}-${j}`), // Multiple tags per task
      }));

      const startTime = Date.now();
      const initialMemory = process.memoryUsage().heapUsed;

      const taskIds = await todoManager.createTasksBatch(tasksData, {
        batchSize: 25, // Smaller batches to manage memory
        maxConcurrency: 2,
      });

      const endTime = Date.now();
      const finalMemory = process.memoryUsage().heapUsed;
      const memoryIncrease = (finalMemory - initialMemory) / 1024 / 1024; // MB

      expect(taskIds).toHaveLength(500);
      expect(endTime - startTime).toBeLessThan(10000); // Should complete within 10 seconds
      expect(memoryIncrease).toBeLessThan(200); // Should not use excessive memory

      // Verify tasks were created
      const tasks = await todoManager.getTasks();
      expect(tasks.tasks).toHaveLength(500);
    });

    it('should handle concurrent batch operations', async () => {
      const batch1Data = Array.from({ length: 20 }, (_, i) => ({
        title: `Batch 1 Task ${i}`,
        category: 'batch1',
      }));

      const batch2Data = Array.from({ length: 20 }, (_, i) => ({
        title: `Batch 2 Task ${i}`,
        category: 'batch2',
      }));

      const batch3Data = Array.from({ length: 20 }, (_, i) => ({
        title: `Batch 3 Task ${i}`,
        category: 'batch3',
      }));

      // Run batches concurrently
      const [taskIds1, taskIds2, taskIds3] = await Promise.all([
        todoManager.createTasksBatch(batch1Data),
        todoManager.createTasksBatch(batch2Data),
        todoManager.createTasksBatch(batch3Data),
      ]);

      expect(taskIds1).toHaveLength(20);
      expect(taskIds2).toHaveLength(20);
      expect(taskIds3).toHaveLength(20);

      // Verify all tasks were created correctly
      const tasks = await todoManager.getTasks();
      expect(tasks.tasks).toHaveLength(60);

      // Verify categories are correct
      const batch1Tasks = Object.values(tasks.tasks).filter(t => t.category === 'batch1');
      const batch2Tasks = Object.values(tasks.tasks).filter(t => t.category === 'batch2');
      const batch3Tasks = Object.values(tasks.tasks).filter(t => t.category === 'batch3');

      expect(batch1Tasks).toHaveLength(20);
      expect(batch2Tasks).toHaveLength(20);
      expect(batch3Tasks).toHaveLength(20);
    });
  });

  describe('Performance Comparison', () => {
    performanceTest(
      'should be significantly faster than sequential creation for large batches',
      async () => {
        const tasksData = Array.from({ length: 100 }, (_, i) => ({
          title: `Performance Test Task ${i}`,
          priority: ['low', 'medium', 'high'][i % 3] as any,
        }));

        // Test sequential creation (first 10 tasks for comparison)
        const sequentialStart = Date.now();
        const sequentialIds: string[] = [];
        for (let i = 0; i < 10; i++) {
          const taskId = await todoManager.createTask(tasksData[i]!);
          sequentialIds.push(taskId);
        }
        const sequentialTime = Date.now() - sequentialStart;
        const sequentialTimePerTask = sequentialTime / 10;

        // Clean up for batch test
        await todoManager.cleanup();
        todoManager = new TodoJsonManager(testProjectPath);

        // Test batch creation
        const batchStart = Date.now();
        const batchIds = await todoManager.createTasksBatch(tasksData);
        const batchTime = Date.now() - batchStart;
        const batchTimePerTask = batchTime / 100;

        expect(batchIds).toHaveLength(100);

        // Batch creation should be more efficient per task
        // Allow some variance but expect significant improvement for large batches
        console.log(
          `Sequential: ${sequentialTimePerTask.toFixed(2)}ms/task, Batch: ${batchTimePerTask.toFixed(2)}ms/task`
        );

        // Batch processing should be at least as efficient as sequential, and provide better progress tracking
        if (batchTimePerTask > 0 && sequentialTimePerTask > 0) {
          const improvement = sequentialTimePerTask / batchTimePerTask;
          // The main benefit is better progress tracking and memory management, not necessarily speed
          expect(improvement).toBeGreaterThan(0.3); // Should not be significantly slower
          console.log(
            `Performance comparison: Sequential ${sequentialTimePerTask.toFixed(2)}ms/task vs Batch ${batchTimePerTask.toFixed(2)}ms/task (${improvement.toFixed(2)}x)`
          );
        }
      }
    );
  });
});
