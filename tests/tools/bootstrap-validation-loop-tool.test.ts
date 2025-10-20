import { describe, it, expect, beforeEach, jest } from '@jest/globals';

// Use unstable_mockModule for ESM mocking
const mockDetectPlatforms = jest.fn();
const mockGetPattern = jest.fn();
const mockDiscoverAdrs = jest.fn();

jest.unstable_mockModule('../../src/utils/platform-detector.js', () => ({
  detectPlatforms: mockDetectPlatforms,
  getPattern: mockGetPattern,
}));

jest.unstable_mockModule('../../src/utils/adr-discovery.js', () => ({
  discoverAdrs: mockDiscoverAdrs,
}));

// Mock KnowledgeGraphManager as a class
class MockKnowledgeGraphManager {
  static getInstance() {
    return new MockKnowledgeGraphManager();
  }
  storeBootstrapInsights = jest.fn().mockResolvedValue(undefined);
}

jest.unstable_mockModule('../../src/utils/knowledge-graph-manager.js', () => ({
  KnowledgeGraphManager: MockKnowledgeGraphManager,
}));

// Mock ToolContextManager to prevent filesystem operations in tests
class MockToolContextManager {
  initialize = jest.fn().mockResolvedValue(undefined);
  saveContext = jest.fn().mockResolvedValue(undefined);
  listContexts = jest.fn().mockResolvedValue([]);
}

jest.unstable_mockModule('../../src/utils/context-document-manager.js', () => ({
  ToolContextManager: MockToolContextManager,
}));

const { bootstrapValidationLoop } = await import(
  '../../src/tools/bootstrap-validation-loop-tool.js'
);

