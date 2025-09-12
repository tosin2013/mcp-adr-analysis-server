/**
 * Enhanced Test Infrastructure
 * Provides resource tracking, cleanup, and environment management for tests
 */

import { jest } from '@jest/globals';
import * as fs from 'fs/promises';
import * as path from 'path';
import * as os from 'os';

export interface TestEnvironmentConfig {
  timeouts: {
    unit: number;
    integration: number;
    performance: number;
    cleanup: number;
  };
  cleanup: {
    gracefulShutdown: boolean;
    resourceTracking: boolean;
    forceCleanupTimeout: number;
  };
  concurrency: {
    maxParallel: number;
    queueSize: number;
  };
  resources: {
    maxTempDirs: number;
    maxFileHandles: number;
    maxMemoryMB: number;
  };
}

export interface ResourceTracker {
  tempDirs: Set<string>;
  fileHandles: Set<any>;
  timers: Set<NodeJS.Timeout>;
  intervals: Set<NodeJS.Timeout>;
  processes: Set<any>;
  memoryUsage: number[];
}

export class TestInfrastructure {
  private static instance: TestInfrastructure;
  private config: TestEnvironmentConfig;
  private resources: ResourceTracker;
  private cleanupCallbacks: Array<() => Promise<void>>;
  private isShuttingDown: boolean = false;
  private isCI: boolean = process.env.CI === 'true' || process.env.NODE_ENV === 'ci';

  private constructor() {
    this.config = this.getDefaultConfig();
    this.resources = {
      tempDirs: new Set(),
      fileHandles: new Set(),
      timers: new Set(),
      intervals: new Set(),
      processes: new Set(),
      memoryUsage: [],
    };
    this.cleanupCallbacks = [];
    this.setupGlobalCleanup();
  }

  public static getInstance(): TestInfrastructure {
    if (!TestInfrastructure.instance) {
      TestInfrastructure.instance = new TestInfrastructure();
    }
    return TestInfrastructure.instance;
  }

  private getDefaultConfig(): TestEnvironmentConfig {
    const isCI = process.env.CI === 'true';
    const isCoverage = process.env.NODE_ENV === 'test' && process.argv.includes('--coverage');

    return {
      timeouts: {
        unit: isCI ? 15000 : 10000,
        integration: isCI ? 45000 : 30000,
        performance: isCI ? 120000 : 60000,
        cleanup: isCI ? 10000 : 5000,
      },
      cleanup: {
        gracefulShutdown: true,
        resourceTracking: true,
        forceCleanupTimeout: 5000,
      },
      concurrency: {
        maxParallel: isCI ? 2 : 4,
        queueSize: 100,
      },
      resources: {
        maxTempDirs: 50,
        maxFileHandles: 100,
        maxMemoryMB: isCoverage ? 1024 : 512,
      },
    };
  }

  public getConfig(): TestEnvironmentConfig {
    return { ...this.config };
  }

  public updateConfig(updates: Partial<TestEnvironmentConfig>): void {
    this.config = { ...this.config, ...updates };
  }

  public getTimeoutForTestType(testType: 'unit' | 'integration' | 'performance'): number {
    return this.config.timeouts[testType];
  }

