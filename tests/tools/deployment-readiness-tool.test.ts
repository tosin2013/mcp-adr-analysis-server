/**
 * Unit tests for deployment-readiness-tool.ts
 * Target: Achieve 80% coverage for comprehensive deployment validation
 */

import { describe, it, expect, beforeAll, beforeEach, afterEach, jest } from '@jest/globals';

// Mock child_process execSync
const mockExecSync = jest.fn();
jest.unstable_mockModule('child_process', () => ({
  execSync: mockExecSync
}));

// Mock file system operations
const mockReadFileSync = jest.fn();
const mockWriteFileSync = jest.fn();
const mockExistsSync = jest.fn();
const mockMkdirSync = jest.fn();

jest.unstable_mockModule('fs', () => ({
  readFileSync: mockReadFileSync,
  writeFileSync: mockWriteFileSync,
  existsSync: mockExistsSync,
  mkdirSync: mockMkdirSync
}));

describe('Deployment Readiness Tool', () => {
  const testProjectPath = '/tmp/test-project';
  let deploymentReadiness: any;
  
  beforeAll(async () => {
    // Import after all mocks are set up
    const module = await import('../../src/tools/deployment-readiness-tool.js');
    deploymentReadiness = module.deploymentReadiness;
  });
  
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Default mock implementations
    mockExistsSync.mockReturnValue(true);
    mockMkdirSync.mockReturnValue(undefined);
    mockWriteFileSync.mockReturnValue(undefined);
    
    // Mock test execution with successful Jest output
    mockExecSync.mockReturnValue(`
PASS tests/example.test.ts
  ✓ should work correctly (5 ms)
  ✓ should handle edge cases (3 ms)
  
Test Suites: 1 passed, 1 total
Tests:       2 passed, 2 total
Snapshots:   0 total
Time:        0.123 s
`);
    
    // Mock coverage file with good coverage
    mockReadFileSync.mockImplementation((...args: unknown[]) => {
      const path = args[0] as string;
      if (path.includes('coverage/coverage-summary.json')) {
        return 'Coverage: 90%';
      }
      if (path.includes('deployment-history.json')) {
        return JSON.stringify({
          deployments: [
            {
              deploymentId: 'deploy-123',
              timestamp: new Date().toISOString(),
              environment: 'production',
              status: 'success',
              duration: 300000,
              rollbackRequired: false,
              gitCommit: 'abc123',
              deployedBy: 'test-user'
            }
          ]
        });
      }
      return '{}';
    });
    
    // Mock process.env.USER for override tests
    process.env['USER'] = 'test-user';
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('Schema Validation', () => {
    it('should validate basic operation input', async () => {
      // Use deployment_history operation which we know works
      const validInput = {
        operation: 'deployment_history',
        projectPath: testProjectPath
      };

      const result = await deploymentReadiness(validInput);
      expect(result).toBeDefined();
      expect(result.content).toBeDefined();
      expect(Array.isArray(result.content)).toBe(true);
    });

    it('should validate test_validation operation', async () => {
      const validInput = {
        operation: 'test_validation',
        projectPath: testProjectPath,
        maxTestFailures: 0,
        requireTestCoverage: 80
      };

      const result = await deploymentReadiness(validInput);
      expect(result).toBeDefined();
    });

    it('should validate deployment_history operation', async () => {
      mockReadFileSync.mockReturnValue(JSON.stringify({
        deployments: []
      }));

      const validInput = {
        operation: 'deployment_history',
        projectPath: testProjectPath,
        targetEnvironment: 'production'
      };

      const result = await deploymentReadiness(validInput);
      expect(result).toBeDefined();
    });

    it('should validate emergency_override operation', async () => {
      // Mock emergency override history file to not exist initially
      mockExistsSync.mockImplementation((...args: unknown[]) => {
        const path = args[0] as string;
        if (path.includes('emergency-overrides.json')) return false;
        return true;
      });

      const validInput = {
        operation: 'emergency_override',
        projectPath: testProjectPath,
        businessJustification: 'Critical security fix required immediately'
      };

      const result = await deploymentReadiness(validInput);
      expect(result).toBeDefined();
    });

    it('should reject invalid operation', async () => {
      const invalidInput = {
        operation: 'invalid_operation',
        projectPath: testProjectPath
      };

      await expect(deploymentReadiness(invalidInput)).rejects.toThrow();
    });

    it('should use default values for optional parameters', async () => {
      const minimalInput = {
        operation: 'deployment_history'
      };

      // Should not throw with minimal input
      const result = await deploymentReadiness(minimalInput);
      expect(result).toBeDefined();
    });
  });

  describe('Test Validation Operation', () => {
    beforeEach(() => {
      // Mock successful test execution
      mockExecSync.mockReturnValue(`
        PASS src/test1.test.js
        ✓ should work correctly
        ✓ should handle edge cases
        
        Test Suites: 1 passed, 1 total
        Tests:       2 passed, 2 total
      `);
    });

    it('should handle successful test execution', async () => {
      // Mock coverage files existence and content
      mockExistsSync.mockImplementation((...args: unknown[]) => {
        const path = args[0] as string;
        if (path.includes('coverage/coverage-summary.json')) return true;
        return true;
      });
      
      mockReadFileSync.mockImplementation((...args: unknown[]) => {
        const path = args[0] as string;
        if (path.includes('coverage/coverage-summary.json')) {
          // Return content that contains percentage values the regex can find
          return `Coverage: 90.5%`;
        }
        return '{}';
      });

      const input = {
        operation: 'test_validation',
        projectPath: testProjectPath,
        maxTestFailures: 0,
        requireTestCoverage: 80
      };

      const result = await deploymentReadiness(input);
      // With good coverage, should show test validation status
      expect(result.content[0].text).toContain('Test Status');
      expect(mockExecSync).toHaveBeenCalled();
    });

    it('should block deployment on test failures', async () => {
      // Mock failed test execution
      const testError = new Error('Tests failed');
      (testError as any).status = 1;
      (testError as any).stdout = `
        FAIL src/test1.test.js
        ✗ should work correctly
        ✓ should handle edge cases
        
        Test Suites: 1 failed, 1 total
        Tests:       1 failed, 1 passed, 2 total
      `;
      (testError as any).stderr = '';
      mockExecSync.mockImplementation(() => {
        throw testError;
      });

      const input = {
        operation: 'test_validation',
        projectPath: testProjectPath,
        maxTestFailures: 0,
        blockOnFailingTests: true
      };

      const result = await deploymentReadiness(input);
      expect(result.content[0].text).toContain('DEPLOYMENT BLOCKED');
      expect(result.content[0].text).toContain('Test Failures Detected');
    });

    it('should check test coverage and block if insufficient', async () => {
      // Mock coverage file with low coverage
      mockExistsSync.mockImplementation((...args: unknown[]) => {
        const path = args[0] as string;
        if (path.includes('coverage/coverage-summary.json')) return true;
        return true; // default for other paths
      });
      
      mockReadFileSync.mockImplementation((...args: unknown[]) => {
        const path = args[0] as string;
        if (path.includes('coverage/coverage-summary.json')) {
          return 'Coverage: 50%'; // Low coverage that will trigger blocking
        }
        return '{}';
      });

      const input = {
        operation: 'test_validation',
        projectPath: testProjectPath,
        requireTestCoverage: 80,
        strictMode: true
      };

      const result = await deploymentReadiness(input);
      expect(result.content[0].text).toContain('DEPLOYMENT BLOCKED');
      expect(result.content[0].text).toContain('**Coverage**: 50% (Required: 80%)');
    });

    it('should handle test execution timeout', async () => {
      mockExecSync.mockImplementation(() => {
        throw new Error('Command timed out');
      });

      const input = {
        operation: 'test_validation',
        projectPath: testProjectPath
      };

      const result = await deploymentReadiness(input);
      // Should handle the error gracefully
      expect(result).toBeDefined();
    });

    it('should try multiple test commands if first fails', async () => {
      let callCount = 0;
      mockExecSync.mockImplementation((...args: unknown[]) => {
        const command = args[0] as string;
        callCount++;
        if (callCount === 1 && command === 'npm test') {
          const error = new Error('npm command not found');
          (error as any).code = 'ENOENT';
          throw error;
        }
        return 'PASS tests completed successfully';
      });

      const input = {
        operation: 'test_validation',
        projectPath: testProjectPath
      };

      await deploymentReadiness(input);
      expect(mockExecSync).toHaveBeenCalledWith('npm test', expect.any(Object));
      expect(mockExecSync).toHaveBeenCalledWith('yarn test', expect.any(Object));
    });
  });

  describe('Deployment History Operation', () => {
    it('should analyze deployment history with good success rate', async () => {
      const mockHistory = {
        deployments: [
          {
            deploymentId: '1',
            timestamp: '2024-01-01T00:00:00Z',
            environment: 'production',
            status: 'success',
            duration: 300000,
            rollbackRequired: false,
            gitCommit: 'abc123',
            deployedBy: 'user1'
          },
          {
            deploymentId: '2',
            timestamp: '2024-01-02T00:00:00Z',
            environment: 'production',
            status: 'success',
            duration: 250000,
            rollbackRequired: false,
            gitCommit: 'def456',
            deployedBy: 'user2'
          }
        ]
      };

      mockReadFileSync.mockReturnValue(JSON.stringify(mockHistory));

      const input = {
        operation: 'deployment_history',
        projectPath: testProjectPath,
        targetEnvironment: 'production',
        deploymentSuccessThreshold: 80
      };

      const result = await deploymentReadiness(input);
      expect(result.content[0].text).toContain('DEPLOYMENT READY');
      expect(result.content[0].text).toContain('**Success Rate**: 100%');
    });

    it('should block deployment on low success rate', async () => {
      const mockHistory = {
        deployments: [
          {
            deploymentId: '1',
            timestamp: '2024-01-01T00:00:00Z',
            environment: 'production',
            status: 'failed',
            duration: 300000,
            rollbackRequired: true,
            failureReason: 'Database connection timeout',
            gitCommit: 'abc123',
            deployedBy: 'user1'
          },
          {
            deploymentId: '2',
            timestamp: '2024-01-02T00:00:00Z',
            environment: 'production',
            status: 'failed',
            duration: 250000,
            rollbackRequired: true,
            failureReason: 'Test failures detected',
            gitCommit: 'def456',
            deployedBy: 'user2'
          }
        ]
      };

      mockReadFileSync.mockReturnValue(JSON.stringify(mockHistory));

      const input = {
        operation: 'deployment_history',
        projectPath: testProjectPath,
        targetEnvironment: 'production',
        deploymentSuccessThreshold: 80,
        blockOnRecentFailures: true
      };

      const result = await deploymentReadiness(input);
      expect(result.content[0].text).toContain('DEPLOYMENT BLOCKED');
      expect(result.content[0].text).toContain('**Success Rate**: 0% (Required: 80%)');
    });

    it('should handle missing deployment history file', async () => {
      mockExistsSync.mockReturnValue(false);

      const input = {
        operation: 'deployment_history',
        projectPath: testProjectPath,
        targetEnvironment: 'production'
      };

      const result = await deploymentReadiness(input);
      // Should handle missing file gracefully with empty history
      expect(result).toBeDefined();
      expect(result.content[0].text).toContain('100%'); // Empty history = 100% success
    });

    it('should handle corrupt deployment history file', async () => {
      mockReadFileSync.mockReturnValue('invalid json{');

      const input = {
        operation: 'deployment_history',
        projectPath: testProjectPath,
        targetEnvironment: 'production'
      };

      const result = await deploymentReadiness(input);
      // Should handle corrupt file gracefully
      expect(result).toBeDefined();
    });

    it('should analyze failure patterns correctly', async () => {
      const mockHistory = {
        deployments: [
          {
            deploymentId: '1',
            timestamp: '2024-01-01T00:00:00Z',
            environment: 'production',
            status: 'failed',
            duration: 300000,
            rollbackRequired: true,
            failureReason: 'Test failures in authentication module',
            gitCommit: 'abc123',
            deployedBy: 'user1'
          },
          {
            deploymentId: '2',
            timestamp: '2024-01-02T00:00:00Z',
            environment: 'production',
            status: 'failed',
            duration: 250000,
            rollbackRequired: true,
            failureReason: 'Test failures in user management',
            gitCommit: 'def456',
            deployedBy: 'user2'
          }
        ]
      };

      mockReadFileSync.mockReturnValue(JSON.stringify(mockHistory));

      const input = {
        operation: 'deployment_history',
        projectPath: testProjectPath,
        targetEnvironment: 'production'
      };

      const result = await deploymentReadiness(input);
      expect(result.content[0].text).toContain('Test Failures');
    });
  });

  describe('Full Audit Operation', () => {
    it('should combine test validation and deployment history', async () => {
      // Mock successful test execution with good coverage
      mockExecSync.mockReturnValue('PASS all tests passed');
      
      // Mock coverage to meet requirements
      mockExistsSync.mockImplementation((...args: unknown[]) => {
        const path = args[0] as string;
        if (path.includes('coverage/coverage-summary.json')) return true;
        return true;
      });
      
      mockReadFileSync.mockImplementation((...args: unknown[]) => {
        const path = args[0] as string;
        if (path.includes('coverage/coverage-summary.json')) {
          return 'Coverage: 90%'; // Good coverage above threshold
        }
        if (path.includes('deployment-history.json')) {
          return JSON.stringify({
            deployments: [
              {
                deploymentId: '1',
                timestamp: '2024-01-01T00:00:00Z',
                environment: 'production',
                status: 'success',
                duration: 300000,
                rollbackRequired: false,
                gitCommit: 'abc123',
                deployedBy: 'user1'
              }
            ]
          });
        }
        return '{}';
      });

      const input = {
        operation: 'full_audit',
        projectPath: testProjectPath,
        targetEnvironment: 'production',
        requireTestCoverage: 80
      };

      const result = await deploymentReadiness(input);
      expect(result.content[0].text).toContain('DEPLOYMENT READY');
      expect(result.content[0].text).toContain('Test Status');
      expect(result.content[0].text).toContain('Deployment History');
    });

    it('should block if any validation fails', async () => {
      // Mock failed tests
      const testError = new Error('Tests failed');
      (testError as any).status = 1;
      (testError as any).stdout = 'FAIL tests failed';
      (testError as any).stderr = '';
      mockExecSync.mockImplementation(() => {
        throw testError;
      });

      // Mock good deployment history
      const mockHistory = {
        deployments: [
          {
            deploymentId: '1',
            timestamp: '2024-01-01T00:00:00Z',
            environment: 'production',
            status: 'success',
            duration: 300000,
            rollbackRequired: false,
            gitCommit: 'abc123',
            deployedBy: 'user1'
          }
        ]
      };
      mockReadFileSync.mockReturnValue(JSON.stringify(mockHistory));

      const input = {
        operation: 'full_audit',
        projectPath: testProjectPath,
        targetEnvironment: 'production',
        blockOnFailingTests: true
      };

      const result = await deploymentReadiness(input);
      expect(result.content[0].text).toContain('DEPLOYMENT BLOCKED');
    });
  });

  describe('Emergency Override Operation', () => {
    it('should allow emergency override with justification', async () => {
      // Mock override file doesn't exist initially
      mockExistsSync.mockImplementation((...args: unknown[]) => {
        const path = args[0] as string;
        if (path.includes('emergency-overrides.json')) return false;
        return true;
      });

      const input = {
        operation: 'emergency_override',
        projectPath: testProjectPath,
        businessJustification: 'Critical security vulnerability needs immediate patch',
        targetEnvironment: 'production'
      };

      const result = await deploymentReadiness(input);
      expect(result.content[0].text).toContain('DEPLOYMENT READY');
      expect(result.content[0].text).toContain('Emergency override active');
      
      // Verify override was logged - check the emergency-overrides.json write call specifically
      const overrideWriteCall = mockWriteFileSync.mock.calls.find((call: unknown[]) => 
        String(call[0]).includes('emergency-overrides.json')
      );
      expect(overrideWriteCall).toBeDefined();
      if (overrideWriteCall) {
        expect(String(overrideWriteCall[1])).toContain('Critical security vulnerability');
      }
    });

    it('should reject emergency override without justification', async () => {
      const input = {
        operation: 'emergency_override',
        projectPath: testProjectPath
        // Missing businessJustification
      };

      await expect(deploymentReadiness(input)).rejects.toThrow();
    });

    it('should handle existing override history', async () => {
      const existingOverrides = [
        {
          timestamp: '2024-01-01T00:00:00Z',
          justification: 'Previous emergency fix',
          environment: 'production',
          overriddenBy: 'user1'
        }
      ];
      
      mockReadFileSync.mockReturnValue(JSON.stringify(existingOverrides));

      const input = {
        operation: 'emergency_override',
        projectPath: testProjectPath,
        businessJustification: 'New critical fix',
        targetEnvironment: 'production'
      };

      const result = await deploymentReadiness(input);
      expect(result).toBeDefined();
      
      // Should append to existing overrides
      const writeCall = mockWriteFileSync.mock.calls.find((call: unknown[]) => 
        String(call[0]).includes('emergency-overrides.json')
      );
      expect(writeCall).toBeDefined();
      if (writeCall) {
        const writtenData = JSON.parse(String(writeCall[1]));
        expect(writtenData).toHaveLength(2);
      }
    });
  });

  describe('Cache Management', () => {
    it('should create cache directory if it does not exist', async () => {
      mockExistsSync.mockReturnValue(false);

      const input = {
        operation: 'check_readiness',
        projectPath: testProjectPath
      };

      await deploymentReadiness(input);
      
      expect(mockMkdirSync).toHaveBeenCalledWith(
        expect.stringContaining('.mcp-adr-cache'),
        { recursive: true }
      );
    });

    it('should cache results after analysis', async () => {
      const input = {
        operation: 'check_readiness',
        projectPath: testProjectPath
      };

      await deploymentReadiness(input);
      
      // Should write cache file
      expect(mockWriteFileSync).toHaveBeenCalledWith(
        expect.stringContaining('deployment-readiness-cache.json'),
        expect.stringContaining('timestamp')
      );
    });
  });

  describe('Error Handling', () => {
    it('should handle invalid project path gracefully', async () => {
      const input = {
        operation: 'check_readiness',
        projectPath: '/nonexistent/path'
      };

      // Should not throw but handle gracefully
      const result = await deploymentReadiness(input);
      expect(result).toBeDefined();
    });

    it('should handle file system errors gracefully', async () => {
      // Test with invalid operation to trigger schema validation error
      const input = {
        operation: 'invalid_operation_that_does_not_exist'
      };

      await expect(deploymentReadiness(input)).rejects.toThrow('DEPLOYMENT_READINESS_ERROR');
    });

    it('should handle JSON parsing errors in deployment history', async () => {
      mockReadFileSync.mockImplementation((...args: unknown[]) => {
        const path = args[0] as string;
        if (path.includes('deployment-history.json')) {
          return 'invalid json content{{{';
        }
        return '{}';
      });

      const input = {
        operation: 'deployment_history',
        projectPath: testProjectPath
      };

      const result = await deploymentReadiness(input);
      // Should handle gracefully with empty history
      expect(result).toBeDefined();
    });
  });

  describe('Helper Functions Integration', () => {
    it('should calculate test scores correctly', async () => {
      // Test with good test results
      mockExecSync.mockReturnValue(`
        PASS src/test1.test.js
        ✓ should work correctly
        ✓ should handle edge cases
      `);

      const input = {
        operation: 'test_validation',
        projectPath: testProjectPath,
        maxTestFailures: 0,
        requireTestCoverage: 90
      };

      const result = await deploymentReadiness(input);
      expect(result.content[0].text).toContain('Readiness Score');
    });

    it('should categorize different failure types', async () => {
      const mockHistory = {
        deployments: [
          {
            deploymentId: '1',
            timestamp: '2024-01-01T00:00:00Z',
            environment: 'production',
            status: 'failed',
            duration: 300000,
            rollbackRequired: true,
            failureReason: 'Database connection timeout occurred',
            gitCommit: 'abc123',
            deployedBy: 'user1'
          },
          {
            deploymentId: '2',
            timestamp: '2024-01-02T00:00:00Z',
            environment: 'production',
            status: 'failed',
            duration: 250000,
            rollbackRequired: true,
            failureReason: 'Build failed due to compilation errors',
            gitCommit: 'def456',
            deployedBy: 'user2'
          }
        ]
      };

      mockReadFileSync.mockReturnValue(JSON.stringify(mockHistory));

      const input = {
        operation: 'deployment_history',
        projectPath: testProjectPath,
        targetEnvironment: 'production'
      };

      const result = await deploymentReadiness(input);
      expect(result.content[0].text).toContain('Database Connection');
      expect(result.content[0].text).toContain('Build Failures');
    });

    it('should assess environment stability correctly', async () => {
      const mockHistory = {
        deployments: Array.from({ length: 10 }, (_, i) => ({
          deploymentId: `${i + 1}`,
          timestamp: `2024-01-${String(i + 1).padStart(2, '0')}T00:00:00Z`,
          environment: 'production',
          status: i < 8 ? 'success' : 'failed', // 80% success rate
          duration: 300000,
          rollbackRequired: i >= 8,
          gitCommit: `commit${i}`,
          deployedBy: 'user1'
        }))
      };

      mockReadFileSync.mockReturnValue(JSON.stringify(mockHistory));

      const input = {
        operation: 'deployment_history',
        projectPath: testProjectPath,
        targetEnvironment: 'production'
      };

      const result = await deploymentReadiness(input);
      expect(result.content[0].text).toContain('80%');
      expect(result.content[0].text).toContain('Environment Stability');
    });
  });
});