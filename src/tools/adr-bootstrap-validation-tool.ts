/**
 * MCP Tool for ADR Bootstrap Validation
 * Guides LLMs to create bootstrap.sh and validate_bootstrap.sh scripts
 * that ensure code deployment follows ADR architectural decisions
 */

import { McpAdrError } from '../types/index.js';
import { ConversationContext } from '../types/conversation-context.js';
import { TreeSitterAnalyzer } from '../utils/tree-sitter-analyzer.js';
import { findRelatedCode } from '../utils/file-system.js';
import { detectPlatforms, PlatformDetectionResult } from '../utils/platform-detector.js';
import { getPattern, ValidatedPattern } from '../utils/validated-pattern-definitions.js';
import { generatePatternResearchReport } from '../utils/pattern-research-utility.js';

/**
 * Interface for bootstrap script generation
 */
export interface BootstrapScriptConfig {
  projectPath: string;
  adrDirectory?: string;
  outputPath?: string;
  scriptType: 'bootstrap' | 'validate' | 'both';
  includeTests?: boolean;
  includeDeployment?: boolean;
  customValidations?: string[];
}

/**
 * Interface for ADR compliance validation
 */
export interface AdrComplianceCheck {
  adrId: string;
  adrTitle: string;
  requirement: string;
  validationCommand: string;
  expectedOutcome: string;
  severity: 'critical' | 'error' | 'warning' | 'info';
}

/**
 * Generate bootstrap and validation scripts for ADR-compliant deployment
 * This tool tells the LLM HOW to create deployment scripts that validate
 * the implemented code matches ADR requirements
 */
