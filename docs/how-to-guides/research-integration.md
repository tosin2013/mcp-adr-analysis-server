# 🔬 Research Integration Guide

**Learn how to integrate research findings and external knowledge into your architectural decisions.**

---

## 📋 Overview

The MCP ADR Analysis Server includes powerful research integration capabilities that help you:

- Gather relevant research and best practices
- Integrate findings into ADRs automatically
- Track research sources and citations
- Build knowledge-driven architectural decisions

---

## 🎯 Prerequisites

- MCP ADR Analysis Server installed and configured
- Basic understanding of ADRs
- Access to research tools (optional: Firecrawl API)

---

## 🚀 Quick Start

### 1. Generate Research Questions

Use the `perform_research` tool to generate relevant research questions for your project:

```typescript
await mcp.callTool('perform_research', {
  topic: 'microservices architecture',
  depth: 'comprehensive',
  includeExamples: true,
});
```

### 2. Integrate Research into ADRs

The server automatically suggests research-backed decisions:

```typescript
await mcp.callTool('research_integration_tool', {
  adrPath: './docs/adrs/001-architecture.md',
  researchTopics: ['scalability', 'performance'],
  autoApply: false,
});
```

---

## 📖 Step-by-Step Guide

### Step 1: Set Up Research Tools

Configure your environment for research integration:

```bash
# .env file
FIRECRAWL_API_KEY=your_api_key_here  # Optional but recommended
RESEARCH_CACHE_DIR=./.documcp/research
```

### Step 2: Perform Initial Research

Generate research questions for your domain:

```typescript
const research = await mcp.callTool('research_question_tool', {
  projectPath: './',
  domain: 'backend-services',
  focusAreas: ['architecture', 'security', 'performance'],
});
```

### Step 3: Review Research Findings

The server stores research in `.documcp/research/`:

```
.documcp/research/
├── perform_research_001.md
├── perform_research_002.md
└── index.json
```

### Step 4: Integrate into ADRs

Apply research findings to your decisions:

```typescript
await mcp.callTool('interactive_adr_planning_tool', {
  includeResearch: true,
  researchIntensity: 'high',
});
```

---

## 💡 Advanced Techniques

### Custom Research Templates

Create custom research templates for your domain:

```typescript
const template = {
  domain: 'machine-learning',
  questions: [
    'What are best practices for ML model deployment?',
    'How to handle model versioning?',
    'What monitoring strategies work best?',
  ],
  sources: ['arxiv', 'industry-blogs', 'documentation'],
};
```

### Automated Research Updates

Set up periodic research updates:

```bash
# Add to your CI/CD pipeline
npm run research:update -- --topics architecture,security
```

### Research-Driven ADR Generation

Generate ADRs directly from research:

```typescript
await mcp.callTool('generate_adrs_from_prd', {
  prdPath: './docs/requirements.md',
  includeResearch: true,
  researchDepth: 'comprehensive',
});
```

---

## 🔗 Integration Workflows

### Workflow 1: New Project Setup

1. Analyze project requirements
2. Generate research questions
3. Perform research
4. Create ADRs with research backing
5. Review and refine

### Workflow 2: Existing Project Enhancement

1. Review existing ADRs
2. Identify research gaps
3. Perform targeted research
4. Update ADRs with findings
5. Track improvements

### Workflow 3: Continuous Learning

1. Monitor industry trends
2. Perform periodic research
3. Update decision records
4. Maintain knowledge base
5. Share insights with team

---

## 📊 Best Practices

### 1. Balance Research Depth

- **Light**: Quick validation of decisions (5-10 min)
- **Standard**: Comprehensive analysis (20-30 min)
- **Deep**: Thorough investigation (1-2 hours)

### 2. Cite Sources Properly

Always include source attribution in ADRs:

```markdown
## Context

Based on research from [Source Name](URL), we found that...

**Research References**:

- [Paper Title](link) - Key finding
- [Blog Post](link) - Implementation details
```

### 3. Keep Research Current

Update research findings regularly:

```bash
# Re-run research quarterly
npm run research:refresh -- --older-than 90d
```

### 4. Organize Research Findings

Structure your research directory:

```
docs/research/
├── architecture/
│   ├── microservices.md
│   └── serverless.md
├── security/
│   ├── authentication.md
│   └── encryption.md
└── performance/
    ├── caching.md
    └── optimization.md
```

---

## 🛠️ Troubleshooting

### Research Not Generating

**Issue**: `perform_research` tool returns empty results

**Solutions**:

1. Check Firecrawl API key configuration
2. Verify internet connectivity
3. Try different search topics
4. Use `depth: 'standard'` instead of 'quick'

### Integration Failing

**Issue**: Research integration tool fails to update ADRs

**Solutions**:

1. Verify ADR file format
2. Check file permissions
3. Ensure valid markdown structure
4. Review error logs in `.documcp/logs/`

### Slow Research Performance

**Issue**: Research takes too long to complete

**Solutions**:

1. Use `depth: 'quick'` for faster results
2. Limit number of research questions
3. Cache research results locally
4. Consider parallel processing

---

## 📚 Related Documentation

- **[Perform Research Tool](../reference/generation-tools.md#perform-research)** - Tool reference
- **[Interactive ADR Planning](./interactive-adr-planning.md)** - ADR workflows
- **[Firecrawl Setup](./firecrawl-setup.md)** - API configuration
- **[Research Architecture](../explanation/research-architecture.md)** - System design

---

## 🎯 Examples

### Example 1: Architecture Research

```typescript
// Generate architecture research
const archResearch = await mcp.callTool('perform_research', {
  topic: 'event-driven architecture',
  depth: 'comprehensive',
  outputPath: './docs/research/architecture/event-driven.md',
});

// Apply to ADR
await mcp.callTool('research_integration_tool', {
  adrPath: './docs/adrs/005-event-architecture.md',
  researchSource: archResearch.outputPath,
  sections: ['context', 'decision', 'consequences'],
});
```

### Example 2: Security Research

```typescript
// Research security patterns
const secResearch = await mcp.callTool('research_question_tool', {
  projectPath: './',
  domain: 'security',
  focusAreas: ['authentication', 'authorization', 'encryption'],
});

// Generate security ADRs
await mcp.callTool('generate_adrs_from_prd', {
  prdPath: './docs/security-requirements.md',
  includeResearch: true,
  researchResults: secResearch,
});
```

---

## 💬 Need Help?

- **Questions?** → [Open an Issue](https://github.com/tosin2013/mcp-adr-analysis-server/issues)
- **Documentation** → [Full API Reference](../reference/api-reference.md)
- **Troubleshooting** → [Troubleshooting Guide](./troubleshooting.md)

---

_Last Updated: 2025-10-12_
