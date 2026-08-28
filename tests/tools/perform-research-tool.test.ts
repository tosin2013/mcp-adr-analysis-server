/**
 * The ADR citation rule (#1528).
 *
 * `perform_research` wrote `adrs: []` at its only write site, so every generated
 * research document cited zero ADRs while docs/research/README.md had required
 * since 2025-12 that "all research must link to relevant ADRs". The data was
 * gathered, the renderer existed, the assignment was missing.
 *
 * The repair is one function. If it stops matching, the tool keeps writing
 * documents and they silently go back to citing nothing -- a regression with no
 * outward symptom, which is why it is pinned here rather than left to the
 * integration test, which only exercises the CE-MCP directive path.
 *
 * These use a real temp project because the rule requires the ADR to exist on
 * disk. That is not incidental: without it, the ADR-directory-relative reading
 * of an arbitrary `docs/planning/x.md` also lands under the ADR root, and the
 * function would invent citations.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { promises as fs } from 'fs';
import * as os from 'os';
import * as path from 'path';
import { collectConsultedAdrs } from '../../src/tools/perform-research-tool.js';

/** Shape of what research-orchestrator puts in `research.sources`. */
const filesSource = (files: unknown[]) => ({ type: 'project_files', data: { files } });

const rel = (...parts: string[]) => path.join(...parts);

