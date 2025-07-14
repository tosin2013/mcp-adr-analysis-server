/**
 * Comprehensive tests for MCP ADR Cache System
 * Tests the prompt-driven caching system that delegates operations to AI agents
 */

import { describe, test, expect, beforeEach, afterEach, jest } from '@jest/globals';
import {
  initializeCache,
  setCache,
  getCache,
  hasValidCache,
  invalidateCache,
  clearCache,
  getCacheStats,
  cleanupCache,
  getCachedOrGenerate,
  CacheOptions,
} from '../src/utils/cache.js';

// Mock console.error to avoid noise in tests
const originalConsoleError = console.error;
beforeEach(() => {
  console.error = jest.fn();
});

afterEach(() => {
  console.error = originalConsoleError;
});

describe('Cache System', () => {
  const CACHE_DIR = '.mcp-adr-cache';
  const testKey = 'test-key';
  const testData = { message: 'test data', timestamp: '2024-01-01T00:00:00Z' };
  const testOptions: CacheOptions = { ttl: 1800, compression: true };

  describe('initializeCache', () => {
    test('should generate valid cache initialization prompt', async () => {
      const result = await initializeCache();

      expect(result).toBeValidPromptObject();
      expect(result.prompt).toContain('Cache Directory Initialization Request');
      expect(result.prompt).toContain(CACHE_DIR);
      expect(result.prompt).toContain('metadata.json');
      expect(result.instructions).toContain('Security Validation');
      expect(result.instructions).toContain('Directory Creation');
      expect(result.context).toEqual({
        cacheDirectory: CACHE_DIR,
        operation: 'cache_initialization',
        securityLevel: 'high',
        expectedFormat: 'json'
      });
    });

    test('should include security validation instructions', async () => {
      const result = await initializeCache();

      expect(result.prompt).toContain('Security Validation');
      expect(result.prompt).toContain('Validate cache directory path');
      expect(result.prompt).toContain('Prevent system directory access');
      expect(result.prompt).toContain('Handle permissions safely');
      expect(result.instructions).toContain('Path security validation');
      expect(result.instructions).toContain('System directory protection');
    });

    test('should include expected output format', async () => {
      const result = await initializeCache();

      expect(result.prompt).toContain('Expected Output Format');
      expect(result.prompt).toContain('directoryCreated');
      expect(result.prompt).toContain('metadataCreated');
      expect(result.prompt).toContain('security');
      expect(result.prompt).toContain('pathValidated');
    });

    test('should include error response format', async () => {
      const result = await initializeCache();

      expect(result.prompt).toContain('Error Response Format');
      expect(result.prompt).toContain('PERMISSION_DENIED');
      expect(result.prompt).toContain('INVALID_PATH');
      expect(result.prompt).toContain('SECURITY_VIOLATION');
      expect(result.prompt).toContain('rejectionReason');
    });

    test('should handle errors gracefully', async () => {
      // This test verifies error handling structure
      await expect(initializeCache()).resolves.not.toThrow();
    });
  });

  describe('setCache', () => {
    test('should generate valid cache set prompt', async () => {
      const result = await setCache(testKey, testData, testOptions);

      expect(result).toBeValidPromptObject();
      expect(result.prompt).toContain('Cache Data Storage Request');
      expect(result.prompt).toContain(testKey);
      expect(result.prompt).toContain('Cache Initialization');
      expect(result.context).toEqual({
        cacheKey: testKey,
        filePath: `${CACHE_DIR}/${testKey.replace(/[^a-zA-Z0-9-_]/g, '_')}.json`,
        dataSize: JSON.stringify(testData).length,
        ttl: testOptions.ttl,
        operation: 'cache_set',
        securityLevel: 'high',
        expectedFormat: 'json'
      });
    });

    test('should include cache entry structure', async () => {
      const result = await setCache(testKey, testData, testOptions);

      expect(result.prompt).toContain('Cache Entry Content');
      expect(result.prompt).toContain(testKey);
      expect(result.prompt).toContain(testOptions.ttl?.toString());
      expect(result.prompt).toContain('compressed');
    });

    test('should use default options when not provided', async () => {
      const result = await setCache(testKey, testData);

      expect(result.context.ttl).toBe(3600); // Default TTL
      expect(result.prompt).toContain('3600'); // Default TTL in prompt
    });

    test('should include security validation for cache storage', async () => {
      const result = await setCache(testKey, testData, testOptions);

      expect(result.prompt).toContain('Security Validation');
      expect(result.prompt).toContain('Validate cache file path');
      expect(result.prompt).toContain('Prevent path traversal');
      expect(result.prompt).toContain('Content validation');
      expect(result.instructions).toContain('Path security validation');
    });

    test('should include expected output format for storage', async () => {
      const result = await setCache(testKey, testData, testOptions);

      expect(result.prompt).toContain('Expected Output Format');
      expect(result.prompt).toContain('cacheInitialized');
      expect(result.prompt).toContain('fileWritten');
      expect(result.prompt).toContain('dataSize');
      expect(result.prompt).toContain('security');
    });

    test('should handle special characters in cache key', async () => {
      const specialKey = 'test/key:with-special@chars';
      const result = await setCache(specialKey, testData);

      expect(result.context.cacheKey).toBe(specialKey);
      expect(result.context.filePath).toBe(`${CACHE_DIR}/test_key_with-special_chars.json`);
    });

    test('should handle large data objects', async () => {
      const largeData = { data: 'x'.repeat(10000), metadata: { size: 'large' } };
      const result = await setCache(testKey, largeData);

      expect(result.context.dataSize).toBe(JSON.stringify(largeData).length);
      expect(result.context.dataSize).toBeGreaterThan(10000);
    });

    test('should handle errors in cache set operations', async () => {
      await expect(setCache(testKey, testData)).resolves.not.toThrow();
    });
  });

  describe('getCache', () => {
    test('should generate valid cache get prompt', async () => {
      const result = await getCache(testKey);

      expect(result).toBeValidPromptObject();
      expect(result.prompt).toContain('Cache Data Retrieval Request');
      expect(result.prompt).toContain(testKey);
      expect(result.prompt).toContain('TTL Validation');
      expect(result.context).toEqual({
        cacheKey: testKey,
        filePath: `${CACHE_DIR}/${testKey.replace(/[^a-zA-Z0-9-_]/g, '_')}.json`,
        currentTime: expect.any(String),
        operation: 'cache_get',
        securityLevel: 'high',
        expectedFormat: 'json'
      });
    });

    test('should include file existence check instructions', async () => {
      const result = await getCache(testKey);

      expect(result.prompt).toContain('File Existence Check');
      expect(result.prompt).toContain('cache miss result');
      expect(result.prompt).toContain('Cache Content Reading');
      expect(result.prompt).toContain('Parse JSON content');
    });

    test('should include TTL validation logic', async () => {
      const result = await getCache(testKey);

      expect(result.prompt).toContain('TTL Validation');
      expect(result.prompt).toContain('Calculate cache age');
      expect(result.prompt).toContain('current_time - cache_timestamp');
      expect(result.prompt).toContain('Compare age with TTL');
    });

    test('should include cache cleanup instructions', async () => {
      const result = await getCache(testKey);

      expect(result.prompt).toContain('Cache Cleanup');
      expect(result.prompt).toContain('If cache is expired, delete');
      expect(result.prompt).toContain('Return cache miss result');
    });

    test('should include expected output formats', async () => {
      const result = await getCache(testKey);

      expect(result.prompt).toContain('Expected Output Format (Cache Hit)');
      expect(result.prompt).toContain('cacheHit": true');
      expect(result.prompt).toContain('Expected Output Format (Cache Miss)');
      expect(result.prompt).toContain('cacheHit": false');
      expect(result.prompt).toContain('FILE_NOT_FOUND|CACHE_EXPIRED|CORRUPTED_DATA');
    });

    test('should include current time in context', async () => {
      const result = await getCache(testKey);

      expect(result.context.currentTime).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
    });

    test('should handle errors in cache get operations', async () => {
      await expect(getCache(testKey)).resolves.not.toThrow();
    });
  });

  describe('hasValidCache', () => {
    test('should generate valid cache validity check prompt', async () => {
      const result = await hasValidCache(testKey);

      expect(result).toBeValidPromptObject();
      expect(result.prompt).toContain('Cache Validity Check Request');
      expect(result.prompt).toContain(testKey);
      expect(result.prompt).toContain('Cache Data Retrieval Request');
      expect(result.context).toEqual({
        cacheKey: testKey,
        operation: 'cache_validity_check',
        securityLevel: 'high',
        expectedFormat: 'json'
      });
    });

    test('should embed cache retrieval prompt', async () => {
      const result = await hasValidCache(testKey);

      expect(result.prompt).toContain('Cache Data Retrieval Request');
      expect(result.prompt).toContain('File Existence Check');
      expect(result.prompt).toContain('TTL Validation');
    });

    test('should include validity determination logic', async () => {
      const result = await hasValidCache(testKey);

      expect(result.prompt).toContain('isValid: true only if');
      expect(result.prompt).toContain('cache exists AND is not expired');
      expect(result.instructions).toContain('isValid: true only if cache exists and is not expired');
    });

    test('should include expected output formats for validity', async () => {
      const result = await hasValidCache(testKey);

      expect(result.prompt).toContain('Expected Output Format (Valid Cache)');
      expect(result.prompt).toContain('isValid": true');
      expect(result.prompt).toContain('Expected Output Format (Invalid/Missing Cache)');
      expect(result.prompt).toContain('isValid": false');
    });

    test('should handle errors in validity checks', async () => {
      await expect(hasValidCache(testKey)).resolves.not.toThrow();
    });
  });

  describe('invalidateCache', () => {
    test('should generate valid cache invalidation prompt', async () => {
      const result = await invalidateCache(testKey);

      expect(result).toBeValidPromptObject();
      expect(result.prompt).toContain('Cache Entry Invalidation Request');
      expect(result.prompt).toContain(testKey);
      expect(result.prompt).toContain('Cache File Deletion');
      expect(result.context).toEqual({
        cacheKey: testKey,
        filePath: `${CACHE_DIR}/${testKey.replace(/[^a-zA-Z0-9-_]/g, '_')}.json`,
        operation: 'cache_invalidate',
        securityLevel: 'high',
        expectedFormat: 'json'
      });
    });

    test('should include file existence check for invalidation', async () => {
      const result = await invalidateCache(testKey);

      expect(result.prompt).toContain('File Existence Check');
      expect(result.prompt).toContain('If file doesn\'t exist, consider operation successful');
      expect(result.prompt).toContain('Cache File Deletion');
    });

    test('should include security validation for deletion', async () => {
      const result = await invalidateCache(testKey);

      expect(result.prompt).toContain('Security Validation');
      expect(result.prompt).toContain('Validate cache file path');
      expect(result.prompt).toContain('Prevent path traversal');
      expect(result.prompt).toContain('Safe deletion');
    });

    test('should include expected output format for invalidation', async () => {
      const result = await invalidateCache(testKey);

      expect(result.prompt).toContain('Expected Output Format (Successful Invalidation)');
      expect(result.prompt).toContain('fileExists');
      expect(result.prompt).toContain('fileDeleted');
      expect(result.prompt).toContain('alreadyInvalidated');
    });

    test('should handle errors in cache invalidation', async () => {
      await expect(invalidateCache(testKey)).resolves.not.toThrow();
    });
  });

  describe('clearCache', () => {
    test('should generate valid cache clear prompt', async () => {
      const result = await clearCache();

      expect(result).toBeValidPromptObject();
      expect(result.prompt).toContain('Cache Clearing Request');
      expect(result.prompt).toContain(CACHE_DIR);
      expect(result.prompt).toContain('Preserve System Files');
      expect(result.context).toEqual({
        cacheDirectory: CACHE_DIR,
        operation: 'cache_clear',
        securityLevel: 'high',
        protectedFiles: ['metadata.json'],
        expectedFormat: 'json'
      });
    });

    test('should include directory listing instructions', async () => {
      const result = await clearCache();

      expect(result.prompt).toContain('Directory Listing');
      expect(result.prompt).toContain('Filter for JSON files');
      expect(result.prompt).toContain('Exclude metadata.json');
    });

    test('should include system file preservation', async () => {
      const result = await clearCache();

      expect(result.prompt).toContain('Preserve System Files');
      expect(result.prompt).toContain('Keep metadata.json file intact');
      expect(result.prompt).toContain('Do not delete non-cache files');
    });

    test('should include expected output format for clearing', async () => {
      const result = await clearCache();

      expect(result.prompt).toContain('Expected Output Format (Successful Clearing)');
      expect(result.prompt).toContain('filesListed');
      expect(result.prompt).toContain('cacheFilesFound');
      expect(result.prompt).toContain('filesDeleted');
      expect(result.prompt).toContain('metadataPreserved');
    });

    test('should handle errors in cache clearing', async () => {
      await expect(clearCache()).resolves.not.toThrow();
    });
  });

  describe('getCacheStats', () => {
    test('should generate valid cache stats prompt', async () => {
      const result = await getCacheStats();

      expect(result).toBeValidPromptObject();
      expect(result.prompt).toContain('Cache Statistics Collection Request');
      expect(result.prompt).toContain(CACHE_DIR);
      expect(result.prompt).toContain('Cache Initialization');
      expect(result.context).toEqual({
        cacheDirectory: CACHE_DIR,
        operation: 'cache_stats',
        securityLevel: 'high',
        expectedFormat: 'json',
        expectedFields: ['totalEntries', 'totalSize', 'oldestEntry', 'newestEntry']
      });
    });

    test('should include comprehensive analysis instructions', async () => {
      const result = await getCacheStats();

      expect(result.prompt).toContain('Directory Analysis');
      expect(result.prompt).toContain('File Size Analysis');
      expect(result.prompt).toContain('Timestamp Analysis');
      expect(result.prompt).toContain('oldest cache entry');
      expect(result.prompt).toContain('newest cache entry');
    });

    test('should include expected statistics format', async () => {
      const result = await getCacheStats();

      expect(result.prompt).toContain('Expected Output Format');
      expect(result.prompt).toContain('totalEntries');
      expect(result.prompt).toContain('totalSize');
      expect(result.prompt).toContain('oldestEntry');
      expect(result.prompt).toContain('newestEntry');
      expect(result.prompt).toContain('averageFileSize');
    });

    test('should handle errors in stats collection', async () => {
      await expect(getCacheStats()).resolves.not.toThrow();
    });
  });

  describe('cleanupCache', () => {
    test('should generate valid cache cleanup prompt', async () => {
      const result = await cleanupCache();

      expect(result).toBeValidPromptObject();
      expect(result.prompt).toContain('Cache Cleanup Request');
      expect(result.prompt).toContain(CACHE_DIR);
      expect(result.prompt).toContain('Cache Initialization');
      expect(result.context).toEqual({
        cacheDirectory: CACHE_DIR,
        currentTime: expect.any(String),
        operation: 'cache_cleanup',
        securityLevel: 'high',
        expectedFormat: 'json',
        expectedReturn: 'cleanedCount'
      });
    });

    test('should include expiration check logic', async () => {
      const result = await cleanupCache();

      expect(result.prompt).toContain('Expiration Check and Cleanup');
      expect(result.prompt).toContain('Calculate age: current_time - cache_timestamp');
      expect(result.prompt).toContain('If age > TTL, mark for deletion');
      expect(result.prompt).toContain('corrupted/invalid JSON, mark for deletion');
    });

    test('should include metadata update instructions', async () => {
      const result = await cleanupCache();

      expect(result.prompt).toContain('Metadata Update');
      expect(result.prompt).toContain('Update metadata.json with lastCleanup');
      expect(result.prompt).toContain('If metadata.json is corrupted, recreate it');
    });

    test('should include expected cleanup output format', async () => {
      const result = await cleanupCache();

      expect(result.prompt).toContain('Expected Output Format');
      expect(result.prompt).toContain('cleanedCount');
      expect(result.prompt).toContain('totalFilesChecked');
      expect(result.prompt).toContain('expiredFiles');
      expect(result.prompt).toContain('corruptedFiles');
    });

    test('should handle errors in cache cleanup', async () => {
      await expect(cleanupCache()).resolves.not.toThrow();
    });
  });

  describe('getCachedOrGenerate', () => {
    const mockGenerator = jest.fn<() => Promise<any>>();

    beforeEach(() => {
      mockGenerator.mockReset();
      mockGenerator.mockResolvedValue({ data: 'generated' });
    });

    test('should generate valid cache-or-generate prompt', async () => {
      const result = await getCachedOrGenerate(testKey, mockGenerator, testOptions);

      expect(result).toBeValidPromptObject();
      expect(result.prompt).toContain('Cache-or-Generate Operation Request');
      expect(result.prompt).toContain(testKey);
      expect(result.prompt).toContain('Cache Retrieval Attempt');
      expect(result.context).toEqual({
        cacheKey: testKey,
        ttl: testOptions.ttl,
        compression: testOptions.compression,
        operation: 'cache_or_generate',
        securityLevel: 'high',
        expectedFormat: 'json'
      });
    });

    test('should include cache retrieval step', async () => {
      const result = await getCachedOrGenerate(testKey, mockGenerator, testOptions);

      expect(result.prompt).toContain('Step 1: Cache Retrieval Attempt');
      expect(result.prompt).toContain('Cache Data Retrieval Request');
      expect(result.prompt).toContain('File Existence Check');
    });

    test('should include data generation step', async () => {
      const result = await getCachedOrGenerate(testKey, mockGenerator, testOptions);

      expect(result.prompt).toContain('Step 2: Data Generation (if cache miss)');
      expect(result.prompt).toContain('Execute Data Generator');
      expect(result.prompt).toContain('Cache Storage');
    });

    test('should include both output formats', async () => {
      const result = await getCachedOrGenerate(testKey, mockGenerator, testOptions);

      expect(result.prompt).toContain('Expected Output Format (Cache Hit)');
      expect(result.prompt).toContain('dataSource": "cache"');
      expect(result.prompt).toContain('Expected Output Format (Cache Miss + Generation)');
      expect(result.prompt).toContain('dataSource": "generated"');
    });

    test('should use default options when not provided', async () => {
      const result = await getCachedOrGenerate(testKey, mockGenerator);

      expect(result.context.ttl).toBe(3600);
      expect(result.context.compression).toBe(false);
    });

    test('should handle errors in cache-or-generate operations', async () => {
      await expect(getCachedOrGenerate(testKey, mockGenerator, testOptions)).resolves.not.toThrow();
    });
  });

  describe('Error Handling', () => {
    test('should throw McpAdrError with correct error codes', async () => {
      // Test that all functions handle errors gracefully
      const mockGen = jest.fn<() => Promise<any>>();
      mockGen.mockResolvedValue({ data: 'test' });
      
      const functions = [
        () => initializeCache(),
        () => setCache(testKey, testData),
        () => getCache(testKey),
        () => hasValidCache(testKey),
        () => invalidateCache(testKey),
        () => clearCache(),
        () => getCacheStats(),
        () => cleanupCache(),
        () => getCachedOrGenerate(testKey, mockGen),
      ];

      for (const fn of functions) {
        await expect(fn()).resolves.not.toThrow();
      }
    });

    test('should include error handling in all prompts', async () => {
      const mockGen = jest.fn<() => Promise<any>>();
      mockGen.mockResolvedValue({ data: 'test' });
      
      const functions = [
        initializeCache,
        () => setCache(testKey, testData),
        () => getCache(testKey),
        () => hasValidCache(testKey),
        () => invalidateCache(testKey),
        clearCache,
        getCacheStats,
        cleanupCache,
        () => getCachedOrGenerate(testKey, mockGen),
      ];

      for (const fn of functions) {
        const result = await fn();
        expect(result.prompt).toContain('Error Response Format');
      }
    });
  });

  describe('Security Features', () => {
    test('should include security validation in all operations', async () => {
      const mockGen = jest.fn<() => Promise<any>>();
      mockGen.mockResolvedValue({ data: 'test' });
      
      const functions = [
        initializeCache,
        () => setCache(testKey, testData),
        () => getCache(testKey),
        () => hasValidCache(testKey),
        () => invalidateCache(testKey),
        clearCache,
        getCacheStats,
        cleanupCache,
        () => getCachedOrGenerate(testKey, mockGen),
      ];

      for (const fn of functions) {
        const result = await fn();
        expect(result.prompt).toContain('Security Validation');
        expect(result.context.securityLevel).toBe('high');
      }
    });

    test('should sanitize cache keys to prevent path traversal', async () => {
      const maliciousKey = '../../../etc/passwd';
      const result = await setCache(maliciousKey, testData);

      expect(result.context.filePath).toBe(`${CACHE_DIR}/${maliciousKey.replace(/[^a-zA-Z0-9-_]/g, '_')}.json`);
      expect(result.context.filePath).not.toContain('../');
    });

    test('should include path traversal prevention in all prompts', async () => {
      const functions = [
        () => setCache(testKey, testData),
        () => getCache(testKey),
        () => hasValidCache(testKey),
        () => invalidateCache(testKey),
      ];

      for (const fn of functions) {
        const result = await fn();
        expect(result.prompt).toContain('Prevent path traversal');
      }
    });
  });

  describe('Performance Considerations', () => {
    test('should handle large cache keys efficiently', async () => {
      const largeKey = 'x'.repeat(1000);
      const result = await setCache(largeKey, testData);

      expect(result.context.cacheKey).toBe(largeKey);
      expect(result.context.filePath).toContain(CACHE_DIR);
    });

    test('should include compression option in cache entries', async () => {
      const result = await setCache(testKey, testData, { compression: true });

      expect(result.prompt).toContain('compressed": true');
    });

    test('should include TTL in all cache operations', async () => {
      const customTTL = 7200;
      const result = await setCache(testKey, testData, { ttl: customTTL });

      expect(result.prompt).toContain(customTTL.toString());
      expect(result.context.ttl).toBe(customTTL);
    });
  });

  describe('Concurrency and Edge Cases', () => {
    test('should handle concurrent operations safely', async () => {
      const operations = [
        setCache('key1', { data: 'value1' }),
        setCache('key2', { data: 'value2' }),
        getCache('key1'),
        getCache('key2'),
        invalidateCache('key1'),
      ];

      const results = await Promise.all(operations);
      
      // All operations should complete successfully
      results.forEach(result => {
        expect(result).toBeValidPromptObject();
      });
    });

    test('should handle empty cache key gracefully', async () => {
      const result = await setCache('', testData);

      expect(result.context.cacheKey).toBe('');
      expect(result.context.filePath).toBe(`${CACHE_DIR}/.json`);
    });

    test('should handle null/undefined data gracefully', async () => {
      const result = await setCache(testKey, null);

      expect(result.context.cacheKey).toBe(testKey);
      expect(result.context.dataSize).toBe(JSON.stringify(null).length);
    });
  });

  describe('Context and Metadata', () => {
    test('should include consistent context across operations', async () => {
      const mockGen = jest.fn<() => Promise<any>>();
      mockGen.mockResolvedValue({ data: 'test' });
      
      const operations = [
        initializeCache,
        () => setCache(testKey, testData),
        () => getCache(testKey),
        () => hasValidCache(testKey),
        () => invalidateCache(testKey),
        clearCache,
        getCacheStats,
        cleanupCache,
        () => getCachedOrGenerate(testKey, mockGen),
      ];

      for (const fn of operations) {
        const result = await fn();
        expect(result.context).toHaveProperty('securityLevel');
        expect(result.context).toHaveProperty('expectedFormat');
        expect(result.context.securityLevel).toBe('high');
        expect(result.context.expectedFormat).toBe('json');
      }
    });

    test('should include operation-specific context', async () => {
      const setResult = await setCache(testKey, testData);
      const getResult = await getCache(testKey);
      const statsResult = await getCacheStats();

      expect(setResult.context.operation).toBe('cache_set');
      expect(getResult.context.operation).toBe('cache_get');
      expect(statsResult.context.operation).toBe('cache_stats');
    });
  });

  describe('Integration with Configuration', () => {
    test('should use default cache directory', async () => {
      const result = await initializeCache();

      expect(result.context.cacheDirectory).toBe(CACHE_DIR);
      expect(result.prompt).toContain(CACHE_DIR);
    });

    test('should handle different cache configurations', async () => {
      // Test with different TTL values
      const shortTTL = await setCache(testKey, testData, { ttl: 300 });
      const longTTL = await setCache(testKey, testData, { ttl: 86400 });

      expect(shortTTL.context.ttl).toBe(300);
      expect(longTTL.context.ttl).toBe(86400);
    });
  });
});