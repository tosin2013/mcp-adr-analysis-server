# 🤖 AI-Powered Workflow Orchestration Guide

This guide covers the advanced AI-powered features of the MCP ADR Analysis Server, including intelligent tool orchestration, human override capabilities, and systematic troubleshooting workflows.

## 🧠 Overview of AI-Powered Features

The MCP ADR Analysis Server includes several AI-powered tools that leverage OpenRouter.ai and advanced prompt engineering to provide intelligent workflow automation:

### Core AI Tools
- **Tool Chain Orchestrator** - Dynamic tool sequencing based on user intent
- **Troubleshooting Workflow** - Systematic failure analysis with test plan generation
- **Smart Project Scoring** - Cross-tool health assessment with AI optimization

### Key Benefits
- **Hallucination Prevention** - Reality checks and structured planning prevent AI confusion
- **Dynamic Workflow Generation** - AI analyzes context to generate optimal tool sequences
- **Intelligent Fallbacks** - Template-based approaches when AI services are unavailable
- **Cross-Tool Coordination** - Tools work together for comprehensive project insights

## 🔗 Tool Chain Orchestrator

The Tool Chain Orchestrator is the central AI-powered planning system that generates intelligent tool execution sequences.

### Core Operations

#### Generate Execution Plan
```json
{
  "operation": "generate_plan",
  "userRequest": "Complete architectural analysis and generate implementation roadmap",
  "includeContext": true,
  "optimizeFor": "comprehensive"
}
```

**What it does:**
- Analyzes user intent using OpenRouter.ai
- Generates structured tool execution sequences
- Provides dependency analysis and execution order
- Includes confidence scoring and alternative approaches

#### Analyze User Intent
```json
{
  "operation": "analyze_intent",
  "userRequest": "Help me understand why my deployment is failing",
  "extractGoals": true
}
```

**Use Cases:**
- Understanding complex user requests
- Goal extraction from natural language
- Intent classification for workflow selection

#### Suggest Relevant Tools
```json
{
  "operation": "suggest_tools",
  "userRequest": "I need to improve my project's architectural documentation",
  "maxSuggestions": 5
}
```

### Common Workflow Patterns

When LLMs get confused or for systematic workflows, use these proven tool sequences:

#### Complete Project Analysis
**Tools:** `analyze_project_ecosystem` → `discover_existing_adrs` → `suggest_adrs` → `smart_score`

#### Generate Documentation
**Tools:** `generate_adr_todo` → `generate_deployment_guidance` → `generate_rules`

#### Security Audit and Fix
**Tools:** `analyze_content_security` → `suggest_adrs` → `generate_rules` → `validate_rules`

#### Deployment Readiness
**Tools:** `compare_adr_progress` → `smart_score` → `generate_deployment_guidance` → `smart_git_push`

#### Systematic Troubleshooting
**Tools:** `troubleshoot_guided_workflow` → `smart_score` → `compare_adr_progress`

#### Complete TODO Management
**Tools:** `generate_adr_todo` → `manage_todo` → `compare_adr_progress` → `smart_score`

### Advanced Features

#### Reality Check for Hallucination Detection
```json
{
  "operation": "reality_check",
  "sessionContext": "Previous conversation context",
  "detectConfusion": true
}
```

**Hallucination Indicators:**
- Repetitive tool suggestions
- Circular reasoning patterns
- Requests for non-existent tools
- Inconsistent parameter suggestions

#### Session Guidance for Long Conversations
```json
{
  "operation": "session_guidance",
  "conversationLength": "long",
  "provideSummary": true
}
```

**Provides:**
- Conversation summary and progress
- Suggested next steps
- Warning about potential confusion
- Reset recommendations

## 🚨 Human Override System

The Human Override system forces AI-powered planning when LLMs get confused or stuck in loops.

### When to Use Human Override

**Indicators you need human override:**
- LLM asking repetitive questions
- Circular conversation patterns
- LLM claiming tools don't exist
- Inconsistent or contradictory suggestions
- LLM seems "stuck" or confused

