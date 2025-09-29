/**
 * Perform Research Tool
 *
 * New MCP tool that uses the research orchestrator to answer research questions
 * using cascading sources: project files → knowledge graph → environment → web search
 */

import { McpAdrError } from '../types/index.js';
import { ResearchOrchestrator } from '../utils/research-orchestrator.js';

/**
 * Perform research using the orchestrated multi-source approach
 */
export async function performResearch(args: {
  question: string;
  projectPath?: string;
  adrDirectory?: string;
  confidenceThreshold?: number;
  performWebSearch?: boolean;
}): Promise<any> {
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
    // Create research orchestrator
    const orchestrator = new ResearchOrchestrator(projectPath, adrDirectory);
    orchestrator.setConfidenceThreshold(confidenceThreshold);

    // Perform research
    const research = await orchestrator.answerResearchQuestion(question);

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
        response += `\n### ${this.formatSourceName(source.type)}
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
${this.generateSearchQueries(question).map(q => `- "${q}"`).join('\n')}
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