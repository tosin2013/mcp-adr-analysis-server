/**
 * Memory Snapshots Resource
 *
 * MCP Resource implementation for memory system snapshots and queries.
 * Bridges to memory-loading-tool for actual operations.
 *
 * URI Templates:
 * - adr://memory-snapshots/current - Current memory snapshot
 * - adr://memory-snapshots/query - Query memory entities
 * - adr://memory-snapshots/entity/{entityId} - Get specific entity
 * - adr://memory-snapshots/related/{entityId} - Find related entities
 * - adr://memory-snapshots/intelligence - Memory intelligence analysis
 * - adr://memory-snapshots/load-adrs - Load ADRs into memory
 *
 * Query Parameters:
 * - entityTypes: Filter by entity types (comma-separated)
 * - tags: Filter by tags (comma-separated)
 * - textQuery: Text search query
 * - relationshipTypes: Filter by relationship types (comma-separated)
 * - confidenceThreshold: Minimum confidence score (0-1)
 * - relevanceThreshold: Minimum relevance score (0-1)
 * - limit: Maximum results to return
 * - sortBy: Sort order (relevance, confidence, lastModified, created, accessCount)
 * - includeRelated: Include related entities (true/false)
 * - relationshipDepth: Depth of relationships to traverse (1-5)
 * - maxDepth: Maximum depth for find_related (1-10)
 * - forceReload: Force reload of ADRs (true/false)
 */

import { URLSearchParams } from 'url';
import { MemoryLoadingTool } from '../tools/memory-loading-tool.js';
import { EnhancedLogger } from '../utils/enhanced-logging.js';
import { ResourceCache } from './resource-cache.js';

interface ParsedMemoryUri {
  operation:
    | 'current'
    | 'query'
    | 'entity'
    | 'related'
    | 'intelligence'
    | 'load-adrs';
  entityId?: string;
}

export class MemorySnapshotsResource {
  private memoryLoadingTool: MemoryLoadingTool;
  private logger: EnhancedLogger;
  private cache: ResourceCache;
  private readonly CACHE_TTL = 5 * 60; // 5 minutes in seconds

  constructor(memoryLoadingTool?: MemoryLoadingTool) {
    this.memoryLoadingTool = memoryLoadingTool || new MemoryLoadingTool();
    this.logger = new EnhancedLogger({});
    this.cache = new ResourceCache();
  }

  /**
   * Parse memory URI to extract operation and entity ID
   */
  private parseUri(uri: string): ParsedMemoryUri {
    // Remove protocol and base path
    const path = uri.replace('adr://memory-snapshots/', '');

    // Handle entity and related URIs with ID
    if (path.startsWith('entity/')) {
      return {
        operation: 'entity',
        entityId: path.replace('entity/', ''),
      };
    }

    if (path.startsWith('related/')) {
      return {
        operation: 'related',
        entityId: path.replace('related/', ''),
      };
    }

    // Handle other operations
    switch (path) {
      case 'current':
        return { operation: 'current' };
      case 'query':
        return { operation: 'query' };
      case 'intelligence':
        return { operation: 'intelligence' };
      case 'load-adrs':
        return { operation: 'load-adrs' };
      default:
        throw new Error(`Invalid memory URI: ${uri}`);
    }
  }

  /**
   * Parse query parameters from URI
   */
  private parseQueryParams(uri: string): Record<string, string> {
    const queryString = uri.split('?')[1];
    if (!queryString) return {};

    const params: Record<string, string> = {};
    const pairs = queryString.split('&');
    for (const pair of pairs) {
      const [key, value] = pair.split('=');
      if (key && value) {
        params[decodeURIComponent(key)] = decodeURIComponent(value);
      }
    }
    return params;
  }

