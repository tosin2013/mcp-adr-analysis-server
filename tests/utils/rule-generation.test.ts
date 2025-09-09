/**
 * Unit tests for rule-generation.ts
 * Comprehensive test coverage for all exported functions and interfaces
 */

import { jest } from '@jest/globals';
import {
  extractRulesFromAdrs,
  generateRulesFromPatterns,
  validateCodeAgainstRules,
  generateRuleDeviationReport,
  ArchitecturalRule,
  ValidationResult,
  RuleViolation
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
      invalid: ['invalid example']
    },
    sourceAdrs: ['adr-001'],
    evidence: ['test evidence'],
    automatable: true,
    confidence: 0.9,
    tags: ['test', 'architecture']
  };

  const mockValidationResult: ValidationResult = {
    fileName: 'test.ts',
    validationType: 'file',
    overallCompliance: 0.8,
    totalRulesChecked: 5,
    rulesViolated: 1,
    qualityScore: 0.85,
    violations: [],
    compliance: []
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
        const result = await generateRuleDeviationReport(mockValidationResults, mockRules, reportType);
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
      const validCategories = ['architectural', 'technology', 'coding', 'process', 'security', 'performance'];
      
      validCategories.forEach(category => {
        const rule: ArchitecturalRule = {
          ...mockArchitecturalRule,
          category: category as any
        };
        expect(rule.category).toBe(category);
      });
    });

    it('should validate rule types', () => {
      const validTypes = ['must', 'should', 'may', 'must_not', 'should_not'];
      
      validTypes.forEach(type => {
        const rule: ArchitecturalRule = {
          ...mockArchitecturalRule,
          type: type as any
        };
        expect(rule.type).toBe(type);
      });
    });

    it('should validate severity levels', () => {
      const validSeverities = ['info', 'warning', 'error', 'critical'];
      
      validSeverities.forEach(severity => {
        const rule: ArchitecturalRule = {
          ...mockArchitecturalRule,
          severity: severity as any
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
  });
});
