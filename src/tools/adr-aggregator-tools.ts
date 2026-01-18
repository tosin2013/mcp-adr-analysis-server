/**
 * ADR Aggregator Integration Tools
 * MCP tools for bidirectional sync with https://adraggregator.com
 *
 * @see NEW_FEATURE.md for API documentation
 */

import { McpAdrError, type Adr } from '../types/index.js';
import type { ToolContext } from '../types/tool-context.js';
import {
  getAdrAggregatorClient,
  type AdrAggregatorClient,
} from '../utils/adr-aggregator-client.js';
import { loadConfig } from '../utils/config.js';
import { isGitRepository } from '../utils/git-remote-detector.js';
import type {
  SyncAdrRequest,
  SyncAdrPayload,
  GetContextRequest,
  GetStalenessReportRequest,
  GetTemplatesRequest,
  GetDiagramsRequest,
  ValidateComplianceRequest,
  GetKnowledgeGraphRequest,
  UpdateImplementationStatusRequest,
  ImplementationStatus,
  GetPrioritiesRequest,
} from '../types/adr-aggregator.js';
import { promises as fs } from 'fs';
import path from 'path';

// ============================================================================
// Tool Argument Interfaces
// ============================================================================

/**
 * Arguments for sync_to_aggregator tool
 */
export interface SyncToAggregatorArgs {
  /** Replace all ADRs instead of incremental sync */
  full_sync?: boolean;
  /** Include analysis metadata in sync */
  include_metadata?: boolean;
  /** Include Mermaid diagrams (Pro+ tier) */
  include_diagrams?: boolean;
  /** Include timeline/staleness data */
  include_timeline?: boolean;
  /** Include security scan results */
  include_security_scan?: boolean;
  /** Include AST-based code links (Pro+ tier) */
  include_code_links?: boolean;
  /** Specific ADR paths to sync (syncs all if not provided) */
  adr_paths?: string[];
  /** Project path (defaults to PROJECT_PATH) */
  projectPath?: string;
}

/**
 * Arguments for get_adr_context tool
 */
export interface GetAdrContextArgs {
  /** Include Mermaid diagrams (Pro+ tier) */
  include_diagrams?: boolean;
  /** Include timeline data */
  include_timeline?: boolean;
  /** Include code links (Pro+ tier) */
  include_code_links?: boolean;
  /** Include research context (Pro+ tier) */
  include_research?: boolean;
  /** Filter by staleness level */
  staleness_filter?: 'all' | 'fresh' | 'stale' | 'very_stale';
  /** Knowledge graph depth (Team tier) */
  graph_depth?: number;
  /** Project path (defaults to PROJECT_PATH) */
  projectPath?: string;
}

/**
 * Arguments for get_staleness_report tool
 */
export interface GetStalenessReportArgs {
  /** Days threshold for staleness */
  threshold?: number;
  /** Project path (defaults to PROJECT_PATH) */
  projectPath?: string;
}

/**
 * Arguments for get_adr_templates tool
 */
export interface GetAdrTemplatesArgs {
  /** Domain filter (web_application, microservices, api, etc.) */
  domain?: string;
}

/**
 * Arguments for get_adr_diagrams tool (Pro+ tier)
 */
export interface GetAdrDiagramsArgs {
  /** Specific ADR path (returns all if not specified) */
  adr_path?: string;
  /** Project path (defaults to PROJECT_PATH) */
  projectPath?: string;
}

/**
 * Arguments for validate_adr_compliance tool (Pro+ tier)
 */
export interface ValidateAdrComplianceArgs {
  /** Specific ADR paths to validate */
  adr_paths?: string[];
  /** Type of validation to perform */
  validation_type?: 'implementation' | 'architecture' | 'security' | 'all';
  /** Project path (defaults to PROJECT_PATH) */
  projectPath?: string;
}

/**
 * Arguments for get_knowledge_graph tool (Team tier)
 */
export interface GetKnowledgeGraphArgs {
  /** Scope of the graph */
  scope?: 'repository' | 'organization';
  /** Include graph analytics and insights */
  include_analytics?: boolean;
  /** Project path (defaults to PROJECT_PATH) */
  projectPath?: string;
}

/**
 * Standard tool result format
 */
