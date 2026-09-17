# Detecting ADR Drift Against Live Code with Tree-sitter and MCP

Your architecture decision records are lying to you.

Not maliciously — nobody sat down and decided to let ADR-003 ("Use PostgreSQL for persistence") quietly become fiction while the team migrated to DynamoDB. It happened the way it always happens: a decision was documented, the code evolved, and nobody updated the document. Six months later, a new engineer reads ADR-003, trusts it, and makes a cascading decision based on a lie.

This is **ADR drift** — when your documented architectural decisions no longer match your actual code. And it's endemic. A 2024 survey of engineering teams found that 73% of respondents had encountered situations where architectural documentation contradicted the running system.

The fix isn't "be more disciplined about updating docs." That's been the advice for 20 years and it doesn't work. The fix is automated validation — treating ADRs as testable assertions about your codebase and running those assertions against the code itself.

Here's how to do it with tree-sitter and the Model Context Protocol (MCP).

---

## What Drift Looks Like

ADR drift isn't just wrong documentation. It's a compounding risk:

**Direct harm:**
- New engineers make wrong decisions based on stale ADRs
- Architecture reviews waste time debating decisions that were already reversed in practice
- Compliance audits flag inconsistencies between documented and actual architecture

**Compound harm:**
- ADR-007 says "use REST for inter-service communication" but three services already use gRPC → ADR-012 ("standardize on OpenAPI for all APIs") was written assuming REST is universal → both are now wrong

The common response — "just delete stale ADRs" — destroys institutional memory. You lose the *why* behind decisions, even if the *what* changed.

What you actually need is a system that tells you *which* ADRs match reality and *which* don't, with evidence.

---

## Tree-sitter: Semantic Code Understanding

The key to detecting drift is understanding what your code actually does — not just grepping for strings, but parsing the code's structure.

