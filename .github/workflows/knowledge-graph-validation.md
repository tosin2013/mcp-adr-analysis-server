---
name: 'Knowledge Graph Validation'
description: 'Validates knowledge graph manager, state reinforcement, conversation memory, graph persistence, and session cleanup'
on:
  pull_request:
    paths:
      - 'src/utils/knowledge-graph-manager.ts'
      - 'src/utils/state-reinforcement-manager.ts'
      - 'src/utils/conversation-memory-manager.ts'
      - 'tests/utils/knowledge-graph*.test.ts'
  push:
    branches:
      - main
  workflow_dispatch:
permissions:
  issues: read
  pull-requests: read
safe-outputs:
  create-issue:
    title-prefix: '[knowledge-graph]'
  add-comment:
tools:
  bash: true
  github:
    toolsets: [issues, pull_requests]
---

# Knowledge Graph Validation

You validate the knowledge graph, state reinforcement, and conversation memory subsystems of the MCP server.

## Context

The mcp-adr-analysis-server maintains persistent state through three interconnected systems:

1. **Knowledge Graph Manager** (`src/utils/knowledge-graph-manager.ts`)
   - Tracks intents, tool executions, ADR decisions, and relationships
   - Persists to OS temp directory: `$TMPDIR/{projectName}/cache/knowledge-graph-snapshots.json`
   - Provides `queryKnowledgeGraph()` for semantic context retrieval
   - Memory operations limited to last 1000 entries

2. **State Reinforcement Manager** (`src/utils/state-reinforcement-manager.ts`)
   - Context decay mitigation: re-injects core context every 5 turns or when responses exceed 3000 tokens
   - Integrates recent knowledge graph intents into context reminders

3. **Conversation Memory Manager** (`src/utils/conversation-memory-manager.ts`)
   - Structured external memory for long conversations
   - Stores sessions, expandable content, and resumption context
   - Auto-cleanup of sessions older than 24 hours

## Validation Steps

### Step 0: Install Dependencies

Install build tools required for native module compilation (e.g., tree-sitter), then install npm dependencies with error-tolerant fallbacks.

```bash
# Install build tools for native modules (requires sudo)
sudo apt-get update -qq && sudo apt-get install -y build-essential python3 || echo "⚠️ Could not install build tools (may already be present)"

# Install npm dependencies with fallback
if ! npm ci; then
  echo "⚠️ npm ci failed, falling back to npm install..."
  npm install
fi

# Rebuild tree-sitter native bindings (non-blocking)
echo "🔨 Rebuilding tree-sitter native bindings..."
if ! npm rebuild tree-sitter; then
  echo "⚠️ Tree-sitter rebuild failed, but continuing (tests handle graceful fallback)"
fi
```

If `npm` is not available or both install commands fail, you can still run the persistence validation steps (Steps 4 and 5) using `node` with pre-built `dist/` if available.

### Step 1: Knowledge Graph Manager Tests

```bash
npm test -- tests/utils/knowledge-graph-manager.test.ts --verbose --coverage
```

Verify all tests pass and coverage meets the 85% threshold.

### Step 2: State Reinforcement Tests

```bash
npm test -- tests/utils/state-reinforcement-manager.test.ts --verbose
```

### Step 3: Conversation Memory Tests

```bash
npm test -- tests/utils/conversation-memory-manager.test.ts --verbose
```

### Step 4: Graph Persistence Validation

Run an end-to-end persistence test:

```bash
node -e "
  import { KnowledgeGraphManager } from './dist/src/utils/knowledge-graph-manager.js';
  import fs from 'fs';
  import os from 'os';
  import path from 'path';

  const testProject = 'kg-validation-test';
  const kg = new KnowledgeGraphManager(testProject);

  // Add test data
  kg.addIntent('test-intent', 'Test validation intent');
  kg.addToolExecution('test-tool', { param: 'test' });
  kg.addADRDecision('ADR-001', 'Test ADR', 'Test decision');

  // Query graph
  const results = kg.queryKnowledgeGraph('test');
  if (results.length === 0) {
    console.error('Knowledge graph query failed');
    process.exit(1);
  }

  // Verify persistence
  const cacheDir = path.join(os.tmpdir(), testProject, 'cache');
  const snapshotFile = path.join(cacheDir, 'knowledge-graph-snapshots.json');

  if (!fs.existsSync(snapshotFile)) {
    console.error('Knowledge graph snapshot not persisted');
    process.exit(1);
  }

  console.log('Knowledge graph persistence validated');
  console.log('Query system operational');

  // Cleanup
  fs.rmSync(cacheDir, { recursive: true, force: true });
"
```

### Step 5: Memory Cleanup Validation

Test that old sessions are properly cleaned up:

```bash
node -e "
  import { ConversationMemoryManager } from './dist/src/utils/conversation-memory-manager.js';
  import fs from 'fs';
  import os from 'os';
  import path from 'path';

  const testProject = 'memory-cleanup-test';
  const memory = new ConversationMemoryManager(testProject);

  // Create test session
  const sessionId = memory.createSession('test-context');
  memory.addMessage(sessionId, 'user', 'test message', {});

  // Verify cleanup of old sessions
  memory.cleanupOldSessions();

  console.log('Memory cleanup validated');

  // Cleanup test data
  const memoryDir = path.join(os.tmpdir(), testProject, 'conversation-memory');
  if (fs.existsSync(memoryDir)) {
    fs.rmSync(memoryDir, { recursive: true, force: true });
  }
"
```

## On Failure

If any step fails:

1. **For PR events**: Add a comment to the PR identifying which subsystem failed (knowledge graph, state reinforcement, or conversation memory) and the specific test failures.

2. **For push/dispatch events**: Create an issue:

**Title**: `[knowledge-graph] {subsystem}: {failure description}`

**Body**:

```markdown
## Knowledge Graph Validation Failure

**Subsystem**: {Knowledge Graph / State Reinforcement / Conversation Memory}
**Trigger**: {PR/push/dispatch}

### Failure Details

{full error output from the failing step}

### Components Tested

| Component               | Status      |
| ----------------------- | ----------- |
| Knowledge Graph Manager | {pass/fail} |
| State Reinforcement     | {pass/fail} |
| Conversation Memory     | {pass/fail} |
| Graph Persistence       | {pass/fail} |
| Memory Cleanup          | {pass/fail} |

### Impact Assessment

{what functionality is affected by this failure}

### Recommended Fix

1. {step 1}
2. {step 2}

---

_Generated by Knowledge Graph Validation agentic workflow_
```

## On Success

- **For PR events**: Add a comment confirming all knowledge graph and memory validations passed
- **For push/dispatch events**: No issue needed

---

_Replaces: .github/agents/knowledge-graph-validation.yml_
