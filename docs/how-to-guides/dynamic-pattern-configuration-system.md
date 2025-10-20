# Dynamic Pattern Configuration System

## Overview

A YAML/JSON-based pattern definition system that allows:

- ✅ **Live URL references** - LLMs fetch latest documentation at runtime
- ✅ **Easy updates** - Change URLs without code deployment
- ✅ **CI/CD validation** - GitHub Actions verify links and rebuild
- ✅ **Community contributions** - Non-developers can add patterns via YAML
- ✅ **Multiple sources** - Support multiple authoritative links per pattern
- ✅ **Platform agnostic** - Add Firebase, AWS, Azure, etc. easily

---

## Selecting Quality Authoritative Sources

### Why Authoritative Sources Matter

Authoritative sources are the **foundation of pattern quality**. They're what LLMs query to:

- Generate accurate deployment plans
- Understand platform-specific best practices
- Discover up-to-date configuration options
- Learn troubleshooting steps
- Find production-ready code examples

**Poor source selection = poor deployments.** Here's how to choose wisely.

### URL Type Hierarchy

#### Tier 1: Priority 10 (Required for Deployment) ⭐⭐⭐

**1. Official Framework/Pattern Documentation**

```yaml
- type: 'documentation'
  url: 'https://validatedpatterns.io/'
  purpose: 'Red Hat Validated Patterns - official framework'
  priority: 10
  requiredForDeployment: true
```

- **What**: Main documentation hub from the vendor/project
- **Why**: Source of truth, complete, actively maintained
- **Examples**: `validatedpatterns.io`, `firebase.google.com/docs`, `kubernetes.io/docs`

**2. Interactive Workshops & Hands-On Tutorials**

```yaml
- type: 'documentation'
  url: 'https://play.validatedpatterns.io/vp-workshop/main/index.html'
  purpose: 'Interactive workshop with step-by-step guidance'
  priority: 10
  requiredForDeployment: true
```

- **What**: Guided learning experiences, codelabs, workshops
- **Why**: Step-by-step deployment guidance, troubleshooting tips
- **Examples**: Katacoda, Google Codelabs, interactive docs

**3. Official Code Repositories**

```yaml
- type: 'repository'
  url: 'https://github.com/validatedpatterns/common'
  purpose: 'Common framework code and utilities'
  priority: 10
  requiredForDeployment: true
```

- **What**: Official repos with framework code, samples, starters
- **Why**: Production-ready code, integration patterns, real implementations
- **Examples**: `/validatedpatterns/common`, `/firebase/functions-samples`

#### Tier 2: Priority 9 (Highly Recommended) ⭐⭐

**4. Pattern Collections & Architecture Centers**

```yaml
- type: 'repository'
  url: 'https://github.com/validatedpatterns'
  purpose: 'Collection of all validated pattern repositories'
  priority: 9
```

- **What**: Collections of patterns, architecture guidance
- **Why**: Multiple implementation examples, architectural best practices
- **Examples**: GitHub org repos, AWS Architecture Center, GCP solutions

**5. Getting Started Guides**

```yaml
- type: 'documentation'
  url: 'https://docs.openshift.com/getting-started/'
  purpose: 'Quick start and initial setup'
  priority: 9
```

- **What**: Quick start guides, first-deployment tutorials
- **Why**: Fast onboarding, prerequisites, environment setup
- **Examples**: "Getting Started", "Quick Start", "First Deployment"

#### Tier 3: Priority 7-8 (Supplementary) ⭐

**6. Developer Tools & CLIs**

```yaml
- type: 'community'
  url: 'https://github.com/openshift/odo'
  purpose: 'Developer CLI for iterative development'
  priority: 7
```

- **What**: Developer-focused tools, CLIs, SDKs
- **Why**: Local development, developer workflow
- **Examples**: `odo`, `firebase-tools`, cloud CLIs

**7. Community Resources**

```yaml
- type: 'community'
  url: 'https://stackoverflow.com/questions/tagged/openshift'
  priority: 7
```

- **What**: Community forums, Q&A sites
- **Why**: Real-world problems, community solutions, edge cases

#### Tier 4: Priority 6 (Foundation)

**8. Underlying Technology Documentation**

```yaml
- type: 'specification'
  url: 'https://kubernetes.io/docs/'
  purpose: 'Kubernetes docs (OpenShift builds on k8s)'
  priority: 6
```

- **What**: Docs for underlying technologies
- **Why**: Foundational knowledge
- **Examples**: Kubernetes (for OpenShift), Node.js (for serverless)

### URL Selection Checklist

Before adding a URL, verify:

