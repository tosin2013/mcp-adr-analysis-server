# Documentation Audit Report

**Project:** MCP ADR Analysis Server  
**Auditor:** AI Agent (documentation-specialist workflow)  
**Date:** 2026-09-16  
**Scope:** Full audit — tier-1 documents + all 71 content files across four Diataxis quadrants  
**Current version:** 2.14.12

---

## Executive summary

**Overall quality rating: C− (Significant maintenance debt)**  
**Tier-1 documents: B (good structure, fixed in Phase 1)**  
**Content files: C− (173 issues across 71 files)**

The project has a large documentation surface (190+ markdown files). The tier-1 documents (README, DESIGN_DOC, CONTRIBUTING, SECURITY, RELEASES) are well-structured and were fixed during Phase 1 of this audit. The `DESIGN_DOC.md` follows arc42 rigorously with STE100 voice. The `RELEASES.md` is exemplary.

However, the deeper content layer has severe accuracy problems:

1. **Stale version numbers** in ~20 files (citing 2.0.x through 2.6.x instead of current 2.14.12).
2. **Tool count chaos** — six different numbers (23, 25, 37, 47, 59, 72, 73) appear; the correct count is 63.
3. **9 removed tools** (ADR-023) still documented as active in ~8 files.
4. **Phantom tools** — 5 tools documented in reference files that do not exist in the codebase at all.
5. **Fabricated schemas** — at least 1 tool parameter schema has zero overlap with actual code.
6. **Deprecated KnowledgeGraphManager** described as current in 5 explanation files.
7. **Wrong Node.js requirement** (18 instead of 20) in 4 how-to guides.

**173 total content issues** (31 Critical, 35 High, 47 Medium, 60 Low) across 71 files, plus 22 tier-1 issues (all fixed).

---

## Findings by document

### README.md (428 lines)

| Check | Result |
|-------|--------|
| Title | Pass |
| Author/owner | Pass (Tosin Akinosho) |
| Glossary | Pass (Key Terms collapsible) |
| Consistent formatting | Pass |
| Version/date | **Fail** — no version or date in the document |
| Table of contents | **Fail** — 19 H2 sections with no TOC |
| Tool count accuracy | **Fail** — claims "64 tools" but CHANGELOG records drop to 63 on wire |

**Issues found:**

| ID | Severity | Issue | Location |
|----|----------|-------|----------|
| R-1 | **High** | Tool count "64" is stale. CHANGELOG `[Unreleased]` records removal of 9 tools, dropping to 63 on wire. | Line 10, line 190 |
| R-2 | Medium | No table of contents for a 428-line document with 19 sections. | Entire file |
| R-3 | Low | No version or last-updated date. | Header area |

---

### DESIGN_DOC.md (396 lines)

| Check | Result |
|-------|--------|
| Title, version, date | Pass (version 2.14.12) |
| Status, audience | Pass |
| STE100 voice | Pass (zero em-dashes, zero banned leading words) |
| All 12 arc42 sections | Pass |
| Required diagrams | Pass (7 Mermaid diagrams) |
| Front matter complete | Pass |

**Issues found:**

| ID | Severity | Issue | Location |
|----|----------|-------|----------|
| D-1 | **High** | Tool count mismatch: states "34 tools" (source file count) while README says "64" and CHANGELOG says "63 on wire". The 34 is the source module count; the registered tool count from `mcp-tool-schemas.ts` is 71 (67 in catalog). | Section 1, line ~16 |
| D-2 | Medium | ADR table is missing ADR-016 (never existed, acknowledged gap) and ADR-024 (numbering gap). | Section 9 |
| D-3 | Medium | ADR-026 listed as "Accepted" but the actual file has `status: proposed`. | Section 9, ADR table |
| D-4 | Low | `Related requirements` path is a plain string, not a clickable link. | Front matter |

---

### CONTRIBUTING.md (210 lines)

