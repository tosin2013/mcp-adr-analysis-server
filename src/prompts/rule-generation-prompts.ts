/**
 * AI prompts for rule generation and validation
 * Following prompt-driven development approach
 */

/**
 * AI prompt for extracting actionable rules from ADRs
 */
export function generateRuleExtractionPrompt(
  adrFiles: Array<{
    id: string;
    title: string;
    content: string;
    status: string;
    category?: string;
  }>,
  existingRules?: Array<{
    id: string;
    name: string;
    description: string;
  }>
): string {
  return `
# Architectural Rule Extraction from ADRs

Please analyze the following Architectural Decision Records and extract actionable rules that can be used to validate code and architectural compliance.

## ADR Files
${adrFiles.map((adr, index) => `
### ${index + 1}. ${adr.title}
**ID**: ${adr.id}
**Status**: ${adr.status}
**Category**: ${adr.category || 'Unknown'}

**Content**:
\`\`\`markdown
${adr.content.slice(0, 1500)}${adr.content.length > 1500 ? '\n... (truncated for analysis)' : ''}
\`\`\`
`).join('')}

${existingRules ? `## Existing Rules
${existingRules.map(rule => `- **${rule.name}**: ${rule.description}`).join('\n')}
` : ''}

## Rule Extraction Requirements

Please identify and extract rules in the following categories:

### 🏗️ **Architectural Rules**
- **Component Structure**: How components should be organized and structured
- **Dependency Management**: Rules about dependencies between modules/components
- **Interface Design**: API design standards and conventions
- **Data Flow**: Rules about data movement and transformation
- **Service Boundaries**: Microservice or module boundary definitions
- **Integration Patterns**: How systems should integrate with each other

### 🔧 **Technology Rules**
- **Framework Usage**: Specific framework usage patterns and restrictions
- **Library Selection**: Approved/prohibited libraries and versions
- **Database Access**: Data access patterns and restrictions
- **Security Requirements**: Security implementation requirements
- **Performance Standards**: Performance benchmarks and requirements
- **Configuration Management**: Configuration and environment rules

### 📝 **Coding Rules**
- **Code Organization**: File and directory structure requirements
- **Naming Conventions**: Variable, function, class naming standards
- **Error Handling**: Error handling patterns and requirements
- **Logging Standards**: Logging format and level requirements
- **Testing Requirements**: Test coverage and testing pattern rules
- **Documentation Standards**: Code documentation requirements

### 🔄 **Process Rules**
- **Development Workflow**: Development process requirements
- **Code Review Standards**: Code review criteria and processes
- **Deployment Rules**: Deployment process and environment rules
- **Monitoring Requirements**: Observability and monitoring standards
- **Maintenance Procedures**: Ongoing maintenance and update rules

## Output Format

Please provide your analysis in the following JSON format:

\`\`\`json
{
  "extractedRules": [
    {
      "id": "unique-rule-id",
      "name": "Rule Name",
      "description": "Detailed rule description",
      "category": "architectural|technology|coding|process|security|performance",
      "type": "must|should|may|must_not|should_not",
      "severity": "info|warning|error|critical",
      "scope": "global|module|component|function|file",
      "pattern": "detection pattern or condition",
      "message": "violation message template",
      "examples": {
        "valid": ["examples of valid implementations"],
        "invalid": ["examples of rule violations"]
      },
      "sourceAdrs": ["adr-id-1", "adr-id-2"],
      "evidence": ["specific text from ADRs supporting this rule"],
      "automatable": true/false,
      "confidence": 0.0-1.0,
      "tags": ["relevant", "tags"]
    }
  ],
  "ruleCategories": [
    {
      "category": "category-name",
      "description": "category description",
      "ruleCount": 0,
      "priority": "low|medium|high|critical"
    }
  ],
  "ruleDependencies": [
    {
      "ruleId": "rule-id",
      "dependsOn": ["other-rule-ids"],
      "conflictsWith": ["conflicting-rule-ids"],
      "relationship": "requires|enhances|conflicts|supersedes"
    }
  ],
  "validationStrategies": [
    {
      "strategy": "static_analysis|dynamic_analysis|manual_review|automated_testing",
      "applicableRules": ["rule-ids"],
      "toolRequirements": ["required tools or frameworks"],
      "complexity": "low|medium|high"
    }
  ],
  "implementationGuidance": {
    "priorityOrder": ["rule-ids in priority order"],
    "quickWins": ["easily implementable rule-ids"],
    "complexRules": ["rule-ids requiring significant effort"],
    "toolingNeeds": ["tools needed for validation"],
    "trainingNeeds": ["areas where team training is needed"]
  }
}
\`\`\`

## Extraction Guidelines

1. **Actionable Rules**: Focus on rules that can be validated or enforced
2. **Clear Patterns**: Ensure rules have clear detection patterns
3. **Specific Messages**: Provide helpful violation messages
4. **Evidence-Based**: Link rules to specific ADR content
5. **Practical Implementation**: Consider how rules can be validated in practice
6. **Avoid Duplication**: Don't extract rules that already exist

Please provide a comprehensive extraction of actionable architectural rules.
`;
}

