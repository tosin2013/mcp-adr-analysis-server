# MCP ADR Analysis Server

[![GitHub](https://img.shields.io/badge/github-tosin2013/mcp--adr--analysis--server-blue.svg?style=flat&logo=github)](https://github.com/tosin2013/mcp-adr-analysis-server)
[![License](https://img.shields.io/badge/license-MIT-brightgreen)](LICENSE)
[![NPM Version](https://img.shields.io/npm/v/mcp-adr-analysis-server)](https://www.npmjs.com/package/mcp-adr-analysis-server)
[![Node.js](https://img.shields.io/badge/node-%3E%3D18.0.0-brightgreen)](https://nodejs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.3+-blue)](https://www.typescriptlang.org/)

A comprehensive Model Context Protocol (MCP) server that provides **AI-powered architectural analysis** with **immediate, actionable results**. Unlike traditional MCP tools that return prompts, this server executes analysis internally using OpenRouter.ai and returns actual insights, ADR suggestions, and architectural recommendations.

**Author**: [Tosin Akinosho](https://github.com/tosin2013)
**Repository**: [https://github.com/tosin2013/mcp-adr-analysis-server.git](https://github.com/tosin2013/mcp-adr-analysis-server.git)

## 🚀 What is the Model Context Protocol (MCP)?

> The Model Context Protocol (MCP) is an open protocol that enables seamless integration between LLM applications and external data sources and tools. Whether you're building an AI-powered IDE, enhancing a chat interface, or creating custom AI workflows, MCP provides a standardized way to connect LLMs with the context they need.
>
> — [Model Context Protocol README](https://github.com/modelcontextprotocol#:~:text=The%20Model%20Context,context%20they%20need.)

This MCP server enhances AI assistants with deep architectural analysis capabilities, enabling intelligent code generation, decision tracking, and development workflow automation.

## ✨ Key Features

### 🤖 **AI-Powered Execution (NEW)**
- **Immediate Results**: Get actual ADR suggestions, not prompts to submit elsewhere
- **OpenRouter.ai Integration**: Supports Claude, GPT-4, and cost-effective models
- **Smart Caching**: Intelligent response caching with configurable TTL
- **Graceful Fallback**: Automatic fallback to prompt-only mode when AI unavailable

### 🏗️ **Architectural Analysis & Intelligence**
- **Technology Detection**: AI-powered identification of ANY technology stack
- **Pattern Recognition**: Intelligent detection of architectural patterns and best practices
- **Dependency Analysis**: Comprehensive project structure and dependency mapping
- **Knowledge Graph Generation**: Create interconnected architectural knowledge representations

### 📋 **ADR Management & Generation**
- **ADR Generation from PRD**: Convert Product Requirements Documents to structured ADRs
- **Intelligent ADR Suggestions**: Auto-suggest ADRs from implicit code decisions
- **ADR Lifecycle Management**: Complete ADR creation, analysis, and maintenance workflows
- **Template Support**: Multiple ADR formats (Nygard, MADR, custom templates)

### 🛡️ **Enterprise Security & Compliance**
- **Content Masking**: Automatic detection and masking of sensitive information
- **Secret Prevention**: Proactive guidance to prevent secret exposure
- **Security Hardening**: Built-in security best practices and validation
- **Compliance Tracking**: Ensure architectural decisions meet enterprise standards

### 📊 **Development Workflow Automation**
- **Todo Management**: Generate actionable task lists from ADRs and project analysis
- **Deployment Tracking**: Monitor deployment progress and completion verification
- **Environment Analysis**: Analyze and optimize deployment environments
- **Rule Generation & Validation**: Extract and validate architectural rules from decisions

## 🛠️ Available MCP Tools (25 Total)

### 🎯 **Workflow & Development Guidance** (AI-Powered ✅) **NEW!**
- **`get_workflow_guidance`** - Intelligent workflow advisor that recommends optimal tool sequences based on your goals and project context
- **`get_development_guidance`** - Comprehensive development guidance that translates architectural decisions into specific coding tasks and implementation roadmap

### 🏗️ **Core Analysis Tools** (AI-Powered ✅)
- **`analyze_project_ecosystem`** - Comprehensive technology and pattern detection
- **`get_architectural_context`** - Generate intelligent architectural insights + automatic ADR setup
- **`generate_adrs_from_prd`** - Convert requirements to structured ADRs
- **`analyze_content_security`** - Detect sensitive information patterns

### 📋 **ADR Management Tools** (AI-Powered ✅)
- **`suggest_adrs`** - Auto-suggest ADRs from implicit decisions
- **`generate_adr_from_decision`** - Create ADRs from specific decisions
- **`discover_existing_adrs`** - Intelligent ADR discovery and analysis
- **`generate_adr_todo`** - Create actionable task lists from ADRs

### 🔍 **Research & Documentation Tools** (AI-Powered ✅)
- **`generate_research_questions`** - Create context-aware research questions
- **`incorporate_research`** - Integrate research findings into decisions
- **`create_research_template`** - Generate research documentation templates

### 🛡️ **Security & Compliance Tools** (AI-Powered ✅)
- **`generate_content_masking`** - Intelligent content masking and protection
- **`configure_custom_patterns`** - Customize security and masking settings
- **`apply_basic_content_masking`** - Basic content masking (fallback)
- **`validate_content_masking`** - Validate masking effectiveness

### 🏗️ **Rule & Governance Tools** (AI-Powered ✅)
- **`generate_rules`** - Extract architectural rules from ADRs
- **`validate_rules`** - Validate code against architectural rules
- **`create_rule_set`** - Create comprehensive rule management systems

### 🚀 **Deployment & Environment Tools** (AI-Powered ✅)
- **`analyze_environment`** - Environment analysis and optimization
- **`analyze_deployment_progress`** - Deployment tracking and verification

### ⚙️ **Utility & Management Tools**
- **`manage_cache`** - Cache management and optimization
- **`configure_output_masking`** - Configure global output masking
- **`request_action_confirmation`** - Interactive user confirmation workflows
- **`check_ai_execution_status`** - Diagnostic tool to troubleshoot AI execution configuration issues

## 📦 Installation

### NPM Installation (Recommended)
```bash
# Global installation
npm install -g mcp-adr-analysis-server

# Local installation
npm install mcp-adr-analysis-server
```

### Using with uvx (Python-style)
```bash
# Run directly with uvx
uvx mcp-adr-analysis-server@latest
```

### From Source
```bash
git clone https://github.com/tosin2013/mcp-adr-analysis-server.git
cd mcp-adr-analysis-server
npm install
npm run build
npm start
```

## 🤖 AI Execution Configuration

The MCP server supports **AI-powered execution** that transforms tools from returning prompts to returning actual results. This solves the fundamental UX issue where AI agents receive prompts instead of actionable data.

### Quick Setup

1. **Get OpenRouter API Key**: Visit [https://openrouter.ai/keys](https://openrouter.ai/keys)
2. **Set Environment Variables**:
   ```bash
   OPENROUTER_API_KEY=your_openrouter_api_key_here
   EXECUTION_MODE=full
   AI_MODEL=anthropic/claude-3-sonnet
   ```
3. **Restart MCP Server**: Tools now return actual results instead of prompts!

### Environment Variables

#### **AI Execution (Recommended)**
- **`OPENROUTER_API_KEY`** (Required for AI): OpenRouter API key from https://openrouter.ai/keys
- **`EXECUTION_MODE`** (Optional): `full` (AI execution) or `prompt-only` (legacy)
- **`AI_MODEL`** (Optional): AI model to use (see supported models below)

#### **Performance Tuning (Optional)**
- **`AI_TEMPERATURE`** (Optional): Response consistency (0-1, default: 0.1)
- **`AI_MAX_TOKENS`** (Optional): Response length limit (default: 4000)
- **`AI_TIMEOUT`** (Optional): Request timeout in ms (default: 60000)
- **`AI_CACHE_ENABLED`** (Optional): Enable response caching (default: true)

#### **Project Configuration**
- **`PROJECT_PATH`** (Required): Path to the project directory to analyze
- **`ADR_DIRECTORY`** (Optional): Directory containing ADR files (default: `docs/adrs`)
- **`LOG_LEVEL`** (Optional): Logging level (DEBUG, INFO, WARN, ERROR)

### Supported AI Models

| Model | Provider | Use Case | Input Cost | Output Cost |
|-------|----------|----------|------------|-------------|
| `anthropic/claude-3-sonnet` | Anthropic | Analysis, reasoning | $3.00/1K | $15.00/1K |
| `anthropic/claude-3-haiku` | Anthropic | Quick tasks | $0.25/1K | $1.25/1K |
| `openai/gpt-4o` | OpenAI | Versatile analysis | $5.00/1K | $15.00/1K |
| `openai/gpt-4o-mini` | OpenAI | Cost-effective | $0.15/1K | $0.60/1K |

## ⚙️ Client Configuration

### Claude Desktop (Recommended Setup)
Add to your Claude Desktop configuration (`~/Library/Application Support/Claude/claude_desktop_config.json` on macOS):

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
        "EXECUTION_MODE": "full",
        "ADR_DIRECTORY": "docs/adrs",
        "LOG_LEVEL": "ERROR"
      }
    }
  }
}
```

### Cline (VS Code Extension)
Add to your `cline_mcp_settings.json`:

```json
{
  "mcpServers": {
    "mcp-adr-analysis-server": {
      "command": "npx",
      "args": ["mcp-adr-analysis-server"],
      "env": {
        "PROJECT_PATH": "${workspaceFolder}",
        "ADR_DIRECTORY": "docs/adrs",
        "LOG_LEVEL": "ERROR"
      }
    }
  }
}
```

### Cursor
Create `.cursor/mcp.json` in your project:

```json
{
  "mcpServers": {
    "adr-analysis": {
      "command": "npx",
      "args": ["mcp-adr-analysis-server"],
      "env": {
        "PROJECT_PATH": ".",
        "ADR_DIRECTORY": "docs/adrs",
        "LOG_LEVEL": "ERROR"
      }
    }
  }
}
```

### Windsurf
Add to `~/.codeium/windsurf/mcp_config.json`:

```json
{
  "mcpServers": {
    "adr-analysis": {
      "command": "mcp-adr-analysis-server",
      "args": [],
      "env": {
        "PROJECT_PATH": "/path/to/your/project",
        "ADR_DIRECTORY": "docs/adrs",
        "LOG_LEVEL": "ERROR"
      }
    }
  }
}
```

### Amazon Q CLI
Add to `~/.aws/amazonq/mcp.json`:

```json
{
  "mcpServers": {
    "adr-analysis": {
      "command": "uvx",
      "args": ["mcp-adr-analysis-server@latest"],
      "env": {
        "PROJECT_PATH": "/path/to/your/project",
        "ADR_DIRECTORY": "docs/adrs",
        "LOG_LEVEL": "ERROR"
      }
    }
  }
}
```

## 🚀 Usage Examples

### Basic Project Analysis
```typescript
// Analyze any project's technology stack and architecture
const analysis = await analyzeProjectEcosystem({
  projectPath: "/path/to/project",
  analysisType: "comprehensive"
});

// Get intelligent architectural insights
const context = await getArchitecturalContext({
  projectPath: "/path/to/project",
  focusAreas: ["security", "scalability", "maintainability"]
});
```

### ADR Generation from Requirements
```typescript
// Convert PRD to structured ADRs
const adrs = await generateAdrsFromPrd({
  prdPath: "docs/PRD.md",
  outputDirectory: "docs/adrs",
  template: "nygard"
});

// Generate actionable todos from ADRs
const todos = await generateAdrTodo({
  adrDirectory: "docs/adrs",
  outputPath: "todo.md"
});
```

### Security and Compliance
```typescript
// Analyze and mask sensitive content
const maskedContent = await maskContent({
  content: "API_KEY=secret123",
  maskingLevel: "strict"
});

// Validate architectural rules
const validation = await validateRules({
  projectPath: "/path/to/project",
  ruleSet: "enterprise-security"
});
```

### Research and Documentation
```typescript
// Generate context-aware research questions
const questions = await generateResearchQuestions({
  projectContext: analysis,
  focusArea: "microservices-migration"
});

// Incorporate research findings
const updatedAdrs = await incorporateResearch({
  researchFindings: findings,
  adrDirectory: "docs/adrs"
});
```

## 🎯 Use Cases

### 👨‍💻 **AI Coding Assistants**
*Enhance AI coding assistants like Cline, Cursor, and Claude Code*

- **Intelligent Code Generation**: Generate code that follows architectural patterns and best practices
- **Architecture-Aware Refactoring**: Refactor code while maintaining architectural integrity
- **Decision Documentation**: Automatically document architectural decisions as you code
- **Pattern Recognition**: Identify and suggest architectural patterns for new features

### 💬 **Conversational AI Assistants**
*Enhance chatbots and business agents with architectural intelligence*

- **Technical Documentation**: Answer questions about system architecture and design decisions
- **Compliance Checking**: Verify that proposed changes meet architectural standards
- **Knowledge Synthesis**: Combine information from multiple sources for comprehensive answers
- **Decision Support**: Provide data-driven recommendations for architectural choices

### 🤖 **Autonomous Development Agents**
*Enable autonomous agents to understand and work with complex architectures*

- **Automated Analysis**: Continuously analyze codebases for architectural drift
- **Rule Enforcement**: Automatically enforce architectural rules and patterns
- **Documentation Generation**: Generate and maintain architectural documentation
- **Deployment Validation**: Verify deployment readiness and compliance

### 🏢 **Enterprise Architecture Management**
*Support enterprise architects and development teams*

- **Portfolio Analysis**: Analyze multiple projects for consistency and compliance
- **Migration Planning**: Plan and track architectural migrations and modernization
- **Risk Assessment**: Identify architectural risks and technical debt
- **Standards Enforcement**: Ensure compliance with enterprise architectural standards

## 🛠️ Technology Stack

- **Runtime**: Node.js (>=18.0.0)
- **Language**: TypeScript with strict configuration
- **Core Framework**: @modelcontextprotocol/sdk
- **Validation**: Zod schemas for all data structures
- **Testing**: Jest with >80% coverage target
- **Linting**: ESLint with comprehensive rules
- **Build**: TypeScript compiler with incremental builds
- **CI/CD**: GitHub Actions with automated testing and publishing

## � Project Structure

```
mcp-adr-analysis-server/
├── src/
│   ├── index.ts              # Main MCP server entry point
│   ├── tools/                # MCP tool implementations (23 tools)
│   ├── resources/            # MCP resource implementations
│   ├── prompts/              # MCP prompt implementations
│   ├── types/                # TypeScript interfaces & schemas
│   ├── utils/                # Utility functions and helpers
│   └── cache/                # Intelligent caching system
├── docs/
│   ├── adrs/                 # Architectural Decision Records
│   ├── research/             # Research findings and templates
│   └── NPM_PUBLISHING.md     # NPM publishing guide
├── tests/                    # Comprehensive test suite
├── .github/workflows/        # CI/CD automation
├── scripts/                  # Build and deployment scripts
└── dist/                     # Compiled JavaScript output
```

## 🧪 Testing

```bash
# Run all tests
npm test

# Run tests with coverage
npm run test:coverage

# Run tests in watch mode
npm run test:watch

# Test MCP server functionality
npm run test:package
```

### Test Coverage
- **Unit Tests**: Individual component testing with >80% coverage
- **Integration Tests**: MCP protocol and file system testing
- **Custom Matchers**: ADR and schema validation helpers
- **Performance Tests**: Caching and optimization validation

## 🔧 Development

### Prerequisites
- Node.js >= 18.0.0
- npm or yarn
- Git

### Setup
```bash
# Clone the repository
git clone https://github.com/tosin2013/mcp-adr-analysis-server.git
cd mcp-adr-analysis-server

# Install dependencies
npm install

# Build the project
npm run build

# Run tests
npm test

# Start development server
npm run dev
```

### Available Scripts
```bash
npm run build         # Build TypeScript to JavaScript
npm run dev           # Start development server with hot reload
npm test              # Run Jest tests with coverage
npm run lint          # Run ESLint checks
npm run lint:fix      # Fix ESLint issues automatically
npm run clean         # Clean build artifacts and cache
npm run format        # Format code with Prettier
npm run typecheck     # Run TypeScript type checking
```

### Code Quality Standards
- **TypeScript**: Strict mode with comprehensive type checking
- **ESLint**: Enforced code quality and security rules
- **Testing**: Jest with custom matchers for ADR validation
- **Coverage**: Minimum 80% test coverage required
- **Security**: Content masking and secret prevention
- **MCP Compliance**: Strict adherence to Model Context Protocol specification



## 🚀 Getting Started

### Quick Start (3 Steps)

1. **Install**: `npm install -g mcp-adr-analysis-server`
2. **Get API Key**: Visit [https://openrouter.ai/keys](https://openrouter.ai/keys)
3. **Configure Claude Desktop**: Add to your configuration:

```json
{
  "mcpServers": {
    "adr-analysis": {
      "command": "mcp-adr-analysis-server",
      "env": {
        "PROJECT_PATH": "/path/to/your/project",
        "OPENROUTER_API_KEY": "your_openrouter_api_key_here",
        "EXECUTION_MODE": "full",
        "AI_MODEL": "anthropic/claude-3-sonnet"
      }
    }
  }
   }
   ```

4. **Restart Claude Desktop** and start getting AI-powered architectural insights!

### Example Usage

Once configured, you can ask Claude:

> "Analyze this React project's architecture and suggest ADRs for any implicit decisions"

> "Generate ADRs from the PRD.md file and create a todo.md with implementation tasks"

> "Check this codebase for security issues and provide masking recommendations"

The server will now return **actual analysis results** instead of prompts to submit elsewhere!

## 🚀 Complete Development Lifecycle

The MCP server now provides a **complete development lifecycle assistant** with intelligent workflow guidance:

### **🎯 Step 1: Get Workflow Guidance**
```
get_workflow_guidance
```
**Parameters:**
```json
{
  "goal": "analyze new project and set up architectural documentation",
  "projectContext": "new_project",
  "availableAssets": ["codebase"],
  "timeframe": "thorough_review"
}
```

**Result**: Intelligent tool sequence recommendations and workflow guidance.

### **🏗️ Step 2: Get Development Guidance**
```
get_development_guidance
```
**Parameters:**
```json
{
  "developmentPhase": "implementation",
  "adrsToImplement": ["ADR-001: API Design", "ADR-002: Database Schema"],
  "technologyStack": ["TypeScript", "React", "Node.js"],
  "teamContext": {"size": "small_team", "experienceLevel": "mixed"}
}
```

**Result**: Specific coding tasks, implementation patterns, and development roadmap.

### **📊 Step 3: Execute Recommended Tools**
Follow the workflow guidance to execute the recommended tool sequence for your specific goals.

### **🔄 Complete Workflow Examples**

#### **New Project Setup**
1. `get_workflow_guidance` → 2. `analyze_project_ecosystem` → 3. `get_architectural_context` → 4. `suggest_adrs` → 5. `get_development_guidance`

#### **Existing Project Analysis**
1. `get_workflow_guidance` → 2. `discover_existing_adrs` → 3. `get_architectural_context` → 4. `generate_adr_todo` → 5. `get_development_guidance`

#### **Security Audit**
1. `get_workflow_guidance` → 2. `analyze_content_security` → 3. `generate_content_masking` → 4. `validate_content_masking`

### Configuration Examples

#### Example 1: AI-Powered Project Analysis
```json
{
  "mcpServers": {
    "adr-analysis": {
      "command": "mcp-adr-analysis-server",
      "env": {
        "PROJECT_PATH": "/Users/username/my-react-app",
        "ADR_DIRECTORY": "docs/decisions",
        "OPENROUTER_API_KEY": "your_openrouter_api_key_here",
        "EXECUTION_MODE": "full",
        "AI_MODEL": "anthropic/claude-3-sonnet",
        "AI_TEMPERATURE": "0.1",
        "LOG_LEVEL": "INFO"
      }
    }
  }
}
```

#### Example 2: Cost-Effective Setup
```json
{
  "mcpServers": {
    "adr-analysis": {
      "command": "mcp-adr-analysis-server",
      "env": {
        "PROJECT_PATH": "/Users/username/my-project",
        "OPENROUTER_API_KEY": "your_openrouter_api_key_here",
        "EXECUTION_MODE": "full",
        "AI_MODEL": "anthropic/claude-3-haiku",
        "AI_MAX_TOKENS": "2000",
        "AI_TEMPERATURE": "0.05"
      }
    }
  }
}
```

#### Example 3: Prompt-Only Mode (Legacy)
```json
{
  "mcpServers": {
    "adr-analysis": {
      "command": "mcp-adr-analysis-server",
      "env": {
        "PROJECT_PATH": "/Users/username/my-project",
        "EXECUTION_MODE": "prompt-only",
        "LOG_LEVEL": "INFO"
      }
    }
  }
}
```

#### Example 4: Multi-Project Setup
```json
{
  "mcpServers": {
    "adr-analysis-frontend": {
      "command": "mcp-adr-analysis-server",
      "env": {
        "PROJECT_PATH": "/Users/username/frontend-app",
        "ADR_DIRECTORY": "docs/adrs",
        "OPENROUTER_API_KEY": "your_openrouter_api_key_here",
        "EXECUTION_MODE": "full",
        "AI_MODEL": "openai/gpt-4o-mini",
        "LOG_LEVEL": "ERROR"
      }
    },
    "adr-analysis-backend": {
      "command": "mcp-adr-analysis-server",
      "env": {
        "PROJECT_PATH": "/Users/username/backend-api",
        "ADR_DIRECTORY": "architecture/decisions",
        "OPENROUTER_API_KEY": "your_openrouter_api_key_here",
        "EXECUTION_MODE": "full",
        "AI_MODEL": "anthropic/claude-3-sonnet",
        "LOG_LEVEL": "DEBUG"
      }
    }
  }
}
```

#### Example 5: Development Environment
```json
{
  "mcpServers": {
    "adr-analysis": {
      "command": "mcp-adr-analysis-server",
      "env": {
        "PROJECT_PATH": "${workspaceFolder}",
        "ADR_DIRECTORY": "docs/adrs",
        "OPENROUTER_API_KEY": "your_openrouter_api_key_here",
        "EXECUTION_MODE": "full",
        "AI_MODEL": "anthropic/claude-3-haiku",
        "AI_CACHE_ENABLED": "true",
        "AI_CACHE_TTL": "1800",
        "LOG_LEVEL": "DEBUG"
      }
    }
  }
}
```



## � Troubleshooting

### ⚠️ **CRITICAL**: Tools Return Prompts Instead of Results

**Symptom**: When calling tools like `suggest_adrs`, you receive large detailed instructions and prompts instead of actual ADR suggestions.

**Root Cause**: AI execution is not properly configured. The tool is falling back to prompt-only mode.

**Solution**: Add these **required** environment variables to your MCP configuration:

```json
{
  "mcpServers": {
    "adr-analysis": {
      "command": "mcp-adr-analysis-server",
      "env": {
        "PROJECT_PATH": "/path/to/your/project",
        "OPENROUTER_API_KEY": "your_openrouter_api_key_here",
        "EXECUTION_MODE": "full",
        "AI_MODEL": "anthropic/claude-3-sonnet"
      }
    }
  }
}
```

**Verification**: After adding these variables and restarting, tools should return actual results like:
- `suggest_adrs` → Actual ADR suggestions with titles and reasoning
- `analyze_project_ecosystem` → Real technology analysis and recommendations
- `generate_content_masking` → Actual masked content, not masking instructions

**Quick Diagnostic**: Use the built-in diagnostic tool:
```
check_ai_execution_status
```
This will show exactly what's wrong with your configuration and provide step-by-step fix instructions.

### Other AI Execution Issues

**Problem**: "AI execution not available" errors
```bash
# Check execution mode
echo $EXECUTION_MODE

# Verify API key is set
echo $OPENROUTER_API_KEY | head -c 10

# Test AI connectivity
curl -H "Authorization: Bearer $OPENROUTER_API_KEY" \
     https://openrouter.ai/api/v1/models
```

**Problem**: "AI execution not available" errors
- ✅ Verify `OPENROUTER_API_KEY` is set correctly
- ✅ Check `EXECUTION_MODE=full` in environment
- ✅ Ensure API key has sufficient credits
- ✅ Verify network connectivity to OpenRouter

**Problem**: Slow AI responses
```bash
# Reduce token limits for faster responses
AI_MAX_TOKENS=2000
AI_TEMPERATURE=0.05

# Enable caching for repeated queries
AI_CACHE_ENABLED=true
AI_CACHE_TTL=3600
```

**Problem**: High API costs
```bash
# Use cost-effective models
AI_MODEL=anthropic/claude-3-haiku
# or
AI_MODEL=openai/gpt-4o-mini

# Reduce token usage
AI_MAX_TOKENS=2000
AI_TEMPERATURE=0.1
```

### Environment Configuration

**Check current configuration:**
```bash
# View AI execution status
node -e "
const { getAIExecutionStatus } = require('./dist/utils/prompt-execution.js');
console.log(JSON.stringify(getAIExecutionStatus(), null, 2));
"
```

**Reset configuration:**
```bash
# Clear cache and restart
rm -rf .mcp-adr-cache
npm run build
```

### Common Issues

| Issue | Solution |
|-------|----------|
| "Module not found" errors | Run `npm install && npm run build` |
| TypeScript compilation errors | Check Node.js version >= 18.0.0 |
| Permission denied | Check file permissions and project path |
| API rate limits | Reduce `AI_MAX_TOKENS` or increase `AI_TIMEOUT` |
| Cache issues | Clear cache with `rm -rf .mcp-adr-cache` |

## �🔒 Security Features

### Content Protection
- **Automatic Secret Detection**: Identifies API keys, passwords, and sensitive data
- **Intelligent Masking**: Context-aware content masking with configurable levels
- **Security Validation**: Comprehensive security checks and recommendations
- **Compliance Tracking**: Ensure adherence to security standards and best practices

### Privacy & Data Handling
- **Local Processing**: All analysis performed locally, no data sent to external services
- **Configurable Masking**: Customize masking rules for your organization's needs
- **Audit Trail**: Track all security-related actions and decisions
- **Zero Trust**: Assume all content may contain sensitive information

## 📊 Performance & Scalability

### Intelligent Caching
- **Multi-level Caching**: File system, memory, and analysis result caching
- **Cache Invalidation**: Smart cache invalidation based on file changes
- **Performance Optimization**: Optimized for large codebases and complex projects
- **Resource Management**: Efficient memory and CPU usage

### Scalability Features
- **Incremental Analysis**: Only analyze changed files and dependencies
- **Parallel Processing**: Multi-threaded analysis for large projects
- **Memory Optimization**: Efficient memory usage for large codebases
- **Streaming Results**: Stream analysis results for real-time feedback

## 🤝 Contributing

We welcome contributions! This project follows strict development standards to ensure quality and security.

### Development Standards
- **TypeScript**: Strict mode with comprehensive type checking
- **Testing**: >80% code coverage with Jest
- **Linting**: ESLint with security-focused rules
- **Security**: All contributions must pass security validation
- **MCP Compliance**: Strict adherence to Model Context Protocol specification

### Getting Started
1. Fork the repository
2. Create a feature branch
3. Make your changes with tests
4. Run the full test suite
5. Submit a pull request

See [CONTRIBUTING.md](CONTRIBUTING.md) for detailed guidelines.

## 🔗 Related Resources

### Official Documentation
- [Model Context Protocol Specification](https://modelcontextprotocol.io/)
- [MCP Server Development Guide](https://modelcontextprotocol.io/docs/concepts/servers)
- [TypeScript MCP SDK](https://github.com/modelcontextprotocol/typescript-sdk)

### Community Resources
- [MCP Servers Registry](https://github.com/modelcontextprotocol/servers)
- [Awesome MCP Servers](https://github.com/punkpeye/awesome-mcp-servers)
- [MCP Community Discord](https://discord.gg/modelcontextprotocol)

### Project Documentation
- [Implementation Progress](./todo.md)
- [Architecture Decisions](./docs/adrs/)
- [NPM Publishing Guide](./docs/NPM_PUBLISHING.md)

## 📄 License

MIT License - see [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- **Anthropic** for creating the Model Context Protocol
- **The MCP Community** for inspiration and best practices
- **Contributors** who help make this project better

---

**Built with ❤️ by [Tosin Akinosho](https://github.com/tosin2013) for AI-driven architectural analysis**

*Empowering AI assistants with deep architectural intelligence and decision-making capabilities.*
