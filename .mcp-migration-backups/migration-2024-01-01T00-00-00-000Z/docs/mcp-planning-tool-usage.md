# MCP Project Planning Tool - Usage Examples

This document demonstrates how to use the new MCP Project Planning Tool that addresses the gaps identified in issue #93.

## Tool Overview

The `mcp_planning` tool provides comprehensive project planning and workflow management capabilities that integrate seamlessly with existing ADR Analysis tools.

### Available Operations

1. **`create_project`** - Initialize project with phases, milestones, and team structure
2. **`manage_phases`** - Phase lifecycle management (planning → active → completed)
3. **`track_progress`** - Real-time progress monitoring with visual dashboards
4. **`manage_resources`** - Team member allocation and workload balancing
5. **`risk_analysis`** - Automated risk assessment based on ADR complexity
6. **`generate_reports`** - Executive summaries and status reports

## Usage Examples

### 1. Create a New Project

```json
{
  "tool": "mcp_planning",
  "arguments": {
    "operation": "create_project",
    "projectPath": "/path/to/your/project",
    "projectName": "ServiceNow OpenShift Integration",
    "description": "Integrate ServiceNow with OpenShift using Keycloak OIDC",
    "phases": [
      {
        "name": "Phase 1: Keycloak & OIDC Setup",
        "duration": "2 weeks",
        "dependencies": [],
        "milestones": ["Keycloak deployed", "OIDC configured"]
      },
      {
        "name": "Phase 2: ServiceNow Integration",
        "duration": "3 weeks",
        "dependencies": ["Phase 1"],
        "milestones": ["ServiceNow connected", "Authentication flow tested"]
      },
      {
        "name": "Phase 3: Testing & Deployment",
        "duration": "1 week",
        "dependencies": ["Phase 2"],
        "milestones": ["End-to-end testing complete", "Production deployment"]
      }
    ],
    "team": [
      {
        "name": "Alice Johnson",
        "role": "Architect",
        "skills": ["OpenShift", "Keycloak", "ADR"],
        "capacity": "40h/week"
      },
      {
        "name": "Bob Smith",
        "role": "Developer",
        "skills": ["ServiceNow", "JavaScript", "Integration"],
        "capacity": "35h/week"
      }
    ],
    "importFromAdrs": true,
    "importFromTodos": true
  }
}
```

**Result**: Creates a structured project plan with phases automatically linked to existing ADRs and TODO tasks.

### 2. Track Project Progress

```json
{
  "tool": "mcp_planning",
  "arguments": {
    "operation": "track_progress",
    "projectPath": "/path/to/your/project",
    "reportType": "summary",
    "updateTaskProgress": true,
    "includeVisuals": true
  }
}
```

**Result**: Generates a visual progress report with completion percentages and status indicators.

Example output:

```
# Project Progress Summary

## ServiceNow OpenShift Integration

### Overall Status
- **Progress**: 67% [█████████████▒░░░░░░]
- **Status**: active
- **Total Phases**: 3
- **Completed**: 1
- **Active**: 1
- **Blocked**: 0

### Current Focus
Currently working on 1 phase(s):
- Phase 2: ServiceNow Integration
```

### 3. Perform Risk Analysis

```json
{
  "tool": "mcp_planning",
  "arguments": {
    "operation": "risk_analysis",
    "projectPath": "/path/to/your/project",
    "analysisType": "comprehensive",
    "includeAdrRisks": true,
    "includeDependencyRisks": true,
    "includeResourceRisks": true,
    "generateMitigation": true
  }
}
```

**Result**: Identifies potential risks and provides mitigation strategies.

Example output:

```
# Risk Analysis Report

### Overall Risk Assessment
- **Risk Level**: MEDIUM
- **Risk Score**: 8
- **Total Risks**: 3

### Identified Risks

#### Risk 1: Dependencies
- **Description**: Phase "ServiceNow Integration" has multiple dependencies (2) - high coordination risk
- **Impact**: high
- **Probability**: medium
- **Mitigation**: Review and simplify dependencies, create detailed coordination plan
```

### 4. Manage Project Phases

```json
{
  "tool": "mcp_planning",
  "arguments": {
    "operation": "manage_phases",
    "projectPath": "/path/to/your/project",
    "action": "transition",
    "phaseId": "phase-id-from-list",
    "targetStatus": "active"
  }
}
```

**Result**: Transitions a phase status and updates completion tracking.

### 5. Generate Executive Report

```json
{
  "tool": "mcp_planning",
  "arguments": {
    "operation": "generate_reports",
    "projectPath": "/path/to/your/project",
    "reportType": "executive",
    "format": "markdown",
    "includeCharts": true,
    "timeframe": "month"
  }
}
```

**Result**: Creates comprehensive executive summary with key metrics and status.

## Integration with Existing Tools

### ADR Integration

- Automatically imports and links ADRs to relevant project phases
- Analyzes ADR complexity for risk assessment
- Updates project phases when new ADRs are created

### TODO System Integration

- Syncs task completion with phase progress
- Imports existing tasks into appropriate phases
- Updates project metrics based on task status

### Development Guidance Integration

- Converts development roadmaps into tracked project phases
- Links implementation tasks to architectural decisions
- Provides phase-specific development guidance

## Key Benefits Delivered

1. **Addresses Original Gaps**:
   - ✅ Development guidance integration with TODO management
   - ✅ Phase-based planning with native management
   - ✅ Enhanced dependency tracking and visualization
   - ✅ Visual progress tracking with Gantt-style views
   - ✅ Team coordination with capacity planning

2. **Seamless Integration**:
   - Works with existing ADR analysis tools
   - Integrates with TODO management system
   - Connects to development guidance workflows
   - Updates project health scoring

3. **Comprehensive Features**:
   - Phase lifecycle management
   - Risk analysis with mitigation strategies
   - Team resource allocation
   - Executive reporting and dashboards
   - Visual progress indicators

## Example Workflow

1. **Start**: Use `create_project` to initialize project structure
2. **Plan**: Use `manage_phases` to refine phase details and dependencies
3. **Allocate**: Use `manage_resources` to assign team members to phases
4. **Execute**: Work progresses, syncing with TODO system automatically
5. **Monitor**: Use `track_progress` for regular status updates
6. **Assess**: Use `risk_analysis` to identify and mitigate issues
7. **Report**: Use `generate_reports` for stakeholder communication

This tool successfully bridges the gap between architectural decisions and implementation workflows, providing the comprehensive project planning capabilities identified as missing in the original issue.
