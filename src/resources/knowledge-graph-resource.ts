/**
 * Knowledge Graph Resource - Read-only knowledge graph data
 * URI Pattern: knowledge://graph
 * 
 * Provides direct access to the knowledge graph structure with nodes, edges, and metadata.
 * This replaces querying KnowledgeGraphManager as a Tool, following ADR-018 atomic tools pattern.
 */

import { URLSearchParams } from 'url';
import { McpAdrError } from '../types/index.js';
import { resourceCache, generateETag } from './resource-cache.js';
import { ResourceGenerationResult } from './index.js';
import { resourceRouter } from './resource-router.js';
import type { KnowledgeGraphManager } from '../utils/knowledge-graph-manager.js';

export interface GraphNode {
  id: string;
  type: 'intent' | 'adr' | 'code' | 'tool' | 'decision';
  name?: string;
  title?: string;
  status?: string;
  timestamp?: string;
  language?: string;
  relevanceScore?: number;
}

export interface GraphEdge {
  source: string;
  target: string;
  relationship: 'implements' | 'uses' | 'created' | 'depends-on' | 'supersedes';
  strength?: number;
  success?: boolean;
}

export interface KnowledgeGraphData {
  nodes: GraphNode[];
  edges: GraphEdge[];
  metadata: {
    lastUpdated: string;
    nodeCount: number;
    edgeCount: number;
    intentCount: number;
    adrCount: number;
    toolCount: number;
    version: string;
  };
  analytics: {
    totalIntents: number;
    completedIntents: number;
    activeIntents: number;
    averageGoalCompletion: number;
    mostUsedTools: Array<{ toolName: string; usageCount: number }>;
  };
}

/**
 * Generate knowledge graph resource providing read-only access to graph structure.
 * 
 * Returns comprehensive graph data including nodes (intents, ADRs, tools, code files)
 * and edges (relationships between nodes). This is a read-only view - use the
 * update_knowledge tool to modify the graph.
 * 
 * **URI Pattern:** `knowledge://graph`
 * 
 * **Query Parameters:** (none)
 * 
 * @param params - URL path parameters (none for this resource)
 * @param searchParams - URL query parameters (none used)
 * @param kgManager - KnowledgeGraphManager instance (injected by MCP server)
 * 
 * @returns Promise resolving to resource generation result containing:
 *   - data: Knowledge graph with nodes, edges, and metadata
 *   - contentType: "application/json"
 *   - lastModified: ISO timestamp of generation
 *   - cacheKey: Unique identifier "knowledge-graph"
 *   - ttl: Cache duration (60 seconds)
 *   - etag: Entity tag for cache validation
 * 
 * @throws {McpAdrError} When:
 *   - RESOURCE_GENERATION_ERROR: KnowledgeGraphManager not provided or graph loading fails
 * 
 * @example
 * ```typescript
 * // Get knowledge graph
 * const graph = await generateKnowledgeGraphResource(
 *   {},
 *   new URLSearchParams(),
 *   kgManager
 * );
 * 
 * console.log(`Nodes: ${graph.data.nodes.length}`);
 * console.log(`Edges: ${graph.data.edges.length}`);
 * console.log(`Active Intents: ${graph.data.analytics.activeIntents}`);
 * 
 * // Expected output structure:
 * {
 *   data: {
 *     nodes: [
 *       { id: "adr-001", type: "adr", title: "Use React", status: "accepted" },
 *       { id: "intent-123", type: "intent", name: "Add auth", status: "executing" },
 *       { id: "tool-analyze", type: "tool", name: "analyze_project_ecosystem" }
 *     ],
 *     edges: [
 *       { source: "intent-123", target: "adr-001", relationship: "created" },
 *       { source: "intent-123", target: "tool-analyze", relationship: "uses" }
 *     ],
 *     metadata: {
 *       lastUpdated: "2025-12-16T13:00:00.000Z",
 *       nodeCount: 42,
 *       edgeCount: 18,
 *       intentCount: 15,
 *       adrCount: 8,
 *       toolCount: 5,
 *       version: "1.0.0"
 *     },
 *     analytics: {
 *       totalIntents: 15,
 *       completedIntents: 10,
 *       activeIntents: 5,
 *       averageGoalCompletion: 0.67,
 *       mostUsedTools: [...]
 *     }
 *   },
 *   contentType: "application/json",
 *   cacheKey: "knowledge-graph",
 *   ttl: 60
 * }
 * ```
 * 
 * @since v2.2.0
 * @see {@link KnowledgeGraphManager.loadKnowledgeGraph} for graph data source
 */