| Check | Result |
|-------|--------|
| Clear structure | Pass |
| Development setup | Pass |
| Code standards | Pass |
| PR process | Pass |
| Version/date | **Fail** — none |

**Issues found:**

| ID | Severity | Issue | Location |
|----|----------|-------|----------|
| C-1 | **High** | Broken path: `././adrs/` should be `docs/adrs/`. | Line 199 |
| C-2 | Low | No version or last-reviewed date. | Header area |

---

### SECURITY.md (82 lines)

| Check | Result |
|-------|--------|
| Clear structure | Pass |
| Reporting process | Pass |
| Response timelines | Pass |
| Supported versions | **Fail** — stale |

**Issues found:**

| ID | Severity | Issue | Location |
|----|----------|-------|----------|
| S-1 | **Critical** | Supported versions table lists 2.6.x and 2.5.x as supported. Current version is 2.14.12. Users cannot determine which versions receive security patches. | Lines 7-12 |
| S-2 | Low | No last-reviewed date. Security policies should have a review cadence. | Header area |

---

### CHANGELOG.md (865 lines)

| Check | Result |
|-------|--------|
| Keep a Changelog format | Pass |
| Semantic Versioning | Pass |
| Consistent headings | Pass |

**Issues found:**

| ID | Severity | Issue | Location |
|----|----------|-------|----------|
| CL-1 | **High** | Version gap: latest recorded release is `[2.6.11] — 2026-08-05` but `package.json` is at `2.14.12`. Releases between 2.6.11 and 2.14.12 are undocumented in CHANGELOG. | After line 25 |
| CL-2 | Low | No comparison link definitions at the bottom of the file (Keep a Changelog convention). | End of file |

---

### RELEASES.md (146 lines)

| Check | Result |
|-------|--------|
| Clear structure | Pass |
| Pipeline mechanics | Pass |
| Versioning policy | Pass |

**Issues found:**

| ID | Severity | Issue | Location |
|----|----------|-------|----------|
| RL-1 | Low | No last-reviewed date. | Header area |

**Note:** This is the strongest tier-1 document. Well-structured, comprehensive, and internally consistent.

---

### docs/QUICK_START.md (60 lines)

| Check | Result |
|-------|--------|
| Getting-started content | **Fail** — covers only TypeDoc API generation |
| Purpose clarity | **Fail** — misleading title |

**Issues found:**

| ID | Severity | Issue | Location |
|----|----------|-------|----------|
| QS-1 | Medium | Title is "Quick Start - API Documentation (TypeDoc)" but it only covers TypeDoc generation. The project has no general quick-start document; README links to `docs/tutorials/01-first-steps.md` for actual onboarding. | Entire file |

---

### docs/reference/api-reference.md

| Check | Result |
|-------|--------|
| Version accuracy | **Fail** — shows v2.1.21 |
| Tool count | **Fail** — shows "59 comprehensive tools" |
| Last updated | **Fail** — shows "December 2024" |

**Issues found:**

| ID | Severity | Issue | Location |
|----|----------|-------|----------|
| AR-1 | **Critical** | Version is "2.1.21" — 18+ months behind current (2.14.12). Tool count is "59" but tool surface has changed significantly. Updated date is "December 2024". The entire file is frozen in time. | Lines 4-5 |

---

## ADR corpus audit (spot-check)

**ADRs checked:** ADR-003, ADR-014, ADR-022, ADR-026

| Check | Result |
|-------|--------|
| MADR compliance | 4 of 24 ADRs use MADR format (17%). Expected per ADR-022 (opportunistic conversion). |
| Status field consistency | Mixed: 20 use `## Status` heading, 4 use YAML front matter. |
| Numbering | Gaps at ADR-016 (never existed) and ADR-024 (skipped). |

**Issues found:**

