# Getting Started: Workflow & Development Guidance

This guide shows you how to use the new **workflow guidance** and **development guidance** tools to get intelligent recommendations for your specific project goals.

## 🎯 Overview

The MCP ADR Analysis Server now includes two powerful meta-tools that act as intelligent assistants:

- **`get_workflow_guidance`** - Recommends optimal tool sequences based on your goals
- **`get_development_guidance`** - Translates architectural decisions into specific coding tasks

These tools solve the "tool discovery" problem and ensure you follow best practices to achieve your goals efficiently.

## 🚀 Quick Start

### Step 1: Get Workflow Guidance

Start by describing what you want to accomplish:

**Tool Call:**
```
get_workflow_guidance
```

**Parameters:**
```json
{
  "goal": "analyze new project and set up architectural documentation",
  "projectContext": "new_project",
  "availableAssets": ["codebase"],
  "timeframe": "thorough_review",
  "primaryConcerns": ["maintainability", "scalability"]
}
```

**What You Get:**
- 📋 **Recommended Tool Sequence** - Step-by-step workflow
- 🔄 **Alternative Approaches** - Different paths based on constraints
- ⏱️ **Timeline Estimates** - Realistic time expectations
- 📊 **Success Metrics** - How to measure progress
- 💡 **Pro Tips** - Best practices and common pitfalls

### Step 2: Get Development Guidance

Once you have architectural decisions, get specific implementation guidance:

**Tool Call:**
```
get_development_guidance
```

**Parameters:**
```json
{
  "developmentPhase": "implementation",
  "adrsToImplement": ["ADR-001: REST API Design", "ADR-002: Database Schema"],
  "technologyStack": ["TypeScript", "Node.js", "PostgreSQL"],
  "teamContext": {
    "size": "small_team",
    "experienceLevel": "mixed"
  },
  "focusAreas": ["API design", "testing strategy"]
}
```

**What You Get:**
- 🏗️ **Implementation Roadmap** - Phase-by-phase development plan
- 📋 **Specific Coding Tasks** - ADRs translated to actionable tasks
- 🧪 **Testing Strategy** - Comprehensive testing approach
- 📊 **Quality Gates** - Success criteria and checkpoints
- 🚀 **Deployment Guidance** - Environment and deployment strategy

## 📋 Common Scenarios

### Scenario 1: New Project Analysis

**Goal**: Analyze a new React TypeScript project and set up architectural documentation.

```json
{
  "goal": "analyze new project and set up architectural documentation",
  "projectContext": "new_project",
  "availableAssets": ["codebase"],
  "timeframe": "thorough_review"
}
```

**Expected Workflow**:
1. `analyze_project_ecosystem` → Discover technology stack
2. `get_architectural_context` → Generate architectural insights + ADR setup
3. `suggest_adrs` → Get ADR recommendations
4. `generate_adr_from_decision` → Create specific ADRs
5. `get_development_guidance` → Get implementation roadmap

### Scenario 2: Legacy System Modernization

**Goal**: Modernize a legacy codebase with proper architectural documentation.

```json
{
  "goal": "modernize legacy system with architectural documentation",
  "projectContext": "legacy_codebase",
  "availableAssets": ["codebase", "documentation"],
  "timeframe": "comprehensive_audit",
  "primaryConcerns": ["technical_debt", "maintainability", "security"]
}
```

**Expected Workflow**:
1. `analyze_project_ecosystem` → Understand current state
2. `get_architectural_context` → Assess architectural maturity
3. `suggest_adrs` → Identify modernization decisions
4. `generate_rules` → Extract current patterns
5. `get_development_guidance` → Create modernization roadmap

### Scenario 3: Security Audit & Compliance

**Goal**: Perform security audit and implement data protection measures.

```json
{
  "goal": "security audit and data protection implementation",
  "projectContext": "existing_without_adrs",
  "primaryConcerns": ["security", "compliance"],
  "timeframe": "comprehensive_audit"
}
```

**Expected Workflow**:
1. `analyze_content_security` → Identify sensitive data
2. `generate_content_masking` → Create masking strategy
3. `configure_custom_patterns` → Set up security patterns
4. `validate_content_masking` → Verify protection
5. `get_development_guidance` → Implement security measures

### Scenario 4: PRD to Implementation

**Goal**: Convert a Product Requirements Document to a working implementation.

```json
{
  "goal": "convert PRD to implementation plan",
  "projectContext": "greenfield",
  "availableAssets": ["PRD.md"],
  "timeframe": "thorough_review"
}
```

**Expected Workflow**:
1. `generate_adrs_from_prd` → Convert PRD to ADRs
2. `generate_adr_todo` (phase: "both", linkAdrs: true) → Create TDD implementation tasks
3. `get_development_guidance` → Get detailed development plan
4. `compare_adr_progress` → Validate implementation quality and detect mock patterns
5. `analyze_deployment_progress` → Track implementation

## 🔧 Development Guidance Deep Dive

The `get_development_guidance` tool provides phase-specific guidance:

### Planning Phase
```json
{
  "developmentPhase": "planning",
  "technologyStack": ["TypeScript", "React", "Node.js"],
  "teamContext": {"size": "small_team", "experienceLevel": "mixed"}
}
```

**Focus**: Project structure, tooling setup, development workflow

### Implementation Phase
```json
{
  "developmentPhase": "implementation",
  "adrsToImplement": ["ADR-001: API Design"],
  "focusAreas": ["API design", "database schema"]
}
```

**Focus**: Specific coding tasks, design patterns, implementation strategies

### Testing Phase
```json
{
  "developmentPhase": "testing",
  "focusAreas": ["unit testing", "integration testing", "e2e testing"]
}
```

