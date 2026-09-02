---
status: proposed
date: 2026-09-02
decision-makers: Tosin Akinosho
consulted: Claude Code (measurement and external research)
tags:
  - architecture
  - process
---

# ADR-026: Tool-call best-practices conformance

> **The Decision section is deliberately unfilled.** This ADR measures, researches
> and argues. The disposition is the owner's, as with ADR-021 and ADR-023.

## Context and Problem Statement

ADR-023 asked _which_ of the tools should exist and cut the supported surface to 54.
This ADR asks a different, orthogonal question about the tools that survive: **do the
tool calls themselves conform to current MCP practice?**

The distinction matters because the two are independent. A tool can be the right tool
to keep (ADR-023) and still expose a poor call contract — no typed output, no
behaviour hints, discoverable only through a mechanism the spec now assigns to the
host. Removing tools does not fix the calls that remain.

The full evidence base is [`docs/reference/tool-surface-map.md`](../reference/tool-surface-map.md).

### Measured, on `main` at 2026-09-02

Every figure is reproducible by the command beside it.

| measurement                            | value                       | how                                                                                                                                                                              |
| -------------------------------------- | --------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| tools over the wire                    | **72**                      | `MCP_TOOL_SCHEMAS.length` (`src/tools/mcp-tool-schemas.ts`), served by `getToolListForMCP({ mode: 'full' })` at `src/mcp-adr-analysis-server.ts:235`                             |
| tools declared in `TOOL_CATALOG`       | **68**                      | `rg -c "^TOOL_CATALOG.set\('" src/tools/tool-catalog.ts` (72 at runtime — see next row)                                                                                          |
| wire tools backfilled into the catalog | **4**                       | `get_gaps`, `search_codebase`, `set_project_path`, `update_knowledge` — folded into `TOOL_CATALOG` at load by the loop at `tool-catalog.ts:2103` with default `utility` metadata |
| tools declaring `outputSchema`         | **0**                       | `rg -n "outputSchema" src` → only `prompt-composition.ts:232-255` (unrelated)                                                                                                    |
| tools declaring any MCP annotation     | **0**                       | `rg -c "readOnlyHint\|destructiveHint\|idempotentHint\|openWorldHint" src`                                                                                                       |
| CE-MCP directive tools                 | **12**                      | 12 `case` entries in `ce-mcp-tools.ts:1406-1447`; `hasCEMCPDirective: true` ×12 in the catalog                                                                                   |
| host-native tools marked `deprecated`  | **8**                       | `deprecated: true` in `tool-catalog.ts` + `[DEPRECATED host-native, ADR-023]` on their wire descriptions (#1639)                                                                 |
| `tools/list` payload                   | **~94,571 B / ~24K tokens** | measured in ADR-023:38                                                                                                                                                           |
| categories in `search_tools` enum      | **10 of 11**                | `mcp-tool-schemas.ts:19-30` (inside `getSearchToolsDefinition`) omits `aggregator`                                                                                               |

## Decision Drivers

- **The spec moved and this server predates it.** The 2026-07-28 Client Best
  Practices assign progressive discovery to the host and describe programmatic
  ("code mode") calling that needs `outputSchema`. This server ships neither
  contract.
- **The tool count is above Anthropic's own selection-accuracy band.** Anthropic's
  guidance ([Writing effective tools for agents](https://www.anthropic.com/engineering/writing-tools-for-agents),
  [Tool search tool](https://platform.claude.com/docs/en/agents-and-tools/tool-use/tool-search-tool))
  is that Claude's ability to pick the right tool **degrades past ~30–50 available
  tools**; under ~10 the full list is fine; above the band, defer to host-native
  tool search rather than a custom one. This server exposes 72; ADR-023's supported
  54 still sits at the top of the band, and only consolidating the deferred clusters
  (ADR-024) brings it comfortably inside.
- **Zero output schemas opts the server out of code mode.** The spec is explicit:
  "the real fix is for server authors to provide `outputSchema`." With none, every
  host generating typed stubs falls back to `any`.
- **Zero annotations hides safety-relevant behaviour.** `read_file` is read-only;
  `write_file` and `smart_git_push` are destructive. A host cannot tell without
  `readOnlyHint`/`destructiveHint`, so it must treat all calls as equally risky.
- **The lightweight listing exists and is already wired in — it is just
  configured to `full`.** `getToolListForMCP({mode})`
  (`src/tools/tool-dispatcher.ts:139-171`) **is** the live `tools/list` source
  (#1416): `src/mcp-adr-analysis-server.ts:235` calls it. But it passes
  `mode: 'full'`, returning all 72 full `MCP_TOOL_SCHEMAS`, when the same function
  already offers a `mode: 'lightweight'` path (`:151-166`) that would emit
  `search_tools` plus name/category stubs. The oversized wire payload is therefore a
  one-line **configuration choice**, not dead code — a stronger finding than the
  earlier draft's (which wrongly called `getToolListForMCP` unused).
- **Catalog integrity is broken in two ways.** Four wire tools (`get_gaps`,
  `search_codebase`, `set_project_path`, `update_knowledge`) carry no explicit
  catalog entry; a backfill loop (`tool-catalog.ts:2103`) folds them into
  `TOOL_CATALOG` at load with default `utility` metadata, so `search_tools` _does_
  surface them — but mis-categorised and under-described, and `get_gaps` duplicates
  the properly catalogued `analyze_gaps`. Separately, the `search_tools` category
  filter silently omits `aggregator`, leaving its 10 tools unfilterable by category.

### The spec moved

[Client Best Practices (2026-07-28)](https://modelcontextprotocol.io/docs/2026-07-28/develop/clients/client-best-practices)
recommends switching to progressive discovery once tool definitions consume 1–5% of
the context window and notes OpenAI and Anthropic ship tool search natively. At ~24K
tokens this server is 3–12× that threshold — the same finding ADR-023 used to remove
`search_tools`/`load_prompt` from the supported surface. It also describes code mode,
where the host builds a typed API from `outputSchema`; this server declares none.

### Zero annotations

The [Tools spec](https://modelcontextprotocol.io/specification/2026-07-28/server/tools)
defines `readOnlyHint`, `destructiveHint`, `idempotentHint`, `openWorldHint` and
`title` as optional behaviour hints (clients treat them as untrusted unless from a
verified source). None appear anywhere in `src/`. The clearest cost is safety
legibility: destructive tools (`write_file`, `smart_git_push`, `sync_to_aggregator`)
are indistinguishable from read-only ones at the protocol level.

## Considered Options

1. **Status quo.** Keep 72 full-schema tools, no `outputSchema`, no annotations, a
   custom `search_tools`. _For:_ no work. _Against:_ forces the progressive-discovery
   mitigation on every host, opts out of code mode, and leaves the catalog bugs.

2. **Full conformance pass on the survivors.** Add `outputSchema` and annotations to
   the supported set, flip the wire listing from `mode: 'full'` to `mode:
'lightweight'` (the path already exists), fix the `aggregator` enum omission, and
   give the 4 backfilled tools proper catalog entries (dedupe
   `get_gaps`/`analyze_gaps`). _For:_ closes every gap; unblocks code mode. _Against:_
   largest effort; `outputSchema` for ~54 tools is real work, not mechanical.

3. **Schemas + annotations only; defer discovery to the host.** Add `outputSchema` +
   annotations, fix the catalog bugs, but do not build more discovery machinery —
   rely on host-native tool search. _For:_ highest value per unit effort; aligns with
   the spec putting discovery on the host. _Against:_ leaves the oversized wire
   payload until ADR-023's removals land.

4. **Defer discovery entirely to the host and drop `search_tools`/`load_prompt`.**
   Fold the discovery meta-tools into ADR-023's removal track and lean on host-native
   search. _For:_ smallest long-term surface; stops reimplementing a host feature.
   _Against:_ couples this ADR to ADR-023's deprecation/retirement timeline; a host
   without native tool search loses discovery until it catches up.

## Consequences

**Good (whichever of 2–4 is chosen)**

- Tools gain typed outputs (code mode becomes possible) and safety-legible
  annotations.
- The catalog stops lying by omission — every wire tool is discoverable and every
  category filterable.

**Bad / cost**

- `outputSchema` across the surviving tools is per-tool design work, not a codemod.
- Switching the wire listing changes what every connected host sees; it interacts
  with prompt caching (adding/removing tool defs mid-conversation invalidates the
  cached `tools` prefix) and must be validated against real clients.

**Neutral**

- This ADR does not change _which_ tools exist (ADR-023) or consolidate the deferred
  clusters (ADR-024). It is about the call contract of whatever survives.

## Decision

<!-- Deliberately unfilled. The disposition is the owner's, as with ADR-021/023.
     Options 2–4 are all defensible; option 1 is the do-nothing baseline. -->

## Confirmation

Verifiable now:

- Every measurement in the table reproduces via the command beside it.
- The host-native removal track (ADR-023) has already moved one step: the 8
  host-native tools carry `deprecated: true` and a `[DEPRECATED host-native,
ADR-023]` marker on their wire descriptions (#1639). The next step is per-asset
  `retirement.py`, not another edit here.
- `bash scripts/check-adr-drift.sh` stays at its baseline with this ADR added.

Deliberately **not** claimed: that any tool is safe to remove, or that adding
`outputSchema`/annotations is mechanical. Execution of any chosen option is separate
work, admitted on its own, and — for anything that removes a tool — gated by
`retirement.py` per ADR-023.

## More Information

- [`docs/reference/tool-surface-map.md`](../reference/tool-surface-map.md) — the per-tool evidence base
- [MCP Client Best Practices, 2026-07-28](https://modelcontextprotocol.io/docs/2026-07-28/develop/clients/client-best-practices)
- [MCP Tools specification, 2026-07-28](https://modelcontextprotocol.io/specification/2026-07-28/server/tools)
- [Anthropic — Writing effective tools for agents](https://www.anthropic.com/engineering/writing-tools-for-agents) (tool-selection accuracy degrades past ~30–50 tools) · [Tool search tool](https://platform.claude.com/docs/en/agents-and-tools/tool-use/tool-search-tool)
- [ADR-023](adr-023-tool-surface-scope.md) (which tools exist) · ADR-024 (deferred clusters, pending usage data) · [ADR-021](adr-021-ai-layer-disposition.md) (AI-layer disposition)
