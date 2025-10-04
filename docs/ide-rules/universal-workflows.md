# 🔄 Universal Workflows for Software Development Optimization

**Complete workflows for every development scenario using MCP ADR Analysis Server**

This guide provides comprehensive, step-by-step workflows that can be used in any IDE environment to optimize software development using all 31+ tools available in the MCP ADR Analysis Server.

## 📋 Workflow Index

### 🎯 **Quick Start Workflows (5-15 minutes)**
- [Quick Project Health Check](#quick-project-health-check)
- [Immediate Security Scan](#immediate-security-scan)
- [Deployment Readiness Check](#deployment-readiness-check)

### 🏗️ **Core Project Workflows (30-60 minutes)**
- [New Project Setup](#new-project-setup)
- [Existing Project Analysis](#existing-project-analysis) 
- [PRD to Implementation](#prd-to-implementation)
- [TDD to Deployment Workflow](#tdd-to-deployment-workflow)
- [Continuous Health Monitoring Loop](#continuous-health-monitoring-loop)

### 🔍 **Specialized Workflows (60-120 minutes)**
- [Security & Compliance Audit](#security-compliance-audit)
- [Legacy Modernization](#legacy-modernization)
- [Architecture Review & Documentation](#architecture-review-documentation)
- [Research New Features and Update ADRs](#research-new-features-and-update-adrs)
- [Automated Lint Resolution & CI Integration](#automated-lint-resolution--ci-integration)
- [GitHub Actions Generation from Deployment Requirements](#github-actions-generation-from-deployment-requirements)

### 🚀 **Advanced Workflows (2+ hours)**
- [Complete Development Lifecycle](#complete-development-lifecycle)
- [Enterprise Architecture Management](#enterprise-architecture-management)

---

## ⚡ Quick Start Workflows

### Quick Project Health Check
**Duration**: 5-10 minutes | **Goal**: Immediate project insights

#### Step 1: Get Intelligent Workflow Guidance
```
Tool: get_workflow_guidance
Parameters: {
  "goal": "quick project health assessment",
  "projectContext": "existing_project",
  "timeframe": "quick_analysis",
  "primaryConcerns": ["maintainability", "security"]
}
```
**Expected Output**: Recommended tool sequence and priority areas

#### Step 2: Analyze Project Ecosystem
```
Tool: analyze_project_ecosystem
Parameters: {
  "analysisDepth": "basic",
  "enhancedMode": true,
  "includeEnvironment": true
}
```
**Expected Output**: Technology stack, patterns, and immediate recommendations

#### Step 3: Quick Security Check
```
Tool: analyze_content_security
Parameters: {
  "contentType": "general"
}
```
**Expected Output**: Sensitive data detection and immediate security concerns

**Sophia Confidence Score**: 90% - This workflow provides reliable first insights with minimal time investment.

---

### Immediate Security Scan
**Duration**: 10-15 minutes | **Goal**: Comprehensive security assessment

#### Step 1: Content Security Analysis
```
Tool: analyze_content_security
Parameters: {
  "contentType": "code",
  "userDefinedPatterns": ["API_KEY", "PASSWORD", "SECRET"]
}
```

#### Step 2: Generate Content Masking
```
Tool: generate_content_masking
Parameters: {
  "maskingStrategy": "full"
}
```

#### Step 3: Configure Custom Security Patterns
```
Tool: configure_custom_patterns
Parameters: {
  "projectPath": "."
}
```

**Verification**: Use `validate_content_masking` to ensure security measures are effective.

---

### Deployment Readiness Check  
**Duration**: 15-20 minutes | **Goal**: Human-guided zero-tolerance deployment validation with TODO integration

#### Step 1: Human Context Assessment
**Interactive Checkpoint**: Gather human perspective on deployment readiness

**Human Feedback Prompts**:
- "What's your confidence level for this deployment (1-10)?"
- "Are there any manual testing steps completed?"
- "Any known issues or concerns about this release?"
- "Is the team ready for deployment support?"

#### Step 2: Check Deployment Readiness with Human Input
```
Tool: deployment_readiness
Parameters: {
  "operation": "check_readiness",
  "strictMode": true,
  "blockOnFailingTests": true,
  "targetEnvironment": "production",
  "integrateTodoTasks": true,
  "updateHealthScoring": true
}
```

#### Step 3: Update TODO Tasks Based on Findings
```
Tool: manage_todo_json
Parameters: {
  "operation": "get_tasks",
  "filters": {
    "tags": ["deployment", "blocker", "critical"],
    "status": "pending"
  },
  "sortBy": "priority"
}
```

#### Step 4: Create Deployment Blocking Tasks (If Issues Found)
```
Tool: manage_todo_json
Parameters: {
  "operation": "create_task",
  "title": "Fix deployment blocker: [Issue Description]",
  "priority": "critical",
  "tags": ["deployment-blocker", "urgent"],
  "dueDate": "[Today]"
}
```
**Conditional**: Only execute if deployment readiness check fails

#### Step 5: Update Health Scores Pre-Deployment
```
Tool: smart_score
Parameters: {
  "operation": "sync_scores",
  "projectPath": ".",
  "todoPath": "TODO.md",
  "triggerTools": ["manage_todo", "validate_rules"],
  "rebalanceWeights": false
}
```

#### Step 6: Smart Git Push Validation (Human Approved)
```
Tool: smart_git_push
Parameters: {
  "dryRun": true,
  "testResults": {
    "success": true,
    "testsRun": 0,
    "testsPassed": 0,
    "testsFailed": 0
  },
  "checkDeploymentReadiness": true,
  "targetEnvironment": "production"
}
```
**Requirement**: Human approval rating ≥8/10 required before execution

#### Step 7: Post-Check Health Dashboard Update
```
Tool: smart_score
Parameters: {
  "operation": "get_score_trends",
  "projectPath": "."
}
```
**Expected**: Updated health trends showing deployment readiness progression

**Human-Validated Success Criteria**: 
- ✅ Human confidence rating ≥8/10
- ✅ Zero test failures
- ✅ No mock code in production
- ✅ Security validation passed
- ✅ No deployment blocking TODO tasks
- ✅ Manual testing completed
- ✅ **Health scores reflect deployment readiness**

**Deployment Decision Matrix**:
- **🟢 GREEN (Deploy)**: Human confidence ≥8 + All automated checks pass + Health score ≥80%
- **🟡 YELLOW (Review)**: Human confidence 6-7 + Minor issues identified + Health score 60-79%
- **🔴 RED (Block)**: Human confidence ≤5 OR Critical issues found OR Health score &lt;60%

---

## 🏗️ Core Project Workflows

### New Project Setup
**Duration**: 30-45 minutes | **Goal**: Bootstrap complete architecture from requirements

#### Phase 1: Requirements Analysis (10 minutes)

##### Step 1: Workflow Guidance
```
Tool: get_workflow_guidance
Parameters: {
  "goal": "new project architecture setup from PRD",
  "projectContext": "new_project", 
  "availableAssets": ["PRD.md"],
  "timeframe": "thorough_review"
}
```

##### Step 2: Generate ADRs from PRD
```
Tool: generate_adrs_from_prd
Parameters: {
  "prdPath": "PRD.md",
  "outputDirectory": "./adrs",
  "enhancedMode": true,
  "knowledgeEnhancement": true
}
```

#### Phase 2: Architecture Foundation (15 minutes)

##### Step 3: Analyze Project Ecosystem
```
Tool: analyze_project_ecosystem
Parameters: {
  "analysisDepth": "comprehensive",
  "enhancedMode": true,
  "knowledgeEnhancement": true,
  "learningEnabled": true
}
```

##### Step 4: Generate Implementation TODOs
```
Tool: generate_adr_todo
Parameters: {
  "adrDirectory": "./adrs",
  "todoPath": "TODO.md",
  "phase": "both",
  "includeRules": true
}
```

#### Phase 3: Development Guidance (15 minutes)

##### Step 5: Get Development Guidance
```
Tool: get_development_guidance
Parameters: {
  "developmentPhase": "planning",
  "adrsToImplement": [],
  "technologyStack": [],
  "teamContext": {
    "size": "small_team",
    "experienceLevel": "mixed"
  }
}
```

##### Step 6: Generate Architectural Rules
```
Tool: generate_rules
Parameters: {
  "adrDirectory": "./adrs",
  "source": "adrs",
  "outputFormat": "json"
}
```

**Success Criteria**: Complete ADR set, actionable TODO list, architectural rules established.

---

### Existing Project Analysis
**Duration**: 45-60 minutes | **Goal**: Discover and document implicit architectural decisions

#### Phase 1: Discovery & Assessment (20 minutes)

##### Step 1: Discover Existing ADRs
```
Tool: discover_existing_adrs
Parameters: {
  "adrDirectory": "./adrs",
  "includeContent": true
}
```

##### Step 2: Comprehensive Ecosystem Analysis
```
Tool: analyze_project_ecosystem
Parameters: {
  "analysisDepth": "comprehensive",
  "recursiveDepth": "deep",
  "enhancedMode": true,
  "includeEnvironment": true
}
```

#### Phase 2: Gap Analysis (20 minutes)

##### Step 3: Suggest Missing ADRs
```
Tool: suggest_adrs
Parameters: {
  "analysisType": "comprehensive",
  "enhancedMode": true,
  "learningEnabled": true,
  "knowledgeEnhancement": true
}
```

##### Step 4: Generate Research Questions
```
Tool: generate_research_questions
Parameters: {
  "analysisType": "comprehensive",
  "adrDirectory": "./adrs"
}
```

#### Phase 3: Documentation & Action Planning (20 minutes)

##### Step 5: Generate TODO from ADRs
```
Tool: generate_adr_todo
Parameters: {
  "adrDirectory": "./adrs",
  "preserveExisting": true,
  "linkAdrs": true,
  "includeRules": true
}
```

##### Step 6: Compare Progress vs Reality
```
Tool: compare_adr_progress
Parameters: {
  "adrDirectory": "./adrs",
  "todoPath": "TODO.md",
  "deepCodeAnalysis": true,
  "functionalValidation": true,
  "strictMode": true
}
```

**Sophia Verification Framework**: Compare discovered patterns against industry best practices. Confidence: 85% for implicit decision detection.

---

### PRD to Implementation
**Duration**: 60 minutes | **Goal**: Transform requirements into actionable development plan

#### Phase 1: Requirements Processing (20 minutes)

##### Step 1: Get Workflow Guidance  
```
Tool: get_workflow_guidance
Parameters: {
  "goal": "convert PRD to complete implementation roadmap",
  "projectContext": "new_project",
  "availableAssets": ["PRD.md"],
  "timeframe": "comprehensive_audit"
}
```

##### Step 2: Generate ADRs from PRD
```
Tool: generate_adrs_from_prd
Parameters: {
  "prdPath": "PRD.md",
  "prdType": "web-application",
  "enhancedMode": true,
  "knowledgeEnhancement": true,
  "promptOptimization": true
}
```

#### Phase 2: Architecture Design (20 minutes)

##### Step 3: Ecosystem Analysis & Validation
```
Tool: analyze_project_ecosystem
Parameters: {
  "analysisDepth": "comprehensive",
  "technologyFocus": [],
  "enhancedMode": true
}
```

##### Step 4: Generate Implementation Rules
```
Tool: generate_rules
Parameters: {
  "adrDirectory": "./adrs",
  "source": "both",
  "outputFormat": "both"
}
```

#### Phase 3: Implementation Planning (20 minutes)

##### Step 5: Create Implementation TODOs
```
Tool: generate_adr_todo
Parameters: {
  "adrDirectory": "./adrs",
  "phase": "both",
  "includeRules": true,
  "linkAdrs": true
}
```

##### Step 6: Development Guidance
```
Tool: get_development_guidance
Parameters: {
  "developmentPhase": "implementation",
  "adrsToImplement": [],
  "focusAreas": ["API design", "database schema", "testing strategy"]
}
```

**Success Metrics**: Complete architecture documentation, prioritized implementation roadmap, validated technology choices.

### TDD to Deployment Workflow
**Duration**: 45-75 minutes | **Goal**: Complete test-driven development cycle with production deployment
**Confidence Level**: 95% for established projects, 85% for new implementations

#### Phase 1: Test-Driven Foundation (25 minutes)

##### Step 1: Get TDD Development Guidance
```
Tool: get_development_guidance
Parameters: {
  "developmentPhase": "planning",
  "focusAreas": ["testing strategy", "TDD implementation", "deployment pipeline"],
  "teamContext": {
    "experienceLevel": "mixed",
    "size": "small_team"
  }
}
```
**Sophia Note**: Confidence 90% - Establishes systematic TDD approach with team-appropriate guidance

##### Step 2: Generate TDD-Focused TODO Tasks
```
Tool: generate_adr_todo
Parameters: {
  "adrDirectory": "./adrs",
  "phase": "test",
  "includeRules": true,
  "linkAdrs": true,
  "preserveExisting": true
}
```
**Expected Output**: Test-first implementation tasks with clear acceptance criteria

##### Step 3: Create Rule Set for TDD Compliance
```
Tool: generate_rules
Parameters: {
  "adrDirectory": "./adrs",
  "source": "both",
  "outputFormat": "json",
  "existingRules": []
}
```

#### Phase 2: Test Implementation & Validation (25 minutes)

##### Step 4: Validate TDD Implementation Rules
```
Tool: validate_rules
Parameters: {
  "reportFormat": "detailed",
  "validationType": "function",
  "rules": []
}
```
**Sophia Verification**: Check for test-first patterns, coverage thresholds, mock usage guidelines

##### Step 5: Monitor Implementation Progress
```
Tool: manage_todo_json
Parameters: {
  "operation": "get_tasks",
  "filters": {
    "status": "in_progress",
    "tags": ["testing", "tdd"],
    "hasDeadline": false
  },
  "sortBy": "priority"
}
```

##### Step 6: Compare ADR Progress (Reality Check)
```
Tool: compare_adr_progress
Parameters: {
  "todoPath": "TODO.md",
  "adrDirectory": "./adrs",
  "deepCodeAnalysis": true,
  "functionalValidation": true,
  "strictMode": true
}
```
**Critical Check**: Distinguish between mock and production code - Confidence threshold: ≥85%

#### Phase 3: Deployment Readiness & Release (25 minutes)

##### Step 7: Human-Guided Deployment Readiness Assessment
**Interactive Checkpoint**: Human provides current project state assessment

```
Tool: get_workflow_guidance
Parameters: {
  "goal": "assess deployment readiness with human feedback",
  "projectContext": "existing_with_adrs",
  "availableAssets": ["test suite", "codebase", "documentation"],
  "primaryConcerns": ["deployment safety", "test coverage", "production readiness"],
  "timeframe": "quick_analysis"
}
```

**Human Feedback Prompts**:
- "What's the current test coverage percentage?"
- "Are there any known failing tests or pending fixes?"
- "What deployment blockers are you aware of?"
- "Rate your confidence in production readiness (1-10)"

##### Step 8: Update TODO Tasks Based on Human Input
```
Tool: manage_todo_json
Parameters: {
  "operation": "bulk_update",
  "updates": {
    "status": "in_progress",
    "tags": ["deployment-readiness", "human-validated"],
    "notes": "[Human feedback on current state]"
  },
  "filters": {
    "tags": ["deployment", "testing", "production"],
    "status": "pending"
  }
}
```

##### Step 9: Comprehensive Deployment Readiness Check
```
Tool: deployment_readiness
Parameters: {
  "operation": "full_audit",
  "targetEnvironment": "production",
  "strictMode": true,
  "blockOnFailingTests": true,
  "requireTestCoverage": 80,
  "maxTestFailures": 0,
  "allowMockCode": false,
  "integrateTodoTasks": true,
  "updateHealthScoring": true
}
```
**Zero-Tolerance Policy**: No failing tests, no mock code in production deployment

##### Step 10: Create Deployment Blocking Tasks (If Issues Found)
```
Tool: manage_todo_json
Parameters: {
  "operation": "create_task",
  "title": "Fix deployment blocker: [Issue Description]",
  "description": "Critical issue preventing production deployment",
  "priority": "critical",
  "tags": ["deployment-blocker", "urgent", "production"],
  "dueDate": "[Today + 1 day]",
  "assignee": "[Team Lead]"
}
```
**Conditional**: Only execute if deployment readiness check fails

##### Step 11: Human Validation of Deployment Plan
**Interactive Checkpoint**: Human reviews and approves deployment

**Human Validation Questions**:
- "Review deployment readiness report - approve for production? (y/n)"
- "Any additional manual testing required before deployment?"
- "Confirm rollback plan is ready and tested?"
- "Are all stakeholders notified of deployment timing?"

##### Step 12: Smart Git Push with Test Validation
```
Tool: smart_git_push
Parameters: {
  "message": "TDD Implementation: [Feature Name] - All tests passing, human-validated",
  "testResults": {
    "success": true,
    "testsRun": 0,
    "testsPassed": 0,
    "testsFailed": 0,
    "command": "npm test",
    "duration": 0
  },
  "skipSecurity": false,
  "dryRun": false
}
```
**Note**: Include actual test results from your IDE's test runner
**Requirement**: Human approval required before execution

##### Step 13: Generate Deployment Guidance
```
Tool: generate_deployment_guidance
Parameters: {
  "environment": "production",
  "format": "all",
  "includeRollback": true,
  "includeValidation": true,
  "generateFiles": true
}
```

##### Step 14: Update TODO Tasks Post-Deployment
```
Tool: manage_todo_json
Parameters: {
  "operation": "bulk_update",
  "updates": {
    "status": "completed",
    "notes": "Deployment successful - [timestamp and details]"
  },
  "filters": {
    "tags": ["deployment-readiness", "production"],
    "status": "in_progress"
  }
}
```

##### Step 15: Update Project Health Scores Post-Deployment
```
Tool: smart_score
Parameters: {
  "operation": "recalculate_scores",
  "projectPath": ".",
  "components": ["deployment_readiness", "task_completion", "code_quality"],
  "forceUpdate": true,
  "updateSources": true
}
```
**Expected**: Immediate health score update reflecting successful deployment

##### Step 16: Create Post-Deployment Monitoring Tasks with Health Integration
```
Tool: manage_todo_json
Parameters: {
  "operation": "create_task",
  "title": "Monitor production deployment: [Feature Name]",
  "description": "24-hour monitoring of production deployment for stability and performance",
  "priority": "high",
  "tags": ["post-deployment", "monitoring", "production", "health-tracking"],
  "dueDate": "[Today + 1 day]",
  "assignee": "[DevOps Team]",
  "linkedAdrs": ["deployment-related-adrs"],
  "autoComplete": false,
  "completionCriteria": "Production health metrics stable for 24 hours"
}
```

##### Step 17: Initialize Continuous Health Monitoring Loop
```
Tool: smart_score
Parameters: {
  "operation": "sync_scores",
  "projectPath": ".",
  "todoPath": "TODO.md",
  "triggerTools": ["manage_todo", "smart_git_push"],
  "rebalanceWeights": true
}
```
**Integration Note**: This seamlessly transitions to the [Continuous Health Monitoring Loop](#continuous-health-monitoring-loop) for ongoing project tracking

**TDD Success Metrics**: 
- ✅ 100% test coverage for new features
- ✅ All tests passing before deployment
- ✅ Zero mock code in production
- ✅ Human validation and approval obtained
- ✅ Deployment blocking tasks resolved
- ✅ TODO tasks updated throughout process
- ✅ Automated deployment pipeline validated
- ✅ Rollback procedures documented
- ✅ Post-deployment monitoring tasks created
- ✅ **Health scores updated post-deployment**
- ✅ **Continuous health monitoring activated**

**Sophia Human-LLM Confidence Framework**:
- **High Confidence (≥90%)**: Human approval + all automated checks pass → Proceed with deployment
- **Medium Confidence (70-89%)**: Human review required + additional validation → Conditional deployment
- **Low Confidence (&lt;70%)**: Human oversight mandatory + TODO blocking tasks → Stop deployment

**Human Feedback Integration Points**:
1. **Pre-Assessment** (Step 7): Human provides current state context
2. **Deployment Plan Review** (Step 11): Human validates deployment readiness
3. **Final Approval** (Step 12): Human authorizes production deployment
4. **Post-Deployment** (Step 15): Human confirms monitoring setup

**TODO Lifecycle Management**:
- **Discovery**: Identify deployment readiness tasks
- **Tracking**: Update task status based on human feedback
- **Blocking**: Create critical blocking tasks for deployment issues
- **Completion**: Mark deployment tasks as completed
- **Monitoring**: Create post-deployment follow-up tasks

---

## 🔍 Specialized Workflows

### Security & Compliance Audit
**Duration**: 60-90 minutes | **Goal**: Comprehensive security assessment and remediation

#### Phase 1: Security Discovery (30 minutes)

##### Step 1: Comprehensive Content Security Analysis
```
Tool: analyze_content_security
Parameters: {
  "contentType": "code",
  "userDefinedPatterns": [
    "API_KEY", "SECRET_KEY", "PASSWORD", "TOKEN",
    "DATABASE_URL", "PRIVATE_KEY", "AWS_ACCESS_KEY"
  ]
}
```

##### Step 2: Configure Project-Specific Security Patterns
```
Tool: configure_custom_patterns
Parameters: {
  "projectPath": ".",
  "existingPatterns": []
}
```

##### Step 3: Project Ecosystem Security Analysis
```
Tool: analyze_project_ecosystem
Parameters: {
  "analysisScope": ["security"],
  "analysisDepth": "comprehensive",
  "enhancedMode": true
}
```

#### Phase 2: Security Implementation (30 minutes)

##### Step 4: Generate Content Masking Strategy
```
Tool: generate_content_masking
Parameters: {
  "maskingStrategy": "environment",
  "detectedItems": []
}
```

##### Step 5: Configure Output Masking
```
Tool: configure_output_masking
Parameters: {
  "action": "set",
  "enabled": true,
  "strategy": "full"
}
```

#### Phase 3: Validation & Rules (30 minutes)

##### Step 6: Generate Security Rules
```
Tool: generate_rules
Parameters: {
  "adrDirectory": "./adrs",
  "source": "both",
  "existingRules": []
}
```

##### Step 7: Validate Security Implementation
```
Tool: validate_content_masking
Parameters: {
  "originalContent": "",
  "maskedContent": ""
}
```

##### Step 8: Update Security TODOs
```
Tool: manage_todo_json
Parameters: {
  "operation": "create_task",
  "title": "Security Remediation",
  "priority": "critical",
  "tags": ["security", "compliance"]
}
```

**Critical Security Verification**: Zero exposed credentials, comprehensive masking, enforced security rules.

---

### Legacy Modernization
**Duration**: 90-120 minutes | **Goal**: Systematic legacy system upgrade strategy

#### Phase 1: Legacy Analysis (40 minutes)

##### Step 1: Comprehensive Legacy Assessment
```
Tool: analyze_project_ecosystem
Parameters: {
  "analysisDepth": "comprehensive",
  "recursiveDepth": "comprehensive",
  "enhancedMode": true,
  "knowledgeEnhancement": true
}
```

##### Step 2: Discover Implicit Architectural Decisions
```
Tool: suggest_adrs
Parameters: {
  "analysisType": "comprehensive",
  "enhancedMode": true,
  "learningEnabled": true
}
```

##### Step 3: Generate Modernization Research Questions
```
Tool: generate_research_questions
Parameters: {
  "analysisType": "comprehensive",
  "researchContext": {
    "topic": "legacy modernization",
    "scope": "architecture",
    "objectives": ["performance", "maintainability", "scalability"]
  }
}
```

#### Phase 2: Modernization Planning (40 minutes)

##### Step 4: Create Modernization ADRs
```
Tool: generate_adr_from_decision
Parameters: {
  "decisionData": {
    "title": "Legacy System Modernization Strategy",
    "context": "Aging legacy system requires modernization",
    "decision": "Incremental modernization approach",
    "consequences": "Reduced technical debt, improved maintainability"
  }
}
```

##### Step 5: Generate Migration Rules
```
Tool: generate_rules
Parameters: {
  "adrDirectory": "./adrs",
  "projectPath": ".",
  "source": "both"
}
```

##### Step 6: Create Modernization Roadmap
```
Tool: generate_adr_todo
Parameters: {
  "adrDirectory": "./adrs",
  "phase": "both",
  "includeRules": true,
  "linkAdrs": true
}
```

#### Phase 3: Validation & Implementation (40 minutes)

##### Step 7: Environment Analysis for Migration
```
Tool: analyze_environment
Parameters: {
  "analysisType": "comprehensive",
  "adrDirectory": "./adrs"
}
```

##### Step 8: Deployment Readiness Assessment
```
Tool: deployment_readiness
Parameters: {
  "operation": "full_audit",
  "strictMode": true,
  "targetEnvironment": "staging"
}
```

##### Step 9: Progress Validation
```
Tool: compare_adr_progress
Parameters: {
  "adrDirectory": "./adrs",
  "deepCodeAnalysis": true,
  "strictMode": true,
  "includeRuleValidation": true
}
```

**Modernization Success Criteria**: Documented migration strategy, risk assessment, phased implementation plan, validated deployment pipeline.

---

### Architecture Review & Documentation  
**Duration**: 90 minutes | **Goal**: Comprehensive architecture documentation and governance

#### Phase 1: Architecture Discovery (30 minutes)

##### Step 1: Get Architecture Context
```
Tool: get_architectural_context
Parameters: {
  "includeCompliance": true,
  "conversationContext": {
    "userGoals": ["architecture documentation", "governance"],
    "focusAreas": ["maintainability", "scalability"]
  }
}
```

##### Step 2: Comprehensive Ecosystem Analysis
```
Tool: analyze_project_ecosystem
Parameters: {
  "analysisDepth": "comprehensive",
  "recursiveDepth": "comprehensive",
  "enhancedMode": true,
  "includeEnvironment": true
}
```

#### Phase 2: Documentation Generation (30 minutes)

##### Step 3: Suggest Architecture ADRs
```
Tool: suggest_adrs
Parameters: {
  "analysisType": "comprehensive",
  "enhancedMode": true,
  "knowledgeEnhancement": true
}
```

##### Step 4: Generate Architecture Rules
```
Tool: generate_rules
Parameters: {
  "adrDirectory": "./adrs",
  "source": "both",
  "outputFormat": "both"
}
```

##### Step 5: Create Rule Set
```
Tool: create_rule_set
Parameters: {
  "name": "Architecture Governance Rules",
  "outputFormat": "both"
}
```

#### Phase 3: Governance & Validation (30 minutes)

##### Step 6: Generate Research Questions
```
Tool: generate_research_questions
Parameters: {
  "analysisType": "comprehensive",
  "researchContext": {
    "topic": "architecture governance",
    "scope": "enterprise"
  }
}
```

##### Step 7: Validate Architecture Rules
```
Tool: validate_rules
Parameters: {
  "reportFormat": "detailed",
  "validationType": "module"
}
```

##### Step 8: Create Architecture TODO
```
Tool: manage_todo_json
Parameters: {
  "operation": "import_adr_tasks",
  "adrDirectory": "./adrs",
  "mergeStrategy": "merge"
}
```

**Architecture Governance Success**: Complete documentation, enforced rules, validated compliance, ongoing governance process.

### Research New Features and Update ADRs
**Duration**: 90-120 minutes | **Goal**: Interactive research-driven feature development with human-LLM collaboration
**Confidence Level**: 85% for well-defined research scope, 75% for exploratory research

#### Phase 1: Research Planning & Knowledge Discovery (30 minutes)

##### Step 1: Get Intelligent Research Guidance
```
Tool: get_workflow_guidance
Parameters: {
  "goal": "research new features and update architectural decisions",
  "projectContext": "existing_with_adrs",
  "availableAssets": ["existing ADRs", "codebase", "documentation"],
  "primaryConcerns": ["innovation", "architectural consistency", "technical feasibility"],
  "timeframe": "thorough_review"
}
```
**Sophia Note**: Confidence 90% - Establishes systematic research methodology

##### Step 2: Generate Context-Aware Research Questions
```
Tool: generate_research_questions
Parameters: {
  "analysisType": "comprehensive",
  "adrDirectory": "./adrs",
  "researchContext": {
    "topic": "[FEATURE_NAME]",
    "scope": "feature_development",
    "objectives": ["technical feasibility", "architectural impact", "implementation strategy"],
    "constraints": ["existing architecture", "performance requirements", "security standards"],
    "timeline": "2-4 weeks"
  }
}
```
**Expected Output**: Prioritized research questions with methodology and timelines

##### Step 3: Analyze Current Architecture Context
```
Tool: get_architectural_context
Parameters: {
  "conversationContext": {
    "userGoals": ["feature research", "ADR updates"],
    "focusAreas": ["architecture", "performance", "maintainability"],
    "projectPhase": "planning",
    "humanRequest": "Research [FEATURE_NAME] and update ADRs based on findings"
  }
}
```

#### Phase 2: Interactive Research & Documentation (45 minutes)

##### Step 4: Deep Research with Human Feedback Loop
```
Tool: research_mode
Parameters: {
  "topic": "[FEATURE_NAME] implementation options and architectural implications",
  "currentState": "Initial research phase - analyzing implementation approaches",
  "nextSteps": "Compare technology options, validate architectural fit, gather performance data",
  "previousState": ""
}
```
**Interactive Process**: 
1. LLM conducts initial research
2. Human reviews findings and provides domain expertise
3. LLM incorporates feedback and refines research
4. Iterate until confidence ≥85%

##### Step 5: Create Research Documentation Template
```
Tool: create_research_template
Parameters: {
  "title": "[FEATURE_NAME] Research Findings",
  "category": "feature_analysis",
  "researchPath": "./research"
}
```

##### Step 6: Web-Based Research Enhancement
```
Tool: firecrawl_deep_research
Parameters: {
  "query": "[FEATURE_NAME] best practices, implementation patterns, architectural considerations",
  "maxDepth": 3,
  "maxUrls": 20,
  "timeLimit": 180
}
```
**Verification Step**: Cross-reference findings with existing architectural decisions

#### Phase 3: ADR Integration & Validation (45 minutes)

##### Step 7: Suggest Architecture ADRs from Research
```
Tool: suggest_adrs
Parameters: {
  "analysisType": "comprehensive",
  "enhancedMode": true,
  "knowledgeEnhancement": true,
  "learningEnabled": true,
  "conversationContext": {
    "userGoals": ["document new feature decisions"],
    "focusAreas": ["architecture", "performance", "security"],
    "humanRequest": "Create ADRs based on [FEATURE_NAME] research findings"
  }
}
```

##### Step 8: Human-LLM Collaborative ADR Review
**Interactive Process**:
1. LLM generates draft ADRs based on research
2. Human reviews and provides architectural expertise
3. LLM incorporates feedback and refines ADRs
4. Validate against existing architecture using:

```
Tool: compare_adr_progress
Parameters: {
  "adrDirectory": "./adrs",
  "strictMode": true,
  "functionalValidation": true,
  "includeRuleValidation": true
}
```

##### Step 9: Generate ADR from Final Decision
```
Tool: generate_adr_from_decision
Parameters: {
  "decisionData": {
    "title": "[FEATURE_NAME] Implementation Decision",
    "context": "[Research context and problem statement]",
    "decision": "[Final architectural decision]",
    "alternatives": ["[Alternative approaches considered]"],
    "consequences": "[Expected outcomes and trade-offs]",
    "evidence": ["[Research findings and supporting data]"]
  },
  "templateFormat": "nygard",
  "existingAdrs": []
}
```

##### Step 10: Incorporate Research Findings into ADRs
```
Tool: incorporate_research
Parameters: {
  "analysisType": "generate_updates",
  "adrDirectory": "./adrs",
  "researchPath": "./research",
  "researchFindings": [
    {
      "finding": "[Key research insight]",
      "impact": "[Architectural impact]",
      "evidence": ["[Supporting documentation]"]
    }
  ],
  "updateType": "content"
}
```

##### Step 11: Create Implementation TODO from Research
```
Tool: manage_todo_json
Parameters: {
  "operation": "create_task",
  "title": "Implement [FEATURE_NAME] based on research findings",
  "description": "Implementation task derived from research and ADR decisions",
  "priority": "high",
  "tags": ["research-driven", "feature-development", "adr-based"],
  "linkedAdrs": ["[Generated ADR files]"],
  "intentId": "[Research intent ID]"
}
```

##### Step 12: Final Validation & Knowledge Graph Integration
```
Tool: manage_todo_json
Parameters: {
  "operation": "sync_knowledge_graph",
  "direction": "bidirectional",
  "intentId": "[Research intent ID]"
}
```

**Research Success Metrics**:
- ✅ Comprehensive research questions answered (≥90% coverage)
- ✅ Human-LLM collaboration confidence score ≥85%
- ✅ ADRs updated with research findings and evidence
- ✅ Implementation tasks created with clear acceptance criteria
- ✅ Knowledge graph updated with research insights
- ✅ Research documentation created for future reference

**Sophia Interactive Confidence Framework**:
- **Research Quality Gate**: ≥85% confidence before proceeding to ADR updates
- **Human Feedback Integration**: Required for domain-specific decisions
- **Systematic Verification**: Cross-validation against existing architecture
- **Explicit Limitations**: Acknowledge research scope boundaries

**Human-LLM Collaboration Checkpoints**:
1. **Research Direction Validation** (Step 4): Human confirms research scope and priorities
2. **Technical Feasibility Review** (Step 8): Human validates architectural implications
3. **Final Decision Approval** (Step 9): Human approves ADR content before generation

---

### Automated Lint Resolution & CI Integration
**Duration**: 45-75 minutes | **Goal**: Generate automated lint fix scripts and GitHub Actions for any environment
**Confidence Level**: 95% for script generation, 90% for environment-specific customization

#### Phase 1: Environment & Linting Tool Detection (15 minutes)

##### Step 1: Analyze Project Ecosystem for Linting Tools
```
Tool: analyze_project_ecosystem
Parameters: {
  "analysisDepth": "comprehensive",
  "analysisScope": ["dependencies", "tools", "code_quality"],
  "includeEnvironment": true,
  "conversationContext": {
    "userGoals": ["automated lint resolution", "ci/cd integration"],
    "projectPhase": "development",
    "focusAreas": ["code quality", "automation"]
  }
}
```
**Expected Output**: Detection of ESLint, Prettier, Pylint, RuboCop, Clippy, etc.

##### Step 2: Generate Code Quality Rules Based on Project
```
Tool: generate_rules
Parameters: {
  "adrDirectory": "./adrs",
  "source": "patterns",
  "outputFormat": "json",
  "projectPath": "."
}
```

##### Step 3: Create Baseline TODO Tasks for Lint Resolution
```
Tool: manage_todo_json
Parameters: {
  "operation": "create_task",
  "title": "Setup automated lint resolution pipeline",
  "description": "Establish automated scripts and CI integration for lint fixes",
  "priority": "high",
  "tags": ["automation", "code-quality", "ci-cd", "lint-resolution"],
  "dueDate": "[Today + 3 days]"
}
```

#### Phase 2: Script Generation for Lint Fixes (25 minutes)

##### Step 4: Human Input for Environment Preferences
**Interactive Checkpoint**: Gather human preferences for lint resolution

**Human Feedback Prompts**:
- "Which linting tools should be prioritized? (ESLint, Prettier, Pylint, etc.)"
- "What environments do you deploy to? (Node.js, Python, Ruby, Go, etc.)"
- "Should lint fixes be auto-committed or create PRs? (auto-commit/pr-creation)"
- "Any specific lint rules that should be excluded from auto-fix?"

##### Step 5: Generate Environment-Specific Lint Fix Scripts
```
Tool: write_file
Parameters: {
  "path": "scripts/auto-lint-fix.sh",
  "content": "#!/bin/bash\n# Auto-generated lint resolution script\n# Environment: [Detected from Step 1]\n# Tools: [From human input]\n\nset -e\n\necho \"🔧 Starting automated lint resolution...\"\n\n# Detect project type and run appropriate linters\nif [ -f \"package.json\" ]; then\n  echo \"📦 Node.js project detected\"\n  if [ -f \".eslintrc.js\" ] || [ -f \".eslintrc.json\" ]; then\n    echo \"🔍 Running ESLint fixes...\"\n    npx eslint . --fix --ext .js,.jsx,.ts,.tsx\n  fi\n  if [ -f \".prettierrc\" ] || [ -f \"prettier.config.js\" ]; then\n    echo \"✨ Running Prettier fixes...\"\n    npx prettier --write .\n  fi\nfi\n\nif [ -f \"requirements.txt\" ] || [ -f \"setup.py\" ] || [ -f \"pyproject.toml\" ]; then\n  echo \"🐍 Python project detected\"\n  if command -v black &> /dev/null; then\n    echo \"⚫ Running Black formatter...\"\n    black .\n  fi\n  if command -v isort &> /dev/null; then\n    echo \"📋 Running isort...\"\n    isort .\n  fi\n  if command -v flake8 &> /dev/null; then\n    echo \"🔍 Running flake8 checks...\"\n    flake8 . --count --select=E9,F63,F7,F82 --show-source --statistics\n  fi\nfi\n\nif [ -f \"Gemfile\" ]; then\n  echo \"💎 Ruby project detected\"\n  if command -v rubocop &> /dev/null; then\n    echo \"👮 Running RuboCop fixes...\"\n    rubocop -A\n  fi\nfi\n\nif [ -f \"go.mod\" ]; then\n  echo \"🚀 Go project detected\"\n  echo \"🔧 Running go fmt...\"\n  go fmt ./...\n  if command -v golint &> /dev/null; then\n    echo \"🔍 Running golint...\"\n    golint ./...\n  fi\nfi\n\nif [ -f \"Cargo.toml\" ]; then\n  echo \"🦀 Rust project detected\"\n  echo \"🔧 Running cargo fmt...\"\n  cargo fmt\n  echo \"📎 Running clippy fixes...\"\n  cargo clippy --fix --allow-dirty\nfi\n\necho \"✅ Lint resolution completed!\"\n\n# Update health scores\necho \"📊 Updating project health scores...\"\n# This would integrate with MCP tools if available in CI environment\n\necho \"🎉 Automated lint resolution finished successfully!\""
}
```

##### Step 6: Generate PowerShell Script for Windows Environments
```
Tool: write_file
Parameters: {
  "path": "scripts/auto-lint-fix.ps1",
  "content": "# Auto-generated PowerShell lint resolution script\n# Environment: Cross-platform Windows support\n\nWrite-Host \"🔧 Starting automated lint resolution...\" -ForegroundColor Green\n\ntry {\n    # Node.js projects\n    if (Test-Path \"package.json\") {\n        Write-Host \"📦 Node.js project detected\" -ForegroundColor Yellow\n        \n        if ((Test-Path \".eslintrc.js\") -or (Test-Path \".eslintrc.json\")) {\n            Write-Host \"🔍 Running ESLint fixes...\" -ForegroundColor Cyan\n            npx eslint . --fix --ext .js,.jsx,.ts,.tsx\n        }\n        \n        if ((Test-Path \".prettierrc\") -or (Test-Path \"prettier.config.js\")) {\n            Write-Host \"✨ Running Prettier fixes...\" -ForegroundColor Cyan\n            npx prettier --write .\n        }\n    }\n    \n    # Python projects\n    if ((Test-Path \"requirements.txt\") -or (Test-Path \"setup.py\") -or (Test-Path \"pyproject.toml\")) {\n        Write-Host \"🐍 Python project detected\" -ForegroundColor Yellow\n        \n        if (Get-Command black -ErrorAction SilentlyContinue) {\n            Write-Host \"⚫ Running Black formatter...\" -ForegroundColor Cyan\n            black .\n        }\n        \n        if (Get-Command isort -ErrorAction SilentlyContinue) {\n            Write-Host \"📋 Running isort...\" -ForegroundColor Cyan\n            isort .\n        }\n    }\n    \n    # Additional language support can be added here\n    \n    Write-Host \"✅ Lint resolution completed!\" -ForegroundColor Green\n    \n} catch {\n    Write-Host \"❌ Error during lint resolution: $($_.Exception.Message)\" -ForegroundColor Red\n    exit 1\n}"
}
```

##### Step 7: Create Language-Specific Configuration Templates
```
Tool: write_file
Parameters: {
  "path": "scripts/lint-configs/.eslintrc.template.json",
  "content": "{\n  \"extends\": [\n    \"eslint:recommended\",\n    \"@typescript-eslint/recommended\"\n  ],\n  \"parser\": \"@typescript-eslint/parser\",\n  \"plugins\": [\"@typescript-eslint\"],\n  \"rules\": {\n    \"no-console\": \"warn\",\n    \"no-unused-vars\": \"error\",\n    \"prefer-const\": \"error\",\n    \"no-var\": \"error\",\n    \"object-shorthand\": \"error\",\n    \"prefer-template\": \"error\"\n  },\n  \"env\": {\n    \"node\": true,\n    \"browser\": true,\n    \"es2022\": true\n  }\n}"
}
```

#### Phase 3: GitHub Actions Workflow Generation (25 minutes)

##### Step 8: Generate Main Lint Resolution GitHub Action
```
Tool: write_file
Parameters: {
  "path": ".github/workflows/auto-lint-resolution.yml",
  "content": "name: 🔧 Automated Lint Resolution\n\non:\n  push:\n    branches: [ main, develop ]\n  pull_request:\n    branches: [ main ]\n  schedule:\n    # Run daily at 2 AM UTC\n    - cron: '0 2 * * *'\n  workflow_dispatch:\n    inputs:\n      force_fix:\n        description: 'Force lint fixes even with conflicts'\n        required: false\n        default: 'false'\n        type: boolean\n\njobs:\n  lint-resolution:\n    runs-on: ubuntu-latest\n    \n    strategy:\n      matrix:\n        # Support multiple environments\n        include:\n          - name: \"Node.js\"\n            setup: \"node\"\n            version: \"18\"\n          - name: \"Python\"\n            setup: \"python\"\n            version: \"3.11\"\n    \n    steps:\n    - name: 📥 Checkout repository\n      uses: actions/checkout@v4\n      with:\n        token: ${{ secrets.GITHUB_TOKEN }}\n        fetch-depth: 0\n    \n    - name: 🔧 Setup ${{ matrix.name }} ${{ matrix.version }}\n      if: matrix.setup == 'node'\n      uses: actions/setup-node@v4\n      with:\n        node-version: ${{ matrix.version }}\n        cache: 'npm'\n    \n    - name: 🐍 Setup Python ${{ matrix.version }}\n      if: matrix.setup == 'python'\n      uses: actions/setup-python@v4\n      with:\n        python-version: ${{ matrix.version }}\n    \n    - name: 📦 Install Node.js dependencies\n      if: matrix.setup == 'node' && hashFiles('package.json') != ''\n      run: |\n        if [ -f \"package-lock.json\" ]; then\n          npm ci\n        elif [ -f \"yarn.lock\" ]; then\n          yarn install --frozen-lockfile\n        else\n          npm install\n        fi\n    \n    - name: 📦 Install Python dependencies\n      if: matrix.setup == 'python' && hashFiles('requirements.txt') != ''\n      run: |\n        python -m pip install --upgrade pip\n        if [ -f \"requirements.txt\" ]; then\n          pip install -r requirements.txt\n        fi\n        pip install black isort flake8 pylint\n    \n    - name: 🔍 Run pre-lint health check\n      run: |\n        echo \"📊 Project health before lint resolution:\"\n        # This would integrate with MCP tools if available\n        echo \"Starting lint resolution process...\"\n    \n    - name: 🔧 Execute automated lint fixes\n      run: |\n        chmod +x scripts/auto-lint-fix.sh\n        ./scripts/auto-lint-fix.sh\n    \n    - name: 📊 Generate lint resolution report\n      run: |\n        echo \"# 🔧 Lint Resolution Report\" > lint-report.md\n        echo \"## Summary\" >> lint-report.md\n        echo \"- **Timestamp**: $(date)\" >> lint-report.md\n        echo \"- **Environment**: ${{ matrix.name }} ${{ matrix.version }}\" >> lint-report.md\n        \n        # Check for changes\n        if git diff --quiet; then\n          echo \"- **Status**: ✅ No lint issues found\" >> lint-report.md\n        else\n          echo \"- **Status**: 🔧 Lint fixes applied\" >> lint-report.md\n          echo \"## Changes Made\" >> lint-report.md\n          git diff --stat >> lint-report.md\n        fi\n    \n    - name: 📤 Commit lint fixes\n      if: success()\n      run: |\n        git config --local user.email \"action@github.com\"\n        git config --local user.name \"GitHub Action - Lint Resolution\"\n        \n        if ! git diff --quiet; then\n          git add .\n          git commit -m \"🔧 Auto-fix lint issues [skip ci]\n          \n          - Applied automated lint fixes\n          - Environment: ${{ matrix.name }} ${{ matrix.version }}\n          - Triggered by: ${{ github.event_name }}\n          - Timestamp: $(date)\"\n          \n          git push\n          echo \"✅ Lint fixes committed and pushed\"\n        else\n          echo \"✅ No lint issues found - no changes needed\"\n        fi\n    \n    - name: 📋 Upload lint report\n      if: always()\n      uses: actions/upload-artifact@v3\n      with:\n        name: lint-resolution-report-${{ matrix.name }}\n        path: lint-report.md\n    \n    - name: 📊 Update project health metrics\n      if: success()\n      run: |\n        echo \"📈 Updating project health scores after lint resolution\"\n        # This would integrate with MCP health monitoring if available\n        echo \"Lint resolution completed successfully!\""
}
```

##### Step 9: Generate Pull Request Lint Check Action
```
Tool: write_file
Parameters: {
  "path": ".github/workflows/pr-lint-check.yml",
  "content": "name: 🔍 PR Lint Quality Check\n\non:\n  pull_request:\n    types: [opened, synchronize, reopened]\n\njobs:\n  lint-check:\n    runs-on: ubuntu-latest\n    \n    steps:\n    - name: 📥 Checkout PR\n      uses: actions/checkout@v4\n      with:\n        fetch-depth: 0\n    \n    - name: 🔧 Setup Node.js\n      if: hashFiles('package.json') != ''\n      uses: actions/setup-node@v4\n      with:\n        node-version: '18'\n        cache: 'npm'\n    \n    - name: 📦 Install dependencies\n      if: hashFiles('package.json') != ''\n      run: npm ci\n    \n    - name: 🔍 Run lint checks (report only)\n      run: |\n        echo \"🔍 Running lint quality assessment...\"\n        \n        # Initialize counters\n        TOTAL_ISSUES=0\n        FIXABLE_ISSUES=0\n        \n        # Node.js/TypeScript linting\n        if [ -f \"package.json\" ] && ([ -f \".eslintrc.js\" ] || [ -f \".eslintrc.json\" ]); then\n          echo \"📦 Checking ESLint issues...\"\n          ESLINT_ISSUES=$(npx eslint . --format=json --ext .js,.jsx,.ts,.tsx | jq '[.[] | .messages | length] | add // 0')\n          ESLINT_FIXABLE=$(npx eslint . --format=json --ext .js,.jsx,.ts,.tsx | jq '[.[] | .messages[] | select(.fix != null)] | length')\n          \n          TOTAL_ISSUES=$((TOTAL_ISSUES + ESLINT_ISSUES))\n          FIXABLE_ISSUES=$((FIXABLE_ISSUES + ESLINT_FIXABLE))\n          \n          echo \"  - Total ESLint issues: $ESLINT_ISSUES\"\n          echo \"  - Auto-fixable: $ESLINT_FIXABLE\"\n        fi\n        \n        # Generate PR comment\n        echo \"# 🔍 Lint Quality Report\" > pr-comment.md\n        echo \"\" >> pr-comment.md\n        echo \"## Summary\" >> pr-comment.md\n        echo \"- **Total Issues**: $TOTAL_ISSUES\" >> pr-comment.md\n        echo \"- **Auto-Fixable**: $FIXABLE_ISSUES\" >> pr-comment.md\n        echo \"- **Manual Review Required**: $((TOTAL_ISSUES - FIXABLE_ISSUES))\" >> pr-comment.md\n        echo \"\" >> pr-comment.md\n        \n        if [ $TOTAL_ISSUES -eq 0 ]; then\n          echo \"✅ **No lint issues found!** This PR is ready for review.\" >> pr-comment.md\n        elif [ $FIXABLE_ISSUES -eq $TOTAL_ISSUES ]; then\n          echo \"🔧 **All issues are auto-fixable!** The automated lint resolution workflow will fix these.\" >> pr-comment.md\n        else\n          echo \"⚠️ **Manual review required** for some lint issues.\" >> pr-comment.md\n        fi\n        \n        echo \"\" >> pr-comment.md\n        echo \"---\" >> pr-comment.md\n        echo \"*Generated by automated lint quality check*\" >> pr-comment.md\n    \n    - name: 📝 Comment on PR\n      uses: actions/github-script@v7\n      with:\n        script: |\n          const fs = require('fs');\n          const comment = fs.readFileSync('pr-comment.md', 'utf8');\n          \n          github.rest.issues.createComment({\n            issue_number: context.issue.number,\n            owner: context.repo.owner,\n            repo: context.repo.repo,\n            body: comment\n          });"
}
```

##### Step 10: Update TODO Tasks with Generated Automation
```
Tool: manage_todo_json
Parameters: {
  "operation": "bulk_update",
  "updates": {
    "status": "completed",
    "notes": "Automated lint resolution scripts and GitHub Actions generated successfully"
  },
  "filters": {
    "tags": ["automation", "lint-resolution"],
    "status": "pending"
  }
}
```

##### Step 11: Update Health Scores with Automation Integration
```
Tool: smart_score
Parameters: {
  "operation": "recalculate_scores",
  "projectPath": ".",
  "components": ["code_quality", "deployment_readiness"],
  "forceUpdate": true,
  "updateSources": true
}
```

**Lint Resolution Success Criteria**:
- ✅ Environment-specific scripts generated for all detected languages
- ✅ GitHub Actions workflows created for automated execution
- ✅ Cross-platform support (Linux, macOS, Windows)
- ✅ PR quality checks implemented
- ✅ Health monitoring integration active
- ✅ Human preferences incorporated into automation
- ✅ Error handling and reporting included

---

### GitHub Actions Generation from Deployment Requirements
**Duration**: 60-90 minutes | **Goal**: Generate complete CI/CD pipelines based on project ADRs and deployment requirements
**Confidence Level**: 92% for standard deployments, 85% for complex enterprise environments

#### Phase 1: Deployment Requirements Analysis (20 minutes)

##### Step 1: Analyze ADRs for Deployment Architecture
```
Tool: analyze_project_ecosystem
Parameters: {
  "analysisDepth": "comprehensive",
  "analysisScope": ["architecture", "dependencies", "deployment"],
  "includeEnvironment": true,
  "conversationContext": {
    "userGoals": ["ci/cd automation", "deployment pipeline"],
    "projectPhase": "deployment",
    "focusAreas": ["deployment", "automation", "infrastructure"]
  }
}
```

##### Step 2: Generate Deployment Guidance Analysis
```
Tool: generate_deployment_guidance
Parameters: {
  "adrDirectory": "./adrs",
  "environment": "all",
  "format": "structured",
  "includeConfigs": true,
  "includeScripts": true,
  "includeValidation": true,
  "includeRollback": true
}
```

##### Step 3: Human Input for Deployment Preferences
**Interactive Checkpoint**: Gather deployment requirements and preferences

**Human Feedback Prompts**:
- "What deployment environments do you need? (staging, production, preview, etc.)"
- "Which cloud providers? (AWS, Azure, GCP, Vercel, Netlify, self-hosted)"
- "What testing levels are required? (unit, integration, e2e, security, performance)"
- "Any compliance requirements? (SOC2, GDPR, HIPAA, etc.)"
- "Deployment frequency preferences? (continuous, daily, manual approval)"
- "Rollback strategy preferences? (blue-green, canary, rolling)"

##### Step 4: Create Deployment Pipeline TODO Tasks
```
Tool: manage_todo_json
Parameters: {
  "operation": "create_task",
  "title": "Implement CI/CD pipeline based on deployment requirements",
  "description": "Generate and configure GitHub Actions workflows for complete deployment automation",
  "priority": "high",
  "tags": ["ci-cd", "deployment", "automation", "infrastructure"],
  "dueDate": "[Today + 5 days]"
}
```

#### Phase 2: CI/CD Pipeline Generation (35 minutes)

##### Step 5: Generate Main CI/CD Pipeline Workflow
```
Tool: write_file
Parameters: {
  "path": ".github/workflows/ci-cd-pipeline.yml",
  "content": "name: 🚀 CI/CD Pipeline\n\non:\n  push:\n    branches: [ main, develop ]\n  pull_request:\n    branches: [ main ]\n  release:\n    types: [ published ]\n  workflow_dispatch:\n    inputs:\n      environment:\n        description: 'Deployment environment'\n        required: true\n        default: 'staging'\n        type: choice\n        options:\n          - staging\n          - production\n      skip_tests:\n        description: 'Skip test execution'\n        required: false\n        default: false\n        type: boolean\n\nenv:\n  NODE_VERSION: '18'\n  PYTHON_VERSION: '3.11'\n  # Add other environment variables based on analysis\n\njobs:\n  # ==========================================\n  # QUALITY ASSURANCE JOBS\n  # ==========================================\n  \n  code-quality:\n    name: 🔍 Code Quality & Security\n    runs-on: ubuntu-latest\n    \n    steps:\n    - name: 📥 Checkout code\n      uses: actions/checkout@v4\n      with:\n        fetch-depth: 0\n    \n    - name: 🔧 Setup environment\n      uses: actions/setup-node@v4\n      if: hashFiles('package.json') != ''\n      with:\n        node-version: ${{ env.NODE_VERSION }}\n        cache: 'npm'\n    \n    - name: 📦 Install dependencies\n      if: hashFiles('package.json') != ''\n      run: |\n        if [ -f \"package-lock.json\" ]; then\n          npm ci\n        elif [ -f \"yarn.lock\" ]; then\n          yarn install --frozen-lockfile\n        else\n          npm install\n        fi\n    \n    - name: 🔍 Run lint checks\n      if: hashFiles('package.json') != ''\n      run: |\n        if [ -f \".eslintrc.js\" ] || [ -f \".eslintrc.json\" ]; then\n          npm run lint || npx eslint . --ext .js,.jsx,.ts,.tsx\n        fi\n    \n    - name: 🔒 Security audit\n      if: hashFiles('package.json') != ''\n      run: |\n        npm audit --audit-level=high\n        # Additional security scanning based on requirements\n    \n    - name: 📊 Code coverage\n      if: hashFiles('package.json') != ''\n      run: |\n        if grep -q '\"test\"' package.json; then\n          npm run test:coverage || npm test -- --coverage\n        fi\n    \n    outputs:\n      quality-passed: ${{ success() }}\n  \n  unit-tests:\n    name: 🧪 Unit Tests\n    runs-on: ubuntu-latest\n    if: github.event.inputs.skip_tests != 'true'\n    \n    strategy:\n      matrix:\n        # Multi-environment testing based on project analysis\n        node-version: [16, 18, 20]\n    \n    steps:\n    - name: 📥 Checkout code\n      uses: actions/checkout@v4\n    \n    - name: 🔧 Setup Node.js ${{ matrix.node-version }}\n      if: hashFiles('package.json') != ''\n      uses: actions/setup-node@v4\n      with:\n        node-version: ${{ matrix.node-version }}\n        cache: 'npm'\n    \n    - name: 📦 Install dependencies\n      if: hashFiles('package.json') != ''\n      run: npm ci\n    \n    - name: 🧪 Run unit tests\n      if: hashFiles('package.json') != ''\n      run: |\n        if grep -q '\"test\"' package.json; then\n          npm test\n        else\n          echo \"No test script found in package.json\"\n        fi\n    \n    outputs:\n      tests-passed: ${{ success() }}\n  \n  integration-tests:\n    name: 🔗 Integration Tests\n    runs-on: ubuntu-latest\n    needs: [unit-tests]\n    if: needs.unit-tests.outputs.tests-passed == 'true'\n    \n    services:\n      postgres:\n        image: postgres:15\n        env:\n          POSTGRES_PASSWORD: postgres\n          POSTGRES_DB: test_db\n        options: >-\n          --health-cmd pg_isready\n          --health-interval 10s\n          --health-timeout 5s\n          --health-retries 5\n        ports:\n          - 5432:5432\n      \n      redis:\n        image: redis:7\n        options: >-\n          --health-cmd \"redis-cli ping\"\n          --health-interval 10s\n          --health-timeout 5s\n          --health-retries 5\n        ports:\n          - 6379:6379\n    \n    steps:\n    - name: 📥 Checkout code\n      uses: actions/checkout@v4\n    \n    - name: 🔧 Setup environment\n      uses: actions/setup-node@v4\n      if: hashFiles('package.json') != ''\n      with:\n        node-version: ${{ env.NODE_VERSION }}\n        cache: 'npm'\n    \n    - name: 📦 Install dependencies\n      if: hashFiles('package.json') != ''\n      run: npm ci\n    \n    - name: 🗄️ Setup test database\n      run: |\n        # Database migration and seeding based on project requirements\n        echo \"Setting up integration test environment\"\n    \n    - name: 🔗 Run integration tests\n      run: |\n        if grep -q '\"test:integration\"' package.json; then\n          npm run test:integration\n        else\n          echo \"No integration tests configured\"\n        fi\n      env:\n        DATABASE_URL: postgresql://postgres:postgres@localhost:5432/test_db\n        REDIS_URL: redis://localhost:6379\n    \n    outputs:\n      integration-passed: ${{ success() }}\n  \n  # ==========================================\n  # BUILD JOBS\n  # ==========================================\n  \n  build:\n    name: 🏗️ Build Application\n    runs-on: ubuntu-latest\n    needs: [code-quality, unit-tests]\n    if: needs.code-quality.outputs.quality-passed == 'true' && needs.unit-tests.outputs.tests-passed == 'true'\n    \n    steps:\n    - name: 📥 Checkout code\n      uses: actions/checkout@v4\n    \n    - name: 🔧 Setup environment\n      uses: actions/setup-node@v4\n      if: hashFiles('package.json') != ''\n      with:\n        node-version: ${{ env.NODE_VERSION }}\n        cache: 'npm'\n    \n    - name: 📦 Install dependencies\n      if: hashFiles('package.json') != ''\n      run: npm ci\n    \n    - name: 🏗️ Build application\n      run: |\n        if grep -q '\"build\"' package.json; then\n          npm run build\n        else\n          echo \"No build script found - assuming build-less deployment\"\n        fi\n    \n    - name: 📦 Create deployment artifact\n      run: |\n        # Create deployment package based on project type\n        tar -czf deployment-artifact.tar.gz .\n    \n    - name: 📤 Upload build artifacts\n      uses: actions/upload-artifact@v3\n      with:\n        name: deployment-artifact\n        path: deployment-artifact.tar.gz\n        retention-days: 30\n    \n    outputs:\n      build-passed: ${{ success() }}\n  \n  # ==========================================\n  # DEPLOYMENT JOBS\n  # ==========================================\n  \n  deploy-staging:\n    name: 🚀 Deploy to Staging\n    runs-on: ubuntu-latest\n    needs: [build, integration-tests]\n    if: |\n      needs.build.outputs.build-passed == 'true' &&\n      (github.ref == 'refs/heads/develop' || github.event_name == 'workflow_dispatch')\n    \n    environment:\n      name: staging\n      url: ${{ steps.deploy.outputs.url }}\n    \n    steps:\n    - name: 📥 Download artifacts\n      uses: actions/download-artifact@v3\n      with:\n        name: deployment-artifact\n    \n    - name: 🚀 Deploy to staging\n      id: deploy\n      run: |\n        echo \"Deploying to staging environment\"\n        # Deployment commands based on infrastructure analysis\n        # This section would be customized based on deployment target\n        \n        # Example: Vercel deployment\n        # npx vercel --token=${{ secrets.VERCEL_TOKEN }} --prod\n        \n        # Example: AWS deployment\n        # aws s3 sync ./dist s3://${{ secrets.STAGING_BUCKET }}\n        \n        # Example: Docker deployment\n        # docker build -t app:staging .\n        # docker push ${{ secrets.REGISTRY }}/app:staging\n        \n        echo \"url=https://staging.example.com\" >> $GITHUB_OUTPUT\n    \n    - name: 🔍 Health check\n      run: |\n        echo \"Running staging health checks\"\n        # Health check implementation based on application type\n        curl -f ${{ steps.deploy.outputs.url }}/health || exit 1\n    \n    - name: 📊 Update deployment metrics\n      if: success()\n      run: |\n        echo \"📈 Staging deployment successful\"\n        # Integration with health monitoring system\n  \n  deploy-production:\n    name: 🌟 Deploy to Production\n    runs-on: ubuntu-latest\n    needs: [build, integration-tests, deploy-staging]\n    if: |\n      needs.build.outputs.build-passed == 'true' &&\n      (github.ref == 'refs/heads/main' || github.event.inputs.environment == 'production')\n    \n    environment:\n      name: production\n      url: ${{ steps.deploy.outputs.url }}\n    \n    steps:\n    - name: 📥 Download artifacts\n      uses: actions/download-artifact@v3\n      with:\n        name: deployment-artifact\n    \n    - name: 🔒 Production safety checks\n      run: |\n        echo \"Running production safety validations\"\n        # Additional production safety checks\n        # Version validation, rollback preparation, etc.\n    \n    - name: 🌟 Deploy to production\n      id: deploy\n      run: |\n        echo \"Deploying to production environment\"\n        # Production deployment commands\n        \n        echo \"url=https://production.example.com\" >> $GITHUB_OUTPUT\n    \n    - name: 🔍 Production health verification\n      run: |\n        echo \"Running production health verification\"\n        # Comprehensive production health checks\n        curl -f ${{ steps.deploy.outputs.url }}/health || exit 1\n        \n        # Performance validation\n        # Security validation\n        # Integration testing in production\n    \n    - name: 🎉 Deployment success notification\n      if: success()\n      run: |\n        echo \"🎉 Production deployment completed successfully!\"\n        # Notification logic (Slack, email, etc.)\n    \n    - name: 📊 Update production metrics\n      if: always()\n      run: |\n        echo \"📊 Updating production deployment metrics\"\n        # Integration with monitoring and health systems\n  \n  # ==========================================\n  # ROLLBACK JOB\n  # ==========================================\n  \n  rollback:\n    name: ↩️ Rollback Production\n    runs-on: ubuntu-latest\n    if: failure() && github.ref == 'refs/heads/main'\n    needs: [deploy-production]\n    \n    environment:\n      name: production-rollback\n    \n    steps:\n    - name: ↩️ Execute rollback\n      run: |\n        echo \"🚨 Executing production rollback\"\n        # Rollback implementation based on deployment strategy\n        \n    - name: 📊 Log rollback metrics\n      if: always()\n      run: |\n        echo \"📊 Logging rollback event for analysis\"\n        # Rollback metrics and analysis"
}
```

##### Step 6: Generate Environment-Specific Configuration
```
Tool: write_file
Parameters: {
  "path": ".github/workflows/deploy-preview.yml",
  "content": "name: 🔍 Deploy Preview Environment\n\non:\n  pull_request:\n    types: [opened, synchronize, reopened]\n    branches: [ main, develop ]\n\njobs:\n  deploy-preview:\n    name: 🔍 Preview Deployment\n    runs-on: ubuntu-latest\n    if: github.event.pull_request.draft == false\n    \n    environment:\n      name: preview-pr-${{ github.event.number }}\n      url: ${{ steps.deploy.outputs.url }}\n    \n    steps:\n    - name: 📥 Checkout PR\n      uses: actions/checkout@v4\n    \n    - name: 🔧 Setup environment\n      uses: actions/setup-node@v4\n      if: hashFiles('package.json') != ''\n      with:\n        node-version: '18'\n        cache: 'npm'\n    \n    - name: 📦 Install dependencies\n      if: hashFiles('package.json') != ''\n      run: npm ci\n    \n    - name: 🏗️ Build for preview\n      run: |\n        if grep -q '\"build\"' package.json; then\n          npm run build\n        fi\n    \n    - name: 🔍 Deploy preview\n      id: deploy\n      run: |\n        echo \"Deploying preview for PR #${{ github.event.number }}\"\n        # Preview deployment logic based on infrastructure\n        \n        PREVIEW_URL=\"https://pr-${{ github.event.number }}.preview.example.com\"\n        echo \"url=$PREVIEW_URL\" >> $GITHUB_OUTPUT\n    \n    - name: 📝 Comment preview URL\n      uses: actions/github-script@v7\n      with:\n        script: |\n          github.rest.issues.createComment({\n            issue_number: context.issue.number,\n            owner: context.repo.owner,\n            repo: context.repo.repo,\n            body: `## 🔍 Preview Deployment\\n\\n✅ Your preview is ready!\\n\\n**URL**: ${{ steps.deploy.outputs.url }}\\n\\n*This preview will be available until the PR is closed.*`\n          });\n    \n    - name: 🧪 Run preview tests\n      run: |\n        echo \"Running tests against preview environment\"\n        # Preview environment testing\n        curl -f ${{ steps.deploy.outputs.url }} || exit 1"
}
```

##### Step 7: Generate Security and Compliance Workflow
```
Tool: write_file
Parameters: {
  "path": ".github/workflows/security-compliance.yml",
  "content": "name: 🔒 Security & Compliance\n\non:\n  push:\n    branches: [ main, develop ]\n  pull_request:\n    branches: [ main ]\n  schedule:\n    # Run security scans daily at 3 AM UTC\n    - cron: '0 3 * * *'\n  workflow_dispatch:\n\njobs:\n  security-scan:\n    name: 🔒 Security Analysis\n    runs-on: ubuntu-latest\n    \n    steps:\n    - name: 📥 Checkout code\n      uses: actions/checkout@v4\n      with:\n        fetch-depth: 0\n    \n    - name: 🔒 Run Trivy vulnerability scanner\n      uses: aquasecurity/trivy-action@master\n      with:\n        scan-type: 'fs'\n        scan-ref: '.'\n        format: 'sarif'\n        output: 'trivy-results.sarif'\n    \n    - name: 📊 Upload security scan results\n      uses: github/codeql-action/upload-sarif@v2\n      if: always()\n      with:\n        sarif_file: 'trivy-results.sarif'\n    \n    - name: 🔍 Dependency security audit\n      if: hashFiles('package.json') != ''\n      run: |\n        npm audit --audit-level=moderate\n        # Additional dependency scanning\n    \n    - name: 🛡️ Container security scan\n      if: hashFiles('Dockerfile') != ''\n      run: |\n        echo \"Running container security analysis\"\n        # Container-specific security scanning\n    \n    - name: 📋 Generate security report\n      if: always()\n      run: |\n        echo \"# 🔒 Security Scan Report\" > security-report.md\n        echo \"## Summary\" >> security-report.md\n        echo \"- **Scan Date**: $(date)\" >> security-report.md\n        echo \"- **Repository**: ${{ github.repository }}\" >> security-report.md\n        echo \"- **Branch**: ${{ github.ref_name }}\" >> security-report.md\n        \n        if [ -f \"trivy-results.sarif\" ]; then\n          echo \"- **Vulnerabilities Found**: $(jq '.runs[0].results | length' trivy-results.sarif)\" >> security-report.md\n        fi\n    \n    - name: 📤 Upload security report\n      uses: actions/upload-artifact@v3\n      if: always()\n      with:\n        name: security-report\n        path: security-report.md\n  \n  compliance-check:\n    name: 📋 Compliance Validation\n    runs-on: ubuntu-latest\n    \n    steps:\n    - name: 📥 Checkout code\n      uses: actions/checkout@v4\n    \n    - name: 📋 License compliance\n      run: |\n        echo \"Checking license compliance\"\n        # License scanning and compliance validation\n    \n    - name: 📊 Data privacy compliance\n      run: |\n        echo \"Validating data privacy compliance\"\n        # GDPR, CCPA, and other privacy regulation compliance\n    \n    - name: 🔍 Accessibility compliance\n      if: hashFiles('package.json') != ''\n      run: |\n        echo \"Running accessibility compliance checks\"\n        # WCAG and accessibility standards validation\n    \n    - name: 📈 Compliance report\n      run: |\n        echo \"# 📋 Compliance Report\" > compliance-report.md\n        echo \"Generated compliance validation report\"\n    \n    - name: 📤 Upload compliance report\n      uses: actions/upload-artifact@v3\n      if: always()\n      with:\n        name: compliance-report\n        path: compliance-report.md"
}
```

#### Phase 3: Monitoring & Health Integration (25 minutes)

##### Step 8: Generate Deployment Monitoring Workflow
```
Tool: write_file
Parameters: {
  "path": ".github/workflows/deployment-monitoring.yml",
  "content": "name: 📊 Deployment Health Monitoring\n\non:\n  workflow_run:\n    workflows: [\"🚀 CI/CD Pipeline\"]\n    types:\n      - completed\n  schedule:\n    # Monitor every hour during business hours\n    - cron: '0 9-18 * * 1-5'\n  workflow_dispatch:\n    inputs:\n      environment:\n        description: 'Environment to monitor'\n        required: true\n        default: 'production'\n        type: choice\n        options:\n          - staging\n          - production\n          - preview\n\njobs:\n  health-monitoring:\n    name: 📊 Environment Health Check\n    runs-on: ubuntu-latest\n    \n    strategy:\n      matrix:\n        environment: [staging, production]\n    \n    steps:\n    - name: 📥 Checkout monitoring scripts\n      uses: actions/checkout@v4\n    \n    - name: 🔧 Setup monitoring environment\n      run: |\n        echo \"Setting up health monitoring for ${{ matrix.environment }}\"\n    \n    - name: 🏥 Application health check\n      run: |\n        ENVIRONMENT=\"${{ matrix.environment }}\"\n        \n        if [ \"$ENVIRONMENT\" = \"staging\" ]; then\n          BASE_URL=\"https://staging.example.com\"\n        elif [ \"$ENVIRONMENT\" = \"production\" ]; then\n          BASE_URL=\"https://production.example.com\"\n        fi\n        \n        echo \"🔍 Checking health endpoint: $BASE_URL/health\"\n        \n        # Health endpoint validation\n        HEALTH_STATUS=$(curl -s -o /dev/null -w \"%{http_code}\" $BASE_URL/health)\n        \n        if [ \"$HEALTH_STATUS\" = \"200\" ]; then\n          echo \"✅ Health check passed for $ENVIRONMENT\"\n        else\n          echo \"❌ Health check failed for $ENVIRONMENT (HTTP $HEALTH_STATUS)\"\n          exit 1\n        fi\n    \n    - name: 📊 Performance monitoring\n      run: |\n        echo \"📈 Running performance checks for ${{ matrix.environment }}\"\n        # Performance monitoring implementation\n        # Response time validation\n        # Resource usage monitoring\n    \n    - name: 🔒 Security monitoring\n      run: |\n        echo \"🔒 Running security monitoring for ${{ matrix.environment }}\"\n        # Security monitoring implementation\n        # SSL certificate validation\n        # Security header checks\n    \n    - name: 📋 Generate monitoring report\n      if: always()\n      run: |\n        echo \"# 📊 Deployment Health Report\" > monitoring-report-${{ matrix.environment }}.md\n        echo \"## Environment: ${{ matrix.environment }}\" >> monitoring-report-${{ matrix.environment }}.md\n        echo \"- **Timestamp**: $(date)\" >> monitoring-report-${{ matrix.environment }}.md\n        echo \"- **Status**: ${{ job.status }}\" >> monitoring-report-${{ matrix.environment }}.md\n    \n    - name: 📤 Upload monitoring report\n      uses: actions/upload-artifact@v3\n      if: always()\n      with:\n        name: monitoring-report-${{ matrix.environment }}\n        path: monitoring-report-${{ matrix.environment }}.md\n    \n    - name: 🚨 Alert on failure\n      if: failure()\n      run: |\n        echo \"🚨 Health monitoring failed for ${{ matrix.environment }}\"\n        # Alerting logic (Slack, PagerDuty, etc.)\n  \n  metrics-collection:\n    name: 📈 Collect Deployment Metrics\n    runs-on: ubuntu-latest\n    needs: [health-monitoring]\n    if: always()\n    \n    steps:\n    - name: 📊 Aggregate monitoring data\n      run: |\n        echo \"📊 Collecting deployment metrics\"\n        # Metrics aggregation logic\n    \n    - name: 📈 Update project health scores\n      run: |\n        echo \"📈 Updating project health dashboard\"\n        # Integration with MCP health monitoring system\n        # This would call the smart_score tool if available in CI environment"
}
```

##### Step 9: Update TODO Tasks with Generated CI/CD
```
Tool: manage_todo_json
Parameters: {
  "operation": "bulk_update",
  "updates": {
    "status": "completed",
    "notes": "Complete CI/CD pipeline generated with security, monitoring, and health integration"
  },
  "filters": {
    "tags": ["ci-cd", "deployment"],
    "status": "pending"
  }
}
```

##### Step 10: Sync Health Scores with CI/CD Integration
```
Tool: smart_score
Parameters: {
  "operation": "sync_scores",
  "projectPath": ".",
  "todoPath": "TODO.md",
  "triggerTools": ["manage_todo"],
  "rebalanceWeights": true
}
```

##### Step 11: Create Monitoring Integration TODO Tasks
```
Tool: manage_todo_json
Parameters: {
  "operation": "create_task",
  "title": "Configure CI/CD environment secrets and variables",
  "description": "Set up required secrets and environment variables for generated GitHub Actions workflows",
  "priority": "high",
  "tags": ["ci-cd", "configuration", "secrets", "post-generation"],
  "dueDate": "[Today + 2 days]",
  "linkedAdrs": ["deployment-related-adrs"],
  "autoComplete": false,
  "completionCriteria": "All GitHub secrets configured and workflows tested"
}
```

##### Step 12: Final Health Score Update
```
Tool: smart_score
Parameters: {
  "operation": "recalculate_scores",
  "projectPath": ".",
  "components": ["deployment_readiness", "code_quality", "security_posture"],
  "forceUpdate": true,
  "updateSources": true
}
```

**GitHub Actions Generation Success Criteria**:
- ✅ Complete CI/CD pipeline with quality gates generated
- ✅ Environment-specific deployment workflows created
- ✅ Security and compliance automation integrated
- ✅ Preview/staging deployment workflows included
- ✅ Health monitoring and alerting configured
- ✅ Rollback procedures implemented
- ✅ Integration with project health monitoring active
- ✅ Human deployment preferences incorporated
- ✅ Multi-environment support (staging, production, preview)
- ✅ Cross-platform compatibility ensured

**Sophia Confidence Framework for CI/CD Generation**:
- **High Confidence (≥90%)**: Standard web applications with common deployment patterns
- **Medium Confidence (80-89%)**: Complex applications with custom infrastructure requirements
- **Lower Confidence (70-79%)**: Enterprise applications with specialized compliance needs
- **Human Review Required**: Confidence &lt;70% or when dealing with sensitive production environments

---

### Complete Development Lifecycle
**Duration**: 2-3 hours | **Goal**: End-to-end development process optimization

#### Phase 1: Project Initialization (45 minutes)
1. **Workflow Guidance** - Get intelligent recommendations
2. **Ecosystem Analysis** - Comprehensive technology assessment  
3. **ADR Generation** - From requirements or implicit decisions
4. **Security Foundation** - Baseline security configuration

#### Phase 2: Development Planning (45 minutes)
1. **Rule Generation** - Extract architectural constraints
2. **TODO Generation** - Create implementation roadmap
3. **Development Guidance** - Phase-specific implementation strategy
4. **Research Planning** - Identify knowledge gaps

#### Phase 3: Implementation Validation (45 minutes)
1. **Progress Tracking** - Compare TODOs vs reality
2. **Rule Validation** - Ensure architectural compliance
3. **Security Validation** - Continuous security assessment
4. **Deployment Readiness** - Zero-tolerance quality gates

#### Phase 4: Release & Governance (45 minutes)
1. **Smart Git Push** - Intelligent release validation
2. **Deployment Guidance** - Environment-specific procedures
3. **Documentation Updates** - Keep architecture current
4. **Process Improvement** - Reflexion-based learning

**Lifecycle Success Metrics**: Documented architecture, validated quality, secure deployment, continuous improvement.

---

### Enterprise Architecture Management
**Duration**: 3+ hours | **Goal**: Enterprise-scale architecture governance

#### Phase 1: Portfolio Assessment (60 minutes)
- Multi-project ecosystem analysis
- Consistency validation across projects
- Enterprise rule generation
- Compliance assessment

#### Phase 2: Standards Development (60 minutes)  
- Enterprise ADR templates
- Governance rule sets
- Security standards
- Deployment procedures

#### Phase 3: Implementation & Enforcement (60 minutes)
- Automated validation pipelines
- Continuous compliance monitoring
- Architecture evolution tracking
- Knowledge management

#### Phase 4: Continuous Improvement (60 minutes)
- Performance optimization
- Process refinement
- Tool chain evolution
- Team enablement

**Enterprise Success Criteria**: Standardized architecture, automated governance, continuous compliance, scalable processes.

---

## 💡 Workflow Optimization Tips

### 🧠 Sophia Methodology Integration

#### Confidence-Based Progression
- **High Confidence (85%+)**: Proceed immediately with recommendations
- **Medium Confidence (70-84%)**: Validate with additional tools
- **Low Confidence (&lt;70%)**: Seek alternative approaches or human review

#### Error Architecture Awareness
- **Human-Cognitive Errors**: Use AI to supplement domain knowledge gaps
- **AI-Stochastic Errors**: Use human review for critical architectural decisions
- **Verification Loops**: Implement systematic validation at each phase

#### Pragmatic Success Criteria
1. **Works Reliably**: Solutions must function in production
2. **Addresses Constraints**: Consider budget, time, and skill limitations  
3. **Provides Value**: Measurable improvement in development efficiency
4. **Enables Growth**: Scalable architecture and processes

### 🔄 Adaptive Workflow Strategies

#### Time-Based Adaptation
- **5-15 minutes**: Quick health checks and immediate insights
- **30-60 minutes**: Focused problem solving and analysis
- **2+ hours**: Comprehensive transformation and governance

#### Context-Based Adaptation
- **New Projects**: Emphasize planning and foundation building
- **Existing Projects**: Focus on discovery and gap analysis
- **Legacy Systems**: Prioritize risk assessment and migration planning
- **Enterprise Scale**: Emphasize standardization and governance

#### Goal-Based Adaptation
- **Security Focus**: Prioritize security tools and validation
- **Performance Focus**: Emphasize environment analysis and optimization
- **Compliance Focus**: Focus on rule generation and validation
- **Documentation Focus**: Prioritize ADR generation and maintenance

---

## 🎯 Success Measurement Framework

### Immediate Indicators (within session)
✅ **Tool Execution Success** - All tools complete without errors  
✅ **Data Quality** - Comprehensive, relevant analysis results  
✅ **Actionable Outputs** - Clear next steps and recommendations  
✅ **Security Validation** - No exposed sensitive information  

### Progress Milestones (within days)
✅ **Implementation Progress** - TODO items being completed  
✅ **Architecture Clarity** - Documented decisions and rationale  
✅ **Rule Compliance** - Code following architectural constraints  
✅ **Quality Metrics** - Improving test coverage and deployment success  

### Final Outcomes (within weeks)
✅ **Reduced Technical Debt** - Measurable improvement in code quality  
✅ **Faster Development** - Reduced time from decision to implementation  
✅ **Improved Security** - Fewer security issues and faster remediation  
✅ **Better Governance** - Consistent architectural decisions across team  

### Continuous Improvement (ongoing)
✅ **Process Refinement** - Workflow optimization based on outcomes  
✅ **Tool Chain Evolution** - Enhanced tool configurations and sequences  
✅ **Knowledge Growth** - Improved architectural decision making  
✅ **Team Enablement** - Broader adoption of best practices  

---

**Ready to optimize your development workflow?** Choose your scenario and follow the step-by-step instructions. Each workflow is designed to leverage the full power of the MCP ADR Analysis Server while following Sophia's methodological pragmatism principles for reliable, measurable outcomes. 

### Continuous Health Monitoring Loop
**Duration**: 20-30 minutes per cycle | **Goal**: Continuous project health tracking with TODO, file, and deployment monitoring
**Frequency**: Run every 2-4 hours during active development | **Confidence Level**: 95% for automated monitoring, 90% for human-guided decisions

#### **Phase 1: Health Baseline & TODO Discovery (5 minutes)**

##### Step 1: Initialize Project Health Baseline
```
Tool: smart_score
Parameters: {
  "operation": "recalculate_scores",
  "projectPath": ".",
  "components": ["all"],
  "forceUpdate": true,
  "updateSources": true
}
```
**Sophia Framework**: Establishes systematic baseline with 95% confidence for automated components

##### Step 2: Discover and Sync TODO Tasks
```
Tool: manage_todo_json
Parameters: {
  "operation": "get_analytics",
  "projectPath": ".",
  "timeframe": "week",
  "includeVelocity": true,
  "includeScoring": true,
  "sortBy": "priority"
}
```
**Expected Output**: Current task completion metrics, velocity trends, scoring integration

##### Step 3: Generate Health Dashboard Snapshot
```
Tool: smart_score
Parameters: {
  "operation": "diagnose_scores",
  "projectPath": ".",
  "includeHistory": true,
  "checkDataFreshness": true,
  "suggestImprovements": true
}
```

#### **Phase 2: File Change Monitoring & Quality Assessment (8 minutes)**

##### Step 4: Analyze Recent File Changes (Human-Guided Context)
**Interactive Checkpoint**: Gather human perspective on recent changes

**Human Feedback Prompts**:
- "What significant files have you modified since last health check?"
- "Any new dependencies or architectural changes introduced?"
- "Rate your confidence in recent changes (1-10)?"
- "Any known issues or technical debt introduced?"

##### Step 5: File-Level Health Assessment
```
Tool: validate_rules
Parameters: {
  "reportFormat": "detailed",
  "validationType": "file",
  "rules": [],
  "filePath": "[From human input or git status]"
}
```
**Conditional**: Execute for each significant file mentioned by human

##### Step 6: Update TODO Tasks Based on File Changes
```
Tool: manage_todo_json
Parameters: {
  "operation": "create_task",
  "title": "Address quality issues in [filename]",
  "description": "Quality assessment revealed issues requiring attention",
  "priority": "medium",
  "tags": ["code-quality", "health-monitoring", "automated"],
  "linkedAdrs": ["relevant-adr-files"],
  "dueDate": "[Today + 2 days]"
}
```
**Conditional**: Only execute if quality issues found (confidence threshold ≥80%)

##### Step 7: Security Scan on Changed Files
```
Tool: analyze_content_security
Parameters: {
  "content": "[File content from changes]",
  "contentType": "code",
  "userDefinedPatterns": []
}
```

#### **Phase 3: Deployment Readiness & Health Sync (10 minutes)**

##### Step 8: Deployment Readiness Assessment
```
Tool: deployment_readiness
Parameters: {
  "operation": "check_readiness",
  "targetEnvironment": "production",
  "strictMode": true,
  "integrateTodoTasks": true,
  "updateHealthScoring": true,
  "triggerSmartGitPush": false
}
```

##### Step 9: Create Health-Based TODO Tasks
```
Tool: manage_todo_json
Parameters: {
  "operation": "bulk_update",
  "updates": {
    "tags": ["health-monitoring", "automated-creation"],
    "notes": "Generated by continuous health monitoring - [timestamp]"
  },
  "filters": {
    "category": "health-improvement",
    "status": "pending"
  }
}
```

##### Step 10: Cross-Tool Score Synchronization
```
Tool: smart_score
Parameters: {
  "operation": "sync_scores",
  "projectPath": ".",
  "todoPath": "TODO.md",
  "triggerTools": ["manage_todo", "smart_git_push", "validate_rules"],
  "rebalanceWeights": false
}
```

#### **Phase 4: Dashboard Updates & Monitoring Tasks (7 minutes)**

##### Step 11: Generate Health Trends Analysis
```
Tool: smart_score
Parameters: {
  "operation": "get_score_trends",
  "projectPath": "."
}
```

##### Step 12: Create Monitoring TODO Tasks for Next Cycle
```
Tool: manage_todo_json
Parameters: {
  "operation": "create_task",
  "title": "Health Monitoring Cycle - [Next cycle timestamp]",
  "description": "Scheduled health monitoring check for project metrics",
  "priority": "low",
  "tags": ["health-monitoring", "scheduled", "automated"],
  "dueDate": "[Today + 4 hours]",
  "autoComplete": true,
  "completionCriteria": "Health monitoring cycle completed successfully"
}
```

##### Step 13: Update Project Health Dashboard
```
Tool: smart_score
Parameters: {
  "operation": "optimize_weights",
  "projectPath": ".",
  "analysisMode": "current_state",
  "previewOnly": true
}
```

##### Step 14: Human Review & Dashboard Validation
**Interactive Checkpoint**: Human validates health dashboard updates

**Human Validation Questions**:
- "Review health dashboard - does it accurately reflect project state?"
- "Any health metrics that seem incorrect or misleading?"
- "Should any TODO tasks be reprioritized based on health trends?"
- "Confidence in current health assessment (1-10)?"

##### Step 15: Sync Final Health State to Knowledge Graph
```
Tool: manage_todo_json
Parameters: {
  "operation": "sync_knowledge_graph",
  "direction": "bidirectional",
  "intentId": "[Active intent ID if available]",
  "projectPath": "."
}
```

**Continuous Loop Success Criteria**:
- ✅ Health baseline established and tracked
- ✅ TODO tasks synchronized with health metrics
- ✅ File changes assessed for quality impact
- ✅ Deployment readiness continuously monitored
- ✅ Dashboard reflects current project state
- ✅ Human validation ≥8/10 confidence
- ✅ Monitoring tasks created for next cycle

**Health Monitoring Decision Matrix**:
- **🟢 GREEN (Healthy)**: Overall health ≥80% + Human confidence ≥8/10
- **🟡 YELLOW (Watch)**: Overall health 60-79% + Human confidence 6-7/10
- **🔴 RED (Action Needed)**: Overall health &lt;60% OR Human confidence ≤5/10

**Loop Automation Triggers**:
1. **Time-based**: Every 2-4 hours during active development
2. **Event-based**: After significant commits, deployments, or TODO updates
3. **Threshold-based**: When health scores drop below 70%
4. **Human-triggered**: Manual execution when concerns arise

**Sophia Verification Framework**: 
- **Error Detection**: Distinguish between data staleness vs. actual quality degradation
- **Confidence Thresholds**: ≥85% for automated actions, ≥70% for human review triggers
- **Fallibilism**: Acknowledge monitoring limitations and provide alternative verification approaches 