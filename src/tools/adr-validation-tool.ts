/**
 * ADR Validation Tool - Research-Driven Architecture Compliance Checker
 *
 * Validates existing ADRs against actual infrastructure state using:
 * - Research Orchestrator (live environment data)
 * - AI Executor (intelligent analysis)
 * - Knowledge Graph (ADR relationships)
 */

import { McpAdrError } from '../types/index.js';
import { answerResearchQuestion } from '../utils/research-orchestrator.js';
import { getAIExecutor } from '../utils/ai-executor.js';
import * as fs from 'fs/promises';
import * as path from 'path';

export interface ADRValidationResult {
  adrPath: string;
  adrTitle: string;
  isValid: boolean;
  confidence: number;
  findings: Array<{
    type: 'compliance' | 'drift' | 'outdated' | 'missing_evidence' | 'conflict';
    severity: 'critical' | 'high' | 'medium' | 'low';
    description: string;
    evidence: string;
  }>;
  recommendations: string[];
  researchData: {
    sources: string[];
    confidence: number;
    needsWebSearch: boolean;
  };
}

/**
 * Validate an ADR against current infrastructure reality
 *
 * @description Performs comprehensive validation of Architecture Decision Records (ADRs)
 * against actual project infrastructure and environment state. Uses research orchestration,
 * AI analysis, and knowledge graph relationships to detect compliance issues, drift,
 * and outdated decisions.
 *
 * @param {Object} args - Validation configuration parameters
 * @param {string} args.adrPath - Path to the ADR file to validate
 * @param {string} [args.projectPath] - Path to project root (defaults to cwd)
 * @param {string} [args.adrDirectory] - ADR directory relative to project (defaults to 'docs/adrs')
 * @param {boolean} [args.includeEnvironmentCheck] - Enable environment validation (defaults to true)
 * @param {number} [args.confidenceThreshold] - Minimum confidence for findings (0-1, defaults to 0.6)
 *
 * @returns {Promise<ADRValidationResult>} Comprehensive validation results with findings and recommendations
 *
 * @throws {McpAdrError} When ADR file doesn't exist or validation process fails
 *
 * @example
 * ```typescript
 * // Validate specific ADR
 * const result = await validateAdr({
 *   adrPath: 'docs/adrs/0001-use-microservices.md'
 * });
 *
 * console.log(result.isValid);        // false
 * console.log(result.confidence);     // 0.92
 * console.log(result.findings);       // Array of compliance issues
 * console.log(result.recommendations); // Suggested actions
 * ```
 *
 * @example
 * ```typescript
 * // Validate with custom settings
 * const result = await validateAdr({
 *   adrPath: 'docs/adrs/0002-database-choice.md',
 *   projectPath: '/path/to/project',
 *   includeEnvironmentCheck: false,
 *   confidenceThreshold: 0.8
 * });
 *
 * // Check for critical issues
 * const criticalIssues = result.findings.filter(f => f.severity === 'critical');
 * if (criticalIssues.length > 0) {
 *   console.warn('Critical compliance issues found:', criticalIssues);
 * }
 * ```
 *
 * @since 2.0.0
 * @category ADR
 * @category Validation
 * @category Tools
 * @mcp-tool
 */
export async function validateAdr(args: {
  adrPath: string;
  projectPath?: string;
  adrDirectory?: string;
  includeEnvironmentCheck?: boolean;
  confidenceThreshold?: number;
}): Promise<any> {
  const { result, research, aiAvailable } = await computeAdrValidation(args);

  return {
    content: [
      {
        type: 'text',
        text: formatValidationResponse(result, research, aiAvailable),
      },
    ],
  };
}

/**
 * Compute a validation result for one ADR.
 *
 * Split out of `validateAdr` because `validateAllAdrs` needs the STRUCTURE, and
 * previously had no way to get it: `validateAdr` returned formatted markdown, so
 * the bulk path awaited it, discarded the return, and pushed `isValid: true`
 * unconditionally. Every summary reported 100% valid and 0 critical issues. (#1539)
 */
