/**
 * End-to-End test for the exact commands from the issue description
 * This validates that the fixes work in the context described in the bug report
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
  })),
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
  })),
}));

describe('TODO Bug Fix: End-to-End Validation', () => {
  let server: McpAdrAnalysisServer;
  let testProjectPath: string;

  beforeEach(async () => {
    // Create temporary test directory
    testProjectPath = join(tmpdir(), `test-todo-e2e-${Date.now()}`);
    mkdirSync(testProjectPath, { recursive: true });

    const cacheDir = join(testProjectPath, '.mcp-adr-cache');
    mkdirSync(cacheDir, { recursive: true });

    // Set environment variables for test
    process.env['PROJECT_PATH'] = testProjectPath;
    process.env['LOG_LEVEL'] = 'ERROR';

    // Create server instance
    server = new McpAdrAnalysisServer();
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

  it('should demonstrate the complete fix for the ServiceNow-OpenShift Integration scenario', async () => {
    // Step 1: Create tasks representing the ServiceNow-OpenShift integration project
    console.log('Creating test tasks for ArgoCD, ESO, and Keycloak deployments...');

    const argoCdResult = await (server as any).manageTodoJson({
      operation: 'create_task',
      projectPath: testProjectPath,
      title: 'Deploy ArgoCD GitOps Pipeline',
      description: 'Set up ArgoCD operator and configure GitOps workflow',
      priority: 'high',
      category: 'Deployment',
      tags: ['argocd', 'gitops', 'deployment'],
    });

    const esoResult = await (server as any).manageTodoJson({
      operation: 'create_task',
      projectPath: testProjectPath,
      title: 'Deploy External Secrets Operator',
      description: 'Install and configure ESO for secret management',
      priority: 'high',
      category: 'Deployment',
      tags: ['eso', 'secrets', 'deployment'],
    });

    const keycloakResult = await (server as any).manageTodoJson({
      operation: 'create_task',
      projectPath: testProjectPath,
      title: 'Deploy Keycloak Authentication',
      description: 'Set up Keycloak for identity and access management',
      priority: 'medium',
      category: 'Deployment',
      tags: ['keycloak', 'auth', 'deployment'],
    });

    // Extract task IDs
    const argoCdTaskId = extractTaskIdFromResponse(argoCdResult.content[0].text);
    const esoTaskId = extractTaskIdFromResponse(esoResult.content[0].text);
    const keycloakTaskId = extractTaskIdFromResponse(keycloakResult.content[0].text);

    // Wait for batch to flush to ensure all tasks are persisted
    await new Promise(resolve => setTimeout(resolve, 150));

    console.log(
      `Created tasks: ArgoCD(${argoCdTaskId}), ESO(${esoTaskId}), Keycloak(${keycloakTaskId})`
    );

    // Step 2: Test the EXACT failing commands from the issue (should now work)
    console.log('Testing Command 1: Simple status update...');
    const command1Result = await (server as any).manageTodoJson({
      operation: 'update_task',
      taskId: argoCdTaskId,
      updates: { status: 'completed' },
      // No reason field - this was causing "Invalid input" before
    });

    expect(command1Result.content[0].text).toContain('Task updated successfully');
    expect(command1Result.content[0].text).toContain('Reason**: Task updated');

    console.log('Testing Command 2: Progress update...');
    const command2Result = await (server as any).manageTodoJson({
      operation: 'update_task',
      taskId: esoTaskId,
      updates: { progressPercentage: 100, status: 'completed' },
      // No reason field - this was causing "Invalid input" before
    });

    expect(command2Result.content[0].text).toContain('Task updated successfully');
    expect(command2Result.content[0].text).toContain('Reason**: Task updated');

    console.log('Testing Command 3: Bulk update...');
    const command3Result = await (server as any).manageTodoJson({
      operation: 'bulk_update',
      projectPath: testProjectPath,
      updates: [{ taskId: keycloakTaskId, progressPercentage: 100, status: 'completed' }],
      // No reason field - this was causing "Invalid input" before
    });

    expect(command3Result.content[0].text).toContain('Bulk Update Completed');
    expect(command3Result.content[0].text).toContain('Reason**: Bulk status update');

    // Step 3: Verify the project completion percentage reflects reality (92% as mentioned in issue)
    console.log('Getting analytics to verify completion tracking...');
    const analyticsResult = await (server as any).manageTodoJson({
      operation: 'get_analytics',
      projectPath: testProjectPath,
      includeVelocity: true,
      includeScoring: true,
    });

    expect(analyticsResult.content[0].text).toContain('Completed**: 3');
    expect(analyticsResult.content[0].text).toContain('100.0%'); // Should be 100% since all 3 tasks are completed

    // Step 4: Test deployment verification scenario with notes
    console.log('Testing deployment verification with notes...');
    const verificationResult = await (server as any).manageTodoJson({
      operation: 'update_task',
      taskId: argoCdTaskId,
      updates: {
        notes:
          'Deployment verified: 8 pods running in openshift-gitops namespace. ArgoCD UI accessible and functional.',
      },
      // Still no reason field - should work with default
    });

    expect(verificationResult.content[0].text).toContain('Task updated successfully');

    // Step 5: Get final task list to verify all updates worked
    console.log('Getting final task list...');
    const finalTasksResult = await (server as any).manageTodoJson({
      operation: 'get_tasks',
      projectPath: testProjectPath,
      sortBy: 'updatedAt',
      sortOrder: 'desc',
    });

    expect(finalTasksResult.content[0].text).toContain('3 tasks');
    expect(finalTasksResult.content[0].text).toContain('ArgoCD');
    expect(finalTasksResult.content[0].text).toContain('ESO');
    expect(finalTasksResult.content[0].text).toContain('Keycloak');
    expect(finalTasksResult.content[0].text).toContain('Progress: 100%');

    console.log('✅ All commands from the issue now work correctly!');
  });

  it('should handle validation failures with error messages', async () => {
    // Create a test task first
    const createResult = await (server as any).manageTodoJson({
      operation: 'create_task',
      projectPath: testProjectPath,
      title: 'Test Task',
    });
    const taskId = extractTaskIdFromResponse(createResult.content[0].text);

    // Wait for batch to flush to ensure task is persisted
    await new Promise(resolve => setTimeout(resolve, 150));

    // Test that validation errors are thrown for invalid inputs
    await expect(
      (server as any).manageTodoJson({
        operation: 'update_task',
        projectPath: testProjectPath,
        taskId: taskId,
        updates: { status: 'invalid_status' },
        reason: 'Test reason',
      })
    ).rejects.toThrow(/Invalid status/i);

    await expect(
      (server as any).manageTodoJson({
        operation: 'update_task',
        projectPath: testProjectPath,
        taskId: taskId,
        updates: { progressPercentage: 150 },
        reason: 'Test reason',
      })
    ).rejects.toThrow(/Number must be less than or equal to 100/i);

    await expect(
      (server as any).manageTodoJson({
        operation: 'bulk_update',
        projectPath: testProjectPath,
        updates: { status: 'completed' }, // Should be array
        reason: 'Test reason',
      })
    ).rejects.toThrow(/Invalid input/i);
  });

  it('should demonstrate backward compatibility with explicit reason field', async () => {
    // Create a test task
    const createResult = await (server as any).manageTodoJson({
      operation: 'create_task',
      projectPath: testProjectPath,
      title: 'Compatibility Test Task',
    });
    const taskId = extractTaskIdFromResponse(createResult.content[0].text);

    // Wait for batch to flush to ensure task is persisted
    await new Promise(resolve => setTimeout(resolve, 150));

    // Test that providing explicit reason still works
    const updateResult = await (server as any).manageTodoJson({
      operation: 'update_task',
      projectPath: testProjectPath,
      taskId: taskId,
      updates: { status: 'completed' },
      reason: 'Deployment verification successful - all pods running',
    });

    expect(updateResult.content[0].text).toContain('Task updated successfully');
    expect(updateResult.content[0].text).toContain(
      'Reason**: Deployment verification successful - all pods running'
    );
  });
});

/**
 * Helper function to extract task ID from response text
 */
function extractTaskIdFromResponse(responseText: string): string {
  // Look for full UUID pattern first (most reliable)
  const fullIdMatch = responseText.match(
    /([a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12})/i
  );
  if (fullIdMatch) {
    return fullIdMatch[1];
  }

  // Fall back to other patterns
  const idMatch =
    responseText.match(/Task ID: ([a-f0-9-]+)/i) ||
    responseText.match(/ID: ([a-f0-9-]+)/i) ||
    responseText.match(/\[([a-f0-9-]+)\]/);

  if (idMatch && idMatch[1]) {
    return idMatch[1];
  }

  // If no ID found, try to get a short ID pattern
  const shortIdMatch = responseText.match(/\b([a-f0-9]{6,8})\b/);
  return shortIdMatch ? shortIdMatch[1]! : 'unknown-id';
}
