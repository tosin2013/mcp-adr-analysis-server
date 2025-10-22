/**
 * Unit tests for system-card-manager.ts
 * Tests SystemCard initialization, resource tracking, cleanup generation, and persistence
 */

import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { promises as fs } from 'fs';
import * as path from 'path';
import * as os from 'os';
import {
  SystemCardManager,
  ResourceRecord,
  PlatformInfo,
  BootstrapContext,
} from '../../src/utils/system-card-manager.js';

describe('SystemCardManager', () => {
  let tempDir: string;
  let manager: SystemCardManager;
  let testPlatform: PlatformInfo;
  let testContext: BootstrapContext;

  beforeEach(async () => {
    // Create temporary directory for tests
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'systemcard-test-'));
    manager = new SystemCardManager(tempDir);

    testPlatform = {
      type: 'kubernetes',
      version: '1.27',
      detectionConfidence: 0.95,
    };

    testContext = {
      bootstrapId: 'test-bootstrap-123',
      validatedPatternId: 'kubernetes-v1',
    };
  });

  afterEach(async () => {
    // Clean up temporary directory
    try {
      await fs.rm(tempDir, { recursive: true, force: true });
    } catch {
      // Ignore cleanup errors
    }
  });

  describe('Initialization', () => {
    it('should initialize a new SystemCard', async () => {
      await manager.initialize({
        systemId: 'test-system-001',
        created: '2025-01-20T10:00:00Z',
        platform: testPlatform,
        bootstrapContext: testContext,
      });

      const card = manager.getCurrentCard();
      expect(card).toBeTruthy();
      expect(card?.systemId).toBe('test-system-001');
      expect(card?.version).toBe('1.0');
      expect(card?.platform.type).toBe('kubernetes');
      expect(card?.bootstrapContext.bootstrapId).toBe('test-bootstrap-123');
    });

    it('should create systemcard.yaml file on disk', async () => {
      await manager.initialize({
        systemId: 'test-system-002',
        created: '2025-01-20T10:00:00Z',
        platform: testPlatform,
        bootstrapContext: testContext,
      });

      const systemCardPath = path.join(tempDir, 'systemcard.yaml');
      const exists = await fs
        .access(systemCardPath)
        .then(() => true)
        .catch(() => false);

      expect(exists).toBe(true);
    });

    it('should initialize with metadata', async () => {
      await manager.initialize({
        systemId: 'test-system-003',
        created: '2025-01-20T10:00:00Z',
        platform: testPlatform,
        bootstrapContext: testContext,
        metadata: {
          tags: ['test', 'kubernetes', 'bootstrap'],
          description: 'Test deployment',
          owner: 'test-user',
        },
      });

      const card = manager.getCurrentCard();
      expect(card?.metadata?.tags).toContain('test');
      expect(card?.metadata?.description).toBe('Test deployment');
      expect(card?.metadata?.owner).toBe('test-user');
    });

    it('should initialize cleanup strategy with label selector', async () => {
      await manager.initialize({
        systemId: 'test-system-004',
        created: '2025-01-20T10:00:00Z',
        platform: testPlatform,
        bootstrapContext: testContext,
      });

      const card = manager.getCurrentCard();
      expect(card?.cleanup.strategy).toBe('label-based');
      expect(card?.cleanup.labelSelector).toEqual({
        'managed-by': 'mcp-adr-server',
        'bootstrap-id': 'test-bootstrap-123',
      });
    });
  });

  describe('Resource Management', () => {
    beforeEach(async () => {
      await manager.initialize({
        systemId: 'test-system-resources',
        created: '2025-01-20T10:00:00Z',
        platform: testPlatform,
        bootstrapContext: testContext,
      });
    });

    it('should add a single resource', async () => {
      const resource: ResourceRecord = {
        type: 'namespace',
        name: 'test-namespace',
        created: '2025-01-20T10:05:00Z',
        createdByTask: 'create-namespace',
        cleanupCommand: 'kubectl delete namespace test-namespace',
      };

      await manager.addResources([resource]);

      const resources = manager.getResourcesByType('namespace');
      expect(resources).toHaveLength(1);
      expect(resources[0].name).toBe('test-namespace');
    });

    it('should add multiple resources', async () => {
      const resources: ResourceRecord[] = [
        {
          type: 'namespace',
          name: 'app-namespace',
          created: '2025-01-20T10:05:00Z',
          createdByTask: 'create-namespace',
          cleanupCommand: 'kubectl delete namespace app-namespace',
        },
        {
          type: 'deployment',
          name: 'app-deployment',
          namespace: 'app-namespace',
          created: '2025-01-20T10:10:00Z',
          createdByTask: 'deploy-app',
          cleanupCommand: 'kubectl delete deployment app-deployment -n app-namespace',
        },
      ];

      await manager.addResources(resources);

      expect(manager.getResourceCount()).toBe(2);
      expect(manager.getResourcesByType('namespace')).toHaveLength(1);
      expect(manager.getResourcesByType('deployment')).toHaveLength(1);
    });

    it('should not add duplicate resources', async () => {
      const resource: ResourceRecord = {
        type: 'service',
        name: 'test-service',
        namespace: 'default',
        created: '2025-01-20T10:15:00Z',
        createdByTask: 'create-service',
        cleanupCommand: 'kubectl delete service test-service -n default',
      };

      await manager.addResources([resource]);
      await manager.addResources([resource]); // Try to add again

      const resources = manager.getResourcesByType('service');
      expect(resources).toHaveLength(1);
    });

    it('should add phase context to resources', async () => {
      const resource: ResourceRecord = {
        type: 'configmap',
        name: 'test-config',
        namespace: 'default',
        created: '2025-01-20T10:20:00Z',
        createdByTask: 'create-config',
        cleanupCommand: 'kubectl delete configmap test-config -n default',
      };

      await manager.addResources([resource], {
        phase: 'infrastructure',
        taskId: 'setup-config',
      });

      const resources = manager.getResourcesByType('configmap');
      expect(resources[0].createdByPhase).toBe('infrastructure');
      // TaskId is not overridden if already set
      expect(resources[0].createdByTask).toBe('create-config');
    });

    it('should remove a resource', async () => {
      const resource: ResourceRecord = {
        type: 'secret',
        name: 'test-secret',
        namespace: 'default',
        created: '2025-01-20T10:25:00Z',
        createdByTask: 'create-secret',
        cleanupCommand: 'kubectl delete secret test-secret -n default',
      };

      await manager.addResources([resource]);
      expect(manager.getResourceCount()).toBe(1);

      await manager.removeResource('secret', 'test-secret', 'default');
      expect(manager.getResourceCount()).toBe(0);
    });

    it('should get resources by task ID', async () => {
      const resources: ResourceRecord[] = [
        {
          type: 'deployment',
          name: 'app1',
          namespace: 'default',
          created: '2025-01-20T10:30:00Z',
          createdByTask: 'deploy-apps',
          cleanupCommand: 'kubectl delete deployment app1 -n default',
        },
        {
          type: 'deployment',
          name: 'app2',
          namespace: 'default',
          created: '2025-01-20T10:31:00Z',
          createdByTask: 'deploy-apps',
          cleanupCommand: 'kubectl delete deployment app2 -n default',
        },
        {
          type: 'service',
          name: 'other-service',
          namespace: 'default',
          created: '2025-01-20T10:32:00Z',
          createdByTask: 'deploy-services',
          cleanupCommand: 'kubectl delete service other-service -n default',
        },
      ];

      await manager.addResources(resources);

      const taskResources = manager.getResourcesByTask('deploy-apps');
      expect(taskResources).toHaveLength(2);
      expect(taskResources.every(r => r.createdByTask === 'deploy-apps')).toBe(true);
    });
  });

  describe('Cleanup Phase Generation', () => {
    beforeEach(async () => {
      await manager.initialize({
        systemId: 'test-system-cleanup',
        created: '2025-01-20T10:00:00Z',
        platform: testPlatform,
        bootstrapContext: testContext,
      });
    });

    it('should generate cleanup phases in correct order', async () => {
      const resources: ResourceRecord[] = [
        {
          type: 'namespace',
          name: 'app-ns',
          created: '2025-01-20T10:05:00Z',
          createdByTask: 'create-ns',
          cleanupCommand: 'kubectl delete namespace app-ns',
        },
        {
          type: 'deployment',
          name: 'app-deploy',
          namespace: 'app-ns',
          created: '2025-01-20T10:10:00Z',
          createdByTask: 'deploy-app',
          cleanupCommand: 'kubectl delete deployment app-deploy -n app-ns',
        },
        {
          type: 'service',
          name: 'app-svc',
          namespace: 'app-ns',
          created: '2025-01-20T10:12:00Z',
          createdByTask: 'create-service',
          cleanupCommand: 'kubectl delete service app-svc -n app-ns',
        },
        {
          type: 'ingress',
          name: 'app-ingress',
          namespace: 'app-ns',
          created: '2025-01-20T10:15:00Z',
          createdByTask: 'create-ingress',
          cleanupCommand: 'kubectl delete ingress app-ingress -n app-ns',
        },
      ];

      await manager.addResources(resources);
      const phases = await manager.generateCleanupPhases();

      // Verify correct order: ingress → service → deployment → namespace
      expect(phases).toHaveLength(4);
      expect(phases[0].name).toBe('Delete ingresses');
      expect(phases[1].name).toBe('Delete services');
      expect(phases[2].name).toBe('Delete deployments');
      expect(phases[3].name).toBe('Delete namespaces');
    });

    it('should include correct cleanup commands', async () => {
      const resource: ResourceRecord = {
        type: 'configmap',
        name: 'test-config',
        namespace: 'default',
        created: '2025-01-20T10:20:00Z',
        createdByTask: 'create-config',
        cleanupCommand: 'kubectl delete configmap test-config -n default',
      };

      await manager.addResources([resource]);
      const phases = await manager.generateCleanupPhases();

      expect(phases).toHaveLength(1);
      expect(phases[0].commands).toHaveLength(1);
      expect(phases[0].commands[0].command).toBe('kubectl delete configmap test-config -n default');
      expect(phases[0].commands[0].description).toBe('Delete configmap test-config');
    });

    it('should set phases as parallelizable', async () => {
      const resources: ResourceRecord[] = [
        {
          type: 'deployment',
          name: 'app1',
          namespace: 'default',
          created: '2025-01-20T10:25:00Z',
          createdByTask: 'deploy',
          cleanupCommand: 'kubectl delete deployment app1 -n default',
        },
        {
          type: 'deployment',
          name: 'app2',
          namespace: 'default',
          created: '2025-01-20T10:26:00Z',
          createdByTask: 'deploy',
          cleanupCommand: 'kubectl delete deployment app2 -n default',
        },
      ];

      await manager.addResources(resources);
      const phases = await manager.generateCleanupPhases();

      expect(phases[0].canParallelize).toBe(true);
    });

    it('should estimate cleanup duration', async () => {
      const resources: ResourceRecord[] = [
        {
          type: 'pod',
          name: 'pod1',
          namespace: 'default',
          created: '2025-01-20T10:30:00Z',
          createdByTask: 'create-pods',
          cleanupCommand: 'kubectl delete pod pod1 -n default',
        },
        {
          type: 'pod',
          name: 'pod2',
          namespace: 'default',
          created: '2025-01-20T10:31:00Z',
          createdByTask: 'create-pods',
          cleanupCommand: 'kubectl delete pod pod2 -n default',
        },
        {
          type: 'pod',
          name: 'pod3',
          namespace: 'default',
          created: '2025-01-20T10:32:00Z',
          createdByTask: 'create-pods',
          cleanupCommand: 'kubectl delete pod pod3 -n default',
        },
      ];

      await manager.addResources(resources);
      const phases = await manager.generateCleanupPhases();

      expect(phases[0].estimatedDuration).toMatch(/\d+-\d+ seconds/);
    });
  });

  describe('State Snapshots', () => {
    beforeEach(async () => {
      await manager.initialize({
        systemId: 'test-system-snapshots',
        created: '2025-01-20T10:00:00Z',
        platform: testPlatform,
        bootstrapContext: testContext,
      });
    });

    it('should create a snapshot', async () => {
      const resource: ResourceRecord = {
        type: 'deployment',
        name: 'app',
        namespace: 'default',
        created: '2025-01-20T10:35:00Z',
        createdByTask: 'deploy',
        cleanupCommand: 'kubectl delete deployment app -n default',
      };

      await manager.addResources([resource]);

      const snapshot = await manager.createSnapshot('Before scaling');

      expect(snapshot.beforeAction).toBe('Before scaling');
      expect(snapshot.resourceCount).toBe(1);
      expect(snapshot.checksum).toBeTruthy();
      expect(snapshot.timestamp).toBeTruthy();
    });

    it('should store snapshots in SystemCard', async () => {
      await manager.createSnapshot('Initial state');
      await manager.createSnapshot('After deployment');

      const card = manager.getCurrentCard();
      expect(card?.snapshots).toHaveLength(2);
      expect(card?.snapshots?.[0].beforeAction).toBe('Initial state');
      expect(card?.snapshots?.[1].beforeAction).toBe('After deployment');
    });
  });

  describe('Persistence', () => {
    it('should load an existing SystemCard', async () => {
      await manager.initialize({
        systemId: 'test-system-load',
        created: '2025-01-20T10:00:00Z',
        platform: testPlatform,
        bootstrapContext: testContext,
      });

      const resource: ResourceRecord = {
        type: 'service',
        name: 'test-service',
        namespace: 'default',
        created: '2025-01-20T10:40:00Z',
        createdByTask: 'create-service',
        cleanupCommand: 'kubectl delete service test-service -n default',
      };

      await manager.addResources([resource]);

      // Create new manager instance and load
      const manager2 = new SystemCardManager(tempDir);
      const loadedCard = await manager2.load();

      expect(loadedCard).toBeTruthy();
      expect(loadedCard?.systemId).toBe('test-system-load');
      expect(manager2.getResourceCount()).toBe(1);
    });

    it('should return null for non-existent SystemCard', async () => {
      const manager2 = new SystemCardManager(tempDir);
      const card = await manager2.load();

      expect(card).toBeNull();
    });

    it('should update lastUpdated timestamp on save', async () => {
      await manager.initialize({
        systemId: 'test-system-timestamp',
        created: '2025-01-20T10:00:00Z',
        platform: testPlatform,
        bootstrapContext: testContext,
      });

      const initialCard = manager.getCurrentCard();
      const initialTimestamp = initialCard?.lastUpdated;

      // Wait a bit
      await new Promise(resolve => setTimeout(resolve, 10));

      const resource: ResourceRecord = {
        type: 'pod',
        name: 'test-pod',
        namespace: 'default',
        created: '2025-01-20T10:45:00Z',
        createdByTask: 'create-pod',
        cleanupCommand: 'kubectl delete pod test-pod -n default',
      };

      await manager.addResources([resource]);

      const updatedCard = manager.getCurrentCard();
      expect(updatedCard?.lastUpdated).not.toBe(initialTimestamp);
    });

    it('should check if SystemCard exists', async () => {
      let exists = await manager.exists();
      expect(exists).toBe(false);

      await manager.initialize({
        systemId: 'test-system-exists',
        created: '2025-01-20T10:00:00Z',
        platform: testPlatform,
        bootstrapContext: testContext,
      });

      exists = await manager.exists();
      expect(exists).toBe(true);
    });

    it('should delete SystemCard', async () => {
      await manager.initialize({
        systemId: 'test-system-delete',
        created: '2025-01-20T10:00:00Z',
        platform: testPlatform,
        bootstrapContext: testContext,
      });

      let exists = await manager.exists();
      expect(exists).toBe(true);

      await manager.delete();

      exists = await manager.exists();
      expect(exists).toBe(false);
      expect(manager.getCurrentCard()).toBeNull();
    });
  });

  describe('Resource Counting', () => {
    beforeEach(async () => {
      await manager.initialize({
        systemId: 'test-system-count',
        created: '2025-01-20T10:00:00Z',
        platform: testPlatform,
        bootstrapContext: testContext,
      });
    });

    it('should count total resources correctly', async () => {
      const resources: ResourceRecord[] = [
        {
          type: 'namespace',
          name: 'ns1',
          created: '2025-01-20T10:50:00Z',
          createdByTask: 'create-ns',
          cleanupCommand: 'kubectl delete namespace ns1',
        },
        {
          type: 'deployment',
          name: 'deploy1',
          namespace: 'ns1',
          created: '2025-01-20T10:51:00Z',
          createdByTask: 'deploy',
          cleanupCommand: 'kubectl delete deployment deploy1 -n ns1',
        },
        {
          type: 'service',
          name: 'svc1',
          namespace: 'ns1',
          created: '2025-01-20T10:52:00Z',
          createdByTask: 'create-svc',
          cleanupCommand: 'kubectl delete service svc1 -n ns1',
        },
      ];

      await manager.addResources(resources);

      expect(manager.getResourceCount()).toBe(3);
    });

    it('should return 0 for empty SystemCard', async () => {
      expect(manager.getResourceCount()).toBe(0);
    });
  });
});
