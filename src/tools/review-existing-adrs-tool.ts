/**
 * MCP Tool for reviewing existing ADRs against actual code implementation
 * Validates ADR compliance, identifies gaps, and suggests updates
 * Uses tree-sitter for accurate code analysis
 */

import { McpAdrError } from '../types/index.js';
import { ConversationContext } from '../types/conversation-context.js';
import { TreeSitterAnalyzer } from '../utils/tree-sitter-analyzer.js';
import { ResearchOrchestrator } from '../utils/research-orchestrator.js';
import * as path from 'path';
import * as fs from 'fs/promises';

interface AdrReviewResult {
  adrPath: string;
  title: string;
  status: string;
  complianceScore: number;
  codeCompliance: {
    implemented: boolean;
    partiallyImplemented: boolean;
    notImplemented: boolean;
    evidence: string[];
    gaps: string[];
  };
  recommendations: {
    updateAdr: boolean;
    updateCode: boolean;
    createPlan: boolean;
    actions: string[];
  };
  analysis: string;
}

interface CodeAnalysisResult {
  files: string[];
  patterns: string[];
  technologies: string[];
  architecturalElements: {
    apis: string[];
    databases: string[];
    frameworks: string[];
    patterns: string[];
    securityFindings?: string[];
    infrastructureResources?: string[];
    devopsTools?: string[];
  };
}

/**
 * Review existing ADRs and validate against actual code implementation
 */
