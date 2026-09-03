/**
 * Tiered Response Manager
 *
 * Manages creation and retrieval of tiered responses for conversational summarization.
 * Implements token-efficient responses with expandable sections stored in memory.
 */

import crypto from 'crypto';
import { MemoryEntityManager } from './memory-entity-manager.js';
import {
  TieredResponse,
  TieredResponseSection,
  ExpandableContent,
  TieredResponseConfig,
} from '../types/tiered-response.js';
// prompt-execution import removed during CE-MCP migration (#1636)
import { EnhancedLogger } from './enhanced-logging.js';

export class TieredResponseManager {
  private memoryManager: MemoryEntityManager;
  private logger: EnhancedLogger;
  private config: Required<TieredResponseConfig>;

  constructor(memoryManager?: MemoryEntityManager, config?: TieredResponseConfig) {
    this.memoryManager = memoryManager || new MemoryEntityManager();
    this.logger = new EnhancedLogger();
    this.config = {
      maxSummaryTokens: config?.maxSummaryTokens || 500,
      maxSectionSummaryTokens: config?.maxSectionSummaryTokens || 150,
      useAiSummarization: config?.useAiSummarization ?? true,
      summarizationTemperature: config?.summarizationTemperature || 0.3,
      tieringThreshold: config?.tieringThreshold || 2000,
    };
  }

  async initialize(): Promise<void> {
    await this.memoryManager.initialize();
  }

  /**
   * Create a tiered response from full analysis content
   */
  async createTieredResponse(
    toolName: string,
    fullContent: string,
    sections: Record<string, string>,
    toolArgs?: any
  ): Promise<TieredResponse> {
    const expandableId = crypto.randomUUID();
    const timestamp = new Date().toISOString();

    // Estimate token counts (rough: 1 token ≈ 4 characters)
    const fullTokens = Math.ceil(fullContent.length / 4);
    const shouldTier = fullTokens >= this.config.tieringThreshold;

    if (!shouldTier) {
      // Content is small enough - no tiering needed
      return {
        summary: fullContent,
        expandableId,
        timestamp,
        toolName,
        sections: {},
        tokenSavings: {
          summaryTokens: fullTokens,
          fullTokens,
          savingsPercent: 0,
        },
      };
    }

    // Generate executive summary
    const summary = await this.generateSummary(
      fullContent,
      this.config.maxSummaryTokens,
      'executive'
    );

    // Generate section summaries
    const sectionSummaries: Record<string, TieredResponseSection> = {};
    for (const [sectionName, sectionContent] of Object.entries(sections)) {
      const sectionSummary = await this.generateSummary(
        sectionContent,
        this.config.maxSectionSummaryTokens,
        'section'
      );

      sectionSummaries[sectionName] = {
        summary: sectionSummary,
        hasDetails: true,
        fullTokenCount: Math.ceil(sectionContent.length / 4),
      };
    }

    // Store expandable content in memory
    const expandableContent: ExpandableContent = {
      content: fullContent,
      sections,
      metadata: {
        toolName,
        timestamp,
        toolArgs,
        tokenCount: fullTokens,
      },
    };

    await this.storeExpandableContent(expandableId, expandableContent);

    // Calculate token savings
    const summaryTokens = Math.ceil(summary.length / 4);
    const tokenSavings = {
      summaryTokens,
      fullTokens,
      savingsPercent: Math.round(((fullTokens - summaryTokens) / fullTokens) * 100),
    };

    this.logger.info(
      `Created tiered response: ${tokenSavings.savingsPercent}% token reduction`,
      'TieredResponseManager',
      { expandableId, toolName, fullTokens, summaryTokens }
    );

    return {
      summary,
      expandableId,
      timestamp,
      toolName,
      sections: sectionSummaries,
      tokenSavings,
    };
  }

  /**
   * Generate a summary using deterministic truncation.
   * (AI summarization via prompt-execution was removed during CE-MCP migration #1636.)
   */
  private async generateSummary(
    content: string,
    maxTokens: number,
    _type: 'executive' | 'section'
  ): Promise<string> {
    try {
      return this.truncateSummary(content, maxTokens);
    } catch (error) {
      this.logger.warn('AI summarization failed, using truncation', 'TieredResponseManager', {
        error: error instanceof Error ? error.message : String(error),
      });
      return this.truncateSummary(content, maxTokens);
    }
  }

