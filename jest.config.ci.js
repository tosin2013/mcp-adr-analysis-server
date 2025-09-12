export default {
  preset: 'ts-jest/presets/default-esm',
  extensionsToTreatAsEsm: ['.ts'],
  moduleNameMapper: {
    '^(\\.{1,2}/.*)\\.js$': '$1',
    // Mock ESM-only modules to avoid import issues in tests
    '^p-queue$': '<rootDir>/tests/__mocks__/p-queue.js',
    '^p-timeout$': '<rootDir>/tests/__mocks__/p-timeout.js',
  },
  testEnvironment: 'node',
  roots: ['<rootDir>/src', '<rootDir>/tests'],
  testMatch: ['**/__tests__/**/*.ts', '**/?(*.)+(spec|test).ts'],
  transform: {
    '^.+\\.ts$': [
      'ts-jest',
      {
        useESM: true,
        tsconfig: {
          module: 'ESNext',
          target: 'ES2022',
          moduleResolution: 'node',
        },
      },
    ],
  },
  // Jest 30.x compatibility: disable worker threads to allow dynamic imports
  workerThreads: false,
  // Force mock usage for problematic ESM modules
  setupFilesAfterEnv: ['<rootDir>/tests/setup.ci.ts'],
  clearMocks: true,
  resetMocks: true,
  // Jest 30.x compatibility: disable worker threads to allow dynamic imports
  workerThreads: false,
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/**/*.d.ts',
    '!src/**/__tests__/**',
    '!src/**/*.test.ts',
  ],
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov', 'html'],
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80,
    },
  },
  setupFilesAfterEnv: ['<rootDir>/tests/setup.ci.ts'],
  // CI-optimized timeout
  testTimeout: 30000,
  verbose: true,
  clearMocks: true,
  restoreMocks: true,
  // Enhanced error handling
  errorOnDeprecated: true,
  // CI-safe memory management - DISABLE memory monitoring that causes uv_resident_set_memory errors
  logHeapUsage: false,
  // Improved test isolation for CI
  resetMocks: true,
  resetModules: false, // Keep modules cached for performance
  // CI-optimized worker limits
  maxWorkers: 1,
  // CI-safe handle detection - DISABLE to prevent CI errors
  detectOpenHandles: false,
  // Test result processing
  testResultsProcessor: undefined,
  // Global setup/teardown for infrastructure
  globalSetup: undefined,
  globalTeardown: undefined,
  // Enhanced reporting
  reporters: ['default'],
  // CI-safe test environment options
  testEnvironmentOptions: {
    // Node.js specific options for CI
    node: {
      // Conservative memory limit for CI
      max_old_space_size: 2048,
    },
  },
};
