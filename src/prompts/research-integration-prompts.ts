/**
 * AI prompts for research integration and findings incorporation
 * Following prompt-driven development approach
 */

/**
 * AI prompt for extracting key topics from research files
 */
export function generateResearchTopicExtractionPrompt(
  researchFiles: Array<{
    filename: string;
    content: string;
    lastModified: string;
    size: number;
  }>,
  existingTopics?: string[]
): string {
  return `
# Research Topic Extraction

Please analyze the following research files and extract key topics, findings, and insights that could impact architectural decisions.

## Research Files
${researchFiles.map((file, index) => `
### ${index + 1}. ${file.filename}
**Last Modified**: ${file.lastModified}
**Size**: ${file.size} bytes

**Content**:
\`\`\`
${file.content.slice(0, 2000)}${file.content.length > 2000 ? '\n... (truncated for analysis)' : ''}
\`\`\`
`).join('')}

${existingTopics ? `## Previously Identified Topics
${existingTopics.map(topic => `- ${topic}`).join('\n')}
` : ''}

## Extraction Requirements

Please identify and extract:

### 🔬 **Research Topics**
- **Technology Evaluations**: New frameworks, libraries, tools, platforms
- **Performance Studies**: Benchmarks, optimization findings, scalability research
- **Security Research**: Vulnerability assessments, security best practices
- **Architecture Patterns**: New patterns, anti-patterns, design approaches
- **Industry Trends**: Market analysis, adoption trends, future predictions
- **Best Practices**: Development methodologies, operational practices

### 📊 **Research Findings**
- **Quantitative Results**: Performance metrics, benchmarks, statistics
- **Qualitative Insights**: Expert opinions, case studies, lessons learned
- **Comparative Analysis**: Technology comparisons, trade-off analysis
- **Risk Assessments**: Identified risks, mitigation strategies
- **Implementation Guidance**: How-to guides, implementation patterns

### 🎯 **Architectural Relevance**
- **Decision Impact**: How findings could affect current or future decisions
- **Technology Choices**: Implications for technology selection
- **Design Patterns**: New patterns or pattern modifications
- **Non-functional Requirements**: Performance, security, scalability impacts
- **Process Changes**: Development or operational process improvements

## Output Format

Please provide your analysis in the following JSON format:

\`\`\`json
{
  "extractedTopics": [
    {
      "id": "unique-topic-id",
      "title": "Topic title",
      "category": "technology|performance|security|architecture|process|industry",
      "description": "Detailed topic description",
      "sourceFiles": ["filename1", "filename2"],
      "keyFindings": [
        "specific finding or insight"
      ],
      "evidence": [
        "supporting evidence or data points"
      ],
      "confidence": 0.0-1.0,
      "relevanceScore": 0.0-1.0,
      "lastUpdated": "YYYY-MM-DD",
      "tags": ["relevant", "tags"]
    }
  ],
  "researchSummary": {
    "totalFiles": ${researchFiles.length},
    "topicCount": 0,
    "primaryCategories": ["identified categories"],
    "researchQuality": 0.0-1.0,
    "completeness": 0.0-1.0,
    "actionability": 0.0-1.0
  },
  "keyInsights": [
    {
      "insight": "Major insight or finding",
      "impact": "low|medium|high|critical",
      "category": "technology|performance|security|architecture|process",
      "supportingTopics": ["topic-id-1", "topic-id-2"],
      "actionRequired": true/false,
      "urgency": "low|medium|high|critical"
    }
  ],
  "recommendations": [
    "specific recommendations for incorporating these findings"
  ],
  "gaps": [
    {
      "area": "research gap area",
      "description": "what's missing",
      "suggestedResearch": "suggested research to fill the gap"
    }
  ]
}
\`\`\`

## Extraction Guidelines

1. **Comprehensive Coverage**: Extract all relevant topics, don't miss important findings
2. **Accurate Categorization**: Properly categorize topics and findings
3. **Evidence-Based**: Ensure all findings are supported by evidence
4. **Relevance Assessment**: Focus on architecturally relevant insights
5. **Actionable Insights**: Prioritize findings that can lead to concrete actions
6. **Quality Assessment**: Evaluate the quality and reliability of research

Please provide a thorough analysis of the research findings and their architectural implications.
`;
}

/**
 * AI prompt for evaluating research impact on existing ADRs
 */
