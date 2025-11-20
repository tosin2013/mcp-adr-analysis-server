# GitHub Actions Agents

This directory contains specialized GitHub Actions workflows that act as automated validation agents for the MCP ADR Analysis Server project.

## Available Agents

### 1. MCP Server Validation Agent (`mcp-server-validation.yml`)

**Purpose**: Validates MCP server initialization, protocol compliance, and tool registration

**Triggers**:

- Pull requests affecting `src/` or `tests/`
- Pushes to `main` or `develop`
- Manual dispatch

**Key Validations**:

- MCP server health checks
- Tool registration verification
- Protocol compliance testing
- Multi-version Node.js compatibility (20.x, 22.x)

**Artifacts**: `mcp-validation-logs-node-{version}`

---

### 2. AI Executor Integration Agent (`ai-executor-integration.yml`)

**Purpose**: Tests AI executor functionality in both prompt and full execution modes

**Triggers**:

- Pull requests affecting AI executor code
- Pushes to `main`
- Daily at 6 AM UTC (checks for API changes)
- Manual dispatch

**Key Validations**:

- Prompt mode operation (no API key required)
- Full mode integration with OpenRouter (if API key available)
- AI configuration validation
- Prompt generation for all tools

**Secrets Required** (optional):

- `OPENROUTER_API_KEY`: For full mode testing

**Artifacts**: `ai-integration-report`

---

### 3. Knowledge Graph Validation Agent (`knowledge-graph-validation.yml`)

**Purpose**: Validates knowledge graph, state reinforcement, and conversation memory systems

**Triggers**:

- Pull requests affecting memory/graph managers
- Pushes to `main`
- Manual dispatch

**Key Validations**:

- Knowledge graph manager functionality
- State reinforcement system
- Conversation memory management
- Graph persistence to OS temp directories
- Automatic cleanup of old sessions

**Artifacts**: `knowledge-graph-validation-report` with coverage data

---

### 4. Deployment Pattern Validation Agent (`deployment-pattern-validation.yml`)

**Purpose**: Validates deployment patterns and automatic pattern detection

**Triggers**:

- Pull requests affecting `patterns/` directory
- Pull requests affecting deployment tools
- Pushes to `main`
- Manual dispatch

**Key Validations**:

- Pattern schema validation
- Pattern detection tests
- All infrastructure patterns (Kubernetes, Firebase, AWS, etc.)
- Bootstrap validation tool
- Deployment readiness tool
- Pattern documentation completeness

**Artifacts**: `pattern-validation-report`

---

### 5. ESM Module Validation Agent (`esm-module-validation.yml`)

**Purpose**: Ensures strict ESM module system compliance

**Triggers**:

- Pull requests affecting TypeScript source files
- Pull requests affecting configuration files
- Pushes to `main`
- Manual dispatch

**Key Validations**:

- `package.json` ESM configuration (`type: "module"`)
- All imports use `.js` extensions
- No CommonJS patterns (`require`, `module.exports`)
- No `__dirname` usage (enforces `import.meta.url`)
- ESM compilation and module loading
- `getCurrentDirCompat()` helper functionality

**Artifacts**: `esm-validation-report`

---

### 6. Tool Chain Orchestrator Validation Agent (`tool-chain-orchestrator-validation.yml`)

**Purpose**: Validates dynamic tool chain orchestration and AI-powered workflow generation

**Triggers**:

- Pull requests affecting orchestrator or tools
- Pushes to `main`
- Manual dispatch

**Key Validations**:

- Orchestrator tool tests
- Tool registry (27 tools)
- Workflow analysis capabilities
- Tool dependency resolution
- Parallel vs sequential execution detection

**Artifacts**: `orchestrator-validation-report` with coverage data

---

## Agent Architecture

Each agent follows a consistent pattern:

1. **Trigger Configuration**: Responds to relevant code changes
2. **Environment Setup**: Node.js, dependencies, build
3. **Validation Steps**: Specialized tests and checks
4. **Report Generation**: Markdown reports with validation results
5. **Artifact Upload**: Stores logs and reports for review

## Integration with Main Workflows

These agents complement the main CI/CD workflows in `.github/workflows/`:

- `test.yml`: General test suite
- `lint.yml`: Code quality
- `build.yml`: Build verification
- `security-scanning.yml`: Security checks

Agents provide **deep validation** of specific subsystems while main workflows handle broad quality gates.

## Running Agents Locally

While designed for CI/CD, agents can be tested locally:

```bash
# MCP Server Validation
npm run build && npm run health

# AI Executor Integration
npm test -- tests/utils/ai-executor.test.ts

# Knowledge Graph Validation
npm test -- tests/utils/knowledge-graph-manager.test.ts

# Deployment Pattern Validation
npm run validate:patterns

# ESM Module Validation
npm run typecheck && npm run build

# Tool Chain Orchestrator Validation
npm test -- tests/tools/tool-chain-orchestrator.test.ts
```

## Adding New Agents

To add a new validation agent:

1. Create a new workflow file: `.github/agents/<agent-name>.yml`
2. Follow the established pattern (triggers, setup, validation, reporting)
3. Add documentation to this README
4. Test locally before committing
5. Update `.github/copilot-instructions.md` if relevant

## Best Practices

- **Focused Scope**: Each agent validates a specific subsystem
- **Fast Feedback**: Agents run quickly (< 5 minutes typical)
- **Clear Reports**: Generate human-readable validation reports
- **Artifact Retention**: Store artifacts for debugging (7-30 days)
- **Fail Fast**: Exit with error code 1 on validation failures
- **Parallel Safe**: Agents can run concurrently without conflicts

## Maintenance

- Review agent logs regularly for flaky tests
- Update Node.js versions as project requirements change
- Keep secrets configuration current (especially `OPENROUTER_API_KEY`)
- Adjust artifact retention based on storage needs
- Update patterns and validations as architecture evolves

---

**Last Updated**: November 20, 2025  
**Project**: MCP ADR Analysis Server v2.1.11  
**Contact**: See `CONTRIBUTING.md` for contribution guidelines