export async function reviewExistingAdrs(args: {
  adrDirectory?: string;
  projectPath?: string;
  specificAdr?: string;
  analysisDepth?: 'basic' | 'detailed' | 'comprehensive';
  includeTreeSitter?: boolean;
  generateUpdatePlan?: boolean;
  conversationContext?: ConversationContext;
}): Promise<any> {
  const {
    adrDirectory = 'docs/adrs',
    projectPath = process.cwd(),
    specificAdr,
    analysisDepth = 'detailed',
    includeTreeSitter = true,
    generateUpdatePlan = true,
  } = args;

  try {
    // Step 1: Discover existing ADRs
    const { discoverAdrsInDirectory } = await import('../utils/adr-discovery.js');
    const discoveryResult = await discoverAdrsInDirectory(adrDirectory, true, projectPath);

    if (discoveryResult.totalAdrs === 0) {
      return {
        content: [
          {
            type: 'text',
            text: `# ADR Review: No ADRs Found

## Discovery Results
- **Directory**: ${adrDirectory}
- **Project Path**: ${projectPath}
- **ADRs Found**: 0

## Recommendations
1. **Create Initial ADRs**: Use the \`suggest_adrs\` tool to identify architectural decisions
2. **Set Up ADR Directory**: Create the ADR directory structure
3. **Establish ADR Process**: Implement ADR workflow for future decisions

## Next Steps
\`\`\`json
{
  "tool": "suggest_adrs",
  "args": {
    "projectPath": "${projectPath}",
    "analysisType": "comprehensive"
  }
}
\`\`\`
`,
          },
        ],
      };
    }

    // Step 2: Filter ADRs if specific one requested
    const adrsToReview = specificAdr
      ? discoveryResult.adrs.filter(
          adr =>
            adr.filename.includes(specificAdr) ||
            adr.title.toLowerCase().includes(specificAdr.toLowerCase())
        )
      : discoveryResult.adrs;

    if (adrsToReview.length === 0) {
      throw new McpAdrError(`No ADRs found matching: ${specificAdr}`, 'ADR_NOT_FOUND');
    }

    // Step 3: Research environment and implementation state
    let environmentContext = '';
    let researchConfidence = 0;
    try {
      const orchestrator = new ResearchOrchestrator(projectPath, adrDirectory);
      const research = await orchestrator.answerResearchQuestion(
        `Analyze ADR implementation status:
1. What architectural decisions are documented in ADRs?
2. How are these decisions reflected in the current codebase?
3. What is the current infrastructure and deployment state?
4. Are there any gaps between documented decisions and actual implementation?`
      );

      researchConfidence = research.confidence;
      const envSource = research.sources.find(s => s.type === 'environment');
      const capabilities = envSource?.data?.capabilities || [];

      environmentContext = `

## 🔍 Research-Driven Analysis

**Research Confidence**: ${(research.confidence * 100).toFixed(1)}%

### Implementation Context
${research.answer || 'No specific implementation context found'}

### Environment Infrastructure
${capabilities.length > 0 ? capabilities.map((c: string) => `- ${c}`).join('\n') : '- No infrastructure tools detected'}

### Sources Analyzed
${research.sources.map(s => `- ${s.type}: Consulted`).join('\n')}
`;
    } catch (error) {
      environmentContext = `\n## ⚠️ Research Analysis\nFailed to analyze environment: ${error instanceof Error ? error.message : String(error)}\n`;
    }

    // Step 4: Analyze code structure
    const codeAnalysis = await analyzeCodeStructure(projectPath, includeTreeSitter);

    // Step 5: Review each ADR
    const reviewResults: AdrReviewResult[] = [];

    for (const adr of adrsToReview) {
      const reviewResult = await reviewSingleAdr(adr, codeAnalysis, analysisDepth, projectPath);
      reviewResults.push(reviewResult);
    }

    // Step 5: Generate comprehensive report
    const overallScore =
      reviewResults.reduce((sum, result) => sum + result.complianceScore, 0) / reviewResults.length;
    const totalGaps = reviewResults.reduce(
      (sum, result) => sum + result.codeCompliance.gaps.length,
      0
    );
    const needsUpdate = reviewResults.filter(result => result.recommendations.updateAdr).length;
    const needsCodeChanges = reviewResults.filter(
      result => result.recommendations.updateCode
    ).length;

    let updatePlan = '';
    if (generateUpdatePlan) {
      updatePlan = await generateUpdatePlanContent(reviewResults, codeAnalysis, projectPath);
    }

    return {
      content: [
        {
          type: 'text',
          text: `# ADR Compliance Review Report

## Overview
- **Project**: ${path.basename(projectPath)}
- **ADRs Reviewed**: ${reviewResults.length}
- **Overall Compliance Score**: ${overallScore.toFixed(1)}/10
- **Research Confidence**: ${(researchConfidence * 100).toFixed(1)}%
- **Analysis Depth**: ${analysisDepth}
- **Tree-sitter Analysis**: ${includeTreeSitter ? '✅ Enabled' : '❌ Disabled'}

${environmentContext}

## Summary Statistics
- **Total Gaps Identified**: ${totalGaps}
- **ADRs Needing Updates**: ${needsUpdate}
- **Code Changes Required**: ${needsCodeChanges}
- **Full Compliance**: ${reviewResults.filter(r => r.complianceScore >= 8).length}
- **Partial Compliance**: ${reviewResults.filter(r => r.complianceScore >= 5 && r.complianceScore < 8).length}
- **Non-Compliance**: ${reviewResults.filter(r => r.complianceScore < 5).length}

## Detailed Reviews

${reviewResults
  .map(
    result => `
### ${result.title}
- **File**: ${path.basename(result.adrPath)}
- **Status**: ${result.status}
- **Compliance Score**: ${result.complianceScore}/10

#### Implementation Status
- **Implemented**: ${result.codeCompliance.implemented ? '✅' : '❌'}
- **Partially Implemented**: ${result.codeCompliance.partiallyImplemented ? '⚠️' : '❌'}
- **Not Implemented**: ${result.codeCompliance.notImplemented ? '🚨' : '✅'}

#### Evidence Found
${
  result.codeCompliance.evidence.length > 0
    ? result.codeCompliance.evidence.map(e => `- ${e}`).join('\n')
    : '- No supporting evidence found in codebase'
}

#### Gaps Identified
${
  result.codeCompliance.gaps.length > 0
    ? result.codeCompliance.gaps.map(g => `- ${g}`).join('\n')
    : '- No gaps identified'
}

#### Recommendations
${result.recommendations.actions.map(a => `- ${a}`).join('\n')}

#### Analysis
${result.analysis}

---
`
  )
  .join('\n')}

## Code Structure Analysis
- **Files Analyzed**: ${codeAnalysis.files.length}
- **Technologies Detected**: ${codeAnalysis.technologies.join(', ')}
- **Architectural Patterns**: ${codeAnalysis.patterns.join(', ')}

### Architectural Elements
- **APIs**: ${codeAnalysis.architecturalElements.apis?.length || 0}
- **Databases**: ${codeAnalysis.architecturalElements.databases?.length || 0}
- **Frameworks**: ${codeAnalysis.architecturalElements.frameworks?.length || 0}
- **Patterns**: ${codeAnalysis.architecturalElements.patterns?.length || 0}
- **Infrastructure Resources**: ${codeAnalysis.architecturalElements.infrastructureResources?.length || 0}
- **DevOps Tools**: ${codeAnalysis.architecturalElements.devopsTools?.length || 0}

### Enterprise Security Analysis (Tree-sitter)
${
  includeTreeSitter
    ? `
- **Security Findings**: ${codeAnalysis.architecturalElements.securityFindings?.length || 0}
${
  (codeAnalysis.architecturalElements.securityFindings?.length || 0) > 0
    ? `
#### Critical Security Issues:
${codeAnalysis.architecturalElements
  .securityFindings!.slice(0, 10)
  .map((finding: string) => `- ${finding}`)
  .join('\n')}
${(codeAnalysis.architecturalElements.securityFindings!.length || 0) > 10 ? `\n*... and ${(codeAnalysis.architecturalElements.securityFindings!.length || 0) - 10} more security findings*` : ''}
`
    : '- ✅ No security issues detected'
}
`
    : '- Tree-sitter security analysis disabled'
}

### DevOps Stack Analysis
${
  includeTreeSitter && (codeAnalysis.architecturalElements.infrastructureResources?.length || 0) > 0
    ? `
#### Infrastructure Resources:
${codeAnalysis.architecturalElements
  .infrastructureResources!.slice(0, 10)
  .map((resource: string) => `- ${resource}`)
  .join('\n')}
${(codeAnalysis.architecturalElements.infrastructureResources!.length || 0) > 10 ? `\n*... and ${(codeAnalysis.architecturalElements.infrastructureResources!.length || 0) - 10} more resources*` : ''}
`
    : '- No infrastructure resources detected'
}

${
  includeTreeSitter && (codeAnalysis.architecturalElements.devopsTools?.length || 0) > 0
    ? `
#### DevOps Tools Detected:
${codeAnalysis.architecturalElements
  .devopsTools!.slice(0, 10)
  .map((tool: string) => `- ${tool}`)
  .join('\n')}
${(codeAnalysis.architecturalElements.devopsTools!.length || 0) > 10 ? `\n*... and ${(codeAnalysis.architecturalElements.devopsTools!.length || 0) - 10} more tools*` : ''}
`
    : '- No DevOps tools detected'
}

${generateUpdatePlan ? updatePlan : ''}

## Next Steps

### Immediate Actions (High Priority)
${
  reviewResults
    .filter(r => r.complianceScore < 5)
    .map(r => `- **${r.title}**: ${r.recommendations.actions[0] || 'Requires immediate attention'}`)
    .join('\n') || '- No immediate actions required'
}

### Medium Priority
${
  reviewResults
    .filter(r => r.complianceScore >= 5 && r.complianceScore < 8)
    .map(r => `- **${r.title}**: ${r.recommendations.actions[0] || 'Minor updates needed'}`)
    .join('\n') || '- No medium priority items'
}

### Maintenance
${
  reviewResults
    .filter(r => r.complianceScore >= 8)
    .map(r => `- **${r.title}**: Well implemented, monitor for changes`)
    .join('\n') || '- No items in maintenance status'
}

## Quality Assessment

### Best Practices Compliance
- **Documentation Quality**: ${calculateDocumentationQuality(reviewResults)}/10
- **Implementation Fidelity**: ${calculateImplementationFidelity(reviewResults)}/10
- **Architectural Consistency**: ${calculateArchitecturalConsistency(reviewResults)}/10

### Recommendations for Process Improvement
1. **Regular ADR Reviews**: Schedule quarterly compliance reviews
2. **Automated Validation**: Implement CI/CD checks for ADR compliance
3. **Developer Training**: Ensure team understands ADR importance
4. **Template Updates**: Standardize ADR format for better tracking

## Tools for Follow-up

### Update Specific ADRs
\`\`\`json
{
  "tool": "generate_adr_from_decision",
  "args": {
    "decisionData": {
      "title": "Updated [ADR Title]",
      "context": "Review findings and current implementation",
      "decision": "Refined decision based on analysis",
      "consequences": "Updated consequences from review"
    }
  }
}
\`\`\`

### Generate Implementation Plan
\`\`\`json
{
  "tool": "generate_implementation_plan",
  "args": {
    "adrPath": "[specific ADR path]",
    "includeCodeChanges": true,
    "priority": "high"
  }
}
\`\`\`
`,
        },
      ],
    };
  } catch (error) {
    throw new McpAdrError(
      `Failed to review ADRs: ${error instanceof Error ? error.message : String(error)}`,
      'REVIEW_ERROR'
    );
  }
}

