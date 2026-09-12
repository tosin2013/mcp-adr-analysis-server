/**
 * Tests for Test-Aware Defaults Utility
 *
 * @see Issue #309 - Add environment-aware test defaults to reduce timeouts
 */

import {
  isTestEnvironment,
  getEnhancedModeDefault,
  getKnowledgeEnhancementDefault,
  getMemoryIntegrationDefault,
  getOperationTimeout,
  getTestAwareDefaults,
  mergeWithTestDefaults,
} from '../../src/utils/test-aware-defaults.js';

describe('Test-Aware Defaults Utility', () => {
  describe('isTestEnvironment', () => {
    it('should detect test environment via NODE_ENV', () => {
      // Since tests run with NODE_ENV=test, this should return true
      expect(isTestEnvironment()).toBe(true);
    });

    it('should detect test environment via VITEST env var', () => {
      const origNodeEnv = process.env['NODE_ENV'];
      try {
        delete process.env['NODE_ENV'];
        // VITEST is set by the test runner
        expect(process.env['VITEST']).toBeDefined();
        expect(isTestEnvironment()).toBe(true);
      } finally {
        process.env['NODE_ENV'] = origNodeEnv;
      }
    });

    it('should return false when no test indicators are set', () => {
      const origNodeEnv = process.env['NODE_ENV'];
      const origVitest = process.env['VITEST'];
      try {
        delete process.env['NODE_ENV'];
        delete process.env['VITEST'];
        expect(isTestEnvironment()).toBe(false);
      } finally {
        process.env['NODE_ENV'] = origNodeEnv;
        if (origVitest !== undefined) process.env['VITEST'] = origVitest;
      }
    });
  });

  describe('getEnhancedModeDefault', () => {
    it('should return false in test environment', () => {
      expect(getEnhancedModeDefault()).toBe(false);
    });
  });

  describe('getKnowledgeEnhancementDefault', () => {
    it('should return false in test environment', () => {
      expect(getKnowledgeEnhancementDefault()).toBe(false);
    });
  });

  describe('getMemoryIntegrationDefault', () => {
    it('should return false in test environment', () => {
      expect(getMemoryIntegrationDefault()).toBe(false);
    });
  });

  describe('getOperationTimeout', () => {
    it('should return max 5s timeout in test environment', () => {
      expect(getOperationTimeout()).toBe(5000);
      expect(getOperationTimeout(30000)).toBe(5000);
      expect(getOperationTimeout(3000)).toBe(3000); // Should not exceed if already lower
    });
  });

  describe('getTestAwareDefaults', () => {
    it('should return all defaults set for test environment', () => {
      const defaults = getTestAwareDefaults();
      expect(defaults.enhancedMode).toBe(false);
      expect(defaults.knowledgeEnhancement).toBe(false);
      expect(defaults.enableMemoryIntegration).toBe(false);
      expect(defaults.timeout).toBe(5000);
    });

    it('should allow overriding specific defaults', () => {
      const defaults = getTestAwareDefaults({
        enhancedMode: true,
        timeout: 10000,
      });
      expect(defaults.enhancedMode).toBe(true);
      expect(defaults.knowledgeEnhancement).toBe(false);
      expect(defaults.enableMemoryIntegration).toBe(false);
      expect(defaults.timeout).toBe(10000);
    });
  });

  describe('mergeWithTestDefaults', () => {
    it('should merge user options with test defaults', () => {
      const userOptions = { enhancedMode: true };
      const merged = mergeWithTestDefaults(userOptions);

      expect(merged.enhancedMode).toBe(true); // User override
      expect(merged.knowledgeEnhancement).toBe(false); // Default
      expect(merged.enableMemoryIntegration).toBe(false); // Default
      expect(merged.timeout).toBe(5000); // Default
    });

    it('should preserve all user options', () => {
      const userOptions = {
        enhancedMode: true,
        knowledgeEnhancement: true,
        enableMemoryIntegration: true,
        timeout: 15000,
      };
      const merged = mergeWithTestDefaults(userOptions);

      expect(merged).toEqual(userOptions);
    });
  });
});
