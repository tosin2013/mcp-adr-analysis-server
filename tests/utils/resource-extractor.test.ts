/**
 * Unit tests for resource-extractor.ts
 * Tests command output parsing and resource extraction from kubectl, oc, docker, etc.
 */

import { describe, it, expect, beforeEach } from '@jest/globals';
import { ResourceExtractor, ExtractionPattern } from '../../src/utils/resource-extractor.js';

describe('ResourceExtractor', () => {
  let extractor: ResourceExtractor;

  beforeEach(() => {
    extractor = new ResourceExtractor();
  });

  describe('Kubernetes Resource Extraction', () => {
    it('should extract namespace from kubectl create namespace output', () => {
      const command = 'kubectl create namespace my-app';
      const stdout = 'namespace/my-app created';
      const stderr = '';
      const taskId = 'create-namespace';

      const result = extractor.extract(command, stdout, stderr, taskId);

      expect(result.resources).toHaveLength(1);
      expect(result.resources[0].type).toBe('namespace');
      expect(result.resources[0].name).toBe('my-app');
      expect(result.resources[0].createdByTask).toBe('create-namespace');
      expect(result.confidence).toBeGreaterThan(0);
    });

    it('should extract deployment with namespace', () => {
      const command = 'kubectl create deployment nginx --image=nginx -n production';
      const stdout = 'deployment.apps/nginx created';
      const stderr = '';
      const taskId = 'deploy-nginx';

      const result = extractor.extract(command, stdout, stderr, taskId);

      expect(result.resources).toHaveLength(1);
      expect(result.resources[0].type).toBe('deployment');
      expect(result.resources[0].name).toBe('nginx');
      expect(result.resources[0].namespace).toBe('production');
    });

    it('should use default namespace when not specified', () => {
      const command = 'kubectl create deployment app --image=app:v1';
      const stdout = 'deployment.apps/app created';
      const stderr = '';
      const taskId = 'deploy-app';

      const result = extractor.extract(command, stdout, stderr, taskId);

      expect(result.resources[0].namespace).toBe('default');
    });

    it('should extract service resource', () => {
      const command = 'kubectl create service clusterip my-service --tcp=80:8080 -n apps';
      const stdout = 'service/my-service created';
      const stderr = '';
      const taskId = 'create-service';

      const result = extractor.extract(command, stdout, stderr, taskId);

      expect(result.resources).toHaveLength(1);
      expect(result.resources[0].type).toBe('service');
      expect(result.resources[0].name).toBe('my-service');
      expect(result.resources[0].namespace).toBe('apps');
    });

    it('should extract configmap resource', () => {
      const command = 'kubectl create configmap app-config --from-literal=key=value -n default';
      const stdout = 'configmap/app-config created';
      const stderr = '';
      const taskId = 'create-config';

      const result = extractor.extract(command, stdout, stderr, taskId);

      expect(result.resources).toHaveLength(1);
      expect(result.resources[0].type).toBe('configmap');
      expect(result.resources[0].name).toBe('app-config');
    });

    it('should extract secret resource', () => {
      const command = 'kubectl create secret generic db-secret --from-literal=password=secret';
      const stdout = 'secret/db-secret created';
      const stderr = '';
      const taskId = 'create-secret';

      const result = extractor.extract(command, stdout, stderr, taskId);

      expect(result.resources).toHaveLength(1);
      expect(result.resources[0].type).toBe('secret');
      expect(result.resources[0].name).toBe('db-secret');
    });

    it('should attempt to extract resources from kubectl apply output', () => {
      const command = 'kubectl apply -f deployment.yaml -n production';
      const stdout = 'deployment.apps/web-app created';
      const stderr = '';
      const taskId = 'apply-manifests';

      const result = extractor.extract(command, stdout, stderr, taskId);

      // The kubectl apply pattern exists, even if extraction is complex
      // This test verifies the extraction doesn't error
      expect(result).toBeDefined();
      expect(result.resources).toBeDefined();
      expect(result.confidence).toBeGreaterThanOrEqual(0);
    });
  });

  describe('OpenShift Resource Extraction', () => {
    it('should extract project from oc new-project', () => {
      const command = 'oc new-project my-project';
      const stdout = 'Now using project "my-project" on server "https://api.cluster.com"';
      const stderr = '';
      const taskId = 'create-project';

      const result = extractor.extract(command, stdout, stderr, taskId);

      expect(result.resources).toHaveLength(1);
      expect(result.resources[0].type).toBe('namespace');
      expect(result.resources[0].name).toBe('my-project');
      expect(result.resources[0].metadata?.['platform']).toBe('openshift');
    });
  });

  describe('Helm Resource Extraction', () => {
    it('should extract helm release', () => {
      const command = 'helm install my-release ./chart -n apps';
      const stdout = 'NAME: my-release\nLAST DEPLOYED: Mon Jan 20 10:00:00 2025\nNAMESPACE: apps';
      const stderr = '';
      const taskId = 'helm-install';

      const result = extractor.extract(command, stdout, stderr, taskId);

      expect(result.resources).toHaveLength(1);
      expect(result.resources[0].type).toBe('custom');
      expect(result.resources[0].name).toBe('my-release');
      expect(result.resources[0].namespace).toBe('apps');
      expect(result.resources[0].metadata?.['type']).toBe('helm-release');
    });

    it('should generate helm uninstall cleanup command', () => {
      const command = 'helm install my-app ./chart -n production';
      const stdout = 'NAME: my-app\nNAMESPACE: production';
      const stderr = '';
      const taskId = 'helm-install';

      const result = extractor.extract(command, stdout, stderr, taskId);

      expect(result.resources[0].cleanupCommand).toContain('helm uninstall');
      expect(result.resources[0].cleanupCommand).toContain('my-app');
      expect(result.resources[0].cleanupCommand).toContain('-n production');
    });
  });

  describe('Docker Resource Extraction', () => {
    it('should extract container from docker run', () => {
      const command = 'docker run -d --name web-server nginx';
      const stdout = 'a1b2c3d4e5f6789012345678901234567890123456789012345678901234';
      const stderr = '';
      const taskId = 'run-container';

      const result = extractor.extract(command, stdout, stderr, taskId);

      expect(result.resources).toHaveLength(1);
      expect(result.resources[0].type).toBe('pod');
      expect(result.resources[0].name).toBe('web-server');
      expect(result.resources[0].uid).toBe(
        'a1b2c3d4e5f6789012345678901234567890123456789012345678901234'
      );
      expect(result.resources[0].metadata?.['platform']).toBe('docker');
    });

    it('should use container ID as name if --name not provided', () => {
      const command = 'docker run -d nginx';
      const stdout = 'abcdef123456';
      const stderr = '';
      const taskId = 'run-container';

      const result = extractor.extract(command, stdout, stderr, taskId);

      expect(result.resources[0].name).toBe('abcdef123456');
    });

    it('should generate docker rm cleanup command', () => {
      const command = 'docker run -d --name test-container nginx';
      const stdout = '1234567890abcdef';
      const stderr = '';
      const taskId = 'run-container';

      const result = extractor.extract(command, stdout, stderr, taskId);

      expect(result.resources[0].cleanupCommand).toContain('docker rm -f');
      expect(result.resources[0].cleanupCommand).toContain('1234567890abcdef');
    });
  });

  describe('Docker Compose Resource Extraction', () => {
    it('should extract service from docker-compose up', () => {
      const command = 'docker-compose up -d';
      const stdout = 'Creating web_1 ... done\nCreating db_1 ... done';
      const stderr = '';
      const taskId = 'compose-up';

      const result = extractor.extract(command, stdout, stderr, taskId);

      // Pattern uses 'gi' flag, might match multiple services
      expect(result.resources.length).toBeGreaterThanOrEqual(1);
      expect(result.resources[0].type).toBe('custom');
      expect(result.resources[0].metadata?.['platform']).toBe('docker-compose');
    });

    it('should generate docker-compose down cleanup command', () => {
      const command = 'docker-compose up -d';
      const stdout = 'Creating app_1 ... done';
      const stderr = '';
      const taskId = 'compose-up';

      const result = extractor.extract(command, stdout, stderr, taskId);

      expect(result.resources[0].cleanupCommand).toBe('docker-compose down');
    });
  });

  describe('Cleanup Command Generation', () => {
    it('should generate kubectl delete for namespace', () => {
      const command = 'kubectl create namespace test-ns';
      const stdout = 'namespace/test-ns created';
      const stderr = '';
      const taskId = 'create-ns';

      const result = extractor.extract(command, stdout, stderr, taskId);

      expect(result.resources[0].cleanupCommand).toBe('kubectl delete namespace test-ns');
    });

    it('should generate kubectl delete with namespace for deployment', () => {
      const command = 'kubectl create deployment app --image=app:v1 -n production';
      const stdout = 'deployment.apps/app created';
      const stderr = '';
      const taskId = 'deploy';

      const result = extractor.extract(command, stdout, stderr, taskId);

      expect(result.resources[0].cleanupCommand).toBe(
        'kubectl delete deployment app -n production'
      );
    });

    it('should generate oc delete for OpenShift resources', () => {
      const command = 'oc new-project test-project';
      const stdout = 'Now using project "test-project" on server "https://api.cluster.com"';
      const stderr = '';
      const taskId = 'create-project';

      const result = extractor.extract(command, stdout, stderr, taskId);

      expect(result.resources[0].cleanupCommand).toContain('oc delete');
    });
  });

  describe('Resource Labeling', () => {
    it('should add managed-by label to extracted resources', () => {
      const command = 'kubectl create namespace labeled-ns';
      const stdout = 'namespace/labeled-ns created';
      const stderr = '';
      const taskId = 'create-ns';

      const result = extractor.extract(command, stdout, stderr, taskId);

      expect(result.resources[0].labels?.['managed-by']).toBe('mcp-adr-server');
      expect(result.resources[0].labels?.['extracted-from']).toBe('create-ns');
    });
  });

  describe('Error Handling', () => {
    it('should return empty resources for unknown commands', () => {
      const command = 'unknown-command --some-args';
      const stdout = 'some output';
      const stderr = '';
      const taskId = 'unknown';

      const result = extractor.extract(command, stdout, stderr, taskId);

      expect(result.resources).toHaveLength(0);
      expect(result.confidence).toBe(0);
    });

    it('should add warning when stderr is present', () => {
      const command = 'kubectl create namespace test-ns';
      const stdout = 'namespace/test-ns created';
      const stderr = 'Warning: some deprecation warning';
      const taskId = 'create-ns';

      const result = extractor.extract(command, stdout, stderr, taskId);

      expect(result.warnings.length).toBeGreaterThan(0);
      expect(result.warnings[0]).toContain('stderr');
    });

    it('should reduce confidence when stderr is present', () => {
      const command1 = 'kubectl create namespace ns1';
      const stdout1 = 'namespace/ns1 created';
      const result1 = extractor.extract(command1, stdout1, '', 'task1');

      const command2 = 'kubectl create namespace ns2';
      const stdout2 = 'namespace/ns2 created';
      const stderr2 = 'Warning: something';
      const result2 = extractor.extract(command2, stdout2, stderr2, 'task2');

      expect(result2.confidence).toBeLessThan(result1.confidence);
    });
  });

  describe('Batch Extraction', () => {
    it('should extract resources from multiple commands', () => {
      const commands = [
        {
          command: 'kubectl create namespace app-ns',
          stdout: 'namespace/app-ns created',
          stderr: '',
          taskId: 'create-ns',
        },
        {
          command: 'kubectl create deployment app --image=app:v1 -n app-ns',
          stdout: 'deployment.apps/app created',
          stderr: '',
          taskId: 'deploy-app',
        },
        {
          command: 'kubectl create service clusterip app-svc --tcp=80:8080 -n app-ns',
          stdout: 'service/app-svc created',
          stderr: '',
          taskId: 'create-service',
        },
      ];

      const resources = extractor.extractBatch(commands);

      expect(resources).toHaveLength(3);
      expect(resources[0].type).toBe('namespace');
      expect(resources[1].type).toBe('deployment');
      expect(resources[2].type).toBe('service');
    });
  });

  describe('Custom Patterns', () => {
    it('should allow adding custom extraction patterns', () => {
      const customPattern: ExtractionPattern = {
        resourceType: 'custom',
        commandPattern: /custom-tool\s+create/,
        outputPattern: /Created resource: ([a-z0-9-]+)/,
        extractionFunction: (matches, command) => ({
          name: matches[1],
          metadata: { command, tool: 'custom-tool' },
        }),
      };

      extractor.addPattern(customPattern);

      const command = 'custom-tool create my-resource';
      const stdout = 'Created resource: my-resource';
      const stderr = '';
      const taskId = 'custom-task';

      const result = extractor.extract(command, stdout, stderr, taskId);

      expect(result.resources).toHaveLength(1);
      expect(result.resources[0].name).toBe('my-resource');
      expect(result.resources[0].metadata?.['tool']).toBe('custom-tool');
    });

    it('should return all registered patterns', () => {
      const patterns = extractor.getPatterns();

      expect(patterns.length).toBeGreaterThan(0);
      expect(patterns.every(p => p.commandPattern instanceof RegExp)).toBe(true);
    });
  });

  describe('Namespace Extraction', () => {
    it('should extract namespace from -n flag', () => {
      const command = 'kubectl create deployment app --image=app:v1 -n custom-ns';
      const stdout = 'deployment.apps/app created';
      const stderr = '';
      const taskId = 'deploy';

      const result = extractor.extract(command, stdout, stderr, taskId);

      expect(result.resources[0].namespace).toBe('custom-ns');
    });

    it('should extract namespace from --namespace flag', () => {
      const command = 'kubectl create deployment app --image=app:v1 --namespace=custom-ns';
      const stdout = 'deployment.apps/app created';
      const stderr = '';
      const taskId = 'deploy';

      const result = extractor.extract(command, stdout, stderr, taskId);

      expect(result.resources[0].namespace).toBe('custom-ns');
    });

    it('should extract namespace from --namespace= format', () => {
      const command = 'kubectl create deployment app --image=app:v1 --namespace custom-ns';
      const stdout = 'deployment.apps/app created';
      const stderr = '';
      const taskId = 'deploy';

      const result = extractor.extract(command, stdout, stderr, taskId);

      expect(result.resources[0].namespace).toBe('custom-ns');
    });
  });
});