  /**
   * Convert query parameters to memory loading tool parameters
   */
  private buildToolParams(
    operation: string,
    entityId: string | undefined,
    queryParams: Record<string, string>
  ): any {
    const params: any = {};

    // Set action based on operation
    switch (operation) {
      case 'current':
        params.action = 'create_snapshot';
        break;
      case 'query':
        params.action = 'query_entities';
        break;
      case 'entity':
        params.action = 'get_entity';
        params.entityId = entityId;
        break;
      case 'related':
        params.action = 'find_related';
        params.entityId = entityId;
        if (queryParams['maxDepth']) {
          params.maxDepth = parseInt(queryParams['maxDepth'], 10);
        }
        break;
      case 'intelligence':
        params.action = 'get_intelligence';
        break;
      case 'load-adrs':
        params.action = 'load_adrs';
        if (queryParams['forceReload']) {
          params.forceReload = queryParams['forceReload'] === 'true';
        }
        break;
    }

    // Build query object for query_entities action
    if (operation === 'query') {
      params.query = {};

      if (queryParams['entityTypes']) {
        params.query.entityTypes = queryParams['entityTypes'].split(',');
      }
      if (queryParams['tags']) {
        params.query.tags = queryParams['tags'].split(',');
      }
      if (queryParams['textQuery']) {
        params.query.textQuery = queryParams['textQuery'];
      }
      if (queryParams['relationshipTypes']) {
        params.query.relationshipTypes = queryParams['relationshipTypes'].split(',');
      }
      if (queryParams['confidenceThreshold']) {
        params.query.confidenceThreshold = parseFloat(queryParams['confidenceThreshold']);
      }
      if (queryParams['relevanceThreshold']) {
        params.query.relevanceThreshold = parseFloat(queryParams['relevanceThreshold']);
      }
      if (queryParams['limit']) {
        params.query.limit = parseInt(queryParams['limit'], 10);
      }
      if (queryParams['sortBy']) {
        params.query.sortBy = queryParams['sortBy'];
      }
      if (queryParams['includeRelated']) {
        params.query.includeRelated = queryParams['includeRelated'] === 'true';
      }
      if (queryParams['relationshipDepth']) {
        params.query.relationshipDepth = parseInt(queryParams['relationshipDepth'], 10);
      }
    }

    return params;
  }

  /**
   * Extract structured data from memory loading tool response
   */
  private extractMemoryData(toolResponse: string): any {
    try {
      const parsed = JSON.parse(toolResponse);

      // Handle different response structures based on action
      if (parsed.status === 'success') {
        return parsed;
      }

      if (parsed.status === 'no_adrs_found') {
        return {
          status: 'empty',
          message: parsed.message,
          recommendations: parsed.recommendations || [],
        };
      }

      if (parsed.status === 'not_found') {
        return {
          status: 'not_found',
          message: parsed.message,
          entityId: parsed.entityId,
        };
      }

      return parsed;
    } catch (error) {
      // If JSON parsing fails, return raw text
      return {
        status: 'raw',
        content: toolResponse,
      };
    }
  }

  /**
   * Generate human-readable content from memory data
   */
  private formatMemoryContent(
    operation: string,
    data: any,
    queryParams: Record<string, string>
  ): string {
    const sections: string[] = [];

    // Header
    sections.push('# Memory Snapshots Resource');
    sections.push(`Operation: ${operation}`);
    sections.push('');

    // Handle different operations
    switch (operation) {
      case 'current':
        return this.formatSnapshotContent(data);

      case 'query':
        return this.formatQueryContent(data, queryParams);

      case 'entity':
        return this.formatEntityContent(data);

      case 'related':
        return this.formatRelatedContent(data);

      case 'intelligence':
        return this.formatIntelligenceContent(data);

      case 'load-adrs':
        return this.formatLoadAdrsContent(data);

      default:
        sections.push('## Raw Data');
        sections.push('```json');
        sections.push(JSON.stringify(data, null, 2));
        sections.push('```');
    }

    return sections.join('\n');
  }

  private formatSnapshotContent(data: any): string {
    const sections: string[] = [];

    sections.push('# Memory Snapshot');
    sections.push('');

    if (data.status === 'success' && data.snapshot) {
      const snapshot = data.snapshot;

      sections.push('## Snapshot Information');
      sections.push(`- **ID**: ${snapshot.id}`);
      sections.push(`- **Timestamp**: ${snapshot.timestamp}`);
      sections.push(`- **Version**: ${snapshot.version}`);
      sections.push('');

      sections.push('## Entity Summary');
      sections.push(`- **Total Entities**: ${snapshot.entitySummary.totalEntities}`);
      sections.push(`- **Average Confidence**: ${(snapshot.entitySummary.averageConfidence * 100).toFixed(1)}%`);
      sections.push('');

      sections.push('### Entities by Type');
      for (const [type, count] of Object.entries(snapshot.entitySummary.byType)) {
        sections.push(`- ${type}: ${count}`);
      }
      sections.push('');

      sections.push('## Relationship Summary');
      sections.push(`- **Total Relationships**: ${snapshot.relationshipSummary.totalRelationships}`);
      sections.push('');

      sections.push('### Relationships by Type');
      for (const [type, count] of Object.entries(snapshot.relationshipSummary.byType)) {
        sections.push(`- ${type}: ${count}`);
      }
      sections.push('');

      sections.push('## Intelligence Summary');
      sections.push(`- **Discovered Patterns**: ${snapshot.intelligenceSummary.discoveredPatterns}`);
      sections.push(`- **Suggested Relationships**: ${snapshot.intelligenceSummary.suggestedRelationships}`);
      sections.push(`- **Next Actions**: ${snapshot.intelligenceSummary.nextActions}`);
      sections.push(`- **Knowledge Gaps**: ${snapshot.intelligenceSummary.knowledgeGaps}`);
    } else {
      sections.push(`Status: ${data.status || 'unknown'}`);
      sections.push('');
      sections.push('```json');
      sections.push(JSON.stringify(data, null, 2));
      sections.push('```');
    }

    return sections.join('\n');
  }

