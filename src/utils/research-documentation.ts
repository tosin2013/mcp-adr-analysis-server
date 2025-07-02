/**
 * Research documentation utilities
 * Creates structured research documentation in docs/research/
 */

import { McpAdrError } from '../types/index.js';

export interface ResearchDocument {
  id: string;
  title: string;
  category: string;
  status: 'planned' | 'in_progress' | 'completed' | 'cancelled';
  priority: 'critical' | 'high' | 'medium' | 'low';
  questions: Array<{
    id: string;
    question: string;
    type: string;
    methodology: string;
  }>;
  timeline: {
    startDate: string;
    endDate: string;
    milestones: Array<{
      name: string;
      date: string;
      description: string;
    }>;
  };
  resources: Array<{
    type: string;
    description: string;
    status: string;
  }>;
  findings: Array<{
    date: string;
    finding: string;
    confidence: number;
    impact: string;
  }>;
  recommendations: Array<{
    recommendation: string;
    rationale: string;
    implementation: string;
    priority: string;
  }>;
}

/**
 * Create perform_research.md file for a research topic
 */
export async function createResearchDocument(
  researchData: ResearchDocument,
  outputDirectory: string = 'docs/research'
): Promise<{ filePath: string; content: string }> {
  try {
    const { promises: fs } = await import('fs');
    const { join } = await import('path');

    // Ensure output directory exists
    await fs.mkdir(outputDirectory, { recursive: true });

    // Generate research document content
    const content = generateResearchDocumentContent(researchData);

    // Create filename
    const filename = `perform_research_${researchData.id.toLowerCase().replace(/[^a-z0-9]/g, '_')}.md`;
    const filePath = join(outputDirectory, filename);

    // Write file
    await fs.writeFile(filePath, content, 'utf-8');

    return {
      filePath,
      content,
    };
  } catch (error) {
    throw new McpAdrError(
      `Failed to create research document: ${error instanceof Error ? error.message : String(error)}`,
      'RESEARCH_DOCUMENT_ERROR'
    );
  }
}

/**
 * Generate research document content in markdown format
 */