**Focus**: Testing strategies, quality gates, automation setup

### Deployment Phase
```json
{
  "developmentPhase": "deployment",
  "focusAreas": ["CI/CD pipeline", "environment setup", "monitoring"]
}
```

**Focus**: Deployment strategies, environment configuration, monitoring setup

### Validation & Quality Assurance Phase
```json
{
  "developmentPhase": "validation",
  "focusAreas": ["mock detection", "ADR compliance", "production readiness"]
}
```

**Focus**: Implementation validation, mock vs production detection, ADR goal compliance

## 🧪 Enhanced TDD and Validation Workflow

The MCP server now includes sophisticated validation capabilities to ensure high-quality implementations:

### New Validation-Focused Scenarios

#### Scenario 5: TDD Implementation with Validation

**Goal**: Implement ADRs using test-driven development with comprehensive validation.

```json
{
  "goal": "implement ADRs using TDD with quality validation",
  "projectContext": "existing_with_adrs",
  "availableAssets": ["codebase", "ADRs"],
  "timeframe": "thorough_review",
  "primaryConcerns": ["code_quality", "test_coverage", "production_readiness"]
}
```

**Expected Workflow**:
1. `generate_adr_todo` (phase: "test") → Generate test specifications
2. Implement mock tests based on specifications
3. `generate_adr_todo` (phase: "production") → Generate implementation tasks
4. Implement production code to pass tests
5. `compare_adr_progress` (strictMode: true) → Validate against ADR goals and detect mock patterns
6. `get_development_guidance` → Refine implementation based on validation results

#### Scenario 6: Quality Assurance and Mock Detection

**Goal**: Validate existing implementations and detect mock code masquerading as production.

```json
{
  "goal": "validate implementation quality and detect mock patterns",
  "projectContext": "existing_with_adrs",
  "availableAssets": ["codebase", "ADRs", "todo.md"],
  "primaryConcerns": ["production_readiness", "ADR_compliance"]
}
```

**Expected Workflow**:
1. `compare_adr_progress` (deepCodeAnalysis: true) → Comprehensive validation
2. `generate_rules` → Extract architectural rules
3. `validate_rules` → Check rule compliance
4. `get_development_guidance` → Create remediation plan for issues found

### Key Validation Parameters

When using workflow guidance, consider these validation-specific parameters:

```json
{
  "validationRequirements": {
    "mockDetection": true,
    "adrCompliance": true,
    "functionalValidation": true,
    "strictMode": true
  },
  "qualityGates": ["test_coverage", "error_handling", "integration_tests"],
  "productionCriteria": ["real_database_connections", "proper_error_handling", "input_validation"]
}
```

## 💡 Pro Tips

### 1. Start with Workflow Guidance
Always begin with `get_workflow_guidance` to get the optimal tool sequence for your specific situation.

### 2. Be Specific with Goals
The more specific your goal description, the better the recommendations:
- ❌ "analyze project"
- ✅ "analyze React TypeScript project for security vulnerabilities and performance optimization"

### 3. Provide Context
Include your team context and constraints for tailored recommendations:
```json
{
  "teamContext": {
    "size": "solo",
    "experienceLevel": "junior"
  },
  "timeline": "2 weeks to MVP"
}
```

### 4. Use Focus Areas
Specify focus areas to get targeted guidance:
```json
{
  "focusAreas": ["API design", "testing strategy", "deployment pipeline"]
}
```

### 5. Iterate and Refine
Use the guidance as a starting point and refine based on your specific findings and constraints.

### 6. Always Validate Implementation Quality
Include validation steps in every workflow:
```json
{
  "includeValidation": true,
  "validationLevel": "strict",
  "mockDetection": true,
  "adrCompliance": true
}
```

### 7. Use TDD Approach for New Implementations
For new ADR implementations, always use the two-phase TDD approach:
- **Phase 1**: Generate test specifications with `generate_adr_todo` (phase: "test")
- **Phase 2**: Generate implementation tasks with `generate_adr_todo` (phase: "production")
- **Validation**: Use `compare_adr_progress` to ensure production readiness

### 8. Prevent Mock Code in Production
Always run `compare_adr_progress` with `strictMode: true` to prevent common issues:
- Mock implementations being considered production-ready
- Missing error handling and input validation
- Inadequate integration testing
- Configuration issues that prevent real deployment

## 🎯 Success Metrics

Track your progress using the success metrics provided by the tools:

- **Immediate Indicators**: Quick wins and early signals
- **Progress Milestones**: Key checkpoints in your workflow
- **Final Outcomes**: Ultimate success criteria for your goals

## 🔄 Integration with Other Tools

The workflow and development guidance tools work seamlessly with all other MCP tools:

- **Analysis Tools**: `analyze_project_ecosystem`, `get_architectural_context`
- **ADR Tools**: `suggest_adrs`, `generate_adr_from_decision`, `discover_existing_adrs`
- **TDD Tools**: `generate_adr_todo` (enhanced with phase-based approach)
- **Validation Tools**: `compare_adr_progress`, `generate_rules`, `validate_rules`
- **Quality Tools**: `analyze_content_security`, `generate_content_masking`
- **Utility Tools**: `manage_cache`

## 🚀 Next Steps

1. **Try the workflow guidance** with your current project
2. **Follow the recommended tool sequence** 
3. **Use development guidance** to implement architectural decisions
4. **Track progress** using the provided success metrics
5. **Iterate and improve** based on your results

The workflow and development guidance tools transform the MCP server into a complete development lifecycle assistant that guides you from architectural planning all the way through to working code!