  private formatQueryContent(data: any, queryParams: Record<string, string>): string {
    const sections: string[] = [];

    sections.push('# Memory Query Results');
    sections.push('');

    if (data.status === 'success' && data.entities) {
      sections.push('## Query Information');
      sections.push(`- **Total Results**: ${data.query.totalResults}`);
      sections.push(`- **Returned**: ${data.query.returnedResults}`);
      sections.push(`- **Execution Time**: ${data.query.executionTime}ms`);
      sections.push('');

      if (Object.keys(queryParams).length > 0) {
        sections.push('### Applied Filters');
        for (const [key, value] of Object.entries(queryParams)) {
          sections.push(`- ${key}: ${value}`);
        }
        sections.push('');
      }

      sections.push('## Entities');
      for (const entity of data.entities) {
        sections.push(`### ${entity.title}`);
        sections.push(`- **ID**: ${entity.id}`);
        sections.push(`- **Type**: ${entity.type}`);
        sections.push(`- **Confidence**: ${(entity.confidence * 100).toFixed(1)}%`);
        if (entity.relevance !== undefined) {
          sections.push(`- **Relevance**: ${(entity.relevance * 100).toFixed(1)}%`);
        }
        sections.push(`- **Access Count**: ${entity.accessCount}`);
        sections.push(`- **Relationships**: ${entity.relationshipCount}`);
        sections.push(`- **Tags**: ${entity.tags.join(', ')}`);
        sections.push('');
        sections.push(`**Description**: ${entity.description}`);
        sections.push('');

        if (entity.adrStatus) {
          sections.push(`- **ADR Status**: ${entity.adrStatus}`);
          sections.push(`- **Implementation Status**: ${entity.implementationStatus}`);
          sections.push('');
        }

        if (entity.artifactType) {
          sections.push(`- **Artifact Type**: ${entity.artifactType}`);
          sections.push(`- **Format**: ${entity.format}`);
          sections.push('');
        }
      }

      if (data.relationships && data.relationships.length > 0) {
        sections.push('## Relationships');
        for (const rel of data.relationships) {
          sections.push(`- **${rel.type}**: ${rel.sourceId} → ${rel.targetId}`);
          sections.push(`  - Strength: ${(rel.strength * 100).toFixed(1)}%`);
          sections.push(`  - Confidence: ${(rel.confidence * 100).toFixed(1)}%`);
        }
        sections.push('');
      }

      if (data.intelligence) {
        sections.push('## Intelligence Insights');
        if (data.intelligence.patterns && data.intelligence.patterns.length > 0) {
          sections.push('### Patterns');
          for (const pattern of data.intelligence.patterns) {
            sections.push(`- ${pattern.pattern} (confidence: ${(pattern.confidence * 100).toFixed(1)}%)`);
          }
          sections.push('');
        }

        if (data.intelligence.recommendations && data.intelligence.recommendations.length > 0) {
          sections.push('### Recommendations');
          for (const rec of data.intelligence.recommendations) {
            sections.push(`- ${rec.action}`);
          }
          sections.push('');
        }
      }
    } else {
      sections.push(`Status: ${data.status || 'unknown'}`);
      sections.push('');
      sections.push('```json');
      sections.push(JSON.stringify(data, null, 2));
      sections.push('```');
    }

    return sections.join('\n');
  }

