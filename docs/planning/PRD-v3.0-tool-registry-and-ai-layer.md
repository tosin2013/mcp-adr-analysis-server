# PRD — v3.0: one tool registry, and a decision about the AI layer

**Status:** Superseded · **Date:** 2026-08-25 · **Superseded:** 2026-08-27 (#1494)
**Superseded by:** [ADR-021](../adrs/adr-021-ai-layer-disposition.md) (AI-layer disposition,
Accepted) and [ADR-023](../adrs/adr-023-tool-surface-scope.md) (tool-surface scope, Accepted)
**Original authority:** [#741](https://github.com/tosin2013/mcp-adr-analysis-server/issues/741)
— **now closed as `NOT_PLANNED`**, superseded by
[#1416](https://github.com/tosin2013/mcp-adr-analysis-server/issues/1416)

---

> ## ⚠️ This document is superseded. Read the ADRs first.
>
> It is kept because it is the record of how the thinking changed, and because #1409–#1413
> were executed against it and closed. It is **not** a plan to follow today.
>
> ### Three facts that independently disqualify it as a plan
>
> 1. **Its authority is a closed issue.** The header cited #741 as _"admitted, not yet
>    assigned"_, and §9 asserted `#741` reads `ADMITTED / NO_EXECUTION_AUTHORITY`. #741 is
>    closed `NOT_PLANNED`.
> 2. **§3's remediation command does not exist.** It says to `make recompile` the lock
>    files. There is no such target; #1410 established the command is `gh aw compile`,
>    which every lock file's own header states.
> 3. **§8's sequencing is inverted.** It places the registry refactor at P1 and the
>    AI-layer decision at P2, _after_ it. ADR-021 driver 3: _"#1416 depends on the answer…
>    doing #1416 first means doing it twice."_
>
> ### Where each claim now lives
>
> | this document says                                                           | superseded by                                                                                                     |
> | ---------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------- |
> | build the registry for the surface as it stands                              | ADR-023: the supported surface is **54**, not 75                                                                  |
> | `search_tools` is _"the token-efficient front door"_ to fix (§4)             | ADR-023 puts `search_tools` **out of the supported surface** — the spec assigns progressive discovery to the host |
> | 74 tools, ~15K-token payload (§4)                                            | both ADRs measure **75** and 94,571 bytes (~24K tokens)                                                           |
> | _"~18,200 LOC (~16%), ~30 of 74 tools"_ (§6)                                 | ADR-021: **11,152 LOC**, _"treat 9% as the defensible lower bound"_                                               |
> | _"`hasCEMCPDirective: true` claimed for 70 tools"_ (§4)                      | corrected in #1456 — exactly **12** are `true`, matching `CE_MCP_DIRECTIVE_TOOLS`                                 |
> | _"It does not settle the AI layer"_ (§10)                                    | ADR-021 settles it: **Option B, Accepted 2026-08-26**                                                             |
> | fix `openai` by finishing the migration, else move it to `dependencies` (§2) | #1409 took the fallback; under ADR-021 dropping `openai` is gated on the 63-tool migration                        |
> | _"no retirement provider bound"_ (§9)                                        | bound and committed in #1492                                                                                      |
>
> ### What survives, and is still worth reading
>
> **§5** (safety-net gaps) and **§7** (ADR ledger) are intact. §5 maps onto #1411, #1412
> and #1413, all closed; §7 onto #1415, #1462 and #1463. §4's observation that
> `getToolListForMCP`, `getToolCategories`, `getCEMCPSummary`, `toolExists` and
> `getToolMetadata` all have **zero call sites**, and that `readResource()` runs both a
> `ResourceRouter` and a legacy switch, is unchallenged by either ADR and still actionable
> under #1416.
>
> A supersession notice that implies the whole document is void would discard work that is
> still good. Most of this document was right. Its **ordering** and its **sizing** were not.

---

## 0. Why this exists

Three reviews of the codebase were run on 2026-08-25 — architecture, ADRs-versus-code,
and test/CI health. Every number below was measured on `787ef912`, not estimated.

The refactor this project needs is **not the one #741 describes**. #741 proposes a
dependency-injection container to unblock testing. That is a consequence of the real
problem, not the problem: the tool layer has **four hand-maintained registries that have
already drifted**, and the remedy for it was **built in 2025 and never wired up**.

There is also **one live production bug** that should not wait for any of this.

---

## 1. #741's premises are stale — correct them before starting

| #741 says                                                                | Actually                                                                                                                                                                |
| ------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| _"`feature/dependency-injection-refactor` introduces a DI container"_    | **No such branch** exists, local or remote. No `DIContainer` or `createContainer` anywhere in `src/`.                                                                   |
| _"All tools in `src/tools/` migrated to constructor injection"_          | 36 tool modules; **10** carry a `Deps` interface. DI landed under a _different_ issue — commit `39c3fd16 feat(#310)` — as per-class `Deps` interfaces, not a container. |
| _"tools receive their dependencies rather than importing them directly"_ | Only **5** files import `ai-executor` / `cache` / `knowledge-graph-manager` directly. The coupling is far smaller than "all tools" implies.                             |

`39c3fd16` **is** an ancestor of the current branch. The DI work is partly done, by a
different design, described by an issue that predates it.

**Action:** rewrite #741's body to match the tree, or close it and open a successor. Do not
start work against a description that names a branch nobody can check out.

---

## 2. P0 — the live bug (ship independently, today)

`src/utils/ai-executor.ts:18` is a **static** `import OpenAI from 'openai'`.
`package.json` declares `openai ^6.1.0` in **`devDependencies`**, and `files: ["dist/"]`
ships no `node_modules`.

Every npm consumer of `mcp-adr-analysis-server@2.6.13` who invokes `suggest_adrs`,
`validate_adr`, or any AI-execution path gets `ERR_MODULE_NOT_FOUND`. Startup is
unaffected — which is exactly why `npm run health` in `test.yml:60-68` never caught it, and
why coverage on that file (30.8%) never did either.

**Fix, in order of preference:**

1. Finish the ADR-014 directive migration and **delete the dependency** (see §4).
2. Failing that today: move `openai` to `dependencies`.

**Acceptance:** a test that installs the built tarball into a clean directory and invokes
one AI-path tool. Nothing in CI does this today.

---

## 3. P0 — restore the safety net _before_ touching structure

Four gh-aw workflows exist specifically to catch what a refactor of this kind breaks:
`mcp-server-validation`, `esm-module-validation`, `knowledge-graph-validation`,
`deployment-pattern-validation`.

**All of them are non-functional, and they present as green.** Their last runs show
`pre_activation: success` and `activation/agent/detection/safe_outputs: skipped` — the
path filters did not match recent commits, so the agent never ran. Every agentic workflow
that _does_ invoke the agent currently fails:

```
Engine Failure: the `copilot` engine terminated before producing output
dependency failed to start: container awf-squid exited (1)
docker compose up -d --pull never
```

The 11 `.lock.yml` files pin `gh-aw-firewall/*:0.25.20` with `--skip-pull`, and are
compiled against `setup@v0.68.3` while `agentics-maintenance.yml:92` runs `v0.84.2` —
sixteen minor versions of drift. `.github/dependabot.yml:105` now ignores
`github/gh-aw-actions*`, which stops the bleeding and **guarantees permanent drift**.

A refactor touching `src/**/*.ts` _will_ trigger these four, and they will produce
`[aw] … failed` issues instead of reviews.

**Actions:**

- `make recompile` the 11 lock files and commit the regenerated output. **Do not hand-edit
  them** — commit `787ef912` documents the outage caused by exactly that.
- Set `safe-outputs: { report-failure-as-issue: false }` on the daily
  `ai-executor-integration`. Six of the newest open issues are auto-filed failures from it.
- Confirm the four validators actually activate on a `src/**` change before relying on them.

---

## 4. P1 — one registry (this is the refactor)

### The problem, measured

Four hand-maintained registries of the same fact:

|     | where                                               | count                                       |
| --- | --------------------------------------------------- | ------------------------------------------- |
| A   | inline array, `src/index.ts:240-3848`               | 74 tool definitions with full `inputSchema` |
| B   | `switch (name)`, `src/index.ts:3890+`               | **111 `case` arms**                         |
| C   | `TOOL_CATALOG`, `src/tools/tool-catalog.ts:125+`    | 71 tools, schemas **duplicated**            |
| D   | markdown list inside a prompt, `src/index.ts:4740+` | 24 tools, skips number 15                   |

They have drifted. Verified absent from `TOOL_CATALOG` while present in both A and B:

```
get_gaps   search_codebase   set_project_path   update_knowledge
```

Those four are invisible to `search_tools` — the discovery meta-tool that is supposed to be
the token-efficient front door.

And the catalog's central metadata field is wrong for most of its entries:

```
hasCEMCPDirective: true    claimed for 70 tools
getCEMCPDirective()        implements 12
```

ADR-014 asked for the switch to be replaced by a dynamic dispatcher and complained about
**82** cases. There are now **111**.

### The remedy already exists and is not called

`src/tools/tool-dispatcher.ts:192` exports
`getToolListForMCP({ mode: 'full' | 'lightweight' | 'summary' })`. Searching the entire
tree for that identifier returns **one line — its own definition.** Zero call sites. So do
`getToolCategories`, `getCEMCPSummary`, `toolExists`, `getToolMetadata`.

`ListTools` still returns all 74 full schemas on every call, which is the exact ~15K-token
problem ADR-014 was written to fix.

The same pattern repeats on resources: a proper `ResourceRouter` exists
(`src/resources/resource-router.ts:25`), but `readResource()` runs **both** it and a legacy
16-case switch, bootstrapping the registry with 14 hand-written side-effect imports on
_every resource read_ (`src/index.ts:8404-8420`).

### Target

One `ToolDefinition[]` — `{ name, schema, handler, metadata }` — with `ListTools`,
dispatch, and the catalog **derived** from it. Wire `getToolListForMCP` into the `ListTools`
handler. Delete registry D.

Estimated removal: ~4,000 lines from `src/index.ts`.

### Do not do this before §3 and §5

`src/index.ts` is 9,738 lines at **0.0% coverage**, and CI's only guard against regressions
in it is `test.yml:84-111`, which **greps the built bundle for four string literals**. A
refactor that splits the switch into modules keeps those strings present while silently
breaking dispatch, and CI stays green.

---

## 5. P1 — make the safety net real

| gap                         | evidence                                                                                                        | fix                                                                            |
| --------------------------- | --------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------ |
| No coverage gate            | no `thresholds` in `vitest.config.ts:28-33`                                                                     | set thresholds at the **measured floor** — 48% stmt / 41% branch — and ratchet |
| CI never runs coverage      | `Makefile:57-60` → `npm test` → `vitest run`, no `--coverage`                                                   | run it in `test.yml`                                                           |
| Codecov upload is a no-op   | `lcov` absent from reporters; `test.yml:142` uploads a file never generated; `fail_ci_if_error: false` hides it | add `lcov`, flip the flag                                                      |
| Tests are never typechecked | `tsconfig.json:46` includes `src/**` only                                                                       | add `tsconfig.test.json`, run in `lint.yml`                                    |
| No protocol-level test      | nothing boots the server                                                                                        | boot it, `tools/list`, `tools/call` one per category                           |

**The docs assert a guarantee that does not exist.** `README.md:234` says _"Jest (>80%
coverage)"_ and `CONTRIBUTING.md:63` says _"≥85% coverage threshold (enforced by Jest)"_.
The framework is Vitest, and no threshold is configured anywhere. Measured today:

```
Test Files  126 passed | 1 skipped        Tests  3048 passed | 70 skipped
Statements  48.97%   Branches  41.27%   Functions  54.70%
src/index.ts  0.0%
```

`npx tsc --noEmit` passes clean — a genuine strength worth keeping.

There is a good counter-example to build on: `src/tools/tool-dispatcher.ts` is at **100%**.
The newer extracted path is well-tested. That is the pattern to expand, not replace.

---

## 6. P2 — the AI layer decision

The owner's instinct to remove it is supported by the code. `executionMode` defaults to
`'ce-mcp'` (`src/config/ai-config.ts:152`), `isAIExecutionEnabled()` returns false for that
mode (`:241`), and only 12 tools have directives — so **out of the box, ~18 tools advertise
analysis and return a JSON-wrapped instruction telling the caller to do it**:

```json
{
  "executionMode": "prompt-only",
  "prompt": "…",
  "instructions": { "howToUse": "Execute this prompt within your current conversation context…" }
}
```

`check_ai_execution_status` exists purely to explain this state. Both `ai-executor.ts:8` and
every `prompt-execution.ts` export already carry
`@deprecated … use OrchestrationDirective returns instead. See ADR-014` — while remaining
the live default path.

**Scale:** ~18,200 LOC (~16%), ~30 of 74 tools. But the hard coupling is small — **5 files**
import `ai-executor`, and `openai` is the only true external dependency. The bulk is
deletable string-building: `src/prompts/` (~6,500 LOC) and the APE/Reflexion/Knowledge-Gen
frameworks (~5,500 LOC).

**Decide, do not drift.** Remove it and replace prompt-returns with either deterministic
work or CE-MCP directives. Leaving a third mode in place is what produced the current state.

**Related, same shape:** the aggregator is ~2,600 LOC and 11 tools behind an opt-in SaaS,
with the vendor Supabase URL hardcoded in **three** places
(`adr-aggregator-client.ts:71`, `aggregator-endpoint-map.ts:147`, `config.ts:87`). It is
genuinely optional — 2 importers, degrades cleanly without a key. Worth a separate decision,
not this PRD's.

---

## 7. P2 — the ADR ledger disagrees with itself and with the code

The architecture this refactor is meant to honour is not currently legible.

- **ADR-001 decided SSE transport.** The code is stdio, exclusively —
  `src/index.ts:12` and `:8855`. Zero SSE references. ADR-001's Evolution Notes still claim
  _"This ADR Remains Valid For: SSE transport protocol selection."_ **Supersede it.**
- **ADR-018a says `❌ DON'T: Create orchestrator instances`.** Nine tools do, by name:
  `deployment-guidance`, `perform-research`, `deployment-analysis`, `llm-web-search`,
  `llm-cloud-management`, `interactive-adr-planning`, `troubleshoot-guided-workflow`,
  `adr-validation`, `deployment-readiness`. Three of ~12 were migrated.
- **`docs/adrs/README.md:20-22` lists ADR-012, 013 and 014 as _Proposed_** while all three
  files say _Accepted_. The index stops at 018 and omits 019, 020 and two others.
- **Duplicate ADR-018** — two files claim it; ADR-020 re-issues one of them and neither is
  marked Superseded. **ADR-016 does not exist.**
- **`docs/adrs/adr-0001-test-decision.md` is a leaked test fixture** — 25 bytes, literally
  `[ADR_CONTENT_PLACEHOLDER]`. Delete it.
- **ADR-006 still claims HCL/Dockerfile AST support** that ADR-017 removed.
- `src/tools/tool-dispatcher.ts:8` cites `docs/IMPLEMENTATION-PLAN.md`; the file is at
  `docs/planning/IMPLEMENTATION-PLAN.md`. Stale path, not a dangling reference.
- ADR-014 cites `/tmp/ce_mcp_analysis.md` as its source of truth. That file is gone, and
  every line number in ADR-014 is stale — it cites `src/index.ts:225-3170` for a file now
  9,738 lines long.

**ADR-019 (Vitest) is fully honoured** and under-reports itself — its own migration
checkboxes are still unchecked.

---

## 8. Sequencing

```
P0  openai dependency               independent, ship today
P0  recompile gh-aw locks           restores the validation net
    + report-failure-as-issue:false stops the issue flood

P1  coverage gate at measured floor  makes regression visible
P1  tsconfig.test.json               tests stop drifting silently
P1  MCP protocol integration test    replaces the grep-the-bundle guard
        ↓ only now is it safe to ↓
P1  one tool registry                the actual refactor, ~4,000 lines

P2  AI layer: decide and execute
P2  ADR ledger reconciliation
```

**The ordering is the point.** §4 is the valuable work and the most dangerous: the file it
touches has zero coverage, its CI guard is a `grep`, and the four AI validators built to
catch this class of breakage are down.

---

## 9. Governance

This repository is governed by [Repo Governor](https://github.com/tosin2013/repo-governor)
v0.4.1 (`.claude/skills/repo-governor`, `.repo-governor.json`). Admission is **milestone
membership**.

What that buys today, and what it does not:

|                               |                                                                                                                                           |
| ----------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| _is this work authorized?_    | **works** — `#741` reads `ADMITTED / NO_EXECUTION_AUTHORITY`; the auto-filed `[aw]` issues read `NOT_ADMITTED` and are correctly excluded |
| _is this work done?_          | **not yet** — `STOP_COMPLETE` is unreachable: no acceptance criteria exist                                                                |
| _do the ADRs constrain this?_ | **no** — 19 Accepted ADRs are read and `reported only; no disposition consults this`                                                      |

**None of the findings in this PRD came from the governance engine.** They came from
reading the code. The engine answered the authority question and nothing else, and saying
otherwise would credit it with capabilities it does not claim.

**First governance act:** #741's acceptance criteria are prose checkboxes. Convert them to
`.repo-governor/acceptance/741.json` with `command_exit` checks. That is what makes
`STOP_COMPLETE` reachable here — and for a refactor, the completion firewall is the half
that stops work running past its declared scope.

---

## 10. What this PRD does not claim

- **It does not estimate effort.** Every number here is a measurement; none is a schedule.
- **It does not settle the AI layer.** §6 states the evidence and the recommendation; the
  decision is the owner's and belongs in an ADR, not here.
- **It does not cover the aggregator.** Contained, optional, and a separate commercial
  question.
- **The 48.97% coverage figure is one local run** on `787ef912` with 70 tests skipped. It
  is a floor to ratchet from, not a target that was ever agreed.
