/**
 * Unit tests for deployment-analysis.ts
 * Tests deployment task identification, CI/CD analysis, progress calculation, and completion verification
 */

import { jest } from '@jest/globals';
import { McpAdrError } from '../../src/types/index.js';

// Pragmatic mocking approach to avoid TypeScript complexity
jest.unstable_mockModule('../../src/utils/adr-discovery.js', () => ({
  discoverAdrsInDirectory: jest.fn(),
}));

jest.unstable_mockModule('../../src/prompts/deployment-analysis-prompts.js', () => ({
  generateCiCdAnalysisPrompt: jest.fn(),
  generateDeploymentProgressCalculationPrompt: jest.fn(),
  generateCompletionVerificationPrompt: jest.fn(),
}));

jest.unstable_mockModule('fs/promises', () => ({
  readFile: jest.fn(),
}));

jest.unstable_mockModule('path', () => ({
  resolve: jest.fn(),
}));

const {
  identifyDeploymentTasks,
  analyzeCiCdStatus,
  calculateDeploymentProgress,
  verifyDeploymentCompletion,
} = await import('../../src/utils/deployment-analysis.js');

const { discoverAdrsInDirectory } = await import('../../src/utils/adr-discovery.js');
const {
  generateCiCdAnalysisPrompt,
  generateDeploymentProgressCalculationPrompt,
  generateCompletionVerificationPrompt,
} = await import('../../src/prompts/deployment-analysis-prompts.js');