  private formatEntityContent(data: any): string {
    const sections: string[] = [];

    sections.push('# Memory Entity Details');
    sections.push('');

    if (data.status === 'success' && data.entity) {
      const entity = data.entity;

      sections.push('## Entity Information');
      sections.push(`- **ID**: ${entity.id}`);
      sections.push(`- **Title**: ${entity.title}`);
      sections.push(`- **Type**: ${entity.type}`);
      sections.push(`- **Confidence**: ${(entity.confidence * 100).toFixed(1)}%`);
      if (entity.relevance !== undefined) {
        sections.push(`- **Relevance**: ${(entity.relevance * 100).toFixed(1)}%`);
      }
      sections.push(`- **Created**: ${entity.created}`);
      sections.push(`- **Last Modified**: ${entity.lastModified}`);
      sections.push(`- **Tags**: ${entity.tags.join(', ')}`);
      sections.push('');

      sections.push('## Description');
      sections.push(entity.description);
      sections.push('');

      sections.push('## Access Pattern');
      sections.push(`- **Access Count**: ${entity.accessPattern.accessCount}`);
      sections.push(`- **Last Access**: ${entity.accessPattern.lastAccess}`);
      sections.push(`- **Access Frequency**: ${entity.accessPattern.accessFrequency}`);
      sections.push('');

      if (entity.evolution) {
        sections.push('## Evolution');
        sections.push(`- **Version**: ${entity.evolution.version}`);
        sections.push(`- **Change Count**: ${entity.evolution.changeHistory.length}`);
        sections.push('');
      }

      sections.push('## Direct Relationships');
      for (const rel of entity.relationships) {
        sections.push(`- **${rel.type}**: ${rel.relatedEntityId}`);
        sections.push(`  - Strength: ${(rel.strength * 100).toFixed(1)}%`);
      }
      sections.push('');

      if (data.relatedEntities && data.relatedEntities.length > 0) {
        sections.push('## Related Entities');
        for (const related of data.relatedEntities) {
          sections.push(`### ${related.title}`);
          sections.push(`- **ID**: ${related.id}`);
          sections.push(`- **Type**: ${related.type}`);
          sections.push(`- **Confidence**: ${(related.confidence * 100).toFixed(1)}%`);
          sections.push('');
        }
      }

      if (data.intelligence && data.intelligence.suggestedActions && data.intelligence.suggestedActions.length > 0) {
        sections.push('## Suggested Actions');
        for (const action of data.intelligence.suggestedActions) {
          sections.push(`- ${action.action}`);
        }
        sections.push('');
      }
    } else if (data.status === 'not_found') {
      sections.push(`⚠️ Entity not found: ${data.entityId}`);
    } else {
      sections.push(`Status: ${data.status || 'unknown'}`);
      sections.push('');
      sections.push('```json');
      sections.push(JSON.stringify(data, null, 2));
      sections.push('```');
    }

    return sections.join('\n');
  }

  private formatRelatedContent(data: any): string {
    const sections: string[] = [];

    sections.push('# Related Entities');
    sections.push('');

    if (data.status === 'success') {
      sections.push('## Query Information');
      sections.push(`- **Source Entity**: ${data.sourceEntityId}`);
      sections.push(`- **Max Depth**: ${data.maxDepth}`);
      sections.push(`- **Total Related**: ${data.statistics.totalRelatedEntities}`);
      sections.push('');

      sections.push('## Statistics');
      sections.push('### Path Distribution');
      for (const [depth, count] of Object.entries(data.statistics.pathDistribution)) {
        sections.push(`- ${depth}: ${count}`);
      }
      sections.push('');

      sections.push('### Relationship Types');
      for (const [type, count] of Object.entries(data.statistics.relationshipTypes)) {
        sections.push(`- ${type}: ${count}`);
      }
      sections.push('');

      sections.push('## Related Entities');
      for (const entity of data.relatedEntities) {
        sections.push(`### ${entity.title}`);
        sections.push(`- **ID**: ${entity.id}`);
        sections.push(`- **Type**: ${entity.type}`);
        sections.push(`- **Confidence**: ${(entity.confidence * 100).toFixed(1)}%`);
        sections.push(`- **Relevance**: ${(entity.relevance * 100).toFixed(1)}%`);
        sections.push('');
        sections.push(`**Description**: ${entity.description}`);
        sections.push('');
      }

      sections.push('## Relationship Paths');
      for (const path of data.relationshipPaths) {
        sections.push(`### Depth ${path.depth} (${path.pathLength} entities)`);
        sections.push('**Path**: ' + path.entities.join(' → '));
        sections.push('');
        sections.push('**Relationships**:');
        for (const rel of path.relationshipChain) {
          sections.push(`- ${rel.type} (strength: ${(rel.strength * 100).toFixed(1)}%)`);
        }
        sections.push('');
      }
    } else {
      sections.push(`Status: ${data.status || 'unknown'}`);
      sections.push('');
      sections.push('```json');
      sections.push(JSON.stringify(data, null, 2));
      sections.push('```');
    }

    return sections.join('\n');
  }

