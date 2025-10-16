/**
 * Validated Pattern Definitions
 *
 * This module defines validated deployment patterns for different platforms
 * based on industry best practices from OpenShift, Kubernetes, Docker, Node.js,
 * Python, MCP, and A2A ecosystems.
 *
 * Each pattern follows a consistent structure inspired by OpenShift Validated Patterns:
 * - Pattern identification and versioning
 * - Bill of materials (dependencies, tools, configurations)
 * - Deployment steps with validation
 * - Environment-specific overrides
 * - Testing and validation strategies
 */

/**
 * Base pattern interface that all patterns must implement
 */
export interface ValidatedPattern {
  // Pattern identification
  id: string;
  name: string;
  version: string;
  platformType: PlatformType;
  description: string;

  // Bill of Materials
  billOfMaterials: {
    dependencies: Dependency[];
    configurations: Configuration[];
    secrets: SecretRequirement[];
    infrastructure: InfrastructureRequirement[];
  };

  // Deployment lifecycle
  deploymentPhases: DeploymentPhase[];

  // Validation and testing
  validationChecks: ValidationCheck[];
  healthChecks: HealthCheck[];

  // Environment overrides
  environmentOverrides: EnvironmentOverride[];

  // Pattern metadata
  metadata: {
    source: string; // Where this pattern came from (e.g., "OpenShift Validated Patterns")
    lastUpdated: string;
    maintainer: string;
    tags: string[];
    references: string[]; // URLs to documentation
  };

  // Live pattern sources - LLMs should query these for latest information
  authoritativeSources: PatternSource[];
}

/**
 * Authoritative source for pattern information
 * LLMs should query these sources to get the latest pattern details
 */
export interface PatternSource {
  type: 'documentation' | 'repository' | 'specification' | 'examples' | 'community';
  url: string;
  purpose: string; // What information to get from this source
  priority: number; // Higher = more authoritative (1-10)
  queryInstructions: string; // How the LLM should use this source
  requiredForDeployment: boolean; // Must query before deployment?
}

/**
 * Supported platform types
 */
export type PlatformType =
  | 'openshift'
  | 'kubernetes'
  | 'docker'
  | 'nodejs'
  | 'python'
  | 'mcp'
  | 'a2a'
  | 'hybrid';

/**
 * Dependency in the bill of materials
 */
export interface Dependency {
  name: string;
  type: 'runtime' | 'buildtime' | 'development';
  version?: string;
  required: boolean;
  installCommand?: string;
  verificationCommand?: string;
  alternativeOptions?: string[]; // Alternative tools that can satisfy this dependency
}

/**
 * Configuration file requirement
 */
export interface Configuration {
  path: string;
  purpose: string;
  template?: string;
  required: boolean;
  canAutoGenerate: boolean;
  validationSchema?: any; // JSON schema for validation
}

/**
 * Secret or credential requirement
 */
export interface SecretRequirement {
  name: string;
  purpose: string;
  environmentVariable?: string;
  vaultPath?: string; // For HashiCorp Vault or similar
  required: boolean;
  defaultForDev?: string; // Safe default for development only
}

/**
 * Infrastructure requirement
 */
export interface InfrastructureRequirement {
  component: string; // e.g., "PostgreSQL", "Redis", "Message Queue"
  purpose: string;
  minimumVersion?: string;
  alternatives?: string[]; // Alternative implementations
  required: boolean;
  setupCommands?: string[];
  healthCheckCommand?: string;
}

/**
 * Deployment phase in the lifecycle
 */
export interface DeploymentPhase {
  order: number;
  name: string;
  description: string;
  commands: Command[];
  rollbackCommands?: Command[];
  prerequisites: string[]; // Phase names that must complete first
  estimatedDuration: string;
  canParallelize: boolean; // Can this phase run in parallel with others?
}

/**
 * Command to execute
 */
export interface Command {
  description: string;
  command: string;
  workingDirectory?: string;
  environmentVariables?: Record<string, string>;
  expectedExitCode: number;
  retryPolicy?: {
    maxAttempts: number;
    backoffMs: number;
  };
  timeout?: number; // milliseconds
}

/**
 * Validation check
 */
export interface ValidationCheck {
  id: string;
  name: string;
  description: string;
  command: string;
  expectedOutput?: string;
  expectedExitCode: number;
  severity: 'critical' | 'error' | 'warning' | 'info';
  failureMessage: string;
  remediationSteps: string[];
}

/**
 * Health check for ongoing monitoring
 */
export interface HealthCheck {
  name: string;
  endpoint?: string; // For HTTP health checks
  command?: string; // For CLI health checks
  interval: number; // milliseconds
  timeout: number; // milliseconds
  healthyThreshold: number;
  unhealthyThreshold: number;
}

/**
 * Environment-specific override
 */
export interface EnvironmentOverride {
  environment: 'development' | 'staging' | 'production' | 'test';
  overrides: {
    configurations?: Partial<Configuration>[];
    deploymentPhases?: Partial<DeploymentPhase>[];
    validationChecks?: Partial<ValidationCheck>[];
  };
}

/**
 * OpenShift Validated Pattern
 * Based on https://play.validatedpatterns.io/vp-workshop/main/5_validatedpatterns/creatingPatterns.html
 */
