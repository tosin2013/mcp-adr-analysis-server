/**
 * Edge case tests for auto-fix logic to identify potential issues
 */

import { describe, it, expect, beforeEach } from '@jest/globals';
import { DataConsistencyChecker } from '../../src/utils/data-consistency-checker.js';
import { TodoJsonData, TodoTask } from '../../src/types/todo-json-schemas.js';

describe('DataConsistencyChecker Auto-Fix Edge Cases', () => {
  let baseTask: TodoTask;

  beforeEach(() => {
    baseTask = {
      id: 'task-1',
      title: 'Test Task',
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
    };
  });

  it('should handle concurrent auto-fix operations atomically', async () => {
    const testData: TodoJsonData = {
      version: '1.0.0',
      metadata: {
        lastUpdated: '2024-01-01T00:00:00.000Z',
        totalTasks: 100, // Very wrong count
        completedTasks: 50, // Very wrong count
        autoSyncEnabled: true,
      },
      tasks: {
        'task-1': { ...baseTask, id: 'task-1', status: 'pending' },
        'task-2': { ...baseTask, id: 'task-2', status: 'completed' },
      },
      sections: [
        {
          id: 'pending',
          title: 'Pending Tasks',
          order: 1,
          collapsed: false,
          tasks: ['task-1', 'non-existent-1', 'non-existent-2'], // Multiple non-existent tasks
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

    // Create separate data objects to test concurrent operations properly
    const testData1 = JSON.parse(JSON.stringify(testData));
    const testData2 = JSON.parse(JSON.stringify(testData));
    const testData3 = JSON.parse(JSON.stringify(testData));

    // Run multiple concurrent auto-fix operations on separate data objects
    const promises = [
      DataConsistencyChecker.checkConsistency(testData1, { autoFix: true }),
      DataConsistencyChecker.checkConsistency(testData2, { autoFix: true }),
      DataConsistencyChecker.checkConsistency(testData3, { autoFix: true }),
    ];

    const results = await Promise.all(promises);

    // All operations should succeed
    results.forEach((result, index) => {
      expect(result.isValid).toBe(true);
    });

    // Final state should be consistent for all data objects
    [testData1, testData2, testData3].forEach((data, index) => {
      expect(data.metadata.totalTasks).toBe(2);
      expect(data.metadata.completedTasks).toBe(1);
      expect(data.sections[0]!.tasks).toEqual(['task-1']);
    });
  });

  it('should handle malformed section data during auto-fix', async () => {
    const testData: TodoJsonData = {
      version: '1.0.0',
      metadata: {
        lastUpdated: '2024-01-01T00:00:00.000Z',
        totalTasks: 1,
        completedTasks: 0,
        autoSyncEnabled: true,
      },
      tasks: {
        'task-1': { ...baseTask, id: 'task-1' },
      },
      sections: [
        {
          id: 'pending',
          title: 'Pending Tasks',
          order: 1,
          collapsed: false,
          tasks: null as any, // Malformed tasks array
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

    // Should not crash when encountering malformed section data
    const result = await DataConsistencyChecker.checkConsistency(testData, { autoFix: true });

    // Should detect and fix the malformed section data
    expect(result.isValid).toBe(true); // Should be valid after auto-fix
    expect(result.fixedIssues.length).toBeGreaterThan(0); // Should fix the malformed data
    expect(result.fixedIssues.some(fix => fix.includes('Initialized empty tasks array'))).toBe(
      true
    );

    // Should have no errors after auto-fix
    expect(result.errors).toHaveLength(0);
  });

  it('should prevent infinite auto-fix loops', async () => {
    const testData: TodoJsonData = {
      version: '1.0.0',
      metadata: {
        lastUpdated: '2024-01-01T00:00:00.000Z',
        totalTasks: 1,
        completedTasks: 0,
        autoSyncEnabled: true,
      },
      tasks: {
        'task-1': { ...baseTask, id: 'task-1', status: 'nonexistent-status' },
      },
      sections: [
        {
          id: 'pending',
          title: 'Pending Tasks',
          order: 1,
          collapsed: false,
          tasks: [],
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

    // Run auto-fix multiple times to ensure it doesn't create infinite loops
    const result1 = await DataConsistencyChecker.checkConsistency(testData, { autoFix: true });
    const result2 = await DataConsistencyChecker.checkConsistency(testData, { autoFix: true });
    const result3 = await DataConsistencyChecker.checkConsistency(testData, { autoFix: true });

    // Should not keep reporting the same fixes
    expect(result2.fixedIssues).toHaveLength(0);
    expect(result3.fixedIssues).toHaveLength(0);

    // Task should be added to the first available section
    expect(testData.sections[0]!.tasks).toContain('task-1');
  });

  it('should handle auto-fix with deeply nested malformed data', async () => {
    const testData: TodoJsonData = {
      version: '1.0.0',
      metadata: {
        lastUpdated: '2024-01-01T00:00:00.000Z',
        totalTasks: 2,
        completedTasks: 0,
        autoSyncEnabled: true,
      },
      tasks: {
        'task-1': { ...baseTask, id: 'task-1' },
        'task-2': null as any, // Null task
        'task-3': undefined as any, // Undefined task
        'task-4': { ...baseTask, id: 'task-4', dependencies: null as any }, // Null dependencies
      },
      sections: [
        {
          id: 'pending',
          title: 'Pending Tasks',
          order: 1,
          collapsed: false,
          tasks: ['task-1', 'task-2', 'task-3', 'task-4'],
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

    // Should handle malformed data gracefully
    const result = await DataConsistencyChecker.checkConsistency(testData, { autoFix: true });

    // Should detect errors for malformed tasks
    expect(result.isValid).toBe(false);
    expect(result.errors.some(e => e.type === 'INVALID_TASK_OBJECT')).toBe(true);

    // Should still fix what it can (remove references to null/undefined tasks)
    expect(result.fixedIssues.length).toBeGreaterThan(0);

    // Should not crash
    expect(testData.sections[0]!.tasks).toContain('task-1');
    expect(testData.sections[0]!.tasks).toContain('task-4');
  });

  it('should provide accurate fix counts with complex scenarios', async () => {
    const testData: TodoJsonData = {
      version: '1.0.0',
      metadata: {
        lastUpdated: '2024-01-01T00:00:00.000Z',
        totalTasks: 10, // Wrong
        completedTasks: 5, // Wrong
        autoSyncEnabled: true,
      },
      tasks: {
        'task-1': { ...baseTask, id: 'task-1', status: 'pending' },
        'task-2': { ...baseTask, id: 'task-2', status: 'completed' },
        'task-3': { ...baseTask, id: 'task-3', status: 'in-progress' },
        'orphaned-1': { ...baseTask, id: 'orphaned-1', status: 'pending' },
        'orphaned-2': { ...baseTask, id: 'orphaned-2', status: 'completed' },
      },
      sections: [
        {
          id: 'pending',
          title: 'Pending Tasks',
          order: 1,
          collapsed: false,
          tasks: ['task-1', 'missing-1', 'missing-2'], // 2 missing tasks
        },
        {
          id: 'completed',
          title: 'Completed',
          order: 2,
          collapsed: false,
          tasks: ['task-2'],
        },
        {
          id: 'in-progress',
          title: 'In Progress',
          order: 3,
          collapsed: false,
          tasks: ['task-3'],
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

    const result = await DataConsistencyChecker.checkConsistency(testData, { autoFix: true });

    // Expected fixes:
    // 1. Remove missing-1 from pending section
    // 2. Remove missing-2 from pending section
    // 3. Add orphaned-1 to pending section
    // 4. Add orphaned-2 to completed section
    // 5. Update metadata totalTasks from 10 to 5
    // 6. Update metadata completedTasks from 5 to 2

    expect(result.fixedIssues).toHaveLength(6);

    // Verify each type of fix
    const removedTaskFixes = result.fixedIssues.filter(fix =>
      fix.includes('Removed orphaned task reference')
    );
    const addedTaskFixes = result.fixedIssues.filter(fix => fix.includes('Added task'));
    const metadataFixes = result.fixedIssues.filter(fix => fix.includes('metadata'));

    expect(removedTaskFixes).toHaveLength(2); // missing-1, missing-2
    expect(addedTaskFixes).toHaveLength(2); // orphaned-1, orphaned-2
    expect(metadataFixes).toHaveLength(2); // totalTasks, completedTasks

    // Verify final state
    expect(testData.metadata.totalTasks).toBe(5);
    expect(testData.metadata.completedTasks).toBe(2);
    expect(testData.sections[0]!.tasks).toEqual(['task-1', 'orphaned-1']);
    expect(testData.sections[1]!.tasks).toEqual(['task-2', 'orphaned-2']);
  });
});
