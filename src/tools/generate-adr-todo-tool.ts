/**
 * generate_adr_todo MCP Tool
 *
 * Decomposes ADRs into TODO entries with stable IDs, idempotent merging, and
 * optional milestone linking. Mirrors the bounded-section persistence pattern
 * proven in `release-tracker.ts:580-596` so manual edits to TODO.md outside the
 * managed block are preserved verbatim.
 *
 * Re-runs are safe: tasks key off `adrId + slug(title) + tddPhase`, user-set
 * status survives, and tasks whose source ADR is deleted/superseded are moved
 * to a "Stale Tasks" subsection rather than silently dropped.
 */

import { existsSync, readFileSync, writeFileSync } from 'fs';
import { resolve } from 'path';
import { z } from 'zod';

import { McpAdrError } from '../types/index.js';
import { jsonSafeError } from '../utils/json-safe.js';
import { validateMcpResponse } from '../utils/mcp-response-validator.js';
import { discoverAdrsInDirectory } from '../utils/adr-discovery.js';
import {
  decomposeAdrToTasks,
  linkTasksToMilestones,
  mergeTodoTasks,
  renderTodoSection,
  spliceTodoSection,
} from '../utils/adr-todo-generator.js';
import { TodoTask } from '../resources/todo-list-resource.js';
import { listLocal } from '../utils/local-milestone-store.js';
import { buildMilestoneMap } from '../utils/release-tracker.js';

const GenerateAdrTodoSchema = z.object({
  adrDirectory: z.string().default('docs/adrs').describe('Directory containing ADR files'),
  scope: z
    .enum(['all', 'pending', 'accepted'])
    .default('pending')
    .describe('Which ADRs to decompose: all, pending (proposed/draft), or accepted only'),
  projectPath: z.string().optional().describe('Project root path (defaults to process.cwd())'),
  todoPath: z.string().default('TODO.md').describe('Output TODO file (relative to projectPath)'),
  phase: z
    .enum(['both', 'test', 'production'])
    .default('both')
    .describe(
      'TDD pairing: "both" emits paired test+production tasks (default), "production" or "test" narrows output'
    ),
  linkToMilestones: z
    .boolean()
    .default(true)
    .describe('Link generated tasks to release milestones (local + GitHub merged)'),
  dryRun: z.boolean().default(false).describe('Compute changes but do not write TODO.md'),
});

export type GenerateAdrTodoArgs = z.infer<typeof GenerateAdrTodoSchema>;

function inScope(status: string, scope: GenerateAdrTodoArgs['scope']): boolean {
  if (scope === 'all') return true;
  const s = (status || '').toLowerCase();
  if (scope === 'accepted') return s === 'accepted';
  // 'pending' covers anything that isn't accepted/superseded/deprecated/rejected
  return !['accepted', 'superseded', 'deprecated', 'rejected'].includes(s);
}

function isSuperseded(status: string): boolean {
  const s = (status || '').toLowerCase();
  return s === 'superseded' || s === 'deprecated' || s === 'rejected';
}

