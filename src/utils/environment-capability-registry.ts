/**
 * Environment Capability Registry
 *
 * Auto-detects and queries available runtime environment capabilities:
 * - Kubernetes/OpenShift clusters
 * - Docker/Podman containers
 * - Operating system resources
 * - Red Hat tooling (Ansible, etc.)
 */

import { exec } from 'child_process';
import { promisify } from 'util';
import * as os from 'os';
import { EnhancedLogger } from './enhanced-logging.js';

const execAsync = promisify(exec);

export interface EnvironmentCapability {
  name: string;
  type: 'kubernetes' | 'openshift' | 'docker' | 'podman' | 'os' | 'ansible' | 'cloud' | 'database';
  detector: () => Promise<boolean>;
  executor: (query: string) => Promise<any>;
  metadata?: {
    version?: string;
    provider?: string;
    available?: boolean;
  };
}

export interface CapabilityQueryResult {
  capability: string;
  found: boolean;
  data: any;
  confidence: number;
  timestamp: string;
}

export class EnvironmentCapabilityRegistry {
  private capabilities: Map<string, EnvironmentCapability> = new Map();
  private logger: EnhancedLogger;
  private projectPath: string;
  private discoveryComplete: boolean = false;

  constructor(projectPath?: string) {
    this.logger = new EnhancedLogger();
    this.projectPath = projectPath || process.cwd();
  }

  /**
   * Discover all available environment capabilities
   */
  async discoverCapabilities(): Promise<void> {
    if (this.discoveryComplete) {
      return;
    }

    this.logger.info('Starting environment capability discovery', 'EnvironmentCapabilityRegistry');

    // Register all known capabilities
    await this.registerOSCapability();
    await this.registerDockerCapability();
    await this.registerPodmanCapability();
    await this.registerKubernetesCapability();
    await this.registerOpenShiftCapability();
    await this.registerAnsibleCapability();

    this.discoveryComplete = true;

    const availableCapabilities = this.listCapabilities();
    this.logger.info(
      `Discovery complete: ${availableCapabilities.length} capabilities available`,
      'EnvironmentCapabilityRegistry',
      { capabilities: availableCapabilities }
    );
  }

  /**
   * Register Operating System capability (always available)
   */
  private async registerOSCapability(): Promise<void> {
    const capability: EnvironmentCapability = {
      name: 'operating-system',
      type: 'os',
      detector: async () => true, // Always available

      executor: async (query: string) => {
        const queryLower = query.toLowerCase();
        const result: any = {
          platform: process.platform,
          arch: os.arch(),
          release: os.release(),
          type: os.type(),
        };

        if (queryLower.includes('cpu') || queryLower.includes('processor')) {
          result.cpus = os.cpus();
          result.cpuCount = os.cpus().length;
        }

        if (queryLower.includes('memory') || queryLower.includes('ram')) {
          result.totalMemory = os.totalmem();
          result.freeMemory = os.freemem();
          result.memoryUsagePercent = ((os.totalmem() - os.freemem()) / os.totalmem()) * 100;
        }

        if (queryLower.includes('disk') || queryLower.includes('storage')) {
          try {
            const { stdout } = await execAsync('df -h');
            result.diskUsage = stdout;
          } catch {
            result.diskUsage = 'Unable to query disk usage';
          }
        }

        if (queryLower.includes('network')) {
          result.networkInterfaces = os.networkInterfaces();
        }

        return result;
      },

      metadata: {
        version: os.release(),
        provider: os.type(),
        available: true,
      },
    };

    await this.registerCapability(capability);
  }

