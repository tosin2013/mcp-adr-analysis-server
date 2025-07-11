/**
 * AI prompts for deployment completion analysis
 * Following prompt-driven development approach
 */

/**
 * AI prompt for identifying deployment tasks from ADRs
 */
export function generateDeploymentTaskIdentificationPrompt(
  adrFiles: Array<{
    id: string;
    title: string;
    content: string;
    status: string;
  }>,
  todoContent?: string
): string {
  return `
# Deployment Task Identification Guide

**Note: Use this as guidance for analyzing ADRs and todo content to identify deployment-related tasks and requirements. Focus on the most critical deployment aspects for this specific context.**

## ADR Files
${adrFiles
  .map(
    (adr, index) => `
### ADR ${index + 1}: ${adr.title}
**ID**: ${adr.id}
**Status**: ${adr.status}

**Content**:
\`\`\`markdown
${adr.content.slice(0, 1200)}${adr.content.length > 1200 ? '\n... (truncated)' : ''}
\`\`\`
`
  )
  .join('')}

${
  todoContent
    ? `## Todo Content
\`\`\`markdown
${todoContent.slice(0, 1500)}${todoContent.length > 1500 ? '\n... (truncated)' : ''}
\`\`\`
`
    : ''
}

## Task Identification Requirements

Consider identifying deployment-related tasks from these categories where applicable:

### 🚀 **Infrastructure Deployment**
- **Environment Setup**: Development, staging, production environments
- **Resource Provisioning**: Servers, databases, storage, networking
- **Configuration Management**: Environment variables, secrets, configs
- **Security Setup**: SSL certificates, firewalls, access controls
- **Monitoring Setup**: Logging, metrics, alerting, observability

### 📦 **Application Deployment**
- **Build Processes**: Compilation, bundling, optimization
- **Container Deployment**: Docker builds, registry pushes, orchestration
- **Service Deployment**: Microservices, APIs, web applications
- **Database Deployment**: Schema migrations, data seeding, backups
- **Static Asset Deployment**: CDN setup, asset optimization

### 🔄 **CI/CD Pipeline**
- **Pipeline Configuration**: Build, test, deploy workflows
- **Automation Setup**: Automated testing, deployment triggers
- **Quality Gates**: Code quality, security scans, performance tests
- **Rollback Mechanisms**: Blue-green deployment, canary releases
- **Integration Testing**: End-to-end testing, integration validation

### 🔧 **Operational Tasks**
- **Health Checks**: Service health monitoring, readiness probes
- **Performance Tuning**: Load balancing, caching, optimization
- **Backup & Recovery**: Data backup, disaster recovery procedures
- **Documentation**: Deployment guides, runbooks, troubleshooting
- **Training**: Team training, knowledge transfer

## Output Format

The following JSON structure provides a template for organizing your analysis (adapt fields as needed):

