import {
  generateImplicitDecisionDetectionPrompt,
  generateCodeChangeAnalysisPrompt,
  generateAdrTemplatePrompt,
} from '../../src/prompts/adr-suggestion-prompts.js';

describe('ADR Suggestion Prompts', () => {
  describe('generateImplicitDecisionDetectionPrompt', () => {
    const mockProjectPath = process.cwd();
    const mockExistingAdrs = [
      'ADR-001: Use React Framework',
      'ADR-002: PostgreSQL Database Choice',
    ];

    it('should generate implicit decision detection prompt with project path', () => {
      const result = generateImplicitDecisionDetectionPrompt(mockProjectPath);

      expect(result).toContain('Context-Aware Architectural Decision Detection');
      expect(result).toContain(`Analyze the project at ${mockProjectPath}`);
      expect(result).toContain('User Context Integration');
      expect(result).toContain('{{userGoals}}');
      expect(result).toContain('{{focusAreas}}');
      expect(result).toContain('{{constraints}}');
      expect(result).toContain('{{projectPhase}}');
    });

    it('should include existing ADRs when provided', () => {
      const result = generateImplicitDecisionDetectionPrompt(mockProjectPath, mockExistingAdrs);

      expect(result).toContain('Existing ADRs (avoid duplicating)');
      expect(result).toContain('ADR-001: Use React Framework');
      expect(result).toContain('ADR-002: PostgreSQL Database Choice');
    });

    it('should not include existing ADRs section when none provided', () => {
      const result = generateImplicitDecisionDetectionPrompt(mockProjectPath);

      expect(result).not.toContain('Existing ADRs (avoid duplicating)');
      expect(result).not.toContain('ADR-001');
      expect(result).not.toContain('ADR-002');
    });

    it('should include all required analysis sections', () => {
      const result = generateImplicitDecisionDetectionPrompt(mockProjectPath);

      expect(result).toContain('Project Structure Analysis');
      expect(result).toContain('Code Pattern Detection');
      expect(result).toContain('Technology Stack Analysis');
      expect(result).toContain('Detection Requirements');
      expect(result).toContain('Architectural Patterns');
      expect(result).toContain('Technology Decisions');
      expect(result).toContain('Structural Decisions');
      expect(result).toContain('Process Decisions');
    });

    it('should include JSON output format specification', () => {
      const result = generateImplicitDecisionDetectionPrompt(mockProjectPath);

      expect(result).toContain('Suggested Output Format');
      expect(result).toContain('implicitDecisions');
      expect(result).toContain('decisionClusters');
      expect(result).toContain('recommendations');
      expect(result).toContain('gaps');
      expect(result).toContain('confidence');
      expect(result).toContain('priority');
    });

    it('should include detection guidelines', () => {
      const result = generateImplicitDecisionDetectionPrompt(mockProjectPath);

      expect(result).toContain('Detection Guidelines');
      expect(result).toContain('Evidence-Based');
      expect(result).toContain('Avoid Duplication');
      expect(result).toContain('Prioritize Impact');
      expect(result).toContain('Consider Context');
      expect(result).toContain('Cluster Related');
    });

    it('should handle special characters in project path', () => {
      const specialPath = '/path/with spaces & symbols!/project@v2.0';
      const result = generateImplicitDecisionDetectionPrompt(specialPath);

      expect(result).toContain(specialPath);
    });

    it('should handle empty existing ADRs array', () => {
      const result = generateImplicitDecisionDetectionPrompt(mockProjectPath, []);

      // Empty array is truthy, so "Existing ADRs" section is included but empty
      expect(result).toContain('Existing ADRs (avoid duplicating)');
    });

    it('should handle large number of existing ADRs', () => {
      const manyAdrs = Array(50).fill(0).map((_, i) => `ADR-${String(i + 1).padStart(3, '0')}: Decision ${i + 1}`);
      const result = generateImplicitDecisionDetectionPrompt(mockProjectPath, manyAdrs);

      expect(result).toContain('Existing ADRs (avoid duplicating)');
      expect(result).toContain('ADR-001: Decision 1');
      expect(result).toContain('ADR-050: Decision 50');
    });

    it('should handle unicode characters in project path and ADRs', () => {
      const unicodePath = '/项目/路径/测试';
      const unicodeAdrs = ['ADR-001: 使用React框架', 'ADR-002: База данных PostgreSQL'];
      const result = generateImplicitDecisionDetectionPrompt(unicodePath, unicodeAdrs);

      expect(result).toContain(unicodePath);
      expect(result).toContain('使用React框架');
      expect(result).toContain('База данных PostgreSQL');
    });
  });

  describe('generateCodeChangeAnalysisPrompt', () => {
    const mockBeforeCode = `
function oldFunction() {
  return "old implementation";
}
    `.trim();

    const mockAfterCode = `
class NewImplementation {
  execute() {
    return "new implementation with class";
  }
}
    `.trim();

    const mockChangeDescription = 'Refactored function to class-based implementation';
    const mockCommitMessages = [
      'feat: refactor to class-based architecture',
      'fix: improve error handling in new implementation',
    ];

    it('should generate code change analysis prompt with all parameters', () => {
      const result = generateCodeChangeAnalysisPrompt(
        mockBeforeCode,
        mockAfterCode,
        mockChangeDescription,
        mockCommitMessages
      );

      expect(result).toContain('Code Change Analysis Guide for Architectural Decisions');
      expect(result).toContain('Change Description');
      expect(result).toContain(mockChangeDescription);
      expect(result).toContain('Commit Messages');
      expect(result).toContain('feat: refactor to class-based architecture');
      expect(result).toContain('fix: improve error handling in new implementation');
      expect(result).toContain('Before Code');
      expect(result).toContain('oldFunction');
      expect(result).toContain('After Code');
      expect(result).toContain('NewImplementation');
    });

    it('should handle missing commit messages', () => {
      const result = generateCodeChangeAnalysisPrompt(
        mockBeforeCode,
        mockAfterCode,
        mockChangeDescription
      );

      expect(result).toContain('Code Change Analysis Guide for Architectural Decisions');
      expect(result).toContain(mockChangeDescription);
      expect(result).toContain('Before Code');
      expect(result).toContain('After Code');
    });

    it('should truncate large code blocks', () => {
      const largeBeforeCode = 'A'.repeat(5000);
      const largeAfterCode = 'B'.repeat(5000);
      const result = generateCodeChangeAnalysisPrompt(
        largeBeforeCode,
        largeAfterCode,
        mockChangeDescription
      );

      expect(result).toContain('Code Change Analysis Guide for Architectural Decisions');
      expect(result).toContain('... (truncated)');
      expect(result.length).toBeLessThan(largeBeforeCode.length + largeAfterCode.length);
    });

    it('should include all analysis sections', () => {
      const result = generateCodeChangeAnalysisPrompt(
        mockBeforeCode,
        mockAfterCode,
        mockChangeDescription
      );

      expect(result).toContain('Analysis Requirements');
      expect(result).toContain('Change Types');
      expect(result).toContain('Decision Indicators');
      expect(result).toContain('Impact Assessment');
      expect(result).toContain('Technology Changes');
      expect(result).toContain('Pattern Changes');
      expect(result).toContain('Breaking Changes');
      expect(result).toContain('Performance Changes');
    });

    it('should include JSON output format specification', () => {
      const result = generateCodeChangeAnalysisPrompt(
        mockBeforeCode,
        mockAfterCode,
        mockChangeDescription
      );

      expect(result).toContain('Analysis Output Format');
      expect(result).toContain('changeAnalysis');
      expect(result).toContain('identifiedDecisions');
      expect(result).toContain('recommendations');
      expect(result).toContain('followUpQuestions');
      expect(result).toContain('changeType');
      expect(result).toContain('scope');
      expect(result).toContain('impact');
      expect(result).toContain('reversibility');
      expect(result).toContain('riskLevel');
    });

    it('should include analysis guidelines', () => {
      const result = generateCodeChangeAnalysisPrompt(
        mockBeforeCode,
        mockAfterCode,
        mockChangeDescription
      );

      expect(result).toContain('Analysis Guidelines');
      expect(result).toContain('Focus on Decisions');
      expect(result).toContain('Infer Context');
      expect(result).toContain('Assess Impact');
      expect(result).toContain('Question Assumptions');
      expect(result).toContain('Prioritize Documentation');
    });

    it('should handle empty code blocks', () => {
      const result = generateCodeChangeAnalysisPrompt('', '', mockChangeDescription);

      expect(result).toContain('Code Change Analysis Guide for Architectural Decisions');
      expect(result).toContain(mockChangeDescription);
      expect(result).toContain('Before Code');
      expect(result).toContain('After Code');
    });

    it('should handle special characters in code and descriptions', () => {
      const specialBeforeCode = 'const config = { "key": "value with $pecial ch@rs!" };';
      const specialAfterCode = 'const config = { "key": "new value & symbols" };';
      const specialDescription = 'Updated config with special characters & symbols';
      const result = generateCodeChangeAnalysisPrompt(
        specialBeforeCode,
        specialAfterCode,
        specialDescription
      );

      expect(result).toContain(specialDescription);
      expect(result).toContain('$pecial ch@rs!');
      expect(result).toContain('new value & symbols');
    });

    it('should handle empty commit messages array', () => {
      const result = generateCodeChangeAnalysisPrompt(
        mockBeforeCode,
        mockAfterCode,
        mockChangeDescription,
        []
      );

      expect(result).toContain('Code Change Analysis Guide for Architectural Decisions');
      // Empty array is truthy, so Commit Messages section is included but empty
      expect(result).toContain('Commit Messages');
    });

    it('should handle unicode characters in code and messages', () => {
      const unicodeBeforeCode = 'function 测试函数() { return "测试"; }';
      const unicodeAfterCode = 'class ТестовыйКласс { метод() { return "тест"; } }';
      const unicodeDescription = 'Refactored 测试函数 to ТестовыйКласс';
      const unicodeCommits = ['feat: добавить 测试 functionality'];
      const result = generateCodeChangeAnalysisPrompt(
        unicodeBeforeCode,
        unicodeAfterCode,
        unicodeDescription,
        unicodeCommits
      );

      expect(result).toContain('测试函数');
      expect(result).toContain('ТестовыйКласс');
      expect(result).toContain('добавить 测试 functionality');
    });
  });

  describe('generateAdrTemplatePrompt', () => {
    const mockDecisionData = {
      title: 'Use React for Frontend Framework',
      context: 'We need to choose a frontend framework for our new web application',
      decision: 'We will use React as our primary frontend framework',
      consequences: 'This will provide component reusability and strong ecosystem support',
      alternatives: ['Vue.js', 'Angular', 'Svelte'],
      evidence: ['Team expertise in React', 'Large community support', 'Rich ecosystem'],
    };

    const mockExistingAdrs = [
      'ADR-001: Database Selection',
      'ADR-002: Authentication Strategy',
    ];

    it('should generate ADR template prompt with all decision data', () => {
      const result = generateAdrTemplatePrompt(mockDecisionData, 'nygard', mockExistingAdrs);

      expect(result).toContain('ADR Template Generation');
      expect(result).toContain('Decision Data');
      expect(result).toContain('Use React for Frontend Framework');
      expect(result).toContain('We need to choose a frontend framework');
      expect(result).toContain('We will use React as our primary frontend framework');
      expect(result).toContain('component reusability and strong ecosystem support');
    });

    it('should include alternatives when provided', () => {
      const result = generateAdrTemplatePrompt(mockDecisionData, 'nygard');

      expect(result).toContain('Alternatives Considered');
      expect(result).toContain('Vue.js');
      expect(result).toContain('Angular');
      expect(result).toContain('Svelte');
    });

    it('should include evidence when provided', () => {
      const result = generateAdrTemplatePrompt(mockDecisionData, 'nygard');

      expect(result).toContain('Supporting Evidence');
      expect(result).toContain('Team expertise in React');
      expect(result).toContain('Large community support');
      expect(result).toContain('Rich ecosystem');
    });

    it('should include existing ADRs when provided', () => {
      const result = generateAdrTemplatePrompt(mockDecisionData, 'nygard', mockExistingAdrs);

      expect(result).toContain('Existing ADRs (for reference and numbering)');
      expect(result).toContain('ADR-001: Database Selection');
      expect(result).toContain('ADR-002: Authentication Strategy');
    });

    it('should handle nygard template format', () => {
      const result = generateAdrTemplatePrompt(mockDecisionData, 'nygard');

      expect(result).toContain('Template Format');
      expect(result).toContain('NYGARD');
      expect(result).toContain('Nygard Format');
      expect(result).toContain('# ADR-XXXX: [Title]');
      expect(result).toContain('## Status');
      expect(result).toContain('## Context');
      expect(result).toContain('## Decision');
      expect(result).toContain('## Consequences');
    });

    it('should handle madr template format', () => {
      const result = generateAdrTemplatePrompt(mockDecisionData, 'madr');

      expect(result).toContain('Template Format');
      expect(result).toContain('MADR');
      expect(result).toContain('MADR Format');
      expect(result).toContain('## Context and Problem Statement');
      expect(result).toContain('## Decision Drivers');
      expect(result).toContain('## Considered Options');
      expect(result).toContain('## Decision Outcome');
      expect(result).toContain('### Positive Consequences');
      expect(result).toContain('### Negative Consequences');
    });

    it('should handle custom template format', () => {
      const result = generateAdrTemplatePrompt(mockDecisionData, 'custom');

      expect(result).toContain('Template Format');
      expect(result).toContain('CUSTOM');
    });

    it('should default to nygard format when no format specified', () => {
      const result = generateAdrTemplatePrompt(mockDecisionData);

      expect(result).toContain('NYGARD');
      expect(result).toContain('Nygard Format');
    });

    it('should include JSON output format specification', () => {
      const result = generateAdrTemplatePrompt(mockDecisionData);

      expect(result).toContain('Output Format');
      expect(result).toContain('adr');
      expect(result).toContain('suggestions');
      expect(result).toContain('qualityChecks');
      expect(result).toContain('id');
      expect(result).toContain('title');
      expect(result).toContain('status');
      expect(result).toContain('content');
      expect(result).toContain('metadata');
      expect(result).toContain('placement');
      expect(result).toContain('completeness');
      expect(result).toContain('clarity');
    });

    it('should include generation guidelines', () => {
      const result = generateAdrTemplatePrompt(mockDecisionData);

      expect(result).toContain('Generation Guidelines');
      expect(result).toContain('Complete Content');
      expect(result).toContain('Clear Language');
      expect(result).toContain('Actionable');
      expect(result).toContain('Traceable');
      expect(result).toContain('Consistent');
      expect(result).toContain('Numbered');
    });

    it('should handle decision data without alternatives', () => {
      const dataWithoutAlternatives = {
        title: mockDecisionData.title,
        context: mockDecisionData.context,
        decision: mockDecisionData.decision,
        consequences: mockDecisionData.consequences,
      };
      const result = generateAdrTemplatePrompt(dataWithoutAlternatives);

      expect(result).toContain('ADR Template Generation');
      expect(result).toContain(mockDecisionData.title);
      expect(result).not.toContain('Alternatives Considered');
    });

    it('should handle decision data without evidence', () => {
      const dataWithoutEvidence = {
        title: mockDecisionData.title,
        context: mockDecisionData.context,
        decision: mockDecisionData.decision,
        consequences: mockDecisionData.consequences,
        alternatives: mockDecisionData.alternatives,
      };
      const result = generateAdrTemplatePrompt(dataWithoutEvidence);

      expect(result).toContain('ADR Template Generation');
      expect(result).toContain(mockDecisionData.title);
      // The function does not include Supporting Evidence section when no evidence provided
      expect(result).not.toContain('Supporting Evidence');
    });

    it('should handle empty evidence array', () => {
      const dataWithEmptyEvidence = {
        ...mockDecisionData,
        evidence: [],
      };
      const result = generateAdrTemplatePrompt(dataWithEmptyEvidence);

      expect(result).toContain('ADR Template Generation');
      // The function includes Supporting Evidence section even when evidence array is empty (truthy check)
      expect(result).toContain('Supporting Evidence');
    });

    it('should handle special characters in decision data', () => {
      const specialDecisionData = {
        title: 'Use Framework@v2.0 & Library',
        context: 'Context with $pecial ch@rs & symbols!',
        decision: 'Decision with "quotes" and symbols',
        consequences: 'Consequences with UTF-8: 测试 & тест',
      };
      const result = generateAdrTemplatePrompt(specialDecisionData);

      expect(result).toContain('Framework@v2.0 & Library');
      expect(result).toContain('$pecial ch@rs & symbols!');
      expect(result).toContain('"quotes" and symbols');
      expect(result).toContain('测试 & тест');
    });

    it('should handle unicode characters in all fields', () => {
      const unicodeDecisionData = {
        title: '使用React框架',
        context: 'Контекст решения',
        decision: 'Décision finale',
        consequences: 'Последствия решения',
        alternatives: ['Vue.js框架', 'Angular框架'],
        evidence: ['Команда знает React', '大型社区支持'],
      };
      const result = generateAdrTemplatePrompt(unicodeDecisionData);

      expect(result).toContain('使用React框架');
      expect(result).toContain('Контекст решения');
      expect(result).toContain('Décision finale');
      expect(result).toContain('Последствия решения');
      expect(result).toContain('Vue.js框架');
      expect(result).toContain('Команда знает React');
      expect(result).toContain('大型社区支持');
    });
  });

  describe('Edge Cases and Error Handling', () => {
    it('should handle null and undefined inputs appropriately', () => {
      // generateImplicitDecisionDetectionPrompt requires projectPath, should handle null gracefully
      expect(() => generateImplicitDecisionDetectionPrompt(null as any)).not.toThrow();
      expect(() => generateImplicitDecisionDetectionPrompt(undefined as any)).not.toThrow();
      expect(() => generateImplicitDecisionDetectionPrompt('', null as any)).not.toThrow();
      expect(() => generateImplicitDecisionDetectionPrompt('', undefined as any)).not.toThrow();

      // generateCodeChangeAnalysisPrompt throws on null inputs due to .slice() calls
      expect(() => generateCodeChangeAnalysisPrompt(null as any, null as any, null as any)).toThrow();
      expect(() => generateCodeChangeAnalysisPrompt(undefined as any, undefined as any, undefined as any)).toThrow();
      
      // But handles empty strings gracefully
      expect(() => generateCodeChangeAnalysisPrompt('', '', '')).not.toThrow();

      // generateAdrTemplatePrompt throws on null/undefined inputs due to property access
      expect(() => generateAdrTemplatePrompt(null as any)).toThrow();
      expect(() => generateAdrTemplatePrompt(undefined as any)).toThrow();
    });

    it('should handle extremely large inputs', () => {
      const largeString = 'A'.repeat(100000);
      const largeArray = Array(1000).fill('Large ADR item');
      const largeDecisionData = {
        title: largeString,
        context: largeString,
        decision: largeString,
        consequences: largeString,
        alternatives: largeArray,
        evidence: largeArray,
      };

      expect(() => generateImplicitDecisionDetectionPrompt(largeString, largeArray)).not.toThrow();
      expect(() => generateCodeChangeAnalysisPrompt(largeString, largeString, largeString, largeArray)).not.toThrow();
      expect(() => generateAdrTemplatePrompt(largeDecisionData)).not.toThrow();
    });

    it('should handle unicode and special encoding characters', () => {
      const unicodeString = '测试项目路径/файл/αρχείο';
      const unicodeArray = ['ADR-001: 使用React框架', 'ADR-002: База данных PostgreSQL'];
      const unicodeDecisionData = {
        title: '使用React框架',
        context: 'Контекст решения',
        decision: 'Décision finale',
        consequences: 'Последствия решения',
      };

      expect(() => generateImplicitDecisionDetectionPrompt(unicodeString, unicodeArray)).not.toThrow();
      expect(() => generateCodeChangeAnalysisPrompt(unicodeString, unicodeString, unicodeString)).not.toThrow();
      expect(() => generateAdrTemplatePrompt(unicodeDecisionData)).not.toThrow();
    });

    it('should maintain consistent output format across all functions', () => {
      const results = [
        generateImplicitDecisionDetectionPrompt(process.cwd()),
        generateCodeChangeAnalysisPrompt('before', 'after', 'description'),
        generateAdrTemplatePrompt({
          title: 'Test',
          context: 'Test context',
          decision: 'Test decision',
          consequences: 'Test consequences',
        }),
      ];

      results.forEach(result => {
        expect(typeof result).toBe('string');
        expect(result.length).toBeGreaterThan(0);
        expect(
          result.includes('Analysis') || 
          result.includes('Template') || 
          result.includes('Enhanced:')
        ).toBe(true);
      });
    });
  });
});