✅ **Accessibility**: Publicly accessible (no login wall)
✅ **Freshness**: Updated within 12 months
✅ **Actionable**: Contains deployment steps, not just marketing
✅ **Official**: From vendor/project, not third-party
✅ **LLM-Friendly**: Text-based content LLMs can parse
✅ **Complementary**: Adds value, doesn't duplicate
✅ **Permanent**: Stable URL, not likely to break

### URLs to Avoid ❌

| Type                  | Why Avoid               | Alternative                     |
| --------------------- | ----------------------- | ------------------------------- |
| Marketing pages       | No technical content    | Link to docs section instead    |
| Paywalled content     | LLMs can't access       | Use free tier or public docs    |
| Login-required        | LLMs can't authenticate | Link to public docs             |
| Blog posts            | Outdated quickly        | Use official docs               |
| Third-party tutorials | May be incorrect        | Use official tutorials          |
| Video-only            | LLMs can't parse        | Use transcript or written guide |

### Writing Effective Query Instructions

**The `queryInstructions` field is critical** - it tells LLMs exactly what to extract from each URL.

**✅ Good Query Instructions**:

```yaml
queryInstructions: |
  Essential reading for OpenShift deployments:
  1. Browse available validated patterns (Multicluster GitOps, Industrial Edge)
  2. Understand the Validated Patterns framework structure
  3. Review pattern architecture and deployment phases
  4. Check prerequisites and infrastructure requirements
  5. Identify which pattern best fits your use case

  This is the PRIMARY source for OpenShift best practices and proven patterns.
```

**Why it's good**:

- Numbered steps (clear sequence)
- Specific sections to read
- Explains importance ("PRIMARY source")
- Actionable outcomes ("identify which pattern")

**❌ Bad Query Instructions**:

```yaml
queryInstructions: 'Read this documentation'
```

**Why it's bad**:

- No specific guidance
- No context on importance
- LLM doesn't know what to extract

### Real-World Examples

#### OpenShift Validated Patterns ✅

```yaml
authoritativeSources:
  - type: 'documentation'
    url: 'https://validatedpatterns.io/'
    priority: 10
    queryInstructions: |
      Browse available patterns, understand framework, check prerequisites

  - type: 'documentation'
    url: 'https://play.validatedpatterns.io/vp-workshop/main/index.html'
    priority: 10
    queryInstructions: |
      Work through workshop for step-by-step deployment procedures

  - type: 'repository'
    url: 'https://github.com/validatedpatterns/common'
    priority: 10
    queryInstructions: |
      Review framework components, common patterns, Ansible automation
```

**Why this works**:

- All three Tier 1 types covered (docs, workshop, code)
- Each serves distinct purpose
- Clear, actionable instructions
- Official Red Hat sources

#### Firebase Functions ✅

```yaml
authoritativeSources:
  - type: 'documentation'
    url: 'https://firebase.google.com/docs/functions'
    priority: 10

  - type: 'repository'
    url: 'https://github.com/firebase/functions-samples'
    priority: 10

  - type: 'community'
    url: 'https://firebase.google.com/community'
    priority: 7
```

**Coverage**: Official docs + code samples + community

### Testing Your URLs

Before finalizing a pattern:

1. **Manual Test**: Visit each URL and verify:
   - Page loads without authentication
   - Content is technical (not marketing)
   - Information is current (check dates)
   - Steps are actionable

2. **LLM Test**: Ask an LLM to:

   ```
   "Read <URL> and summarize the deployment steps for <pattern>"
   ```

   - Can it extract useful information?
   - Does it get accurate details?

3. **Validation Script** (coming soon):
   ```bash
   npm run validate:pattern-urls
   ```

   - Checks URL accessibility
   - Validates response codes
   - Reports broken links

### URL Maintenance

Patterns should be **living documents**:

- **Quarterly review**: Check all URLs still work
- **Version updates**: Update URLs when new versions release
- **Deprecation handling**: Replace deprecated links
- **GitHub Actions**: Automated URL health checks (weekly)

---

## YAML Schema Design

### Pattern Definition File Structure

**Location**: `patterns/{platform}-{runtime}.yaml`

