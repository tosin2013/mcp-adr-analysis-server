/**
 * Tests for the local milestone store.
 */

import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';

import {
  RELEASE_PLAN_END_MARKER,
  RELEASE_PLAN_START_MARKER,
  listLocal,
  loadLocal,
  markPushed,
  removeLocal,
  renderLocalMilestonesMarkdown,
  slugify,
  upsertLocal,
  writeReleasePlanFile,
} from '../../src/utils/local-milestone-store.js';
import { MilestoneStatus } from '../../src/utils/release-readiness-detector.js';

function mkProjectDir(): string {
  return mkdtempSync(join(tmpdir(), 'mcp-adr-local-milestone-'));
}

function baseMilestone(overrides: Partial<MilestoneStatus> = {}): MilestoneStatus {
  return {
    name: 'Beta Release',
    completed: 0,
    total: 0,
    completionRate: 0,
    criticalTodos: 0,
    blockers: [],
    ...overrides,
  };
}

describe('slugify', () => {
  it('lowercases and dasherizes', () => {
    expect(slugify('Beta Release v1.0')).toBe('beta-release-v1-0');
  });

  it('strips leading and trailing separators', () => {
    expect(slugify('  ---hello---  ')).toBe('hello');
  });
});

describe('upsertLocal / listLocal', () => {
  let projectPath: string;

  beforeEach(() => {
    projectPath = mkProjectDir();
  });

  afterEach(() => {
    rmSync(projectPath, { recursive: true, force: true });
  });

  it('persists a new milestone and roundtrips it', () => {
    const stored = upsertLocal(projectPath, baseMilestone({ name: 'Alpha' }));
    expect(stored.id).toBe('alpha');
    expect(stored.source).toBe('local');
    expect(stored.pushed).toBe(false);

    const list = listLocal(projectPath);
    expect(list).toHaveLength(1);
    expect(list[0]!.name).toBe('Alpha');
  });

  it('merges duplicates by slug and accumulates linked ADRs', () => {
    upsertLocal(projectPath, baseMilestone({ name: 'Alpha', linkedAdrIds: ['0001.md'] }));
    upsertLocal(projectPath, baseMilestone({ name: 'Alpha', linkedAdrIds: ['0002.md'] }));

    const list = listLocal(projectPath);
    expect(list).toHaveLength(1);
    expect(list[0]!.linkedAdrIds).toEqual(expect.arrayContaining(['0001.md', '0002.md']));
  });

  it('preserves push state across upserts unless explicitly reset', () => {
    upsertLocal(projectPath, baseMilestone({ name: 'Alpha' }));
    markPushed(projectPath, 'alpha', 42);
    upsertLocal(
      projectPath,
      baseMilestone({ name: 'Alpha', completed: 5, total: 5, completionRate: 1 })
    );

    const list = listLocal(projectPath);
    expect(list[0]!.pushed).toBe(true);
    expect(list[0]!.githubNumber).toBe(42);
    expect(list[0]!.completed).toBe(5);
  });
});

describe('markPushed / removeLocal', () => {
  let projectPath: string;
  beforeEach(() => {
    projectPath = mkProjectDir();
  });
  afterEach(() => {
    rmSync(projectPath, { recursive: true, force: true });
  });

  it('marks a milestone as pushed and records the GitHub number', () => {
    upsertLocal(projectPath, baseMilestone({ name: 'Alpha' }));
    const updated = markPushed(projectPath, 'alpha', 17);
    expect(updated?.pushed).toBe(true);
    expect(updated?.githubNumber).toBe(17);
  });

  it('returns undefined when marking a non-existent milestone', () => {
    expect(markPushed(projectPath, 'nope', 1)).toBeUndefined();
  });

  it('removeLocal returns false when nothing matches', () => {
    expect(removeLocal(projectPath, 'nope')).toBe(false);
  });

  it('removeLocal deletes a known milestone', () => {
    upsertLocal(projectPath, baseMilestone({ name: 'Alpha' }));
    expect(removeLocal(projectPath, 'alpha')).toBe(true);
    expect(listLocal(projectPath)).toHaveLength(0);
  });
});

describe('loadLocal', () => {
  let projectPath: string;
  beforeEach(() => {
    projectPath = mkProjectDir();
  });
  afterEach(() => {
    rmSync(projectPath, { recursive: true, force: true });
  });

  it('returns an empty store when the file does not exist', () => {
    const store = loadLocal(projectPath);
    expect(store.version).toBe('1.0');
    expect(store.milestones).toEqual([]);
  });

  it('returns an empty store when the file is corrupt', () => {
    const filePath = join(projectPath, '.mcp-adr-cache', 'milestones.local.json');
    require('fs').mkdirSync(join(projectPath, '.mcp-adr-cache'), { recursive: true });
    writeFileSync(filePath, '{not json', 'utf8');
    const store = loadLocal(projectPath);
    expect(store.milestones).toEqual([]);
  });
});

describe('renderLocalMilestonesMarkdown / writeReleasePlanFile', () => {
  let projectPath: string;
  beforeEach(() => {
    projectPath = mkProjectDir();
  });
  afterEach(() => {
    rmSync(projectPath, { recursive: true, force: true });
  });

  it('renders bounded markers with milestone metadata', () => {
    const md = renderLocalMilestonesMarkdown([
      baseMilestone({
        name: 'Alpha',
        id: 'alpha',
        completed: 3,
        total: 5,
        completionRate: 0.6,
        linkedAdrIds: ['0001.md'],
      }),
    ]);
    expect(md.startsWith(RELEASE_PLAN_START_MARKER)).toBe(true);
    expect(md.endsWith(RELEASE_PLAN_END_MARKER)).toBe(true);
    expect(md).toContain('### Alpha');
    expect(md).toContain('<!-- milestone-id: alpha -->');
    expect(md).toContain('Linked ADRs:** 0001.md');
    expect(md).toContain('Progress:** 3/5 (60.0%)');
  });

  it('creates RELEASE_PLAN.md when missing', () => {
    const milestone = baseMilestone({ name: 'Alpha' });
    const path = writeReleasePlanFile(projectPath, [milestone]);
    expect(path.endsWith('RELEASE_PLAN.md')).toBe(true);
    const contents = readFileSync(path, 'utf8');
    expect(contents).toContain('# Release Plan');
    expect(contents).toContain('### Alpha');
  });

  it('preserves manual content outside the bounded section across re-runs', () => {
    const filePath = join(projectPath, 'RELEASE_PLAN.md');
    const initial = [
      '# Release Plan',
      '',
      '## Manual section',
      'Should remain.',
      '',
      RELEASE_PLAN_START_MARKER,
      'old',
      RELEASE_PLAN_END_MARKER,
      '',
      '## Trailing manual section',
      'Should also remain.',
    ].join('\n');
    writeFileSync(filePath, initial, 'utf8');

    writeReleasePlanFile(projectPath, [baseMilestone({ name: 'Alpha' })]);
    const updated = readFileSync(filePath, 'utf8');
    expect(updated).toContain('## Manual section');
    expect(updated).toContain('Should remain.');
    expect(updated).toContain('## Trailing manual section');
    expect(updated).toContain('Should also remain.');
    expect(updated).toContain('### Alpha');
    expect(updated).not.toContain('\nold\n');
  });
});
