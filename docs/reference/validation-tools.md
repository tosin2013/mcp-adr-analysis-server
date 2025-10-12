# ✅ Validation Tools Reference

**Complete reference for MCP ADR Analysis Server validation, progress tracking, and quality assurance tools.**

---

## 📋 Quick Reference

| Tool                     | Purpose                           | Key Parameters                        | Output                                |
| ------------------------ | --------------------------------- | ------------------------------------- | ------------------------------------- |
| `review_existing_adrs`   | ADR compliance and gap analysis   | `adrDirectory`, `complianceFramework` | Compliance scores and recommendations |
| `compare_adr_progress`   | Track implementation progress     | `todoPath`, `adrDirectory`            | Progress metrics and status           |
| `deployment_readiness`   | Validate deployment readiness     | `operation`, `projectPath`            | Readiness assessment and blockers     |
| `validate_adr_bootstrap` | Validate ADR setup and compliance | `adrDirectory`, `complianceFramework` | Bootstrap validation report           |

---

## 📋 review_existing_adrs

**Purpose**: Comprehensive analysis of existing ADRs for compliance, completeness, and quality assessment.

### Parameters

```typescript
interface ReviewExistingAdrsParams {
  adrDirectory: string; // Required: Path to ADR directory
  includeTreeSitter?: boolean; // Enable code analysis for implementation validation
  complianceFramework?: 'madr' | 'nygard' | 'alexandrian' | 'custom';
  analysisDepth?: 'basic' | 'standard' | 'comprehensive';
  projectPath?: string; // Project path for code analysis
  generateRecommendations?: boolean; // Generate improvement recommendations
  validateImplementation?: boolean; // Check if decisions are implemented
  checkConsistency?: boolean; // Validate consistency across ADRs
}
```

### Usage Examples

#### Basic ADR Review

```json
{
  "tool": "review_existing_adrs",
  "parameters": {
    "adrDirectory": "./adrs",
    "complianceFramework": "madr",
    "analysisDepth": "standard"
  }
}
```

#### Comprehensive ADR Analysis with Code Validation

```json
{
  "tool": "review_existing_adrs",
  "parameters": {
    "adrDirectory": "./adrs",
    "includeTreeSitter": true,
    "complianceFramework": "madr",
    "analysisDepth": "comprehensive",
    "projectPath": ".",
    "generateRecommendations": true,
    "validateImplementation": true,
    "checkConsistency": true
  }
}
```

#### Quick Compliance Check

```json
{
  "tool": "review_existing_adrs",
  "parameters": {
    "adrDirectory": "./adrs",
    "complianceFramework": "nygard",
    "analysisDepth": "basic",
    "generateRecommendations": false
  }
}
```

### Response Format

```typescript
interface AdrReviewAnalysis {
  summary: {
    totalAdrs: number;
    complianceScore: number; // 0-100 overall compliance
    completenessScore: number; // 0-100 completeness score
    qualityScore: number; // 0-100 quality score
    implementationScore?: number; // 0-100 implementation score
  };
  adrAnalysis: Array<{
    file: string;
    title: string;
    status: string;
    compliance: {
      score: number;
      issues: string[];
      recommendations: string[];
      missingElements: string[];
    };
    implementation?: {
      implemented: boolean;
      evidence: string[];
      gaps: string[];
      codeReferences: string[];
    };
    quality: {
      readability: number;
      completeness: number;
      consistency: number;
      maintainability: number;
    };
  }>;
  gaps: {
    missingDecisions: string[];
    undocumentedPatterns: string[];
    implementationGaps: string[];
    consistencyIssues: string[];
  };
  recommendations: {
    newAdrs: string[];
    improvements: string[];
    processChanges: string[];
    toolingEnhancements: string[];
  };
  trendAnalysis?: {
    decisionVelocity: number;
    qualityTrend: 'improving' | 'stable' | 'declining';
    commonIssues: string[];
  };
}
```

### Compliance Frameworks

#### MADR (Markdown ADR) Framework

- **Title**: Clear, descriptive title
- **Status**: Current status (proposed, accepted, deprecated, etc.)
- **Context**: Background and problem description
- **Decision**: The architectural decision made
- **Consequences**: Positive and negative outcomes

