/**
 * ADR Aggregator API Types
 * Type definitions for bidirectional sync with https://adraggregator.com
 *
 * @see NEW_FEATURE.md for API documentation
 */

// ============================================================================
// Common Types
// ============================================================================

/**
 * ADR Aggregator subscription tier
 */
export type AggregatorTier = 'free' | 'pro' | 'team';

/**
 * API error response from ADR Aggregator
 */
export interface AggregatorError {
  code: string;
  message: string;
  tier_required?: AggregatorTier;
}

/**
 * Repository identification for API requests
 */
export interface RepositoryIdentifier {
  /** Repository name in format "owner/repo" - auto-detected from git remote */
  repository_name: string;
  /** Optional branch name */
  branch?: string;
}

// ============================================================================
// Sync Types (POST /mcp-sync-adr)
// ============================================================================

/**
 * Request payload for syncing ADRs to the aggregator
 */
export interface SyncAdrRequest extends RepositoryIdentifier {
  /** Array of ADRs to sync */
  adrs: SyncAdrPayload[];
  /** If true, replace all ADRs instead of incremental sync */
  full_sync?: boolean;
  /** Include analysis metadata in sync */
  include_metadata?: boolean;
}

/**
 * Individual ADR payload for sync
 */
export interface SyncAdrPayload {
  /** File path relative to project root */
  path: string;
  /** ADR title */
  title: string;
  /** ADR status */
  status: 'proposed' | 'accepted' | 'deprecated' | 'superseded';
  /** Full markdown content */
  content: string;
  /** Optional analysis metadata */
  analysis_metadata?: AnalysisMetadata;
}

/**
 * Analysis metadata attached to synced ADRs
 */
export interface AnalysisMetadata {
  /** Timeline and staleness information */
  timeline?: TimelineMetadata;
  /** Security scan results */
  security_scan?: SecurityScanMetadata;
  /** Code linking information */
  code_linking?: CodeLinkingMetadata;
  /** Generated Mermaid diagrams */
  mermaid_diagrams?: MermaidDiagramsMetadata;
  /** Deployment pattern detection */
  deployment_pattern?: DeploymentPatternMetadata;
  /** Research context */
  research?: ResearchMetadata;
  /** Detected architectural patterns */
  patterns_detected?: string[];
  /** Confidence score of analysis (0-1) */
  confidence_score?: number;
  /** Related source files */
  related_files?: string[];
  /** Timestamp of last analysis */
  last_analyzed?: string;
}

/**
 * Timeline and staleness metadata
 */
export interface TimelineMetadata {
  created: { date: string; source: string; author?: string };
  last_modified: { date: string; source: string; author?: string };
  staleness: 'fresh' | 'recent' | 'stale' | 'very_stale';
  staleness_score: number;
  days_since_modified: number;
  review_recommended: boolean;
  related_code_changes?: number;
  action_items?: ActionItem[];
  evolution?: EvolutionEvent[];
}

export interface ActionItem {
  priority: 'low' | 'medium' | 'high' | 'critical';
  action: string;
  reason: string;
}

export interface EvolutionEvent {
  date: string;
  event: 'created' | 'status_change' | 'modified';
  status?: string;
  change_summary?: string;
}

/**
 * Security scan metadata
 */
export interface SecurityScanMetadata {
  has_sensitive_content: boolean;
  masked_sections: MaskedSection[];
  risk_level: 'low' | 'medium' | 'high' | 'critical';
  risk_score: number;
  recommendations: string[];
}

export interface MaskedSection {
  type: string;
  original_location: { line: number; column: number };
  masking_strategy: 'full_redaction' | 'partial';
  placeholder: string;
}

/**
 * Code linking metadata
 */
export interface CodeLinkingMetadata {
  method: 'ast_analysis' | 'keyword_matching' | 'manual';
  language?: string;
  linked_files: LinkedFile[];
  keywords_used: string[];
  unlinked_mentions?: UnlinkedMention[];
}

