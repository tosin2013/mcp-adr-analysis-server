/**
 * Local Milestone Store
 *
 * File-backed milestone persistence used when GitHub `gh` auth is unavailable
 * or when the caller explicitly opts into a local-only workflow. Mirrors the
 * markdown-bounded-section pattern proven in `release-tracker.ts:580-596`.
 *
 * - JSON index: `<projectPath>/.mcp-adr-cache/milestones.local.json`
 * - Optional human-readable surface: `<projectPath>/RELEASE_PLAN.md`,
 *   bounded by `<!-- LOCAL MILESTONES -->...<!-- /LOCAL MILESTONES -->`.
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs';
import { dirname, join } from 'path';
import { MilestoneStatus } from './release-readiness-detector.js';

export const LOCAL_MILESTONE_DIR = '.mcp-adr-cache';
export const LOCAL_MILESTONE_FILE = 'milestones.local.json';
export const RELEASE_PLAN_START_MARKER = '<!-- LOCAL MILESTONES -->';
export const RELEASE_PLAN_END_MARKER = '<!-- /LOCAL MILESTONES -->';

export interface LocalMilestoneStore {
  version: '1.0';
  updatedAt: string;
  milestones: MilestoneStatus[];
}

export function slugify(input: string): string {
  return input
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
}

function getStorePath(projectPath: string): string {
  return join(projectPath, LOCAL_MILESTONE_DIR, LOCAL_MILESTONE_FILE);
}

export function loadLocal(projectPath: string): LocalMilestoneStore {
  const storePath = getStorePath(projectPath);
  if (!existsSync(storePath)) {
    return { version: '1.0', updatedAt: new Date().toISOString(), milestones: [] };
  }
  try {
    const raw = readFileSync(storePath, 'utf8');
    const parsed = JSON.parse(raw);
    if (!parsed || !Array.isArray(parsed.milestones)) {
      return { version: '1.0', updatedAt: new Date().toISOString(), milestones: [] };
    }
    return parsed as LocalMilestoneStore;
  } catch {
    return { version: '1.0', updatedAt: new Date().toISOString(), milestones: [] };
  }
}

function persist(projectPath: string, store: LocalMilestoneStore): void {
  const storePath = getStorePath(projectPath);
  const dir = dirname(storePath);
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }
  store.updatedAt = new Date().toISOString();
  writeFileSync(storePath, JSON.stringify(store, null, 2), 'utf8');
}

export function listLocal(projectPath: string): MilestoneStatus[] {
  return loadLocal(projectPath).milestones;
}

export function upsertLocal(projectPath: string, milestone: MilestoneStatus): MilestoneStatus {
  const store = loadLocal(projectPath);
  const id = milestone.id || slugify(milestone.name);
  const normalized: MilestoneStatus = {
    ...milestone,
    id,
    source: milestone.source ?? 'local',
    pushed: milestone.pushed ?? false,
    blockers: milestone.blockers ?? [],
    linkedAdrIds: milestone.linkedAdrIds ?? [],
    linkedTodoIds: milestone.linkedTodoIds ?? [],
  };

  const idx = store.milestones.findIndex(m => (m.id || slugify(m.name)) === id);
  if (idx >= 0) {
    const existing = store.milestones[idx]!;
    const ghNumber = normalized.githubNumber ?? existing.githubNumber;
    const merged: MilestoneStatus = {
      ...existing,
      ...normalized,
      // Preserve push state across upserts unless caller explicitly overrides it
      pushed: normalized.pushed || existing.pushed || false,
      // Merge link arrays so cross-references accumulate
      linkedAdrIds: Array.from(
        new Set([...(existing.linkedAdrIds ?? []), ...(normalized.linkedAdrIds ?? [])])
      ),
      linkedTodoIds: Array.from(
        new Set([...(existing.linkedTodoIds ?? []), ...(normalized.linkedTodoIds ?? [])])
      ),
      ...(ghNumber !== undefined ? { githubNumber: ghNumber } : {}),
    };
    store.milestones[idx] = merged;
  } else {
    store.milestones.push(normalized);
  }

  persist(projectPath, store);
  return store.milestones.find(m => (m.id || slugify(m.name)) === id)!;
}

export function markPushed(
  projectPath: string,
  id: string,
  githubNumber: number
): MilestoneStatus | undefined {
  const store = loadLocal(projectPath);
  const idx = store.milestones.findIndex(m => (m.id || slugify(m.name)) === id);
  if (idx < 0) return undefined;
  store.milestones[idx] = {
    ...store.milestones[idx]!,
    pushed: true,
    githubNumber,
  };
  persist(projectPath, store);
  return store.milestones[idx];
}

export function removeLocal(projectPath: string, id: string): boolean {
  const store = loadLocal(projectPath);
  const before = store.milestones.length;
  store.milestones = store.milestones.filter(m => (m.id || slugify(m.name)) !== id);
  if (store.milestones.length === before) return false;
  persist(projectPath, store);
  return true;
}

/**
 * Render a list of local milestones as a markdown section bounded by
 * the LOCAL MILESTONES HTML-comment markers. Caller is responsible for
 * splicing the result into RELEASE_PLAN.md (or another file).
 */