#### Nygard Framework

- **Title**: Decision title
- **Status**: Decision status
- **Context**: Forces and constraints
- **Decision**: The decision made
- **Consequences**: Results and trade-offs

#### Custom Framework

- User-defined sections and requirements
- Organization-specific compliance rules
- Custom validation criteria

---

## 📊 compare_adr_progress

**Purpose**: Track and compare implementation progress of architectural decisions against planned tasks.

### Parameters

```typescript
interface CompareAdrProgressParams {
  todoPath?: string; // Path to TODO file
  adrDirectory: string; // Required: Path to ADR directory
  projectPath?: string; // Project path for implementation analysis
  timeframe?: string; // Analysis timeframe (e.g., "last_30_days")
  includeMetrics?: boolean; // Include detailed metrics
  generateReport?: boolean; // Generate progress report
  trackingMode?: 'tasks' | 'implementations' | 'both';
}
```

### Usage Examples

#### Basic Progress Tracking

```json
{
  "tool": "compare_adr_progress",
  "parameters": {
    "todoPath": "TODO.md",
    "adrDirectory": "./adrs",
    "includeMetrics": true
  }
}
```

#### Comprehensive Progress Analysis

```json
{
  "tool": "compare_adr_progress",
  "parameters": {
    "todoPath": "IMPLEMENTATION_TODO.md",
    "adrDirectory": "./adrs",
    "projectPath": ".",
    "timeframe": "last_60_days",
    "includeMetrics": true,
    "generateReport": true,
    "trackingMode": "both"
  }
}
```

#### Implementation-Only Tracking

```json
{
  "tool": "compare_adr_progress",
  "parameters": {
    "adrDirectory": "./adrs",
    "projectPath": ".",
    "trackingMode": "implementations",
    "includeMetrics": true
  }
}
```

### Response Format

```typescript
interface AdrProgressComparison {
  summary: {
    totalAdrs: number;
    implementedAdrs: number;
    inProgressAdrs: number;
    plannedAdrs: number;
    overallProgress: number; // 0-100 percentage
  };
  taskProgress: {
    totalTasks: number;
    completedTasks: number;
    inProgressTasks: number;
    blockedTasks: number;
    taskCompletionRate: number;
  };
  adrDetails: Array<{
    adr: string;
    status: 'implemented' | 'in_progress' | 'planned' | 'blocked';
    progress: number; // 0-100 percentage
    tasks: Array<{
      description: string;
      status: 'completed' | 'in_progress' | 'pending' | 'blocked';
      assignee?: string;
      dueDate?: string;
    }>;
    implementationEvidence: string[];
    blockers: string[];
    estimatedCompletion?: string;
  }>;
  metrics: {
    velocityTrend: 'increasing' | 'stable' | 'decreasing';
    averageImplementationTime: number; // days
    riskFactors: string[];
    recommendations: string[];
  };
  timeline: {
    milestones: Array<{
      date: string;
      description: string;
      status: 'completed' | 'upcoming' | 'at_risk';
    }>;
    projectedCompletion: string;
  };
}
```

---

## 🚀 deployment_readiness

**Purpose**: Comprehensive validation of deployment readiness including code quality, security, and operational requirements.

### Parameters

```typescript
interface DeploymentReadinessParams {
  operation: 'validate' | 'security_audit' | 'performance_check' | 'compliance_check';
  projectPath?: string; // Project path for analysis
  environment?: 'development' | 'staging' | 'production';
  securityValidation?: boolean; // Include security validation
  performanceValidation?: boolean; // Include performance checks
  complianceValidation?: boolean; // Include compliance validation
  enableTreeSitterAnalysis?: boolean; // Enable code analysis
  customChecks?: string[]; // Custom validation checks
  blockingIssuesOnly?: boolean; // Only report blocking issues
}
```

### Usage Examples

#### Basic Deployment Validation

```json
{
  "tool": "deployment_readiness",
  "parameters": {
    "operation": "validate",
    "projectPath": ".",
    "environment": "production"
  }
}
```

