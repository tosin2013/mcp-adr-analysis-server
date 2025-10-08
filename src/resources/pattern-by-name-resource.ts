/**
 * Pattern by Name Resource - Individual pattern analysis
 * URI Pattern: adr://pattern/{name}
 */

import { URLSearchParams } from 'url';
import { McpAdrError } from '../types/index.js';
import { resourceCache, generateETag } from './resource-cache.js';
import { ResourceGenerationResult } from './index.js';
import { resourceRouter } from './resource-router.js';

export interface PatternDetails {
  name: string;
  category: string;
  description: string;
  intent: string;
  applicability: string[];
  structure: {
    participants: string[];
    collaborations: string[];
  };
  usage: {
    adrsReferencing: Array<{
      id: string;
      title: string;
      status: string;
    }>;
    technologiesUsed: string[];
    implementationCount: number;
  };
  relationships: {
    relatedPatterns: string[];
    alternativePatterns: string[];
    complementaryPatterns: string[];
  };
  quality: {
    complexity: 'low' | 'medium' | 'high';
    maintainability: number;
    testability: number;
    documentation: number;
  };
  examples: Array<{
    title: string;
    description: string;
    codeReference?: string;
  }>;
  metadata: {
    firstUsed: string;
    lastUpdated: string;
    maturity: 'emerging' | 'proven' | 'legacy';
    references: string[];
  };
}

/**
 * Find ADRs that reference this pattern
 */
