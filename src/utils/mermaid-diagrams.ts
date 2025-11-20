/**
 * Mermaid Diagram Generation Utilities
 *
 * Provides standardized mermaid diagram generation for ADRs and documentation.
 * Supports workflow diagrams, sequence diagrams, state diagrams, and more.
 */

// ============================================================================
// Types and Interfaces
// ============================================================================

export interface WorkflowPhase {
  id: string;
  name: string;
  description?: string;
  order: number;
  status?: 'pending' | 'in_progress' | 'completed';
}

export interface DeploymentStep {
  phase: string;
  action: string;
  participant?: string;
  target?: string;
  validation?: string;
}

export interface DecisionFlow {
  start: string;
  decision: string;
  branches: Array<{
    condition: string;
    action: string;
    outcome: string;
  }>;
}

export interface ResourceTracking {
  resourceType: string;
  action: 'create' | 'update' | 'delete';
  dependencies?: string[];
}

// ============================================================================
// Interactive ADR Planning Diagrams
// ============================================================================

/**
 * Generate workflow diagram for interactive ADR planning
 */
export function generateInteractiveADRWorkflow(
  phases: WorkflowPhase[],
  currentPhase?: string
): string {
  const sortedPhases = phases.sort((a, b) => a.order - b.order);

  let diagram = '```mermaid\ngraph LR\n';

  sortedPhases.forEach((phase, index) => {
    const nodeId = `P${index + 1}`;
    const nextNodeId = `P${index + 2}`;

    // Add styling based on status
    let style = '';
    if (phase.status === 'completed') {
      style = ':::completed';
    } else if (phase.status === 'in_progress' || phase.id === currentPhase) {
      style = ':::inProgress';
    } else {
      style = ':::pending';
    }

    // Format node label
    const label = phase.name.replace(/\n/g, '<br/>');
    diagram += `    ${nodeId}["${label}"]${style}\n`;

    // Add connection to next phase
    if (index < sortedPhases.length - 1) {
      diagram += `    ${nodeId} --> ${nextNodeId}\n`;
    }
  });

  // Add styling definitions
  diagram += '\n';
  diagram += '    classDef completed fill:#d4edda,stroke:#28a745,stroke-width:2px\n';
  diagram += '    classDef inProgress fill:#fff3cd,stroke:#ffc107,stroke-width:3px\n';
  diagram += '    classDef pending fill:#f8f9fa,stroke:#6c757d,stroke-width:1px\n';
  diagram += '```\n';

  return diagram;
}

/**
 * Generate detailed phase breakdown diagram
 */
export function generateADRPlanningDetailedFlow(): string {
  return `\`\`\`mermaid
graph TB
    Start([Start ADR Planning]) --> P1[Problem Definition]

    P1 --> P1A[Clarify Challenge]
    P1A --> P1B[Identify Stakeholders]
    P1B --> P1C[Define Success Criteria]
    P1C --> P2[Research & Analysis]

    P2 --> P2A[Gather Context]
    P2A --> P2B[Review Documentation]
    P2B --> P2C[Analyze Codebase]
    P2C --> P3[Option Exploration]

    P3 --> P3A[Identify Alternatives]
    P3A --> P3B[Evaluate Pros/Cons]
    P3B --> P3C[Assess Risks]
    P3C --> P4[Decision Making]

    P4 --> P4A[Select Approach]
    P4A --> P4B[Document Rationale]
    P4B --> P4C[Define Tradeoffs]
    P4C --> P5[Impact Assessment]

    P5 --> P5A[Technical Impact]
    P5A --> P5B[Business Impact]
    P5B --> P5C[Team Impact]
    P5C --> P6[Implementation Planning]

    P6 --> P6A[Generate TODOs]
    P6A --> P6B[Estimate Timeline]
    P6B --> P6C[Identify Dependencies]
    P6C --> P7[ADR Generation]

    P7 --> P7A[Create Document]
    P7A --> P7B[Add Diagrams]
    P7B --> P7C[Review & Finalize]
    P7C --> End([ADR Complete])

    style Start fill:#e1f5ff
    style End fill:#d4edda
    style P4 fill:#fff3cd
    style P7 fill:#d1ecf1
\`\`\`
`;
}

// ============================================================================
// Deployment Guidance Diagrams
// ============================================================================

/**
 * Generate deployment sequence diagram
 */
