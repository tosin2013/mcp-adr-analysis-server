/**
 * Tests for configuration management
 */

import {
  loadConfig,
  validateProjectPath,
  createLogger,
  getAdrDirectoryPath,
  getCacheDirectoryPath,
} from '../src/utils/config.js';

describe('Configuration Management', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    // Reset environment variables
    process.env = { ...originalEnv };
  });

  afterAll(() => {
    // Restore original environment
    process.env = originalEnv;
  });

  describe('loadConfig', () => {
    test('should load default configuration', () => {
      const config = loadConfig();

      // Check that projectPath is a valid directory path (not necessarily cwd)
      expect(typeof config.projectPath).toBe('string');
      expect(config.projectPath.length).toBeGreaterThan(0);
      expect(config.adrDirectory).toBe('docs/adrs');
      expect(config.logLevel).toBe('INFO');
      expect(config.cacheEnabled).toBe(true);
      expect(config.cacheDirectory).toBe('.mcp-adr-cache');
    });

    test('should load configuration from environment variables', () => {
      process.env['PROJECT_PATH'] = '/test/project';
      process.env['ADR_DIRECTORY'] = 'architecture/decisions';
      process.env['LOG_LEVEL'] = 'DEBUG';
      process.env['CACHE_ENABLED'] = 'false';
      process.env['CACHE_DIRECTORY'] = '.custom-cache';

      const config = loadConfig();

      expect(config.projectPath).toBe('/test/project');
      expect(config.adrDirectory).toBe('architecture/decisions');
      expect(config.logLevel).toBe('DEBUG');
      expect(config.cacheEnabled).toBe(false);
      expect(config.cacheDirectory).toBe('.custom-cache');
    });

    test('should validate log level enum', () => {
      process.env['LOG_LEVEL'] = 'INVALID';

      expect(() => loadConfig()).toThrow('Configuration validation failed');
    });

    test('should handle numeric environment variables', () => {
      process.env['MAX_CACHE_SIZE'] = '50000000';
      process.env['ANALYSIS_TIMEOUT'] = '45000';

      const config = loadConfig();

      expect(config.maxCacheSize).toBe(50000000);
      expect(config.analysisTimeout).toBe(45000);
    });
  });

  describe('validateProjectPath', () => {
    test('should validate existing directory', async () => {
      await expect(validateProjectPath(process.cwd())).resolves.toBeUndefined();
    });

    test('should reject non-existent path', async () => {
      await expect(validateProjectPath('/non/existent/path')).rejects.toThrow(
        'PROJECT_PATH does not exist'
      );
    });
  });

  describe('createLogger', () => {
    test('should create logger with correct log level', () => {
      const config = {
        logLevel: 'ERROR' as const,
        projectPath: '',
        adrDirectory: '',
        cacheEnabled: true,
        cacheDirectory: '',
        maxCacheSize: 0,
        analysisTimeout: 0,
      };
      const logger = createLogger(config);

      expect(logger).toHaveProperty('debug');
      expect(logger).toHaveProperty('info');
      expect(logger).toHaveProperty('warn');
      expect(logger).toHaveProperty('error');
    });
  });

  describe('path helpers', () => {
    test('should get ADR directory path', () => {
      const config = {
        projectPath: '/test/project',
        adrDirectory: 'docs/adrs',
        logLevel: 'INFO' as const,
        cacheEnabled: true,
        cacheDirectory: '',
        maxCacheSize: 0,
        analysisTimeout: 0,
      };
      const adrPath = getAdrDirectoryPath(config);

      expect(adrPath).toBe('/test/project/docs/adrs');
    });

    test('should get cache directory path', () => {
      const config = {
        projectPath: '/test/project',
        adrDirectory: '',
        logLevel: 'INFO' as const,
        cacheEnabled: true,
        cacheDirectory: '.cache',
        maxCacheSize: 0,
        analysisTimeout: 0,
      };
      const cachePath = getCacheDirectoryPath(config);

      expect(cachePath).toBe('/test/project/.cache');
    });
  });
});
