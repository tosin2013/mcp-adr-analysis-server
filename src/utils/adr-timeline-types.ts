/**
 * ADR Timeline Types
 *
 * Type definitions for ADR timeline tracking and analysis
 */

/**
 * Basic timeline information for an ADR
 * Extracted automatically from git history, content, or filesystem
 */
export interface BasicTimeline {
  /** When the ADR was created (ISO timestamp) */
  created_at: string;
  /** When the ADR was last updated (ISO timestamp) */
  updated_at: string;
  /** Age of the ADR in days */
  age_days: number;
  /** Days since last update */
  days_since_update: number;
  /** Staleness warnings based on basic timeline analysis */
  staleness_warnings: string[];
  /** How the timeline was extracted */
  extraction_method: 'git' | 'content' | 'filesystem';
  /** Whether extraction was skipped due to smart detection */
  extraction_skipped?: boolean;
  /** Reason extraction was skipped (if applicable) */
  skip_reason?: string;
}

/**
 * Extended timeline with status history and implementation tracking
 * Only extracted when explicitly requested (expensive operations)
 */
export interface ExtendedTimeline extends BasicTimeline {
  /** History of status changes */
  status_history: StatusChangeRecord[];
  /** Implementation timeline and lag analysis */
  implementation_timeline?: ImplementationTimeline;
  /** Full audit trail for compliance */
  compliance_audit_trail?: AuditTrail;
}

/**
 * Record of a status change in an ADR
 */
export interface StatusChangeRecord {
  /** The status (Proposed, Accepted, Deprecated, etc.) */
  status: string;
  /** When the status changed (ISO timestamp) */
  changed_at: string;
  /** Git commit hash where change occurred */
  commit_hash?: string;
  /** Git commit message */
  commit_message?: string;
  /** Confidence in this detection (0-1) */
  confidence: number;
}

/**
 * Timeline of ADR implementation in code
 */
export interface ImplementationTimeline {
  /** When the ADR was created */
  adr_created: string;
  /** When first related code was committed */
  first_implementation?: string;
  /** When most recent related code was committed */
  latest_implementation?: string;
  /** Days from ADR creation to first implementation */
  days_to_implement?: number;
  /** Whether any implementation has been detected */
  is_implemented: boolean;
  /** Keywords used to detect implementation */
  search_keywords: string[];
  /** Files that appear to implement this ADR */
  related_files: string[];
  /** Total commits related to this ADR */
  commit_count: number;
}

/**
 * Full audit trail for compliance purposes
 */
export interface AuditTrail {
  /** ADR file path */
  adr_path: string;
  /** Full timeline of all changes */
  changes: Array<{
    timestamp: string;
    type: 'created' | 'content_modified' | 'status_changed' | 'implementation';
    description: string;
    commit_hash?: string;
    author?: string;
  }>;
  /** When this audit trail was generated */
  generated_at: string;
}

/**
 * Project context for adaptive threshold selection
 */
export interface ProjectContext {
  /** Project development phase */
  phase: 'startup' | 'growth' | 'mature' | 'maintenance';
  /** Current activity level */
  activityLevel: 'very_active' | 'active' | 'moderate' | 'low';
  /** Team velocity metrics */
  teamVelocity: {
    avgCommitsPerWeek: number;
    avgAdrCreationRate: number;
    avgTimeToImplement: number;
  };
  /** Deployment cadence */
  deploymentCadence: 'daily' | 'weekly' | 'biweekly' | 'monthly' | 'quarterly';
  /** ADR pattern characteristics */
  adrCharacteristics: {
    avgAdrAge: number;
    proposedToAcceptedAvg: number;
    acceptedToImplementedAvg: number;
  };
}

/**
 * Threshold configuration for action item generation
 */
export interface ThresholdProfile {
  /** Profile name */
  name: string;
  /** Profile description */
  description: string;
  /** Days before flagging stale Proposed ADRs */
  staleProposedDays: number;
  /** Days before flagging unimplemented Accepted ADRs */
  acceptedUnimplementedDays: number;
  /** Days before flagging outdated ADR documentation */
  outdatedAdrDays: number;
  /** Days before flagging dormant ADRs */
  dormantAdrDays: number;
  /** Days to flag rapid/unstable changes */
  rapidChangeDays: number;
  /** Days to warn about slow implementation */
  implementationLagWarning: number;
}

/**
 * Actionable work item generated from timeline analysis
 */
export interface AdrActionItem {
  /** The ADR this action applies to */
  adrFilename: string;
  adrTitle: string;
  adrStatus: string;
  /** Action priority level */
  priority: 'critical' | 'high' | 'medium' | 'low';
  /** Urgency score (0-100) */
  urgencyScore: number;
  /** Type of action needed */
  actionType: 'review' | 'implement' | 'update' | 'close' | 'deprecate';
  /** Human-readable action description */
  actionDescription: string;
  /** Why this action is needed */
  rationale: string;
  /** Estimated effort */
  estimatedEffort: 'low' | 'medium' | 'high';
  /** Suggested completion date */
  dueDate?: string;
  /** Potential blockers */
  blockers: string[];
  /** Timeline data that triggered this action */
  timeline: BasicTimeline;
}

/**
 * Work queue organized by priority
 */
export interface AdrWorkQueue {
  /** Critical priority actions */
  critical: AdrActionItem[];
  /** High priority actions */
  high: AdrActionItem[];
  /** Medium priority actions */
  medium: AdrActionItem[];
  /** Low priority actions */
  low: AdrActionItem[];
  /** Summary statistics */
  summary: {
    totalActions: number;
    criticalCount: number;
    estimatedHours: number;
  };
}

/**
 * ADR type for applying specific modifiers
 */
export type AdrType = 'infrastructure' | 'feature' | 'security' | 'refactoring';

/**
 * Modifiers to apply to thresholds based on ADR type
 */
export interface AdrTypeModifiers {
  infrastructure: number;
  feature: number;
  security: number;
  refactoring: number;
}

/**
 * Options for timeline extraction
 */
export interface TimelineExtractionOptions {
  /** Use caching for timeline data */
  useCache?: boolean;
  /** Cache TTL in seconds */
  cacheTTL?: number;
  /** Force extraction even if not needed */
  forceExtract?: boolean;
  /** Include extended timeline data */
  includeExtended?: boolean;
  /** Analyze implementation lag */
  analyzeImplementation?: boolean;
}

/**
 * Options for ADR discovery with timeline
 */
export interface DiscoverAdrsWithTimelineOptions {
  /** Include ADR content */
  includeContent?: boolean;
  /** Include timeline analysis */
  includeTimeline?: boolean;
  /** Timeline extraction options */
  timelineOptions?: TimelineExtractionOptions;
  /** Auto-detect project context */
  autoDetectContext?: boolean;
  /** Manual threshold profile override */
  thresholdProfile?: string;
  /** Custom threshold values */
  customThresholds?: Partial<ThresholdProfile>;
  /** Use ADR type modifiers */
  useAdrTypeModifiers?: boolean;
  /** Show context detection reasoning */
  showContextDetection?: boolean;
  /** Generate action items */
  generateActions?: boolean;
}
