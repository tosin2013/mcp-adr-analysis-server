# Validated Patterns

This directory contains YAML-based pattern definitions for different deployment platforms, runtimes, and protocols.

## Directory Structure

```
patterns/
├── README.md (this file)
├── schema.json                          # JSON Schema for validation
├── infrastructure/                      # Infrastructure-only patterns
│   ├── openshift.yaml
│   ├── kubernetes.yaml
│   ├── docker.yaml
│   ├── aws.yaml
│   └── azure.yaml
├── runtime/                             # Runtime-only patterns
│   ├── nodejs.yaml
│   ├── python.yaml
│   ├── java.yaml
│   └── go.yaml
├── composite/                           # Composite patterns (infra + runtime)
│   ├── firebase-nodejs.yaml
│   ├── firebase-python.yaml
│   ├── aws-lambda-nodejs.yaml
│   ├── aws-lambda-python.yaml
│   ├── azure-functions-nodejs.yaml
│   ├── gcp-cloudrun-go.yaml
│   ├── openshift-nodejs-gitops.yaml
│   └── kubernetes-python-django.yaml
└── protocol/                            # Protocol patterns
    ├── mcp.yaml
    └── a2a.yaml
```

## Pattern Categories

### Infrastructure Patterns

Platform-specific deployment patterns (OpenShift, Kubernetes, Docker, AWS, Azure, GCP, Firebase).

### Runtime Patterns

Language/framework-specific patterns (Node.js, Python, Java, Go, Rust, .NET).

### Composite Patterns

Combined infrastructure + runtime patterns (Firebase + Node.js, AWS Lambda + Python, etc.).

### Protocol Patterns

Communication protocol patterns (MCP, A2A, REST, GraphQL, gRPC).

## Pattern Structure

Each pattern is defined in YAML format with the following structure:

```yaml
version: '1.0'
id: 'unique-pattern-id'
name: 'Human Readable Pattern Name'
description: 'Brief description of the pattern'

composition:
  infrastructure: 'firebase|kubernetes|aws|...'
  runtime: 'nodejs|python|java|...'
  protocol: 'mcp|rest-api|grpc|...'
  strategy: 'gitops|serverless|container|...'

authoritativeSources:
  - type: 'documentation|repository|specification|examples|community'
    url: 'https://...'
    purpose: 'Why this source is important'
    priority: 1-10
    requiredForDeployment: true|false
    queryInstructions: |
      Instructions for LLMs on how to query this source

baseCodeRepository:
  url: 'https://github.com/...'
  purpose: 'Starter code or examples'
  integrationInstructions: |
    How to integrate this base code

dependencies:
  - name: 'tool-name'
    type: 'buildtime|runtime'
    required: true|false
    installCommand: 'npm install ...'
    verificationCommand: 'tool --version'

configurations:
  - path: 'config.json'
    purpose: 'Configuration file purpose'
    required: true|false
    canAutoGenerate: true|false
    template: |
      Template content

secrets:
  - name: 'secret-name'
    purpose: 'What this secret is for'
    environmentVariable: 'ENV_VAR_NAME'
    required: true|false

infrastructure:
  - component: 'Component Name'
    purpose: 'What this component does'
    required: true|false
    setupCommands: ['command1', 'command2']
    healthCheckCommand: 'health check command'

deploymentPhases:
  - order: 1
    name: 'Phase Name'
    description: 'What happens in this phase'
    estimatedDuration: '5 minutes'
    canParallelize: false
    prerequisites: ['Previous Phase Name']
    commands:
      - description: 'Command description'
        command: 'actual command'
        expectedExitCode: 0

validationChecks:
  - id: 'check-id'
    name: 'Check Name'
    description: 'What this check validates'
    command: 'validation command'
    expectedExitCode: 0
    severity: 'critical|error|warning|info'
    failureMessage: 'Message when check fails'
    remediationSteps: ['Step 1', 'Step 2']

healthChecks:
  - name: 'Health Check Name'
    endpoint: 'http://...'
    interval: 60000
    timeout: 10000
    healthyThreshold: 1
    unhealthyThreshold: 3

metadata:
  source: 'Where this pattern comes from'
  lastUpdated: '2025-01-19'
  maintainer: 'Organization or Person'
  tags: ['tag1', 'tag2']
  contributors:
    - name: 'Contributor Name'
      github: 'username'
  changeLog:
    - version: '1.0'
      date: '2025-01-19'
      changes: ['Change 1', 'Change 2']

detectionHints:
  requiredFiles: ['file1', 'file2']
  optionalFiles: ['file3']
  confidence:
    file1: 0.9
    file2: 0.8
```

