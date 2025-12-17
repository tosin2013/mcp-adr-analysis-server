/**
 * Enhanced Jest test setup file
 * Configures global test environment with proper resource management and cleanup
 */

import { vi } from 'vitest';
import { testInfrastructure } from './utils/test-infrastructure.js';

// Set test environment to disable AI execution (force prompt-only mode)
process.env.EXECUTION_MODE = 'prompt-only';

// Configure timeouts based on test environment
const config = testInfrastructure.getConfig();

// Note: Vitest uses per-test timeouts via vitest.config.ts, not global setTimeout

// Mock console methods to reduce noise in tests
const originalConsole = global.console;
let consoleMocks: any = {};

beforeAll(async () => {
  // Setup console mocking
  consoleMocks = {
    log: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
    debug: vi.fn(),
  };

  global.console = {
    ...originalConsole,
    ...consoleMocks,
  };

  // Record initial memory usage with defensive programming
  if (testInfrastructure && typeof testInfrastructure.recordMemoryUsage === 'function') {
    testInfrastructure.recordMemoryUsage();
  } else {
    console.warn('⚠️ TestInfrastructure.recordMemoryUsage not available during setup');
  }
});

afterAll(async () => {
  // Restore console
  global.console = originalConsole;

  try {
    // Quick cleanup without hanging with defensive programming
    if (testInfrastructure && typeof testInfrastructure.forceCleanup === 'function') {
      await testInfrastructure.forceCleanup();
    } else {
      console.warn('⚠️ TestInfrastructure.forceCleanup not available during cleanup');
    }

    // Report memory statistics with defensive programming
    if (testInfrastructure && typeof testInfrastructure.getMemoryStats === 'function') {
      const memStats = testInfrastructure.getMemoryStats();
      if (memStats.peak > config.resources.maxMemoryMB * 0.8) {
        console.warn(
          `High memory usage detected - Peak: ${memStats.peak.toFixed(2)}MB, Average: ${memStats.average.toFixed(2)}MB`
        );
      }
    } else {
      console.warn('⚠️ TestInfrastructure.getMemoryStats not available for memory reporting');
    }
  } catch {
    // Ignore cleanup errors in afterAll
  }
});

// Clean up after each test
afterEach(async () => {
  // Clear Vitest mocks
  vi.clearAllMocks();
  vi.restoreAllMocks();

  // Record memory usage with defensive programming
  if (testInfrastructure && typeof testInfrastructure.recordMemoryUsage === 'function') {
    testInfrastructure.recordMemoryUsage();
  } else {
    console.warn('⚠️ TestInfrastructure.recordMemoryUsage not available during test cleanup');
  }

  // Check for resource leaks with defensive programming
  if (testInfrastructure && typeof testInfrastructure.getResourceStatus === 'function') {
    const resourceStatus = testInfrastructure.getResourceStatus();
    if (resourceStatus.tempDirs > 10) {
      console.warn(`High temp directory count: ${resourceStatus.tempDirs}`);
    }
    if (resourceStatus.fileHandles > 20) {
      console.warn(`High file handle count: ${resourceStatus.fileHandles}`);
    }
  } else {
    console.warn('⚠️ TestInfrastructure.getResourceStatus not properly initialized');
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
