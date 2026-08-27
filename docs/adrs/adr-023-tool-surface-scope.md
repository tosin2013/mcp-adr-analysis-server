---
status: proposed
date: 2026-08-26
decision-makers: Tosin Akinosho
consulted: Claude Code (measurement and external research)
tags:
  - architecture
  - process
---

# ADR-023: Which of the 75 tools should still exist

> **The Decision section is deliberately unfilled.** This ADR measures, researches and
> argues. The disposition is the owner's, as with ADR-021.

## Context and Problem Statement

This repository was first committed **2025-07-02** against `@modelcontextprotocol/sdk`
`^1.0.0`. It is now thirteen months old and the SDK is at `^1.30.0`. It was designed
around mid-2025 assumptions about what an MCP host could do for itself.

Several of those assumptions no longer hold. The question this ADR asks is narrow and
answerable: **of the 75 tools this server exposes, which should still exist?**

It is asked _now_ because two pieces of queued work are both sized in tools — #1416
collapses four registries into one, and ADR-021 option B migrates tools off the legacy
AI layer. **Both do less work if fewer tools survive**, and both would otherwise spend
effort on tools that should not exist.

### Measured, on `main` at v2.7.0

Every figure below is reproducible by the command beside it. Nothing is carried over
from the v3.0 PRD or ADR-021 — both have already been found wrong once each.

| measurement                         | value                          | how                                                   |
| ----------------------------------- | ------------------------------ | ----------------------------------------------------- |
| tools exposed over the wire         | **75**                         | MCP `tools/list` against the built server             |
| `tools/list` payload                | **94,571 bytes (~24K tokens)** | same                                                  |
| tools declaring `outputSchema`      | **0**                          | same                                                  |
| tools with a real CE-MCP directive  | **12**                         | `grep -cE "^\s+case '" src/tools/ce-mcp-tools.ts`     |
| tool modules importing the AI layer | **10**                         | `grep -rl 'prompt-execution\|ai-executor' src/tools/` |
| tools absent from `TOOL_CATALOG`    | **4**                          | wire list minus catalog keys                          |

The four uncatalogued tools are `get_gaps`, `search_codebase`, `set_project_path` and
`update_knowledge`. They are dispatchable but invisible to `search_tools`. The v3.0 PRD
identified them in June; they are still uncatalogued.

## Decision Drivers

- **The MCP spec now assigns to the host what this server built for itself.**
- **The server is several times over the spec's own context threshold.**
- **Market evidence says generation is commodity and drift is the unmet need.**
- Fewer surviving tools makes #1416 and ADR-021 option B smaller.

### The spec moved