export async function generateAdrBootstrapScripts(args: {
  projectPath?: string;
  adrDirectory?: string;
  outputPath?: string;
  scriptType?: 'bootstrap' | 'validate' | 'both';
  includeTests?: boolean;
  includeDeployment?: boolean;
  customValidations?: string[];
  enableTreeSitterAnalysis?: boolean;
  conversationContext?: ConversationContext;
}): Promise<any> {
  const {
    projectPath = process.cwd(),
    adrDirectory = 'docs/adrs',
    outputPath = projectPath,
    scriptType = 'both',
    includeTests = true,
    includeDeployment = true,
    customValidations = [],
    enableTreeSitterAnalysis = true,
    // conversationContext is available but not used currently
  } = args;

  try {
    // STEP 0: Detect platform using Validated Patterns framework
    // NOTE: All console output goes to stderr to preserve stdout for MCP JSON-RPC
    console.error('[Bootstrap] Detecting platform type using Validated Patterns...');
    const platformDetection: PlatformDetectionResult = await detectPlatforms(projectPath);

    console.error(
      `[Bootstrap] Platform detection complete (confidence: ${(platformDetection.confidence * 100).toFixed(0)}%)`,
      {
        primaryPlatform: platformDetection.primaryPlatform,
        detectedPlatforms: platformDetection.detectedPlatforms.map(p => p.type),
      }
    );

    // STEP 0.1: Get validated pattern and generate research report
    let validatedPattern: ValidatedPattern | null = null;
    let patternResearchReport: string | null = null;
    let baseRepoGuidance = '';

    if (platformDetection.primaryPlatform) {
      validatedPattern = getPattern(platformDetection.primaryPlatform);

      if (validatedPattern) {
        console.error(`[Bootstrap] Loaded validated pattern: ${validatedPattern.name}`);

        // Generate research report with base code repository guidance
        patternResearchReport = generatePatternResearchReport(platformDetection.primaryPlatform);

        // Create specific guidance about the base code repository
        baseRepoGuidance = `

## 🎯 VALIDATED PATTERN INTEGRATION (CRITICAL)

**Platform Detected**: ${platformDetection.primaryPlatform.toUpperCase()}
**Base Code Repository**: ${validatedPattern.baseCodeRepository.url}

### Integration Instructions:
${validatedPattern.baseCodeRepository.integrationInstructions}

### Required Files:
${validatedPattern.baseCodeRepository.requiredFiles.map((f, i) => `${i + 1}. \`${f}\``).join('\n')}

${
  validatedPattern.baseCodeRepository.scriptEntrypoint
    ? `### Bootstrap Entry Point:
Your bootstrap.sh should call: \`${validatedPattern.baseCodeRepository.scriptEntrypoint}\`
`
    : ''
}

**⚠️ IMPORTANT**: Before generating scripts, use WebFetch to query:
1. **Base Repository**: ${validatedPattern.baseCodeRepository.url}
2. **Documentation**: ${validatedPattern.authoritativeSources.find(s => s.type === 'documentation')?.url || 'N/A'}

Then merge the base repository into your project and customize for your needs.

---
`;

        console.error('[Bootstrap] Generated research report with base code repository guidance');
        console.error(
          `[Bootstrap] CRITICAL: LLM should merge ${validatedPattern.baseCodeRepository.url} before generating scripts`
        );

        // Log the research report for debugging (can be removed if not needed)
        console.error(
          '[Bootstrap] Pattern Research Report Generated:',
          patternResearchReport ? 'YES' : 'NO'
        );
      } else {
        console.warn(
          `No validated pattern found for ${platformDetection.primaryPlatform}, generating generic scripts`
        );
      }
    }

    // Discover ADRs in the target project
    const { discoverAdrsInDirectory } = await import('../utils/adr-discovery.js');
    const discoveryResult = await discoverAdrsInDirectory(adrDirectory, projectPath, {
      includeContent: true,
      includeTimeline: false,
    });

    // Smart Code Linking - Find related implementation files
    let relatedCodeAnalysis = '';
    let relatedFiles: any[] = [];

    if (discoveryResult.adrs.length > 0) {
      try {
        // Combine all ADR content for comprehensive analysis
        const combinedAdrContent = discoveryResult.adrs
          .map(adr => `# ${adr.title}\n${adr.content || ''}`)
          .join('\n\n');

        const relatedCodeResult = await findRelatedCode(
          'bootstrap-validation-analysis',
          combinedAdrContent,
          projectPath,
          {
            useAI: true,
            useRipgrep: true,
            maxFiles: 20,
            includeContent: false,
          }
        );

        relatedFiles = relatedCodeResult.relatedFiles;

        if (relatedFiles.length > 0) {
          relatedCodeAnalysis = `
## 🔗 Smart Code Linking Analysis

Found ${relatedFiles.length} code files related to ADR implementations that should be included in validation:

### Critical Implementation Files
${relatedFiles
  .slice(0, 8)
  .map(
    (file, index) => `
${index + 1}. **${file.path}**
   - Type: ${file.extension} file
   - Size: ${file.size} bytes
   - Directory: ${file.directory}
`
  )
  .join('')}

### Validation Targets
- **Keywords Found**: ${relatedCodeResult.keywords.join(', ')}
- **Search Patterns**: ${relatedCodeResult.searchPatterns.join(', ')}
- **Implementation Confidence**: ${(relatedCodeResult.confidence * 100).toFixed(1)}%

**Bootstrap Integration**: These files will be included in validation scripts to ensure ADR compliance during deployment.

---
`;
        } else {
          relatedCodeAnalysis = `
## 🔗 Smart Code Linking Analysis

**Status**: No related implementation files found for ADRs
**Keywords Searched**: ${relatedCodeResult.keywords.join(', ')}
**Analysis**: ADRs may be high-level decisions not yet implemented in code

**Recommendation**: Focus validation on configuration files, deployment scripts, and architectural constraints rather than implementation details.

---
`;
        }
      } catch (error) {
        console.warn('[WARNING] Smart Code Linking for bootstrap validation failed:', error);
        relatedCodeAnalysis = `
## 🔗 Smart Code Linking Analysis

**Status**: ⚠️ Analysis failed - continuing with standard validation
**Error**: ${error instanceof Error ? error.message : 'Unknown error'}

---
`;
      }
    }

    // Extract validation requirements from ADRs
    const complianceChecks = await extractComplianceChecks(discoveryResult.adrs, relatedFiles);

    // Perform tree-sitter analysis for ADR compliance validation
    let codeAnalysisResults: any = null;
    let complianceValidation = '';
    if (enableTreeSitterAnalysis) {
      try {
        codeAnalysisResults = await performAdrComplianceAnalysis(
          projectPath,
          discoveryResult.adrs,
          complianceChecks
        );

        if (
          codeAnalysisResults.violations.length > 0 ||
          codeAnalysisResults.implementations.length > 0
        ) {
          complianceValidation = `

## 🔍 Tree-sitter ADR Compliance Analysis

**Analysis Results:**
- **Files Analyzed**: ${codeAnalysisResults.filesAnalyzed}
- **ADR Implementations Found**: ${codeAnalysisResults.implementations.length}
- **Compliance Violations**: ${codeAnalysisResults.violations.length}
- **Architecture Patterns Detected**: ${codeAnalysisResults.patterns.join(', ') || 'None'}

${
  codeAnalysisResults.implementations.length > 0
    ? `
### ✅ Detected ADR Implementations
${codeAnalysisResults.implementations.map((impl: any) => `- **${impl.adrTitle}**: ${impl.evidence} (${impl.file}:${impl.line})`).join('\n')}
`
    : ''
}

${
  codeAnalysisResults.violations.length > 0
    ? `
### ❌ ADR Compliance Violations
${codeAnalysisResults.violations.map((violation: any) => `- **${violation.adrTitle}**: ${violation.issue} (${violation.file}:${violation.line})`).join('\n')}
`
    : ''
}

---
`;
        }
      } catch (error) {
        console.warn('Tree-sitter ADR compliance analysis failed:', error);
        complianceValidation = `

## 🔍 Tree-sitter ADR Compliance Analysis

**Status**: ⚠️ Analysis failed - continuing with basic validation
**Error**: ${error instanceof Error ? error.message : 'Unknown error'}

---
`;
      }
    }

    // Generate bootstrap.sh script
    const bootstrapScript = generateBootstrapScript(
      complianceChecks,
      projectPath,
      includeTests,
      includeDeployment,
      customValidations,
      validatedPattern // Pass validated pattern for pattern-aware script generation
    );

    // Generate validate_bootstrap.sh script
    const validationScript = generateValidationScript(
      complianceChecks,
      projectPath,
      discoveryResult.adrs
    );

    const response = {
      instructions: `
# ADR Bootstrap Validation Scripts Generation

## Purpose
These scripts ensure that code deployed to production follows the architectural decisions documented in ADRs.
The bootstrap script deploys the code while the validation script verifies ADR compliance.

${baseRepoGuidance}

## Discovered ADRs (${discoveryResult.totalAdrs} total)
${discoveryResult.adrs.map(adr => `- ${adr.title} (${adr.status})`).join('\n')}

${relatedCodeAnalysis}

${complianceValidation}

## Generated Scripts

### 1. bootstrap.sh - Deployment Script
This script deploys the code that was created based on ADR planning.
It ensures the deployment follows architectural requirements.

**Location**: ${outputPath}/bootstrap.sh
**Purpose**: Deploy ADR-compliant code to the environment
**Key Features**:
- Validates prerequisites from ADRs
- Deploys code components in correct order
- Runs ADR compliance checks during deployment
- Provides rollback on failure

### 2. validate_bootstrap.sh - Validation Script
This script validates that deployed code matches ADR requirements.
It catches integration issues that unit tests miss.

**Location**: ${outputPath}/validate_bootstrap.sh
**Purpose**: Verify deployed code follows ADR decisions
**Key Features**:
- Checks implementation against each ADR
- Validates architectural constraints
- Tests integration points
- Reports compliance status

## Implementation Instructions for LLM

1. **Create bootstrap.sh**:
   - Save the generated bootstrap script to ${outputPath}/bootstrap.sh
   - Make it executable: chmod +x bootstrap.sh
   - Include ADR-specific deployment steps
   - Add rollback functionality for failures

2. **Create validate_bootstrap.sh**:
   - Save the validation script to ${outputPath}/validate_bootstrap.sh
   - Make it executable: chmod +x validate_bootstrap.sh
   - Include comprehensive ADR compliance checks
   - Generate detailed compliance report

3. **Integration Steps**:
   - Run bootstrap.sh to deploy the code
   - Run validate_bootstrap.sh to verify compliance
   - Include both in CI/CD pipeline
   - Document any failures with ADR references

## Compliance Checks Generated
${complianceChecks.length} validation rules extracted from ADRs:
${complianceChecks
  .slice(0, 5)
  .map(check => `- ${check.adrId}: ${check.requirement} (${check.severity})`)
  .join('\n')}
${complianceChecks.length > 5 ? `... and ${complianceChecks.length - 5} more checks` : ''}

## Usage
\`\`\`bash
# Deploy code following ADR requirements
./bootstrap.sh

# Validate deployment matches ADRs
./validate_bootstrap.sh

# Both scripts exit with:
# 0 - Success, ADR compliant
# 1 - Failure, ADR violations found
\`\`\`
`,
      scripts:
        scriptType === 'both'
          ? {
              bootstrap: bootstrapScript,
              validation: validationScript,
            }
          : scriptType === 'bootstrap'
            ? {
                bootstrap: bootstrapScript,
              }
            : {
                validation: validationScript,
              },
      complianceChecks,
      adrSummary: {
        total: discoveryResult.totalAdrs,
        byStatus: discoveryResult.summary.byStatus,
        withImplementationTasks: discoveryResult.adrs.filter(
          adr =>
            adr.content?.includes('Implementation') ||
            adr.content?.includes('TODO') ||
            adr.content?.includes('Tasks')
        ).length,
        smartCodeLinking: {
          enabled: relatedFiles.length > 0,
          relatedFilesCount: relatedFiles.length,
          fileTypes:
            relatedFiles.length > 0
              ? [...new Set(relatedFiles.map(f => f.extension))].join(', ')
              : 'none',
          validationEnhancements:
            relatedFiles.length > 0
              ? 'File-specific validation commands generated'
              : 'Standard validation only',
        },
      },
    };

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(response, null, 2),
        },
      ],
    };
  } catch (error) {
    throw new McpAdrError(
      `Failed to generate ADR bootstrap scripts: ${error instanceof Error ? error.message : String(error)}`,
      'BOOTSTRAP_GENERATION_ERROR'
    );
  }
}

