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

## 💡 Resuming Previous Work? Use @.mcp-server-context.md

### Quick Context Recovery

If you're returning to a project you've analyzed before, the `.mcp-server-context.md` file is your best friend. Instead of re-running analysis or trying to remember what you discovered, simply ask:

```
@.mcp-server-context.md What was I working on? Show me the active intents
and what analysis has been done on this project.
```

**The AI will tell you:**

- What ADRs were suggested or created
- Which tools you used last time
- Patterns that were discovered
- Your last architecture score
- Recommended next steps

### Real Example

**You (after a week away):**

```
@.mcp-server-context.md I'm back to work on the microservices migration project.
What's the current status and what should I focus on?
```

**AI Response:**

```
Based on the context file, you were working on:

1. **Active Intent**: Microservices communication strategy (started 7 days ago)
   - Status: 60% complete
   - Last action: Analyzed API gateway options

2. **Discovered Patterns**:
   - Monolithic architecture (95% confidence)
   - REST API design (88% confidence)

3. **Current Score**: 72/100 (up 8 points from initial)

4. **Next Steps**:
   - Complete ADR for service communication
   - Define service boundaries
   - Plan data consistency strategy
```

### Why This Matters for Existing Projects

Existing projects often involve:

- **Long analysis sessions** spread across days/weeks
- **Multiple team members** working on different aspects
- **Complex decision trees** that need to be remembered
- **Historical context** that's easy to lose

The context file solves all of these problems automatically!

---

## 🔍 Step 1: Comprehensive Project Discovery

### Understanding What You're Working With

When analyzing an existing project, you need to understand:

- **Technology stack and dependencies**
- **Architectural patterns and design choices**
- **Existing documentation and standards**
- **Team conventions and practices**
- **Live infrastructure and deployment state** (using research-driven analysis)

### Research-Driven Discovery

Before running deep analysis, use **research-driven tools** to query your live environment:

```json
{
  "tool": "perform_research",
  "parameters": {
    "question": "What is the complete technology stack, deployment infrastructure, and architectural patterns in this existing project?",
    "projectPath": ".",
    "adrDirectory": "./adrs"
  }
}
```

**What the Research-Orchestrator Does:**

1. **Scans Project Files**: Analyzes package.json, requirements.txt, go.mod, etc.
2. **Queries Knowledge Graph**: Checks existing ADRs for documented decisions
3. **Probes Live Environment**: Detects Docker, Podman, kubectl, oc (OpenShift), ansible
4. **Assigns Confidence Score**: Tells you how reliable the findings are
5. **Falls Back to Web Search**: If confidence < 60%, searches for best practices

**Example Output:**

```markdown
## Research Results

**Confidence**: 92.0% ✓ (High confidence, no web search needed)

### Technology Stack

- **Backend**: Node.js 20.x with Express.js 4.18.x
- **Database**: PostgreSQL 15.x (found in docker-compose.yml)
- **Frontend**: React 18.x with TypeScript
- **Container Orchestration**: Docker Compose (local), Kubernetes (production)

### Infrastructure Capabilities Detected

✓ docker - Container runtime available
✓ docker-compose - Multi-container orchestration
✓ kubectl - Kubernetes CLI configured
✓ oc - OpenShift CLI detected (Red Hat ecosystem)
✗ podman - Not installed
✓ ansible - Configuration management available

### Architectural Insights

- Microservices architecture with 3 services
- Event-driven communication via message queue
- RESTful API design with versioning
- Documented in ADR-001, ADR-003, ADR-007
```

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
    "adrDirectory": "./adrs",
    "projectPath": "."
  }
}
```

**Common ADR Locations to Check:**

- `././adrs/`
- `./decisions/`
- `./architecture/`
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
    "adrDirectory": "./adrs",
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
    "adrDirectory": "./adrs"
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

### Research-Driven ADR Validation

Use the new **research-driven validation** to check if documented decisions match actual infrastructure:

```json
{
  "tool": "validate_all_adrs",
  "parameters": {
    "projectPath": ".",
    "adrDirectory": "./adrs",
    "includeEnvironmentCheck": true,
    "minConfidence": 0.6
  }
}
```

**Research-Driven Validation Process:**

1. **Reads each ADR** to extract the documented decision
2. **Researches live environment** using research-orchestrator:
   - Scans project files for actual implementation
   - Queries knowledge graph for related decisions
   - Checks live infrastructure (Docker, Kubernetes, OpenShift, etc.)
3. **Compares with confidence scoring**
4. **Reports gaps, drift, or confirmation**

**Example Validation Report:**

```markdown
## ADR Validation Report - Research Confidence: 85.0% ✓

