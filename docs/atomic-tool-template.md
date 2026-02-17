# Atomic Tool Template with Dependency Injection

This template provides a pattern for creating atomic MCP tools following ADR-018 principles.

## Template Structure

```typescript
/**
 * MCP Tool: [Tool Name]
 *
 * [Brief description of what the tool does]
 *
 * Following ADR-018 Atomic Tools Architecture:
 * - Self-contained with minimal external dependencies
 * - Dependency injection for testability
 * - Direct utility calls (no orchestrators)
 */

import { McpAdrError } from '../types/index.js';
import { formatMCPResponse } from '../utils/prompt-execution.js';
import {
  // Import utilities you need directly
  findFiles,
  readFile,
} from '../utils/file-system.js';
import { getAIExecutor } from '../utils/ai-executor.js';
import type { ConversationContext } from '../types/conversation-context.js';

/**
 * Tool arguments interface
 */
interface ToolArgs {
  projectPath?: string;
  // ... other required arguments
  conversationContext?: ConversationContext;
}

/**
 * Dependency injection interface
 * Define all external dependencies that can be mocked in tests
 */
interface ToolDependencies {
  fs?: {
    findFiles?: typeof findFiles;
    readFile?: typeof readFile;
  };
  ai?: ReturnType<typeof getAIExecutor>;
  // Add other dependencies as needed
}

/**
 * Tool result interface (optional but recommended)
 */
interface ToolResult {
  // Define your result structure
  success: boolean;
  data: any;
  message: string;
}

/**
 * Main tool function
 *
 * @param args - Tool arguments
 * @param deps - Injected dependencies (defaults to real implementations)
 * @returns MCP-formatted response
 */
export async function myAtomicTool(args: ToolArgs, deps: ToolDependencies = {}): Promise<any> {
  const { projectPath = process.cwd(), conversationContext } = args;

  try {
    // Inject dependencies or use real implementations
    const fs = deps.fs ?? { findFiles, readFile };
    const ai = deps.ai ?? getAIExecutor();

    // Validate input
    if (!projectPath) {
      throw new McpAdrError('INVALID_INPUT', 'projectPath is required', { projectPath });
    }

    // Main tool logic - direct calls to utilities
    const files = await fs.findFiles(projectPath, '*.ts');
    const fileContents = await Promise.all(files.map(file => fs.readFile(file)));

    // Use AI if needed
    const aiAvailable = ai.isAvailable();
    let analysis = 'Basic analysis (AI not available)';

    if (aiAvailable) {
      const aiResult = await ai.executeStructuredPrompt({
        prompt: 'Analyze these files...',
        // ... AI prompt details
      });
      analysis = aiResult.data.analysis;
    }

    // Build result
    const result: ToolResult = {
      success: true,
      data: {
        filesAnalyzed: files.length,
        analysis,
      },
      message: `Analyzed ${files.length} files successfully`,
    };

    // Format as MCP response
    return formatMCPResponse(JSON.stringify(result, null, 2));
  } catch (error) {
    // Error handling
    if (error instanceof McpAdrError) {
      throw error;
    }

    throw new McpAdrError('TOOL_ERROR', `Failed to execute myAtomicTool: ${error.message}`, {
      projectPath,
      error: error.message,
    });
  }
}

/**
 * Helper function (if needed)
 * Keep helpers private or in separate utility files
 */
function processData(data: any): any {
  // Helper logic
  return data;
}
```

## Test Template

```typescript
/**
 * Unit Tests for myAtomicTool
 *
 * Following ADR-018 testing pattern with dependency injection
 */

import { describe, it, expect, jest } from '@jest/globals';
import { myAtomicTool } from '../../src/tools/my-atomic-tool.js';
import { McpAdrError } from '../../src/types/index.js';

describe('My Atomic Tool', () => {
  describe('basic functionality', () => {
    it('processes files successfully', async () => {
      // Simple DI mocking - 5-10 lines
      const mockFs = {
        findFiles: jest.fn().mockResolvedValue(['file1.ts', 'file2.ts']),
        readFile: jest.fn().mockResolvedValue('export const test = true;'),
      };

      const mockAI = {
        isAvailable: jest.fn().mockReturnValue(true),
        executeStructuredPrompt: jest.fn().mockResolvedValue({
          data: { analysis: 'Test analysis result' },
        }),
      };

      // Call tool with mocked dependencies
      const result = await myAtomicTool(
        { projectPath: '/test/project' },
        { fs: mockFs, ai: mockAI }
      );

      // Assertions
      expect(result.content).toBeDefined();
      expect(result.content[0].type).toBe('text');
      expect(result.content[0].text).toContain('file1.ts');
      expect(mockFs.findFiles).toHaveBeenCalledWith('/test/project', '*.ts');
      expect(mockFs.readFile).toHaveBeenCalledTimes(2);
    });

    it('works without AI when unavailable', async () => {
      const mockFs = {
        findFiles: jest.fn().mockResolvedValue(['file1.ts']),
        readFile: jest.fn().mockResolvedValue('content'),
      };

      const mockAI = {
        isAvailable: jest.fn().mockReturnValue(false),
        executeStructuredPrompt: jest.fn(),
      };

      const result = await myAtomicTool({ projectPath: '/test' }, { fs: mockFs, ai: mockAI });

      expect(result.content[0].text).toContain('Basic analysis');
      expect(mockAI.executeStructuredPrompt).not.toHaveBeenCalled();
    });
  });

  describe('input validation', () => {
    it('throws error for invalid projectPath', async () => {
      await expect(myAtomicTool({ projectPath: '' })).rejects.toThrow(McpAdrError);
    });
  });

  describe('error handling', () => {
    it('handles file system errors gracefully', async () => {
      const mockFs = {
        findFiles: jest.fn().mockRejectedValue(new Error('FS Error')),
        readFile: jest.fn(),
      };

      await expect(myAtomicTool({ projectPath: '/test' }, { fs: mockFs })).rejects.toThrow(
        McpAdrError
      );
    });
  });
});
```

