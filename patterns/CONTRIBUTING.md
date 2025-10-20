# Contributing Patterns

Thank you for contributing to the Validated Patterns library! This guide will help you create high-quality pattern definitions that will be automatically validated by our CI/CD system.

## Quick Start

1. **Fork the repository**
2. **Create a new pattern file** in the appropriate directory
3. **Follow the pattern template** (see below)
4. **Test locally** with `npm run validate:patterns`
5. **Submit a pull request**

Our GitHub Actions will automatically validate your pattern!

## Pattern Directory Structure

```
patterns/
├── infrastructure/     # Platform patterns (OpenShift, Kubernetes, AWS, Firebase, etc.)
├── runtime/           # Language/framework patterns (Node.js, Python, Java, Go, etc.)
├── composite/         # Combined patterns (Firebase + Node.js, AWS Lambda + Python, etc.)
└── protocol/          # Protocol patterns (MCP, REST, GraphQL, gRPC, etc.)
```

## Creating a New Pattern

### 1. Choose the Right Directory

- **infrastructure/**: Platform-only patterns (e.g., `kubernetes.yaml`, `aws.yaml`)
- **runtime/**: Language-only patterns (e.g., `nodejs.yaml`, `python.yaml`)
- **composite/**: Combined patterns (e.g., `firebase-nodejs.yaml`, `aws-lambda-python.yaml`)
- **protocol/**: Communication protocols (e.g., `mcp.yaml`, `grpc.yaml`)

### 2. Copy a Template

Use an existing pattern as a template:

```bash
# For infrastructure patterns
cp patterns/infrastructure/kubernetes.yaml patterns/infrastructure/my-platform.yaml

# For composite patterns
cp patterns/composite/firebase-nodejs.yaml patterns/composite/my-platform-runtime.yaml
```

### 3. Required Fields

Every pattern MUST have these fields:

```yaml
version: '1.0'
id: 'my-pattern-v1' # Unique identifier (lowercase, kebab-case)
name: 'My Platform Name'
description: 'Brief description of what this pattern deploys'

composition:
  infrastructure: 'my-platform' # or omit for runtime-only
  runtime: 'nodejs' # or omit for infrastructure-only
  protocol: 'rest-api' # optional
  strategy: 'serverless' # e.g., gitops, serverless, container

authoritativeSources:
  - type: 'documentation'
    url: 'https://official-docs-url.com/'
    purpose: 'Official documentation'
    priority: 10
    requiredForDeployment: true
    queryInstructions: |
      Essential reading:
      1. Review core concepts
      2. Understand deployment workflow
      3. Check prerequisites

deploymentPhases:
  - order: 1
    name: 'Phase Name'
    description: 'What happens in this phase'
    estimatedDuration: '5-10 minutes'
    canParallelize: false
    prerequisites: []
    commands:
      - description: 'Command description'
        command: 'actual command'
        expectedExitCode: 0

metadata:
  source: 'Source organization or project'
  lastUpdated: '2025-01-19'
  maintainer: 'Organization Name'
  tags:
    - 'tag1'
    - 'tag2'

detectionHints:
  requiredFiles:
    - 'config.yaml'
  optionalFiles:
    - 'optional-config.json'
  confidence:
    config.yaml: 0.90
```

## Authoritative Sources Best Practices

### Priority Levels

Use this priority scale (1-10):

- **Priority 10** (Required): Official documentation, interactive tutorials, code repositories
- **Priority 9** (Highly Recommended): Pattern collections, getting started guides
- **Priority 7-8** (Supplementary): Developer tools, community resources
- **Priority 6** (Foundation): Underlying technology specs

### Writing Query Instructions

**Good Example:**

```yaml
queryInstructions: |
  Essential reading for deployments:
  1. Review available deployment patterns
  2. Understand framework structure
  3. Check prerequisites and requirements
  4. Identify which pattern fits the use case

  This is the PRIMARY source for best practices.
```

**Bad Example:**

```yaml
queryInstructions: 'Read this for information'
```

### URL Selection Checklist

When adding authoritative sources, ask:

- [ ] Is this URL publicly accessible (no login)?
- [ ] Is it actively maintained (updated in last 12 months)?
- [ ] Does it provide actionable deployment guidance?
- [ ] Is it from the official vendor/project?
- [ ] Would an LLM find concrete steps here?
- [ ] Does it complement (not duplicate) other sources?

## Deployment Phases Guidelines

### Structure

Phases must be:

1. **Sequential** - Numbered starting from 1
2. **Atomic** - Each phase has a clear completion state
3. **Testable** - Include verification commands
4. **Estimated** - Provide duration estimates

### Example

```yaml
deploymentPhases:
  - order: 1
    name: 'Prerequisites Validation'
    description: 'Verify tools and access'
    estimatedDuration: '2-5 minutes'
    canParallelize: false
    prerequisites: []
    commands:
      - description: 'Verify CLI tool installed'
        command: 'tool --version'
        expectedExitCode: 0

  - order: 2
    name: 'Deploy Application'
    description: 'Deploy to platform'
    estimatedDuration: '5-10 minutes'
    canParallelize: false
    prerequisites: ['Prerequisites Validation']
    commands:
      - description: 'Run deployment'
        command: 'deploy --config config.yaml'
        expectedExitCode: 0
```

## Detection Hints

Help the system detect when your pattern applies:

```yaml
detectionHints:
  requiredFiles:
    - 'firebase.json' # Must exist for high confidence
    - '.firebaserc'
  optionalFiles:
    - 'functions/' # Boosts confidence if present
    - 'firestore.rules'
  confidence:
    firebase.json: 0.95 # Weight for each file
    .firebaserc: 0.90
    functions/: 0.85
    firestore.rules: 0.75
```

**Confidence scores** should total around 0.90-0.95 for required files.

## Validation

### Local Validation

Before submitting, run:

```bash
# Validate your pattern
npm run validate:patterns

# Check TypeScript types
npm run typecheck
```

### What Gets Validated

Our GitHub Actions will automatically check:

1. ✅ **JSON Schema compliance** - Pattern structure is correct
2. ✅ **Required fields** - All mandatory fields present
3. ✅ **Authoritative sources** - At least 3 sources, at least 1 required
4. ✅ **Deployment phases** - At least 3 phases, sequential ordering
5. ✅ **Detection hints** - Required files defined with confidence scores
6. ✅ **URL formats** - All URLs start with https:// or http://
7. ✅ **Metadata** - lastUpdated, maintainer, tags present
8. ✅ **Query instructions** - Non-empty, meaningful guidance
9. ✅ **YAML syntax** - Valid YAML with proper indentation
10. ✅ **Consistency** - Matches patterns across other files

## Common Mistakes to Avoid

### ❌ Don't Do This

```yaml
# Missing query instructions
authoritativeSources:
  - url: "https://example.com"
    queryInstructions: "Read this"  # Too vague!

# Non-sequential phases
deploymentPhases:
  - order: 1
  - order: 3  # Skipped 2!

# No required sources
authoritativeSources:
  - requiredForDeployment: false
  - requiredForDeployment: false  # Need at least one true!

# Invalid confidence scores
detectionHints:
  confidence:
    config.yaml: 1.5  # Must be 0.0-1.0!
```

### ✅ Do This Instead

```yaml
# Detailed query instructions
authoritativeSources:
  - url: "https://example.com/docs"
    queryInstructions: |
      Essential reading:
      1. Review deployment options
      2. Check prerequisites
      3. Understand configuration

# Sequential phases
deploymentPhases:
  - order: 1
  - order: 2
  - order: 3

# At least one required source
authoritativeSources:
  - requiredForDeployment: true   # Primary source
  - requiredForDeployment: false  # Supplementary

# Valid confidence scores
detectionHints:
  confidence:
    config.yaml: 0.95  # 0.0 to 1.0 range
```

## Pull Request Process

### 1. Create PR

When you submit a PR that changes patterns, the CI will:

1. Run all pattern validation tests
2. Lint YAML files
3. Check URL formats
4. Generate a validation report
5. Comment on your PR with results

### 2. PR Review Checklist

Before requesting review, ensure:

- [ ] Pattern follows template structure
- [ ] At least 3 authoritative sources (1 required)
- [ ] At least 3 deployment phases
- [ ] Detection hints with confidence scores
- [ ] Query instructions are detailed (>50 words)
- [ ] URLs are from official sources
- [ ] All local tests pass (`npm run validate:patterns`)
- [ ] Pattern is in correct directory
- [ ] Unique pattern ID (check existing patterns)

### 3. What to Expect

Your PR will receive an automated comment like:

```markdown
## 🎯 Pattern Validation Results

### Changed Patterns

- `patterns/infrastructure/my-platform.yaml`

### Validation Status

✅ **All validations passed!**

- JSON Schema validation
- Required fields check
- Authoritative sources validation
- Deployment phases structure
- Detection hints validation
- URL format validation
- Consistency checks
```

## Examples

### Minimal Pattern (Infrastructure Only)

```yaml
version: '1.0'
id: 'my-platform-v1'
name: 'My Platform'
description: 'Platform for containerized deployments'

composition:
  infrastructure: 'my-platform'
  strategy: 'container'

authoritativeSources:
  - type: 'documentation'
    url: 'https://my-platform.io/docs/'
    purpose: 'Official documentation'
    priority: 10
    requiredForDeployment: true
    queryInstructions: |
      Review official documentation for:
      1. Installation and setup
      2. Deployment workflows
      3. Configuration options

deploymentPhases:
  - order: 1
    name: 'Setup'
    description: 'Install prerequisites'
    estimatedDuration: '5 minutes'
    canParallelize: false
    prerequisites: []
    commands:
      - description: 'Install CLI'
        command: 'install-cli'
        expectedExitCode: 0

metadata:
  source: 'My Platform Documentation'
  lastUpdated: '2025-01-19'
  maintainer: 'My Platform Team'
  tags: ['my-platform', 'containers']

detectionHints:
  requiredFiles: ['platform.yaml']
  confidence:
    platform.yaml: 0.90
```

### Full Pattern (Composite)

See `patterns/infrastructure/openshift.yaml` or `patterns/infrastructure/firebase.yaml` for complete examples.

## Getting Help

- **Questions**: Open an issue with the `question` label
- **Bug in validation**: Open an issue with the `bug` label
- **Documentation unclear**: Open an issue with the `documentation` label

## Resources

- [Pattern README](./README.md) - Full pattern system documentation
- [Dynamic Pattern Configuration Design](../docs/how-to-guides/dynamic-pattern-configuration-system.md)
- [Existing Patterns](./infrastructure/) - Browse for examples
- [JSON Schema](./schema.json) - Full schema reference

---

Thank you for contributing! 🎉
