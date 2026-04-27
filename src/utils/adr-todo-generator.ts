/**
 * ADR → TODO Decomposition
 *
 * Pure utilities for turning ADRs into TODO entries with stable IDs,
 * idempotent merging, and a markdown render that mirrors the bounded-section
 * pattern in `release-tracker.ts:580-596`.
 *
 * Tasks generated here always carry `adrId` so callers (e.g. `compare_adr_progress`)
 * can correlate work against ADRs without name-matching guesswork.
 */

import { DiscoveredAdr } from './adr-discovery.js';
import { TodoTask } from '../resources/todo-list-resource.js';
import { MilestoneStatus } from './release-readiness-detector.js';
import { slugify } from './local-milestone-store.js';

export const ADR_TODO_START_MARKER = '<!-- ADR-GENERATED-TASKS -->';
export const ADR_TODO_END_MARKER = '<!-- /ADR-GENERATED-TASKS -->';
export const STALE_HEADING = '## Stale Tasks';

export type DecomposePhase = 'both' | 'test' | 'production';

export interface DecomposeOptions {
  phase?: DecomposePhase;
  defaultPriority?: TodoTask['priority'];
  generatedAt?: string;
}

export interface MergeResult {
  merged: TodoTask[];
  stale: TodoTask[];
  added: number;
  preserved: number;
}

interface ImplementationStep {
  title: string;
  description?: string;
  priority?: TodoTask['priority'];
  effort?: string;
  category?: string;
}

const DEFAULT_PRIORITY: TodoTask['priority'] = 'medium';

function priorityFromAdr(adr: DiscoveredAdr): TodoTask['priority'] {
  const status = (adr.status || '').toLowerCase();
  if (status === 'accepted') return 'high';
  if (status === 'proposed' || status === 'draft') return 'medium';
  return DEFAULT_PRIORITY;
}

/**
 * Pull implementation steps out of an ADR. Strategy:
 *  1. Look for explicit list items under a `## Decision` or `## Implementation` heading.
 *  2. Fall back to top-level bullets in the `decision` field.
 *  3. As a last resort, emit a single "Implement: <title>" step.
 *
 * No AI — this is intentionally deterministic so re-runs produce stable output.
 */
function extractImplementationSteps(adr: DiscoveredAdr): ImplementationStep[] {
  const steps: ImplementationStep[] = [];
  const seen = new Set<string>();

  const pushStep = (step: ImplementationStep) => {
    const key = step.title.toLowerCase().trim();
    if (!key || seen.has(key)) return;
    seen.add(key);
    steps.push(step);
  };

  const collectBullets = (text: string | undefined): string[] => {
    if (!text) return [];
    const bullets: string[] = [];
    for (const rawLine of text.split('\n')) {
      const line = rawLine.trim();
      if (!line) continue;
      const m = line.match(/^[-*+]\s+(.+)$/) || line.match(/^\d+\.\s+(.+)$/);
      if (m && m[1]) bullets.push(m[1].trim());
    }
    return bullets;
  };

  for (const bullet of collectBullets(adr.decision)) {
    pushStep({ title: bullet });
  }

  if (steps.length === 0 && adr.content) {
    // Look for ## Implementation, ## Action Items, ## Tasks. The `[^]` class
    // matches any char including newlines (vs. `.` which excludes newlines)
    // and the lookahead matches either the next `##` heading or end-of-string.
    const implSection = adr.content.match(
      /^##\s*(?:Implementation|Action Items|Tasks|Implementation Plan)\s*\n([^]*?)(?=\n##\s|$(?![\r\n]))/im
    );
    if (implSection && implSection[1]) {
      for (const bullet of collectBullets(implSection[1])) {
        pushStep({ title: bullet });
      }
    }
  }

  if (steps.length === 0) {
    // Fall back to a single step that captures the decision intent
    pushStep({
      title: `Implement decision: ${adr.title}`,
      description: adr.decision || adr.context || '',
    });
  }

  return steps;
}

export function makeTaskId(adrId: string, title: string, phase: 'test' | 'production'): string {
  return `${slugify(adrId)}/${slugify(title) || 'task'}/${phase}`;
}

/**
 * Decompose a single ADR into TODO tasks. Returns paired test+production tasks
 * by default (matches the architecture doc's two-phase TDD design). Callers can
 * narrow with `phase: 'production'` or `phase: 'test'`.
 */
