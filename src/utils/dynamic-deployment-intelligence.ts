/**
 * Dynamic Deployment Intelligence System
 *
 * Instead of static registry, this uses:
 * 1. AI + ResearchOrchestrator to query LIVE documentation
 * 2. Environment detection to see what's actually available
 * 3. Memory system to learn from successful deployments
 * 4. Fallback to basic templates when needed
 *
 * This stays current as software updates daily and best practices evolve.
 */

import { ResearchOrchestrator } from './research-orchestrator.js';
import { MemoryEntityManager } from './memory-entity-manager.js';
import { EnhancedLogger } from './enhanced-logging.js';
import { getAIExecutor } from './ai-executor.js';
import { DEPLOYMENT_TYPES } from './deployment-type-registry.js';
import { promises as fs } from 'fs';
import { exec } from 'child_process';
import { promisify } from 'util';
import * as path from 'path';

const execAsync = promisify(exec);

export interface DynamicDeploymentPlan {
  detectedPlatforms: string[];
  recommendedPlatform: string;
  confidence: number;
  requiredFiles: DeploymentFileRequirement[];
  environmentVariables: EnvironmentVariable[];
  deploymentSteps: DeploymentStep[];
  validationChecks: ValidationCheck[];
  architectureDiagram: string; // Mermaid diagram
  risks: DeploymentRisk[];
  estimatedDuration: string;
  prerequisites: string[];
  source: 'ai-research' | 'memory-pattern' | 'fallback-template';
  researchSources: string[];
  timestamp: string;
}

export interface DeploymentFileRequirement {
  path: string;
  purpose: string;
  required: boolean;
  isSecret: boolean;
  canAutoGenerate: boolean;
  templateContent?: string;
  validationCommand?: string;
  currentBestPractice: string;
  lastUpdated: string;
}

export interface EnvironmentVariable {
  name: string;
  purpose: string;
  required: boolean;
  isSecret: boolean;
  defaultValue?: string;
  validationPattern?: string;
}

export interface DeploymentStep {
  order: number;
  title: string;
  command: string;
  description: string;
  expectedOutput: string;
  troubleshooting: string[];
  estimatedTime: string;
}

export interface ValidationCheck {
  name: string;
  command: string;
  expectedResult: string;
  severity: 'critical' | 'error' | 'warning' | 'info';
}

export interface DeploymentRisk {
  risk: string;
  severity: 'high' | 'medium' | 'low';
  mitigation: string;
  likelihood: string;
}

export class DynamicDeploymentIntelligence {
  private research: ResearchOrchestrator;
  private memory: MemoryEntityManager;
  private logger: EnhancedLogger;
  private projectPath: string;
  private adrDirectory: string;

  constructor(projectPath: string, adrDirectory: string) {
    this.projectPath = projectPath;
    this.adrDirectory = adrDirectory;
    this.research = new ResearchOrchestrator(projectPath, adrDirectory);
    this.memory = new MemoryEntityManager();
    this.logger = new EnhancedLogger();
  }

  /**
   * Generate a comprehensive, AI-powered deployment plan
   * Uses live research + learned patterns + environment detection
   */
  async generateDeploymentPlan(): Promise<DynamicDeploymentPlan> {
    this.logger.info(
      'Starting dynamic deployment plan generation',
      'DynamicDeploymentIntelligence'
    );

    // Step 1: Detect what deployment platforms are available in environment
    const availablePlatforms = await this.detectAvailableDeploymentPlatforms();
    this.logger.info(
      `Detected available platforms: ${availablePlatforms.join(', ')}`,
      'DynamicDeploymentIntelligence'
    );

    // Step 2: Analyze ADRs to understand architecture decisions
    const adrContext = await this.analyzeAdrDeploymentContext();

    // Step 3: Check memory for similar successful deployments
    const learnedPatterns = await this.queryLearnedDeploymentPatterns(
      availablePlatforms,
      adrContext
    );

    // Step 4: If learned pattern exists with high confidence, use it
    if (learnedPatterns && learnedPatterns.confidence > 0.8) {
      this.logger.info(
        'Using learned deployment pattern from memory',
        'DynamicDeploymentIntelligence'
      );
      return this.enhanceLearnedPattern(learnedPatterns);
    }

    // Step 5: Research live documentation for current best practices
    const researchResults = await this.researchCurrentDeploymentBestPractices(
      availablePlatforms,
      adrContext
    );

    // Step 6: Use AI to synthesize research + ADRs + environment into deployment plan
    const aiGeneratedPlan = await this.generateAIPoweredDeploymentPlan(
      availablePlatforms,
      adrContext,
      researchResults
    );

    // Step 7: Store this pattern in memory for future learning
    await this.storeDeploymentPattern(aiGeneratedPlan);

    return aiGeneratedPlan;
  }

