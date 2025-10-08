/**
 * Perform Research Tool
 *
 * New MCP tool that uses the research orchestrator to answer research questions
 * using cascading sources: project files → knowledge graph → environment → web search
 */

import { McpAdrError } from '../types/index.js';
import type { ToolContext } from '../types/tool-context.js';
import { ResearchOrchestrator } from '../utils/research-orchestrator.js';

/**
 * Perform research using the orchestrated multi-source approach
 *
 * @description Executes comprehensive research using cascading data sources:
 * project files → knowledge graph → environment analysis → web search.
 * Returns structured research results with confidence scoring and source attribution.
 *
 * @param {Object} args - Research configuration parameters
 * @param {string} args.question - The research question to investigate
 * @param {string} [args.projectPath] - Path to project root (defaults to cwd)
 * @param {string} [args.adrDirectory] - ADR directory relative to project (defaults to 'docs/adrs')
 * @param {number} [args.confidenceThreshold] - Minimum confidence for results (0-1, defaults to 0.6)
 * @param {boolean} [args.performWebSearch] - Enable web search as fallback (defaults to true)
 *
 * @returns {Promise<any>} Research results with answer, confidence, and sources
 *
 * @throws {McpAdrError} When question is empty or research orchestration fails
 *
 * @example
 * ```typescript
 * // Basic research question
 * const result = await performResearch({
 *   question: 'What authentication methods are used in this project?'
 * });
 *
 * console.log(result.answer);     // Research findings
 * console.log(result.confidence); // 0.85
 * console.log(result.sources);    // ['project-files', 'knowledge-graph']
 * ```
 *
 * @example
 * ```typescript
 * // Advanced research with custom settings
 * const result = await performResearch({
 *   question: 'How does the deployment pipeline work?',
 *   projectPath: '/path/to/project',
 *   confidenceThreshold: 0.8,
 *   performWebSearch: false
 * });
 * ```
 *
 * @since 2.0.0
 * @category Research
 * @category Tools
 * @mcp-tool
 */
