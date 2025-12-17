/**
 * Research Orchestrator
 *
 * Coordinates multi-source research with cascading fallback:
 * 1. Project Files (local, fast, free)
 * 2. Knowledge Graph (in-memory, instant)
 * 3. Environment Resources (live runtime data)
 * 4. Web Search (external, last resort)
 */

import { promises as fs } from 'fs';
import * as path from 'path';
import crypto from 'crypto';
import { EnhancedLogger } from './enhanced-logging.js';
import { KnowledgeGraphManager } from './knowledge-graph-manager.js';
import { findFiles } from './file-system.js';
import { scanProjectStructure } from './actual-file-operations.js';
import { TreeSitterAnalyzer } from './tree-sitter-analyzer.js';
// import { FirecrawlApp } from '@mendable/firecrawl-js';
// import { loadAIConfig } from '../config/ai-config.js';
import { loadConfig } from './config.js';
import {
  createResearchWithDelegation,
  type ResearchPlan,
  type ResearchTaskTracker,
  type CreateResearchTaskOptions,
} from './research-task-integration.js';

export interface ResearchSource {
  type: 'project_files' | 'knowledge_graph' | 'environment' | 'web_search';
  found?: boolean;
  data: any;
  confidence: number;
  timestamp: string;
}

export interface ResearchAnswer {
  question: string;
  sources: ResearchSource[];
  confidence: number;
  needsWebSearch: boolean;
  answer?: string;
  metadata: {
    duration: number;
    sourcesQueried: string[];
    filesAnalyzed: number;
    cached?: boolean;
  };
}

interface CachedResearchResult {
  result: ResearchAnswer;
  timestamp: number;
  expiry: number;
}

/**
 * Research Orchestrator Class
 *
 * @deprecated This class is deprecated as of v2.2.0 and will be removed in v4.0.0.
 * Use atomic tools instead per ADR-018 (Atomic Tools Architecture):
 * - For codebase search: Use `searchCodebase` from `tools/search-codebase-tool.ts`
 * - For external research: Use `llm-web-search-tool.ts` (if needed)
 *
 * **Deprecation Rationale** (see ADR-018):
 * - Sequential execution blocking (2-8 seconds per call)
 * - 5,000-6,000 tokens overhead per session
 * - Causes 37+ test timeout failures due to complex ESM mocking
 * - 850+ second test suite execution time
 * - Conflicts with CE-MCP directive-based architecture (ADR-014)
 *
 * **Migration Guide**:
 * ```typescript
 * // OLD: Using ResearchOrchestrator
 * const orchestrator = new ResearchOrchestrator('/path/to/project', 'docs/adrs');
 * const result = await orchestrator.answerResearchQuestion('Docker configuration');
 *
 * // NEW: Using atomic searchCodebase tool
 * import { searchCodebase } from './tools/search-codebase-tool.js';
 * const result = await searchCodebase({
 *   query: 'Docker configuration',
 *   projectPath: '/path/to/project'
 * });
 * ```
 *
 * @description Coordinates multi-source research with cascading fallback strategy.
 * Implements a hierarchical approach to answering research questions by querying
 * sources in order of preference: project files → knowledge graph → environment → web search.
 *
 * Features:
 * - Intelligent confidence scoring for each source
 * - Configurable confidence thresholds
 * - Result caching for performance optimization
 * - Firecrawl integration for web search capabilities
 * - Comprehensive error handling and fallback mechanisms
 *
 * @example
 * ```typescript
 * const orchestrator = new ResearchOrchestrator('/path/to/project', 'docs/adrs');
 * orchestrator.setConfidenceThreshold(0.8);
 *
 * const result = await orchestrator.answerResearchQuestion(
 *   'What authentication methods are used in this project?'
 * );
 *
 * console.log(`Answer: ${result.answer}`);
 * console.log(`Confidence: ${result.confidence}`);
 * console.log(`Sources: ${result.sources.map(s => s.type).join(', ')}`);
 * ```
 *
 * @since 2.0.0
 * @category Research
 * @category Orchestration
 */
export class ResearchOrchestrator {
  private logger: EnhancedLogger;
  private projectPath: string;
  private adrDirectory: string;
  private confidenceThreshold: number = 0.6;
  private kgManager: KnowledgeGraphManager;
  private cache: Map<string, CachedResearchResult> = new Map();
  private cacheTtl: number = 5 * 60 * 1000; // 5 minutes
  private firecrawl: any; // FirecrawlApp type
  private config: any; // ServerConfig type