## Selecting Authoritative Sources (URLs)

When adding patterns, **authoritative sources are critical** - they're what LLMs will query to generate accurate deployment plans. Here's what to look for:

### 🎯 Priority 10 Sources (Required for Deployment)

These are **must-have** sources that LLMs should always consult:

#### 1. **Official Documentation Sites**

- **What**: Vendor/project official documentation home pages
- **Examples**:
  - `https://validatedpatterns.io/` (OpenShift Validated Patterns)
  - `https://firebase.google.com/docs/functions` (Firebase Functions)
  - `https://docs.aws.amazon.com/lambda/` (AWS Lambda)
  - `https://kubernetes.io/docs/` (Kubernetes)
- **Why**: Primary source of truth, kept up-to-date, comprehensive coverage
- **Priority**: 10 (required)

#### 2. **Interactive Tutorials & Workshops**

- **What**: Hands-on learning resources, guided tutorials
- **Examples**:
  - `https://play.validatedpatterns.io/vp-workshop/main/index.html` (Validated Patterns Workshop)
  - `https://kubernetes.io/docs/tutorials/` (K8s Tutorials)
  - `https://firebase.google.com/codelabs` (Firebase Codelabs)
- **Why**: Step-by-step guidance, real-world examples, troubleshooting
- **Priority**: 10 (required)

#### 3. **Official Code Repositories**

- **What**: Framework code, starter templates, examples
- **Examples**:
  - `https://github.com/validatedpatterns/common` (Validated Patterns Framework)
  - `https://github.com/firebase/functions-samples` (Firebase Samples)
  - `https://github.com/aws-samples/aws-lambda-*` (AWS Lambda Samples)
- **Why**: Production-ready code, integration patterns, best practices
- **Priority**: 10 (required)

### 📚 Priority 9 Sources (Highly Recommended)

#### 4. **Pattern/Framework Collections**

- **What**: Collections of related patterns or implementations
- **Examples**:
  - `https://github.com/validatedpatterns` (All Validated Patterns)
  - `https://aws.amazon.com/architecture/` (AWS Architecture Center)
  - `https://cloud.google.com/architecture/` (GCP Architecture)
- **Why**: Multiple implementation examples, architectural guidance
- **Priority**: 9

#### 5. **Getting Started Guides**

- **What**: Quick start documentation, setup guides
- **Examples**:
  - `https://docs.openshift.com/container-platform/4.14/getting-started/` (OpenShift Getting Started)
  - `https://firebase.google.com/docs/functions/get-started` (Firebase Quick Start)
- **Why**: Fast onboarding, prerequisites, first deployment
- **Priority**: 9

### 🔧 Priority 7-8 Sources (Supplementary)

#### 6. **Developer Tools & CLIs**

- **What**: Developer-focused tooling documentation
- **Examples**:
  - `https://github.com/openshift/odo` (OpenShift Do)
  - `https://firebase.google.com/docs/cli` (Firebase CLI)
- **Why**: Developer workflow, local development, iteration
- **Priority**: 7-8

#### 7. **Community Resources**

- **What**: Community-driven documentation, blog posts, forums
- **Examples**:
  - `https://stackoverflow.com/questions/tagged/openshift`
  - `https://community.firebase.google.com/`
- **Why**: Real-world issues, community solutions, edge cases
- **Priority**: 7

