/**
 * Expand Analysis Tool
 *
 * Retrieves full analysis content from tiered responses stored in memory.
 * Supports expanding entire analysis or specific sections.
 */

import { TieredResponseManager } from '../utils/tiered-response-manager.js';
import { MemoryEntityManager } from '../utils/memory-entity-manager.js';
import { McpAdrError } from '../types/index.js';

interface ExpandAnalysisParams {
  /** ID of the expandable analysis */
  expandableId: string;

  /** Optional: Specific section to expand (if omitted, returns full analysis) */
  section?: string;

  /** Format of the output */
  format?: 'markdown' | 'json';
}

export async function expandAnalysisSection(
  params: ExpandAnalysisParams
): Promise<{ content: Array<{ type: 'text'; text: string }>; isError?: boolean }> {
  const { expandableId, section, format = 'markdown' } = params;

  try {
    const memoryManager = new MemoryEntityManager();
    const tieredManager = new TieredResponseManager(memoryManager);

    await tieredManager.initialize();

    // Retrieve expandable content
    const expandableContent = await tieredManager.getExpandableContent(expandableId);

    if (!expandableContent) {
      throw new McpAdrError(
        `No expandable content found for ID: ${expandableId}. It may have been deleted or expired.`,
        'NOT_FOUND'
      );
    }

    // Determine what to return
    let outputContent: string;
    let title: string;

    if (section) {
      // Expand specific section
      if (!expandableContent.sections[section]) {
        const availableSections = Object.keys(expandableContent.sections).join(', ');
        throw new McpAdrError(
          `Section "${section}" not found. Available sections: ${availableSections}`,
          'INVALID_INPUT'
        );
      }

      outputContent = expandableContent.sections[section];
      title = `${expandableContent.metadata.toolName} - ${section}`;
    } else {
      // Expand full analysis
      outputContent = expandableContent.content;
      title = `${expandableContent.metadata.toolName} - Full Analysis`;
    }

    // Format output
    if (format === 'json') {
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(
              {
                expandableId,
                section: section || 'full',
                metadata: expandableContent.metadata,
                content: outputContent,
              },
              null,
              2
            ),
          },
        ],
      };
    }

    // Markdown format (default)
    const formattedOutput = `# ${title}

## 📋 Analysis Details

**Tool:** ${expandableContent.metadata.toolName}
**Generated:** ${new Date(expandableContent.metadata.timestamp).toLocaleString()}
**Token Count:** ~${expandableContent.metadata.tokenCount} tokens
**Expandable ID:** \`${expandableId}\`

${section ? `**Section:** ${section}` : '**Scope:** Complete Analysis'}

---

## 📖 Content

${outputContent}

---

## 🔄 Related Actions

${
  !section && Object.keys(expandableContent.sections).length > 0
    ? `
### Available Sections

You can expand specific sections for focused analysis:

${Object.keys(expandableContent.sections)
  .map(
    s =>
      `- **${s}**: \`expand_analysis_section\` with \`expandableId: "${expandableId}", section: "${s}"\``
  )
  .join('\n')}
`
    : ''
}

### Tool Arguments Used

\`\`\`json
${JSON.stringify(expandableContent.metadata.toolArgs || {}, null, 2)}
\`\`\`

💡 **Tip:** You can reference this analysis using expandable ID \`${expandableId}\` in future conversations.
`;

    return {
      content: [{ type: 'text', text: formattedOutput }],
    };
  } catch (error) {
    if (error instanceof McpAdrError) {
      throw error;
    }

    throw new McpAdrError(
      `Failed to expand analysis: ${error instanceof Error ? error.message : String(error)}`,
      'EXPANSION_ERROR'
    );
  }
}
