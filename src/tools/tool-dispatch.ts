/**
 * CallTool dispatch over the canonical tool list (#1416).
 */
import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import { McpAdrError } from '../types/index.js';
import { executeSearchTools, type SearchToolsArgs } from './tool-dispatcher.js';
import type { ToolContext } from '../types/tool-context.js';
import type {
  GetWorkflowGuidanceArgs,
  GetArchitecturalContextArgs,
  GetDevelopmentGuidanceArgs,
  GenerateAdrFromDecisionArgs,
  ValidateRulesArgs,
  CreateRuleSetArgs,
  ToolChainOrchestratorArgs,
  ReadFileArgs,
  WriteFileArgs,
  AnalyzeProjectEcosystemArgs,
  AnalyzeContentSecurityArgs,
  GenerateContentMaskingArgs,
  ConfigureCustomPatternsArgs,
  ApplyBasicContentMaskingArgs,
  ValidateContentMaskingArgs,
} from '../types/tool-arguments.js';

/** Server instance; methods are invoked from the extracted switch. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type ToolDispatchHost = any;

export async function dispatchTool(
  host: ToolDispatchHost,
  name: string,
  safeArgs: Record<string, unknown>,
  context: ToolContext
): Promise<CallToolResult> {
  let response: CallToolResult;
  switch (name) {
    case 'analyze_project_ecosystem':
      response = await host.analyzeProjectEcosystem(
        safeArgs as unknown as AnalyzeProjectEcosystemArgs,
        context
      );
      break;
    case 'get_architectural_context':
      response = await host.getArchitecturalContext(
        safeArgs as unknown as GetArchitecturalContextArgs
      );
      break;
    case 'generate_adrs_from_prd':
      response = await host.generateAdrsFromPrd(safeArgs, context);
      break;
    case 'compare_adr_progress':
      response = await host.compareAdrProgress(safeArgs);
      break;
    case 'analyze_content_security':
      response = await host.analyzeContentSecurity(
        safeArgs as unknown as AnalyzeContentSecurityArgs
      );
      break;
    case 'generate_content_masking':
      response = await host.generateContentMasking(
        safeArgs as unknown as GenerateContentMaskingArgs
      );
      break;
    case 'configure_custom_patterns':
      response = await host.configureCustomPatterns(
        safeArgs as unknown as ConfigureCustomPatternsArgs
      );
      break;
    case 'apply_basic_content_masking':
      response = await host.applyBasicContentMasking(
        safeArgs as unknown as ApplyBasicContentMaskingArgs
      );
      break;
    case 'validate_content_masking':
      response = await host.validateContentMasking(
        safeArgs as unknown as ValidateContentMaskingArgs
      );
      break;
    case 'manage_cache':
      response = await host.manageCache(safeArgs);
      break;
    case 'configure_output_masking':
      response = await host.configureOutputMasking(safeArgs);
      break;
    case 'suggest_adrs':
      response = await host.suggestAdrs(safeArgs);
      break;
    case 'generate_adr_from_decision':
      response = await host.generateAdrFromDecision(
        safeArgs as unknown as GenerateAdrFromDecisionArgs
      );
      break;
    case 'generate_adr_bootstrap':
      response = await host.generateAdrBootstrap(safeArgs);
      break;
    case 'bootstrap_validation_loop':
      response = await host.bootstrapValidationLoop(safeArgs);
      break;
    case 'discover_existing_adrs':
      response = await host.discoverExistingAdrs(safeArgs, context);
      break;
    case 'analyze_adr_timeline':
      response = await host.analyzeAdrTimeline(safeArgs);
      break;
    case 'review_existing_adrs':
      response = await host.reviewExistingAdrs(safeArgs);
      break;
    case 'validate_adr':
      response = await host.validateAdr(safeArgs);
      break;
    case 'validate_all_adrs':
      response = await host.validateAllAdrs(safeArgs);
      break;
    case 'incorporate_research':
      response = await host.incorporateResearch(safeArgs);
      break;
    case 'create_research_template':
      response = await host.createResearchTemplate(safeArgs);
      break;
    case 'request_action_confirmation':
      response = await host.requestActionConfirmation(safeArgs);
      break;
    case 'generate_rules':
      response = await host.generateRules(safeArgs);
      break;
    case 'validate_rules':
      response = await host.validateRules(safeArgs as unknown as ValidateRulesArgs);
      break;
    case 'create_rule_set':
      response = await host.createRuleSet(safeArgs as unknown as CreateRuleSetArgs);
      break;
    case 'analyze_environment':
      response = await host.analyzeEnvironment(safeArgs);
      break;
    case 'generate_research_questions':
      response = await host.generateResearchQuestions(safeArgs);
      break;
    case 'perform_research':
      response = await host.performResearch(safeArgs, context);
      break;
    case 'search_codebase':
      response = await host.searchCodebase(safeArgs);
      break;
    case 'analyze_deployment_progress':
      response = await host.analyzeDeploymentProgress(safeArgs);
      break;
    case 'check_ai_execution_status':
      response = await host.checkAIExecutionStatus(safeArgs);
      break;
    case 'get_workflow_guidance':
      response = await host.getWorkflowGuidance(safeArgs as unknown as GetWorkflowGuidanceArgs);
      break;
    case 'get_development_guidance':
      response = await host.getDevelopmentGuidance(
        safeArgs as unknown as GetDevelopmentGuidanceArgs
      );
      break;
    case 'list_roots':
      response = await host.listRoots();
      break;
    case 'read_directory':
      response = await host.readDirectory(safeArgs);
      break;
    case 'read_file': {
      // Map 'path' parameter to 'filePath' for compatibility
      const readFileArgs = safeArgs as { path?: string; filePath?: string };
      response = await host.readFile({
        filePath: readFileArgs.filePath || readFileArgs.path || '',
      } as ReadFileArgs);
      break;
    }
    case 'write_file':
      response = await host.writeFile(safeArgs as unknown as WriteFileArgs);
      break;
    case 'list_directory':
      response = await host.listDirectory(safeArgs);
      break;
    case 'generate_deployment_guidance':
      response = await host.generateDeploymentGuidance(safeArgs);
      break;
    case 'smart_git_push':
      response = await host.smartGitPush(safeArgs);
      break;
    case 'deployment_readiness':
      response = await host.deploymentReadiness(safeArgs);
      break;
    case 'release_tracking':
      response = await host.releaseTracking(safeArgs);
      break;

    case 'generate_adr_todo':
      response = await host.generateAdrTodo(safeArgs);
      break;
    case 'troubleshoot_guided_workflow':
      response = await host.troubleshootGuidedWorkflow(safeArgs);
      break;
    case 'smart_score':
      response = await host.smartScore(safeArgs);
      break;
    case 'mcp_planning':
      response = await host.mcpPlanning(safeArgs);
      break;
    case 'memory_loading':
      response = await host.memoryLoading(safeArgs);
      break;
    case 'expand_analysis_section':
      response = await host.expandAnalysisSection(safeArgs);
      break;
    case 'interactive_adr_planning':
      response = await host.interactiveAdrPlanning(safeArgs);
      break;
    case 'tool_chain_orchestrator':
      response = await host.toolChainOrchestrator(safeArgs as unknown as ToolChainOrchestratorArgs);
      break;
    case 'expand_memory':
      response = await host.expandMemory(safeArgs);
      break;
    case 'query_conversation_history':
      response = await host.queryConversationHistory(safeArgs);
      break;
    case 'get_conversation_snapshot':
      response = await host.getConversationSnapshot(safeArgs);
      break;
    case 'get_memory_stats':
      response = await host.getMemoryStats();
      break;
    case 'update_knowledge':
      response = await host.updateKnowledge(safeArgs);
      break;
    case 'get_server_context':
      response = await host.getServerContext(safeArgs);
      break;
    case 'get_current_datetime':
      response = await host.getCurrentDatetime(safeArgs);
      break;
    case 'search_tools':
      response = {
        content: [
          {
            type: 'text',
            text: JSON.stringify(
              executeSearchTools(safeArgs as unknown as SearchToolsArgs),
              null,
              2
            ),
          },
        ],
      };
      break;
    case 'set_project_path':
      response = await host.setProjectPath(
        safeArgs as unknown as {
          path: string;
          validatePath?: boolean;
        }
      );
      break;
    case 'load_prompt':
      response = await host.loadPrompt(
        safeArgs as unknown as {
          promptName: string;
          section?: string;
          estimateOnly?: boolean;
        }
      );
      break;
    // ADR Aggregator Integration Tools
    case 'sync_to_aggregator': {
      const { syncToAggregator } = await import('./adr-aggregator-tools.js');
      response = { ...(await syncToAggregator(safeArgs, context)) };
      break;
    }
    case 'get_adr_context': {
      const { getAdrContext } = await import('./adr-aggregator-tools.js');
      response = { ...(await getAdrContext(safeArgs, context)) };
      break;
    }
    case 'get_staleness_report': {
      const { getStalenessReport } = await import('./adr-aggregator-tools.js');
      response = { ...(await getStalenessReport(safeArgs, context)) };
      break;
    }
    case 'get_adr_templates': {
      const { getAdrTemplates } = await import('./adr-aggregator-tools.js');
      response = { ...(await getAdrTemplates(safeArgs, context)) };
      break;
    }
    case 'get_adr_diagrams': {
      const { getAdrDiagrams } = await import('./adr-aggregator-tools.js');
      response = { ...(await getAdrDiagrams(safeArgs, context)) };
      break;
    }
    case 'validate_adr_compliance': {
      const { validateAdrCompliance } = await import('./adr-aggregator-tools.js');
      response = { ...(await validateAdrCompliance(safeArgs, context)) };
      break;
    }
    case 'get_knowledge_graph': {
      const { getKnowledgeGraph } = await import('./adr-aggregator-tools.js');
      response = { ...(await getKnowledgeGraph(safeArgs, context)) };
      break;
    }
    case 'update_implementation_status': {
      const { updateAdrImplementationStatus } = await import('./adr-aggregator-tools.js');
      response = {
        ...(await updateAdrImplementationStatus(
          safeArgs as unknown as Parameters<typeof updateAdrImplementationStatus>[0],
          context
        )),
      };
      break;
    }
    case 'get_adr_priorities': {
      const { getAdrPriorities } = await import('./adr-aggregator-tools.js');
      response = { ...(await getAdrPriorities(safeArgs, context)) };
      break;
    }
    case 'analyze_gaps': {
      const { analyzeGaps } = await import('./analyze-gaps-tool.js');
      response = { ...(await analyzeGaps(safeArgs, context)) };
      break;
    }
    case 'get_gaps': {
      const { getGaps } = await import('./analyze-gaps-tool.js');
      response = { ...(await getGaps(safeArgs, context)) };
      break;
    }
    default:
      throw new McpAdrError(`Unknown tool: ${name}`, 'UNKNOWN_TOOL');
  }

  return response;
}
