/**
 * Memory Relationship Mapper
 *
 * Intelligent relationship mapping utility for creating connections between
 * memory entities across different tools. Enables troubleshooting sessions
 * to reference environment snapshots, deployment assessments to validate
 * against ADRs, and builds comprehensive project knowledge graph.
 */

import { MemoryEntityManager } from './memory-entity-manager.js';
import { EnhancedLogger } from './enhanced-logging.js';
import {
  MemoryEntity,
  MemoryRelationship,
  TroubleshootingSessionMemory,
  EnvironmentSnapshotMemory,
  DeploymentAssessmentMemory,
  SecurityPatternMemory,
  ArchitecturalDecisionMemory,
  FailurePatternMemory,
} from '../types/memory-entities.js';
import { McpAdrError } from '../types/index.js';

export interface CrossToolRelationshipConfig {
  temporalThreshold: number; // Time window in hours for temporal relationships
  contextSimilarityThreshold: number; // Similarity threshold for context matching
  confidenceThreshold: number; // Minimum confidence for auto-creation
  enableInferenceLearning: boolean; // Enable relationship inference learning
}

export interface RelationshipInferenceResult {
  suggestedRelationships: Array<{
    sourceId: string;
    targetId: string;
    type: MemoryRelationship['type'];
    confidence: number;
    reasoning: string;
    evidence: string[];
  }>;
  conflicts: Array<{
    description: string;
    entityIds: string[];
    severity: 'low' | 'medium' | 'high';
    recommendation: string;
  }>;
}

export class MemoryRelationshipMapper {
  private memoryManager: MemoryEntityManager;
  private logger: EnhancedLogger;
  private config: CrossToolRelationshipConfig;

  constructor(memoryManager: MemoryEntityManager, config?: Partial<CrossToolRelationshipConfig>) {
    this.memoryManager = memoryManager;
    this.logger = new EnhancedLogger();
    this.config = {
      temporalThreshold: 24, // 24 hours
      contextSimilarityThreshold: 0.7,
      confidenceThreshold: 0.8,
      enableInferenceLearning: true,
      ...config,
    };
  }

  /**
   * Create all cross-tool relationships across the knowledge graph
   */
  async createCrossToolRelationships(): Promise<RelationshipInferenceResult> {
    this.logger.info('Starting cross-tool relationship mapping', 'MemoryRelationshipMapper');

    const allResults: RelationshipInferenceResult = {
      suggestedRelationships: [],
      conflicts: [],
    };

    try {
      // 1. Link troubleshooting sessions to environment snapshots
      const troubleshootingEnvResult = await this.linkTroubleshootingToEnvironment();
      allResults.suggestedRelationships.push(...troubleshootingEnvResult.suggestedRelationships);
      allResults.conflicts.push(...troubleshootingEnvResult.conflicts);

      // 2. Link deployment assessments to ADR compliance
      const deploymentAdrResult = await this.linkDeploymentToADRs();
      allResults.suggestedRelationships.push(...deploymentAdrResult.suggestedRelationships);
      allResults.conflicts.push(...deploymentAdrResult.conflicts);

      // 3. Link security patterns to architectural decisions
      const securityArchResult = await this.linkSecurityToArchitecture();
      allResults.suggestedRelationships.push(...securityArchResult.suggestedRelationships);
      allResults.conflicts.push(...securityArchResult.conflicts);

      // 4. Link failure patterns to troubleshooting sessions
      const failureTroubleshootingResult = await this.linkFailuresToTroubleshooting();
      allResults.suggestedRelationships.push(
        ...failureTroubleshootingResult.suggestedRelationships
      );
      allResults.conflicts.push(...failureTroubleshootingResult.conflicts);

      // 5. Link environment snapshots to deployment assessments
      const envDeploymentResult = await this.linkEnvironmentToDeployment();
      allResults.suggestedRelationships.push(...envDeploymentResult.suggestedRelationships);
      allResults.conflicts.push(...envDeploymentResult.conflicts);

      // 6. Auto-create high-confidence relationships
      await this.autoCreateHighConfidenceRelationships(allResults.suggestedRelationships);

      this.logger.info('Cross-tool relationship mapping completed', 'MemoryRelationshipMapper', {
        suggestedCount: allResults.suggestedRelationships.length,
        conflictCount: allResults.conflicts.length,
        autoCreatedCount: allResults.suggestedRelationships.filter(
          r => r.confidence >= this.config.confidenceThreshold
        ).length,
      });

      return allResults;
    } catch (error) {
      throw new McpAdrError(
        `Cross-tool relationship mapping failed: ${error instanceof Error ? error.message : String(error)}`,
        'RELATIONSHIP_MAPPING_ERROR'
      );
    }
  }

