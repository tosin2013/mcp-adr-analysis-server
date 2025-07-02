/**
 * Machine-readable rule format utilities
 * Implements JSON/YAML rule serialization and validation
 */

import { McpAdrError } from '../types/index.js';
import { ArchitecturalRule, ValidationResult } from './rule-generation.js';

export interface RuleSet {
  metadata: {
    version: string;
    name: string;
    description: string;
    created: string;
    lastModified: string;
    author: string;
    tags: string[];
  };
  rules: ArchitecturalRule[];
  categories: Array<{
    name: string;
    description: string;
    priority: 'low' | 'medium' | 'high' | 'critical';
    ruleCount: number;
  }>;
  dependencies: Array<{
    ruleId: string;
    dependsOn: string[];
    conflictsWith: string[];
    relationship: 'requires' | 'enhances' | 'conflicts' | 'supersedes';
  }>;
}

export interface ComplianceReport {
  metadata: {
    reportId: string;
    generatedAt: string;
    projectName: string;
    ruleSetVersion: string;
    scope: string;
  };
  summary: {
    overallCompliance: number;
    totalFiles: number;
    totalRules: number;
    totalViolations: number;
    riskLevel: 'low' | 'medium' | 'high' | 'critical';
  };
  results: ValidationResult[];
  trends: Array<{
    date: string;
    compliance: number;
    violations: number;
  }>;
}

/**
 * Create a new rule set with metadata
 */
export function createRuleSet(
  name: string,
  description: string,
  rules: ArchitecturalRule[],
  author: string = 'MCP ADR Analysis Server'
): RuleSet {
  const now = new Date().toISOString();
  
  // Group rules by category
  const categoryMap = new Map<string, ArchitecturalRule[]>();
  rules.forEach(rule => {
    const category = rule.category;
    if (!categoryMap.has(category)) {
      categoryMap.set(category, []);
    }
    categoryMap.get(category)!.push(rule);
  });
  
  // Create category summaries
  const categories = Array.from(categoryMap.entries()).map(([name, categoryRules]) => ({
    name,
    description: getCategoryDescription(name),
    priority: getCategoryPriority(name),
    ruleCount: categoryRules.length
  }));
  
  // Extract rule dependencies
  const dependencies = extractRuleDependencies(rules);
  
  return {
    metadata: {
      version: '1.0.0',
      name,
      description,
      created: now,
      lastModified: now,
      author,
      tags: extractRuleTags(rules)
    },
    rules,
    categories,
    dependencies
  };
}

/**
 * Serialize rule set to JSON
 */
export function serializeRuleSetToJson(ruleSet: RuleSet): string {
  try {
    return JSON.stringify(ruleSet, null, 2);
  } catch (error) {
    throw new McpAdrError(
      `Failed to serialize rule set to JSON: ${error instanceof Error ? error.message : String(error)}`,
      'SERIALIZATION_ERROR'
    );
  }
}

/**
 * Serialize rule set to YAML
 */
export function serializeRuleSetToYaml(ruleSet: RuleSet): string {
  try {
    // Simple YAML serialization (for complex cases, use a proper YAML library)
    const yamlLines: string[] = [];
    
    // Metadata section
    yamlLines.push('metadata:');
    yamlLines.push(`  version: "${ruleSet.metadata.version}"`);
    yamlLines.push(`  name: "${ruleSet.metadata.name}"`);
    yamlLines.push(`  description: "${ruleSet.metadata.description}"`);
    yamlLines.push(`  created: "${ruleSet.metadata.created}"`);
    yamlLines.push(`  lastModified: "${ruleSet.metadata.lastModified}"`);
    yamlLines.push(`  author: "${ruleSet.metadata.author}"`);
    yamlLines.push('  tags:');
    ruleSet.metadata.tags.forEach(tag => {
      yamlLines.push(`    - "${tag}"`);
    });
    
    // Categories section
    yamlLines.push('');
    yamlLines.push('categories:');
    ruleSet.categories.forEach(category => {
      yamlLines.push(`  - name: "${category.name}"`);
      yamlLines.push(`    description: "${category.description}"`);
      yamlLines.push(`    priority: "${category.priority}"`);
      yamlLines.push(`    ruleCount: ${category.ruleCount}`);
    });
    
    // Rules section
    yamlLines.push('');
    yamlLines.push('rules:');
    ruleSet.rules.forEach(rule => {
      yamlLines.push(`  - id: "${rule.id}"`);
      yamlLines.push(`    name: "${rule.name}"`);
      yamlLines.push(`    description: "${rule.description}"`);
      yamlLines.push(`    category: "${rule.category}"`);
      yamlLines.push(`    type: "${rule.type}"`);
      yamlLines.push(`    severity: "${rule.severity}"`);
      yamlLines.push(`    scope: "${rule.scope}"`);
      yamlLines.push(`    pattern: "${rule.pattern}"`);
      yamlLines.push(`    message: "${rule.message}"`);
      yamlLines.push(`    automatable: ${rule.automatable}`);
      yamlLines.push(`    confidence: ${rule.confidence}`);
      yamlLines.push('    examples:');
      yamlLines.push('      valid:');
      rule.examples.valid.forEach(example => {
        yamlLines.push(`        - "${example}"`);
      });
      yamlLines.push('      invalid:');
      rule.examples.invalid.forEach(example => {
        yamlLines.push(`        - "${example}"`);
      });
      yamlLines.push('    sourceAdrs:');
      rule.sourceAdrs.forEach(adr => {
        yamlLines.push(`      - "${adr}"`);
      });
      yamlLines.push('    tags:');
      rule.tags.forEach(tag => {
        yamlLines.push(`      - "${tag}"`);
      });
    });
    
    return yamlLines.join('\n');
  } catch (error) {
    throw new McpAdrError(
      `Failed to serialize rule set to YAML: ${error instanceof Error ? error.message : String(error)}`,
      'SERIALIZATION_ERROR'
    );
  }
}

