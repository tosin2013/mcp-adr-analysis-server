/**
 * LLM-Managed Web Search Tool
 *
 * Uses Firecrawl for cross-platform web search with LLM-driven query optimization
 */

import { McpAdrError } from '../types/index.js';
import { ResearchOrchestrator } from '../utils/research-orchestrator.js';

/**
 * LLM-managed web search using Firecrawl for cross-platform support
 *
 * @description Executes intelligent web search using Firecrawl with LLM-driven
 * query optimization and content relevance scoring. Supports RHEL, Ubuntu, and macOS.
 *
 * @param {Object} args - Web search configuration parameters
 * @param {string} args.query - The search query to execute
 * @param {number} [args.maxResults] - Maximum results to return (default: 5)
 * @param {boolean} [args.includeContent] - Include full content (default: true)
 * @param {string} [args.llmInstructions] - LLM instructions for search optimization
 * @param {string} [args.projectPath] - Path to project root (defaults to cwd)
 * @param {string} [args.adrDirectory] - ADR directory relative to project (defaults to 'docs/adrs')
 *
 * @returns {Promise<any>} Web search results with LLM analysis
 *
 * @throws {McpAdrError} When query is empty or search fails
 *
 * @example
 * ```typescript
 * // Basic web search
 * const result = await llmWebSearch({
 *   query: 'Red Hat OpenShift best practices'
 * });
 *
 * console.log(result.results); // Array of search results
 * console.log(result.llmAnalysis); // LLM analysis of results
 * ```
 *
 * @example
 * ```typescript
 * // Advanced search with LLM instructions
 * const result = await llmWebSearch({
 *   query: 'Kubernetes security hardening',
 *   maxResults: 10,
 *   llmInstructions: 'Focus on enterprise security practices and compliance requirements'
 * });
 * ```
 *
 * @since 2.1.0
 * @category Web Search
 * @category LLM
 * @mcp-tool
 */
export async function llmWebSearch(args: {
  query: string;
  maxResults?: number;
  includeContent?: boolean;
  llmInstructions?: string;
  projectPath?: string;
  adrDirectory?: string;
}): Promise<any> {
  const {
    query,
    maxResults = 5,
    includeContent = true,
    llmInstructions,
    projectPath,
    adrDirectory,
  } = args;

  if (!query || query.trim().length === 0) {
    throw new McpAdrError('Query parameter is required and cannot be empty', 'INVALID_QUERY');
  }

  try {
    // Initialize research orchestrator with Firecrawl
    const orchestrator = new ResearchOrchestrator(projectPath, adrDirectory);

    // Enhance query with LLM instructions if provided
    let enhancedQuery = query;
    if (llmInstructions) {
      enhancedQuery = `${query}\n\nLLM Instructions: ${llmInstructions}`;
    }

    // Perform web search using research orchestrator
    const researchResult = await orchestrator.answerResearchQuestion(enhancedQuery);

    // Extract web search results
    const webSearchSource = researchResult.sources.find(source => source.type === 'web_search');
    const webResults = webSearchSource?.data?.results || [];

    // Limit results
    const limitedResults = webResults.slice(0, maxResults);

    // Generate LLM analysis of results
    const llmAnalysis = await generateLLMAnalysis(query, limitedResults, llmInstructions);

    return {
      content: [
        {
          type: 'text',
          text: `# LLM-Managed Web Search Results

## Query
${query}

${llmInstructions ? `## LLM Instructions\n${llmInstructions}\n` : ''}

## Search Results (${limitedResults.length} found)

${limitedResults
  .map(
    (result: any, index: number) => `
### ${index + 1}. ${result.title}
- **URL**: ${result.url}
- **Relevance**: ${(result.relevance * 100).toFixed(1)}%
- **Content**: ${includeContent ? result.content?.substring(0, 500) + '...' : 'Content available'}

---
`
  )
  .join('\n')}

## LLM Analysis
${llmAnalysis}

## Search Metadata
- **Provider**: Firecrawl
- **Total Results**: ${webResults.length}
- **Returned Results**: ${limitedResults.length}
- **Confidence**: ${(researchResult.confidence * 100).toFixed(1)}%
- **Timestamp**: ${new Date().toISOString()}
`,
        },
      ],
    };
  } catch (error) {
    throw new McpAdrError(
      `Web search failed: ${error instanceof Error ? error.message : String(error)}`,
      'WEB_SEARCH_ERROR'
    );
  }
}

/**
 * Generate LLM analysis of search results
 */
async function generateLLMAnalysis(
  _query: string,
  _results: unknown[],
  _instructions?: string
): Promise<string> {
  // TODO: Implement LLM analysis when AI executor is available
  // const { loadAIConfig, getAIExecutor } = await import('../config/ai-config.js');
  // const aiConfig = loadAIConfig();
  // const executor = getAIExecutor();

  // const prompt = `
  // Analyze these web search results for the query: "${query}"
  //
  // ${instructions ? `Additional Instructions: ${instructions}` : ''}
  //
  // Search Results:
  // ${results.map((result, index) => `
  // ${index + 1}. ${result.title}
  // URL: ${result.url}
  // Relevance: ${(result.relevance * 100).toFixed(1)}%
  // Content Preview: ${result.content?.substring(0, 300)}...
  // `).join('\n')}
  //
  // Provide analysis covering:
  // 1. Overall quality and relevance of results
  // 2. Key insights and findings
  // 3. Gaps or missing information
  // 4. Recommendations for further research
  // 5. Summary of most valuable sources
  //
  // Keep analysis concise but comprehensive.
  // `;

  // const result = await executor.executeStructuredPrompt(prompt, {
  //   type: 'object',
  //   properties: {
  //     analysis: { type: 'string' }
  //   }
  // });
  // return result.data.analysis || 'Analysis unavailable';

  return 'LLM analysis is not yet available. Results are available but require manual review.';
}