export interface ToolResult {
  content: Array<{ type: 'text'; text: string }>;
  isError?: boolean;
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Discover existing ADRs in the project
 */
async function discoverAdrs(projectPath: string, adrDirectory: string): Promise<string[]> {
  const adrPath = path.resolve(projectPath, adrDirectory);
  const adrFiles: string[] = [];

  try {
    const files = await fs.readdir(adrPath);
    for (const file of files) {
      if (file.endsWith('.md')) {
        adrFiles.push(path.join(adrPath, file));
      }
    }
  } catch {
    // Directory doesn't exist or not readable
  }

  return adrFiles;
}

/**
 * Parse ADR content to extract metadata
 */
function parseAdrContent(content: string, filePath: string): Partial<Adr> {
  const lines = content.split('\n');
  let title = '';
  let status: Adr['status'] = 'proposed';

  for (const line of lines) {
    // Extract title from first H1
    if (line.startsWith('# ') && !title) {
      title = line.slice(2).trim();
    }
    // Extract status
    const statusMatch = line.match(/^\*?\*?Status\*?\*?:\s*(.+)/i);
    if (statusMatch && statusMatch[1]) {
      const statusValue = statusMatch[1].toLowerCase().trim();
      if (statusValue.includes('accepted')) status = 'accepted';
      else if (statusValue.includes('deprecated')) status = 'deprecated';
      else if (statusValue.includes('superseded')) status = 'superseded';
      else if (statusValue.includes('proposed')) status = 'proposed';
    }
  }

  return {
    title: title || path.basename(filePath, '.md'),
    status,
    filePath,
  };
}

/**
 * Build ADR payloads for sync
 */
async function buildAdrPayloads(
  adrPaths: string[],
  projectPath: string,
  includeMetadata: boolean
): Promise<SyncAdrPayload[]> {
  const payloads: SyncAdrPayload[] = [];

  for (const adrPath of adrPaths) {
    try {
      const content = await fs.readFile(adrPath, 'utf-8');
      const relativePath = path.relative(projectPath, adrPath);
      const parsed = parseAdrContent(content, adrPath);

      const payload: SyncAdrPayload = {
        path: relativePath,
        title: parsed.title || path.basename(adrPath, '.md'),
        status: parsed.status || 'proposed',
        content,
      };

      if (includeMetadata) {
        payload.analysis_metadata = {
          last_analyzed: new Date().toISOString(),
        };
      }

      payloads.push(payload);
    } catch (error) {
      // Skip files that can't be read
      console.error(`Failed to read ADR: ${adrPath}`, error);
    }
  }

  return payloads;
}

/**
 * Ensure client is configured
 */
function ensureConfigured(client: AdrAggregatorClient): void {
  if (!client.isConfigured()) {
    throw new McpAdrError(
      'ADR Aggregator API key not configured. Set ADR_AGGREGATOR_API_KEY environment variable.',
      'NOT_CONFIGURED'
    );
  }
}

/**
 * Ensure git repository
 */
function ensureGitRepo(projectPath: string): void {
  if (!isGitRepository(projectPath)) {
    throw new McpAdrError(
      'Not a git repository. ADR Aggregator requires a git repository to auto-detect the repository name.',
      'NOT_GIT_REPO'
    );
  }
}

// ============================================================================
// Tool Implementations
// ============================================================================

/**
 * Sync ADRs to ADR Aggregator platform
 *
 * POST /functions/v1/mcp-sync-adr
 */
export async function syncToAggregator(
  args: SyncToAggregatorArgs,
  context?: ToolContext
): Promise<ToolResult> {
  const { full_sync = false, include_metadata = true, adr_paths, projectPath } = args;

  const client = getAdrAggregatorClient();
  ensureConfigured(client);

  const config = loadConfig();
  const resolvedProjectPath = projectPath || config.projectPath;

  ensureGitRepo(resolvedProjectPath);

  try {
    context?.info('Starting ADR sync to aggregator...');
    context?.report_progress(10, 100);

    // Auto-detect repository name
    const repositoryName = client.getRepositoryName(resolvedProjectPath);
    context?.info(`Repository: ${repositoryName}`);

    // Discover ADRs
    context?.report_progress(20, 100);
    let adrFilePaths: string[];

    if (adr_paths && adr_paths.length > 0) {
      // Use specified paths
      adrFilePaths = adr_paths.map(p => path.resolve(resolvedProjectPath, p));
    } else {
      // Discover all ADRs
      adrFilePaths = await discoverAdrs(resolvedProjectPath, config.adrDirectory);
    }

    context?.info(`Found ${adrFilePaths.length} ADRs to sync`);
    context?.report_progress(40, 100);

    if (adrFilePaths.length === 0) {
      return {
        content: [
          {
            type: 'text',
            text: `# ADR Aggregator Sync

No ADRs found in ${config.adrDirectory}. Create ADRs first using \`suggest_adrs\` or \`generate_adr_from_decision\` tools.`,
          },
        ],
      };
    }

    // Build payloads
    const adrs = await buildAdrPayloads(adrFilePaths, resolvedProjectPath, include_metadata);
    context?.report_progress(60, 100);

    // Send to aggregator
    const request: SyncAdrRequest = {
      repository_name: repositoryName,
      adrs,
      full_sync,
      include_metadata,
    };

    const response = await client.syncAdrs(request);
    context?.report_progress(100, 100);
    context?.info(`Synced ${response.synced_count} ADRs successfully`);

    return {
      content: [
        {
          type: 'text',
          text: `# ADR Aggregator Sync Complete

## Summary
- **Repository:** ${response.repository}
- **ADRs Synced:** ${response.synced_count}
- **Sync ID:** ${response.sync_id}
- **Timestamp:** ${response.timestamp}
${response.tier ? `- **Tier:** ${response.tier}` : ''}
${response.truncated ? `\n**Warning:** Some ADRs were truncated due to tier limits. Upgrade at /pricing to sync more.` : ''}

${
  response.errors && response.errors.length > 0
    ? `## Errors
${response.errors.map(e => `- ${e.code}: ${e.message}`).join('\n')}`
    : ''
}

## Synced ADRs
${adrs.map(adr => `- ${adr.path} (${adr.status})`).join('\n')}

## Options
- Full Sync: ${full_sync}
- Include Metadata: ${include_metadata}

View in dashboard: ${client.getBaseUrl()}/mcp-dashboard`,
        },
      ],
    };
  } catch (error) {
    const errorMessage = error instanceof McpAdrError ? error.message : String(error);
    return {
      content: [
        {
          type: 'text',
          text: `# ADR Sync Failed

**Error:** ${errorMessage}

Please check:
1. ADR_AGGREGATOR_API_KEY is set correctly
2. You have an active internet connection
3. The ADR Aggregator service is available`,
        },
      ],
      isError: true,
    };
  }
}

/**
 * Get ADR context from aggregator
 *
 * GET /functions/v1/mcp-get-context
 */
export async function getAdrContext(
  args: GetAdrContextArgs,
  context?: ToolContext
): Promise<ToolResult> {
  const client = getAdrAggregatorClient();
  ensureConfigured(client);

  const config = loadConfig();
  const resolvedProjectPath = args.projectPath || config.projectPath;

  ensureGitRepo(resolvedProjectPath);

  try {
    const repositoryName = client.getRepositoryName(resolvedProjectPath);

    context?.info(`Fetching ADR context for ${repositoryName}...`);
    context?.report_progress(30, 100);

    const request: GetContextRequest = {
      repository_name: repositoryName,
      include_timeline: args.include_timeline ?? true,
      ...(args.include_diagrams !== undefined && { include_diagrams: args.include_diagrams }),
      ...(args.include_code_links !== undefined && { include_code_links: args.include_code_links }),
      ...(args.include_research !== undefined && { include_research: args.include_research }),
      ...(args.staleness_filter !== undefined && { staleness_filter: args.staleness_filter }),
      ...(args.graph_depth !== undefined && { graph_depth: args.graph_depth }),
    };

    const response = await client.getContext(request);
    context?.report_progress(100, 100);

    return {
      content: [
        {
          type: 'text',
          text: `# ADR Context for ${response.repository}

## Summary
- **Total ADRs:** ${response.summary.total_adrs}
- **By Status:** ${JSON.stringify(response.summary.by_status)}
- **Average Staleness:** ${response.summary.average_staleness.toFixed(2)}

## ADRs
${response.adrs
  .map(
    adr => `
### ${adr.title}
- **Path:** ${adr.path}
- **Status:** ${adr.status}
${adr.timeline ? `- **Staleness:** ${adr.timeline.staleness} (${adr.timeline.days_since_modified} days)` : ''}
${adr.summary ? `- **Summary:** ${adr.summary}` : ''}
`
  )
  .join('\n')}
`,
        },
      ],
    };
  } catch (error) {
    const errorMessage = error instanceof McpAdrError ? error.message : String(error);
    return {
      content: [
        { type: 'text', text: `# Failed to Get ADR Context\n\n**Error:** ${errorMessage}` },
      ],
      isError: true,
    };
  }
}

/**
 * Get staleness report from aggregator
 *
 * GET /functions/v1/mcp-staleness-report
 */
export async function getStalenessReport(
  args: GetStalenessReportArgs,
  context?: ToolContext
): Promise<ToolResult> {
  const client = getAdrAggregatorClient();
  ensureConfigured(client);

  const config = loadConfig();
  const resolvedProjectPath = args.projectPath || config.projectPath;

  ensureGitRepo(resolvedProjectPath);

  try {
    const repositoryName = client.getRepositoryName(resolvedProjectPath);

    context?.info(`Fetching staleness report for ${repositoryName}...`);
    context?.report_progress(30, 100);

    const request: GetStalenessReportRequest = {
      repository_name: repositoryName,
      threshold: args.threshold ?? 90,
    };

    const response = await client.getStalenessReport(request);
    context?.report_progress(100, 100);

    return {
      content: [
        {
          type: 'text',
          text: `# ADR Staleness Report

## Repository: ${response.repository}
**Report Date:** ${response.report_date}

## Summary
| Status | Count |
|--------|-------|
| Fresh | ${response.summary.fresh} |
| Recent | ${response.summary.recent} |
| Stale | ${response.summary.stale} |
| Very Stale | ${response.summary.very_stale} |
| **Total** | **${response.summary.total_adrs}** |

## Governance
- **Review Cycle Compliance:** ${(response.governance.review_cycle_compliance * 100).toFixed(1)}%
- **Overdue Reviews:** ${response.governance.overdue_reviews}

${
  response.stale_adrs.length > 0
    ? `## Stale ADRs Requiring Attention
${response.stale_adrs
  .map(
    adr => `
### ${adr.title}
- **Path:** ${adr.path}
- **Days Since Modified:** ${adr.days_since_modified}
- **Staleness Level:** ${adr.staleness}
- **Recommended Action:** ${adr.recommended_action}
`
  )
  .join('\n')}`
    : '## All ADRs are Fresh! ✓'
}
`,
        },
      ],
    };
  } catch (error) {
    const errorMessage = error instanceof McpAdrError ? error.message : String(error);
    return {
      content: [
        { type: 'text', text: `# Failed to Get Staleness Report\n\n**Error:** ${errorMessage}` },
      ],
      isError: true,
    };
  }
}

/**
 * Get ADR templates from aggregator
 *
 * GET /functions/v1/mcp-get-templates
 */
export async function getAdrTemplates(
  args: GetAdrTemplatesArgs,
  context?: ToolContext
): Promise<ToolResult> {
  const client = getAdrAggregatorClient();
  // Templates don't require authentication
  // ensureConfigured(client);

  try {
    context?.info(`Fetching ADR templates${args.domain ? ` for domain: ${args.domain}` : ''}...`);
    context?.report_progress(30, 100);

    const request: GetTemplatesRequest = {
      ...(args.domain !== undefined && { domain: args.domain }),
    };

    const response = await client.getTemplates(request);
    context?.report_progress(100, 100);

    const templateSections = Object.entries(response.templates)
      .map(
        ([domain, template]) => `
## ${domain.replace(/_/g, ' ').toUpperCase()}

### Best Practices
${template.best_practices
  .map(
    bp => `
#### ${bp.name}
- **ID:** ${bp.id}
- **Description:** ${bp.description}

<details>
<summary>ADR Template</summary>

\`\`\`markdown
${bp.adr_template}
\`\`\`

</details>
`
  )
  .join('\n')}

### Anti-Patterns to Avoid
${template.anti_patterns
  .map(
    ap => `
#### ${ap.name}
- **ID:** ${ap.id}
- **Description:** ${ap.description}
- **Detection Hints:** ${ap.detection_hints.join(', ')}
- **Recommendation:** ${ap.recommendation}
`
  )
  .join('\n')}
`
      )
      .join('\n---\n');

    return {
      content: [
        {
          type: 'text',
          text: `# ADR Templates from ADR Aggregator

${templateSections}
`,
        },
      ],
    };
  } catch (error) {
    const errorMessage = error instanceof McpAdrError ? error.message : String(error);
    return {
      content: [{ type: 'text', text: `# Failed to Get Templates\n\n**Error:** ${errorMessage}` }],
      isError: true,
    };
  }
}

