import { TodoTask } from '../types/todo-json-schemas.js';

/**
 * Enhanced search engine for TODO tasks with fuzzy matching, multi-field search,
 * and regex pattern support.
 * 
 * Provides comprehensive search capabilities including:
 * - Exact substring matching across multiple fields
 * - Fuzzy search with configurable tolerance for typos
 * - Regex pattern matching with safety validation
 * - Multi-field search with relevance scoring
 * - Search suggestions when no results are found
 * 
 * @example
 * ```typescript
 * const searchEngine = new TaskSearchEngine(0.3); // 30% fuzzy threshold
 * 
 * // Simple title search
 * const titleResults = searchEngine.searchByTitle("authentication", tasks);
 * 
 * // Fuzzy search for typos
 * const fuzzyResults = searchEngine.fuzzySearch("autentication", tasks);
 * 
 * // Multi-field search with scoring
 * const multiResults = searchEngine.multiFieldSearch(
 *   "security", 
 *   ["title", "description", "tags"], 
 *   tasks
 * );
 * ```
 */
export class TaskSearchEngine {
  private fuzzyThreshold: number;

  constructor(fuzzyThreshold: number = 0.3) {
    this.fuzzyThreshold = fuzzyThreshold;
  }

  /**
   * Search tasks by ID with partial matching support
   * 
   * @param query - ID search query (supports partial UUIDs)
   * @param tasks - Array of tasks to search through
   * 
   * @returns Array of tasks with IDs containing the query string
   * 
   * @example
   * ```typescript
   * const results = searchEngine.searchById("abc123", tasks);
   * // Finds tasks with IDs like "abc123-def4-5678-9012-abcdef123456"
   * ```
   */
  searchById(query: string, tasks: TodoTask[]): TodoTask[] {
    const normalizedQuery = query.toLowerCase();
    return tasks.filter(task => 
      task.id.toLowerCase().includes(normalizedQuery)
    );
  }

  /**
   * Search tasks by title with exact substring matching
   * 
   * @param query - Title search query (case-insensitive)
   * @param tasks - Array of tasks to search through
   * 
   * @returns Array of tasks with titles containing the query string
   * 
   * @example
   * ```typescript
   * const results = searchEngine.searchByTitle("authentication", tasks);
   * // Finds "User Authentication", "Authentication Bug Fix", etc.
   * ```
   */
  searchByTitle(query: string, tasks: TodoTask[]): TodoTask[] {
    const normalizedQuery = query.toLowerCase();
    return tasks.filter(task => 
      task.title.toLowerCase().includes(normalizedQuery)
    );
  }

  /**
   * Search tasks by description with exact substring matching
   */
  searchByDescription(query: string, tasks: TodoTask[]): TodoTask[] {
    const normalizedQuery = query.toLowerCase();
    return tasks.filter(task => 
      task.description?.toLowerCase().includes(normalizedQuery) || false
    );
  }

  /**
   * Fuzzy search using edit distance algorithm for typo tolerance
   * 
   * Finds tasks even when the search query contains typos or slight variations.
   * Uses Levenshtein distance to measure string similarity.
   * 
   * @param query - Search query that may contain typos
   * @param tasks - Array of tasks to search through
   * @param threshold - Optional similarity threshold (0-1, default uses instance threshold)
   * 
   * @returns Array of tasks that match within the similarity threshold
   * 
   * @example
   * ```typescript
   * const results = searchEngine.fuzzySearch("autentication", tasks, 0.2);
   * // Finds "authentication" despite the typo
   * ```
   */
  fuzzySearch(query: string, tasks: TodoTask[], threshold?: number): TodoTask[] {
    const searchThreshold = threshold || this.fuzzyThreshold;
    
    return tasks.filter(task => {
      return this.fuzzyMatch(task.title, query, searchThreshold) ||
             this.fuzzyMatch(task.description || '', query, searchThreshold) ||
             task.tags.some(tag => this.fuzzyMatch(tag, query, searchThreshold));
    });
  }

