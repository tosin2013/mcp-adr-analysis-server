import { vi as _vi } from 'vitest';
import {
  generateRuleExtractionPrompt,
  generatePatternBasedRulePrompt,
  generateCodeValidationPrompt,
  generateRuleDeviationReportPrompt,
} from '../../src/prompts/rule-generation-prompts.js';

describe('Rule Generation Prompts', () => {
  describe('generateRuleExtractionPrompt', () => {
    const mockAdrFiles = [
      {
        id: 'adr-001',
        title: 'Use Microservices Architecture',
        content:
          'We have decided to adopt a microservices architecture for better scalability and maintainability. Each service should be independently deployable and have its own database.',
        status: 'accepted',
        category: 'architecture',
      },
      {
        id: 'adr-002',
        title: 'Implement Event-Driven Communication',
        content:
          'Services will communicate through events using a message broker. This ensures loose coupling and better resilience.',
        status: 'accepted',
        category: 'integration',
      },
    ];

    const mockExistingRules = [
      {
        id: 'rule-001',
        name: 'Service Independence',
        description: 'Each microservice must be independently deployable',
      },
      {
        id: 'rule-002',
        name: 'Database Per Service',
        description: 'Each service should have its own dedicated database',
      },
    ];

    it('should generate rule extraction prompt with ADR files and existing rules', () => {
      const result = generateRuleExtractionPrompt(mockAdrFiles, mockExistingRules);

      expect(result).toContain('# Architectural Rule Extraction Guide');
      expect(result).toContain('## ADR Files');
      expect(result).toContain('1. Use Microservices Architecture');
      expect(result).toContain('**ID**: adr-001');
      expect(result).toContain('**Status**: accepted');
      expect(result).toContain('**Category**: architecture');
      expect(result).toContain('2. Implement Event-Driven Communication');
      expect(result).toContain('**ID**: adr-002');
      expect(result).toContain('**Category**: integration');
      expect(result).toContain('## Existing Rules');
      expect(result).toContain(
        '- **Service Independence**: Each microservice must be independently deployable'
      );
      expect(result).toContain(
        '- **Database Per Service**: Each service should have its own dedicated database'
      );
    });

    it('should generate rule extraction prompt without existing rules', () => {
      const result = generateRuleExtractionPrompt(mockAdrFiles);

      expect(result).toContain('# Architectural Rule Extraction Guide');
      expect(result).toContain('## ADR Files');
      expect(result).toContain('1. Use Microservices Architecture');
      expect(result).not.toContain('## Existing Rules');
    });

    it('should include rule categories and output format', () => {
      const result = generateRuleExtractionPrompt(mockAdrFiles);

      expect(result).toContain('## Suggested Rule Categories');
      expect(result).toContain('🏗️ **Architectural Rules**');
      expect(result).toContain('🔧 **Technology Rules**');
      expect(result).toContain('📝 **Coding Rules**');
      expect(result).toContain('🔄 **Process Rules**');
      expect(result).toContain('## Output Format');
      expect(result).toContain('"extractedRules"');
      expect(result).toContain('"ruleCategories"');
      expect(result).toContain('"ruleDependencies"');
      expect(result).toContain('"validationStrategies"');
      expect(result).toContain('"implementationGuidance"');
    });

    it('should truncate long ADR content', () => {
      const longContentAdr = [
        {
          id: 'adr-long',
          title: 'Long ADR',
          content: 'A'.repeat(2000),
          status: 'accepted',
          category: 'test',
        },
      ];

      const result = generateRuleExtractionPrompt(longContentAdr);

      expect(result).toContain('... (truncated for analysis)');
    });

    it('should handle empty ADR files array', () => {
      const result = generateRuleExtractionPrompt([]);

      expect(result).toContain('# Architectural Rule Extraction Guide');
      expect(result).toContain('## ADR Files');
      expect(result).not.toContain('### 1.');
    });

    it('should handle ADRs without categories', () => {
      const adrWithoutCategory = [
        {
          id: 'adr-no-cat',
          title: 'No Category ADR',
          content: 'Content without category',
          status: 'draft',
        },
      ];

      const result = generateRuleExtractionPrompt(adrWithoutCategory);

      expect(result).toContain('**Category**: Unknown');
    });

    it('should include extraction guidelines', () => {
      const result = generateRuleExtractionPrompt(mockAdrFiles);

      expect(result).toContain('## Extraction Guidelines');
      expect(result).toContain(
        '1. **Actionable Rules**: Focus on rules that can be validated or enforced'
      );
      expect(result).toContain('2. **Clear Patterns**: Ensure rules have clear detection patterns');
      expect(result).toContain('3. **Specific Messages**: Provide helpful violation messages');
      expect(result).toContain('4. **Evidence-Based**: Link rules to specific ADR content');
      expect(result).toContain(
        '5. **Practical Implementation**: Consider how rules can be validated in practice'
      );
      expect(result).toContain("6. **Avoid Duplication**: Don't extract rules that already exist");
    });
  });

  describe('generatePatternBasedRulePrompt', () => {
    const mockProjectStructure = `
src/
  components/
    Button.tsx
    Input.tsx
  services/
    api.service.ts
    auth.service.ts
  utils/
    helpers.ts
    constants.ts
`;

    const mockCodePatterns = [
      {
        pattern: 'React Functional Components',
        frequency: 15,
        examples: [
          'export const Button = ({ onClick, children }) => { return <button onClick={onClick}>{children}</button>; };',
          'export const Input = ({ value, onChange }) => { return <input value={value} onChange={onChange} />; };',
        ],
        category: 'component',
      },
      {
        pattern: 'Service Class Pattern',
        frequency: 8,
        examples: [
          'export class ApiService { async get(url: string) { return fetch(url); } }',
          'export class AuthService { login(credentials: any) { /* implementation */ } }',
        ],
        category: 'service',
      },
    ];

    const mockExistingRules = [
      'Components must use TypeScript',
      'Services must implement error handling',
    ];

    it('should generate pattern-based rule prompt with all parameters', () => {
      const result = generatePatternBasedRulePrompt(
        mockProjectStructure,
        mockCodePatterns,
        mockExistingRules
      );

      expect(result).toContain('# Pattern-Based Rule Generation');
      expect(result).toContain('## Project Structure');
      expect(result).toContain('src/');
      expect(result).toContain('components/');
      expect(result).toContain('services/');
      expect(result).toContain('## Detected Code Patterns');
      expect(result).toContain('### Pattern 1: React Functional Components');
      expect(result).toContain('**Category**: component');
      expect(result).toContain('**Frequency**: 15 occurrences');
      expect(result).toContain('### Pattern 2: Service Class Pattern');
      expect(result).toContain('**Frequency**: 8 occurrences');
      expect(result).toContain('## Existing Rules');
      expect(result).toContain('- Components must use TypeScript');
      expect(result).toContain('- Services must implement error handling');
    });

    it('should generate pattern-based rule prompt without existing rules', () => {
      const result = generatePatternBasedRulePrompt(mockProjectStructure, mockCodePatterns);

      expect(result).toContain('# Pattern-Based Rule Generation');
      expect(result).toContain('## Project Structure');
      expect(result).toContain('## Detected Code Patterns');
      expect(result).not.toContain('## Existing Rules');
    });

    it('should include pattern analysis requirements', () => {
      const result = generatePatternBasedRulePrompt(mockProjectStructure, mockCodePatterns);

      expect(result).toContain('## Pattern Analysis Requirements');
      expect(result).toContain('🔍 **Consistency Rules**');
      expect(result).toContain('📐 **Quality Rules**');
      expect(result).toContain('🛡️ **Safety Rules**');
      expect(result).toContain('🎯 **Performance Rules**');
    });

    it('should include output format with pattern count', () => {
      const result = generatePatternBasedRulePrompt(mockProjectStructure, mockCodePatterns);

      expect(result).toContain('## Output Format');
      expect(result).toContain('"generatedRules"');
      expect(result).toContain('"patternAnalysis"');
      expect(result).toContain('"ruleMetrics"');
      expect(result).toContain('"implementationPlan"');
      expect(result).toContain(`"totalPatterns": ${mockCodePatterns.length}`);
    });

    it('should handle empty code patterns array', () => {
      const result = generatePatternBasedRulePrompt(mockProjectStructure, []);

      expect(result).toContain('# Pattern-Based Rule Generation');
      expect(result).toContain('## Detected Code Patterns');
      expect(result).toContain('"totalPatterns": 0');
      expect(result).not.toContain('### Pattern 1:');
    });

    it('should include generation guidelines', () => {
      const result = generatePatternBasedRulePrompt(mockProjectStructure, mockCodePatterns);

      expect(result).toContain('## Generation Guidelines');
      expect(result).toContain('1. **Pattern-Based**: Base rules on actual observed patterns');
      expect(result).toContain(
        '2. **Frequency-Weighted**: Prioritize rules based on pattern frequency'
      );
      expect(result).toContain('3. **Consistency-Focused**: Emphasize consistency over perfection');
      expect(result).toContain(
        '4. **Practical Validation**: Ensure rules can be automatically validated'
      );
      expect(result).toContain('5. **Clear Rationale**: Explain why each rule is beneficial');
      expect(result).toContain(
        '6. **Incremental Implementation**: Provide phased implementation approach'
      );
    });
  });

  describe('generateCodeValidationPrompt', () => {
    const mockCodeToValidate = `
import React from 'react';

export const Button = ({ onClick, children, disabled = false }) => {
  const handleClick = (event) => {
    if (disabled) return;
    onClick?.(event);
  };

  return (
    <button 
      onClick={handleClick}
      disabled={disabled}
      className="btn"
    >
      {children}
    </button>
  );
};
`;

    const mockRules = [
      {
        id: 'react-001',
        name: 'Use TypeScript for Props',
        description: 'All React components must define TypeScript interfaces for props',
        pattern: 'interface.*Props',
        severity: 'error',
        message: 'Component props must be typed with TypeScript interface',
      },
      {
        id: 'react-002',
        name: 'Handle Optional Callbacks',
        description: 'Optional callback props should be safely invoked',
        pattern: '\\?\\.',
        severity: 'warning',
        message: 'Use optional chaining for callback props',
      },
    ];

    it('should generate code validation prompt with default file type', () => {
      const result = generateCodeValidationPrompt(mockCodeToValidate, 'Button.tsx', mockRules);

      expect(result).toContain('# Code Validation Against Architectural Rules');
      expect(result).toContain('**File**: Button.tsx');
      expect(result).toContain('**Validation Type**: file');
      expect(result).toContain('```');
      expect(result).toContain('export const Button');
      expect(result).toContain('## Architectural Rules');
      expect(result).toContain('### Rule 1: Use TypeScript for Props');
      expect(result).toContain('**ID**: react-001');
      expect(result).toContain('**Severity**: error');
      expect(result).toContain('**Pattern**: interface.*Props');
      expect(result).toContain('### Rule 2: Handle Optional Callbacks');
      expect(result).toContain('**ID**: react-002');
      expect(result).toContain('**Severity**: warning');
    });

    it('should generate code validation prompt with custom validation type', () => {
      const result = generateCodeValidationPrompt(
        mockCodeToValidate,
        'Button.tsx',
        mockRules,
        'component'
      );

      expect(result).toContain('**Validation Type**: component');
    });

    it('should include validation requirements', () => {
      const result = generateCodeValidationPrompt(mockCodeToValidate, 'Button.tsx', mockRules);

      expect(result).toContain('## Validation Requirements');
      expect(result).toContain('🔍 **Rule Compliance**');
      expect(result).toContain('📊 **Violation Analysis**');
      expect(result).toContain('🎯 **Quality Metrics**');
    });

    it('should include output format with file name and rule count', () => {
      const result = generateCodeValidationPrompt(mockCodeToValidate, 'Button.tsx', mockRules);

      expect(result).toContain('## Output Format');
      expect(result).toContain('"validationResults"');
      expect(result).toContain('"violations"');
      expect(result).toContain('"compliance"');
      expect(result).toContain('"metrics"');
      expect(result).toContain('"recommendations"');
      expect(result).toContain('"summary"');
      expect(result).toContain('"fileName": "Button.tsx"');
      expect(result).toContain(`"totalRulesChecked": ${mockRules.length}`);
    });

    it('should truncate long code content', () => {
      const longCode = 'A'.repeat(4000);
      const result = generateCodeValidationPrompt(longCode, 'LongFile.ts', mockRules);

      expect(result).toContain('... (truncated for analysis)');
    });

    it('should handle empty rules array', () => {
      const result = generateCodeValidationPrompt(mockCodeToValidate, 'Button.tsx', []);

      expect(result).toContain('# Code Validation Against Architectural Rules');
      expect(result).toContain('## Architectural Rules');
      expect(result).toContain('"totalRulesChecked": 0');
      expect(result).not.toContain('### Rule 1:');
    });

    it('should include validation guidelines', () => {
      const result = generateCodeValidationPrompt(mockCodeToValidate, 'Button.tsx', mockRules);

      expect(result).toContain('## Validation Guidelines');
      expect(result).toContain('1. **Thorough Analysis**: Check every applicable rule carefully');
      expect(result).toContain('2. **Precise Locations**: Provide exact line and column numbers');
      expect(result).toContain(
        '3. **Actionable Feedback**: Give specific, implementable suggestions'
      );
      expect(result).toContain('4. **Severity Appropriate**: Use appropriate severity levels');
      expect(result).toContain(
        '5. **Context Aware**: Consider the specific context and purpose of the code'
      );
      expect(result).toContain(
        '6. **Constructive Tone**: Focus on improvement rather than criticism'
      );
    });

    it('should handle different validation types', () => {
      const validationTypes: Array<'file' | 'function' | 'component' | 'module'> = [
        'file',
        'function',
        'component',
        'module',
      ];

      validationTypes.forEach(type => {
        const result = generateCodeValidationPrompt(mockCodeToValidate, 'test.ts', mockRules, type);
        expect(result).toContain(`**Validation Type**: ${type}`);
      });
    });
  });

  describe('generateRuleDeviationReportPrompt', () => {
    const mockValidationResults = [
      {
        fileName: 'Button.tsx',
        violations: [
          {
            ruleId: 'react-001',
            ruleName: 'Use TypeScript for Props',
            severity: 'error',
            message: 'Component props must be typed with TypeScript interface',
            location: { line: 3, column: 1 },
          },
          {
            ruleId: 'react-002',
            ruleName: 'Handle Optional Callbacks',
            severity: 'warning',
            message: 'Use optional chaining for callback props',
            location: { line: 6, column: 5 },
          },
        ],
        compliance: [
          {
            ruleId: 'react-003',
            ruleName: 'Use Functional Components',
            status: 'compliant',
          },
        ],
        overallCompliance: 0.85,
      },
      {
        fileName: 'Input.tsx',
        violations: [
          {
            ruleId: 'react-001',
            ruleName: 'Use TypeScript for Props',
            severity: 'error',
            message: 'Component props must be typed with TypeScript interface',
            location: { line: 2, column: 1 },
          },
        ],
        compliance: [
          {
            ruleId: 'react-002',
            ruleName: 'Handle Optional Callbacks',
            status: 'compliant',
          },
          {
            ruleId: 'react-003',
            ruleName: 'Use Functional Components',
            status: 'compliant',
          },
        ],
        overallCompliance: 0.75,
      },
    ];

    const mockRules = [
      {
        id: 'react-001',
        name: 'Use TypeScript for Props',
        category: 'typing',
        severity: 'error',
      },
      {
        id: 'react-002',
        name: 'Handle Optional Callbacks',
        category: 'safety',
        severity: 'warning',
      },
      {
        id: 'react-003',
        name: 'Use Functional Components',
        category: 'architecture',
        severity: 'info',
      },
    ];

    it('should generate rule deviation report with default summary type', () => {
      const result = generateRuleDeviationReportPrompt(mockValidationResults, mockRules);

      expect(result).toContain('# Rule Deviation and Compliance Report');
      expect(result).toContain('## Validation Results');
      expect(result).toContain('### File 1: Button.tsx');
      expect(result).toContain('**Overall Compliance**: 85.0%');
      expect(result).toContain('**Violations**: 2');
      expect(result).toContain('**Compliant Rules**: 1');
      expect(result).toContain('### File 2: Input.tsx');
      expect(result).toContain('**Overall Compliance**: 75.0%');
      expect(result).toContain('**Violations**: 1');
      expect(result).toContain('**Compliant Rules**: 2');
    });

    it('should generate rule deviation report with custom report type', () => {
      const result = generateRuleDeviationReportPrompt(
        mockValidationResults,
        mockRules,
        'detailed'
      );

      expect(result).toContain('## Report Type');
      expect(result).toContain('DETAILED');
    });

    it('should include rule definitions', () => {
      const result = generateRuleDeviationReportPrompt(mockValidationResults, mockRules);

      expect(result).toContain('## Rule Definitions');
      expect(result).toContain('### Rule 1: Use TypeScript for Props');
      expect(result).toContain('**ID**: react-001');
      expect(result).toContain('**Category**: typing');
      expect(result).toContain('**Severity**: error');
      expect(result).toContain('### Rule 2: Handle Optional Callbacks');
      expect(result).toContain('**ID**: react-002');
      expect(result).toContain('**Category**: safety');
      expect(result).toContain('**Severity**: warning');
    });

    it('should include report requirements', () => {
      const result = generateRuleDeviationReportPrompt(mockValidationResults, mockRules);

      expect(result).toContain('## Report Requirements');
      expect(result).toContain('📊 **Executive Summary**');
      expect(result).toContain('📈 **Detailed Analysis**');
      expect(result).toContain('🎯 **Actionable Insights**');
      expect(result).toContain('📋 **Implementation Roadmap**');
    });

    it('should include output format with metadata', () => {
      const result = generateRuleDeviationReportPrompt(
        mockValidationResults,
        mockRules,
        'compliance'
      );

      expect(result).toContain('## Output Format');
      expect(result).toContain('"reportMetadata"');
      expect(result).toContain('"executiveSummary"');
      expect(result).toContain('"detailedAnalysis"');
      expect(result).toContain('"actionableInsights"');
      expect(result).toContain('"implementationRoadmap"');
      expect(result).toContain('"successMetrics"');
      expect(result).toContain('"reportType": "compliance"');
      expect(result).toContain(`"filesAnalyzed": ${mockValidationResults.length}`);
      expect(result).toContain(`"rulesEvaluated": ${mockRules.length}`);
    });

    it('should handle empty validation results', () => {
      const result = generateRuleDeviationReportPrompt([], mockRules);

      expect(result).toContain('# Rule Deviation and Compliance Report');
      expect(result).toContain('## Validation Results');
      expect(result).toContain('"filesAnalyzed": 0');
      expect(result).not.toContain('### File 1:');
    });

    it('should handle empty rules array', () => {
      const result = generateRuleDeviationReportPrompt(mockValidationResults, []);

      expect(result).toContain('# Rule Deviation and Compliance Report');
      expect(result).toContain('## Rule Definitions');
      expect(result).toContain('"rulesEvaluated": 0');
      expect(result).not.toContain('### Rule 1:');
    });

    it('should include report guidelines', () => {
      const result = generateRuleDeviationReportPrompt(mockValidationResults, mockRules);

      expect(result).toContain('## Report Guidelines');
      expect(result).toContain(
        '1. **Data-Driven**: Base all conclusions on actual validation data'
      );
      expect(result).toContain(
        '2. **Actionable**: Provide specific, implementable recommendations'
      );
      expect(result).toContain('3. **Prioritized**: Rank issues and actions by impact and urgency');
      expect(result).toContain('4. **Realistic**: Set achievable goals and timelines');
      expect(result).toContain(
        '5. **Comprehensive**: Cover all aspects of compliance and improvement'
      );
      expect(result).toContain(
        '6. **Strategic**: Align recommendations with business and technical goals'
      );
    });

    it('should handle different report types', () => {
      const reportTypes: Array<'summary' | 'detailed' | 'trend' | 'compliance'> = [
        'summary',
        'detailed',
        'trend',
        'compliance',
      ];

      reportTypes.forEach(type => {
        const result = generateRuleDeviationReportPrompt(mockValidationResults, mockRules, type);
        expect(result).toContain(`## Report Type\n${type.toUpperCase()}`);
      });
    });

    it('should display violation details correctly', () => {
      const result = generateRuleDeviationReportPrompt(mockValidationResults, mockRules);

      expect(result).toContain(
        '- **Use TypeScript for Props** (error): Component props must be typed with TypeScript interface'
      );
      expect(result).toContain(
        '- **Handle Optional Callbacks** (warning): Use optional chaining for callback props'
      );
    });
  });

  describe('Edge Cases and Error Handling', () => {
    it('should handle very long content in ADR files', () => {
      const longAdr = [
        {
          id: 'long-adr',
          title: 'Very Long ADR',
          content: 'A'.repeat(5000),
          status: 'accepted',
          category: 'test',
        },
      ];

      const result = generateRuleExtractionPrompt(longAdr);
      expect(result).toContain('... (truncated for analysis)');
    });

    it('should handle special characters in content', () => {
      const specialCharAdr = [
        {
          id: 'special-adr',
          title: 'ADR with émojis 🚀 and ünïcödé',
          content: 'Content with special characters: @#$%^&*()_+{}|:"<>?',
          status: 'accepted',
          category: 'test',
        },
      ];

      const result = generateRuleExtractionPrompt(specialCharAdr);
      expect(result).toContain('ADR with émojis 🚀 and ünïcödé');
      expect(result).toContain('@#$%^&*()_+{}|:"<>?');
    });

    it('should handle empty strings in various fields', () => {
      const emptyFieldsAdr = [
        {
          id: '',
          title: '',
          content: '',
          status: '',
          category: '',
        },
      ];

      const result = generateRuleExtractionPrompt(emptyFieldsAdr);
      expect(result).toContain('**ID**: ');
      expect(result).toContain('**Status**: ');
      expect(result).toContain('**Category**: ');
    });

    it('should handle null and undefined values gracefully', () => {
      const result = generatePatternBasedRulePrompt('', [], undefined);
      expect(result).toContain('# Pattern-Based Rule Generation');
      expect(result).not.toContain('## Existing Rules');
    });

    it('should handle very large rule arrays', () => {
      const manyRules = Array.from({ length: 100 }, (_, i) => ({
        id: `rule-${i}`,
        name: `Rule ${i}`,
        description: `Description for rule ${i}`,
        pattern: `pattern-${i}`,
        severity: 'info',
        message: `Message for rule ${i}`,
      }));

      const result = generateCodeValidationPrompt('test code', 'test.ts', manyRules);
      expect(result).toContain('"totalRulesChecked": 100');
    });

    it('should handle complex nested data structures', () => {
      const complexValidationResults = [
        {
          fileName: 'complex.ts',
          violations: [
            {
              ruleId: 'complex-rule',
              ruleName: 'Complex Rule',
              severity: 'error',
              message: 'Complex violation message',
              location: {
                line: 1,
                column: 1,
                nested: {
                  data: 'test',
                  array: [1, 2, 3],
                },
              },
            },
          ],
          compliance: [],
          overallCompliance: 0.5,
        },
      ];

      const result = generateRuleDeviationReportPrompt(complexValidationResults, []);
      expect(result).toContain('Complex Rule');
      expect(result).toContain('Complex violation message');
    });
  });

  describe('Content Validation', () => {
    it('should include all required sections in rule extraction prompt', () => {
      const result = generateRuleExtractionPrompt([]);

      const requiredSections = [
        '# Architectural Rule Extraction Guide',
        '## ADR Files',
        '## Suggested Rule Categories',
        '## Output Format',
        '## Extraction Guidelines',
      ];

      requiredSections.forEach(section => {
        expect(result).toContain(section);
      });
    });

    it('should include all required sections in pattern-based prompt', () => {
      const result = generatePatternBasedRulePrompt('', []);

      const requiredSections = [
        '# Pattern-Based Rule Generation',
        '## Project Structure',
        '## Detected Code Patterns',
        '## Pattern Analysis Requirements',
        '## Output Format',
        '## Generation Guidelines',
      ];

      requiredSections.forEach(section => {
        expect(result).toContain(section);
      });
    });

    it('should include all required sections in code validation prompt', () => {
      const result = generateCodeValidationPrompt('', 'test.ts', []);

      const requiredSections = [
        '# Code Validation Against Architectural Rules',
        '## Code to Validate',
        '## Architectural Rules',
        '## Validation Requirements',
        '## Output Format',
        '## Validation Guidelines',
      ];

      requiredSections.forEach(section => {
        expect(result).toContain(section);
      });
    });

    it('should include all required sections in deviation report prompt', () => {
      const result = generateRuleDeviationReportPrompt([], []);

      const requiredSections = [
        '# Rule Deviation and Compliance Report',
        '## Validation Results',
        '## Rule Definitions',
        '## Report Type',
        '## Report Requirements',
        '## Output Format',
        '## Report Guidelines',
      ];

      requiredSections.forEach(section => {
        expect(result).toContain(section);
      });
    });
  });
});