  // Resource tracking methods
  public async createTempDir(prefix: string = 'test-'): Promise<string> {
    if (this.resources.tempDirs.size >= this.config.resources.maxTempDirs) {
      throw new Error(`Maximum temp directories (${this.config.resources.maxTempDirs}) exceeded`);
    }

    const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), prefix));
    this.resources.tempDirs.add(tempDir);

    // Add cleanup callback
    this.addCleanupCallback(async () => {
      await this.cleanupTempDir(tempDir);
    });

    return tempDir;
  }

  public trackTimer(timer: NodeJS.Timeout): void {
    this.resources.timers.add(timer);
  }

  public trackInterval(interval: NodeJS.Timeout): void {
    this.resources.intervals.add(interval);
  }

  public trackFileHandle(handle: any): void {
    if (this.resources.fileHandles.size >= this.config.resources.maxFileHandles) {
      throw new Error(`Maximum file handles (${this.config.resources.maxFileHandles}) exceeded`);
    }
    this.resources.fileHandles.add(handle);
  }

  public trackProcess(process: any): void {
    this.resources.processes.add(process);
  }

  public addCleanupCallback(callback: () => Promise<void>): void {
    this.cleanupCallbacks.push(callback);
  }

  // Memory monitoring - CI-safe version
  public recordMemoryUsage(): void {
    // Skip memory monitoring in CI to avoid uv_resident_set_memory errors
    if (this.isCI) {
      return;
    }

    try {
      const usage = process.memoryUsage();
      const usageMB = usage.heapUsed / 1024 / 1024;
      this.resources.memoryUsage.push(usageMB);

      if (usageMB > this.config.resources.maxMemoryMB) {
        console.warn(
          `Memory usage (${usageMB.toFixed(2)}MB) exceeds limit (${this.config.resources.maxMemoryMB}MB)`
        );
      }
    } catch (error) {
      // Silently ignore memory monitoring errors in CI
    }
  }

  public getMemoryStats(): { current: number; peak: number; average: number } {
    // Return default values in CI to avoid uv_resident_set_memory errors
    if (this.isCI) {
      return { current: 0, peak: 0, average: 0 };
    }

    try {
      const current = process.memoryUsage().heapUsed / 1024 / 1024;
      const peak = Math.max(...this.resources.memoryUsage, current);
      const average =
        this.resources.memoryUsage.length > 0
          ? this.resources.memoryUsage.reduce((a, b) => a + b, 0) /
            this.resources.memoryUsage.length
          : current;

      return { current, peak, average };
    } catch (error) {
      // Return default values if memory monitoring fails
      return { current: 0, peak: 0, average: 0 };
    }
  }

  // Cleanup methods
  private async cleanupTempDir(tempDir: string): Promise<void> {
    try {
      if (this.resources.tempDirs.has(tempDir)) {
        await fs.rm(tempDir, { recursive: true, force: true });
        this.resources.tempDirs.delete(tempDir);
      }
    } catch (error) {
      console.warn(`Failed to cleanup temp directory ${tempDir}:`, error);
    }
  }

  private async cleanupTimers(): Promise<void> {
    // Clear all timers
    const timers = Array.from(this.resources.timers);
    for (const timer of timers) {
      try {
        clearTimeout(timer);
      } catch (error) {
        // Ignore errors when clearing timers
      }
    }
    this.resources.timers.clear();

    // Clear all intervals
    const intervals = Array.from(this.resources.intervals);
    for (const interval of intervals) {
      try {
        clearInterval(interval);
      } catch (error) {
        // Ignore errors when clearing intervals
      }
    }
    this.resources.intervals.clear();
  }

  private async cleanupFileHandles(): Promise<void> {
    for (const handle of this.resources.fileHandles) {
      try {
        if (handle && typeof handle.close === 'function') {
          await handle.close();
        }
      } catch (error) {
        console.warn('Failed to close file handle:', error);
      }
    }
    this.resources.fileHandles.clear();
  }

  private async cleanupProcesses(): Promise<void> {
    for (const proc of this.resources.processes) {
      try {
        if (proc && typeof proc.kill === 'function') {
          proc.kill('SIGTERM');
        }
      } catch (error) {
        console.warn('Failed to terminate process:', error);
      }
    }
    this.resources.processes.clear();
  }

  public async cleanup(): Promise<void> {
    if (this.isShuttingDown) {
      return;
    }

    this.isShuttingDown = true;

    try {
      // Run custom cleanup callbacks first
      const cleanupPromises = this.cleanupCallbacks.map(callback =>
        Promise.race([
          callback(),
          new Promise<void>((_, reject) =>
            setTimeout(
              () => reject(new Error('Cleanup callback timeout')),
              this.config.cleanup.forceCleanupTimeout
            )
          ),
        ]).catch(error => {
          console.warn('Cleanup callback failed:', error);
        })
      );

      await Promise.all(cleanupPromises);

      // Clean up tracked resources
      await Promise.all([this.cleanupTimers(), this.cleanupFileHandles(), this.cleanupProcesses()]);

      // Clean up temp directories last
      const tempDirCleanup = Array.from(this.resources.tempDirs).map(dir =>
        this.cleanupTempDir(dir)
      );
      await Promise.all(tempDirCleanup);

      // Clear callbacks
      this.cleanupCallbacks.length = 0;
    } catch (error) {
      console.error('Error during cleanup:', error);
    } finally {
      this.isShuttingDown = false;
    }
  }

  public async forceCleanup(): Promise<void> {
    // Force cleanup with shorter timeout
    const originalTimeout = this.config.cleanup.forceCleanupTimeout;
    this.config.cleanup.forceCleanupTimeout = 1000;

    try {
      await this.cleanup();
    } finally {
      this.config.cleanup.forceCleanupTimeout = originalTimeout;
    }
  }

  public getResourceStatus(): {
    tempDirs: number;
    fileHandles: number;
    timers: number;
    intervals: number;
    processes: number;
    memoryMB: number;
  } {
    // CI-safe memory usage
    let memoryMB = 0;
    if (!this.isCI) {
      try {
        memoryMB = process.memoryUsage().heapUsed / 1024 / 1024;
      } catch (error) {
        // Silently ignore memory access errors
        memoryMB = 0;
      }
    }

    return {
      tempDirs: this.resources.tempDirs.size,
      fileHandles: this.resources.fileHandles.size,
      timers: this.resources.timers.size,
      intervals: this.resources.intervals.size,
      processes: this.resources.processes.size,
      memoryMB,
    };
  }

  private setupGlobalCleanup(): void {
    // Handle process termination
    const handleExit = () => {
      if (this.config.cleanup.gracefulShutdown && !this.isShuttingDown) {
        // Synchronous cleanup only for process exit
        try {
          for (const timer of this.resources.timers) {
            clearTimeout(timer);
          }
          for (const interval of this.resources.intervals) {
            clearInterval(interval);
          }
        } catch (error) {
          // Ignore cleanup errors during exit
        }
      }
    };

    process.on('exit', handleExit);
    process.on('SIGINT', handleExit);
    process.on('SIGTERM', handleExit);

    // Don't handle uncaught exceptions in test environment
    // Let Jest handle them properly
    if (process.env.NODE_ENV !== 'test') {
      process.on('uncaughtException', async error => {
        console.error('Uncaught exception:', error);
        await this.forceCleanup();
        process.exit(1);
      });

      process.on('unhandledRejection', async reason => {
        console.error('Unhandled rejection:', reason);
        await this.forceCleanup();
        process.exit(1);
      });
    }
  }
}

