# 🏗️ Getting Started: Projects with Existing ADRs

This guide helps you enhance and maintain projects that already have Architectural Decision Records (ADRs). You'll learn how to analyze existing decisions, identify gaps, and keep your ADR collection up-to-date.

> **💡 NEW**: For intelligent workflow recommendations, see the [Workflow & Development Guidance](getting-started-workflow-guidance.md) guide that provides AI-powered tool sequence recommendations based on your specific goals.

## 📋 Prerequisites

### Required Software
- **Node.js** ≥18.0.0
- **MCP Client** (Claude Desktop, Cline, Cursor, or Windsurf)
- **Existing ADRs** in your project

### MCP Server Installation

```bash
# Global installation (recommended)
npm install -g mcp-adr-analysis-server

# Verify installation
mcp-adr-analysis-server --version
```

## ⚙️ Configuration

### Environment Setup

```bash
export PROJECT_PATH="/path/to/your/project"
export ADR_DIRECTORY="docs/adrs"  # or wherever your ADRs are located
export LOG_LEVEL="INFO"
export CACHE_ENABLED="true"
```

### MCP Client Configuration

#### Claude Desktop
Add to `~/Library/Application Support/Claude/claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "adr-analysis": {
      "command": "mcp-adr-analysis-server",
      "env": {
        "PROJECT_PATH": "/path/to/your/project",
        "ADR_DIRECTORY": "docs/adrs",
        "LOG_LEVEL": "INFO"
      }
    }
  }
}
```

## 🚀 Step-by-Step Workflow

### Step 1: Discover and Catalog Existing ADRs

Start by understanding what ADRs you already have:

**Tool Call:**
```
discover_existing_adrs
```

**Parameters:**
```json
{
  "adrDirectory": "docs/adrs"
}
```

**What this does:**
- Scans your ADR directory
- Catalogs all existing decisions
- Identifies ADR format and structure
- Creates an inventory of your architectural decisions

**Expected Output:**
- List of all ADRs with titles, numbers, and status
- Analysis of ADR quality and completeness
- Identification of any formatting issues

### Step 2: Analyze Current Project Architecture

Understand how your project has evolved since the ADRs were written:

**Tool Call:**
```
analyze_project_ecosystem
```

**Parameters:**
```json
{}
```

**What this does:**
- Analyzes your current codebase
- Identifies technology stack and patterns
- Compares current state with documented decisions
- Detects architectural drift

**Expected Output:**
- Technology stack analysis
- Architectural patterns in use
- Dependencies and frameworks
- Potential inconsistencies with existing ADRs

### Step 3: Identify Missing or Outdated Decisions

Find gaps in your ADR coverage:

**Tool Call:**
```
suggest_adrs
```

**Parameters:**
```json
{
  "analysisType": "comprehensive",
  "existingAdrs": [
    "Use React for Frontend",
    "PostgreSQL for Database",
    "Microservices Architecture"
  ]
}
```

**What this does:**
- Analyzes code for undocumented decisions
- Compares current architecture with existing ADRs
- Suggests new ADRs for implicit decisions
- Identifies outdated decisions that need updates

**Expected Output:**
- List of suggested new ADRs
- Recommendations for updating existing ADRs
- Priority ranking for each suggestion

### Step 4: Generate Action Items

Create a roadmap for maintaining your ADRs:

**Tool Call:**
```
generate_adr_todo
```

**Parameters:**
```json
{
  "scope": "all"
}
```

**What this does:**
- Extracts action items from existing ADRs
- Creates implementation tasks
- Identifies review and update needs
- Generates a prioritized todo list

**Expected Output:**
- `todo.md` file with actionable items
- Implementation tasks organized by priority
- Review schedule for existing ADRs

## 🔄 Ongoing Maintenance Workflows

### Weekly ADR Review

**1. Check for New Decisions**
```
Tool: suggest_adrs
Parameters: {
  "analysisType": "code_changes",
  "commitMessages": ["Recent commit messages from git log"]
}
```

**2. Update Todo List**
```
Tool: generate_adr_todo
Parameters: {
  "scope": "pending"
}
```

### Monthly Architecture Audit

**1. Full Project Analysis**
```
Tool: analyze_project_ecosystem
Parameters: {
  "includePatterns": ["*.js", "*.ts", "*.py", "*.java", "package.json"]
}
```

**2. Generate Compliance Rules**
```
Tool: generate_rules
Parameters: {
  "adrDirectory": "docs/adrs",
  "includeCompliance": true
}
```

**3. Validate Current Code**
```
Tool: validate_rules
Parameters: {
  "projectPath": ".",
  "rulesPath": "docs/architectural-rules.json"
}
```

## 📊 Advanced Analysis

### Research Integration

When updating or creating new ADRs, incorporate research:

**Tool Call:**
```
generate_research_questions
```

**Parameters:**
```json
{
  "context": "Evaluating current database choice",
  "scope": "data_architecture",
  "existingDecisions": ["ADR-003: Use PostgreSQL for Primary Database"]
}
```

### Content Security

Ensure sensitive information is protected in your ADRs:

**Tool Call:**
```
analyze_content_security
```

**Parameters:**
```json
{
  "content": "Your ADR content",
  "contentType": "documentation"
}
```

## 🎯 Common Scenarios

### Scenario 1: New Team Member Onboarding

**Goal:** Help new team members understand architectural decisions

**Workflow:**
1. `discover_existing_adrs` - Get complete ADR inventory
2. Access `adr://architectural_knowledge_graph` resource
3. `generate_adr_todo` with scope "all" - Show current priorities

### Scenario 2: Major Refactoring Planning

**Goal:** Ensure refactoring aligns with architectural decisions

**Workflow:**
1. `analyze_project_ecosystem` - Understand current state
2. `suggest_adrs` with analysis type "comprehensive"
3. `generate_research_questions` for areas of uncertainty
4. `validate_rules` against proposed changes

### Scenario 3: Architecture Review

**Goal:** Comprehensive review of architectural decisions

**Workflow:**
1. `discover_existing_adrs` - Catalog current decisions
2. `analyze_project_ecosystem` - Check implementation
3. `generate_rules` - Extract current architectural rules
4. `validate_rules` - Check compliance
5. `suggest_adrs` - Identify missing decisions

## 🔧 Troubleshooting

### Common Issues

**ADRs Not Found**
- Check `ADR_DIRECTORY` environment variable
- Ensure ADR files follow naming convention (e.g., `001-decision-title.md`)
- Verify file permissions

**Inconsistent Analysis**
- Clear cache: `manage_cache` with action "clear"
- Ensure `PROJECT_PATH` points to correct directory
- Check for recent code changes

**Missing Suggestions**
- Try different `analysisType` values
- Include more file patterns in analysis
- Check if existing ADRs list is complete

## 📈 Best Practices

1. **Regular Reviews**: Run weekly ADR analysis
2. **Keep ADRs Updated**: Use suggested updates from analysis
3. **Document Decisions**: Create ADRs for all significant choices
4. **Validate Implementation**: Use rule validation regularly
5. **Research Integration**: Include research findings in decisions

## 🔗 Next Steps

- **[Usage Guide](USAGE_GUIDE.md)** - Complete tool reference
- **[New Projects Guide](getting-started-prd.md)** - Starting from PRD
- **[No ADRs Guide](getting-started-no-adrs.md)** - Starting from scratch

---

**Need Help?** Open an issue on [GitHub](https://github.com/tosin2013/mcp-adr-analysis-server/issues)