  /**
   * Register Docker capability
   */
  private async registerDockerCapability(): Promise<void> {
    const capability: EnvironmentCapability = {
      name: 'docker',
      type: 'docker',

      detector: async () => {
        try {
          await execAsync('docker version --format "{{.Server.Version}}"', { timeout: 5000 });
          return true;
        } catch {
          return false;
        }
      },

      executor: async (query: string) => {
        const queryLower = query.toLowerCase();
        const result: any = {};

        try {
          if (
            queryLower.includes('container') ||
            queryLower.includes('running') ||
            queryLower.includes('status')
          ) {
            const { stdout: ps } = await execAsync('docker ps --format json');
            result.runningContainers = ps
              .trim()
              .split('\n')
              .filter(line => line)
              .map(line => JSON.parse(line));
          }

          if (queryLower.includes('image')) {
            const { stdout: images } = await execAsync('docker images --format json');
            result.images = images
              .trim()
              .split('\n')
              .filter(line => line)
              .map(line => JSON.parse(line));
          }

          if (queryLower.includes('network')) {
            const { stdout: networks } = await execAsync('docker network ls --format json');
            result.networks = networks
              .trim()
              .split('\n')
              .filter(line => line)
              .map(line => JSON.parse(line));
          }

          if (queryLower.includes('volume')) {
            const { stdout: volumes } = await execAsync('docker volume ls --format json');
            result.volumes = volumes
              .trim()
              .split('\n')
              .filter(line => line)
              .map(line => JSON.parse(line));
          }

          return result;
        } catch (_error) {
          return { error: 'Failed to query Docker', details: (_error as Error).message };
        }
      },
    };

    await this.registerCapability(capability);
  }

  /**
   * Register Podman capability (Red Hat container runtime)
   */
  private async registerPodmanCapability(): Promise<void> {
    const capability: EnvironmentCapability = {
      name: 'podman',
      type: 'podman',

      detector: async () => {
        try {
          await execAsync('podman version --format json', { timeout: 5000 });
          return true;
        } catch {
          return false;
        }
      },

      executor: async (query: string) => {
        const queryLower = query.toLowerCase();
        const result: any = {};

        try {
          if (
            queryLower.includes('container') ||
            queryLower.includes('pod') ||
            queryLower.includes('running')
          ) {
            const { stdout: ps } = await execAsync('podman ps --format json');
            result.runningContainers = JSON.parse(ps);

            // Check for pods (unique to Podman)
            const { stdout: pods } = await execAsync('podman pod ps --format json');
            result.pods = JSON.parse(pods);
          }

          if (queryLower.includes('image')) {
            const { stdout: images } = await execAsync('podman images --format json');
            result.images = JSON.parse(images);
          }

          if (queryLower.includes('network')) {
            const { stdout: networks } = await execAsync('podman network ls --format json');
            result.networks = JSON.parse(networks);
          }

          return result;
        } catch (_error) {
          return { error: 'Failed to query Podman', details: (_error as Error).message };
        }
      },
    };

    await this.registerCapability(capability);
  }

  /**
   * Register Kubernetes capability
   */
  private async registerKubernetesCapability(): Promise<void> {
    const capability: EnvironmentCapability = {
      name: 'kubernetes',
      type: 'kubernetes',

      detector: async () => {
        try {
          await execAsync('kubectl version --client --output=json', { timeout: 5000 });
          return true;
        } catch {
          return false;
        }
      },

      executor: async (query: string) => {
        const queryLower = query.toLowerCase();
        const result: any = {};

        try {
          // Get current context
          const { stdout: context } = await execAsync('kubectl config current-context');
          result.currentContext = context.trim();

          if (queryLower.includes('pod')) {
            const { stdout: pods } = await execAsync(
              'kubectl get pods --all-namespaces -o json'
            );
            result.pods = JSON.parse(pods);
          }

          if (queryLower.includes('deployment')) {
            const { stdout: deployments } = await execAsync(
              'kubectl get deployments --all-namespaces -o json'
            );
            result.deployments = JSON.parse(deployments);
          }

          if (queryLower.includes('service')) {
            const { stdout: services } = await execAsync(
              'kubectl get services --all-namespaces -o json'
            );
            result.services = JSON.parse(services);
          }

          if (queryLower.includes('node')) {
            const { stdout: nodes } = await execAsync('kubectl get nodes -o json');
            result.nodes = JSON.parse(nodes);
          }

          if (queryLower.includes('namespace')) {
            const { stdout: namespaces } = await execAsync('kubectl get namespaces -o json');
            result.namespaces = JSON.parse(namespaces);
          }

          if (
            queryLower.includes('resource') ||
            queryLower.includes('usage') ||
            queryLower.includes('metrics')
          ) {
            try {
              const { stdout: metrics } = await execAsync('kubectl top nodes');
              result.nodeMetrics = metrics;
            } catch {
              result.nodeMetrics = 'Metrics server not available';
            }
          }

          return result;
        } catch (_error) {
          return { error: 'Failed to query Kubernetes', details: (_error as Error).message };
        }
      },
    };

    await this.registerCapability(capability);
  }