### ADR-001: PostgreSQL Database Selection

**Status**: ✓ VALIDATED

- PostgreSQL 15.x running in Docker container
- Connection string found in .env.example
- Migration scripts present in db/migrations/
- Research Confidence: 95.0% ✓

### ADR-003: Kubernetes Deployment

**Status**: ⚠️ DRIFT DETECTED

- ADR specifies Kubernetes, but OpenShift (oc) is primary tool
- Kubernetes manifests exist but unused
- OpenShift templates in openshift/ directory are actively used
- **Recommendation**: Update ADR or create ADR-008 for OpenShift migration
- Research Confidence: 88.0% ✓

### ADR-007: Redis Caching

**Status**: ✗ NOT IMPLEMENTED

- No Redis container in docker-compose.yml
- No Redis client in package.json
- Caching code commented out in src/cache/
- Research Confidence: 92.0% ✓

### Environment Infrastructure Detected

✓ docker, kubectl, oc, ansible
```

**Why This Matters:**

- **Prevents documentation rot** - Keep ADRs aligned with reality
- **Discovers undocumented changes** - Find OpenShift adoption without ADR
- **Identifies incomplete implementations** - Redis decision never executed

### Check Implementation Status (Traditional)

For comparison tracking over time:

```json
{
  "tool": "compare_adr_progress",
  "parameters": {
    "adrDirectory": "./adrs",
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
3. **Create new ADRs** for evolved decisions (e.g., ADR-008: Migration from Kubernetes to OpenShift)

---

## 📊 Step 6: Generate Implementation Tasks

### Create Actionable TODO Items

```json
{
  "tool": "generate_adr_todo",
  "parameters": {
    "adrDirectory": "./adrs",
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

### Research-Driven Deployment Analysis

Use research-driven tools to analyze actual deployment infrastructure:

```json
{
  "tool": "analyze_deployment_progress",
  "parameters": {
    "analysisType": "comprehensive",
    "targetEnvironment": "production",
    "adrDirectory": "./adrs"
  }
}
```

**Research-Driven Deployment Analysis:**

1. **Queries live environment** for deployment capabilities:
   - Docker/Podman container runtimes
   - Kubernetes/OpenShift orchestration
   - Ansible automation
2. **Scans project files** for deployment configurations
3. **Checks ADRs** for documented deployment decisions
4. **Provides confidence-scored recommendations**

**Example Output:**

```markdown
## 🔍 Environment Research Analysis

**Research Confidence**: 91.0% ✓

### Current Environment State

- **Container Runtime**: Docker 24.x + Podman 4.x (hybrid setup)
- **Orchestration**: OpenShift 4.14 (oc CLI detected and configured)
- **Automation**: Ansible 2.15 with 12 playbooks
- **CI/CD**: GitHub Actions + Tekton pipelines on OpenShift

### Available Infrastructure

✓ docker - Container builds and local testing
✓ podman - Rootless containers for development
✓ oc - OpenShift CLI (primary deployment target)
✓ kubectl - Kubernetes API access (via OpenShift)
✓ ansible - Infrastructure automation
✗ helm - Not installed (consider for package management)

### Deployment Patterns from ADRs

- ADR-003: Kubernetes deployment (OUTDATED - migrated to OpenShift)
- ADR-009: Continuous deployment via Tekton
- ADR-011: Infrastructure as Code with Ansible

### Recommendations

1. Update ADR-003 or create ADR-015 for OpenShift migration
2. Document Tekton pipeline decisions in new ADR
3. Consider Helm charts for easier OpenShift deployments
```

### Generate Infrastructure-Aware Deployment Guidance

```json
{
  "tool": "generate_deployment_guidance",
  "parameters": {
    "adrDirectory": "./adrs",
    "targetEnvironment": "production",
    "includeSecurityChecks": true,
    "includeScripts": true,
    "includeRollback": true
  }
}
```

**Research-Enhanced Guidance Includes:**

- **Actual infrastructure commands** based on detected tools (oc vs kubectl)
- **Environment-specific configurations** from live system
- **Red Hat ecosystem integration** (OpenShift, Podman, Ansible)
- **Security checks** for production readiness
- **Rollback procedures** for safe deployments

**Document decisions about:**

- **Infrastructure choices** (cloud provider, containerization, Red Hat vs upstream)
- **CI/CD pipeline design** (Tekton, GitHub Actions, Jenkins)
- **Environment configuration management** (Ansible, ConfigMaps, Secrets)
- **Monitoring and alerting strategies** (Prometheus, Grafana, OpenShift monitoring)
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
