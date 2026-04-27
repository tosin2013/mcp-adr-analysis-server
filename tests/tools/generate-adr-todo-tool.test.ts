/**
 * End-to-end tests for the generate_adr_todo MCP tool.
 *
 * Runs against a temp project directory with fixture ADRs.
 */

import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';

import { generateAdrTodo } from '../../src/tools/generate-adr-todo-tool.js';
import { ADR_TODO_END_MARKER, ADR_TODO_START_MARKER } from '../../src/utils/adr-todo-generator.js';

function setupProject(adrFiles: Record<string, string>): string {
  const root = mkdtempSync(join(tmpdir(), 'mcp-adr-gen-todo-'));
  const adrDir = join(root, 'docs', 'adrs');
  mkdirSync(adrDir, { recursive: true });
  for (const [name, body] of Object.entries(adrFiles)) {
    writeFileSync(join(adrDir, name), body, 'utf8');
  }
  return root;
}

describe('generate_adr_todo', () => {
  let projectPath: string;

  afterEach(() => {
    if (projectPath) rmSync(projectPath, { recursive: true, force: true });
  });

  it('generates TODO.md from ADRs with bounded section and ADR pins', async () => {
    projectPath = setupProject({
      '0001-event-sourcing.md': [
        '# 0001 Event Sourcing',
        '',
        '## Status',
        'accepted',
        '',
        '## Decision',
        '- Persist events to Postgres',
        '- Publish events to Kafka',
      ].join('\n'),
    });

    const result = await generateAdrTodo({
      projectPath,
      scope: 'all',
      phase: 'production',
      linkToMilestones: false,
    });

    const text = (result as any).content[0].text as string;
    expect(text).toContain('Tasks generated: 2');

    const todo = readFileSync(join(projectPath, 'TODO.md'), 'utf8');
    expect(todo).toContain(ADR_TODO_START_MARKER);
    expect(todo).toContain(ADR_TODO_END_MARKER);
    expect(todo).toContain('<!-- adr: 0001-event-sourcing.md -->');
    expect(todo).toContain('Persist events to Postgres');
    expect(todo).toContain('Publish events to Kafka');
  });

  it('preserves user toggles to status across re-runs', async () => {
    projectPath = setupProject({
      '0001-event-sourcing.md': [
        '# 0001 Event Sourcing',
        '## Status',
        'accepted',
        '## Decision',
        '- Persist events to Postgres',
      ].join('\n'),
    });

    await generateAdrTodo({
      projectPath,
      scope: 'all',
      phase: 'production',
      linkToMilestones: false,
    });

    const todoPath = join(projectPath, 'TODO.md');
    const beforeContent = readFileSync(todoPath, 'utf8');
    const toggled = beforeContent.replace('**Status:** pending', '**Status:** completed');
    writeFileSync(todoPath, toggled, 'utf8');

    await generateAdrTodo({
      projectPath,
      scope: 'all',
      phase: 'production',
      linkToMilestones: false,
    });

    const after = readFileSync(todoPath, 'utf8');
    expect(after).toContain('**Status:** completed');
  });

  it('preserves manual content outside the bounded section across re-runs', async () => {
    projectPath = setupProject({
      '0001-event-sourcing.md': [
        '# 0001 Event Sourcing',
        '## Status',
        'accepted',
        '## Decision',
        '- Persist events to Postgres',
      ].join('\n'),
    });

    const todoPath = join(projectPath, 'TODO.md');
    writeFileSync(
      todoPath,
      ['# TODO', '', '## Manual user task', '**Status:** in_progress', 'My own thing.', ''].join(
        '\n'
      ),
      'utf8'
    );

    await generateAdrTodo({
      projectPath,
      scope: 'all',
      phase: 'production',
      linkToMilestones: false,
    });

    const content = readFileSync(todoPath, 'utf8');
    expect(content).toContain('## Manual user task');
    expect(content).toContain('My own thing.');
    expect(content).toContain('Persist events to Postgres');
  });

  it('moves tasks for deleted ADRs into a Stale Tasks section', async () => {
    projectPath = setupProject({
      '0001-event-sourcing.md': [
        '# 0001 Event Sourcing',
        '## Status',
        'accepted',
        '## Decision',
        '- Persist events to Postgres',
      ].join('\n'),
    });

    await generateAdrTodo({
      projectPath,
      scope: 'all',
      phase: 'production',
      linkToMilestones: false,
    });

    // Delete the ADR file so it disappears from discovery
    rmSync(join(projectPath, 'docs', 'adrs', '0001-event-sourcing.md'));

    const result = await generateAdrTodo({
      projectPath,
      scope: 'all',
      phase: 'production',
      linkToMilestones: false,
    });
    const text = (result as any).content[0].text as string;
    expect(text).toContain('Stale tasks');

    const todo = readFileSync(join(projectPath, 'TODO.md'), 'utf8');
    expect(todo).toContain('## Stale Tasks');
    expect(todo).toContain('Persist events to Postgres');
  });

  it('emits paired test+production tasks by default', async () => {
    projectPath = setupProject({
      '0001-event-sourcing.md': [
        '# 0001 Event Sourcing',
        '## Status',
        'accepted',
        '## Decision',
        '- Persist events to Postgres',
      ].join('\n'),
    });

    const result = await generateAdrTodo({
      projectPath,
      scope: 'all',
      linkToMilestones: false,
    });

    const text = (result as any).content[0].text as string;
    expect(text).toContain('Tasks generated: 2');
    const todo = readFileSync(join(projectPath, 'TODO.md'), 'utf8');
    expect(todo).toContain('Write tests for: Persist events to Postgres');
  });

  it('respects dryRun and does not write TODO.md', async () => {
    projectPath = setupProject({
      '0001-event-sourcing.md': [
        '# 0001 Event Sourcing',
        '## Status',
        'accepted',
        '## Decision',
        '- Persist events to Postgres',
      ].join('\n'),
    });

    const result = await generateAdrTodo({
      projectPath,
      scope: 'all',
      phase: 'production',
      linkToMilestones: false,
      dryRun: true,
    });

    const text = (result as any).content[0].text as string;
    expect(text).toContain('dry run');

    let todoExists = false;
    try {
      readFileSync(join(projectPath, 'TODO.md'), 'utf8');
      todoExists = true;
    } catch {
      todoExists = false;
    }
    expect(todoExists).toBe(false);
  });
});
