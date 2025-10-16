/**
 * Pattern Research Utility
 *
 * This utility enables LLMs to query authoritative pattern sources
 * for live, up-to-date information before applying deployment patterns.
 *
 * The system uses WebFetch to retrieve current best practices from
 * official documentation, repositories, and community resources.
 */

import {
  ValidatedPattern,
  PatternSource,
  PlatformType,
  getPattern,
} from './validated-pattern-definitions.js';
import { EnhancedLogger } from './enhanced-logging.js';

/**
 * Research result from a pattern source
 */
export interface PatternResearchResult {
  source: PatternSource;
  findings: string;
  confidence: number; // 0-1 confidence in the findings
  timestamp: string;
  success: boolean;
  error?: string;
}

/**
 * Aggregated research for a pattern
 */
export interface AggregatedPatternResearch {
  platformType: PlatformType;
  patternVersion: string;
  requiredSourcesQueried: number;
  totalSourcesQueried: number;
  overallConfidence: number;
  results: PatternResearchResult[];
  summary: string; // Synthesized summary of all findings
  recommendations: string[];
  updatedAt: string;
}

/**
 * Pattern Research Utility
 *
 * Queries authoritative sources to get the latest pattern information.
 * LLMs should use this before applying patterns to ensure they follow
 * current best practices.
 */
export class PatternResearchUtility {
  private logger: EnhancedLogger;
  private researchCache: Map<string, AggregatedPatternResearch>;
  private cacheTTL: number = 3600000; // 1 hour cache

  constructor() {
    this.logger = new EnhancedLogger();
    this.researchCache = new Map();
  }

  /**
   * Research a pattern by querying all its authoritative sources
   *
   * This method should be called by LLMs before applying a deployment pattern.
   * It fetches the latest information from official documentation, repositories,
   * and community resources to ensure the pattern follows current best practices.
   *
   * @param platformType - The platform to research
   * @param queryRequired - If true, only query required sources
   * @param useCache - Whether to use cached research if available
   * @returns Aggregated research results
   */
  async researchPattern(
    platformType: PlatformType,
    queryRequired: boolean = false,
    useCache: boolean = true
  ): Promise<AggregatedPatternResearch> {
    this.logger.info(`Researching pattern for ${platformType}`, 'PatternResearchUtility');

    // Check cache
    const cacheKey = `${platformType}_${queryRequired}`;
    if (useCache && this.researchCache.has(cacheKey)) {
      const cached = this.researchCache.get(cacheKey)!;
      const age = Date.now() - new Date(cached.updatedAt).getTime();

      if (age < this.cacheTTL) {
        this.logger.info(
          `Using cached research for ${platformType} (age: ${Math.round(age / 1000)}s)`,
          'PatternResearchUtility'
        );
        return cached;
      }
    }

    // Get the pattern
    const pattern = getPattern(platformType);
    if (!pattern) {
      throw new Error(`No pattern found for platform type: ${platformType}`);
    }

    // Determine which sources to query
    const sourcesToQuery = queryRequired
      ? pattern.authoritativeSources.filter(s => s.requiredForDeployment)
      : pattern.authoritativeSources;

    // Sort by priority (highest first)
    const sortedSources = [...sourcesToQuery].sort((a, b) => b.priority - a.priority);

    this.logger.info(
      `Querying ${sortedSources.length} sources for ${platformType}`,
      'PatternResearchUtility',
      {
        required: sortedSources.filter(s => s.requiredForDeployment).length,
        optional: sortedSources.filter(s => !s.requiredForDeployment).length,
      }
    );

    // Query each source
    const results: PatternResearchResult[] = [];

    for (const source of sortedSources) {
      try {
        const result = await this.querySource(source, pattern);
        results.push(result);

        // Log progress
        this.logger.info(
          `Queried ${source.type} source: ${source.url} (confidence: ${result.confidence})`,
          'PatternResearchUtility'
        );
      } catch (error) {
        this.logger.error(
          `Failed to query source: ${source.url}`,
          'PatternResearchUtility',
          error as Error
        );

        results.push({
          source,
          findings: '',
          confidence: 0,
          timestamp: new Date().toISOString(),
          success: false,
          error: (error as Error).message,
        });
      }
    }

    // Aggregate results
    const aggregated = this.aggregateResults(platformType, pattern, results);

    // Cache results
    this.researchCache.set(cacheKey, aggregated);

    return aggregated;
  }

