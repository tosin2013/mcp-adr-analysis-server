# ADR-019: Migrate from Jest to Vitest for Testing

## Status

Accepted

## Date

2024-12-16

## Context

Our test suite has 2,585 tests across 96 test files. We're experiencing significant issues with Jest's ESM mocking capabilities:

### Current Problems

1. **59 test failures in CI** - Tests timeout in GitHub Actions that pass locally
2. **`jest.unstable_mockModule()` limitations** - The ESM mocking API is experimental and unreliable:
   - Requires async top-level imports (`await import()` after mock setup)
   - Mocks don't hoist like CommonJS `jest.mock()`
   - TypeScript type inference struggles with mocked types
   - Still marked "unstable" even in Jest 30
3. **Slow test execution** - ESM transformation overhead adds ~2-3x execution time
4. **Complex workarounds** - Tests need explicit `--experimental-vm-modules` flag and special patterns

### Failing Test Files (All Timeout Issues)

| File                                        | Duration | Failures |
| ------------------------------------------- | -------- | -------- |
| `deployment-guidance-tool.test.ts`          | 210s     | 12 tests |
| `troubleshoot-guided-workflow-tool.test.ts` | 377s     | 15 tests |
| `review-existing-adrs-tool.test.ts`         | 120s     | 10 tests |
| `adr-bootstrap-validation-tool.test.ts`     | 241s     | 22 tests |

### Alternatives Considered

1. **Stay with Jest + Increase Timeouts**: Doesn't solve the underlying ESM mocking issues
2. **Jest + Sinon**: Better mocking but doesn't solve ESM transformation overhead
3. **Jest + Dependency Injection**: High refactoring effort, same speed issues
4. **Vitest**: Native ESM support, faster execution, Jest-compatible API

## Decision

Migrate from Jest to Vitest for all testing.

### Why Vitest

1. **Native ESM Support**: No experimental flags, no transformation overhead
2. **3-5x Faster**: Leverages Vite's optimized module handling
3. **95% Jest Compatible**: Same `describe/it/expect` syntax, similar mocking API
4. **Better TypeScript**: Native support without Babel
5. **Simpler Mocking**: `vi.mock()` works like `jest.mock()` should have worked

### Migration Syntax Changes

```typescript
// Before (Jest ESM)
import { jest } from '@jest/globals';
jest.unstable_mockModule('../../src/utils/adr-discovery.js', () => ({
  discoverAdrsInDirectory: jest.fn(),
}));
const { generateDeploymentGuidance } = await import('../../src/tools/...');

// After (Vitest)
import { vi, describe, it, expect } from 'vitest';
vi.mock('../../src/utils/adr-discovery.js', () => ({
  discoverAdrsInDirectory: vi.fn(),
}));
import { generateDeploymentGuidance } from '../../src/tools/...'; // Normal import!
```

## Migration Plan

### Phase 1: Setup (This PR)

- [ ] Install Vitest and dependencies
- [ ] Create `vitest.config.ts`
- [ ] Update `package.json` scripts
- [ ] Migrate one test file as proof-of-concept

### Phase 2: Core Migration

- [ ] Migrate failing test files first (4 files, ~59 tests)
- [ ] Migrate tool tests (`tests/tools/`)
- [ ] Migrate utility tests (`tests/utils/`)

### Phase 3: Complete Migration

- [ ] Migrate integration tests
- [ ] Migrate performance tests
- [ ] Remove Jest dependencies
- [ ] Update CI workflows

### Phase 4: Cleanup

- [ ] Remove Jest configuration
- [ ] Update documentation
- [ ] Archive migration scripts

## Consequences

### Positive

- Faster test execution (3-5x improvement expected)
- Reliable ESM mocking without experimental flags
- Simpler test setup code
- Better TypeScript integration
- More active development and community support

### Negative

- One-time migration effort (~2-4 hours)
- Team needs to learn minor API differences
- Some Jest-specific features may need alternatives

### Neutral

- Test files need syntax updates (mostly search-replace)
- CI configuration needs updates
- Coverage reporting tools remain compatible

## References

- [Vitest Documentation](https://vitest.dev/)
- [Vitest Migration from Jest](https://vitest.dev/guide/migration.html)
- [Vitest vs Jest Comparison](https://vitest.dev/guide/comparisons)
- [Better Stack: Vitest vs Jest](https://betterstack.com/community/guides/scaling-nodejs/vitest-vs-jest/)
