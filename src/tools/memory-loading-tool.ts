/**
 * Memory Loading Tool
 *
 * MCP tool for loading, exploring, and managing memory entities in the
 * memory-centric architecture system.
 */

import { MemoryEntityManager } from '../utils/memory-entity-manager.js';
import { MemoryTransformer } from '../utils/memory-transformation.js';
import { MemoryQuery, MemoryEntity, MemoryRelationship } from '../types/memory-entities.js';
import { discoverAdrsInDirectory } from '../utils/adr-discovery.js';
import { loadConfig } from '../utils/config.js';
import { McpAdrError } from '../types/index.js';
import { EnhancedLogger } from '../utils/enhanced-logging.js';

interface MemoryLoadingParams {
  // Query parameters
  query?: {
    entityTypes?: string[];
    tags?: string[];
    textQuery?: string;
    relationshipTypes?: string[];
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
  };

  // Actions
  action?:
    | 'load_adrs'
    | 'query_entities'
    | 'get_entity'
    | 'find_related'
    | 'get_intelligence'
    | 'create_snapshot';

  // Parameters for specific actions
  entityId?: string; // For get_entity, find_related
  maxDepth?: number; // For find_related
  forceReload?: boolean; // For load_adrs
}

export class MemoryLoadingTool {
  private memoryManager: MemoryEntityManager;
  private memoryTransformer: MemoryTransformer;
  private logger: EnhancedLogger;
  private config: ReturnType<typeof loadConfig>;

  constructor(
    memoryManager?: MemoryEntityManager,
    private adrDiscoveryFn?: typeof discoverAdrsInDirectory
  ) {
    this.logger = new EnhancedLogger({});
    this.config = loadConfig();
    this.memoryManager = memoryManager || new MemoryEntityManager();
    this.memoryTransformer = new MemoryTransformer(this.memoryManager);
  }

  async initialize(): Promise<void> {
    await this.memoryManager.initialize();
  }

  async execute(params: MemoryLoadingParams): Promise<{
    content: Array<{ type: 'text'; text: string }>;
    isError?: boolean;
  }> {
    try {
      await this.initialize();

      const action = params.action || 'query_entities';

      switch (action) {
        case 'load_adrs':
          return await this.loadAdrsIntoMemory(params.forceReload || false);

        case 'query_entities':
          return await this.queryMemoryEntities(params.query || {});

        case 'get_entity':
          if (!params.entityId) {
            throw new McpAdrError('entityId required for get_entity action', 'MISSING_PARAMETER');
          }
          return await this.getMemoryEntity(params.entityId);

        case 'find_related':
          if (!params.entityId) {
            throw new McpAdrError('entityId required for find_related action', 'MISSING_PARAMETER');
          }
          return await this.findRelatedEntities(params.entityId, params.maxDepth || 2);

        case 'get_intelligence':
          return await this.getMemoryIntelligence();

        case 'create_snapshot':
          return await this.createMemorySnapshot();

        default:
          throw new McpAdrError(`Unknown action: ${action}`, 'INVALID_ACTION');
      }
    } catch (error) {
      this.logger.error(
        'Memory loading tool execution failed',
        'MemoryLoadingTool',
        error instanceof Error ? error : undefined,
        { params, error }
      );
      return {
        content: [
          {
            type: 'text',
            text: `Memory loading failed: ${error instanceof Error ? error.message : String(error)}`,
          },
        ],
        isError: true,
      };
    }
  }

