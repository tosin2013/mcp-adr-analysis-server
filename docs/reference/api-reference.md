# 📖 Complete API Reference

**MCP ADR Analysis Server** - All available tools, parameters, and usage examples

> **Version**: 2.1.21 | **Tools**: 59 comprehensive tools | **Updated**: December 2024

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

### **🌐 ADR Aggregator Integration**

- [`sync_to_aggregator`](#sync_to_aggregator) - Sync ADRs to ADR Aggregator platform (Free)
- [`get_adr_context`](#get_adr_context) - Get ADR context from aggregator (Free)
- [`get_staleness_report`](#get_staleness_report) - Get ADR staleness report (Free)
- [`get_adr_templates`](#get_adr_templates) - Get ADR templates by domain (Free)
- [`get_adr_diagrams`](#get_adr_diagrams) - Get Mermaid diagrams (Pro+)
- [`validate_adr_compliance`](#validate_adr_compliance) - Validate ADR compliance (Pro+)
- [`get_knowledge_graph`](#get_knowledge_graph) - Get cross-repository knowledge graph (Team)
- [`update_implementation_status`](#update_implementation_status) - Update ADR implementation status (Pro+)
- [`get_adr_priorities`](#get_adr_priorities) - Get ADR priorities for roadmap planning (Free)
- [`analyze_gaps`](#analyze_gaps) - Analyze gaps between ADRs and code (Free)
- [`get_gaps`](#get_gaps) - Get current gaps from aggregator (Free)

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

- **[Tutorials](../tutorials/01-first-steps.md)** - Step-by-step guides
- **[How-To Guides](../how-to-guides/troubleshooting.md)** - Problem-solving guides
- **[Explanation](../explanation/mcp-concepts.md)** - Conceptual documentation
- **[GitHub Repository](https://github.com/tosin2013/mcp-adr-analysis-server)** - Source code and issues

---

## 🌐 ADR Aggregator Integration Tools

These tools integrate with [ADR Aggregator](https://adraggregator.com) to provide centralized ADR management, cross-repository insights, and team collaboration features.

> **Prerequisites**: Most tools require `ADR_AGGREGATOR_API_KEY` environment variable. Get your API key at [adraggregator.com](https://adraggregator.com).

### Tier Feature Matrix

| Tool                           | Free | Pro+ | Team |
| ------------------------------ | ---- | ---- | ---- |
| `sync_to_aggregator`           | ✅   | ✅   | ✅   |
| `get_adr_context`              | ✅   | ✅   | ✅   |
| `get_staleness_report`         | ✅   | ✅   | ✅   |
| `get_adr_templates`            | ✅   | ✅   | ✅   |
| `get_adr_priorities`           | ✅   | ✅   | ✅   |
| `analyze_gaps`                 | ✅   | ✅   | ✅   |
| `get_gaps`                     | ✅   | ✅   | ✅   |
| `get_adr_diagrams`             | ❌   | ✅   | ✅   |
| `validate_adr_compliance`      | ❌   | ✅   | ✅   |
| `update_implementation_status` | ❌   | ✅   | ✅   |
| `get_knowledge_graph`          | ❌   | ❌   | ✅   |

---

### `sync_to_aggregator`

**Purpose**: Sync local ADRs to ADR Aggregator platform for centralized management

**Tier**: Free (with limits), Pro+, Team

**Use Cases**:

- Push local ADRs to centralized platform
- Enable cross-repository insights
- Track ADR staleness across projects
- Share ADRs with team members

**Parameters**:

```json
{
  "full_sync": "boolean (default: false) - Replace all ADRs instead of incremental",
  "include_metadata": "boolean (default: true) - Include analysis metadata",
  "include_diagrams": "boolean (default: false) - Include Mermaid diagrams (Pro+)",
  "include_timeline": "boolean (default: false) - Include timeline data",
  "include_security_scan": "boolean (default: false) - Include security scan results",
  "include_code_links": "boolean (default: false) - Include AST-based code links (Pro+)",
  "adr_paths": "array (optional) - Specific ADR paths to sync",
  "projectPath": "string (optional) - Project path (defaults to PROJECT_PATH)"
}
```

**Example Usage**:

```json
{
  "full_sync": false,
  "include_metadata": true,
  "include_timeline": true
}
```

**Response Format**:

```markdown
# ADR Aggregator Sync Complete

## Summary

- **Repository:** owner/repo
- **ADRs Synced:** 5
- **Sync ID:** sync_abc123
- **Timestamp:** 2025-01-20T12:00:00Z
- **Tier:** pro

## Synced ADRs

- docs/adrs/001-use-typescript.md (accepted)
- docs/adrs/002-api-design.md (proposed)
```

---

### `get_adr_context`

**Purpose**: Get ADR context from aggregator for AI-assisted analysis

**Tier**: Free

**Parameters**:

```json
{
  "include_diagrams": "boolean (optional) - Include Mermaid diagrams (Pro+)",
  "include_timeline": "boolean (default: true) - Include timeline data",
  "include_code_links": "boolean (optional) - Include code links (Pro+)",
  "include_research": "boolean (optional) - Include research context (Pro+)",
  "staleness_filter": "string (enum: 'all'|'fresh'|'stale'|'very_stale')",
  "graph_depth": "number (optional) - Knowledge graph depth (Team)",
  "projectPath": "string (optional) - Project path"
}
```

**Example Usage**:

```json
{
  "include_timeline": true,
  "staleness_filter": "stale"
}
```

---

### `get_staleness_report`

**Purpose**: Get comprehensive ADR staleness report for governance

**Tier**: Free

**Parameters**:

```json
{
  "threshold": "number (default: 90) - Days threshold for staleness",
  "projectPath": "string (optional) - Project path"
}
```

**Response Format**:

```markdown
# ADR Staleness Report

## Summary

| Status     | Count |
| ---------- | ----- |
| Fresh      | 3     |
| Recent     | 2     |
| Stale      | 1     |
| Very Stale | 0     |

## Governance

- **Review Cycle Compliance:** 85%
- **Overdue Reviews:** 1
```

---

### `get_adr_templates`

**Purpose**: Get domain-specific ADR templates with best practices

**Tier**: Free (no API key required)

**Parameters**:

```json
{
  "domain": "string (optional) - Domain filter (web_application, microservices, api, etc.)"
}
```

**Available Domains**:

- `web_application` - Web application architecture patterns
- `microservices` - Microservices design decisions
- `api` - API design and versioning
- `database` - Database selection and design
- `security` - Security architecture decisions
- `infrastructure` - Infrastructure and DevOps

---

### `get_adr_diagrams`

**Purpose**: Get Mermaid diagrams for ADR visualization

**Tier**: Pro+ required

**Parameters**:

```json
{
  "adr_path": "string (optional) - Specific ADR path",
  "projectPath": "string (optional) - Project path"
}
```

**Response Includes**:

- Workflow diagrams
- Relationship diagrams
- Impact flow diagrams

---

### `validate_adr_compliance`

**Purpose**: Validate ADR compliance with code implementation

**Tier**: Pro+ required

**Parameters**:

```json
{
  "adr_paths": "array (optional) - Specific ADR paths to validate",
  "validation_type": "string (enum: 'implementation'|'architecture'|'security'|'all', default: 'all')",
  "projectPath": "string (optional) - Project path"
}
```

**Response Format**:

```markdown
## ADR Compliance Results

### docs/adrs/001-use-typescript.md

| Metric           | Value        |
| ---------------- | ------------ |
| Compliance Score | **95%**      |
| Status           | ✅ compliant |
| Files Validated  | 12           |

### Findings

- ✅ All TypeScript files follow ADR guidelines
- ⚠️ 2 files using `any` type

### Recommendations

- Review files with `any` usage
```

---

### `get_knowledge_graph`

**Purpose**: Get cross-repository knowledge graph for enterprise insights

**Tier**: Team required

**Parameters**:

```json
{
  "scope": "string (enum: 'repository'|'organization', default: 'repository')",
  "include_analytics": "boolean (default: true) - Include graph analytics",
  "projectPath": "string (optional) - Project path"
}
```

**Response Includes**:

- Graph nodes and relationships
- Cross-repository patterns
- Pattern trends over time
- Most connected ADRs
- Orphan decisions (no links)

---

### `update_implementation_status`

**Purpose**: Update implementation status of synced ADRs

**Tier**: Pro+ required

**Parameters**:

```json
{
  "updates": [
    {
      "adr_path": "string (required) - Path to ADR",
      "implementation_status": "string (enum: 'not_started'|'in_progress'|'implemented'|'deprecated'|'blocked')",
      "notes": "string (optional) - Status change notes"
    }
  ],
  "projectPath": "string (optional) - Project path"
}
```

**Example Usage**:

```json
{
  "updates": [
    {
      "adr_path": "docs/adrs/001-use-typescript.md",
      "implementation_status": "implemented",
      "notes": "Migration completed in v2.0"
    },
    {
      "adr_path": "docs/adrs/002-api-design.md",
      "implementation_status": "in_progress"
    }
  ]
}
```

---

### `get_adr_priorities`

**Purpose**: Get ADR priorities for roadmap and backlog planning

**Tier**: Free

**Parameters**:

```json
{
  "include_ai": "boolean (optional) - Include AI-based priority recommendations",
  "projectPath": "string (optional) - Project path"
}
```

**Response Format**:

```markdown
# ADR Priorities

## Summary

- **Total ADRs:** 5
- **Implemented:** 2
- **In Progress:** 1
- **Not Started:** 2

## Prioritized Roadmap

### 1. Authentication Strategy

- **Priority Score:** 85/100 (AI)
- **Status:** ⏳ not_started
- **Dependencies:** None
- **Gap Count:** 3
```

---

### `analyze_gaps`

**Purpose**: Analyze gaps between ADRs and codebase

**Tier**: Free

**Use Cases**:

- Detect missing file references in ADRs
- Find technologies without ADR coverage
- Identify architectural patterns lacking documentation

**Parameters**:

```json
{
  "projectPath": "string (optional) - Project path",
  "reportToAggregator": "boolean (default: true) - Report gaps to aggregator",
  "includeDismissed": "boolean (default: false) - Include dismissed gaps",
  "scanDirectories": "array (optional) - Directories to scan (default: ['src', 'lib', 'app'])",
  "includePatterns": "array (optional) - File patterns to include",
  "excludePatterns": "array (optional) - File patterns to exclude"
}
```

**Gap Types**:

- **adr_to_code**: File referenced in ADR doesn't exist
- **code_to_adr**: Technology/pattern in code without ADR coverage

**Response Format**:

```markdown
# Gap Analysis Report

## Summary

- **Files Scanned:** 150
- **ADRs Checked:** 5
- **Total Gaps Found:** 3
  - Errors: 1
  - Warnings: 2

## ADR-to-Code Gaps (1)

### ❌ Missing referenced file: src/auth/oauth.ts

- **ADR:** docs/adrs/003-auth-strategy.md
- **Description:** ADR references file that doesn't exist

## Code-to-ADR Gaps (2)

### ⚠️ Undocumented technology: redis

- **Pattern Type:** ioredis usage
- **Suggested ADR Title:** "Caching Strategy with Redis"
```

---

### `get_gaps`

**Purpose**: Get current gaps from ADR Aggregator

**Tier**: Free

**Parameters**:

```json
{
  "projectPath": "string (optional) - Project path",
  "includeDismissed": "boolean (optional) - Include dismissed gaps",
  "includeResolved": "boolean (optional) - Include resolved gaps"
}
```

---

## 📚 Additional Resources

- **[Tutorials](../tutorials/01-first-steps.md)** - Step-by-step guides
- **[How-To Guides](../how-to-guides/troubleshooting.md)** - Problem-solving guides
- **[ADR Aggregator Integration](../how-to-guides/adr-aggregator-integration.md)** - Complete integration guide
- **[Explanation](../explanation/mcp-concepts.md)** - Conceptual documentation
- **[GitHub Repository](https://github.com/tosin2013/mcp-adr-analysis-server)** - Source code and issues

---

_Last updated: January 2025 | Version 2.1.27_
