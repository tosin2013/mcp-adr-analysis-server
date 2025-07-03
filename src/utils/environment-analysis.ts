/**
 * Environment analysis utilities using prompt-driven AI analysis
 * Implements intelligent environment context analysis and compliance assessment
 */

import { McpAdrError } from '../types/index.js';

export interface EnvironmentFile {
  filename: string;
  content: string;
  path: string;
  type: 'dockerfile' | 'compose' | 'kubernetes' | 'terraform' | 'config' | 'other';
}

export interface ContainerizationAnalysis {
  detected: boolean;
  technology: string;
  maturity: string;
  orchestration: string;
  dockerfiles: any[];
  composeFiles: any[];
  kubernetesManifests: any[];
  buildConfiguration: any;
  resourceManagement: any;
  bestPractices: any;
  recommendations: any[];
  securityFindings: any[];
}

export interface EnvironmentRequirements {
  infrastructure: any;
  platform: any;
  security: any;
  performance: any;
  operationalRequirements: any;
  gaps: any[];
  recommendations: any[];
}

export interface ComplianceAssessment {
  overallScore: number;
  assessmentDate: string;
  riskLevel: string;
  complianceStatus: string;
  categoryScores: any;
  complianceDetails: any[];
  violations: any[];
  strengths: any[];
  recommendations: any[];
  improvementPlan: any;
  riskAssessment: any;
  complianceMetrics: any;
}

/**
 * Analyze system environment specifications
 */
export async function analyzeEnvironmentSpecs(
  projectPath: string = process.cwd()
): Promise<{ analysisPrompt: string; instructions: string }> {
  try {
    const { analyzeProjectStructure } = await import('./file-system.js');

    // Find environment-related files
    const environmentFiles = await findEnvironmentFiles(projectPath);

    // Generate project analysis prompt for AI delegation
    const projectAnalysisPrompt = await analyzeProjectStructure(projectPath);

    const analysisPrompt = `
# Environment Specification Analysis

Please perform comprehensive environment specification analysis.

## Project Analysis Instructions

${projectAnalysisPrompt.prompt}

## Implementation Steps

${projectAnalysisPrompt.instructions}

## Environment Files Analysis

Please analyze the following environment specification files:
${environmentFiles.map(f => `- **${f.filename}** (${f.type}): ${f.path}`).join('\n')}

## Analysis Requirements

1. Examine each environment file for configuration patterns
2. Identify infrastructure requirements and dependencies
3. Assess containerization and orchestration setups
4. Evaluate cloud service integrations
5. Analyze security configurations and compliance
6. Determine scalability and performance characteristics
`;

    const instructions = `
# Environment Specification Analysis Instructions

This analysis will examine environment specifications and infrastructure configurations to understand deployment requirements.

## Analysis Scope
- **Project Path**: ${projectPath}
- **Environment Files**: ${environmentFiles.length} files found
- **File Types**: ${Array.from(new Set(environmentFiles.map(f => f.type))).join(', ')}

## Discovered Files
${environmentFiles.map(f => `- **${f.filename}** (${f.type}): ${f.path}`).join('\n')}

## Next Steps
1. **Submit the analysis prompt** to an AI agent for comprehensive environment analysis
2. **Parse the JSON response** to get environment specifications and recommendations
3. **Review infrastructure requirements** and compliance status
4. **Use findings** for environment optimization and compliance improvement

## Expected AI Response Format
The AI will return a JSON object with:
- \`environmentAnalysis\`: Overall environment assessment and classification
- \`infrastructure\`: Detailed infrastructure component analysis
- \`containerization\`: Container technology detection and evaluation
- \`cloudServices\`: Cloud platform and service analysis
- \`configuration\`: Configuration management assessment
- \`qualityAttributes\`: Non-functional requirement evaluation
- \`recommendations\`: Prioritized improvement suggestions
- \`gaps\`: Identified missing or inadequate components

## Usage Example
\`\`\`typescript
const result = await analyzeEnvironmentSpecs(projectPath);
// Submit result.analysisPrompt to AI agent
// Parse AI response for environment analysis
\`\`\`
`;

    return {
      analysisPrompt,
      instructions,
    };
  } catch (error) {
    throw new McpAdrError(
      `Failed to analyze environment specs: ${error instanceof Error ? error.message : String(error)}`,
      'ENVIRONMENT_ANALYSIS_ERROR'
    );
  }
}

/**
 * Detect containerization technologies
 */
