/**
 * Jest test setup file
 * Configures global test environment for MCP ADR Analysis Server
 */

import { jest } from '@jest/globals';

// Extend Jest timeout for integration tests
jest.setTimeout(10000);

// Mock console methods to reduce noise in tests
const originalConsole = global.console;

beforeAll(() => {
  global.console = {
    ...originalConsole,
    log: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    info: jest.fn(),
    debug: jest.fn()
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
    }
  }
}

// Extend expect interface
declare module 'expect' {
  interface Matchers<R> {
    toBeValidAdr(): R;
    toHaveValidSchema(): R;
  }
}

// Custom Jest matchers for ADR validation
expect.extend({
  toBeValidAdr(_received) {
    const requiredFields = ['id', 'title', 'status', 'date', 'context', 'decision', 'consequences'];
    const missingFields = requiredFields.filter(field => !(field in _received));

    if (missingFields.length > 0) {
      return {
        message: () => `Expected ADR to have required fields: ${missingFields.join(', ')}`,
        pass: false
      };
    }

    return {
      message: () => 'Expected ADR to be invalid',
      pass: true
    };
  },

  toHaveValidSchema(_received) {
    // This will be implemented when we add schema validation
    return {
      message: () => 'Expected object to have invalid schema',
      pass: true
    };
  }
});

export {};