export const OPENSHIFT_PATTERN: ValidatedPattern = {
  id: 'openshift-validated-pattern-v1',
  name: 'OpenShift Validated Pattern',
  version: '1.0.0',
  platformType: 'openshift',
  description:
    'GitOps-based deployment pattern for OpenShift using ArgoCD, Helm charts, and hierarchical values system',

  billOfMaterials: {
    dependencies: [
      {
        name: 'oc',
        type: 'runtime',
        required: true,
        installCommand: 'Download from https://mirror.openshift.com/pub/openshift-v4/clients/oc/',
        verificationCommand: 'oc version',
      },
      {
        name: 'helm',
        type: 'runtime',
        version: '>=3.0.0',
        required: true,
        installCommand:
          'curl https://raw.githubusercontent.com/helm/helm/main/scripts/get-helm-3 | bash',
        verificationCommand: 'helm version',
      },
      {
        name: 'ArgoCD',
        type: 'runtime',
        required: true,
        installCommand: 'oc apply -k openshift-gitops-operator/',
        verificationCommand: 'oc get pods -n openshift-gitops',
      },
    ],

    configurations: [
      {
        path: 'values-global.yaml',
        purpose: 'Global configuration values applied to all cluster groups',
        required: true,
        canAutoGenerate: true,
      },
      {
        path: 'values-{{ clusterGroup }}.yaml',
        purpose: 'ClusterGroup-specific overrides',
        required: false,
        canAutoGenerate: true,
      },
    ],

    secrets: [
      {
        name: 'git-credentials',
        purpose: 'Credentials for private Git repositories',
        environmentVariable: 'GIT_TOKEN',
        vaultPath: 'secret/gitops/credentials',
        required: true,
      },
    ],

    infrastructure: [
      {
        component: 'OpenShift Cluster',
        purpose: 'Target deployment platform',
        minimumVersion: '4.10',
        required: true,
        healthCheckCommand: 'oc get nodes',
      },
      {
        component: 'HashiCorp Vault',
        purpose: 'Secrets management',
        required: false,
        alternatives: ['External Secrets Operator', 'Sealed Secrets'],
      },
    ],
  },

  deploymentPhases: [
    {
      order: 1,
      name: 'Bootstrap GitOps',
      description: 'Initialize OpenShift GitOps (ArgoCD) operator',
      commands: [
        {
          description: 'Install OpenShift GitOps Operator',
          command: 'oc apply -k openshift-gitops-operator/',
          expectedExitCode: 0,
        },
        {
          description: 'Wait for GitOps pods to be ready',
          command:
            'oc wait --for=condition=ready pod -l app.kubernetes.io/name=openshift-gitops-server -n openshift-gitops --timeout=300s',
          expectedExitCode: 0,
          timeout: 300000,
        },
      ],
      prerequisites: [],
      estimatedDuration: '5-10 minutes',
      canParallelize: false,
    },
    {
      order: 2,
      name: 'Deploy Pattern',
      description: 'Deploy the validated pattern via ArgoCD',
      commands: [
        {
          description: 'Create ArgoCD application',
          command: 'oc apply -f argocd/application.yaml',
          expectedExitCode: 0,
        },
        {
          description: 'Sync ArgoCD application',
          command: 'argocd app sync {{ pattern-name }} --prune',
          expectedExitCode: 0,
        },
      ],
      prerequisites: ['Bootstrap GitOps'],
      estimatedDuration: '10-20 minutes',
      canParallelize: false,
    },
  ],

  validationChecks: [
    {
      id: 'argocd-healthy',
      name: 'ArgoCD Health Check',
      description: 'Verify ArgoCD application is healthy',
      command: 'argocd app get {{ pattern-name }} --output json | jq -r .status.health.status',
      expectedOutput: 'Healthy',
      expectedExitCode: 0,
      severity: 'critical',
      failureMessage: 'ArgoCD application is not healthy',
      remediationSteps: [
        'Check ArgoCD application status: oc describe application {{ pattern-name }}',
        'Review sync errors: argocd app get {{ pattern-name }}',
        'Verify all resources are created: oc get all -n {{ namespace }}',
      ],
    },
  ],

  healthChecks: [
    {
      name: 'ArgoCD Application Sync Status',
      command: 'argocd app get {{ pattern-name }} --output json | jq -r .status.sync.status',
      interval: 30000,
      timeout: 5000,
      healthyThreshold: 1,
      unhealthyThreshold: 3,
    },
  ],

  environmentOverrides: [
    {
      environment: 'development',
      overrides: {
        configurations: [
          {
            path: 'values-dev.yaml',
            purpose: 'Development-specific overrides',
          },
        ],
      },
    },
    {
      environment: 'production',
      overrides: {
        configurations: [
          {
            path: 'values-prod.yaml',
            purpose: 'Production-specific overrides with strict validation',
          },
        ],
        validationChecks: [
          {
            id: 'prod-tls-check',
            name: 'TLS Certificate Validation',
            description: 'Ensure all routes have valid TLS certificates',
            severity: 'critical',
          },
        ],
      },
    },
  ],

  metadata: {
    source: 'OpenShift Validated Patterns',
    lastUpdated: '2025-01-16',
    maintainer: 'Red Hat',
    tags: ['gitops', 'argocd', 'helm', 'openshift'],
    references: [
      'https://play.validatedpatterns.io/vp-workshop/main/5_validatedpatterns/creatingPatterns.html',
    ],
  },

  authoritativeSources: [
    {
      type: 'documentation',
      url: 'https://play.validatedpatterns.io/',
      purpose:
        'Primary documentation for OpenShift Validated Patterns - contains pattern structure, best practices, and examples',
      priority: 10,
      queryInstructions:
        'Search this site for: 1) Pattern creation guidelines, 2) Values hierarchy system, 3) ArgoCD sync wave patterns, 4) Secrets management approaches. Pay special attention to /vp-workshop/ sections.',
      requiredForDeployment: true,
    },
    {
      type: 'repository',
      url: 'https://github.com/validatedpatterns/common',
      purpose:
        'Common framework code - contains actual implementation of pattern framework including Helm charts, ArgoCD configurations, and build scripts',
      priority: 10,
      queryInstructions:
        'Examine this repository for: 1) Helm chart templates, 2) values-global.yaml structure, 3) Makefile commands, 4) Common ArgoCD applications. Use this to understand the actual implementation details.',
      requiredForDeployment: true,
    },
    {
      type: 'examples',
      url: 'https://github.com/validatedpatterns',
      purpose: 'Collection of validated pattern examples for different use cases',
      priority: 8,
      queryInstructions:
        'Browse available patterns to find similar use cases. Look for patterns that match your deployment requirements (multi-cluster, single cluster, specific operators).',
      requiredForDeployment: false,
    },
    {
      type: 'specification',
      url: 'https://github.com/validatedpatterns/docs',
      purpose: 'Official pattern specifications and documentation',
      priority: 9,
      queryInstructions:
        'Review for: 1) Pattern requirements, 2) Certification criteria, 3) Architecture guidelines, 4) Multi-cluster configurations.',
      requiredForDeployment: false,
    },
  ],
};