export function generateDeploymentSequence(
  steps: DeploymentStep[],
  environment: string = 'production'
): string {
  let diagram = '```mermaid\nsequenceDiagram\n';
  diagram += `    participant User as Developer\n`;
  diagram += `    participant Tool as Deployment Tool\n`;
  diagram += `    participant ADR as ADR Documents\n`;
  diagram += `    participant Script as Deploy Scripts\n`;
  diagram += `    participant Env as ${environment.charAt(0).toUpperCase() + environment.slice(1)} Environment\n\n`;

  // Add sequence steps
  steps.forEach((step, index) => {
    const from = step.participant || 'Tool';
    const to = step.target || 'Env';
    const message = step.action;

    diagram += `    ${from}->>${to}: ${message}\n`;

    if (step.validation) {
      diagram += `    ${to}-->>Tool: ${step.validation}\n`;
    }

    if (index < steps.length - 1 && step.phase !== steps[index + 1]?.phase) {
      diagram += `\n    Note over User,Env: Phase ${index + 1} Complete\n\n`;
    }
  });

  diagram += '```\n';
  return diagram;
}

/**
 * Generate deployment workflow diagram
 */
export function generateDeploymentWorkflow(platform: string, phases: string[]): string {
  let diagram = '```mermaid\nflowchart TD\n';
  diagram += `    Start([Start Deployment]) --> Detect[Detect Platform]\n`;
  diagram += `    Detect --> Platform{Platform:<br/>${platform}}\n`;
  diagram += `    Platform --> LoadADR[Read ADR Decisions]\n`;
  diagram += `    LoadADR --> GenScripts[Generate Deploy Scripts]\n\n`;

  // Add phases
  phases.forEach((phase, index) => {
    const phaseId = `Phase${index + 1}`;
    diagram += `    ${index === 0 ? 'GenScripts' : `Phase${index}`} --> ${phaseId}[${phase}]\n`;
  });

  const lastPhaseId = `Phase${phases.length}`;
  diagram += `\n    ${lastPhaseId} --> Validate{Validation<br/>Passed?}\n`;
  diagram += `    Validate -->|No| Fix[Auto-fix Issues]\n`;
  diagram += `    Fix --> ${lastPhaseId}\n`;
  diagram += `    Validate -->|Yes| Success([✅ Deployment Success])\n\n`;

  // Add styling
  diagram += `    style Start fill:#e1f5ff\n`;
  diagram += `    style Platform fill:#fff3cd\n`;
  diagram += `    style Success fill:#d4edda\n`;
  diagram += `    style Fix fill:#f8d7da\n`;
  diagram += '```\n';

  return diagram;
}

// ============================================================================
// ADR Suggestion Diagrams
// ============================================================================

/**
 * Generate implicit decision detection flow
 */
export function generateImplicitDecisionFlow(): string {
  return `\`\`\`mermaid
graph TB
    Start([Scan Codebase]) --> Analyze[Code Analysis]

    Analyze --> TreeSitter[Tree-sitter AST<br/>Parsing]
    Analyze --> Pattern[Pattern Detection]
    Analyze --> Deps[Dependency Analysis]

    TreeSitter --> Detect[Detect Implicit<br/>Decisions]
    Pattern --> Detect
    Deps --> Detect

    Detect --> Type{Decision<br/>Type?}

    Type -->|Architecture| A1[Layered Architecture]
    Type -->|Architecture| A2[Microservices]
    Type -->|Architecture| A3[Event-Driven]

    Type -->|Technology| T1[Framework Choice]
    Type -->|Technology| T2[Database Selection]
    Type -->|Technology| T3[Build Tools]

    Type -->|Security| S1[Authentication]
    Type -->|Security| S2[Authorization]
    Type -->|Security| S3[Encryption]

    Type -->|Performance| P1[Caching Strategy]
    Type -->|Performance| P2[Load Balancing]
    Type -->|Performance| P3[Optimization]

    A1 --> Priority[Prioritize Suggestions]
    A2 --> Priority
    A3 --> Priority
    T1 --> Priority
    T2 --> Priority
    T3 --> Priority
    S1 --> Priority
    S2 --> Priority
    S3 --> Priority
    P1 --> Priority
    P2 --> Priority
    P3 --> Priority

    Priority --> Confidence{Confidence<br/>>80%?}
    Confidence -->|Yes| High[High Priority ADR]
    Confidence -->|No| Review[Requires Review]

    High --> Output[Generate ADR<br/>Suggestions]
    Review --> Output

    Output --> End([Present to User])

    style Start fill:#e1f5ff
    style Detect fill:#fff3cd
    style Type fill:#fff3cd
    style High fill:#d4edda
    style Review fill:#f8d7da
    style End fill:#d1ecf1
\`\`\`
`;
}

