import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    // Include both .test.ts and .vitest.ts files during migration
    include: ['tests/**/*.test.ts', 'tests/**/*.vitest.ts'],
    exclude: ['**/node_modules/**', '**/dist/**', '**/*.backup'],

    // Environment
    environment: 'node',

    // Globals like describe, it, expect available without imports
    globals: true,

    // TypeScript support
    typecheck: {
      enabled: false, // We have a separate typecheck script
    },

    // Timeouts - more generous than Jest defaults
    testTimeout: 30000,
    hookTimeout: 30000,

    // Reporter configuration
    reporters: ['default'],

    // Coverage configuration (replaces @vitest/coverage-v8)
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      include: ['src/**/*.ts'],
      exclude: ['src/**/*.d.ts', 'src/**/*.test.ts'],
    },

    // Pool configuration for Vitest 4.x (threads is now default)
    pool: 'threads',

    // Isolate tests for reliability
    isolate: true,

    // Better error output
    onConsoleLog: () => false, // Suppress console logs in test output

    // Setup files (equivalent to Jest's setupFilesAfterEnv)
    setupFiles: ['./tests/vitest.setup.ts'],
  },

  // ESBuild configuration for TypeScript
  esbuild: {
    target: 'node22',
  },

  // Resolve configuration
  resolve: {
    alias: {
      // Allow imports like 'src/...' if needed
    },
  },
});
