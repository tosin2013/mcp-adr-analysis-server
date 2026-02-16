---
name: 'Deployment Pattern Validation'
description: 'Validates pattern schemas, detection logic, bootstrap tool, deployment readiness, and documentation for all infrastructure patterns'
on:
  pull_request:
    paths:
      - 'patterns/**'
      - 'src/tools/bootstrap-validation-loop-tool.ts'
      - 'src/tools/deployment-readiness-tool.ts'
      - 'src/utils/pattern-loader.ts'
  push:
    branches:
      - main
  workflow_dispatch:
permissions:
  issues: read
  pull-requests: read
safe-outputs:
  create-issue:
    title-prefix: '[pattern-validation]'
  add-comment:
tools:
  bash: true
  github:
    toolsets: [issues, pull_requests]
---

# Deployment Pattern Validation

You validate the deployment pattern framework: pattern schemas, automatic detection logic, the bootstrap validation tool, deployment readiness checks, and pattern documentation completeness.

## Context

The mcp-adr-analysis-server includes a **Validated Patterns Framework** in `patterns/infrastructure/`. These YAML patterns are authoritative deployment templates that LLMs query for platform-specific guidance.

**Available patterns**:

- `kubernetes.yaml` — Container orchestration with kubectl
- `firebase.yaml` — Production Firebase serverless deployment
- `firebase-emulators.yaml` — Local Firebase testing (emulator-first workflow)

**Each pattern must have**:

- `authoritativeSources` — URLs with priority (1-10) for LLMs to query
- `deploymentPhases` — Ordered deployment steps with commands
- `validationChecks` — Critical checks with remediation steps
- `detectionHints` — Files/patterns for automatic detection with confidence scores

**Key tools**:

- `bootstrap-validation-loop-tool.ts` — Auto-detects patterns based on project files
- `deployment-readiness-tool.ts` — Zero-tolerance validation with hard blocking on failures

## Validation Steps

### Step 0: Install Dependencies

Install build tools required for native module compilation (e.g., tree-sitter), then install npm dependencies with error-tolerant fallbacks.

```bash
# Install build tools for native modules (requires sudo)
sudo apt-get update -qq && sudo apt-get install -y build-essential python3 || echo "⚠️ Could not install build tools (may already be present)"

# Install npm dependencies with fallback
if ! npm ci; then
  echo "⚠️ npm ci failed, falling back to npm install..."
  npm install
fi

# Rebuild tree-sitter native bindings (non-blocking)
echo "🔨 Rebuilding tree-sitter native bindings..."
if ! npm rebuild tree-sitter; then
  echo "⚠️ Tree-sitter rebuild failed, but continuing (tests handle graceful fallback)"
fi
```

If `npm` is not available or both install commands fail, you can still run the structural validation steps (Steps 3 and 6) using `grep` and shell commands directly.

### Step 1: Run Pattern Schema Validation

```bash
npm run validate:patterns
```

If this command is not available (e.g., npm install failed), proceed to manual validation in Step 3.

### Step 2: Test Pattern Detection

```bash
npm test -- tests/utils/pattern-loader.test.ts --verbose
```

If npm/Jest is unavailable, skip to Step 3 for manual pattern validation.

### Step 3: Validate All Infrastructure Patterns

Load and validate each pattern file programmatically:

```bash
node -e "
  import { loadDeploymentPattern } from './dist/src/utils/pattern-loader.js';
  import fs from 'fs';
  import path from 'path';

  const patternsDir = './patterns/infrastructure';
  const patterns = fs.readdirSync(patternsDir)
    .filter(f => f.endsWith('.yaml') || f.endsWith('.yml'));

  console.log('Found patterns:', patterns);

  let allValid = true;
  for (const pattern of patterns) {
    try {
      const patternName = path.basename(pattern, path.extname(pattern));
      const loaded = loadDeploymentPattern(patternName);

      if (!loaded.authoritativeSources || loaded.authoritativeSources.length === 0) {
        console.error(patternName + ': Missing authoritativeSources');
        allValid = false;
        continue;
      }

      if (!loaded.deploymentPhases || loaded.deploymentPhases.length === 0) {
        console.error(patternName + ': Missing deploymentPhases');
        allValid = false;
        continue;
      }

      if (!loaded.validationChecks) {
        console.error(patternName + ': Missing validationChecks');
        allValid = false;
        continue;
      }

      console.log(patternName + ': Valid');
    } catch (error) {
      console.error(patternName + ':', error.message);
      allValid = false;
    }
  }

  if (!allValid) {
    process.exit(1);
  }

  console.log('All patterns validated successfully');
"
```

### Step 4: Test Bootstrap Validation Tool

```bash
npm test -- tests/tools/bootstrap-validation-loop-tool.test.ts --verbose
```

If npm/Jest is unavailable, skip to Step 6 for structural validation using shell commands.

### Step 5: Test Deployment Readiness Tool

```bash
npm test -- tests/tools/deployment-readiness-tool.test.ts --verbose
```

If npm/Jest is unavailable, skip to Step 6 for structural validation using shell commands.

### Step 6: Validate Pattern Documentation Completeness

For each pattern file in `patterns/infrastructure/*.yaml`, verify it contains the required sections:

```bash
for pattern in patterns/infrastructure/*.yaml; do
  echo "Checking $pattern..."

  if ! grep -q "authoritativeSources" "$pattern"; then
    echo "Missing authoritativeSources in $pattern"
    exit 1
  fi

  if ! grep -q "deploymentPhases" "$pattern"; then
    echo "Missing deploymentPhases in $pattern"
    exit 1
  fi

  if ! grep -q "detectionHints" "$pattern"; then
    echo "Missing detectionHints in $pattern"
    exit 1
  fi

  echo "$pattern validated"
done

echo "All pattern documentation validated"
```

## On Failure

If any step fails:

1. **For PR events**: Add a comment to the PR with:
   - Which pattern(s) failed validation
   - Which required section is missing or malformed
   - Link to the pattern YAML structure documentation

2. **For push/dispatch events**: Create an issue:

**Title**: `[pattern-validation] {pattern name}: {failure description}`

**Body**:

```markdown
## Deployment Pattern Validation Failure

### Patterns Validated

| Pattern                 | Status      | Issue          |
| ----------------------- | ----------- | -------------- |
| kubernetes.yaml         | {pass/fail} | {issue if any} |
| firebase.yaml           | {pass/fail} | {issue if any} |
| firebase-emulators.yaml | {pass/fail} | {issue if any} |

### Validation Steps

| Step                           | Status      |
| ------------------------------ | ----------- |
| Schema validation              | {pass/fail} |
| Pattern detection tests        | {pass/fail} |
| Infrastructure pattern loading | {pass/fail} |
| Bootstrap validation tool      | {pass/fail} |
| Deployment readiness tool      | {pass/fail} |
| Documentation completeness     | {pass/fail} |

### Failure Details

{full error output}

### Recommended Fix

1. {step 1}
2. {step 2}

---

_Generated by Deployment Pattern Validation agentic workflow_
```

## On Success

- **For PR events**: Add a comment confirming all patterns validated successfully, listing each pattern
- **For push/dispatch events**: No issue needed

---

_Replaces: .github/agents/deployment-pattern-validation.yml_
