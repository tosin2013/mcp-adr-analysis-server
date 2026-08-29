#!/usr/bin/env bash
# Bulk-create GitHub issues + milestones for mcp-adr-analysis-server
# Generated 2026-04-21 per planning session "we-can-see-if-goofy-willow"
#
# USAGE:
#   1. Review the issues in this file first.
#   2. Run: bash scripts/create-github-issues.sh
#      (Requires: gh auth login + write access to tosin2013/mcp-adr-analysis-server)
#   3. This script is NOT idempotent — re-running creates duplicate issues.
#
# Repository: tosin2013/mcp-adr-analysis-server
# Milestones created: v2.6, v3.0
#
# NOTE: Uses `IFS='' read -r -d '' VAR <<'EOF'` to assign multi-line bodies.
# This pattern is bash 3.2-safe (macOS default bash) and avoids the known
# bug with apostrophes inside `$(cat <<'EOF')` command substitution.
set -eo pipefail

REPO="tosin2013/mcp-adr-analysis-server"

echo "==> Creating milestones..."

gh api "repos/${REPO}/milestones" --method POST \
  -f title="v2.6" \
  -f state="open" \
  -f description="Near-term release (~2 weeks). Anchor: merge CE-MCP (ADR-014), land docs-reconciliation, unblock skipped interactive-ADR tests, resolve ecosystem-context TODO." \
  -f due_on="2026-05-05T00:00:00Z" || echo "   (v2.6 may already exist; continuing)"

gh api "repos/${REPO}/milestones" --method POST \
  -f title="v3.0" \
  -f state="open" \
  -f description="Major release (~6-8 weeks). Anchor: MCP Tasks integration (ADR-020), dependency-injection refactor, Vitest migration complete." \
  -f due_on="2026-06-16T00:00:00Z" || echo "   (v3.0 may already exist; continuing)"

echo "==> Creating Category A issues (current phase)..."

# ============================================================
# CATEGORY A — CURRENT PHASE ISSUES
# ============================================================

# A1
IFS='' read -r -d '' BODY <<'EOF' || true
The project has strong release **automation** (OIDC publish, auto-release on merge, release drafter) but no release **planning**: zero milestones, no `ROADMAP.md`, and four unreconciled plan docs at the repo root (`IMPLEMENTATION-PLAN.md`, `DOCUMENTATION-UPDATE-PLAN.md`, `DOCUMENTATION_IMPROVEMENT_PLAN.md`, `DOCUSAURUS_MIGRATION.md`). In-flight ADRs (014 CE-MCP, 020 MCP Tasks) have no target version. This epic establishes the planning backbone so the 18 tracked ADRs and active feature branches map cleanly to shipped releases.

This is the anchor issue for the v2.6/v3.0 release cycle. Sub-issues will reference this epic via `Related:`.

## Acceptance Criteria
- [ ] Milestones `v2.6` (due ~2 wks) and `v3.0` (due ~6-8 wks) exist on GitHub with written scope descriptions
- [ ] `RELEASES.md` published at repo root documenting cadence (major/minor/patch triggers, LTS policy, deprecation windows)
- [ ] All four root-level plan docs consolidated into `docs/planning/` with a single `docs/planning/README.md` index (see A8)
- [ ] Every open feature branch has a milestone assignment on its tracking issue
- [ ] `README.md` links to the roadmap milestone page
- [ ] `CONTRIBUTING.md` gains a "Release process" section pointing to `RELEASES.md`

**Related:** ADR-014, ADR-020, A2–A8, C3
EOF
gh issue create --repo "$REPO" \
  --title "[EPIC] Establish release planning: milestones, roadmap, and docs reconciliation" \
  --label "epic,planning,roadmap,release-pipeline,priority:high,meta" \
  --milestone "v2.6" \
  --body "$BODY"

# A2
IFS='' read -r -d '' BODY <<'EOF' || true
The `feature/ce-mcp-implementation` branch implements Claude-Enriched MCP per ADR-014 and is near-merge. It includes JSON-RPC protocol compliance fixes, console→stderr logging redirection, and directory-traversal hardening. The branch must be rebased, reviewed, and merged for v2.6.