/**
 * Get Mermaid diagrams from aggregator (Pro+ tier)
 *
 * GET /functions/v1/mcp-get-diagrams
 */
export async function getAdrDiagrams(
  args: GetAdrDiagramsArgs,
  context?: ToolContext
): Promise<ToolResult> {
  const client = getAdrAggregatorClient();
  ensureConfigured(client);

  const config = loadConfig();
  const resolvedProjectPath = args.projectPath || config.projectPath;

  ensureGitRepo(resolvedProjectPath);

  try {
    const repositoryName = client.getRepositoryName(resolvedProjectPath);

    context?.info(`Fetching Mermaid diagrams for ${repositoryName}...`);
    context?.report_progress(30, 100);

    const request: GetDiagramsRequest = {
      repository_name: repositoryName,
      ...(args.adr_path !== undefined && { adr_path: args.adr_path }),
    };

    const response = await client.getDiagrams(request);
    context?.report_progress(100, 100);

    return {
      content: [
        {
          type: 'text',
          text: `# ADR Diagrams for ${response.repository}

${response.diagrams
  .map(
    diagram => `
## ${diagram.adr_path}
**Generated:** ${diagram.generated_at}

${
  diagram.workflow_diagram
    ? `### Workflow Diagram
\`\`\`mermaid
${diagram.workflow_diagram}
\`\`\`
`
    : ''
}

${
  diagram.relationship_diagram
    ? `### Relationship Diagram
\`\`\`mermaid
${diagram.relationship_diagram}
\`\`\`
`
    : ''
}

${
  diagram.impact_diagram
    ? `### Impact Flow Diagram
\`\`\`mermaid
${diagram.impact_diagram}
\`\`\`
`
    : ''
}
`
  )
  .join('\n---\n')}
`,
        },
      ],
    };
  } catch (error) {
    const errorMessage = error instanceof McpAdrError ? error.message : String(error);
    const tierRequired = error instanceof McpAdrError && error.details?.['tier_required'];
    return {
      content: [
        {
          type: 'text',
          text: `# Failed to Get Diagrams

**Error:** ${errorMessage}
${tierRequired ? `\n**Note:** This feature requires ${tierRequired} tier. Upgrade at /pricing` : ''}`,
        },
      ],
      isError: true,
    };
  }
}