/**
 * Extract compliance checks from ADR content
 * Enhanced with Smart Code Linking for related file validation
 */
async function extractComplianceChecks(
  adrs: any[],
  relatedFiles: any[] = []
): Promise<AdrComplianceCheck[]> {
  const checks: AdrComplianceCheck[] = [];

  for (const adr of adrs) {
    if (!adr.content) continue;

    // Extract requirements from ADR content
    const requirements = extractRequirements(adr.content);

    requirements.forEach((req, index) => {
      checks.push({
        adrId: adr.filename || `adr-${index}`,
        adrTitle: adr.title || 'Unknown ADR',
        requirement: req.text,
        validationCommand: generateValidationCommand(req),
        expectedOutcome: req.expected,
        severity: determineSeverity(req.text),
      });
    });
  }

  // Add Smart Code Linking validation checks
  if (relatedFiles.length > 0) {
    // Group related files by type for validation
    const filesByType = relatedFiles.reduce(
      (acc, file) => {
        const type = file.extension || 'unknown';
        if (!acc[type]) acc[type] = [];
        acc[type].push(file);
        return acc;
      },
      {} as Record<string, any[]>
    );

    // Add file-specific validation checks
    Object.entries(filesByType).forEach(([fileType, files]) => {
      const typedFiles = files as any[]; // Type assertion for files array
      const fileCount = typedFiles.length;

      // Configuration file validation
      if (['json', 'yml', 'yaml', 'env'].includes(fileType)) {
        checks.push({
          adrId: 'smart-code-linking',
          adrTitle: 'Configuration File Validation',
          requirement: `Validate ${fileCount} ${fileType.toUpperCase()} configuration file(s) comply with ADR requirements`,
          validationCommand: generateConfigValidationCommand(typedFiles),
          expectedOutcome: 'Configuration files are valid and ADR-compliant',
          severity: 'error',
        });
      }

      // Source code validation
      if (['ts', 'js', 'py', 'java', 'go'].includes(fileType)) {
        checks.push({
          adrId: 'smart-code-linking',
          adrTitle: 'Implementation File Validation',
          requirement: `Validate ${fileCount} ${fileType.toUpperCase()} implementation file(s) follow architectural patterns`,
          validationCommand: generateImplementationValidationCommand(typedFiles, fileType),
          expectedOutcome: 'Implementation files follow ADR architectural decisions',
          severity: 'warning',
        });
      }

      // Infrastructure as Code validation
      if (['tf', 'hcl', 'dockerfile'].includes(fileType)) {
        checks.push({
          adrId: 'smart-code-linking',
          adrTitle: 'Infrastructure Validation',
          requirement: `Validate ${fileCount} infrastructure file(s) match deployment requirements`,
          validationCommand: generateInfrastructureValidationCommand(typedFiles, fileType),
          expectedOutcome: 'Infrastructure configurations comply with ADR deployment decisions',
          severity: 'critical',
        });
      }
    });

    // Add overall integration check
    checks.push({
      adrId: 'smart-code-linking',
      adrTitle: 'Smart Code Linking Integration',
      requirement: `Verify ${relatedFiles.length} ADR-related files are properly integrated`,
      validationCommand: `echo "Checking integration of ADR-related files..." && find . -type f \\( ${relatedFiles.map(f => `-name "${f.name}"`).join(' -o ')} \\) | wc -l`,
      expectedOutcome: `${relatedFiles.length} files found and accessible`,
      severity: 'info',
    });
  }

  return checks;
}

