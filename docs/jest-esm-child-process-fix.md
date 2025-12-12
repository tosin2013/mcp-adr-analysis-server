# Jest ESM child_process Mock Fix

## Problem

Jest's ESM mode (`--experimental-vm-modules`) has known issues with resolving Node.js built-in modules like `child_process` when they are used in dynamically imported modules. This causes tests that use `await import()` to fail with errors like:

```
SyntaxError: The requested module 'node:child_process' does not provide an export named 'exec'
```

## Root Cause

When Jest's VM module loader processes dynamic imports in ESM mode, it has trouble resolving built-in Node.js modules, particularly when:

1. A test file uses `await import('../src/index.js')`
2. The imported module (or its dependencies) uses named imports from `child_process`
3. Node.js internally resolves `'child_process'` to `'node:child_process'` in ESM mode
4. Jest's VM module loader fails to properly intercept the module

## Solution

We've implemented a global mock for `child_process` in the Jest configuration (`jest.config.js`), similar to how tree-sitter native modules are mocked. This provides a test-friendly implementation that intercepts both `'child_process'` and `'node:child_process'` imports.

### Files Added

1. **`tests/__mocks__/child_process.ts`** - Mock implementation providing all major child_process functions:
   - `exec`, `execSync`
   - `spawn`, `fork`
   - `execFile`, `execFileSync`

2. **`tests/jest-esm-child-process-fix.test.ts`** - Test suite validating the fix works correctly

### Configuration Changes

**`jest.config.js`** - Added moduleNameMapper entries:

```javascript
moduleNameMapper: {
  // Mock child_process to fix Jest ESM dynamic import issues with node: prefix
  '^child_process$': '<rootDir>/tests/__mocks__/child_process.ts',
  '^node:child_process$': '<rootDir>/tests/__mocks__/child_process.ts',
  // ... other mappings
}
```

## Benefits

1. **Global Solution**: No need to use `jest.unstable_mockModule()` in individual test files
2. **Consistent**: All tests automatically use the mock when child_process is imported
3. **Maintainable**: Single mock file to update if behavior needs to change
4. **Test-Friendly**: Mock functions return safe defaults that can be overridden in specific tests

## Usage in Tests

### Before (Required per-test mocking):

```typescript
// Had to add this to every test file that dynamically imports modules using child_process
const mockExecSync = jest.fn();
jest.unstable_mockModule('child_process', () => ({
  execSync: mockExecSync,
}));

// Then later...
const { McpAdrAnalysisServer } = await import('../src/index.js');
```

### After (Automatic with global mock):

```typescript
// Just import - the mock is already in place!
const { McpAdrAnalysisServer } = await import('../src/index.js');

// Override behavior in specific tests if needed:
import { execSync } from 'child_process';
jest.mocked(execSync).mockReturnValue('custom output');
```

## Testing the Fix

Run the validation tests:

```bash
npm test tests/jest-esm-child-process-fix.test.ts
```

Or run the originally affected tests:

```bash
npm test tests/smart-git-push.test.ts
```

## Related Issues

- Jest Issue: https://github.com/jestjs/jest/issues/12270
- Node.js ESM module resolution changes
- Jest's VM module loader limitations

## References

- `tests/__mocks__/child_process.ts` - Mock implementation
- `tests/jest-esm-child-process-fix.test.ts` - Validation tests
- `jest.config.js` - Configuration changes