/**
 * Validate ADR compliance via aggregator (Pro+ tier)
 *
 * POST /functions/v1/mcp-validate-compliance
 */
export async function validateAdrCompliance(
  args: ValidateAdrComplianceArgs,
  context?: ToolContext
): Promise<ToolResult> {
  const client = getAdrAggregatorClient();
  ensureConfigured(client);

  const config = loadConfig();
  const resolvedProjectPath = args.projectPath || config.projectPath;

  ensureGitRepo(resolvedProjectPath);

  try {
    const repositoryName = client.getRepositoryName(resolvedProjectPath);

    context?.info(`Validating ADR compliance for ${repositoryName}...`);
    context?.report_progress(30, 100);

    const request: ValidateComplianceRequest = {
      repository_name: repositoryName,
      validation_type: args.validation_type ?? 'all',
      ...(args.adr_paths !== undefined && { adr_paths: args.adr_paths }),
    };

    const response = await client.validateCompliance(request);
    context?.report_progress(100, 100);

    return {
      content: [
        {
          type: 'text',
          text: `# ADR Compliance Validation Results

## Repository: ${response.repository}

${response.validation_results
  .map(
    result => `
## ${result.adr_path}

| Metric | Value |
|--------|-------|
| Compliance Score | **${result.compliance_score}%** |
| Status | ${result.status === 'compliant' ? '✅' : result.status === 'partial' ? '⚠️' : '❌'} ${result.status} |
| Files Validated | ${result.linked_files_validated} |

### Findings
${result.findings.map(f => `- ${f.type === 'success' ? '✅' : f.type === 'warning' ? '⚠️' : '❌'} ${f.description}`).join('\n')}

### Recommendations
${result.recommendations.map(r => `- ${r}`).join('\n')}
`
  )
  .join('\n---\n')}
`,
        },
      ],
    };
  } catch (error) {
    const errorMessage = error instanceof McpAdrError ? error.message : String(error);
    const tierRequired = error instanceof McpAdrError && error.details?.['tier_required'];
    return {
      content: [
        {
          type: 'text',
          text: `# Failed to Validate Compliance

**Error:** ${errorMessage}
${tierRequired ? `\n**Note:** This feature requires ${tierRequired} tier. Upgrade at /pricing` : ''}`,
        },
      ],
      isError: true,
    };
  }
}

