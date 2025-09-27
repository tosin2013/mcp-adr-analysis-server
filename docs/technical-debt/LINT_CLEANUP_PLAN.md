# ESLint Cleanup Plan

## Overview

The codebase currently has **656 ESLint warnings** that are all `@typescript-eslint/no-explicit-any` violations. This technical debt should be addressed systematically to improve type safety and code quality.

## Assessment Summary

### ✅ Smart Code Linking (New Features) - CLEAN

- **Status**: All lint issues resolved
- **Files**: `ripgrep-wrapper.ts`, `interactive-adr-planning-tool.ts`
- **Impact**: Our new Smart Code Linking contribution is completely clean

### ⚠️ Existing Codebase - 656 Warnings

- **Primary Issue**: `@typescript-eslint/no-explicit-any` violations
- **Main File**: `src/index.ts` (majority of violations)
- **Root Cause**: MCP server integration uses dynamic tool argument handling

## Systematic Cleanup Strategy

### Phase 1: Critical Infrastructure (Priority 1)

**Target**: Core server infrastructure and utilities

- `src/index.ts` - MCP server tool handlers
- `src/utils/` - Core utilities that affect multiple tools
- **Estimated Impact**: ~300-400 warnings
- **Timeline**: 2-3 development sessions

### Phase 2: Tool-Specific Cleanup (Priority 2)

**Target**: Individual tool implementations

- `src/tools/` - Each tool file individually
- **Estimated Impact**: ~200-300 warnings
- **Timeline**: 4-6 development sessions (can be parallelized)

### Phase 3: Test Infrastructure (Priority 3)

**Target**: Test files and development utilities

- `tests/` directory
- Development scripts
- **Estimated Impact**: ~50-100 warnings
- **Timeline**: 1-2 development sessions

## Technical Approach

### 1. MCP Tool Arguments Pattern

**Problem**: Tool handlers receive `any` arguments from MCP protocol

```typescript
// Current problematic pattern
async function handleTool(args: any): Promise<any> {
  const { input1, input2 } = args;
  // ...
}
```

**Solution**: Define proper TypeScript interfaces

```typescript
// Define tool-specific interfaces
interface ToolArgs {
  input1: string;
  input2?: number;
  // ... other properties
}

async function handleTool(args: ToolArgs): Promise<ToolResult> {
  const { input1, input2 } = args;
  // ...
}
```

### 2. Dynamic Property Access

**Problem**: Dynamic access to tool arguments

```typescript
const value = args[propertyName]; // any type
```

**Solution**: Type-safe property access

```typescript
const value = propertyName in args ? args[propertyName] : undefined;
// or use proper type guards
```

### 3. Error Handling

**Problem**: Catch blocks with `any` error types

```typescript
catch (error: any) {
  // Already fixed in Smart Code Linking files
}
```

**Solution**: Proper error typing (already implemented)

```typescript
catch (error: unknown) {
  const errorMessage = error instanceof Error ? error.message : String(error);
  // ...
}
```

## Implementation Guidelines

### 1. Tool Interface Generation

Create TypeScript interfaces for each MCP tool:

- Extract argument patterns from tool implementations
- Define return type interfaces
- Add JSDoc documentation for MCP integration

### 2. Incremental Approach

- Fix one tool at a time to avoid breaking changes
- Maintain backward compatibility with MCP protocol
- Run tests after each tool cleanup

### 3. Type Safety Validation

- Add type guards for argument validation
- Implement runtime type checking where needed
- Maintain MCP protocol compliance

## Risk Assessment

### Low Risk

- ✅ Smart Code Linking features (already clean)
- ✅ Utility functions with clear interfaces
- ✅ Test files (isolated from production)

### Medium Risk

- ⚠️ Individual tool handlers (well-isolated)
- ⚠️ Cache and logging utilities (extensive test coverage)

### High Risk

- 🔴 Core MCP server integration (`src/index.ts`)
- 🔴 Dynamic tool routing and argument handling

## Success Metrics

### Target Goals

- **Phase 1**: Reduce warnings by 60% (400+ warnings → 250 warnings)
- **Phase 2**: Reduce warnings by 80% (250 warnings → 130 warnings)
- **Phase 3**: Reduce warnings by 95% (130 warnings → 30 warnings)
- **Final Goal**: <50 warnings total (strategic `any` types only)

### Quality Gates

- All tests must pass after each phase
- No runtime regressions
- MCP protocol compliance maintained
- Performance benchmarks maintained

## Next Steps

### Immediate Actions

1. ✅ **COMPLETED**: Fix Smart Code Linking lint issues
2. **CURRENT**: Document systematic cleanup plan
3. **NEXT**: Begin Phase 1 with core utilities cleanup

### Development Workflow

1. Create feature branch for lint cleanup
2. Fix one tool/utility at a time
3. Run full test suite after each change
4. Commit incremental improvements
5. Create PR when phase is complete

## Notes

- This cleanup represents **technical debt paydown** rather than new feature work
- The 656 warnings don't affect functionality but reduce type safety
- Smart Code Linking implementation followed best practices and is already clean
- Core MCP functionality is working correctly despite the lint warnings

---

**Priority**: Medium (Technical Debt)
**Impact**: High (Type Safety & Code Quality)
**Effort**: Large (656 warnings across multiple files)
**Risk**: Low-Medium (Well-tested codebase with comprehensive coverage)