  private formatIntelligenceContent(data: any): string {
    const sections: string[] = [];

    sections.push('# Memory Intelligence');
    sections.push('');

    if (data.status === 'success' && data.intelligence) {
      const intel = data.intelligence;

      sections.push('## Context Awareness');
      sections.push('### Current Context');
      sections.push(`- **Project Phase**: ${intel.contextAwareness.currentContext.projectPhase}`);
      sections.push(`- **Business Domain**: ${intel.contextAwareness.currentContext.businessDomain}`);
      sections.push(`- **Technical Stack**: ${intel.contextAwareness.currentContext.technicalStack.join(', ')}`);
      sections.push('');

      if (intel.contextAwareness.recentContextChanges && intel.contextAwareness.recentContextChanges.length > 0) {
        sections.push('### Recent Context Changes');
        for (const change of intel.contextAwareness.recentContextChanges) {
          sections.push(`- ${change.timestamp}: ${change.description || 'Context updated'}`);
        }
        sections.push('');
      }

      sections.push('## Pattern Recognition');
      sections.push(`- **Pattern Confidence**: ${(intel.patternRecognition.patternConfidence * 100).toFixed(1)}%`);
      sections.push('');

      if (intel.patternRecognition.discoveredPatterns && intel.patternRecognition.discoveredPatterns.length > 0) {
        sections.push('### Discovered Patterns');
        for (const pattern of intel.patternRecognition.discoveredPatterns) {
          sections.push(`#### ${pattern.pattern}`);
          sections.push(`- **Confidence**: ${(pattern.confidence * 100).toFixed(1)}%`);
          sections.push(`- **Frequency**: ${pattern.frequency}`);
          sections.push(`- **Applicability Score**: ${(pattern.applicabilityScore * 100).toFixed(1)}%`);
          sections.push(`- **Contexts**: ${pattern.contexts.join(', ')}`);
          sections.push('');
        }
      }

      if (intel.patternRecognition.emergentBehaviors && intel.patternRecognition.emergentBehaviors.length > 0) {
        sections.push('### Emergent Behaviors');
        for (const behavior of intel.patternRecognition.emergentBehaviors) {
          sections.push(`- ${behavior}`);
        }
        sections.push('');
      }

      sections.push('## Relationship Inference');
      if (intel.relationshipInference.suggestedRelationships && intel.relationshipInference.suggestedRelationships.length > 0) {
        sections.push('### Suggested Relationships');
        for (const rel of intel.relationshipInference.suggestedRelationships) {
          sections.push(`- ${rel.sourceId} → ${rel.targetId} (${rel.type})`);
          sections.push(`  - Confidence: ${(rel.confidence * 100).toFixed(1)}%`);
          sections.push(`  - Reason: ${rel.reason}`);
        }
        sections.push('');
      }

      if (intel.relationshipInference.weakConnections && intel.relationshipInference.weakConnections.length > 0) {
        sections.push('### Weak Connections');
        for (const conn of intel.relationshipInference.weakConnections) {
          sections.push(`- ${conn.sourceId} ↔ ${conn.targetId} (strength: ${(conn.strength * 100).toFixed(1)}%)`);
        }
        sections.push('');
      }

      if (intel.relationshipInference.conflictDetection && intel.relationshipInference.conflictDetection.length > 0) {
        sections.push('### Conflict Detection');
        for (const conflict of intel.relationshipInference.conflictDetection) {
          sections.push(`- ${conflict.description}`);
          sections.push(`  - Severity: ${conflict.severity}`);
        }
        sections.push('');
      }

      sections.push('## Adaptive Recommendations');
      if (intel.adaptiveRecommendations.nextActions && intel.adaptiveRecommendations.nextActions.length > 0) {
        sections.push('### Next Actions');
        for (const action of intel.adaptiveRecommendations.nextActions) {
          sections.push(`#### ${action.action}`);
          sections.push(`- **Priority**: ${action.priority}`);
          sections.push(`- **Confidence**: ${(action.confidence * 100).toFixed(1)}%`);
          sections.push(`- **Reason**: ${action.reason}`);
          sections.push('');
        }
      }

      if (intel.adaptiveRecommendations.knowledgeGaps && intel.adaptiveRecommendations.knowledgeGaps.length > 0) {
        sections.push('### Knowledge Gaps');
        for (const gap of intel.adaptiveRecommendations.knowledgeGaps) {
          sections.push(`- ${gap.description} (impact: ${gap.impact})`);
        }
        sections.push('');
      }
    } else {
      sections.push(`Status: ${data.status || 'unknown'}`);
      sections.push('');
      sections.push('```json');
      sections.push(JSON.stringify(data, null, 2));
      sections.push('```');
    }

    return sections.join('\n');
  }

