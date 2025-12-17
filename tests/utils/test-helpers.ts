/**
 * Enhanced Test Helper Utilities
 * Provides utilities for different test types with proper resource management
 */

import { vi, type Mock } from 'vitest';
import { testInfrastructure, withTimeout, withResourceTracking } from './test-infrastructure.js';
import * as fs from 'fs/promises';
import * as path from 'path';

// Test type decorators
export function unitTest(name: string, testFn: () => Promise<void>): void {
  it(
    name,
    withTimeout(
      'unit',
      withResourceTracking(async () => {
        await testFn();
      })
    )
  );
}

export function integrationTest(name: string, testFn: () => Promise<void>): void {
  it(
    name,
    withTimeout(
      'integration',
      withResourceTracking(async () => {
        await testFn();
      })
    )
  );
}

export function performanceTest(name: string, testFn: () => Promise<void>): void {
  it(
    name,
    withTimeout(
      'performance',
      withResourceTracking(async () => {
        // Record initial memory
        testInfrastructure.recordMemoryUsage();

        const startTime = Date.now();
        await testFn();
        const endTime = Date.now();

        // Log performance metrics
        const duration = endTime - startTime;
        const memStats = testInfrastructure.getMemoryStats();

        console.log(
          `Performance Test "${name}": ${duration}ms, Memory: ${memStats.current.toFixed(2)}MB`
        );
      })
    )
  );
}

// Resource management helpers
export async function createTestFile(content: string, filename?: string): Promise<string> {
  const tempDir = await testInfrastructure.createTempDir('test-file-');
  const filePath = path.join(tempDir, filename || 'test-file.txt');

  await fs.writeFile(filePath, content, 'utf8');

  return filePath;
}

export async function createTestDirectory(structure: Record<string, string>): Promise<string> {
  const tempDir = await testInfrastructure.createTempDir('test-dir-');

  for (const [relativePath, content] of Object.entries(structure)) {
    const fullPath = path.join(tempDir, relativePath);
    const dirPath = path.dirname(fullPath);

    // Ensure directory exists
    await fs.mkdir(dirPath, { recursive: true });

    // Write file
    await fs.writeFile(fullPath, content, 'utf8');
  }

  return tempDir;
}

export function createMockTimer(delay: number = 100): Promise<void> {
  return new Promise(resolve => {
    const timer = setTimeout(resolve, delay);
    testInfrastructure.trackTimer(timer);
  });
}

export function createMockInterval(callback: () => void, interval: number = 100): NodeJS.Timeout {
  const intervalId = setInterval(callback, interval);
  testInfrastructure.trackInterval(intervalId);
  return intervalId;
}

// Memory and performance monitoring
export function expectMemoryUsage(maxMB: number): void {
  const memStats = testInfrastructure.getMemoryStats();
  expect(memStats.current).toBeLessThan(maxMB);
}

export function expectNoResourceLeaks(): void {
  const status = testInfrastructure.getResourceStatus();
  expect(status.tempDirs).toBeLessThan(10);
  expect(status.fileHandles).toBeLessThan(20);
  expect(status.timers).toBeLessThan(5);
  expect(status.intervals).toBeLessThan(5);
}

// Async operation helpers
export async function waitForCondition(
  condition: () => boolean | Promise<boolean>,
  timeout: number = 5000,
  interval: number = 100
): Promise<void> {
  const startTime = Date.now();

  while (Date.now() - startTime < timeout) {
    if (await condition()) {
      return;
    }
    await new Promise(resolve => setTimeout(resolve, interval));
  }

  throw new Error(`Condition not met within ${timeout}ms`);
}

export async function waitForAsyncOperations(maxWait: number = 1000): Promise<void> {
  // Wait for next tick
  await new Promise(resolve => setImmediate(resolve));

  // Wait for any pending promises
  await new Promise(resolve => setTimeout(resolve, 10));

  // Additional wait for complex async operations
  let waited = 0;
  while (waited < maxWait) {
    await new Promise(resolve => setTimeout(resolve, 50));
    waited += 50;

    // Check if we can break early (no pending operations)
    const status = testInfrastructure.getResourceStatus();
    if (status.timers === 0 && status.intervals === 0) {
      break;
    }
  }
}

