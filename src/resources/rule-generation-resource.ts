/**
 * Rule Generation Resource - AI-powered rule generation from ADRs and patterns
 * URI Pattern: adr://rule_generation
 *
 * Bridges to rule-generation-tool for comprehensive rule generation capabilities
 */

import { URLSearchParams } from 'url';
import { resourceCache, generateETag } from './resource-cache.js';
import { ResourceGenerationResult } from './index.js';

export interface RuleGenerationResult {
  // Basic fields (always present)
  operation: 'generate' | 'validate' | 'create_set';
  source: 'adrs' | 'patterns' | 'both';
  timestamp: string;
  status: 'success' | 'partial' | 'failed';

  // Generation results
  rules?: Array<{
    id: string;
    name: string;
    description: string;
    type: 'architectural' | 'coding' | 'security' | 'performance' | 'documentation';
    severity: 'info' | 'warning' | 'error' | 'critical';
    pattern?: string;
    message: string;
    source: 'adr' | 'inferred' | 'user_defined';
    enabled: boolean;
    rationale?: string;
    implementationGuidance?: string;
  }>;

  summary?: {
    totalRulesGenerated: number;
    byType: Record<string, number>;
    bySeverity: Record<string, number>;
    bySource: Record<string, number>;
  };

  // Enhanced fields from tool integration (optional)
  validation?: {
    totalRules: number;
    validRules: number;
    invalidRules: number;
    validationErrors: Array<{
      rule: string;
      error: string;
      severity: string;
    }>;
    complianceScore: number;
  };

  ruleSet?: {
    id: string;
    name: string;
    description: string;
    rules: string[];
    applicability: {
      projectTypes: string[];
      technologies: string[];
      environments: string[];
    };
    priority: 'critical' | 'high' | 'medium' | 'low';
  };

  extraction?: {
    adrsAnalyzed: number;
    patternsIdentified: number;
    rulesExtracted: number;
    confidenceScores: Record<string, number>;
  };

  knowledgeEnhancement?: {
    enabled: boolean;
    domains: string[];
    governanceKnowledge: string[];
  };

  analysisMetadata: {
    operation: string;
    timestamp: string;
    confidence: number;
    source: 'basic' | 'comprehensive-tool';
    knowledgeEnhancement: boolean;
    enhancedMode: boolean;
  };
}

/**
 * Extract structured data from rule-generation-tool output
 */
