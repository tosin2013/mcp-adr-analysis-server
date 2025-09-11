/**
 * Detailed tests for auto-fix logic issues
 */

import { describe, it, expect, beforeEach } from '@jest/globals';
import { DataConsistencyChecker } from '../../src/utils/data-consistency-checker.js';
import { TodoJsonData, TodoTask } from '../../src/types/todo-json-schemas.js';

describe('DataConsistencyChecker Auto-Fix Issues', () => {
  let testData: TodoJsonData;

  beforeEach(() => {
    testData = {
      version: '1.0.0',
      metadata: {
        lastUpdated: '2024-01-01T00:00:00.000Z',
        totalTasks: 10, // Wrong count - should be 3
        completedTasks: 5, // Wrong count - should be 1
        autoSyncEnabled: true,
      },
      tasks: {
        'task-1': {
          id: 'task-1',
          title: 'Test Task 1',
          status: 'pending',
          priority: 'medium',
          createdAt: '2024-01-01T00:00:00.000Z',
          updatedAt: '2024-01-01T00:00:00.000Z',
          archived: false,
          subtasks: [],
          dependencies: [],
          blockedBy: [],
          linkedAdrs: [],
          adrGeneratedTask: false,
          toolExecutions: [],
          scoreWeight: 1,
          scoreCategory: 'task_completion',
          progressPercentage: 0,
          tags: [],
          lastModifiedBy: 'human',
          autoComplete: false,
          version: 1,
          changeLog: [],
          comments: [],
        },
        'task-2': {
          id: 'task-2',
          title: 'Test Task 2',
          status: 'completed',
          priority: 'medium',
          createdAt: '2024-01-01T00:00:00.000Z',
          updatedAt: '2024-01-01T00:00:00.000Z',
          archived: false,
          subtasks: [],
          dependencies: [],
          blockedBy: [],
          linkedAdrs: [],
          adrGeneratedTask: false,
          toolExecutions: [],
          scoreWeight: 1,
          scoreCategory: 'task_completion',
          progressPercentage: 100,
          tags: [],
          lastModifiedBy: 'human',
          autoComplete: false,
          version: 1,
          changeLog: [],
          comments: [],
        },
        'orphaned-task': {
          id: 'orphaned-task',
          title: 'Orphaned Task',
          status: 'pending',
          priority: 'medium',
          createdAt: '2024-01-01T00:00:00.000Z',
          updatedAt: '2024-01-01T00:00:00.000Z',
          archived: false,
          subtasks: [],
          dependencies: [],
          blockedBy: [],
          linkedAdrs: [],
          adrGeneratedTask: false,
          toolExecutions: [],
          scoreWeight: 1,
          scoreCategory: 'task_completion',
          progressPercentage: 0,
          tags: [],
          lastModifiedBy: 'human',
          autoComplete: false,
          version: 1,
          changeLog: [],
          comments: [],
        },
      },
      sections: [
        {
          id: 'pending',
          title: 'Pending Tasks',
          order: 1,
          collapsed: false,
          tasks: ['task-1', 'non-existent-task'], // Contains non-existent task
        },
        {
          id: 'completed',
          title: 'Completed',
          order: 2,
          collapsed: false,
          tasks: ['task-2'],
        },
      ],
      scoringSync: {
        lastScoreUpdate: '2024-01-01T00:00:00.000Z',
        taskCompletionScore: 0,
        priorityWeightedScore: 0,
        criticalTasksRemaining: 0,
        scoreHistory: [],
      },
      knowledgeGraphSync: {
        lastSync: '2024-01-01T00:00:00.000Z',
        linkedIntents: [],
        pendingUpdates: [],
      },
      automationRules: [],
      templates: [],
      recurringTasks: [],
      operationHistory: [],
    };
  });

  it('should report only actual fixes performed (requirement 3.3)', async () => {
    // First run with auto-fix enabled
    const result1 = await DataConsistencyChecker.checkConsistency(testData, { autoFix: true });

    console.log('First run fixes:', result1.fixedIssues);

    // Expected fixes:
    // 1. Remove non-existent-task from section
    // 2. Add orphaned-task to appropriate section
    // 3. Update metadata totalTasks from 10 to 3
    // 4. Update metadata completedTasks from 5 to 1
    expect(result1.fixedIssues).toHaveLength(4);

    // Verify the fixes were actually applied
    expect(testData.sections[0]!.tasks).not.toContain('non-existent-task');
    expect(testData.sections[0]!.tasks).toContain('orphaned-task');
    expect(testData.metadata.totalTasks).toBe(3);
    expect(testData.metadata.completedTasks).toBe(1);

    // Second run should have no fixes to report (atomic updates)
    const result2 = await DataConsistencyChecker.checkConsistency(testData, { autoFix: true });

    console.log('Second run fixes:', result2.fixedIssues);
    expect(result2.fixedIssues).toHaveLength(0);
    expect(result2.isValid).toBe(true);
  });

  it('should handle malformed data gracefully without crashing (requirement 3.4)', async () => {
    // Test with null tasks object
    const malformedData1 = { ...testData, tasks: null as any };
    const result1 = await DataConsistencyChecker.checkConsistency(malformedData1, {
      autoFix: true,
    });
    expect(result1.isValid).toBe(false);
    expect(result1.errors.some(e => e.type === 'INVALID_TASKS_OBJECT')).toBe(true);

    // Test with null sections array
    const malformedData2 = { ...testData, sections: null as any };
    const result2 = await DataConsistencyChecker.checkConsistency(malformedData2, {
      autoFix: true,
    });
    expect(result2.isValid).toBe(false);
    expect(result2.errors.some(e => e.type === 'INVALID_SECTIONS_ARRAY')).toBe(true);

    // Test with null metadata object
    const malformedData3 = { ...testData, metadata: null as any };
    const result3 = await DataConsistencyChecker.checkConsistency(malformedData3, {
      autoFix: true,
    });
    expect(result3.isValid).toBe(false);
    expect(result3.errors.some(e => e.type === 'INVALID_METADATA_OBJECT')).toBe(true);

    // Test with null task objects
    const malformedData4 = {
      ...testData,
      tasks: {
        'task-1': null as any,
        'task-2': testData.tasks['task-2'],
      },
    };
    const result4 = await DataConsistencyChecker.checkConsistency(malformedData4, {
      autoFix: true,
    });
    expect(result4.isValid).toBe(false);
    expect(result4.errors.some(e => e.type === 'INVALID_TASK_OBJECT')).toBe(true);
  });

  it('should implement atomic metadata updates', async () => {
    // Create a scenario where metadata updates could be interrupted
    const originalTotalTasks = testData.metadata.totalTasks;
    const originalCompletedTasks = testData.metadata.completedTasks;

    // Run consistency check with auto-fix
    const result = await DataConsistencyChecker.checkConsistency(testData, { autoFix: true });

    // Verify that both metadata fields were updated atomically
    expect(testData.metadata.totalTasks).toBe(3); // Actual count
    expect(testData.metadata.completedTasks).toBe(1); // Actual completed count

    // Verify that the fixes were reported correctly
    const totalTasksFix = result.fixedIssues.find(fix => fix.includes('totalTasks'));
    const completedTasksFix = result.fixedIssues.find(fix => fix.includes('completedTasks'));

    expect(totalTasksFix).toContain(`from ${originalTotalTasks} to 3`);
    expect(completedTasksFix).toContain(`from ${originalCompletedTasks} to 1`);
  });

  it('should not double-count warnings when auto-fixing', async () => {
    // This test ensures that when auto-fix is enabled, we don't add warnings
    // for issues that are being fixed

    const result = await DataConsistencyChecker.checkConsistency(testData, { autoFix: true });

    // Should not have metadata mismatch warnings since they're being auto-fixed
    const metadataMismatchWarnings = result.warnings.filter(w => w.type === 'METADATA_MISMATCH');
    expect(metadataMismatchWarnings).toHaveLength(0);

    // But should have fixes reported
    const metadataFixes = result.fixedIssues.filter(
      fix => fix.includes('totalTasks') || fix.includes('completedTasks')
    );
    expect(metadataFixes).toHaveLength(2);
  });
});
