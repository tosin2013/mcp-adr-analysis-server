/**
 * Test-Aware Defaults Utility
 *
 * Provides environment-aware defaults that disable expensive operations during testing.
 * This improves test performance and reduces timeouts without changing production behavior.
 *
 * @see Issue #309 - Add environment-aware test defaults to reduce timeouts
 */

/**
 * Check if we're running in a test environment
 */
export function isTestEnvironment(): boolean {
  return (
    process.env['NODE_ENV'] === 'test' ||
    process.env['JEST_WORKER_ID'] !== undefined ||
    process.env['VITEST'] !== undefined
  );
}

/**
 * Get environment-aware default for enhanced mode
 * Disabled in test environments to reduce timeouts
 */
export function getEnhancedModeDefault(): boolean {
  return !isTestEnvironment();
}

/**
 * Get environment-aware default for knowledge enhancement (GKP)
 * Disabled in test environments to reduce timeouts
 */
export function getKnowledgeEnhancementDefault(): boolean {
  return !isTestEnvironment();
}

/**
 * Get environment-aware default for memory integration
 * Disabled in test environments to reduce timeouts
 */
export function getMemoryIntegrationDefault(): boolean {
  return !isTestEnvironment();
}

/**
 * Get environment-aware timeout for operations
 * Shorter timeouts in test environments
 */
export function getOperationTimeout(defaultTimeout: number = 30000): number {
  if (isTestEnvironment()) {
    return Math.min(defaultTimeout, 5000); // Max 5s in tests
  }
  return defaultTimeout;
}

/**
 * Test defaults configuration object
 * Use this for passing all defaults at once
 */
export interface TestAwareDefaults {
  enhancedMode: boolean;
  knowledgeEnhancement: boolean;
  enableMemoryIntegration: boolean;
  timeout: number;
}

/**
 * Get all test-aware defaults at once
 */
export function getTestAwareDefaults(options?: {
  enhancedMode?: boolean;
  knowledgeEnhancement?: boolean;
  enableMemoryIntegration?: boolean;
  timeout?: number;
}): TestAwareDefaults {
  const isTest = isTestEnvironment();

  return {
    enhancedMode: options?.enhancedMode ?? !isTest,
    knowledgeEnhancement: options?.knowledgeEnhancement ?? !isTest,
    enableMemoryIntegration: options?.enableMemoryIntegration ?? !isTest,
    timeout: options?.timeout ?? (isTest ? 5000 : 30000),
  };
}

/**
 * Merge user options with test-aware defaults
 * User-provided options always take precedence
 */
export function mergeWithTestDefaults<T extends Partial<TestAwareDefaults>>(
  userOptions: T
): T & TestAwareDefaults {
  const defaults = getTestAwareDefaults();

  return {
    ...defaults,
    ...userOptions,
  };
}
