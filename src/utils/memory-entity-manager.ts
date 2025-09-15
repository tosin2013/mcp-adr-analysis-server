/**
 * Memory Entity Manager
 *
 * Core manager for the memory-centric architecture that handles storage, retrieval,
 * relationship management, and intelligence operations for memory entities.
 */

import * as fs from 'fs/promises';
import * as path from 'path';
import crypto from 'crypto';

import {
  MemoryEntity,
  MemoryRelationship,
  MemoryQuery,
  MemoryQueryResult,
  MemorySnapshot,
  MemoryIntelligence,
  MemoryEvolutionEvent,
  MemoryPersistenceConfig,
  MemoryEntitySchema,
} from '../types/memory-entities.js';

import { McpAdrError } from '../types/index.js';
import { loadConfig } from './config.js';
import { EnhancedLogger } from './enhanced-logging.js';

export class MemoryEntityManager {
  private memoryDir: string;
  private entitiesFile: string;
  private relationshipsFile: string;
  private intelligenceFile: string;
  private evolutionLogFile: string;
  private config: MemoryPersistenceConfig;
  private logger: EnhancedLogger;

  // In-memory caches for performance
  private entitiesCache: Map<string, MemoryEntity> = new Map();
  private relationshipsCache: Map<string, MemoryRelationship> = new Map();
  private intelligence: MemoryIntelligence | null = null;
  private lastSnapshotTime = 0;

  constructor(config?: Partial<MemoryPersistenceConfig>) {
    const projectConfig = loadConfig();
    this.logger = new EnhancedLogger();

    this.memoryDir = path.join(projectConfig.projectPath, '.mcp-adr-memory');
    this.entitiesFile = path.join(this.memoryDir, 'entities.json');
    this.relationshipsFile = path.join(this.memoryDir, 'relationships.json');
    this.intelligenceFile = path.join(this.memoryDir, 'intelligence.json');
    this.evolutionLogFile = path.join(this.memoryDir, 'evolution-log.json');

    this.config = {
      storageType: 'file',
      snapshotFrequency: 30, // 30 minutes
      compressionEnabled: true,
      backupRetention: 30, // 30 days
      syncEnabled: true,
      conflictResolution: 'merge',
      ...config,
    };
  }

  /**
   * Initialize the memory system
   */
  async initialize(): Promise<void> {
    try {
      await this.ensureMemoryDirectory();
      await this.loadFromPersistence();
      await this.initializeIntelligence();

      this.logger.info('Memory Entity Manager initialized successfully', 'MemoryEntityManager', {
        entityCount: this.entitiesCache.size,
        relationshipCount: this.relationshipsCache.size,
      });
    } catch (error) {
      throw new McpAdrError(
        `Failed to initialize memory system: ${error instanceof Error ? error.message : String(error)}`,
        'MEMORY_INIT_ERROR'
      );
    }
  }

