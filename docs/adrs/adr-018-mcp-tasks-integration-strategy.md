# ADR-018: MCP Tasks Integration Strategy

## Status

Proposed

## Date

2025-12-17

## Context

The Model Context Protocol (MCP) 2025-11-25 specification introduced **Tasks** as a new primitive for tracking durable, long-running operations. Tasks are state machines that allow servers to manage expensive computations, batch processing, and operations that may take significant time to complete.

### MCP Tasks Overview

From the [MCP Specification 2025-11-25](https://modelcontextprotocol.io/specification/2025-11-25/basic/utilities/tasks):

- **Tasks** are durable state machines for tracking long-running operations
- **Lifecycle states**: `running`, `completed`, `failed`, `cancelled`
- **Key methods**:
  - `tasks/create` - Create a new task
  - `tasks/get` - Get task status and progress
  - `tasks/list` - List all tasks
  - `tasks/result` - Get final task result
- **Use cases**: Expensive computations, batch processing, operations requiring progress tracking

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

6. **Troubleshoot Guided Workflow Tool** (`src/tools/troubleshoot-guided-workflow-tool.ts`)
   - Systematic troubleshooting with multiple operations: `analyze_failure`, `generate_test_plan`, `full_workflow`
   - Memory integration via `TroubleshootingMemoryManager` for session persistence
   - Stores troubleshooting sessions with effectiveness tracking
   - Related ADR lookup, follow-up action determination
   - Already deprecated for CE-MCP (returns state machine directives)

### SDK Version Consideration

- Current SDK: `@modelcontextprotocol/sdk@^1.19.1`
- Latest SDK: `@modelcontextprotocol/sdk@1.25.1`
- Tasks support requires SDK upgrade

## Decision

We will integrate MCP Tasks into the mcp-adr-analysis-server to provide standardized, protocol-compliant long-running operation tracking. This integration will:

### Phase 1: SDK Upgrade and Infrastructure

1. Upgrade `@modelcontextprotocol/sdk` from `^1.19.1` to `^1.25.1`
2. Implement `TaskManager` utility class to abstract MCP Tasks operations
3. Add task lifecycle handlers in `src/index.ts`

### Phase 2: Tool Migration (Priority Order)

#### High Priority - Replace Custom Implementations

| Tool                           | Current Implementation         | MCP Tasks Benefit                              |
| ------------------------------ | ------------------------------ | ---------------------------------------------- |
| `bootstrap_validation_loop`    | Custom `executionId`, phases   | Standardized progress, cancellation support    |
| `deployment_readiness`         | Custom history tracking        | Protocol-compliant state persistence           |
| `tool_chain_orchestrator`      | Already deprecated             | Direct replacement with Tasks                  |
| `troubleshoot_guided_workflow` | Custom memory session tracking | Track full_workflow with session effectiveness |

#### Medium Priority - Enhance with Tasks

| Tool                       | Enhancement                         |
| -------------------------- | ----------------------------------- |
| `perform_research`         | Track multi-step research workflows |
| `adr_bootstrap_validation` | Track script generation progress    |
| `interactive_adr_planning` | Track planning session state        |

### Phase 3: DAG Executor Integration

Integrate `DAGExecutor` with MCP Tasks:

- Each DAG node becomes a sub-task
- Parent task tracks overall DAG execution
- Preserve parallel execution benefits

### Task Schema Design

```typescript
interface McpTask {
  taskId: string; // Unique task identifier
  type: TaskType; // 'bootstrap' | 'deployment' | 'research' | 'orchestration' | 'troubleshooting'
  state: TaskState; // 'running' | 'completed' | 'failed' | 'cancelled'
  progress: number; // 0-100 percentage
  metadata: {
    tool: string; // Originating tool name
    startTime: string; // ISO timestamp
    endTime?: string; // ISO timestamp when complete
    phases?: PhaseInfo[]; // For multi-phase operations
    dependencies?: string[]; // For DAG-based execution
  };
  result?: unknown; // Final result when completed
  error?: {
    // Error info when failed
    code: string;
    message: string;
    recoverable: boolean;
  };
}
```

### API Integration

```typescript
// Server capability declaration
server.setRequestHandler(InitializeRequestSchema, async () => ({
  capabilities: {
    tasks: {
      // Enable Tasks capability
      supported: true,
      // Support task cancellation
      cancellable: true,
      // Support progress updates
      progressUpdates: true,
    },
  },
}));

// Task handlers
server.setRequestHandler('tasks/create', async request => {
  const { type, parameters } = request.params;
  return taskManager.create(type, parameters);
});

server.setRequestHandler('tasks/get', async request => {
  const { taskId } = request.params;
  return taskManager.get(taskId);
});

server.setRequestHandler('tasks/list', async request => {
  return taskManager.list(request.params.filter);
});

server.setRequestHandler('tasks/result', async request => {
  const { taskId } = request.params;
  return taskManager.getResult(taskId);
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

### Step 1: Infrastructure (Week 1)

- [ ] Upgrade MCP SDK to 1.25.1
- [ ] Create `TaskManager` class in `src/utils/task-manager.ts`
- [ ] Add task handlers in `src/index.ts`
- [ ] Add task persistence (file-based or memory entities)

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

### Step 5: DAG Executor Enhancement (Week 5)

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

_Last Updated: 2025-12-17_
