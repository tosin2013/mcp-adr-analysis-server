/**
 * MCP Tool for content masking and sensitive information detection
 * Implements prompt-driven security analysis
 * Enhanced with Generated Knowledge Prompting (GKP) for security and privacy expertise
 * Now includes memory integration for security pattern learning and institutional knowledge building
 */

import { McpAdrError } from '../types/index.js';
import { MemoryEntityManager } from '../utils/memory-entity-manager.js';
import { EnhancedLogger } from '../utils/enhanced-logging.js';
import { TreeSitterAnalyzer } from '../utils/tree-sitter-analyzer.js';

/**
 * Security Memory Manager for tracking security patterns and masking effectiveness
 */
class SecurityMemoryManager {
  private memoryManager: MemoryEntityManager;
  private logger: EnhancedLogger;

  constructor() {
    this.memoryManager = new MemoryEntityManager();
    this.logger = new EnhancedLogger();
  }

  async initialize(): Promise<void> {
    await this.memoryManager.initialize();
  }

  /**
   * Store security pattern detection results as memory entity
   */
  async storeSecurityPattern(
    contentType: string,
    detectedPatterns: any[],
    maskingResults: any,
    analysisMetadata?: any
  ): Promise<string> {
    try {
      const securityData = {
        contentType: contentType as 'code' | 'documentation' | 'configuration' | 'logs' | 'general',
        detectedPatterns: detectedPatterns.map(pattern => ({
          patternType: pattern.type || 'unknown',
          severity: pattern.severity as 'low' | 'medium' | 'high' | 'critical',
          description: pattern.description || 'Detected sensitive pattern',
          location: pattern.context || undefined,
          recommendation: `Review and mask ${pattern.type || 'unknown'} patterns`,
        })),
        maskingResults: {
          effectiveness: maskingResults?.securityScore || 0.8,
          method: maskingResults?.strategy || 'analysis-only',
          preservedUtility: maskingResults?.preservedContext || 0.7,
          falsePositives: 0, // Simplified - could be enhanced with actual analysis
          falseNegatives: 0, // Simplified - could be enhanced with actual analysis
        },
        riskAssessment: {
          overallRisk: calculateOverallRisk(detectedPatterns) as
            | 'low'
            | 'medium'
            | 'high'
            | 'critical',
          specificRisks: detectedPatterns.map(p => `${p.type || 'unknown'} exposure risk`),
          mitigationStrategies: [
            'Implement content masking',
            'Review data handling policies',
            'Enhance detection patterns',
            'Train team on security awareness',
          ],
          complianceImpact: assessComplianceImpact(detectedPatterns),
        },
        evolutionTracking: {
          patternChanges: [
            {
              timestamp: new Date().toISOString(),
              change: `Initial detection of ${detectedPatterns.length} patterns`,
              impact: `Security analysis baseline established`,
            },
          ],
          effectivenessHistory: [
            {
              timestamp: new Date().toISOString(),
              effectiveness: maskingResults?.securityScore || 0.8,
              method: maskingResults?.strategy || 'analysis-only',
            },
          ],
        },
      };

      const entity = await this.memoryManager.upsertEntity({
        type: 'security_pattern',
        title: `Security Pattern Analysis: ${contentType} - ${detectedPatterns.length} patterns detected`,
        description: `Security analysis for ${contentType} content with ${detectedPatterns.length} sensitive patterns detected and masking effectiveness of ${Math.round((maskingResults?.securityScore || 0.8) * 100)}%`,
        tags: [
          'security',
          'content-masking',
          contentType.toLowerCase(),
          `patterns-${detectedPatterns.length}`,
          `confidence-${this.getConfidenceCategory(detectedPatterns)}`,
          `security-score-${Math.floor((maskingResults?.securityScore || 0.8) * 10) * 10}`,
          ...(detectedPatterns.some(p => p.severity === 'critical') ? ['critical-patterns'] : []),
          ...(detectedPatterns.length > 10 ? ['high-volume'] : []),
        ],
        securityData,
        relationships: [],
        context: {
          projectPhase: 'security-analysis',
          technicalStack: this.extractTechnicalStack(contentType, analysisMetadata),
          environmentalFactors: [contentType, analysisMetadata?.environment || 'unknown'].filter(
            Boolean
          ),
          stakeholders: ['security-team', 'development-team', 'compliance-team'],
        },
        accessPattern: {
          lastAccessed: new Date().toISOString(),
          accessCount: 1,
          accessContext: ['security-analysis'],
        },
        evolution: {
          origin: 'created',
          transformations: [
            {
              timestamp: new Date().toISOString(),
              type: 'security_analysis',
              description: `Security pattern analysis completed for ${contentType} content`,
              agent: 'content-masking-tool',
            },
          ],
        },
        validation: {
          isVerified: maskingResults?.securityScore > 0.7,
          verificationMethod: 'automated-security-analysis',
          verificationTimestamp: new Date().toISOString(),
        },
      });

      this.logger.info(`Security pattern stored for ${contentType}`, 'SecurityMemoryManager', {
        contentType,
        entityId: entity.id,
        patternsDetected: detectedPatterns.length,
        securityScore: maskingResults?.securityScore,
        criticalPatterns: detectedPatterns.filter(p => p.severity === 'critical').length,
      });

      return entity.id;
    } catch (error) {
      this.logger.error(
        'Failed to store security pattern',
        'SecurityMemoryManager',
        error as Error
      );
      throw error;
    }
  }

