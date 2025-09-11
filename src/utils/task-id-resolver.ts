/**
 * Task ID Resolution Utility
 * 
 * Provides comprehensive task ID resolution with partial matching,
 * fuzzy search, and helpful error recovery suggestions.
 */

import { TodoTask } from '../types/todo-json-schemas.js';

export interface TaskResolution {
  success: boolean;
  resolvedId?: string;
  matches?: TodoTask[];
  suggestions?: string[];
  error?: string;
}

export interface ValidationResult {
  isValid: boolean;
  error?: string;
  suggestions?: string[];
}

/**
 * Utility class for resolving task IDs with enhanced matching capabilities
 */
export class TaskIdResolver {
  
  /**
   * Resolve a task ID input to a specific task
   * 
   * Handles partial UUIDs, fuzzy matching, and provides helpful suggestions
   * when tasks cannot be found or when multiple matches exist.
   * 
   * @param input - Task ID input (full UUID, partial UUID, or similar)
   * @param tasks - Record of all available tasks keyed by ID
   * 
   * @returns TaskResolution object with success status, resolved ID, matches, and suggestions
   * 
   * @example
   * ```typescript
   * const resolver = new TaskIdResolver();
   * const result = resolver.resolveTaskId("abc123", tasks);
   * 
   * if (result.success) {
   *   console.log(`Resolved to: ${result.resolvedId}`);
   * } else {
   *   console.log(`Error: ${result.error}`);
   *   console.log(`Suggestions: ${result.suggestions?.join(', ')}`);
   * }
   * ```
   */
  resolveTaskId(input: string, tasks: Record<string, TodoTask>): TaskResolution {
    // Validate input
    const validation = this.validateTaskId(input);
    if (!validation.isValid) {
      return {
        success: false,
        error: validation.error,
        suggestions: validation.suggestions
      };
    }

    const taskList = Object.values(tasks);
    const normalizedInput = input.toLowerCase().trim();

    // 1. Exact match first
    if (tasks[input]) {
      return {
        success: true,
        resolvedId: input,
        matches: [tasks[input]]
      };
    }

    // 2. Partial ID matching (both UUID and other formats)
    const matches = taskList.filter(task => 
      task.id.toLowerCase().startsWith(normalizedInput)
    );

    if (matches.length === 1) {
      return {
        success: true,
        resolvedId: matches[0].id,
        matches: matches
      };
    } else if (matches.length > 1) {
      return {
        success: false,
        error: `Multiple tasks found with ID starting with "${input}"`,
        matches: matches,
        suggestions: [
          'Use a more specific ID prefix',
          'Use the full task ID',
          'Try searching by title instead'
        ]
      };
    }

    // 3. If no partial UUID matches, try fuzzy matching on similar IDs
    const similarIds = this.suggestSimilarIds(input, tasks);
    
    const suggestions = [
      'Use get_tasks to list all available tasks',
      'Check if the task was recently deleted or archived',
      'Try searching by title using find_task'
    ];
    
    if (similarIds.length > 0) {
      suggestions.push(`Similar IDs found: ${similarIds.slice(0, 3).join(', ')}`);
    }
    
    return {
      success: false,
      error: `No task found with ID "${input}"`,
      suggestions
    };
  }

