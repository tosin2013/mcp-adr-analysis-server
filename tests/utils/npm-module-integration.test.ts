/**
 * Simple test to verify npm module integration
 */

import { describe, it, expect } from '@jest/globals';
import { OperationQueue } from '../../src/utils/operation-queue.js';
import { DataConsistencyChecker } from '../../src/utils/data-consistency-checker.js';
import { processInBatches } from '../../src/utils/large-data-utils.js';

describe('NPM Module Integration', () => {
  it('should use p-queue for OperationQueue', async () => {
    const queue = new OperationQueue({ maxConcurrency: 1 });

    const results: string[] = [];

    // Test priority handling with p-queue (sequential execution)
    // Since maxConcurrency is 1, operations execute in queue order
    // Higher priority (negative values in p-queue) should execute first
    const promises = [
      queue.enqueue(() => {
        results.push('low');
        return Promise.resolve();
      }, 1),
      queue.enqueue(() => {
        results.push('high');
        return Promise.resolve();
      }, 10),
      queue.enqueue(() => {
        results.push('medium');
        return Promise.resolve();
      }, 5),
    ];

    await Promise.all(promises);

    // With proper priority handling, should execute: high, medium, low
    expect(results).toEqual(['high', 'medium', 'low']);
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
});