#### Comprehensive Security Audit

```json
{
  "tool": "deployment_readiness",
  "parameters": {
    "operation": "security_audit",
    "projectPath": ".",
    "environment": "production",
    "securityValidation": true,
    "enableTreeSitterAnalysis": true,
    "complianceValidation": true
  }
}
```

#### Performance-Focused Check

```json
{
  "tool": "deployment_readiness",
  "parameters": {
    "operation": "performance_check",
    "projectPath": ".",
    "environment": "production",
    "performanceValidation": true,
    "customChecks": ["memory_usage", "cpu_optimization", "database_queries"]
  }
}
```

#### Blocking Issues Only

```json
{
  "tool": "deployment_readiness",
  "parameters": {
    "operation": "validate",
    "projectPath": ".",
    "environment": "production",
    "blockingIssuesOnly": true,
    "securityValidation": true
  }
}
```

### Response Format

```typescript
interface DeploymentReadinessResponse {
  readinessScore: number; // 0-100 overall readiness
  isReady: boolean; // Ready for deployment
  environment: string;

  validation: {
    security: {
      score: number;
      issues: Array<{
        severity: 'low' | 'medium' | 'high' | 'critical';
        description: string;
        recommendation: string;
        blocking: boolean;
      }>;
      passed: boolean;
    };

    performance: {
      score: number;
      metrics: {
        loadTime: number;
        memoryUsage: number;
        cpuUsage: number;
      };
      issues: string[];
      passed: boolean;
    };

    compliance: {
      score: number;
      frameworks: Record<string, boolean>;
      violations: string[];
      passed: boolean;
    };

    codeQuality: {
      score: number;
      coverage: number;
      complexity: number;
      issues: string[];
      passed: boolean;
    };
  };

  blockers: Array<{
    category: string;
    description: string;
    severity: 'high' | 'critical';
    resolution: string;
    estimatedEffort: string;
  }>;

  recommendations: {
    immediate: string[];
    shortTerm: string[];
    longTerm: string[];
  };

  deployment: {
    estimatedRisk: 'low' | 'medium' | 'high' | 'critical';
    recommendedActions: string[];
    rollbackPlan: string[];
  };
}
```

---

## 🔧 validate_adr_bootstrap

**Purpose**: Validate ADR setup, structure, and compliance with organizational standards.

### Parameters

```typescript
interface ValidateAdrBootstrapParams {
  adrDirectory: string; // Required: Path to ADR directory
  complianceFramework?: 'madr' | 'nygard' | 'custom';
  organizationStandards?: string; // Path to organization standards
  enableTreeSitterAnalysis?: boolean; // Enable code analysis
  securityValidation?: boolean; // Include security validation
  templateValidation?: boolean; // Validate ADR templates
  processValidation?: boolean; // Validate ADR process compliance
}
```

### Usage Examples

#### Basic Bootstrap Validation

```json
{
  "tool": "validate_adr_bootstrap",
  "parameters": {
    "adrDirectory": "./adrs",
    "complianceFramework": "madr"
  }
}
```

#### Comprehensive Bootstrap Analysis

```json
{
  "tool": "validate_adr_bootstrap",
  "parameters": {
    "adrDirectory": "./adrs",
    "complianceFramework": "madr",
    "organizationStandards": "standards/adr-standards.json",
    "enableTreeSitterAnalysis": true,
    "securityValidation": true,
    "templateValidation": true,
    "processValidation": true
  }
}
```

### Response Format

```typescript
interface AdrBootstrapValidation {
  isValid: boolean;
  validationScore: number; // 0-100 overall score

  structure: {
    directoryExists: boolean;
    templateExists: boolean;
    indexExists: boolean;
    namingConvention: boolean;
    organizationCompliant: boolean;
  };

  templates: {
    valid: boolean;
    framework: string;
    completeness: number;
    issues: string[];
  };

  process: {
    workflowDefined: boolean;
    reviewProcess: boolean;
    approvalProcess: boolean;
    stakeholderMapping: boolean;
  };

  security: {
    accessControls: boolean;
    sensitiveDataHandling: boolean;
    auditTrail: boolean;
  };

  recommendations: {
    setup: string[];
    process: string[];
    tooling: string[];
    training: string[];
  };

  nextSteps: string[];
}
```

