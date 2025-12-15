/**
 * MCP Tool for environment context analysis
 * Implements prompt-driven environment analysis and compliance assessment
 * Enhanced with Generated Knowledge Prompting (GKP) for DevOps and infrastructure expertise
 * Now includes memory integration for environment snapshot tracking and evolution analysis
 */

import { McpAdrError } from '../types/index.js';
import { MemoryEntityManager } from '../utils/memory-entity-manager.js';
import { EnhancedLogger } from '../utils/enhanced-logging.js';
import { ResearchOrchestrator } from '../utils/research-orchestrator.js';
import {
  getEnhancedModeDefault,
  getKnowledgeEnhancementDefault,
  getMemoryIntegrationDefault,
} from '../utils/test-aware-defaults.js';

/**
 * Interface for research orchestrator dependency (enables DI and mocking)
 * @see Issue #310 - Dependency injection for improved testability
 */
export interface IResearchOrchestrator {
  answerResearchQuestion(question: string): Promise<{
    answer: string;
    confidence: number;
    sources: any[];
    metadata: { filesAnalyzed: number; duration: number; sourcesQueried: string[] };
    needsWebSearch: boolean;
  }>;
}

/**
 * Dependencies for EnvironmentMemoryManager (enables DI and mocking)
 * Uses concrete types for full compatibility with existing implementations
 * @see Issue #310 - Dependency injection for improved testability
 */
export interface EnvironmentMemoryManagerDeps {
  memoryManager?: MemoryEntityManager;
  logger?: EnhancedLogger;
}

/**
 * Environment Memory Manager for tracking environment snapshots and evolution
 * Supports dependency injection for improved testability
 * @see Issue #310 - Dependency injection for improved testability
 */
class EnvironmentMemoryManager {
  private memoryManager: MemoryEntityManager;
  private logger: EnhancedLogger;

  /**
   * Constructor with optional dependency injection
   * @param deps - Optional dependencies for testing (defaults create real instances)
   */
  constructor(deps: EnvironmentMemoryManagerDeps = {}) {
    this.memoryManager = deps.memoryManager ?? new MemoryEntityManager();
    this.logger = deps.logger ?? new EnhancedLogger();
  }

  async initialize(): Promise<void> {
    await this.memoryManager.initialize();
  }

  /**
   * Store environment snapshot as memory entity
   */
  async storeEnvironmentSnapshot(
    environmentType: string,
    configuration: any,
    complianceData?: any,
    projectPath?: string
  ): Promise<string> {
    try {
      const environmentData = {
        environmentType: environmentType as 'development' | 'staging' | 'production' | 'testing',
        configuration: {
          infrastructure: configuration.infrastructure || {},
          containerization: configuration.containerization || {},
          cloudServices: configuration.cloudServices || {},
          networking: configuration.networking || {},
          storage: configuration.storage || {},
          security: configuration.security || {},
          monitoring: configuration.monitoring || {},
          deployment: configuration.deployment || {},
        },
        complianceStatus: {
          performanceMetrics: complianceData?.performanceMetrics || {},
          securityPosture: complianceData?.securityPosture || 0,
          adrAlignment: complianceData?.adrAlignment || 0,
          lastValidation: new Date().toISOString(),
          complianceIssues: complianceData?.violations?.map((v: any) => v.description) || [],
        },
        infrastructureSpecs: {
          dependencies: configuration.dependencies || [],
          containerization: configuration.containerization || {},
          resourceLimits: configuration.resourceLimits || {},
          networkConfiguration: configuration.networking || {},
          storageConfiguration: configuration.storage || {},
        },
        changeHistory: [
          {
            timestamp: new Date().toISOString(),
            changeType: 'configuration' as
              | 'configuration'
              | 'infrastructure'
              | 'security'
              | 'dependencies',
            description: `Environment snapshot created for ${environmentType}`,
            impact: 'medium' as 'low' | 'medium' | 'high',
            author: 'environment-analysis-tool',
          },
        ],
        recommendations: configuration.recommendations || [],
        qualityAttributes: configuration.qualityAttributes || {},
        riskAssessment: configuration.riskAssessment || {},
        optimizationOpportunities: this.identifyOptimizationOpportunities(configuration),
        complianceGaps:
          complianceData?.violations?.map((v: any) => ({
            requirement: v.requirement,
            gap: v.description,
            severity: v.severity || 'medium',
            remediation: v.remediation,
          })) || [],
      };

      const entity = await this.memoryManager.upsertEntity({
        type: 'environment_snapshot',
        title: `Environment Snapshot: ${environmentType} - ${new Date().toISOString().split('T')[0]}`,
        description: `Comprehensive environment analysis snapshot for ${environmentType} environment`,
        tags: [
          'environment',
          environmentType.toLowerCase(),
          'infrastructure',
          complianceData ? 'compliance-assessed' : 'configuration-only',
          ...(configuration.containerization?.detected ? ['containerized'] : []),
          ...(configuration.cloudServices?.providers?.length > 0 ? ['cloud-native'] : []),
        ],
        environmentData,
        relationships: [],
        context: {
          projectPhase: 'environment-analysis',
          technicalStack: this.extractTechnicalStack(configuration),
          environmentalFactors: [environmentType, projectPath || 'unknown-project'].filter(Boolean),
          stakeholders: ['infrastructure-team', 'devops-team', 'security-team'],
        },
        accessPattern: {
          lastAccessed: new Date().toISOString(),
          accessCount: 1,
          accessContext: ['environment-analysis'],
        },
        evolution: {
          origin: 'created',
          transformations: [
            {
              timestamp: new Date().toISOString(),
              type: 'snapshot_creation',
              description: `Environment snapshot created for ${environmentType}`,
              agent: 'environment-analysis-tool',
            },
          ],
        },
        validation: {
          isVerified: Boolean(complianceData && complianceData.overallScore > 70),
          verificationMethod: complianceData ? 'compliance-assessment' : 'configuration-analysis',
          verificationTimestamp: new Date().toISOString(),
        },
      });

      this.logger.info(
        `Environment snapshot stored for ${environmentType}`,
        'EnvironmentMemoryManager',
        {
          environmentType,
          entityId: entity.id,
          complianceScore: complianceData?.overallScore,
          configurationsStored: Object.keys(environmentData.configuration).length,
        }
      );

      return entity.id;
    } catch (error) {
      this.logger.error(
        'Failed to store environment snapshot',
        'EnvironmentMemoryManager',
        error as Error
      );
      throw error;
    }
  }