/**
 * Analyze code structure to understand current implementation
 * Enhanced with fast-glob for efficient file discovery
 */
async function analyzeCodeStructure(
  projectPath: string,
  useTreeSitter: boolean
): Promise<CodeAnalysisResult> {
  const result: CodeAnalysisResult = {
    files: [],
    patterns: [],
    technologies: [],
    architecturalElements: {
      apis: [],
      databases: [],
      frameworks: [],
      patterns: [],
    },
  };

  try {
    // Enhanced file system analysis using fast-glob
    const { analyzeProjectStructure } = await import('../utils/file-system.js');

    // Use the new analyzeProjectStructure function for comprehensive analysis
    const projectAnalysis = await analyzeProjectStructure(projectPath);

    // Extract file paths from the analysis
    result.files = projectAnalysis.files.map(f => f.path);
    result.technologies = projectAnalysis.technologies;
    result.patterns = projectAnalysis.patterns;

    // Legacy pattern detection for backward compatibility
    const legacyPatterns = await detectArchitecturalPatterns(result.files);
    result.patterns = [...new Set([...result.patterns, ...legacyPatterns])];

    // If tree-sitter is enabled, perform detailed analysis
    if (useTreeSitter) {
      const detailedAnalysis = await performTreeSitterAnalysis(result.files);
      result.architecturalElements = detailedAnalysis;
    }

    return result;
  } catch (error) {
    console.warn('Enhanced code analysis failed, falling back to legacy:', error);

    // Fallback to legacy implementation
    try {
      const files = await findSourceFiles(projectPath);
      result.files = files;
      result.technologies = await detectTechnologies(projectPath);
      result.patterns = await detectArchitecturalPatterns(files);

      if (useTreeSitter) {
        const detailedAnalysis = await performTreeSitterAnalysis(files);
        result.architecturalElements = detailedAnalysis;
      }
    } catch (fallbackError) {
      console.warn('Legacy code analysis also failed:', fallbackError);
    }

    return result;
  }
}

/**
 * Review a single ADR against code implementation
 * Enhanced with Smart Code Linking to find related files
 */
async function reviewSingleAdr(
  adr: any,
  codeAnalysis: CodeAnalysisResult,
  depth: string,
  projectPath: string
): Promise<AdrReviewResult> {
  const result: AdrReviewResult = {
    adrPath: adr.path,
    title: adr.title,
    status: adr.status,
    complianceScore: 0,
    codeCompliance: {
      implemented: false,
      partiallyImplemented: false,
      notImplemented: false,
      evidence: [],
      gaps: [],
    },
    recommendations: {
      updateAdr: false,
      updateCode: false,
      createPlan: false,
      actions: [],
    },
    analysis: '',
  };

  try {
    // Parse ADR content for key architectural elements
    const adrElements = extractAdrElements(adr.content || '');

    // SMART CODE LINKING: Find related code files for this specific ADR
    let relatedFiles: any[] = [];
    try {
      const { findRelatedCode } = await import('../utils/file-system.js');
      const relatedCodeResult = await findRelatedCode(adr.path, adr.content || '', projectPath, {
        useAI: true,
        useRipgrep: true,
        maxFiles: 25,
        includeContent: false,
      });

      relatedFiles = relatedCodeResult.relatedFiles;

      // Add Smart Code Linking results to evidence
      if (relatedFiles.length > 0) {
        result.codeCompliance.evidence.push(
          `Smart Code Linking found ${relatedFiles.length} related files (confidence: ${(relatedCodeResult.confidence * 100).toFixed(0)}%)`
        );

        // Add top related files as evidence
        const topFiles = relatedFiles.slice(0, 5);
        topFiles.forEach(file => {
          result.codeCompliance.evidence.push(`Related: ${file.path}`);
        });
      } else {
        result.codeCompliance.gaps.push('No related code files found using Smart Code Linking');
      }
    } catch (error) {
      console.warn('Smart Code Linking failed:', error);
      result.codeCompliance.gaps.push('Smart Code Linking unavailable - manual review required');
    }

    // Compare ADR elements with code implementation (enhanced with related files)
    const complianceAnalysis = await analyzeCompliance(adrElements, codeAnalysis, relatedFiles);

    // Merge Smart Code Linking evidence with compliance analysis
    result.codeCompliance.evidence.push(...complianceAnalysis.evidence);
    result.codeCompliance.gaps.push(...complianceAnalysis.gaps);
    result.codeCompliance.implemented = complianceAnalysis.implemented || relatedFiles.length > 0;
    result.codeCompliance.partiallyImplemented =
      complianceAnalysis.partiallyImplemented ||
      (relatedFiles.length > 0 && relatedFiles.length < 5);
    result.codeCompliance.notImplemented =
      complianceAnalysis.notImplemented && relatedFiles.length === 0;

    result.complianceScore = calculateComplianceScore(result.codeCompliance);

    // Generate recommendations (enhanced with Smart Code Linking insights)
    result.recommendations = generateRecommendations(
      result.codeCompliance,
      result.complianceScore,
      relatedFiles
    );

    // Generate detailed analysis (include Smart Code Linking results)
    result.analysis = generateDetailedAnalysis(
      adrElements,
      result.codeCompliance,
      depth,
      relatedFiles
    );

    return result;
  } catch (error) {
    result.analysis = `Error analyzing ADR: ${error instanceof Error ? error.message : String(error)}`;
    return result;
  }
}

