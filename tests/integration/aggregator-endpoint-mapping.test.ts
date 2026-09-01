/**
 * Endpoint-to-Tool Mapping Parity Tests
 *
 * Asserts that every ADR Aggregator endpoint in the canonical mapping has:
 *  1. A matching `case` dispatch in src/tools/tool-dispatch.ts
 *  2. A client method on AdrAggregatorClient that references the API path
 *  3. An exported handler function in the tool module
 *
 * No network calls. Pure code-level verification.
 *
 * @see src/utils/aggregator-endpoint-map.ts
 * @see https://adraggregator.com/mcp-guide
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { promises as fs } from 'fs';
import path from 'path';
import { AGGREGATOR_ENDPOINT_MAP } from '../../src/utils/aggregator-endpoint-map.js';

const SRC_ROOT = path.resolve(__dirname, '../../src');

let dispatchSource: string;
let clientSource: string;

beforeAll(async () => {
  dispatchSource = await fs.readFile(path.join(SRC_ROOT, 'tools', 'tool-dispatch.ts'), 'utf-8');
  clientSource = await fs.readFile(
    path.join(SRC_ROOT, 'utils', 'adr-aggregator-client.ts'),
    'utf-8'
  );
});

describe('Aggregator Endpoint Mapping Parity', () => {
  it('should have at least 11 endpoints in the canonical mapping', () => {
    expect(AGGREGATOR_ENDPOINT_MAP.length).toBeGreaterThanOrEqual(11);
  });

  it('should have unique MCP tool names', () => {
    const toolNames = AGGREGATOR_ENDPOINT_MAP.map(e => e.mcpToolName);
    expect(new Set(toolNames).size).toBe(toolNames.length);
  });

  it('should have unique API paths', () => {
    const paths = AGGREGATOR_ENDPOINT_MAP.map(e => e.apiPath);
    expect(new Set(paths).size).toBe(paths.length);
  });

  describe('Each endpoint has a case dispatch in tool-dispatch.ts', () => {
    for (const entry of AGGREGATOR_ENDPOINT_MAP) {
      it(`tool-dispatch.ts dispatches case '${entry.mcpToolName}'`, () => {
        const pattern = `case '${entry.mcpToolName}'`;
        expect(dispatchSource).toContain(pattern);
      });
    }
  });

  describe('Each endpoint has a client method referencing the API path', () => {
    for (const entry of AGGREGATOR_ENDPOINT_MAP) {
      it(`client contains path '${entry.apiPath}'`, () => {
        expect(clientSource).toContain(entry.apiPath);
      });
    }
  });

  describe('Each endpoint has a client method name', () => {
    for (const entry of AGGREGATOR_ENDPOINT_MAP) {
      it(`client has method '${entry.clientMethod}'`, () => {
        const methodPattern = new RegExp(
          `(public\\s+async\\s+${entry.clientMethod}|async\\s+${entry.clientMethod})\\s*\\(`
        );
        expect(clientSource).toMatch(methodPattern);
      });
    }
  });

  describe('Each endpoint handler is exported from tool module', () => {
    for (const entry of AGGREGATOR_ENDPOINT_MAP) {
      it(`${entry.toolModule} exports '${entry.handlerExport}'`, async () => {
        const modulePath = path.join(SRC_ROOT, 'tools', `${entry.toolModule}.ts`);
        const source = await fs.readFile(modulePath, 'utf-8');
        const exportPattern = new RegExp(
          `export\\s+(async\\s+)?function\\s+${entry.handlerExport}\\s*\\(`
        );
        expect(source).toMatch(exportPattern);
      });
    }
  });

  describe('tool-dispatch.ts imports handler from correct tool module', () => {
    for (const entry of AGGREGATOR_ENDPOINT_MAP) {
      it(`case '${entry.mcpToolName}' imports from '${entry.toolModule}'`, () => {
        const caseStart = dispatchSource.indexOf(`case '${entry.mcpToolName}'`);
        expect(caseStart).toBeGreaterThan(-1);

        const caseBlock = dispatchSource.substring(caseStart, caseStart + 500);
        expect(caseBlock).toContain(entry.toolModule);
      });
    }
  });
});
