# 📚 Documentation Navigation - Diataxis Framework

**Find exactly what you need based on your current goal.**

## 🏗️ Documentation Architecture

```mermaid
graph TB
    subgraph "User Intent"
        Learn[🎓 I want to LEARN]
        Solve[🛠️ I want to SOLVE]
        Lookup[📖 I want to LOOK UP]
        Understand[💡 I want to UNDERSTAND]
    end
    
    subgraph "Documentation Sections"
        Learn --> Tutorials[Tutorials<br/>Step-by-step learning]
        Solve --> HowTo[How-To Guides<br/>Problem solving]
        Lookup --> Reference[Reference<br/>Technical details]
        Understand --> Explanation[Explanation<br/>Deep concepts]
    end
    
    subgraph "Content Types"
        Tutorials --> T1[Getting Started]
        Tutorials --> T2[Advanced Techniques]
        HowTo --> H1[Troubleshooting]
        HowTo --> H2[Workflows]
        Reference --> R1[API Reference]
        Reference --> R2[Configuration]
        Explanation --> E1[Architecture]
        Explanation --> E2[Design Philosophy]
    end
```

---

## 🎯 What do you want to do right now?

### 🎓 **I want to LEARN** → [Tutorials](#-tutorials)
*"Teach me how to use this step-by-step"*

**When to use**: You're new to MCP or architectural decision records, want to understand concepts through hands-on practice.

### 🛠️ **I want to SOLVE** → [How-To Guides](#-how-to-guides)  
*"Help me fix this specific problem"*

**When to use**: You have a specific issue, error, or task you need to accomplish right now.

### 📖 **I want to LOOK UP** → [Reference](#-reference)
*"What are the exact parameters for this tool?"*

**When to use**: You know what tool you want to use but need exact syntax, parameters, or options.

### 💡 **I want to UNDERSTAND** → [Explanation](#-explanation)
*"Why does this work this way?"*

**When to use**: You want to understand the deeper concepts, design decisions, and architectural principles.

---

## 🎓 Tutorials
*Learning-oriented • Step-by-step • Safe to experiment*

Start here if you're new to MCP ADR Analysis or want to build your skills systematically.

### **Getting Started Series**
- **[Your First MCP Analysis](tutorials/01-first-steps.md)** ⭐
  - *30 minutes • Beginner*
  - Install server, run first analysis, create your first ADR
  
- **[Working with Existing Projects](tutorials/02-existing-projects.md)**
  - *45 minutes • Beginner*
  - Analyze codebases with existing architecture, discover implicit decisions

- **[Advanced Analysis Techniques](tutorials/03-advanced-analysis.md)**
  - *60 minutes • Intermediate*
  - Security scanning, deployment readiness, performance analysis

### **Specialized Learning Paths**
- **[Security-First Architecture](tutorials/security-focused-workflow.md)**
  - *90 minutes • Intermediate*
  - End-to-end security analysis and ADR generation workflow

- **[Team Collaboration Workflows](tutorials/team-collaboration.md)**
  - *60 minutes • Advanced*
  - Multi-developer ADR processes, review workflows, knowledge sharing

**👨‍🎓 New to architectural decision records?** Start with [Your First MCP Analysis](tutorials/01-first-steps.md)

---

## 🛠️ How-To Guides
*Problem-solving • Goal-oriented • Real scenarios*

Use these when you need to solve a specific problem or accomplish a particular task.

### **Common Problems**
- **[Troubleshoot Common Issues](how-to-guides/troubleshooting.md)** 🆘
  - Fix installation problems, resolve errors, diagnose issues
  
- **[Handle Security Concerns](how-to-guides/security-analysis.md)**
  - Detect sensitive content, configure masking, secure deployments

- **[Prepare for Deployment](how-to-guides/deployment-readiness.md)**
  - Validate production readiness, run final checks, create deployment plans

### **Workflow Solutions**
- **[Migrate from Manual ADRs](how-to-guides/migrate-existing-adrs.md)**
  - Convert existing documentation, preserve history, establish new processes

- **[Integrate with CI/CD](how-to-guides/cicd-integration.md)**
  - Automate ADR validation, enforce architectural rules, track compliance

- **[Scale for Large Teams](how-to-guides/large-team-scaling.md)**
  - Multi-repository setups, federated decision tracking, governance workflows

### **Specific Tasks**
- **[Generate ADRs from Requirements](how-to-guides/prd-to-adrs.md)**
  - Convert PRD documents, structure decisions, maintain traceability

- **[Track Implementation Progress](how-to-guides/progress-tracking.md)**
  - Monitor ADR implementation, identify blockers, report status

- **[Create Custom Rules](how-to-guides/custom-rules.md)**
  - Define architectural constraints, validate compliance, enforce standards

- **[Setup Firecrawl Integration](how-to-guides/firecrawl-setup.md)** 🔥
  - Enable web research capabilities for enhanced analysis

- **[MCP Client Compatibility](how-to-guides/mcp-client-compatibility.md)** 🔌
  - Configure server for Claude Desktop, Cline, Cursor, Gemini, and more