A migration playbook is already drafted at `docs/how-to-guides/ce-mcp-migration-playbook.md` (currently untracked — see B4).

## Acceptance Criteria
- [ ] `feature/ce-mcp-implementation` rebased onto current `main`
- [ ] All tests pass, including new CE-MCP compliance tests
- [ ] `docs/adrs/adr-014-ce-mcp-architecture.md` status updated from "Proposed" to "Accepted"
- [ ] Migration playbook (B4) published on docs site
- [ ] `CHANGELOG.md` gets a v2.6 entry documenting CE-MCP
- [ ] Post-merge smoke test: MCP Inspector connects without JSON-RPC violations

**Related:** ADR-014, A1, B4
EOF
gh issue create --repo "$REPO" \
  --title "Ship CE-MCP architecture (ADR-014): merge feature/ce-mcp-implementation" \
  --label "enhancement,architecture,priority:high,mcp-tools,component:tools" \
  --milestone "v2.6" \
  --body "$BODY"

# A3
IFS='' read -r -d '' BODY <<'EOF' || true
`feature/mcp-tasks-integration` implements native MCP Tasks support per ADR-020. This enables async/long-running tools, with `interactive_adr_planning` and `adr_validation` as the high-priority adopters. ADR-020 was waiting on upstream MCP protocol maturity; target v3.0 once the upstream spec stabilizes.

## Acceptance Criteria
- [ ] Upstream MCP Tasks spec pinned to a stable version in `@modelcontextprotocol/sdk`
- [ ] `interactive_adr_planning` tool refactored to use Tasks protocol (long-running session support)
- [ ] `adr_validation` tool refactored to use Tasks protocol
- [ ] `src/utils/task-persistence.ts` (currently `@experimental`) promoted to stable with full tests
- [ ] Migration notes added to `docs/how-to-guides/`
- [ ] `docs/adrs/adr-020-*.md` status updated to "Accepted"
- [ ] Breaking-change note in `CHANGELOG.md` with migration steps

**Related:** ADR-020, A1, A4
EOF
gh issue create --repo "$REPO" \
  --title "Integrate MCP Tasks protocol (ADR-020): merge feature/mcp-tasks-integration" \
  --label "enhancement,architecture,priority:high,mcp-tools,mcp-validation" \
  --milestone "v3.0" \
  --body "$BODY"

# A4
IFS='' read -r -d '' BODY <<'EOF' || true
`feature/dependency-injection-refactor` introduces a DI container so tools can receive their dependencies (AI executor, cache, knowledge graph manager) rather than importing them directly. This unblocks proper unit test mocking — currently the filesystem-heavy tests in A6/A7 are skipped because of tight coupling.

Target v3.0 as a breaking-change release for the internal tool API surface.

## Acceptance Criteria
- [ ] DI container implemented (see branch)
- [ ] All tools in `src/tools/` migrated to constructor injection
- [ ] `src/utils/ai-executor.ts`, `src/utils/cache.ts`, `src/utils/knowledge-graph-manager.ts` exposed as injectable services
- [ ] Previously skipped tests in A6/A7 become un-skippable (no real filesystem required)
- [ ] Internal API changes documented in `CHANGELOG.md` with migration guide
- [ ] All integration tests pass

**Related:** ADR-018, A1, A6, A7
EOF
gh issue create --repo "$REPO" \
  --title "Complete dependency-injection refactor across tools and utils" \
  --label "refactoring,technical-debt,priority:medium,component:tools,architecture" \
  --milestone "v3.0" \
  --body "$BODY"

# A5
IFS='' read -r -d '' BODY <<'EOF' || true
`src/index.ts:5134` has a TODO: "implement context integration for ecosystem analysis". This blocks the ecosystem-analysis tool from consuming cross-repo context (e.g. related ADRs from sibling projects). Scope the minimal implementation that unblocks the ecosystem tool for v2.6.

