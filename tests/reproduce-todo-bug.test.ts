/**
 * Test to reproduce the exact issue described in the bug report
 */

import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import { existsSync, mkdirSync, rmSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import { McpAdrAnalysisServer } from '../src/index.js';

// Mock external dependencies
jest.unstable_mockModule('../src/utils/knowledge-graph-manager.js', () => ({
  KnowledgeGraphManager: jest.fn().mockImplementation(() => ({
    updateTodoSnapshot: jest.fn(),
    loadKnowledgeGraph: jest.fn(() => Promise.resolve({})),
    getActiveIntents: jest.fn(() => Promise.resolve([])),
    createIntent: jest.fn(() => Promise.resolve('intent-123')),
    addToolExecution: jest.fn(),
    getIntentById: jest.fn(() => Promise.resolve({ currentStatus: 'executing' })),
    updateIntentStatus: jest.fn(),
  }))
}));

jest.unstable_mockModule('../src/utils/project-health-scoring.js', () => ({
  ProjectHealthScoring: jest.fn().mockImplementation(() => ({
    getProjectHealthScore: jest.fn(() => Promise.resolve({})),
    generateScoreDisplay: jest.fn(() => 'Mock score display'),
    updateTodoCompletionScore: jest.fn(() => Promise.resolve(undefined)),
    updateDeploymentReadinessScore: jest.fn(() => Promise.resolve(undefined)),
    updateTaskCompletionScore: jest.fn(() => Promise.resolve(undefined)),
    updateTaskVelocityScore: jest.fn(() => Promise.resolve(undefined)),
    calculateProjectHealthScore: jest.fn(() => Promise.resolve({})),
    analyzeHealthTrends: jest.fn(() => Promise.resolve([])),
  }))
}));

describe('Reproduce TODO Bug: Invalid Input Errors', () => {
  let server: McpAdrAnalysisServer;
  let testProjectPath: string;
  let taskId: string;

  beforeEach(async () => {
    // Create temporary test directory
    testProjectPath = join(tmpdir(), `test-todo-bug-${Date.now()}`);
    mkdirSync(testProjectPath, { recursive: true });
    
    const cacheDir = join(testProjectPath, '.mcp-adr-cache');
    mkdirSync(cacheDir, { recursive: true });
    
    // Set environment variables for test
    process.env['PROJECT_PATH'] = testProjectPath;
    process.env['LOG_LEVEL'] = 'ERROR';
    
    // Create server instance
    server = new McpAdrAnalysisServer();

    // Create a test task first
    const createResult = await (server as any).manageTodoJson({
      operation: 'create_task',
      projectPath: testProjectPath,
      title: 'Test Task for Updates',
      description: 'Test task to demonstrate bug'
    });

    // Extract task ID from response
    taskId = extractTaskIdFromResponse(createResult.content[0].text);
  });

  afterEach(() => {
    // Clean up test directory
    if (existsSync(testProjectPath)) {
      rmSync(testProjectPath, { recursive: true, force: true });
    }
    
    // Clean up environment
    delete process.env['PROJECT_PATH'];
    delete process.env['LOG_LEVEL'];
  });

  describe('Reproduce Exact Failing Commands from Issue', () => {
    it('should fail with Command 1: Simple status update (missing reason)', async () => {
      // Command 1 from issue: Missing required 'reason' field
      await expect((server as any).manageTodoJson({
        operation: 'update_task',
        taskId: taskId,
        updates: { status: 'completed' }
        // Missing required 'reason' field
      })).rejects.toThrow(/JSON TODO management failed.*Invalid input/);
    });

    it('should fail with Command 2: Progress update (missing reason)', async () => {
      // Command 2 from issue: Missing required 'reason' field  
      await expect((server as any).manageTodoJson({
        operation: 'update_task',
        taskId: taskId,
        updates: { progressPercentage: 100, status: 'completed' }
        // Missing required 'reason' field
      })).rejects.toThrow(/JSON TODO management failed.*Invalid input/);
    });

    it('should fail with Command 3: Bulk update (wrong structure + missing reason)', async () => {
      // Command 3 from issue: Wrong structure and missing required fields
      await expect((server as any).manageTodoJson({
        operation: 'bulk_update',
        updates: { progressPercentage: 100, status: 'completed' }
        // Missing required 'reason' field AND wrong structure for 'updates'
      })).rejects.toThrow(/JSON TODO management failed.*Invalid input/);
    });

    it('should succeed with Command 1 when reason is provided', async () => {
      // Fixed version of Command 1
      const result = await (server as any).manageTodoJson({
        operation: 'update_task',
        projectPath: testProjectPath,
        taskId: taskId,
        updates: { status: 'completed' },
        reason: 'Deployment verification successful'
      });

      expect(result).toBeDefined();
      expect(result.content[0].text).toContain('Task updated successfully');
    });

    it('should succeed with Command 2 when reason is provided', async () => {
      // Fixed version of Command 2
      const result = await (server as any).manageTodoJson({
        operation: 'update_task',
        projectPath: testProjectPath, 
        taskId: taskId,
        updates: { progressPercentage: 100, status: 'completed' },
        reason: 'ArgoCD deployment complete - 8 pods running'
      });

      expect(result).toBeDefined();
      expect(result.content[0].text).toContain('Task updated successfully');
    });

    it('should succeed with Command 3 when properly structured', async () => {
      // Create a second task for bulk update
      const createResult2 = await (server as any).manageTodoJson({
        operation: 'create_task',
        projectPath: testProjectPath,
        title: 'Second Test Task',
        description: 'Another test task'
      });
      const taskId2 = extractTaskIdFromResponse(createResult2.content[0].text);

      // Fixed version of Command 3 - proper bulk_update structure
      const result = await (server as any).manageTodoJson({
        operation: 'bulk_update',
        projectPath: testProjectPath,
        updates: [
          { taskId: taskId, status: 'completed' },
          { taskId: taskId2, status: 'completed' }
        ],
        reason: 'Deployment verification complete for all tasks'
      });

      expect(result).toBeDefined();
      expect(result.content[0].text).toContain('Bulk update completed');
    });
  });

  describe('Enhanced Validation Error Messages', () => {
    it('should provide specific error message for missing reason field', async () => {
      try {
        await (server as any).manageTodoJson({
          operation: 'update_task',
          taskId: taskId,
          updates: { status: 'completed' }
          // Missing required 'reason' field
        });
        fail('Expected error was not thrown');
      } catch (error: any) {
        expect(error.message).toContain('JSON TODO management failed');
        expect(error.message).toContain('Invalid input');
        // The error should contain validation details about the missing reason field
      }
    });

    it('should provide specific error message for invalid bulk_update structure', async () => {
      try {
        await (server as any).manageTodoJson({
          operation: 'bulk_update',
          updates: { status: 'completed' }, // Should be array, not object
          reason: 'Test reason'
        });
        fail('Expected error was not thrown');
      } catch (error: any) {
        expect(error.message).toContain('JSON TODO management failed');
        expect(error.message).toContain('Invalid input');
        // The error should contain validation details about the wrong structure
      }
    });

    it('should provide specific error message for invalid status value', async () => {
      try {
        await (server as any).manageTodoJson({
          operation: 'update_task',
          projectPath: testProjectPath,
          taskId: taskId,
          updates: { status: 'invalid_status' },
          reason: 'Test reason'
        });
        fail('Expected error was not thrown');
      } catch (error: any) {
        expect(error.message).toContain('JSON TODO management failed');
        expect(error.message).toContain('Invalid input');
      }
    });

    it('should provide specific error message for invalid progressPercentage value', async () => {
      try {
        await (server as any).manageTodoJson({
          operation: 'update_task',
          projectPath: testProjectPath,
          taskId: taskId,
          updates: { progressPercentage: 150 }, // Invalid: over 100
          reason: 'Test reason'
        });
        fail('Expected error was not thrown');
      } catch (error: any) {
        expect(error.message).toContain('JSON TODO management failed');
        expect(error.message).toContain('Invalid input');
      }
    });
  });
});

/**
 * Helper function to extract task ID from response text
 */
function extractTaskIdFromResponse(responseText: string): string {
  const idMatch = responseText.match(/Task ID: ([a-f0-9-]+)/i) || 
                  responseText.match(/ID: ([a-f0-9-]+)/i) ||
                  responseText.match(/\[([a-f0-9-]+)\]/);
  
  if (idMatch && idMatch[1]) {
    return idMatch[1];
  }
  
  // If no ID found, try to get a short ID pattern
  const shortIdMatch = responseText.match(/\b([a-f0-9]{6,8})\b/);
  return shortIdMatch ? shortIdMatch[1]! : 'unknown-id';
}