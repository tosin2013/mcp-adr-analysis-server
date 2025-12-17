/**
 * Unit tests for rule-format.ts
 * Comprehensive test coverage for all exported functions and interfaces
 */

import { vi as _vi } from 'vitest';
import {
  createRuleSet,
  serializeRuleSetToJson,
  serializeRuleSetToYaml,
  parseRuleSetFromJson,
  createComplianceReport,
  serializeComplianceReportToJson,
  RuleSet,
  ComplianceReport,
} from '../../src/utils/rule-format';
import {
  ArchitecturalRule,
  ValidationResult,
  RuleViolation,
} from '../../src/utils/rule-generation';

describe('rule-format', () => {
  const mockArchitecturalRule: ArchitecturalRule = {
    id: 'test-rule-1',
    name: 'Test Rule',
    description: 'A test architectural rule',
    category: 'architectural',
    type: 'must',
    severity: 'error',
    scope: 'global',
    pattern: 'test-pattern',
    message: 'Test rule violation',
    examples: {
      valid: ['valid example'],
      invalid: ['invalid example'],
    },
    sourceAdrs: ['adr-001'],
    evidence: ['test evidence'],
    automatable: true,
    confidence: 0.9,
    tags: ['test', 'architecture'],
  };

  const mockRuleViolation: RuleViolation = {
    ruleId: 'test-rule-1',
    ruleName: 'Test Rule',
    severity: 'error',
    message: 'Test violation',
    location: {
      line: 10,
      column: 5,
      endLine: 10,
      endColumn: 20,
    },
    codeSnippet: 'test code snippet',
    suggestion: 'Fix the test issue',
    effort: 'low',
    priority: 'medium',
    category: 'architectural',
  };

  const mockValidationResult: ValidationResult = {
    fileName: 'test.ts',
    validationType: 'file',
    overallCompliance: 0.8,
    totalRulesChecked: 5,
    rulesViolated: 1,
    qualityScore: 0.85,
    violations: [mockRuleViolation],
    compliance: [
      {
        ruleId: 'test-rule-2',
        ruleName: 'Passing Rule',
        status: 'passed',
        evidence: 'Code follows the rule',
        location: 'line 5',
      },
    ],
  };

  describe('createRuleSet', () => {
    it('should create a rule set with basic metadata', () => {
      const rules = [mockArchitecturalRule];
      const ruleSet = createRuleSet('Test Rules', 'Test rule set', rules);

      expect(ruleSet).toHaveProperty('metadata');
      expect(ruleSet).toHaveProperty('rules');
      expect(ruleSet).toHaveProperty('categories');
      expect(ruleSet).toHaveProperty('dependencies');

      expect(ruleSet.metadata.name).toBe('Test Rules');
      expect(ruleSet.metadata.description).toBe('Test rule set');
      expect(ruleSet.metadata.version).toBe('1.0.0');
      expect(ruleSet.metadata.author).toBe('MCP ADR Analysis Server');
      expect(ruleSet.rules).toEqual(rules);
    });

    it('should create rule set with custom author', () => {
      const rules = [mockArchitecturalRule];
      const customAuthor = 'Custom Author';
      const ruleSet = createRuleSet('Test Rules', 'Test rule set', rules, customAuthor);

      expect(ruleSet.metadata.author).toBe(customAuthor);
    });

    it('should handle empty rules array', () => {
      const ruleSet = createRuleSet('Empty Rules', 'Empty rule set', []);

      expect(ruleSet.rules).toEqual([]);
      expect(ruleSet.categories).toEqual([]);
      expect(ruleSet.dependencies).toEqual([]);
      expect(ruleSet.metadata.tags).toEqual([]);
    });

    it('should group rules by category', () => {
      const securityRule: ArchitecturalRule = {
        ...mockArchitecturalRule,
        id: 'security-rule-1',
        category: 'security',
      };
      const rules = [mockArchitecturalRule, securityRule];
      const ruleSet = createRuleSet('Mixed Rules', 'Mixed rule set', rules);

      expect(ruleSet.categories).toHaveLength(2);
      expect(ruleSet.categories.some(cat => cat.name === 'architectural')).toBe(true);
      expect(ruleSet.categories.some(cat => cat.name === 'security')).toBe(true);
    });

    it('should extract tags from rules', () => {
      const rules = [mockArchitecturalRule];
      const ruleSet = createRuleSet('Test Rules', 'Test rule set', rules);

      expect(ruleSet.metadata.tags).toContain('test');
      expect(ruleSet.metadata.tags).toContain('architecture');
    });

    it('should set created and lastModified timestamps', () => {
      const rules = [mockArchitecturalRule];
      const ruleSet = createRuleSet('Test Rules', 'Test rule set', rules);

      expect(ruleSet.metadata.created).toBeDefined();
      expect(ruleSet.metadata.lastModified).toBeDefined();
      expect(new Date(ruleSet.metadata.created)).toBeInstanceOf(Date);
      expect(new Date(ruleSet.metadata.lastModified)).toBeInstanceOf(Date);
    });
  });

  describe('serializeRuleSetToJson', () => {
    it('should serialize rule set to valid JSON', () => {
      const rules = [mockArchitecturalRule];
      const ruleSet = createRuleSet('Test Rules', 'Test rule set', rules);
      const jsonString = serializeRuleSetToJson(ruleSet);

      expect(typeof jsonString).toBe('string');
      expect(() => JSON.parse(jsonString)).not.toThrow();

      const parsed = JSON.parse(jsonString);
      expect(parsed.metadata.name).toBe('Test Rules');
      expect(parsed.rules).toHaveLength(1);
    });

    it('should format JSON with proper indentation', () => {
      const rules = [mockArchitecturalRule];
      const ruleSet = createRuleSet('Test Rules', 'Test rule set', rules);
      const jsonString = serializeRuleSetToJson(ruleSet);

      expect(jsonString).toContain('  '); // Should have 2-space indentation
      expect(jsonString).toContain('\n'); // Should have newlines
    });

    it('should handle empty rule set', () => {
      const ruleSet = createRuleSet('Empty Rules', 'Empty rule set', []);
      const jsonString = serializeRuleSetToJson(ruleSet);

      expect(() => JSON.parse(jsonString)).not.toThrow();
      const parsed = JSON.parse(jsonString);
      expect(parsed.rules).toEqual([]);
    });
  });

  describe('serializeRuleSetToYaml', () => {
    it('should serialize rule set to YAML format', () => {
      const rules = [mockArchitecturalRule];
      const ruleSet = createRuleSet('Test Rules', 'Test rule set', rules);
      const yamlString = serializeRuleSetToYaml(ruleSet);

      expect(typeof yamlString).toBe('string');
      expect(yamlString).toContain('metadata:');
      expect(yamlString).toContain('rules:');
      expect(yamlString).toContain('categories:');
      expect(yamlString).toContain('version: "1.0.0"');
      expect(yamlString).toContain('name: "Test Rules"');
    });

    it('should include rule details in YAML', () => {
      const rules = [mockArchitecturalRule];
      const ruleSet = createRuleSet('Test Rules', 'Test rule set', rules);
      const yamlString = serializeRuleSetToYaml(ruleSet);

      expect(yamlString).toContain(`id: "${mockArchitecturalRule.id}"`);
      expect(yamlString).toContain(`name: "${mockArchitecturalRule.name}"`);
      expect(yamlString).toContain(`category: "${mockArchitecturalRule.category}"`);
      expect(yamlString).toContain(`severity: "${mockArchitecturalRule.severity}"`);
    });

    it('should handle arrays in YAML format', () => {
      const rules = [mockArchitecturalRule];
      const ruleSet = createRuleSet('Test Rules', 'Test rule set', rules);
      const yamlString = serializeRuleSetToYaml(ruleSet);

      expect(yamlString).toContain('tags:');
      expect(yamlString).toContain('- "test"');
      expect(yamlString).toContain('- "architecture"');
      expect(yamlString).toContain('examples:');
      expect(yamlString).toContain('valid:');
      expect(yamlString).toContain('invalid:');
    });

    it('should handle empty rule set in YAML', () => {
      const ruleSet = createRuleSet('Empty Rules', 'Empty rule set', []);
      const yamlString = serializeRuleSetToYaml(ruleSet);

      expect(yamlString).toContain('metadata:');
      expect(yamlString).toContain('rules:');
      expect(yamlString).toContain('categories:');
    });
  });

  describe('parseRuleSetFromJson', () => {
    it('should parse valid JSON rule set', () => {
      const rules = [mockArchitecturalRule];
      const originalRuleSet = createRuleSet('Test Rules', 'Test rule set', rules);
      const jsonString = serializeRuleSetToJson(originalRuleSet);
      const parsedRuleSet = parseRuleSetFromJson(jsonString);

      expect(parsedRuleSet.metadata.name).toBe('Test Rules');
      expect(parsedRuleSet.rules).toHaveLength(1);
      expect(parsedRuleSet.rules[0].id).toBe(mockArchitecturalRule.id);
    });

    it('should validate rule set structure during parsing', () => {
      const invalidJson = '{"invalid": "structure"}';

      expect(() => parseRuleSetFromJson(invalidJson)).toThrow();
    });

    it('should handle malformed JSON', () => {
      const malformedJson = '{"metadata": {"name": "test"';

      expect(() => parseRuleSetFromJson(malformedJson)).toThrow();
    });

    it('should validate rule types and severities', () => {
      const invalidRuleSet = {
        metadata: { version: '1.0.0', name: 'Test' },
        rules: [
          {
            id: 'test',
            name: 'Test',
            description: 'Test',
            type: 'invalid_type',
            severity: 'invalid_severity',
          },
        ],
        categories: [],
        dependencies: [],
      };

      expect(() => parseRuleSetFromJson(JSON.stringify(invalidRuleSet))).toThrow();
    });
  });

  describe('createComplianceReport', () => {
    it('should create compliance report with correct metadata', () => {
      const validationResults = [mockValidationResult];
      const report = createComplianceReport('Test Project', '1.0.0', validationResults);

      expect(report.metadata.projectName).toBe('Test Project');
      expect(report.metadata.ruleSetVersion).toBe('1.0.0');
      expect(report.metadata.scope).toBe('full_project');
      expect(report.metadata.reportId).toContain('compliance-');
      expect(report.metadata.generatedAt).toBeDefined();
    });

    it('should calculate summary metrics correctly', () => {
      const validationResults = [mockValidationResult];
      const report = createComplianceReport('Test Project', '1.0.0', validationResults);

      expect(report.summary.totalFiles).toBe(1);
      expect(report.summary.totalViolations).toBe(1);
      expect(report.summary.overallCompliance).toBe(0.8);
      expect(report.summary.totalRules).toBe(5);
    });

    it('should determine risk level based on violations', () => {
      // Test critical risk level
      const criticalViolation: RuleViolation = { ...mockRuleViolation, severity: 'critical' };
      const criticalResult: ValidationResult = {
        ...mockValidationResult,
        violations: [criticalViolation],
      };
      const criticalReport = createComplianceReport('Test', '1.0.0', [criticalResult]);
      expect(criticalReport.summary.riskLevel).toBe('critical');

      // Test high risk level
      const errorViolations = Array(6)
        .fill(0)
        .map((_, i) => ({
          ...mockRuleViolation,
          ruleId: `error-rule-${i}`,
          severity: 'error' as const,
        }));
      const highRiskResult: ValidationResult = {
        ...mockValidationResult,
        violations: errorViolations,
      };
      const highRiskReport = createComplianceReport('Test', '1.0.0', [highRiskResult]);
      expect(highRiskReport.summary.riskLevel).toBe('high');

      // Test medium risk level
      const mediumRiskResult: ValidationResult = {
        ...mockValidationResult,
        overallCompliance: 0.7,
        violations: [],
      };
      const mediumRiskReport = createComplianceReport('Test', '1.0.0', [mediumRiskResult]);
      expect(mediumRiskReport.summary.riskLevel).toBe('medium');
    });

    it('should handle empty validation results', () => {
      const report = createComplianceReport('Test Project', '1.0.0', []);

      expect(report.summary.totalFiles).toBe(0);
      expect(report.summary.totalViolations).toBe(0);
      expect(report.summary.riskLevel).toBe('low');
      expect(report.results).toEqual([]);
    });

    it('should handle custom scope', () => {
      const customScope = 'specific_module';
      const report = createComplianceReport('Test', '1.0.0', [mockValidationResult], customScope);

      expect(report.metadata.scope).toBe(customScope);
    });

    it('should include validation results in report', () => {
      const validationResults = [mockValidationResult];
      const report = createComplianceReport('Test Project', '1.0.0', validationResults);

      expect(report.results).toEqual(validationResults);
      expect(report.results).toHaveLength(1);
    });

    it('should initialize empty trends array', () => {
      const report = createComplianceReport('Test Project', '1.0.0', [mockValidationResult]);

      expect(report.trends).toEqual([]);
      expect(Array.isArray(report.trends)).toBe(true);
    });
  });

  describe('serializeComplianceReportToJson', () => {
    it('should serialize compliance report to JSON', () => {
      const validationResults = [mockValidationResult];
      const report = createComplianceReport('Test Project', '1.0.0', validationResults);
      const jsonString = serializeComplianceReportToJson(report);

      expect(typeof jsonString).toBe('string');
      expect(() => JSON.parse(jsonString)).not.toThrow();

      const parsed = JSON.parse(jsonString);
      expect(parsed.metadata.projectName).toBe('Test Project');
      expect(parsed.summary.totalFiles).toBe(1);
    });

    it('should format JSON with proper indentation', () => {
      const report = createComplianceReport('Test', '1.0.0', [mockValidationResult]);
      const jsonString = serializeComplianceReportToJson(report);

      expect(jsonString).toContain('  '); // Should have 2-space indentation
      expect(jsonString).toContain('\n'); // Should have newlines
    });

    it('should handle empty compliance report', () => {
      const report = createComplianceReport('Empty Project', '1.0.0', []);
      const jsonString = serializeComplianceReportToJson(report);

      expect(() => JSON.parse(jsonString)).not.toThrow();
      const parsed = JSON.parse(jsonString);
      expect(parsed.results).toEqual([]);
    });
  });

  describe('interface validation', () => {
    it('should validate RuleSet interface structure', () => {
      const rules = [mockArchitecturalRule];
      const ruleSet: RuleSet = createRuleSet('Test', 'Test', rules);

      expect(ruleSet).toHaveProperty('metadata');
      expect(ruleSet).toHaveProperty('rules');
      expect(ruleSet).toHaveProperty('categories');
      expect(ruleSet).toHaveProperty('dependencies');

      expect(ruleSet.metadata).toHaveProperty('version');
      expect(ruleSet.metadata).toHaveProperty('name');
      expect(ruleSet.metadata).toHaveProperty('description');
      expect(ruleSet.metadata).toHaveProperty('created');
      expect(ruleSet.metadata).toHaveProperty('lastModified');
      expect(ruleSet.metadata).toHaveProperty('author');
      expect(ruleSet.metadata).toHaveProperty('tags');
    });

    it('should validate ComplianceReport interface structure', () => {
      const report: ComplianceReport = createComplianceReport('Test', '1.0.0', [
        mockValidationResult,
      ]);

      expect(report).toHaveProperty('metadata');
      expect(report).toHaveProperty('summary');
      expect(report).toHaveProperty('results');
      expect(report).toHaveProperty('trends');

      expect(report.metadata).toHaveProperty('reportId');
      expect(report.metadata).toHaveProperty('generatedAt');
      expect(report.metadata).toHaveProperty('projectName');
      expect(report.metadata).toHaveProperty('ruleSetVersion');
      expect(report.metadata).toHaveProperty('scope');

      expect(report.summary).toHaveProperty('overallCompliance');
      expect(report.summary).toHaveProperty('totalFiles');
      expect(report.summary).toHaveProperty('totalRules');
      expect(report.summary).toHaveProperty('totalViolations');
      expect(report.summary).toHaveProperty('riskLevel');
    });

    it('should validate category priorities', () => {
      const validPriorities = ['low', 'medium', 'high', 'critical'];
      const rules = [mockArchitecturalRule];
      const ruleSet = createRuleSet('Test', 'Test', rules);

      ruleSet.categories.forEach(category => {
        expect(validPriorities).toContain(category.priority);
      });
    });

    it('should validate risk levels', () => {
      const validRiskLevels = ['low', 'medium', 'high', 'critical'];
      const report = createComplianceReport('Test', '1.0.0', [mockValidationResult]);

      expect(validRiskLevels).toContain(report.summary.riskLevel);
    });
  });

  describe('error handling', () => {
    it('should handle serialization errors gracefully', () => {
      // Create a circular reference to cause JSON.stringify to fail
      const circularRuleSet: any = createRuleSet('Test', 'Test', [mockArchitecturalRule]);
      circularRuleSet.circular = circularRuleSet;

      expect(() => serializeRuleSetToJson(circularRuleSet)).toThrow();

      // Test YAML serialization with invalid data structure
      const invalidRuleSet: any = { metadata: { name: null } };
      expect(() => serializeRuleSetToYaml(invalidRuleSet)).toThrow();
    });

    it('should handle compliance report serialization errors', () => {
      const circularReport: any = createComplianceReport('Test', '1.0.0', [mockValidationResult]);
      circularReport.circular = circularReport;

      expect(() => serializeComplianceReportToJson(circularReport)).toThrow();
    });
  });
});