  /**
   * Fallback: Truncate content to approximate token limit
   */
  private truncateSummary(content: string, maxTokens: number): string {
    const maxChars = maxTokens * 4; // Rough approximation
    if (content.length <= maxChars) {
      return content;
    }

    // Truncate at sentence boundary
    const truncated = content.substring(0, maxChars);
    const lastPeriod = truncated.lastIndexOf('.');
    const lastNewline = truncated.lastIndexOf('\n');
    const cutPoint = Math.max(lastPeriod, lastNewline);

    if (cutPoint > maxChars * 0.8) {
      // Good cutpoint found
      return truncated.substring(0, cutPoint + 1) + '\n\n[...continued in full analysis]';
    }

    // No good cutpoint, hard truncate
    return truncated + '...\n\n[...continued in full analysis]';
  }

  /**
   * Store expandable content in memory system
   */
  private async storeExpandableContent(
    expandableId: string,
    content: ExpandableContent
  ): Promise<void> {
    await this.memoryManager.upsertEntity({
      id: expandableId,
      type: 'knowledge_artifact',
      title: `Expandable Analysis: ${content.metadata.toolName}`,
      description: `Full analysis content from ${content.metadata.toolName} tool. Token count: ${content.metadata.tokenCount}. Expandable ID: ${expandableId}`,
      artifactData: {
        artifactType: 'analysis' as const,
        content: JSON.stringify(content),
        format: 'json' as const,
        sourceReliability: 1.0,
        applicabilityScope: ['deployment', 'analysis', content.metadata.toolName],
        keyInsights: [],
        actionableItems: [],
      },
      tags: ['expandable', 'tiered-response', content.metadata.toolName, `id:${expandableId}`],
      confidence: 1.0,
    });
  }

  /**
   * Retrieve expandable content from memory
   */
  async getExpandableContent(expandableId: string): Promise<ExpandableContent | null> {
    try {
      const entity = await this.memoryManager.getEntity(expandableId);
      if (!entity || entity.type !== 'knowledge_artifact') {
        return null;
      }

      const artifactContent = entity.artifactData?.content;
      if (!artifactContent) {
        return null;
      }

      return JSON.parse(artifactContent) as ExpandableContent;
    } catch (error) {
      this.logger.error(
        'Failed to retrieve expandable content',
        'TieredResponseManager',
        error instanceof Error ? error : undefined,
        {
          expandableId,
          errorMessage: error instanceof Error ? error.message : String(error),
        }
      );
      return null;
    }
  }

  /**
   * Format tiered response for display
   */
  formatTieredResponse(response: TieredResponse): string {
    const parts = [
      `# ${response.toolName} Analysis`,
      '',
      '## 📊 Executive Summary',
      response.summary,
      '',
    ];

    // Add sections if available
    if (Object.keys(response.sections).length > 0) {
      parts.push('## 📑 Sections (Summaries)');
      parts.push('');

      for (const [name, section] of Object.entries(response.sections)) {
        parts.push(`### ${name}`);
        parts.push(section.summary);
        if (section.hasDetails) {
          parts.push(
            `\n💡 *Full details available (${section.fullTokenCount || '~'} tokens) - use \`expand_analysis_section\` with section: "${name}"*`
          );
        }
        parts.push('');
      }
    }

    // Add expansion info
    parts.push('---');
    parts.push('## 🔍 Full Analysis Available');
    parts.push('');
    parts.push(`**Expandable ID:** \`${response.expandableId}\``);
    parts.push(
      `**Tool:** ${response.toolName} | **Generated:** ${new Date(response.timestamp).toLocaleString()}`
    );

    if (response.tokenSavings) {
      parts.push('');
      parts.push('### Token Efficiency');
      parts.push(`- Summary: ${response.tokenSavings.summaryTokens} tokens`);
      parts.push(`- Full Analysis: ${response.tokenSavings.fullTokens} tokens`);
      parts.push(
        `- **Savings: ${response.tokenSavings.savingsPercent}%** (${response.tokenSavings.fullTokens - response.tokenSavings.summaryTokens} tokens saved)`
      );
    }

    parts.push('');
    parts.push(
      '💡 **To view full analysis:** Use `expand_analysis_section` tool with `expandableId: "' +
        response.expandableId +
        '"`'
    );

    return parts.join('\n');
  }
}