[Client Best Practices (2026-07-28)](https://modelcontextprotocol.io/docs/2026-07-28/develop/clients/client-best-practices)
describes **progressive discovery as a host responsibility**: the host exposes a
`search_tools` meta-tool, defers injecting definitions, and fetches full schemas on
demand. It states plainly:

> _"Some model providers already offer built-in tool search. For example, OpenAI and
> Anthropic support this natively… When available, you may prefer the platform's tool
> search over a custom implementation."_

This server ships its own `search_tools` and `load_prompt` as CE-MCP meta-tools. That was
a reasonable thing to build in 2025. It is now a reimplementation of a host feature.

### The server is over the spec's own threshold

The same document recommends switching to progressive discovery once tool definitions
consume **1–5% of the context window**. At ~24K tokens this server is:

```
11.8% of a 200K context window
 2.4% of a 1M context window
```

Three to twelve times the recommended threshold. **This server does not merely benefit
from progressive discovery — it forces the mitigation on every host that connects.**

### Zero output schemas

The same document describes programmatic tool calling ("code mode"), where the host
generates a typed API from tool schemas and the model writes code against it. Precise
types require `outputSchema`, and it says _"the real fix is for server authors to provide
`outputSchema`."_

This server declares **none**, on any of 75 tools. It opts out of that path entirely.

### What the market actually wants

Current ADR guidance ([adr.github.io](https://adr.github.io/),
[Fowler](https://www.martinfowler.com/bliki/ArchitectureDecisionRecord.html), 2026
practitioner guides) is consistent on two points:

- Plain Markdown in `docs/adr/` is enough for most teams; tools get adopted only when a
  specific pain appears that Markdown cannot solve.
- The dominant pain is **staleness**: _"Decisions don't stay in the file — they change in
  Slack, GitHub and Jira, and nobody updates the ADR."_ And _"there's no dominant tool,
  which tells you the field is young."_

Writing ADRs is not the hard part. **Noticing that an ADR stopped being true is.**

This repository already proved that internally. `scripts/check-adr-drift.sh`, built in a
few hours, found that ADR-001 claims SSE transport while the code is stdio-only, that
ADR-006 claims grammars ADR-017 removed, and that ADR-018a forbids a pattern twelve files
use. Twelve ADR-_generation_ tools found none of it.

## Considered Options

1. **Keep all 75.** Do #1416 and option B at full scope.
2. **Remove only what the host now provides**, keep everything else.
3. **Remove host-native duplicates and consolidate redundant clusters**, and record where
   evidence is insufficient to decide.
4. **Narrow to drift detection**, removing most generation tooling.

## Proposed classification

### REMOVE — the host now does this (11 tools)

| tool(s)                                                       | now provided by                                                              |
| ------------------------------------------------------------- | ---------------------------------------------------------------------------- |
| `read_file`, `write_file`, `list_directory`, `read_directory` | host file tools in every major MCP client                                    |
| `list_roots`                                                  | the MCP `roots` capability                                                   |
| `llm_web_search`                                              | native web search in every frontier host                                     |
| `llm_cloud_management`, `llm_database_management`             | prompt wrappers over host capability                                         |
| `search_tools`, `load_prompt`                                 | **the spec assigns this to the host**; OpenAI and Anthropic ship it natively |
| `get_current_datetime`                                        | host                                                                         |

`search_tools` and `load_prompt` are the strongest case, because the argument is not
"another tool does this too" but "the specification says this is not the server's job."

Removing these eleven costs ~15% of the tool surface and a corresponding share of the 24K
token payload, for no capability a modern host lacks.

### OUT OF SCOPE — the aggregator (10 tools)

ADR-021 already ruled the aggregator _"a separate commercial question"_. Unchanged here.

### DIES WITH THE AI LAYER (1 tool)

`check_ai_execution_status` exists solely to explain the legacy execution mode. Under
ADR-021 option B it has nothing left to report.

### REVIEW — insufficient evidence to classify (the remainder)

**This is the honest gap in this ADR: there is no usage data reaching a durable
store.** Every classification below the line above is reasoning about code shape, not
about use.

An earlier revision of this ADR said _"nothing in `src/` records which tools are actually
called."_ That was wrong, and the correction matters, because it changes the gap from a
project into three edits. Two mechanisms already record every call by name, and one
already computes exactly the per-tool counts this section needs:

| what exists                                             | where                                                                  | why no usable evidence comes out                                                                                      |
| ------------------------------------------------------- | ---------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------- |
| complete per-tool count `Map`, sorted                   | `src/utils/knowledge-graph-manager.ts:406-416`                         | `.slice(0, 10)` truncates it **before persisting** — the full map is built and discarded                              |
| every execution recorded                                | `trackToolExecution`, `src/index.ts:8219`, called at `:4201` / `:4208` | persists under `os.tmpdir()` (`knowledge-graph-manager.ts:44-52`) — wiped by OS temp cleanup, never survives a reboot |
| distinct tools per session                              | `src/utils/conversation-memory-manager.ts:131,163`                     | same `os.tmpdir()` problem; a dedup'd list, no counts                                                                 |
| complete `MonitoringManager` with `MetricCategory.TOOL` | `src/utils/monitoring.ts`                                              | **zero production call sites** — built, tested, never wired                                                           |

And one blind spot that bears directly on this section: the CE-MCP directive path at
`src/index.ts:3875-3888` returns before the dispatch switch and before
`trackToolExecution`, so **all twelve `CE_MCP_DIRECTIVE_TOOLS` are unrecorded** whenever
CE-MCP mode is on. `perform_research` is one of them — a tool whose disposition this
section defers _pending data that this bug guarantees will never exist for it_.

So the evidence is computed and thrown away, not absent. Ten entries survive out of 75,
into a directory the OS deletes. Every cluster below falls beyond that cut.

> Every line reference in the table above was verified against `0d3817b7` on 2026-08-27
> and will drift. #1416 collapses four registries and removes roughly 4,000 lines from
> `src/index.ts`; the `:3875`, `:4201`, `:8219` citations will all be wrong afterwards.
> They are given because they are checkable **today** and the argument depends on being
> checkable. When #1416 lands, re-anchor them to symbol names — which is #1463's whole
> point about ADR-014, and the reason this note exists rather than the same mistake.

Clusters that look consolidatable but should not be cut on inference alone:

- **memory (6)** — `expand_memory`, `memory_loading`, `expand_analysis_section`,
  `get_memory_stats`, `get_conversation_snapshot`, `query_conversation_history`
- **workflow (5)** — `get_workflow_guidance` and `get_development_guidance` are
  adjacent enough to question
- **research (4 after removals)** — `create_research_template`,
  `generate_research_questions`, `incorporate_research`, `perform_research`

### KEEP — the reason the server exists

The **12 ADR tools**, the **4 analysis tools**, **6 content-security** (masking is not a
host capability), **7 deployment**, and **3 rules**. These are domain work a host cannot
do, which is the test the spec's _"single responsibility: one clear domain"_ guidance
implies.

## Decision

_Not yet recorded._ Awaiting the owner's disposition. See #1414's successor work.

## Consequences

To be completed once the decision is recorded. Two are worth stating in advance:

**It resizes queued work.** Removing 11 host-native tools and excluding 10 aggregator
tools leaves **54**. #1416 builds a registry for 54 entries rather than 75, and option B
has fewer tools to consider.

**It sharpens what the product is.** If the market's unmet need is drift detection and
this repo has already built a working drift checker, then the ADR-generation surface is
the commodity part and the verification surface is the differentiated part. That is a
positioning consequence, not only a scope one.

## Confirmation

Verifiable now:

- `bash scripts/check-adr-drift.sh` stays at its baseline with this ADR added.
- Every measurement in the table above reproduces via the command beside it.

Deliberately **not** claimed: that removing these tools is safe. `retirement.py` governs
that, and it advertises `dynamic_references`, `runtime_usage`, `public_contracts` and
`migration_obligations` as **false** — so it will return `RETIREMENT_REVIEW`, never
`REMOVAL_READY`, from static analysis. Any removal needs its own admission.

**And the largest gap is not technical.** Without usage data, the REVIEW section is
opinion. Converting it to evidence does not require instrumenting anything — the
instrumentation exists. It requires lifting a `.slice(0, 10)`, moving a store out of
`os.tmpdir()` into the project-local `.mcp-adr-cache` that `src/utils/config.ts:17`
already defines, and recording the CE-MCP directive path. Tracked as #1487, #1488 and
#1489.

That correction is itself an instance of what this ADR argues. The claim that no usage
data was recorded went unchecked into a document meant to decide the fate of 75 tools,
and it was wrong in the direction that made the problem look bigger than it is.

## More Information

- [MCP Client Best Practices, 2026-07-28](https://modelcontextprotocol.io/docs/2026-07-28/develop/clients/client-best-practices)
- [adr.github.io](https://adr.github.io/) · [Fowler, Architecture Decision Record](https://www.martinfowler.com/bliki/ArchitectureDecisionRecord.html)
- ADR-021 (AI-layer disposition, Accepted) · ADR-022 (MADR adoption)
- #1416 (registry collapse) · #1415 (ledger reconciliation)
