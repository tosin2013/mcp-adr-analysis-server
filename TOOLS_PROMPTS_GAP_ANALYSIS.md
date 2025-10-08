# Tools & Prompts Gap Analysis Report

**Date**: 2025-10-07
**Analysis Type**: Comprehensive audit of tools, prompts, and their integration
**Status**: 🔴 **CRITICAL GAPS FOUND**

---

## Executive Summary

After comprehensive audit of 25 tools and 8 prompt modules, significant gaps have been identified:

### **Key Findings:**
1. ✅ **7 prompt modules** properly integrated with tools
2. ❌ **1 prompt module** (`analysis-prompts`) is **ORPHANED** - no tools use it
3. ⚠️ **10+ newer tools** have no prompt support (by design or oversight)
4. ⚠️ Several tools exist in `index.ts` but not in `src/tools/` directory

---

## Complete Tool Inventory

### **Tools in `src/tools/` Directory** (25 total)

| # | Tool Name | Status | Prompt Module | Notes |
|---|-----------|--------|---------------|-------|
| 1 | `adr-bootstrap-validation-tool` | ✅ Active | None needed | Code generation utility |
| 2 | `adr-suggestion-tool` | ✅ Active | ✅ `adr-suggestion-prompts` | Properly integrated |
| 3 | `adr-validation-tool` | ✅ Active | None needed | Validation utility |
| 4 | `content-masking-tool` | ✅ Active | ✅ `security-prompts` | Properly integrated |
| 5 | `conversation-memory-tool` | ✅ **NEW** | ❌ None | Phase 3 feature |
| 6 | `deployment-analysis-tool` | ✅ Active | ✅ `deployment-analysis-prompts` | Properly integrated |
| 7 | `deployment-guidance-tool` | ✅ Active | None needed | Guidance utility |
| 8 | `deployment-readiness-tool` | ✅ Active | ✅ `deployment-analysis-prompts` | Properly integrated |
| 9 | `environment-analysis-tool` | ✅ Active | ✅ `environment-analysis-prompts` | Properly integrated |
| 10 | `expand-analysis-tool` | ✅ **NEW** | ❌ None | Phase 1 feature |
| 11 | `interactive-adr-planning-tool` | ✅ Active | ⚠️ Should use multiple | Interactive wizard |
| 12 | `llm-cloud-management-tool` | ✅ **NEW** | ❌ None | Direct ResearchOrchestrator |
| 13 | `llm-database-management-tool` | ✅ **NEW** | ❌ None | Direct ResearchOrchestrator |
| 14 | `llm-web-search-tool` | ✅ **NEW** | ❌ None | Direct ResearchOrchestrator |
| 15 | `mcp-planning-tool` | ✅ Active | None needed | Planning utility |
| 16 | `memory-loading-tool` | ✅ Active | None needed | Memory utility |
| 17 | `perform-research-tool` | ✅ **NEW** | ❌ None | Direct ResearchOrchestrator |
| 18 | `research-integration-tool` | ✅ Active | ✅ `research-integration-prompts` | Properly integrated |
| 19 | `research-question-tool` | ✅ Active | ✅ `research-question-prompts` | Properly integrated |
| 20 | `review-existing-adrs-tool` | ✅ Active | ⚠️ Could use ADR prompts | Review utility |
| 21 | `rule-generation-tool` | ✅ Active | ✅ `rule-generation-prompts` | Properly integrated |
| 22 | `smart-git-push-tool` | ✅ Active | None needed | Git utility |
| 23 | `smart-git-push-tool-v2` | ✅ Active | None needed | Git utility v2 |
| 24 | `tool-chain-orchestrator` | ✅ Active | None needed | Orchestrator |
| 25 | `troubleshoot-guided-workflow-tool` | ✅ Active | ⚠️ Could use multiple | Troubleshooting |

### **Tools in `index.ts` Only** (Additional tools not in src/tools/)