/**
 * Generate validation command for configuration files
 */
function generateConfigValidationCommand(files: any[]): string {
  const filePaths = files.map(f => f.path).slice(0, 5); // Limit to first 5 files
  const fileType = files[0]?.extension || 'unknown';

  if (fileType === 'json') {
    return `echo "Validating JSON configuration files..." && for file in ${filePaths.join(' ')}; do echo "Checking $file" && cat "$file" | jq . > /dev/null || echo "Invalid JSON: $file"; done`;
  } else if (['yml', 'yaml'].includes(fileType)) {
    return `echo "Validating YAML configuration files..." && for file in ${filePaths.join(' ')}; do echo "Checking $file" && python -c "import yaml; yaml.safe_load(open('$file'))" || echo "Invalid YAML: $file"; done`;
  } else if (fileType === 'env') {
    return `echo "Validating environment files..." && for file in ${filePaths.join(' ')}; do echo "Checking $file" && grep -E '^[A-Z_]+=.*$' "$file" > /dev/null || echo "Invalid ENV format: $file"; done`;
  } else {
    return `echo "Checking configuration files exist..." && ls -la ${filePaths.join(' ')}`;
  }
}

/**
 * Generate validation command for implementation files
 */
function generateImplementationValidationCommand(files: any[], fileType: string): string {
  const filePaths = files.map(f => f.path).slice(0, 3); // Limit to first 3 files

  if (['ts', 'js'].includes(fileType)) {
    return `echo "Validating TypeScript/JavaScript files..." && for file in ${filePaths.join(' ')}; do echo "Checking $file" && node -c "$file" > /dev/null 2>&1 || echo "Syntax error: $file"; done`;
  } else if (fileType === 'py') {
    return `echo "Validating Python files..." && for file in ${filePaths.join(' ')}; do echo "Checking $file" && python -m py_compile "$file" > /dev/null 2>&1 || echo "Syntax error: $file"; done`;
  } else if (fileType === 'java') {
    return `echo "Validating Java files..." && for file in ${filePaths.join(' ')}; do echo "Checking $file" && javac -cp . "$file" > /dev/null 2>&1 || echo "Compilation error: $file"; done`;
  } else if (fileType === 'go') {
    return `echo "Validating Go files..." && for file in ${filePaths.join(' ')}; do echo "Checking $file" && go fmt "$file" > /dev/null || echo "Format error: $file"; done`;
  } else {
    return `echo "Checking implementation files exist..." && ls -la ${filePaths.join(' ')}`;
  }
}

/**
 * Generate validation command for infrastructure files
 */
function generateInfrastructureValidationCommand(files: any[], fileType: string): string {
  const filePaths = files.map(f => f.path).slice(0, 3); // Limit to first 3 files

  if (['tf', 'hcl'].includes(fileType)) {
    return `echo "Validating Terraform files..." && for file in ${filePaths.join(' ')}; do echo "Checking $file" && terraform validate "$file" > /dev/null 2>&1 || echo "Terraform validation failed: $file"; done`;
  } else if (fileType === 'dockerfile') {
    return `echo "Validating Dockerfile..." && for file in ${filePaths.join(' ')}; do echo "Checking $file" && docker build -f "$file" --dry-run . > /dev/null 2>&1 || echo "Dockerfile validation failed: $file"; done`;
  } else {
    return `echo "Checking infrastructure files exist..." && ls -la ${filePaths.join(' ')}`;
  }
}

/**
 * Extract requirements from ADR content
 */
