/**
 * Architectural Context Resource - Current architectural state and decisions
 * URI Pattern: adr://architecture/context
 */

import { URLSearchParams } from 'url';
import { McpAdrError } from '../types/index.js';
import { resourceCache, generateETag } from './resource-cache.js';
import { ResourceGenerationResult } from './index.js';
import { resourceRouter } from './resource-router.js';
import type { KnowledgeGraphManager } from '../utils/knowledge-graph-manager.js';

export interface ArchitecturalContextData {
  summary: {
    totalAdrs: number;
    activeDecisions: number;
    deprecatedDecisions: number;
    proposedDecisions: number;
    technologiesUsed: string[];
    architecturalPatterns: string[];
  };
  decisions: Array<{
    id: string;
    title: string;
    status: string;
    category: string;
    impact: 'high' | 'medium' | 'low';
    dependencies: string[];
  }>;
  technologyStack: {
    frontend: string[];
    backend: string[];
    database: string[];
    infrastructure: string[];
    devops: string[];
  };
  patterns: Array<{
    name: string;
    description: string;
    usedIn: string[];
    relatedAdrs: string[];
  }>;
  recommendations: string[];
  timestamp: string;
  projectPath: string;
}

/**
 * Generate architectural context resource showing current state and decisions.
 *
 * Returns a comprehensive view of the project's architectural state:
 * - Summary of all ADRs by status
 * - Technology stack analysis
 * - Architectural patterns in use
 * - Recommendations for improvements
 *
 * **URI Pattern:** `adr://architecture/context`
 *
 * **Query Parameters:**
 * - `projectPath`: Override project root path (default: process.cwd())
 * - `includeDeprecated`: Include deprecated decisions (default: true)
 * - `includeProposed`: Include proposed decisions (default: true)
 * - `maxDecisions`: Maximum decisions to return (default: 50)
 *
 * @param params - URL path parameters (none for this resource)
 * @param searchParams - URL query parameters for customization
 * @param kgManager - Optional knowledge graph manager instance
 *
 * @returns Promise resolving to resource generation result containing:
 *   - data: Complete architectural context data
 *   - contentType: "application/json"
 *   - lastModified: ISO timestamp of generation
 *   - cacheKey: Unique identifier "architectural-context"
 *   - ttl: Cache duration (300 seconds / 5 minutes)
 *   - etag: Entity tag for cache validation
 *
 * @throws {McpAdrError} When context generation fails
 *
 * @example
 * ```typescript
 * // Get full architectural context
 * const context = await generateArchitecturalContextResource(
 *   {},
 *   new URLSearchParams()
 * );
 *
 * console.log(`Total ADRs: ${context.data.summary.totalAdrs}`);
 * console.log(`Technologies: ${context.data.summary.technologiesUsed.join(', ')}`);
 *
 * // Exclude deprecated decisions
 * const active = await generateArchitecturalContextResource(
 *   {},
 *   new URLSearchParams('includeDeprecated=false')
 * );
 * ```
 *
 * @since v2.2.0
 * @see {@link KnowledgeGraphManager} for knowledge graph queries
 */
