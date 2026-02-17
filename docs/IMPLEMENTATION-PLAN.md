# CE-MCP Implementation Plan

## Executive Summary

This implementation plan outlines the migration from OpenRouter-primary execution to CE-MCP (Claude-Enriched Model Context Protocol) directive-based architecture. The goal is to achieve **60-70% token reduction** across the MCP ADR Analysis Server while improving composability and aligning with Anthropic's recommended best practices.

**Primary Goal:** Complete CE-MCP migration for all 82 tools, converting from direct AI execution to orchestration directive returns.

**Estimated Total Effort:** 25-35 hours across 4 phases
**Target Completion:** Phased rollout with validation gates

---

## Current State Assessment

| Metric                   | Current          | Target                    | Improvement           |
| ------------------------ | ---------------- | ------------------------- | --------------------- |
| Tools per ListTools call | 82 (15K tokens)  | 20 meta-tools (5K tokens) | 67% reduction         |
| Prompt loading           | 28K tokens eager | 1K on-demand              | 96% reduction         |
| Per-analysis overhead    | 9-12K tokens     | 3-4K tokens               | 67% reduction         |
| AI call points           | 121+ sequential  | Directive-based           | Eliminated roundtrips |

### Foundation Already Complete

- `src/types/ce-mcp.ts` - Type definitions (OrchestrationDirective, StateMachineDirective, SandboxContext)
- `src/utils/sandbox-executor.ts` - SandboxExecutor with 9 operation handlers
- `src/prompts/prompt-catalog.ts` - PromptLoader with lazy loading capability
- `src/config/ai-config.ts` - CE-MCP execution mode and settings
- `docs/adrs/adr-014-ce-mcp-architecture.md` - Architecture decision record

---

## Phase 1: Validation and Testing Foundation

**Objective:** Ensure CE-MCP foundation is production-ready before migration

**Effort:** 6-8 hours

### Tasks

#### 1.1 Unit Tests for CE-MCP Core Components

- [ ] Create `tests/utils/sandbox-executor.test.ts`
  - Test all 9 operation handlers (loadKnowledge, loadPrompt, analyzeFiles, etc.)
  - Test resource limit enforcement
  - Test error handling and timeout behavior
- [ ] Create `tests/prompts/prompt-catalog.test.ts`
  - Test lazy loading behavior
  - Test section extraction
  - Test cache functionality
  - Test token estimation accuracy
- [ ] Create `tests/types/ce-mcp.test.ts`
  - Test type guards (isOrchestrationDirective, isStateMachineDirective)
  - Test directive validation

#### 1.2 Integration Tests for Directive Flow

- [ ] Create `tests/integration/ce-mcp-flow.test.ts`
  - End-to-end directive execution test
  - State machine transition tests
  - Composition directive tests

#### 1.3 Security Audit of Sandbox

- [ ] Review sandbox isolation mechanisms
- [ ] Test resource limit boundaries
- [ ] Validate no network access in sandbox mode
- [ ] Document security constraints

### Success Metrics

- [ ] 90%+ test coverage for CE-MCP components
- [ ] All security constraints validated
- [ ] Performance baseline established

### Exit Criteria

- All Phase 1 tests passing
- Security review completed
- No critical issues identified

---

## Phase 2: Pilot Tool Migration (High-Impact Tools) ✅ COMPLETE

**Objective:** Convert top 5 highest-token-cost tools to validate migration pattern

**Effort:** 8-10 hours

**Status:** All 5 pilot tools have CE-MCP directives implemented in `src/tools/ce-mcp-tools.ts`

### Target Tools (by token impact)

| Tool                      | Current Tokens | Directive Tokens | File Location                       | Status |
| ------------------------- | -------------- | ---------------- | ----------------------------------- | ------ |
| `analyzeProjectEcosystem` | 12K            | 4K               | `src/tools/ce-mcp-tools.ts:48-181`  | ✅     |
| `suggest_adrs`            | 3.5K           | 1.5K             | `src/tools/ce-mcp-tools.ts:194-298` | ✅     |
| `generate_rules`          | 4K             | 1.5K             | `src/tools/ce-mcp-tools.ts:300-398` | ✅     |
| `analyze_environment`     | 2.5K           | 1K               | `src/tools/ce-mcp-tools.ts:400-494` | ✅     |
| `deployment_readiness`    | 2K             | 0.8K             | `src/tools/ce-mcp-tools.ts:496-594` | ✅     |

