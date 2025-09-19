/**
 * Prompts for TODO management and task orchestration
 * Converts TODO operations to LLM-executable prompts
 */

import { ConversationContext } from '../types/conversation-context.js';

/**
 * Generate prompt for creating TODO tasks from ADRs
 */
export function generateTodoCreationPrompt(args: {
  adrDirectory?: string;
  scope?: 'all' | 'pending' | 'in_progress';
  phase?: 'both' | 'test' | 'production';
  linkAdrs?: boolean;
  includeRules?: boolean;
  ruleSource?: 'adrs' | 'patterns' | 'both';
  projectPath?: string;
  conversationContext?: ConversationContext;
}): string {
  const {
    adrDirectory = 'docs/adrs',
    scope = 'all',
    phase = 'both',
    linkAdrs = true,
    includeRules = true,
    ruleSource = 'both',
    projectPath = '.',
  } = args;

  return `# Generate Development Tasks from ADRs

## Task Generation Instructions

You are an expert task planner specializing in breaking down Architectural Decision Records (ADRs) into actionable development tasks. Your goal is to create a comprehensive task list that will guide implementation of architectural decisions.

## Project Context
- **ADR Directory**: ${adrDirectory}
- **Project Path**: ${projectPath}
- **Task Scope**: ${scope}
- **Development Phase**: ${phase}
- **ADR Linking**: ${linkAdrs ? 'Enabled' : 'Disabled'}
- **Include Rules**: ${includeRules ? `Yes (${ruleSource})` : 'No'}

## Analysis Requirements

### 1. ADR Discovery and Analysis
First, discover and analyze all ADRs in the specified directory:
- Read all ADR files in ${adrDirectory}
- Parse ADR structure (title, status, context, decision, consequences)
- Identify implementation requirements from each ADR
- Extract architectural patterns and constraints

### 2. Task Categorization
Organize tasks by these categories:

**Infrastructure & Platform**
- Cloud provider setup (AWS, GCP, Azure)
- Container orchestration (Docker, Kubernetes)
- Infrastructure as Code (Terraform, CloudFormation)
- Monitoring and observability setup

**Backend Development**
- API design and implementation
- Database schema and migrations
- Service architecture and microservices
- Authentication and authorization

**Frontend Development**
- UI framework setup and configuration
- Component library development
- State management implementation
- Responsive design and accessibility

**DevOps & CI/CD**
- Pipeline configuration (GitHub Actions, GitLab CI, Jenkins)
- Deployment automation
- Environment management
- Security scanning and compliance

**Testing & Quality Assurance**
- Unit test setup and implementation
- Integration testing
- Performance testing
- Security testing

**Documentation & Governance**
- Technical documentation
- API documentation
- Architectural guides
- Compliance documentation

### 3. Task Prioritization Framework
Use this prioritization matrix:

**Critical (P0)** - Must be completed first:
- Security implementations
- Core infrastructure setup
- Database schema creation
- Essential API endpoints

**High (P1)** - Core functionality:
- Main feature implementations
- Integration points
- Performance optimizations
- Core testing suites

**Medium (P2)** - Important but not blocking:
- Enhanced features
- Additional integrations
- Advanced monitoring
- Extended testing

**Low (P3)** - Nice to have:
- UI polish
- Advanced analytics
- Optional integrations
- Documentation improvements

### 4. Task Dependencies
${
  linkAdrs
    ? `
Map dependencies between tasks:
- Identify prerequisite relationships
- Note ADR dependencies
- Mark blocking/non-blocking relationships
- Create implementation ordering
`
    : 'Focus on individual task completion without complex dependencies.'
}

### 5. Implementation Phases
${
  phase === 'both'
    ? `
Create tasks for both phases:

**Test Phase Tasks:**
- Test setup and configuration
- Mock data creation
- Test environment setup
- Automated testing implementation

**Production Phase Tasks:**
- Production environment setup
- Performance optimization
- Security hardening
- Monitoring and alerting
`
    : phase === 'test'
      ? `
Focus on test-related tasks:
- Test framework setup
- Mock implementations
- Test data generation
- CI/CD testing integration
`
      : `
Focus on production implementation:
- Production-ready code
- Performance optimization
- Security implementation
- Production deployment
`
}

### 6. Architecture Rule Integration
${
  includeRules
    ? `
Include architectural rules and constraints from:
${
  ruleSource === 'both'
    ? '- ADR documents\n- Detected architectural patterns'
    : ruleSource === 'adrs'
      ? '- ADR documents only'
      : '- Architectural patterns only'
}

For each task, ensure compliance with:
- Defined architectural principles
- Security requirements
- Performance standards
- Scalability constraints
- Technology stack decisions
`
    : 'Skip architectural rules integration.'
}

## Output Format

Provide a comprehensive task breakdown in this format:

\`\`\`markdown
# Development Task Plan - Generated from ADRs

## Executive Summary
- Total ADRs analyzed: [number]
- Total tasks created: [number]
- Estimated timeline: [timeline]
- Critical path items: [number]

## Critical Path (P0) - Must Complete First
### Infrastructure Setup
- [ ] **[Task Name]** (ADR: [ADR-001]) - [Description]
  - Dependencies: [list]
  - Estimated effort: [hours/days]
  - Acceptance criteria: [criteria]

### Security Foundation
- [ ] **[Task Name]** (ADR: [ADR-002]) - [Description]
  - Dependencies: [list]
  - Estimated effort: [hours/days]
  - Acceptance criteria: [criteria]

## High Priority (P1) - Core Implementation
### Backend Services
- [ ] **[Task Name]** (ADR: [ADR-003]) - [Description]
  - Dependencies: [list]
  - Estimated effort: [hours/days]
  - Acceptance criteria: [criteria]

### API Development
- [ ] **[Task Name]** (ADR: [ADR-004]) - [Description]
  - Dependencies: [list]
  - Estimated effort: [hours/days]
  - Acceptance criteria: [criteria]

## Medium Priority (P2) - Enhancement Features
### Advanced Features
- [ ] **[Task Name]** (ADR: [ADR-005]) - [Description]
  - Dependencies: [list]
  - Estimated effort: [hours/days]
  - Acceptance criteria: [criteria]

## Low Priority (P3) - Polish & Optimization
### UI/UX Enhancements
- [ ] **[Task Name]** (ADR: [ADR-006]) - [Description]
  - Dependencies: [list]
  - Estimated effort: [hours/days]
  - Acceptance criteria: [criteria]

## Implementation Timeline
### Phase 1 (Weeks 1-2): Foundation
- Complete all P0 tasks
- Begin P1 infrastructure tasks

### Phase 2 (Weeks 3-6): Core Development
- Complete P1 tasks
- Begin P2 feature development

### Phase 3 (Weeks 7-8): Enhancement & Polish
- Complete P2 tasks
- Address P3 items as time permits

## Risk Assessment
### High Risk Items
- [Task with significant complexity or dependencies]
- [Tasks requiring external dependencies]

### Mitigation Strategies
- [Specific strategies for high-risk items]

## Quality Gates
- [ ] All P0 tasks have passing tests
- [ ] Security review completed for critical components
- [ ] Performance benchmarks met
- [ ] Documentation complete for public APIs

## Success Metrics
- Feature completion rate: [target]
- Code coverage: [target]
- Performance benchmarks: [specific metrics]
- Security compliance: [checklist]
\`\`\`

## Special Instructions

1. **Cloud/DevOps Focus**: Given expertise in AWS, GCP, Azure, Docker, Kubernetes, and Terraform, provide detailed cloud-native implementation tasks.

2. **Security-First Approach**: Prioritize security tasks and ensure security considerations are embedded in all phases.

3. **Scalability Considerations**: Include tasks for horizontal scaling, load balancing, and performance optimization.

4. **Monitoring & Observability**: Include comprehensive monitoring, logging, and alerting tasks.

5. **Infrastructure as Code**: Prefer Infrastructure as Code approaches for all infrastructure tasks.

6. **Container-First**: Assume containerized deployments and include container optimization tasks.

7. **CI/CD Integration**: Include automated testing, building, and deployment pipeline tasks.

## Begin Analysis

Please analyze the ADRs in ${adrDirectory} and generate a comprehensive task plan following the above guidelines.`;
}