export async function generateArchitecturalContextResource(
  _params: Record<string, string>,
  searchParams: URLSearchParams,
  kgManager?: KnowledgeGraphManager
): Promise<ResourceGenerationResult> {
  const projectPath = searchParams.get('projectPath') || process.cwd();
  const includeDeprecated = searchParams.get('includeDeprecated') !== 'false';
  const includeProposed = searchParams.get('includeProposed') !== 'false';
  const maxDecisions = parseInt(searchParams.get('maxDecisions') || '50', 10);

  const cacheKey = 'architectural-context';

  // Check cache
  const cached = await resourceCache.get<ResourceGenerationResult>(cacheKey);
  if (cached) {
    return cached;
  }

  try {
    // Discover ADRs to build context
    const { discoverAdrsInDirectory } = await import('../utils/adr-discovery.js');
    const pathModule = await import('path');

    const adrDirectory = pathModule.resolve(
      projectPath,
      process.env['ADR_DIRECTORY'] || 'docs/adrs'
    );

    const discoveryResult = await discoverAdrsInDirectory(adrDirectory, projectPath, {
      includeContent: true,
      includeTimeline: false,
    });

    // Categorize ADRs by status
    const statusCounts = {
      accepted: 0,
      deprecated: 0,
      proposed: 0,
      superseded: 0,
      unknown: 0,
    };

    const technologies = new Set<string>();
    const patterns = new Set<string>();
    const decisions: ArchitecturalContextData['decisions'] = [];

    for (const adr of discoveryResult.adrs) {
      const status = (adr.status || 'unknown').toLowerCase();
      if (status in statusCounts) {
        statusCounts[status as keyof typeof statusCounts]++;
      } else {
        statusCounts.unknown++;
      }

      // Skip deprecated if not requested
      if (!includeDeprecated && status === 'deprecated') continue;
      if (!includeProposed && status === 'proposed') continue;

      // Extract technologies from content
      const content = `${adr.context || ''} ${adr.decision || ''} ${adr.consequences || ''}`;
      extractTechnologies(content, technologies);
      extractPatterns(content, patterns);

      // Add to decisions list
      if (decisions.length < maxDecisions) {
        decisions.push({
          id: adr.filename.replace(/\.md$/, ''),
          title: adr.title || 'Untitled',
          status: adr.status || 'unknown',
          category: categorizeAdr(adr.title || '', content),
          impact: determineImpact(content),
          dependencies: extractDependencies(content),
        });
      }
    }

    // Build technology stack
    const technologyStack = categorizeTechnologies([...technologies]);

    // Build patterns list
    const patternsList = [...patterns].map(pattern => ({
      name: pattern,
      description: getPatternDescription(pattern),
      usedIn: findPatternUsage(pattern, discoveryResult.adrs),
      relatedAdrs: findRelatedAdrs(pattern, discoveryResult.adrs),
    }));

    // Generate recommendations
    const recommendations = generateRecommendations(discoveryResult.adrs, statusCounts, [
      ...technologies,
    ]);

    // Get additional context from knowledge graph if available
    if (kgManager) {
      try {
        const kg = await kgManager.loadKnowledgeGraph();
        if (kg && kg.intents) {
          // Extract technologies and patterns from intent goals
          kg.intents.forEach((intent: any) => {
            if (intent.parsedGoals) {
              intent.parsedGoals.forEach((goal: string) => {
                // Simple heuristic to extract tech/pattern mentions
                const lowerGoal = goal.toLowerCase();
                if (lowerGoal.includes('technology') || lowerGoal.includes('framework')) {
                  // Could extract specific technologies here
                }
              });
            }
          });
        }
      } catch {
        // Knowledge graph not available
      }
    }

    const contextData: ArchitecturalContextData = {
      summary: {
        totalAdrs: discoveryResult.totalAdrs,
        activeDecisions: statusCounts.accepted,
        deprecatedDecisions: statusCounts.deprecated,
        proposedDecisions: statusCounts.proposed,
        technologiesUsed: [...technologies].sort(),
        architecturalPatterns: [...patterns].sort(),
      },
      decisions,
      technologyStack,
      patterns: patternsList,
      recommendations,
      timestamp: new Date().toISOString(),
      projectPath,
    };

    const result: ResourceGenerationResult = {
      data: contextData,
      contentType: 'application/json',
      lastModified: new Date().toISOString(),
      cacheKey,
      ttl: 300, // 5 minutes cache
      etag: generateETag(contextData),
    };

    // Cache result
    resourceCache.set(cacheKey, result, result.ttl);

    return result;
  } catch (error) {
    throw new McpAdrError(
      `Failed to generate architectural context: ${error instanceof Error ? error.message : String(error)}`,
      'RESOURCE_GENERATION_ERROR'
    );
  }
}

/**
 * Extract technologies from content
 */
