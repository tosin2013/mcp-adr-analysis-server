/**
 * Test suite for gitleaks-detector utility
 */

import { jest } from '@jest/globals';
import { execSync } from 'child_process';
import { unlinkSync, existsSync, readFileSync } from 'fs';

// Mock child_process to control gitleaks behavior in tests
jest.mock('child_process');
const mockExecSync = execSync as jest.MockedFunction<typeof execSync>;

// Mock fs functions
jest.mock('fs');
// const mockWriteFileSync = writeFileSync as jest.MockedFunction<typeof writeFileSync>;
const mockUnlinkSync = unlinkSync as jest.MockedFunction<typeof unlinkSync>;
const mockExistsSync = existsSync as jest.MockedFunction<typeof existsSync>;
const mockReadFileSync = readFileSync as jest.MockedFunction<typeof readFileSync>;

describe('Gitleaks Detector', () => {
  let analyzeSensitiveContent: any;
  let isObviouslySensitive: any;

  beforeAll(async () => {
    // Import the module after mocking
    const module = await import('../../src/utils/gitleaks-detector.js');
    analyzeSensitiveContent = module.analyzeSensitiveContent;
    isObviouslySensitive = module.isObviouslySensitive;
  });

  beforeEach(() => {
    jest.clearAllMocks();
    // Default mocks
    mockExistsSync.mockImplementation((path: string) => {
      if (path.includes('.gitleaks.toml')) return true;
      if (path.includes('gitleaks-output')) return true;
      return false;
    });
  });

  describe('analyzeSensitiveContent', () => {
    it('should return empty result when no secrets found', async () => {
      // Mock gitleaks returning success (no secrets)
      mockExecSync.mockImplementation(() => '');

      const result = await analyzeSensitiveContent('test.js', 'console.log("hello");');

      expect(result).toEqual({
        filePath: 'test.js',
        hasIssues: false,
        matches: [],
        summary: {
          criticalCount: 0,
          highCount: 0,
          mediumCount: 0,
          lowCount: 0,
          totalCount: 0,
        },
        recommendations: ['No sensitive content detected by gitleaks'],
      });
    });

    it('should parse gitleaks output when secrets are found', async () => {
      // Mock gitleaks finding secrets (exit code 1)
      const error = new Error('Gitleaks found secrets') as any;
      error.status = 1;
      mockExecSync.mockImplementation(() => {
        throw error;
      });

      // Mock the JSON output file
      const gitleaksOutput = [
        {
          Description: 'GitHub Personal Access Token',
          StartLine: 1,
          EndLine: 1,
          StartColumn: 10,
          EndColumn: 50,
          Match: 'ghp_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx',
          Secret: 'ghp_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx',
          File: 'test.js',
          RuleID: 'github-pat',
          Tags: ['key', 'github'],
          Entropy: 5.2,
        },
      ];

      mockReadFileSync.mockReturnValue(JSON.stringify(gitleaksOutput));

      const result = await analyzeSensitiveContent(
        'test.js',
        'const token = "ghp_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx";'
      );

      expect(result.hasIssues).toBe(true);
      expect(result.matches).toHaveLength(1);
      expect(result.matches[0].pattern.name).toBe('github-pat');
      expect(result.matches[0].pattern.severity).toBe('critical');
      expect(result.summary.criticalCount).toBe(1);
    });

    it('should handle gitleaks execution errors gracefully', async () => {
      // Mock gitleaks failing with real error (not status 1)
      const error = new Error('Gitleaks not found') as any;
      error.status = 127;
      mockExecSync.mockImplementation(() => {
        throw error;
      });

      const result = await analyzeSensitiveContent('test.js', 'console.log("hello");');

      expect(result.hasIssues).toBe(false);
      expect(result.matches).toHaveLength(0);
    });

    it('should categorize rules correctly', async () => {
      const error = new Error('Gitleaks found secrets') as any;
      error.status = 1;
      mockExecSync.mockImplementation(() => {
        throw error;
      });

      const gitleaksOutput = [
        {
          Description: 'Database password',
          StartLine: 1,
          EndLine: 1,
          StartColumn: 10,
          EndColumn: 30,
          Match: 'password123',
          Secret: 'password123',
          File: 'test.js',
          RuleID: 'db-password',
          Tags: ['password'],
          Entropy: 3.5,
        },
      ];

      mockReadFileSync.mockReturnValue(JSON.stringify(gitleaksOutput));

      const result = await analyzeSensitiveContent('test.js', 'const pass = "password123";');

      expect(result.matches[0].pattern.category).toBe('secrets');
      expect(result.matches[0].pattern.severity).toBe('high');
    });

    it('should clean up temporary files', async () => {
      mockExecSync.mockImplementation(() => '');

      await analyzeSensitiveContent('test.js', 'console.log("hello");');

      expect(mockUnlinkSync).toHaveBeenCalled();
    });
  });

  describe('isObviouslySensitive', () => {
    it('should identify sensitive file names', () => {
      expect(isObviouslySensitive('.env')).toBe(true);
      expect(isObviouslySensitive('.env.local')).toBe(true);
      expect(isObviouslySensitive('secrets.json')).toBe(true);
      expect(isObviouslySensitive('credentials.txt')).toBe(true);
      expect(isObviouslySensitive('private.key')).toBe(true);
      expect(isObviouslySensitive('id_rsa')).toBe(true);
      expect(isObviouslySensitive('cert.pem')).toBe(true);
    });

    it('should not flag normal file names', () => {
      expect(isObviouslySensitive('README.md')).toBe(false);
      expect(isObviouslySensitive('package.json')).toBe(false);
      expect(isObviouslySensitive('src/index.js')).toBe(false);
      expect(isObviouslySensitive('test.ts')).toBe(false);
    });
  });

  describe('severity mapping', () => {
    it('should assign critical severity to important services', async () => {
      const testCases = [
        { ruleId: 'github-pat', expected: 'critical' },
        { ruleId: 'aws-access-key', expected: 'critical' },
        { ruleId: 'stripe-secret', expected: 'critical' },
        { ruleId: 'private-key', expected: 'critical' },
        { ruleId: 'database-url', expected: 'critical' },
      ];

      for (const testCase of testCases) {
        const error = new Error('Gitleaks found secrets') as any;
        error.status = 1;
        mockExecSync.mockImplementation(() => {
          throw error;
        });

        const gitleaksOutput = [
          {
            Description: 'Test secret',
            StartLine: 1,
            EndLine: 1,
            StartColumn: 1,
            EndColumn: 10,
            Match: 'secret',
            Secret: 'secret',
            File: 'test.js',
            RuleID: testCase.ruleId,
            Tags: [],
            Entropy: 4.0,
          },
        ];

        mockReadFileSync.mockReturnValue(JSON.stringify(gitleaksOutput));

        const result = await analyzeSensitiveContent('test.js', 'test content');
        expect(result.matches[0].pattern.severity).toBe(testCase.expected);
      }
    });
  });

  describe('suggestions generation', () => {
    it('should provide appropriate suggestions for different secret types', async () => {
      const error = new Error('Gitleaks found secrets') as any;
      error.status = 1;
      mockExecSync.mockImplementation(() => {
        throw error;
      });

      const gitleaksOutput = [
        {
          Description: 'API Key',
          StartLine: 1,
          EndLine: 1,
          StartColumn: 1,
          EndColumn: 10,
          Match: 'api_key_123',
          Secret: 'api_key_123',
          File: 'test.js',
          RuleID: 'api-key',
          Tags: ['key'],
          Entropy: 4.0,
        },
      ];

      mockReadFileSync.mockReturnValue(JSON.stringify(gitleaksOutput));

      const result = await analyzeSensitiveContent('test.js', 'const key = "api_key_123";');

      expect(result.matches[0].suggestions).toContain('Move to environment variables');
      expect(result.matches[0].suggestions).toContain('Use a secrets management service');
    });
  });

  describe('recommendations', () => {
    it('should provide critical warnings for critical issues', async () => {
      const error = new Error('Gitleaks found secrets') as any;
      error.status = 1;
      mockExecSync.mockImplementation(() => {
        throw error;
      });

      const gitleaksOutput = [
        {
          Description: 'Private Key',
          StartLine: 1,
          EndLine: 1,
          StartColumn: 1,
          EndColumn: 10,
          Match: '-----BEGIN PRIVATE KEY-----',
          Secret: '-----BEGIN PRIVATE KEY-----',
          File: 'test.js',
          RuleID: 'private-key',
          Tags: ['key'],
          Entropy: 4.0,
        },
      ];

      mockReadFileSync.mockReturnValue(JSON.stringify(gitleaksOutput));

      const result = await analyzeSensitiveContent(
        'test.js',
        'const key = "-----BEGIN PRIVATE KEY-----";'
      );

      expect(result.recommendations).toContain(
        '🚨 1 CRITICAL security issue(s) found - DO NOT COMMIT'
      );
      expect(result.recommendations).toContain('Rotate any exposed credentials immediately');
    });
  });
});
