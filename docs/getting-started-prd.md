# 📋 Getting Started: New Projects with PRD.md

This guide helps you bootstrap architectural decisions for new projects using a Product Requirements Document (PRD.md). You'll learn how to automatically generate ADRs from requirements and create a solid architectural foundation.

## 📋 Prerequisites

### Required Software
- **Node.js** ≥18.0.0
- **MCP Client** (Claude Desktop, Cline, Cursor, or Windsurf)
- **PRD.md file** with your project requirements

### MCP Server Installation

```bash
# Global installation (recommended)
npm install -g mcp-adr-analysis-server

# Verify installation
mcp-adr-analysis-server --version
```

## ⚙️ Configuration

### Environment Setup

```bash
export PROJECT_PATH="/path/to/your/new/project"
export ADR_DIRECTORY="docs/adrs"
export LOG_LEVEL="INFO"
export CACHE_ENABLED="true"
```

### MCP Client Configuration

#### Claude Desktop
Add to `~/Library/Application Support/Claude/claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "adr-analysis": {
      "command": "mcp-adr-analysis-server",
      "env": {
        "PROJECT_PATH": "/path/to/your/new/project",
        "ADR_DIRECTORY": "docs/adrs",
        "LOG_LEVEL": "INFO"
      }
    }
  }
}
```

## 📝 PRD.md Requirements

Your PRD.md should include these sections for optimal ADR generation:

```markdown
# Product Requirements Document

## Technical Requirements
- Performance requirements
- Scalability needs
- Security requirements
- Integration requirements

## Architecture Constraints
- Technology preferences
- Platform requirements
- Compliance needs
- Budget constraints

## Non-Functional Requirements
- Availability requirements
- Maintainability needs
- Monitoring requirements
```

## 🚀 Step-by-Step Workflow

### Step 1: Generate ADRs from PRD

Transform your requirements into architectural decisions:

**Tool Call:**
```
generate_adrs_from_prd
```

**Parameters:**
```json
{
  "prdPath": "PRD.md",
  "outputDirectory": "docs/adrs"
}
```

**What this does:**
- Analyzes your PRD.md file
- Identifies architectural decision points
- Generates appropriate ADRs for each decision
- Creates properly formatted ADR files

**Expected Output:**
- Multiple ADR files in `docs/adrs/` directory
- Each ADR addresses a specific architectural decision
- ADRs follow standard format (Context, Decision, Consequences)
- Numbered sequence (001-xxx.md, 002-xxx.md, etc.)

### Step 2: Validate Generated Decisions

Ensure the generated ADRs make sense for your project:

**Tool Call:**
```
analyze_project_ecosystem
```

**Parameters:**
```json
{}
```

**What this does:**
- Analyzes your project structure (if any exists)
- Validates ADR decisions against project context
- Identifies potential conflicts or gaps
- Suggests refinements

**Expected Output:**
- Validation report for generated ADRs
- Recommendations for adjustments
- Technology stack compatibility analysis

### Step 3: Create Implementation Roadmap

Generate actionable tasks from your new ADRs:

**Tool Call:**
```
generate_adr_todo
```

**Parameters:**
```json
{
  "scope": "pending"
}
```

**What this does:**
- Extracts implementation tasks from ADRs
- Creates prioritized action items
- Identifies dependencies between decisions
- Generates development roadmap

**Expected Output:**
- `todo.md` file with implementation tasks
- Prioritized list of architectural work
- Dependencies and sequencing information

### Step 4: Research Critical Decisions

For complex decisions, generate research questions:

**Tool Call:**
```
generate_research_questions
```

**Parameters:**
```json
{
  "context": "Database selection for high-traffic application",
  "scope": "data_architecture",
  "researchAreas": ["performance", "scalability", "cost"]
}
```

**What this does:**
- Identifies areas needing additional research
- Generates specific research questions
- Creates research tracking templates
- Suggests validation approaches

## 🔄 Iterative Refinement

### Refining Generated ADRs

**1. Review and Enhance**
```
Tool: suggest_adrs
Parameters: {
  "analysisType": "comprehensive",
  "existingAdrs": ["Generated ADR titles"]
}
```

