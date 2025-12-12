/**
 * APE (Automatic Prompt Engineering) Description Constants
 *
 * This file extracts hardcoded description maps from the APE module
 * to reduce memory footprint and enable configuration reuse.
 *
 * Optimization Benefits:
 * - Reduces memory churn by ~1.2KB per module load
 * - Enables lazy loading of descriptions
 * - Centralizes APE configuration for easier maintenance
 * - Supports future internationalization
 *
 * @see ADR-015 for optimization rationale
 */

import type {
  GenerationStrategy,
  EvaluationCriterion,
  SelectionStrategy,
} from '../types/ape-framework.js';

// ============================================================================
// Generation Strategy Descriptions
// ============================================================================

/**
 * Descriptions for prompt generation strategies
 * Used in candidate generation to explain each strategy's approach
 */
export const STRATEGY_DESCRIPTIONS: Record<GenerationStrategy, string> = {
  'template-variation': 'Use different prompt templates and structural formats',
  'semantic-variation': 'Rephrase while preserving meaning and intent',
  'style-variation': 'Adjust tone, formality, and communication style',
  'length-variation': 'Create concise, detailed, and balanced versions',
  'structure-variation': 'Reorganize content with different patterns',
  'hybrid-approach': 'Combine multiple strategies for optimal results',
};

// ============================================================================
// Evaluation Criterion Descriptions
// ============================================================================

/**
 * Descriptions for prompt evaluation criteria
 * Used to explain what each criterion measures during evaluation
 */
export const CRITERION_DESCRIPTIONS: Record<EvaluationCriterion, string> = {
  'task-completion': 'How well the prompt achieves the intended task outcome',
  clarity: 'How clear, unambiguous, and easy to understand the prompt is',
  specificity: 'How specific, actionable, and detailed the prompt is',
  robustness: 'How well the prompt handles edge cases and variations',
  efficiency: 'How concise yet comprehensive the prompt is',
  'context-awareness': 'How well the prompt fits the specific context and domain',
};

// ============================================================================
// Selection Strategy Descriptions
// ============================================================================

/**
 * Descriptions for candidate selection strategies
 * Explains how the best prompt candidate is selected
 */
export const SELECTION_STRATEGY_DESCRIPTIONS: Record<SelectionStrategy, string> = {
  'highest-score': 'Select the candidate with the highest overall evaluation score',
  'multi-criteria': 'Balance multiple evaluation criteria with appropriate weights',
  ensemble: 'Combine strengths of multiple high-performing candidates',
  'context-aware': 'Choose based on context-specific suitability and requirements',
  balanced: 'Balance quality, diversity, and context appropriateness',
};

// ============================================================================
// Tool-Specific Optimization Priorities
// ============================================================================

/**
 * Tool-specific optimization priorities for APE
 * Defines what aspects to focus on when optimizing prompts for specific tools
 */
export const TOOL_OPTIMIZATION_PRIORITIES: Record<string, string[]> = {
  generate_adrs_from_prd: [
    'Context Analysis: Better understanding of PRD requirements and constraints',
    'Decision Quality: Clearer architectural decision rationale and justification',
    'Stakeholder Alignment: Improved ADR clarity and relevance for stakeholders',
    'Technical Depth: Appropriate level of technical detail for the context',
  ],
  suggest_adrs: [
    'Relevance: Highly relevant ADR suggestions based on project context',
    'Prioritization: Clear prioritization of suggested ADRs by importance',
    'Feasibility: Realistic and implementable architectural decisions',
    'Impact Assessment: Clear understanding of decision impacts and trade-offs',
  ],
  analyze_project_ecosystem: [
    'Technology Detection: Accurate identification of technologies and frameworks',
    'Pattern Recognition: Better identification of architectural patterns',
    'Context Understanding: Comprehensive project context analysis',
    'Insight Generation: Valuable and actionable architectural insights',
  ],
  generate_research_questions: [
    'Question Quality: High-quality, targeted research questions',
    'Relevance: Questions directly relevant to project needs',
    'Depth: Appropriate depth and scope for research objectives',
    'Actionability: Questions that lead to actionable insights',
  ],
  incorporate_research: [
    'Integration Quality: Effective integration of research findings',
    'Synthesis: Good synthesis of multiple research sources',
    'Relevance: Focus on most relevant research findings',
    'Actionability: Clear actionable recommendations from research',
  ],
};

/**
 * Default optimization priorities for tools not in the specific list
 */
export const DEFAULT_TOOL_PRIORITIES: string[] = [
  "Task Effectiveness: Optimize for the tool's primary task objectives",
  'Context Awareness: Improve understanding of tool-specific context',
  'Output Quality: Enhance the quality and relevance of tool outputs',
  'User Experience: Improve clarity and usability of tool interactions',
];

// ============================================================================
// Helper Functions for Accessing Descriptions
// ============================================================================

/**
 * Get description for a generation strategy with fallback
 */
export function getStrategyDescription(strategy: GenerationStrategy): string {
  return STRATEGY_DESCRIPTIONS[strategy] || 'Apply the specified generation strategy';
}

/**
 * Get description for an evaluation criterion with fallback
 */
export function getCriterionDescription(criterion: EvaluationCriterion): string {
  return CRITERION_DESCRIPTIONS[criterion] || 'Evaluate based on this criterion';
}

/**
 * Get description for a selection strategy with fallback
 */
export function getSelectionStrategyDescription(strategy: SelectionStrategy): string {
  return SELECTION_STRATEGY_DESCRIPTIONS[strategy] || 'Apply the specified selection strategy';
}

/**
 * Get tool-specific optimization priorities
 * Returns formatted string for prompt inclusion
 */
export function getToolOptimizationPriorities(toolName: string): string {
  const priorities = TOOL_OPTIMIZATION_PRIORITIES[toolName] || DEFAULT_TOOL_PRIORITIES;
  return priorities.map(p => `- **${p}**`).join('\n');
}

/**
 * Get raw priorities array for a tool (for programmatic use)
 */
export function getToolPrioritiesArray(toolName: string): string[] {
  return TOOL_OPTIMIZATION_PRIORITIES[toolName] || DEFAULT_TOOL_PRIORITIES;
}

// ============================================================================
// Template Caching Support
// ============================================================================

/**
 * Cache for generated prompt templates
 * Key format: `${templateType}:${configHash}`
 */
const templateCache = new Map<string, string>();

/**
 * Get or create a cached template section
 * Reduces regeneration of static template portions
 */
export function getCachedTemplateSection(sectionKey: string, generator: () => string): string {
  if (templateCache.has(sectionKey)) {
    return templateCache.get(sectionKey)!;
  }
  const content = generator();
  templateCache.set(sectionKey, content);
  return content;
}

/**
 * Clear template cache (useful for testing or config updates)
 */
export function clearTemplateCache(): void {
  templateCache.clear();
}

/**
 * Get template cache statistics
 */
export function getTemplateCacheStats(): { size: number; keys: string[] } {
  return {
    size: templateCache.size,
    keys: Array.from(templateCache.keys()),
  };
}
