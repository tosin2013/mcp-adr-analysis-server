/**
 * Validated Pattern Prompts
 *
 * Prompts for guiding LLMs through validated pattern selection,
 * integration, and deployment using industry best practices
 */

import type { ValidatedPattern, PlatformType } from '../utils/validated-pattern-definitions.js';

/**
 * Generate pattern selection guidance prompt
 */
export function generatePatternSelectionPrompt(args: {
  projectContext?: string;
  detectedPlatforms?: PlatformType[];
  requirements?: string;
}): string {
  const { projectContext = '', detectedPlatforms = [], requirements = '' } = args;

  return `# Validated Pattern Selection Guide

You are an expert platform architect helping to select the most appropriate validated deployment pattern for a project.

## Current Project Context
${projectContext || 'No specific context provided. Analyze the project to determine context.'}

${detectedPlatforms.length > 0 ? `## Detected Platforms\nThe following platforms have been detected in the project:\n${detectedPlatforms.map(p => `- ${p}`).join('\n')}` : ''}

${requirements ? `## Requirements\n${requirements}` : ''}

## Available Validated Patterns

The following validated patterns are available:
- **OpenShift**: GitOps-based deployment with ArgoCD and Helm
- **Kubernetes**: Declarative deployment with Helm charts and blue/green strategy
- **Docker**: Multi-stage builds with security best practices
- **Node.js**: Microservices deployment with PM2 process management
- **Python**: WSGI/ASGI server deployment with virtual environments
- **MCP**: Model Context Protocol server with STDIO/HTTP transports
- **A2A**: Agent-to-Agent protocol with OAuth authentication

## Pattern Selection Criteria

For each pattern, consider:

1. **Platform Match**: Does the project use this platform?
2. **Bill of Materials**: Are the required dependencies available?
3. **Deployment Phases**: Do the deployment steps align with requirements?
4. **Validation Checks**: Are the validation criteria appropriate?
5. **Authoritative Sources**: Are there official docs to reference?

## Your Task

1. **Analyze the Project**: Review the project structure and technologies
2. **Identify Matching Patterns**: Determine which patterns apply
3. **Recommend Primary Pattern**: Select the best-fit pattern
4. **Explain Rationale**: Provide clear reasoning for your selection
5. **List Integration Steps**: Outline high-level integration approach

## Resource Access

Use these MCP resources to access validated pattern details:
- \`adr://validated_patterns\` - Complete pattern catalog
- \`adr://validated_pattern/{platform}\` - Individual pattern details
- \`adr://pattern_sources/{platform}\` - Authoritative documentation sources
- \`adr://pattern_base_code/{platform}\` - Base code repository integration

## Output Format

Provide your recommendation in the following format:

### Selected Pattern
[Pattern Name]

### Rationale
[Clear explanation of why this pattern was selected]

### Integration Approach
[High-level steps for integration]

### Authoritative Sources to Query
[List of sources the LLM should reference before implementation]

### Risk Considerations
[Potential challenges and mitigation strategies]
`;
}

/**
 * Generate pattern integration guide prompt
 */
export function generatePatternIntegrationPrompt(args: {
  pattern: ValidatedPattern;
  targetProjectPath: string;
  existingInfrastructure?: string;
}): string {
  const { pattern, targetProjectPath, existingInfrastructure = 'Unknown' } = args;

  return `# ${pattern.name} Integration Guide

You are implementing the validated pattern: **${pattern.name}** for platform: **${pattern.platformType}**

## Pattern Overview
${pattern.description}

**Source**: ${pattern.metadata.source}
**Last Updated**: ${pattern.metadata.lastUpdated}

## Target Project
**Path**: \`${targetProjectPath}\`
**Existing Infrastructure**: ${existingInfrastructure}

## Critical: Base Code Repository Integration

⚠️ **IMPORTANT**: Before generating any deployment scripts, you MUST integrate the base code repository:

**Repository**: ${pattern.baseCodeRepository.url}
**Purpose**: ${pattern.baseCodeRepository.purpose}

### Integration Instructions
${pattern.baseCodeRepository.integrationInstructions}

### Required Files to Integrate
${pattern.baseCodeRepository.requiredFiles.map((f, i) => `${i + 1}. \`${f}\``).join('\n')}

${pattern.baseCodeRepository.scriptEntrypoint ? `### Script Entrypoint\nYour bootstrap script should call: \`${pattern.baseCodeRepository.scriptEntrypoint}\`\n` : ''}

