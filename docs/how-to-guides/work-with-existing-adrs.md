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
- Scans your ADR directory and initializes the `.mcp-adr-cache` infrastructure
- Catalogs all existing decisions (or reports none found)
- Identifies ADR format and structure
- Creates an inventory of your architectural decisions
- **Always sets up the cache infrastructure, regardless of whether ADRs are found**

**Expected Output:**
- List of all ADRs with titles, numbers, and status (or "No ADRs found" if none exist)
- Analysis of ADR quality and completeness
- Identification of any formatting issues
- **Cache Infrastructure Status**: Confirms `.mcp-adr-cache` setup is complete

> **💡 Important**: `discover_existing_adrs` always initializes the cache infrastructure that other tools depend on, making it the recommended first step for any project - whether it has existing ADRs or not.

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

### Step 4: Generate Enhanced TDD Action Items

Create a comprehensive roadmap using the new two-phase TDD approach:

**Tool Call:**
```
generate_adr_todo
```

**Parameters:**
```json
{
  "scope": "all",
  "phase": "both",
  "linkAdrs": true,
  "includeRules": true
}
```

**What this does:**
- Extracts action items from existing ADRs with TDD approach
- Links all ADRs for system-wide test coverage
- Integrates architectural rules validation
- Creates both test specifications and implementation tasks
- Generates a prioritized todo list with validation checkpoints

**Expected Output:**
- `todo.md` file with TDD-focused actionable items
- Test specifications linking all ADRs
- Implementation tasks with rule compliance checks
- Production readiness validation criteria

### Step 5: Advanced TODO Management

Use the new TODO management system for complete lifecycle tracking:

**Tool Call:**
```
manage_todo
```

**Parameters:**
```json
{
  "operation": "analyze_progress",
  "todoPath": "TODO.md",
  "timeframe": "month",
  "includeVelocity": true
}
```

**What this does:**
- Complete TODO.md lifecycle management with smart parsing
- Task status transitions (pending → in_progress → completed/blocked)
- Dynamic health scoring integration
- Progress analytics with velocity metrics
- Interactive operations with confirmation flows

**Advanced TODO Operations:**
- `update_status` - Update task statuses with notes and assignees
- `add_tasks` - Add new tasks to specific sections with metadata
- `merge_adr_updates` - Smart merge with ADR-generated tasks
- `sync_progress` - Bidirectional sync between TODO.md and ADR status

### Step 6: Validate Implementation Progress

Use the enhanced validation system to ensure quality implementation:

**Tool Call:**
```
compare_adr_progress
```

**Parameters:**
```json
{
  "todoPath": "todo.md",
  "adrDirectory": "docs/adrs",
  "deepCodeAnalysis": true,
  "functionalValidation": true,
  "strictMode": true
}
```

**What this does:**
- Validates that implementations meet ADR goals
- Distinguishes mock implementations from production code
- Checks functional correctness in realistic environments
- Provides reality-check mechanisms against LLM overconfidence
- Validates cross-ADR dependencies and consistency

**Expected Output:**
- Comprehensive validation report
- Mock vs production code analysis
- ADR goal compliance assessment
- Actionable recommendations for improving implementation quality

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

**2. Update Todo List with TDD Approach**
```
Tool: generate_adr_todo
Parameters: {
  "scope": "pending",
  "phase": "both",
  "linkAdrs": true,
  "includeRules": true
}
```

