/**
 * Memory-Centric Entity System
 *
 * Core types and interfaces for the memory-centric architecture transformation.
 * These entities replace task-oriented structures with persistent memory objects
 * that maintain context, relationships, and evolution over time.
 */

import { z } from 'zod';

// Base Memory Entity Schema
export const BaseMemoryEntitySchema = z.object({
  id: z.string().uuid(),
  type: z.enum([
    'architectural_decision',
    'code_component',
    'business_requirement',
    'technical_constraint',
    'quality_concern',
    'implementation_pattern',
    'environmental_factor',
    'stakeholder_input',
    'knowledge_artifact',
    'decision_context',
  ]),
  created: z.string().datetime(),
  lastModified: z.string().datetime(),
  version: z.number().positive(),
  confidence: z.number().min(0).max(1),
  relevance: z.number().min(0).max(1),

  // Core memory properties
  title: z.string(),
  description: z.string(),
  tags: z.array(z.string()),

  // Relationship tracking
  relationships: z.array(
    z.object({
      targetId: z.string().uuid(),
      type: z.enum([
        'depends_on',
        'influences',
        'conflicts_with',
        'implements',
        'supersedes',
        'relates_to',
        'originated_from',
        'impacts',
        'constrains',
      ]),
      strength: z.number().min(0).max(1),
      context: z.string().optional(),
      created: z.string().datetime(),
    })
  ),

  // Context and evolution
  context: z.object({
    projectPhase: z.string().optional(),
    businessDomain: z.string().optional(),
    technicalStack: z.array(z.string()),
    environmentalFactors: z.array(z.string()),
    stakeholders: z.array(z.string()),
  }),

  // Memory-specific metadata
  accessPattern: z.object({
    lastAccessed: z.string().datetime(),
    accessCount: z.number(),
    accessContext: z.array(z.string()),
  }),

  // Evolution tracking
  evolution: z.object({
    origin: z.enum(['discovered', 'inferred', 'created', 'imported']),
    transformations: z.array(
      z.object({
        timestamp: z.string().datetime(),
        type: z.string(),
        description: z.string(),
        agent: z.string(),
      })
    ),
  }),

  // Quality and validation
  validation: z.object({
    isVerified: z.boolean(),
    verificationMethod: z.string().optional(),
    verificationTimestamp: z.string().datetime().optional(),
    conflictResolution: z.string().optional(),
  }),
});

export type BaseMemoryEntity = z.infer<typeof BaseMemoryEntitySchema>;

// Specialized Memory Entity Types

export const ArchitecturalDecisionMemorySchema = BaseMemoryEntitySchema.extend({
  type: z.literal('architectural_decision'),
  decisionData: z.object({
    status: z.enum(['proposed', 'accepted', 'deprecated', 'superseded']),
    context: z.string(),
    decision: z.string(),
    consequences: z.object({
      positive: z.array(z.string()),
      negative: z.array(z.string()),
      risks: z.array(z.string()),
    }),
    alternatives: z.array(
      z.object({
        name: z.string(),
        description: z.string(),
        tradeoffs: z.string(),
      })
    ),
    implementationStatus: z.enum(['not_started', 'in_progress', 'completed', 'on_hold']),
    implementationTasks: z.array(z.string()),
    reviewHistory: z.array(
      z.object({
        timestamp: z.string().datetime(),
        reviewer: z.string(),
        decision: z.enum(['approve', 'reject', 'revise']),
        comments: z.string(),
      })
    ),
  }),
});

export const CodeComponentMemorySchema = BaseMemoryEntitySchema.extend({
  type: z.literal('code_component'),
  componentData: z.object({
    filePath: z.string(),
    componentType: z.enum(['class', 'function', 'module', 'interface', 'configuration']),
    language: z.string(),
    size: z.object({
      lines: z.number(),
      complexity: z.number(),
      dependencies: z.number(),
    }),
    qualityMetrics: z.object({
      maintainability: z.number().min(0).max(1),
      testCoverage: z.number().min(0).max(1),
      performance: z.number().min(0).max(1),
      security: z.number().min(0).max(1),
    }),
    architecturalRole: z.string(),
    businessValue: z.string(),
    technicalDebt: z.array(
      z.object({
        type: z.string(),
        severity: z.enum(['low', 'medium', 'high', 'critical']),
        description: z.string(),
        estimatedEffort: z.string(),
      })
    ),
  }),
});

export const BusinessRequirementMemorySchema = BaseMemoryEntitySchema.extend({
  type: z.literal('business_requirement'),
  requirementData: z.object({
    priority: z.enum(['low', 'medium', 'high', 'critical']),
    businessValue: z.string(),
    acceptanceCriteria: z.array(z.string()),
    stakeholders: z.array(z.string()),
    constraints: z.array(z.string()),
    satisfactionLevel: z.number().min(0).max(1),
    implementationApproach: z.string().optional(),
    riskFactors: z.array(
      z.object({
        risk: z.string(),
        impact: z.enum(['low', 'medium', 'high']),
        likelihood: z.enum(['low', 'medium', 'high']),
        mitigation: z.string(),
      })
    ),
  }),
});

