# 🎯 MCP ADR Analysis Server Prompting Guide

**Master the art of effective prompting for architectural analysis and decision-making**

> **Version**: 2.1.0 | **Updated**: September 2025 | **Audience**: AI Assistants, Developers, Architects

---

## 📖 Table of Contents

1. [Quick Start Prompting](#quick-start-prompting)
2. [Context File Reference (`.mcp-server-context.md`)](#context-file-referencing)
3. [Basic Prompting Patterns](#basic-prompting-patterns)
4. [Advanced Prompting Techniques](#advanced-prompting-techniques)
5. [Tool-Specific Prompting](#tool-specific-prompting)
6. [Multi-Tool Workflows](#multi-tool-workflows)
7. [Troubleshooting Prompts](#troubleshooting-prompts)
8. [Best Practices & Templates](#best-practices--templates)

---

## 🚀 Quick Start Prompting

### 📌 Use `.mcp-server-context.md` First!

Before crafting prompts, reference the context file for instant server awareness:

```markdown
@.mcp-server-context.md
```

This gives you:

- ✅ All available tools by category (37+ tools)
- ✅ Current project state and recent activity
- ✅ Active workflows and intents
- ✅ Tool usage examples and capabilities

**See [Context File Referencing](#context-file-referencing) section below for details.**

---

### Essential Prompt Structure

```
[CONTEXT] + [TOOL_REQUEST] + [PARAMETERS] + [EXPECTED_OUTPUT]
```

### Example: Basic Project Analysis

```
Context: "I'm analyzing a Node.js microservices project"
Tool: "Use analyze_project_ecosystem"
Parameters: "with comprehensive analysis and AI enhancement enabled"
Output: "Provide architectural insights and ADR suggestions"
```

**Complete Prompt:**

> "I'm analyzing a Node.js microservices project. Use analyze_project_ecosystem with comprehensive analysis and AI enhancement enabled to provide architectural insights and ADR suggestions."

---

## 🎨 Basic Prompting Patterns

### Pattern 1: Single Tool Analysis

```markdown
**Template:**
"Analyze [PROJECT_TYPE] using [TOOL_NAME] with [SPECIFIC_PARAMETERS] to [DESIRED_OUTCOME]"

**Examples:**

- "Analyze this React application using analyze_project_ecosystem with enhanced mode enabled to identify missing ADRs"
- "Review existing ADRs using review_existing_adrs with tree-sitter analysis to assess compliance"
- "Check deployment readiness using deployment_readiness with strict validation for production environment"
```

### Pattern 2: Context-Rich Prompting

```markdown
**Template:**
"Given [CONTEXT], I need to [GOAL]. Please use [TOOL] with these considerations: [CONSTRAINTS]"

**Example:**
"Given that we're migrating from monolith to microservices, I need to document architectural decisions. Please use suggest_adrs with focus on distributed systems patterns and consider our existing Spring Boot stack."
```

### Pattern 3: Progressive Analysis

```markdown
**Template:**
"Start with [INITIAL_TOOL], then based on results, proceed with [FOLLOW_UP_TOOLS]"

**Example:**
"Start with analyze_project_ecosystem to understand the codebase, then use suggest_adrs to identify missing decisions, and finally generate_adr_todo to create implementation tasks."
```

---

## 🧠 Advanced Prompting Techniques

### Chain-of-Thought Prompting

Enable the server's advanced AI capabilities:

```markdown
**Enhanced Analysis Request:**
"Please analyze this project using methodological pragmatism:

1. First, use analyze_project_ecosystem with knowledge enhancement
2. Apply reflexion framework to validate findings
3. Generate confidence-scored recommendations
4. Provide explicit acknowledgment of limitations"
```

### Context File Referencing

**Use `.mcp-server-context.md` for instant server awareness:**

The `.mcp-server-context.md` file is auto-generated and provides comprehensive context about:

- All 37+ available tools by category
- Current server state and memory
- Active intents and workflow context
- Recent architectural decisions
- Project analysis history

**How to use:**

```markdown
# Reference the context file in your prompts:

@.mcp-server-context.md I'm new to this project. What architectural decisions have been made?

@.mcp-server-context.md What tools are available for security analysis?

@.mcp-server-context.md Show me the active intents and current workflow state.
```

**Benefits:**

- ✅ Instant awareness of all server capabilities
- ✅ Access to recent activity and decisions
- ✅ Understanding of project-specific context
- ✅ Tool discovery and usage guidance

**Related Documentation:**

- See [Server Context File Guide](./server-context-file.md) for detailed usage
- See [Context File Tool Coverage](../explanation/context-file-tool-coverage.md) for tool integration

---

### Memory-Centric Prompting

Leverage the memory system:

```markdown
**Memory Integration:**
"Load existing ADRs into memory using memory_loading, then analyze architectural gaps using the knowledge graph to suggest improvements with high confidence scoring."
```

### Multi-Dimensional Analysis

```markdown
**Comprehensive Assessment:**
"Perform a security-focused architectural analysis:

- Use analyze_content_security for vulnerability detection
- Apply tree-sitter analysis for deep code inspection
- Generate content masking recommendations
- Validate against enterprise security standards"
```

---

## 🛠️ Tool-Specific Prompting

### analyze_project_ecosystem

**Optimal Prompting:**

```markdown
"Analyze [PROJECT_PATH] using analyze_project_ecosystem with:

- Enhanced mode: true
- Knowledge enhancement: true
- Technology focus: [TECH_STACK]
- Analysis depth: comprehensive
- Include environment analysis: true

Focus on [SPECIFIC_AREAS] and provide confidence-scored insights."
```

**Parameters to Always Include:**

- `enhancedMode: true` - Enables APE + Knowledge Generation
- `knowledgeEnhancement: true` - Activates advanced AI features
- `analysisDepth: "comprehensive"` - Full analysis scope

### suggest_adrs

**Effective Prompting:**

```markdown
"Suggest ADRs for [PROJECT_CONTEXT] using suggest_adrs with:

- Before/after code analysis enabled
- Tree-sitter analysis for accurate detection
- Focus on [ARCHITECTURAL_CONCERNS]
- Include implementation guidance"
```

### content_masking_tool

**Security-Focused Prompting:**

```markdown
"Analyze security vulnerabilities using analyze_content_security with:

- Tree-sitter analysis enabled
- Custom pattern detection for [SPECIFIC_SECRETS]
- Generate masking strategies for [ENVIRONMENT]
- Validate masking effectiveness"
```

### deployment_readiness

**Production-Ready Prompting:**

```markdown
"Check deployment readiness using deployment_readiness with:

- Strict validation mode
- Environment: production
- Include mock vs production analysis
- Generate deployment guidance with confidence scoring"
```

---

## 🔄 Multi-Tool Workflows

### Workflow 1: New Project Setup

```markdown
1. "Analyze project structure using analyze_project_ecosystem"
2. "Based on findings, suggest missing ADRs using suggest_adrs"
3. "Generate implementation tasks using generate_adr_todo"
4. "Validate deployment readiness using deployment_readiness"
```

### Workflow 2: Security Assessment

```markdown
1. "Scan for security issues using analyze_content_security"
2. "Generate masking strategies using generate_content_masking"
3. "Validate masking effectiveness using validate_content_masking"
4. "Create security-focused ADRs using suggest_adrs with security focus"
```

### Workflow 3: Legacy Modernization

```markdown
1. "Analyze existing architecture using analyze_project_ecosystem"
2. "Review current ADRs using review_existing_adrs"
3. "Identify modernization opportunities using suggest_adrs"
4. "Generate migration rules using generate_rules"
5. "Validate compliance using validate_rules"
```

---

## 🔧 Troubleshooting Prompts

### When Tools Return Errors

```markdown
**Generic Error Recovery:**
"The previous tool failed. Please use troubleshoot_guided_workflow to:

1. Diagnose the issue systematically
2. Provide step-by-step resolution
3. Suggest alternative approaches
4. Validate the fix"
```

### When Results Are Incomplete

```markdown
**Enhanced Analysis Request:**
"The analysis seems incomplete. Please retry with:

- Enhanced mode enabled
- Increased analysis depth
- Tree-sitter analysis activated
- Knowledge enhancement enabled
- Explicit confidence scoring"
```

### When Prompts Are Too Vague

```markdown
**Clarification Request:**
"Please use get_workflow_guidance to:

- Clarify the optimal approach for [GOAL]
- Recommend specific tools and parameters
- Provide step-by-step workflow
- Estimate effort and timeline"
```

---

## 📋 Best Practices & Templates

### Template Library

#### 1. Comprehensive Project Analysis

```markdown
"I need a complete architectural analysis of [PROJECT_TYPE]. Please:

1. Use analyze_project_ecosystem with enhanced mode and knowledge enhancement
2. Focus on [TECHNOLOGY_STACK] with comprehensive depth
3. Include environment analysis and security assessment
4. Provide confidence-scored recommendations
5. Suggest missing ADRs based on findings
6. Generate actionable TODO items

Expected outcome: Complete architectural assessment with implementation roadmap."
```

#### 2. Security-First Analysis

```markdown
"Perform a security-focused analysis of [PROJECT]. Please:

1. Use analyze_content_security with tree-sitter analysis
2. Detect secrets, vulnerabilities, and compliance issues
3. Generate content masking strategies
4. Validate masking effectiveness
5. Create security-focused ADRs
6. Provide deployment security guidance

Expected outcome: Comprehensive security assessment with remediation plan."
```

#### 3. ADR Generation & Management

```markdown
"Help me establish ADR management for [PROJECT]. Please:

1. Discover existing ADRs using discover_existing_adrs
2. Review current ADRs using review_existing_adrs with compliance scoring
3. Suggest missing ADRs using suggest_adrs with architectural focus
4. Generate implementation tasks using generate_adr_todo
5. Create ADR validation rules using generate_rules

Expected outcome: Complete ADR management system with validation."
```

### Performance Optimization Tips

1. **Always Enable Enhanced Mode**

   ```markdown
   enhancedMode: true
   knowledgeEnhancement: true
   ```

2. **Use Specific Technology Focus**

   ```markdown
   technologyFocus: ["react", "nodejs", "docker", "kubernetes"]
   ```

3. **Request Confidence Scoring**

   ```markdown
   "Provide confidence scores for all recommendations"
   ```

4. **Enable Tree-Sitter Analysis**
   ```markdown
   enableTreeSitterAnalysis: true
   ```

### Common Pitfalls to Avoid

❌ **Don't:**

- Use vague prompts without context
- Skip enhanced mode for complex analysis
- Ignore confidence scores in responses
- Mix incompatible tool combinations

✅ **Do:**

- Provide clear context and goals
- Enable advanced AI features
- Request explicit confidence levels
- Follow recommended tool workflows

---

## 🎯 Prompt Templates by Use Case

### Enterprise Architecture Review

```markdown
"As an enterprise architect, I need to assess [SYSTEM] for compliance and modernization. Please use analyze_project_ecosystem with enterprise focus, then suggest_adrs for governance patterns, and generate_rules for compliance validation. Provide confidence-scored recommendations suitable for executive reporting."
```

### DevOps Pipeline Integration

```markdown
"I'm integrating ADR analysis into our CI/CD pipeline. Please use deployment_readiness with strict validation, analyze_content_security for automated security checks, and smart_git_push for safe deployments. Focus on automation-friendly outputs and error handling."
```

### Team Collaboration Setup

```markdown
"Our team needs collaborative ADR management. Please use interactive_adr_planning for team workflows, generate_adr_todo for task distribution, and tool_chain_orchestrator for automated workflows. Emphasize team coordination and knowledge sharing."
```

---

## 📚 Additional Resources

- **[API Reference](../reference/api-reference.md)** - Complete tool documentation
- **[Architecture Guide](../explanation/server-architecture.md)** - System design principles
- **[Troubleshooting](./troubleshooting.md)** - Common issues and solutions
- **[Examples](../tutorials/)** - Step-by-step tutorials

---

**💡 Pro Tip**: The MCP ADR Analysis Server uses methodological pragmatism - always request confidence scores and explicit acknowledgment of limitations for the most reliable results.

**🔄 Keep Updated**: This guide evolves with the server. Check back regularly for new prompting patterns and techniques.
