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
import {
  CE_MCP_DIRECTIVE_TOOLS,
  getCEMCPDirective,
  createAnalyzeContentSecurityDirective,
  createGenerateContentMaskingDirective,
} from '../../src/tools/ce-mcp-tools.js';
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

describe('CE-MCP content-masking directives (#1631)', () => {
  describe('createAnalyzeContentSecurityDirective', () => {
    it('returns an orchestration directive with correct structure', () => {
      const directive = createAnalyzeContentSecurityDirective({
        content: 'password=secret123',
        contentType: 'configuration',
      });

      expect(directive.type).toBe('orchestration_directive');
      expect(directive.version).toBe('1.0');
      expect(directive.tool).toBe('analyze_content_security');
      expect(directive.description).toContain('configuration');
      expect(directive.description).toContain('18 chars');
      expect(directive.sandbox_operations.length).toBeGreaterThanOrEqual(3);
      expect(directive.compose).toBeDefined();
      expect(directive.metadata).toBeDefined();
    });

    it('includes loadKnowledge op when knowledgeEnhancement is true', () => {
      const directive = createAnalyzeContentSecurityDirective({
        content: 'test content',
        knowledgeEnhancement: true,
      });

      const ops = directive.sandbox_operations.map(op => op.op);
      expect(ops).toContain('loadKnowledge');
    });

    it('omits loadKnowledge op when knowledgeEnhancement is false', () => {
      const directive = createAnalyzeContentSecurityDirective({
        content: 'test content',
        knowledgeEnhancement: false,
      });

      const ops = directive.sandbox_operations.map(op => op.op);
      expect(ops).not.toContain('loadKnowledge');
    });

    it('passes userDefinedPatterns and contentType through', () => {
      const directive = createAnalyzeContentSecurityDirective({
        content: 'some code',
        contentType: 'code',
        userDefinedPatterns: ['ACME_KEY_.*'],
        enableTreeSitterAnalysis: false,
        knowledgeEnhancement: false,
      });

      const analyzeOp = directive.sandbox_operations.find(op => op.op === 'analyzeFiles');
      expect(analyzeOp?.args?.userDefinedPatterns).toEqual(['ACME_KEY_.*']);
      expect(analyzeOp?.args?.contentType).toBe('code');
      expect(analyzeOp?.args?.enableTreeSitterAnalysis).toBe(false);
    });
  });

  describe('createGenerateContentMaskingDirective', () => {
    const sampleItems = [
      {
        type: 'password',
        content: 'secret123',
        startPosition: 9,
        endPosition: 18,
        severity: 'high',
      },
    ];

    it('returns an orchestration directive with correct structure', () => {
      const directive = createGenerateContentMaskingDirective({
        content: 'password=secret123',
        detectedItems: sampleItems,
        maskingStrategy: 'placeholder',
      });

      expect(directive.type).toBe('orchestration_directive');
      expect(directive.version).toBe('1.0');
      expect(directive.tool).toBe('generate_content_masking');
      expect(directive.description).toContain('1 detected items');
      expect(directive.description).toContain('placeholder');
      expect(directive.sandbox_operations.length).toBeGreaterThanOrEqual(2);
      expect(directive.compose).toBeDefined();
      expect(directive.metadata).toBeDefined();
    });

    it('defaults to full masking strategy', () => {
      const directive = createGenerateContentMaskingDirective({
        content: 'test',
        detectedItems: sampleItems,
      });

      expect(directive.description).toContain('full');
    });
  });
});
