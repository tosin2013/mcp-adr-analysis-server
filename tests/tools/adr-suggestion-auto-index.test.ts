/**
 * Tests for auto-save + knowledge-graph indexing + release linkage
 * behavior added to generateAdrFromDecision.
 */

import { describe, test, expect, beforeEach, afterEach, vi } from 'vitest';
import * as fs from 'fs/promises';
import * as os from 'os';
import * as path from 'path';

vi.mock('../../src/utils/prompt-execution.js', () => ({
  executeADRGenerationPrompt: vi.fn().mockResolvedValue({
    content: '# Test ADR\n\n## Status\nAccepted\n\n## Context\nTesting\n',
    isAIGenerated: true,
  }),
  formatMCPResponse: vi.fn((payload: any) => ({
    content: [
      {
        type: 'text',
        text: payload.content,
      },
    ],
  })),
}));

const { registerAdrMock } = vi.hoisted(() => ({
  registerAdrMock: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('../../src/utils/knowledge-graph-manager.js', () => ({
  KnowledgeGraphManager: class MockKnowledgeGraphManager {
    registerAdr = registerAdrMock;
  },
}));

vi.mock('../../src/utils/adr-discovery.js', () => ({
  discoverAdrsInDirectory: vi.fn().mockResolvedValue({
    adrs: [
      {
        filename: '0001-test-adr.md',
        title: 'Test ADR',
        status: 'accepted',
        path: 'docs/adrs/0001-test-adr.md',
        date: new Date().toISOString(),
        metadata: { number: 1 },
      },
    ],
  }),
}));

vi.mock('../../src/utils/release-tracker.js', () => ({
  detectReleases: vi.fn().mockResolvedValue([]),
  previewNextRelease: vi.fn().mockResolvedValue({
    unreleaseCommits: ['abc123 feat: test'],
    pendingAdrs: [{ filename: '0001-test-adr.md' }],
    readiness: { overall: 'ready' },
    suggestedVersion: 'minor',
  }),
}));

describe('generateAdrFromDecision auto-index', () => {
  let tmpDir: string;

  beforeEach(async () => {
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'adr-auto-'));
    vi.clearAllMocks();
    registerAdrMock.mockClear();
  });

  afterEach(async () => {
    await fs.rm(tmpDir, { recursive: true, force: true });
  });

  test('autoSave=true writes the file and registers in knowledge graph', async () => {
    const { generateAdrFromDecision } = await import('../../src/tools/adr-suggestion-tool.js');

    const adrDirectory = path.join(tmpDir, 'docs/adrs');

    const result = await generateAdrFromDecision({
      decisionData: {
        title: 'Test ADR',
        context: 'A context',
        decision: 'A decision',
        consequences: 'A consequence',
      },
      adrDirectory,
      projectPath: tmpDir,
    });

    const text = result.content[0].text;
    expect(text).toContain('Auto-saved**: yes');
    expect(text).toContain('File Saved');
    expect(text).toContain('Release Linkage');
    expect(text).toContain('Next release (predicted bump)');

    expect(registerAdrMock).toHaveBeenCalledTimes(1);
    const registered = registerAdrMock.mock.calls[0][0];
    expect(registered.title).toBe('Test ADR');
    expect(registered.filename).toMatch(/\.md$/);
    expect(registered.status).toBe('accepted');

    const files = await fs.readdir(adrDirectory);
    expect(files.length).toBe(1);
    const savedContent = await fs.readFile(path.join(adrDirectory, files[0]!), 'utf-8');
    expect(savedContent).toContain('# Test ADR');
  });

  test('autoSave=false preserves manual-instructions output and does not register', async () => {
    const { generateAdrFromDecision } = await import('../../src/tools/adr-suggestion-tool.js');

    const adrDirectory = path.join(tmpDir, 'docs/adrs');

    const result = await generateAdrFromDecision({
      decisionData: {
        title: 'Manual ADR',
        context: 'A context',
        decision: 'A decision',
        consequences: 'A consequence',
      },
      adrDirectory,
      projectPath: tmpDir,
      autoSave: false,
    });

    const text = result.content[0].text;
    expect(text).toContain('File Creation Instructions');
    expect(text).toContain('mkdir -p');
    expect(text).toContain('Auto-saved**: no');
    expect(registerAdrMock).not.toHaveBeenCalled();

    const dirExists = await fs
      .stat(adrDirectory)
      .then(() => true)
      .catch(() => false);
    expect(dirExists).toBe(false);
  });

  test('fs failure falls back gracefully without throwing', async () => {
    const { generateAdrFromDecision } = await import('../../src/tools/adr-suggestion-tool.js');

    // Point to a path that cannot be written (parent is a file, not directory)
    const blockingFile = path.join(tmpDir, 'blocker');
    await fs.writeFile(blockingFile, 'x');
    const adrDirectory = path.join(blockingFile, 'nested');

    const result = await generateAdrFromDecision({
      decisionData: {
        title: 'Blocked ADR',
        context: 'A context',
        decision: 'A decision',
        consequences: 'A consequence',
      },
      adrDirectory,
      projectPath: tmpDir,
    });

    expect(result).toBeDefined();
    const text = result.content[0].text;
    expect(text).toContain('Auto-saved**: no');
    expect(text).toContain('File Creation Instructions');
  });
});