  /**
   * Track masking evolution and effectiveness over time
   */
  async trackMaskingEvolution(
    previousPatternId?: string,
    currentResults?: any
  ): Promise<{
    improvements: string[];
    degradations: string[];
    recommendations: string[];
  }> {
    try {
      if (!previousPatternId || !currentResults) {
        return {
          improvements: [],
          degradations: [],
          recommendations: ['No previous patterns to compare with - establishing baseline'],
        };
      }

      // Get recent security patterns for comparison
      const recentPatterns = await this.memoryManager.queryEntities({
        entityTypes: ['security_pattern'],
        limit: 10,
        sortBy: 'lastModified',
      });

      if (recentPatterns.entities.length === 0) {
        return {
          improvements: [],
          degradations: [],
          recommendations: ['No historical patterns found - establishing baseline'],
        };
      }

      const analysis = this.compareSecurityPatterns(recentPatterns.entities, currentResults);

      return {
        improvements: analysis.improvements,
        degradations: analysis.degradations,
        recommendations: analysis.recommendations,
      };
    } catch (error) {
      this.logger.error(
        'Failed to track masking evolution',
        'SecurityMemoryManager',
        error as Error
      );
      return {
        improvements: [],
        degradations: [],
        recommendations: ['Evolution tracking failed - continuing with current analysis'],
      };
    }
  }

  /**
   * Analyze security patterns across all stored entities
   */
  async analyzeInstitutionalSecurity(): Promise<{
    commonPatterns: any[];
    emergingThreats: any[];
    effectivenessMetrics: any;
    complianceStatus: any;
    recommendations: string[];
  }> {
    try {
      const allPatterns = await this.memoryManager.queryEntities({
        entityTypes: ['security_pattern'],
        limit: 100,
        sortBy: 'lastModified',
      });

      if (allPatterns.entities.length === 0) {
        return {
          commonPatterns: [],
          emergingThreats: [],
          effectivenessMetrics: { overallScore: 0, totalAnalyses: 0 },
          complianceStatus: { gdpr: 'unknown', hipaa: 'unknown', pci: 'unknown' },
          recommendations: [
            'No security patterns in memory - start analyzing content to build knowledge',
          ],
        };
      }

      return this.performInstitutionalAnalysis(allPatterns.entities);
    } catch (error) {
      this.logger.error(
        'Failed to analyze institutional security',
        'SecurityMemoryManager',
        error as Error
      );
      return {
        commonPatterns: [],
        emergingThreats: [],
        effectivenessMetrics: { overallScore: 0, totalAnalyses: 0 },
        complianceStatus: { gdpr: 'unknown', hipaa: 'unknown', pci: 'unknown' },
        recommendations: ['Security analysis failed - review system configuration'],
      };
    }
  }

  // Private helper methods

  private getConfidenceCategory(detectedPatterns: any[]): string {
    const avgConfidence =
      detectedPatterns.reduce((sum, p) => sum + (p.confidence || 0.5), 0) / detectedPatterns.length;

    if (avgConfidence >= 0.9) return 'high';
    if (avgConfidence >= 0.7) return 'medium';
    return 'low';
  }

  private extractTechnicalStack(contentType: string, metadata?: any): string[] {
    const stack = [contentType];

    if (metadata?.language) stack.push(metadata.language);
    if (metadata?.framework) stack.push(metadata.framework);
    if (metadata?.environment) stack.push(metadata.environment);

    return stack;
  }

  private compareSecurityPatterns(historicalPatterns: any[], currentResults: any): any {
    // Simplified comparison - could be enhanced with more sophisticated analysis
    const improvements = [];
    const degradations = [];
    const recommendations = [];

    if (historicalPatterns.length > 0) {
      const lastPattern = historicalPatterns[0] as any;
      const lastScore = lastPattern.securityData?.maskingEffectiveness?.securityScore || 0;
      const currentScore = currentResults?.securityScore || 0;

      if (currentScore > lastScore) {
        improvements.push(
          `Security score improved from ${(lastScore * 100).toFixed(1)}% to ${(currentScore * 100).toFixed(1)}%`
        );
      } else if (currentScore < lastScore) {
        degradations.push(
          `Security score decreased from ${(lastScore * 100).toFixed(1)}% to ${(currentScore * 100).toFixed(1)}%`
        );
      }

      recommendations.push('Continue monitoring security patterns for trends');
    }

    return { improvements, degradations, recommendations };
  }

  private performInstitutionalAnalysis(patterns: any[]): any {
    // Simplified institutional analysis
    const totalPatterns = patterns.length;
    const avgScore =
      patterns.reduce(
        (sum: number, p: any) => sum + (p.securityData?.maskingEffectiveness?.securityScore || 0),
        0
      ) / totalPatterns;

    return {
      commonPatterns: this.extractCommonPatterns(patterns),
      emergingThreats: this.identifyEmergingThreats(patterns),
      effectivenessMetrics: {
        overallScore: avgScore,
        totalAnalyses: totalPatterns,
        averageConfidence: 0.8, // Simplified
      },
      complianceStatus: {
        gdpr: avgScore > 0.8 ? 'likely-compliant' : 'needs-review',
        hipaa: avgScore > 0.9 ? 'likely-compliant' : 'needs-review',
        pci: avgScore > 0.95 ? 'likely-compliant' : 'needs-review',
      },
      recommendations: [
        'Continue building security knowledge through regular content analysis',
        'Monitor emerging threat patterns',
        'Maintain high masking effectiveness standards',
      ],
    };
  }