/**
 * AI prompt for generating rules from code patterns
 */
export function generatePatternBasedRulePrompt(
  projectStructure: string,
  codePatterns: Array<{
    pattern: string;
    frequency: number;
    examples: string[];
    category: string;
  }>,
  existingRules?: string[]
): string {
  return `
# Pattern-Based Rule Generation

Please analyze the following code patterns and project structure to generate architectural rules that enforce consistency and best practices.

## Project Structure
\`\`\`
${projectStructure}
\`\`\`

## Detected Code Patterns
${codePatterns.map((pattern, index) => `
### Pattern ${index + 1}: ${pattern.pattern}
**Category**: ${pattern.category}
**Frequency**: ${pattern.frequency} occurrences
**Examples**:
${pattern.examples.map(example => `\`\`\`\n${example}\n\`\`\``).join('\n')}
`).join('')}

${existingRules ? `## Existing Rules
${existingRules.map(rule => `- ${rule}`).join('\n')}
` : ''}

## Pattern Analysis Requirements

Please analyze patterns to generate rules for:

### 🔍 **Consistency Rules**
- **Naming Patterns**: Consistent naming across similar components
- **Structure Patterns**: Consistent file and directory organization
- **Import Patterns**: Consistent dependency import styles
- **Export Patterns**: Consistent module export conventions
- **Configuration Patterns**: Consistent configuration approaches

### 📐 **Quality Rules**
- **Complexity Limits**: Based on observed complexity patterns
- **Size Limits**: File, function, or component size constraints
- **Dependency Rules**: Dependency count and type restrictions
- **Coupling Rules**: Loose coupling enforcement based on patterns
- **Cohesion Rules**: High cohesion requirements

### 🛡️ **Safety Rules**
- **Error Handling**: Consistent error handling patterns
- **Null Safety**: Null/undefined handling patterns
- **Type Safety**: Type usage and validation patterns
- **Security Patterns**: Security implementation consistency
- **Resource Management**: Resource cleanup and management

### 🎯 **Performance Rules**
- **Optimization Patterns**: Performance optimization consistency
- **Caching Rules**: Caching strategy enforcement
- **Lazy Loading**: Lazy loading pattern consistency
- **Memory Management**: Memory usage pattern rules
- **Network Efficiency**: Network call optimization rules

## Output Format

Please provide your analysis in the following JSON format:

\`\`\`json
{
  "generatedRules": [
    {
      "id": "pattern-rule-id",
      "name": "Rule Name",
      "description": "Rule description based on observed patterns",
      "category": "consistency|quality|safety|performance|structure",
      "type": "must|should|may|must_not|should_not",
      "severity": "info|warning|error|critical",
      "pattern": "regex or detection pattern",
      "message": "violation message",
      "sourcePattern": "original pattern that inspired this rule",
      "frequency": "how often this pattern appears",
      "examples": {
        "compliant": ["examples following the pattern"],
        "violations": ["examples violating the pattern"]
      },
      "automatable": true/false,
      "confidence": 0.0-1.0,
      "rationale": "why this rule is beneficial"
    }
  ],
  "patternAnalysis": {
    "totalPatterns": ${codePatterns.length},
    "consistencyScore": 0.0-1.0,
    "qualityIndicators": ["identified quality patterns"],
    "antiPatterns": ["identified anti-patterns"],
    "recommendations": ["recommendations for improvement"]
  },
  "ruleMetrics": {
    "highConfidenceRules": 0,
    "automatableRules": 0,
    "criticalRules": 0,
    "quickWinRules": 0
  },
  "implementationPlan": {
    "phase1": ["immediate rules to implement"],
    "phase2": ["medium-term rules"],
    "phase3": ["long-term rules"],
    "toolingRequirements": ["tools needed for validation"]
  }
}
\`\`\`

## Generation Guidelines

1. **Pattern-Based**: Base rules on actual observed patterns
2. **Frequency-Weighted**: Prioritize rules based on pattern frequency
3. **Consistency-Focused**: Emphasize consistency over perfection
4. **Practical Validation**: Ensure rules can be automatically validated
5. **Clear Rationale**: Explain why each rule is beneficial
6. **Incremental Implementation**: Provide phased implementation approach

Please generate practical, pattern-based architectural rules.
`;
}