  /**
   * Link troubleshooting sessions to environment snapshots
   */
  private async linkTroubleshootingToEnvironment(): Promise<RelationshipInferenceResult> {
    const troubleshootingSessions = (await this.queryEntitiesByType(
      'troubleshooting_session'
    )) as TroubleshootingSessionMemory[];
    const environmentSnapshots = (await this.queryEntitiesByType(
      'environment_snapshot'
    )) as EnvironmentSnapshotMemory[];

    const result: RelationshipInferenceResult = {
      suggestedRelationships: [],
      conflicts: [],
    };

    for (const session of troubleshootingSessions) {
      const relatedEnvs = await this.findTemporallyRelatedEnvironments(
        session,
        environmentSnapshots
      );

      for (const env of relatedEnvs) {
        const confidence = this.calculateEnvironmentSessionConfidence(session, env);

        if (confidence >= 0.6) {
          result.suggestedRelationships.push({
            sourceId: session.id,
            targetId: env.id,
            type: 'occurred_in',
            confidence,
            reasoning: `Troubleshooting session occurred during environment snapshot timeframe with matching context`,
            evidence: [
              `Temporal overlap: ${this.getTemporalOverlap(session.created, env.created)}`,
              `Environment match: ${this.getEnvironmentMatch(session, env)}`,
              `Context similarity: ${this.getContextSimilarity(session.context, env.context)}`,
            ],
          });
        }
      }
    }

    return result;
  }

  /**
   * Link deployment assessments to ADR compliance
   */
  private async linkDeploymentToADRs(): Promise<RelationshipInferenceResult> {
    const deploymentAssessments = (await this.queryEntitiesByType(
      'deployment_assessment'
    )) as DeploymentAssessmentMemory[];
    const adrs = (await this.queryEntitiesByType(
      'architectural_decision'
    )) as ArchitecturalDecisionMemory[];

    this.logger.debug(
      `Found ${deploymentAssessments.length} deployments and ${adrs.length} ADRs`,
      'MemoryRelationshipMapper'
    );

    const result: RelationshipInferenceResult = {
      suggestedRelationships: [],
      conflicts: [],
    };

    for (const deployment of deploymentAssessments) {
      for (const adr of adrs) {
        const compliance = this.calculateAdrComplianceScore(deployment, adr);

        if (compliance.isCompliant) {
          result.suggestedRelationships.push({
            sourceId: deployment.id,
            targetId: adr.id,
            type: 'complies_with',
            confidence: compliance.confidence,
            reasoning: `Deployment assessment demonstrates compliance with architectural decision`,
            evidence: compliance.evidence,
          });
        } else if (compliance.hasConflict) {
          result.conflicts.push({
            description: `Deployment assessment conflicts with architectural decision`,
            entityIds: [deployment.id, adr.id],
            severity: compliance.conflictSeverity,
            recommendation: compliance.recommendation,
          });
        }
      }
    }

    return result;
  }

