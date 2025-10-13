# LLM Configuration Guide: Using the Server Context File

## Overview

The `.mcp-server-context.md` file is your project's **living memory system**. It automatically tracks:

- 📝 All ADRs and architectural decisions
- 📊 Project score trends and improvements
- 🔍 Discovered patterns and relationships
- 🎯 Recent activity and recommendations
- 🧠 Memory entities and knowledge graph

This guide shows you how to configure different LLMs to **always** use this context file for maximum effectiveness.

---

## Why This Matters

**Without Context File:**

```
User: "Create an ADR for API authentication"
LLM: *Creates generic JWT-based auth ADR*
```

**With Context File:**

```
User: "@.mcp-server-context.md Create an ADR for API authentication"
LLM: *Sees you already use OAuth2 for other services*
     *References your existing security patterns*
     *Aligns with ADR-005's security principles*
     *Creates consistent, project-specific ADR*
```

---

## Configuration by LLM

### 🤖 Google Gemini

Gemini has shorter context windows, so the context file is **critical** for continuity.

#### Option 1: System Instructions (Recommended)

When creating a Gemini app or using the API:

```python
import google.generativeai as genai

# Configure with system instructions
model = genai.GenerativeModel(
    model_name="gemini-1.5-pro",
    system_instruction="""
You are working with the MCP ADR Analysis Server for architectural decisions.

CRITICAL WORKFLOW - ALWAYS FOLLOW:
1. BEFORE any ADR operation: Read @.mcp-server-context.md
2. USE the context to understand:
   - Previous architectural decisions
   - Discovered patterns and relationships
   - Current project score and trends
   - Recent changes and recommendations
3. AFTER completing work: Call get_server_context tool to update the file
4. REFERENCE specific ADRs and patterns from context in your responses

The context file ensures continuity across sessions and prevents conflicting decisions.
"""
)
```

#### Option 2: Claude Desktop with Gemini MCP Client

If using Claude Desktop as your MCP client but want Gemini:

**~/.config/claude-desktop/config.json:**

```json
{
  "mcpServers": {
    "adr-analysis": {
      "command": "node",
      "args": ["/path/to/mcp-adr-analysis-server/dist/src/index.js"],
      "env": {
        "PROJECT_PATH": "/path/to/your/project",
        "ADR_DIRECTORY": "docs/adrs",
        "AI_MODEL": "google/gemini-1.5-pro",
        "OPENROUTER_API_KEY": "your-openrouter-key"
      }
    }
  },
  "systemPrompt": "Before ANY architectural work, read @.mcp-server-context.md for project history and patterns. After significant changes, call get_server_context to update it."
}
```

#### Option 3: Manual Prompting

For each session, start with:

```
@.mcp-server-context.md

I'm working on [task]. Please:
1. Review the context file above
2. Identify relevant ADRs and patterns
3. Ensure my work aligns with existing decisions
4. Call get_server_context when done to update the file
```

---

### 🔵 Claude (Anthropic)

Claude Code and Claude Desktop natively support MCP with good context retention.

#### Claude Desktop Configuration

**~/.config/claude-desktop/config.json** (macOS/Linux)
**%APPDATA%/Claude/config.json** (Windows)

```json
{
  "mcpServers": {
    "adr-analysis": {
      "command": "node",
      "args": ["/path/to/mcp-adr-analysis-server/dist/src/index.js"],
      "env": {
        "PROJECT_PATH": "/path/to/your/project",
        "ADR_DIRECTORY": "docs/adrs"
      }
    }
  },
  "globalSettings": {
    "beforeAnyArchitecturalWork": {
      "action": "READ_FILE",
      "file": ".mcp-server-context.md",
      "reason": "Maintain consistency with previous decisions and patterns"
    }
  }
}
```

#### Custom Instructions (Projects Feature)

If your Claude account has Projects:

```markdown
# Project: [Your Project Name]

## Context File Protocol

ALWAYS follow this workflow:

1. **Before starting any architectural work:**
   - Use: `@.mcp-server-context.md`
   - Review: Recent ADRs, patterns, and project score

2. **During work:**
   - Reference specific ADRs from context
   - Align with discovered patterns
   - Maintain consistency with previous decisions

3. **After completing work:**
   - Call `get_server_context` tool
   - Verify context file updated
   - Note new patterns discovered

## Why This Matters

The context file prevents conflicting decisions and maintains architectural integrity across sessions.
```

---

### 🟢 OpenAI GPT-4 / ChatGPT

GPT-4 has good context retention but benefits from explicit reminders.

#### Option 1: Custom GPT with Instructions

Create a Custom GPT with these instructions:

```
# MCP ADR Analysis Assistant

You are an architectural decision assistant using the MCP ADR Analysis Server.

## Core Protocol

**BEFORE every architectural task:**
1. Request to read .mcp-server-context.md
2. Review recent ADRs and patterns
3. Check current project score and trends

**DURING task execution:**
- Reference specific ADRs by number (e.g., "As per ADR-005...")
- Align with discovered patterns
- Maintain consistency with previous decisions

**AFTER completing significant work:**
- Call get_server_context tool
- Summarize updates made to context
- Highlight new patterns discovered

## Key Principles
- Never make architectural decisions without context
- Always reference previous ADRs when relevant
- Maintain architectural consistency across sessions
- Update context after substantial changes

## When to Use Context File
✅ Creating new ADRs
✅ Validating existing ADRs
✅ Reviewing project architecture
✅ Making deployment decisions
✅ Analyzing code against ADRs
```

#### Option 2: API Integration

