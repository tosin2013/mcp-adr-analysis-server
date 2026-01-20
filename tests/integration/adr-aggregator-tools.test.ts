/**
 * Integration Tests for ADR Aggregator Tool Functions
 *
 * Tests the tool-level implementations that wrap the API client.
 * Complements adr-aggregator.test.ts which tests the API client directly.
 *
 * Tests:
 * - Tool function execution with mocked client
 * - ToolContext callback integration
 * - Git repository validation
 * - Error propagation and formatting
 *
 * @see src/tools/adr-aggregator-tools.ts
 * @see src/tools/analyze-gaps-tool.ts
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { promises as fs } from 'fs';
import path from 'path';
import os from 'os';

import type { ToolContext } from '../../src/types/tool-context.js';
import { McpAdrError } from '../../src/types/index.js';

// Create mock client that will be returned by all client functions
const mockClient = {
  isConfigured: vi.fn().mockReturnValue(true),
  getBaseUrl: vi.fn().mockReturnValue('https://test.adraggregator.com'),
  getRepositoryName: vi.fn().mockReturnValue('test-owner/test-repo'),
  syncAdrs: vi.fn(),
  getContext: vi.fn(),
  getStalenessReport: vi.fn(),
  getTemplates: vi.fn(),
  getDiagrams: vi.fn(),
  validateCompliance: vi.fn(),
  getKnowledgeGraph: vi.fn(),
  updateImplementationStatus: vi.fn(),
  getPriorities: vi.fn(),
  reportCodeGaps: vi.fn(),
  getCodeGaps: vi.fn(),
};

// Mock the adr-aggregator-client module
vi.mock('../../src/utils/adr-aggregator-client.js', () => ({
  getAdrAggregatorClient: vi.fn(() => mockClient),
  resetAdrAggregatorClient: vi.fn(),
  createAdrAggregatorClient: vi.fn(() => mockClient),
  AdrAggregatorClient: vi.fn(() => mockClient),
}));

// Mock git-remote-detector
vi.mock('../../src/utils/git-remote-detector.js', () => ({
  isGitRepository: vi.fn().mockReturnValue(true),
  detectGitRemote: vi.fn().mockReturnValue({
    repositoryName: 'test-owner/test-repo',
    provider: 'github',
    currentBranch: 'main',
    remoteUrl: 'git@github.com:test-owner/test-repo.git',
  }),
  getGitRoot: vi.fn().mockReturnValue('/test/repo'),
  getCurrentCommit: vi.fn().mockReturnValue('abc123def'),
  hasUncommittedChanges: vi.fn().mockReturnValue(false),
}));

// Mock config - need to use a function that returns dynamic values
let mockProjectPath = '/test/repo';
vi.mock('../../src/utils/config.js', () => ({
  loadConfig: vi.fn(() => ({
    projectPath: mockProjectPath,
    adrDirectory: 'docs/adrs',
    outputMasking: { enabled: false, patterns: [] },
  })),
}));

// Now import the tools after mocks are set up
import {
  syncToAggregator,
  getAdrContext,
  getStalenessReport,
  getAdrTemplates,
  getAdrDiagrams,
  validateAdrCompliance,
  getKnowledgeGraph,
  updateAdrImplementationStatus,
  getAdrPriorities,
  type SyncToAggregatorArgs,
  type GetAdrContextArgs,
} from '../../src/tools/adr-aggregator-tools.js';

import { analyzeGaps, getGaps } from '../../src/tools/analyze-gaps-tool.js';

describe('ADR Aggregator Tools Integration', () => {
  let tempDir: string;
  let mockContext: ToolContext;

  beforeEach(async () => {
    vi.clearAllMocks();

    // Reset mock client to default configured state
    mockClient.isConfigured.mockReturnValue(true);

    // Create temp directory for test files
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'adr-tools-test-'));
    mockProjectPath = tempDir;

    // Create test ADR directory and files
    const adrDir = path.join(tempDir, 'docs', 'adrs');
    await fs.mkdir(adrDir, { recursive: true });

    await fs.writeFile(
      path.join(adrDir, 'adr-001-use-typescript.md'),
      `# ADR-001: Use TypeScript

**Status:** Accepted

## Context
We need a type-safe language.

## Decision
Use TypeScript.

## Consequences
Better type safety.

## References
- \`src/index.ts\`
- \`src/utils/helper.ts\`
`
    );

    await fs.writeFile(
      path.join(adrDir, 'adr-002-api-design.md'),
      `# ADR-002: API Design

**Status:** Proposed

## Context
Need REST API.

## Decision
Use REST with OpenAPI.

## Consequences
Standardized API.
`
    );

    // Create mock ToolContext
    mockContext = {
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
      debug: vi.fn(),
      report_progress: vi.fn(),
      set_status: vi.fn(),
    };
  });

  afterEach(async () => {
    vi.restoreAllMocks();

    // Clean up temp directory
    if (tempDir) {
      await fs.rm(tempDir, { recursive: true, force: true });
    }
  });

  // ============================================================================
  // sync_to_aggregator Tests
  // ============================================================================

  describe('syncToAggregator', () => {
    it('should sync ADRs successfully', async () => {
      mockClient.syncAdrs.mockResolvedValueOnce({
        success: true,
        synced_count: 2,
        sync_id: 'sync-123',
        repository: 'test-owner/test-repo',
        timestamp: '2025-01-20T12:00:00Z',
        tier: 'pro',
      });

      const args: SyncToAggregatorArgs = {
        full_sync: false,
        include_metadata: true,
        projectPath: tempDir,
      };

      const result = await syncToAggregator(args, mockContext);

      expect(result.isError).toBeUndefined();
      expect(result.content[0].text).toContain('ADR Aggregator Sync Complete');
      expect(result.content[0].text).toContain('ADRs Synced:** 2');
      expect(mockContext.info).toHaveBeenCalled();
      expect(mockContext.report_progress).toHaveBeenCalled();
    });

    it('should report no ADRs found when directory is empty', async () => {
      // Create empty ADR directory
      const emptyDir = path.join(tempDir, 'empty-project');
      const emptyAdrDir = path.join(emptyDir, 'docs', 'adrs');
      await fs.mkdir(emptyAdrDir, { recursive: true });

      const args: SyncToAggregatorArgs = {
        projectPath: emptyDir,
      };

      const result = await syncToAggregator(args, mockContext);

      expect(result.content[0].text).toContain('No ADRs found');
    });

    it('should handle API errors gracefully', async () => {
      mockClient.syncAdrs.mockRejectedValueOnce(new McpAdrError('Invalid API key', 'UNAUTHORIZED'));

      const args: SyncToAggregatorArgs = {
        projectPath: tempDir,
      };

      const result = await syncToAggregator(args, mockContext);

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('ADR Sync Failed');
    });

    it('should handle unconfigured client', async () => {
      mockClient.isConfigured.mockReturnValue(false);

      const args: SyncToAggregatorArgs = {
        projectPath: tempDir,
      };

      // The function throws McpAdrError when client is not configured
      // This happens before the try-catch block in the implementation
      await expect(syncToAggregator(args, mockContext)).rejects.toThrow(
        'ADR Aggregator API key not configured'
      );
    });
  });

  // ============================================================================
  // get_adr_context Tests
  // ============================================================================

  describe('getAdrContext', () => {
    it('should get context successfully', async () => {
      mockClient.getContext.mockResolvedValueOnce({
        repository: 'test-owner/test-repo',
        adrs: [
          {
            path: 'docs/adrs/adr-001.md',
            title: 'Use TypeScript',
            status: 'accepted',
            summary: 'Type safety decision',
            timeline: {
              staleness: 'fresh',
              days_since_modified: 5,
            },
          },
        ],
        summary: {
          total_adrs: 1,
          by_status: { accepted: 1 },
          average_staleness: 5,
        },
      });

      const args: GetAdrContextArgs = {
        include_timeline: true,
        projectPath: tempDir,
      };

      const result = await getAdrContext(args, mockContext);

      expect(result.isError).toBeUndefined();
      expect(result.content[0].text).toContain('ADR Context');
      expect(result.content[0].text).toContain('Total ADRs:** 1');
    });

    it('should pass staleness filter to client', async () => {
      mockClient.getContext.mockResolvedValueOnce({
        repository: 'test-owner/test-repo',
        adrs: [],
        summary: {
          total_adrs: 0,
          by_status: {},
          average_staleness: 0,
        },
      });

      const args: GetAdrContextArgs = {
        staleness_filter: 'stale',
        projectPath: tempDir,
      };

      await getAdrContext(args, mockContext);

      expect(mockClient.getContext).toHaveBeenCalledWith(
        expect.objectContaining({
          staleness_filter: 'stale',
        })
      );
    });
  });

  // ============================================================================
  // get_staleness_report Tests
  // ============================================================================

  describe('getStalenessReport', () => {
    it('should get staleness report successfully', async () => {
      mockClient.getStalenessReport.mockResolvedValueOnce({
        repository: 'test-owner/test-repo',
        report_date: '2025-01-20',
        summary: {
          fresh: 2,
          recent: 1,
          stale: 1,
          very_stale: 0,
          total_adrs: 4,
        },
        governance: {
          review_cycle_compliance: 0.85,
          overdue_reviews: 1,
        },
        stale_adrs: [
          {
            path: 'docs/adrs/old-adr.md',
            title: 'Old Decision',
            days_since_modified: 120,
            staleness: 'stale',
            recommended_action: 'Review and update',
          },
        ],
      });

      const result = await getStalenessReport({ projectPath: tempDir }, mockContext);

      expect(result.isError).toBeUndefined();
      expect(result.content[0].text).toContain('Staleness Report');
      expect(result.content[0].text).toContain('Fresh | 2');
      expect(result.content[0].text).toContain('85.0%');
    });
  });

  // ============================================================================
  // get_adr_templates Tests
  // ============================================================================

  describe('getAdrTemplates', () => {
    it('should get templates successfully', async () => {
      mockClient.getTemplates.mockResolvedValueOnce({
        templates: {
          microservices: {
            best_practices: [
              {
                id: 'bp-001',
                name: 'Service Boundaries',
                description: 'Define clear service boundaries',
                adr_template: '# ADR: Service Boundaries\n...',
              },
            ],
            anti_patterns: [
              {
                id: 'ap-001',
                name: 'Distributed Monolith',
                description: 'Avoid tight coupling',
                detection_hints: ['shared database', 'synchronous calls'],
                recommendation: 'Use async messaging',
              },
            ],
          },
        },
      });

      const result = await getAdrTemplates({ domain: 'microservices' }, mockContext);

      expect(result.isError).toBeUndefined();
      expect(result.content[0].text).toContain('ADR Templates');
      expect(result.content[0].text).toContain('Service Boundaries');
    });
  });

  // ============================================================================
  // get_adr_diagrams Tests (Pro+)
  // ============================================================================

  describe('getAdrDiagrams', () => {
    it('should get diagrams successfully', async () => {
      mockClient.getDiagrams.mockResolvedValueOnce({
        repository: 'test-owner/test-repo',
        diagrams: [
          {
            adr_path: 'docs/adrs/adr-001.md',
            generated_at: '2025-01-20T12:00:00Z',
            workflow_diagram: 'graph LR; A-->B',
            relationship_diagram: 'graph TD; X-->Y',
          },
        ],
      });

      const result = await getAdrDiagrams({ projectPath: tempDir }, mockContext);

      expect(result.isError).toBeUndefined();
      expect(result.content[0].text).toContain('ADR Diagrams');
      expect(result.content[0].text).toContain('```mermaid');
    });

    it('should handle tier restriction error', async () => {
      mockClient.getDiagrams.mockRejectedValueOnce(
        new McpAdrError('This feature requires Pro+ tier', 'TIER_RESTRICTION', {
          tier_required: 'pro',
        })
      );

      const result = await getAdrDiagrams({ projectPath: tempDir }, mockContext);

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Pro+ tier');
    });
  });

  // ============================================================================
  // validate_adr_compliance Tests (Pro+)
  // ============================================================================

  describe('validateAdrCompliance', () => {
    it('should validate compliance successfully', async () => {
      mockClient.validateCompliance.mockResolvedValueOnce({
        repository: 'test-owner/test-repo',
        validation_results: [
          {
            adr_path: 'docs/adrs/adr-001.md',
            compliance_score: 95,
            status: 'compliant',
            linked_files_validated: 5,
            findings: [
              { type: 'success', description: 'All references valid' },
              { type: 'warning', description: 'Minor style issues' },
            ],
            recommendations: ['Consider updating examples'],
          },
        ],
      });

      const result = await validateAdrCompliance({ projectPath: tempDir }, mockContext);

      expect(result.isError).toBeUndefined();
      expect(result.content[0].text).toContain('Compliance Validation');
      expect(result.content[0].text).toContain('95%');
    });
  });

  // ============================================================================
  // get_knowledge_graph Tests (Team)
  // ============================================================================

  describe('getKnowledgeGraph', () => {
    it('should get knowledge graph successfully', async () => {
      mockClient.getKnowledgeGraph.mockResolvedValueOnce({
        repository: 'test-owner/test-repo',
        graph: {
          nodes: [
            { id: 'adr-001', type: 'adr', label: 'Use TypeScript' },
            { id: 'adr-002', type: 'adr', label: 'API Design' },
          ],
          relationships: [{ source: 'adr-002', target: 'adr-001', type: 'depends_on' }],
          cross_repo_patterns: [],
        },
        insights: {
          most_connected_adrs: ['adr-001'],
          orphan_decisions: [],
          pattern_trends: [{ pattern: 'typescript', trend: 'increasing', count: 5 }],
        },
      });

      const result = await getKnowledgeGraph({ projectPath: tempDir }, mockContext);

      expect(result.isError).toBeUndefined();
      expect(result.content[0].text).toContain('Knowledge Graph');
      expect(result.content[0].text).toContain('Nodes:** 2');
    });

    it('should handle team tier restriction', async () => {
      mockClient.getKnowledgeGraph.mockRejectedValueOnce(
        new McpAdrError('This feature requires Team tier', 'TIER_RESTRICTION', {
          tier_required: 'team',
        })
      );

      const result = await getKnowledgeGraph({ projectPath: tempDir }, mockContext);

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Team tier');
    });
  });

  // ============================================================================
  // update_implementation_status Tests (Pro+)
  // ============================================================================

  describe('updateAdrImplementationStatus', () => {
    it('should update status successfully', async () => {
      mockClient.updateImplementationStatus.mockResolvedValueOnce({
        success: true,
        repository: 'test-owner/test-repo',
        updated_count: 2,
        timestamp: '2025-01-20T12:00:00Z',
        tier: 'pro',
      });

      const result = await updateAdrImplementationStatus(
        {
          updates: [
            {
              adr_path: 'docs/adrs/adr-001.md',
              implementation_status: 'implemented',
              notes: 'Completed',
            },
          ],
          projectPath: tempDir,
        },
        mockContext
      );

      expect(result.isError).toBeUndefined();
      expect(result.content[0].text).toContain('Implementation Status Updated');
      expect(result.content[0].text).toContain('Updates Applied:** 2');
    });

    it('should handle empty updates array', async () => {
      const result = await updateAdrImplementationStatus(
        {
          updates: [],
          projectPath: tempDir,
        },
        mockContext
      );

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('No updates provided');
    });
  });

  // ============================================================================
  // get_adr_priorities Tests
  // ============================================================================

  describe('getAdrPriorities', () => {
    it('should get priorities successfully', async () => {
      mockClient.getPriorities.mockResolvedValueOnce({
        repository: 'test-owner/test-repo',
        priorities: [
          {
            adr_path: 'docs/adrs/adr-001.md',
            title: 'Use TypeScript',
            priority_score: 85,
            implementation_status: 'in_progress',
            dependencies: [],
            blockers: [],
            gap_count: 1,
            ai_prioritized: true,
          },
        ],
        summary: {
          total_adrs: 1,
          implemented: 0,
          in_progress: 1,
          not_started: 0,
          blocked: 0,
          total_gaps: 1,
        },
        tier: 'pro',
      });

      const result = await getAdrPriorities(
        { include_ai: true, projectPath: tempDir },
        mockContext
      );

      expect(result.isError).toBeUndefined();
      expect(result.content[0].text).toContain('ADR Priorities');
      expect(result.content[0].text).toContain('Priority Score:** 85/100');
    });
  });

  // ============================================================================
  // analyze_gaps Tests
  // ============================================================================

  describe('analyzeGaps', () => {
    beforeEach(async () => {
      // Create source files referenced in ADRs
      const srcDir = path.join(tempDir, 'src');
      await fs.mkdir(srcDir, { recursive: true });
      await fs.writeFile(path.join(srcDir, 'index.ts'), 'export {};');
      // Note: src/utils/helper.ts is NOT created to test gap detection
    });

    it('should detect ADR-to-code gaps', async () => {
      mockClient.reportCodeGaps.mockResolvedValueOnce({
        success: true,
        summary: {
          gaps_inserted: 1,
          gaps_updated: 0,
          total_open_gaps: 1,
        },
      });

      const result = await analyzeGaps(
        {
          projectPath: tempDir,
          reportToAggregator: true,
        },
        mockContext
      );

      expect(result.isError).toBeUndefined();
      expect(result.content[0].text).toContain('Gap Analysis Report');
      // The helper.ts file doesn't exist, so it should be detected as a gap
      expect(result.content[0].text).toContain('ADR-to-Code Gaps');
    });

    it('should work without reporting to aggregator', async () => {
      // Reset client to unconfigured state for this test
      mockClient.isConfigured.mockReturnValue(false);

      const result = await analyzeGaps(
        {
          projectPath: tempDir,
          reportToAggregator: false,
        },
        mockContext
      );

      expect(result.isError).toBeUndefined();
      expect(result.content[0].text).toContain('Gap Analysis Report');
      // reportCodeGaps should not have been called
      expect(mockClient.reportCodeGaps).not.toHaveBeenCalled();
    });
  });

  // ============================================================================
  // get_gaps Tests
  // ============================================================================

  describe('getGaps', () => {
    it('should get gaps successfully', async () => {
      mockClient.getCodeGaps.mockResolvedValueOnce({
        repository: 'test-owner/test-repo',
        gaps: [
          {
            id: 'gap-001',
            gap_type: 'adr_to_code',
            severity: 'error',
            status: 'open',
            title: 'Missing file',
            first_detected: '2025-01-15',
            last_seen: '2025-01-20',
            adr_path: 'docs/adrs/adr-001.md',
            referenced_file: 'src/missing.ts',
          },
        ],
        summary: {
          total: 1,
          by_type: { adr_to_code: 1 },
          by_severity: { error: 1 },
          by_status: { open: 1 },
        },
      });

      const result = await getGaps({ projectPath: tempDir }, mockContext);

      expect(result.isError).toBeUndefined();
      expect(result.content[0].text).toContain('Current Gaps');
      expect(result.content[0].text).toContain('Missing file');
    });
  });

  // ============================================================================
  // ToolContext Integration Tests
  // ============================================================================

  describe('ToolContext Integration', () => {
    it('should call context.info with progress messages', async () => {
      mockClient.getContext.mockResolvedValueOnce({
        repository: 'test-owner/test-repo',
        adrs: [],
        summary: { total_adrs: 0, by_status: {}, average_staleness: 0 },
      });

      await getAdrContext({ projectPath: tempDir }, mockContext);

      expect(mockContext.info).toHaveBeenCalled();
      expect(mockContext.report_progress).toHaveBeenCalledWith(expect.any(Number), 100);
    });

    it('should work without ToolContext', async () => {
      mockClient.getContext.mockResolvedValueOnce({
        repository: 'test-owner/test-repo',
        adrs: [],
        summary: { total_adrs: 0, by_status: {}, average_staleness: 0 },
      });

      // Call without context - should not throw
      const result = await getAdrContext({ projectPath: tempDir });

      expect(result.isError).toBeUndefined();
    });
  });
});
