/**
 * TypeScript interfaces for Reflexion Framework
 * Implements Actor-Evaluator-Self-Reflection pattern for continuous learning
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
// Core Reflexion Types
// ============================================================================

export type MemoryType = 
  | 'episodic'                      // Specific experiences and attempts
  | 'semantic'                      // General knowledge and principles
  | 'procedural'                    // Methods and approaches
  | 'meta'                          // Learning about learning
  | 'feedback';                     // External feedback and validation

export type EvaluationCriterion =
  | 'task-success'                  // Did the task succeed?
  | 'quality'                       // How well was it executed?
  | 'efficiency'                    // Was the approach optimal?
  | 'accuracy'                      // How accurate were the results?
  | 'completeness'                  // Was the task fully completed?
  | 'relevance'                     // How relevant was the output?
  | 'clarity'                       // How clear was the communication?
  | 'innovation';                   // Was the approach creative/novel?

export type ReflectionDepth = 'basic' | 'detailed' | 'comprehensive';

export type LearningPhase = 
  | 'memory-retrieval'
  | 'task-execution'
  | 'performance-evaluation'
  | 'self-reflection'
  | 'memory-integration';

// ============================================================================
// Configuration Interfaces
// ============================================================================

export interface ReflexionConfig {
  memoryEnabled: boolean;
  maxMemoryEntries: number;         // Maximum memories per type
  reflectionDepth: ReflectionDepth;
  evaluationCriteria: EvaluationCriterion[];
  learningRate: number;             // How quickly to adapt (0-1)
  memoryRetention: number;          // How long to keep memories (days)
  feedbackIntegration: boolean;     // Enable external feedback
  autoCleanup: boolean;             // Automatic memory cleanup
  relevanceThreshold: number;       // Minimum relevance for memory retrieval (0-1)
  confidenceThreshold: number;      // Minimum confidence for lesson application (0-1)
}

export const ReflexionConfigSchema = z.object({
  memoryEnabled: z.boolean(),
  maxMemoryEntries: z.number().min(1).max(1000),
  reflectionDepth: z.enum(['basic', 'detailed', 'comprehensive']),
  evaluationCriteria: z.array(z.enum([
    'task-success',
    'quality',
    'efficiency',
    'accuracy',
    'completeness',
    'relevance',
    'clarity',
    'innovation'
  ])),
  learningRate: z.number().min(0).max(1),
  memoryRetention: z.number().min(1).max(365),
  feedbackIntegration: z.boolean(),
  autoCleanup: z.boolean(),
  relevanceThreshold: z.number().min(0).max(1),
  confidenceThreshold: z.number().min(0).max(1),
});

export interface ToolReflexionConfig {
  toolName: string;
  taskTypes: string[];
  reflexionConfig: ReflexionConfig;
  customEvaluators?: CustomEvaluator[];
  memoryCategories?: string[];
  learningObjectives?: string[];
}

// ============================================================================
// Task Execution Interfaces
// ============================================================================

export interface TaskAttempt {
  attemptId: string;
  taskType: string;
  context: any;
  action: string;
  outcome: TaskOutcome;
  evaluation: EvaluationResult;
  reflection: SelfReflection;
  timestamp: string;
  metadata: AttemptMetadata;
  relatedMemories: string[];        // IDs of memories used
  generatedMemories: string[];      // IDs of memories created
}

export interface TaskOutcome {
  success: boolean;
  result: any;
  errors: string[];
  warnings: string[];
  executionTime: number;            // milliseconds
  resourcesUsed: ResourceUsage;
  qualityMetrics: QualityMetrics;
  userFeedback?: UserFeedback;
}

export interface ResourceUsage {
  memoryAccessed: number;           // Number of memories accessed
  memoryCreated: number;            // Number of memories created
  processingTime: number;           // milliseconds
  promptTokens: number;             // Approximate token usage
  cacheHits: number;
  cacheMisses: number;
}

export interface QualityMetrics {
  accuracy: number;                 // 0-1 scale
  completeness: number;             // 0-1 scale
  relevance: number;                // 0-1 scale
  clarity: number;                  // 0-1 scale
  innovation: number;               // 0-1 scale
  efficiency: number;               // 0-1 scale
}

export interface AttemptMetadata {
  attemptNumber: number;            // Sequential attempt number for this task type
  previousAttempts: string[];       // IDs of previous attempts
  improvementFromPrevious: number;  // -1 to 1 scale
  strategiesUsed: string[];
  lessonsApplied: string[];
  challengesFaced: string[];
}

// ============================================================================
// Evaluation Interfaces
// ============================================================================

export interface EvaluationResult {
  overallScore: number;             // 0-1 scale
  criteriaScores: Record<EvaluationCriterion, number>;
  feedback: EvaluationFeedback[];
  strengths: string[];
  weaknesses: string[];
  improvementAreas: string[];
  confidence: number;               // 0-1 scale
  evaluationTime: number;           // milliseconds
  evaluatorVersion: string;
  metadata: EvaluationMetadata;
}

export interface EvaluationFeedback {
  criterion: EvaluationCriterion;
  score: number;                    // 0-1 scale
  reasoning: string;
  suggestions: string[];
  examples?: string[];
  severity: 'low' | 'medium' | 'high' | 'critical';
}

export interface EvaluationMetadata {
  evaluatedAt: string;
  evaluationMethod: string;
  contextFactors: string[];
  biasChecks: BiasCheck[];
  reliability: number;              // 0-1 scale
  comparativeAnalysis?: ComparativeAnalysis;
}

export interface BiasCheck {
  biasType: string;
  detected: boolean;
  severity: 'low' | 'medium' | 'high';
  mitigation: string;
}

export interface ComparativeAnalysis {
  comparedTo: string[];             // Previous attempts or benchmarks
  relativePerformance: number;      // -1 to 1 scale
  improvementAreas: string[];
  regressionAreas: string[];
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
  type: 'range' | 'format' | 'content' | 'logic';
  condition: string;
  errorMessage: string;
  severity: 'warning' | 'error';
}

// ============================================================================
// Self-Reflection Interfaces
// ============================================================================

export interface SelfReflection {
  reflectionId: string;
  reflectionText: string;
  lessonsLearned: LessonLearned[];
  actionableInsights: ActionableInsight[];
  futureStrategies: Strategy[];
  knowledgeGaps: KnowledgeGap[];
  confidenceLevel: number;          // 0-1 scale
  applicability: string[];          // Contexts where lessons apply
  reflectionTime: number;           // milliseconds
  metadata: ReflectionMetadata;
}

export interface LessonLearned {
  lesson: string;
  category: string;
  importance: 'low' | 'medium' | 'high' | 'critical';
  evidence: string[];
  applicableContexts: string[];
  confidence: number;               // 0-1 scale
  generalizability: number;         // 0-1 scale (how broadly applicable)
}

export interface ActionableInsight {
  insight: string;
  action: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  timeframe: 'immediate' | 'short-term' | 'medium-term' | 'long-term';
  resources: string[];
  expectedImpact: number;           // 0-1 scale
  riskLevel: 'low' | 'medium' | 'high';
}

export interface Strategy {
  strategy: string;
  description: string;
  applicableScenarios: string[];
  prerequisites: string[];
  expectedOutcomes: string[];
  riskFactors: string[];
  successMetrics: string[];
}

export interface KnowledgeGap {
  gap: string;
  category: string;
  impact: 'low' | 'medium' | 'high' | 'critical';
  learningPriority: number;         // 0-1 scale
  suggestedResources: string[];
  estimatedLearningTime: string;
}

export interface ReflectionMetadata {
  reflectedAt: string;
  reflectionDepth: ReflectionDepth;
  triggerEvent: string;
  contextFactors: string[];
  emotionalState?: string;
  cognitiveLoad: number;            // 0-1 scale
  reflectionQuality: number;        // 0-1 scale
}

// ============================================================================
// Memory System Interfaces
// ============================================================================

export interface ReflexionMemory {
  memoryId: string;
  memoryType: MemoryType;
  content: MemoryContent;
  relevanceScore: number;           // 0-1 scale
  accessCount: number;
  lastAccessed: string;
  createdAt: string;
  expiresAt?: string;
  tags: string[];
  metadata: MemoryMetadata;
  relationships: MemoryRelationship[];
}

export interface MemoryContent {
  summary: string;
  details: string;
  context: any;
  lessons: string[];
  applicableScenarios: string[];
  relatedMemories: string[];
  evidence: string[];
  outcomes: string[];
  strategies: string[];
  warnings: string[];
}

export interface MemoryMetadata {
  source: string;                   // Where this memory came from
  quality: number;                  // 0-1 scale
  reliability: number;              // 0-1 scale
  generalizability: number;         // 0-1 scale
  updateCount: number;
  lastUpdated: string;
  category: string;
  subcategory?: string;
  importance: 'low' | 'medium' | 'high' | 'critical';
}

export interface MemoryRelationship {
  relatedMemoryId: string;
  relationshipType: 'similar' | 'contradicts' | 'builds-on' | 'prerequisite' | 'outcome';
  strength: number;                 // 0-1 scale
  description: string;
}

export interface MemoryQuery {
  taskType?: string;
  context?: any;
  keywords?: string[];
  memoryTypes?: MemoryType[];
  timeRange?: {
    start: string;
    end: string;
  };
  relevanceThreshold?: number;
  maxResults?: number;
  includeExpired?: boolean;
}

export interface MemorySearchResult {
  memories: ReflexionMemory[];
  totalFound: number;
  searchTime: number;               // milliseconds
  relevanceScores: Record<string, number>;
  searchMetadata: SearchMetadata;
}

export interface SearchMetadata {
  searchQuery: MemoryQuery;
  searchStrategy: string;
  indexesUsed: string[];
  cacheHits: number;
  searchQuality: number;            // 0-1 scale
}

// ============================================================================
// Learning Progress Interfaces
// ============================================================================

export interface LearningProgress {
  taskType: string;
  totalAttempts: number;
  successRate: number;              // 0-1 scale
  averageScore: number;             // 0-1 scale
  improvementTrend: number;         // -1 to 1 (declining to improving)
  lastImprovement: string;
  keyLessons: string[];
  persistentIssues: string[];
  nextFocusAreas: string[];
  learningVelocity: number;         // Rate of improvement
  plateauDetection: PlateauAnalysis;
  metadata: LearningMetadata;
}

export interface PlateauAnalysis {
  isOnPlateau: boolean;
  plateauDuration: number;          // Number of attempts
  plateauConfidence: number;        // 0-1 scale
  suggestedInterventions: string[];
  alternativeApproaches: string[];
}

export interface LearningMetadata {
  trackingStarted: string;
  lastUpdated: string;
  dataQuality: number;              // 0-1 scale
  sampleSize: number;
  confidenceInterval: number;
  statisticalSignificance: number;  // 0-1 scale
  trendAnalysis: TrendAnalysis;
}

export interface TrendAnalysis {
  shortTermTrend: number;           // -1 to 1 (last 5 attempts)
  mediumTermTrend: number;          // -1 to 1 (last 20 attempts)
  longTermTrend: number;            // -1 to 1 (all attempts)
  volatility: number;               // 0-1 scale
  predictability: number;           // 0-1 scale
}

// ============================================================================
// Integration and Result Interfaces
// ============================================================================

export interface ReflexionResult {
  enhancedPrompt: PromptObject;
  taskAttempt: TaskAttempt;
  learningOutcome: LearningOutcome;
  memoryUpdates: MemoryUpdate[];
  performanceMetrics: ReflexionPerformanceMetrics;
  recommendations: string[];
}

export interface LearningOutcome {
  lessonsLearned: number;
  memoriesCreated: number;
  memoriesUpdated: number;
  improvementAchieved: number;      // 0-1 scale
  knowledgeGapsIdentified: number;
  strategiesRefined: number;
  confidenceChange: number;         // -1 to 1 scale
}

export interface MemoryUpdate {
  memoryId: string;
  updateType: 'create' | 'update' | 'strengthen' | 'weaken' | 'expire';
  changes: string[];
  reason: string;
  impact: number;                   // 0-1 scale
}

export interface ReflexionPerformanceMetrics {
  totalReflexionTime: number;       // milliseconds
  memoryRetrievalTime: number;      // milliseconds
  evaluationTime: number;           // milliseconds
  reflectionTime: number;           // milliseconds
  memoryIntegrationTime: number;    // milliseconds
  memoriesAccessed: number;
  memoriesCreated: number;
  learningEfficiency: number;       // 0-1 scale
  resourceUtilization: number;      // 0-1 scale
}

export interface UserFeedback {
  rating: number;                   // 1-5 scale
  comments: string;
  categories: string[];
  helpfulness: number;              // 0-1 scale
  accuracy: number;                 // 0-1 scale
  suggestions: string[];
  submittedAt: string;
  userId?: string;
}

// ============================================================================
// Export Schemas for Runtime Validation
// ============================================================================

export const TaskAttemptSchema = z.object({
  attemptId: z.string(),
  taskType: z.string(),
  context: z.any(),
  action: z.string(),
  outcome: z.object({
    success: z.boolean(),
    result: z.any(),
    errors: z.array(z.string()),
    warnings: z.array(z.string()),
    executionTime: z.number(),
    resourcesUsed: z.object({
      memoryAccessed: z.number(),
      memoryCreated: z.number(),
      processingTime: z.number(),
      promptTokens: z.number(),
      cacheHits: z.number(),
      cacheMisses: z.number()
    }),
    qualityMetrics: z.object({
      accuracy: z.number().min(0).max(1),
      completeness: z.number().min(0).max(1),
      relevance: z.number().min(0).max(1),
      clarity: z.number().min(0).max(1),
      innovation: z.number().min(0).max(1),
      efficiency: z.number().min(0).max(1)
    })
  }),
  evaluation: z.object({
    overallScore: z.number().min(0).max(1),
    criteriaScores: z.record(z.string(), z.number()),
    feedback: z.array(z.any()),
    strengths: z.array(z.string()),
    weaknesses: z.array(z.string()),
    improvementAreas: z.array(z.string()),
    confidence: z.number().min(0).max(1),
    evaluationTime: z.number(),
    evaluatorVersion: z.string()
  }),
  reflection: z.object({
    reflectionId: z.string(),
    reflectionText: z.string(),
    lessonsLearned: z.array(z.any()),
    actionableInsights: z.array(z.any()),
    futureStrategies: z.array(z.any()),
    knowledgeGaps: z.array(z.any()),
    confidenceLevel: z.number().min(0).max(1),
    applicability: z.array(z.string()),
    reflectionTime: z.number()
  }),
  timestamp: z.string(),
  metadata: z.any(),
  relatedMemories: z.array(z.string()),
  generatedMemories: z.array(z.string())
});
