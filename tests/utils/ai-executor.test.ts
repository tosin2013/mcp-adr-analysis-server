/**
 * Simplified AI Executor Tests - Focusing on core functionality
 * Using a more pragmatic approach to avoid complex mocking issues
 */

import { jest } from '@jest/globals';

// Simple test to verify the AI executor can be imported and basic functionality works
describe('AIExecutor - Simplified Tests', () => {
  it('should be importable without errors', async () => {
    // This test verifies that the module can be imported without throwing errors
    const module = await import('../../src/utils/ai-executor.js');
    expect(module.AIExecutor).toBeDefined();
    expect(module.getAIExecutor).toBeDefined();
    expect(module.resetAIExecutor).toBeDefined();
  });

  it('should handle disabled AI execution gracefully', async () => {
    // Test with environment that disables AI execution
    const originalEnv = process.env.EXECUTION_MODE;
    process.env.EXECUTION_MODE = 'prompt-only';

    try {
      const { AIExecutor } = await import('../../src/utils/ai-executor.js');
      const executor = new AIExecutor();

      // Should not be available when execution is disabled
      expect(executor.isAvailable()).toBe(false);

      // Should throw appropriate error when trying to execute
      await expect(executor.executePrompt('test')).rejects.toThrow();
    } finally {
      // Restore original environment
      if (originalEnv !== undefined) {
        process.env.EXECUTION_MODE = originalEnv;
      } else {
        delete process.env.EXECUTION_MODE;
      }
    }
  });

  it('should handle missing API key gracefully', async () => {
    // Test with missing API key
    const originalApiKey = process.env.OPENROUTER_API_KEY;
    const originalMode = process.env.EXECUTION_MODE;

    delete process.env.OPENROUTER_API_KEY;
    process.env.EXECUTION_MODE = 'full';

    try {
      const { AIExecutor } = await import('../../src/utils/ai-executor.js');
      const executor = new AIExecutor();

      // Should not be available without API key
      expect(executor.isAvailable()).toBe(false);
    } finally {
      // Restore original environment
      if (originalApiKey !== undefined) {
        process.env.OPENROUTER_API_KEY = originalApiKey;
      }
      if (originalMode !== undefined) {
        process.env.EXECUTION_MODE = originalMode;
      } else {
        delete process.env.EXECUTION_MODE;
      }
    }
  });

  it('should provide configuration management', async () => {
    const { AIExecutor } = await import('../../src/utils/ai-executor.js');
    const executor = new AIExecutor();

    // Should have a config
    const config = executor.getConfig();
    expect(config).toBeDefined();
    expect(typeof config.apiKey).toBe('string');
    expect(typeof config.executionMode).toBe('string');

    // Should be able to update config
    const originalTemp = config.temperature;
    executor.updateConfig({ temperature: 0.5 });
    expect(executor.getConfig().temperature).toBe(0.5);

    // Restore original
    executor.updateConfig({ temperature: originalTemp });
  });

  it('should provide cache management', async () => {
    const { AIExecutor } = await import('../../src/utils/ai-executor.js');
    const executor = new AIExecutor();

    // Should have cache stats
    const stats = executor.getCacheStats();
    expect(stats).toBeDefined();
    expect(typeof stats.size).toBe('number');
    expect(typeof stats.hitRate).toBe('number');

    // Should be able to clear cache
    executor.clearCache();
    expect(executor.getCacheStats().size).toBe(0);
  });

  it('should provide singleton functionality', async () => {
    const { getAIExecutor, resetAIExecutor } = await import('../../src/utils/ai-executor.js');

    // Should return same instance
    const executor1 = getAIExecutor();
    const executor2 = getAIExecutor();
    expect(executor1).toBe(executor2);

    // Should create new instance after reset
    resetAIExecutor();
    const executor3 = getAIExecutor();
    expect(executor1).not.toBe(executor3);
  });
});
