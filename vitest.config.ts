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
      // 'lcov' is what Codecov consumes. Without it test.yml uploaded a file
      // that was never generated, and fail_ci_if_error: false hid the miss.
      reporter: ['text', 'json', 'html', 'lcov'],
      include: ['src/**/*.ts'],
      exclude: ['src/**/*.d.ts', 'src/**/*.test.ts'],
      // Set at the MEASURED floor, not an aspiration. README and CONTRIBUTING
      // claimed 80%/85% "enforced by Jest" -- the framework is Vitest and no
      // threshold existed anywhere, so the guarantee was fictional.
      //
      // Measure on CI, not locally. Same 126 files / 3048 tests, different
      // numbers: line coverage is 49.09% on macOS and 48.93% on ubuntu (both
      // node 20 and 22, run 32875733767). A first attempt set lines: 49 from
      // the local figure and CI failed by 0.07pp. CI is the environment that
      // gates, so CI is the number that counts.
      //
      // ubuntu floor: 48.97 stmt / 41.27 branch / 54.69 func / 48.93 lines.
      // Each threshold sits ~1pp under, which is the margin that survives the
      // platform gap. Ratchet them UP as coverage improves; never down to
      // accommodate a real drop -- lowering `lines` here corrects a floor
      // measured on the wrong machine, which is a different thing.
      thresholds: {
        statements: 48,
        branches: 41,
        functions: 54,
        lines: 48,
      },
    },

    // Pool configuration for Vitest 4.x (threads is now default)
    pool: 'threads',

    // Isolate tests for reliability
    isolate: true,

    // Better error output
    onConsoleLog: () => false, // Suppress console logs in test output

    // Setup files (equivalent to Jest's setupFilesAfterEnv)
    // Both files are needed: vitest.setup.ts for Vitest-specific setup,
    // setup.ts for custom matchers and test infrastructure
    setupFiles: ['./tests/vitest.setup.ts', './tests/setup.ts'],
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