  /**
   * Create or update a memory entity
   */
  async upsertEntity(
    entity: Partial<MemoryEntity> & Pick<MemoryEntity, 'type' | 'title' | 'description'>
  ): Promise<MemoryEntity> {
    try {
      const now = new Date().toISOString();
      const id = entity.id || crypto.randomUUID();

      // Get existing entity if updating
      const existing = entity.id ? this.entitiesCache.get(entity.id) : null;

      // Create full entity with defaults
      const fullEntity: MemoryEntity = {
        id,
        created: existing?.created || now,
        lastModified: now,
        version: (existing?.version || 0) + 1,
        confidence: entity.confidence || 0.8,
        relevance: entity.relevance || 0.7,
        tags: entity.tags || [],
        relationships: entity.relationships || existing?.relationships || [],
        context: {
          projectPhase: entity.context?.projectPhase,
          businessDomain: entity.context?.businessDomain,
          technicalStack: entity.context?.technicalStack || [],
          environmentalFactors: entity.context?.environmentalFactors || [],
          stakeholders: entity.context?.stakeholders || [],
        },
        accessPattern: {
          lastAccessed: now,
          accessCount: (existing?.accessPattern?.accessCount || 0) + 1,
          accessContext: entity.accessPattern?.accessContext || [],
        },
        evolution: {
          origin: entity.evolution?.origin || (existing ? 'created' : 'discovered'),
          transformations: [
            ...(existing?.evolution?.transformations || []),
            {
              timestamp: now,
              type: existing ? 'updated' : 'created',
              description: existing
                ? `Updated ${entity.type} entity`
                : `Created ${entity.type} entity`,
              agent: 'MemoryEntityManager',
            },
          ],
        },
        validation: {
          isVerified: entity.validation?.isVerified || false,
          verificationMethod: entity.validation?.verificationMethod,
          verificationTimestamp: entity.validation?.verificationTimestamp,
          conflictResolution: entity.validation?.conflictResolution,
        },
        ...entity,
      } as MemoryEntity;

      // Validate the entity
      MemoryEntitySchema.parse(fullEntity);

      // Store in cache
      this.entitiesCache.set(id, fullEntity);

      // Log evolution event
      await this.logEvolutionEvent({
        id: crypto.randomUUID(),
        entityId: id,
        timestamp: now,
        eventType: existing ? 'modified' : 'created',
        agent: 'MemoryEntityManager',
        changes: existing ? this.calculateChanges(existing, fullEntity) : {},
      });

      // Update intelligence
      await this.updateIntelligence('entity_updated', {
        entityId: id,
        entityType: fullEntity.type,
      });

      // Persist if needed
      await this.maybePersist();

      this.logger.debug(`${existing ? 'Updated' : 'Created'} entity`, 'MemoryEntityManager', {
        entityId: id,
        type: fullEntity.type,
        title: fullEntity.title.substring(0, 50),
      });

      return fullEntity;
    } catch (error) {
      throw new McpAdrError(
        `Failed to upsert entity: ${error instanceof Error ? error.message : String(error)}`,
        'ENTITY_UPSERT_ERROR'
      );
    }
  }

  /**
   * Get an entity by ID
   */
  async getEntity(id: string): Promise<MemoryEntity | null> {
    const entity = this.entitiesCache.get(id);
    if (entity) {
      // Update access pattern
      entity.accessPattern.lastAccessed = new Date().toISOString();
      entity.accessPattern.accessCount += 1;

      await this.logEvolutionEvent({
        id: crypto.randomUUID(),
        entityId: id,
        timestamp: new Date().toISOString(),
        eventType: 'accessed',
        agent: 'MemoryEntityManager',
      });
    }
    return entity || null;
  }

  /**
   * Delete an entity
   */
  async deleteEntity(id: string): Promise<boolean> {
    const entity = this.entitiesCache.get(id);
    if (!entity) return false;

    // Remove entity
    this.entitiesCache.delete(id);

    // Remove all relationships involving this entity
    const relationshipsToRemove = Array.from(this.relationshipsCache.values()).filter(
      rel => rel.sourceId === id || rel.targetId === id
    );

    relationshipsToRemove.forEach(rel => this.relationshipsCache.delete(rel.id));

    // Log evolution event
    await this.logEvolutionEvent({
      id: crypto.randomUUID(),
      entityId: id,
      timestamp: new Date().toISOString(),
      eventType: 'deprecated',
      agent: 'MemoryEntityManager',
      context: 'Entity deleted by user request',
    });

    await this.maybePersist();
    return true;
  }

  /**
   * Create or update a relationship between entities
   */
  async upsertRelationship(
    relationship: Partial<MemoryRelationship> &
      Pick<MemoryRelationship, 'sourceId' | 'targetId' | 'type'>
  ): Promise<MemoryRelationship> {
    try {
      const now = new Date().toISOString();
      const id = relationship.id || crypto.randomUUID();

      // Validate that both entities exist
      const sourceEntity = this.entitiesCache.get(relationship.sourceId);
      const targetEntity = this.entitiesCache.get(relationship.targetId);

      if (!sourceEntity || !targetEntity) {
        throw new McpAdrError('Source or target entity not found', 'RELATIONSHIP_INVALID_ENTITIES');
      }

      const fullRelationship: MemoryRelationship = {
        id,
        sourceId: relationship.sourceId,
        targetId: relationship.targetId,
        type: relationship.type,
        strength: relationship.strength || 0.7,
        context: relationship.context || '',
        evidence: relationship.evidence || [],
        created: relationship.created || now,
        lastValidated: relationship.lastValidated || now,
        confidence: relationship.confidence || 0.8,
      };

      // Store in cache
      this.relationshipsCache.set(id, fullRelationship);

      // Update entity relationships
      this.updateEntityRelationships(sourceEntity, fullRelationship);

      // Log evolution events for both entities
      await Promise.all([
        this.logEvolutionEvent({
          id: crypto.randomUUID(),
          entityId: relationship.sourceId,
          timestamp: now,
          eventType: 'related',
          agent: 'MemoryEntityManager',
          context: `Relationship ${relationship.type} to ${targetEntity.title}`,
        }),
        this.logEvolutionEvent({
          id: crypto.randomUUID(),
          entityId: relationship.targetId,
          timestamp: now,
          eventType: 'related',
          agent: 'MemoryEntityManager',
          context: `Relationship ${relationship.type} from ${sourceEntity.title}`,
        }),
      ]);

      await this.maybePersist();
      return fullRelationship;
    } catch (error) {
      throw new McpAdrError(
        `Failed to create relationship: ${error instanceof Error ? error.message : String(error)}`,
        'RELATIONSHIP_CREATE_ERROR'
      );
    }
  }

