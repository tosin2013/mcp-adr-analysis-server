/**
 * Test Configuration Utilities
 * Provides centralized configuration for different test environments and types
 */

import { testInfrastructure } from './test-infrastructure.js';

export interface TestConfig {
  timeouts: {
    unit: number;
    integration: number;
    performance: number;
  };
  performance: {
    maxMemoryMB: number;
    maxDurationMs: {
      unit: number;
      integration: number;
      performance: number;
    };
    benchmarks: {
      taskCreation: {
        small: number; // tasks per second for < 100 tasks
        medium: number; // tasks per second for 100-1000 tasks
        large: number; // tasks per second for > 1000 tasks
      };
      queryPerformance: {
        simple: number; // ms for basic queries
        complex: number; // ms for complex filtering/sorting
        pagination: number; // ms for paginated queries
      };
      memoryLimits: {
        baseline: number; // MB baseline memory usage
        perTask: number; // MB per 1000 tasks
        maxGrowth: number; // Maximum memory growth multiplier
      };
    };
    environmentFactors: {
      ci: number; // Performance multiplier for CI environments
      coverage: number; // Performance multiplier when running with coverage
      debug: number; // Performance multiplier in debug mode
      lowMemory: number; // Performance multiplier for low memory systems
    };
  };
  concurrency: {
    maxOperations: number;
    queueSize: number;
  };
  cleanup: {
    enabled: boolean;
    timeout: number;
    forceTimeout: number;
  };
}

export class TestConfigManager {
  private static instance: TestConfigManager;
  private config: TestConfig;

  private constructor() {
    this.config = this.createDefaultConfig();
  }

  public static getInstance(): TestConfigManager {
    if (!TestConfigManager.instance) {
      TestConfigManager.instance = new TestConfigManager();
    }
    return TestConfigManager.instance;
  }

  private createDefaultConfig(): TestConfig {
    const isCI = process.env.CI === 'true';
    const isCoverage = process.argv.includes('--coverage');
    const isDebug = process.env.NODE_ENV === 'development';
    const isLowMemory = this.detectLowMemoryEnvironment();

    return {
      timeouts: {
        unit: isCI ? 15000 : isDebug ? 30000 : 10000,
        integration: isCI ? 60000 : isDebug ? 120000 : 30000,
        performance: isCI ? 180000 : isDebug ? 300000 : 120000,
      },
      performance: {
        maxMemoryMB: isCoverage ? 1024 : isCI ? 512 : 256,
        maxDurationMs: {
          unit: isCI ? 5000 : 2000,
          integration: isCI ? 30000 : 15000,
          performance: isCI ? 120000 : 60000,
        },
        benchmarks: {
          taskCreation: {
            small: isCI ? 50 : 100, // tasks/sec for < 100 tasks
            medium: isCI ? 30 : 60, // tasks/sec for 100-1000 tasks
            large: isCI ? 15 : 30, // tasks/sec for > 1000 tasks
          },
          queryPerformance: {
            simple: isCI ? 100 : 50, // ms for basic queries
            complex: isCI ? 500 : 250, // ms for complex filtering/sorting
            pagination: isCI ? 200 : 100, // ms for paginated queries
          },
          memoryLimits: {
            baseline: 50, // MB baseline memory usage
            perTask: 0.1, // MB per 1000 tasks
            maxGrowth: isLowMemory ? 2 : 3, // Maximum memory growth multiplier
          },
        },
        environmentFactors: {
          ci: 2.0, // CI environments are typically slower
          coverage: 1.5, // Coverage adds overhead
          debug: 1.3, // Debug mode adds overhead
          lowMemory: 1.8, // Low memory systems are slower
        },
      },
      concurrency: {
        maxOperations: isCI ? 50 : 100,
        queueSize: isCI ? 100 : 200,
      },
      cleanup: {
        enabled: true,
        timeout: isCI ? 10000 : 5000,
        forceTimeout: 2000,
      },
    };
  }

  private detectLowMemoryEnvironment(): boolean {
    try {
      const totalMemory = require('os').totalmem();
      const totalMemoryGB = totalMemory / (1024 * 1024 * 1024);
      return totalMemoryGB < 4; // Consider < 4GB as low memory
    } catch {
      return false;
    }
  }

  public getConfig(): TestConfig {
    return { ...this.config };
  }