```yaml
# patterns/firebase-nodejs.yaml
version: '1.0'
id: 'firebase-nodejs-v1'
name: 'Firebase Cloud Functions (Node.js)'
description: 'Serverless Node.js deployment using Firebase Cloud Functions'

# Pattern composition
composition:
  infrastructure: 'firebase'
  runtime: 'nodejs'
  protocol: 'rest-api'
  strategy: 'serverless'

# Authoritative sources - LLMs query these URLs
authoritativeSources:
  - type: 'documentation'
    url: 'https://firebase.google.com/docs/functions'
    purpose: 'Official Firebase Cloud Functions documentation'
    priority: 10
    requiredForDeployment: true
    queryInstructions: |
      Essential reading:
      1. Get started guide
      2. Triggers (HTTP, database, auth, storage)
      3. Deployment best practices
      4. Security rules
      Start here for all Firebase Functions projects.

  - type: 'repository'
    url: 'https://github.com/firebase/functions-samples'
    purpose: 'Official Firebase Functions code samples'
    priority: 10
    requiredForDeployment: true
    queryInstructions: |
      Browse samples for:
      1. Common triggers (HTTP, Firestore, Auth)
      2. Integration patterns
      3. Testing examples
      4. TypeScript usage
      Use as templates.

  - type: 'documentation'
    url: 'https://firebase.google.com/docs/functions/manage-functions'
    purpose: 'Function lifecycle management guide'
    priority: 9
    requiredForDeployment: false
    queryInstructions: |
      Review for:
      1. Deployment strategies
      2. Environment configuration
      3. Monitoring and logging
      4. Scaling configuration

  - type: 'community'
    url: 'https://github.com/firebase/firebase-js-sdk'
    purpose: 'Firebase JavaScript SDK source code'
    priority: 7
    requiredForDeployment: false
    queryInstructions: |
      Check for:
      1. Latest SDK features
      2. Breaking changes
      3. Migration guides
      4. Best practices in issues/discussions

# Base code repository for starter code
baseCodeRepository:
  url: 'https://github.com/firebase/functions-samples'
  purpose: 'Official Firebase Cloud Functions samples'
  integrationInstructions: |
    1. Browse samples for relevant use case
    2. Copy function structure into functions/src/
    3. Customize business logic
    4. Configure firebase.json
    5. Deploy with firebase deploy
  requiredFiles:
    - 'firebase.json'
    - '.firebaserc'
    - 'functions/package.json'
    - 'functions/src/index.ts'
  scriptEntrypoint: 'firebase deploy --only functions'

# Bill of Materials
dependencies:
  - name: 'firebase-tools'
    type: 'buildtime'
    required: true
    installCommand: 'npm install -g firebase-tools'
    verificationCommand: 'firebase --version'

  - name: 'firebase-admin'
    type: 'runtime'
    required: true
    installCommand: 'npm install firebase-admin'
    verificationCommand: 'npm list firebase-admin'

  - name: 'firebase-functions'
    type: 'runtime'
    required: true
    installCommand: 'npm install firebase-functions'
    verificationCommand: 'npm list firebase-functions'

# Configuration files needed
configurations:
  - path: 'firebase.json'
    purpose: 'Firebase project configuration'
    required: true
    canAutoGenerate: true
    template: |
      {
        "functions": {
          "source": "functions",
          "runtime": "nodejs18",
          "ignore": [
            "node_modules",
            ".git"
          ]
        }
      }

  - path: '.firebaserc'
    purpose: 'Firebase project aliases'
    required: true
    canAutoGenerate: true
    template: |
      {
        "projects": {
          "default": "{{ project-id }}"
        }
      }

  - path: 'functions/package.json'
    purpose: 'Cloud Functions dependencies'
    required: true
    canAutoGenerate: true

  - path: 'functions/.env'
    purpose: 'Environment variables for functions'
    required: false
    canAutoGenerate: true

# Secrets and credentials
secrets:
  - name: 'service-account'
    purpose: 'Firebase Admin SDK service account credentials'
    environmentVariable: 'GOOGLE_APPLICATION_CREDENTIALS'
    required: true

  - name: 'api-keys'
    purpose: 'Third-party API keys used by functions'
    environmentVariable: 'API_KEY'
    required: false

# Infrastructure requirements
infrastructure:
  - component: 'Firebase Project'
    purpose: 'Firebase project with Cloud Functions enabled'
    required: true
    setupCommands:
      - 'firebase login'
      - 'firebase init functions'
    healthCheckCommand: 'firebase projects:list'

  - component: 'Node.js Runtime'
    purpose: 'Node.js runtime for Cloud Functions'
    minimumVersion: '18'
    required: true
    alternatives:
      - 'Node 20'
      - 'Node 22'

# Deployment phases
deploymentPhases:
  - order: 1
    name: 'Firebase Authentication'
    description: 'Authenticate with Firebase'
    estimatedDuration: '1 minute'
    canParallelize: false
    prerequisites: []
    commands:
      - description: 'Login to Firebase'
        command: 'firebase login --no-localhost'
        expectedExitCode: 0

  - order: 2
    name: 'Initialize Firebase Project'
    description: 'Set up Firebase project structure'
    estimatedDuration: '2 minutes'
    canParallelize: false
    prerequisites:
      - 'Firebase Authentication'
    commands:
      - description: 'Initialize Firebase Functions'
        command: 'firebase init functions --project {{ project-id }}'
        expectedExitCode: 0

  - order: 3
    name: 'Install Dependencies'
    description: 'Install Node.js dependencies'
    estimatedDuration: '2-3 minutes'
    canParallelize: false
    prerequisites:
      - 'Initialize Firebase Project'
    commands:
      - description: 'Install function dependencies'
        command: 'cd functions && npm ci'
        expectedExitCode: 0

  - order: 4
    name: 'Deploy Functions'
    description: 'Deploy Cloud Functions to Firebase'
    estimatedDuration: '3-5 minutes'
    canParallelize: false
    prerequisites:
      - 'Install Dependencies'
    commands:
      - description: 'Deploy all functions'
        command: 'firebase deploy --only functions'
        expectedExitCode: 0

# Validation checks
validationChecks:
  - id: 'functions-deployed'
    name: 'Functions Deployment Check'
    description: 'Verify all functions are deployed'
    command: 'firebase functions:list --project {{ project-id }}'
    expectedExitCode: 0
    severity: 'critical'
    failureMessage: 'Functions are not deployed'
    remediationSteps:
      - 'Check deployment logs: firebase functions:log'
      - 'Verify project ID: firebase projects:list'
      - 'Re-deploy: firebase deploy --only functions'

  - id: 'function-health'
    name: 'Function Health Check'
    description: 'Verify function responds to HTTP requests'
    command: 'curl -f {{ function-url }}/health || exit 1'
    expectedExitCode: 0
    severity: 'critical'
    failureMessage: 'Function health endpoint not responding'
    remediationSteps:
      - 'Check function logs: firebase functions:log --only {{ function-name }}'
      - 'Verify function URL in Firebase Console'
      - 'Test locally: firebase emulators:start --only functions'

# Health checks for monitoring
healthChecks:
  - name: 'Function HTTP Health'
    endpoint: '{{ function-url }}/health'
    interval: 60000
    timeout: 10000
    healthyThreshold: 1
    unhealthyThreshold: 3

# Environment-specific overrides
environmentOverrides:
  - environment: 'development'
    overrides:
      deploymentPhases:
        - order: 4
          name: 'Start Emulators'
          description: 'Start Firebase emulators for local testing'
          commands:
            - description: 'Start local emulators'
              command: 'firebase emulators:start --only functions'
              expectedExitCode: 0

# Pattern metadata
metadata:
  source: 'Firebase Documentation'
  lastUpdated: '2025-01-19'
  maintainer: 'Google Firebase'
  tags:
    - 'firebase'
    - 'serverless'
    - 'cloud-functions'
    - 'nodejs'
    - 'google-cloud'
  contributors:
    - name: 'Your Name'
      github: 'yourusername'
  changeLog:
    - version: '1.0'
      date: '2025-01-19'
      changes:
        - 'Initial Firebase Node.js pattern'
        - 'Added emulator support for development'

# Platform detection hints (for auto-detection)
detectionHints:
  requiredFiles:
    - 'firebase.json'
  optionalFiles:
    - 'functions/'
    - '.firebaserc'
  confidence:
    firebase.json: 0.9
    functions/: 0.8
    .firebaserc: 0.7
```