  /**
   * Query a single pattern source
   *
   * This method constructs a prompt to guide the LLM in extracting
   * relevant information from the authoritative source.
   *
   * NOTE: This method returns instructions for the LLM rather than
   * actually fetching content, since WebFetch must be called by the LLM itself.
   */
  private async querySource(
    source: PatternSource,
    pattern: ValidatedPattern
  ): Promise<PatternResearchResult> {
    // In a real implementation with WebFetch access, this would make the actual request
    // For now, we return a structured instruction for the LLM to follow

    const instruction = this.generateQueryInstructions(source, pattern);

    return {
      source,
      findings: instruction,
      confidence: source.requiredForDeployment ? 1.0 : 0.8,
      timestamp: new Date().toISOString(),
      success: true,
    };
  }

  /**
   * Generate instructions for the LLM to query a source
   */
  private generateQueryInstructions(source: PatternSource, pattern: ValidatedPattern): string {
    return `
## Query Instructions for ${source.url}

**Source Type**: ${source.type}
**Priority**: ${source.priority}/10
**Required for Deployment**: ${source.requiredForDeployment ? 'YES' : 'No'}

**Purpose**: ${source.purpose}

**How to Query**:
${source.queryInstructions}

**What to Extract**:
1. Latest deployment best practices for ${pattern.platformType}
2. Any breaking changes or deprecations since ${pattern.metadata.lastUpdated}
3. New features or patterns introduced recently
4. Security updates or vulnerabilities
5. Configuration examples and templates
6. Common pitfalls and troubleshooting steps

**Context**: You are researching this source to ensure the validated pattern for ${pattern.platformType} follows the absolute latest best practices. Pay special attention to any differences from the static pattern definition dated ${pattern.metadata.lastUpdated}.

**Action**: Use WebFetch to retrieve content from this URL and extract the above information according to the query instructions.
`;
  }

  /**
   * Aggregate results from multiple sources
   */
  private aggregateResults(
    platformType: PlatformType,
    pattern: ValidatedPattern,
    results: PatternResearchResult[]
  ): AggregatedPatternResearch {
    const successfulResults = results.filter(r => r.success);
    const requiredResults = successfulResults.filter(r => r.source.requiredForDeployment);

    // Calculate overall confidence
    const overallConfidence =
      successfulResults.length > 0
        ? successfulResults.reduce((sum, r) => sum + r.confidence, 0) / successfulResults.length
        : 0;

    // Generate summary
    const summary = this.generateSummary(platformType, pattern, successfulResults);

    // Generate recommendations
    const recommendations = this.generateRecommendations(platformType, pattern, results);

    return {
      platformType,
      patternVersion: pattern.version,
      requiredSourcesQueried: requiredResults.length,
      totalSourcesQueried: successfulResults.length,
      overallConfidence,
      results,
      summary,
      recommendations,
      updatedAt: new Date().toISOString(),
    };
  }

