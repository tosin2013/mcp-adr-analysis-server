/**
 * Guards the CE-MCP directive claims against drift (#1414).
 *
 * TOOL_CATALOG carried a hand-maintained `hasCEMCPDirective` boolean that had
 * drifted badly: 70 tools claimed a directive while 12 had one. That field is
 * surfaced to callers by `search_tools`, the tool-catalog resource, and the
 * dispatcher's tool list -- so the discovery surface advertised a capability
 * most tools did not have.
 *
 * These tests assert against the IMPLEMENTATION, not against a second list.
 * getCEMCPDirective() returning non-null is the only thing that makes the claim
 * true, so that is what is checked.
 */

import { describe, it, expect } from 'vitest';
import { CE_MCP_DIRECTIVE_TOOLS, getCEMCPDirective } from '../../src/tools/ce-mcp-tools.js';
import { TOOL_CATALOG } from '../../src/tools/tool-catalog.js';

describe('CE-MCP directive claims', () => {
  it('every tool in CE_MCP_DIRECTIVE_TOOLS actually returns a directive', () => {
    const broken: string[] = [];
    for (const name of CE_MCP_DIRECTIVE_TOOLS) {
      let directive: unknown = null;
      try {
        directive = getCEMCPDirective(name, {});
      } catch {
        // A directive factory that throws on empty args still counts as
        // implemented -- the switch routed the name. Only an unrouted name
        // (which falls through to null) is a false claim.
        continue;
      }
      if (directive === null) broken.push(name);
    }
    expect(broken, `listed as directive-backed but getCEMCPDirective returned null`).toEqual([]);
  });

  it('no tool outside the list is silently implemented', () => {
    // Catches the opposite drift: a directive added to the switch without being
    // declared, which would leave the catalog under-reporting.
    const undeclared: string[] = [];
    for (const name of TOOL_CATALOG.keys()) {
      if (CE_MCP_DIRECTIVE_TOOLS.has(name)) continue;
      let directive: unknown = null;
      try {
        directive = getCEMCPDirective(name, {});
      } catch {
        undeclared.push(name);
        continue;
      }
      if (directive !== null) undeclared.push(name);
    }
    expect(undeclared, `implemented but missing from CE_MCP_DIRECTIVE_TOOLS`).toEqual([]);
  });

  it('the catalog claims exactly the tools that are implemented', () => {
    const claimed = [...TOOL_CATALOG.entries()]
      .filter(([, m]) => m.hasCEMCPDirective)
      .map(([n]) => n)
      .sort();
    const actual = [...CE_MCP_DIRECTIVE_TOOLS].sort();

    // The specific failure this exists to prevent: 70 claimed, 12 real.
    expect(claimed).toEqual(actual);
  });

  it('does not over-claim across the catalog as a whole', () => {
    const claimedCount = [...TOOL_CATALOG.values()].filter(m => m.hasCEMCPDirective).length;
    expect(claimedCount).toBe(CE_MCP_DIRECTIVE_TOOLS.size);
  });
});
