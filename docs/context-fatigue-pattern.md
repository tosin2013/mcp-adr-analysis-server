# Context Fatigue Pattern - Best Practices

## Overview

This document describes the recommended pattern for handling LLM context fatigue in long-running MCP sessions. The `human_override` tool has been removed in favor of a simpler, more reliable pattern using `analyze_project_ecosystem` and JSON-based state management.

## The Problem: Context Degradation Syndrome (CDS)

After extended conversations (typically 100+ exchanges), LLMs experience:
- **Memory Loss**: Instructions fall outside the context window
- **Tool Orchestration Failure**: Complex multi-step workflows are ignored
- **Repetitive Behavior**: Responses become circular or miss key details
- **Lost in the Middle**: Information in the middle of long contexts is poorly retained

## The Solution: Fresh Sessions with State Persistence

### 1. Session Start Pattern

When starting a new session (or restarting after degradation):

```javascript
// Load knowledge base and previous state when LLM is fresh
analyze_project_ecosystem({
  projectPath: ".",
  enhancedMode: true,
  knowledgeEnhancement: true,
  learningEnabled: true,
  includeEnvironment: true,
  recursiveDepth: 'comprehensive'
})
```

This single tool call:
- Loads the knowledge graph from JSON files
- Retrieves previous analysis outcomes
- Understands the project ecosystem
- Establishes context from external state

### 2. External State Management

The MCP ADR Analysis Server uses JSON files for persistent state:

```
mcp-shrimp-task-manager/
├── memory/                    # Timestamped conversation snapshots
│   └── tasks_memory_*.json   # Task summaries and analysis results
├── workflow-state/           # Active workflow tracking
│   └── sessions/*.json       # Session state and progress
└── task-memory/             # Individual task details
    └── tasks/*.json         # Task-specific state
```

### 3. Degradation Detection

Monitor for these signals:
- Repetitive responses
- Ignoring multi-step instructions
- Parameter errors in tool calls
- Circular reasoning
- "Losing the plot" behavior

### 4. Graceful Session Restart

When degradation is detected:

```javascript
// 1. Save current state
manage_todo({ 
  operation: 'sync_progress',
  preserveExisting: true 
})

// 2. Exit gracefully
"Context degradation detected. State saved. Please start a fresh session."

// 3. Next session resumes from saved state
// The analyze_project_ecosystem call will load the saved progress
```

## Benefits Over human_override

1. **Simplicity**: Single tool call vs complex orchestration parsing
2. **Reliability**: Works when LLM is fresh, not fatigued
3. **Natural Flow**: Aligns with how LLMs actually function
4. **State Preservation**: No work is lost between sessions
5. **Scalability**: Can handle unlimited session restarts

## Implementation Details

### Reality Check Integration

The `tool_chain_orchestrator` now recommends session restart instead of human_override:

```javascript
// High risk detection
if (hallucinationRisk === 'high') {
  suggestedActions.push(
    'IMMEDIATE: Start fresh session with analyze_project_ecosystem to reload context',
    'Avoid further AI planning - use predefined task patterns',
    'Consider resetting the conversation context'
  );
}
```

### Session Guidance Updates

```javascript
// Critical session state
sessionStatus = 'critical';
recommendedNextStep = 'Start fresh session with analyze_project_ecosystem';
guidance.push('Fresh session with context reload strongly recommended');
```

## Best Practices

1. **Proactive Monitoring**: Watch for degradation signals early
2. **Regular State Saves**: Use `manage_todo` to checkpoint progress
3. **Clean Restarts**: Don't try to "push through" degradation
4. **Trust the Pattern**: The system is designed for session restarts

## Example Workflow

```bash
# Session 1 (Fresh start)
> analyze_project_ecosystem conversationContext='{"humanRequest": "analyze the codebase and help me improve the architecture"}'
> # Work on tasks...
> # After 100+ exchanges, degradation detected
> manage_todo operation=sync_progress
> "Saving state for fresh session..."

# Session 2 (Resuming)
> analyze_project_ecosystem  # Automatically loads saved state AND original human request
> # Continue from where left off with full context
```

## Human Request Capture

The system now captures the original human request text through the `conversationContext.humanRequest` field:

```json
{
  "conversationContext": {
    "humanRequest": "analyze the codebase and help me improve the architecture",
    "userGoals": ["improve code quality", "modernize architecture"],
    "focusAreas": ["security", "performance"],
    "constraints": ["budget under $50k", "minimal downtime"]
  }
}
```

This human request text is stored in the knowledge graph JSON files and used for:
- **Context restoration** in fresh sessions
- **Intent tracking** across multiple tool executions  
- **Progress analysis** to understand what the human originally wanted
- **Knowledge graph completeness** for historical analysis

## Conclusion

By embracing LLM limitations rather than fighting them, this pattern provides a robust, scalable approach to long-running MCP sessions. The combination of `analyze_project_ecosystem` for context loading and JSON-based state persistence ensures no work is lost while maintaining optimal LLM performance.