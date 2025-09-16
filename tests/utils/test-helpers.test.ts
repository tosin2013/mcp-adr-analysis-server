/**
 * Tests for Enhanced Test Helper Utilities
 */

import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import {
  unitTest,
  integrationTest,
  performanceTest,
  createTestFile,
  createTestDirectory,
  createMockTimer,
  createMockInterval,
  expectMemoryUsage,
  expectNoResourceLeaks,
  waitForCondition,
  waitForAsyncOperations,
  createTimeoutError,
  createResourceError,
  generateLargeDataset,
  generateConcurrentOperations,
  createMockFunction,
  mockConsoleMethod,
  PerformanceBenchmark,
  createBenchmark,
  isCI,
  isCoverageRun,
  getTestTimeout,
  retryOperation,
  verifyCleanup,
  testInfrastructure,
} from './test-helpers.js';
import * as fs from 'fs/promises';
import * as path from 'path';

describe('Test Helper Utilities', () => {
  beforeEach(() => {
    testInfrastructure.recordMemoryUsage();
  });

  afterEach(async () => {
    await testInfrastructure.cleanup();
  });

  describe('Test Type Decorators', () => {
    it('should execute unit tests with proper timeout', done => {
      let testExecuted = false;

      // Create a mock test suite
      const mockDescribe = (name: string, fn: () => void) => fn();
      const mockIt = (name: string, testFn: () => Promise<void>) => {
        testFn()
          .then(() => {
            expect(testExecuted).toBe(true);
            done();
          })
          .catch(done);
      };

      // Temporarily replace global it
      const originalIt = global.it;
      (global as any).it = mockIt;

      try {
        unitTest('should execute test', async () => {
          testExecuted = true;
        });
      } finally {
        (global as any).it = originalIt;
      }
    });

    it('should handle test timeouts appropriately', () => {
      const unitTimeout = getTestTimeout('unit');
      const integrationTimeout = getTestTimeout('integration');
      const performanceTimeout = getTestTimeout('performance');

      expect(unitTimeout).toBeLessThan(integrationTimeout);
      expect(integrationTimeout).toBeLessThan(performanceTimeout);
      expect(unitTimeout).toBeGreaterThan(0);
    });
  });

  describe('File and Directory Helpers', () => {
    it('should create test files with content', async () => {
      const content = 'This is test content';
      const filePath = await createTestFile(content, 'test.txt');

      expect(filePath).toBeTruthy();
      expect(path.basename(filePath)).toBe('test.txt');

      const readContent = await fs.readFile(filePath, 'utf8');
      expect(readContent).toBe(content);
    });

    it('should create test directories with structure', async () => {
      const structure = {
        'file1.txt': 'Content 1',
        'subdir/file2.txt': 'Content 2',
        'subdir/nested/file3.txt': 'Content 3',
      };

      const dirPath = await createTestDirectory(structure);

      expect(dirPath).toBeTruthy();

      // Verify files exist and have correct content
      for (const [relativePath, expectedContent] of Object.entries(structure)) {
        const fullPath = path.join(dirPath, relativePath);
        const content = await fs.readFile(fullPath, 'utf8');
        expect(content).toBe(expectedContent);
      }
    });

    it('should track created files for cleanup', async () => {
      const initialStatus = testInfrastructure.getResourceStatus();

      await createTestFile('test content');
      await createTestDirectory({ 'test.txt': 'content' });

      const statusAfterCreation = testInfrastructure.getResourceStatus();
      expect(statusAfterCreation.tempDirs).toBeGreaterThan(initialStatus.tempDirs);
    });
  });

  describe('Timer and Async Helpers', () => {
    it('should create and track mock timers', async () => {
      const initialStatus = testInfrastructure.getResourceStatus();

      const timerPromise = createMockTimer(100);

      const statusAfterTimer = testInfrastructure.getResourceStatus();
      expect(statusAfterTimer.timers).toBeGreaterThan(initialStatus.timers);

      await timerPromise; // Wait for timer to complete
    });

    it('should create and track mock intervals', () => {
      let callCount = 0;
      const interval = createMockInterval(() => {
        callCount++;
      }, 50);

      expect(interval).toBeDefined();

      // Clean up interval
      clearInterval(interval);
    });

    it('should wait for conditions with timeout', async () => {
      let conditionMet = false;

      // Set condition to be met after 200ms
      setTimeout(() => {
        conditionMet = true;
      }, 200);

      await waitForCondition(() => conditionMet, 1000, 50);
      expect(conditionMet).toBe(true);
    });

    it('should timeout when condition is not met', async () => {
      await expect(waitForCondition(() => false, 100, 10)).rejects.toThrow(
        /Condition not met within 100ms/
      );
    });

    it('should wait for async operations', async () => {
      let operationComplete = false;

      // Start an async operation
      setTimeout(() => {
        operationComplete = true;
      }, 50);

      await waitForAsyncOperations(200);

      // Should have waited long enough for the operation
      expect(operationComplete).toBe(true);
    });
  });

  describe('Memory and Resource Monitoring', () => {
    it('should check memory usage expectations', () => {
      // This should not throw for reasonable memory usage
      expectMemoryUsage(1024); // 1GB limit

      // This should throw for unreasonably low limit
      expect(() => expectMemoryUsage(1)).toThrow();
    });

    it('should verify no resource leaks', () => {
      // Should not throw with clean state
      expectNoResourceLeaks();
    });

    it('should detect resource leaks when they occur', async () => {
      // Create many temp directories to simulate a leak
      const dirs = await Promise.all([
        createTestFile('test1'),
        createTestFile('test2'),
        createTestFile('test3'),
      ]);

      // This might detect the increased resource usage
      // (depending on the current state and thresholds)
      const status = testInfrastructure.getResourceStatus();
      expect(status.tempDirs).toBeGreaterThan(0);
    });
  });

  describe('Error Helpers', () => {
    it('should create timeout errors', () => {
      const error = createTimeoutError('Custom timeout message');

      expect(error).toBeInstanceOf(Error);
      expect(error.name).toBe('TimeoutError');
      expect(error.message).toBe('Custom timeout message');
    });

    it('should create resource errors', () => {
      const error = createResourceError('memory', 512);

      expect(error).toBeInstanceOf(Error);
      expect(error.name).toBe('ResourceError');
      expect(error.message).toContain('memory');
      expect(error.message).toContain('512');
    });
  });

  describe('Data Generation Helpers', () => {
    it('should generate large datasets', () => {
      const dataset = generateLargeDataset(100);

      expect(dataset).toHaveLength(100);
      expect(dataset[0]).toHaveProperty('id');
      expect(dataset[0]).toHaveProperty('data');
      expect(dataset[0].id).toBe('item-0');
      expect(dataset[99].id).toBe('item-99');

      // Verify uniqueness
      const ids = dataset.map(item => item.id);
      const uniqueIds = new Set(ids);
      expect(uniqueIds.size).toBe(100);
    });

    it('should generate concurrent operations', () => {
      const operations = generateConcurrentOperations(5, async index => {
        await new Promise(resolve => setTimeout(resolve, 10));
        return `result-${index}`;
      });

      expect(operations).toHaveLength(5);
      expect(operations[0]).toBeInstanceOf(Promise);
    });
  });

  describe('Mock Helpers', () => {
    it('should create mock functions with cleanup', () => {
      const mockFn = createMockFunction((x: number) => x * 2);

      expect(mockFn).toBeDefined();
      expect(jest.isMockFunction(mockFn)).toBe(true);

      const result = mockFn(5);
      expect(result).toBe(10);
      expect(mockFn).toHaveBeenCalledWith(5);
    });

    it('should mock console methods with cleanup', () => {
      const originalLog = console.log;
      const mockLog = mockConsoleMethod('log');

      console.log('test message');

      expect(mockLog).toHaveBeenCalledWith('test message');

      // Cleanup should restore original method
      // (this will be tested in the cleanup phase)
    });
  });

  describe('Performance Benchmarking', () => {
    it('should create and use performance benchmarks', async () => {
      const benchmark = createBenchmark();

      benchmark.start();

      // Simulate some work
      await new Promise(resolve => setTimeout(resolve, 100));

      benchmark.end();

      const duration = benchmark.getDuration();
      const memoryDelta = benchmark.getMemoryDelta();

      expect(duration).toBeGreaterThanOrEqual(99);
      expect(duration).toBeLessThan(200); // Should be close to 100ms
      expect(typeof memoryDelta).toBe('number');

      const report = benchmark.getReport();
      expect(report).toContain('Duration:');
      expect(report).toContain('Memory Delta:');
    });

    it('should validate performance expectations', async () => {
      const benchmark = createBenchmark();

      benchmark.start();
      await new Promise(resolve => setTimeout(resolve, 50));
      benchmark.end();

      // These should not throw
      benchmark.expectDurationLessThan(100);
      benchmark.expectMemoryDeltaLessThan(100); // 100MB limit

      // This should throw
      expect(() => benchmark.expectDurationLessThan(10)).toThrow();
    });
  });

  describe('Environment Detection', () => {
    it('should detect CI environment', () => {
      const originalCI = process.env.CI;

      process.env.CI = 'true';
      expect(isCI()).toBe(true);

      process.env.CI = 'false';
      expect(isCI()).toBe(false);

      delete process.env.CI;
      expect(isCI()).toBe(false);

      // Restore original value
      if (originalCI !== undefined) {
        process.env.CI = originalCI;
      }
    });

    it('should detect coverage runs', () => {
      const result = isCoverageRun();
      expect(typeof result).toBe('boolean');
    });
  });

  describe('Retry Operations', () => {
    it('should retry failed operations', async () => {
      let attemptCount = 0;

      const flakyOperation = async () => {
        attemptCount++;
        if (attemptCount < 3) {
          throw new Error(`Attempt ${attemptCount} failed`);
        }
        return 'success';
      };

      const result = await retryOperation(flakyOperation, 5, 10);

      expect(result).toBe('success');
      expect(attemptCount).toBe(3);
    });

    it('should fail after max retries', async () => {
      let attemptCount = 0;

      const alwaysFailOperation = async () => {
        attemptCount++;
        throw new Error(`Attempt ${attemptCount} failed`);
      };

      await expect(retryOperation(alwaysFailOperation, 3, 10)).rejects.toThrow('Attempt 3 failed');

      expect(attemptCount).toBe(3);
    });
  });

  describe('Cleanup Verification', () => {
    it('should verify cleanup without throwing', () => {
      // Should not throw in a clean state
      expect(() => verifyCleanup()).not.toThrow();
    });
  });
});