  /**
   * Track configuration changes between snapshots
   */
  async trackConfigurationChange(
    previousSnapshotId: string,
    newSnapshotId: string,
    changeDescription: string,
    changeDetails: any
  ): Promise<void> {
    try {
      // Create relationship between snapshots using relationship creation
      await this.memoryManager.upsertRelationship({
        sourceId: previousSnapshotId,
        targetId: newSnapshotId,
        type: 'supersedes',
        strength: 1.0,
        context: changeDescription,
        evidence: [JSON.stringify(changeDetails)],
      });

      this.logger.info('Configuration change relationship created', 'EnvironmentMemoryManager', {
        from: previousSnapshotId,
        to: newSnapshotId,
        change: changeDescription,
      });
    } catch (error) {
      this.logger.error(
        'Failed to track configuration change',
        'EnvironmentMemoryManager',
        error as Error
      );
      throw error;
    }
  }

  /**
   * Analyze environment evolution over time
   */
  async analyzeEnvironmentEvolution(environmentType: string): Promise<{
    snapshots: any[];
    trends: any[];
    recommendations: string[];
  }> {
    try {
      const snapshots = await this.memoryManager.queryEntities({
        entityTypes: ['environment_snapshot'],
        tags: [environmentType.toLowerCase()],
        limit: 50,
        sortBy: 'lastModified',
      });

      const trends = this.calculateEnvironmentTrends(snapshots.entities);
      const recommendations = this.generateEvolutionRecommendations(trends);

      return {
        snapshots: snapshots.entities,
        trends,
        recommendations,
      };
    } catch (error) {
      this.logger.error(
        'Failed to analyze environment evolution',
        'EnvironmentMemoryManager',
        error as Error
      );
      throw error;
    }
  }

  /**
   * Compare current environment with previous snapshots
   */
  async compareWithPreviousSnapshots(
    currentConfiguration: any,
    environmentType: string
  ): Promise<{
    hasChanges: boolean;
    changes: any[];
    regressions: any[];
    improvements: any[];
  }> {
    try {
      const recentSnapshots = await this.memoryManager.queryEntities({
        entityTypes: ['environment_snapshot'],
        tags: [environmentType.toLowerCase()],
        limit: 5,
        sortBy: 'lastModified',
      });

      if (recentSnapshots.entities.length === 0) {
        return {
          hasChanges: true,
          changes: ['Initial environment snapshot'],
          regressions: [],
          improvements: [],
        };
      }

      const lastSnapshot = recentSnapshots.entities[0];
      const comparison = this.compareConfigurations(
        (lastSnapshot as any).environmentData?.configuration || {},
        currentConfiguration
      );

      return comparison;
    } catch (error) {
      this.logger.error(
        'Failed to compare with previous snapshots',
        'EnvironmentMemoryManager',
        error as Error
      );
      return {
        hasChanges: true,
        changes: ['Comparison failed - treating as new snapshot'],
        regressions: [],
        improvements: [],
      };
    }
  }

  // Private helper methods

  private identifyOptimizationOpportunities(configuration: any): string[] {
    const opportunities = [];

    // Containerization opportunities
    if (!configuration.containerization?.detected) {
      opportunities.push('Consider containerizing application for better deployment consistency');
    }

    // Cloud optimization
    if (!configuration.cloudServices?.providers?.length) {
      opportunities.push('Evaluate cloud services adoption for improved scalability');
    }

    // Security improvements
    if (!configuration.security?.httpsEnabled) {
      opportunities.push('Enable HTTPS for secure communication');
    }

    // Monitoring gaps
    if (!configuration.monitoring?.metrics) {
      opportunities.push('Implement comprehensive monitoring and metrics collection');
    }

    // Performance optimization
    if (!configuration.deployment?.loadBalancing) {
      opportunities.push('Consider load balancing for improved performance and availability');
    }

    return opportunities;
  }

  private extractTechnicalStack(configuration: any): string[] {
    const stack = [];

    // Container technologies
    if (configuration.containerization?.technologies) {
      stack.push(...configuration.containerization.technologies);
    }

    // Cloud providers
    if (configuration.cloudServices?.providers) {
      stack.push(...configuration.cloudServices.providers);
    }

    // Infrastructure components
    if (configuration.infrastructure?.components) {
      stack.push(...Object.keys(configuration.infrastructure.components));
    }

    return [...new Set(stack)]; // Remove duplicates
  }