/**
 * Generate prompt for task status management
 */
export function generateTaskStatusPrompt(args: {
  action: 'list' | 'update' | 'complete' | 'prioritize';
  taskId?: string;
  newStatus?: string;
  filters?: string[];
  conversationContext?: ConversationContext;
}): string {
  const { action, taskId, newStatus, filters = [] } = args;

  switch (action) {
    case 'list':
      return `# List Development Tasks

## Task Listing Instructions

You are a task manager reviewing the current development task status. Provide a comprehensive overview of all tasks with their current status and priorities.

## Filtering Criteria
${
  filters.length > 0
    ? `
Apply these filters:
${filters.map(filter => `- ${filter}`).join('\n')}
`
    : 'Show all tasks without filtering.'
}

## Output Format

Please provide a task status report in this format:

\`\`\`markdown
# Task Status Report - ${new Date().toLocaleDateString()}

## Summary
- Total tasks: [number]
- Completed: [number] ([percentage]%)
- In Progress: [number] ([percentage]%)
- Pending: [number] ([percentage]%)
- Blocked: [number] ([percentage]%)

## Critical Path Status
### P0 (Critical) Tasks
- ✅ [Completed Task] - [Brief description]
- 🔄 [In Progress Task] - [Brief description] - [% complete]
- ⏳ [Pending Task] - [Brief description]
- 🚫 [Blocked Task] - [Brief description] - [Blocking reason]

### P1 (High Priority) Tasks
- [Same format as above]

### P2 (Medium Priority) Tasks
- [Same format as above]

### P3 (Low Priority) Tasks
- [Same format as above]

## Upcoming Deadlines
- [Task name] - Due: [date]
- [Task name] - Due: [date]

## Blockers & Issues
- [Blocked task] - [Blocking issue] - [Resolution needed]

## Recommendations
- [Specific action items to maintain progress]
- [Resource allocation suggestions]
- [Risk mitigation recommendations]
\`\`\`

Please analyze the current task status and provide this report.`;

    case 'update':
      return `# Update Task Status

## Task Update Instructions

You are updating the status of a specific development task. Ensure the update is tracked properly and dependencies are considered.

## Task Information
- **Task ID**: ${taskId || 'Not specified'}
- **New Status**: ${newStatus || 'Not specified'}

## Update Process

1. **Validate Task**: Confirm the task exists and current status
2. **Check Dependencies**: Ensure status change doesn't conflict with dependent tasks
3. **Update Status**: Apply the new status with timestamp
4. **Update Dependents**: Notify or update dependent tasks if needed
5. **Log Changes**: Record the status change with reason

## Output Format

\`\`\`markdown
# Task Status Update - ${taskId || '[Task ID]'}

## Update Summary
- **Previous Status**: [previous status]
- **New Status**: ${newStatus || '[new status]'}
- **Updated By**: [user/system]
- **Timestamp**: ${new Date().toISOString()}

## Impact Analysis
### Dependent Tasks Affected
- [Task name] - [Impact description]
- [Task name] - [Impact description]

### Timeline Impact
- [Any schedule changes]
- [Critical path impact]

## Next Actions Required
- [Immediate actions needed]
- [Follow-up tasks to create]

## Validation Checklist
- [ ] Task exists in system
- [ ] Status change is valid
- [ ] Dependencies checked
- [ ] Timeline updated
- [ ] Stakeholders notified
\`\`\`

Please process this task status update.`;

    case 'complete':
      return `# Complete Development Task

## Task Completion Instructions

You are marking a development task as complete. Ensure all completion criteria are met and proper validation is performed.

## Task Information
- **Task ID**: ${taskId || 'Not specified'}

## Completion Validation Process

1. **Verify Completion Criteria**: Check that all acceptance criteria are met
2. **Test Validation**: Ensure all tests pass
3. **Code Review**: Confirm code review is complete (if applicable)
4. **Documentation**: Verify documentation is updated
5. **Deployment**: Confirm deployment is successful (if applicable)
6. **Update Dependencies**: Mark dependent tasks as ready

## Output Format

\`\`\`markdown
# Task Completion Report - ${taskId || '[Task ID]'}

## Completion Verification
- **Task**: [task name and description]
- **Completed By**: [user]
- **Completion Date**: ${new Date().toISOString()}

## Acceptance Criteria Verification
- [ ] [Criterion 1] - ✅ Met / ❌ Not Met
- [ ] [Criterion 2] - ✅ Met / ❌ Not Met
- [ ] [Criterion 3] - ✅ Met / ❌ Not Met

## Quality Gates
- [ ] All tests passing
- [ ] Code review approved
- [ ] Documentation updated
- [ ] Security review (if required)
- [ ] Performance benchmarks met

## Deployment Status
- [ ] Deployed to development
- [ ] Deployed to staging
- [ ] Deployed to production

## Impact on Project
### Unblocked Tasks
- [Task name] - Now ready to start
- [Task name] - Can proceed to next phase

### Milestone Progress
- [Milestone name] - [X]% complete

## Lessons Learned
- [What went well]
- [What could be improved]
- [Process improvements]

## Next Steps
- [Immediate follow-up actions]
- [Related tasks to prioritize]
\`\`\`

Please validate and process this task completion.`;

    case 'prioritize':
      return `# Prioritize Development Tasks

## Task Prioritization Instructions

You are reviewing and adjusting task priorities based on current project needs, blockers, and business requirements.

## Prioritization Framework

### Priority Levels
- **P0 (Critical)**: Must be completed immediately, blocks other work
- **P1 (High)**: Core functionality, needed for project success
- **P2 (Medium)**: Important features, enhances project value
- **P3 (Low)**: Nice to have, can be deferred

### Prioritization Criteria
1. **Business Impact**: Revenue/user impact
2. **Technical Dependencies**: What it blocks/enables
3. **Risk Level**: Implementation complexity and risk
4. **Resource Availability**: Team capacity and skills
5. **Timeline Constraints**: External deadlines
6. **Technical Debt**: Impact on code quality and maintainability

## Analysis Process

1. **Current Priority Review**: Assess current task priorities
2. **Dependency Analysis**: Map task dependencies and critical path
3. **Resource Analysis**: Consider team capacity and skills
4. **Business Value Assessment**: Evaluate business impact
5. **Risk Assessment**: Identify high-risk tasks
6. **Timeline Analysis**: Consider deadlines and milestones

## Output Format

\`\`\`markdown
# Task Prioritization Review - ${new Date().toLocaleDateString()}

## Executive Summary
- Tasks reviewed: [number]
- Priority changes: [number]
- Critical path changes: [yes/no]
- Timeline impact: [description]

## Priority Changes
### Elevated to P0 (Critical)
- [Task name] - **Reason**: [specific reason for elevation]
- [Task name] - **Reason**: [specific reason for elevation]

### Elevated to P1 (High)
- [Task name] - **Reason**: [specific reason]

### Lowered Priority
- [Task name] - **From P1 to P2** - **Reason**: [specific reason]

## Current Priority Distribution
- **P0 Tasks**: [number] - Focus: [focus area]
- **P1 Tasks**: [number] - Focus: [focus area]
- **P2 Tasks**: [number] - Focus: [focus area]
- **P3 Tasks**: [number] - Focus: [focus area]

## Critical Path Analysis
### Current Critical Path
1. [Task 1] → [Task 2] → [Task 3]
2. [Parallel path tasks]

### Bottlenecks Identified
- [Bottleneck description] - **Impact**: [impact] - **Mitigation**: [strategy]

## Resource Allocation Recommendations
### Immediate Focus (Next Sprint)
- [Team/Person]: [P0 tasks]
- [Team/Person]: [P1 tasks]

### Medium Term (Next Month)
- [Resource allocation strategy]

## Risk Mitigation
- **High Risk Tasks**: [list with mitigation strategies]
- **Dependencies**: [external dependencies to track]

## Success Metrics
- **Sprint Goal Achievement**: [target]
- **Critical Path Completion**: [target date]
- **Quality Gates**: [quality metrics to maintain]
\`\`\`

Please analyze current task priorities and provide recommendations.`;

    default:
      return `# Task Management Action

Please specify a valid action: list, update, complete, or prioritize.`;
  }
}

