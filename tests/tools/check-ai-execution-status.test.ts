/**
 * check_ai_execution_status was removed in ADR-023 Phase 0 (#1673).
 *
 * The handler, schema, catalog entry, and dispatch case are all gone.
 * This file is retained as a tombstone so that git blame shows the history.
 */
import { describe, it, expect } from 'vitest';

describe('check_ai_execution_status (removed #1673)', () => {
  it('tool is no longer in the catalog', async () => {
    const { TOOL_CATALOG } = await import('../../src/tools/tool-catalog.js');
    expect(TOOL_CATALOG.has('check_ai_execution_status')).toBe(false);
  });
});
