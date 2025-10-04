# 🔄 How-To: CI/CD Integration

**Integrate MCP ADR Analysis Server into your continuous integration and deployment pipelines for automated architectural governance.**

**When to use this guide**: Setting up automated ADR validation, implementing architectural quality gates, or establishing continuous architectural governance.

---

## 🎯 Quick Setup

### GitHub Actions Integration

**Most Common Use Case**: Validate ADRs and architectural decisions on every pull request.

```yaml
# .github/workflows/adr-validation.yml
name: ADR Validation

on:
  pull_request:
    paths: ['././adrs/**', 'src/**', 'package.json']
  push:
    branches: [main, develop]

jobs:
  adr-validation:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '18'
          cache: 'npm'

      - name: Install MCP ADR Analysis Server
        run: npm install -g mcp-adr-analysis-server

      - name: Validate ADR Compliance
        env:
          OPENROUTER_API_KEY: ${{ secrets.OPENROUTER_API_KEY }}
          PROJECT_PATH: ${{ github.workspace }}
          EXECUTION_MODE: full
        run: |
          echo "🔍 Analyzing ADR compliance..."
          # Note: Replace with actual MCP client integration
          npx mcp-adr-analysis-server validate-adrs

      - name: Check Architectural Decisions
        env:
          OPENROUTER_API_KEY: ${{ secrets.OPENROUTER_API_KEY }}
        run: |
          echo "🏗️ Checking for missing architectural decisions..."
          # Note: Replace with actual MCP client integration
          npx mcp-adr-analysis-server suggest-missing-adrs
```

### GitLab CI Integration

```yaml
# .gitlab-ci.yml
stages:
  - validate
  - deploy

adr-validation:
  stage: validate
  image: node:18
  before_script:
    - npm install -g mcp-adr-analysis-server
  script:
    - echo "🔍 Validating architectural decisions..."
    - npx mcp-adr-analysis-server validate-adrs
  variables:
    PROJECT_PATH: $CI_PROJECT_DIR
    EXECUTION_MODE: full
  only:
    changes:
      - ././adrs/**/*
      - src/**/*
      - package.json
```

---

## 🛠️ Advanced CI/CD Workflows

### 1. Automated ADR Generation

**Trigger ADR creation when architectural changes are detected:**

```yaml
# .github/workflows/auto-adr-generation.yml
name: Auto ADR Generation

on:
  pull_request:
    paths: ['src/**', 'package.json', 'docker-compose.yml']

jobs:
  detect-architectural-changes:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0 # Full history for change analysis

      - name: Analyze Architectural Changes
        id: analyze
        env:
          OPENROUTER_API_KEY: ${{ secrets.OPENROUTER_API_KEY }}
        run: |
          # Detect significant architectural changes
          git diff HEAD~1 --name-only | grep -E '\.(js|ts|py|yml|yaml|json)$' > changed_files.txt

          if [ -s changed_files.txt ]; then
            echo "architectural_changes=true" >> $GITHUB_OUTPUT
            echo "🏗️ Architectural changes detected"
          else
            echo "architectural_changes=false" >> $GITHUB_OUTPUT
          fi

      - name: Generate Missing ADRs
        if: steps.analyze.outputs.architectural_changes == 'true'
        run: |
          echo "📝 Generating ADRs for architectural changes..."
          # Note: Implement with MCP client

      - name: Create Pull Request Comment
        if: steps.analyze.outputs.architectural_changes == 'true'
        uses: actions/github-script@v7
        with:
          script: |
            github.rest.issues.createComment({
              issue_number: context.issue.number,
              owner: context.repo.owner,
              repo: context.repo.repo,
              body: '🏗️ **Architectural changes detected!** Consider creating ADRs for significant decisions.'
            })
```

### 2. Security-Focused CI Pipeline

```yaml
# .github/workflows/security-adr-validation.yml
name: Security ADR Validation

on:
  pull_request:
    paths: ['src/**', 'config/**', 'docker/**']

jobs:
  security-analysis:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Security Content Analysis
        env:
          OPENROUTER_API_KEY: ${{ secrets.OPENROUTER_API_KEY }}
        run: |
          echo "🔒 Analyzing content for security issues..."
          # Scan for hardcoded secrets, security anti-patterns

      - name: Validate Security ADRs
        run: |
          echo "📋 Checking security-related ADRs..."
          # Ensure security decisions are documented

      - name: Generate Security Report
        run: |
          echo "📊 Generating security compliance report..."
          # Create security compliance dashboard
```

