/**
 * #1537 acceptance: "A test asserting no example.com URL can appear in a tool
 * result — written red first."
 *
 * It is NOT red, and that is worth saying plainly rather than implying a check
 * that caught something. The source of those URLs was
 * `ResearchOrchestrator.generateFallbackSearchResults`, and #1526 deleted it
 * along with @mendable/firecrawl-js — so by the time this test could be written,
 * the condition it guards was already gone. Its value is as a ratchet: the
 * fabrication was introduced once and survived long enough to be documented in
 * two issues, so the cheapest insurance is a test that fails if it returns.
 *
 * Worth recording what the fabrication actually did, because both issues
 * described it wrongly. The invented URLs never reached a user: `performWebSearch`
 * filtered its results on a `found` field the fabricated objects never had, so
 * every one was discarded. The tool returned "Search Results (0 found)" while
 * naming a provider that was never constructed.
 */

import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const SRC = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../src');

// A plain recursive walk rather than fs.globSync: globSync landed in Node 22 and
// the CI matrix still builds on Node 20, where it is undefined.
function tsFilesUnder(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap(entry => {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) return tsFilesUnder(full);
    return entry.isFile() && entry.name.endsWith('.ts') ? [full] : [];
  });
}

describe('no fabricated sources reach a tool result', () => {
  const files = tsFilesUnder(SRC);

  it('scans a non-trivial number of source files', () => {
    // Guards the guard: a glob that silently matches nothing would make every
    // assertion below vacuously true. #1526 shipped exactly that mistake once.
    expect(files.length).toBeGreaterThan(100);
  });

  it('constructs no example.com URL', () => {
    const offenders = files.filter(f =>
      /https?:\/\/(?:[\w.-]+\.)?example\.com/.test(readFileSync(f, 'utf-8'))
    );
    expect(offenders.map(f => path.relative(SRC, f))).toEqual([]);
  });

  it('has no fallback that invents search results', () => {
    const offenders = files.filter(f =>
      /generateFallbackSearchResults|placeholder result/i.test(readFileSync(f, 'utf-8'))
    );
    expect(offenders.map(f => path.relative(SRC, f))).toEqual([]);
  });
});
