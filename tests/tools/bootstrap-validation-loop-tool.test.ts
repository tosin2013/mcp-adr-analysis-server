import { describe, it, expect } from 'vitest';
// Use unstable_mockModule for ESM mocking
const mockDetectPlatforms = vi.fn();
const mockGetPattern = vi.fn();
const mockDiscoverAdrs = vi.fn();

vi.mock('../../src/utils/platform-detector.js', () => ({
  detectPlatforms: mockDetectPlatforms,
  getPattern: mockGetPattern,
}));

vi.mock('../../src/utils/adr-discovery.js', () => ({
  discoverAdrs: mockDiscoverAdrs,
}));

// Mock KnowledgeGraphManager as a class
class MockKnowledgeGraphManager {
  static getInstance() {
    return new MockKnowledgeGraphManager();
  }
  storeBootstrapInsights = vi.fn().mockResolvedValue(undefined);
}

vi.mock('../../src/utils/knowledge-graph-manager.js', () => ({
  KnowledgeGraphManager: MockKnowledgeGraphManager,
}));

// Mock ToolContextManager to prevent filesystem operations in tests
class MockToolContextManager {
  initialize = vi.fn().mockResolvedValue(undefined);
  saveContext = vi.fn().mockResolvedValue(undefined);
  listContexts = vi.fn().mockResolvedValue([]);
}

vi.mock('../../src/utils/context-document-manager.js', () => ({
  ToolContextManager: MockToolContextManager,
}));

const { bootstrapValidationLoop } =
  await import('../../src/tools/bootstrap-validation-loop-tool.js');

describe('Bootstrap Validation Loop Tool', () => {
  beforeEach(() => {
    vi.clearAllMocks();
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

  /**
   * The teardown commands are handed to a calling agent to run (#1536).
   *
   * The tool registers itself as "GUIDED EXECUTION MODE ... it tells YOU what
   * commands to run". Two things were wrong with what it told them:
   *
   *  - the Kubernetes/OpenShift selector was the literal `app=myapp`, derived
   *    from nothing. For almost every user it matches nothing and the teardown
   *    reports success having deleted nothing -- a false green in a validation
   *    tool. For anyone who does label a workload `app=myapp`, an auto-approving
   *    agent destroys their deployments, services, configmaps and secrets.
   *  - the Docker teardown ran `docker system prune -f`, which is machine-wide.
   *    It removes stopped containers, unused networks and dangling images
   *    belonging to every other project on the host.
   *
   * Neither was caught because the tests asserted the strings the tool emitted.
   * These assert the property instead: a destructive command is only emitted
   * when its scope was supplied, and no emitted command reaches beyond it.
   */
  describe('emitted teardown commands are scoped (#1536)', () => {
    const cleanup = async (platform: string, extra: Record<string, unknown> = {}) => {
      mockDetectPlatforms.mockResolvedValue({
        primaryPlatform: platform,
        secondaryPlatforms: [],
        confidence: 0.9,
        evidence: [],
      });
      const result = await bootstrapValidationLoop({
        projectPath: '/test/project',
        currentIteration: 1,
        deploymentCleanupRequested: true,
        ...extra,
      });
      return result.content[0].text as string;
    };

    it.each(['kubernetes', 'openshift'])(
      'emits no delete command for %s when no app selector was given',
      async platform => {
        const text = await cleanup(platform);

        // A guessed selector is worse than none: it either deletes nothing and
        // reports success, or deletes someone else's workload.
        expect(text).not.toMatch(/kubectl\s+delete/);
        expect(text).not.toMatch(/oc\s+delete/);
      }
    );

    it.each(['kubernetes', 'openshift'])(
      'never emits the hardcoded app=myapp selector for %s',
      async platform => {
        expect(await cleanup(platform)).not.toContain('myapp');
      }
    );

    it.each(['kubernetes', 'openshift'])(
      'emits a delete scoped to the selector it was given, for %s',
      async platform => {
        const text = await cleanup(platform, { appSelector: 'app=checkout-api' });

        expect(text).toContain('app=checkout-api');
        expect(text).not.toContain('myapp');
        expect(text).toMatch(/(kubectl|oc)\s+delete/);
      }
    );

    it.each(['docker', 'docker-compose'])(
      'does not prune the whole machine for %s',
      async platform => {
        const text = await cleanup(platform);

        // `docker-compose down -v` is scoped to the compose project.
        // `docker system prune` is not scoped to anything.
        expect(text).not.toContain('docker system prune');
      }
    );

    it('tells the caller how to find the selector when it does not have one', async () => {
      const text = await cleanup('kubernetes');

      // Determinism: the server does not guess the scope, it says how to obtain it.
      expect(text).toMatch(/--show-labels|appSelector/);
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
      // No appSelector was passed, so no delete is offered -- discovery instead (#1536).
      expect(result.content[0].text).toContain('oc get all --show-labels');
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

      // Was `kubectl delete ... -l app=myapp`; a delete now requires appSelector (#1536).
      expect(result.content[0].text).toContain('kubectl get all --show-labels');
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
      // `docker system prune` reached every other project on the host (#1536).
      expect(result.content[0].text).not.toContain('docker system prune');
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
        appSelector: 'app=checkout-api',
      });

      // The warning belongs on the path that actually offers a delete. Without a
      // selector there is nothing to warn about, because nothing is offered (#1536).
      expect(result.content[0].text).toContain('DELETE all resources');
      expect(result.content[0].text).toContain('Confirm with human');
      expect(result.isError).toBe(false);
    });

    it('does not warn about deletion when no deletion is offered', async () => {
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

      // A destruction warning with no destructive command trains readers to skim it.
      expect(result.content[0].text).not.toContain('DELETE all resources');
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