export function decomposeAdrToTasks(
  adr: DiscoveredAdr,
  options: DecomposeOptions = {}
): TodoTask[] {
  const phase = options.phase ?? 'both';
  const defaultPriority = options.defaultPriority ?? priorityFromAdr(adr);
  const generatedAt = options.generatedAt ?? new Date().toISOString();

  const steps = extractImplementationSteps(adr);
  const tasks: TodoTask[] = [];

  const phasesToEmit: Array<'test' | 'production'> =
    phase === 'both' ? ['test', 'production'] : [phase];

  for (const step of steps) {
    for (const tddPhase of phasesToEmit) {
      const stepTitle = step.title.trim();
      const title = tddPhase === 'test' ? `Write tests for: ${stepTitle}` : stepTitle;
      const id = makeTaskId(adr.filename, stepTitle, tddPhase);
      const priority = step.priority ?? defaultPriority;
      const description = step.description ?? adr.decision ?? adr.context;
      const effort = step.effort;
      const category = step.category ?? adr.metadata?.category;
      const task: TodoTask = {
        id,
        title,
        status: 'pending',
        adrId: adr.filename,
        linkedAdrs: [adr.filename],
        tddPhase,
        createdAt: generatedAt,
        updatedAt: generatedAt,
        ...(priority !== undefined ? { priority } : {}),
        ...(description !== undefined ? { description } : {}),
        ...(effort !== undefined ? { effort } : {}),
        ...(category !== undefined ? { category } : {}),
      };
      tasks.push(task);
    }
  }

  return tasks;
}

export interface MergeOptions {
  /**
   * Set of ADR filenames currently active (i.e. discovered and not superseded).
   * Tasks whose `adrId` is missing from this set are treated as stale.
   * Pass `undefined` to disable stale detection.
   */
  activeAdrIds?: Set<string>;
  /** Set of ADR filenames considered superseded — their tasks are also stale. */
  supersededAdrIds?: Set<string>;
}

/**
 * Merge generated tasks with the existing TODO state. Stable ids drive matching.
 * User edits to status / description / priority survive re-runs; freshly generated
 * fields (effort, tddPhase) are refreshed.
 */
export function mergeTodoTasks(
  existing: TodoTask[],
  generated: TodoTask[],
  options: MergeOptions = {}
): MergeResult {
  const generatedById = new Map<string, TodoTask>();
  for (const t of generated) generatedById.set(t.id, t);

  const merged: TodoTask[] = [];
  const stale: TodoTask[] = [];
  let preserved = 0;
  let added = 0;

  const seen = new Set<string>();

  for (const prior of existing) {
    const gen = generatedById.get(prior.id);
    if (gen) {
      seen.add(prior.id);
      preserved += 1;
      const description = prior.description ?? gen.description;
      const priority = prior.priority ?? gen.priority;
      const createdAt = prior.createdAt ?? gen.createdAt;
      const updatedAt = gen.updatedAt ?? new Date().toISOString();
      const milestoneId = prior.milestoneId ?? gen.milestoneId;
      const blended: TodoTask = {
        ...gen,
        status: prior.status, // user toggles win
        ...(description !== undefined ? { description } : {}),
        ...(priority !== undefined ? { priority } : {}),
        ...(createdAt !== undefined ? { createdAt } : {}),
        ...(updatedAt !== undefined ? { updatedAt } : {}),
        ...(milestoneId !== undefined ? { milestoneId } : {}),
      };
      merged.push(blended);
      continue;
    }

    // Not in newly generated set. Decide stale vs. carryover.
    const adrId = prior.adrId;
    const isAdrTask = !!adrId;
    if (!isAdrTask) {
      // Manual user task — never touched.
      merged.push(prior);
      continue;
    }

    const active = options.activeAdrIds;
    const superseded = options.supersededAdrIds;
    const isStale = (active && !active.has(adrId!)) || (superseded && superseded.has(adrId!));

    if (isStale) {
      stale.push(prior);
    } else {
      // ADR still exists but step removed — keep it; user may still want it.
      merged.push(prior);
    }
  }

  for (const gen of generated) {
    if (seen.has(gen.id)) continue;
    merged.push(gen);
    added += 1;
  }

  return { merged, stale, added, preserved };
}

interface RenderOptions {
  milestones?: MilestoneStatus[];
  generatedAt?: string;
}

function renderTask(task: TodoTask): string {
  const lines: string[] = [];
  lines.push(`## ${task.title}`);
  lines.push(`<!-- task-id: ${task.id} -->`);
  if (task.adrId) lines.push(`<!-- adr: ${task.adrId} -->`);
  if (task.linkedAdrs && task.linkedAdrs.length > 1) {
    lines.push(`<!-- linked-adrs: ${task.linkedAdrs.join(', ')} -->`);
  }
  if (task.tddPhase) lines.push(`<!-- tdd: ${task.tddPhase} -->`);
  if (task.milestoneId) lines.push(`<!-- milestone: ${task.milestoneId} -->`);
  lines.push(`**Status:** ${task.status}`);
  if (task.priority) lines.push(`**Priority:** ${task.priority}`);
  if (task.effort) lines.push(`**Effort:** ${task.effort}`);
  if (task.category) lines.push(`**Category:** ${task.category}`);
  if (task.description) {
    const desc = task.description.trim();
    if (desc) {
      lines.push('');
      lines.push(desc);
    }
  }
  lines.push('');
  return lines.join('\n');
}

