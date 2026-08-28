---
status: accepted
date: 2026-08-28
decision-makers: Tosin Akinosho
consulted: Claude Code (measurement)
tags:
  - deployment
  - architecture
supersedes-in-part:
  - ADR-010
  - ADR-012
  - ADR-020
---

# ADR-025: Retire the bootstrap pattern-execution engine

> **Accepted 2026-08-28 by Tosin Akinosho.** It was drafted `Proposed` because retiring
> these assets contradicts three Accepted decisions, and the only honest route from
> `Accepted` is a superseding decision that says why — not a quiet deletion.

## Context and Problem Statement

ADR-010 decided a _"unified bootstrap deployment architecture that integrates Validated
Patterns, SystemCard, and Bootstrap Validation Loop into a single developer-facing
tool."_ ADR-012 decided the Validated Patterns Framework and records its Phase 1 and
Phase 2 as `✅ COMPLETE`. ADR-020 decided DAG-based parallel execution via `DAGExecutor`.

All three are Accepted. **None of what they decided is reachable at runtime.**

The question this ADR asks: given that the decided architecture was built and then never
connected, is the right correction to connect it or to retire it?

### Measured, on `main` at v2.7.23

| claim                                                        | evidence                                                                                                                                                                                        |
| ------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `BootstrapValidationLoop` is constructed and never read      | `generateGuidedExecutionInstructions` declares `loop:` and never references it again — one occurrence in the whole function, its own type annotation                                            |
| `executeLoop` has zero callers                               | `grep -rn executeLoop src/ tests/ scripts/` returns only its own definition                                                                                                                     |
| every `execAsync` site is inside the class                   | removing the class made `execAsync` unused; `tsc` reported it                                                                                                                                   |
| the patterns never shipped                                   | `package.json` `files: ["dist/", "README.md", "LICENSE"]`; `PatternLoader` resolves `<pkg-root>/patterns`, absent in any installed copy, so `loadPattern` returns `null` for every npm consumer |
| `patterns/README.md` documents a tree that has never existed | it lists `docker.yaml`, `azure.yaml`, and `runtime/`, `composite/`, `protocol/` directories; only `infrastructure/` was ever created                                                            |
| the live path uses a different source                        | guided mode calls `getPattern` from `validated-pattern-definitions.ts`, a hardcoded TypeScript table — not the YAML                                                                             |

Deleting the class and letting the consequences fall removes:

| asset                                  |         lines | bound by         |
| -------------------------------------- | ------------: | ---------------- |
| `BootstrapValidationLoop` (class body) |         2,003 | ADR-010, ADR-020 |
| `dynamic-deployment-intelligence.ts`   |           608 | —                |
| `pattern-loader.ts`                    |           359 | ADR-012          |
| `pattern-to-dag-converter.ts`          |           368 | ADR-012          |
| `pattern-contribution-helper.ts`       |           361 | ADR-012          |
| `dag-executor.ts`                      |           636 | ADR-020          |
| `system-card-manager.ts`               |           526 | ADR-010, ADR-012 |
| `resource-extractor.ts`                |           409 | —                |
| `deployment-task-integration.ts`       |           593 | —                |
| `patterns/infrastructure/*.yaml`       | 5 files, 128K | ADR-012          |
| tests of the above                     |         3,238 | —                |

`system-card-manager` and `resource-extractor` are reachable today only through
`dag-executor`, which is reachable only through the class. They are one machine.

**Verified**: with the class removed, the guided-mode output is byte-for-byte identical
across five call shapes (iteration 0, iteration 1 with prior output, cleanup with and
without `appSelector`, and a production run), and the tool's own 29 tests pass unchanged.

### What is genuinely at stake

The engine is not junk. `detectAvailableDeploymentPlatforms` probes twelve real
binaries; the DAG executor and SystemCard resource tracking are substantive. The
argument for retirement is not that the code is bad — it is that it has never run, has
no test that exercises it end to end, and describes a shape this project has since
decided against.

That last point matters most. ADR-023 scoped the supported surface on the principle that
the host does what the host can do. An engine that runs `docker ps`,
`kubectl get all --all-namespaces` and `bash` on the user's behalf is the confused-deputy
shape: an MCP server taking actions the calling agent should take, with the server's
privileges rather than the agent's. Guided mode — telling the agent what to run — is the
shape this project chose, and #1536 has already had to make one of those emitted commands
safe.

## Considered Options

1. **Retire the engine.** Delete the class and everything reachable only through it;
   correct `CLAUDE.md` and `patterns/README.md` to describe what exists.
2. **Connect it.** Wire `executeLoop` to the tool, add `patterns/` to `package.json`
   `files`, and write the end-to-end tests it has never had. Makes the server execute
   deployments itself.
3. **Keep the YAML as documentation, delete the code.** Retains five pattern files as
   reference material; drops 2,657 lines of unreachable machinery.
4. **Leave it.** Costs nothing today except that every reader of ADR-010, ADR-012 and
   ADR-020 believes a system exists that does not.

## Decision

**Option 1: retire the engine.** Delete `BootstrapValidationLoop` and everything
reachable only through it, delete `patterns/infrastructure/*.yaml` with their loader, and
correct the records that describe them.

The disposition adds a reason this ADR did not originally carry, and it is the stronger
one: **bootstrap pattern-execution is a Skill, not an MCP server.**