export const KnowledgeArtifactMemorySchema = BaseMemoryEntitySchema.extend({
  type: z.literal('knowledge_artifact'),
  artifactData: z.object({
    artifactType: z.enum(['documentation', 'research', 'analysis', 'pattern', 'guideline']),
    content: z.string(),
    format: z.enum(['markdown', 'text', 'json', 'yaml', 'code']),
    sourceReliability: z.number().min(0).max(1),
    applicabilityScope: z.array(z.string()),
    lastValidated: z.string().datetime().optional(),
    keyInsights: z.array(z.string()),
    actionableItems: z.array(
      z.object({
        action: z.string(),
        priority: z.enum(['low', 'medium', 'high']),
        timeframe: z.string(),
        dependencies: z.array(z.string()),
      })
    ),
  }),
});

// Memory Entity Union Type
export const MemoryEntitySchema = z.discriminatedUnion('type', [
  ArchitecturalDecisionMemorySchema,
  CodeComponentMemorySchema,
  BusinessRequirementMemorySchema,
  KnowledgeArtifactMemorySchema,
  BaseMemoryEntitySchema.extend({
    type: z.enum([
      'technical_constraint',
      'quality_concern',
      'implementation_pattern',
      'environmental_factor',
      'stakeholder_input',
      'decision_context',
    ]),
  }),
]);

export type MemoryEntity = z.infer<typeof MemoryEntitySchema>;
export type ArchitecturalDecisionMemory = z.infer<typeof ArchitecturalDecisionMemorySchema>;
export type CodeComponentMemory = z.infer<typeof CodeComponentMemorySchema>;
export type BusinessRequirementMemory = z.infer<typeof BusinessRequirementMemorySchema>;
export type KnowledgeArtifactMemory = z.infer<typeof KnowledgeArtifactMemorySchema>;

// Memory Relationship Types
export interface MemoryRelationship {
  id: string;
  sourceId: string;
  targetId: string;
  type:
    | 'depends_on'
    | 'influences'
    | 'conflicts_with'
    | 'implements'
    | 'supersedes'
    | 'relates_to'
    | 'originated_from'
    | 'impacts'
    | 'constrains';
  strength: number; // 0.0 to 1.0
  context?: string;
  evidence?: string[];
  created: string;
  lastValidated?: string;
  confidence: number; // 0.0 to 1.0
}

// Memory Query and Search Types
export interface MemoryQuery {
  entityTypes?: MemoryEntity['type'][];
  tags?: string[];
  textQuery?: string;
  relationshipTypes?: MemoryRelationship['type'][];
  confidenceThreshold?: number;
  relevanceThreshold?: number;
  timeRange?: {
    from: string;
    to: string;
  };
  contextFilters?: {
    projectPhase?: string;
    businessDomain?: string;
    technicalStack?: string[];
    environmentalFactors?: string[];
  };
  limit?: number;
  sortBy?: 'relevance' | 'confidence' | 'lastModified' | 'created' | 'accessCount';
  includeRelated?: boolean;
  relationshipDepth?: number;
}

export interface MemoryQueryResult {
  entities: MemoryEntity[];
  relationships: MemoryRelationship[];
  totalCount: number;
  queryTime: number;
  aggregations?: {
    byType: Record<string, number>;
    byTag: Record<string, number>;
    byConfidence: Record<string, number>;
  };
}

// Memory Evolution and Learning Types
export interface MemoryEvolutionEvent {
  id: string;
  entityId: string;
  timestamp: string;
  eventType: 'created' | 'modified' | 'accessed' | 'related' | 'validated' | 'deprecated';
  agent: string; // What triggered the event
  changes?: Record<string, any>;
  context?: string;
  confidence?: number;
}

export interface MemoryLearningPattern {
  id: string;
  pattern: string;
  confidence: number;
  frequency: number;
  contexts: string[];
  entities: string[]; // Entity IDs that exhibit this pattern
  relationships: string[]; // Relationship IDs that support this pattern
  discovered: string;
  lastReinforced: string;
  applicabilityScore: number;
}

// Memory Intelligence Types
export interface MemoryIntelligence {
  contextAwareness: {
    currentContext: Record<string, any>;
    contextHistory: Array<{
      timestamp: string;
      context: Record<string, any>;
      trigger: string;
    }>;
  };

  patternRecognition: {
    discoveredPatterns: MemoryLearningPattern[];
    patternConfidence: Record<string, number>;
    emergentBehaviors: string[];
  };

  relationshipInference: {
    suggestedRelationships: Array<{
      sourceId: string;
      targetId: string;
      type: MemoryRelationship['type'];
      confidence: number;
      reasoning: string;
    }>;
    weakConnections: string[]; // Low-confidence relationships to validate
    conflictDetection: Array<{
      conflictType: string;
      entities: string[];
      severity: 'low' | 'medium' | 'high';
      suggestedResolution: string;
    }>;
  };

  adaptiveRecommendations: {
    nextActions: Array<{
      action: string;
      priority: number;
      reasoning: string;
      requiredEntities: string[];
    }>;
    knowledgeGaps: string[];
    optimizationOpportunities: string[];
  };
}

// Memory Persistence Types
export interface MemorySnapshot {
  id: string;
  timestamp: string;
  version: string;
  entities: MemoryEntity[];
  relationships: MemoryRelationship[];
  intelligence: MemoryIntelligence;
  metadata: {
    totalEntities: number;
    totalRelationships: number;
    averageConfidence: number;
    lastOptimization: string;
    compressionRatio?: number;
  };
}

export interface MemoryPersistenceConfig {
  storageType: 'file' | 'database' | 'hybrid';
  snapshotFrequency: number; // minutes
  compressionEnabled: boolean;
  backupRetention: number; // days
  syncEnabled: boolean;
  conflictResolution: 'manual' | 'automatic' | 'merge';
}
