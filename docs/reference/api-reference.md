# 📖 Complete API Reference

**MCP ADR Analysis Server** - All available tools, parameters, and usage examples

> **Version**: 2.1.11 | **Tools**: 52 comprehensive tools | **Updated**: October 2024

---

## 🎯 Quick Navigation

### **🔍 Core Analysis Tools**

- [`analyze_project_ecosystem`](#analyze_project_ecosystem) - Comprehensive project analysis with AI insights
- [`get_architectural_context`](#get_architectural_context) - Extract architectural context and patterns
- [`discover_existing_adrs`](#discover_existing_adrs) - Discover and catalog existing ADRs
- [`review_existing_adrs`](#review_existing_adrs) - Review ADRs with tree-sitter analysis
- [`analyze_environment`](#analyze_environment) - Environment analysis and containerization detection

### **📝 ADR Generation & Management**

- [`generate_adrs_from_prd`](#generate_adrs_from_prd) - Generate ADRs from Product Requirements Document
- [`generate_adr_from_decision`](#generate_adr_from_decision) - Create ADR from decision data
- [`suggest_adrs`](#suggest_adrs) - Suggest missing ADRs with code analysis
- [`generate_adr_todo`](#generate_adr_todo) - Extract TODO items from ADRs
- [`generate_adr_bootstrap`](#generate_adr_bootstrap) - Bootstrap ADR validation scripts
- [`interactive_adr_planning`](#interactive_adr_planning) - Interactive ADR planning workflow

### **🔒 Security & Content Protection**

- [`analyze_content_security`](#analyze_content_security) - Detect sensitive content with AI
- [`generate_content_masking`](#generate_content_masking) - Create intelligent masking instructions
- [`apply_basic_content_masking`](#apply_basic_content_masking) - Apply content masking patterns
- [`validate_content_masking`](#validate_content_masking) - Validate masking effectiveness
- [`configure_custom_patterns`](#configure_custom_patterns) - Configure custom security patterns

### **📊 Project Health & Deployment**

- [`smart_score`](#smart_score) - AI-powered project health scoring
- [`compare_adr_progress`](#compare_adr_progress) - Compare and validate ADR progress
- [`deployment_readiness`](#deployment_readiness) - Comprehensive deployment readiness analysis
- [`analyze_deployment_progress`](#analyze_deployment_progress) - Analyze deployment progress and blockers
- [`generate_deployment_guidance`](#generate_deployment_guidance) - Generate deployment guidance

### **🛠️ Workflow & Development**

- [`troubleshoot_guided_workflow`](#troubleshoot_guided_workflow) - Systematic troubleshooting workflow
- [`get_workflow_guidance`](#get_workflow_guidance) - Intelligent workflow recommendations
- [`get_development_guidance`](#get_development_guidance) - Development roadmap guidance
- [`tool_chain_orchestrator`](#tool_chain_orchestrator) - Orchestrate multiple tool workflows
- [`smart_git_push`](#smart_git_push) - Intelligent Git operations with validation
- [`smart_git_push_v2`](#smart_git_push_v2) - **NEW**: Security-focused Git push with deployment readiness

### **🔬 Research & Knowledge**

- [`perform_research`](#perform_research) - **NEW**: Answer questions using cascading data sources
- [`generate_research_questions`](#generate_research_questions) - Generate targeted research questions
- [`create_research_template`](#create_research_template) - Create research templates
- [`incorporate_research`](#incorporate_research) - Integrate research findings into ADRs
- [`memory_loading`](#memory_loading) - Load and manage architectural memory

### **⚙️ Rules & Validation**

- [`generate_rules`](#generate_rules) - Generate architectural validation rules
- [`validate_rules`](#validate_rules) - Validate code against architectural rules
- [`create_rule_set`](#create_rule_set) - Create machine-readable rule sets

### **🗂️ File & Cache Management**

- [`read_file`](#read_file) - Read files with security validation
- [`write_file`](#write_file) - Write files with safety checks
- [`list_directory`](#list_directory) - List directory contents securely
- [`manage_cache`](#manage_cache) - Manage analysis cache
- [`manage_todo_json`](#manage_todo_json) - Manage TODO JSON files

### **🔧 Configuration & Utilities**

- [`configure_output_masking`](#configure_output_masking) - Configure output masking
- [`request_action_confirmation`](#request_action_confirmation) - Request user confirmation
- [`check_ai_execution_status`](#check_ai_execution_status) - Check AI execution status
- [`mcp_planning`](#mcp_planning) - MCP server planning and coordination

---

## 🔧 Core Analysis Tools

### `analyze_project_ecosystem`

**Purpose**: Comprehensive recursive project ecosystem analysis with advanced AI prompting techniques

**Use Cases**:

- Initial project understanding and architecture discovery
- Complete technology stack analysis
- Knowledge graph building with architectural insights
- Context establishment for downstream analysis tools

**Parameters**:

```json
{
  "projectPath": "string (required) - Path to project root",
  "enhancedMode": "boolean (default: false) - Enable enhanced analysis",
  "knowledgeEnhancement": "boolean (default: false) - Enable knowledge generation",
  "learningEnabled": "boolean (default: false) - Enable reflexion learning",
  "includeEnvironment": "boolean (default: false) - Include environment analysis",
  "recursiveDepth": "string (enum: 'shallow'|'medium'|'deep'|'comprehensive', default: 'medium')",
  "conversationContext": "object (optional) - Conversation context for continuity",
  "strictMode": "boolean (default: true) - Enable strict validation"
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

**Response Format**:

```json
{
  "status": "success",
  "analysis": {
    "projectOverview": "string",
    "technologies": ["array of detected technologies"],
    "architecturalPatterns": ["array of patterns"],
    "recommendations": ["array of recommendations"],
    "knowledgeGraph": "object (if knowledgeEnhancement enabled)",
    "environmentAnalysis": "object (if includeEnvironment enabled)"
  },
  "metadata": {
    "analysisTime": "number",
    "confidence": "number (0-1)",
    "toolsUsed": ["array of tools"]
  }
}
```

---

### `get_architectural_context`

**Purpose**: Extract architectural context, patterns, and decision history from project

**Parameters**:

```json
{
  "projectPath": "string (required)",
  "includePatterns": "boolean (default: true)",
  "includeDecisions": "boolean (default: true)",
  "contextDepth": "string (enum: 'basic'|'detailed'|'comprehensive', default: 'detailed')"
}
```

---

### `discover_existing_adrs`

**Purpose**: Discover, catalog, and analyze existing Architectural Decision Records

**Parameters**:

```json
{
  "projectPath": "string (required)",
  "adrDirectory": "string (default: './adrs')",
  "includeMetadata": "boolean (default: true)",
  "validateStructure": "boolean (default: true)"
}
```

---

### `review_existing_adrs`

**Purpose**: Review existing ADRs with advanced tree-sitter code analysis

**Parameters**:

```json
{
  "projectPath": "string (required)",
  "adrDirectory": "string (default: './adrs')",
  "includeTreeSitter": "boolean (default: true)",
  "analysisDepth": "string (enum: 'basic'|'detailed'|'comprehensive', default: 'detailed')"
}
```

---

### `analyze_environment`

**Purpose**: Analyze project environment, containerization, and deployment configuration

**Parameters**:

```json
{
  "projectPath": "string (required)",
  "analysisType": "string (enum: 'specs'|'containerization'|'requirements'|'compliance'|'comprehensive', default: 'comprehensive')",
  "knowledgeEnhancement": "boolean (default: true)",
  "enhancedMode": "boolean (default: true)",
  "currentEnvironment": "string (required for compliance analysis)",
  "requirements": "array (required for compliance analysis)"
}
```

---

## 📝 ADR Generation & Management

### `generate_adrs_from_prd`

**Purpose**: Generate comprehensive ADRs from Product Requirements Document

**Parameters**:

```json
{
  "prdContent": "string (required) - PRD content",
  "projectPath": "string (default: '.')",
  "outputDirectory": "string (default: './adrs')",
  "adrTemplate": "string (enum: 'nygard'|'madr'|'custom', default: 'nygard')",
  "includeImplementationPlan": "boolean (default: true)"
}
```

---

### `suggest_adrs`

**Purpose**: Suggest missing ADRs based on code analysis and architectural gaps

**Parameters**:

```json
{
  "projectPath": "string (required)",
  "existingAdrs": "array (optional) - Existing ADR summaries",
  "beforeCode": "string (optional) - Code before changes",
  "afterCode": "string (optional) - Code after changes",
  "enableTreeSitterAnalysis": "boolean (default: false)",
  "analysisDepth": "string (enum: 'basic'|'detailed'|'comprehensive', default: 'detailed')"
}
```

---

### `generate_adr_bootstrap`

**Purpose**: Bootstrap ADR validation scripts and compliance checking

**Parameters**:

```json
{
  "projectPath": "string (required)",
  "adrDirectory": "string (default: './adrs')",
  "enableTreeSitterAnalysis": "boolean (default: false)",
  "validationLevel": "string (enum: 'basic'|'standard'|'strict', default: 'standard')"
}
```

---

## 🔒 Security & Content Protection

### `analyze_content_security`

**Purpose**: Detect sensitive content, secrets, and security vulnerabilities with AI

**Parameters**:

```json
{
  "content": "string (required) - Content to analyze",
  "contentType": "string (optional) - Content type hint",
  "securityLevel": "string (enum: 'basic'|'standard'|'strict', default: 'standard')",
  "enableTreeSitterAnalysis": "boolean (default: false)",
  "customPatterns": "array (optional) - Custom security patterns"
}
```

---

### `generate_content_masking`

**Purpose**: Create intelligent masking instructions for sensitive content

**Parameters**:

```json
{
  "content": "string (required)",
  "securityFindings": "array (required) - Security analysis results",
  "maskingStrategy": "string (enum: 'conservative'|'balanced'|'aggressive', default: 'balanced')",
  "preserveStructure": "boolean (default: true)"
}
```

---

## 📊 Project Health & Deployment

### `smart_score`

**Purpose**: AI-powered comprehensive project health scoring

**Parameters**:

```json
{
  "projectPath": "string (required)",
  "scoringCriteria": "array (optional) - Custom scoring criteria",
  "includeRecommendations": "boolean (default: true)",
  "detailedAnalysis": "boolean (default: false)"
}
```

---

### `deployment_readiness`

**Purpose**: Comprehensive deployment readiness analysis with security validation

**Parameters**:

```json
{
  "projectPath": "string (required)",
  "environment": "string (enum: 'development'|'staging'|'production', default: 'production')",
  "enableTreeSitterAnalysis": "boolean (default: false)",
  "treeSitterLanguages": "array (optional) - Languages to analyze",
  "strictMode": "boolean (default: true)"
}
```

---

## 🛠️ Workflow & Development

### `troubleshoot_guided_workflow`

**Purpose**: Systematic troubleshooting workflow with intelligent guidance

**Parameters**:

```json
{
  "projectPath": "string (required)",
  "issueDescription": "string (required) - Description of the issue",
  "troubleshootingLevel": "string (enum: 'basic'|'intermediate'|'advanced', default: 'intermediate')",
  "includeSystemInfo": "boolean (default: true)"
}
```

---

### `get_workflow_guidance`

**Purpose**: Intelligent workflow recommendations based on project state

**Parameters**:

```json
{
  "projectPath": "string (required)",
  "currentPhase": "string (optional) - Current development phase",
  "teamSize": "number (optional) - Team size",
  "preferences": "object (optional) - Workflow preferences"
}
```

---

### `tool_chain_orchestrator`

**Purpose**: Orchestrate multiple tool workflows for complex analysis tasks

**Parameters**:

```json
{
  "projectPath": "string (required)",
  "workflow": "string (enum: 'full_analysis'|'security_audit'|'deployment_prep'|'custom')",
  "tools": "array (required for custom workflow) - Tools to orchestrate",
  "parallelExecution": "boolean (default: false)"
}
```

---

### `smart_git_push_v2`

**Purpose**: Security-focused Git push with deployment readiness validation and metrics tracking

**Use Cases**:

- Secure git pushes with comprehensive security scanning
- Deployment readiness validation before pushing
- Metrics tracking for deployment success rates
- Prevention of credential leaks and sensitive data exposure
- Repository hygiene enforcement

**Parameters**:

```json
{
  "branch": "string (optional) - Target branch",
  "message": "string (optional) - Commit message",
  "testResults": "object (optional) - Test execution results",
  "skipSecurity": "boolean (optional) - Skip security scanning (default: false)",
  "dryRun": "boolean (optional) - Preview changes without pushing (default: false)",
  "projectPath": "string (optional) - Project path (default: cwd)",
  "forceUnsafe": "boolean (optional) - Force push despite issues (default: false)",
  "humanOverrides": "array (optional) - Human override decisions",
  "requestHumanConfirmation": "boolean (optional) - Request human confirmation",
  "checkDeploymentReadiness": "boolean (optional) - Check deployment readiness (default: false)",
  "targetEnvironment": "string (optional) - Target environment (staging|production|integration)",
  "enforceDeploymentReadiness": "boolean (optional) - Enforce deployment readiness (default: false)",
  "strictDeploymentMode": "boolean (optional) - Strict deployment mode (default: true)"
}
```

**Example Usage**:

```json
{
  "branch": "main",
  "message": "feat: add new authentication system",
  "checkDeploymentReadiness": true,
  "targetEnvironment": "production",
  "strictDeploymentMode": true,
  "testResults": {
    "success": true,
    "testsRun": 25,
    "testsPassed": 25,
    "testsFailed": 0
  }
}
```

**Response Format**:

```json
{
  "content": [
    {
      "type": "text",
      "text": "# Smart Git Push V2 Results\n\n## Security Scan Results\n[security findings]\n\n## Deployment Readiness\n[readiness assessment]\n\n## Push Status\n[push results]\n\n## Metrics Updated\n[deployment metrics]"
    }
  ]
}
```

**Key Features**:

- **Security Scanning**: Detects credentials, secrets, and sensitive data
- **Repository Hygiene**: Blocks irrelevant files (temp, build artifacts)
- **Deployment Readiness**: Validates deployment readiness before pushing
- **Metrics Tracking**: Updates deployment success rates and test results
- **Human Overrides**: Supports human confirmation for edge cases

**Cache Dependencies**:

- **Creates/Updates**: `.mcp-adr-cache/deploy-history.json` (deployment metrics)
- **Uses**: Enhanced sensitive detector for security scanning

**Blocking Conditions**:

- Critical security issues detected
- Failed tests (when `testResults` provided)
- Deployment readiness failures (when enabled)
- Irrelevant files detected (unless overridden)

---

## 🔬 Research & Knowledge

### `perform_research`

**Purpose**: Answer research questions using cascading data sources (project files → knowledge graph → environment → web search)

**Use Cases**:

- Investigate architectural decisions and patterns
- Understand project implementation details
- Research deployment and configuration approaches
- Gather context for ADR creation
- Validate architectural assumptions

**Parameters**:

```json
{
  "question": "string (required) - The research question to investigate",
  "projectPath": "string (optional) - Path to project root (defaults to cwd)",
  "adrDirectory": "string (optional) - ADR directory relative to project (defaults to './adrs')",
  "confidenceThreshold": "number (optional) - Minimum confidence for results (0-1, defaults to 0.6)",
  "performWebSearch": "boolean (optional) - Enable web search as fallback (defaults to true)"
}
```

**Example Usage**:

```json
{
  "question": "What authentication methods are used in this project?",
  "confidenceThreshold": 0.8,
  "performWebSearch": false
}
```

**Response Format**:

```json
{
  "content": [
    {
      "type": "text",
      "text": "# Research Results: [question]\n\n## Summary\n[research findings]\n\n## Confidence Score: [percentage]\n\n## Sources Consulted\n[detailed source information]\n\n## Research Metadata\n[execution details]\n\n## Next Steps\n[recommendations]"
    }
  ]
}
```

**Research Sources** (in order of priority):

1. **📁 Project Files** - Code, configs, documentation
2. **🧠 Knowledge Graph** - ADR relationships and decisions
3. **🔧 Environment Resources** - Live system data (Kubernetes, Docker, etc.)
4. **🌐 Web Search** - External information (fallback only)

**Confidence Scoring**:

- **High (≥80%)**: Reliable answer from project sources
- **Moderate (60-79%)**: Good answer, may need validation
- **Low (&lt;60%)**: Limited information, web search recommended

---

### `generate_research_questions`

**Purpose**: Generate targeted research questions for architectural investigation

**Parameters**:

```json
{
  "projectPath": "string (required)",
  "researchArea": "string (optional) - Specific area of focus",
  "questionCount": "number (default: 10) - Number of questions to generate",
  "complexity": "string (enum: 'basic'|'intermediate'|'advanced', default: 'intermediate')"
}
```

---

### `memory_loading`

**Purpose**: Load and manage architectural memory for knowledge persistence

**Parameters**:

```json
{
  "projectPath": "string (required)",
  "memoryType": "string (enum: 'architectural'|'decisions'|'patterns'|'all', default: 'all')",
  "loadStrategy": "string (enum: 'incremental'|'full'|'selective', default: 'incremental')"
}
```

---

## ⚙️ Rules & Validation

### `generate_rules`

**Purpose**: Generate architectural validation rules from ADRs and patterns

**Parameters**:

```json
{
  "projectPath": "string (required)",
  "adrDirectory": "string (default: './adrs')",
  "ruleTypes": "array (optional) - Types of rules to generate",
  "strictness": "string (enum: 'lenient'|'moderate'|'strict', default: 'moderate')"
}
```

---

### `validate_rules`

**Purpose**: Validate code against architectural rules

**Parameters**:

```json
{
  "projectPath": "string (required)",
  "rules": "array (required) - Rules to validate against",
  "filePatterns": "array (optional) - File patterns to validate",
  "reportFormat": "string (enum: 'summary'|'detailed'|'json', default: 'detailed')"
}
```

---

## 🗂️ File & Cache Management

### `read_file`

**Purpose**: Read files with security validation and content analysis

**Parameters**:

```json
{
  "filePath": "string (required) - Path to file",
  "encoding": "string (default: 'utf8') - File encoding",
  "securityCheck": "boolean (default: true) - Enable security validation"
}
```

---

### `manage_cache`

**Purpose**: Manage analysis cache for performance optimization

**Parameters**:

```json
{
  "operation": "string (enum: 'clear'|'status'|'optimize'|'configure', required)",
  "cacheType": "string (optional) - Specific cache type",
  "maxAge": "number (optional) - Maximum cache age in seconds"
}
```

---

## 🔧 Configuration & Utilities

### `configure_output_masking`

**Purpose**: Configure output masking for sensitive information protection

**Parameters**:

```json
{
  "maskingRules": "array (required) - Masking rules configuration",
  "globalSettings": "object (optional) - Global masking settings",
  "testMode": "boolean (default: false) - Enable test mode"
}
```

---

### `mcp_planning`

**Purpose**: MCP server planning and coordination for complex workflows

**Parameters**:

```json
{
  "projectPath": "string (required)",
  "planningScope": "string (enum: 'project'|'architecture'|'deployment'|'comprehensive', default: 'comprehensive')",
  "includeTimeline": "boolean (default: true)",
  "stakeholders": "array (optional) - Project stakeholders"
}
```

---

## 📋 Response Patterns

### Standard Success Response

```json
{
  "status": "success",
  "data": {
    // Tool-specific response data
  },
  "metadata": {
    "executionTime": "number (milliseconds)",
    "toolVersion": "string",
    "confidence": "number (0-1)",
    "warnings": ["array of warnings"],
    "recommendations": ["array of recommendations"]
  }
}
```

### Error Response

```json
{
  "status": "error",
  "error": {
    "code": "string - Error code",
    "message": "string - Human-readable error message",
    "details": "object - Additional error details",
    "suggestions": ["array of suggested fixes"]
  },
  "metadata": {
    "executionTime": "number",
    "toolVersion": "string"
  }
}
```

---

## 🚀 Getting Started

### Basic Project Analysis

```bash
# Comprehensive project analysis
{
  "tool": "analyze_project_ecosystem",
  "arguments": {
    "projectPath": ".",
    "enhancedMode": true,
    "knowledgeEnhancement": true,
    "recursiveDepth": "comprehensive"
  }
}
```

### Security-First Workflow

```bash
# 1. Analyze content security
{
  "tool": "analyze_content_security",
  "arguments": {
    "content": "your-code-here",
    "securityLevel": "strict"
  }
}

# 2. Generate masking instructions
{
  "tool": "generate_content_masking",
  "arguments": {
    "content": "your-code-here",
    "securityFindings": "results-from-step-1"
  }
}

# 3. Check deployment readiness
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

## 📚 Additional Resources

- **[Tutorials](.../tutorials/01-first-steps.md)** - Step-by-step guides
- **[How-To Guides](.../how-to-guides/troubleshooting.md)** - Problem-solving guides
- **[Explanation](.../explanation/mcp-concepts.md)** - Conceptual documentation
- **[GitHub Repository](https://github.com/tosin2013/mcp-adr-analysis-server)** - Source code and issues

---

_Last updated: September 2025 | Version 2.1.0_
