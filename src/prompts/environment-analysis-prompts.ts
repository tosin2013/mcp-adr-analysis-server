/**
 * AI prompts for environment context analysis
 * Following prompt-driven development approach
 */

/**
 * AI prompt for analyzing system environment specifications
 */
export function generateEnvironmentSpecAnalysisPrompt(
  environmentFiles: Array<{
    filename: string;
    content: string;
    type: 'dockerfile' | 'compose' | 'kubernetes' | 'terraform' | 'config' | 'other';
  }>,
  projectStructure: string
): string {
  return `
# System Environment Specification Analysis

Please analyze the following environment specifications and project structure to understand the deployment environment and infrastructure requirements.

## Environment Files
${environmentFiles.map((file, index) => `
### ${index + 1}. ${file.filename} (${file.type})
\`\`\`
${file.content.slice(0, 1500)}${file.content.length > 1500 ? '\n... (truncated for analysis)' : ''}
\`\`\`
`).join('')}

## Project Structure
\`\`\`
${projectStructure}
\`\`\`

## Analysis Requirements

Please analyze the environment specifications for:

### 🏗️ **Infrastructure Components**
- **Compute Resources**: CPU, memory, storage requirements
- **Network Configuration**: Ports, protocols, load balancing
- **Storage Systems**: Databases, file systems, caching layers
- **Security Components**: Authentication, authorization, encryption
- **Monitoring & Logging**: Observability infrastructure
- **Backup & Recovery**: Data protection mechanisms

### 🐳 **Containerization Analysis**
- **Container Technology**: Docker, Podman, containerd
- **Orchestration Platform**: Kubernetes, Docker Swarm, ECS
- **Image Management**: Base images, multi-stage builds, registries
- **Resource Limits**: CPU, memory, storage constraints
- **Health Checks**: Liveness, readiness, startup probes
- **Networking**: Service mesh, ingress, load balancing

### ☁️ **Cloud & Platform Services**
- **Cloud Provider**: AWS, Azure, GCP, hybrid, on-premises
- **Platform Services**: Managed databases, message queues, caches
- **Serverless Components**: Functions, event-driven architecture
- **CDN & Edge**: Content delivery, edge computing
- **Identity & Access**: IAM, service accounts, RBAC
- **Compliance**: Security standards, regulatory requirements

### 🔧 **Configuration Management**
- **Environment Variables**: Configuration patterns and security
- **Secrets Management**: Credential storage and rotation
- **Feature Flags**: Dynamic configuration capabilities
- **Service Discovery**: How services find and communicate
- **Configuration Sources**: Files, databases, external services
- **Environment Promotion**: Dev, staging, production workflows

## Output Format

Please provide your analysis in the following JSON format:

\`\`\`json
{
  "environmentAnalysis": {
    "environmentType": "containerized|serverless|traditional|hybrid",
    "complexity": "simple|moderate|complex|enterprise",
    "maturity": "prototype|development|production|enterprise",
    "cloudNative": true/false,
    "scalabilityPattern": "vertical|horizontal|auto|manual"
  },
  "infrastructure": {
    "compute": {
      "type": "containers|vms|bare_metal|serverless",
      "orchestration": "kubernetes|docker_swarm|ecs|none",
      "resourceRequirements": {
        "cpu": "detected CPU requirements",
        "memory": "detected memory requirements",
        "storage": "detected storage requirements"
      }
    },
    "networking": {
      "loadBalancer": "detected load balancer type",
      "serviceMesh": "detected service mesh",
      "ingress": "detected ingress configuration",
      "ports": ["exposed ports"]
    },
    "storage": {
      "databases": ["detected database systems"],
      "caching": ["detected caching systems"],
      "fileStorage": ["detected file storage systems"],
      "persistence": "persistent|ephemeral|mixed"
    },
    "security": {
      "authentication": ["detected auth mechanisms"],
      "authorization": ["detected authz systems"],
      "encryption": ["detected encryption methods"],
      "secrets": ["detected secret management"]
    }
  },
  "containerization": {
    "technology": "docker|podman|containerd|none",
    "baseImages": ["detected base images"],
    "buildStrategy": "single_stage|multi_stage|distroless",
    "registries": ["detected container registries"],
    "healthChecks": true/false,
    "resourceLimits": true/false,
    "securityScanning": true/false
  },
  "cloudServices": {
    "provider": "aws|azure|gcp|multi_cloud|on_premises|hybrid",
    "managedServices": ["detected managed services"],
    "serverlessComponents": ["detected serverless functions"],
    "platformServices": ["detected platform services"],
    "complianceFrameworks": ["detected compliance requirements"]
  },
  "configuration": {
    "environmentVariables": true/false,
    "secretsManagement": "kubernetes|vault|cloud_native|files",
    "configMaps": true/false,
    "featureFlags": true/false,
    "serviceDiscovery": "dns|service_mesh|registry|manual"
  },
  "qualityAttributes": {
    "availability": "high|medium|low|unknown",
    "scalability": "high|medium|low|unknown",
    "performance": "high|medium|low|unknown",
    "security": "high|medium|low|unknown",
    "maintainability": "high|medium|low|unknown",
    "observability": "high|medium|low|unknown"
  },
  "recommendations": [
    {
      "category": "infrastructure|security|performance|scalability|maintainability",
      "priority": "critical|high|medium|low",
      "description": "specific recommendation",
      "rationale": "why this recommendation is important",
      "implementation": "how to implement this recommendation",
      "effort": "low|medium|high",
      "impact": "low|medium|high|critical"
    }
  ],
  "gaps": [
    {
      "area": "missing or inadequate area",
      "description": "what's missing or inadequate",
      "risk": "potential risk if not addressed",
      "suggestion": "suggested improvement"
    }
  ]
}
\`\`\`

## Analysis Guidelines

1. **Comprehensive Coverage**: Analyze all aspects of the environment
2. **Evidence-Based**: Base conclusions on actual configuration files
3. **Best Practices**: Compare against industry best practices
4. **Security Focus**: Pay special attention to security configurations
5. **Scalability Assessment**: Evaluate scalability patterns and limitations
6. **Practical Recommendations**: Provide actionable improvement suggestions

Please provide a thorough analysis of the environment specifications and infrastructure.
`;
}