  private async loadAdrsIntoMemory(forceReload: boolean): Promise<{
    content: Array<{ type: 'text'; text: string }>;
  }> {
    try {
      this.logger.info('Loading ADRs into memory system', 'MemoryLoadingTool', {
        adrDirectory: this.config.adrDirectory,
        forceReload,
      });

      // Discover ADRs in the configured directory
      const discoveryFn = this.adrDiscoveryFn || discoverAdrsInDirectory;
      const adrDiscovery = await discoveryFn(this.config.adrDirectory, this.config.projectPath, {
        includeContent: true, // Include content for transformation
        includeTimeline: false,
      });

      if (adrDiscovery.totalAdrs === 0) {
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(
                {
                  status: 'no_adrs_found',
                  message: 'No ADRs found in the configured directory',
                  directory: this.config.adrDirectory,
                  recommendations: adrDiscovery.recommendations,
                },
                null,
                2
              ),
            },
          ],
        };
      }

      // Transform ADRs to memory entities
      const { entities, relationships } =
        await this.memoryTransformer.transformAdrCollectionToMemories(adrDiscovery.adrs);

      // Store entities and relationships in memory system
      const storedEntities = [];
      for (const entity of entities) {
        const stored = await this.memoryManager.upsertEntity(entity);
        storedEntities.push({
          id: stored.id,
          title: stored.title,
          type: stored.type,
          confidence: stored.confidence,
          status: entity.type === 'architectural_decision' ? entity.decisionData.status : 'unknown',
        });
      }

      const storedRelationships = [];
      for (const relationship of relationships) {
        const stored = await this.memoryManager.upsertRelationship(relationship);
        storedRelationships.push({
          id: stored.id,
          type: stored.type,
          sourceTitle: storedEntities.find(e => e.id === stored.sourceId)?.title || 'Unknown',
          targetTitle: storedEntities.find(e => e.id === stored.targetId)?.title || 'Unknown',
          strength: stored.strength,
          confidence: stored.confidence,
        });
      }

      const result = {
        status: 'success',
        message: `Successfully loaded ${storedEntities.length} ADRs into memory system`,
        summary: {
          totalAdrs: adrDiscovery.totalAdrs,
          entitiesCreated: storedEntities.length,
          relationshipsInferred: storedRelationships.length,
          statusDistribution: adrDiscovery.summary.byStatus,
          categoryDistribution: adrDiscovery.summary.byCategory,
        },
        entities: storedEntities,
        relationships: storedRelationships,
        transformation: {
          averageConfidence: entities.reduce((sum, e) => sum + e.confidence, 0) / entities.length,
          technicalStackCoverage: [...new Set(entities.flatMap(e => e.context.technicalStack))],
          businessDomains: [
            ...new Set(entities.map(e => e.context.businessDomain).filter(Boolean)),
          ],
        },
      };

      this.logger.info('ADRs successfully loaded into memory system', 'MemoryLoadingTool', {
        entitiesCreated: storedEntities.length,
        relationshipsCreated: storedRelationships.length,
      });

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(result, null, 2),
          },
        ],
      };
    } catch (error) {
      throw new McpAdrError(
        `Failed to load ADRs into memory: ${error instanceof Error ? error.message : String(error)}`,
        'ADR_LOADING_ERROR'
      );
    }
  }

  private async queryMemoryEntities(queryParams: MemoryLoadingParams['query'] = {}): Promise<{
    content: Array<{ type: 'text'; text: string }>;
  }> {
    try {
      // Convert string arrays to typed arrays for validation
      const memoryQuery: MemoryQuery = {};

      if (queryParams.entityTypes)
        memoryQuery.entityTypes = queryParams.entityTypes as MemoryEntity['type'][];
      if (queryParams.relationshipTypes)
        memoryQuery.relationshipTypes =
          queryParams.relationshipTypes as MemoryRelationship['type'][];
      if (queryParams.tags) memoryQuery.tags = queryParams.tags;
      if (queryParams.textQuery) memoryQuery.textQuery = queryParams.textQuery;
      if (queryParams.confidenceThreshold !== undefined)
        memoryQuery.confidenceThreshold = queryParams.confidenceThreshold;
      if (queryParams.relevanceThreshold !== undefined)
        memoryQuery.relevanceThreshold = queryParams.relevanceThreshold;
      if (queryParams.timeRange) memoryQuery.timeRange = queryParams.timeRange;
      if (queryParams.contextFilters) memoryQuery.contextFilters = queryParams.contextFilters;
      if (queryParams.limit) memoryQuery.limit = queryParams.limit;
      if (queryParams.sortBy) memoryQuery.sortBy = queryParams.sortBy;
      if (queryParams.includeRelated !== undefined)
        memoryQuery.includeRelated = queryParams.includeRelated;
      if (queryParams.relationshipDepth)
        memoryQuery.relationshipDepth = queryParams.relationshipDepth;

      const queryResult = await this.memoryManager.queryEntities(memoryQuery);

      const result = {
        status: 'success',
        query: {
          parameters: queryParams,
          executionTime: queryResult.queryTime,
          totalResults: queryResult.totalCount,
          returnedResults: queryResult.entities.length,
        },
        entities: queryResult.entities.map(entity => ({
          id: entity.id,
          type: entity.type,
          title: entity.title,
          description:
            entity.description.length > 200
              ? entity.description.substring(0, 197) + '...'
              : entity.description,
          confidence: entity.confidence,
          relevance: entity.relevance,
          tags: entity.tags,
          created: entity.created,
          lastModified: entity.lastModified,
          accessCount: entity.accessPattern.accessCount,
          relationshipCount: entity.relationships.length,
          // Type-specific data preview
          ...(entity.type === 'architectural_decision' && {
            adrStatus: entity.decisionData.status,
            implementationStatus: entity.decisionData.implementationStatus,
          }),
          ...(entity.type === 'knowledge_artifact' && {
            artifactType: entity.artifactData.artifactType,
            format: entity.artifactData.format,
          }),
        })),
        relationships: queryParams.includeRelated
          ? queryResult.relationships.map(rel => ({
              id: rel.id,
              type: rel.type,
              strength: rel.strength,
              confidence: rel.confidence,
              sourceId: rel.sourceId,
              targetId: rel.targetId,
              context: rel.context,
            }))
          : [],
        aggregations: queryResult.aggregations,
        intelligence: {
          patterns: (
            await this.memoryManager.getIntelligence()
          ).patternRecognition.discoveredPatterns.slice(0, 3),
          recommendations: (
            await this.memoryManager.getIntelligence()
          ).adaptiveRecommendations.nextActions.slice(0, 3),
        },
      };

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(result, null, 2),
          },
        ],
      };
    } catch (error) {
      throw new McpAdrError(
        `Failed to query memory entities: ${error instanceof Error ? error.message : String(error)}`,
        'QUERY_ERROR'
      );
    }
  }

  private async getMemoryEntity(entityId: string): Promise<{
    content: Array<{ type: 'text'; text: string }>;
  }> {
    try {
      const entity = await this.memoryManager.getEntity(entityId);

      if (!entity) {
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(
                {
                  status: 'not_found',
                  message: `Entity with ID ${entityId} not found`,
                  entityId,
                },
                null,
                2
              ),
            },
          ],
        };
      }

      // Get related entities
      const relatedData = await this.memoryManager.findRelatedEntities(entityId, 2);

      const result = {
        status: 'success',
        entity: {
          ...entity,
          // Include full details for the requested entity
          evolution: entity.evolution,
          validation: entity.validation,
          accessPattern: entity.accessPattern,
        },
        relationships: {
          direct: entity.relationships,
          extended: relatedData.relationshipPaths.map(path => ({
            depth: path.depth,
            path: path.path,
            relationships: path.relationships.map(rel => ({
              type: rel.type,
              strength: rel.strength,
              context: rel.context,
            })),
          })),
        },
        relatedEntities: relatedData.entities.map(e => ({
          id: e.id,
          type: e.type,
          title: e.title,
          confidence: e.confidence,
          relevance: e.relevance,
        })),
        intelligence: {
          suggestedActions: (
            await this.memoryManager.getIntelligence()
          ).adaptiveRecommendations.nextActions.filter(action =>
            action.requiredEntities.includes(entityId)
          ),
        },
      };

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(result, null, 2),
          },
        ],
      };
    } catch (error) {
      throw new McpAdrError(
        `Failed to get memory entity: ${error instanceof Error ? error.message : String(error)}`,
        'ENTITY_GET_ERROR'
      );
    }
  }

  private async findRelatedEntities(
    entityId: string,
    maxDepth: number
  ): Promise<{
    content: Array<{ type: 'text'; text: string }>;
  }> {
    try {
      const relatedData = await this.memoryManager.findRelatedEntities(entityId, maxDepth);

      const result = {
        status: 'success',
        sourceEntityId: entityId,
        maxDepth,
        relatedEntities: relatedData.entities.map(entity => ({
          id: entity.id,
          type: entity.type,
          title: entity.title,
          description:
            entity.description.length > 150
              ? entity.description.substring(0, 147) + '...'
              : entity.description,
          confidence: entity.confidence,
          relevance: entity.relevance,
          tags: entity.tags,
        })),
        relationshipPaths: relatedData.relationshipPaths.map(path => ({
          depth: path.depth,
          pathLength: path.path.length,
          entities: path.path,
          relationshipChain: path.relationships.map(rel => ({
            type: rel.type,
            strength: rel.strength,
            context: rel.context,
          })),
        })),
        statistics: {
          totalRelatedEntities: relatedData.entities.length,
          pathDistribution: relatedData.relationshipPaths.reduce(
            (acc, path) => {
              acc[`depth${path.depth}`] = (acc[`depth${path.depth}`] || 0) + 1;
              return acc;
            },
            {} as Record<string, number>
          ),
          relationshipTypes: relatedData.relationshipPaths
            .flatMap(path => path.relationships.map(rel => rel.type))
            .reduce(
              (acc, type) => {
                acc[type] = (acc[type] || 0) + 1;
                return acc;
              },
              {} as Record<string, number>
            ),
        },
      };

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(result, null, 2),
          },
        ],
      };
    } catch (error) {
      throw new McpAdrError(
        `Failed to find related entities: ${error instanceof Error ? error.message : String(error)}`,
        'RELATED_ENTITIES_ERROR'
      );
    }
  }

  private async getMemoryIntelligence(): Promise<{
    content: Array<{ type: 'text'; text: string }>;
  }> {
    try {
      const intelligence = await this.memoryManager.getIntelligence();

      const result = {
        status: 'success',
        intelligence: {
          contextAwareness: {
            currentContext: intelligence.contextAwareness.currentContext,
            recentContextChanges: intelligence.contextAwareness.contextHistory.slice(-5),
          },
          patternRecognition: {
            discoveredPatterns: intelligence.patternRecognition.discoveredPatterns.map(pattern => ({
              pattern: pattern.pattern,
              confidence: pattern.confidence,
              frequency: pattern.frequency,
              contexts: pattern.contexts,
              applicabilityScore: pattern.applicabilityScore,
            })),
            patternConfidence: intelligence.patternRecognition.patternConfidence,
            emergentBehaviors: intelligence.patternRecognition.emergentBehaviors,
          },
          relationshipInference: {
            suggestedRelationships: intelligence.relationshipInference.suggestedRelationships,
            weakConnections: intelligence.relationshipInference.weakConnections,
            conflictDetection: intelligence.relationshipInference.conflictDetection,
          },
          adaptiveRecommendations: intelligence.adaptiveRecommendations,
        },
      };

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(result, null, 2),
          },
        ],
      };
    } catch (error) {
      throw new McpAdrError(
        `Failed to get memory intelligence: ${error instanceof Error ? error.message : String(error)}`,
        'INTELLIGENCE_ERROR'
      );
    }
  }

  private async createMemorySnapshot(): Promise<{
    content: Array<{ type: 'text'; text: string }>;
  }> {
    try {
      const snapshot = await this.memoryManager.createSnapshot();

      const result = {
        status: 'success',
        snapshot: {
          id: snapshot.id,
          timestamp: snapshot.timestamp,
          version: snapshot.version,
          metadata: snapshot.metadata,
          entitySummary: {
            totalEntities: snapshot.entities.length,
            byType: snapshot.entities.reduce(
              (acc, entity) => {
                acc[entity.type] = (acc[entity.type] || 0) + 1;
                return acc;
              },
              {} as Record<string, number>
            ),
            averageConfidence: snapshot.metadata.averageConfidence,
          },
          relationshipSummary: {
            totalRelationships: snapshot.relationships.length,
            byType: snapshot.relationships.reduce(
              (acc, rel) => {
                acc[rel.type] = (acc[rel.type] || 0) + 1;
                return acc;
              },
              {} as Record<string, number>
            ),
          },
          intelligenceSummary: {
            discoveredPatterns: snapshot.intelligence.patternRecognition.discoveredPatterns.length,
            suggestedRelationships:
              snapshot.intelligence.relationshipInference.suggestedRelationships.length,
            nextActions: snapshot.intelligence.adaptiveRecommendations.nextActions.length,
            knowledgeGaps: snapshot.intelligence.adaptiveRecommendations.knowledgeGaps.length,
          },
        },
      };

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(result, null, 2),
          },
        ],
      };
    } catch (error) {
      throw new McpAdrError(
        `Failed to create memory snapshot: ${error instanceof Error ? error.message : String(error)}`,
        'SNAPSHOT_ERROR'
      );
    }
  }
}
