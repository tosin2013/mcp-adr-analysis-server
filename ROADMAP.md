# Roadmap

The roadmap of record for this repository, kept as the
[Invoice Exception Desk PLAYBOOK](https://raw.githubusercontent.com/tosin2013/invoice-exception-desk/main/PLAYBOOK.md)
describes in "PM: plan the roadmap first". It names and orders features; it doesn't design
them. Specs (`specs/NNN-*/`) design them, and ADRs (`docs/adrs/`) are the decisions they
carry out.

- **This file is the record** of each row's scope, outcome, order and status. Issues and
  PRs are linked from it; boards and milestone pages are views of it.
- **GitHub milestones admit work.** `.repo-governor.json` reads the milestone as the
  admission signal, so each row's Milestone column names the milestone its issues sit in.
  A row with no milestone is not admitted yet.
- **The owner edits this file.** The operator moves a row to `building` when a build
  starts. A builder loop never edits it (`AGENTS.md`).

## Destination (6–12 months)

Set by the owner on 2026-10-28. It's a direction, not a delivery promise.

1. **A small, trusted tool surface.** The server advertises only the supported surface
   (ADR-023), and further consolidation toward about 12 tools is decided from measured
   usage, not guesses (#1675).
2. **Wider adoption.** People install the server from the places they already look
   (Claude Desktop via an MCPB bundle, the main MCP directories) and get a working first
   call from the README alone.

## Rows

| ID  | Feature                                    | One-line scope (in / out)                                                                                                                                           | Outcome                                                                                  | Depends on | Order | Milestone                       | Status                                                          | Spec dir         | Issue / PR                                                                                                                                                                                                                                                                                                                                                                                             |
| --- | ------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------- | ---------- | ----- | ------------------------------- | --------------------------------------------------------------- | ---------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| R0  | v3.0 cleanup                               | In: AI-layer disposition (ADR-021), supported surface set (ADR-023), pattern engine retired (ADR-025), host-native tools off the wire. Out: everything below.       | The decisions that every later row builds on are Accepted and carried out.               | —          | 0     | v3.0; CE-MCP migration; Cleanup | done                                                            | — (pre-Spec Kit) | [PR #1472](https://github.com/tosin2013/mcp-adr-analysis-server/pull/1472), [PR #1474](https://github.com/tosin2013/mcp-adr-analysis-server/pull/1474), [PR #1556](https://github.com/tosin2013/mcp-adr-analysis-server/pull/1556), [PR #1674](https://github.com/tosin2013/mcp-adr-analysis-server/pull/1674), [commit 76038c7](https://github.com/tosin2013/mcp-adr-analysis-server/commit/76038c74) |
| R1  | Finish the ADR-023 surface                 | In: unadvertise `smart_score` (stub callable one release), sunset deprecated aliases. Out: deleting stubs (a later Cleanup admission), consolidation (R5).          | `tools/list` returns only the supported surface; no deprecated alias is advertised.      | R0         | 1     | v3.1                            | building                                                        | —                | [#1827](https://github.com/tosin2013/mcp-adr-analysis-server/issues/1827) (pilot ruling), [#1584](https://github.com/tosin2013/mcp-adr-analysis-server/issues/1584), [#1679](https://github.com/tosin2013/mcp-adr-analysis-server/issues/1679)                                                                                                                                                         |
| R2  | Usage evidence for consolidation (ADR-024) | In: decide how usage is measured (opt-in, privacy), collect it, draft ADR-024. Out: cutting any tool (R5).                                                          | The owner can rule on consolidation from measured data.                                  | R1         | 2     | v3.1                            | planned                                                         | —                | [#1675](https://github.com/tosin2013/mcp-adr-analysis-server/issues/1675)                                                                                                                                                                                                                                                                                                                              |
| R3  | Distribution channels                      | In: MCPB bundle for Claude Desktop, listings in the main MCP directories. Out: new transports, hosted service.                                                      | A user can install the server from Claude Desktop or a directory without cloning or npm. | R1         | 3     | Distribution Channels v1        | planned                                                         | —                | [#1742](https://github.com/tosin2013/mcp-adr-analysis-server/issues/1742), [#1743](https://github.com/tosin2013/mcp-adr-analysis-server/issues/1743)                                                                                                                                                                                                                                                   |
| R4  | First-call onboarding                      | In: README tool spotlight, zero-config demo, `perform_research` quickstart, how drift detection works, coexistence with other ADR servers. Out: docs-site redesign. | A new user gets a working first tool call from the README alone.                         | R1         | 4     | Messaging and discovery         | planned                                                         | —                | [#759](https://github.com/tosin2013/mcp-adr-analysis-server/issues/759), [#756](https://github.com/tosin2013/mcp-adr-analysis-server/issues/756), [#750](https://github.com/tosin2013/mcp-adr-analysis-server/issues/750), [#1705](https://github.com/tosin2013/mcp-adr-analysis-server/issues/1705), [#1676](https://github.com/tosin2013/mcp-adr-analysis-server/issues/1676)                        |
| R5  | Consolidate toward about 12 tools          | One line until R2 lands.                                                                                                                                            | The advertised surface matches what ADR-024 decides.                                     | R2         | 5     | —                               | planned                                                         | —                | —                                                                                                                                                                                                                                                                                                                                                                                                      |
| R6  | Deterministic research-to-ADR links        | One line: research output links to an ADR, checkable in CI.                                                                                                         | Every research file names the ADR it informs.                                            | R0         | 6     | v3.1                            | planned                                                         | —                | [#1527](https://github.com/tosin2013/mcp-adr-analysis-server/issues/1527)                                                                                                                                                                                                                                                                                                                              |
| R7  | Tool-call best-practices conformance       | One line: carry out ADR-026 once it's decided.                                                                                                                      | Tools conform to the practices ADR-026 accepts.                                          | R1         | 7     | —                               | blocked — ADR-026 is Proposed; reopen when the owner accepts it | —                | [ADR-026](docs/adrs/adr-026-tool-call-best-practices-conformance.md)                                                                                                                                                                                                                                                                                                                                   |

Status is one of `planned`, `specified`, `building`, `blocked — <reason>; reopen when <condition>`,
`done`, `dropped — <reason>`. IDs never change once a spec cites them. Every `spec.md`
opens with `**Input**: Parent roadmap -> Rn.`

## Horizons

- **Now:** R1 (the #1827 pilot is the first ruled, agent-built change), then R2.
- **Next:** R3, R4. Scoped above; each needs `/speckit-specify` before it can be built.
- **Later:** R5, R6, R7. One line each until the rows before them land.

## Why this order

- **R1 first.** It's in flight, and every other row assumes the surface it leaves behind.
- **R2 before R3 and R4.** It tests the riskiest assumption: that usage can be measured at
  all, opt-in and without collecting anything sensitive. If it can't, R5 has to be
  re-planned, and that changes what R3 ships and R4 documents.
- **R3 before R4.** Reach is the adoption half of the destination, and the MCPB bundle and
  directory listings need R1's stable surface. Onboarding docs follow so new users land on
  them. Both depend only on R1, so either can start once R1 is `done`.
- **R6 and R7 are Later.** Neither serves the destination directly. R7 is also blocked on a
  decision.

## Open mismatches

- **#1527 (R6) sits in the v3.1 milestone, but R6 is Later.** Either move #1527 out of
  v3.1, or the owner reorders R6.
- **Milestones v3.0, CE-MCP migration and Cleanup are still open** with no open issues.
  R0 is `done` on the merged PRs above; closing those milestones is the owner's call.
- **R1 has no spec dir yet.** The pilot's spec will be committed with its PR; until then
  the drift check reports R1 as `building` with no spec dir.

## Not on the roadmap

These get a normal PR, not a spec (constitution, "Development workflow"):

- [#1728](https://github.com/tosin2013/mcp-adr-analysis-server/issues/1728) vitest 5 and
  dropping Node 20 from CI (a dependency bump, milestone v3.1).
- Dependabot updates, config changes, typos.

## Specs outside this roadmap

None.

## How the next row is picked

The operator takes the eligible row with the lowest Order. A row is eligible when its
status is `specified` or `building`, every row it depends on is `done`, its spec, plan and
tasks exist and are approved, analyze has run, its ruling issue has `agent-ready`, and its
milestone admits it. A `planned` row is a candidate for `/speckit-specify`, not a build.
If anything is missing, ambiguous or `blocked`, stop and ask the owner.

## Change log

- 2026-10-28: first version. Rows drawn from the open milestones and ADR-021/023/025/026.
