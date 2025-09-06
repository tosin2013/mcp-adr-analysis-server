/**
 * Unit tests for troubleshoot-guided-workflow-tool.ts
 * Target: Achieve 80% coverage for comprehensive troubleshooting workflow validation
 */

import { describe, it, expect, beforeAll, beforeEach, afterEach, jest } from '@jest/globals';

// Mock fetch for AI API calls
const mockFetch = jest.fn();
global.fetch = mockFetch;

describe('Troubleshoot Guided Workflow Tool', () => {
  let troubleshootGuidedWorkflow: any;
  
  beforeAll(async () => {
    // Import after all mocks are set up
    const module = await import('../../src/tools/troubleshoot-guided-workflow-tool.js');
    troubleshootGuidedWorkflow = module.troubleshootGuidedWorkflow;
  });
  
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Set environment variables for AI config
    process.env['OPENROUTER_API_KEY'] = 'test-key';
    process.env['EXECUTION_MODE'] = 'prompt-only'; // Default to prompt-only to avoid AI calls
    
    // Default fetch mock for successful AI responses (when needed)
    mockFetch.mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        choices: [{
          message: {
            content: JSON.stringify({
              testPlan: {
                summary: 'AI analysis of the failure',
                priority: 'high',
                testSections: [
                  {
                    title: 'Test Section',
                    description: 'Test description',
                    commands: [
                      {
                        command: 'npm test',
                        description: 'Run tests',
                        expected: 'All tests pass'
                      }
                    ]
                  }
                ],
                followupInstructions: ['Run tests', 'Report results']
              }
            })
          }
        }]
      })
    });
  });

  afterEach(() => {
    jest.restoreAllMocks();
    // Clean up environment variables
    delete process.env['OPENROUTER_API_KEY'];
    delete process.env['EXECUTION_MODE'];
  });

  describe('Schema Validation', () => {
    it('should validate analyze_failure operation input', async () => {
      const validInput = {
        operation: 'analyze_failure',
        failure: {
          failureType: 'test_failure',
          failureDetails: {
            errorMessage: 'Test failed with assertion error',
            command: 'npm test',
            exitCode: 1
          }
        }
      };

      const result = await troubleshootGuidedWorkflow(validInput);
      expect(result).toBeDefined();
      expect(result.content).toBeDefined();
      expect(Array.isArray(result.content)).toBe(true);
      expect(result.content[0].type).toBe('text');
      expect(result.content[0].text).toContain('Failure Analysis');
    });

    it('should validate generate_test_plan operation input', async () => {
      const validInput = {
        operation: 'generate_test_plan',
        failure: {
          failureType: 'deployment_failure',
          failureDetails: {
            errorMessage: 'Deployment failed due to missing environment variables',
            environment: 'production'
          }
        },
        projectPath: '/tmp/test-project'
      };

      const result = await troubleshootGuidedWorkflow(validInput);
      expect(result).toBeDefined();
      expect(result.content[0].text).toContain('Test Plan Generation'); // Either AI or Fallback
    });

    it('should validate full_workflow operation input', async () => {
      const validInput = {
        operation: 'full_workflow',
        projectPath: '/tmp/test-project',
        adrDirectory: 'docs/adrs',
        todoPath: 'TODO.md'
      };

      const result = await troubleshootGuidedWorkflow(validInput);
      expect(result).toBeDefined();
      expect(result.content[0].text).toContain('Guided Troubleshooting Workflow');
    });

    it('should reject invalid operation', async () => {
      const invalidInput = {
        operation: 'invalid_operation',
        projectPath: '/tmp/test-project'
      };

      await expect(troubleshootGuidedWorkflow(invalidInput)).rejects.toThrow('Invalid input');
    });

    it('should reject analyze_failure without failure info', async () => {
      const invalidInput = {
        operation: 'analyze_failure',
        projectPath: '/tmp/test-project'
      };

      await expect(troubleshootGuidedWorkflow(invalidInput)).rejects.toThrow('Failure information is required');
    });

    it('should reject generate_test_plan without failure info', async () => {
      const invalidInput = {
        operation: 'generate_test_plan',
        projectPath: '/tmp/test-project'
      };

      await expect(troubleshootGuidedWorkflow(invalidInput)).rejects.toThrow('Failure information is required');
    });

    it('should use default values for optional parameters', async () => {
      const minimalInput = {
        operation: 'full_workflow'
      };

      const result = await troubleshootGuidedWorkflow(minimalInput);
      expect(result).toBeDefined();
      expect(result.content[0].text).toContain('Workflow Overview');
    });

    it('should handle invalid failure type', async () => {
      const invalidInput = {
        operation: 'analyze_failure',
        failure: {
          failureType: 'invalid_failure_type',
          failureDetails: {
            errorMessage: 'Some error'
          }
        }
      };

      await expect(troubleshootGuidedWorkflow(invalidInput)).rejects.toThrow('Invalid input');
    });
  });

  describe('Failure Analysis Operation', () => {
    it('should analyze test failure correctly', async () => {
      const input = {
        operation: 'analyze_failure',
        failure: {
          failureType: 'test_failure',
          failureDetails: {
            errorMessage: 'Expected "hello" but got "world"',
            command: 'npm test -- src/example.test.js',
            exitCode: 1,
            stackTrace: 'Error: Expected "hello" but got "world"\n    at test.js:10:5',
            logOutput: 'FAIL src/example.test.js\n  ✗ should return hello',
            environment: 'CI',
            timestamp: '2024-01-15T10:30:00Z',
            affectedFiles: ['src/example.js', 'src/example.test.js']
          },
          context: {
            recentChanges: 'Updated string return value in example.js',
            reproducible: true,
            frequency: 'always',
            impact: 'high'
          }
        }
      };

      const result = await troubleshootGuidedWorkflow(input);
      const text = result.content[0].text;
      
      expect(text).toContain('🚨 Failure Analysis');
      expect(text).toContain('TEST_FAILURE');
      expect(text).toContain('Expected "hello" but got "world"');
      expect(text).toContain('npm test -- src/example.test.js');
      expect(text).toContain('Exit Code**: 1');
      expect(text).toContain('Environment**: CI');
      expect(text).toContain('Timestamp**: 2024-01-15T10:30:00Z');
      expect(text).toContain('Stack Trace');
      expect(text).toContain('Log Output');
      expect(text).toContain('src/example.js');
      expect(text).toContain('src/example.test.js');
      expect(text).toContain('Recent Changes');
      expect(text).toContain('Updated string return value');
      expect(text).toContain('Impact Level**: HIGH');
      expect(text).toContain('Reproducible**: Yes');
      expect(text).toContain('Frequency**: always');
      expect(text).toContain('🎯 Recommended Test Plan');
      expect(text).toContain('Run specific failing tests');
    });

    it('should analyze deployment failure correctly', async () => {
      const input = {
        operation: 'analyze_failure',
        failure: {
          failureType: 'deployment_failure',
          failureDetails: {
            errorMessage: 'Database connection timeout during deployment',
            command: 'kubectl apply -f deployment.yaml',
            exitCode: 1,
            environment: 'production',
            timestamp: '2024-01-15T10:30:00Z'
          },
          context: {
            impact: 'critical'
          }
        }
      };

      const result = await troubleshootGuidedWorkflow(input);
      const text = result.content[0].text;
      
      expect(text).toContain('DEPLOYMENT_FAILURE');
      expect(text).toContain('Database connection timeout');
      expect(text).toContain('Verify deployment configuration');
      expect(text).toContain('Check resource availability');
      expect(text).toContain('Impact Level**: CRITICAL');
    });

    it('should analyze build failure correctly', async () => {
      const input = {
        operation: 'analyze_failure',
        failure: {
          failureType: 'build_failure',
          failureDetails: {
            errorMessage: 'TypeScript compilation error: Property does not exist',
            command: 'npm run build',
            exitCode: 2
          }
        }
      };

      const result = await troubleshootGuidedWorkflow(input);
      const text = result.content[0].text;
      
      expect(text).toContain('BUILD_FAILURE');
      expect(text).toContain('TypeScript compilation error');
      expect(text).toContain('Check build dependencies');
      expect(text).toContain('Verify source code syntax');
    });

    it('should analyze runtime error correctly', async () => {
      const input = {
        operation: 'analyze_failure',
        failure: {
          failureType: 'runtime_error',
          failureDetails: {
            errorMessage: 'Uncaught ReferenceError: variable is not defined',
            stackTrace: 'ReferenceError: variable is not defined\n    at app.js:25:10'
          }
        }
      };

      const result = await troubleshootGuidedWorkflow(input);
      const text = result.content[0].text;
      
      expect(text).toContain('RUNTIME_ERROR');
      expect(text).toContain('Uncaught ReferenceError');
      expect(text).toContain('Reproduce the error');
      expect(text).toContain('Check application logs');
    });

    it('should analyze performance issue correctly', async () => {
      const input = {
        operation: 'analyze_failure',
        failure: {
          failureType: 'performance_issue',
          failureDetails: {
            errorMessage: 'Page load time exceeds 5 seconds',
            environment: 'production'
          }
        }
      };

      const result = await troubleshootGuidedWorkflow(input);
      const text = result.content[0].text;
      
      expect(text).toContain('PERFORMANCE_ISSUE');
      expect(text).toContain('Page load time exceeds 5 seconds');
      expect(text).toContain('Gather additional diagnostic information');
    });

    it('should analyze security issue correctly', async () => {
      const input = {
        operation: 'analyze_failure',
        failure: {
          failureType: 'security_issue',
          failureDetails: {
            errorMessage: 'Vulnerable dependency detected: lodash@4.0.0'
          }
        }
      };

      const result = await troubleshootGuidedWorkflow(input);
      const text = result.content[0].text;
      
      expect(text).toContain('SECURITY_ISSUE');
      expect(text).toContain('Vulnerable dependency detected');
    });

    it('should handle minimal failure information', async () => {
      const input = {
        operation: 'analyze_failure',
        failure: {
          failureType: 'other',
          failureDetails: {
            errorMessage: 'Something went wrong'
          }
        }
      };

      const result = await troubleshootGuidedWorkflow(input);
      const text = result.content[0].text;
      
      expect(text).toContain('OTHER');
      expect(text).toContain('Something went wrong');
      expect(text).toContain('Gather additional diagnostic information');
    });

    it('should handle failure without context', async () => {
      const input = {
        operation: 'analyze_failure',
        failure: {
          failureType: 'test_failure',
          failureDetails: {
            errorMessage: 'Test failed'
          }
        }
      };

      const result = await troubleshootGuidedWorkflow(input);
      const text = result.content[0].text;
      
      expect(text).toContain('Test failed');
      expect(text).not.toContain('Recent Changes');
      expect(text).not.toContain('Impact Level');
    });
  });

  describe('Test Plan Generation Operation', () => {
    it('should generate AI-powered test plan successfully', async () => {
      // Enable AI execution for this test
      process.env['EXECUTION_MODE'] = 'full';
      
      const input = {
        operation: 'generate_test_plan',
        failure: {
          failureType: 'test_failure',
          failureDetails: {
            errorMessage: 'Jest test suite failed',
            command: 'npm test',
            exitCode: 1
          }
        },
        projectPath: '/tmp/test-project'
      };

      const result = await troubleshootGuidedWorkflow(input);
      const text = result.content[0].text;
      
      expect(text).toContain('🧪 AI-Generated Test Plan');
      expect(text).toContain('Analysis Summary');
      expect(text).toContain('AI analysis of the failure');
      expect(text).toContain('Priority**: HIGH');
      expect(text).toContain('1. Test Section');
      expect(text).toContain('npm test');
      expect(text).toContain('All tests pass');
      expect(text).toContain('📋 After Running Tests');
      expect(text).toContain('Run tests');
      expect(text).toContain('Report results');
      expect(text).toContain('/tmp/test-project');
      expect(text).toContain('This test plan was generated by AI');
      
      expect(mockFetch).toHaveBeenCalledWith(
        'https://openrouter.ai/api/v1/chat/completions',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Authorization': 'Bearer test-key',
            'Content-Type': 'application/json'
          })
        })
      );
    });

    it('should handle AI API errors and fallback to template', async () => {
      // Enable AI execution but make it fail
      process.env['EXECUTION_MODE'] = 'full';
      mockFetch.mockRejectedValue(new Error('Network error'));

      const input = {
        operation: 'generate_test_plan',
        failure: {
          failureType: 'build_failure',
          failureDetails: {
            errorMessage: 'Build compilation failed',
            command: 'npm run build'
          }
        },
        projectPath: '/tmp/test-project'
      };

      const result = await troubleshootGuidedWorkflow(input);
      const text = result.content[0].text;
      
      expect(text).toContain('🧪 Test Plan Generation (Fallback)');
      expect(text).toContain('BUILD_FAILURE');
      expect(text).toContain('Clean and Rebuild');
      expect(text).toContain('npm run clean');
      expect(text).toContain('AI-powered analysis unavailable');
    });

    it('should use fallback when AI is disabled', async () => {
      // AI is disabled by default with prompt-only mode
      const input = {
        operation: 'generate_test_plan',
        failure: {
          failureType: 'deployment_failure',
          failureDetails: {
            errorMessage: 'Deployment failed'
          }
        }
      };

      const result = await troubleshootGuidedWorkflow(input);
      const text = result.content[0].text;
      
      expect(text).toContain('Test Plan Generation (Fallback)');
      expect(text).toContain('DEPLOYMENT_FAILURE');
      expect(mockFetch).not.toHaveBeenCalled();
    });

    it('should handle invalid AI response', async () => {
      process.env['EXECUTION_MODE'] = 'full';
      mockFetch.mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({
          choices: [{
            message: {
              content: 'invalid json{'
            }
          }]
        })
      });

      const input = {
        operation: 'generate_test_plan',
        failure: {
          failureType: 'test_failure',
          failureDetails: {
            errorMessage: 'Test failed'
          }
        }
      };

      const result = await troubleshootGuidedWorkflow(input);
      const text = result.content[0].text;
      
      expect(text).toContain('Test Plan Generation (Fallback)');
    });

    it('should handle AI API HTTP errors', async () => {
      process.env['EXECUTION_MODE'] = 'full';
      mockFetch.mockResolvedValue({
        ok: false,
        status: 500,
        json: async () => ({ error: 'Server error' })
      });

      const input = {
        operation: 'generate_test_plan',
        failure: {
          failureType: 'runtime_error',
          failureDetails: {
            errorMessage: 'Runtime error occurred'
          }
        }
      };

      const result = await troubleshootGuidedWorkflow(input);
      const text = result.content[0].text;
      
      expect(text).toContain('Test Plan Generation (Fallback)');
      expect(text).toContain('RUNTIME_ERROR');
    });

    it('should handle empty AI response', async () => {
      process.env['EXECUTION_MODE'] = 'full';
      mockFetch.mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({
          choices: []
        })
      });

      const input = {
        operation: 'generate_test_plan',
        failure: {
          failureType: 'test_failure',
          failureDetails: {
            errorMessage: 'Test failed'
          }
        }
      };

      const result = await troubleshootGuidedWorkflow(input);
      const text = result.content[0].text;
      
      expect(text).toContain('Test Plan Generation (Fallback)');
    });
  });

  describe('Fallback Test Plan Generation', () => {
    // All tests use prompt-only mode by default, so they will use fallback

    it('should generate fallback plan for test failure', async () => {
      const input = {
        operation: 'generate_test_plan',
        failure: {
          failureType: 'test_failure',
          failureDetails: {
            errorMessage: 'Test assertion failed',
            command: 'jest src/test.js'
          }
        },
        projectPath: '/project'
      };

      const result = await troubleshootGuidedWorkflow(input);
      const text = result.content[0].text;
      
      expect(text).toContain('1. Run Failing Tests');
      expect(text).toContain('jest src/test.js');
      expect(text).toContain('2. Check Test Environment');
      expect(text).toContain('node --version');
      expect(text).toContain('npm ls --depth=0');
    });

    it('should generate fallback plan for deployment failure', async () => {
      const input = {
        operation: 'generate_test_plan',
        failure: {
          failureType: 'deployment_failure',
          failureDetails: {
            errorMessage: 'Deployment error',
            command: 'docker deploy'
          }
        }
      };

      const result = await troubleshootGuidedWorkflow(input);
      const text = result.content[0].text;
      
      expect(text).toContain('1. Verify Deployment Environment');
      expect(text).toContain('df -h');
      expect(text).toContain('free -m');
      expect(text).toContain('2. Test Deployment Components');
      expect(text).toContain('docker deploy --verbose');
    });

    it('should generate fallback plan for build failure', async () => {
      const input = {
        operation: 'generate_test_plan',
        failure: {
          failureType: 'build_failure',
          failureDetails: {
            errorMessage: 'Build failed'
          }
        }
      };

      const result = await troubleshootGuidedWorkflow(input);
      const text = result.content[0].text;
      
      expect(text).toContain('1. Clean and Rebuild');
      expect(text).toContain('npm run clean');
      expect(text).toContain('rm -rf node_modules');
      expect(text).toContain('2. Build with Verbose Output');
      expect(text).toContain('npm run build -- --verbose');
    });

    it('should generate fallback plan for runtime error', async () => {
      const input = {
        operation: 'generate_test_plan',
        failure: {
          failureType: 'runtime_error',
          failureDetails: {
            errorMessage: 'Runtime error'
          }
        }
      };

      const result = await troubleshootGuidedWorkflow(input);
      const text = result.content[0].text;
      
      expect(text).toContain('1. Reproduce in Debug Mode');
      expect(text).toContain('NODE_ENV=development npm start');
      expect(text).toContain('DEBUG=* npm start');
      expect(text).toContain('2. Check Application Health');
      expect(text).toContain('curl -I http://localhost:3000/health');
    });

    it('should generate fallback plan for unknown failure type', async () => {
      const input = {
        operation: 'generate_test_plan',
        failure: {
          failureType: 'other',
          failureDetails: {
            errorMessage: 'Unknown error'
          }
        },
        projectPath: '/custom/path'
      };

      const result = await troubleshootGuidedWorkflow(input);
      const text = result.content[0].text;
      
      expect(text).toContain('1. General Diagnostic Commands');
      expect(text).toContain('ls -la /custom/path');
      expect(text).toContain('cat package.json | jq .scripts');
      expect(text).toContain('npm run lint || echo "No lint script"');
    });
  });

  describe('Full Workflow Operation', () => {
    it('should execute full troubleshooting workflow', async () => {
      const input = {
        operation: 'full_workflow',
        projectPath: '/tmp/project',
        adrDirectory: 'docs/adrs',
        todoPath: 'TODO.md'
      };

      const result = await troubleshootGuidedWorkflow(input);
      const text = result.content[0].text;
      
      expect(text).toContain('🔧 Guided Troubleshooting Workflow');
      expect(text).toContain('Workflow Overview');
      expect(text).toContain('✅ Issue collected and understood');
      expect(text).toContain('🔄 Baseline reality check with ADRs');
      expect(text).toContain('🔄 TODO alignment analysis');
      expect(text).toContain('🔄 Generate targeted questions');
      expect(text).toContain('🔄 ADR validation');
      expect(text).toContain('🔄 Guided recommendations');
      
      expect(text).toContain('Step 2: Baseline Reality Check');
      expect(text).toContain('compare_adr_progress');
      expect(text).toContain('Step 3: TODO Alignment Analysis');
      expect(text).toContain('manage_todo');
      expect(text).toContain('Step 4: Targeted Analysis');
      expect(text).toContain('generate_research_questions');
      expect(text).toContain('Step 5: Resolution Planning');
      
      expect(text).toContain('Integration Notes');
      expect(text).toContain('This workflow is designed to integrate with existing MCP tools');
      expect(text).toContain('alignment with documented architectural decisions');
    });

    it('should handle full workflow with minimal input', async () => {
      const input = {
        operation: 'full_workflow'
      };

      const result = await troubleshootGuidedWorkflow(input);
      const text = result.content[0].text;
      
      expect(text).toContain('Guided Troubleshooting Workflow');
      expect(text).toContain('Integration Notes');
    });
  });

  describe('Error Handling', () => {
    it('should handle Zod validation errors', async () => {
      const invalidInput = {
        operation: 'analyze_failure',
        failure: {
          failureType: 'invalid_type',
          failureDetails: 'invalid structure'
        }
      };

      await expect(troubleshootGuidedWorkflow(invalidInput)).rejects.toThrow('Invalid input');
    });

    it('should handle unknown operation gracefully', async () => {
      const invalidInput = {
        operation: 'unknown_operation',
        projectPath: '/tmp/test'
      };

      await expect(troubleshootGuidedWorkflow(invalidInput)).rejects.toThrow('Invalid input');
    });

    it('should handle missing required failure info', async () => {
      const invalidInput = {
        operation: 'analyze_failure'
      };

      await expect(troubleshootGuidedWorkflow(invalidInput)).rejects.toThrow('Failure information is required');
    });

    it('should handle general errors in analysis', async () => {
      // Corrupt the environment to cause an error
      const originalEnv = process.env['OPENROUTER_API_KEY'];
      delete process.env['OPENROUTER_API_KEY'];
      process.env['EXECUTION_MODE'] = 'full'; // This should cause validation error

      const input = {
        operation: 'generate_test_plan',
        failure: {
          failureType: 'test_failure',
          failureDetails: {
            errorMessage: 'Test failed'
          }
        }
      };

      // Should fall back to prompt-only mode and work
      const result = await troubleshootGuidedWorkflow(input);
      expect(result).toBeDefined();
      expect(result.content[0].text).toContain('Test Plan Generation (Fallback)');
      
      // Restore environment
      if (originalEnv) {
        process.env['OPENROUTER_API_KEY'] = originalEnv;
      }
    });
  });

  describe('AI Test Plan Formatting', () => {
    it('should format complex AI test plan correctly', async () => {
      process.env['EXECUTION_MODE'] = 'full';
      
      const complexTestPlan = {
        testPlan: {
          summary: 'Complex failure analysis with multiple issues',
          priority: 'critical',
          testSections: [
            {
              title: 'Environment Validation',
              description: 'Verify the deployment environment is properly configured',
              commands: [
                {
                  command: 'kubectl get pods',
                  description: 'Check pod status',
                  expected: 'All pods running'
                },
                {
                  command: 'kubectl logs deployment/app',
                  description: 'Check application logs',
                  expected: 'No error messages'
                }
              ]
            },
            {
              title: 'Database Connectivity',
              description: 'Test database connections and queries',
              commands: [
                {
                  command: 'psql -h localhost -U user -c "SELECT 1"',
                  description: 'Test database connection',
                  expected: 'Returns 1'
                }
              ]
            }
          ],
          followupInstructions: [
            'Document all test results in detail',
            'Contact DevOps if infrastructure issues found',
            'Escalate to security team if authentication issues detected'
          ]
        }
      };

      mockFetch.mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({
          choices: [{
            message: {
              content: JSON.stringify(complexTestPlan)
            }
          }]
        })
      });

      const input = {
        operation: 'generate_test_plan',
        failure: {
          failureType: 'deployment_failure',
          failureDetails: {
            errorMessage: 'Complex deployment failure'
          }
        },
        projectPath: '/complex/project'
      };

      const result = await troubleshootGuidedWorkflow(input);
      const text = result.content[0].text;
      
      expect(text).toContain('Complex failure analysis with multiple issues');
      expect(text).toContain('Priority**: CRITICAL');
      expect(text).toContain('1. Environment Validation');
      expect(text).toContain('Verify the deployment environment');
      expect(text).toContain('kubectl get pods');
      expect(text).toContain('Check pod status');
      expect(text).toContain('All pods running');
      expect(text).toContain('2. Database Connectivity');
      expect(text).toContain('psql -h localhost');
      expect(text).toContain('Returns 1');
      expect(text).toContain('Document all test results');
      expect(text).toContain('Contact DevOps');
      expect(text).toContain('Escalate to security team');
      expect(text).toContain('/complex/project');
    });

    it('should handle AI test plan with missing sections', async () => {
      process.env['EXECUTION_MODE'] = 'full';
      
      const incompleteTestPlan = {
        testPlan: {
          summary: 'Basic analysis'
        }
      };

      mockFetch.mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({
          choices: [{
            message: {
              content: JSON.stringify(incompleteTestPlan)
            }
          }]
        })
      });

      const input = {
        operation: 'generate_test_plan',
        failure: {
          failureType: 'test_failure',
          failureDetails: {
            errorMessage: 'Simple test failure'
          }
        }
      };

      const result = await troubleshootGuidedWorkflow(input);
      const text = result.content[0].text;
      
      expect(text).toContain('Basic analysis');
      expect(text).toContain('Priority**: MEDIUM'); // Default value
      expect(text).toContain('Execute each command in sequence'); // Default instructions
    });
  });

  describe('Integration and Edge Cases', () => {
    it('should handle failure with all optional fields populated', async () => {
      const comprehensiveFailure = {
        failureType: 'test_failure',
        failureDetails: {
          command: 'npm test -- --coverage',
          exitCode: 1,
          errorMessage: 'Test suite failed with 3 failing tests',
          stackTrace: 'Error: Expected true but got false\n    at test.js:45:10\n    at Runner.run',
          logOutput: 'FAIL src/auth.test.js\n  ✗ should authenticate user\n  ✗ should handle invalid credentials',
          environment: 'CI/CD Pipeline - Ubuntu 20.04',
          timestamp: '2024-01-15T14:22:30.123Z',
          affectedFiles: [
            'src/auth.js',
            'src/auth.test.js',
            'src/utils/validation.js'
          ]
        },
        context: {
          recentChanges: 'Updated authentication logic to use new JWT library v2.0.0',
          reproducible: true,
          frequency: 'always since last deploy',
          impact: 'critical'
        }
      };

      const input = {
        operation: 'analyze_failure',
        failure: comprehensiveFailure
      };

      const result = await troubleshootGuidedWorkflow(input);
      const text = result.content[0].text;
      
      expect(text).toContain('npm test -- --coverage');
      expect(text).toContain('Exit Code**: 1');
      expect(text).toContain('Test suite failed with 3 failing tests');
      expect(text).toContain('CI/CD Pipeline - Ubuntu 20.04');
      expect(text).toContain('2024-01-15T14:22:30.123Z');
      expect(text).toContain('src/auth.js');
      expect(text).toContain('src/utils/validation.js');
      expect(text).toContain('Updated authentication logic');
      expect(text).toContain('always since last deploy');
      expect(text).toContain('Impact Level**: CRITICAL');
      expect(text).toContain('Reproducible**: Yes');
    });

    it('should handle non-reproducible failure correctly', async () => {
      const input = {
        operation: 'analyze_failure',
        failure: {
          failureType: 'runtime_error',
          failureDetails: {
            errorMessage: 'Intermittent memory leak detected'
          },
          context: {
            reproducible: false,
            frequency: 'random',
            impact: 'medium'
          }
        }
      };

      const result = await troubleshootGuidedWorkflow(input);
      const text = result.content[0].text;
      
      expect(text).toContain('Reproducible**: No');
      expect(text).toContain('Frequency**: random');
      expect(text).toContain('Impact Level**: MEDIUM');
    });

    it('should handle custom project paths correctly', async () => {
      const input = {
        operation: 'full_workflow',
        projectPath: '/custom/project/path',
        adrDirectory: 'documentation/decisions',
        todoPath: 'docs/TODO.md'
      };

      const result = await troubleshootGuidedWorkflow(input);
      expect(result).toBeDefined();
      expect(result.content[0].text).toContain('Guided Troubleshooting Workflow');
    });

    it('should handle very long error messages', async () => {
      const longErrorMessage = 'A'.repeat(2000); // Very long error message
      
      const input = {
        operation: 'analyze_failure',
        failure: {
          failureType: 'build_failure',
          failureDetails: {
            errorMessage: longErrorMessage
          }
        }
      };

      const result = await troubleshootGuidedWorkflow(input);
      const text = result.content[0].text;
      
      expect(text).toContain('A'.repeat(100)); // Should contain part of the long message
      expect(result).toBeDefined();
    });

    it('should handle empty arrays gracefully', async () => {
      const input = {
        operation: 'analyze_failure',
        failure: {
          failureType: 'test_failure',
          failureDetails: {
            errorMessage: 'Test failed',
            affectedFiles: [] // Empty array
          }
        }
      };

      const result = await troubleshootGuidedWorkflow(input);
      const text = result.content[0].text;
      
      expect(text).toContain('Test failed');
      expect(text).not.toContain('Affected Files'); // Should not show empty section
    });
  });
});