  private extractCommonPatterns(patterns: any[]): any[] {
    // Extract most frequently occurring pattern types
    const patternCounts: Record<string, number> = {};

    patterns.forEach((p: any) => {
      const detectedPatterns = p.securityData?.patternAnalysis?.detectedPatterns || [];
      detectedPatterns.forEach((dp: any) => {
        patternCounts[dp.type] = (patternCounts[dp.type] || 0) + 1;
      });
    });

    return Object.entries(patternCounts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)
      .map(([type, count]) => ({ type, frequency: count }));
  }

  private identifyEmergingThreats(patterns: any[]): any[] {
    // Identify patterns that are appearing more frequently in recent analyses
    const recentPatterns = patterns.slice(0, Math.min(10, patterns.length));
    const threats = [];

    // This is a simplified implementation
    if (recentPatterns.length > 0) {
      threats.push({
        type: 'increasing-pattern-complexity',
        description: 'Pattern detection complexity may be increasing',
        trend: 'emerging',
      });
    }

    return threats;
  }
}

/**
 * Analyze content for sensitive information
 * Enhanced with Generated Knowledge Prompting for security and privacy expertise
 */
export async function analyzeContentSecurity(args: {
  content: string;
  contentType?: 'code' | 'documentation' | 'configuration' | 'logs' | 'general';
  userDefinedPatterns?: string[];
  knowledgeEnhancement?: boolean; // Enable GKP for security and privacy knowledge
  enhancedMode?: boolean; // Enable advanced prompting features
  enableMemoryIntegration?: boolean; // Enable memory entity storage
  enableTreeSitterAnalysis?: boolean; // Enable tree-sitter for enhanced code analysis
}): Promise<any> {
  const {
    content,
    contentType = 'general',
    userDefinedPatterns,
    knowledgeEnhancement = true, // Default to GKP enabled
    enhancedMode = true, // Default to enhanced mode
    enableMemoryIntegration = true, // Default to memory integration enabled
    enableTreeSitterAnalysis = true, // Default to tree-sitter enabled
  } = args;

  try {
    const { analyzeSensitiveContent } = await import('../utils/content-masking.js');

    if (!content || content.trim().length === 0) {
      throw new McpAdrError('Content is required for security analysis', 'INVALID_INPUT');
    }

    // Initialize memory manager if enabled
    let securityMemoryManager: SecurityMemoryManager | null = null;
    if (enableMemoryIntegration) {
      securityMemoryManager = new SecurityMemoryManager();
      await securityMemoryManager.initialize();
    }

    // Perform tree-sitter analysis for enhanced security detection
    const treeSitterFindings: any[] = [];
    let treeSitterContext = '';
    if (enableTreeSitterAnalysis && contentType === 'code') {
      try {
        const analyzer = new TreeSitterAnalyzer();

        // Create a temporary file to analyze the content
        const { writeFileSync, unlinkSync } = await import('fs');
        const { join } = await import('path');
        const { tmpdir } = await import('os');

        // Determine file extension based on content patterns
        let extension = '.txt';
        if (
          content.includes('import ') ||
          content.includes('export ') ||
          content.includes('function ')
        ) {
          extension =
            content.includes('interface ') || content.includes(': string') ? '.ts' : '.js';
        } else if (content.includes('def ') || content.includes('import ')) {
          extension = '.py';
        } else if (content.includes('apiVersion:') || content.includes('kind:')) {
          extension = '.yaml';
        } else if (content.includes('resource ') || content.includes('provider ')) {
          extension = '.tf';
        }

        const tempFile = join(tmpdir(), `content-analysis-${Date.now()}${extension}`);
        writeFileSync(tempFile, content);

        try {
          const analysis = await analyzer.analyzeFile(tempFile);

          // Extract security-relevant findings
          if (analysis.hasSecrets && analysis.secrets.length > 0) {
            analysis.secrets.forEach(secret => {
              treeSitterFindings.push({
                type: 'secret',
                category: secret.type,
                content: secret.value,
                confidence: secret.confidence,
                severity:
                  secret.confidence > 0.8 ? 'high' : secret.confidence > 0.6 ? 'medium' : 'low',
                location: secret.location,
                context: secret.context,
                source: 'tree-sitter',
              });
            });
          }

          // Security issues
          if (analysis.securityIssues && analysis.securityIssues.length > 0) {
            analysis.securityIssues.forEach(issue => {
              treeSitterFindings.push({
                type: 'security_issue',
                category: issue.type,
                content: issue.message,
                confidence: 0.9,
                severity: issue.severity,
                location: issue.location,
                context: issue.suggestion,
                source: 'tree-sitter',
              });
            });
          }

          // Dangerous imports
          if (analysis.imports) {
            analysis.imports.forEach(imp => {
              if (imp.isDangerous) {
                treeSitterFindings.push({
                  type: 'dangerous_import',
                  category: 'import',
                  content: imp.module,
                  confidence: 0.8,
                  severity: 'medium',
                  location: imp.location,
                  context: imp.reason || 'Potentially dangerous import detected',
                  source: 'tree-sitter',
                });
              }
            });
          }

          if (treeSitterFindings.length > 0) {
            treeSitterContext = `\n## 🔍 Tree-sitter Enhanced Analysis\n\n**Detected ${treeSitterFindings.length} security findings:**\n${treeSitterFindings.map(f => `- **${f.type}**: ${f.content} (${f.severity} confidence)`).join('\n')}\n\n---\n`;
          }
        } finally {
          // Clean up temp file
          try {
            unlinkSync(tempFile);
          } catch (error) {
            // Ignore cleanup errors
          }
        }
      } catch (error) {
        console.warn('Tree-sitter analysis failed, continuing with standard analysis:', error);
      }
    }

    let enhancedPrompt = '';
    let knowledgeContext = '';

    // Generate security and privacy knowledge if enabled
    if (enhancedMode && knowledgeEnhancement) {
      try {
        const { generateArchitecturalKnowledge } = await import('../utils/knowledge-generation.js');
        const knowledgeResult = await generateArchitecturalKnowledge(
          {
            projectPath: process.cwd(),
            technologies: [],
            patterns: [],
            projectType: 'security-content-analysis',
          },
          {
            domains: ['security-patterns'],
            depth: 'intermediate',
            cacheEnabled: true,
          }
        );

        knowledgeContext = `\n## Security & Privacy Knowledge Enhancement\n\n${knowledgeResult.prompt}\n\n---\n`;
      } catch (error) {
        console.error(
          '[WARNING] GKP knowledge generation failed for content security analysis:',
          error
        );
        knowledgeContext = '<!-- Security knowledge generation unavailable -->\n';
      }
    }

    const result = await analyzeSensitiveContent(content, contentType, userDefinedPatterns);
    enhancedPrompt = knowledgeContext + result.analysisPrompt;

    // Execute the security analysis with AI if enabled, otherwise return prompt
    const { executePromptWithFallback, formatMCPResponse } = await import(
      '../utils/prompt-execution.js'
    );
    const executionResult = await executePromptWithFallback(enhancedPrompt, result.instructions, {
      temperature: 0.1,
      maxTokens: 4000,
      systemPrompt: `You are a cybersecurity expert specializing in sensitive information detection.
Analyze the provided content to identify potential security risks, secrets, and sensitive data.
Leverage the provided cybersecurity and data privacy knowledge to create comprehensive, industry-standard analysis.
Provide detailed findings with confidence scores and practical remediation recommendations.
Consider regulatory compliance requirements, data classification standards, and modern security practices.
Focus on actionable security insights that can prevent data exposure and ensure compliance.`,
      responseFormat: 'text',
    });

    if (executionResult.isAIGenerated) {
      // Memory integration: store security patterns and analysis results
      let memoryIntegrationInfo = '';
      if (securityMemoryManager) {
        try {
          // Extract patterns from AI analysis (simplified parsing)
          const detectedPatterns = parseDetectedPatterns(
            executionResult.content,
            userDefinedPatterns
          );
          const maskingResults = {
            strategy: 'analysis-only',
            securityScore: calculateSecurityScore(detectedPatterns, content),
            successRate: 1.0,
            preservedContext: 1.0, // Analysis doesn't mask, so context is preserved
            complianceLevel: 'analysis-complete',
          };

          // Store security pattern
          const patternId = await securityMemoryManager.storeSecurityPattern(
            contentType,
            detectedPatterns,
            maskingResults,
            {
              contentLength: content.length,
              method: 'ai-powered-analysis',
              userDefinedPatterns: userDefinedPatterns?.length || 0,
            }
          );

          // Track evolution
          const evolution = await securityMemoryManager.trackMaskingEvolution(
            undefined,
            maskingResults
          );

          // Get institutional insights
          const institutionalAnalysis = await securityMemoryManager.analyzeInstitutionalSecurity();

          memoryIntegrationInfo = `

## 🧠 Security Memory Integration

- **Pattern Stored**: ✅ Security analysis saved (ID: ${patternId.substring(0, 8)}...)
- **Content Type**: ${contentType}
- **Patterns Detected**: ${detectedPatterns.length}
- **Security Score**: ${Math.round(maskingResults.securityScore * 100)}%

${
  evolution.improvements.length > 0
    ? `### Security Improvements
${evolution.improvements.map(improvement => `- ${improvement}`).join('\n')}
`
    : ''
}

${
  evolution.recommendations.length > 0
    ? `### Evolution Recommendations
${evolution.recommendations.map(rec => `- ${rec}`).join('\n')}
`
    : ''
}

${
  institutionalAnalysis.commonPatterns.length > 0
    ? `### Institutional Security Patterns
${institutionalAnalysis.commonPatterns
  .slice(0, 3)
  .map(pattern => `- **${pattern.type}**: ${pattern.frequency} occurrences`)
  .join('\n')}
`
    : ''
}

${
  institutionalAnalysis.complianceStatus
    ? `### Compliance Status
- **GDPR**: ${institutionalAnalysis.complianceStatus.gdpr}
- **HIPAA**: ${institutionalAnalysis.complianceStatus.hipaa}
- **PCI**: ${institutionalAnalysis.complianceStatus.pci}
`
    : ''
}

${
  institutionalAnalysis.recommendations.length > 0
    ? `### Security Recommendations
${institutionalAnalysis.recommendations
  .slice(0, 3)
  .map(rec => `- ${rec}`)
  .join('\n')}
`
    : ''
}
`;
        } catch (memoryError) {
          memoryIntegrationInfo = `

## 🧠 Security Memory Integration Status

- **Status**: ⚠️ Memory integration failed - analysis completed without persistence
- **Error**: ${memoryError instanceof Error ? memoryError.message : 'Unknown error'}
`;
        }
      }

      // AI execution successful - return actual security analysis results
      return formatMCPResponse({
        ...executionResult,
        content: `# Content Security Analysis Results (GKP Enhanced)

## Enhancement Features
- **Generated Knowledge Prompting**: ${knowledgeEnhancement ? '✅ Enabled' : '❌ Disabled'}
- **Enhanced Mode**: ${enhancedMode ? '✅ Enabled' : '❌ Disabled'}
- **Memory Integration**: ${enableMemoryIntegration ? '✅ Enabled' : '❌ Disabled'}
- **Tree-sitter Analysis**: ${enableTreeSitterAnalysis ? '✅ Enabled' : '❌ Disabled'}
- **Knowledge Domains**: Cybersecurity, data privacy, regulatory compliance, secret management

## Analysis Information
- **Content Type**: ${contentType}

${
  knowledgeContext
    ? `## Applied Security Knowledge

${knowledgeContext}
`
    : ''
}
${treeSitterContext}
- **Content Length**: ${content.length} characters
- **User-Defined Patterns**: ${userDefinedPatterns?.length || 0} patterns

## AI Security Analysis

${executionResult.content}

${memoryIntegrationInfo}

## Next Steps

Based on the security analysis:

1. **Review Identified Issues**: Examine each flagged item for actual sensitivity
2. **Apply Recommended Masking**: Use suggested masking strategies for sensitive content
3. **Update Security Policies**: Incorporate findings into security guidelines
4. **Implement Monitoring**: Set up detection for similar patterns in the future
5. **Train Team**: Share findings to improve security awareness

## Remediation Commands

To apply masking to identified sensitive content, use the \`generate_content_masking\` tool with the detected items.
`,
      });
    } else {
      // Fallback to prompt-only mode
      return {
        content: [
          {
            type: 'text',
            text: `# Sensitive Content Analysis (GKP Enhanced)\n\n## Enhancement Status\n- **Generated Knowledge Prompting**: ${knowledgeEnhancement ? '\u2705 Applied' : '\u274c Disabled'}\n- **Enhanced Mode**: ${enhancedMode ? '\u2705 Applied' : '\u274c Disabled'}\n\n${knowledgeContext ? `## Security Knowledge Context\n\n${knowledgeContext}\n` : ''}\n\n${result.instructions}\n\n## Enhanced AI Analysis Prompt\n\n${enhancedPrompt}`,
          },
        ],
      };
    }
  } catch (error) {
    throw new McpAdrError(
      `Failed to analyze content security: ${error instanceof Error ? error.message : String(error)}`,
      'ANALYSIS_ERROR'
    );
  }
}