**2. Add Missing Decisions**
```
Tool: generate_adr_from_decision
Parameters: {
  "decisionData": {
    "title": "Additional Decision Title",
    "context": "Context from PRD analysis",
    "decision": "Specific architectural choice",
    "consequences": "Expected outcomes"
  }
}
```

### Incorporating Research Findings

**Tool Call:**
```
incorporate_research
```

**Parameters:**
```json
{
  "researchFindings": "Research results and conclusions",
  "targetAdr": "001-database-selection.md",
  "updateType": "enhance"
}
```

## 🎯 Common PRD Scenarios

### Scenario 1: Web Application

**PRD Focus:** User interface, API design, data management

**Expected ADRs:**
- Frontend framework selection
- API architecture (REST/GraphQL)
- Database choice
- Authentication strategy
- Deployment architecture

**Key Tools:**
1. `generate_adrs_from_prd` - Initial generation
2. `suggest_adrs` - Fill gaps (caching, monitoring, etc.)
3. `generate_research_questions` - For complex choices

### Scenario 2: Microservices Platform

**PRD Focus:** Scalability, service boundaries, data consistency

**Expected ADRs:**
- Service decomposition strategy
- Inter-service communication
- Data management approach
- Service discovery mechanism
- Monitoring and observability

**Key Tools:**
1. `generate_adrs_from_prd` - Core architecture
2. `analyze_environment` - Platform constraints
3. `generate_rules` - Service design principles

### Scenario 3: Mobile Application

**PRD Focus:** Platform support, offline capabilities, performance

**Expected ADRs:**
- Platform strategy (native/cross-platform)
- State management approach
- Offline data strategy
- Push notification system
- App store deployment

## 📊 Advanced Features

### Environment Analysis

Understand deployment and operational context:

**Tool Call:**
```
analyze_environment
```

**Parameters:**
```json
{
  "environmentType": "cloud",
  "constraints": ["budget", "compliance", "performance"]
}
```

### Rule Generation

Create architectural guidelines from your ADRs:

**Tool Call:**
```
generate_rules
```

**Parameters:**
```json
{
  "adrDirectory": "docs/adrs",
  "includeCompliance": true,
  "outputFormat": "json"
}
```

### Action Confirmation

For critical implementation steps:

**Tool Call:**
```
request_action_confirmation
```

**Parameters:**
```json
{
  "proposedAction": "Implement database migration strategy",
  "impactAssessment": "High - affects all data operations",
  "alternatives": ["Alternative approaches"]
}
```

## 🔧 Troubleshooting

### Common Issues

**PRD Not Parsed Correctly**
- Ensure PRD.md follows standard markdown format
- Include clear section headers
- Provide specific technical requirements

**Generated ADRs Too Generic**
- Add more technical details to PRD
- Include specific constraints and preferences
- Use `suggest_adrs` to add missing specifics

**Missing Critical Decisions**
- Review generated ADRs for gaps
- Use `analyze_project_ecosystem` for validation
- Manually create ADRs for missed decisions

## 📈 Best Practices

1. **Detailed PRD**: Include technical constraints and preferences
2. **Iterative Approach**: Generate, review, refine ADRs
3. **Research Integration**: Use research tools for complex decisions
4. **Validation**: Check ADRs against project constraints
5. **Implementation Planning**: Use todo generation for roadmap

## 🔄 Next Steps After ADR Generation

### 1. Team Review
- Share generated ADRs with team
- Gather feedback and refinements
- Update ADRs based on team input

### 2. Implementation Planning
- Use `generate_adr_todo` for detailed tasks
- Prioritize implementation order
- Identify dependencies and risks

### 3. Ongoing Maintenance
- Set up regular ADR reviews
- Use `suggest_adrs` for new decisions
- Validate implementation against ADRs

## 🔗 Related Documentation

- **[Usage Guide](USAGE_GUIDE.md)** - Complete tool reference
- **[Existing ADRs Guide](getting-started-existing-adrs.md)** - Managing existing decisions
- **[No ADRs Guide](getting-started-no-adrs.md)** - Starting from scratch

---

**Need Help?** Open an issue on [GitHub](https://github.com/tosin2013/mcp-adr-analysis-server/issues)
