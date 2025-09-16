# 🎓 Tutorial 2: Working with Existing Projects

**Learning Goal**: Master analyzing existing codebases, discovering implicit architectural decisions, and creating comprehensive documentation for established projects.

**Prerequisites**:

- Completed [Tutorial 1: Your First MCP Analysis](01-first-steps.md)
- Understanding of basic MCP concepts
- Access to an existing codebase

**Time Required**: 45 minutes

---

## 📚 What You'll Learn

1. **Project Discovery** - Systematically analyze existing codebases
2. **Implicit Decision Detection** - Find undocumented architectural choices
3. **ADR Generation from Code** - Create documentation for existing decisions
4. **Gap Analysis** - Identify missing documentation and decisions
5. **Legacy Integration** - Work with existing documentation and patterns

---

## 🔍 Step 1: Comprehensive Project Discovery

### Understanding What You're Working With

When analyzing an existing project, you need to understand:

- **Technology stack and dependencies**
- **Architectural patterns and design choices**
- **Existing documentation and standards**
- **Team conventions and practices**

### Run Deep Analysis

Start with a comprehensive ecosystem analysis:

```json
{
  "tool": "analyze_project_ecosystem",
  "parameters": {
    "projectPath": ".",
    "enhancedMode": true,
    "knowledgeEnhancement": true,
    "learningEnabled": true,
    "includeEnvironment": true,
    "recursiveDepth": "comprehensive"
  }
}
```

**What to Look For:**

- **Detected Technologies** - Languages, frameworks, databases
- **Architecture Patterns** - MVC, microservices, monolith, etc.
- **Code Organization** - Directory structure and module organization
- **Dependencies** - External libraries and their versions
- **Configuration** - Environment setup and deployment configs

### Exercise: Project Inventory

**Take 10 minutes to review the analysis results and answer:**

1. What is the primary technology stack?
2. What architectural pattern is being used?
3. Are there any outdated dependencies or technologies?
4. What's the overall complexity level?
5. Are there any obvious architectural concerns?

---

## 📋 Step 2: Discover Existing ADRs

### Check for Current Documentation

Many projects have some architectural documentation, even if not formal ADRs.

```json
{
  "tool": "discover_existing_adrs",
  "parameters": {
    "adrDirectory": "docs/adrs",
    "projectPath": "."
  }
}
```

**Common ADR Locations to Check:**

- `docs/adrs/`
- `docs/decisions/`
- `docs/architecture/`
- `architecture/`
- `decisions/`
- Root-level `ARCHITECTURE.md` or `DECISIONS.md`

### If No ADRs Found

Don't worry! This is common. The tool will help you discover implicit decisions that should be documented.

### If ADRs Exist

Great! You can enhance and expand the existing documentation. Note:

- **Format consistency** - Are they using a standard template?
- **Completeness** - Do they cover all major decisions?
- **Currency** - Are they up to date with current implementation?

---

## 🔎 Step 3: Identify Implicit Architectural Decisions

### Discover Hidden Decisions

Every codebase contains implicit architectural decisions that aren't documented. Let's find them:

```json
{
  "tool": "suggest_adrs",
  "parameters": {
    "projectPath": ".",
    "analysisScope": "all",
    "maxSuggestions": 10
  }
}
```

**Common Implicit Decisions Include:**

- **Database choice and schema design**
- **Authentication and authorization approach**
- **API design patterns (REST, GraphQL, etc.)**
- **Error handling strategies**
- **Logging and monitoring approaches**
- **Testing strategies and frameworks**
- **Deployment and infrastructure choices**

### Prioritize by Impact

The tool will suggest decisions, but you should prioritize based on:

1. **Business Impact** - Decisions affecting user experience or business goals
2. **Technical Risk** - Decisions with significant technical debt or complexity
3. **Team Confusion** - Areas where team members frequently ask questions
4. **Change Frequency** - Parts of the system that change often

### Exercise: Decision Mapping

**Create a simple priority matrix:**

| Decision                  | Business Impact | Technical Risk | Priority |
| ------------------------- | --------------- | -------------- | -------- |
| Database Architecture     | High            | Medium         | 1        |
| API Authentication        | High            | High           | 1        |
| Frontend State Management | Medium          | Low            | 3        |

---

## 📝 Step 4: Generate ADRs for Key Decisions

### Start with High-Priority Decisions

Pick your top 3 decisions and create ADRs for them. Here's how to approach different types:

### Example 1: Database Decision

If your analysis revealed PostgreSQL usage, create an ADR:

