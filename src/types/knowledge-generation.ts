/**
 * TypeScript interfaces for Knowledge Generation framework
 * Implements advanced prompting techniques for domain-specific architectural knowledge
 */

import { z } from 'zod';

// ============================================================================
// Base Types
// ============================================================================

/**
 * Base prompt object for knowledge generation
 */
export interface PromptObject {
  /** The main prompt text */
  prompt: string;
  /** Instructions for using the prompt */
  instructions: string;
  /** Additional context data */
  context: any;
}

// ============================================================================
// Core Knowledge Generation Types
// ============================================================================

export type ArchitecturalDomain =
  | 'web-applications'
  | 'mobile-applications'
  | 'microservices'
  | 'database-design'
  | 'cloud-infrastructure'
  | 'devops-cicd'
  | 'security-patterns'
  | 'performance-optimization'
  | 'api-design'
  | 'data-architecture';

export type KnowledgeCategory =
  | 'best-practices'
  | 'design-patterns'
  | 'anti-patterns'
  | 'technology-specific'
  | 'performance-considerations'
  | 'security-guidelines'
  | 'scalability-patterns'
  | 'testing-strategies';

export type KnowledgeDepth = 'basic' | 'intermediate' | 'advanced';
export type CacheStrategy = 'aggressive' | 'moderate' | 'minimal';

// ============================================================================
// Knowledge Structure Interfaces
// ============================================================================

/**
 * Represents a single piece of architectural knowledge
 */
export interface KnowledgeItem {
  /** Category of knowledge */
  category: KnowledgeCategory;
  /** Title of the knowledge item */
  title: string;
  /** Detailed content of the knowledge */
  content: string;
  /** Relevance score (0-1 scale) */
  relevance: number;
  /** Evidence supporting this knowledge */
  evidence: string[];
  /** Tags for categorization */
  tags: string[];
  /** Optional sources of the knowledge */
  sources?: string[];
}

export const KnowledgeItemSchema = z.object({
  category: z.enum([
    'best-practices',
    'design-patterns',
    'anti-patterns',
    'technology-specific',
    'performance-considerations',
    'security-guidelines',
    'scalability-patterns',
    'testing-strategies',
  ]),
  title: z.string(),
  content: z.string(),
  relevance: z.number().min(0).max(1),
  evidence: z.array(z.string()),
  tags: z.array(z.string()),
  sources: z.array(z.string()).optional(),
});

/**
 * Metadata about knowledge generation process
 */
export interface KnowledgeMetadata {
  /** Timestamp when knowledge was generated */
  generatedAt: string;
  /** Time taken to generate knowledge (milliseconds) */
  generationTime: number;
  /** Cache key for storing/retrieving knowledge */
  cacheKey: string;
  /** Architectural domains covered */
  domains: ArchitecturalDomain[];
  /** Confidence level of generated knowledge (0-1 scale) */
  confidence: number;
  /** Version of the knowledge generation system */
  version: string;
}

/**
 * Knowledge collection for a specific architectural domain
 */
export interface DomainKnowledge {
  /** The architectural domain this knowledge covers */
  domain: ArchitecturalDomain;
  /** Collection of knowledge items */
  knowledge: KnowledgeItem[];
  /** Overall confidence in the knowledge (0-1 scale) */
  confidence: number;
  /** Timestamp when knowledge was collected */
  timestamp: string;
  /** Sources used to generate the knowledge */
  sources: string[];
  /** Metadata about the generation process */
  metadata: KnowledgeMetadata;
}

export const DomainKnowledgeSchema = z.object({
  domain: z.enum([
    'web-applications',
    'mobile-applications',
    'microservices',
    'database-design',
    'cloud-infrastructure',
    'devops-cicd',
    'security-patterns',
    'performance-optimization',
    'api-design',
    'data-architecture',
  ]),
  knowledge: z.array(KnowledgeItemSchema),
  confidence: z.number().min(0).max(1),
  timestamp: z.string(),
  sources: z.array(z.string()),
  metadata: z.object({
    generatedAt: z.string(),
    generationTime: z.number(),
    cacheKey: z.string(),
    domains: z.array(z.string()),
    confidence: z.number().min(0).max(1),
    version: z.string(),
  }),
});

// ============================================================================
// Configuration Interfaces
// ============================================================================

/**
 * Configuration for knowledge generation process
 */