  private calculateEnvironmentTrends(snapshots: any[]): any[] {
    const trends: any[] = [];

    if (snapshots.length < 2) {
      return trends;
    }

    // Analyze compliance score trends
    const complianceScores = snapshots
      .filter(s => s.environmentData.complianceStatus?.overallScore)
      .map(s => ({
        timestamp: s.lastModified,
        score: s.environmentData.complianceStatus.overallScore,
      }))
      .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

    if (complianceScores.length >= 2) {
      const latest = complianceScores[complianceScores.length - 1];
      const previous = complianceScores[complianceScores.length - 2];
      if (latest && previous) {
        trends.push({
          metric: 'compliance_score',
          direction: latest.score > previous.score ? 'improving' : 'declining',
          change: latest.score - previous.score,
          trend: 'compliance_trend',
        });
      }
    }

    // Analyze technology adoption trends
    const techStacks = snapshots.map(s => s.context?.technicalStack || []);
    const techGrowth = this.calculateTechGrowth(techStacks);
    if (techGrowth.length > 0) {
      trends.push({
        metric: 'technology_adoption',
        direction: 'expanding',
        change: techGrowth,
        trend: 'technology_trend',
      });
    }

    return trends;
  }

  private calculateTechGrowth(techStacks: string[][]): string[] {
    if (techStacks.length < 2) return [];

    const latest = new Set(techStacks[techStacks.length - 1]);
    const previous = new Set(techStacks[techStacks.length - 2]);

    return Array.from(latest).filter(tech => !previous.has(tech));
  }

  private generateEvolutionRecommendations(trends: any[]): string[] {
    const recommendations = [];

    trends.forEach(trend => {
      if (trend.trend === 'compliance_trend') {
        if (trend.direction === 'declining') {
          recommendations.push(
            `Address compliance regression: score decreased by ${Math.abs(trend.change)} points`
          );
        } else {
          recommendations.push(
            `Maintain compliance momentum: score improved by ${trend.change} points`
          );
        }
      }

      if (trend.trend === 'technology_trend') {
        recommendations.push(`Document new technology adoption: ${trend.change.join(', ')}`);
        recommendations.push('Create ADRs for significant technology choices');
      }
    });

    if (recommendations.length === 0) {
      recommendations.push('Continue regular environment monitoring');
      recommendations.push('Consider setting up automated compliance checks');
    }

    return recommendations;
  }

  private compareConfigurations(
    previous: any,
    current: any
  ): {
    hasChanges: boolean;
    changes: any[];
    regressions: any[];
    improvements: any[];
  } {
    const changes = [];
    const regressions = [];
    const improvements = [];

    // Compare infrastructure components
    const prevInfra = previous.infrastructure?.components || {};
    const currInfra = current.infrastructure?.components || {};

    Object.keys(currInfra).forEach(component => {
      if (!prevInfra[component]) {
        changes.push(`Added infrastructure component: ${component}`);
        improvements.push(`New component improves infrastructure: ${component}`);
      }
    });

    Object.keys(prevInfra).forEach(component => {
      if (!currInfra[component]) {
        changes.push(`Removed infrastructure component: ${component}`);
        regressions.push(`Lost infrastructure component: ${component}`);
      }
    });

    // Compare security settings
    const prevSecurity = previous.security || {};
    const currSecurity = current.security || {};

    if (prevSecurity.httpsEnabled && !currSecurity.httpsEnabled) {
      changes.push('HTTPS disabled');
      regressions.push('Security regression: HTTPS disabled');
    } else if (!prevSecurity.httpsEnabled && currSecurity.httpsEnabled) {
      changes.push('HTTPS enabled');
      improvements.push('Security improvement: HTTPS enabled');
    }

    return {
      hasChanges: changes.length > 0,
      changes,
      regressions,
      improvements,
    };
  }
}

/**
 * Analyze environment context and provide optimization recommendations
 * Enhanced with Generated Knowledge Prompting for DevOps and infrastructure expertise
 * Now includes memory integration for environment tracking
 */
/**
 * Dependencies for analyzeEnvironment function (enables DI and mocking)
 * @see Issue #310 - Dependency injection for improved testability
 */
export interface AnalyzeEnvironmentDeps {
  memoryManager?: EnvironmentMemoryManager;
  researchOrchestrator?: IResearchOrchestrator;
}

/**
 * Factory for creating ResearchOrchestrator instances
 * Allows injection of mock factory for testing
 */
export type ResearchOrchestratorFactory = (
  projectPath: string,
  adrDirectory: string
) => IResearchOrchestrator;

