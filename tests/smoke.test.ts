// Smoke test for pre-commit hook
// This test should always pass and provides a quick validation that the test environment works

import { existsSync } from 'fs';
import { join } from 'path';

describe('Smoke Test', () => {
  it('should always pass - validates test environment', () => {
    expect(true).toBe(true);
  });

  it('should validate basic Jest functionality', () => {
    const result = 1 + 1;
    expect(result).toBe(2);
  });

  it('should validate environment variables', () => {
    // Basic check that we're in a test environment
    expect(process.env['NODE_ENV']).toBeDefined();
  });

  it('should validate basic module imports work', () => {
    // Test that basic Node.js globals and APIs are available
    expect(typeof process).toBe('object');
    expect(typeof global).toBe('object');
    
    // Test that basic Node.js modules are accessible via static imports
    expect(typeof existsSync).toBe('function');
    expect(typeof join).toBe('function');
  });

  it('should validate TypeScript compilation environment', () => {
    // Test that TypeScript features work in the test environment
    const testObj: { [key: string]: number } = { a: 1, b: 2 };
    expect(Object.keys(testObj)).toHaveLength(2);
  });
});
