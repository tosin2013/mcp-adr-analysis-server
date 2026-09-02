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
 * The fields a reader recovers from an ADR document, format-agnostic
 * (title, status, date, number, the Context/Decision/Consequences sections, and
 * front-matter tags). This is the single home for the field-extraction regexes:
 * `adr-discovery.ts`'s `parseAdrMetadata` and this module's reader/converter both
 * read through `extractAdrFields` rather than each keeping a private copy.
 */
export interface ExtractedAdrFields {
  title?: string;
  status: string;
  date?: string;
  number?: string;
  context?: string;
  decision?: string;
  consequences?: string;
  tags: string[];
}

/**
 * Extract ADR fields from raw markdown content.
 *
 * `filename` is optional: when supplied it seeds the title fallback and the ADR-number
 * lookup (callers that only have content, such as the format converter, omit it).
 */
export function extractAdrFields(content: string, filename = ''): ExtractedAdrFields {
  // Extract title (usually first # heading)
  let title: string | undefined = filename ? filename.replace(/\.md$/, '') : undefined;
  const titleMatch = content.match(/^#\s+(.+)$/m);
  if (titleMatch && titleMatch[1]) {
    title = titleMatch[1].trim();
  }

  // Extract status
  let status = 'unknown';
  const statusMatch = content.match(/(?:##?\s*status|status:)\s*(.+?)(?:\n|$)/i);
  if (statusMatch && statusMatch[1]) {
    status = statusMatch[1].trim().toLowerCase();
  }

  // Extract date
  let date: string | undefined;
  const dateMatch = content.match(/(?:##?\s*date|date:)\s*(.+?)(?:\n|$)/i);
  if (dateMatch && dateMatch[1]) {
    date = dateMatch[1].trim();
  }

  // Extract ADR number from filename or content
  let number: string | undefined;
  const numberMatch =
    (filename ? filename.match(/(?:adr[-_]?)?(\d+)/i) : null) || content.match(/adr[-_]?(\d+)/i);
  if (numberMatch && numberMatch[1]) {
    number = numberMatch[1];
  }

  // Extract context
  let context: string | undefined;
  const contextMatch = content.match(/##?\s*context\s*\n([\s\S]*?)(?=\n##|\n#|$)/i);
  if (contextMatch && contextMatch[1]) {
    context = contextMatch[1].trim();
  }

  // Extract decision
  let decision: string | undefined;
  const decisionMatch = content.match(/##?\s*decision\s*\n([\s\S]*?)(?=\n##|\n#|$)/i);
  if (decisionMatch && decisionMatch[1]) {
    decision = decisionMatch[1].trim();
  }

  // Extract consequences
  let consequences: string | undefined;
  const consequencesMatch = content.match(/##?\s*consequences\s*\n([\s\S]*?)(?=\n##|\n#|$)/i);
  if (consequencesMatch && consequencesMatch[1]) {
    consequences = consequencesMatch[1].trim();
  }

  // Extract category/tags (if any).
  //
  // Three forms occur in the wild, and the idiomatic MADR one used to be the only one
  // that did NOT work -- a YAML block list returned ["- architecture"], capturing the
  // dash and dropping every entry after the first. ADR-022 adopted MADR, whose template
  // uses block lists, so that was the form this needed most.
  //
  //   tags:               tags: a, b        tags: [a, b]
  //     - a
  //     - b
  //
  // Scoped to the leading `---` front-matter block when one is present, so a `tags:`
  // mention in prose cannot be picked up -- the same discipline scripts/check-adr-drift.sh
  // and repo-governor's adapters/adr both use after that exact false positive.
  const tags: string[] = [];
  const fmMatch = content.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  const tagScope = fmMatch?.[1] ?? content;

  const blockMatch = tagScope.match(
    /^[ \t]*(?:tags?|categories?):[ \t]*\r?\n((?:[ \t]*-[ \t]*\S.*\r?\n?)+)/im
  );
  if (blockMatch?.[1]) {
    tags.push(
      ...blockMatch[1]
        .split(/\r?\n/)
        .map(line => line.replace(/^[ \t]*-[ \t]*/, '').trim())
        .filter(Boolean)
    );
  } else {
    const inlineMatch = tagScope.match(/^[ \t]*(?:tags?|categories?):[ \t]*(.+?)[ \t]*\r?$/im);
    if (inlineMatch?.[1]) {
      tags.push(
        ...inlineMatch[1]
          .replace(/^\[|\]$/g, '') // tolerate the bracket form, which used to keep its brackets
          .split(',')
          .map(tag => tag.trim().replace(/^['"]|['"]$/g, ''))
          .filter(Boolean)
      );
    }
  }

  const fields: ExtractedAdrFields = { status, tags };
  if (title !== undefined) fields.title = title;
  if (date) fields.date = date;
  if (number) fields.number = number;
  if (context) fields.context = context;
  if (decision) fields.decision = decision;
  if (consequences) fields.consequences = consequences;
  return fields;
}

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
