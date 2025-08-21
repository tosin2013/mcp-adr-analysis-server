# 🔧 How-To: Troubleshoot Common Issues

**Goal**: Solve problems quickly and get back to productive architecture analysis.

**When to use this guide**: When you encounter errors, unexpected behavior, or need to diagnose issues with the MCP ADR Analysis Server.

---

## 🚨 Emergency Quick Fixes

### "Tool not found" or "Unknown tool" errors

**Problem**: AI assistant can't find MCP tools  
**Quick Fix**:
```bash
# 1. Verify server is installed
mcp-adr-analysis-server --version

# 2. Check server status
mcp-adr-analysis-server --test

# 3. Restart your MCP client
```

### "Permission denied" errors

**Problem**: Server can't read/write files  
**Quick Fix**:
```bash
# 1. Check directory permissions
ls -la docs/

# 2. Create missing directories
mkdir -p docs/adrs

# 3. Fix permissions if needed
chmod 755 docs/
```

### AI seems confused or gives poor results

**Problem**: Context degradation or AI confusion  
**Quick Fix**:
```json
{
  "tool": "troubleshoot_guided_workflow",
  "parameters": {
    "operation": "run_diagnostics"
  }
}
```

---

## 🔍 Systematic Diagnosis

### Step 1: Verify Installation

```bash
# Check Node.js version (should be ≥20.0.0)
node --version

# Check server installation
which mcp-adr-analysis-server
mcp-adr-analysis-server --version

# Test basic functionality
mcp-adr-analysis-server --test
```

**Expected outputs**:
- Node.js: `v20.x.x` or higher
- Server version: `2.0.7` (or current version)
- Test: `✅ Server health check passed`

### Step 2: Validate Configuration

Check your MCP client configuration:

```json
{
  "mcpServers": {
    "adr-analysis": {
      "command": "mcp-adr-analysis-server",
      "env": {
        "PROJECT_PATH": "/absolute/path/to/project",
        "OPENROUTER_API_KEY": "your_openrouter_api_key_here",
        "EXECUTION_MODE": "full",
        "AI_MODEL": "anthropic/claude-3-sonnet",
        "ADR_DIRECTORY": "docs/adrs",
        "LOG_LEVEL": "DEBUG"
      }
    }
  }
}
```

**Common configuration issues**:
- ❌ `"PROJECT_PATH": "."` (relative path)
- ✅ `"PROJECT_PATH": "/Users/you/project"` (absolute path)
- ❌ Missing `OPENROUTER_API_KEY` (required for AI features)
- ❌ Missing `EXECUTION_MODE` (should be "full" for AI or "prompt-only" for basic)
- ❌ Missing `ADR_DIRECTORY`
- ❌ Wrong command name

### Step 3: Test Basic Functionality

Run this diagnostic sequence:

```json
// 1. Test AI execution status
{
  "tool": "check_ai_execution_status"
}

// 2. Test file operations
{
  "tool": "list_directory",
  "parameters": {
    "path": "."
  }
}

// 3. Test analysis capabilities
{
  "tool": "analyze_project_ecosystem",
  "parameters": {
    "projectPath": ".",
    "recursiveDepth": "shallow"
  }
}
```

---

## 🐛 Specific Problem Solutions

### Analysis Returns Empty or Poor Results

**Symptoms**:
- "No architectural patterns detected"
- "Project analysis incomplete"
- Generic or unhelpful recommendations

**Solution 1: Enhanced Analysis Mode**
```json
{
  "tool": "analyze_project_ecosystem",
  "parameters": {
    "projectPath": ".",
    "enhancedMode": true,
    "knowledgeEnhancement": true,
    "recursiveDepth": "comprehensive",
    "includeEnvironment": true
  }
}
```

**Solution 2: Check Project Structure**
```bash
# Ensure you have a proper project structure
ls -la
# Should see: package.json, src/, docs/, etc.

# Check for hidden files that might indicate project type
ls -la | grep -E "\.(git|env|config)"
```

**Solution 3: Verify Project Path**
```json
{
  "tool": "read_file",
  "parameters": {
    "path": "package.json"
  }
}
```

### ADR Generation Fails

**Symptoms**:
- "Cannot generate ADR"
- "Missing decision data"
- Generated ADRs are incomplete

**Solution 1: Use Structured Decision Data**
```json
{
  "tool": "generate_adr_from_decision",
  "parameters": {
    "decisionData": {
      "title": "Clear, specific decision title",
      "context": "Detailed background and problem statement",
      "decision": "Specific choice made",
      "rationale": "Why this decision was made",
      "consequences": ["Positive outcome 1", "Challenge 1", "Tradeoff 1"]
    }
  }
}
```

**Solution 2: Get ADR Suggestions First**
```json
{
  "tool": "suggest_adrs",
  "parameters": {
    "projectPath": ".",
    "analysisScope": "all",
    "maxSuggestions": 5
  }
}
```

### Tool Execution Hangs or Times Out

**Symptoms**:
- Tools never complete
- Long delays without responses
- Timeout errors

**Solution 1: Check AI Service Status**
```json
{
  "tool": "check_ai_execution_status"
}
```

**Solution 2: Use Simpler Operations**
```json
// Instead of comprehensive analysis, start with basic
{
  "tool": "analyze_project_ecosystem",
  "parameters": {
    "projectPath": ".",
    "recursiveDepth": "shallow",
    "enhancedMode": false
  }
}
```

