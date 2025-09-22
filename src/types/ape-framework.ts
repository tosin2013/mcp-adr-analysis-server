/**
 * TypeScript interfaces for Automatic Prompt Engineer (APE) Framework
 * Implements automatic prompt generation, evaluation, and optimization
 */

import { z } from 'zod';

// ============================================================================
// Base Types
// ============================================================================

/**
 * Base prompt object structure used throughout the APE framework
 */
export interface PromptObject {
  /** The main prompt text */
  prompt: string;
  /** Instructions for how to use the prompt */
  instructions: string;
  /** Additional context data */
  context: any;
}

// ============================================================================
// APE Core Types
// ============================================================================

export type GenerationStrategy =
  | 'template-variation'
  | 'semantic-variation'
  | 'style-variation'
  | 'length-variation'
  | 'structure-variation'
  | 'hybrid-approach';

export type EvaluationCriterion =
  | 'task-completion'
  | 'clarity'
  | 'specificity'
  | 'robustness'
  | 'efficiency'
  | 'context-awareness';

export type SelectionStrategy =
  | 'highest-score'
  | 'multi-criteria'
  | 'ensemble'
  | 'context-aware'
  | 'balanced';

export type OptimizationPhase =
  | 'candidate-generation'
  | 'evaluation'
  | 'selection'
  | 'refinement'
  | 'validation';

// ============================================================================
// Configuration Interfaces
// ============================================================================

/**
 * Configuration interface for APE optimization process
 */
export interface APEConfig {
  /** Number of candidates to generate (default: 5) */
  candidateCount: number;
  /** Criteria used for evaluating prompt candidates */
  evaluationCriteria: EvaluationCriterion[];
  /** Number of optimization iterations (default: 3) */
  optimizationRounds: number;
  /** Strategy for selecting best candidates */
  selectionStrategy: SelectionStrategy;
  /** Whether to enable caching of results */
  cacheEnabled: boolean;
  /** Whether to track performance metrics */
  performanceTracking: boolean;
  /** Maximum time in milliseconds for optimization */
  maxOptimizationTime: number;
  /** Minimum quality score (0-1) to accept candidates */
  qualityThreshold: number;
  /** Weight for candidate diversity (0-1) */
  diversityWeight: number;
}

export const APEConfigSchema = z.object({
  candidateCount: z.number().min(1).max(20),
  evaluationCriteria: z.array(
    z.enum([
      'task-completion',
      'clarity',
      'specificity',
      'robustness',
      'efficiency',
      'context-awareness',
    ])
  ),
  optimizationRounds: z.number().min(1).max(10),
  selectionStrategy: z.enum([
    'highest-score',
    'multi-criteria',
    'ensemble',
    'context-aware',
    'balanced',
  ]),
  cacheEnabled: z.boolean(),
  performanceTracking: z.boolean(),
  maxOptimizationTime: z.number().min(1000),
  qualityThreshold: z.number().min(0).max(1),
  diversityWeight: z.number().min(0).max(1),
});

/**
 * Configuration for optimizing prompts for specific tools
 */
export interface ToolOptimizationConfig {
  /** Name of the tool being optimized */
  toolName: string;
  /** Type of task the tool performs */
  taskType: string;
  /** APE configuration to use */
  apeConfig: APEConfig;
  /** Required context elements for the tool */
  contextRequirements: string[];
  /** Criteria for determining optimization success */
  successCriteria: string[];
  /** Custom evaluators for tool-specific metrics */
  customEvaluators?: CustomEvaluator[];
}

// ============================================================================
// Candidate Generation Interfaces
// ============================================================================

/**
 * Represents a generated prompt candidate during optimization
 */
export interface PromptCandidate {
  /** Unique identifier for the candidate */
  id: string;
  /** The generated prompt text */
  prompt: string;
  /** Instructions for using the prompt */
  instructions: string;
  /** Context data for the prompt */
  context: any;
  /** Strategy used to generate this candidate */
  generationStrategy: GenerationStrategy;
  /** Metadata about the generation process */
  metadata: CandidateMetadata;
  /** ID of parent candidate (for refined candidates) */
  parentId?: string;
  /** Generation number in optimization process */
  generation: number;
}

/**
 * Metadata about how a prompt candidate was generated
 */
export interface CandidateMetadata {
  /** Timestamp when candidate was generated */
  generatedAt: string;
  /** Time taken to generate candidate (milliseconds) */
  generationTime: number;
  /** Strategy used for generation */
  strategy: GenerationStrategy;
  /** Template used as base (if any) */
  templateUsed?: string;
  /** Variations applied during generation */
  variationApplied?: string[];
  /** Complexity score (0-1 scale) */
  complexity: number;
  /** Estimated quality score (0-1 scale) */
  estimatedQuality: number;
  /** Approximate token count */
  tokens: number;
}