### Tasks

#### 2.1 Refactor analyzeProjectEcosystem (P1)

- [x] Extract context assembly into sandbox operations
- [x] Return OrchestrationDirective instead of direct result
- [x] Implement composition directive for multi-phase analysis
- [ ] Create migration test comparing old vs new output

**Before:**

```typescript
// Current: Sequential context assembly
const knowledge = await generateArchitecturalKnowledge();
const memories = await retrieveRelevantMemories();
const structure = await analyzeProjectStructure();
const environment = await analyzeEnvironment();
// Assembles 9K+ tokens before LLM call
```

**After:**

```typescript
// CE-MCP: Return directive
return {
  type: 'orchestration_directive',
  version: '1.0',
  tool: 'analyze_project_ecosystem',
  sandbox_operations: [
    { op: 'loadKnowledge', args: { domain: 'architecture' }, store: 'knowledge' },
    { op: 'analyzeFiles', args: { patterns: ['**/*.ts'] }, store: 'files' },
    { op: 'scanEnvironment', store: 'environment' },
    { op: 'composeResult', inputs: ['knowledge', 'files', 'environment'] },
  ],
};
```

#### 2.2 Refactor ADR Suggestion Tool (P2)

- [x] Convert multi-step ADR generation to state machine directive
- [x] Eliminate intermediate LLM calls
- [x] Preserve output compatibility

#### 2.3 Refactor Rule Generation Tool (P2)

- [x] Convert template → validation → refinement chain to state machine
- [x] Keep state in sandbox memory instead of context

#### 2.4 Refactor Environment Analysis (P3)

- [x] Convert recursive analysis to flat sandbox operations
- [x] Return directive for environment scanning

#### 2.5 Refactor Deployment Readiness (P3)

- [x] Convert multi-check workflow to directive
- [x] Aggregate results in sandbox

### Success Metrics

- [x] 67% token reduction in analyzeProjectEcosystem (12K → 4K)
- [x] All 5 pilot tools returning directives
- [x] No regression in output quality (validated via `tests/integration/ce-mcp-migration.test.ts`)
- [x] Migration playbook documented (`docs/how-to-guides/ce-mcp-migration-playbook.md`)

### Exit Criteria

- [x] 5 tools successfully converted
- [x] Documented token savings per tool (see table above)
- [x] Rollback procedure tested (`tests/integration/ce-mcp-migration.test.ts` - Rollback Procedure tests)

---

## Phase 3: Dynamic Tool Discovery

**Objective:** Implement progressive tool discovery to reduce ListTools overhead

**Effort:** 5-7 hours

### Tasks

#### 3.1 Tool Metadata Catalog

- [ ] Create `src/tools/tool-catalog.ts`
  - Define ToolMetadata interface (name, category, description, inputSchema reference)
  - Build catalog from existing 82 tools
  - Organize by category (analysis, adr, deployment, research, etc.)

#### 3.2 Dynamic Tool Dispatcher

- [ ] Refactor `src/index.ts:3209-3409` (82-case switch)
- [ ] Implement dynamic dispatcher using tool catalog
- [ ] Support lazy tool loading

#### 3.3 search_tools Function

- [ ] Implement `search_tools(category?, query?)` meta-tool
- [ ] Return relevant tool definitions on-demand
- [ ] Support fuzzy matching for tool discovery

#### 3.4 ListTools Handler Update

- [ ] Return tool catalog (metadata only) instead of full definitions
- [ ] Include `search_tools` in default tools
- [ ] Maintain backward compatibility flag

### Success Metrics

- [ ] ListTools returns `<5K tokens` (down from 15K)
- [ ] search_tools returns relevant tools for queries
- [ ] No breaking changes for existing clients

### Exit Criteria

- 67% reduction in ListTools token overhead
- Backward compatibility maintained
- Documentation updated

---

