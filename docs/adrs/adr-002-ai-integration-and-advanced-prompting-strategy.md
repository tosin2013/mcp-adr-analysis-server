# ADR-002: AI Integration and Advanced Prompting Strategy

## Status

Accepted

## Context

The MCP ADR Analysis Server integrates advanced AI capabilities for architectural analysis, including Knowledge Generation, Reflexion learning, and Automatic Prompt Engineering (APE). The system needs to provide high-quality analysis with confidence scoring, evidence-based recommendations, and systematic verification processes. The choice of AI integration approach affects analysis quality, response time, system complexity, and reliability.

## Decision

We will implement a hybrid AI integration approach using advanced prompting techniques (Knowledge Generation + Reflexion + APE) with external AI services, combined with local caching and methodological pragmatism framework for systematic verification and confidence scoring.

Key components:

- **Knowledge Generation**: Domain-specific architectural knowledge enhancement
- **Reflexion Learning**: Learning from past analysis outcomes and experiences
- **Automatic Prompt Engineering**: Optimized prompt generation for better results
- **Confidence Scoring**: Systematic confidence assessment for all recommendations
- **Evidence-Based Analysis**: All recommendations backed by concrete evidence
- **Methodological Pragmatism**: Explicit fallibilism and systematic verification

## Consequences

**Positive:**

- Enhanced analysis quality with confidence scoring and evidence backing
- Systematic verification processes reduce false positives
- Learning from past experiences improves future analysis
- Methodological pragmatism provides structured approach to uncertainty
- Advanced prompting techniques improve AI response quality
- Local caching reduces latency and external service dependency

**Negative:**

- Increased complexity in prompt management and AI workflow orchestration
- Dependency on external AI services for advanced analysis
- Potential latency in analysis due to multi-step AI processing
- Need for sophisticated error handling and fallback mechanisms
- Higher computational costs due to advanced prompting techniques
- Complexity in managing confidence scoring and evidence validation

## Evolution Notes (2025)

> **CE-MCP Paradigm Shift**: This ADR documents the original AI integration strategy with advanced prompting techniques. As of 2025, the CE-MCP paradigm shifts the LLM's role from step-by-step planner to holistic code generator. See **ADR-014** for the complete evolution.

**Key Changes in CE-MCP:**

- LLM generates complete orchestration scripts (Python/TypeScript) instead of sequential tool calls
- Context assembly moves from upfront composition to sandbox-based lazy loading
- Intermediate results stay in sandbox memory rather than passing through LLM context
- Prompt loading becomes on-demand via catalog registry (96% token reduction)

**This ADR Remains Valid For:**

- Knowledge Generation concepts (moved to sandbox operations)
- Reflexion Learning principles (state managed in sandbox)
- Confidence Scoring methodology
- Evidence-Based Analysis requirements
- Methodological Pragmatism framework

**Token Optimization Context:**
Analysis revealed inefficiencies in current implementation:

- 6,145 lines of prompts (~28K tokens) loaded upfront
- 121+ AI call points with intermediate result embedding
- Sequential context assembly (9K-12K tokens before LLM call)

**Superseded By ADR-014 For:**

- Prompt loading strategy (now lazy-loading registry)
- Context composition patterns (now sandbox directives)
- Multi-step AI workflow orchestration (now code-generated)

## Related ADRs

- ADR-001: MCP Protocol Implementation Strategy (foundation)
- ADR-014: CE-MCP Architecture (evolves this ADR)