## Key Principles

### 1. Dependency Injection

```typescript
// ✅ DO: Optional deps parameter with defaults
export async function tool(args: Args, deps: Deps = {}) {
  const fs = deps.fs ?? realFs;
  // use fs
}

// ❌ DON'T: Direct instantiation
export async function tool(args: Args) {
  const orchestrator = new Orchestrator(); // Hard to test
}
```

### 2. Flat Dependencies

```typescript
// ✅ DO: Direct utility imports
import { findFiles } from '../utils/file-system.js';

// ❌ DON'T: Deep orchestrator chains
import { ResearchOrchestrator } from '../utils/research-orchestrator.js';
const orch = new ResearchOrchestrator();
const result = await orch.answerResearchQuestion(); // Multiple layers
```

### 3. Simple Testing

```typescript
// ✅ DO: Mock via DI (5-10 lines)
const mockFs = {
  findFiles: jest.fn().mockResolvedValue([]),
};
const result = await tool(args, { fs: mockFs });

// ❌ DON'T: Complex ESM mocking (50+ lines)
await setupESMMocks({
  '../../src/utils/orchestrator.js': mockClass,
  '../../src/utils/analyzer.js': mockClass,
  // ... many more mocks
});
```

### 4. AI Integration Pattern

```typescript
// Check availability before using
const ai = deps.ai ?? getAIExecutor();
if (ai.isAvailable()) {
  const result = await ai.executeStructuredPrompt({...});
} else {
  // Fallback to non-AI approach
}
```

## Migration Checklist

When converting an existing tool:

- [ ] Add `deps` parameter with `= {}` default
- [ ] Define `ToolDependencies` interface for all external deps
- [ ] Replace orchestrator calls with direct utility calls
- [ ] Update tests to use DI instead of ESM mocks
- [ ] Remove `setupESMMocks()` calls from tests
- [ ] Verify tests pass with `<10 lines` of mock setup
- [ ] Measure test execution time improvement
- [ ] Update tool documentation

## Benefits

1. **Fast Tests**: 5-10 line setup vs 50+ lines
2. **Isolated Testing**: Each dependency is independently mockable
3. **No Orchestrator Overhead**: Direct utility calls save 2-8 seconds
4. **Clear Dependencies**: Interface explicitly declares what tool needs
5. **Easy to Understand**: Flat structure vs deep chains
6. **Production-Ready**: Default parameters work in production without injection

## Anti-Patterns to Avoid

### ❌ Creating Complex State

```typescript
// DON'T: Create stateful managers
const manager = new StateManager();
await manager.initialize();
await manager.process();
await manager.finalize();
```

### ❌ Deep Call Chains

```typescript
// DON'T: Multiple layers of abstraction
const orch = new Orchestrator();
const analyzer = await orch.getAnalyzer();
const result = await analyzer.analyze();
```

### ❌ Hardcoded Dependencies

```typescript
// DON'T: No way to inject for testing
import { heavyDependency } from './heavy.js';
const result = heavyDependency.process(); // Can't mock
```

## Resources

- **ADR-018**: Atomic Tools Architecture
- **docs/knowledge-graph-resource-tool.md**: Resource pattern example
- **ADR-005**: Testing and Quality Assurance Strategy
- **Issue #311**: Test Infrastructure Improvements

## Examples

See these migrated tools for reference:

- `src/tools/search-codebase-tool.ts` (simple tool)
- `src/resources/knowledge-graph-resource.ts` (resource pattern)
- `src/tools/update-knowledge-tool.ts` (simple CRUD tool)