  private formatLoadAdrsContent(data: any): string {
    const sections: string[] = [];

    sections.push('# Load ADRs into Memory');
    sections.push('');

    if (data.status === 'success') {
      sections.push(`✅ ${data.message}`);
      sections.push('');

      sections.push('## Summary');
      sections.push(`- **Total ADRs**: ${data.summary.totalAdrs}`);
      sections.push(`- **Entities Created**: ${data.summary.entitiesCreated}`);
      sections.push(`- **Relationships Inferred**: ${data.summary.relationshipsInferred}`);
      sections.push('');

      sections.push('### Status Distribution');
      for (const [status, count] of Object.entries(data.summary.statusDistribution)) {
        sections.push(`- ${status}: ${count}`);
      }
      sections.push('');

      if (data.summary.categoryDistribution) {
        sections.push('### Category Distribution');
        for (const [category, count] of Object.entries(data.summary.categoryDistribution)) {
          sections.push(`- ${category}: ${count}`);
        }
        sections.push('');
      }

      sections.push('## Transformation Insights');
      sections.push(`- **Average Confidence**: ${(data.transformation.averageConfidence * 100).toFixed(1)}%`);
      sections.push(`- **Technical Stack**: ${data.transformation.technicalStackCoverage.join(', ')}`);
      sections.push(`- **Business Domains**: ${data.transformation.businessDomains.join(', ')}`);
      sections.push('');

      sections.push('## Created Entities');
      for (const entity of data.entities.slice(0, 10)) {
        sections.push(`- **${entity.title}** (${entity.type})`);
        sections.push(`  - ID: ${entity.id}`);
        sections.push(`  - Confidence: ${(entity.confidence * 100).toFixed(1)}%`);
        sections.push(`  - Status: ${entity.status}`);
      }
      if (data.entities.length > 10) {
        sections.push(`... and ${data.entities.length - 10} more`);
      }
      sections.push('');

      sections.push('## Inferred Relationships');
      for (const rel of data.relationships.slice(0, 10)) {
        sections.push(`- **${rel.type}**: ${rel.sourceTitle} → ${rel.targetTitle}`);
        sections.push(`  - Strength: ${(rel.strength * 100).toFixed(1)}%`);
        sections.push(`  - Confidence: ${(rel.confidence * 100).toFixed(1)}%`);
      }
      if (data.relationships.length > 10) {
        sections.push(`... and ${data.relationships.length - 10} more`);
      }
    } else if (data.status === 'no_adrs_found') {
      sections.push(`⚠️ ${data.message}`);
      sections.push('');
      if (data.recommendations && data.recommendations.length > 0) {
        sections.push('## Recommendations');
        for (const rec of data.recommendations) {
          sections.push(`- ${rec}`);
        }
      }
    } else {
      sections.push(`Status: ${data.status || 'unknown'}`);
      sections.push('');
      sections.push('```json');
      sections.push(JSON.stringify(data, null, 2));
      sections.push('```');
    }

    return sections.join('\n');
  }