function extractTechnologies(content: string, technologies: Set<string>): void {
  const techPatterns = [
    /\b(React|Vue|Angular|Svelte|Next\.js|Nuxt|Gatsby)\b/gi,
    /\b(Node\.js|Express|Fastify|NestJS|Koa)\b/gi,
    /\b(Python|Django|Flask|FastAPI)\b/gi,
    /\b(PostgreSQL|MySQL|MongoDB|Redis|Elasticsearch)\b/gi,
    /\b(Docker|Kubernetes|AWS|Azure|GCP)\b/gi,
    /\b(Terraform|Ansible|Jenkins|GitHub Actions)\b/gi,
    /\b(GraphQL|REST|gRPC|WebSocket)\b/gi,
    /\b(TypeScript|JavaScript|Java|Go|Rust)\b/gi,
  ];

  techPatterns.forEach(pattern => {
    const matches = content.match(pattern);
    if (matches) {
      matches.forEach(match => technologies.add(match));
    }
  });
}

/**
 * Extract architectural patterns from content
 */
function extractPatterns(content: string, patterns: Set<string>): void {
  const patternKeywords = [
    'microservices',
    'monolith',
    'event-driven',
    'cqrs',
    'event sourcing',
    'hexagonal',
    'clean architecture',
    'mvc',
    'mvvm',
    'repository pattern',
    'service layer',
    'domain-driven',
    'api gateway',
    'saga pattern',
    'circuit breaker',
  ];

  const lowerContent = content.toLowerCase();
  patternKeywords.forEach(pattern => {
    if (lowerContent.includes(pattern)) {
      patterns.add(
        pattern
          .split(' ')
          .map(w => w.charAt(0).toUpperCase() + w.slice(1))
          .join(' ')
      );
    }
  });
}

/**
 * Categorize an ADR based on its title and content
 */
function categorizeAdr(title: string, content: string): string {
  const lowerTitle = title.toLowerCase();
  const lowerContent = content.toLowerCase();

  if (lowerTitle.includes('database') || lowerContent.includes('database')) return 'data';
  if (lowerTitle.includes('api') || lowerContent.includes('api endpoint')) return 'api';
  if (lowerTitle.includes('auth') || lowerContent.includes('authentication')) return 'security';
  if (lowerTitle.includes('deploy') || lowerContent.includes('deployment')) return 'infrastructure';
  if (lowerTitle.includes('test') || lowerContent.includes('testing')) return 'testing';
  if (lowerTitle.includes('ui') || lowerTitle.includes('frontend')) return 'frontend';
  if (lowerTitle.includes('backend') || lowerTitle.includes('service')) return 'backend';

  return 'general';
}

/**
 * Determine impact level of an ADR
 */
function determineImpact(content: string): 'high' | 'medium' | 'low' {
  const lowerContent = content.toLowerCase();

  // High impact indicators
  if (
    lowerContent.includes('critical') ||
    lowerContent.includes('breaking change') ||
    lowerContent.includes('major refactor') ||
    lowerContent.includes('security vulnerability')
  ) {
    return 'high';
  }

  // Low impact indicators
  if (
    lowerContent.includes('minor') ||
    lowerContent.includes('small change') ||
    lowerContent.includes('optimization')
  ) {
    return 'low';
  }

  return 'medium';
}

/**
 * Extract dependencies from content
 */
function extractDependencies(content: string): string[] {
  const deps: string[] = [];
  const depMatch = content.match(/ADR[-\s]?(\d+)/gi);
  if (depMatch) {
    depMatch.forEach(match => {
      const id = match.replace(/ADR[-\s]?/i, '');
      deps.push(`adr-${id.padStart(3, '0')}`);
    });
  }
  return [...new Set(deps)];
}

/**
 * Categorize technologies into stack layers
 */
