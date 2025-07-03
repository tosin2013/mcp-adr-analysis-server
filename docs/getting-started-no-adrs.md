# 🆕 Getting Started: Projects Without ADRs

This guide helps you set up ADR analysis in an existing repository that has no Architectural Decision Records (ADRs). You'll learn how to discover architectural decisions hidden in your codebase and generate your first ADRs automatically.

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
export ADR_DIRECTORY="docs/adrs"
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
        "ADR_DIRECTORY": "docs/adrs",
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
        "ADR_DIRECTORY": "docs/adrs"
      }
    }
  }
}
```

### 3. Project Structure Setup

Create the ADR directory in your project:

```bash
mkdir -p docs/adrs
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
  "includePatterns": ["*.js", "*.ts", "*.py", "*.java", "*.go", "package.json", "requirements.txt", "pom.xml"]
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
    "evidence": ["Existing TypeScript usage in codebase", "Team familiarity", "Industry best practices"]
  }
}
```

**What this does:**
- Generates a properly formatted ADR document
- Includes all standard ADR sections (Context, Decision, Consequences)
- Saves to your configured ADR directory with proper numbering
- Follows ADR template and formatting standards

### Step 5: Generate Implementation Tasks

Create actionable tasks from your newly created ADRs:

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
- Reviews all your ADRs for implementation tasks
- Extracts actionable items and next steps
- Creates a prioritized todo.md file
- Identifies dependencies between tasks

**Expected Output:**
- `todo.md` file with structured task list
- Priority levels and estimated effort
- Dependencies and sequencing information

**Example tasks you might get:**
- "Implement TypeScript migration plan" (High priority, 2 weeks)
- "Set up Express.js security middleware" (Medium priority, 3 days)
- "Document API endpoints" (Low priority, 1 week)

## 📊 Expected Outputs

After completing the workflow, you should have:

### Generated Files
```
your-project/
├── docs/
│   └── adrs/
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
mkdir -p docs/adrs
chmod 755 docs/adrs
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

- **[Repository with Existing ADRs](getting-started-existing-adrs.md)** - Learn to enhance existing ADR practices
- **[Blank Repository with PRD](getting-started-blank-repo.md)** - Start fresh with requirements-driven development

### Integration with Development Workflow

- Set up automated ADR validation in CI/CD
- Integrate with code review processes
- Create templates for common decision types

### Related Documentation

- **[Main README](../README.md)** - Complete feature overview and installation
- **[NPM Publishing Guide](NPM_PUBLISHING.md)** - Deploy your own MCP server
- **[Architecture Decisions](adrs/)** - Example ADRs from this project

---

**Need Help?** 
- Check the [troubleshooting section](#-troubleshooting) above
- Review the [main documentation](../README.md)
- Open an issue on [GitHub](https://github.com/tosin2013/mcp-adr-analysis-server/issues)
