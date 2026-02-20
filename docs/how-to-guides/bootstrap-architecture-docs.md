# 🆕 Getting Started: Projects Without ADRs

This guide helps you set up ADR analysis in an existing repository that has no Architectural Decision Records (ADRs). You'll learn how to discover architectural decisions hidden in your codebase and generate your first ADRs automatically.

> **💡 NEW**: For intelligent workflow recommendations, see the [Workflow & Development Guidance](getting-started-workflow-guidance.md) guide that provides AI-powered tool sequence recommendations based on your specific goals.

## 📋 Prerequisites

### Required Software

- **Node.js** ≥18.0.0
- **MCP Client** (Claude Desktop, Cline, Cursor, or Windsurf)
- **Git** repository with existing code

### MCP Server Installation

Choose your preferred installation method:

```bash
# Global installation (recommended)
npm install -g mcp-adr-analysis-server

# Or use npx for one-time usage
npx mcp-adr-analysis-server@latest

# Or use uvx (Python users)
uvx mcp-adr-analysis-server@latest
```

## ⚙️ Configuration

### 1. Environment Variables

Set up your environment variables. The server needs to know where your project is located:

```bash
export PROJECT_PATH="/path/to/your/project"
export ADR_DIRECTORY="./adrs"
export LOG_LEVEL="INFO"
export CACHE_ENABLED="true"
```

### 2. MCP Client Configuration

#### Claude Desktop

Add to `~/Library/Application Support/Claude/claude_desktop_config.json`:

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

#### Cline (VS Code)

Add to your Cline MCP settings:

```json
{
  "mcpServers": {
    "adr-analysis": {
      "command": "mcp-adr-analysis-server",
      "args": [],
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

### 3. Project Structure Setup

Create the ADR directory in your project:

```bash
mkdir -p ./adrs
```

## � Step-by-Step Workflow

### Step 1: Analyze Current Project Architecture

Start by understanding your existing codebase and implicit architectural decisions:

**Tool Call:**

```
analyze_project_ecosystem
```

**Parameters:**

```json
{
  "includePatterns": [
    "*.js",
    "*.ts",
    "*.py",
    "*.java",
    "*.go",
    "package.json",
    "requirements.txt",
    "pom.xml"
  ]
}
```

**What this does:**

- Scans your entire codebase
- Identifies technology stack and frameworks
- Discovers architectural patterns in use
- Analyzes dependencies and their relationships
- Detects implicit architectural decisions

**Expected Output:**

- Complete technology stack analysis (e.g., TypeScript, Node.js, React, Express)
- Framework and library inventory
- Architectural patterns identification (MVC, Component-based, REST API)
- Dependency analysis
- List of implicit decisions that should be documented

### Step 2: Get Detailed Architectural Context

Dive deeper into your project's architectural details:

**Tool Call:**

```
get_architectural_context
```

**Parameters:**

```json
{
  "includeCompliance": true
}
```

**What this does:**

- Analyzes code structure and design patterns
- Identifies quality attributes (security, performance, maintainability)
- Reviews compliance with best practices
- Provides detailed architectural insights

**Expected Output:**

- Architectural style analysis (e.g., Layered Architecture, Microservices)
- Design patterns in use (Factory, Observer, Singleton, etc.)
- Code quality and compliance assessment
- Recommendations for improvement
- Security and performance assessment

### Step 3: Discover Implicit Architectural Decisions

Find architectural decisions that are already embedded in your code but not documented:

**Tool Call:**

```
suggest_adrs
```

**Parameters:**

```json
{
  "analysisType": "implicit_decisions"
}
```

**What this does:**

- Analyzes your code for implicit architectural decisions
- Identifies patterns and choices you've already made
- Suggests which decisions should be documented as ADRs
- Prioritizes suggestions based on impact and importance

**Expected Output:**

- List of suggested ADRs with titles and rationale
- Priority ranking for each suggestion
- Context for why each decision should be documented

**Example suggestions you might get:**

- "Use TypeScript for Type Safety" - detected TypeScript usage throughout codebase
- "Express.js for REST API" - identified Express framework for server implementation
- "Component-based Architecture" - found React component patterns

### Step 4: Create Your First ADRs

Transform suggestions into properly formatted ADR documents:

**Tool Call:**

```
generate_adr_from_decision
```

**Parameters:**

```json
{
  "decisionData": {
    "title": "Use TypeScript for Type Safety",
    "context": "Need to ensure code quality and reduce runtime errors in our JavaScript application",
    "decision": "We will use TypeScript for all new code and gradually migrate existing JavaScript",
    "consequences": "Better code quality and IDE support, but requires build step and learning curve",
    "alternatives": ["Plain JavaScript", "Flow", "JSDoc with type annotations"],
    "evidence": [
      "Existing TypeScript usage in codebase",
      "Team familiarity",
      "Industry best practices"
    ]
  }
}
```

**What this does:**

- Generates a properly formatted ADR document
- Includes all standard ADR sections (Context, Decision, Consequences)
- Saves to your configured ADR directory with proper numbering
- Follows ADR template and formatting standards

### Step 5: Generate Enhanced TDD Implementation Tasks

Create actionable tasks using the new two-phase TDD approach:

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

- Reviews all your ADRs for implementation tasks with TDD approach
- Links all ADRs to create system-wide test coverage
- Integrates architectural rules validation
- Creates both test specifications and implementation tasks
- Generates a prioritized todo.md file with validation checkpoints

**Expected Output:**

- `todo.md` file with TDD-focused structured task list
- Test specifications linking all ADRs for comprehensive coverage
- Implementation tasks with architectural rule compliance checks
- Priority levels, estimated effort, and dependencies
- Production readiness validation criteria

**Example tasks you might get:**

- **Phase 1 (Tests)**: "Create TypeScript integration tests for all modules" (High priority, 1 week)
- **Phase 2 (Implementation)**: "Implement TypeScript migration with error handling" (High priority, 2 weeks)
- **Validation**: "Verify production-ready TypeScript setup meets ADR goals" (Critical, 2 days)

### Step 6: AI-Powered Workflow Orchestration

When starting from scratch, let AI plan your implementation workflow:

**Tool Call:**

```
tool_chain_orchestrator
```

**Parameters:**

```json
{
  "operation": "generate_plan",
  "userRequest": "Set up complete ADR infrastructure and generate initial implementations for new project",
  "includeContext": true,
  "optimizeFor": "comprehensive"
}
```

**What this does:**

- AI analyzes your project needs and generates optimal tool execution sequence
- Prevents confusion with structured workflow planning
- Provides clear dependencies and execution order
- Includes confidence scoring and alternative approaches

### Step 7: Advanced TODO Management

Use the sophisticated TODO management system:

**Tool Call:**

```
manage_todo
```

**Parameters:**

```json
{
  "operation": "add_tasks",
  "todoPath": "TODO.md",
  "section": "Architecture Implementation",
  "tasks": [
    {
      "title": "Implement TypeScript setup",
      "status": "pending",
      "priority": "high",
      "assignee": "dev-team"
    }
  ]
}
```

**Advanced TODO Features:**

- Complete task lifecycle management (pending → in_progress → completed)
- Dynamic health scoring integration
- Progress analytics with velocity metrics
- Smart merging with ADR-generated tasks

### Step 8: Establish Quality Validation

Set up validation to ensure implementations meet ADR goals:

**Tool Call:**

```
compare_adr_progress
```

**Parameters:**

```json
{
  "todoPath": "todo.md",
  "adrDirectory": "./adrs",
  "deepCodeAnalysis": true,
  "functionalValidation": true,
  "strictMode": true
}
```

**What this does:**

- Validates that implementations are production-ready and meet ADR goals
- Distinguishes mock implementations from production code
- Checks functional correctness in realistic environments
- Provides reality-check mechanisms against overconfident assessments
- Validates cross-ADR dependencies and consistency

**Expected Output:**

- Comprehensive validation report
- Mock vs production code analysis
- ADR goal compliance assessment
- Specific recommendations for improving implementation quality
- Quality gates for deployment readiness

### Step 9: Deployment Readiness Validation

Before deploying your new architecture, ensure everything is ready:

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
  "blockOnFailingTests": true,
  "integrateTodoTasks": true,
  "requireAdrCompliance": true,
  "strictMode": true
}
```

**What this does:**