function parseExistingTasks(content: string): TodoTask[] {
  // Lightweight parser scoped to the bounded section. We can't import the
  // private `parseTodoMarkdown` from `todo-list-resource.ts`, so we replicate
  // its behavior over the entire content (cheap; TODO.md is tiny in practice).
  const tasks: TodoTask[] = [];
  const lines = content.split('\n');

  let current: Partial<TodoTask> | null = null;
  let counter = 0;

  const pinPatterns: Array<[RegExp, (m: RegExpMatchArray, t: Partial<TodoTask>) => void]> = [
    [
      /<!--\s*adr:\s*([^\s>]+)\s*-->/i,
      (m, t) => {
        if (m[1]) t.adrId = m[1];
      },
    ],
    [
      /<!--\s*linked-adrs:\s*([^>]+?)\s*-->/i,
      (m, t) => {
        if (m[1])
          t.linkedAdrs = m[1]
            .split(',')
            .map(s => s.trim())
            .filter(Boolean);
      },
    ],
    [
      /<!--\s*milestone:\s*([^\s>]+)\s*-->/i,
      (m, t) => {
        if (m[1]) t.milestoneId = m[1];
      },
    ],
    [
      /<!--\s*tdd:\s*(test|production)\s*-->/i,
      (m, t) => {
        if (m[1]) t.tddPhase = m[1].toLowerCase() as 'test' | 'production';
      },
    ],
    [
      /<!--\s*task-id:\s*([^\s>]+)\s*-->/i,
      (m, t) => {
        if (m[1]) t.id = m[1];
      },
    ],
  ];

  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.startsWith('## ')) {
      if (current) tasks.push(current as TodoTask);
      counter++;
      current = {
        id: `task-${counter}`,
        title: trimmed.substring(3).trim(),
        status: 'pending',
      };
      continue;
    }

    if (current) {
      let pinned = false;
      for (const [pat, apply] of pinPatterns) {
        const m = trimmed.match(pat);
        if (m) {
          apply(m, current);
          pinned = true;
          break;
        }
      }
      if (pinned) continue;

      if (trimmed.startsWith('**Status:**')) {
        const status = trimmed.substring(11).trim().toLowerCase();
        current.status = status.includes('progress')
          ? 'in_progress'
          : status.includes('completed')
            ? 'completed'
            : 'pending';
        continue;
      }
      if (trimmed.startsWith('**Priority:**')) {
        const p = trimmed.substring(13).trim().toLowerCase();
        current.priority = p.includes('critical')
          ? 'critical'
          : p.includes('high')
            ? 'high'
            : p.includes('low')
              ? 'low'
              : 'medium';
        continue;
      }
      if (trimmed.startsWith('**Effort:**')) {
        current.effort = trimmed.substring(11).trim();
        continue;
      }
      if (trimmed.startsWith('**Category:**')) {
        current.category = trimmed.substring(13).trim();
        continue;
      }

      if (
        !trimmed.startsWith('**') &&
        !trimmed.startsWith('#') &&
        !trimmed.startsWith('<!--') &&
        trimmed.length > 0
      ) {
        current.description =
          (current.description || '') + (current.description ? '\n' : '') + trimmed;
      }
    }
  }

  if (current) tasks.push(current as TodoTask);
  return tasks;
}

