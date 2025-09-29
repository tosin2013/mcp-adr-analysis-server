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
import { EnhancedLogger } from './enhanced-logging.js';
// import { KnowledgeGraphManager } from './knowledge-graph-manager.js'; // TODO: Implement KG query
import { findFiles } from './file-system.js';
import { scanProjectStructure } from './actual-file-operations.js';
import { searchWithRipgrep, isRipgrepAvailable } from './ripgrep-wrapper.js';
import { TreeSitterAnalyzer } from './tree-sitter-analyzer.js';

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
  };
}

export class ResearchOrchestrator {
  private logger: EnhancedLogger;
  private projectPath: string;
  private adrDirectory: string;
  private confidenceThreshold: number = 0.6;

  constructor(projectPath?: string, adrDirectory?: string) {
    this.logger = new EnhancedLogger();
    this.projectPath = projectPath || process.cwd();
    this.adrDirectory = adrDirectory || 'docs/adrs';
  }

  /**
   * Answer a research question using cascading source hierarchy
   */
  async answerResearchQuestion(question: string): Promise<ResearchAnswer> {
    const startTime = Date.now();

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

      if (knowledgeData.found) {
        answer.sources.push({
          type: 'knowledge_graph',
          data: knowledgeData,
          confidence: 0.85,
          timestamp: new Date().toISOString(),
        });
        answer.metadata.sourcesQueried.push('knowledge_graph');

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
          `Confidence below threshold (${this.confidenceThreshold}), web search recommended`,
          'ResearchOrchestrator'
        );
        answer.needsWebSearch = true;
      }

      // Generate synthesized answer
      answer.answer = this.synthesizeAnswer(answer);

      answer.metadata.duration = Date.now() - startTime;

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
   * SOURCE 1: Search project files (Enhanced with tree-sitter, ripgrep, and actual file ops)
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

      // PHASE 4: Use ripgrep for keyword search (if available)
      const hasRipgrep = await isRipgrepAvailable();
      if (hasRipgrep && keywords.length > 0) {
        this.logger.info('Using ripgrep for fast keyword search', 'ResearchOrchestrator');

        try {
          const ripgrepFiles = await searchWithRipgrep({
            pattern: keywords.join('|'),
            path: this.projectPath,
            caseInsensitive: true,
          });

          relevantFiles.push(...ripgrepFiles);
        } catch {
          this.logger.warn(
            'Ripgrep search failed, continuing with other methods',
            'ResearchOrchestrator'
          );
        }
      }

      // Remove duplicates
      results.files = [...new Set(relevantFiles)];

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
          const relevance = this.calculateRelevance(content, question);

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
        } catch {
          this.logger.warn(`Failed to read file: ${file}`, 'ResearchOrchestrator');
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
  private async queryKnowledgeGraph(_question: string): Promise<any> {
    try {
      // TODO: Implement actual knowledge graph query using KnowledgeGraphManager
      // const kgManager = new KnowledgeGraphManager();
      // const keywords = this.extractKeywords(question);

      // Query knowledge graph (placeholder - implement based on your KG structure)
      const results = {
        found: false,
        nodes: [] as any[],
        relationships: [] as any[],
      };

      // TODO: Implement actual knowledge graph query
      // For now, return empty results

      return results;
    } catch (_error) {
      this.logger.error('Knowledge graph query failed', 'ResearchOrchestrator', _error as Error);
      return { found: false, nodes: [], relationships: [] };
    }
  }

  /**
   * SOURCE 3: Query environment resources
   */
  private async queryEnvironment(question: string): Promise<any> {
    try {
      // Import dynamically to avoid circular dependencies
      const { EnvironmentCapabilityRegistry } = await import(
        './environment-capability-registry.js'
      );

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
  /**
   * Calculate relevance score for content
   */
  private calculateRelevance(content: string, question: string): number {
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
}
