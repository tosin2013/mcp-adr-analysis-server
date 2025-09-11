/**
 * Tests for Enhanced Test Infrastructure
 */

import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import {
  TestInfrastructure,
  withTestInfrastructure,
  withTimeout,
  withResourceTracking,
} from './test-infrastructure.js';
import * as fs from 'fs/promises';
import * as path from 'path';

describe('TestInfrastructure', () => {
  let infrastructure: TestInfrastructure;

  beforeEach(() => {
    infrastructure = TestInfrastructure.getInstance();
  });

  afterEach(async () => {
    await infrastructure.cleanup();
  });

  describe('Configuration Management', () => {
    it('should provide default configuration', () => {
      const config = infrastructure.getConfig();

      expect(config).toHaveProperty('timeouts');
      expect(config).toHaveProperty('cleanup');
      expect(config).toHaveProperty('concurrency');
      expect(config).toHaveProperty('resources');

      expect(config.timeouts.unit).toBeGreaterThan(0);
      expect(config.timeouts.integration).toBeGreaterThan(config.timeouts.unit);
      expect(config.timeouts.performance).toBeGreaterThan(config.timeouts.integration);
    });

    it('should allow configuration updates', () => {
      const originalConfig = infrastructure.getConfig();

      infrastructure.updateConfig({
        timeouts: { unit: 5000, integration: 15000, performance: 30000 },
      });

      const updatedConfig = infrastructure.getConfig();
      expect(updatedConfig.timeouts.unit).toBe(5000);
      expect(updatedConfig.timeouts.integration).toBe(15000);
      expect(updatedConfig.timeouts.performance).toBe(30000);

      // Restore original config
      infrastructure.updateConfig(originalConfig);
    });

    it('should provide appropriate timeouts for different test types', () => {
      const unitTimeout = infrastructure.getTimeoutForTestType('unit');
      const integrationTimeout = infrastructure.getTimeoutForTestType('integration');
      const performanceTimeout = infrastructure.getTimeoutForTestType('performance');

      expect(unitTimeout).toBeLessThan(integrationTimeout);
      expect(integrationTimeout).toBeLessThan(performanceTimeout);
    });
  });

  describe('Resource Tracking', () => {
    it('should track temporary directories', async () => {
      const initialStatus = infrastructure.getResourceStatus();

      const tempDir1 = await infrastructure.createTempDir('test-dir-1-');
      const tempDir2 = await infrastructure.createTempDir('test-dir-2-');

      expect(tempDir1).toBeTruthy();
      expect(tempDir2).toBeTruthy();
      expect(tempDir1).not.toBe(tempDir2);

      const statusAfterCreation = infrastructure.getResourceStatus();
      expect(statusAfterCreation.tempDirs).toBe(initialStatus.tempDirs + 2);

      // Verify directories exist
      await expect(fs.access(tempDir1)).resolves.toBeUndefined();
      await expect(fs.access(tempDir2)).resolves.toBeUndefined();
    });

    it('should track timers and intervals', () => {
      const initialStatus = infrastructure.getResourceStatus();

      const timer = setTimeout(() => {}, 1000);
      infrastructure.trackTimer(timer);

      const interval = setInterval(() => {}, 1000);
      infrastructure.trackInterval(interval);

      const statusAfterTracking = infrastructure.getResourceStatus();
      expect(statusAfterTracking.timers).toBe(initialStatus.timers + 1);
      expect(statusAfterTracking.intervals).toBe(initialStatus.intervals + 1);

      // Clean up manually for this test
      clearTimeout(timer);
      clearInterval(interval);
    });

    it('should enforce resource limits', async () => {
      // Update config to have very low limits for testing
      infrastructure.updateConfig({
        resources: { maxTempDirs: 2, maxFileHandles: 2, maxMemoryMB: 1024 },
      });

      // Create directories up to limit
      await infrastructure.createTempDir('limit-test-1-');
      await infrastructure.createTempDir('limit-test-2-');

      // Third directory should fail
      await expect(infrastructure.createTempDir('limit-test-3-')).rejects.toThrow(
        /Maximum temp directories/
      );
    });

    it('should record memory usage', () => {
      const initialMemStats = infrastructure.getMemoryStats();

      infrastructure.recordMemoryUsage();
      infrastructure.recordMemoryUsage();

      const finalMemStats = infrastructure.getMemoryStats();

      expect(finalMemStats.current).toBeGreaterThan(0);
      expect(finalMemStats.peak).toBeGreaterThanOrEqual(finalMemStats.current);
      expect(finalMemStats.average).toBeGreaterThan(0);
    });
  });

  describe('Cleanup Operations', () => {
    it('should clean up temporary directories', async () => {
      const tempDir = await infrastructure.createTempDir('cleanup-test-');

      // Create a file in the temp directory
      const testFile = path.join(tempDir, 'test.txt');
      await fs.writeFile(testFile, 'test content');

      // Verify directory and file exist
      await expect(fs.access(tempDir)).resolves.toBeUndefined();
      await expect(fs.access(testFile)).resolves.toBeUndefined();

      // Cleanup
      await infrastructure.cleanup();

      // Verify directory is cleaned up
      await expect(fs.access(tempDir)).rejects.toThrow();
    });

    it('should handle cleanup callbacks', async () => {
      let callbackExecuted = false;

      infrastructure.addCleanupCallback(async () => {
        callbackExecuted = true;
      });

      await infrastructure.cleanup();

      expect(callbackExecuted).toBe(true);
    });

    it('should handle cleanup timeout gracefully', async () => {
      // Add a callback that takes too long
      infrastructure.addCleanupCallback(async () => {
        await new Promise(resolve => setTimeout(resolve, 10000)); // 10 seconds
      });

      const startTime = Date.now();
      await infrastructure.cleanup();
      const endTime = Date.now();

      // Should not take the full 10 seconds due to timeout
      expect(endTime - startTime).toBeLessThan(8000);
    });

    it('should provide resource status information', () => {
      const status = infrastructure.getResourceStatus();

      expect(status).toHaveProperty('tempDirs');
      expect(status).toHaveProperty('fileHandles');
      expect(status).toHaveProperty('timers');
      expect(status).toHaveProperty('intervals');
      expect(status).toHaveProperty('processes');
      expect(status).toHaveProperty('memoryMB');

      expect(typeof status.tempDirs).toBe('number');
      expect(typeof status.memoryMB).toBe('number');
      expect(status.memoryMB).toBeGreaterThan(0);
    });
  });

  describe('Helper Functions', () => {
    it('should work with withTestInfrastructure helper', async () => {
      let infrastructureReceived: TestInfrastructure | null = null;

      const testFn = withTestInfrastructure(async infra => {
        infrastructureReceived = infra;
        return 'test-result';
      });

      const result = await testFn();

      expect(result).toBe('test-result');
      expect(infrastructureReceived).toBe(infrastructure);
    });

    it('should work with withTimeout helper', async () => {
      const fastOperation = withTimeout('unit', async () => {
        await new Promise(resolve => setTimeout(resolve, 100));
        return 'completed';
      });

      const result = await fastOperation();
      expect(result).toBe('completed');
    });

    it('should timeout slow operations with withTimeout helper', async () => {
      // Update config to have very short timeout for testing
      infrastructure.updateConfig({
        timeouts: { unit: 200, integration: 500, performance: 1000 },
      });

      const slowOperation = withTimeout('unit', async () => {
        await new Promise(resolve => setTimeout(resolve, 1000)); // Longer than timeout
        return 'should-not-complete';
      });

      await expect(slowOperation()).rejects.toThrow(/timed out/);
    });

    it('should work with withResourceTracking helper', async () => {
      let trackerReceived: any = null;

      const testFn = withResourceTracking(async tracker => {
        trackerReceived = tracker;
        return 'tracked-result';
      });

      const result = await testFn();

      expect(result).toBe('tracked-result');
      expect(trackerReceived).toBeTruthy();
      expect(trackerReceived).toHaveProperty('tempDirs');
      expect(trackerReceived).toHaveProperty('fileHandles');
    });
  });

  describe('Error Handling', () => {
    it('should handle cleanup errors gracefully', async () => {
      // Add a callback that throws an error
      infrastructure.addCleanupCallback(async () => {
        throw new Error('Cleanup error');
      });

      // Should not throw, but handle the error gracefully
      await expect(infrastructure.cleanup()).resolves.toBeUndefined();
    });

    it('should handle force cleanup', async () => {
      // Add callbacks that take varying amounts of time
      infrastructure.addCleanupCallback(async () => {
        await new Promise(resolve => setTimeout(resolve, 100));
      });

      infrastructure.addCleanupCallback(async () => {
        await new Promise(resolve => setTimeout(resolve, 5000)); // Long operation
      });

      const startTime = Date.now();
      await infrastructure.forceCleanup();
      const endTime = Date.now();

      // Force cleanup should be much faster
      expect(endTime - startTime).toBeLessThan(3000);
    });
  });

  describe('Singleton Behavior', () => {
    it('should return the same instance', () => {
      const instance1 = TestInfrastructure.getInstance();
      const instance2 = TestInfrastructure.getInstance();

      expect(instance1).toBe(instance2);
      expect(instance1).toBe(infrastructure);
    });

    it('should maintain state across getInstance calls', async () => {
      const tempDir = await infrastructure.createTempDir('singleton-test-');

      const anotherInstance = TestInfrastructure.getInstance();
      const status = anotherInstance.getResourceStatus();

      expect(status.tempDirs).toBeGreaterThan(0);
    });
  });
});

describe('Integration with Jest', () => {
  it('should work within Jest test environment', () => {
    expect(jest).toBeDefined();
    expect(expect).toBeDefined();

    const infrastructure = TestInfrastructure.getInstance();
    expect(infrastructure).toBeDefined();
  });

  it('should handle Jest mocks and cleanup', () => {
    const mockFn = jest.fn();
    mockFn('test');

    expect(mockFn).toHaveBeenCalledWith('test');

    // Infrastructure should not interfere with Jest functionality
    const testInfra = TestInfrastructure.getInstance();
    const status = testInfra.getResourceStatus();
    expect(status).toBeDefined();
  });
});