export async function detectContainerization(
  projectPath: string = process.cwd()
): Promise<{ detectionPrompt: string; instructions: string }> {
  try {
    const { findFiles } = await import('./file-system.js');

    // Generate container file discovery prompt for AI delegation
    const containerFileDiscoveryPrompt = await findFiles(
      process.cwd(),
      [
        '**/Dockerfile*',
        '**/docker-compose*.yml',
        '**/docker-compose*.yaml',
        '**/*.dockerfile',
        '**/Containerfile*',
        '**/k8s/**/*.yml',
        '**/k8s/**/*.yaml',
        '**/kubernetes/**/*.yml',
        '**/kubernetes/**/*.yaml',
        '**/helm/**/*.yml',
        '**/helm/**/*.yaml',
        '**/.dockerignore',
      ],
      { includeContent: true }
    );

    const detectionPrompt = `
# Containerization Detection and Analysis

Please discover and analyze containerization technologies in the project.

## File Discovery Instructions

${containerFileDiscoveryPrompt.prompt}

## Implementation Steps

${containerFileDiscoveryPrompt.instructions}

## Analysis Requirements

For each container-related file discovered:
1. Analyze Dockerfile configurations and best practices
2. Examine Docker Compose setups and service definitions
3. Review Kubernetes manifests and deployment strategies
4. Evaluate Helm charts and templating approaches
5. Assess security configurations and compliance
6. Identify optimization opportunities
`;

    const instructions = `
# Containerization Detection Instructions

This analysis will detect and evaluate containerization technologies and configurations in the project.

## Detection Scope
- **Project Path**: ${projectPath}
- **File Types**: Dockerfiles, Compose files, Kubernetes manifests, Helm charts
- **Analysis Focus**: Configuration patterns, security, optimization opportunities

## Next Steps
1. **Submit the detection prompt** to an AI agent for containerization analysis
2. **Parse the JSON response** to get containerization assessment
3. **Review security findings** and best practice compliance
4. **Implement recommendations** for container optimization

## Expected AI Response Format
The AI will return a JSON object with:
- \`containerization\`: Overall containerization status and maturity
- \`dockerfiles\`: Analysis of Dockerfile configurations
- \`composeFiles\`: Docker Compose file evaluation
- \`kubernetesManifests\`: Kubernetes resource analysis
- \`buildConfiguration\`: Build optimization assessment
- \`resourceManagement\`: Resource limit and scaling evaluation
- \`bestPractices\`: Security and optimization best practices
- \`recommendations\`: Prioritized improvement suggestions
- \`securityFindings\`: Security issues and remediation

## Usage Example
\`\`\`typescript
const result = await detectContainerization(projectPath);
// Submit result.detectionPrompt to AI agent
// Parse AI response as ContainerizationAnalysis
\`\`\`
`;

    return {
      detectionPrompt,
      instructions,
    };
  } catch (error) {
    throw new McpAdrError(
      `Failed to detect containerization: ${error instanceof Error ? error.message : String(error)}`,
      'CONTAINERIZATION_DETECTION_ERROR'
    );
  }
}

/**
 * Determine environment requirements from ADRs
 */
