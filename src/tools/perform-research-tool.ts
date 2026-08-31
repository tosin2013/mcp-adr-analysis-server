/**
 * Perform Research Tool
 *
 * New MCP tool that uses the research orchestrator to answer research questions
 * using cascading sources: project files → knowledge graph → environment → web search
 */

import { McpAdrError } from '../types/index.js';
import type { ToolContext } from '../types/tool-context.js';
import { answerResearchQuestion } from '../utils/research-orchestrator.js';
import { ToolContextManager, type ToolContextDocument } from '../utils/context-document-manager.js';
import * as path from 'path';
import { existsSync } from 'fs';

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
/**
 * Which ADR files did this research actually read?
 *
 * Derived from the project_files source rather than re-globbing the directory:
 * listing every ADR that exists would assert a link the research never made, and
 * an over-broad citation is worse than none -- it makes the link unfalsifiable.
 *
 * Exported for test. The citation rule is the whole substance of #1528 -- if it
 * silently stopped matching, every generated document would go back to citing
 * nothing and the file would still be written, so the failure is invisible from
 * the outside. Reaching it through performResearch() would mean standing up the
 * orchestrator, so the rule is tested directly.
 */
export function collectConsultedAdrs(
  sources: Array<{ type: string; data?: any }>,
  projectPath: string,
  adrDirectory: string
): string[] {
  const adrRoot = path.resolve(projectPath, adrDirectory);
  const files = sources
    .filter(s => s.type === 'project_files')
    .flatMap(s => (Array.isArray(s.data?.files) ? (s.data.files as string[]) : []));

  const seen = new Set<string>();
  for (const f of files) {
    if (typeof f !== 'string') continue;
    if (!f.endsWith('.md')) continue;
    if (path.basename(f).toLowerCase() === 'readme.md') continue;

    // Two path conventions arrive in this one list, because the orchestrator
    // builds it from two different roots:
    //
    //   PHASE 4  findFiles(projectPath, ['**/*<keyword>*'])  -> 'docs/adrs/adr-001.md'
    //   PHASE 3  findFiles(adrPath,     ['**/*.md'])         -> 'adr-001.md'
    //
    // Resolving only against projectPath dropped every PHASE 3 entry -- the
    // "Always include ADRs" pass, which is the source this citation was written
    // to read. It looked correct against this repository only because PHASE 4's
    // keyword search happens to match ADR filenames here.
    //
    // Existence is checked rather than inferred: the adrRoot-relative reading of
    // an arbitrary 'docs/planning/x.md' also lands under adrRoot, so a path test
    // alone would invent citations. A cited ADR is one that is on disk, which is
    // also what the link check in #1527 will require.
    const abs = [path.resolve(projectPath, f), path.resolve(adrRoot, f)].find(
      candidate => candidate.startsWith(adrRoot + path.sep) && existsSync(candidate)
    );
    if (!abs) continue;
    seen.add(path.relative(projectPath, abs));
  }
  return [...seen].sort();
}