  /**
   * Handle resource read request
   */
  async read(uri: string): Promise<{
    contents: Array<{
      uri: string;
      mimeType: string;
      text: string;
    }>;
  }> {
    try {
      this.logger.debug('Memory snapshots resource read', 'MemorySnapshotsResource', { uri });

      // Check cache first
      const cached = await this.cache.get<{
        contents: Array<{
          uri: string;
          mimeType: string;
          text: string;
        }>;
      }>(uri);
      if (cached) {
        this.logger.debug('Returning cached memory data', 'MemorySnapshotsResource', { uri });
        return cached;
      }

      // Parse URI
      const { operation, entityId } = this.parseUri(uri);
      const queryParams = this.parseQueryParams(uri);

      // Build tool parameters
      const toolParams = this.buildToolParams(operation, entityId, queryParams);

      // Execute memory loading tool
      const toolResult = await this.memoryLoadingTool.execute(toolParams);

      if (toolResult.isError || !toolResult.content || !toolResult.content[0]) {
        throw new Error(toolResult.content?.[0]?.text || 'Tool execution failed');
      }

      // Extract and format data
      const memoryData = this.extractMemoryData(toolResult.content[0].text);
      const formattedContent = this.formatMemoryContent(operation, memoryData, queryParams);

      const result = {
        contents: [
          {
            uri,
            mimeType: 'text/markdown',
            text: formattedContent,
          },
        ],
      };

      // Cache the result (TTL in seconds)
      this.cache.set(uri, result, this.CACHE_TTL);

      return result;
    } catch (error) {
      this.logger.error(
        'Memory snapshots resource read failed',
        'MemorySnapshotsResource',
        error instanceof Error ? error : undefined,
        { uri, error }
      );

      // Return error as resource content
      return {
        contents: [
          {
            uri,
            mimeType: 'text/markdown',
            text: `# Memory Snapshots Error\n\n⚠️ Failed to read memory resource:\n\n\`\`\`\n${error instanceof Error ? error.message : String(error)}\n\`\`\``,
          },
        ],
      };
    }
  }

  /**
   * List available memory snapshot resources
   */
  listTemplates(): Array<{
    uriTemplate: string;
    name: string;
    description: string;
    mimeType: string;
  }> {
    return [
      {
        uriTemplate: 'adr://memory-snapshots/current',
        name: 'Current Memory Snapshot',
        description: 'Current snapshot of the memory system with entities and relationships',
        mimeType: 'text/markdown',
      },
      {
        uriTemplate: 'adr://memory-snapshots/query?entityTypes={types}&tags={tags}&textQuery={query}',
        name: 'Query Memory Entities',
        description: 'Query memory entities with filters and search criteria',
        mimeType: 'text/markdown',
      },
      {
        uriTemplate: 'adr://memory-snapshots/entity/{entityId}',
        name: 'Memory Entity Details',
        description: 'Detailed information about a specific memory entity',
        mimeType: 'text/markdown',
      },
      {
        uriTemplate: 'adr://memory-snapshots/related/{entityId}?maxDepth={depth}',
        name: 'Related Entities',
        description: 'Find entities related to a specific entity with configurable depth',
        mimeType: 'text/markdown',
      },
      {
        uriTemplate: 'adr://memory-snapshots/intelligence',
        name: 'Memory Intelligence',
        description: 'Intelligence analysis including patterns, relationships, and recommendations',
        mimeType: 'text/markdown',
      },
      {
        uriTemplate: 'adr://memory-snapshots/load-adrs?forceReload={true|false}',
        name: 'Load ADRs into Memory',
        description: 'Load ADRs from the configured directory into the memory system',
        mimeType: 'text/markdown',
      },
    ];
  }
}

/**
 * Wrapper function for compatibility with resource generation pattern
 * Returns current memory snapshot by default
 */
export async function generateMemorySnapshotsResource(
  _params?: Record<string, string>,
  searchParams?: URLSearchParams
): Promise<{
  data: any;
  contentType: string;
  lastModified: string;
  cacheKey: string;
  ttl: number;
  etag: string;
}> {
  const resource = new MemorySnapshotsResource();

  // Build URI with query parameters
  let uri = 'adr://memory-snapshots/current';
  if (searchParams && searchParams.toString()) {
    uri += `?${searchParams.toString()}`;
  }

  const result = await resource.read(uri);

  if (!result.contents || !result.contents[0]) {
    throw new Error('Failed to generate memory snapshot');
  }

  return {
    data: result.contents[0].text,
    contentType: result.contents[0].mimeType,
    lastModified: new Date().toISOString(),
    cacheKey: `memory-snapshots-${searchParams?.toString() || 'current'}`,
    ttl: 300, // 5 minutes
    etag: `"memory-snapshots-${Date.now()}"`,
  };
}
