/**
 * ADR Knowledge Initializer
 *
 * Initializes the knowledge base with existing ADRs from the project
 * on first run of analyze_project_ecosystem. This ensures that future
 * ADR suggestions and analysis build on established architectural decisions.
 */

import { KnowledgeGraphManager } from './knowledge-graph-manager.js';
import { discoverAdrsInDirectory, type DiscoveredAdr } from './adr-discovery.js';
import { createLogger } from './config.js';

const logger = createLogger({ logLevel: process.env['LOG_LEVEL'] || 'info' } as any);

/**
 * ADR node structure for knowledge graph
 */
export interface AdrKnowledgeNode {
  id: string;
  type: 'adr';
  title: string;
  status: string;
  date?: string;
  context: string;
  decision: string;
  consequences: string;
  filePath: string;
  metadata: {
    number?: string;
    category?: string;
    tags?: string[];
  };
  relationships: {
    relatedAdrs: string[];
    supersedes?: string[];
    supersededBy?: string[];
  };
}

/**
 * Initialize knowledge base with existing ADRs
 *
 * @param kgManager - Knowledge graph manager instance
 * @param adrDirectory - Directory containing ADRs
 * @param projectPath - Root project path
 * @returns Promise resolving to initialization result
 */
export async function initializeAdrKnowledgeBase(
  kgManager: KnowledgeGraphManager,
  adrDirectory: string,
  projectPath: string
): Promise<{
  success: boolean;
  adrsIndexed: number;
  nodes: AdrKnowledgeNode[];
  errors: string[];
}> {
  logger.info(`Initializing ADR knowledge base from: ${adrDirectory}`);

  const errors: string[] = [];
  const nodes: AdrKnowledgeNode[] = [];

  try {
    // Discover all existing ADRs
    const discoveryResult = await discoverAdrsInDirectory(adrDirectory, projectPath, {
      includeContent: true,
      includeTimeline: false,
    });

    logger.info(`Discovered ${discoveryResult.totalAdrs} ADRs for knowledge base initialization`);

    if (discoveryResult.totalAdrs === 0) {
      logger.info('No ADRs found - skipping knowledge base initialization');
      return {
        success: true,
        adrsIndexed: 0,
        nodes: [],
        errors: [],
      };
    }

    // Parse and index each ADR
    for (const adr of discoveryResult.adrs) {
      try {
        const node = await indexAdrToKnowledgeGraph(adr, discoveryResult.adrs, kgManager);
        nodes.push(node);
      } catch (error) {
        const errorMsg = `Failed to index ADR ${adr.filename}: ${error instanceof Error ? error.message : String(error)}`;
        logger.warn(errorMsg);
        errors.push(errorMsg);
      }
    }

    // Create relationships between ADRs
    await createAdrRelationships(nodes, kgManager);

    logger.info(`✅ Successfully initialized ADR knowledge base with ${nodes.length} ADRs`);

    return {
      success: true,
      adrsIndexed: nodes.length,
      nodes,
      errors,
    };
  } catch (error) {
    const errorMsg = `Failed to initialize ADR knowledge base: ${error instanceof Error ? error.message : String(error)}`;
    logger.error(errorMsg);
    errors.push(errorMsg);

    return {
      success: false,
      adrsIndexed: 0,
      nodes: [],
      errors,
    };
  }
}

/**
 * Index a single ADR to the knowledge graph
 */
async function indexAdrToKnowledgeGraph(
  adr: DiscoveredAdr,
  allAdrs: DiscoveredAdr[],
  kgManager: KnowledgeGraphManager
): Promise<AdrKnowledgeNode> {
  // Extract related ADRs from content
  const relatedAdrs = extractRelatedAdrs(adr, allAdrs);

  // Create ADR knowledge node
  const metadata: AdrKnowledgeNode['metadata'] = {
    tags: adr.metadata?.tags || [],
  };

  // Only include optional metadata if they exist
  if (adr.metadata?.number) {
    metadata.number = adr.metadata.number;
  }
  if (adr.metadata?.category) {
    metadata.category = adr.metadata.category;
  }

  const node: AdrKnowledgeNode = {
    id: adr.metadata?.number || adr.filename.replace(/\.md$/, ''),
    type: 'adr',
    title: adr.title,
    status: adr.status,
    context: adr.context || '',
    decision: adr.decision || '',
    consequences: adr.consequences || '',
    filePath: adr.path,
    metadata,
    relationships: {
      relatedAdrs,
      supersedes: extractSupersedes(adr),
      supersededBy: extractSupersededBy(adr),
    },
  };

  // Add date if it exists
  if (adr.date) {
    node.date = adr.date;
  }

  // Add memory execution tracking for ADR indexing
  await kgManager.addMemoryExecution('adr_knowledge_initializer', 'index', 'adr', true, {
    adrId: node.id,
    title: node.title,
    status: node.status,
    relatedAdrs: relatedAdrs.length,
  });

  logger.debug(`Indexed ADR to knowledge graph: ${node.id} - ${node.title}`);

  return node;
}