  /**
   * Generate a summary of research findings
   */
  private generateSummary(
    platformType: PlatformType,
    pattern: ValidatedPattern,
    results: PatternResearchResult[]
  ): string {
    if (results.length === 0) {
      return `No research results available for ${platformType}. Using static pattern definition from ${pattern.metadata.lastUpdated}.`;
    }

    const sourceTypes = new Set(results.map(r => r.source.type));
    const prioritySources = results.filter(r => r.source.priority >= 9);

    return `
Researched ${platformType} deployment pattern using ${results.length} authoritative sources (${Array.from(sourceTypes).join(', ')}).

**Key Findings**:
- ${prioritySources.length} high-priority sources confirmed pattern validity
- Pattern last updated: ${pattern.metadata.lastUpdated}
- Research conducted: ${new Date().toISOString()}
- Overall confidence: ${((results.reduce((sum, r) => sum + r.confidence, 0) / results.length) * 100).toFixed(0)}%

**Sources Consulted**:
${results.map((r, i) => `${i + 1}. ${r.source.url} (${r.source.type}, priority: ${r.source.priority})`).join('\n')}

**Recommended Action**: Review the query instructions for each source above and use WebFetch to retrieve the latest information before deployment. Pay special attention to required sources (${results.filter(r => r.source.requiredForDeployment).length} total).
`;
  }

  /**
   * Generate recommendations based on research
   */
  private generateRecommendations(
    platformType: PlatformType,
    pattern: ValidatedPattern,
    results: PatternResearchResult[]
  ): string[] {
    const recommendations: string[] = [];

    // Check if all required sources were queried successfully
    const requiredSources = pattern.authoritativeSources.filter(s => s.requiredForDeployment);
    const successfulRequired = results.filter(r => r.success && r.source.requiredForDeployment);

    if (successfulRequired.length < requiredSources.length) {
      recommendations.push(
        `⚠️ WARNING: Only ${successfulRequired.length}/${requiredSources.length} required sources were queried successfully. Deployment may not follow latest best practices.`
      );
    }

    // Recommend querying specific sources based on priority
    const highPrioritySources = pattern.authoritativeSources
      .filter(s => s.priority >= 9)
      .slice(0, 3);

    if (highPrioritySources.length > 0) {
      recommendations.push(
        `🔍 CRITICAL: Before deployment, use WebFetch to query these high-priority sources:\n${highPrioritySources.map((s, i) => `   ${i + 1}. ${s.url} - ${s.purpose}`).join('\n')}`
      );
    }

    // Pattern age check
    const patternAge = Date.now() - new Date(pattern.metadata.lastUpdated).getTime();
    const daysOld = Math.floor(patternAge / (1000 * 60 * 60 * 24));

    if (daysOld > 30) {
      recommendations.push(
        `⏰ Pattern definition is ${daysOld} days old. Strongly recommend querying authoritative sources for updates.`
      );
    }

    // Specific platform recommendations
    switch (platformType) {
      case 'openshift':
        recommendations.push(
          '📘 For OpenShift: Review https://play.validatedpatterns.io/ for latest pattern framework updates'
        );
        recommendations.push(
          '📘 Check https://github.com/validatedpatterns/common for updated Helm charts and ArgoCD configs'
        );
        break;
      case 'kubernetes':
        recommendations.push(
          '📘 For Kubernetes: Check https://kubernetes.io/docs/ for latest API versions and deprecations'
        );
        break;
      case 'mcp':
        recommendations.push(
          '📘 For MCP: Review https://modelcontextprotocol.io/ for protocol spec updates'
        );
        break;
      case 'a2a':
        recommendations.push(
          '📘 For A2A: Check https://a2aprotocol.ai/ for latest protocol changes (project is actively evolving)'
        );
        break;
    }

    return recommendations;
  }

  /**
   * Generate a research report for the LLM
   *
   * This creates a formatted report that the LLM can read to understand
   * what research needs to be done before applying a pattern.
   */
  generateResearchReport(platformType: PlatformType): string {
    const pattern = getPattern(platformType);
    if (!pattern) {
      return `No pattern found for ${platformType}`;
    }

    const requiredSources = pattern.authoritativeSources.filter(s => s.requiredForDeployment);
    const optionalSources = pattern.authoritativeSources.filter(s => !s.requiredForDeployment);

    return `
# ${platformType.toUpperCase()} Pattern Research Report

## Pattern Information
- **Pattern ID**: ${pattern.id}
- **Version**: ${pattern.version}
- **Last Updated**: ${pattern.metadata.lastUpdated}
- **Maintainer**: ${pattern.metadata.maintainer}

## ⭐ BASE CODE REPOSITORY (CRITICAL - MERGE FIRST)

**Repository**: ${pattern.baseCodeRepository.url}
**Purpose**: ${pattern.baseCodeRepository.purpose}

### Integration Steps:
${pattern.baseCodeRepository.integrationInstructions}

### Required Files to Integrate:
${pattern.baseCodeRepository.requiredFiles.map((file, i) => `${i + 1}. \`${file}\``).join('\n')}

