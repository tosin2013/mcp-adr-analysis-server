/**
 * Search Codebase Tool
 *
 * Atomic tool for searching codebase files based on query patterns.
 * Extracted from ResearchOrchestrator per ADR-018 (Atomic Tools Architecture).
 *
 * This tool provides dependency-injected codebase search functionality:
 * - Returns raw data (matches, files) without analysis/conclusions
 * - Supports configurable file system and analyzer dependencies
 * - No LLM calls or orchestration logic
 * - Testable without complex ESM mocking
 *
 * @see ResearchOrchestrator (deprecated) - Full multi-source orchestration
 * @since 3.0.0
 * @category Tools
 * @category Research
 */

import { promises as fs } from 'fs';
import * as path from 'path';
import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import { McpAdrError } from '../types/index.js';
import type { TreeSitterAnalyzer } from '../utils/tree-sitter-analyzer.js';
import { findFiles } from '../utils/file-system.js';
import { scanProjectStructure } from '../utils/actual-file-operations.js';

/**
 * File match result with relevance scoring
 */
export interface FileMatch {
  /** Full path to the file */
  path: string;
  /** File content (if includeContent was true) */
  content?: string;
  /** Relevance score 0-1 */
  relevance: number;
  /** Tree-sitter parse analysis (if available) */
  parseAnalysis?: {
    language: string;
    hasInfrastructure: boolean;
    functionCount: number;
    importCount: number;
  };
}

/**
 * Codebase search result
 */
export interface CodebaseSearchResult {
  /** Array of matching files with relevance scores */
  matches: FileMatch[];
  /** Total number of files discovered */
  totalFiles: number;
  /** Keywords extracted from query */
  keywords: string[];
  /** Project path searched */
  projectPath: string;
  /** Search duration in milliseconds */
  duration: number;
}

/**
 * Dependencies for search_codebase function (injectable for testing)
 */
export interface SearchCodebaseDependencies {
  /** File system operations */
  fs: typeof fs;
  /** Tree-sitter analyzer (optional) */
  analyzer?: TreeSitterAnalyzer;
}

/**
 * Default dependencies for production use
 */
export const defaultDeps: SearchCodebaseDependencies = {
  fs,
};

/**
 * Minimum relevance threshold for including files in results (0-1)
 * Files with relevance below this threshold will be filtered out
 */
export const DEFAULT_RELEVANCE_THRESHOLD = 0.2;

/**
 * Search codebase for files matching query
 *
 * @description Atomic tool that searches project files based on query patterns.
 * Returns raw file matches with relevance scores. Does NOT perform LLM analysis
 * or synthesis - returns structured data only.
 *
 * Search strategy:
 * 1. Extract keywords from query
 * 2. Use scanProjectStructure for intent-based file discovery (Docker, K8s, etc.)
 * 3. Use findFiles for glob-based keyword matching
 * 4. Read and score file relevance (optional tree-sitter enhancement)
 * 5. Return sorted results
 *
 * @param args - Search parameters
 * @param args.query - Search query (e.g., "Docker configuration", "authentication")
 * @param args.projectPath - Path to project root (defaults to cwd)
 * @param args.scope - Optional file scope patterns (e.g., ["src/**", "config/**"])
 * @param args.includeContent - Include file content in results (default: false)
 * @param args.maxFiles - Maximum files to return (default: 20)
 * @param args.enableTreeSitter - Use tree-sitter for enhanced analysis (default: true)
 * @param deps - Injectable dependencies (for testing)
 *
 * @returns Promise<CodebaseSearchResult> Raw search results with matches and scores
 *
 * @throws {McpAdrError} When query is empty or search fails
 *
 * @example
 * ```typescript
 * // Basic search
 * const result = await searchCodebase({
 *   query: "Docker configuration",
 *   projectPath: "/path/to/project"
 * });
 *
 * console.log(`Found ${result.matches.length} files`);
 * result.matches.forEach(match => {
 *   console.log(`${match.path}: ${(match.relevance * 100).toFixed(1)}%`);
 * });
 * ```
 *
 * @example
 * ```typescript
 * // Search with content and custom scope
 * const result = await searchCodebase({
 *   query: "authentication methods",
 *   scope: ["src/**", "lib/**"],
 *   includeContent: true,
 *   maxFiles: 10
 * });
 * ```
 *
 * @since 3.0.0
 * @category Research
 * @category Atomic Tools
 */
