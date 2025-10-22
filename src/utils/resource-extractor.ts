import { EnhancedLogger } from './enhanced-logging.js';
import { ResourceRecord } from './system-card-manager.js';

/**
 * Extraction pattern for parsing command outputs
 */
export interface ExtractionPattern {
  resourceType: ResourceRecord['type'];
  commandPattern: RegExp;
  outputPattern: RegExp;
  extractionFunction: (matches: RegExpMatchArray, command: string) => Partial<ResourceRecord>;
}

/**
 * Resource extraction result
 */
export interface ExtractionResult {
  resources: ResourceRecord[];
  confidence: number;
  warnings: string[];
}

/**
 * Extracts resource information from command outputs
 * Supports kubectl, oc, docker, and other infrastructure commands
 */
export class ResourceExtractor {
  private logger: EnhancedLogger;
  private patterns: ExtractionPattern[];

  constructor() {
    this.logger = new EnhancedLogger();
    this.patterns = this.initializePatterns();
  }

  /**
   * Extract resources from a command and its output
   */
  extract(command: string, stdout: string, stderr: string, taskId: string): ExtractionResult {
    const resources: ResourceRecord[] = [];
    const warnings: string[] = [];
    let confidence = 0;

    try {
      // Find matching patterns for this command
      const matchingPatterns = this.patterns.filter(p => p.commandPattern.test(command));

      if (matchingPatterns.length === 0) {
        this.logger.debug(
          `No extraction patterns matched for command: ${command.slice(0, 50)}...`,
          'ResourceExtractor'
        );
        return { resources, confidence: 0, warnings };
      }

      // Try each matching pattern
      for (const pattern of matchingPatterns) {
        const outputMatches = stdout.match(pattern.outputPattern);

        if (outputMatches) {
          try {
            const resourceData = pattern.extractionFunction(outputMatches, command);

            // Build complete resource record
            const resource: ResourceRecord = {
              type: pattern.resourceType,
              name: resourceData.name || 'unknown',
              ...(resourceData.namespace && { namespace: resourceData.namespace }),
              ...(resourceData.uid && { uid: resourceData.uid }),
              labels: resourceData.labels || {
                'managed-by': 'mcp-adr-server',
                'extracted-from': taskId,
              },
              ...(resourceData.annotations && { annotations: resourceData.annotations }),
              ...(resourceData.metadata && { metadata: resourceData.metadata }),
              created: new Date().toISOString(),
              createdByTask: taskId,
              cleanupCommand: this.generateCleanupCommand(
                pattern.resourceType,
                resourceData,
                command
              ),
            };

            resources.push(resource);
            confidence = Math.max(confidence, 0.8); // High confidence if pattern matched
          } catch (error) {
            warnings.push(`Failed to extract resource from pattern: ${(error as Error).message}`);
          }
        }
      }

      // Check stderr for warnings
      if (stderr && stderr.trim().length > 0) {
        warnings.push(`Command produced stderr: ${stderr.slice(0, 200)}`);
        confidence = Math.max(confidence * 0.8, 0.5); // Reduce confidence if stderr present
      }

      this.logger.info(
        `Extracted ${resources.length} resources from command output`,
        'ResourceExtractor'
      );
    } catch (error) {
      this.logger.error('Resource extraction failed', 'ResourceExtractor', error as Error);
      warnings.push(`Extraction error: ${(error as Error).message}`);
    }

    return { resources, confidence, warnings };
  }

  /**
   * Initialize extraction patterns for different commands
   */
  private initializePatterns(): ExtractionPattern[] {
    return [
      // kubectl create namespace
      {
        resourceType: 'namespace',
        commandPattern: /kubectl\s+create\s+(namespace|ns)/,
        outputPattern: /namespace[/\s]+"?([a-z0-9-]+)"?\s+created/i,
        extractionFunction: (matches, command) => {
          const name = matches[1]!;
          return {
            name,
            metadata: { command },
          };
        },
      },

      // oc new-project
      {
        resourceType: 'namespace',
        commandPattern: /oc\s+new-project/,
        outputPattern: /Now using project "([^"]+)"/,
        extractionFunction: (matches, command) => {
          const name = matches[1]!;
          return {
            name,
            metadata: { command, platform: 'openshift' },
          };
        },
      },