### 3. Deployment Readiness Gates

```yaml
# .github/workflows/deployment-gates.yml
name: Deployment Readiness

on:
  push:
    branches: [main]
  workflow_dispatch:

jobs:
  deployment-readiness:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Check Deployment Readiness
        env:
          OPENROUTER_API_KEY: ${{ secrets.OPENROUTER_API_KEY }}
          PROJECT_PATH: ${{ github.workspace }}
        run: |
          echo "🚀 Checking deployment readiness..."
          # Comprehensive deployment validation

      - name: Validate Environment Configuration
        run: |
          echo "🌍 Validating environment configuration..."
          # Check environment variables, configs

      - name: Generate Deployment Report
        run: |
          echo "📋 Generating deployment readiness report..."
          # Create deployment dashboard

      - name: Block Deployment if Issues Found
        run: |
          # Fail pipeline if critical issues detected
          if [ "$DEPLOYMENT_READY" != "true" ]; then
            echo "❌ Deployment blocked due to readiness issues"
            exit 1
          fi
```

---

## 🔧 Tool-Specific Integrations

### Jenkins Pipeline

```groovy
// Jenkinsfile
pipeline {
    agent any

    environment {
        OPENROUTER_API_KEY = credentials('openrouter-api-key')
        PROJECT_PATH = "${WORKSPACE}"
        EXECUTION_MODE = 'full'
    }

    stages {
        stage('ADR Validation') {
            steps {
                sh '''
                    npm install -g mcp-adr-analysis-server
                    echo "🔍 Validating ADRs..."
                    # Add MCP client integration
                '''
            }
        }

        stage('Architectural Analysis') {
            steps {
                sh '''
                    echo "🏗️ Analyzing architecture..."
                    # Comprehensive architectural analysis
                '''
            }
        }

        stage('Security Scan') {
            steps {
                sh '''
                    echo "🔒 Security analysis..."
                    # Security-focused analysis
                '''
            }
        }
    }

    post {
        always {
            publishHTML([
                allowMissing: false,
                alwaysLinkToLastBuild: true,
                keepAll: true,
                reportDir: 'reports',
                reportFiles: 'adr-report.html',
                reportName: 'ADR Analysis Report'
            ])
        }
    }
}
```

### Azure DevOps Pipeline

```yaml
# azure-pipelines.yml
trigger:
  branches:
    include:
      - main
      - develop
  paths:
    include:
      - ././adrs/*
      - src/*

pool:
  vmImage: 'ubuntu-latest'

variables:
  PROJECT_PATH: $(Build.SourcesDirectory)
  EXECUTION_MODE: full

steps:
  - task: NodeTool@0
    inputs:
      versionSpec: '18.x'
    displayName: 'Install Node.js'

  - script: |
      npm install -g mcp-adr-analysis-server
    displayName: 'Install MCP ADR Analysis Server'

  - script: |
      echo "🔍 Validating ADRs..."
      # Add MCP client integration
    env:
      OPENROUTER_API_KEY: $(OPENROUTER_API_KEY)
    displayName: 'ADR Validation'

  - script: |
      echo "📊 Generating reports..."
      # Generate analysis reports
    displayName: 'Generate Reports'

  - task: PublishTestResults@2
    inputs:
      testResultsFormat: 'JUnit'
      testResultsFiles: 'reports/adr-results.xml'
    displayName: 'Publish ADR Results'
```

---

## 📊 Quality Gates and Metrics

### 1. ADR Compliance Scoring

```yaml
# Quality gate configuration
adr_quality_gates:
  minimum_compliance_score: 80
  required_sections:
    - context
    - decision
    - consequences

  blocking_issues:
    - missing_security_decisions
    - undocumented_architecture_changes
    - deployment_readiness_failures
```

### 2. Automated Metrics Collection

