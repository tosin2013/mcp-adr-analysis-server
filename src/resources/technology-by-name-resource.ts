/**
 * Technology by Name Resource - Individual technology analysis
 * URI Pattern: adr://technology/{name}
 */

import { URLSearchParams } from 'url';
import { McpAdrError } from '../types/index.js';
import { resourceCache, generateETag } from './resource-cache.js';
import { ResourceGenerationResult } from './index.js';
import { resourceRouter } from './resource-router.js';

export interface TechnologyDetails {
  name: string;
  category: string;
  version?: string;
  description: string;
  usage: {
    adrsReferencing: Array<{
      id: string;
      title: string;
      status: string;
    }>;
    componentsUsing: string[];
    patternsRelated: string[];
  };
  relationships: {
    dependsOn: string[];
    usedBy: string[];
    relatedTo: string[];
  };
  adoption: {
    status: 'evaluating' | 'trial' | 'adopt' | 'hold';
    confidence: 'low' | 'medium' | 'high';
    risks: string[];
    benefits: string[];
  };
  metadata: {
    firstIntroduced: string;
    lastUpdated: string;
    maturity: 'experimental' | 'stable' | 'deprecated';
    documentation: string[];
  };
}

/**
 * Find ADRs that reference this technology
 */
async function findReferencingAdrs(
  techName: string
): Promise<Array<{ id: string; title: string; status: string }>> {
  const referencingAdrs: Array<{ id: string; title: string; status: string }> = [];

  try {
    const { discoverAdrsInDirectory } = await import('../utils/adr-discovery.js');
    const path = await import('path');
    const adrDirectory = path.resolve(process.cwd(), process.env['ADR_DIRECTORY'] || 'docs/adrs');
    const result = await discoverAdrsInDirectory(adrDirectory, process.cwd(), {
      includeContent: true,
      includeTimeline: false,
    });

    // Find ADRs that mention this technology
    for (const adr of result.adrs) {
      const content = `${adr.title} ${adr.context || ''} ${adr.decision || ''}`.toLowerCase();
      if (content.includes(techName.toLowerCase())) {
        referencingAdrs.push({
          id: adr.filename.replace(/\.md$/, ''),
          title: adr.title || 'Untitled',
          status: adr.status || 'unknown',
        });
      }
    }
  } catch {
    // No ADRs found
  }

  return referencingAdrs;
}

/**
 * Find related patterns (placeholder)
 */
function findRelatedPatterns(_name: string): string[] {
  // Placeholder implementation
  return ['MVC', 'Repository'];
}

/**
 * Get technology relationships (placeholder)
 */
function getTechnologyRelationships(_name: string): {
  dependsOn: string[];
  usedBy: string[];
  relatedTo: string[];
} {
  // Placeholder implementation
  return {
    dependsOn: [],
    usedBy: [],
    relatedTo: [],
  };
}

/**
 * Assess technology adoption
 */
function assessAdoption(
  _techName: string,
  adrsReferencing: Array<{ status: string }>
): {
  status: 'evaluating' | 'trial' | 'adopt' | 'hold';
  confidence: 'low' | 'medium' | 'high';
  risks: string[];
  benefits: string[];
} {
  const acceptedAdrs = adrsReferencing.filter(a => a.status === 'accepted').length;
  const proposedAdrs = adrsReferencing.filter(a => a.status === 'proposed').length;

  let status: 'evaluating' | 'trial' | 'adopt' | 'hold' = 'evaluating';
  let confidence: 'low' | 'medium' | 'high' = 'low';

  if (acceptedAdrs >= 3) {
    status = 'adopt';
    confidence = 'high';
  } else if (acceptedAdrs >= 1) {
    status = 'trial';
    confidence = 'medium';
  } else if (proposedAdrs > 0) {
    status = 'evaluating';
    confidence = 'low';
  }

  const risks = status === 'evaluating'
    ? ['Unproven in production', 'Limited team experience']
    : status === 'trial'
    ? ['Limited production usage']
    : [];

  const benefits = acceptedAdrs > 0
    ? ['Documented decisions', 'Team adoption']
    : ['Under evaluation'];

  return { status, confidence, risks, benefits };
}

/**
 * Get technology metadata
 */
function getTechnologyMetadata(tech: any): {
  firstIntroduced: string;
  lastUpdated: string;
  maturity: 'experimental' | 'stable' | 'deprecated';
  documentation: string[];
} {
  return {
    firstIntroduced: tech.introducedDate || new Date().toISOString(),
    lastUpdated: new Date().toISOString(),
    maturity: tech.maturity || 'stable',
    documentation: tech.documentation || [],
  };
}

/**
 * Get known technologies (placeholder)
 */
function getKnownTechnologies(): Array<{
  name: string;
  category: string;
  version?: string;
  description: string;
}> {
  return [
    {
      name: 'TypeScript',
      category: 'language',
      version: '5.x',
      description: 'Typed superset of JavaScript',
    },
    {
      name: 'Node.js',
      category: 'runtime',
      version: '18.x',
      description: 'JavaScript runtime built on Chrome V8',
    },
    {
      name: 'MCP',
      category: 'protocol',
      version: '1.0',
      description: 'Model Context Protocol for AI integration',
    },
  ];
}

/**
 * Generate technology by name resource
 */
export async function generateTechnologyByNameResource(
  params: Record<string, string>,
  _searchParams: URLSearchParams
): Promise<ResourceGenerationResult> {
  const name = params['name'];

  if (!name) {
    throw new McpAdrError('Missing required parameter: name', 'INVALID_PARAMS');
  }

  const cacheKey = `technology:${name}`;

  // Check cache
  const cached = await resourceCache.get<ResourceGenerationResult>(cacheKey);
  if (cached) {
    return cached;
  }

  // Find technology
  const allTechnologies = getKnownTechnologies();
  const technology = allTechnologies.find(
    (t: { name: string }) => t.name.toLowerCase() === name.toLowerCase()
  );

  if (!technology) {
    throw new McpAdrError(`Technology not found: ${name}`, 'RESOURCE_NOT_FOUND');
  }

  // Gather technology details
  const adrsReferencing = await findReferencingAdrs(name);
  const patternsRelated = findRelatedPatterns(name);
  const relationships = getTechnologyRelationships(name);
  const adoption = assessAdoption(name, adrsReferencing);
  const metadata = getTechnologyMetadata(technology);

  const technologyDetails: TechnologyDetails = {
    name: technology.name,
    category: technology.category || 'uncategorized',
    ...(technology.version ? { version: technology.version } : {}),
    description: technology.description || `Technology: ${technology.name}`,
    usage: {
      adrsReferencing,
      componentsUsing: [], // Placeholder - would require component analysis
      patternsRelated,
    },
    relationships,
    adoption,
    metadata,
  };

  const result: ResourceGenerationResult = {
    data: technologyDetails,
    contentType: 'application/json',
    lastModified: new Date().toISOString(),
    cacheKey,
    ttl: 300, // 5 minutes cache
    etag: generateETag(technologyDetails),
  };

  // Cache result
  resourceCache.set(cacheKey, result, result.ttl);

  return result;
}

// Register route
resourceRouter.register(
  '/technology/{name}',
  generateTechnologyByNameResource,
  'Individual technology analysis by name'
);
