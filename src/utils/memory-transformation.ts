/**
 * Memory Transformation Utilities
 *
 * Utilities for transforming existing ADRs and system data into memory entities
 * for the memory-centric architecture migration.
 */

import crypto from 'crypto';
import {
  ArchitecturalDecisionMemory,
  CodeComponentMemory,
  KnowledgeArtifactMemory,
  MemoryRelationship,
  MemoryEntitySchema,
} from '../types/memory-entities.js';
import { DiscoveredAdr } from './adr-discovery.js';
import { MemoryEntityManager } from './memory-entity-manager.js';
import { EnhancedLogger } from './enhanced-logging.js';
import { McpAdrError } from '../types/index.js';

export class MemoryTransformer {
  private logger: EnhancedLogger;
  // @ts-ignore - keeping for future memory persistence integration
  private _memoryManager: MemoryEntityManager;

  constructor(memoryManager: MemoryEntityManager) {
    this.logger = new EnhancedLogger();
    this._memoryManager = memoryManager;
    // Note: memoryManager is kept for future memory persistence integration
  }

  /**
   * Transform a discovered ADR into an Architectural Decision Memory entity
   */
  async transformAdrToMemory(adr: DiscoveredAdr): Promise<ArchitecturalDecisionMemory> {
    try {
      const now = new Date().toISOString();

      // Parse consequences into positive/negative/risks
      const consequences = this.parseConsequences(adr.consequences || '');

      // Extract implementation tasks from ADR content
      const implementationTasks = this.extractImplementationTasks(adr.content || '');

      // Determine implementation status based on ADR status
      const implementationStatus = this.mapAdrStatusToImplementation(adr.status);

      const memoryEntity: ArchitecturalDecisionMemory = {
        id: crypto.randomUUID(),
        type: 'architectural_decision',
        created: now,
        lastModified: now,
        version: 1,
        confidence: this.calculateConfidenceFromAdr(adr),
        relevance: this.calculateRelevanceFromAdr(adr),
        title: adr.title,
        description: adr.context || adr.title,
        tags: this.extractTagsFromAdr(adr),
        relationships: [], // Will be populated later through relationship inference
        context: {
          projectPhase: this.inferProjectPhase(adr),
          businessDomain: this.inferBusinessDomain(adr),
          technicalStack: this.inferTechnicalStack(adr),
          environmentalFactors: this.inferEnvironmentalFactors(adr),
          stakeholders: this.inferStakeholders(adr),
        },
        accessPattern: {
          lastAccessed: now,
          accessCount: 1,
          accessContext: ['adr_transformation'],
        },
        evolution: {
          origin: 'discovered',
          transformations: [
            {
              timestamp: now,
              type: 'imported_from_adr',
              description: `Transformed from ADR: ${adr.filename}`,
              agent: 'MemoryTransformer',
            },
          ],
        },
        validation: {
          isVerified: adr.status === 'accepted',
          verificationMethod: adr.status === 'accepted' ? 'adr_status' : undefined,
          verificationTimestamp: adr.status === 'accepted' ? now : undefined,
        },
        decisionData: {
          status: this.mapAdrStatus(adr.status),
          context: adr.context || '',
          decision: adr.decision || '',
          consequences: consequences,
          alternatives: this.extractAlternatives(adr.content || ''),
          implementationStatus: implementationStatus,
          implementationTasks: implementationTasks,
          reviewHistory: adr.date
            ? [
                {
                  timestamp: this.parseAdrDate(adr.date) || now,
                  reviewer: 'system',
                  decision:
                    adr.status === 'accepted'
                      ? 'approve'
                      : adr.status === 'rejected'
                        ? 'reject'
                        : 'revise',
                  comments: `Original ADR status: ${adr.status}`,
                },
              ]
            : [],
        },
      };

      // Validate the memory entity
      MemoryEntitySchema.parse(memoryEntity);

      this.logger.debug('Transformed ADR to memory entity', 'MemoryTransformer', {
        adrFile: adr.filename,
        entityId: memoryEntity.id,
        status: adr.status,
        confidence: memoryEntity.confidence,
      });

      return memoryEntity;
    } catch (error) {
      throw new McpAdrError(
        `Failed to transform ADR to memory: ${error instanceof Error ? error.message : String(error)}`,
        'ADR_TRANSFORMATION_ERROR'
      );
    }
  }