function generateResearchDocumentContent(research: ResearchDocument): string {
  const now = new Date().toISOString().split('T')[0];

  return `# Research: ${research.title}

**Research ID**: ${research.id}  
**Category**: ${research.category}  
**Status**: ${research.status}  
**Priority**: ${research.priority}  
**Created**: ${now}  

## Overview

This document tracks the research progress for "${research.title}". It includes research questions, methodology, findings, and recommendations.

## Research Questions

${research.questions
  .map(
    (q, index) => `
### ${index + 1}. ${q.question}

**Question ID**: ${q.id}  
**Type**: ${q.type}  
**Methodology**: ${q.methodology}  

**Status**: [ ] Not Started / [ ] In Progress / [ ] Completed

**Findings**:
- [ ] Finding 1
- [ ] Finding 2
- [ ] Finding 3

**Notes**:
<!-- Add research notes here -->

---
`
  )
  .join('')}

## Timeline & Milestones

**Start Date**: ${research.timeline.startDate}  
**End Date**: ${research.timeline.endDate}  

### Milestones

${research.timeline.milestones
  .map(
    milestone => `
- **${milestone.name}** (${milestone.date}): ${milestone.description}
`
  )
  .join('')}

## Resources Required

${research.resources
  .map(
    resource => `
- **${resource.type}**: ${resource.description} (Status: ${resource.status})
`
  )
  .join('')}

## Research Progress

### Current Status
- [ ] Research planning completed
- [ ] Resources secured
- [ ] Research questions defined
- [ ] Methodology established
- [ ] Data collection started
- [ ] Analysis in progress
- [ ] Findings documented
- [ ] Recommendations formulated
- [ ] Research completed

### Progress Notes

| Date | Progress | Notes |
|------|----------|-------|
| ${now} | Research document created | Initial research planning |
<!-- Add progress entries here -->

## Findings

${
  research.findings.length > 0
    ? research.findings
        .map(
          finding => `
### Finding: ${finding.finding}

**Date**: ${finding.date}  
**Confidence**: ${finding.confidence * 100}%  
**Impact**: ${finding.impact}  

**Details**:
<!-- Add detailed finding information here -->

---
`
        )
        .join('')
    : `
<!-- Findings will be documented here as research progresses -->

### Template for Findings

**Finding**: [Brief description]  
**Date**: [Date of finding]  
**Confidence**: [0-100%]  
**Impact**: [Low/Medium/High/Critical]  

**Details**:
[Detailed explanation of the finding]

**Evidence**:
- [Supporting evidence 1]
- [Supporting evidence 2]

**Implications**:
- [Implication 1]
- [Implication 2]

---
`
}

## Recommendations

${
  research.recommendations.length > 0
    ? research.recommendations
        .map(
          (rec, index) => `
### Recommendation ${index + 1}: ${rec.recommendation}

**Priority**: ${rec.priority}  
**Rationale**: ${rec.rationale}  
**Implementation**: ${rec.implementation}  

---
`
        )
        .join('')
    : `
<!-- Recommendations will be documented here based on research findings -->

### Template for Recommendations

**Recommendation**: [Brief description]  
**Priority**: [Critical/High/Medium/Low]  
**Rationale**: [Why this recommendation is important]  
**Implementation**: [How to implement this recommendation]  

**Expected Benefits**:
- [Benefit 1]
- [Benefit 2]

**Risks & Mitigation**:
- [Risk 1]: [Mitigation strategy]
- [Risk 2]: [Mitigation strategy]

**Success Criteria**:
- [Criteria 1]
- [Criteria 2]

---
`
}

## Research Methodology

### Approach
<!-- Document the research approach and methodology here -->

### Data Collection
<!-- Document data collection methods and sources -->

### Analysis Methods
<!-- Document analysis methods and tools -->

### Validation Approach
<!-- Document how findings will be validated -->

## Risk Management

### Identified Risks
<!-- Document potential risks to research success -->

### Mitigation Strategies
<!-- Document risk mitigation approaches -->

## Quality Assurance

### Review Process
<!-- Document peer review and validation process -->

### Documentation Standards
<!-- Document quality standards for research documentation -->

## Knowledge Sharing

### Stakeholders
<!-- List stakeholders who should be informed of findings -->

### Communication Plan
<!-- Document how findings will be communicated -->

### Follow-up Actions
<!-- Document planned follow-up actions based on research -->

## References

<!-- Add references to relevant ADRs, documentation, and external sources -->

### Related ADRs
<!-- Link to relevant Architectural Decision Records -->

### External References
<!-- Link to external research, documentation, and resources -->

## Appendices

### Appendix A: Research Data
<!-- Include raw research data and supporting materials -->

### Appendix B: Analysis Details
<!-- Include detailed analysis and calculations -->

### Appendix C: Additional Resources
<!-- Include additional supporting materials -->

---

**Document Status**: ${research.status}  
**Last Updated**: ${now}  
**Next Review**: [Schedule next review date]  

<!-- 
Research Document Guidelines:
1. Update progress regularly
2. Document all findings with evidence
3. Include confidence levels for findings
4. Link to relevant ADRs and documentation
5. Share findings with stakeholders
6. Archive completed research appropriately
-->
`;
}

/**
 * Create research index file
 */
export async function createResearchIndex(
  researchDocuments: ResearchDocument[],
  outputDirectory: string = 'docs/research'
): Promise<{ filePath: string; content: string }> {
  try {
    const { promises: fs } = await import('fs');
    const { join } = await import('path');

    // Ensure output directory exists
    await fs.mkdir(outputDirectory, { recursive: true });

    // Generate index content
    const content = generateResearchIndexContent(researchDocuments);

    const filePath = join(outputDirectory, 'README.md');

    // Write file
    await fs.writeFile(filePath, content, 'utf-8');

    return {
      filePath,
      content,
    };
  } catch (error) {
    throw new McpAdrError(
      `Failed to create research index: ${error instanceof Error ? error.message : String(error)}`,
      'RESEARCH_INDEX_ERROR'
    );
  }
}

/**
 * Generate research index content
 */