\`\`\`json
{
  "deploymentTaskAnalysis": {
    "totalAdrsAnalyzed": ${adrFiles.length},
    "deploymentTasksFound": 0,
    "taskCategories": 0,
    "analysisConfidence": 0.0-1.0,
    "completenessScore": 0.0-1.0
  },
  "identifiedTasks": [
    {
      "taskId": "task-id",
      "taskName": "specific deployment task name",
      "description": "detailed task description",
      "category": "infrastructure|application|cicd|operational",
      "subcategory": "specific subcategory",
      "priority": "critical|high|medium|low",
      "complexity": "low|medium|high",
      "estimatedEffort": "estimated effort in hours/days",
      "dependencies": ["task dependencies"],
      "sourceAdr": "ADR ID that defines this task",
      "sourceSection": "specific section in ADR",
      "deploymentPhase": "planning|development|testing|staging|production|maintenance",
      "automatable": true/false,
      "verificationCriteria": [
        "specific criteria to verify task completion"
      ],
      "expectedOutcome": "expected result of task completion",
      "riskLevel": "low|medium|high|critical",
      "blockers": ["potential blockers or prerequisites"],
      "resources": [
        {
          "type": "person|tool|service|infrastructure",
          "description": "required resource description",
          "availability": "available|required|unknown"
        }
      ]
    }
  ],
  "deploymentPhases": [
    {
      "phase": "phase name",
      "description": "phase description",
      "tasks": ["task IDs in this phase"],
      "duration": "estimated phase duration",
      "prerequisites": ["phase prerequisites"],
      "deliverables": ["phase deliverables"],
      "successCriteria": ["criteria for phase completion"]
    }
  ],
  "deploymentDependencies": [
    {
      "dependencyType": "technical|business|external|regulatory",
      "description": "dependency description",
      "impact": "how this affects deployment",
      "mitigation": "mitigation strategy",
      "owner": "responsible party"
    }
  ],
  "riskAssessment": [
    {
      "risk": "deployment risk description",
      "probability": "low|medium|high",
      "impact": "low|medium|high|critical",
      "category": "technical|operational|business|security",
      "mitigation": "risk mitigation strategy",
      "contingency": "contingency plan"
    }
  ],
  "recommendations": [
    {
      "type": "process|tooling|training|documentation",
      "recommendation": "specific recommendation",
      "rationale": "reasoning behind recommendation",
      "implementation": "how to implement",
      "priority": "critical|high|medium|low"
    }
  ]
}
\`\`\`

## Analysis Guidelines

1. **Comprehensive Review**: Analyze all ADRs for deployment implications
2. **Task Granularity**: Identify specific, actionable deployment tasks
3. **Dependency Mapping**: Clearly identify task dependencies and sequencing
4. **Risk Assessment**: Evaluate deployment risks and mitigation strategies
5. **Verification Focus**: Define clear completion criteria for each task
6. **Automation Potential**: Identify tasks suitable for automation

Please provide comprehensive deployment task identification and analysis.
`;
}

/**
 * AI prompt for analyzing CI/CD logs and status
 */
export function generateCiCdAnalysisPrompt(
  cicdLogs: string,
  pipelineConfig?: string,
  deploymentTasks?: Array<{
    taskId: string;
    taskName: string;
    category: string;
    verificationCriteria: string[];
  }>
): string {
  return `
# CI/CD Pipeline Analysis and Status Assessment

Please analyze the following CI/CD logs and pipeline configuration to assess deployment progress and identify issues.

## CI/CD Logs
\`\`\`
${cicdLogs.slice(0, 2000)}${cicdLogs.length > 2000 ? '\n... (truncated for analysis)' : ''}
\`\`\`

${
  pipelineConfig
    ? `## Pipeline Configuration
\`\`\`
${pipelineConfig.slice(0, 1000)}${pipelineConfig.length > 1000 ? '\n... (truncated)' : ''}
\`\`\`
`
    : ''
}

${
  deploymentTasks
    ? `## Deployment Tasks Context
${deploymentTasks
  .map(
    task => `
- **${task.taskName}** (${task.category}): ${task.verificationCriteria.join(', ')}
`
  )
  .join('')}
`
    : ''
}

## Analysis Requirements

Please analyze the CI/CD pipeline for:

### 🔍 **Pipeline Status Analysis**
- **Build Status**: Success, failure, in-progress, pending
- **Test Results**: Unit tests, integration tests, end-to-end tests
- **Quality Gates**: Code coverage, security scans, performance tests
- **Deployment Status**: Environment deployments, rollout progress
- **Error Analysis**: Failed steps, error messages, root causes

### 📊 **Progress Assessment**
- **Completion Percentage**: Overall pipeline progress
- **Phase Progress**: Individual phase completion status
- **Time Analysis**: Execution times, bottlenecks, delays
- **Resource Utilization**: CPU, memory, storage usage
- **Throughput Metrics**: Build frequency, success rate, lead time

### 🚨 **Issue Identification**
- **Failed Steps**: Specific failures and error messages
- **Performance Issues**: Slow steps, resource constraints
- **Quality Issues**: Test failures, coverage gaps, security vulnerabilities
- **Configuration Issues**: Misconfigurations, missing dependencies
- **Infrastructure Issues**: Environment problems, connectivity issues

