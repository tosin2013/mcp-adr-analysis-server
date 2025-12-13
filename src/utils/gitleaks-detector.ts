/**
 * Gitleaks integration for sensitive content detection
 *
 * Replaces custom secret detection with industry-standard gitleaks tool
 * while maintaining compatible interface with existing code
 */

import { execSync } from 'node:child_process';
import { writeFileSync, unlinkSync, existsSync, readFileSync } from 'fs';
import { join, basename } from 'path';
import { tmpdir } from 'os';

export interface SensitiveMatch {
  pattern: {
    name: string;
    description: string;
    category: 'credentials' | 'secrets' | 'personal' | 'infrastructure' | 'development';
    severity: 'critical' | 'high' | 'medium' | 'low';
  };
  match: string;
  line: number;
  column: number;
  context: string;
  confidence: number;
  suggestions: string[];
}

export interface SensitiveContentResult {
  filePath: string;
  hasIssues: boolean;
  matches: SensitiveMatch[];
  summary: {
    criticalCount: number;
    highCount: number;
    mediumCount: number;
    lowCount: number;
    totalCount: number;
  };
  recommendations: string[];
}

interface GitLeaksResult {
  Description: string;
  StartLine: number;
  EndLine: number;
  StartColumn: number;
  EndColumn: number;
  Match: string;
  Secret: string;
  File: string;
  SymlinkFile: string;
  Commit: string;
  Entropy: number;
  Author: string;
  Email: string;
  Date: string;
  Message: string;
  Tags: string[];
  RuleID: string;
  Fingerprint: string;
}

/**
 * Analyze content for sensitive information using gitleaks
 */
export async function analyzeSensitiveContent(
  filePath: string,
  content: string
): Promise<SensitiveContentResult> {
  const tempDir = tmpdir();
  const tempFile = join(tempDir, `gitleaks-scan-${Date.now()}-${basename(filePath)}`);
  const outputFile = join(tempDir, `gitleaks-output-${Date.now()}.json`);

  try {
    // Write content to temporary file
    writeFileSync(tempFile, content);

    // Run gitleaks on the temporary file
    const gitleaksConfig = findGitleaksConfig();
    const configArg = gitleaksConfig ? `--config=${gitleaksConfig}` : '';

    try {
      execSync(
        `gitleaks detect --source=${tempFile} --report-format=json --report-path=${outputFile} ${configArg} --no-git`,
        { stdio: 'pipe' }
      );

      // No issues found if gitleaks exits with 0
      return createEmptyResult(filePath);
    } catch (error: any) {
      // Gitleaks exits with 1 when secrets are found
      if (error.status === 1 && existsSync(outputFile)) {
        return parseGitleaksOutput(filePath, outputFile, content);
      }

      // Real error occurred
      console.warn(`Gitleaks analysis failed for ${filePath}:`, error.message);
      return createEmptyResult(filePath);
    }
  } finally {
    // Clean up temporary files
    try {
      if (existsSync(tempFile)) unlinkSync(tempFile);
      if (existsSync(outputFile)) unlinkSync(outputFile);
    } catch {
      // Ignore cleanup errors
    }
  }
}

/**
 * Find gitleaks configuration file
 */
function findGitleaksConfig(): string | null {
  const configPaths = ['.gitleaks.toml', '.gitleaks.yml', '.gitleaks.yaml', 'gitleaks.toml'];

  for (const configPath of configPaths) {
    if (existsSync(configPath)) {
      return configPath;
    }
  }

  return null;
}

/**
 * Parse gitleaks JSON output
 */
function parseGitleaksOutput(
  filePath: string,
  outputFile: string,
  content: string
): SensitiveContentResult {
  try {
    const outputContent = readFileSync(outputFile, 'utf8');
    const gitleaksResults: GitLeaksResult[] = JSON.parse(outputContent);

    const matches: SensitiveMatch[] = gitleaksResults.map(result => ({
      pattern: {
        name: result.RuleID,
        description: result.Description,
        category: categorizeRule(result.RuleID, result.Tags),
        severity: getSeverity(result.RuleID, result.Tags),
      },
      match: result.Secret || result.Match,
      line: result.StartLine,
      column: result.StartColumn,
      context: getContext(content, result.StartLine),
      confidence: calculateConfidence(result),
      suggestions: generateSuggestions(result.RuleID, result.Tags),
    }));

    const summary = {
      criticalCount: matches.filter(m => m.pattern.severity === 'critical').length,
      highCount: matches.filter(m => m.pattern.severity === 'high').length,
      mediumCount: matches.filter(m => m.pattern.severity === 'medium').length,
      lowCount: matches.filter(m => m.pattern.severity === 'low').length,
      totalCount: matches.length,
    };

    return {
      filePath,
      hasIssues: matches.length > 0,
      matches,
      summary,
      recommendations: generateRecommendations(matches),
    };
  } catch (error) {
    console.warn(`Failed to parse gitleaks output:`, error);
    return createEmptyResult(filePath);
  }
}

