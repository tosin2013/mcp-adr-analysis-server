---
tags:
  - testing
---

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

- [x] Install Vitest and dependencies
- [x] Create `vitest.config.ts`
- [x] Update `package.json` scripts
- [x] Migrate one test file as proof-of-concept

### Phase 2: Core Migration

- [ ] Migrate failing test files first (4 files, ~59 tests) — **deliberately left unchecked.** See Corrections.
- [x] Migrate tool tests (`tests/tools/`)
- [x] Migrate utility tests (`tests/utils/`)

### Phase 3: Complete Migration

- [x] Migrate integration tests
- [x] Migrate performance tests
- [x] Remove Jest dependencies
- [x] Update CI workflows

### Phase 4: Cleanup

- [x] Remove Jest configuration
- [x] Update documentation
- [x] Archive migration scripts

## Corrections

**2026-08-27 (#1462) — this ADR under-reported itself by twelve boxes.**

ADR-019 is `Accepted` and every migration box was unchecked, while the migration had in fact
completed. Verified individually before ticking, not assumed from the status:

| box                                                             | evidence                                                                                                                                             |
| --------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| Vitest installed                                                | `devDependencies.vitest` present                                                                                                                     |
| `vitest.config.ts`                                              | file exists                                                                                                                                          |
| `package.json` scripts                                          | `test` is `vitest run`                                                                                                                               |
| proof-of-concept, tool, utility, integration, performance tests | all present under `tests/`                                                                                                                           |
| Jest dependencies removed                                       | no `jest` / `ts-jest` / `@types/jest` in `package.json`                                                                                              |
| CI workflows updated                                            | no `jest` in `.github/workflows/*.yml`                                                                                                               |
| Jest configuration removed                                      | no `jest.config.*`                                                                                                                                   |
| migration scripts archived                                      | `scripts/migrate-to-vitest.sh` removed in this change — 73 lines, referenced nowhere, `retirement.py` returned `RETIREMENT_REVIEW`; git preserves it |

Zero files anywhere in `src/` or `tests/` still import from Jest.

### The one box left unchecked, and why

**"Migrate failing test files first (4 files, ~59 tests)."** This is not verifiable as
written and is not this ADR's to close.

The framework migration is complete, but **70 tests are skipped** across 14 files. #1477
measured 13 of them sharing one root cause: ESM mocking of `ResearchOrchestrator`, which is
also the ADR-018a violation in #1461. So the remaining work is not "finish migrating to
Vitest" — it is "make ESM mocking work in this codebase", which is #751's scope, gated on
#1461.

Ticking it would claim a completion that 70 skipped tests contradict. Leaving it unchecked
with the reason stated is the honest record; #751 and #1461 carry the work.

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