**Solution 3: Clear Cache**
```json
{
  "tool": "manage_cache",
  "parameters": {
    "action": "clear"
  }
}
```

### Security Analysis Issues

**Symptoms**:
- "No sensitive content detected" (when you know there is some)
- False positives in security scans
- Content masking not working

**Solution 1: Specify Content Type**
```json
{
  "tool": "analyze_content_security",
  "parameters": {
    "content": "your content here",
    "contentType": "code",  // or "configuration", "logs", etc.
    "userDefinedPatterns": ["your-custom-pattern-.*"]
  }
}
```

**Solution 2: Configure Custom Patterns**
```json
{
  "tool": "configure_custom_patterns",
  "parameters": {
    "projectPath": ".",
    "existingPatterns": ["api[_-]?key", "secret[_-]?token"]
  }
}
```

### TODO/Progress Tracking Problems

**Symptoms**:
- TODO.md not generated
- Progress tracking inaccurate
- Tasks not syncing with ADRs

**Solution 1: Regenerate TODO with Full Options**
```json
{
  "tool": "generate_adr_todo",
  "parameters": {
    "adrDirectory": "docs/adrs",
    "todoFormat": "both",
    "includePriorities": true,
    "includeTimestamps": true
  }
}
```

**Solution 2: Verify ADR Directory**
```bash
# Check ADR files exist
ls -la docs/adrs/
# Should see .md files like 001-decision-name.md

# Check ADR format
head -20 docs/adrs/001-*.md
```

**Solution 3: Manual Progress Sync**
```json
{
  "tool": "compare_adr_progress",
  "parameters": {
    "todoPath": "TODO.md",
    "adrDirectory": "docs/adrs",
    "includeEnvironmentCheck": true
  }
}
```

---

## 🎯 Performance Optimization

### Slow Analysis Performance

**Problem**: Tools take too long to complete  
**Solutions**:

1. **Reduce Analysis Scope**
```json
{
  "tool": "analyze_project_ecosystem",
  "parameters": {
    "recursiveDepth": "medium",  // instead of "comprehensive"
    "enhancedMode": false        // for faster results
  }
}
```

2. **Use Targeted Analysis**
```json
// Instead of full project analysis, focus on specific areas
{
  "tool": "suggest_adrs",
  "parameters": {
    "analysisScope": "technology",  // focus on just technology decisions
    "maxSuggestions": 3
  }
}
```

3. **Cache Management**
```json
// Clear old cache if it's causing slowdowns
{
  "tool": "manage_cache",
  "parameters": {
    "action": "cleanup"
  }
}
```

### Memory Issues

**Problem**: Server crashes or runs out of memory  
**Solutions**:

1. **Process Large Projects in Chunks**
```bash
# Instead of analyzing entire project at once
# Focus on subdirectories
```

2. **Increase Node.js Memory Limit**
```bash
export NODE_OPTIONS="--max-old-space-size=4096"
mcp-adr-analysis-server
```

---

## 🔧 Advanced Diagnostics

### Enable Debug Logging

```json
// In your MCP client configuration
{
  "env": {
    "LOG_LEVEL": "DEBUG",
    "VERBOSE": "true"
  }
}
```

### System Information Gathering

```json
{
  "tool": "analyze_environment",
  "parameters": {
    "includeOptimizations": true
  }
}
```

### Cache Analysis

```json
{
  "tool": "manage_cache",
  "parameters": {
    "action": "stats"
  }
}
```

---

## 🆘 When All Else Fails

### Nuclear Options

1. **Complete Reset**
```bash
# Uninstall and reinstall
npm uninstall -g mcp-adr-analysis-server
npm install -g mcp-adr-analysis-server

# Clear all cache
rm -rf .mcp-adr-cache/
```

2. **Restart from Scratch**
```bash
# Backup your work
cp -r docs/adrs/ ~/backup-adrs/

# Start fresh
rm -rf docs/
mkdir -p docs/adrs
```

3. **Environment Reset**
```bash
# Clear environment variables
unset PROJECT_PATH ADR_DIRECTORY LOG_LEVEL

# Start with minimal configuration
export PROJECT_PATH="$(pwd)"
export ADR_DIRECTORY="docs/adrs"
```

### Get Help

1. **Check Server Health**
```json
{
  "tool": "troubleshoot_guided_workflow",
  "parameters": {
    "operation": "run_diagnostics"
  }
}
```

2. **Report Issues**
- **GitHub Issues**: https://github.com/tosin2013/mcp-adr-analysis-server/issues
- Include: server version, Node.js version, error messages, steps to reproduce

3. **Community Support**
- **Documentation**: [Main README](../README.md)
- **API Reference**: [Complete Tool Documentation](../reference/api-reference.md)

---

## ✅ Prevention Tips

### Regular Maintenance

```bash
# Weekly health check
mcp-adr-analysis-server --test

# Monthly cleanup
```

```json
{
  "tool": "manage_cache",
  "parameters": {
    "action": "cleanup"
  }
}
```

### Best Practices

1. **Always use absolute paths** in configuration
2. **Keep Node.js updated** (≥20.0.0)
3. **Monitor disk space** (cache can grow large)
4. **Backup ADRs regularly** (they're valuable documentation!)

---

**Problem not listed here?** → **[File an Issue](https://github.com/tosin2013/mcp-adr-analysis-server/issues)** with detailed information about your problem.