  public updateConfig(updates: Partial<TestConfig>): void {
    this.config = { ...this.config, ...updates };

    // Update test infrastructure config
    testInfrastructure.updateConfig({
      timeouts: this.config.timeouts,
      cleanup: {
        gracefulShutdown: this.config.cleanup.enabled,
        resourceTracking: true,
        forceCleanupTimeout: this.config.cleanup.forceTimeout,
      },
      concurrency: {
        maxParallel: Math.min(this.config.concurrency.maxOperations / 10, 10),
        queueSize: this.config.concurrency.queueSize,
      },
      resources: {
        maxTempDirs: 50,
        maxFileHandles: 100,
        maxMemoryMB: this.config.performance.maxMemoryMB,
      },
    });
  }

  public getTimeoutForTestType(testType: 'unit' | 'integration' | 'performance'): number {
    return this.config.timeouts[testType];
  }

  public getPerformanceLimits(testType: 'unit' | 'integration' | 'performance'): {
    maxDurationMs: number;
    maxMemoryMB: number;
  } {
    return {
      maxDurationMs: this.config.performance.maxDurationMs[testType],
      maxMemoryMB: this.config.performance.maxMemoryMB,
    };
  }

  public getEnvironmentAwareBenchmarks(): {
    taskCreation: { small: number; medium: number; large: number };
    queryPerformance: { simple: number; complex: number; pagination: number };
    memoryLimits: { baseline: number; perTask: number; maxGrowth: number };
    adjustedFor: string[];
  } {
    const benchmarks = { ...this.config.performance.benchmarks };
    const factors = this.config.performance.environmentFactors;
    const adjustments: string[] = [];

    // Apply environment-specific adjustments
    let performanceMultiplier = 1.0;

    if (this.isCI()) {
      performanceMultiplier *= factors.ci;
      adjustments.push('CI environment');
    }

    if (this.isCoverageRun()) {
      performanceMultiplier *= factors.coverage;
      adjustments.push('coverage analysis');
    }

    if (this.isDebugMode()) {
      performanceMultiplier *= factors.debug;
      adjustments.push('debug mode');
    }

    if (this.detectLowMemoryEnvironment()) {
      performanceMultiplier *= factors.lowMemory;
      adjustments.push('low memory system');
    }

    // Adjust task creation benchmarks (lower is slower)
    benchmarks.taskCreation.small = Math.round(
      benchmarks.taskCreation.small / performanceMultiplier
    );
    benchmarks.taskCreation.medium = Math.round(
      benchmarks.taskCreation.medium / performanceMultiplier
    );
    benchmarks.taskCreation.large = Math.round(
      benchmarks.taskCreation.large / performanceMultiplier
    );

    // Adjust query performance benchmarks (higher is slower)
    benchmarks.queryPerformance.simple = Math.round(
      benchmarks.queryPerformance.simple * performanceMultiplier
    );
    benchmarks.queryPerformance.complex = Math.round(
      benchmarks.queryPerformance.complex * performanceMultiplier
    );
    benchmarks.queryPerformance.pagination = Math.round(
      benchmarks.queryPerformance.pagination * performanceMultiplier
    );

    // Adjust memory limits
    benchmarks.memoryLimits.maxGrowth =
      benchmarks.memoryLimits.maxGrowth * Math.min(performanceMultiplier, 2.0);

    return {
      ...benchmarks,
      adjustedFor: adjustments,
    };
  }

  private detectLowMemoryEnvironment(): boolean {
    try {
      const totalMemory = require('os').totalmem();
      const totalMemoryGB = totalMemory / (1024 * 1024 * 1024);
      return totalMemoryGB < 4; // Consider < 4GB as low memory
    } catch {
      return false;
    }
  }

  public getConcurrencyLimits(): { maxOperations: number; queueSize: number } {
    return {
      maxOperations: this.config.concurrency.maxOperations,
      queueSize: this.config.concurrency.queueSize,
    };
  }

  public isCI(): boolean {
    return process.env.CI === 'true';
  }

  public isCoverageRun(): boolean {
    return process.argv.includes('--coverage');
  }

  public isDebugMode(): boolean {
    return process.env.NODE_ENV === 'development' || process.env.DEBUG === 'true';
  }

  public getEnvironmentInfo(): {
    isCI: boolean;
    isCoverage: boolean;
    isDebug: boolean;
    nodeVersion: string;
    platform: string;
  } {
    return {
      isCI: this.isCI(),
      isCoverage: this.isCoverageRun(),
      isDebug: this.isDebugMode(),
      nodeVersion: process.version,
      platform: process.platform,
    };
  }
}