  /**
   * Detect which deployment platforms are available in the current environment
   */
  private async detectAvailableDeploymentPlatforms(): Promise<string[]> {
    const platforms: string[] = [];

    // Check for various deployment tools
    const checks = [
      { name: 'docker', command: 'docker --version' },
      { name: 'kubernetes', command: 'kubectl version --client' },
      { name: 'openshift', command: 'oc version' },
      { name: 'firebase', command: 'firebase --version' },
      { name: 'ansible', command: 'ansible --version' },
      { name: 'terraform', command: 'terraform --version' },
      { name: 'npm', command: 'npm --version' },
      { name: 'python', command: 'python --version' },
      { name: 'python3', command: 'python3 --version' },
      { name: 'node', command: 'node --version' },
      { name: 'pip', command: 'pip --version' },
      { name: 'uvx', command: 'uvx --version' },
    ];

    for (const check of checks) {
      try {
        await execAsync(check.command);
        platforms.push(check.name);
      } catch {
        // Tool not available
      }
    }

    // Check for deployment-related files
    const fileChecks = [
      { name: 'docker', files: ['Dockerfile', 'docker-compose.yml'] },
      { name: 'kubernetes', files: ['k8s/', 'kubernetes/'] },
      { name: 'openshift', files: ['openshift/', '.s2i/', 'k8s/', 'kubernetes/'] }, // OpenShift can use k8s dirs too
      { name: 'firebase', files: ['firebase.json'] },
      { name: 'mcp-nodejs', files: ['package.json'] }, // Check package.json for MCP dependencies
      { name: 'fastmcp', files: ['server.py', 'pyproject.toml', 'requirements.txt'] },
    ];

    for (const check of fileChecks) {
      for (const file of check.files) {
        try {
          await fs.access(path.join(this.projectPath, file));
          if (!platforms.includes(check.name)) {
            platforms.push(check.name);
          }
        } catch {
          // File doesn't exist
        }
      }
    }

    return platforms;
  }

  /**
   * Analyze ADRs to understand deployment context and requirements
   */
  private async analyzeAdrDeploymentContext(): Promise<any> {
    try {
      const { discoverAdrsInDirectory } = await import('./adr-discovery.js');
      const adrs = await discoverAdrsInDirectory(this.adrDirectory, this.projectPath, {
        includeContent: true,
        includeTimeline: false,
      });

      // Extract deployment-related information from ADRs
      const deploymentContext = {
        technologies: new Set<string>(),
        platforms: new Set<string>(),
        requirements: new Set<string>(),
        constraints: new Set<string>(),
      };

      for (const adr of adrs.adrs) {
        const content = adr.content || '';

        // Look for technology mentions
        const techPatterns = [
          /node\.?js/gi,
          /python/gi,
          /docker/gi,
          /kubernetes/gi,
          /k8s/gi,
          /openshift/gi,
          /firebase/gi,
          /mcp[ -]server/gi,
          /fastmcp/gi,
          /@modelcontextprotocol/gi,
          /uvx/gi,
          /ansible/gi,
        ];

        for (const pattern of techPatterns) {
          const matches = content.match(pattern);
          if (matches) {
            deploymentContext.technologies.add(matches[0].toLowerCase());
          }
        }

        // Extract requirements
        if (content.includes('Requirements') || content.includes('Constraints')) {
          const lines = content.split('\n');
          for (const line of lines) {
            if (line.includes('must') || line.includes('should') || line.includes('shall')) {
              deploymentContext.requirements.add(line.trim());
            }
          }
        }
      }

      return {
        technologies: Array.from(deploymentContext.technologies),
        platforms: Array.from(deploymentContext.platforms),
        requirements: Array.from(deploymentContext.requirements),
        constraints: Array.from(deploymentContext.constraints),
        totalAdrs: adrs.adrs.length,
      };
    } catch (error) {
      this.logger.warn(
        'Failed to analyze ADR context',
        'DynamicDeploymentIntelligence',
        error as Error
      );
      return { technologies: [], platforms: [], requirements: [], constraints: [] };
    }
  }

  /**
   * Query memory system for learned deployment patterns
   */
  private async queryLearnedDeploymentPatterns(
    platforms: string[],
    _adrContext: any
  ): Promise<DynamicDeploymentPlan | null> {
    try {
      const result = await this.memory.queryEntities({
        entityTypes: ['knowledge_artifact'],
        limit: 5,
      });

      // Find most similar deployment pattern
      for (const entity of result.entities) {
        // Only process knowledge artifacts that are deployment patterns
        if (entity.type !== 'knowledge_artifact') continue;

        try {
          const plan = JSON.parse(entity.artifactData.content) as DynamicDeploymentPlan;

          // Check if platforms match
          const platformMatch = platforms.some(p => plan.detectedPlatforms?.includes(p));

          if (platformMatch && plan.confidence > 0.8) {
            this.logger.info('Found matching learned pattern', 'DynamicDeploymentIntelligence', {
              patternId: entity.id,
              confidence: plan.confidence,
            });

            return plan;
          }
        } catch {
          // Skip entities that don't contain valid deployment plans
          continue;
        }
      }

      return null;
    } catch (error) {
      this.logger.warn(
        'Failed to query learned patterns',
        'DynamicDeploymentIntelligence',
        error as Error
      );
      return null;
    }
  }

