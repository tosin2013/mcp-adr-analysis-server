# 📖 Complete API Reference

**MCP ADR Analysis Server** - All available tools, parameters, and usage examples

> **Version**: 2.0.7 | **Tools**: 37 available | **Updated**: January 2025

---

## 🎯 Quick Navigation

### **Core Analysis Tools**

- [`analyze_project_ecosystem`](#analyze_project_ecosystem) - Comprehensive project analysis
- [`get_architectural_context`](#get_architectural_context) - Architectural context extraction
- [`discover_existing_adrs`](#discover_existing_adrs) - ADR discovery and cataloging

### **ADR Generation & Management**

- [`generate_adrs_from_prd`](#generate_adrs_from_prd) - Generate ADRs from PRD
- [`generate_adr_from_decision`](#generate_adr_from_decision) - Create ADR from decision data
- [`suggest_adrs`](#suggest_adrs) - Suggest missing ADRs
- [`generate_adr_todo`](#generate_adr_todo) - Extract TODO items from ADRs

### **Security & Content Protection**

- [`analyze_content_security`](#analyze_content_security) - Detect sensitive content
- [`generate_content_masking`](#generate_content_masking) - Create masking instructions
- [`apply_basic_content_masking`](#apply_basic_content_masking) - Apply content masking
- [`validate_content_masking`](#validate_content_masking) - Validate masking results

### **Project Health & Scoring**

- [`smart_score`](#smart_score) - Project health scoring coordination
- [`compare_adr_progress`](#compare_adr_progress) - Progress validation
- [`deployment_readiness`](#deployment_readiness) - Deployment readiness check

### **Workflow & Development**

- [`troubleshoot_guided_workflow`](#troubleshoot_guided_workflow) - Systematic troubleshooting
- [`get_workflow_guidance`](#get_workflow_guidance) - Intelligent workflow recommendations
- [`get_development_guidance`](#get_development_guidance) - Development roadmap guidance

### **Research & Documentation**

- [`generate_research_questions`](#generate_research_questions) - Research question generation
- [`create_research_template`](#create_research_template) - Research template creation
- [`incorporate_research`](#incorporate_research) - Integrate research findings

### **Rules & Validation**

- [`generate_rules`](#generate_rules) - Generate architectural rules
- [`validate_rules`](#validate_rules) - Validate code against rules
- [`create_rule_set`](#create_rule_set) - Create machine-readable rules

### **Deployment & Operations**

- [`smart_git_push`](#smart_git_push) - Security-focused git operations
- [`generate_deployment_guidance`](#generate_deployment_guidance) - Deployment instructions
- [`analyze_deployment_progress`](#analyze_deployment_progress) - Deployment progress analysis

### **File Operations**

- [`read_file`](#read_file) - Read file contents
- [`write_file`](#write_file) - Write file contents
- [`list_directory`](#list_directory) - List directory contents

### **System Management**

- [`manage_cache`](#manage_cache) - Cache management operations
- [`configure_output_masking`](#configure_output_masking) - Output masking configuration
- [`check_ai_execution_status`](#check_ai_execution_status) - AI execution status check

---

## 🔧 Core Analysis Tools

### `analyze_project_ecosystem`

**Purpose**: Comprehensive recursive project ecosystem analysis with advanced prompting techniques

**Use Cases**:

- Initial project understanding
- Complete architecture analysis
- Knowledge graph building
- Context establishment for other tools

**Parameters**:

```json
{
  "projectPath": "string (required)",
  "enhancedMode": "boolean (default: false)",
  "knowledgeEnhancement": "boolean (default: false)",
  "learningEnabled": "boolean (default: false)",
  "includeEnvironment": "boolean (default: false)",
  "recursiveDepth": "string (enum: 'shallow'|'medium'|'deep'|'comprehensive', default: 'medium')",
  "conversationContext": "object (optional)",
  "strictMode": "boolean (default: true)"
}
```

**Example Usage**:

```json
{
  "projectPath": ".",
  "enhancedMode": true,
  "knowledgeEnhancement": true,
  "recursiveDepth": "comprehensive",
  "includeEnvironment": true
}
```

**Returns**: Comprehensive project analysis including technology stack, architecture patterns, and recommendations.

---

### `get_architectural_context`

**Purpose**: Get detailed architectural context for specific files or entire project

**Parameters**:

```json
{
  "filePath": "string (optional)",
  "projectPath": "string (optional)",
  "conversationContext": "object (optional)"
}
```

**Example Usage**:

```json
{
  "filePath": "src/components/UserService.ts",
  "projectPath": "."
}
```

---

### `discover_existing_adrs`

**Purpose**: Discover and catalog existing ADRs in the project

**Parameters**:

```json
{
  "adrDirectory": "string (default: 'docs/adrs')",
  "projectPath": "string (optional)",
  "conversationContext": "object (optional)"
}
```

**Example Usage**:

```json
{
  "adrDirectory": "architecture/decisions",
  "projectPath": "."
}
```

---

## 📋 ADR Generation & Management

### `generate_adrs_from_prd`

**Purpose**: Generate Architectural Decision Records from a Product Requirements Document

**Parameters**:

```json
{
  "prdPath": "string (required)",
  "adrDirectory": "string (default: 'docs/adrs')",
  "templateFormat": "string (enum: 'standard'|'y-statements'|'madr', default: 'standard')",
  "projectPath": "string (optional)",
  "conversationContext": "object (optional)"
}
```

**Example Usage**:

```json
{
  "prdPath": "PRD.md",
  "adrDirectory": "docs/decisions",
  "templateFormat": "madr"
}
```

---

### `generate_adr_from_decision`

**Purpose**: Generate a complete ADR from decision data

**Parameters**:

```json
{
  "decisionData": "object (required)",
  "adrDirectory": "string (default: 'docs/adrs')",
  "templateFormat": "string (enum: 'standard'|'y-statements'|'madr', default: 'standard')",
  "conversationContext": "object (optional)"
}
```

**Example Usage**:

```json
{
  "decisionData": {
    "title": "Database Selection",
    "context": "Need to choose primary database",
    "decision": "PostgreSQL",
    "rationale": "ACID compliance and JSON support",
    "consequences": ["Better data integrity", "More complex setup"]
  }
}
```

---

### `suggest_adrs`

**Purpose**: Suggest architectural decisions with advanced prompting techniques

**Parameters**:

```json
{
  "projectPath": "string (optional)",
  "adrDirectory": "string (default: 'docs/adrs')",
  "conversationContext": "object (optional)",
  "analysisScope": "string (enum: 'technology'|'architecture'|'security'|'deployment'|'all', default: 'all')",
  "maxSuggestions": "number (default: 5)"
}
```

---

### `generate_adr_todo`

**Purpose**: Generate TDD-focused todo.md from existing ADRs with JSON-first approach

**Parameters**:

```json
{
  "adrDirectory": "string (default: 'docs/adrs')",
  "todoPath": "string (default: 'TODO.md')",
  "todoFormat": "string (enum: 'markdown'|'json'|'both', default: 'both')",
  "includePriorities": "boolean (default: true)",
  "includeTimestamps": "boolean (default: true)",
  "projectPath": "string (optional)",
  "conversationContext": "object (optional)"
}
```

---

## 🛡️ Security & Content Protection

### `analyze_content_security`

**Purpose**: Analyze content for sensitive information using AI-powered detection

**Parameters**:

```json
{
  "content": "string (required)",
  "contentType": "string (enum: 'code'|'documentation'|'configuration'|'logs'|'general', default: 'general')",
  "userDefinedPatterns": "array of strings (optional)"
}
```

**Example Usage**:

```json
{
  "content": "const apiKey = 'sk-1234567890abcdef';",
  "contentType": "code",
  "userDefinedPatterns": ["custom-secret-.*"]
}
```

---

### `generate_content_masking`

**Purpose**: Generate masking instructions for detected sensitive content

**Parameters**:

```json
{
  "content": "string (required)",
  "detectedItems": "array of objects (required)",
  "maskingStrategy": "string (enum: 'full'|'partial'|'placeholder'|'environment', default: 'full')"
}
```

---

### `apply_basic_content_masking`

**Purpose**: Apply basic content masking (fallback when AI is not available)

**Parameters**:

```json
{
  "content": "string (required)",
  "maskingStrategy": "string (enum: 'full'|'partial'|'placeholder', default: 'full')"
}
```

---

### `validate_content_masking`

**Purpose**: Validate that content masking was applied correctly

**Parameters**:

```json
{
  "originalContent": "string (required)",
  "maskedContent": "string (required)"
}
```

---

### `configure_custom_patterns`

**Purpose**: Configure custom sensitive patterns for a project

**Parameters**:

```json
{
  "projectPath": "string (required)",
  "existingPatterns": "array of strings (optional)"
}
```

---

## 📊 Project Health & Scoring

### `smart_score`

**Purpose**: Central coordination for project health scoring system

**Parameters**:

```json
{
  "operation": "string (enum: 'recalculate_scores'|'sync_scores'|'diagnose_scores'|'optimize_weights'|'reset_scores'|'get_score_trends'|'get_intent_scores', required)",
  "projectPath": "string (optional)",
  "components": "array (enum: 'task_completion'|'deployment_readiness'|'architecture_compliance'|'security_posture'|'code_quality'|'all', default: ['all'])",
  "forceUpdate": "boolean (default: false)",
  "updateSources": "boolean (default: true)"
}
```

**Example Usage**:

```json
{
  "operation": "recalculate_scores",
  "projectPath": ".",
  "components": ["deployment_readiness", "security_posture"],
  "forceUpdate": true
}
```

---

### `compare_adr_progress`

**Purpose**: Compare TODO.md progress against ADRs and current environment

**Parameters**:

```json
{
  "todoPath": "string (default: 'TODO.md')",
  "adrDirectory": "string (default: 'docs/adrs')",
  "projectPath": "string (optional)",
  "includeEnvironmentCheck": "boolean (default: true)",
  "conversationContext": "object (optional)",
  "strictMode": "boolean (default: true)"
}
```

---

### `deployment_readiness`

**Purpose**: Comprehensive deployment readiness analysis with zero-tolerance validation

**Parameters**:

```json
{
  "operation": "string (enum: 'check_readiness'|'validate_tests'|'security_scan'|'dependency_audit'|'all', required)",
  "projectPath": "string (optional)",
  "targetEnvironment": "string (enum: 'development'|'staging'|'production', default: 'production')",
  "strictMode": "boolean (default: true)"
}
```

---

## 🔧 Workflow & Development

### `troubleshoot_guided_workflow`

**Purpose**: Systematic failure analysis with test plan generation

**Parameters**:

```json
{
  "operation": "string (enum: 'analyze_failure'|'generate_test_plan'|'run_diagnostics'|'create_workflow', required)",
  "failureInfo": "object (required for analyze_failure and generate_test_plan)",
  "projectPath": "string (optional)",
  "adrDirectory": "string (default: 'docs/adrs')",
  "todoPath": "string (default: 'TODO.md')",
  "conversationContext": "object (optional)"
}
```

**Example Usage**:

```json
{
  "operation": "analyze_failure",
  "failureInfo": {
    "failureType": "build_failure",
    "failureDetails": "TypeScript compilation errors in authentication module",
    "context": {
      "reproducible": true,
      "impact": "high"
    }
  }
}
```

---

### `get_workflow_guidance`

**Purpose**: Get intelligent workflow guidance and tool recommendations

**Parameters**:

```json
{
  "goal": "string (required)",
  "currentPhase": "string (enum: 'planning'|'development'|'testing'|'deployment', optional)",
  "projectPath": "string (optional)",
  "availableTime": "string (optional)",
  "constraints": "array of strings (optional)",
  "conversationContext": "object (optional)"
}
```

---

### `get_development_guidance`

**Purpose**: Get comprehensive development guidance that translates architectural decisions into coding tasks

**Parameters**:

```json
{
  "developmentPhase": "string (enum: 'setup'|'implementation'|'testing'|'deployment'|'maintenance', required)",
  "projectPath": "string (optional)",
  "adrDirectory": "string (default: 'docs/adrs')",
  "technologyStack": "array of strings (optional)",
  "constraints": "array of strings (optional)",
  "conversationContext": "object (optional)"
}
```

---

## 🔍 Research & Documentation

### `generate_research_questions`

**Purpose**: Generate context-aware research questions and create research tracking system

**Parameters**:

```json
{
  "analysisType": "string (enum: 'technology'|'architecture'|'security'|'performance'|'compliance'|'general', required)",
  "context": "string (optional)",
  "existingKnowledge": "string (optional)",
  "researchScope": "string (enum: 'narrow'|'medium'|'broad', default: 'medium')",
  "maxQuestions": "number (default: 5)",
  "conversationContext": "object (optional)"
}
```

---

### `create_research_template`

**Purpose**: Create a research template file for documenting findings

**Parameters**:

```json
{
  "title": "string (required)",
  "researchType": "string (enum: 'technology'|'architecture'|'security'|'performance'|'compliance'|'general', default: 'general')",
  "templatePath": "string (optional)",
  "includeMetadata": "boolean (default: true)"
}
```

---

### `incorporate_research`

**Purpose**: Incorporate research findings into architectural decisions

**Parameters**:

```json
{
  "researchPath": "string (required)",
  "targetAdr": "string (optional)",
  "adrDirectory": "string (default: 'docs/adrs')",
  "integrationMode": "string (enum: 'update_existing'|'create_new'|'suggest_changes', default: 'suggest_changes')",
  "conversationContext": "object (optional)"
}
```

---

## 📏 Rules & Validation

### `generate_rules`

**Purpose**: Generate architectural rules from ADRs and code patterns

**Parameters**:

```json
{
  "source": "string (enum: 'adrs'|'code'|'both', default: 'both')",
  "adrDirectory": "string (default: 'docs/adrs')",
  "projectPath": "string (optional)",
  "ruleTypes": "array (enum: 'naming'|'structure'|'dependencies'|'patterns'|'security'|'all', default: ['all'])",
  "outputFormat": "string (enum: 'markdown'|'json'|'yaml', default: 'markdown')",
  "conversationContext": "object (optional)"
}
```

---

### `validate_rules`

**Purpose**: Validate code against architectural rules

**Parameters**:

```json
{
  "filePath": "string (optional)",
  "projectPath": "string (optional)",
  "rulesPath": "string (optional)",
  "ruleTypes": "array (enum: 'naming'|'structure'|'dependencies'|'patterns'|'security'|'all', default: ['all'])",
  "outputFormat": "string (enum: 'detailed'|'summary'|'json', default: 'detailed')",
  "conversationContext": "object (optional)"
}
```

---

### `create_rule_set`

**Purpose**: Create machine-readable rule set in JSON/YAML format

**Parameters**:

```json
{
  "name": "string (required)",
  "description": "string (optional)",
  "rules": "array of objects (required)",
  "outputPath": "string (optional)",
  "format": "string (enum: 'json'|'yaml', default: 'json')"
}
```

---

## 🚀 Deployment & Operations

### `smart_git_push`

**Purpose**: AI-driven security-focused git push with credential detection

**Parameters**:

```json
{
  "operation": "string (enum: 'push'|'security_check'|'commit_analysis'|'pre_push_validation', required)",
  "projectPath": "string (optional)",
  "commitMessage": "string (optional)",
  "branch": "string (optional)",
  "forceSecurityCheck": "boolean (default: true)",
  "conversationContext": "object (optional)"
}
```

---

### `generate_deployment_guidance`

**Purpose**: Generate deployment guidance and instructions from ADRs

**Parameters**:

```json
{
  "adrDirectory": "string (default: 'docs/adrs')",
  "targetEnvironment": "string (enum: 'development'|'staging'|'production', required)",
  "deploymentType": "string (enum: 'docker'|'kubernetes'|'serverless'|'traditional'|'auto-detect', default: 'auto-detect')",
  "includeSecurityChecks": "boolean (default: true)",
  "conversationContext": "object (optional)"
}
```

---

### `analyze_deployment_progress`

**Purpose**: Analyze deployment progress and verify completion

**Parameters**:

```json
{
  "analysisType": "string (enum: 'pre_deployment'|'deployment_status'|'post_deployment'|'rollback_analysis', required)",
  "targetEnvironment": "string (enum: 'development'|'staging'|'production', optional)",
  "deploymentId": "string (optional)",
  "projectPath": "string (optional)",
  "conversationContext": "object (optional)"
}
```

---

## 📁 File Operations

### `read_file`

**Purpose**: Read contents of a file

**Parameters**:

```json
{
  "path": "string (required)"
}
```

---

### `write_file`

**Purpose**: Write content to a file

**Parameters**:

```json
{
  "path": "string (required)",
  "content": "string (required)"
}
```

---

### `list_directory`

**Purpose**: List contents of a directory

**Parameters**:

```json
{
  "path": "string (required)"
}
```

---

## ⚙️ System Management

### `manage_cache`

**Purpose**: Manage MCP resource cache operations

**Parameters**:

```json
{
  "action": "string (enum: 'clear'|'stats'|'cleanup'|'invalidate', required)",
  "key": "string (required for invalidate action)"
}
```

---

### `configure_output_masking`

**Purpose**: Configure content masking for all MCP outputs

**Parameters**:

```json
{
  "enabled": "boolean (optional)",
  "maskingLevel": "string (enum: 'basic'|'standard'|'strict', optional)",
  "customPatterns": "array of strings (optional)"
}
```

---

### `check_ai_execution_status`

**Purpose**: Check AI execution configuration and status for debugging

**Parameters**: None required

**Example Usage**:

```json
{}
```

---

### `manage_todo_json`

**Purpose**: JSON-first TODO management with consistent LLM interactions

**Parameters**:

```json
{
  "operation": "string (enum: 'create_task'|'update_task'|'delete_task'|'get_tasks'|'get_analytics'|'sync_to_markdown'|'import_from_markdown'|'get_health_score', required)",
  "projectPath": "string (optional)",
  "todoPath": "string (default: 'TODO.md')",
  "task": "object (optional, for create/update operations)",
  "taskId": "string (optional, for update/delete operations)"
}
```

---

### `analyze_environment`

**Purpose**: Analyze environment context and provide optimization recommendations

**Parameters**:

```json
{
  "projectPath": "string (optional)",
  "environmentType": "string (enum: 'development'|'staging'|'production'|'ci', optional)",
  "includeOptimizations": "boolean (default: true)",
  "conversationContext": "object (optional)"
}
```

---

### `request_action_confirmation`

**Purpose**: Request confirmation before applying research-based changes

**Parameters**:

```json
{
  "action": "string (required)",
  "description": "string (required)",
  "risks": "array of strings (optional)",
  "benefits": "array of strings (optional)"
}
```

---

## 🎯 Common Usage Patterns

### **New Project Setup**

```bash
1. analyze_project_ecosystem (comprehensive analysis)
2. generate_adrs_from_prd (if PRD exists)
3. generate_adr_todo (create implementation tasks)
4. smart_score (establish baseline metrics)
```

### **Existing Project Analysis**

```bash
1. discover_existing_adrs (catalog current decisions)
2. analyze_project_ecosystem (understand current state)
3. suggest_adrs (identify gaps)
4. compare_adr_progress (validate implementation)
```

### **Security Review**

```bash
1. analyze_content_security (scan for sensitive content)
2. generate_content_masking (create protection)
3. smart_git_push (secure deployment)
4. deployment_readiness (final validation)
```

### **Troubleshooting**

```bash
1. troubleshoot_guided_workflow (systematic analysis)
2. check_ai_execution_status (verify AI setup)
3. smart_score (check health metrics)
4. get_workflow_guidance (next steps)
```

---

## 📚 Related Documentation

- **[Getting Started Guides](../getting-started-prd.md)** - Step-by-step usage scenarios
- **[Usage Guide](../USAGE_GUIDE.md)** - Practical examples and workflows
- **[Architecture Overview](../architecture-overview.md)** - Technical architecture details
- **[Troubleshooting Guide](../how-to-guides/troubleshooting.md)** - Common issues and solutions

---

**Last Updated**: January 2025 | **MCP ADR Analysis Server v2.0.7**
