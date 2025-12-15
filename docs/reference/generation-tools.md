# 🏗️ Generation Tools Reference

**Complete reference for MCP ADR Analysis Server content generation and creation tools.**

---

## 📋 Quick Reference

| Tool                         | Purpose                       | Key Parameters                  | Output                             |
| ---------------------------- | ----------------------------- | ------------------------------- | ---------------------------------- |
| `suggest_adrs`               | Generate ADR suggestions      | `projectPath`, `maxSuggestions` | ADR recommendations with reasoning |
| `generate_adr_from_decision` | Create ADR from decision data | `decisionData`, `template`      | Complete ADR document              |
| `generate_adr_todo`          | Create implementation tasks   | `adrDirectory`, `phase`         | TODO list with priorities          |
| `generate_content_masking`   | Create masked content         | `content`, `maskingLevel`       | Sanitized content                  |

---

## 📝 suggest_adrs

**Purpose**: Analyze project and suggest missing or needed architectural decision records.

### Parameters

```typescript
interface SuggestAdrsParams {
  projectPath: string; // Required: Absolute path to project
  maxSuggestions?: number; // Maximum number of ADRs to suggest (default: 5)
  analysisScope?: 'technology' | 'architecture' | 'security' | 'all';
  includeStakeholders?: boolean; // Include stakeholder recommendations
  collaborativeMode?: boolean; // Enable collaborative features
  securityFocused?: boolean; // Focus on security-related decisions
  enableTreeSitterAnalysis?: boolean; // Enable AST-based analysis
}
```

### Usage Examples

#### Basic ADR Suggestions

```json
{
  "tool": "suggest_adrs",
  "parameters": {
    "projectPath": "/path/to/project",
    "maxSuggestions": 3
  }
}
```

#### Security-Focused ADR Suggestions

```json
{
  "tool": "suggest_adrs",
  "parameters": {
    "projectPath": "/path/to/project",
    "maxSuggestions": 5,
    "analysisScope": "security",
    "securityFocused": true,
    "enableTreeSitterAnalysis": true
  }
}
```

#### Collaborative ADR Planning

```json
{
  "tool": "suggest_adrs",
  "parameters": {
    "projectPath": "/path/to/project",
    "maxSuggestions": 8,
    "analysisScope": "all",
    "includeStakeholders": true,
    "collaborativeMode": true
  }
}
```

### Response Format

```typescript
interface AdrSuggestion {
  title: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  category: string;
  rationale: string;
  stakeholders: string[];
  estimatedEffort: string;
  dependencies: string[];
  evidence: string[];
  confidence: number;
}

interface SuggestAdrsResponse {
  suggestions: AdrSuggestion[];
  analysisMetadata: {
    projectType: string;
    technologyStack: string[];
    complexityScore: number;
    analysisDepth: string;
  };
  recommendations: {
    priorityOrder: string[];
    implementationStrategy: string;
    timelineEstimate: string;
  };
}
```

### Common Use Cases

1. **New Project Setup**: Identify initial architectural decisions needed
2. **Legacy System Analysis**: Find undocumented architectural decisions
3. **Technology Migration**: Plan decisions for migration projects
4. **Security Audit**: Identify security-related decisions needed
5. **Team Onboarding**: Help new team members understand decision needs

---

## 📄 generate_adr_from_decision

**Purpose**: Create a complete ADR document from structured decision data.

### Parameters

```typescript
interface GenerateAdrFromDecisionParams {
  decisionData: {
    title: string;
    context: string;
    decision?: string;
    options?: string[];
    consequences?: string[];
    stakeholders?: string[];
    timeline?: string;
    status?: 'proposed' | 'accepted' | 'deprecated' | 'superseded';
  };
  template?: 'madr' | 'nygard' | 'alexandrian' | 'custom';
  outputPath?: string; // Where to save the ADR file
  includeMetadata?: boolean; // Include creation metadata
  generateId?: boolean; // Auto-generate ADR ID
}
```

### Usage Examples

#### Basic ADR Generation

```json
{
  "tool": "generate_adr_from_decision",
  "parameters": {
    "decisionData": {
      "title": "Database Technology Selection",
      "context": "Need to choose database technology for new microservice",
      "decision": "Use PostgreSQL for primary data storage",
      "consequences": [
        "Positive: ACID compliance and reliability",
        "Positive: Strong ecosystem and tooling",
        "Challenge: Need PostgreSQL expertise on team"
      ]
    },
    "template": "madr",
    "outputPath": "././adrs/001-database-selection.md"
  }
}
```

#### Comprehensive ADR with Stakeholders