describe('collectConsultedAdrs (#1528)', () => {
  let projectPath: string;

  beforeEach(async () => {
    projectPath = await fs.mkdtemp(path.join(os.tmpdir(), 'consulted-adrs-'));
    const write = async (p: string, body = '# stub\n') => {
      await fs.mkdir(path.dirname(path.join(projectPath, p)), { recursive: true });
      await fs.writeFile(path.join(projectPath, p), body);
    };
    await write('docs/adrs/adr-001-caching.md');
    await write('docs/adrs/adr-023-tool-surface-scope.md');
    await write('docs/adrs/README.md');
    await write('docs/adrs/index.json', '{}\n');
    await write('docs/adrs-archive/adr-000-retired.md');
    await write('docs/planning/roadmap.md');
    await write('decisions/adr-007-elsewhere.md');
    await write('src/index.ts', 'export {};\n');
  });

  afterEach(async () => {
    await fs.rm(projectPath, { recursive: true, force: true }).catch(() => {});
  });

  it('cites an ADR reached by a project-relative path (orchestrator PHASE 4)', () => {
    const sources = [filesSource(['docs/adrs/adr-023-tool-surface-scope.md'])];

    expect(collectConsultedAdrs(sources, projectPath, 'docs/adrs')).toEqual([
      rel('docs', 'adrs', 'adr-023-tool-surface-scope.md'),
    ]);
  });

  it('cites an ADR reached by an ADR-directory-relative path (orchestrator PHASE 3)', () => {
    // PHASE 3 is `findFiles(adrPath, ['**/*.md'])` -- the "Always include ADRs"
    // pass. Its entries are bare filenames. Resolving only against projectPath
    // dropped all of them, silently, which is the bug this test exists for.
    const sources = [filesSource(['adr-001-caching.md'])];

    expect(collectConsultedAdrs(sources, projectPath, 'docs/adrs')).toEqual([
      rel('docs', 'adrs', 'adr-001-caching.md'),
    ]);
  });

  it('returns project-relative paths whichever convention it was given', () => {
    const sources = [
      // Deliberately reverse-sorted on input: the citation list must not depend
      // on the order the orchestrator's phases happened to run in.
      filesSource([
        'adr-023-tool-surface-scope.md',
        'docs/adrs/adr-001-caching.md',
        path.join(projectPath, 'docs/adrs/adr-001-caching.md'),
      ]),
    ];

    const cited = collectConsultedAdrs(sources, projectPath, 'docs/adrs');
    expect(cited.every(c => !path.isAbsolute(c))).toBe(true);
    // The same ADR by three spellings collapses to one entry, sorted -- an
    // unstable list would churn the generated document on every run.
    expect(cited).toEqual([
      rel('docs', 'adrs', 'adr-001-caching.md'),
      rel('docs', 'adrs', 'adr-023-tool-surface-scope.md'),
    ]);
  });

  it('does not invent a citation for a markdown file outside the ADR directory', () => {
    // Under the ADR-relative reading, 'docs/planning/roadmap.md' resolves to
    // <adrRoot>/docs/planning/roadmap.md -- inside the root by path, absent from
    // disk. Existence is what separates the two readings.
    const sources = [filesSource(['docs/planning/roadmap.md'])];

    expect(collectConsultedAdrs(sources, projectPath, 'docs/adrs')).toEqual([]);
  });

  it('honours a non-default adrDirectory', () => {
    const sources = [
      filesSource(['decisions/adr-007-elsewhere.md', 'docs/adrs/adr-001-caching.md']),
    ];

    expect(collectConsultedAdrs(sources, projectPath, 'decisions')).toEqual([
      rel('decisions', 'adr-007-elsewhere.md'),
    ]);
  });

  it('excludes the ADR index README', () => {
    // Every run reads it; citing it as a decision is noise.
    const sources = [filesSource(['docs/adrs/README.md', 'README.md'])];

    expect(collectConsultedAdrs(sources, projectPath, 'docs/adrs')).toEqual([]);
  });

  it('excludes non-markdown files under the ADR directory', () => {
    const sources = [filesSource(['docs/adrs/index.json', 'docs/adrs/adr-001-caching.md'])];

    expect(collectConsultedAdrs(sources, projectPath, 'docs/adrs')).toEqual([
      rel('docs', 'adrs', 'adr-001-caching.md'),
    ]);
  });

  it('does not treat a sibling directory with a shared prefix as the ADR directory', () => {
    const sources = [filesSource(['docs/adrs-archive/adr-000-retired.md'])];

    expect(collectConsultedAdrs(sources, projectPath, 'docs/adrs')).toEqual([]);
  });

  it('does not cite an ADR that no longer exists on disk', () => {
    // A stale entry in a cached source must not produce a dead link -- the same
    // rule the research-link check will enforce repository-wide (#1527).
    const sources = [filesSource(['docs/adrs/adr-016-never-written.md'])];

    expect(collectConsultedAdrs(sources, projectPath, 'docs/adrs')).toEqual([]);
  });

  it('ignores sources that are not project_files', () => {
    const sources = [
      { type: 'web_search', data: { files: ['docs/adrs/adr-001-caching.md'] } },
      { type: 'knowledge_graph', data: {} },
    ];

    expect(collectConsultedAdrs(sources, projectPath, 'docs/adrs')).toEqual([]);
  });

  it('survives a malformed source rather than throwing mid-write', () => {
    // saveContext runs inside the tool's try/catch, so a throw here would
    // discard the whole research document over one bad entry.
    const sources = [
      { type: 'project_files' },
      { type: 'project_files', data: {} },
      { type: 'project_files', data: { files: 'docs/adrs/adr-001-caching.md' } },
      filesSource([null, 42, undefined, '', 'docs/adrs/adr-001-caching.md']),
    ] as Array<{ type: string; data?: any }>;

    expect(collectConsultedAdrs(sources, projectPath, 'docs/adrs')).toEqual([
      rel('docs', 'adrs', 'adr-001-caching.md'),
    ]);
  });

  it('returns an empty list when no ADRs were read, rather than inventing them', () => {
    // The failure this replaces was `adrs: []` unconditionally. An empty list is
    // still correct when it is true; what matters is that it is derived.
    expect(collectConsultedAdrs([filesSource(['src/index.ts'])], projectPath, 'docs/adrs')).toEqual(
      []
    );
    expect(collectConsultedAdrs([], projectPath, 'docs/adrs')).toEqual([]);
  });
});
