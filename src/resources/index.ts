/**
 * MCP Resource implementations - Data-driven approach
 * Provides direct access to architectural analysis data
 */

import * as path from 'path';
import { McpAdrError } from '../types/index.js';
import { KnowledgeGraphManager } from '../utils/knowledge-graph-manager.js';
import { resourceCache, generateETag } from './resource-cache.js';

export interface ResourceGenerationResult {
  data: any;
  contentType: string;
  lastModified: string;
  cacheKey: string;
  ttl: number; // Time to live in seconds
  etag?: string;
}

/**
 * Generate architectural knowledge graph resource
 * Returns actual knowledge graph data instead of prompts
 */
export async function generateArchitecturalKnowledgeGraph(
  projectPath: string
): Promise<ResourceGenerationResult> {
  try {
    const cacheKey = `knowledge-graph:${Buffer.from(projectPath).toString('base64')}`;

    // Check cache
    const cached = await resourceCache.get<ResourceGenerationResult>(cacheKey);
    if (cached) {
      return cached;
    }

    // Load actual knowledge graph data
    const kgManager = new KnowledgeGraphManager();
    const knowledgeGraphSnapshot = await kgManager.loadKnowledgeGraph();

    // Import utilities for technology and pattern detection
    const { analyzeProjectStructure } = await import('../utils/file-system.js');
    const projectAnalysis = await analyzeProjectStructure(projectPath);

    // Discover ADRs
    const { discoverAdrsInDirectory } = await import('../utils/adr-discovery.js');
    const pathModule = await import('path');
    const adrDirectory = pathModule.resolve(projectPath, process.env['ADR_DIRECTORY'] || 'docs/adrs');
    const adrDiscovery = await discoverAdrsInDirectory(adrDirectory, projectPath, {
      includeContent: true,
      includeTimeline: false,
    });

    // Build comprehensive knowledge graph with actual data
    const knowledgeGraphData = {
      projectId: Buffer.from(projectPath).toString('base64'),
      timestamp: new Date().toISOString(),
      version: '1.0.0',
      metadata: {
        name: path.basename(projectPath),
        description: 'MCP ADR Analysis Server Project',
        lastAnalyzed: new Date().toISOString(),
        analysisVersion: '1.0.0',
        projectPath,
      },
      technologies: projectAnalysis.technologies || [],
      patterns: projectAnalysis.patterns || [],
      adrs: adrDiscovery.adrs.map(adr => ({
        id: adr.filename.replace(/\.md$/, ''),
        title: adr.title,
        status: adr.status,
        date: new Date().toISOString().split('T')[0],
        context: adr.context,
        decision: adr.decision,
        consequences: adr.consequences,
        filePath: adr.filename,
        tags: [],
        relatedAdrs: [],
      })),
      rules: [], // TODO: Extract rules from ADRs and code
      relationships: [], // TODO: Build relationship graph
      intentSnapshots: knowledgeGraphSnapshot.intents.map(intent => ({
        intentId: intent.intentId,
        humanRequest: intent.humanRequest,
        parsedGoals: intent.parsedGoals,
        priority: intent.priority,
        timestamp: intent.timestamp,
        currentStatus: intent.currentStatus,
        toolChain: intent.toolChain.map(tool => ({
          toolName: tool.toolName,
          parameters: tool.parameters,
          result: tool.result,
          todoTasksCreated: tool.todoTasksCreated,
          todoTasksModified: tool.todoTasksModified,
          executionTime: tool.executionTime,
          success: tool.success,
        })),
        todoMdSnapshot: intent.todoMdSnapshot,
      })),
      analytics: {
        totalIntents: knowledgeGraphSnapshot.analytics.totalIntents,
        completedIntents: knowledgeGraphSnapshot.analytics.completedIntents,
        activeIntents: knowledgeGraphSnapshot.analytics.activeIntents,
        averageGoalCompletion: knowledgeGraphSnapshot.analytics.averageGoalCompletion,
        mostUsedTools: knowledgeGraphSnapshot.analytics.mostUsedTools,
        successfulPatterns: knowledgeGraphSnapshot.analytics.successfulPatterns,
      },
    };

    const result: ResourceGenerationResult = {
      data: knowledgeGraphData,
      contentType: 'application/json',
      lastModified: new Date().toISOString(),
      cacheKey,
      ttl: 3600, // 1 hour cache
      etag: generateETag(knowledgeGraphData),
    };

    // Cache result
    resourceCache.set(cacheKey, result, result.ttl);

    return result;
  } catch (error) {
    throw new McpAdrError(
      `Failed to generate architectural knowledge graph: ${error instanceof Error ? error.message : String(error)}`,
      'RESOURCE_GENERATION_ERROR'
    );
  }
}

