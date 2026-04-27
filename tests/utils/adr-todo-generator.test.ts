/**
 * Tests for ADR → TODO decomposition utilities.
 */

import {
  decomposeAdrToTasks,
  linkTasksToMilestones,
  makeTaskId,
  mergeTodoTasks,
  renderTodoSection,
  spliceTodoSection,
  ADR_TODO_END_MARKER,
  ADR_TODO_START_MARKER,
} from '../../src/utils/adr-todo-generator.js';
import { DiscoveredAdr } from '../../src/utils/adr-discovery.js';
import { TodoTask } from '../../src/resources/todo-list-resource.js';
import { MilestoneStatus } from '../../src/utils/release-readiness-detector.js';

const baseAdr: DiscoveredAdr = {
  filename: '0007-event-sourcing.md',
  title: 'Event Sourcing for the Order Service',
  status: 'accepted',
  date: '2026-04-01',
  path: '/repo/docs/adrs/0007-event-sourcing.md',
};

describe('decomposeAdrToTasks', () => {
  it('emits paired test+production tasks per decision bullet by default', () => {
    const adr: DiscoveredAdr = {
      ...baseAdr,
      decision: '- Persist events to Postgres\n- Publish events to Kafka',
    };

    const tasks = decomposeAdrToTasks(adr);

    expect(tasks).toHaveLength(4);
    expect(tasks.filter(t => t.tddPhase === 'test')).toHaveLength(2);
    expect(tasks.filter(t => t.tddPhase === 'production')).toHaveLength(2);
    for (const task of tasks) {
      expect(task.adrId).toBe(adr.filename);
      expect(task.linkedAdrs).toEqual([adr.filename]);
      expect(task.id).toMatch(/^0007-event-sourcing-md\/.+\/(test|production)$/);
    }
  });

  it('respects phase: production', () => {
    const adr: DiscoveredAdr = {
      ...baseAdr,
      decision: '- Persist events to Postgres',
    };
    const tasks = decomposeAdrToTasks(adr, { phase: 'production' });
    expect(tasks).toHaveLength(1);
    expect(tasks[0]!.tddPhase).toBe('production');
    expect(tasks[0]!.title).toBe('Persist events to Postgres');
  });

  it('falls back to a single implementation step when no decision bullets are present', () => {
    const adr: DiscoveredAdr = {
      ...baseAdr,
      context: 'We need event sourcing.',
      decision: 'Use event sourcing.',
    };
    const tasks = decomposeAdrToTasks(adr, { phase: 'production' });
    expect(tasks).toHaveLength(1);
    expect(tasks[0]!.title).toMatch(/Implement decision/);
  });

  it('reads bullets out of an ## Implementation section in raw content', () => {
    const adr: DiscoveredAdr = {
      ...baseAdr,
      decision: 'Use event sourcing.',
      content: ['## Implementation', '- Migrate orders schema', '- Backfill snapshots'].join('\n'),
    };
    const tasks = decomposeAdrToTasks(adr, { phase: 'production' });
    expect(tasks.map(t => t.title)).toEqual(['Migrate orders schema', 'Backfill snapshots']);
  });

  it('produces stable task IDs across re-runs', () => {
    const adr: DiscoveredAdr = {
      ...baseAdr,
      decision: '- Persist events to Postgres',
    };
    const a = decomposeAdrToTasks(adr, { phase: 'production' });
    const b = decomposeAdrToTasks(adr, { phase: 'production' });
    expect(a[0]!.id).toBe(b[0]!.id);
    expect(a[0]!.id).toBe(makeTaskId(adr.filename, 'Persist events to Postgres', 'production'));
  });
});

describe('mergeTodoTasks', () => {
  const adr: DiscoveredAdr = {
    ...baseAdr,
    decision: '- Persist events to Postgres',
  };

  it('preserves user-set status across re-runs', () => {
    const generatedFirst = decomposeAdrToTasks(adr, { phase: 'production' });
    const userToggled: TodoTask[] = generatedFirst.map(t => ({ ...t, status: 'completed' }));

    const generatedSecond = decomposeAdrToTasks(adr, { phase: 'production' });
    const result = mergeTodoTasks(userToggled, generatedSecond);

    expect(result.merged).toHaveLength(1);
    expect(result.merged[0]!.status).toBe('completed');
    expect(result.preserved).toBe(1);
    expect(result.added).toBe(0);
    expect(result.stale).toHaveLength(0);
  });

  it('adds tasks for newly introduced ADRs', () => {
    const existing: TodoTask[] = decomposeAdrToTasks(adr, { phase: 'production' });
    const newAdr: DiscoveredAdr = {
      ...baseAdr,
      filename: '0008-circuit-breakers.md',
      title: 'Circuit Breakers',
      decision: '- Wrap downstream HTTP calls',
    };
    const generated = [
      ...decomposeAdrToTasks(adr, { phase: 'production' }),
      ...decomposeAdrToTasks(newAdr, { phase: 'production' }),
    ];

    const result = mergeTodoTasks(existing, generated);
    expect(result.added).toBe(1);
    expect(result.merged).toHaveLength(2);
  });

  it('moves tasks for missing ADRs into the stale bucket', () => {
    const existing: TodoTask[] = decomposeAdrToTasks(adr, { phase: 'production' });
    const result = mergeTodoTasks(existing, [], {
      activeAdrIds: new Set([]),
      supersededAdrIds: new Set([]),
    });
    expect(result.merged).toHaveLength(0);
    expect(result.stale).toHaveLength(1);
    expect(result.stale[0]!.adrId).toBe(adr.filename);
  });

  it('moves tasks for superseded ADRs into the stale bucket', () => {
    const existing: TodoTask[] = decomposeAdrToTasks(adr, { phase: 'production' });
    const result = mergeTodoTasks(existing, [], {
      activeAdrIds: new Set([adr.filename]),
      supersededAdrIds: new Set([adr.filename]),
    });
    expect(result.stale).toHaveLength(1);
  });

  it('leaves manual user tasks (no adrId) untouched', () => {
    const manual: TodoTask = { id: 'task-9001', title: 'Update README', status: 'in_progress' };
    const result = mergeTodoTasks([manual], []);
    expect(result.merged).toHaveLength(1);
    expect(result.merged[0]!.id).toBe('task-9001');
    expect(result.stale).toHaveLength(0);
  });
});