  /**
   * Regex pattern search with safety validation
   */
  regexSearch(pattern: string, tasks: TodoTask[]): TodoTask[] {
    try {
      const regex = new RegExp(pattern, 'i');
      return tasks.filter(task => {
        return regex.test(task.title) ||
               regex.test(task.description || '') ||
               task.tags.some(tag => regex.test(tag)) ||
               regex.test(task.category || '') ||
               regex.test(task.assignee || '');
      });
    } catch (error) {
      // Invalid regex, fall back to literal search
      console.warn(`Invalid regex pattern: ${pattern}, falling back to literal search`);
      return this.searchByTitle(pattern, tasks);
    }
  }

  /**
   * Multi-field search with configurable field weights
   * 
   * Searches across multiple task fields and calculates relevance scores
   * based on field importance and match quality.
   * 
   * @param query - Search query to match against multiple fields
   * @param fields - Array of field names to search in
   * @param tasks - Array of tasks to search through
   * @param fieldWeights - Optional weights for different fields (higher = more important)
   * 
   * @returns Array of SearchResult objects with tasks and relevance scores, sorted by relevance
   * 
   * @example
   * ```typescript
   * const results = searchEngine.multiFieldSearch(
   *   "security",
   *   ["title", "description", "tags"],
   *   tasks,
   *   { title: 1.0, description: 0.8, tags: 0.9 }
   * );
   * 
   * results.forEach(result => {
   *   console.log(`${result.task.title} (score: ${result.relevanceScore})`);
   * });
   * ```
   */
  multiFieldSearch(
    query: string, 
    fields: string[], 
    tasks: TodoTask[],
    fieldWeights?: Record<string, number>
  ): SearchResult[] {
    const normalizedQuery = query.toLowerCase();
    const weights = fieldWeights || {
      title: 1.0,
      description: 0.8,
      tags: 0.9,
      category: 0.7,
      assignee: 0.6
    };

    const results: SearchResult[] = [];

    for (const task of tasks) {
      let totalScore = 0;
      let matchCount = 0;

      for (const field of fields) {
        const fieldWeight = weights[field] || 0.5;
        let fieldScore = 0;

        switch (field) {
          case 'title':
            if (task.title.toLowerCase().includes(normalizedQuery)) {
              fieldScore = this.calculateRelevanceScore(task.title, query);
            }
            break;
          case 'description':
            if (task.description?.toLowerCase().includes(normalizedQuery)) {
              fieldScore = this.calculateRelevanceScore(task.description, query);
            }
            break;
          case 'tags':
            for (const tag of task.tags) {
              if (tag.toLowerCase().includes(normalizedQuery)) {
                fieldScore = Math.max(fieldScore, this.calculateRelevanceScore(tag, query));
              }
            }
            break;
          case 'category':
            if (task.category?.toLowerCase().includes(normalizedQuery)) {
              fieldScore = this.calculateRelevanceScore(task.category, query);
            }
            break;
          case 'assignee':
            if (task.assignee?.toLowerCase().includes(normalizedQuery)) {
              fieldScore = this.calculateRelevanceScore(task.assignee, query);
            }
            break;
        }

        if (fieldScore > 0) {
          totalScore += fieldScore * fieldWeight;
          matchCount++;
        }
      }

      if (matchCount > 0) {
        results.push({
          task,
          relevanceScore: totalScore / matchCount,
          matchedFields: fields.filter(field => this.fieldMatches(task, field, normalizedQuery))
        });
      }
    }

    // Sort by relevance score (highest first)
    return results.sort((a, b) => b.relevanceScore - a.relevanceScore);
  }

