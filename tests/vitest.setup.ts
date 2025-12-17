/**
 * Vitest Setup File
 *
 * This file runs before all tests and sets up the test environment.
 * Equivalent to Jest's setupFilesAfterEnv.
 */

import { beforeAll, afterAll, _beforeEach, _afterEach } from 'vitest';

// Set NODE_ENV for tests
process.env.NODE_ENV = 'test';

// Increase default timeout for all tests
beforeAll(() => {
  // Any global setup
});

afterAll(() => {
  // Any global cleanup
});

beforeEach(() => {
  // Reset any global state before each test
});

afterEach(() => {
  // Clean up after each test
});
