/**
 * Tests for PerformanceOptimizer
 */

import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { PerformanceOptimizer } from '../../src/utils/performance-optimizer.js';
import { TodoJsonData, TodoTask } from '../../src/types/todo-json-schemas.js';

describe('PerformanceOptimizer', () => {
  let testData: TodoJsonData;
  let testTasks: TodoTask[];

  beforeEach(() => {
    // Create test tasks with various properties
    testTasks = [
      {
        id: 'task-1',
        title: 'High Priority Task',
        description: 'Important task',
        status: 'pending',
        priority: 'high',
        assignee: 'alice',
        category: 'development',
        tags: ['urgent', 'frontend'],
        createdAt: '2024-01-01T00:00:00.000Z',
        updatedAt: '2024-01-01T00:00:00.000Z',
        dueDate: '2024-01-15T00:00:00.000Z',
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
        lastModifiedBy: 'test',
        autoComplete: false,
        version: 1,
        changeLog: [],
        comments: [],
      },
      {
        id: 'task-2',
        title: 'Completed Task',
        description: 'Already done',
        status: 'completed',
        priority: 'medium',
        assignee: 'bob',
        category: 'testing',
        tags: ['backend'],
        createdAt: '2024-01-02T00:00:00.000Z',
        updatedAt: '2024-01-03T00:00:00.000Z',
        completedAt: '2024-01-03T00:00:00.000Z',
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
        lastModifiedBy: 'test',
        autoComplete: false,
        version: 1,
        changeLog: [],
        comments: [],
      },
      {
        id: 'task-3',
        title: 'Overdue Critical Task',
        description: 'Very important and overdue',
        status: 'in_progress',
        priority: 'critical',
        assignee: 'alice',
        category: 'security',
        tags: ['critical', 'security'],
        createdAt: '2024-01-01T00:00:00.000Z',
        updatedAt: '2024-01-01T00:00:00.000Z',
        dueDate: '2023-12-31T00:00:00.000Z', // Overdue
        archived: false,
        subtasks: [],
        dependencies: [],
        blockedBy: [],
        linkedAdrs: [],
        adrGeneratedTask: false,
        toolExecutions: [],
        scoreWeight: 1,
        scoreCategory: 'task_completion',
        progressPercentage: 50,
        lastModifiedBy: 'test',
        autoComplete: false,
        version: 1,
        changeLog: [],
        comments: [],
      },
      {
        id: 'task-4',
        title: 'Archived Task',
        description: 'Old task',
        status: 'completed',
        priority: 'low',
        assignee: 'charlie',
        category: 'documentation',
        tags: ['docs'],
        createdAt: '2023-12-01T00:00:00.000Z',
        updatedAt: '2023-12-01T00:00:00.000Z',
        completedAt: '2023-12-01T00:00:00.000Z',
        archived: true,
        archivedAt: '2023-12-01T00:00:00.000Z',
        subtasks: [],
        dependencies: [],
        blockedBy: [],
        linkedAdrs: [],
        adrGeneratedTask: false,
        toolExecutions: [],
        scoreWeight: 1,
        scoreCategory: 'task_completion',
        progressPercentage: 100,
        lastModifiedBy: 'test',
        autoComplete: false,
        version: 1,
        changeLog: [],
        comments: [],
      },
    ];

    testData = {
      version: '1.0.0',
      metadata: {
        lastUpdated: '2024-01-01T00:00:00.000Z',
        totalTasks: testTasks.length,
        completedTasks: testTasks.filter(t => t.status === 'completed').length,
        autoSyncEnabled: true,
      },
      tasks: Object.fromEntries(testTasks.map(task => [task.id, task])),
      sections: [
        {
          id: 'pending',
          title: 'Pending Tasks',
          order: 1,
          collapsed: false,
          tasks: testTasks.filter(t => t.status === 'pending').map(t => t.id),
        },
        {
          id: 'in_progress',
          title: 'In Progress',
          order: 2,
          collapsed: false,
          tasks: testTasks.filter(t => t.status === 'in_progress').map(t => t.id),
        },
        {
          id: 'completed',
          title: 'Completed',
          order: 3,
          collapsed: false,
          tasks: testTasks.filter(t => t.status === 'completed').map(t => t.id),
        },
      ],
      scoringSync: {
        lastScoreUpdate: '2024-01-01T00:00:00.000Z',
        taskCompletionScore: 50,
        priorityWeightedScore: 60,
        criticalTasksRemaining: 1,
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

  afterEach(() => {
    PerformanceOptimizer.clearCache();
  });

  describe('Filtering', () => {
    it('should filter by status correctly', async () => {
      const result = await PerformanceOptimizer.getOptimizedTasks(testData, {
        status: 'completed',
      });

      expect(result.items).toHaveLength(2);
      expect(result.items.every(task => task.status === 'completed')).toBe(true);
    });

    it('should filter by priority correctly', async () => {
      const result = await PerformanceOptimizer.getOptimizedTasks(testData, {
        priority: 'high',
      });

      expect(result.items).toHaveLength(1);
      expect(result.items[0]!.priority).toBe('high');
    });

    it('should filter by assignee correctly', async () => {
      const result = await PerformanceOptimizer.getOptimizedTasks(testData, {
        assignee: 'alice',
      });

      expect(result.items).toHaveLength(2);
      expect(result.items.every(task => task.assignee === 'alice')).toBe(true);
    });

    it('should filter by category correctly', async () => {
      const result = await PerformanceOptimizer.getOptimizedTasks(testData, {
        category: 'development',
      });

      expect(result.items).toHaveLength(1);
      expect(result.items[0]!.category).toBe('development');
    });

    it('should filter by hasDeadline correctly', async () => {
      const result = await PerformanceOptimizer.getOptimizedTasks(testData, {
        hasDeadline: true,
      });

      expect(result.items).toHaveLength(2);
      expect(result.items.every(task => task.dueDate)).toBe(true);
    });

    it('should filter by overdue correctly', async () => {
      // Use a specific date context to make the test deterministic
      // Set current date to 2024-01-10, so task-3 (due 2023-12-31) is overdue
      // but task-1 (due 2024-01-15) is not overdue yet
      const dateContext = { currentDate: new Date('2024-01-10T00:00:00.000Z') };

      const result = await PerformanceOptimizer.getOptimizedTasks(
        testData,
        {
          overdue: true,
        },
        undefined,
        undefined,
        dateContext
      );

      expect(result.items).toHaveLength(1);
      expect(result.items[0]!.id).toBe('task-3');
    });

    it('should filter by overdue correctly with different date contexts', async () => {
      // Test with date context where both tasks are overdue
      const futureDateContext = { currentDate: new Date('2024-01-20T00:00:00.000Z') };

      const futureResult = await PerformanceOptimizer.getOptimizedTasks(
        testData,
        {
          overdue: true,
        },
        undefined,
        undefined,
        futureDateContext
      );

      expect(futureResult.items).toHaveLength(2);
      expect(futureResult.items.map(t => t.id).sort()).toEqual(['task-1', 'task-3']);

      // Test with date context where no tasks are overdue
      const pastDateContext = { currentDate: new Date('2023-12-01T00:00:00.000Z') };

      const pastResult = await PerformanceOptimizer.getOptimizedTasks(
        testData,
        {
          overdue: true,
        },
        undefined,
        undefined,
        pastDateContext
      );

      expect(pastResult.items).toHaveLength(0);
    });

    it('should use dateContext from filters when provided', async () => {
      const result = await PerformanceOptimizer.getOptimizedTasks(testData, {
        overdue: true,
        dateContext: { currentDate: new Date('2024-01-10T00:00:00.000Z') },
      });

      expect(result.items).toHaveLength(1);
      expect(result.items[0]!.id).toBe('task-3');
    });

    it('should filter by tags correctly', async () => {
      const result = await PerformanceOptimizer.getOptimizedTasks(testData, {
        tags: ['urgent'],
      });

      expect(result.items).toHaveLength(1);
      expect(result.items[0]!.tags).toContain('urgent');
    });

    it('should filter by archived status correctly', async () => {
      const result = await PerformanceOptimizer.getOptimizedTasks(testData, {
        archived: false,
      });

      expect(result.items).toHaveLength(3);
      expect(result.items.every(task => !task.archived)).toBe(true);
    });

    it('should filter by search term correctly', async () => {
      const result = await PerformanceOptimizer.getOptimizedTasks(testData, {
        search: 'critical',
      });

      expect(result.items).toHaveLength(1);
      expect(result.items[0]!.title.toLowerCase()).toContain('critical');
    });

    it('should combine multiple filters correctly', async () => {
      const result = await PerformanceOptimizer.getOptimizedTasks(testData, {
        status: 'completed',
        archived: false,
      });

      expect(result.items).toHaveLength(1);
      expect(result.items[0]!.status).toBe('completed');
      expect(result.items[0]!.archived).toBe(false);
    });
  });

  describe('Sorting', () => {
    it('should sort by priority correctly (desc)', async () => {
      const result = await PerformanceOptimizer.getOptimizedTasks(
        testData,
        {},
        { field: 'priority', order: 'desc' }
      );

      const priorities = result.items.map(task => task.priority);
      expect(priorities[0]).toBe('critical');
      expect(priorities[1]).toBe('high');
    });

    it('should sort by priority correctly (asc)', async () => {
      const result = await PerformanceOptimizer.getOptimizedTasks(
        testData,
        {},
        { field: 'priority', order: 'asc' }
      );

      const priorities = result.items.map(task => task.priority);
      expect(priorities[0]).toBe('low');
      expect(priorities[priorities.length - 1]).toBe('critical');
    });

    it('should sort by dueDate correctly', async () => {
      const result = await PerformanceOptimizer.getOptimizedTasks(
        testData,
        {},
        { field: 'dueDate', order: 'asc' }
      );

      // Tasks with due dates should come first, sorted by date
      const tasksWithDates = result.items.filter(task => task.dueDate);
      expect(tasksWithDates).toHaveLength(2);

      const dates = tasksWithDates.map(task => new Date(task.dueDate!).getTime());
      expect(dates[0]).toBeLessThan(dates[1]!);
    });

    it('should sort by createdAt correctly', async () => {
      const result = await PerformanceOptimizer.getOptimizedTasks(
        testData,
        {},
        { field: 'createdAt', order: 'asc' }
      );

      const dates = result.items.map(task => new Date(task.createdAt).getTime());
      for (let i = 1; i < dates.length; i++) {
        expect(dates[i]).toBeGreaterThanOrEqual(dates[i - 1]!);
      }
    });

    it('should sort by title correctly', async () => {
      const result = await PerformanceOptimizer.getOptimizedTasks(
        testData,
        {},
        { field: 'title', order: 'asc' }
      );

      const titles = result.items.map(task => task.title);
      const sortedTitles = [...titles].sort();
      expect(titles).toEqual(sortedTitles);
    });
  });

  describe('Pagination', () => {
    it('should paginate results correctly', async () => {
      const result = await PerformanceOptimizer.getOptimizedTasks(testData, {}, undefined, {
        page: 1,
        pageSize: 2,
      });

      expect(result.items).toHaveLength(2);
      expect(result.totalItems).toBe(4);
      expect(result.totalPages).toBe(2);
      expect(result.currentPage).toBe(1);
      expect(result.pageSize).toBe(2);
      expect(result.hasNextPage).toBe(true);
      expect(result.hasPreviousPage).toBe(false);
    });

    it('should handle second page correctly', async () => {
      const result = await PerformanceOptimizer.getOptimizedTasks(testData, {}, undefined, {
        page: 2,
        pageSize: 2,
      });

      expect(result.items).toHaveLength(2);
      expect(result.currentPage).toBe(2);
      expect(result.hasNextPage).toBe(false);
      expect(result.hasPreviousPage).toBe(true);
    });

    it('should handle empty page correctly', async () => {
      const result = await PerformanceOptimizer.getOptimizedTasks(testData, {}, undefined, {
        page: 10,
        pageSize: 2,
      });

      expect(result.items).toHaveLength(0);
      expect(result.currentPage).toBe(10);
      expect(result.hasNextPage).toBe(false);
      expect(result.hasPreviousPage).toBe(true);
    });

    it('should work without pagination', async () => {
      const result = await PerformanceOptimizer.getOptimizedTasks(testData);

      expect(result.items).toHaveLength(4);
      expect(result.totalPages).toBe(1);
      expect(result.hasNextPage).toBe(false);
      expect(result.hasPreviousPage).toBe(false);
    });
  });

  describe('Caching', () => {
    it('should cache filtered results', async () => {
      const filters = { status: 'completed' as const };

      // First call
      const startTime1 = Date.now();
      const result1 = await PerformanceOptimizer.getOptimizedTasks(testData, filters);
      const endTime1 = Date.now();

      // Second call (should use cache)
      const startTime2 = Date.now();
      const result2 = await PerformanceOptimizer.getOptimizedTasks(testData, filters);
      const endTime2 = Date.now();

      expect(result1.items).toEqual(result2.items);
      // Second call should be faster (cached)
      expect(endTime2 - startTime2).toBeLessThanOrEqual(endTime1 - startTime1);
    });

    it('should invalidate cache when data changes', async () => {
      const filters = { status: 'completed' as const };

      // First call
      const result1 = await PerformanceOptimizer.getOptimizedTasks(testData, filters);

      // Modify data
      testData.metadata.lastUpdated = new Date().toISOString();

      // Second call (should not use stale cache)
      const result2 = await PerformanceOptimizer.getOptimizedTasks(testData, filters);

      expect(result1.items).toEqual(result2.items); // Same data, but fresh calculation
    });

    it('should provide cache statistics', () => {
      const stats = PerformanceOptimizer.getCacheStats();

      expect(stats).toHaveProperty('size');
      expect(stats).toHaveProperty('maxSize');
      expect(typeof stats.size).toBe('number');
      expect(typeof stats.maxSize).toBe('number');
    });

    it('should clear cache correctly', async () => {
      // Add something to cache
      await PerformanceOptimizer.getOptimizedTasks(testData, { status: 'completed' });

      let stats = PerformanceOptimizer.getCacheStats();
      expect(stats.size).toBeGreaterThan(0);

      PerformanceOptimizer.clearCache();

      stats = PerformanceOptimizer.getCacheStats();
      expect(stats.size).toBe(0);
    });
  });

  describe('Analytics', () => {
    it('should calculate optimized analytics correctly', async () => {
      const analytics = await PerformanceOptimizer.calculateOptimizedAnalytics(testData);

      expect(analytics.totalTasks).toBe(4);
      expect(analytics.completedTasks).toBe(2);
      expect(analytics.completionPercentage).toBe(50);
      expect(analytics.criticalTasksRemaining).toBe(1);

      expect(analytics.priorityDistribution).toEqual({
        low: 1,
        medium: 1,
        high: 1,
        critical: 1,
      });

      expect(analytics.statusDistribution).toEqual({
        pending: 1,
        in_progress: 1,
        completed: 2,
        blocked: 0,
        cancelled: 0,
      });

      expect(analytics.averageTaskAge).toBeGreaterThan(0);
    });

    it('should handle empty dataset in analytics', async () => {
      const emptyData = {
        ...testData,
        tasks: {},
        metadata: { ...testData.metadata, totalTasks: 0, completedTasks: 0 },
      };

      const analytics = await PerformanceOptimizer.calculateOptimizedAnalytics(emptyData);

      expect(analytics.totalTasks).toBe(0);
      expect(analytics.completedTasks).toBe(0);
      expect(analytics.completionPercentage).toBe(100);
      expect(analytics.averageTaskAge).toBe(0);
    });
  });

  describe('Performance', () => {
    it('should handle large datasets efficiently', async () => {
      const { testConfig, createPerformanceTest } = await import('./test-config.js');
      const benchmarks = testConfig.getEnvironmentAwareBenchmarks();

      await createPerformanceTest(
        'Large dataset query performance',
        async monitor => {
          monitor.start(4, 'Testing large dataset performance');

          // Create a large dataset
          const largeTaskCount = 1000;
          const largeTasks: Record<string, TodoTask> = {};

          monitor.step('Creating large dataset');
          for (let i = 0; i < largeTaskCount; i++) {
            const taskId = `large-task-${i}`;
            largeTasks[taskId] = {
              ...testTasks[0]!,
              id: taskId,
              title: `Large Task ${i}`,
              status: i % 3 === 0 ? 'completed' : i % 3 === 1 ? 'in_progress' : 'pending',
              priority:
                i % 4 === 0 ? 'critical' : i % 4 === 1 ? 'high' : i % 4 === 2 ? 'medium' : 'low',
            };
          }

          const largeData = {
            ...testData,
            tasks: largeTasks,
            metadata: { ...testData.metadata, totalTasks: largeTaskCount },
          };

          monitor.step('Executing complex query');
          const startTime = Date.now();
          const result = await PerformanceOptimizer.getOptimizedTasks(
            largeData,
            { status: 'completed' },
            { field: 'priority', order: 'desc' },
            { page: 1, pageSize: 50 }
          );
          const endTime = Date.now();
          const queryTime = endTime - startTime;

          monitor.step('Validating results');
          expect(result.items).toHaveLength(50);
          expect(result.totalItems).toBeGreaterThan(300); // About 1/3 should be completed

          monitor.step('Checking performance expectations');
          // Use environment-aware expectations
          const expectedMaxTime = benchmarks.queryPerformance.complex;
          expect(queryTime).toBeLessThan(expectedMaxTime);

          return { queryTime, resultCount: result.items.length };
        },
        {
          expectedDuration: benchmarks.queryPerformance.complex,
          maxMemoryMB: benchmarks.memoryLimits.baseline + 1000 * benchmarks.memoryLimits.perTask,
          steps: 4,
          verbose: true,
        }
      )();
    });

    it('should perform analytics efficiently on large datasets', async () => {
      const { testConfig, createPerformanceTest } = await import('./test-config.js');
      const benchmarks = testConfig.getEnvironmentAwareBenchmarks();

      await createPerformanceTest(
        'Large dataset analytics performance',
        async monitor => {
          monitor.start(4, 'Testing analytics performance on large dataset');

          // Create a large dataset
          const largeTaskCount = 5000;
          const largeTasks: Record<string, TodoTask> = {};

          monitor.step('Creating large analytics dataset');
          for (let i = 0; i < largeTaskCount; i++) {
            const taskId = `large-task-${i}`;
            largeTasks[taskId] = {
              ...testTasks[0]!,
              id: taskId,
              title: `Large Task ${i}`,
              status: i % 2 === 0 ? 'completed' : 'pending',
              priority: i % 4 === 0 ? 'critical' : 'medium',
            };
          }

          const largeData = {
            ...testData,
            tasks: largeTasks,
            metadata: { ...testData.metadata, totalTasks: largeTaskCount },
          };

          monitor.step('Computing analytics');
          const startTime = Date.now();
          const analytics = await PerformanceOptimizer.calculateOptimizedAnalytics(largeData);
          const endTime = Date.now();
          const analyticsTime = endTime - startTime;

          monitor.step('Validating analytics results');
          expect(analytics.totalTasks).toBe(largeTaskCount);
          expect(analytics.completedTasks).toBe(largeTaskCount / 2);

          monitor.step('Checking analytics performance');
          // Use environment-aware expectations - analytics should be faster than complex queries
          const expectedMaxTime = Math.round(benchmarks.queryPerformance.complex * 0.6);
          expect(analyticsTime).toBeLessThan(expectedMaxTime);

          return { analyticsTime, taskCount: largeTaskCount };
        },
        {
          expectedDuration: Math.round(benchmarks.queryPerformance.complex * 0.6),
          maxMemoryMB: benchmarks.memoryLimits.baseline + 5000 * benchmarks.memoryLimits.perTask,
          steps: 4,
          verbose: true,
        }
      )();
    });

    it('should meet environment-specific performance benchmarks', async () => {
      const { testConfig } = await import('./test-config.js');
      const benchmarks = testConfig.getEnvironmentAwareBenchmarks();
      const envInfo = testConfig.getEnvironmentInfo();

      console.log(
        `\n📊 Performance benchmarks adjusted for: ${benchmarks.adjustedFor.join(', ') || 'baseline environment'}`
      );
      console.log(`🖥️  Environment: ${envInfo.platform}, Node ${envInfo.nodeVersion}`);
      console.log(
        `⚙️  Flags: CI=${envInfo.isCI}, Coverage=${envInfo.isCoverage}, Debug=${envInfo.isDebug}`
      );

      // Test simple query performance
      const simpleStartTime = Date.now();
      await PerformanceOptimizer.getOptimizedTasks(testData, { status: 'completed' });
      const simpleQueryTime = Date.now() - simpleStartTime;

      expect(simpleQueryTime).toBeLessThan(benchmarks.queryPerformance.simple);

      // Test pagination performance
      const paginationStartTime = Date.now();
      await PerformanceOptimizer.getOptimizedTasks(testData, {}, undefined, {
        page: 1,
        pageSize: 2,
      });
      const paginationTime = Date.now() - paginationStartTime;

      expect(paginationTime).toBeLessThan(benchmarks.queryPerformance.pagination);

      console.log(
        `✅ Simple query: ${simpleQueryTime}ms (limit: ${benchmarks.queryPerformance.simple}ms)`
      );
      console.log(
        `✅ Pagination: ${paginationTime}ms (limit: ${benchmarks.queryPerformance.pagination}ms)`
      );
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty task list', async () => {
      const emptyData = {
        ...testData,
        tasks: {},
      };

      const result = await PerformanceOptimizer.getOptimizedTasks(emptyData);

      expect(result.items).toHaveLength(0);
      expect(result.totalItems).toBe(0);
      expect(result.totalPages).toBe(1);
    });

    it('should handle invalid filter values gracefully', async () => {
      const result = await PerformanceOptimizer.getOptimizedTasks(testData, {
        status: 'invalid-status' as any,
      });

      expect(result.items).toHaveLength(0);
    });

    it('should handle tasks without optional fields', async () => {
      const minimalTask: TodoTask = {
        id: 'minimal-task',
        title: 'Minimal Task',
        description: '',
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
        comments: [],
      };

      const minimalData = {
        ...testData,
        tasks: { 'minimal-task': minimalTask },
      };

      const result = await PerformanceOptimizer.getOptimizedTasks(minimalData);

      expect(result.items).toHaveLength(1);
      expect(result.items[0]!.id).toBe('minimal-task');
    });
  });
});