  /**
   * Comprehensive search that combines multiple search strategies
   * 
   * Automatically tries different search approaches in order of precision:
   * 1. Exact multi-field matching (highest relevance)
   * 2. Fuzzy search for typo tolerance (medium relevance)
   * 3. Partial ID matching (lowest relevance)
   * 
   * @param query - Search query to find tasks
   * @param tasks - Array of tasks to search through
   * 
   * @returns Array of SearchResult objects sorted by relevance score
   * 
   * @example
   * ```typescript
   * const results = searchEngine.comprehensiveSearch("auth bug", tasks);
   * // Tries exact match first, then fuzzy, then ID matching
   * ```
   */
  comprehensiveSearch(query: string, tasks: TodoTask[]): SearchResult[] {
    // Handle empty query
    if (!query || query.trim().length === 0) {
      return [];
    }

    const normalizedQuery = query.trim();

    // Try exact matches first (highest priority)
    const exactMatches = this.multiFieldSearch(
      normalizedQuery, 
      ['title', 'description', 'tags', 'category', 'assignee'], 
      tasks
    );

    if (exactMatches.length > 0) {
      return exactMatches;
    }

    // Try fuzzy search for typo tolerance
    const fuzzyMatches = this.fuzzySearch(normalizedQuery, tasks);
    if (fuzzyMatches.length > 0) {
      return fuzzyMatches.map(task => ({
        task,
        relevanceScore: 0.7, // Lower score for fuzzy matches
        matchedFields: ['fuzzy']
      }));
    }

    // Try partial ID matching as last resort
    const idMatches = this.searchById(normalizedQuery, tasks);
    return idMatches.map(task => ({
      task,
      relevanceScore: 0.5, // Lowest score for ID matches
      matchedFields: ['id']
    }));
  }

  /**
   * Generate search suggestions when no results are found
   * 
   * Provides helpful suggestions to improve search results, including
   * alternative search strategies and similar terms found in existing tasks.
   * 
   * @param query - The search query that returned no results
   * @param tasks - Array of all available tasks for finding similar terms
   * 
   * @returns Array of suggestion strings to help the user
   * 
   * @example
   * ```typescript
   * const suggestions = searchEngine.generateSearchSuggestions("xyz123", tasks);
   * // Returns: ["Try a shorter search term", "Did you mean: authentication, authorization?"]
   * ```
   */
  generateSearchSuggestions(query: string, tasks: TodoTask[]): string[] {
    const suggestions: string[] = [];

    // Suggest shorter query
    if (query.length > 10) {
      suggestions.push("Try a shorter search term");
    }

    // Suggest fuzzy search for potential typos
    if (query.length > 3) {
      suggestions.push("Use fuzzy search for typos: searchType: 'fuzzy'");
    }

    // Suggest common field searches
    suggestions.push("Search all fields with searchType: 'all'");
    suggestions.push("Use regex patterns with searchType: 'regex'");

    // Find similar terms in existing tasks
    const similarTerms = this.findSimilarTerms(query, tasks);
    if (similarTerms.length > 0) {
      suggestions.push(`Did you mean: ${similarTerms.slice(0, 3).join(', ')}?`);
    }

    return suggestions;
  }

  /**
   * Calculate relevance score based on match position and length
   */
  private calculateRelevanceScore(text: string, query: string): number {
    const normalizedText = text.toLowerCase();
    const normalizedQuery = query.toLowerCase();
    
    if (!normalizedText.includes(normalizedQuery)) {
      return 0;
    }

    const index = normalizedText.indexOf(normalizedQuery);
    const textLength = text.length;
    const queryLength = query.length;

    // Higher score for exact matches at the beginning
    let score = queryLength / textLength;
    
    // Boost score if match is at the beginning
    if (index === 0) {
      score *= 1.5;
    }
    
    // Boost score for exact word matches
    const wordBoundaryRegex = new RegExp(`\\b${normalizedQuery}\\b`);
    if (wordBoundaryRegex.test(normalizedText)) {
      score *= 1.3;
    }

    return Math.min(score, 1.0);
  }

