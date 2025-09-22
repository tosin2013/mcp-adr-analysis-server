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

export interface AdrTask {
  id: string;
  adrId: string;
  title: string;
  description: string;
  status: 'pending' | 'in_progress' | 'completed' | 'blocked';
  priority: 'low' | 'medium' | 'high' | 'critical';
  estimatedEffort?: string;
  assignee?: string;
  dueDate?: string;
  dependencies?: string[];
  verificationCriteria?: string;
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

export interface Rule {
  id: string;
  name: string;
  description: string;
  type: 'architectural' | 'coding' | 'security' | 'performance' | 'documentation';
  severity: 'info' | 'warning' | 'error' | 'critical';
  pattern: string; // Regex or glob pattern
  message: string;
  source: 'adr' | 'inferred' | 'user_defined';
  sourceId?: string; // ADR ID if source is 'adr'
  enabled: boolean;
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

export class McpAdrError extends Error {
  public readonly code: string;
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

export class ValidationError extends McpAdrError {
  constructor(message: string, details?: Record<string, unknown>) {
    super(message, 'VALIDATION_ERROR', details);
    this.name = 'ValidationError';
  }
}

export class FileSystemError extends McpAdrError {
  constructor(message: string, details?: Record<string, unknown>) {
    super(message, 'FILESYSTEM_ERROR', details);
    this.name = 'FileSystemError';
  }
}

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

export interface AnalysisResult<T> {
  data: T;
  confidence: number;
  timestamp: string;
  source: string;
  warnings?: string[];
  errors?: string[];
}

export interface CacheEntry<T> {
  key: string;
  data: T;
  timestamp: string;
  ttl: number;
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