/**
 * Get knowledge graph from aggregator (Team tier)
 *
 * GET /functions/v1/mcp-get-knowledge-graph
 */
export async function getKnowledgeGraph(
  args: GetKnowledgeGraphArgs,
  context?: ToolContext
): Promise<ToolResult> {
  const client = getAdrAggregatorClient();
  ensureConfigured(client);

  try {
    const request: GetKnowledgeGraphRequest = {
      scope: args.scope ?? 'repository',
      include_analytics: args.include_analytics ?? true,
    };

    // Only need repository name for repository scope
    if (args.scope !== 'organization') {
      const config = loadConfig();
      const resolvedProjectPath = args.projectPath || config.projectPath;
      ensureGitRepo(resolvedProjectPath);
      request.repository_name = client.getRepositoryName(resolvedProjectPath);
    }

    context?.info(`Fetching knowledge graph (scope: ${request.scope})...`);
    context?.report_progress(30, 100);

    const response = await client.getKnowledgeGraph(request);
    context?.report_progress(100, 100);

    return {
      content: [
        {
          type: 'text',
          text: `# Knowledge Graph

${response.organization_id ? `**Organization:** ${response.organization_id}` : ''}
${response.repository ? `**Repository:** ${response.repository}` : ''}
${response.total_repositories ? `**Total Repositories:** ${response.total_repositories}` : ''}

## Graph Statistics
- **Nodes:** ${response.graph.nodes.length}
- **Relationships:** ${response.graph.relationships.length}

${
  response.graph.cross_repo_patterns && response.graph.cross_repo_patterns.length > 0
    ? `## Cross-Repository Patterns
${response.graph.cross_repo_patterns
  .map(
    p => `
### ${p.pattern}
- **Repositories:** ${p.repositories.join(', ')}
- **ADR Count:** ${p.adr_count}
`
  )
  .join('\n')}`
    : ''
}

${
  response.insights
    ? `## Insights

### Most Connected ADRs
${response.insights.most_connected_adrs.map(a => `- ${a}`).join('\n')}

### Orphan Decisions (No Links)
${response.insights.orphan_decisions.length > 0 ? response.insights.orphan_decisions.map(d => `- ${d}`).join('\n') : '- None detected'}

### Pattern Trends
${response.insights.pattern_trends.map(t => `- ${t.pattern}: ${t.trend} (${t.count})`).join('\n')}`
    : ''
}
`,
        },
      ],
    };
  } catch (error) {
    const errorMessage = error instanceof McpAdrError ? error.message : String(error);
    const tierRequired = error instanceof McpAdrError && error.details?.['tier_required'];
    return {
      content: [
        {
          type: 'text',
          text: `# Failed to Get Knowledge Graph

**Error:** ${errorMessage}
${tierRequired ? `\n**Note:** This feature requires ${tierRequired} tier. Upgrade at /pricing` : ''}`,
        },
      ],
      isError: true,
    };
  }
}