  /**
   * Validate task ID format and provide helpful feedback
   * 
   * Checks for common formatting issues and provides actionable
   * suggestions for fixing invalid task IDs.
   * 
   * @param taskId - Task ID string to validate
   * 
   * @returns ValidationResult with validity status, error message, and suggestions
   * 
   * @example
   * ```typescript
   * const resolver = new TaskIdResolver();
   * const validation = resolver.validateTaskId("#task-123");
   * 
   * if (!validation.isValid) {
   *   console.log(`Invalid: ${validation.error}`);
   *   validation.suggestions?.forEach(s => console.log(`- ${s}`));
   * }
   * ```
   */
  validateTaskId(taskId: string): ValidationResult {
    if (typeof taskId !== 'string') {
      return {
        isValid: false,
        error: 'Task ID is required',
        suggestions: [
          'Provide a valid task ID',
          'Use get_tasks to list available tasks',
          'Use find_task to search by title'
        ]
      };
    }

    const trimmed = taskId.trim();
    if (trimmed.length === 0) {
      return {
        isValid: false,
        error: 'Task ID cannot be empty',
        suggestions: [
          'Provide a non-empty task ID',
          'Use get_tasks to list available tasks'
        ]
      };
    }

    // Check for obviously invalid formats
    if (trimmed.includes(' ')) {
      return {
        isValid: false,
        error: 'Task ID cannot contain spaces',
        suggestions: [
          'Remove spaces from the task ID',
          'Use quotes if the ID is part of a larger string',
          'Use find_task to search by title instead'
        ]
      };
    }

    // Check for common mistakes
    if (trimmed.startsWith('#')) {
      return {
        isValid: false,
        error: 'Task ID should not start with #',
        suggestions: [
          `Try using "${trimmed.substring(1)}" instead`,
          'Task IDs are UUIDs, not hash-prefixed identifiers'
        ]
      };
    }

    // Warn about very short IDs (less than 4 characters)
    if (trimmed.length < 4 && !/^[0-9a-f-]+$/i.test(trimmed)) {
      return {
        isValid: false,
        error: 'Task ID too short for reliable matching',
        suggestions: [
          'Use at least 4 characters for partial UUID matching',
          'Use the full UUID for exact matching',
          'Use find_task to search by title instead'
        ]
      };
    }

    return { isValid: true };
  }

  /**
   * Suggest similar task IDs for error recovery
   * 
   * Uses string similarity algorithms to find close matches when
   * an exact task ID cannot be found. Helps users recover from typos.
   * 
   * @param input - The input string that couldn't be matched
   * @param tasks - Record of all available tasks keyed by ID
   * 
   * @returns Array of similar task IDs with titles for context
   * 
   * @example
   * ```typescript
   * const resolver = new TaskIdResolver();
   * const suggestions = resolver.suggestSimilarIds("abc12x", tasks);
   * // Returns: ["abc123ab (Fix authentication bug)", "abc124cd (Update docs)"]
   * ```
   */
  suggestSimilarIds(input: string, tasks: Record<string, TodoTask>): string[] {
    const taskList = Object.values(tasks);
    const normalizedInput = input.toLowerCase().trim();
    
    // Calculate similarity scores for all task IDs
    const similarities = taskList.map(task => ({
      id: task.id,
      title: task.title,
      score: this.calculateSimilarity(normalizedInput, task.id.toLowerCase())
    }));

    // Sort by similarity score and return top matches
    return similarities
      .filter(item => item.score > 0.2) // Lower threshold for better matching
      .sort((a, b) => b.score - a.score)
      .slice(0, 5)
      .map(item => `${item.id.substring(0, 8)} (${item.title})`);
  }

  /**
   * Calculate string similarity using Levenshtein distance
   * Returns a score between 0 and 1, where 1 is identical
   */
  private calculateSimilarity(str1: string, str2: string): number {
    const longer = str1.length > str2.length ? str1 : str2;
    const shorter = str1.length > str2.length ? str2 : str1;
    
    if (longer.length === 0) {
      return 1.0;
    }
    
    // For partial matches, check if one string starts with the other
    if (longer.startsWith(shorter)) {
      return 0.8; // High similarity for prefix matches
    }
    
    // Check if the shorter string is contained within the longer one
    if (longer.includes(shorter)) {
      return 0.6; // Good similarity for substring matches
    }
    
    // Check for common prefix length
    let commonPrefixLength = 0;
    const minLength = Math.min(str1.length, str2.length);
    for (let i = 0; i < minLength; i++) {
      if (str1[i] === str2[i]) {
        commonPrefixLength++;
      } else {
        break;
      }
    }
    
    // If we have a significant common prefix, give it a good score
    if (commonPrefixLength >= 4) {
      return 0.5 + (commonPrefixLength / Math.max(str1.length, str2.length)) * 0.3;
    }
    
    const distance = this.levenshteinDistance(longer, shorter);
    return (longer.length - distance) / longer.length;
  }