/**
 * Generate code change analysis flow
 */
export function generateCodeChangeAnalysisFlow(): string {
  return `\`\`\`mermaid
sequenceDiagram
    participant User as Developer
    participant Tool as ADR Suggestion Tool
    participant Code as Codebase
    participant AI as AI Analysis
    participant ADR as ADR Suggestions

    User->>Tool: Provide code changes
    Tool->>Code: Analyze before code
    Tool->>Code: Analyze after code
    Code-->>Tool: Code differences

    Tool->>AI: Semantic analysis
    AI->>AI: Detect architectural impact
    AI->>AI: Identify decision patterns
    AI-->>Tool: Analysis results

    Tool->>Tool: Classify changes
    Note over Tool: Architecture, Security,<br/>Performance, Data

    Tool->>ADR: Generate suggestions
    ADR->>ADR: Rank by importance
    ADR->>ADR: Add context & rationale
    ADR-->>User: Prioritized ADR list

    User->>User: Review suggestions
    User->>ADR: Approve ADR creation
\`\`\`
`;
}

// ============================================================================
// Deployment Readiness Diagrams
// ============================================================================

/**
 * Generate deployment readiness validation flow
 */
export function generateDeploymentReadinessFlow(strictMode: boolean = true): string {
  const tolerance = strictMode ? '0 failures' : 'Low tolerance';

  return `\`\`\`mermaid
flowchart TD
    Start([Check Deployment Readiness]) --> Tests[Run All Tests]

    Tests --> Unit[Unit Tests]
    Tests --> Integration[Integration Tests]
    Tests --> E2E[End-to-End Tests]

    Unit --> Coverage{Test Coverage<br/>≥80%?}
    Integration --> Coverage
    E2E --> Coverage

    Coverage -->|No| Block1[❌ BLOCKED<br/>Insufficient Coverage]
    Coverage -->|Yes| Failures{Test<br/>Failures?}

    Failures -->|Yes| Block2[❌ BLOCKED<br/>${tolerance}]
    Failures -->|No| Quality[Code Quality Checks]

    Quality --> Lint[Linting]
    Quality --> Type[Type Checking]
    Quality --> Format[Formatting]

    Lint --> QualityPass{All Checks<br/>Pass?}
    Type --> QualityPass
    Format --> QualityPass

    QualityPass -->|No| Block3[❌ BLOCKED<br/>Quality Issues]
    QualityPass -->|Yes| ADR[ADR Compliance Check]

    ADR --> Impl{All ADRs<br/>Implemented?}
    Impl -->|No| Block4[❌ BLOCKED<br/>Missing Implementation]
    Impl -->|Yes| Mock[Mock vs Production Check]

    Mock --> RealCode{Production-Ready<br/>Code?}
    RealCode -->|No| Block5[❌ BLOCKED<br/>Mock Implementation]
    RealCode -->|Yes| Config[Configuration Validation]

    Config --> Secrets{Secrets<br/>Configured?}
    Secrets -->|No| Block6[❌ BLOCKED<br/>Missing Secrets]
    Secrets -->|Yes| Env{Environment<br/>Variables Set?}

    Env -->|No| Block7[❌ BLOCKED<br/>Missing Env Vars]
    Env -->|Yes| Ready[✅ READY TO DEPLOY]

    Ready --> Score[Deployment Score:<br/>100/100]

    Block1 --> Report[Generate Detailed<br/>Failure Report]
    Block2 --> Report
    Block3 --> Report
    Block4 --> Report
    Block5 --> Report
    Block6 --> Report
    Block7 --> Report

    Report --> Remediation[Provide Fix Steps]

    style Start fill:#e1f5ff
    style Ready fill:#d4edda
    style Score fill:#d4edda
    style Block1 fill:#f8d7da
    style Block2 fill:#f8d7da
    style Block3 fill:#f8d7da
    style Block4 fill:#f8d7da
    style Block5 fill:#f8d7da
    style Block6 fill:#f8d7da
    style Block7 fill:#f8d7da
    style Report fill:#fff3cd
\`\`\`
`;
}