/**
 * Arguments for update_implementation_status tool (Pro+ tier)
 */
export interface UpdateImplementationStatusArgs {
  /** Array of status updates to apply */
  updates: Array<{
    /** Path to the ADR file relative to project root */
    adr_path: string;
    /** New implementation status */
    implementation_status: ImplementationStatus;
    /** Optional notes about the status change */
    notes?: string;
  }>;
  /** Project path (defaults to PROJECT_PATH) */
  projectPath?: string;
}

/**
 * Update implementation status of synced ADRs (Pro+ tier)
 *
 * POST /functions/v1/mcp-update-implementation-status
 */
export async function updateAdrImplementationStatus(
  args: UpdateImplementationStatusArgs,
  context?: ToolContext
): Promise<ToolResult> {
  const client = getAdrAggregatorClient();
  ensureConfigured(client);

  const config = loadConfig();
  const resolvedProjectPath = args.projectPath || config.projectPath;

  ensureGitRepo(resolvedProjectPath);

  try {
    const repositoryName = client.getRepositoryName(resolvedProjectPath);

    context?.info(`Updating implementation status for ${repositoryName}...`);
    context?.report_progress(30, 100);

    // Validate updates array
    if (!args.updates || args.updates.length === 0) {
      return {
        content: [
          {
            type: 'text',
            text: `# Update Implementation Status

**Error:** No updates provided. Please specify at least one ADR path and status to update.

## Example Usage
\`\`\`json
{
  "updates": [
    {
      "adr_path": "docs/adrs/001-use-typescript.md",
      "implementation_status": "implemented",
      "notes": "Completed migration"
    }
  ]
}
\`\`\`

**Valid Status Values:**
- \`not_started\` - Implementation has not begun
- \`in_progress\` - Implementation is underway
- \`implemented\` - Decision has been fully implemented
- \`deprecated\` - Decision is no longer relevant
- \`blocked\` - Implementation is blocked`,
          },
        ],
        isError: true,
      };
    }

    const request: UpdateImplementationStatusRequest = {
      repository_name: repositoryName,
      updates: args.updates,
    };

    const response = await client.updateImplementationStatus(request);
    context?.report_progress(100, 100);
    context?.info(`Updated ${response.updated_count} ADR status(es) successfully`);

    return {
      content: [
        {
          type: 'text',
          text: `# ADR Implementation Status Updated

## Summary
- **Repository:** ${response.repository}
- **Updates Applied:** ${response.updated_count}
- **Timestamp:** ${response.timestamp}
${response.tier ? `- **Tier:** ${response.tier}` : ''}

## Updated ADRs
${args.updates.map(u => `- **${u.adr_path}**: ${u.implementation_status}${u.notes ? ` (${u.notes})` : ''}`).join('\n')}

${
  response.errors && response.errors.length > 0
    ? `## Errors
${response.errors.map(e => `- ${e.code}: ${e.message}`).join('\n')}`
    : ''
}

View in dashboard: ${client.getBaseUrl()}/mcp-dashboard`,
        },
      ],
    };
  } catch (error) {
    const errorMessage = error instanceof McpAdrError ? error.message : String(error);
    const tierRequired = error instanceof McpAdrError && error.details?.['tier_required'];
    return {
      content: [
        {
          type: 'text',
          text: `# Failed to Update Implementation Status

**Error:** ${errorMessage}
${tierRequired ? `\n**Note:** This feature requires ${tierRequired} tier. Upgrade at /pricing` : ''}

## Troubleshooting
1. Ensure ADR_AGGREGATOR_API_KEY is set correctly
2. Verify you have Pro+ tier subscription
3. Check that the ADR paths are valid and synced`,
        },
      ],
      isError: true,
    };
  }
}

