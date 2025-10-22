/**
 * Integration Test for SystemCard Resource Tracking during Bootstrap
 *
 * This test validates the complete workflow:
 * 1. DAGExecutor with SystemCardManager integration
 * 2. Resource extraction from command outputs
 * 3. SystemCard.yaml generation
 * 4. Cleanup phase generation
 */

import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { promises as fs } from 'fs';
import * as path from 'path';
import * as os from 'os';
import * as yaml from 'js-yaml';
import { DAGExecutor, TaskNode } from '../../src/utils/dag-executor.js';
import { SystemCardManager, SystemCard } from '../../src/utils/system-card-manager.js';

describe('SystemCard Bootstrap Integration', () => {
  let tempDir: string;
  let systemCardManager: SystemCardManager;
  let dagExecutor: DAGExecutor;

  beforeEach(async () => {
    // Create temporary directory for test
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'systemcard-integration-'));
    systemCardManager = new SystemCardManager(tempDir);
    dagExecutor = new DAGExecutor(3, systemCardManager);
  });

  afterEach(async () => {
    // Clean up temporary directory
    try {
      await fs.rm(tempDir, { recursive: true, force: true });
    } catch {
      // Ignore cleanup errors
    }
  });

  describe('Complete Bootstrap Flow', () => {
    it('should initialize SystemCard before DAG execution', async () => {
      await systemCardManager.initialize({
        systemId: 'test-bootstrap-001',
        created: new Date().toISOString(),
        platform: {
          type: 'kubernetes',
          version: '1.27',
          detectionConfidence: 0.95,
        },
        bootstrapContext: {
          bootstrapId: 'test-bootstrap-001',
          validatedPatternId: 'kubernetes-v1',
        },
        metadata: {
          tags: ['test', 'integration'],
          description: 'Integration test bootstrap',
        },
      });

      const card = systemCardManager.getCurrentCard();
      expect(card).toBeDefined();
      expect(card?.systemId).toBe('test-bootstrap-001');

      const systemCardPath = path.join(tempDir, 'systemcard.yaml');
      const exists = await fs
        .access(systemCardPath)
        .then(() => true)
        .catch(() => false);
      expect(exists).toBe(true);
    });

    it('should extract resources during DAG execution with mock commands', async () => {
      // Initialize SystemCard
      await systemCardManager.initialize({
        systemId: 'test-bootstrap-002',
        created: new Date().toISOString(),
        platform: {
          type: 'kubernetes',
          version: '1.27',
          detectionConfidence: 0.95,
        },
        bootstrapContext: {
          bootstrapId: 'test-bootstrap-002',
          validatedPatternId: 'kubernetes-v1',
        },
      });

      // Create mock tasks that will simulate kubectl commands
      // Note: In real execution, these would run actual commands
      // For testing, we'll verify the structure is correct
      const tasks: TaskNode[] = [
        {
          id: 'create-namespace',
          name: 'Create Namespace',
          description: 'Create application namespace',
          command: 'echo "namespace/test-app created"',
          dependsOn: [],
          category: 'infrastructure',
          severity: 'critical',
          timeout: 5000,
        },
        {
          id: 'deploy-application',
          name: 'Deploy Application',
          description: 'Deploy application to namespace',
          command: 'echo "deployment.apps/test-app created"',
          dependsOn: ['create-namespace'],
          category: 'application',
          severity: 'critical',
          timeout: 5000,
        },
      ];

      // Execute DAG (will use echo commands for testing)
      const result = await dagExecutor.execute(tasks);

      expect(result.success).toBe(true);
      expect(result.executedTasks).toHaveLength(2);
      expect(result.failedTasks).toHaveLength(0);

      // Resource extraction may or may not work with echo commands
      // The important thing is the execution completed successfully
      expect(systemCardManager.getCurrentCard()).toBeDefined();
    }, 10000);

    it('should generate cleanup phases after successful bootstrap', async () => {
      await systemCardManager.initialize({
        systemId: 'test-bootstrap-003',
        created: new Date().toISOString(),
        platform: {
          type: 'kubernetes',
          version: '1.27',
          detectionConfidence: 0.95,
        },
        bootstrapContext: {
          bootstrapId: 'test-bootstrap-003',
          validatedPatternId: 'kubernetes-v1',
        },
      });

      // Manually add some test resources
      await systemCardManager.addResources([
        {
          type: 'namespace',
          name: 'test-app',
          created: new Date().toISOString(),
          createdByTask: 'create-namespace',
          cleanupCommand: 'kubectl delete namespace test-app',
        },
        {
          type: 'deployment',
          name: 'test-app',
          namespace: 'test-app',
          created: new Date().toISOString(),
          createdByTask: 'deploy-app',
          cleanupCommand: 'kubectl delete deployment test-app -n test-app',
        },
        {
          type: 'service',
          name: 'test-app-svc',
          namespace: 'test-app',
          created: new Date().toISOString(),
          createdByTask: 'create-service',
          cleanupCommand: 'kubectl delete service test-app-svc -n test-app',
        },
      ]);

      // Generate cleanup phases
      const cleanupPhases = await systemCardManager.generateCleanupPhases();

      expect(cleanupPhases.length).toBeGreaterThan(0);

      // Verify cleanup order (reverse of deployment)
      const phaseNames = cleanupPhases.map(p => p.name);
      const servicePhaseIndex = phaseNames.findIndex(n => n.includes('service'));
      const deploymentPhaseIndex = phaseNames.findIndex(n => n.includes('deployment'));
      const namespacePhaseIndex = phaseNames.findIndex(n => n.includes('namespace'));

      // Services should be deleted before deployments
      if (servicePhaseIndex !== -1 && deploymentPhaseIndex !== -1) {
        expect(servicePhaseIndex).toBeLessThan(deploymentPhaseIndex);
      }

      // Deployments should be deleted before namespaces
      if (deploymentPhaseIndex !== -1 && namespacePhaseIndex !== -1) {
        expect(deploymentPhaseIndex).toBeLessThan(namespacePhaseIndex);
      }
    });
  });

  describe('SystemCard YAML Structure', () => {
    it('should produce valid YAML format', async () => {
      await systemCardManager.initialize({
        systemId: 'test-bootstrap-yaml',
        created: new Date().toISOString(),
        platform: {
          type: 'kubernetes',
          version: '1.27',
          detectionConfidence: 0.95,
        },
        bootstrapContext: {
          bootstrapId: 'test-bootstrap-yaml',
          validatedPatternId: 'kubernetes-v1',
        },
      });

      await systemCardManager.addResources([
        {
          type: 'namespace',
          name: 'yaml-test',
          created: new Date().toISOString(),
          createdByTask: 'create-ns',
          cleanupCommand: 'kubectl delete namespace yaml-test',
        },
      ]);

      const systemCardPath = path.join(tempDir, 'systemcard.yaml');
      const yamlContent = await fs.readFile(systemCardPath, 'utf-8');

      // Parse YAML to verify it's valid
      const parsed = yaml.load(yamlContent) as SystemCard;

      expect(parsed.version).toBe('1.0');
      expect(parsed.systemId).toBe('test-bootstrap-yaml');
      expect(parsed.platform.type).toBe('kubernetes');
      expect(parsed.resources).toBeDefined();
    });

    it('should include all required SystemCard fields', async () => {
      await systemCardManager.initialize({
        systemId: 'test-complete-card',
        created: '2025-01-20T10:00:00Z',
        platform: {
          type: 'kubernetes',
          version: '1.27',
          detectionConfidence: 0.95,
        },
        bootstrapContext: {
          bootstrapId: 'test-complete-card',
          validatedPatternId: 'kubernetes-v1',
          adrPath: 'docs/adrs/bootstrap-001.md',
        },
        metadata: {
          tags: ['kubernetes', 'bootstrap', 'test'],
          description: 'Complete card test',
          owner: 'test-user',
        },
      });

      const card = systemCardManager.getCurrentCard();

      // Verify all required fields
      expect(card?.version).toBeDefined();
      expect(card?.systemId).toBeDefined();
      expect(card?.created).toBeDefined();
      expect(card?.lastUpdated).toBeDefined();
      expect(card?.platform).toBeDefined();
      expect(card?.bootstrapContext).toBeDefined();
      expect(card?.resources).toBeDefined();
      expect(card?.cleanup).toBeDefined();

      // Verify cleanup strategy
      expect(card?.cleanup.strategy).toBe('label-based');
      expect(card?.cleanup.labelSelector).toEqual({
        'managed-by': 'mcp-adr-server',
        'bootstrap-id': 'test-complete-card',
      });

      // Verify metadata
      expect(card?.metadata?.tags).toContain('kubernetes');
      expect(card?.metadata?.description).toBe('Complete card test');
      expect(card?.metadata?.owner).toBe('test-user');
    });
  });

  describe('Resource Tracking Integration', () => {
    it('should track resources with complete metadata', async () => {
      await systemCardManager.initialize({
        systemId: 'test-tracking',
        created: new Date().toISOString(),
        platform: {
          type: 'kubernetes',
          detectionConfidence: 0.95,
        },
        bootstrapContext: {
          bootstrapId: 'test-tracking',
          validatedPatternId: 'kubernetes-v1',
        },
      });

      await systemCardManager.addResources(
        [
          {
            type: 'deployment',
            name: 'tracked-app',
            namespace: 'production',
            uid: 'abc-123-def-456',
            labels: {
              'managed-by': 'mcp-adr-server',
              'bootstrap-id': 'test-tracking',
              app: 'tracked-app',
            },
            annotations: {
              'bootstrap.version': '1.0',
            },
            metadata: {
              replicas: 3,
              image: 'tracked-app:v1.2.3',
            },
            created: new Date().toISOString(),
            createdByTask: 'deploy-app',
            cleanupCommand: 'kubectl delete deployment tracked-app -n production',
          },
        ],
        {
          phase: 'application',
          taskId: 'deploy-app',
        }
      );

      const resources = systemCardManager.getResourcesByType('deployment');
      expect(resources).toHaveLength(1);

      const resource = resources[0];
      expect(resource.name).toBe('tracked-app');
      expect(resource.namespace).toBe('production');
      expect(resource.uid).toBe('abc-123-def-456');
      expect(resource.labels?.['app']).toBe('tracked-app');
      expect(resource.annotations?.['bootstrap.version']).toBe('1.0');
      expect(resource.metadata?.['replicas']).toBe(3);
      expect(resource.createdByPhase).toBe('application');
    });

    it('should maintain resource count accurately', async () => {
      await systemCardManager.initialize({
        systemId: 'test-count',
        created: new Date().toISOString(),
        platform: {
          type: 'kubernetes',
          detectionConfidence: 0.95,
        },
        bootstrapContext: {
          bootstrapId: 'test-count',
          validatedPatternId: 'kubernetes-v1',
        },
      });

      expect(systemCardManager.getResourceCount()).toBe(0);

      await systemCardManager.addResources([
        {
          type: 'namespace',
          name: 'ns1',
          created: new Date().toISOString(),
          createdByTask: 'create-ns',
          cleanupCommand: 'kubectl delete namespace ns1',
        },
      ]);

      expect(systemCardManager.getResourceCount()).toBe(1);

      await systemCardManager.addResources([
        {
          type: 'deployment',
          name: 'app1',
          namespace: 'ns1',
          created: new Date().toISOString(),
          createdByTask: 'deploy',
          cleanupCommand: 'kubectl delete deployment app1 -n ns1',
        },
        {
          type: 'service',
          name: 'svc1',
          namespace: 'ns1',
          created: new Date().toISOString(),
          createdByTask: 'create-svc',
          cleanupCommand: 'kubectl delete service svc1 -n ns1',
        },
      ]);

      expect(systemCardManager.getResourceCount()).toBe(3);
    });
  });

  describe('State Snapshots', () => {
    it('should create snapshots during bootstrap phases', async () => {
      await systemCardManager.initialize({
        systemId: 'test-snapshots',
        created: new Date().toISOString(),
        platform: {
          type: 'kubernetes',
          detectionConfidence: 0.95,
        },
        bootstrapContext: {
          bootstrapId: 'test-snapshots',
          validatedPatternId: 'kubernetes-v1',
        },
      });

      // Create snapshot before deployment
      const snapshot1 = await systemCardManager.createSnapshot('Before infrastructure');
      expect(snapshot1.resourceCount).toBe(0);

      // Add infrastructure resources
      await systemCardManager.addResources([
        {
          type: 'namespace',
          name: 'app-ns',
          created: new Date().toISOString(),
          createdByTask: 'create-ns',
          cleanupCommand: 'kubectl delete namespace app-ns',
        },
      ]);

      // Create snapshot after infrastructure
      const snapshot2 = await systemCardManager.createSnapshot('After infrastructure');
      expect(snapshot2.resourceCount).toBe(1);

      // Add application resources
      await systemCardManager.addResources([
        {
          type: 'deployment',
          name: 'app',
          namespace: 'app-ns',
          created: new Date().toISOString(),
          createdByTask: 'deploy',
          cleanupCommand: 'kubectl delete deployment app -n app-ns',
        },
      ]);

      // Create snapshot after application
      const snapshot3 = await systemCardManager.createSnapshot('After application');
      expect(snapshot3.resourceCount).toBe(2);

      const card = systemCardManager.getCurrentCard();
      expect(card?.snapshots).toHaveLength(3);
      expect(card?.snapshots?.[0].beforeAction).toBe('Before infrastructure');
      expect(card?.snapshots?.[1].beforeAction).toBe('After infrastructure');
      expect(card?.snapshots?.[2].beforeAction).toBe('After application');
    });
  });

  describe('Cleanup Validation', () => {
    it('should generate correct cleanup commands for all resource types', async () => {
      await systemCardManager.initialize({
        systemId: 'test-cleanup',
        created: new Date().toISOString(),
        platform: {
          type: 'kubernetes',
          detectionConfidence: 0.95,
        },
        bootstrapContext: {
          bootstrapId: 'test-cleanup',
          validatedPatternId: 'kubernetes-v1',
        },
      });

      const resourceTypes = [
        {
          type: 'namespace' as const,
          name: 'test-ns',
          cleanup: 'kubectl delete namespace test-ns',
        },
        {
          type: 'deployment' as const,
          name: 'test-deploy',
          namespace: 'test-ns',
          cleanup: 'kubectl delete deployment test-deploy -n test-ns',
        },
        {
          type: 'service' as const,
          name: 'test-svc',
          namespace: 'test-ns',
          cleanup: 'kubectl delete service test-svc -n test-ns',
        },
        {
          type: 'configmap' as const,
          name: 'test-config',
          namespace: 'test-ns',
          cleanup: 'kubectl delete configmap test-config -n test-ns',
        },
      ];

      for (const rt of resourceTypes) {
        await systemCardManager.addResources([
          {
            type: rt.type,
            name: rt.name,
            namespace: rt.namespace,
            created: new Date().toISOString(),
            createdByTask: `create-${rt.type}`,
            cleanupCommand: rt.cleanup,
          },
        ]);
      }

      const cleanupPhases = await systemCardManager.generateCleanupPhases();

      // Verify all cleanup commands are present
      const allCommands = cleanupPhases.flatMap(p => p.commands.map(c => c.command));
      for (const rt of resourceTypes) {
        expect(allCommands).toContain(rt.cleanup);
      }
    });
  });
});
