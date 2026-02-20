---
title: MCP ADR Analysis Server
slug: /
---

# MCP ADR Analysis Server

**AI-powered architectural analysis for intelligent development workflows**

An MCP server that gives AI coding assistants — Claude, Cursor, Cline, Windsurf — deep architectural analysis capabilities. Unlike other tools, it returns **actual analysis results with confidence scoring**, not prompts to submit elsewhere.

```bash
npm install -g mcp-adr-analysis-server
```

---

## ✨ Core Capabilities

🤖 **AI-Powered Analysis** — Immediate architectural insights via OpenRouter.ai integration

📋 **ADR Management** — Generate, suggest, and maintain Architectural Decision Records automatically

🔗 **Smart Code Linking** — AI-powered discovery of code files related to ADRs and decisions

🏗️ **Technology Detection** — Identify any tech stack and architectural patterns in your codebase

🛡️ **Security & Compliance** — Detect and mask sensitive content with configurable patterns

🚀 **Deployment Readiness** — Zero-tolerance test validation with hard blocking before deploy

🧪 **TDD Integration** — Two-phase Test-Driven Development with automated validation

---

## 🎯 Who Is This For?

### 👨‍💻 AI Assistant Users

Use with **Claude Desktop**, **Cline**, **Cursor**, or **Windsurf** to enhance your AI coding workflow with architectural intelligence. Ask questions in natural language and get real analysis results back.

### 🏢 Enterprise Architects

Track architectural decisions with ADRs, build knowledge graphs across repositories, enforce compliance standards, and generate governance reports — all integrated into your existing toolchain.

### 🛠️ Development Teams

Integrate into CI/CD pipelines for automated code quality checks, deployment readiness validation, security scanning, and test coverage enforcement with >80% thresholds.

---

## ⚡ Quick Start

### 1. Install

```bash
npm install -g mcp-adr-analysis-server
```

### 2. Get an API Key (optional)

Sign up at [OpenRouter.ai/keys](https://openrouter.ai/keys) for full AI-powered analysis. No API key? The server still works in **prompt-only mode** — you'll get prompts you can paste into any AI chat.

### 3. Configure Your MCP Client

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

See the [Installation Guide](./how-to-guides/installation-guide.md) for detailed setup instructions, client-specific config locations, and troubleshooting.

---

## 📚 Explore the Docs

### [🎓 Tutorials](./tutorials/)

Step-by-step guides to get you up and running — from first install to your first architectural analysis.

### [🛠️ How-To Guides](./how-to/)

Task-oriented recipes for specific goals: configuring clients, running analyses, managing ADRs, and integrating with CI/CD.

### [📖 Reference](./reference/api-reference.md)

Technical details on all 23 MCP tools, environment variables, configuration options, and API specifications.

### [💡 Explanation](./explanation/)

Deep dives into architectural concepts, design decisions, security philosophy, and how the server works under the hood.