// Error simulation helpers
export function createTimeoutError(message: string = 'Operation timed out'): Error {
  const error = new Error(message);
  error.name = 'TimeoutError';
  return error;
}

export function createResourceError(resource: string, limit: number): Error {
  const error = new Error(`${resource} limit exceeded: ${limit}`);
  error.name = 'ResourceError';
  return error;
}

// Test data generators
export function generateLargeDataset(size: number): Array<{ id: string; data: string }> {
  return Array.from({ length: size }, (_, i) => ({
    id: `item-${i}`,
    data: `test-data-${i}`.repeat(10), // Make each item reasonably sized
  }));
}

export function generateConcurrentOperations<T>(
  count: number,
  operationFactory: (index: number) => Promise<T>
): Promise<T>[] {
  return Array.from({ length: count }, (_, i) => operationFactory(i));
}

// Mock helpers with cleanup
export function createMockFunction<T extends (...args: any[]) => any>(implementation?: T): Mock<T> {
  const mockFn = vi.fn(implementation) as Mock<T>;

  // Add cleanup callback
  testInfrastructure.addCleanupCallback(async () => {
    mockFn.mockRestore();
  });

  return mockFn;
}

export function mockConsoleMethod(method: 'log' | 'warn' | 'error' | 'info' | 'debug'): Mock<any> {
  const originalMethod = console[method];
  const mockMethod = vi.fn();

  (console as any)[method] = mockMethod;

  testInfrastructure.addCleanupCallback(async () => {
    (console as any)[method] = originalMethod;
  });

  return mockMethod;
}

// Performance benchmarking
export class PerformanceBenchmark {
  private startTime: number = 0;
  private endTime: number = 0;
  private memoryStart: number = 0;
  private memoryEnd: number = 0;

  start(): void {
    this.startTime = Date.now();
    this.memoryStart = process.memoryUsage().heapUsed;
    testInfrastructure.recordMemoryUsage();
  }

  end(): void {
    this.endTime = Date.now();
    this.memoryEnd = process.memoryUsage().heapUsed;
    testInfrastructure.recordMemoryUsage();
  }

  getDuration(): number {
    return this.endTime - this.startTime;
  }

  getMemoryDelta(): number {
    return (this.memoryEnd - this.memoryStart) / 1024 / 1024; // MB
  }

  expectDurationLessThan(maxMs: number): void {
    expect(this.getDuration()).toBeLessThan(maxMs);
  }

  expectMemoryDeltaLessThan(maxMB: number): void {
    expect(Math.abs(this.getMemoryDelta())).toBeLessThan(maxMB);
  }

  getReport(): string {
    return `Duration: ${this.getDuration()}ms, Memory Delta: ${this.getMemoryDelta().toFixed(2)}MB`;
  }
}

export function createBenchmark(): PerformanceBenchmark {
  return new PerformanceBenchmark();
}

// Test environment helpers
export function isCI(): boolean {
  return process.env.CI === 'true';
}

export function isCoverageRun(): boolean {
  return process.argv.includes('--coverage') || process.env.NODE_ENV === 'test';
}

export function getTestTimeout(testType: 'unit' | 'integration' | 'performance'): number {
  return testInfrastructure.getTimeoutForTestType(testType);
}

// Retry helpers for flaky tests
export async function retryOperation<T>(
  operation: () => Promise<T>,
  maxRetries: number = 3,
  delay: number = 100
): Promise<T> {
  let lastError: Error;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error as Error;

      if (attempt === maxRetries) {
        throw lastError;
      }

      // Wait before retry
      await new Promise(resolve => setTimeout(resolve, delay * attempt));
    }
  }

  throw lastError!;
}

// Cleanup verification
export function verifyCleanup(): void {
  const status = testInfrastructure.getResourceStatus();
  const memStats = testInfrastructure.getMemoryStats();

  // Log status for debugging
  console.log('Resource Status:', status);
  console.log('Memory Stats:', memStats);

  // Verify no major leaks
  expect(status.tempDirs).toBeLessThan(20);
  expect(status.fileHandles).toBeLessThan(50);
  expect(status.timers).toBeLessThan(10);
  expect(status.intervals).toBeLessThan(10);
}

// Directory helper for tests
export function getCurrentDir(): string {
  return process.cwd();
}

export { testInfrastructure };