**🚨 Having an issue right now?** Check [Troubleshooting](how-to-guides/troubleshooting.md) first.

---

## 📖 Reference
*Information-oriented • Systematic • Comprehensive*

Complete documentation for when you need exact details about tools, parameters, and APIs.

### **Complete API Documentation**
- **[Complete API Reference](reference/api-reference.md)** 📋
  - All 37 tools with parameters, examples, and usage patterns
  - Quick navigation and search functionality
  - Common usage patterns and workflows

### **Tool Categories**
- **[Analysis Tools](reference/analysis-tools.md)**
  - Project analysis, context extraction, ecosystem understanding
  
- **[Generation Tools](reference/generation-tools.md)**
  - ADR creation, TODO generation, documentation synthesis

- **[Security Tools](reference/security-tools.md)**
  - Content scanning, masking, credential detection

- **[Validation Tools](reference/validation-tools.md)**
  - Progress tracking, rule validation, deployment readiness

### **Configuration Reference**
- **[Environment Variables](reference/environment-config.md)**
  - All configuration options, default values, environment setup

- **[MCP Client Configuration](reference/mcp-client-config.md)**
  - Claude Desktop, Cursor, other MCP clients setup

### **Schemas and Formats**
- **[ADR Templates](reference/adr-templates.md)**
  - Standard formats, MADR templates, Y-statements

- **[JSON Schemas](reference/json-schemas.md)**
  - Tool parameters, response formats, data structures

**🔍 Looking for a specific tool?** Use the [API Reference](reference/api-reference.md) search.

---

## 💡 Explanation
*Understanding-oriented • Conceptual • Background*

Deep-dive into concepts, design decisions, and the "why" behind the architecture.

### **Core Concepts**
- **[Understanding MCP](explanation/mcp-concepts.md)** 🧠
  - What is Model Context Protocol, how it works, why it matters
  
- **[Architectural Decision Records](explanation/adr-philosophy.md)**
  - ADR principles, best practices, decision-making frameworks

- **[AI-Assisted Architecture](explanation/ai-architecture-concepts.md)**
  - How AI enhances architectural analysis, human-AI collaboration

### **Design Decisions**
- **[Server Architecture](explanation/server-architecture.md)**
  - Why we chose this design, tradeoffs, alternative approaches

- **[Tool Design Philosophy](explanation/tool-design.md)**
  - Principles behind tool organization, naming, parameter design

- **[Security Model](explanation/security-philosophy.md)**
  - Threat model, protection strategies, privacy considerations

### **Advanced Topics**
- **[Knowledge Graph Architecture](explanation/knowledge-graph.md)**
  - How we build and maintain project understanding over time

- **[Prompt Engineering Techniques](explanation/prompt-engineering.md)**
  - APE, Knowledge Generation, Reflexion frameworks explained

- **[Performance and Scalability](explanation/performance-design.md)**
  - How the server handles large projects, optimization strategies

**🤔 Want to understand the bigger picture?** Start with [Understanding MCP](explanation/mcp-concepts.md).

---

## 🧭 Quick Navigation

### **By Experience Level**
- **New to MCP**: [First Steps Tutorial](tutorials/01-first-steps.md) → [MCP Concepts](explanation/mcp-concepts.md)
- **New to ADRs**: [ADR Philosophy](explanation/adr-philosophy.md) → [Generate Your First ADR](tutorials/01-first-steps.md)
- **Experienced User**: [API Reference](reference/api-reference.md) → [Advanced Techniques](tutorials/03-advanced-analysis.md)

### **By Use Case**
- **Personal Projects**: [First Steps](tutorials/01-first-steps.md) → [Existing Projects](tutorials/02-existing-projects.md)
- **Team Projects**: [Team Collaboration](tutorials/team-collaboration.md) → [Large Team Scaling](how-to-guides/large-team-scaling.md)
- **Enterprise**: [Security Workflow](tutorials/security-focused-workflow.md) → [CI/CD Integration](how-to-guides/cicd-integration.md)

### **By Problem Type**
- **Installation/Setup**: [Troubleshooting](how-to-guides/troubleshooting.md)
- **Security Concerns**: [Security Analysis](how-to-guides/security-analysis.md)
- **Performance Issues**: [Performance Design](explanation/performance-design.md)
- **Integration Questions**: [CI/CD Integration](how-to-guides/cicd-integration.md)

---

## 📊 Documentation Quality Metrics

This documentation follows the [Diataxis framework](https://diataxis.fr/) for maximum usability:

- **✅ Tutorials**: Learn by doing with safe, guided practice
- **✅ How-To Guides**: Solve real problems with proven solutions  
- **✅ Reference**: Look up exact information quickly and reliably
- **✅ Explanation**: Understand concepts and design decisions deeply

### Quick Feedback
Found what you needed? Missing something important? 
**[Improve this documentation](https://github.com/tosin2013/mcp-adr-analysis-server/issues)**

---

*Can't find what you need? [Search the complete API reference](reference/api-reference.md) or [file an issue](https://github.com/tosin2013/mcp-adr-analysis-server/issues) to help us improve the documentation.*

