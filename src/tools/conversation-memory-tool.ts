/**
 * Conversation Memory Tool
 *
 * Phase 3: Structured External Memory
 * Provides tools for expanding stored content and querying conversation history.
 */

import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import type { ConversationMemoryManager } from '../utils/conversation-memory-manager.js';
import type { MemoryExpansionRequest, SessionQuery } from '../types/conversation-memory.js';

/**
 * Expand Memory Tool
 *
 * Retrieves full analysis content from a tiered response expandable ID.
 */
export async function expandMemory(
  args: {
    expandableId: string;
    section?: string;
    includeContext?: boolean;
  },
  memoryManager: ConversationMemoryManager
): Promise<CallToolResult> {
  try {
    const request: MemoryExpansionRequest = {
      expandableId: args.expandableId,
      ...(args.section ? { section: args.section } : {}),
      includeContext: args.includeContext ?? true,
    };

    const result = await memoryManager.expandContent(request);

    // Format the expanded content
    let output = `# Expanded Content: ${args.expandableId}\n\n`;

    // Show section or full content
    if (args.section && result.content.sections[args.section]) {
      output += `## Section: ${args.section}\n\n`;
      output += result.content.sections[args.section];
    } else {
      output += `## Full Analysis\n\n`;
      output += result.content.content;
    }

    // Add metadata
    output += `\n\n---\n\n`;
    output += `**Tool**: ${result.content.metadata.toolName}\n`;
    output += `**Timestamp**: ${result.content.metadata.timestamp}\n`;
    output += `**Token Count**: ${result.content.metadata.tokenCount}\n`;

    // Add related turns if included
    if (result.relatedTurns && result.relatedTurns.length > 0) {
      output += `\n## Related Conversation Turns\n\n`;
      result.relatedTurns.forEach(turn => {
        output += `- **Turn ${turn.turnNumber}** (${turn.timestamp}): `;
        output += `${turn.request.toolName || 'message'}\n`;
      });
    }

    // Add knowledge graph context if included
    if (result.knowledgeGraphContext && result.knowledgeGraphContext.length > 0) {
      output += `\n## Knowledge Graph Context\n\n`;
      result.knowledgeGraphContext.forEach(context => {
        output += `- **${context.intent}**: ${context.outcome} (${context.timestamp})\n`;
      });
    }

    return {
      content: [
        {
          type: 'text',
          text: output,
        },
      ],
    };
  } catch (error) {
    return {
      content: [
        {
          type: 'text',
          text: `❌ Failed to expand content: ${error instanceof Error ? error.message : String(error)}`,
        },
      ],
      isError: true,
    };
  }
}

/**
 * Query Conversation History Tool
 *
 * Searches conversation sessions based on filters.
 */
export async function queryConversationHistory(
  args: {
    projectPath?: string;
    dateRange?: { start: string; end: string };
    toolsUsed?: string[];
    keyword?: string;
    limit?: number;
  },
  memoryManager: ConversationMemoryManager
): Promise<CallToolResult> {
  try {
    const query: SessionQuery = {
      ...(args.projectPath ? { projectPath: args.projectPath } : {}),
      ...(args.dateRange ? { dateRange: args.dateRange } : {}),
      ...(args.toolsUsed ? { toolsUsed: args.toolsUsed } : {}),
      ...(args.keyword ? { keyword: args.keyword } : {}),
      limit: args.limit ?? 10,
    };

    const sessions = await memoryManager.querySessions(query);

    if (sessions.length === 0) {
      return {
        content: [
          {
            type: 'text',
            text: 'No conversation sessions found matching the query.',
          },
        ],
      };
    }

    let output = `# Conversation History (${sessions.length} sessions found)\n\n`;

    sessions.forEach((session, index) => {
      output += `## ${index + 1}. Session ${session.sessionId}\n\n`;
      output += `- **Project**: ${session.projectPath}\n`;
      output += `- **Started**: ${session.startedAt}\n`;
      output += `- **Last Activity**: ${session.lastActivityAt}\n`;
      output += `- **Turns**: ${session.turns.length}\n`;
      output += `- **Total Tokens**: ${session.metadata.totalTokensUsed}\n`;
      output += `- **Tools Used**: ${session.metadata.toolsUsed.join(', ')}\n`;

      // Show recent turns
      if (session.turns.length > 0) {
        output += `\n### Recent Turns:\n`;
        const recentTurns = session.turns.slice(-3);
        recentTurns.forEach(turn => {
          output += `- **Turn ${turn.turnNumber}**: ${turn.request.toolName || 'message'} `;
          output += `(${turn.metadata.duration}ms)\n`;
        });
      }

      output += `\n`;
    });

    return {
      content: [
        {
          type: 'text',
          text: output,
        },
      ],
    };
  } catch (error) {
    return {
      content: [
        {
          type: 'text',
          text: `❌ Failed to query conversation history: ${error instanceof Error ? error.message : String(error)}`,
        },
      ],
      isError: true,
    };
  }
}