export async function determineEnvironmentRequirements(
  adrDirectory: string = 'docs/adrs'
): Promise<{ requirementsPrompt: string; instructions: string }> {
  try {
    const { findFiles } = await import('./file-system.js');

    // Generate ADR file discovery prompt for AI delegation
    const adrFileDiscoveryPrompt = await findFiles(process.cwd(), [`${adrDirectory}/**/*.md`], {
      includeContent: true,
    });

    const requirementsPrompt = `
# Environment Requirements Analysis

Please analyze ADR files to determine environment requirements.

## File Discovery Instructions

${adrFileDiscoveryPrompt.prompt}

## Implementation Steps

${adrFileDiscoveryPrompt.instructions}

## Requirements Analysis

For each ADR file discovered:
1. Extract infrastructure requirements and dependencies
2. Identify platform-specific needs and constraints
3. Determine security requirements and compliance needs
4. Assess performance and scalability requirements
5. Identify operational and monitoring requirements
6. Categorize requirements by priority and complexity

## Required Output Format

Please provide environment requirements analysis in JSON format with:
- Infrastructure requirements categorized by type
- Platform dependencies and version constraints
- Security and compliance requirements
- Performance and scalability specifications
- Operational requirements and monitoring needs
`;

    const instructions = `
# Environment Requirements Analysis Instructions

This analysis will extract environment and infrastructure requirements from Architectural Decision Records.

## Requirements Extraction
- **ADR Directory**: ${adrDirectory}
- **Requirement Categories**: Infrastructure, Platform, Security, Performance, Operational

## Next Steps
1. **Submit the requirements prompt** to an AI agent for ADR analysis
2. **Parse the JSON response** to get extracted requirements
3. **Review requirement completeness** and identify gaps
4. **Use requirements** for environment compliance assessment

## Expected AI Response Format
The AI will return a JSON object with:
- \`environmentRequirements\`: Overall requirements metadata
- \`infrastructure\`: Compute, networking, and availability requirements
- \`platform\`: Containerization, cloud services, and database requirements
- \`security\`: Compliance, access control, and data protection requirements
- \`performance\`: Response time, throughput, and scalability requirements
- \`operationalRequirements\`: Monitoring, deployment, and maintenance requirements
- \`gaps\`: Missing or unclear requirements
- \`recommendations\`: Suggested requirement clarifications

## Usage Example
\`\`\`typescript
const result = await determineEnvironmentRequirements(adrDirectory);
// Submit result.requirementsPrompt to AI agent
// Parse AI response as EnvironmentRequirements
\`\`\`
`;

    return {
      requirementsPrompt,
      instructions,
    };
  } catch (error) {
    throw new McpAdrError(
      `Failed to determine environment requirements: ${error instanceof Error ? error.message : String(error)}`,
      'REQUIREMENTS_ANALYSIS_ERROR'
    );
  }
}

/**
 * Assess environment compliance
 */
export async function assessEnvironmentCompliance(
  currentEnvironment: any,
  requirements: any,
  industryStandards?: string[]
): Promise<{ compliancePrompt: string; instructions: string }> {
  try {
    const { generateEnvironmentCompliancePrompt } = await import(
      '../prompts/environment-analysis-prompts.js'
    );

    const compliancePrompt = generateEnvironmentCompliancePrompt(
      currentEnvironment,
      requirements,
      industryStandards
    );

    const instructions = `
# Environment Compliance Assessment Instructions

This analysis will assess the current environment against requirements and industry standards.

## Assessment Scope
- **Current Environment**: Analyzed environment specifications
- **Requirements**: Extracted from ADRs and project needs
- **Industry Standards**: ${industryStandards?.length || 0} standards
- **Assessment Areas**: Infrastructure, Security, Performance, Operational

## Next Steps
1. **Submit the compliance prompt** to an AI agent for assessment
2. **Parse the JSON response** to get compliance evaluation
3. **Review violations** and prioritize remediation
4. **Implement improvement plan** based on recommendations

## Expected AI Response Format
The AI will return a JSON object with:
- \`complianceAssessment\`: Overall compliance score and status
- \`categoryScores\`: Compliance scores by category
- \`complianceDetails\`: Detailed requirement-by-requirement assessment
- \`violations\`: Specific compliance violations with remediation
- \`strengths\`: Areas where compliance exceeds requirements
- \`recommendations\`: Prioritized improvement recommendations
- \`improvementPlan\`: Phased implementation roadmap
- \`riskAssessment\`: Risk analysis and mitigation strategies
- \`complianceMetrics\`: Quantitative compliance measurements

## Usage Example
\`\`\`typescript
const result = await assessEnvironmentCompliance(environment, requirements, standards);
// Submit result.compliancePrompt to AI agent
// Parse AI response as ComplianceAssessment
\`\`\`
`;

    return {
      compliancePrompt,
      instructions,
    };
  } catch (error) {
    throw new McpAdrError(
      `Failed to assess environment compliance: ${error instanceof Error ? error.message : String(error)}`,
      'COMPLIANCE_ASSESSMENT_ERROR'
    );
  }
}

/**
 * Find environment-related files in the project
 * Returns mock data for prompt-driven architecture
 */
async function findEnvironmentFiles(projectPath: string): Promise<EnvironmentFile[]> {
  // Return mock environment files for prompt-driven architecture
  // The actual file discovery will be handled by AI agents through prompts
  return [
    {
      filename: 'Dockerfile',
      content: '',
      path: `${projectPath}/Dockerfile`,
      type: 'dockerfile' as const,
    },
    {
      filename: 'docker-compose.yml',
      content: '',
      path: `${projectPath}/docker-compose.yml`,
      type: 'compose' as const,
    },
    {
      filename: '.env',
      content: '',
      path: `${projectPath}/.env`,
      type: 'config' as const,
    },
  ];
}

// Removed unused function determineFileType
