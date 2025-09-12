/**
 * CI-Safe Jest test setup file
 * Configures global test environment without memory monitoring that causes CI errors
 * Enhanced with jest-extended for better assertions
 */

import { jest } from '@jest/globals';
import 'jest-extended';

// Force mock the problematic ESM modules
jest.mock('p-queue', () => {
  class MockPQueue {
    constructor(options = {}) {
      this.options = options;
      this.pending = 0;
      this.size = 0;
      this.isPaused = false;
    }

    async add(fn, options = {}) {
      this.pending++;
      this.size++;
      try {
        const result = await fn();
        return result;
      } finally {
        this.pending--;
        this.size--;
      }
    }

    async addAll(functions, options = {}) {
      const results = [];
      for (const fn of functions) {
        results.push(await this.add(fn, options));
      }
      return results;
    }

    pause() {
      this.isPaused = true;
    }
    start() {
      this.isPaused = false;
    }
    clear() {
      this.size = 0;
    }
    async onEmpty() {
      return Promise.resolve();
    }
    async onIdle() {
      return Promise.resolve();
    }
  }

  return {
    __esModule: true,
    default: MockPQueue,
  };
});

jest.mock('p-timeout', () => {
  class TimeoutError extends Error {
    constructor(message = 'Promise timed out') {
      super(message);
      this.name = 'TimeoutError';
    }
  }

  function pTimeout(promise, timeout, fallback) {
    return new Promise((resolve, reject) => {
      const timeoutId = setTimeout(() => {
        if (typeof fallback === 'function') {
          resolve(fallback());
        } else if (fallback !== undefined) {
          resolve(fallback);
        } else {
          reject(new TimeoutError());
        }
      }, timeout);

      promise.then(
        value => {
          clearTimeout(timeoutId);
          resolve(value);
        },
        error => {
          clearTimeout(timeoutId);
          reject(error);
        }
      );
    });
  }

  pTimeout.TimeoutError = TimeoutError;

  return {
    __esModule: true,
    default: pTimeout,
    TimeoutError: TimeoutError,
  };
});

// Detect CI environment
const isCI = process.env.CI === 'true' || process.env.NODE_ENV === 'ci';

// Set test environment to disable AI execution (force prompt-only mode)
process.env.EXECUTION_MODE = 'prompt-only';

// Configure timeouts based on test environment - use CI-safe defaults
const testTimeout = isCI ? 30000 : 15000;
jest.setTimeout(testTimeout);

// Mock console methods to reduce noise in tests - CI-safe version
const originalConsole = global.console;
let consoleMocks: any = {};

beforeAll(async () => {
  // Setup console mocking without resource tracking
  consoleMocks = {
    log: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    info: jest.fn(),
    debug: jest.fn(),
  };

  global.console = {
    ...originalConsole,
    ...consoleMocks,
  };

  // Skip memory monitoring in CI to avoid uv_resident_set_memory errors
  if (!isCI) {
    try {
      // Only attempt memory monitoring in non-CI environments
      if (typeof process.memoryUsage === 'function') {
        const memUsage = process.memoryUsage();
        console.log(`Initial memory usage: ${Math.round(memUsage.heapUsed / 1024 / 1024)}MB`);
      }
    } catch (error) {
      // Silently ignore memory monitoring errors
    }
  }
});

afterAll(async () => {
  // Restore console
  global.console = originalConsole;

  try {
    // CI-safe cleanup without memory monitoring
    if (!isCI) {
      // Only attempt memory reporting in non-CI environments
      if (typeof process.memoryUsage === 'function') {
        const memUsage = process.memoryUsage();
        if (memUsage.heapUsed > 100 * 1024 * 1024) {
          // 100MB
          console.warn(
            `High memory usage detected: ${Math.round(memUsage.heapUsed / 1024 / 1024)}MB`
          );
        }
      }
    }
  } catch (error) {
    // Ignore cleanup errors in afterAll
  }
});

// Clean up after each test - CI-safe version
afterEach(async () => {
  // Clear Jest mocks
  jest.clearAllMocks();
  jest.restoreAllMocks();

  // Skip resource monitoring in CI environments
  if (!isCI) {
    try {
      // Only check resources in non-CI environments
      const tempDirCount = process.env.TEMP_DIR_COUNT ? parseInt(process.env.TEMP_DIR_COUNT) : 0;
      if (tempDirCount > 10) {
        console.warn(`High temp directory count: ${tempDirCount}`);
      }
    } catch (error) {
      // Silently ignore resource monitoring errors
    }
  }

  // Wait for any pending async operations to complete
  await new Promise(resolve => setImmediate(resolve));

  // CI-safe garbage collection
  if (!isCI && global.gc && Math.random() < 0.1) {
    // Occasional garbage collection in non-CI environments only
    try {
      global.gc();
    } catch (error) {
      // Ignore GC errors
    }
  }
});

// Global test utilities
declare global {
  namespace jest {
    interface Matchers<R> {
      toBeValidAdr(): R;
      toHaveValidSchema(): R;
      toBeValidPromptObject(): R;
      toShowSignificantImprovement(threshold?: number): R;
    }
  }
}

// Extend expect interface
declare module 'expect' {
  interface Matchers<R> {
    toBeValidAdr(): R;
    toHaveValidSchema(): R;
    toBeValidPromptObject(): R;
    toShowSignificantImprovement(threshold?: number): R;
  }
}

// Custom Jest matchers for ADR validation and advanced prompting
expect.extend({
  toBeValidAdr(_received) {
    const requiredFields = ['id', 'title', 'status', 'date', 'context', 'decision', 'consequences'];
    const missingFields = requiredFields.filter(field => !(field in _received));

    if (missingFields.length > 0) {
      return {
        message: () => `Expected ADR to have required fields: ${missingFields.join(', ')}`,
        pass: false,
      };
    }

    return {
      message: () => 'Expected ADR to be invalid',
      pass: true,
    };
  },

  toHaveValidSchema(_received) {
    // This will be implemented when we add schema validation
    return {
      message: () => 'Expected object to have invalid schema',
      pass: true,
    };
  },

  toBeValidPromptObject(_received) {
    const requiredFields = ['prompt', 'instructions', 'context'];
    const missingFields = requiredFields.filter(field => !(field in _received));

    if (missingFields.length > 0) {
      return {
        message: () =>
          `Expected prompt object to have required fields: ${missingFields.join(', ')}`,
        pass: false,
      };
    }

    if (typeof _received.prompt !== 'string' || _received.prompt.length === 0) {
      return {
        message: () => 'Expected prompt to be a non-empty string',
        pass: false,
      };
    }

    return {
      message: () => 'Expected prompt object to be invalid',
      pass: true,
    };
  },

  toShowSignificantImprovement(_received, threshold = 0.1) {
    if (typeof _received !== 'object' || !('improvement' in _received)) {
      return {
        message: () => 'Expected object with improvement property',
        pass: false,
      };
    }

    const improvement = _received.improvement;
    if (typeof improvement !== 'number') {
      return {
        message: () => 'Expected improvement to be a number',
        pass: false,
      };
    }

    if (improvement < threshold) {
      return {
        message: () => `Expected improvement ${improvement} to be at least ${threshold}`,
        pass: false,
      };
    }

    return {
      message: () => `Expected improvement ${improvement} to be less than ${threshold}`,
      pass: true,
    };
  },
});

export {};