- Validates all tests are passing (zero tolerance)
- Ensures minimum test coverage requirements
- Checks deployment history (if available)
- Validates ADR compliance in implementation
- Creates blocking tasks for any issues found

**Expected Output:**

- Deployment readiness score (0-100)
- Test validation results with detailed failures
- Code quality analysis (mock vs production)
- Critical blockers that must be resolved
- Clear resolution steps for each issue

### Step 10: Safe Deployment with Smart Git Push

Deploy your changes with confidence using deployment-aware git push:

**Tool Call:**

```
smart_git_push
```

**Parameters:**

```json
{
  "message": "Initial ADR implementation with TypeScript setup",
  "branch": "main",
  "checkDeploymentReadiness": true,
  "enforceDeploymentReadiness": true,
  "targetEnvironment": "production",
  "strictDeploymentMode": true
}
```

**What this does:**

- Runs comprehensive deployment readiness checks before push
- Blocks push if any critical issues are found
- Validates test results and coverage
- Ensures ADR compliance
- Provides detailed failure reports with fixes

## 📊 Expected Outputs

After completing the workflow, you should have:

### Generated Files

```
your-project/
├── ./
│   └── ./adrs/
│       ├── 0001-use-typescript-for-type-safety.md
│       ├── 0002-express-js-for-rest-api.md
│       └── 0003-component-based-architecture.md
├── todo.md
└── .mcp-adr-cache/
    └── analysis-cache.json
```

### ADR Example (Nygard Format)

```markdown
# 1. Use TypeScript for Type Safety

Date: 2024-01-15

## Status

Accepted

## Context

The project requires strong typing to prevent runtime errors and improve developer productivity. JavaScript's dynamic typing has led to several production bugs in the past.

## Decision

We will adopt TypeScript for all new development and gradually migrate existing JavaScript code to TypeScript.

## Consequences

### Positive

- Improved code quality and maintainability
- Better IDE support with autocomplete and refactoring
- Reduced runtime errors through compile-time checking
- Enhanced developer experience

### Negative

- Increased build complexity
- Learning curve for team members unfamiliar with TypeScript
- Additional tooling and configuration required
```

## 🧪 TDD Workflow for New ADR Implementation

Once you have your initial ADRs, use the enhanced TDD workflow to ensure proper implementation:

### Phase 1: Generate Test Specifications from ADRs

**Create comprehensive test specifications:**

```
Tool: generate_adr_todo
Parameters: {
  "phase": "test",
  "linkAdrs": true,
  "includeRules": true,
  "outputPath": "todo-tests.md"
}
```

**Benefits for new projects:**

- Establishes clear testing boundaries before implementation
- Links all ADRs to create comprehensive system test coverage
- Defines success criteria for each architectural decision
- Prevents scope creep and implementation drift

### Phase 2: Generate Production Implementation Tasks

**Create implementation roadmap:**

```
Tool: generate_adr_todo
Parameters: {
  "phase": "production",
  "linkAdrs": true,
  "includeRules": true,
  "outputPath": "todo-implementation.md"
}
```

**Benefits for new projects:**

- Clear implementation path that follows test specifications
- Architectural rule compliance built into every task
- Cross-ADR dependency validation
- Production readiness criteria for each component

### Quality Assurance and Mock Detection

**Prevent common pitfalls in new implementations:**

```
Tool: compare_adr_progress
Parameters: {
  "todoPath": "todo.md",
  "adrDirectory": "./adrs",
  "projectPath": "/path/to/project",
  "deepCodeAnalysis": true,
  "functionalValidation": true,
  "strictMode": true
}
```

**Common issues this prevents in new projects:**

- Mock implementations being mistaken for production code
- Incomplete implementations that don't meet ADR goals
- Missing error handling and input validation
- Inadequate integration testing
- Configuration issues that prevent real deployment

### Validation Patterns for New Projects

The validation system will check for:

**Mock Implementation Patterns (to avoid):**

- Console.log returns instead of real functionality
- Hardcoded values instead of configurable settings
- TODO comments in production paths
- Missing database connections or file I/O
- Stub functions without real implementation

**Production-Ready Patterns (to achieve):**

- Proper error handling and recovery
- Input validation and sanitization
- Real database or API integrations
- Configuration management
- Logging and monitoring setup
- Performance considerations