function extractRuleDataFromToolOutput(toolOutput: string, operation: string): Partial<RuleGenerationResult> {
  const extracted: Partial<RuleGenerationResult> = {};

  // Extract generated rules
  const rules: Array<{
    id: string;
    name: string;
    description: string;
    type: 'architectural' | 'coding' | 'security' | 'performance' | 'documentation';
    severity: 'info' | 'warning' | 'error' | 'critical';
    pattern?: string;
    message: string;
    source: 'adr' | 'inferred' | 'user_defined';
    enabled: boolean;
    rationale?: string;
    implementationGuidance?: string;
  }> = [];

  // Extract rules from JSON blocks or structured output
  const jsonBlockMatch = toolOutput.match(/```json\s*([\s\S]*?)\s*```/);
  if (jsonBlockMatch && jsonBlockMatch[1]) {
    try {
      const parsed = JSON.parse(jsonBlockMatch[1]);
      if (Array.isArray(parsed)) {
        rules.push(...parsed);
      } else if (parsed.rules && Array.isArray(parsed.rules)) {
        rules.push(...parsed.rules);
      }
    } catch {
      // JSON parsing failed, continue with text extraction
    }
  }

  // Extract rules from text format
  const ruleMatches = toolOutput.matchAll(/(?:Rule|rule)[:\s]+([^\n]+)/gi);
  for (const match of ruleMatches) {
    if (match[1] && rules.length < 20) { // Limit extraction
      const ruleName = match[1].trim();

      // Try to find description
      const descPattern = new RegExp(`${ruleName}[\\s\\S]{0,200}?description[:\\s]+([^\\n]+)`, 'i');
      const descMatch = toolOutput.match(descPattern);

      rules.push({
        id: `rule-${Date.now()}-${rules.length}`,
        name: ruleName,
        description: descMatch && descMatch[1] ? descMatch[1].trim() : `Rule: ${ruleName}`,
        type: toolOutput.toLowerCase().includes('security') ? 'security' :
              toolOutput.toLowerCase().includes('performance') ? 'performance' :
              toolOutput.toLowerCase().includes('architect') ? 'architectural' : 'coding',
        severity: toolOutput.toLowerCase().includes('critical') ? 'critical' :
                  toolOutput.toLowerCase().includes('error') ? 'error' :
                  toolOutput.toLowerCase().includes('warning') ? 'warning' : 'info',
        message: `Follow rule: ${ruleName}`,
        source: 'adr',
        enabled: true,
      });
    }
  }

  if (rules.length > 0) {
    extracted.rules = rules;

    // Generate summary
    const byType: Record<string, number> = {};
    const bySeverity: Record<string, number> = {};
    const bySource: Record<string, number> = {};

    for (const rule of rules) {
      byType[rule.type] = (byType[rule.type] || 0) + 1;
      bySeverity[rule.severity] = (bySeverity[rule.severity] || 0) + 1;
      bySource[rule.source] = (bySource[rule.source] || 0) + 1;
    }

    extracted.summary = {
      totalRulesGenerated: rules.length,
      byType,
      bySeverity,
      bySource,
    };
  }

  // Extract validation results
  if (operation === 'validate' && toolOutput.includes('valid')) {
    const validMatch = toolOutput.match(/(\d+)\s+valid/i);
    const invalidMatch = toolOutput.match(/(\d+)\s+invalid/i);
    const totalMatch = toolOutput.match(/(\d+)\s+total/i);
    const complianceMatch = toolOutput.match(/compliance[:\s]+(\d+)%/i);

    const validRules = validMatch && validMatch[1] ? parseInt(validMatch[1]) : 0;
    const invalidRules = invalidMatch && invalidMatch[1] ? parseInt(invalidMatch[1]) : 0;
    const totalRules = totalMatch && totalMatch[1] ? parseInt(totalMatch[1]) : validRules + invalidRules;

    extracted.validation = {
      totalRules,
      validRules,
      invalidRules,
      validationErrors: [],
      complianceScore: complianceMatch && complianceMatch[1] ? parseInt(complianceMatch[1]) : totalRules > 0 ? Math.round((validRules / totalRules) * 100) : 100,
    };

    // Extract validation errors
    const errorMatches = toolOutput.matchAll(/(?:error|invalid)[:\s]+(.*?)(?:\n|$)/gi);
    for (const match of errorMatches) {
      if (match[1] && extracted.validation) {
        extracted.validation.validationErrors.push({
          rule: 'unknown',
          error: match[1].trim(),
          severity: 'error',
        });
      }
    }
  }

  // Extract rule set information
  if (operation === 'create_set' && toolOutput.includes('rule set')) {
    const setNameMatch = toolOutput.match(/(?:set|name)[:\s]+([^\n]+)/i);
    const setDescMatch = toolOutput.match(/description[:\s]+([^\n]+)/i);

    extracted.ruleSet = {
      id: `ruleset-${Date.now()}`,
      name: setNameMatch && setNameMatch[1] ? setNameMatch[1].trim() : 'Generated Rule Set',
      description: setDescMatch && setDescMatch[1] ? setDescMatch[1].trim() : 'Automatically generated rule set',
      rules: rules.map(r => r.id),
      applicability: {
        projectTypes: [],
        technologies: [],
        environments: [],
      },
      priority: 'medium',
    };
  }

  // Extract extraction statistics
  const adrsMatch = toolOutput.match(/(\d+)\s+ADRs?/i);
  const patternsMatch = toolOutput.match(/(\d+)\s+patterns?/i);
  const extractedMatch = toolOutput.match(/(\d+)\s+(?:rules?\s+)?extracted/i);

  if (adrsMatch || patternsMatch || extractedMatch) {
    extracted.extraction = {
      adrsAnalyzed: adrsMatch && adrsMatch[1] ? parseInt(adrsMatch[1]) : 0,
      patternsIdentified: patternsMatch && patternsMatch[1] ? parseInt(patternsMatch[1]) : 0,
      rulesExtracted: extractedMatch && extractedMatch[1] ? parseInt(extractedMatch[1]) : rules.length,
      confidenceScores: {},
    };
  }

  // Extract knowledge enhancement info
  if (toolOutput.includes('knowledge') || toolOutput.includes('governance')) {
    const domains: string[] = [];

    if (toolOutput.includes('api')) domains.push('api-design');
    if (toolOutput.includes('security')) domains.push('security-patterns');
    if (toolOutput.includes('architecture')) domains.push('architectural-governance');

    extracted.knowledgeEnhancement = {
      enabled: true,
      domains,
      governanceKnowledge: [],
    };
  }

  return extracted;
}

/**
 * Generate basic rule generation result (fallback)
 */
async function generateBasicRuleGeneration(
  operation: 'generate' | 'validate' | 'create_set',
  source: 'adrs' | 'patterns' | 'both'
): Promise<RuleGenerationResult> {
  return {
    operation,
    source,
    timestamp: new Date().toISOString(),
    status: 'partial',
    rules: [],
    summary: {
      totalRulesGenerated: 0,
      byType: {},
      bySeverity: {},
      bySource: {},
    },
    analysisMetadata: {
      operation,
      timestamp: new Date().toISOString(),
      confidence: 0.5,
      source: 'basic',
      knowledgeEnhancement: false,
      enhancedMode: false,
    },
  };
}