export async function searchCodebase(
  args: {
    query: string;
    projectPath?: string;
    scope?: string[];
    includeContent?: boolean;
    maxFiles?: number;
    enableTreeSitter?: boolean;
    relevanceThreshold?: number;
  },
  deps: SearchCodebaseDependencies = defaultDeps
): Promise<CodebaseSearchResult> {
  const {
    query,
    projectPath = process.cwd(),
    scope,
    includeContent = false,
    maxFiles = 20,
    enableTreeSitter = true,
    relevanceThreshold = DEFAULT_RELEVANCE_THRESHOLD,
  } = args;

  if (!query || query.trim().length === 0) {
    throw new McpAdrError('Search query is required', 'INVALID_INPUT');
  }

  const startTime = Date.now();
  const keywords = extractKeywords(query);
  const queryLower = query.toLowerCase();

  const relevanceMap: Map<string, number> = new Map();
  const contentMap: Map<string, string> = new Map();
  const parseAnalysisMap: Map<
    string,
    {
      language: string;
      hasInfrastructure: boolean;
      functionCount: number;
      importCount: number;
    }
  > = new Map();
  const discoveredFiles = new Set<string>();

  try {
    // PHASE 1: Intent-based file discovery using scanProjectStructure
    const projectStructure = await scanProjectStructure(projectPath, {
      readContent: false,
      maxFileSize: 100000,
      includeHidden: false,
    });

    // Match relevant file categories based on query intent
    if (queryLower.match(/docker|container/i)) {
      projectStructure.dockerFiles.forEach(f => discoveredFiles.add(f.path));
    }

    if (queryLower.match(/kubernetes|k8s|pod|deployment/i)) {
      projectStructure.kubernetesFiles.forEach(f => discoveredFiles.add(f.path));
    }

    if (queryLower.match(/dependency|package|library/i)) {
      projectStructure.packageFiles.forEach(f => discoveredFiles.add(f.path));
    }

    if (queryLower.match(/config|configuration|environment|env/i)) {
      projectStructure.configFiles.forEach(f => discoveredFiles.add(f.path));
      projectStructure.environmentFiles.forEach(f => discoveredFiles.add(f.path));
    }

    if (queryLower.match(/build|ci|cd|pipeline/i)) {
      projectStructure.buildFiles.forEach(f => discoveredFiles.add(f.path));
      projectStructure.ciFiles.forEach(f => discoveredFiles.add(f.path));
    }

    if (queryLower.match(/test|testing|spec/i)) {
      const testResults = await findFiles(projectPath, [
        '**/*.test.ts',
        '**/*.spec.ts',
        '**/*.test.js',
        '**/*.spec.js',
        '**/tests/**',
        '**/test/**',
      ]);
      testResults.files.forEach(f => discoveredFiles.add(f.path));
    }

    // PHASE 2: Keyword-based file discovery
    if (keywords.length > 0) {
      try {
        const keywordPatterns = keywords.slice(0, 5).map(k => `**/*${k}*`);
        const keywordResults = await findFiles(projectPath, keywordPatterns, { limit: 50 });
        keywordResults.files.forEach(f => discoveredFiles.add(f.path));
      } catch {
        // Keyword discovery failed, continue with other methods
      }
    }

    // PHASE 3: Apply custom scope if provided
    if (scope && scope.length > 0) {
      const scopedResults = await findFiles(projectPath, scope, { limit: 100 });
      scopedResults.files.forEach(f => discoveredFiles.add(f.path));
    }

    // PHASE 4: Read and score file relevance
    const fileArray = Array.from(discoveredFiles).slice(0, 50); // Limit to 50 files for performance

    // Import analyzer if tree-sitter is enabled
    let analyzer: TreeSitterAnalyzer | undefined;
    if (enableTreeSitter) {
      try {
        const { TreeSitterAnalyzer: TSAnalyzer } = await import(
          '../utils/tree-sitter-analyzer.js'
        );
        analyzer = new TSAnalyzer();
      } catch {
        // Tree-sitter not available (common in test environments), continue without it
        // Not logging as this is expected behavior in some environments
      }
    }

    // Process files in parallel for better performance
    const fileProcessingPromises = fileArray.map(async filePath => {
      try {
        const fullPath = path.isAbsolute(filePath) ? filePath : path.join(projectPath, filePath);
        const content = await deps.fs.readFile(fullPath, 'utf-8');

        // Calculate text-based relevance
        let relevance = calculateTextRelevance(content, query, keywords);

        if (includeContent) {
          contentMap.set(filePath, content);
        }

        // PHASE 5: Enhance with tree-sitter analysis if available
        if (analyzer && shouldParse(filePath)) {
          try {
            const analysis = await analyzer.analyzeFile(fullPath, content);

            // Enhance relevance based on AST analysis
            let astRelevance = relevance;

            // Check for infrastructure references
            if (analysis.infraStructure && analysis.infraStructure.length > 0) {
              const infraProviders = analysis.infraStructure.map(i => i.provider);
              const infraResources = analysis.infraStructure.map(i => i.name);

              const matchingProviders = keywords.filter(k =>
                infraProviders.some(p => p.toLowerCase().includes(k.toLowerCase()))
              );

              const matchingResources = keywords.filter(k =>
                infraResources.some(r => r.toLowerCase().includes(k.toLowerCase()))
              );

              const totalMatches = matchingProviders.length + matchingResources.length;
              if (totalMatches > 0) {
                astRelevance += 0.2 * Math.min(totalMatches, 3); // Cap bonus at 0.6
              }
            }

            // Check for imports/dependencies
            if (analysis.imports && keywords.some(k => k.match(/import|require|dependency/i))) {
              astRelevance += 0.1;
            }

            relevance = Math.min(astRelevance, 1.0);

            parseAnalysisMap.set(filePath, {
              language: analysis.language,
              hasInfrastructure: !!analysis.infraStructure,
              functionCount: analysis.functions?.length || 0,
              importCount: analysis.imports?.length || 0,
            });
          } catch {
            // Tree-sitter parsing failed, use text-based relevance
          }
        }

        relevanceMap.set(filePath, relevance);
        return { filePath, success: true };
      } catch {
        // File read failed, skip
        return { filePath, success: false };
      }
    });

    // Wait for all file processing to complete
    await Promise.allSettled(fileProcessingPromises);

    // PHASE 6: Build and sort results
    const matches: FileMatch[] = Array.from(relevanceMap.entries())
      .filter(([, relevance]) => relevance > relevanceThreshold)
      .sort((a, b) => b[1] - a[1]) // Sort by relevance descending
      .slice(0, maxFiles)
      .map(([filePath, relevance]) => {
        const match: FileMatch = {
          path: filePath,
          relevance,
        };

        const content = contentMap.get(filePath);
        if (content !== undefined) {
          match.content = content;
        }

        const parseAnalysis = parseAnalysisMap.get(filePath);
        if (parseAnalysis !== undefined) {
          match.parseAnalysis = parseAnalysis;
        }

        return match;
      });

    return {
      matches,
      totalFiles: discoveredFiles.size,
      keywords,
      projectPath,
      duration: Date.now() - startTime,
    };
  } catch (error) {
    throw new McpAdrError(
      `Codebase search failed: ${error instanceof Error ? error.message : String(error)}`,
      'SEARCH_ERROR',
      { query, projectPath }
    );
  }
}