async function computeAdrValidation(args: {
  adrPath: string;
  projectPath?: string;
  adrDirectory?: string;
  includeEnvironmentCheck?: boolean;
  confidenceThreshold?: number;
}): Promise<{ result: ADRValidationResult; research: any; aiAvailable: boolean }> {
  const {
    adrPath,
    projectPath = process.cwd(),
    adrDirectory = 'docs/adrs',
    includeEnvironmentCheck: _includeEnvironmentCheck = true,
    confidenceThreshold: _confidenceThreshold = 0.6,
  } = args;

  try {
    // Step 1: Read the ADR content
    const fullAdrPath = path.isAbsolute(adrPath) ? adrPath : path.join(projectPath, adrPath);
    let adrContent: string;

    try {
      adrContent = await fs.readFile(fullAdrPath, 'utf-8');
    } catch (error) {
      throw new McpAdrError(
        `Failed to read ADR at ${fullAdrPath}: ${error instanceof Error ? error.message : String(error)}`,
        'FILE_READ_ERROR'
      );
    }

    // Step 2: Extract ADR metadata
    const adrTitle = extractAdrTitle(adrContent);
    const adrDecision = extractAdrDecision(adrContent);
    const adrContext = extractAdrContext(adrContent);

    // Step 3: Research current infrastructure state
    const researchQuestion = `Based on the ADR titled "${adrTitle}", verify if the following is still true: ${adrDecision}. Check project files, environment state, and existing implementations.`;

    const research = await answerResearchQuestion(researchQuestion, projectPath, adrDirectory);

    // Step 4: Use AI to analyze alignment
    const aiExecutor = getAIExecutor();
    let validationResult: ADRValidationResult;

    if (aiExecutor.isAvailable()) {
      // AI-powered validation
      const aiAnalysis = await aiExecutor.executeStructuredPrompt<{
        isValid: boolean;
        confidence: number;
        findings: Array<{
          type: 'compliance' | 'drift' | 'outdated' | 'missing_evidence' | 'conflict';
          severity: 'critical' | 'high' | 'medium' | 'low';
          description: string;
          evidence: string;
        }>;
        recommendations: string[];
      }>(
        `You are an expert at validating Architecture Decision Records (ADRs) against actual infrastructure.

**ADR Being Validated:**
Title: ${adrTitle}
Decision: ${adrDecision}
Context: ${adrContext}

**Current Infrastructure Research:**
${research.answer}

**Research Confidence:** ${(research.confidence * 100).toFixed(1)}%
**Sources Consulted:** ${research.sources.map(s => s.type).join(', ')}
**Files Analyzed:** ${research.metadata.filesAnalyzed}

**Your Task:**
Analyze if the ADR decision is still valid and being followed in the current infrastructure.

Return JSON with:
{
  "isValid": boolean,
  "confidence": number (0-1),
  "findings": [
    {
      "type": "compliance" | "drift" | "outdated" | "missing_evidence" | "conflict",
      "severity": "critical" | "high" | "medium" | "low",
      "description": "Clear description of the finding",
      "evidence": "Specific evidence from research data"
    }
  ],
  "recommendations": ["Actionable recommendations"]
}`,
        null,
        {
          temperature: 0.2,
          maxTokens: 2000,
          systemPrompt:
            'You are a meticulous architecture validator. Base your analysis ONLY on the research evidence provided. Do not hallucinate or assume information not present in the research data.',
        }
      );

      validationResult = {
        adrPath: fullAdrPath,
        adrTitle,
        isValid: aiAnalysis.data.isValid,
        confidence: aiAnalysis.data.confidence,
        findings: aiAnalysis.data.findings,
        recommendations: aiAnalysis.data.recommendations,
        researchData: {
          sources: research.sources.map(s => s.type),
          confidence: research.confidence,
          needsWebSearch: research.needsWebSearch,
        },
      };
    } else {
      // Fallback: Rule-based validation
      validationResult = performRuleBasedValidation(fullAdrPath, adrTitle, adrDecision, research);
    }

    // The "related ADRs" step is gone. It called
    // KnowledgeGraphManager.getRelationships, which is @deprecated and returns []
    // unconditionally, and rendered the empty result as a section of the report.
    // A heading that is always empty because its source is a stub is worse than
    // no heading. `queryKnowledgeGraph` is the documented replacement if this is
    // ever wanted back. (#1539)
    return { result: validationResult, research, aiAvailable: aiExecutor.isAvailable() };
  } catch (error) {
    throw new McpAdrError(
      `ADR validation failed: ${error instanceof Error ? error.message : String(error)}`,
      'VALIDATION_ERROR'
    );
  }
}