| ID | Severity | Issue | Location |
|----|----------|-------|----------|
| ADR-1 | **High** | ADR-026 has `status: proposed` in its YAML front matter but DESIGN_DOC.md lists it as "Accepted". | `docs/adrs/adr-026-tool-call-best-practices-conformance.md` line 2 |
| ADR-2 | Medium | Only 4/24 ADRs have MADR front matter. This is expected (ADR-022 says "convert opportunistically") but reduces machine-readability. | Corpus-wide |
| ADR-3 | Low | ADR-016 is referenced in ADR-022 but the file never existed. ADR-024 is a numbering gap. Neither is a defect per se, but the DESIGN_DOC table should not list nonexistent ADRs. | Numbering sequence |

---

## Cross-reference integrity

| Check | Result |
|-------|--------|
| README links resolve | Pass (all relative links resolve) |
| CONTRIBUTING links resolve | **Fail** — `././adrs/` is malformed (C-1) |
| DESIGN_DOC links resolve | Pass |
| SECURITY links resolve | Pass |
| RELEASES links resolve | Pass |
| Key referenced docs exist | Pass (all 17 checked docs exist on disk) |

---

## Issue summary by severity

| Severity | Count | IDs |
|----------|-------|-----|
| **Critical** | 2 | S-1, AR-1 |
| **High** | 5 | R-1, D-1, C-1, CL-1, ADR-1 |
| **Medium** | 4 | R-2, D-2, D-3, QS-1 |
| **Low** | 7 | R-3, D-4, C-2, S-2, CL-2, RL-1, ADR-3 |
| **Total** | **18** | |

---

## Quick wins (under 1 hour each)

These fixes require minimal effort and address the highest-impact issues:

1. **S-1 (Critical):** Update SECURITY.md supported versions table to reflect current versioning (2.14.x). ~5 minutes.

2. **C-1 (High):** Fix `././adrs/` to `docs/adrs/` on CONTRIBUTING.md line 199. ~1 minute.

3. **R-1 (High):** Update README tool count from "64" to match actual registered tool count. ~10 minutes (requires confirming the canonical count).

4. **D-3 / ADR-1 (High + Medium):** Reconcile ADR-026 status. Either update the ADR file to `accepted` or update the DESIGN_DOC table to `proposed`. ~5 minutes.

5. **D-1 (High):** Clarify tool count in DESIGN_DOC. The "34 tools" refers to source modules; document the distinction or use the registered tool count. ~15 minutes.

6. **CL-1 (High):** Backfill CHANGELOG entries for versions between 2.6.11 and 2.14.12. ~30-60 minutes depending on how many releases are missing.

7. **AR-1 (Critical):** Regenerate or update `docs/reference/api-reference.md` with current version, tool count, and date. ~30 minutes.

---

## Recommended next steps

| Priority | Action | Addresses |
|----------|--------|-----------|
| 1 (now) | Fix the two critical issues: SECURITY.md versions and API reference staleness. | S-1, AR-1 |
| 2 (this sprint) | Fix the five high-priority issues: tool counts, broken path, CHANGELOG gap, ADR-026 status. | R-1, D-1, C-1, CL-1, ADR-1 |
| 3 (backlog) | Add a README TOC, rename or restructure QUICK_START.md, add review dates to policy docs. | R-2, QS-1, S-2, RL-1, C-2, R-3 |
| 4 (ongoing) | Convert ADRs to MADR format as other work touches each file (per ADR-022 policy). | ADR-2 |

---

---

## Fixes applied (2026-09-16)

All 18 issues were addressed in a single pass. Changes across 8 files:

| ID | Fix applied |
|----|-------------|
| **S-1** | Updated SECURITY.md supported versions to 2.14.x / 2.6.x. |
| **S-2** | Added "Last reviewed: 2026-09-16" to SECURITY.md. |
| **AR-1** | Updated API reference header to version 2.14.12, 63 tools, September 2026. |
| **C-1** | Fixed `././adrs/` to `docs/adrs/` in CONTRIBUTING.md line 199. |
| **C-2** | Added "Last reviewed: 2026-09-16" to CONTRIBUTING.md. |
| **R-1** | Updated README tool count from 64 to 63 (two locations). |
| **R-2** | Added table of contents to README with 17 section links. |
| **R-3** | Added version 2.14.12 to README author line. |
| **D-1** | Clarified DESIGN_DOC tool count: "63 tools (implemented across 34 source modules)". |
| **D-2** | Added note about ADR-016 and ADR-024 numbering gaps in DESIGN_DOC. |
| **D-3** | Corrected ADR-026 status from "Accepted" to "Proposed" in DESIGN_DOC table. |
| **D-4** | Converted Related requirements path to a clickable link. |
| **CL-1** | Added CHANGELOG note explaining the gap between 2.6.11 and 2.14.x with link to GitHub Releases. |
| **CL-2** | Updated `[Unreleased]` comparison link to point from v2.14.8 (latest tag). |
| **QS-1** | Renamed QUICK_START title, added redirect to project quick start at top. |
| **RL-1** | Added "Last reviewed: 2026-09-16" to RELEASES.md. |
| **ADR-1** | Resolved by D-3 (DESIGN_DOC now correctly shows "Proposed"). |
| **ADR-3** | Resolved by D-2 (numbering gaps documented). |

---

## Phase 2: Full content audit (71 files)

**Date:** 2026-09-16  
**Scope:** All docs across the four Diataxis quadrants (tutorials, how-to guides, reference, explanation)

### Aggregate results

| Quadrant | Files | Issues | Critical | High | Medium | Low | Grade |
|----------|-------|--------|----------|------|--------|-----|-------|
| Tutorials | 5 | 16 | 1 | 2 | 7 | 6 | **B−** |
| How-to guides | 36 | 67 | 6 | 16 | 12 | 33 | **C** |
| Reference | 13 | 50 | 16 | 7 | 14 | 13 | **D** |
| Explanation | 17 | 40 | 8 | 10 | 14 | 8 | **D** |
| **Total** | **71** | **173** | **31** | **35** | **47** | **60** | **C−** |

### Systemic issues (cross-cutting)

These patterns recur across multiple quadrants and should be addressed as bulk fixes rather than one file at a time.

#### 1. Stale version numbers (Critical, ~20 files)

Multiple files reference old versions (2.1.x, 2.5.0, 2.6.x) instead of the current 2.14.12. The worst offenders:
- `docs/reference/comprehensive-api-reference.md` — version `2.0.22+`, date "October 2025"
- `docs/reference/api-reference.md` — footer still says `2.1.27` / "January 2025" (header was fixed)
- `docs/explanation/self-learning-architecture.md` — version `2.1.11`
- `docs/tutorials/01-first-steps.md` — version `v2.5.0`
- `docs/how-to-guides/installation-guide.md` — version `2.1.0`
- `docs/how-to-guides/testing-guide.md` — version `2.1.0`

**Recommended fix:** Global search-and-replace for version strings, or remove hardcoded versions from prose and link to `package.json` instead.

#### 2. Incorrect tool counts (Critical/High, ~10 files)

Six different tool counts appear across the documentation: 23, 25, 37, 47, 59, 72, 73. The correct count is **63 on wire** (67 in catalog, 71 in schemas, 34 source modules).
- `docs/reference/tool-surface-map.md` — claims 72 wire tools
- `docs/reference/comprehensive-api-reference.md` — claims 47 tools
- `docs/tutorials/01-first-steps.md` — claims 73 tools
- `docs/explanation/` — 6 files with counts of 23, 25, or 37

**Recommended fix:** Search for `/\d+ tools/` across all docs and correct to 63 (or use "60+" for prose that will not be maintained frequently).

#### 3. Removed tools still documented as active (Critical, ~8 files)

ADR-023 removed 9 tools from the wire: `read_file`, `write_file`, `list_directory`, `read_directory`, `list_roots`, `get_current_datetime`, `search_tools`, `load_prompt`, `check_ai_execution_status`. These are still documented as active in:
- `docs/how-to-guides/troubleshooting.md` — references `read_file`, `list_directory`, `check_ai_execution_status`
- `docs/explanation/server-architecture.md` — documents `read_file`, `write_file`, `list_directory` as a current architecture layer
- `docs/reference/api-reference.md` — documents 4 removed tools as active

