/**
 * Memory-Centric Health Scoring System
 *
 * Evaluates system health based on memory quality, retrieval performance,
 * and entity relationship coherence rather than traditional task completion metrics.
 *
 * This replaces the deprecated ProjectHealthScoring with a memory-aware approach
 * that aligns with the memory-centric architecture.
 */

export interface MemoryHealthScore {
  overall: number; // 0-100 weighted composite score
  memoryQuality: number; // 0-100 relevance and freshness of memories
  retrievalPerformance: number; // 0-100 effectiveness of memory retrieval
  entityCoherence: number; // 0-100 consistency of entity relationships
  contextUtilization: number; // 0-100 how well context is being used
  decisionAlignment: number; // 0-100 alignment with architectural decisions
  confidence: number; // 0-100 confidence in the score
  lastUpdated: string; // ISO timestamp
  breakdown: MemoryScoreBreakdown;
}

export interface MemoryScoreBreakdown {
  memoryQuality: {
    totalMemories: number;
    relevantMemories: number;
    staleMemories: number;
    averageRelevanceScore: number;
    lastUpdated: string;
  };
  retrievalPerformance: {
    totalRetrievals: number;
    successfulRetrievals: number;
    averageRetrievalTime: number;
    precisionScore: number;
    recallScore: number;
    lastUpdated: string;
  };
  entityCoherence: {
    totalEntities: number;
    connectedEntities: number;
    orphanedEntities: number;
    relationshipStrength: number;
    lastUpdated: string;
  };
  contextUtilization: {
    averageContextSize: number;
    contextRelevance: number;
    contextCompleteness: number;
    lastUpdated: string;
  };
  decisionAlignment: {
    totalDecisions: number;
    alignedDecisions: number;
    conflictingDecisions: number;
    alignmentScore: number;
    lastUpdated: string;
  };
}

export interface MemoryScoringWeights {
  memoryQuality: number; // Default: 0.25
  retrievalPerformance: number; // Default: 0.25
  entityCoherence: number; // Default: 0.20
  contextUtilization: number; // Default: 0.15
  decisionAlignment: number; // Default: 0.15
}

export class MemoryHealthScoring {
  private weights: MemoryScoringWeights;

  constructor(weights?: Partial<MemoryScoringWeights>) {
    this.weights = {
      memoryQuality: 0.25,
      retrievalPerformance: 0.25,
      entityCoherence: 0.2,
      contextUtilization: 0.15,
      decisionAlignment: 0.15,
      ...weights,
    };
  }

  /**
   * Calculate overall memory health score
   */
  async calculateMemoryHealth(
    memories: any[],
    retrievalMetrics: any,
    entityGraph: any
  ): Promise<MemoryHealthScore> {
    const now = new Date().toISOString();

    const breakdown: MemoryScoreBreakdown = {
      memoryQuality: this.assessMemoryQuality(memories, now),
      retrievalPerformance: this.assessRetrievalPerformance(retrievalMetrics, now),
      entityCoherence: this.assessEntityCoherence(entityGraph, now),
      contextUtilization: this.assessContextUtilization(memories, now),
      decisionAlignment: this.assessDecisionAlignment(memories, entityGraph, now),
    };

    const scores = {
      memoryQuality: this.calculateMemoryQualityScore(breakdown.memoryQuality),
      retrievalPerformance: this.calculateRetrievalScore(breakdown.retrievalPerformance),
      entityCoherence: this.calculateCoherenceScore(breakdown.entityCoherence),
      contextUtilization: this.calculateContextScore(breakdown.contextUtilization),
      decisionAlignment: this.calculateAlignmentScore(breakdown.decisionAlignment),
    };

    const overall = Math.round(
      scores.memoryQuality * this.weights.memoryQuality +
        scores.retrievalPerformance * this.weights.retrievalPerformance +
        scores.entityCoherence * this.weights.entityCoherence +
        scores.contextUtilization * this.weights.contextUtilization +
        scores.decisionAlignment * this.weights.decisionAlignment
    );

    return {
      overall,
      ...scores,
      confidence: this.calculateConfidence(breakdown),
      lastUpdated: now,
      breakdown,
    };
  }