  /**
   * Query entities with advanced filtering
   */
  async queryEntities(query: MemoryQuery): Promise<MemoryQueryResult> {
    const startTime = Date.now();

    try {
      let entities = Array.from(this.entitiesCache.values());
      const relationships = Array.from(this.relationshipsCache.values());

      // Apply filters
      if (query.entityTypes?.length) {
        entities = entities.filter(e => query.entityTypes!.includes(e.type));
      }

      if (query.tags?.length) {
        entities = entities.filter(e => query.tags!.some(tag => e.tags.includes(tag)));
      }

      if (query.textQuery) {
        const searchTerm = query.textQuery.toLowerCase();
        entities = entities.filter(
          e =>
            e.title.toLowerCase().includes(searchTerm) ||
            e.description.toLowerCase().includes(searchTerm) ||
            e.tags.some(tag => tag.toLowerCase().includes(searchTerm))
        );
      }

      if (query.confidenceThreshold !== undefined) {
        entities = entities.filter(e => e.confidence >= query.confidenceThreshold!);
      }

      if (query.relevanceThreshold !== undefined) {
        entities = entities.filter(e => e.relevance >= query.relevanceThreshold!);
      }

      if (query.timeRange) {
        const fromTime = new Date(query.timeRange.from).getTime();
        const toTime = new Date(query.timeRange.to).getTime();
        entities = entities.filter(e => {
          const entityTime = new Date(e.lastModified).getTime();
          return entityTime >= fromTime && entityTime <= toTime;
        });
      }

      // Apply context filters
      if (query.contextFilters) {
        if (query.contextFilters.projectPhase) {
          entities = entities.filter(
            e => e.context.projectPhase === query.contextFilters!.projectPhase
          );
        }
        if (query.contextFilters.businessDomain) {
          entities = entities.filter(
            e => e.context.businessDomain === query.contextFilters!.businessDomain
          );
        }
        if (query.contextFilters.technicalStack?.length) {
          entities = entities.filter(e =>
            query.contextFilters!.technicalStack!.some(tech =>
              e.context.technicalStack.includes(tech)
            )
          );
        }
      }

      // Sort entities
      const sortBy = query.sortBy || 'relevance';
      entities.sort((a, b) => {
        switch (sortBy) {
          case 'confidence':
            return b.confidence - a.confidence;
          case 'lastModified':
            return new Date(b.lastModified).getTime() - new Date(a.lastModified).getTime();
          case 'created':
            return new Date(b.created).getTime() - new Date(a.created).getTime();
          case 'accessCount':
            return b.accessPattern.accessCount - a.accessPattern.accessCount;
          case 'relevance':
          default:
            return b.relevance - a.relevance;
        }
      });

      const totalCount = entities.length;

      // Apply limit
      if (query.limit && query.limit > 0) {
        entities = entities.slice(0, query.limit);
      }

      // Include related entities if requested
      let resultRelationships = relationships;
      if (query.includeRelated) {
        const entityIds = new Set(entities.map(e => e.id));
        resultRelationships = relationships.filter(
          r => entityIds.has(r.sourceId) || entityIds.has(r.targetId)
        );
      }

      // Generate aggregations
      const aggregations = {
        byType: {} as Record<string, number>,
        byTag: {} as Record<string, number>,
        byConfidence: {} as Record<string, number>,
      };

      entities.forEach(entity => {
        // By type
        aggregations.byType[entity.type] = (aggregations.byType[entity.type] || 0) + 1;

        // By tags
        entity.tags.forEach(tag => {
          aggregations.byTag[tag] = (aggregations.byTag[tag] || 0) + 1;
        });

        // By confidence range
        const confidenceRange = Math.floor(entity.confidence * 10) / 10;
        aggregations.byConfidence[`${confidenceRange}-${confidenceRange + 0.1}`] =
          (aggregations.byConfidence[`${confidenceRange}-${confidenceRange + 0.1}`] || 0) + 1;
      });

      const queryTime = Date.now() - startTime;

      this.logger.debug('Entity query executed', 'MemoryEntityManager', {
        queryTime,
        totalCount,
        returnedCount: entities.length,
        filters: Object.keys(query).filter(key => query[key as keyof MemoryQuery] !== undefined),
      });

      return {
        entities,
        relationships: resultRelationships,
        totalCount,
        queryTime,
        aggregations,
      };
    } catch (error) {
      throw new McpAdrError(
        `Failed to query entities: ${error instanceof Error ? error.message : String(error)}`,
        'QUERY_ERROR'
      );
    }
  }