  /**
   * Link security patterns to architectural decisions
   */
  private async linkSecurityToArchitecture(): Promise<RelationshipInferenceResult> {
    const securityPatterns = (await this.queryEntitiesByType(
      'security_pattern'
    )) as SecurityPatternMemory[];
    const adrs = (await this.queryEntitiesByType(
      'architectural_decision'
    )) as ArchitecturalDecisionMemory[];

    const result: RelationshipInferenceResult = {
      suggestedRelationships: [],
      conflicts: [],
    };

    for (const security of securityPatterns) {
      for (const adr of adrs) {
        if (this.hasSecurityArchitectureRelation(security, adr)) {
          const confidence = this.calculateSecurityArchitectureConfidence(security, adr);

          result.suggestedRelationships.push({
            sourceId: security.id,
            targetId: adr.id,
            type: 'detects' as const,
            confidence,
            reasoning: 'Security pattern provides protection for architectural decision',
            evidence: [
              `Security type: ${security.securityData?.contentType || 'unknown'}`,
              `Risk level: ${security.securityData?.riskAssessment?.overallRisk || 'unknown'}`,
              `Architecture domain: ${this.extractArchitectureDomain(adr)}`,
            ],
          });
        }
      }
    }

    return result;
  }

  /**
   * Link failure patterns to troubleshooting sessions
   */
  private async linkFailuresToTroubleshooting(): Promise<RelationshipInferenceResult> {
    const failurePatterns = (await this.queryEntitiesByType(
      'failure_pattern'
    )) as FailurePatternMemory[];
    const troubleshootingSessions = (await this.queryEntitiesByType(
      'troubleshooting_session'
    )) as TroubleshootingSessionMemory[];

    const result: RelationshipInferenceResult = {
      suggestedRelationships: [],
      conflicts: [],
    };

    for (const failure of failurePatterns) {
      for (const session of troubleshootingSessions) {
        if (this.hasFailureSessionMatch(failure, session)) {
          const confidence = this.calculateFailureSessionConfidence(failure, session);

          result.suggestedRelationships.push({
            sourceId: failure.id,
            targetId: session.id,
            type: 'addresses',
            confidence,
            reasoning: `Failure pattern matches troubleshooting session failure signature`,
            evidence: [
              `Failure type match: ${failure.patternData?.failureType || 'unknown'} === ${session.sessionData?.failurePattern?.failureType || 'unknown'}`,
              `Error signature similarity: ${this.getErrorSignatureSimilarity(failure, session)}`,
              `Environment overlap: ${this.getEnvironmentOverlap(failure, session)}`,
            ],
          });
        }
      }
    }

    return result;
  }

  /**
   * Link environment snapshots to deployment assessments
   */
  private async linkEnvironmentToDeployment(): Promise<RelationshipInferenceResult> {
    const environmentSnapshots = (await this.queryEntitiesByType(
      'environment_snapshot'
    )) as EnvironmentSnapshotMemory[];
    const deploymentAssessments = (await this.queryEntitiesByType(
      'deployment_assessment'
    )) as DeploymentAssessmentMemory[];

    const result: RelationshipInferenceResult = {
      suggestedRelationships: [],
      conflicts: [],
    };

    for (const env of environmentSnapshots) {
      for (const deployment of deploymentAssessments) {
        if (this.hasEnvironmentDeploymentRelation(env, deployment)) {
          const confidence = this.calculateEnvironmentDeploymentConfidence(env, deployment);

          result.suggestedRelationships.push({
            sourceId: env.id,
            targetId: deployment.id,
            type: 'validates',
            confidence,
            reasoning: `Environment snapshot validates deployment assessment configuration`,
            evidence: [
              `Environment type: ${env.environmentData?.environmentType || 'unknown'}`,
              `Deployment environment: ${deployment.assessmentData?.environment || 'unknown'}`,
              `Configuration overlap: ${this.getConfigurationOverlap(env, deployment)}`,
            ],
          });
        }
      }
    }

    return result;
  }

