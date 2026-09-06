---
title: MCP ADR Analysis Server
slug: /
---

# MCP ADR Analysis Server

**Your ADRs are lying to you.** This MCP server catches it.

Live drift detection validates architectural decisions against your actual code — plus content safety, decision memory, and 64 tools powered by your host LLM via CE-MCP.

```bash
npm install -g mcp-adr-analysis-server
```

---

## ✨ Core Capabilities

🔄 **Drift Detection** — Validate ADR decisions against live code and infrastructure evidence. No other ADR tool does this.

🛡️ **Content Safety** — Detect and mask secrets, PII, and sensitive content automatically before it reaches the LLM.

🧠 **Decision Memory** — Session & tool-usage tracking with keyword-scored retrieval across conversations.

🏗️ **Technology Detection** — Identify any tech stack and architectural patterns in your codebase.

📋 **ADR Management** — Generate, suggest, and maintain Architectural Decision Records automatically.

🔗 **Smart Code Linking** — Discovery of code files related to ADRs and decisions using tree-sitter AST analysis and ripgrep.

🚀 **Deployment Readiness** — Zero-tolerance test validation with hard blocking before deploy.

---

## 🎯 Who Is This For?

### 👨‍💻 AI Assistant Users

Use with **Claude Desktop**, **Cline**, **Cursor**, or **Windsurf** to enhance your AI coding workflow with architectural intelligence. No API key required — the server runs in CE-MCP mode by default, using your host LLM's existing context.

### 🏢 Enterprise Architects

Track architectural decisions with ADRs, detect drift before it causes production incidents, enforce content safety standards, and generate governance reports — all integrated into your existing toolchain.

### 🛠️ Development Teams

Integrate into CI/CD pipelines for automated ADR validation, deployment readiness checks, security scanning, and architectural compliance enforcement.

---

## ⚡ Quick Start

### 1. Install

```bash
npm install -g mcp-adr-analysis-server
```

### 2. Configure Your MCP Client

No API key required. The server runs in **CE-MCP mode** by default — your host LLM executes the analysis using orchestration directives.

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

See the [Installation Guide](./how-to-guides/installation-guide.md) for detailed setup instructions, client-specific config locations, and troubleshooting.

---

## 📚 Explore the Docs

### [🎓 Tutorials](./tutorials/)

Step-by-step guides to get you up and running — from first install to your first architectural analysis.

### [🛠️ How-To Guides](./how-to/)

Task-oriented recipes for specific goals: configuring clients, running analyses, managing ADRs, and integrating with CI/CD.

### [📖 Reference](./reference/api-reference.md)

Technical details on all 64 MCP tools, environment variables, configuration options, and the CE-MCP directive format.

### [💡 Explanation](./explanation/)

Deep dives into architectural concepts, design decisions, security philosophy, and how the server works under the hood.