export async function generateAdrTodo(args: Record<string, unknown>): Promise<any> {
  try {
    const validated = GenerateAdrTodoSchema.parse(args);
    const projectPath = validated.projectPath ?? process.cwd();

    const discovery = await discoverAdrsInDirectory(validated.adrDirectory, projectPath, {
      includeContent: true,
      includeTimeline: false,
    });
    const allAdrs = discovery.adrs;

    const filteredAdrs = allAdrs.filter(a => inScope(a.status, validated.scope));
    const activeAdrIds = new Set(allAdrs.filter(a => !isSuperseded(a.status)).map(a => a.filename));
    const supersededAdrIds = new Set(
      allAdrs.filter(a => isSuperseded(a.status)).map(a => a.filename)
    );

    const generatedAt = new Date().toISOString();
    const generated: TodoTask[] = [];
    for (const adr of filteredAdrs) {
      generated.push(...decomposeAdrToTasks(adr, { phase: validated.phase, generatedAt }));
    }

    const milestones = validated.linkToMilestones
      ? await buildMilestoneMap(allAdrs, projectPath).catch(() => [])
      : [];
    if (validated.linkToMilestones) {
      try {
        const local = listLocal(projectPath);
        const seen = new Set(milestones.map(m => (m.id || m.name).toLowerCase()));
        for (const lm of local) {
          const key = (lm.id || lm.name).toLowerCase();
          if (!seen.has(key)) {
            milestones.push(lm);
            seen.add(key);
          }
        }
      } catch {
        // local store missing or unreadable — non-fatal
      }
    }

    let linkedTasks = generated;
    let linkedMilestones = milestones;
    if (validated.linkToMilestones && milestones.length > 0) {
      const linked = linkTasksToMilestones(generated, milestones, allAdrs);
      linkedTasks = linked.tasks;
      linkedMilestones = linked.milestones;
    }

    const todoFullPath = resolve(projectPath, validated.todoPath);
    const existingContent = existsSync(todoFullPath) ? readFileSync(todoFullPath, 'utf8') : '';
    const existingTasks = existingContent ? parseExistingTasks(existingContent) : [];

    const mergeResult = mergeTodoTasks(existingTasks, linkedTasks, {
      activeAdrIds,
      supersededAdrIds,
    });

    // Only ADR-derived tasks belong inside the managed section. Manual tasks
    // (no adrId) get rendered as part of the user's hand-edited content
    // outside the bounded block, so we don't include them in the section.
    const managedTasks = mergeResult.merged.filter(t => !!t.adrId);

    const section = renderTodoSection(managedTasks, mergeResult.stale, {
      milestones: linkedMilestones,
      generatedAt,
    });

    const newContent = spliceTodoSection(existingContent, section);
    let wrote = false;
    if (!validated.dryRun && newContent !== existingContent) {
      writeFileSync(todoFullPath, newContent, 'utf8');
      wrote = true;
    }

    const summaryLines = [
      `# Generate ADR TODO`,
      ``,
      `**ADR directory:** \`${validated.adrDirectory}\``,
      `**Scope:** ${validated.scope}`,
      `**Phase:** ${validated.phase}`,
      `**TODO file:** \`${validated.todoPath}\` ${wrote ? '(updated)' : validated.dryRun ? '(dry run — not written)' : '(unchanged)'}`,
      ``,
      `## Summary`,
      ``,
      `- ADRs discovered: ${allAdrs.length}`,
      `- ADRs in scope: ${filteredAdrs.length}`,
      `- Tasks generated: ${linkedTasks.length}`,
      `- Tasks added: ${mergeResult.added}`,
      `- Tasks preserved: ${mergeResult.preserved}`,
      `- Stale tasks (moved to "Stale Tasks"): ${mergeResult.stale.length}`,
      `- Milestones linked: ${linkedMilestones.length}`,
      ``,
    ];

    if (mergeResult.stale.length > 0) {
      summaryLines.push(`## Stale Tasks`, ``);
      for (const t of mergeResult.stale.slice(0, 20)) {
        summaryLines.push(
          `- \`${t.id}\` — ${t.title}${t.adrId ? ` _(orphaned: ${t.adrId})_` : ''}`
        );
      }
      if (mergeResult.stale.length > 20) {
        summaryLines.push(`- … and ${mergeResult.stale.length - 20} more`);
      }
      summaryLines.push(``);
    }

    if (validated.dryRun) {
      summaryLines.push(
        `## Dry-Run Diff Preview`,
        ``,
        '```diff',
        ...buildSimpleDiff(existingContent, newContent).slice(0, 200),
        '```',
        ``
      );
    }

    if (filteredAdrs.length === 0) {
      summaryLines.push(
        `## No ADRs in scope`,
        ``,
        `Add ADR markdown files under \`${validated.adrDirectory}\` (or widen \`scope\`) and re-run.`
      );
    }

    return validateMcpResponse({
      content: [{ type: 'text', text: summaryLines.join('\n') }],
    });
  } catch (error) {
    throw new McpAdrError(
      `generate_adr_todo failed: ${jsonSafeError(error)}`,
      'GENERATE_ADR_TODO_ERROR'
    );
  }
}

function buildSimpleDiff(before: string, after: string): string[] {
  const beforeLines = before.split('\n');
  const afterLines = after.split('\n');
  const out: string[] = [];
  const max = Math.max(beforeLines.length, afterLines.length);
  for (let i = 0; i < max; i++) {
    const a = beforeLines[i];
    const b = afterLines[i];
    if (a === b) continue;
    if (a !== undefined) out.push(`- ${a}`);
    if (b !== undefined) out.push(`+ ${b}`);
  }
  return out;
}
