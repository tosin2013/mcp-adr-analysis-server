/**
 * Unit tests for adr-format.ts — the pure-function ADR format reader and the
 * Nygard -> MADR converter (issue #1466).
 *
 * These are pure-function asserts in the spirit of tests/utils/rule-format.test.ts,
 * with inline ADR markdown constants like tests/utils/adr-discovery-tags.test.ts.
 */

import { describe, it, expect } from 'vitest';
import yaml from 'js-yaml';
import {
  detectAdrFormat,
  convertNygardToMadr,
  type AdrFormat,
} from '../../src/utils/adr-format.js';

// A classic Nygard-style ADR: `## Status/## Context/## Decision/## Consequences`
// headings with the value on the following line, no YAML front matter.
const NYGARD_ADR = `# ADR-001: Use PostgreSQL

## Status

Accepted

## Context

We need a relational database with strong consistency for the billing service.

## Decision

We will use PostgreSQL as our primary datastore.

## Consequences

We gain ACID guarantees but must manage schema migrations ourselves.
`;

// A MADR-style ADR: YAML front matter with status/date/tags plus MADR headings.
const MADR_ADR = `---
status: accepted
date: 2026-01-15
tags:
  - database
  - architecture
---

# ADR-001: Use PostgreSQL

## Context and Problem Statement

We need a relational database with strong consistency.

## Decision

Use PostgreSQL.

## Consequences

Strong consistency, migrations to manage.

## More Information

None.
`;

// A freeform, non-ADR document.
const FREEFORM = `# Weekend Notes

Just some random thoughts about the project roadmap and the weather.
`;

describe('detectAdrFormat', () => {
  it('detects a Nygard ADR as "nygard"', () => {
    const format: AdrFormat = detectAdrFormat(NYGARD_ADR);
    expect(format).toBe('nygard');
  });

  it('detects a MADR ADR (YAML front matter) as "madr"', () => {
    expect(detectAdrFormat(MADR_ADR)).toBe('madr');
  });

  it('detects a freeform document as "custom"', () => {
    expect(detectAdrFormat(FREEFORM)).toBe('custom');
  });

  it('does not misread MADR headings without front matter as nygard', () => {
    // MADR headings but no `## Status/## Decision/## Consequences` Nygard set
    const noFm = `# ADR-009: Something

## Context and Problem Statement

Some context.

## Considered Options

- a
- b
`;
    expect(detectAdrFormat(noFm)).toBe('custom');
  });
});

describe('convertNygardToMadr', () => {
  it('produces output detected as MADR', () => {
    const out = convertNygardToMadr(NYGARD_ADR);
    expect(detectAdrFormat(out)).toBe('madr');
  });

  it('emits YAML front matter parseable by js-yaml with a lowercased status', () => {
    const out = convertNygardToMadr(NYGARD_ADR);
    const fmMatch = out.match(/^---\r?\n([\s\S]*?)\r?\n---/);
    expect(fmMatch).not.toBeNull();
    const fm = yaml.load(fmMatch![1]) as Record<string, unknown>;
    expect(fm.status).toBe('accepted');
  });

  it('preserves the title (including the ADR number)', () => {
    const out = convertNygardToMadr(NYGARD_ADR);
    expect(out).toContain('# ADR-001: Use PostgreSQL');
  });

  it('uses the "## Context and Problem Statement" heading and carries the Context text', () => {
    const out = convertNygardToMadr(NYGARD_ADR);
    expect(out).toContain('## Context and Problem Statement');
    expect(out).toContain('We need a relational database with strong consistency');
  });

  it('carries the Decision and Consequences text', () => {
    const out = convertNygardToMadr(NYGARD_ADR);
    expect(out).toContain('## Decision');
    expect(out).toContain('We will use PostgreSQL as our primary datastore.');
    expect(out).toContain('## Consequences');
    expect(out).toContain('We gain ACID guarantees but must manage schema migrations ourselves.');
  });

  describe('status mapping', () => {
    const cases: Array<[string, string]> = [
      ['Accepted', 'accepted'],
      ['Deprecated', 'deprecated'],
      ['Superseded', 'superseded'],
      ['Proposed', 'proposed'],
    ];

    it.each(cases)('maps Nygard status %s -> %s', (nygardStatus, madrStatus) => {
      const doc = NYGARD_ADR.replace('Accepted', nygardStatus);
      const out = convertNygardToMadr(doc);
      const fm = yaml.load(out.match(/^---\r?\n([\s\S]*?)\r?\n---/)![1]) as Record<string, unknown>;
      expect(fm.status).toBe(madrStatus);
    });

    it('defaults to "proposed" when no status is present', () => {
      const noStatus = `# ADR-002: Something

## Context

Ctx.

## Decision

Dec.

## Consequences

Con.
`;
      const out = convertNygardToMadr(noStatus);
      const fm = yaml.load(out.match(/^---\r?\n([\s\S]*?)\r?\n---/)![1]) as Record<string, unknown>;
      expect(fm.status).toBe('proposed');
    });
  });

  it('preserves tags from source front matter', () => {
    // A Nygard-body ADR that nonetheless carries a YAML tags block up top.
    const withTags = `---
tags:
  - database
  - billing
---

${NYGARD_ADR}`;
    const out = convertNygardToMadr(withTags);
    const fm = yaml.load(out.match(/^---\r?\n([\s\S]*?)\r?\n---/)![1]) as Record<string, unknown>;
    expect(fm.tags).toEqual(['database', 'billing']);
  });

  it('preserves the date when present', () => {
    const withDate = NYGARD_ADR.replace('## Status', '## Date\n\n2026-02-02\n\n## Status');
    const out = convertNygardToMadr(withDate);
    const fm = yaml.load(out.match(/^---\r?\n([\s\S]*?)\r?\n---/)![1]) as Record<string, unknown>;
    expect(String(fm.date)).toContain('2026-02-02');
  });

  it('is idempotent: converting an already-MADR doc returns it unchanged and still MADR', () => {
    const out = convertNygardToMadr(MADR_ADR);
    expect(out).toBe(MADR_ADR);
    expect(detectAdrFormat(out)).toBe('madr');
  });
});