/**
 * Extract architectural elements from ADR content
 */
function extractAdrElements(content: string): any {
  const elements: any = {
    technologies: [],
    apis: [],
    databases: [],
    patterns: [],
    components: [],
    constraints: [],
    decisions: [],
  };

  // Extract from different sections of the ADR
  const sections = {
    context: extractSection(content, 'context'),
    decision: extractSection(content, 'decision'),
    consequences: extractSection(content, 'consequences'),
    alternatives: extractSection(content, 'alternatives'),
  };

  // Technology extraction patterns
  const techPatterns = [
    /\b(React|Vue|Angular|Node\.js|Express|FastAPI|Django|Spring|Rails)\b/gi,
    /\b(PostgreSQL|MySQL|MongoDB|Redis|Elasticsearch)\b/gi,
    /\b(Docker|Kubernetes|AWS|Azure|GCP)\b/gi,
  ];

  // API patterns
  const apiPatterns = [
    /\b(REST|GraphQL|gRPC|WebSocket)\b/gi,
    /\b(API|endpoint|service|microservice)\b/gi,
  ];

  // Extract elements from each section
  for (const [, sectionContent] of Object.entries(sections)) {
    if (sectionContent) {
      elements.technologies.push(...extractMatches(sectionContent, techPatterns));
      elements.apis.push(...extractMatches(sectionContent, apiPatterns));
    }
  }

  return elements;
}

/**
 * Extract section content from ADR
 */
function extractSection(content: string, sectionName: string): string | null {
  const regex = new RegExp(`##\\s*${sectionName}[^#]*`, 'gi');
  const match = content.match(regex);
  return match ? match[0] : null;
}

/**
 * Extract matches from content using patterns
 */
function extractMatches(content: string, patterns: RegExp[]): string[] {
  const matches: string[] = [];
  patterns.forEach(pattern => {
    const found = content.match(pattern);
    if (found) {
      matches.push(...found);
    }
  });
  return [...new Set(matches)]; // Remove duplicates
}

/**
 * Analyze compliance between ADR and code
 */
async function analyzeCompliance(
  adrElements: any,
  codeAnalysis: CodeAnalysisResult,
  relatedFiles: any[] = []
): Promise<any> {
  const compliance: any = {
    implemented: false,
    partiallyImplemented: false,
    notImplemented: false,
    evidence: [],
    gaps: [],
  };

  // Check technology alignment
  const adrTechs = adrElements.technologies || [];
  const codeTechs = codeAnalysis.technologies || [];

  const techMatches = adrTechs.filter((tech: string) =>
    codeTechs.some(
      (codeTech: string) =>
        codeTech.toLowerCase().includes(tech.toLowerCase()) ||
        tech.toLowerCase().includes(codeTech.toLowerCase())
    )
  );

  if (techMatches.length > 0) {
    compliance.evidence.push(`Technologies implemented: ${techMatches.join(', ')}`);
  }

  const missingTechs = adrTechs.filter((tech: string) => !techMatches.includes(tech));
  if (missingTechs.length > 0) {
    compliance.gaps.push(`Missing technologies: ${missingTechs.join(', ')}`);
  }

  // Smart Code Linking analysis: check if related files provide additional evidence
  if (relatedFiles.length > 0) {
    compliance.evidence.push(
      `Smart Code Linking identified ${relatedFiles.length} potentially related files`
    );

    // Analyze file extensions to infer technologies used in related files
    const relatedExtensions = [...new Set(relatedFiles.map((f: any) => f.extension))];
    const relatedTechHints = relatedExtensions
      .map(ext => {
        switch (ext) {
          case '.ts':
          case '.tsx':
            return 'TypeScript';
          case '.js':
          case '.jsx':
            return 'JavaScript';
          case '.py':
            return 'Python';
          case '.java':
            return 'Java';
          case '.cs':
            return 'C#';
          case '.go':
            return 'Go';
          case '.rs':
            return 'Rust';
          default:
            return null;
        }
      })
      .filter(Boolean);

    if (relatedTechHints.length > 0) {
      compliance.evidence.push(
        `Related files suggest technologies: ${relatedTechHints.join(', ')}`
      );
    }
  } else {
    compliance.gaps.push('No related files found - implementation may not exist');
  }

  // Check API implementation
  const adrApis = adrElements.apis || [];
  const codeApis = codeAnalysis.architecturalElements.apis || [];

  const apiMatches = adrApis.filter((api: string) =>
    codeApis.some((codeApi: string) => codeApi.toLowerCase().includes(api.toLowerCase()))
  );

  if (apiMatches.length > 0) {
    compliance.evidence.push(`APIs implemented: ${apiMatches.join(', ')}`);
  }

  // Determine overall compliance status
  const totalElements = adrTechs.length + adrApis.length;
  const implementedElements = techMatches.length + apiMatches.length;

  if (implementedElements === totalElements && totalElements > 0) {
    compliance.implemented = true;
  } else if (implementedElements > 0) {
    compliance.partiallyImplemented = true;
  } else {
    compliance.notImplemented = true;
  }

  return compliance;
}

/**
 * Calculate compliance score
 */
function calculateComplianceScore(compliance: any): number {
  if (compliance.implemented) return 9;
  if (compliance.partiallyImplemented) return 6;
  if (compliance.notImplemented) return 2;
  return 5; // Default/unknown
}

/**
 * Generate recommendations based on compliance analysis
 */
