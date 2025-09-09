/**
 * Unit tests for todo-migration.ts
 * Comprehensive test coverage for all exported functions and classes
 */

import { jest } from '@jest/globals';
import path from 'path';

// Mock dependencies
const mockTodoManager = {
  loadTodoData: jest.fn() as jest.MockedFunction<any>,
  saveTodoData: jest.fn() as jest.MockedFunction<any>,
  convertToMarkdown: jest.fn() as jest.MockedFunction<any>
};

const mockConfig = {
  projectPath: '/default/project'
};

const mockFs = {
  access: jest.fn() as jest.MockedFunction<any>,
  readFile: jest.fn() as jest.MockedFunction<any>,
  copyFile: jest.fn() as jest.MockedFunction<any>,
  mkdir: jest.fn() as jest.MockedFunction<any>
};

// Mock the fs/promises module
jest.unstable_mockModule('fs/promises', () => mockFs);

// Mock TodoJsonManager
jest.unstable_mockModule('../../src/utils/todo-json-manager.js', () => ({
  TodoJsonManager: jest.fn().mockImplementation(() => mockTodoManager)
}));

// Mock config
jest.unstable_mockModule('../../src/utils/config.js', () => ({
  loadConfig: jest.fn().mockReturnValue(mockConfig)
}));

// Mock todo-markdown-converter
jest.unstable_mockModule('../../src/utils/todo-markdown-converter.js', () => ({
  parseMarkdownToJson: jest.fn()
}));

// Mock todo-json-schemas
jest.unstable_mockModule('../../src/types/todo-json-schemas.js', () => ({
  TodoJsonDataSchema: {
    parse: jest.fn()
  }
}));

const { TodoMigrationUtility } = await import('../../src/utils/todo-migration.js');
const { parseMarkdownToJson } = await import('../../src/utils/todo-markdown-converter.js');
const { TodoJsonDataSchema } = await import('../../src/types/todo-json-schemas.js');

// Import types
import type { MigrationOptions, MigrationResult } from '../../src/utils/todo-migration.js';