---

## Directory Structure

```
patterns/
├── README.md                      # Pattern contribution guide
├── schema.json                    # JSON Schema for validation
├── infrastructure/                # Infrastructure-only patterns
│   ├── openshift.yaml
│   ├── kubernetes.yaml
│   ├── docker.yaml
│   ├── aws.yaml
│   └── azure.yaml
├── runtime/                       # Runtime-only patterns
│   ├── nodejs.yaml
│   ├── python.yaml
│   ├── java.yaml
│   └── go.yaml
├── composite/                     # Composite patterns (infra + runtime)
│   ├── firebase-nodejs.yaml       # NEW
│   ├── firebase-python.yaml       # NEW
│   ├── aws-lambda-nodejs.yaml     # NEW
│   ├── aws-lambda-python.yaml
│   ├── azure-functions-nodejs.yaml
│   ├── gcp-cloudrun-go.yaml
│   ├── openshift-nodejs-gitops.yaml
│   └── kubernetes-python-django.yaml
└── protocol/                      # Protocol patterns
    ├── mcp.yaml
    └── a2a.yaml
```

---

## JSON Schema for Validation

**File**: `patterns/schema.json`

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "title": "Validated Pattern Definition",
  "type": "object",
  "required": ["version", "id", "name", "description", "authoritativeSources", "deploymentPhases"],
  "properties": {
    "version": {
      "type": "string",
      "pattern": "^\\d+\\.\\d+(\\.\\d+)?$"
    },
    "id": {
      "type": "string",
      "pattern": "^[a-z0-9-]+$"
    },
    "name": {
      "type": "string",
      "minLength": 5
    },
    "description": {
      "type": "string",
      "minLength": 20
    },
    "composition": {
      "type": "object",
      "properties": {
        "infrastructure": {
          "type": "string",
          "enum": ["openshift", "kubernetes", "docker", "firebase", "aws", "azure", "gcp"]
        },
        "runtime": {
          "type": "string",
          "enum": ["nodejs", "python", "java", "go", "rust", "dotnet"]
        },
        "protocol": {
          "type": "string",
          "enum": ["mcp", "a2a", "rest-api", "grpc", "graphql"]
        },
        "strategy": {
          "type": "string",
          "enum": ["gitops", "blue-green", "canary", "rolling", "serverless", "container"]
        }
      }
    },
    "authoritativeSources": {
      "type": "array",
      "minItems": 1,
      "items": {
        "type": "object",
        "required": [
          "type",
          "url",
          "purpose",
          "priority",
          "requiredForDeployment",
          "queryInstructions"
        ],
        "properties": {
          "type": {
            "type": "string",
            "enum": ["documentation", "repository", "specification", "examples", "community"]
          },
          "url": {
            "type": "string",
            "format": "uri"
          },
          "purpose": {
            "type": "string",
            "minLength": 10
          },
          "priority": {
            "type": "number",
            "minimum": 1,
            "maximum": 10
          },
          "requiredForDeployment": {
            "type": "boolean"
          },
          "queryInstructions": {
            "type": "string",
            "minLength": 20
          }
        }
      }
    }
  }
}
```

---

## GitHub Actions Workflow

### 1. Pattern Validation on PR

**File**: `.github/workflows/validate-patterns.yml`

```yaml
name: Validate Pattern Definitions

