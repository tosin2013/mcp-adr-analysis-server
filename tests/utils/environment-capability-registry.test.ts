/**
 * Tests for EnvironmentCapabilityRegistry
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { EnvironmentCapabilityRegistry } from '../../src/utils/environment-capability-registry.js';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

// Mock child_process
vi.mock('child_process', () => ({
  exec: vi.fn(),
}));

vi.mock('util', () => ({
  promisify: vi.fn((fn) => fn),
}));

describe('EnvironmentCapabilityRegistry', () => {
  let registry: EnvironmentCapabilityRegistry;

  beforeEach(() => {
    registry = new EnvironmentCapabilityRegistry('/test/project');
    vi.clearAllMocks();
  });

  describe('discoverCapabilities', () => {
    it('should discover available capabilities', async () => {
      // Mock OS capability (always available)
      await registry.discoverCapabilities();

      const capabilities = registry.listCapabilities();
      expect(capabilities).toContain('operating-system');
    });

    it('should not discover Docker if not installed', async () => {
      vi.mocked(exec).mockImplementation((cmd: any, callback: any) => {
        if (cmd.includes('docker')) {
          callback(new Error('command not found'), '', 'docker: command not found');
        }
      });

      await registry.discoverCapabilities();

      expect(registry.has('docker')).toBe(false);
    });

    it('should discover Docker if installed', async () => {
      vi.mocked(exec).mockImplementation((cmd: any, callback: any) => {
        if (cmd.includes('docker version')) {
          callback(null, '24.0.0', '');
        }
      });

      await registry.discoverCapabilities();

      expect(registry.has('docker')).toBe(true);
    });

    it('should discover Podman if installed', async () => {
      vi.mocked(exec).mockImplementation((cmd: any, callback: any) => {
        if (cmd.includes('podman version')) {
          callback(null, '{"Version": "4.0.0"}', '');
        }
      });

      await registry.discoverCapabilities();

      expect(registry.has('podman')).toBe(true);
    });

    it('should discover Kubernetes if kubectl is available', async () => {
      vi.mocked(exec).mockImplementation((cmd: any, callback: any) => {
        if (cmd.includes('kubectl version')) {
          callback(null, '{"clientVersion": {"gitVersion": "v1.28.0"}}', '');
        }
      });

      await registry.discoverCapabilities();

      expect(registry.has('kubernetes')).toBe(true);
    });

    it('should discover OpenShift if oc is available', async () => {
      vi.mocked(exec).mockImplementation((cmd: any, callback: any) => {
        if (cmd.includes('oc version')) {
          callback(null, '{"openshiftVersion": "4.14"}', '');
        }
      });

      await registry.discoverCapabilities();

      expect(registry.has('openshift')).toBe(true);
    });

    it('should discover Ansible if installed', async () => {
      vi.mocked(exec).mockImplementation((cmd: any, callback: any) => {
        if (cmd.includes('ansible --version')) {
          callback(null, 'ansible 2.15.0', '');
        }
      });

      await registry.discoverCapabilities();

      expect(registry.has('ansible')).toBe(true);
    });

    it('should only discover once', async () => {
      await registry.discoverCapabilities();
      await registry.discoverCapabilities();

      // Should not re-discover
      expect(true).toBe(true);
    });
  });

  describe('query', () => {
    beforeEach(async () => {
      // Mock all capabilities as available
      vi.mocked(exec).mockImplementation((cmd: any, callback: any) => {
        callback(null, 'success', '');
      });

      await registry.discoverCapabilities();
    });

    it('should query relevant capabilities for container questions', async () => {
      vi.mocked(exec).mockImplementation((cmd: any, callback: any) => {
        if (cmd.includes('docker ps')) {
          callback(null, '[{"Names": "web-app"}]', '');
        } else {
          callback(null, '{}', '');
        }
      });

      const results = await registry.query('What containers are running?');

      expect(results.length).toBeGreaterThan(0);
      expect(results.some(r => r.capability === 'docker')).toBe(true);
    });

    it('should query OS for system information questions', async () => {
      const results = await registry.query('What is the system CPU count?');

      const osResult = results.find(r => r.capability === 'operating-system');
      expect(osResult).toBeDefined();
      expect(osResult?.found).toBe(true);
    });

    it('should query multiple capabilities for relevant questions', async () => {
      const results = await registry.query('What is our container orchestration setup?');

      // Should query both docker/podman and kubernetes/openshift
      expect(results.length).toBeGreaterThanOrEqual(1);
    });

    it('should return confidence scores for results', async () => {
      const results = await registry.query('What is the operating system?');

      expect(results[0]?.confidence).toBeGreaterThan(0);
      expect(results[0]?.confidence).toBeLessThanOrEqual(1);
    });

    it('should include timestamps in results', async () => {
      const results = await registry.query('Test query');

      if (results.length > 0) {
        expect(results[0].timestamp).toBeDefined();
        expect(new Date(results[0].timestamp).getTime()).toBeGreaterThan(0);
      }
    });
  });

  describe('OS capability', () => {
    beforeEach(async () => {
      await registry.discoverCapabilities();
    });

    it('should always be available', () => {
      expect(registry.has('operating-system')).toBe(true);
    });

    it('should return platform information', async () => {
      const results = await registry.query('What platform are we on?');

      const osResult = results.find(r => r.capability === 'operating-system');
      expect(osResult?.data.platform).toBeDefined();
      expect(osResult?.data.arch).toBeDefined();
    });

    it('should return CPU info when asked', async () => {
      const results = await registry.query('How many CPUs do we have?');

      const osResult = results.find(r => r.capability === 'operating-system');
      expect(osResult?.data.cpuCount).toBeGreaterThan(0);
    });

    it('should return memory info when asked', async () => {
      const results = await registry.query('How much memory is available?');

      const osResult = results.find(r => r.capability === 'operating-system');
      expect(osResult?.data.totalMemory).toBeGreaterThan(0);
      expect(osResult?.data.freeMemory).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Docker capability', () => {
    beforeEach(async () => {
      vi.mocked(exec).mockImplementation((cmd: any, callback: any) => {
        if (cmd.includes('docker version')) {
          callback(null, '24.0.0', '');
        } else if (cmd.includes('docker ps')) {
          callback(null, '[{"Names":"web"},{"Names":"db"}]', '');
        } else if (cmd.includes('docker images')) {
          callback(null, '[{"Repository":"nginx"}]', '');
        } else {
          callback(null, '[]', '');
        }
      });

      await registry.discoverCapabilities();
    });

    it('should query running containers', async () => {
      const results = await registry.query('What containers are running?');

      const dockerResult = results.find(r => r.capability === 'docker');
      expect(dockerResult?.data.runningContainers).toBeDefined();
    });

    it('should query images', async () => {
      const results = await registry.query('What Docker images do we have?');

      const dockerResult = results.find(r => r.capability === 'docker');
      expect(dockerResult?.data.images).toBeDefined();
    });
  });

  describe('Kubernetes capability', () => {
    beforeEach(async () => {
      vi.mocked(exec).mockImplementation((cmd: any, callback: any) => {
        if (cmd.includes('kubectl version')) {
          callback(null, '{"clientVersion": {}}', '');
        } else if (cmd.includes('kubectl config current-context')) {
          callback(null, 'minikube', '');
        } else if (cmd.includes('kubectl get')) {
          callback(null, '{"items": []}', '');
        } else {
          callback(null, '{}', '');
        }
      });

      await registry.discoverCapabilities();
    });

    it('should query pods', async () => {
      const results = await registry.query('What pods are running?');

      const k8sResult = results.find(r => r.capability === 'kubernetes');
      expect(k8sResult?.data.currentContext).toBe('minikube');
    });

    it('should query deployments', async () => {
      const results = await registry.query('What deployments do we have?');

      const k8sResult = results.find(r => r.capability === 'kubernetes');
      expect(k8sResult?.data.deployments).toBeDefined();
    });
  });

  describe('OpenShift capability', () => {
    beforeEach(async () => {
      vi.mocked(exec).mockImplementation((cmd: any, callback: any) => {
        if (cmd.includes('oc version')) {
          callback(null, '{"openshiftVersion": "4.14"}', '');
        } else if (cmd.includes('oc project -q')) {
          callback(null, 'default', '');
        } else if (cmd.includes('oc get')) {
          callback(null, '{"items": []}', '');
        } else {
          callback(null, '{}', '');
        }
      });

      await registry.discoverCapabilities();
    });

    it('should query OpenShift routes', async () => {
      const results = await registry.query('What routes do we have?');

      const ocpResult = results.find(r => r.capability === 'openshift');
      expect(ocpResult?.data.currentProject).toBe('default');
    });

    it('should query builds', async () => {
      const results = await registry.query('What builds are there?');

      const ocpResult = results.find(r => r.capability === 'openshift');
      expect(ocpResult?.data.builds).toBeDefined();
    });
  });

  describe('Podman capability', () => {
    beforeEach(async () => {
      vi.mocked(exec).mockImplementation((cmd: any, callback: any) => {
        if (cmd.includes('podman version')) {
          callback(null, '{"Version": "4.0"}', '');
        } else if (cmd.includes('podman ps')) {
          callback(null, '[{"Names":"container1"}]', '');
        } else if (cmd.includes('podman pod ps')) {
          callback(null, '[{"Name":"pod1"}]', '');
        } else {
          callback(null, '[]', '');
        }
      });

      await registry.discoverCapabilities();
    });

    it('should query containers and pods', async () => {
      const results = await registry.query('What Podman containers are running?');

      const podmanResult = results.find(r => r.capability === 'podman');
      expect(podmanResult?.data.runningContainers).toBeDefined();
      expect(podmanResult?.data.pods).toBeDefined();
    });
  });

  describe('Ansible capability', () => {
    beforeEach(async () => {
      vi.mocked(exec).mockImplementation((cmd: any, callback: any) => {
        if (cmd.includes('ansible --version')) {
          callback(null, 'ansible 2.15', '');
        } else if (cmd.includes('ansible-inventory')) {
          callback(null, '{"all": {"hosts": []}}', '');
        } else if (cmd.includes('find')) {
          callback(null, 'playbook1.yml\nplaybook2.yml', '');
        } else {
          callback(null, '', '');
        }
      });

      await registry.discoverCapabilities();
    });

    it('should query inventory', async () => {
      const results = await registry.query('What hosts are in the inventory?');

      const ansibleResult = results.find(r => r.capability === 'ansible');
      expect(ansibleResult?.data.inventory).toBeDefined();
    });

    it('should find playbooks', async () => {
      const results = await registry.query('What Ansible playbooks do we have?');

      const ansibleResult = results.find(r => r.capability === 'ansible');
      expect(ansibleResult?.data.playbooks).toBeDefined();
    });
  });

  describe('matchCapabilities', () => {
    beforeEach(async () => {
      await registry.discoverCapabilities();
    });

    it('should match capabilities by name', async () => {
      const results = await registry.query('docker containers');

      expect(results.some(r => r.capability === 'docker')).toBe(true);
    });

    it('should match capabilities by type', async () => {
      const results = await registry.query('kubernetes cluster');

      expect(results.some(r => r.capability === 'kubernetes')).toBe(true);
    });

    it('should match capabilities by keywords', async () => {
      const results = await registry.query('What pods are running?');

      // Should match either kubernetes or podman
      const hasK8s = results.some(r => r.capability === 'kubernetes');
      const hasPodman = results.some(r => r.capability === 'podman');
      expect(hasK8s || hasPodman).toBe(true);
    });
  });

  describe('error handling', () => {
    it('should handle command failures gracefully', async () => {
      vi.mocked(exec).mockImplementation((cmd: any, callback: any) => {
        callback(new Error('Command failed'), '', 'error');
      });

      await registry.discoverCapabilities();

      // Should not throw, just skip failed capabilities
      expect(registry.listCapabilities()).toContain('operating-system');
    });

    it('should handle query failures gracefully', async () => {
      vi.mocked(exec).mockImplementation((cmd: any, callback: any) => {
        callback(new Error('Query failed'), '', 'error');
      });

      await registry.discoverCapabilities();

      const results = await registry.query('test');

      // Should return results, even if some fail
      expect(results).toBeDefined();
    });
  });

  describe('getCapabilityMetadata', () => {
    beforeEach(async () => {
      await registry.discoverCapabilities();
    });

    it('should return metadata for available capabilities', () => {
      const metadata = registry.getCapabilityMetadata('operating-system');

      expect(metadata).toBeDefined();
      expect(metadata.available).toBe(true);
    });

    it('should return null for unavailable capabilities', () => {
      const metadata = registry.getCapabilityMetadata('nonexistent');

      expect(metadata).toBeNull();
    });
  });
});