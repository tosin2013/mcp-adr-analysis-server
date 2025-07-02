# MCP ADR Analysis Server

[![GitHub](https://img.shields.io/badge/github-tosin2013/mcp--adr--analysis--server-blue.svg?style=flat&logo=github)](https://github.com/tosin2013/mcp-adr-analysis-server)
[![License](https://img.shields.io/badge/license-MIT-brightgreen)](LICENSE)
[![NPM Version](https://img.shields.io/npm/v/mcp-adr-analysis-server)](https://www.npmjs.com/package/mcp-adr-analysis-server)
[![Node.js](https://img.shields.io/badge/node-%3E%3D18.0.0-brightgreen)](https://nodejs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.3+-blue)](https://www.typescriptlang.org/)

A comprehensive Model Context Protocol (MCP) server for AI-powered architectural decision analysis and management. This enterprise-ready solution provides intelligent analysis of Architectural Decision Records (ADRs), project ecosystems, and development workflows through 23 specialized MCP tools.

**Author**: [Tosin Akinosho](https://github.com/tosin2013)
**Repository**: [https://github.com/tosin2013/mcp-adr-analysis-server.git](https://github.com/tosin2013/mcp-adr-analysis-server.git)

## 🚀 What is the Model Context Protocol (MCP)?

> The Model Context Protocol (MCP) is an open protocol that enables seamless integration between LLM applications and external data sources and tools. Whether you're building an AI-powered IDE, enhancing a chat interface, or creating custom AI workflows, MCP provides a standardized way to connect LLMs with the context they need.
>
> — [Model Context Protocol README](https://github.com/modelcontextprotocol#:~:text=The%20Model%20Context,context%20they%20need.)

This MCP server enhances AI assistants with deep architectural analysis capabilities, enabling intelligent code generation, decision tracking, and development workflow automation.

## ✨ Key Features

### 🏗️ **Architectural Analysis & Intelligence**
- **Technology Detection**: AI-powered identification of ANY technology stack (React, Python, Terraform, Kubernetes, etc.)
- **Pattern Recognition**: Intelligent detection of architectural patterns and best practices
- **Dependency Analysis**: Comprehensive project structure and dependency mapping
- **Knowledge Graph Generation**: Create interconnected architectural knowledge representations

### 📋 **ADR Management & Generation**
- **ADR Generation from PRD**: Convert Product Requirements Documents to structured ADRs
- **Intelligent ADR Suggestions**: Auto-suggest ADRs from implicit code decisions
- **ADR Lifecycle Management**: Complete ADR creation, analysis, and maintenance workflows
- **Template Support**: Multiple ADR formats (Nygard, MADR, custom templates)

### 🔍 **Research & Documentation Intelligence**
- **Research Integration**: Monitor and incorporate research findings into architectural decisions
- **Context-Aware Research Questions**: Generate targeted research questions based on project context
- **Documentation Analysis**: Extract insights from existing documentation and codebases
- **Knowledge Synthesis**: Combine multiple information sources for comprehensive analysis

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

## 🛠️ Available MCP Tools

### Core Analysis Tools
- **`analyze_project_ecosystem`** - Comprehensive technology and pattern detection
- **`get_architectural_context`** - Generate intelligent architectural insights
- **`generate_adrs_from_prd`** - Convert requirements to structured ADRs
- **`generate_adr_todo`** - Create actionable task lists from ADRs

### Advanced Intelligence Tools
- **`suggest_adrs`** - Auto-suggest ADRs from implicit decisions
- **`generate_adr_from_decision`** - Create ADRs from specific decisions
- **`discover_existing_adrs`** - Intelligent ADR discovery and analysis
- **`incorporate_research`** - Integrate research findings into decisions
- **`generate_research_questions`** - Create context-aware research questions

### Security & Compliance Tools
- **`analyze_sensitive_content`** - Detect sensitive information patterns
- **`mask_content`** - Intelligent content masking and protection
- **`configure_masking`** - Customize security and masking settings
- **`validate_content_security`** - Comprehensive security validation
- **`apply_security_guidance`** - Proactive security recommendations

### Workflow & Management Tools
- **`generate_rules`** - Extract architectural rules from ADRs
- **`validate_rules`** - Validate code against architectural rules
- **`create_rule_set`** - Create comprehensive rule management systems
- **`analyze_environment`** - Environment analysis and optimization
- **`analyze_deployment_progress`** - Deployment tracking and verification

### Utility & Integration Tools
- **`clear_cache`** - Cache management and optimization
- **`create_research_template`** - Generate research documentation templates
- **`request_action_confirmation`** - Interactive user confirmation workflows

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

## ⚙️ Configuration

### Environment Variables

The MCP server supports the following environment variables:

- **`PROJECT_PATH`** (Required): Path to the project directory to analyze
  - Use `.` for current directory in project-specific configs
  - Use `${workspaceFolder}` in VS Code/Cline for workspace root
  - Use absolute paths for global configurations

- **`ADR_DIRECTORY`** (Optional): Directory containing ADR files
  - Default: `docs/adrs`
  - Relative to PROJECT_PATH

- **`LOG_LEVEL`** (Optional): Logging level
  - Options: `DEBUG`, `INFO`, `WARN`, `ERROR`
  - Default: `INFO`

- **`CACHE_ENABLED`** (Optional): Enable/disable caching
  - Options: `true`, `false`
  - Default: `true`

### Client Configurations

### Claude Desktop
Add to your Claude Desktop configuration (`~/Library/Application Support/Claude/claude_desktop_config.json` on macOS):

```json
{
  "mcpServers": {
    "adr-analysis": {
      "command": "mcp-adr-analysis-server",
      "env": {
        "PROJECT_PATH": "/path/to/your/project",
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

### Quick Start with Claude Desktop
1. Install the MCP server:
   ```bash
   npm install -g mcp-adr-analysis-server
   ```

2. Add to your Claude Desktop configuration:
   ```json
   {
     "mcpServers": {
       "adr-analysis": {
         "command": "mcp-adr-analysis-server"
       }
     }
   }
   ```

3. Restart Claude Desktop and start analyzing your projects!

### Configuration Examples

#### Example 1: Single Project Analysis
```json
{
  "mcpServers": {
    "adr-analysis": {
      "command": "mcp-adr-analysis-server",
      "env": {
        "PROJECT_PATH": "/Users/username/my-react-app",
        "ADR_DIRECTORY": "docs/decisions",
        "LOG_LEVEL": "INFO"
      }
    }
  }
}
```

#### Example 2: Multi-Project Setup (Different configs for different projects)
```json
{
  "mcpServers": {
    "adr-analysis-frontend": {
      "command": "mcp-adr-analysis-server",
      "env": {
        "PROJECT_PATH": "/Users/username/frontend-app",
        "ADR_DIRECTORY": "docs/adrs",
        "LOG_LEVEL": "ERROR"
      }
    },
    "adr-analysis-backend": {
      "command": "mcp-adr-analysis-server",
      "env": {
        "PROJECT_PATH": "/Users/username/backend-api",
        "ADR_DIRECTORY": "architecture/decisions",
        "LOG_LEVEL": "DEBUG"
      }
    }
  }
}
```

#### Example 3: Development vs Production
```json
{
  "mcpServers": {
    "adr-analysis": {
      "command": "mcp-adr-analysis-server",
      "env": {
        "PROJECT_PATH": "${workspaceFolder}",
        "ADR_DIRECTORY": "docs/adrs",
        "LOG_LEVEL": "DEBUG",
        "CACHE_ENABLED": "true",
        "ANALYSIS_TIMEOUT": "60000"
      }
    }
  }
}
```
```

### Example Prompts for AI Assistants

**Project Analysis:**
```
Using the MCP ADR Analysis Server, analyze this React TypeScript project and generate architectural insights focusing on scalability and security.
```

**ADR Generation:**
```
Using the ADR analysis tools, convert the PRD.md file into structured ADRs and create a todo.md with actionable tasks.
```

**Security Analysis:**
```
Analyze this codebase for sensitive content and provide security recommendations using the content masking tools.
```

## 🔒 Security Features

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