describe('deployment-analysis', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('identifyDeploymentTasks', () => {
    it('should identify deployment tasks from ADRs without TODO', async () => {
      const mockDiscoveryResult = {
        adrs: [
          {
            title: 'Use Docker for Containerization',
            filename: 'ADR-001-docker.md',
            status: 'Accepted',
            content: 'We will use Docker containers for deployment consistency.',
            path: '/test/ADR-001-docker.md',
            metadata: { number: 1 },
          },
          {
            title: 'Database Selection',
            filename: 'ADR-002-database.md',
            status: 'Accepted',
            content: 'We will use PostgreSQL as our primary database.',
            path: '/test/ADR-002-database.md',
          },
        ],
        totalAdrs: 2,
        summary: { byStatus: { Accepted: 2 }, byCategory: {} },
        directory: 'docs/adrs',
        recommendations: [],
      };

      (
        discoverAdrsInDirectory as jest.MockedFunction<typeof discoverAdrsInDirectory>
      ).mockResolvedValue(mockDiscoveryResult as any);

      const result = await identifyDeploymentTasks('docs/adrs');

      expect(discoverAdrsInDirectory).toHaveBeenCalledWith('docs/adrs', true, process.cwd());
      expect(result).toHaveProperty('identificationPrompt');
      expect(result).toHaveProperty('instructions');
      expect(result).toHaveProperty('actualData');

      // Verify prompt contains ADR content
      expect(result.identificationPrompt).toContain('Use Docker for Containerization');
      expect(result.identificationPrompt).toContain('Database Selection');
      expect(result.identificationPrompt).toContain('Docker containers for deployment consistency');
      expect(result.identificationPrompt).toContain('PostgreSQL as our primary database');
      expect(result.identificationPrompt).toContain('Discovered ADRs (2 total)');

      // Verify instructions
      expect(result.instructions).toContain('ADRs Found**: 2 files');
      expect(result.instructions).toContain('ADRs with Content**: 2 ADRs');
      expect(result.instructions).toContain('Todo Content**: ❌ Not provided');

      // Verify actual data
      expect(result.actualData.discoveryResult).toEqual(mockDiscoveryResult);
      expect(result.actualData.todoContent).toBe('');
      expect(result.actualData.todoPath).toBeUndefined();
      expect(result.actualData.summary.totalAdrs).toBe(2);
      expect(result.actualData.summary.adrsWithContent).toBe(2);
      expect(result.actualData.summary.todoProvided).toBe(false);
    });

    it('should identify deployment tasks with TODO file', async () => {
      const mockDiscoveryResult = {
        adrs: [
          {
            title: 'Infrastructure Setup',
            filename: 'ADR-003-infra.md',
            status: 'Accepted',
            content: 'Set up AWS infrastructure with ECS and RDS.',
            path: '/test/ADR-003-infra.md',
          },
        ],
        totalAdrs: 1,
        summary: { byStatus: { Accepted: 1 }, byCategory: {} },
        directory: 'docs/adrs',
        recommendations: [],
      };

      const mockTodoContent = `# TODO
- [ ] Set up CI/CD pipeline
- [ ] Configure monitoring
- [ ] Deploy to staging environment`;

      (
        discoverAdrsInDirectory as jest.MockedFunction<typeof discoverAdrsInDirectory>
      ).mockResolvedValue(mockDiscoveryResult as any);

      // Mock fs and path modules
      const fs = await import('fs/promises');
      const path = await import('path');
      (fs.readFile as jest.MockedFunction<typeof fs.readFile>).mockResolvedValue(mockTodoContent);
      (path.resolve as jest.MockedFunction<typeof path.resolve>).mockReturnValue(
        '/full/path/TODO.md'
      );

      const result = await identifyDeploymentTasks('docs/adrs', 'TODO.md');

      expect(result.identificationPrompt).toContain('Infrastructure Setup');
      expect(result.identificationPrompt).toContain('Set up CI/CD pipeline');
      expect(result.identificationPrompt).toContain('Configure monitoring');
      expect(result.identificationPrompt).toContain('TODO File: TODO.md');

      expect(result.instructions).toContain('Todo Content**: ✅ Included');
      expect(result.actualData.todoContent).toBe(mockTodoContent);
      expect(result.actualData.todoPath).toBe('TODO.md');
      expect(result.actualData.summary.todoProvided).toBe(true);
      expect(result.actualData.summary.todoLength).toBe(mockTodoContent.length);
    });

    it('should handle TODO file read error gracefully', async () => {
      const mockDiscoveryResult = {
        adrs: [],
        totalAdrs: 0,
        summary: { byStatus: {}, byCategory: {} },
        directory: 'docs/adrs',
        recommendations: [],
      };

      (
        discoverAdrsInDirectory as jest.MockedFunction<typeof discoverAdrsInDirectory>
      ).mockResolvedValue(mockDiscoveryResult as any);

      const fs = await import('fs/promises');
      const path = await import('path');
      (fs.readFile as jest.MockedFunction<typeof fs.readFile>).mockRejectedValue(
        new Error('File not found')
      );
      (path.resolve as jest.MockedFunction<typeof path.resolve>).mockReturnValue(
        '/full/path/TODO.md'
      );

      const result = await identifyDeploymentTasks('docs/adrs', 'TODO.md');

      expect(result.actualData.todoContent).toContain('[TODO file at TODO.md could not be read]');
      expect(result.identificationPrompt).toContain('[TODO file at TODO.md could not be read]');
    });

    it('should handle no ADRs found scenario', async () => {
      const mockDiscoveryResult = {
        adrs: [],
        totalAdrs: 0,
        summary: { byStatus: {}, byCategory: {} },
        directory: 'empty/adrs',
        recommendations: [],
      };

      (
        discoverAdrsInDirectory as jest.MockedFunction<typeof discoverAdrsInDirectory>
      ).mockResolvedValue(mockDiscoveryResult as any);

      const result = await identifyDeploymentTasks('empty/adrs');

      expect(result.identificationPrompt).toContain('No ADRs found in the specified directory');
      expect(result.identificationPrompt).toContain('Discovered ADRs (0 total)');
      expect(result.instructions).toContain('ADRs Found**: 0 files');
      expect(result.actualData.summary.totalAdrs).toBe(0);
      expect(result.actualData.summary.adrsWithContent).toBe(0);
    });

    it('should use default ADR directory when not specified', async () => {
      const mockDiscoveryResult = {
        adrs: [],
        totalAdrs: 0,
        summary: { byStatus: {}, byCategory: {} },
        directory: 'docs/adrs',
        recommendations: [],
      };

      (
        discoverAdrsInDirectory as jest.MockedFunction<typeof discoverAdrsInDirectory>
      ).mockResolvedValue(mockDiscoveryResult as any);

      await identifyDeploymentTasks();

      expect(discoverAdrsInDirectory).toHaveBeenCalledWith('docs/adrs', true, process.cwd());
    });

    it('should throw McpAdrError on ADR discovery failure', async () => {
      const discoveryError = new Error('Failed to access ADR directory');
      (
        discoverAdrsInDirectory as jest.MockedFunction<typeof discoverAdrsInDirectory>
      ).mockRejectedValue(discoveryError);

      await expect(identifyDeploymentTasks()).rejects.toThrow(McpAdrError);
      await expect(identifyDeploymentTasks()).rejects.toThrow(
        'Failed to identify deployment tasks: Failed to access ADR directory'
      );
    });

    it('should handle non-Error exceptions', async () => {
      (
        discoverAdrsInDirectory as jest.MockedFunction<typeof discoverAdrsInDirectory>
      ).mockRejectedValue('String error');

      await expect(identifyDeploymentTasks()).rejects.toThrow(McpAdrError);
      await expect(identifyDeploymentTasks()).rejects.toThrow(
        'Failed to identify deployment tasks: String error'
      );
    });
  });

  describe('analyzeCiCdStatus', () => {
    it('should analyze CI/CD status with logs and config', async () => {
      const mockAnalysisPrompt = 'Generated CI/CD analysis prompt';
      const mockCicdLogs = 'Build started\nTests passed\nDeployment successful';
      const mockPipelineConfig = 'pipeline: { stages: [build, test, deploy] }';
      const mockDeploymentTasks = [
        {
          taskId: 'task-1',
          taskName: 'Build Application',
          category: 'cicd' as const,
          verificationCriteria: ['Build succeeds', 'No compilation errors'],
        },
      ];

      (
        generateCiCdAnalysisPrompt as jest.MockedFunction<typeof generateCiCdAnalysisPrompt>
      ).mockReturnValue(mockAnalysisPrompt);

      const result = await analyzeCiCdStatus(
        mockCicdLogs,
        mockPipelineConfig,
        mockDeploymentTasks as any
      );

      expect(generateCiCdAnalysisPrompt).toHaveBeenCalledWith(mockCicdLogs, mockPipelineConfig, [
        {
          taskId: 'task-1',
          taskName: 'Build Application',
          category: 'cicd',
          verificationCriteria: ['Build succeeds', 'No compilation errors'],
        },
      ]);

      expect(result).toHaveProperty('analysisPrompt', mockAnalysisPrompt);
      expect(result).toHaveProperty('instructions');
      expect(result.instructions).toContain('CI/CD Logs**: 48 characters of log data');
      expect(result.instructions).toContain('Pipeline Config**: Included');
      expect(result.instructions).toContain('Deployment Tasks**: 1 tasks for context');
    });

    it('should analyze CI/CD status without optional parameters', async () => {
      const mockAnalysisPrompt = 'Basic CI/CD analysis prompt';
      const mockCicdLogs = 'Basic build log';

      (
        generateCiCdAnalysisPrompt as jest.MockedFunction<typeof generateCiCdAnalysisPrompt>
      ).mockReturnValue(mockAnalysisPrompt);

      const result = await analyzeCiCdStatus(mockCicdLogs);

      expect(generateCiCdAnalysisPrompt).toHaveBeenCalledWith(mockCicdLogs, undefined, undefined);
      expect(result.instructions).toContain('Pipeline Config**: Not provided');
      expect(result.instructions).toContain('Deployment Tasks**: 0 tasks for context');
    });

    it('should handle empty deployment tasks array', async () => {
      const mockAnalysisPrompt = 'Empty tasks analysis prompt';
      const mockCicdLogs = 'Log content';

      (
        generateCiCdAnalysisPrompt as jest.MockedFunction<typeof generateCiCdAnalysisPrompt>
      ).mockReturnValue(mockAnalysisPrompt);

      const result = await analyzeCiCdStatus(mockCicdLogs, undefined, []);

      expect(generateCiCdAnalysisPrompt).toHaveBeenCalledWith(mockCicdLogs, undefined, []);
      expect(result.instructions).toContain('Deployment Tasks**: 0 tasks for context');
    });

    it('should throw McpAdrError on prompt generation failure', async () => {
      const promptError = new Error('Failed to generate prompt');
      (
        generateCiCdAnalysisPrompt as jest.MockedFunction<typeof generateCiCdAnalysisPrompt>
      ).mockImplementation(() => {
        throw promptError;
      });

      await expect(analyzeCiCdStatus('logs')).rejects.toThrow(McpAdrError);
      await expect(analyzeCiCdStatus('logs')).rejects.toThrow(
        'Failed to analyze CI/CD status: Failed to generate prompt'
      );
    });
  });

  describe('calculateDeploymentProgress', () => {
    it('should calculate deployment progress with all parameters', async () => {
      const mockProgressPrompt = 'Generated progress calculation prompt';
      const mockDeploymentTasks = [
        {
          taskId: 'task-1',
          taskName: 'Database Setup',
          status: 'completed' as const,
          progress: 100,
          category: 'infrastructure' as const,
          priority: 'high' as const,
          description: 'Set up database',
          verificationCriteria: ['DB accessible'],
          expectedOutcome: 'Database ready',
        },
        {
          taskId: 'task-2',
          taskName: 'App Deployment',
          status: 'in_progress' as const,
          progress: 50,
          category: 'application' as const,
          priority: 'critical' as const,
          description: 'Deploy application',
          verificationCriteria: ['App running'],
          expectedOutcome: 'App deployed',
        },
      ];
      const mockCicdStatus = { status: 'success', stage: 'deploy' };
      const mockEnvironmentStatus = { health: 'healthy' };

      (
        generateDeploymentProgressCalculationPrompt as jest.MockedFunction<
          typeof generateDeploymentProgressCalculationPrompt
        >
      ).mockReturnValue(mockProgressPrompt);

      const result = await calculateDeploymentProgress(
        mockDeploymentTasks,
        mockCicdStatus,
        mockEnvironmentStatus
      );

      expect(generateDeploymentProgressCalculationPrompt).toHaveBeenCalledWith(
        [
          {
            taskId: 'task-1',
            taskName: 'Database Setup',
            status: 'completed',
            progress: 100,
            category: 'infrastructure',
            priority: 'high',
          },
          {
            taskId: 'task-2',
            taskName: 'App Deployment',
            status: 'in_progress',
            progress: 50,
            category: 'application',
            priority: 'critical',
          },
        ],
        mockCicdStatus,
        mockEnvironmentStatus
      );

      expect(result).toHaveProperty('progressPrompt', mockProgressPrompt);
      expect(result).toHaveProperty('instructions');
      expect(result.instructions).toContain('Deployment Tasks**: 2 tasks');
      expect(result.instructions).toContain('Task Categories**: infrastructure, application');
      expect(result.instructions).toContain('CI/CD Status**: Included');
      expect(result.instructions).toContain('Environment Status**: Included');
    });

    it('should calculate progress without optional status parameters', async () => {
      const mockProgressPrompt = 'Basic progress prompt';
      const mockDeploymentTasks = [
        {
          taskId: 'task-1',
          taskName: 'Basic Task',
          status: 'not_started' as const,
          progress: 0,
          category: 'operational' as const,
          priority: 'low' as const,
          description: 'Basic task',
          verificationCriteria: ['Task done'],
          expectedOutcome: 'Task complete',
        },
      ];

      (
        generateDeploymentProgressCalculationPrompt as jest.MockedFunction<
          typeof generateDeploymentProgressCalculationPrompt
        >
      ).mockReturnValue(mockProgressPrompt);

      const result = await calculateDeploymentProgress(mockDeploymentTasks);

      expect(generateDeploymentProgressCalculationPrompt).toHaveBeenCalledWith(
        [
          {
            taskId: 'task-1',
            taskName: 'Basic Task',
            status: 'not_started',
            progress: 0,
            category: 'operational',
            priority: 'low',
          },
        ],
        undefined,
        undefined
      );

      expect(result.instructions).toContain('CI/CD Status**: Not provided');
      expect(result.instructions).toContain('Environment Status**: Not provided');
    });

    it('should handle empty deployment tasks', async () => {
      const mockProgressPrompt = 'Empty tasks progress prompt';

      (
        generateDeploymentProgressCalculationPrompt as jest.MockedFunction<
          typeof generateDeploymentProgressCalculationPrompt
        >
      ).mockReturnValue(mockProgressPrompt);

      const result = await calculateDeploymentProgress([]);

      expect(result.instructions).toContain('Deployment Tasks**: 0 tasks');
      expect(result.instructions).toContain('Task Categories**: ');
    });

    it('should throw McpAdrError on progress calculation failure', async () => {
      const calculationError = new Error('Progress calculation failed');
      (
        generateDeploymentProgressCalculationPrompt as jest.MockedFunction<
          typeof generateDeploymentProgressCalculationPrompt
        >
      ).mockImplementation(() => {
        throw calculationError;
      });

      const mockTasks = [
        {
          taskId: 'task-1',
          taskName: 'Test Task',
          status: 'completed' as const,
          progress: 100,
          category: 'application' as const,
          priority: 'medium' as const,
          description: 'Test',
          verificationCriteria: ['Test'],
          expectedOutcome: 'Test',
        },
      ];

      await expect(calculateDeploymentProgress(mockTasks)).rejects.toThrow(McpAdrError);
      await expect(calculateDeploymentProgress(mockTasks)).rejects.toThrow(
        'Failed to calculate deployment progress: Progress calculation failed'
      );
    });
  });

  describe('verifyDeploymentCompletion', () => {
    it('should verify deployment completion with all parameters', async () => {
      const mockVerificationPrompt = 'Generated completion verification prompt';
      const mockDeploymentTasks = [
        {
          taskId: 'task-1',
          taskName: 'Final Verification',
          status: 'completed' as const,
          progress: 100,
          category: 'operational' as const,
          priority: 'critical' as const,
          description: 'Final checks',
          verificationCriteria: ['All systems operational', 'Health checks pass'],
          expectedOutcome: 'System fully operational',
        },
      ];
      const mockOutcomeRules = [
        {
          ruleId: 'rule-1',
          description: 'All critical tasks must be completed',
          criteria: ['status === completed', 'progress === 100'],
          verificationMethod: 'automated',
        },
      ];
      const mockActualOutcomes = [
        {
          taskId: 'task-1',
          outcome: 'Task completed successfully',
          evidence: ['Health check logs', 'System metrics'],
          timestamp: '2024-01-01T12:00:00Z',
        },
      ];

      (
        generateCompletionVerificationPrompt as jest.MockedFunction<
          typeof generateCompletionVerificationPrompt
        >
      ).mockReturnValue(mockVerificationPrompt);

      const result = await verifyDeploymentCompletion(
        mockDeploymentTasks,
        mockOutcomeRules,
        mockActualOutcomes
      );

      expect(generateCompletionVerificationPrompt).toHaveBeenCalledWith(
        [
          {
            taskId: 'task-1',
            taskName: 'Final Verification',
            verificationCriteria: ['All systems operational', 'Health checks pass'],
            expectedOutcome: 'System fully operational',
            status: 'completed',
          },
        ],
        mockOutcomeRules,
        mockActualOutcomes
      );

      expect(result).toHaveProperty('verificationPrompt', mockVerificationPrompt);
      expect(result).toHaveProperty('instructions');
      expect(result.instructions).toContain('Deployment Tasks**: 1 tasks to verify');
      expect(result.instructions).toContain('Outcome Rules**: 1 rules to validate');
      expect(result.instructions).toContain('Actual Outcomes**: 1 outcomes provided');
    });

    it('should verify completion without actual outcomes', async () => {
      const mockVerificationPrompt = 'Basic verification prompt';
      const mockDeploymentTasks = [
        {
          taskId: 'task-1',
          taskName: 'Basic Task',
          status: 'completed' as const,
          progress: 100,
          category: 'application' as const,
          priority: 'medium' as const,
          description: 'Basic task',
          verificationCriteria: ['Task done'],
          expectedOutcome: 'Task complete',
        },
      ];
      const mockOutcomeRules = [
        {
          ruleId: 'rule-1',
          description: 'Basic completion rule',
          criteria: ['status === completed'],
          verificationMethod: 'manual',
        },
      ];

      (
        generateCompletionVerificationPrompt as jest.MockedFunction<
          typeof generateCompletionVerificationPrompt
        >
      ).mockReturnValue(mockVerificationPrompt);

      const result = await verifyDeploymentCompletion(mockDeploymentTasks, mockOutcomeRules);

      expect(generateCompletionVerificationPrompt).toHaveBeenCalledWith(
        [
          {
            taskId: 'task-1',
            taskName: 'Basic Task',
            verificationCriteria: ['Task done'],
            expectedOutcome: 'Task complete',
            status: 'completed',
          },
        ],
        mockOutcomeRules,
        undefined
      );

      expect(result.instructions).toContain('Actual Outcomes**: 0 outcomes provided');
    });

    it('should handle multiple tasks and rules', async () => {
      const mockVerificationPrompt = 'Multi-task verification prompt';
      const mockDeploymentTasks = [
        {
          taskId: 'task-1',
          taskName: 'Task 1',
          status: 'completed' as const,
          progress: 100,
          category: 'infrastructure' as const,
          priority: 'high' as const,
          description: 'Task 1',
          verificationCriteria: ['Criteria 1'],
          expectedOutcome: 'Outcome 1',
        },
        {
          taskId: 'task-2',
          taskName: 'Task 2',
          status: 'completed' as const,
          progress: 100,
          category: 'application' as const,
          priority: 'medium' as const,
          description: 'Task 2',
          verificationCriteria: ['Criteria 2'],
          expectedOutcome: 'Outcome 2',
        },
      ];
      const mockOutcomeRules = [
        {
          ruleId: 'rule-1',
          description: 'Rule 1',
          criteria: ['Criteria 1'],
          verificationMethod: 'automated',
        },
        {
          ruleId: 'rule-2',
          description: 'Rule 2',
          criteria: ['Criteria 2'],
          verificationMethod: 'manual',
        },
      ];

      (
        generateCompletionVerificationPrompt as jest.MockedFunction<
          typeof generateCompletionVerificationPrompt
        >
      ).mockReturnValue(mockVerificationPrompt);

      const result = await verifyDeploymentCompletion(mockDeploymentTasks, mockOutcomeRules);

      expect(result.instructions).toContain('Deployment Tasks**: 2 tasks to verify');
      expect(result.instructions).toContain('Outcome Rules**: 2 rules to validate');
    });

    it('should throw McpAdrError on verification failure', async () => {
      const verificationError = new Error('Verification failed');
      (
        generateCompletionVerificationPrompt as jest.MockedFunction<
          typeof generateCompletionVerificationPrompt
        >
      ).mockImplementation(() => {
        throw verificationError;
      });

      const mockTasks = [
        {
          taskId: 'task-1',
          taskName: 'Test Task',
          status: 'completed' as const,
          progress: 100,
          category: 'application' as const,
          priority: 'medium' as const,
          description: 'Test',
          verificationCriteria: ['Test'],
          expectedOutcome: 'Test',
        },
      ];
      const mockRules = [
        {
          ruleId: 'rule-1',
          description: 'Test rule',
          criteria: ['Test'],
          verificationMethod: 'test',
        },
      ];

      await expect(verifyDeploymentCompletion(mockTasks, mockRules)).rejects.toThrow(McpAdrError);
      await expect(verifyDeploymentCompletion(mockTasks, mockRules)).rejects.toThrow(
        'Failed to verify deployment completion: Verification failed'
      );
    });
  });
});
