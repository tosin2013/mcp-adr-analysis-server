# MCP ADR Analysis Server

[![GitHub](https://img.shields.io/badge/github-tosin2013/mcp--adr--analysis--server-blue.svg?style=flat&logo=github)](https://github.com/tosin2013/mcp-adr-analysis-server)
[![License](https://img.shields.io/badge/license-MIT-brightgreen)](LICENSE)
[![NPM Version](https://img.shields.io/npm/v/mcp-adr-analysis-server)](https://www.npmjs.com/package/mcp-adr-analysis-server)
[![Node.js](https://img.shields.io/badge/node-%3E%3D20.0.0-brightgreen)](https://nodejs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.9+-blue)](https://www.typescriptlang.org/)
[![Good First Issues](https://img.shields.io/github/issues/tosin2013/mcp-adr-analysis-server/good%20first%20issue?label=good%20first%20issues&color=7057ff)](https://github.com/tosin2013/mcp-adr-analysis-server/issues?q=is%3Aissue+is%3Aopen+label%3A%22good+first+issue%22)

> **AI-powered architectural analysis for intelligent development workflows.** Returns actual analysis results, not prompts to submit elsewhere.

## TL;DR

**What:** MCP server that provides AI-powered architectural decision analysis and ADR management  
**Who:** AI coding assistants (Claude, Cline, Cursor), enterprise architects, development teams  
**Why:** Get immediate architectural insights instead of prompts, with 95% confidence scoring  
**How:** `npm install -g mcp-adr-analysis-server` → Configure with OpenRouter API → Start analyzing

**Key Features:** Tree-sitter AST analysis • Security content masking • Test-driven development • Deployment readiness validation

---

**Author**: [Tosin Akinosho](https://github.com/tosin2013) | **Repository**: [GitHub](https://github.com/tosin2013/mcp-adr-analysis-server.git)

## What is MCP?

The Model Context Protocol enables seamless integration between AI assistants and external tools. This server enhances AI assistants with deep architectural analysis capabilities, enabling intelligent code generation, decision tracking, and development workflow automation.

## ✨ Core Capabilities

🤖 **AI-Powered Analysis** - Immediate architectural insights with OpenRouter.ai integration
🏗️ **Technology Detection** - Identify any tech stack and architectural patterns
📋 **ADR Management** - Generate, suggest, and maintain Architectural Decision Records
🔗 **Smart Code Linking** - AI-powered discovery of code files related to ADRs and decisions
🛡️ **Security & Compliance** - Detect and mask sensitive content automatically
🧪 **TDD Integration** - Two-phase Test-Driven Development with validation
🚀 **Deployment Readiness** - Zero-tolerance test validation with hard blocking

📖 **[View Full Capabilities →](docs/explanation/)**

## 📦 Quick Installation

```bash
# Option 1: Global installation (recommended for frequent use)
npm install -g mcp-adr-analysis-server

# Option 2: Use npx (no installation required)
npx mcp-adr-analysis-server

# Option 3: RHEL 9/10 systems (special installer)
curl -sSL https://raw.githubusercontent.com/tosin2013/mcp-adr-analysis-server/main/scripts/install-rhel.sh | bash
```

📖 **[Detailed Installation Guide →](docs/tutorials/01-first-steps.md)** | **[RHEL Setup →](scripts/install-rhel.sh)**

## ⚡ Quick Setup (3 Steps)

1. **Get API Key**: [OpenRouter.ai/keys](https://openrouter.ai/keys)
2. **Set Environment**: `OPENROUTER_API_KEY=your_key` + `EXECUTION_MODE=full`
3. **Configure Client**: Add to Claude Desktop, Cline, Cursor, or Windsurf

```json
{
  "mcpServers": {
    "adr-analysis": {
      "command": "mcp-adr-analysis-server",
      "env": {
        "PROJECT_PATH": "/path/to/your/project",
        "OPENROUTER_API_KEY": "your_key_here",
        "EXECUTION_MODE": "full"
      }
    }
  }
}
```

<details>
<summary><b>With ADR Aggregator (Optional)</b></summary>

```json
{
  "mcpServers": {
    "adr-analysis": {
      "command": "mcp-adr-analysis-server",
      "env": {
        "PROJECT_PATH": "/path/to/your/project",
        "OPENROUTER_API_KEY": "your_key_here",
        "EXECUTION_MODE": "full",
        "ADR_AGGREGATOR_API_KEY": "agg_your_key_here"
      }
    }
  }
}
```

Get your API key at [adraggregator.com](https://adraggregator.com)

</details>

📖 **[Full Configuration Guide →](docs/reference/mcp-client-config.md)** | **[Client Setup →](docs/reference/environment-config.md)**

## 🚀 Usage Examples

**Ask Claude (or any MCP client):**

> "Analyze this React project's architecture and suggest ADRs for any implicit decisions"

> "Generate ADRs from the PRD.md file and create a todo.md with implementation tasks"

> "Check this codebase for security issues and provide masking recommendations"

**The server returns actual analysis results** instead of prompts to submit elsewhere!

```typescript
// Basic project analysis
const analysis = await analyzeProjectEcosystem({
  projectPath: '/path/to/project',
  analysisType: 'comprehensive',
});

// Generate ADRs from requirements
const adrs = await generateAdrsFromPrd({
  prdPath: 'docs/PRD.md',
  outputDirectory: 'docs/adrs',
});

// Smart Code Linking - Find code related to ADR decisions
const relatedCode = await findRelatedCode(
  'docs/adrs/001-auth-system.md',
  'We will implement JWT authentication with Express middleware',
  '/path/to/project',
  {
    useAI: true, // AI-powered keyword extraction
    useRipgrep: true, // Fast text search
    maxFiles: 10, // Limit results
    includeContent: true, // Include file contents
  }
);
```

📖 **[Complete Usage Guide →](docs/tutorials/)** | **[API Reference →](docs/reference/)**

## 🎯 Use Cases

👨‍💻 **AI Coding Assistants** - Enhance Claude, Cline, Cursor with architectural intelligence  
💬 **Conversational AI** - Answer architecture questions with confidence scoring  
🤖 **Autonomous Agents** - Continuous analysis and rule enforcement  
🏢 **Enterprise Teams** - Portfolio analysis and migration planning

📖 **[Detailed Use Cases →](docs/explanation/mcp-concepts.md)**

## 🛠️ Technology Stack

**Runtime:** Node.js 20+ • **Language:** TypeScript • **Framework:** MCP SDK • **Testing:** Jest (>80% coverage)
**Search:** ripgrep + fast-glob • **AI Integration:** OpenRouter.ai • **Web Research:** Firecrawl • **Code Analysis:** Smart Code Linking

📖 **[Technical Details →](docs/explanation/server-architecture.md)**

## 📁 Project Structure

```
src/tools/     # 23 MCP tools for analysis
docs/adrs/     # Architectural Decision Records
tests/         # >80% test coverage
.github/       # CI/CD automation
```

📖 **[Full Structure →](docs/diataxis-index.md)**

## 🧪 Testing

```bash
npm test              # Run all tests (>80% coverage)
npm run test:coverage # Coverage report
```

📖 **[Testing Guide →](docs/how-to-guides/troubleshooting.md)**

## 🔥 Firecrawl Integration (Optional)

**Enhanced web research capabilities for comprehensive architectural analysis.**

```bash
# Option 1: Cloud service (recommended)
export FIRECRAWL_ENABLED="true"
export FIRECRAWL_API_KEY="fc-your-api-key-here"

# Option 2: Self-hosted
export FIRECRAWL_ENABLED="true"
export FIRECRAWL_BASE_URL="http://localhost:3000"

# Option 3: Disabled (default - server works without web search)
```

**Benefits:** Real-time research • Enhanced ADRs • Best practices discovery • Intelligent web scraping

📖 **[Firecrawl Setup Guide →](docs/reference/environment-config.md#firecrawl-configuration)**

## 🌐 ADR Aggregator Integration (Optional)

**Sync your ADRs to [adraggregator.com](https://adraggregator.com) for cross-team visibility, governance dashboards, and organizational knowledge graphs.**

```bash
# Set your API key (get one at adraggregator.com)
export ADR_AGGREGATOR_API_KEY="agg_your_key_here"
```

### Available Tools

| Tool                      | Description                        | Tier |
| ------------------------- | ---------------------------------- | ---- |
| `sync_to_aggregator`      | Push local ADRs to platform        | Free |
| `get_adr_context`         | Pull ADR context from platform     | Free |
| `get_staleness_report`    | Get ADR governance/health reports  | Free |
| `get_adr_templates`       | Retrieve domain-specific templates | Free |
| `get_adr_diagrams`        | Get Mermaid diagrams for ADRs      | Pro+ |
| `validate_adr_compliance` | Validate ADR implementation        | Pro+ |
| `get_knowledge_graph`     | Cross-repository knowledge graph   | Team |

### Workflow for New Repos

```bash
# 1. Analyze codebase for implicit architectural decisions
suggest_adrs(analysisType: 'implicit_decisions')

# 2. Generate ADR files from suggestions
generate_adr_from_decision(decisionData)

# 3. Save ADRs to docs/adrs/

# 4. (Optional) Sync to adraggregator.com
sync_to_aggregator(full_sync: true)
```

**Benefits:** Cross-team visibility • Staleness alerts • Compliance tracking • Organization-wide knowledge graph

📖 **[ADR Aggregator Guide →](https://adraggregator.com/docs)**

## 🔧 Development

```bash
git clone https://github.com/tosin2013/mcp-adr-analysis-server.git
cd mcp-adr-analysis-server
npm install && npm run build && npm test
```

**Quality Standards:** TypeScript strict mode • ESLint • >80% test coverage • Pre-commit hooks

📖 **[Development Guide →](docs/how-to-guides/getting-started-workflow-guidance.md)** | **[Contributing →](CONTRIBUTING.md)**

## 🔧 Troubleshooting

**Common Issues:**

- **RHEL Systems**: Use special installer script
- **Tools return prompts**: Set `EXECUTION_MODE=full` + API key
- **Module not found**: Run `npm install && npm run build`
- **Permission denied**: Check file permissions and project path

📖 **[Complete Troubleshooting Guide →](docs/troubleshooting.md)**

## 🔒 Security & Performance

**Security:** Automatic secret detection • Content masking • Local processing • Zero trust  
**Performance:** Multi-level caching • Incremental analysis • Parallel processing • Memory optimization

📖 **[Security Guide →](docs/explanation/security-philosophy.md)** | **[Performance →](docs/explanation/performance-design.md)**

### 🔐 Security Vulnerability Reporting

Found a security issue? Please read our [Security Policy](SECURITY.md) for responsible disclosure procedures. **Do not** create public issues for security vulnerabilities.

## 🤝 Contributing

We welcome contributions! Whether you're fixing bugs, adding features, or improving documentation, your help is appreciated.

### 🌟 Quick Start for Contributors

1. **Fork** the repository
2. **Clone** your fork: `git clone https://github.com/YOUR_USERNAME/mcp-adr-analysis-server.git`
3. **Create** a branch: `git checkout -b feature/your-feature-name`
4. **Make** your changes with tests
5. **Test**: `npm test` (maintain >80% coverage)
6. **Submit** a Pull Request

### 👶 First Time Contributing?

Looking for a good first issue? Check out our [**good first issues**](https://github.com/tosin2013/mcp-adr-analysis-server/issues?q=is%3Aissue+is%3Aopen+label%3A%22good+first+issue%22) - these are beginner-friendly tasks perfect for getting started!

**New to open source?** Our [Contributing Guide](CONTRIBUTING.md) walks you through the entire process step-by-step.

### 📝 Reporting Issues

Use our [**issue templates**](https://github.com/tosin2013/mcp-adr-analysis-server/issues/new/choose) when reporting bugs or requesting features. Templates help us understand and resolve issues faster.

**Standards:** TypeScript strict • >80% coverage • ESLint • Security validation • MCP compliance

📖 **[Full Contributing Guide →](CONTRIBUTING.md)** | **[Code of Conduct →](docs/community/CODE_OF_CONDUCT.md)**

## 🔗 Resources

**Official:** [MCP Specification](https://modelcontextprotocol.io/) • [MCP SDK](https://github.com/modelcontextprotocol/typescript-sdk)  
**Community:** [MCP Registry](https://github.com/modelcontextprotocol/servers) • [Discord](https://discord.gg/modelcontextprotocol)  
**Project:** [ADRs](./docs/adrs/) • [Progress](./docs/release-dashboard.md) • [Publishing Guide](./docs/how-to-guides/NPM_PUBLISHING.md)

## 📄 License

MIT License - see [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- **Anthropic** for creating the Model Context Protocol
- **The MCP Community** for inspiration and best practices
- **Contributors** who help make this project better

---

**Built with ❤️ by [Tosin Akinosho](https://github.com/tosin2013) for AI-driven architectural analysis**

_Empowering AI assistants with deep architectural intelligence and decision-making capabilities._