export async function analyzeEnvironment(
  args: {
    projectPath?: string;
    adrDirectory?: string;
    analysisType?: 'specs' | 'containerization' | 'requirements' | 'compliance' | 'comprehensive';
    currentEnvironment?: any;
    requirements?: any;
    industryStandards?: string[];
    knowledgeEnhancement?: boolean; // Enable GKP for DevOps and infrastructure knowledge
    enhancedMode?: boolean; // Enable advanced prompting features
    enableMemoryIntegration?: boolean; // Enable memory snapshot storage
    environmentType?: string; // Environment type for memory storage (e.g., 'development', 'staging', 'production')
  },
  deps: AnalyzeEnvironmentDeps = {}
): Promise<any> {
  const {
    projectPath = process.cwd(),
    adrDirectory = 'docs/adrs',
    analysisType = 'comprehensive',
    currentEnvironment,
    requirements,
    industryStandards,
    knowledgeEnhancement = getKnowledgeEnhancementDefault(), // Environment-aware default
    enhancedMode = getEnhancedModeDefault(), // Environment-aware default
    enableMemoryIntegration = getMemoryIntegrationDefault(), // Environment-aware default
    environmentType = 'development', // Default environment type
  } = args;

  // Initialize memory manager if enabled (use injected or create new)
  let memoryManager: EnvironmentMemoryManager | null = null;
  if (enableMemoryIntegration) {
    memoryManager = deps.memoryManager ?? new EnvironmentMemoryManager();
    await memoryManager.initialize();
  }

  // Research live environment state using research-orchestrator (use injected or create new)
  let liveEnvironmentData = '';
  try {
    const orchestrator =
      deps.researchOrchestrator ?? new ResearchOrchestrator(projectPath, adrDirectory);
    const research = await orchestrator.answerResearchQuestion(
      `Analyze ${environmentType} environment state and configuration:
1. What infrastructure tools are currently available and running?
2. What deployment and containerization technologies are in use?
3. What is the current environment configuration?
4. Are there any environment-related ADRs or documentation?
5. What are the current resource utilization and health metrics?`
    );
    const envSource = research.sources.find(s => s.type === 'environment');
    const capabilities = envSource?.data?.capabilities || [];

    liveEnvironmentData = `

## 🔍 Live Environment Research

**Research Confidence**: ${(research.confidence * 100).toFixed(1)}%
**Environment Type**: ${environmentType}

### Current Infrastructure State
${research.answer || 'No live environment data available'}

### Detected Capabilities
${capabilities.length > 0 ? capabilities.map((c: string) => `- ${c}`).join('\n') : '- No infrastructure tools detected'}

### Research Sources
${research.sources.map(s => `- ${s.type}: Consulted`).join('\n')}

${research.needsWebSearch ? '⚠️ **Note**: Local environment data may be incomplete - external verification recommended\n' : ''}
`;
  } catch (error) {
    liveEnvironmentData = `\n## ⚠️ Live Environment Research\nUnavailable: ${error instanceof Error ? error.message : String(error)}\n`;
  }

  try {
    const {
      analyzeEnvironmentSpecs,
      detectContainerization,
      determineEnvironmentRequirements,
      assessEnvironmentCompliance,
    } = await import('../utils/environment-analysis.js');

    switch (analysisType) {
      case 'specs': {
        let enhancedPrompt = '';
        let knowledgeContext = '';

        // Generate domain-specific knowledge for environment analysis if enabled
        if (enhancedMode && knowledgeEnhancement) {
          try {
            const { generateArchitecturalKnowledge } =
              await import('../utils/knowledge-generation.js');
            const knowledgeResult = await generateArchitecturalKnowledge(
              {
                projectPath,
                technologies: [],
                patterns: [],
                projectType: 'infrastructure-environment-analysis',
              },
              {
                domains: ['cloud-infrastructure', 'devops-cicd'],
                depth: 'intermediate',
                cacheEnabled: true,
              }
            );

            knowledgeContext = `\n## Infrastructure & DevOps Knowledge Enhancement\n\n${knowledgeResult.prompt}\n\n---\n`;
          } catch (error) {
            console.error(
              '[WARNING] GKP knowledge generation failed for environment analysis:',
              error
            );
            knowledgeContext = '<!-- Infrastructure knowledge generation unavailable -->\n';
          }
        }

        const result = await analyzeEnvironmentSpecs(projectPath);
        enhancedPrompt = liveEnvironmentData + knowledgeContext + result.analysisPrompt;

        // Execute the environment analysis with AI if enabled, otherwise return prompt
        const { executePromptWithFallback, formatMCPResponse } =
          await import('../utils/prompt-execution.js');
        const executionResult = await executePromptWithFallback(
          enhancedPrompt,
          result.instructions,
          {
            temperature: 0.1,
            maxTokens: 5000,
            systemPrompt: `You are a DevOps and infrastructure expert specializing in environment analysis.
Analyze the provided project to understand its infrastructure requirements, deployment patterns, and environment configuration.
Leverage the provided cloud infrastructure and DevOps knowledge to create comprehensive, industry-standard recommendations.
Focus on providing actionable insights for environment optimization, security, scalability, and modern DevOps practices.
Consider cloud-native patterns, containerization best practices, and deployment automation.
Provide specific recommendations with implementation guidance.`,
            responseFormat: 'text',
          }
        );

        if (executionResult.isAIGenerated) {
          // AI execution successful - return actual environment analysis results

          // Store environment snapshot in memory if enabled
          let memoryIntegrationInfo = '';
          if (memoryManager) {
            try {
              // Parse AI result to extract configuration data
              const analysisData = parseAnalysisResults(executionResult.content, result.actualData);

              // Compare with previous snapshots
              const comparison = await memoryManager.compareWithPreviousSnapshots(
                analysisData,
                environmentType
              );

              // Store new snapshot
              const snapshotId = await memoryManager.storeEnvironmentSnapshot(
                environmentType,
                analysisData,
                undefined, // No compliance data for specs analysis
                projectPath
              );

              memoryIntegrationInfo = `
## 🧠 Memory Integration Status

- **Snapshot Stored**: ✅ Environment snapshot saved (ID: ${snapshotId.substring(0, 8)}...)
- **Environment Type**: ${environmentType}
- **Change Detection**: ${comparison.hasChanges ? '🔄 Changes detected' : '✅ No changes from previous snapshot'}
- **Improvements**: ${comparison.improvements.length} detected
- **Regressions**: ${comparison.regressions.length} detected

${
  comparison.changes.length > 0
    ? `### Configuration Changes
${comparison.changes.map(change => `- ${change}`).join('\n')}
`
    : ''
}

${
  comparison.improvements.length > 0
    ? `### Improvements Detected
${comparison.improvements.map(improvement => `- ${improvement}`).join('\n')}
`
    : ''
}

${
  comparison.regressions.length > 0
    ? `### Regressions Detected  
${comparison.regressions.map(regression => `- ⚠️ ${regression}`).join('\n')}
`
    : ''
}
`;
            } catch (memoryError) {
              memoryIntegrationInfo = `
## 🧠 Memory Integration Status

- **Status**: ⚠️ Memory storage failed - analysis continued without persistence
- **Error**: ${memoryError instanceof Error ? memoryError.message : 'Unknown error'}
`;
            }
          }

          return formatMCPResponse({
            ...executionResult,
            content: `# Environment Specification Analysis Results (GKP Enhanced)

## Enhancement Features
- **Generated Knowledge Prompting**: ${knowledgeEnhancement ? '✅ Enabled' : '❌ Disabled'}
- **Enhanced Mode**: ${enhancedMode ? '✅ Enabled' : '❌ Disabled'}
- **Memory Integration**: ${enableMemoryIntegration ? '✅ Enabled' : '❌ Disabled'}
- **Knowledge Domains**: Cloud infrastructure, DevOps practices, containerization, deployment patterns

${memoryIntegrationInfo}

## Analysis Information
- **Project Path**: ${projectPath}
- **ADR Directory**: ${adrDirectory}
- **Analysis Type**: Environment Specifications
- **Environment Type**: ${environmentType}

${
  knowledgeContext
    ? `## Applied Infrastructure Knowledge

${knowledgeContext}
`
    : ''
}

## AI Environment Analysis Results

${executionResult.content}

## Next Steps

Based on the environment analysis:

1. **Review Infrastructure Requirements**: Examine identified infrastructure needs
2. **Optimize Resource Allocation**: Right-size compute and storage resources
3. **Improve Security Posture**: Implement security best practices and compliance
4. **Enhance Scalability**: Design for growth and load handling
5. **Plan Implementation**: Create tasks for environment improvements

## Environment Optimization Areas

Use the analysis results to:
- **Optimize Resource Allocation**: Right-size compute and storage resources
- **Improve Security Posture**: Implement security best practices and compliance
- **Enhance Scalability**: Design for growth and load handling
- **Reduce Costs**: Optimize cloud service usage and resource efficiency
- **Increase Reliability**: Implement redundancy and disaster recovery

## Follow-up Analysis

For deeper insights, consider running:
- **Containerization Analysis**: \`analyze_environment\` with \`analysisType: "containerization"\`
- **Compliance Assessment**: \`analyze_environment\` with \`analysisType: "compliance"\`
- **Requirements Analysis**: \`analyze_environment\` with \`analysisType: "requirements"\`
`,
          });
        } else {
          // Fallback to prompt-only mode
          return {
            content: [
              {
                type: 'text',
                text: `# Environment Specification Analysis (GKP Enhanced)

## Enhancement Status
- **Generated Knowledge Prompting**: ${knowledgeEnhancement ? '✅ Applied' : '❌ Disabled'}
- **Enhanced Mode**: ${enhancedMode ? '✅ Applied' : '❌ Disabled'}

${
  knowledgeContext
    ? `## Infrastructure Knowledge Context

${knowledgeContext}
`
    : ''
}

${result.instructions}

## Enhanced AI Analysis Prompt

${enhancedPrompt}

## Next Steps

1. **Submit the prompt** to an AI agent for comprehensive environment analysis
2. **Parse the JSON response** to get environment specifications and infrastructure details
3. **Review infrastructure requirements** and quality attributes
4. **Use findings** for environment optimization and planning
`,
              },
            ],
          };
        }
      }

      case 'containerization': {
        let enhancedPrompt = '';
        let knowledgeContext = '';

        // Generate containerization-specific knowledge if enabled
        if (enhancedMode && knowledgeEnhancement) {
          try {
            const { generateArchitecturalKnowledge } =
              await import('../utils/knowledge-generation.js');
            const knowledgeResult = await generateArchitecturalKnowledge(
              {
                projectPath,
                technologies: [],
                patterns: [],
                projectType: 'containerization-analysis',
              },
              {
                domains: ['cloud-infrastructure', 'devops-cicd'],
                depth: 'intermediate',
                cacheEnabled: true,
              }
            );

            knowledgeContext = `\n## Containerization Knowledge Enhancement\n\n${knowledgeResult.prompt}\n\n---\n`;
          } catch (error) {
            console.error(
              '[WARNING] GKP knowledge generation failed for containerization analysis:',
              error
            );
            knowledgeContext = '<!-- Containerization knowledge generation unavailable -->\n';
          }
        }

        const result = await detectContainerization(projectPath);
        enhancedPrompt = knowledgeContext + result.detectionPrompt;

        return {
          content: [
            {
              type: 'text',
              text: `# Containerization Technology Detection (GKP Enhanced)

## Enhancement Status
- **Generated Knowledge Prompting**: ${knowledgeEnhancement ? '✅ Applied' : '❌ Disabled'}
- **Enhanced Mode**: ${enhancedMode ? '✅ Applied' : '❌ Disabled'}
- **Knowledge Domains**: Containerization, Kubernetes, Docker best practices, container security

${
  knowledgeContext
    ? `## Containerization Knowledge Context

${knowledgeContext}
`
    : ''
}

${result.instructions}

## Enhanced AI Detection Prompt

${enhancedPrompt}

## Next Steps

1. **Submit the prompt** to an AI agent for containerization analysis
2. **Parse the JSON response** to get containerization assessment
3. **Review security findings** and best practice compliance
4. **Implement recommendations** for container optimization

## Expected Output

The AI will provide:
- **Containerization Status**: Detection of container technologies and maturity level
- **Dockerfile Analysis**: Security, optimization, and best practice evaluation
- **Compose Configuration**: Service orchestration and networking analysis
- **Kubernetes Resources**: Manifest analysis and resource management evaluation
- **Build Configuration**: Multi-stage builds and optimization assessment
- **Resource Management**: CPU, memory limits and scaling policies
- **Best Practices**: Security, performance, and operational best practices
- **Security Findings**: Vulnerability assessment and remediation guidance
- **Recommendations**: Prioritized improvements for container optimization

## Container Optimization

Use the detection results to:
- **Improve Security**: Implement container security best practices
- **Optimize Performance**: Right-size resources and optimize builds
- **Enhance Reliability**: Add health checks and proper resource limits
- **Reduce Image Size**: Use minimal base images and multi-stage builds
- **Automate Scanning**: Implement security scanning in CI/CD pipelines
`,
            },
          ],
        };
      }

      case 'requirements': {
        let enhancedPrompt = '';
        let knowledgeContext = '';

        // Generate requirements analysis knowledge if enabled
        if (enhancedMode && knowledgeEnhancement) {
          try {
            const { generateArchitecturalKnowledge } =
              await import('../utils/knowledge-generation.js');
            const knowledgeResult = await generateArchitecturalKnowledge(
              {
                projectPath,
                technologies: [],
                patterns: [],
                projectType: 'requirements-analysis',
              },
              {
                domains: ['cloud-infrastructure', 'performance-optimization'],
                depth: 'intermediate',
                cacheEnabled: true,
              }
            );

            knowledgeContext = `\n## Requirements Engineering Knowledge Enhancement\n\n${knowledgeResult.prompt}\n\n---\n`;
          } catch (error) {
            console.error(
              '[WARNING] GKP knowledge generation failed for requirements analysis:',
              error
            );
            knowledgeContext = '<!-- Requirements knowledge generation unavailable -->\n';
          }
        }

        const result = await determineEnvironmentRequirements(adrDirectory, projectPath);
        enhancedPrompt = knowledgeContext + result.requirementsPrompt;

        return {
          content: [
            {
              type: 'text',
              text: `# Environment Requirements from ADRs (GKP Enhanced)

## Enhancement Status
- **Generated Knowledge Prompting**: ${knowledgeEnhancement ? '✅ Applied' : '❌ Disabled'}
- **Enhanced Mode**: ${enhancedMode ? '✅ Applied' : '❌ Disabled'}
- **Knowledge Domains**: Requirements engineering, infrastructure planning, performance requirements, security requirements

${
  knowledgeContext
    ? `## Requirements Knowledge Context

${knowledgeContext}
`
    : ''
}

${result.instructions}

## Enhanced AI Requirements Prompt

${enhancedPrompt}

## Next Steps

1. **Submit the prompt** to an AI agent for requirements extraction
2. **Parse the JSON response** to get environment requirements
3. **Review requirement completeness** and identify gaps
4. **Use requirements** for environment design and compliance assessment

## Expected Output

The AI will provide:
- **Infrastructure Requirements**: Compute, networking, storage, and availability needs
- **Platform Requirements**: Containerization, cloud services, and database needs
- **Security Requirements**: Compliance, access control, and data protection needs
- **Performance Requirements**: Response time, throughput, and scalability needs
- **Operational Requirements**: Monitoring, deployment, and maintenance needs
- **Requirement Traceability**: Links back to specific ADRs
- **Gaps**: Missing or unclear requirements
- **Recommendations**: Suggested requirement clarifications and additions

## Requirements Management

Use the extracted requirements to:
- **Design Environment**: Create infrastructure that meets all requirements
- **Assess Compliance**: Compare current environment against requirements
- **Plan Improvements**: Prioritize environment enhancements
- **Validate Decisions**: Ensure ADR requirements are properly implemented
- **Track Changes**: Monitor requirement evolution over time
`,
            },
          ],
        };
      }

      case 'compliance': {
        if (!currentEnvironment || !requirements) {
          throw new McpAdrError(
            'Current environment and requirements are required for compliance assessment',
            'INVALID_INPUT'
          );
        }

        let enhancedPrompt = '';
        let knowledgeContext = '';

        // Generate compliance-specific knowledge if enabled
        if (enhancedMode && knowledgeEnhancement) {
          try {
            const { generateArchitecturalKnowledge } =
              await import('../utils/knowledge-generation.js');
            const knowledgeResult = await generateArchitecturalKnowledge(
              {
                projectPath,
                technologies: [],
                patterns: [],
                projectType: 'compliance-assessment',
              },
              {
                domains: ['security-patterns', 'cloud-infrastructure'],
                depth: 'intermediate',
                cacheEnabled: true,
              }
            );

            knowledgeContext = `\n## Compliance & Security Knowledge Enhancement\n\n${knowledgeResult.prompt}\n\n---\n`;
          } catch (error) {
            console.error(
              '[WARNING] GKP knowledge generation failed for compliance assessment:',
              error
            );
            knowledgeContext = '<!-- Compliance knowledge generation unavailable -->\n';
          }
        }

        const result = await assessEnvironmentCompliance(
          currentEnvironment,
          requirements,
          industryStandards
        );
        enhancedPrompt = knowledgeContext + result.compliancePrompt;

        return {
          content: [
            {
              type: 'text',
              text: `# Environment Compliance Assessment (GKP Enhanced)

## Enhancement Status
- **Generated Knowledge Prompting**: ${knowledgeEnhancement ? '✅ Applied' : '❌ Disabled'}
- **Enhanced Mode**: ${enhancedMode ? '✅ Applied' : '❌ Disabled'}
- **Knowledge Domains**: Compliance frameworks, security standards, regulatory requirements, audit practices

${
  knowledgeContext
    ? `## Compliance Knowledge Context

${knowledgeContext}
`
    : ''
}

${result.instructions}

## Enhanced AI Compliance Prompt

${enhancedPrompt}

## Next Steps

1. **Submit the prompt** to an AI agent for compliance assessment
2. **Parse the JSON response** to get detailed compliance evaluation
3. **Review violations** and prioritize remediation efforts
4. **Implement improvement plan** based on recommendations

## Expected Output

The AI will provide:
- **Compliance Assessment**: Overall compliance score and status
- **Category Scores**: Infrastructure, security, performance, operational compliance
- **Compliance Details**: Requirement-by-requirement assessment
- **Violations**: Specific compliance violations with remediation guidance
- **Strengths**: Areas where compliance exceeds requirements
- **Recommendations**: Prioritized improvement recommendations
- **Improvement Plan**: Phased implementation roadmap with timelines
- **Risk Assessment**: Risk analysis and mitigation strategies
- **Compliance Metrics**: Quantitative measurements and targets

## Compliance Management

Use the assessment results to:
- **Prioritize Fixes**: Address critical violations first
- **Plan Improvements**: Implement systematic compliance improvements
- **Track Progress**: Monitor compliance score improvements over time
- **Manage Risk**: Mitigate identified compliance risks
- **Demonstrate Compliance**: Provide evidence for audits and certifications
`,
            },
          ],
        };
      }

      case 'comprehensive': {
        let comprehensiveKnowledgeContext = '';

        // Generate comprehensive environment knowledge if enabled
        if (enhancedMode && knowledgeEnhancement) {
          try {
            const { generateArchitecturalKnowledge } =
              await import('../utils/knowledge-generation.js');
            const knowledgeResult = await generateArchitecturalKnowledge(
              {
                projectPath,
                technologies: [],
                patterns: [],
                projectType: 'comprehensive-environment-analysis',
              },
              {
                domains: ['cloud-infrastructure', 'devops-cicd', 'security-patterns'],
                depth: 'advanced',
                cacheEnabled: true,
              }
            );

            comprehensiveKnowledgeContext = `\n## Comprehensive Environment Knowledge Enhancement\n\n${knowledgeResult.prompt}\n\n---\n`;
          } catch (error) {
            console.error(
              '[WARNING] GKP knowledge generation failed for comprehensive environment analysis:',
              error
            );
            comprehensiveKnowledgeContext =
              '<!-- Comprehensive environment knowledge generation unavailable -->\n';
          }
        }

        const specsResult = await analyzeEnvironmentSpecs(projectPath);
        const containerResult = await detectContainerization(projectPath);
        const requirementsResult = await determineEnvironmentRequirements(
          adrDirectory,
          projectPath
        );

        return {
          content: [
            {
              type: 'text',
              text: `# Comprehensive Environment Analysis (GKP Enhanced)

## Enhancement Features
- **Generated Knowledge Prompting**: ${knowledgeEnhancement ? '✅ Enabled' : '❌ Disabled'}
- **Enhanced Mode**: ${enhancedMode ? '✅ Enabled' : '❌ Disabled'}
- **Knowledge Domains**: Cloud infrastructure, DevOps practices, containerization, deployment patterns, compliance frameworks, security standards
- **Knowledge Depth**: Advanced (comprehensive coverage)

${
  comprehensiveKnowledgeContext
    ? `## Applied Comprehensive Knowledge

${comprehensiveKnowledgeContext}
`
    : ''
}

This comprehensive analysis will examine all aspects of your environment context and provide optimization recommendations.

## Environment Specification Analysis

${specsResult.instructions}

### Enhanced Environment Analysis Prompt

${comprehensiveKnowledgeContext + specsResult.analysisPrompt}

## Containerization Detection

${containerResult.instructions}

### Enhanced Containerization Detection Prompt

${comprehensiveKnowledgeContext + containerResult.detectionPrompt}

## Environment Requirements from ADRs

${requirementsResult.instructions}

### Enhanced Requirements Analysis Prompt

${comprehensiveKnowledgeContext + requirementsResult.requirementsPrompt}

## Comprehensive Workflow

### 1. **Environment Specification Analysis** (First Step)
Submit the environment analysis prompt to understand current infrastructure

### 2. **Containerization Detection** (Second Step)
Submit the containerization detection prompt to analyze container technologies

### 3. **Requirements Extraction** (Third Step)
Submit the requirements analysis prompt to extract ADR-based requirements

### 4. **Compliance Assessment** (Fourth Step)
Use the compliance assessment tool with results from previous steps:
\`\`\`json
{
  "tool": "analyze_environment",
  "args": {
    "analysisType": "compliance",
    "currentEnvironment": [results from steps 1-2],
    "requirements": [results from step 3],
    "industryStandards": ["GDPR", "SOC2", "ISO27001"]
  }
}
\`\`\`

### 5. **Optimization Implementation**
Apply recommendations from all analyses for comprehensive environment optimization

## Expected Outcomes

This comprehensive analysis will provide:
- **Complete Environment Understanding**: Full picture of current infrastructure
- **Technology Assessment**: Evaluation of containerization and cloud technologies
- **Requirements Clarity**: Clear understanding of ADR-based requirements
- **Compliance Status**: Assessment against requirements and standards
- **Optimization Roadmap**: Prioritized improvements with implementation guidance
- **Risk Mitigation**: Identification and mitigation of environment risks

## Quality Assurance

All analyses follow these principles:
- **Evidence-based**: Conclusions based on actual configuration files
- **Best Practice Alignment**: Comparison against industry standards
- **Security Focus**: Emphasis on security and compliance
- **Practical Recommendations**: Actionable improvement suggestions
- **Risk Assessment**: Identification of potential risks and mitigation strategies
`,
            },
          ],
        };
      }

      default:
        throw new McpAdrError(`Unknown analysis type: ${analysisType}`, 'INVALID_INPUT');
    }
  } catch (error) {
    throw new McpAdrError(
      `Failed to analyze environment: ${error instanceof Error ? error.message : String(error)}`,
      'ENVIRONMENT_ANALYSIS_ERROR'
    );
  }
}

