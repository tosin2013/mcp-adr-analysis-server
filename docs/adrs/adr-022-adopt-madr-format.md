---
status: proposed
date: 2026-08-26
decision-makers: Tosin Akinosho
consulted: Claude Code (evidence gathering)
tags:
  - documentation
  - process
---

# ADR-022: Adopt MADR as the default decision-record format

> Written in MADR, deliberately: the first MADR file in this repository is the one
> that adopts MADR. Merging this ADR is the act of accepting it; `status` moves to
> `accepted` at that point.

## Context and Problem Statement

The ADR corpus has drifted, and `scripts/check-adr-drift.sh` (#1460) now measures it.
Sixteen findings at the start, eight after the unambiguous fixes. Several of the
remaining eight exist **because the format has nowhere to put the answer**:

- **Two status dialects in one corpus.** 20 ADRs use `## Status` with the value on a
  following line; 2 use inline `**Status**: X`. Any reader must handle both.
- **ADR-001 decided SSE transport and is still `Accepted`.** The code is stdio-only:
  zero `SSEServerTransport`, zero `sdk/server/sse`. There is no structured way to say
  "superseded", so it says nothing.
- **Two files claim ADR-018**, and `adr-020-mcp-tasks-integration-strategy.md`
  re-issues one of them with **zero** "supersedes" mentions.
- **`adr-001` and `adr-0001` collided** — the latter a `[ADR_CONTENT_PLACEHOLDER]` stub
  written into `docs/adrs/` by `adr-suggestion-tool.ts:1101`.
- **ADR-016 does not exist**, but two files reference
  `adr-016-replace-ripgrep-with-tree-sitter.md` by name.

This is not only a documentation problem. **This repository is a tool that parses ADRs** —
`validate_adr`, `validate_all_adrs`, `discover_existing_adrs`, `analyze_adr_timeline` all
read these files. An unparseable ledger is a product defect, not untidiness.

## Decision Drivers

- Machine-readability, because the product consumes its own artifacts.
- A structured place to record supersession, which two live findings need.
- A structured place to record **how a decision would be confirmed** — the recurring
  lesson of the v3.0 work is that claims drift silently until something executes a check.
- Emitting a recognised standard is worth more to users than a bespoke shape.

## Considered Options

1. **Keep Nygard, change nothing.**
2. **Keep Nygard, add YAML front matter.**
3. **Adopt MADR as the default for new ADRs; convert opportunistically.**
4. **Adopt MADR and convert all 21 existing ADRs now.**

## Decision Outcome

**Option 3 — adopt MADR as the default for newly generated ADRs, convert the existing
corpus opportunistically as other work touches each file.**

`templateFormat` in `src/tools/adr-suggestion-tool.ts` already accepts
`'nygard' | 'madr' | 'custom'`; the default moves from `'nygard'` to `'madr'`. No new
capability is required to start.

### Why not the others

**Option 1** leaves five of the eight open drift findings unaddressable — the format has
no slot for the answers.

**Option 2** is the honest runner-up and captures most of the value: YAML front matter
alone fixes the dialect problem and gives a machine-readable `status`. It was rejected
because it invents a local convention where a recognised standard exists, and because a
tool whose output other people consume benefits from emitting something they already know.

**Option 4** was rejected on cost and risk. Twenty-one files rewritten in one pass is a
large diff nobody can review meaningfully, and three of those ADRs are the subject of open
decisions (#1461, #1462, #1463) that will rewrite them anyway.

## Consequences

**Good**

- `status` becomes one machine-readable field. `scripts/check-adr-drift.sh` now handles
  all four dialects observed across 439 real ADRs, so a mixed corpus is not a blocker
  during the transition.
- `superseded by ADR-NNNN` becomes a first-class status value, which is what ADR-001 and
  the duplicate ADR-018 need.
- MADR's `Confirmation` section gives each ADR a place to declare how it would be
  verified. Today `check-adr-drift.sh` **hardcodes** each check in bash — ADR-001's SSE
  test, ADR-006's grammar test. That does not scale and is a shadow copy of the ledger.
  Declared confirmations would let the checker become generic.

**Bad**

- MADR asks for more sections than Nygard's five. A team that will not write five will not
  write nine, and this corpus is already inconsistent partly because structure invites
  omission. The minimal MADR template exists for small decisions and should be used.
- The corpus is mixed-format until conversion completes, and may stay mixed indefinitely
  if nothing forces it.

**Neutral**

- Existing ADRs remain valid and readable. Nothing is invalidated by this decision.

## Confirmation

Verifiable now:

- `node -e "..."` — the default `templateFormat` in `adr-suggestion-tool.ts` is `'madr'`.
- `bash scripts/check-adr-drift.sh` — parses this file's YAML front matter and does not
  report it as unparseable; drift does not rise.
- `head -1 docs/adrs/adr-022-adopt-madr-format.md` is `---`.

Not verifiable by command, and deliberately not claimed: whether the corpus actually
converges on MADR. That depends on future work touching each file, and a check asserting
it would be green while nothing happened.

## More Information

- MADR: https://github.com/adr/madr
- Repo Governor's `adapters/adr` already parses MADR 3.0 front matter; no change needed
  there. Its measured dialect frequencies are the source of the four-dialect handling in
  `check-adr-drift.sh`.
- Converting an existing Nygard corpus to MADR is **not** a capability this tool has
  today. `templateFormat` affects generation only. Tracked separately.
- Related: #1415 (ledger reconciliation), #1461, #1462, #1463.
