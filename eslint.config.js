// ESLint configuration for MCP ADR Analysis Server
// Simple flat config without TypeScript project dependencies

import js from '@eslint/js';
import tsPlugin from '@typescript-eslint/eslint-plugin';
import tsParser from '@typescript-eslint/parser';
import prettierConfig from 'eslint-config-prettier';

export default [
  // TypeScript files in src/ and tests/
  {
    files: ['src/**/*.ts', 'tests/**/*.ts'],
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        ecmaVersion: 2022,
        sourceType: 'module',
      },
      globals: {
        console: 'readonly',
        process: 'readonly',
        Buffer: 'readonly',
        __dirname: 'readonly',
        __filename: 'readonly',
        global: 'readonly',
        // Node.js timer functions
        setTimeout: 'readonly',
        setInterval: 'readonly',
        clearTimeout: 'readonly',
        clearInterval: 'readonly',
        setImmediate: 'readonly',
        clearImmediate: 'readonly',
        // Node.js types
        NodeJS: 'readonly',
        require: 'readonly',
        // Web APIs
        fetch: 'readonly',
        Response: 'readonly',
        Request: 'readonly',
        Headers: 'readonly',
        AbortController: 'readonly',
        URLSearchParams: 'readonly',
        URL: 'readonly',
        performance: 'readonly',
      },
    },
    plugins: {
      '@typescript-eslint': tsPlugin,
    },
    rules: {
      // JavaScript recommended rules
      ...js.configs.recommended.rules,

      // Basic TypeScript rules (without project)
      '@typescript-eslint/no-unused-vars': [
        'error',
        {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
        },
      ],
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/explicit-function-return-type': 'off',
      '@typescript-eslint/explicit-module-boundary-types': 'off',
      '@typescript-eslint/no-non-null-assertion': 'warn',

      // Code quality rules
      'no-console': 'off', // Allow console for MCP server
      'no-debugger': 'error',
      'no-unused-vars': 'off', // Handled by TypeScript
      'no-duplicate-imports': 'error',
      eqeqeq: ['error', 'always'],
      'no-var': 'error',
      'prefer-const': 'error',
      'prefer-arrow-callback': 'error',

      // Security rules
      'no-eval': 'error',
      'no-implied-eval': 'error',
      'no-new-func': 'error',
    },
  },

  // JavaScript files
  {
    files: ['**/*.{js,mjs}', '*.config.js'],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
      globals: {
        console: 'readonly',
        process: 'readonly',
        Buffer: 'readonly',
        __dirname: 'readonly',
        __filename: 'readonly',
        global: 'readonly',
        module: 'readonly',
        require: 'readonly',
        exports: 'readonly',
        // Node.js timer functions
        setTimeout: 'readonly',
        setInterval: 'readonly',
        clearTimeout: 'readonly',
        clearInterval: 'readonly',
        setImmediate: 'readonly',
        clearImmediate: 'readonly',
        // Node.js types
        NodeJS: 'readonly',
        // Web APIs
        fetch: 'readonly',
        Response: 'readonly',
        Request: 'readonly',
        Headers: 'readonly',
        AbortController: 'readonly',
        URLSearchParams: 'readonly',
        URL: 'readonly',
        performance: 'readonly',
      },
    },
    rules: {
      // JavaScript recommended rules only
      ...js.configs.recommended.rules,
      'no-console': 'off',
      'no-debugger': 'error',
      'no-unused-vars': [
        'error',
        {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
        },
      ],
      eqeqeq: ['error', 'always'],
      'no-var': 'error',
      'prefer-const': 'error',
    },
  },

  // Test files specific configuration
  {
    files: ['**/*.test.{ts,js}', '**/*.spec.{ts,js}', 'tests/**/*.{ts,js}'],
    languageOptions: {
      globals: {
        // Vitest globals (primary test framework)
        vi: 'readonly',
        Mock: 'readonly',
        MockedFunction: 'readonly',
        MockInstance: 'readonly',
        Mocked: 'readonly',
        // Jest globals (legacy/fallback)
        jest: 'readonly',
        // Common test globals
        describe: 'readonly',
        it: 'readonly',
        test: 'readonly',
        expect: 'readonly',
        beforeAll: 'readonly',
        beforeEach: 'readonly',
        afterAll: 'readonly',
        afterEach: 'readonly',
        // Node.js timer functions for tests
        setTimeout: 'readonly',
        setInterval: 'readonly',
        clearTimeout: 'readonly',
        clearInterval: 'readonly',
        setImmediate: 'readonly',
        clearImmediate: 'readonly',
        // Node.js types
        NodeJS: 'readonly',
        require: 'readonly',
        // Web APIs
        fetch: 'readonly',
        Response: 'readonly',
        Request: 'readonly',
        Headers: 'readonly',
        AbortController: 'readonly',
        URLSearchParams: 'readonly',
        URL: 'readonly',
        performance: 'readonly',
      },
    },
    rules: {
      // Relax some rules for tests
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-non-null-assertion': 'off',
      'no-console': 'off',
    },
  },

  // Ignore patterns
  {
    ignores: [
      'dist/**',
      'docs/api/**',
      'docs/build/**',
      'docs/.docusaurus/**',
      'node_modules/**',
      'coverage/**',
      '.mcp-adr-cache/**',
      '.mcp-migration-backups/**',
      '.tmp/**',
      'docs/.vitepress/**',
      'scripts/**',
      '*.d.ts',
      'build/**',
      'out/**',
      'tmp/**',
      'debug_test.js',
      'jest.config.js',
    ],
  },

  // Prettier integration (must be last to override conflicting rules)
  prettierConfig,
];
