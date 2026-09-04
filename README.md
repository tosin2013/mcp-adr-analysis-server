# MCP (Model Context Protocol) ADR (Architectural Decision Record) Analysis Server

[![GitHub](https://img.shields.io/badge/github-tosin2013/mcp--adr--analysis--server-blue.svg?style=flat&logo=github)](https://github.com/tosin2013/mcp-adr-analysis-server)
[![License](https://img.shields.io/badge/license-MIT-brightgreen)](LICENSE)
[![NPM Version](https://img.shields.io/npm/v/mcp-adr-analysis-server)](https://www.npmjs.com/package/mcp-adr-analysis-server)
[![Node.js](https://img.shields.io/badge/node-%3E%3D20.0.0-brightgreen)](https://nodejs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.9+-blue)](https://www.typescriptlang.org/)
[![Good First Issues](https://img.shields.io/github/issues/tosin2013/mcp-adr-analysis-server/good%20first%20issue?label=good%20first%20issues&color=7057ff)](https://github.com/tosin2013/mcp-adr-analysis-server/issues?q=is%3Aissue+is%3Aopen+label%3A%22good+first+issue%22)

> **Your ADRs are lying to you.** This MCP server catches it — live drift detection validates architectural decisions against your actual code. Plus content safety, decision memory, and 64 tools powered by your host LLM via CE-MCP.

## What is MCP?

The **Model Context Protocol (MCP)** is an open standard that enables seamless integration between AI assistants and external tools and data sources. Think of it as a universal adapter that lets AI assistants like Claude, Cline, and Cursor connect to specialized servers. This server gives your AI assistant the ability to detect ADR drift against live code, mask sensitive content before it leaks, and remember architectural decisions across conversations.

## TL;DR

**What:** MCP server that validates architectural decisions against your actual code — drift detection, content safety, and decision memory  
**Who:** AI coding assistants (Claude, Cline, Cursor, Windsurf), enterprise architects, development teams  
**Why:** Catch stale ADRs before they cause production incidents — live validation against code evidence, no API key required  
**How:** `npm install -g mcp-adr-analysis-server` → Add to your MCP client → Start analyzing

**Key Features:** Tree-sitter AST analysis • Security content masking • Drift detection • CE-MCP orchestration directives • Deployment readiness validation

<details>
<summary><b>Key Terms</b></summary>

| Term                             | Definition                                                                                                                                                                                                         |
| -------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **ADR**                          | **Architectural Decision Record** — A document that captures an important architectural decision along with its context, alternatives considered, and consequences.                                                |
| **MCP**                          | **Model Context Protocol** — An open standard enabling AI assistants to connect to external tools and data sources.                                                                                                |
| **CE-MCP**                       | **Claude-Enriched MCP** — Execution mode where tools return orchestration directives for the host LLM instead of making their own AI calls. Default since v2.14.                                                   |
| **Tree-sitter**                  | An incremental parsing library that provides AST (Abstract Syntax Tree) analysis for 50+ languages. Used for semantic code understanding, extracting function signatures, and identifying architectural patterns.  |
| **Session & Tool-Usage Tracker** | Project-local tracking of session intents, tool executions, and ADR registrations, with keyword-scored retrieval over JSON snapshots. Supports workflow continuity and tool-usage evidence — not a graph database. |
| **Smart Code Linking**           | Discovery of code files related to ADRs and architectural decisions, using keyword extraction and ripgrep search.                                                                                                  |
| **ADR Aggregator**               | Optional SaaS integration for syncing and sharing ADR context across teams (`ADR_AGGREGATOR_API_KEY`).                                                                                                             |

</details>

---

**Author**: [Tosin Akinosho](https://github.com/tosin2013) | **Repository**: [GitHub](https://github.com/tosin2013/mcp-adr-analysis-server.git)

## ✨ Core Capabilities

🔄 **Drift Detection** - Validate ADR decisions against live code and infrastructure evidence
🛡️ **Content Safety** - Detect and mask secrets, PII, and sensitive content automatically
🧠 **Decision Memory** - Session & tool-usage tracking with keyword-scored retrieval
🏗️ **Technology Detection** - Identify any tech stack and architectural patterns
📋 **ADR Management** - Generate, suggest, and maintain Architectural Decision Records
🔗 **Smart Code Linking** - Discovery of code files related to ADRs and decisions
🚀 **Deployment Readiness** - Zero-tolerance test validation with hard blocking

📖 **[View Full Capabilities →](docs/explanation/index.md)** · 📜 **[Release policy →](RELEASES.md)** · 🗒️ **[Changelog →](CHANGELOG.md)**

## Prerequisites

Before installing, verify you have:

```bash
node --version  # Should show v20.0.0 or higher
npm --version   # Should show 9.0.0 or higher (included with Node.js 20+)
```

**Required:**

- **Node.js 20.0.0 or higher** — [Download](https://nodejs.org/) or use [nvm](https://github.com/nvm-sh/nvm)/[fnm](https://github.com/Schniz/fnm)
- **npm 9.0.0 or higher** (included with Node.js 20+)
- **An MCP-compatible client** — [Claude Desktop](https://claude.ai/download), [Cline](https://marketplace.visualstudio.com/items?itemName=saoudrizwan.claude-dev), [Cursor](https://cursor.sh/), or [Windsurf](https://codeium.com/windsurf)

### Network Requirements

- **Internet access required** during `npm install` for native module compilation ([tree-sitter](https://tree-sitter.github.io/tree-sitter/) incremental code parsers for YAML and TypeScript)
- If behind a corporate proxy, set `HTTP_PROXY` and `HTTPS_PROXY` environment variables
- **Offline fallback**: If native builds fail, the server operates in reduced mode without tree-sitter code analysis

## 📦 Quick Installation

```bash
# Option 1: Global installation (recommended for frequent use)
npm install -g mcp-adr-analysis-server

# Option 2: Use npx (no installation required)
npx mcp-adr-analysis-server

# Option 3: From source (for development or customization)
git clone https://github.com/tosin2013/mcp-adr-analysis-server.git
cd mcp-adr-analysis-server && npm install && npm run build

# Option 4: RHEL 9/10 systems (special installer)
curl -sSL https://raw.githubusercontent.com/tosin2013/mcp-adr-analysis-server/main/scripts/install-rhel.sh | bash
```

> **Note:** When installing from source, `npm run build` is required before running the server since the `bin` entry points to `./dist/src/index.js`.

📖 **[Detailed Installation Guide →](docs/tutorials/01-first-steps.md)** | **[RHEL Setup →](scripts/install-rhel.sh)**

## ⚡ Quick Setup (2 Steps)

1. **Install**: `npm install -g mcp-adr-analysis-server`
2. **Configure Client**: Add to Claude Desktop, Cline, Cursor, or Windsurf — no API key required

```json
{
  "mcpServers": {
    "adr-analysis": {
      "command": "mcp-adr-analysis-server",
      "env": {
        "PROJECT_PATH": "/path/to/your/project"
      }
    }
  }
}
```

That's it. The server runs in **CE-MCP mode** by default — your host LLM (Claude, GPT, etc.) executes the analysis using orchestration directives returned by the tools. No external API key needed.

> **Claude Desktop users:** Save this JSON to `~/Library/Application Support/Claude/claude_desktop_config.json` (macOS) or `%APPDATA%\Claude\claude_desktop_config.json` (Windows).

<details>
<summary><b>Config locations for other clients</b></summary>

| Client                       | Config file location                                                          |
| ---------------------------- | ----------------------------------------------------------------------------- |
| **Claude Desktop (macOS)**   | `~/Library/Application Support/Claude/claude_desktop_config.json`             |
| **Claude Desktop (Windows)** | `%APPDATA%\Claude\claude_desktop_config.json`                                 |
| **Cline (VS Code)**          | VS Code Settings → Cline → MCP Servers (or `.vscode/cline_mcp_settings.json`) |
| **VS Code (native MCP)**     | `.vscode/mcp.json` in workspace root                                          |
| **Cursor**                   | Cursor Settings → MCP → Add Server                                            |

📖 **[VS Code Integration Guide →](docs/how-to-guides/vscode-integration.md)** — step-by-step setup for Cline, Continue, and VS Code native MCP with example configs.

</details>

<details>
<summary><b>Optional: OpenRouter Full Mode (legacy)</b></summary>

If you want the server to make its own AI calls (bypassing the host LLM), add an OpenRouter API key:

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

Sign up at [OpenRouter.ai/keys](https://openrouter.ai/keys). This mode is **not recommended** — CE-MCP produces equivalent results using your existing host LLM context.

</details>

<details>
<summary><b>Optional: ADR Aggregator integration</b></summary>

```json
{
  "mcpServers": {
    "adr-analysis": {
      "command": "mcp-adr-analysis-server",
      "env": {
        "PROJECT_PATH": "/path/to/your/project",
        "ADR_AGGREGATOR_API_KEY": "agg_your_key_here"
      }
    }
  }
}
```

Get your API key at [adraggregator.com](https://adraggregator.com)

</details>

📖 **[Full Configuration Guide →](docs/reference/mcp-client-config.md)** | **[Client Setup →](docs/reference/environment-config.md)**

### Execution Modes

|                       | **CE-MCP (default)**                                 | **Full Mode (legacy)**                     | **Prompt-Only**                                                   |
| --------------------- | ---------------------------------------------------- | ------------------------------------------ | ----------------------------------------------------------------- |
| **Requires API key?** | No                                                   | Yes (`OPENROUTER_API_KEY`)                 | No                                                                |
| **Returns**           | Orchestration directives for the host LLM to execute | Server-side AI analysis results            | Prompts you can paste into any AI chat                            |
| **Set via**           | Default (no env var needed)                          | `EXECUTION_MODE=full`                      | `EXECUTION_MODE=prompt-only`                                      |
| **Best for**          | All users — recommended                              | Legacy workflows with dedicated API budget | Offline exploration                                               |
| **Tools available**   | All 64 tools with annotated MCP metadata             | All 64 tools                               | Analysis prompts, templates, local file operations, ADR discovery |

**What are CE-MCP directives?** When a tool is called, it returns a structured orchestration directive that tells your host LLM what to analyze, what data to gather, and how to format results. The host LLM (e.g. Claude in Claude Desktop, or GPT in Cursor) executes the directive using its existing context window. This means **zero additional API costs** and **better results** because the LLM already has your conversation context.

## 🚀 Usage Examples

Just ask your MCP client in natural language — no code required:

> "Analyze this React project's architecture and suggest ADRs for any implicit decisions"

> "Generate ADRs from the PRD.md file and create a todo.md with implementation tasks"

> "Check this codebase for security issues and provide masking recommendations"

**The server returns structured analysis and orchestration directives** that your host LLM executes in context.

<details>
<summary><b>Programmatic Usage (Advanced)</b></summary>

If you're integrating the server into your own tooling via the MCP SDK:

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
    useRipgrep: true, // Fast text search
    maxFiles: 10, // Limit results
    includeContent: true, // Include file contents
  }
);
```

</details>

📖 **[Complete Usage Guide →](docs/tutorials/01-first-steps.md)** | **[API Reference →](docs/reference/index.md)**

> **Try it out:** This repo includes a [`sample-project/`](sample-project/README.md) directory with example ADRs and source code. Point `PROJECT_PATH` at it to experiment without affecting your own codebase.
>
> **Note:** The sample project is only available when **cloning from source** (Option 3 above). If you installed via npm (Option 1 or 2), create your own test project or clone the repo separately to access the sample: `git clone --depth 1 https://github.com/tosin2013/mcp-adr-analysis-server.git sample-test`

## 🎯 Use Cases

👨‍💻 **AI Coding Assistants** - Enhance Claude, Cline, Cursor with architectural intelligence  
💬 **Conversational AI** - Answer architecture questions with confidence scoring  
🤖 **Autonomous Agents** - Continuous analysis and rule enforcement  
🏢 **Enterprise Teams** - Portfolio analysis and migration planning

📖 **[Detailed Use Cases →](docs/explanation/mcp-concepts.md)**

## 🛠️ Technology Stack

**Runtime:** Node.js 20+ • **Language:** TypeScript • **Framework:** MCP SDK • **Testing:** Vitest (~49% statements, enforced floor)
**Search:** [ripgrep](https://github.com/BurntSushi/ripgrep) (fast recursive text search) + fast-glob (file matching) • **AI Integration:** CE-MCP orchestration directives (host LLM) • **Code Analysis:** [tree-sitter](https://tree-sitter.github.io/tree-sitter/) (incremental code parser) + Smart Code Linking

📖 **[Technical Details →](docs/explanation/server-architecture.md)** | **[CE-MCP Migration Playbook →](docs/how-to-guides/ce-mcp-migration-playbook.md)**

## 📁 Project Structure

```
src/tools/     # 64 MCP tools with annotated metadata
docs/adrs/     # Architectural Decision Records
tests/         # ~49% statement coverage, floor enforced in CI
.github/       # CI/CD automation
```

📖 **[Full Structure →](docs/tutorials/01-first-steps.md)**

## 🧪 Testing

```bash
npm test              # Run all tests
npm run test:coverage # Coverage report
```

📖 **[Testing Guide →](docs/how-to-guides/troubleshooting.md)**

## 🌐 ADR Aggregator Integration (Optional)

[ADR Aggregator](https://adraggregator.com) is a platform for cross-team ADR visibility and governance. It provides:

- **Cross-repository knowledge graphs** — See how architectural decisions relate across projects
- **Governance dashboards** — Track ADR compliance, staleness, and review cycles
- **Template library** — Access domain-specific ADR templates (security, API, database, etc.)
- **Team collaboration** — Share architectural decisions organization-wide

> **Note:** ADR Aggregator is optional. All core analysis features work without it.

```bash
# Set your API key (get one at adraggregator.com)
export ADR_AGGREGATOR_API_KEY="agg_your_key_here"
```

### Available Tools

| Tool                      | Description                        | Free | Pro+ | Team |
| ------------------------- | ---------------------------------- | ---- | ---- | ---- |
| `sync_to_aggregator`      | Push local ADRs to platform        | ✅   | ✅   | ✅   |
| `get_adr_context`         | Pull ADR context from platform     | ✅   | ✅   | ✅   |
| `get_staleness_report`    | Get ADR governance/health reports  | ✅   | ✅   | ✅   |
| `get_adr_templates`       | Retrieve domain-specific templates | ✅   | ✅   | ✅   |
| `get_adr_diagrams`        | Get Mermaid diagrams for ADRs      | —    | ✅   | ✅   |
| `validate_adr_compliance` | Validate ADR implementation        | —    | ✅   | ✅   |
| `get_knowledge_graph`     | Cross-repository knowledge graph   | —    | —    | ✅   |

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

📖 **[ADR Aggregator Guide →](https://adraggregator.com/docs)** | 📖 **[MCP Integration Guide →](https://adraggregator.com/mcp-guide)**

## 🔧 Development

```bash
git clone https://github.com/tosin2013/mcp-adr-analysis-server.git
cd mcp-adr-analysis-server
npm install && npm run build && npm test
```

**Quality Standards:** TypeScript strict mode • ESLint • enforced coverage floor • Pre-commit hooks

### Viewing Documentation Locally

API documentation is generated with [TypeDoc](https://typedoc.org/):

```bash
npm install          # Required once after cloning (installs typedoc)
npm run docs:build   # Generate API docs into docs/api/
npm run docs:serve   # Serve locally via Python HTTP server
```

Then open `http://localhost:8080` in your browser. Markdown documentation lives in `docs/` and can be browsed directly on GitHub.

📖 **[Development Guide →](docs/how-to-guides/getting-started-workflow-guidance.md)** | **[Contributing →](CONTRIBUTING.md)**

## 🔧 Troubleshooting

**Common Issues:**

- **RHEL Systems**: Use special installer script
- **Tools return directives instead of results**: This is expected in CE-MCP mode — your host LLM executes the directives. For server-side execution, set `EXECUTION_MODE=full` + `OPENROUTER_API_KEY`
- **Module not found**: Run `npm install && npm run build`
- **Permission denied**: Check file permissions and project path

📖 **[Complete Troubleshooting Guide →](docs/how-to-guides/troubleshooting.md)**

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
5. **Test**: `npm test` (do not drop below the coverage floor)
6. **Submit** a Pull Request

### 🗺️ Roadmap

Work is tracked in [GitHub milestones](https://github.com/tosin2013/mcp-adr-analysis-server/milestones), and milestone membership is what marks an issue as admitted.

Architectural direction lives in [`docs/adrs/`](docs/adrs/README.md); release cadence is in
[`RELEASES.md`](RELEASES.md).

### 👶 First Time Contributing?

Looking for a good first issue? Check out our [**good first issues**](https://github.com/tosin2013/mcp-adr-analysis-server/issues?q=is%3Aissue+is%3Aopen+label%3A%22good+first+issue%22) - these are beginner-friendly tasks perfect for getting started!

**New to open source?** Our [Contributing Guide](CONTRIBUTING.md) walks you through the entire process step-by-step.

### 📝 Reporting Issues

Use our [**issue templates**](https://github.com/tosin2013/mcp-adr-analysis-server/issues/new/choose) when reporting bugs or requesting features. Templates help us understand and resolve issues faster.

**Standards:** TypeScript strict • enforced coverage floor • ESLint • Security validation • MCP compliance

📖 **[Full Contributing Guide →](CONTRIBUTING.md)** | **[Code of Conduct →](docs/community/CODE_OF_CONDUCT.md)**

## 🔗 Resources

**Official:** [MCP Specification](https://modelcontextprotocol.io/) • [MCP SDK](https://github.com/modelcontextprotocol/typescript-sdk)  
**Community:** [MCP Registry](https://github.com/modelcontextprotocol/servers) • [Discord](https://discord.gg/modelcontextprotocol)  
**Project:** [ADRs](https://github.com/tosin2013/mcp-adr-analysis-server/tree/main/docs/adrs) • [Progress](./docs/release-dashboard.md) • [Publishing Guide](./docs/how-to-guides/push-tags-to-npm.md)

## 📄 License

MIT License - see [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- **Anthropic** for creating the Model Context Protocol
- **The MCP Community** for inspiration and best practices
- **Contributors** who help make this project better

---

**Built with ❤️ by [Tosin Akinosho](https://github.com/tosin2013) for AI-driven architectural analysis**

_Empowering AI assistants with drift detection, content safety, and decision memory via CE-MCP orchestration directives._
