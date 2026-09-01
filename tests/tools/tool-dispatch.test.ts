import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockAggregatorTools: Record<string, ReturnType<typeof vi.fn>> = {
  syncToAggregator: vi.fn().mockResolvedValue({ content: [{ type: 'text', text: 'ok' }] }),
  getAdrContext: vi.fn().mockResolvedValue({ content: [{ type: 'text', text: 'ok' }] }),
  getStalenessReport: vi.fn().mockResolvedValue({ content: [{ type: 'text', text: 'ok' }] }),
  getAdrTemplates: vi.fn().mockResolvedValue({ content: [{ type: 'text', text: 'ok' }] }),
  getAdrDiagrams: vi.fn().mockResolvedValue({ content: [{ type: 'text', text: 'ok' }] }),
  validateAdrCompliance: vi.fn().mockResolvedValue({ content: [{ type: 'text', text: 'ok' }] }),
  getKnowledgeGraph: vi.fn().mockResolvedValue({ content: [{ type: 'text', text: 'ok' }] }),
  updateAdrImplementationStatus: vi
    .fn()
    .mockResolvedValue({ content: [{ type: 'text', text: 'ok' }] }),
  getAdrPriorities: vi.fn().mockResolvedValue({ content: [{ type: 'text', text: 'ok' }] }),
};

const mockGapsTools: Record<string, ReturnType<typeof vi.fn>> = {
  analyzeGaps: vi.fn().mockResolvedValue({ content: [{ type: 'text', text: 'ok' }] }),
  getGaps: vi.fn().mockResolvedValue({ content: [{ type: 'text', text: 'ok' }] }),
};

vi.mock('../../src/tools/adr-aggregator-tools.js', () => mockAggregatorTools);
vi.mock('../../src/tools/analyze-gaps-tool.js', () => mockGapsTools);

import { dispatchTool, type ToolDispatchHost } from '../../src/tools/tool-dispatch.js';

const OK = { content: [{ type: 'text' as const, text: 'ok' }] };

function createMockHost(): ToolDispatchHost {
  const cache: Record<string, ReturnType<typeof vi.fn>> = {};
  return new Proxy(cache, {
    get(target, prop) {
      if (typeof prop === 'string') {
        if (!target[prop]) {
          target[prop] = vi.fn().mockResolvedValue(OK);
        }
        return target[prop];
      }
      return undefined;
    },
  });
}

