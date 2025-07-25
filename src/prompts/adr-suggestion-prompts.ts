/**
 * AI prompts for ADR suggestion and implicit decision detection
 * Following prompt-driven development approach
 * Enhanced with Chain-of-Thought prompting to reduce LLM confusion
 */

import { enhancePromptWithCoT, COT_PATTERNS } from '../utils/chain-of-thought-template.js';

/**
 * AI prompt for detecting implicit architectural decisions by scanning project files
 */
export function generateImplicitDecisionDetectionPrompt(
  projectPath: string,
  existingAdrs?: string[]
): string {
  const basePrompt = `
# Context-Aware Architectural Decision Detection

## User Context Integration
Primary Goals: {{userGoals}}
Focus Areas: {{focusAreas}}
Constraints: {{constraints}}
Project Phase: {{projectPhase}}

**Analyze the project at ${projectPath} to identify implicit architectural decisions that align with the user's goals and focus areas above.**

> **Note**: This analysis also initializes the \`.mcp-adr-cache\` infrastructure that other MCP tools depend on, regardless of whether ADRs are found in the project.

## Suggested Analysis Approach

### 1. **Project Structure Analysis** (adapt as needed)
Consider examining the project structure to understand the codebase:
- Use available tools to explore directories and files
- Identify the main programming languages and frameworks where relevant
- Analyze the overall project organization and architecture patterns
- Look for configuration files, build scripts, and dependency files that reveal decisions

### 2. **Code Pattern Detection** (focus on what's applicable)
Scan the codebase for architectural patterns and decisions where relevant:
- Review key source files to identify established patterns
- Examine configuration files for explicit technology choices
- Look for established conventions and standards
- Identify design patterns and architectural styles that are evident

### 3. **Technology Stack Analysis** (as applicable to the project)
Consider identifying technology decisions reflected in the codebase:
- Framework and library choices that represent architectural decisions
- Database and data access patterns where present
- API and integration patterns if applicable
- Testing and deployment configurations that reveal decisions

${
  existingAdrs
    ? `## Existing ADRs (avoid duplicating)
${existingAdrs.map(adr => `- ${adr}`).join('\n')}
`
    : ''
}

## Detection Requirements

**Prioritize analysis based on the user's stated goals and focus areas above.** Consider identifying implicit architectural decisions by analyzing where relevant:

### 🏗️ **Architectural Patterns**
- Framework choices and configuration patterns
- Database access patterns and ORM usage
- API design patterns (REST, GraphQL, RPC)
- Authentication and authorization patterns
- Caching strategies and implementations
- Error handling and logging patterns

### 🔧 **Technology Decisions**
- Library and dependency choices
- Build tool and deployment configurations
- Testing framework selections
- Development environment setups
- CI/CD pipeline configurations

### 📦 **Structural Decisions**
- Module organization and boundaries
- Package structure and naming conventions
- Interface and abstraction patterns
- Dependency injection patterns
- Configuration management approaches

### 🔄 **Process Decisions**
- Code review and quality gates
- Release and versioning strategies
- Documentation standards
- Development workflow patterns
- Monitoring and observability setups

## Suggested Output Format

The following JSON structure provides a template for organizing your findings (adapt as needed for your specific analysis):

\`\`\`json
{
  "implicitDecisions": [
    {
      "id": "unique-decision-id",
      "title": "Concise decision title",
      "category": "framework|database|api|security|deployment|testing|architecture|process",
      "confidence": 0.0-1.0,
      "evidence": [
        "specific code evidence supporting this decision"
      ],
      "filePaths": [
        "relevant file paths"
      ],
      "description": "detailed description of the implicit decision",
      "context": "why this decision was likely made",
      "consequences": "observed or potential consequences",
      "alternatives": [
        "alternative approaches that were not chosen"
      ],
      "priority": "low|medium|high|critical",
      "complexity": "low|medium|high",
      "riskLevel": "low|medium|high|critical",
      "suggestedAdrTitle": "Suggested ADR title",
      "relatedPatterns": [
        "related architectural patterns"
      ]
    }
  ],
  "decisionClusters": [
    {
      "theme": "cluster theme (e.g., 'Data Access Strategy')",
      "decisions": ["decision-id-1", "decision-id-2"],
      "suggestedCombinedAdr": "Combined ADR title for related decisions"
    }
  ],
  "recommendations": [
    "specific recommendations for documenting these decisions"
  ],
  "gaps": [
    {
      "area": "missing decision area",
      "description": "gap description",
      "suggestedInvestigation": "what to investigate further"
    }
  ]
}
\`\`\`

## Detection Guidelines

1. **Evidence-Based**: Only suggest decisions with clear code evidence
2. **Avoid Duplication**: Don't suggest ADRs for decisions already documented
3. **Prioritize Impact**: Focus on decisions with significant architectural impact
4. **Consider Context**: Understand the business and technical context
5. **Cluster Related**: Group related decisions that could be documented together
`;

  // Enhance the base prompt with Chain-of-Thought reasoning
  return enhancePromptWithCoT(basePrompt, COT_PATTERNS.ADR_SUGGESTION);
}

