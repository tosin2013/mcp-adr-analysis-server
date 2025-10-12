/**
 * Server Context Generator
 *
 * Generates a human-readable context file that LLMs can @ reference
 * to instantly understand the server's state, memory, and capabilities.
 *
 * This bridges the gap between internal memory systems (JSON in /tmp)
 * and LLM working context by creating a markdown file that can be
 * @ mentioned in conversations.
 */

import * as fs from 'fs/promises';
import * as path from 'path';
import { KnowledgeGraphManager } from './knowledge-graph-manager.js';
import { MemoryEntityManager } from './memory-entity-manager.js';
import { ConversationMemoryManager } from './conversation-memory-manager.js';
import { loadConfig } from './config.js';
import { EnhancedLogger } from './enhanced-logging.js';

export interface ServerContextOptions {
  outputPath?: string;
  includeDetailed?: boolean;
  maxRecentItems?: number;
}

export class ServerContextGenerator {
  private logger: EnhancedLogger;
  private config: ReturnType<typeof loadConfig>;

  constructor() {
    this.logger = new EnhancedLogger();
    this.config = loadConfig();
  }

  /**
   * Generate the complete server context markdown file
   */
  async generateContext(
    kgManager: KnowledgeGraphManager,
    memoryManager: MemoryEntityManager,
    conversationManager: ConversationMemoryManager,
    options: ServerContextOptions = {}
  ): Promise<string> {
    const { maxRecentItems = 5 } = options;

    const sections: string[] = [];

    // Header
    sections.push(this.generateHeader());

    // Server Quick Reference
    sections.push(this.generateServerInfo());

    // Memory & Knowledge Graph Status
    sections.push(
      await this.generateMemoryStatus(kgManager, memoryManager, conversationManager, maxRecentItems)
    );

    // Analytics
    sections.push(await this.generateAnalytics(kgManager));

    // Patterns
    sections.push(await this.generatePatterns(memoryManager));

    // Recommendations
    sections.push(await this.generateRecommendations(memoryManager));

    // Usage guide
    sections.push(this.generateUsageGuide());

    // Footer
    sections.push(this.generateFooter());

    return sections.join('\n\n---\n\n');
  }

  /**
   * Write context to file
   */
  async writeContextFile(
    kgManager: KnowledgeGraphManager,
    memoryManager: MemoryEntityManager,
    conversationManager: ConversationMemoryManager,
    filePath?: string
  ): Promise<void> {
    const outputPath = filePath || path.join(this.config.projectPath, '.mcp-server-context.md');
    const content = await this.generateContext(kgManager, memoryManager, conversationManager);

    await fs.writeFile(outputPath, content, 'utf-8');

    this.logger.info('Server context file updated', 'ServerContextGenerator', {
      path: outputPath,
      size: content.length,
    });
  }

  private generateHeader(): string {
    return `# MCP Server Context & Memory

> **Purpose**: \`@\` reference this file to give LLMs instant context about the MCP ADR Analysis Server's state, capabilities, and recent activity.
>
> **Auto-generated**: This file is automatically updated by the server's memory systems.
>
> **Last Updated**: ${new Date().toISOString()}`;
  }

  private generateServerInfo(toolList?: Array<{ name: string; description: string }>): string {
    // Generate tool list from actual registered tools or use default list
    const tools = toolList || [
      { name: 'adr_suggestion', description: 'Suggest new ADRs based on context' },
      { name: 'smart_score', description: 'Score code quality and architecture (0-100)' },
      { name: 'deployment_readiness', description: 'Validate deployment with zero-tolerance' },
      { name: 'todo_management_v2', description: 'Advanced context-aware todo tracking' },
      { name: 'smart_git_push', description: 'Intelligent git operations' },
      { name: 'content_masking', description: 'Protect sensitive information' },
      { name: 'tool_chain_orchestrator', description: 'Coordinate multi-tool workflows' },
      { name: 'environment_analysis', description: 'Analyze project environment' },
      { name: 'interactive_adr_planning', description: 'Interactive ADR creation' },
      { name: 'conversation_memory', description: 'Manage conversation context' },
      { name: 'adr_validation', description: 'Validate ADR content and structure' },
      { name: 'rule_generation', description: 'Generate architectural rules' },
      { name: 'deployment_guidance', description: 'Get deployment recommendations' },
      { name: 'deployment_analysis', description: 'Analyze deployment configurations' },
      { name: 'perform_research', description: 'Conduct architectural research' },
      { name: 'research_question', description: 'Ask research questions' },
      { name: 'research_integration', description: 'Integrate research findings' },
      { name: 'expand_analysis', description: 'Expand on analysis results' },
      { name: 'review_existing_adrs', description: 'Review and analyze existing ADRs' },
      { name: 'bootstrap_validation_loop', description: 'Bootstrap validation workflows' },
      { name: 'adr_bootstrap_validation', description: 'Validate ADR bootstrap process' },
      { name: 'troubleshoot_guided_workflow', description: 'Guided troubleshooting' },
      { name: 'llm_web_search', description: 'Search web for context' },
      { name: 'llm_cloud_management', description: 'Manage cloud resources' },
      { name: 'llm_database_management', description: 'Manage database operations' },
      { name: 'memory_loading', description: 'Load and manage memory entities' },
      { name: 'get_server_context', description: 'Get current server context' },
      { name: 'mcp_planning', description: 'Plan MCP workflows' },
    ];

    // Group tools by category for better organization
    const categories = this.categorizeTools(tools);

    let toolsSection = '### Available Tools by Category\n\n';

    for (const [category, categoryTools] of Object.entries(categories)) {
      toolsSection += `**${category}**\n`;
      categoryTools.forEach((tool, idx) => {
        toolsSection += `${idx + 1}. \`${tool.name}\` - ${tool.description}\n`;
      });
      toolsSection += '\n';
    }

    return `## 🎯 Server Quick Reference

**Name**: mcp-adr-analysis-server
**Purpose**: AI-powered architectural decision analysis and ADR management
**Project Path**: \`${this.config.projectPath}\`
**ADR Directory**: \`${this.config.adrDirectory}\`

${toolsSection}
📖 Full tool schemas available via MCP protocol • Total: ${tools.length} tools`;
  }