/**
 * Get context around a line
 */
function getContext(content: string, lineNumber: number): string {
  const lines = content.split('\n');
  const contextStart = Math.max(0, lineNumber - 3);
  const contextEnd = Math.min(lines.length, lineNumber + 2);
  return lines.slice(contextStart, contextEnd).join('\n');
}

/**
 * Categorize gitleaks rule by ID and tags
 */
function categorizeRule(
  ruleId: string,
  _tags: string[]
): 'credentials' | 'secrets' | 'personal' | 'infrastructure' | 'development' {
  const lowerRuleId = ruleId.toLowerCase();

  if (
    lowerRuleId.includes('key') ||
    lowerRuleId.includes('token') ||
    lowerRuleId.includes('credential')
  ) {
    return 'credentials';
  }

  if (lowerRuleId.includes('secret') || lowerRuleId.includes('password')) {
    return 'secrets';
  }

  if (lowerRuleId.includes('email') || lowerRuleId.includes('phone')) {
    return 'personal';
  }

  if (lowerRuleId.includes('ip') || lowerRuleId.includes('url') || lowerRuleId.includes('domain')) {
    return 'infrastructure';
  }

  return 'development';
}

/**
 * Determine severity based on rule ID and tags
 */
function getSeverity(ruleId: string, _tags: string[]): 'critical' | 'high' | 'medium' | 'low' {
  const lowerRuleId = ruleId.toLowerCase();

  // Critical: Production API keys, private keys, database URLs
  if (
    lowerRuleId.includes('private-key') ||
    lowerRuleId.includes('aws-') ||
    lowerRuleId.includes('github-') ||
    lowerRuleId.includes('stripe-') ||
    lowerRuleId.includes('database')
  ) {
    return 'critical';
  }

  // High: Generic secrets, tokens
  if (
    lowerRuleId.includes('secret') ||
    lowerRuleId.includes('token') ||
    lowerRuleId.includes('password')
  ) {
    return 'high';
  }

  // Medium: Personal info, infrastructure details
  if (
    lowerRuleId.includes('email') ||
    lowerRuleId.includes('phone') ||
    lowerRuleId.includes('ip')
  ) {
    return 'medium';
  }

  // Low: Everything else
  return 'low';
}

/**
 * Calculate confidence based on gitleaks result
 */
function calculateConfidence(result: GitLeaksResult): number {
  let confidence = 0.7; // Base confidence for gitleaks detection

  // Entropy-based confidence adjustment
  if (result.Entropy > 4.0) {
    confidence += 0.2;
  }

  // Rule-specific adjustments
  if (result.RuleID.includes('generic')) {
    confidence -= 0.2;
  }

  if (result.RuleID.includes('aws') || result.RuleID.includes('github')) {
    confidence += 0.1;
  }

  return Math.max(0.1, Math.min(1.0, confidence));
}

/**
 * Generate suggestions based on rule
 */
function generateSuggestions(ruleId: string, _tags: string[]): string[] {
  const suggestions: string[] = [];
  const lowerRuleId = ruleId.toLowerCase();

  if (lowerRuleId.includes('key') || lowerRuleId.includes('token')) {
    suggestions.push('Move to environment variables');
    suggestions.push('Use a secrets management service');
    suggestions.push('🚨 ROTATE THIS CREDENTIAL IMMEDIATELY');
  }

  if (lowerRuleId.includes('private-key')) {
    suggestions.push('🚨 CRITICAL: Remove private key from code');
    suggestions.push('Generate new key pair');
    suggestions.push('Store private keys securely outside repository');
  }

  if (lowerRuleId.includes('password')) {
    suggestions.push('Use environment variables for passwords');
    suggestions.push('Consider using encrypted configuration');
  }

  if (lowerRuleId.includes('email') || lowerRuleId.includes('phone')) {
    suggestions.push('Replace with placeholder values');
    suggestions.push('Use fake data for examples');
  }

  // Generic suggestions
  suggestions.push('Add sensitive files to .gitignore');
  suggestions.push('Use the content masking tool to sanitize content');

  return suggestions;
}