/**
 * Request for generating prompt candidates
 */
export interface GenerationRequest {
  /** Base prompt to generate variations from */
  basePrompt: PromptObject;
  /** Strategies to use for generation */
  strategies: GenerationStrategy[];
  /** Number of candidates to generate */
  candidateCount: number;
  /** Context for generation */
  context: GenerationContext;
  /** Constraints to apply during generation */
  constraints: GenerationConstraints;
}

/**
 * Context information for prompt generation
 */
export interface GenerationContext {
  /** Type of task the prompt will be used for */
  taskType: string;
  /** Domain or subject area */
  domain: string;
  /** Intended audience for the prompt */
  targetAudience: string;
  /** Complexity level of the prompt */
  complexity: 'simple' | 'moderate' | 'complex';
  /** Writing style to use */
  style: 'formal' | 'conversational' | 'technical';
  /** Target length of the prompt */
  length: 'short' | 'medium' | 'long';
}

/**
 * Constraints to apply during prompt generation
 */
export interface GenerationConstraints {
  /** Maximum length in characters */
  maxLength: number;
  /** Minimum length in characters */
  minLength: number;
  /** Keywords that must be included */
  requiredKeywords: string[];
  /** Terms that must not be included */
  forbiddenTerms: string[];
  /** Style requirements to follow */
  styleRequirements: string[];
  /** Format requirements to follow */
  formatRequirements: string[];
}

// ============================================================================
// Evaluation Interfaces
// ============================================================================

/**
 * Result of evaluating a prompt candidate
 */
export interface EvaluationResult {
  /** ID of the candidate that was evaluated */
  candidateId: string;
  /** Scores for each evaluation criterion (0-1) */
  scores: Record<EvaluationCriterion, number>;
  /** Weighted average overall score (0-1) */
  overallScore: number;
  /** Detailed feedback for each criterion */
  feedback: EvaluationFeedback[];
  /** Time taken for evaluation (milliseconds) */
  evaluationTime: number;
  /** Version of the evaluator used */
  evaluatorVersion: string;
  /** Additional evaluation metadata */
  metadata: EvaluationMetadata;
}

/**
 * Detailed feedback for a specific evaluation criterion
 */
export interface EvaluationFeedback {
  /** The criterion this feedback relates to */
  criterion: EvaluationCriterion;
  /** Score for this criterion (0-1) */
  score: number;
  /** Explanation of why this score was given */
  reasoning: string;
  /** Suggestions for improvement */
  suggestions: string[];
  /** Examples to illustrate the feedback */
  examples?: string[];
}

export interface EvaluationMetadata {
  evaluatedAt: string;
  evaluationMethod: string;
  confidence: number; // 0-1 scale
  reliability: number; // 0-1 scale
  contextMatch: number; // 0-1 scale
  biasScore: number; // 0-1 scale (lower is better)
}

export interface CustomEvaluator {
  name: string;
  criterion: EvaluationCriterion;
  weight: number; // 0-1 scale
  evaluationPrompt: string;
  expectedOutputFormat: string;
  validationRules: ValidationRule[];
}

export interface ValidationRule {
  type: 'length' | 'keyword' | 'format' | 'score';
  condition: string;
  errorMessage: string;
}

// ============================================================================
// Selection and Optimization Interfaces
// ============================================================================

export interface SelectionResult {
  selectedCandidates: PromptCandidate[];
  selectionReasoning: string;
  diversityScore: number; // 0-1 scale
  qualityScore: number; // 0-1 scale
  selectionTime: number; // milliseconds
  metadata: SelectionMetadata;
}

export interface SelectionMetadata {
  strategy: SelectionStrategy;
  candidatesConsidered: number;
  selectionCriteria: EvaluationCriterion[];
  weights: Record<EvaluationCriterion, number>;
  diversityWeight: number;
  qualityThreshold: number;
}

export interface OptimizationResult {
  optimizedPrompt: PromptObject;
  originalPrompt: PromptObject;
  improvementScore: number; // 0-1 scale
  optimizationRounds: number;
  candidatesEvaluated: number;
  totalOptimizationTime: number; // milliseconds
  cacheKey: string;
  metadata: OptimizationMetadata;
  performanceMetrics: PerformanceMetrics;
}

export interface OptimizationMetadata {
  optimizedAt: string;
  apeVersion: string;
  configUsed: APEConfig;
  strategiesApplied: GenerationStrategy[];
  evaluationCriteria: EvaluationCriterion[];
  selectionStrategy: SelectionStrategy;
  qualityImprovement: number; // 0-1 scale
  convergenceRound: number; // Round where optimization converged
}

