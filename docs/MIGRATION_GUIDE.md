# Migration Guide for Deprecated Tools

## Overview

This guide helps you migrate from deprecated tools to the new memory-centric architecture in MCP ADR Analysis Server v2.0+.

## Deprecated Tools and Their Replacements

### 1. `mcp0_manage_todo_json` → `mcp-shrimp-task-manager`

**What Changed:**

- The built-in TODO management has been replaced with an external task manager
- Task data is now stored in the memory system rather than JSON files

**Migration Steps:**

1. Export existing tasks using the old tool (if still available)
2. Install the new task manager: `mcp-shrimp-task-manager`
3. Import tasks into the new system
4. Update any automation scripts to use the new tool names

**New Tool Usage:**

```javascript
// Old way
await mcp0_manage_todo_json({ operation: 'add', task: 'My task' });

// New way (via external task manager)
// Configure mcp-shrimp-task-manager in your MCP settings
// Then use through MCP client
```

### 2. `mcp0_smart_score` → Memory-Centric Health Scoring

**What Changed:**

- Project health scoring is now integrated into the memory system
- Provides more comprehensive, context-aware scoring
- Historical tracking and pattern recognition

**Migration Steps:**

1. The new system automatically migrates existing score data
2. Access scores through memory entities instead of direct tool calls

**New Usage:**

```javascript
// Old way
await mcp0_smart_score({ projectPath: '/my/project' });

// New way (automatic via memory system)
// Scores are calculated automatically and stored as memory entities
// Access via memory query tools
```

## Cache Directory Changes

### Important: New Cache Location

**Old Location:** `.mcp-adr-cache` (in project directory)
**New Location:** OS temp directory (e.g., `/tmp/[project-name]/cache`)

This change:

- Prevents permission issues
- Provides better cross-platform compatibility
- Keeps project directories clean

**No Action Required:** The system automatically uses the new location.

## Memory System Integration

### New Features

The memory-centric architecture provides:

- **Persistent memory entities** for all tool operations
- **Cross-tool relationships** and pattern detection
- **Historical analysis** and trend identification
- **Intelligent caching** with automatic invalidation

### How to Enable

Memory features are enabled by default. To use advanced features:

```javascript
// Enable memory integration in tools
await deploymentReadiness({
  enableMemoryIntegration: true,
  migrateExistingHistory: true,
});
```

## Troubleshooting

### Common Issues

1. **"Tool not found" errors**
   - Solution: Update your MCP client configuration
   - Remove references to deprecated tools
   - Add new external tools as needed

2. **Cache directory errors**
   - Solution: Already fixed! Uses OS temp directory
   - Clear old cache: `rm -rf .mcp-adr-cache`

3. **Memory initialization failures**
   - Solution: Ensure temp directory has write permissions
   - Check disk space in temp directory

### Getting Help

- Report issues: https://github.com/anthropics/claude-code/issues
- Check documentation: `/docs` directory
- Memory system guide: `/docs/explanation/memory-architecture.md`

## Rollback Instructions

If you need to rollback to previous versions:

1. **Backup current data:**

   ```bash
   cp -r /tmp/[project-name]/cache ./backup-cache
   cp -r /tmp/[project-name]/memory ./backup-memory
   ```

2. **Downgrade package:**

   ```bash
   npm install mcp-adr-analysis-server@1.x
   ```

3. **Restore old cache location:**
   ```bash
   cp -r ./backup-cache .mcp-adr-cache
   ```

## Benefits of Migration

### Why Migrate?

1. **Better Performance**
   - Memory-centric caching reduces redundant operations
   - Pattern recognition improves over time

2. **Enhanced Intelligence**
   - Cross-tool learning and relationships
   - Historical pattern analysis
   - Predictive capabilities

3. **Improved Reliability**
   - No more permission issues
   - Better error handling and recovery
   - Automatic data migration

4. **Future-Proof**
   - Active development and support
   - New features added regularly
   - Community-driven improvements

## Timeline

- **Immediate:** Cache directory fixes are live
- **v2.1:** Full memory system integration
- **v2.2:** Advanced pattern recognition
- **v3.0:** AI-powered workflow automation

## Questions?

For questions about migration, please:

1. Check this guide first
2. Review the changelog in `/CHANGELOG.md`
3. Open an issue if you encounter problems
