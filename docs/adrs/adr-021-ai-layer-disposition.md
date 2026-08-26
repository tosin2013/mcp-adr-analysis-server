# ADR-021: Disposition of the legacy AI execution layer

## Status

Proposed

> This ADR presents evidence and options. **The disposition is the owner's and is
> not recorded here yet.** Section 7 is deliberately unfilled.

## Date

2026-08-26

## Context

The server carries two overlapping execution strategies:

- **Legacy AI execution** — `src/utils/ai-executor.ts` calls OpenRouter directly and
  returns generated text. Introduced before ADR-014.
- **CE-MCP directives** — ADR-014's design, where a tool returns an
  `OrchestrationDirective` and the _host_ LLM does the work. No external API call.

ADR-014 was accepted and the migration was started. It was never finished, and
both paths are still live. This ADR exists to settle which one the project keeps.

### Measured state

All figures re-measured on `main` at `0993d0d8` (2026-08-26). The earlier v3.0 PRD
quoted figures from `787ef912`, a commit that never reached `main`; where the two
disagree, the numbers below supersede it.

|                                                            |                  |
| ---------------------------------------------------------- | ---------------- |
| tools exposed over the wire                                | **75**           |
| tools with a real CE-MCP directive                         | **12**           |
| tools claiming `hasCEMCPDirective: true` in `TOOL_CATALOG` | **70**           |
| files importing `ai-executor`                              | **5**            |
| external runtime dependencies of the AI layer              | **1** (`openai`) |

The twelve with genuine directives:

```
analyze_environment      analyze_project_ecosystem  deployment_readiness
generate_adrs_from_prd   generate_rules             interactive_adr_planning
mcp_planning             perform_research           smart_score
suggest_adrs             tool_chain_orchestrator    troubleshoot_guided_workflow
```

**So 58 of the catalog's 70 claims are false.** That field is what `search_tools`
reports to callers, so the discovery surface advertises a capability most tools do
not have.

### Footprint

| path                            | LOC                         |
| ------------------------------- | --------------------------- |
| `src/prompts/` (11 files)       | 6,498                       |
| `src/**/*reflexion*`            | 1,780                       |
| `src/**/*knowledge-generation*` | 1,257                       |
| `src/**/*ape*`                  | 707                         |
| `src/utils/ai-executor.ts`      | 457                         |
| `src/utils/prompt-execution.ts` | 453                         |
| **total**                       | **11,152 of 114,281 (≈9%)** |

The PRD estimated ~18,200 LOC (~16%). This narrower figure counts only what a
removal would actually delete; treat 9% as the defensible lower bound.

### What a user gets today, out of the box

`executionMode` defaults to `'ce-mcp'` (`src/config/ai-config.ts:152`), and
`isAIExecutionEnabled()` requires `'full'` or `'hybrid'` **and** an API key
(`:240`). With no key configured, legacy AI execution is off.

That is the intended design. But the diagnostic tool contradicts it. Calling
`check_ai_execution_status` on a clean checkout returns:

```
> Note: As of Phase 5, this server uses CE-MCP mode by default.
> In CE-MCP mode, tools return orchestration directives that the host LLM
> executes directly, eliminating the need for external API calls.

## Current Configuration
- AI Execution Enabled: NO
- Has API Key: NO
- Execution Mode: ce-mcp

## Issue Detected
Problem: Missing OPENROUTER_API_KEY environment variable

## Solution
1. Get an OpenRouter API key from https://openrouter.ai/keys
```

It states that no external API call is needed, then reports the absence of an
external API key as a **problem**, and directs the user to go and buy one. This is
observed behaviour over the MCP protocol, not inference. Whatever is decided
below, this output is wrong and misleads every new user who runs it.

### Deprecation that never took effect

`ai-executor.ts:8` and every `prompt-execution.ts` export already carry:

```
@deprecated ... use OrchestrationDirective returns instead. See ADR-014
```

They have been marked deprecated while remaining reachable. A deprecation notice
that nothing enforces is documentation, not a migration.

## Decision drivers

1. **Two live paths is the actual defect.** Whichever is kept, keeping both is
   what produced the current state — false catalog claims, a self-contradicting
   diagnostic, and deprecated code on the default path.
2. **Coupling is small.** Five files import `ai-executor`; `openai` is the only
   external dependency. The bulk is deletable string-building.
3. **#1416 depends on the answer.** The registry refactor must decide what a
   `ToolDefinition` carries. If ~30 tools change shape or disappear, doing #1416
   first means doing it twice.
4. **Removal cannot currently be cleared by governance.** `retirement.py src/prompts`
   returns a blocking `NO_RETIREMENT_EVIDENCE`: no retirement provider is bound in
   `.repo-governor.json` (INV-013). `REMOVAL_READY` is unreachable until one is,
   which is a manifest change and a human act — required for options B and C.

## Options considered

### A — Keep both, fix the honesty problems only

Correct the 58 false `hasCEMCPDirective` claims, fix `check_ai_execution_status`,
leave both paths live.

_For:_ smallest change; no capability lost.
_Against:_ does not address driver 1. The two-path condition persists, and #1416
still has to model both. This is the status quo with better labelling.

### B — Complete the ADR-014 migration, then delete the legacy layer

Give the remaining ~63 tools directives (or deterministic behaviour), then remove
`ai-executor`, `prompt-execution`, `src/prompts/`, and the APE / Reflexion /
Knowledge-Generation frameworks. Drop the `openai` dependency.

_For:_ one path; ~11,152 LOC and one external dependency removed; finishes what
ADR-014 started; simplifies #1416 substantially.
_Against:_ largest effort, and it is **not** a mechanical deletion — each of the
63 tools needs a decision about what it should return instead. Requires a bound
retirement provider before the engine will clear it.

### C — Delete the legacy layer now, without completing the migration

Remove the AI path immediately; tools without directives return deterministic
output or an explicit "not implemented".

_For:_ fastest route to one path.
_Against:_ ~63 tools lose their current behaviour at once, with no replacement
designed. Ships a regression to anyone relying on prompt-mode returns.

### D — Keep legacy AI execution, retire CE-MCP instead

Supersede ADR-014; make `full` mode the default and invest in the OpenRouter path.

_For:_ honest about what most tools actually do today.
_Against:_ reintroduces a hard external-API dependency and a key requirement for
every user; contradicts an Accepted ADR with a working 12-tool implementation.
Listed for completeness — no evidence gathered here supports it.

## Recommendation

**B**, staged — but see the caveat.

The evidence supports one path, and CE-MCP is the one with an accepted ADR and a
working implementation. B is the only option that both removes the duplication and
leaves the 63 tools with designed behaviour.

The caveat is scope. "Give 63 tools directives" is a research task, not a
checklist, and this project has twice this month mistaken one for the other. B
should be admitted as its own milestone with per-batch acceptance criteria, not
as a single issue.

Regardless of A/B/C/D, two things should be fixed immediately because they are
wrong under every option:

- the 58 false `hasCEMCPDirective: true` claims
- `check_ai_execution_status` telling users to buy a key they do not need

## Decision

_Not yet recorded._ Awaiting the owner's disposition. See #1414.

## Consequences

To be completed once the decision is recorded.

## Related

- ADR-014 (CE-MCP architecture) — Accepted; this ADR determines whether it is finished or superseded
- ADR-015 (APE optimization strategy) — Accepted; its subject is inside the removal scope of B and C
- #1414 — this decision
- #1416 — the registry refactor, whose scope depends on the answer
- The aggregator (~2,600 LOC, opt-in SaaS) is explicitly **out of scope**; it is a separate commercial question