/**
 * AI prompt for validating code against rules
 */
export function generateCodeValidationPrompt(
  codeToValidate: string,
  fileName: string,
  rules: Array<{
    id: string;
    name: string;
    description: string;
    pattern: string;
    severity: string;
    message: string;
  }>,
  validationType: 'file' | 'function' | 'component' | 'module' = 'file'
): string {
  return `
# Code Validation Against Architectural Rules

Please validate the following code against the specified architectural rules and report any violations.

## Code to Validate
**File**: ${fileName}
**Validation Type**: ${validationType}

\`\`\`
${codeToValidate.slice(0, 3000)}${codeToValidate.length > 3000 ? '\n... (truncated for analysis)' : ''}
\`\`\`

## Architectural Rules
${rules.map((rule, index) => `
### Rule ${index + 1}: ${rule.name}
**ID**: ${rule.id}
**Severity**: ${rule.severity}
**Pattern**: ${rule.pattern}
**Description**: ${rule.description}
**Violation Message**: ${rule.message}
`).join('')}

## Validation Requirements

Please perform comprehensive validation checking for:

### 🔍 **Rule Compliance**
- **Pattern Matching**: Check if code matches required patterns
- **Constraint Violations**: Identify violations of constraints
- **Convention Adherence**: Verify adherence to naming and structure conventions
- **Dependency Rules**: Validate dependency usage and restrictions
- **Security Rules**: Check security implementation requirements

### 📊 **Violation Analysis**
- **Severity Assessment**: Categorize violations by severity
- **Location Identification**: Pinpoint exact locations of violations
- **Impact Analysis**: Assess impact of each violation
- **Fix Suggestions**: Provide specific remediation suggestions
- **Priority Ranking**: Rank violations by fix priority

### 🎯 **Quality Metrics**
- **Overall Compliance**: Calculate compliance percentage
- **Rule Coverage**: Identify which rules were applicable
- **Code Quality Score**: Assess overall code quality
- **Improvement Areas**: Highlight areas for improvement

## Output Format

Please provide your validation results in the following JSON format:

\`\`\`json
{
  "validationResults": {
    "fileName": "${fileName}",
    "validationType": "${validationType}",
    "timestamp": "ISO-8601-timestamp",
    "overallCompliance": 0.0-1.0,
    "totalRulesChecked": ${rules.length},
    "rulesViolated": 0,
    "qualityScore": 0.0-1.0
  },
  "violations": [
    {
      "ruleId": "rule-id",
      "ruleName": "Rule Name",
      "severity": "info|warning|error|critical",
      "message": "specific violation message",
      "location": {
        "line": 0,
        "column": 0,
        "endLine": 0,
        "endColumn": 0
      },
      "codeSnippet": "relevant code snippet",
      "suggestion": "specific fix suggestion",
      "effort": "low|medium|high",
      "priority": "low|medium|high|critical",
      "category": "architectural|technology|coding|process|security|performance"
    }
  ],
  "compliance": [
    {
      "ruleId": "rule-id",
      "ruleName": "Rule Name",
      "status": "compliant",
      "evidence": "evidence of compliance",
      "location": "where compliance was verified"
    }
  ],
  "metrics": {
    "criticalViolations": 0,
    "errorViolations": 0,
    "warningViolations": 0,
    "infoViolations": 0,
    "linesAnalyzed": 0,
    "complexityScore": 0.0-1.0,
    "maintainabilityScore": 0.0-1.0
  },
  "recommendations": [
    {
      "priority": "high|medium|low",
      "category": "immediate|short_term|long_term",
      "description": "specific recommendation",
      "impact": "expected impact of implementing this recommendation",
      "effort": "estimated effort required"
    }
  ],
  "summary": {
    "status": "compliant|violations_found|critical_issues",
    "keyIssues": ["most important issues to address"],
    "strengths": ["areas where code excels"],
    "nextSteps": ["recommended next actions"]
  }
}
\`\`\`

## Validation Guidelines

1. **Thorough Analysis**: Check every applicable rule carefully
2. **Precise Locations**: Provide exact line and column numbers
3. **Actionable Feedback**: Give specific, implementable suggestions
4. **Severity Appropriate**: Use appropriate severity levels
5. **Context Aware**: Consider the specific context and purpose of the code
6. **Constructive Tone**: Focus on improvement rather than criticism

Please provide comprehensive, actionable validation results.
`;
}

