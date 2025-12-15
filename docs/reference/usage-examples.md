# 🚀 MCP ADR Analysis Server - Usage Guide

A comprehensive guide for using the MCP ADR Analysis Server across different project scenarios. This guide provides practical examples with actual tool calls for three common use cases.

## 📋 Quick Setup

### Installation

```bash
# Global installation (recommended)
npm install -g mcp-adr-analysis-server

# Verify installation
mcp-adr-analysis-server --version
```

### MCP Client Configuration

Add to your MCP client configuration (e.g., Claude Desktop):

```json
{
  "mcpServers": {
    "adr-analysis": {
      "command": "mcp-adr-analysis-server",
      "env": {
        "PROJECT_PATH": "/path/to/your/project",
        "OPENROUTER_API_KEY": "your_openrouter_api_key_here",
        "EXECUTION_MODE": "full",
        "AI_MODEL": "anthropic/claude-3-sonnet",
        "ADR_DIRECTORY": "./adrs",
        "LOG_LEVEL": "INFO"
      }
    }
  }
}
```

## 🎯 Three Main Use Cases

### 1. 📚 Projects with Existing ADRs

**Scenario**: You have a project with existing Architectural Decision Records and want to analyze, enhance, or maintain them.

#### Key Tools for This Scenario:

- `discover_existing_adrs` - Find and catalog existing ADRs
- `analyze_project_ecosystem` - Understand current architecture
- `suggest_adrs` - Identify missing decisions
- `generate_adr_todo` - Create action items from ADRs

#### Step-by-Step Workflow:

**Step 1: Discover Existing ADRs**

```
Tool: discover_existing_adrs
Parameters:
{
  "adrDirectory": "./adrs"
}
```

_This will scan your ADR directory, catalog all existing decisions, and initialize the `.mcp-adr-cache` infrastructure (always runs regardless of whether ADRs are found)._

**Step 2: Analyze Project Architecture**

```
Tool: analyze_project_ecosystem
Parameters: {}
```

_Analyzes your entire project to understand the current technology stack and patterns._

**Step 3: Identify Missing Decisions**

```
Tool: suggest_adrs
Parameters:
{
  "analysisType": "comprehensive",
  "existingAdrs": ["Use React for Frontend", "PostgreSQL for Database"]
}
```

_Suggests new ADRs based on code analysis and existing decisions._

**Step 4: Generate Enhanced TDD Action Items**

```
Tool: generate_adr_todo
Parameters:
{
  "scope": "all",
  "phase": "both",
  "linkAdrs": true,
  "includeRules": true
}
```

_Creates a comprehensive todo.md with two-phase TDD approach, linking all ADRs and including architectural rules validation._

**Step 5: Validate Implementation Progress**

```
Tool: compare_adr_progress
Parameters:
{
  "todoPath": "todo.md",
  "adrDirectory": "./adrs",
  "deepCodeAnalysis": true,
  "functionalValidation": true,
  "strictMode": true
}
```

_Validates that implementations are production-ready and meet ADR goals, with sophisticated mock vs production detection._

### 2. 🆕 Projects Without Any ADRs

**Scenario**: You have an existing codebase but no documented architectural decisions. You want to start documenting your architecture.

#### Key Tools for This Scenario:

- `analyze_project_ecosystem` - Understand current architecture
- `suggest_adrs` - Discover implicit decisions
- `generate_adr_from_decision` - Create formal ADRs

#### Step-by-Step Workflow:

**Step 1: Analyze Your Project**

```
Tool: analyze_project_ecosystem
Parameters: {
  "includePatterns": ["*.js", "*.ts", "*.py", "*.java", "package.json", "requirements.txt"]
}
```

_Discovers your technology stack, frameworks, and architectural patterns._

**Step 2: Discover Implicit Decisions**

```
Tool: suggest_adrs
Parameters: {
  "analysisType": "implicit_decisions"
}
```

_Identifies architectural decisions that are implicit in your code but not documented._

**Step 3: Create Your First ADRs**

```
Tool: generate_adr_from_decision
Parameters: {
  "decisionData": {
    "title": "Use Express.js for API Server",
    "context": "Need a web framework for our Node.js backend API",
    "decision": "We will use Express.js as our web application framework",
    "consequences": "Fast development, large ecosystem, but requires additional middleware for advanced features",
    "alternatives": ["Fastify", "Koa.js", "NestJS"]
  }
}
```

_Creates a properly formatted ADR from decision data._

### 3. 📋 New Projects with PRD.md

**Scenario**: You're starting a new project and have a Product Requirements Document (PRD.md). You want to generate ADRs from your requirements.

#### Key Tools for This Scenario:

- `generate_adrs_from_prd` - Convert PRD to ADRs
- `analyze_project_ecosystem` - Validate generated decisions
- `generate_adr_todo` - Create implementation tasks

#### Step-by-Step Workflow:

**Step 1: Generate ADRs from PRD**