  /**
   * Auto-create relationships with high confidence scores
   */
  private async autoCreateHighConfidenceRelationships(
    suggestedRelationships: RelationshipInferenceResult['suggestedRelationships']
  ): Promise<void> {
    const highConfidenceRelationships = suggestedRelationships.filter(
      rel => rel.confidence >= this.config.confidenceThreshold
    );

    for (const suggestion of highConfidenceRelationships) {
      try {
        await this.memoryManager.upsertRelationship({
          sourceId: suggestion.sourceId,
          targetId: suggestion.targetId,
          type: suggestion.type,
          strength: suggestion.confidence,
          confidence: suggestion.confidence,
          context: suggestion.reasoning,
          evidence: suggestion.evidence,
        });

        this.logger.debug('Auto-created high-confidence relationship', 'MemoryRelationshipMapper', {
          sourceId: suggestion.sourceId,
          targetId: suggestion.targetId,
          type: suggestion.type,
          confidence: suggestion.confidence,
        });
      } catch (error) {
        this.logger.warn('Failed to auto-create relationship', 'MemoryRelationshipMapper', {
          error: error instanceof Error ? error.message : String(error),
          sourceId: suggestion.sourceId,
          targetId: suggestion.targetId,
        });
      }
    }
  }

  // Helper methods for relationship inference

  private async queryEntitiesByType(type: MemoryEntity['type']): Promise<MemoryEntity[]> {
    const result = await this.memoryManager.queryEntities({
      entityTypes: [type],
    });
    return result.entities;
  }

  private async findTemporallyRelatedEnvironments(
    session: TroubleshootingSessionMemory,
    environments: EnvironmentSnapshotMemory[]
  ): Promise<EnvironmentSnapshotMemory[]> {
    const sessionTime = new Date(session.created).getTime();
    const thresholdMs = this.config.temporalThreshold * 60 * 60 * 1000; // Convert hours to ms

    return environments.filter(env => {
      const envTime = new Date(env.created).getTime();
      const timeDiff = Math.abs(sessionTime - envTime);
      return timeDiff <= thresholdMs;
    });
  }

  private calculateEnvironmentSessionConfidence(
    session: TroubleshootingSessionMemory,
    env: EnvironmentSnapshotMemory
  ): number {
    let confidence = 0.5; // Base confidence

    // Temporal proximity (0.0 - 0.3)
    const temporalScore = this.getTemporalProximityScore(session.created, env.created);
    confidence += temporalScore * 0.3;

    // Environment type match (0.0 - 0.2)
    const sessionEnv = session.sessionData?.environmentContext?.['environment'] || 'unknown';
    if (sessionEnv === env.environmentData?.environmentType) {
      confidence += 0.2;
    }

    // Context similarity (0.0 - 0.3)
    const contextScore = this.getContextSimilarity(session.context, env.context);
    confidence += contextScore * 0.3;

    // Technical stack overlap (0.0 - 0.2)
    const stackOverlap = this.getTechnicalStackOverlap(
      session.context.technicalStack,
      env.context.technicalStack
    );
    confidence += stackOverlap * 0.2;

    return Math.min(1.0, confidence);
  }

  private calculateAdrComplianceScore(
    deployment: DeploymentAssessmentMemory,
    adr: ArchitecturalDecisionMemory
  ): {
    isCompliant: boolean;
    hasConflict: boolean;
    confidence: number;
    conflictSeverity: 'low' | 'medium' | 'high';
    evidence: string[];
    recommendation: string;
  } {
    const evidence: string[] = [];
    let complianceScore = 0;
    let hasConflict = false;
    let conflictSeverity: 'low' | 'medium' | 'high' = 'low';

    // Check if deployment follows ADR decisions
    const deploymentTech = deployment.context.technicalStack;
    // Extract technical stack for comparison

    // Technology alignment
    const techAlignment = this.getTechnicalStackOverlap(deploymentTech, adr.context.technicalStack);
    complianceScore += techAlignment * 0.4;
    evidence.push(`Technology alignment: ${(techAlignment * 100).toFixed(1)}%`);

    // Decision implementation status
    if (adr.decisionData?.implementationStatus === 'completed') {
      complianceScore += 0.3;
      evidence.push('ADR implementation is complete');
    } else if (adr.decisionData?.implementationStatus === 'in_progress') {
      complianceScore += 0.2;
      evidence.push('ADR implementation in progress');
    }

    // Check for conflicts
    this.logger.debug(
      `Checking conflict: readiness=${deployment.assessmentData?.readinessScore || 'unknown'}, status=${adr.decisionData?.status || 'unknown'}`,
      'MemoryRelationshipMapper'
    );
    if (
      deployment.assessmentData?.readinessScore != null &&
      deployment.assessmentData.readinessScore < 0.7 &&
      adr.decisionData?.status === 'accepted'
    ) {
      hasConflict = true;
      conflictSeverity = deployment.assessmentData.readinessScore < 0.5 ? 'high' : 'medium';
      evidence.push('Low deployment readiness conflicts with accepted ADR');
      this.logger.debug(
        `Conflict detected: severity=${conflictSeverity}`,
        'MemoryRelationshipMapper'
      );
    }

    return {
      isCompliant: complianceScore >= 0.6,
      hasConflict,
      confidence: complianceScore,
      conflictSeverity,
      evidence,
      recommendation: hasConflict
        ? 'Review deployment readiness issues and ADR implementation status'
        : 'Deployment demonstrates good ADR compliance',
    };
  }

