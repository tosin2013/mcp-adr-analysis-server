import { promises as fs } from 'fs';
import * as path from 'path';
import * as yaml from 'js-yaml';
import { EnhancedLogger } from './enhanced-logging.js';

/**
 * Platform information detected during bootstrap
 */
export interface PlatformInfo {
  type: 'kubernetes' | 'openshift' | 'docker-compose' | 'systemd' | 'unknown';
  version?: string;
  detectionConfidence: number;
  namespace?: string;
  clusterInfo?: Record<string, any>;
}

/**
 * Bootstrap context references
 */
export interface BootstrapContext {
  adrPath?: string;
  contextPath?: string;
  validatedPatternId?: string;
  bootstrapId: string;
  initiatedBy?: string;
}

/**
 * Individual resource record
 */
export interface ResourceRecord {
  type:
    | 'namespace'
    | 'deployment'
    | 'service'
    | 'configmap'
    | 'secret'
    | 'ingress'
    | 'statefulset'
    | 'pod'
    | 'persistentvolumeclaim'
    | 'custom';
  name: string;
  namespace?: string;
  uid?: string;
  labels?: Record<string, string>;
  annotations?: Record<string, string>;
  metadata?: Record<string, any>;
  created: string;
  createdByTask: string;
  createdByPhase?: string;
  cleanupCommand: string;
  cleanupOrder?: number;
}

/**
 * Cleanup strategy configuration
 */
export interface CleanupStrategy {
  strategy: 'label-based' | 'explicit' | 'namespace-cascade';
  labelSelector?: Record<string, string>;
  dryRun?: boolean;
  phases: CleanupPhase[];
}

/**
 * Individual cleanup phase
 */
export interface CleanupPhase {
  order: number;
  name: string;
  description?: string;
  commands: CleanupCommand[];
  canParallelize?: boolean;
  estimatedDuration?: string;
}

/**
 * Individual cleanup command
 */
export interface CleanupCommand {
  description: string;
  command: string;
  expectedExitCode?: number;
  continueOnError?: boolean;
  verificationCommand?: string;
}

/**
 * State snapshot for rollback capability
 */
export interface StateSnapshot {
  timestamp: string;
  beforeAction: string;
  resourceCount: number;
  checksum: string;
}

/**
 * Complete SystemCard structure
 */
export interface SystemCard {
  version: string;
  systemId: string;
  created: string;
  lastUpdated?: string;

  platform: PlatformInfo;
  bootstrapContext: BootstrapContext;

  resources: {
    namespaces?: ResourceRecord[];
    deployments?: ResourceRecord[];
    services?: ResourceRecord[];
    configmaps?: ResourceRecord[];
    secrets?: ResourceRecord[];
    ingresses?: ResourceRecord[];
    statefulsets?: ResourceRecord[];
    pods?: ResourceRecord[];
    persistentvolumeclaims?: ResourceRecord[];
    custom?: ResourceRecord[];
  };

  cleanup: CleanupStrategy;
  snapshots?: StateSnapshot[];
  metadata?: {
    tags?: string[];
    description?: string;
    owner?: string;
  };
}

/**
 * Options for SystemCard initialization
 */
export interface SystemCardInitOptions {
  systemId: string;
  created: string;
  platform: PlatformInfo;
  bootstrapContext: BootstrapContext;
  metadata?: {
    tags?: string[];
    description?: string;
    owner?: string;
  };
}

/**
 * Manages SystemCard creation, updates, and persistence
 */
export class SystemCardManager {
  private systemCardPath: string;
  private logger: EnhancedLogger;
  private currentCard: SystemCard | null = null;

  constructor(projectPath: string) {
    this.systemCardPath = path.join(projectPath, 'systemcard.yaml');
    this.logger = new EnhancedLogger();
  }

  /**
   * Initialize a new SystemCard
   */
  async initialize(options: SystemCardInitOptions): Promise<void> {
    try {
      this.currentCard = {
        version: '1.0',
        systemId: options.systemId,
        created: options.created,
        lastUpdated: options.created,
        platform: options.platform,
        bootstrapContext: options.bootstrapContext,
        resources: {},
        cleanup: {
          strategy: 'label-based',
          labelSelector: {
            'managed-by': 'mcp-adr-server',
            'bootstrap-id': options.bootstrapContext.bootstrapId,
          },
          phases: [],
        },
        ...(options.metadata && { metadata: options.metadata }),
      };

      await this.save();
      this.logger.info(`SystemCard initialized: ${this.systemCardPath}`, 'SystemCardManager');
    } catch (error) {
      this.logger.error('Failed to initialize SystemCard', 'SystemCardManager', error as Error);
      throw error;
    }
  }