function generateRecommendations(compliance: any, score: number, relatedFiles: any[] = []): any {
  const recommendations: any = {
    updateAdr: false,
    updateCode: false,
    createPlan: false,
    actions: [],
  };

  if (score < 5) {
    recommendations.createPlan = true;
    recommendations.actions.push('Create implementation plan for missing elements');
    recommendations.actions.push('Consider updating ADR if decisions have changed');
  }

  if (compliance.gaps.length > 0) {
    recommendations.updateCode = true;
    recommendations.actions.push('Implement missing architectural elements');
  }

  if (score < 7) {
    recommendations.updateAdr = true;
    recommendations.actions.push('Update ADR to reflect current implementation');
  }

  // Smart Code Linking enhancements
  if (relatedFiles.length > 0) {
    recommendations.actions.push(
      `Review ${relatedFiles.length} related files identified by Smart Code Linking`
    );

    if (relatedFiles.length > 10) {
      recommendations.actions.push(
        'Consider refactoring - many files may indicate coupling issues'
      );
    }
  } else {
    recommendations.actions.push('Use Smart Code Linking to identify implementation files');
  }

  return recommendations;
}

/**
 * Generate detailed analysis text
 */
function generateDetailedAnalysis(
  adrElements: any,
  compliance: any,
  depth: string,
  relatedFiles: any[] = []
): string {
  let analysis = '';

  if (depth === 'comprehensive') {
    analysis += `
**Architectural Elements Analysis:**
- Technologies mentioned: ${adrElements.technologies?.length || 0}
- APIs referenced: ${adrElements.apis?.length || 0}
- Implementation evidence: ${compliance.evidence.length}
- Identified gaps: ${compliance.gaps.length}

**Smart Code Linking Results:**
- Related files found: ${relatedFiles.length}
${
  relatedFiles.length > 0
    ? `- Top related files:\n${relatedFiles
        .slice(0, 3)
        .map((f: any) => `  • ${f.path} (${f.name})`)
        .join('\n')}`
    : '- No related files identified'
}

**Compliance Details:**
${compliance.evidence.map((e: string) => `✅ ${e}`).join('\n')}
${compliance.gaps.map((g: string) => `❌ ${g}`).join('\n')}
`;
  } else {
    analysis = `Implementation status: ${
      compliance.implemented
        ? 'Fully implemented'
        : compliance.partiallyImplemented
          ? 'Partially implemented'
          : 'Not implemented'
    }. Smart Code Linking found ${relatedFiles.length} related files.`;
  }

  return analysis;
}

// Helper functions for code analysis

async function findSourceFiles(projectPath: string): Promise<string[]> {
  const files: string[] = [];
  const extensions = ['.ts', '.js', '.py', '.java', '.cs', '.go', '.rs', '.rb'];

  try {
    const entries = await fs.readdir(projectPath, { withFileTypes: true });

    for (const entry of entries) {
      if (entry.isDirectory() && !entry.name.startsWith('.') && entry.name !== 'node_modules') {
        const subFiles = await findSourceFiles(path.join(projectPath, entry.name));
        files.push(...subFiles);
      } else if (entry.isFile() && extensions.some(ext => entry.name.endsWith(ext))) {
        files.push(path.join(projectPath, entry.name));
      }
    }
  } catch (error) {
    console.warn('Warning reading directory:', error);
  }

  return files;
}

async function detectTechnologies(projectPath: string): Promise<string[]> {
  const technologies: string[] = [];

  try {
    // Check package.json for Node.js technologies
    const packageJsonPath = path.join(projectPath, 'package.json');
    try {
      const packageJson = JSON.parse(await fs.readFile(packageJsonPath, 'utf-8'));
      const deps = { ...packageJson.dependencies, ...packageJson.devDependencies };

      Object.keys(deps).forEach(dep => {
        if (dep.includes('react')) technologies.push('React');
        if (dep.includes('vue')) technologies.push('Vue');
        if (dep.includes('angular')) technologies.push('Angular');
        if (dep.includes('express')) technologies.push('Express');
        if (dep.includes('fastify')) technologies.push('Fastify');
        // Cloud SDKs
        if (dep.includes('aws-sdk') || dep.includes('@aws-sdk')) technologies.push('AWS SDK');
        if (dep.includes('google-cloud') || dep.includes('@google-cloud'))
          technologies.push('GCP SDK');
        if (dep.includes('azure') || dep.includes('@azure')) technologies.push('Azure SDK');
      });
    } catch {
      // package.json not found or invalid
    }

    // Check for other technology indicators
    const files = await fs.readdir(projectPath);

    // Container technologies
    if (files.includes('Dockerfile')) technologies.push('Docker');
    if (files.includes('docker-compose.yml') || files.includes('docker-compose.yaml'))
      technologies.push('Docker Compose');

    // Kubernetes
    if (files.includes('kubernetes.yaml') || files.includes('k8s.yaml'))
      technologies.push('Kubernetes');
    if (files.some(f => f.endsWith('.yaml') || f.endsWith('.yml'))) {
      const yamlFiles = files.filter(f => f.endsWith('.yaml') || f.endsWith('.yml'));
      for (const yamlFile of yamlFiles) {
        try {
          const content = await fs.readFile(path.join(projectPath, yamlFile), 'utf-8');
          if (content.includes('apiVersion:') && content.includes('kind:')) {
            technologies.push('Kubernetes');
            break;
          }
        } catch {
          // Skip unreadable files
        }
      }
    }

    // Infrastructure as Code
    if (files.some(f => f.endsWith('.tf') || f.endsWith('.tfvars'))) technologies.push('Terraform');
    if (files.includes('cloudformation.yaml') || files.includes('cloudformation.yml'))
      technologies.push('CloudFormation');
    if (files.includes('ansible.yml') || files.includes('playbook.yml'))
      technologies.push('Ansible');

    // Cloud-specific files
    if (files.includes('.aws') || files.includes('aws-config.yml')) technologies.push('AWS');
    if (files.includes('gcp-config.json') || files.includes('.gcp')) technologies.push('GCP');
    if (files.includes('azure-pipelines.yml') || files.includes('.azure'))
      technologies.push('Azure');

    // DevOps and CI/CD
    if (files.includes('.github')) technologies.push('GitHub Actions');
    if (files.includes('.gitlab-ci.yml')) technologies.push('GitLab CI');
    if (files.includes('Jenkinsfile')) technologies.push('Jenkins');
    if (files.includes('azure-pipelines.yml')) technologies.push('Azure DevOps');

    // Monitoring and observability
    if (files.includes('prometheus.yml')) technologies.push('Prometheus');
    if (files.includes('grafana.yml') || files.includes('grafana.json'))
      technologies.push('Grafana');
    if (files.includes('jaeger.yml')) technologies.push('Jaeger');

    // Language-specific
    if (files.includes('requirements.txt')) technologies.push('Python');
    if (files.includes('Gemfile')) technologies.push('Ruby');
    if (files.includes('pom.xml')) technologies.push('Maven/Java');
    if (files.includes('Cargo.toml')) technologies.push('Rust');
    if (files.includes('go.mod')) technologies.push('Go');

    // Check for cloud provider specific directories/files recursively
    await checkCloudProviderIndicators(projectPath, technologies);
  } catch (error) {
    console.warn('Technology detection warning:', error);
  }

  return [...new Set(technologies)];
}

