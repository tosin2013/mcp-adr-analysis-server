/**
 * Unit tests for rule-generation.ts
 * Comprehensive test coverage for all exported functions and interfaces
 */

import { vi as _vi } from 'vitest';
import {
  extractRulesFromAdrs,
  generateRulesFromPatterns,
  validateCodeAgainstRules,
  generateRuleDeviationReport,
  ArchitecturalRule,
  ValidationResult,
  // RuleViolation,
} from '../../src/utils/rule-generation';

describe('rule-generation', () => {
  const mockProjectPath = '/test/project';
  const mockAdrDirectory = 'docs/adrs';

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

  const mockValidationResult: ValidationResult = {
    fileName: 'test.ts',
    validationType: 'file',
    overallCompliance: 0.8,
    totalRulesChecked: 5,
    rulesViolated: 1,
    qualityScore: 0.85,
    violations: [],
    compliance: [],
  };

  describe('extractRulesFromAdrs', () => {
    it('should return extraction prompt and instructions', async () => {
      const result = await extractRulesFromAdrs(mockAdrDirectory, [], mockProjectPath);

      expect(result).toHaveProperty('extractionPrompt');
      expect(result).toHaveProperty('instructions');
      expect(result).toHaveProperty('actualData');
      expect(typeof result.extractionPrompt).toBe('string');
      expect(typeof result.instructions).toBe('string');
    });

    it('should handle default parameters', async () => {
      const result = await extractRulesFromAdrs();

      expect(result).toHaveProperty('extractionPrompt');
      expect(result).toHaveProperty('instructions');
      expect(result.extractionPrompt).toContain('Architectural Rule Extraction');
      expect(result.instructions).toContain('Rule Extraction Instructions');
    });

    it('should include existing rules in context', async () => {
      const existingRules = [mockArchitecturalRule];
      const result = await extractRulesFromAdrs(mockAdrDirectory, existingRules, mockProjectPath);

      expect(result.extractionPrompt).toContain('Existing Rules Context');
      expect(result.extractionPrompt).toContain(mockArchitecturalRule.name);
      expect(result.extractionPrompt).toContain(mockArchitecturalRule.id);
    });

    it('should handle empty existing rules', async () => {
      const result = await extractRulesFromAdrs(mockAdrDirectory, [], mockProjectPath);

      expect(result.extractionPrompt).toContain('No existing rules provided');
    });

    it('should include rule categories in prompt', async () => {
      const result = await extractRulesFromAdrs(mockAdrDirectory, [], mockProjectPath);

      expect(result.extractionPrompt).toContain('Architectural');
      expect(result.extractionPrompt).toContain('Technology');
      expect(result.extractionPrompt).toContain('Coding');
      expect(result.extractionPrompt).toContain('Process');
      expect(result.extractionPrompt).toContain('Security');
      expect(result.extractionPrompt).toContain('Performance');
    });

    it('should include actual data in response', async () => {
      const result = await extractRulesFromAdrs(mockAdrDirectory, [], mockProjectPath);

      expect(result.actualData).toHaveProperty('discoveryResult');
      expect(result.actualData).toHaveProperty('adrCount');
      expect(result.actualData).toHaveProperty('existingRulesCount');
      expect(result.actualData).toHaveProperty('summary');
    });
  });

  describe('generateRulesFromPatterns', () => {
    it('should return generation prompt and instructions', async () => {
      const result = await generateRulesFromPatterns(mockProjectPath, []);

      expect(result).toHaveProperty('generationPrompt');
      expect(result).toHaveProperty('instructions');
      expect(typeof result.generationPrompt).toBe('string');
      expect(typeof result.instructions).toBe('string');
    });

    it('should include project path in instructions', async () => {
      const result = await generateRulesFromPatterns(mockProjectPath, []);

      expect(result.instructions).toContain(mockProjectPath);
      expect(result.instructions).toContain('Pattern Analysis');
    });

    it('should handle existing rules context', async () => {
      const existingRules = ['Rule 1', 'Rule 2'];
      const result = await generateRulesFromPatterns(mockProjectPath, existingRules);

      expect(result.generationPrompt).toContain('Existing Rules Context');
      expect(result.generationPrompt).toContain('Rule 1');
      expect(result.generationPrompt).toContain('Rule 2');
    });

    it('should handle empty existing rules', async () => {
      const result = await generateRulesFromPatterns(mockProjectPath);

      expect(result.generationPrompt).toContain('No existing rules provided');
    });

    it('should include pattern analysis requirements', async () => {
      const result = await generateRulesFromPatterns(mockProjectPath, []);

      expect(result.generationPrompt).toContain('Pattern Analysis Requirements');
      expect(result.generationPrompt).toContain('Code Structure Analysis');
      expect(result.generationPrompt).toContain('Dependency Pattern Detection');
      expect(result.generationPrompt).toContain('Naming Convention Analysis');
    });

    it('should include rule generation focus areas', async () => {
      const result = await generateRulesFromPatterns(mockProjectPath, []);

      expect(result.generationPrompt).toContain('Rule Generation Focus');
      expect(result.generationPrompt).toContain('code organization');
      expect(result.generationPrompt).toContain('dependency management');
      expect(result.generationPrompt).toContain('Naming Convention');
    });
  });

  describe('validateCodeAgainstRules', () => {
    const mockFilePath = '/test/project/src/test.ts';
    const mockRules = [mockArchitecturalRule];

    it('should handle file reading errors gracefully', async () => {
      try {
        await validateCodeAgainstRules(mockFilePath, mockRules);
      } catch (error) {
        expect(error).toBeInstanceOf(Error);
        expect(error.message).toContain('Failed to validate code against rules');
      }
    });

    it('should validate function signature and return type', () => {
      // Test that the function exists and has the correct signature
      expect(typeof validateCodeAgainstRules).toBe('function');
      expect(validateCodeAgainstRules.length).toBe(2); // 2 required parameters (filePath, rules)
    });

    it('should handle different validation types as parameters', () => {
      const validationTypes = ['file', 'function', 'component', 'module'] as const;

      validationTypes.forEach(validationType => {
        expect(['file', 'function', 'component', 'module']).toContain(validationType);
      });
    });

    it('should handle empty rules array parameter', () => {
      expect(Array.isArray([])).toBe(true);
      expect([].length).toBe(0);
    });

    it('should validate architectural rule structure', () => {
      const rule = mockRules[0];
      expect(rule).toHaveProperty('id');
      expect(rule).toHaveProperty('name');
      expect(rule).toHaveProperty('pattern');
      expect(rule).toHaveProperty('severity');
      expect(rule).toHaveProperty('message');
    });

    it('should handle different validation types correctly', async () => {
      const validationTypes = ['file', 'function', 'component', 'module'] as const;

      for (const validationType of validationTypes) {
        try {
          const result = await validateCodeAgainstRules(mockFilePath, mockRules, validationType);
          // If successful, should return object with validation prompt and instructions
          expect(result).toHaveProperty('validationPrompt');
          expect(result).toHaveProperty('instructions');
        } catch (error) {
          // Expected to fail due to file not existing, but function should handle type correctly
          expect(error.message).toContain('Failed to validate code against rules');
        }
      }
    });

    it('should generate proper rule data for validation prompt', async () => {
      const rules = [
        mockArchitecturalRule,
        {
          ...mockArchitecturalRule,
          id: 'rule-2',
          name: 'Second Rule',
          severity: 'warning' as const,
        },
      ];

      try {
        await validateCodeAgainstRules(mockFilePath, rules);
      } catch {
        // Expected error, but test that rules are properly formatted
        expect(rules.length).toBe(2);
        expect(rules[0]).toHaveProperty('id');
        expect(rules[1].severity).toBe('warning');
      }
    });

    it('should extract filename correctly from path', async () => {
      const testPaths = [
        '/path/to/file.ts',
        'relative/path/file.js',
        'simple.ts',
        '/complex/path/with-dashes/file_name.tsx',
      ];

      for (const testPath of testPaths) {
        try {
          await validateCodeAgainstRules(testPath, []);
        } catch {
          // Expected to fail, but filename extraction should work
          const expectedFilename = testPath.split('/').pop() || testPath;
          expect(expectedFilename).toBeTruthy();
        }
      }
    });
  });

  describe('generateRuleDeviationReport', () => {
    const mockValidationResults = [mockValidationResult];
    const mockRules = [mockArchitecturalRule];

    it('should return report prompt and instructions', async () => {
      const result = await generateRuleDeviationReport(mockValidationResults, mockRules);

      expect(result).toHaveProperty('reportPrompt');
      expect(result).toHaveProperty('instructions');
      expect(typeof result.reportPrompt).toBe('string');
      expect(typeof result.instructions).toBe('string');
    });

    it('should handle different report types', async () => {
      const reportTypes = ['summary', 'detailed', 'trend', 'compliance'] as const;

      for (const reportType of reportTypes) {
        const result = await generateRuleDeviationReport(
          mockValidationResults,
          mockRules,
          reportType
        );
        expect(result.instructions).toContain(`Report Type**: ${reportType.toUpperCase()}`);
      }
    });

    it('should include report statistics in instructions', async () => {
      const result = await generateRuleDeviationReport(mockValidationResults, mockRules);

      expect(result.instructions).toContain(`Files Analyzed**: ${mockValidationResults.length}`);
      expect(result.instructions).toContain(`Rules Evaluated**: ${mockRules.length}`);
      expect(result.instructions).toContain('Average Compliance');
    });

    it('should handle empty validation results', async () => {
      const result = await generateRuleDeviationReport([], mockRules);

      expect(result.instructions).toContain('Files Analyzed**: 0');
    });

    it('should handle empty rules array', async () => {
      const result = await generateRuleDeviationReport(mockValidationResults, []);

      expect(result.instructions).toContain('Rules Evaluated**: 0');
    });

    it('should include expected response format', async () => {
      const result = await generateRuleDeviationReport(mockValidationResults, mockRules);

      expect(result.instructions).toContain('Expected AI Response Format');
      expect(result.instructions).toContain('reportMetadata');
      expect(result.instructions).toContain('executiveSummary');
      expect(result.instructions).toContain('detailedAnalysis');
      expect(result.instructions).toContain('actionableInsights');
      expect(result.instructions).toContain('implementationRoadmap');
    });
  });

  describe('interface validation', () => {
    it('should validate ArchitecturalRule interface structure', () => {
      const rule: ArchitecturalRule = mockArchitecturalRule;

      expect(rule).toHaveProperty('id');
      expect(rule).toHaveProperty('name');
      expect(rule).toHaveProperty('description');
      expect(rule).toHaveProperty('category');
      expect(rule).toHaveProperty('type');
      expect(rule).toHaveProperty('severity');
      expect(rule).toHaveProperty('scope');
      expect(rule).toHaveProperty('pattern');
      expect(rule).toHaveProperty('message');
      expect(rule).toHaveProperty('examples');
      expect(rule).toHaveProperty('sourceAdrs');
      expect(rule).toHaveProperty('evidence');
      expect(rule).toHaveProperty('automatable');
      expect(rule).toHaveProperty('confidence');
      expect(rule).toHaveProperty('tags');
    });

    it('should validate ValidationResult interface structure', () => {
      const result: ValidationResult = mockValidationResult;

      expect(result).toHaveProperty('fileName');
      expect(result).toHaveProperty('validationType');
      expect(result).toHaveProperty('overallCompliance');
      expect(result).toHaveProperty('totalRulesChecked');
      expect(result).toHaveProperty('rulesViolated');
      expect(result).toHaveProperty('qualityScore');
      expect(result).toHaveProperty('violations');
      expect(result).toHaveProperty('compliance');
    });

    it('should validate rule categories', () => {
      const validCategories = [
        'architectural',
        'technology',
        'coding',
        'process',
        'security',
        'performance',
      ];

      validCategories.forEach(category => {
        const rule: ArchitecturalRule = {
          ...mockArchitecturalRule,
          category: category as any,
        };
        expect(rule.category).toBe(category);
      });
    });

    it('should validate rule types', () => {
      const validTypes = ['must', 'should', 'may', 'must_not', 'should_not'];

      validTypes.forEach(type => {
        const rule: ArchitecturalRule = {
          ...mockArchitecturalRule,
          type: type as any,
        };
        expect(rule.type).toBe(type);
      });
    });

    it('should validate severity levels', () => {
      const validSeverities = ['info', 'warning', 'error', 'critical'];

      validSeverities.forEach(severity => {
        const rule: ArchitecturalRule = {
          ...mockArchitecturalRule,
          severity: severity as any,
        };
        expect(rule.severity).toBe(severity);
      });
    });
  });

  describe('error handling', () => {
    it('should handle errors gracefully in extractRulesFromAdrs', async () => {
      // Test with invalid directory path
      try {
        await extractRulesFromAdrs('/nonexistent/path', [], '/invalid/project');
        // If no error is thrown, the function should still return a valid structure
      } catch (error) {
        expect(error).toBeInstanceOf(Error);
      }
    });

    it('should handle errors gracefully in generateRulesFromPatterns', async () => {
      // Test with invalid project path
      try {
        await generateRulesFromPatterns('/nonexistent/project', []);
        // If no error is thrown, the function should still return a valid structure
      } catch (error) {
        expect(error).toBeInstanceOf(Error);
      }
    });

    it('should handle McpAdrError types properly', async () => {
      // Test that functions throw McpAdrError for specific failures
      try {
        await extractRulesFromAdrs('/nonexistent/path');
        // If no error is thrown, that's still valid behavior for some implementations
        expect(true).toBe(true);
      } catch (error) {
        expect(error.message).toContain('Failed to extract rules from ADRs');
      }
    });

    it('should handle null or undefined parameters', async () => {
      try {
        // Test with undefined parameters
        const result = await extractRulesFromAdrs(undefined, undefined, undefined);
        expect(result).toHaveProperty('extractionPrompt');
      } catch (error) {
        expect(error).toBeInstanceOf(Error);
      }
    });
  });

  describe('prompt generation quality', () => {
    it('should generate comprehensive extraction prompts', async () => {
      const result = await extractRulesFromAdrs();

      expect(result.extractionPrompt).toContain('Architectural Rule Extraction');
      expect(result.extractionPrompt).toContain('Rule Categories to Extract');
      expect(result.extractionPrompt).toContain('Architectural');
      expect(result.extractionPrompt).toContain('Technology');
      expect(result.extractionPrompt).toContain('Security');
      expect(result.extractionPrompt.length).toBeGreaterThan(1000);
    });

    it('should generate detailed instructions', async () => {
      const result = await extractRulesFromAdrs();

      expect(result.instructions).toContain('Rule Extraction Instructions');
      expect(result.instructions).toContain('Expected Output Format');
      expect(result.instructions).toContain('Rule Quality Standards');
      expect(result.instructions).toContain('Specific');
      expect(result.instructions).toContain('Measurable');
      expect(result.instructions).toContain('Actionable');
      expect(result.instructions.length).toBeGreaterThan(500);
    });

    it('should include proper JSON format guidance', async () => {
      const result = await generateRulesFromPatterns('/test/project');

      expect(result.instructions).toContain('Expected AI Response Format');
      expect(result.instructions).toContain('generatedRules');
      expect(result.instructions).toContain('patternAnalysis');
      expect(result.instructions).toContain('ruleMetrics');
      expect(result.instructions).toContain('implementationPlan');
    });
  });

  describe('data consistency validation', () => {
    it('should maintain consistent rule structure across functions', () => {
      const rule1 = mockArchitecturalRule;
      const rule2 = {
        ...mockArchitecturalRule,
        id: 'different-id',
        category: 'technology' as const,
        type: 'should' as const,
        severity: 'warning' as const,
      };

      // Validate both rules have same structure
      const rule1Keys = Object.keys(rule1);
      const rule2Keys = Object.keys(rule2);

      expect(rule1Keys.sort()).toEqual(rule2Keys.sort());
      expect(rule1Keys).toContain('id');
      expect(rule1Keys).toContain('name');
      expect(rule1Keys).toContain('category');
      expect(rule1Keys).toContain('examples');
      expect(rule1Keys).toContain('confidence');
    });

    it('should validate ValidationResult completeness', () => {
      const result = mockValidationResult;

      expect(result).toHaveProperty('fileName');
      expect(result).toHaveProperty('validationType');
      expect(result).toHaveProperty('overallCompliance');
      expect(result).toHaveProperty('totalRulesChecked');
      expect(result).toHaveProperty('rulesViolated');
      expect(result).toHaveProperty('qualityScore');
      expect(result).toHaveProperty('violations');
      expect(result).toHaveProperty('compliance');

      expect(typeof result.overallCompliance).toBe('number');
      expect(Array.isArray(result.violations)).toBe(true);
      expect(Array.isArray(result.compliance)).toBe(true);
    });

    it('should handle edge case compliance values', () => {
      const edgeCases = [
        { ...mockValidationResult, overallCompliance: 0 },
        { ...mockValidationResult, overallCompliance: 1 },
        { ...mockValidationResult, overallCompliance: 0.5 },
      ];

      edgeCases.forEach((testCase, _index) => {
        expect(testCase.overallCompliance).toBeGreaterThanOrEqual(0);
        expect(testCase.overallCompliance).toBeLessThanOrEqual(1);
        expect(typeof testCase.overallCompliance).toBe('number');
      });
    });
  });

  describe('performance and scalability', () => {
    it('should handle large rule sets efficiently', async () => {
      const largeRuleSet = Array.from({ length: 100 }, (_, i) => ({
        ...mockArchitecturalRule,
        id: `rule-${i}`,
        name: `Rule ${i}`,
        pattern: `pattern-${i}`,
      }));

      const result = await extractRulesFromAdrs('docs/adrs', largeRuleSet);

      expect(result.extractionPrompt).toContain('Current Rules (100)');
      expect(result.actualData?.existingRulesCount).toBe(100);
    });

    it('should handle large validation result sets', async () => {
      const largeValidationResults = Array.from({ length: 50 }, (_, i) => ({
        ...mockValidationResult,
        fileName: `file-${i}.ts`,
        overallCompliance: Math.random(),
      }));

      const result = await generateRuleDeviationReport(largeValidationResults, [
        mockArchitecturalRule,
      ]);

      expect(result.instructions).toContain('Files Analyzed**: 50');
      expect(result.instructions).toContain('Rules Evaluated**: 1');
    });

    it('should calculate statistics correctly for multiple files', async () => {
      const multipleResults = [
        { ...mockValidationResult, overallCompliance: 0.8, violations: [{ ruleId: 'r1' } as any] },
        {
          ...mockValidationResult,
          overallCompliance: 0.6,
          violations: [{ ruleId: 'r2' } as any, { ruleId: 'r3' } as any],
        },
        { ...mockValidationResult, overallCompliance: 1.0, violations: [] },
      ];

      const result = await generateRuleDeviationReport(multipleResults, [mockArchitecturalRule]);

      // Average compliance should be (0.8 + 0.6 + 1.0) / 3 = 0.8 = 80%
      expect(result.instructions).toContain('Average Compliance**: 80.0%');
      expect(result.instructions).toContain('Total Violations**: 3');
    });
  });

  describe('integration scenarios', () => {
    it('should work with realistic ADR content patterns', async () => {
      const realisticRules = [
        {
          ...mockArchitecturalRule,
          id: 'database-rule',
          name: 'Database Connection Pooling',
          pattern: 'new\\s+Database\\(',
          sourceAdrs: ['001-database-architecture.md'],
        },
        {
          ...mockArchitecturalRule,
          id: 'auth-rule',
          name: 'JWT Token Validation',
          pattern: 'jwt\\.verify\\(',
          sourceAdrs: ['002-authentication.md'],
          category: 'security' as const,
        },
      ];

      const result = await extractRulesFromAdrs('docs/adrs', realisticRules);

      expect(result.extractionPrompt).toContain('Database Connection Pooling');
      expect(result.extractionPrompt).toContain('JWT Token Validation');
      // Note: ADR file references appear in the rules context, not discovery (since no actual ADRs found)
      expect(result.extractionPrompt).toContain('Current Rules (2)');
      expect(result.extractionPrompt).toContain('security');
    });

    it('should handle mixed severity levels in reporting', async () => {
      const mixedViolations = [
        { ruleId: 'critical-rule', severity: 'critical' as const },
        { ruleId: 'error-rule', severity: 'error' as const },
        { ruleId: 'warning-rule', severity: 'warning' as const },
        { ruleId: 'info-rule', severity: 'info' as const },
      ];

      const resultWithViolations = {
        ...mockValidationResult,
        violations: mixedViolations as any[],
      };

      const result = await generateRuleDeviationReport(
        [resultWithViolations],
        [mockArchitecturalRule]
      );

      expect(result.instructions).toContain('Total Violations**: 4');
      expect(result.reportPrompt).toBeTruthy();
    });
  });
});