## Acceptance Criteria
- [ ] Read `src/index.ts:5134` and determine the concrete context-integration hook required
- [ ] Implement it (likely wiring `knowledge-graph-manager` into the ecosystem tool context builder)
- [ ] TODO comment removed
- [ ] Unit test added covering the ecosystem tool with populated context
- [ ] Behavior documented in `docs/reference/` for the ecosystem tool

**Related:** A1
EOF
gh issue create --repo "$REPO" \
  --title "Implement ecosystem context integration (src/index.ts:5134 TODO)" \
  --label "enhancement,priority:medium,component:integration,mcp-tools" \
  --milestone "v2.6" \
  --body "$BODY"

# A6
IFS='' read -r -d '' BODY <<'EOF' || true
`tests/tools/interactive-adr-planning-tool.test.ts` has multiple `describe.skip` / `it.skip` blocks covering session creation, custom paths, and permissions. The tests were skipped because of filesystem mocking issues. Replace real-filesystem assumptions with `memfs` or the DI-injected filesystem from A4.

## Acceptance Criteria
- [ ] All `.skip` blocks in `tests/tools/interactive-adr-planning-tool.test.ts` are active
- [ ] Tests use `memfs` (or DI-injected fs from A4) — no real filesystem writes during test runs
- [ ] All tests pass locally and in CI
- [ ] Coverage for `src/tools/interactive-adr-planning-tool.ts` rises to ≥85% (project baseline)

**Related:** A1, A4
EOF
gh issue create --repo "$REPO" \
  --title "Un-skip interactive_adr_planning tests (filesystem mocking)" \
  --label "testing,tests,priority:medium,technical-debt,component:tools" \
  --milestone "v2.6" \
  --body "$BODY"

# A7
IFS='' read -r -d '' BODY <<'EOF' || true
`tests/tools/rule-generation-tool.test.ts:142` has a skipped test: "should generate rules from patterns" — blocked by filesystem dependencies and marked for the integration-test tier. Either move it into a proper integration-test harness, or refactor it to use the DI filesystem from A4.

## Acceptance Criteria
- [ ] Decision documented: integration-test tier vs DI-mocked unit test
- [ ] Test implemented accordingly and enabled
- [ ] CI runs the new test in the right tier (`npm run test:integration` or `npm test`)
- [ ] `scripts/test-infrastructure.sh` updated if needed

**Related:** A4
EOF
gh issue create --repo "$REPO" \
  --title "Un-skip rule-generation-tool tests (integration harness)" \
  --label "testing,tests,priority:medium,technical-debt,component:tools" \
  --milestone "v3.0" \
  --body "$BODY"

# A8
IFS='' read -r -d '' BODY <<'EOF' || true
Four separate planning docs live at the repo root and overlap: `IMPLEMENTATION-PLAN.md` (19KB), `DOCUMENTATION_IMPROVEMENT_PLAN.md` (9.6KB), `DOCUMENTATION-UPDATE-PLAN.md` (10.7KB), `DOCUSAURUS_MIGRATION.md` (8KB). This clutters the repo root and makes it unclear which doc is authoritative. Move them into a single `docs/planning/` tree with a README that maps each doc to its current status (active / completed / superseded by ADR-N).

## Acceptance Criteria
- [ ] `docs/planning/` directory created
- [ ] All four docs moved there, each with a status header: **Active** / **Completed** / **Superseded by ADR-N**
- [ ] `docs/planning/README.md` index explains the doc taxonomy
- [ ] Broken links updated across the repo (search for references to old paths)
- [ ] Root-level `*.md` clutter reduced to: `README.md`, `CHANGELOG.md`, `CONTRIBUTING.md`, `CODE_OF_CONDUCT.md`, `LICENSE`, `SECURITY.md` (from C6)
- [ ] Docusaurus sidebar updated if the docs appear on the site

**Related:** A1, B1, B2
EOF
gh issue create --repo "$REPO" \
  --title "Consolidate root-level plan docs into docs/planning/" \
  --label "documentation,technical-debt,priority:medium,docs-site" \
  --milestone "v2.6" \
  --body "$BODY"

echo "==> Creating Category B issues (contributor-friendly backlog)..."

