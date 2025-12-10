/**
 * CE-MCP Prompt Catalog
 *
 * Provides lazy loading of prompts - instead of importing all 6,145 lines
 * of prompt code upfront, this catalog allows on-demand loading of specific
 * prompt sections, reducing token usage by ~96%.
 *
 * @see ADR-014: CE-MCP Architecture
 */

import { PromptCatalog, PromptCatalogEntry } from '../types/ce-mcp.js';

/**
 * Prompt catalog with metadata for lazy loading
 *
 * Token estimates based on ~4 chars per token average
 */
export const PROMPT_CATALOG: PromptCatalog = {
  // ADR-related prompts
  'adr-suggestion': {
    file: 'adr-suggestion-prompts.ts',
    tokens: 1830,
    category: 'adr',
    sections: [
      'implicit_decisions',
      'tech_debt',
      'security_decisions',
      'cross_cutting',
      'recommendation_template',
    ],
    loadOnDemand: true,
  },

  // Deployment analysis prompts
  'deployment-analysis': {
    file: 'deployment-analysis-prompts.ts',
    tokens: 3150,
    category: 'deployment',
    sections: [
      'readiness_check',
      'validation_criteria',
      'rollback_plan',
      'infrastructure_review',
      'security_scan',
    ],
    loadOnDemand: true,
  },

  // Environment analysis prompts
  'environment-analysis': {
    file: 'environment-analysis-prompts.ts',
    tokens: 3050,
    category: 'analysis',
    sections: ['dependency_scan', 'config_validation', 'compliance_check', 'resource_assessment'],
    loadOnDemand: true,
  },

  // Research question prompts
  'research-question': {
    file: 'research-question-prompts.ts',
    tokens: 3120,
    category: 'research',
    sections: ['question_generation', 'research_plan', 'source_evaluation', 'synthesis_template'],
    loadOnDemand: true,
  },

  // Rule generation prompts
  'rule-generation': {
    file: 'rule-generation-prompts.ts',
    tokens: 2850,
    category: 'rules',
    sections: ['rule_template', 'validation_rules', 'enforcement_policy', 'exception_handling'],
    loadOnDemand: true,
  },

  // General analysis prompts
  analysis: {
    file: 'analysis-prompts.ts',
    tokens: 2310,
    category: 'analysis',
    sections: ['project_analysis', 'code_review', 'architecture_assessment', 'quality_metrics'],
    loadOnDemand: true,
  },

  // Research integration prompts
  'research-integration': {
    file: 'research-integration-prompts.ts',
    tokens: 1785,
    category: 'research',
    sections: ['integration_strategy', 'synthesis_plan', 'recommendation_format'],
    loadOnDemand: true,
  },

  // Validated pattern prompts
  'validated-pattern': {
    file: 'validated-pattern-prompts.ts',
    tokens: 1565,
    category: 'deployment',
    sections: ['pattern_detection', 'validation_criteria', 'deployment_guidance'],
    loadOnDemand: true,
  },

  // Security prompts
  security: {
    file: 'security-prompts.ts',
    tokens: 1270,
    category: 'security',
    sections: ['vulnerability_scan', 'masking_rules', 'compliance_check'],
    loadOnDemand: true,
  },

  // Main index (orchestration)
  index: {
    file: 'index.ts',
    tokens: 3700,
    category: 'analysis',
    sections: ['orchestration', 'execution_flow', 'error_handling'],
    dependencies: ['adr-suggestion', 'deployment-analysis', 'analysis'],
    loadOnDemand: false, // Core orchestration loaded at startup
  },
};

/**
 * Get total token count if all prompts were loaded
 */
export function getTotalPromptTokens(): number {
  return Object.values(PROMPT_CATALOG).reduce((sum, entry) => sum + entry.tokens, 0);
}

/**
 * Get prompts by category
 */
export function getPromptsByCategory(category: PromptCatalogEntry['category']): string[] {
  return Object.entries(PROMPT_CATALOG)
    .filter(([_, entry]) => entry.category === category)
    .map(([name]) => name);
}

/**
 * Get prompt metadata
 */
export function getPromptMetadata(promptName: string): PromptCatalogEntry | undefined {
  return PROMPT_CATALOG[promptName];
}

/**
 * Prompt Loader Service
 *
 * Handles lazy loading of prompts with caching
 */
export class PromptLoader {
  private cache: Map<string, { content: string; sections: Map<string, string>; expiry: number }> =
    new Map();
  private cacheTTL: number;

  constructor(cacheTTL: number = 3600) {
    this.cacheTTL = cacheTTL;
  }

