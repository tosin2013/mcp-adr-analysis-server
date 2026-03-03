/**
 * Canonical mapping of ADR Aggregator API endpoints to MCP tool names and handlers.
 *
 * Supported endpoints and tools are intended to match https://adraggregator.com/mcp-guide.
 * When the guide changes, update this mapping and the corresponding client/tool code to match.
 *
 * @see https://adraggregator.com/mcp-guide
 */

export interface AggregatorEndpointEntry {
  /** HTTP method used for this endpoint */
  method: 'GET' | 'POST';
  /** API path relative to base URL (e.g. /functions/v1/mcp-sync-adr) */
  apiPath: string;
  /** MCP tool name as registered in index.ts */
  mcpToolName: string;
  /** Client method name on AdrAggregatorClient */
  clientMethod: string;
  /** Exported handler function name in the tool module */
  handlerExport: string;
  /** Module that exports the handler (relative to src/tools/) */
  toolModule: string;
  /** Authentication type used for this endpoint */
  authType: 'x-api-key' | 'bearer';
  /** Minimum tier required */
  tier: 'free' | 'pro' | 'team';
}

/**
 * Complete mapping of all ADR Aggregator endpoints.
 * This is the single source of truth for endpoint-to-tool mapping.
 */
export const AGGREGATOR_ENDPOINT_MAP: readonly AggregatorEndpointEntry[] = [
  {
    method: 'POST',
    apiPath: '/functions/v1/mcp-sync-adr',
    mcpToolName: 'sync_to_aggregator',
    clientMethod: 'syncAdrs',
    handlerExport: 'syncToAggregator',
    toolModule: 'adr-aggregator-tools',
    authType: 'x-api-key',
    tier: 'free',
  },
  {
    method: 'GET',
    apiPath: '/functions/v1/mcp-get-context',
    mcpToolName: 'get_adr_context',
    clientMethod: 'getContext',
    handlerExport: 'getAdrContext',
    toolModule: 'adr-aggregator-tools',
    authType: 'x-api-key',
    tier: 'free',
  },
  {
    method: 'GET',
    apiPath: '/functions/v1/mcp-staleness-report',
    mcpToolName: 'get_staleness_report',
    clientMethod: 'getStalenessReport',
    handlerExport: 'getStalenessReport',
    toolModule: 'adr-aggregator-tools',
    authType: 'x-api-key',
    tier: 'free',
  },
  {
    method: 'GET',
    apiPath: '/functions/v1/mcp-get-templates',
    mcpToolName: 'get_adr_templates',
    clientMethod: 'getTemplates',
    handlerExport: 'getAdrTemplates',
    toolModule: 'adr-aggregator-tools',
    authType: 'x-api-key',
    tier: 'free',
  },
  {
    method: 'GET',
    apiPath: '/functions/v1/mcp-get-diagrams',
    mcpToolName: 'get_adr_diagrams',
    clientMethod: 'getDiagrams',
    handlerExport: 'getAdrDiagrams',
    toolModule: 'adr-aggregator-tools',
    authType: 'x-api-key',
    tier: 'pro',
  },
  {
    method: 'POST',
    apiPath: '/functions/v1/mcp-validate-compliance',
    mcpToolName: 'validate_adr_compliance',
    clientMethod: 'validateCompliance',
    handlerExport: 'validateAdrCompliance',
    toolModule: 'adr-aggregator-tools',
    authType: 'x-api-key',
    tier: 'pro',
  },
  {
    method: 'GET',
    apiPath: '/functions/v1/mcp-get-knowledge-graph',
    mcpToolName: 'get_knowledge_graph',
    clientMethod: 'getKnowledgeGraph',
    handlerExport: 'getKnowledgeGraph',
    toolModule: 'adr-aggregator-tools',
    authType: 'x-api-key',
    tier: 'team',
  },
  {
    method: 'POST',
    apiPath: '/functions/v1/mcp-report-code-gaps',
    mcpToolName: 'analyze_gaps',
    clientMethod: 'reportCodeGaps',
    handlerExport: 'analyzeGaps',
    toolModule: 'analyze-gaps-tool',
    authType: 'bearer',
    tier: 'free',
  },
  {
    method: 'GET',
    apiPath: '/functions/v1/mcp-get-gaps',
    mcpToolName: 'get_gaps',
    clientMethod: 'getCodeGaps',
    handlerExport: 'getGaps',
    toolModule: 'analyze-gaps-tool',
    authType: 'bearer',
    tier: 'free',
  },
  {
    method: 'POST',
    apiPath: '/functions/v1/mcp-update-implementation-status',
    mcpToolName: 'update_implementation_status',
    clientMethod: 'updateImplementationStatus',
    handlerExport: 'updateAdrImplementationStatus',
    toolModule: 'adr-aggregator-tools',
    authType: 'x-api-key',
    tier: 'pro',
  },
  {
    method: 'GET',
    apiPath: '/functions/v1/mcp-get-priorities',
    mcpToolName: 'get_adr_priorities',
    clientMethod: 'getPriorities',
    handlerExport: 'getAdrPriorities',
    toolModule: 'adr-aggregator-tools',
    authType: 'x-api-key',
    tier: 'free',
  },
] as const;

/** Default Supabase base URL for ADR Aggregator */
export const AGGREGATOR_DEFAULT_BASE_URL = 'https://jvgdaquuggzbkenxnkja.supabase.co';

/** All MCP tool names for aggregator endpoints */
export const AGGREGATOR_TOOL_NAMES = AGGREGATOR_ENDPOINT_MAP.map(e => e.mcpToolName);