/**
 * Kubernetes Deployment Pattern
 * Based on 2025 best practices
 */
export const KUBERNETES_PATTERN: ValidatedPattern = {
  id: 'kubernetes-pattern-v1',
  name: 'Kubernetes Deployment Pattern',
  version: '1.0.0',
  platformType: 'kubernetes',
  description:
    'Declarative Kubernetes deployment using Helm charts, blue/green strategy, and GitOps principles',

  billOfMaterials: {
    dependencies: [
      {
        name: 'kubectl',
        type: 'runtime',
        required: true,
        verificationCommand: 'kubectl version --client',
      },
      {
        name: 'helm',
        type: 'runtime',
        version: '>=3.0.0',
        required: true,
        verificationCommand: 'helm version',
      },
    ],

    configurations: [
      {
        path: 'k8s/manifests/',
        purpose: 'Kubernetes resource definitions (YAML)',
        required: true,
        canAutoGenerate: true,
      },
      {
        path: 'helm/values.yaml',
        purpose: 'Helm chart default values',
        required: false,
        canAutoGenerate: true,
      },
    ],

    secrets: [
      {
        name: 'registry-credentials',
        purpose: 'Container registry authentication',
        environmentVariable: 'DOCKER_CONFIG',
        required: true,
      },
    ],

    infrastructure: [
      {
        component: 'Kubernetes Cluster',
        purpose: 'Container orchestration platform',
        minimumVersion: '1.24',
        required: true,
        healthCheckCommand: 'kubectl get nodes',
      },
      {
        component: 'Ingress Controller',
        purpose: 'HTTP(S) routing to services',
        required: true,
        alternatives: ['nginx-ingress', 'traefik', 'istio'],
      },
    ],
  },

  deploymentPhases: [
    {
      order: 1,
      name: 'Pre-deployment Validation',
      description: 'Validate cluster resources and prerequisites',
      commands: [
        {
          description: 'Check cluster connectivity',
          command: 'kubectl cluster-info',
          expectedExitCode: 0,
        },
        {
          description: 'Verify RBAC permissions',
          command: 'kubectl auth can-i create deployments --namespace=default',
          expectedExitCode: 0,
        },
      ],
      prerequisites: [],
      estimatedDuration: '1-2 minutes',
      canParallelize: false,
    },
    {
      order: 2,
      name: 'Deploy Application',
      description: 'Deploy using rolling update strategy',
      commands: [
        {
          description: 'Apply Kubernetes manifests',
          command: 'kubectl apply -f k8s/manifests/ --recursive',
          expectedExitCode: 0,
        },
        {
          description: 'Wait for deployment rollout',
          command: 'kubectl rollout status deployment/{{ app-name }} --timeout=5m',
          expectedExitCode: 0,
          timeout: 300000,
        },
      ],
      prerequisites: ['Pre-deployment Validation'],
      estimatedDuration: '5-10 minutes',
      canParallelize: false,
    },
  ],

  validationChecks: [
    {
      id: 'pods-running',
      name: 'Pod Health Check',
      description: 'Verify all pods are running',
      command:
        "kubectl get pods -l app={{ app-name }} -o jsonpath='{.items[*].status.phase}' | grep -v Running",
      expectedExitCode: 1, // grep returns 1 when no matches (all Running)
      severity: 'critical',
      failureMessage: 'Some pods are not in Running state',
      remediationSteps: [
        'Check pod logs: kubectl logs -l app={{ app-name }}',
        'Describe pod: kubectl describe pod -l app={{ app-name }}',
        'Check events: kubectl get events --sort-by=.metadata.creationTimestamp',
      ],
    },
  ],

  healthChecks: [
    {
      name: 'Liveness Probe',
      endpoint: '/health/live',
      interval: 10000,
      timeout: 3000,
      healthyThreshold: 1,
      unhealthyThreshold: 3,
    },
    {
      name: 'Readiness Probe',
      endpoint: '/health/ready',
      interval: 5000,
      timeout: 2000,
      healthyThreshold: 1,
      unhealthyThreshold: 3,
    },
  ],

  environmentOverrides: [
    {
      environment: 'production',
      overrides: {
        deploymentPhases: [
          {
            order: 2,
            name: 'Blue/Green Deploy',
            description: 'Deploy using blue/green strategy for zero-downtime',
          },
        ],
      },
    },
  ],

  metadata: {
    source: 'Kubernetes Best Practices 2025',
    lastUpdated: '2025-01-16',
    maintainer: 'CNCF Community',
    tags: ['kubernetes', 'k8s', 'declarative', 'rolling-update'],
    references: [
      'https://kubernetes.io/docs/concepts/configuration/overview/',
      'https://helm.sh/docs/chart_best_practices/',
    ],
  },

  authoritativeSources: [
    {
      type: 'documentation',
      url: 'https://kubernetes.io/docs/',
      purpose: 'Official Kubernetes documentation covering all concepts and best practices',
      priority: 10,
      queryInstructions:
        'Search for: 1) Configuration best practices, 2) Deployment strategies, 3) Resource management, 4) Security policies. Focus on /docs/concepts/ and /docs/tasks/ sections.',
      requiredForDeployment: true,
    },
    {
      type: 'documentation',
      url: 'https://helm.sh/docs/',
      purpose: 'Helm chart best practices and templating guidelines',
      priority: 9,
      queryInstructions:
        'Review: 1) Chart best practices, 2) Template functions, 3) Values schema, 4) Chart hooks. Essential for Helm-based deployments.',
      requiredForDeployment: false,
    },
    {
      type: 'repository',
      url: 'https://github.com/kubernetes/examples',
      purpose: 'Official Kubernetes examples repository with working configurations',
      priority: 8,
      queryInstructions:
        'Browse examples matching your application type. Look for: 1) Deployment patterns, 2) Service configurations, 3) StatefulSet examples, 4) ConfigMap usage.',
      requiredForDeployment: false,
    },
    {
      type: 'community',
      url: 'https://www.cncf.io/blog/',
      purpose: 'CNCF blog with latest Kubernetes ecosystem updates and patterns',
      priority: 7,
      queryInstructions:
        'Check recent posts for: 1) New deployment strategies, 2) Security updates, 3) Performance improvements, 4) Operator patterns.',
      requiredForDeployment: false,
    },
  ],
};

