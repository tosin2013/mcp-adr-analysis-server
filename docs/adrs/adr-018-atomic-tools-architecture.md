# ADR-018: Atomic Tools Architecture

**Status**: Accepted  
**Date**: 2025-12-16  
**Deciders**: Development Team  
**Related**: ADR-003 (Memory-Centric Architecture), ADR-005 (Testing Strategy), Issue #311 (Test Infrastructure Improvements)

## Context

The current tool architecture creates significant testing and performance challenges:

### Problems with Current Architecture

1. **Complex Orchestrator Classes**: Tools depend on orchestrator classes (`ResearchOrchestrator`, `KnowledgeGraphManager`) that create deep dependency chains
2. **Test Complexity**: Deep dependency trees require extensive ESM mocking with `jest.unstable_mockModule()`, resulting in:
   - 50+ lines of mock setup per test file
   - 300-400 line test files
   - 37+ timeout failures in CI
   - 850+ second test suite execution time
3. **Token Overhead**: Orchestrators execute sequentially, adding 2-8 seconds per call and 5,000-6,000 tokens per session
4. **Architecture Misalignment**: Orchestrators conflict with CE-MCP directive-based architecture (ADR-014)

### Test Suite Metrics (Before)

| Metric | Current State | Impact |
|--------|--------------|--------|
| Test suite time | 850+ seconds | Developer productivity loss |
| Timeout failures | 37+ tests | CI reliability issues |
| ESM mock setup | 50+ lines/test | High maintenance burden |
| Test file size | 300-400 lines | Reduced readability |
| Mock chains | Deep dependency trees | Brittle tests |

## Decision

We will adopt an **Atomic Tools Architecture** with **Dependency Injection** pattern:

### Core Principles

1. **Atomic Tools**: Each tool is self-contained with minimal external dependencies
2. **Dependency Injection**: External dependencies are injected as parameters with sensible defaults
3. **Resource-Based State**: Complex state managers (like `KnowledgeGraphManager`) converted to MCP Resources
4. **Direct Execution**: Tools call utilities directly instead of through orchestrator layers

### Architecture Pattern

**Old Pattern (Orchestrator-based)**:
```typescript
// Tool with deep dependencies
import { ResearchOrchestrator } from '../utils/research-orchestrator.js';
import { KnowledgeGraphManager } from '../utils/knowledge-graph-manager.js';

export async function myTool(args: ToolArgs) {
  const orchestrator = new ResearchOrchestrator(args.projectPath, 'docs/adrs');
  const result = await orchestrator.answerResearchQuestion(args.query);
  // ... complex logic with multiple orchestrator calls
}

// Test requires complex mocking
beforeAll(async () => {
  await setupESMMocks({
    '../../src/utils/research-orchestrator.js': { 
      ResearchOrchestrator: mockClass 
    },
    '../../src/utils/tree-sitter-analyzer.js': { 
      TreeSitterAnalyzer: mockClass 
    },
    '../../src/utils/file-system.js': { 
      analyzeProjectStructure: mock, 
      findRelatedCode: mock 
    },
    '../../src/utils/adr-discovery.js': { 
      discoverAdrsInDirectory: mock 
    },
    // ... 50+ lines of mocks
  });
  const module = await import('../../src/tools/my-tool.js');
});
```

**New Pattern (Atomic with DI)**:
```typescript
// Tool with dependency injection
import { findFiles, readFile } from '../utils/file-system.js';

interface ToolDependencies {
  fs?: {
    findFiles?: typeof findFiles;
    readFile?: typeof readFile;
  };
}

export async function myTool(
  args: ToolArgs, 
  deps: ToolDependencies = {}
) {
  // Use injected dependencies or real implementations
  const findFilesImpl = deps.fs?.findFiles ?? findFiles;
  const readFileImpl = deps.fs?.readFile ?? readFile;
  
  const files = await findFilesImpl(args.projectPath, '*.ts');
  const content = await readFileImpl(files[0]);
  // ... direct logic without orchestrator
  
  return formatMCPResponse(result);
}

// Test with simple DI
test('myTool finds files', async () => {
  const mockFs = {
    findFiles: jest.fn().mockResolvedValue(['file1.ts']),
    readFile: jest.fn().mockResolvedValue('content'),
  };
  
  const result = await myTool(
    { projectPath: '/test', query: 'auth' },
    { fs: mockFs }
  );
  
  expect(result.content[0].text).toContain('file1.ts');
});
```

### Resource Pattern for State

**Old Pattern (Stateful Manager)**:
```typescript
const kgManager = new KnowledgeGraphManager();
const snapshot = await kgManager.loadKnowledgeGraph();
const results = await kgManager.queryKnowledgeGraph("what ADRs exist?");
```

**New Pattern (Resource + Simple Tool)**:
```typescript
// Read graph - zero token cost via MCP Resource
const graph = await readResource('knowledge://graph');
const adrs = graph.nodes.filter(n => n.type === 'adr');

// Modify graph - use CRUD tool
await callTool('update_knowledge', {
  operation: 'add_entity',
  entity: 'adr-019',
  entityType: 'adr',
  metadata: { title: 'New Decision' }
});
```

## Target State (After Implementation)

| Metric | Before | After | Improvement |
|--------|--------|-------|-------------|
| Test suite time | 850s | <60s | 93% faster |
| Timeout failures | 37+ | ~0 | Eliminated |
| ESM mock setup | 50+ lines | 5-10 lines | 80-90% less |
| Test file size | 300-400 lines | 50-100 lines | 70-80% smaller |
| Mock chains | Deep trees | Flat DI | Simplified |