      // kubectl create deployment
      {
        resourceType: 'deployment',
        commandPattern: /kubectl\s+create\s+deployment/,
        outputPattern: /deployment\.apps[/\s]+"?([a-z0-9-]+)"?\s+created/i,
        extractionFunction: (matches, command) => {
          const name = matches[1]!;
          const namespaceMatch = command.match(/-n\s+([a-z0-9-]+)|--namespace[=\s]+([a-z0-9-]+)/);
          const namespace = namespaceMatch ? (namespaceMatch[1] || namespaceMatch[2])! : 'default';

          return {
            name,
            namespace,
            metadata: { command },
          };
        },
      },

      // kubectl apply -f (generic)
      {
        resourceType: 'custom',
        commandPattern: /kubectl\s+apply\s+-f/,
        outputPattern:
          /([a-z]+)\.([a-z0-9./]+)[/\s]+"?([a-z0-9-]+)"?\s+(created|configured|unchanged)/gi,
        extractionFunction: (matches, command) => {
          const resourceKind = matches[1]!;
          const resourceName = matches[3]!;
          const namespaceMatch = command.match(/-n\s+([a-z0-9-]+)|--namespace[=\s]+([a-z0-9-]+)/);
          const namespace = namespaceMatch ? (namespaceMatch[1] || namespaceMatch[2])! : 'default';

          // Map kubectl resource kinds to our types
          const typeMap: Record<string, ResourceRecord['type']> = {
            namespace: 'namespace',
            deployment: 'deployment',
            service: 'service',
            configmap: 'configmap',
            secret: 'secret',
            ingress: 'ingress',
            statefulset: 'statefulset',
            pod: 'pod',
            persistentvolumeclaim: 'persistentvolumeclaim',
          };

          return {
            name: resourceName,
            namespace,
            type: typeMap[resourceKind.toLowerCase()] || 'custom',
            metadata: { command, resourceKind },
          };
        },
      },

      // kubectl create service
      {
        resourceType: 'service',
        commandPattern: /kubectl\s+create\s+service/,
        outputPattern: /service[/\s]+"?([a-z0-9-]+)"?\s+created/i,
        extractionFunction: (matches, command) => {
          const name = matches[1]!;
          const namespaceMatch = command.match(/-n\s+([a-z0-9-]+)|--namespace[=\s]+([a-z0-9-]+)/);
          const namespace = namespaceMatch ? (namespaceMatch[1] || namespaceMatch[2])! : 'default';

          return {
            name,
            namespace,
            metadata: { command },
          };
        },
      },

      // kubectl create configmap
      {
        resourceType: 'configmap',
        commandPattern: /kubectl\s+create\s+configmap/,
        outputPattern: /configmap[/\s]+"?([a-z0-9-]+)"?\s+created/i,
        extractionFunction: (matches, command) => {
          const name = matches[1]!;
          const namespaceMatch = command.match(/-n\s+([a-z0-9-]+)|--namespace[=\s]+([a-z0-9-]+)/);
          const namespace = namespaceMatch ? (namespaceMatch[1] || namespaceMatch[2])! : 'default';

          return {
            name,
            namespace,
            metadata: { command },
          };
        },
      },

      // kubectl create secret
      {
        resourceType: 'secret',
        commandPattern: /kubectl\s+create\s+secret/,
        outputPattern: /secret[/\s]+"?([a-z0-9-]+)"?\s+created/i,
        extractionFunction: (matches, command) => {
          const name = matches[1]!;
          const namespaceMatch = command.match(/-n\s+([a-z0-9-]+)|--namespace[=\s]+([a-z0-9-]+)/);
          const namespace = namespaceMatch ? (namespaceMatch[1] || namespaceMatch[2])! : 'default';

          return {
            name,
            namespace,
            metadata: { command },
          };
        },
      },

      // helm install
      {
        resourceType: 'custom',
        commandPattern: /helm\s+install/,
        outputPattern: /NAME:\s+([a-z0-9-]+)/i,
        extractionFunction: (matches, command) => {
          const releaseName = matches[1]!;
          const namespaceMatch = command.match(/-n\s+([a-z0-9-]+)|--namespace[=\s]+([a-z0-9-]+)/);
          const namespace = namespaceMatch ? (namespaceMatch[1] || namespaceMatch[2])! : 'default';

          return {
            name: releaseName,
            namespace,
            metadata: {
              command,
              type: 'helm-release',
            },
          };
        },
      },