/**
 * AI prompt for analyzing significant code changes for decision points
 */
export function generateCodeChangeAnalysisPrompt(
  beforeCode: string,
  afterCode: string,
  changeDescription: string,
  commitMessages?: string[]
): string {
  return `
# Code Change Analysis Guide for Architectural Decisions

**Note: Use this as guidance for analyzing code changes to identify architectural decisions that should be documented as ADRs. Focus on the most significant architectural implications of these specific changes.**

## Change Description
${changeDescription}

${
  commitMessages
    ? `## Commit Messages
${commitMessages.map(msg => `- ${msg}`).join('\n')}
`
    : ''
}

## Before Code
\`\`\`
${beforeCode.slice(0, 3000)}${beforeCode.length > 3000 ? '\n... (truncated)' : ''}
\`\`\`

## After Code
\`\`\`
${afterCode.slice(0, 3000)}${afterCode.length > 3000 ? '\n... (truncated)' : ''}
\`\`\`

## Analysis Requirements

Consider identifying architectural decisions by analyzing where applicable:

### 🔄 **Change Types**
- **Technology Changes**: New frameworks, libraries, or tools introduced
- **Pattern Changes**: New architectural or design patterns adopted
- **Structure Changes**: Module reorganization or interface changes
- **Process Changes**: New development or deployment processes
- **Configuration Changes**: Infrastructure or environment changes

### 📊 **Decision Indicators**
- **Breaking Changes**: Changes that affect system interfaces
- **Performance Changes**: Optimizations or performance-related modifications
- **Security Changes**: Security enhancements or vulnerability fixes
- **Scalability Changes**: Changes to support growth or load
- **Maintainability Changes**: Refactoring for better code quality

### 🎯 **Impact Assessment**
- **Scope**: How much of the system is affected
- **Reversibility**: How easy it would be to undo this change
- **Dependencies**: What other systems or components are impacted
- **Risk**: Potential risks introduced by the change
- **Benefits**: Expected benefits and improvements

## Analysis Output Format

The following JSON structure provides a template for organizing your analysis (adapt fields as needed):

\`\`\`json
{
  "changeAnalysis": {
    "changeType": "technology|pattern|structure|process|configuration|mixed",
    "scope": "local|module|system|global",
    "impact": "low|medium|high|critical",
    "reversibility": "easy|moderate|difficult|irreversible",
    "riskLevel": "low|medium|high|critical"
  },
  "identifiedDecisions": [
    {
      "id": "decision-id",
      "title": "Decision title based on the change",
      "category": "framework|database|api|security|deployment|testing|architecture|process",
      "confidence": 0.0-1.0,
      "evidence": [
        "specific evidence from the code changes"
      ],
      "context": "why this decision was made (inferred from changes)",
      "decision": "what was decided (based on the changes)",
      "consequences": "observed consequences from the changes",
      "alternatives": [
        "alternative approaches that could have been taken"
      ],
      "changeMotivation": "inferred motivation for the change",
      "futureImplications": "potential future implications",
      "suggestedAdrTitle": "Suggested ADR title",
      "priority": "low|medium|high|critical"
    }
  ],
  "recommendations": [
    "recommendations for documenting these decisions"
  ],
  "followUpQuestions": [
    "questions to ask the development team for clarification"
  ]
}
\`\`\`

## Analysis Guidelines

1. **Focus on Decisions**: Look for intentional architectural choices, not just code changes
2. **Infer Context**: Use commit messages and code patterns to understand motivation
3. **Assess Impact**: Consider both immediate and long-term implications
4. **Question Assumptions**: Identify areas where more information is needed
5. **Prioritize Documentation**: Focus on decisions that would benefit from formal documentation

Please provide a thorough analysis of the architectural decisions reflected in these code changes.
`;
}

