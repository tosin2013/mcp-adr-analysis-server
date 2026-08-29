# Research Documentation Index

This directory contains research documentation for the project, written by the
`perform_research` MCP tool.

**Last Updated**: 2026-08-28

## Research Files Location

- **Location**: `docs/research/` — this directory, and the tool's `researchDirectory` default
- **Format**: `perform-research-{ISO timestamp}.md`, plus `latest.md` mirroring the most recent
- **Configurable**: pass `researchDirectory` to `perform_research` to write elsewhere

> **Corrected 2026-08-28 (#1528).** This file previously stated that research lived in
> `docs/context/research/`. That was true of the code and false of the tool schema, which
> advertised `docs/research` — and `perform_research` accepted no output parameter at all, so
> callers could neither choose nor discover the destination. 187 files accumulated in the
> undocumented path, untracked by git, while this directory held only this README.
>
> The tool now honours `researchDirectory` and defaults to `docs/research/`. The files under
> `docs/context/research/` are artifacts of the old behaviour; see #1528 for their disposition.
> `docs/context/` remains in use by the _context-document_ system for other tools, which is a
> different thing from research output.

## Research Process

### Creating New Research

1. Use the `generate_research_questions` MCP tool to create research questions
2. `perform_research` writes the findings to this directory as
   `perform-research-{ISO timestamp}.md` — the one convention, stated once, above
3. Research findings are integrated into project knowledge base

The `research-index` resource groups these documents by **topic**, which it reads from
the `- Question:` line in each document's Key Findings — not from the filename, and not
from the heading. A timestamped filename carries no subject, and the heading is
`# Tool Context: perform_research` in every research document ever written, so both
collapse every document into one bucket. Parsing them for a topic is what #1530
corrected.

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

- `generate_research_questions`: Generate context-aware research questions
- `analyze_environment`: Analyze environment context for research
- `generate_rules`: Generate architectural rules from research findings

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

For questions about research processes or to propose new research topics, please contact the research coordinator or create an issue in the project repository.
