# Dynamic Cross-Tool Scoring System Test

## Overview
This demonstrates the new dynamic scoring system that influences TODO.md scoring based on other MCP tools.

## How It Works

### 1. **TODO.md Header Enhanced**
When `manage_todo` operations are performed, the TODO.md now includes:
- 🎯 **Overall Project Health Score** (0-100%)
- 📊 **Individual Component Scores**:
  - 📋 Task Completion (25% weight)
  - 🚀 Deployment Readiness (30% weight)
  - 🏗️ Architecture Compliance (20% weight)
  - 🔒 Security Posture (15% weight)
  - 🛠️ Code Quality (10% weight)

### 2. **Cross-Tool Integration**
- **`smart_git_push`** → Updates deployment readiness score
- **`manage_todo`** → Updates task completion score
- **`compare_adr_progress`** → Updates architecture compliance score
- **`analyze_content_security`** → Updates security posture score
- **`validate_rules`** → Updates code quality score

### 3. **Dynamic Scoring Features**
- **Weighted Algorithm**: Different components have different importance
- **Priority Weighting**: Critical/high priority tasks affect scoring more
- **Real-time Updates**: Scores update when tools are used
- **Confidence Tracking**: Data freshness affects confidence level
- **Automatic Backup**: Scores cached in `.mcp-adr-cache/project-health-scores.json`

## Example TODO.md Header

```markdown
# Project Health Dashboard

## 🎯 Overall Project Health: 🟡 73% ✨

### 📊 Health Metrics
- 📋 **Task Completion**: 🟢 85%
- 🚀 **Deployment Readiness**: 🟡 68%
- 🏗️ **Architecture Compliance**: 🟠 62%
- 🔒 **Security Posture**: 🟢 88%
- 🛠️ **Code Quality**: 🟡 75%

### 🔄 Data Freshness
- **Last Updated**: 7/14/2025, 3:45:23 PM
- **Confidence**: 92%
- **Contributing Tools**: manage_todo, smart_git_push, compare_adr_progress

### 📈 Detailed Breakdown
- **Tasks**: 12/15 completed, 2 critical remaining
- **Deployment**: 1 critical blockers, 3 warnings
- **Security**: 0 vulnerabilities, 95% masking effectiveness
- **Code Quality**: 2 rule violations, 78% pattern adherence

---
```

## Testing the System

1. **Run TODO management operations** → Task completion score updates
2. **Use smart_git_push with release readiness** → Deployment score updates
3. **Execute compare_adr_progress** → Architecture score updates
4. **Run content security analysis** → Security score updates
5. **Validate rules** → Code quality score updates

Each tool execution automatically updates the relevant score component and recalculates the overall project health score.

## Benefits

- **Living Dashboard**: TODO.md becomes a real-time project health monitor
- **Holistic View**: Single score reflecting multiple project dimensions
- **Actionable Insights**: Clear indication of where to focus improvement efforts
- **Tool Integration**: Seamless cross-tool scoring influence
- **Persistence**: Scores persist across server restarts via caching

The TODO.md is now truly dynamic and influenced by the entire MCP tool ecosystem!