```
Tool: generate_adrs_from_prd
Parameters: {
  "prdPath": "PRD.md",
  "outputDirectory": "./adrs"
}
```

_Analyzes your PRD.md and generates appropriate ADRs for architectural decisions._

**Step 2: Validate Against Project Context**

```
Tool: analyze_project_ecosystem
Parameters: {}
```

_Ensures generated ADRs align with your project structure and constraints._

**Step 3: Create Implementation Tasks**

```
Tool: generate_adr_todo
Parameters: {
  "scope": "pending"
}
```

_Generates actionable tasks from your newly created ADRs._

## 🧪 Enhanced TDD Workflow

The server now provides a sophisticated Test-Driven Development workflow that integrates all ADRs in your system:

### Two-Phase TDD Approach

**Phase 1: Generate Test Specifications**

```
Tool: generate_adr_todo
Parameters: {
  "phase": "test",
  "linkAdrs": true,
  "includeRules": true,
  "outputPath": "todo-tests.md"
}
```

_Generates comprehensive mock test specifications that link all ADRs for complete system coverage._

**Phase 2: Generate Production Implementation**

```
Tool: generate_adr_todo
Parameters: {
  "phase": "production",
  "linkAdrs": true,
  "includeRules": true,
  "outputPath": "todo-implementation.md"
}
```

_Creates production-ready implementation tasks that pass the mock tests and meet ADR goals._

### Advanced Validation System

**Comprehensive Progress Validation**

```
Tool: compare_adr_progress
Parameters: {
  "todoPath": "todo.md",
  "adrDirectory": "./adrs",
  "projectPath": "/path/to/project",
  "deepCodeAnalysis": true,        // Distinguish mock from production code
  "functionalValidation": true,    // Validate code actually works
  "strictMode": true,             // Reality-check mechanisms
  "includeTestCoverage": true,     // Validate test coverage
  "validateDependencies": true,    // Check cross-ADR dependencies
  "environmentValidation": true    // Test in realistic environments
}
```

_Prevents LLM overconfidence by detecting mock implementations masquerading as production code._

### Mock vs Production Detection

The validation system includes sophisticated patterns to detect:

- **Mock Implementations**: Console.log returns, hardcoded values, TODO comments
- **Production Code**: Error handling, input validation, integration tests, real database connections
- **ADR Goal Compliance**: Validates implementations actually achieve ADR objectives

## 🔧 Advanced Features

### Content Security & Masking

Protect sensitive information in your analysis:

```
Tool: analyze_content_security
Parameters: {
  "content": "Your code or documentation",
  "contentType": "code"
}
```

### Research Integration

Incorporate research findings into decisions:

```
Tool: generate_research_questions
Parameters: {
  "context": "Choosing between microservices and monolith",
  "scope": "architecture"
}
```

### Rule Generation & Validation

Create and enforce architectural rules:

```
Tool: generate_rules
Parameters: {
  "adrDirectory": "./adrs",
  "includeCompliance": true
}
```

## 📊 Available Resources

Access structured data through MCP resources:

- **`adr://architectural_knowledge_graph`** - Complete project analysis graph
- **`adr://analysis_report`** - Comprehensive project reports
- **`adr://adr_list`** - ADR inventory and metadata

## 🆘 Common Workflows

### Weekly ADR Review

1. `discover_existing_adrs` - Check current state
2. `suggest_adrs` - Find new decisions needed
3. `generate_adr_todo` - Update action items with TDD approach
4. `compare_adr_progress` - Validate implementation progress

### New Feature Planning

1. `analyze_project_ecosystem` - Understand current state
2. `suggest_adrs` - Identify decisions needed for feature
3. `generate_adr_from_decision` - Document decisions
4. `generate_adr_todo` - Create TDD implementation plan

### Architecture Audit

1. `analyze_project_ecosystem` - Full project analysis
2. `generate_rules` - Extract current rules
3. `validate_rules` - Check compliance
4. `compare_adr_progress` - Validate production readiness

### TDD Implementation Cycle

1. `generate_adr_todo` (phase: "test") - Create test specifications
2. Implement mock tests based on generated specifications
3. `generate_adr_todo` (phase: "production") - Create implementation tasks
4. Implement production code to pass tests
5. `compare_adr_progress` - Validate against ADR goals and detect mock patterns

### Quality Assurance Review

1. `compare_adr_progress` (strictMode: true) - Deep validation
2. `generate_rules` - Extract architectural rules
3. `validate_rules` - Check rule compliance
4. Address any mock implementations flagged by validation

## 🔗 Next Steps

- **[Installation Guide](../how-to-guides/installation-guide.md)** - Complete installation and configuration
- **[ADR Examples](./adrs/)** - See real ADRs from this project
- **[Deploy Your Own Server](../how-to-guides/deploy-your-own-server.md)** - Deploy your own MCP server

---

**Need Help?** Open an issue on [GitHub](https://github.com/tosin2013/mcp-adr-analysis-server/issues)
