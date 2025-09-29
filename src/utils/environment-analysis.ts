/**
 * Environment analysis utilities using prompt-driven AI analysis
 * Implements intelligent environment context analysis and compliance assessment
 */

import { McpAdrError } from '../types/index.js';

/**
 * Helper function to get file extension for syntax highlighting
 */
function getFileExtension(filename: string): string {
  const ext = filename.split('.').pop()?.toLowerCase();
  const mapping: Record<string, string> = {
    json: 'json',
    yml: 'yaml',
    yaml: 'yaml',
    js: 'javascript',
    ts: 'typescript',
    py: 'python',
    md: 'markdown',
    dockerfile: 'dockerfile',
    toml: 'toml',
    xml: 'xml',
    sh: 'bash',
    bash: 'bash',
    zsh: 'bash',
    fish: 'fish',
    ps1: 'powershell',
    bat: 'batch',
    cmd: 'batch',
  };
  return mapping[ext || ''] || 'bash'; // Default to bash for script files
}

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
): Promise<{ analysisPrompt: string; instructions: string; actualData?: any }> {
  try {
    // Use actual file operations to scan project structure
    const { scanProjectStructure, findActualEnvironmentFiles } = await import(
      './actual-file-operations.js'
    );

    // Actually read environment files
    const environmentFiles = await findActualEnvironmentFiles(projectPath);
    const projectStructure = await scanProjectStructure(projectPath, { readContent: true });

    const analysisPrompt = `
# Environment Specification Analysis

Based on actual file system analysis, here are the findings:

## Project Structure
- **Root Path**: ${projectStructure.rootPath}
- **Total Files Analyzed**: ${projectStructure.totalFiles}
- **Directories**: ${projectStructure.directories.join(', ')}

## Package Management
${
  projectStructure.packageFiles.length > 0
    ? projectStructure.packageFiles
        .map(
          f => `
### ${f.filename}
\`\`\`${getFileExtension(f.filename)}
${f.content.slice(0, 1000)}${f.content.length > 1000 ? '\n... (truncated)' : ''}
\`\`\`
`
        )
        .join('\n')
    : '- No package files found'
}

## Docker Configuration
${
  projectStructure.dockerFiles.length > 0
    ? projectStructure.dockerFiles
        .map(
          f => `
### ${f.filename}
\`\`\`${getFileExtension(f.filename)}
${f.content.slice(0, 1000)}${f.content.length > 1000 ? '\n... (truncated)' : ''}
\`\`\`
`
        )
        .join('\n')
    : '- No Docker files found'
}

## Environment Configuration
${
  environmentFiles.filter(f => f.filename.includes('.env')).length > 0
    ? environmentFiles
        .filter(f => f.filename.includes('.env'))
        .map(
          f => `
### ${f.filename}
\`\`\`bash
${f.content.slice(0, 500)}${f.content.length > 500 ? '\n... (truncated)' : ''}
\`\`\`
`
        )
        .join('\n')
    : '- No environment files found'
}

## Kubernetes Manifests
${
  projectStructure.kubernetesFiles.length > 0
    ? projectStructure.kubernetesFiles
        .map(
          f => `
### ${f.filename}
\`\`\`yaml
${f.content.slice(0, 800)}${f.content.length > 800 ? '\n... (truncated)' : ''}
\`\`\`
`
        )
        .join('\n')
    : '- No Kubernetes manifests found'
}

## CI/CD Configuration
${
  projectStructure.ciFiles.length > 0
    ? projectStructure.ciFiles
        .map(
          f => `
### ${f.filename}
\`\`\`yaml
${f.content.slice(0, 600)}${f.content.length > 600 ? '\n... (truncated)' : ''}
\`\`\`
`
        )
        .join('\n')
    : '- No CI/CD files found'
}

## Shell Scripts & Automation
${
  projectStructure.scriptFiles.length > 0
    ? projectStructure.scriptFiles
        .map(
          f => `
### ${f.filename}
\`\`\`${getFileExtension(f.filename)}
${f.content.slice(0, 800)}${f.content.length > 800 ? '\n... (truncated)' : ''}
\`\`\`
`
        )
        .join('\n')
    : '- No shell scripts found'
}

## Analysis Requirements

Please analyze the above **actual file contents** to:

1. **Infrastructure Assessment**: Determine deployment patterns and infrastructure requirements
2. **Containerization Analysis**: Evaluate Docker and container orchestration setup
3. **Environment Configuration**: Analyze environment variables and configuration management
4. **Security Review**: Identify security configurations and potential vulnerabilities
5. **Scalability Assessment**: Evaluate scalability and performance characteristics
6. **Compliance Check**: Assess adherence to best practices and standards
7. **Optimization Recommendations**: Suggest improvements for deployment and operations
`;

    const instructions = `
# Environment Specification Analysis Instructions

This analysis provides **actual file contents** from the project for comprehensive environment assessment.

## Analysis Scope
- **Project Path**: ${projectPath}
- **Environment Files**: ${environmentFiles.length} files found
- **Package Files**: ${projectStructure.packageFiles.length} found
- **Docker Files**: ${projectStructure.dockerFiles.length} found
- **Kubernetes Files**: ${projectStructure.kubernetesFiles.length} found
- **CI/CD Files**: ${projectStructure.ciFiles.length} found
- **Script Files**: ${projectStructure.scriptFiles.length} found
- **Total Files Analyzed**: ${projectStructure.totalFiles}

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
      actualData: {
        projectStructure,
        environmentFiles,
        summary: {
          totalFiles: projectStructure.totalFiles,
          packageFiles: projectStructure.packageFiles.length,
          dockerFiles: projectStructure.dockerFiles.length,
          kubernetesFiles: projectStructure.kubernetesFiles.length,
          ciFiles: projectStructure.ciFiles.length,
          scriptFiles: projectStructure.scriptFiles.length,
          environmentFiles: environmentFiles.length,
        },
      },
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
    const { scanProjectStructure } = await import('./actual-file-operations.js');

    // Use actual project structure scanning
    const projectStructure = await scanProjectStructure(projectPath, {
      readContent: true,
      includeHidden: false,
    });

    // Get container-related files
    const containerFiles = [...projectStructure.dockerFiles, ...projectStructure.kubernetesFiles];

    let containerAnalysis = '';
    if (containerFiles.length > 0) {
      containerAnalysis = `Found ${containerFiles.length} container-related files:\n\n`;
      containerFiles.forEach(file => {
        containerAnalysis += `### ${file.filename}\n`;
        containerAnalysis += `- **Path**: ${file.relativePath}\n`;
        containerAnalysis += `- **Type**: ${file.type}\n`;
        containerAnalysis += `- **Size**: ${file.size} bytes\n`;
        if (file.content && file.content !== '[Binary or unreadable file]') {
          containerAnalysis += `- **Content**:\n\`\`\`\n${file.content.substring(0, 1000)}${file.content.length > 1000 ? '...' : ''}\n\`\`\`\n\n`;
        } else {
          containerAnalysis += `- **Content**: Binary or unreadable\n\n`;
        }
      });
    } else {
      containerAnalysis = 'No containerization files found in the project.\n\n';
    }

    const detectionPrompt = `
# Containerization Detection and Analysis

## Container File Analysis Results

${containerAnalysis}

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
  adrDirectory: string = 'docs/adrs',
  projectPath: string = process.cwd()
): Promise<{ requirementsPrompt: string; instructions: string }> {
  try {
    const { discoverAdrsInDirectory } = await import('./adr-discovery.js');
    const path = await import('path');

    // Use absolute path for ADR directory
    const absoluteAdrPath = path.isAbsolute(adrDirectory)
      ? adrDirectory
      : path.resolve(projectPath, adrDirectory);

    // Use actual ADR discovery
    const discoveryResult = await discoverAdrsInDirectory(absoluteAdrPath, true, projectPath);

    let adrAnalysis = '';
    if (discoveryResult.adrs.length > 0) {
      adrAnalysis = `Found ${discoveryResult.adrs.length} ADRs to analyze for environment requirements:\n\n`;
      discoveryResult.adrs.forEach(adr => {
        adrAnalysis += `### ${adr.title}\n`;
        adrAnalysis += `- **File**: ${adr.filename}\n`;
        adrAnalysis += `- **Status**: ${adr.status}\n`;
        adrAnalysis += `- **Context**: ${adr.context}\n`;
        adrAnalysis += `- **Decision**: ${adr.decision}\n`;
        adrAnalysis += `- **Consequences**: ${adr.consequences}\n\n`;
      });
    } else {
      adrAnalysis = `No ADRs found in ${absoluteAdrPath}. Cannot determine environment requirements from ADRs.\n\n`;
    }

    const requirementsPrompt = `
# Environment Requirements Analysis

## ADR Analysis Results

${adrAnalysis}

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

// Removed unused function determineFileType