### 🔍 Priority 6 Sources (Foundation Knowledge)

#### 8. **Underlying Technology Specs**

- **What**: Core technology that the pattern builds on
- **Examples**:
  - `https://kubernetes.io/docs/` (for OpenShift patterns)
  - `https://nodejs.org/docs/` (for Node.js patterns)
- **Why**: Foundational understanding, core concepts
- **Priority**: 6

### ❌ URLs to Avoid

- **Marketing pages** without technical content
- **Outdated documentation** (check last update date)
- **Third-party blogs** unless exceptionally authoritative
- **Paywalled content** that LLMs can't access
- **Login-required pages** without public content

### 🎨 URL Selection Checklist

When adding a source, ask:

- [ ] Is this URL publicly accessible (no login)?
- [ ] Is it actively maintained (updated in last 12 months)?
- [ ] Does it provide actionable deployment guidance?
- [ ] Is it from the official vendor/project?
- [ ] Would an LLM find concrete steps here, not just marketing?
- [ ] Does it complement (not duplicate) other sources?

### 📖 Writing Query Instructions

For each URL, provide clear `queryInstructions` telling LLMs:

**Good Example**:

```yaml
queryInstructions: |
  Essential reading for OpenShift deployments:
  1. Browse available validated patterns (Multicluster GitOps, Industrial Edge)
  2. Understand the Validated Patterns framework structure
  3. Review pattern architecture and components
  4. Check prerequisites and requirements
  5. Identify which pattern best fits the use case

  This is the PRIMARY source for OpenShift best practices.
```

**Bad Example**:

```yaml
queryInstructions: 'Read this for information'
```

**Key Points**:

- Numbered steps for clarity
- Specific sections to review
- Why this source is important
- What to extract from it

## Creating a New Pattern

1. **Choose the right directory**:
   - `infrastructure/` for platform-only patterns
   - `runtime/` for language-only patterns
   - `composite/` for combined patterns (recommended)
   - `protocol/` for communication protocol patterns

2. **Create the YAML file**:

   ```bash
   cp patterns/infrastructure/openshift.yaml patterns/infrastructure/my-pattern.yaml
   ```

3. **Select authoritative sources** following the guidelines above

4. **Fill in the pattern details** following the schema

5. **Validate the pattern**:

   ```bash
   npm run validate:patterns
   ```

6. **Test the pattern**:
   - Ensure all URLs are accessible
   - Validate the YAML syntax
   - Test pattern loading with PatternLoader utility

7. **Submit a pull request** with your new pattern

## Validation

Patterns are automatically validated using JSON Schema on every commit and pull request.

### Required Fields

- `version`
- `id`
- `name`
- `description`
- `authoritativeSources` (at least 1)
- `deploymentPhases` (at least 1)

### URL Validation

All authoritative source URLs are checked weekly to ensure they're still accessible.

## Contributing

We welcome contributions of new patterns! 🎉

**Quick Start:**

1. Fork the repository
2. Create a new pattern file following our [Contribution Guide](./CONTRIBUTING.md)
3. Test locally: `npm run validate:patterns`
4. Submit a pull request
5. Our GitHub Actions will automatically validate your pattern!

**Read the full guide:** [patterns/CONTRIBUTING.md](./CONTRIBUTING.md)

**What gets validated:**

- ✅ JSON Schema compliance
- ✅ Required fields and structure
- ✅ Authoritative sources (at least 3, with 1 required)
- ✅ Deployment phases (at least 3, sequential)
- ✅ Detection hints with confidence scores
- ✅ URL formats and quality
- ✅ YAML syntax and consistency

Our CI/CD will comment on your PR with validation results!

## Examples

- `patterns/composite/firebase-nodejs.yaml` - Complete example for Firebase + Node.js
- More examples coming soon!

---

For more information, see the [Dynamic Pattern Configuration System](../docs/how-to-guides/dynamic-pattern-configuration-system.md) documentation.