export interface LinkedFile {
  path: string;
  confidence: number;
  match_type: string;
  lines_analyzed?: number;
  relevant_sections?: { start_line: number; end_line: number; description: string }[];
}

export interface UnlinkedMention {
  file: string;
  reason: string;
}

/**
 * Mermaid diagrams metadata
 */
export interface MermaidDiagramsMetadata {
  workflow?: string;
  relationships?: string;
  impact_flow?: string;
}

/**
 * Deployment pattern metadata
 */
export interface DeploymentPatternMetadata {
  detected_platform: string;
  confidence: number;
  detection_evidence: string[];
  pattern_id: string;
  authoritative_sources: AuthoritativeSource[];
  deployment_phases: DeploymentPhase[];
}

export interface AuthoritativeSource {
  url: string;
  title: string;
  priority: number;
}

export interface DeploymentPhase {
  order: number;
  name: string;
  commands: string[];
  validation: string;
}

/**
 * Research metadata
 */
export interface ResearchMetadata {
  questions_investigated: string[];
  sources_consulted: ResearchSource[];
  alternatives_considered: AlternativeOption[];
  research_date: string;
}

export interface ResearchSource {
  url: string;
  title: string;
  relevance_score: number;
  key_insights?: string[];
}

export interface AlternativeOption {
  option: string;
  pros: string[];
  cons: string[];
  rejected_reason: string;
}

/**
 * Response from sync endpoint
 */
export interface SyncAdrResponse {
  success: boolean;
  repository: string;
  synced_count: number;
  errors?: AggregatorError[];
  sync_id: string;
  timestamp: string;
  tier?: AggregatorTier;
  limits?: {
    maxRepos: string;
    maxADRsPerRepo: string;
  };
  truncated?: boolean;
  truncated_count?: number;
}

// ============================================================================
// Get Context Types (GET /mcp-get-context)
// ============================================================================

/**
 * Request for getting ADR context
 */
export interface GetContextRequest extends RepositoryIdentifier {
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
  /** Include full ADR content */
  include_content?: boolean;
  /** Include relationships */
  include_relationships?: boolean;
  /** Include summary */
  include_summary?: boolean;
  /** Maximum ADRs to return */
  max_adrs?: number;
}

/**
 * Response from get context endpoint
 */
export interface GetContextResponse {
  repository: string;
  adrs: AdrContext[];
  summary: {
    total_adrs: number;
    by_status: Record<string, number>;
    average_staleness: number;
  };
  adr_count?: number;
  last_synced?: string;
  tier?: AggregatorTier;
  limits?: {
    maxADRs: number;
    includeFullContent: boolean;
    advancedAnalysis: boolean;
  };
}

/**
 * Individual ADR context data
 */
export interface AdrContext {
  id?: string;
  path: string;
  title: string;
  status: string;
  summary?: string;
  timeline?: TimelineMetadata;
  diagrams?: MermaidDiagramsMetadata;
  code_links?: CodeLinkingMetadata;
  research?: ResearchMetadata;
  relationships?: Array<{ type: string; target: string }>;
  content?: string;
  synced_at?: string;
}

// ============================================================================
// Staleness Report Types (GET /mcp-staleness-report)
// ============================================================================

/**
 * Request for staleness report
 */
export interface GetStalenessReportRequest extends RepositoryIdentifier {
  /** Days threshold for considering ADR stale */
  threshold?: number;
}

/**
 * Response from staleness report endpoint
 */
export interface GetStalenessReportResponse {
  repository: string;
  report_date: string;
  summary: {
    total_adrs: number;
    fresh: number;
    recent: number;
    stale: number;
    very_stale: number;
  };
  stale_adrs: StaleAdr[];
  governance: {
    review_cycle_compliance: number;
    overdue_reviews: number;
  };
}

/**
 * Stale ADR details
 */
export interface StaleAdr {
  path: string;
  title: string;
  days_since_modified: number;
  staleness: string;
  recommended_action: string;
}