  /**
   * Categorize tools for better organization
   */
  private categorizeTools(
    tools: Array<{ name: string; description: string }>
  ): Record<string, Array<{ name: string; description: string }>> {
    const categories: Record<string, Array<{ name: string; description: string }>> = {
      'ADR Management': [],
      'Deployment & Infrastructure': [],
      'Research & Analysis': [],
      'Development Workflow': [],
      'Memory & Context': [],
      'Cloud & Database': [],
      Other: [],
    };

    tools.forEach(tool => {
      const name = tool.name.toLowerCase();

      if (name.includes('adr') || name.includes('rule')) {
        categories['ADR Management']?.push(tool);
      } else if (name.includes('deploy') || name.includes('environment')) {
        categories['Deployment & Infrastructure']?.push(tool);
      } else if (name.includes('research') || name.includes('expand') || name.includes('review')) {
        categories['Research & Analysis']?.push(tool);
      } else if (
        name.includes('git') ||
        name.includes('todo') ||
        name.includes('troubleshoot') ||
        name.includes('bootstrap') ||
        name.includes('validation')
      ) {
        categories['Development Workflow']?.push(tool);
      } else if (
        name.includes('memory') ||
        name.includes('conversation') ||
        name.includes('context')
      ) {
        categories['Memory & Context']?.push(tool);
      } else if (name.includes('cloud') || name.includes('database') || name.includes('llm')) {
        categories['Cloud & Database']?.push(tool);
      } else {
        categories['Other']?.push(tool);
      }
    });

    // Remove empty categories
    Object.keys(categories).forEach(key => {
      if (categories[key]?.length === 0) {
        delete categories[key];
      }
    });

    return categories;
  }

  private async generateMemoryStatus(
    kgManager: KnowledgeGraphManager,
    memoryManager: MemoryEntityManager,
    conversationManager: ConversationMemoryManager,
    maxRecent: number
  ): Promise<string> {
    // Get knowledge graph data
    const kg = await kgManager.loadKnowledgeGraph();
    const activeIntents = await kgManager.getActiveIntents();
    const completedIntents = await kgManager.getIntentsByStatus('completed');

    // Get memory entity data
    const entityQuery = await memoryManager.queryEntities({ limit: 1000 });
    const intelligence = await memoryManager.getIntelligence();

    // Get conversation data
    let sessionInfo = 'None';
    let turnCount = 0;
    let sessionDuration = '0m';
    try {
      const stats = await conversationManager.getStats();
      if (stats.activeSessions > 0) {
        sessionInfo = `${stats.activeSessions} active`;
        turnCount = stats.totalTurns;
        // Use average session duration if available
        sessionDuration =
          stats.activeSessions > 0
            ? `${Math.floor(stats.totalTurns / stats.activeSessions)}t`
            : '0m';
      }
    } catch {
      // Conversation manager not initialized
    }

    // Recent intents
    const recentIntents = kg.intents
      .slice(-maxRecent)
      .reverse()
      .map(
        intent =>
          `- **${intent.humanRequest.substring(0, 60)}...** - ${intent.currentStatus} - ${new Date(intent.timestamp).toLocaleString()}`
      )
      .join('\n');

    // Entity breakdown
    const entityBreakdown = Object.entries(entityQuery.aggregations?.byType || {})
      .map(([type, count]) => `- ${type}: ${count}`)
      .join('\n');

    const avgConfidence = Math.round(
      (entityQuery.entities.reduce((sum, e) => sum + e.confidence, 0) /
        (entityQuery.entities.length || 1)) *
        100
    );

    return `## 🧠 Memory & Knowledge Graph Status

### Active Intents

**Total Intents**: ${kg.intents.length}
**Active**: ${activeIntents.length} | **Completed**: ${completedIntents.length}

**Recent Intents** (Last ${maxRecent}):
${recentIntents || '- No recent intents'}

### Memory Entities

**Total Entities**: ${entityQuery.totalCount}
**Relationships**: ${entityQuery.relationships.length}
**Average Confidence**: ${avgConfidence}%

**Entity Breakdown**:
${entityBreakdown || '- No entities yet'}

**Recent Activity** (Last 24h):
- Knowledge Gaps: ${intelligence.adaptiveRecommendations.knowledgeGaps.length} identified

### Conversation Context

**Active Session**: ${sessionInfo}
**Conversation Turns**: ${turnCount}
**Session Duration**: ${sessionDuration}`;
  }