  constructor(projectPath?: string, adrDirectory?: string) {
    // DEPRECATION WARNING
    console.warn(
      '⚠️  WARNING: ResearchOrchestrator is deprecated as of v3.0.0 and will be removed in v4.0.0.\n' +
        '   Reason: Sequential execution blocking, high token overhead (5K-6K tokens/session),\n' +
        '           test complexity (14+ failures), and conflicts with CE-MCP architecture (ADR-014).\n' +
        '   Migration: Use atomic tools instead:\n' +
        '   - Codebase search: searchCodebase() from tools/search-codebase-tool.ts\n' +
        '   - External research: llm-web-search-tool.ts\n' +
        '   See ADR-018 for atomic tools architecture.'
    );

    this.logger = new EnhancedLogger();
    this.projectPath = projectPath || process.cwd();
    this.adrDirectory = adrDirectory || 'docs/adrs';
    this.kgManager = new KnowledgeGraphManager();

    // Load server configuration
    this.config = loadConfig();

    // Initialize Firecrawl if enabled
    if (this.config.firecrawlEnabled) {
      // TODO: Uncomment when @mendable/firecrawl-js is installed
      // this.firecrawl = new FirecrawlApp({
      //   apiKey: this.config.firecrawlApiKey,
      //   baseUrl: this.config.firecrawlBaseUrl
      // });
      this.firecrawl = null; // Placeholder until Firecrawl is available
      this.logger.info('Firecrawl integration enabled', 'ResearchOrchestrator');
    } else {
      this.firecrawl = null;
      this.logger.info('Firecrawl integration disabled', 'ResearchOrchestrator');
    }
  }