// ============================================================================
// Get Templates Types (GET /mcp-get-templates)
// ============================================================================

/**
 * Request for ADR templates
 */
export interface GetTemplatesRequest {
  /** Filter by domain (web_application, microservices, api, etc.) */
  domain?: string;
}

/**
 * Response from templates endpoint
 */
export interface GetTemplatesResponse {
  templates: Record<string, DomainTemplate>;
}

/**
 * Domain-specific template with best practices and anti-patterns
 */
export interface DomainTemplate {
  best_practices: BestPractice[];
  anti_patterns: AntiPattern[];
}

export interface BestPractice {
  id: string;
  name: string;
  description: string;
  adr_template: string;
}

export interface AntiPattern {
  id: string;
  name: string;
  description: string;
  detection_hints: string[];
  recommendation: string;
}

// ============================================================================
// Get Diagrams Types (GET /mcp-get-diagrams) - Pro+ Tier
// ============================================================================

/**
 * Request for Mermaid diagrams
 */
export interface GetDiagramsRequest extends RepositoryIdentifier {
  /** Optional specific ADR path */
  adr_path?: string;
}

/**
 * Response from diagrams endpoint
 */
export interface GetDiagramsResponse {
  repository: string;
  diagrams: AdrDiagram[];
}

/**
 * Diagrams for a single ADR
 */
export interface AdrDiagram {
  adr_path: string;
  workflow_diagram?: string;
  relationship_diagram?: string;
  impact_diagram?: string;
  generated_at: string;
}

// ============================================================================
// Validate Compliance Types (POST /mcp-validate-compliance) - Pro+ Tier
// ============================================================================

/**
 * Request for ADR compliance validation
 */
export interface ValidateComplianceRequest extends RepositoryIdentifier {
  /** Specific ADR paths to validate */
  adr_paths?: string[];
  /** Type of validation to perform */
  validation_type?: 'implementation' | 'architecture' | 'security' | 'all';
}

/**
 * Response from compliance validation endpoint
 */
export interface ValidateComplianceResponse {
  repository: string;
  validation_results: ComplianceResult[];
}

/**
 * Compliance validation result for a single ADR
 */
export interface ComplianceResult {
  adr_path: string;
  compliance_score: number;
  status: 'compliant' | 'partial' | 'non_compliant';
  findings: ComplianceFinding[];
  linked_files_validated: number;
  recommendations: string[];
}

export interface ComplianceFinding {
  type: 'success' | 'warning' | 'error';
  description: string;
  severity?: 'low' | 'medium' | 'high' | 'critical';
}

// ============================================================================
// Get Knowledge Graph Types (GET /mcp-get-knowledge-graph) - Team Tier
// ============================================================================

/**
 * Request for knowledge graph
 */
export interface GetKnowledgeGraphRequest {
  /** Scope of the graph */
  scope?: 'repository' | 'organization';
  /** Optional repository filter when scope is organization */
  repository_name?: string;
  /** Include analytics and insights */
  include_analytics?: boolean;
}

/**
 * Response from knowledge graph endpoint
 */
export interface GetKnowledgeGraphResponse {
  organization_id?: string;
  repository?: string;
  total_repositories?: number;
  graph: {
    nodes: KnowledgeGraphNode[];
    relationships: KnowledgeGraphRelationship[];
    cross_repo_patterns?: CrossRepoPattern[];
  };
  insights?: {
    most_connected_adrs: string[];
    orphan_decisions: string[];
    pattern_trends: PatternTrend[];
  };
}

/**
 * Node in the knowledge graph
 */
export interface KnowledgeGraphNode {
  id: string;
  type: 'decision' | 'code' | 'pattern' | 'technology';
  title?: string;
  path?: string;
  status?: string;
  technologies?: string[];
  name?: string;
  language?: string;
}

/**
 * Relationship between nodes in the knowledge graph
 */
export interface KnowledgeGraphRelationship {
  source: string;
  target: string;
  type: 'implements' | 'depends_on' | 'supersedes' | 'applies' | 'conflicts_with';
  confidence?: number;
}