  /**
   * Find related entities through relationships
   */
  async findRelatedEntities(
    entityId: string,
    maxDepth = 2,
    relationshipTypes?: MemoryRelationship['type'][]
  ): Promise<{
    entities: MemoryEntity[];
    relationshipPaths: Array<{
      path: string[];
      relationships: MemoryRelationship[];
      depth: number;
    }>;
  }> {
    const visited = new Set<string>();
    const paths: Array<{ path: string[]; relationships: MemoryRelationship[]; depth: number }> = [];
    const relatedEntities = new Map<string, MemoryEntity>();

    const traverse = (
      currentId: string,
      currentPath: string[],
      currentRelationships: MemoryRelationship[],
      depth: number
    ) => {
      if (depth > maxDepth || visited.has(currentId)) return;

      visited.add(currentId);
      const currentEntity = this.entitiesCache.get(currentId);
      if (!currentEntity) return;

      if (depth > 0) {
        relatedEntities.set(currentId, currentEntity);
        paths.push({
          path: [...currentPath, currentId],
          relationships: [...currentRelationships],
          depth,
        });
      }

      // Find outgoing relationships
      const outgoingRels = Array.from(this.relationshipsCache.values()).filter(rel => {
        if (rel.sourceId !== currentId) return false;
        if (relationshipTypes?.length && !relationshipTypes.includes(rel.type)) return false;
        return true;
      });

      for (const rel of outgoingRels) {
        if (!visited.has(rel.targetId)) {
          traverse(
            rel.targetId,
            [...currentPath, currentId],
            [...currentRelationships, rel],
            depth + 1
          );
        }
      }
    };

    traverse(entityId, [], [], 0);

    return {
      entities: Array.from(relatedEntities.values()),
      relationshipPaths: paths,
    };
  }

  /**
   * Get memory intelligence data
   */
  async getIntelligence(): Promise<MemoryIntelligence> {
    if (!this.intelligence) {
      await this.initializeIntelligence();
    }
    return this.intelligence!;
  }

  /**
   * Create a memory snapshot
   */
  async createSnapshot(): Promise<MemorySnapshot> {
    const now = new Date().toISOString();
    const intelligence = await this.getIntelligence();

    const entities = Array.from(this.entitiesCache.values());
    const relationships = Array.from(this.relationshipsCache.values());

    const totalConfidence = entities.reduce((sum, e) => sum + e.confidence, 0);
    const averageConfidence = entities.length > 0 ? totalConfidence / entities.length : 0;

    return {
      id: crypto.randomUUID(),
      timestamp: now,
      version: '1.0.0',
      entities,
      relationships,
      intelligence,
      metadata: {
        totalEntities: entities.length,
        totalRelationships: relationships.length,
        averageConfidence,
        lastOptimization: now,
      },
    };
  }

  // Private helper methods

  private async ensureMemoryDirectory(): Promise<void> {
    try {
      await fs.access(this.memoryDir);
    } catch {
      await fs.mkdir(this.memoryDir, { recursive: true });
    }
  }