on:
  pull_request:
    paths:
      - 'patterns/**/*.yaml'
      - 'patterns/**/*.json'
  push:
    branches:
      - main
    paths:
      - 'patterns/**/*.yaml'

jobs:
  validate:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v3

      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'

      - name: Install dependencies
        run: npm ci

      - name: Validate YAML syntax
        run: |
          npm install -g yaml-validator
          yaml-validator patterns/**/*.yaml

      - name: Validate against JSON Schema
        run: |
          npm install -g ajv-cli
          for file in patterns/**/*.yaml; do
            echo "Validating $file"
            ajv validate -s patterns/schema.json -d "$file" --spec=draft7
          done

      - name: Check authoritative source URLs
        run: node scripts/validate-pattern-urls.js

      - name: Lint pattern definitions
        run: npm run lint:patterns
```

### 2. URL Health Check (Weekly)

**File**: `.github/workflows/check-pattern-urls.yml`

```yaml
name: Check Pattern URLs

on:
  schedule:
    - cron: '0 0 * * 0' # Weekly on Sunday
  workflow_dispatch:

jobs:
  check-urls:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v3

      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'

      - name: Install dependencies
        run: npm ci

      - name: Check all pattern URLs
        id: url-check
        run: |
          node scripts/check-pattern-urls.js > url-report.txt
          cat url-report.txt
        continue-on-error: true

      - name: Create issue if URLs are broken
        if: steps.url-check.outcome == 'failure'
        uses: actions/github-script@v6
        with:
          script: |
            const fs = require('fs');
            const report = fs.readFileSync('url-report.txt', 'utf8');

            github.rest.issues.create({
              owner: context.repo.owner,
              repo: context.repo.repo,
              title: '🔗 Broken URLs in Pattern Definitions',
              body: `## URL Health Check Failed\n\n\`\`\`\n${report}\n\`\`\`\n\nPlease update the pattern files with working URLs.`,
              labels: ['patterns', 'url-check', 'automated']
            });
```

### 3. Build and Release on Pattern Update

**File**: `.github/workflows/build-patterns.yml`

```yaml
name: Build and Release Patterns

on:
  push:
    branches:
      - main
    paths:
      - 'patterns/**/*.yaml'