/**
 * Generate masking instructions for detected sensitive content
 * Enhanced with Generated Knowledge Prompting for security and privacy expertise
 */
export async function generateContentMasking(args: {
  content: string;
  detectedItems: Array<{
    type: string;
    category?: string;
    content: string;
    startPosition: number;
    endPosition: number;
    confidence?: number;
    reasoning?: string;
    severity: string;
    suggestedMask?: string;
  }>;
  maskingStrategy?: 'full' | 'partial' | 'placeholder' | 'environment';
  knowledgeEnhancement?: boolean; // Enable GKP for security and privacy knowledge
  enhancedMode?: boolean; // Enable advanced prompting features
  enableMemoryIntegration?: boolean; // Enable memory entity storage
  contentType?: 'code' | 'documentation' | 'configuration' | 'logs' | 'general';
}): Promise<any> {
  const {
    content,
    detectedItems,
    maskingStrategy = 'full',
    // enableMemoryIntegration and contentType can be used for future enhancements
  } = args;

  try {
    const { generateMaskingInstructions } = await import('../utils/content-masking.js');

    if (!content || content.trim().length === 0) {
      throw new McpAdrError('Content is required for masking', 'INVALID_INPUT');
    }

    if (!detectedItems || detectedItems.length === 0) {
      return {
        content: [
          {
            type: 'text',
            text: 'No sensitive items detected. Content does not require masking.',
          },
        ],
      };
    }

    // Convert to SensitiveItem format
    const sensitiveItems = detectedItems.map(item => ({
      type: item.type,
      category: item.category || 'unknown',
      content: item.content,
      startPosition: item.startPosition,
      endPosition: item.endPosition,
      confidence: item.confidence || 0.8,
      reasoning: item.reasoning || 'Detected by user input',
      severity: item.severity as 'low' | 'medium' | 'high' | 'critical',
      suggestedMask: item.suggestedMask || '[REDACTED]',
    }));

    const result = await generateMaskingInstructions(content, sensitiveItems, maskingStrategy);

    // Execute the content masking with AI if enabled, otherwise return prompt
    const { executePromptWithFallback, formatMCPResponse } = await import(
      '../utils/prompt-execution.js'
    );
    const executionResult = await executePromptWithFallback(
      result.maskingPrompt,
      result.instructions,
      {
        temperature: 0.1,
        maxTokens: 4000,
        systemPrompt: `You are a cybersecurity expert specializing in intelligent content masking.
Apply appropriate masking to sensitive content while preserving functionality and readability.
Focus on balancing security with usability, maintaining context where possible.
Provide detailed explanations for masking decisions and security recommendations.`,
        responseFormat: 'text',
      }
    );

    if (executionResult.isAIGenerated) {
      // AI execution successful - return actual content masking results
      return formatMCPResponse({
        ...executionResult,
        content: `# Content Masking Results

## Masking Information
- **Content Length**: ${content.length} characters
- **Detected Items**: ${detectedItems.length} sensitive items
- **Masking Strategy**: ${maskingStrategy}

## AI Content Masking Results

${executionResult.content}

## Next Steps

Based on the masking results:

1. **Review Masked Content**: Examine the masked content for accuracy and completeness
2. **Validate Functionality**: Ensure masked content still functions as intended
3. **Apply to Production**: Use the masked content in documentation or sharing
4. **Update Security Policies**: Incorporate findings into security guidelines
5. **Monitor for Similar Patterns**: Set up detection for similar sensitive content

## Security Benefits

The applied masking provides:
- **Data Protection**: Sensitive information is properly redacted
- **Context Preservation**: Enough context remains for understanding
- **Consistent Approach**: Uniform masking patterns across content
- **Compliance Support**: Helps meet data protection requirements
- **Usability Balance**: Security without sacrificing functionality
`,
      });
    } else {
      // Fallback to prompt-only mode
      return {
        content: [
          {
            type: 'text',
            text: `# Content Masking Instructions\n\n${result.instructions}\n\n## AI Masking Prompt\n\n${result.maskingPrompt}`,
          },
        ],
      };
    }
  } catch (error) {
    throw new McpAdrError(
      `Failed to generate masking instructions: ${error instanceof Error ? error.message : String(error)}`,
      'MASKING_ERROR'
    );
  }
}