  private async loadFromPersistence(): Promise<void> {
    try {
      // Load entities
      try {
        const entitiesData = await fs.readFile(this.entitiesFile, 'utf-8');
        const entities = JSON.parse(entitiesData) as MemoryEntity[];
        entities.forEach(entity => {
          this.entitiesCache.set(entity.id, entity);
        });
      } catch {
        // No entities file exists yet
      }

      // Load relationships
      try {
        const relationshipsData = await fs.readFile(this.relationshipsFile, 'utf-8');
        const relationships = JSON.parse(relationshipsData) as MemoryRelationship[];
        relationships.forEach(relationship => {
          this.relationshipsCache.set(relationship.id, relationship);
        });
      } catch {
        // No relationships file exists yet
      }

      // Load intelligence
      try {
        const intelligenceData = await fs.readFile(this.intelligenceFile, 'utf-8');
        this.intelligence = JSON.parse(intelligenceData);
      } catch {
        // Will initialize default intelligence
      }
    } catch (error) {
      this.logger.warn('Failed to load some memory data from persistence', 'MemoryEntityManager', {
        error,
      });
    }
  }

  private async maybePersist(): Promise<void> {
    const now = Date.now();
    const timeSinceLastSnapshot = now - this.lastSnapshotTime;
    const snapshotIntervalMs = this.config.snapshotFrequency * 60 * 1000;

    if (timeSinceLastSnapshot >= snapshotIntervalMs) {
      await this.persistToStorage();
      this.lastSnapshotTime = now;
    }
  }

  private async persistToStorage(): Promise<void> {
    try {
      await this.ensureMemoryDirectory();

      // Save entities
      const entities = Array.from(this.entitiesCache.values());
      await fs.writeFile(this.entitiesFile, JSON.stringify(entities, null, 2));

      // Save relationships
      const relationships = Array.from(this.relationshipsCache.values());
      await fs.writeFile(this.relationshipsFile, JSON.stringify(relationships, null, 2));

      // Save intelligence
      if (this.intelligence) {
        await fs.writeFile(this.intelligenceFile, JSON.stringify(this.intelligence, null, 2));
      }

      this.logger.debug('Memory data persisted to storage', 'MemoryEntityManager', {
        entityCount: entities.length,
        relationshipCount: relationships.length,
      });
    } catch (error) {
      this.logger.error(
        'Failed to persist memory data',
        'MemoryEntityManager',
        error instanceof Error ? error : undefined,
        { error }
      );
    }
  }

  private async initializeIntelligence(): Promise<void> {
    if (!this.intelligence) {
      this.intelligence = {
        contextAwareness: {
          currentContext: {},
          contextHistory: [],
        },
        patternRecognition: {
          discoveredPatterns: [],
          patternConfidence: {},
          emergentBehaviors: [],
        },
        relationshipInference: {
          suggestedRelationships: [],
          weakConnections: [],
          conflictDetection: [],
        },
        adaptiveRecommendations: {
          nextActions: [],
          knowledgeGaps: [],
          optimizationOpportunities: [],
        },
      };
    }
  }

  private async updateIntelligence(eventType: string, context: any): Promise<void> {
    if (!this.intelligence) await this.initializeIntelligence();

    // Update context awareness
    this.intelligence!.contextAwareness.currentContext = {
      ...this.intelligence!.contextAwareness.currentContext,
      lastEvent: eventType,
      lastEventTime: new Date().toISOString(),
      ...context,
    };

    // Basic pattern recognition - could be enhanced with ML
    if (eventType === 'entity_updated') {
      const pattern = `${context.entityType}_update`;
      this.intelligence!.patternRecognition.patternConfidence[pattern] =
        (this.intelligence!.patternRecognition.patternConfidence[pattern] || 0) + 1;
    }

    // Update recommendations based on current state
    await this.updateRecommendations();
  }