describe('dispatchTool', () => {
  let host: ToolDispatchHost;
  const ctx = { projectPath: '/test' } as never;

  beforeEach(() => {
    vi.clearAllMocks();
    host = createMockHost();
  });

  const hostDispatchedTools: Array<[string, string]> = [
    ['analyze_project_ecosystem', 'analyzeProjectEcosystem'],
    ['get_architectural_context', 'getArchitecturalContext'],
    ['generate_adrs_from_prd', 'generateAdrsFromPrd'],
    ['compare_adr_progress', 'compareAdrProgress'],
    ['analyze_content_security', 'analyzeContentSecurity'],
    ['generate_content_masking', 'generateContentMasking'],
    ['configure_custom_patterns', 'configureCustomPatterns'],
    ['apply_basic_content_masking', 'applyBasicContentMasking'],
    ['validate_content_masking', 'validateContentMasking'],
    ['manage_cache', 'manageCache'],
    ['configure_output_masking', 'configureOutputMasking'],
    ['suggest_adrs', 'suggestAdrs'],
    ['generate_adr_from_decision', 'generateAdrFromDecision'],
    ['generate_adr_bootstrap', 'generateAdrBootstrap'],
    ['bootstrap_validation_loop', 'bootstrapValidationLoop'],
    ['discover_existing_adrs', 'discoverExistingAdrs'],
    ['analyze_adr_timeline', 'analyzeAdrTimeline'],
    ['review_existing_adrs', 'reviewExistingAdrs'],
    ['validate_adr', 'validateAdr'],
    ['validate_all_adrs', 'validateAllAdrs'],
    ['incorporate_research', 'incorporateResearch'],
    ['create_research_template', 'createResearchTemplate'],
    ['request_action_confirmation', 'requestActionConfirmation'],
    ['generate_rules', 'generateRules'],
    ['validate_rules', 'validateRules'],
    ['create_rule_set', 'createRuleSet'],
    ['analyze_environment', 'analyzeEnvironment'],
    ['generate_research_questions', 'generateResearchQuestions'],
    ['perform_research', 'performResearch'],
    ['search_codebase', 'searchCodebase'],
    ['analyze_deployment_progress', 'analyzeDeploymentProgress'],
    ['check_ai_execution_status', 'checkAIExecutionStatus'],
    ['get_workflow_guidance', 'getWorkflowGuidance'],
    ['get_development_guidance', 'getDevelopmentGuidance'],
    ['list_roots', 'listRoots'],
    ['read_directory', 'readDirectory'],
    ['write_file', 'writeFile'],
    ['list_directory', 'listDirectory'],
    ['generate_deployment_guidance', 'generateDeploymentGuidance'],
    ['smart_git_push', 'smartGitPush'],
    ['deployment_readiness', 'deploymentReadiness'],
    ['release_tracking', 'releaseTracking'],
    ['generate_adr_todo', 'generateAdrTodo'],
    ['troubleshoot_guided_workflow', 'troubleshootGuidedWorkflow'],
    ['smart_score', 'smartScore'],
    ['mcp_planning', 'mcpPlanning'],
    ['memory_loading', 'memoryLoading'],
    ['expand_analysis_section', 'expandAnalysisSection'],
    ['interactive_adr_planning', 'interactiveAdrPlanning'],
    ['tool_chain_orchestrator', 'toolChainOrchestrator'],
    ['expand_memory', 'expandMemory'],
    ['query_conversation_history', 'queryConversationHistory'],
    ['get_conversation_snapshot', 'getConversationSnapshot'],
    ['get_memory_stats', 'getMemoryStats'],
    ['update_knowledge', 'updateKnowledge'],
    ['get_server_context', 'getServerContext'],
    ['get_current_datetime', 'getCurrentDatetime'],
    ['set_project_path', 'setProjectPath'],
    ['load_prompt', 'loadPrompt'],
  ];

  it.each(hostDispatchedTools)('dispatches %s to host.%s', async (toolName, methodName) => {
    const result = await dispatchTool(host, toolName, {}, ctx);
    expect(result).toEqual(OK);
    expect(host[methodName]).toHaveBeenCalledTimes(1);
  });

  it('dispatches read_file and maps path to filePath', async () => {
    const result = await dispatchTool(host, 'read_file', { path: '/foo.ts' }, ctx);
    expect(result).toEqual(OK);
    expect(host.readFile).toHaveBeenCalledWith({ filePath: '/foo.ts' });
  });

  it('dispatches read_file with filePath directly', async () => {
    await dispatchTool(host, 'read_file', { filePath: '/bar.ts' }, ctx);
    expect(host.readFile).toHaveBeenCalledWith({ filePath: '/bar.ts' });
  });

  it('dispatches search_tools inline without host', async () => {
    const result = await dispatchTool(host, 'search_tools', { query: 'adr', limit: 2 }, ctx);
    expect(result.content).toHaveLength(1);
    const parsed = JSON.parse(result.content[0].text as string);
    expect(parsed.success).toBe(true);
  });

  const aggregatorTools: Array<[string, string]> = [
    ['sync_to_aggregator', 'syncToAggregator'],
    ['get_adr_context', 'getAdrContext'],
    ['get_staleness_report', 'getStalenessReport'],
    ['get_adr_templates', 'getAdrTemplates'],
    ['get_adr_diagrams', 'getAdrDiagrams'],
    ['validate_adr_compliance', 'validateAdrCompliance'],
    ['get_knowledge_graph', 'getKnowledgeGraph'],
    ['update_implementation_status', 'updateAdrImplementationStatus'],
    ['get_adr_priorities', 'getAdrPriorities'],
  ];

  it.each(aggregatorTools)('dispatches %s via dynamic import', async (toolName, fnName) => {
    const result = await dispatchTool(host, toolName, {}, ctx);
    expect(result).toEqual(OK);
    expect(mockAggregatorTools[fnName]).toHaveBeenCalledTimes(1);
  });

  const gapsTools: Array<[string, string]> = [
    ['analyze_gaps', 'analyzeGaps'],
    ['get_gaps', 'getGaps'],
  ];

  it.each(gapsTools)('dispatches %s via dynamic import', async (toolName, fnName) => {
    const result = await dispatchTool(host, toolName, {}, ctx);
    expect(result).toEqual(OK);
    expect(mockGapsTools[fnName]).toHaveBeenCalledTimes(1);
  });

  it('throws McpAdrError for unknown tool', async () => {
    await expect(dispatchTool(host, 'no_such_tool', {}, ctx)).rejects.toThrow('Unknown tool');
  });
});