// ============================================================================
// Performance and Tracking Interfaces
// ============================================================================

export interface PerformanceMetrics {
  generationTime: number; // milliseconds
  evaluationTime: number; // milliseconds
  selectionTime: number; // milliseconds
  totalTime: number; // milliseconds
  candidatesGenerated: number;
  candidatesEvaluated: number;
  cacheHits: number;
  cacheMisses: number;
  memoryUsage: number; // bytes
  successRate: number; // 0-1 scale
}

export interface OptimizationHistory {
  optimizationId: string;
  timestamp: string;
  toolName: string;
  taskType: string;
  originalPrompt: PromptObject;
  optimizedPrompt: PromptObject;
  improvementScore: number;
  config: APEConfig;
  metrics: PerformanceMetrics;
  userFeedback?: UserFeedback;
}

export interface UserFeedback {
  rating: number; // 1-5 scale
  comments: string;
  usefulnessScore: number; // 0-1 scale
  clarityScore: number; // 0-1 scale
  effectivenessScore: number; // 0-1 scale
  wouldRecommend: boolean;
  submittedAt: string;
}

// ============================================================================
// Cache and Storage Interfaces
// ============================================================================

export interface APECacheEntry {
  key: string;
  type: 'candidate' | 'evaluation' | 'optimization' | 'performance';
  data: any;
  timestamp: string;
  ttl: number; // seconds
  accessCount: number;
  lastAccessed: string;
  metadata: CacheEntryMetadata;
}

export interface CacheEntryMetadata {
  version: string;
  compressed: boolean;
  size: number; // bytes
  tags: string[];
  priority: 'low' | 'medium' | 'high';
  context: string;
}

// ============================================================================
// Error and Status Interfaces
// ============================================================================

export interface APEError {
  code: string;
  message: string;
  phase: OptimizationPhase;
  candidateId?: string;
  timestamp: string;
  recoverable: boolean;
  context?: any;
}

export interface OptimizationStatus {
  status:
    | 'pending'
    | 'generating'
    | 'evaluating'
    | 'selecting'
    | 'optimizing'
    | 'completed'
    | 'failed';
  progress: number; // 0-1 scale
  currentPhase: OptimizationPhase;
  candidatesGenerated: number;
  candidatesEvaluated: number;
  estimatedTimeRemaining: number; // milliseconds
  errors: APEError[];
  warnings: string[];
}

// ============================================================================
// Export Schemas for Runtime Validation
// ============================================================================

export const PromptCandidateSchema = z.object({
  id: z.string(),
  prompt: z.string(),
  instructions: z.string(),
  context: z.any(),
  generationStrategy: z.enum([
    'template-variation',
    'semantic-variation',
    'style-variation',
    'length-variation',
    'structure-variation',
    'hybrid-approach',
  ]),
  metadata: z.object({
    generatedAt: z.string(),
    generationTime: z.number(),
    strategy: z.string(),
    templateUsed: z.string().optional(),
    variationApplied: z.array(z.string()).optional(),
    complexity: z.number().min(0).max(1),
    estimatedQuality: z.number().min(0).max(1),
    tokens: z.number(),
  }),
  parentId: z.string().optional(),
  generation: z.number(),
});

export const OptimizationResultSchema = z.object({
  optimizedPrompt: z.object({
    prompt: z.string(),
    instructions: z.string(),
    context: z.any(),
  }),
  originalPrompt: z.object({
    prompt: z.string(),
    instructions: z.string(),
    context: z.any(),
  }),
  improvementScore: z.number().min(0).max(1),
  optimizationRounds: z.number(),
  candidatesEvaluated: z.number(),
  totalOptimizationTime: z.number(),
  cacheKey: z.string(),
  metadata: z.object({
    optimizedAt: z.string(),
    apeVersion: z.string(),
    configUsed: APEConfigSchema,
    strategiesApplied: z.array(z.string()),
    evaluationCriteria: z.array(z.string()),
    selectionStrategy: z.string(),
    qualityImprovement: z.number().min(0).max(1),
    convergenceRound: z.number(),
  }),
  performanceMetrics: z.object({
    generationTime: z.number(),
    evaluationTime: z.number(),
    selectionTime: z.number(),
    totalTime: z.number(),
    candidatesGenerated: z.number(),
    candidatesEvaluated: z.number(),
    cacheHits: z.number(),
    cacheMisses: z.number(),
    memoryUsage: z.number(),
    successRate: z.number().min(0).max(1),
  }),
});