| # | Tool Name | Implementation | Notes |
|---|-----------|----------------|-------|
| 26 | `analyze_project_ecosystem` | ✅ In index.ts | ❌ **MISSING: analysis-prompts integration!** |
| 27 | `smart_score` | ✅ In index.ts | ❌ **MISSING: analysis-prompts integration!** |
| 28 | `get_architectural_context` | ✅ In index.ts | Knowledge graph query |
| 29 | `generate_adrs_from_prd` | ✅ In index.ts | PRD processor |
| 30 | `compare_adr_progress` | ✅ In index.ts | Progress tracker |
| 31 | `analyze_content_security` | ✅ In index.ts | Uses security-prompts |
| 32 | `generate_content_masking` | ✅ In index.ts | Uses security-prompts |
| 33 | `configure_custom_patterns` | ✅ In index.ts | Uses security-prompts |
| 34 | `suggest_adrs` | ✅ In index.ts | Uses adr-suggestion-prompts |
| 35 | Multiple others... | ✅ In index.ts | Various utilities |

---

## Prompt Module Inventory

### **Prompt Modules** (8 total)

| # | Module Name | Functions Count | Used By Tools | Status |
|---|-------------|-----------------|---------------|--------|
| 1 | `adr-suggestion-prompts` | 3 | ✅ `adr-suggestion-tool` | ✅ Integrated |
| 2 | `analysis-prompts` | 3 | ❌ **NONE** | 🔴 **ORPHANED** |
| 3 | `deployment-analysis-prompts` | 4 | ✅ `deployment-readiness-tool` | ✅ Integrated |
| 4 | `environment-analysis-prompts` | 4 | ✅ `environment-analysis-tool` | ✅ Integrated |
| 5 | `research-integration-prompts` | 3 | ✅ `research-integration-tool` | ✅ Integrated |
| 6 | `research-question-prompts` | 4 | ✅ `research-question-tool` | ✅ Integrated |
| 7 | `rule-generation-prompts` | 4 | ✅ `rule-generation-tool` | ✅ Integrated |
| 8 | `security-prompts` | 3 | ✅ `content-masking-tool` | ✅ Integrated |

---

## 🔴 Critical Gap #1: Orphaned `analysis-prompts` Module

### **The Problem**

The `analysis-prompts.ts` module contains 3 functions designed for project ecosystem analysis:

1. **`generateTechnologyDetectionPrompt`** - Detects technologies in project
2. **`generatePatternDetectionPrompt`** - Detects architectural patterns
3. **`generateComprehensiveAnalysisPrompt`** - Comprehensive project analysis

### **Current State**