/**
 * Docker Containerization Pattern
 */
export const DOCKER_PATTERN: ValidatedPattern = {
  id: 'docker-pattern-v1',
  name: 'Docker Containerization Pattern',
  version: '1.0.0',
  platformType: 'docker',
  description:
    'Multi-stage Docker builds, ephemeral containers, security best practices, and layer optimization',

  billOfMaterials: {
    dependencies: [
      {
        name: 'docker',
        type: 'runtime',
        required: true,
        verificationCommand: 'docker --version',
      },
      {
        name: 'docker-compose',
        type: 'runtime',
        required: false,
        verificationCommand: 'docker-compose --version',
      },
    ],

    configurations: [
      {
        path: 'Dockerfile',
        purpose: 'Container image definition',
        required: true,
        canAutoGenerate: true,
      },
      {
        path: 'docker-compose.yml',
        purpose: 'Multi-container orchestration',
        required: false,
        canAutoGenerate: true,
      },
      {
        path: '.dockerignore',
        purpose: 'Exclude files from build context',
        required: true,
        canAutoGenerate: true,
      },
    ],

    secrets: [],

    infrastructure: [
      {
        component: 'Docker Engine',
        purpose: 'Container runtime',
        minimumVersion: '20.10',
        required: true,
        healthCheckCommand: 'docker ps',
      },
    ],
  },

  deploymentPhases: [
    {
      order: 1,
      name: 'Build Image',
      description: 'Build container image using multi-stage Dockerfile',
      commands: [
        {
          description: 'Build Docker image with cache',
          command: 'docker build --target production -t {{ image-name }}:{{ tag }} .',
          expectedExitCode: 0,
        },
      ],
      prerequisites: [],
      estimatedDuration: '2-5 minutes',
      canParallelize: false,
    },
    {
      order: 2,
      name: 'Security Scan',
      description: 'Scan image for vulnerabilities',
      commands: [
        {
          description: 'Run security scan',
          command: 'docker scan {{ image-name }}:{{ tag }}',
          expectedExitCode: 0,
        },
      ],
      prerequisites: ['Build Image'],
      estimatedDuration: '1-3 minutes',
      canParallelize: false,
    },
    {
      order: 3,
      name: 'Run Container',
      description: 'Start container with proper configuration',
      commands: [
        {
          description: 'Run container as non-root',
          command:
            'docker run -d --name {{ container-name }} --user 1000:1000 --read-only {{ image-name }}:{{ tag }}',
          expectedExitCode: 0,
        },
      ],
      prerequisites: ['Build Image', 'Security Scan'],
      estimatedDuration: '30 seconds',
      canParallelize: false,
    },
  ],

  validationChecks: [
    {
      id: 'container-running',
      name: 'Container Status Check',
      description: 'Verify container is running',
      command: 'docker ps --filter name={{ container-name }} --format "{{.Status}}" | grep -q Up',
      expectedExitCode: 0,
      severity: 'critical',
      failureMessage: 'Container is not running',
      remediationSteps: [
        'Check container logs: docker logs {{ container-name }}',
        'Inspect container: docker inspect {{ container-name }}',
        'Check for port conflicts: docker ps -a',
      ],
    },
    {
      id: 'non-root-user',
      name: 'Non-Root User Check',
      description: 'Ensure container runs as non-root',
      command:
        'docker inspect {{ container-name }} --format="{{.Config.User}}" | grep -vq "^root$\\|^$"',
      expectedExitCode: 0,
      severity: 'warning',
      failureMessage: 'Container is running as root user',
      remediationSteps: ['Update Dockerfile to use USER instruction', 'Rebuild and redeploy image'],
    },
  ],

  healthChecks: [
    {
      name: 'Container Health',
      command: 'docker inspect --format="{{.State.Health.Status}}" {{ container-name }}',
      interval: 30000,
      timeout: 5000,
      healthyThreshold: 1,
      unhealthyThreshold: 3,
    },
  ],

  environmentOverrides: [
    {
      environment: 'production',
      overrides: {
        deploymentPhases: [
          {
            order: 3,
            name: 'Run Container',
            description: 'Run with resource limits and restart policy',
            commands: [
              {
                description: 'Run container with production resource limits',
                command:
                  'docker run -d --name {{ container-name }} --user 1000:1000 --read-only --memory=512m --cpus=1 --restart=unless-stopped {{ image-name }}:{{ tag }}',
                expectedExitCode: 0,
              },
            ],
          },
        ],
      },
    },
  ],

  metadata: {
    source: 'Docker Best Practices',
    lastUpdated: '2025-01-16',
    maintainer: 'Docker Community',
    tags: ['docker', 'containers', 'security', 'multi-stage-build'],
    references: [
      'https://docs.docker.com/build/building/best-practices/',
      'https://www.sysdig.com/learn-cloud-native/dockerfile-best-practices',
    ],
  },

  authoritativeSources: [
    {
      type: 'documentation',
      url: 'https://docs.docker.com/build/building/best-practices/',
      purpose: 'Official Docker build best practices guide',
      priority: 10,
      queryInstructions:
        'Review for: 1) Dockerfile instructions best practices, 2) Multi-stage builds, 3) Layer caching, 4) .dockerignore usage. This is the authoritative source for Docker builds.',
      requiredForDeployment: true,
    },
    {
      type: 'documentation',
      url: 'https://docs.docker.com/develop/security-best-practices/',
      purpose: 'Docker security best practices',
      priority: 10,
      queryInstructions:
        'Essential security guidance: 1) Non-root users, 2) Secrets management, 3) Image scanning, 4) Network security. Must review before production deployments.',
      requiredForDeployment: true,
    },
    {
      type: 'community',
      url: 'https://www.sysdig.com/learn-cloud-native/',
      purpose: 'Cloud-native container security and best practices',
      priority: 8,
      queryInstructions:
        'Search for: 1) Dockerfile best practices, 2) Security scanning, 3) Runtime security, 4) Compliance checks.',
      requiredForDeployment: false,
    },
    {
      type: 'repository',
      url: 'https://github.com/docker/awesome-compose',
      purpose: 'Curated list of Docker Compose examples',
      priority: 7,
      queryInstructions:
        'Browse examples for your tech stack. Use as reference for: 1) Service configurations, 2) Volume management, 3) Network setup, 4) Health checks.',
      requiredForDeployment: false,
    },
  ],
};