describe('Bootstrap Validation Loop Tool', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockDiscoverAdrs.mockResolvedValue([]);
  });

  describe('Phase 0: Environment Validation', () => {
    it('should provide environment validation instructions on first iteration', async () => {
      mockDetectPlatforms.mockResolvedValue({
        primaryPlatform: 'openshift',
        secondaryPlatforms: [],
        confidence: 0.9,
        evidence: [
          {
            file: 'Dockerfile',
            indicator: 'FROM',
            platforms: ['docker'],
            weight: 0.8,
          },
        ],
      });
      mockGetPattern.mockReturnValue({
        name: 'openshift-base',
        baseCodeRepo: 'https://github.com/validatedpatterns/common',
        commands: {
          bootstrap: './bootstrap.sh',
          validation: './scripts/validate.sh',
          deployment: 'oc apply -k .',
        },
      });

      const result = await bootstrapValidationLoop({
        projectPath: '/test/project',
        currentIteration: 0,
      });

      expect(result.content[0].text).toContain('Phase 0: Environment Validation');
      expect(result.content[0].text).toContain('oc status && oc whoami');
      expect(result.content[0].text).toContain('openshift');
      expect(result.content[0].text).toContain('confirm with the human user');
      expect(result.isError).toBe(false);
    });

    it('should detect multiple platform types', async () => {
      mockDetectPlatforms.mockResolvedValue({
        primaryPlatform: 'kubernetes',
        secondaryPlatforms: ['docker', 'nodejs'],
        confidence: 0.85,
        evidence: [],
      });

      const result = await bootstrapValidationLoop({
        projectPath: '/test/project',
        currentIteration: 0,
      });

      expect(result.content[0].text).toContain('kubernetes');
      expect(result.content[0].text).toContain('kubectl cluster-info');
      expect(result.isError).toBe(false);
    });

    it('should handle no platform detected scenario', async () => {
      mockDetectPlatforms.mockResolvedValue({
        primaryPlatform: null,
        secondaryPlatforms: [],
        confidence: 0,
        evidence: [],
      });

      const result = await bootstrapValidationLoop({
        projectPath: '/test/project',
        currentIteration: 0,
      });

      expect(result.content[0].text).toContain('UNKNOWN');
      expect(result.content[0].text).toContain('0%');
      expect(result.isError).toBe(false);
    });
  });

  describe('CI/CD Deployment Cleanup Workflow', () => {
    it('should provide OpenShift cleanup instructions when requested', async () => {
      mockDetectPlatforms.mockResolvedValue({
        primaryPlatform: 'openshift',
        secondaryPlatforms: [],
        confidence: 0.9,
        evidence: [],
      });

      const result = await bootstrapValidationLoop({
        projectPath: '/test/project',
        currentIteration: 1,
        deploymentCleanupRequested: true,
      });

      expect(result.content[0].text).toContain('Deployment Cleanup & Restart');
      expect(result.content[0].text).toContain('oc delete all --selector');
      expect(result.content[0].text).toContain('oc get all --selector');
      expect(result.content[0].text).toContain('./bootstrap.sh');
      expect(result.isError).toBe(false);
    });

    it('should provide Kubernetes cleanup instructions', async () => {
      mockDetectPlatforms.mockResolvedValue({
        primaryPlatform: 'kubernetes',
        secondaryPlatforms: [],
        confidence: 0.9,
        evidence: [],
      });

      const result = await bootstrapValidationLoop({
        projectPath: '/test/project',
        currentIteration: 1,
        deploymentCleanupRequested: true,
      });

      expect(result.content[0].text).toContain('kubectl delete deployment');
      expect(result.content[0].text).toContain('kubectl get all');
      expect(result.isError).toBe(false);
    });

    it('should provide Docker cleanup instructions', async () => {
      mockDetectPlatforms.mockResolvedValue({
        primaryPlatform: 'docker',
        secondaryPlatforms: [],
        confidence: 0.9,
        evidence: [],
      });

      const result = await bootstrapValidationLoop({
        projectPath: '/test/project',
        currentIteration: 1,
        deploymentCleanupRequested: true,
      });

      expect(result.content[0].text).toContain('docker-compose down -v');
      expect(result.content[0].text).toContain('docker system prune');
      expect(result.content[0].text).toContain('docker ps -a');
      expect(result.isError).toBe(false);
    });

    it('should warn about resource deletion', async () => {
      mockDetectPlatforms.mockResolvedValue({
        primaryPlatform: 'openshift',
        secondaryPlatforms: [],
        confidence: 0.9,
        evidence: [],
      });

      const result = await bootstrapValidationLoop({
        projectPath: '/test/project',
        currentIteration: 1,
        deploymentCleanupRequested: true,
      });

      expect(result.content[0].text).toContain('DELETE all resources');
      expect(result.content[0].text).toContain('Confirm with human');
      expect(result.isError).toBe(false);
    });
  });

  describe('Bootstrap Generation Phase', () => {
    it('should provide troubleshooting for failed connection', async () => {
      mockDetectPlatforms.mockResolvedValue({
        primaryPlatform: 'openshift',
        secondaryPlatforms: [],
        confidence: 0.9,
        evidence: [],
      });

      const result = await bootstrapValidationLoop({
        projectPath: '/test/project',
        currentIteration: 1,
        previousExecutionSuccess: false,
        previousExecutionOutput: 'error: unable to connect',
      });

      expect(result.content[0].text).toContain('Connection Failed');
      expect(result.content[0].text).toContain('Troubleshooting Steps');
      expect(result.content[0].text).toContain('Authentication');
      expect(result.content[0].text).toContain('Permissions');
      expect(result.isError).toBe(false);
    });

    it('should provide bootstrap script generation guidance', async () => {
      mockDetectPlatforms.mockResolvedValue({
        primaryPlatform: 'openshift',
        secondaryPlatforms: [],
        confidence: 0.9,
        evidence: [],
      });
      mockGetPattern.mockReturnValue({
        name: 'openshift-base',
        baseCodeRepo: 'https://github.com/validatedpatterns/common',
        commands: {
          bootstrap: './bootstrap.sh',
          validation: './scripts/validate.sh',
          deployment: 'oc apply -k .',
        },
      });

      const result = await bootstrapValidationLoop({
        projectPath: '/test/project',
        currentIteration: 1,
        previousExecutionSuccess: true,
        previousExecutionOutput: 'Connected successfully',
      });

      expect(result.content[0].text).toContain('Bootstrap Script Generation');
      expect(result.content[0].text).toContain('generate_adr_bootstrap');
      expect(result.content[0].text).toContain('validate_bootstrap.sh');
      expect(result.isError).toBe(false);
    });
  });

  describe('Completion Phase', () => {
    it('should provide completion summary when max iterations reached', async () => {
      mockDetectPlatforms.mockResolvedValue({
        primaryPlatform: 'openshift',
        secondaryPlatforms: [],
        confidence: 0.9,
        evidence: [],
      });

      const result = await bootstrapValidationLoop({
        projectPath: '/test/project',
        currentIteration: 5,
        maxIterations: 5,
        previousExecutionSuccess: true,
      });

      expect(result.content[0].text).toContain('Bootstrap Validation Loop - Complete');
      expect(result.content[0].text).toContain('Summary');
      expect(result.content[0].text).toContain('Next Steps');
      expect(result.isError).toBe(false);
    });

    it('should indicate partial completion on max iterations', async () => {
      mockDetectPlatforms.mockResolvedValue({
        primaryPlatform: 'kubernetes',
        secondaryPlatforms: [],
        confidence: 0.9,
        evidence: [],
      });

      const result = await bootstrapValidationLoop({
        projectPath: '/test/project',
        currentIteration: 5,
        maxIterations: 5,
        previousExecutionSuccess: false,
      });

      expect(result.content[0].text).toContain('Complete');
      expect(result.isError).toBe(false);
    });
  });

  describe('Parameter Handling', () => {
    it('should handle default parameters', async () => {
      mockDetectPlatforms.mockResolvedValue({
        primaryPlatform: 'docker',
        secondaryPlatforms: [],
        confidence: 0.9,
        evidence: [],
      });

      const result = await bootstrapValidationLoop({});

      expect(result.content[0].text).toContain('Phase 0');
      expect(result.isError).toBe(false);
    });

    it('should respect custom maxIterations', async () => {
      mockDetectPlatforms.mockResolvedValue({
        primaryPlatform: 'openshift',
        secondaryPlatforms: [],
        confidence: 0.9,
        evidence: [],
      });

      const result = await bootstrapValidationLoop({
        currentIteration: 10,
        maxIterations: 10,
      });

      expect(result.content[0].text).toContain('Complete');
      expect(result.isError).toBe(false);
    });

    it('should handle previousExecutionOutput parameter', async () => {
      mockDetectPlatforms.mockResolvedValue({
        primaryPlatform: 'kubernetes',
        secondaryPlatforms: [],
        confidence: 0.9,
        evidence: [],
      });

      const result = await bootstrapValidationLoop({
        currentIteration: 1,
        previousExecutionOutput: 'Command executed successfully',
        previousExecutionSuccess: true,
      });

      expect(result.content[0].text).toBeDefined();
      expect(result.isError).toBe(false);
    });
  });

  describe('Error Handling', () => {
    it('should handle platform detection errors gracefully', async () => {
      mockDetectPlatforms.mockRejectedValue(new Error('Platform detection failed'));

      await expect(
        bootstrapValidationLoop({
          projectPath: '/test/project',
          currentIteration: 0,
        })
      ).rejects.toThrow('Platform detection failed');
    });
  });

  describe('Integration with Validated Patterns', () => {
    it('should recommend validated patterns base code for OpenShift', async () => {
      mockDetectPlatforms.mockResolvedValue({
        primaryPlatform: 'openshift',
        secondaryPlatforms: [],
        confidence: 0.9,
        evidence: [],
      });
      mockGetPattern.mockReturnValue({
        name: 'openshift-base',
        baseCodeRepo: 'https://github.com/validatedpatterns/common',
        commands: {
          bootstrap: './bootstrap.sh',
          validation: './scripts/validate.sh',
          deployment: 'oc apply -k .',
        },
      });

      const result = await bootstrapValidationLoop({
        projectPath: '/test/project',
        currentIteration: 1,
        previousExecutionSuccess: true,
      });

      expect(result.content[0].text).toContain('Bootstrap Script Generation');
      expect(result.content[0].text).toContain('generate_adr_bootstrap');
      expect(result.isError).toBe(false);
    });

    it('should handle pattern not found scenario', async () => {
      mockDetectPlatforms.mockResolvedValue({
        primaryPlatform: 'custom-platform',
        secondaryPlatforms: [],
        confidence: 0.5,
        evidence: [],
      });
      mockGetPattern.mockReturnValue(null);

      const result = await bootstrapValidationLoop({
        projectPath: '/test/project',
        currentIteration: 1,
        previousExecutionSuccess: true,
      });

      expect(result.content[0].text).toBeDefined();
      expect(result.isError).toBe(false);
    });
  });

  describe('Iterative Workflow', () => {
    it('should progress from Phase 0 to Bootstrap Generation', async () => {
      mockDetectPlatforms.mockResolvedValue({
        primaryPlatform: 'openshift',
        secondaryPlatforms: [],
        confidence: 0.9,
        evidence: [],
      });

      // Phase 0
      const phase0 = await bootstrapValidationLoop({
        projectPath: '/test/project',
        currentIteration: 0,
      });
      expect(phase0.content[0].text).toContain('Phase 0');

      // Phase 1
      const phase1 = await bootstrapValidationLoop({
        projectPath: '/test/project',
        currentIteration: 1,
        previousExecutionSuccess: true,
        previousExecutionOutput: 'Connection successful',
      });
      expect(phase1.content[0].text).toContain('Bootstrap');
    });

    it('should handle iteration increment correctly', async () => {
      mockDetectPlatforms.mockResolvedValue({
        primaryPlatform: 'kubernetes',
        secondaryPlatforms: [],
        confidence: 0.9,
        evidence: [],
      });

      for (let i = 0; i < 3; i++) {
        const result = await bootstrapValidationLoop({
          projectPath: '/test/project',
          currentIteration: i,
          previousExecutionSuccess: i > 0,
        });
        expect(result.content[0].text).toBeDefined();
        expect(result.isError).toBe(false);
      }
    });
  });
});