/**
 * Get Conversation Context Snapshot Tool
 *
 * Retrieves current conversation context for resumption or analysis.
 */
export async function getConversationSnapshot(
  args: {
    recentTurnCount?: number;
  },
  memoryManager: ConversationMemoryManager
): Promise<CallToolResult> {
  try {
    const snapshot = await memoryManager.getContextSnapshot(args.recentTurnCount ?? 5);

    if (!snapshot) {
      return {
        content: [
          {
            type: 'text',
            text: 'No active conversation session found.',
          },
        ],
      };
    }

    let output = `# Conversation Context Snapshot\n\n`;
    output += `**Session ID**: ${snapshot.sessionId}\n\n`;

    // Recent turns
    output += `## Recent Turns (${snapshot.recentTurns.length})\n\n`;
    snapshot.recentTurns.forEach(turn => {
      output += `### Turn ${turn.turnNumber} - ${turn.timestamp}\n`;
      output += `- **Request**: ${turn.request.toolName || 'message'}\n`;
      output += `- **Tokens**: ${turn.response.tokenCount}\n`;
      if (turn.response.expandableId) {
        output += `- **Expandable ID**: ${turn.response.expandableId}\n`;
      }
      output += `\n`;
    });

    // Active intents
    if (snapshot.activeIntents.length > 0) {
      output += `## Active Knowledge Graph Intents\n\n`;
      snapshot.activeIntents.forEach(intent => {
        output += `- **${intent.intent}**: ${intent.status}\n`;
      });
      output += `\n`;
    }

    // Decisions recorded
    if (snapshot.decisionsRecorded.length > 0) {
      output += `## Decisions Recorded\n\n`;
      snapshot.decisionsRecorded.forEach(decision => {
        output += `- **${decision.title}** (${decision.adrId}) - ${decision.timestamp}\n`;
      });
      output += `\n`;
    }

    // Conversation focus
    if (snapshot.conversationFocus) {
      output += `## Conversation Focus\n\n`;
      output += `- **Topic**: ${snapshot.conversationFocus.topic}\n`;
      output += `- **Phase**: ${snapshot.conversationFocus.phase}\n`;
      output += `- **Next Steps**:\n`;
      snapshot.conversationFocus.nextSteps.forEach(step => {
        output += `  - ${step}\n`;
      });
    }

    return {
      content: [
        {
          type: 'text',
          text: output,
        },
      ],
    };
  } catch (error) {
    return {
      content: [
        {
          type: 'text',
          text: `❌ Failed to get conversation snapshot: ${error instanceof Error ? error.message : String(error)}`,
        },
      ],
      isError: true,
    };
  }
}

/**
 * Get Conversation Memory Statistics Tool
 *
 * Provides statistics about stored conversation memory.
 */
export async function getMemoryStats(
  memoryManager: ConversationMemoryManager
): Promise<CallToolResult> {
  try {
    const stats = await memoryManager.getStats();

    let output = `# Conversation Memory Statistics\n\n`;
    output += `## Storage Overview\n\n`;
    output += `- **Total Sessions**: ${stats.totalSessions}\n`;
    output += `- **Active Sessions**: ${stats.activeSessions}\n`;
    output += `- **Archived Sessions**: ${stats.archivedSessions}\n`;
    output += `- **Total Turns**: ${stats.totalTurns}\n`;
    output += `- **Expandable Content Items**: ${stats.totalExpandableContent}\n`;
    output += `- **Average Turns per Session**: ${stats.avgTurnsPerSession.toFixed(2)}\n`;
    output += `- **Total Storage Size**: ${(stats.totalStorageBytes / 1024).toFixed(2)} KB\n`;

    return {
      content: [
        {
          type: 'text',
          text: output,
        },
      ],
    };
  } catch (error) {
    return {
      content: [
        {
          type: 'text',
          text: `❌ Failed to get memory stats: ${error instanceof Error ? error.message : String(error)}`,
        },
      ],
      isError: true,
    };
  }
}