/**
 * AI prompt for detecting containerization technologies
 */
export function generateContainerizationDetectionPrompt(
  projectFiles: Array<{
    filename: string;
    content: string;
    path: string;
  }>
): string {
  return `
# Containerization Technology Detection

Please analyze the following project files to detect containerization technologies, patterns, and configurations.

## Project Files
${projectFiles.map((file, index) => `
### ${index + 1}. ${file.filename}
**Path**: ${file.path}
\`\`\`
${file.content.slice(0, 1000)}${file.content.length > 1000 ? '\n... (truncated)' : ''}
\`\`\`
`).join('')}

## Detection Requirements

Please identify:

### 🐳 **Container Technologies**
- **Docker**: Dockerfile, docker-compose.yml, .dockerignore
- **Podman**: Containerfile, podman-compose
- **Buildah**: Build scripts and configurations
- **Container Registries**: Registry configurations and references
- **Base Images**: Detected base images and versions

### 🎛️ **Orchestration Platforms**
- **Kubernetes**: Manifests, Helm charts, operators
- **Docker Swarm**: Stack files and swarm configurations
- **Amazon ECS**: Task definitions and service configurations
- **Azure Container Instances**: Container group definitions
- **Google Cloud Run**: Service configurations

### 🔧 **Build & Deployment**
- **Multi-stage Builds**: Optimization patterns
- **Build Tools**: BuildKit, Kaniko, Jib
- **CI/CD Integration**: Pipeline configurations
- **Image Scanning**: Security scanning tools
- **Registry Management**: Push/pull configurations

### 📊 **Resource Management**
- **Resource Limits**: CPU, memory constraints
- **Health Checks**: Liveness, readiness probes
- **Scaling Policies**: Horizontal/vertical scaling
- **Storage Mounts**: Volume and storage configurations
- **Network Policies**: Container networking rules

## Output Format

Please provide your analysis in the following JSON format:

\`\`\`json
{
  "containerization": {
    "detected": true/false,
    "technology": "docker|podman|buildah|multiple|none",
    "maturity": "basic|intermediate|advanced|enterprise",
    "orchestration": "kubernetes|docker_swarm|ecs|cloud_run|none"
  },
  "dockerfiles": [
    {
      "path": "path to dockerfile",
      "baseImage": "detected base image",
      "stages": "single|multi",
      "optimization": "basic|optimized|distroless",
      "securityPractices": ["detected security practices"],
      "issues": ["identified issues or improvements"]
    }
  ],
  "composeFiles": [
    {
      "path": "path to compose file",
      "version": "compose file version",
      "services": ["service names"],
      "networks": ["network configurations"],
      "volumes": ["volume configurations"],
      "secrets": ["secret configurations"]
    }
  ],
  "kubernetesManifests": [
    {
      "path": "path to manifest",
      "kind": "Deployment|Service|ConfigMap|Secret|etc",
      "apiVersion": "kubernetes api version",
      "resourceLimits": true/false,
      "healthChecks": true/false,
      "securityContext": true/false
    }
  ],
  "buildConfiguration": {
    "multistage": true/false,
    "optimization": "none|basic|advanced",
    "securityScanning": true/false,
    "registryIntegration": true/false,
    "cicdIntegration": true/false
  },
  "resourceManagement": {
    "cpuLimits": true/false,
    "memoryLimits": true/false,
    "storageConfiguration": true/false,
    "networkPolicies": true/false,
    "scalingPolicies": true/false
  },
  "bestPractices": {
    "nonRootUser": true/false,
    "minimalBaseImage": true/false,
    "layerOptimization": true/false,
    "secretsManagement": true/false,
    "healthChecks": true/false,
    "resourceLimits": true/false
  },
  "recommendations": [
    {
      "category": "security|performance|optimization|best_practices",
      "priority": "critical|high|medium|low",
      "description": "specific recommendation",
      "currentState": "what was detected",
      "improvedState": "what should be implemented",
      "implementation": "how to implement"
    }
  ],
  "securityFindings": [
    {
      "severity": "critical|high|medium|low|info",
      "finding": "security issue description",
      "location": "file and line if applicable",
      "remediation": "how to fix this issue"
    }
  ]
}
\`\`\`

## Detection Guidelines

1. **Thorough Scanning**: Check all relevant file types and patterns
2. **Version Detection**: Identify specific versions where possible
3. **Security Assessment**: Evaluate security configurations and practices
4. **Best Practice Comparison**: Compare against industry standards
5. **Practical Recommendations**: Provide actionable improvement suggestions
6. **Risk Assessment**: Identify security and operational risks

Please provide comprehensive containerization technology detection and analysis.
`;
}

/**
 * AI prompt for determining environment requirements from ADRs
 */
export function generateAdrEnvironmentRequirementsPrompt(
  adrFiles: Array<{
    id: string;
    title: string;
    content: string;
    status: string;
  }>
): string {
  return `
# Environment Requirements Analysis from ADRs

Please analyze the following Architectural Decision Records to extract environment and infrastructure requirements.

## ADR Files
${adrFiles.map((adr, index) => `
### ${index + 1}. ${adr.title}
**ID**: ${adr.id}
**Status**: ${adr.status}

**Content**:
\`\`\`markdown
${adr.content.slice(0, 1200)}${adr.content.length > 1200 ? '\n... (truncated)' : ''}
\`\`\`
`).join('')}

## Requirements Extraction

Please identify environment requirements in these categories:

### 🏗️ **Infrastructure Requirements**
- **Compute**: CPU, memory, processing requirements
- **Storage**: Database, file storage, backup needs
- **Network**: Bandwidth, latency, connectivity requirements
- **Security**: Compliance, encryption, access control
- **Availability**: Uptime, disaster recovery, redundancy
- **Scalability**: Growth patterns, load handling

### 🐳 **Platform Requirements**
- **Container Orchestration**: Kubernetes, Docker Swarm needs
- **Cloud Services**: Managed services, serverless requirements
- **Runtime Environment**: Language runtimes, frameworks
- **Database Systems**: SQL, NoSQL, caching requirements
- **Message Queues**: Async communication needs
- **Monitoring**: Observability and alerting requirements

