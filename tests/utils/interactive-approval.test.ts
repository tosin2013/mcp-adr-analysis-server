/**
 * Unit tests for interactive-approval.ts
 * Tests interactive approval workflow, batch operations, and user choice processing
 */

import { jest } from '@jest/globals';

// Mock readline interface
const mockRl = {
  question: jest.fn(),
  close: jest.fn(),
};

jest.unstable_mockModule('readline', () => ({
  createInterface: jest.fn().mockReturnValue(mockRl),
}));

// Mock fs module with proper implementation
const mockFs = {
  readFileSync: jest.fn(),
  writeFileSync: jest.fn(),
  existsSync: jest.fn(() => true),
};

jest.unstable_mockModule('fs', () => mockFs);

// Mock require function for the saveApprovalPreferences function
(global as any).require = jest.fn().mockImplementation((module: any) => {
  if (module === 'fs') {
    return mockFs;
  }
  return {};
});

const { handleInteractiveApproval, batchApproval, saveApprovalPreferences } = await import(
  '../../src/utils/interactive-approval.js'
);

describe('interactive-approval', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Reset console methods
    jest.spyOn(console, 'log').mockImplementation(() => {});

    // Reset mock implementations
    mockFs.writeFileSync.mockImplementation(() => {});
    mockFs.readFileSync.mockImplementation(() => '{}');
    mockFs.existsSync.mockImplementation(() => true);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('handleInteractiveApproval', () => {
    it('should return proceed true for empty items array', async () => {
      const result = await handleInteractiveApproval([]);
      expect(result.proceed).toBe(true);
      expect(result.actions).toEqual([]);
    });

    it('should handle single item approval', async () => {
      mockRl.question.mockImplementationOnce((question: any, callback: any) => {
        callback('y');
      });

      const items = [
        {
          filePath: 'test.js',
          reason: 'Test file',
          metadata: { size: 100, isNew: true },
        },
      ];

      const result = await handleInteractiveApproval(items);

      expect(result.proceed).toBe(true);
      expect(result.actions).toHaveLength(1);
      expect(result.actions[0].type).toBe('approve');
      expect(result.actions[0].filePath).toBe('test.js');
    });

    it('should handle user rejection', async () => {
      mockRl.question.mockImplementationOnce((question: any, callback: any) => {
        callback('n');
      });

      const items = [
        {
          filePath: 'test.js',
          reason: 'Test file',
          metadata: { size: 100, isNew: false },
        },
      ];

      const result = await handleInteractiveApproval(items);

      expect(result.proceed).toBe(false);
      expect(result.actions).toHaveLength(1);
      expect(result.actions[0].type).toBe('reject');
      expect(result.actions[0].filePath).toBe('test.js');
    });

    it('should handle batch approval', async () => {
      mockRl.question
        .mockImplementationOnce((question: any, callback: any) => {
          callback('ba'); // Batch approve
        })
        .mockImplementationOnce((question: any, callback: any) => {
          callback('y'); // Confirm batch
        });

      const items = [
        {
          filePath: 'test1.js',
          reason: 'Test file 1',
          metadata: { size: 100, issueType: 'formatting' },
        },
        {
          filePath: 'test2.js',
          reason: 'Test file 2',
          metadata: { size: 200, issueType: 'formatting' },
        },
      ];

      const result = await handleInteractiveApproval(items);

      expect(result.proceed).toBe(true);
      expect(result.actions).toHaveLength(2);
      expect(result.actions.every(a => a.type === 'approve')).toBe(true);
    });

    it('should handle move operation', async () => {
      mockRl.question
        .mockImplementationOnce((question: any, callback: any) => {
          callback('m'); // Move
        })
        .mockImplementationOnce((question: any, callback: any) => {
          callback('utils/'); // Target directory
        });

      const items = [
        {
          filePath: 'misplaced.js',
          reason: 'Wrong location',
          metadata: { size: 150, isNew: true },
        },
      ];

      const result = await handleInteractiveApproval(items);

      expect(result.proceed).toBe(true);
      expect(result.actions).toHaveLength(1);
      expect(result.actions[0].type).toBe('move');
      expect(result.actions[0].target).toBe('utils/');
    });

    it('should handle invalid input gracefully', async () => {
      mockRl.question
        .mockImplementationOnce((question: any, callback: any) => {
          callback('invalid'); // Invalid input
        })
        .mockImplementationOnce((question: any, callback: any) => {
          callback('y'); // Valid input on retry
        });

      const items = [
        {
          filePath: 'test.js',
          reason: 'Test file',
          metadata: { size: 100, isNew: false },
        },
      ];

      const result = await handleInteractiveApproval(items);

      expect(result.proceed).toBe(true);
      expect(result.actions[0].type).toBe('approve');
    });

    it('should handle quit operation', async () => {
      mockRl.question.mockImplementationOnce((question: any, callback: any) => {
        callback('q'); // Quit
      });

      const items = [
        {
          filePath: 'test.js',
          reason: 'Test file',
          metadata: { size: 100, isNew: true },
        },
      ];

      const result = await handleInteractiveApproval(items);

      expect(result.proceed).toBe(false);
      expect(result.actions).toEqual([]);
    });

    it('should handle help display', async () => {
      const consoleSpy = jest.spyOn(console, 'log');

      mockRl.question
        .mockImplementationOnce((question: any, callback: any) => {
          callback('h'); // Help
        })
        .mockImplementationOnce((question: any, callback: any) => {
          callback('y'); // Then approve
        });

      const items = [
        {
          filePath: 'test.js',
          reason: 'Test file',
          metadata: { size: 100, isNew: false },
        },
      ];

      const result = await handleInteractiveApproval(items);

      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Available commands:'));
      expect(result.proceed).toBe(true);
    });
  });

  describe('batchApproval', () => {
    it('should apply batch action to items with same issue type', () => {
      const items = [
        {
          filePath: 'file1.js',
          reason: 'Formatting issue',
          metadata: { issueType: 'formatting', size: 100 },
        },
        {
          filePath: 'file2.js',
          reason: 'Different issue',
          metadata: { issueType: 'logic', size: 200 },
        },
        {
          filePath: 'file3.js',
          reason: 'Another formatting issue',
          metadata: { issueType: 'formatting', size: 300 },
        },
      ];

      const action = {
        type: 'approve' as const,
        filePath: 'file1.js',
        reason: 'User approved',
      };
      const criteria = { sameIssueType: true };

      const result = batchApproval(items, action, criteria);

      expect(result).toHaveLength(2);
      expect(result[0].filePath).toBe('file1.js');
      expect(result[1].filePath).toBe('file3.js');
      expect(result.every(a => a.type === 'approve')).toBe(true);
    });

    it('should apply batch action to items with similar file sizes', () => {
      const items = [
        {
          filePath: 'small1.js',
          reason: 'Small file',
          metadata: { size: 50, issueType: 'formatting' },
        },
        {
          filePath: 'large1.js',
          reason: 'Large file',
          metadata: { size: 5000, issueType: 'logic' },
        },
        {
          filePath: 'small2.js',
          reason: 'Another small file',
          metadata: { size: 75, issueType: 'syntax' },
        },
      ];

      const action = {
        type: 'ignore' as const,
        filePath: 'small1.js',
        reason: 'Too small to matter',
      };
      const criteria = { similarSize: true, sizeThreshold: 1000 };

      const result = batchApproval(items, action, criteria);

      expect(result).toHaveLength(2);
      expect(result[0].filePath).toBe('small1.js');
      expect(result[1].filePath).toBe('small2.js');
      expect(result.every(a => a.type === 'ignore')).toBe(true);
    });

    it('should apply batch move operation', () => {
      const items = [
        {
          filePath: 'file1.js',
          reason: 'Wrong location',
          metadata: { issueType: 'location', size: 100 },
        },
        {
          filePath: 'file2.js',
          reason: 'Also wrong location',
          metadata: { issueType: 'location', size: 200 },
        },
        {
          filePath: 'file3.js',
          reason: 'Different issue',
          metadata: { issueType: 'syntax', size: 300 },
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
      const consoleSpy = jest.spyOn(console, 'log');

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
      const consoleSpy = jest.spyOn(console, 'log');

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

    it('should merge with existing preferences file', async () => {
      const existingPrefs = {
        timestamp: '2023-01-01T00:00:00.000Z',
        actions: [
          { pattern: 'lib/*', type: 'approve', reason: 'Library files' },
        ],
      };

      mockFs.readFileSync.mockReturnValue(JSON.stringify(existingPrefs));
      mockFs.existsSync.mockReturnValue(true);

      const actions = [
        { type: 'reject' as const, filePath: 'temp/file.tmp', reason: 'Temporary' },
      ];

      await saveApprovalPreferences(actions, '.test-approvals.json');

      const writeCall = mockFs.writeFileSync.mock.calls[0];
      const savedContent = JSON.parse(writeCall[1] as string);

      expect(savedContent.actions).toHaveLength(2);
      expect(savedContent.actions[0].pattern).toBe('lib/*'); // Existing
      expect(savedContent.actions[1].pattern).toBe('temp/*'); // New
    });
  });

  describe('error handling', () => {
    it('should handle readline errors gracefully', async () => {
      mockRl.question.mockImplementation(() => {
        throw new Error('Readline error');
      });

      const items = [
        {
          filePath: 'test.js',
          reason: 'Test file',
          metadata: { size: 100, isNew: true },
        },
      ];

      const result = await handleInteractiveApproval(items);

      expect(result.proceed).toBe(false);
      expect(result.actions).toEqual([]);
    });

    it('should handle malformed existing preferences file', async () => {
      mockFs.readFileSync.mockReturnValue('invalid json');
      mockFs.existsSync.mockReturnValue(true);

      const actions = [
        { type: 'approve' as const, filePath: 'test.js', reason: 'Test' },
      ];

      await expect(saveApprovalPreferences(actions)).resolves.not.toThrow();

      // Should still write new preferences
      expect(mockFs.writeFileSync).toHaveBeenCalled();
      const writeCall = mockFs.writeFileSync.mock.calls[0];
      const savedContent = JSON.parse(writeCall[1] as string);
      expect(savedContent.actions).toHaveLength(1);
    });
  });
});