export function generateResearchImpactEvaluationPrompt(
  researchTopics: Array<{
    id: string;
    title: string;
    category: string;
    keyFindings: string[];
    relevanceScore: number;
  }>,
  existingAdrs: Array<{
    id: string;
    title: string;
    status: string;
    content: string;
    category?: string;
  }>
): string {
  return `
# Research Impact Evaluation on Existing ADRs

Please analyze how the extracted research findings impact existing Architectural Decision Records and suggest necessary updates.

## Research Topics
${researchTopics.map((topic, index) => `
### ${index + 1}. ${topic.title}
- **ID**: ${topic.id}
- **Category**: ${topic.category}
- **Relevance Score**: ${topic.relevanceScore}
- **Key Findings**:
${topic.keyFindings.map(finding => `  - ${finding}`).join('\n')}
`).join('')}

## Existing ADRs
${existingAdrs.map((adr, index) => `
### ${index + 1}. ${adr.title}
- **ID**: ${adr.id}
- **Status**: ${adr.status}
- **Category**: ${adr.category || 'Unknown'}

**Content Preview**:
\`\`\`
${adr.content.slice(0, 1000)}${adr.content.length > 1000 ? '\n... (truncated)' : ''}
\`\`\`
`).join('')}

## Impact Analysis Requirements

Please evaluate:

### 🔍 **Direct Impact Assessment**
- **Contradictory Findings**: Research that contradicts existing decisions
- **Supporting Evidence**: Research that reinforces existing decisions
- **New Considerations**: Research that introduces new factors to consider
- **Technology Updates**: New versions, alternatives, or deprecations
- **Performance Implications**: New performance data or benchmarks

### 📈 **Decision Validity**
- **Still Valid**: Decisions that remain sound despite new research
- **Needs Review**: Decisions that should be reconsidered
- **Requires Update**: Decisions that need modification
- **Should Deprecate**: Decisions that are no longer valid
- **Needs Superseding**: Decisions that should be replaced

### 🎯 **Update Recommendations**
- **Content Updates**: Specific sections that need modification
- **Status Changes**: ADRs that need status updates
- **New Consequences**: Additional consequences to document
- **Alternative Considerations**: New alternatives to evaluate
- **Implementation Changes**: Required implementation modifications

## Output Format

Please provide your analysis in the following JSON format:

\`\`\`json
{
  "impactAnalysis": [
    {
      "adrId": "adr-id",
      "adrTitle": "ADR title",
      "impactLevel": "none|low|medium|high|critical",
      "impactType": "contradictory|supporting|new_considerations|technology_update|performance",
      "affectedSections": ["context", "decision", "consequences", "alternatives"],
      "relatedTopics": ["topic-id-1", "topic-id-2"],
      "findings": [
        "specific research findings that impact this ADR"
      ],
      "recommendedAction": "no_action|review|update|deprecate|supersede",
      "urgency": "low|medium|high|critical",
      "confidence": 0.0-1.0,
      "reasoning": "detailed explanation of the impact assessment"
    }
  ],
  "updateRecommendations": [
    {
      "adrId": "adr-id",
      "updateType": "content|status|consequences|alternatives|implementation",
      "currentContent": "relevant current content",
      "suggestedContent": "suggested new content",
      "justification": "why this update is needed",
      "researchEvidence": ["supporting research findings"],
      "priority": "low|medium|high|critical"
    }
  ],
  "newAdrSuggestions": [
    {
      "title": "Suggested new ADR title",
      "reason": "why a new ADR is needed",
      "triggeringResearch": ["research topics that suggest this ADR"],
      "category": "technology|architecture|security|performance|process",
      "priority": "low|medium|high|critical",
      "relatedAdrs": ["existing ADR IDs that relate to this"]
    }
  ],
  "deprecationSuggestions": [
    {
      "adrId": "adr-id-to-deprecate",
      "reason": "why this ADR should be deprecated",
      "supersededBy": "new ADR or approach",
      "migrationPath": "how to transition from old to new",
      "researchEvidence": ["research that supports deprecation"]
    }
  ],
  "overallAssessment": {
    "totalAdrsAnalyzed": ${existingAdrs.length},
    "adrsRequiringAction": 0,
    "highImpactFindings": 0,
    "newAdrsNeeded": 0,
    "deprecationsNeeded": 0,
    "researchQuality": 0.0-1.0,
    "actionPriority": "low|medium|high|critical"
  }
}
\`\`\`

## Evaluation Guidelines

1. **Thorough Analysis**: Evaluate every ADR against every relevant research topic
2. **Evidence-Based**: Base recommendations on solid research evidence
3. **Impact Assessment**: Accurately assess the level and type of impact
4. **Actionable Recommendations**: Provide specific, implementable suggestions
5. **Priority Guidance**: Help prioritize updates based on impact and urgency
6. **Migration Planning**: Consider transition paths for significant changes

Please provide a comprehensive impact evaluation with clear, actionable recommendations.
`;
}

