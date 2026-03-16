# Technical Overview

The MCP ADR Analysis Server is a [Model Context Protocol](https://modelcontextprotocol.io/) server that provides AI-powered architectural analysis. It exposes 73 tools, resources, and prompts through the MCP protocol for integration with AI assistants.

## Core Architecture

- **Runtime**: Node.js 20+ with strict ESM modules
- **Language**: TypeScript with full strict mode
- **Protocol**: MCP SDK (`@modelcontextprotocol/sdk`)
- **AI Backend**: OpenRouter API for LLM-powered analysis
- **Code Analysis**: tree-sitter for incremental code parsing

## Key Subsystems

### Tool Framework

Each MCP tool follows a consistent response pattern and is registered in both `ListToolsRequestSchema` and `CallToolRequestSchema` handlers in `src/index.ts`. Tools are organized by domain in `src/tools/`.

### Knowledge Graph

Maintains relationships between ADRs, code implementations, and technology decisions. Managed by `src/utils/knowledge-graph-manager.ts`.

### Content Security

Automatic masking of sensitive content (API keys, credentials) via configurable patterns in `src/utils/output-masking.ts`.

### Enterprise Architecture Management

- **Portfolio Analysis**: Analyze multiple projects for consistency and compliance
- **Migration Planning**: Plan and track architectural migrations and modernization
- **Risk Assessment**: Identify architectural risks and technical debt
- **Standards Enforcement**: Ensure compliance with enterprise architectural standards

## Further Reading

- [Architecture Overview](explanation/architecture-overview.md)
- [Server Architecture](explanation/server-architecture.md)
- [Development Guide](how-to-guides/getting-started-workflow-guidance.md)