## Implementation Strategy

### Phase 1: Foundation
1. ✅ Document atomic tools pattern (this ADR)
2. Create atomic tool template with DI examples
3. Update test documentation
4. Mark `ResearchOrchestrator` as deprecated

### Phase 2: High-Priority Tool Migration
Convert tools with heaviest test burden:
1. `review-existing-adrs-tool.ts` - Currently uses ResearchOrchestrator
2. `adr-suggestion-tool.ts` - Currently uses ResearchOrchestrator
3. `environment-analysis-tool.ts` - Currently uses ResearchOrchestrator
4. Remaining tools as needed

### Phase 3: Test Infrastructure Cleanup
1. Simplify `esm-mock-helper.ts` (reduce to basic DI support)
2. Remove orchestrator mock factories
3. Update test setup documentation

### Phase 4: Validation
1. Full test suite passes in <60 seconds
2. Zero timeout failures in CI
3. Test coverage maintained or improved (≥85%)
4. CI reliability >99%

### Phase 5: Deprecation (Future)
- v3.0.0: Mark orchestrators as deprecated
- v4.0.0: Remove orchestrator classes entirely

## Migration Guide

### For Tool Developers

When creating new tools:

```typescript
// ✅ DO: Use dependency injection
export async function newTool(
  args: ToolArgs,
  deps: {
    fs?: typeof import('../utils/file-system.js');
    ai?: ReturnType<typeof getAIExecutor>;
  } = {}
) {
  const fs = deps.fs ?? await import('../utils/file-system.js');
  const ai = deps.ai ?? getAIExecutor();
  // ... implementation
}

// ❌ DON'T: Create orchestrator instances
export async function oldTool(args: ToolArgs) {
  const orchestrator = new ResearchOrchestrator(args.projectPath);
  const result = await orchestrator.answerResearchQuestion(args.query);
}
```

### For Test Writers

```typescript
// ✅ DO: Simple DI mocking
test('tool processes files', async () => {
  const mockFs = {
    readFile: jest.fn().mockResolvedValue('content')
  };
  
  const result = await myTool(
    { projectPath: '/test' },
    { fs: mockFs }
  );
  
  expect(mockFs.readFile).toHaveBeenCalledWith('/test/file.ts');
});

// ❌ DON'T: Complex ESM module mocking
beforeAll(async () => {
  await setupESMMocks({
    '../../src/utils/research-orchestrator.js': MockFactories.createResearchOrchestrator(),
    '../../src/utils/tree-sitter-analyzer.js': MockFactories.createTreeSitterAnalyzer(),
    // ... 50 more lines
  });
});
```

### For Existing Tools

Tools can be migrated incrementally:

1. Add optional `deps` parameter with defaults
2. Replace direct instantiation with injected dependencies
3. Update tests to use DI instead of ESM mocks
4. Remove orchestrator dependencies

Example PR: [See Phase 2 implementations]

## Consequences

### Positive

1. **Dramatic Test Speed Improvement**: 850s → <60s (93% faster)
2. **Eliminated Timeout Failures**: 37+ failures → ~0
3. **Simplified Test Code**: 50+ lines mock setup → 5-10 lines
4. **Improved Maintainability**: Smaller, clearer test files (50-100 lines vs 300-400)
5. **Better Tool Isolation**: Each tool is independently testable
6. **Zero Token Overhead**: No sequential orchestrator calls
7. **Alignment with CE-MCP**: Direct execution matches directive-based architecture
8. **Easy Onboarding**: New developers can understand and test tools quickly

### Negative

1. **Migration Effort**: Requires updating existing tools and tests
2. **Breaking Changes**: Tools with orchestrator dependencies need refactoring
3. **Coordination Required**: Multiple tools need to be migrated systematically

### Neutral

1. **Internal Orchestrators**: Can still be used internally for complex workflows
2. **Backward Compatibility**: Old tools continue working during migration
3. **Gradual Rollout**: Can be implemented incrementally

## Validation

### Success Criteria

1. ✅ Full test suite completes in <60 seconds
2. ✅ Zero timeout failures in CI pipeline
3. ✅ New tools can be tested in <20 lines of setup
4. ✅ Test coverage maintained at ≥85%
5. ✅ CI pipeline reliability >99%

### Monitoring

Track metrics after each phase:
- Test suite execution time
- Number of timeout failures
- Average test file size
- Average mock setup lines per test
- Test coverage percentage
- CI success rate

### Review Points

- After Phase 2: Review first 3 tool migrations
- After Phase 3: Validate test infrastructure improvements
- After Phase 4: Final validation against success criteria

## References

- **Issue #311**: Test Infrastructure Improvements (parent EPIC)
- **Issues #334-337**: Current test failures
- **ADR-003**: Memory-Centric Architecture
- **ADR-005**: Testing and Quality Assurance Strategy
- **ADR-014**: CE-MCP Architecture
- **docs/knowledge-graph-resource-tool.md**: Resource pattern example

## Notes

- This ADR supersedes the implicit orchestrator-based architecture
- Existing tools can continue using orchestrators during migration period
- The knowledge graph has already been converted to resource pattern (see docs/knowledge-graph-resource-tool.md)
- ResearchOrchestrator marked as deprecated in v2.x, removed in v4.0.0