  private calculateSecurityArchitectureConfidence(
    security: SecurityPatternMemory,
    adr: ArchitecturalDecisionMemory
  ): number {
    let confidence = 0.3; // Base confidence

    // Risk level alignment
    const adrRiskMentioned = (adr.decisionData?.consequences?.risks?.length || 0) > 0;
    if (adrRiskMentioned && security.securityData?.riskAssessment?.overallRisk === 'high') {
      confidence += 0.3;
    }

    // Context overlap
    const contextOverlap = this.getContextSimilarity(security.context, adr.context);
    confidence += contextOverlap * 0.4;

    return Math.min(1.0, confidence);
  }

  private hasSecurityArchitectureRelation(
    security: SecurityPatternMemory,
    adr: ArchitecturalDecisionMemory
  ): boolean {
    // Check if security pattern is relevant to the architectural decision domain
    const securityTags = security.tags || [];
    const adrTags = adr.tags || [];

    const hasCommonTags = securityTags.some(tag => adrTags.includes(tag));
    const hasSecurityRisks = (adr.decisionData?.consequences?.risks?.length || 0) > 0;

    return hasCommonTags || hasSecurityRisks;
  }

  private hasFailureSessionMatch(
    failure: FailurePatternMemory,
    session: TroubleshootingSessionMemory
  ): boolean {
    return (
      failure.patternData?.failureType === session.sessionData?.failurePattern?.failureType &&
      this.getErrorSignatureSimilarity(failure, session) > 0.7
    );
  }

  private calculateFailureSessionConfidence(
    failure: FailurePatternMemory,
    session: TroubleshootingSessionMemory
  ): number {
    let confidence = 0.3;

    // Failure type exact match
    if (failure.patternData?.failureType === session.sessionData?.failurePattern?.failureType) {
      confidence += 0.4;
    }

    // Error signature similarity
    const errorSimilarity = this.getErrorSignatureSimilarity(failure, session);
    confidence += errorSimilarity * 0.3;

    return Math.min(1.0, confidence);
  }

  private hasEnvironmentDeploymentRelation(
    env: EnvironmentSnapshotMemory,
    deployment: DeploymentAssessmentMemory
  ): boolean {
    return env.environmentData?.environmentType === deployment.assessmentData?.environment;
  }

  private calculateEnvironmentDeploymentConfidence(
    env: EnvironmentSnapshotMemory,
    deployment: DeploymentAssessmentMemory
  ): number {
    let confidence = 0.4; // Base confidence

    // Environment type exact match
    if (env.environmentData?.environmentType === deployment.assessmentData?.environment) {
      confidence += 0.3;
    }

    // Configuration overlap
    const configOverlap = this.getConfigurationOverlap(env, deployment);
    confidence += configOverlap * 0.3;

    return Math.min(1.0, confidence);
  }

  // Utility methods for similarity calculations

  private getTemporalOverlap(time1: string, time2: string): string {
    const diff = Math.abs(new Date(time1).getTime() - new Date(time2).getTime());
    const hours = diff / (1000 * 60 * 60);
    return `${hours.toFixed(1)} hours apart`;
  }