/**
 * Configure custom sensitive patterns for a project
 */
export async function configureCustomPatterns(args: {
  projectPath: string;
  existingPatterns?: string[];
}): Promise<any> {
  const { projectPath, existingPatterns } = args;

  try {
    // Use actual file operations to scan project structure
    const { scanProjectStructure } = await import('../utils/actual-file-operations.js');

    // Actually scan project structure
    const projectStructure = await scanProjectStructure(projectPath, {
      readContent: true,
      maxFileSize: 10000,
    });

    const customPatternPrompt = `
# Custom Pattern Configuration Generation

Based on actual project structure analysis, here are the findings:

## Project Structure
- **Root Path**: ${projectStructure.rootPath}
- **Total Files**: ${projectStructure.totalFiles}
- **Directories**: ${projectStructure.directories.join(', ')}

## Package Management Files
${
  projectStructure.packageFiles.length > 0
    ? projectStructure.packageFiles
        .map(
          f => `
### ${f.filename}
\`\`\`
${f.content.slice(0, 500)}${f.content.length > 500 ? '\n... (truncated)' : ''}
\`\`\`
`
        )
        .join('\n')
    : '- No package files found'
}

## Environment Configuration Files
${
  projectStructure.environmentFiles.length > 0
    ? projectStructure.environmentFiles
        .map(
          f => `
### ${f.filename}
\`\`\`
${f.content.slice(0, 300)}${f.content.length > 300 ? '\n... (truncated)' : ''}
\`\`\`
`
        )
        .join('\n')
    : '- No environment files found'
}

