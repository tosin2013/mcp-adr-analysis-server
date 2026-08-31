/**
 * #1541: deployment_readiness must be able to report non-compliance and a
 * failing security check. These would have been green when every empty history
 * was 100% and every ADR was compliant by construction.
 */
import { describe, it, expect, vi, beforeAll, beforeEach } from 'vitest';

vi.mock('child_process', () => ({
  execSync: vi.fn().mockReturnValue('Tests: 1 passed, 1 total\n'),
}));

vi.mock('fs', () => ({
  readFileSync: vi.fn().mockImplementation((p: string) => {
    if (String(p).includes('coverage')) return 'Coverage: 90%';
    if (String(p).includes('deployment-history')) return JSON.stringify({ deployments: [] });
    return '{}';
  }),
  writeFileSync: vi.fn(),
  existsSync: vi.fn().mockReturnValue(true),
  mkdirSync: vi.fn(),
}));

vi.mock('../../src/utils/adr-discovery.js', () => ({
  discoverAdrsInDirectory: vi.fn().mockResolvedValue({
    adrs: [{ title: 'Use TLS', content: 'All traffic must use TLS.' }],
  }),
}));

vi.mock('../../src/utils/file-system.js', () => ({
  findFiles: vi.fn().mockResolvedValue({ files: [{ path: 'src/app.ts' }] }),
  findRelatedCode: vi.fn().mockResolvedValue({
    relatedFiles: [],
    confidence: 0,
    keywords: ['tls'],
  }),
}));

vi.mock('../../src/utils/tree-sitter-analyzer.js', () => ({
  TreeSitterAnalyzer: class {
    async analyzeFile() {
      return {
        hasSecrets: true,
        secrets: [
          {
            type: 'api_key',
            confidence: 0.99,
            context: 'hardcoded key',
            location: { line: 1 },
          },
        ],
        securityIssues: [
          {
            type: 'hardcoded_secret',
            severity: 'critical',
            message: 'API key in source',
            location: { line: 1 },
          },
        ],
        imports: [],
        functions: [],
      };
    }
  },
}));

vi.mock('../../src/utils/research-orchestrator.js', () => ({
  answerResearchQuestion: vi.fn().mockResolvedValue({
    answer: 'no environment data',
    confidence: 0,
    sources: [],
    needsWebSearch: false,
  }),
}));

describe('deployment_readiness unmeasured outputs (#1541)', () => {
  let deploymentReadiness: (
    args: Record<string, unknown>
  ) => Promise<{ content: Array<{ text: string }> }>;

  beforeAll(async () => {
    const module = await import('../../src/tools/deployment-readiness-tool.js');
    deploymentReadiness = module.deploymentReadiness;
  });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('reports ADR non-compliance when ADRs exist and no related code is found', async () => {
    const result = await deploymentReadiness({
      operation: 'full_audit',
      projectPath: '/tmp/mcp-adr-1541',
      requireAdrCompliance: true,
      enableMemoryIntegration: false,
      enableTreeSitterAnalysis: false,
    });

    const text = result.content[0]!.text;
    expect(text).toMatch(/ADR compliance failed/i);
    expect(text).not.toMatch(/\*\*Compliance Score\*\*: 70/);
    expect(text).not.toMatch(/\*\*Compliance Score\*\*: 100%/);
    expect(text).not.toMatch(/Math\.min\(100, 70/);
  });

  it('reports a failing security check when tree-sitter finds critical issues', async () => {
    const result = await deploymentReadiness({
      operation: 'full_audit',
      projectPath: '/tmp/mcp-adr-1541',
      requireAdrCompliance: false,
      enableMemoryIntegration: false,
      enableTreeSitterAnalysis: true,
    });

    const text = result.content[0]!.text;
    expect(text).toMatch(/Critical security findings/i);
    expect(text).not.toMatch(/securityScore: 0\.8/);
    expect(text).not.toMatch(/\*\*Success Rate\*\*: 100%/);
  });
});
