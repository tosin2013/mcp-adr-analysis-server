---
status: proposed
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

> **Proposed.** Nothing in this ADR may be relied on until it is ratified, and no code
> is deleted on its authority yet. It exists because retiring these assets contradicts
> three Accepted decisions, and the only honest route from `Accepted` is a superseding
> decision that says why — not a quiet deletion.

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

> Unfilled, as in ADR-021 and ADR-023. The disposition is the owner's.

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

## Related

- #1538 — the issue that measured this
- ADR-018 — atomic tools; orchestrator construction is the pattern being unwound
- ADR-023 — supported surface, and the host-does-what-the-host-can principle
- #1536 — the emitted `kubectl delete` that had to be made safe