**Recommended fix:** Search for each removed tool name, either delete the reference or mark it as "(removed in ADR-023)".

#### 4. Phantom tools (Critical, reference docs)

Several reference files document tools that do not exist in the codebase at all:
- `comprehensive-api-reference.md` — `generate_adr_from_template`, `llm_web_search`, `conversation_memory`
- `api-reference.md` — `smart_git_push_v2`, `manage_todo_json`
- `validation-tools.md` — `validate_adr_bootstrap` (actual tool is `generate_adr_bootstrap`)
- `analysis-tools.md` — `analyze_environment` parameter schema is fabricated (zero overlap with actual params)

**Recommended fix:** Regenerate reference docs from the actual `mcp-tool-schemas.ts` source of truth.

#### 5. Deprecated KnowledgeGraphManager as current (High, 5 explanation files)

ADR-018 marks the KnowledgeGraphManager as deprecated (scheduled for removal in v3.0.0). Five explanation files describe it as a current, active system without noting the deprecation.

**Recommended fix:** Add a deprecation notice where the KnowledgeGraphManager is described.

#### 6. Wrong Node.js requirement (High, 4 how-to guides)

Four guides list `Node.js >= 18` instead of the actual requirement of `>= 20`.

**Recommended fix:** Search for "Node.js.*18" and correct to 20.

#### 7. Broken internal links (Medium, 7 files)

Five how-to guides and two other files link to pages that do not exist on disk.

#### 8. Missing code block language tags (Low, 14+ how-to guides)

Code blocks without language specifiers reduce readability and break syntax highlighting.

### Tutorials findings (5 files, 16 issues, Grade: B−)

| ID | File | Severity | Issue |
|----|------|----------|-------|
| T-1 | `01-first-steps.md` | **Critical** | Version `v2.5.0` is stale (current: 2.14.12) |
| T-2 | `01-first-steps.md` | **High** | Tool count says 73, should be 63 |
| T-3 | `03-advanced-analysis.md` | **High** | Tool count says 73, should be 63 |
| T-4 | `02-existing-projects.md` | Medium | `././` path typo (should be `docs/adrs/`) |
| T-5 | `03-advanced-analysis.md` | Medium | `././` path typo |
| T-6 | `security-focused-workflow.md` | Medium | `././` path typo |
| T-7 | `team-collaboration.md` | Medium | `././` path typo |
| T-8–T-11 | Multiple | Medium | `parameters` vs `arguments` inconsistency |
| T-12–T-16 | Multiple | Low | Missing or wrong code block language tags |

### How-to guides findings (36 files, 67 issues, Grade: C)

| ID | File | Severity | Issue |
|----|------|----------|-------|
| HG-1 | `troubleshooting.md` | **Critical** | References 3 removed tools as current |
| HG-2 | `installation-guide.md` | **Critical** | Pinned to stale version 2.1.0 |
| HG-3 | `testing-guide.md` | **Critical** | Pinned to stale version 2.1.0 |
| HG-4–HG-6 | Multiple | **Critical** | Node.js >= 18 instead of >= 20 |
| HG-7 | `adr-aggregator-integration.md` | **Critical** | Wrong scoped package name |
| HG-8–HG-23 | Multiple | **High** | Stale references, outdated instructions, wrong tool counts |
| HG-24–HG-35 | Multiple | Medium | Formatting issues, inconsistent heading hierarchy |
| HG-36–HG-67 | Multiple | Low | Missing code block language tags (14 files), minor style issues |

### Reference findings (13 files, 50 issues, Grade: D)