/**
 * Cross-repository pattern
 */
export interface CrossRepoPattern {
  pattern: string;
  repositories: string[];
  adr_count: number;
}

/**
 * Pattern trend over time
 */
export interface PatternTrend {
  pattern: string;
  trend: 'increasing' | 'stable' | 'decreasing';
  count: number;
}

// ============================================================================
// Report Code Gaps Types (POST /mcp-report-code-gaps)
// ============================================================================

/**
 * Gap type indicating direction of the gap
 */
export type GapType = 'adr_to_code' | 'code_to_adr';

/**
 * Gap severity level
 */
export type GapSeverity = 'error' | 'warning' | 'info';

/**
 * Individual gap item
 *
 * @see API: POST /functions/v1/mcp-report-code-gaps
 */
export interface CodeGap {
  /** Direction of the gap */
  gap_type: GapType;
  /** Severity level */
  severity: GapSeverity;
  /** Human-readable title */
  title: string;
  /** ADR path (for adr_to_code gaps) */
  adr_path?: string;
  /** Referenced file that doesn't exist (for adr_to_code gaps) */
  referenced_file?: string;
  /** Code pattern detected (for code_to_adr gaps) - free-form string, e.g., "ioredis client usage" */
  detected_pattern?: string;
  /** Code files where the pattern was detected (for code_to_adr gaps) */
  code_files?: string[];
  /** Suggested ADR title (for code_to_adr gaps) */
  suggested_adr_title?: string;
  /** Additional context or description */
  description?: string;
}

/**
 * Analysis summary statistics
 */
export interface GapAnalysisSummary {
  /** Number of files scanned */
  files_scanned: number;
  /** Number of ADRs checked */
  adrs_checked: number;
  /** Technologies detected in the codebase */
  technologies_detected: string[];
  /** Architectural patterns detected */
  patterns_detected?: string[];
}

/**
 * Request payload for reporting code gaps
 */
export interface ReportCodeGapsRequest extends RepositoryIdentifier {
  /** ISO timestamp of when analysis was performed */
  analyzed_at: string;
  /** Array of detected gaps */
  gaps: CodeGap[];
  /** Analysis summary */
  analysis_summary: GapAnalysisSummary;
}

/**
 * Response from report code gaps endpoint
 *
 * @see API: POST /functions/v1/mcp-report-code-gaps
 */
export interface ReportCodeGapsResponse {
  success: boolean;
  repository_name: string;
  summary: {
    gaps_inserted: number;
    gaps_updated: number;
    total_open_gaps: number;
    adr_to_code_issues: number;
    code_to_adr_gaps: number;
    files_scanned: number;
    adrs_checked: number;
    technologies_detected: string[];
  };
  /** Any errors during processing */
  errors?: AggregatorError[];
}

/**
 * Request for getting current gaps
 */
export interface GetCodeGapsRequest extends RepositoryIdentifier {
  /** Filter by gap type */
  gap_type?: GapType;
  /** Filter by severity */
  severity?: GapSeverity;
  /** Include dismissed gaps */
  include_dismissed?: boolean;
  /** Include resolved gaps */
  include_resolved?: boolean;
}

/**
 * Gap with status information
 */
export interface CodeGapWithStatus extends CodeGap {
  /** Unique gap ID */
  id: string;
  /** Current status */
  status: 'open' | 'dismissed' | 'resolved';
  /** When the gap was first detected */
  first_detected: string;
  /** When the gap was last seen */
  last_seen: string;
  /** Who dismissed/resolved it (if applicable) */
  resolved_by?: string;
  /** Resolution notes */
  resolution_notes?: string;
}

/**
 * Response from get code gaps endpoint
 */
export interface GetCodeGapsResponse {
  repository: string;
  gaps: CodeGapWithStatus[];
  summary: {
    total: number;
    by_type: Record<GapType, number>;
    by_severity: Record<GapSeverity, number>;
    by_status: Record<string, number>;
  };
}
