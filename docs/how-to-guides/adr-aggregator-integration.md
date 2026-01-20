# ADR Aggregator Integration Guide

This guide explains how to integrate the MCP ADR Analysis Server with [ADR Aggregator](https://adraggregator.com) for centralized ADR management, cross-repository insights, and team collaboration.

## Overview

ADR Aggregator provides a cloud platform for managing Architectural Decision Records (ADRs) across multiple repositories. The integration enables:

- **Centralized ADR management** - View and manage ADRs from all repositories in one dashboard
- **Staleness tracking** - Automatic detection of stale ADRs requiring review
- **Gap analysis** - Identify missing documentation and code-ADR mismatches
- **Cross-repository insights** - Discover patterns and relationships across projects (Team tier)
- **Compliance validation** - Ensure ADRs are properly implemented (Pro+ tier)

## Prerequisites

Before you begin, ensure you have:

1. **MCP ADR Analysis Server** installed (`npm install -g @tosin2013/mcp-adr-analysis-server`)
2. **Git repository** initialized in your project
3. **ADR Aggregator account** at [adraggregator.com](https://adraggregator.com)

## Setup

### Step 1: Get Your API Key

1. Sign up or log in at [adraggregator.com](https://adraggregator.com)
2. Navigate to **Settings** > **API Keys**
3. Click **Generate New Key**
4. Copy your API key (you won't be able to see it again)

### Step 2: Configure Environment Variables

Set the API key in your environment:

```bash
# Linux/macOS
export ADR_AGGREGATOR_API_KEY="your-api-key-here"

# Windows PowerShell
$env:ADR_AGGREGATOR_API_KEY = "your-api-key-here"

# In .env file (recommended for projects)
ADR_AGGREGATOR_API_KEY=your-api-key-here
```

### Step 3: Verify Configuration

Run the MCP server and test the connection:

```bash
# Start the MCP server
mcp-adr-analysis-server

# In your MCP client, call get_adr_templates (no auth required)
# This verifies basic connectivity
```

## Tier Features

ADR Aggregator offers three tiers with different capabilities:

| Feature               | Free    | Pro+      | Team      |
| --------------------- | ------- | --------- | --------- |
| ADR Sync              | 10 ADRs | Unlimited | Unlimited |
| Staleness Reports     | ✅      | ✅        | ✅        |
| Templates             | ✅      | ✅        | ✅        |
| Gap Analysis          | ✅      | ✅        | ✅        |
| Priority Tracking     | ✅      | ✅        | ✅        |
| Mermaid Diagrams      | ❌      | ✅        | ✅        |
| Compliance Validation | ❌      | ✅        | ✅        |
| Implementation Status | ❌      | ✅        | ✅        |
| Knowledge Graph       | ❌      | ❌        | ✅        |
| Cross-repo Patterns   | ❌      | ❌        | ✅        |
| Organization Scope    | ❌      | ❌        | ✅        |

## Common Workflows

### Workflow 1: Initial ADR Sync

Sync your existing ADRs to the aggregator platform:

```json
// Tool: sync_to_aggregator
{
  "full_sync": true,
  "include_metadata": true,
  "include_timeline": true
}
```

**What happens:**

1. Tool auto-detects repository from git remote
2. Scans `docs/adrs/` directory for ADR files
3. Parses ADR content and extracts metadata
4. Uploads to ADR Aggregator platform

### Workflow 2: Pull ADR Context for AI Analysis

Get enriched ADR context for AI-assisted decision making:

```json
// Tool: get_adr_context
{
  "include_timeline": true,
  "staleness_filter": "all"
}
```

**Use cases:**

- Inform AI about existing architectural decisions
- Check if similar decisions already exist
- Get staleness information for each ADR

### Workflow 3: Check ADR Staleness

Generate a staleness report for governance:

```json
// Tool: get_staleness_report
{
  "threshold": 90
}
```

**Response includes:**

- Fresh/Recent/Stale/Very Stale counts
- Review cycle compliance percentage
- List of stale ADRs with recommended actions

### Workflow 4: Analyze Code-ADR Gaps

Detect mismatches between ADRs and codebase:

```json
// Tool: analyze_gaps
{
  "reportToAggregator": true,
  "scanDirectories": ["src", "lib"]
}
```

**Gap types detected:**

- **ADR-to-Code**: File references in ADRs that don't exist
- **Code-to-ADR**: Technologies in code without ADR coverage
  - Databases (PostgreSQL, MongoDB, Redis)
  - Authentication (Passport, JWT, OAuth)
  - Cloud providers (AWS, GCP, Azure)
  - Frameworks (React, Vue, Angular)
  - Patterns (Microservices, CQRS, Event Sourcing)

### Workflow 5: Track Implementation Progress (Pro+)

Update implementation status of ADRs:

```json
// Tool: update_implementation_status
{
  "updates": [
    {
      "adr_path": "docs/adrs/001-use-typescript.md",
      "implementation_status": "implemented",
      "notes": "Migration completed in v2.0"
    },
    {
      "adr_path": "docs/adrs/002-api-design.md",
      "implementation_status": "in_progress"
    }
  ]
}
```

**Valid status values:**

- `not_started` - Implementation has not begun
- `in_progress` - Implementation is underway
- `implemented` - Decision fully implemented
- `deprecated` - Decision no longer relevant
- `blocked` - Implementation blocked

### Workflow 6: Prioritize ADRs for Roadmap

Get prioritized list of ADRs for planning:

```json
// Tool: get_adr_priorities
{
  "include_ai": true
}
```

**Response includes:**

- Priority scores (0-100)
- Dependencies between ADRs
- Blockers preventing implementation
- Gap counts per ADR
- AI-enhanced prioritization (when enabled)

### Workflow 7: Cross-Repository Knowledge Graph (Team)

Discover patterns across your organization's repositories:

```json
// Tool: get_knowledge_graph
{
  "scope": "organization",
  "include_analytics": true
}
```

**Insights provided:**

- Most connected ADRs across repos
- Orphan decisions (no links)
- Pattern trends over time
- Cross-repository patterns

## CI/CD Integration

### GitHub Actions Example

```yaml
name: ADR Sync

on:
  push:
    paths:
      - 'docs/adrs/**'
  workflow_dispatch:

jobs:
  sync-adrs:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'

      - name: Install MCP ADR Server
        run: npm install -g @tosin2013/mcp-adr-analysis-server

      - name: Sync ADRs to Aggregator
        env:
          ADR_AGGREGATOR_API_KEY: ${{ secrets.ADR_AGGREGATOR_API_KEY }}
        run: |
          # Use the MCP server in standalone mode
          mcp-adr-analysis-server --tool sync_to_aggregator --args '{"include_metadata": true}'
```

### Pre-commit Hook

Add to `.pre-commit-config.yaml`:

```yaml
repos:
  - repo: local
    hooks:
      - id: analyze-adr-gaps
        name: Analyze ADR Gaps
        entry: bash -c 'npx mcp-adr-analysis-server --tool analyze_gaps --args "{}"'
        language: system
        pass_filenames: false
        files: ^(docs/adrs/|src/)
```

## Troubleshooting

### Error: "ADR Aggregator API key not configured"

**Solution:** Set the `ADR_AGGREGATOR_API_KEY` environment variable:

```bash
export ADR_AGGREGATOR_API_KEY="your-key"
```

### Error: "Not a git repository"

**Solution:** Initialize git and add a remote:

```bash
git init
git remote add origin https://github.com/owner/repo.git
```

### Error: "This feature requires Pro+ tier"

**Solution:** Upgrade your ADR Aggregator subscription at [adraggregator.com/pricing](https://adraggregator.com/pricing)

### Error: "Repository not found"

**Solution:** Sync your ADRs first:

```json
// Tool: sync_to_aggregator
{ "full_sync": true }
```

### Error: "Request timed out"

**Solution:** Check your internet connection or try again. The default timeout is 30 seconds.

## API Reference

For complete API documentation, see:

- [API Reference - ADR Aggregator Tools](../reference/api-reference.md#-adr-aggregator-integration-tools)

## Best Practices

### 1. Sync Regularly

Set up automated sync in CI/CD to keep ADR Aggregator updated:

- Trigger sync on ADR file changes
- Run weekly full sync to ensure consistency

### 2. Address Gaps Promptly

When gap analysis detects missing ADRs:

1. Review the suggested ADR title
2. Create the ADR using templates from `get_adr_templates`
3. Re-run gap analysis to verify

### 3. Track Implementation Status

Keep implementation status updated to:

- Enable accurate priority calculations
- Identify blocked decisions early
- Measure architectural debt

### 4. Use Staleness Thresholds

Configure appropriate staleness thresholds:

- **90 days** (default): Standard review cycle
- **30 days**: Fast-moving projects
- **180 days**: Stable systems with infrequent changes

### 5. Leverage Cross-Repo Insights (Team)

For organizations with multiple repositories:

- Use knowledge graph to identify common patterns
- Share successful ADRs across teams
- Detect architectural inconsistencies

## Related Documentation

- [Installation Guide](./installation-guide.md)
- [Work with Existing ADRs](./work-with-existing-adrs.md)
- [CI/CD Integration](./cicd-integration.md)
- [Troubleshooting](./troubleshooting.md)