function generateResearchIndexContent(researchDocuments: ResearchDocument[]): string {
  const now = new Date().toISOString().split('T')[0];

  // Group by status
  const byStatus = researchDocuments.reduce(
    (acc, doc) => {
      if (!acc[doc.status]) acc[doc.status] = [];
      acc[doc.status]!.push(doc);
      return acc;
    },
    {} as Record<string, ResearchDocument[]>
  );

  // Group by category
  const byCategory = researchDocuments.reduce(
    (acc, doc) => {
      if (!acc[doc.category]) acc[doc.category] = [];
      acc[doc.category]!.push(doc);
      return acc;
    },
    {} as Record<string, ResearchDocument[]>
  );

  return `# Research Documentation Index

This directory contains all research documentation for the project. Each research topic has its own \`perform_research_*.md\` file with detailed tracking and findings.

**Last Updated**: ${now}  
**Total Research Topics**: ${researchDocuments.length}  

## Quick Stats

- **Planned**: ${byStatus['planned']?.length || 0}
- **In Progress**: ${byStatus['in_progress']?.length || 0}
- **Completed**: ${byStatus['completed']?.length || 0}
- **Cancelled**: ${byStatus['cancelled']?.length || 0}

## Research by Status

### 🔄 In Progress
${
  byStatus['in_progress']
    ?.map(
      doc => `
- [${doc.title}](./perform_research_${doc.id.toLowerCase().replace(/[^a-z0-9]/g, '_')}.md) (${doc.priority} priority)
`
    )
    .join('') || 'No research currently in progress.'
}

### 📋 Planned
${
  byStatus['planned']
    ?.map(
      doc => `
- [${doc.title}](./perform_research_${doc.id.toLowerCase().replace(/[^a-z0-9]/g, '_')}.md) (${doc.priority} priority)
`
    )
    .join('') || 'No research currently planned.'
}

### ✅ Completed
${
  byStatus['completed']
    ?.map(
      doc => `
- [${doc.title}](./perform_research_${doc.id.toLowerCase().replace(/[^a-z0-9]/g, '_')}.md) (${doc.priority} priority)
`
    )
    .join('') || 'No research completed yet.'
}

### ❌ Cancelled
${
  byStatus['cancelled']
    ?.map(
      doc => `
- [${doc.title}](./perform_research_${doc.id.toLowerCase().replace(/[^a-z0-9]/g, '_')}.md) (${doc.priority} priority)
`
    )
    .join('') || 'No research cancelled.'
}

## Research by Category

${Object.entries(byCategory)
  .map(
    ([category, docs]) => `
### ${category.charAt(0).toUpperCase() + category.slice(1)}
${docs
  .map(
    doc => `
- [${doc.title}](./perform_research_${doc.id.toLowerCase().replace(/[^a-z0-9]/g, '_')}.md) (${doc.status}, ${doc.priority} priority)
`
  )
  .join('')}
`
  )
  .join('')}

## Research Guidelines

### Creating New Research
1. Use the \`generate_research_questions\` MCP tool to create research questions
2. Create a new \`perform_research_*.md\` file using the research documentation utilities
3. Update this index file to include the new research
4. Begin research execution following the documented methodology

### Research Process
1. **Planning**: Define questions, methodology, and timeline
2. **Execution**: Collect data and conduct analysis
3. **Documentation**: Record findings with evidence and confidence levels
4. **Review**: Peer review and validation of findings
5. **Communication**: Share findings with stakeholders
6. **Implementation**: Apply recommendations and track outcomes

### Quality Standards
- All findings must include confidence levels and supporting evidence
- Research methodology must be clearly documented
- Regular progress updates are required
- Peer review is mandatory for critical findings
- All research must link to relevant ADRs and architectural decisions

### Documentation Standards
- Use the provided research document template
- Include clear research questions and methodology
- Document all findings with dates and confidence levels
- Provide actionable recommendations with implementation guidance
- Link to relevant ADRs and external references

## Research Tools

### MCP Tools Available
- \`generate_research_questions\`: Generate context-aware research questions
- \`analyze_environment\`: Analyze environment context for research
- \`generate_rules\`: Generate architectural rules from research findings

### Research Methodologies
- Literature review and analysis
- Experimental validation and testing
- Prototype development and evaluation
- Stakeholder interviews and surveys
- Architectural analysis and modeling

## Knowledge Management

### Research Findings Integration
- Update relevant ADRs with research findings
- Create new ADRs based on research recommendations
- Update architectural documentation with new insights
- Share findings through team knowledge sharing sessions

### Research Archive
- Completed research is archived but remains accessible
- Research findings are integrated into project knowledge base
- Lessons learned are documented for future research
- Research methodologies are refined based on experience

---

**Research Coordination**: [Assign research coordinator]  
**Next Review**: [Schedule regular research review meetings]  
**Knowledge Sharing**: [Plan knowledge sharing sessions]  

For questions about research processes or to propose new research topics, please contact the research coordinator or create an issue in the project repository.
`;
}
