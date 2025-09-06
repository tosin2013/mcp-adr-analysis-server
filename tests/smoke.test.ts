
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
});
