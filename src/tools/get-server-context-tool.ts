/**
 * Get Server Context Tool
 *
 * MCP tool that generates and returns the current server context,
 * and optionally writes it to .mcp-server-context.md for @ referencing.
 */

import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import { ServerContextGenerator } from '../utils/server-context-generator.js';
import type { KnowledgeGraphManager } from '../utils/knowledge-graph-manager.js';
import type { MemoryEntityManager } from '../utils/memory-entity-manager.js';
import type { ConversationMemoryManager } from '../utils/conversation-memory-manager.js';

export interface GetServerContextArgs {
  /**
   * Whether to write the context to .mcp-server-context.md file
   * @default true
   */
  writeToFile?: boolean;

  /**
   * Custom output path for the context file
   */
  outputPath?: string;

  /**
   * Include detailed information
   * @default true
   */
  includeDetailed?: boolean;

  /**
   * Maximum number of recent items to show
   * @default 5
   */
  maxRecentItems?: number;
}

/**
 * Generate and return current server context
 */
export async function getServerContext(
  args: GetServerContextArgs,
  kgManager: KnowledgeGraphManager,
  memoryManager: MemoryEntityManager,
  conversationManager: ConversationMemoryManager
): Promise<CallToolResult> {
  const { writeToFile = true, outputPath, includeDetailed = true, maxRecentItems = 5 } = args;

  const generator = new ServerContextGenerator();

  try {
    // Generate context
    const contextContent = await generator.generateContext(
      kgManager,
      memoryManager,
      conversationManager,
      { includeDetailed, maxRecentItems }
    );

    // Optionally write to file
    if (writeToFile) {
      await generator.writeContextFile(kgManager, memoryManager, conversationManager, outputPath);
    }

    return {
      content: [
        {
          type: 'text',
          text: writeToFile
            ? `✅ Server context updated and written to \`.mcp-server-context.md\`\n\nYou can now \`@.mcp-server-context.md\` to reference this context in conversations.\n\n---\n\n${contextContent}`
            : contextContent,
        },
      ],
    };
  } catch (error) {
    return {
      content: [
        {
          type: 'text',
          text: `❌ Failed to generate server context: ${error instanceof Error ? error.message : String(error)}`,
        },
      ],
      isError: true,
    };
  }
}

/**
 * Tool metadata for MCP registration
 */
export const getServerContextMetadata = {
  name: 'get_server_context',
  description:
    "Generate a comprehensive context file showing the server's current state, memory, and capabilities. Creates .mcp-server-context.md that can be @ referenced in conversations to give LLMs instant awareness of the server.",
  inputSchema: {
    type: 'object',
    properties: {
      writeToFile: {
        type: 'boolean',
        description: 'Whether to write the context to .mcp-server-context.md file',
        default: true,
      },
      outputPath: {
        type: 'string',
        description: 'Custom output path for the context file',
      },
      includeDetailed: {
        type: 'boolean',
        description: 'Include detailed information',
        default: true,
      },
      maxRecentItems: {
        type: 'number',
        description: 'Maximum number of recent items to show',
        default: 5,
      },
    },
  },
};