/**
 * Validate multiple ADRs in a directory
 */
export async function validateAllAdrs(args: {
  projectPath?: string;
  adrDirectory?: string;
  includeEnvironmentCheck?: boolean;
  minConfidence?: number;
}): Promise<any> {
  const {
    projectPath = process.cwd(),
    adrDirectory = 'docs/adrs',
    includeEnvironmentCheck = true,
    minConfidence = 0.6,
  } = args;

  try {
    const fullAdrDir = path.join(projectPath, adrDirectory);

    // Find all ADR files
    const files = await fs.readdir(fullAdrDir);
    const adrFiles = files.filter(f => f.endsWith('.md') && f.match(/adr-\d+/i));

    const results: ADRValidationResult[] = [];

    for (const adrFile of adrFiles) {
      try {
        // The verdict comes from the validation, not from a literal. This loop
        // used to `await validateAdr(...)` for its side effects, throw the return
        // away, and push `isValid: true` -- so every summary read 100% valid and
        // 0 critical issues regardless of what was in docs/adrs/. (#1539)
        const { result } = await computeAdrValidation({
          adrPath: path.join(adrDirectory, adrFile),
          projectPath,
          adrDirectory,
          includeEnvironmentCheck,
          confidenceThreshold: minConfidence,
        });

        results.push(result);
      } catch (error) {
        console.warn(`Failed to validate ${adrFile}:`, error);
      }
    }

    // Generate summary
    const totalAdrs = results.length;
    const validAdrs = results.filter(r => r.isValid).length;
    const criticalIssues = results.reduce(
      (sum, r) => sum + r.findings.filter(f => f.severity === 'critical').length,
      0
    );

    return {
      content: [
        {
          type: 'text',
          text: `# ADR Validation Summary

## Overview
- **Total ADRs Validated**: ${totalAdrs}
- **Valid ADRs**: ${validAdrs} (${((validAdrs / totalAdrs) * 100).toFixed(1)}%)
- **Invalid/Drifted ADRs**: ${totalAdrs - validAdrs}
- **Critical Issues**: ${criticalIssues}

## Validation Results

${results
  .map(
    r => `### ${r.adrTitle}
- **Status**: ${r.isValid ? '✅ Valid' : '⚠️ Needs Review'}
- **Confidence**: ${(r.confidence * 100).toFixed(1)}%
- **Findings**: ${r.findings.length}
- **Path**: ${r.adrPath}
`
  )
  .join('\n')}

## Recommendations

${results
  .filter(r => !r.isValid)
  .map(r => `### ${r.adrTitle}\n${r.recommendations.map(rec => `- ${rec}`).join('\n')}`)
  .join('\n\n')}
`,
        },
      ],
    };
  } catch (error) {
    throw new McpAdrError(
      `Bulk ADR validation failed: ${error instanceof Error ? error.message : String(error)}`,
      'BULK_VALIDATION_ERROR'
    );
  }
}

// Helper functions

function extractAdrTitle(content: string): string {
  const titleMatch = content.match(/^#\s+(.+)$/m);
  return titleMatch?.[1]?.trim() || 'Untitled ADR';
}

function extractAdrDecision(content: string): string {
  const decisionMatch = content.match(/##\s+Decision\s*\n\n([\s\S]+?)(?=\n##|$)/i);
  const decisionText = decisionMatch?.[1]?.trim();
  return decisionText ? decisionText.substring(0, 500) : 'No decision section found';
}

function extractAdrContext(content: string): string {
  const contextMatch = content.match(/##\s+Context\s*\n\n([\s\S]+?)(?=\n##|$)/i);
  return contextMatch?.[1]?.trim().substring(0, 500) ?? 'No context section found';
}

function performRuleBasedValidation(
  adrPath: string,
  adrTitle: string,
  adrDecision: string,
  research: any
): ADRValidationResult {
  const findings: ADRValidationResult['findings'] = [];

  // An ADR whose Decision section is absent or empty records no decision. Before
  // #1539 this path could only emit medium/low findings, so `isValid` -- computed
  // as "no critical or high findings" -- was true for every ADR ever passed to it.
  // The rule needed at least one condition it could actually fail.
  //
  // Not hypothetical: ADR-023 shipped Accepted with an empty Decision and needed
  // #1490 to record one.
  if (!adrDecision || adrDecision === 'No decision section found') {
    findings.push({
      type: 'missing_evidence',
      severity: 'critical',
      description: 'ADR records no decision - the Decision section is missing or empty',
      evidence: `No "## Decision" content found in ${adrPath}`,
    });
  }

  // Check if research confidence is low
  if (research.confidence < 0.5) {
    findings.push({
      type: 'missing_evidence',
      severity: 'medium',
      description: 'Low confidence in research findings - may need manual verification',
      evidence: `Research confidence: ${(research.confidence * 100).toFixed(1)}%`,
    });
  }

  // Check if web search is needed
  if (research.needsWebSearch) {
    findings.push({
      type: 'missing_evidence',
      severity: 'low',
      description: 'Additional research may be needed via web search',
      evidence: 'Local sources provided insufficient information',
    });
  }

  return {
    adrPath,
    adrTitle,
    isValid: findings.filter(f => f.severity === 'critical' || f.severity === 'high').length === 0,
    confidence: research.confidence,
    findings,
    recommendations: [
      'Consider updating ADR with current implementation details',
      'Verify decision is still aligned with business requirements',
    ],
    researchData: {
      sources: research.sources.map((s: any) => s.type),
      confidence: research.confidence,
      needsWebSearch: research.needsWebSearch,
    },
  };
}

function formatValidationResponse(
  result: ADRValidationResult,
  research: any,
  aiEnabled: boolean
): string {
  return `# ADR Validation Report

## ADR Information
- **Path**: ${result.adrPath}
- **Title**: ${result.adrTitle}
- **Status**: ${result.isValid ? '✅ Valid' : '⚠️ Needs Review'}
- **Confidence**: ${(result.confidence * 100).toFixed(1)}%

## Validation Method
- **AI-Powered Analysis**: ${aiEnabled ? '✅ Enabled' : '❌ Disabled (using rule-based validation)'}
- **Research-Driven**: ✅ Enabled
- **Environment Check**: ${research.sources.some((s: any) => s.type === 'environment') ? '✅ Completed' : '❌ Skipped'}

## Research Data Used
- **Sources Consulted**: ${result.researchData.sources.join(', ')}
- **Research Confidence**: ${(result.researchData.confidence * 100).toFixed(1)}%
- **Files Analyzed**: ${research.metadata.filesAnalyzed}
- **Search Duration**: ${research.metadata.duration}ms
- **Needs Web Search**: ${result.researchData.needsWebSearch ? '⚠️ Yes' : '✅ No'}

## Findings

${
  result.findings.length > 0
    ? result.findings
        .map(
          finding => `### ${getSeverityIcon(finding.severity)} ${finding.type.toUpperCase()}
**Severity**: ${finding.severity}
**Description**: ${finding.description}
**Evidence**: ${finding.evidence}
`
        )
        .join('\n')
    : '✅ No issues found - ADR appears to be valid and current.'
}

## Recommendations

${result.recommendations.map(rec => `- ${rec}`).join('\n')}


## Next Steps

${
  !result.isValid
    ? `1. **Review Findings**: Address critical and high-severity issues first
2. **Update ADR**: Modify the ADR to reflect current reality
3. **Verify Implementation**: Ensure code matches updated decision
4. **Re-validate**: Run validation again after changes`
    : `1. **Maintain Currency**: Continue monitoring for architectural drift
2. **Update Documentation**: Keep ADR context current with environment changes
3. **Review Periodically**: Re-validate quarterly or when major changes occur`
}

## Research Details

### Infrastructure Answer
${research.answer}

### Sources Detail
${research.sources
  .map(
    (s: any) =>
      `- **${s.type}**: ${s.found ? `✅ Found (confidence: ${(s.confidence * 100).toFixed(1)}%)` : '❌ Not found'}`
  )
  .join('\n')}
`;
}

function getSeverityIcon(severity: string): string {
  switch (severity) {
    case 'critical':
      return '🔴';
    case 'high':
      return '🟠';
    case 'medium':
      return '🟡';
    case 'low':
      return '🟢';
    default:
      return '⚪';
  }
}
