/**
 * Unit tests for interactive-approval.ts
 * Tests interactive approval workflow, batch operations, and user choice processing
 */

import { describe, it, expect, _beforeEach, _afterEach, vi } from 'vitest';

// Mock readline interface
const mockRl = {
  question: vi.fn(),
  close: vi.fn(),
};

vi.mock('readline', () => ({
  createInterface: vi.fn().mockReturnValue(mockRl),
}));

// Mock fs module with proper implementation
const mockFs = {
  readFileSync: vi.fn(),
  writeFileSync: vi.fn(),
  existsSync: vi.fn(() => true),
};

vi.mock('fs', () => mockFs);

// Mock require function for the saveApprovalPreferences function
(global as any).require = vi.fn().mockImplementation((module: any) => {
  if (module === 'fs') {
    return mockFs;
  }
  return {};
});

const { handleInteractiveApproval, batchApproval, saveApprovalPreferences } =
  await import('../../src/utils/interactive-approval.js');

describe('interactive-approval', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset console methods
    vi.spyOn(console, 'log').mockImplementation(() => {});

    // Reset mock implementations
    mockFs.writeFileSync.mockImplementation(() => {});
    mockFs.readFileSync.mockImplementation(() => '{}');
    mockFs.existsSync.mockImplementation(() => true);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('handleInteractiveApproval', () => {
    it('should return proceed true for empty items array', async () => {
      const result = await handleInteractiveApproval([], {
        interactiveMode: false,
        autoApproveInfo: false,
        autoRejectErrors: false,
        dryRun: false,
        batchMode: false,
      });

      expect(result.proceed).toBe(true);
      expect(result.approved).toEqual([]);
      expect(result.rejected).toEqual([]);
      expect(result.moved).toEqual([]);
      expect(result.actions).toEqual([]);
    });

    it('should handle non-interactive mode with auto-reject errors', async () => {
      const items = [
        {
          filePath: 'test.js',
          issues: [
            {
              type: 'sensitive-content' as const,
              message: 'Contains API key',
              severity: 'error' as const,
            },
          ],
          suggestions: [],
          severity: 'error' as const,
          allowedInLocation: false,
          confidence: 0.9,
        },
      ];

      const result = await handleInteractiveApproval(items, {
        interactiveMode: false,
        autoApproveInfo: false,
        autoRejectErrors: true,
        dryRun: false,
        batchMode: false,
      });

      expect(result.proceed).toBe(false);
      expect(result.rejected).toContain('test.js');
    });

    it('should auto-approve info items when option is set', async () => {
      const items = [
        {
          filePath: 'info.js',
          issues: [
            {
              type: 'temporary-file' as const,
              message: 'Temporary file',
              severity: 'info' as const,
            },
          ],
          suggestions: [],
          severity: 'info' as const,
          allowedInLocation: true,
          confidence: 0.5,
        },
      ];

      const result = await handleInteractiveApproval(items, {
        interactiveMode: false,
        autoApproveInfo: true,
        autoRejectErrors: false,
        dryRun: false,
        batchMode: false,
      });

      expect(result.proceed).toBe(true);
      expect(result.approved).toContain('info.js');
    });

    it('should proceed when no files are rejected in non-interactive mode', async () => {
      const items = [
        {
          filePath: 'warning.js',
          issues: [
            {
              type: 'location-violation' as const,
              message: 'Wrong location',
              severity: 'warning' as const,
            },
          ],
          suggestions: [],
          severity: 'warning' as const,
          allowedInLocation: true,
          confidence: 0.7,
        },
      ];

      const result = await handleInteractiveApproval(items, {
        interactiveMode: false,
        autoApproveInfo: false,
        autoRejectErrors: false,
        dryRun: false,
        batchMode: false,
      });

      expect(result.proceed).toBe(true);
      expect(result.approved).toContain('warning.js');
    });
  });

  describe('batchApproval', () => {
    it('should apply action to items with same severity', () => {
      const items = [
        {
          filePath: 'file1.js',
          issues: [
            { type: 'sensitive-content' as const, message: 'API key', severity: 'error' as const },
          ],
          suggestions: [],
          severity: 'error' as const,
          allowedInLocation: true,
          confidence: 0.9,
        },
        {
          filePath: 'file2.js',
          issues: [
            {
              type: 'location-violation' as const,
              message: 'Wrong location',
              severity: 'error' as const,
            },
          ],
          suggestions: [],
          severity: 'error' as const,
          allowedInLocation: false,
          confidence: 0.8,
        },
        {
          filePath: 'file3.js',
          issues: [
            { type: 'temporary-file' as const, message: 'Temp file', severity: 'warning' as const },
          ],
          suggestions: [],
          severity: 'warning' as const,
          allowedInLocation: true,
          confidence: 0.6,
        },
      ];

      const action = { type: 'reject' as const, filePath: 'file1.js', reason: 'User rejected' };
      const criteria = { sameSeverity: true };

      const result = batchApproval(items, action, criteria);

      expect(result).toHaveLength(2);
      expect(result.map(a => a.filePath)).toEqual(['file1.js', 'file2.js']);
      expect(result.every(a => a.type === 'reject')).toBe(true);
    });

    it('should apply action to items with same issue type', () => {
      const items = [
        {
          filePath: 'file1.js',
          issues: [
            { type: 'sensitive-content' as const, message: 'API key', severity: 'error' as const },
            {
              type: 'location-violation' as const,
              message: 'Wrong location',
              severity: 'warning' as const,
            },
          ],
          suggestions: [],
          severity: 'error' as const,
          allowedInLocation: true,
          confidence: 0.9,
        },
        {
          filePath: 'file2.js',
          issues: [
            { type: 'sensitive-content' as const, message: 'Password', severity: 'error' as const },
          ],
          suggestions: [],
          severity: 'error' as const,
          allowedInLocation: true,
          confidence: 0.8,
        },
        {
          filePath: 'file3.js',
          issues: [
            { type: 'temporary-file' as const, message: 'Temp file', severity: 'warning' as const },
          ],
          suggestions: [],
          severity: 'warning' as const,
          allowedInLocation: true,
          confidence: 0.6,
        },
      ];

      const action = { type: 'reject' as const, filePath: 'file1.js', reason: 'Sensitive content' };
      const criteria = { sameIssueType: true };

      const result = batchApproval(items, action, criteria);

      expect(result).toHaveLength(2);
      expect(result.map(a => a.filePath)).toEqual(['file1.js', 'file2.js']);
    });

    it('should return only original action if reference item not found', () => {
      const items = [
        {
          filePath: 'file1.js',
          issues: [
            { type: 'sensitive-content' as const, message: 'API key', severity: 'error' as const },
          ],
          suggestions: [],
          severity: 'error' as const,
          allowedInLocation: true,
          confidence: 0.9,
        },
      ];

      const action = { type: 'reject' as const, filePath: 'nonexistent.js', reason: 'Not found' };
      const criteria = { sameSeverity: true };

      const result = batchApproval(items, action, criteria);

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual(action);
    });

    it('should handle multiple criteria filters', () => {
      const items = [
        {
          filePath: 'file1.js',
          issues: [
            { type: 'sensitive-content' as const, message: 'API key', severity: 'error' as const },
          ],
          suggestions: [],
          severity: 'error' as const,
          allowedInLocation: true,
          confidence: 0.9,
        },
        {
          filePath: 'file2.js',
          issues: [
            { type: 'sensitive-content' as const, message: 'Password', severity: 'error' as const },
          ],
          suggestions: [],
          severity: 'error' as const,
          allowedInLocation: true,
          confidence: 0.8,
        },
        {
          filePath: 'file3.js',
          issues: [
            { type: 'sensitive-content' as const, message: 'Token', severity: 'warning' as const },
          ],
          suggestions: [],
          severity: 'warning' as const,
          allowedInLocation: true,
          confidence: 0.7,
        },
      ];

      const action = { type: 'reject' as const, filePath: 'file1.js', reason: 'Sensitive content' };
      const criteria = { sameSeverity: true, sameIssueType: true };

      const result = batchApproval(items, action, criteria);

      expect(result).toHaveLength(2);
      expect(result.map(a => a.filePath)).toEqual(['file1.js', 'file2.js']);
    });

    it('should include target and reason in batch actions', () => {
      const items = [
        {
          filePath: 'file1.js',
          issues: [
            {
              type: 'location-violation' as const,
              message: 'Wrong location',
              severity: 'warning' as const,
            },
          ],
          suggestions: [],
          severity: 'warning' as const,
          allowedInLocation: false,
          confidence: 0.8,
        },
        {
          filePath: 'file2.js',
          issues: [
            {
              type: 'location-violation' as const,
              message: 'Wrong location',
              severity: 'warning' as const,
            },
          ],
          suggestions: [],
          severity: 'warning' as const,
          allowedInLocation: false,
          confidence: 0.7,
        },
      ];

      const action = {
        type: 'move' as const,
        filePath: 'file1.js',
        target: 'scripts/',
        reason: 'Move to correct location',
      };
      const criteria = { sameIssueType: true };

      const result = batchApproval(items, action, criteria);

      expect(result).toHaveLength(2);
      expect(result[0].target).toBe('scripts/');
      expect(result[1].target).toBe('scripts/');
      expect(result[1].reason).toContain('Batch move - similar to file1.js');
    });
  });

  describe('saveApprovalPreferences', () => {
    it('should save approval preferences to file', async () => {
      const actions = [
        { type: 'approve' as const, filePath: 'src/test.js', reason: 'User approved' },
        { type: 'reject' as const, filePath: 'temp/cache.tmp', reason: 'Temporary file' },
        {
          type: 'move' as const,
          filePath: 'wrong/location.js',
          target: 'scripts/',
          reason: 'Wrong location',
        },
      ];

      await saveApprovalPreferences(actions, '.test-approvals.json');

      expect(mockFs.writeFileSync).toHaveBeenCalledWith(
        '.test-approvals.json',
        expect.stringContaining('"pattern": "src/*"')
      );
      expect(mockFs.writeFileSync).toHaveBeenCalledWith(
        '.test-approvals.json',
        expect.stringContaining('"pattern": "temp/*"')
      );
      expect(mockFs.writeFileSync).toHaveBeenCalledWith(
        '.test-approvals.json',
        expect.stringContaining('"pattern": "wrong/*"')
      );
    });

    it('should use default config path when not specified', async () => {
      const actions = [{ type: 'approve' as const, filePath: 'test.js' }];

      await saveApprovalPreferences(actions);

      expect(mockFs.writeFileSync).toHaveBeenCalledWith(
        '.smartgit-approvals.json',
        expect.any(String)
      );
    });

    it('should handle file write errors gracefully', async () => {
      const consoleSpy = vi.spyOn(console, 'log');

      mockFs.writeFileSync.mockImplementation(() => {
        throw new Error('Permission denied');
      });

      const actions = [{ type: 'approve' as const, filePath: 'test.js' }];

      await expect(saveApprovalPreferences(actions)).resolves.not.toThrow();
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Could not save preferences: Permission denied')
      );
    });

    it('should handle non-Error exceptions', async () => {
      const consoleSpy = vi.spyOn(console, 'log');

      mockFs.writeFileSync.mockImplementation(() => {
        throw 'String error';
      });

      const actions = [{ type: 'approve' as const, filePath: 'test.js' }];

      await expect(saveApprovalPreferences(actions)).resolves.not.toThrow();
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Could not save preferences:')
      );
    });

    it('should create preferences with timestamp and mapped actions', async () => {
      const actions = [
        {
          type: 'approve' as const,
          filePath: 'src/components/Button.js',
          reason: 'Good component',
        },
        {
          type: 'ignore' as const,
          filePath: 'node_modules/package/index.js',
          reason: 'Third party',
        },
      ];

      await saveApprovalPreferences(actions, 'test-config.json');

      expect(mockFs.writeFileSync).toHaveBeenCalled();
      const writeCall = mockFs.writeFileSync.mock.calls[0];
      expect(writeCall).toBeDefined();
      expect(writeCall[1]).toBeDefined();

      const savedContent = JSON.parse(writeCall[1] as string);

      expect(savedContent).toHaveProperty('timestamp');
      expect(savedContent).toHaveProperty('actions');
      expect(savedContent.actions).toHaveLength(2);
      expect(savedContent.actions[0].pattern).toBe('src/components/*');
      expect(savedContent.actions[0].type).toBe('approve');
      expect(savedContent.actions[1].pattern).toBe('node_modules/package/*');
      expect(savedContent.actions[1].type).toBe('ignore');
    });
  });
});
