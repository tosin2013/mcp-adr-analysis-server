/**
 * Tests for DataConsistencyChecker
 */

import { describe, it, expect, beforeEach } from '@jest/globals';
import { DataConsistencyChecker } from '../../src/utils/data-consistency-checker.js';
import { TodoJsonData, TodoTask } from '../../src/types/todo-json-schemas.js';

describe('DataConsistencyChecker', () => {
  let validData: TodoJsonData;
  let validTask: TodoTask;

  beforeEach(() => {
    validTask = {
      id: 'task-1',
      title: 'Test Task',
      description: 'Test Description',
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
      lastModifiedBy: 'test',
      autoComplete: false,
      version: 1,
      changeLog: [],
      comments: []
    };

    validData = {
      version: '1.0.0',
      metadata: {
        lastUpdated: '2024-01-01T00:00:00.000Z',
        totalTasks: 1,
        completedTasks: 0,
        autoSyncEnabled: true
      },
      tasks: {
        'task-1': validTask
      },
      sections: [
        {
          id: 'pending',
          title: 'Pending Tasks',
          order: 1,
          collapsed: false,
          tasks: ['task-1']
        },
        {
          id: 'completed',
          title: 'Completed',
          order: 2,
          collapsed: false,
          tasks: []
        }
      ],
      scoringSync: {
        lastScoreUpdate: '2024-01-01T00:00:00.000Z',
        taskCompletionScore: 0,
        priorityWeightedScore: 0,
        criticalTasksRemaining: 0,
        scoreHistory: []
      },
      knowledgeGraphSync: {
        lastSync: '2024-01-01T00:00:00.000Z',
        linkedIntents: [],
        pendingUpdates: []
      },
      automationRules: [],
      templates: [],
      recurringTasks: [],
      operationHistory: []
    };
  });

  describe('Valid Data', () => {
    it('should pass consistency check for valid data', async () => {
      const result = await DataConsistencyChecker.checkConsistency(validData);

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
      expect(result.warnings).toHaveLength(0);
    });

    it('should pass quick check for valid data', async () => {
      const isValid = await DataConsistencyChecker.quickCheck(validData);
      expect(isValid).toBe(true);
    });
  });

  describe('Task-Section Consistency', () => {
    it('should detect missing task object referenced in section', async () => {
      validData.sections[0]!.tasks.push('non-existent-task');

      const result = await DataConsistencyChecker.checkConsistency(validData);

      expect(result.isValid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0]!.type).toBe('MISSING_TASK_OBJECT');
      expect(result.errors[0]!.severity).toBe('critical');
    });

    it('should detect task not in any section', async () => {
      validData.tasks['orphaned-task'] = {
        ...validTask,
        id: 'orphaned-task',
        title: 'Orphaned Task'
      };

      const result = await DataConsistencyChecker.checkConsistency(validData);

      expect(result.isValid).toBe(true); // This is a warning, not an error
      expect(result.warnings).toHaveLength(1);
      expect(result.warnings[0]!.type).toBe('TASK_NOT_IN_SECTION');
    });

    it('should detect duplicate task in sections', async () => {
      validData.sections[1]!.tasks.push('task-1'); // Add to completed section too

      const result = await DataConsistencyChecker.checkConsistency(validData);

      expect(result.isValid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0]!.type).toBe('DUPLICATE_TASK_IN_SECTIONS');
    });

    it('should auto-fix missing task references when enabled', async () => {
      validData.sections[0]!.tasks.push('non-existent-task');

      const result = await DataConsistencyChecker.checkConsistency(validData, {
        autoFix: true
      });

      expect(result.fixedIssues).toHaveLength(1);
      expect(result.fixedIssues[0]).toContain('Removed orphaned task reference');
      expect(validData.sections[0]!.tasks).toEqual(['task-1']);
    });

    it('should auto-fix orphaned tasks when enabled', async () => {
      validData.tasks['orphaned-task'] = {
        ...validTask,
        id: 'orphaned-task',
        title: 'Orphaned Task',
        status: 'completed'
      };

      const result = await DataConsistencyChecker.checkConsistency(validData, {
        autoFix: true
      });

      expect(result.fixedIssues).toHaveLength(1);
      expect(result.fixedIssues[0]).toContain('Added task orphaned-task to section completed');
      expect(validData.sections[1]!.tasks).toContain('orphaned-task');
    });
  });

  describe('Metadata Consistency', () => {
    it('should detect metadata mismatch for total tasks', async () => {
      validData.metadata.totalTasks = 5; // Wrong count

      const result = await DataConsistencyChecker.checkConsistency(validData);

      expect(result.warnings).toHaveLength(1);
      expect(result.warnings[0]!.type).toBe('METADATA_MISMATCH');
      expect(result.warnings[0]!.message).toContain('totalTasks');
    });

    it('should detect metadata mismatch for completed tasks', async () => {
      validData.metadata.completedTasks = 3; // Wrong count

      const result = await DataConsistencyChecker.checkConsistency(validData);

      expect(result.warnings).toHaveLength(1);
      expect(result.warnings[0]!.type).toBe('METADATA_MISMATCH');
      expect(result.warnings[0]!.message).toContain('completedTasks');
    });

    it('should auto-fix metadata when enabled', async () => {
      validData.metadata.totalTasks = 5;
      validData.metadata.completedTasks = 3;

      const result = await DataConsistencyChecker.checkConsistency(validData, {
        autoFix: true
      });

      expect(result.fixedIssues).toHaveLength(2);
      expect(validData.metadata.totalTasks).toBe(1);
      expect(validData.metadata.completedTasks).toBe(0);
    });
  });

  describe('Dependency Consistency', () => {
    it('should detect missing dependency', async () => {
      validData.tasks['task-1']!.dependencies = ['non-existent-dep'];

      const result = await DataConsistencyChecker.checkConsistency(validData);

      expect(result.isValid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0]!.type).toBe('MISSING_DEPENDENCY');
    });

    it('should detect circular dependencies', async () => {
      // Create circular dependency: task-1 -> task-2 -> task-1
      validData.tasks['task-2'] = {
        ...validTask,
        id: 'task-2',
        title: 'Task 2',
        dependencies: ['task-1']
      };
      validData.tasks['task-1']!.dependencies = ['task-2'];

      const result = await DataConsistencyChecker.checkConsistency(validData);

      expect(result.isValid).toBe(false);
      expect(result.errors.some(e => e.type === 'CIRCULAR_DEPENDENCY')).toBe(true);
    });

    it('should detect complex circular dependencies', async () => {
      // Create complex circular dependency: task-1 -> task-2 -> task-3 -> task-1
      validData.tasks['task-2'] = {
        ...validTask,
        id: 'task-2',
        title: 'Task 2',
        dependencies: ['task-3']
      };
      validData.tasks['task-3'] = {
        ...validTask,
        id: 'task-3',
        title: 'Task 3',
        dependencies: ['task-1']
      };
      validData.tasks['task-1']!.dependencies = ['task-2'];

      const result = await DataConsistencyChecker.checkConsistency(validData);

      expect(result.isValid).toBe(false);
      expect(result.errors.some(e => e.type === 'CIRCULAR_DEPENDENCY')).toBe(true);
    });
  });

  describe('Data Integrity', () => {
    it('should detect invalid task ID', async () => {
      validData.tasks['task-1']!.id = 'wrong-id';

      const result = await DataConsistencyChecker.checkConsistency(validData);

      expect(result.isValid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0]!.type).toBe('INVALID_TASK_ID');
    });

    it('should detect missing title', async () => {
      validData.tasks['task-1']!.title = '';

      const result = await DataConsistencyChecker.checkConsistency(validData);

      expect(result.isValid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0]!.type).toBe('MISSING_TITLE');
    });

    it('should detect missing timestamps', async () => {
      delete (validData.tasks['task-1'] as any).createdAt;
      delete (validData.tasks['task-1'] as any).updatedAt;

      const result = await DataConsistencyChecker.checkConsistency(validData);

      expect(result.warnings).toHaveLength(1);
      expect(result.warnings[0]!.type).toBe('MISSING_TIMESTAMPS');
    });

    it('should detect invalid date format', async () => {
      validData.tasks['task-1']!.dueDate = 'invalid-date';

      const result = await DataConsistencyChecker.checkConsistency(validData);

      expect(result.isValid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0]!.type).toBe('INVALID_DATE');
    });
  });

  describe('Orphaned References', () => {
    it('should detect orphaned parent reference', async () => {
      validData.tasks['task-1']!.parentTaskId = 'non-existent-parent';

      const result = await DataConsistencyChecker.checkConsistency(validData);

      expect(result.isValid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0]!.type).toBe('ORPHANED_PARENT_REFERENCE');
    });

    it('should detect orphaned subtask reference', async () => {
      validData.tasks['task-1']!.subtasks = ['non-existent-subtask'];

      const result = await DataConsistencyChecker.checkConsistency(validData);

      expect(result.isValid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0]!.type).toBe('ORPHANED_SUBTASK_REFERENCE');
    });
  });

  describe('Scoring Sync Consistency', () => {
    it('should detect missing scoring sync', async () => {
      delete (validData as any).scoringSync;

      const result = await DataConsistencyChecker.checkConsistency(validData);

      expect(result.warnings).toHaveLength(1);
      expect(result.warnings[0]!.type).toBe('MISSING_SCORING_SYNC');
    });

    it('should detect stale scoring data', async () => {
      validData.metadata.lastUpdated = '2024-01-02T00:00:00.000Z';
      validData.scoringSync.lastScoreUpdate = '2024-01-01T00:00:00.000Z';

      const result = await DataConsistencyChecker.checkConsistency(validData);

      expect(result.warnings).toHaveLength(1);
      expect(result.warnings[0]!.type).toBe('STALE_SCORING_DATA');
    });
  });

  describe('Performance', () => {
    it('should handle large datasets efficiently', async () => {
      // Create a large dataset
      const taskCount = 1000;
      const largeTasks: Record<string, TodoTask> = {};
      const sectionTasks: string[] = [];

      for (let i = 0; i < taskCount; i++) {
        const taskId = `task-${i}`;
        largeTasks[taskId] = {
          ...validTask,
          id: taskId,
          title: `Task ${i}`
        };
        sectionTasks.push(taskId);
      }

      const largeData: TodoJsonData = {
        ...validData,
        tasks: largeTasks,
        metadata: {
          ...validData.metadata,
          totalTasks: taskCount
        },
        sections: [
          {
            ...validData.sections[0]!,
            tasks: sectionTasks
          },
          ...validData.sections.slice(1)
        ]
      };

      const startTime = Date.now();
      const result = await DataConsistencyChecker.checkConsistency(largeData);
      const endTime = Date.now();

      expect(result.isValid).toBe(true);
      expect(endTime - startTime).toBeLessThan(1000); // Should complete within 1 second
    });

    it('should perform quick check efficiently on large datasets', async () => {
      // Create a large dataset
      const taskCount = 5000;
      const largeTasks: Record<string, TodoTask> = {};
      const sectionTasks: string[] = [];

      for (let i = 0; i < taskCount; i++) {
        const taskId = `task-${i}`;
        largeTasks[taskId] = {
          ...validTask,
          id: taskId,
          title: `Task ${i}`
        };
        sectionTasks.push(taskId);
      }

      const largeData: TodoJsonData = {
        ...validData,
        tasks: largeTasks,
        metadata: {
          ...validData.metadata,
          totalTasks: taskCount
        },
        sections: [
          {
            ...validData.sections[0]!,
            tasks: sectionTasks
          },
          ...validData.sections.slice(1)
        ]
      };

      const startTime = Date.now();
      const isValid = await DataConsistencyChecker.quickCheck(largeData);
      const endTime = Date.now();

      expect(isValid).toBe(true);
      expect(endTime - startTime).toBeLessThan(100); // Should complete within 100ms
    });
  });

  describe('Error Handling', () => {
    it('should handle malformed data gracefully', async () => {
      const malformedData = {
        ...validData,
        tasks: null as any
      };

      const result = await DataConsistencyChecker.checkConsistency(malformedData);
      expect(result.isValid).toBe(false);
    });

    it('should handle quick check with malformed data', async () => {
      const malformedData = {
        ...validData,
        sections: null as any
      };

      const isValid = await DataConsistencyChecker.quickCheck(malformedData);
      expect(isValid).toBe(false);
    });
  });
});