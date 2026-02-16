# MCP ADR Analysis Server - AI Coding Agent Instructions

## Project Overview

This is a **Model Context Protocol (MCP) server** that provides AI-powered architectural analysis and ADR (Architectural Decision Record) management. The server integrates with AI assistants (Claude, Cline, Cursor) via the MCP protocol and uses OpenRouter.ai for generating actual analysis results instead of prompts.

**Core Architecture**: MCP server (`src/index.ts`) exposes 27 specialized tools through `@modelcontextprotocol/sdk` that call into utilities for AI execution, caching, knowledge graphs, and memory management.

## Critical Technical Conventions

### ESM-Only Module System

- **Pure ESM** (no CommonJS): All imports must use `.js` extensions even for TypeScript files
- Use `import.meta.url` (never `__dirname`). Helper: `getCurrentDirCompat()` from `src/utils/directory-compat.ts`
- Example: `import { foo } from './bar.js'` (note `.js` extension)
- `package.json` declares `"type": "module"` and targets ES2022

### TypeScript Configuration

- **Strict mode enabled**: All strict type checks are enforced (see `tsconfig.json`)
- Output directory: `dist/src/` with source maps and declarations
- Tree-sitter native modules are mocked in Jest (`tests/__mocks__/`)

### Testing Requirements

- **Coverage threshold: 85%** (branches, functions, lines, statements)
- Jest 30+ with ESM support (`workerThreads: false` to allow dynamic imports)
- Run tests with: `npm test` or `make test`
- Tree-sitter modules must be mocked for Jest VM environment

## Development Workflows

### Build & Run

```bash
npm run build      # Clean + TypeScript compile to dist/
npm start          # Run production server from dist/
npm run dev        # Development server with tsx hot-reload
make ci            # Full pipeline: security, lint, test, build
```

### Testing Strategy

```bash
npm test                      # All tests with Jest
npm run test:coverage         # Generate coverage report
npm run test:unit             # Unit tests via scripts/test-infrastructure.sh
npm run test:integration      # Integration tests
npm run test:mcp-interactive  # Test with MCP Inspector
```

### Code Quality

- **Linting**: `npm run lint` runs ESLint + TypeScript type checking (`tsc --noEmit`)
- **Formatting**: Prettier is integrated; use `npm run format` or `npm run lint:fix`
- Pre-commit hooks enforce quality via Husky

## AI Execution Architecture

### Two-Mode Operation

1. **Full Mode** (with `OPENROUTER_API_KEY`): Returns actual AI-generated analysis results
2. **Prompt Mode** (fallback): Returns prompts for manual execution

**Key Files**:

- `src/utils/ai-executor.ts`: OpenRouter.ai integration with caching and retry logic
- `src/config/ai-config.ts`: AI configuration management
- Environment: Set `EXECUTION_MODE=full` and `OPENROUTER_API_KEY` for AI results

### Tool Response Pattern

All tools in `src/tools/` follow this structure:

```typescript
return {
  content: [{ type: "text", text: "result" }],
  isError?: boolean
};
```

## Memory & State Management

### Knowledge Graph System (`src/utils/knowledge-graph-manager.ts`)

- **Persistent storage** in OS temp directory: `$TMPDIR/{projectName}/cache/`
- Tracks intents, tool executions, ADR decisions, and relationships
- Provides `queryKnowledgeGraph()` for semantic context retrieval
- Memory operations are recorded for analytics (limited to last 1000 entries)

### State Reinforcement (`src/utils/state-reinforcement-manager.ts`)

- **Context decay mitigation**: Re-injects core context every 5 turns or when responses exceed 3000 tokens
- Integrates recent knowledge graph intents into context reminders
- Configuration: `turnInterval`, `tokenThreshold`, `includeKnowledgeGraphContext`

### Conversation Memory (`src/utils/conversation-memory-manager.ts`)

- **Phase 3 context decay mitigation**: Structured external memory for long conversations
- Stores conversation sessions, expandable content, and resumption context
- Auto-cleanup of sessions older than 24 hours

## Deployment Pattern Framework

### Validated Patterns (`patterns/infrastructure/*.yaml`)

