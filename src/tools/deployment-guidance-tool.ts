/**
 * MCP Tool for generating deployment guidance from ADRs
 * Implements prompt-driven deployment guidance generation following project patterns
 */

import { McpAdrError } from '../types/index.js';
import { ResearchOrchestrator } from '../utils/research-orchestrator.js';

/**
 * Generate deployment guidance from ADRs using AI-driven analysis
 */
export async function generateDeploymentGuidance(args: {
  adrDirectory?: string;
  environment?: 'development' | 'staging' | 'production' | 'all';
  format?: 'markdown' | 'scripts' | 'structured' | 'all';
  projectPath?: string;
  includeScripts?: boolean;
  includeConfigs?: boolean;
  includeValidation?: boolean;
  technologyFilter?: string[];
  customRequirements?: string[];
  includeRollback?: boolean;
  generateFiles?: boolean;
}): Promise<any> {
  const {
    adrDirectory = 'docs/adrs',
    environment = 'production',
    format = 'markdown',
    projectPath = process.cwd(),
    includeScripts = true,
    includeConfigs = true,
    includeValidation = true,
    technologyFilter,
    customRequirements,
    includeRollback = true,
    generateFiles = false,
  } = args;

  try {
    // Use existing ADR discovery
    const { discoverAdrsInDirectory } = await import('../utils/adr-discovery.js');
    const discoveryResult = await discoverAdrsInDirectory(adrDirectory, projectPath, {
      includeContent: true,
      includeTimeline: false,
    });

    if (discoveryResult.adrs.length === 0) {
      return {
        content: [
          {
            type: 'text',
            text: `# No ADRs Found for Deployment Guidance

## Searched Location
- **ADR Directory**: ${adrDirectory}
- **Project Path**: ${projectPath}

## Recommendations
1. Create ADRs with deployment-relevant decisions
2. Include technology choices (Docker, databases, web servers)
3. Specify infrastructure requirements
4. Document configuration parameters

## Example ADR for Deployment
\`\`\`markdown
# ADR-001: Use Docker for Containerization

## Status
Accepted

## Context
We need consistent deployment across environments.

## Decision
Use Docker containers with docker-compose for orchestration.

## Consequences
- Consistent environment across dev/staging/production
- Requires container registry and orchestration setup
- Port 3000 for application, 5432 for PostgreSQL
\`\`\`
`,
          },
        ],
      };
    }

    // Research current deployment environment
    let environmentContext = '';
    try {
      const orchestrator = new ResearchOrchestrator(projectPath, adrDirectory);
      const research = await orchestrator.answerResearchQuestion(
        `Analyze deployment requirements for ${environment} environment:
1. What deployment infrastructure is currently available?
2. What deployment patterns are documented in ADRs?
3. Are there existing deployment scripts or configurations?
4. What are the deployment constraints or requirements?`
      );

      const envSource = research.sources.find(s => s.type === 'environment');
      const capabilities = envSource?.data?.capabilities || [];

      environmentContext = `

## 🔍 Current Environment Analysis

**Research Confidence**: ${(research.confidence * 100).toFixed(1)}%

### Available Infrastructure
${capabilities.length > 0 ? capabilities.map((c: string) => `- ${c}`).join('\n') : '- No infrastructure tools detected'}

### Deployment Context
${research.answer || 'No specific deployment context found'}

### Key Findings
${research.sources.map(s => `- ${s.type}: Consulted`).join('\n')}
`;
    } catch (error) {
      environmentContext = `\n## ⚠️ Environment Analysis Failed\n${error instanceof Error ? error.message : String(error)}\n`;
    }

    // Create comprehensive deployment guidance prompt
    const deploymentPrompt = `
# Deployment Guidance Generation

You are an expert DevOps engineer tasked with creating comprehensive deployment guidance from Architectural Decision Records (ADRs).

## Project Context
- **Project**: ${projectPath.split('/').pop() || 'Unknown'}
- **Target Environment**: ${environment}
- **ADR Directory**: ${adrDirectory}
- **Total ADRs**: ${discoveryResult.adrs.length}
${environmentContext}

## ADR Content
${discoveryResult.adrs
  .map(
    adr => `
### ${adr.title} (${adr.filename})
**Status**: ${adr.status}
**Content**:
\`\`\`markdown
${adr.content?.slice(0, 1000) || 'No content available'}${adr.content && adr.content.length > 1000 ? '...' : ''}
\`\`\`
`
  )
  .join('\n')}