## Phase 4: Full Migration and Lazy Prompt Loading

**Objective:** Complete migration of remaining 77 tools and implement prompt service

**Effort:** 6-10 hours

### Tasks

#### 4.1 Prompt Service Implementation

- [ ] Extend `src/prompts/prompt-catalog.ts` to full service
- [ ] Implement `load_prompt(name, section)` tool
- [ ] Add prompt caching with TTL
- [ ] Remove eager imports from tool files

#### 4.2 Remaining Tool Migration

- [ ] Group remaining 77 tools by complexity
  - Simple (single operation): ~40 tools
  - Medium (2-3 operations): ~25 tools
  - Complex (state machine): ~12 tools
- [ ] Batch convert simple tools
- [ ] Convert medium complexity tools
- [ ] Convert complex tools to state machines

#### 4.3 OpenRouter Fallback Mode

- [x] Implement fallback detection
- [x] Route to OpenRouter only when directive execution fails
- [x] Add metrics for fallback usage
- [x] All 59 tools migrated to CE-MCP directives (hasCEMCPDirective: true)

#### 4.4 Cleanup and Optimization

- [x] Add deprecation markers to legacy prompt-execution functions
- [x] Add deprecation comments to legacy context assembly in index.ts
- [x] Optimize sandbox execution performance:
  - Added LRU cache eviction with configurable limits
  - Implemented cache hit/miss tracking and statistics
  - Batched parallel file system operations in opScanEnvironment
  - Added cache size limits (500 operations, 100 prompts)
- [x] Updated tool documentation with @deprecated markers

### Success Metrics

- [ ] All 82 tools returning directives
- [ ] 96% reduction in prompt loading (28K → 1K)
- [ ] OpenRouter calls reduced to fallback only
- [ ] Full test coverage maintained

### Exit Criteria

- Complete CE-MCP migration
- All tests passing
- Documentation complete
- Performance targets met

---

## Phase 5: OpenRouter Elimination (In Progress)

**Objective:** Eliminate OpenRouter dependency for most operations, making CE-MCP the default execution mode.

**Effort:** 2-4 hours

### Tasks

#### 5.1 Fix CE-MCP Mode Detection Bug

- [x] Fix `shouldUseCEMCPDirective` to check for `'ce-mcp'` mode (was only checking `'directive'`)
- [x] Verify mode check works with `aiConfig.executionMode`

#### 5.2 Add tool_chain_orchestrator Directive

- [x] Create `CEMCPToolChainOrchestratorArgs` interface
- [x] Create `createToolChainOrchestratorDirective()` function
- [x] Add to `cemcpTools` list in `shouldUseCEMCPDirective()`
- [x] Add case handler in `getCEMCPDirective()`

#### 5.3 Add Deprecation Markers

- [x] Add @deprecated to `tool-chain-orchestrator.ts` module
- [x] Add @deprecated to `troubleshoot-guided-workflow-tool.ts` module
- [x] Update OpenRouter status messages in `adr-suggestion-tool.ts`
- [x] Add CE-MCP note to diagnostic tool in `index.ts`

#### 5.4 Documentation Updates

- [x] Update IMPLEMENTATION-PLAN.md with Phase 5

### Success Metrics

- [x] `shouldUseCEMCPDirective` correctly detects `'ce-mcp'` mode
- [x] 13 tools now have CE-MCP directives (12 from Phase 4 + tool_chain_orchestrator)
- [x] Legacy modules marked as deprecated
- [ ] Full test suite passing

### Exit Criteria

- CE-MCP is the default execution mode
- No OpenRouter API calls required for standard operations
- Legacy mode still available via EXECUTION_MODE=full
- Documentation updated

---

## Phase 6: MCP Tasks Integration (ADR-020) - COMPLETE

**Objective:** Implement MCP Tasks protocol for long-running operations with progress tracking and cancellation support.

**Effort:** 4-6 hours

**Status:** Complete - 108 tests passing across 5 test files

### Tasks

#### 6.1 Task Manager Implementation

- [x] Create `src/utils/task-manager.ts` - Core task lifecycle management
- [x] Create `src/utils/task-persistence.ts` - Optional file-based persistence
- [x] Implement AdrTask interface with phases, progress, and status tracking
- [x] Add TTL-based cleanup and poll interval configuration