export function renderLocalMilestonesMarkdown(milestones: MilestoneStatus[]): string {
  const lines: string[] = [
    RELEASE_PLAN_START_MARKER,
    '',
    '## Local Milestones',
    '',
    '_Synced from `.mcp-adr-cache/milestones.local.json`. Run `release_tracking` with `operation: "push_local_milestones"` to publish to GitHub._',
    '',
  ];

  if (milestones.length === 0) {
    lines.push('_No local milestones yet._', '');
  } else {
    for (const m of milestones) {
      const id = m.id || slugify(m.name);
      const status = m.pushed ? `pushed (#${m.githubNumber ?? '?'})` : 'local-only';
      lines.push(`### ${m.name}`);
      lines.push(`<!-- milestone-id: ${id} -->`);
      lines.push(`- **Status:** ${status}`);
      if (m.dueDate) lines.push(`- **Due:** ${m.dueDate}`);
      if (typeof m.completed === 'number' && typeof m.total === 'number' && m.total > 0) {
        const pct = (m.completionRate * 100).toFixed(1);
        lines.push(`- **Progress:** ${m.completed}/${m.total} (${pct}%)`);
      }
      if (m.linkedAdrIds && m.linkedAdrIds.length > 0) {
        lines.push(`- **Linked ADRs:** ${m.linkedAdrIds.join(', ')}`);
      }
      if (m.description) {
        lines.push('', m.description);
      }
      lines.push('');
    }
  }

  lines.push(RELEASE_PLAN_END_MARKER);
  return lines.join('\n');
}

/**
 * Splice a milestone section into RELEASE_PLAN.md (or any markdown file),
 * preserving any content outside the bounded markers. Creates the file if
 * it does not yet exist.
 */
export function writeReleasePlanFile(
  projectPath: string,
  milestones: MilestoneStatus[],
  filename: string = 'RELEASE_PLAN.md'
): string {
  const fullPath = join(projectPath, filename);
  const section = renderLocalMilestonesMarkdown(milestones);

  if (!existsSync(fullPath)) {
    const content = `# Release Plan\n\n${section}\n`;
    writeFileSync(fullPath, content, 'utf8');
    return fullPath;
  }

  let content = readFileSync(fullPath, 'utf8');
  const startIdx = content.indexOf(RELEASE_PLAN_START_MARKER);
  const endIdx = content.indexOf(RELEASE_PLAN_END_MARKER);

  if (startIdx >= 0 && endIdx > startIdx) {
    content =
      content.substring(0, startIdx) +
      section +
      content.substring(endIdx + RELEASE_PLAN_END_MARKER.length);
  } else {
    if (!content.endsWith('\n')) content += '\n';
    content += '\n' + section + '\n';
  }

  writeFileSync(fullPath, content, 'utf8');
  return fullPath;
}