/**
 * Enhanced cloud provider detection based on Tosin Akinosho's expertise
 * Principal Solution Architect at RedHat, specializing in AWS, GCP, Azure, Docker, Kubernetes, Terraform
 */
async function checkCloudProviderIndicators(
  projectPath: string,
  technologies: string[]
): Promise<void> {
  try {
    const entries = await fs.readdir(projectPath, { withFileTypes: true });

    for (const entry of entries) {
      if (entry.isDirectory() && !entry.name.startsWith('.') && entry.name !== 'node_modules') {
        const dirPath = path.join(projectPath, entry.name);

        // AWS indicators
        if (
          entry.name.includes('aws') ||
          entry.name.includes('lambda') ||
          entry.name.includes('ec2')
        ) {
          technologies.push('AWS');
        }

        // GCP indicators
        if (
          entry.name.includes('gcp') ||
          entry.name.includes('google-cloud') ||
          entry.name.includes('gke')
        ) {
          technologies.push('GCP');
        }

        // Azure indicators
        if (entry.name.includes('azure') || entry.name.includes('aks')) {
          technologies.push('Azure');
        }

        // Kubernetes indicators
        if (
          entry.name.includes('k8s') ||
          entry.name.includes('kubernetes') ||
          entry.name.includes('helm')
        ) {
          technologies.push('Kubernetes');
        }

        // Terraform indicators
        if (entry.name.includes('terraform') || entry.name.includes('tf')) {
          technologies.push('Terraform');
        }

        // Check for terraform files in subdirectories
        try {
          const subFiles = await fs.readdir(dirPath);
          if (subFiles.some(f => f.endsWith('.tf') || f.endsWith('.tfvars'))) {
            technologies.push('Terraform');
          }
          if (subFiles.some(f => f.includes('helm') || f.endsWith('.yaml') || f.endsWith('.yml'))) {
            // Check if it's Kubernetes YAML
            for (const file of subFiles.filter(f => f.endsWith('.yaml') || f.endsWith('.yml'))) {
              try {
                const content = await fs.readFile(path.join(dirPath, file), 'utf-8');
                if (content.includes('apiVersion:') && content.includes('kind:')) {
                  technologies.push('Kubernetes');
                  break;
                }
              } catch {
                // Skip unreadable files
              }
            }
          }
        } catch {
          // Skip unreadable directories
        }
      }
    }
  } catch (error) {
    console.warn('Cloud provider detection warning:', error);
  }
}

async function detectArchitecturalPatterns(files: string[]): Promise<string[]> {
  const patterns: string[] = [];

  // Pattern detection based on file structure
  const fileNames = files.map(f => path.basename(f).toLowerCase());
  const filePaths = files.map(f => f.toLowerCase());

  // Traditional software patterns
  if (fileNames.some(name => name.includes('controller'))) patterns.push('MVC');
  if (fileNames.some(name => name.includes('service'))) patterns.push('Service Layer');
  if (fileNames.some(name => name.includes('repository'))) patterns.push('Repository Pattern');
  if (fileNames.some(name => name.includes('factory'))) patterns.push('Factory Pattern');
  if (fileNames.some(name => name.includes('adapter'))) patterns.push('Adapter Pattern');
  if (fileNames.some(name => name.includes('facade'))) patterns.push('Facade Pattern');
  if (fileNames.some(name => name.includes('observer'))) patterns.push('Observer Pattern');

  // Cloud and DevOps patterns (specialized for Tosin's expertise)

  // Microservices patterns
  if (filePaths.some(path => path.includes('microservice') || path.includes('service'))) {
    patterns.push('Microservices Architecture');
  }

  // Container patterns
  if (fileNames.some(name => name.includes('dockerfile'))) patterns.push('Containerization');
  if (fileNames.some(name => name.includes('docker-compose')))
    patterns.push('Multi-Container Application');

  // Kubernetes patterns
  if (fileNames.some(name => name.includes('deployment.yaml') || name.includes('deployment.yml'))) {
    patterns.push('Kubernetes Deployment');
  }
  if (fileNames.some(name => name.includes('service.yaml') || name.includes('service.yml'))) {
    patterns.push('Kubernetes Service Mesh');
  }
  if (fileNames.some(name => name.includes('ingress'))) patterns.push('Ingress Controller');
  if (fileNames.some(name => name.includes('configmap') || name.includes('secret'))) {
    patterns.push('Configuration Management');
  }

  // Infrastructure as Code patterns
  if (fileNames.some(name => name.includes('.tf') || name.includes('terraform'))) {
    patterns.push('Infrastructure as Code (Terraform)');
  }
  if (fileNames.some(name => name.includes('cloudformation'))) {
    patterns.push('Infrastructure as Code (CloudFormation)');
  }

  // Cloud-native patterns
  if (fileNames.some(name => name.includes('lambda') || name.includes('function'))) {
    patterns.push('Serverless/FaaS');
  }
  if (fileNames.some(name => name.includes('api-gateway') || name.includes('gateway'))) {
    patterns.push('API Gateway');
  }
  if (
    fileNames.some(
      name => name.includes('load-balancer') || name.includes('alb') || name.includes('nlb')
    )
  ) {
    patterns.push('Load Balancing');
  }

  // DevOps patterns
  if (
    fileNames.some(name => name.includes('pipeline') || name.includes('ci') || name.includes('cd'))
  ) {
    patterns.push('CI/CD Pipeline');
  }
  if (fileNames.some(name => name.includes('ansible') || name.includes('playbook'))) {
    patterns.push('Configuration Management (Ansible)');
  }

  // Monitoring and observability patterns
  if (fileNames.some(name => name.includes('prometheus') || name.includes('metrics'))) {
    patterns.push('Metrics Collection');
  }
  if (fileNames.some(name => name.includes('grafana') || name.includes('dashboard'))) {
    patterns.push('Observability Dashboard');
  }
  if (
    fileNames.some(
      name => name.includes('jaeger') || name.includes('zipkin') || name.includes('tracing')
    )
  ) {
    patterns.push('Distributed Tracing');
  }
  if (
    fileNames.some(
      name => name.includes('logging') || name.includes('fluentd') || name.includes('logstash')
    )
  ) {
    patterns.push('Centralized Logging');
  }

  // Cloud provider specific patterns
  if (fileNames.some(name => name.includes('vpc') || name.includes('subnet'))) {
    patterns.push('Virtual Private Cloud');
  }
  if (fileNames.some(name => name.includes('s3') || name.includes('bucket'))) {
    patterns.push('Object Storage');
  }
  if (fileNames.some(name => name.includes('rds') || name.includes('database'))) {
    patterns.push('Managed Database');
  }
  if (
    fileNames.some(name => name.includes('eks') || name.includes('gke') || name.includes('aks'))
  ) {
    patterns.push('Managed Kubernetes');
  }

  // Security patterns
  if (fileNames.some(name => name.includes('iam') || name.includes('rbac'))) {
    patterns.push('Identity and Access Management');
  }
  if (fileNames.some(name => name.includes('security-group') || name.includes('firewall'))) {
    patterns.push('Network Security');
  }
  if (fileNames.some(name => name.includes('vault') || name.includes('secrets'))) {
    patterns.push('Secret Management');
  }

  // Data patterns
  if (fileNames.some(name => name.includes('etl') || name.includes('pipeline'))) {
    patterns.push('Data Pipeline');
  }
  if (
    fileNames.some(
      name => name.includes('kafka') || name.includes('pubsub') || name.includes('queue')
    )
  ) {
    patterns.push('Event-Driven Architecture');
  }

  return [...new Set(patterns)];
}

