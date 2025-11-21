# Tool Chain Orchestrator Environment Variable Issue Analysis

## Issue Summary

**Tool**: `tool_chain_orchestrator`  
**Status**: FAILED  
**Error**: "AI execution not enabled. Set OPENROUTER_API_KEY and execution mode to 'full'"  
**Root Cause**: **NOT a code bug, but a design difference**

## Code Analysis

### How `tool_chain_orchestrator` Works

```typescript:src/tools/tool-chain-orchestrator.ts
async function generateToolChainPlan(args: ToolChainOrchestratorArgs): Promise<ToolChainPlan> {
  const aiConfig = loadAIConfig();  // Reads from process.env
  
  if (!isAIExecutionEnabled(aiConfig)) {
    throw new McpAdrError(  // ❌ THROWS ERROR - No fallback
      'AI execution not enabled. Set OPENROUTER_API_KEY and execution mode to "full"',
      'AI_NOT_ENABLED'
    );
  }
  // ... rest of AI execution
}
```

### How `get_workflow_guidance` Works (Successful)

```typescript:src/index.ts
private async getWorkflowGuidance(args: GetWorkflowGuidanceArgs): Promise<CallToolResult> {
  const executionResult = await executePromptWithFallback(prompt, instructions);
  
  if (executionResult.isAIGenerated) {
    return formatMCPResponse({ ...executionResult });
  } else {
    // ✅ GRACEFUL FALLBACK - Returns prompt-only mode
    return { content: [{ type: 'text', text: workflowPrompt }] };
  }
}
```

### Key Difference

| Tool | AI Check | Error Handling |
|------|----------|----------------|
| `tool_chain_orchestrator` | Throws error immediately | ❌ No fallback |
| `get_workflow_guidance` | Falls back gracefully | ✅ Returns prompt |

## Root Cause

**This is NOT a code bug**, but rather:

1. **Design Intent**: `tool_chain_orchestrator` is **designed to require AI execution** - it cannot function without it because it needs to:
   - Analyze user intent using AI
   - Generate structured tool execution plans
   - Create dependency graphs
   - Provide confidence scoring

2. **Environment Variable Issue**: When connection reuse is enabled in Ansible:
   - The Node.js process is spawned once and reused
   - Environment variables are passed per-task in Ansible
   - **The environment variables may not be available when `loadAIConfig()` is called**

3. **Config Loading**: `loadAIConfig()` reads from `process.env` at call time:
   ```typescript
   apiKey: process.env['OPENROUTER_API_KEY'] || '',
   executionMode: (process.env['EXECUTION_MODE'] as 'full' | 'prompt-only') || DEFAULT_AI_CONFIG.executionMode,
   ```
   - If environment variables aren't set when the process starts, they won't be available
   - Connection reuse means the process starts before environment variables are set

## Verification

✅ **Direct Node.js test works**:
```bash
export OPENROUTER_API_KEY=...
export EXECUTION_MODE=full
node -e "isAIExecutionEnabled(loadAIConfig())"  # Returns true
```

✅ **Environment variables are set correctly** in Ansible playbook

❌ **Tool still fails** when called via Ansible with connection reuse

## Solution Options

### Option 1: Fix Ansible Collection (Recommended)
The Ansible collection should ensure environment variables are passed correctly to the spawned process, even with connection reuse.

### Option 2: Add Fallback Support (Code Change)
Make `tool_chain_orchestrator` more resilient by adding fallback behavior:

```typescript
if (!isAIExecutionEnabled(aiConfig)) {
  // Instead of throwing, return a helpful error message
  return {
    content: [{
      type: 'text',
      text: `# Tool Chain Orchestrator Unavailable

AI execution is required for tool chain orchestration.

**Required Configuration:**
- Set \`EXECUTION_MODE=full\`
- Set \`OPENROUTER_API_KEY\` environment variable

**Current Status:**
- Execution Mode: ${aiConfig.executionMode}
- API Key: ${aiConfig.apiKey ? 'Set' : 'Not Set'}

**Alternative:** Use \`get_workflow_guidance\` which provides workflow recommendations without requiring AI execution.`
    }]
  };
}
```

### Option 3: Reload Config Before Check
Add config reloading before the check:

```typescript
// Force reload config to pick up environment variables
const aiConfig = loadAIConfig();
// Double-check after a brief delay if needed
```

## Recommendation

**This is NOT a code bug** - it's a design difference combined with an Ansible collection environment variable handling issue.

**Best Fix**: Update the Ansible collection to properly pass environment variables to the spawned process with connection reuse.

**Workaround**: Use `get_workflow_guidance` instead, which provides similar functionality with graceful fallback.

## Confidence: 95%

The code logic is correct. The issue is environment variable propagation from Ansible to the Node.js process when connection reuse is enabled.








