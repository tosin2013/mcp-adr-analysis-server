# Product Requirements Document: Universal Workflow Runner

## Executive Summary

**Product**: Universal Workflow Runner (UWR)  
**Version**: 1.0  
**Date**: 2025-01-17  
**Owner**: Development Team  
**Primary Integration**: [MCP ADR Analysis Server](https://github.com/tosin2013/mcp-adr-analysis-server.git)

### Core Purpose & Integration Strategy

**Primary Mission**: Extend the MCP ADR Analysis Server's powerful architectural governance capabilities to **any LLM CLI tool** through a universal workflow execution layer.

**Integration Architecture**:
```
LLM CLI (gemini-cli, claude-cli, aider, etc.) 
    ↓ 
Universal Workflow Runner (Local Execution)
    ↓
MCP ADR Analysis Server (Validation & Governance)
```

### Key Integration Benefits

1. **Immediate Productivity**: Execute MCP server workflows locally without server setup
2. **LLM CLI Ecosystem**: Works with **any** LLM CLI tool (gemini-cli, claude-cli, aider, cursor, etc.)
3. **Architectural Governance**: Leverage MCP server's 26+ tools for validation and compliance
4. **Workflow Portability**: Share structured workflows across different AI assistants and IDEs

### Problem Statement
- **MCP Server Dependency**: Powerful workflows require MCP server setup, blocking immediate developer productivity
- **LLM CLI Fragmentation**: 50+ different LLM CLI tools with no standardized workflow execution
- **Governance Gap**: Validation and architectural compliance happen too late in development cycle
- **Workflow Lock-in**: Development patterns tied to specific AI assistants/IDEs

### Solution Overview
A Python-based CLI tool that:
1. **Executes MCP-compatible workflows locally** without external dependencies
2. **Adapts to any LLM CLI tool** (gemini-cli, claude-cli, aider, cursor, etc.)
3. **Integrates with MCP ADR Analysis Server** for post-execution validation and governance
4. **Provides universal interface** for the MCP server's architectural analysis capabilities

### LLM CLI Ecosystem Integration

**Supported LLM CLI Tools**:
- `gemini-cli` - Google's Gemini CLI
- `claude-cli` - Anthropic's Claude CLI  
- `aider` - AI pair programming
- `cursor` - AI-powered code editor
- `github-copilot-cli` - GitHub Copilot CLI
- `codeium-cli` - Codeium CLI
- `tabby-cli` - Tabby CLI
- `ollama` - Local LLM runner
- **Any future LLM CLI tool** through standard tool interface

**Integration Pattern**:
```python
# Universal tool interface for any LLM CLI
def execute_workflow(workflow_name: str, **kwargs) -> dict:
    """Execute MCP-compatible workflow via UWR"""
    result = subprocess.run([
        'uwr', 'run', workflow_name, 
        '--mcp-server=optional',
        '--format=json'
    ], capture_output=True, text=True)
    return json.loads(result.stdout)
```

---

## Product Goals

### Primary Goals
1. **MCP Server Extension**: Extend MCP ADR Analysis Server capabilities to any LLM CLI tool
2. **LLM CLI Ecosystem**: Enable structured workflows across 50+ LLM CLI tools
3. **Immediate Productivity**: Execute MCP-compatible workflows without server setup
4. **Architectural Governance**: Maintain MCP server's validation and compliance capabilities

### Success Metrics
- **LLM CLI Coverage**: Support for 10+ major LLM CLI tools (gemini-cli, claude-cli, aider, etc.)
- **MCP Integration**: 95% compatibility with existing MCP server workflows
- **Ecosystem Adoption**: 100+ developers using across 5+ different LLM CLI environments
- **Productivity**: 40% reduction in workflow setup time
- **Quality**: 90% workflow success rate across environments

---

## User Stories

### Primary Users: Developers Using LLM CLI Tools

#### Story 1: MCP Workflow Execution via LLM CLI
**As a developer using gemini-cli**  
**I want to** execute MCP ADR Analysis Server workflows locally  
**So that I can** get structured architectural analysis without server setup  

**Acceptance Criteria:**
- `gemini-cli "Execute environment validation workflow"` triggers UWR
- UWR executes MCP-compatible workflow and returns structured results
- Results include actionable recommendations and validation status
- Execution completes in <30 seconds for basic workflows

#### Story 2: Cross-LLM CLI Workflow Consistency
**As a team lead**  
**I want to** share the same MCP workflow across gemini-cli, claude-cli, and aider users  
**So that** my team gets consistent architectural governance regardless of AI tool choice  

**Acceptance Criteria:**
- Single workflow definition works across all LLM CLI tools
- Results format is consistent regardless of LLM CLI used
- MCP server validation produces identical governance outcomes
- Team can switch between LLM CLI tools without workflow disruption

#### Story 3: Progressive MCP Server Integration
**As a developer**  
**I want to** validate my local workflow results against MCP server rules  
**So that I can** catch architectural compliance issues early  

**Acceptance Criteria:**
- UWR can optionally connect to MCP server for validation
- Local execution works without server, enhanced validation with server
- MCP server health scores updated based on workflow execution
- TODO tasks automatically created for failed validations

#### Story 4: Workflow Library Access
**As a developer**  
**I want to** access MCP server's workflow library through any LLM CLI  
**So that I can** leverage powerful architectural analysis tools universally  

**Acceptance Criteria:**
- All 26+ MCP server tools available through UWR interface
- Workflow library includes environment validation, deployment readiness, etc.
- Results formatted for both human consumption and MCP server ingestion
- Workflow definitions version controlled and shareable

### Secondary Users: LLM CLI Tool Developers

#### Story 5: Easy Integration for LLM CLI Tools
**As a developer creating a new LLM CLI tool**  
**I want to** integrate UWR with minimal code changes  
**So that** my users can access MCP server workflows immediately  

**Acceptance Criteria:**
- Single Python function provides complete UWR integration
- Standardized tool interface works with any LLM CLI architecture
- Documentation includes integration examples for major LLM CLI frameworks
- No dependencies on specific AI models or providers

### Tertiary Users: AI Assistants & Models

#### Story 6: Universal Workflow Interface
**As an AI assistant (Claude, Gemini, GPT, etc.)**  
**I want to** execute structured workflows using standard tool calls  
**So that I can** provide consistent development assistance across any CLI  

**Acceptance Criteria:**
- Workflow definitions parseable by any AI model
- Standard tool interface for workflow execution
- Results formatted for AI consumption and human display
- Error handling provides actionable feedback

---

## Technical Requirements

### Core Architecture: MCP Server Extension

#### 1. CLI Interface (MCP-Compatible)
```bash
# Installation
pip install universal-workflow-runner

# Basic usage (mimics MCP server tool calls)
uwr run environment-validation --project-path=/path/to/project
uwr run deployment-readiness --target=staging --strict-mode=true
uwr list --filter=mcp-compatible
uwr validate --mcp-server=localhost:8080

# LLM CLI Integration
uwr execute-for-llm --workflow=environment-validation --format=json
```

#### 2. MCP-Compatible Workflow Definition Format
```markdown
# Environment Validation Workflow
**Duration**: 15 minutes | **Confidence**: 95%
**MCP Tool**: analyze_environment
**Parameters**: analysisType=comprehensive, enhancedMode=true

## Phase 1: Discovery
### Step 1: System Detection (MCP: analyze_project_ecosystem)
```python
# Maps to MCP server tool: analyze_project_ecosystem
result = analyze_system_info({
    "analysisDepth": "comprehensive",
    "includeEnvironment": true
})
```

### Step 2: Tool Validation (MCP: environment_analysis_tool)
```bash
# Executes locally, results format compatible with MCP server
node --version
python --version
```
```

#### 3. Python Implementation Stack (MCP Integration Focus)
- **Core**: Python 3.9+ with asyncio for concurrent execution
- **CLI**: Click or Typer for command interface compatible with MCP patterns
- **Parsing**: Markdown parsing with MCP tool parameter extraction
- **Validation**: Pydantic schemas matching MCP server tool interfaces
- **Integration**: HTTP client for MCP server communication (JSON-RPC 2.0)
- **Workflow Engine**: Executes MCP-compatible workflows locally

### Workflow Execution Engine (MCP-Compatible)

#### 1. MCP Workflow Parser
```python
class MCPWorkflowParser:
    def parse_markdown(self, content: str) -> MCPWorkflow
    def extract_mcp_tool_calls(self, content: str) -> List[MCPToolCall]
    def validate_mcp_compatibility(self, workflow: MCPWorkflow) -> bool
    def map_to_mcp_parameters(self, workflow: MCPWorkflow) -> Dict[str, Any]
```

#### 2. MCP-Compatible Execution Engine
```python
class MCPWorkflowExecutor:
    def execute_workflow(self, workflow: MCPWorkflow, context: ExecutionContext) -> MCPWorkflowResult
    def execute_mcp_tool_locally(self, tool_call: MCPToolCall, context: ExecutionContext) -> MCPToolResult
    def format_for_mcp_server(self, result: MCPWorkflowResult) -> Dict[str, Any]
    def handle_mcp_errors(self, error: Exception, context: ExecutionContext) -> MCPErrorResult
```

#### 3. LLM CLI Adapters
```python
class LLMCLIAdapter:
    def detect_llm_cli_environment(self) -> LLMCLIType  # gemini-cli, claude-cli, aider, etc.
    def generate_tool_interface(self, workflow: MCPWorkflow) -> str
    def format_results_for_llm(self, results: MCPWorkflowResult) -> str
    def create_integration_code(self, llm_cli_type: LLMCLIType) -> str
```

### MCP Server Integration (Primary Focus)

#### 1. MCP Communication Protocol
```python
class MCPServerClient:
    def validate_workflow_result(self, result: MCPWorkflowResult) -> MCPValidationResult
    def sync_health_scores(self, scores: Dict) -> bool
    def create_todo_tasks(self, tasks: List[MCPTask]) -> bool
    def execute_server_tool(self, tool_name: str, parameters: Dict) -> MCPToolResult
    def get_available_tools(self) -> List[MCPToolInfo]
```

#### 2. MCP Data Format Compatibility
- Workflow results serializable to MCP tool parameters (JSON-RPC 2.0)
- Error handling compatible with MCP error codes
- Health metrics format matches MCP server expectations
- Tool parameter schemas match MCP server tool interfaces
- Results format compatible with MCP server ingestion

#### 3. LLM CLI Tool Integration Interface
```python
# Universal interface for any LLM CLI tool
def execute_mcp_workflow(workflow_name: str, **kwargs) -> dict:
    """Execute MCP-compatible workflow via UWR for any LLM CLI"""
    result = subprocess.run([
        'uwr', 'execute-for-llm', 
        '--workflow', workflow_name,
        '--mcp-server', 'optional',
        '--format', 'json',
        '--parameters', json.dumps(kwargs)
    ], capture_output=True, text=True)
    return json.loads(result.stdout)

# Integration examples for major LLM CLI tools
class LLMCLIIntegrations:
    def gemini_cli_integration(self) -> str: ...
    def claude_cli_integration(self) -> str: ...
    def aider_integration(self) -> str: ...
    def cursor_integration(self) -> str: ...
    def copilot_cli_integration(self) -> str: ...
```

---

## MCP Server Tool Adaptations Required

### Current Tools Analysis (Based on src/tools/ review)

#### 1. **Direct File System Access Dependencies**
**Tools Requiring Adaptation:**
- `deployment-readiness-tool.ts` - Needs project path, reads cache files
- `todo-management-tool-v2.ts` - Requires .mcp-adr-cache infrastructure
- `environment-analysis-tool.ts` - Needs project path for file analysis
- `smart-git-push-tool.ts` - Requires git repository access

**Adaptation Strategy:**
```python
# External tool provides data, MCP tool validates
external_data = {
    "project_path": "/path/to/project",
    "test_results": workflow_result.test_execution,
    "environment_info": workflow_result.environment_analysis
}

# MCP tool validates against internal rules
mcp_result = deployment_readiness_tool.validate_external_data(external_data)
```

#### 2. **Cache Infrastructure Dependencies**
**Current Dependencies:**
- `.mcp-adr-cache/todo-data.json` - Task storage
- `.mcp-adr-cache/deployment-history.json` - Deployment tracking
- `.mcp-adr-cache/project-health-scores.json` - Health metrics

**Required Changes:**
```python
# Add external data ingestion layer
class ExternalDataAdapter:
    def import_workflow_results(self, results: WorkflowResult) -> None
    def sync_cache_from_external(self, external_data: Dict) -> None
    def export_validation_results(self, results: ValidationResult) -> Dict
```

#### 3. **Tools Ready for External Integration**
**No Changes Required:**
- `rule-generation-tool.ts` - Works with provided ADR content
- `content-masking-tool.ts` - Content-based, no file dependencies
- `research-question-tool.ts` - Analysis-based, portable

**Minimal Changes Required:**
- `deployment-guidance-tool.ts` - Needs ADR content input
- `adr-suggestion-tool.ts` - Needs project context, not file access

### Required MCP Server Enhancements

#### 1. **External Data Ingestion API**
```typescript
// New endpoint for external workflow results
export interface ExternalWorkflowResult {
  workflowId: string;
  executionTime: string;
  results: WorkflowStepResult[];
  environment: EnvironmentInfo;
  testResults: TestExecutionResult[];
}

// New tool operation
export async function ingestExternalWorkflowResults(
  args: ExternalWorkflowResult
): Promise<ValidationResult>
```

#### 2. **Validation-Only Mode**
```typescript
// Add validation-only mode to existing tools
export async function deploymentReadiness(args: {
  operation: 'validate_external_data';
  externalData: ExternalWorkflowResult;
  // ... other params
}): Promise<ValidationResult>
```

#### 3. **Result Export Layer**
```typescript
// New capability to export results for external consumption
export interface ExternalValidationResult {
  validationId: string;
  status: 'passed' | 'failed' | 'warnings';
  issues: ValidationIssue[];
  recommendations: string[];
  todoTasks: TodoTask[];
}
```

---

## Implementation Phases

### Phase 1: Core CLI Tool (4-6 weeks)
**Goal**: Basic workflow execution and IDE adaptation

**Deliverables:**
- Python CLI with basic workflow parsing
- Support for bash/python code block execution
- IDE adapter for plan.md/Agents.md generation
- Basic error handling and reporting

**Success Criteria:**
- Can execute environment-validation workflow locally
- Generates appropriate IDE-specific files
- 90% success rate for basic workflows

### Phase 2: MCP Server Integration (3-4 weeks)
**Goal**: Bidirectional communication with MCP server

**Deliverables:**
- HTTP client for MCP server communication
- Data format adapters for tool compatibility
- Validation result processing
- Health score synchronization

**Success Criteria:**
- Workflow results validated against MCP server
- TODO tasks created automatically
- Health scores updated correctly

### Phase 3: Advanced Features (4-6 weeks)
**Goal**: Production-ready features and optimization

**Deliverables:**
- Workflow library with common patterns
- Parallel execution support
- Advanced error recovery
- Performance optimization

**Success Criteria:**
- 95% workflow success rate
- <30 second execution time
- Support for 10+ common workflow patterns

### Phase 4: Community & Ecosystem (2-3 weeks)
**Goal**: Open source preparation and documentation

**Deliverables:**
- Comprehensive documentation
- Plugin system for custom workflows
- CI/CD integration examples
- Community contribution guidelines

**Success Criteria:**
- Ready for open source release
- 5+ external contributors
- Integration with popular CI/CD platforms

---

## Risk Assessment

### Technical Risks
1. **MCP Server Compatibility**: Changes to MCP server may break integration
   - **Mitigation**: Version compatibility matrix, adapter pattern
2. **Performance**: Large workflows may be slow
   - **Mitigation**: Parallel execution, caching, optimization
3. **Security**: Code execution from markdown files
   - **Mitigation**: Sandboxing, code review, permission system

### Adoption Risks
1. **Developer Resistance**: Developers may prefer existing tools
   - **Mitigation**: Gradual migration, clear value proposition
2. **IDE Fragmentation**: Different IDEs may need different approaches
   - **Mitigation**: Adapter pattern, community contributions
3. **Workflow Complexity**: Advanced workflows may be hard to define
   - **Mitigation**: Template library, documentation, examples

### Business Risks
1. **Maintenance Burden**: Additional codebase to maintain
   - **Mitigation**: Open source community, clear architecture
2. **Feature Creep**: Tool becomes too complex
   - **Mitigation**: Clear scope, focus on core use cases

---

## Success Metrics

### Primary Metrics
- **Adoption Rate**: 100+ active users within 6 months
- **Workflow Success Rate**: 90% workflows complete successfully
- **Performance**: <30 seconds for basic workflows
- **Integration Rate**: 95% compatibility with existing MCP workflows

### Secondary Metrics
- **Developer Satisfaction**: 8/10 average rating
- **Support Burden**: <5 issues per week
- **Community Engagement**: 10+ external contributors
- **Documentation Quality**: 95% user questions answered in docs

---

## Conclusion

The Universal Workflow Runner represents a significant opportunity to democratize development workflows across different coding environments while maintaining the governance and validation benefits of the MCP ADR Analysis Server. By focusing on local execution with server-side validation, we can provide immediate productivity gains while ensuring architectural compliance.

The key to success will be:
1. **Simplicity**: Easy to install and use
2. **Compatibility**: Works across all major environments
3. **Integration**: Seamless MCP server integration
4. **Community**: Open source with clear contribution paths

This PRD provides the foundation for building a tool that bridges the gap between local development productivity and centralized governance, creating value for individual developers and development teams alike.