### 🎯 **Recommendations**
- **Immediate Actions**: Critical issues requiring immediate attention
- **Optimization Opportunities**: Performance improvements, efficiency gains
- **Quality Improvements**: Test coverage, security enhancements
- **Process Improvements**: Workflow optimizations, automation opportunities

## Output Format

The following JSON structure provides a template for organizing your analysis (adapt fields as needed):

\`\`\`json
{
  "cicdAnalysis": {
    "analysisTimestamp": "ISO-8601-timestamp",
    "pipelineStatus": "success|failure|in_progress|pending|unknown",
    "overallProgress": 0-100,
    "analysisConfidence": 0.0-1.0,
    "logEntriesAnalyzed": 0
  },
  "pipelineStages": [
    {
      "stageName": "stage name",
      "status": "success|failure|in_progress|pending|skipped",
      "progress": 0-100,
      "startTime": "ISO-8601-timestamp",
      "endTime": "ISO-8601-timestamp",
      "duration": "duration in seconds",
      "steps": [
        {
          "stepName": "step name",
          "status": "success|failure|in_progress|pending|skipped",
          "duration": "duration in seconds",
          "output": "relevant output or error message",
          "exitCode": "exit code if applicable"
        }
      ]
    }
  ],
  "testResults": {
    "unitTests": {
      "total": 0,
      "passed": 0,
      "failed": 0,
      "skipped": 0,
      "coverage": 0.0-1.0
    },
    "integrationTests": {
      "total": 0,
      "passed": 0,
      "failed": 0,
      "skipped": 0
    },
    "e2eTests": {
      "total": 0,
      "passed": 0,
      "failed": 0,
      "skipped": 0
    }
  },
  "qualityGates": [
    {
      "gateName": "quality gate name",
      "status": "passed|failed|pending",
      "threshold": "threshold value",
      "actualValue": "actual measured value",
      "description": "gate description"
    }
  ],
  "deploymentStatus": [
    {
      "environment": "environment name",
      "status": "deployed|deploying|failed|pending",
      "version": "deployed version",
      "deploymentTime": "ISO-8601-timestamp",
      "healthStatus": "healthy|unhealthy|unknown",
      "issues": ["any deployment issues"]
    }
  ],
  "issues": [
    {
      "severity": "critical|high|medium|low|info",
      "category": "build|test|quality|deployment|infrastructure",
      "issue": "issue description",
      "location": "where the issue occurred",
      "errorMessage": "specific error message",
      "suggestedFix": "suggested resolution",
      "impact": "impact on deployment"
    }
  ],
  "performanceMetrics": {
    "totalDuration": "total pipeline duration",
    "buildTime": "build phase duration",
    "testTime": "test phase duration",
    "deploymentTime": "deployment phase duration",
    "resourceUsage": {
      "cpu": "CPU usage percentage",
      "memory": "memory usage",
      "storage": "storage usage"
    }
  },
  "recommendations": [
    {
      "priority": "critical|high|medium|low",
      "category": "performance|quality|reliability|security",
      "recommendation": "specific recommendation",
      "rationale": "reasoning behind recommendation",
      "implementation": "how to implement",
      "expectedBenefit": "expected improvement"
    }
  ]
}
\`\`\`

## Analysis Guidelines

1. **Comprehensive Log Analysis**: Parse all relevant log entries
2. **Status Determination**: Accurately assess current pipeline status
3. **Issue Identification**: Identify and categorize all issues
4. **Performance Analysis**: Evaluate pipeline performance and efficiency
5. **Actionable Recommendations**: Provide specific, implementable suggestions
6. **Context Awareness**: Consider deployment task context when available

Please provide thorough CI/CD pipeline analysis and status assessment.
`;
}

/**
 * AI prompt for calculating deployment progress
 */
