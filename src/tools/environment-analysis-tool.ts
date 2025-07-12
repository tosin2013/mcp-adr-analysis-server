/**
 * MCP Tool for environment context analysis
 * Implements prompt-driven environment analysis and compliance assessment
 * Enhanced with Generated Knowledge Prompting (GKP) for DevOps and infrastructure expertise
 */

import { McpAdrError } from '../types/index.js';

/**
 * Analyze environment context and provide optimization recommendations
 * Enhanced with Generated Knowledge Prompting for DevOps and infrastructure expertise
 */
export async function analyzeEnvironment(args: {
  projectPath?: string;
  adrDirectory?: string;
  analysisType?: 'specs' | 'containerization' | 'requirements' | 'compliance' | 'comprehensive';
  currentEnvironment?: any;
  requirements?: any;
  industryStandards?: string[];
  knowledgeEnhancement?: boolean; // Enable GKP for DevOps and infrastructure knowledge
  enhancedMode?: boolean; // Enable advanced prompting features
}): Promise<any> {
  const {
    projectPath = process.cwd(),
    adrDirectory = 'docs/adrs',
    analysisType = 'comprehensive',
    currentEnvironment,
    requirements,
    industryStandards,
    knowledgeEnhancement = true, // Default to GKP enabled
    enhancedMode = true, // Default to enhanced mode
  } = args;

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
            const { generateArchitecturalKnowledge } = await import('../utils/knowledge-generation.js');
            const knowledgeResult = await generateArchitecturalKnowledge({
              projectPath,
              technologies: [],
              patterns: [],
              projectType: 'infrastructure-environment-analysis'
            }, {
              domains: ['cloud-infrastructure', 'devops-cicd'],
              depth: 'intermediate',
              cacheEnabled: true
            });

            knowledgeContext = `\n## Infrastructure & DevOps Knowledge Enhancement\n\n${knowledgeResult.prompt}\n\n---\n`;
          } catch (error) {
            console.error('[WARNING] GKP knowledge generation failed for environment analysis:', error);
            knowledgeContext = '<!-- Infrastructure knowledge generation unavailable -->\n';
          }
        }
        
        const result = await analyzeEnvironmentSpecs(projectPath);
        enhancedPrompt = knowledgeContext + result.analysisPrompt;

        // Execute the environment analysis with AI if enabled, otherwise return prompt
        const { executePromptWithFallback, formatMCPResponse } = await import('../utils/prompt-execution.js');
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
            responseFormat: 'text'
          }
        );

        if (executionResult.isAIGenerated) {
          // AI execution successful - return actual environment analysis results
          return formatMCPResponse({
            ...executionResult,
            content: `# Environment Specification Analysis Results (GKP Enhanced)

## Enhancement Features
- **Generated Knowledge Prompting**: ${knowledgeEnhancement ? '✅ Enabled' : '❌ Disabled'}
- **Enhanced Mode**: ${enhancedMode ? '✅ Enabled' : '❌ Disabled'}
- **Knowledge Domains**: Cloud infrastructure, DevOps practices, containerization, deployment patterns

## Analysis Information
- **Project Path**: ${projectPath}
- **ADR Directory**: ${adrDirectory}
- **Analysis Type**: Environment Specifications

${knowledgeContext ? `## Applied Infrastructure Knowledge

${knowledgeContext}
` : ''}

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

${knowledgeContext ? `## Infrastructure Knowledge Context

${knowledgeContext}
` : ''}

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
            const { generateArchitecturalKnowledge } = await import('../utils/knowledge-generation.js');
            const knowledgeResult = await generateArchitecturalKnowledge({
              projectPath,
              technologies: [],
              patterns: [],
              projectType: 'containerization-analysis'
            }, {
              domains: ['cloud-infrastructure', 'devops-cicd'],
              depth: 'intermediate',
              cacheEnabled: true
            });

            knowledgeContext = `\n## Containerization Knowledge Enhancement\n\n${knowledgeResult.prompt}\n\n---\n`;
          } catch (error) {
            console.error('[WARNING] GKP knowledge generation failed for containerization analysis:', error);
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

${knowledgeContext ? `## Containerization Knowledge Context

${knowledgeContext}
` : ''}

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
            const { generateArchitecturalKnowledge } = await import('../utils/knowledge-generation.js');
            const knowledgeResult = await generateArchitecturalKnowledge({
              projectPath,
              technologies: [],
              patterns: [],
              projectType: 'requirements-analysis'
            }, {
              domains: ['cloud-infrastructure', 'performance-optimization'],
              depth: 'intermediate',
              cacheEnabled: true
            });

            knowledgeContext = `\n## Requirements Engineering Knowledge Enhancement\n\n${knowledgeResult.prompt}\n\n---\n`;
          } catch (error) {
            console.error('[WARNING] GKP knowledge generation failed for requirements analysis:', error);
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

${knowledgeContext ? `## Requirements Knowledge Context

${knowledgeContext}
` : ''}

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
            const { generateArchitecturalKnowledge } = await import('../utils/knowledge-generation.js');
            const knowledgeResult = await generateArchitecturalKnowledge({
              projectPath,
              technologies: [],
              patterns: [],
              projectType: 'compliance-assessment'
            }, {
              domains: ['security-patterns', 'cloud-infrastructure'],
              depth: 'intermediate',
              cacheEnabled: true
            });

            knowledgeContext = `\n## Compliance & Security Knowledge Enhancement\n\n${knowledgeResult.prompt}\n\n---\n`;
          } catch (error) {
            console.error('[WARNING] GKP knowledge generation failed for compliance assessment:', error);
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

${knowledgeContext ? `## Compliance Knowledge Context

${knowledgeContext}
` : ''}

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
            const { generateArchitecturalKnowledge } = await import('../utils/knowledge-generation.js');
            const knowledgeResult = await generateArchitecturalKnowledge({
              projectPath,
              technologies: [],
              patterns: [],
              projectType: 'comprehensive-environment-analysis'
            }, {
              domains: ['cloud-infrastructure', 'devops-cicd', 'security-patterns'],
              depth: 'advanced',
              cacheEnabled: true
            });

            comprehensiveKnowledgeContext = `\n## Comprehensive Environment Knowledge Enhancement\n\n${knowledgeResult.prompt}\n\n---\n`;
          } catch (error) {
            console.error('[WARNING] GKP knowledge generation failed for comprehensive environment analysis:', error);
            comprehensiveKnowledgeContext = '<!-- Comprehensive environment knowledge generation unavailable -->\n';
          }
        }
        
        const specsResult = await analyzeEnvironmentSpecs(projectPath);
        const containerResult = await detectContainerization(projectPath);
        const requirementsResult = await determineEnvironmentRequirements(adrDirectory, projectPath);

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

${comprehensiveKnowledgeContext ? `## Applied Comprehensive Knowledge

${comprehensiveKnowledgeContext}
` : ''}

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
