/**
 * Where perform_research writes, and what it cites (#1528).
 *
 * The tool advertised no output path and wrote to docs/context/research/ --
 * a directory no caller could set, discover from the tool schema, or predict
 * from the docs -- while every document it produced cited zero ADRs.
 *
 * Both halves are user-visible facts about files on disk, so both are asserted
 * against a real run over a throwaway project rather than against the shape of
 * the source. The orchestrator does no network work here: the answer comes from
 * project files and an empty knowledge graph.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { promises as fs } from 'fs';
import * as os from 'os';
import * as path from 'path';
import { performResearch } from '../../src/tools/perform-research-tool.js';

describe('perform_research output (#1528)', () => {
  let projectPath: string;

  const listFiles = async (dir: string): Promise<string[]> => {
    const entries = await fs.readdir(dir, { withFileTypes: true }).catch(() => []);
    return entries.filter(e => e.isFile()).map(e => e.name);
  };

  beforeEach(async () => {
    projectPath = await fs.mkdtemp(path.join(os.tmpdir(), 'perform-research-'));
    await fs.mkdir(path.join(projectPath, 'docs', 'adrs'), { recursive: true });
    // The filename deliberately does not contain the question's keywords. The
    // orchestrator's PHASE 4 keyword search matches on filename, so an ADR
    // called adr-001-caching.md would be found by accident even with PHASE 3
    // ("Always include ADRs") broken -- which is exactly why the break went
    // unnoticed. Only PHASE 3 can reach this file.
    await fs.writeFile(
      path.join(projectPath, 'docs', 'adrs', 'adr-001-storage-layer.md'),
      '# ADR-001: Storage Layer\n\n## Status\n\nAccepted\n\n' +
        'Research results are cached in memory, so caching is handled here.\n'
    );
    await fs.writeFile(path.join(projectPath, 'docs', 'adrs', 'README.md'), '# ADR Index\n');
  });

  afterEach(async () => {
    await fs.rm(projectPath, { recursive: true, force: true }).catch(() => {});
  });

  it('writes the research document to docs/research/, and nothing to docs/context/', async () => {
    await performResearch({ question: 'how is caching handled', projectPath });

    const written = await listFiles(path.join(projectPath, 'docs', 'research'));
    expect(written.filter(f => f.startsWith('perform-research-'))).toHaveLength(1);
    expect(written).toContain('latest.md');

    // The orphan a clean-fixture run caught: an empty docs/context/research/
    // left behind by an eager initialize() at this call site.
    await expect(fs.access(path.join(projectPath, 'docs', 'context'))).rejects.toThrow();
  }, 60_000);

  it('honours an explicit researchDirectory', async () => {
    await performResearch({
      question: 'how is caching handled',
      projectPath,
      researchDirectory: 'notes/spikes',
    });

    const written = await listFiles(path.join(projectPath, 'notes', 'spikes'));
    expect(written.filter(f => f.startsWith('perform-research-'))).toHaveLength(1);
    await expect(fs.access(path.join(projectPath, 'docs', 'research'))).rejects.toThrow();
  }, 60_000);

  it('cites the ADRs it consulted, and no dead links', async () => {
    await performResearch({ question: 'how is caching handled', projectPath });

    const doc = await fs.readFile(path.join(projectPath, 'docs', 'research', 'latest.md'), 'utf-8');

    expect(doc).toContain('**ADRs**:');
    expect(doc).toContain('docs/adrs/adr-001-storage-layer.md');
    // The index is not a decision.
    expect(doc).not.toContain('docs/adrs/README.md');

    // Every path under **ADRs**: must exist -- a citation that cannot be opened
    // is worse than none, and is what the repository-wide check will forbid.
    const cited = [...doc.matchAll(/^- `(.+\.md)`$/gm)].map(m => m[1]!);
    expect(cited.length).toBeGreaterThan(0);
    for (const c of cited) {
      await expect(fs.access(path.join(projectPath, c))).resolves.toBeUndefined();
    }
  }, 60_000);

  it('points the reader at the file it just wrote', async () => {
    await performResearch({ question: 'how is caching handled', projectPath });

    const doc = await fs.readFile(path.join(projectPath, 'docs', 'research', 'latest.md'), 'utf-8');
    expect(doc).toContain('docs/research/latest.md');
  }, 60_000);
});
