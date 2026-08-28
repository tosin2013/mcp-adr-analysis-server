/**
 * validate_all_adrs reported every ADR valid, always (#1539).
 *
 * The loop awaited `validateAdr` and bound its return to nothing, then pushed a
 * literal:
 *
 *     await validateAdr({ ... });          // result discarded
 *     results.push({ isValid: true, confidence: 0.8, findings: [] });
 *
 * so `validAdrs = results.filter(r => r.isValid).length` equalled `totalAdrs` on
 * every run, and `criticalIssues` was always 0. The tool that validates ADRs --
 * this product's core function -- could not report an invalid one. The only way
 * to observe a problem was for `validateAdr` to throw, which was caught and
 * warned.
 *
 * This runs against a real temp project rather than mocking the module graph:
 * the assertion is about what a user sees in the summary, and `validateAdr`
 * without an API key takes the rule-based path, which needs no network.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { promises as fs } from 'fs';
import * as os from 'os';
import * as path from 'path';
import { validateAllAdrs } from '../../src/tools/adr-validation-tool.js';

describe('validate_all_adrs summary (#1539)', () => {
  let projectPath: string;

  const writeAdr = async (name: string, body: string) => {
    await fs.writeFile(path.join(projectPath, 'docs', 'adrs', name), body);
  };

  beforeEach(async () => {
    projectPath = await fs.mkdtemp(path.join(os.tmpdir(), 'validate-all-adrs-'));
    await fs.mkdir(path.join(projectPath, 'docs', 'adrs'), { recursive: true });

    await writeAdr(
      'adr-001-caching.md',
      '# ADR-001: Caching\n\n## Status\n\nAccepted\n\n## Context\n\nRepeated reads are slow.\n\n## Decision\n\nWe cache research results in memory.\n'
    );

    // Accepted, but decides nothing. This is not hypothetical: ADR-023 shipped in
    // exactly this state and needed #1490 to record its Decision.
    await writeAdr(
      'adr-002-undecided.md',
      '# ADR-002: Undecided\n\n## Status\n\nAccepted\n\n## Context\n\nWe considered several options.\n'
    );
  });

  afterEach(async () => {
    await fs.rm(projectPath, { recursive: true, force: true }).catch(() => {});
  });

  const summary = async () => {
    const result = await validateAllAdrs({ projectPath, adrDirectory: 'docs/adrs' });
    return result.content[0].text as string;
  };

  it('reports an ADR invalid when it is', async () => {
    const text = await summary();

    expect(text).toContain('**Total ADRs Validated**: 2');
    expect(text, 'an Accepted ADR that decides nothing is not valid').not.toContain(
      '**Valid ADRs**: 2 (100.0%)'
    );
    expect(text).toContain('**Invalid/Drifted ADRs**: 1');
  }, 60_000);

  it('names which ADR failed, not just a count', async () => {
    const text = await summary();

    // Entries are keyed by the ADR's own title heading; the filename appears last,
    // on the Path line, so slicing from it lands in the following entry.
    const entry = text.slice(text.indexOf('### ADR-002'));
    expect(entry.slice(0, entry.indexOf('- **Path**'))).toContain('Needs Review');
  }, 60_000);

  it('counts critical issues from findings rather than reporting zero', async () => {
    const text = await summary();

    expect(text).not.toContain('**Critical Issues**: 0');
  }, 60_000);

  it('still reports a sound ADR as valid', async () => {
    const text = await summary();

    const entry = text.slice(text.indexOf('### ADR-001'));
    expect(entry.slice(0, entry.indexOf('- **Path**'))).toContain('✅ Valid');
  }, 60_000);

  it('derives confidence per ADR rather than emitting a constant', async () => {
    const text = await summary();

    // Every entry read `**Confidence**: 80.0%` because 0.8 was hardcoded.
    const confidences = [...text.matchAll(/\*\*Confidence\*\*: ([\d.]+)%/g)].map(m => m[1]);
    expect(confidences.length).toBe(2);
    expect(new Set(confidences).has('80.0') && confidences.length === 2).toBe(false);
  }, 60_000);
});