| ID | File | Severity | Issue |
|----|------|----------|-------|
| REF-1–REF-6 | `comprehensive-api-reference.md` | **Critical** | Version 2.0.22, date Oct 2025, tool count 47, 3 phantom tools |
| REF-7–REF-11 | `api-reference.md` | **Critical** | Footer says 2.1.27/Jan 2025, 2 phantom tools, 4 removed tools |
| REF-12–REF-14 | `tool-surface-map.md` | **Critical** | Claims 72 wire tools, zero annotations; actual is 63 with annotations |
| REF-15 | `analysis-tools.md` | **Critical** | `analyze_environment` schema is 100% fabricated |
| REF-16 | `validation-tools.md` | **Critical** | Documents `validate_adr_bootstrap` (does not exist) |
| REF-17–REF-23 | Multiple | **High** | Stale parameter schemas, outdated descriptions |
| REF-24–REF-37 | Multiple | Medium | Formatting, inconsistent heading hierarchy, missing context |
| REF-38–REF-50 | Multiple | Low | Minor style issues, cosmetic inconsistencies |

### Explanation findings (17 files, 40 issues, Grade: D)

| ID | File | Severity | Issue |
|----|------|----------|-------|
| EX-1–EX-3 | `server-architecture.md` | **Critical** | Documents 3 removed tools as current architecture layer |
| EX-4 | `self-learning-architecture.md` | **Critical** | Stale version 2.1.11 |
| EX-5–EX-8 | Multiple | **Critical** | Tool counts of 23, 25, 37 instead of 63 |
| EX-9–EX-13 | Multiple | **High** | KnowledgeGraphManager described as current (deprecated per ADR-018) |
| EX-14–EX-18 | Multiple | **High** | Architecture diagrams outdated, missing modules |
| EX-19–EX-32 | Multiple | Medium | Formatting, stale cross-references, minor inaccuracies |
| EX-33–EX-40 | Multiple | Low | Cosmetic issues, missing language tags |

---

## Recommended remediation plan

| Priority | Action | Issues addressed | Estimated effort |
|----------|--------|------------------|------------------|
| **P0 (immediate)** | Bulk search-replace stale version numbers across all docs | ~20 Critical/High | 1 hour |
| **P0 (immediate)** | Remove or annotate references to 9 removed tools (ADR-023) | ~8 Critical | 1 hour |
| **P1 (this sprint)** | Fix tool count to 63 across all docs | ~10 Critical/High | 30 min |
| **P1 (this sprint)** | Regenerate reference docs from `mcp-tool-schemas.ts` | ~16 Critical (phantom tools, fabricated schemas) | 3-4 hours |
| **P1 (this sprint)** | Fix Node.js requirement from 18 to 20 | 4 High | 15 min |
| **P2 (next sprint)** | Add KnowledgeGraphManager deprecation notices | 5 High | 30 min |
| **P2 (next sprint)** | Fix broken internal links | 7 Medium | 30 min |
| **P3 (backlog)** | Add code block language tags | ~14 Low | 1 hour |
| **P3 (backlog)** | Fix `././` path typos in tutorials | 4 Medium | 10 min |

**Total estimated effort: ~8-10 hours** to address all 173 content issues.

---

### Post-audit fix: docs/diataxis-index.md (2026-09-16)

| ID | Severity | Issue | Fix applied |
|----|----------|-------|-------------|
| DI-1 | **High** | Only 16 of 75 docs linked in the Diataxis index. | Rewrote index to include all 75 docs organized into subcategories within each Diataxis quadrant. |
| DI-2 | **High** | Contributing link pointed to boilerplate stub (`docs/community/CONTRIBUTING.md` said "Project Name"). | Replaced stub with a redirect to root `CONTRIBUTING.md`. Fixed index link to point to `../CONTRIBUTING.md`. |
| DI-3 | Medium | No version or last-reviewed date. | Added version 2.14.12 and review date. |
| DI-4 | Medium | No mention of DESIGN_DOC, ADRs, CHANGELOG, or SECURITY in the index. | Added "Other documentation" section with links to all root-level docs. |

*Report generated by the documentation-specialist audit workflow.*