## Configuration Files
${
  projectStructure.configFiles.length > 0
    ? projectStructure.configFiles
        .map(
          f => `
### ${f.filename}
\`\`\`
${f.content.slice(0, 300)}${f.content.length > 300 ? '\n... (truncated)' : ''}
\`\`\`
`
        )
        .join('\n')
    : '- No config files found'
}

## Script Files
${
  projectStructure.scriptFiles.length > 0
    ? projectStructure.scriptFiles
        .map(
          f => `
### ${f.filename}
\`\`\`
${f.content.slice(0, 400)}${f.content.length > 400 ? '\n... (truncated)' : ''}
\`\`\`
`
        )
        .join('\n')
    : '- No script files found'
}

## Existing Patterns Context

${
  existingPatterns
    ? `
### Current Patterns (${existingPatterns.length})
${existingPatterns
  .map(
    (pattern, index) => `
#### ${index + 1}. ${pattern}
`
  )
  .join('')}
`
    : 'No existing patterns provided.'
}

## Pattern Generation Requirements

1. **Analyze project-specific content types** that need masking based on actual file content
2. **Identify sensitive data patterns** in code and documentation shown above
3. **Generate regex patterns** for consistent content masking
4. **Create appropriate replacements** that maintain context
5. **Ensure patterns don't conflict** with existing ones
6. **Provide clear descriptions** for each pattern

