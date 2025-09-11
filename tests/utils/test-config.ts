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
    },
  },

  THOROUGH: {
    timeouts: { unit: 30000, integration: 120000, performance: 300000 },
    performance: {
      maxMemoryMB: 1024,
      maxDurationMs: { unit: 10000, integration: 60000, performance: 180000 },
    },
  },

  CI: {
    timeouts: { unit: 15000, integration: 60000, performance: 180000 },
    performance: {
      maxMemoryMB: 512,
      maxDurationMs: { unit: 5000, integration: 30000, performance: 120000 },
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

// Export singleton instance
export const testConfig = TestConfigManager.getInstance();
