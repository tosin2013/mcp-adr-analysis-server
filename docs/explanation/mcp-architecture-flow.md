# MCP ADR Analysis Server Architecture Flow

This document shows the system architecture and data flow using Mermaid diagrams.

## System Architecture Overview

```mermaid
graph TD
    A[AI Assistant<br/>Claude/Cursor/Cline] --> B[MCP Client]
    B --> C[MCP ADR Analysis Server]
    C --> D[Project Analysis Engine]
    C --> E[AI Execution Engine]
    C --> F[Cache Management]
    
    D --> G[File System Scanner]
    D --> H[Technology Detector]
    D --> I[Pattern Analyzer]
    
    E --> J[OpenRouter API]
    J --> K[Claude-3-Sonnet]
    J --> L[GPT-4o]
    
    C --> M[ADR Generator]
    C --> N[Security Scanner]
    C --> O[Deployment Validator]
    
    M --> P[docs/adrs/]
    N --> Q[Content Masking]
    O --> R[Health Scoring]
    
    style A fill:#e1f5fe
    style C fill:#fff3e0
    style J fill:#f3e5f5
    style P fill:#e8f5e8
```

## Tool Execution Flow

```mermaid
sequenceDiagram
    participant User as AI Assistant User
    participant AI as AI Assistant
    participant MCP as MCP Client
    participant Server as ADR Analysis Server
    participant Engine as AI Execution Engine
    participant API as OpenRouter API
    
    User->>AI: "Analyze this React project"
    AI->>MCP: Tool call: analyze_project_ecosystem
    MCP->>Server: MCP Protocol Request
    
    alt AI Execution Mode
        Server->>Engine: Process with AI enhancement
        Engine->>API: Send enhanced prompts
        API-->>Engine: AI analysis results
        Engine-->>Server: Processed insights
    else Prompt-Only Mode
        Server->>Server: Generate analysis prompts
    end
    
    Server-->>MCP: Analysis results/prompts
    MCP-->>AI: Tool response
    AI-->>User: Actionable insights
```

## Decision Flow Architecture

```mermaid
flowchart LR
    A[Project Input] --> B{Existing ADRs?}
    B -->|Yes| C[discover_existing_adrs]
    B -->|No| D[suggest_adrs]
    
    C --> E[compare_adr_progress]
    D --> F[generate_adr_from_decision]
    
    E --> G{Implementation Gap?}
    F --> G
    
    G -->|Yes| H[generate_adr_todo]
    G -->|No| I[deployment_readiness]
    
    H --> J[manage_todo_json]
    I --> K{Ready for Deploy?}
    
    K -->|Yes| L[smart_git_push]
    K -->|No| M[Address Issues]
    
    M --> N[get_workflow_guidance]
    N --> H
    
    style A fill:#e3f2fd
    style L fill:#e8f5e8
    style M fill:#fff3e0
```

## Security Analysis Flow

```mermaid
graph TB
    A[Source Code] --> B[analyze_content_security]
    B --> C{Sensitive Content Found?}
    
    C -->|Yes| D[generate_content_masking]
    C -->|No| E[Security Clear ✅]
    
    D --> F[configure_custom_patterns]
    F --> G[apply_basic_content_masking]
    G --> H[validate_content_masking]
    
    H --> I{Validation Passed?}
    I -->|Yes| J[Content Secured ✅]
    I -->|No| K[Update Patterns]
    
    K --> F
    
    style A fill:#f3e5f5
    style E fill:#e8f5e8
    style J fill:#e8f5e8
    style K fill:#ffebee
```

## Deployment Readiness Pipeline

```mermaid
stateDiagram-v2
    [*] --> Analyzing
    
    Analyzing --> SecurityScan: analyze_content_security
    SecurityScan --> SecurityPassed: No issues found
    SecurityScan --> SecurityFailed: Issues detected
    
    SecurityFailed --> Masking: generate_content_masking
    Masking --> SecurityScan: Re-validate
    
    SecurityPassed --> TestValidation: deployment_readiness
    TestValidation --> TestsPassed: All tests pass
    TestValidation --> TestsFailed: Tests failing
    
    TestsFailed --> FixRequired: Address issues
    FixRequired --> TestValidation: Re-run validation
    
    TestsPassed --> DeploymentReady: smart_git_push
    DeploymentReady --> [*]: Deployment complete
    
    SecurityFailed --> [*]: Manual intervention required
    FixRequired --> [*]: Development needed
```

These diagrams illustrate the comprehensive workflow and architecture of the MCP ADR Analysis Server, showing how different components interact to provide AI-powered architectural analysis and decision support.