# ============================================================
# CATEGORY B — CONTRIBUTOR-FRIENDLY BACKLOG
# ============================================================

# B1
IFS='' read -r -d '' BODY <<'EOF' || true
Part of the Docusaurus migration tracked in `DOCUMENTATION-UPDATE-PLAN.md`. Port the existing `docs/tutorials/` content to the Docusaurus structure, ensuring frontmatter, sidebar ordering, and cross-links work. This is a great first-time contribution — touches documentation only, no TypeScript required.

## Acceptance Criteria
- [ ] All files in `docs/tutorials/` have valid Docusaurus frontmatter (`id`, `title`, `sidebar_position`)
- [ ] Sidebar configuration (`sidebars.js` or equivalent) includes the tutorials section
- [ ] All internal links resolve correctly (`npm run docs:build` passes without broken-link warnings)
- [ ] `scripts/check-docs-links.sh` passes
- [ ] Screenshots / diagrams (if any) are referenced with correct paths

**Related:** A8, DOCUMENTATION-UPDATE-PLAN.md
EOF
gh issue create --repo "$REPO" \
  --title "Port tutorials section to Docusaurus" \
  --label "good first issue,documentation,docs-site,component:migration" \
  --milestone "v2.6" \
  --body "$BODY"

# B2
IFS='' read -r -d '' BODY <<'EOF' || true
Companion to B1. Port `docs/how-to-guides/` to the Docusaurus structure. Can be picked up by a different contributor in parallel with B1.

## Acceptance Criteria
- [ ] All files in `docs/how-to-guides/` have valid Docusaurus frontmatter
- [ ] Sidebar includes the how-to-guides section
- [ ] Internal links resolve (`npm run docs:build` passes)
- [ ] `scripts/check-docs-links.sh` passes
- [ ] `docs/how-to-guides/ce-mcp-migration-playbook.md` included (see B4)

**Related:** A8, B1, B4
EOF
gh issue create --repo "$REPO" \
  --title "Port how-to-guides section to Docusaurus" \
  --label "good first issue,documentation,docs-site,component:migration" \
  --milestone "v2.6" \
  --body "$BODY"

# B3
IFS='' read -r -d '' BODY <<'EOF' || true
`CHANGELOG.md` has sparse entries — recent entries are one-liners (e.g. v2.0.22, v2.0.24) and many versions between v2.0.x and the current v2.5.0 have no entry at all. Walk the git log, group commits by version, and write a proper Keep-A-Changelog-format entry for each release. Great onboarding task: forces the contributor to understand the project history.

## Acceptance Criteria
- [ ] Each version tag v2.0.x → v2.5.0 has a `CHANGELOG.md` section
- [ ] Sections follow [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) format: `### Added / Changed / Deprecated / Removed / Fixed / Security`
- [ ] Breaking changes are clearly flagged
- [ ] Release drafter config (`.github/release.yml` or similar) updated so future versions stay consistent
- [ ] Top of file links to `RELEASES.md` (from C3) once that exists

**Related:** A1, C3
EOF
gh issue create --repo "$REPO" \
  --title "Backfill CHANGELOG.md from v2.0.x through v2.5.0" \
  --label "good first issue,documentation" \
  --milestone "v2.6" \
  --body "$BODY"

# B4
IFS='' read -r -d '' BODY <<'EOF' || true
A complete CE-MCP migration playbook exists at `docs/how-to-guides/ce-mcp-migration-playbook.md` but is currently untracked (see `git status`). It demonstrates the 60-70% token reduction pattern for converting legacy OpenRouter tools to orchestration directives. Commit it, wire it into Docusaurus, and link it from the CE-MCP ADR.

## Acceptance Criteria
- [ ] `docs/how-to-guides/ce-mcp-migration-playbook.md` committed
- [ ] Added to Docusaurus sidebar under "How-to guides"
- [ ] Linked from `docs/adrs/adr-014-*.md`
- [ ] Table of contents / section anchors work in the published site
- [ ] README references the playbook in the CE-MCP section

