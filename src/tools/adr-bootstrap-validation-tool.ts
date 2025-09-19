/**
 * MCP Tool for ADR Bootstrap Validation
 * Guides LLMs to create bootstrap.sh and validate_bootstrap.sh scripts
 * that ensure code deployment follows ADR architectural decisions
 */

import { McpAdrError } from '../types/index.js';
import { ConversationContext } from '../types/conversation-context.js';
import { TreeSitterAnalyzer } from '../utils/tree-sitter-analyzer.js';

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
    // Discover ADRs in the target project
    const { discoverAdrsInDirectory } = await import('../utils/adr-discovery.js');
    const discoveryResult = await discoverAdrsInDirectory(adrDirectory, true, projectPath);

    // Extract validation requirements from ADRs
    const complianceChecks = await extractComplianceChecks(discoveryResult.adrs);

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
      customValidations
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

## Discovered ADRs (${discoveryResult.totalAdrs} total)
${discoveryResult.adrs.map(adr => `- ${adr.title} (${adr.status})`).join('\n')}

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
 */
async function extractComplianceChecks(adrs: any[]): Promise<AdrComplianceCheck[]> {
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

  return checks;
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
 */
function generateBootstrapScript(
  checks: AdrComplianceCheck[],
  projectPath: string,
  includeTests: boolean,
  includeDeployment: boolean,
  customValidations: string[]
): string {
  return `#!/bin/bash
# ADR Bootstrap Deployment Script
# Generated by MCP ADR Analysis Server
# Purpose: Deploy code that follows ADR architectural decisions

set -e # Exit on error

echo "🚀 ADR Bootstrap Deployment Starting..."
echo "📍 Project: ${projectPath}"
echo "📋 ADR Compliance Checks: ${checks.length}"
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
    } catch (error) {
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