// Test helper functions
export function withTestInfrastructure<T>(
  testFn: (infrastructure: TestInfrastructure) => Promise<T>
): () => Promise<T> {
  return async () => {
    const infrastructure = TestInfrastructure.getInstance();

    try {
      return await testFn(infrastructure);
    } finally {
      await infrastructure.cleanup();
    }
  };
}

export function withTimeout<T>(
  testType: 'unit' | 'integration' | 'performance',
  testFn: () => Promise<T>
): () => Promise<T> {
  return async () => {
    const infrastructure = TestInfrastructure.getInstance();
    const timeout = infrastructure.getTimeoutForTestType(testType);

    return Promise.race([
      testFn(),
      new Promise<T>((_, reject) => {
        const timer = setTimeout(() => {
          reject(new Error(`Test timed out after ${timeout}ms`));
        }, timeout);
        infrastructure.trackTimer(timer);
      }),
    ]);
  };
}

export function withResourceTracking<T>(
  testFn: (tracker: ResourceTracker) => Promise<T>
): () => Promise<T> {
  return async () => {
    const infrastructure = TestInfrastructure.getInstance();
    const initialStatus = infrastructure.getResourceStatus();

    try {
      const result = await testFn(infrastructure['resources']);
      return result;
    } finally {
      const finalStatus = infrastructure.getResourceStatus();

      // Check for resource leaks
      if (finalStatus.tempDirs > initialStatus.tempDirs + 5) {
        console.warn(
          `Potential temp directory leak: ${finalStatus.tempDirs - initialStatus.tempDirs} directories`
        );
      }

      if (finalStatus.fileHandles > initialStatus.fileHandles + 10) {
        console.warn(
          `Potential file handle leak: ${finalStatus.fileHandles - initialStatus.fileHandles} handles`
        );
      }

      await infrastructure.cleanup();
    }
  };
}

// Export singleton instance
export const testInfrastructure = TestInfrastructure.getInstance();