Authoritative templates for infrastructure deployment that LLMs query for platform-specific guidance:

**Available Patterns**:

- `kubernetes.yaml` - Container orchestration
- `firebase.yaml` - Production Firebase deployment
- `firebase-emulators.yaml` - Local Firebase testing (emulator-first workflow)
- `aws.yaml`, `openshift.yaml` - Cloud platforms

**Pattern Structure**:

- `authoritativeSources`: URLs with priority (1-10) for LLMs to query
- `deploymentPhases`: Ordered steps with commands
- `validationChecks`: Critical checks with remediation steps
- `detectionHints`: Files/patterns for automatic pattern detection (e.g., `firebase.json` → Firebase)

**Tool Integration**: `bootstrap-validation-loop-tool.ts` auto-detects patterns based on project files with confidence scoring.

## Key Tool Categories

### Architectural Analysis

- `analyze_project_ecosystem`: Comprehensive project analysis with technology detection
- `adr-suggestion-tool.ts`: Generate ADR recommendations
- `deployment-readiness-tool.ts`: Zero-tolerance validation with hard blocking on failures

### Memory & Planning

- `conversation-memory-tool.ts`: Session management and context persistence
- `memory-loading-tool.ts`: Load historical conversation context
- `mcp-planning-tool.ts`: Strategic planning and task breakdown

### Research & Integration

- `research-question-tool.ts`: Query knowledge graph and external sources
- `llm-web-search-tool.ts`: Firecrawl integration for web research
- `research-integration-tool.ts`: Synthesize research into actionable insights

### Deployment & Validation

- `bootstrap-validation-loop-tool.ts`: Automated deployment with pattern detection
- `deployment-readiness-tool.ts`: Pre-deployment validation (see ADR 002)
- `adr-bootstrap-validation-tool.ts`: ADR-based deployment guidance

### Orchestration

- `tool-chain-orchestrator.ts`: AI-powered dynamic tool sequencing that generates execution plans for the calling LLM

## Project-Specific Patterns

### Two-Phase Test-Driven Development (ADR 003)

1. **Test Generation Phase**: Define tests, stubs, and validation criteria
2. **Implementation Phase**: Implement and validate against generated tests

- Zero-tolerance for test failures (deployment readiness check)

### Content Security Masking

- `src/utils/output-masking.ts`: Automatic detection and masking of sensitive content
- Patterns defined in `src/types/masking-schemas.ts`
- Used in `content-masking-tool.ts` for security analysis

### Cache Management

- Multi-level caching in OS temp directories (never commit `.mcp-adr-cache`)
- Knowledge graph snapshots: `$TMPDIR/{projectName}/cache/knowledge-graph-snapshots.json`
- Conversation memory: `$TMPDIR/{projectName}/conversation-memory/`

## File Structure Essentials

```
src/
├── index.ts              # MCP server entry point (8466 lines - tool/resource/prompt handlers)
├── tools/                # 27 specialized MCP tools
├── utils/                # Core utilities (AI, caching, knowledge graph, logging)
├── types/                # TypeScript type definitions and schemas
├── config/               # Configuration management
├── prompts/              # Prompt templates for AI execution
└── resources/            # MCP resource handlers

patterns/                 # Deployment pattern templates
├── infrastructure/       # Platform-specific YAML patterns
└── schema.json          # Pattern validation schema

tests/                    # 85%+ coverage requirement
├── __mocks__/           # Tree-sitter and native module mocks
└── *.test.ts            # Unit and integration tests
```

## Common Pitfalls to Avoid

1. **Never use CommonJS**: No `require()`, `module.exports`, or `__dirname`
2. **Import extensions**: Always use `.js` in imports, even for `.ts` source files
3. **Cache directory**: Never commit `.mcp-adr-cache` or files in OS temp directories
4. **Test coverage**: Maintain 85%+ threshold; pre-commit hooks will block otherwise
5. **Tree-sitter in Jest**: Use mocks from `tests/__mocks__/`, never import native modules directly
6. **ESLint compliance**: Run `npm run lint` before committing (includes type checking)
7. **Pattern detection**: When adding infrastructure patterns, update `detectionHints` for automatic recognition

## Integration Points

