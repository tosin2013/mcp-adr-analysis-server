# Documentation Guide

Welcome to the **MCP ADR Analysis Server** documentation. This documentation follows the [Diataxis framework](https://diataxis.fr/), a systematic approach to technical documentation organized by user intent.

**Version:** 2.14.12 | **Last reviewed:** 2026-09-16

---

## Quick start paths

### New to the project?

1. Read [What is MCP?](../README.md#what-is-mcp) in the README
2. Follow the [First Steps tutorial](./tutorials/01-first-steps.md)
3. Browse the [API Reference](./reference/api-reference.md)

### Setting up for your team?

1. Review the [Architecture Overview](./explanation/architecture-overview.md)
2. Follow the [Installation Guide](./how-to-guides/installation-guide.md)
3. Configure [MCP clients](./how-to-guides/mcp-client-compatibility.md) for your team
4. (Optional) Enable the [ADR Aggregator](./how-to-guides/adr-aggregator-integration.md) for cross-team visibility

### Troubleshooting?

1. Check the [Troubleshooting Guide](./how-to-guides/troubleshooting.md)
2. Review [MCP Client Compatibility](./how-to-guides/mcp-client-compatibility.md)
3. Search [GitHub Issues](https://github.com/tosin2013/mcp-adr-analysis-server/issues)

---

## Tutorials (learning-oriented)

Step-by-step guides that walk you through a task from start to finish. Start here if you are new.

| Tutorial | Description |
|----------|-------------|
| [First Steps](./tutorials/01-first-steps.md) | Your first ADR analysis with the MCP server |
| [Existing Projects](./tutorials/02-existing-projects.md) | Integrate with an existing codebase |
| [Advanced Analysis](./tutorials/03-advanced-analysis.md) | Deep architectural analysis techniques |
| [Security-Focused Workflow](./tutorials/security-focused-workflow.md) | Security-first development patterns |
| [Team Collaboration](./tutorials/team-collaboration.md) | Working with teams on architectural decisions |

---

## How-to guides (task-oriented)

Practical recipes for specific tasks. Use these when you know what you want to accomplish.

### Getting started

| Guide | Description |
|-------|-------------|
| [Installation](./how-to-guides/installation-guide.md) | Detailed installation instructions |
| [MCP Client Setup](./how-to-guides/mcp-client-compatibility.md) | Configure Claude, Cursor, Cline, and other clients |
| [VS Code Integration](./how-to-guides/vscode-integration.md) | Set up Cline, Continue, and native MCP in VS Code |
| [Workflow Guidance](./how-to-guides/getting-started-workflow-guidance.md) | Development workflow and getting started |
| [Prompting Guide](./how-to-guides/prompting-guide.md) | Effective prompts for the MCP server |

### ADR management

| Guide | Description |
|-------|-------------|
| [Generate ADRs from PRD](./how-to-guides/generate-adrs-from-prd.md) | New projects with a PRD.md |
| [Work with Existing ADRs](./how-to-guides/work-with-existing-adrs.md) | Projects that already have ADRs |
| [Bootstrap Architecture Docs](./how-to-guides/bootstrap-architecture-docs.md) | Projects without any ADRs |
| [Interactive ADR Planning](./how-to-guides/interactive-adr-planning.md) | Plan ADRs interactively |
| [ADR Aggregator Integration](./how-to-guides/adr-aggregator-integration.md) | Cross-team ADR visibility |

### Analysis and security

| Guide | Description |
|-------|-------------|
| [Security Analysis](./how-to-guides/security-analysis.md) | Security analysis and content protection |
| [Deployment Readiness](./how-to-guides/deployment-readiness.md) | Validate deployment readiness |
| [Research Integration](./how-to-guides/research-integration.md) | Research integration workflows |

### Configuration and customization

| Guide | Description |
|-------|-------------|
| [Custom Rules](./how-to-guides/custom-rules.md) | Custom rules and patterns |
| [LLM Context File](./how-to-guides/llm-context-file-configuration.md) | Configure the server context file for LLM referencing |
| [Server Context File](./how-to-guides/server-context-file.md) | How the `.mcp-server-context.md` file works |
| [Validated Patterns](./how-to-guides/validated-patterns-implementation.md) | Implement validated patterns |
| [Validated Patterns with Live Sources](./how-to-guides/using-validated-patterns-with-live-sources.md) | Use validated patterns with live authoritative sources |
| [Dynamic Pattern Configuration](./how-to-guides/dynamic-pattern-configuration-system.md) | Dynamic pattern configuration system |

### Development and CI/CD

| Guide | Description |
|-------|-------------|
| [Tool Development](./how-to-guides/tool-development.md) | Build new MCP tools |
| [Testing Guide](./how-to-guides/testing-guide.md) | Testing strategy and patterns |
| [Performance Testing](./how-to-guides/performance-testing.md) | Performance testing procedures |
| [CI/CD Integration](./how-to-guides/cicd-integration.md) | Integrate with CI/CD pipelines |
| [Large Team Scaling](./how-to-guides/large-team-scaling.md) | Scale for large teams |

### Publishing and deployment

| Guide | Description |
|-------|-------------|
| [Deploy Your Own Server](./how-to-guides/deploy-your-own-server.md) | NPM publishing and deployment |
| [Push Tags to NPM](./how-to-guides/push-tags-to-npm.md) | Publishing workflow for npm |
| [CE-MCP Migration Playbook](./how-to-guides/ce-mcp-migration-playbook.md) | Migrate to CE-MCP execution mode |
| [Contributing](./how-to-guides/contribute.md) | How to contribute to the project |

### Advanced frameworks

| Guide | Description |
|-------|-------------|
| [APE Implementation Strategy](./how-to-guides/ape-implementation-strategy.md) | Automatic Prompt Engineering implementation |
| [APE Usage Guide](./how-to-guides/ape-usage-guide.md) | Using the APE framework |
| [Reflexion Implementation](./how-to-guides/reflexion-implementation-strategy.md) | Reflexion framework implementation |
| [Reflexion Usage Guide](./how-to-guides/reflexion-usage-guide.md) | Using the Reflexion framework |
| [Knowledge Generation](./how-to-guides/knowledge-generation-usage-guide.md) | Knowledge generation framework usage |
| [Hybrid DAG Bootstrap](./how-to-guides/hybrid-dag-bootstrap-design.md) | Hybrid DAG bootstrap validation loop |
| [Tool Context Documentation](./how-to-guides/tool-context-documentation-plan.md) | Tool context documentation system |
| [Troubleshooting](./how-to-guides/troubleshooting.md) | Common issues and solutions |

---

## Reference (information-oriented)

Technical specifications and lookup tables. Use these when you need exact details.

### API and tools

| Reference | Description |
|-----------|-------------|
| [API Reference](./reference/api-reference.md) | Complete tool documentation |
| [Comprehensive API Reference](./reference/comprehensive-api-reference.md) | Extended API documentation with examples |
| [API Documentation](./reference/api-documentation.md) | API documentation overview |
| [Usage Examples](./reference/usage-examples.md) | Practical usage examples |
| [Tool Surface Map](./reference/tool-surface-map.md) | Map of all tool capabilities |

### Tool categories

| Reference | Description |
|-----------|-------------|
| [Analysis Tools](./reference/analysis-tools.md) | Code analysis tool specifications |
| [Generation Tools](./reference/generation-tools.md) | ADR and code generation tools |
| [Security Tools](./reference/security-tools.md) | Security and content masking tools |
| [Validation Tools](./reference/validation-tools.md) | ADR and deployment validation tools |

### Configuration

| Reference | Description |
|-----------|-------------|
| [Environment Config](./reference/environment-config.md) | Environment variables and settings |
| [MCP Client Config](./reference/mcp-client-config.md) | MCP client configuration reference |
| [Glossary](./reference/glossary.md) | Terms and definitions |
| [Mermaid Diagrams](./reference/mermaid-diagrams-reference.md) | Mermaid diagram reference |

---

## Explanation (understanding-oriented)

Conceptual discussions that clarify the architecture and design decisions.

### Architecture

| Explanation | Description |
|-------------|-------------|
| [Architecture Overview](./explanation/architecture-overview.md) | System design and components |
| [Server Architecture](./explanation/server-architecture.md) | Detailed server internals |
| [MCP Architecture Flow](./explanation/mcp-architecture-flow.md) | Request and response flow |
| [MCP Concepts](./explanation/mcp-concepts.md) | Understanding the Model Context Protocol |
| [Tool Design](./explanation/tool-design.md) | Tool design philosophy |

### AI and analysis

| Explanation | Description |
|-------------|-------------|
| [AI Architecture Concepts](./explanation/ai-architecture-concepts.md) | AI integration patterns |
| [AI Workflow Concepts](./explanation/ai-workflow-concepts.md) | AI-powered workflow orchestration |
| [Prompt Engineering](./explanation/prompt-engineering.md) | Prompt engineering techniques |
| [Self-Learning Architecture](./explanation/self-learning-architecture.md) | Adaptive analysis system |

### Frameworks and design

| Explanation | Description |
|-------------|-------------|
| [APE Framework Design](./explanation/ape-framework-design.md) | Automatic Prompt Engineering framework |
| [Reflexion Framework Design](./explanation/reflexion-framework-design.md) | Reflexion framework design |
| [Knowledge Generation Design](./explanation/knowledge-generation-framework-design.md) | Knowledge generation framework |
| [Knowledge Graph](./explanation/knowledge-graph.md) | Session and tool-usage tracker |
| [Context File Coverage](./explanation/context-file-tool-coverage.md) | How `.mcp-server-context.md` covers all tools |

### Security and performance

| Explanation | Description |
|-------------|-------------|
| [Security Philosophy](./explanation/security-philosophy.md) | Security design principles |
| [Performance Design](./explanation/performance-design.md) | Performance optimization approach |
| [ADR Philosophy](./explanation/adr-philosophy.md) | ADR philosophy and methodological pragmatism |

---

## Other documentation

| Document | Description |
|----------|-------------|
| [DESIGN_DOC.md](../DESIGN_DOC.md) | Software Design Document (arc42) |
| [ADRs](./adrs/) | Architectural Decision Records (24 decisions) |
| [CHANGELOG](../CHANGELOG.md) | Release history |
| [RELEASES](../RELEASES.md) | Release policy and pipeline |
| [SECURITY](../SECURITY.md) | Security policy and vulnerability reporting |

---

## About Diataxis

The [Diataxis framework](https://diataxis.fr/) organizes documentation by user intent:

| Type | Purpose | User need |
|------|---------|-----------|
| **Tutorials** | Learning | "I want to learn" |
| **How-to guides** | Goals | "I want to accomplish X" |
| **Reference** | Information | "I need to know about Y" |
| **Explanation** | Understanding | "I want to understand why" |

---

## Contributing to documentation

Found an issue or want to improve the docs? See the [Contributing Guide](../CONTRIBUTING.md).