export interface KnowledgeGenerationConfig {
  /** Architectural domains to generate knowledge for */
  domains?: ArchitecturalDomain[];
  /** Depth of knowledge to generate */
  depth?: KnowledgeDepth;
  /** Whether to enable caching of generated knowledge */
  cacheEnabled?: boolean;
  /** Cache time-to-live in seconds */
  cacheTTL?: number;
  /** Whether to perform security validation on generated knowledge */
  securityValidation?: boolean;
  /** Custom templates for domain-specific knowledge */
  customTemplates?: DomainTemplate[];
  /** Maximum number of knowledge items to generate */
  maxKnowledgeItems?: number;
  /** Maximum tokens to use for generation */
  maxTokens?: number;
  /** Minimum relevance threshold (0-1 scale) */
  relevanceThreshold?: number;
  /** Whether to generate knowledge in parallel */
  parallelGeneration?: boolean;
}

export const KnowledgeGenerationConfigSchema = z.object({
  domains: z.array(z.string()).optional(),
  depth: z.enum(['basic', 'intermediate', 'advanced']).optional(),
  cacheEnabled: z.boolean().optional(),
  cacheTTL: z.number().optional(),
  securityValidation: z.boolean().optional(),
  customTemplates: z.array(z.any()).optional(),
  maxKnowledgeItems: z.number().optional(),
  maxTokens: z.number().optional(),
  relevanceThreshold: z.number().min(0).max(1).optional(),
  parallelGeneration: z.boolean().optional(),
});

export interface ToolKnowledgeConfig {
  enableKnowledgeGeneration: boolean;
  domains: ArchitecturalDomain[];
  knowledgeDepth: KnowledgeDepth;
  cacheStrategy: CacheStrategy;
  autoDetectDomains?: boolean;
  customKnowledgeTemplates?: string[];
}

// ============================================================================
// Context and Input Interfaces
// ============================================================================

/**
 * Context about the architectural environment for knowledge generation
 */
export interface ArchitecturalContext {
  /** Path to the project being analyzed */
  projectPath?: string;
  /** Technologies used in the project */
  technologies?: string[];
  /** Architectural patterns detected or used */
  patterns?: string[];
  /** Existing ADRs in the project */
  existingAdrs?: string[];
  /** Type of project (web app, microservice, etc.) */
  projectType?: string;
  /** Size of the development team */
  teamSize?: number;
  /** Known constraints or limitations */
  constraints?: string[];
  /** Project goals and objectives */
  goals?: string[];
}

/**
 * Detailed context about a project for knowledge generation
 */
export interface ProjectContext {
  /** Absolute path to the project */
  path: string;
  /** Project name */
  name?: string;
  /** Project description */
  description?: string;
  /** Technologies detected in the project */
  technologies: string[];
  /** File types found in the project */
  fileTypes: string[];
  /** Directory structure of the project */
  directoryStructure: string[];
  /** Package management files (package.json, requirements.txt, etc.) */
  packageFiles: string[];
  /** Configuration files found */
  configFiles: string[];
}

// ============================================================================
// Template and Generation Interfaces
// ============================================================================

export interface DomainTemplate {
  domain: ArchitecturalDomain;
  categories: TemplateCategoryDefinition[];
  metadata: TemplateMetadata;
}

export interface TemplateCategoryDefinition {
  category: KnowledgeCategory;
  items: string[];
  priority: number; // 1-10 scale
  applicability: string[]; // conditions when this category applies
}

export interface TemplateMetadata {
  version: string;
  author: string;
  lastUpdated: string;
  description: string;
  tags: string[];
}

/**
 * Result of knowledge generation process
 */
export interface KnowledgeGenerationResult {
  /** Generated prompt with knowledge integration */
  knowledgePrompt: PromptObject;
  /** Enhanced version of the prompt (if applicable) */
  enhancedPrompt?: PromptObject;
  /** Generated domain-specific knowledge */
  domainKnowledge: DomainKnowledge[];
  /** Cache key for storing/retrieving this result */
  cacheKey: string;
  /** Metadata about the generation process */
  metadata: GenerationMetadata;
  /** Security validation results */
  securityCheck?: KnowledgeSecurityCheck;
}

export interface GenerationMetadata {
  totalGenerationTime: number; // milliseconds
  domainsProcessed: ArchitecturalDomain[];
  knowledgeItemsGenerated: number;
  cacheHits: number;
  cacheMisses: number;
  averageConfidence: number;
  qualityScore: number;
}

// ============================================================================
// Security and Validation Interfaces
// ============================================================================

export interface KnowledgeSecurityCheck {
  contentSafety: boolean;
  sourceReliability: number; // 0-1 scale
  relevanceScore: number; // 0-1 scale
  qualityScore: number; // 0-1 scale
  warnings: string[];
  recommendations: string[];
  validationTime: number; // milliseconds
}

