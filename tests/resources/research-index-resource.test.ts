/**
 * #1530: the research index is calibrated to a filename convention nothing
 * produces.
 *
 * `perform_research` writes `perform-research-{ISO}.md`. `extractTopic` split
 * the basename on `_` only, so a real filename yielded exactly one part, the
 * `parts.includes('research')` branch was never taken, and the returned "topic"
 * was the entire filename including its timestamp.
 *
 * Worth recording that the *dead* convention was no better, which #1530 does not
 * say. `perform_research_test_research_001` splits to five parts, `indexOf`
 * finds `research` at 1, and the function returns `parts.slice(0, 2)` --
 * the constant `"perform_research"`, for every document ever written. So
 * `summary.byTopic` was a single bucket under both conventions. The facet was
 * decorative, not merely miscalibrated.
 *
 * The fix derives the topic from the `- Question:` line the document records in
 * its Key Findings. Not from the heading: the file on disk is a tool-context
 * document whose H1 is `# Tool Context: perform_research`, identical in every
 * research document ever written, so reading the heading rebuilds the same
 * single-bucket defect by a different route. That was not obvious from the
 * source -- `perform-research-tool.ts:159` builds a `# Research Results:
 * {question}` heading, but that string is the reply to the caller and never
 * reaches the file. Only the end-to-end case at the bottom of this file caught
 * it; the hand-written fixtures agreed with the wrong guess.
 *
 * Which of these were red, stated plainly: four of the eight, verified in both
 * directions against the original `extractTopic`. Red were `derives a topic
 * from the document`, `groups by that topic in the summary`, `reads the title
 * of a hand-written note`, and the end-to-end `classifies a document the tool
 * itself produced`. The other four pass either way and are kept as guards
 * rather than claimed as catches -- `never reports the tool name as a topic`
 * in particular guards the wrong fix, not the old defect, since the old code
 * returned a filename and could not have surfaced the heading.
 *
 * Every branch of the new `extractTopic` is discriminated by a test: removing
 * the `- Question:` parse fails three, removing the title fallback fails one,
 * and the filename fallback has its own case.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { generateResearchIndexResource } from '../../src/resources/research-index-resource.js';
import { resourceCache } from '../../src/resources/resource-cache.js';

/**
 * What perform_research actually writes. Copied from a real run, not invented:
 * the H1 is the tool name, identical in every research document ever produced,
 * and the question appears only in the body.
 */
const liveDoc = (question: string, confidence: number) => `# Tool Context: perform_research

> **Generated**: 2026-08-28T04:37:26.533Z
> **Tool Version**: 2.0.0
> **Project**: example

## Quick Reference

Research: "${question}" - ${confidence}% confidence. Sources: 📁 Project Files

## Execution Summary

- **Status**: Research completed with ${confidence}% confidence
- **Confidence**: ${confidence}%
- **Key Findings**:
  - Question: ${question}
  - Confidence: ${confidence}.0%
`;

const LIVE_NAME = 'perform-research-2026-08-28T04-37-26-533Z.md';
const LIVE_DOC = liveDoc('Kubernetes ingress configuration', 82);

const SECOND_NAME = 'perform-research-2026-08-28T09-12-00-000Z.md';
const SECOND_DOC = liveDoc('Database connection pooling', 71);

let dir: string;

// The resource resolves its directories against process.cwd(), and vitest
// workers cannot chdir. Stubbing cwd is the only way to point it at a fixture.
beforeEach(() => {
  dir = mkdtempSync(path.join(tmpdir(), 'research-index-'));
  mkdirSync(path.join(dir, 'docs', 'research'), { recursive: true });
  writeFileSync(path.join(dir, 'docs', 'research', LIVE_NAME), LIVE_DOC);
  writeFileSync(path.join(dir, 'docs', 'research', SECOND_NAME), SECOND_DOC);
  vi.spyOn(process, 'cwd').mockReturnValue(dir);
  resourceCache.clear();
});

afterEach(() => {
  vi.restoreAllMocks();
  rmSync(dir, { recursive: true, force: true });
  resourceCache.clear();
});

const docs = async () => {
  const r = await generateResearchIndexResource();
  return (r.data as any).documents as Array<{ id: string; title: string; topic: string }>;
};