  /**
   * Answer a research question using cascading source hierarchy
   *
   * @deprecated Use atomic searchCodebase() tool instead. See class-level @deprecated tag for details.
   *
   * @description Executes comprehensive research using a cascading approach:
   * 1. Project files search (fastest, most relevant)
   * 2. Knowledge graph query (instant, context-aware)
   * 3. Environment resources query (live data)
   * 4. Web search fallback (external, when confidence is low)
   *
   * Results are cached for 5 minutes to improve performance for repeated queries.
   *
   * @param {string} question - The research question to investigate
   *
   * @returns {Promise<ResearchAnswer>} Comprehensive research results with:
   * - `answer`: Synthesized answer from all sources
   * - `confidence`: Overall confidence score (0-1)
   * - `sources`: Array of source results with individual confidence scores
   * - `needsWebSearch`: Whether web search is recommended
   * - `metadata`: Execution metadata (duration, files analyzed, etc.)
   *
   * @throws {Error} When question is empty or research orchestration fails
   *
   * @example
   * ```typescript
   * const result = await orchestrator.answerResearchQuestion(
   *   'How does authentication work in this project?'
   * );
   *
   * if (result.confidence >= 0.8) {
   *   console.log('High confidence answer:', result.answer);
   * } else if (result.needsWebSearch) {
   *   console.log('Consider web search for more information');
   * }
   *
   * result.sources.forEach(source => {
   *   console.log(`${source.type}: ${(source.confidence * 100).toFixed(1)}%`);
   * });
   * ```
   *
   * @since 2.0.0
   * @category Research
   * @category Public API
   */
  async answerResearchQuestion(question: string): Promise<ResearchAnswer> {
    const startTime = Date.now();

    // Check cache first
    const cacheKey = this.generateCacheKey(question);
    const cached = this.getCachedResult(cacheKey);
    if (cached) {
      this.logger.info(`Cache hit for question: "${question}"`, 'ResearchOrchestrator');
      return cached;
    }

    this.logger.info(`Starting research for question: "${question}"`, 'ResearchOrchestrator');

    const answer: ResearchAnswer = {
      question,
      sources: [],
      confidence: 0,
      needsWebSearch: false,
      metadata: {
        duration: 0,
        sourcesQueried: [],
        filesAnalyzed: 0,
      },
    };

    try {
      // SOURCE 1: PROJECT FILES
      this.logger.info('📁 Searching project files...', 'ResearchOrchestrator');
      const projectData = await this.searchProjectFiles(question);

      if (projectData.found) {
        answer.sources.push({
          type: 'project_files',
          data: projectData,
          confidence: 0.9,
          timestamp: new Date().toISOString(),
        });
        answer.metadata.sourcesQueried.push('project_files');
        answer.metadata.filesAnalyzed = projectData.files?.length || 0;

        this.logger.info(
          `Found ${projectData.files?.length || 0} relevant project files`,
          'ResearchOrchestrator'
        );
      }

      // SOURCE 2: KNOWLEDGE GRAPH
      this.logger.info('🧠 Querying knowledge graph...', 'ResearchOrchestrator');
      const knowledgeData = await this.queryKnowledgeGraph(question);

      // Always add to sources queried and sources (even if empty)
      answer.metadata.sourcesQueried.push('knowledge_graph');
      answer.sources.push({
        type: 'knowledge_graph',
        found: knowledgeData.found,
        data: knowledgeData,
        confidence: knowledgeData.found ? 0.85 : 0,
        timestamp: new Date().toISOString(),
      });

      if (knowledgeData.found) {
        this.logger.info(
          `Found ${knowledgeData.nodes?.length || 0} relevant knowledge graph nodes`,
          'ResearchOrchestrator'
        );
      }

      // SOURCE 3: ENVIRONMENT RESOURCES
      this.logger.info('🔧 Checking environment resources...', 'ResearchOrchestrator');
      const envData = await this.queryEnvironment(question);

      if (envData.found) {
        answer.sources.push({
          type: 'environment',
          data: envData,
          confidence: 0.95,
          timestamp: new Date().toISOString(),
        });
        answer.metadata.sourcesQueried.push('environment');

        this.logger.info(
          `Found environment data from ${envData.capabilities?.length || 0} capabilities`,
          'ResearchOrchestrator'
        );
      }

      // Calculate overall confidence
      answer.confidence = this.calculateConfidence(answer.sources);

      this.logger.info(
        `Research confidence: ${(answer.confidence * 100).toFixed(1)}%`,
        'ResearchOrchestrator'
      );

      // SOURCE 4: WEB SEARCH (fallback)
      if (answer.confidence < this.confidenceThreshold) {
        this.logger.warn(
          `Confidence below threshold (${this.confidenceThreshold}), attempting web search`,
          'ResearchOrchestrator'
        );

        try {
          const webSearchData = await this.performWebSearch(question);

          if (webSearchData.found) {
            answer.sources.push({
              type: 'web_search',
              data: webSearchData,
              confidence: 0.7, // Web search has lower confidence
              timestamp: new Date().toISOString(),
            });
            answer.metadata.sourcesQueried.push('web_search');

            // Recalculate confidence with web search
            answer.confidence = this.calculateConfidence(answer.sources);

            this.logger.info(
              `Web search found ${webSearchData.results?.length || 0} results`,
              'ResearchOrchestrator'
            );
          } else {
            answer.needsWebSearch = true;
            this.logger.warn('Web search failed or returned no results', 'ResearchOrchestrator');
          }
        } catch (error) {
          this.logger.error('Web search failed', 'ResearchOrchestrator', error as Error);
          answer.needsWebSearch = true;
        }
      }

      // Generate synthesized answer
      answer.answer = this.synthesizeAnswer(answer);

      answer.metadata.duration = Date.now() - startTime;

      // Cache the result
      this.setCachedResult(cacheKey, answer);

      this.logger.info(
        `Research completed in ${answer.metadata.duration}ms`,
        'ResearchOrchestrator',
        { confidence: answer.confidence, sources: answer.metadata.sourcesQueried }
      );

      return answer;
    } catch (_error) {
      this.logger.error('Research orchestration failed', 'ResearchOrchestrator', _error as Error);
      throw _error;
    }
  }

