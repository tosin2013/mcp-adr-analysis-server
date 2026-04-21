# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog 1.1.0](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).
For the release cadence and policy, see [RELEASES.md](./RELEASES.md) (tracked in #777).

## [Unreleased]

_No unreleased changes._

---

## [2.5.0] — 2026-04-19

### Added

- `release_tracking` MCP tool for ADR-driven release management.
- MCP Registry metadata (`server.json`, `mcpName` in `package.json`) for official registry submission.

### Changed

- Bulk development-dependencies upgrade across the repository (25 packages in a single PR, #683).
- `github/gh-aw` bumped 0.45.0 → 0.65.0 (#678); `actions/deploy-pages` 4 → 5; `actions/upload-artifact` 6 → 7; `actions/download-artifact` 6 → 8; `actions/cache` 5.0.3 → 5.0.4.
- `jose` bumped 6.1.3 → 6.2.1 (production).

### Fixed

- npm audit vulnerabilities resolved and security docs updated (#691).
- `publish.yml` OIDC version check for npm publishing.
- `gh-aw` lock files regenerated for v0.68.3; `docs-site-validator` config.

---

## [2.4.1] — 2026-03-20

### Changed

- Version bumped to v2.4.0/v2.4.1 to enable MCP Registry publishing (#666, #667). No code changes.

---

## [2.3.1] — 2026-03-20

### Added

- MCP Registry metadata for official registry submission (#662). Paves the way for the v2.4.1 publishing bump.

---

## [2.3.0] — 2026-03-16

### Added

- Register `search_tools` in `ListToolsRequestSchema` handler (#617).

### Changed

- `release-drafter/release-drafter` bumped 6 → 7 (#616); `github/gh-aw` 0.49.3 → 0.58.3 (#613); `actions/upload-artifact` 6 → 7 (#588); `actions/download-artifact` 7 → 8 (#615).
- `@modelcontextprotocol/sdk` and related MCP SDK updates rolled up (#555, #575).
- Development-dependencies group rollups (#482, #483) and tailwind-merge 2.x → 3.x for internal tooling.

### Fixed

- Remove duplicate `search_tools` registration.
- `docs-noob-tester` workflow aligned with the current documentation infrastructure.
- Pattern validation and Release Drafter CI issues.
- `node ecosystem` added to `gh-aw` network allowlist for agentic workflows.

### Security

- Three high-severity npm vulnerabilities resolved via `npm audit fix`.

---

## [2.2.2] — 2026-03-03

### Added

- Aggregator endpoint mapping, integration tests, and CI workflow for the ADR Aggregator integration.

### Fixed

- Workflow step condition now uses `env` context rather than `secrets` (GitHub Actions best practice).
- `hono` bumped 4.12.0 → 4.12.2 (#581).

---

## [2.2.1] — 2026-02-23

### Changed

- CI action bumps: `actions/download-artifact` 6 → 7 (#559); `github/gh-aw` 0.45.0 → 0.49.3 (#554); `actions/cache` 4.3.0 → 5.0.3 (#556); `actions/setup-node` 4 → 6 (#557); `actions/checkout` 4 → 6 (#553).
- Production deps: `@mendable/firecrawl-js` 4.12.1 → 4.13.0 (#558).
- Dev tooling bulk upgrade (#567, including `vitest` 4.0.17 → 4.0.18).
- Agentic-workflow lock files recompiled (#540).

### Fixed

- Documentation issues from noob-test review (#544/#545).

---

## [2.2.0] — 2026-02-20

### Added

- Placeholder/template content detection in docs validation agents (#538).
- Missing unit tests for knowledge-graph subsystems (#470).

### Changed

- Landing page rewritten with project-focused content (#524).
- MCP server tool count corrected to **73** across documentation (previously inconsistent 27/23) (#522).
- `emulator-first` added to the strategy enum in the pattern schema (#533).
- `iconv-lite` bumped 0.7.1 → 0.7.2 (production, #513).
- Commitlint rule/format/message/ensure packages rolled to 20.4.x (#485, #493, #496, #516).

### Fixed

- Fake timers introduced in the uptime-tracking test to eliminate flakiness (#534).
- Broken Algolia search replaced with local search; sitemap and SEO corrections (#510/#518).
- MDX compilation errors — escaped JSX-breaking patterns and added source-install option (#497).
- Missing setup steps in `ai-executor-integration` workflow (#499).
- Invalid `autoMergeAllowed` field in auto-release workflows (#479).
- Release-existence guard added to auto-release workflows (#475).
- Disabled auto-merge handled gracefully in the version-bump step (#473).

### Removed

- `tool-chain-orchestrator-validation` agent removed (#517).

### Docs

- Broken links fixed; MCP definition moved earlier; prerequisites and success checklist added (#530).
- Documentation review findings from #508 addressed (#509).

---

## [2.1.29] — 2026-02-16

### Added

- GitHub Agentic Workflows (`gh-aw`) adopted for CI/CD automation.
- `docs site validator` agentic workflow.

### Changed

- Auto-release workflows switched to PR-based version bumps (#468).
- Dependency installation added to agentic-workflow instructions (#464) and pattern-validation workflows (#460).
- New-developer onboarding docs improved (#458).

### Fixed

- `copilot-setup-steps` job renamed to match the required naming convention.
- npm audit vulnerabilities blocking CI resolved (#438).

---

## [2.1.28] — 2026-01-20

### Changed

- `vitest` and `@vitest/coverage-v8` bumped to 4.0.17 (#414, #415).
- Commitlint/Babel dev-dep group updates (#400–#413).
- `body-parser` bumped 2.2.1 → 2.2.2 (#406).

### Docs

- ADR Aggregator integration documentation and tests added.

---

## [2.1.27] — 2026-01-18

### Changed

- CI runners upgraded to Node 22 for npm 11+ OIDC Trusted Publishing support.

---

## [2.1.26] — 2026-01-18

### Fixed

- OIDC publishing: environment configuration removed (no env configured on npm side).

---

## [2.1.25] — 2026-01-18

### Added

- `release` environment added for NPM OIDC Trusted Publishing.

---

## [2.1.24] — 2026-01-18

### Changed

- Switched npm publishing to **NPM OIDC Trusted Publishing** (removes need for stored `NPM_TOKEN` secret).

---

## [2.1.23] — 2026-01-18

### Added

- `analyze_gaps` MCP tool for ADR-codebase gap detection.
- `update_implementation_status` MCP tool (Pro+ tier).
- `get_adr_priorities` tool for roadmap/backlog planning.
- `verified` field on the `Gap` interface for file-existence confirmation.
- Robust path normalization and verification for gap detection.
- ADR Aggregator integration + quick-setup docs.

### Changed

- `@modelcontextprotocol/sdk` updated to 1.25.2.
- Development-dependencies group rollup (#397); multiple dev-dep bumps (#367, #373, #374, #378, #389, #391, #392, #393, #394, #395).
- Production-dependencies group rollup (#396) including `@mendable/firecrawl-js` 4.9.1 → 4.10.0 (#384) and `fastq`, `hono`, `typescript-event-target`, `qs`.

### Fixed

- Gap-analysis types aligned with the API spec.
- `./` prefixes normalized in gap-analysis file references.
- Bearer-token auth used for gap-analysis endpoints.
- `analyze_gaps` exposed in `ListToolsRequestSchema` (missing registration corrected).

### Removed

- `WORKFLOW_TESTING_PLAN.md` (#369) and `IMPLEMENTATION_SUMMARY.md` (#368) root-level planning stubs.

---

## [2.1.22] — 2025-12-17

Substantial release. First appearance of MCP Resources, dependency injection, ADR-015 APE optimization, and hardening for MCP JSON-RPC compliance.

### ⚠️ Breaking

- Some read-only tools were converted to **MCP Resources** (ADR-018, #353). Clients that previously called these as tools must now read them as resources. See migration notes in `docs/adrs/adr-018-*.md`.
- `tree-sitter` downgraded to 0.21.x for TypeScript compatibility — downstream consumers pinning a newer version should re-pin.

### Added

- `KnowledgeGraphManager` converted to an MCP Resource with CRUD tool (ADR-018, #353).
- Read-only tools refactored to MCP Resources (WIP, #346).
- `search_codebase` tool extracted (WIP, #345); ResearchOrchestrator deprecation path started.
- Dependency-injection support across tools for improved testability (#310).
- Test-infrastructure improvements umbrella landed (EPIC #311).
- Vitest migration started (#355).
- MCP Tasks integration scaffolding (#363).
- APE module optimized with centralized descriptions (ADR-015).

### Changed

- `tree-sitter` downgraded to 0.21.x for TypeScript compatibility.
- GitHub Actions bumped: `peter-evans/create-pull-request` 7 → 8 (#323); `actions/github-script` 6 → 8 (#319); `actions/upload-artifact` 5 → 6 (#322); `actions/setup-node` 4 → 6 (#321); `actions/checkout` 4 → 6 (#318).
- `@types/node` bumped 24.10.3 → 25.0.2 (#325).
- `@mendable/firecrawl-js` 4.8.3 → 4.9.0 (#327); `zod` production bump (#312).

### Fixed

- Python tree-sitter: nested classes handled properly in `extractPythonMethods`.
- Exact matching used in `shouldExclude` for exclude patterns.
- ESLint errors in test files and tree-sitter imports resolved.
- `console.log` redirected to `stderr` to prevent MCP JSON-RPC corruption.
- `ripgrep` file-type handling corrected for multi-type searches.
- `EnhancedLogger` output redirected to `stderr` for MCP compatibility.

### Security

- Directory-traversal prevented in `review_existing_adrs` tool.

### Removed

- `diataxis` scaffolding and link-check workflow removed (docs restructure).

---

## [2.1.21] — 2025-11-25

### Added

- Auto-creation of issues on workflow failures.
- `update-dashboard` workflow disabled; `.gitignore` updated accordingly.

### Fixed

- `util.promisify` properly mocked for DAG-executor tests.
- `@modelcontextprotocol/inspector-server` dev-dep bumped.

---

## [2.1.20] — 2025-11-25

### Added

- npm tag publishing guide.
- GitHub Support request template for secret removal.

### Fixed

- DAG-executor test failures resolved.
- `get-tsconfig` bumped 4.10.1 → 4.13.0; `default-browser-id` 5.0.0 → 5.0.1.
- `lint-staged` bumped 16.2.5 → 16.2.7.

### Docs

- Research documentation refreshed with new timestamps.
- `vault.yml` added to `.gitignore`; `VAULT_SETUP.md` restored with a placeholder API key.

---

## [2.1.19] — 2025-11-24

### Changed

- `node-releases` bumped 2.0.26 → 2.0.27.

---

## [2.1.18] — 2025-11-24

### Changed

- `cli-truncate` bumped 5.1.0 → 5.1.1.

---

## [2.1.17] — 2025-11-24

### Changed

- `@tsconfig/node10` bumped 1.0.11 → 1.0.12.

---

## [2.1.16] — 2025-11-24

### Changed

- Production-dependencies group rollup (5 updates).

---

## [2.1.15] — 2025-11-24

### Changed

- `default-browser` bumped 5.2.1 → 5.4.0.
- Development-dependencies group rollup (2 updates).

---

## [2.1.14] — 2025-11-24

### Changed

- `@modelcontextprotocol/inspector-cli` bumped (dev-dep).
- `@babel/helper-validator-identifier` bumped (dev-dep).

---

## [2.1.13] — 2025-11-24

### Changed

- `@emnapi/core` bumped 1.5.0 → 1.7.1.

---

## [2.1.12] — 2025-11-24

### ⚠️ Breaking

- `zod` upgraded 3.25.76 → 4.1.11 (production). Downstream consumers importing our zod schemas may need to adjust to the [zod 4 migration guide](https://zod.dev/v4/changelog).

### Added

- `.documcp` added to `.gitignore`; playbooks excluded from gitleaks scanning.

### Changed

- `@modelcontextprotocol/sdk` bumped in the mcp-sdk-updates group.
- `zod` upgraded 3.25.76 → 4.1.11 (production); test failures fixed for zod v4 compatibility.
- `tj-actions/changed-files` bumped 41 → 47; `actions/checkout` 4 → 5; `actions/github-script` 7 → 8; `actions/setup-node` 4 → 6.
- `cosmiconfig-typescript-loader`, `caniuse-lite` 1.0.30001743 → 1.0.30001757, `collect-v8-coverage` 1.0.2 → 1.0.3.
- `.gitignore` entries for test-generated research and context files added.

### Fixed

- `dry_run` input removed from `publish.yml` calls (invalid field).
- `update-dependencies` job no longer runs on PR events.
- Inconsistent `.gitignore` entries for tracked directories removed.
- Jest test timeout failures resolved.

---

## [2.1.11] — 2025-09-30

### Fixed

- Timeouts increased for slow deployment and troubleshoot tests.

---

## [2.1.10] — 2025-09-29

### Added

- Research-driven architecture with live environment querying.
- Tree-sitter, ripgrep, and file-system utilities integrated into `ResearchOrchestrator`.
- Research tool tests added; vitest→jest conversions stabilized.

### Fixed

- `smart-git-push-tool-v2` ESM mocking issues.
- Tree-sitter AWS credential detection.
- `perform-research-tool` and `research-orchestrator` test failures.
- Unused error variables removed in `environment-capability-registry.ts`.
- TypeScript compilation errors and ESLint warnings.

---

## [2.1.9] — 2025-09-29

### Removed

- Confusing `dry_run` parameter removed from publish workflow.

---

## [2.1.8] — 2025-09-29

Release bump only. No functional changes.

---

## [2.1.7] — 2025-09-29

Release bump only. No functional changes.

---

## [2.1.6] — 2025-09-29

Release bump only. No functional changes.

---

## [2.1.5] — 2025-09-29

### Changed

- `dry_run` default changed to `true` for safer npm publishing.
- PR author checked (instead of actor) for Dependabot exclusion.
- `tsx` bumped in the development-dependencies group.

### Fixed

- `npm version` errors handled when `package.json` already has the correct version.
- `create-release` job no longer errors on already-correct versions.
- `.documcp/memory` directory removed.

---

## [2.1.4] — 2025-09-29

### Changed

- `lint-staged` bumped 16.1.6 → 16.2.1.

---

## [2.1.3] — 2025-09-29

### Added

- Automatic npm publishing added to release workflows.

### Changed

- `@commitlint/cli` bumped 19.8.1 → 20.0.0.

### Notes

- Version labels during this bump cycle briefly show `v3.0.0`/`v3.0.1` in git history — these were never published and were corrected back to the 2.1.x line. See git log for details.

---

## [2.1.2] — 2025-09-27

### Changed

- `baseline-browser-mapping` bumped 2.8.6 → 2.8.7.

---

## [2.1.1] — 2025-09-27

### Added

- **Smart Code Linking**: core utilities, comprehensive test suite, and README documentation.
- Release Drafter integration for enhanced release automation.
- Comprehensive coding-standards enforcement (config + CI wiring).
- Extensive JSDoc documentation across: APE framework interfaces, Reflexion framework interfaces, knowledge-generation interfaces, utility functions, core type interfaces, API reference.

### Changed

- TypeScript type safety improved with interface definitions (partial → complete).
- CI release-publish workflow integrated with Release Drafter.
- MCP server smoke tests refactored to use proper protocol validation.
- `openai` bumped 5.20.3 → 5.21.0 (production-dependencies group).
- `@modelcontextprotocol/sdk` bumped 1.17.5 → 1.18.0 (mcp-sdk-updates group).
- `electron-to-chromium` bumped 1.5.222 → 1.5.224.
- GitHub Actions: `actions/checkout` 4 → 5; `actions/dependency-review-action` 3 → 4; `softprops/action-gh-release` 1 → 2; `actions/setup-node` 4 → 5; `actions/configure-pages` 4 → 5.

### Fixed

- `@dependabot` command-not-found errors in workflows resolved.
- Timeout issue resolved in troubleshoot workflow test.
- CI test timeout in `troubleshoot-guided-workflow-tool` resolved.
- VitePress documentation build failures resolved.
- README links updated to point to existing documentation files.
- `memory-loading-tool` tests aligned with actual ADR discovery behavior.
- Research-directory broken links cleaned up.

---

## [2.1.0] — 2025-09-21

### Added

- **Tree-sitter integration** complete across all 4 MCP ADR analysis tools.
- **MCP Inspector** integrated for comprehensive testing.
- **ADR review** tool and TODO prompts with cloud/DevOps expertise.
- New tools and test files exposed in the MCP server (previously registered but not listed).
- ESLint integration complete with proper globals and configuration.
- Node.js types added to TypeScript configuration.
- Comprehensive pre-commit security and quality checks.

### Changed

- `@modelcontextprotocol/sdk` upgraded to 1.18.0.
- Test suite pass rate improved to 100% (from 99.71%) via systematic debugging.
- `.mcp-adr-cache` now written inside the project directory rather than the OS temp directory.
- MCP tool validation improved with jq-based JSON parsing.
- `lint.yml` workflow updated to use the new ESLint integration.
- `.gitignore` and gitleaks config updated for npm cache.

### Fixed

- Critical cache directory and memory system issues.
- Tree-sitter dependency conflicts.
- `smart-git-push-tool` test `ENOENT` errors.
- All TypeScript lint errors for GitHub Actions.
- All ESLint errors; broader code-quality improvements.
- `MCP Planning Tool` file-system error test.
- GitHub Actions workflow reliability.

### Security

- Secret references removed from documentation.

### Deps

- `@jridgewell/trace-mapping` bumped 0.3.30 → 0.3.31.

---

## [2.0.24] — 2025-09-16

### Fixed

- `VERSION` environment variable now honored in the AI release-notes script.

---

## [2.0.23] — 2025-09-16

### Fixed

- GitHub Actions deployment issues resolved.
- `error-ex` bumped 1.3.2 → 1.3.4 (dev-dep).

---

## [2.0.22] — 2025-09-16

Flagship patch release containing the majority of the **memory-centric architecture** work.

### Added

- **Memory-centric architecture** implemented end-to-end (Phase 1, Phase 2, Phase 3).
- Complete entity system as the Phase 1 foundation.
- Memory integration across MCP tools.
- Comprehensive TDD test coverage for the memory system.
- `AGENTS.md` documentation.
- Enhanced content-masking tool test coverage (comprehensive new suite).

### Changed

- `TodoJsonManager` references deprecated; legacy TODO system tests removed.
- `saveApprovalPreferences` made async to fix failing tests.
- Performance benchmark tests enhanced with precise timing control.
- Memory management tools improved with better TypeScript compliance.
- Release dashboard metrics updated.

### Fixed

- 15 failing tests in the memory entity management system resolved.
- Critical test failures in the memory system and content-masking tool.
- Memory integration test issues resolved; pre-commit pipeline verified.
- Memory-loading-tool test issues resolved.
- Memory-transformation and loading-tool test failures resolved.
- Interactive-approval test failures resolved.
- Interactive ADR Planning Tool test failures resolved via pragmatic filesystem mocking.
- Issue #121 method-availability errors resolved (defensive programming).
- Critical CI test failures — `jest-junit` dependency and AI-executor hanging.
- Comprehensive null safety added to the memory relationship mapper.
- TypeScript compilation errors (all resolved; Phase 2 ready).
- Content-masking tool path-resolution issues.
- Research documentation corruption cleaned up.

---

## [2.0.21] — 2025-09-10

### Fixed

- Missing `type` added to the input parameter in the `interactive_adr_planning` schema.

---

## [2.0.20] — 2025-09-10

### Fixed

- Version test made future-proof by validating a semantic-versioning pattern rather than a hardcoded value.

---

## [2.0.19] — 2025-09-10

Release bump for the interactive ADR planning tool.

---

## [2.0.18] — 2025-09-10

### Added

- Interactive ADR planning tool integrated into CI workflows.

### Removed

- Outdated `TODO.md` file.

---

## [2.0.17] — 2025-09-09

### Added

- **MCP Project Planning Tool** implemented with comprehensive features and usage documentation.
- Smart completion preservation in the TODO markdown sync.
- Dynamic version determination in AI Release Notes workflow.
- Future-proof version system for automatic updates.

### Fixed

- TypeScript index-signature error for `npm_package_version` access.
- Version output corrected to show the actual version.
- TODO markdown sync `preserveExisting` behavior.

### Removed

- Legacy `TODO.md` file deleted.

---

## [2.0.16] — 2025-09-09

Release bump only. No commits between this tag and v2.0.15.

---

## [2.0.15] — 2025-09-09

### Added

- Dependabot auto-release workflow for automated npm publishing.

### Fixed

- AI release-notes and npm publish workflows coordinated.

---

## [2.0.14] — 2025-09-09

Baseline for this changelog. Earlier history is captured only via git tags and release notes; reconstruct via `git log v1.x.x..v2.0.14` if needed.

---

[Unreleased]: https://github.com/tosin2013/mcp-adr-analysis-server/compare/v2.5.0...HEAD
[2.5.0]: https://github.com/tosin2013/mcp-adr-analysis-server/compare/v2.4.1...v2.5.0
[2.4.1]: https://github.com/tosin2013/mcp-adr-analysis-server/compare/v2.3.1...v2.4.1
[2.3.1]: https://github.com/tosin2013/mcp-adr-analysis-server/compare/v2.3.0...v2.3.1
[2.3.0]: https://github.com/tosin2013/mcp-adr-analysis-server/compare/v2.2.2...v2.3.0
[2.2.2]: https://github.com/tosin2013/mcp-adr-analysis-server/compare/v2.2.1...v2.2.2
[2.2.1]: https://github.com/tosin2013/mcp-adr-analysis-server/compare/v2.2.0...v2.2.1
[2.2.0]: https://github.com/tosin2013/mcp-adr-analysis-server/compare/v2.1.29...v2.2.0
[2.1.29]: https://github.com/tosin2013/mcp-adr-analysis-server/compare/v2.1.28...v2.1.29
[2.1.28]: https://github.com/tosin2013/mcp-adr-analysis-server/compare/v2.1.27...v2.1.28
[2.1.27]: https://github.com/tosin2013/mcp-adr-analysis-server/compare/v2.1.26...v2.1.27
[2.1.26]: https://github.com/tosin2013/mcp-adr-analysis-server/compare/v2.1.25...v2.1.26
[2.1.25]: https://github.com/tosin2013/mcp-adr-analysis-server/compare/v2.1.24...v2.1.25
[2.1.24]: https://github.com/tosin2013/mcp-adr-analysis-server/compare/v2.1.23...v2.1.24
[2.1.23]: https://github.com/tosin2013/mcp-adr-analysis-server/compare/v2.1.22...v2.1.23
[2.1.22]: https://github.com/tosin2013/mcp-adr-analysis-server/compare/v2.1.21...v2.1.22
[2.1.21]: https://github.com/tosin2013/mcp-adr-analysis-server/compare/v2.1.20...v2.1.21
[2.1.20]: https://github.com/tosin2013/mcp-adr-analysis-server/compare/v2.1.19...v2.1.20
[2.1.19]: https://github.com/tosin2013/mcp-adr-analysis-server/compare/v2.1.18...v2.1.19
[2.1.18]: https://github.com/tosin2013/mcp-adr-analysis-server/compare/v2.1.17...v2.1.18
[2.1.17]: https://github.com/tosin2013/mcp-adr-analysis-server/compare/v2.1.16...v2.1.17
[2.1.16]: https://github.com/tosin2013/mcp-adr-analysis-server/compare/v2.1.15...v2.1.16
[2.1.15]: https://github.com/tosin2013/mcp-adr-analysis-server/compare/v2.1.14...v2.1.15
[2.1.14]: https://github.com/tosin2013/mcp-adr-analysis-server/compare/v2.1.13...v2.1.14
[2.1.13]: https://github.com/tosin2013/mcp-adr-analysis-server/compare/v2.1.12...v2.1.13
[2.1.12]: https://github.com/tosin2013/mcp-adr-analysis-server/compare/v2.1.11...v2.1.12
[2.1.11]: https://github.com/tosin2013/mcp-adr-analysis-server/compare/v2.1.10...v2.1.11
[2.1.10]: https://github.com/tosin2013/mcp-adr-analysis-server/compare/v2.1.9...v2.1.10
[2.1.9]: https://github.com/tosin2013/mcp-adr-analysis-server/compare/v2.1.8...v2.1.9
[2.1.8]: https://github.com/tosin2013/mcp-adr-analysis-server/compare/v2.1.7...v2.1.8
[2.1.7]: https://github.com/tosin2013/mcp-adr-analysis-server/compare/v2.1.6...v2.1.7
[2.1.6]: https://github.com/tosin2013/mcp-adr-analysis-server/compare/v2.1.5...v2.1.6
[2.1.5]: https://github.com/tosin2013/mcp-adr-analysis-server/compare/v2.1.4...v2.1.5
[2.1.4]: https://github.com/tosin2013/mcp-adr-analysis-server/compare/v2.1.3...v2.1.4
[2.1.3]: https://github.com/tosin2013/mcp-adr-analysis-server/compare/v2.1.2...v2.1.3
[2.1.2]: https://github.com/tosin2013/mcp-adr-analysis-server/compare/v2.1.1...v2.1.2
[2.1.1]: https://github.com/tosin2013/mcp-adr-analysis-server/compare/v2.1.0...v2.1.1
[2.1.0]: https://github.com/tosin2013/mcp-adr-analysis-server/compare/v2.0.24...v2.1.0
[2.0.24]: https://github.com/tosin2013/mcp-adr-analysis-server/compare/v2.0.23...v2.0.24
[2.0.23]: https://github.com/tosin2013/mcp-adr-analysis-server/compare/v2.0.22...v2.0.23
[2.0.22]: https://github.com/tosin2013/mcp-adr-analysis-server/compare/v2.0.21...v2.0.22
[2.0.21]: https://github.com/tosin2013/mcp-adr-analysis-server/compare/v2.0.20...v2.0.21
[2.0.20]: https://github.com/tosin2013/mcp-adr-analysis-server/compare/v2.0.19...v2.0.20
[2.0.19]: https://github.com/tosin2013/mcp-adr-analysis-server/compare/v2.0.18...v2.0.19
[2.0.18]: https://github.com/tosin2013/mcp-adr-analysis-server/compare/v2.0.17...v2.0.18
[2.0.17]: https://github.com/tosin2013/mcp-adr-analysis-server/compare/v2.0.16...v2.0.17
[2.0.16]: https://github.com/tosin2013/mcp-adr-analysis-server/compare/v2.0.15...v2.0.16
[2.0.15]: https://github.com/tosin2013/mcp-adr-analysis-server/compare/v2.0.14...v2.0.15
[2.0.14]: https://github.com/tosin2013/mcp-adr-analysis-server/releases/tag/v2.0.14
