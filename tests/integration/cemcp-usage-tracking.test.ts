/**
 * Protocol-level test: does a CE-MCP directive call get recorded? (#1489)
 *
 * Why this exists:
 *
 * ADR-023 deferred the disposition of three tool clusters -- memory (6),
 * workflow (5), research (4) -- "pending usage data". `perform_research` is in
 * that research cluster. It is also one of the twelve CE_MCP_DIRECTIVE_TOOLS,
 * and the CE-MCP path in src/index.ts returned the directive BEFORE the dispatch
 * switch and before `trackToolExecution`:
 *
 *     if (isCEMCPEnabled(aiConfig) && shouldUseCEMCPDirective(name, ...)) {
 *       const directive = getCEMCPDirective(name, safeArgs);
 *       if (directive) {
 *         return formatDirectiveResponse(directive);   // <-- nothing recorded
 *       }
 *     }
 *     switch (name) { ... }
 *     await this.trackToolExecution(name, args, response, true);   // unreachable
 *
 * So a decision was deferred pending evidence that a bug guaranteed would never
 * be collected for the tools it was deferred about. CE-MCP is also the DEFAULT
 * execution mode (ai-config.ts:152), so this was the normal path, not an edge.
 *
 * This asserts the behaviour over the wire rather than the shape of the source.
 * A unit test that greps for a call site would pass on a call placed after the
 * return statement.
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import { existsSync } from 'node:fs';
import { mkdtemp, mkdir, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { resolve, join } from 'node:path';

const SERVER = resolve(process.cwd(), 'dist/src/index.js');

/** One of CE_MCP_DIRECTIVE_TOOLS, and in ADR-023's deferred research cluster. */
const DIRECTIVE_TOOL = 'perform_research';

let client: Client;
let transport: StdioClientTransport;
let projectPath: string;

describe('CE-MCP usage tracking (#1489)', () => {
  beforeAll(async () => {
    if (!existsSync(SERVER)) {
      throw new Error(
        `${SERVER} not found. Run \`npm run build\` before this test -- it exercises ` +
          `the BUILT server, which is the thing shipped to npm.`
      );
    }

    // A throwaway PROJECT_PATH so the knowledge graph this test writes cannot
    // touch the repo's own .mcp-adr-cache.
    projectPath = await mkdtemp(join(tmpdir(), 'cemcp-usage-'));
    await mkdir(join(projectPath, 'docs', 'adrs'), { recursive: true });

    transport = new StdioClientTransport({
      command: process.execPath,
      args: [SERVER],
      env: {
        ...(process.env as Record<string, string>),
        PROJECT_PATH: projectPath,
        ADR_DIRECTORY: 'docs/adrs',
        // The condition under test. ce-mcp is already the default; naming it
        // means this test keeps testing the directive path if the default moves.
        EXECUTION_MODE: 'ce-mcp',
        // No key: a directive is computed locally and must not need one.
        OPENROUTER_API_KEY: '',
      },
    });

    client = new Client({ name: 'cemcp-usage-test', version: '1.0.0' }, { capabilities: {} });
    await client.connect(transport);
  }, 60_000);

  afterAll(async () => {
    try {
      await client?.close();
    } catch {
      /* already gone */
    }
    if (projectPath) {
      await rm(projectPath, { recursive: true, force: true }).catch(() => {});
    }
  });

  it('records a directive-path call in the knowledge graph', async () => {
    await client.callTool({
      name: DIRECTIVE_TOOL,
      arguments: { researchQuestion: 'what does this repository do', projectPath },
    });

    // Written by trackToolExecution -> KnowledgeGraphManager. Project-local
    // since #1488; it used to land in os.tmpdir() and not survive a reboot.
    const snapshotFile = join(projectPath, '.mcp-adr-cache', 'knowledge-graph-snapshots.json');

    // The write happens after the response is returned, so allow the server a
    // moment. Polling rather than a fixed sleep keeps this from being flaky in
    // one direction and slow in the other.
    let raw: string | undefined;
    for (let attempt = 0; attempt < 40; attempt++) {
      try {
        raw = await readFile(snapshotFile, 'utf-8');
        if (raw.includes(DIRECTIVE_TOOL)) break;
      } catch {
        /* not written yet */
      }
      await new Promise(r => setTimeout(r, 250));
    }

    expect(
      raw,
      `${snapshotFile} was never written -- the CE-MCP directive path returned before ` +
        `trackToolExecution, so the call went unrecorded`
    ).toBeDefined();

    const kg = JSON.parse(raw!);
    const recorded: string[] = (kg.analytics?.mostUsedTools ?? []).map(
      (t: { toolName: string }) => t.toolName
    );

    expect(
      recorded,
      `${DIRECTIVE_TOOL} is one of CE_MCP_DIRECTIVE_TOOLS and was not recorded. ` +
        `ADR-023 defers this tool's disposition pending exactly this data.`
    ).toContain(DIRECTIVE_TOOL);
  }, 90_000);
});