/**
 * Parse rule set from JSON
 */
export function parseRuleSetFromJson(jsonContent: string): RuleSet {
  try {
    const ruleSet = JSON.parse(jsonContent) as RuleSet;
    validateRuleSet(ruleSet);
    return ruleSet;
  } catch (error) {
    throw new McpAdrError(
      `Failed to parse rule set from JSON: ${error instanceof Error ? error.message : String(error)}`,
      'PARSING_ERROR'
    );
  }
}

/**
 * Create compliance report
 */
export function createComplianceReport(
  projectName: string,
  ruleSetVersion: string,
  validationResults: ValidationResult[],
  scope: string = 'full_project'
): ComplianceReport {
  const now = new Date().toISOString();
  const reportId = `compliance-${Date.now()}`;
  
  // Calculate summary metrics
  const totalFiles = validationResults.length;
  const totalViolations = validationResults.reduce((sum, result) => sum + result.violations.length, 0);
  const totalRules = validationResults.reduce((sum, result) => sum + result.totalRulesChecked, 0) / totalFiles;
  const overallCompliance = validationResults.reduce((sum, result) => sum + result.overallCompliance, 0) / totalFiles;
  
  // Determine risk level
  const criticalViolations = validationResults.reduce((sum, result) => 
    sum + result.violations.filter(v => v.severity === 'critical').length, 0);
  const errorViolations = validationResults.reduce((sum, result) => 
    sum + result.violations.filter(v => v.severity === 'error').length, 0);
  
  let riskLevel: 'low' | 'medium' | 'high' | 'critical' = 'low';
  if (criticalViolations > 0) riskLevel = 'critical';
  else if (errorViolations > 5) riskLevel = 'high';
  else if (overallCompliance < 0.8) riskLevel = 'medium';
  
  return {
    metadata: {
      reportId,
      generatedAt: now,
      projectName,
      ruleSetVersion,
      scope
    },
    summary: {
      overallCompliance,
      totalFiles,
      totalRules: Math.round(totalRules),
      totalViolations,
      riskLevel
    },
    results: validationResults,
    trends: [] // Would be populated with historical data
  };
}

/**
 * Serialize compliance report to JSON
 */
export function serializeComplianceReportToJson(report: ComplianceReport): string {
  try {
    return JSON.stringify(report, null, 2);
  } catch (error) {
    throw new McpAdrError(
      `Failed to serialize compliance report: ${error instanceof Error ? error.message : String(error)}`,
      'SERIALIZATION_ERROR'
    );
  }
}

/**
 * Validate rule set structure
 */
function validateRuleSet(ruleSet: any): void {
  if (!ruleSet.metadata || !ruleSet.rules || !Array.isArray(ruleSet.rules)) {
    throw new Error('Invalid rule set structure: missing metadata or rules');
  }
  
  if (!ruleSet.metadata.version || !ruleSet.metadata.name) {
    throw new Error('Invalid rule set metadata: missing version or name');
  }
  
  // Validate each rule
  ruleSet.rules.forEach((rule: any, index: number) => {
    if (!rule.id || !rule.name || !rule.description) {
      throw new Error(`Invalid rule at index ${index}: missing required fields`);
    }
    
    if (!['must', 'should', 'may', 'must_not', 'should_not'].includes(rule.type)) {
      throw new Error(`Invalid rule type at index ${index}: ${rule.type}`);
    }
    
    if (!['info', 'warning', 'error', 'critical'].includes(rule.severity)) {
      throw new Error(`Invalid rule severity at index ${index}: ${rule.severity}`);
    }
  });
}

/**
 * Get category description
 */
function getCategoryDescription(category: string): string {
  const descriptions: Record<string, string> = {
    architectural: 'Rules governing overall system architecture and design patterns',
    technology: 'Rules about technology choices, frameworks, and libraries',
    coding: 'Rules for code style, organization, and implementation practices',
    process: 'Rules for development processes and workflows',
    security: 'Rules for security implementation and best practices',
    performance: 'Rules for performance optimization and efficiency'
  };
  
  return descriptions[category] || 'General architectural rules';
}

/**
 * Get category priority
 */
function getCategoryPriority(category: string): 'low' | 'medium' | 'high' | 'critical' {
  const priorities: Record<string, 'low' | 'medium' | 'high' | 'critical'> = {
    security: 'critical',
    architectural: 'high',
    performance: 'high',
    technology: 'medium',
    coding: 'medium',
    process: 'low'
  };
  
  return priorities[category] || 'medium';
}

/**
 * Extract rule dependencies
 */
function extractRuleDependencies(rules: ArchitecturalRule[]): Array<{
  ruleId: string;
  dependsOn: string[];
  conflictsWith: string[];
  relationship: 'requires' | 'enhances' | 'conflicts' | 'supersedes';
}> {
  // Simple dependency extraction based on rule content
  // In a real implementation, this would be more sophisticated
  return rules.map(rule => ({
    ruleId: rule.id,
    dependsOn: [],
    conflictsWith: [],
    relationship: 'enhances' as const
  }));
}

/**
 * Extract tags from rules
 */
function extractRuleTags(rules: ArchitecturalRule[]): string[] {
  const allTags = rules.flatMap(rule => rule.tags);
  return Array.from(new Set(allTags));
}
