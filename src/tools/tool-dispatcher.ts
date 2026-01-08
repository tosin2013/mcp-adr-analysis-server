/**
 * Tool Dispatcher - Dynamic Tool Discovery and Routing
 *
 * This module provides dynamic tool discovery via the search_tools meta-tool
 * and enables catalog-based tool listing for token-efficient responses.
 *
 * @see ADR-014: CE-MCP Architecture (Phase 3)
 * @see docs/IMPLEMENTATION-PLAN.md
 */

import { Tool } from '@modelcontextprotocol/sdk/types.js';
import {
  TOOL_CATALOG,
  ToolCategory,
  searchTools,
  getCatalogSummary,
  getLightweightToolList,
  toMCPTool,
  getCEMCPTools,
  getHighTokenCostTools,
} from './tool-catalog.js';

/**
 * Arguments for search_tools meta-tool
 */
export interface SearchToolsArgs {
  /** Optional category filter */
  category?: ToolCategory;

  /** Optional search query */
  query?: string;

  /** Optional complexity filter */
  complexity?: 'simple' | 'moderate' | 'complex';

  /** Only return tools with CE-MCP directives */
  cemcpOnly?: boolean;

  /** Include full input schemas (increases token count) */
  includeSchema?: boolean;

  /** Maximum results to return */
  limit?: number;
}

/**
 * Result from search_tools
 */
export interface SearchToolsResult {
  success: boolean;
  tools: Array<{
    name: string;
    description: string;
    category: ToolCategory;
    complexity: string;
    hasCEMCPDirective: boolean;
    tokenCost?: { min: number; max: number };
    inputSchema?: Tool['inputSchema'];
  }>;
  summary: {
    totalFound: number;
    totalInCatalog: number;
    byCategory: Record<string, number>;
  };
  query?: string;
}

/**
 * Execute search_tools meta-tool
 *
 * This tool enables dynamic discovery of available tools without loading
 * all tool schemas upfront, significantly reducing token usage.
 */
export function executeSearchTools(args: SearchToolsArgs): SearchToolsResult {
  const {
    category,
    query,
    complexity,
    cemcpOnly = false,
    includeSchema = false,
    limit = 20,
  } = args;

  // Build search options, only including defined values
  const searchOptions: Parameters<typeof searchTools>[0] = {
    cemcpOnly,
    includeSchema,
    limit,
  };

  if (category !== undefined) {
    searchOptions.category = category;
  }
  if (query !== undefined) {
    searchOptions.query = query;
  }
  if (complexity !== undefined) {
    searchOptions.complexity = complexity;
  }

  const result = searchTools(searchOptions);

  const catalogSummary = getCatalogSummary();

  const response: SearchToolsResult = {
    success: true,
    tools: result.tools.map(tool => ({
      name: tool.name,
      description: tool.shortDescription,
      category: tool.category,
      complexity: tool.complexity,
      hasCEMCPDirective: tool.hasCEMCPDirective,
      tokenCost: tool.tokenCost,
      ...(includeSchema && tool.inputSchema ? { inputSchema: tool.inputSchema } : {}),
    })),
    summary: {
      totalFound: result.totalCount,
      totalInCatalog: catalogSummary.totalTools,
      byCategory: result.categories as Record<string, number>,
    },
  };

  if (query !== undefined) {
    response.query = query;
  }

  return response;
}

/**
 * Get the search_tools tool definition for MCP
 */
export function getSearchToolsDefinition(): Tool {
  return {
    name: 'search_tools',
    description:
      'Search and discover available tools by category, keyword, or capability. Use this to find the right tool for a task without loading all tool schemas. Returns lightweight tool metadata by default; use includeSchema:true for full schemas.',
    inputSchema: {
      type: 'object',
      properties: {
        category: {
          type: 'string',
          enum: [
            'analysis',
            'adr',
            'content-security',
            'research',
            'deployment',
            'memory',
            'file-system',
            'rules',
            'workflow',
            'utility',
          ],
          description: 'Filter tools by category',
        },
        query: {
          type: 'string',
          description: 'Search query to match tool names, descriptions, and keywords',
        },
        complexity: {
          type: 'string',
          enum: ['simple', 'moderate', 'complex'],
          description: 'Filter by tool complexity level',
        },
        cemcpOnly: {
          type: 'boolean',
          description: 'Only return tools with CE-MCP directive support (more token-efficient)',
          default: false,
        },
        includeSchema: {
          type: 'boolean',
          description: 'Include full input schemas in response (increases token count)',
          default: false,
        },
        limit: {
          type: 'number',
          description: 'Maximum number of tools to return',
          default: 20,
        },
      },
    },
  };
}

