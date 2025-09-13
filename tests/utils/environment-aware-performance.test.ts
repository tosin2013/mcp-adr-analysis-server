/**
 * Environment-Aware Performance Tests
 * Demonstrates adaptive performance expectations based on environment conditions
 */

import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { testConfig, createPerformanceTest, TestProgressMonitor } from './test-config.js';
import { PerformanceOptimizer } from '../../src/utils/performance-optimizer.js';
import { TodoJsonData, TodoTask } from '../../src/types/todo-json-schemas.js';

describe('Environment-Aware Performance Tests', () => {
  let testData: TodoJsonData;
  let largeTasks: TodoTask[];

  beforeEach(() => {
    // Create test data
    largeTasks = [];
    for (let i = 0; i < 2000; i++) {
      largeTasks.push({
        id: `env-task-${i}`,
        title: `Environment Test Task ${i}`,
        description: `Task ${i} for environment testing`,
        status: i % 3 === 0 ? 'completed' : i % 3 === 1 ? 'in_progress' : 'pending',
        priority: i % 4 === 0 ? 'critical' : i % 4 === 1 ? 'high' : i % 4 === 2 ? 'medium' : 'low',
        assignee: `user-${i % 15}`,
        category: `category-${i % 8}`,
        tags: [`tag-${i % 5}`, `tag-${i % 7}`],
        createdAt: new Date(Date.now() - i * 1000).toISOString(),
        updatedAt: new Date(Date.now() - i * 500).toISOString(),
        dueDate: i % 4 === 0 ? new Date(Date.now() + i * 1000).toISOString() : undefined,
        archived: i % 20 === 0,
        subtasks: [],
        dependencies: [],
        blockedBy: [],
        linkedAdrs: [],
        adrGeneratedTask: false,
        toolExecutions: [],
        scoreWeight: 1,
        scoreCategory: 'task_completion',
        progressPercentage: i % 101,
        lastModifiedBy: 'test',
        autoComplete: false,
        version: 1,
        changeLog: [],
        comments: [],
      });
    }

    testData = {
      version: '1.0.0',
      metadata: {
        lastUpdated: new Date().toISOString(),
        totalTasks: largeTasks.length,
        completedTasks: largeTasks.filter(t => t.status === 'completed').length,
        autoSyncEnabled: true,
      },
      tasks: Object.fromEntries(largeTasks.map(task => [task.id, task])),
      sections: [
        {
          id: 'pending',
          title: 'Pending Tasks',
          order: 1,
          collapsed: false,
          tasks: largeTasks.filter(t => t.status === 'pending').map(t => t.id),
        },
      ],
      scoringSync: {
        lastScoreUpdate: new Date().toISOString(),
        taskCompletionScore: 50,
        priorityWeightedScore: 60,
        criticalTasksRemaining: 1,
        scoreHistory: [],
      },
      knowledgeGraphSync: {
        lastSync: new Date().toISOString(),
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
    PerformanceOptimizer.clearQueue();
  });

  describe('Environment Detection and Adaptation', () => {
    it('should detect current environment and adjust expectations', () => {
      const envInfo = testConfig.getEnvironmentInfo();
      const benchmarks = testConfig.getEnvironmentAwareBenchmarks();

      console.log('\n🌍 Environment Detection Results:');
      console.log(`   Platform: ${envInfo.platform}`);
      console.log(`   Node Version: ${envInfo.nodeVersion}`);
      console.log(`   CI Environment: ${envInfo.isCI}`);
      console.log(`   Coverage Mode: ${envInfo.isCoverage}`);
      console.log(`   Debug Mode: ${envInfo.isDebug}`);

      console.log('\n⚙️  Performance Adjustments:');
      if (benchmarks.adjustedFor.length > 0) {
        console.log(`   Adjusted for: ${benchmarks.adjustedFor.join(', ')}`);
      } else {
        console.log('   Using baseline performance expectations');
      }

      console.log('\n📊 Performance Benchmarks:');
      console.log(`   Task Creation (small): ${benchmarks.taskCreation.small} tasks/sec`);
      console.log(`   Task Creation (medium): ${benchmarks.taskCreation.medium} tasks/sec`);
      console.log(`   Task Creation (large): ${benchmarks.taskCreation.large} tasks/sec`);
      console.log(`   Simple Query: ${benchmarks.queryPerformance.simple}ms`);
      console.log(`   Complex Query: ${benchmarks.queryPerformance.complex}ms`);
      console.log(`   Pagination: ${benchmarks.queryPerformance.pagination}ms`);

      // Verify benchmarks are reasonable
      expect(benchmarks.taskCreation.small).toBeGreaterThan(0);
      expect(benchmarks.taskCreation.medium).toBeGreaterThan(0);
      expect(benchmarks.taskCreation.large).toBeGreaterThan(0);
      expect(benchmarks.queryPerformance.simple).toBeGreaterThan(0);
      expect(benchmarks.queryPerformance.complex).toBeGreaterThan(
        benchmarks.queryPerformance.simple
      );
      expect(benchmarks.queryPerformance.pagination).toBeGreaterThan(0);
    });

    it('should adapt performance expectations based on system resources', () => {
      const benchmarks = testConfig.getEnvironmentAwareBenchmarks();
      const memoryInfo = process.memoryUsage();
      const totalMemoryMB = memoryInfo.heapTotal / 1024 / 1024;

      console.log('\n💾 Memory Information:');
      console.log(`   Heap Total: ${totalMemoryMB.toFixed(2)}MB`);
      console.log(`   Heap Used: ${(memoryInfo.heapUsed / 1024 / 1024).toFixed(2)}MB`);
      console.log(`   Memory Baseline: ${benchmarks.memoryLimits.baseline}MB`);
      console.log(`   Memory per 1000 tasks: ${benchmarks.memoryLimits.perTask}MB`);
      console.log(`   Max memory growth: ${benchmarks.memoryLimits.maxGrowth}x`);

      // Verify memory limits are reasonable
      expect(benchmarks.memoryLimits.baseline).toBeGreaterThan(0);
      expect(benchmarks.memoryLimits.perTask).toBeGreaterThan(0);
      expect(benchmarks.memoryLimits.maxGrowth).toBeGreaterThan(1);
    });
  });

  describe('Progressive Performance Testing', () => {
    it('should demonstrate progress monitoring for long-running tests', async () => {
      await createPerformanceTest(
        'Progressive performance demonstration',
        async monitor => {
          const benchmarks = testConfig.getEnvironmentAwareBenchmarks();
          monitor.start(8, 'Demonstrating progressive performance testing');

          // Test 1: Simple query
          monitor.step('Testing simple query performance');
          const simpleStart = Date.now();
          const simpleResult = await PerformanceOptimizer.getOptimizedTasks(testData, {
            status: 'completed',
          });
          const simpleTime = Date.now() - simpleStart;
          expect(simpleTime).toBeLessThan(benchmarks.queryPerformance.simple);

          // Test 2: Complex filtering
          monitor.step('Testing complex filtering performance');
          const complexStart = Date.now();
          const complexResult = await PerformanceOptimizer.getOptimizedTasks(
            testData,
            {
              status: 'in_progress',
              priority: 'high',
              assignee: 'user-1',
            },
            { field: 'priority', order: 'desc' }
          );
          const complexTime = Date.now() - complexStart;
          expect(complexTime).toBeLessThan(benchmarks.queryPerformance.complex);

          // Test 3: Pagination
          monitor.step('Testing pagination performance');
          const paginationStart = Date.now();
          const paginatedResult = await PerformanceOptimizer.getOptimizedTasks(
            testData,
            { priority: 'critical' },
            { field: 'createdAt', order: 'desc' },
            { page: 1, pageSize: 25 }
          );
          const paginationTime = Date.now() - paginationStart;
          expect(paginationTime).toBeLessThan(benchmarks.queryPerformance.pagination);

          // Test 4: Analytics
          monitor.step('Testing analytics performance');
          const analyticsStart = Date.now();
          const analytics = await PerformanceOptimizer.calculateOptimizedAnalytics(testData);
          const analyticsTime = Date.now() - analyticsStart;
          expect(analyticsTime).toBeLessThan(benchmarks.queryPerformance.complex);

          // Test 5: Cache performance
          monitor.step('Testing cache performance');
          const cacheStart = Date.now();
          // Repeat the same query to test cache hit
          await PerformanceOptimizer.getOptimizedTasks(testData, { status: 'completed' });
          const cacheTime = Date.now() - cacheStart;
          expect(cacheTime).toBeLessThan(simpleTime); // Should be faster due to cache

          // Test 6: Memory usage check
          monitor.step('Checking memory usage');
          const memoryUsage = process.memoryUsage();
          const currentMemoryMB = memoryUsage.heapUsed / 1024 / 1024;
          const expectedMaxMemory =
            benchmarks.memoryLimits.baseline +
            (testData.metadata.totalTasks / 1000) * benchmarks.memoryLimits.perTask;

          console.log(`   Current memory: ${currentMemoryMB.toFixed(2)}MB`);
          console.log(`   Expected max: ${expectedMaxMemory.toFixed(2)}MB`);

          // Test 7: Concurrent operations
          monitor.step('Testing concurrent operations');
          const concurrentStart = Date.now();
          const concurrentPromises = [
            PerformanceOptimizer.getOptimizedTasks(testData, { status: 'pending' }),
            PerformanceOptimizer.getOptimizedTasks(testData, { priority: 'medium' }),
            PerformanceOptimizer.getOptimizedTasks(testData, { archived: false }),
          ];
          await Promise.all(concurrentPromises);
          const concurrentTime = Date.now() - concurrentStart;
          expect(concurrentTime).toBeLessThan(benchmarks.queryPerformance.complex * 2);

          // Test 8: Final validation
          monitor.step('Final performance validation');
          const performanceReport = {
            simple: { time: simpleTime, limit: benchmarks.queryPerformance.simple },
            complex: { time: complexTime, limit: benchmarks.queryPerformance.complex },
            pagination: { time: paginationTime, limit: benchmarks.queryPerformance.pagination },
            analytics: { time: analyticsTime, limit: benchmarks.queryPerformance.complex },
            cache: { time: cacheTime, baseline: simpleTime },
            concurrent: { time: concurrentTime, limit: benchmarks.queryPerformance.complex * 2 },
            memory: { current: currentMemoryMB, expected: expectedMaxMemory },
          };

          console.log('\n📈 Performance Test Results:');
          console.log(
            `   Simple Query: ${simpleTime}ms (limit: ${benchmarks.queryPerformance.simple}ms)`
          );
          console.log(
            `   Complex Query: ${complexTime}ms (limit: ${benchmarks.queryPerformance.complex}ms)`
          );
          console.log(
            `   Pagination: ${paginationTime}ms (limit: ${benchmarks.queryPerformance.pagination}ms)`
          );
          console.log(
            `   Analytics: ${analyticsTime}ms (limit: ${benchmarks.queryPerformance.complex}ms)`
          );
          console.log(`   Cache Hit: ${cacheTime}ms (baseline: ${simpleTime}ms)`);
          console.log(
            `   Concurrent: ${concurrentTime}ms (limit: ${benchmarks.queryPerformance.complex * 2}ms)`
          );

          return performanceReport;
        },
        {
          expectedDuration: testConfig.getEnvironmentAwareBenchmarks().queryPerformance.complex * 4,
          maxMemoryMB: testConfig.getEnvironmentAwareBenchmarks().memoryLimits.baseline * 2,
          steps: 8,
          verbose: true,
        }
      )();
    });

    it('should handle performance degradation gracefully', async () => {
      const monitor = new TestProgressMonitor(true);
      const benchmarks = testConfig.getEnvironmentAwareBenchmarks();

      monitor.start(3, 'Testing performance degradation handling');

      // Simulate a slower environment by creating memory pressure
      monitor.step('Creating memory pressure');
      const memoryHogs: any[] = [];
      for (let i = 0; i < 10; i++) {
        memoryHogs.push(new Array(100000).fill(`memory-hog-${i}`));
      }

      monitor.step('Testing performance under pressure');
      const pressureStart = Date.now();
      const result = await PerformanceOptimizer.getOptimizedTasks(testData, {
        status: 'completed',
        priority: 'high',
      });
      const pressureTime = Date.now() - pressureStart;

      monitor.step('Validating degraded performance');
      // Under memory pressure, performance may degrade but should still complete
      expect(result.items.length).toBeGreaterThan(0);

      // Allow for degraded performance (up to 3x slower)
      const degradedLimit = benchmarks.queryPerformance.complex * 3;
      if (pressureTime > degradedLimit) {
        console.warn(`⚠️  Performance severely degraded: ${pressureTime}ms > ${degradedLimit}ms`);
      }

      // Clean up memory
      memoryHogs.length = 0;

      monitor.finish(`Performance under pressure: ${pressureTime}ms`);

      console.log(`🔥 Performance under memory pressure: ${pressureTime}ms`);
      console.log(`   Normal limit: ${benchmarks.queryPerformance.complex}ms`);
      console.log(`   Degraded limit: ${degradedLimit}ms`);
    });
  });

  describe('Adaptive Timeout Management', () => {
    it('should use appropriate timeouts for different test types', () => {
      const unitTimeout = testConfig.getTimeoutForTestType('unit');
      const integrationTimeout = testConfig.getTimeoutForTestType('integration');
      const performanceTimeout = testConfig.getTimeoutForTestType('performance');

      console.log('\n⏱️  Timeout Configuration:');
      console.log(`   Unit Tests: ${unitTimeout}ms`);
      console.log(`   Integration Tests: ${integrationTimeout}ms`);
      console.log(`   Performance Tests: ${performanceTimeout}ms`);

      // Verify timeout hierarchy
      expect(unitTimeout).toBeLessThan(integrationTimeout);
      expect(integrationTimeout).toBeLessThan(performanceTimeout);

      // Verify reasonable timeout values
      expect(unitTimeout).toBeGreaterThan(1000); // At least 1 second
      expect(performanceTimeout).toBeLessThan(600000); // Less than 10 minutes
    });

    it('should provide environment-specific concurrency limits', () => {
      const concurrencyLimits = testConfig.getConcurrencyLimits();

      console.log('\n🔄 Concurrency Configuration:');
      console.log(`   Max Operations: ${concurrencyLimits.maxOperations}`);
      console.log(`   Queue Size: ${concurrencyLimits.queueSize}`);

      expect(concurrencyLimits.maxOperations).toBeGreaterThan(0);
      expect(concurrencyLimits.queueSize).toBeGreaterThan(concurrencyLimits.maxOperations);
    });
  });

  describe('Performance Regression Detection', () => {
    it('should detect performance regressions', async () => {
      const benchmarks = testConfig.getEnvironmentAwareBenchmarks();
      const performanceHistory: number[] = [];

      // Run the same operation multiple times to establish baseline
      for (let i = 0; i < 5; i++) {
        const start = Date.now();
        await PerformanceOptimizer.getOptimizedTasks(testData, { status: 'pending' });
        const duration = Date.now() - start;
        performanceHistory.push(duration);
      }

      const averageTime = performanceHistory.reduce((a, b) => a + b, 0) / performanceHistory.length;
      const maxTime = Math.max(...performanceHistory);
      const minTime = Math.min(...performanceHistory);

      console.log('\n📊 Performance Consistency Analysis:');
      console.log(`   Average: ${averageTime.toFixed(2)}ms`);
      console.log(`   Min: ${minTime}ms`);
      console.log(`   Max: ${maxTime}ms`);
      console.log(`   Variance: ${maxTime - minTime}ms`);
      console.log(`   Benchmark limit: ${benchmarks.queryPerformance.simple}ms`);

      // Check for consistency (max shouldn't be more than 3x min)
      expect(maxTime).toBeLessThan(minTime * 3);

      // Check against benchmark
      expect(averageTime).toBeLessThan(benchmarks.queryPerformance.simple);

      // Detect potential regression (if max time is significantly higher than average)
      if (maxTime > averageTime * 2) {
        console.warn(
          `⚠️  Potential performance regression detected: max time (${maxTime}ms) is ${(maxTime / averageTime).toFixed(1)}x average`
        );
      }
    });
  });
});
