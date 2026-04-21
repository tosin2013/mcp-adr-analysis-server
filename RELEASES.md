# Release Policy

This document describes how `mcp-adr-analysis-server` is released: cadence, versioning policy, deprecation windows, and the mechanics of the publish pipeline. If you're reading this as a contributor or downstream consumer, the short version is: we follow [Semantic Versioning 2.0.0](https://semver.org/spec/v2.0.0.html), the release pipeline is fully automated on PR merge, and breaking changes are announced at least one minor version in advance.

**Related docs:** [`CHANGELOG.md`](./CHANGELOG.md) for the per-version history, [`CONTRIBUTING.md`](./CONTRIBUTING.md) for the contribution process, [`SECURITY.md`](./SECURITY.md) for vulnerability disclosure (tracked in #758).

## Versioning policy

We follow Semantic Versioning. In this project that means:

| Bump                | When                                                                             | Triggered by                                                                                                        |
| ------------------- | -------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------- |
| **Major** (`X.0.0`) | Breaking changes to the MCP tool surface, public TypeScript types, or CLI flags  | PR title/body contains `BREAKING` / `BREAKING CHANGE`, or PR has the `breaking` / `breaking-change` / `major` label |
| **Minor** (`0.X.0`) | New MCP tools, new public APIs, non-breaking feature additions                   | PR title starts with `feat` / `feature`, or PR has the `feature` / `enhancement` / `minor` label                    |
| **Patch** (`0.0.X`) | Bug fixes, security patches, documentation, dependency bumps, internal refactors | Default — any PR without the above markers                                                                          |

Version inference lives in [`.github/workflows/auto-release-on-merge.yml`](./.github/workflows/auto-release-on-merge.yml). If a PR is mislabelled, fix the label or edit the title before merging — the workflow uses that metadata at merge-time and does not re-evaluate later.

### What counts as "breaking"

- Removing or renaming an MCP tool that has been in a released version.
- Changing a tool's input schema in a non-additive way (removing required fields, tightening enums, narrowing types).
- Changing the shape of a tool's return payload in a way that existing clients cannot keep parsing.
- Removing or renaming an exported TypeScript type or utility function.
- Raising the minimum Node.js version.
- Changing default behaviour in a way that is not controllable via a flag.

Adding new tools, adding optional input fields, widening return types, and adding exports are **not** breaking.

## Release cadence

We do not ship on a fixed calendar. Instead:

- **Patch releases** ship whenever a PR merges to `main`. Expect multiple per week during active development. The [Dependabot auto-merge workflow](./.github/workflows/dependabot-auto-merge.yml) (tracked in PR #783) batches most low-risk dependency bumps automatically.
- **Minor releases** ship when a feature-bearing PR merges — typically every 2–6 weeks.
- **Major releases** ship roughly **quarterly**, gated on a tracking milestone. The current major-release milestones are:
  - **[v2.6](https://github.com/tosin2013/mcp-adr-analysis-server/milestone/1)** — near-term (~2 weeks). Anchor: CE-MCP architecture merge (ADR-014).
  - **[v3.0](https://github.com/tosin2013/mcp-adr-analysis-server/milestone/2)** — next major (~6–8 weeks). Anchor: MCP Tasks integration (ADR-020), dependency-injection refactor, Vitest migration complete.

A release-planning epic tracks the milestone structure at [#738](https://github.com/tosin2013/mcp-adr-analysis-server/issues/738).

## Deprecation policy

Breaking changes are announced at least **one minor version** before they land in a major release. Concretely:

1. The change is proposed in an ADR under [`docs/adrs/`](./docs/adrs/). ADR status starts as `Proposed`.
2. Once the ADR is `Accepted`, the deprecation is added to `CHANGELOG.md` under a `### Deprecated` section of the next minor release, and the relevant code emits a runtime warning.
3. The breaking change itself lands in the following major release, flagged under `### ⚠️ Breaking` in `CHANGELOG.md` with a migration guide.

For example: deprecating a tool in v2.7 means it can be removed in v3.0 but not earlier. Deprecating in v2.9 means removal in v3.0 at the earliest; if v3.0 has already been cut, removal waits for v4.0.

Security fixes are exempt from this window when a deprecation-path fix isn't viable — see [SECURITY.md](./SECURITY.md).

## LTS policy

None currently. The project is still in active major-version iteration (pre-v3.0). Downstream consumers should track the latest stable release on the `latest` npm dist-tag. We will introduce an LTS policy when v3.0 ships or sooner if a large user base requests it.

## How to request a backport

Backports are **not** routinely offered. We carry fixes forward on `main` and publish new releases. If you need a fix on an older minor version:

1. Open an issue with the `security` or `backport` label. Include: the fix PR, the target version, and why forward-porting isn't viable for your environment.
2. A maintainer will evaluate. Backports are granted for:
   - Critical security fixes on the currently-supported major version
   - Demonstrable regressions where the fix PR cannot be cleanly applied forward
3. If approved, the maintainer cuts a patch release off the appropriate tag.

If your request doesn't fit those criteria, the answer is usually: upgrade to the latest release, or fork.

## Release pipeline mechanics

Everything from PR merge to published npm package is automated. Here's the flow:

```
PR merges to main
      │
      ▼
┌─────────────────────────────────────────┐
│ auto-release-on-merge.yml               │
│ - Infers bump type from PR title/labels │
│ - Bumps package.json version            │
│ - Creates annotated tag vX.Y.Z          │
│ - Publishes Release Drafter draft       │
│ - Opens a "chore: bump version" PR      │
└─────────────────────────────────────────┘
      │ (tag push)
      ▼
┌─────────────────────────────────────────┐
│ publish.yml                             │
│ - Runs typecheck + tests                │
│ - Builds dist/                          │
│ - Publishes to npm via OIDC Trusted     │
│   Publishing (no NPM_TOKEN needed)      │
│ - Tags the release on the `latest` or   │
│   `beta` dist-tag                       │
└─────────────────────────────────────────┘
      │
      ▼
┌─────────────────────────────────────────┐
│ publish-mcp-registry.yml                │
│ - Syncs server.json version via jq      │
│ - Publishes to                          │
│   registry.modelcontextprotocol.io      │
│   using github-oidc auth                │
└─────────────────────────────────────────┘
```

### Workflows involved

- **[`auto-release-on-merge.yml`](./.github/workflows/auto-release-on-merge.yml)** — entry point. Runs on any PR merge to `main` (except Dependabot; that path goes through the auto-merge workflow instead).
- **[`publish.yml`](./.github/workflows/publish.yml)** — NPM publisher. Triggered by tag push, manual `workflow_dispatch`, or called from `auto-release-on-merge`. Uses npm 11+ OIDC Trusted Publishing — no stored `NPM_TOKEN` secret.
- **[`publish-mcp-registry.yml`](./.github/workflows/publish-mcp-registry.yml)** — MCP Registry publisher. Runs after `publish.yml` succeeds. Uses `github-oidc` auth for the MCP Publisher CLI.
- **[`release-drafter.yml`](./.github/release-drafter.yml)** — configuration for the draft release notes that `auto-release-on-merge` publishes. Categories align with [Keep a Changelog 1.1.0](https://keepachangelog.com/en/1.1.0/) so drafts paste cleanly into `CHANGELOG.md`.
- **[`dependabot-auto-merge.yml`](./.github/workflows/dependabot-auto-merge.yml)** — auto-approves and merges low-risk Dependabot PRs (patch + minor bumps, excluding `@modelcontextprotocol/sdk` and major bumps).

### Skipping a release

If a PR shouldn't trigger a release (e.g., docs-only, CI-only, version-bump follow-ups), apply the **`no-release`** label. The `auto-release-on-merge.yml` workflow skips the release steps when it sees that label. `skip-changelog` also works and additionally excludes the PR from the Release Drafter output.

The auto-generated version-bump PRs (titled `chore: bump version to vX.Y.Z`) are labelled `no-release` by default, which prevents an infinite release loop.

### Manual / emergency releases

If CI is broken or you need to ship out-of-band:

1. Run the `publish.yml` workflow manually from the Actions tab (`workflow_dispatch`). Pick the `version_bump` type.
2. For emergencies only, check `skip_tests: true` on the dispatch form. This is logged to the workflow summary.
3. Alternatively, if a tag is already created, pushing it (`git push origin vX.Y.Z`) will trigger `publish.yml` directly — skipping the `create-release` job that only runs on `workflow_dispatch`.

Local npm publishes require 2FA; CI uses OIDC Trusted Publishing and does not require a token.

## MCP Registry

The server is listed on the official MCP Registry as [`io.github.tosin2013/mcp-adr-analysis-server`](https://registry.modelcontextprotocol.io). The registry version is synced dynamically from `package.json` by `publish-mcp-registry.yml` via `jq`. Requirements:

- `package.json` must contain `"mcpName": "io.github.tosin2013/mcp-adr-analysis-server"` — the registry publish will fail without it.
- `server.json` at the repo root carries the registry metadata. Its `description` must be ≤ 100 characters.
- `server.json` is **not** included in the published npm package (see the `files` array in `package.json`).

## Questions

- Release process questions: open a [Discussion](https://github.com/tosin2013/mcp-adr-analysis-server/discussions).
- Bug in the release pipeline itself: open an issue with the `ci-cd` and `release-pipeline` labels.
- Security issues: see [SECURITY.md](./SECURITY.md) (tracked in #758). Do not file a public issue.
