export default {
  preset: 'ts-jest/presets/default-esm',
  extensionsToTreatAsEsm: ['.ts'],
  moduleNameMapper: {
    '^(\\.{1,2}/.*)\\.js$': '$1',
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
  setupFilesAfterEnv: ['<rootDir>/tests/setup.ts'],
  // Dynamic timeout based on test type - will be overridden by test infrastructure
  testTimeout: 15000,
  verbose: true,
  clearMocks: true,
  restoreMocks: true,
  // Enhanced error handling
  errorOnDeprecated: true,
  // Memory management
  logHeapUsage: true,
  // Improved test isolation
  resetMocks: true,
  resetModules: false, // Keep modules cached for performance
  // Concurrent test limits for resource management
  maxWorkers: process.env.CI ? 2 : '50%',
  // Test result processing
  testResultsProcessor: undefined,
  // Global setup/teardown for infrastructure
  globalSetup: undefined,
  globalTeardown: undefined,
  // Enhanced reporting
  reporters: [
    'default',
    ...(process.env.CI
      ? [['jest-junit', { outputDirectory: 'test-results', outputName: 'junit.xml' }]]
      : []),
  ],
  // Test environment options
  testEnvironmentOptions: {
    // Node.js specific options
    node: {
      // Increase memory limit for large tests
      max_old_space_size: process.env.CI ? 2048 : 4096,
    },
  },
};