### 🔒 **Security & Compliance**
- **Data Protection**: Encryption, privacy requirements
- **Access Control**: Authentication, authorization needs
- **Compliance Standards**: GDPR, HIPAA, SOC2, etc.
- **Network Security**: Firewalls, VPNs, segmentation
- **Audit & Logging**: Compliance logging requirements
- **Vulnerability Management**: Security scanning needs

### 📊 **Performance & Scalability**
- **Response Time**: Latency requirements
- **Throughput**: Transaction volume handling
- **Concurrent Users**: User load requirements
- **Data Volume**: Storage and processing capacity
- **Geographic Distribution**: Multi-region needs
- **Caching Strategy**: Performance optimization

## Output Format

Please provide your analysis in the following JSON format:

\`\`\`json
{
  "environmentRequirements": {
    "extractedFrom": ${adrFiles.length},
    "confidence": 0.0-1.0,
    "completeness": 0.0-1.0,
    "lastAnalyzed": "ISO-8601-timestamp"
  },
  "infrastructure": {
    "compute": {
      "cpuRequirements": "detected CPU needs",
      "memoryRequirements": "detected memory needs",
      "storageRequirements": "detected storage needs",
      "sourceAdrs": ["adr-ids that specify these requirements"]
    },
    "networking": {
      "bandwidthRequirements": "detected bandwidth needs",
      "latencyRequirements": "detected latency needs",
      "connectivityRequirements": "detected connectivity needs",
      "sourceAdrs": ["adr-ids that specify these requirements"]
    },
    "availability": {
      "uptimeRequirements": "detected uptime needs",
      "redundancyRequirements": "detected redundancy needs",
      "disasterRecoveryRequirements": "detected DR needs",
      "sourceAdrs": ["adr-ids that specify these requirements"]
    }
  },
  "platform": {
    "containerization": {
      "required": true/false,
      "orchestrationNeeds": "kubernetes|docker_swarm|ecs|none",
      "scalingRequirements": "horizontal|vertical|auto|manual",
      "sourceAdrs": ["adr-ids that specify these requirements"]
    },
    "cloudServices": {
      "required": true/false,
      "preferredProvider": "aws|azure|gcp|multi_cloud|agnostic",
      "managedServices": ["required managed services"],
      "sourceAdrs": ["adr-ids that specify these requirements"]
    },
    "databases": {
      "types": ["sql|nosql|cache|search|timeseries"],
      "specificSystems": ["postgresql|mongodb|redis|elasticsearch"],
      "consistencyRequirements": "strong|eventual|weak",
      "sourceAdrs": ["adr-ids that specify these requirements"]
    }
  },
  "security": {
    "compliance": {
      "standards": ["gdpr|hipaa|soc2|pci_dss|iso27001"],
      "dataClassification": ["public|internal|confidential|restricted"],
      "auditRequirements": "basic|detailed|comprehensive",
      "sourceAdrs": ["adr-ids that specify these requirements"]
    },
    "accessControl": {
      "authenticationMethods": ["oauth|saml|ldap|mfa"],
      "authorizationModel": "rbac|abac|acl|custom",
      "identityProvider": "internal|external|federated",
      "sourceAdrs": ["adr-ids that specify these requirements"]
    },
    "dataProtection": {
      "encryptionRequirements": "at_rest|in_transit|end_to_end",
      "keyManagement": "cloud_kms|hsm|software",
      "privacyRequirements": "anonymization|pseudonymization|retention",
      "sourceAdrs": ["adr-ids that specify these requirements"]
    }
  },
  "performance": {
    "responseTime": {
      "requirements": "detected response time needs",
      "slaTargets": "detected SLA targets",
      "sourceAdrs": ["adr-ids that specify these requirements"]
    },
    "throughput": {
      "requirements": "detected throughput needs",
      "peakLoad": "detected peak load handling",
      "sourceAdrs": ["adr-ids that specify these requirements"]
    },
    "scalability": {
      "userLoad": "detected concurrent user requirements",
      "dataVolume": "detected data volume requirements",
      "growthProjections": "detected growth expectations",
      "sourceAdrs": ["adr-ids that specify these requirements"]
    }
  },
  "operationalRequirements": {
    "monitoring": {
      "metricsRequired": ["application|infrastructure|business"],
      "alertingNeeds": "basic|advanced|intelligent",
      "observabilityLevel": "basic|detailed|comprehensive",
      "sourceAdrs": ["adr-ids that specify these requirements"]
    },
    "deployment": {
      "strategy": "blue_green|canary|rolling|recreate",
      "frequency": "continuous|daily|weekly|monthly",
      "automationLevel": "manual|semi_automated|fully_automated",
      "sourceAdrs": ["adr-ids that specify these requirements"]
    },
    "maintenance": {
      "backupRequirements": "detected backup needs",
      "updateStrategy": "detected update approach",
      "maintenanceWindows": "detected maintenance requirements",
      "sourceAdrs": ["adr-ids that specify these requirements"]
    }
  },
  "gaps": [
    {
      "category": "infrastructure|platform|security|performance|operational",
      "description": "missing or unclear requirement",
      "impact": "potential impact of this gap",
      "recommendation": "suggested action to address gap"
    }
  ],
  "recommendations": [
    {
      "category": "infrastructure|platform|security|performance|operational",
      "priority": "critical|high|medium|low",
      "description": "specific recommendation",
      "rationale": "why this is recommended based on ADRs",
      "implementation": "how to implement this recommendation"
    }
  ]
}
\`\`\`

## Analysis Guidelines

1. **Explicit Requirements**: Extract clearly stated requirements from ADRs
2. **Implicit Requirements**: Infer requirements from architectural decisions
3. **Traceability**: Link requirements back to specific ADRs
4. **Completeness**: Identify gaps in requirement coverage
5. **Consistency**: Check for conflicting requirements across ADRs
6. **Practicality**: Ensure requirements are implementable

Please provide comprehensive environment requirements analysis based on the ADRs.
`;
}