  private getEnvironmentMatch(
    session: TroubleshootingSessionMemory,
    env: EnvironmentSnapshotMemory
  ): string {
    const sessionEnv = session.sessionData?.environmentContext?.['environment'] || 'unknown';
    const envType = env.environmentData?.environmentType || 'unknown';
    return sessionEnv === envType ? 'exact match' : 'different environments';
  }

  private getContextSimilarity(context1: any, context2: any): number {
    // Simple context similarity based on shared technical stack and environmental factors
    const stack1 = context1.technicalStack || [];
    const stack2 = context2.technicalStack || [];
    const env1 = context1.environmentalFactors || [];
    const env2 = context2.environmentalFactors || [];

    const stackOverlap = this.getTechnicalStackOverlap(stack1, stack2);
    const envOverlap = this.getArrayOverlap(env1, env2);

    return (stackOverlap + envOverlap) / 2;
  }

  private getTechnicalStackOverlap(stack1: string[], stack2: string[]): number {
    if (stack1.length === 0 && stack2.length === 0) return 1.0;
    if (stack1.length === 0 || stack2.length === 0) return 0.0;

    const commonTech = stack1.filter(tech => stack2.includes(tech));
    const totalUniqueTech = new Set([...stack1, ...stack2]).size;

    return commonTech.length / totalUniqueTech;
  }

  private getArrayOverlap(arr1: string[], arr2: string[]): number {
    if (arr1.length === 0 && arr2.length === 0) return 1.0;
    if (arr1.length === 0 || arr2.length === 0) return 0.0;

    const common = arr1.filter(item => arr2.includes(item));
    const totalUnique = new Set([...arr1, ...arr2]).size;

    return common.length / totalUnique;
  }

  private getTemporalProximityScore(time1: string, time2: string): number {
    const diff = Math.abs(new Date(time1).getTime() - new Date(time2).getTime());
    const hours = diff / (1000 * 60 * 60);

    if (hours <= 1) return 1.0;
    if (hours <= 6) return 0.8;
    if (hours <= 24) return 0.6;
    if (hours <= 168) return 0.4; // 1 week
    return 0.0;
  }

  private getErrorSignatureSimilarity(
    failure: FailurePatternMemory,
    session: TroubleshootingSessionMemory
  ): number {
    const failureSignature = failure.patternData.pattern;
    const sessionSignature = session.sessionData.failurePattern.errorSignature;

    // Simple string similarity (in a real implementation, you might use Levenshtein distance)
    if (failureSignature === sessionSignature) return 1.0;
    if (
      failureSignature.includes(sessionSignature) ||
      sessionSignature.includes(failureSignature)
    ) {
      return 0.8;
    }

    const commonWords = failureSignature
      .split(' ')
      .filter((word: string) => sessionSignature.includes(word) && word.length > 3);
    const totalWords = new Set([...failureSignature.split(' '), ...sessionSignature.split(' ')])
      .size;

    return commonWords.length / totalWords;
  }

  private getEnvironmentOverlap(
    failure: FailurePatternMemory,
    session: TroubleshootingSessionMemory
  ): string {
    const failureEnvs = failure.patternData.environments || [];
    const sessionEnv = session.sessionData?.environmentContext?.['environment'] || 'unknown';

    return failureEnvs.includes(sessionEnv) ? 'environment match' : 'different environments';
  }

  private getConfigurationOverlap(
    env: EnvironmentSnapshotMemory,
    _deployment: DeploymentAssessmentMemory
  ): number {
    // Compare configuration elements between environment snapshot and deployment
    const envConfig = env.environmentData.configuration || {};

    // This is a simplified comparison - in practice, you'd compare specific config elements
    if (typeof envConfig === 'object' && Object.keys(envConfig).length > 0) {
      return 0.7; // Assume moderate overlap when config data is present
    }

    return 0.3; // Low overlap when limited config data
  }

  private extractArchitectureDomain(adr: ArchitecturalDecisionMemory): string {
    const tags = adr.tags || [];
    const commonDomains = ['database', 'frontend', 'backend', 'security', 'infrastructure', 'api'];

    for (const domain of commonDomains) {
      if (tags.some(tag => tag.toLowerCase().includes(domain))) {
        return domain;
      }
    }

    return 'general';
  }
}