/**
 * MCP tool wrapper for search_codebase
 */
export async function searchCodebaseTool(
  args: {
    query: string;
    projectPath?: string;
    scope?: string[];
    includeContent?: boolean;
    maxFiles?: number;
    enableTreeSitter?: boolean;
  }
): Promise<CallToolResult> {
  try {
    const result = await searchCodebase(args);

    // Format response
    let output = `# Codebase Search Results\n\n`;
    output += `**Query**: ${args.query}\n`;
    output += `**Project**: ${result.projectPath}\n`;
    output += `**Matches**: ${result.matches.length} of ${result.totalFiles} files\n`;
    output += `**Duration**: ${result.duration}ms\n`;
    output += `**Keywords**: ${result.keywords.join(', ')}\n\n`;

    if (result.matches.length === 0) {
      output += `No files found matching the query.\n`;
    } else {
      output += `## Matches\n\n`;
      result.matches.forEach((match, index) => {
        output += `### ${index + 1}. ${match.path}\n`;
        output += `**Relevance**: ${(match.relevance * 100).toFixed(1)}%\n`;

        if (match.parseAnalysis) {
          output += `**Language**: ${match.parseAnalysis.language}\n`;
          output += `**Functions**: ${match.parseAnalysis.functionCount}\n`;
          output += `**Imports**: ${match.parseAnalysis.importCount}\n`;
          if (match.parseAnalysis.hasInfrastructure) {
            output += `**Infrastructure**: Yes\n`;
          }
        }

        if (match.content) {
          const preview = match.content.substring(0, 500);
          output += `\n**Content Preview**:\n\`\`\`\n${preview}${match.content.length > 500 ? '...' : ''}\n\`\`\`\n`;
        }

        output += `\n`;
      });
    }

    return {
      content: [
        {
          type: 'text',
          text: output,
        },
      ],
    };
  } catch (error) {
    return {
      content: [
        {
          type: 'text',
          text: `❌ Search failed: ${error instanceof Error ? error.message : String(error)}`,
        },
      ],
      isError: true,
    };
  }
}

