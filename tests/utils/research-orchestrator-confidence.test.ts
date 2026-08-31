/**
 * #1541: calculateConfidence must measure which sources returned data,
 * not avg(fixed literals) + 0.05 * sourceCount.
 */
import { describe, it, expect } from 'vitest';
import {
  calculateSourceConfidence,
  type ResearchSource,
} from '../../src/utils/research-orchestrator.js';

function source(
  found: boolean,
  confidence: number,
  extra: Partial<ResearchSource> = {}
): ResearchSource {
  return {
    type: 'knowledge_graph',
    found,
    data: {},
    confidence,
    timestamp: new Date().toISOString(),
    ...extra,
  };
}

describe('calculateSourceConfidence (#1541)', () => {
  it('is 0 when no sources were consulted', () => {
    expect(calculateSourceConfidence([])).toBe(0);
  });

  it('is the fraction of sources that returned data', () => {
    expect(calculateSourceConfidence([source(true, 1), source(false, 0)])).toBe(0.5);
  });

  it('does not add a 0.05 bonus per source (the old formula)', () => {
    const sources = [source(true, 1), source(false, 0)];
    const got = calculateSourceConfidence(sources);
    const oldFormula = (1 + 0) / 2 + Math.min(sources.length * 0.05, 0.15);
    expect(got).toBe(0.5);
    expect(got).not.toBe(oldFormula);
  });

  it('is 0 when every source reports found: false, even with high literal confidence', () => {
    expect(calculateSourceConfidence([source(false, 0.9), source(false, 0.85)])).toBe(0);
  });
});