## Bill of Materials

### Dependencies
${pattern.billOfMaterials.dependencies
  .map(
    dep => `- **${dep.name}** (${dep.type}${dep.required ? ', REQUIRED' : ', optional'})
  ${dep.version ? `- Version: ${dep.version}` : ''}
  ${dep.installCommand ? `- Install: \`${dep.installCommand}\`` : ''}
  ${dep.verificationCommand ? `- Verify: \`${dep.verificationCommand}\`` : ''}
  ${dep.alternativeOptions ? `- Alternatives: ${dep.alternativeOptions.join(', ')}` : ''}`
  )
  .join('\n\n')}

### Configurations
${pattern.billOfMaterials.configurations
  .map(
    cfg => `- **${cfg.path}**
  - Purpose: ${cfg.purpose}
  - Required: ${cfg.required ? 'Yes' : 'No'}
  - Auto-generate: ${cfg.canAutoGenerate ? 'Yes' : 'No'}`
  )
  .join('\n\n')}

${
  pattern.billOfMaterials.secrets.length > 0
    ? `### Secrets
${pattern.billOfMaterials.secrets
  .map(
    sec => `- **${sec.name}**
  - Purpose: ${sec.purpose}
  - Required: ${sec.required ? 'Yes' : 'No'}
  ${sec.environmentVariable ? `- Environment Variable: \`${sec.environmentVariable}\`` : ''}
  ${sec.vaultPath ? `- Vault Path: \`${sec.vaultPath}\`` : ''}`
  )
  .join('\n\n')}`
    : ''
}

${
  pattern.billOfMaterials.infrastructure.length > 0
    ? `### Infrastructure
${pattern.billOfMaterials.infrastructure
  .map(
    infra => `- **${infra.component}**
  - Purpose: ${infra.purpose}
  - Required: ${infra.required ? 'Yes' : 'No'}
  ${infra.minimumVersion ? `- Minimum Version: ${infra.minimumVersion}` : ''}
  ${infra.alternatives ? `- Alternatives: ${infra.alternatives.join(', ')}` : ''}`
  )
  .join('\n\n')}`
    : ''
}

## Deployment Phases

${pattern.deploymentPhases
  .map(
    phase => `### Phase ${phase.order}: ${phase.name}
**Estimated Duration**: ${phase.estimatedDuration}
**Can Parallelize**: ${phase.canParallelize ? 'Yes' : 'No'}
${phase.prerequisites.length > 0 ? `**Prerequisites**: ${phase.prerequisites.join(', ')}` : '**Prerequisites**: None'}

**Description**: ${phase.description}

**Commands**:
${phase.commands
  .map(
    (cmd, i) => `${i + 1}. ${cmd.description}
   \`\`\`bash
   ${cmd.command}
   \`\`\`
   Expected Exit Code: ${cmd.expectedExitCode}
   ${cmd.timeout ? `Timeout: ${cmd.timeout}ms` : ''}`
  )
  .join('\n\n')}`
  )
  .join('\n\n')}

## Validation Checks

${pattern.validationChecks
  .map(
    check => `### ${check.name} (${check.severity})
**ID**: \`${check.id}\`
**Description**: ${check.description}

**Check Command**:
\`\`\`bash
${check.command}
\`\`\`
Expected Exit Code: ${check.expectedExitCode}
${check.expectedOutput ? `Expected Output: ${check.expectedOutput}` : ''}

**If Validation Fails**: ${check.failureMessage}

**Remediation Steps**:
${check.remediationSteps.map((step, i) => `${i + 1}. ${step}`).join('\n')}`
  )
  .join('\n\n')}

## Authoritative Sources to Query

⚠️ **CRITICAL**: Before implementing, query these authoritative sources for latest information:

${pattern.authoritativeSources
  .sort((a, b) => b.priority - a.priority)
  .map(
    source => `### ${source.type.toUpperCase()}: ${source.url}
**Priority**: ${source.priority}/10
**Required for Deployment**: ${source.requiredForDeployment ? 'YES ⚠️' : 'No'}

**Purpose**: ${source.purpose}

**Query Instructions**:
${source.queryInstructions}`
  )
  .join('\n\n')}

## Implementation Workflow