describe('research index — files perform_research actually writes', () => {
  it('finds them at all', async () => {
    const d = await docs();
    expect(d.map(x => x.id).sort()).toEqual([
      'perform-research-2026-08-28T04-37-26-533Z',
      'perform-research-2026-08-28T09-12-00-000Z',
    ]);
  });

  it('derives a topic from the document, not from its timestamp', async () => {
    const d = await docs();
    const live = d.find(x => x.id.includes('04-37-26'))!;
    expect(live.topic).toBe('Kubernetes ingress configuration');
    expect(live.title).toBe('Tool Context: perform_research');
    // The specific regression: the timestamp leaking into the topic.
    expect(live.topic).not.toContain('2026');
    expect(live.topic).not.toContain('perform-research');
  });

  it('gives documents on different questions different topics', async () => {
    const d = await docs();
    const topics = new Set(d.map(x => x.topic));
    // Both the live and the retired convention collapsed every document into a
    // single bucket. Two documents on unrelated questions must not share one.
    expect(topics.size).toBe(2);
  });

  it('groups by that topic in the summary', async () => {
    const r = await generateResearchIndexResource();
    const byTopic = (r.data as any).summary.byTopic as Record<string, number>;
    expect(Object.keys(byTopic).sort()).toEqual([
      'Database connection pooling',
      'Kubernetes ingress configuration',
    ]);
  });

  it('reads the title of a hand-written note that has no Question line', async () => {
    writeFileSync(
      path.join(dir, 'docs', 'research', 'notes.md'),
      '# Sidecar proxy overhead\n\nMeasured at 3ms.\n'
    );
    resourceCache.clear();
    const d = await docs();
    expect(d.find(x => x.id === 'notes')!.topic).toBe('Sidecar proxy overhead');
  });

  it('falls back to the filename when there is nothing to read', async () => {
    writeFileSync(path.join(dir, 'docs', 'research', 'scratch.md'), 'no heading here\n');
    resourceCache.clear();
    const d = await docs();
    expect(d.find(x => x.id === 'scratch')!.topic).toBe('scratch');
  });

  it('never reports the tool name as a topic', async () => {
    // The H1 is `# Tool Context: perform_research` in every research document.
    // Deriving the topic from it would rebuild the single-bucket defect.
    const d = await docs();
    for (const doc of d) {
      expect(doc.topic).not.toContain('Tool Context');
      expect(doc.topic).not.toBe('perform_research');
    }
  });
});

/**
 * #1530's acceptance asks that this be "verified by running the tool and reading
 * the resource, not by unit test alone". The fixtures above are hand-written, so
 * they prove the resource handles a filename shape I asserted the tool produces.
 * This one removes that assumption: perform_research writes the file, and the
 * resource reads whatever it actually wrote.
 */
describe('research index — end to end with a real perform_research run', () => {
  it('classifies a document the tool itself produced', async () => {
    const { performResearch } = await import('../../src/tools/perform-research-tool.js');
    const project = mkdtempSync(path.join(tmpdir(), 'research-e2e-'));
    mkdirSync(path.join(project, 'docs', 'adrs'), { recursive: true });
    writeFileSync(
      path.join(project, 'docs', 'adrs', 'adr-001-storage-layer.md'),
      '# ADR-001: Storage Layer\n\n## Status\n\nAccepted\n\nResults are cached in memory.\n'
    );

    try {
      await performResearch({
        question: 'How is caching handled',
        projectPath: project,
        adrDirectory: 'docs/adrs',
      });

      vi.spyOn(process, 'cwd').mockReturnValue(project);
      resourceCache.clear();
      const result = await generateResearchIndexResource();
      const written = (result.data as any).documents as Array<{ id: string; topic: string }>;

      // The tool writes latest.md alongside the timestamped file; both are real
      // output and both must classify.
      expect(written.length).toBeGreaterThan(0);
      for (const doc of written) {
        expect(doc.topic).toBe('How is caching handled');
      }
    } finally {
      vi.restoreAllMocks();
      rmSync(project, { recursive: true, force: true });
      resourceCache.clear();
    }
  }, 30_000);
});
