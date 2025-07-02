/**
 * Core TypeScript interfaces for MCP ADR Analysis Server
 * Based on shrimp-rules.md requirements
 */

import { z } from 'zod';

// ============================================================================
// ADR (Architectural Decision Record) Types
// ============================================================================

export interface Adr {
  id: string;
  title: string;
  status: 'proposed' | 'accepted' | 'deprecated' | 'superseded';
  date: string;
  context: string;
  decision: string;
  consequences: string;
  implementationPlan?: string;
  filePath: string;
  tags?: string[];
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
  relatedAdrs: z.array(z.string()).optional()
});

// ============================================================================
// Technology Detection Types
// ============================================================================

export interface DetectedTechnology {
  name: string;
  category: 'framework' | 'library' | 'database' | 'cloud' | 'devops' | 'language' | 'tool';
  version?: string;
  confidence: number; // 0-1 scale
  evidence: string[];
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
  description: z.string().optional()
});

// ============================================================================
// Pattern Detection Types
// ============================================================================

export interface DetectedPattern {
  name: string;
  type: 'architectural' | 'structural' | 'organizational' | 'communication' | 'testing' | 'data';
  confidence: number; // 0-1 scale
  description: string;
  evidence: string[];
  filePaths: string[];
  suboptimal?: boolean;
  recommendations?: string[];
}

export const DetectedPatternSchema = z.object({
  name: z.string(),
  type: z.enum(['architectural', 'structural', 'organizational', 'communication', 'testing', 'data']),
  confidence: z.number().min(0).max(1),
  description: z.string(),
  evidence: z.array(z.string()),
  filePaths: z.array(z.string()),
  suboptimal: z.boolean().optional(),
  recommendations: z.array(z.string()).optional()
});

// ============================================================================
// Architectural Knowledge Graph Types
// ============================================================================

export interface ArchitecturalKnowledgeGraph {
  projectId: string;
  timestamp: string;
  adrs: Adr[];
  technologies: DetectedTechnology[];
  patterns: DetectedPattern[];
  rules: Rule[];
  relationships: Relationship[];
  metadata: ProjectMetadata;
}

export interface Relationship {
  source: string;
  target: string;
  type: 'implements' | 'depends_on' | 'conflicts_with' | 'supersedes' | 'relates_to';
  strength: number; // 0-1 scale
  description?: string;
}

export interface ProjectMetadata {
  name: string;
  description?: string;
  version?: string;
  lastAnalyzed: string;
  analysisVersion: string;
  fileCount: number;
  directoryCount: number;
}

export const ArchitecturalKnowledgeGraphSchema = z.object({
  projectId: z.string(),
  timestamp: z.string(),
  adrs: z.array(AdrSchema),
  technologies: z.array(DetectedTechnologySchema),
  patterns: z.array(DetectedPatternSchema),
  rules: z.array(z.any()), // Will be defined by RuleSchema
  relationships: z.array(z.object({
    source: z.string(),
    target: z.string(),
    type: z.enum(['implements', 'depends_on', 'conflicts_with', 'supersedes', 'relates_to']),
    strength: z.number().min(0).max(1),
    description: z.string().optional()
  })),
  metadata: z.object({
    name: z.string(),
    description: z.string().optional(),
    version: z.string().optional(),
    lastAnalyzed: z.string(),
    analysisVersion: z.string(),
    fileCount: z.number(),
    directoryCount: z.number()
  })
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
  completionEvidence: z.array(z.string()).optional()
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
  tags: z.array(z.string()).optional()
});

// ============================================================================
// Error Types
// ============================================================================

export class McpAdrError extends Error {
  public readonly code: string;
  public readonly details?: Record<string, unknown>;

  constructor(
    message: string,
    code: string,
    details?: Record<string, unknown>
  ) {
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
