/**
 * Test suite for smart git push tool with release readiness integration
 */

import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import { execSync } from 'child_process';
import { readFileSync, existsSync, statSync } from 'fs';

// Mock dependencies
jest.mock('child_process', () => ({
  execSync: jest.fn()
}));

jest.mock('fs', () => ({
  readFileSync: jest.fn(),
  existsSync: jest.fn(),
  statSync: jest.fn(() => ({ size: 1024 }))
}));

const mockExecSync = execSync as jest.MockedFunction<typeof execSync>;
const mockReadFileSync = readFileSync as jest.MockedFunction<typeof readFileSync>;
const mockExistsSync = existsSync as jest.MockedFunction<typeof existsSync>;
const mockStatSync = statSync as jest.MockedFunction<typeof statSync>;

describe('Smart Git Push with Release Readiness', () => {
  let testDir: string;
  
  beforeEach(() => {
    testDir = '/tmp/test-smart-push';
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('Release Readiness Integration', () => {
    it('should include release readiness analysis in dry run', async () => {
      // Mock staged files
      mockExecSync.mockReturnValueOnce('A\tsrc/feature.ts\nM\tREADME.md');
      
      // Mock file reading
      mockExistsSync.mockImplementation((path: string) => {
        if (path.includes('TODO.md')) return true;
        if (path.includes('feature.ts')) return true;
        if (path.includes('README.md')) return true;
        return false;
      });
      
      mockReadFileSync.mockImplementation((path: string) => {
        if (path.includes('TODO.md')) {
          return `# Project TODO

## Core Features
- [x] Implement authentication
- [x] Add database layer
- [x] Create API endpoints
- [ ] Add error handling (low priority)

## Testing
- [x] Unit tests
- [x] Integration tests
- [x] E2E tests
`;
        }
        if (path.includes('feature.ts')) {
          return 'export function newFeature() { return "Hello World"; }';
        }
        if (path.includes('README.md')) {
          return '# Project\n\nThis is a test project.';
        }
        return '';
      });
      
      mockStatSync.mockReturnValue({ size: 1024 } as any);

      const { smartGitPush } = await import('../src/tools/smart-git-push-tool.js');
      
      const result = await smartGitPush({
        projectPath: testDir,
        dryRun: true,
        checkReleaseReadiness: true,
        releaseType: 'minor'
      });

      expect(result.content[0].text).toContain('Release Readiness Analysis');
      expect(result.content[0].text).toContain('Core Features');
      expect(result.content[0].text).toContain('Testing');
      expect(result.content[0].text).toContain('Ready for Release');
    });

    it('should block push when critical TODOs exist', async () => {
      // Mock staged files
      mockExecSync.mockReturnValueOnce('A\tsrc/feature.ts');
      
      // Mock file reading with critical TODOs
      mockExistsSync.mockImplementation((path: string) => {
        if (path.includes('TODO.md')) return true;
        if (path.includes('feature.ts')) return true;
        return false;
      });
      
      mockReadFileSync.mockImplementation((path: string) => {
        if (path.includes('TODO.md')) {
          return `# Project TODO

## Critical Issues
- [ ] Fix security vulnerability (critical)
- [ ] Resolve database connection leak (blocker)
- [ ] Update authentication system (high priority)

## Features
- [x] Basic functionality
- [ ] Enhanced features
`;
        }
        if (path.includes('feature.ts')) {
          return 'export function newFeature() { return "Hello World"; }';
        }
        return '';
      });
      
      mockStatSync.mockReturnValue({ size: 1024 } as any);

      const { smartGitPush } = await import('../src/tools/smart-git-push-tool.js');
      
      const result = await smartGitPush({
        projectPath: testDir,
        dryRun: true,
        checkReleaseReadiness: true,
        releaseType: 'minor',
        interactiveMode: false
      });

      expect(result.content[0].text).toContain('Release Readiness Analysis');
      expect(result.content[0].text).toContain('❌ Not Ready');
      expect(result.content[0].text).toContain('Release Blockers');
      expect(result.content[0].text).toContain('critical-todos');
    });

    it('should show success message when release ready', async () => {
      // Mock staged files
      mockExecSync
        .mockReturnValueOnce('A\tsrc/feature.ts') // git diff --cached
        .mockReturnValueOnce('Commit output') // git commit
        .mockReturnValueOnce('Push successful'); // git push
      
      // Mock file reading with completed TODOs
      mockExistsSync.mockImplementation((path: string) => {
        if (path.includes('TODO.md')) return true;
        if (path.includes('feature.ts')) return true;
        return false;
      });
      
      mockReadFileSync.mockImplementation((path: string) => {
        if (path.includes('TODO.md')) {
          return `# Project TODO

## Release 1.0
- [x] Core features implemented
- [x] All tests passing
- [x] Documentation updated
- [x] Security review completed

## Future Enhancements
- [ ] Performance optimizations (low priority)
- [ ] Additional features (low priority)
`;
        }
        if (path.includes('feature.ts')) {
          return 'export function newFeature() { return "Hello World"; }';
        }
        return '';
      });
      
      mockStatSync.mockReturnValue({ size: 1024 } as any);

      const { smartGitPush } = await import('../src/tools/smart-git-push-tool.js');
      
      const result = await smartGitPush({
        projectPath: testDir,
        dryRun: false,
        checkReleaseReadiness: true,
        releaseType: 'minor',
        message: 'Release v1.0',
        interactiveMode: false
      });

      expect(result.content[0].text).toContain('Smart Git Push - Success ✅');
      expect(result.content[0].text).toContain('Release Readiness: ✅ Ready');
      expect(result.content[0].text).toContain('Release Readiness Analysis');
      expect(result.content[0].text).toContain('🎉 Congratulations!');
      expect(result.content[0].text).toContain('release-ready state');
    });

    it('should handle no staged files with release readiness check', async () => {
      // Mock no staged files
      mockExecSync.mockReturnValueOnce('');
      
      // Mock TODO.md exists
      mockExistsSync.mockReturnValue(true);
      mockReadFileSync.mockReturnValue(`# Project TODO

## Current Sprint
- [x] Feature A
- [x] Feature B
- [ ] Feature C (in progress)

## Next Sprint
- [ ] Feature D
- [ ] Feature E
`);

      const { smartGitPush } = await import('../src/tools/smart-git-push-tool.js');
      
      const result = await smartGitPush({
        projectPath: testDir,
        checkReleaseReadiness: true,
        releaseType: 'patch'
      });

      expect(result.content[0].text).toContain('No staged files found');
      expect(result.content[0].text).toContain('Release Readiness Analysis');
      expect(result.content[0].text).toContain('Current Sprint');
      expect(result.content[0].text).toContain('Next Sprint');
    });
  });

  describe('Release Type Handling', () => {
    it('should handle different release types correctly', async () => {
      // Mock staged files
      mockExecSync.mockReturnValueOnce('A\tsrc/feature.ts');
      
      // Mock partial completion
      mockExistsSync.mockReturnValue(true);
      mockReadFileSync.mockImplementation((path: string) => {
        if (path.includes('TODO.md')) {
          return `# Project TODO

## Major Features
- [x] Feature 1
- [x] Feature 2
- [ ] Feature 3
- [ ] Feature 4

## Minor Features
- [x] Enhancement 1
- [x] Enhancement 2
`;
        }
        return 'export function test() {}';
      });
      
      mockStatSync.mockReturnValue({ size: 1024 } as any);

      const { smartGitPush } = await import('../src/tools/smart-git-push-tool.js');
      
      // Test patch release (should be more lenient)
      const patchResult = await smartGitPush({
        projectPath: testDir,
        dryRun: true,
        checkReleaseReadiness: true,
        releaseType: 'patch'
      });

      // Test major release (should be more strict)
      const majorResult = await smartGitPush({
        projectPath: testDir,
        dryRun: true,
        checkReleaseReadiness: true,
        releaseType: 'major'
      });

      expect(patchResult.content[0].text).toContain('releaseType: patch');
      expect(majorResult.content[0].text).toContain('releaseType: major');
    });
  });

  describe('Interactive Mode with Release Readiness', () => {
    it('should include release readiness in interactive approval', async () => {
      // Mock staged files with issues
      mockExecSync.mockReturnValueOnce('A\tdebug_script.py');
      
      // Mock problematic file and critical TODOs
      mockExistsSync.mockImplementation((path: string) => {
        if (path.includes('TODO.md')) return true;
        if (path.includes('debug_script.py')) return true;
        return false;
      });
      
      mockReadFileSync.mockImplementation((path: string) => {
        if (path.includes('TODO.md')) {
          return `# Project TODO

## Critical Issues
- [ ] Fix security vulnerability (critical)
- [ ] Memory leak in production (blocker)
`;
        }
        if (path.includes('debug_script.py')) {
          return 'print("Debug information")';
        }
        return '';
      });
      
      mockStatSync.mockReturnValue({ size: 1024 } as any);

      const { smartGitPush } = await import('../src/tools/smart-git-push-tool.js');
      
      const result = await smartGitPush({
        projectPath: testDir,
        dryRun: true,
        checkReleaseReadiness: true,
        interactiveMode: false, // Auto-reject for testing
        releaseType: 'minor'
      });

      expect(result.content[0].text).toContain('Release Readiness Issues');
      expect(result.content[0].text).toContain('Critical Blockers');
      expect(result.content[0].text).toContain('security vulnerability');
    });
  });

  describe('Error Handling', () => {
    it('should handle release readiness analysis errors gracefully', async () => {
      // Mock staged files
      mockExecSync.mockReturnValueOnce('A\tsrc/feature.ts');
      
      // Mock TODO.md read error
      mockExistsSync.mockImplementation((path: string) => {
        if (path.includes('TODO.md')) return true;
        if (path.includes('feature.ts')) return true;
        return false;
      });
      
      mockReadFileSync.mockImplementation((path: string) => {
        if (path.includes('TODO.md')) {
          throw new Error('File read error');
        }
        return 'export function test() {}';
      });
      
      mockStatSync.mockReturnValue({ size: 1024 } as any);

      const { smartGitPush } = await import('../src/tools/smart-git-push-tool.js');
      
      const result = await smartGitPush({
        projectPath: testDir,
        dryRun: true,
        checkReleaseReadiness: true,
        releaseType: 'minor'
      });

      // Should still work but without release readiness analysis
      expect(result.content[0].text).toContain('Smart Git Push - Dry Run');
      expect(result.content[0].text).toContain('Files to Push: 1');
    });

    it('should handle missing release readiness detector gracefully', async () => {
      // Mock staged files
      mockExecSync.mockReturnValueOnce('A\tsrc/feature.ts');
      
      mockExistsSync.mockReturnValue(true);
      mockReadFileSync.mockReturnValue('export function test() {}');
      mockStatSync.mockReturnValue({ size: 1024 } as any);

      // Mock import error for release readiness detector
      jest.doMock('../src/utils/release-readiness-detector.js', () => {
        throw new Error('Module not found');
      });

      const { smartGitPush } = await import('../src/tools/smart-git-push-tool.js');
      
      const result = await smartGitPush({
        projectPath: testDir,
        dryRun: true,
        checkReleaseReadiness: true,
        releaseType: 'minor'
      });

      // Should still work but without release readiness analysis
      expect(result.content[0].text).toContain('Smart Git Push - Dry Run');
      expect(result.content[0].text).toContain('Files to Push: 1');
    });
  });

  describe('Performance with Release Readiness', () => {
    it('should not significantly slow down push analysis', async () => {
      // Mock staged files
      mockExecSync.mockReturnValueOnce('A\tsrc/feature.ts');
      
      // Mock medium-sized TODO.md
      mockExistsSync.mockReturnValue(true);
      mockReadFileSync.mockImplementation((path: string) => {
        if (path.includes('TODO.md')) {
          let content = '# Project TODO\n\n';
          for (let i = 0; i < 10; i++) {
            content += `## Feature ${i}\n`;
            for (let j = 0; j < 10; j++) {
              content += `- [${j % 2 === 0 ? 'x' : ' '}] Task ${j}\n`;
            }
          }
          return content;
        }
        return 'export function test() {}';
      });
      
      mockStatSync.mockReturnValue({ size: 1024 } as any);

      const { smartGitPush } = await import('../src/tools/smart-git-push-tool.js');
      
      const startTime = Date.now();
      const result = await smartGitPush({
        projectPath: testDir,
        dryRun: true,
        checkReleaseReadiness: true,
        releaseType: 'minor'
      });
      const duration = Date.now() - startTime;

      expect(duration).toBeLessThan(2000); // Should complete within 2 seconds
      expect(result.content[0].text).toContain('Release Readiness Analysis');
    });
  });

  describe('Output Format Validation', () => {
    it('should format release readiness output correctly', async () => {
      // Mock staged files
      mockExecSync.mockReturnValueOnce('A\tsrc/feature.ts');
      
      // Mock TODO.md with specific completion rates
      mockExistsSync.mockReturnValue(true);
      mockReadFileSync.mockImplementation((path: string) => {
        if (path.includes('TODO.md')) {
          return `# Project TODO

## Core Features
- [x] Feature 1
- [x] Feature 2
- [x] Feature 3
- [ ] Feature 4

## Testing
- [x] Unit tests
- [x] Integration tests
`;
        }
        return 'export function test() {}';
      });
      
      mockStatSync.mockReturnValue({ size: 1024 } as any);

      const { smartGitPush } = await import('../src/tools/smart-git-push-tool.js');
      
      const result = await smartGitPush({
        projectPath: testDir,
        dryRun: true,
        checkReleaseReadiness: true,
        releaseType: 'minor'
      });

      const text = result.content[0].text;
      
      // Check for proper markdown formatting
      expect(text).toContain('## Release Readiness Analysis');
      expect(text).toContain('### Pre-Push Recommendations');
      expect(text).toContain('**Score**:');
      expect(text).toContain('**Confidence**:');
      
      // Check for milestone status formatting
      expect(text).toContain('Core Features');
      expect(text).toContain('Testing');
      expect(text).toContain('75.0%'); // 3/4 for Core Features
      expect(text).toContain('100.0%'); // 2/2 for Testing
    });

    it('should handle empty milestones gracefully', async () => {
      // Mock staged files
      mockExecSync.mockReturnValueOnce('A\tsrc/feature.ts');
      
      // Mock empty TODO.md
      mockExistsSync.mockReturnValue(true);
      mockReadFileSync.mockImplementation((path: string) => {
        if (path.includes('TODO.md')) {
          return '# Project TODO\n\nNo current tasks.';
        }
        return 'export function test() {}';
      });
      
      mockStatSync.mockReturnValue({ size: 1024 } as any);

      const { smartGitPush } = await import('../src/tools/smart-git-push-tool.js');
      
      const result = await smartGitPush({
        projectPath: testDir,
        dryRun: true,
        checkReleaseReadiness: true,
        releaseType: 'minor'
      });

      expect(result.content[0].text).toContain('Release Readiness Analysis');
      expect(result.content[0].text).toContain('Ready for Release');
    });
  });
});