describe('TodoMigrationUtility', () => {
  let migrationUtility: InstanceType<typeof TodoMigrationUtility>;
  const mockProjectPath = '/test/project';

  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();
    migrationUtility = new TodoMigrationUtility(mockProjectPath);
  });

  describe('constructor', () => {
    it('should initialize with provided project path', () => {
      expect(migrationUtility).toBeInstanceOf(TodoMigrationUtility);
    });

    it('should initialize without project path using default config', () => {
      const utility = new TodoMigrationUtility();
      expect(utility).toBeInstanceOf(TodoMigrationUtility);
    });

    it('should handle null project path by using config default', () => {
      const utility = new TodoMigrationUtility(null as any);
      expect(utility).toBeInstanceOf(TodoMigrationUtility);
    });

    it('should handle undefined project path by using config default', () => {
      const utility = new TodoMigrationUtility(undefined);
      expect(utility).toBeInstanceOf(TodoMigrationUtility);
    });
  });

  describe('migrateToJsonFormat', () => {
    it('should handle missing TODO.md file and create fresh JSON structure', async () => {
      mockFs.access.mockRejectedValue(new Error('File not found'));
      mockTodoManager.loadTodoData.mockResolvedValue(undefined);

      const result = await migrationUtility.migrateToJsonFormat();
      
      expect(result.success).toBe(true);
      expect(result.warnings).toContain('No TODO.md file found - creating fresh JSON structure');
      expect(result.summary).toContain('Created new JSON TODO structure');
      expect(mockTodoManager.loadTodoData).toHaveBeenCalled();
    });

    it('should warn when JSON already exists', async () => {
      mockFs.access.mockResolvedValueOnce(undefined); // TODO.md exists
      mockFs.access.mockResolvedValueOnce(undefined); // JSON exists
      mockFs.readFile.mockResolvedValue('# TODO\n- [ ] Task 1');
      (parseMarkdownToJson as jest.Mock).mockResolvedValue({ tasks: { 'task1': { title: 'Task 1' } } });
      mockTodoManager.saveTodoData.mockResolvedValue(undefined);

      const result = await migrationUtility.migrateToJsonFormat();
      
      expect(result.warnings).toContain('JSON TODO data already exists - this will merge with existing data');
    });

    it('should create backup when backupOriginal is true', async () => {
      mockFs.access.mockResolvedValue(undefined); // TODO.md exists
      mockFs.readFile.mockResolvedValue('# TODO\n- [ ] Task 1');
      mockFs.mkdir.mockResolvedValue(undefined);
      mockFs.copyFile.mockResolvedValue(undefined);
      (parseMarkdownToJson as jest.Mock).mockResolvedValue({ tasks: { 'task1': { title: 'Task 1' } } });
      mockTodoManager.saveTodoData.mockResolvedValue(undefined);

      const options: MigrationOptions = { backupOriginal: true };
      const result = await migrationUtility.migrateToJsonFormat(options);
      
      expect(mockFs.mkdir).toHaveBeenCalled();
      expect(mockFs.copyFile).toHaveBeenCalled();
      expect(result.backupPath).toBeDefined();
      expect(result.backupPath).toContain('TODO-');
      expect(result.backupPath).toContain('.md');
    });

    it('should handle dry run without making changes', async () => {
      mockFs.access.mockResolvedValue(undefined); // TODO.md exists
      mockFs.readFile.mockResolvedValue('# TODO\n- [ ] Task 1\n- [x] Task 2');
      (parseMarkdownToJson as jest.Mock).mockResolvedValue({ 
        tasks: { 
          'task1': { title: 'Task 1' }, 
          'task2': { title: 'Task 2' } 
        } 
      });

      const options: MigrationOptions = { dryRun: true };
      const result = await migrationUtility.migrateToJsonFormat(options);
      
      expect(result.success).toBe(true);
      expect(result.migratedTasks).toBe(2);
      expect(result.summary).toContain('Dry run: Would migrate 2 tasks');
      expect(mockTodoManager.saveTodoData).not.toHaveBeenCalled();
    });

    it('should validate migration when validateAfterMigration is true', async () => {
      mockFs.access.mockResolvedValue(undefined);
      mockFs.readFile.mockResolvedValue('# TODO\n- [ ] Task 1');
      const mockParsedData = { 
        tasks: { 'task1': { title: 'Task 1', dependencies: [] } },
        sections: [{ name: 'Todo', tasks: ['task1'] }]
      };
      (parseMarkdownToJson as jest.Mock).mockResolvedValue(mockParsedData);
      (TodoJsonDataSchema.parse as jest.Mock).mockReturnValue(mockParsedData);
      mockTodoManager.saveTodoData.mockResolvedValue(undefined);

      const options: MigrationOptions = { validateAfterMigration: true };
      const result = await migrationUtility.migrateToJsonFormat(options);
      
      expect(TodoJsonDataSchema.parse).toHaveBeenCalledWith(mockParsedData);
    });

    it('should handle validation errors', async () => {
      mockFs.access.mockResolvedValue(undefined);
      mockFs.readFile.mockResolvedValue('# TODO\n- [ ] Task 1');
      const mockParsedData = { tasks: { 'task1': { title: 'Task 1' } } };
      (parseMarkdownToJson as jest.Mock).mockResolvedValue(mockParsedData);
      (TodoJsonDataSchema.parse as jest.Mock).mockImplementation(() => {
        throw new Error('Invalid schema');
      });
      mockTodoManager.saveTodoData.mockResolvedValue(undefined);

      const options: MigrationOptions = { validateAfterMigration: true };
      const result = await migrationUtility.migrateToJsonFormat(options);
      
      expect(result.errors).toContain('Validation failed: Invalid schema');
    });

    it('should handle validation option without errors', async () => {
      mockFs.access.mockResolvedValueOnce(undefined); // TODO.md exists
      mockFs.access.mockRejectedValueOnce(new Error('File not found')); // JSON doesn't exist
      mockFs.readFile.mockResolvedValue('# TODO\n- [ ] Task 1');
      const mockParsedData = { 
        tasks: { 'task1': { title: 'Task 1' } },
        sections: [{ name: 'Todo', tasks: ['task1'] }]
      };
      (parseMarkdownToJson as jest.Mock).mockResolvedValue(mockParsedData);
      (TodoJsonDataSchema.parse as jest.Mock).mockReturnValue(mockParsedData);
      mockTodoManager.saveTodoData.mockResolvedValue(undefined);

      const options: MigrationOptions = { validateAfterMigration: true };
      const result = await migrationUtility.migrateToJsonFormat(options);
      
      expect(result.success).toBe(true);
      expect(result.migratedTasks).toBe(1);
      expect(TodoJsonDataSchema.parse).toHaveBeenCalledWith(mockParsedData);
    });

    it('should complete migration with validation enabled', async () => {
      mockFs.access.mockResolvedValueOnce(undefined); // TODO.md exists
      mockFs.access.mockRejectedValueOnce(new Error('File not found')); // JSON doesn't exist
      mockFs.readFile.mockResolvedValue('# TODO\n- [ ] Task 1\n- [x] Task 2');
      const mockParsedData = { 
        tasks: { 
          'task1': { title: 'Task 1' },
          'task2': { title: 'Task 2' }
        },
        sections: [{ name: 'Todo', tasks: ['task1', 'task2'] }]
      };
      (parseMarkdownToJson as jest.Mock).mockResolvedValue(mockParsedData);
      (TodoJsonDataSchema.parse as jest.Mock).mockReturnValue(mockParsedData);
      mockTodoManager.saveTodoData.mockResolvedValue(undefined);

      const options: MigrationOptions = { validateAfterMigration: true };
      const result = await migrationUtility.migrateToJsonFormat(options);
      
      expect(result.success).toBe(true);
      expect(result.migratedTasks).toBe(2);
      expect(TodoJsonDataSchema.parse).toHaveBeenCalledWith(mockParsedData);
      expect(result.summary).toContain('Successfully migrated 2 tasks');
    });

    it('should preserve markdown when preserveMarkdown is true', async () => {
      mockFs.access.mockResolvedValue(undefined);
      mockFs.readFile.mockResolvedValue('# TODO\n- [ ] Task 1');
      (parseMarkdownToJson as jest.Mock).mockResolvedValue({ tasks: { 'task1': { title: 'Task 1' } } });
      mockTodoManager.saveTodoData.mockResolvedValue(undefined);
      mockTodoManager.convertToMarkdown.mockResolvedValue(undefined);

      const options: MigrationOptions = { preserveMarkdown: true };
      const result = await migrationUtility.migrateToJsonFormat(options);
      
      expect(mockTodoManager.convertToMarkdown).toHaveBeenCalled();
      expect(result.warnings).toContain('TODO.md has been regenerated from JSON data for consistency');
    });

    it('should handle migration errors gracefully', async () => {
      mockFs.access.mockResolvedValue(undefined);
      mockFs.readFile.mockRejectedValue(new Error('Permission denied'));

      const result = await migrationUtility.migrateToJsonFormat();
      
      expect(result.success).toBe(false);
      expect(result.errors).toContain('Migration failed: Permission denied');
      expect(result.summary).toBe('Migration failed - see errors for details');
    });

    it('should handle all options together', async () => {
      mockFs.access.mockResolvedValue(undefined);
      mockFs.readFile.mockResolvedValue('# TODO\n- [ ] Task 1');
      mockFs.mkdir.mockResolvedValue(undefined);
      mockFs.copyFile.mockResolvedValue(undefined);
      const mockParsedData = { 
        tasks: { 'task1': { title: 'Task 1' } },
        sections: [{ name: 'Todo', tasks: ['task1'] }]
      };
      (parseMarkdownToJson as jest.Mock).mockResolvedValue(mockParsedData);
      (TodoJsonDataSchema.parse as jest.Mock).mockReturnValue(mockParsedData);

      const options: MigrationOptions = {
        backupOriginal: true,
        dryRun: true,
        validateAfterMigration: true,
        preserveMarkdown: true
      };
      const result = await migrationUtility.migrateToJsonFormat(options);
      
      expect(result.success).toBe(true);
      expect(result.summary).toContain('Dry run');
      expect(mockTodoManager.saveTodoData).not.toHaveBeenCalled();
      expect(mockTodoManager.convertToMarkdown).not.toHaveBeenCalled();
    });
  });

  describe('generateMigrationReport', () => {
    it('should return error message when TODO.md does not exist', async () => {
      mockFs.access.mockRejectedValue(new Error('File not found'));

      const report = await migrationUtility.generateMigrationReport();
      
      expect(report).toContain('TODO Migration Report');
      expect(report).toContain('❌ No TODO.md file found');
      expect(report).toContain('Use `manage_todo_json` with `create_task`');
    });

    it('should analyze existing TODO.md file', async () => {
      mockFs.access.mockResolvedValue(undefined);
      const todoContent = `# My Project TODO

## In Progress
- [ ] Task 1
- [x] Task 2

## Completed
- [x] Task 3`;
      mockFs.readFile.mockResolvedValue(todoContent);

      const report = await migrationUtility.generateMigrationReport();
      
      expect(report).toContain('TODO Migration Report');
      expect(report).toContain('Total Tasks**: 3');
      expect(report).toContain('Completed**: 2');
      expect(report).toContain('Pending**: 1');
      expect(report).toContain('Sections**: 2');
      expect(report).toContain('In Progress');
      expect(report).toContain('Completed');
    });

    it('should detect no tasks in TODO.md', async () => {
      mockFs.access.mockResolvedValue(undefined);
      const todoContent = `# My Project TODO\n\nThis is just a description.`;
      mockFs.readFile.mockResolvedValue(todoContent);

      const report = await migrationUtility.generateMigrationReport();
      
      expect(report).toContain('No tasks found in TODO.md');
    });

    it('should detect unorganized tasks (no sections)', async () => {
      mockFs.access.mockResolvedValue(undefined);
      const todoContent = `# My Project TODO\n- [ ] Task 1\n- [x] Task 2`;
      mockFs.readFile.mockResolvedValue(todoContent);

      const report = await migrationUtility.generateMigrationReport();
      
      expect(report).toContain('No sections found - tasks may be unorganized');
    });

    it('should detect nested tasks', async () => {
      mockFs.access.mockResolvedValue(undefined);
      const todoContent = `# TODO\n- [ ] Task 1\n  - [ ] Subtask 1`;
      mockFs.readFile.mockResolvedValue(todoContent);

      const report = await migrationUtility.generateMigrationReport();
      
      expect(report).toContain('Nested tasks detected - these will be converted to subtasks');
    });

    it('should detect task metadata', async () => {
      mockFs.access.mockResolvedValue(undefined);
      const todoContent = `# TODO\n- [ ] Task 1 @john 📅 2024-01-01`;
      mockFs.readFile.mockResolvedValue(todoContent);

      const report = await migrationUtility.generateMigrationReport();
      
      expect(report).toContain('Task metadata detected (assignees, dates) - these will be preserved');
    });

    it('should include migration recommendations', async () => {
      mockFs.access.mockResolvedValue(undefined);
      mockFs.readFile.mockResolvedValue('# TODO\n- [ ] Task 1');

      const report = await migrationUtility.generateMigrationReport();
      
      expect(report).toContain('Migration Options');
      expect(report).toContain('Recommended Command');
      expect(report).toContain('manage_todo_json --operation=import_from_markdown');
      expect(report).toContain('Alternative: Start Fresh');
    });

    it('should handle file read errors', async () => {
      mockFs.access.mockResolvedValue(undefined);
      mockFs.readFile.mockRejectedValue(new Error('Permission denied'));

      const report = await migrationUtility.generateMigrationReport();
      
      expect(report).toContain('❌ Error analyzing TODO.md: Permission denied');
    });
  });

  describe('generateFeatureComparison', () => {
    it('should return comprehensive feature comparison', async () => {
      const report = await migrationUtility.generateFeatureComparison();
      
      expect(report).toContain('TODO System Comparison');
      expect(report).toContain('Old System (Markdown-based)');
      expect(report).toContain('New System (JSON-first)');
      expect(report).toContain('Migration Benefits');
      expect(report).toContain('Migration Process');
    });

    it('should highlight old system limitations', async () => {
      const report = await migrationUtility.generateFeatureComparison();
      
      expect(report).toContain('❌ Inconsistent LLM updates');
      expect(report).toContain('❌ Manual task status tracking');
      expect(report).toContain('❌ No automatic scoring integration');
      expect(report).toContain('❌ Limited metadata support');
    });

    it('should highlight new system advantages', async () => {
      const report = await migrationUtility.generateFeatureComparison();
      
      expect(report).toContain('✅ Consistent LLM interactions');
      expect(report).toContain('✅ Automatic task status updates');
      expect(report).toContain('✅ Seamless scoring integration');
      expect(report).toContain('✅ Rich metadata');
      expect(report).toContain('✅ Full dependency tracking');
    });

    it('should describe migration benefits', async () => {
      const report = await migrationUtility.generateFeatureComparison();
      
      expect(report).toContain('Consistency');
      expect(report).toContain('Automation');
      expect(report).toContain('Intelligence');
      expect(report).toContain('Memory');
      expect(report).toContain('Analytics');
      expect(report).toContain('Reliability');
    });

    it('should outline migration steps', async () => {
      const report = await migrationUtility.generateFeatureComparison();
      
      expect(report).toContain('1. **Backup**');
      expect(report).toContain('2. **Parse**');
      expect(report).toContain('3. **Validate**');
      expect(report).toContain('4. **Sync**');
      expect(report).toContain('5. **Test**');
    });

    it('should emphasize backward compatibility', async () => {
      const report = await migrationUtility.generateFeatureComparison();
      
      expect(report).toContain('maintains backward compatibility');
    });
  });

  describe('private methods behavior', () => {
    it('should handle backup directory creation', async () => {
      mockFs.access.mockResolvedValue(undefined);
      mockFs.readFile.mockResolvedValue('# TODO\n- [ ] Task 1');
      mockFs.mkdir.mockResolvedValue(undefined);
      mockFs.copyFile.mockResolvedValue(undefined);
      (parseMarkdownToJson as jest.Mock).mockResolvedValue({ tasks: { 'task1': { title: 'Task 1' } } });
      mockTodoManager.saveTodoData.mockResolvedValue(undefined);

      const options: MigrationOptions = { backupOriginal: true };
      await migrationUtility.migrateToJsonFormat(options);
      
      expect(mockFs.mkdir).toHaveBeenCalledWith(
        expect.stringContaining('migration-backups'),
        { recursive: true }
      );
    });

    it('should handle backup directory creation errors gracefully', async () => {
      mockFs.access.mockResolvedValue(undefined);
      mockFs.readFile.mockResolvedValue('# TODO\n- [ ] Task 1');
      mockFs.mkdir.mockRejectedValue(new Error('Permission denied'));
      mockFs.copyFile.mockResolvedValue(undefined);
      (parseMarkdownToJson as jest.Mock).mockResolvedValue({ tasks: { 'task1': { title: 'Task 1' } } });
      mockTodoManager.saveTodoData.mockResolvedValue(undefined);

      const options: MigrationOptions = { backupOriginal: true };
      const result = await migrationUtility.migrateToJsonFormat(options);
      
      // Should not fail completely due to backup directory creation error
      expect(result).toHaveProperty('success');
    });
  });
});
