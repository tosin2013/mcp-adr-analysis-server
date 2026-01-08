/**
 * Core TypeScript interfaces for MCP ADR Analysis Server
 * Based on shrimp-rules.md requirements
 */

import { z } from 'zod';

// ============================================================================
// ADR (Architectural Decision Record) Types
// ============================================================================

/**
 * Architectural Decision Record (ADR) interface
 * Represents a documented architectural decision with context and consequences
 */
export interface Adr {
  /** Unique identifier for the ADR */
  id: string;
  /** Title of the architectural decision */
  title: string;
  /** Current status of the decision */
  status: 'proposed' | 'accepted' | 'deprecated' | 'superseded';
  /** Date when the decision was made */
  date: string;
  /** Context and background for the decision */
  context: string;
  /** The architectural decision that was made */
  decision: string;
  /** Consequences and implications of the decision */
  consequences: string;
  /** Optional implementation plan */
  implementationPlan?: string;
  /** File path where the ADR is stored */
  filePath: string;
  /** Optional tags for categorization */
  tags?: string[];
  /** IDs of related ADRs */
  relatedAdrs?: string[];
}

export const AdrSchema = z.object({
  id: z.string(),
  title: z.string(),
  status: z.enum(['proposed', 'accepted', 'deprecated', 'superseded']),
  date: z.string(),
  context: z.string(),
  decision: z.string(),
  consequences: z.string(),
  implementationPlan: z.string().optional(),
  filePath: z.string(),
  tags: z.array(z.string()).optional(),
  relatedAdrs: z.array(z.string()).optional(),
});

// ============================================================================
// Technology Detection Types
// ============================================================================

/**
 * Represents a technology detected in the project
 */
export interface DetectedTechnology {
  /** Name of the detected technology */
  name: string;
  /** Category of the technology */
  category: 'framework' | 'library' | 'database' | 'cloud' | 'devops' | 'language' | 'tool';
  /** Version of the technology (if detected) */
  version?: string;
  /** Confidence level of detection (0-1 scale) */
  confidence: number;
  /** Evidence supporting the detection */
  evidence: string[];
  /** File paths where the technology was detected */
  filePaths: string[];
  description?: string;
}

export const DetectedTechnologySchema = z.object({
  name: z.string(),
  category: z.enum(['framework', 'library', 'database', 'cloud', 'devops', 'language', 'tool']),
  version: z.string().optional(),
  confidence: z.number().min(0).max(1),
  evidence: z.array(z.string()),
  filePaths: z.array(z.string()),
  description: z.string().optional(),
});

// ============================================================================
// Pattern Detection Types
// ============================================================================

/**
 * Represents an architectural pattern detected in the project
 */
export interface DetectedPattern {
  /** Name of the detected pattern */
  name: string;
  /** Type/category of the pattern */
  type: 'architectural' | 'structural' | 'organizational' | 'communication' | 'testing' | 'data';
  /** Confidence level of detection (0-1 scale) */
  confidence: number;
  /** Description of the pattern */
  description: string;
  /** Evidence supporting the pattern detection */
  evidence: string[];
  /** File paths where the pattern was detected */
  filePaths: string[];
  /** Whether the pattern implementation is suboptimal */
  suboptimal?: boolean;
  /** Recommendations for improvement */
  recommendations?: string[];
}

export const DetectedPatternSchema = z.object({
  name: z.string(),
  type: z.enum([
    'architectural',
    'structural',
    'organizational',
    'communication',
    'testing',
    'data',
  ]),
  confidence: z.number().min(0).max(1),
  description: z.string(),
  evidence: z.array(z.string()),
  filePaths: z.array(z.string()),
  suboptimal: z.boolean().optional(),
  recommendations: z.array(z.string()).optional(),
});

// ============================================================================
// Architectural Knowledge Graph Types
// ============================================================================

/**
 * Complete architectural knowledge graph for a project
 * Contains all architectural decisions, technologies, patterns, and their relationships
 */
export interface ArchitecturalKnowledgeGraph {
  /** Unique identifier for the project */
  projectId: string;
  /** Timestamp when the graph was generated */
  timestamp: string;
  /** All architectural decision records */
  adrs: Adr[];
  /** Detected technologies in the project */
  technologies: DetectedTechnology[];
  /** Detected architectural patterns */
  patterns: DetectedPattern[];
  /** Generated or defined rules */
  rules: Rule[];
  /** Relationships between different elements */
  relationships: Relationship[];
  /** Project metadata and statistics */
  metadata: ProjectMetadata;
}

/**
 * Represents a relationship between two architectural elements
 */