      // docker run
      {
        resourceType: 'pod',
        commandPattern: /docker\s+run/,
        outputPattern: /([a-f0-9]{12,64})/,
        extractionFunction: (matches, command) => {
          const containerId = matches[1]!;
          const nameMatch = command.match(/--name[=\s]+([a-z0-9-]+)/);
          const name = nameMatch ? nameMatch[1]! : containerId.slice(0, 12);

          return {
            name,
            uid: containerId,
            metadata: {
              command,
              platform: 'docker',
              containerId,
            },
          };
        },
      },

      // docker-compose up
      {
        resourceType: 'custom',
        commandPattern: /docker-compose\s+up/,
        outputPattern: /Creating\s+([a-z0-9_-]+)\s+\.\.\.\s+done/gi,
        extractionFunction: (matches, command) => {
          const serviceName = matches[1]!;

          return {
            name: serviceName,
            metadata: {
              command,
              platform: 'docker-compose',
              type: 'compose-service',
            },
          };
        },
      },
    ];
  }

  /**
   * Generate cleanup command for a resource
   */
  private generateCleanupCommand(
    type: ResourceRecord['type'],
    resourceData: Partial<ResourceRecord>,
    originalCommand: string
  ): string {
    const name = resourceData.name || 'unknown';
    const namespace = resourceData.namespace;

    // Detect platform from command
    const isOpenShift = originalCommand.includes('oc ');
    const isDocker = originalCommand.includes('docker ');
    const isDockerCompose = originalCommand.includes('docker-compose');
    const isHelm = originalCommand.includes('helm');

    if (isHelm && resourceData.metadata?.['type'] === 'helm-release') {
      return namespace ? `helm uninstall ${name} -n ${namespace}` : `helm uninstall ${name}`;
    }

    if (isDockerCompose && resourceData.metadata?.['type'] === 'compose-service') {
      return `docker-compose down`;
    }

    if (isDocker && resourceData.metadata?.['containerId']) {
      return `docker rm -f ${resourceData.metadata['containerId']}`;
    }

    // Kubernetes/OpenShift cleanup
    const cli = isOpenShift ? 'oc' : 'kubectl';
    const resourceTypeMap: Record<ResourceRecord['type'], string> = {
      namespace: 'namespace',
      deployment: 'deployment',
      service: 'service',
      configmap: 'configmap',
      secret: 'secret',
      ingress: 'ingress',
      statefulset: 'statefulset',
      pod: 'pod',
      persistentvolumeclaim: 'pvc',
      custom: (resourceData.metadata?.['resourceKind'] as string) || 'resource',
    };

    const resourceType = resourceTypeMap[type];

    if (type === 'namespace') {
      return `${cli} delete namespace ${name}`;
    }

    return namespace
      ? `${cli} delete ${resourceType} ${name} -n ${namespace}`
      : `${cli} delete ${resourceType} ${name}`;
  }

  /**
   * Extract multiple resources from batch command output
   */
  extractBatch(
    commands: Array<{ command: string; stdout: string; stderr: string; taskId: string }>
  ): ResourceRecord[] {
    const allResources: ResourceRecord[] = [];

    for (const cmd of commands) {
      const result = this.extract(cmd.command, cmd.stdout, cmd.stderr, cmd.taskId);
      allResources.push(...result.resources);

      if (result.warnings.length > 0) {
        this.logger.warn(
          `Resource extraction warnings: ${result.warnings.join(', ')}`,
          'ResourceExtractor'
        );
      }
    }

    return allResources;
  }

  /**
   * Add a custom extraction pattern
   */
  addPattern(pattern: ExtractionPattern): void {
    this.patterns.push(pattern);
    this.logger.info(
      `Added custom extraction pattern for ${pattern.resourceType}`,
      'ResourceExtractor'
    );
  }

  /**
   * Get all registered patterns
   */
  getPatterns(): ExtractionPattern[] {
    return [...this.patterns];
  }
}