/**
 * Generate test validation pyramid
 */
export function generateTestValidationPyramid(): string {
  return `\`\`\`mermaid
graph TB
    subgraph "Test Pyramid"
        E2E[End-to-End Tests<br/>10% of tests]
        Integration[Integration Tests<br/>30% of tests]
        Unit[Unit Tests<br/>60% of tests]
    end

    E2E --> Integration
    Integration --> Unit

    Unit --> Coverage{Coverage<br/>≥80%?}
    Coverage -->|Yes| Pass[✅ Tests Pass]
    Coverage -->|No| Fail[❌ Blocked]

    style E2E fill:#fff3cd
    style Integration fill:#cfe2ff
    style Unit fill:#e1f5ff
    style Pass fill:#d4edda
    style Fail fill:#f8d7da
\`\`\`
`;
}

// ============================================================================
// Tool Chain Orchestrator Diagrams
// ============================================================================

/**
 * Generate tool orchestration flow
 */
export function generateToolOrchestrationFlow(
  tools: Array<{ name: string; order: number; depends?: string[] }>
): string {
  let diagram = '```mermaid\ngraph LR\n';
  diagram += '    Start([User Request]) --> AI[AI Planning]\n';
  diagram += '    AI --> Analyze[Analyze Request]\n';
  diagram += '    Analyze --> Plan[Generate Tool Sequence]\n\n';

  const sortedTools = tools.sort((a, b) => a.order - b.order);

  sortedTools.forEach((tool, index) => {
    const toolId = `T${index + 1}`;

    diagram += `    ${index === 0 ? 'Plan' : `T${index}`} --> ${toolId}[${tool.name}]\n`;

    if (tool.depends && tool.depends.length > 0) {
      diagram += `    Note right of ${toolId}: Depends on:<br/>${tool.depends.join(', ')}\n`;
    }
  });

  const lastToolId = `T${sortedTools.length}`;
  diagram += `\n    ${lastToolId} --> Validate{All Tools<br/>Succeeded?}\n`;
  diagram += `    Validate -->|No| Retry[Retry Failed Tools]\n`;
  diagram += `    Retry --> ${lastToolId}\n`;
  diagram += `    Validate -->|Yes| Result[Combine Results]\n`;
  diagram += `    Result --> End([Return to User])\n\n`;

  // Add styling
  diagram += '    style Start fill:#e1f5ff\n';
  diagram += '    style AI fill:#fff3cd\n';
  diagram += '    style End fill:#d4edda\n';
  diagram += '    style Retry fill:#f8d7da\n';
  diagram += '```\n';

  return diagram;
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Sanitize text for mermaid diagram labels
 */
export function sanitizeMermaidLabel(text: string): string {
  return text.replace(/"/g, "'").replace(/\[/g, '(').replace(/]/g, ')').replace(/\n/g, '<br/>');
}

/**
 * Generate a simple state diagram
 */
export function generateStateFlow(
  states: Array<{ id: string; label: string; type?: 'start' | 'end' | 'normal' }>
): string {
  let diagram = '```mermaid\nstateDiagram-v2\n';

  states.forEach((state, index) => {
    if (state.type === 'start') {
      diagram += `    [*] --> ${state.id}\n`;
    }

    diagram += `    ${state.id}: ${sanitizeMermaidLabel(state.label)}\n`;

    if (index < states.length - 1) {
      diagram += `    ${state.id} --> ${states[index + 1]?.id}\n`;
    }

    if (state.type === 'end') {
      diagram += `    ${state.id} --> [*]\n`;
    }
  });

  diagram += '```\n';
  return diagram;
}

// ============================================================================
// Export all diagram generators
// ============================================================================

export const MermaidDiagrams = {
  // Interactive ADR Planning
  generateInteractiveADRWorkflow,
  generateADRPlanningDetailedFlow,

  // Deployment Guidance
  generateDeploymentSequence,
  generateDeploymentWorkflow,

  // ADR Suggestions
  generateImplicitDecisionFlow,
  generateCodeChangeAnalysisFlow,

  // Deployment Readiness
  generateDeploymentReadinessFlow,
  generateTestValidationPyramid,

  // Tool Orchestration
  generateToolOrchestrationFlow,

  // Helpers
  sanitizeMermaidLabel,
  generateStateFlow,
};

export default MermaidDiagrams;