### Core Operations

#### Force AI Planning
```json
{
  "taskDescription": "Set up complete ADR infrastructure with deployment pipeline",
  "forceExecution": true,
  "includeContext": true
}
```

**What it does:**
- Bypasses current LLM confusion
- Forces fresh AI analysis through OpenRouter.ai
- Generates structured execution plans
- Provides clear command schemas for LLM consumption

#### Extract Goals from Natural Language
```json
{
  "taskDescription": "The build is broken and tests are failing, need to fix everything",
  "forceExecution": true,
  "extractGoals": true
}
```

**Goal Extraction Example:**
- Input: "The build is broken and tests are failing, need to fix everything"
- Extracted Goals: ["Fix build issues", "Resolve test failures", "Validate system stability"]

### Integration with Knowledge Graph

The Human Override system integrates with the Knowledge Graph to:
- Track human intervention patterns
- Record forced execution contexts
- Analyze effectiveness of override strategies
- Provide analytics on LLM confusion patterns

## 🔧 Troubleshooting Guided Workflow

Systematic problem-solving with ADR/TODO alignment and AI-powered test plan generation.

### Supported Failure Types

- **test_failure** - Unit/integration test failures
- **deployment_failure** - Production deployment issues
- **build_failure** - Compilation or build process failures
- **runtime_error** - Application runtime exceptions
- **performance_issue** - Performance degradation problems
- **security_issue** - Security vulnerabilities or breaches

### Core Operations

#### Analyze Failure
```json
{
  "operation": "analyze_failure",
  "failureType": "deployment_failure",
  "description": "Kubernetes deployment failing with connection timeouts",
  "severity": "high",
  "context": {
    "environment": "production",
    "lastWorkingVersion": "v2.1.0",
    "errorDetails": "Connection timeout after 30s"
  }
}
```

#### Generate AI-Powered Test Plan
```json
{
  "operation": "generate_test_plan",
  "failureType": "build_failure",
  "description": "TypeScript compilation failing after dependency update",
  "severity": "medium"
}
```

**AI-Generated Output:**
```json
{
  "testPlan": {
    "diagnosticCommands": [
      "npx tsc --noEmit --listFiles",
      "npm ls typescript",
      "npx tsc --showConfig"
    ],
    "validationSteps": [
      "Verify TypeScript version compatibility",
      "Check for conflicting type definitions",
      "Validate tsconfig.json configuration"
    ],
    "expectedOutcomes": [
      "TypeScript version should be compatible with dependencies",
      "No duplicate type definitions should exist",
      "Configuration should match project requirements"
    ]
  }
}
```

#### Full Workflow Integration
```json
{
  "operation": "full_workflow",
  "failureType": "security_issue",
  "description": "Potential sensitive data exposure in logs",
  "severity": "critical"
}
```

**Full Workflow Steps:**
1. Analyze failure with AI-powered assessment
2. Generate specific test plan with commands
3. Execute `analyze_content_security` for sensitive data detection
4. Run `suggest_adrs` for security-related architectural decisions
5. Use `generate_rules` to create security compliance rules
6. Execute `smart_score` to assess security posture improvement

## 📊 Smart Project Scoring System

Cross-tool coordination for comprehensive project health assessment.

### Core Operations

#### Recalculate All Scores
```json
{
  "operation": "recalculate_scores",
  "updateSources": true,
  "includeOptimization": true
}
```

#### Synchronize Cross-Tool Scores
```json
{
  "operation": "sync_scores",
  "rebalanceWeights": true,
  "focusAreas": ["todo", "architecture", "security", "deployment"]
}
```

#### Comprehensive Health Diagnostics
```json
{
  "operation": "diagnose_scores",
  "includeRecommendations": true,
  "dataFreshness": true
}
```

#### AI-Driven Weight Optimization
```json
{
  "operation": "optimize_weights",
  "projectType": "web-application",
  "optimizationGoal": "deployment_readiness"
}
```

### Score Components