/**
 * Render the bounded "ADR-generated tasks" section. Caller is responsible for
 * splicing the result into TODO.md with the same start/end markers.
 */
export function renderTodoSection(
  tasks: TodoTask[],
  stale: TodoTask[],
  options: RenderOptions = {}
): string {
  const generatedAt = options.generatedAt ?? new Date().toISOString();
  const lines: string[] = [
    ADR_TODO_START_MARKER,
    '',
    '<!-- This section is managed by `generate_adr_todo`. Tasks outside this',
    '     bounded block are preserved verbatim across re-runs. Toggling Status -->',
    `<!-- generated-at: ${generatedAt} -->`,
    '',
    '## ADR-Generated Tasks',
    '',
  ];

  if (tasks.length === 0) {
    lines.push(
      '_No tasks generated. Add ADRs under your configured `adrDirectory` and re-run._',
      ''
    );
  } else {
    for (const task of tasks.filter(t => t.adrId)) {
      lines.push(renderTask(task));
    }
  }

  if (stale.length > 0) {
    lines.push(STALE_HEADING, '');
    lines.push(
      '_Tasks whose source ADR has been deleted or marked `superseded`. Review and remove or re-link manually._',
      ''
    );
    for (const task of stale) {
      lines.push(renderTask(task));
    }
  }

  if (options.milestones && options.milestones.length > 0) {
    lines.push('## Milestone Index', '');
    for (const m of options.milestones) {
      const id = m.id || slugify(m.name);
      const linkedAdrs =
        m.linkedAdrIds && m.linkedAdrIds.length > 0 ? ` (ADRs: ${m.linkedAdrIds.join(', ')})` : '';
      lines.push(`- **${m.name}** [${id}]${linkedAdrs}`);
    }
    lines.push('');
  }

  lines.push(ADR_TODO_END_MARKER);
  return lines.join('\n');
}

/**
 * Splice the rendered ADR-task section into existing TODO.md content.
 * Manual content outside the bounded block is preserved verbatim, mirroring
 * `updateTodoMilestones()` in `release-tracker.ts:580-596`.
 */
export function spliceTodoSection(existingContent: string, section: string): string {
  if (!existingContent) {
    return `# TODO\n\n${section}\n`;
  }
  const startIdx = existingContent.indexOf(ADR_TODO_START_MARKER);
  const endIdx = existingContent.indexOf(ADR_TODO_END_MARKER);

  if (startIdx >= 0 && endIdx > startIdx) {
    return (
      existingContent.substring(0, startIdx) +
      section +
      existingContent.substring(endIdx + ADR_TODO_END_MARKER.length)
    );
  }
  const sep = existingContent.endsWith('\n') ? '\n' : '\n\n';
  return existingContent + sep + section + '\n';
}

/**
 * Build a milestoneId → {linkedAdrIds, linkedTodoIds} map by name-matching
 * milestones against ADR titles/contexts (mirrors `buildMilestoneMap()` in
 * `release-tracker.ts:460-488`) and against generated tasks via their `adrId`.
 */
export function linkTasksToMilestones(
  tasks: TodoTask[],
  milestones: MilestoneStatus[],
  adrs: DiscoveredAdr[]
): { tasks: TodoTask[]; milestones: MilestoneStatus[] } {
  if (milestones.length === 0) return { tasks, milestones };

  const adrById = new Map(adrs.map(a => [a.filename, a]));
  const updatedMilestones = milestones.map(m => ({
    ...m,
    id: m.id || slugify(m.name),
    linkedAdrIds: [...(m.linkedAdrIds ?? [])],
    linkedTodoIds: [...(m.linkedTodoIds ?? [])],
  }));

  for (const milestone of updatedMilestones) {
    const milestoneName = milestone.name.toLowerCase();
    for (const adr of adrs) {
      const titleMatches = adr.title.toLowerCase().includes(milestoneName);
      const contextMatches = (adr.context || '').toLowerCase().includes(milestoneName);
      if (titleMatches || contextMatches) {
        if (!milestone.linkedAdrIds.includes(adr.filename)) {
          milestone.linkedAdrIds.push(adr.filename);
        }
      }
    }
  }

  const updatedTasks = tasks.map(task => {
    if (!task.adrId) return task;
    const owner = updatedMilestones.find(m => m.linkedAdrIds.includes(task.adrId!));
    if (!owner) return task;
    if (!owner.linkedTodoIds.includes(task.id)) {
      owner.linkedTodoIds.push(task.id);
    }
    return { ...task, milestoneId: owner.id };
  });

  // adrById is intentionally retained for future enrichment (e.g. surfacing
  // ADR titles in milestone descriptions); unused here to keep types narrow.
  void adrById;

  return { tasks: updatedTasks, milestones: updatedMilestones };
}