  /**
   * Research current best practices from live documentation
   */
  private async researchCurrentDeploymentBestPractices(
    platforms: string[],
    _adrContext: any
  ): Promise<any> {
    const researchResults: any = {};

    for (const platform of platforms) {
      try {
        // Research current best practices for this platform
        const result = await this.research.answerResearchQuestion(
          `What are the current ${platform} deployment best practices and requirements in 2025? Include required files, configuration, and validation steps.`
        );

        researchResults[platform] = {
          answer: result.answer,
          confidence: result.confidence,
          sources: result.sources,
        };

        this.logger.info(`Researched ${platform} best practices`, 'DynamicDeploymentIntelligence', {
          confidence: result.confidence,
        });
      } catch (error) {
        this.logger.warn(
          `Failed to research ${platform}`,
          'DynamicDeploymentIntelligence',
          error as Error
        );
      }
    }

    return researchResults;
  }

  /**
   * Generate AI-powered deployment plan by synthesizing all inputs
   */
  private async generateAIPoweredDeploymentPlan(
    platforms: string[],
    adrContext: any,
    researchResults: any
  ): Promise<DynamicDeploymentPlan> {
    const prompt = `You are an expert DevOps architect. Generate a comprehensive deployment plan.

**Available Platforms**: ${platforms.join(', ')}
**Project Technologies**: ${adrContext.technologies.join(', ')}
**ADR Requirements**: ${JSON.stringify(adrContext.requirements, null, 2)}

**Latest Research**:
${JSON.stringify(researchResults, null, 2)}

Generate a detailed deployment plan in JSON format with:
1. detectedPlatforms: array of detected platforms
2. recommendedPlatform: best platform choice with explanation
3. confidence: 0-1 confidence score
4. requiredFiles: array of files needed (path, purpose, required, isSecret, canAutoGenerate, templateContent, validationCommand, currentBestPractice, lastUpdated)
5. environmentVariables: array of env vars (name, purpose, required, isSecret, defaultValue, validationPattern)
6. deploymentSteps: ordered array of steps (order, title, command, description, expectedOutput, troubleshooting, estimatedTime)
7. validationChecks: array of checks (name, command, expectedResult, severity)
8. architectureDiagram: Mermaid diagram showing deployment flow
9. risks: array of deployment risks (risk, severity, mitigation, likelihood)
10. estimatedDuration: total time estimate
11. prerequisites: array of things needed before deployment

Focus on ${platforms[0] || 'docker'} as the primary platform.
Include current 2025 best practices from the research.
Make file paths and commands specific and actionable.
Include complete template content for generated files.`;

    try {
      const aiExecutor = getAIExecutor();
      const result = await aiExecutor.executePrompt(prompt, {
        temperature: 0.3,
        maxTokens: 4000,
      });

      const plan = JSON.parse(result.content);

      return {
        ...plan,
        source: 'ai-research' as const,
        researchSources: Object.keys(researchResults),
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      this.logger.error(
        'Failed to generate AI deployment plan, using fallback',
        'DynamicDeploymentIntelligence',
        error as Error
      );
      return this.generateFallbackPlan(platforms, adrContext);
    }
  }

  /**
   * Store successful deployment pattern in memory for learning
   */
  private async storeDeploymentPattern(plan: DynamicDeploymentPlan): Promise<void> {
    try {
      await this.memory.upsertEntity({
        type: 'knowledge_artifact',
        title: `Deployment Pattern: ${plan.recommendedPlatform}`,
        description: `Deployment plan for ${plan.detectedPlatforms.join(', ')} platforms with ${plan.confidence} confidence`,
        artifactData: {
          artifactType: 'pattern' as const,
          content: JSON.stringify(plan, null, 2),
          format: 'json' as const,
          sourceReliability: plan.confidence,
          applicabilityScope: plan.detectedPlatforms,
          lastValidated: plan.timestamp,
          keyInsights: [
            `Recommended platform: ${plan.recommendedPlatform}`,
            `Confidence: ${plan.confidence}`,
            `Required files: ${plan.requiredFiles.length}`,
            `Deployment steps: ${plan.deploymentSteps.length}`,
          ],
          actionableItems: plan.deploymentSteps.slice(0, 5).map((step, index) => ({
            action: step.title,
            priority: index < 2 ? ('high' as const) : ('medium' as const),
            timeframe: step.estimatedTime,
            dependencies: [],
          })),
        },
      });

      this.logger.info('Stored deployment pattern in memory', 'DynamicDeploymentIntelligence');
    } catch (error) {
      this.logger.warn(
        'Failed to store deployment pattern',
        'DynamicDeploymentIntelligence',
        error as Error
      );
    }
  }

  /**
   * Enhance learned pattern with latest information
   */
  private async enhanceLearnedPattern(
    learnedPattern: DynamicDeploymentPlan
  ): Promise<DynamicDeploymentPlan> {
    // Update timestamp and source
    return {
      ...learnedPattern,
      source: 'memory-pattern' as const,
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Generate fallback plan using static templates when AI fails
   */
  private generateFallbackPlan(platforms: string[], _adrContext: any): DynamicDeploymentPlan {
    this.logger.warn('Using fallback deployment plan', 'DynamicDeploymentIntelligence');

    const primaryPlatform = platforms[0] || 'docker';
    const staticTemplate = DEPLOYMENT_TYPES.find(t => t.id === primaryPlatform);

    // If no template found, return minimal plan
    if (!staticTemplate) {
      return {
        detectedPlatforms: platforms,
        recommendedPlatform: primaryPlatform,
        confidence: 0.3,
        requiredFiles: [],
        environmentVariables: [],
        deploymentSteps: [],
        validationChecks: [],
        architectureDiagram: `graph TD\n  A[Source Code] --> B[Build]\n  B --> C[Deploy]\n  C --> D[Validate]`,
        risks: [
          {
            risk: 'No template available for detected platform',
            severity: 'high' as const,
            mitigation: 'Manual configuration required',
            likelihood: 'high',
          },
        ],
        estimatedDuration: 'Unknown',
        prerequisites: ['Platform-specific setup'],
        source: 'fallback-template' as const,
        researchSources: [],
        timestamp: new Date().toISOString(),
      };
    }

    return {
      detectedPlatforms: platforms,
      recommendedPlatform: primaryPlatform,
      confidence: 0.5,
      requiredFiles: staticTemplate.requiredFiles.map(f => {
        const fileReq: DeploymentFileRequirement = {
          path: f.path,
          purpose: f.description,
          required: f.required,
          isSecret: f.isSecret,
          canAutoGenerate: f.canAutoGenerate,
          currentBestPractice: 'Using fallback template - update recommended',
          lastUpdated: new Date().toISOString(),
        };

        // Only add optional properties if they have values
        if (f.templateContent) {
          fileReq.templateContent = f.templateContent;
        }
        if (f.validationRules?.[0]) {
          fileReq.validationCommand = f.validationRules[0];
        }

        return fileReq;
      }),
      environmentVariables: staticTemplate.environmentVariables.map(e => ({
        name: e.name,
        purpose: e.description,
        required: e.required,
        isSecret: e.isSecret,
      })),
      deploymentSteps: staticTemplate.deploymentCommands.map((cmd, i) => ({
        order: i + 1,
        title: `Step ${i + 1}`,
        command: cmd,
        description: `Execute ${cmd}`,
        expectedOutput: 'Success',
        troubleshooting: ['Check logs', 'Verify prerequisites'],
        estimatedTime: '5 minutes',
      })),
      validationChecks: staticTemplate.validationCommands.map(cmd => ({
        name: `Validate ${cmd}`,
        command: cmd,
        expectedResult: 'No errors',
        severity: 'error' as const,
      })),
      architectureDiagram: `graph TD\n  A[Source Code] --> B[Build]\n  B --> C[Deploy]\n  C --> D[Validate]`,
      risks: [
        {
          risk: 'Using fallback template - may be outdated',
          severity: 'medium' as const,
          mitigation: 'Update to AI-generated plan when possible',
          likelihood: 'high',
        },
      ],
      estimatedDuration: '30-60 minutes',
      prerequisites: ['Platform tools installed', 'Credentials configured'],
      source: 'fallback-template' as const,
      researchSources: [],
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Update a deployment plan with post-execution learnings
   */
  async updatePlanWithLearnings(
    plan: DynamicDeploymentPlan,
    executionResult: any,
    _learnings: any[]
  ): Promise<DynamicDeploymentPlan> {
    const updatedPlan = { ...plan };

    // Increase confidence if deployment was successful
    if (executionResult.success) {
      updatedPlan.confidence = Math.min(1.0, updatedPlan.confidence + 0.1);
    } else {
      updatedPlan.confidence = Math.max(0.3, updatedPlan.confidence - 0.1);
    }

    // Store updated pattern
    await this.storeDeploymentPattern(updatedPlan);

    return updatedPlan;
  }
}