  private async updateRecommendations(): Promise<void> {
    if (!this.intelligence) return;

    const entities = Array.from(this.entitiesCache.values());
    const relationships = Array.from(this.relationshipsCache.values());

    // Identify knowledge gaps (entities with low confidence)
    const knowledgeGaps = entities
      .filter(e => e.confidence < 0.5)
      .map(e => `Low confidence in ${e.type}: ${e.title}`)
      .slice(0, 5);

    // Suggest relationships for entities without many connections
    const suggestedRelationships = [];
    for (const entity of entities) {
      const entityRelationships = relationships.filter(
        r => r.sourceId === entity.id || r.targetId === entity.id
      );
      if (entityRelationships.length < 2) {
        // Find potential relationships based on tags or type similarity
        const similar = entities.filter(
          other =>
            other.id !== entity.id &&
            (other.type === entity.type || other.tags.some(tag => entity.tags.includes(tag)))
        );

        for (const similarEntity of similar.slice(0, 2)) {
          suggestedRelationships.push({
            sourceId: entity.id,
            targetId: similarEntity.id,
            type: 'relates_to' as const,
            confidence: 0.6,
            reasoning: `Similar ${entity.type} entities with overlapping tags`,
          });
        }
      }
    }

    this.intelligence.adaptiveRecommendations = {
      nextActions: [
        {
          action: 'Validate low-confidence entities',
          priority: 1,
          reasoning: 'Several entities have confidence below 50%',
          requiredEntities: entities
            .filter(e => e.confidence < 0.5)
            .map(e => e.id)
            .slice(0, 3),
        },
      ],
      knowledgeGaps,
      optimizationOpportunities: [
        'Consider consolidating similar entities',
        'Review and strengthen weak relationships',
        'Add more context to entities with generic descriptions',
      ],
    };

    this.intelligence.relationshipInference.suggestedRelationships = suggestedRelationships.slice(
      0,
      10
    );
  }

  private updateEntityRelationships(entity: MemoryEntity, relationship: MemoryRelationship): void {
    // Add relationship to entity's relationship list if not already present
    const existingRelIndex = entity.relationships.findIndex(
      r => r.targetId === relationship.targetId && r.type === relationship.type
    );

    const entityRel = {
      targetId: relationship.targetId,
      type: relationship.type,
      strength: relationship.strength,
      context: relationship.context,
      created: relationship.created,
    };

    if (existingRelIndex >= 0) {
      entity.relationships[existingRelIndex] = entityRel;
    } else {
      entity.relationships.push(entityRel);
    }
  }

  private calculateChanges(oldEntity: MemoryEntity, newEntity: MemoryEntity): Record<string, any> {
    const changes: Record<string, any> = {};

    // Convert to any to avoid index signature access issues
    const oldAny = oldEntity as any;
    const newAny = newEntity as any;

    if (oldAny['title'] !== newAny['title'])
      changes['title'] = { old: oldAny['title'], new: newAny['title'] };
    if (oldAny['description'] !== newAny['description'])
      changes['description'] = { old: oldAny['description'], new: newAny['description'] };
    if (oldEntity['confidence'] !== newEntity['confidence'])
      changes['confidence'] = { old: oldEntity['confidence'], new: newEntity['confidence'] };
    if (oldEntity['relevance'] !== newEntity['relevance'])
      changes['relevance'] = { old: oldEntity['relevance'], new: newEntity['relevance'] };

    return changes;
  }

  private async logEvolutionEvent(event: MemoryEvolutionEvent): Promise<void> {
    try {
      let existingLog: MemoryEvolutionEvent[] = [];

      try {
        const logData = await fs.readFile(this.evolutionLogFile, 'utf-8');
        existingLog = JSON.parse(logData);
      } catch {
        // Log file doesn't exist yet
      }

      existingLog.push(event);

      // Keep only the last 1000 events to manage file size
      if (existingLog.length > 1000) {
        existingLog = existingLog.slice(-1000);
      }

      await fs.writeFile(this.evolutionLogFile, JSON.stringify(existingLog, null, 2));
    } catch (error) {
      this.logger.warn('Failed to log evolution event', 'MemoryEntityManager', { event, error });
    }
  }

  /**
   * Create cross-tool relationships using the MemoryRelationshipMapper
   */
  async createCrossToolRelationships(): Promise<{
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
    autoCreatedCount: number;
  }> {
    const { MemoryRelationshipMapper } = await import('./memory-relationship-mapper.js');
    const mapper = new MemoryRelationshipMapper(this);

    this.logger.info('Starting cross-tool relationship creation', 'MemoryEntityManager');

    const result = await mapper.createCrossToolRelationships();

    const autoCreatedCount = result.suggestedRelationships.filter(
      rel => rel.confidence >= 0.8
    ).length;

    this.logger.info('Cross-tool relationships created', 'MemoryEntityManager', {
      totalSuggested: result.suggestedRelationships.length,
      autoCreated: autoCreatedCount,
      conflicts: result.conflicts.length,
    });

    return {
      ...result,
      autoCreatedCount,
    };
  }