  /**
   * Register OpenShift capability (Red Hat Kubernetes distribution)
   */
  private async registerOpenShiftCapability(): Promise<void> {
    const capability: EnvironmentCapability = {
      name: 'openshift',
      type: 'openshift',

      detector: async () => {
        try {
          await execAsync('oc version --client -o json', { timeout: 5000 });
          return true;
        } catch {
          return false;
        }
      },

      executor: async (query: string) => {
        const queryLower = query.toLowerCase();
        const result: any = {};

        try {
          // Get current project (OpenShift terminology for namespace)
          const { stdout: project } = await execAsync('oc project -q');
          result.currentProject = project.trim();

          // Get cluster info
          const { stdout: version } = await execAsync('oc version -o json');
          result.version = JSON.parse(version);

          if (queryLower.includes('pod')) {
            const { stdout: pods } = await execAsync('oc get pods --all-namespaces -o json');
            result.pods = JSON.parse(pods);
          }

          if (queryLower.includes('deployment') || queryLower.includes('dc')) {
            const { stdout: dc } = await execAsync('oc get dc --all-namespaces -o json');
            result.deploymentConfigs = JSON.parse(dc);
          }

          if (queryLower.includes('route')) {
            const { stdout: routes } = await execAsync('oc get routes --all-namespaces -o json');
            result.routes = JSON.parse(routes);
          }

          if (queryLower.includes('build') || queryLower.includes('buildconfig')) {
            const { stdout: builds } = await execAsync('oc get builds --all-namespaces -o json');
            result.builds = JSON.parse(builds);
          }

          if (queryLower.includes('project') || queryLower.includes('namespace')) {
            const { stdout: projects } = await execAsync('oc get projects -o json');
            result.projects = JSON.parse(projects);
          }

          return result;
        } catch (_error) {
          return { error: 'Failed to query OpenShift', details: (_error as Error).message };
        }
      },
    };

    await this.registerCapability(capability);
  }

  /**
   * Register Ansible capability (Red Hat automation)
   */
  private async registerAnsibleCapability(): Promise<void> {
    const capability: EnvironmentCapability = {
      name: 'ansible',
      type: 'ansible',

      detector: async () => {
        try {
          await execAsync('ansible --version', { timeout: 5000 });
          return true;
        } catch {
          return false;
        }
      },

      executor: async (query: string) => {
        const queryLower = query.toLowerCase();
        const result: any = {};

        try {
          // Get Ansible version
          const { stdout: version } = await execAsync('ansible --version');
          result.version = version;

          if (queryLower.includes('inventory') || queryLower.includes('host')) {
            try {
              const { stdout: inventory } = await execAsync('ansible-inventory --list');
              result.inventory = JSON.parse(inventory);
            } catch {
              result.inventory = 'No inventory file found';
            }
          }

          if (queryLower.includes('playbook')) {
            try {
              const { stdout: playbooks } = await execAsync(
                `find ${this.projectPath} -name "*.yml" -o -name "*.yaml" | grep -E "(playbook|play)" | head -20`
              );
              result.playbooks = playbooks.trim().split('\n').filter(Boolean);
            } catch {
              result.playbooks = [];
            }
          }

          if (queryLower.includes('role')) {
            try {
              const { stdout: roles } = await execAsync(
                `find ${this.projectPath} -type d -name "roles" | head -10`
              );
              result.roles = roles.trim().split('\n').filter(Boolean);
            } catch {
              result.roles = [];
            }
          }

          return result;
        } catch (_error) {
          return { error: 'Failed to query Ansible', details: (_error as Error).message };
        }
      },
    };

    await this.registerCapability(capability);
  }