```json
{
  "tool": "generate_adr_from_decision",
  "parameters": {
    "decisionData": {
      "title": "API Authentication Strategy",
      "context": "Multiple client applications need secure API access with different authentication requirements",
      "options": [
        "JWT tokens with refresh mechanism",
        "OAuth 2.0 with PKCE",
        "API keys with rate limiting"
      ],
      "decision": "Implement OAuth 2.0 with PKCE for web clients and API keys for service-to-service communication",
      "consequences": [
        "Positive: Industry standard security practices",
        "Positive: Supports multiple client types",
        "Challenge: More complex implementation",
        "Challenge: Need OAuth infrastructure"
      ],
      "stakeholders": ["security-team", "frontend-team", "mobile-team"],
      "timeline": "Implementation by Q2 2024",
      "status": "accepted"
    },
    "template": "madr",
    "includeMetadata": true,
    "generateId": true
  }
}
```

#### Custom Template ADR

```json
{
  "tool": "generate_adr_from_decision",
  "parameters": {
    "decisionData": {
      "title": "Monitoring and Observability Strategy",
      "context": "Need comprehensive monitoring for distributed system",
      "decision": "Implement OpenTelemetry with Prometheus and Grafana"
    },
    "template": "custom",
    "customTemplate": {
      "sections": [
        "title",
        "status",
        "context",
        "decision",
        "implementation_plan",
        "monitoring_metrics",
        "consequences"
      ]
    }
  }
}
```

### Response Format

```typescript
interface GenerateAdrResponse {
  adrContent: string;
  metadata: {
    id: string;
    filename: string;
    template: string;
    createdAt: string;
    wordCount: number;
  };
  validation: {
    isValid: boolean;
    completenessScore: number;
    missingElements: string[];
  };
  suggestions: {
    improvements: string[];
    relatedAdrs: string[];
  };
}
```

---

## ✅ generate_adr_todo

**Purpose**: Generate implementation tasks and TODO lists from ADR directory analysis.

### Parameters

```typescript
interface GenerateAdrTodoParams {
  adrDirectory: string; // Required: Path to ADR directory
  outputPath?: string; // Where to save TODO file
  phase?: 'planning' | 'implementation' | 'both';
  linkAdrs?: boolean; // Link tasks back to ADRs
  includeRules?: boolean; // Include rule-based tasks
  priorityFilter?: 'low' | 'medium' | 'high' | 'critical';
  securityFocused?: boolean; // Focus on security tasks
  assignees?: string[]; // Suggested assignees
}
```

### Usage Examples

#### Basic TODO Generation

```json
{
  "tool": "generate_adr_todo",
  "parameters": {
    "adrDirectory": "./adrs",
    "outputPath": "TODO.md",
    "phase": "both"
  }
}
```

#### Security-Focused TODO List

```json
{
  "tool": "generate_adr_todo",
  "parameters": {
    "adrDirectory": "./adrs",
    "outputPath": "SECURITY_TODO.md",
    "phase": "implementation",
    "securityFocused": true,
    "priorityFilter": "high",
    "linkAdrs": true,
    "includeRules": true
  }
}
```

#### Team-Assigned TODO Generation

```json
{
  "tool": "generate_adr_todo",
  "parameters": {
    "adrDirectory": "./adrs",
    "phase": "implementation",
    "assignees": ["@backend-team", "@security-team", "@devops-team"],
    "linkAdrs": true
  }
}
```

### Response Format

```typescript
interface TodoItem {
  id: string;
  title: string;
  description: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  category: string;
  estimatedEffort: string;
  assignee?: string;
  relatedAdr: string;
  dependencies: string[];
  acceptanceCriteria: string[];
}

interface GenerateAdrTodoResponse {
  todos: TodoItem[];
  summary: {
    totalTasks: number;
    byPriority: Record<string, number>;
    byCategory: Record<string, number>;
    estimatedTotalEffort: string;
  };
  recommendations: {
    implementationOrder: string[];
    riskMitigation: string[];
  };
}
```

---

## 🛡️ generate_content_masking

**Purpose**: Create masked versions of content to hide sensitive information while preserving structure.

### Parameters

```typescript
interface GenerateContentMaskingParams {
  content: string; // Required: Content to mask
  maskingLevel?: 'basic' | 'standard' | 'strict' | 'paranoid';
  preserveStructure?: boolean; // Keep original structure
  includeLineNumbers?: boolean; // Include line number references
  userDefinedPatterns?: string[]; // Custom patterns to mask
  maskingStrategy?: 'replacement' | 'redaction' | 'tokenization';
  outputFormat?: 'text' | 'markdown' | 'json';
}
```

### Usage Examples

#### Basic Content Masking

```json
{
  "tool": "generate_content_masking",
  "parameters": {
    "content": "const apiKey = 'sk-1234567890abcdef'; const dbPassword = 'mySecretPassword123';",
    "maskingLevel": "standard",
    "preserveStructure": true
  }
}
```

#### Advanced Security Masking