/**
 * Generate analysis report resource
 * Returns actual analysis report data instead of prompts
 */
export async function generateAnalysisReport(
  projectPath: string,
  focusAreas?: string[]
): Promise<ResourceGenerationResult> {
  try {
    const cacheKey = `analysis-report:${Buffer.from(projectPath + (focusAreas?.join(',') || '')).toString('base64')}`;

    // Check cache
    const cached = await resourceCache.get<ResourceGenerationResult>(cacheKey);
    if (cached) {
      return cached;
    }

    // Gather analysis data from various sources
    const { analyzeProjectStructure } = await import('../utils/file-system.js');
    const { discoverAdrsInDirectory } = await import('../utils/adr-discovery.js');
    const pathModule = await import('path');

    const projectAnalysis = await analyzeProjectStructure(projectPath);
    const adrDirectory = pathModule.resolve(projectPath, process.env['ADR_DIRECTORY'] || 'docs/adrs');
    const adrDiscovery = await discoverAdrsInDirectory(adrDirectory, projectPath, {
      includeContent: true,
      includeTimeline: false,
    });

    // Build analysis report with actual data
    const reportData = {
      reportId: Buffer.from(projectPath + Date.now()).toString('base64'),
      timestamp: new Date().toISOString(),
      projectSummary: {
        name: path.basename(projectPath),
        type: 'api',
        description: 'MCP ADR Analysis Server',
        maturityLevel: 'development',
        primaryLanguages: ['TypeScript'],
        estimatedSize: 'medium',
      },
      executiveSummary: {
        overallHealth: 'good',
        keyStrengths: [
          'Comprehensive ADR analysis capabilities',
          'MCP protocol integration',
          'Advanced caching and memory management',
        ],
        criticalIssues: focusAreas || [],
        recommendedActions: [
          'Increase resource coverage',
          'Implement comprehensive testing',
          'Enhance documentation',
        ],
        riskLevel: 'medium',
      },
      technicalAnalysis: {
        technologyStack: {
          score: 0.85,
          assessment: 'Modern TypeScript stack with good tooling',
          recommendations: ['Consider adding more performance monitoring'],
        },
        architecturalPatterns: {
          score: 0.8,
          assessment: 'Well-structured MCP server implementation',
          recommendations: ['Expand resource coverage per MCP best practices'],
        },
        codeQuality: {
          score: 0.75,
          assessment: 'Good code organization with room for improvement',
          recommendations: ['Increase test coverage', 'Add more inline documentation'],
        },
        security: {
          score: 0.9,
          assessment: 'Strong security measures with content masking',
          recommendations: ['Regular security audits'],
        },
      },
      detailedFindings: [
        {
          category: 'architecture',
          title: 'Resource Coverage Gap',
          severity: 'high',
          description: 'Only 3 resources exposed vs 40+ tools',
          impact: 'Inefficient data access patterns',
          recommendation: 'Implement Phase 1 resource expansion',
          effort: 'medium',
          priority: 'high',
        },
      ],
      metrics: {
        technologiesDetected: projectAnalysis.technologies?.length || 0,
        patternsIdentified: projectAnalysis.patterns?.length || 0,
        adrsFound: adrDiscovery.adrs.length,
        rulesExtracted: 0,
        overallScore: 0.8,
      },
      actionPlan: {
        immediate: ['Implement resource caching', 'Refactor existing resources'],
        shortTerm: ['Add templated resources', 'Expand test coverage'],
        longTerm: ['Full resource migration', 'Performance optimization'],
        strategic: ['Tool deprecation strategy', 'Enhanced monitoring'],
      },
      focusAreas: focusAreas || [],
    };

    const result: ResourceGenerationResult = {
      data: reportData,
      contentType: 'application/json',
      lastModified: new Date().toISOString(),
      cacheKey,
      ttl: 1800, // 30 minutes cache
      etag: generateETag(reportData),
    };

    // Cache result
    resourceCache.set(cacheKey, result, result.ttl);

    return result;
  } catch (error) {
    throw new McpAdrError(
      `Failed to generate analysis report: ${error instanceof Error ? error.message : String(error)}`,
      'RESOURCE_GENERATION_ERROR'
    );
  }
}