/**
 * Node.js Application Pattern
 */
export const NODEJS_PATTERN: ValidatedPattern = {
  id: 'nodejs-pattern-v1',
  name: 'Node.js Application Pattern',
  version: '1.0.0',
  platformType: 'nodejs',
  description: 'Node.js microservices deployment with containerization and cloud platform support',

  billOfMaterials: {
    dependencies: [
      {
        name: 'node',
        type: 'runtime',
        version: '>=18.0.0',
        required: true,
        verificationCommand: 'node --version',
      },
      {
        name: 'npm',
        type: 'runtime',
        required: true,
        verificationCommand: 'npm --version',
        alternativeOptions: ['yarn', 'pnpm'],
      },
    ],

    configurations: [
      {
        path: 'package.json',
        purpose: 'Node.js dependencies and scripts',
        required: true,
        canAutoGenerate: false,
      },
      {
        path: '.env',
        purpose: 'Environment variables',
        required: true,
        canAutoGenerate: true,
      },
      {
        path: 'ecosystem.config.js',
        purpose: 'PM2 process management',
        required: false,
        canAutoGenerate: true,
      },
    ],

    secrets: [
      {
        name: 'api-keys',
        purpose: 'External service API keys',
        environmentVariable: 'API_KEY',
        required: true,
      },
    ],

    infrastructure: [
      {
        component: 'Node.js Runtime',
        purpose: 'JavaScript execution environment',
        minimumVersion: '18.0.0',
        required: true,
      },
    ],
  },

  deploymentPhases: [
    {
      order: 1,
      name: 'Install Dependencies',
      description: 'Install npm packages',
      commands: [
        {
          description: 'Clean install dependencies',
          command: 'npm ci',
          expectedExitCode: 0,
        },
      ],
      prerequisites: [],
      estimatedDuration: '1-3 minutes',
      canParallelize: false,
    },
    {
      order: 2,
      name: 'Build Application',
      description: 'Compile TypeScript and bundle assets',
      commands: [
        {
          description: 'Build production assets',
          command: 'npm run build',
          expectedExitCode: 0,
        },
      ],
      prerequisites: ['Install Dependencies'],
      estimatedDuration: '1-2 minutes',
      canParallelize: false,
    },
    {
      order: 3,
      name: 'Start Application',
      description: 'Start Node.js server',
      commands: [
        {
          description: 'Start with PM2',
          command: 'pm2 start ecosystem.config.js --env production',
          expectedExitCode: 0,
        },
      ],
      prerequisites: ['Build Application'],
      estimatedDuration: '30 seconds',
      canParallelize: false,
    },
  ],

  validationChecks: [
    {
      id: 'server-listening',
      name: 'Server Listening Check',
      description: 'Verify server is accepting connections',
      command: 'curl -f http://localhost:$PORT/health || exit 1',
      expectedExitCode: 0,
      severity: 'critical',
      failureMessage: 'Server is not responding',
      remediationSteps: [
        'Check logs: pm2 logs',
        'Verify port is not in use: lsof -i :$PORT',
        'Check environment variables: pm2 env',
      ],
    },
  ],

  healthChecks: [
    {
      name: 'HTTP Health Endpoint',
      endpoint: '/health',
      interval: 30000,
      timeout: 5000,
      healthyThreshold: 1,
      unhealthyThreshold: 3,
    },
  ],

  environmentOverrides: [
    {
      environment: 'development',
      overrides: {
        deploymentPhases: [
          {
            order: 3,
            name: 'Start Application',
            description: 'Start with hot reload',
            commands: [
              {
                description: 'Start development server with hot reload',
                command: 'npm run dev',
                expectedExitCode: 0,
              },
            ],
          },
        ],
      },
    },
  ],

  metadata: {
    source: 'Node.js Deployment Best Practices',
    lastUpdated: '2025-01-16',
    maintainer: 'Node.js Community',
    tags: ['nodejs', 'javascript', 'microservices', 'pm2'],
    references: ['https://nodejs.org/en/docs/', 'https://pm2.keymetrics.io/docs/usage/deployment/'],
  },

  authoritativeSources: [
    {
      type: 'documentation',
      url: 'https://nodejs.org/en/docs/',
      purpose: 'Official Node.js documentation and API reference',
      priority: 10,
      queryInstructions:
        'Review: 1) Production best practices, 2) Performance tips, 3) Security guidelines, 4) Deployment guides. Focus on guides/deployment sections.',
      requiredForDeployment: true,
    },
    {
      type: 'documentation',
      url: 'https://pm2.keymetrics.io/docs/',
      purpose: 'PM2 process manager documentation',
      priority: 9,
      queryInstructions:
        'Essential for production deployments: 1) Ecosystem file configuration, 2) Cluster mode, 3) Log management, 4) Monitoring setup.',
      requiredForDeployment: false,
    },
    {
      type: 'repository',
      url: 'https://github.com/goldbergyoni/nodebestpractices',
      purpose: 'Comprehensive Node.js best practices repository',
      priority: 9,
      queryInstructions:
        'Search for: 1) Production practices, 2) Error handling, 3) Security, 4) Docker/Kubernetes deployment. This is the community gold standard.',
      requiredForDeployment: true,
    },
    {
      type: 'community',
      url: 'https://blog.logrocket.com/',
      purpose: 'Node.js tutorials and deployment guides',
      priority: 7,
      queryInstructions:
        'Search blog for recent articles on: 1) Microservices patterns, 2) Deployment strategies, 3) Performance optimization.',
      requiredForDeployment: false,
    },
  ],
};

/**
 * Python Application Pattern
 */
