/**
 * Tiered Response System
 *
 * Implements conversational summarization to combat context decay.
 * Returns compact summaries with references to full analysis stored in memory.
 */

export interface TieredResponseSection {
  /** Brief summary of this section (100-200 tokens) */
  summary: string;
  /** Whether full details are available for expansion */
  hasDetails: boolean;
  /** Token count of full content (for transparency) */
  fullTokenCount?: number;
}

export interface TieredResponse {
  /** Executive summary (300-500 tokens) - always shown */
  summary: string;

  /** Unique ID to retrieve full analysis from memory */
  expandableId: string;

  /** Timestamp when analysis was created */
  timestamp: string;

  /** Tool that generated this response */
  toolName: string;

  /** Expandable sections with summaries */
  sections: Record<string, TieredResponseSection>;

  /** Estimated token savings vs full response */
  tokenSavings?: {
    summaryTokens: number;
    fullTokens: number;
    savingsPercent: number;
  };
}

export interface ExpandableContent {
  /** Full analysis content */
  content: string;

  /** Section breakdown for partial expansion */
  sections: Record<string, string>;

  /** Metadata */
  metadata: {
    toolName: string;
    timestamp: string;
    toolArgs: any;
    tokenCount: number;
  };
}

/**
 * Configuration for tiered response generation
 */
export interface TieredResponseConfig {
  /** Maximum tokens for summary (default: 500) */
  maxSummaryTokens?: number;

  /** Maximum tokens per section summary (default: 150) */
  maxSectionSummaryTokens?: number;

  /** Whether to use AI for summarization (default: true) */
  useAiSummarization?: boolean;

  /** Temperature for AI summarization (default: 0.3) */
  summarizationTemperature?: number;

  /** Minimum token count to trigger tiering (default: 2000) */
  tieringThreshold?: number;
}
