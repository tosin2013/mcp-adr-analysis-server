# mcp-adr-analysis-server Constitution

<!--
Sync impact: 1.1.0 -> 1.2.0 (MINOR: rule added).
  1.0.0  ratified 2026-10-28 as approved by the owner.
  1.1.0  adds "Specs and ADRs", which links Spec Kit to docs/adrs/.
  1.2.0  adds ROADMAP.md as the roadmap of record (Development workflow).
         Also updated: AGENTS.md, .github/workflows/roadmap-drift.yml
  Templates updated: .specify/templates/overrides/spec-template.md,
                     .specify/templates/overrides/plan-template.md
  Also updated: AGENTS.md, .github/ISSUE_TEMPLATE/agent-ruling.yml
-->

Rules every agent (and every human) follows when changing this repository. Each one cites
the code or decision it comes from. Where this file and a ruling issue conflict, stop and
ask on the issue.

## Core Principles

### I. The owner decides, in writing

Agents measure, research and argue; the owner decides. A decision exists only when it is
written down: an ADR for architecture or tool-surface changes, or an Agent ruling issue
labelled `agent-ready` for builder work. Changing an Accepted decision takes a superseding
ADR that says why, never a quiet edit or deletion (ADR-023, ADR-025, ADR-026; `AGENTS.md`).
Anything a ruling doesn't answer is a stop, not a guess.

### II. Claims are measured and reproducible

Every number in an ADR, spec, PR or changelog comes with the command that reproduces it,
measured on the environment that gates (CI, not a laptop, when they differ). Sizes, test
counts and coverage come from CI or the grader, never from an agent's own notes. (ADR-023
and ADR-026 measurement tables; the coverage floor note in `vitest.config.ts`.)

### III. The MCP tool contract is a public API

Tools return `{ content: [{ type: 'text', text }], isError? }`. The tools served over the
wire (`MCP_TOOL_SCHEMAS` in `src/tools/mcp-tool-schemas.ts`, `TOOL_CATALOG` in
`src/tools/tool-catalog.ts`) change only under an ADR or a ruling that says so. Removing or
renaming a tool, or changing its input or output shape, is a breaking change: it goes under
`### ⚠️ Breaking` in `CHANGELOG.md`. Sensitive content goes through the masking in
`src/utils/output-masking.ts` (ADR-004).

### IV. Strict TypeScript, ESM, and green gates

Strict TypeScript and ESM throughout (`tsconfig.json`). A change is mergeable only when
the required checks (`build`, `lint`, `test (20)`, `test (22)`) pass. Coverage thresholds
in `vitest.config.ts` only move up; they never move down to fit a real drop. The test
typecheck error count only moves down (`.tsc-test-baseline`).

### V. Builder-written tests alone never mean "done"

For agent-built changes, "done" is decided by checks the builder never saw: acceptance
tests written from the ruling's given/when/then, added as one separate grader commit under
`acceptance/issue-<N>/`, run by `.github/workflows/acceptance-grader.yml`, along with the
check that every base test ID still exists. Spec, tests and code land together. Existing
tests change only in the exact ways the ruling allows.

## Constraints and exceptions

- **Secrets:** no credentials in the repo, in prompts, or in a builder's environment. An
  unattended builder runs with at most one dedicated, spend-capped model key, and no
  GitHub token, SSH key or cloud credential.
- **Dependabot auto-merge (exception to "a human merges every PR"):**
  `.github/workflows/dependabot-auto-merge.yml` may merge Dependabot PRs only for non-major
  updates that are not direct production dependencies and not
  `@modelcontextprotocol/sdk`, and only through GitHub auto-merge behind the required
  checks. Everything else, every agent-built PR included, is merged by a human.

## Specs and ADRs

ADRs in `docs/adrs/` (indexed in `docs/adrs/README.md`, MADR format per ADR-022) are the
decisions; Spec Kit specs are the work that carries them out. The two are linked both ways.

- **Every spec names its governing ADRs** in its `Governing Decisions` section: each ADR
  with its status and the specific part the spec relies on. "None apply" is a valid
  answer only if it says why.
- **A spec never contradicts an Accepted ADR.** If it has to, stop: a superseding ADR
  comes first (Principle I). ADRs marked _Superseded in part_ bind only in their
  surviving parts; say which part.
- **A Proposed ADR is context, not a constraint.** A spec that depends on one names it as
  a blocker, and no task implements that decision until the owner accepts it.
- **New decisions become ADRs, not plan notes.** When `/speckit-plan` makes a decision
  that changes the tool surface, a public contract, a dependency strategy, or a
  cross-cutting pattern, it is drafted as a new MADR ADR with `status: proposed` at the
  next number after the highest in the index (skipped numbers stay unused, as the index
  explains for ADR-016), added to the index, and linked from `plan.md`. The owner decides
  it. Smaller choices stay in `research.md`.
- **ADRs link back.** When a spec implements an ADR, the ADR's `More Information` section
  gets the spec path in the same PR. A human or the planning agent adds that link, never a
  builder.

## Development workflow

- Agent-built changes follow Spec Kit in order: constitution, specify, clarify, plan,
  tasks, analyze (HIGH findings fixed), implement. One command per step, with a review
  after each. Builder-loop rules are in `AGENTS.md`.
- `ROADMAP.md` is the roadmap of record: it names and orders features, and each spec's
  `Input:` line cites its row. GitHub milestones admit work; status lives only in
  `ROADMAP.md`. The owner edits it; a builder loop never does.
- Dependency bumps, config changes, typos and prototypes get a normal PR, not a spec.
- Before a release, update `CHANGELOG.md` (Keep a Changelog 1.1.0) and, if categories
  change, `.github/release-drafter.yml`.

## Governance

This constitution overrides habit, not ADRs: if they disagree, the ADR wins until a new
ADR or an amendment settles it. Amendments go through a PR the owner approves, with a
version bump: MAJOR when a rule is removed or reversed, MINOR when one is added, PATCH
for wording.

**Version**: 1.2.0 | **Ratified**: 2026-10-28 | **Last Amended**: 2026-10-28