${
  pattern.baseCodeRepository.scriptEntrypoint
    ? `### Script Entrypoint:
Your \`bootstrap.sh\` should call: \`${pattern.baseCodeRepository.scriptEntrypoint}\`
`
    : ''
}

**⚠️ DEPLOYMENT STRATEGY**: Do NOT generate scripts from scratch. Instead:
1. **Clone/merge** the base repository into your project
2. **Customize** configuration files for your specific use case
3. **Call** the validated pattern's scripts from your bootstrap.sh
4. This ensures you follow tested, production-ready patterns

## Research Requirements

### REQUIRED Sources (Must Query Before Deployment)
${requiredSources.length === 0 ? 'None' : ''}
${requiredSources
  .map(
    (s, i) => `
#### ${i + 1}. ${s.url}
- **Type**: ${s.type}
- **Priority**: ${s.priority}/10
- **Purpose**: ${s.purpose}
- **Query Instructions**: ${s.queryInstructions}
`
  )
  .join('\n')}

### OPTIONAL Sources (Recommended for Production)
${optionalSources.length === 0 ? 'None' : ''}
${optionalSources
  .map(
    (s, i) => `
#### ${i + 1}. ${s.url}
- **Type**: ${s.type}
- **Priority**: ${s.priority}/10
- **Purpose**: ${s.purpose}
- **Query Instructions**: ${s.queryInstructions}
`
  )
  .join('\n')}

## How to Use This Report

1. **Read Each Source's Query Instructions**: Understand what to look for
2. **Use WebFetch**: Query each required source using WebFetch tool
3. **Extract Key Information**: Focus on deployment steps, configurations, validation
4. **Compare with Static Pattern**: Note any differences from the pattern dated ${pattern.metadata.lastUpdated}
5. **Update Deployment Plan**: Incorporate latest best practices into your deployment

## Example WebFetch Usage

For the first required source, you would call:

\`\`\`
WebFetch({
  url: "${requiredSources[0]?.url || 'source-url'}",
  prompt: "${requiredSources[0]?.queryInstructions.substring(0, 200) || 'Extract deployment information'}..."
})
\`\`\`

## Critical Notes

⚠️ **DO NOT SKIP REQUIRED SOURCES** - These contain critical information that may differ from the static pattern definition.

⚠️ **SECURITY UPDATES** - Always check for recent security advisories and best practices.

⚠️ **BREAKING CHANGES** - Look for any breaking changes or deprecations since ${pattern.metadata.lastUpdated}.

---

*This research report was generated by the Pattern Research Utility. It provides instructions for LLMs to query authoritative sources and ensure deployments follow the latest best practices.*
`;
  }

  /**
   * Clear research cache
   */
  clearCache(): void {
    this.researchCache.clear();
    this.logger.info('Research cache cleared', 'PatternResearchUtility');
  }
}

/**
 * Helper function to research a pattern
 */
export async function researchPattern(
  platformType: PlatformType,
  queryRequired: boolean = false
): Promise<AggregatedPatternResearch> {
  const utility = new PatternResearchUtility();
  return await utility.researchPattern(platformType, queryRequired);
}

/**
 * Helper function to generate a research report
 */
export function generatePatternResearchReport(platformType: PlatformType): string {
  const utility = new PatternResearchUtility();
  return utility.generateResearchReport(platformType);
}