---

## 🔄 Advanced Validation Workflows

### Continuous Validation Pipeline

```yaml
# Continuous ADR validation workflow
validation_pipeline:
  triggers:
    - adr_changes
    - code_changes
    - scheduled_weekly

  stages:
    - name: 'adr_review'
      tool: 'review_existing_adrs'
      config:
        analysisDepth: 'comprehensive'
        includeTreeSitter: true

    - name: 'progress_tracking'
      tool: 'compare_adr_progress'
      config:
        includeMetrics: true
        trackingMode: 'both'

    - name: 'deployment_readiness'
      tool: 'deployment_readiness'
      config:
        operation: 'validate'
        securityValidation: true

    - name: 'bootstrap_validation'
      tool: 'validate_adr_bootstrap'
      config:
        processValidation: true
```

### Quality Gates Integration

```typescript
// Quality gate configuration
interface QualityGate {
  name: string;
  threshold: number;
  blocking: boolean;
  tool: string;
  parameters: Record<string, any>;
}

const qualityGates: QualityGate[] = [
  {
    name: 'ADR Compliance',
    threshold: 80,
    blocking: true,
    tool: 'review_existing_adrs',
    parameters: {
      complianceFramework: 'madr',
      analysisDepth: 'comprehensive',
    },
  },
  {
    name: 'Implementation Progress',
    threshold: 70,
    blocking: false,
    tool: 'compare_adr_progress',
    parameters: {
      trackingMode: 'implementations',
    },
  },
  {
    name: 'Deployment Readiness',
    threshold: 90,
    blocking: true,
    tool: 'deployment_readiness',
    parameters: {
      operation: 'validate',
      securityValidation: true,
    },
  },
];
```

### Automated Reporting

```json
{
  "reporting_config": {
    "frequency": "weekly",
    "recipients": ["architecture-team", "engineering-leads"],
    "format": "dashboard",
    "metrics": [
      "adr_compliance_trend",
      "implementation_velocity",
      "deployment_readiness_score",
      "quality_gate_status"
    ],
    "alerts": {
      "compliance_drop": "immediate",
      "blocked_deployments": "immediate",
      "quality_gate_failures": "daily_digest"
    }
  }
}
```

---

## 📈 Validation Metrics and Analytics

### Key Performance Indicators

```typescript
interface ValidationKPIs {
  adrQuality: {
    averageComplianceScore: number;
    qualityTrend: 'improving' | 'stable' | 'declining';
    completenessRate: number;
  };

  implementationVelocity: {
    averageImplementationTime: number; // days
    velocityTrend: 'increasing' | 'stable' | 'decreasing';
    blockerFrequency: number;
  };

  deploymentReadiness: {
    averageReadinessScore: number;
    deploymentSuccessRate: number;
    criticalIssueFrequency: number;
  };

  processMaturity: {
    bootstrapComplianceScore: number;
    processAdherence: number;
    toolingEffectiveness: number;
  };
}
```

### Trend Analysis

```json
{
  "trend_analysis": {
    "timeframe": "last_6_months",
    "metrics": {
      "adr_creation_rate": {
        "current": 2.5,
        "previous": 1.8,
        "trend": "increasing"
      },
      "compliance_score": {
        "current": 85,
        "previous": 78,
        "trend": "improving"
      },
      "implementation_rate": {
        "current": 72,
        "previous": 68,
        "trend": "stable"
      }
    }
  }
}
```

---

## 🔗 Related Documentation

- **[Analysis Tools](analysis-tools.md)** - Project analysis for validation context
- **[Generation Tools](generation-tools.md)** - Content generation with validation
- **[Security Tools](security-tools.md)** - Security-focused validation
- **[Troubleshooting](.../how-to-guides/troubleshooting.md)** - Validation troubleshooting

---

**Need help with validation tools?** → **[Deployment Readiness Guide](.../how-to-guides/deployment-readiness.md)** or **[File an Issue](https://github.com/tosin2013/mcp-adr-analysis-server/issues)**
