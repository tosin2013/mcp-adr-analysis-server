# Deployment Readiness Guide

How to validate your project is ready for production deployment using the MCP ADR Analysis Server.

---

## Overview

The deployment readiness tools help you:

- Validate test coverage and passing status
- Check for security issues before deployment
- Track deployment history and success rates
- Enforce zero-tolerance policies for critical failures
- Integrate with CI/CD pipelines

---

## Quick Start

### Basic Deployment Check

Ask your MCP client:

> "Check if this project is ready for production deployment"

Or use the tool directly:

```json
{
  "tool": "deployment_readiness",
  "arguments": {
    "projectPath": ".",
    "environment": "production",
    "strictMode": true
  }
}
```

---

## Pre-Deployment Validation

### Test Validation

The `deployment_readiness` tool enforces test requirements:

| Check              | Requirement                | Blocking |
| ------------------ | -------------------------- | -------- |
| Test suite exists  | At least one test file     | Yes      |
| All tests pass     | 0 failures                 | Yes      |
| Coverage threshold | Configurable (default 80%) | No       |
| Recent test run    | Within 24 hours            | No       |

```json
{
  "tool": "deployment_readiness",
  "arguments": {
    "projectPath": ".",
    "environment": "production",
    "strictMode": true,
    "testResults": {
      "success": true,
      "testsRun": 150,
      "testsPassed": 150,
      "testsFailed": 0,
      "coverage": 85.2
    }
  }
}
```

### Security Validation

Security checks are always performed:

| Check                      | Description                | Severity |
| -------------------------- | -------------------------- | -------- |
| Credential detection       | Scan for exposed secrets   | Critical |
| Dependency vulnerabilities | Check for known CVEs       | High     |
| Configuration security     | Validate environment setup | Medium   |
| Code patterns              | Detect insecure patterns   | Medium   |

### Configuration Validation

Ensures environment is properly configured:

- Required environment variables set
- Database connections validated
- External service connectivity verified
- SSL/TLS certificates valid

---

## Using `smart_git_push_v2`

For secure deployments with git, use `smart_git_push_v2`:

```json
{
  "tool": "smart_git_push_v2",
  "arguments": {
    "branch": "main",
    "message": "feat: add new authentication system",
    "checkDeploymentReadiness": true,
    "targetEnvironment": "production",
    "strictDeploymentMode": true,
    "testResults": {
      "success": true,
      "testsRun": 150,
      "testsPassed": 150,
      "testsFailed": 0
    }
  }
}
```

### Blocking Conditions

The push is blocked when:

- Critical security issues detected
- Test failures (when `testResults` provided)
- Deployment readiness failures (when enabled)
- Irrelevant files detected (build artifacts, temp files)

### Human Override

For edge cases requiring manual override:

```json
{
  "tool": "smart_git_push_v2",
  "arguments": {
    "branch": "main",
    "requestHumanConfirmation": true,
    "humanOverrides": [
      {
        "issue": "test-failure-001",
        "reason": "Known flaky test, tracked in issue #123",
        "approvedBy": "john.doe@example.com"
      }
    ]
  }
}
```

---

## Deployment History

### Track Deployment Metrics

The server maintains deployment history in `.mcp-adr-cache/deploy-history.json`:

```json
{
  "deployments": [
    {
      "id": "deploy-2026-02-20-001",
      "timestamp": "2026-02-20T14:30:00Z",
      "environment": "production",
      "branch": "main",
      "commit": "abc123",
      "status": "success",
      "metrics": {
        "testsRun": 150,
        "testsPassed": 150,
        "coverage": 85.2,
        "securityIssues": 0
      }
    }
  ]
}
```

### Success Rate Tracking

View deployment success rates:

```json
{
  "tool": "analyze_deployment_progress",
  "arguments": {
    "projectPath": ".",
    "includeHistory": true,
    "timeRange": "30d"
  }
}
```

---

## Environment-Specific Checks

### Development

Minimal checks for rapid iteration:

```json
{
  "tool": "deployment_readiness",
  "arguments": {
    "environment": "development",
    "strictMode": false
  }
}
```

### Staging

Moderate checks mirroring production:

```json
{
  "tool": "deployment_readiness",
  "arguments": {
    "environment": "staging",
    "strictMode": true
  }
}
```

### Production

Full validation with zero tolerance:

```json
{
  "tool": "deployment_readiness",
  "arguments": {
    "environment": "production",
    "strictMode": true,
    "enableTreeSitterAnalysis": true
  }
}
```

---

## CI/CD Integration

### GitHub Actions

```yaml
name: Deployment Readiness

on:
  pull_request:
    branches: [main]

jobs:
  check-readiness:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'

      - name: Install dependencies
        run: npm ci

      - name: Run tests
        run: npm test -- --coverage --json --outputFile=test-results.json

      - name: Check deployment readiness
        run: |
          npx mcp-adr-analysis-server --tool deployment_readiness \
            --environment production \
            --strictMode true \
            --testResults "$(cat test-results.json)"
```

### Pre-Push Hook

Add to `.husky/pre-push`:

```bash
#!/bin/bash

# Run tests
npm test

# Check deployment readiness for main branch
if [ "$(git rev-parse --abbrev-ref HEAD)" = "main" ]; then
  echo "Checking deployment readiness for main branch..."
  npx mcp-adr-analysis-server --tool deployment_readiness \
    --environment production \
    --strictMode true
fi
```

---

## Troubleshooting

### "Deployment blocked: test failures"

One or more tests are failing:

1. Run `npm test` locally to see failures
2. Fix the failing tests
3. Re-run deployment readiness check

### "Security issue detected"

The security scan found potential issues:

1. Review the security report in the response
2. Fix critical issues before deployment
3. Use human override for false positives (document reason)

### "Stale test results"

Test results are older than 24 hours:

1. Re-run your test suite
2. Provide fresh `testResults` to the tool
3. Adjust `analysisTimeout` if tests take long

---

## Best Practices

### Pre-Deployment Checklist

1. All tests passing locally
2. Code reviewed and approved
3. Security scan completed
4. Configuration validated for target environment
5. Rollback plan documented
6. Monitoring and alerts configured

### Deployment Strategy

| Strategy   | Description            | Use When               |
| ---------- | ---------------------- | ---------------------- |
| Rolling    | Gradual replacement    | Standard deployments   |
| Blue/Green | Parallel environments  | Zero-downtime required |
| Canary     | Small percentage first | High-risk changes      |
| Recreate   | Full replacement       | Database migrations    |

### Post-Deployment Validation

After deployment, verify:

```json
{
  "tool": "analyze_deployment_progress",
  "arguments": {
    "projectPath": ".",
    "validateDeployment": true,
    "environment": "production"
  }
}
```

---

## Related Tools

| Tool                           | Purpose                          |
| ------------------------------ | -------------------------------- |
| `deployment_readiness`         | Comprehensive readiness check    |
| `smart_git_push_v2`            | Secure git push with validation  |
| `analyze_deployment_progress`  | Deployment tracking and analysis |
| `generate_deployment_guidance` | Deployment recommendations       |

---

## Related Documentation

- **[API Reference](../reference/api-reference.md)** — Complete tool documentation
- **[Security Philosophy](../explanation/security-philosophy.md)** — Security approach
- **[Configuration](../configuration.md)** — Environment setup

---

**Questions about deployment?** → **[Open an Issue](https://github.com/tosin2013/mcp-adr-analysis-server/issues)**