## 🤖 AI-Powered Problem Solving

### When LLMs Get Confused

If you're stuck or LLMs seem confused, use the human override system:

**Tool Call:**

```
troubleshoot_guided_workflow
```

**Parameters:**

```json
{
  "taskDescription": "Create ADRs for new TypeScript project and set up development workflow",
  "forceExecution": true,
  "includeContext": true
}
```

**What this does:**

- Forces AI-powered planning through OpenRouter.ai
- Cuts through LLM confusion with structured execution plans
- Provides clear command schemas for LLM understanding
- Includes confidence scoring and execution notes

### Systematic Troubleshooting

For comprehensive problem analysis:

**Tool Call:**

```
troubleshoot_guided_workflow
```

**Parameters:**

```json
{
  "operation": "full_workflow",
  "failureType": "build_failure",
  "description": "New project setup failing during initial ADR implementation",
  "severity": "medium"
}
```

### Smart Project Health Monitoring

Track your progress with intelligent scoring:

**Tool Call:**

```
smart_score
```

**Parameters:**

```json
{
  "operation": "diagnose_scores",
  "includeRecommendations": true,
  "focusAreas": ["todo", "architecture", "setup"]
}
```

## 🔍 Troubleshooting

### Common Issues

#### 1. "No project found" Error

**Problem:** Server can't locate your project
**Solution:**

```bash
# Verify PROJECT_PATH is set correctly
echo $PROJECT_PATH

# Or specify path explicitly in tool calls
{
  "projectPath": "/absolute/path/to/your/project"
}
```

#### 2. Empty Analysis Results

**Problem:** No technologies or patterns detected
**Solution:**

```bash
# Check if your project has recognizable files
ls package.json tsconfig.json *.config.*

# Include more file patterns
{
  "includePatterns": ["**/*", ".*", "Dockerfile", "*.yml"]
}
```

#### 3. Permission Errors

**Problem:** Can't create ADR directory
**Solution:**

```bash
# Create directory manually
mkdir -p ./adrs
chmod 755 ./adrs
```

#### 4. Cache Issues

**Problem:** Outdated analysis results
**Solution:**

```bash
# Clear cache
rm -rf .mcp-adr-cache/
# Or disable cache temporarily
export CACHE_ENABLED="false"
```

#### 5. AI Planning Issues

**Problem:** Tool orchestration not working as expected
**Solution:**

```bash
# Use human override to force planning
{
  "operation": "troubleshoot_guided_workflow",
  "taskDescription": "Your task description",
  "forceExecution": true
}
```

### Validation Steps

1. **Verify MCP Connection:**
   - Check if server appears in your MCP client
   - Test with a simple tool call

2. **Check Project Analysis:**
   - Ensure technologies are detected correctly
   - Verify file patterns include your main code

3. **Validate ADR Generation:**
   - Check ADR numbering is sequential
   - Verify markdown formatting is correct

## 🔗 Next Steps

### Enhance Your ADR Practice

1. **Content Security:** Use `analyze_content_security` to check for sensitive information in your ADRs
2. **Rule Generation:** Create architectural rules with `generate_rules` based on your decisions
3. **Research Integration:** Use `generate_research_questions` to identify areas needing investigation

### Advanced Workflows

- **[Working with Existing ADRs](./work-with-existing-adrs.md)** - Learn to enhance existing ADR practices
- **[Generate ADRs from PRD](./generate-adrs-from-prd.md)** - Start fresh with requirements-driven development

### Integration with Development Workflow

- Set up automated ADR validation in CI/CD
- Integrate with code review processes
- Create templates for common decision types

### Related Documentation

- **[Main README](https://github.com/tosin2013/mcp-adr-analysis-server/blob/main/README.md)** - Complete feature overview and installation
- **[Deploy Your Own Server](./deploy-your-own-server.md)** - Deploy your own MCP server
- **[Architecture Decisions](../adrs/)** - Example ADRs from this project

---

**Need Help?**

- Check the [troubleshooting section](#troubleshooting) above
- Review the [main documentation](https://github.com/tosin2013/mcp-adr-analysis-server/blob/main/README.md)
- Open an issue on [GitHub](https://github.com/tosin2013/mcp-adr-analysis-server/issues)
