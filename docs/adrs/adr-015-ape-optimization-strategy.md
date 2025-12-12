# ADR-015: APE (Automatic Prompt Engineering) Optimization Strategy

## Status

Accepted

## Date

2025-12-12

## Context

The Automatic Prompt Engineering (APE) module (`src/utils/automatic-prompt-engineering.ts`) is a 926-line utility that generates AI delegation prompts for automatic prompt optimization. Analysis identified several optimization opportunities aligned with Anthropic's MCP best practices.

### Current State Issues

1. **Token Overhead**: Each APE call generates ~2,643 tokens with 40-60% redundancy
2. **Hardcoded Descriptions**: 22 description strings across 4 inline maps regenerated on every call
3. **No Template Reuse**: Prompts regenerated from scratch for each request (0% reuse)
4. **Memory Footprint**: ~1.2KB of description strings loaded even when not used

### Research Findings

Based on analysis of:

- [Anthropic MCP Code Execution Article](https://www.anthropic.com/engineering/code-execution-with-mcp)
- [APE Research by Zhou et al. (2022)](https://www.promptingguide.ai/techniques/ape)
- [MCP Best Practices](https://oshea00.github.io/posts/mcp-practices/)

Key principles identified:

1. **Progressive Discovery**: Load tool definitions on-demand, not upfront
2. **Code-Based Interfaces**: Use functions instead of verbose prompt templates
3. **Filter at Execution**: Process data in execution environment before passing to model
4. **Template Caching**: Reuse static portions of prompts across calls

## Decision

Implement a phased APE optimization approach:

### Phase 1: Extract Description Constants (Implemented)

Created `src/config/ape-descriptions.ts` containing:

- `STRATEGY_DESCRIPTIONS`: Generation strategy descriptions
- `CRITERION_DESCRIPTIONS`: Evaluation criterion descriptions
- `SELECTION_STRATEGY_DESCRIPTIONS`: Selection strategy descriptions
- `TOOL_OPTIMIZATION_PRIORITIES`: Tool-specific optimization priorities
- Helper functions with fallbacks for safe access
- Template caching utilities for future optimization

Updated `src/utils/automatic-prompt-engineering.ts` to:

- Import descriptions from centralized config
- Remove 4 inline description maps (~90 lines removed)
- Use cached helper functions for description access

### Phase 2: Template Caching (Infrastructure Ready)

Added template caching infrastructure:

- `getCachedTemplateSection()`: Cache static template portions
- `clearTemplateCache()`: Clear cache for testing/updates
- `getTemplateCacheStats()`: Monitor cache effectiveness

### Future Phases (Not Yet Implemented)

**Phase 3: Separate Configuration Delivery**

- Send config as JSON metadata separate from prompt
- Enable template reuse across configurations

**Phase 4: Progressive Tool Discovery**

- Add context-aware tool filtering to ListToolsRequest
- Implement `search_tools` with detail levels

## Consequences

### Positive

1. **Memory Reduction**: ~1.2KB savings per module load from extracted constants
2. **Code Reduction**: ~90 lines removed from main APE module
3. **Maintainability**: Centralized descriptions easier to update/translate
4. **Caching Ready**: Infrastructure in place for 30-40% token reduction
5. **MCP Alignment**: Better aligned with Anthropic's best practices

### Negative

1. **Additional File**: New `ape-descriptions.ts` file to maintain
2. **Import Overhead**: Slight increase in import complexity
3. **Migration Risk**: Changes to established APE module

### Metrics

| Metric                  | Before | After              | Improvement    |
| ----------------------- | ------ | ------------------ | -------------- |
| APE Module Lines        | 926    | ~836               | -10%           |
| Inline Description Maps | 4      | 0                  | -100%          |
| Hardcoded Strings       | 22     | 0 (in main module) | Centralized    |
| Template Reuse          | 0%     | Ready for 30-40%   | Infrastructure |

## Implementation

### Files Created

- `src/config/ape-descriptions.ts` - Centralized APE descriptions and caching

### Files Modified

- `src/utils/automatic-prompt-engineering.ts` - Import from config, remove inline maps

### Testing

- Existing APE tests (`tests/ape.test.ts`) verify functionality preserved
- No changes to APE public API

## References

- [Anthropic MCP Introduction](https://www.anthropic.com/news/model-context-protocol)
- [Anthropic Code Execution with MCP](https://www.anthropic.com/engineering/code-execution-with-mcp)
- [Automatic Prompt Engineer (APE) Guide](https://www.promptingguide.ai/techniques/ape)
- [APE Research Summary - DeepLearning.AI](https://www.deeplearning.ai/the-batch/research-summary-automatic-prompt-engineer-ape/)
- [MCP Best Practices - Mike's Blog](https://oshea00.github.io/posts/mcp-practices/)

## Related ADRs

- ADR-002: AI Integration and Advanced Prompting Strategy
- ADR-014: CE-MCP Architecture