```json
{
  "tool": "generate_content_masking",
  "parameters": {
    "content": "Database connection: postgresql://user:password@localhost:5432/mydb",
    "maskingLevel": "strict",
    "preserveStructure": true,
    "userDefinedPatterns": ["postgresql://[^\\s]+", "user:[^@]+@"],
    "maskingStrategy": "tokenization",
    "includeLineNumbers": true
  }
}
```

#### Custom Pattern Masking

```json
{
  "tool": "generate_content_masking",
  "parameters": {
    "content": "Company API: COMP_12345_SECRET_TOKEN",
    "maskingLevel": "paranoid",
    "userDefinedPatterns": ["COMP_[A-Z0-9_]+", "SECRET_[A-Z0-9_]+"],
    "outputFormat": "markdown"
  }
}
```

### Response Format

```typescript
interface ContentMaskingResponse {
  maskedContent: string;
  maskingReport: {
    patternsFound: Array<{
      pattern: string;
      count: number;
      locations: Array<{
        line: number;
        column: number;
      }>;
    }>;
    maskingLevel: string;
    preservedStructure: boolean;
  };
  securityAnalysis: {
    riskLevel: 'low' | 'medium' | 'high' | 'critical';
    remainingRisks: string[];
    recommendations: string[];
  };
}
```

---

## 🔧 Advanced Generation Patterns

### Chaining Generation Tools

**Progressive Content Creation Workflow**:

```json
// 1. Analyze project for ADR needs
{
  "tool": "suggest_adrs",
  "parameters": {
    "projectPath": ".",
    "analysisScope": "all"
  }
}

// 2. Generate specific ADRs from suggestions
{
  "tool": "generate_adr_from_decision",
  "parameters": {
    "decisionData": {
      "title": "From suggestion analysis",
      "context": "Based on project analysis"
    }
  }
}

// 3. Create implementation tasks
{
  "tool": "generate_adr_todo",
  "parameters": {
    "adrDirectory": "./adrs",
    "phase": "implementation"
  }
}

// 4. Mask sensitive content for sharing
{
  "tool": "generate_content_masking",
  "parameters": {
    "content": "Generated ADR content",
    "maskingLevel": "standard"
  }
}
```

### Batch Generation

**Generate Multiple ADRs**:

```typescript
// Batch ADR generation pattern
const adrSuggestions = [
  { title: 'Database Selection', priority: 'high' },
  { title: 'API Design', priority: 'medium' },
  { title: 'Security Framework', priority: 'critical' },
];

for (const suggestion of adrSuggestions) {
  await generateAdrFromDecision({
    decisionData: {
      title: suggestion.title,
      context: `Generated from analysis for ${suggestion.title}`,
      priority: suggestion.priority,
    },
    template: 'madr',
    outputPath: `././adrs/${suggestion.title.toLowerCase().replace(/\s+/g, '-')}.md`,
  });
}
```

### Template Customization

**Custom ADR Templates**:

```json
{
  "custom_templates": {
    "security_adr": {
      "sections": [
        "title",
        "status",
        "security_context",
        "threat_model",
        "decision",
        "security_implications",
        "implementation_plan",
        "monitoring_requirements"
      ]
    },
    "api_adr": {
      "sections": [
        "title",
        "status",
        "api_context",
        "design_options",
        "decision",
        "api_specification",
        "backward_compatibility",
        "migration_plan"
      ]
    }
  }
}
```

---

## 📊 Generation Best Practices

### 1. Content Quality

- **Comprehensive Context**: Provide detailed context for better ADR generation
- **Clear Decisions**: Make decisions explicit and actionable
- **Evidence-Based**: Include evidence and reasoning
- **Stakeholder Involvement**: Identify relevant stakeholders

### 2. Template Selection

- **MADR**: Best for most architectural decisions
- **Nygard**: Good for simple, quick decisions
- **Custom**: Use for organization-specific requirements
- **Consistency**: Maintain template consistency across project

### 3. Security Considerations

- **Content Masking**: Always mask sensitive content before sharing
- **Pattern Recognition**: Use comprehensive pattern libraries
- **Validation**: Validate masked content for completeness
- **Audit Trail**: Maintain audit trail of masking operations

### 4. Automation Integration

- **CI/CD Integration**: Automate ADR generation in pipelines
- **Template Management**: Version control ADR templates
- **Quality Gates**: Implement quality checks for generated content
- **Feedback Loops**: Collect feedback to improve generation quality

---

## 🔗 Related Documentation

- **[Analysis Tools](analysis-tools.md)** - Tools for project analysis before generation
- **[Security Tools](security-tools.md)** - Security-focused generation tools
- **[Validation Tools](validation-tools.md)** - Tools for validating generated content
- **[API Reference](api-reference.md)** - Complete API documentation

---

**Need help with content generation?** → **[Troubleshooting Guide](../how-to-guides/troubleshooting.md)** or **[File an Issue](https://github.com/tosin2013/mcp-adr-analysis-server/issues)**
