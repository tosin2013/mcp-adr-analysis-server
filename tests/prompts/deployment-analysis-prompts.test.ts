/**
 * Unit tests for deployment-analysis-prompts.ts
 * Comprehensive test coverage for all exported functions
 */

import {
  generateDeploymentTaskIdentificationPrompt,
  generateCiCdAnalysisPrompt,
  generateDeploymentProgressCalculationPrompt,
  generateCompletionVerificationPrompt
} from '../../src/prompts/deployment-analysis-prompts';

describe('Deployment Analysis Prompts', () => {
  describe('generateDeploymentTaskIdentificationPrompt', () => {
    const mockAdrFiles = [
      {
        id: 'adr-001',
        title: 'Use Microservices Architecture',
        content: 'We will adopt microservices architecture for better scalability and maintainability.',
        status: 'accepted'
      },
      {
        id: 'adr-002',
        title: 'Database Migration Strategy',
        content: 'We will use blue-green deployment for database migrations to minimize downtime.',
        status: 'proposed'
      }
    ];

    describe('basic functionality', () => {
      it('should generate prompt with ADR files only', () => {
        const result = generateDeploymentTaskIdentificationPrompt(mockAdrFiles);

        expect(result).toContain('Deployment Task Identification Guide');
        expect(result).toContain('ADR 1: Use Microservices Architecture');
        expect(result).toContain('ADR 2: Database Migration Strategy');
        expect(result).toContain('adr-001');
        expect(result).toContain('adr-002');
        expect(result).toContain('accepted');
        expect(result).toContain('proposed');
        expect(result).toContain('Infrastructure Deployment');
        expect(result).toContain('Application Deployment');
        expect(result).toContain('CI/CD Pipeline');
        expect(result).toContain('Operational Tasks');
      });

      it('should generate prompt with ADR files and todo content', () => {
        const todoContent = '- Deploy to staging environment\n- Set up monitoring\n- Configure load balancer';
        const result = generateDeploymentTaskIdentificationPrompt(mockAdrFiles, todoContent);

        expect(result).toContain('Todo Content');
        expect(result).toContain('Deploy to staging environment');
        expect(result).toContain('Set up monitoring');
        expect(result).toContain('Configure load balancer');
      });

      it('should include JSON output format template', () => {
        const result = generateDeploymentTaskIdentificationPrompt(mockAdrFiles);

        expect(result).toContain('"deploymentTaskAnalysis"');
        expect(result).toContain('"totalAdrsAnalyzed": 2');
        expect(result).toContain('"identifiedTasks"');
        expect(result).toContain('"deploymentPhases"');
        expect(result).toContain('"riskAssessment"');
        expect(result).toContain('"recommendations"');
      });
    });

    describe('content truncation', () => {
      it('should truncate long ADR content', () => {
        const longContent = 'A'.repeat(1500);
        const adrWithLongContent = [{
          id: 'adr-long',
          title: 'Long ADR',
          content: longContent,
          status: 'accepted'
        }];

        const result = generateDeploymentTaskIdentificationPrompt(adrWithLongContent);

        expect(result).toContain('... (truncated)');
        expect(result).not.toContain('A'.repeat(1500));
      });

      it('should truncate long todo content', () => {
        const longTodoContent = 'B'.repeat(2000);
        const result = generateDeploymentTaskIdentificationPrompt(mockAdrFiles, longTodoContent);

        expect(result).toContain('... (truncated)');
        expect(result).not.toContain('B'.repeat(2000));
      });

      it('should not truncate short content', () => {
        const shortContent = 'Short content';
        const adrWithShortContent = [{
          id: 'adr-short',
          title: 'Short ADR',
          content: shortContent,
          status: 'accepted'
        }];

        const result = generateDeploymentTaskIdentificationPrompt(adrWithShortContent);

        expect(result).toContain(shortContent);
        expect(result).not.toContain('... (truncated)');
      });
    });

    describe('edge cases', () => {
      it('should handle empty ADR files array', () => {
        const result = generateDeploymentTaskIdentificationPrompt([]);

        expect(result).toContain('Deployment Task Identification Guide');
        expect(result).toContain('"totalAdrsAnalyzed": 0');
        expect(result).not.toContain('Todo Content');
      });

      it('should handle ADR with empty content', () => {
        const emptyAdr = [{
          id: 'adr-empty',
          title: 'Empty ADR',
          content: '',
          status: 'draft'
        }];

        const result = generateDeploymentTaskIdentificationPrompt(emptyAdr);

        expect(result).toContain('Empty ADR');
        expect(result).toContain('adr-empty');
        expect(result).toContain('draft');
      });

      it('should handle special characters in content', () => {
        const specialCharsAdr = [{
          id: 'adr-special',
          title: 'Special Characters & Symbols',
          content: 'Content with special chars: @#$%^&*(){}[]|\\:";\'<>?,./',
          status: 'accepted'
        }];

        const result = generateDeploymentTaskIdentificationPrompt(specialCharsAdr);

        expect(result).toContain('Special Characters & Symbols');
        expect(result).toContain('@#$%^&*(){}[]|\\:";\'<>?,./');
      });
    });
  });

  describe('generateCiCdAnalysisPrompt', () => {
    const mockCicdLogs = `
      [2023-01-01T10:00:00Z] INFO: Starting build process
      [2023-01-01T10:01:00Z] INFO: Running unit tests
      [2023-01-01T10:02:00Z] ERROR: Test failure in user-service
      [2023-01-01T10:03:00Z] INFO: Build completed with errors
    `;

    const mockPipelineConfig = `
      stages:
        - build
        - test
        - deploy
      build:
        script: npm run build
      test:
        script: npm test
    `;

    const mockDeploymentTasks = [
      {
        taskId: 'task-001',
        taskName: 'Deploy to staging',
        category: 'deployment',
        verificationCriteria: ['Health check passes', 'All services running']
      },
      {
        taskId: 'task-002',
        taskName: 'Run integration tests',
        category: 'testing',
        verificationCriteria: ['All tests pass', 'Coverage > 80%']
      }
    ];

    describe('basic functionality', () => {
      it('should generate prompt with CI/CD logs only', () => {
        const result = generateCiCdAnalysisPrompt(mockCicdLogs);

        expect(result).toContain('CI/CD Pipeline Analysis and Status Assessment');
        expect(result).toContain('Starting build process');
        expect(result).toContain('Test failure in user-service');
        expect(result).toContain('Pipeline Status Analysis');
        expect(result).toContain('Progress Assessment');
        expect(result).toContain('Issue Identification');
        expect(result).toContain('Recommendations');
      });

      it('should generate prompt with all parameters', () => {
        const result = generateCiCdAnalysisPrompt(mockCicdLogs, mockPipelineConfig, mockDeploymentTasks);

        expect(result).toContain('Pipeline Configuration');
        expect(result).toContain('npm run build');
        expect(result).toContain('npm test');
        expect(result).toContain('Deployment Tasks Context');
        expect(result).toContain('Deploy to staging');
        expect(result).toContain('Run integration tests');
        expect(result).toContain('Health check passes');
        expect(result).toContain('Coverage > 80%');
      });

      it('should include JSON output format template', () => {
        const result = generateCiCdAnalysisPrompt(mockCicdLogs);

        expect(result).toContain('"cicdAnalysis"');
        expect(result).toContain('"pipelineStages"');
        expect(result).toContain('"testResults"');
        expect(result).toContain('"qualityGates"');
        expect(result).toContain('"deploymentStatus"');
        expect(result).toContain('"performanceMetrics"');
      });
    });

    describe('content truncation', () => {
      it('should truncate long CI/CD logs', () => {
        const longLogs = 'LOG ENTRY '.repeat(500);
        const result = generateCiCdAnalysisPrompt(longLogs);

        expect(result).toContain('... (truncated for analysis)');
      });

      it('should truncate long pipeline config', () => {
        const longConfig = 'config: value\n'.repeat(200);
        const result = generateCiCdAnalysisPrompt(mockCicdLogs, longConfig);

        expect(result).toContain('... (truncated)');
      });
    });

    describe('edge cases', () => {
      it('should handle empty CI/CD logs', () => {
        const result = generateCiCdAnalysisPrompt('');

        expect(result).toContain('CI/CD Pipeline Analysis');
        expect(result).not.toContain('Pipeline Configuration');
        expect(result).not.toContain('Deployment Tasks Context');
      });

      it('should handle undefined optional parameters', () => {
        const result = generateCiCdAnalysisPrompt(mockCicdLogs, undefined, undefined);

        expect(result).toContain('CI/CD Pipeline Analysis');
        expect(result).not.toContain('Pipeline Configuration');
        expect(result).not.toContain('Deployment Tasks Context');
      });

      it('should handle empty deployment tasks array', () => {
        const result = generateCiCdAnalysisPrompt(mockCicdLogs, mockPipelineConfig, []);

        expect(result).toContain('Deployment Tasks Context');
        expect(result).not.toContain('Deploy to staging');
      });
    });
  });

  describe('generateDeploymentProgressCalculationPrompt', () => {
    const mockDeploymentTasks = [
      {
        taskId: 'task-001',
        taskName: 'Setup infrastructure',
        status: 'completed',
        progress: 100,
        category: 'infrastructure',
        priority: 'high'
      },
      {
        taskId: 'task-002',
        taskName: 'Deploy application',
        status: 'in_progress',
        progress: 60,
        category: 'application',
        priority: 'critical'
      }
    ];

    const mockCicdStatus = {
      pipelineStatus: 'in_progress',
      overallProgress: 75,
      currentStage: 'deployment'
    };

    const mockEnvironmentStatus = {
      staging: { status: 'healthy', version: '1.2.0' },
      production: { status: 'pending', version: '1.1.0' }
    };

    describe('basic functionality', () => {
      it('should generate prompt with deployment tasks only', () => {
        const result = generateDeploymentProgressCalculationPrompt(mockDeploymentTasks);

        expect(result).toContain('Deployment Progress Calculation');
        expect(result).toContain('Task 1: Setup infrastructure');
        expect(result).toContain('Task 2: Deploy application');
        expect(result).toContain('**Status**: completed');
        expect(result).toContain('**Status**: in_progress');
        expect(result).toContain('**Progress**: 100%');
        expect(result).toContain('**Progress**: 60%');
        expect(result).toContain('**Category**: infrastructure');
        expect(result).toContain('**Priority**: critical');
      });

      it('should generate prompt with all parameters', () => {
        const result = generateDeploymentProgressCalculationPrompt(
          mockDeploymentTasks,
          mockCicdStatus,
          mockEnvironmentStatus
        );

        expect(result).toContain('CI/CD Pipeline Status');
        expect(result).toContain('"pipelineStatus": "in_progress"');
        expect(result).toContain('"overallProgress": 75');
        expect(result).toContain('Environment Status');
        expect(result).toContain('"staging"');
        expect(result).toContain('"production"');
        expect(result).toContain('"status": "healthy"');
      });

      it('should include comprehensive progress calculation requirements', () => {
        const result = generateDeploymentProgressCalculationPrompt(mockDeploymentTasks);

        expect(result).toContain('Task-Based Progress');
        expect(result).toContain('Pipeline Progress');
        expect(result).toContain('Environment Progress');
        expect(result).toContain('Weighted Progress');
        expect(result).toContain('Critical Path');
        expect(result).toContain('Dependency Impact');
      });

      it('should include JSON output format template', () => {
        const result = generateDeploymentProgressCalculationPrompt(mockDeploymentTasks);

        expect(result).toContain('"deploymentProgress"');
        expect(result).toContain('"categoryProgress"');
        expect(result).toContain('"taskProgress"');
        expect(result).toContain('"criticalPath"');
        expect(result).toContain('"milestones"');
        expect(result).toContain('"qualityMetrics"');
        expect(result).toContain('"riskAssessment"');
      });
    });

    describe('edge cases', () => {
      it('should handle empty deployment tasks array', () => {
        const result = generateDeploymentProgressCalculationPrompt([]);

        expect(result).toContain('Deployment Progress Calculation');
        expect(result).not.toContain('Task 1:');
        expect(result).not.toContain('CI/CD Pipeline Status');
        expect(result).not.toContain('Environment Status');
      });

      it('should handle undefined optional parameters', () => {
        const result = generateDeploymentProgressCalculationPrompt(mockDeploymentTasks, undefined, undefined);

        expect(result).toContain('Deployment Progress Calculation');
        expect(result).toContain('Task 1: Setup infrastructure');
        expect(result).not.toContain('CI/CD Pipeline Status');
        expect(result).not.toContain('Environment Status');
      });

      it('should handle tasks with zero progress', () => {
        const zeroProgressTasks = [{
          taskId: 'task-zero',
          taskName: 'Not started task',
          status: 'not_started',
          progress: 0,
          category: 'planning',
          priority: 'low'
        }];

        const result = generateDeploymentProgressCalculationPrompt(zeroProgressTasks);

        expect(result).toContain('**Progress**: 0%');
        expect(result).toContain('**Status**: not_started');
        expect(result).toContain('**Priority**: low');
      });
    });
  });

  describe('generateCompletionVerificationPrompt', () => {
    const mockDeploymentTasks = [
      {
        taskId: 'task-001',
        taskName: 'Database migration',
        verificationCriteria: ['Schema updated', 'Data migrated successfully', 'No data loss'],
        expectedOutcome: 'Database schema updated to v2.0 with all data migrated',
        status: 'completed'
      },
      {
        taskId: 'task-002',
        taskName: 'Load balancer setup',
        verificationCriteria: ['Health checks configured', 'SSL termination working'],
        expectedOutcome: 'Load balancer distributing traffic across all instances',
        status: 'in_progress'
      }
    ];

    const mockOutcomeRules = [
      {
        ruleId: 'rule-001',
        description: 'Database integrity verification',
        criteria: ['No data corruption', 'All constraints maintained', 'Performance within SLA'],
        verificationMethod: 'automated_testing'
      },
      {
        ruleId: 'rule-002',
        description: 'Load balancer functionality',
        criteria: ['Traffic distribution working', 'Failover mechanism tested'],
        verificationMethod: 'manual_testing'
      }
    ];

    const mockActualOutcomes = [
      {
        taskId: 'task-001',
        outcome: 'Database successfully migrated with zero downtime',
        evidence: ['Migration logs clean', 'Data integrity checks passed', 'Performance tests passed'],
        timestamp: '2023-01-01T12:00:00Z'
      }
    ];

    describe('basic functionality', () => {
      it('should generate prompt with tasks and rules only', () => {
        const result = generateCompletionVerificationPrompt(mockDeploymentTasks, mockOutcomeRules);

        expect(result).toContain('Deployment Completion Verification with Outcome Rules');
        expect(result).toContain('Task 1: Database migration');
        expect(result).toContain('Task 2: Load balancer setup');
        expect(result).toContain('**Expected Outcome**: Database schema updated');
        expect(result).toContain('Schema updated');
        expect(result).toContain('Data migrated successfully');
        expect(result).toContain('Rule 1: Database integrity verification');
        expect(result).toContain('Rule 2: Load balancer functionality');
        expect(result).toContain('automated_testing');
        expect(result).toContain('manual_testing');
      });

      it('should generate prompt with all parameters', () => {
        const result = generateCompletionVerificationPrompt(
          mockDeploymentTasks,
          mockOutcomeRules,
          mockActualOutcomes
        );

        expect(result).toContain('Actual Outcomes');
        expect(result).toContain('Outcome 1: task-001');
        expect(result).toContain('Database successfully migrated with zero downtime');
        expect(result).toContain('Migration logs clean');
        expect(result).toContain('2023-01-01T12:00:00Z');
      });

      it('should include comprehensive verification requirements', () => {
        const result = generateCompletionVerificationPrompt(mockDeploymentTasks, mockOutcomeRules);

        expect(result).toContain('Criteria Verification');
        expect(result).toContain('Compliance Assessment');
        expect(result).toContain('Success Metrics');
        expect(result).toContain('Task Completion');
        expect(result).toContain('Outcome Validation');
        expect(result).toContain('Rule Compliance');
      });

      it('should include JSON output format template', () => {
        const result = generateCompletionVerificationPrompt(mockDeploymentTasks, mockOutcomeRules);

        expect(result).toContain('"completionVerification"');
        expect(result).toContain('"taskVerification"');
        expect(result).toContain('"ruleCompliance"');
        expect(result).toContain('"qualityAssessment"');
        expect(result).toContain('"successMetrics"');
        expect(result).toContain('"completionGaps"');
        expect(result).toContain('"signOffStatus"');
      });
    });

    describe('edge cases', () => {
      it('should handle empty tasks array', () => {
        const result = generateCompletionVerificationPrompt([], mockOutcomeRules);

        expect(result).toContain('Deployment Completion Verification');
        expect(result).not.toContain('Task 1:');
        expect(result).toContain('Rule 1: Database integrity verification');
      });

      it('should handle empty rules array', () => {
        const result = generateCompletionVerificationPrompt(mockDeploymentTasks, []);

        expect(result).toContain('Task 1: Database migration');
        expect(result).not.toContain('Rule 1:');
      });

      it('should handle undefined actual outcomes', () => {
        const result = generateCompletionVerificationPrompt(
          mockDeploymentTasks,
          mockOutcomeRules,
          undefined
        );

        expect(result).toContain('Deployment Completion Verification');
        expect(result).not.toContain('Actual Outcomes');
      });

      it('should handle empty actual outcomes array', () => {
        const result = generateCompletionVerificationPrompt(
          mockDeploymentTasks,
          mockOutcomeRules,
          []
        );

        expect(result).toContain('Actual Outcomes');
        expect(result).not.toContain('Outcome 1:');
      });

      it('should handle tasks with empty verification criteria', () => {
        const taskWithEmptyCriteria = [{
          taskId: 'task-empty',
          taskName: 'Empty criteria task',
          verificationCriteria: [],
          expectedOutcome: 'Some outcome',
          status: 'completed'
        }];

        const result = generateCompletionVerificationPrompt(taskWithEmptyCriteria, mockOutcomeRules);

        expect(result).toContain('Empty criteria task');
        expect(result).toContain('Some outcome');
      });
    });
  });

  describe('integration and error handling', () => {
    it('should handle null and undefined inputs gracefully', () => {
      expect(() => generateDeploymentTaskIdentificationPrompt([])).not.toThrow();
      expect(() => generateCiCdAnalysisPrompt('')).not.toThrow();
      expect(() => generateDeploymentProgressCalculationPrompt([])).not.toThrow();
      expect(() => generateCompletionVerificationPrompt([], [])).not.toThrow();
    });

    it('should handle special characters and unicode in all functions', () => {
      const unicodeContent = 'Content with unicode: 🚀 ✅ 🔧 📊 中文 العربية';
      const unicodeAdr = [{
        id: 'unicode-test',
        title: 'Unicode Test',
        content: unicodeContent,
        status: 'accepted'
      }];

      const result = generateDeploymentTaskIdentificationPrompt(unicodeAdr);
      expect(result).toContain(unicodeContent);
    });

    it('should maintain consistent JSON structure across all functions', () => {
      const results = [
        generateDeploymentTaskIdentificationPrompt([]),
        generateCiCdAnalysisPrompt(''),
        generateDeploymentProgressCalculationPrompt([]),
        generateCompletionVerificationPrompt([], [])
      ];

      results.forEach(result => {
        expect(result).toContain('```json');
        expect(result).toContain('```');
        expect(result).toMatch(/\{[\s\S]*\}/); // Contains JSON-like structure
      });
    });
  });
});