That is the same principle ADR-023 used to scope the tool surface — *the host does what
the host can do* — applied one level down. The distinction in the ecosystem is now
explicit: an MCP server answers **what can this agent reach**; a Skill answers **how
should this agent do the work**. MCP is for data that changes between invocations and for
systems the agent cannot otherwise touch. Skills are for procedural knowledge — "the
steps to cut a release" is the canonical example, and "the phases, validation checks and
remediation steps for deploying to Kubernetes" is the same shape.

Everything this engine held is procedure and reference material, not reach:

| what it is | why a Skill fits better |
| --- | --- |
| `patterns/infrastructure/*.yaml` — phases, validation checks, remediation steps | reference material loaded on demand. Progressive disclosure means a skill costs its name and description until it is triggered, so 128K of pattern definitions cost nothing until a deployment is actually happening |
| `deploymentPhases`, `validationChecks` | step-by-step procedure — the documented core Skill use case |
| script generation and execution | a Skill bundles scripts that run in the agent's own session; the code never enters context, only its output does |
| `detectAvailableDeploymentPlatforms` probing twelve binaries | the agent already has shell access to its own machine |

Three consequences follow, and each is a defect this repository already has:

1. **Context.** ADR-023 measured `tools/list` at 94,571 bytes (~24K tokens) across 75
   tools, against Cursor's 40-tool cap. A tool pays that cost on every session. A Skill
   pays it only when invoked.
2. **Distribution.** The patterns were never in `package.json` `files`, so they have
   never reached a single npm consumer. A Skill is a directory that ships as itself —
   the failure mode is structurally absent.
3. **Privilege.** This is the decisive one. An MCP server executing `docker ps`,
   `kubectl get all --all-namespaces` and `bash` runs them with the *server's*
   privileges, not the requesting user's — the documented confused-deputy failure, and
   the top-listed hazard for MCP servers that shell out. A Skill's scripts run in the
   agent's session under the user's own credentials, with the host's existing approval
   flow in front of them. Retiring the engine removes the exposure rather than
   mitigating it; #1536 had already been reduced to making one emitted command safer.

**Not decided here:** whether such a Skill gets written. This ADR retires the engine. If
the capability is wanted, ADR-023's declassification route applies — publish it as a
Skill, or point at an existing deployment MCP server, rather than rebuilding it here.

## Consequences

**If option 1 is ratified:**

- ADR-010, ADR-012 and ADR-020 must move to `Superseded (in part)` and cite this ADR.
  ADR-012's `Phase 1: ✅ COMPLETE` checkboxes become false the moment the YAML is
  deleted; they have to be corrected in the same change, or the ledger states something
  untrue.
- `.github/workflows/validate-patterns.yml` lints `patterns/**/*.yaml` and has nothing
  left to lint. It needs deleting or narrowing.
- `tests/utils/pattern-validation.test.ts` validates files that no longer exist.
- ~5,866 source lines and ~3,238 test lines go — the largest single reduction available
  in the Cleanup milestone, and roughly 5% of `src/`.
- The negative consequence, stated plainly: if deployment execution is ever wanted, it
  is rebuilt rather than revived. Git history keeps it, but nobody reads git history for
  a capability they do not know existed.

**If option 2 is ratified:** the confused-deputy exposure becomes real rather than
latent, and it needs a threat model before it ships — the server would run privileged
cluster commands on behalf of a caller it cannot authenticate.

## Research

Consulted 2026-08-28. The Skill-versus-MCP boundary is stated consistently across
sources: *"An MCP server answers 'what can this agent reach,' and a Skill answers 'how
should this agent do the work.'"* Skills are recommended for procedural knowledge and
tool-agnostic workflow logic and cost near-zero context until triggered; MCP is
recommended for live system access and data that changes between invocations. Skills load
by progressive disclosure — name and description at discovery, full `SKILL.md` only on
activation, bundled scripts and references only at execution.

On privilege, the MCP security literature is direct: a server exposing shell execution
creates a confused deputy, because *"the MCP server executes actions with its own (often
broad) privileges, not the requesting user's permissions."* The stated remedy is least
privilege and user-scoped execution — which a Skill gets for free by running inside the
agent's own session.

Sources:

- [Skills vs MCP servers: when to pick which — The Circuit](https://metacircuits.substack.com/p/the-285-billion-question-skills-vs)
- [MCP Servers vs Agent Skills: Which to Build in 2026 — Developers Digest](https://www.developersdigest.tech/blog/mcp-servers-vs-agent-skills-2026)
- [Agent Skills vs MCP: Architecture and Decision Guide — Atlan](https://atlan.com/know/ai-agent/ai-agent-skills/agent-skills-vs-mcp/)
- [AI Agent Skills Explained: The Missing Procedural Memory Layer](https://aicloudweekly.substack.com/p/ai-agent-skills-explained-the-missing)
- [MCP Security Cheat Sheet — OWASP](https://cheatsheetseries.owasp.org/cheatsheets/MCP_Security_Cheat_Sheet.html)
- [Model Context Protocol — Security Best Practices](https://modelcontextprotocol.io/docs/2026-07-28/tutorials/security/security_best_practices)

## Related

- #1538 — the issue that measured this
- ADR-018 — atomic tools; orchestrator construction is the pattern being unwound
- ADR-023 — supported surface, and the host-does-what-the-host-can principle
- #1536 — the emitted `kubectl delete` that had to be made safe
