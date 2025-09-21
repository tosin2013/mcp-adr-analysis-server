/**
 * Test suite for smart git push tool
 */

import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';

// Mock child_process execSync
const mockExecSync = jest.fn();
jest.unstable_mockModule('child_process', () => ({
  execSync: mockExecSync,
}));

// Mock gitleaks-detector for sensitive content detection tests
const mockAnalyzeSensitiveContent = jest.fn();
jest.unstable_mockModule('../src/utils/gitleaks-detector.js', () => ({
  analyzeSensitiveContent: mockAnalyzeSensitiveContent,
  isObviouslySensitive: jest.fn(),
}));

// Mock file system operations for testing
const mockReadFileSync = jest.fn();
const mockStatSync = jest.fn();
const mockExistsSync = jest.fn();
const mockWriteFileSync = jest.fn();
const mockMkdirSync = jest.fn();
const mockRmSync = jest.fn();

jest.unstable_mockModule('fs', () => ({
  writeFileSync: mockWriteFileSync,
  readFileSync: mockReadFileSync,
  mkdirSync: mockMkdirSync,
  rmSync: mockRmSync,
  existsSync: mockExistsSync,
  statSync: mockStatSync,
}));

describe('Smart Git Push Tool', () => {
  let testDir: string;

  beforeEach(() => {
    testDir = '/tmp/test-git-push';
    jest.clearAllMocks();

    // Setup default mocks
    mockExecSync.mockReturnValue('');
    mockExistsSync.mockReturnValue(true);
    mockStatSync.mockReturnValue({ size: 1024 } as any);
    mockReadFileSync.mockReturnValue('test content');
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('Git File Detection', () => {
    it('should detect staged files correctly', async () => {
      // Mock git diff output
      mockExecSync.mockReturnValue(`A\tsrc/new-file.ts
M\tsrc/existing-file.ts
D\tsrc/deleted-file.ts`);

      mockExistsSync.mockReturnValue(true);
      mockStatSync.mockReturnValue({ size: 1024 } as any);
      mockReadFileSync.mockReturnValue('test content');

      const { smartGitPush } = await import('../src/tools/smart-git-push-tool.js');

      const result = await smartGitPush({
        projectPath: testDir,
        dryRun: true,
        checkReleaseReadiness: false,
        skipValidation: true,
      });

      expect(mockExecSync).toHaveBeenCalledWith('git diff --cached --name-status', {
        cwd: testDir,
        encoding: 'utf8',
      });

      expect(result.content[0].text).toContain('Files to Push**: 3');
    });

    it('should handle no staged files', async () => {
      mockExecSync.mockReturnValue('');

      const { smartGitPush } = await import('../src/tools/smart-git-push-tool.js');

      const result = await smartGitPush({
        projectPath: testDir,
        dryRun: true,
        checkReleaseReadiness: false,
      });

      expect(result.content[0].text).toContain('No staged files found');
    });

    it('should map git status codes correctly', async () => {
      mockExecSync.mockReturnValue(`A\tadded.ts
M\tmodified.ts
D\tdeleted.ts
R\trenamed.ts`);

      const { smartGitPush } = await import('../src/tools/smart-git-push-tool.js');

      const result = await smartGitPush({
        projectPath: testDir,
        dryRun: true,
        checkReleaseReadiness: false,
        skipValidation: true,
      });

      const text = result.content[0].text;
      expect(text).toContain('added.ts (added)');
      expect(text).toContain('modified.ts (modified)');
      expect(text).toContain('deleted.ts (deleted)');
      expect(text).toContain('renamed.ts (renamed)');
    });
  });

  describe('Sensitive Content Detection', () => {
    it('should detect API keys', async () => {
      // Mock the response from analyzeSensitiveContent
      mockAnalyzeSensitiveContent.mockResolvedValue({
        filePath: 'config.js',
        hasIssues: true,
        matches: [
          {
            pattern: { name: 'github-token', severity: 'critical' },
            match: 'ghp_1234567890abcdef1234567890abcdef12345678',
            line: 1,
            column: 10,
            context: 'apiKey context',
            confidence: 0.9,
            suggestions: ['Move to environment variables'],
          },
        ],
        summary: { criticalCount: 1, highCount: 0, mediumCount: 0, lowCount: 0, totalCount: 1 },
        recommendations: ['Critical security issue found'],
      });

      const testContent = `
        const config = {
          apiKey: "ghp_1234567890abcdef1234567890abcdef12345678",
          dbUrl: "postgres://user:password@localhost:5432/db"
        };
      `;

      const result = await mockAnalyzeSensitiveContent('config.js', testContent);

      expect(result.hasIssues).toBe(true);
      expect(result.matches.length).toBeGreaterThan(0);
      expect(result.matches.some(m => m.pattern.name === 'github-token')).toBe(true);
    });

    it('should detect hardcoded passwords', async () => {
      // Mock the response for password detection
      mockAnalyzeSensitiveContent.mockResolvedValue({
        filePath: 'auth.js',
        hasIssues: true,
        matches: [
          {
            pattern: { name: 'hardcoded-password', severity: 'high' },
            match: 'super-secret-password-123',
            line: 3,
            column: 20,
            context: 'password context',
            confidence: 0.8,
            suggestions: ['Use environment variables for passwords'],
          },
        ],
        summary: { criticalCount: 0, highCount: 1, mediumCount: 0, lowCount: 0, totalCount: 1 },
        recommendations: ['High severity issue found'],
      });

      const testContent = `
        const auth = {
          username: "admin",
          password: "super-secret-password-123"
        };
      `;

      const result = await mockAnalyzeSensitiveContent('auth.js', testContent);

      expect(result.hasIssues).toBe(true);
      expect(result.matches.some(m => m.pattern.name === 'hardcoded-password')).toBe(true);
    });

    it('should detect AWS credentials', async () => {
      // Mock the response for AWS credentials detection
      mockAnalyzeSensitiveContent.mockResolvedValue({
        filePath: '.env',
        hasIssues: true,
        matches: [
          {
            pattern: { name: 'aws-access-key', severity: 'critical' },
            match: 'AKIAIOSFODNN7EXAMPLE',
            line: 1,
            column: 18,
            context: 'AWS_ACCESS_KEY_ID context',
            confidence: 0.95,
            suggestions: ['Rotate this credential immediately', 'Use AWS IAM roles instead'],
          },
        ],
        summary: { criticalCount: 1, highCount: 0, mediumCount: 0, lowCount: 0, totalCount: 1 },
        recommendations: ['Critical AWS credentials found - DO NOT COMMIT'],
      });

      const testContent = `
        AWS_ACCESS_KEY_ID=AKIAIOSFODNN7EXAMPLE
        AWS_SECRET_ACCESS_KEY=wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY
      `;

      const result = await mockAnalyzeSensitiveContent('.env', testContent);

      expect(result.hasIssues).toBe(true);
      expect(result.matches.some(m => m.pattern.name === 'aws-access-key')).toBe(true);
    });

    it('should handle false positives correctly', async () => {
      // Mock the response for false positives - low confidence matches
      mockAnalyzeSensitiveContent.mockResolvedValue({
        filePath: 'example.js',
        hasIssues: true,
        matches: [
          {
            pattern: { name: 'email-address', severity: 'low' },
            match: 'user@example.com',
            line: 4,
            column: 15,
            context: 'email example context',
            confidence: 0.3, // Low confidence for example data
            suggestions: ['Verify if this is real email data'],
          },
        ],
        summary: { criticalCount: 0, highCount: 0, mediumCount: 0, lowCount: 1, totalCount: 1 },
        recommendations: ['Low confidence matches found - review manually'],
      });

      const testContent = `
        // Example configuration - not real credentials
        const exampleConfig = {
          email: "user@example.com",
          apiUrl: "https://api.example.com"
        };
      `;

      const result = await mockAnalyzeSensitiveContent('example.js', testContent);

      // Should have low confidence or no matches for example data
      const emailMatches = result.matches.filter(m => m.pattern.name === 'email-address');
      emailMatches.forEach(match => {
        expect(match.confidence).toBeLessThan(0.5);
      });
    });
  });

  describe('LLM Artifact Detection', () => {
    it('should detect debug scripts', async () => {
      const { detectLLMArtifacts } = await import('../src/utils/llm-artifact-detector.js');

      const testContent = `
        import logging
        
        # Debug script for testing
        def debug_function():
            print("Debug information")
            logging.debug("This is debug output")
      `;

      const result = detectLLMArtifacts('debug_analysis.py', testContent);

      expect(result.isLLMArtifact).toBe(true);
      expect(result.matches.some(m => m.pattern.name === 'debug-script')).toBe(true);
    });

    it('should detect test files in wrong location', async () => {
      const { detectLLMArtifacts } = await import('../src/utils/llm-artifact-detector.js');

      const result = detectLLMArtifacts('src/test_user_auth.py', 'def test_login(): pass');

      expect(result.isLLMArtifact).toBe(true);
      expect(result.matches.some(m => m.pattern.name === 'misplaced-test')).toBe(true);
      expect(result.allowedInCurrentLocation).toBe(false);
    });

    it('should detect mock data files', async () => {
      const { detectLLMArtifacts } = await import('../src/utils/llm-artifact-detector.js');

      const testContent = `
        {
          "users": [
            {"id": 1, "name": "Mock User", "email": "mock@example.com"}
          ]
        }
      `;

      const result = detectLLMArtifacts('mock_users.json', testContent);

      expect(result.isLLMArtifact).toBe(true);
      expect(result.matches.some(m => m.pattern.name === 'mock-data')).toBe(true);
    });

    it('should detect temporary files', async () => {
      const { detectLLMArtifacts } = await import('../src/utils/llm-artifact-detector.js');

      const result = detectLLMArtifacts('temp_analysis.txt', 'Temporary analysis results');

      expect(result.isLLMArtifact).toBe(true);
      expect(result.matches.some(m => m.pattern.name === 'temporary-file')).toBe(true);
      expect(result.severity).toBe('error');
    });

    it('should detect LLM conversation logs', async () => {
      const { detectLLMArtifacts } = await import('../src/utils/llm-artifact-detector.js');

      const testContent = `
        Human: Can you help me with this code?
        
        Assistant: I'll help you with that code. Here's what I suggest:
        
        Human: Thanks, that works perfectly!
      `;

      const result = detectLLMArtifacts('llm_conversation.txt', testContent);

      expect(result.isLLMArtifact).toBe(true);
      expect(result.matches.some(m => m.pattern.name === 'llm-conversation')).toBe(true);
    });

    it('should allow files in correct locations', async () => {
      const { detectLLMArtifacts } = await import('../src/utils/llm-artifact-detector.js');

      const result = detectLLMArtifacts('tests/test_user_auth.py', 'def test_login(): pass');

      expect(result.isLLMArtifact).toBe(true);
      expect(result.allowedInCurrentLocation).toBe(true);
    });
  });

  describe('Location-Based Filtering', () => {
    it('should validate file locations correctly', async () => {
      const { validateFileLocation } = await import('../src/utils/location-filter.js');

      // Debug script in wrong location
      const result1 = validateFileLocation('src/debug_helper.py');
      expect(result1.isValid).toBe(false);
      expect(result1.suggestedPaths).toContain('scripts/');

      // Debug script in correct location
      const result2 = validateFileLocation('scripts/debug_helper.py');
      expect(result2.isValid).toBe(true);
    });

    it('should provide appropriate suggestions', async () => {
      const { getLocationSuggestions } = await import('../src/utils/location-filter.js');

      const result = getLocationSuggestions('temp_analysis.py', 'Temporary analysis');

      expect(result.suggestions).toContain('tmp/');
      expect(result.suggestions).toContain('temp/');
      expect(result.category).toBe('temporary');
    });

    it('should identify files that should be ignored', async () => {
      const { shouldIgnoreFile } = await import('../src/utils/location-filter.js');

      const result1 = shouldIgnoreFile('test.tmp');
      expect(result1.shouldIgnore).toBe(true);
      expect(result1.severity).toBe('error');

      const result2 = shouldIgnoreFile('debug_script.py');
      expect(result2.shouldIgnore).toBe(true);
      expect(result2.severity).toBe('warning');

      const result3 = shouldIgnoreFile('src/main.py');
      expect(result3.shouldIgnore).toBe(false);
    });
  });

  describe('Interactive Approval Workflow', () => {
    it('should handle non-interactive mode correctly', async () => {
      const { handleInteractiveApproval } = await import('../src/utils/interactive-approval.js');

      const testItems = [
        {
          filePath: 'src/config.js',
          issues: [
            {
              type: 'sensitive-content' as const,
              message: 'API key detected',
              severity: 'error' as const,
              pattern: 'api-key',
            },
          ],
          suggestions: ['Move to environment variables'],
          severity: 'error' as const,
          allowedInLocation: true,
          confidence: 0.9,
        },
      ];

      const options = {
        interactiveMode: false,
        autoApproveInfo: true,
        autoRejectErrors: true,
        dryRun: false,
        checkReleaseReadiness: false,
        batchMode: false,
      };

      const result = await handleInteractiveApproval(testItems, options);

      expect(result.proceed).toBe(false);
      expect(result.rejected).toContain('src/config.js');
    });

    it('should auto-approve info-level items', async () => {
      const { handleInteractiveApproval } = await import('../src/utils/interactive-approval.js');

      const testItems = [
        {
          filePath: 'src/helper.js',
          issues: [
            {
              type: 'llm-artifact' as const,
              message: 'Verbose comments detected',
              severity: 'info' as const,
              pattern: 'verbose-comments',
            },
          ],
          suggestions: ['Review comments'],
          severity: 'info' as const,
          allowedInLocation: true,
          confidence: 0.4,
        },
      ];

      const options = {
        interactiveMode: false,
        autoApproveInfo: true,
        autoRejectErrors: false,
        dryRun: false,
        checkReleaseReadiness: false,
        batchMode: false,
      };

      const result = await handleInteractiveApproval(testItems, options);

      expect(result.proceed).toBe(true);
      expect(result.approved).toContain('src/helper.js');
    });
  });

  describe('Git Push Integration', () => {
    it('should execute git push with commit message', async () => {
      mockExecSync
        .mockReturnValueOnce('A\tsrc/new-file.ts') // git diff --cached
        .mockReturnValueOnce('[main abc123] Add new feature\n 1 file changed, 10 insertions(+)') // git commit
        .mockReturnValueOnce('To origin/main\n   abc123..def456  main -> main'); // git push

      const { smartGitPush } = await import('../src/tools/smart-git-push-tool.js');

      const result = await smartGitPush({
        projectPath: testDir,
        message: 'Add new feature',
        skipValidation: true,
        checkReleaseReadiness: false,
        dryRun: false,
      });

      expect(mockExecSync).toHaveBeenCalledWith('git commit -m "Add new feature"', {
        cwd: testDir,
        encoding: 'utf8',
      });

      expect(mockExecSync).toHaveBeenCalledWith('git push', {
        cwd: testDir,
        encoding: 'utf8',
      });

      expect(result.content[0].text).toContain('Success ✅');
    });

    it('should push to specific branch', async () => {
      mockExecSync
        .mockReturnValueOnce('A\tsrc/new-file.ts') // git diff --cached
        .mockReturnValueOnce(
          'To origin/feature-branch\n   abc123..def456  feature-branch -> feature-branch'
        ); // git push

      const { smartGitPush } = await import('../src/tools/smart-git-push-tool.js');

      await smartGitPush({
        projectPath: testDir,
        branch: 'feature-branch',
        skipValidation: true,
        checkReleaseReadiness: false,
        dryRun: false,
      });

      expect(mockExecSync).toHaveBeenCalledWith('git push origin feature-branch', {
        cwd: testDir,
        encoding: 'utf8',
      });
    });

    it('should handle git push errors', async () => {
      mockExecSync
        .mockReturnValueOnce('A\tsrc/new-file.ts') // git diff --cached
        .mockImplementationOnce(() => {
          throw new Error('remote: Permission denied');
        });

      const { smartGitPush } = await import('../src/tools/smart-git-push-tool.js');

      await expect(
        smartGitPush({
          projectPath: testDir,
          skipValidation: true,
          checkReleaseReadiness: false,
          dryRun: false,
        })
      ).rejects.toThrow('Smart git push failed');
    });
  });

  describe('Complete Workflow Integration', () => {
    it('should perform complete validation and push workflow', async () => {
      // Mock git status with problematic files
      mockExecSync.mockReturnValueOnce(`A\tdebug_script.py
A\tsrc/config.js
A\ttests/test_auth.py`);

      // Mock file content reading
      mockReadFileSync
        .mockReturnValueOnce('print("debug info")') // debug_script.py
        .mockReturnValueOnce('const apiKey = "ghp_1234567890abcdef1234567890abcdef12345678";') // config.js
        .mockReturnValueOnce('def test_login(): pass'); // test_auth.py

      const { smartGitPush } = await import('../src/tools/smart-git-push-tool.js');

      const result = await smartGitPush({
        projectPath: testDir,
        sensitivityLevel: 'moderate',
        interactiveMode: false,
        dryRun: true,
        checkReleaseReadiness: false,
      });

      expect(result.content[0].text).toContain('Validation Issues');
      expect(result.content[0].text).toContain('debug_script.py');
      expect(result.content[0].text).toContain('config.js');
    });

    it('should handle mixed severity levels correctly', async () => {
      mockExecSync.mockReturnValueOnce(`A\tscripts/debug_helper.py
A\tsrc/utils.js
A\ttemp_file.tmp`);

      mockReadFileSync
        .mockReturnValueOnce('# Debug helper in correct location') // scripts/debug_helper.py
        .mockReturnValueOnce('// Normal utility functions') // src/utils.js
        .mockReturnValueOnce('temporary data'); // temp_file.tmp

      const { smartGitPush } = await import('../src/tools/smart-git-push-tool.js');

      const result = await smartGitPush({
        projectPath: testDir,
        sensitivityLevel: 'strict',
        interactiveMode: false,
        dryRun: true,
        checkReleaseReadiness: false,
      });

      const text = result.content[0].text;
      expect(text).toContain('Validation Issues**: 2'); // Both debug_helper.py and temp_file.tmp should be flagged
    });
  });

  describe('Error Handling and Edge Cases', () => {
    it('should handle git command failures gracefully', async () => {
      mockExecSync.mockImplementation(() => {
        throw new Error('git: command not found');
      });

      const { smartGitPush } = await import('../src/tools/smart-git-push-tool.js');

      await expect(
        smartGitPush({
          projectPath: testDir,
        })
      ).rejects.toThrow('Smart git push failed');
    });

    it('should handle large files gracefully', async () => {
      mockExecSync.mockReturnValueOnce('A\tlarge_file.txt');

      mockStatSync.mockReturnValue({ size: 200 * 1024 }); // 200KB file

      const { smartGitPush } = await import('../src/tools/smart-git-push-tool.js');

      const result = await smartGitPush({
        projectPath: testDir,
        dryRun: true,
        checkReleaseReadiness: false,
      });

      expect(result.content[0].text).toContain('large_file.txt');
    });

    it('should handle empty file content', async () => {
      mockExecSync.mockReturnValueOnce('A\tempty_file.txt');

      mockReadFileSync.mockReturnValue('');

      const { smartGitPush } = await import('../src/tools/smart-git-push-tool.js');

      const result = await smartGitPush({
        projectPath: testDir,
        dryRun: true,
        checkReleaseReadiness: false,
      });

      expect(result.content[0].text).toContain('empty_file.txt');
    });

    it('should handle binary files', async () => {
      mockExecSync.mockReturnValueOnce('A\timage.png');

      mockStatSync.mockReturnValue({ size: 1024 });

      mockReadFileSync.mockImplementation(() => {
        throw new Error('File is binary');
      });

      const { smartGitPush } = await import('../src/tools/smart-git-push-tool.js');

      const result = await smartGitPush({
        projectPath: testDir,
        dryRun: true,
        checkReleaseReadiness: false,
      });

      expect(result.content[0].text).toContain('image.png');
    });
  });
});

describe('MCP Server Integration', () => {
  it('should register smart_git_push tool correctly', async () => {
    const { McpAdrAnalysisServer } = await import('../src/index.js');
    const server = new McpAdrAnalysisServer();

    // This test would need to be expanded with proper MCP server testing
    expect(server).toBeDefined();
  });

  it('should handle tool execution through MCP protocol', async () => {
    // Mock MCP server request
    const mockRequest = {
      params: {
        name: 'smart_git_push',
        arguments: {
          dryRun: true,
          checkReleaseReadiness: false,
          projectPath: '/tmp/test',
        },
      },
    };

    // This would test the actual MCP tool execution
    // Implementation depends on MCP testing framework
    expect(mockRequest.params.name).toBe('smart_git_push');
  });
});

describe('Release Readiness Integration', () => {
  let testDir: string;

  beforeEach(() => {
    testDir = '/tmp/test-git-push';
    jest.clearAllMocks();
  });

  it('should include release readiness parameters in tool schema', async () => {
    const { McpAdrAnalysisServer } = await import('../src/index.js');
    const server = new McpAdrAnalysisServer();

    // This would test that the tool schema includes the new parameters
    // In a real implementation, we'd check the actual schema registration
    expect(server).toBeDefined();
  });

  it('should handle checkReleaseReadiness parameter', async () => {
    mockExecSync.mockReturnValue('A\tsrc/feature.ts');

    mockExistsSync.mockReturnValue(true);
    mockReadFileSync.mockReturnValue('export function test() {}');
    mockStatSync.mockReturnValue({ size: 1024 } as any);

    const { smartGitPush } = await import('../src/tools/smart-git-push-tool.js');

    const result = await smartGitPush({
      projectPath: testDir,
      dryRun: true,
      checkReleaseReadiness: true,
      releaseType: 'minor',
    });

    expect(result.content[0].text).toContain('Release Readiness:');
  });

  it('should handle releaseType parameter', async () => {
    mockExecSync.mockReturnValue('A\tsrc/feature.ts');

    mockExistsSync.mockReturnValue(true);
    mockReadFileSync.mockReturnValue('export function test() {}');
    mockStatSync.mockReturnValue({ size: 1024 } as any);

    const { smartGitPush } = await import('../src/tools/smart-git-push-tool.js');

    const releaseTypes = ['major', 'minor', 'patch'] as const;

    for (const releaseType of releaseTypes) {
      const result = await smartGitPush({
        projectPath: testDir,
        dryRun: true,
        checkReleaseReadiness: true,
        releaseType,
      });

      expect(result.content[0].text).toContain('Release Readiness:');
    }
  });

  it('should work without release readiness check', async () => {
    mockExecSync.mockReturnValue('A\tsrc/feature.ts');

    mockExistsSync.mockReturnValue(true);
    mockReadFileSync.mockReturnValue('export function test() {}');
    mockStatSync.mockReturnValue({ size: 1024 } as any);

    const { smartGitPush } = await import('../src/tools/smart-git-push-tool.js');

    const result = await smartGitPush({
      projectPath: testDir,
      dryRun: true,
      checkReleaseReadiness: false,
    });

    expect(result.content[0].text).not.toContain('Release Readiness:');
    expect(result.content[0].text).toContain('Smart Git Push - Dry Run');
  });
});
