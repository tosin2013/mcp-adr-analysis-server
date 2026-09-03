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
    //
    // Fetched here rather than through a variable shared with another test.
    // This block used to read one populated by the test above, so under a `-t`
    // filter it asserted against an empty array and passed without checking
    // anything (#1526). That shared variable is now gone.
    const names = (await client.listTools()).tools.map(t => t.name);
    expect(names.length).toBeGreaterThan(20);
    const dupes = names.filter((n, i) => names.indexOf(n) !== i);
    expect(dupes).toEqual([]);
  }, 60_000);

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
    //
    // Fetched here for the same reason as the test above: reading a variable
    // another test populates means an empty array under a `-t` filter (#1526).
    const names = (await client.listTools()).tools.map(t => t.name);
    for (const name of ['mcp_planning', 'interactive_adr_planning']) {
      expect(names, `${name} is missing from tools/list`).toContain(name);
    }
    // The real tool the guard was presumably reaching for.
    expect(names).toContain('analyze_project_ecosystem');
    // And the tool it literally named does not exist -- pinned so that if it is
    // ever added, this test says so rather than quietly passing.
    expect(names).not.toContain('analyze_project');
  }, 60_000);

  it('does not advertise the llm_* tools ADR-023 declassified', async () => {
    // ADR-023 removed these from the supported surface -- "prompt wrappers over
    // host capability" for two of them, "native web search in every frontier
    // host" for the third. #1526 retired llm_web_search; #1537 retires the rest.
    //
    // None of the three could do what it advertised. Neither cloud nor database
    // management contained a single shell-out or HTTP call; both emitted a
    // fabricated command, then an "## Execution Result" section reading
    // "❌ Failed" for a command never run, because `success` was
    // `command.confidence > 0.7` against a hardcoded 0.3.
    //
    // Fetched here rather than through a variable another test populates: the
    // first draft did that and, under a `-t` filter, asserted against an empty
    // array -- passing while checking nothing, on a tool that was still
    // registered.
    const names = (await client.listTools()).tools.map(t => t.name);
    for (const name of ['llm_web_search', 'llm_cloud_management', 'llm_database_management']) {
      expect(names, `${name} is still advertised`).not.toContain(name);
    }
  }, 60_000);

  it('does not advertise the 9 host-native tools ADR-023 Phase 0 removed (#1673)', async () => {
    const names = (await client.listTools()).tools.map(t => t.name);
    const removed = [
      'read_file',
      'write_file',
      'list_directory',
      'read_directory',
      'list_roots',
      'search_tools',
      'load_prompt',
      'get_current_datetime',
      'check_ai_execution_status',
    ];
    for (const name of removed) {
      expect(names, `${name} is still advertised after ADR-023 removal`).not.toContain(name);
    }
  }, 60_000);

  it('every tool has MCP annotations (#1677)', async () => {
    const tools = (await client.listTools()).tools;
    const missing: string[] = [];
    for (const tool of tools) {
      if (!(tool as any).annotations) {
        missing.push(tool.name);
      }
    }
    expect(missing, `tools without annotations: ${missing.join(', ')}`).toEqual([]);

    // Verify annotation structure on a sample tool
    const ecosystem = tools.find(t => t.name === 'analyze_project_ecosystem');
    const ann = (ecosystem as any).annotations;
    expect(ann.readOnlyHint).toBe(true);
    expect(ann.destructiveHint).toBe(false);
    expect(ann.openWorldHint).toBe(false);
    expect(ann.title).toBeTruthy();
  }, 60_000);

  it('dispatches tools/call and returns a well-formed result', async () => {
    // get_current_datetime removed (#1673); use manage_cache as a simple smoke tool
    const res: any = await client.callTool({
      name: 'manage_cache',
      arguments: { action: 'stats' },
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
    // Runs on its OWN connection. A client-side timeout does not stop the server: some
    // resources do tens of seconds of real work, and on a shared client the next test
    // queued behind that and timed out. Closing this transport kills the child process and
    // the in-flight work with it, so the sweep cannot leak into anything else.
    const ownTransport = new StdioClientTransport({
      command: process.execPath,
      args: [SERVER],
      env: {
        ...(process.env as Record<string, string>),
        PROJECT_PATH: process.cwd(),
        ADR_DIRECTORY: 'docs/adrs',
        EXECUTION_MODE: 'prompt-only',
        LOG_LEVEL: 'error',
      },
      stderr: 'pipe',
    });
    const own = new Client({ name: 'resource-sweep', version: '1.0.0' }, { capabilities: {} });
    await own.connect(ownTransport);

    try {
      const { resources } = await own.listResources();

      // Templates cannot be read literally; they belong in resources/templates/list.
      const concrete = resources.filter(r => !r.uri.includes('{'));
      expect(concrete.length).toBeGreaterThan(10);

      const unreachable: string[] = [];
      for (const r of concrete) {
        try {
          await own.readResource({ uri: r.uri }, { timeout: 15_000 });
        } catch (e) {
          const msg = String((e as Error).message ?? e);
          // A timeout means the handler was found and is working -- this asserts DISPATCH,
          // not latency. Only a message naming the URI as unknown means it routed nowhere.
          if (/[Uu]nknown resource/.test(msg)) unreachable.push(`${r.uri}: ${msg}`);
        }
      }
      expect(unreachable, 'advertised resources that route to no handler').toEqual([]);
    } finally {
      await own.close().catch(() => {});
      await ownTransport.close().catch(() => {});
    }
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