  private async generateAnalytics(kgManager: KnowledgeGraphManager): Promise<string> {
    const kg = await kgManager.loadKnowledgeGraph();
    const trends = await kgManager.getProjectScoreTrends();

    // Tool usage from analytics
    const toolUsage = kg.analytics.mostUsedTools
      .slice(0, 5)
      .map((t, i) => `${i + 1}. **${t.toolName}**: ${t.usageCount} calls`)
      .join('\n');

    return `## 📊 Recent Analytics

### Tool Usage (Most Used)
${toolUsage || '- No tool usage yet'}

### Score Trends
- **Current Project Score**: ${Math.round(trends.currentScore)}/100
- **Average Improvement per Intent**: ${Math.round(trends.averageImprovement)}

### Top Impacting Intents
${trends.topImpactingIntents
  .slice(0, 3)
  .map(
    i =>
      `- **${i.humanRequest.substring(0, 50)}...**: ${i.scoreImprovement > 0 ? '+' : ''}${Math.round(i.scoreImprovement)} points`
  )
  .join('\n')}`;
  }

  private async generatePatterns(memoryManager: MemoryEntityManager): Promise<string> {
    const intelligence = await memoryManager.getIntelligence();

    const patterns = intelligence.patternRecognition.discoveredPatterns
      .slice(0, 5)
      .map(p => `- **${p.pattern}**: ${Math.round((p.confidence || 0) * 100)}% confidence`)
      .join('\n');

    const suggestions = intelligence.relationshipInference.suggestedRelationships
      .slice(0, 3)
      .map(
        s =>
          `- ${s.sourceId.substring(0, 8)} → ${s.targetId.substring(0, 8)}: **${s.type}** (${Math.round((s.confidence || 0) * 100)}%)`
      )
      .join('\n');

    return `## 🔍 Discovered Patterns

### Architectural Patterns
${patterns || '- No patterns discovered yet'}

### Suggested Relationships
${suggestions || '- No relationship suggestions yet'}

**Emergent Behaviors**: ${intelligence.patternRecognition.emergentBehaviors.length} detected`;
  }

  private async generateRecommendations(memoryManager: MemoryEntityManager): Promise<string> {
    const intelligence = await memoryManager.getIntelligence();

    const nextActions = intelligence.adaptiveRecommendations.nextActions
      .slice(0, 3)
      .map(a => `${a.priority}. **${a.action}** - ${a.reasoning}`)
      .join('\n');

    const knowledgeGaps = intelligence.adaptiveRecommendations.knowledgeGaps
      .slice(0, 3)
      .map(gap => `- ${gap}`)
      .join('\n');

    const opportunities = intelligence.adaptiveRecommendations.optimizationOpportunities
      .slice(0, 3)
      .map(opp => `- ${opp}`)
      .join('\n');

    return `## 🎯 Recommendations for This Session

### Next Actions
${nextActions || '- No specific actions recommended'}

### Knowledge Gaps
${knowledgeGaps || '- No knowledge gaps identified'}

### Optimization Opportunities
${opportunities || '- No optimization opportunities identified'}`;
  }

  private generateUsageGuide(): string {
    return `## 📝 How to Use This Context

**When starting a conversation**:
\`\`\`
@.mcp-server-context.md I need to understand our current architectural decisions
\`\`\`

**When resuming work**:
\`\`\`
@.mcp-server-context.md What were we working on? Show me the active intents
\`\`\`

**When making decisions**:
\`\`\`
@.mcp-server-context.md What patterns have we discovered that relate to [topic]?
\`\`\`

**When checking progress**:
\`\`\`
@.mcp-server-context.md How has our architecture score changed recently?
\`\`\``;
  }

  private generateFooter(): string {
    return `## 🔄 Context Refresh

This file is automatically updated:
- After every tool execution
- When memory entities change
- When conversation sessions start/end
- On server restart

To manually refresh: Use the MCP tool \`get_server_context\` or restart the server

---

_This context file bridges the gap between the server's persistent memory systems and your working conversation context._`;
  }
}