  /**
   * Register a capability if it's available
   */
  async registerCapability(capability: EnvironmentCapability): Promise<void> {
    try {
      const isAvailable = await capability.detector();

      if (isAvailable) {
        this.capabilities.set(capability.name, capability);

        // Update metadata
        if (capability.metadata) {
          capability.metadata.available = true;
        }

        this.logger.info(
          `✅ Capability registered: ${capability.name}`,
          'EnvironmentCapabilityRegistry'
        );
      } else {
        this.logger.debug(
          `❌ Capability not available: ${capability.name}`,
          'EnvironmentCapabilityRegistry'
        );
      }
    } catch (_error) {
      this.logger.warn(
        `Failed to register capability: ${capability.name}`,
        'EnvironmentCapabilityRegistry'
      );
    }
  }

  /**
   * Query capabilities for research question
   */
  async query(question: string): Promise<CapabilityQueryResult[]> {
    const results: CapabilityQueryResult[] = [];

    // Match capabilities to question
    const relevantCapabilities = this.matchCapabilities(question);

    for (const capability of relevantCapabilities) {
      try {
        const data = await capability.executor(question);

        results.push({
          capability: capability.name,
          found: data && Object.keys(data).length > 0 && !data.error,
          data,
          confidence: this.calculateCapabilityConfidence(data),
          timestamp: new Date().toISOString(),
        });
      } catch (_error) {
        this.logger.warn(
          `Failed to query capability: ${capability.name}`,
          'EnvironmentCapabilityRegistry'
        );
      }
    }

    return results;
  }

  /**
   * Match capabilities to question
   */
  private matchCapabilities(question: string): EnvironmentCapability[] {
    const questionLower = question.toLowerCase();
    const matched: EnvironmentCapability[] = [];

    for (const capability of this.capabilities.values()) {
      // Check if question mentions capability name
      if (questionLower.includes(capability.name) || questionLower.includes(capability.type)) {
        matched.push(capability);
        continue;
      }

      // Check for related keywords
      const keywords = this.getCapabilityKeywords(capability.type);
      if (keywords.some(keyword => questionLower.includes(keyword))) {
        matched.push(capability);
      }
    }

    return matched;
  }

  /**
   * Get keywords for capability type
   */
  private getCapabilityKeywords(type: string): string[] {
    const keywordMap: Record<string, string[]> = {
      kubernetes: ['k8s', 'pod', 'deployment', 'service', 'cluster'],
      openshift: ['ocp', 'route', 'buildconfig', 'project'],
      docker: ['container', 'image', 'volume'],
      podman: ['pod', 'container', 'image'],
      ansible: ['playbook', 'inventory', 'role', 'automation'],
      os: ['system', 'cpu', 'memory', 'disk', 'network', 'os'],
    };

    return keywordMap[type] || [];
  }

  /**
   * Calculate confidence for capability data
   */
  private calculateCapabilityConfidence(data: any): number {
    if (!data || data.error) return 0;

    const keys = Object.keys(data);
    if (keys.length === 0) return 0;

    // Higher confidence for more data points
    return Math.min(0.5 + keys.length * 0.1, 0.95);
  }

  /**
   * List all available capabilities
   */
  listCapabilities(): string[] {
    return Array.from(this.capabilities.keys());
  }

  /**
   * Check if capability is available
   */
  has(capabilityName: string): boolean {
    return this.capabilities.has(capabilityName);
  }

  /**
   * Get capability metadata
   */
  getCapabilityMetadata(capabilityName: string): any {
    const capability = this.capabilities.get(capabilityName);
    return capability?.metadata || null;
  }
}