/**
 * Unit tests for deployment-analysis-tool.ts
 * Tests the analyzeDeploymentProgress function with comprehensive scenarios
 */

import { describe, it, expect, _beforeEach, _afterEach, vi, MockedFunction } from 'vitest';
import { McpAdrError } from '../../src/types/index.js';

// Pragmatic mocking approach to avoid TypeScript complexity
vi.mock('../../src/utils/deployment-analysis.js', () => ({
  identifyDeploymentTasks: vi.fn(),
  analyzeCiCdStatus: vi.fn(),
  calculateDeploymentProgress: vi.fn(),
  verifyDeploymentCompletion: vi.fn(),
}));

vi.mock('../../src/utils/prompt-execution.js', () => ({
  executePromptWithFallback: vi.fn(),
  formatMCPResponse: vi.fn(),
}));

vi.mock('../../src/utils/research-orchestrator.js', () => ({
  ResearchOrchestrator: vi.fn().mockImplementation(() => ({
    answerResearchQuestion: vi.fn().mockResolvedValue({
      answer: 'Mock environment analysis',
      confidence: 0.85,
      sources: [
        {
          type: 'environment',
          data: {
            capabilities: ['Docker', 'Kubernetes', 'GitHub Actions'],
          },
        },
      ],
      needsWebSearch: false,
    }),
  })),
}));

const { analyzeDeploymentProgress } = await import('../../src/tools/deployment-analysis-tool.js');
const {
  identifyDeploymentTasks,
  analyzeCiCdStatus,
  calculateDeploymentProgress,
  verifyDeploymentCompletion,
} = await import('../../src/utils/deployment-analysis.js');
const { executePromptWithFallback, formatMCPResponse } =
  await import('../../src/utils/prompt-execution.js');