async function performTreeSitterAnalysis(files: string[]): Promise<any> {
  const analyzer = new TreeSitterAnalyzer();
  const architecturalElements = {
    apis: [] as string[],
    databases: [] as string[],
    frameworks: [] as string[],
    patterns: [] as string[],
    securityFindings: [] as string[],
    infrastructureResources: [] as string[],
    devopsTools: [] as string[],
  };

  try {
    for (const filePath of files.slice(0, 50)) {
      // Limit to first 50 files for performance
      try {
        const analysis = await analyzer.analyzeFile(filePath);

        // Extract API endpoints and routes
        if (analysis.functions) {
          analysis.functions.forEach(func => {
            if (func.name && isApiFunction(func.name)) {
              architecturalElements.apis.push(`${func.name} (${filePath})`);
            }
            // Enhanced: Add security-sensitive functions
            if (func.securitySensitive) {
              architecturalElements.securityFindings.push(
                `Security-sensitive function: ${func.name} in ${filePath}`
              );
            }
          });
        }

        // Enhanced database and framework detection
        if (analysis.imports) {
          analysis.imports.forEach(imp => {
            if (isDatabaseImport(imp.module)) {
              architecturalElements.databases.push(`${imp.module} (${filePath})`);
            }
            if (isFrameworkImport(imp.module)) {
              architecturalElements.frameworks.push(`${imp.module} (${filePath})`);
            }
            // Enhanced: Add DevOps tools detection
            if (isDevOpsImport(imp.module)) {
              architecturalElements.devopsTools.push(`${imp.module} (${filePath})`);
            }
            // Enhanced: Track dangerous imports
            if (imp.isDangerous) {
              architecturalElements.securityFindings.push(
                `Dangerous import: ${imp.module} in ${filePath}${imp.reason ? ` - ${imp.reason}` : ''}`
              );
            }
          });
        }

        // Enhanced infrastructure analysis for enterprise DevOps
        if (analysis.infraStructure) {
          analysis.infraStructure.forEach(infra => {
            architecturalElements.patterns.push(
              `${infra.resourceType}: ${infra.name} (${infra.provider})`
            );
            architecturalElements.infrastructureResources.push(
              `${infra.provider}: ${infra.resourceType} (${filePath})`
            );
            // Enhanced: Track security risks in infrastructure
            if (infra.securityRisks.length > 0) {
              infra.securityRisks.forEach(risk => {
                architecturalElements.securityFindings.push(
                  `Infrastructure security risk in ${filePath}: ${risk}`
                );
              });
            }
          });
        }

        // Enhanced security analysis
        if (analysis.hasSecrets) {
          analysis.secrets.forEach(secret => {
            architecturalElements.securityFindings.push(
              `${secret.type} detected in ${filePath} at line ${secret.location.line} (confidence: ${secret.confidence})`
            );
          });
        }

        // Enhanced: Security issues from tree-sitter analysis
        if (analysis.securityIssues && analysis.securityIssues.length > 0) {
          analysis.securityIssues.forEach(issue => {
            architecturalElements.securityFindings.push(
              `${issue.severity.toUpperCase()}: ${issue.message} in ${filePath} at line ${issue.location.line}`
            );
          });
        }

        // Enhanced: Architectural violations
        if (analysis.architecturalViolations && analysis.architecturalViolations.length > 0) {
          analysis.architecturalViolations.forEach(violation => {
            architecturalElements.patterns.push(
              `Architectural violation in ${filePath}: ${violation.message}`
            );
          });
        }

        // Enhanced: Track language-specific patterns
        if (analysis.language) {
          switch (analysis.language) {
            case 'python':
              architecturalElements.patterns.push(`Python microservice detected (${filePath})`);
              break;
            case 'typescript':
            case 'javascript':
              architecturalElements.patterns.push(`Node.js application detected (${filePath})`);
              break;
            case 'yaml':
              architecturalElements.patterns.push(
                `Configuration/Infrastructure YAML (${filePath})`
              );
              break;
            case 'hcl':
              architecturalElements.patterns.push(`Terraform infrastructure (${filePath})`);
              break;
            case 'dockerfile':
              architecturalElements.patterns.push(`Container configuration (${filePath})`);
              break;
            case 'bash':
              architecturalElements.patterns.push(`Shell automation script (${filePath})`);
              break;
          }
        }
      } catch (fileError) {
        // Gracefully skip files that can't be analyzed
        console.warn(`Skipping file analysis for ${filePath}:`, fileError);
      }
    }

    // Deduplicate results
    architecturalElements.apis = [...new Set(architecturalElements.apis)];
    architecturalElements.databases = [...new Set(architecturalElements.databases)];
    architecturalElements.frameworks = [...new Set(architecturalElements.frameworks)];
    architecturalElements.patterns = [...new Set(architecturalElements.patterns)];
    architecturalElements.securityFindings = [...new Set(architecturalElements.securityFindings)];
    architecturalElements.infrastructureResources = [
      ...new Set(architecturalElements.infrastructureResources),
    ];
    architecturalElements.devopsTools = [...new Set(architecturalElements.devopsTools)];

    return architecturalElements;
  } catch (error) {
    console.warn('Tree-sitter analysis failed, using fallback:', error);
    return {
      apis: [],
      databases: [],
      frameworks: [],
      patterns: [],
      securityFindings: [],
      infrastructureResources: [],
      devopsTools: [],
    };
  }
}