**Related:** A2, ADR-014
EOF
gh issue create --repo "$REPO" \
  --title "Publish CE-MCP migration playbook to docs site" \
  --label "good first issue,documentation,docs-site,mcp-tools" \
  --milestone "v2.6" \
  --body "$BODY"

# B5
IFS='' read -r -d '' BODY <<'EOF' || true
The `perform_research` tool is powerful but under-documented. `DOCUMENTATION-UPDATE-PLAN.md` flags it as high-priority. Write a `docs/tutorials/quickstart-perform_research.md` that walks a new user from zero to first-result in under 10 minutes, with a runnable example and expected output.

## Acceptance Criteria
- [ ] `docs/tutorials/quickstart-perform_research.md` exists
- [ ] Walks through: setup (env vars), first invocation, interpreting output, common flags
- [ ] Includes a runnable example with expected output (copy-pasteable)
- [ ] Links to the `perform_research` reference doc
- [ ] Tested with a fresh clone — a new user can reproduce the tutorial end-to-end
- [ ] Linked from README quickstart section

**Related:** DOCUMENTATION-UPDATE-PLAN.md, A1
EOF
gh issue create --repo "$REPO" \
  --title "Write quickstart tutorial for perform_research tool" \
  --label "help wanted,documentation,docs-site,research" \
  --milestone "v2.6" \
  --body "$BODY"

# B6
IFS='' read -r -d '' BODY <<'EOF' || true
`feature/vitest-migration` is in progress. Help finish converting remaining Jest tests to Vitest. `scripts/migrate-to-vitest.sh` exists as a helper. Scope the remaining files and land them branch-by-branch.

## Acceptance Criteria
- [ ] All `tests/**/*.test.ts` files run under Vitest
- [ ] `jest` + `ts-jest` removed from `package.json` dependencies
- [ ] `npm test` invokes Vitest (updated script in `package.json`)
- [ ] CI workflows (`.github/workflows/test.yml`) updated
- [ ] Coverage reports still generated (Vitest `c8`/`v8` provider)
- [ ] All existing tests pass, no skipped tests introduced by migration

**Related:** A1, A4
EOF
gh issue create --repo "$REPO" \
  --title "Complete Jest → Vitest migration" \
  --label "help wanted,testing,tests,refactoring,technical-debt" \
  --milestone "v3.0" \
  --body "$BODY"

# B7 -- HISTORICAL. This block filed #752, closed as obsolete on 2026-08-29:
# src/utils/llm-artifact-detector.ts had zero importers and was retired under #1540.
# This script is not idempotent and has already run; the text below is left as a
# record of what was filed, not as work to re-file.
IFS='' read -r -d '' BODY <<'EOF' || true
`src/utils/llm-artifact-detector.ts` is experimental: it detects draft docs (`draft_*.md`, `wip_*.md`) and experimental code markers. The functionality is useful for CI gates but needs hardening (tests, clear API, config docs) before it can be treated as stable.

## Acceptance Criteria
- [ ] `@experimental` tag removed from the module
- [ ] Unit test coverage ≥90% for the detector
- [ ] Public API documented in `docs/reference/`
- [ ] Configuration options (patterns, directories) exposed via a typed config object
- [ ] At least one CI workflow uses the detector as a gate
- [ ] Breaking-change note in `CHANGELOG.md` if the API shape changed

**Related:** A1
EOF
gh issue create --repo "$REPO" \
  --title "Promote llm-artifact-detector out of experimental" \
  --label "help wanted,enhancement,ai-executor" \
  --milestone "v3.0" \
  --body "$BODY"

echo "==> Creating Category C issues (ecosystem growth / NEW)..."

# ============================================================
# CATEGORY C — ECOSYSTEM GROWTH (NEW)
# ============================================================

# C1
IFS='' read -r -d '' BODY <<'EOF' || true
The repo has no `.github/ISSUE_TEMPLATE/` directory. New issues have no structured prompt, which produces inconsistent reports and slows triage. Add standard templates so external contributors know what information to provide.