export const PYTHON_PATTERN: ValidatedPattern = {
  id: 'python-pattern-v1',
  name: 'Python Application Pattern',
  version: '1.0.0',
  platformType: 'python',
  description:
    'Python application deployment with virtual environments, dependency management, and WSGI/ASGI servers',

  billOfMaterials: {
    dependencies: [
      {
        name: 'python',
        type: 'runtime',
        version: '>=3.9',
        required: true,
        verificationCommand: 'python --version',
      },
      {
        name: 'pip',
        type: 'runtime',
        required: true,
        verificationCommand: 'pip --version',
      },
      {
        name: 'gunicorn',
        type: 'runtime',
        required: true,
        installCommand: 'pip install gunicorn',
        alternativeOptions: ['uvicorn', 'uwsgi'],
      },
    ],

    configurations: [
      {
        path: 'requirements.txt',
        purpose: 'Python dependencies',
        required: true,
        canAutoGenerate: false,
      },
      {
        path: '.env',
        purpose: 'Environment variables',
        required: true,
        canAutoGenerate: true,
      },
      {
        path: 'gunicorn.conf.py',
        purpose: 'Gunicorn configuration',
        required: false,
        canAutoGenerate: true,
      },
    ],

    secrets: [],

    infrastructure: [
      {
        component: 'Python Interpreter',
        purpose: 'Python runtime environment',
        minimumVersion: '3.9',
        required: true,
      },
    ],
  },

  deploymentPhases: [
    {
      order: 1,
      name: 'Create Virtual Environment',
      description: 'Set up isolated Python environment',
      commands: [
        {
          description: 'Create venv',
          command: 'python -m venv venv',
          expectedExitCode: 0,
        },
        {
          description: 'Activate venv',
          command: 'source venv/bin/activate',
          expectedExitCode: 0,
        },
      ],
      prerequisites: [],
      estimatedDuration: '30 seconds',
      canParallelize: false,
    },
    {
      order: 2,
      name: 'Install Dependencies',
      description: 'Install Python packages',
      commands: [
        {
          description: 'Upgrade pip',
          command: 'pip install --upgrade pip',
          expectedExitCode: 0,
        },
        {
          description: 'Install requirements',
          command: 'pip install -r requirements.txt',
          expectedExitCode: 0,
        },
      ],
      prerequisites: ['Create Virtual Environment'],
      estimatedDuration: '2-5 minutes',
      canParallelize: false,
    },
    {
      order: 3,
      name: 'Start Application',
      description: 'Start WSGI server',
      commands: [
        {
          description: 'Start with Gunicorn',
          command: 'gunicorn --config gunicorn.conf.py app:app',
          expectedExitCode: 0,
        },
      ],
      prerequisites: ['Install Dependencies'],
      estimatedDuration: '30 seconds',
      canParallelize: false,
    },
  ],

  validationChecks: [
    {
      id: 'server-running',
      name: 'WSGI Server Check',
      description: 'Verify application server is running',
      command: 'curl -f http://localhost:8000/ || exit 1',
      expectedExitCode: 0,
      severity: 'critical',
      failureMessage: 'Application server is not responding',
      remediationSteps: [
        'Check logs: tail -f logs/gunicorn.log',
        'Verify port availability: lsof -i :8000',
        'Check application errors: python -c "import app"',
      ],
    },
  ],

  healthChecks: [
    {
      name: 'Application Health',
      endpoint: '/health',
      interval: 30000,
      timeout: 5000,
      healthyThreshold: 1,
      unhealthyThreshold: 3,
    },
  ],

  environmentOverrides: [],

  metadata: {
    source: 'Python Deployment Best Practices',
    lastUpdated: '2025-01-16',
    maintainer: 'Python Community',
    tags: ['python', 'wsgi', 'gunicorn', 'flask', 'django'],
    references: [
      'https://packaging.python.org/en/latest/discussions/deploying-python-applications/',
      'https://docs.gunicorn.org/en/stable/deploy.html',
    ],
  },

  authoritativeSources: [
    {
      type: 'documentation',
      url: 'https://packaging.python.org/',
      purpose: 'Official Python Packaging Authority guidelines',
      priority: 10,
      queryInstructions:
        'Review /discussions/deploying-python-applications/ for: 1) Deployment strategies, 2) Dependency management, 3) Virtual environments, 4) Package distribution.',
      requiredForDeployment: true,
    },
    {
      type: 'documentation',
      url: 'https://docs.gunicorn.org/',
      purpose: 'Gunicorn WSGI server documentation',
      priority: 9,
      queryInstructions:
        'Essential for WSGI deployments: 1) Configuration settings, 2) Worker types, 3) Deployment guide, 4) Performance tuning.',
      requiredForDeployment: false,
    },
    {
      type: 'documentation',
      url: 'https://www.uvicorn.org/',
      purpose: 'Uvicorn ASGI server for async Python applications',
      priority: 9,
      queryInstructions:
        'For async applications (FastAPI, Starlette): 1) Deployment settings, 2) Worker configuration, 3) Performance tips.',
      requiredForDeployment: false,
    },
    {
      type: 'repository',
      url: 'https://github.com/tiangolo/fastapi',
      purpose: 'FastAPI framework with deployment examples',
      priority: 8,
      queryInstructions:
        'Check /docs/deployment/ for modern Python API deployment patterns. Includes Docker, Kubernetes, and cloud platform examples.',
      requiredForDeployment: false,
    },
  ],
};

/**
 * MCP (Model Context Protocol) Server Pattern
 */