/**
 * Extract related ADR references from content
 */
function extractRelatedAdrs(adr: DiscoveredAdr, allAdrs: DiscoveredAdr[]): string[] {
  const related: string[] = [];
  const content = `${adr.context || ''} ${adr.decision || ''} ${adr.consequences || ''}`;

  // Match patterns like "ADR-001", "ADR 001", "adr-1", etc.
  const adrReferences = content.match(/ADR[-\s]?(\d+)/gi);

  if (adrReferences) {
    for (const ref of adrReferences) {
      const id = ref.match(/\d+/)?.[0];
      if (id) {
        const relatedAdr = allAdrs.find(a => a.metadata?.number === id || a.filename.includes(id));
        if (relatedAdr && relatedAdr.filename !== adr.filename) {
          const relatedId = relatedAdr.metadata?.number || relatedAdr.filename.replace(/\.md$/, '');
          related.push(relatedId);
        }
      }
    }
  }

  return [...new Set(related)];
}

/**
 * Extract ADRs that this ADR supersedes
 */
function extractSupersedes(adr: DiscoveredAdr): string[] {
  const content = `${adr.context || ''} ${adr.decision || ''} ${adr.consequences || ''}`;
  const supersedes: string[] = [];

  // Match patterns like "supersedes ADR-001", "replaces ADR 002", etc.
  const supersedesMatches = content.match(/(?:supersedes|replaces)\s+ADR[-\s]?(\d+)/gi);

  if (supersedesMatches) {
    for (const match of supersedesMatches) {
      const id = match.match(/\d+/)?.[0];
      if (id) {
        supersedes.push(id);
      }
    }
  }

  return [...new Set(supersedes)];
}

/**
 * Extract ADRs that supersede this ADR
 */
function extractSupersededBy(adr: DiscoveredAdr): string[] {
  // Check status for "superseded" indication
  if (adr.status.toLowerCase() === 'superseded') {
    const content = `${adr.context || ''} ${adr.decision || ''} ${adr.consequences || ''}`;

    // Match patterns like "superseded by ADR-003"
    const supersededByMatches = content.match(/superseded\s+by\s+ADR[-\s]?(\d+)/gi);

    if (supersededByMatches) {
      const supersededBy: string[] = [];
      for (const match of supersededByMatches) {
        const id = match.match(/\d+/)?.[0];
        if (id) {
          supersededBy.push(id);
        }
      }
      return [...new Set(supersededBy)];
    }
  }

  return [];
}

/**
 * Create relationship tracking between ADRs in the knowledge graph
 */
async function createAdrRelationships(
  nodes: AdrKnowledgeNode[],
  kgManager: KnowledgeGraphManager
): Promise<void> {
  logger.info(`Creating relationships between ${nodes.length} ADRs`);

  for (const node of nodes) {
    // Track related ADRs
    for (const relatedId of node.relationships.relatedAdrs) {
      await kgManager.addMemoryExecution(
        'adr_knowledge_initializer',
        'relate',
        'adr_relationship',
        true,
        {
          sourceAdr: node.id,
          targetAdr: relatedId,
          relationshipType: 'related',
        }
      );
    }

    // Track supersedes relationships
    if (node.relationships.supersedes && node.relationships.supersedes.length > 0) {
      for (const supersededId of node.relationships.supersedes) {
        await kgManager.addMemoryExecution(
          'adr_knowledge_initializer',
          'supersede',
          'adr_relationship',
          true,
          {
            sourceAdr: node.id,
            targetAdr: supersededId,
            relationshipType: 'supersedes',
          }
        );
      }
    }

    // Track superseded-by relationships
    if (node.relationships.supersededBy && node.relationships.supersededBy.length > 0) {
      for (const supersedingId of node.relationships.supersededBy) {
        await kgManager.addMemoryExecution(
          'adr_knowledge_initializer',
          'superseded-by',
          'adr_relationship',
          true,
          {
            sourceAdr: node.id,
            targetAdr: supersedingId,
            relationshipType: 'superseded-by',
          }
        );
      }
    }
  }

  logger.info('✅ ADR relationships created successfully');
}

/**
 * Check if ADR knowledge base has been initialized
 *
 * @param kgManager - Knowledge graph manager instance
 * @returns Promise resolving to whether ADRs have been indexed
 */
export async function isAdrKnowledgeBaseInitialized(
  kgManager: KnowledgeGraphManager
): Promise<boolean> {
  try {
    const kg = await kgManager.loadKnowledgeGraph();

    // Check if we have any ADR-related memory operations
    if (kg.memoryOperations && kg.memoryOperations.length > 0) {
      const adrOperations = kg.memoryOperations.filter(
        (op: any) => op.entityType === 'adr' && op.action === 'index'
      );
      return adrOperations.length > 0;
    }

    return false;
  } catch (error) {
    logger.warn('Failed to check ADR knowledge base initialization status:', error);
    return false;
  }
}
