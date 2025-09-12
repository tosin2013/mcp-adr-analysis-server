/**
 * Enhanced Jest test setup file
 * Configures global test environment with proper resource management and cleanup
 * Enhanced with jest-extended for better assertions
 */

import { jest } from '@jest/globals';
import 'jest-extended';
import { testInfrastructure } from './utils/test-infrastructure.js';

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

// Set test environment to disable AI execution (force prompt-only mode)
process.env.EXECUTION_MODE = 'prompt-only';

// Configure timeouts based on test environment
const config = testInfrastructure.getConfig();
const isIntegrationTest = process.argv.some(arg => arg.includes('integration'));
const isPerformanceTest =
  process.argv.some(arg => arg.includes('performance')) ||
  process.env.MCP_ADR_PERFORMANCE_TEST === 'true';

let testTimeout = config.timeouts.unit;
if (isPerformanceTest) {
  testTimeout = config.timeouts.performance;
} else if (isIntegrationTest) {
  testTimeout = config.timeouts.integration;
}

jest.setTimeout(testTimeout);

// Mock console methods to reduce noise in tests
const originalConsole = global.console;
let consoleMocks: any = {};

beforeAll(async () => {
  // Setup console mocking
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

  // Record initial memory usage
  testInfrastructure.recordMemoryUsage();
});

afterAll(async () => {
  // Restore console
  global.console = originalConsole;

  try {
    // Quick cleanup without hanging
    await testInfrastructure.forceCleanup();

    // Report memory statistics
    const memStats = testInfrastructure.getMemoryStats();
    if (memStats.peak > config.resources.maxMemoryMB * 0.8) {
      console.warn(
        `High memory usage detected - Peak: ${memStats.peak.toFixed(2)}MB, Average: ${memStats.average.toFixed(2)}MB`
      );
    }
  } catch (error) {
    // Ignore cleanup errors in afterAll
  }
});

// Clean up after each test
afterEach(async () => {
  // Clear Jest mocks
  jest.clearAllMocks();
  jest.restoreAllMocks();

  // Record memory usage
  testInfrastructure.recordMemoryUsage();

  // Check for resource leaks
  const resourceStatus = testInfrastructure.getResourceStatus();
  if (resourceStatus.tempDirs > 10) {
    console.warn(`High temp directory count: ${resourceStatus.tempDirs}`);
  }
  if (resourceStatus.fileHandles > 20) {
    console.warn(`High file handle count: ${resourceStatus.fileHandles}`);
  }

  // Wait for any pending async operations to complete
  await new Promise(resolve => setImmediate(resolve));

  // Additional cleanup for specific test patterns
  if (global.gc && Math.random() < 0.1) {
    // Occasional garbage collection
    global.gc();
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