export function generateDeploymentProgressCalculationPrompt(
  deploymentTasks: Array<{
    taskId: string;
    taskName: string;
    status: string;
    progress: number;
    category: string;
    priority: string;
  }>,
  cicdStatus?: any,
  environmentStatus?: any
): string {
  return `
# Deployment Progress Calculation

Please calculate the overall deployment progress based on task status, CI/CD pipeline status, and environment status.

## Deployment Tasks
${deploymentTasks
  .map(
    (task, index) => `
### Task ${index + 1}: ${task.taskName}
**ID**: ${task.taskId}
**Status**: ${task.status}
**Progress**: ${task.progress}%
**Category**: ${task.category}
**Priority**: ${task.priority}
`
  )
  .join('')}

${
  cicdStatus
    ? `## CI/CD Pipeline Status
\`\`\`json
${JSON.stringify(cicdStatus, null, 2)}
\`\`\`
`
    : ''
}

${
  environmentStatus
    ? `## Environment Status
\`\`\`json
${JSON.stringify(environmentStatus, null, 2)}
\`\`\`
`
    : ''
}

## Progress Calculation Requirements

Please calculate deployment progress considering:

### 📊 **Task-Based Progress**
- **Weighted Progress**: Weight tasks by priority and complexity
- **Category Progress**: Progress by deployment category
- **Critical Path**: Progress of critical path tasks
- **Dependency Impact**: How dependencies affect overall progress
- **Completion Criteria**: Task-specific completion verification

### 🔄 **Pipeline Progress**
- **Build Progress**: Compilation, testing, packaging
- **Quality Progress**: Code quality, security, performance checks
- **Deployment Progress**: Environment deployments, rollouts
- **Verification Progress**: Health checks, smoke tests, validation
- **Rollback Readiness**: Rollback mechanisms and procedures

### 🌐 **Environment Progress**
- **Infrastructure Readiness**: Environment provisioning and configuration
- **Service Health**: Application and service health status
- **Data Migration**: Database migrations and data consistency
- **Integration Status**: Service integration and connectivity
- **Performance Validation**: Performance benchmarks and SLA compliance

## Output Format

Please provide your calculation in the following JSON format:

\`\`\`json
{
  "deploymentProgress": {
    "calculationTimestamp": "ISO-8601-timestamp",
    "overallProgress": 0-100,
    "progressConfidence": 0.0-1.0,
    "estimatedCompletion": "ISO-8601-timestamp",
    "deploymentPhase": "planning|development|testing|staging|production|completed"
  },
  "categoryProgress": {
    "infrastructure": 0-100,
    "application": 0-100,
    "cicd": 0-100,
    "operational": 0-100
  },
  "taskProgress": [
    {
      "taskId": "task-id",
      "taskName": "task name",
      "status": "not_started|in_progress|completed|blocked|failed",
      "progress": 0-100,
      "weight": 0.0-1.0,
      "contributionToOverall": 0-100,
      "blockers": ["current blockers"],
      "nextSteps": ["immediate next steps"],
      "estimatedCompletion": "ISO-8601-timestamp"
    }
  ],
  "criticalPath": {
    "tasks": ["task IDs on critical path"],
    "progress": 0-100,
    "bottlenecks": ["current bottlenecks"],
    "riskFactors": ["factors that could delay completion"]
  },
  "milestones": [
    {
      "milestone": "milestone name",
      "status": "pending|in_progress|completed|at_risk",
      "progress": 0-100,
      "targetDate": "ISO-8601-timestamp",
      "actualDate": "ISO-8601-timestamp",
      "dependencies": ["milestone dependencies"]
    }
  ],
  "qualityMetrics": {
    "codeQuality": 0-100,
    "testCoverage": 0-100,
    "securityCompliance": 0-100,
    "performanceTargets": 0-100,
    "documentationCompleteness": 0-100
  },
  "riskAssessment": {
    "overallRisk": "low|medium|high|critical",
    "scheduleRisk": "low|medium|high|critical",
    "qualityRisk": "low|medium|high|critical",
    "technicalRisk": "low|medium|high|critical",
    "riskFactors": [
      {
        "risk": "risk description",
        "impact": "potential impact",
        "probability": "low|medium|high",
        "mitigation": "mitigation strategy"
      }
    ]
  },
  "recommendations": [
    {
      "priority": "critical|high|medium|low",
      "type": "acceleration|quality|risk_mitigation|resource",
      "recommendation": "specific recommendation",
      "rationale": "reasoning behind recommendation",
      "implementation": "how to implement",
      "expectedImpact": "expected impact on progress"
    }
  ],
  "nextActions": [
    {
      "action": "immediate action required",
      "owner": "responsible party",
      "deadline": "action deadline",
      "priority": "critical|high|medium|low",
      "dependencies": ["action dependencies"]
    }
  ]
}
\`\`\`

## Calculation Guidelines

1. **Weighted Progress**: Consider task priority, complexity, and impact
2. **Dependency Awareness**: Account for task dependencies and sequencing
3. **Quality Integration**: Include quality metrics in progress calculation
4. **Risk Consideration**: Factor in risks and potential delays
5. **Realistic Estimation**: Provide realistic completion estimates
6. **Actionable Insights**: Generate specific, actionable recommendations

Please provide comprehensive deployment progress calculation and analysis.
`;
}

