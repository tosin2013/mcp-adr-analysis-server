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
        performance: isCI ? 180000 : 60000, // 3 minutes for CI
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

  public updateConfig(partial: Partial<TestEnvironmentConfig>): void {
    this.config = { ...this.config, ...partial };
  }

  public registerTempDir(dirPath: string): void {
    this.resources.tempDirs.add(dirPath);
  }

  public registerFileHandle(handle: any): void {
    this.resources.fileHandles.add(handle);
  }

  public registerTimer(timer: NodeJS.Timeout): void {
    this.resources.timers.add(timer);
  }

  public registerInterval(interval: NodeJS.Timeout): void {
    this.resources.intervals.add(interval);
  }

  public registerProcess(process: any): void {
    this.resources.processes.add(process);
  }

  public recordMemoryUsage(): void {
    const memUsage = process.memoryUsage();
    this.resources.memoryUsage.push(memUsage.heapUsed);
    
    // Keep only last 100 measurements
    if (this.resources.memoryUsage.length > 100) {
      this.resources.memoryUsage = this.resources.memoryUsage.slice(-100);
    }
  }

  public getMemoryUsage(): number[] {
    return [...this.resources.memoryUsage];
  }

  public addCleanupCallback(callback: () => Promise<void>): void {
    this.cleanupCallbacks.push(callback);
  }

  public async cleanup(): Promise<void> {
    if (this.isShuttingDown) {
      return;
    }

    this.isShuttingDown = true;

    try {
      // Execute cleanup callbacks
      await Promise.all(
        this.cleanupCallbacks.map(async (callback) => {
          try {
            await callback();
          } catch (error) {
            console.error('Cleanup callback failed:', error);
          }
        })
      );

      // Clear timers
      for (const timer of this.resources.timers) {
        clearTimeout(timer);
      }
      this.resources.timers.clear();

      // Clear intervals
      for (const interval of this.resources.intervals) {
        clearInterval(interval);
      }
      this.resources.intervals.clear();

      // Close file handles
      for (const handle of this.resources.fileHandles) {
        try {
          if (handle && typeof handle.close === 'function') {
            await handle.close();
          }
        } catch (error) {
          console.error('Failed to close file handle:', error);
        }
      }
      this.resources.fileHandles.clear();

      // Kill processes
      for (const proc of this.resources.processes) {
        try {
          if (proc && typeof proc.kill === 'function') {
            proc.kill('SIGTERM');
          }
        } catch (error) {
          console.error('Failed to kill process:', error);
        }
      }
      this.resources.processes.clear();

      // Clean up temporary directories
      await this.cleanupTempDirs();

    } finally {
      this.isShuttingDown = false;
    }
  }

  private async cleanupTempDirs(): Promise<void> {
    const cleanupPromises = Array.from(this.resources.tempDirs).map(async (dirPath) => {
      try {
        await fs.rm(dirPath, { recursive: true, force: true });
      } catch (error) {
        console.error(`Failed to clean up temp directory ${dirPath}:`, error);
      }
    });

    await Promise.all(cleanupPromises);
    this.resources.tempDirs.clear();
  }

  private setupGlobalCleanup(): void {
    // Handle process exit events
    const exitHandler = async () => {
      await this.cleanup();
    };

    process.on('exit', () => {
      // Synchronous cleanup only
      this.resources.timers.forEach(timer => clearTimeout(timer));
      this.resources.intervals.forEach(interval => clearInterval(interval));
    });

    process.on('SIGINT', async () => {
      await exitHandler();
      process.exit(0);
    });

    process.on('SIGTERM', async () => {
      await exitHandler();
      process.exit(0);
    });

    process.on('uncaughtException', async (error) => {
      console.error('Uncaught exception:', error);
      await exitHandler();
      process.exit(1);
    });

    process.on('unhandledRejection', async (reason) => {
      console.error('Unhandled rejection:', reason);
      await exitHandler();
      process.exit(1);
    });
  }

  public getResourceStats(): ResourceTracker {
    return {
      tempDirs: new Set(this.resources.tempDirs),
      fileHandles: new Set(this.resources.fileHandles),
      timers: new Set(this.resources.timers),
      intervals: new Set(this.resources.intervals),
      processes: new Set(this.resources.processes),
      memoryUsage: [...this.resources.memoryUsage],
    };
  }

  public isResourceLimitExceeded(): boolean {
    const stats = this.getResourceStats();
    const config = this.config.resources;
    
    if (stats.tempDirs.size > config.maxTempDirs) return true;
    if (stats.fileHandles.size > config.maxFileHandles) return true;
    
    const currentMemoryMB = process.memoryUsage().heapUsed / 1024 / 1024;
    if (currentMemoryMB > config.maxMemoryMB) return true;
    
    return false;
  }

  public async waitForResourceCleanup(timeoutMs: number = 5000): Promise<void> {
    const startTime = Date.now();
    
    while (Date.now() - startTime < timeoutMs) {
      const stats = this.getResourceStats();
      
      if (
        stats.tempDirs.size === 0 &&
        stats.fileHandles.size === 0 &&
        stats.timers.size === 0 &&
        stats.intervals.size === 0 &&
        stats.processes.size === 0
      ) {
        return;
      }
      
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    throw new Error('Resource cleanup timed out');
  }
}