/**
 * Generate prompt for task dependency analysis
 */
export function generateDependencyAnalysisPrompt(args: {
  taskId?: string;
  includeUpstream?: boolean;
  includeDownstream?: boolean;
  analysisDepth?: 'shallow' | 'deep';
  conversationContext?: ConversationContext;
}): string {
  const { taskId, includeUpstream = true, includeDownstream = true, analysisDepth = 'deep' } = args;

  return `# Task Dependency Analysis

## Dependency Analysis Instructions

You are analyzing task dependencies to understand the impact of changes, identify bottlenecks, and optimize the development workflow.

## Analysis Configuration
- **Target Task**: ${taskId || 'All tasks'}
- **Include Upstream Dependencies**: ${includeUpstream ? 'Yes' : 'No'}
- **Include Downstream Dependencies**: ${includeDownstream ? 'Yes' : 'No'}
- **Analysis Depth**: ${analysisDepth}

## Analysis Framework

### Dependency Types
1. **Hard Dependencies**: Must be completed before this task can start
2. **Soft Dependencies**: Preferred to be completed first, but not blocking
3. **Resource Dependencies**: Require the same person/team
4. **Technical Dependencies**: Share code, infrastructure, or data
5. **Business Dependencies**: Share business logic or user flows

### Impact Categories
- **Critical Path Impact**: Affects project timeline
- **Quality Impact**: Affects deliverable quality
- **Risk Impact**: Increases project risk
- **Resource Impact**: Affects team productivity

## Output Format

\`\`\`markdown
# Dependency Analysis Report

## Analysis Summary
- **Target Task**: ${taskId || 'All tasks'}
- **Analysis Date**: ${new Date().toISOString()}
- **Dependencies Found**: [number]
- **Critical Path Impact**: [yes/no]

${
  includeUpstream
    ? `
## Upstream Dependencies (Prerequisites)
### Critical Dependencies
- **[Task Name]** - [Dependency Type] - [Impact Level]
  - **Relationship**: [Description of dependency]
  - **Status**: [Current status]
  - **Risk**: [Risk if delayed]
  - **Mitigation**: [How to reduce dependency]

### Soft Dependencies
- **[Task Name]** - [Dependency Type] - [Impact Level]
  - **Relationship**: [Description]
  - **Status**: [Current status]
  - **Alternative**: [Workaround if needed]
`
    : ''
}

${
  includeDownstream
    ? `
## Downstream Dependencies (Blockers)
### Tasks Blocked by This Task
- **[Task Name]** - [Dependency Type] - [Impact Level]
  - **Waiting For**: [What specifically they need]
  - **Impact if Delayed**: [Business/technical impact]
  - **Partial Delivery**: [What can be delivered early]

### Cascading Effects
- **[Task Chain]**: [Task A] → [Task B] → [Task C]
  - **Total Impact**: [Timeline impact]
  - **Risk Level**: [Assessment]
`
    : ''
}

## Critical Path Analysis
### Current Critical Path
1. [Task 1] - [Duration] - [Status]
2. [Task 2] - [Duration] - [Status]
3. [Task 3] - [Duration] - [Status]

**Total Critical Path Duration**: [time]
**Latest Acceptable Start**: [date]

### Alternative Paths
- **Path A**: [Task sequence] - Duration: [time]
- **Path B**: [Task sequence] - Duration: [time]

## Bottleneck Identification
### Current Bottlenecks
- **[Resource/Task]**: [Description of bottleneck]
  - **Impact**: [How it affects timeline]
  - **Mitigation**: [Specific actions to resolve]

### Potential Future Bottlenecks
- **[Resource/Task]**: [Predicted bottleneck]
  - **When**: [Predicted timing]
  - **Prevention**: [How to avoid]

## Optimization Recommendations
### Immediate Actions
1. **Parallel Execution**: [Tasks that can run in parallel]
2. **Early Starts**: [Tasks that can start with partial dependencies]
3. **Resource Reallocation**: [Specific resource moves]

### Strategic Improvements
1. **Dependency Reduction**: [How to reduce key dependencies]
2. **Process Improvements**: [Workflow optimizations]
3. **Technical Improvements**: [Architectural changes to reduce dependencies]

## Risk Assessment
### High-Risk Dependencies
- **[Dependency]**: [Risk description]
  - **Probability**: [Low/Medium/High]
  - **Impact**: [Low/Medium/High]
  - **Mitigation**: [Specific plan]

### Contingency Plans
- **If [Task] is delayed**: [Alternative approach]
- **If [Resource] is unavailable**: [Backup plan]

## Monitoring Recommendations
### Key Metrics to Track
- [Task completion rate for critical path]
- [Dependency resolution time]
- [Bottleneck duration]

### Alert Triggers
- [Critical path delay > X days]
- [Bottleneck duration > Y hours]
- [Dependencies unresolved for > Z days]
\`\`\`

Please analyze the task dependencies and provide this comprehensive report.`;
}