/**
 * AI prompt for verifying completion with outcome rules
 */
export function generateCompletionVerificationPrompt(
  deploymentTasks: Array<{
    taskId: string;
    taskName: string;
    verificationCriteria: string[];
    expectedOutcome: string;
    status: string;
  }>,
  outcomeRules: Array<{
    ruleId: string;
    description: string;
    criteria: string[];
    verificationMethod: string;
  }>,
  actualOutcomes?: Array<{
    taskId: string;
    outcome: string;
    evidence: string[];
    timestamp: string;
  }>
): string {
  return `
# Deployment Completion Verification with Outcome Rules

Please verify deployment completion by comparing actual outcomes against expected outcome rules and verification criteria.

## Deployment Tasks with Verification Criteria
${deploymentTasks
  .map(
    (task, index) => `
### Task ${index + 1}: ${task.taskName}
**ID**: ${task.taskId}
**Status**: ${task.status}
**Expected Outcome**: ${task.expectedOutcome}
**Verification Criteria**:
${task.verificationCriteria.map(criteria => `- ${criteria}`).join('\n')}
`
  )
  .join('')}

## Outcome Rules
${outcomeRules
  .map(
    (rule, index) => `
### Rule ${index + 1}: ${rule.description}
**ID**: ${rule.ruleId}
**Verification Method**: ${rule.verificationMethod}
**Criteria**:
${rule.criteria.map(criteria => `- ${criteria}`).join('\n')}
`
  )
  .join('')}

${
  actualOutcomes
    ? `## Actual Outcomes
${actualOutcomes
  .map(
    (outcome, index) => `
### Outcome ${index + 1}: ${outcome.taskId}
**Outcome**: ${outcome.outcome}
**Timestamp**: ${outcome.timestamp}
**Evidence**:
${outcome.evidence.map(evidence => `- ${evidence}`).join('\n')}
`
  )
  .join('')}
`
    : ''
}

## Verification Requirements

Please verify completion by analyzing:

### ✅ **Criteria Verification**
- **Task Completion**: Verify each task meets its completion criteria
- **Outcome Validation**: Compare actual outcomes against expected outcomes
- **Rule Compliance**: Ensure all outcome rules are satisfied
- **Evidence Assessment**: Evaluate the quality and completeness of evidence
- **Quality Standards**: Verify quality standards and acceptance criteria

### 🔍 **Compliance Assessment**
- **Functional Requirements**: All functional requirements implemented
- **Non-Functional Requirements**: Performance, security, reliability standards met
- **Business Rules**: Business logic and rules properly implemented
- **Technical Standards**: Code quality, architecture, and design standards
- **Operational Requirements**: Monitoring, logging, and maintenance capabilities

### 📊 **Success Metrics**
- **Performance Metrics**: Response times, throughput, resource utilization
- **Quality Metrics**: Test coverage, defect rates, code quality scores
- **Reliability Metrics**: Uptime, error rates, recovery times
- **Security Metrics**: Vulnerability assessments, compliance scores
- **User Experience**: Usability, accessibility, satisfaction metrics

## Output Format

Please provide your verification in the following JSON format:

\`\`\`json
{
  "completionVerification": {
    "verificationTimestamp": "ISO-8601-timestamp",
    "overallCompletion": true/false,
    "completionPercentage": 0-100,
    "verificationConfidence": 0.0-1.0,
    "verificationMethod": "automated|manual|hybrid"
  },
  "taskVerification": [
    {
      "taskId": "task-id",
      "taskName": "task name",
      "completed": true/false,
      "completionPercentage": 0-100,
      "verificationStatus": "verified|failed|pending|partial",
      "criteriaResults": [
        {
          "criteria": "verification criteria",
          "status": "met|not_met|partial|unknown",
          "evidence": "supporting evidence",
          "confidence": 0.0-1.0
        }
      ],
      "outcomeVerification": {
        "expectedOutcome": "expected outcome",
        "actualOutcome": "actual outcome",
        "outcomeMatch": true/false,
        "variance": "description of any variance",
        "acceptability": "acceptable|unacceptable|requires_review"
      },
      "issues": [
        {
          "issue": "issue description",
          "severity": "critical|high|medium|low",
          "impact": "impact on completion",
          "resolution": "suggested resolution"
        }
      ]
    }
  ],
  "ruleCompliance": [
    {
      "ruleId": "rule-id",
      "description": "rule description",
      "compliant": true/false,
      "complianceLevel": 0-100,
      "verificationResults": [
        {
          "criteria": "rule criteria",
          "result": "passed|failed|partial|not_applicable",
          "evidence": "supporting evidence",
          "notes": "additional notes"
        }
      ],
      "violations": [
        {
          "violation": "violation description",
          "severity": "critical|high|medium|low",
          "remediation": "remediation steps"
        }
      ]
    }
  ],
  "qualityAssessment": {
    "functionalCompleteness": 0-100,
    "performanceCompliance": 0-100,
    "securityCompliance": 0-100,
    "reliabilityScore": 0-100,
    "maintainabilityScore": 0-100,
    "usabilityScore": 0-100,
    "overallQuality": 0-100
  },
  "successMetrics": [
    {
      "metric": "metric name",
      "target": "target value",
      "actual": "actual value",
      "status": "met|not_met|exceeded|unknown",
      "variance": "variance from target",
      "trend": "improving|stable|declining"
    }
  ],
  "completionGaps": [
    {
      "gap": "completion gap description",
      "impact": "low|medium|high|critical",
      "category": "functional|performance|security|quality|operational",
      "remediation": "steps to address gap",
      "effort": "estimated effort to close gap",
      "priority": "critical|high|medium|low"
    }
  ],
  "recommendations": [
    {
      "type": "completion|quality|performance|security|operational",
      "recommendation": "specific recommendation",
      "rationale": "reasoning behind recommendation",
      "implementation": "implementation steps",
      "priority": "critical|high|medium|low",
      "timeline": "recommended timeline"
    }
  ],
  "signOffStatus": {
    "readyForSignOff": true/false,
    "requiredApprovals": ["required approvals"],
    "pendingItems": ["items pending completion"],
    "riskAssessment": "overall risk level",
    "goLiveRecommendation": "go|no_go|conditional"
  }
}
\`\`\`

## Verification Guidelines

1. **Objective Assessment**: Base verification on measurable criteria and evidence
2. **Comprehensive Coverage**: Verify all aspects of deployment completion
3. **Risk-Based Evaluation**: Prioritize critical and high-risk areas
4. **Evidence-Based**: Require concrete evidence for completion claims
5. **Quality Focus**: Ensure quality standards are met, not just functionality
6. **Stakeholder Perspective**: Consider all stakeholder requirements and expectations

Please provide thorough deployment completion verification and assessment.
`;
}