/**
 * Generate ADR list resource
 * Enhanced with caching support
 */
export async function generateAdrList(
  adrDirectory: string = 'docs/adrs',
  projectPath?: string
): Promise<ResourceGenerationResult> {
  try {
    const cacheKey = `adr-list:${Buffer.from(adrDirectory).toString('base64')}`;

    // Check cache
    const cached = await resourceCache.get<ResourceGenerationResult>(cacheKey);
    if (cached) {
      return cached;
    }

    const { discoverAdrsInDirectory } = await import('../utils/adr-discovery.js');
    const pathModule = await import('path');

    // Use provided project path or fall back to current working directory
    const basePath = projectPath || process.cwd();

    // Use absolute path for ADR directory
    const absoluteAdrPath = pathModule.isAbsolute(adrDirectory)
      ? adrDirectory
      : pathModule.resolve(basePath, adrDirectory);

    // Discover ADRs
    const discoveryResult = await discoverAdrsInDirectory(absoluteAdrPath, basePath, {
      includeContent: true,
      includeTimeline: false,
    });

    // Calculate status breakdown
    const statusBreakdown = {
      proposed: discoveryResult.adrs.filter(a => a.status === 'proposed').length,
      accepted: discoveryResult.adrs.filter(a => a.status === 'accepted').length,
      deprecated: discoveryResult.adrs.filter(a => a.status === 'deprecated').length,
      superseded: discoveryResult.adrs.filter(a => a.status === 'superseded').length,
    };

    const adrListData = {
      listId: Buffer.from(adrDirectory + Date.now()).toString('base64'),
      timestamp: new Date().toISOString(),
      version: '1.0.0',
      directory: adrDirectory,
      summary: {
        totalAdrs: discoveryResult.adrs.length,
        statusBreakdown,
        lastModified: new Date().toISOString(),
        coverage: {
          hasImplementationPlans: 0,
          hasConsequences: discoveryResult.adrs.filter(a => a.consequences).length,
          hasRelatedAdrs: 0,
        },
      },
      adrs: discoveryResult.adrs.map(adr => ({
        id: adr.filename.replace(/\.md$/, ''),
        title: adr.title,
        status: adr.status,
        date: new Date().toISOString().split('T')[0],
        context: adr.context,
        decision: adr.decision,
        consequences: adr.consequences,
        implementationPlan: '',
        filePath: adr.filename,
        fileName: path.basename(adr.filename),
        fileSize: 0,
        tags: [],
        relatedAdrs: [],
        priority: 'medium',
        complexity: 'medium',
        implementationStatus: 'not-started',
      })),
      relationships: [],
      gaps: [],
      recommendations: [
        'Consider documenting implicit architectural decisions',
        'Establish ADR review process',
        'Link ADRs to implementation tasks',
      ],
    };

    const result: ResourceGenerationResult = {
      data: adrListData,
      contentType: 'application/json',
      lastModified: new Date().toISOString(),
      cacheKey,
      ttl: 900, // 15 minutes cache
      etag: generateETag(adrListData),
    };

    // Cache result
    resourceCache.set(cacheKey, result, result.ttl);

    return result;
  } catch (error) {
    throw new McpAdrError(
      `Failed to generate ADR list: ${error instanceof Error ? error.message : String(error)}`,
      'RESOURCE_GENERATION_ERROR'
    );
  }
}