// Test environment detection utilities
export function detectTestType(): 'unit' | 'integration' | 'performance' {
  const testFile = expect.getState().testPath || '';

  if (testFile.includes('integration')) {
    return 'integration';
  }

  if (testFile.includes('performance') || process.env.MCP_ADR_PERFORMANCE_TEST === 'true') {
    return 'performance';
  }

  return 'unit';
}

export function getTestTypeConfig(): {
  timeout: number;
  maxDuration: number;
  maxMemory: number;
} {
  const configManager = TestConfigManager.getInstance();
  const testType = detectTestType();
  const limits = configManager.getPerformanceLimits(testType);

  return {
    timeout: configManager.getTimeoutForTestType(testType),
    maxDuration: limits.maxDurationMs,
    maxMemory: limits.maxMemoryMB,
  };
}

// Configuration presets for different scenarios
export const TEST_PRESETS = {
  FAST: {
    timeouts: { unit: 5000, integration: 15000, performance: 30000 },
    performance: {
      maxMemoryMB: 128,
      maxDurationMs: { unit: 1000, integration: 5000, performance: 15000 },
      benchmarks: {
        taskCreation: { small: 200, medium: 100, large: 50 },
        queryPerformance: { simple: 25, complex: 100, pagination: 50 },
        memoryLimits: { baseline: 30, perTask: 0.05, maxGrowth: 2 },
      },
      environmentFactors: { ci: 1.5, coverage: 1.2, debug: 1.1, lowMemory: 1.3 },
    },
  },

  THOROUGH: {
    timeouts: { unit: 30000, integration: 120000, performance: 300000 },
    performance: {
      maxMemoryMB: 1024,
      maxDurationMs: { unit: 10000, integration: 60000, performance: 180000 },
      benchmarks: {
        taskCreation: { small: 150, medium: 75, large: 25 },
        queryPerformance: { simple: 50, complex: 200, pagination: 100 },
        memoryLimits: { baseline: 50, perTask: 0.1, maxGrowth: 3 },
      },
      environmentFactors: { ci: 2.0, coverage: 1.5, debug: 1.3, lowMemory: 1.8 },
    },
  },

  CI: {
    timeouts: { unit: 15000, integration: 60000, performance: 180000 },
    performance: {
      maxMemoryMB: 512,
      maxDurationMs: { unit: 5000, integration: 30000, performance: 120000 },
      benchmarks: {
        taskCreation: { small: 100, medium: 50, large: 20 },
        queryPerformance: { simple: 75, complex: 300, pagination: 150 },
        memoryLimits: { baseline: 40, perTask: 0.08, maxGrowth: 2.5 },
      },
      environmentFactors: { ci: 2.5, coverage: 2.0, debug: 1.5, lowMemory: 2.0 },
    },
  },

  STRESS: {
    timeouts: { unit: 60000, integration: 300000, performance: 600000 },
    performance: {
      maxMemoryMB: 2048,
      maxDurationMs: { unit: 20000, integration: 120000, performance: 300000 },
      benchmarks: {
        taskCreation: { small: 50, medium: 25, large: 10 },
        queryPerformance: { simple: 100, complex: 500, pagination: 250 },
        memoryLimits: { baseline: 100, perTask: 0.2, maxGrowth: 5 },
      },
      environmentFactors: { ci: 3.0, coverage: 2.5, debug: 2.0, lowMemory: 3.0 },
    },
  },
} as const;

export function applyTestPreset(preset: keyof typeof TEST_PRESETS): void {
  const configManager = TestConfigManager.getInstance();
  const presetConfig = TEST_PRESETS[preset];

  configManager.updateConfig({
    timeouts: presetConfig.timeouts,
    performance: presetConfig.performance,
  });
}

// Progress monitoring utilities
export interface ProgressMonitor {
  start(totalSteps: number, description?: string): void;
  step(stepDescription?: string): void;
  update(currentStep: number, stepDescription?: string): void;
  finish(summary?: string): void;
  getProgress(): { current: number; total: number; percentage: number; description?: string };
}

export class TestProgressMonitor implements ProgressMonitor {
  private currentStep: number = 0;
  private totalSteps: number = 0;
  private description?: string;
  private startTime: number = 0;
  private stepTimes: number[] = [];
  private verbose: boolean;

