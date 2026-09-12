import { describe, it, expect } from 'vitest';
import { generateActionItems, formatActionReport } from '../../src/utils/adr-action-analyzer.js';
import type { ThresholdProfile } from '../../src/utils/adr-timeline-types.js';
import type { DiscoveredAdr } from '../../src/utils/adr-discovery.js';

const baseThresholds: ThresholdProfile = {
  name: 'test',
  description: 'Test profile',
  staleProposedDays: 30,
  acceptedUnimplementedDays: 60,
  outdatedAdrDays: 180,
  dormantAdrDays: 365,
  rapidChangeDays: 7,
  implementationLagWarning: 90,
};

function makeAdr(overrides: Partial<DiscoveredAdr>): DiscoveredAdr {
  return {
    filename: 'adr-001.md',
    title: 'Test ADR',
    status: 'proposed',
    date: '2024-01-01',
    path: '/tmp/adrs/adr-001.md',
    timeline: {
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-06-01T00:00:00Z',
      age_days: 100,
      days_since_update: 50,
      staleness_warnings: [],
      extraction_method: 'filesystem',
    },
    ...overrides,
  };
}

describe('generateActionItems', () => {
  it('returns empty work queue for empty ADR array', async () => {
    const result = await generateActionItems([], baseThresholds);
    expect(result.summary.totalActions).toBe(0);
    expect(result.critical).toEqual([]);
    expect(result.high).toEqual([]);
    expect(result.medium).toEqual([]);
    expect(result.low).toEqual([]);
  });

  it('skips ADRs without timeline data', async () => {
    const adr = makeAdr({ timeline: undefined });
    const result = await generateActionItems([adr], baseThresholds);
    expect(result.summary.totalActions).toBe(0);
  });

  it('flags stale proposed ADR as review action', async () => {
    const adr = makeAdr({
      status: 'proposed',
      timeline: {
        created_at: '2023-01-01T00:00:00Z',
        updated_at: '2023-06-01T00:00:00Z',
        age_days: 90,
        days_since_update: 10,
        staleness_warnings: [],
        extraction_method: 'filesystem',
      },
    });
    const result = await generateActionItems([adr], baseThresholds);
    const reviewActions = [...result.critical, ...result.high].filter(
      a => a.actionType === 'review'
    );
    expect(reviewActions.length).toBeGreaterThan(0);
    expect(reviewActions[0].actionDescription).toBe('Review and make final decision');
  });

  it('flags accepted unimplemented ADR with updated language from #1590', async () => {
    const adr = makeAdr({
      status: 'accepted',
      timeline: {
        created_at: '2023-01-01T00:00:00Z',
        updated_at: '2024-06-01T00:00:00Z',
        age_days: 120,
        days_since_update: 10,
        staleness_warnings: [],
        extraction_method: 'filesystem',
      },
    });
    const result = await generateActionItems([adr], baseThresholds);
    const implActions = [...result.high, ...result.medium].filter(
      a => a.actionType === 'implement'
    );
    expect(implActions.length).toBeGreaterThan(0);
    expect(implActions[0].actionDescription).toBe('Verify implementation status');
    expect(implActions[0].rationale).toContain('has not been verified');
    expect(implActions[0].rationale).not.toContain('should be implemented promptly');
  });
});

describe('formatActionReport', () => {
  it('reports no actions required for empty queue', () => {
    const emptyQueue = {
      critical: [],
      high: [],
      medium: [],
      low: [],
      summary: { totalActions: 0, criticalCount: 0, estimatedHours: 0 },
    };
    const report = formatActionReport(emptyQueue);
    expect(report).toContain('No Actions Required');
  });

  it('generates markdown with priority sections', async () => {
    const adr = makeAdr({
      status: 'proposed',
      timeline: {
        created_at: '2023-01-01T00:00:00Z',
        updated_at: '2023-01-01T00:00:00Z',
        age_days: 200,
        days_since_update: 200,
        staleness_warnings: [],
        extraction_method: 'filesystem',
      },
    });
    const queue = await generateActionItems([adr], baseThresholds);
    const report = formatActionReport(queue);
    expect(report).toContain('# ADR Timeline Analysis');
    expect(report).toContain('Summary');
    expect(report).toContain('Total Actions Required');
  });

  it('includes context when provided', () => {
    const emptyQueue = {
      critical: [],
      high: [],
      medium: [],
      low: [],
      summary: { totalActions: 0, criticalCount: 0, estimatedHours: 0 },
    };
    const report = formatActionReport(emptyQueue, {
      projectPath: '/my/project',
      thresholdProfile: 'default',
    });
    expect(report).toContain('/my/project');
    expect(report).toContain('default');
  });
});