/**
 * Helper function to parse AI analysis results into structured configuration data
 */
function parseAnalysisResults(aiContent: string, actualData?: any): any {
  // Try to extract structured data from AI response
  const configuration = {
    infrastructure: actualData?.infrastructure || {},
    containerization: {
      detected:
        aiContent.toLowerCase().includes('docker') || aiContent.toLowerCase().includes('container'),
      technologies: extractTechnologies(aiContent, [
        'docker',
        'kubernetes',
        'podman',
        'containerd',
      ]),
    },
    cloudServices: {
      providers: extractTechnologies(aiContent, [
        'aws',
        'azure',
        'gcp',
        'google cloud',
        'heroku',
        'vercel',
        'netlify',
      ]),
    },
    security: {
      httpsEnabled:
        aiContent.toLowerCase().includes('https') || aiContent.toLowerCase().includes('ssl'),
      securityMentioned: aiContent.toLowerCase().includes('security'),
    },
    monitoring: {
      metrics:
        aiContent.toLowerCase().includes('monitoring') ||
        aiContent.toLowerCase().includes('metrics'),
    },
    deployment: {
      automated:
        aiContent.toLowerCase().includes('ci/cd') || aiContent.toLowerCase().includes('pipeline'),
      loadBalancing:
        aiContent.toLowerCase().includes('load balanc') || aiContent.toLowerCase().includes('lb'),
    },
    discoveredFiles: actualData?.discoveredFiles || [],
    recommendations: extractRecommendations(aiContent),
    qualityAttributes: extractQualityAttributes(aiContent),
    riskAssessment: extractRiskAssessment(aiContent),
  };

  return configuration;
}

