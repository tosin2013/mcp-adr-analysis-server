import js from '@eslint/js';
import typescript from '@typescript-eslint/eslint-plugin';
import typescriptParser from '@typescript-eslint/parser';

export default [
  js.configs.recommended,
  {
    files: ['src/**/*.ts', 'tests/**/*.ts'],
    languageOptions: {
      parser: typescriptParser,
      parserOptions: {
        ecmaVersion: 2022,
        sourceType: 'module',
        project: './tsconfig.json'
      },
      globals: {
        console: 'readonly',
        process: 'readonly',
        Buffer: 'readonly',
        __dirname: 'readonly',
        __filename: 'readonly',
        global: 'readonly',
        module: 'readonly',
        require: 'readonly'
      }
    },
    plugins: {
      '@typescript-eslint': typescript
    },
    rules: {
      // TypeScript specific rules - relaxed for MCP server
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
      '@typescript-eslint/no-explicit-any': 'off', // Allow any for MCP dynamic data
      '@typescript-eslint/explicit-function-return-type': 'off',

      // General code quality - relaxed for MCP server
      'no-console': 'off', // Allow console for MCP server logging
      'no-debugger': 'error',
      'no-var': 'error',
      'prefer-const': 'error',
      'prefer-arrow-callback': 'error',
      'arrow-spacing': 'error',
      'comma-dangle': ['error', 'never'],
      'quotes': ['error', 'single'],
      'semi': ['error', 'always'],
      'no-unused-vars': ['error', { argsIgnorePattern: '^_' }],

      // Security and best practices
      'no-eval': 'error',
      'no-implied-eval': 'error',
      'no-new-func': 'error',
      'no-script-url': 'error',

      // Node.js specific - allow for main entry point
      'no-process-exit': 'off',
      'no-sync': 'warn'
    }
  },
  {
    files: ['tests/**/*.ts'],
    languageOptions: {
      globals: {
        jest: 'readonly',
        expect: 'readonly',
        describe: 'readonly',
        it: 'readonly',
        test: 'readonly',
        beforeAll: 'readonly',
        afterAll: 'readonly',
        beforeEach: 'readonly',
        afterEach: 'readonly'
      }
    },
    rules: {
      '@typescript-eslint/no-explicit-any': 'off',
      'no-console': 'off',
      'no-unused-vars': 'off', // Allow unused vars in tests
      '@typescript-eslint/no-unused-vars': 'off'
    }
  },
  {
    ignores: [
      'dist/',
      'node_modules/',
      '.mcp-adr-cache/',
      'coverage/',
      '*.js'
    ]
  }
];