/**
 * AI prompt for environment compliance assessment
 */
export function generateEnvironmentCompliancePrompt(
  currentEnvironment: any,
  requirements: any,
  industryStandards?: string[]
): string {
  return `
# Environment Compliance Assessment

Please assess the compliance of the current environment against requirements and industry standards.

## Current Environment
\`\`\`json
${JSON.stringify(currentEnvironment, null, 2)}
\`\`\`

## Requirements
\`\`\`json
${JSON.stringify(requirements, null, 2)}
\`\`\`

${industryStandards ? `## Industry Standards
${industryStandards.map(standard => `- ${standard}`).join('\n')}
` : ''}

## Compliance Assessment

Please evaluate compliance in these areas:

### 🏗️ **Infrastructure Compliance**
- **Resource Adequacy**: CPU, memory, storage sufficiency
- **Availability**: Uptime and redundancy compliance
- **Scalability**: Growth and load handling capability
- **Network**: Bandwidth, latency, connectivity compliance
- **Security**: Infrastructure security posture
- **Monitoring**: Observability and alerting coverage

### 🔒 **Security Compliance**
- **Access Control**: Authentication and authorization compliance
- **Data Protection**: Encryption and privacy compliance
- **Network Security**: Firewall, VPN, segmentation compliance
- **Compliance Standards**: GDPR, HIPAA, SOC2, etc.
- **Vulnerability Management**: Security scanning and patching
- **Audit & Logging**: Compliance logging and monitoring

### 📊 **Performance Compliance**
- **Response Time**: Latency requirement compliance
- **Throughput**: Transaction volume handling compliance
- **Scalability**: User load and data volume compliance
- **Availability**: SLA and uptime compliance
- **Resource Utilization**: Efficiency and optimization
- **Caching**: Performance optimization compliance

### 🛠️ **Operational Compliance**
- **Deployment**: CI/CD and deployment process compliance
- **Monitoring**: Observability and alerting compliance
- **Backup & Recovery**: Data protection compliance
- **Maintenance**: Update and maintenance process compliance
- **Documentation**: Operational documentation compliance
- **Training**: Team knowledge and skill compliance

## Output Format

Please provide your assessment in the following JSON format:

\`\`\`json
{
  "complianceAssessment": {
    "overallScore": 0.0-1.0,
    "assessmentDate": "ISO-8601-timestamp",
    "assessmentScope": "full|partial|targeted",
    "riskLevel": "low|medium|high|critical",
    "complianceStatus": "compliant|non_compliant|partially_compliant"
  },
  "categoryScores": {
    "infrastructure": 0.0-1.0,
    "security": 0.0-1.0,
    "performance": 0.0-1.0,
    "operational": 0.0-1.0
  },
  "complianceDetails": [
    {
      "category": "infrastructure|security|performance|operational",
      "requirement": "specific requirement being assessed",
      "currentState": "what is currently implemented",
      "requiredState": "what is required",
      "complianceStatus": "compliant|non_compliant|partially_compliant|not_applicable",
      "gap": "description of any compliance gap",
      "riskLevel": "low|medium|high|critical",
      "effort": "low|medium|high",
      "priority": "low|medium|high|critical"
    }
  ],
  "violations": [
    {
      "severity": "critical|high|medium|low|info",
      "category": "infrastructure|security|performance|operational",
      "violation": "description of compliance violation",
      "requirement": "requirement that is violated",
      "currentState": "current non-compliant state",
      "requiredState": "required compliant state",
      "remediation": "how to fix this violation",
      "timeline": "suggested timeline for remediation",
      "impact": "business/technical impact of violation"
    }
  ],
  "strengths": [
    {
      "category": "infrastructure|security|performance|operational",
      "strength": "area where compliance exceeds requirements",
      "description": "detailed description of the strength",
      "value": "business/technical value provided"
    }
  ],
  "recommendations": [
    {
      "priority": "critical|high|medium|low",
      "category": "infrastructure|security|performance|operational",
      "recommendation": "specific recommendation",
      "rationale": "why this recommendation is important",
      "implementation": "how to implement this recommendation",
      "effort": "low|medium|high",
      "impact": "low|medium|high|critical",
      "timeline": "suggested implementation timeline",
      "dependencies": ["any dependencies for implementation"]
    }
  ],
  "improvementPlan": {
    "immediate": [
      {
        "action": "immediate action required",
        "timeline": "within days",
        "owner": "suggested responsible party",
        "success_criteria": "how to measure success"
      }
    ],
    "shortTerm": [
      {
        "action": "short-term improvement",
        "timeline": "1-4 weeks",
        "dependencies": ["what this depends on"],
        "resources": ["required resources"]
      }
    ],
    "mediumTerm": [
      {
        "action": "medium-term improvement",
        "timeline": "1-3 months",
        "strategic_value": "strategic importance",
        "investment": "required investment"
      }
    ],
    "longTerm": [
      {
        "action": "long-term improvement",
        "timeline": "3+ months",
        "vision": "long-term vision",
        "transformation": "expected transformation"
      }
    ]
  },
  "riskAssessment": {
    "criticalRisks": [
      {
        "risk": "description of critical risk",
        "probability": "low|medium|high",
        "impact": "low|medium|high|critical",
        "mitigation": "risk mitigation strategy"
      }
    ],
    "operationalRisks": [
      {
        "risk": "description of operational risk",
        "probability": "low|medium|high",
        "impact": "low|medium|high|critical",
        "mitigation": "risk mitigation strategy"
      }
    ]
  },
  "complianceMetrics": {
    "requirementsCovered": 0,
    "requirementsTotal": 0,
    "violationsCount": 0,
    "criticalViolations": 0,
    "compliancePercentage": 0.0-1.0,
    "improvementOpportunities": 0
  }
}
\`\`\`

## Assessment Guidelines

1. **Objective Evaluation**: Base assessment on factual analysis
2. **Risk-Based Prioritization**: Focus on high-risk compliance gaps
3. **Actionable Recommendations**: Provide specific, implementable suggestions
4. **Timeline Awareness**: Consider realistic implementation timelines
5. **Business Impact**: Assess business implications of compliance gaps
6. **Continuous Improvement**: Suggest ongoing compliance monitoring

Please provide a comprehensive, actionable compliance assessment.
`;
}
