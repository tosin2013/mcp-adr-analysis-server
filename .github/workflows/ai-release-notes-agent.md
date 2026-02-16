---
name: 'AI-Enhanced Release Notes Agent'
description: 'Generates comprehensive release notes by analyzing commits, PRs, and MCP-specific changes since the previous tag'
on:
  push:
    tags:
      - 'v*'
  workflow_dispatch:
    inputs:
      tag:
        description: 'Tag to generate release notes for (e.g., v2.1.28). Defaults to latest tag.'
        required: false
permissions:
  actions: read
  issues: read
  pull-requests: read
  contents: read
safe-outputs:
  add-comment:
  update-issue:
tools:
  github:
    toolsets: [actions, pull_requests, issues]
  bash: true
  web-fetch:
post-steps:
  - uses: softprops/action-gh-release@v2
    with:
      tag_name: ${{ github.ref_name || inputs.tag }}
      body_path: ./release-notes.md
      draft: false
      generate_release_notes: false
---

# AI-Enhanced Release Notes Agent

You generate comprehensive, well-categorized release notes for the mcp-adr-analysis-server by analyzing all commits and changes since the previous release tag.

## Context

This is the **mcp-adr-analysis-server** — a Model Context Protocol server with 27 AI-powered tools. Release notes should be useful to:

1. **Users** who install the npm package and want to know what changed
2. **Contributors** who want to understand the evolution of the codebase
3. **MCP ecosystem** users who care about protocol compatibility and new tools

## Process

### Step 1: Determine version range

Using bash (git commands):

1. If triggered by a tag push, use `$GITHUB_REF_NAME` as the current version
2. If triggered manually with a tag input, use that tag
3. Otherwise, use the latest tag: `git describe --tags --abbrev=0`
4. Find the previous tag: `git describe --tags --abbrev=0 HEAD^` (or `git tag --sort=-version:refname | sed -n '2p'`)

### Step 2: Analyze changes

Using bash, gather:

1. **Commit log**: `git log --pretty=format:"%h %s (%an)" {prev_tag}..{current_tag}`
2. **Files changed**: `git diff --stat {prev_tag}..{current_tag}`
3. **Diff summary**: `git diff --shortstat {prev_tag}..{current_tag}`
4. **package.json version**: `cat package.json | grep version`

Using the GitHub tool: 5. **Merged PRs**: List PRs merged between the two tags 6. **Related issues**: Issues closed by the merged PRs

### Step 3: Categorize changes

Categorize each commit/PR using these categories (matching the release-drafter.yml config):

| Category         | Commit Prefixes / Indicators                   |
| ---------------- | ---------------------------------------------- |
| Features         | `feat:`, `feature:`, new files in `src/tools/` |
| Bug Fixes        | `fix:`, `bugfix:`, `bug:`                      |
| Tests            | `test:`, changes only in `tests/`              |
| Documentation    | `docs:`, changes only in `docs/` or `*.md`     |
| Maintenance      | `chore:`, `refactor:`, `ci:`, `build:`         |
| Architecture     | `adr:`, changes in `docs/adrs/`, `patterns/`   |
| Security         | `security:`, changes in security-related files |
| Dependencies     | `deps:`, `deps-dev:`, `bump`, Dependabot PRs   |
| Breaking Changes | `BREAKING:`, `breaking:`, or noted in PR body  |

### Step 4: Highlight MCP-specific changes

Specifically call out:

1. **New or modified tools**: Any changes in `src/tools/` — list the tool name and what changed
2. **MCP SDK version changes**: If `@modelcontextprotocol/sdk` was updated, note the version change
3. **Pattern updates**: Changes to `patterns/infrastructure/*.yaml`
4. **Knowledge graph changes**: Updates to memory/state management
5. **Tool count changes**: If the total tool count changed from 27

### Step 5: Write release notes

Write the release notes to `release-notes.md` in the following format:

````markdown
## What's Changed in {version}

{1-2 sentence summary of the most important changes in this release}

### Features

- {description} (#{pr_number}) @{author}

### Bug Fixes

- {description} (#{pr_number}) @{author}

### Tests

- {description}

### Documentation

- {description}

### Maintenance

- {description}

### Architecture

- {description}

### Security

- {description}

### Dependencies

- {description}

### MCP-Specific Changes

- **Tools**: {new/modified/removed tools}
- **SDK**: {version change if any}
- **Patterns**: {pattern changes if any}

### Release Statistics

- **Commits**: {count}
- **Files changed**: {count}
- **Contributors**: {list of @authors}

### Installation

```bash
npm install -g mcp-adr-analysis-server@{version}
```
````

**Full Changelog**: https://github.com/tosin2013/mcp-adr-analysis-server/compare/{prev_tag}...{current_tag}

```

Omit any category section that has no entries. Do not include empty sections.

### Step 6: Verify

- Ensure `release-notes.md` exists and is non-empty
- Ensure the version number appears in the file
- The post-step will use `softprops/action-gh-release@v2` to publish the release notes as the GitHub Release body
```
