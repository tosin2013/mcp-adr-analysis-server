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
import { KnowledgeGraphManager } from './knowledge-graph-manager.js';

export interface ResearchSource {
  type: 'project_files' | 'knowledge_graph' | 'environment' | 'web_search';
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
      this.logger.error('Research orchestration failed', 'ResearchOrchestrator', error as Error);
      throw _error;
    }
  }

  /**
   * SOURCE 1: Search project files
   */
  private async searchProjectFiles(question: string): Promise<any> {
    const results = {
      found: false,
      files: [] as string[],
      content: {} as Record<string, string>,
      relevance: {} as Record<string, number>,
    };

    try {
      const questionLower = question.toLowerCase();

      // Detect question intent and search relevant files
      const searchPatterns: Array<{
        keywords: string[];
        files: string[];
        directories?: string[];
      }> = [
        {
          keywords: ['docker', 'container', 'containerize'],
          files: ['Dockerfile', 'docker-compose.yml', '.dockerignore', 'Containerfile'],
        },
        {
          keywords: ['kubernetes', 'k8s', 'kubectl', 'pod', 'deployment'],
          files: ['*.yaml', '*.yml'],
          directories: ['k8s/', 'kubernetes/', 'manifests/', '.kube/'],
        },
        {
          keywords: ['openshift', 'oc', 'route', 'buildconfig'],
          files: ['*.yaml', '*.yml'],
          directories: ['openshift/', 'ocp/', '.openshift/'],
        },
        {
          keywords: ['ansible', 'playbook', 'role', 'inventory'],
          files: ['*.yml', '*.yaml', 'ansible.cfg', 'hosts'],
          directories: ['ansible/', 'playbooks/', 'roles/'],
        },
        {
          keywords: ['dependency', 'package', 'dependencies', 'library'],
          files: [
            'package.json',
            'requirements.txt',
            'Pipfile',
            'go.mod',
            'pom.xml',
            'build.gradle',
            'Cargo.toml',
          ],
        },
        {
          keywords: ['test', 'testing', 'spec', 'unit test'],
          files: ['*.test.ts', '*.spec.ts', '*.test.js', '*.spec.js'],
          directories: ['tests/', 'test/', '__tests__/'],
        },
        {
          keywords: ['config', 'configuration', 'settings'],
          files: ['*.config.js', '*.config.ts', '.env', 'config.yml', 'settings.json'],
          directories: ['config/', 'configs/'],
        },
      ];

      // Search based on question keywords
      for (const pattern of searchPatterns) {
        const matches = pattern.keywords.some(keyword => questionLower.includes(keyword));

        if (matches) {
          const foundFiles = await this.findFiles(
            this.projectPath,
            pattern.files,
            pattern.directories
          );

          if (foundFiles.length > 0) {
            results.files.push(...foundFiles);
            results.found = true;
          }
        }
      }

      // Always check ADRs
      const adrPath = path.join(this.projectPath, this.adrDirectory);
      const adrFiles = await this.findFiles(adrPath, ['*.md']);

      if (adrFiles.length > 0) {
        results.files.push(...adrFiles);
        results.found = true;
      }

      // Remove duplicates
      results.files = [...new Set(results.files)];

      // Read and analyze relevant files
      for (const file of results.files) {
        try {
          const content = await fs.readFile(file, 'utf-8');
          const relevance = this.calculateRelevance(content, question);

          if (relevance > 0.3) {
            results.content[file] = content;
            results.relevance[file] = relevance;
          }
        } catch (_error) {
          this.logger.warn(`Failed to read file: ${file}`, 'ResearchOrchestrator');
        }
      }

      // Sort files by relevance
      results.files = results.files
        .filter(f => results.relevance[f] > 0.3)
        .sort((a, b) => (results.relevance[b] || 0) - (results.relevance[a] || 0));

      return results;

    } catch (_error) {
      this.logger.error('Project file search failed', 'ResearchOrchestrator', error as Error);
      return results;
    }
  }

  /**
   * SOURCE 2: Query knowledge graph
   */
  private async queryKnowledgeGraph(question: string): Promise<any> {
    try {
      const _kgManager = new KnowledgeGraphManager();

      // Extract keywords from question
      const _keywords = this.extractKeywords(question);

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
      this.logger.error('Knowledge graph query failed', 'ResearchOrchestrator', error as Error);
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

    } catch (_error) {
      this.logger.warn('Environment query failed (capability registry not available)', 'ResearchOrchestrator');
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
      parts.push(`Identified ${knowledgeGraph.data.nodes.length} related architectural decision(s).`);
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
   * Find files matching patterns
   */
  private async findFiles(
    basePath: string,
    patterns: string[],
    directories?: string[]
  ): Promise<string[]> {
    const foundFiles: string[] = [];

    try {
      // Check if base path exists
      await fs.access(basePath);
    } catch {
      return foundFiles;
    }

    // Search in specific directories if provided
    const searchPaths = directories
      ? directories.map(d => path.join(basePath, d))
      : [basePath];

    for (const searchPath of searchPaths) {
      try {
        await fs.access(searchPath);

        for (const pattern of patterns) {
          if (pattern.includes('*')) {
            // Glob pattern - use recursive search
            const files = await this.recursiveFileSearch(searchPath, pattern);
            foundFiles.push(...files);
          } else {
            // Exact file name
            const filePath = path.join(searchPath, pattern);
            try {
              await fs.access(filePath);
              foundFiles.push(filePath);
            } catch {
              // File doesn't exist, skip
            }
          }
        }
      } catch {
        // Directory doesn't exist, skip
      }
    }

    return foundFiles;
  }

  /**
   * Recursive file search with glob pattern
   */
  private async recursiveFileSearch(dir: string, pattern: string): Promise<string[]> {
    const results: string[] = [];

    try {
      const entries = await fs.readdir(dir, { withFileTypes: true });

      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);

        if (entry.isDirectory()) {
          // Skip node_modules and other common ignore dirs
          if (!['node_modules', '.git', 'dist', 'build'].includes(entry.name)) {
            const subResults = await this.recursiveFileSearch(fullPath, pattern);
            results.push(...subResults);
          }
        } else if (entry.isFile()) {
          // Check if file matches pattern
          const regex = new RegExp(
            '^' + pattern.replace(/\*/g, '.*').replace(/\?/g, '.') + '$'
          );
          if (regex.test(entry.name)) {
            results.push(fullPath);
          }
        }
      }
    } catch (_error) {
      // Directory access error, skip
    }

    return results;
  }

  /**
   * Calculate relevance score for content
   */
  private calculateRelevance(content: string, question: string): number {
    const contentLower = content.toLowerCase();
    const questionLower = question.toLowerCase();

    // Extract keywords from question
    const keywords = this.extractKeywords(question);

    let score = 0;
    let matches = 0;

    for (const keyword of keywords) {
      if (contentLower.includes(keyword.toLowerCase())) {
        matches++;
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
      'the', 'is', 'are', 'was', 'were', 'what', 'when', 'where', 'why', 'how',
      'which', 'who', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to',
      'for', 'with', 'about', 'as', 'by', 'from', 'of', 'can', 'could', 'should',
      'would', 'do', 'does', 'did', 'have', 'has', 'had', 'we', 'our', 'us',
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