jobs:
  build-and-release:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v3
        with:
          fetch-depth: 0

      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'

      - name: Install dependencies
        run: npm ci

      - name: Build pattern definitions
        run: npm run build:patterns

      - name: Run tests
        run: npm test

      - name: Determine version bump
        id: version
        run: |
          # Get changed files
          CHANGED_FILES=$(git diff --name-only HEAD~1 HEAD | grep '^patterns/')

          # Determine bump type based on changes
          if echo "$CHANGED_FILES" | grep -q 'patterns/composite/'; then
            echo "bump=minor" >> $GITHUB_OUTPUT
          else
            echo "bump=patch" >> $GITHUB_OUTPUT
          fi

      - name: Bump version
        run: |
          npm version ${{ steps.version.outputs.bump }} --no-git-tag-version
          NEW_VERSION=$(node -p "require('./package.json').version")
          echo "NEW_VERSION=$NEW_VERSION" >> $GITHUB_ENV

      - name: Commit version bump
        run: |
          git config user.name "github-actions"
          git config user.email "github-actions@github.com"
          git add package.json
          git commit -m "chore: bump version to ${{ env.NEW_VERSION }} [skip ci]"
          git push

      - name: Create release
        uses: actions/create-release@v1
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
        with:
          tag_name: v${{ env.NEW_VERSION }}
          release_name: Patterns Release v${{ env.NEW_VERSION }}
          body: |
            ## Pattern Updates

            Updated validated pattern definitions.

            ### Changed Files
            ${{ steps.files.outputs.changed }}
          draft: false
          prerelease: false
```

---

## URL Validation Script

**File**: `scripts/validate-pattern-urls.js`

```javascript
#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');
const fetch = require('node-fetch');

async function checkUrl(url, timeout = 10000) {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    const response = await fetch(url, {
      method: 'HEAD',
      signal: controller.signal,
      headers: {
        'User-Agent': 'MCP-ADR-Pattern-Validator/1.0',
      },
    });

    clearTimeout(timeoutId);
    return {
      url,
      status: response.status,
      ok: response.ok,
    };
  } catch (error) {
    return {
      url,
      status: 0,
      ok: false,
      error: error.message,
    };
  }
}

async function validatePatternFile(filePath) {
  console.log(`\nValidating: ${filePath}`);

  const content = fs.readFileSync(filePath, 'utf8');
  const pattern = yaml.load(content);

  const results = [];

  // Check authoritative sources
  if (pattern.authoritativeSources) {
    for (const source of pattern.authoritativeSources) {
      console.log(`  Checking: ${source.url}`);
      const result = await checkUrl(source.url);
      results.push({
        file: filePath,
        source: source.purpose,
        ...result,
      });
    }
  }

  // Check base code repository
  if (pattern.baseCodeRepository?.url) {
    console.log(`  Checking: ${pattern.baseCodeRepository.url}`);
    const result = await checkUrl(pattern.baseCodeRepository.url);
    results.push({
      file: filePath,
      source: 'Base Repository',
      ...result,
    });
  }

  return results;
}

async function main() {
  const patternsDir = path.join(__dirname, '..', 'patterns');
  const patternFiles = [];

  // Find all YAML files
  function findYamlFiles(dir) {
    const files = fs.readdirSync(dir);
    for (const file of files) {
      const filePath = path.join(dir, file);
      const stat = fs.statSync(filePath);

      if (stat.isDirectory()) {
        findYamlFiles(filePath);
      } else if (file.endsWith('.yaml') || file.endsWith('.yml')) {
        patternFiles.push(filePath);
      }
    }
  }

  findYamlFiles(patternsDir);

  console.log(`Found ${patternFiles.length} pattern files to validate`);

  let allResults = [];
  for (const file of patternFiles) {
    const results = await validatePatternFile(file);
    allResults = allResults.concat(results);
  }

  // Report results
  const broken = allResults.filter(r => !r.ok);

  if (broken.length > 0) {
    console.error('\n❌ BROKEN URLS FOUND:');
    for (const result of broken) {
      console.error(`  ${result.file}`);
      console.error(`    ${result.source}: ${result.url}`);
      console.error(`    Status: ${result.status} ${result.error || ''}`);
    }
    process.exit(1);
  } else {
    console.log('\n✅ All URLs are valid!');
    process.exit(0);
  }
}

main().catch(error => {
  console.error('Error:', error);
  process.exit(1);
});
```

---

## Pattern Loader Utility

**File**: `src/utils/pattern-loader.ts`

```typescript
import { promises as fs } from 'fs';
import * as path from 'path';
import * as yaml from 'js-yaml';
import { EnhancedLogger } from './enhanced-logging.js';