```json
{
  "tool": "generate_adr_from_decision",
  "parameters": {
    "decisionData": {
      "title": "Database Technology Selection - PostgreSQL",
      "context": "The application requires persistent data storage with ACID compliance, complex queries, and JSON support for flexible schema evolution.",
      "decision": "PostgreSQL as the primary database",
      "rationale": "PostgreSQL provides ACID compliance, excellent JSON support, mature ecosystem, strong performance for complex queries, and good scaling options. The team has existing expertise.",
      "consequences": [
        "Excellent data integrity and consistency",
        "Rich query capabilities with JSON support",
        "Mature tooling and monitoring ecosystem",
        "Requires PostgreSQL-specific knowledge for optimization",
        "More complex setup than simple NoSQL options"
      ]
    },
    "adrDirectory": "docs/adrs",
    "templateFormat": "standard"
  }
}
```

### Example 2: API Authentication

```json
{
  "tool": "generate_adr_from_decision",
  "parameters": {
    "decisionData": {
      "title": "API Authentication Strategy - JWT with Refresh Tokens",
      "context": "The API needs secure authentication that works across web and mobile clients, supports stateless scaling, and provides good user experience.",
      "decision": "JWT access tokens with refresh token rotation",
      "rationale": "JWT tokens enable stateless authentication suitable for microservices, refresh tokens provide security through rotation, widely supported across platforms, and enables horizontal scaling.",
      "consequences": [
        "Stateless authentication enables horizontal scaling",
        "Standardized approach works across all client types",
        "Refresh token rotation improves security",
        "Requires careful token expiration management",
        "Need secure storage for refresh tokens on clients"
      ]
    },
    "adrDirectory": "docs/adrs"
  }
}
```

### Exercise: Create Your First ADR

**Choose one decision from your priority list and create an ADR:**

1. **Identify the decision** from your analysis
2. **Research the context** - Why was this choice needed?
3. **Document the rationale** - What factors influenced the decision?
4. **List consequences** - Both positive and negative outcomes
5. **Generate the ADR** using the tool

---

## 🔄 Step 5: Validate Against Current Implementation

### Check Implementation Status

Once you have ADRs, validate they match the current implementation:

```json
{
  "tool": "compare_adr_progress",
  "parameters": {
    "adrDirectory": "docs/adrs",
    "includeEnvironmentCheck": true,
    "strictMode": true
  }
}
```

**This helps identify:**

- **Drift** - Implementation that doesn't match documented decisions
- **Evolution** - Decisions that have evolved but documentation hasn't
- **Gaps** - Implemented features without corresponding ADRs

### Update or Create New ADRs

If you find drift:

1. **Determine if the implementation is correct** - Should the code change?
2. **Or if the decision evolved** - Should the ADR be updated?
3. **Create new ADRs** for evolved decisions

---

## 📊 Step 6: Generate Implementation Tasks

### Create Actionable TODO Items

```json
{
  "tool": "generate_adr_todo",
  "parameters": {
    "adrDirectory": "docs/adrs",
    "todoFormat": "both",
    "includePriorities": true,
    "includeTimestamps": true
  }
}
```

**This creates tasks for:**

- **Documentation gaps** - Missing ADRs for implemented features
- **Implementation gaps** - Documented decisions not yet implemented
- **Consistency issues** - Code that doesn't match documented decisions
- **Maintenance tasks** - Updating dependencies or addressing technical debt

### Prioritize Tasks

Review the generated TODO items and prioritize based on:

1. **Security implications**
2. **User impact**
3. **Technical debt level**
4. **Team efficiency impact**

---

## 🔍 Step 7: Security and Compliance Review

### Scan for Security Issues

Existing projects often have security considerations that should be documented:

```json
{
  "tool": "analyze_content_security",
  "parameters": {
    "content": "Check configuration files, environment variables, and code for security issues",
    "contentType": "configuration"
  }
}
```

### Common Issues in Existing Projects

- **Hardcoded credentials** in configuration files
- **Outdated dependencies** with known vulnerabilities
- **Insecure defaults** in framework configurations
- **Missing security headers** in web applications
- **Inadequate input validation** patterns

### Document Security Decisions

Create ADRs for security-related decisions:

- **Authentication mechanisms**
- **Data encryption at rest and in transit**
- **Input validation strategies**
- **Security monitoring and logging**
- **Incident response procedures**

---

## 🎯 Step 8: Team Integration and Knowledge Sharing

### Share Findings with Your Team

1. **Present the analysis** to your development team
2. **Review suggested ADRs** for accuracy and completeness
3. **Validate decision rationale** with team members who made original choices
4. **Establish ongoing processes** for maintaining architectural documentation

### Create Team Workflows

```json
{
  "tool": "get_workflow_guidance",
  "parameters": {
    "goal": "Establish ongoing ADR maintenance process for development team",
    "currentPhase": "planning",
    "constraints": ["existing project", "distributed team", "varying experience levels"]
  }
}
```