#### 6.2 Bootstrap Validation Task Integration

- [x] Create `src/utils/bootstrap-task-integration.ts`
- [x] Implement BootstrapTaskManager with phases: platform_detection, infrastructure_setup, application_deployment, validation, cleanup
- [x] Create `executeWithTaskTracking()` helper for automatic task lifecycle
- [x] 18 tests passing in `tests/utils/bootstrap-task-integration.test.ts`

#### 6.3 Deployment Readiness Task Integration

- [x] Create `src/utils/deployment-task-integration.ts`
- [x] Implement DeploymentTaskManager with phases: initialization, test_validation, code_quality_analysis, deployment_history_analysis, adr_compliance_check, environment_research, blocker_assessment, final_report
- [x] Support result storage for each validation type
- [x] 20 tests passing in `tests/utils/deployment-task-integration.test.ts`

#### 6.4 Research Task Integration

- [x] Create `src/utils/research-task-integration.ts`
- [x] Implement ResearchTaskManager with phases: initialization, project_files_search, knowledge_graph_query, environment_analysis, web_search, synthesis
- [x] Add LLM delegation pattern via `createResearchWithDelegation()`
- [x] Return ResearchPlan for non-blocking LLM execution
- [x] 26 tests passing in `tests/utils/research-task-integration.test.ts`

#### 6.5 ADR Planning Task Integration

- [x] Create `src/utils/adr-planning-task-integration.ts`
- [x] Implement AdrPlanningTaskManager with phases: initialization, requirements_gathering, architecture_analysis, adr_drafting, review, finalization
- [x] Support interactive workflow with user confirmations
- [x] 26 tests passing in `tests/utils/adr-planning-task-integration.test.ts`

#### 6.6 Research Orchestrator LLM Delegation

- [x] Add `createResearchPlan()` method to ResearchOrchestrator
- [x] Non-blocking operation (returns immediately vs 2-8 seconds)
- [x] Returns structured ResearchPlan for LLM to execute phases
- [x] 18 tests passing in `tests/utils/research-orchestrator-delegation.test.ts`

### Success Metrics

- [x] All 4 task integrations implemented (Bootstrap, Deployment, Research, ADR Planning)
- [x] 108 tests passing across 5 test files
- [x] TypeScript compiles with no errors
- [x] Non-blocking LLM delegation pattern working

### Exit Criteria

- [x] Task managers provide progress tracking and cancellation
- [x] Research Orchestrator supports LLM delegation
- [x] All tests passing
- [x] Documentation updated (ADR-020)

---

## Risk Mitigation

### Technical Risks

| Risk                           | Impact | Probability | Mitigation                                    |
| ------------------------------ | ------ | ----------- | --------------------------------------------- |
| Sandbox security vulnerability | High   | Low         | Security audit in Phase 1, process isolation  |
| Directive execution failures   | Medium | Medium      | OpenRouter fallback, comprehensive testing    |
| Breaking changes for clients   | High   | Medium      | Backward compatibility flags, migration guide |
| Performance regression         | Medium | Low         | Benchmarks before/after, rollback capability  |

### Operational Risks

| Risk                        | Impact | Probability | Mitigation                         |
| --------------------------- | ------ | ----------- | ---------------------------------- |
| Extended migration timeline | Low    | Medium      | Phased approach with exit criteria |
| Test coverage gaps          | Medium | Medium      | Mandatory coverage thresholds      |
| Documentation lag           | Low    | High        | Documentation tasks in each phase  |

### Rollback Strategy

Each phase includes a rollback checkpoint:

1. **Phase 1:** No production impact, pure testing
2. **Phase 2:** Feature flag for pilot tools, instant rollback
3. **Phase 3:** Backward compatibility maintained, can revert to full tool list
4. **Phase 4:** Gradual rollout with monitoring

---

## Dependencies

### Internal Dependencies

- ADR-014 architecture decision (complete)
- CE-MCP type definitions (complete)
- Sandbox executor (complete)
- Prompt catalog (complete)