export const MCP_PATTERN: ValidatedPattern = {
  id: 'mcp-pattern-v1',
  name: 'Model Context Protocol Server Pattern',
  version: '1.0.0',
  platformType: 'mcp',
  description:
    'MCP server development with STDIO/HTTP transports, tool design, security, and testing best practices',

  billOfMaterials: {
    dependencies: [
      {
        name: '@modelcontextprotocol/sdk',
        type: 'runtime',
        required: true,
        installCommand: 'npm install @modelcontextprotocol/sdk',
        verificationCommand: 'npm list @modelcontextprotocol/sdk',
      },
      {
        name: 'zod',
        type: 'runtime',
        required: true,
        installCommand: 'npm install zod',
        verificationCommand: 'npm list zod',
      },
    ],

    configurations: [
      {
        path: 'package.json',
        purpose: 'MCP server metadata and dependencies',
        required: true,
        canAutoGenerate: false,
      },
      {
        path: '.env',
        purpose: 'API keys and configuration',
        required: true,
        canAutoGenerate: true,
      },
    ],

    secrets: [
      {
        name: 'api-keys',
        purpose: 'API keys for external services (if needed)',
        environmentVariable: 'API_KEY',
        required: false,
      },
    ],

    infrastructure: [
      {
        component: 'Node.js',
        purpose: 'Runtime for MCP server',
        minimumVersion: '18.0.0',
        required: true,
      },
    ],
  },

  deploymentPhases: [
    {
      order: 1,
      name: 'Schema Validation',
      description: 'Validate tool schemas using MCP Inspector',
      commands: [
        {
          description: 'Run MCP Inspector',
          command: 'npx @modelcontextprotocol/inspector dist/index.js',
          expectedExitCode: 0,
        },
      ],
      prerequisites: [],
      estimatedDuration: '1 minute',
      canParallelize: false,
    },
    {
      order: 2,
      name: 'Package as Container',
      description: 'Package MCP server as Docker container',
      commands: [
        {
          description: 'Build Docker image',
          command: 'docker build -t mcp-server:latest .',
          expectedExitCode: 0,
        },
      ],
      prerequisites: ['Schema Validation'],
      estimatedDuration: '2-3 minutes',
      canParallelize: false,
    },
    {
      order: 3,
      name: 'Integration Test',
      description: 'Test MCP server with actual LLM client',
      commands: [
        {
          description: 'Run integration tests',
          command: 'npm run test:integration',
          expectedExitCode: 0,
        },
      ],
      prerequisites: ['Package as Container'],
      estimatedDuration: '2-5 minutes',
      canParallelize: false,
    },
  ],

  validationChecks: [
    {
      id: 'stdio-communication',
      name: 'STDIO Communication Check',
      description: 'Verify STDIO transport works correctly',
      command: 'echo \'{"jsonrpc":"2.0","method":"ping","id":1}\' | node dist/index.js',
      expectedExitCode: 0,
      severity: 'critical',
      failureMessage: 'STDIO communication failed',
      remediationSteps: [
        'Verify no console.log/stdout writes in server code',
        'Check error logs for JSON-RPC errors',
        'Test with MCP Inspector',
      ],
    },
    {
      id: 'tool-schema-valid',
      name: 'Tool Schema Validation',
      description: 'Ensure all tools have valid schemas',
      command: 'npx @modelcontextprotocol/inspector dist/index.js --validate-only',
      expectedExitCode: 0,
      severity: 'error',
      failureMessage: 'Tool schemas are invalid',
      remediationSteps: [
        'Review tool definitions for missing parameters',
        'Add descriptions to all parameters',
        'Use Zod for runtime validation',
      ],
    },
  ],

  healthChecks: [
    {
      name: 'JSON-RPC Ping',
      command: 'echo \'{"jsonrpc":"2.0","method":"ping","id":1}\' | node dist/index.js',
      interval: 60000,
      timeout: 5000,
      healthyThreshold: 1,
      unhealthyThreshold: 2,
    },
  ],

  environmentOverrides: [
    {
      environment: 'production',
      overrides: {
        validationChecks: [
          {
            id: 'https-only',
            name: 'HTTPS Transport Check',
            description: 'Ensure HTTPS is used for HTTP transport',
            severity: 'critical',
          },
        ],
      },
    },
  ],

  metadata: {
    source: 'Model Context Protocol Best Practices',
    lastUpdated: '2025-01-16',
    maintainer: 'MCP Community',
    tags: ['mcp', 'llm', 'tools', 'stdio', 'json-rpc'],
    references: [
      'https://modelcontextprotocol.info/docs/best-practices/',
      'https://github.com/cyanheads/model-context-protocol-resources',
    ],
  },

  authoritativeSources: [
    {
      type: 'specification',
      url: 'https://modelcontextprotocol.io/',
      purpose: 'Official MCP specification and documentation',
      priority: 10,
      queryInstructions:
        'Primary source for MCP protocol: 1) Specification details, 2) Architecture overview, 3) Transport protocols, 4) Security model. Start here for all MCP projects.',
      requiredForDeployment: true,
    },
    {
      type: 'documentation',
      url: 'https://modelcontextprotocol.info/docs/best-practices/',
      purpose: 'MCP best practices guide',
      priority: 10,
      queryInstructions:
        'Critical best practices: 1) Server architecture patterns, 2) Tool design principles, 3) Error handling, 4) Testing strategies. Must review before deployment.',
      requiredForDeployment: true,
    },
    {
      type: 'repository',
      url: 'https://github.com/modelcontextprotocol/servers',
      purpose: 'Official MCP server examples',
      priority: 9,
      queryInstructions:
        'Browse example implementations: 1) Different transport types, 2) Tool patterns, 3) Resource handling, 4) Authentication. Use as templates.',
      requiredForDeployment: false,
    },
    {
      type: 'community',
      url: 'https://github.com/cyanheads/model-context-protocol-resources',
      purpose: 'Community-curated MCP resources and guides',
      priority: 8,
      queryInstructions:
        'Check /guides/ for: 1) Development guides, 2) Common patterns, 3) Troubleshooting, 4) Integration examples.',
      requiredForDeployment: false,
    },
  ],
};

/**
 * A2A (Agent-to-Agent) Protocol Pattern
 */