**3. Validate Current Implementation**
```
Tool: compare_adr_progress
Parameters: {
  "todoPath": "todo.md",
  "adrDirectory": "docs/adrs",
  "strictMode": true
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

## 🧪 Enhanced TDD Workflow for Existing ADRs

When you have existing ADRs, you can use the enhanced TDD workflow to ensure proper implementation:

### Phase 1: Generate Test Specifications

**Create comprehensive test specifications from your existing ADRs:**

```
Tool: generate_adr_todo
Parameters: {
  "phase": "test",
  "linkAdrs": true,
  "includeRules": true,
  "outputPath": "todo-tests.md"
}
```

**What this does:**
- Links all existing ADRs to create comprehensive test coverage
- Generates mock test specifications for each architectural decision
- Creates system-wide integration tests that validate ADR goals
- Establishes clear testing boundaries for implementation

### Phase 2: Generate Production Implementation

**Create production implementation tasks:**

```
Tool: generate_adr_todo
Parameters: {
  "phase": "production",
  "linkAdrs": true,
  "includeRules": true,
  "outputPath": "todo-implementation.md"
}
```

**What this does:**
- Creates implementation tasks that pass the test specifications
- Ensures production code meets ADR goals and architectural rules
- Validates cross-ADR dependencies and consistency
- Provides clear criteria for production readiness

### Validation and Quality Assurance

**Validate TODO completion against ADRs and environment:**

```
Tool: compare_adr_progress
Parameters: {
  "todoPath": "todo.md",
  "adrDirectory": "docs/adrs",
  "projectPath": ".",
  "deepCodeAnalysis": true,
  "functionalValidation": true,
  "strictMode": true
}
```

### Step 6: Deployment Readiness Validation

Before deploying any changes based on your ADRs, ensure deployment readiness:

**Tool Call:**
```
deployment_readiness
```

**Parameters:**
```json
{
  "operation": "full_audit",
  "targetEnvironment": "production",
  "maxTestFailures": 0,
  "requireTestCoverage": 80,
  "deploymentSuccessThreshold": 80,
  "integrateTodoTasks": true,
  "requireAdrCompliance": true
}
```

**What this does:**
- Validates all tests are passing (zero tolerance by default)
- Checks test coverage meets requirements
- Analyzes deployment history for patterns
- Validates ADR compliance in implementation
- Creates blocking tasks for any issues found

**Expected Output:**
- Deployment readiness score and confidence level
- Test validation results with failure analysis
- Deployment history patterns and recommendations
- Critical blockers that must be resolved
- Emergency override instructions if needed

### Step 7: Safe Deployment with Smart Git Push

Use enhanced git push with deployment readiness checks:

**Tool Call:**
```
smart_git_push
```

**Parameters:**
```json
{
  "message": "Implement ADR-005: API versioning strategy",
  "branch": "main",
  "checkDeploymentReadiness": true,
  "enforceDeploymentReadiness": true,
  "targetEnvironment": "production",
  "strictDeploymentMode": true
}
```

**What this does:**
- Runs comprehensive deployment readiness checks
- Blocks push if tests are failing or coverage is low
- Validates deployment history success rate
- Enforces ADR compliance before allowing push
- Provides detailed blocking reports with resolution steps

### Validation and Quality Assurance

**Prevent mock implementations from being considered production-ready:**

```
Tool: compare_adr_progress
Parameters: {
  "todoPath": "todo.md",
  "adrDirectory": "docs/adrs",
  "projectPath": "/path/to/project",
  "deepCodeAnalysis": true,
  "functionalValidation": true,
  "strictMode": true,
  "includeTestCoverage": true,
  "validateDependencies": true
}
```

**Mock Detection Patterns:**
- Detects console.log returns, hardcoded values, TODO comments
- Identifies missing error handling, input validation
- Validates real database connections vs mock data
- Ensures integration tests vs unit tests

## 📊 Advanced Analysis and AI-Powered Workflows

### AI-Powered Tool Orchestration

When working with complex multi-step tasks, let AI plan the optimal tool sequence:

**Tool Call:**
```
tool_chain_orchestrator
```

**Parameters:**
```json
{
  "operation": "generate_plan",
  "userRequest": "Update all ADRs for our microservices migration and ensure TODO tasks are aligned",
  "includeContext": true,
  "optimizeFor": "comprehensive"
}
```

**What this does:**
- AI analyzes your request to generate optimal tool execution sequence
- Prevents LLM confusion with reality checks and hallucination detection
- Provides structured execution plans with dependencies
- Includes confidence scoring and alternative approaches

### Human Override for Complex Tasks

When LLMs get confused or stuck, force AI-powered planning:

**Tool Call:**
```
troubleshoot_guided_workflow
```

**Parameters:**
```json
{
  "taskDescription": "Review and update ADRs after architecture changes",
  "forceExecution": true,
  "includeContext": true
}
```

### Troubleshooting Workflow

For systematic problem solving with ADR/TODO alignment:

**Tool Call:**
```
troubleshoot_guided_workflow
```

**Parameters:**
```json
{
  "operation": "full_workflow",
  "failureType": "build_failure",
  "description": "Build failing after implementing ADR decisions",
  "severity": "high"
}
```

### Smart Project Health Scoring

Get comprehensive project health metrics across all dimensions:

**Tool Call:**
```
smart_score
```

**Parameters:**
```json
{
  "operation": "diagnose_scores",
  "includeRecommendations": true,
  "focusAreas": ["todo", "architecture", "deployment"]
}
```

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
