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
    const { generateAnalysisContext } = await import('../prompts/analysis-prompts.js');
    const { generateEnvironmentSpecAnalysisPrompt } = await import(
      '../prompts/environment-analysis-prompts.js'
    );

    // Find environment-related files
    const environmentFiles = await findEnvironmentFiles(projectPath);

    // Analyze project structure
    const projectStructure = await analyzeProjectStructure(projectPath);
    const analysisContext = generateAnalysisContext(projectStructure);

    const analysisPrompt = generateEnvironmentSpecAnalysisPrompt(environmentFiles, analysisContext);

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
    const { generateContainerizationDetectionPrompt } = await import(
      '../prompts/environment-analysis-prompts.js'
    );

    // Find container-related files
    const containerFiles = await findFiles(
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

    // Prepare file data
    const projectFiles = containerFiles.map(file => ({
      filename: file.name,
      content: file.content || '',
      path: file.path,
    }));

    const detectionPrompt = generateContainerizationDetectionPrompt(projectFiles);

    const instructions = `
# Containerization Detection Instructions

This analysis will detect and evaluate containerization technologies and configurations in the project.

## Detection Scope
- **Project Path**: ${projectPath}
- **Container Files**: ${containerFiles.length} files found
- **File Types**: Dockerfiles, Compose files, Kubernetes manifests, Helm charts

## Discovered Files
${containerFiles.map(f => `- **${f.name}**: ${f.path}`).join('\n')}

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
    const { generateAdrEnvironmentRequirementsPrompt } = await import(
      '../prompts/environment-analysis-prompts.js'
    );

    // Find all ADR files
    const adrFiles = await findFiles(process.cwd(), [`${adrDirectory}/**/*.md`], {
      includeContent: true,
    });

    if (adrFiles.length === 0) {
      throw new McpAdrError(`No ADR files found in ${adrDirectory}`, 'NO_ADRS_FOUND');
    }

    // Prepare ADR data
    const adrData = adrFiles.map(file => {
      const titleMatch = file.content?.match(/^#\s+(.+)$/m);
      const statusMatch = file.content?.match(/##\s+Status\s*\n\s*(.+)/i);

      return {
        id: file.name.replace(/\.md$/, ''),
        title: titleMatch?.[1] || file.name.replace(/\.md$/, ''),
        content: file.content || '',
        status: statusMatch?.[1] || 'Unknown',
      };
    });

    const requirementsPrompt = generateAdrEnvironmentRequirementsPrompt(adrData);

    const instructions = `
# Environment Requirements Analysis Instructions

This analysis will extract environment and infrastructure requirements from Architectural Decision Records.

## Requirements Extraction
- **ADR Directory**: ${adrDirectory}
- **ADRs Analyzed**: ${adrFiles.length} files
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
 */
async function findEnvironmentFiles(projectPath: string): Promise<EnvironmentFile[]> {
  try {
    const { findFiles } = await import('./file-system.js');

    const files = await findFiles(
      projectPath,
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
        '**/terraform/**/*.tf',
        '**/terraform/**/*.tfvars',
        '**/.env*',
        '**/config/**/*.yml',
        '**/config/**/*.yaml',
        '**/config/**/*.json',
        '**/helm/**/*.yml',
        '**/helm/**/*.yaml',
      ],
      { includeContent: true }
    );

    return files.map(file => ({
      filename: file.name,
      content: file.content || '',
      path: file.path,
      type: determineFileType(file.name, file.path),
    }));
  } catch (error) {
    console.warn('Failed to find environment files:', error);
    return [];
  }
}

/**
 * Determine file type based on filename and path
 */
function determineFileType(filename: string, path: string): EnvironmentFile['type'] {
  const lowerFilename = filename.toLowerCase();
  const lowerPath = path.toLowerCase();

  if (lowerFilename.includes('dockerfile') || lowerFilename.includes('containerfile')) {
    return 'dockerfile';
  }

  if (lowerFilename.includes('docker-compose') || lowerFilename.includes('compose')) {
    return 'compose';
  }

  if (lowerPath.includes('k8s') || lowerPath.includes('kubernetes') || lowerPath.includes('helm')) {
    return 'kubernetes';
  }

  if (
    lowerPath.includes('terraform') ||
    lowerFilename.endsWith('.tf') ||
    lowerFilename.endsWith('.tfvars')
  ) {
    return 'terraform';
  }

  if (
    lowerFilename.includes('config') ||
    lowerFilename.startsWith('.env') ||
    lowerFilename.endsWith('.yml') ||
    lowerFilename.endsWith('.yaml') ||
    lowerFilename.endsWith('.json')
  ) {
    return 'config';
  }

  return 'other';
}
