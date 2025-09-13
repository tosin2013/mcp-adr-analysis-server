/**
 * Unit tests for test-helpers.ts
 * Tests performance benchmarking, timeout handling, and resource tracking
 */

import { jest } from '@jest/globals';
import {
  unitTest,
  integrationTest,
  performanceTest,
  PerformanceBenchmark,
  createMockFileSystem,
  cleanupTempFiles,
  withRetry,
  measureExecutionTime,
} from './test-helpers.js';
import { testInfrastructure } from './test-infrastructure.js';
import * as fs from 'fs/promises';
import * as path from 'path';

describe('Test Helper Utilities', () => {
  afterEach(async () => {
    // Clean up any resources created during tests
    await testInfrastructure.cleanup();
  });

  describe('Test Type Decorators', () => {
    it('should execute unit test with proper timeout', async () => {
      let executed = false;
      
      await new Promise<void>((resolve) => {
        unitTest('sample unit test', async () => {
          executed = true;
          await new Promise(res => setTimeout(res, 10)); // Quick operation
        });
        
        // Wait for Jest to process the test
        setTimeout(() => {
          expect(executed).toBe(true);
          resolve();
        }, 100);
      });
    });

    it('should execute integration test with extended timeout', async () => {
      let executed = false;
      
      await new Promise<void>((resolve) => {
        integrationTest('sample integration test', async () => {
          executed = true;
          await new Promise(res => setTimeout(res, 50)); // Longer operation
        });
        
        setTimeout(() => {
          expect(executed).toBe(true);
          resolve();
        }, 100);
      });
    });

    it('should execute performance test with metrics tracking', async () => {
      let executed = false;
      
      await new Promise<void>((resolve) => {
        performanceTest('sample performance test', async () => {
          executed = true;
          await new Promise(res => setTimeout(res, 100)); // Simulate work
        });
        
        setTimeout(() => {
          expect(executed).toBe(true);
          resolve();
        }, 200);
      });
    });
  });

  describe('Performance Benchmarking', () => {
    it('should create and use performance benchmarks', async () => {
      const benchmark = new PerformanceBenchmark();
      
      benchmark.start();
      
      // Simulate some work
      await new Promise(resolve => setTimeout(resolve, 100));
      
      benchmark.end();
      
      const duration = benchmark.getDuration();
      const memoryDelta = benchmark.getMemoryDelta();
      
      expect(duration).toBeGreaterThanOrEqual(99);
      expect(duration).toBeLessThan(200); // Should be close to 100ms
      expect(typeof memoryDelta).toBe('number');
      
      const report = benchmark.getReport();
      expect(report).toContain('Duration:');
      expect(report).toContain('Memory Delta:');
    });

    it('should handle multiple benchmark cycles', async () => {
      const benchmark = new PerformanceBenchmark();
      const durations: number[] = [];
      
      for (let i = 0; i < 3; i++) {
        benchmark.start();
        await new Promise(resolve => setTimeout(resolve, 50));
        benchmark.end();
        durations.push(benchmark.getDuration());
      }
      
      expect(durations).toHaveLength(3);
      durations.forEach(duration => {
        expect(duration).toBeGreaterThan(40);
        expect(duration).toBeLessThan(100);
      });
    });

    it('should track memory usage accurately', async () => {
      const benchmark = new PerformanceBenchmark();
      
      benchmark.start();
      
      // Create some objects to increase memory usage
      const largeArray = new Array(10000).fill(0).map((_, i) => ({ index: i, data: 'test'.repeat(10) }));
      
      benchmark.end();
      
      const memoryDelta = benchmark.getMemoryDelta();
      expect(memoryDelta).toBeGreaterThan(0); // Should have increased memory usage
      
      // Clean up
      largeArray.length = 0;
    });

    it('should generate comprehensive reports', async () => {
      const benchmark = new PerformanceBenchmark();
      
      benchmark.start();
      await new Promise(resolve => setTimeout(resolve, 75));
      benchmark.end();
      
      const report = benchmark.getReport();
      
      expect(report).toContain('Performance Benchmark');
      expect(report).toContain('Duration:');
      expect(report).toContain('Memory Delta:');
      expect(report).toContain('ms');
      expect(report).toContain('bytes');
    });
  });

  describe('Mock File System', () => {
    it('should create mock file system with proper structure', async () => {
      const mockFs = await createMockFileSystem({
        'test.txt': 'content',
        'dir/file.js': 'console.log("test");',
        'nested/deep/file.json': JSON.stringify({ key: 'value' }),
      });
      
      expect(mockFs.root).toBeTruthy();
      expect(await fs.access(path.join(mockFs.root, 'test.txt'))).resolves;
      expect(await fs.access(path.join(mockFs.root, 'dir/file.js'))).resolves;
      expect(await fs.access(path.join(mockFs.root, 'nested/deep/file.json'))).resolves;
      
      // Verify content
      const content1 = await fs.readFile(path.join(mockFs.root, 'test.txt'), 'utf8');
      expect(content1).toBe('content');
      
      const content2 = await fs.readFile(path.join(mockFs.root, 'dir/file.js'), 'utf8');
      expect(content2).toBe('console.log("test");');
      
      const content3 = await fs.readFile(path.join(mockFs.root, 'nested/deep/file.json'), 'utf8');
      expect(JSON.parse(content3)).toEqual({ key: 'value' });
      
      await mockFs.cleanup();
    });

    it('should support reading and writing to mock files', async () => {
      const mockFs = await createMockFileSystem({
        'readme.md': '# Test Project',
      });
      
      const filePath = path.join(mockFs.root, 'readme.md');
      
      // Read existing content
      const originalContent = await fs.readFile(filePath, 'utf8');
      expect(originalContent).toBe('# Test Project');
      
      // Write new content
      await fs.writeFile(filePath, '# Updated Project\n\nNew content');
      
      // Verify updated content
      const updatedContent = await fs.readFile(filePath, 'utf8');
      expect(updatedContent).toBe('# Updated Project\n\nNew content');
      
      await mockFs.cleanup();
    });

    it('should handle file operations on mock directories', async () => {
      const mockFs = await createMockFileSystem({
        'src/index.js': 'module.exports = {};',
        'src/utils/helper.js': 'function help() {}',
      });
      
      // List directory contents
      const srcContents = await fs.readdir(path.join(mockFs.root, 'src'));
      expect(srcContents).toContain('index.js');
      expect(srcContents).toContain('utils');
      
      const utilsContents = await fs.readdir(path.join(mockFs.root, 'src/utils'));
      expect(utilsContents).toContain('helper.js');
      
      // Create new file
      await fs.writeFile(path.join(mockFs.root, 'src/config.js'), 'const config = {};');
      
      const updatedContents = await fs.readdir(path.join(mockFs.root, 'src'));
      expect(updatedContents).toContain('config.js');
      
      await mockFs.cleanup();
    });
  });

  describe('Temp File Cleanup', () => {
    it('should track and clean up temporary files', async () => {
      // Create some temporary files
      const tempFiles = await Promise.all([
        fs.mkdtemp(path.join(process.cwd(), 'temp-test-')),
        fs.mkdtemp(path.join(process.cwd(), 'temp-test-')),
      ]);
      
      // Write content to temp files
      await fs.writeFile(path.join(tempFiles[0], 'file1.txt'), 'temp content 1');
      await fs.writeFile(path.join(tempFiles[1], 'file2.txt'), 'temp content 2');
      
      // Verify files exist
      await expect(fs.access(path.join(tempFiles[0], 'file1.txt'))).resolves.toBeUndefined();
      await expect(fs.access(path.join(tempFiles[1], 'file2.txt'))).resolves.toBeUndefined();
      
      // Clean up
      await cleanupTempFiles(tempFiles);
      
      // Verify files are deleted
      await expect(fs.access(tempFiles[0])).rejects.toThrow();
      await expect(fs.access(tempFiles[1])).rejects.toThrow();
    });

    it('should handle cleanup of non-existent files gracefully', async () => {
      const nonExistentPaths = [
        '/path/that/does/not/exist',
        '/another/fake/path/file.txt',
      ];
      
      // Should not throw even for non-existent paths
      await expect(cleanupTempFiles(nonExistentPaths)).resolves.toBeUndefined();
    });
  });

  describe('Retry Utility', () => {
    it('should retry failed operations', async () => {
      let attempts = 0;
      
      const flakyOperation = async () => {
        attempts++;
        if (attempts < 3) {
          throw new Error(`Attempt ${attempts} failed`);
        }
        return `Success on attempt ${attempts}`;
      };
      
      const result = await withRetry(flakyOperation, 3, 10);
      
      expect(result).toBe('Success on attempt 3');
      expect(attempts).toBe(3);
    });

    it('should fail after max retries', async () => {
      let attempts = 0;
      
      const alwaysFailingOperation = async () => {
        attempts++;
        throw new Error(`Failure ${attempts}`);
      };
      
      await expect(withRetry(alwaysFailingOperation, 2, 10))
        .rejects.toThrow('Failure 2');
      
      expect(attempts).toBe(2);
    });

    it('should succeed on first try when operation works', async () => {
      let attempts = 0;
      
      const workingOperation = async () => {
        attempts++;
        return `Success on attempt ${attempts}`;
      };
      
      const result = await withRetry(workingOperation, 3, 10);
      
      expect(result).toBe('Success on attempt 1');
      expect(attempts).toBe(1);
    });

    it('should respect delay between retries', async () => {
      let attempts = 0;
      const timestamps: number[] = [];
      
      const timedOperation = async () => {
        attempts++;
        timestamps.push(Date.now());
        
        if (attempts < 2) {
          throw new Error('First attempt fails');
        }
        return 'Success';
      };
      
      await withRetry(timedOperation, 2, 50);
      
      expect(timestamps).toHaveLength(2);
      const timeDiff = timestamps[1] - timestamps[0];
      expect(timeDiff).toBeGreaterThanOrEqual(40); // Account for timing variations
    });
  });

  describe('Execution Time Measurement', () => {
    it('should measure sync function execution time', async () => {
      const syncFunction = () => {
        // Simulate CPU work
        let sum = 0;
        for (let i = 0; i < 100000; i++) {
          sum += i;
        }
        return sum;
      };
      
      const { result, duration } = await measureExecutionTime(syncFunction);
      
      expect(typeof result).toBe('number');
      expect(result).toBeGreaterThan(0);
      expect(duration).toBeGreaterThan(0);
      expect(duration).toBeLessThan(1000); // Should be under 1 second
    });

    it('should measure async function execution time', async () => {
      const asyncFunction = async () => {
        await new Promise(resolve => setTimeout(resolve, 100));
        return 'async result';
      };
      
      const { result, duration } = await measureExecutionTime(asyncFunction);
      
      expect(result).toBe('async result');
      expect(duration).toBeGreaterThanOrEqual(95); // Account for timing variations
      expect(duration).toBeLessThan(150);
    });

    it('should handle function errors and still measure time', async () => {
      const errorFunction = async () => {
        await new Promise(resolve => setTimeout(resolve, 50));
        throw new Error('Intentional error');
      };
      
      await expect(measureExecutionTime(errorFunction))
        .rejects.toMatchObject({
          error: expect.any(Error),
          duration: expect.any(Number),
        });
    });
  });

  describe('Resource Tracking Integration', () => {
    it('should track resources during test execution', async () => {
      const initialMemory = testInfrastructure.getMemoryUsage();
      
      // Create some test resources
      const mockFs = await createMockFileSystem({
        'resource-test.txt': 'test content',
      });
      
      const currentMemory = testInfrastructure.getMemoryUsage();
      expect(currentMemory.length).toBeGreaterThan(initialMemory.length);
      
      await mockFs.cleanup();
    });

    it('should handle cleanup properly', async () => {
      const benchmark = new PerformanceBenchmark();
      
      benchmark.start();
      await new Promise(resolve => setTimeout(resolve, 25));
      benchmark.end();
      
      // Should not throw during cleanup
      await testInfrastructure.cleanup();
      
      expect(benchmark.getDuration()).toBeGreaterThan(20);
    });
  });

  describe('Error Handling', () => {
    it('should handle errors in performance benchmarks gracefully', async () => {
      const benchmark = new PerformanceBenchmark();
      
      benchmark.start();
      
      try {
        throw new Error('Test error during benchmark');
      } catch (error) {
        benchmark.end();
        // Should still provide meaningful data
        expect(benchmark.getDuration()).toBeGreaterThanOrEqual(0);
        expect(typeof benchmark.getMemoryDelta()).toBe('number');
      }
    });

    it('should handle mock file system errors gracefully', async () => {
      // Try to create mock file system with invalid structure
      await expect(createMockFileSystem({
        '': 'invalid empty filename',
      } as any)).rejects.toThrow();
    });
  });
});