export const A2A_PATTERN: ValidatedPattern = {
  id: 'a2a-pattern-v1',
  name: 'Agent-to-Agent Protocol Pattern',
  version: '1.0.0',
  platformType: 'a2a',
  description:
    'A2A agent deployment with capability discovery, task management, multi-modal support, and enterprise authentication',

  billOfMaterials: {
    dependencies: [
      {
        name: 'a2a-sdk',
        type: 'runtime',
        required: true,
        installCommand: 'npm install @a2aproject/sdk',
        verificationCommand: 'npm list @a2aproject/sdk',
      },
    ],

    configurations: [
      {
        path: 'agent-card.json',
        purpose: 'Agent capability advertisement',
        required: true,
        canAutoGenerate: true,
      },
      {
        path: 'a2a-config.json',
        purpose: 'A2A protocol configuration',
        required: true,
        canAutoGenerate: true,
      },
    ],

    secrets: [
      {
        name: 'auth-credentials',
        purpose: 'OAuth 2.0 authentication credentials',
        environmentVariable: 'OAUTH_CLIENT_ID',
        required: true,
      },
    ],

    infrastructure: [
      {
        component: 'HTTPS Endpoint',
        purpose: 'Secure agent communication',
        required: true,
        setupCommands: ['Install TLS certificate', 'Configure reverse proxy'],
      },
    ],
  },

  deploymentPhases: [
    {
      order: 1,
      name: 'Capability Registration',
      description: 'Register agent capabilities with A2A network',
      commands: [
        {
          description: 'Validate agent card',
          command: 'a2a validate agent-card.json',
          expectedExitCode: 0,
        },
        {
          description: 'Register agent',
          command: 'a2a register --card agent-card.json',
          expectedExitCode: 0,
        },
      ],
      prerequisites: [],
      estimatedDuration: '1-2 minutes',
      canParallelize: false,
    },
    {
      order: 2,
      name: 'Start Agent Server',
      description: 'Start A2A agent HTTP server',
      commands: [
        {
          description: 'Start agent with authentication',
          command: 'a2a start --config a2a-config.json --auth oauth2',
          expectedExitCode: 0,
        },
      ],
      prerequisites: ['Capability Registration'],
      estimatedDuration: '30 seconds',
      canParallelize: false,
    },
    {
      order: 3,
      name: 'Integration Test',
      description: 'Test agent-to-agent communication',
      commands: [
        {
          description: 'Send test task to agent',
          command: 'a2a test-task --agent {{ agent-name }} --task "health-check"',
          expectedExitCode: 0,
        },
      ],
      prerequisites: ['Start Agent Server'],
      estimatedDuration: '1 minute',
      canParallelize: false,
    },
  ],

  validationChecks: [
    {
      id: 'agent-discovery',
      name: 'Agent Discovery Check',
      description: 'Verify agent is discoverable',
      command: 'a2a discover --capability {{ capability-name }}',
      expectedExitCode: 0,
      severity: 'critical',
      failureMessage: 'Agent is not discoverable',
      remediationSteps: [
        'Verify agent-card.json is valid',
        'Check agent registration: a2a list-agents',
        'Ensure HTTPS endpoint is accessible',
      ],
    },
    {
      id: 'oauth-auth',
      name: 'OAuth Authentication Check',
      description: 'Verify OAuth 2.0 authentication works',
      command: 'a2a auth-test --agent {{ agent-name }}',
      expectedExitCode: 0,
      severity: 'critical',
      failureMessage: 'OAuth authentication failed',
      remediationSteps: [
        'Verify OAuth credentials are correct',
        'Check token expiry',
        'Review authentication logs',
      ],
    },
  ],

  healthChecks: [
    {
      name: 'Agent Health Endpoint',
      endpoint: '/health',
      interval: 30000,
      timeout: 5000,
      healthyThreshold: 1,
      unhealthyThreshold: 3,
    },
  ],

  environmentOverrides: [],

  metadata: {
    source: 'Agent2Agent Protocol Specification',
    lastUpdated: '2025-01-16',
    maintainer: 'A2A Project (Linux Foundation)',
    tags: ['a2a', 'agent', 'multi-agent', 'json-rpc', 'oauth2'],
    references: [
      'https://a2aprotocol.ai/',
      'https://github.com/a2aproject/A2A',
      'https://www.linuxfoundation.org/press/linux-foundation-launches-the-agent2agent-protocol-project',
    ],
  },

  authoritativeSources: [
    {
      type: 'specification',
      url: 'https://a2aprotocol.ai/',
      purpose: 'Official A2A protocol specification website',
      priority: 10,
      queryInstructions:
        'Essential protocol specification: 1) Protocol overview, 2) Agent Card format, 3) Communication patterns, 4) Authentication requirements. This is the source of truth.',
      requiredForDeployment: true,
    },
    {
      type: 'repository',
      url: 'https://github.com/a2aproject/A2A',
      purpose: 'Official A2A protocol repository with specifications and examples',
      priority: 10,
      queryInstructions:
        'Review: 1) Protocol specification documents, 2) Agent Card schemas, 3) Example implementations, 4) Test suites. Check /docs/ and /examples/.',
      requiredForDeployment: true,
    },
    {
      type: 'documentation',
      url: 'https://developers.googleblog.com/en/a2a-a-new-era-of-agent-interoperability/',
      purpose: 'Google announcement and overview of A2A protocol',
      priority: 8,
      queryInstructions:
        'Read for: 1) Protocol motivation and goals, 2) Use cases, 3) Relationship with other protocols (MCP), 4) Adoption roadmap.',
      requiredForDeployment: false,
    },
    {
      type: 'community',
      url: 'https://www.linuxfoundation.org/press/linux-foundation-launches-the-agent2agent-protocol-project',
      purpose: 'Linux Foundation press release and governance information',
      priority: 7,
      queryInstructions:
        'Check for: 1) Project governance, 2) Contributing organizations, 3) Timeline and milestones, 4) Community resources.',
      requiredForDeployment: false,
    },
  ],
};

/**
 * Pattern registry containing all validated patterns
 */
export const VALIDATED_PATTERNS: Record<PlatformType, ValidatedPattern | null> = {
  openshift: OPENSHIFT_PATTERN,
  kubernetes: KUBERNETES_PATTERN,
  docker: DOCKER_PATTERN,
  nodejs: NODEJS_PATTERN,
  python: PYTHON_PATTERN,
  mcp: MCP_PATTERN,
  a2a: A2A_PATTERN,
  hybrid: null, // Hybrid patterns are composed dynamically
};

/**
 * Get pattern by platform type
 */
export function getPattern(platformType: PlatformType): ValidatedPattern | null {
  return VALIDATED_PATTERNS[platformType];
}

/**
 * List all available patterns
 */
export function listAllPatterns(): ValidatedPattern[] {
  return Object.values(VALIDATED_PATTERNS).filter((p): p is ValidatedPattern => p !== null);
}
