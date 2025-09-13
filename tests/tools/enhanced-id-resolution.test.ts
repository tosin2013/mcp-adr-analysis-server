/**
 * Tests for enhanced task ID resolution in todo-management-tool-v2
 */

import { manageTodoV2 } from '../../src/tools/todo-management-tool-v2.js';
import { TodoJsonManager } from '../../src/utils/todo-json-manager.js';
import * as fs from 'fs/promises';
import * as path from 'path';
import * as os from 'os';

describe('Enhanced Task ID Resolution', () => {
  let tempDir: string;
  let todoManager: TodoJsonManager;
  let testTaskId: string;

  beforeEach(async () => {
    // Create temporary directory for test
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'todo-test-'));
    todoManager = new TodoJsonManager(tempDir);

    // Enable immediate persistence for tests
    todoManager.enableImmediatePersistence();

    // Create a test task
    const createResult = await manageTodoV2({
      operation: 'create_task',
      projectPath: tempDir,
      title: 'Test Task for ID Resolution',
      description: 'A task to test enhanced ID resolution',
      priority: 'medium',
    });

    // Extract task ID from the response
    const responseText = createResult.content[0].text;
    const idMatch = responseText.match(/Task ID\*\*: ([a-f0-9-]+)/);
    testTaskId = idMatch ? idMatch[1] : '';
    expect(testTaskId).toBeTruthy();
  });

  afterEach(async () => {
    // Clean up
    await todoManager.cleanup();
    try {
      await fs.rm(tempDir, { recursive: true, force: true });
    } catch (error) {
      // Ignore cleanup errors
    }
  });

  describe('update_task with enhanced ID resolution', () => {
    it('should resolve partial task IDs', async () => {
      const partialId = testTaskId.substring(0, 8);

      const result = await manageTodoV2({
        operation: 'update_task',
        projectPath: tempDir,
        taskId: partialId,
        updates: {
          status: 'in_progress',
        },
      });

      expect(result.content[0].text).toContain('✅ Task updated successfully');
      expect(result.content[0].text).toContain(testTaskId);
      expect(result.content[0].text).toContain(partialId);
    });

    it('should handle invalid task IDs with helpful suggestions', async () => {
      const result = await manageTodoV2({
        operation: 'update_task',
        projectPath: tempDir,
        taskId: 'invalid-id-123',
        updates: {
          status: 'completed',
        },
      });

      expect(result.content[0].text).toContain('❌ Cannot update task');
      expect(result.content[0].text).toContain('Suggestions:');
      expect(result.content[0].text).toContain('Use get_tasks to list all available tasks');
    });

    it('should handle ambiguous partial IDs', async () => {
      // Create another task with similar ID prefix
      await manageTodoV2({
        operation: 'create_task',
        projectPath: tempDir,
        title: 'Another Test Task',
        description: 'Another task for testing',
        priority: 'high',
      });

      // Try to use a very short partial ID that might match multiple tasks
      const result = await manageTodoV2({
        operation: 'update_task',
        projectPath: tempDir,
        taskId: testTaskId.substring(0, 2), // Very short, likely to be ambiguous
        updates: {
          status: 'completed',
        },
      });

      // Should either resolve uniquely or provide helpful error
      expect(result.content[0].text).toMatch(
        /(✅ Task updated successfully|❌ Cannot update task)/
      );
    });
  });

  describe('delete_task with enhanced ID resolution', () => {
    it('should resolve partial task IDs for deletion', async () => {
      const partialId = testTaskId.substring(0, 8);

      const result = await manageTodoV2({
        operation: 'delete_task',
        projectPath: tempDir,
        taskId: partialId,
        force: true,
      });

      expect(result.content[0].text).toContain('✅ Task deleted successfully');
      expect(result.content[0].text).toContain(testTaskId);
    });

    it('should handle invalid task IDs for deletion', async () => {
      const result = await manageTodoV2({
        operation: 'delete_task',
        projectPath: tempDir,
        taskId: 'nonexistent-task',
        force: true,
      });

      expect(result.content[0].text).toContain('❌ Cannot delete task');
      expect(result.content[0].text).toContain('Suggestions:');
    });
  });

  describe('archive_task with enhanced ID resolution', () => {
    it('should resolve partial task IDs for archiving', async () => {
      const partialId = testTaskId.substring(0, 8);

      const result = await manageTodoV2({
        operation: 'archive_task',
        projectPath: tempDir,
        taskId: partialId,
      });

      expect(result.content[0].text).toContain('✅ Task archived successfully');
      expect(result.content[0].text).toContain(testTaskId);
    });

    it('should handle invalid task IDs for archiving', async () => {
      const result = await manageTodoV2({
        operation: 'archive_task',
        projectPath: tempDir,
        taskId: 'nonexistent-task',
      });

      expect(result.content[0].text).toContain('❌ Cannot archive task');
      expect(result.content[0].text).toContain('Suggestions:');
    });
  });

  describe('bulk operations with enhanced ID resolution', () => {
    it('should resolve partial task IDs in bulk_update', async () => {
      const partialId = testTaskId.substring(0, 8);

      const result = await manageTodoV2({
        operation: 'bulk_update',
        projectPath: tempDir,
        updates: [
          {
            taskId: partialId,
            status: 'completed',
          },
        ],
      });

      expect(result.content[0].text).toContain('✅ **Bulk Update Completed!**');
      expect(result.content[0].text).toContain('Successfully Updated 1 task');
    });

    it('should handle mixed valid and invalid IDs in bulk_update', async () => {
      const partialId = testTaskId.substring(0, 8);

      const result = await manageTodoV2({
        operation: 'bulk_update',
        projectPath: tempDir,
        updates: [
          {
            taskId: partialId,
            status: 'completed',
          },
          {
            taskId: 'invalid-id',
            status: 'completed',
          },
        ],
      });

      expect(result.content[0].text).toContain('✅ **Bulk Update Completed!**');
      expect(result.content[0].text).toContain('Successfully Updated 1 task');
      expect(result.content[0].text).toContain('Skipped 1 task');
    });

    it('should resolve partial task IDs in bulk_delete', async () => {
      const partialId = testTaskId.substring(0, 8);

      const result = await manageTodoV2({
        operation: 'bulk_delete',
        projectPath: tempDir,
        taskIds: [partialId],
        confirm: true,
      });

      expect(result.content[0].text).toContain('Successfully Deleted 1 task');
    });
  });
});