/**
 * Extract technology mentions from AI content
 */
function extractTechnologies(content: string, technologies: string[]): string[] {
  const found = [];
  const lowerContent = content.toLowerCase();

  for (const tech of technologies) {
    if (lowerContent.includes(tech.toLowerCase())) {
      found.push(tech);
    }
  }

  return found;
}

/**
 * Extract recommendations from AI content
 */
function extractRecommendations(content: string): string[] {
  const recommendations = [];
  const lines = content.split('\n');

  for (const line of lines) {
    const trimmed = line.trim();
    if (
      trimmed.startsWith('- ') &&
      (trimmed.toLowerCase().includes('recommend') ||
        trimmed.toLowerCase().includes('suggest') ||
        trimmed.toLowerCase().includes('consider') ||
        trimmed.toLowerCase().includes('should'))
    ) {
      recommendations.push(trimmed.substring(2)); // Remove '- ' prefix
    }
  }

  return recommendations;
}

/**
 * Extract quality attributes from AI content
 */
function extractQualityAttributes(content: string): any {
  const attributes: any = {};
  const lowerContent = content.toLowerCase();

  if (lowerContent.includes('performance')) {
    attributes.performance = 'mentioned';
  }
  if (lowerContent.includes('scalability') || lowerContent.includes('scalable')) {
    attributes.scalability = 'mentioned';
  }
  if (lowerContent.includes('security')) {
    attributes.security = 'mentioned';
  }
  if (lowerContent.includes('reliability') || lowerContent.includes('reliable')) {
    attributes.reliability = 'mentioned';
  }
  if (lowerContent.includes('maintainability') || lowerContent.includes('maintainable')) {
    attributes.maintainability = 'mentioned';
  }

  return attributes;
}

/**
 * Extract risk assessment from AI content
 */
function extractRiskAssessment(content: string): any {
  const risks = [];
  const lowerContent = content.toLowerCase();

  if (lowerContent.includes('risk') || lowerContent.includes('vulnerability')) {
    risks.push('Security risks mentioned in analysis');
  }
  if (lowerContent.includes('single point of failure') || lowerContent.includes('spof')) {
    risks.push('Single point of failure identified');
  }
  if (lowerContent.includes('outdated') || lowerContent.includes('deprecated')) {
    risks.push('Outdated technologies or dependencies detected');
  }

  return {
    risks,
    riskLevel: risks.length > 2 ? 'high' : risks.length > 0 ? 'medium' : 'low',
  };
}