/**
 * Generate comprehensive rule generation using rule-generation-tool
 */
async function generateComprehensiveRuleGeneration(
  operation: 'generate' | 'validate' | 'create_set',
  source: 'adrs' | 'patterns' | 'both',
  adrDirectory: string,
  projectPath: string,
  knowledgeEnhancement: boolean,
  enhancedMode: boolean,
  outputFormat: 'json' | 'yaml' | 'both'
): Promise<RuleGenerationResult> {
  try {
    let toolResult: any;

    if (operation === 'generate') {
      // Import and call the comprehensive tool
      const { generateRules } = await import('../tools/rule-generation-tool.js');

      toolResult = await generateRules({
        source,
        adrDirectory,
        projectPath,
        outputFormat,
        knowledgeEnhancement,
        enhancedMode,
      });
    } else if (operation === 'validate') {
      const { validateRules } = await import('../tools/rule-generation-tool.js');

      // Load rules to validate (empty array for now - would need actual rules)
      toolResult = await validateRules({
        rules: [], // TODO: Load actual rules for validation
        projectPath,
        reportFormat: 'detailed',
      });
    } else if (operation === 'create_set') {
      const { createRuleSet } = await import('../tools/rule-generation-tool.js');

      toolResult = await createRuleSet({
        name: 'Generated Rule Set',
        description: 'AI-generated architectural rules from ADRs and patterns',
        rules: [], // TODO: Provide actual rules for the set
        outputFormat,
      });
    }

    // Extract text content from tool result
    let toolOutputText = '';
    if (toolResult && toolResult.content && Array.isArray(toolResult.content)) {
      for (const item of toolResult.content) {
        if (item.type === 'text' && item.text) {
          toolOutputText += item.text + '\n';
        }
      }
    }

    // Get basic data
    const basicResult = await generateBasicRuleGeneration(operation, source);

    // Extract enhanced data from tool output
    const enhancedData = extractRuleDataFromToolOutput(toolOutputText, operation);

    // Merge basic and enhanced data
    const comprehensiveResult: RuleGenerationResult = {
      ...basicResult,
      ...enhancedData,
      status: enhancedData.rules && enhancedData.rules.length > 0 ? 'success' : 'partial',
      analysisMetadata: {
        operation,
        timestamp: new Date().toISOString(),
        confidence: 0.9,
        source: 'comprehensive-tool',
        knowledgeEnhancement,
        enhancedMode,
      },
    };

    return comprehensiveResult;
  } catch (error) {
    console.error('[rule-generation-resource] Tool execution failed, falling back to basic generation:', error);
    return generateBasicRuleGeneration(operation, source);
  }
}

/**
 * Generate rule generation resource
 */
export async function generateRuleGenerationResource(
  _params?: Record<string, string>,
  searchParams?: URLSearchParams
): Promise<ResourceGenerationResult> {
  // Extract query parameters
  const operation = (searchParams?.get('operation') || 'generate') as 'generate' | 'validate' | 'create_set';
  const source = (searchParams?.get('source') || 'both') as 'adrs' | 'patterns' | 'both';
  const adrDirectory = searchParams?.get('adr_directory') || process.env['ADR_DIRECTORY'] || 'docs/adrs';
  const projectPath = searchParams?.get('project_path') || process.cwd();
  const knowledgeEnhancement = searchParams?.get('knowledge') !== 'false';
  const enhancedMode = searchParams?.get('enhanced') !== 'false';
  const outputFormat = (searchParams?.get('format') || 'json') as 'json' | 'yaml' | 'both';
  const useComprehensive = searchParams?.get('comprehensive') !== 'false';

  const cacheKey = `rule-generation:${operation}:${source}:${knowledgeEnhancement}:${enhancedMode}:${useComprehensive}`;

  // Check cache
  const cached = await resourceCache.get<ResourceGenerationResult>(cacheKey);
  if (cached) {
    return cached;
  }

  // Generate rule generation result (comprehensive or basic)
  let ruleGenerationResult: RuleGenerationResult;

  if (useComprehensive) {
    ruleGenerationResult = await generateComprehensiveRuleGeneration(
      operation,
      source,
      adrDirectory,
      projectPath,
      knowledgeEnhancement,
      enhancedMode,
      outputFormat
    );
  } else {
    ruleGenerationResult = await generateBasicRuleGeneration(operation, source);
  }

  const result: ResourceGenerationResult = {
    data: ruleGenerationResult,
    contentType: 'application/json',
    lastModified: new Date().toISOString(),
    cacheKey,
    ttl: 300, // 5 minutes cache
    etag: generateETag(ruleGenerationResult),
  };

  // Cache result
  resourceCache.set(cacheKey, result, result.ttl);

  return result;
}