export interface KnowledgeValidationResult {
  isValid: boolean;
  confidence: number; // 0-1 scale
  issues: ValidationIssue[];
  suggestions: string[];
  qualityMetrics: QualityMetrics;
}

export interface ValidationIssue {
  type: 'error' | 'warning' | 'info';
  category: string;
  message: string;
  severity: number; // 1-10 scale
  suggestion?: string;
}

export interface QualityMetrics {
  completeness: number; // 0-1 scale
  accuracy: number; // 0-1 scale
  relevance: number; // 0-1 scale
  clarity: number; // 0-1 scale
  actionability: number; // 0-1 scale
}

// ============================================================================
// Cache and Performance Interfaces
// ============================================================================

export interface KnowledgeCacheEntry {
  key: string;
  domainKnowledge: DomainKnowledge[];
  generatedAt: string;
  expiresAt: string;
  accessCount: number;
  lastAccessed: string;
  size: number; // bytes
  metadata: CacheEntryMetadata;
}

export interface CacheEntryMetadata {
  domains: ArchitecturalDomain[];
  config: KnowledgeGenerationConfig;
  contextHash: string;
  version: string;
  compressionUsed: boolean;
}

export interface KnowledgePerformanceMetrics {
  generationTime: number; // milliseconds
  cacheHitRate: number; // 0-1 scale
  averageKnowledgeQuality: number; // 0-1 scale
  memoryUsage: number; // bytes
  concurrentGenerations: number;
  errorRate: number; // 0-1 scale
}

// ============================================================================
// Integration and Utility Interfaces
// ============================================================================

export interface KnowledgeIntegrationOptions {
  combineWithOriginalPrompt: boolean;
  knowledgeWeight: number; // 0-1 scale for knowledge vs original prompt balance
  formatAsContext: boolean;
  includeMetadata: boolean;
  customIntegrationTemplate?: string;
}

export interface DomainDetectionResult {
  detectedDomains: ArchitecturalDomain[];
  confidence: number; // 0-1 scale
  evidence: DomainEvidence[];
  recommendations: string[];
  fallbackDomains: ArchitecturalDomain[];
}

export interface DomainEvidence {
  domain: ArchitecturalDomain;
  evidence: string[];
  confidence: number; // 0-1 scale
  sources: string[];
}

// ============================================================================
// Error and Status Interfaces
// ============================================================================

export interface KnowledgeGenerationError {
  code: string;
  message: string;
  domain?: ArchitecturalDomain;
  context?: any;
  timestamp: string;
  recoverable: boolean;
}

export interface KnowledgeGenerationStatus {
  status: 'pending' | 'generating' | 'completed' | 'failed' | 'cached';
  progress: number; // 0-1 scale
  currentDomain?: ArchitecturalDomain;
  estimatedTimeRemaining?: number; // milliseconds
  errors: KnowledgeGenerationError[];
}

// ============================================================================
// Export Schemas for Runtime Validation
// ============================================================================

export const ArchitecturalContextSchema = z.object({
  projectPath: z.string().optional(),
  technologies: z.array(z.string()).optional(),
  patterns: z.array(z.string()).optional(),
  existingAdrs: z.array(z.string()).optional(),
  projectType: z.string().optional(),
  teamSize: z.number().optional(),
  constraints: z.array(z.string()).optional(),
  goals: z.array(z.string()).optional(),
});

export const KnowledgeGenerationResultSchema = z.object({
  knowledgePrompt: z.object({
    prompt: z.string(),
    instructions: z.string(),
    context: z.any(),
  }),
  enhancedPrompt: z
    .object({
      prompt: z.string(),
      instructions: z.string(),
      context: z.any(),
    })
    .optional(),
  domainKnowledge: z.array(DomainKnowledgeSchema),
  cacheKey: z.string(),
  metadata: z.object({
    totalGenerationTime: z.number(),
    domainsProcessed: z.array(z.string()),
    knowledgeItemsGenerated: z.number(),
    cacheHits: z.number(),
    cacheMisses: z.number(),
    averageConfidence: z.number(),
    qualityScore: z.number(),
  }),
  securityCheck: z
    .object({
      contentSafety: z.boolean(),
      sourceReliability: z.number(),
      relevanceScore: z.number(),
      qualityScore: z.number(),
      warnings: z.array(z.string()),
      recommendations: z.array(z.string()),
      validationTime: z.number(),
    })
    .optional(),
});