describe('deployment-analysis-tool', () => {
  describe('analyzeDeploymentProgress', () => {
    beforeEach(() => {
      vi.clearAllMocks();
    });

    describe('tasks analysis type', () => {
      it('should identify deployment tasks with AI execution', async () => {
        const mockTaskResult = {
          identificationPrompt: 'Mock identification prompt for deployment tasks',
          instructions: 'Mock instructions for task identification',
        };

        const mockExecutionResult = {
          isAIGenerated: true,
          content: 'AI-generated deployment task analysis results',
          metadata: { confidence: 0.95 },
        };

        const mockFormattedResponse = {
          content: [
            {
              type: 'text',
              text: 'Formatted deployment task identification results',
            },
          ],
        };

        (
          identifyDeploymentTasks as MockedFunction<typeof identifyDeploymentTasks>
        ).mockResolvedValue(mockTaskResult);
        (
          executePromptWithFallback as MockedFunction<typeof executePromptWithFallback>
        ).mockResolvedValue(mockExecutionResult);
        (formatMCPResponse as MockedFunction<typeof formatMCPResponse>).mockReturnValue(
          mockFormattedResponse
        );

        const result = await analyzeDeploymentProgress({
          analysisType: 'tasks',
          adrDirectory: 'docs/adrs',
          todoPath: 'TODO.md',
        });

        expect(identifyDeploymentTasks).toHaveBeenCalledWith('docs/adrs', 'TODO.md');
        expect(executePromptWithFallback).toHaveBeenCalledWith(
          mockTaskResult.identificationPrompt,
          mockTaskResult.instructions,
          expect.objectContaining({
            temperature: 0.1,
            maxTokens: 5000,
            responseFormat: 'text',
          })
        );
        expect(formatMCPResponse).toHaveBeenCalled();
        expect(result).toEqual(mockFormattedResponse);
      });

      it('should fallback to prompt-only mode when AI execution fails', async () => {
        const mockTaskResult = {
          identificationPrompt: 'Mock identification prompt for deployment tasks',
          instructions: 'Mock instructions for task identification',
        };

        const mockExecutionResult = {
          isAIGenerated: false,
          content: 'Fallback prompt content',
        };

        (
          identifyDeploymentTasks as MockedFunction<typeof identifyDeploymentTasks>
        ).mockResolvedValue(mockTaskResult);
        (
          executePromptWithFallback as MockedFunction<typeof executePromptWithFallback>
        ).mockResolvedValue(mockExecutionResult);

        const result = await analyzeDeploymentProgress({
          analysisType: 'tasks',
        });

        expect(result).toHaveProperty('content');
        expect(Array.isArray(result.content)).toBe(true);
        expect(result.content[0]).toHaveProperty('type', 'text');
        expect(result.content[0].text).toContain('Deployment Task Identification');
        expect(result.content[0].text).toContain(mockTaskResult.instructions);
        expect(result.content[0].text).toContain(mockTaskResult.identificationPrompt);
      });

      it('should use default parameters for tasks analysis', async () => {
        const mockTaskResult = {
          identificationPrompt: 'Default prompt',
          instructions: 'Default instructions',
        };

        const mockExecutionResult = {
          isAIGenerated: false,
          content: 'Default content',
        };

        (
          identifyDeploymentTasks as MockedFunction<typeof identifyDeploymentTasks>
        ).mockResolvedValue(mockTaskResult);
        (
          executePromptWithFallback as MockedFunction<typeof executePromptWithFallback>
        ).mockResolvedValue(mockExecutionResult);

        await analyzeDeploymentProgress({ analysisType: 'tasks' });

        expect(identifyDeploymentTasks).toHaveBeenCalledWith('docs/adrs', undefined);
      });
    });

    describe('cicd analysis type', () => {
      it('should analyze CI/CD status with required logs', async () => {
        const mockCicdResult = {
          analysisPrompt: 'Mock CI/CD analysis prompt',
          instructions: 'Mock CI/CD analysis instructions',
        };

        const mockDeploymentTasks = [
          {
            taskId: 'deploy-001',
            taskName: 'Deploy Application',
            status: 'in-progress',
            progress: 75,
            category: 'deployment',
            priority: 'high',
            verificationCriteria: ['Health check passes'],
            expectedOutcome: 'Application successfully deployed',
          },
        ];

        (analyzeCiCdStatus as MockedFunction<typeof analyzeCiCdStatus>).mockResolvedValue(
          mockCicdResult
        );

        const result = await analyzeDeploymentProgress({
          analysisType: 'cicd',
          cicdLogs: 'Mock CI/CD logs content',
          pipelineConfig: 'Mock pipeline configuration',
          deploymentTasks: mockDeploymentTasks,
        });

        expect(analyzeCiCdStatus).toHaveBeenCalledWith(
          'Mock CI/CD logs content',
          'Mock pipeline configuration',
          mockDeploymentTasks
        );
        expect(result.content[0].text).toContain('CI/CD Pipeline Analysis');
        expect(result.content[0].text).toContain(mockCicdResult.instructions);
        expect(result.content[0].text).toContain(mockCicdResult.analysisPrompt);
        expect(result.content[0].text).toContain('Expected Output');
        expect(result.content[0].text).toContain('Pipeline Optimization');
      });

      it('should throw error when CI/CD logs are missing', async () => {
        await expect(
          analyzeDeploymentProgress({
            analysisType: 'cicd',
          })
        ).rejects.toThrow(McpAdrError);
        await expect(
          analyzeDeploymentProgress({
            analysisType: 'cicd',
          })
        ).rejects.toThrow('CI/CD logs are required for pipeline analysis');
      });

      it('should handle CI/CD analysis without optional parameters', async () => {
        const mockCicdResult = {
          analysisPrompt: 'Basic CI/CD analysis prompt',
          instructions: 'Basic CI/CD analysis instructions',
        };

        (analyzeCiCdStatus as MockedFunction<typeof analyzeCiCdStatus>).mockResolvedValue(
          mockCicdResult
        );

        const result = await analyzeDeploymentProgress({
          analysisType: 'cicd',
          cicdLogs: 'Basic CI/CD logs',
        });

        expect(analyzeCiCdStatus).toHaveBeenCalledWith('Basic CI/CD logs', undefined, undefined);
        expect(result.content[0].text).toContain('CI/CD Pipeline Analysis');
      });
    });

    describe('progress analysis type', () => {
      it('should calculate deployment progress with required tasks', async () => {
        const mockProgressResult = {
          progressPrompt: 'Mock progress calculation prompt',
          instructions: 'Mock progress calculation instructions',
        };

        const mockDeploymentTasks = [
          {
            taskId: 'task-001',
            taskName: 'Database Migration',
            status: 'completed',
            progress: 100,
            category: 'database',
            priority: 'high',
            verificationCriteria: ['Migration successful'],
            expectedOutcome: 'Database schema updated',
          },
        ];

        const mockCicdStatus = { status: 'success', stage: 'deployment' };
        const mockEnvironmentStatus = { health: 'healthy', services: ['api', 'db'] };

        (
          calculateDeploymentProgress as MockedFunction<typeof calculateDeploymentProgress>
        ).mockResolvedValue(mockProgressResult);

        const result = await analyzeDeploymentProgress({
          analysisType: 'progress',
          deploymentTasks: mockDeploymentTasks,
          cicdStatus: mockCicdStatus,
          environmentStatus: mockEnvironmentStatus,
        });

        expect(calculateDeploymentProgress).toHaveBeenCalledWith(
          mockDeploymentTasks,
          mockCicdStatus,
          mockEnvironmentStatus
        );
        expect(result.content[0].text).toContain('Deployment Progress Calculation');
        expect(result.content[0].text).toContain(mockProgressResult.instructions);
        expect(result.content[0].text).toContain(mockProgressResult.progressPrompt);
        expect(result.content[0].text).toContain('Expected Output');
        expect(result.content[0].text).toContain('Progress Management');
      });

      it('should throw error when deployment tasks are missing', async () => {
        await expect(
          analyzeDeploymentProgress({
            analysisType: 'progress',
          })
        ).rejects.toThrow(McpAdrError);
        await expect(
          analyzeDeploymentProgress({
            analysisType: 'progress',
          })
        ).rejects.toThrow('Deployment tasks are required for progress calculation');
      });

      it('should handle progress analysis without optional status parameters', async () => {
        const mockProgressResult = {
          progressPrompt: 'Basic progress prompt',
          instructions: 'Basic progress instructions',
        };

        const mockDeploymentTasks = [
          {
            taskId: 'basic-task',
            taskName: 'Basic Task',
            status: 'pending',
            progress: 0,
            category: 'setup',
            priority: 'medium',
            verificationCriteria: ['Task completed'],
            expectedOutcome: 'Setup complete',
          },
        ];

        (
          calculateDeploymentProgress as MockedFunction<typeof calculateDeploymentProgress>
        ).mockResolvedValue(mockProgressResult);

        const result = await analyzeDeploymentProgress({
          analysisType: 'progress',
          deploymentTasks: mockDeploymentTasks,
        });

        expect(calculateDeploymentProgress).toHaveBeenCalledWith(
          mockDeploymentTasks,
          undefined,
          undefined
        );
        expect(result.content[0].text).toContain('Deployment Progress Calculation');
      });
    });

    describe('completion analysis type', () => {
      it('should verify deployment completion with required parameters', async () => {
        const mockCompletionResult = {
          verificationPrompt: 'Mock completion verification prompt',
          instructions: 'Mock completion verification instructions',
        };

        const mockDeploymentTasks = [
          {
            taskId: 'complete-001',
            taskName: 'Final Verification',
            status: 'completed',
            progress: 100,
            category: 'verification',
            priority: 'critical',
            verificationCriteria: ['All tests pass', 'Health checks green'],
            expectedOutcome: 'System fully operational',
          },
        ];

        const mockOutcomeRules = [
          {
            ruleId: 'rule-001',
            description: 'All critical tasks must be completed',
            criteria: ['status === completed', 'progress === 100'],
            verificationMethod: 'automated',
          },
        ];

        const mockActualOutcomes = [
          {
            taskId: 'complete-001',
            outcome: 'Task completed successfully',
            evidence: ['Test results', 'Health check logs'],
            timestamp: '2024-01-01T12:00:00Z',
          },
        ];

        (
          verifyDeploymentCompletion as MockedFunction<typeof verifyDeploymentCompletion>
        ).mockResolvedValue(mockCompletionResult);

        const result = await analyzeDeploymentProgress({
          analysisType: 'completion',
          deploymentTasks: mockDeploymentTasks,
          outcomeRules: mockOutcomeRules,
          actualOutcomes: mockActualOutcomes,
        });

        expect(verifyDeploymentCompletion).toHaveBeenCalledWith(
          mockDeploymentTasks,
          mockOutcomeRules,
          mockActualOutcomes
        );
        expect(result.content[0].text).toContain('Deployment Completion Verification');
        expect(result.content[0].text).toContain(mockCompletionResult.instructions);
        expect(result.content[0].text).toContain(mockCompletionResult.verificationPrompt);
        expect(result.content[0].text).toContain('Expected Output');
        expect(result.content[0].text).toContain('Completion Management');
      });

      it('should throw error when deployment tasks are missing', async () => {
        const mockOutcomeRules = [
          {
            ruleId: 'rule-001',
            description: 'Test rule',
            criteria: ['test'],
            verificationMethod: 'manual',
          },
        ];

        await expect(
          analyzeDeploymentProgress({
            analysisType: 'completion',
            outcomeRules: mockOutcomeRules,
          })
        ).rejects.toThrow(McpAdrError);
        await expect(
          analyzeDeploymentProgress({
            analysisType: 'completion',
            outcomeRules: mockOutcomeRules,
          })
        ).rejects.toThrow(
          'Deployment tasks and outcome rules are required for completion verification'
        );
      });

      it('should throw error when outcome rules are missing', async () => {
        const mockDeploymentTasks = [
          {
            taskId: 'task-001',
            taskName: 'Test Task',
            status: 'completed',
            progress: 100,
            category: 'test',
            priority: 'medium',
            verificationCriteria: ['test'],
            expectedOutcome: 'test complete',
          },
        ];

        await expect(
          analyzeDeploymentProgress({
            analysisType: 'completion',
            deploymentTasks: mockDeploymentTasks,
          })
        ).rejects.toThrow(McpAdrError);
        await expect(
          analyzeDeploymentProgress({
            analysisType: 'completion',
            deploymentTasks: mockDeploymentTasks,
          })
        ).rejects.toThrow(
          'Deployment tasks and outcome rules are required for completion verification'
        );
      });

      it('should handle completion verification without actual outcomes', async () => {
        const mockCompletionResult = {
          verificationPrompt: 'Basic completion prompt',
          instructions: 'Basic completion instructions',
        };

        const mockDeploymentTasks = [
          {
            taskId: 'basic-complete',
            taskName: 'Basic Completion',
            status: 'completed',
            progress: 100,
            category: 'basic',
            priority: 'low',
            verificationCriteria: ['basic check'],
            expectedOutcome: 'basic complete',
          },
        ];

        const mockOutcomeRules = [
          {
            ruleId: 'basic-rule',
            description: 'Basic rule',
            criteria: ['basic criteria'],
            verificationMethod: 'basic',
          },
        ];

        (
          verifyDeploymentCompletion as MockedFunction<typeof verifyDeploymentCompletion>
        ).mockResolvedValue(mockCompletionResult);

        const result = await analyzeDeploymentProgress({
          analysisType: 'completion',
          deploymentTasks: mockDeploymentTasks,
          outcomeRules: mockOutcomeRules,
        });

        expect(verifyDeploymentCompletion).toHaveBeenCalledWith(
          mockDeploymentTasks,
          mockOutcomeRules,
          undefined
        );
        expect(result.content[0].text).toContain('Deployment Completion Verification');
      });
    });

    describe('comprehensive analysis type', () => {
      it('should provide comprehensive deployment analysis workflow', async () => {
        const mockTaskResult = {
          identificationPrompt: 'Comprehensive task identification prompt',
          instructions: 'Comprehensive task identification instructions',
        };

        (
          identifyDeploymentTasks as MockedFunction<typeof identifyDeploymentTasks>
        ).mockResolvedValue(mockTaskResult);

        const result = await analyzeDeploymentProgress({
          analysisType: 'comprehensive',
          adrDirectory: 'custom/adrs',
          todoPath: 'custom/TODO.md',
        });

        expect(identifyDeploymentTasks).toHaveBeenCalledWith('custom/adrs', 'custom/TODO.md');
        expect(result.content[0].text).toContain('Comprehensive Deployment Analysis');
        expect(result.content[0].text).toContain('Deployment Analysis Workflow');
        expect(result.content[0].text).toContain('1. **Task Identification** (First Step)');
        expect(result.content[0].text).toContain('2. **CI/CD Analysis** (Second Step)');
        expect(result.content[0].text).toContain('3. **Progress Calculation** (Third Step)');
        expect(result.content[0].text).toContain('4. **Completion Verification** (Fourth Step)');
        expect(result.content[0].text).toContain(mockTaskResult.instructions);
        expect(result.content[0].text).toContain(mockTaskResult.identificationPrompt);
        expect(result.content[0].text).toContain('Expected Outcomes');
        expect(result.content[0].text).toContain('Deployment Excellence');
        expect(result.content[0].text).toContain('Integration with AI Agents');
      }, 30000);

      it('should use default parameters for comprehensive analysis', async () => {
        const mockTaskResult = {
          identificationPrompt: 'Default comprehensive prompt',
          instructions: 'Default comprehensive instructions',
        };

        (
          identifyDeploymentTasks as MockedFunction<typeof identifyDeploymentTasks>
        ).mockResolvedValue(mockTaskResult);

        const result = await analyzeDeploymentProgress({
          analysisType: 'comprehensive',
        });

        expect(identifyDeploymentTasks).toHaveBeenCalledWith('docs/adrs', undefined);
        expect(result.content[0].text).toContain('Comprehensive Deployment Analysis');
      });

      it('should include all workflow steps in comprehensive analysis', async () => {
        const mockTaskResult = {
          identificationPrompt: 'Workflow prompt',
          instructions: 'Workflow instructions',
        };

        (
          identifyDeploymentTasks as MockedFunction<typeof identifyDeploymentTasks>
        ).mockResolvedValue(mockTaskResult);

        const result = await analyzeDeploymentProgress({
          analysisType: 'comprehensive',
        });

        const content = result.content[0].text;

        // Verify all workflow steps are included
        expect(content).toContain('"analysisType": "cicd"');
        expect(content).toContain('"analysisType": "progress"');
        expect(content).toContain('"analysisType": "completion"');
        expect(content).toContain('Complete Task Inventory');
        expect(content).toContain('Pipeline Health Assessment');
        expect(content).toContain('Accurate Progress Tracking');
        expect(content).toContain('Completion Verification');
        expect(content).toContain('Automated Monitoring');
        expect(content).toContain('Intelligent Alerting');
        expect(content).toContain('Predictive Analysis');
      });
    });

    describe('default analysis type', () => {
      it('should default to comprehensive analysis when no type specified', async () => {
        const mockTaskResult = {
          identificationPrompt: 'Default analysis prompt',
          instructions: 'Default analysis instructions',
        };

        (
          identifyDeploymentTasks as MockedFunction<typeof identifyDeploymentTasks>
        ).mockResolvedValue(mockTaskResult);

        const result = await analyzeDeploymentProgress({});

        expect(identifyDeploymentTasks).toHaveBeenCalledWith('docs/adrs', undefined);
        expect(result.content[0].text).toContain('Comprehensive Deployment Analysis');
      });
    });

    describe('error handling', () => {
      it('should throw error for unknown analysis type', async () => {
        await expect(
          analyzeDeploymentProgress({
            analysisType: 'unknown' as any,
          })
        ).rejects.toThrow(McpAdrError);
        await expect(
          analyzeDeploymentProgress({
            analysisType: 'unknown' as any,
          })
        ).rejects.toThrow('Unknown analysis type: unknown');
      });

      it('should handle utility function errors', async () => {
        const utilityError = new Error('Utility function failed');
        (
          identifyDeploymentTasks as MockedFunction<typeof identifyDeploymentTasks>
        ).mockRejectedValue(utilityError);

        await expect(
          analyzeDeploymentProgress({
            analysisType: 'tasks',
          })
        ).rejects.toThrow(McpAdrError);
        await expect(
          analyzeDeploymentProgress({
            analysisType: 'tasks',
          })
        ).rejects.toThrow('Failed to analyze deployment progress: Utility function failed');
      });

      it('should handle non-Error exceptions', async () => {
        (
          identifyDeploymentTasks as MockedFunction<typeof identifyDeploymentTasks>
        ).mockRejectedValue('String error');

        await expect(
          analyzeDeploymentProgress({
            analysisType: 'comprehensive',
          })
        ).rejects.toThrow(McpAdrError);
        await expect(
          analyzeDeploymentProgress({
            analysisType: 'comprehensive',
          })
        ).rejects.toThrow('Failed to analyze deployment progress: String error');
      });

      it('should handle undefined error', async () => {
        (analyzeCiCdStatus as MockedFunction<typeof analyzeCiCdStatus>).mockRejectedValue(
          undefined
        );

        await expect(
          analyzeDeploymentProgress({
            analysisType: 'cicd',
            cicdLogs: 'test logs',
          })
        ).rejects.toThrow(McpAdrError);
        await expect(
          analyzeDeploymentProgress({
            analysisType: 'cicd',
            cicdLogs: 'test logs',
          })
        ).rejects.toThrow('Failed to analyze deployment progress: undefined');
      });
    });

    describe('output structure validation', () => {
      it('should always return proper content structure for all analysis types', async () => {
        const mockResult = {
          identificationPrompt: 'Test prompt',
          instructions: 'Test instructions',
        };

        (
          identifyDeploymentTasks as MockedFunction<typeof identifyDeploymentTasks>
        ).mockResolvedValue(mockResult);

        const analysisTypes = ['tasks', 'comprehensive'] as const;

        for (const analysisType of analysisTypes) {
          const mockExecutionResult = { isAIGenerated: false, content: 'test' };
          (
            executePromptWithFallback as MockedFunction<typeof executePromptWithFallback>
          ).mockResolvedValue(mockExecutionResult);

          const result = await analyzeDeploymentProgress({ analysisType });

          expect(result).toHaveProperty('content');
          expect(Array.isArray(result.content)).toBe(true);
          expect(result.content).toHaveLength(1);
          expect(result.content[0]).toHaveProperty('type', 'text');
          expect(result.content[0]).toHaveProperty('text');
          expect(typeof result.content[0].text).toBe('string');
          expect(result.content[0].text.length).toBeGreaterThan(0);
        }
      });

      it('should include required sections for each analysis type', async () => {
        // Test cicd analysis structure
        const mockCicdResult = {
          analysisPrompt: 'CICD prompt',
          instructions: 'CICD instructions',
        };

        (analyzeCiCdStatus as MockedFunction<typeof analyzeCiCdStatus>).mockResolvedValue(
          mockCicdResult
        );

        const cicdResult = await analyzeDeploymentProgress({
          analysisType: 'cicd',
          cicdLogs: 'test logs',
        });

        expect(cicdResult.content[0].text).toContain('CI/CD Pipeline Analysis');
        expect(cicdResult.content[0].text).toContain('Next Steps');
        expect(cicdResult.content[0].text).toContain('Expected Output');
        expect(cicdResult.content[0].text).toContain('Pipeline Optimization');

        // Test progress analysis structure
        const mockProgressResult = {
          progressPrompt: 'Progress prompt',
          instructions: 'Progress instructions',
        };

        (
          calculateDeploymentProgress as MockedFunction<typeof calculateDeploymentProgress>
        ).mockResolvedValue(mockProgressResult);

        const progressResult = await analyzeDeploymentProgress({
          analysisType: 'progress',
          deploymentTasks: [
            {
              taskId: 'test',
              taskName: 'Test',
              status: 'pending',
              progress: 0,
              category: 'test',
              priority: 'low',
              verificationCriteria: ['test'],
              expectedOutcome: 'test',
            },
          ],
        });

        expect(progressResult.content[0].text).toContain('Deployment Progress Calculation');
        expect(progressResult.content[0].text).toContain('Next Steps');
        expect(progressResult.content[0].text).toContain('Expected Output');
        expect(progressResult.content[0].text).toContain('Progress Management');
      });
    });
  });
});