/**
 * Get lightweight tool listing for MCP ListTools
 *
 * Returns tools with minimal metadata for token-efficient listing.
 * Clients can use search_tools to get full schemas when needed.
 */
export function getToolListForMCP(options: { mode?: 'full' | 'lightweight' | 'summary' }): {
  tools: Tool[];
} {
  const { mode = 'lightweight' } = options;

  if (mode === 'summary') {
    // Return only the search_tools meta-tool
    return {
      tools: [getSearchToolsDefinition()],
    };
  }

  if (mode === 'lightweight') {
    // Return lightweight list with search_tools
    const lightList = getLightweightToolList();
    const tools: Tool[] = [
      getSearchToolsDefinition(),
      ...lightList.map(item => ({
        name: item.name,
        description: `[${item.category}] ${item.description}${item.hasCEMCPDirective ? ' (CE-MCP)' : ''}`,
        inputSchema: {
          type: 'object' as const,
          properties: {},
          description: `Use search_tools with query:"${item.name}" to get full schema`,
        },
      })),
    ];
    return { tools };
  }

  // Full mode - return all tools with schemas from catalog
  const tools: Tool[] = [getSearchToolsDefinition()];

  for (const [, metadata] of TOOL_CATALOG) {
    tools.push(toMCPTool(metadata));
  }

  return { tools };
}

/**
 * Get tool categories with counts
 */
export function getToolCategories(): Record<ToolCategory, { count: number; description: string }> {
  const summary = getCatalogSummary();

  return {
    analysis: {
      count: summary.byCategory.analysis,
      description: 'Project analysis, architecture insights, code quality',
    },
    adr: {
      count: summary.byCategory.adr,
      description: 'Architecture Decision Records management',
    },
    'content-security': {
      count: summary.byCategory['content-security'],
      description: 'Content security, masking, sensitive data protection',
    },
    research: {
      count: summary.byCategory.research,
      description: 'Research, web search, knowledge integration',
    },
    deployment: {
      count: summary.byCategory.deployment,
      description: 'Deployment readiness, CI/CD, git operations',
    },
    memory: {
      count: summary.byCategory.memory,
      description: 'Conversation memory, context management',
    },
    'file-system': {
      count: summary.byCategory['file-system'],
      description: 'File and directory operations',
    },
    rules: {
      count: summary.byCategory.rules,
      description: 'Rule generation and validation',
    },
    workflow: {
      count: summary.byCategory.workflow,
      description: 'Workflow guidance, tool orchestration',
    },
    utility: {
      count: summary.byCategory.utility,
      description: 'Utility functions, server status, datetime',
    },
    aggregator: {
      count: summary.byCategory.aggregator,
      description: 'ADR Aggregator platform integration',
    },
  };
}

/**
 * Get CE-MCP enabled tools summary
 */
export function getCEMCPSummary(): {
  enabled: string[];
  highTokenCost: string[];
  totalTokenSavings: string;
} {
  const cemcpTools = getCEMCPTools();
  const highCostTools = getHighTokenCostTools();

  return {
    enabled: cemcpTools.map(t => t.name),
    highTokenCost: highCostTools.map(t => t.name),
    totalTokenSavings:
      'CE-MCP tools reduce token usage by 60-70% by returning directives instead of executing prompts directly',
  };
}

/**
 * Check if a tool exists in the catalog
 */
export function toolExists(toolName: string): boolean {
  return TOOL_CATALOG.has(toolName);
}

/**
 * Get tool metadata by name
 */
export function getToolMetadata(toolName: string): Tool | undefined {
  const metadata = TOOL_CATALOG.get(toolName);
  if (!metadata) return undefined;
  return toMCPTool(metadata);
}
