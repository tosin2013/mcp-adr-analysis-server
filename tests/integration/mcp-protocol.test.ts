/**
 * Protocol-level test: boot the real server over stdio and talk MCP to it.
 *
 * Why this exists (#1413):
 *
 * CI's only guard against regressions in src/index.ts -- 9,700+ lines at 0.0%
 * coverage -- was test.yml grepping the BUILT BUNDLE for four string literals:
 *
 *     grep -q "analyze_project"        dist/src/index.js
 *     grep -q "mcp_planning"           dist/src/index.js
 *     grep -q "interactive_adr_planning" dist/src/index.js
 *     grep -q "ListToolsRequestSchema" dist/src/index.js
 *
 * That guard cannot detect the failure mode of the refactor it guards (#1416).
 * Splitting the 111-arm dispatch switch into modules keeps every one of those
 * strings present in the bundle while silently breaking dispatch, and CI stays
 * green. A string being present is not a tool being callable.
 *
 * So this asserts behaviour over the wire instead: the server starts, speaks
 * MCP, lists tools, and actually dispatches calls.
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';

const SERVER = resolve(process.cwd(), 'dist/src/index.js');

let client: Client;
let transport: StdioClientTransport;
let toolNames: string[] = [];

describe('MCP protocol', () => {
  beforeAll(async () => {
    // The built server is the artifact under test. Testing src/ via tsx would
    // check something users never run.
    if (!existsSync(SERVER)) {
      throw new Error(
        `${SERVER} not found. Run \`npm run build\` before this test -- it exercises ` +
          `the BUILT server, which is the thing shipped to npm.`
      );
    }

    transport = new StdioClientTransport({
      command: process.execPath,
      args: [SERVER],
      env: {
        ...(process.env as Record<string, string>),
        PROJECT_PATH: process.cwd(),
        ADR_DIRECTORY: 'docs/adrs',
        // Keep the server off any AI path: this test is about protocol
        // behaviour, and must not depend on a key or make a network call.
        EXECUTION_MODE: 'prompt-only',
        LOG_LEVEL: 'error',
      },
      stderr: 'pipe',
    });

    client = new Client({ name: 'protocol-test', version: '1.0.0' }, { capabilities: {} });
    await client.connect(transport);
  }, 120_000);

  afterAll(async () => {
    await client?.close().catch(() => {});
    await transport?.close().catch(() => {});
  });

  it('completes the MCP handshake over stdio', () => {
    // connect() resolving means initialize succeeded. stdio is the only
    // transport this server implements (src/index.ts:12).
    const version = client.getServerVersion();
    expect(version).toBeDefined();
    expect(version?.name).toBeTruthy();
  });

  it('answers tools/list with a non-trivial tool set', async () => {
    const res = await client.listTools();
    toolNames = res.tools.map(t => t.name);

    expect(Array.isArray(res.tools)).toBe(true);
    // Guards against a refactor that wires up an empty or near-empty registry.
    // The exact count is deliberately not asserted -- #1416 will change it, and
    // a test that must be edited to let the refactor pass is not a guard.
    expect(res.tools.length).toBeGreaterThan(20);
  }, 60_000);

  it('gives every tool a name, description and object input schema', async () => {
    const res = await client.listTools();
    for (const tool of res.tools) {
      expect(tool.name, `tool has no name: ${JSON.stringify(tool)}`).toBeTruthy();
      expect(tool.description, `${tool.name} has no description`).toBeTruthy();
      expect(tool.inputSchema, `${tool.name} has no inputSchema`).toBeDefined();
      expect(tool.inputSchema.type, `${tool.name} inputSchema is not an object`).toBe('object');
    }
  }, 60_000);

  it('exposes no duplicate tool names', async () => {
    // Four hand-maintained registries feed this list today (#1416). A merge that
    // double-registers a tool is invisible to a grep and breaks dispatch.
    const dupes = toolNames.filter((n, i) => toolNames.indexOf(n) !== i);
    expect(dupes).toEqual([]);
  });

  it('still exposes the tools the old grep guard checked for', async () => {
    // The literals test.yml grepped the bundle for, asserted as real registry
    // entries rather than as strings that happen to appear in a file.
    //
    // NOTE: the guard's fourth literal was `analyze_project`, and NO SUCH TOOL
    // EXISTS. `grep -q "analyze_project" dist/src/index.js` passed only because
    // it is a substring of `analyze_project_ecosystem`. CI has been asserting
    // the presence of a tool this server has never exposed, and passing.
    // That is not a hypothetical weakness in the grep guard -- it is the guard
    // being wrong today, found by the first run of this test.
    for (const name of ['mcp_planning', 'interactive_adr_planning']) {
      expect(toolNames, `${name} is missing from tools/list`).toContain(name);
    }
    // The real tool the guard was presumably reaching for.
    expect(toolNames).toContain('analyze_project_ecosystem');
    // And the tool it literally named does not exist -- pinned so that if it is
    // ever added, this test says so rather than quietly passing.
    expect(toolNames).not.toContain('analyze_project');
  });

  it('dispatches tools/call and returns a well-formed result', async () => {
    // One call that actually reaches a handler. This is what the grep could
    // never do: prove the name resolves to something that runs.
    const res: any = await client.callTool({
      name: 'get_current_datetime',
      arguments: {},
    });

    expect(res).toBeDefined();
    expect(Array.isArray(res.content), 'result.content must be an array').toBe(true);
    expect(res.content.length).toBeGreaterThan(0);
    expect(res.content[0]).toHaveProperty('type');
  }, 180_000);

  it('lists resources, and every concrete one dispatches to a handler', async () => {
    // 16 of the 17 concrete resources advertised here were dead: src/index.ts derived the
    // resource name from `url.pathname`, but for a non-special scheme like `adr://adr_list`
    // WHATWG URL puts the name in `host` and leaves pathname empty. Every read fell through
    // to `default` and threw "Unknown resource type: " -- with nothing after the colon.
    //
    // This asserts DISPATCH, not latency. Two resources legitimately take 80-160s of real
    // filesystem work, so a full read of every resource would add minutes to CI. What broke
    // was routing, so routing is what is guarded: a resource that times out has still been
    // dispatched; only "Unknown resource type" means it is unreachable. Slowness is tracked
    // separately -- see the follow-up issue.
    const { resources } = await client.listResources();

    // Templates cannot be read literally; they belong in resources/templates/list.
    const concrete = resources.filter(r => !r.uri.includes('{'));
    expect(concrete.length).toBeGreaterThan(10);

    const unreachable: string[] = [];
    for (const r of concrete) {
      try {
        await client.readResource({ uri: r.uri }, { timeout: 15_000 });
      } catch (e) {
        const msg = String((e as Error).message ?? e);
        // A timeout means the handler was found and is working. Anything naming the URI as
        // unknown means it was not routed at all -- that is the regression to catch.
        if (/[Uu]nknown resource/.test(msg)) unreachable.push(`${r.uri}: ${msg}`);
      }
    }
    expect(unreachable, 'advertised resources that route to no handler').toEqual([]);
  }, 300_000);

  it('rejects an unknown tool instead of failing silently', async () => {
    // A dispatcher that quietly returns success for an unrouted name is the
    // exact regression the #1416 refactor could introduce.
    let threw = false;
    try {
      const res: any = await client.callTool({
        name: 'a_tool_that_does_not_exist',
        arguments: {},
      });
      // Some servers signal errors in-band rather than throwing.
      if (res?.isError === true) threw = true;
    } catch {
      threw = true;
    }
    expect(threw, 'unknown tool was accepted without error').toBe(true);
  }, 60_000);
});