// Global instance
export const testInfrastructure = TestInfrastructure.getInstance();

// Enhanced timeout wrapper with infrastructure integration
export function withTimeout<T>(
  testType: 'unit' | 'integration' | 'performance',
  testFn: () => Promise<T>
): () => Promise<T> {
  return async () => {
    const infrastructure = TestInfrastructure.getInstance();
    const config = infrastructure.getConfig();
    const timeout = config.timeouts[testType];

    return new Promise<T>(async (resolve, reject) => {
      const timeoutId = setTimeout(() => {
        reject(new Error(`Test timed out after ${timeout}ms`));
      }, timeout);

      infrastructure.registerTimer(timeoutId);

      try {
        const result = await testFn();
        clearTimeout(timeoutId);
        resolve(result);
      } catch (error) {
        clearTimeout(timeoutId);
        reject(error);
      }
    });
  };
}

// Resource tracking wrapper
export function withResourceTracking<T>(
  testFn: () => Promise<T>
): () => Promise<T> {
  return async () => {
    const infrastructure = TestInfrastructure.getInstance();
    
    // Record initial state
    infrastructure.recordMemoryUsage();
    const initialStats = infrastructure.getResourceStats();
    
    try {
      const result = await testFn();
      
      // Check for resource leaks
      const finalStats = infrastructure.getResourceStats();
      
      if (infrastructure.isResourceLimitExceeded()) {
        console.warn('Resource limits exceeded during test');
      }
      
      return result;
    } finally {
      infrastructure.recordMemoryUsage();
    }
  };
}

// Temp directory helper with automatic tracking
export async function createTempDir(prefix: string = 'test-'): Promise<string> {
  const infrastructure = TestInfrastructure.getInstance();
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), prefix));
  infrastructure.registerTempDir(tempDir);
  return tempDir;
}

// Enhanced file operations with tracking
export async function createTempFile(
  content: string,
  options?: { suffix?: string; prefix?: string }
): Promise<string> {
  const infrastructure = TestInfrastructure.getInstance();
  const prefix = options?.prefix || 'test-file-';
  const suffix = options?.suffix || '.tmp';
  
  const tempDir = await createTempDir();
  const fileName = `${prefix}${Date.now()}${suffix}`;
  const filePath = path.join(tempDir, fileName);
  
  await fs.writeFile(filePath, content, 'utf8');
  
  return filePath;
}

// Performance monitoring helper
export function createPerformanceMonitor() {
  const infrastructure = TestInfrastructure.getInstance();
  const startTime = process.hrtime.bigint();
  
  infrastructure.recordMemoryUsage();
  
  return {
    end: () => {
      const endTime = process.hrtime.bigint();
      const duration = Number(endTime - startTime) / 1000000; // Convert to milliseconds
      
      infrastructure.recordMemoryUsage();
      
      return {
        duration,
        memoryUsage: infrastructure.getMemoryUsage(),
      };
    },
  };
}

// Test environment detection
export function getTestEnvironment() {
  return {
    isCI: process.env.CI === 'true',
    isCoverage: process.env.NODE_ENV === 'test' && process.argv.includes('--coverage'),
    isDebug: process.env.NODE_ENV === 'test' && process.argv.includes('--debug'),
    nodeVersion: process.version,
    platform: process.platform,
  };
}

// Async operation helpers for testing
export async function waitForCondition(
  condition: () => boolean | Promise<boolean>,
  timeoutMs: number = 5000,
  intervalMs: number = 100
): Promise<void> {
  const infrastructure = TestInfrastructure.getInstance();
  const startTime = Date.now();
  
  return new Promise<void>(async (resolve, reject) => {
    const checkCondition = async () => {
      try {
        const result = await condition();
        
        if (result) {
          resolve();
          return;
        }
        
        if (Date.now() - startTime >= timeoutMs) {
          reject(new Error(`Condition not met within ${timeoutMs}ms`));
          return;
        }
        
        const timeoutId = setTimeout(checkCondition, intervalMs);
        infrastructure.registerTimer(timeoutId);
        
      } catch (error) {
        reject(error);
      }
    };
    
    await checkCondition();
  });
}
