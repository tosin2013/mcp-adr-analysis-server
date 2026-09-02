/**
 * ADR format reader and Nygard -> MADR converter (issue #1466).
 *
 * Pure functions, no I/O and no side effects — modelled on `src/utils/rule-format.ts`.
 * Two capabilities:
 *
 *   - `detectAdrFormat(content)` classifies an ADR document as `'nygard'`, `'madr'`,
 *     or `'custom'`.
 *   - `convertNygardToMadr(content)` rewrites a Nygard-style ADR into the ADR-022
 *     canonical MADR shape the real corpus uses (see docs/adrs/adr-025 and adr-026 as
 *     golden references), with `js-yaml` front matter.
 *
 * Field-level parsing (title/status/date/context/decision/consequences/tags) is reused
 * from `adr-discovery.ts` via the shared `extractAdrFields` helper rather than keeping a
 * third private copy of those regexes.
 */

import yaml from 'js-yaml';
import { extractAdrFields } from './adr-discovery.js';

/**
 * The three ADR document shapes this module distinguishes.
 *
 * Exported for future reuse by the inline `templateFormat` unions elsewhere in the
 * codebase (adr-suggestion-tool.ts, mcp-tool-schemas.ts, types/tool-arguments.ts,
 * adr-suggestion-prompts.ts). Those sites are intentionally NOT rewired here — see #1466
 * scope and #1647.
 */
export type AdrFormat = 'nygard' | 'madr' | 'custom';

/**
 * Does the document open with a `---...---` YAML front-matter block that declares
 * `status:` and/or `date:`?
 */
function hasFrontMatterStatusOrDate(content: string): boolean {
  const fmMatch = content.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!fmMatch || !fmMatch[1]) return false;
  return /^[ \t]*(?:status|date):/im.test(fmMatch[1]);
}

/** Does the document use MADR-style headings? */
function hasMadrHeadings(content: string): boolean {
  return (
    /^##\s+Context and Problem Statement\s*$/im.test(content) ||
    /^##\s+Considered Options\s*$/im.test(content) ||
    /^##\s+Decision Drivers\s*$/im.test(content)
  );
}

/**
 * Detect the format of an ADR document.
 *
 * - `'madr'`  — leading YAML front matter with `status:`/`date:` AND MADR headings
 *   (`## Context and Problem Statement`, and/or `## Considered Options`/
 *   `## Decision Drivers`).
 * - `'nygard'` — the Nygard heading set (`## Status`, `## Context`, `## Decision`,
 *   `## Consequences`) with a status value on the following line.
 * - `'custom'` — anything else.
 */
export function detectAdrFormat(content: string): AdrFormat {
  if (hasFrontMatterStatusOrDate(content) && hasMadrHeadings(content)) {
    return 'madr';
  }

  // Nygard: reuse the field extractor's heading regexes. Context/Decision/Consequences
  // each require the `##`-heading-then-body form, and a status value on the following
  // line resolves to something other than the 'unknown' sentinel.
  const fields = extractAdrFields(content);
  const hasNygardSet =
    fields.status !== 'unknown' &&
    fields.context !== undefined &&
    fields.decision !== undefined &&
    fields.consequences !== undefined;
  if (hasNygardSet) {
    return 'nygard';
  }

  return 'custom';
}

/**
 * Map a Nygard status value onto the lowercase MADR status vocabulary.
 *
 * Nygard "Accepted" -> "accepted", "Deprecated" -> "deprecated",
 * "Superseded" -> "superseded", "Proposed" -> "proposed". Absent/unknown -> "proposed".
 * Any other value passes through lowercased.
 */
function mapStatusToMadr(status: string | undefined): string {
  const s = (status ?? '').trim().toLowerCase();
  if (!s || s === 'unknown') return 'proposed';
  if (s.startsWith('accept')) return 'accepted';
  if (s.startsWith('deprecat')) return 'deprecated';
  if (s.startsWith('supersed')) return 'superseded';
  if (s.startsWith('propos')) return 'proposed';
  return s;
}

/**
 * Convert a Nygard-style ADR into the ADR-022 canonical MADR shape.
 *
 * Idempotent: content already detected as `'madr'` is returned unchanged.
 *
 * `'custom'` content is converted best-effort — whatever Nygard-shaped sections can be
 * recovered are carried across, and any section with nothing to carry becomes an empty
 * placeholder heading. The result is always valid MADR (front matter + MADR headings).
 */
export function convertNygardToMadr(content: string): string {
  if (detectAdrFormat(content) === 'madr') {
    return content;
  }

  const fields = extractAdrFields(content);

  // Build the YAML front matter via js-yaml (block style, 2-space indent).
  const frontMatter: Record<string, unknown> = { status: mapStatusToMadr(fields.status) };
  if (fields.date) frontMatter['date'] = fields.date;
  if (fields.tags.length > 0) frontMatter['tags'] = fields.tags;

  const yamlBlock = yaml.dump(frontMatter, { indent: 2, lineWidth: -1 }).trimEnd();

  const title = fields.title ?? 'ADR';

  const section = (body: string | undefined): string => (body && body.trim() ? body.trim() : '');

  const lines: string[] = [
    '---',
    yamlBlock,
    '---',
    '',
    `# ${title}`,
    '',
    '## Context and Problem Statement',
    '',
    section(fields.context),
    '',
    '## Decision',
    '',
    section(fields.decision),
    '',
    '## Consequences',
    '',
    section(fields.consequences),
    '',
    '## More Information',
    '',
  ];

  // Collapse the doubled blank lines that empty sections introduce, then end with a
  // single trailing newline.
  return lines
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .replace(/\s*$/, '\n');
}
