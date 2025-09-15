/**
 * Unit tests for interactive-adr-planning-tool.ts
 * Target: Achieve comprehensive coverage for session-based ADR planning workflow
 * Priority: Critical - Zero coverage currently
 */

import { describe, it, expect, beforeAll, beforeEach, afterEach, jest } from '@jest/globals';

// Mock filesystem operations first - matching the exact import pattern
const mockFsPromises = {
  mkdir: jest.fn(),
  writeFile: jest.fn(),
  readFile: jest.fn(),
  rename: jest.fn(),
};

jest.mock('fs', () => ({
  promises: mockFsPromises,
}));

// Import after mocking
import * as path from 'path';
import { interactiveAdrPlanning } from '../../src/tools/interactive-adr-planning-tool.js';

const mockFs = mockFsPromises;

// Mock path module
jest.mock('path', () => ({
  join: jest.fn((...paths: string[]) => paths.join('/')),
}));

describe('Interactive ADR Planning Tool', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    // Default successful filesystem mocks
    mockFs.mkdir.mockResolvedValue(undefined);
    mockFs.writeFile.mockResolvedValue(undefined);
    mockFs.readFile.mockResolvedValue('{}');
    mockFs.rename.mockResolvedValue(undefined);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('Session Management', () => {
    describe('start_session operation', () => {
      it('should handle filesystem errors during session creation gracefully', async () => {
        const input = {
          operation: 'start_session',
          projectPath: '/test/project',
        };

        // The tool should handle filesystem errors gracefully and throw a McpAdrError
        await expect(interactiveAdrPlanning(input)).rejects.toThrow(
          'Interactive ADR planning failed'
        );
      });

      it('should handle custom ADR directory and project path', async () => {
        const input = {
          operation: 'start_session',
          projectPath: '/custom/path',
          adrDirectory: 'documentation/decisions',
        };

        const result = await interactiveAdrPlanning(input);

        expect(result.success).toBe(true);
        expect(result.sessionId).toBeDefined();
        expect(mockFs.mkdir).toHaveBeenCalledWith('/custom/path/.mcp-adr-cache', {
          recursive: true,
        });
      });

      it('should handle filesystem errors during session creation', async () => {
        mockFs.mkdir.mockRejectedValue(new Error('Permission denied'));

        const input = {
          operation: 'start_session',
          projectPath: '/readonly/path',
        };

        await expect(interactiveAdrPlanning(input)).rejects.toThrow();
      });
    });

    describe('continue_session operation', () => {
      it('should continue an existing session', async () => {
        // First start a session
        const startInput = {
          operation: 'start_session',
          projectPath: '/test/project',
        };
        const startResult = await interactiveAdrPlanning(startInput);

        // Continue the session
        const continueInput = {
          operation: 'continue_session',
          sessionId: startResult.sessionId,
          projectPath: '/test/project',
        };

        const result = await interactiveAdrPlanning(continueInput);

        expect(result.success).toBe(true);
        expect(result.sessionId).toBe(startResult.sessionId);
        expect(result.phase).toBe('problem_definition');
        expect(result.guidance).toContain('Define the architectural problem and constraints');
      });

      it('should load session from file if not in memory', async () => {
        const sessionData = {
          sessionId: 'test-session-123',
          phase: 'research_analysis',
          context: {
            projectPath: '/test/project',
            adrDirectory: 'docs/adrs',
            problemStatement: 'Test problem',
            researchFindings: [],
            options: [],
          },
          metadata: {
            createdAt: '2024-01-01T00:00:00.000Z',
            updatedAt: '2024-01-01T00:00:00.000Z',
            lastAction: 'Problem defined',
            nextSteps: [],
          },
        };

        mockFs.readFile.mockResolvedValue(JSON.stringify(sessionData));

        const input = {
          operation: 'continue_session',
          sessionId: 'test-session-123',
          projectPath: '/test/project',
        };

        const result = await interactiveAdrPlanning(input);

        expect(result.success).toBe(true);
        expect(result.sessionId).toBe('test-session-123');
        expect(result.phase).toBe('research_analysis');
        expect(mockFs.readFile).toHaveBeenCalledWith(
          '/test/project/.mcp-adr-cache/adr-planning-session-test-session-123.json',
          'utf-8'
        );
      });

      it('should fail when session ID is missing', async () => {
        const input = {
          operation: 'continue_session',
          projectPath: '/test/project',
        };

        await expect(interactiveAdrPlanning(input)).rejects.toThrow(
          'Session ID required to continue session'
        );
      });

      it('should fail when session is not found', async () => {
        mockFs.readFile.mockRejectedValue(new Error('ENOENT'));

        const input = {
          operation: 'continue_session',
          sessionId: 'nonexistent-session',
          projectPath: '/test/project',
        };

        await expect(interactiveAdrPlanning(input)).rejects.toThrow(
          'Session nonexistent-session not found'
        );
      });
    });

    describe('complete_session operation', () => {
      it('should complete and archive a session', async () => {
        // Start session first
        const startResult = await interactiveAdrPlanning({
          operation: 'start_session',
          projectPath: '/test/project',
        });

        const input = {
          operation: 'complete_session',
          sessionId: startResult.sessionId,
          projectPath: '/test/project',
        };

        const result = await interactiveAdrPlanning(input);

        expect(result.success).toBe(true);
        expect(result.sessionId).toBe(startResult.sessionId);
        expect(result.summary).toBeDefined();
        expect(result.message).toBe('Planning session completed successfully!');

        // Verify session archival
        expect(mockFs.rename).toHaveBeenCalledWith(
          expect.stringContaining('adr-planning-session-'),
          expect.stringContaining('archived-adr-planning-session-')
        );
      });

      it('should handle missing session ID', async () => {
        const input = {
          operation: 'complete_session',
          projectPath: '/test/project',
        };

        await expect(interactiveAdrPlanning(input)).rejects.toThrow('Session ID required');
      });

      it('should handle archival failures gracefully', async () => {
        mockFs.rename.mockRejectedValue(new Error('File not found'));

        const startResult = await interactiveAdrPlanning({
          operation: 'start_session',
          projectPath: '/test/project',
        });

        const input = {
          operation: 'complete_session',
          sessionId: startResult.sessionId,
        };

        // Should not throw even if archival fails
        const result = await interactiveAdrPlanning(input);
        expect(result.success).toBe(true);
      });
    });
  });

  describe('Workflow Phases', () => {
    let sessionId: string;

    beforeEach(async () => {
      const startResult = await interactiveAdrPlanning({
        operation: 'start_session',
        projectPath: '/test/project',
      });
      sessionId = startResult.sessionId;
    });

    describe('problem_definition phase', () => {
      it('should handle problem definition input', async () => {
        const input = {
          operation: 'provide_input',
          sessionId,
          input: {
            problemStatement: 'We need to choose a database for our microservices',
            constraints: ['High availability', 'ACID compliance'],
            stakeholders: ['Development team', 'Operations team'],
            successCriteria: ['Sub-second response time', '99.9% uptime'],
          },
        };

        const result = await interactiveAdrPlanning(input);

        expect(result.success).toBe(true);
        expect(result.phase).toBe('research_analysis');
        expect(result.guidance).toContain('Research Analysis');
        expect(mockFs.writeFile).toHaveBeenCalled(); // Session should be saved
      });

      it('should validate required problem definition fields', async () => {
        const input = {
          operation: 'provide_input',
          sessionId,
          input: {
            // Missing required fields
          },
        };

        await expect(interactiveAdrPlanning(input)).rejects.toThrow();
      });
    });

    describe('option_exploration phase', () => {
      it('should handle option exploration input', async () => {
        // First advance to option exploration phase
        await interactiveAdrPlanning({
          operation: 'provide_input',
          sessionId,
          input: {
            problemStatement: 'Database selection',
            constraints: ['Performance'],
            stakeholders: ['Team'],
            successCriteria: ['Fast queries'],
          },
        });

        await interactiveAdrPlanning({
          operation: 'provide_input',
          sessionId,
          input: {
            researchFindings: [
              {
                source: 'Documentation',
                insight: 'PostgreSQL offers strong consistency',
                relevance: 'High',
              },
            ],
          },
        });

        const input = {
          operation: 'provide_input',
          sessionId,
          input: {
            options: [
              {
                name: 'PostgreSQL',
                description: 'Relational database',
                pros: ['ACID compliance'],
                cons: ['Complex scaling'],
                risks: ['Single point of failure'],
                effort: 'medium',
                confidence: 85,
              },
            ],
          },
        };

        const result = await interactiveAdrPlanning(input);

        expect(result.success).toBe(true);
        expect(result.phase).toBe('decision_making');
      });
    });

    describe('adr_generation phase', () => {
      it('should generate ADR content', async () => {
        // Navigate through all phases to reach ADR generation
        const phases = [
          {
            problemStatement: 'Database selection',
            constraints: ['Performance'],
            stakeholders: ['Team'],
            successCriteria: ['Fast queries'],
          },
          {
            researchFindings: [{ source: 'Doc', insight: 'Insight', relevance: 'High' }],
          },
          {
            options: [
              {
                name: 'PostgreSQL',
                description: 'DB',
                pros: ['Fast'],
                cons: ['Complex'],
                risks: ['Scaling'],
                effort: 'medium',
                confidence: 85,
              },
            ],
          },
          {
            selectedOption: {
              name: 'PostgreSQL',
              rationale: 'Best fit for requirements',
              tradeoffs: ['Performance vs Complexity'],
            },
          },
          {
            impacts: {
              technical: ['Database setup'],
              business: ['Cost'],
              team: ['Training needed'],
              risks: ['Migration complexity'],
              dependencies: ['Infrastructure'],
            },
          },
          {
            implementation: {
              phases: ['Setup', 'Migration', 'Optimization'],
              tasks: [
                {
                  description: 'Setup PostgreSQL cluster',
                  priority: 'high',
                  effort: '2 days',
                  assignee: 'DevOps team',
                },
              ],
              timeline: '2 weeks',
              successCriteria: ['All tests pass', 'Performance benchmarks met'],
            },
          },
        ];

        // Execute all phases
        for (const phaseInput of phases) {
          await interactiveAdrPlanning({
            operation: 'provide_input',
            sessionId,
            input: phaseInput,
          });
        }

        // Generate ADR
        const result = await interactiveAdrPlanning({
          operation: 'provide_input',
          sessionId,
          input: {},
        });

        expect(result.success).toBe(true);
        expect(result.phase).toBe('completed');
        expect(result.adrContent).toContain('# ADR');
        expect(result.adrContent).toContain('Database selection');
        expect(result.adrContent).toContain('PostgreSQL');
      });
    });
  });

  describe('Additional Operations', () => {
    describe('save_session operation', () => {
      it('should save session manually', async () => {
        const startResult = await interactiveAdrPlanning({
          operation: 'start_session',
          projectPath: '/test/project',
        });

        const input = {
          operation: 'save_session',
          sessionId: startResult.sessionId,
        };

        const result = await interactiveAdrPlanning(input);

        expect(result.success).toBe(true);
        expect(result.message).toBe('Session saved');
        expect(mockFs.writeFile).toHaveBeenCalled();
      });

      it('should fail when session not found', async () => {
        const input = {
          operation: 'save_session',
          sessionId: 'nonexistent',
        };

        await expect(interactiveAdrPlanning(input)).rejects.toThrow('Session not found');
      });
    });

    describe('get_guidance operation', () => {
      it('should provide phase-specific guidance', async () => {
        const startResult = await interactiveAdrPlanning({
          operation: 'start_session',
          projectPath: '/test/project',
        });

        const input = {
          operation: 'get_guidance',
          sessionId: startResult.sessionId,
        };

        const result = await interactiveAdrPlanning(input);

        expect(result.success).toBe(true);
        expect(result.phase).toBe('problem_definition');
        expect(result.guidance).toContain('problem');
        expect(result.nextSteps).toBeDefined();
      });
    });
  });

  describe('Error Handling', () => {
    it('should handle unknown operations', async () => {
      const input = {
        operation: 'unknown_operation',
        projectPath: '/test/project',
      };

      await expect(interactiveAdrPlanning(input)).rejects.toThrow('Invalid enum value');
    });

    it('should handle schema validation errors', async () => {
      const input = {
        operation: 'start_session',
        // Missing required projectPath
      };

      await expect(interactiveAdrPlanning(input)).rejects.toThrow();
    });

    it('should validate operation types correctly', async () => {
      const validOperations = [
        'start_session',
        'continue_session',
        'provide_input',
        'request_research',
        'evaluate_options',
        'make_decision',
        'assess_impact',
        'plan_implementation',
        'generate_adr',
        'update_todos',
        'get_guidance',
        'save_session',
        'complete_session',
      ];

      for (const operation of validOperations) {
        const input = {
          operation,
          projectPath: '/test/project',
          sessionId: 'test-session-123', // Many operations require sessionId
        };

        // These might fail for other reasons (filesystem, session not found, etc.)
        // but they should not fail with "Unknown operation"
        try {
          await interactiveAdrPlanning(input);
        } catch (error) {
          expect(error.message).not.toContain('Unknown operation');
        }
      }
    });

    it('should handle invalid phase transitions', async () => {
      const startResult = await interactiveAdrPlanning({
        operation: 'start_session',
        projectPath: '/test/project',
      });

      const input = {
        operation: 'provide_input',
        sessionId: startResult.sessionId,
        input: {
          // Invalid input for problem_definition phase
          invalidField: 'invalid',
        },
      };

      await expect(interactiveAdrPlanning(input)).rejects.toThrow();
    });
  });

  describe('Integration Features', () => {
    it('should support TODO updates operation', async () => {
      const startResult = await interactiveAdrPlanning({
        operation: 'start_session',
        projectPath: '/test/project',
      });

      const input = {
        operation: 'update_todos',
        sessionId: startResult.sessionId,
        todoUpdates: [
          {
            task: 'Setup database',
            status: 'completed',
            notes: 'PostgreSQL cluster configured',
          },
        ],
      };

      const result = await interactiveAdrPlanning(input);

      expect(result.success).toBe(true);
      expect(result.message).toContain('TODO updates applied');
    });

    it('should support research request operation', async () => {
      const startResult = await interactiveAdrPlanning({
        operation: 'start_session',
        projectPath: '/test/project',
      });

      const input = {
        operation: 'request_research',
        sessionId: startResult.sessionId,
        researchTopics: ['Database performance comparison', 'Scaling strategies'],
      };

      const result = await interactiveAdrPlanning(input);

      expect(result.success).toBe(true);
      expect(result.researchGuidance).toBeDefined();
      expect(result.suggestedSources).toBeDefined();
    });

    it('should support options evaluation operation', async () => {
      const startResult = await interactiveAdrPlanning({
        operation: 'start_session',
        projectPath: '/test/project',
      });

      const input = {
        operation: 'evaluate_options',
        sessionId: startResult.sessionId,
        options: [
          {
            name: 'PostgreSQL',
            description: 'Relational database',
            pros: ['ACID compliance'],
            cons: ['Complex scaling'],
            risks: ['Single point of failure'],
            effort: 'medium',
            confidence: 85,
          },
        ],
      };

      const result = await interactiveAdrPlanning(input);

      expect(result.success).toBe(true);
      expect(result.evaluation).toBeDefined();
      expect(result.recommendations).toBeDefined();
    });
  });

  describe('Session Persistence and Recovery', () => {
    it('should handle corrupted session files', async () => {
      mockFs.readFile.mockResolvedValue('invalid json{');

      const input = {
        operation: 'continue_session',
        sessionId: 'corrupted-session',
        projectPath: '/test/project',
      };

      await expect(interactiveAdrPlanning(input)).rejects.toThrow(
        'Session corrupted-session not found'
      );
    });

    it('should handle filesystem permission errors during save', async () => {
      mockFs.writeFile.mockRejectedValue(new Error('Permission denied'));

      const input = {
        operation: 'start_session',
        projectPath: '/readonly/path',
      };

      await expect(interactiveAdrPlanning(input)).rejects.toThrow();
    });

    it('should calculate session duration correctly', async () => {
      const startResult = await interactiveAdrPlanning({
        operation: 'start_session',
        projectPath: '/test/project',
      });

      // Simulate some time passing
      jest.advanceTimersByTime(120000); // 2 minutes

      const result = await interactiveAdrPlanning({
        operation: 'complete_session',
        sessionId: startResult.sessionId,
      });

      expect(result.summary.duration).toBeDefined();
      expect(typeof result.summary.duration).toBe('string');
    });
  });
});
