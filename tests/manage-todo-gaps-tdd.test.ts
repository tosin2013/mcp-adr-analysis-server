/**
 * TDD Tests for Missing Operations in todo-management-tool-v2.ts
 * 
 * Testing gaps in the EXISTING manage_todo tool:
 * 1. No delete_task operation
 * 2. Poor error messages for invalid inputs
 * 3. Limited search capabilities in find_task
 * 4. No archive functionality
 * 5. No undo operations
 */

import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import { existsSync, mkdirSync, rmSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';

// Import the actual tool
import { manageTodoV2 } from '../src/tools/todo-management-tool-v2.js';

describe('TODO Management Tool v2 - Missing Operations (TDD)', () => {
  let testProjectPath: string;

  beforeEach(() => {
    testProjectPath = join(tmpdir(), `test-manage-todo-gaps-${Date.now()}`);
    mkdirSync(testProjectPath, { recursive: true });
    mkdirSync(join(testProjectPath, '.mcp-adr-cache'), { recursive: true });
    
    process.env['PROJECT_PATH'] = testProjectPath;
    process.env['LOG_LEVEL'] = 'ERROR';
  });

  afterEach(() => {
    if (existsSync(testProjectPath)) {
      rmSync(testProjectPath, { recursive: true, force: true });
    }
    delete process.env['PROJECT_PATH'];
    delete process.env['LOG_LEVEL'];
  });

  describe('Gap 1: Missing delete_task operation', () => {
    it('should support deleting a task', async () => {
      // Create a task first
      const createResult = await manageTodoV2({
        operation: 'create_task',
        projectPath: testProjectPath,
        title: 'Task to delete',
        description: 'This task will be deleted'
      });

      expect(createResult.content[0].text).toContain('Task created successfully');

      // Extract task ID (assuming format is consistent)
      const taskIdMatch = createResult.content[0].text.match(/Task ID\*\*:\s*(\S+)/);
      expect(taskIdMatch).toBeTruthy();
      const taskId = taskIdMatch![1];

      // Test: Delete the task - THIS SHOULD FAIL INITIALLY
      const deleteResult = await manageTodoV2({
        operation: 'delete_task',
        projectPath: testProjectPath,
        taskId: taskId
      } as any);

      expect(deleteResult.content[0].text).toContain('deleted successfully');

      // Verify task is gone
      const getResult = await manageTodoV2({
        operation: 'get_tasks',
        projectPath: testProjectPath
      });

      expect(getResult.content[0].text).not.toContain('Task to delete');
    });

    it('should prevent deletion of tasks with dependencies', async () => {
      // Create base task
      const baseTaskResult = await manageTodoV2({
        operation: 'create_task',
        projectPath: testProjectPath,
        title: 'Base task'
      });
      const baseTaskId = baseTaskResult.content[0].text.match(/Task ID\*\*:\s*(\S+)/)![1];

      // Create dependent task
      await manageTodoV2({
        operation: 'create_task',
        projectPath: testProjectPath,
        title: 'Dependent task',
        dependencies: [baseTaskId]
      });

      // Test: Try to delete base task - should fail
      await expect(manageTodoV2({
        operation: 'delete_task',
        projectPath: testProjectPath,
        taskId: baseTaskId,
        force: false // Don't force delete
      } as any)).rejects.toThrow('has active dependencies');
    });

    it('should support force deletion with dependency handling', async () => {
      const baseTaskResult = await manageTodoV2({
        operation: 'create_task',
        projectPath: testProjectPath,
        title: 'Base task'
      });
      const baseTaskId = baseTaskResult.content[0].text.match(/Task ID\*\*:\s*(\S+)/)![1];

      await manageTodoV2({
        operation: 'create_task',
        projectPath: testProjectPath,
        title: 'Dependent task',
        dependencies: [baseTaskId]
      });

      // Test: Force delete should work and clean up dependencies
      const deleteResult = await manageTodoV2({
        operation: 'delete_task',
        projectPath: testProjectPath,
        taskId: baseTaskId,
        force: true
      } as any);

      expect(deleteResult.content[0].text).toContain('deleted');
      expect(deleteResult.content[0].text).toContain('dependency cleanup');
    });
  });

  describe('Gap 2: Missing archive_task operation', () => {
    it('should support archiving tasks', async () => {
      const createResult = await manageTodoV2({
        operation: 'create_task',
        projectPath: testProjectPath,
        title: 'Task to archive'
      });
      const taskId = createResult.content[0].text.match(/Task ID\*\*:\s*(\S+)/)![1];

      // Test: Archive the task
      const archiveResult = await manageTodoV2({
        operation: 'archive_task',
        projectPath: testProjectPath,
        taskId: taskId
      } as any);

      expect(archiveResult.content[0].text).toContain('archived');

      // Archived tasks should not appear in normal task list
      const getResult = await manageTodoV2({
        operation: 'get_tasks',
        projectPath: testProjectPath
      });

      expect(getResult.content[0].text).not.toContain('Task to archive');

      // But should appear when specifically requesting archived tasks
      const archivedResult = await manageTodoV2({
        operation: 'get_tasks',
        projectPath: testProjectPath,
        filters: { archived: true }
      } as any);

      expect(archivedResult.content[0].text).toContain('Task to archive');
    });
  });

  describe('Gap 3: Better error messages', () => {
    it('should provide helpful error when task ID is invalid format', async () => {
      await expect(manageTodoV2({
        operation: 'update_task',
        projectPath: testProjectPath,
        taskId: 'not-a-uuid',
        updates: { status: 'completed' }
      })).rejects.toThrow(/Invalid task ID format/);
    });

    it('should provide actionable suggestions when task not found', async () => {
      try {
        await manageTodoV2({
          operation: 'update_task',
          projectPath: testProjectPath,
          taskId: '12345678-1234-1234-1234-123456789012',
          updates: { status: 'completed' }
        });
      } catch (error: any) {
        expect(error.message).toMatch(/not found/);
        expect(error.suggestions).toBeDefined();
        expect(error.suggestions.some((s: any) => s.action.includes('find_task'))).toBe(true);
      }
    });

    it('should provide field-specific validation errors', async () => {
      let wasErrorThrown = false;
      try {
        const result = await manageTodoV2({
          operation: 'create_task',
          projectPath: testProjectPath,
          title: 'Test task',
          priority: 'urgent' // Invalid priority
        });
        console.log('Unexpected success result:', result);
      } catch (error: any) {
        wasErrorThrown = true;
        console.log('Caught error:', error.constructor.name, error.message);
        console.log('Error properties:', { 
          field: error.field, 
          validValues: error.validValues,
          suggestion: error.suggestion,
          suggestions: error.suggestions,
          code: error.code
        });
        expect(error.field).toBe('priority');
        expect(error.validValues).toContain('critical');
        expect(error.suggestion).toMatch(/did you mean.*critical/i);
      }
      
      if (!wasErrorThrown) {
        fail('Expected error to be thrown');
      }
    });
  });

  describe('Gap 4: Enhanced find_task capabilities', () => {
    beforeEach(async () => {
      // Create test tasks
      await manageTodoV2({
        operation: 'create_task',
        projectPath: testProjectPath,
        title: 'Deploy ArgoCD to production',
        description: 'Set up GitOps with ArgoCD',
        tags: ['deployment', 'argocd']
      });

      await manageTodoV2({
        operation: 'create_task',
        projectPath: testProjectPath,
        title: 'Configure secrets management',
        description: 'Use External Secrets Operator for K8s secrets',
        tags: ['security', 'eso']
      });
    });

    it('should support fuzzy search that handles typos', async () => {
      const result = await manageTodoV2({
        operation: 'find_task',
        projectPath: testProjectPath,
        query: 'argcd prodction', // Typos intentional
        searchType: 'fuzzy'
      } as any);

      expect(result.content[0].text).toContain('ArgoCD');
      expect(result.content[0].text).toContain('production');
    });

    it('should support searching multiple fields simultaneously', async () => {
      const result = await manageTodoV2({
        operation: 'find_task',
        projectPath: testProjectPath,
        query: 'External Secrets',
        searchType: 'multi_field',
        searchFields: ['title', 'description', 'tags']
      } as any);

      expect(result.content[0].text).toContain('secrets management');
    });

    it('should support regex pattern search', async () => {
      const result = await manageTodoV2({
        operation: 'find_task',
        projectPath: testProjectPath,
        query: '^Deploy.*production$',
        searchType: 'regex'
      } as any);

      expect(result.content[0].text).toContain('Deploy ArgoCD to production');
    });

    it('should provide search suggestions for no results', async () => {
      const result = await manageTodoV2({
        operation: 'find_task',
        projectPath: testProjectPath,
        query: 'nonexistent task'
      });

      expect(result.content[0].text).toContain('No tasks found');
      expect(result.content[0].text).toContain('suggestions'); // Should provide alternatives
    });
  });

  describe('Gap 5: Missing undo operation', () => {
    it('should support undoing the last operation', async () => {
      // Create and modify a task
      const createResult = await manageTodoV2({
        operation: 'create_task',
        projectPath: testProjectPath,
        title: 'Original title'
      });
      const taskId = createResult.content[0].text.match(/Task ID\*\*:\s*(\S+)/)![1];

      await manageTodoV2({
        operation: 'update_task',
        projectPath: testProjectPath,
        taskId,
        updates: { title: 'Modified title' }
      });

      // Test: Undo the last operation
      const undoResult = await manageTodoV2({
        operation: 'undo_last',
        projectPath: testProjectPath
      } as any);

      expect(undoResult.content[0].text).toContain('Undid');
      expect(undoResult.content[0].text).toContain('update_task');

      // Verify task was restored
      const getResult = await manageTodoV2({
        operation: 'get_tasks',
        projectPath: testProjectPath
      });
      expect(getResult.content[0].text).toContain('Original title');
      expect(getResult.content[0].text).not.toContain('Modified title');
    });

    it('should show undo history', async () => {
      const createResult = await manageTodoV2({
        operation: 'create_task',
        projectPath: testProjectPath,
        title: 'Test task'
      });
      const taskId = createResult.content[0].text.match(/Task ID\*\*:\s*(\S+)/)![1];

      // Make several changes
      await manageTodoV2({
        operation: 'update_task',
        projectPath: testProjectPath,
        taskId,
        updates: { status: 'in_progress' }
      });

      await manageTodoV2({
        operation: 'update_task',
        projectPath: testProjectPath,
        taskId,
        updates: { priority: 'high' }
      });

      // Test: Get undo history
      const historyResult = await manageTodoV2({
        operation: 'get_undo_history',
        projectPath: testProjectPath
      } as any);

      expect(historyResult.content[0].text).toContain('undo history');
      expect(historyResult.content[0].text).toContain('update_task'); // Should show recent operations
    });
  });

  describe('Gap 6: Task validation and constraints', () => {
    it('should validate task data integrity', async () => {
      // Test: Invalid due date format
      await expect(manageTodoV2({
        operation: 'create_task',
        projectPath: testProjectPath,
        title: 'Test task',
        dueDate: 'not-a-date'
      })).rejects.toThrow(/invalid date format/i);
    });

    it('should prevent circular dependencies', async () => {
      const task1Result = await manageTodoV2({
        operation: 'create_task',
        projectPath: testProjectPath,
        title: 'Task 1'
      });
      const task1Id = task1Result.content[0].text.match(/Task ID\*\*:\s*(\S+)/)![1];

      const task2Result = await manageTodoV2({
        operation: 'create_task',
        projectPath: testProjectPath,
        title: 'Task 2',
        dependencies: [task1Id]
      });
      const task2Id = task2Result.content[0].text.match(/Task ID\*\*:\s*(\S+)/)![1];

      // Test: Try to create circular dependency
      await expect(manageTodoV2({
        operation: 'update_task',
        projectPath: testProjectPath,
        taskId: task1Id,
        updates: { dependencies: [task2Id] },
        reason: 'Testing circular dependency'
      })).rejects.toThrow(/circular dependency/i);
    });
  });

  describe('Gap 7: Bulk operations improvements', () => {
    it('should support bulk delete with confirmation', async () => {
      // Create multiple tasks
      const taskIds: string[] = [];
      for (let i = 0; i < 3; i++) {
        const result = await manageTodoV2({
          operation: 'create_task',
          projectPath: testProjectPath,
          title: `Task ${i}`
        });
        const taskId = result.content[0].text.match(/Task ID\*\*:\s*(\S+)/)![1];
        taskIds.push(taskId);
      }

      // Test: Bulk delete
      const deleteResult = await manageTodoV2({
        operation: 'bulk_delete',
        projectPath: testProjectPath,
        taskIds,
        confirm: true
      } as any);

      expect(deleteResult.content[0].text).toContain('3 tasks deleted');
    });

    it('should provide dry-run for bulk operations', async () => {
      const createResult = await manageTodoV2({
        operation: 'create_task',
        projectPath: testProjectPath,
        title: 'Test task'
      });
      const taskId = createResult.content[0].text.match(/Task ID\*\*:\s*(\S+)/)![1];

      // Test: Dry run bulk operation
      const dryRunResult = await manageTodoV2({
        operation: 'bulk_update',
        projectPath: testProjectPath,
        updates: [{ taskId, status: 'completed' }],
        dryRun: true
      } as any);

      expect(dryRunResult.content[0].text).toContain('would update');
      expect(dryRunResult.content[0].text).toContain('dry run');

      // Verify nothing was actually changed
      const getResult = await manageTodoV2({
        operation: 'get_tasks',
        projectPath: testProjectPath
      });
      expect(getResult.content[0].text).toContain('pending'); // Should still be pending
    });
  });
});