## Deployment Analysis Instructions

Analyze the ADRs above and extract deployment-relevant information to create comprehensive deployment guidance:

### 1. **Technology Extraction**
Identify technologies mentioned in ADRs that require deployment:
- **Databases**: PostgreSQL, MySQL, MongoDB, Redis, etc.
- **Web Servers**: Nginx, Apache, Node.js, Python, etc.
- **Containers**: Docker, Kubernetes, container orchestration
- **Infrastructure**: Cloud providers, servers, networking
- **Security**: TLS, authentication, secrets management
- **Monitoring**: Logging, metrics, health checks

### 2. **Configuration Requirements**
Extract specific configuration details:
- **Ports**: Application ports, database ports, service ports
- **Environment Variables**: Required env vars for ${environment}
- **Resource Limits**: Memory, CPU, storage requirements
- **Dependencies**: Service dependencies and startup order

### 3. **Environment-Specific Considerations**
For **${environment}** environment:
${
  environment === 'production'
    ? `
- **Security**: TLS certificates, secure connections, secrets management
- **Performance**: Load balancing, caching, optimization
- **Reliability**: Backup procedures, monitoring, alerting
- **Scalability**: Auto-scaling, resource allocation
`
    : environment === 'staging'
      ? `
- **Testing**: Staging-specific configurations
- **Data**: Test data setup, database seeding
- **Integration**: External service connections
`
      : `
- **Development**: Hot-reload, debugging, local services
- **Convenience**: Simplified setup, development tools
`
}

### 4. **Deployment Steps Generation**
Create step-by-step deployment instructions:
1. **Prerequisites**: Required tools, access, dependencies
2. **Infrastructure Setup**: Server/cloud setup, networking
3. **Database Setup**: Database creation, schema, migrations
4. **Application Deployment**: Build, deploy, configure
5. **Service Configuration**: Web server, load balancer, SSL
6. **Verification**: Health checks, smoke tests, monitoring

**IMPORTANT**: Include visual diagrams in your deployment guidance using mermaid syntax:

#### Required Diagrams:

1. **Deployment Sequence Diagram** - Show the flow from ADRs → Scripts → Environment
\`\`\`mermaid
sequenceDiagram
    participant User as Developer
    participant Tool as Deployment Tool
    participant ADR as ADR Documents
    participant Script as Deploy Scripts
    participant Env as ${environment.charAt(0).toUpperCase() + environment.slice(1)} Environment

    User->>Tool: Generate deployment guidance
    Tool->>ADR: Read architectural decisions
    ADR-->>Tool: Technology stack & configs
    Tool->>Script: Generate deploy scripts
    Script->>Env: Deploy components
    Env-->>Script: Deployment status
    Script-->>User: Success & validation steps
\`\`\`

2. **Deployment Workflow Diagram** - Show the phase-by-phase deployment process
\`\`\`mermaid
flowchart TD
    Start([Start Deployment]) --> Detect[Detect Platform from ADRs]
    Detect --> LoadADR[Read Technology Decisions]
    LoadADR --> GenScripts[Generate Deploy Scripts]
    GenScripts --> Phase1[Prerequisites Validation]
    Phase1 --> Phase2[Infrastructure Setup]
    Phase2 --> Phase3[Database Deployment]
    Phase3 --> Phase4[Application Deployment]
    Phase4 --> Validate{Validation<br/>Passed?}
    Validate -->|No| Fix[Auto-fix Issues]
    Fix --> Phase4
    Validate -->|Yes| Success([✅ Deployment Success])

    style Start fill:#e1f5ff
    style Success fill:#d4edda
    style Fix fill:#f8d7da
\`\`\`

Include these diagrams in the appropriate sections of your deployment guidance.

${
  includeScripts
    ? `
### 5. **Script Generation**
Generate deployment scripts:
- **Shell scripts** for automated deployment
- **Docker commands** for containerized deployment
- **Configuration files** (nginx.conf, docker-compose.yml, .env)
`
    : ''
}

${
  includeValidation
    ? `
