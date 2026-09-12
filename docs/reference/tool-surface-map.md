# Tool Surface Map

> **Reference / evidence, not a decision.** This document maps the MCP tool surface
> and scores it against current tool-call best practices so removal and refactor
> candidates are visible in one place. It **authorises nothing**. Which tools exist
> is decided by [ADR-023](../adrs/adr-023-tool-surface-scope.md); consolidation of
> the deferred clusters by ADR-024; tool-call conformance by
> [ADR-026](../adrs/adr-026-tool-call-best-practices-conformance.md). Any actual
> removal runs through an ADR Decision, then `retirement.py` per asset, then its own
> admission. Candidates below are **discoveries**.

Measured on `main`, 2026-09-02. Line references drift; re-verify with the command in
each row before relying on one.

## How the surface works

| Concern                                                   | Where                                                                                                                                 | Note                                                                                                                                                                                                                                                 |
| --------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Wire registration (`tools/list`)                          | `src/mcp-adr-analysis-server.ts:235`                                                                                                  | Calls `getToolListForMCP({ mode: 'full' })`, which returns the canonical `MCP_TOOL_SCHEMAS` array (`src/tools/mcp-tool-schemas.ts`) = **72 tools over the wire**. `src/index.ts` is now a 79-line shim — the tool list is no longer hardcoded there. |
| Catalog (metadata for `search_tools`)                     | `src/tools/tool-catalog.ts`                                                                                                           | **68 declared** `TOOL_CATALOG.set(...)` entries (category, tokenCost, requiresAI, hasCEMCPDirective, inputSchema) + **4 backfilled from the wire** by the loop at `:2103` = **72 at runtime**.                                                       |
| Dispatch + CE-MCP gating                                  | `src/mcp-adr-analysis-server.ts:241-304`                                                                                              | `CallToolRequestSchema` handler; CE-MCP directive check (`shouldUseCEMCPDirective`) at `:266-300` short-circuits 12 directive tools before `dispatchTool()` at `:304` (`src/tools/tool-dispatch.ts:30`).                                             |
| CE-MCP directives                                         | `src/tools/ce-mcp-tools.ts:1406-1447`                                                                                                 | **12** `case` entries.                                                                                                                                                                                                                               |
| Lightweight listing (exists, wired in, configured `full`) | `src/tools/tool-dispatcher.ts:139-171`                                                                                                | `getToolListForMCP({mode})` **is** the live `tools/list` source (#1416). It is called with `mode: 'full'` (all 72 full schemas); a `mode: 'lightweight'` path (`:151-166`) already exists but is unused. Not dead code — a configuration choice.     |
| `search_tools` meta-tool                                  | `getSearchToolsDefinition()` in `src/tools/mcp-tool-schemas.ts:9`; executor `executeSearchTools` at `src/tools/tool-dispatcher.ts:77` | Category enum at `mcp-tool-schemas.ts:19-30` lists 10 categories and **omits `aggregator`**.                                                                                                                                                         |

## Best-practices scorecard

Basis: [MCP Client Best Practices, 2026-07-28](https://modelcontextprotocol.io/docs/2026-07-28/develop/clients/client-best-practices) · [Tools spec](https://modelcontextprotocol.io/specification/2026-07-28/server/tools).

| Practice                                                                                            | Verdict                       | Evidence (reproduce)                                                                                                                                                                                                                                                                                                                                                                       |
| --------------------------------------------------------------------------------------------------- | ----------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **`outputSchema` on tools** (enables code mode / typed calling)                                     | ❌ **0 of 72**                | `rg -n "outputSchema" src` → only `prompt-composition.ts:232-255`, an unrelated helper.                                                                                                                                                                                                                                                                                                    |
| **MCP annotations** (`readOnlyHint`, `destructiveHint`, `idempotentHint`, `openWorldHint`, `title`) | ❌ **none**                   | `rg -c "readOnlyHint\|destructiveHint\|idempotentHint\|openWorldHint" src` → 0. `read_file` is read-only, `write_file`/`smart_git_push` are destructive — unmarked.                                                                                                                                                                                                                        |
| **Progressive discovery deferred to host**                                                          | ❌ reimplemented              | Server ships `search_tools`/`load_prompt`; spec assigns this to the host (OpenAI/Anthropic ship it).                                                                                                                                                                                                                                                                                       |
| **Token budget < 1–5% of context**                                                                  | ❌ 3–12× over                 | ~94,571 B / ~24K tokens ([ADR-023:38](../adrs/adr-023-tool-surface-scope.md)); 11.8% of 200K, 2.4% of 1M.                                                                                                                                                                                                                                                                                  |
| **Uses lightweight listing when over budget**                                                       | ❌ configured to `full`       | `getToolListForMCP()` (`tool-dispatcher.ts:139`) **is** the live wire source and ships all 72 full schemas; its `mode: 'lightweight'` path (`:151-166`) exists but is not selected. One-line config, not dead code.                                                                                                                                                                        |
| **Catalog integrity (every wire tool discoverable)**                                                | ⚠️ backfilled, not classified | `get_gaps`, `search_codebase`, `set_project_path`, `update_knowledge` have no explicit catalog entry; the backfill loop (`tool-catalog.ts:2103`) folds them in with default `utility` metadata, so `search_tools` _does_ find them — but mis-categorised and under-described (`get_gaps` duplicates `analyze_gaps`). `search_tools` enum still drops `aggregator` (10 tools unfilterable). |
| **Tool count within selection-accuracy band**                                                       | ❌ 72 (band is ~30–50)        | Anthropic: tool-selection accuracy degrades past **~30–50 tools**; under ~10 the full list is fine; above, use host tool search. ADR-023's 54 is still at the top of the band; ADR-024 consolidation gets inside it.                                                                                                                                                                       |
| **Fewer, single-domain tools**                                                                      | ⚠️ 72 tools, 11 categories    | Spec: "five well-described tools beat fifty." ADR-023 cuts to 54 supported.                                                                                                                                                                                                                                                                                                                |

## Per-tool inventory

72 over the wire (68 explicitly declared in `TOOL_CATALOG` + 4 backfilled from the
wire at load, so 72 catalogued at runtime). **`outputSchema` = false and
annotations = none for every tool** — omitted from the table as uniform. `Cand.` =
candidate disposition (discovery): **K** keep · **Rm** remove (host-native / dead) ·
**Rf** refactor (needs directive/schema/annotations/consolidation) · **D** deferred
to ADR-024 · **Agg** aggregator (ADR-023 "separate commercial question").

### analysis (4) — `tool-catalog.ts:132-233`

| tool                      | what it does                                     | tokens     | AI  | CE-MCP | Cand. |
| ------------------------- | ------------------------------------------------ | ---------- | --- | ------ | ----- |
| analyze_project_ecosystem | Comprehensive project + architectural analysis   | 8000-15000 | ✓   | ✓      | K/Rf  |
| get_architectural_context | Retrieve architectural context + knowledge graph | 2000-5000  | –   | –      | K     |
| analyze_environment       | Analyse deployment environment config            | 2000-4000  | ✓   | ✓      | K     |
| smart_score               | Code-quality / architecture scores               | 3000-6000  | ✓   | ✓      | K     |

### adr (12) — `tool-catalog.ts:234-451, 758-767`

| tool                       | what it does                    | tokens    | AI  | CE-MCP | Cand. |
| -------------------------- | ------------------------------- | --------- | --- | ------ | ----- |
| suggest_adrs               | ADR suggestions from analysis   | 3000-6000 | ✓   | ✓      | K     |
| generate_adr_from_decision | ADR from a decision             | 2000-4000 | ✓   | –      | Rf    |
| generate_adrs_from_prd     | ADRs from a PRD                 | 4000-8000 | ✓   | ✓      | K     |
| discover_existing_adrs     | Find + index ADRs               | 500-1500  | –   | –      | K     |
| validate_adr               | Validate one ADR                | 500-1500  | –   | –      | K     |
| validate_all_adrs          | Validate all ADRs               | 1000-3000 | –   | –      | K     |
| analyze_adr_timeline       | ADR evolution over time         | 1500-3000 | ✓   | –      | Rf    |
| compare_adr_progress       | Compare implementation progress | 2000-4000 | ✓   | –      | Rf    |
| review_existing_adrs       | Review existing ADRs            | 2000-4000 | ✓   | –      | Rf    |
| generate_adr_bootstrap     | Bootstrap ADR infra             | 500-1500  | –   | –      | K     |
| interactive_adr_planning   | Interactive planning session    | 3000-6000 | ✓   | ✓      | K     |
| generate_adr_todo          | TODO.md from ADRs (TDD pairing) | 800-3000  | –   | –      | K     |

### content-security (6) — `tool-catalog.ts:469-583`

| tool                        | what it does                       | tokens    | AI  | CE-MCP | Cand. |
| --------------------------- | ---------------------------------- | --------- | --- | ------ | ----- |
| analyze_content_security    | Scan content for security concerns | 1500-3000 | ✓   | –      | Rf    |
| generate_content_masking    | Generate masking rules             | 1000-2500 | ✓   | –      | Rf    |
| apply_basic_content_masking | Apply basic masking                | 200-500   | –   | –      | K     |
| configure_custom_patterns   | Configure masking patterns         | 200-500   | –   | –      | K     |
| validate_content_masking    | Validate masking                   | 300-800   | –   | –      | K     |
| configure_output_masking    | Configure output masking           | 200-400   | –   | –      | K     |

### research (4) — `tool-catalog.ts:598-671`

| tool                        | what it does         | tokens     | AI  | CE-MCP | Cand. |
| --------------------------- | -------------------- | ---------- | --- | ------ | ----- |
| perform_research            | Research a topic     | 4000-10000 | ✓   | ✓      | K/Rf  |
| incorporate_research        | Incorporate findings | 2000-4000  | ✓   | –      | D     |
| generate_research_questions | Generate questions   | 1500-3000  | ✓   | –      | D     |
| create_research_template    | Create template      | 500-1000   | –   | –      | D     |

### deployment (7) — `tool-catalog.ts:687-878`

| tool                         | what it does                           | tokens    | AI  | CE-MCP | Cand. |
| ---------------------------- | -------------------------------------- | --------- | --- | ------ | ----- |
| deployment_readiness         | Check deployment readiness             | 2000-4000 | ✓   | ✓      | K     |
| release_tracking             | Releases mapped to ADR decisions       | 2000-6000 | –   | –      | K     |
| smart_git_push               | Intelligent git push (**destructive**) | 1000-2500 | –   | –      | K/Rf  |
| bootstrap_validation_loop    | Guided validation loop                 | 3000-6000 | ✓   | –      | Rf    |
| analyze_deployment_progress  | Analyse deployment progress            | 1500-3000 | –   | –      | K     |
| generate_deployment_guidance | Generate guidance                      | 2000-4000 | ✓   | –      | Rf    |
| troubleshoot_guided_workflow | Guided troubleshooting                 | 3000-7000 | ✓   | ✓      | K     |

### memory (6) — `tool-catalog.ts:895-1003` — cluster **deferred to ADR-024**

| tool                       | what it does            | tokens    | AI  | CE-MCP | Cand. |
| -------------------------- | ----------------------- | --------- | --- | ------ | ----- |
| memory_loading             | Load memory context     | 500-2000  | –   | –      | D     |
| expand_memory              | Expand memory           | 300-800   | –   | –      | D     |
| query_conversation_history | Query history           | 500-1500  | –   | –      | D     |
| get_conversation_snapshot  | Conversation snapshot   | 300-800   | –   | –      | D     |
| get_memory_stats           | Memory statistics       | 200-400   | –   | –      | D     |
| expand_analysis_section    | Expand analysis section | 1500-3000 | ✓   | –      | D     |

### file-system (5) — `tool-catalog.ts:1019-1110` — **host-native, ADR-023 REMOVE** — **deprecation landed (#1639)**

All five now carry `deprecated: true` in the catalog and a `[DEPRECATED host-native,
ADR-023]` marker on their wire descriptions. Next step is per-asset `retirement.py`, not
another marker.

| tool           | what it does                                | tokens   | AI  | CE-MCP | Cand. |
| -------------- | ------------------------------------------- | -------- | --- | ------ | ----- |
| read_file      | Read file (host provides)                   | 100-5000 | –   | –      | Rm    |
| write_file     | Write file (host provides, **destructive**) | 100-1000 | –   | –      | Rm    |
| read_directory | Read directory (host provides)              | 100-1000 | –   | –      | Rm    |
| list_directory | List directory (host provides)              | 100-500  | –   | –      | Rm    |
| list_roots     | List roots (MCP `roots` capability)         | 50-200   | –   | –      | Rm    |

### rules (3) — `tool-catalog.ts:1122-1177`

| tool            | what it does               | tokens    | AI  | CE-MCP | Cand. |
| --------------- | -------------------------- | --------- | --- | ------ | ----- |
| generate_rules  | Generate validation rules  | 3000-6000 | ✓   | ✓      | K     |
| validate_rules  | Validate rules vs codebase | 1500-3000 | –   | –      | K     |
| create_rule_set | Create rule set            | 500-1000  | –   | –      | K     |

### workflow (5) — `tool-catalog.ts:1190-1298` — `get_*_guidance` deferred to ADR-024

| tool                        | what it does            | tokens    | AI  | CE-MCP | Cand. |
| --------------------------- | ----------------------- | --------- | --- | ------ | ----- |
| get_workflow_guidance       | Workflow guidance       | 1500-3000 | ✓   | –      | D     |
| get_development_guidance    | Development guidance    | 1500-3000 | ✓   | –      | D     |
| mcp_planning                | MCP planning assistant  | 3000-6000 | ✓   | ✓      | K     |
| tool_chain_orchestrator     | Orchestrate tool chains | 2000-5000 | ✓   | ✓      | K     |
| request_action_confirmation | Request confirmation    | 100-300   | –   | –      | K     |

### utility (6) — `tool-catalog.ts:1299-1387`, `search_tools ~1823`

| tool                      | what it does                          | tokens  | AI  | CE-MCP | Cand.                                 |
| ------------------------- | ------------------------------------- | ------- | --- | ------ | ------------------------------------- |
| manage_cache              | Cache operations                      | 100-500 | –   | –      | K                                     |
| check_ai_execution_status | Check AI execution mode               | 100-300 | –   | –      | Rm (dies with AI layer)               |
| get_server_context        | Server context                        | 200-500 | –   | –      | K                                     |
| get_current_datetime      | Current date/time (host provides)     | 50-100  | –   | –      | Rm (deprecated #1639)                 |
| load_prompt               | On-demand prompt (CE-MCP meta)        | 100-500 | –   | –      | Rm (host discovery; deprecated #1639) |
| search_tools              | Tool search meta-tool (host provides) | 100-300 | –   | –      | Rm (host discovery; deprecated #1639) |

### aggregator (10) — `tool-catalog.ts:1424-1774` — ADR-023 "separate commercial question"

| tool                         | what it does                     | tokens    | AI  | CE-MCP | Cand. |
| ---------------------------- | -------------------------------- | --------- | --- | ------ | ----- |
| sync_to_aggregator           | Sync ADRs to Aggregator platform | 1000-3000 | –   | –      | Agg   |
| get_adr_context              | ADR context from aggregator      | 500-1500  | –   | –      | Agg   |
| get_staleness_report         | ADR staleness report             | 300-800   | –   | –      | Agg   |
| get_adr_templates            | ADR templates                    | 300-1000  | –   | –      | Agg   |
| get_adr_diagrams             | Mermaid diagrams (Pro+)          | 500-1500  | –   | –      | Agg   |
| validate_adr_compliance      | Compliance check (Pro+)          | 1000-2500 | –   | –      | Agg   |
| get_knowledge_graph          | Knowledge graph (Team)           | 1000-3000 | –   | –      | Agg   |
| update_implementation_status | Update impl status (Pro+)        | 300-800   | –   | –      | Agg   |
| get_adr_priorities           | ADR priorities for roadmap       | 500-1500  | –   | –      | Agg   |
| analyze_gaps                 | Gaps between ADRs and codebase   | 800-3000  | –   | –      | Agg   |

### BACKFILLED (4) — no explicit catalog entry; folded in with default `utility` metadata

Dispatched from `src/tools/tool-dispatch.ts`. Each is in the wire (`MCP_TOOL_SCHEMAS`)
but has no `TOOL_CATALOG.set(...)` of its own, so the backfill loop
(`tool-catalog.ts:2103`) classifies it as `utility` with placeholder tokenCost and
name-split keywords. `search_tools` _can_ surface them, but mis-categorised and
under-described — the fix is a proper catalog entry per tool.

| tool             | dispatch               | Cand.                                          |
| ---------------- | ---------------------- | ---------------------------------------------- |
| search_codebase  | `tool-dispatch.ts:142` | Rm/Rf (host Grep/Glob overlap)                 |
| update_knowledge | `tool-dispatch.ts:228` | Rf (catalogue or remove)                       |
| set_project_path | `tool-dispatch.ts:251` | Rf (catalogue or remove)                       |
| get_gaps         | `tool-dispatch.ts:324` | **Rm/Rf — overlaps catalogued `analyze_gaps`** |

## Candidate summary (discoveries — not decisions)

| Group                              | Count                                                                                                                                                                       | Route                                                                                                                                                                                           |
| ---------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Remove — host-native** (ADR-023) | 8 exposed (`read_file`, `write_file`, `read_directory`, `list_directory`, `list_roots`, `get_current_datetime`, `search_tools`, `load_prompt`) + 3 already absent (`llm_*`) | **Deprecation DONE** (#1639, merged, closed #1638): all 8 carry `deprecated: true` + `[DEPRECATED host-native, ADR-023]` wire markers. **Next: per-asset `retirement.py` → Cleanup milestone.** |
| **Dies with the AI layer**         | 1 (`check_ai_execution_status`)                                                                                                                                             | Goes with ADR-021 migration Batch 7 / retirement                                                                                                                                                |
| **Deferred cluster**               | 15 (memory 6, workflow 5, research 4)                                                                                                                                       | ADR-024, pending usage data                                                                                                                                                                     |
| **Aggregator**                     | 10                                                                                                                                                                          | ADR-023 "separate commercial question"                                                                                                                                                          |
| **Backfilled, not classified**     | 4 (esp. `get_gaps` vs `analyze_gaps` overlap)                                                                                                                               | ADR-026 / #1416: give each a proper `TOOL_CATALOG` entry so it is categorised, not defaulted to `utility`                                                                                       |
| **Refactor (quality)**             | all survivors                                                                                                                                                               | ADR-026: add `outputSchema` + annotations, defer discovery, fix the `aggregator` enum, flip the wire listing from `mode: 'full'` to `mode: 'lightweight'`                                       |

## Sources

- [MCP Client Best Practices (2026-07-28)](https://modelcontextprotocol.io/docs/2026-07-28/develop/clients/client-best-practices)
- [MCP Tools specification (2026-07-28)](https://modelcontextprotocol.io/specification/2026-07-28/server/tools)
- [MCP Tool Schema Design Guide 2026](https://kansei-link.com/en/insights/mcp-tool-schema-design-guide-2026.html)
- [Progressive Tool Discovery for Token Efficiency](https://github.com/modelcontextprotocol/modelcontextprotocol/discussions/1923)
- [Anthropic — Writing effective tools for agents](https://www.anthropic.com/engineering/writing-tools-for-agents) · [Tool search tool](https://platform.claude.com/docs/en/agents-and-tools/tool-use/tool-search-tool) — tool-selection accuracy degrades past ~30–50 tools
- [ADR-023](../adrs/adr-023-tool-surface-scope.md) · [ADR-026](../adrs/adr-026-tool-call-best-practices-conformance.md)