/**
 * Helper functions for intelligent detection
 */
function isApiFunction(name: string): boolean {
  const apiPatterns = [
    /^(get|post|put|delete|patch)_/i,
    /^handle_/i,
    /^endpoint_/i,
    /^route_/i,
    /^api_/i,
    /controller$/i,
    /handler$/i,
  ];
  return apiPatterns.some(pattern => pattern.test(name));
}

function isDatabaseImport(module: string): boolean {
  const dbPatterns = [
    'mongoose',
    'sequelize',
    'typeorm',
    'prisma',
    'knex',
    'mongodb',
    'mysql',
    'postgresql',
    'sqlite',
    'redis',
    'firebase',
    'dynamodb',
    'cassandra',
    'neo4j',
    'psycopg2',
    'pymongo',
    'sqlalchemy',
    'django.db',
  ];
  return dbPatterns.some(pattern => module.toLowerCase().includes(pattern));
}

function isFrameworkImport(module: string): boolean {
  const frameworkPatterns = [
    'express',
    'fastify',
    'koa',
    'hapi',
    'nest',
    'flask',
    'django',
    'fastapi',
    'tornado',
    'spring',
    'gin',
    'echo',
    'fiber',
    'react',
    'vue',
    'angular',
    'svelte',
    'next',
    'nuxt',
    'gatsby',
  ];
  return frameworkPatterns.some(pattern => module.toLowerCase().includes(pattern));
}

function isDevOpsImport(module: string): boolean {
  const devopsPatterns = [
    'docker',
    'kubernetes',
    'terraform',
    'ansible',
    'helm',
    'aws-sdk',
    '@aws-sdk',
    'boto3',
    'azure',
    '@azure',
    'google-cloud',
    '@google-cloud',
    'gcp',
    'prometheus',
    'grafana',
    'jaeger',
    'zipkin',
    'jenkins',
    'gitlab',
    'github',
    'ci',
    'cd',
    'vault',
    'consul',
    'etcd',
    'redis',
    'nginx',
    'elasticsearch',
    'logstash',
    'kibana',
    'fluentd',
    'kafka',
    'rabbitmq',
    'celery',
    'airflow',
  ];
  return devopsPatterns.some(pattern => module.toLowerCase().includes(pattern));
}

async function generateUpdatePlanContent(
  reviewResults: AdrReviewResult[],
  _codeAnalysis: CodeAnalysisResult,
  _projectPath: string
): Promise<string> {
  const highPriority = reviewResults.filter(r => r.complianceScore < 5);
  const mediumPriority = reviewResults.filter(r => r.complianceScore >= 5 && r.complianceScore < 8);

  return `
## Update Plan

### Phase 1: Critical Updates (${highPriority.length} ADRs)
${highPriority
  .map(
    adr => `
- **${adr.title}**
  - Score: ${adr.complianceScore}/10
  - Actions: ${adr.recommendations.actions.join(', ')}
  - Timeline: Immediate (1-2 weeks)
`
  )
  .join('\n')}

### Phase 2: Moderate Updates (${mediumPriority.length} ADRs)
${mediumPriority
  .map(
    adr => `
- **${adr.title}**
  - Score: ${adr.complianceScore}/10
  - Actions: ${adr.recommendations.actions.join(', ')}
  - Timeline: Medium term (2-4 weeks)
`
  )
  .join('\n')}

### Implementation Strategy
1. **Document Review**: Update ADRs with current implementation status
2. **Code Alignment**: Implement missing architectural elements
3. **Process Improvement**: Establish regular ADR compliance checks
4. **Team Training**: Ensure understanding of ADR importance

### Success Metrics
- Target compliance score: 8.0+
- Gap reduction: 80%
- Process adherence: 95%
`;
}

function calculateDocumentationQuality(results: AdrReviewResult[]): number {
  // Simplified calculation based on compliance scores
  return results.reduce((sum, r) => sum + r.complianceScore, 0) / results.length;
}

function calculateImplementationFidelity(results: AdrReviewResult[]): number {
  const implemented = results.filter(r => r.codeCompliance.implemented).length;
  return (implemented / results.length) * 10;
}

function calculateArchitecturalConsistency(results: AdrReviewResult[]): number {
  const consistent = results.filter(r => r.complianceScore >= 7).length;
  return (consistent / results.length) * 10;
}