## Required Output Format

Please provide custom pattern configuration in JSON format:
\`\`\`json
{
  "patterns": [
    {
      "name": "pattern-name",
      "pattern": "regex-pattern",
      "replacement": "replacement-text",
      "description": "pattern-description",
      "category": "pattern-category"
    }
  ],
  "recommendations": ["list", "of", "recommendations"],
  "conflicts": ["any", "potential", "conflicts"]
}
\`\`\`
`;

    const instructions = `
# Custom Pattern Configuration Instructions

This analysis provides **actual project file contents** for comprehensive pattern generation.

## Analysis Scope
- **Project Path**: ${projectPath}
- **Package Files**: ${projectStructure.packageFiles.length} found
- **Environment Files**: ${projectStructure.environmentFiles.length} found
- **Config Files**: ${projectStructure.configFiles.length} found
- **Script Files**: ${projectStructure.scriptFiles.length} found
- **Total Files Analyzed**: ${projectStructure.totalFiles}
- **Existing Patterns**: ${existingPatterns?.length || 0} patterns

## Next Steps
1. **Submit the configuration prompt** to an AI agent for pattern analysis
2. **Parse the JSON response** to get custom patterns and recommendations
3. **Review generated patterns** for accuracy and completeness
4. **Implement patterns** in the content masking system

## Expected AI Response Format
The AI will return a JSON object with:
- \`patterns\`: Array of custom pattern configurations
- \`recommendations\`: Best practices and implementation guidance
- \`conflicts\`: Potential conflicts with existing patterns

## Usage Example
\`\`\`typescript
const result = await configureCustomPatterns({ projectPath, existingPatterns });
// Submit result.configurationPrompt to AI agent
// Parse AI response for custom pattern configuration
\`\`\`
`;

    const result = {
      configurationPrompt: customPatternPrompt,
      instructions,
      actualData: {
        projectStructure,
        summary: {
          totalFiles: projectStructure.totalFiles,
          packageFiles: projectStructure.packageFiles.length,
          environmentFiles: projectStructure.environmentFiles.length,
          configFiles: projectStructure.configFiles.length,
          scriptFiles: projectStructure.scriptFiles.length,
        },
      },
    };

    return {
      content: [
        {
          type: 'text',
          text: `# Custom Pattern Configuration\n\n${result.instructions}\n\n## AI Configuration Prompt\n\n${result.configurationPrompt}`,
        },
      ],
    };
  } catch (error) {
    throw new McpAdrError(
      `Failed to configure custom patterns: ${error instanceof Error ? error.message : String(error)}`,
      'CONFIGURATION_ERROR'
    );
  }
}

/**
 * Apply basic masking (fallback when AI is not available)
 */
export async function applyBasicContentMasking(args: {
  content: string;
  maskingStrategy?: 'full' | 'partial' | 'placeholder';
}): Promise<any> {
  const { content, maskingStrategy = 'full' } = args;

  try {
    const { applyBasicMasking, validateMasking } = await import('../utils/content-masking.js');

    if (!content || content.trim().length === 0) {
      throw new McpAdrError('Content is required for masking', 'INVALID_INPUT');
    }

    const maskedContent = applyBasicMasking(content, maskingStrategy);
    const validation = validateMasking(content, maskedContent);

    return {
      content: [
        {
          type: 'text',
          text: `# Basic Content Masking Applied

## Masking Strategy
${maskingStrategy}

## Original Content Length
${content.length} characters

## Masked Content
\`\`\`
${maskedContent}
\`\`\`

## Validation Results
- **Security Score**: ${(validation.securityScore * 100).toFixed(1)}%
- **Is Valid**: ${validation.isValid ? '✅ Yes' : '❌ No'}

${
  validation.issues.length > 0
    ? `## Issues Found
${validation.issues.map(issue => `- ${issue}`).join('\n')}`
    : '## ✅ No Issues Found'
}

## Recommendations
- For better security analysis, use AI-powered detection with \`analyze_content_security\`
- Consider using custom patterns for project-specific sensitive information
- Review masked content to ensure it maintains necessary functionality
`,
        },
      ],
    };
  } catch (error) {
    throw new McpAdrError(
      `Failed to apply basic masking: ${error instanceof Error ? error.message : String(error)}`,
      'MASKING_ERROR'
    );
  }
}

/**
 * Validate that content masking was applied correctly
 */