  constructor(verbose: boolean = false) {
    this.verbose = verbose || process.env.TEST_VERBOSE === 'true';
  }

  start(totalSteps: number, description?: string): void {
    this.currentStep = 0;
    this.totalSteps = totalSteps;
    this.description = description;
    this.startTime = Date.now();
    this.stepTimes = [];

    if (this.verbose) {
      console.log(`\n🚀 Starting: ${description || 'Test operation'} (${totalSteps} steps)`);
    }
  }

  step(stepDescription?: string): void {
    this.currentStep++;
    this.stepTimes.push(Date.now());

    if (this.verbose) {
      const percentage = Math.round((this.currentStep / this.totalSteps) * 100);
      const elapsed = Date.now() - this.startTime;
      const avgStepTime = elapsed / this.currentStep;
      const estimatedTotal = avgStepTime * this.totalSteps;
      const remaining = Math.max(0, estimatedTotal - elapsed);

      console.log(
        `  ⏳ Step ${this.currentStep}/${this.totalSteps} (${percentage}%) - ${stepDescription || 'Processing'} - ETA: ${Math.round(remaining)}ms`
      );
    }
  }

  update(currentStep: number, stepDescription?: string): void {
    this.currentStep = currentStep;
    this.stepTimes[currentStep - 1] = Date.now();

    if (this.verbose) {
      const percentage = Math.round((currentStep / this.totalSteps) * 100);
      console.log(
        `  📊 Progress: ${currentStep}/${this.totalSteps} (${percentage}%) - ${stepDescription || 'Processing'}`
      );
    }
  }

  finish(summary?: string): void {
    const totalTime = Date.now() - this.startTime;
    const avgStepTime = this.stepTimes.length > 0 ? totalTime / this.stepTimes.length : 0;

    if (this.verbose) {
      console.log(`\n✅ Completed: ${this.description || 'Test operation'}`);
      console.log(`   📈 Total time: ${totalTime}ms`);
      console.log(`   ⚡ Average step time: ${Math.round(avgStepTime)}ms`);
      if (summary) {
        console.log(`   📋 Summary: ${summary}`);
      }
    }
  }

  getProgress(): { current: number; total: number; percentage: number; description?: string } {
    return {
      current: this.currentStep,
      total: this.totalSteps,
      percentage: this.totalSteps > 0 ? (this.currentStep / this.totalSteps) * 100 : 0,
      description: this.description,
    };
  }
}

// Performance test helpers
export function createPerformanceTest<T>(
  testName: string,
  testFn: (monitor: ProgressMonitor) => Promise<T>,
  options: {
    expectedDuration?: number;
    maxMemoryMB?: number;
    steps?: number;
    verbose?: boolean;
  } = {}
): () => Promise<T> {
  return async () => {
    const configManager = TestConfigManager.getInstance();
    const benchmarks = configManager.getEnvironmentAwareBenchmarks();
    const monitor = new TestProgressMonitor(options.verbose);

    const initialMemory = process.memoryUsage().heapUsed / 1024 / 1024;
    const startTime = Date.now();

    if (options.steps) {
      monitor.start(options.steps, testName);
    }

    try {
      const result = await testFn(monitor);
      const endTime = Date.now();
      const duration = endTime - startTime;
      const finalMemory = process.memoryUsage().heapUsed / 1024 / 1024;
      const memoryGrowth = finalMemory - initialMemory;

      // Check performance expectations
      if (options.expectedDuration && duration > options.expectedDuration) {
        const adjustments = benchmarks.adjustedFor;
        console.warn(
          `⚠️  Performance warning: ${testName} took ${duration}ms, expected ${options.expectedDuration}ms` +
            (adjustments.length > 0 ? ` (adjusted for: ${adjustments.join(', ')})` : '')
        );
      }

      if (options.maxMemoryMB && memoryGrowth > options.maxMemoryMB) {
        console.warn(
          `⚠️  Memory warning: ${testName} used ${memoryGrowth.toFixed(2)}MB, expected max ${options.maxMemoryMB}MB`
        );
      }

      if (options.steps) {
        monitor.finish(`Duration: ${duration}ms, Memory: ${memoryGrowth.toFixed(2)}MB`);
      }

      return result;
    } catch (error) {
      if (options.steps) {
        monitor.finish(`Failed after ${Date.now() - startTime}ms`);
      }
      throw error;
    }
  };
}

// Export singleton instance
export const testConfig = TestConfigManager.getInstance();