export async function performResearch(
  args: {
    question: string;
    projectPath?: string;
    adrDirectory?: string;
    researchDirectory?: string;
    confidenceThreshold?: number;
    performWebSearch?: boolean;
  },
  context?: ToolContext
): Promise<any> {
  const {
    question,
    projectPath = process.cwd(),
    adrDirectory = 'docs/adrs',
    researchDirectory = 'docs/research',
    confidenceThreshold = 0.6,
    performWebSearch = true,
  } = args;

  if (!question || question.trim().length === 0) {
    throw new McpAdrError('Research question is required', 'INVALID_INPUT');
  }

  try {
    context?.info(`🔍 Starting research: ${question}`);
    context?.report_progress(0, 100);

    context?.info('📁 Searching project files...');
    context?.report_progress(25, 100);

    // Perform research (orchestrator handles: files → knowledge graph → environment → web)
    context?.info('📊 Querying knowledge graph and environment resources...');
    context?.report_progress(50, 100);

    const research = await answerResearchQuestion(question, projectPath, adrDirectory, {
      confidenceThreshold,
    });

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

    // Save research context for future sessions
    try {
      const contextManager = new ToolContextManager(projectPath);
      // No initialize() call: it eagerly mkdir -p's every category under
      // docs/context/, which left an empty docs/context/research/ in the user's
      // tree even when the document was written to researchDirectory. saveContext
      // creates its own target directory, so initialize() is redundant here and
      // its only effect was the orphan. (#1528)

      const contextDoc: ToolContextDocument = {
        metadata: {
          toolName: 'perform_research',
          toolVersion: '2.0.0',
          generated: new Date().toISOString(),
          projectPath,
          projectName: path.basename(projectPath),
          status: research.confidence >= confidenceThreshold ? 'success' : 'partial',
          confidence: research.confidence * 100,
        },
        quickReference: `Research: "${question}" - ${(research.confidence * 100).toFixed(0)}% confidence. Sources: ${research.sources.map(s => formatSourceName(s.type)).join(', ')}`,
        executionSummary: {
          status: `Research completed with ${(research.confidence * 100).toFixed(0)}% confidence`,
          confidence: research.confidence * 100,
          keyFindings: [
            `Question: ${question}`,
            `Confidence: ${(research.confidence * 100).toFixed(1)}%`,
            `Sources consulted: ${research.metadata.sourcesQueried.join(', ')}`,
            `Files analyzed: ${research.metadata.filesAnalyzed}`,
            `Duration: ${research.metadata.duration}ms`,
          ],
        },
        detectedContext: {
          question,
          answer: research.answer,
          confidence: research.confidence,
          sources: research.sources.map(s => ({
            type: s.type,
            confidence: s.confidence,
            timestamp: s.timestamp,
            dataType: s.data ? Object.keys(s.data).join(', ') : 'none',
          })),
          needsWebSearch: research.needsWebSearch,
        },
        keyDecisions: [
          {
            decision: `Research approach: ${research.metadata.sourcesQueried.join(' → ')}`,
            rationale: `Cascading research strategy from local project files to external sources`,
            alternatives: ['Direct web search', 'Manual code review'],
          },
        ],
        learnings: {
          successes:
            research.confidence >= 0.8
              ? ['High confidence research results obtained', 'Sufficient local context available']
              : research.confidence >= 0.6
                ? ['Moderate confidence results', 'Some local context found']
                : [],
          failures:
            research.confidence < 0.6
              ? [
                  'Low confidence - insufficient local data',
                  'May need web search or manual research',
                ]
              : [],
          recommendations:
            research.confidence >= 0.8
              ? ['Results can be used with confidence', 'Consider documenting findings in ADR']
              : research.confidence >= 0.6
                ? [
                    'Validate findings with additional sources',
                    'Consider cross-referencing with documentation',
                  ]
                : ['Perform web search for additional context', 'Manual research recommended'],
          environmentSpecific: [],
        },
        relatedDocuments: {
          // The ADRs this research actually consulted, not an empty array.
          //
          // research-orchestrator.ts PHASE 3 ("Always include ADRs") globs every
          // file under adrDirectory into the project_files source, and this write
          // site used to hardcode `adrs: []` -- discarding it. That single line is
          // why 187 generated research documents cite zero ADRs between them,
          // while docs/research/README.md has required since 2025-12 that "all
          // research must link to relevant ADRs". The field existed, the renderer
          // existed (context-document-manager.ts:431 emits "**ADRs**:"), and the
          // data was gathered. Only the assignment was missing. (#1528)
          adrs: collectConsultedAdrs(research.sources, projectPath, adrDirectory),
          configs: [],
          otherContexts: [],
        },
        rawData: {
          research: {
            answer: research.answer,
            confidence: research.confidence,
            sources: research.sources,
            needsWebSearch: research.needsWebSearch,
            metadata: research.metadata,
          },
        },
      };

      await contextManager.saveContext(
        'research',
        contextDoc,
        path.resolve(projectPath, researchDirectory)
      );
      context?.info('💾 Research context saved for future reference');
    } catch (contextError) {
      // Don't fail the research if context saving fails
      context?.info(`⚠️ Failed to save research context: ${contextError}`);
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