## Acceptance Criteria
- [ ] `.github/ISSUE_TEMPLATE/bug_report.yml` with fields: MCP client, server version, reproduction steps, expected/actual, logs
- [ ] `.github/ISSUE_TEMPLATE/feature_request.yml` with fields: problem, proposed solution, alternatives, additional context
- [ ] `.github/ISSUE_TEMPLATE/documentation.yml` for docs-only issues
- [ ] `.github/ISSUE_TEMPLATE/config.yml` with `blank_issues_enabled: false` and links to Discussions / Security advisories
- [ ] Templates auto-apply relevant labels (`bug`, `enhancement`, `documentation`)
- [ ] Verified by opening a test issue through each template

**Related:** A1, C2
EOF
gh issue create --repo "$REPO" \
  --title "Add GitHub issue templates (bug, feature, docs)" \
  --label "good first issue,developer-experience,documentation,tooling" \
  --milestone "v2.6" \
  --body "$BODY"

# C2
IFS='' read -r -d '' BODY <<'EOF' || true
The repo has 100+ labels with several confusing duplicates:

- `priority:high` / `priority-high` / `high` / `high-priority` — four labels for the same concept
- `priority:medium` / `priority-medium`
- `tech-debt` / `technical-debt`
- `ci` / `ci-cd` / `ci/cd`
- `tools` / `tooling`
- `tests` / `testing`
- `good first issue` / `good-first-issue`

Introduce `.github/labels.yml` as the source of truth and a sync workflow (e.g. `EndBug/label-sync`) that enforces it. Migrate legacy labels to the canonical form.

## Acceptance Criteria
- [ ] `.github/labels.yml` created with a curated, documented taxonomy (priority, type, component, status, onboarding)
- [ ] `.github/workflows/label-sync.yml` runs on push to main and on a weekly cron
- [ ] Existing duplicate labels migrated: issues/PRs re-labeled to canonical form, old labels deleted
- [ ] Canonical picks documented: `priority:high`, `technical-debt`, `ci-cd`, `tooling`, `testing`, `good first issue` (retain the GitHub-reserved spacing)
- [ ] `CONTRIBUTING.md` "Labels" section added referencing `labels.yml`

**Related:** A1, C1
EOF
gh issue create --repo "$REPO" \
  --title "Add labels.yml + label-sync workflow; consolidate duplicate labels" \
  --label "help wanted,developer-experience,tooling,technical-debt" \
  --milestone "v2.6" \
  --body "$BODY"

# C3
IFS='' read -r -d '' BODY <<'EOF' || true
Pairs with the release-planning epic (A1). Write `RELEASES.md` documenting the project release cadence, version policy, and deprecation windows so contributors know when to expect releases and how to propose breaking changes.

## Acceptance Criteria
- [ ] `RELEASES.md` at repo root covers:
  - Release cadence (major: ~quarterly, minor: monthly, patch: as-needed)
  - Semver policy (what triggers major/minor/patch)
  - Deprecation window (≥1 minor version before removal)
  - LTS policy (if any)
  - How to request a backport
  - How the auto-release pipeline + MCP Registry sync work (see `.github/workflows/auto-release-on-merge.yml`, `publish.yml`, `publish-mcp-registry.yml`)
- [ ] Linked from `README.md`, `CONTRIBUTING.md`, `CHANGELOG.md`
- [ ] Cross-linked from the v2.6 and v3.0 milestone descriptions

**Related:** A1
EOF
gh issue create --repo "$REPO" \
  --title "Publish RELEASES.md cadence document" \
  --label "documentation,planning,release-pipeline,priority:medium" \
  --milestone "v2.6" \
  --body "$BODY"

# C4
IFS='' read -r -d '' BODY <<'EOF' || true
Today, evaluating the server requires: installing Node 20+, cloning, npm install, configuring env vars, pointing an MCP client at it. Lower the friction: add a `docker-compose.yml` in `examples/demo/` that starts the server with a sample project mounted and an MCP Inspector attached. Goal: single `docker compose up` → working demo in under 2 minutes.

