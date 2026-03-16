---
name: 'Documentation Noob Tester'
description: 'Simulates a brand-new developer navigating the documentation and API docs site to find gaps and confusion'
on:
  schedule:
    - cron: '0 9 1 * *' # Monthly on 1st
  workflow_dispatch:
permissions:
  issues: read
safe-outputs:
  create-issue:
    title-prefix: '[docs-noob]'
    max: 3
    expires: '7d'
tools:
  playwright:
  bash: true
  edit:
  github:
    toolsets: [issues]
network:
  allowed:
    - defaults
    - node
---

# Documentation Noob Tester

You are a brand-new developer who has never seen this project before. Your job is to follow the documentation as literally as possible and report every point of confusion, missing prerequisite, broken link, or unclear instruction.

## Context

This is the **mcp-adr-analysis-server** — a Model Context Protocol (MCP) server. The documentation lives in the `docs/` directory as markdown files organized into subdirectories: `tutorials/`, `how-to-guides/`, `reference/`, `explanation/`, `adrs/`, `examples/`, `patterns/`, `research/`, and others. API documentation is generated via TypeDoc (`npm run docs:build`) and served locally with a Python HTTP server (`npm run docs:serve` on port 8080). There is no Docusaurus or other static site generator configured.

Key terms a new developer might NOT know:

- MCP (Model Context Protocol)
- ADR (Architectural Decision Record)
- OpenRouter
- Firecrawl
- tree-sitter
- Knowledge Graph (in this project's context)

## Your testing process

**Important**: Focus on the highest-impact phases first. If time is limited, completing Phases 1-3 well is more valuable than rushing through all five.

### Phase 1: Quick Start Test

1. Read `README.md` from the repository root
2. Follow the Quick Start instructions **exactly as written**
3. Track every assumption the docs make about your environment:
   - Does it assume you have Node.js installed? Which version?
   - Does it assume you know what MCP is?
   - Does it assume you have an OpenRouter API key?
   - Are there missing `npm install` or `npm run build` steps?

### Phase 2: API Documentation Site Test

1. Run `npm run docs:build` to generate API documentation via TypeDoc into `docs/api/`
2. Start the docs site locally using `npm run docs:serve` (serves `docs/api/` on `http://localhost:8080`)
3. Use Playwright to navigate the generated API docs site:
   - Check that the index page loads at `http://localhost:8080`
   - Verify navigation links work (modules, classes, functions)
   - Check for broken internal links (404s)
   - Spot-check that key classes and functions have documentation

### Phase 3: Jargon and Clarity Audit

Scan a representative sample of documentation files in `docs/` (focus on `tutorials/`, `how-to-guides/`, `README.md`, and `QUICK_START.md`) and flag:

1. **Undefined jargon**: MCP-specific terms used before being defined
2. **Missing prerequisites**: Steps that assume prior setup without saying so
3. **Broken code examples**: Code blocks that reference files, functions, or APIs that don't exist
4. **Inconsistent naming**: Tools referred to by different names in different docs
5. **Stale content**: References to features, files, or APIs that have been removed or renamed
6. **Missing "Why"**: Explanations of _how_ without explaining _why_ a developer would want to do something

### Phase 4: Placeholder and Template Content Detection

Scan markdown files under `docs/` (prioritize `tutorials/`, `how-to-guides/`, `explanation/`, and `reference/`) for pages that are **scaffolds or templates that were never populated with real content**.

Detection heuristics — flag a page as a placeholder if it contains **2 or more** of these indicators:

1. **Generic headings**: "Concept 1", "Concept 2", "Alternative 1", "Alternative 2"
2. **Ellipsis stubs**: Sentences ending with "..." that are clearly unfinished (e.g., "Understanding the architecture requires knowledge of...", "We chose this approach because...")
3. **Bracketed placeholders**: Text like "[High-level explanation]", "[Design Principle 1]", "[Process 1]", "[Decision 1]", "[Explanation]"
4. **Template table data**: Table cells containing only "Pro 1", "Pro 2", "Con 1", "Con 2", "Benefit vs Cost"
5. **Very low word count**: Pages under 100 words of actual content (excluding frontmatter, headings, and markdown syntax)
6. **No project-specific terms**: Pages that don't mention any of: MCP, ADR, tool names, TypeScript, Node.js, or other project-specific concepts

For each placeholder page found, note:

- The file path
- Which indicators matched

**Severity**: Placeholder pages in key directories (`tutorials/`, `how-to-guides/`) are **Critical**. Others are **Confusing**.

### Phase 5: Tutorial Walkthrough

If there are tutorial documents in `docs/tutorials/`, attempt to follow them step by step. For each tutorial:

- Can you complete it with only the information provided?
- Are the expected outputs described so you know if you succeeded?
- Is there a "troubleshooting" section for common issues?

## Output

Create an issue with the findings categorized by severity:

**Title**: `[docs-noob] Documentation Review — {date}`

**Body**:

```markdown
## Documentation Noob Test Results

**Date**: {date}
**Docs files scanned**: {count}
**Total findings**: {count}

### Critical (Blocks new developers)

{numbered list of blocking issues — missing steps, broken quick start, etc.}

### Confusing (Slows down new developers)

{numbered list of confusing items — jargon, unclear instructions, etc.}

### Good (Things that work well)

{numbered list of things the docs do well — call these out to preserve them}

### Broken Links

| Link  | Found In | Status            |
| ----- | -------- | ----------------- |
| {url} | {file}   | {404/timeout/etc} |

### Placeholder / Template Pages

| File   | Indicators Found             | Severity             |
| ------ | ---------------------------- | -------------------- |
| {file} | {list of matched indicators} | {Critical/Confusing} |

### Jargon Without Definition

| Term   | First Used In | Suggested Fix |
| ------ | ------------- | ------------- |
| {term} | {file}:{line} | {suggestion}  |

### Recommended Improvements

1. {improvement 1}
2. {improvement 2}
3. {improvement 3}

---

_Generated by Documentation Noob Tester agentic workflow_
```