  /**
   * Infer and suggest new relationships based on existing entity patterns
   */
  async inferRelationships(
    entityTypes?: MemoryEntity['type'][],
    minConfidence = 0.7
  ): Promise<{
    suggestedRelationships: Array<{
      sourceId: string;
      targetId: string;
      type: MemoryRelationship['type'];
      confidence: number;
      reasoning: string;
    }>;
  }> {
    const { MemoryRelationshipMapper } = await import('./memory-relationship-mapper.js');
    const mapper = new MemoryRelationshipMapper(this, { confidenceThreshold: minConfidence });

    const result = await mapper.createCrossToolRelationships();

    // Filter by entity types if specified
    let filteredSuggestions = result.suggestedRelationships;
    if (entityTypes && entityTypes.length > 0) {
      const entityCache = this.entitiesCache;
      filteredSuggestions = result.suggestedRelationships.filter(rel => {
        const sourceEntity = entityCache.get(rel.sourceId);
        const targetEntity = entityCache.get(rel.targetId);
        return (
          sourceEntity &&
          targetEntity &&
          (entityTypes.includes(sourceEntity.type) || entityTypes.includes(targetEntity.type))
        );
      });
    }

    return {
      suggestedRelationships: filteredSuggestions.filter(rel => rel.confidence >= minConfidence),
    };
  }

  /**
   * Validate existing relationships and detect conflicts
   */
  async validateRelationships(): Promise<{
    validRelationships: string[];
    invalidRelationships: Array<{
      relationshipId: string;
      reason: string;
      severity: 'low' | 'medium' | 'high';
    }>;
    suggestedActions: Array<{
      action: 'remove' | 'update' | 'investigate';
      relationshipId: string;
      reason: string;
    }>;
  }> {
    const validRelationships: string[] = [];
    const invalidRelationships: Array<{
      relationshipId: string;
      reason: string;
      severity: 'low' | 'medium' | 'high';
    }> = [];
    const suggestedActions: Array<{
      action: 'remove' | 'update' | 'investigate';
      relationshipId: string;
      reason: string;
    }> = [];

    for (const [relationshipId, relationship] of this.relationshipsCache) {
      // Check if both entities still exist
      const sourceExists = this.entitiesCache.has(relationship.sourceId);
      const targetExists = this.entitiesCache.has(relationship.targetId);

      if (!sourceExists || !targetExists) {
        invalidRelationships.push({
          relationshipId,
          reason: `${!sourceExists ? 'Source' : 'Target'} entity no longer exists`,
          severity: 'high',
        });
        suggestedActions.push({
          action: 'remove',
          relationshipId,
          reason: 'Orphaned relationship - entity deleted',
        });
        continue;
      }

      // Check relationship age and confidence
      const createdDate = new Date(relationship.created);
      const now = new Date();
      const ageInDays = (now.getTime() - createdDate.getTime()) / (1000 * 60 * 60 * 24);

      if (ageInDays > 90 && relationship.confidence < 0.6) {
        invalidRelationships.push({
          relationshipId,
          reason: 'Old relationship with low confidence',
          severity: 'medium',
        });
        suggestedActions.push({
          action: 'investigate',
          relationshipId,
          reason: 'Requires validation - old and low confidence',
        });
      } else if (relationship.strength < 0.3) {
        invalidRelationships.push({
          relationshipId,
          reason: 'Very low relationship strength',
          severity: 'low',
        });
        suggestedActions.push({
          action: 'update',
          relationshipId,
          reason: 'Consider strengthening or removing weak relationship',
        });
      } else {
        validRelationships.push(relationshipId);
      }
    }

    this.logger.info('Relationship validation completed', 'MemoryEntityManager', {
      total: this.relationshipsCache.size,
      valid: validRelationships.length,
      invalid: invalidRelationships.length,
      suggestedActions: suggestedActions.length,
    });

    return {
      validRelationships,
      invalidRelationships,
      suggestedActions,
    };
  }
}