  /**
   * Assess memory quality based on relevance and freshness
   */
  private assessMemoryQuality(
    memories: any[],
    timestamp: string
  ): MemoryScoreBreakdown['memoryQuality'] {
    const now = new Date();
    const staleThreshold = 7 * 24 * 60 * 60 * 1000; // 7 days

    let relevantCount = 0;
    let staleCount = 0;
    let totalRelevance = 0;

    memories.forEach(memory => {
      // Check relevance (simplified - would use embeddings in production)
      const relevance = memory.metadata?.relevanceScore || 0.5;
      totalRelevance += relevance;
      if (relevance > 0.7) relevantCount++;

      // Check staleness
      if (memory.timestamp) {
        const age = now.getTime() - new Date(memory.timestamp).getTime();
        if (age > staleThreshold) staleCount++;
      }
    });

    return {
      totalMemories: memories.length,
      relevantMemories: relevantCount,
      staleMemories: staleCount,
      averageRelevanceScore: memories.length > 0 ? totalRelevance / memories.length : 0,
      lastUpdated: timestamp,
    };
  }

  /**
   * Assess retrieval performance metrics
   */
  private assessRetrievalPerformance(
    metrics: any,
    timestamp: string
  ): MemoryScoreBreakdown['retrievalPerformance'] {
    return {
      totalRetrievals: metrics?.totalRetrievals || 0,
      successfulRetrievals: metrics?.successfulRetrievals || 0,
      averageRetrievalTime: metrics?.averageRetrievalTime || 0,
      precisionScore: metrics?.precisionScore || 0.5,
      recallScore: metrics?.recallScore || 0.5,
      lastUpdated: timestamp,
    };
  }

  /**
   * Assess entity relationship coherence
   */
  private assessEntityCoherence(
    entityGraph: any,
    timestamp: string
  ): MemoryScoreBreakdown['entityCoherence'] {
    const entities = entityGraph?.entities || [];
    const relationships = entityGraph?.relationships || [];

    // Count connected vs orphaned entities
    const connectedEntityIds = new Set<string>();
    relationships.forEach((rel: any) => {
      connectedEntityIds.add(rel.sourceId);
      connectedEntityIds.add(rel.targetId);
    });

    const orphanedCount = entities.filter((e: any) => !connectedEntityIds.has(e.id)).length;

    // Calculate average relationship strength
    const avgStrength =
      relationships.length > 0
        ? relationships.reduce((sum: number, rel: any) => sum + (rel.strength || 0.5), 0) /
          relationships.length
        : 0;

    return {
      totalEntities: entities.length,
      connectedEntities: connectedEntityIds.size,
      orphanedEntities: orphanedCount,
      relationshipStrength: avgStrength,
      lastUpdated: timestamp,
    };
  }

  /**
   * Assess context utilization
   */
  private assessContextUtilization(
    memories: any[],
    timestamp: string
  ): MemoryScoreBreakdown['contextUtilization'] {
    let totalContextSize = 0;
    let totalRelevance = 0;
    let totalCompleteness = 0;

    memories.forEach(memory => {
      const context = memory.context || {};
      totalContextSize += Object.keys(context).length;
      totalRelevance += context.relevanceScore || 0.5;
      totalCompleteness += context.completeness || 0.5;
    });

    const count = memories.length || 1;

    return {
      averageContextSize: totalContextSize / count,
      contextRelevance: totalRelevance / count,
      contextCompleteness: totalCompleteness / count,
      lastUpdated: timestamp,
    };
  }

  /**
   * Assess alignment with architectural decisions
   */
  private assessDecisionAlignment(
    memories: any[],
    entityGraph: any,
    timestamp: string
  ): MemoryScoreBreakdown['decisionAlignment'] {
    const decisions = entityGraph?.decisions || [];
    let alignedCount = 0;
    let conflictingCount = 0;

    decisions.forEach((decision: any) => {
      // Check if memories support this decision
      const supportingMemories = memories.filter(m => m.relatedDecisions?.includes(decision.id));

      if (supportingMemories.length > 0) {
        alignedCount++;
      } else if (decision.conflicts?.length > 0) {
        conflictingCount++;
      }
    });

    return {
      totalDecisions: decisions.length,
      alignedDecisions: alignedCount,
      conflictingDecisions: conflictingCount,
      alignmentScore: decisions.length > 0 ? alignedCount / decisions.length : 0,
      lastUpdated: timestamp,
    };
  }