/**
 * Extract keywords from search query
 */
function extractKeywords(query: string): string[] {
  const stopWords = new Set([
    'the',
    'is',
    'are',
    'was',
    'were',
    'what',
    'when',
    'where',
    'why',
    'how',
    'which',
    'who',
    'a',
    'an',
    'and',
    'or',
    'but',
    'in',
    'on',
    'at',
    'to',
    'for',
    'with',
    'about',
    'as',
    'by',
    'from',
    'of',
    'can',
    'could',
    'should',
    'would',
    'do',
    'does',
    'did',
    'have',
    'has',
    'had',
    'we',
    'our',
    'us',
  ]);

  const words = query
    .toLowerCase()
    .replace(/[^\w\s-]/g, ' ')
    .split(/\s+/)
    .filter(w => w.length > 2 && !stopWords.has(w));

  return [...new Set(words)];
}

/**
 * Calculate text-based relevance score
 */
function calculateTextRelevance(content: string, query: string, keywords: string[]): number {
  const contentLower = content.toLowerCase();
  const queryLower = query.toLowerCase();

  let score = 0;

  // Keyword matching
  for (const keyword of keywords) {
    if (contentLower.includes(keyword.toLowerCase())) {
      score += 0.2;
    }
  }

  // Query phrase matching
  const queryWords = queryLower.split(/\s+/).filter(w => w.length > 3);
  for (const word of queryWords) {
    if (contentLower.includes(word)) {
      score += 0.1;
    }
  }

  return Math.min(score, 1.0);
}

/**
 * Check if file should be parsed with tree-sitter
 */
function shouldParse(filePath: string): boolean {
  const parsableExtensions = [
    '.ts',
    '.tsx',
    '.js',
    '.jsx',
    '.py',
    '.yaml',
    '.yml',
    '.json',
    '.sh',
    '.bash',
    '.tf',
    '.hcl',
  ];

  return parsableExtensions.some(ext => filePath.endsWith(ext));
}