export interface Relationship {
  /** Source element ID */
  source: string;
  /** Target element ID */
  target: string;
  /** Type of relationship */
  type: 'implements' | 'depends_on' | 'conflicts_with' | 'supersedes' | 'relates_to';
  /** Strength of the relationship (0-1 scale) */
  strength: number;
  /** Optional description of the relationship */
  description?: string;
}

/**
 * Metadata about the analyzed project
 */
export interface ProjectMetadata {
  /** Project name */
  name: string;
  /** Project description */
  description?: string;
  /** Project version */
  version?: string;
  /** Timestamp of last analysis */
  lastAnalyzed: string;
  /** Version of the analysis tool used */
  analysisVersion: string;
  /** Total number of files in the project */
  fileCount: number;
  /** Total number of directories in the project */
  directoryCount: number;
}

export const ArchitecturalKnowledgeGraphSchema = z.object({
  projectId: z.string(),
  timestamp: z.string(),
  adrs: z.array(AdrSchema),
  technologies: z.array(DetectedTechnologySchema),
  patterns: z.array(DetectedPatternSchema),
  rules: z.array(z.any()), // Will be defined by RuleSchema
  relationships: z.array(
    z.object({
      source: z.string(),
      target: z.string(),
      type: z.enum(['implements', 'depends_on', 'conflicts_with', 'supersedes', 'relates_to']),
      strength: z.number().min(0).max(1),
      description: z.string().optional(),
    })
  ),
  metadata: z.object({
    name: z.string(),
    description: z.string().optional(),
    version: z.string().optional(),
    lastAnalyzed: z.string(),
    analysisVersion: z.string(),
    fileCount: z.number(),
    directoryCount: z.number(),
  }),
});

// ============================================================================
// ADR Task Types
// ============================================================================

/**
 * Represents a task derived from an ADR implementation plan
 */
export interface AdrTask {
  /** Unique identifier for the task */
  id: string;
  /** ID of the ADR this task belongs to */
  adrId: string;
  /** Title of the task */
  title: string;
  /** Detailed description of the task */
  description: string;
  /** Current status of the task */
  status: 'pending' | 'in_progress' | 'completed' | 'blocked';
  /** Priority level of the task */
  priority: 'low' | 'medium' | 'high' | 'critical';
  /** Estimated effort required */
  estimatedEffort?: string;
  /** Person assigned to the task */
  assignee?: string;
  /** Due date for task completion */
  dueDate?: string;
  /** Other tasks this task depends on */
  dependencies?: string[];
  /** Criteria for verifying task completion */
  verificationCriteria?: string;
  /** Evidence that the task has been completed */
  completionEvidence?: string[];
}

export const AdrTaskSchema = z.object({
  id: z.string(),
  adrId: z.string(),
  title: z.string(),
  description: z.string(),
  status: z.enum(['pending', 'in_progress', 'completed', 'blocked']),
  priority: z.enum(['low', 'medium', 'high', 'critical']),
  estimatedEffort: z.string().optional(),
  assignee: z.string().optional(),
  dueDate: z.string().optional(),
  dependencies: z.array(z.string()).optional(),
  verificationCriteria: z.string().optional(),
  completionEvidence: z.array(z.string()).optional(),
});

// ============================================================================
// Rule Types
// ============================================================================

/**
 * Represents a validation or analysis rule
 */
export interface Rule {
  /** Unique identifier for the rule */
  id: string;
  /** Human-readable name of the rule */
  name: string;
  /** Description of what the rule validates */
  description: string;
  /** Category of the rule */
  type: 'architectural' | 'coding' | 'security' | 'performance' | 'documentation';
  /** Severity level when rule is violated */
  severity: 'info' | 'warning' | 'error' | 'critical';
  /** Regex or glob pattern to match against */
  pattern: string;
  /** Message to display when rule is violated */
  message: string;
  /** Source of the rule definition */
  source: 'adr' | 'inferred' | 'user_defined';
  /** ID of source ADR if rule comes from an ADR */
  sourceId?: string;
  /** Whether the rule is currently enabled */
  enabled: boolean;
  /** Optional tags for categorization */
  tags?: string[];
}

export const RuleSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string(),
  type: z.enum(['architectural', 'coding', 'security', 'performance', 'documentation']),
  severity: z.enum(['info', 'warning', 'error', 'critical']),
  pattern: z.string(),
  message: z.string(),
  source: z.enum(['adr', 'inferred', 'user_defined']),
  sourceId: z.string().optional(),
  enabled: z.boolean(),
  tags: z.array(z.string()).optional(),
});

// ============================================================================
// Error Types
// ============================================================================