  /**
   * Calculate memory quality score
   */
  private calculateMemoryQualityScore(quality: MemoryScoreBreakdown['memoryQuality']): number {
    if (quality.totalMemories === 0) return 50; // Neutral score for no memories

    let score = 100;

    // Penalize stale memories
    const staleRatio = quality.staleMemories / quality.totalMemories;
    score -= staleRatio * 30;

    // Reward relevant memories
    const relevantRatio = quality.relevantMemories / quality.totalMemories;
    score = (score + relevantRatio * 100) / 2;

    // Factor in average relevance
    score = (score + quality.averageRelevanceScore * 100) / 2;

    return Math.round(Math.max(0, Math.min(100, score)));
  }

  /**
   * Calculate retrieval performance score
   */
  private calculateRetrievalScore(perf: MemoryScoreBreakdown['retrievalPerformance']): number {
    if (perf.totalRetrievals === 0) return 50; // Neutral score for no retrievals

    const successRate = perf.successfulRetrievals / perf.totalRetrievals;
    const f1Score =
      (2 * (perf.precisionScore * perf.recallScore)) /
      (perf.precisionScore + perf.recallScore || 1);

    // Penalize slow retrieval (over 100ms is considered slow)
    const speedScore = Math.max(0, 1 - perf.averageRetrievalTime / 100);

    return Math.round((successRate * 40 + f1Score * 40 + speedScore * 20) * 100);
  }

  /**
   * Calculate entity coherence score
   */
  private calculateCoherenceScore(coherence: MemoryScoreBreakdown['entityCoherence']): number {
    if (coherence.totalEntities === 0) return 100; // Perfect score for no entities

    const connectedRatio = coherence.connectedEntities / coherence.totalEntities;
    const orphanPenalty = (coherence.orphanedEntities / coherence.totalEntities) * 30;

    let score = connectedRatio * 100 - orphanPenalty;
    score = (score + coherence.relationshipStrength * 100) / 2;

    return Math.round(Math.max(0, Math.min(100, score)));
  }

  /**
   * Calculate context utilization score
   */
  private calculateContextScore(context: MemoryScoreBreakdown['contextUtilization']): number {
    // Ideal context size is between 5-15 items
    const sizeScore =
      context.averageContextSize < 5
        ? context.averageContextSize / 5
        : context.averageContextSize > 15
          ? Math.max(0, 1 - (context.averageContextSize - 15) / 15)
          : 1;

    return Math.round(
      (sizeScore * 30 + context.contextRelevance * 35 + context.contextCompleteness * 35) * 100
    );
  }

  /**
   * Calculate decision alignment score
   */
  private calculateAlignmentScore(alignment: MemoryScoreBreakdown['decisionAlignment']): number {
    if (alignment.totalDecisions === 0) return 100; // Perfect score for no decisions

    let score = alignment.alignmentScore * 100;

    // Heavily penalize conflicting decisions
    const conflictPenalty = (alignment.conflictingDecisions / alignment.totalDecisions) * 50;
    score -= conflictPenalty;

    return Math.round(Math.max(0, Math.min(100, score)));
  }

  /**
   * Calculate confidence in the overall score
   */
  private calculateConfidence(breakdown: MemoryScoreBreakdown): number {
    const now = new Date();
    const maxAgeMs = 60 * 60 * 1000; // 1 hour for memory systems

    let confidence = 100;

    // Check data freshness
    Object.values(breakdown).forEach(component => {
      if (component.lastUpdated) {
        const age = now.getTime() - new Date(component.lastUpdated).getTime();
        if (age > maxAgeMs) {
          confidence -= 20;
        }
      }
    });

    // Reduce confidence if we have very little data
    if (breakdown.memoryQuality.totalMemories < 10) confidence -= 20;
    if (breakdown.retrievalPerformance.totalRetrievals < 5) confidence -= 20;
    if (breakdown.entityCoherence.totalEntities < 5) confidence -= 20;

    return Math.max(0, confidence);
  }

  /**
   * Get emoji representation of score
   */
  getScoreEmoji(score: number): string {
    if (score >= 90) return '🟢';
    if (score >= 75) return '🟡';
    if (score >= 60) return '🟠';
    return '🔴';
  }
}

/**
 * Singleton instance for easy access
 */
export const memoryHealthScoring = new MemoryHealthScoring();