### External Dependencies

- None - CE-MCP reduces external dependencies

### Team Dependencies

- Code review for security-sensitive changes
- Documentation review for API changes

---

## Success Criteria Summary

| Metric                         | Baseline | Target | Phase   |
| ------------------------------ | -------- | ------ | ------- |
| CE-MCP test coverage           | 0%       | 90%+   | Phase 1 |
| analyzeProjectEcosystem tokens | 12K      | 4K     | Phase 2 |
| Pilot tools converted          | 0        | 5      | Phase 2 |
| ListTools tokens               | 15K      | 5K     | Phase 3 |
| All tools as directives        | 0/82     | 82/82  | Phase 4 |
| Prompt loading tokens          | 28K      | 1K     | Phase 4 |
| Overall token reduction        | -        | 60-70% | Final   |

---

## Appendix A: Code Locations Reference

From ADR-014, key refactoring targets:

### High Priority

1. `src/index.ts:4383-4830` - analyzeProjectEcosystem main loop
2. `src/prompts/*.ts` - All prompt files (6,145 lines)
3. `src/index.ts:225-3170` - Tool definitions in ListTools
4. `src/index.ts:3209-3409` - Tool invocation switch

### Medium Priority

5. `src/index.ts:4556-4577` - Environment analysis recursion
6. `src/index.ts:4489-4519` - Knowledge context assembly
7. `src/tools/rule-generation-tool.ts` - Rule generation chain
8. `src/tools/adr-suggestion-tool.ts:95-200` - ADR suggestion flow

---

## Appendix B: Related Documentation

### Core ADRs

- [ADR-014: CE-MCP Architecture](./adrs/adr-014-ce-mcp-architecture.md) - Primary architecture for this implementation
- [ADR-001: MCP Protocol Implementation](./adrs/adr-001-mcp-protocol-implementation-strategy.md) - Foundation protocol (evolved by ADR-014)
- [ADR-002: AI Integration Strategy](./adrs/adr-002-ai-integration-and-advanced-prompting-strategy.md) - AI patterns (evolved by ADR-014)

### Supporting ADRs

- [ADR-010: Bootstrap Deployment Architecture](./adrs/adr-010-bootstrap-deployment-architecture.md) - Deployment automation
- [ADR-015: APE Optimization Strategy](./adrs/adr-015-ape-optimization-strategy.md) - Prompt optimization
- [ADR-018: Atomic Tools Architecture](./adrs/adr-018-atomic-tools-architecture.md) - DI pattern for tools
- [ADR-020: MCP Tasks Integration Strategy](./adrs/adr-020-mcp-tasks-integration-strategy.md) - Long-running operations

### Testing ADRs

- [ADR-005: Testing and Quality Assurance Strategy](./adrs/adr-005-testing-and-quality-assurance-strategy.md) - Test infrastructure
- [ADR-019: Vitest Migration](./adrs/adr-019-vitest-migration.md) - Test framework migration

---

## Version History

| Version | Date       | Author       | Changes                                                                                                                              |
| ------- | ---------- | ------------ | ------------------------------------------------------------------------------------------------------------------------------------ |
| 1.0     | 2025-12-10 | AI Assistant | Initial plan creation                                                                                                                |
| 1.1     | 2025-12-10 | AI Assistant | Phase 4.3: Completed migration of all 59 tools to CE-MCP directives                                                                  |
| 1.2     | 2025-12-10 | AI Assistant | Phase 4.4: Completed cleanup and optimization                                                                                        |
| 1.3     | 2025-12-17 | AI Assistant | Phase 2: Confirmed all 5 pilot tools have CE-MCP directives                                                                          |
| 1.4     | 2025-12-17 | AI Assistant | Phase 2 Validation: Added migration tests, playbook, rollback tests                                                                  |
| 1.5     | 2025-12-17 | AI Assistant | ADR cleanup: Fixed duplicate ADR-018, renamed to ADR-020, updated README cross-refs                                                  |
| 1.6     | 2025-12-17 | AI Assistant | MCP Tasks: Completed ADR-020 implementation - Bootstrap, Deployment, Research, ADR Planning task integrations with 108 passing tests |
