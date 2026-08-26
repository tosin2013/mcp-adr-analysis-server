/**
 * Tag extraction from ADR front matter.
 *
 * ADR-022 adopted MADR, whose template uses YAML block lists for `tags:`. The original
 * extractor was a single regex that captured only what followed `tags:` on the SAME line,
 * so the idiomatic form returned `["- architecture"]` — the dash kept, every entry after
 * the first silently dropped. The inline comma form worked; the bracket form kept its
 * brackets. In other words the one form the adopted standard prescribes was the one that
 * did not work.
 *
 * These tests pin all three, plus the scoping rule: `tags:` in prose must not be picked
 * up, which is the same false-positive class that bit scripts/check-adr-drift.sh.
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { discoverAdrsInDirectory } from '../../src/utils/adr-discovery.js';
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

let dir: string;

const HEADER = '# ADR-001: Example\n\n## Status\n\nAccepted\n\n## Context\n\nSomething.\n';

function write(name: string, body: string) {
  writeFileSync(join(dir, name), body);
}

describe('ADR tag extraction', () => {
  beforeAll(() => {
    dir = mkdtempSync(join(tmpdir(), 'adr-tags-'));
  });
  afterAll(() => {
    rmSync(dir, { recursive: true, force: true });
  });

  it('parses a YAML block list — the MADR form', async () => {
    write('adr-001-block.md', `---\ntags:\n  - architecture\n  - protocol\n---\n\n${HEADER}`);
    const r = await discoverAdrsInDirectory(dir, dir);
    const adr = r.adrs.find(a => a.filename === 'adr-001-block.md');
    // Before the fix this returned ["- architecture"].
    expect(adr?.metadata?.tags).toEqual(['architecture', 'protocol']);
    expect(adr?.metadata?.category).toBe('architecture');
  });

  it('parses the inline comma form', async () => {
    write('adr-002-inline.md', `---\ntags: architecture, protocol\n---\n\n${HEADER}`);
    const r = await discoverAdrsInDirectory(dir, dir);
    const adr = r.adrs.find(a => a.filename === 'adr-002-inline.md');
    expect(adr?.metadata?.tags).toEqual(['architecture', 'protocol']);
  });

  it('parses the bracket form without keeping the brackets', async () => {
    write('adr-003-bracket.md', `---\ntags: [architecture, protocol]\n---\n\n${HEADER}`);
    const r = await discoverAdrsInDirectory(dir, dir);
    const adr = r.adrs.find(a => a.filename === 'adr-003-bracket.md');
    // Before the fix this returned ["[architecture", "protocol]"].
    expect(adr?.metadata?.tags).toEqual(['architecture', 'protocol']);
  });

  it('ignores a tags: mention in prose when front matter is present', async () => {
    write(
      'adr-004-prose.md',
      `---\ntags:\n  - security\n---\n\n${HEADER}\nWe considered whether tags: deployment, testing would help.\n`
    );
    const r = await discoverAdrsInDirectory(dir, dir);
    const adr = r.adrs.find(a => a.filename === 'adr-004-prose.md');
    expect(adr?.metadata?.tags).toEqual(['security']);
  });

  it('leaves an untagged ADR with no tags rather than inventing one', async () => {
    write('adr-005-none.md', HEADER);
    const r = await discoverAdrsInDirectory(dir, dir);
    const adr = r.adrs.find(a => a.filename === 'adr-005-none.md');
    expect(adr?.metadata?.tags ?? []).toEqual([]);
    expect(adr?.metadata?.category).toBeUndefined();
  });

  it('counts ADRs by category once tags exist', async () => {
    const r = await discoverAdrsInDirectory(dir, dir);
    // The whole point: byCategory reported `uncategorized: 24` for this repository
    // because no ADR carried a tag. With tags present it must resolve real areas.
    expect(r.summary.byCategory['architecture']).toBeGreaterThan(0);
    expect(r.summary.byCategory['security']).toBe(1);
  });
});
