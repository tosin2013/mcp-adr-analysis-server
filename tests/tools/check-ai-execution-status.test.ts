/**
 * Tests for checkAIExecutionStatus honesty fix (#1630).
 *
 * CE-MCP is the default mode — the handler must not tell those users to buy an
 * OpenRouter API key. Legacy (EXECUTION_MODE=full) users still see the old advice.
 *
 * The handler lives on McpAdrAnalysisServer (a heavyweight class), so we grab
 * the unbound method from the prototype and call it with an empty context.
 * The method only uses `this` nowhere — it does a dynamic import and formats
 * the result.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockLoadAIConfig = vi.fn();
const mockIsAIExecutionEnabled = vi.fn();

vi.mock('../../src/config/ai-config.js', () => ({
  loadAIConfig: (...args: unknown[]) => mockLoadAIConfig(...args),
  isAIExecutionEnabled: (...args: unknown[]) => mockIsAIExecutionEnabled(...args),
}));

// Mock the heavy dependencies so the module can be loaded without side effects.
vi.mock('../../src/utils/config.js', () => ({
  loadConfig: () => ({
    projectPath: '/tmp/test',
    adrDirectory: 'docs/adrs',
    logLevel: 'error',
  }),
}));

vi.mock('../../src/utils/enhanced-logging.js', () => ({
  createLogger: () => ({
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  }),
}));

vi.mock('../../src/utils/knowledge-graph-manager.js', () => ({
  KnowledgeGraphManager: vi.fn().mockImplementation(() => ({})),
}));

vi.mock('../../src/utils/state-reinforcement-manager.js', () => ({
  StateReinforcementManager: vi.fn().mockImplementation(() => ({})),
}));

vi.mock('../../src/utils/conversation-memory-manager.js', () => ({
  ConversationMemoryManager: vi.fn().mockImplementation(() => ({})),
}));

vi.mock('../../src/utils/memory-entity-manager.js', () => ({
  MemoryEntityManager: vi.fn().mockImplementation(() => ({})),
}));

vi.mock('../../src/utils/root-manager.js', () => ({
  RootManager: vi.fn().mockImplementation(() => ({})),
}));

vi.mock('../../src/utils/server-context-generator.js', () => ({
  ServerContextGenerator: vi.fn().mockImplementation(() => ({})),
}));

vi.mock('../../src/utils/output-masking.js', () => ({
  createMaskingConfig: () => ({ enabled: false }),
}));

/** Extract the text body from the handler's CallToolResult. */
function textOf(result: { content: Array<{ type: string; text: string }> }): string {
  return result.content.map(c => c.text).join('\n');
}

describe('check_ai_execution_status honesty (#1630)', () => {
  let callHandler: (args?: Record<string, unknown>) => Promise<{
    content: Array<{ type: string; text: string }>;
  }>;

  beforeEach(async () => {
    mockLoadAIConfig.mockReset();
    mockIsAIExecutionEnabled.mockReset();
    const mod = await import('../../src/mcp-adr-analysis-server.js');
    const method = mod.McpAdrAnalysisServer.prototype.checkAIExecutionStatus;
    callHandler = (args = {}) => method.call({}, args);
  });

  describe('CE-MCP mode (default)', () => {
    beforeEach(() => {
      mockLoadAIConfig.mockReturnValue({
        apiKey: '',
        executionMode: 'ce-mcp',
        defaultModel: 'anthropic/claude-3-sonnet',
      });
      mockIsAIExecutionEnabled.mockReturnValue(false);
    });

    it('says no API key is required', async () => {
      const text = textOf(await callHandler());
      expect(text).toContain('No API key is required');
    });

    it('says no environment variables are required', async () => {
      const text = textOf(await callHandler());
      expect(text).toContain('No environment variables are required');
    });

    it('does not instruct users to get an OpenRouter key', async () => {
      const text = textOf(await callHandler());
      expect(text).not.toContain('Get an OpenRouter API key');
      expect(text).not.toContain('openrouter.ai/keys');
    });

    it('does not show legacy "Environment Variables Expected" heading', async () => {
      const text = textOf(await callHandler());
      expect(text).not.toContain('## Environment Variables Expected');
    });

    it('shows the CE-MCP environment variables section', async () => {
      const text = textOf(await callHandler());
      expect(text).toContain('## Environment Variables (CE-MCP mode)');
    });

    it('shows Running in CE-MCP mode', async () => {
      const text = textOf(await callHandler());
      expect(text).toContain('Running in CE-MCP mode');
    });
  });

  describe('legacy mode without API key', () => {
    beforeEach(() => {
      mockLoadAIConfig.mockReturnValue({
        apiKey: '',
        executionMode: 'prompt-only',
        defaultModel: 'anthropic/claude-3-sonnet',
      });
      mockIsAIExecutionEnabled.mockReturnValue(false);
    });

    it('shows Issue Detected with the missing-key reason', async () => {
      const text = textOf(await callHandler());
      expect(text).toContain('Issue Detected');
      expect(text).toContain('Missing OPENROUTER_API_KEY');
    });

    it('directs users to get an OpenRouter key', async () => {
      const text = textOf(await callHandler());
      expect(text).toContain('openrouter.ai/keys');
    });

    it('shows legacy Environment Variables Expected section', async () => {
      const text = textOf(await callHandler());
      expect(text).toContain('## Environment Variables Expected');
    });
  });

  describe('legacy mode fully configured', () => {
    beforeEach(() => {
      mockLoadAIConfig.mockReturnValue({
        apiKey: 'sk-test-key',
        executionMode: 'full',
        defaultModel: 'anthropic/claude-3-sonnet',
      });
      mockIsAIExecutionEnabled.mockReturnValue(true);
    });

    it('shows Configuration Looks Good', async () => {
      const text = textOf(await callHandler());
      expect(text).toContain('Configuration Looks Good');
    });

    it('shows legacy Environment Variables Expected section', async () => {
      const text = textOf(await callHandler());
      expect(text).toContain('## Environment Variables Expected');
    });
  });
});