/**
 * Generate prompt for task estimation and planning
 */
export function generateTaskEstimationPrompt(args: {
  taskId?: string;
  estimationType?: 'effort' | 'duration' | 'resources';
  includeUncertainty?: boolean;
  granularity?: 'high' | 'medium' | 'low';
  conversationContext?: ConversationContext;
}): string {
  const {
    taskId,
    estimationType = 'duration',
    includeUncertainty = true,
    granularity = 'medium',
  } = args;

  return `# Task Estimation and Planning

## Estimation Instructions

You are providing effort and timeline estimates for development tasks. Use industry best practices and consider uncertainty factors.

## Estimation Configuration
- **Target Task**: ${taskId || 'All tasks'}
- **Estimation Type**: ${estimationType}
- **Include Uncertainty**: ${includeUncertainty ? 'Yes' : 'No'}
- **Granularity**: ${granularity}

## Estimation Framework

### Effort Categories
- **Development**: Core coding and implementation
- **Testing**: Unit, integration, and system testing
- **Documentation**: Technical and user documentation
- **Review**: Code review and feedback incorporation
- **Deployment**: Deployment and configuration
- **Buffer**: Contingency for unknowns (typically 20-30%)

### Complexity Factors
- **Technical Complexity**: Algorithm complexity, integration points
- **Domain Complexity**: Business logic complexity
- **Infrastructure Complexity**: Deployment and operational complexity
- **Team Familiarity**: Experience with technologies and domain

### Uncertainty Factors
- **Requirements Clarity**: How well-defined the requirements are
- **Technical Risk**: Likelihood of technical challenges
- **External Dependencies**: Reliance on external teams/systems
- **Resource Availability**: Team availability and skills

## Output Format

\`\`\`markdown
# Task Estimation Report

## Estimation Summary
- **Task**: ${taskId || 'All tasks'}
- **Estimation Date**: ${new Date().toISOString()}
- **Estimator**: [Name/Role]
- **Confidence Level**: [High/Medium/Low]

## Detailed Estimates

### ${taskId || '[Task Name]'}
**Description**: [Task description]

#### Effort Breakdown
- **Development**: [X hours] - [Details]
- **Testing**: [X hours] - [Details]
- **Documentation**: [X hours] - [Details]
- **Code Review**: [X hours] - [Details]
- **Deployment**: [X hours] - [Details]
- **Buffer (25%)**: [X hours] - [Uncertainty factors]

**Total Effort**: [X hours] ([X days])

#### Timeline Estimate
- **Best Case**: [X days] (everything goes well)
- **Most Likely**: [X days] (realistic scenario)
- **Worst Case**: [X days] (significant challenges)

${
  includeUncertainty
    ? `
#### Uncertainty Analysis
**High Uncertainty Factors**:
- [Factor 1]: [Impact description]
- [Factor 2]: [Impact description]

**Risk Mitigation**:
- [Strategy 1]: [How to reduce uncertainty]
- [Strategy 2]: [How to reduce uncertainty]

**Confidence Intervals**:
- 50% confidence: [X-Y days]
- 80% confidence: [X-Y days]
- 95% confidence: [X-Y days]
`
    : ''
}

#### Dependencies Impact
- **Prerequisites**: [List] - [Timeline impact]
- **Parallel Work**: [What can run in parallel]
- **Critical Path**: [Is this on critical path? Impact?]

#### Resource Requirements
- **Primary Developer**: [Skill level needed] - [X hours]
- **Secondary Developer**: [If pair programming] - [X hours]
- **Reviewer**: [Skill level needed] - [X hours]
- **QA/Tester**: [If specialized testing] - [X hours]

#### Assumptions
- [Assumption 1]: [Impact if wrong]
- [Assumption 2]: [Impact if wrong]
- [Assumption 3]: [Impact if wrong]

## Estimation Methodology
### Techniques Used
- **Historical Data**: [Reference to similar past tasks]
- **Expert Judgment**: [Expertise applied]
- **Decomposition**: [How task was broken down]
- **Three-Point Estimation**: [Best/Most Likely/Worst case reasoning]

### Validation Checks
- [ ] Compared with similar historical tasks
- [ ] Reviewed by team members
- [ ] Considered all complexity factors
- [ ] Included adequate buffer time
- [ ] Validated assumptions

## Recommendations
### For Improved Accuracy
1. **Spike Tasks**: [Recommend research tasks for high uncertainty items]
2. **Proof of Concept**: [Recommend POC for technical risks]
3. **Regular Re-estimation**: [When to re-estimate]

### For Risk Management
1. **Parallel Development**: [What can be done in parallel]
2. **Early Validation**: [How to validate assumptions early]
3. **Contingency Planning**: [Alternative approaches]

## Tracking and Updates
### Success Metrics
- **Estimate Accuracy**: [How to measure]
- **Progress Tracking**: [What to track daily/weekly]
- **Course Correction Triggers**: [When to adjust]

### Update Schedule
- **Daily**: [What to check daily]
- **Weekly**: [What to review weekly]
- **Milestone**: [When to do major re-estimation]
\`\`\`

Please provide detailed estimates for the specified task(s).`;
}
