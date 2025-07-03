/**
 * TypeScript interfaces for Automatic Prompt Engineer (APE) Framework
 * Implements automatic prompt generation, evaluation, and optimization
 */

import { z } from 'zod';

// ============================================================================
// Base Types
// ============================================================================

export interface PromptObject {
  prompt: string;
  instructions: string;
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

export interface APEConfig {
  candidateCount: number;           // Number of candidates to generate (default: 5)
  evaluationCriteria: EvaluationCriterion[];
  optimizationRounds: number;       // Number of optimization iterations (default: 3)
  selectionStrategy: SelectionStrategy;
  cacheEnabled: boolean;
  performanceTracking: boolean;
  maxOptimizationTime: number;      // Maximum time in milliseconds
  qualityThreshold: number;         // Minimum quality score (0-1)
  diversityWeight: number;          // Weight for candidate diversity (0-1)
}

export const APEConfigSchema = z.object({
  candidateCount: z.number().min(1).max(20),
  evaluationCriteria: z.array(z.enum([
    'task-completion',
    'clarity', 
    'specificity',
    'robustness',
    'efficiency',
    'context-awareness'
  ])),
  optimizationRounds: z.number().min(1).max(10),
  selectionStrategy: z.enum([
    'highest-score',
    'multi-criteria',
    'ensemble',
    'context-aware',
    'balanced'
  ]),
  cacheEnabled: z.boolean(),
  performanceTracking: z.boolean(),
  maxOptimizationTime: z.number().min(1000),
  qualityThreshold: z.number().min(0).max(1),
  diversityWeight: z.number().min(0).max(1),
});

export interface ToolOptimizationConfig {
  toolName: string;
  taskType: string;
  apeConfig: APEConfig;
  contextRequirements: string[];
  successCriteria: string[];
  customEvaluators?: CustomEvaluator[];
}

// ============================================================================
// Candidate Generation Interfaces
// ============================================================================

export interface PromptCandidate {
  id: string;
  prompt: string;
  instructions: string;
  context: any;
  generationStrategy: GenerationStrategy;
  metadata: CandidateMetadata;
  parentId?: string;                // For refined candidates
  generation: number;               // Generation number in optimization
}

export interface CandidateMetadata {
  generatedAt: string;
  generationTime: number;           // milliseconds
  strategy: GenerationStrategy;
  templateUsed?: string;
  variationApplied?: string[];
  complexity: number;               // 0-1 scale
  estimatedQuality: number;         // 0-1 scale
  tokens: number;                   // Approximate token count
}

export interface GenerationRequest {
  basePrompt: PromptObject;
  strategies: GenerationStrategy[];
  candidateCount: number;
  context: GenerationContext;
  constraints: GenerationConstraints;
}

export interface GenerationContext {
  taskType: string;
  domain: string;
  targetAudience: string;
  complexity: 'simple' | 'moderate' | 'complex';
  style: 'formal' | 'conversational' | 'technical';
  length: 'short' | 'medium' | 'long';
}

export interface GenerationConstraints {
  maxLength: number;
  minLength: number;
  requiredKeywords: string[];
  forbiddenTerms: string[];
  styleRequirements: string[];
  formatRequirements: string[];
}

// ============================================================================
// Evaluation Interfaces
// ============================================================================

export interface EvaluationResult {
  candidateId: string;
  scores: Record<EvaluationCriterion, number>;  // Criterion -> Score (0-1)
  overallScore: number;             // Weighted average (0-1)
  feedback: EvaluationFeedback[];
  evaluationTime: number;           // milliseconds
  evaluatorVersion: string;
  metadata: EvaluationMetadata;
}

export interface EvaluationFeedback {
  criterion: EvaluationCriterion;
  score: number;
  reasoning: string;
  suggestions: string[];
  examples?: string[];
}

export interface EvaluationMetadata {
  evaluatedAt: string;
  evaluationMethod: string;
  confidence: number;               // 0-1 scale
  reliability: number;              // 0-1 scale
  contextMatch: number;             // 0-1 scale
  biasScore: number;                // 0-1 scale (lower is better)
}

export interface CustomEvaluator {
  name: string;
  criterion: EvaluationCriterion;
  weight: number;                   // 0-1 scale
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
  diversityScore: number;           // 0-1 scale
  qualityScore: number;             // 0-1 scale
  selectionTime: number;            // milliseconds
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
  improvementScore: number;         // 0-1 scale
  optimizationRounds: number;
  candidatesEvaluated: number;
  totalOptimizationTime: number;    // milliseconds
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
  qualityImprovement: number;       // 0-1 scale
  convergenceRound: number;         // Round where optimization converged
}

// ============================================================================
// Performance and Tracking Interfaces
// ============================================================================

export interface PerformanceMetrics {
  generationTime: number;           // milliseconds
  evaluationTime: number;           // milliseconds
  selectionTime: number;            // milliseconds
  totalTime: number;                // milliseconds
  candidatesGenerated: number;
  candidatesEvaluated: number;
  cacheHits: number;
  cacheMisses: number;
  memoryUsage: number;              // bytes
  successRate: number;              // 0-1 scale
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
  rating: number;                   // 1-5 scale
  comments: string;
  usefulnessScore: number;          // 0-1 scale
  clarityScore: number;             // 0-1 scale
  effectivenessScore: number;       // 0-1 scale
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
  ttl: number;                      // seconds
  accessCount: number;
  lastAccessed: string;
  metadata: CacheEntryMetadata;
}

export interface CacheEntryMetadata {
  version: string;
  compressed: boolean;
  size: number;                     // bytes
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
  status: 'pending' | 'generating' | 'evaluating' | 'selecting' | 'optimizing' | 'completed' | 'failed';
  progress: number;                 // 0-1 scale
  currentPhase: OptimizationPhase;
  candidatesGenerated: number;
  candidatesEvaluated: number;
  estimatedTimeRemaining: number;   // milliseconds
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
    'hybrid-approach'
  ]),
  metadata: z.object({
    generatedAt: z.string(),
    generationTime: z.number(),
    strategy: z.string(),
    templateUsed: z.string().optional(),
    variationApplied: z.array(z.string()).optional(),
    complexity: z.number().min(0).max(1),
    estimatedQuality: z.number().min(0).max(1),
    tokens: z.number()
  }),
  parentId: z.string().optional(),
  generation: z.number()
});

export const OptimizationResultSchema = z.object({
  optimizedPrompt: z.object({
    prompt: z.string(),
    instructions: z.string(),
    context: z.any()
  }),
  originalPrompt: z.object({
    prompt: z.string(),
    instructions: z.string(),
    context: z.any()
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
    convergenceRound: z.number()
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
    successRate: z.number().min(0).max(1)
  })
});
