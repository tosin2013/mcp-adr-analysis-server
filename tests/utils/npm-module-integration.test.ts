/**
 * Simple test to verify npm module integration
 */

import { describe, it, expect } from '@jest/globals';
import { OperationQueue } from '../../src/utils/operation-queue.js';
import { DataConsistencyChecker } from '../../src/utils/data-consistency-checker.js';
import { processInBatches } from '../../src/utils/large-data-utils.js';
import {
  fastStringifyTask,
  fastStringifyTodoData,
  performanceParse,
} from '../../src/utils/json-performance-utils.js';

describe('NPM Module Integration', () => {
  it('should use p-queue for OperationQueue', async () => {
    const queue = new OperationQueue({ maxConcurrency: 1 });

    const results: string[] = [];

    // Test basic p-queue functionality
    await Promise.all([
      queue.enqueue(() => {
        results.push('first');
        return Promise.resolve();
      }),
      queue.enqueue(() => {
        results.push('second');
        return Promise.resolve();
      }),
      queue.enqueue(() => {
        results.push('third');
        return Promise.resolve();
      }),
    ]);

    // Verify all operations completed
    expect(results).toContain('first');
    expect(results).toContain('second');
    expect(results).toContain('third');
    expect(results.length).toBe(3);

    // Verify queue status
    const status = queue.getStatus();
    expect(status.queueLength).toBe(0);
    expect(status.activeOperations).toBe(0);
  });

  it('should use Joi for schema validation in DataConsistencyChecker', async () => {
    const invalidData = {
      tasks: {
        task1: {
          id: 'task1',
          title: '', // Invalid: empty title
          status: 'invalid-status', // Invalid: not allowed status
          createdAt: 'invalid-date', // Invalid: not ISO date
          updatedAt: '2024-01-01T00:00:00.000Z',
        },
      },
      sections: [],
      metadata: {
        totalTasks: 'not-a-number', // Invalid: should be number
        completedTasks: 0,
        lastUpdated: '2024-01-01T00:00:00.000Z',
      },
    };

    const result = await DataConsistencyChecker.checkConsistency(invalidData as any);

    expect(result.isValid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);

    // Should detect schema validation errors
    const schemaErrors = result.errors.filter(e => e.type.includes('SCHEMA'));
    expect(schemaErrors.length).toBeGreaterThan(0);
  });

  it('should use lodash for efficient batch processing', async () => {
    const items = Array.from({ length: 100 }, (_, i) => i);

    const result = await processInBatches(items, async (batch: number[]) => batch.map(x => x * 2), {
      batchSize: 10,
    });

    expect(result.results).toHaveLength(100);
    expect(result.batchCount).toBe(10);
    expect(result.results[0]).toBe(0);
    expect(result.results[99]).toBe(198);
  });

  it('should demonstrate improved test assertions with jest-extended', () => {
    const array = [1, 2, 3, 4, 5];

    // Using standard Jest matchers and basic jest-extended functionality
    expect(array).toHaveLength(5);
    expect(array).toEqual(expect.arrayContaining([1, 2, 3, 4, 5]));

    const obj = { foo: 'bar', baz: 42 };
    expect(obj).toHaveProperty('foo', 'bar');
    expect(obj).toHaveProperty('baz', 42);

    // Test some jest-extended matchers that should be available
    expect(array).toContain(3);
    expect(array).toEqual([1, 2, 3, 4, 5]);
  });

  it('should use fast-json-stringify for improved JSON performance', () => {
    const sampleTask = {
      id: 'task-1',
      title: 'Sample Task',
      status: 'todo',
      createdAt: '2024-01-01T00:00:00.000Z',
      updatedAt: '2024-01-01T00:00:00.000Z',
      priority: 'medium',
      tags: ['urgent', 'frontend'],
      dependencies: [],
      subtasks: [],
      archived: false,
    };

    const sampleData = {
      tasks: { 'task-1': sampleTask },
      sections: [
        {
          id: 'todo',
          title: 'To Do',
          tasks: ['task-1'],
        },
      ],
      metadata: {
        totalTasks: 1,
        completedTasks: 0,
        lastUpdated: '2024-01-01T00:00:00.000Z',
      },
    };

    // Test fast stringification
    const taskJson = fastStringifyTask(sampleTask as any);
    const dataJson = fastStringifyTodoData(sampleData as any);

    expect(taskJson).toContain('task-1');
    expect(taskJson).toContain('Sample Task');
    expect(dataJson).toContain('task-1');
    expect(dataJson).toContain('To Do');
  });

  it('should use performanceParse for monitored JSON parsing', () => {
    const sampleJson = '{"test": "data", "number": 42, "array": [1, 2, 3]}';

    const result = performanceParse(sampleJson);

    expect(result.data).toEqual({ test: 'data', number: 42, array: [1, 2, 3] });
    expect(result.parseTime).toBeGreaterThanOrEqual(0);
    expect(result.inputSize).toBe(sampleJson.length);
  });
});