/**
 * Base error class for MCP ADR Analysis Server
 * Provides structured error handling with error codes and additional details
 */
export class McpAdrError extends Error {
  /** Error code for programmatic handling */
  public readonly code: string;
  /** Additional error details and context */
  public readonly details?: Record<string, unknown>;

  constructor(message: string, code: string, details?: Record<string, unknown>) {
    super(message);
    this.name = 'McpAdrError';
    this.code = code;
    if (details !== undefined) {
      this.details = details;
    }
  }
}

/**
 * Error thrown when data validation fails
 */
export class ValidationError extends McpAdrError {
  constructor(message: string, details?: Record<string, unknown>) {
    super(message, 'VALIDATION_ERROR', details);
    this.name = 'ValidationError';
  }
}

/**
 * Error thrown when file system operations fail
 */
export class FileSystemError extends McpAdrError {
  constructor(message: string, details?: Record<string, unknown>) {
    super(message, 'FILESYSTEM_ERROR', details);
    this.name = 'FileSystemError';
  }
}

/**
 * Error thrown when analysis operations fail
 */
export class AnalysisError extends McpAdrError {
  constructor(message: string, details?: Record<string, unknown>) {
    super(message, 'ANALYSIS_ERROR', details);
    this.name = 'AnalysisError';
  }
}

// ============================================================================
// Utility Types
// ============================================================================

export type ConfidenceLevel = 'low' | 'medium' | 'high';

/**
 * Generic wrapper for analysis results with metadata
 */
export interface AnalysisResult<T> {
  /** The actual analysis data */
  data: T;
  /** Confidence level of the analysis (0-1) */
  confidence: number;
  /** Timestamp when analysis was performed */
  timestamp: string;
  /** Source of the analysis */
  source: string;
  /** Optional warnings from the analysis */
  warnings?: string[];
  /** Optional errors encountered during analysis */
  errors?: string[];
}

/**
 * Generic cache entry with TTL and metadata
 */
export interface CacheEntry<T> {
  /** Cache key for retrieval */
  key: string;
  /** Cached data */
  data: T;
  /** Timestamp when entry was created */
  timestamp: string;
  /** Time to live in seconds */
  ttl: number;
  /** Optional metadata about the cached entry */
  metadata?: Record<string, unknown>;
}

// ============================================================================
// Knowledge Generation Types (Re-exported from knowledge-generation.ts)
// ============================================================================

// Re-export key types from knowledge-generation module for convenience
export type {
  ArchitecturalDomain,
  KnowledgeCategory,
  KnowledgeGenerationConfig,
  ArchitecturalContext,
  ProjectContext,
  DomainKnowledge,
  KnowledgeItem,
  KnowledgeGenerationResult,
} from './knowledge-generation.js';

// Re-export key types from APE framework module for convenience
export type {
  APEConfig,
  GenerationStrategy,
  EvaluationCriterion,
  SelectionStrategy,
  PromptCandidate,
  OptimizationResult,
  ToolOptimizationConfig,
  EvaluationResult,
  PerformanceMetrics,
} from './ape-framework.js';

// Re-export key types from Reflexion framework module for convenience
export type {
  ReflexionConfig,
  TaskAttempt,
  ReflexionMemory,
  MemoryType,
  ReflectionDepth,
  LearningProgress,
  ReflexionResult,
  MemoryQuery,
  ToolReflexionConfig,
  SelfReflection,
  LearningOutcome,
} from './reflexion-framework.js';

// Re-export key types from ADR Aggregator module for convenience
export type {
  AggregatorTier,
  AggregatorError,
  RepositoryIdentifier,
  SyncAdrRequest,
  SyncAdrPayload,
  SyncAdrResponse,
  AnalysisMetadata,
  TimelineMetadata,
  SecurityScanMetadata,
  CodeLinkingMetadata,
  MermaidDiagramsMetadata,
  DeploymentPatternMetadata,
  ResearchMetadata,
  GetContextRequest,
  GetContextResponse,
  AdrContext,
  GetStalenessReportRequest,
  GetStalenessReportResponse,
  StaleAdr,
  GetTemplatesRequest,
  GetTemplatesResponse,
  DomainTemplate,
  BestPractice,
  AntiPattern,
  GetDiagramsRequest,
  GetDiagramsResponse,
  AdrDiagram,
  ValidateComplianceRequest,
  ValidateComplianceResponse,
  ComplianceResult,
  ComplianceFinding,
  GetKnowledgeGraphRequest,
  GetKnowledgeGraphResponse,
  KnowledgeGraphNode,
  KnowledgeGraphRelationship,
  CrossRepoPattern,
  PatternTrend,
} from './adr-aggregator.js';
