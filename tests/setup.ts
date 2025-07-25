/**
 * Jest test setup file
 * Configures global test environment for MCP ADR Analysis Server
 */

import { jest } from '@jest/globals';

// Extend Jest timeout for integration tests and advanced prompting tests
jest.setTimeout(15000);

// Mock console methods to reduce noise in tests
const originalConsole = global.console;

beforeAll(() => {
  global.console = {
    ...originalConsole,
    log: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    info: jest.fn(),
    debug: jest.fn(),
  };
});

afterAll(() => {
  global.console = originalConsole;
});

// Clean up after each test
afterEach(() => {
  jest.clearAllMocks();
  jest.restoreAllMocks();
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
        message: () => `Expected prompt object to have required fields: ${missingFields.join(', ')}`,
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