## Acceptance Criteria
- [ ] `examples/demo/docker-compose.yml` starts the server with:
  - A sample project mounted at `/workspace`
  - Example `docs/adrs/` pre-populated
  - OpenRouter disabled (prompt mode) by default — no API key required
- [ ] Optional `OPENROUTER_API_KEY` env override documented
- [ ] `examples/demo/README.md` with one-command quickstart
- [ ] `Dockerfile` uses a multi-stage build, final image under 200MB
- [ ] Linked from main `README.md` quickstart section
- [ ] Tested on macOS + Linux

**Related:** C5
EOF
gh issue create --repo "$REPO" \
  --title "Add Docker Compose demo mode for zero-config evaluation" \
  --label "good first issue,enhancement,developer-experience,infrastructure" \
  --milestone "v3.0" \
  --body "$BODY"

# C5
IFS='' read -r -d '' BODY <<'EOF' || true
VS Code is a major MCP client (via Cline, Continue, etc.) but the repo has no dedicated walkthrough for wiring the server into VS Code. Write a short guide + ship example `.vscode/launch.json` / `.vscode/mcp.json` snippets contributors can copy.

## Acceptance Criteria
- [ ] `docs/how-to-guides/vscode-integration.md` walks through setup for VS Code + Cline (and/or Continue)
- [ ] Example configs at `examples/vscode/mcp.json` and `examples/vscode/launch.json`
- [ ] Screenshots (non-animated, checked into `docs/assets/vscode/`) for key steps
- [ ] Tested by at least one reviewer on a fresh VS Code install
- [ ] Linked from main README "Integrations" section

**Related:** C4
EOF
gh issue create --repo "$REPO" \
  --title "Add VS Code extension walkthrough and launch.json examples" \
  --label "good first issue,documentation,developer-experience,integration" \
  --milestone "v3.0" \
  --body "$BODY"

# C6
IFS='' read -r -d '' BODY <<'EOF' || true
The repo has no `SECURITY.md`. GitHub surfaces this as a community-health warning and it leaves contributors unclear on how to responsibly disclose vulnerabilities. Add a `SECURITY.md` with disclosure instructions, supported versions, and response SLAs.

## Acceptance Criteria
- [ ] `SECURITY.md` at repo root includes:
  - Supported versions table (aligned with `RELEASES.md` from C3)
  - Private disclosure process (GitHub Security Advisories preferred, with email fallback)
  - Expected response time (e.g. acknowledge within 72h, triage within 7 days)
  - PGP key or contact form if applicable
- [ ] GitHub "Security" tab surfaces the policy (verify in repo settings)
- [ ] Linked from `README.md` and `CONTRIBUTING.md`

**Related:** C3
EOF
gh issue create --repo "$REPO" \
  --title "Add SECURITY.md vulnerability disclosure policy" \
  --label "good first issue,security,documentation" \
  --milestone "v2.6" \
  --body "$BODY"

# C7
IFS='' read -r -d '' BODY <<'EOF' || true
The server exposes ~73 MCP tools but README discovery is poor — users do not know what is interesting to try first. Add a "Tool Spotlight" section showcasing 5-6 high-value tools (e.g. `adr_suggestion`, `smart_score`, `perform_research`, `interactive_adr_planning`, `deployment_readiness`) with a one-paragraph pitch and a copy-pasteable invocation example for each.

## Acceptance Criteria
- [ ] README has a new "Tool Spotlight" section after the Quickstart
- [ ] 5-6 tools featured, each with: name, one-paragraph use case, copy-pasteable JSON-RPC example, expected output snippet
- [ ] Each tool links to its full reference doc under `docs/reference/`
- [ ] Examples verified: running each produces the documented output (with prompt mode, no API key needed)
- [ ] Table of contents updated

**Related:** B5
EOF
gh issue create --repo "$REPO" \
  --title "Add Tool Spotlight section to README with runnable examples" \
  --label "good first issue,documentation,developer-experience,mcp-tools" \
  --milestone "v3.0" \
  --body "$BODY"

echo "==> Done. Created 2 milestones + 22 issues."
echo "Review them at: https://github.com/${REPO}/issues"