/**
 * AI prompt for ADR template generation (Nygard, MADR formats)
 */
export function generateAdrTemplatePrompt(
  decisionData: {
    title: string;
    context: string;
    decision: string;
    consequences: string;
    alternatives?: string[];
    evidence?: string[];
  },
  templateFormat: 'nygard' | 'madr' | 'custom' = 'nygard',
  existingAdrs?: string[]
): string {
  return `
# ADR Template Generation

Please generate a complete Architectural Decision Record based on the provided decision data.

## Decision Data
- **Title**: ${decisionData.title}
- **Context**: ${decisionData.context}
- **Decision**: ${decisionData.decision}
- **Consequences**: ${decisionData.consequences}

${
  decisionData.alternatives
    ? `## Alternatives Considered
${decisionData.alternatives.map(alt => `- ${alt}`).join('\n')}
`
    : ''
}

${
  decisionData.evidence
    ? `## Supporting Evidence
${decisionData.evidence.map(ev => `- ${ev}`).join('\n')}
`
    : ''
}

${
  existingAdrs
    ? `## Existing ADRs (for reference and numbering)
${existingAdrs.map(adr => `- ${adr}`).join('\n')}
`
    : ''
}

## Template Format
${templateFormat.toUpperCase()}

## Generation Requirements

Please generate a complete ADR using the specified format:

### **Nygard Format** (if selected)
\`\`\`markdown
# ADR-XXXX: [Title]

## Status
[Proposed | Accepted | Deprecated | Superseded]

## Context
[Describe the context and problem statement]

## Decision
[Describe the architectural decision]

## Consequences
[Describe the consequences, both positive and negative]
\`\`\`

### **MADR Format** (if selected)
\`\`\`markdown
# [Title]

## Context and Problem Statement
[Describe context and problem statement]

## Decision Drivers
* [driver 1]
* [driver 2]
* [...]

## Considered Options
* [option 1]
* [option 2]
* [...]

## Decision Outcome
Chosen option: "[option 1]", because [justification].

### Positive Consequences
* [positive consequence 1]
* [...]

### Negative Consequences
* [negative consequence 1]
* [...]

## Links
* [Link type] [Link to ADR]
* [...]
\`\`\`

## Output Format

Please provide the generated ADR in the following JSON format:

\`\`\`json
{
  "adr": {
    "id": "ADR-XXXX",
    "title": "Complete ADR title",
    "status": "proposed",
    "date": "YYYY-MM-DD",
    "format": "${templateFormat}",
    "content": "Complete ADR content in markdown format",
    "filename": "suggested-filename.md",
    "metadata": {
      "category": "framework|database|api|security|deployment|testing|architecture|process",
      "tags": ["relevant", "tags"],
      "complexity": "low|medium|high",
      "impact": "low|medium|high|critical",
      "stakeholders": ["relevant stakeholders"]
    }
  },
  "suggestions": {
    "placement": "suggested directory path",
    "numbering": "suggested ADR number",
    "relatedAdrs": ["related ADR IDs"],
    "reviewers": ["suggested reviewers"],
    "implementationTasks": [
      "specific implementation tasks"
    ]
  },
  "qualityChecks": {
    "completeness": 0.0-1.0,
    "clarity": 0.0-1.0,
    "actionability": 0.0-1.0,
    "traceability": 0.0-1.0,
    "issues": ["any quality issues identified"],
    "improvements": ["suggested improvements"]
  }
}
\`\`\`

## Generation Guidelines

1. **Complete Content**: Ensure all sections are thoroughly filled out
2. **Clear Language**: Use clear, concise, and professional language
3. **Actionable**: Make decisions and consequences specific and actionable
4. **Traceable**: Include references to evidence and related decisions
5. **Consistent**: Follow the chosen template format consistently
6. **Numbered**: Suggest appropriate ADR numbering based on existing ADRs

Please generate a high-quality, complete ADR based on the provided decision data.
`;
}