```yaml
# .github/workflows/metrics-collection.yml
name: ADR Metrics Collection

on:
  schedule:
    - cron: '0 0 * * 0' # Weekly
  workflow_dispatch:

jobs:
  collect-metrics:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Collect ADR Metrics
        run: |
          echo "📊 Collecting ADR metrics..."
          # Generate comprehensive metrics

      - name: Update Dashboard
        run: |
          echo "📈 Updating metrics dashboard..."
          # Update project dashboard
```

### 3. Trend Analysis

```bash
#!/bin/bash
# scripts/adr-trend-analysis.sh

echo "📈 Analyzing ADR trends..."

# Collect historical data
git log --oneline --since="30 days ago" ././adrs/ > recent_adr_changes.txt

# Analyze patterns
echo "Recent ADR activity:"
wc -l recent_adr_changes.txt

# Generate trend report
echo "📊 Generating trend analysis..."
```

---

## 🚨 Error Handling and Notifications

### Slack Integration

```yaml
# .github/workflows/adr-notifications.yml
name: ADR Notifications

on:
  pull_request:
    paths: ['././adrs/**']

jobs:
  notify-team:
    runs-on: ubuntu-latest
    steps:
      - name: Notify Architecture Team
        uses: 8398a7/action-slack@v3
        with:
          status: custom
          custom_payload: |
            {
              "text": "🏗️ ADR Changes Detected",
              "attachments": [{
                "color": "good",
                "fields": [{
                  "title": "Pull Request",
                  "value": "${{ github.event.pull_request.html_url }}",
                  "short": true
                }]
              }]
            }
        env:
          SLACK_WEBHOOK_URL: ${{ secrets.SLACK_WEBHOOK_URL }}
```

### Teams Integration

```yaml
- name: Notify Teams Channel
  uses: aliencube/microsoft-teams-actions@v0.8.0
  with:
    webhook_uri: ${{ secrets.TEAMS_WEBHOOK_URL }}
    title: 'ADR Analysis Complete'
    summary: 'Architectural decision analysis results'
    text: '📋 ADR validation completed for PR #${{ github.event.number }}'
```

---

## 🔄 Continuous Improvement

### 1. Feedback Loop Integration

```yaml
# Collect feedback on ADR process
feedback_collection:
  triggers:
    - adr_creation
    - deployment_completion
    - incident_resolution

  metrics:
    - decision_implementation_time
    - adr_accuracy_score
    - team_satisfaction
```

### 2. Process Optimization

```bash
#!/bin/bash
# scripts/optimize-adr-process.sh

echo "🔧 Optimizing ADR process based on metrics..."

# Analyze bottlenecks
echo "📊 Analyzing process bottlenecks..."

# Suggest improvements
echo "💡 Generating process improvement suggestions..."
```

### 3. Tool Evolution

```yaml
# Regular tool updates and improvements
tool_maintenance:
  schedule: monthly
  activities:
    - update_dependencies
    - review_configurations
    - optimize_performance
    - gather_user_feedback
```

---

## 📚 Best Practices

### 1. Pipeline Design Principles

- **Fail Fast**: Catch architectural issues early in the pipeline
- **Incremental Validation**: Validate changes, not entire codebase
- **Clear Feedback**: Provide actionable error messages
- **Performance Optimization**: Cache results, parallel execution

### 2. Security Considerations

- **Secret Management**: Use secure secret storage (GitHub Secrets, Azure Key Vault)
- **Access Control**: Limit pipeline permissions to minimum required
- **Audit Logging**: Track all architectural decisions and changes
- **Compliance**: Ensure pipelines meet organizational security standards

### 3. Team Collaboration

- **Clear Ownership**: Define who's responsible for ADR maintenance
- **Review Process**: Implement peer review for architectural decisions
- **Documentation**: Keep pipeline documentation up-to-date
- **Training**: Ensure team understands CI/CD integration

---

## 🔗 Related Documentation

- **[Security Analysis](security-analysis.md)** - Security-focused CI/CD workflows
- **[Deployment Readiness](deployment-readiness.md)** - Production deployment validation
- **[Troubleshooting](troubleshooting.md)** - CI/CD pipeline troubleshooting

---

**Need help with CI/CD integration?** → **[File an Issue](https://github.com/tosin2013/mcp-adr-analysis-server/issues)** or check the **[API Reference](../reference/api-reference.md)**
