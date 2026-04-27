/**
 * Tests for `release_tracking` extensions:
 * - localOnly fallback for create_milestone
 * - push_local_milestones operation
 * - writeReleasePlan integration
 *
 * The localOnly path skips gh entirely, so no child_process mocking is needed.
 */

import { existsSync, mkdtempSync, mkdirSync, readFileSync, rmSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';

import { releaseTracking } from '../../src/tools/release-tracking-tool.js';
import { listLocal } from '../../src/utils/local-milestone-store.js';

function setupProject(): string {
  const root = mkdtempSync(join(tmpdir(), 'mcp-adr-release-tracking-'));
  // Empty ADR dir is fine for these tests; release_tracking just calls
  // discoverAdrsInDirectory which gracefully returns no ADRs.
  mkdirSync(join(root, 'docs', 'adrs'), { recursive: true });
  return root;
}

describe('release_tracking — localOnly fallback', () => {
  let projectPath: string;

  afterEach(() => {
    if (projectPath) rmSync(projectPath, { recursive: true, force: true });
  });

  it('persists a milestone locally when localOnly is true', async () => {
    projectPath = setupProject();
    const result = await releaseTracking({
      operation: 'create_milestone',
      projectPath,
      milestoneTitle: 'Beta Release',
      milestoneDescription: 'Stabilize the API surface',
      localOnly: true,
    });

    const text = (result as any).content[0].text as string;
    expect(text).toContain('Milestone Persisted Locally');
    expect(text).toContain('beta-release');

    const stored = listLocal(projectPath);
    expect(stored).toHaveLength(1);
    expect(stored[0]!.id).toBe('beta-release');
    expect(stored[0]!.pushed).toBe(false);
    expect(stored[0]!.source).toBe('local');
  });

  it('writes RELEASE_PLAN.md when writeReleasePlan is true', async () => {
    projectPath = setupProject();
    await releaseTracking({
      operation: 'create_milestone',
      projectPath,
      milestoneTitle: 'Beta Release',
      localOnly: true,
      writeReleasePlan: true,
    });

    const planPath = join(projectPath, 'RELEASE_PLAN.md');
    expect(existsSync(planPath)).toBe(true);
    const contents = readFileSync(planPath, 'utf8');
    expect(contents).toContain('# Release Plan');
    expect(contents).toContain('### Beta Release');
    expect(contents).toContain('<!-- LOCAL MILESTONES -->');
    expect(contents).toContain('<!-- /LOCAL MILESTONES -->');
  });

  it('rejects create_milestone when milestoneTitle is missing', async () => {
    projectPath = setupProject();
    await expect(
      releaseTracking({
        operation: 'create_milestone',
        projectPath,
        localOnly: true,
      })
    ).rejects.toThrow();
  });
});

describe('release_tracking — push_local_milestones', () => {
  let projectPath: string;

  afterEach(() => {
    if (projectPath) rmSync(projectPath, { recursive: true, force: true });
  });

  it('returns a friendly message when no local milestones exist', async () => {
    projectPath = setupProject();
    const result = await releaseTracking({
      operation: 'push_local_milestones',
      projectPath,
    });
    const text = (result as any).content[0].text as string;
    expect(text).toContain('No local milestones found');
  });

  it('reports per-milestone status after attempting push', async () => {
    projectPath = setupProject();
    await releaseTracking({
      operation: 'create_milestone',
      projectPath,
      milestoneTitle: 'Beta Release',
      localOnly: true,
    });

    const result = await releaseTracking({
      operation: 'push_local_milestones',
      projectPath,
    });
    const text = (result as any).content[0].text as string;
    // The default child_process mock returns empty strings, which yields a
    // "success: true, number: NaN" path. Either way, the report should mention
    // the milestone slug.
    expect(text).toContain('beta-release');
    expect(text).toMatch(/Synced|Skipped|Failed/);
  });
});