/**
 * AI prompt for suggesting ADR updates and deprecations
 */
export function generateAdrUpdateSuggestionPrompt(
  adrToUpdate: {
    id: string;
    title: string;
    content: string;
    status: string;
  },
  researchFindings: Array<{
    finding: string;
    evidence: string[];
    impact: string;
  }>,
  updateType: 'content' | 'status' | 'consequences' | 'alternatives' | 'deprecation'
): string {
  return `
# ADR Update Suggestion

Please generate specific update suggestions for the following ADR based on research findings.

## ADR to Update
**ID**: ${adrToUpdate.id}
**Title**: ${adrToUpdate.title}
**Current Status**: ${adrToUpdate.status}

**Current Content**:
\`\`\`markdown
${adrToUpdate.content}
\`\`\`

## Research Findings
${researchFindings.map((finding, index) => `
### Finding ${index + 1}
**Finding**: ${finding.finding}
**Impact**: ${finding.impact}
**Evidence**:
${finding.evidence.map(ev => `- ${ev}`).join('\n')}
`).join('')}

## Update Type
${updateType}

## Update Requirements

Based on the update type, please provide:

### **Content Updates**
- Specific text modifications
- New sections to add
- Sections to remove or modify
- Updated context or decision rationale

### **Status Updates**
- New status recommendation
- Justification for status change
- Migration or transition notes
- Timeline considerations

### **Consequences Updates**
- New positive consequences
- New negative consequences
- Modified existing consequences
- Risk assessments

### **Alternatives Updates**
- New alternatives to consider
- Updated evaluation of existing alternatives
- Deprecated alternatives
- Comparative analysis updates

### **Deprecation Suggestions**
- Deprecation rationale
- Superseding ADR or approach
- Migration path
- Timeline for deprecation

## Output Format

Please provide your suggestions in the following JSON format:

\`\`\`json
{
  "updateSuggestion": {
    "adrId": "${adrToUpdate.id}",
    "updateType": "${updateType}",
    "priority": "low|medium|high|critical",
    "confidence": 0.0-1.0,
    "estimatedEffort": "low|medium|high",
    "breakingChange": true/false
  },
  "proposedChanges": [
    {
      "section": "title|status|context|decision|consequences|alternatives|implementation",
      "changeType": "add|modify|remove|replace",
      "currentContent": "existing content (if modifying/removing)",
      "proposedContent": "new or modified content",
      "justification": "why this change is needed",
      "researchEvidence": ["supporting research findings"]
    }
  ],
  "newContent": {
    "title": "updated title (if changed)",
    "status": "updated status (if changed)",
    "fullContent": "complete updated ADR content in markdown format"
  },
  "migrationGuidance": {
    "impactedSystems": ["systems affected by this change"],
    "requiredActions": ["actions needed to implement this update"],
    "timeline": "suggested timeline for implementation",
    "rollbackPlan": "how to rollback if needed",
    "communicationPlan": "who needs to be notified"
  },
  "qualityChecks": {
    "completeness": 0.0-1.0,
    "clarity": 0.0-1.0,
    "consistency": 0.0-1.0,
    "traceability": 0.0-1.0,
    "issues": ["any quality issues identified"],
    "improvements": ["suggested improvements"]
  },
  "reviewRecommendations": {
    "requiredReviewers": ["stakeholders who should review"],
    "reviewCriteria": ["what to focus on during review"],
    "approvalProcess": "suggested approval process",
    "implementationGates": ["checkpoints before implementation"]
  }
}
\`\`\`

## Update Guidelines

1. **Preserve Intent**: Maintain the original intent while incorporating new findings
2. **Clear Justification**: Provide clear reasoning for all changes
3. **Evidence-Based**: Base all updates on solid research evidence
4. **Backward Compatibility**: Consider impact on existing implementations
5. **Quality Maintenance**: Ensure updates maintain or improve ADR quality
6. **Stakeholder Impact**: Consider impact on all relevant stakeholders

Please provide comprehensive, well-justified update suggestions.
`;
}
