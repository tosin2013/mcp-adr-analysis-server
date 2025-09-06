// Smoke test for pre-commit hook
// This test should always pass and provides a quick validation that the test environment works

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
    // Test that we can import from Node.js built-ins (ES module style)
    import('path').then(path => {
      expect(typeof path.join).toBe('function');
    });
    // Simpler test that works in current context
    expect(typeof process).toBe('object');
  });

  it('should validate TypeScript compilation environment', () => {
    // Test that TypeScript features work in the test environment
    const testObj: { [key: string]: number } = { a: 1, b: 2 };
    expect(Object.keys(testObj)).toHaveLength(2);
  });
});
