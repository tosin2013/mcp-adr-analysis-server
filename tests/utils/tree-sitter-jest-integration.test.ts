/**
 * Test to verify tree-sitter gracefully handles Jest test environment
 *
 * This test ensures that:
 * 1. Tree-sitter parsers don't attempt to load in test environment
 * 2. No warnings are emitted during initialization
 * 3. Fallback analysis works correctly
 */

import { TreeSitterAnalyzer } from '../../src/utils/tree-sitter-analyzer.js';

describe('TreeSitter Jest Integration', () => {
  it('should initialize without loading parsers in test environment', () => {
    // Verify test environment is set
    expect(process.env.NODE_ENV).toBe('test');

    // Create analyzer - should not attempt to load native parsers
    const analyzer = new TreeSitterAnalyzer();
    expect(analyzer).toBeDefined();
  });

  it('should use fallback analysis when parsers are not available', async () => {
    const analyzer = new TreeSitterAnalyzer();

    // Test with a TypeScript file
    const code = `
      const password = "supersecret123";
      const apiKey = "AKIAIOSFODNN7EXAMPLE";

      function authenticateUser(username: string, pwd: string) {
        return true;
      }
    `;

    const result = await analyzer.analyzeFile('test.ts', code);

    // Should use fallback regex-based analysis
    expect(result.language).toBe('typescript');
    expect(result.secrets.length).toBeGreaterThan(0);
    expect(result.hasSecrets).toBe(true);
  });

  it('should analyze JavaScript without tree-sitter', async () => {
    const analyzer = new TreeSitterAnalyzer();

    const code = `
      const token = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.test";
      require('child_process').exec('ls');
    `;

    const result = await analyzer.analyzeFile('test.js', code);

    expect(result.language).toBe('javascript');
    expect(result.secrets.length).toBeGreaterThan(0);
  });

  it('should analyze Python without tree-sitter', async () => {
    const analyzer = new TreeSitterAnalyzer();

    const code = `
      api_key = "sk_test_1234567890abcdef"
      password = "mypassword123"

      import subprocess
      subprocess.call(['ls', '-la'])
    `;

    const result = await analyzer.analyzeFile('test.py', code);

    expect(result.language).toBe('python');
    expect(result.secrets.length).toBeGreaterThan(0);
  });

  it('should handle YAML without tree-sitter', async () => {
    const analyzer = new TreeSitterAnalyzer();

    const code = `
apiVersion: v1
kind: Pod
metadata:
  name: test-pod
spec:
  containers:
  - name: test
    image: nginx
    env:
    - name: PASSWORD
      value: "hardcoded-password"
    `;

    const result = await analyzer.analyzeFile('test.yaml', code);

    expect(result.language).toBe('yaml');
    expect(result.secrets.length).toBeGreaterThan(0);
  });

  it('should detect secrets in Dockerfile without tree-sitter', async () => {
    const analyzer = new TreeSitterAnalyzer();

    const code = `
FROM node:18
ENV API_KEY="sk_live_1234567890"
RUN echo "Building..."
USER root
    `;

    const result = await analyzer.analyzeFile('Dockerfile', code);

    expect(result.language).toBe('dockerfile');
    expect(result.secrets.length).toBeGreaterThan(0);
    expect(result.securityIssues.some(issue => issue.type === 'privilege_escalation')).toBe(true);
  });

  it('should analyze JSON configuration without tree-sitter', async () => {
    const analyzer = new TreeSitterAnalyzer();

    const code = `
{
  "database": {
    "password": "db_password_12345",
    "apiKey": "api_key_67890"
  }
}
    `;

    const result = await analyzer.analyzeFile('config.json', code);

    expect(result.language).toBe('json');
    expect(result.secrets.length).toBeGreaterThan(0);
  });

  it('should not emit warnings during initialization', () => {
    // Capture console.warn calls
    const originalWarn = console.warn;
    const warnings: any[] = [];
    console.warn = (...args: any[]) => warnings.push(args);

    // Create analyzer
    new TreeSitterAnalyzer();

    // Restore console.warn
    console.warn = originalWarn;

    // Should not have any warnings about parser loading
    const parserWarnings = warnings.filter(w =>
      w.some((arg: any) => String(arg).includes('Failed to load') || String(arg).includes('parser'))
    );

    expect(parserWarnings.length).toBe(0);
  });

  it('should handle unsupported file types gracefully', async () => {
    const analyzer = new TreeSitterAnalyzer();

    const code = `
Some random text file with
password: "test123"
and api_key: "key_abcdef"
    `;

    const result = await analyzer.analyzeFile('test.txt', code);

    expect(result.language).toBe('text');
    expect(result.secrets.length).toBeGreaterThan(0);
  });

  it('should create multiple analyzer instances without issues', () => {
    // Should not cause any issues creating multiple instances
    const analyzer1 = new TreeSitterAnalyzer();
    const analyzer2 = new TreeSitterAnalyzer();
    const analyzer3 = new TreeSitterAnalyzer();

    expect(analyzer1).toBeDefined();
    expect(analyzer2).toBeDefined();
    expect(analyzer3).toBeDefined();
  });

  it('should maintain functionality across different file types', async () => {
    const analyzer = new TreeSitterAnalyzer();

    const testCases = [
      { file: 'test.ts', code: 'const secret = "abc123";', language: 'typescript' },
      { file: 'test.js', code: 'var password = "pass123";', language: 'javascript' },
      { file: 'test.py', code: 'api_key = "key123"', language: 'python' },
      { file: 'test.yaml', code: 'password: "yaml123"', language: 'yaml' },
      { file: 'test.json', code: '{"secret": "json123"}', language: 'json' },
    ];

    for (const testCase of testCases) {
      const result = await analyzer.analyzeFile(testCase.file, testCase.code);
      expect(result.language).toBe(testCase.language);
      expect(result).toHaveProperty('secrets');
      expect(result).toHaveProperty('hasSecrets');
    }
  });
});