export async function performResearch(
  args: {
    question: string;
    projectPath?: string;
    adrDirectory?: string;
    confidenceThreshold?: number;
    performWebSearch?: boolean;
  },
  context?: ToolContext
): Promise<any> {
  const {
    question,
    projectPath = process.cwd(),
    adrDirectory = 'docs/adrs',
    confidenceThreshold = 0.6,
    performWebSearch = true,
  } = args;

  if (!question || question.trim().length === 0) {
    throw new McpAdrError('Research question is required', 'INVALID_INPUT');
  }

  try {
    context?.info(`🔍 Starting research: ${question}`);
    context?.report_progress(0, 100);

    // Create research orchestrator
    const orchestrator = new ResearchOrchestrator(projectPath, adrDirectory);
    orchestrator.setConfidenceThreshold(confidenceThreshold);

    context?.info('📁 Searching project files...');
    context?.report_progress(25, 100);

    // Perform research (orchestrator handles: files → knowledge graph → environment → web)
    context?.info('📊 Querying knowledge graph and environment resources...');
    context?.report_progress(50, 100);

    const research = await orchestrator.answerResearchQuestion(question);

    context?.info('🌐 Analyzing results and preparing response...');
    context?.report_progress(75, 100);

    // Format response
    let response = `# Research Results: ${question}

## Summary
${research.answer || 'No conclusive answer found from available sources.'}

## Confidence Score: ${(research.confidence * 100).toFixed(1)}%

## Sources Consulted
`;

    // Add source details
    if (research.sources.length === 0) {
      response += '\n*No relevant sources found*\n';
    } else {
      for (const source of research.sources) {
        response += `\n### ${formatSourceName(source.type)}
- **Confidence**: ${(source.confidence * 100).toFixed(1)}%
- **Timestamp**: ${source.timestamp}
`;

        // Add source-specific details
        if (source.type === 'project_files') {
          const files = source.data.files || [];
          response += `- **Files Found**: ${files.length}\n`;

          if (files.length > 0) {
            response += '\n**Relevant Files**:\n';
            files.slice(0, 10).forEach((file: string) => {
              const relevance = source.data.relevance?.[file];
              response += `- \`${file}\`${relevance ? ` (relevance: ${(relevance * 100).toFixed(0)}%)` : ''}\n`;
            });

            if (files.length > 10) {
              response += `\n*... and ${files.length - 10} more files*\n`;
            }
          }
        }

        if (source.type === 'knowledge_graph') {
          const nodes = source.data.nodes || [];
          response += `- **Related ADRs**: ${nodes.length}\n`;
        }

        if (source.type === 'environment') {
          const capabilities = source.data.capabilities || [];
          response += `- **Available Capabilities**: ${capabilities.join(', ')}\n`;

          if (source.data.data?.length > 0) {
            response += '\n**Environment Data**:\n';
            source.data.data.forEach((cap: any) => {
              response += `- **${cap.capability}**: ${cap.found ? '✅ Data found' : '❌ No data'}\n`;
            });
          }
        }
      }
    }

    // Web search recommendation
    if (research.needsWebSearch && performWebSearch) {
      response += `

## 🌐 Web Search Recommended

Confidence is below threshold (${(confidenceThreshold * 100).toFixed(0)}%).
Consider performing a web search for additional information:

**Suggested search queries**:
${generateSearchQueries(question)
  .map(q => `- "${q}"`)
  .join('\n')}
`;
    }

    // Metadata
    response += `

## Research Metadata
- **Duration**: ${research.metadata.duration}ms
- **Sources Queried**: ${research.metadata.sourcesQueried.join(', ')}
- **Files Analyzed**: ${research.metadata.filesAnalyzed}
- **Overall Confidence**: ${(research.confidence * 100).toFixed(1)}%

## Next Steps

`;

    if (research.confidence >= 0.8) {
      response += `✅ High confidence answer. You can proceed with this information.
`;
    } else if (research.confidence >= 0.6) {
      response += `⚠️ Moderate confidence. Consider validating findings with additional sources.
`;
    } else {
      response += `❌ Low confidence. Web search or manual research recommended.
`;
    }

    // Recommendations based on sources
    if (research.sources.some(s => s.type === 'project_files')) {
      response += `
### Recommended Actions
1. Review the identified project files for detailed implementation information
2. Check for any related configuration files or documentation
3. Consider creating or updating ADRs to document findings
`;
    }

    if (research.sources.some(s => s.type === 'environment')) {
      response += `
### Environment Insights
- Live environment data is available for verification
- Consider running environment analysis tools for more details
- Check environment configuration against ADR requirements
`;
    }

    context?.info('✅ Research complete!');
    context?.report_progress(100, 100);

    return {
      content: [
        {
          type: 'text',
          text: response,
        },
      ],
    };
  } catch (error) {
    throw new McpAdrError(
      `Failed to perform research: ${error instanceof Error ? error.message : String(error)}`,
      'RESEARCH_ERROR'
    );
  }
}

/**
 * Format source name for display
 */
function formatSourceName(sourceType: string): string {
  const names: Record<string, string> = {
    project_files: '📁 Project Files',
    knowledge_graph: '🧠 Knowledge Graph',
    environment: '🔧 Environment Resources',
    web_search: '🌐 Web Search',
  };

  return names[sourceType] || sourceType;
}

/**
 * Generate web search queries based on research question
 */
function generateSearchQueries(question: string): string[] {
  const queries: string[] = [question];

  // Add variations
  const questionLower = question.toLowerCase();

  if (questionLower.includes('what')) {
    queries.push(question.replace(/^what/i, 'how to'));
  }

  if (questionLower.includes('how')) {
    queries.push(question.replace(/^how/i, 'best practices for'));
  }

  // Add context-specific queries
  if (questionLower.includes('kubernetes') || questionLower.includes('k8s')) {
    queries.push(`${question} kubernetes best practices`);
  }

  if (questionLower.includes('docker')) {
    queries.push(`${question} docker production`);
  }

  if (questionLower.includes('openshift')) {
    queries.push(`${question} openshift documentation`);
  }

  return queries.slice(0, 3); // Limit to top 3
}