  /**
   * Calculate Levenshtein distance between two strings
   */
  private levenshteinDistance(str1: string, str2: string): number {
    const matrix = Array(str2.length + 1).fill(null).map(() => 
      Array(str1.length + 1).fill(null)
    );

    for (let i = 0; i <= str1.length; i++) {
      matrix[0][i] = i;
    }

    for (let j = 0; j <= str2.length; j++) {
      matrix[j][0] = j;
    }

    for (let j = 1; j <= str2.length; j++) {
      for (let i = 1; i <= str1.length; i++) {
        const indicator = str1[i - 1] === str2[j - 1] ? 0 : 1;
        matrix[j][i] = Math.min(
          matrix[j][i - 1] + 1, // deletion
          matrix[j - 1][i] + 1, // insertion
          matrix[j - 1][i - 1] + indicator // substitution
        );
      }
    }

    return matrix[str2.length][str1.length];
  }

  /**
   * Enhanced ID resolution with context-aware suggestions
   * 
   * Provides more intelligent suggestions based on recent activity,
   * preferred status, and priority context. Useful for interactive
   * task management scenarios.
   * 
   * @param input - Task ID input to resolve
   * @param tasks - Record of all available tasks keyed by ID
   * @param context - Optional context for smarter suggestions
   * @param context.recentTaskIds - Recently accessed task IDs
   * @param context.preferredStatus - Preferred task status for suggestions
   * @param context.preferredPriority - Preferred task priority for suggestions
   * 
   * @returns TaskResolution with context-aware suggestions
   * 
   * @example
   * ```typescript
   * const resolver = new TaskIdResolver();
   * const result = resolver.resolveTaskIdWithContext("ab", tasks, {
   *   recentTaskIds: ["abc123", "def456"],
   *   preferredStatus: "in_progress",
   *   preferredPriority: "high"
   * });
   * ```
   */
  resolveTaskIdWithContext(
    input: string, 
    tasks: Record<string, TodoTask>,
    context?: {
      recentTaskIds?: string[];
      preferredStatus?: string;
      preferredPriority?: string;
    }
  ): TaskResolution {
    const basicResolution = this.resolveTaskId(input, tasks);
    
    // If basic resolution succeeded, return it
    if (basicResolution.success) {
      return basicResolution;
    }

    // If basic resolution failed, try context-aware suggestions
    if (context) {
      const contextualSuggestions = this.getContextualSuggestions(input, tasks, context);
      if (contextualSuggestions.length > 0) {
        return {
          ...basicResolution,
          suggestions: [
            ...contextualSuggestions,
            ...(basicResolution.suggestions || [])
          ]
        };
      }
    }

    return basicResolution;
  }

  /**
   * Get contextual suggestions based on recent activity and preferences
   */
  private getContextualSuggestions(
    input: string,
    tasks: Record<string, TodoTask>,
    context: {
      recentTaskIds?: string[];
      preferredStatus?: string;
      preferredPriority?: string;
    }
  ): string[] {
    const suggestions: string[] = [];
    const taskList = Object.values(tasks);

    // Suggest recent tasks if input is very short
    if (input.length <= 2 && context.recentTaskIds) {
      const recentTasks = context.recentTaskIds
        .map(id => tasks[id])
        .filter(Boolean)
        .slice(0, 3);
      
      if (recentTasks.length > 0) {
        suggestions.push(
          `Recent tasks: ${recentTasks.map(t => `${t.id.substring(0, 8)} (${t.title})`).join(', ')}`
        );
      }
    }

    // Suggest tasks with preferred status/priority
    if (context.preferredStatus || context.preferredPriority) {
      const filteredTasks = taskList.filter(task => {
        return (!context.preferredStatus || task.status === context.preferredStatus) &&
               (!context.preferredPriority || task.priority === context.preferredPriority);
      }).slice(0, 3);

      if (filteredTasks.length > 0) {
        const statusText = context.preferredStatus ? ` with status ${context.preferredStatus}` : '';
        const priorityText = context.preferredPriority ? ` with priority ${context.preferredPriority}` : '';
        suggestions.push(
          `Tasks${statusText}${priorityText}: ${filteredTasks.map(t => `${t.id.substring(0, 8)} (${t.title})`).join(', ')}`
        );
      }
    }

    return suggestions;
  }
}