### Exercise: Team Review Meeting

**Organize a 1-hour team meeting to:**

1. **Present the architectural analysis** (15 minutes)
2. **Review proposed ADRs** (20 minutes)
3. **Identify any missed decisions** (15 minutes)
4. **Establish maintenance process** (10 minutes)

---

## 🚀 Step 9: Deployment and Operations Documentation

### Analyze Deployment Decisions

Existing projects have deployment patterns that should be documented:

```json
{
  "tool": "analyze_deployment_progress",
  "parameters": {
    "analysisType": "deployment_status",
    "targetEnvironment": "production"
  }
}
```

### Generate Deployment Guidance

```json
{
  "tool": "generate_deployment_guidance",
  "parameters": {
    "adrDirectory": "docs/adrs",
    "targetEnvironment": "production",
    "includeSecurityChecks": true
  }
}
```

**Document decisions about:**

- **Infrastructure choices** (cloud provider, containerization)
- **CI/CD pipeline design**
- **Environment configuration management**
- **Monitoring and alerting strategies**
- **Backup and disaster recovery**

---

## 📈 Step 10: Continuous Improvement Process

### Establish Ongoing ADR Maintenance

Set up processes to keep your architectural documentation current:

1. **ADR Review in Code Reviews** - Include architectural impact assessment
2. **Regular Architecture Reviews** - Monthly or quarterly team reviews
3. **Decision Impact Tracking** - Monitor consequences of documented decisions
4. **New Decision Detection** - Flag significant architectural changes

### Monitor Implementation Progress

```json
{
  "tool": "smart_score",
  "parameters": {
    "operation": "recalculate_scores",
    "components": ["architecture_compliance", "deployment_readiness"],
    "projectPath": "."
  }
}
```

### Exercise: Create Maintenance Calendar

**Set up recurring tasks:**

- **Weekly**: Review TODO progress and update ADR implementation status
- **Monthly**: Team architectural review meeting
- **Quarterly**: Comprehensive architecture analysis and gap assessment

---

## 🎯 Success Criteria

By completing this tutorial, you should have:

✅ **Complete Project Understanding** - Comprehensive analysis of existing architecture  
✅ **Documented Key Decisions** - ADRs for 3-5 major architectural choices  
✅ **Implementation Roadmap** - TODO list with prioritized tasks  
✅ **Security Assessment** - Identified and documented security-related decisions  
✅ **Team Process** - Established workflow for ongoing ADR maintenance  
✅ **Deployment Documentation** - Understood and documented deployment decisions

---

## 🚀 What's Next?

### **Immediate Actions (This Week)**

1. **Complete your top 3 ADRs** based on the tutorial exercises
2. **Share findings with your team** and get validation
3. **Start implementing high-priority TODO items**

### **Short-term Goals (This Month)**

1. **Document remaining major decisions** (aim for 80% coverage)
2. **Establish team review process** for new architectural decisions
3. **Integrate ADR updates** into your development workflow

### **Continue Learning**

- **[Tutorial 3: Advanced Analysis Techniques](03-advanced-analysis.md)** - Security scanning, performance analysis, and deployment validation
- **[How-To: Work with Existing ADRs](../how-to-guides/work-with-existing-adrs.md)** - Advanced techniques for enhancing existing documentation

---

## 🆘 Common Challenges and Solutions

### **"Too Many Decisions to Document"**

**Solution**: Start with the top 5 most impactful decisions. You don't need to document everything at once.

### **"Team Doesn't Remember Why Decisions Were Made"**

**Solution**: Document current state and rationale based on code analysis. It's okay to say "inferred from implementation."

### **"Implementation Doesn't Match Any Clear Pattern"**

**Solution**: This indicates technical debt. Document the current state and create ADRs for desired future state.

### **"Existing Documentation is Outdated"**

**Solution**: Use the comparison tools to identify drift, then update documentation to match current reality.

---

## 🎓 Key Takeaways

1. **Every Project Has Architecture** - Even without formal ADRs, architectural decisions exist in code
2. **Documentation Pays Off** - The effort to document existing decisions helps new team members and future decisions
3. **Start Small** - Focus on the most impactful decisions first
4. **Keep It Current** - Establish processes to maintain documentation as the project evolves
5. **Team Collaboration** - The best architectural documentation comes from team collaboration and validation

---

**Congratulations!** You now know how to analyze existing projects and create comprehensive architectural documentation. Your team will thank you for making implicit decisions explicit and maintaining clear architectural guidance.

**Ready for more advanced techniques?** → **[Tutorial 3: Advanced Analysis Techniques](03-advanced-analysis.md)**

---

_This tutorial is part of the MCP ADR Analysis Server learning path. Each tutorial builds on the previous one while being useful on its own._