/**
 * AI prompt for reporting rule deviations and compliance status
 */
export function generateRuleDeviationReportPrompt(
  validationResults: Array<{
    fileName: string;
    violations: Array<{
      ruleId: string;
      ruleName: string;
      severity: string;
      message: string;
      location: any;
    }>;
    compliance: Array<{
      ruleId: string;
      ruleName: string;
      status: string;
    }>;
    overallCompliance: number;
  }>,
  rules: Array<{
    id: string;
    name: string;
    category: string;
    severity: string;
  }>,
  reportType: 'summary' | 'detailed' | 'trend' | 'compliance' = 'summary'
): string {
  return `
# Rule Deviation and Compliance Report

Please generate a comprehensive report analyzing rule violations and compliance across the codebase.

## Validation Results
${validationResults.map((result, index) => `
### File ${index + 1}: ${result.fileName}
**Overall Compliance**: ${(result.overallCompliance * 100).toFixed(1)}%
**Violations**: ${result.violations.length}
**Compliant Rules**: ${result.compliance.length}

**Violations**:
${result.violations.map(v => `- **${v.ruleName}** (${v.severity}): ${v.message}`).join('\n')}
`).join('')}

## Rule Definitions
${rules.map((rule, index) => `
### Rule ${index + 1}: ${rule.name}
**ID**: ${rule.id}
**Category**: ${rule.category}
**Severity**: ${rule.severity}
`).join('')}

## Report Type
${reportType.toUpperCase()}

## Report Requirements

Please generate a comprehensive report including:

### 📊 **Executive Summary**
- **Overall Compliance Rate**: Across all files and rules
- **Critical Issues**: Number and description of critical violations
- **Improvement Trends**: Progress over time (if trend report)
- **Key Recommendations**: Top 3-5 recommendations for improvement
- **Risk Assessment**: Overall risk level and mitigation priorities

### 📈 **Detailed Analysis**
- **Rule-by-Rule Breakdown**: Compliance rate for each rule
- **Category Analysis**: Compliance by rule category
- **Severity Distribution**: Breakdown of violations by severity
- **File-by-File Analysis**: Compliance status for each file
- **Hotspot Identification**: Files or areas with most violations

### 🎯 **Actionable Insights**
- **Priority Fixes**: Violations that should be addressed first
- **Quick Wins**: Easy fixes that improve compliance significantly
- **Systemic Issues**: Patterns indicating broader architectural problems
- **Training Needs**: Areas where team education would help
- **Tool Recommendations**: Tools that could help improve compliance

### 📋 **Implementation Roadmap**
- **Immediate Actions**: Critical fixes needed within days
- **Short-term Goals**: Improvements for next 1-4 weeks
- **Medium-term Objectives**: Goals for next 1-3 months
- **Long-term Vision**: Architectural improvements over 3+ months
- **Success Metrics**: How to measure improvement progress

## Output Format

Please provide your report in the following JSON format:

\`\`\`json
{
  "reportMetadata": {
    "reportType": "${reportType}",
    "generatedAt": "ISO-8601-timestamp",
    "filesAnalyzed": ${validationResults.length},
    "rulesEvaluated": ${rules.length},
    "reportVersion": "1.0"
  },
  "executiveSummary": {
    "overallComplianceRate": 0.0-1.0,
    "totalViolations": 0,
    "criticalIssues": 0,
    "riskLevel": "low|medium|high|critical",
    "keyFindings": ["most important findings"],
    "topRecommendations": ["priority recommendations"],
    "complianceTrend": "improving|stable|declining|unknown"
  },
  "detailedAnalysis": {
    "ruleCompliance": [
      {
        "ruleId": "rule-id",
        "ruleName": "Rule Name",
        "category": "rule category",
        "complianceRate": 0.0-1.0,
        "violationCount": 0,
        "affectedFiles": ["file names"],
        "severity": "rule severity",
        "trend": "improving|stable|declining"
      }
    ],
    "categoryBreakdown": [
      {
        "category": "category name",
        "complianceRate": 0.0-1.0,
        "violationCount": 0,
        "ruleCount": 0,
        "priority": "high|medium|low"
      }
    ],
    "severityDistribution": {
      "critical": 0,
      "error": 0,
      "warning": 0,
      "info": 0
    },
    "fileAnalysis": [
      {
        "fileName": "file name",
        "complianceRate": 0.0-1.0,
        "violationCount": 0,
        "riskScore": 0.0-1.0,
        "priority": "high|medium|low"
      }
    ]
  },
  "actionableInsights": {
    "priorityFixes": [
      {
        "description": "fix description",
        "impact": "high|medium|low",
        "effort": "low|medium|high",
        "affectedFiles": ["file names"],
        "deadline": "suggested deadline"
      }
    ],
    "quickWins": [
      {
        "description": "quick win description",
        "benefit": "expected benefit",
        "effort": "minimal effort required",
        "files": ["affected files"]
      }
    ],
    "systemicIssues": [
      {
        "pattern": "identified pattern",
        "description": "issue description",
        "rootCause": "likely root cause",
        "solution": "recommended solution"
      }
    ],
    "trainingNeeds": [
      {
        "area": "training area",
        "description": "what training is needed",
        "priority": "high|medium|low",
        "audience": "who needs training"
      }
    ]
  },
  "implementationRoadmap": {
    "immediate": [
      {
        "action": "immediate action",
        "timeline": "within days",
        "owner": "suggested owner",
        "success_criteria": "how to measure success"
      }
    ],
    "shortTerm": [
      {
        "action": "short-term action",
        "timeline": "1-4 weeks",
        "dependencies": ["what this depends on"],
        "resources": ["required resources"]
      }
    ],
    "mediumTerm": [
      {
        "action": "medium-term action",
        "timeline": "1-3 months",
        "strategic_value": "strategic importance",
        "investment": "required investment"
      }
    ],
    "longTerm": [
      {
        "action": "long-term action",
        "timeline": "3+ months",
        "vision": "long-term vision",
        "transformation": "expected transformation"
      }
    ]
  },
  "successMetrics": {
    "complianceTargets": {
      "immediate": 0.0-1.0,
      "shortTerm": 0.0-1.0,
      "mediumTerm": 0.0-1.0,
      "longTerm": 0.0-1.0
    },
    "violationReduction": {
      "critical": "target reduction percentage",
      "error": "target reduction percentage",
      "warning": "target reduction percentage"
    },
    "qualityMetrics": [
      "specific quality metrics to track"
    ]
  }
}
\`\`\`

## Report Guidelines

1. **Data-Driven**: Base all conclusions on actual validation data
2. **Actionable**: Provide specific, implementable recommendations
3. **Prioritized**: Rank issues and actions by impact and urgency
4. **Realistic**: Set achievable goals and timelines
5. **Comprehensive**: Cover all aspects of compliance and improvement
6. **Strategic**: Align recommendations with business and technical goals

Please generate a comprehensive, actionable compliance report.
`;
}