1. **Query Authoritative Sources**: Start by reviewing the high-priority sources listed above
2. **Integrate Base Code**: Clone/merge the base code repository as instructed
3. **Verify Dependencies**: Check all bill of materials requirements
4. **Configure Secrets**: Set up required secrets and environment variables
5. **Execute Deployment Phases**: Follow phases in order, respecting prerequisites
6. **Run Validation Checks**: Execute all validation checks, especially critical ones
7. **Monitor Health**: Set up health checks for ongoing monitoring

## Important Notes

- **DO NOT skip querying authoritative sources** - they contain the latest patterns and best practices
- **DO NOT generate scripts without integrating base code** - the base repository provides the framework
- **DO validate at each phase** - zero-tolerance for failed validations
- **DO respect prerequisites** - deployment phases have dependencies
- **DO use exact commands** - these are production-tested commands

## Next Steps

1. Review the authoritative sources (especially those marked as required)
2. Integrate the base code repository
3. Begin Phase 1 deployment
4. Execute validation checks after each phase
`;
}

/**
 * Generate pattern troubleshooting prompt
 */
export function generatePatternTroubleshootingPrompt(args: {
  pattern: ValidatedPattern;
  failedPhase?: string;
  failedValidation?: string;
  errorMessage?: string;
}): string {
  const { pattern, failedPhase, failedValidation, errorMessage } = args;

  return `# ${pattern.name} Troubleshooting Guide

## Issue Context
${failedPhase ? `**Failed Phase**: ${failedPhase}` : ''}
${failedValidation ? `**Failed Validation**: ${failedValidation}` : ''}
${errorMessage ? `**Error Message**:\n\`\`\`\n${errorMessage}\n\`\`\`\n` : ''}

## Validated Pattern Information
**Pattern**: ${pattern.name}
**Platform**: ${pattern.platformType}
**Source**: ${pattern.metadata.source}

${
  failedValidation
    ? `## Validation Details

${pattern.validationChecks
  .filter(check => check.name === failedValidation || check.id === failedValidation)
  .map(
    check => `### ${check.name}
**Severity**: ${check.severity}
**Description**: ${check.description}

**Check Command**:
\`\`\`bash
${check.command}
\`\`\`

**Expected**: Exit code ${check.expectedExitCode}${check.expectedOutput ? `, output: ${check.expectedOutput}` : ''}

**Failure Message**: ${check.failureMessage}

**Remediation Steps**:
${check.remediationSteps.map((step, i) => `${i + 1}. ${step}`).join('\n')}`
  )
  .join('\n\n')}
`
    : ''
}

${
  failedPhase
    ? `## Deployment Phase Details

${pattern.deploymentPhases
  .filter(phase => phase.name === failedPhase)
  .map(
    phase => `### Phase ${phase.order}: ${phase.name}
**Description**: ${phase.description}
**Estimated Duration**: ${phase.estimatedDuration}

${
  phase.rollbackCommands
    ? `**Rollback Commands Available**:
${phase.rollbackCommands
  .map(
    (cmd, i) => `${i + 1}. ${cmd.description}
   \`\`\`bash
   ${cmd.command}
   \`\`\``
  )
  .join('\n\n')}`
    : '**No automatic rollback** - manual intervention required'
}
`
  )
  .join('\n\n')}
`
    : ''
}

## Troubleshooting Workflow

1. **Review Error Logs**: Check system logs for detailed error information
2. **Verify Prerequisites**: Ensure all prerequisites from earlier phases are satisfied
3. **Check Dependencies**: Verify all bill of materials dependencies are installed
4. **Consult Authoritative Sources**: Review the pattern's authoritative sources for updates
5. **Execute Remediation**: Follow the remediation steps provided
6. **Validate Fix**: Re-run validation checks to confirm resolution

## Authoritative Sources for Help

${pattern.authoritativeSources
  .sort((a, b) => b.priority - a.priority)
  .slice(0, 3)
  .map(
    source => `- **${source.url}** (Priority: ${source.priority}/10)
  ${source.purpose}`
  )
  .join('\n')}

## Common Issues and Solutions

Based on the validated pattern, check for these common issues:
- Missing or incorrect environment variables
- Insufficient permissions
- Network connectivity issues
- Incorrect version dependencies
- Configuration file syntax errors

## Recovery Steps

1. If rollback commands are available, execute them
2. Review and correct the configuration
3. Re-execute the failed phase
4. Monitor closely for similar issues
`;
}
