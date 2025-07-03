# 📚 MCP ADR Analysis Server Documentation

Welcome to the comprehensive documentation for the MCP ADR Analysis Server. This collection of guides will help you get started with architectural decision analysis regardless of your project's current state.

## 🎯 Choose Your Starting Point

### 📋 New Project with PRD.md
**You have:** A Product Requirements Document (PRD.md) for a new project  
**You want:** Generate ADRs automatically from your requirements  
**Guide:** [Getting Started with PRD.md](getting-started-prd.md)

**Key Benefits:**
- Automatic ADR generation from requirements
- Structured architectural foundation
- Implementation roadmap creation
- Research question generation for complex decisions

---

### 🏗️ Existing Project with ADRs
**You have:** A project with existing Architectural Decision Records  
**You want:** Analyze, enhance, and maintain your ADR collection  
**Guide:** [Getting Started with Existing ADRs](getting-started-existing-adrs.md)

**Key Benefits:**
- ADR inventory and analysis
- Gap identification and suggestions
- Maintenance workflows
- Compliance validation

---

### 🆕 Existing Project without ADRs
**You have:** An existing codebase with no documented architectural decisions  
**You want:** Discover implicit decisions and start documenting architecture  
**Guide:** [Getting Started without ADRs](getting-started-no-adrs.md)

**Key Benefits:**
- Implicit decision discovery
- Technology stack analysis
- First ADR generation
- Architecture documentation bootstrap

---

## 📖 Complete Documentation

### Core Guides
- **[Usage Guide](USAGE_GUIDE.md)** - Comprehensive tool reference and workflows
- **[Getting Started with PRD.md](getting-started-prd.md)** - New projects with requirements
- **[Getting Started with Existing ADRs](getting-started-existing-adrs.md)** - Projects with ADRs
- **[Getting Started without ADRs](getting-started-no-adrs.md)** - Projects without ADRs

### Technical Documentation
- **[NPM Publishing Guide](NPM_PUBLISHING.md)** - Deploy your own MCP server
- **[Architecture Decisions](adrs/)** - Example ADRs from this project
- **[Research Templates](research/)** - Research documentation templates

## 🛠️ Quick Reference

### Essential Tools by Use Case

#### For New Projects (PRD.md)
```
generate_adrs_from_prd     # Convert PRD to ADRs
analyze_project_ecosystem  # Validate decisions
generate_adr_todo         # Create implementation tasks
```

#### For Existing ADRs
```
discover_existing_adrs    # Catalog current ADRs
suggest_adrs             # Find missing decisions
generate_adr_todo        # Extract action items
```

#### For Projects without ADRs
```
analyze_project_ecosystem # Understand current state
suggest_adrs             # Discover implicit decisions
generate_adr_from_decision # Create first ADRs
```

### Key Resources
```
adr://architectural_knowledge_graph  # Complete project analysis
adr://analysis_report               # Comprehensive reports
adr://adr_list                     # ADR inventory
```

## 🚀 Installation & Setup

### Quick Install
```bash
# Global installation
npm install -g mcp-adr-analysis-server

# Verify installation
mcp-adr-analysis-server --version
```

### MCP Client Configuration
```json
{
  "mcpServers": {
    "adr-analysis": {
      "command": "mcp-adr-analysis-server",
      "env": {
        "PROJECT_PATH": "/path/to/your/project",
        "ADR_DIRECTORY": "docs/adrs",
        "LOG_LEVEL": "INFO"
      }
    }
  }
}
```

## 🎯 Common Workflows

### Weekly ADR Maintenance
1. `discover_existing_adrs` - Check current state
2. `suggest_adrs` - Find new decisions needed
3. `generate_adr_todo` - Update action items

### New Feature Planning
1. `analyze_project_ecosystem` - Understand current state
2. `suggest_adrs` - Identify decisions needed
3. `generate_adr_from_decision` - Document decisions

### Architecture Review
1. `analyze_project_ecosystem` - Full analysis
2. `generate_rules` - Extract architectural rules
3. `validate_rules` - Check compliance

## 🔧 Advanced Features

### Content Security
- `analyze_content_security` - Detect sensitive information
- `generate_content_masking` - Protect sensitive data
- `configure_output_masking` - Set masking policies

### Research Integration
- `generate_research_questions` - Create research templates
- `incorporate_research` - Add findings to ADRs
- `request_action_confirmation` - Validate critical decisions

### Rule Management
- `generate_rules` - Extract architectural rules
- `validate_rules` - Check code compliance
- `create_rule_set` - Generate machine-readable rules

## 📊 Success Metrics

After using the MCP ADR Analysis Server, you should have:

✅ **Documented Architecture**
- Clear architectural decisions
- Rationale for each choice
- Consequences and trade-offs

✅ **Actionable Tasks**
- Implementation roadmap
- Prioritized todo list
- Clear next steps

✅ **Ongoing Process**
- Regular ADR reviews
- Decision tracking
- Architecture evolution

## 🆘 Getting Help

### Troubleshooting
- Check environment variables (`PROJECT_PATH`, `ADR_DIRECTORY`)
- Verify MCP client configuration
- Review log output for errors
- Clear cache if needed: `manage_cache` with action "clear"

### Support Resources
- **[GitHub Issues](https://github.com/tosin2013/mcp-adr-analysis-server/issues)** - Bug reports and feature requests
- **[Main README](../README.md)** - Complete project overview
- **[Usage Guide](USAGE_GUIDE.md)** - Detailed tool documentation

---

**Ready to get started?** Choose your scenario above and follow the appropriate guide!

**Author:** [Tosin Akinosho](https://github.com/tosin2013)  
**Repository:** [mcp-adr-analysis-server](https://github.com/tosin2013/mcp-adr-analysis-server)