### 6. **Validation & Health Checks**
Create verification procedures:
- **Health check endpoints** and commands
- **Service connectivity tests**
- **Performance validation**
- **Security verification**
`
    : ''
}

${
  includeRollback
    ? `
### 7. **Rollback Procedures**
Document rollback steps:
- **Rollback commands** in reverse order
- **Data migration rollback** if applicable
- **Service restoration** procedures
`
    : ''
}

## Output Format

Generate deployment guidance in the following structure:

\`\`\`markdown
# Deployment Guide: [Project Name]

**Environment**: ${environment}
**Generated**: [Current Date]

## 📋 Prerequisites
- List all required tools, access, and dependencies

## 🏗️ Infrastructure Setup
- Cloud/server setup steps
- Network configuration
- Security setup

## 🗄️ Database Setup
- Database installation/configuration
- Schema creation/migration
- Connection setup

## 🚀 Application Deployment
1. **Build Steps**
   \`\`\`bash
   # Build commands
   \`\`\`

2. **Deploy Steps**
   \`\`\`bash
   # Deployment commands
   \`\`\`

3. **Configuration**
   \`\`\`bash
   # Configuration commands
   \`\`\`

## ⚙️ Configuration Files

### .env (Environment Variables)
\`\`\`
KEY=value
\`\`\`

### docker-compose.yml (if applicable)
\`\`\`yaml
# Docker configuration
\`\`\`

## 🔍 Health Checks & Verification
\`\`\`bash
# Health check commands
\`\`\`

## 🔄 Rollback Procedure
\`\`\`bash
# Rollback commands (in reverse order)
\`\`\`

## 🛠️ Troubleshooting
- Common issues and solutions

## 📖 Reference ADRs
- Links to relevant ADRs
\`\`\`

## Analysis Requirements

- **Be specific**: Include actual commands, ports, and configurations
- **Environment-aware**: Tailor guidance for ${environment}
- **Security-focused**: Include security best practices
- **Actionable**: Every step should be executable
- **Complete**: Cover entire deployment lifecycle
- **Evidence-based**: Base all recommendations on ADR content

${
  technologyFilter && technologyFilter.length > 0
    ? `
## Technology Filter
Focus only on these technologies: ${technologyFilter.join(', ')}
`
    : ''
}

${
  customRequirements && customRequirements.length > 0
    ? `
## Custom Requirements
Additionally address these requirements:
${customRequirements.map(req => `- ${req}`).join('\n')}
`
    : ''
}

Begin deployment guidance generation now.
`;

    // Return the prompt for AI execution
    return {
      content: [
        {
          type: 'text',
          text: `# Deployment Guidance Generation

## Analysis Complete
- **Found ${discoveryResult.adrs.length} ADRs** for deployment analysis
- **Target Environment**: ${environment}
- **Format**: ${format}
- **Include Scripts**: ${includeScripts}
- **Include Configs**: ${includeConfigs}
- **Include Validation**: ${includeValidation}
- **Include Rollback**: ${includeRollback}

## AI Analysis Prompt

${deploymentPrompt}

## Instructions

1. **Submit the prompt above** to an AI agent for comprehensive deployment guidance
2. **Review the generated guidance** for completeness and accuracy
3. **Customize configurations** for your specific environment
4. **Test deployment steps** in staging before production
5. **Save guidance** as DEPLOYMENT.md or similar documentation

## Expected Output

The AI will generate:
- **Step-by-step deployment instructions**
- **Environment-specific configurations**
- **Shell scripts and configuration files**
- **Health checks and validation procedures**
- **Rollback procedures**
- **Troubleshooting guidance**

All based on the architectural decisions documented in your ADRs.

${
  generateFiles
    ? `
## File Generation Mode
**Note**: File generation is enabled. The AI guidance will include instructions for creating actual deployment files in your project.
`
    : ''
}

## ADR Sources
${discoveryResult.adrs.map(adr => `- **${adr.title}** (${adr.filename})`).join('\n')}
`,
        },
      ],
    };
  } catch (error) {
    throw new McpAdrError(
      `Deployment guidance generation failed: ${error instanceof Error ? error.message : String(error)}`,
      'DEPLOYMENT_GUIDANCE_ERROR'
    );
  }
}
