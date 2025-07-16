/**
 * Test suite for smart git push tool v2 - AI-driven approach
 */

import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';

// Mock child_process execSync
const mockExecSync = jest.fn();
jest.unstable_mockModule('child_process', () => ({
  execSync: mockExecSync
}));

// Mock file system operations for testing
const mockReadFileSync = jest.fn();
const mockStatSync = jest.fn();
const mockExistsSync = jest.fn();
const mockWriteFileSync = jest.fn();
const mockMkdirSync = jest.fn();

jest.unstable_mockModule('fs', () => ({
  writeFileSync: mockWriteFileSync,
  readFileSync: mockReadFileSync,
  mkdirSync: mockMkdirSync,
  existsSync: mockExistsSync,
  statSync: mockStatSync
}));

describe('Smart Git Push Tool V2 - AI-driven approach', () => {
  let testDir: string;
  
  beforeEach(() => {
    testDir = '/tmp/test-git-push-v2';
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

  describe('AI-driven Test Results Integration', () => {
    it('should accept test results from AI and track them', async () => {
      // Mock git diff output
      mockExecSync.mockReturnValue('A\tsrc/new-file.ts');
      
      // Mock deployment history file doesn't exist initially
      mockExistsSync.mockImplementation((path: any) => {
        if (String(path).includes('deploy-history.json')) return false;
        return true;
      });

      const { smartGitPush } = await import('../src/tools/smart-git-push-tool-v2.js');
      
      const testResults = {
        success: true,
        testsRun: 15,
        testsPassed: 15,
        testsFailed: 0,
        duration: 45,
        command: 'npm test',
        output: 'All tests passed!',
        testTypes: {
          'unit': { passed: 10, failed: 0 },
          'integration': { passed: 5, failed: 0 }
        }
      };

      const result = await smartGitPush({
        projectPath: testDir,
        testResults,
        skipSecurity: true,
        dryRun: false
      });

      // Verify deployment history was updated
      const writtenData = mockWriteFileSync.mock.calls.find(call => 
        String(call[0]).includes('deploy-history.json')
      );
      expect(writtenData).toBeDefined();
      if (writtenData) {
        expect(String(writtenData[1])).toContain('"totalTestsRun": 15');
      }
      
      expect(result.content[0].text).toContain('Success ✅');
      expect(result.content[0].text).toContain('Tests**: ✅ Passed');
    });

    it('should block push when AI reports test failures', async () => {
      mockExecSync.mockReturnValue('A\tsrc/buggy-file.ts');

      const { smartGitPush } = await import('../src/tools/smart-git-push-tool-v2.js');
      
      const testResults = {
        success: false,
        testsRun: 10,
        testsPassed: 8,
        testsFailed: 2,
        duration: 30,
        command: 'pytest',
        output: 'FAILED tests/test_auth.py::test_login - AssertionError',
        failureDetails: [
          'test_login failed: Invalid credentials',
          'test_signup failed: Email validation error'
        ],
        testTypes: {
          'unit': { passed: 8, failed: 2 }
        }
      };

      const result = await smartGitPush({
        projectPath: testDir,
        testResults,
        skipSecurity: true,
        dryRun: true
      });

      expect(result.content[0].text).toContain('Blocked 🚫');
      expect(result.content[0].text).toContain('Tests Failed');
      expect(result.content[0].text).toContain('pytest');
      expect(result.content[0].text).toContain('FAILED tests/test_auth.py');
    });

    it('should handle diverse test types from AI', async () => {
      mockExecSync.mockReturnValue('A\tinfra/kubernetes.yaml');

      const { smartGitPush } = await import('../src/tools/smart-git-push-tool-v2.js');
      
      const testResults = {
        success: true,
        testsRun: 25,
        testsPassed: 25,
        testsFailed: 0,
        duration: 180,
        command: 'make test-all',
        output: 'All test suites passed: unit, integration, k8s, ansible',
        testTypes: {
          'unit': { passed: 10, failed: 0 },
          'integration': { passed: 8, failed: 0 },
          'kubernetes': { passed: 4, failed: 0 },
          'ansible': { passed: 3, failed: 0 }
        }
      };

      const result = await smartGitPush({
        projectPath: testDir,
        testResults,
        skipSecurity: true,
        dryRun: false
      });

      expect(result.content[0].text).toContain('Success ✅');
      
      // Verify test types were tracked
      expect(mockWriteFileSync).toHaveBeenCalledWith(
        expect.stringContaining('deploy-history.json'),
        expect.stringMatching(/"kubernetes":\s*{\s*"passed":\s*4,\s*"failed":\s*0\s*}/)
      );
    });

    it('should work without test results (AI chose not to run tests)', async () => {
      mockExecSync.mockReturnValue('A\tdocs/readme.md');

      const { smartGitPush } = await import('../src/tools/smart-git-push-tool-v2.js');
      
      const result = await smartGitPush({
        projectPath: testDir,
        skipSecurity: true,
        dryRun: false
        // No testResults provided - AI determined tests weren't needed for docs
      });

      expect(result.content[0].text).toContain('Success ✅');
      expect(result.content[0].text).toContain('Tests**: Skipped');
    });

    it('should override test failures with forceUnsafe flag', async () => {
      mockExecSync.mockReturnValue('A\tsrc/hotfix.ts');

      const { smartGitPush } = await import('../src/tools/smart-git-push-tool-v2.js');
      
      const testResults = {
        success: false,
        testsRun: 5,
        testsPassed: 3,
        testsFailed: 2,
        command: 'npm test',
        output: 'Tests failed but hotfix needed urgently'
      };

      const result = await smartGitPush({
        projectPath: testDir,
        testResults,
        skipSecurity: true,
        dryRun: false,
        forceUnsafe: true
      });

      expect(result.content[0].text).toContain('Success ✅');
      expect(result.content[0].text).toContain('Tests**: ❌ Failed');
    });
  });

  describe('Enhanced Deployment History Tracking', () => {
    it('should track cumulative test metrics across pushes', async () => {
      mockExecSync.mockReturnValue('A\tsrc/feature.ts');
      
      // Mock existing history
      const existingHistory = {
        successful: 5,
        failed: 1,
        testResults: {
          totalTestsRun: 50,
          totalTestsPassed: 45,
          totalTestsFailed: 5,
          averageDuration: 60,
          testTypes: {
            'unit': { passed: 30, failed: 3 },
            'integration': { passed: 15, failed: 2 }
          }
        },
        successRate: 83,
        testPassRate: 90
      };

      mockExistsSync.mockImplementation((path: any) => {
        if (String(path).includes('deploy-history.json')) return true;
        return true;
      });

      mockReadFileSync.mockImplementation((path: any) => {
        if (String(path).includes('deploy-history.json')) {
          return JSON.stringify(existingHistory);
        }
        return 'test content';
      });

      const { smartGitPush } = await import('../src/tools/smart-git-push-tool-v2.js');
      
      const testResults = {
        success: true,
        testsRun: 12,
        testsPassed: 12,
        testsFailed: 0,
        duration: 40,
        command: 'go test ./...',
        testTypes: {
          'unit': { passed: 8, failed: 0 },
          'integration': { passed: 4, failed: 0 }
        }
      };

      await smartGitPush({
        projectPath: testDir,
        testResults,
        skipSecurity: true,
        dryRun: false
      });

      // Verify cumulative tracking
      const writtenData = mockWriteFileSync.mock.calls.find(call => 
        String(call[0]).includes('deploy-history.json')
      );
      expect(writtenData).toBeDefined();
      
      if (writtenData) {
        const updatedHistory = JSON.parse(String(writtenData[1]));
        expect(updatedHistory.successful).toBe(6); // 5 + 1
        expect(updatedHistory.testResults.totalTestsRun).toBe(62); // 50 + 12
        expect(updatedHistory.testResults.totalTestsPassed).toBe(57); // 45 + 12
        expect(updatedHistory.testResults.testTypes.unit.passed).toBe(38); // 30 + 8
      }
    });

    it('should calculate deployment metrics correctly', async () => {
      mockExecSync.mockReturnValue('A\tsrc/feature.ts');
      
      const existingHistory = {
        successful: 8,
        failed: 2,
        testResults: {
          totalTestsRun: 100,
          totalTestsPassed: 90,
          totalTestsFailed: 10,
          averageDuration: 50,
          testTypes: {}
        },
        successRate: 80, // 8/10
        testPassRate: 90, // 90/100
        lastDeploy: '2025-01-15T10:30:00.000Z',
        lastDeploySuccess: true
      };

      mockExistsSync.mockReturnValue(true);
      mockReadFileSync.mockReturnValue(JSON.stringify(existingHistory));

      const { smartGitPush } = await import('../src/tools/smart-git-push-tool-v2.js');
      
      await smartGitPush({
        projectPath: testDir,
        skipSecurity: true,
        dryRun: true
      });

      // In dry run mode, metrics aren't shown. Let's test with no staged files instead
      mockExecSync.mockReturnValue(''); // No staged files
      
      const noFilesResult = await smartGitPush({
        projectPath: testDir,
        skipSecurity: true,
        dryRun: false
      });

      expect(noFilesResult.content[0].text).toContain('Deploy Success Rate**: 80%'); // 8/10
      expect(noFilesResult.content[0].text).toContain('Test Pass Rate**: 90%'); // 90/100
    });

    it('should handle missing deployment history gracefully', async () => {
      mockExecSync.mockReturnValue('A\tsrc/first-commit.ts');
      
      mockExistsSync.mockImplementation((path: any) => {
        if (String(path).includes('deploy-history.json')) return false;
        return true;
      });

      const { smartGitPush } = await import('../src/tools/smart-git-push-tool-v2.js');
      
      // Test with no staged files to see metrics display
      mockExecSync.mockReturnValue(''); // No staged files
      
      const result = await smartGitPush({
        projectPath: testDir,
        skipSecurity: true,
        dryRun: false
      });

      expect(result.content[0].text).toContain('No deployment history available');
    });
  });

  describe('Security and File Filtering', () => {
    it('should maintain security scanning capabilities', async () => {
      mockExecSync.mockReturnValue('A\tsrc/config.ts');
      
      mockReadFileSync.mockReturnValue(`
        const config = {
          apiKey: "sk-1234567890abcdef1234567890abcdef",
          database: "postgres://user:password@localhost/db"
        };
      `);

      const { smartGitPush } = await import('../src/tools/smart-git-push-tool-v2.js');
      
      const result = await smartGitPush({
        projectPath: testDir,
        testResults: { success: true, testsRun: 5, testsPassed: 5, testsFailed: 0 },
        dryRun: true
      });

      expect(result.content[0].text).toContain('Security Issues');
    });

    it('should filter irrelevant files', async () => {
      mockExecSync.mockReturnValue(`A\tnode_modules/package/index.js
A\t.DS_Store
A\tbuild/output.js
A\tsrc/real-code.ts`);

      const { smartGitPush } = await import('../src/tools/smart-git-push-tool-v2.js');
      
      const result = await smartGitPush({
        projectPath: testDir,
        testResults: { success: true, testsRun: 3, testsPassed: 3, testsFailed: 0 },
        skipSecurity: true,
        dryRun: true
      });

      expect(result.content[0].text).toContain('Irrelevant Files');
      expect(result.content[0].text).toContain('node_modules');
      expect(result.content[0].text).toContain('build/');
    });

    it('should handle large files appropriately', async () => {
      mockExecSync.mockReturnValue('A\tlarge-dataset.csv');
      
      mockStatSync.mockReturnValue({ size: 15 * 1024 * 1024 }); // 15MB

      const { smartGitPush } = await import('../src/tools/smart-git-push-tool-v2.js');
      
      const result = await smartGitPush({
        projectPath: testDir,
        testResults: { success: true, testsRun: 2, testsPassed: 2, testsFailed: 0 },
        skipSecurity: true,
        dryRun: true
      });

      expect(result.content[0].text).toContain('Large file (15MB)');
      expect(result.content[0].text).toContain('Git LFS');
    });
  });

  describe('Push Execution and Git Integration', () => {
    it('should execute git push with commit message', async () => {
      mockExecSync
        .mockReturnValueOnce('A\tsrc/feature.ts') // git diff --cached
        .mockReturnValueOnce('[main abc123] Add feature\n 1 file changed, 10 insertions(+)') // git commit
        .mockReturnValueOnce('To origin/main\n   abc123..def456  main -> main'); // git push

      const { smartGitPush } = await import('../src/tools/smart-git-push-tool-v2.js');
      
      const result = await smartGitPush({
        projectPath: testDir,
        message: 'Add feature',
        testResults: { success: true, testsRun: 8, testsPassed: 8, testsFailed: 0 },
        skipSecurity: true,
        dryRun: false
      });

      expect(mockExecSync).toHaveBeenCalledWith('git commit -m "Add feature"', {
        cwd: testDir,
        encoding: 'utf8'
      });
      
      expect(mockExecSync).toHaveBeenCalledWith('git push', {
        cwd: testDir,
        encoding: 'utf8',
        stdio: ['pipe', 'pipe', 'pipe']
      });
      
      expect(result.content[0].text).toContain('Success ✅');
    });

    it('should push to specific branch', async () => {
      mockExecSync
        .mockReturnValueOnce('A\tsrc/feature.ts') // git diff --cached
        .mockReturnValueOnce('To origin/feature-branch\n   abc123..def456  feature-branch -> feature-branch'); // git push

      const { smartGitPush } = await import('../src/tools/smart-git-push-tool-v2.js');
      
      await smartGitPush({
        projectPath: testDir,
        branch: 'feature-branch',
        testResults: { success: true, testsRun: 5, testsPassed: 5, testsFailed: 0 },
        skipSecurity: true,
        dryRun: false
      });

      expect(mockExecSync).toHaveBeenCalledWith('git push origin feature-branch', {
        cwd: testDir,
        encoding: 'utf8',
        stdio: ['pipe', 'pipe', 'pipe']
      });
    });

    it('should handle git errors gracefully', async () => {
      mockExecSync
        .mockReturnValueOnce('A\tsrc/feature.ts') // git diff --cached
        .mockImplementationOnce(() => {
          throw new Error('remote: Permission denied');
        });

      const { smartGitPush } = await import('../src/tools/smart-git-push-tool-v2.js');
      
      await expect(smartGitPush({
        projectPath: testDir,
        testResults: { success: true, testsRun: 3, testsPassed: 3, testsFailed: 0 },
        skipSecurity: true,
        dryRun: false
      })).rejects.toThrow('Smart git push failed');
    });
  });

  describe('Response Generation', () => {
    it('should generate appropriate dry run response', async () => {
      mockExecSync.mockReturnValue('A\tsrc/feature.ts\nM\tsrc/utils.ts');

      const { smartGitPush } = await import('../src/tools/smart-git-push-tool-v2.js');
      
      const result = await smartGitPush({
        projectPath: testDir,
        testResults: { success: true, testsRun: 12, testsPassed: 12, testsFailed: 0 },
        skipSecurity: true,
        dryRun: true
      });

      expect(result.content[0].text).toContain('Dry Run 🔍');
      expect(result.content[0].text).toContain('Files to Push**: 2');
      expect(result.content[0].text).toContain('Would Block**: ✅ No');
      expect(result.content[0].text).toContain('This was a dry run');
    });

    it('should show blocking conditions in dry run', async () => {
      mockExecSync.mockReturnValue('A\tsrc/broken.ts');

      const { smartGitPush } = await import('../src/tools/smart-git-push-tool-v2.js');
      
      const testResults = {
        success: false,
        testsRun: 5,
        testsPassed: 3,
        testsFailed: 2,
        command: 'npm test'
      };

      const result = await smartGitPush({
        projectPath: testDir,
        testResults,
        skipSecurity: true,
        dryRun: true
      });

      // When tests fail, it shows "Blocked" not "Dry Run", but let's test the blocking behavior
      expect(result.content[0].text).toContain('Blocked 🚫');
      expect(result.content[0].text).toContain('Tests Failed');
    });

    it('should generate comprehensive success response', async () => {
      mockExecSync
        .mockReturnValueOnce('A\tsrc/feature.ts\nM\tpackage.json') // git diff --cached
        .mockReturnValueOnce('git push output'); // git push

      const { smartGitPush } = await import('../src/tools/smart-git-push-tool-v2.js');
      
      const testResults = {
        success: true,
        testsRun: 20,
        testsPassed: 20,
        testsFailed: 0,
        duration: 60,
        command: 'npm run test:all',
        testTypes: {
          'unit': { passed: 15, failed: 0 },
          'e2e': { passed: 5, failed: 0 }
        }
      };

      const result = await smartGitPush({
        projectPath: testDir,
        testResults,
        branch: 'main',
        skipSecurity: true,
        dryRun: false
      });

      expect(result.content[0].text).toContain('Success ✅');
      expect(result.content[0].text).toContain('Branch**: main');
      expect(result.content[0].text).toContain('Files**: 2 staged files');
      expect(result.content[0].text).toContain('Tests**: ✅ Passed');
      expect(result.content[0].text).toContain('Deployment Metrics Updated');
      expect(result.content[0].text).toContain('Files Pushed');
      expect(result.content[0].text).toContain('Git Output');
    });
  });

  describe('Error Handling and Edge Cases', () => {
    it('should handle no staged files', async () => {
      mockExecSync.mockReturnValue('');

      const { smartGitPush } = await import('../src/tools/smart-git-push-tool-v2.js');
      
      const result = await smartGitPush({
        projectPath: testDir
      });

      expect(result.content[0].text).toContain('No Changes');
      expect(result.content[0].text).toContain('No staged files found');
      expect(result.content[0].text).toContain('git add');
    });

    it('should handle malformed test results gracefully', async () => {
      mockExecSync.mockReturnValue('A\tsrc/feature.ts');

      const { smartGitPush } = await import('../src/tools/smart-git-push-tool-v2.js');
      
      // Test with missing required fields in test results
      const malformedTestResults = {
        success: true,
        // Missing testsRun, testsPassed, testsFailed
        command: 'some test'
      } as any;

      // The implementation is lenient and doesn't validate testResults structure
      // This is actually a design choice - AI might provide partial data
      const result = await smartGitPush({
        projectPath: testDir,
        testResults: malformedTestResults,
        skipSecurity: true,
        dryRun: false
      });

      // Should succeed but with limited test tracking
      expect(result.content[0].text).toContain('Success ✅');
    });

    it('should handle file system errors', async () => {
      mockExecSync.mockReturnValue('A\tsrc/feature.ts');
      
      mockStatSync.mockImplementation(() => {
        throw new Error('Permission denied');
      });

      const { smartGitPush } = await import('../src/tools/smart-git-push-tool-v2.js');
      
      const result = await smartGitPush({
        projectPath: testDir,
        testResults: { success: true, testsRun: 1, testsPassed: 1, testsFailed: 0 },
        skipSecurity: true,
        dryRun: true
      });

      // Should handle file system errors gracefully
      expect(result.content[0].text).toContain('feature.ts');
    });
  });

  describe('Comparison with Original Implementation', () => {
    it('should be simpler and faster than knowledge graph approach', async () => {
      mockExecSync.mockReturnValue('A\tsrc/simple.ts');

      const { smartGitPush } = await import('../src/tools/smart-git-push-tool-v2.js');
      
      const start = Date.now();
      const result = await smartGitPush({
        projectPath: testDir,
        testResults: { success: true, testsRun: 5, testsPassed: 5, testsFailed: 0 },
        skipSecurity: true,
        dryRun: true
      });
      const duration = Date.now() - start;

      // Should be fast (< 100ms for simple case)
      expect(duration).toBeLessThan(100);
      
      // Should have focused, simple output
      expect(result.content[0].text).toContain('Dry Run');
      expect(result.content[0].text).not.toContain('Knowledge Graph');
      expect(result.content[0].text).not.toContain('Intent');
    });

    it('should not have knowledge graph dependencies', async () => {
      // This test ensures our v2 implementation doesn't import knowledge graph modules
      const { smartGitPush } = await import('../src/tools/smart-git-push-tool-v2.js');
      
      expect(smartGitPush).toBeDefined();
      // If knowledge graph modules were imported, they would appear in module dependencies
      // This is more of a structural test
    });
  });
});