  /**
   * SOURCE 1: Search project files (Enhanced with tree-sitter and file ops)
   */
  private async searchProjectFiles(question: string): Promise<any> {
    const results = {
      found: false,
      files: [] as string[],
      content: {} as Record<string, string>,
      relevance: {} as Record<string, number>,
      parseAnalysis: {} as Record<string, any>,
    };

    try {
      const questionLower = question.toLowerCase();
      const keywords = this.extractKeywords(question);

      this.logger.info(
        `Searching project files with keywords: ${keywords.join(', ')}`,
        'ResearchOrchestrator'
      );

      // PHASE 1: Use actual-file-operations for structured project scan
      const projectStructure = await scanProjectStructure(this.projectPath, {
        readContent: false,
        maxFileSize: 100000,
        includeHidden: false,
      });

      // PHASE 2: Match relevant file categories based on question intent
      const relevantFiles: string[] = [];

      if (questionLower.match(/docker|container/i)) {
        relevantFiles.push(...projectStructure.dockerFiles.map(f => f.path));
      }

      if (questionLower.match(/kubernetes|k8s|pod|deployment/i)) {
        relevantFiles.push(...projectStructure.kubernetesFiles.map(f => f.path));
      }

      if (questionLower.match(/dependency|package|library/i)) {
        relevantFiles.push(...projectStructure.packageFiles.map(f => f.path));
      }

      if (questionLower.match(/config|configuration|environment|env/i)) {
        relevantFiles.push(...projectStructure.configFiles.map(f => f.path));
        relevantFiles.push(...projectStructure.environmentFiles.map(f => f.path));
      }

      if (questionLower.match(/build|ci|cd|pipeline/i)) {
        relevantFiles.push(...projectStructure.buildFiles.map(f => f.path));
        relevantFiles.push(...projectStructure.ciFiles.map(f => f.path));
      }

      if (questionLower.match(/test|testing|spec/i)) {
        // Use fast-glob to find test files
        const testResults = await findFiles(this.projectPath, [
          '**/*.test.ts',
          '**/*.spec.ts',
          '**/*.test.js',
          '**/*.spec.js',
          '**/tests/**',
          '**/test/**',
        ]);
        relevantFiles.push(...testResults.files.map(f => f.path));
      }

      // PHASE 3: Always include ADRs
      const adrPath = path.join(this.projectPath, this.adrDirectory);
      try {
        const adrResults = await findFiles(adrPath, ['**/*.md']);
        relevantFiles.push(...adrResults.files.map(f => f.path));
      } catch {
        this.logger.warn(`ADR directory not found: ${adrPath}`, 'ResearchOrchestrator');
      }

      // PHASE 4: Use glob-based file discovery (tree-sitter will analyze content)
      // Note: Ripgrep removed per ADR-016 - deterministic tools, LLM reasoning
      if (keywords.length > 0) {
        this.logger.info('Using file discovery for keyword-based search', 'ResearchOrchestrator');

        try {
          // Search for files with keyword-matching names
          const keywordPatterns = keywords.slice(0, 5).map(k => `**/*${k}*`);
          const keywordResults = await findFiles(this.projectPath, keywordPatterns, { limit: 50 });
          relevantFiles.push(...keywordResults.files.map(f => f.path));
        } catch {
          this.logger.warn(
            'Keyword file discovery failed, continuing with other methods',
            'ResearchOrchestrator'
          );
        }
      }

      // Remove duplicates and filter out empty/invalid paths
      results.files = [...new Set(relevantFiles)].filter(
        f => f && typeof f === 'string' && f.trim().length > 0
      );

      if (results.files.length === 0) {
        this.logger.info('No relevant files found', 'ResearchOrchestrator');
        return results;
      }

      results.found = true;

      // PHASE 5: Read and analyze files with tree-sitter
      const analyzer = new TreeSitterAnalyzer();

      for (const file of results.files.slice(0, 50)) {
        // Limit to 50 files for performance
        try {
          const content = await fs.readFile(file, 'utf-8');

          // Calculate text-based relevance
          const relevance = this.calculateRelevanceLegacy(content, question);

          if (relevance > 0.2) {
            // Lower threshold for tree-sitter analysis
            results.content[file] = content;
            results.relevance[file] = relevance;

            // PHASE 6: Use tree-sitter for AST-based analysis
            if (this.shouldParse(file)) {
              try {
                const analysis = await analyzer.analyzeFile(file, content);

                // Enhance relevance based on AST analysis
                let astRelevance = relevance;

                // Check for infrastructure references
                if (analysis.infraStructure && analysis.infraStructure.length > 0) {
                  // Extract provider types and resource names from infrastructure analysis
                  const infraProviders = analysis.infraStructure.map(i => i.provider);
                  const infraResources = analysis.infraStructure.map(i => i.name);

                  // Check if question keywords match infrastructure providers or resources
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

                // Update relevance
                results.relevance[file] = Math.min(astRelevance, 1.0);
                results.parseAnalysis[file] = {
                  language: analysis.language,
                  hasInfrastructure: !!analysis.infraStructure,
                  functionCount: analysis.functions?.length || 0,
                  importCount: analysis.imports?.length || 0,
                };

                this.logger.debug(
                  `Tree-sitter analysis for ${file}: ${analysis.language}, relevance: ${results.relevance[file]}`,
                  'ResearchOrchestrator'
                );
              } catch {
                this.logger.debug(
                  `Tree-sitter parsing failed for ${file}, using text-based analysis`,
                  'ResearchOrchestrator'
                );
              }
            }
          }
        } catch (readError) {
          // Only log if file path is valid - empty paths are filtered but may slip through
          if (file && file.trim().length > 0) {
            this.logger.debug(
              `Failed to read file '${file}': ${readError instanceof Error ? readError.message : 'unknown error'}`,
              'ResearchOrchestrator'
            );
          }
        }
      }

      // Sort files by relevance
      results.files = results.files
        .filter(f => (results.relevance[f] ?? 0) > 0.2)
        .sort((a, b) => (results.relevance[b] || 0) - (results.relevance[a] || 0))
        .slice(0, 20); // Top 20 most relevant files

      this.logger.info(
        `Found ${results.files.length} relevant files (analyzed with tree-sitter)`,
        'ResearchOrchestrator'
      );

      return results;
    } catch (error) {
      this.logger.error('Project file search failed', 'ResearchOrchestrator', error as Error);
      return results;
    }
  }

  /**
   * Check if file should be parsed with tree-sitter
   */
  private shouldParse(filePath: string): boolean {
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

  /**
   * SOURCE 2: Query knowledge graph
   */
  private async queryKnowledgeGraph(question: string): Promise<any> {
    try {
      this.logger.debug(`Querying knowledge graph for: "${question}"`, 'ResearchOrchestrator');

      // Query knowledge graph using KnowledgeGraphManager
      const results = await this.kgManager.queryKnowledgeGraph(question);

      if (results.found) {
        this.logger.info(
          `Knowledge graph query found ${results.nodes.length} nodes, ${results.relationships.length} relationships`,
          'ResearchOrchestrator',
          {
            relevantIntents: results.relevantIntents.length,
            relevantDecisions: results.relevantDecisions.length,
          }
        );
      } else {
        this.logger.debug('No relevant knowledge graph data found', 'ResearchOrchestrator');
      }

      return results;
    } catch (error) {
      this.logger.error('Knowledge graph query failed', 'ResearchOrchestrator', error as Error);
      return {
        found: false,
        nodes: [],
        relationships: [],
        relevantIntents: [],
        relevantDecisions: [],
      };
    }
  }

  /**
   * SOURCE 3: Query environment resources
   */
  private async queryEnvironment(question: string): Promise<any> {
    try {
      // Import dynamically to avoid circular dependencies
      const { EnvironmentCapabilityRegistry } =
        await import('./environment-capability-registry.js');

      const envRegistry = new EnvironmentCapabilityRegistry(this.projectPath);

      // Discover available capabilities
      await envRegistry.discoverCapabilities();

      // Query relevant capabilities
      const results = await envRegistry.query(question);

      return {
        found: results.length > 0,
        capabilities: envRegistry.listCapabilities(),
        data: results,
      };
    } catch {
      this.logger.warn(
        'Environment query failed (capability registry not available)',
        'ResearchOrchestrator'
      );
      return { found: false, capabilities: [], data: [] };
    }
  }

  /**
   * Calculate confidence score from multiple sources
   */
  private calculateConfidence(sources: ResearchSource[]): number {
    if (sources.length === 0) return 0;

    // Weighted confidence calculation
    const totalConfidence = sources.reduce((sum, s) => sum + s.confidence, 0);
    const avgConfidence = totalConfidence / sources.length;

    // Bonus for multiple sources
    const sourceBonus = Math.min(sources.length * 0.05, 0.15);

    return Math.min(avgConfidence + sourceBonus, 1.0);
  }

  /**
   * Synthesize answer from multiple sources
   */
  private synthesizeAnswer(research: ResearchAnswer): string {
    if (research.sources.length === 0) {
      return 'No relevant information found in project files, knowledge graph, or environment.';
    }

    const parts: string[] = [];

    // Add project file findings
    const projectFiles = research.sources.find(s => s.type === 'project_files');
    if (projectFiles && projectFiles.data.files?.length > 0) {
      parts.push(`Found ${projectFiles.data.files.length} relevant project file(s).`);
    }

    // Add knowledge graph findings
    const knowledgeGraph = research.sources.find(s => s.type === 'knowledge_graph');
    if (knowledgeGraph && knowledgeGraph.data.nodes?.length > 0) {
      parts.push(
        `Identified ${knowledgeGraph.data.nodes.length} related architectural decision(s).`
      );
    }

    // Add environment findings
    const environment = research.sources.find(s => s.type === 'environment');
    if (environment && environment.data.capabilities?.length > 0) {
      parts.push(
        `Detected ${environment.data.capabilities.length} environment capability(ies): ${environment.data.capabilities.join(', ')}.`
      );
    }

    if (research.needsWebSearch) {
      parts.push('Additional web research recommended for comprehensive answer.');
    }

    return parts.join(' ');
  }

  /**
   * Calculate relevance score for content (legacy method - kept for compatibility)
   */
  private calculateRelevanceLegacy(content: string, question: string): number {
    const contentLower = content.toLowerCase();
    const questionLower = question.toLowerCase();

    // Extract keywords from question
    const keywords = this.extractKeywords(question);

    let score = 0;

    for (const keyword of keywords) {
      if (contentLower.includes(keyword.toLowerCase())) {
        score += 0.2;
      }
    }

    // Bonus for exact question phrases
    const questionWords = questionLower.split(/\s+/).filter(w => w.length > 3);
    for (const word of questionWords) {
      if (contentLower.includes(word)) {
        score += 0.1;
      }
    }

    return Math.min(score, 1.0);
  }

  /**
   * Extract keywords from question
   */
  private extractKeywords(question: string): string[] {
    // Remove common words
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

    const words = question
      .toLowerCase()
      .replace(/[^\w\s-]/g, ' ')
      .split(/\s+/)
      .filter(w => w.length > 2 && !stopWords.has(w));

    return [...new Set(words)];
  }

  /**
   * Set confidence threshold for web search fallback
   */
  setConfidenceThreshold(threshold: number): void {
    this.confidenceThreshold = Math.max(0, Math.min(1, threshold));
  }

  /**
   * SOURCE 4: Perform web search using Firecrawl (LLM-managed)
   */
  private async performWebSearch(question: string): Promise<any> {
    try {
      this.logger.debug(
        `Performing Firecrawl web search for: "${question}"`,
        'ResearchOrchestrator'
      );

      // Generate search queries
      const searchQueries = this.generateSearchQueries(question);

      // Use Firecrawl to search and extract content
      const results = await Promise.all(
        searchQueries.map(async query => {
          return await this.searchWithFirecrawl(query);
        })
      );

      const flattenedResults = results.flat().filter(result => result.found);

      return {
        found: flattenedResults.length > 0,
        results: flattenedResults,
        queries: searchQueries,
        timestamp: new Date().toISOString(),
        provider: 'firecrawl',
      };
    } catch (error) {
      this.logger.error('Firecrawl web search failed', 'ResearchOrchestrator', error as Error);
      return {
        found: false,
        results: [],
        queries: [],
        error: error instanceof Error ? error.message : String(error),
        provider: 'firecrawl',
      };
    }
  }

  /**
   * Search using Firecrawl with LLM-driven query optimization
   */
  private async searchWithFirecrawl(query: string): Promise<any[]> {
    try {
      // Check if Firecrawl is available
      if (!this.firecrawl) {
        this.logger.warn(
          'Firecrawl is not available, using fallback search',
          'ResearchOrchestrator'
        );
        return this.generateFallbackSearchResults(query);
      }

      // Step 1: Generate search URLs using LLM
      const searchUrls = await this.generateSearchUrls(query);

      // Step 2: Use Firecrawl to extract content from search results
      const results = await Promise.all(
        searchUrls.map(async url => {
          try {
            const crawlResult = await this.firecrawl.scrapeUrl(url, {
              formats: ['markdown', 'html'],
              onlyMainContent: true,
              removeBase64Images: true,
              removeEmojis: true,
              removeLinks: false,
              removeImages: false,
              removeScripts: true,
              removeStyles: true,
            });

            return {
              title: crawlResult.metadata?.title || 'No title',
              url: url,
              content: crawlResult.markdown || crawlResult.html,
              relevance: await this.calculateRelevance(query, crawlResult.markdown || ''),
              timestamp: new Date().toISOString(),
            };
          } catch (error) {
            this.logger.debug(
              `Failed to scrape ${url}`,
              'ResearchOrchestrator',
              error instanceof Error ? error : new Error(String(error))
            );
            return null;
          }
        })
      );

      return results.filter(result => result !== null && result.relevance > 0.3);
    } catch (error) {
      this.logger.error(
        `Firecrawl search failed for query: ${query}`,
        'ResearchOrchestrator',
        error as Error
      );
      return this.generateFallbackSearchResults(query);
    }
  }

  /**
   * Generate fallback search results when Firecrawl is not available
   */
  private generateFallbackSearchResults(query: string): any[] {
    const searchQueries = this.generateSearchQueries(query);
    return searchQueries.map((searchQuery, index) => ({
      title: `Search Result ${index + 1} for "${searchQuery}"`,
      url: `https://example.com/search?q=${encodeURIComponent(searchQuery)}`,
      content: `This is a fallback search result for the query: ${searchQuery}. Firecrawl is not available, so this is a placeholder result.`,
      relevance: Math.max(0.3, 0.9 - index * 0.1),
      timestamp: new Date().toISOString(),
    }));
  }

  /**
   * Generate search URLs using LLM
   */
  private async generateSearchUrls(query: string): Promise<string[]> {
    // const aiConfig = loadAIConfig();
    // const executor = getAIExecutor();

    // const prompt = `
    // Generate 3-5 relevant search URLs for this query: "${query}"
    //
    // Consider:
    // - Technical documentation sites (docs, GitHub, Stack Overflow)
    // - Official documentation (Red Hat, Ubuntu, macOS)
    // - Community forums and wikis
    // - API documentation
    // - Tutorial and guide sites
    //
    // Return only the URLs, one per line.
    // `;

    // TODO: Implement LLM URL generation when AI executor is available
    // try {
    //   const result = await executor.executeStructuredPrompt(prompt, {
    //     type: 'object',
    //     properties: {
    //       urls: {
    //         type: 'array',
    //         items: { type: 'string' },
    //         description: 'List of URLs to search'
    //       }
    //     }
    //   });
    //   return result.data.urls || [];
    // } catch (error) {
    //   this.logger.warn('LLM search URL generation failed, using fallback', 'ResearchOrchestrator');
    // }

    // Fallback to common search URLs
    return [
      `https://www.google.com/search?q=${encodeURIComponent(query)}`,
      `https://duckduckgo.com/?q=${encodeURIComponent(query)}`,
      `https://www.bing.com/search?q=${encodeURIComponent(query)}`,
    ];
  }

  /**
   * Calculate relevance score using LLM
   */
  private async calculateRelevance(query: string, content: string): Promise<number> {
    if (!content || content.length < 100) return 0;

    // const aiConfig = loadAIConfig();
    // const executor = getAIExecutor();

    // const prompt = `
    // Rate the relevance of this content to the query "${query}" on a scale of 0.0 to 1.0.
    //
    // Content (first 500 chars): ${content.substring(0, 500)}...
    //
    // Consider:
    // - Direct answer to the query
    // - Technical accuracy
    // - Completeness of information
    // - Authority of the source
    //
    // Return only a number between 0.0 and 1.0.
    // `;

    // TODO: Implement LLM relevance calculation when AI executor is available
    // try {
    //   const result = await executor.executeStructuredPrompt(prompt, {
    //     type: 'object',
    //     properties: {
    //       relevance: { type: 'number', minimum: 0, maximum: 1 }
    //     }
    //   });
    //   return result.data.relevance || 0;
    // } catch (error) {
    //   // Fallback to simple keyword matching
    // }

    // Fallback to simple keyword matching
    const queryWords = query.toLowerCase().split(' ');
    const contentLower = content.toLowerCase();
    const matches = queryWords.filter(word => contentLower.includes(word)).length;
    return Math.min(matches / queryWords.length, 1);
  }

  /**
   * Generate search queries based on research question
   */
  private generateSearchQueries(question: string): string[] {
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

    if (questionLower.includes('ansible')) {
      queries.push(`${question} ansible automation`);
    }

    if (questionLower.includes('deployment')) {
      queries.push(`${question} deployment strategy`);
    }

    if (questionLower.includes('security')) {
      queries.push(`${question} security best practices`);
    }

    return queries.slice(0, 3); // Limit to top 3
  }

  /**
   * Generate cache key for research question
   */
  private generateCacheKey(question: string): string {
    const key = `${this.projectPath}:${this.adrDirectory}:${question}`;
    return crypto.createHash('sha256').update(key).digest('hex').slice(0, 16);
  }

  /**
   * Get cached result if available and not expired
   */
  private getCachedResult(cacheKey: string): ResearchAnswer | null {
    const cached = this.cache.get(cacheKey);
    if (!cached) return null;

    if (Date.now() > cached.expiry) {
      this.cache.delete(cacheKey);
      return null;
    }

    // Mark as cached
    const result = { ...cached.result };
    result.metadata = { ...result.metadata, cached: true };
    return result;
  }

  /**
   * Cache a research result
   */
  private setCachedResult(cacheKey: string, result: ResearchAnswer): void {
    const now = Date.now();
    this.cache.set(cacheKey, {
      result: { ...result },
      timestamp: now,
      expiry: now + this.cacheTtl,
    });
  }

  /**
   * Clear expired cache entries
   */
  cleanupCache(): void {
    const now = Date.now();
    let cleaned = 0;
    for (const [key, cached] of this.cache.entries()) {
      if (now > cached.expiry) {
        this.cache.delete(key);
        cleaned++;
      }
    }
    if (cleaned > 0) {
      this.logger.info(`Cleaned ${cleaned} expired cache entries`, 'ResearchOrchestrator');
    }
  }

  /**
   * Clear all cache entries
   */
  clearCache(): void {
    this.cache.clear();
    this.logger.info('Research cache cleared', 'ResearchOrchestrator');
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): { size: number; entries: Array<{ key: string; age: number; expires: number }> } {
    const now = Date.now();
    const entries = Array.from(this.cache.entries()).map(([key, cached]) => ({
      key,
      age: now - cached.timestamp,
      expires: cached.expiry - now,
    }));

    return {
      size: this.cache.size,
      entries,
    };
  }

  /**
   * Create a research plan for LLM delegation (non-blocking)
   *
   * This is the recommended method for new code. Instead of executing research
   * internally (which blocks for 2-8 seconds), this returns a research plan
   * that the calling LLM should execute using atomic tools.
   *
   * Benefits:
   * - Non-blocking: Returns immediately with a plan
   * - LLM-controlled: The calling LLM decides execution order
   * - MCP Tasks: Integrated with MCP Tasks for progress tracking
   * - Cancellable: Can be cancelled between phases
   *
   * @param question - The research question to investigate
   * @param options - Optional configuration
   * @returns Task ID, research plan, and tracker for progress updates
   *
   * @example
   * ```typescript
   * const orchestrator = new ResearchOrchestrator('/path/to/project');
   * const { taskId, plan, tracker } = await orchestrator.createResearchPlan(
   *   'How does authentication work in this codebase?'
   * );
   *
   * // LLM receives the plan and executes each phase:
   * for (const phase of plan.phases) {
   *   await tracker.startPhase(phase.phase);
   *   const result = await executeToolCall(phase.tool, phase.params);
   *   await tracker.storeResult(phase.phase, result);
   *   await tracker.completePhase(phase.phase);
   * }
   *
   * // Finally, synthesize and complete
   * const answer = synthesize(results);
   * await tracker.storeSynthesizedAnswer(answer, confidence);
   * await tracker.complete({ success: true, data: { answer, confidence } });
   * ```
   *
   * @since 3.1.0
   */
  async createResearchPlan(
    question: string,
    options?: {
      includeWebSearch?: boolean;
      confidenceThreshold?: number;
    }
  ): Promise<{
    taskId: string;
    plan: ResearchPlan;
    tracker: ResearchTaskTracker;
  }> {
    const taskOptions: CreateResearchTaskOptions = {
      question,
      projectPath: this.projectPath,
      includeWebSearch: options?.includeWebSearch ?? true,
      confidenceThreshold: options?.confidenceThreshold ?? this.confidenceThreshold,
    };

    const { taskId, plan, tracker } = await createResearchWithDelegation(taskOptions);

    this.logger.info('Created research plan for LLM delegation', 'ResearchOrchestrator', {
      taskId,
      question: question.substring(0, 100),
      phasesCount: plan.phases.length,
    });

    return { taskId, plan, tracker };
  }

  /**
   * Get the project path used by this orchestrator
   */
  getProjectPath(): string {
    return this.projectPath;
  }

  /**
   * Get the ADR directory used by this orchestrator
   */
  getAdrDirectory(): string {
    return this.adrDirectory;
  }
}

// Re-export types from research-task-integration for convenience
export type { ResearchPlan, ResearchTaskTracker, CreateResearchTaskOptions };