- ❌ **NOT** used by `analyze_project_ecosystem` tool (index.ts:4033)
- ❌ **NOT** used by `smart_score` tool (index.ts:7405)
- ❌ **NOT** used by any tool in `src/tools/`
- ✅ Only exposed as MCP prompts (but shouldn't be - see PROMPT_ANALYSIS.md)

### **Impact**

- 🔴 **HIGH**: These prompt functions were designed for AI-driven analysis but are unused
- 🔴 **HIGH**: Tools `analyze_project_ecosystem` and `smart_score` lack structured AI prompting
- 🟡 **MEDIUM**: Duplication of effort - similar analysis logic might exist elsewhere

### **Root Cause**

The tools were refactored to use alternative analysis approaches:
- `analyzeProjectEcosystem` uses `analyzeProjectStructure` from `file-system.ts`
- Integration with `knowledge-generation.ts` and `reflexion.ts` instead
- Direct analysis without structured prompt generation

### **Recommendation**

**Option A: Integrate into Existing Tools** (Recommended)
```typescript
// In src/index.ts - analyzeProjectEcosystem method
import {
  generateTechnologyDetectionPrompt,
  generatePatternDetectionPrompt,
  generateComprehensiveAnalysisPrompt
} from './prompts/analysis-prompts.js';

// After Step 3: Generate base project analysis
const { generateAnalysisContext } = await import('./prompts/analysis-prompts.js');
const projectContext = generateAnalysisContext(baseProjectAnalysisPrompt);

// Generate structured prompts for AI execution
let analysisPrompts = {
  technology: generateTechnologyDetectionPrompt(projectContext, packageJsonContent),
  patterns: generatePatternDetectionPrompt(projectContext),
  comprehensive: generateComprehensiveAnalysisPrompt(projectContext, packageJsonContent)
};

// Execute prompts with AI executor
const technologyResults = await aiExecutor.execute(analysisPrompts.technology);
const patternResults = await aiExecutor.execute(analysisPrompts.patterns);
```

**Option B: Remove Unused Module**
- Delete `src/prompts/analysis-prompts.ts`
- Remove references from `index.ts`
- Document why direct analysis is preferred

**Option C: Create New Tool**
- Create `src/tools/technology-detection-tool.ts`
- Create `src/tools/pattern-detection-tool.ts`
- Expose these as separate specialized tools

**Recommended: Option A** - Integrate into `analyze_project_ecosystem` to leverage existing structured prompts.

---

## ⚠️ Gap #2: Newer Tools Without Prompt Support

### **Tools Added Recently**

| Tool | Purpose | Prompt Need | Status |
|------|---------|-------------|--------|
| `conversation-memory-tool` | Phase 3 memory expansion | ❌ None needed | ✅ Correct |
| `expand-analysis-tool` | Phase 1 tiered responses | ❌ None needed | ✅ Correct |
| `llm-cloud-management-tool` | Cloud operations | ⚠️ Could benefit | 🟡 Consider |
| `llm-database-management-tool` | Database operations | ⚠️ Could benefit | 🟡 Consider |
| `llm-web-search-tool` | Web search | ❌ None needed | ✅ Correct |
| `perform-research-tool` | Research orchestration | ❌ None needed | ✅ Correct |

### **Analysis**

**Memory & Expansion Tools:**
- ✅ Correctly have no prompt modules - they're data retrieval utilities
- ✅ Phase 3 features designed for context management

**LLM Management Tools:**
- 🟡 Use `ResearchOrchestrator` directly
- 🟡 Could benefit from structured prompt modules for:
  - Cloud best practices prompts
  - Database optimization prompts
  - Security hardening prompts

**Research Tool:**
- ✅ Correctly uses `ResearchOrchestrator` - no separate prompts needed
- ✅ Orchestrator handles prompt generation internally

### **Recommendation**

**Option 1: Create LLM Management Prompts Module** (If needed)
```
src/prompts/llm-management-prompts.ts
- generateCloudOperationPrompt()
- generateDatabaseOperationPrompt()
- generateSecurityHardeningPrompt()
```

**Option 2: Keep As-Is** (Recommended)
- These tools intentionally use `ResearchOrchestrator` for flexibility
- Adding prompt modules might reduce flexibility
- Current approach allows dynamic prompt generation

**Recommended: Option 2** - Keep current design, add documentation.

---

## ⚠️ Gap #3: Complex Tools Without Structured Prompts

### **Tools That Could Benefit from Prompt Modules**

| Tool | Current Approach | Potential Benefit | Priority |
|------|------------------|-------------------|----------|
| `interactive-adr-planning-tool` | Mixed prompts inline | Structured wizard prompts | 🟡 Low |
| `troubleshoot-guided-workflow-tool` | Ad-hoc prompts | Structured troubleshooting prompts | 🟡 Low |
| `review-existing-adrs-tool` | Direct analysis | Review criteria prompts | 🟢 Very Low |

### **Analysis**

These tools use inline or ad-hoc prompts. While functional, structured prompt modules could:
- ✅ Improve maintainability
- ✅ Enable prompt reuse
- ✅ Better testing
- ❌ Add complexity
- ❌ Might reduce flexibility

### **Recommendation**

🟢 **Low Priority** - Current inline approach is acceptable. Consider refactoring only if:
1. Prompts grow complex (>100 lines)
2. Multiple tools need same prompts
3. Testing becomes difficult

---

## 📊 Summary Statistics

### **Integration Status**

| Category | Count | Percentage |
|----------|-------|------------|
| ✅ Tools with proper prompt integration | 7 | 28% |
| ⚠️ Tools that could use prompts | 3 | 12% |
| ✅ Tools correctly without prompts | 15 | 60% |
| **Total Tools** | **25** | **100%** |

### **Prompt Module Usage**

| Status | Count | Percentage |
|--------|-------|------------|
| ✅ Used by tools | 7 | 87.5% |
| ❌ Orphaned (unused) | 1 | 12.5% |
| **Total Prompt Modules** | **8** | **100%** |

### **Gap Severity**

| Severity | Count | Issues |
|----------|-------|--------|
| 🔴 Critical | 1 | Orphaned `analysis-prompts` module |
| 🟡 Medium | 3 | LLM tools could benefit from structured prompts |
| 🟢 Low | 3 | Complex tools with inline prompts |

---

## 🎯 Action Items

### **Immediate (Critical - Do Now)**

1. ✅ **Integrate `analysis-prompts` into `analyze_project_ecosystem`**
   - Add technology detection prompt
   - Add pattern detection prompt
   - Add comprehensive analysis prompt
   - File: `src/index.ts` line 4033
   - Estimated effort: 2 hours

2. ✅ **Integrate `analysis-prompts` into `smart_score`**
   - Use technology and pattern detection
   - File: `src/index.ts` line 7405
   - Estimated effort: 1 hour

3. ✅ **Remove `analysis-prompts` from MCP prompts exposure**
   - Already documented in PROMPT_ANALYSIS.md
   - File: `src/prompts/index.ts` lines 659-881
   - Estimated effort: 15 minutes

### **Short-Term (Consider Within 1 Week)**

4. 🟡 **Document LLM tool design decisions**
   - Why they use ResearchOrchestrator directly
   - When to create prompt modules vs inline
   - File: Create `docs/architecture/llm-tools-design.md`
   - Estimated effort: 30 minutes

5. 🟡 **Evaluate LLM management prompt module need**
   - Survey actual usage patterns
   - Decide if structured prompts would help
   - Create module if beneficial
   - Estimated effort: 2-4 hours

### **Long-Term (Consider Within 1 Month)**

6. 🟢 **Review complex tools for prompt extraction**
   - `interactive-adr-planning-tool`
   - `troubleshoot-guided-workflow-tool`
   - Extract if prompts grow >100 lines
   - Estimated effort: 4-6 hours

7. 🟢 **Create prompt module guidelines**
   - When to create a prompt module
   - When to use inline prompts
   - Testing best practices
   - File: `docs/development/prompt-module-guidelines.md`
   - Estimated effort: 1 hour

---

## 🏗️ Architecture Recommendations

### **1. Prompt Module Creation Criteria**

Create a separate prompt module when:
- ✅ Multiple functions generating structured AI prompts
- ✅ Prompts are complex (>50 lines each)
- ✅ Prompts need versioning or testing
- ✅ Prompts are reused across tools

Use inline prompts when:
- ✅ Simple, one-off prompts (<20 lines)
- ✅ Highly dynamic with tool-specific context
- ✅ Rarely changed
- ✅ Tool is experimental

### **2. Tool-Prompt Integration Pattern**

```typescript
// Recommended pattern
export async function myAnalysisTool(args) {
  // 1. Collect context
  const context = await gatherContext(args);

  // 2. Generate structured prompt (from prompt module)
  const { generateMyAnalysisPrompt } = await import('../prompts/my-prompts.js');
  const prompt = generateMyAnalysisPrompt(context);

  // 3. Execute with AI
  const result = await aiExecutor.execute(prompt);

  // 4. Return formatted result
  return formatResult(result);
}
```

### **3. ResearchOrchestrator vs Prompt Modules**

| Use ResearchOrchestrator | Use Prompt Modules |
|--------------------------|---------------------|
| Multi-source research | Single-source analysis |
| Dynamic query generation | Structured templates |
| Cascading fallbacks | Deterministic prompts |
| Web search integration | Code/file analysis |
| Question-answering | Pattern detection |

---

## 📝 Conclusion

**Overall Health:** 🟡 **GOOD with 1 Critical Gap**

**Strengths:**
- ✅ 87.5% of prompt modules properly integrated
- ✅ Clear separation of concerns
- ✅ Newer tools follow good patterns (ResearchOrchestrator)
- ✅ Most tools correctly don't need prompts

**Weaknesses:**
- 🔴 1 orphaned prompt module (`analysis-prompts`)
- 🟡 Missing integration in 2 major analysis tools
- 🟡 No documentation on prompt module guidelines

**Priority:**
1. **HIGH**: Integrate `analysis-prompts` into ecosystem analysis tools
2. **MEDIUM**: Document design decisions for LLM tools
3. **LOW**: Consider structured prompts for complex interactive tools

**Estimated Total Effort:** 4-6 hours for critical items

---

**Next Steps:** Begin with Action Items #1-3 to resolve the critical orphaned module issue.