export async function validateContentMasking(args: {
  originalContent: string;
  maskedContent: string;
}): Promise<any> {
  const { originalContent, maskedContent } = args;

  try {
    const { validateMasking } = await import('../utils/content-masking.js');

    if (!originalContent || !maskedContent) {
      throw new McpAdrError('Both original and masked content are required', 'INVALID_INPUT');
    }

    const validation = validateMasking(originalContent, maskedContent);

    return {
      content: [
        {
          type: 'text',
          text: `# Content Masking Validation

## Validation Results
- **Security Score**: ${(validation.securityScore * 100).toFixed(1)}%
- **Is Valid**: ${validation.isValid ? '✅ Yes' : '❌ No'}

## Content Comparison
- **Original Length**: ${originalContent.length} characters
- **Masked Length**: ${maskedContent.length} characters
- **Size Change**: ${((maskedContent.length / originalContent.length - 1) * 100).toFixed(1)}%

${
  validation.issues.length > 0
    ? `## ⚠️ Issues Found
${validation.issues.map(issue => `- ${issue}`).join('\n')}

## Recommendations
- Review the masking process to address identified issues
- Consider using more comprehensive AI-powered masking
- Ensure all sensitive patterns are properly detected and masked`
    : '## ✅ Validation Passed'
}

## Security Assessment
${
  validation.securityScore >= 0.9
    ? '🟢 **Excellent**: Content appears to be properly masked'
    : validation.securityScore >= 0.7
      ? '🟡 **Good**: Minor issues detected, review recommended'
      : validation.securityScore >= 0.5
        ? '🟠 **Fair**: Several issues found, masking needs improvement'
        : '🔴 **Poor**: Significant security issues, masking failed'
}
`,
        },
      ],
    };
  } catch (error) {
    throw new McpAdrError(
      `Failed to validate masking: ${error instanceof Error ? error.message : String(error)}`,
      'VALIDATION_ERROR'
    );
  }
}

/**
 * Helper methods for SecurityMemoryManager
 */
function calculateOverallRisk(detectedPatterns: any[]): string {
  if (detectedPatterns.length === 0) return 'low';

  const criticalCount = detectedPatterns.filter(p => p.severity === 'critical').length;
  const highCount = detectedPatterns.filter(p => p.severity === 'high').length;

  if (criticalCount > 0) return 'critical';
  if (highCount > 2) return 'high';
  if (detectedPatterns.length > 5) return 'medium';
  return 'low';
}

function assessComplianceImpact(detectedPatterns: any[]): string {
  const hasPersonalData = detectedPatterns.some(
    p => p.type === 'email' || p.type === 'name' || p.category === 'personal-data'
  );
  const hasFinancialData = detectedPatterns.some(
    p => p.type === 'credit-card' || p.type === 'bank-account' || p.category === 'payment-data'
  );
  const hasHealthData = detectedPatterns.some(
    p => p.type === 'medical-record' || p.category === 'health-data'
  );

  if (hasHealthData) return 'HIPAA compliance required - high impact';
  if (hasFinancialData) return 'PCI DSS compliance required - high impact';
  if (hasPersonalData) return 'GDPR compliance required - medium impact';
  return 'Standard security practices apply - low impact';
}

/**
 * Helper function to parse detected patterns from AI analysis content
 */
function parseDetectedPatterns(aiContent: string, userDefinedPatterns?: string[]): any[] {
  // Simplified pattern parsing - in production, would use more sophisticated NLP
  const patterns: any[] = [];

  // Look for common security-related keywords
  const securityKeywords = [
    { keyword: 'password', type: 'password', severity: 'high' },
    { keyword: 'secret', type: 'secret', severity: 'high' },
    { keyword: 'api.key', type: 'api-key', severity: 'critical' },
    { keyword: 'email', type: 'email', severity: 'medium' },
    { keyword: 'token', type: 'token', severity: 'high' },
    { keyword: 'credit.card', type: 'credit-card', severity: 'critical' },
    { keyword: 'ssn', type: 'ssn', severity: 'critical' },
    { keyword: 'phone', type: 'phone', severity: 'low' },
  ];

  const lowerContent = aiContent.toLowerCase();

  securityKeywords.forEach(({ keyword, type, severity }) => {
    if (lowerContent.includes(keyword.replace('.', ' '))) {
      patterns.push({
        type,
        category: 'sensitive-data',
        confidence: 0.7, // Simplified confidence
        severity: severity as 'low' | 'medium' | 'high' | 'critical',
        description: `Detected potential ${type.replace('-', ' ')} pattern`,
        context: `Found in AI analysis content`,
      });
    }
  });

  // Add user-defined patterns
  if (userDefinedPatterns) {
    userDefinedPatterns.forEach(pattern => {
      if (lowerContent.includes(pattern.toLowerCase())) {
        patterns.push({
          type: 'user-defined',
          category: 'custom-pattern',
          confidence: 0.8,
          severity: 'medium',
          description: `User-defined pattern detected: ${pattern}`,
          context: 'User-defined security pattern',
        });
      }
    });
  }

  return patterns;
}

/**
 * Helper function to calculate security score based on detected patterns
 */
function calculateSecurityScore(detectedPatterns: any[], content: string): number {
  if (detectedPatterns.length === 0) {
    return 1.0; // No patterns detected = highest security score
  }

  const contentLength = content.length;
  const patternDensity = detectedPatterns.length / Math.max(contentLength / 1000, 1); // patterns per 1000 chars

  // Calculate base score based on pattern density and severity
  let baseScore = 1.0;

  detectedPatterns.forEach(pattern => {
    const severityWeight =
      {
        low: 0.05,
        medium: 0.1,
        high: 0.2,
        critical: 0.3,
      }[pattern.severity as 'low' | 'medium' | 'high' | 'critical'] || 0.1;

    baseScore -= severityWeight * pattern.confidence;
  });

  // Apply density penalty
  const densityPenalty = Math.min(patternDensity * 0.1, 0.3);
  baseScore -= densityPenalty;

  return Math.max(0, Math.min(1, baseScore));
}
