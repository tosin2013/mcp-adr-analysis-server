# ADR-020: MCP Tasks Integration Strategy

## Status

Accepted (Phase 1 Complete)

## Date

2025-12-17

## Context

The Model Context Protocol (MCP) 2025-11-25 specification introduced **Tasks** as a new primitive for tracking durable, long-running operations. Tasks are state machines that allow servers to manage expensive computations, batch processing, and operations that may take significant time to complete.

### MCP Tasks Overview

From the [MCP Specification 2025-11-25](https://modelcontextprotocol.io/specification/2025-11-25/basic/utilities/tasks):

- **Tasks** are durable state machines for tracking long-running operations
- **Lifecycle states**: `working`, `input_required`, `completed`, `failed`, `cancelled`
- **Task Creation**: Tasks are created **implicitly** by tools returning `CreateTaskResult` (not via explicit `tasks/create` endpoint)
- **Key methods** (SDK request schemas):
  - `GetTaskRequestSchema` (`tasks/get`) - Get task status and progress
  - `ListTasksRequestSchema` (`tasks/list`) - List all tasks
  - `GetTaskPayloadRequestSchema` (`tasks/result`) - Get final task result payload
  - `CancelTaskRequestSchema` (`tasks/cancel`) - Cancel an in-progress task
- **Use cases**: Expensive computations, batch processing, operations requiring progress tracking

> **Important SDK Behavior**: Unlike a REST-style API, MCP Tasks do not have a `tasks/create` endpoint. Tasks are created as a side effect when a tool returns a `CreateTaskResult` containing task metadata. This design ties task creation directly to tool execution.

### Current Server Architecture

The mcp-adr-analysis-server currently has several tools that implement custom long-running operation tracking:

1. **Bootstrap Validation Loop Tool** (`src/tools/bootstrap-validation-loop-tool.ts`)
   - Self-learning deployment validation system
   - Executes multiple phases: generate scripts, execute, capture learnings, update ADRs
   - Custom `BootstrapExecutionResult` with `executionId`, `timestamp`, progress tracking
   - DAG-based parallel execution via `DAGExecutor`

2. **Deployment Readiness Tool** (`src/tools/deployment-readiness-tool.ts`)
   - Multi-phase deployment validation with test failure tracking
   - Custom result interfaces: `TestValidationResult`, `TestSuiteResult`
   - History analysis and pattern recognition
   - Memory integration for deployment assessment tracking

3. **Tool Chain Orchestrator** (`src/tools/tool-chain-orchestrator.ts`)
   - **Already deprecated** for CE-MCP migration
   - Step dependencies, retry logic, conditional execution
   - Custom step tracking with `dependsOn`, `retryable`, `conditional`

4. **DAG Executor** (`src/utils/dag-executor.ts`)
   - Directed Acyclic Graph execution engine
   - Parallel task execution with dependency resolution
   - Custom `TaskNode` interface with `retryCount`, `retryDelay`, `canFailSafely`

5. **Research Tools** (`perform-research-tool.ts`, `research-integration-tool.ts`)
   - Multi-step research workflows
   - Custom progress tracking

6. **Interactive ADR Planning Tool** (`src/tools/interactive-adr-planning-tool.ts`)
   - 7-phase guided ADR creation workflow
   - Phases: problem_definition → research_analysis → option_exploration → decision_making → impact_assessment → implementation_planning → adr_generation
   - Session-based with persistent state across tool calls
   - Uses ResearchOrchestrator for context gathering
   - Generates TODOs from architectural decisions

7. **Troubleshoot Guided Workflow Tool** (`src/tools/troubleshoot-guided-workflow-tool.ts`)
   - Systematic troubleshooting with multiple operations: `analyze_failure`, `generate_test_plan`, `full_workflow`
   - Memory integration via `TroubleshootingMemoryManager` for session persistence
   - Stores troubleshooting sessions with effectiveness tracking
   - Related ADR lookup, follow-up action determination
   - Already deprecated for CE-MCP (returns state machine directives)

### SDK Version Consideration

- Previous SDK: `@modelcontextprotocol/sdk@^1.19.1`
- Updated SDK: `@modelcontextprotocol/sdk@^1.25.1` (completed)
- Tasks support enabled via SDK upgrade

## Decision

We will integrate MCP Tasks into the mcp-adr-analysis-server to provide standardized, protocol-compliant long-running operation tracking. This integration will:

### Phase 1: SDK Upgrade and Infrastructure

1. Upgrade `@modelcontextprotocol/sdk` from `^1.19.1` to `^1.25.1`
2. Implement `TaskManager` utility class to abstract MCP Tasks operations
3. Add task lifecycle handlers in `src/index.ts`

### Phase 2: Tool Migration (Priority Order)

#### High Priority - Replace Custom Implementations

| Tool                           | Current Implementation         | MCP Tasks Benefit                                               |
| ------------------------------ | ------------------------------ | --------------------------------------------------------------- |
| `bootstrap_validation_loop`    | Custom `executionId`, phases   | Standardized progress, cancellation support                     |
| `deployment_readiness`         | Custom history tracking        | Protocol-compliant state persistence                            |
| `tool_chain_orchestrator`      | Already deprecated             | Direct replacement with Tasks                                   |
| `troubleshoot_guided_workflow` | Custom memory session tracking | Track full_workflow with session effectiveness                  |
| `interactive_adr_planning`     | Custom 7-phase session state   | Track ADR planning workflow with phase progress (14% per phase) |

#### Medium Priority - Enhance with Tasks

| Tool                       | Enhancement                                         |
| -------------------------- | --------------------------------------------------- |
| `perform_research`         | Track multi-step research workflows                 |
| `adr_bootstrap_validation` | Track script generation progress                    |
| `adr_validation`           | Track bulk ADR validation with AI analysis progress |

### Phase 3: DAG Executor Integration

Integrate `DAGExecutor` with MCP Tasks:

- Each DAG node becomes a sub-task
- Parent task tracks overall DAG execution
- Preserve parallel execution benefits

### Task Schema Design

```typescript
// Internal AdrTask structure (maps to MCP Task types)
interface AdrTask {
  taskId: string; // Unique task identifier (UUID)
  type: TaskType; // 'bootstrap' | 'deployment' | 'research' | 'orchestration' | 'troubleshooting' | 'validation' | 'planning'
  status: TaskStatus; // 'working' | 'input_required' | 'completed' | 'failed' | 'cancelled' (MCP SDK values)
  progress: number; // 0-100 percentage
  tool: string; // Originating tool name
  createdAt: string; // ISO timestamp
  lastUpdatedAt: string; // ISO timestamp
  phases?: AdrTaskPhase[]; // For multi-phase operations
  result?: TaskResult; // Final result when completed
  error?: string; // Error message when failed
}

// Phase tracking for multi-step operations
interface AdrTaskPhase {
  name: string;
  description: string;
  status: 'pending' | 'working' | 'completed' | 'failed';
  startedAt?: string;
  completedAt?: string;
  result?: unknown;
}
```

### API Integration

```typescript
// Import SDK task schemas (experimental)
import {
  ListTasksRequestSchema,
  GetTaskRequestSchema,
  CancelTaskRequestSchema,
  GetTaskPayloadRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';

// Server capability declaration
server.setRequestHandler(InitializeRequestSchema, async () => ({
  capabilities: {
    experimental: {
      tasks: {}, // Enable experimental Tasks capability
    },
  },
}));

// Task handlers using SDK schemas
// NOTE: No tasks/create handler - tasks are created implicitly by tools returning CreateTaskResult

server.setRequestHandler(ListTasksRequestSchema, async () => {
  const taskManager = getTaskManager();
  const tasks = await taskManager.listTasks();
  return { tasks };
});

server.setRequestHandler(GetTaskRequestSchema, async request => {
  const { taskId } = request.params;
  const taskManager = getTaskManager();
  const task = await taskManager.getTask(taskId);
  if (!task) throw new McpAdrError(`Task not found: ${taskId}`, 'TASK_NOT_FOUND');
  return { task };
});

server.setRequestHandler(CancelTaskRequestSchema, async request => {
  const { taskId } = request.params;
  const taskManager = getTaskManager();
  const cancelled = await taskManager.cancelTask(taskId);
  if (!cancelled) throw new McpAdrError(`Task not found: ${taskId}`, 'TASK_NOT_FOUND');
  return { success: true };
});

server.setRequestHandler(GetTaskPayloadRequestSchema, async request => {
  const { taskId } = request.params;
  const taskManager = getTaskManager();
  const result = await taskManager.getTaskResult(taskId);
  return result ?? {};
});
```

## Consequences

### Positive

1. **Protocol Compliance**: Aligns with MCP 2025-11-25 specification
2. **Standardized Progress Tracking**: Clients can uniformly track all long-running operations
3. **Cancellation Support**: Native support for cancelling in-progress operations
4. **Reduced Custom Code**: Replace bespoke tracking implementations
5. **Better Client Integration**: AI assistants can better manage and monitor operations
6. **Memory Integration**: Tasks can persist to memory entities for historical analysis
7. **Interoperability**: Other MCP clients can interact with our tasks

### Negative

1. **SDK Upgrade Required**: May introduce breaking changes
2. **Migration Effort**: Existing tools need refactoring
3. **Learning Curve**: Team needs to understand Tasks API
4. **Potential Overhead**: Tasks add protocol overhead for simple operations

### Neutral

1. **Experimental Feature**: Tasks marked as experimental in MCP spec
2. **Backward Compatibility**: Need to maintain support for clients without Tasks

## Implementation Plan

### Step 1: Infrastructure (Week 1) ✅ COMPLETE

- [x] Upgrade MCP SDK to 1.25.1
- [x] Create `TaskManager` class in `src/utils/task-manager.ts`
- [x] Add task handlers in `src/index.ts` (ListTasks, GetTask, CancelTask, GetTaskPayload)
- [x] Add task persistence (file-based in `src/utils/task-persistence.ts`)

### Step 2: Bootstrap Validation Migration (Week 2)

- [ ] Wrap `BootstrapValidationLoop.run()` as a Task
- [ ] Emit progress updates for each phase
- [ ] Support cancellation between phases
- [ ] Migrate `executionId` to `taskId`

### Step 3: Deployment Readiness Migration (Week 3)

- [ ] Wrap validation operations as Tasks
- [ ] Track test execution progress
- [ ] Integrate with memory entities

### Step 4: Tool Chain Orchestrator Replacement (Week 4)

- [ ] Create `tasks/orchestrate` task type
- [ ] Map step execution to sub-tasks
- [ ] Preserve dependency resolution
- [ ] Remove deprecated orchestrator code

### Step 5: Interactive ADR Planning Migration (Week 5)

- [ ] Wrap 7-phase planning workflow as a Task
- [ ] Map phases to progress (0-14-28-42-57-71-85-100%)
- [ ] Support session persistence across tool calls
- [ ] Enable cancellation between phases
- [ ] Track research sub-operations as nested progress

### Step 6: DAG Executor Enhancement (Week 6)

- [ ] Create `tasks/dag` task type
- [ ] Map DAG nodes to sub-tasks
- [ ] Maintain parallel execution
- [ ] Add progress aggregation

## Alternatives Considered

### 1. Keep Custom Implementations

- **Pro**: No migration effort
- **Con**: Not protocol-compliant, harder for clients to integrate

### 2. Partial Migration (High-Value Tools Only)

- **Pro**: Reduced effort
- **Con**: Inconsistent API experience

### 3. Wait for Tasks to Exit Experimental

- **Pro**: More stable API
- **Con**: Delays benefits, experimental doesn't mean unstable

## References

- [MCP Tasks Specification](https://modelcontextprotocol.io/specification/2025-11-25/basic/utilities/tasks)
- [One Year of MCP Blog Post](https://blog.modelcontextprotocol.io/posts/2025-11-25-first-mcp-anniversary/)
- [MCP SDK Changelog](https://github.com/modelcontextprotocol/sdk/releases)
- [ADR-014: CE-MCP Architecture](./adr-014-ce-mcp-architecture.md)

## Notes

This ADR is related to the ongoing CE-MCP migration (ADR-014). The tool-chain-orchestrator is already deprecated for CE-MCP, and MCP Tasks provides a natural replacement path.

---

_Last Updated: 2025-12-17 (Phase 1 Complete - SDK integration and handlers implemented)_