[Tree-sitter](https://tree-sitter.github.io/tree-sitter/) is an incremental parsing library that generates concrete syntax trees for source code. Unlike regex-based tools, tree-sitter understands language grammar: it knows the difference between a function declaration and a function call, between an import statement and a string that happens to contain the word "import."

For drift detection, this matters because ADR assertions are structural:

| ADR Assertion | What to Detect | Why Tree-sitter |
|---|---|---|
| "Use Express.js for HTTP" | Framework imports across all files | Distinguishes `import express` from `// we used to use express` |
| "All APIs return JSON" | Response format in route handlers | Identifies `res.json()` vs `res.send()` in handler functions |
| "Use repository pattern" | Class/interface structure | Finds classes implementing repository interfaces, not just files named `*Repository*` |
| "No direct DB queries in controllers" | Import patterns + call sites | Detects database client usage in controller files specifically |

The MCP ADR Analysis Server uses tree-sitter parsers for 13 languages — TypeScript, JavaScript, Python, Java, Go, Rust, C, C++, Ruby, YAML, JSON, Bash, and CSS — giving it semantic understanding across polyglot codebases.

---

## How Drift Detection Works

The detection pipeline has three stages:

### 1. ADR Parsing

Each ADR is parsed to extract testable assertions. An ADR titled "Use PostgreSQL for the persistence layer" with a Decision section stating "We will use PostgreSQL 14+ as our primary database" generates assertions like:

- **Technology assertion**: PostgreSQL should be present in dependencies or configuration
- **Exclusion assertion**: No competing databases (MySQL, MongoDB) in production configuration
- **Version assertion**: PostgreSQL version ≥ 14

### 2. Evidence Collection

For each assertion, the system collects evidence from your codebase:

- **Dependency analysis**: `package.json`, `requirements.txt`, `go.mod`, `Cargo.toml`
- **Import analysis**: Tree-sitter AST traversal of source files to find actual library usage
- **Configuration analysis**: Docker Compose, Kubernetes manifests, environment files
- **Code pattern analysis**: How the technology is actually used (not just imported)

### 3. Compliance Scoring

Each ADR gets a compliance score based on evidence:

```
compliance_score = evidence_for / (evidence_for + evidence_against + missing_evidence × 0.5)
```

A score of 1.0 means full compliance. Below 0.7 triggers a drift warning. Below 0.4 flags the ADR as likely obsolete.

---

## Practical Example: Detecting Framework Drift

Suppose your team documented ADR-005: "Use Fastify instead of Express for all new HTTP services."

Six months later, you run drift detection. Here's what happens:

**Step 1**: The tool parses ADR-005 and extracts:
- Technology: Fastify (expected present)
- Technology: Express (expected absent in new services)

**Step 2**: Tree-sitter analyzes your codebase:
- `services/auth/src/app.ts` — imports `fastify` ✅
- `services/billing/src/server.ts` — imports `fastify` ✅
- `services/notifications/src/index.ts` — imports `express` ⚠️
- `services/gateway/src/app.ts` — imports `express` ⚠️

**Step 3**: The compliance report:

```
ADR-005: Use Fastify for HTTP Services
Compliance: 50% (2/4 services)
Status: DRIFT DETECTED

Evidence:
  ✅ services/auth — Fastify 4.26.0 (compliant)
  ✅ services/billing — Fastify 4.26.0 (compliant)
  ⚠️ services/notifications — Express 4.18.2 (violates ADR-005)
  ⚠️ services/gateway — Express 4.21.0 (violates ADR-005)

Recommendation: Either migrate remaining services to Fastify
or update ADR-005 to reflect the hybrid reality.
```

This isn't a linter telling you a variable is unused. This is an architectural compliance check that connects documented decisions to code reality.

---

## Setting It Up

The [MCP ADR Analysis Server](https://github.com/tosin2013/mcp-adr-analysis-server) runs as an MCP server inside your AI coding assistant. No API key required — it runs in CE-MCP mode by default, where your host LLM (Claude, GPT, etc.) executes the analysis.

### Install

```bash
npm install -g mcp-adr-analysis-server
```

### Configure Your MCP Client

Add to Claude Desktop, Cursor, Cline, or Windsurf:

```json
{
  "mcpServers": {
    "adr-analysis": {
      "command": "npx",
      "args": ["-y", "mcp-adr-analysis-server"],
      "env": {
        "PROJECT_PATH": "/path/to/your/project"
      }
    }
  }
}
```

### Run Drift Detection

In your AI assistant, ask:

> "Review my existing ADRs and check which ones match the actual codebase. Flag any drift."

The `review_existing_adrs` tool will:
1. Discover all ADRs in your configured directory
2. Parse each ADR for testable assertions
3. Analyze your codebase with tree-sitter
4. Report compliance scores and specific evidence

For a single ADR:

> "Validate ADR-005 against the current code — is the Fastify migration decision still accurate?"

The `validate_adr` tool performs targeted validation with confidence scoring.

---

## Beyond Point-in-Time Checks

Drift detection is most valuable when it's continuous, not occasional. Three integration points:

### 1. In Your AI Workflow

Every time you start a coding session, ask your AI assistant to check ADR compliance. The session memory system remembers previous checks and highlights *new* drift since last review.

### 2. In Pull Request Reviews

Before merging, validate that the PR doesn't introduce new drift:

> "Does this PR violate any existing ADRs? Check the changed files against our architectural decisions."

### 3. In CI/CD

The `generate_adr_bootstrap` tool creates validation scripts you can integrate into your pipeline. A drift check that fails above a threshold can block deployment — treating architectural compliance like test coverage.

---

## What This Isn't

This approach has boundaries:

- **Not a replacement for human judgment.** A low compliance score doesn't mean an ADR is wrong — it might mean the code needs to catch up, or the ADR needs updating, or the decision was deliberately reversed without documentation. The tool surfaces the gap; a human decides what to do.
- **Not a style checker.** It validates structural architectural assertions, not code formatting or naming conventions.
- **Not exhaustive.** Some architectural decisions ("prefer composition over inheritance") are too abstract to validate against code with high confidence. The tool focuses on decisions that reference specific technologies, patterns, or boundaries.

---

## The Real Win

The value of automated drift detection isn't catching every stale ADR. It's changing the team's relationship with architectural documentation.

When ADRs are validated against code, they stop being "documents nobody reads" and start being "living assertions about the system." Engineers write better ADRs because they know the assertions will be tested. Architects trust ADRs more because they know stale ones will be flagged. New team members can rely on ADRs because the ones that show "100% compliance" actually mean something.

Your ADRs don't have to lie to you. Make them prove they're telling the truth.

---

**Try it:** [mcp-adr-analysis-server on npm](https://www.npmjs.com/package/mcp-adr-analysis-server) • [GitHub](https://github.com/tosin2013/mcp-adr-analysis-server) • 63 tools, zero API keys required