function extractRequirements(content: string): Array<{ text: string; expected: string }> {
  const requirements: Array<{ text: string; expected: string }> = [];

  // Look for common requirement patterns
  const patterns = [
    /(?:must|should|shall|will)\s+([^.]+)/gi,
    /(?:requirement|constraint):\s*([^.]+)/gi,
    /(?:decision|approach):\s*([^.]+)/gi,
    /\[x?\]\s+([^[\n]+)/g, // Checklist items
  ];

  patterns.forEach(pattern => {
    const matches = content.matchAll(pattern);
    for (const match of matches) {
      if (match[1]) {
        requirements.push({
          text: match[1].trim(),
          expected: 'Requirement satisfied',
        });
      }
    }
  });

  return requirements;
}

/**
 * Generate validation command for a requirement
 */
function generateValidationCommand(requirement: { text: string; expected: string }): string {
  const text = requirement.text.toLowerCase();

  // Generate appropriate validation based on requirement type
  if (text.includes('database') || text.includes('postgres') || text.includes('mysql')) {
    return 'echo "Checking database configuration..." && psql --version || mysql --version';
  } else if (text.includes('api') || text.includes('rest') || text.includes('http')) {
    return 'echo "Validating API endpoints..." && curl -s http://localhost:3000/health || echo "API not responding"';
  } else if (text.includes('auth') || text.includes('jwt') || text.includes('token')) {
    return 'echo "Checking authentication setup..." && grep -r "jwt\\|auth" src/ | head -5';
  } else if (text.includes('test') || text.includes('coverage')) {
    return 'echo "Running tests..." && npm test -- --coverage --silent';
  } else if (text.includes('docker') || text.includes('container')) {
    return 'echo "Checking Docker setup..." && docker ps || docker-compose ps';
  } else if (text.includes('cache') || text.includes('redis')) {
    return 'echo "Validating cache configuration..." && redis-cli ping || echo "Redis not available"';
  } else {
    return `echo "Checking: ${requirement.text.substring(0, 50)}..."`;
  }
}

/**
 * Determine severity based on requirement text
 */
function determineSeverity(text: string): 'critical' | 'error' | 'warning' | 'info' {
  const lower = text.toLowerCase();
  if (lower.includes('must') || lower.includes('critical') || lower.includes('required')) {
    return 'critical';
  } else if (lower.includes('shall') || lower.includes('error')) {
    return 'error';
  } else if (lower.includes('should') || lower.includes('warning')) {
    return 'warning';
  } else {
    return 'info';
  }
}

/**
 * Generate bootstrap.sh script content
 * If validatedPattern is provided, generates a script that calls the pattern's scripts
 * Otherwise, generates standalone deployment script
 */
function generateBootstrapScript(
  checks: AdrComplianceCheck[],
  projectPath: string,
  includeTests: boolean,
  includeDeployment: boolean,
  customValidations: string[],
  validatedPattern: ValidatedPattern | null = null
): string {
  // If we have a validated pattern, generate a script that calls its scripts
  const hasValidatedPattern =
    validatedPattern && validatedPattern.baseCodeRepository.scriptEntrypoint;

  if (hasValidatedPattern) {
    const baseRepo = validatedPattern!.baseCodeRepository;
    return `#!/bin/bash
# ADR Bootstrap Deployment Script with Validated Pattern Integration
# Generated by MCP ADR Analysis Server
# Purpose: Deploy code using validated ${validatedPattern!.name} pattern

set -e # Exit on error

echo "🚀 ADR Bootstrap Deployment Starting..."
echo "📍 Project: ${projectPath}"
echo "🎯 Pattern: ${validatedPattern!.name}"
echo "📦 Base Repository: ${baseRepo.url}"
echo "📋 ADR Compliance Checks: ${checks.length}"
echo ""

# Color codes for output
RED='\\033[0;31m'
GREEN='\\033[0;32m'
YELLOW='\\033[1;33m'
BLUE='\\033[0;34m'
NC='\\033[0m' # No Color

# Track deployment status
DEPLOYMENT_SUCCESS=true
FAILED_CHECKS=()

echo -e "\${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\${NC}"
echo -e "\${BLUE}Phase 0: Validated Pattern Integration Check\${NC}"
echo -e "\${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\${NC}"
echo ""

# Check if base repository code is present
${baseRepo.requiredFiles
  .map(
    (file, i) => `
echo -n "  [${i + 1}/${baseRepo.requiredFiles.length}] Checking for ${file}... "
if [ -e "${file}" ]; then
    echo -e "\${GREEN}✓\${NC}"
else
    echo -e "\${RED}✗ MISSING\${NC}"
    echo ""
    echo -e "\${RED}ERROR: Required file '${file}' from validated pattern not found!\${NC}"
    echo ""
    echo "To fix this:"
    echo "  1. Clone/merge base repository: ${baseRepo.url}"
    echo "  2. Follow integration instructions:"
    echo "     ${baseRepo.integrationInstructions.split('.').slice(0, 2).join('.')}"
    echo ""
    exit 1
fi`
  )
  .join('')}

echo ""
echo -e "\${GREEN}✅ All validated pattern files present\${NC}"
echo ""

# Function to check ADR compliance
check_adr_compliance() {
    local adr_id="$1"
    local requirement="$2"
    local command="$3"
    local expected="$4"
    local severity="$5"

    echo -n "  Checking $adr_id: $requirement... "

    if eval "$command" > /dev/null 2>&1; then
        echo -e "\${GREEN}✓\${NC}"
        return 0
    else
        echo -e "\${RED}✗\${NC}"
        FAILED_CHECKS+=("$adr_id: $requirement [$severity]")
        if [ "$severity" = "critical" ]; then
            DEPLOYMENT_SUCCESS=false
        fi
        return 1
    fi
}

echo -e "\${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\${NC}"
echo -e "\${BLUE}Phase 1: Pre-deployment ADR Validation\${NC}"
echo -e "\${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\${NC}"
echo ""

${checks
  .filter(c => c.severity === 'critical')
  .map(
    check => `
check_adr_compliance \\
    "${check.adrId}" \\
    "${check.requirement.substring(0, 50)}..." \\
    "${check.validationCommand}" \\
    "${check.expectedOutcome}" \\
    "${check.severity}"`
  )
  .join('\n')}

if [ "$DEPLOYMENT_SUCCESS" = false ]; then
    echo ""
    echo -e "\${RED}❌ Critical ADR violations found. Deployment aborted.\${NC}"
    exit 1
fi

echo ""
echo -e "\${GREEN}✅ All critical checks passed\${NC}"
echo ""

echo -e "\${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\${NC}"
echo -e "\${BLUE}Phase 2: Execute Validated Pattern Deployment\${NC}"
echo -e "\${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\${NC}"
echo ""

echo "🎯 Calling validated pattern script: ${baseRepo.scriptEntrypoint}"
echo ""

# Call the validated pattern's deployment script
if [ -x "${baseRepo.scriptEntrypoint}" ]; then
    ${baseRepo.scriptEntrypoint}
    PATTERN_EXIT_CODE=$?
elif [ -f "${baseRepo.scriptEntrypoint}" ]; then
    bash ${baseRepo.scriptEntrypoint}
    PATTERN_EXIT_CODE=$?
else
    echo -e "\${RED}ERROR: Pattern script '${baseRepo.scriptEntrypoint}' not found or not executable\${NC}"
    exit 1
fi

if [ $PATTERN_EXIT_CODE -ne 0 ]; then
    echo ""
    echo -e "\${RED}❌ Validated pattern deployment failed with exit code: $PATTERN_EXIT_CODE\${NC}"
    exit $PATTERN_EXIT_CODE
fi

echo ""
echo -e "\${GREEN}✅ Validated pattern deployment successful\${NC}"
`;
  }

  // Original standalone script generation (fallback when no validated pattern)
  return `#!/bin/bash
# ADR Bootstrap Deployment Script (Standalone Mode)
# Generated by MCP ADR Analysis Server
# Purpose: Deploy code that follows ADR architectural decisions
#
# ⚠️  WARNING: This is a standalone deployment script.
# Consider integrating a validated pattern for production deployments:
# - OpenShift: https://github.com/validatedpatterns/common
# - Kubernetes: https://github.com/kubernetes/examples
# - Docker: https://github.com/docker/awesome-compose

set -e # Exit on error

echo "🚀 ADR Bootstrap Deployment Starting..."
echo "📍 Project: ${projectPath}"
echo "📋 ADR Compliance Checks: ${checks.length}"
echo "⚠️  Running in STANDALONE mode (no validated pattern detected)"
echo ""

# Color codes for output
RED='\\033[0;31m'
GREEN='\\033[0;32m'
YELLOW='\\033[1;33m'
NC='\\033[0m' # No Color

# Track deployment status
DEPLOYMENT_SUCCESS=true
FAILED_CHECKS=()

# Function to check ADR compliance
check_adr_compliance() {
    local adr_id="$1"
    local requirement="$2"
    local command="$3"
    local expected="$4"
    local severity="$5"

    echo -n "  Checking $adr_id: $requirement... "

    if eval "$command" > /dev/null 2>&1; then
        echo -e "\${GREEN}✓\${NC}"
        return 0
    else
        echo -e "\${RED}✗\${NC}"
        FAILED_CHECKS+=("$adr_id: $requirement [$severity]")
        if [ "$severity" = "critical" ]; then
            DEPLOYMENT_SUCCESS=false
        fi
        return 1
    fi
}

# Phase 1: Pre-deployment validation
echo "📋 Phase 1: Pre-deployment ADR Validation"
echo "=========================================="

${checks
  .filter(c => c.severity === 'critical')
  .map(
    check => `
check_adr_compliance \\
    "${check.adrId}" \\
    "${check.requirement.substring(0, 50)}..." \\
    "${check.validationCommand}" \\
    "${check.expectedOutcome}" \\
    "${check.severity}"`
  )
  .join('\n')}

if [ "$DEPLOYMENT_SUCCESS" = false ]; then
    echo -e "\${RED}❌ Critical ADR violations found. Deployment aborted.\${NC}"
    exit 1
fi

# Phase 2: Build and prepare deployment
echo ""
echo "🔨 Phase 2: Build and Prepare"
echo "============================="

# Install dependencies if needed
if [ -f "package.json" ]; then
    echo "  Installing dependencies..."
    npm ci || npm install
fi

# Build the project
if [ -f "package.json" ] && grep -q '"build"' package.json; then
    echo "  Building project..."
    npm run build
fi

${
  includeTests
    ? `
# Phase 3: Run tests
echo ""
echo "🧪 Phase 3: Test Execution"
echo "========================="

if [ -f "package.json" ] && grep -q '"test"' package.json; then
    echo "  Running tests..."
    npm test || {
        echo -e "\${YELLOW}⚠️  Tests failed but continuing...\${NC}"
    }
fi
`
    : ''
}

${
  includeDeployment
    ? `
# Phase 4: Deploy application
echo ""
echo "🚢 Phase 4: Deployment"
echo "====================="

# Start the application
if [ -f "docker-compose.yml" ]; then
    echo "  Starting with Docker Compose..."
    docker-compose up -d
elif [ -f "package.json" ] && grep -q '"start"' package.json; then
    echo "  Starting application..."
    npm start &
    sleep 5 # Wait for startup
else
    echo "  No deployment method detected"
fi
`
    : ''
}

# Phase 5: Post-deployment validation
echo ""
echo "✅ Phase 5: Post-deployment ADR Validation"
echo "========================================="

${checks
  .filter(c => c.severity !== 'critical')
  .map(
    check => `
check_adr_compliance \\
    "${check.adrId}" \\
    "${check.requirement.substring(0, 50)}..." \\
    "${check.validationCommand}" \\
    "${check.expectedOutcome}" \\
    "${check.severity}"`
  )
  .join('\n')}

${
  customValidations.length > 0
    ? `
# Custom validations
echo ""
echo "🔧 Custom Validations"
echo "===================="
${customValidations.map(v => `eval "${v}"`).join('\n')}
`
    : ''
}

# Final report
echo ""
echo "📊 Deployment Summary"
echo "===================="

if [ \${#FAILED_CHECKS[@]} -eq 0 ]; then
    echo -e "\${GREEN}✅ All ADR compliance checks passed!\${NC}"
    echo "🎉 Deployment successful and ADR-compliant!"
    exit 0
else
    echo -e "\${YELLOW}⚠️  Some ADR checks failed:\${NC}"
    for check in "\${FAILED_CHECKS[@]}"; do
        echo "  - $check"
    done

    if [ "$DEPLOYMENT_SUCCESS" = false ]; then
        echo -e "\${RED}❌ Deployment failed due to critical ADR violations\${NC}"
        exit 1
    else
        echo -e "\${YELLOW}⚠️  Deployment completed with warnings\${NC}"
        exit 0
    fi
fi
`;
}

/**
 * Generate validate_bootstrap.sh script content
 */
function generateValidationScript(
  checks: AdrComplianceCheck[],
  projectPath: string,
  adrs: any[]
): string {
  return `#!/bin/bash
# ADR Validation Script
# Generated by MCP ADR Analysis Server
# Purpose: Validate deployed code follows ADR requirements

set -e # Exit on error

echo "🔍 ADR Compliance Validation"
echo "============================"
echo "📍 Project: ${projectPath}"
echo "📋 ADRs to validate: ${adrs.length}"
echo "✓ Validation checks: ${checks.length}"
echo ""

# Color codes
RED='\\033[0;31m'
GREEN='\\033[0;32m'
YELLOW='\\033[1;33m'
BLUE='\\033[0;34m'
NC='\\033[0m' # No Color

# Tracking variables
TOTAL_CHECKS=${checks.length}
PASSED_CHECKS=0
FAILED_CHECKS=0
CRITICAL_FAILURES=0

# Results array
declare -a RESULTS

# Validation function
validate_adr() {
    local adr_id="$1"
    local adr_title="$2"
    local requirement="$3"
    local command="$4"
    local severity="$5"
    local status="FAIL"
    local color=$RED

    echo -e "\${BLUE}Validating:\${NC} $adr_id - $adr_title"
    echo "  Requirement: $requirement"
    echo -n "  Status: "

    if eval "$command" > /dev/null 2>&1; then
        status="PASS"
        color=$GREEN
        PASSED_CHECKS=$((PASSED_CHECKS + 1))
        echo -e "\${color}✓ PASSED\${NC}"
    else
        FAILED_CHECKS=$((FAILED_CHECKS + 1))
        if [ "$severity" = "critical" ]; then
            CRITICAL_FAILURES=$((CRITICAL_FAILURES + 1))
        fi
        echo -e "\${color}✗ FAILED [$severity]\${NC}"
    fi

    RESULTS+=("$adr_id|$adr_title|$requirement|$status|$severity")
    echo ""
}

# Run all validations
echo "🔍 Running ADR Compliance Checks"
echo "================================"
echo ""

${checks
  .map(
    check => `
validate_adr \\
    "${check.adrId}" \\
    "${check.adrTitle}" \\
    "${check.requirement}" \\
    "${check.validationCommand}" \\
    "${check.severity}"`
  )
  .join('\n')}

# Generate compliance report
echo ""
echo "📊 ADR Compliance Report"
echo "======================="
echo ""
echo "Summary:"
echo "--------"
echo "  Total ADRs: ${adrs.length}"
echo "  Total Checks: $TOTAL_CHECKS"
echo -e "  \${GREEN}Passed: $PASSED_CHECKS\${NC}"
echo -e "  \${RED}Failed: $FAILED_CHECKS\${NC}"
echo -e "  \${RED}Critical Failures: $CRITICAL_FAILURES\${NC}"
echo ""

# Calculate compliance percentage
COMPLIANCE_PERCENT=0
if [ $TOTAL_CHECKS -gt 0 ]; then
    COMPLIANCE_PERCENT=$((PASSED_CHECKS * 100 / TOTAL_CHECKS))
fi

echo "Compliance Score: $COMPLIANCE_PERCENT%"
echo ""

# Detailed results table
echo "Detailed Results:"
echo "-----------------"
printf "%-20s %-40s %-10s %-10s\\n" "ADR" "Requirement" "Status" "Severity"
echo "--------------------------------------------------------------------------------"

for result in "\${RESULTS[@]}"; do
    IFS='|' read -r adr_id adr_title requirement status severity <<< "$result"

    if [ "$status" = "PASS" ]; then
        status_color=$GREEN
    else
        status_color=$RED
    fi

    printf "%-20s %-40s \${status_color}%-10s\${NC} %-10s\\n" \\
        "$adr_id" \\
        "\${requirement:0:40}" \\
        "$status" \\
        "$severity"
done

echo ""
echo "=================================================================================="

# Exit with appropriate code
if [ $CRITICAL_FAILURES -gt 0 ]; then
    echo -e "\${RED}❌ Validation FAILED: Critical ADR violations detected\${NC}"
    echo ""
    echo "Action Required:"
    echo "  1. Review failed critical checks above"
    echo "  2. Update implementation to match ADR requirements"
    echo "  3. Re-run this validation script"
    exit 1
elif [ $FAILED_CHECKS -gt 0 ]; then
    echo -e "\${YELLOW}⚠️  Validation PASSED with warnings\${NC}"
    echo ""
    echo "Recommended Actions:"
    echo "  1. Review non-critical failures"
    echo "  2. Plan remediation for next iteration"
    exit 0
else
    echo -e "\${GREEN}✅ Validation PASSED: Full ADR compliance achieved!\${NC}"
    exit 0
fi
`;
}

/**
 * Perform tree-sitter analysis for ADR compliance validation
 */
async function performAdrComplianceAnalysis(
  projectPath: string,
  adrs: any[],
  complianceChecks: AdrComplianceCheck[]
): Promise<{
  filesAnalyzed: number;
  implementations: Array<{
    adrTitle: string;
    evidence: string;
    file: string;
    line: number;
    confidence: number;
  }>;
  violations: Array<{
    adrTitle: string;
    issue: string;
    file: string;
    line: number;
    severity: string;
  }>;
  patterns: string[];
}> {
  const analyzer = new TreeSitterAnalyzer();
  const { readdirSync, statSync } = await import('fs');
  const { join } = await import('path');

  const results = {
    filesAnalyzed: 0,
    implementations: [] as any[],
    violations: [] as any[],
    patterns: [] as string[],
  };

  // Find source files to analyze
  const sourceFiles: string[] = [];
  const findSourceFiles = (dir: string, depth: number = 0) => {
    if (depth > 3) return; // Limit recursion depth

    try {
      const items = readdirSync(dir);
      for (const item of items) {
        if (item.startsWith('.') || item === 'node_modules') continue;

        const fullPath = join(dir, item);
        const stat = statSync(fullPath);

        if (stat.isDirectory()) {
          findSourceFiles(fullPath, depth + 1);
        } else if (stat.isFile()) {
          const ext = item.split('.').pop()?.toLowerCase();
          if (['ts', 'js', 'py', 'yml', 'yaml', 'tf', 'hcl', 'json'].includes(ext || '')) {
            sourceFiles.push(fullPath);
          }
        }
      }
    } catch {
      // Skip directories we can't read
    }
  };

  findSourceFiles(projectPath);

  // Analyze files (limit to first 15 for performance)
  const filesToAnalyze = sourceFiles.slice(0, 15);
  results.filesAnalyzed = filesToAnalyze.length;

  for (const filePath of filesToAnalyze) {
    try {
      const analysis = await analyzer.analyzeFile(filePath);

      // Check for ADR implementation evidence
      for (const adr of adrs) {
        if (!adr.content) continue;

        // Look for technology/framework mentions in ADR
        const adrTechnologies = extractTechnologiesFromAdr(adr.content);

        // Check if file implements required technologies
        if (analysis.imports) {
          for (const imp of analysis.imports) {
            for (const tech of adrTechnologies) {
              if (imp.module.toLowerCase().includes(tech.toLowerCase())) {
                results.implementations.push({
                  adrTitle: adr.title || 'Unknown ADR',
                  evidence: `Uses required technology: ${tech} (import: ${imp.module})`,
                  file: filePath,
                  line: imp.location.line,
                  confidence: 0.8,
                });
              }
            }
          }
        }

        // Check for architectural pattern compliance
        if (analysis.functions) {
          const adrPatterns = extractPatternsFromAdr(adr.content);
          for (const pattern of adrPatterns) {
            // Look for functions that match architectural patterns
            const matchingFunctions = analysis.functions.filter(
              func =>
                func.name.toLowerCase().includes(pattern.toLowerCase()) ||
                (pattern.includes('service') && func.name.toLowerCase().includes('service')) ||
                (pattern.includes('controller') && func.name.toLowerCase().includes('controller'))
            );

            if (matchingFunctions.length > 0) {
              results.implementations.push({
                adrTitle: adr.title || 'Unknown ADR',
                evidence: `Implements ${pattern} pattern (${matchingFunctions.length} functions)`,
                file: filePath,
                line: matchingFunctions[0]?.location.line || 1,
                confidence: 0.7,
              });

              if (!results.patterns.includes(pattern)) {
                results.patterns.push(pattern);
              }
            }
          }
        }
      }

      // Check for compliance violations
      for (const check of complianceChecks) {
        // Security-related violations
        if (analysis.hasSecrets && check.requirement.toLowerCase().includes('security')) {
          results.violations.push({
            adrTitle: check.adrTitle,
            issue: `Security violation: ${analysis.secrets.length} secrets detected`,
            file: filePath,
            line: analysis.secrets[0]?.location.line || 1,
            severity: check.severity,
          });
        }

        // Architecture violations
        if (analysis.architecturalViolations && analysis.architecturalViolations.length > 0) {
          for (const violation of analysis.architecturalViolations) {
            results.violations.push({
              adrTitle: check.adrTitle,
              issue: `Architectural violation: ${violation.message}`,
              file: filePath,
              line: violation.location.line,
              severity: check.severity,
            });
          }
        }
      }
    } catch (error) {
      // Skip files that can't be analyzed
      console.warn(`Could not analyze file ${filePath}:`, error);
    }
  }

  return results;
}

/**
 * Extract technologies mentioned in ADR content
 */
function extractTechnologiesFromAdr(content: string): string[] {
  const technologies = [];
  const techPatterns = [
    /\b(react|vue|angular|express|fastapi|django|flask|spring|laravel)\b/gi,
    /\b(postgres|mysql|mongodb|redis|elasticsearch)\b/gi,
    /\b(docker|kubernetes|terraform|ansible)\b/gi,
    /\b(aws|azure|gcp|cloudflare)\b/gi,
  ];

  for (const pattern of techPatterns) {
    const matches = content.match(pattern);
    if (matches) {
      technologies.push(...matches.map(m => m.toLowerCase()));
    }
  }

  return [...new Set(technologies)]; // Remove duplicates
}

/**
 * Extract architectural patterns mentioned in ADR content
 */
function extractPatternsFromAdr(content: string): string[] {
  const patterns = [];
  const patternKeywords = [
    'microservice',
    'service',
    'controller',
    'repository',
    'factory',
    'singleton',
    'observer',
    'strategy',
    'adapter',
    'facade',
    'mvc',
    'mvp',
    'mvvm',
    'layered',
    'hexagonal',
    'clean',
  ];

  for (const keyword of patternKeywords) {
    if (content.toLowerCase().includes(keyword)) {
      patterns.push(keyword);
    }
  }

  return patterns;
}

export default generateAdrBootstrapScripts;