### External Dependencies

- **OpenRouter.ai**: AI execution via `openai` SDK (configured in `src/config/ai-config.ts`)
- **Firecrawl**: Web scraping for research tools (`@mendable/firecrawl-js`)
- **Tree-sitter**: Code parsing (multiple language grammars - mocked in tests)

### MCP Protocol

- **SDK**: `@modelcontextprotocol/sdk` v1.19.1+
- **Transport**: StdioServerTransport for JSON-RPC communication
- **Schemas**: `CallToolRequestSchema`, `ListToolsRequestSchema`, `ListResourcesRequestSchema`, etc.

## Environment Configuration

Required for full functionality:

- `OPENROUTER_API_KEY`: Enable AI execution (get from openrouter.ai/keys)
- `EXECUTION_MODE=full`: Return AI results instead of prompts
- `PROJECT_PATH`: Target project directory for analysis
- `AI_MODEL`: Optional (default: `anthropic/claude-3-sonnet`)

Optional:

- `FIRECRAWL_API_KEY`: Enable web research tools
- `LOG_LEVEL`: Adjust logging verbosity

## Agentic Workflows (gh-aw)

This project uses **GitHub Agentic Workflows** (Markdown-based workflows with AI coding agents powered by Copilot) for intelligent CI/CD automation alongside traditional YAML workflows.

### Foundation

- **`copilot-setup-steps.yml`** — Required setup (checkout, Node 20, npm ci, build) that runs before any agentic workflow

### New Agentic Workflows

| Workflow           | File                        | Trigger                   | Purpose                                                           |
| ------------------ | --------------------------- | ------------------------- | ----------------------------------------------------------------- |
| CI Doctor          | `ci-doctor.md`              | workflow_run (on failure) | Deep CI failure diagnosis with MCP-specific pattern recognition   |
| Docs Noob Tester   | `docs-noob-tester.md`       | Weekly + manual           | Simulates new developer navigating docs, finds gaps and confusion |
| Dependabot Bundler | `dependabot-bundler.md`     | Weekly + manual           | Groups Dependabot PRs into logical bundles with merge strategies  |
| AI Release Notes   | `ai-release-notes-agent.md` | Tag push (v\*) + manual   | Generates categorized release notes from commits and PRs          |
| MCP Tool Checker   | `mcp-tool-checker.md`       | Weekly (Wed) + manual     | Audits all 27 tools for consistency, ESM compliance, registration |

### Migrated Validation Agents

These replaced the former `.github/agents/` YAML files with AI-enhanced gh-aw equivalents:

| Workflow                      | File                                    | Validates                                               |
| ----------------------------- | --------------------------------------- | ------------------------------------------------------- |
| MCP Server Validation         | `mcp-server-validation.md`              | Server init, tool registration, protocol compliance     |
| AI Executor Integration       | `ai-executor-integration.md`            | Prompt mode, full mode, AI configuration                |
| Knowledge Graph Validation    | `knowledge-graph-validation.md`         | KG manager, state reinforcement, conversation memory    |
| Deployment Pattern Validation | `deployment-pattern-validation.md`      | Pattern schemas, detection, bootstrap tool              |
| ESM Module Validation         | `esm-module-validation.md`              | .js extensions, no CommonJS, compiled output            |
| Tool Chain Orchestrator       | `tool-chain-orchestrator-validation.md` | Tool registry, workflow analysis, dependency resolution |

### Traditional YAML Workflows (Unchanged)

These remain as standard GitHub Actions: `lint.yml`, `test.yml`, `build.yml`, `publish.yml`, `deploy-docusaurus.yml`, `codeql-analysis.yml`, `security-scanning.yml`, `validate-patterns.yml`, `dependencies.yml`, `release-drafter.yml`, `auto-release-on-merge.yml`, `dependabot-auto-release.yml`

## Documentation References

- **Main README**: `README.md` - Installation, quick start, use cases
- **CLAUDE.md**: Detailed architecture, tools, patterns framework
- **LLM_CONTEXT.md**: Auto-generated context reference (45 DocuMCP tools)
- **docs/diataxis-index.md**: Full documentation structure
- **Makefile**: Build system targets and CI pipeline