  /**
   * Check if a specific field matches the query
   */
  private fieldMatches(task: TodoTask, field: string, normalizedQuery: string): boolean {
    switch (field) {
      case 'title':
        return task.title.toLowerCase().includes(normalizedQuery);
      case 'description':
        return task.description?.toLowerCase().includes(normalizedQuery) || false;
      case 'tags':
        return task.tags.some(tag => tag.toLowerCase().includes(normalizedQuery));
      case 'category':
        return task.category?.toLowerCase().includes(normalizedQuery) || false;
      case 'assignee':
        return task.assignee?.toLowerCase().includes(normalizedQuery) || false;
      default:
        return false;
    }
  }

  /**
   * Fuzzy matching using edit distance algorithm
   */
  private fuzzyMatch(text: string, searchTerm: string, threshold: number): boolean {
    const words = text.toLowerCase().split(/\s+/);
    const searchWords = searchTerm.toLowerCase().split(/\s+/);
    
    return searchWords.every(searchWord => 
      words.some(word => {
        // Skip very short words for fuzzy matching to avoid false positives
        if (searchWord.length < 4) {
          return word.includes(searchWord);
        }
        
        const distance = this.editDistance(word, searchWord);
        const tolerance = Math.max(1, Math.floor(searchWord.length * threshold));
        return distance <= tolerance;
      })
    );
  }

  /**
   * Calculate edit distance between two strings using dynamic programming
   */
  private editDistance(a: string, b: string): number {
    const dp: number[][] = Array(a.length + 1).fill(null).map(() => Array(b.length + 1).fill(0));
    
    // Initialize base cases
    for (let i = 0; i <= a.length; i++) {
      dp[i][0] = i;
    }
    for (let j = 0; j <= b.length; j++) {
      dp[0][j] = j;
    }
    
    // Fill the dynamic programming table
    for (let i = 1; i <= a.length; i++) {
      for (let j = 1; j <= b.length; j++) {
        if (a[i - 1] === b[j - 1]) {
          dp[i][j] = dp[i - 1][j - 1];
        } else {
          dp[i][j] = Math.min(
            dp[i - 1][j],     // deletion
            dp[i][j - 1],     // insertion
            dp[i - 1][j - 1]  // substitution
          ) + 1;
        }
      }
    }
    
    return dp[a.length][b.length];
  }

  /**
   * Find similar terms in existing tasks for suggestions
   */
  private findSimilarTerms(query: string, tasks: TodoTask[]): string[] {
    const allTerms = new Set<string>();
    
    // Collect all terms from tasks
    for (const task of tasks) {
      const words = [
        ...task.title.split(/\s+/),
        ...(task.description?.split(/\s+/) || []),
        ...task.tags,
        task.category || '',
        task.assignee || ''
      ].filter(word => word.length > 2);
      
      words.forEach(word => allTerms.add(word.toLowerCase()));
    }

    // Find terms with small edit distance
    const similarTerms: Array<{term: string, distance: number}> = [];
    const queryLower = query.toLowerCase();
    
    for (const term of allTerms) {
      const distance = this.editDistance(queryLower, term);
      // Only suggest terms that are reasonably close and not too different in length
      const lengthDiff = Math.abs(query.length - term.length);
      if (distance <= 2 && distance > 0 && lengthDiff <= 3) {
        similarTerms.push({ term, distance });
      }
    }

    return similarTerms
      .sort((a, b) => a.distance - b.distance)
      .map(item => item.term)
      .slice(0, 5);
  }
}

/**
 * Search result with relevance scoring
 */
export interface SearchResult {
  task: TodoTask;
  relevanceScore: number;
  matchedFields: string[];
}

/**
 * Search query configuration
 */
export interface SearchQuery {
  query: string;
  searchType: 'id' | 'title' | 'description' | 'all' | 'fuzzy' | 'regex' | 'multi_field';
  searchFields?: string[];
  fuzzyThreshold?: number;
  fieldWeights?: Record<string, number>;
}