export interface DynamicPattern {
  version: string;
  id: string;
  name: string;
  description: string;
  composition?: {
    infrastructure?: string;
    runtime?: string;
    protocol?: string;
    strategy?: string;
  };
  authoritativeSources: Array<{
    type: string;
    url: string;
    purpose: string;
    priority: number;
    requiredForDeployment: boolean;
    queryInstructions: string;
  }>;
  // ... other fields from YAML
}

export class PatternLoader {
  private logger: EnhancedLogger;
  private patternsDir: string;
  private cache: Map<string, DynamicPattern> = new Map();

  constructor(patternsDir?: string) {
    this.logger = new EnhancedLogger();
    this.patternsDir = patternsDir || path.join(__dirname, '../../patterns');
  }

  /**
   * Load pattern from YAML file
   */
  async loadPattern(patternId: string): Promise<DynamicPattern | null> {
    // Check cache first
    if (this.cache.has(patternId)) {
      return this.cache.get(patternId)!;
    }

    try {
      // Try different directories
      const directories = ['composite', 'infrastructure', 'runtime', 'protocol'];

      for (const dir of directories) {
        const filePath = path.join(this.patternsDir, dir, `${patternId}.yaml`);

        try {
          const content = await fs.readFile(filePath, 'utf-8');
          const pattern = yaml.load(content) as DynamicPattern;

          // Validate pattern
          this.validatePattern(pattern);

          // Cache it
          this.cache.set(patternId, pattern);

          this.logger.info(`Loaded pattern: ${patternId}`, 'PatternLoader');
          return pattern;
        } catch (error: any) {
          if (error.code !== 'ENOENT') {
            throw error; // Re-throw non-file-not-found errors
          }
          // Continue to next directory
        }
      }

      this.logger.warn(`Pattern not found: ${patternId}`, 'PatternLoader');
      return null;
    } catch (error) {
      this.logger.error(`Failed to load pattern: ${patternId}`, 'PatternLoader', error as Error);
      return null;
    }
  }

  /**
   * Load pattern by composition
   */
  async loadPatternByComposition(
    infrastructure: string,
    runtime?: string
  ): Promise<DynamicPattern | null> {
    const compositeId = runtime ? `${infrastructure}-${runtime}` : infrastructure;

    // Try composite first
    let pattern = await this.loadPattern(compositeId);

    // Fallback to infrastructure-only
    if (!pattern && runtime) {
      pattern = await this.loadPattern(infrastructure);
    }

    return pattern;
  }

  /**
   * List all available patterns
   */
  async listPatterns(): Promise<string[]> {
    const patterns: string[] = [];
    const directories = ['composite', 'infrastructure', 'runtime', 'protocol'];

    for (const dir of directories) {
      const dirPath = path.join(this.patternsDir, dir);

      try {
        const files = await fs.readdir(dirPath);
        const yamlFiles = files.filter(f => f.endsWith('.yaml') || f.endsWith('.yml'));

        for (const file of yamlFiles) {
          const patternId = file.replace(/\.(yaml|yml)$/, '');
          patterns.push(patternId);
        }
      } catch (error: any) {
        if (error.code !== 'ENOENT') {
          throw error;
        }
      }
    }

    return patterns;
  }

  /**
   * Validate pattern structure
   */
  private validatePattern(pattern: DynamicPattern): void {
    if (!pattern.id || !pattern.name || !pattern.version) {
      throw new Error('Pattern missing required fields: id, name, version');
    }

    if (!pattern.authoritativeSources || pattern.authoritativeSources.length === 0) {
      throw new Error('Pattern must have at least one authoritative source');
    }

    // Validate URLs
    for (const source of pattern.authoritativeSources) {
      try {
        new URL(source.url);
      } catch {
        throw new Error(`Invalid URL in pattern ${pattern.id}: ${source.url}`);
      }
    }
  }

  /**
   * Clear cache (useful for testing or reloading)
   */
  clearCache(): void {
    this.cache.clear();
  }
}
```

---

## Bootstrap Tool Integration

**Update**: `src/tools/bootstrap-validation-loop-tool.ts`

```typescript
import { PatternLoader, DynamicPattern } from '../utils/pattern-loader.js';

export class BootstrapValidationLoop {
  private patternLoader: PatternLoader;

  constructor(projectPath: string, adrDirectory: string) {
    // ... existing initialization
    this.patternLoader = new PatternLoader();
  }

