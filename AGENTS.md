# Agent Development Guide

This file provides context and guidance for AI agents (including GitHub Copilot) working on the MCP ADR Analysis Server project.

## Current Project Status

**Branch**: `feature/memory-centric-architecture-phase1`
**Phase**: Phase 1 - Memory-Centric Architecture Transition
**Goal**: Complete TypeScript error fixes to enable Phase 2 development

## Architecture Overview

### Memory-Centric Architecture (NEW)

The project is transitioning from a legacy TODO system to a memory-centric architecture:

**Core Components:**

- `src/utils/knowledge-graph-manager.ts` - Central knowledge graph management
- `src/utils/memory-entity-manager.ts` - Memory entity lifecycle management
- `src/utils/memory-transformation.ts` - Data transformation for memory entities
- `src/utils/todo-file-watcher.ts` - File system integration

### Deprecated Components (REMOVED)

These have been replaced and should NOT be used:

- ❌ `TodoJsonManager` - Use memory-centric task management instead
- ❌ `ProjectHealthScoring` - Use relationship-based importance instead
- ❌ Legacy TODO system utilities (performance-optimizer, task-id-resolver, etc.)

## Current Issues Requiring Fixes

### Critical TypeScript Errors

#### 1. `src/utils/knowledge-graph-manager.ts`

**Lines**: 99-103, 121-125, 128, 309, 325-332, 342-346, 373-380

**Issues:**

- Missing properties on health score objects: `taskCompletion`, `deploymentReadiness`, `architectureCompliance`, `securityPosture`, `codeQuality`, `confidence`
- Missing type definition for `ProjectHealthScore`

**Fix Strategy:**

```typescript
// Add missing type definition
interface ProjectHealthScore {
  overall: number;
  components: Record<string, any>;
  timestamp: string;
  taskCompletion?: number;
  deploymentReadiness?: number;
  architectureCompliance?: number;
  securityPosture?: number;
  codeQuality?: number;
  confidence?: number;
}

// Update health score objects to include missing properties
const healthScore: ProjectHealthScore = {
  overall: 85,
  components: {},
  timestamp: new Date().toISOString(),
  taskCompletion: 0,
  deploymentReadiness: 0,
  architectureCompliance: 0,
  securityPosture: 0,
  codeQuality: 0,
  confidence: 0,
};
```

#### 2. `src/utils/memory-entity-manager.ts`

**Lines**: 44, 143, 149, 253, 782-788

**Issues:**

- Logger config type mismatch (line 44)
- Missing `MemoryEntitySchema` type (line 143)
- Type issues with `MemoryEvolutionEvent` and `MemoryRelationship` (lines 149, 253)
- Index signature property access issues (lines 782-788)

**Fix Strategy:**

```typescript
// Fix logger config
import { createComponentLogger, LoggerConfig } from './enhanced-logging.js';
const logger = createComponentLogger('MemoryEntityManager', {
  enablePerformanceMetrics: true,
} as LoggerConfig);

// Add missing schema type
interface MemoryEntitySchema {
  id: string;
  type: string;
  // Add other required properties
}

// Fix property access with bracket notation
entity['title'] = data.title;
entity['description'] = data.description;
```

#### 3. `src/utils/memory-transformation.ts`

**Lines**: 23, 160, 281, 286, 291, 340, 346, 602, 709, 714

**Issues:**

- Unused variable `memoryManager` (line 23)
- Potential undefined type issues
- Unused variable `contentLower` (line 709)

**Fix Strategy:**

```typescript
// Remove unused variables
// const memoryManager = ... // Remove if unused

// Add null checks
if (entity && entity.id) {
  await someFunction(entity.id);
}

// Use non-null assertion or optional chaining where appropriate
const id = entity?.id ?? 'default-id';
```

## Development Guidelines

### TypeScript Compliance

- Target: ES2022
- Strict mode: enabled
- All files must pass `npm run typecheck` without errors
- Use proper null safety and type assertions

### Memory-Centric Patterns

- Use knowledge graph relationships instead of direct task references
- Implement entity-based data modeling
- Maintain referential integrity through relationship management

### Testing Requirements

- All changes must not break existing tests
- Focus on unit tests for new functionality
- Integration tests for knowledge graph operations

## Commands for Verification

```bash
# Check TypeScript errors
npm run typecheck

# Run tests
npm test

# Build the project
npm run build

# Run linting
npm run lint
```

## Phase 2 Readiness Criteria

✅ **Must be completed before Phase 2:**

1. Zero TypeScript compilation errors
2. All tests passing
3. Clean build process
4. Memory-centric architecture fully operational

❌ **Current blockers:**

- TypeScript errors in memory-centric files
- Type definition gaps
- Null safety issues

## AI Agent Instructions

When working on this codebase:

1. **Always check TypeScript errors first** with `npm run typecheck`
2. **Focus on the memory-centric architecture files** listed above
3. **Do not use deprecated TODO system components**
4. **Add proper type definitions** rather than using `any`
5. **Use null safety patterns** (`?.`, `??`, proper checks)
6. **Test your changes** with `npm test` before committing
7. **Follow the existing code patterns** in memory-centric files

## Examples of Proper Fixes

### ✅ Good Type Definition

```typescript
interface CompleteHealthScore {
  overall: number;
  components: Record<string, any>;
  timestamp: string;
  taskCompletion: number;
  deploymentReadiness: number;
  architectureCompliance: number;
  securityPosture: number;
  codeQuality: number;
  confidence: number;
}
```

### ✅ Good Null Safety

```typescript
if (data && data.tasks && Object.keys(data.tasks).length > 0) {
  const tasks = Object.values(data.tasks);
  // Process tasks safely
}
```

### ❌ Avoid These Patterns

```typescript
// Don't use any without justification
const result: any = someFunction();

// Don't access properties without checks
const value = data.tasks.someProperty; // Could throw if data.tasks is undefined

// Don't use deprecated managers
const todoManager = new TodoJsonManager(); // This is deprecated
```

---

**Last Updated**: 2025-09-15
**Phase**: 1 - Memory-Centric Architecture Transition
**Next Milestone**: Phase 2 - Advanced Memory Operations