/**
 * Generate recommendations based on matches
 */
function generateRecommendations(matches: SensitiveMatch[]): string[] {
  const recommendations: string[] = [];

  if (matches.length === 0) {
    return ['No sensitive content detected'];
  }

  const criticalCount = matches.filter(m => m.pattern.severity === 'critical').length;
  const highCount = matches.filter(m => m.pattern.severity === 'high').length;

  if (criticalCount > 0) {
    recommendations.push(`🚨 ${criticalCount} CRITICAL security issue(s) found - DO NOT COMMIT`);
    recommendations.push('Rotate any exposed credentials immediately');
  }

  if (highCount > 0) {
    recommendations.push(`⚠️ ${highCount} HIGH severity issue(s) found`);
    recommendations.push('Review and secure sensitive information');
  }

  recommendations.push('Use environment variables for sensitive configuration');
  recommendations.push('Consider using a secrets management service');
  recommendations.push('Gitleaks detected these issues - industry-standard tool');

  return recommendations;
}

/**
 * Create empty result when no issues found
 */
function createEmptyResult(filePath: string): SensitiveContentResult {
  return {
    filePath,
    hasIssues: false,
    matches: [],
    summary: {
      criticalCount: 0,
      highCount: 0,
      mediumCount: 0,
      lowCount: 0,
      totalCount: 0,
    },
    recommendations: ['No sensitive content detected by gitleaks'],
  };
}

/**
 * Quick check for obviously sensitive files (compatible with existing code)
 */
export function isObviouslySensitive(filePath: string): boolean {
  const fileName = basename(filePath).toLowerCase();

  const sensitiveFilePatterns = [
    /^\.env$/,
    /^\.env\./,
    /secrets?\./,
    /credentials?\./,
    /private.*key/,
    /id_rsa$/,
    /id_ed25519$/,
    /\.pem$/,
    /\.p12$/,
    /\.pfx$/,
    /keystore/,
    /truststore/,
  ];

  return sensitiveFilePatterns.some(pattern => pattern.test(fileName));
}

/**
 * Integration with existing content masking tool (compatible interface)
 */
export async function integrateWithContentMasking(
  filePath: string,
  content: string
): Promise<{
  sensitiveAnalysis: SensitiveContentResult;
  maskingPrompt?: string;
  combinedRecommendations: string[];
}> {
  // Get gitleaks analysis
  const sensitiveAnalysis = await analyzeSensitiveContent(filePath, content);

  // Try to use existing content masking tool
  let maskingPrompt: string | undefined;
  let existingRecommendations: string[] = [];

  try {
    const { analyzeContentSecurity } = await import('../tools/content-masking-tool.js');
    const maskingResult = await analyzeContentSecurity({
      content,
      contentType: getContentType(filePath),
      enhancedMode: false,
      knowledgeEnhancement: false,
    });

    if (maskingResult.content && maskingResult.content[0]) {
      const resultText = maskingResult.content[0].text;
      const promptMatch = resultText.match(/## AI.*Prompt\n\n(.*?)(?=\n##|$)/s);
      if (promptMatch) {
        maskingPrompt = promptMatch[1];
      }

      const recMatch = resultText.match(/## Next Steps\n\n(.*?)(?=\n##|$)/s);
      if (recMatch) {
        existingRecommendations = recMatch[1].split('\n').filter((line: string) => line.trim());
      }
    }
  } catch {
    // Silently handle integration errors
  }

  // Combine recommendations
  const combinedRecommendations = [
    ...sensitiveAnalysis.recommendations,
    ...existingRecommendations,
  ].filter((rec, index, arr) => arr.indexOf(rec) === index);

  return {
    sensitiveAnalysis,
    ...(maskingPrompt && { maskingPrompt }),
    combinedRecommendations,
  };
}

/**
 * Get content type for file (compatible helper)
 */
function getContentType(
  filePath: string
): 'code' | 'documentation' | 'configuration' | 'logs' | 'general' {
  const ext = filePath.split('.').pop()?.toLowerCase() || '';

  if (['js', 'ts', 'py', 'java', 'cpp', 'c', 'go', 'rs', 'rb', 'php'].includes(ext)) {
    return 'code';
  }

  if (['md', 'txt', 'rst', 'doc', 'docx'].includes(ext)) {
    return 'documentation';
  }

  if (['json', 'yaml', 'yml', 'ini', 'conf', 'config', 'env'].includes(ext)) {
    return 'configuration';
  }

  if (['log', 'out', 'err'].includes(ext)) {
    return 'logs';
  }

  return 'general';
}