  async executeLoop(args: any): Promise<any> {
    // STEP 0: Detect platform
    this.platformDetection = await detectPlatforms(this.projectPath);
    const runtimeDetection = await detectRuntime(this.projectPath);

    // STEP 0.1: Load pattern from YAML (instead of hardcoded TypeScript)
    this.logger.info('Loading validated pattern from YAML...', 'BootstrapValidationLoop');

    const dynamicPattern = await this.patternLoader.loadPatternByComposition(
      this.platformDetection.primaryPlatform,
      runtimeDetection.runtime
    );

    if (dynamicPattern) {
      this.logger.info(
        `✅ Loaded pattern: ${dynamicPattern.name} v${dynamicPattern.version}`,
        'BootstrapValidationLoop',
        {
          composition: dynamicPattern.composition,
          authoritativeSources: dynamicPattern.authoritativeSources.length,
        }
      );

      // STEP 0.2: LLM should query authoritative sources
      const requiredSources = dynamicPattern.authoritativeSources.filter(
        s => s.requiredForDeployment
      );

      this.logger.info(
        `⚠️  IMPORTANT: Query ${requiredSources.length} REQUIRED authoritative sources:`,
        'BootstrapValidationLoop'
      );

      for (const source of requiredSources) {
        this.logger.info(`  📚 ${source.type}: ${source.url}`, 'BootstrapValidationLoop');
        this.logger.info(`     Purpose: ${source.purpose}`, 'BootstrapValidationLoop');
        this.logger.info(
          `     Query instructions: ${source.queryInstructions}`,
          'BootstrapValidationLoop'
        );
      }
    } else {
      this.logger.warn(
        `No pattern found for ${this.platformDetection.primaryPlatform}${runtimeDetection.runtime ? ` + ${runtimeDetection.runtime}` : ''}`,
        'BootstrapValidationLoop'
      );
    }

    // Continue with deployment...
  }
}
```

---

## Benefits

### 1. **Easy Updates**

```bash
# User updates Firebase pattern
vim patterns/composite/firebase-nodejs.yaml
# Change URL from old doc to new doc
git commit -m "fix: update Firebase Functions docs URL"
git push

# GitHub Action:
# ✅ Validates new URL is reachable
# ✅ Rebuilds pattern definitions
# ✅ Creates new release
# ✅ LLMs use updated pattern immediately
```

### 2. **Multiple Sources for Rich Context**

```yaml
authoritativeSources:
  - type: 'documentation'
    url: 'https://firebase.google.com/docs/functions'
    priority: 10

  - type: 'repository'
    url: 'https://github.com/firebase/functions-samples'
    priority: 10

  - type: 'community'
    url: 'https://stackoverflow.com/questions/tagged/firebase-cloud-functions'
    priority: 7

  - type: 'examples'
    url: 'https://github.com/firebase/quickstart-nodejs'
    priority: 8
```

LLM queries **all** sources for comprehensive context!

### 3. **Community Contributions**

Non-developers can add patterns:

```bash
# Fork repo
# Add patterns/composite/vercel-nextjs.yaml
# Submit PR
# CI validates URLs
# Merged and released!
```

### 4. **Link Validation**

Weekly GitHub Action checks all URLs:

- ✅ Creates issue if links are broken
- ✅ Notifies maintainers
- ✅ Prevents deployment with bad links

---

## Migration Path

### Week 1: Infrastructure

1. Create `patterns/` directory structure
2. Create JSON schema
3. Create GitHub Actions workflows
4. Create `PatternLoader` utility

### Week 2: Convert Existing Patterns

1. Convert OpenShift pattern to YAML
2. Convert Kubernetes pattern to YAML
3. Convert Docker pattern to YAML
4. Test pattern loading

### Week 3: Add New Patterns

1. Create Firebase Node.js pattern (YAML)
2. Create AWS Lambda patterns
3. Create Azure Functions patterns
4. Test with bootstrap tool

### Week 4: Integrate & Test

1. Update bootstrap tool to use `PatternLoader`
2. Update context generation
3. Test end-to-end
4. Document pattern contribution process

---

## Example: Adding New Pattern

**Contributor workflow**:

1. Create `patterns/composite/vercel-nextjs.yaml`:

```yaml
version: '1.0'
id: 'vercel-nextjs-v1'
name: 'Vercel Next.js Deployment'
description: 'Serverless Next.js deployment on Vercel'

authoritativeSources:
  - type: 'documentation'
    url: 'https://vercel.com/docs'
    purpose: 'Official Vercel documentation'
    priority: 10
    requiredForDeployment: true
    queryInstructions: |
      Read getting started guide and deployment options
```

2. Commit and push
3. GitHub Action validates:
   - ✅ YAML syntax
   - ✅ Schema compliance
   - ✅ URL reachability
4. Create PR
5. Merged → New release created automatically
6. LLMs can now use Vercel pattern!

---

This approach is **much better** than hardcoding! What do you think?

Should I start implementing this system?