async function findReferencingAdrs(
  patternName: string
): Promise<Array<{ id: string; title: string; status: string }>> {
  const referencingAdrs: Array<{ id: string; title: string; status: string }> = [];

  try {
    const { discoverAdrsInDirectory } = await import('../utils/adr-discovery.js');
    const path = await import('path');
    const adrDirectory = path.resolve(process.cwd(), process.env['ADR_DIRECTORY'] || 'docs/adrs');
    const result = await discoverAdrsInDirectory(adrDirectory, true, process.cwd());

    // Find ADRs that mention this pattern
    for (const adr of result.adrs) {
      const content = `${adr.title} ${adr.context || ''} ${adr.decision || ''}`.toLowerCase();
      if (content.includes(patternName.toLowerCase())) {
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
 * Find related technologies (placeholder)
 */
function findRelatedTechnologies(_name: string): string[] {
  // Placeholder implementation
  return ['TypeScript', 'Node.js'];
}

/**
 * Get pattern relationships (placeholder)
 */
function getPatternRelationships(_name: string): {
  relatedPatterns: string[];
  alternativePatterns: string[];
  complementaryPatterns: string[];
} {
  // Placeholder implementation
  return {
    relatedPatterns: [],
    alternativePatterns: [],
    complementaryPatterns: [],
  };
}

/**
 * Assess pattern quality
 */
function assessPatternQuality(
  pattern: any,
  adrsReferencing: Array<{ status: string }>
): {
  complexity: 'low' | 'medium' | 'high';
  maintainability: number;
  testability: number;
  documentation: number;
} {
  // Determine complexity based on pattern type
  let complexity: 'low' | 'medium' | 'high' = 'medium';
  if (pattern.category === 'creational') complexity = 'low';
  else if (pattern.category === 'structural') complexity = 'medium';
  else if (pattern.category === 'behavioral') complexity = 'high';

  // Maintainability based on usage
  const acceptedAdrs = adrsReferencing.filter(a => a.status === 'accepted').length;
  const maintainability = acceptedAdrs >= 3 ? 90 : acceptedAdrs >= 1 ? 70 : 50;

  // Testability (placeholder - would require actual analysis)
  const testability = complexity === 'low' ? 90 : complexity === 'medium' ? 70 : 50;

  // Documentation based on ADRs
  const documentation = adrsReferencing.length > 0 ? 80 : 40;

  return {
    complexity,
    maintainability,
    testability,
    documentation,
  };
}

/**
 * Generate pattern examples
 */
function generatePatternExamples(patternName: string): Array<{
  title: string;
  description: string;
  codeReference?: string;
}> {
  // Placeholder - would extract from ADRs or code
  return [
    {
      title: `${patternName} Implementation`,
      description: `Example usage of ${patternName} pattern in the codebase`,
      codeReference: 'See relevant ADRs for implementation details',
    },
  ];
}

/**
 * Get pattern metadata
 */
function getPatternMetadata(pattern: any): {
  firstUsed: string;
  lastUpdated: string;
  maturity: 'emerging' | 'proven' | 'legacy';
  references: string[];
} {
  return {
    firstUsed: pattern.introducedDate || new Date().toISOString(),
    lastUpdated: new Date().toISOString(),
    maturity: pattern.maturity || 'proven',
    references: pattern.references || [],
  };
}

/**
 * Get pattern intent and applicability
 */
function getPatternDetails(pattern: any): {
  intent: string;
  applicability: string[];
  structure: { participants: string[]; collaborations: string[] };
} {
  return {
    intent: pattern.intent || `Design pattern for ${pattern.name}`,
    applicability: pattern.applicability || ['General purpose'],
    structure: {
      participants: pattern.participants || [],
      collaborations: pattern.collaborations || [],
    },
  };
}

/**
 * Get known patterns (placeholder)
 */
function getKnownPatterns(): Array<{
  name: string;
  category: string;
  description: string;
}> {
  return [
    {
      name: 'MVC',
      category: 'architectural',
      description: 'Model-View-Controller pattern',
    },
    {
      name: 'Repository',
      category: 'data',
      description: 'Repository pattern for data access',
    },
    {
      name: 'Singleton',
      category: 'creational',
      description: 'Singleton pattern for single instance',
    },
  ];
}

/**
 * Generate pattern by name resource
 */
export async function generatePatternByNameResource(
  params: Record<string, string>,
  _searchParams: URLSearchParams
): Promise<ResourceGenerationResult> {
  const name = params['name'];

  if (!name) {
    throw new McpAdrError('Missing required parameter: name', 'INVALID_PARAMS');
  }

  const cacheKey = `pattern:${name}`;

  // Check cache
  const cached = await resourceCache.get<ResourceGenerationResult>(cacheKey);
  if (cached) {
    return cached;
  }

  // Find pattern
  const allPatterns = getKnownPatterns();
  const pattern = allPatterns.find(
    (p: { name: string }) => p.name.toLowerCase() === name.toLowerCase()
  );

  if (!pattern) {
    throw new McpAdrError(`Pattern not found: ${name}`, 'RESOURCE_NOT_FOUND');
  }

  // Gather pattern details
  const adrsReferencing = await findReferencingAdrs(name);
  const technologiesUsed = findRelatedTechnologies(name);
  const relationships = getPatternRelationships(name);
  const quality = assessPatternQuality(pattern, adrsReferencing);
  const patternInfo = getPatternDetails(pattern);
  const examples = generatePatternExamples(name);
  const metadata = getPatternMetadata(pattern);

  const patternDetails: PatternDetails = {
    name: pattern.name,
    category: pattern.category || 'uncategorized',
    description: pattern.description || `Design pattern: ${pattern.name}`,
    intent: patternInfo.intent,
    applicability: patternInfo.applicability,
    structure: patternInfo.structure,
    usage: {
      adrsReferencing,
      technologiesUsed,
      implementationCount: adrsReferencing.length,
    },
    relationships,
    quality,
    examples,
    metadata,
  };

  const result: ResourceGenerationResult = {
    data: patternDetails,
    contentType: 'application/json',
    lastModified: new Date().toISOString(),
    cacheKey,
    ttl: 300, // 5 minutes cache
    etag: generateETag(patternDetails),
  };

  // Cache result
  resourceCache.set(cacheKey, result, result.ttl);

  return result;
}

// Register route
resourceRouter.register(
  '/pattern/{name}',
  generatePatternByNameResource,
  'Individual pattern analysis by name'
);