  /**
   * Load a specific prompt section
   *
   * @param promptName - Name of the prompt (e.g., 'adr-suggestion')
   * @param section - Optional section within the prompt
   * @returns Promise resolving to the prompt content
   */
  async loadPrompt(promptName: string, section?: string): Promise<string> {
    const metadata = PROMPT_CATALOG[promptName];
    if (!metadata) {
      throw new Error(`Unknown prompt: ${promptName}`);
    }

    // Check cache
    const cacheKey = promptName;
    const cached = this.cache.get(cacheKey);

    if (cached && Date.now() < cached.expiry) {
      if (section) {
        const sectionContent = cached.sections.get(section);
        if (sectionContent) {
          return sectionContent;
        }
      }
      return cached.content;
    }

    // Load prompt dynamically
    const content = await this.loadPromptFile(metadata.file);

    // Parse sections if needed
    const sections = this.parseSections(content, metadata.sections);

    // Cache the result
    this.cache.set(cacheKey, {
      content,
      sections,
      expiry: Date.now() + this.cacheTTL * 1000,
    });

    if (section) {
      const sectionContent = sections.get(section);
      if (sectionContent) {
        return sectionContent;
      }
      throw new Error(`Section '${section}' not found in prompt '${promptName}'`);
    }

    return content;
  }

  /**
   * Load prompt file content
   */
  private async loadPromptFile(fileName: string): Promise<string> {
    // In production, this would use dynamic import or file system read
    // For now, return a placeholder that indicates which file should be loaded
    return `[PROMPT_FILE: ${fileName}]`;
  }

  /**
   * Parse sections from prompt content
   */
  private parseSections(content: string, sectionNames: string[]): Map<string, string> {
    const sections = new Map<string, string>();

    // Basic section parsing - looks for patterns like:
    // // SECTION: section_name
    // or
    // export const SECTION_NAME = ...

    for (const sectionName of sectionNames) {
      // Try to find section marker
      const markerRegex = new RegExp(
        `(?:\\/\\/ SECTION: ${sectionName}|export const ${sectionName.toUpperCase().replace(/-/g, '_')})`,
        'i'
      );

      const match = content.match(markerRegex);
      if (match && match.index !== undefined) {
        // Extract content until next section or end
        const startIndex = match.index;
        const nextSectionMatch = content
          .slice(startIndex + 1)
          .match(/(?:\/\/ SECTION:|export const [A-Z_]+)/);
        const endIndex = nextSectionMatch
          ? startIndex + 1 + (nextSectionMatch.index || content.length)
          : content.length;

        sections.set(sectionName, content.slice(startIndex, endIndex).trim());
      }
    }

    return sections;
  }

  /**
   * Preload prompts that are commonly used together
   */
  async preloadPromptGroup(promptNames: string[]): Promise<void> {
    await Promise.all(promptNames.map(name => this.loadPrompt(name)));
  }

  /**
   * Get estimated tokens for a prompt
   */
  getEstimatedTokens(promptName: string, section?: string): number {
    const metadata = PROMPT_CATALOG[promptName];
    if (!metadata) return 0;

    if (section) {
      // Estimate section as portion of total
      const sectionCount = metadata.sections.length;
      return Math.ceil(metadata.tokens / sectionCount);
    }

    return metadata.tokens;
  }

  /**
   * Get recommendations for which prompts to load
   */
  getLoadRecommendations(taskType: string): string[] {
    const recommendations: Record<string, string[]> = {
      adr_analysis: ['adr-suggestion', 'analysis'],
      deployment: ['deployment-analysis', 'validated-pattern', 'environment-analysis'],
      security: ['security', 'analysis'],
      research: ['research-question', 'research-integration'],
      rules: ['rule-generation', 'analysis'],
    };

    return recommendations[taskType] || ['analysis'];
  }

  /**
   * Clear cache
   */
  clearCache(): void {
    this.cache.clear();
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): { size: number; entries: string[] } {
    return {
      size: this.cache.size,
      entries: Array.from(this.cache.keys()),
    };
  }
}

/**
 * Global prompt loader instance
 */
let globalPromptLoader: PromptLoader | null = null;

/**
 * Get or create the global prompt loader
 */
export function getPromptLoader(cacheTTL?: number): PromptLoader {
  if (!globalPromptLoader) {
    globalPromptLoader = new PromptLoader(cacheTTL);
  }
  return globalPromptLoader;
}

/**
 * Reset the global prompt loader
 */
export function resetPromptLoader(): void {
  globalPromptLoader = null;
}

/**
 * Token savings calculation
 */
export function calculateTokenSavings(loadedPrompts: string[]): {
  loaded: number;
  total: number;
  saved: number;
  percentage: number;
} {
  const total = getTotalPromptTokens();
  const loaded = loadedPrompts.reduce((sum, name) => {
    const metadata = PROMPT_CATALOG[name];
    return sum + (metadata?.tokens || 0);
  }, 0);

  const saved = total - loaded;
  const percentage = Math.round((saved / total) * 100);

  return { loaded, total, saved, percentage };
}