/**
 * Arguments for get_adr_priorities tool
 */
export interface GetAdrPrioritiesArgs {
  /** Include AI-based priority recommendations */
  include_ai?: boolean;
  /** Project path (defaults to PROJECT_PATH) */
  projectPath?: string;
}

/**
 * Get ADR priorities for roadmap/backlog planning
 *
 * GET /functions/v1/mcp-get-priorities
 */
export async function getAdrPriorities(
  args: GetAdrPrioritiesArgs,
  context?: ToolContext
): Promise<ToolResult> {
  const client = getAdrAggregatorClient();
  ensureConfigured(client);

  const config = loadConfig();
  const resolvedProjectPath = args.projectPath || config.projectPath;

  ensureGitRepo(resolvedProjectPath);

  try {
    const repositoryName = client.getRepositoryName(resolvedProjectPath);

    context?.info(`Fetching ADR priorities for ${repositoryName}...`);
    context?.report_progress(30, 100);

    const request: GetPrioritiesRequest = {
      repository_name: repositoryName,
      ...(args.include_ai !== undefined && { include_ai: args.include_ai }),
    };

    const response = await client.getPriorities(request);
    context?.report_progress(100, 100);

    // Sort priorities by score (highest first)
    const sortedPriorities = [...response.priorities].sort(
      (a, b) => b.priority_score - a.priority_score
    );

    return {
      content: [
        {
          type: 'text',
          text: `# ADR Priorities for ${response.repository}

## Summary
- **Total ADRs:** ${response.summary.total_adrs}
- **Implemented:** ${response.summary.implemented}
- **In Progress:** ${response.summary.in_progress}
- **Not Started:** ${response.summary.not_started}
- **Blocked:** ${response.summary.blocked}
- **Total Gaps:** ${response.summary.total_gaps}
${response.tier ? `- **Tier:** ${response.tier}` : ''}

---

## Prioritized Roadmap

${
  sortedPriorities.length > 0
    ? sortedPriorities
        .map(
          (p, index) => `
### ${index + 1}. ${p.title}
- **Path:** ${p.adr_path}
- **Priority Score:** ${p.priority_score}/100 ${p.ai_prioritized ? '(AI)' : ''}
- **Status:** ${p.implementation_status === 'implemented' ? '✅' : p.implementation_status === 'in_progress' ? '🔄' : p.implementation_status === 'blocked' ? '🚫' : '⏳'} ${p.implementation_status}
- **Dependencies:** ${p.dependencies.length > 0 ? p.dependencies.join(', ') : 'None'}
- **Blockers:** ${p.blockers.length > 0 ? p.blockers.join(', ') : 'None'}
- **Gap Count:** ${p.gap_count}
`
        )
        .join('\n')
    : '*No ADRs found in this repository*'
}

---

## Recommendations

${
  sortedPriorities.length === 0
    ? 'Sync ADRs to the aggregator first using `sync_to_aggregator` to get priority analysis.'
    : `
### High Priority Items
${
  sortedPriorities
    .filter(p => p.priority_score >= 70 && p.implementation_status !== 'implemented')
    .map(
      p =>
        `- **${p.title}** (Score: ${p.priority_score}) - ${p.blockers.length > 0 ? 'Blocked by: ' + p.blockers.join(', ') : 'Ready to implement'}`
    )
    .join('\n') || '- No high-priority items pending'
}

### Blocked Items
${
  sortedPriorities
    .filter(p => p.implementation_status === 'blocked' || p.blockers.length > 0)
    .map(p => `- **${p.title}** blocked by: ${p.blockers.join(', ')}`)
    .join('\n') || '- No blocked items'
}

### Items with Gaps
${
  sortedPriorities
    .filter(p => p.gap_count > 0)
    .map(p => `- **${p.title}** has ${p.gap_count} gap(s) to address`)
    .join('\n') || '- No items with gaps'
}
`
}

---

*Priority analysis performed at ${new Date().toISOString()}*
View in dashboard: ${client.getBaseUrl()}/mcp-dashboard`,
        },
      ],
    };
  } catch (error) {
    const errorMessage = error instanceof McpAdrError ? error.message : String(error);
    const tierRequired = error instanceof McpAdrError && error.details?.['tier_required'];
    return {
      content: [
        {
          type: 'text',
          text: `# Failed to Get ADR Priorities

**Error:** ${errorMessage}
${tierRequired ? `\n**Note:** This feature requires ${tierRequired} tier. Upgrade at /pricing` : ''}

## Troubleshooting
1. Ensure ADR_AGGREGATOR_API_KEY is set correctly
2. Verify you have an active internet connection
3. Check that ADRs have been synced to the aggregator`,
        },
      ],
      isError: true,
    };
  }
}