```javascript
const OpenAI = require('openai');

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

async function chatWithContext(userMessage) {
  const messages = [
    {
      role: 'system',
      content: `You are working with the MCP ADR Analysis Server.

WORKFLOW:
1. Before architectural decisions: Read @.mcp-server-context.md
2. Reference previous ADRs and patterns from context
3. After work: Call get_server_context to update

The context file is critical for consistency across sessions.`,
    },
    {
      role: 'user',
      content: `@.mcp-server-context.md\n\n${userMessage}`,
    },
  ];

  const response = await openai.chat.completions.create({
    model: 'gpt-4-turbo-preview',
    messages: messages,
  });

  return response.choices[0].message.content;
}
```

---

## Universal Workflow Template

Regardless of your LLM, use this workflow:

### 📥 START OF SESSION

```
@.mcp-server-context.md

What were we working on? Show me:
- Active intents
- Recent ADRs created/modified
- Current project score
- Any recommended next actions
```

### 🔨 DURING WORK

```
@.mcp-server-context.md

I need to [task]. Please:
1. Review relevant ADRs from context
2. Check for related patterns
3. Ensure alignment with previous decisions
4. Proceed with the task
```

### ✅ END OF SESSION

```
Please call the get_server_context tool to update .mcp-server-context.md with:
- Work completed this session
- New patterns discovered
- ADRs created/modified
- Recommendations for next session
```

---

## Advanced: Automated Context Reading

### Pre-Commit Hook

Automatically update context before commits:

**.git/hooks/pre-commit:**

```bash
#!/bin/bash

# Update context file before commit
echo "Updating .mcp-server-context.md..."

# Call MCP server to refresh context
node /path/to/mcp-adr-analysis-server/dist/src/index.js \
  --tool get_server_context

# Add to staging if changed
git add .mcp-server-context.md

echo "✅ Context file updated"
```

### CI/CD Integration

**GitHub Actions (.github/workflows/update-context.yml):**

```yaml
name: Update Context File

on:
  push:
    branches: [main]
  workflow_dispatch:

jobs:
  update-context:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'

      - name: Install MCP Server
        run: npm install -g mcp-adr-analysis-server

      - name: Update Context File
        run: |
          npx mcp-server --tool get_server_context

      - name: Commit Updated Context
        run: |
          git config user.name "GitHub Actions"
          git config user.email "actions@github.com"
          git add .mcp-server-context.md
          git commit -m "chore: update server context file [skip ci]" || true
          git push
```

---

## Troubleshooting

### Context File Not Updating

**Problem:** Context file shows old data

**Solutions:**

1. Manually refresh: Call `get_server_context` tool
2. Restart MCP server
3. Check file permissions on `.mcp-server-context.md`
4. Verify `PROJECT_PATH` environment variable

### LLM Not Reading Context File

**Problem:** LLM creates inconsistent ADRs

**Solutions:**

1. **Explicitly reference** the file: `@.mcp-server-context.md`
2. **Check system prompts** are configured correctly
3. **Use stronger language**: "REQUIRED: Read .mcp-server-context.md first"
4. **Test with a direct question**: "What does @.mcp-server-context.md say about our current architecture?"

### Context File Too Large

**Problem:** Context file exceeds LLM token limits

**Solutions:**

1. The file auto-limits recent items (default: 5)
2. Focus on specific sections:
   ```
   @.mcp-server-context.md show me just:
   - Recent Intents (last 3)
   - Memory Entities (ADR-related only)
   ```
3. Use `maxRecentItems` parameter in get_server_context:
   ```json
   {
     "tool": "get_server_context",
     "arguments": {
       "maxRecentItems": 3
     }
   }
   ```

---

## Best Practices

### ✅ DO

- **Always read context** before architectural decisions
- **Update context** after significant changes
- **Reference specific ADRs** by number when relevant
- **Check patterns** for consistency
- **Track progress** via project score

### ❌ DON'T

- Skip reading context for "small" changes
- Make conflicting decisions without checking existing ADRs
- Forget to update context after creating ADRs
- Ignore patterns and recommendations
- Let context file get stale

---

## Real-World Example

### Bad: Without Context File

```
User: "Create an ADR for caching strategy"
LLM: "I'll create a Redis caching ADR..."
       *Creates ADR-042*

Reality: Project already uses Memcached (ADR-015)
         Conflicts with ADR-023 infrastructure decisions
         Adds unnecessary complexity
```

### Good: With Context File

```
User: "@.mcp-server-context.md Create an ADR for caching strategy"
LLM: "I see from the context:
      - ADR-015 established Memcached as standard cache
      - ADR-023 requires infrastructure consistency
      - Pattern: Prefer extending existing solutions

      I'll create ADR-042 extending Memcached for the new use case..."

      *Creates consistent ADR*
      *Calls get_server_context to update*
```

---

## Summary

The `.mcp-server-context.md` file transforms your LLM from a **stateless assistant** into a **project-aware architect**.

**Key Points:**

- 📖 **Always read before** architectural work
- ✍️ **Always update after** significant changes
- 🔗 **Reference specific ADRs** from context
- 🎯 **Follow patterns** for consistency
- 🚀 **Track progress** via project scores

Configure your LLM to use this workflow, and watch your architectural decision quality improve dramatically!

---

**Next Steps:**

1. Configure your LLM using the examples above
2. Test by asking: "What does @.mcp-server-context.md show?"
3. Create your first context-aware ADR
4. Call `get_server_context` to verify updates

**Need Help?**

- See: [Server Context File Guide](/docs/how-to-guides/server-context-file.md)
- Tool: `get_server_context` - Refresh context manually
- Issue: [Report Configuration Problems](https://github.com/your-repo/issues)