describe('PerformanceBenchmark Class', () => {
  let benchmark: PerformanceBenchmark;

  beforeEach(() => {
    benchmark = new PerformanceBenchmark();
  });

  it('should track timing correctly', async () => {
    jest.useFakeTimers();

    benchmark.start();
    const delay = new Promise(resolve => setTimeout(resolve, 100));

    // Advance timers by exactly 100ms to simulate the delay
    jest.advanceTimersByTime(100);

    await delay;
    benchmark.end();

    const duration = benchmark.getDuration();
    // With fake timers, we get precise timing
    expect(duration).toBe(100);

    jest.useRealTimers();
  });

  it('should track memory usage', () => {
    benchmark.start();

    // Allocate some memory
    const largeArray = new Array(10000).fill('test');

    benchmark.end();

    const memoryDelta = benchmark.getMemoryDelta();
    expect(typeof memoryDelta).toBe('number');

    // Keep reference to prevent garbage collection during test
    expect(largeArray.length).toBe(10000);
  });

  it('should generate comprehensive reports', async () => {
    benchmark.start();
    await new Promise(resolve => setTimeout(resolve, 50));
    benchmark.end();

    const report = benchmark.getReport();

    expect(report).toMatch(/Duration: \d+ms/);
    expect(report).toMatch(/Memory Delta: -?\d+\.\d+MB/);
  });
});