function categorizeTechnologies(techs: string[]): ArchitecturalContextData['technologyStack'] {
  const stack: ArchitecturalContextData['technologyStack'] = {
    frontend: [],
    backend: [],
    database: [],
    infrastructure: [],
    devops: [],
  };

  const categories: Record<string, keyof typeof stack> = {
    React: 'frontend',
    Vue: 'frontend',
    Angular: 'frontend',
    Svelte: 'frontend',
    'Next.js': 'frontend',
    Nuxt: 'frontend',
    TypeScript: 'frontend',
    JavaScript: 'frontend',
    'Node.js': 'backend',
    Express: 'backend',
    Fastify: 'backend',
    NestJS: 'backend',
    Python: 'backend',
    Django: 'backend',
    Flask: 'backend',
    FastAPI: 'backend',
    Java: 'backend',
    Go: 'backend',
    Rust: 'backend',
    PostgreSQL: 'database',
    MySQL: 'database',
    MongoDB: 'database',
    Redis: 'database',
    Elasticsearch: 'database',
    Docker: 'infrastructure',
    Kubernetes: 'infrastructure',
    AWS: 'infrastructure',
    Azure: 'infrastructure',
    GCP: 'infrastructure',
    Terraform: 'devops',
    Ansible: 'devops',
    Jenkins: 'devops',
    'GitHub Actions': 'devops',
  };

  techs.forEach(tech => {
    const category = categories[tech];
    if (category && !stack[category].includes(tech)) {
      stack[category].push(tech);
    }
  });

  return stack;
}

/**
 * Get description for a pattern
 */
function getPatternDescription(pattern: string): string {
  const descriptions: Record<string, string> = {
    Microservices: 'Distributed architecture with independently deployable services',
    Monolith: 'Single deployable unit containing all functionality',
    'Event-driven': 'Asynchronous communication through events',
    CQRS: 'Command Query Responsibility Segregation',
    'Event Sourcing': 'Storing state as sequence of events',
    Hexagonal: 'Ports and adapters architecture',
    'Clean Architecture': 'Dependency rule with concentric layers',
    MVC: 'Model-View-Controller pattern',
    MVVM: 'Model-View-ViewModel pattern',
    'Repository Pattern': 'Abstraction layer for data access',
    'Service Layer': 'Business logic encapsulation',
    'Domain-driven': 'Design based on domain model',
    'Api Gateway': 'Single entry point for microservices',
    'Saga Pattern': 'Distributed transaction management',
    'Circuit Breaker': 'Fault tolerance pattern',
  };

  return descriptions[pattern] || 'Architectural pattern';
}

/**
 * Find ADRs that use a pattern
 */
function findPatternUsage(pattern: string, adrs: any[]): string[] {
  const lowerPattern = pattern.toLowerCase();
  return adrs
    .filter(adr => {
      const content = `${adr.title || ''} ${adr.context || ''} ${adr.decision || ''}`.toLowerCase();
      return content.includes(lowerPattern);
    })
    .map(adr => adr.filename.replace(/\.md$/, ''))
    .slice(0, 5);
}

/**
 * Find ADRs related to a pattern
 */
function findRelatedAdrs(pattern: string, adrs: any[]): string[] {
  return findPatternUsage(pattern, adrs);
}

/**
 * Generate recommendations based on analysis
 */
function generateRecommendations(
  adrs: any[],
  statusCounts: Record<string, number>,
  technologies: string[]
): string[] {
  const recommendations: string[] = [];

  // Check for proposed ADRs that need review
  const proposedCount = statusCounts['proposed'] || 0;
  if (proposedCount > 3) {
    recommendations.push(`Review ${proposedCount} proposed ADRs for acceptance`);
  }

  // Check for missing documentation areas
  const hasSecurityAdr = adrs.some(
    adr =>
      (adr.title || '').toLowerCase().includes('security') ||
      (adr.title || '').toLowerCase().includes('auth')
  );
  if (!hasSecurityAdr) {
    recommendations.push('Consider documenting security decisions in an ADR');
  }

  // Check for deprecated decisions
  const deprecatedCount = statusCounts['deprecated'] || 0;
  if (deprecatedCount > 0) {
    recommendations.push(`Review ${deprecatedCount} deprecated ADRs for removal or updates`);
  }

  // Technology recommendations
  if (technologies.length < 5) {
    recommendations.push('Consider documenting technology choices in ADRs');
  }

  // General recommendation
  if (adrs.length < 3) {
    recommendations.push('Consider creating ADRs for key architectural decisions');
  }

  if (recommendations.length === 0) {
    recommendations.push('Architectural documentation appears up-to-date');
  }

  return recommendations;
}

// Register route
resourceRouter.register(
  '/architecture/context',
  generateArchitecturalContextResource,
  'Current architectural state and decisions'
);