  /**
   * Transform multiple ADRs and infer relationships between them
   */
  async transformAdrCollectionToMemories(adrs: DiscoveredAdr[]): Promise<{
    entities: ArchitecturalDecisionMemory[];
    relationships: MemoryRelationship[];
  }> {
    const entities: ArchitecturalDecisionMemory[] = [];
    const relationships: MemoryRelationship[] = [];

    // Transform each ADR
    for (const adr of adrs) {
      try {
        const entity = await this.transformAdrToMemory(adr);
        entities.push(entity);
      } catch (error) {
        this.logger.warn('Failed to transform ADR, skipping', 'MemoryTransformer', {
          adrFile: adr.filename,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }

    // Infer relationships between ADRs
    for (let i = 0; i < entities.length; i++) {
      for (let j = i + 1; j < entities.length; j++) {
        const sourceEntity = entities[i];
        const targetEntity = entities[j];

        if (sourceEntity && targetEntity) {
          const inferredRelationships = this.inferAdrRelationships(sourceEntity, targetEntity);
          relationships.push(...inferredRelationships);
        }
      }
    }

    this.logger.info('Transformed ADR collection to memory entities', 'MemoryTransformer', {
      adrCount: adrs.length,
      entityCount: entities.length,
      relationshipCount: relationships.length,
    });

    return { entities, relationships };
  }

  /**
   * Create a knowledge artifact memory from documentation or research
   */
  async createKnowledgeArtifact(
    title: string,
    content: string,
    artifactType: KnowledgeArtifactMemory['artifactData']['artifactType'],
    sourceFile?: string
  ): Promise<KnowledgeArtifactMemory> {
    const now = new Date().toISOString();

    const memoryEntity: KnowledgeArtifactMemory = {
      id: crypto.randomUUID(),
      type: 'knowledge_artifact',
      created: now,
      lastModified: now,
      version: 1,
      confidence: 0.8,
      relevance: 0.7,
      title,
      description: this.extractDescriptionFromContent(content),
      tags: this.extractTagsFromContent(content),
      relationships: [],
      context: {
        technicalStack: this.inferTechnicalStackFromContent(content),
        environmentalFactors: [],
        stakeholders: [],
      },
      accessPattern: {
        lastAccessed: now,
        accessCount: 1,
        accessContext: ['knowledge_artifact_creation'],
      },
      evolution: {
        origin: sourceFile ? 'discovered' : 'created',
        transformations: [
          {
            timestamp: now,
            type: 'created',
            description: `Created knowledge artifact: ${artifactType}`,
            agent: 'MemoryTransformer',
          },
        ],
      },
      validation: {
        isVerified: false,
      },
      artifactData: {
        artifactType,
        content,
        format: this.detectContentFormat(content),
        sourceReliability: sourceFile ? 0.8 : 0.6,
        applicabilityScope: this.inferApplicabilityScope(content),
        keyInsights: this.extractKeyInsights(content),
        actionableItems: this.extractActionableItems(content),
      },
    };

    return memoryEntity;
  }

  /**
   * Transform project code structure into code component memories
   */
  async transformCodeStructureToMemories(
    codeStructure: any, // From project analysis
    projectPath: string
  ): Promise<CodeComponentMemory[]> {
    const entities: CodeComponentMemory[] = [];

    // This would typically analyze the project structure
    // For now, we'll create a placeholder implementation

    this.logger.info('Code structure transformation not yet implemented', 'MemoryTransformer', {
      projectPath,
      structureKeys: Object.keys(codeStructure || {}),
    });

    return entities;
  }

  // Private helper methods

  private parseConsequences(consequencesText: string): {
    positive: string[];
    negative: string[];
    risks: string[];
  } {
    const consequences = {
      positive: [] as string[],
      negative: [] as string[],
      risks: [] as string[],
    };

    if (!consequencesText) return consequences;

    // Look for structured consequence sections
    const positiveMatch = consequencesText.match(
      /(?:positive|pros?|benefits?)[:\s]*([^#]*?)(?=(?:negative|cons?|risks?|$))/is
    );
    const negativeMatch = consequencesText.match(
      /(?:negative|cons?|drawbacks?)[:\s]*([^#]*?)(?=(?:positive|risks?|$))/is
    );
    const risksMatch = consequencesText.match(/(?:risks?|concerns?)[:\s]*([^#]*?)$/is);

    // Extract positive consequences
    if (positiveMatch && positiveMatch[1]) {
      consequences.positive = this.extractListItems(positiveMatch[1]);
    }

    // Extract negative consequences
    if (negativeMatch && negativeMatch[1]) {
      consequences.negative = this.extractListItems(negativeMatch[1]);
    }

    // Extract risks
    if (risksMatch && risksMatch[1]) {
      consequences.risks = this.extractListItems(risksMatch[1]);
    }

    // If no structured format, try to infer from bullet points
    if (consequences.positive.length === 0 && consequences.negative.length === 0) {
      const lines = consequencesText
        .split('\n')
        .map(line => line.trim())
        .filter(line => line);

      lines.forEach(line => {
        if (line.match(/^[-*+]\s/) || line.match(/^\d+\.\s/)) {
          const item = line.replace(/^[-*+\d.\s]+/, '').trim();
          if (item.match(/\b(benefit|advantage|positive|good|improve)/i)) {
            consequences.positive.push(item);
          } else if (item.match(/\b(drawback|disadvantage|negative|bad|risk|concern)/i)) {
            consequences.negative.push(item);
          } else {
            // Default to positive if unclear
            consequences.positive.push(item);
          }
        }
      });
    }

    return consequences;
  }

  private extractListItems(text: string): string[] {
    if (!text) return [];

    return text
      .split('\n')
      .map(line => line.trim())
      .filter(line => line && (line.match(/^[-*+]\s/) || line.match(/^\d+\.\s/)))
      .map(line => line.replace(/^[-*+\d.\s]+/, '').trim())
      .filter(item => item.length > 0);
  }

  private extractImplementationTasks(content: string): string[] {
    if (!content) return [];

    const tasks: string[] = [];

    // Look for task sections
    const taskSectionMatch = content.match(
      /(?:implementation tasks?|tasks?|todo)[:\s]*([^#]*?)(?=\n##|\n#|$)/is
    );
    if (taskSectionMatch && taskSectionMatch[1]) {
      tasks.push(...this.extractListItems(taskSectionMatch[1]));
    }

    // Look for checkbox items
    const checkboxMatches = content.matchAll(/- \[[ x]\] (.+)/gi);
    for (const match of checkboxMatches) {
      if (match[1]) {
        tasks.push(match[1].trim());
      }
    }

    return tasks;
  }

  private mapAdrStatusToImplementation(
    status: string
  ): ArchitecturalDecisionMemory['decisionData']['implementationStatus'] {
    switch (status.toLowerCase()) {
      case 'accepted':
        return 'in_progress';
      case 'implemented':
      case 'done':
      case 'completed':
        return 'completed';
      case 'proposed':
      case 'draft':
        return 'not_started';
      case 'on hold':
      case 'deferred':
        return 'on_hold';
      default:
        return 'not_started';
    }
  }

  private mapAdrStatus(status: string): ArchitecturalDecisionMemory['decisionData']['status'] {
    switch (status.toLowerCase()) {
      case 'accepted':
      case 'approved':
        return 'accepted';
      case 'deprecated':
      case 'obsolete':
        return 'deprecated';
      case 'superseded':
        return 'superseded';
      default:
        return 'proposed';
    }
  }

  private calculateConfidenceFromAdr(adr: DiscoveredAdr): number {
    let confidence = 0.5; // Base confidence

    // Higher confidence for accepted ADRs
    if (adr.status === 'accepted') confidence += 0.3;

    // Higher confidence if has context and decision
    if (adr.context && adr.decision) confidence += 0.2;

    // Higher confidence if has consequences
    if (adr.consequences) confidence += 0.1;

    // Higher confidence if has date
    if (adr.date) confidence += 0.1;

    return Math.min(1.0, confidence);
  }

  private calculateRelevanceFromAdr(adr: DiscoveredAdr): number {
    let relevance = 0.6; // Base relevance

    // Higher relevance for accepted or recent ADRs
    if (adr.status === 'accepted') relevance += 0.2;

    // Lower relevance for deprecated ADRs
    if (adr.status === 'deprecated' || adr.status === 'superseded') {
      relevance -= 0.3;
    }

    // Adjust based on completeness
    const completeness = [adr.context, adr.decision, adr.consequences].filter(Boolean).length / 3;
    relevance += completeness * 0.2;

    return Math.min(1.0, Math.max(0.1, relevance));
  }

  private extractTagsFromAdr(adr: DiscoveredAdr): string[] {
    const tags: string[] = [];

    // Add category as tag if available
    if (adr.metadata?.category) {
      tags.push(adr.metadata.category);
    }

    // Add existing tags
    if (adr.metadata?.tags) {
      tags.push(...adr.metadata.tags);
    }

    // Add status as tag
    tags.push(`status:${adr.status}`);

    // Extract technology tags from content
    if (adr.content || adr.decision) {
      const content = (adr.content || '') + (adr.decision || '');
      const techTags = this.inferTechnicalStack({ content } as any);
      tags.push(...techTags.map(tech => `tech:${tech.toLowerCase()}`));
    }

    return [...new Set(tags)]; // Remove duplicates
  }

  private inferProjectPhase(adr: DiscoveredAdr): string | undefined {
    const content = (adr.content || '') + (adr.context || '') + (adr.decision || '');
    const contentLower = content.toLowerCase();

    if (contentLower.match(/\b(prototype|poc|proof[- ]of[- ]concept)\b/)) return 'prototype';
    if (contentLower.match(/\b(mvp|minimum[- ]viable[- ]product)\b/)) return 'mvp';
    if (contentLower.match(/\b(design|planning|architecture)\b/)) return 'design';
    if (contentLower.match(/\b(development|implementation|coding)\b/)) return 'development';
    if (contentLower.match(/\b(testing|qa|quality[- ]assurance)\b/)) return 'testing';
    if (contentLower.match(/\b(deployment|production|release)\b/)) return 'deployment';
    if (contentLower.match(/\b(maintenance|support|operations)\b/)) return 'maintenance';

    return undefined;
  }

  private inferBusinessDomain(adr: DiscoveredAdr): string | undefined {
    const content = (adr.content || '') + (adr.context || '') + (adr.decision || '');
    const contentLower = content.toLowerCase();

    if (contentLower.match(/\b(e-?commerce|retail|shopping|payment)\b/)) return 'ecommerce';
    if (contentLower.match(/\b(finance|financial|banking|payment|money)\b/)) return 'finance';
    if (contentLower.match(/\b(healthcare|medical|patient|clinical)\b/)) return 'healthcare';
    if (contentLower.match(/\b(education|learning|student|course)\b/)) return 'education';
    if (contentLower.match(/\b(media|content|publishing|cms)\b/)) return 'media';
    if (contentLower.match(/\b(social|community|user[- ]generated)\b/)) return 'social';
    if (contentLower.match(/\b(iot|device|sensor|embedded)\b/)) return 'iot';
    if (contentLower.match(/\b(analytics|data|bi|business[- ]intelligence)\b/)) return 'analytics';

    return undefined;
  }

  private inferTechnicalStack(adr: DiscoveredAdr): string[] {
    const content = (adr.content || '') + (adr.context || '') + (adr.decision || '');
    return this.inferTechnicalStackFromContent(content);
  }

  private inferTechnicalStackFromContent(content: string): string[] {
    const technologies: string[] = [];
    const contentLower = content.toLowerCase();

    // Languages
    const languages = [
      'javascript',
      'typescript',
      'python',
      'java',
      'go',
      'rust',
      'php',
      'ruby',
      'c#',
      'swift',
      'kotlin',
    ];
    languages.forEach(lang => {
      if (contentLower.includes(lang)) technologies.push(lang);
    });

    // Frameworks
    const frameworks = [
      'react',
      'angular',
      'vue',
      'express',
      'spring',
      'django',
      'flask',
      'rails',
      'laravel',
    ];
    frameworks.forEach(framework => {
      if (contentLower.includes(framework)) technologies.push(framework);
    });

    // Databases
    const databases = [
      'postgresql',
      'mysql',
      'mongodb',
      'redis',
      'elasticsearch',
      'cassandra',
      'sqlite',
    ];
    databases.forEach(db => {
      if (contentLower.includes(db)) technologies.push(db);
    });

    // Cloud providers
    const cloudProviders = ['aws', 'azure', 'gcp', 'google cloud', 'amazon', 'microsoft'];
    cloudProviders.forEach(provider => {
      if (contentLower.includes(provider)) technologies.push(provider);
    });

    return technologies;
  }

  private inferEnvironmentalFactors(adr: DiscoveredAdr): string[] {
    const factors: string[] = [];
    const content = (adr.content || '') + (adr.context || '') + (adr.decision || '');
    const contentLower = content.toLowerCase();

    if (contentLower.match(/\b(cloud|saas|paas|iaas)\b/)) factors.push('cloud');
    if (contentLower.match(/\b(on[- ]premise|on[- ]prem|self[- ]hosted)\b/))
      factors.push('on-premise');
    if (contentLower.match(/\b(microservice|distributed|service[- ]oriented)\b/))
      factors.push('microservices');
    if (contentLower.match(/\b(monolith|single[- ]application)\b/)) factors.push('monolithic');
    if (contentLower.match(/\b(mobile|ios|android|responsive)\b/)) factors.push('mobile');
    if (contentLower.match(/\b(web|browser|frontend|ui)\b/)) factors.push('web');
    if (contentLower.match(/\b(api|rest|graphql|grpc)\b/)) factors.push('api-first');
    if (contentLower.match(/\b(real[- ]?time|streaming|websocket)\b/)) factors.push('real-time');
    if (contentLower.match(/\b(high[- ]?availability|ha|redundancy)\b/))
      factors.push('high-availability');
    if (contentLower.match(/\b(security|gdpr|compliance|privacy)\b/))
      factors.push('security-critical');

    return factors;
  }

  private inferStakeholders(adr: DiscoveredAdr): string[] {
    const stakeholders: string[] = [];
    const content = (adr.content || '') + (adr.context || '') + (adr.decision || '');
    const contentLower = content.toLowerCase();

    if (contentLower.match(/\b(developer|engineer|dev[- ]team)\b/))
      stakeholders.push('development-team');
    if (contentLower.match(/\b(architect|architecture[- ]team)\b/))
      stakeholders.push('architecture-team');
    if (contentLower.match(/\b(devops|ops|operations)\b/)) stakeholders.push('operations-team');
    if (contentLower.match(/\b(security[- ]team|infosec)\b/)) stakeholders.push('security-team');
    if (contentLower.match(/\b(product[- ]manager|pm|product[- ]owner)\b/))
      stakeholders.push('product-management');
    if (contentLower.match(/\b(user|customer|client|end[- ]?user)\b/))
      stakeholders.push('end-users');
    if (contentLower.match(/\b(business|stakeholder|management)\b/))
      stakeholders.push('business-stakeholders');

    return stakeholders;
  }

  private extractAlternatives(
    content: string
  ): Array<{ name: string; description: string; tradeoffs: string }> {
    const alternatives: Array<{ name: string; description: string; tradeoffs: string }> = [];

    // Look for alternatives section
    const alternativesMatch = content.match(
      /(?:alternatives?|options?|considered)[:\s]*([^#]*?)(?=\n##|\n#|$)/is
    );
    if (alternativesMatch && alternativesMatch[1]) {
      const alternativesText = alternativesMatch[1];
      const items = this.extractListItems(alternativesText);

      items.forEach((item, index) => {
        alternatives.push({
          name: `Alternative ${index + 1}`,
          description: item,
          tradeoffs: 'Not specified',
        });
      });
    }

    return alternatives;
  }

  private parseAdrDate(dateStr: string): string | null {
    try {
      // Try to parse various date formats
      const date = new Date(dateStr);
      if (!isNaN(date.getTime())) {
        return date.toISOString();
      }
      return null;
    } catch {
      return null;
    }
  }

  private inferAdrRelationships(
    sourceAdr: ArchitecturalDecisionMemory,
    targetAdr: ArchitecturalDecisionMemory
  ): MemoryRelationship[] {
    const relationships: MemoryRelationship[] = [];

    // Check for explicit supersedes relationship
    if (
      sourceAdr.decisionData.status === 'superseded' ||
      targetAdr.decisionData.status === 'superseded'
    ) {
      const newer = sourceAdr.created > targetAdr.created ? sourceAdr : targetAdr;
      const older = sourceAdr.created > targetAdr.created ? targetAdr : sourceAdr;

      if (older.decisionData.status === 'superseded') {
        relationships.push({
          id: crypto.randomUUID(),
          sourceId: newer.id,
          targetId: older.id,
          type: 'supersedes',
          strength: 0.9,
          context: 'Inferred from ADR superseded status',
          created: new Date().toISOString(),
          confidence: 0.8,
        });
      }
    }

    // Check for similar technologies (relates_to)
    const sourceStack = sourceAdr.context.technicalStack;
    const targetStack = targetAdr.context.technicalStack;
    const commonTech = sourceStack.filter(tech => targetStack.includes(tech));

    if (commonTech.length >= 2) {
      relationships.push({
        id: crypto.randomUUID(),
        sourceId: sourceAdr.id,
        targetId: targetAdr.id,
        type: 'relates_to',
        strength: Math.min(0.8, commonTech.length * 0.2),
        context: `Shared technologies: ${commonTech.join(', ')}`,
        created: new Date().toISOString(),
        confidence: 0.6,
      });
    }

    // Check for implementation dependencies based on content
    const sourceContent = (
      sourceAdr.decisionData.context + sourceAdr.decisionData.decision
    ).toLowerCase();
    const targetTitle = targetAdr.title.toLowerCase();

    if (
      sourceContent.includes(targetTitle) ||
      sourceContent.includes('depends on') ||
      sourceContent.includes('requires')
    ) {
      relationships.push({
        id: crypto.randomUUID(),
        sourceId: sourceAdr.id,
        targetId: targetAdr.id,
        type: 'depends_on',
        strength: 0.7,
        context: 'Inferred from ADR content references',
        created: new Date().toISOString(),
        confidence: 0.5,
      });
    }

    return relationships;
  }

  private extractDescriptionFromContent(content: string): string {
    // Take first paragraph or first 200 characters
    const firstParagraph = content.split('\n\n')[0] || content;
    return firstParagraph.length > 200 ? firstParagraph.substring(0, 197) + '...' : firstParagraph;
  }

  private extractTagsFromContent(content: string): string[] {
    const tags: string[] = [];

    // Extract hashtags
    const hashtagMatches = content.matchAll(/#(\w+)/g);
    for (const match of hashtagMatches) {
      if (match[1]) {
        tags.push(match[1]);
      }
    }

    // Extract technical terms
    const techTerms = this.inferTechnicalStackFromContent(content);
    tags.push(...techTerms);

    return [...new Set(tags)];
  }

  private detectContentFormat(content: string): KnowledgeArtifactMemory['artifactData']['format'] {
    if (content.startsWith('# ') || content.includes('## ')) return 'markdown';
    if (content.trim().startsWith('{') || content.trim().startsWith('[')) return 'json';
    if (content.includes('---\n') || content.startsWith('apiVersion:')) return 'yaml';
    if (content.includes('function ') || content.includes('class ') || content.includes('import '))
      return 'code';
    return 'text';
  }

  private inferApplicabilityScope(content: string): string[] {
    const scope: string[] = [];
    const contentLower = content.toLowerCase();

    if (contentLower.match(/\b(frontend|ui|client[- ]side)\b/)) scope.push('frontend');
    if (contentLower.match(/\b(backend|server[- ]side|api)\b/)) scope.push('backend');
    if (contentLower.match(/\b(database|data[- ]layer|persistence)\b/)) scope.push('database');
    if (contentLower.match(/\b(mobile|ios|android)\b/)) scope.push('mobile');
    if (contentLower.match(/\b(devops|deployment|ci\/cd)\b/)) scope.push('devops');
    if (contentLower.match(/\b(security|auth|encryption)\b/)) scope.push('security');
    if (contentLower.match(/\b(testing|qa|quality)\b/)) scope.push('testing');
    if (contentLower.match(/\b(performance|optimization|scaling)\b/)) scope.push('performance');

    return scope.length > 0 ? scope : ['general'];
  }

  private extractKeyInsights(content: string): string[] {
    const insights: string[] = [];

    // Look for key insights markers
    const insightPatterns = [
      /(?:key insight|important|note|warning|tip)[:\s]*([^.\n]+)/gi,
      /(?:remember|consider|beware)[:\s]*([^.\n]+)/gi,
    ];

    insightPatterns.forEach(pattern => {
      const matches = content.matchAll(pattern);
      for (const match of matches) {
        if (match[1] && match[1].trim().length > 10) {
          insights.push(match[1].trim());
        }
      }
    });

    return insights.slice(0, 5); // Limit to 5 key insights
  }

  private extractActionableItems(
    content: string
  ): KnowledgeArtifactMemory['artifactData']['actionableItems'] {
    const actionableItems: KnowledgeArtifactMemory['artifactData']['actionableItems'] = [];

    // Look for TODO, FIXME, action items
    const actionPatterns = [
      /(?:todo|action|task|must|should|need to)[:\s]*([^.\n]+)/gi,
      /- \[[ ]\] (.+)/g,
    ];

    actionPatterns.forEach(pattern => {
      const matches = content.matchAll(pattern);
      for (const match of matches) {
        if (match[1] && match[1].trim().length > 5) {
          actionableItems.push({
            action: match[1].trim(),
            priority: this.inferActionPriority(match[0]), // Use full match for priority inference
            timeframe: 'undefined',
            dependencies: [],
          });
        }
      }
    });

    return actionableItems.slice(0, 10); // Limit to 10 actionable items
  }

  private inferActionPriority(action: string): 'low' | 'medium' | 'high' {
    const actionLower = action.toLowerCase();

    if (actionLower.match(/\b(critical|urgent|asap|immediately|must)\b/)) return 'high';
    if (actionLower.match(/\b(important|should|priority)\b/)) return 'medium';
    return 'low';
  }
}