**Default Scoring Weights:**
- TODO Completion: 30%
- Architecture Compliance: 25%
- Security Posture: 20%
- Deployment Readiness: 15%
- Code Quality: 10%

**Project-Specific Optimization:**
- **Startup Projects**: Higher weight on TODO completion and deployment readiness
- **Enterprise Applications**: Higher weight on security and architecture compliance
- **Open Source**: Higher weight on code quality and documentation

## 🔄 Best Practices for AI-Powered Workflows

### 1. Start with Tool Orchestration
For complex tasks, always begin with:
```json
{
  "operation": "generate_plan",
  "userRequest": "Your specific goal",
  "includeContext": true
}
```

### 2. Use Human Override When Stuck
If conversation becomes circular:
```json
{
  "taskDescription": "Clear description of what you want to achieve",
  "forceExecution": true
}
```

### 3. Leverage Troubleshooting for Problems
For any failure or issue:
```json
{
  "operation": "full_workflow",
  "failureType": "appropriate_type",
  "description": "Specific problem description"
}
```

### 4. Monitor Health Continuously
Regular health checks:
```json
{
  "operation": "diagnose_scores",
  "includeRecommendations": true
}
```

### 5. Validate with Reality Checks
Prevent AI confusion:
```json
{
  "operation": "reality_check",
  "detectConfusion": true
}
```

## 🚀 Advanced Integration Patterns

### Workflow Chaining
Combine AI-powered tools for comprehensive workflows:

1. **Initial Planning**: `tool_chain_orchestrator` generates plan
2. **Execution**: Follow generated tool sequence
3. **Validation**: `smart_score` assesses results
4. **Troubleshooting**: `troubleshoot_guided_workflow` if issues arise
5. **Restart**: Start fresh session if confusion occurs

### Context Preservation
Maintain context across tool executions:
- Include conversation history in orchestration requests
- Use knowledge graph to track intent progressions
- Leverage smart scoring for continuous assessment

### Fallback Strategies
Always have fallbacks when AI is unavailable:
- Predefined task patterns in orchestrator
- Template-based test plans in troubleshooting
- Manual workflow guides for common scenarios

## 🎯 Common Scenarios and Solutions

### Scenario 1: LLM Keeps Asking Same Questions
**Solution:** Use Human Override
```json
{
  "taskDescription": "Complete architectural analysis for microservices project",
  "forceExecution": true
}
```

### Scenario 2: Complex Multi-Step Task
**Solution:** Use Tool Orchestration
```json
{
  "operation": "generate_plan",
  "userRequest": "Migrate monolith to microservices with full documentation",
  "optimizeFor": "comprehensive"
}
```

### Scenario 3: Deployment Keeps Failing
**Solution:** Use Troubleshooting Workflow
```json
{
  "operation": "full_workflow",
  "failureType": "deployment_failure",
  "description": "Specific deployment error details"
}
```

### Scenario 4: Project Health Declining
**Solution:** Use Smart Scoring Diagnostics
```json
{
  "operation": "diagnose_scores",
  "includeRecommendations": true,
  "focusAreas": ["todo", "architecture", "deployment"]
}
```

## 🔮 Future Enhancements

### Planned AI Improvements
1. **Enhanced Hallucination Detection** - More sophisticated confusion pattern recognition
2. **Learning from Patterns** - AI learns from successful workflow patterns
3. **Cross-Project Insights** - Share knowledge across different projects
4. **Advanced Context Understanding** - Better long-term conversation context
5. **Predictive Troubleshooting** - Anticipate issues before they occur

### Integration Roadmap
- **CI/CD Integration** - Automated workflow orchestration in pipelines
- **IDE Extensions** - Real-time AI guidance during development
- **Team Collaboration** - Shared AI insights and workflow patterns
- **Advanced Analytics** - Project health prediction and optimization

---

**Need Help?** 
- Check the main [README](../README.md) for basic setup
- Review specific tool guides for detailed parameters
- Open an issue on [GitHub](https://github.com/tosin2013/mcp-adr-analysis-server/issues) for AI-related problems