describe('renderTodoSection / spliceTodoSection', () => {
  const adr: DiscoveredAdr = {
    ...baseAdr,
    decision: '- Persist events to Postgres',
  };

  it('renders a bounded section with task pin comments', () => {
    const tasks = decomposeAdrToTasks(adr, { phase: 'production' });
    const section = renderTodoSection(tasks, []);
    expect(section.startsWith(ADR_TODO_START_MARKER)).toBe(true);
    expect(section.endsWith(ADR_TODO_END_MARKER)).toBe(true);
    expect(section).toContain('<!-- adr: 0007-event-sourcing.md -->');
    expect(section).toContain('<!-- tdd: production -->');
    expect(section).toContain(
      '<!-- task-id: 0007-event-sourcing-md/persist-events-to-postgres/production -->'
    );
  });

  it('renders a Stale Tasks subsection when stale tasks are present', () => {
    const tasks = decomposeAdrToTasks(adr, { phase: 'production' });
    const stale: TodoTask[] = [
      { id: 'old-1', title: 'Removed thing', status: 'pending', adrId: 'gone.md' },
    ];
    const section = renderTodoSection(tasks, stale);
    expect(section).toContain('## Stale Tasks');
    expect(section).toContain('Removed thing');
  });

  it('preserves manual content outside the bounded section', () => {
    const initialTodo = [
      '# TODO',
      '',
      '## Manual user task',
      'Should not be touched.',
      '',
      ADR_TODO_START_MARKER,
      'old contents',
      ADR_TODO_END_MARKER,
      '',
      '## Another manual task',
      'Should also be preserved.',
    ].join('\n');

    const tasks = decomposeAdrToTasks(adr, { phase: 'production' });
    const section = renderTodoSection(tasks, []);
    const result = spliceTodoSection(initialTodo, section);

    expect(result).toContain('## Manual user task');
    expect(result).toContain('Should not be touched.');
    expect(result).toContain('## Another manual task');
    expect(result).toContain('Should also be preserved.');
    expect(result).not.toContain('old contents');
  });

  it('appends the section if no markers exist yet', () => {
    const result = spliceTodoSection('# My TODO\n\n## Manual task\n', renderTodoSection([], []));
    expect(result).toContain('# My TODO');
    expect(result).toContain(ADR_TODO_START_MARKER);
    expect(result).toContain(ADR_TODO_END_MARKER);
  });
});

describe('linkTasksToMilestones', () => {
  it('links tasks to milestones whose name matches the ADR title', () => {
    const adr: DiscoveredAdr = {
      ...baseAdr,
      title: 'Event Sourcing v1',
      decision: '- Persist events',
    };
    const tasks = decomposeAdrToTasks(adr, { phase: 'production' });
    const milestones: MilestoneStatus[] = [
      {
        name: 'Event Sourcing',
        completed: 0,
        total: 0,
        completionRate: 0,
        criticalTodos: 0,
        blockers: [],
      },
    ];

    const linked = linkTasksToMilestones(tasks, milestones, [adr]);
    expect(linked.tasks[0]!.milestoneId).toBe('event-sourcing');
    expect(linked.milestones[0]!.linkedAdrIds).toContain(adr.filename);
    expect(linked.milestones[0]!.linkedTodoIds).toContain(tasks[0]!.id);
  });

  it('returns inputs unchanged when there are no milestones', () => {
    const adr: DiscoveredAdr = { ...baseAdr, decision: '- Persist events' };
    const tasks = decomposeAdrToTasks(adr, { phase: 'production' });
    const linked = linkTasksToMilestones(tasks, [], [adr]);
    expect(linked.tasks).toBe(tasks);
    expect(linked.milestones).toEqual([]);
  });
});