  /**
   * Load existing SystemCard from disk
   */
  async load(): Promise<SystemCard | null> {
    try {
      const content = await fs.readFile(this.systemCardPath, 'utf-8');
      this.currentCard = yaml.load(content) as SystemCard;
      this.logger.info('SystemCard loaded successfully', 'SystemCardManager');
      return this.currentCard;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        this.logger.warn('SystemCard not found', 'SystemCardManager');
        return null;
      }
      this.logger.error('Failed to load SystemCard', 'SystemCardManager', error as Error);
      throw error;
    }
  }

  /**
   * Save current SystemCard to disk
   */
  async save(): Promise<void> {
    if (!this.currentCard) {
      throw new Error('No SystemCard initialized. Call initialize() first.');
    }

    try {
      this.currentCard.lastUpdated = new Date().toISOString();
      const yamlContent = yaml.dump(this.currentCard, {
        indent: 2,
        lineWidth: -1,
        noRefs: true,
      });

      await fs.writeFile(this.systemCardPath, yamlContent, 'utf-8');
      this.logger.info('SystemCard saved successfully', 'SystemCardManager');
    } catch (error) {
      this.logger.error('Failed to save SystemCard', 'SystemCardManager', error as Error);
      throw error;
    }
  }

  /**
   * Add resources to the SystemCard
   */
  async addResources(
    resources: ResourceRecord[],
    context?: { phase?: string; taskId?: string }
  ): Promise<void> {
    if (!this.currentCard) {
      throw new Error('No SystemCard loaded. Call load() or initialize() first.');
    }

    try {
      for (const resource of resources) {
        // Add phase/task context if provided
        if (context?.phase) {
          resource.createdByPhase = context.phase;
        }
        if (context?.taskId && !resource.createdByTask) {
          resource.createdByTask = context.taskId;
        }

        // Categorize by type
        const category = this.getResourceCategory(resource.type);
        if (!this.currentCard.resources[category]) {
          this.currentCard.resources[category] = [];
        }

        // Check for duplicates
        const exists = this.currentCard.resources[category]!.some(
          r => r.name === resource.name && r.namespace === resource.namespace
        );

        if (!exists) {
          this.currentCard.resources[category]!.push(resource);
          this.logger.info(
            `Added resource: ${resource.type}/${resource.name}`,
            'SystemCardManager'
          );
        }
      }

      await this.save();
    } catch (error) {
      this.logger.error('Failed to add resources', 'SystemCardManager', error as Error);
      throw error;
    }
  }

  /**
   * Remove a resource from the SystemCard
   */
  async removeResource(type: string, name: string, namespace?: string): Promise<void> {
    if (!this.currentCard) {
      throw new Error('No SystemCard loaded.');
    }

    try {
      const category = this.getResourceCategory(type);
      const resources = this.currentCard.resources[category];

      if (resources) {
        const index = resources.findIndex(
          r => r.name === name && (namespace ? r.namespace === namespace : true)
        );

        if (index !== -1) {
          resources.splice(index, 1);
          this.logger.info(`Removed resource: ${type}/${name}`, 'SystemCardManager');
          await this.save();
        }
      }
    } catch (error) {
      this.logger.error('Failed to remove resource', 'SystemCardManager', error as Error);
      throw error;
    }
  }

  /**
   * Generate cleanup phases from current resources
   * Resources are ordered in reverse of typical deployment order
   */
  async generateCleanupPhases(): Promise<CleanupPhase[]> {
    if (!this.currentCard) {
      throw new Error('No SystemCard loaded.');
    }

    try {
      const phases: CleanupPhase[] = [];
      let order = 1;

      // Order of cleanup (reverse of typical deployment)
      const cleanupOrder = [
        'ingresses',
        'services',
        'deployments',
        'statefulsets',
        'pods',
        'configmaps',
        'secrets',
        'persistentvolumeclaims',
        'namespaces',
        'custom',
      ];

      for (const category of cleanupOrder) {
        const resources =
          this.currentCard.resources[category as keyof typeof this.currentCard.resources];

        if (resources && resources.length > 0) {
          const phase: CleanupPhase = {
            order: order++,
            name: `Delete ${category}`,
            description: `Remove all ${category} created during bootstrap`,
            commands: resources.map(r => ({
              description: `Delete ${r.type} ${r.name}`,
              command: r.cleanupCommand,
              expectedExitCode: 0,
              continueOnError: false,
            })),
            canParallelize: true,
            estimatedDuration: `${resources.length * 2}-${resources.length * 5} seconds`,
          };

          phases.push(phase);
        }
      }

      // Update SystemCard with generated cleanup phases
      this.currentCard.cleanup.phases = phases;
      await this.save();

      this.logger.info(`Generated ${phases.length} cleanup phases`, 'SystemCardManager');
      return phases;
    } catch (error) {
      this.logger.error('Failed to generate cleanup phases', 'SystemCardManager', error as Error);
      throw error;
    }
  }

  /**
   * Create a state snapshot for rollback capability
   */
  async createSnapshot(beforeAction: string): Promise<StateSnapshot> {
    if (!this.currentCard) {
      throw new Error('No SystemCard loaded.');
    }

    try {
      const resourceCount = Object.values(this.currentCard.resources)
        .filter(arr => Array.isArray(arr))
        .reduce((sum, arr) => sum + arr.length, 0);

      const checksum = this.calculateChecksum(this.currentCard);

      const snapshot: StateSnapshot = {
        timestamp: new Date().toISOString(),
        beforeAction,
        resourceCount,
        checksum,
      };

      if (!this.currentCard.snapshots) {
        this.currentCard.snapshots = [];
      }

      this.currentCard.snapshots.push(snapshot);
      await this.save();

      this.logger.info(`Snapshot created: ${beforeAction}`, 'SystemCardManager');
      return snapshot;
    } catch (error) {
      this.logger.error('Failed to create snapshot', 'SystemCardManager', error as Error);
      throw error;
    }
  }

  /**
   * Get all resources of a specific type
   */
  getResourcesByType(type: string): ResourceRecord[] {
    if (!this.currentCard) {
      return [];
    }

    const category = this.getResourceCategory(type);
    return this.currentCard.resources[category] || [];
  }

  /**
   * Get all resources created by a specific task
   */
  getResourcesByTask(taskId: string): ResourceRecord[] {
    if (!this.currentCard) {
      return [];
    }

    const allResources: ResourceRecord[] = [];
    for (const category of Object.keys(this.currentCard.resources)) {
      const resources =
        this.currentCard.resources[category as keyof typeof this.currentCard.resources];
      if (resources) {
        allResources.push(...resources.filter(r => r.createdByTask === taskId));
      }
    }

    return allResources;
  }

  /**
   * Get total count of all resources
   */
  getResourceCount(): number {
    if (!this.currentCard) {
      return 0;
    }

    return Object.values(this.currentCard.resources)
      .filter(arr => Array.isArray(arr))
      .reduce((sum, arr) => sum + arr.length, 0);
  }

  /**
   * Get current SystemCard
   */
  getCurrentCard(): SystemCard | null {
    return this.currentCard;
  }

  /**
   * Check if SystemCard exists on disk
   */
  async exists(): Promise<boolean> {
    try {
      await fs.access(this.systemCardPath);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Delete SystemCard file from disk
   */
  async delete(): Promise<void> {
    try {
      await fs.unlink(this.systemCardPath);
      this.currentCard = null;
      this.logger.info('SystemCard deleted', 'SystemCardManager');
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
        this.logger.error('Failed to delete SystemCard', 'SystemCardManager', error as Error);
        throw error;
      }
    }
  }

  /**
   * Map resource type to storage category
   */
  private getResourceCategory(type: string): keyof SystemCard['resources'] {
    const typeMap: Record<string, keyof SystemCard['resources']> = {
      namespace: 'namespaces',
      deployment: 'deployments',
      service: 'services',
      configmap: 'configmaps',
      secret: 'secrets',
      ingress: 'ingresses',
      statefulset: 'statefulsets',
      pod: 'pods',
      persistentvolumeclaim: 'persistentvolumeclaims',
      custom: 'custom',
    };

    return typeMap[type] || 'custom';
  }

  /**
   * Calculate checksum for state verification
   */
  private calculateChecksum(card: SystemCard): string {
    const contentString = JSON.stringify(card.resources);
    // Simple hash function (in production, use crypto.createHash)
    let hash = 0;
    for (let i = 0; i < contentString.length; i++) {
      const char = contentString.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return hash.toString(16);
  }
}