export async function generateKnowledgeGraphResource(
  _params: Record<string, string>,
  _searchParams: URLSearchParams,
  kgManager?: KnowledgeGraphManager
): Promise<ResourceGenerationResult> {
  const cacheKey = 'knowledge-graph';

  // Check cache
  const cached = await resourceCache.get<ResourceGenerationResult>(cacheKey);
  if (cached) {
    return cached;
  }

  try {
    if (!kgManager) {
      throw new McpAdrError(
        'Knowledge graph requires initialized knowledge graph manager. Access this resource through the MCP server.',
        'RESOURCE_GENERATION_ERROR'
      );
    }

    // Load knowledge graph snapshot
    const snapshot = await kgManager.loadKnowledgeGraph();
    
    // Build nodes from intents
    const nodes: GraphNode[] = [];
    const edges: GraphEdge[] = [];
    const toolSet = new Set<string>();

    // Process intents into nodes and extract tool relationships
    for (const intent of snapshot.intents) {
      nodes.push({
        id: intent.intentId,
        type: 'intent',
        name: intent.humanRequest,
        status: intent.currentStatus,
        timestamp: intent.timestamp,
        relevanceScore: calculateIntentRelevance(intent),
      });

      // Add tool nodes and edges
      for (const tool of intent.toolChain) {
        const toolId = `tool-${tool.toolName}`;
        if (!toolSet.has(toolId)) {
          toolSet.add(toolId);
          nodes.push({
            id: toolId,
            type: 'tool',
            name: tool.toolName,
          });
        }

        edges.push({
          source: intent.intentId,
          target: toolId,
          relationship: 'uses',
          success: tool.success,
        });
      }

      // Add ADR nodes and edges if present
      const adrsCreated = (intent as any).adrsCreated || [];
      for (const adrId of adrsCreated) {
        const adrNodeId = `adr-${adrId}`;
        nodes.push({
          id: adrNodeId,
          type: 'adr',
          title: `ADR ${adrId}`,
          status: 'accepted',
        });

        edges.push({
          source: intent.intentId,
          target: adrNodeId,
          relationship: 'created',
        });
      }
    }

    // Count node types
    const intentCount = nodes.filter(n => n.type === 'intent').length;
    const adrCount = nodes.filter(n => n.type === 'adr').length;
    const toolCount = nodes.filter(n => n.type === 'tool').length;

    const graphData: KnowledgeGraphData = {
      nodes,
      edges,
      metadata: {
        lastUpdated: new Date().toISOString(),
        nodeCount: nodes.length,
        edgeCount: edges.length,
        intentCount,
        adrCount,
        toolCount,
        version: snapshot.version,
      },
      analytics: {
        totalIntents: snapshot.analytics.totalIntents,
        completedIntents: snapshot.analytics.completedIntents,
        activeIntents: snapshot.analytics.activeIntents,
        averageGoalCompletion: snapshot.analytics.averageGoalCompletion,
        mostUsedTools: snapshot.analytics.mostUsedTools,
      },
    };

    const result: ResourceGenerationResult = {
      data: graphData,
      contentType: 'application/json',
      lastModified: new Date().toISOString(),
      cacheKey,
      ttl: 60, // 60 seconds cache (graph changes moderately frequently)
      etag: generateETag(graphData),
    };

    // Cache result
    resourceCache.set(cacheKey, result, result.ttl);

    return result;
  } catch (error) {
    throw new McpAdrError(
      `Failed to generate knowledge graph: ${error instanceof Error ? error.message : String(error)}`,
      'RESOURCE_GENERATION_ERROR'
    );
  }
}

/**
 * Calculate relevance score for an intent based on status and age
 */
function calculateIntentRelevance(intent: any): number {
  const now = new Date();
  const age = now.getTime() - new Date(intent.timestamp).getTime();
  const ageInDays = age / (24 * 60 * 60 * 1000);

  // Base relevance on status
  let relevance = 0.5;
  if (intent.currentStatus === 'executing') relevance = 0.9;
  else if (intent.currentStatus === 'planning') relevance = 0.8;
  else if (intent.currentStatus === 'completed') relevance = 0.6;

  // Decay relevance over time
  relevance *= Math.max(0.3, 1 - ageInDays / 30);

  // Boost relevance if it has successful tool executions
  const successRate =
    intent.toolChain.filter((t: any) => t.success).length / (intent.toolChain.length || 1);
  relevance = (relevance + successRate) / 2;

  return Math.round(relevance * 100) / 100;
}

// Note: This resource requires KnowledgeGraphManager to be injected.
// The route is registered but the handler needs to be wrapped with manager injection
// when called from the MCP server. See index.ts readResource method for injection pattern.
resourceRouter.register(
  '/graph',
  generateKnowledgeGraphResource as any, // TypeScript workaround for manager injection pattern
  'Knowledge graph structure with nodes, edges, and metadata'
);
