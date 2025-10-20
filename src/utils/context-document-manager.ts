import { promises as fs } from 'fs';
import * as path from 'path';
import { EnhancedLogger } from './enhanced-logging.js';

/**
 * Metadata for tool context documents
 */
export interface ToolContextMetadata {
  toolName: string;
  toolVersion: string;
  generated: string; // ISO timestamp
  projectPath: string;
  projectName: string;
  status: 'success' | 'failed' | 'partial';
  confidence?: number;
}

/**
 * Decision record within a context document
 */
export interface Decision {
  decision: string;
  rationale: string;
  alternatives?: string[];
}

/**
 * Learning record from tool execution
 */
export interface Learnings {
  successes: string[];
  failures: string[];
  recommendations: string[];
  environmentSpecific: string[];
}

/**
 * Related documents and references
 */
export interface RelatedDocuments {
  adrs: string[];
  configs: string[];
  otherContexts: string[];
}

/**
 * Complete tool context document structure
 */
export interface ToolContextDocument {
  metadata: ToolContextMetadata;
  quickReference: string;
  executionSummary: {
    status: string;
    confidence?: number;
    keyFindings: string[];
  };
  detectedContext: Record<string, any>;
  generatedArtifacts?: string[];
  keyDecisions?: Decision[];
  learnings?: Learnings;
  relatedDocuments?: RelatedDocuments;
  rawData?: any;
}

/**
 * Manages creation, storage, and retrieval of tool context documents
 */
export class ToolContextManager {
  private contextDir: string;
  private logger: EnhancedLogger;

  constructor(projectPath: string) {
    this.contextDir = path.join(projectPath, 'docs', 'context');
    this.logger = new EnhancedLogger();
  }

  /**
   * Initialize context directory structure
   */
  async initialize(): Promise<void> {
    const categories = [
      'bootstrap',
      'deployment',
      'environment',
      'research',
      'planning',
      'validation',
      'git',
    ];

    try {
      // Create main context directory
      await fs.mkdir(this.contextDir, { recursive: true });

      // Create category subdirectories
      for (const category of categories) {
        const categoryDir = path.join(this.contextDir, category);
        await fs.mkdir(categoryDir, { recursive: true });
      }

      this.logger.info('Context directory structure initialized', 'ToolContextManager');
    } catch (error) {
      this.logger.error(
        'Failed to initialize context directories',
        'ToolContextManager',
        error as Error
      );
      throw error;
    }
  }

  /**
   * Save a context document to the appropriate category
   * @param category - Category subdirectory (bootstrap, deployment, etc.)
   * @param document - Context document to save
   * @returns Path to the saved document
   */
  async saveContext(category: string, document: ToolContextDocument): Promise<string> {
    try {
      const categoryDir = path.join(this.contextDir, category);
      await fs.mkdir(categoryDir, { recursive: true });

      // Generate filename with timestamp
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-').split('.')[0];
      const filename = `${document.metadata.toolName.toLowerCase().replace(/_/g, '-')}-${timestamp}.md`;
      const filePath = path.join(categoryDir, filename);

      // Generate markdown content
      const markdown = this.generateMarkdown(document);

      // Write the file
      await fs.writeFile(filePath, markdown, 'utf-8');

      // Update latest.md symlink
      await this.updateLatestSymlink(category, filePath);

      this.logger.info(`Context document saved: ${filePath}`, 'ToolContextManager');

      return filePath;
    } catch (error) {
      this.logger.error('Failed to save context document', 'ToolContextManager', error as Error);
      throw error;
    }
  }

  /**
   * Load the latest context document for a category
   * @param category - Category to load from
   * @returns Context document or null if not found
   */
  async loadLatestContext(category: string): Promise<ToolContextDocument | null> {
    try {
      const latestPath = path.join(this.contextDir, category, 'latest.md');

      // Check if latest.md exists
      try {
        await fs.access(latestPath);
      } catch {
        this.logger.warn(`No latest context found for category: ${category}`, 'ToolContextManager');
        return null;
      }

      // Read the file (for future parsing implementation)
      await fs.readFile(latestPath, 'utf-8');

      // Parse markdown back to context document (simplified - would need full parser)
      // For now, return null and log that parsing is not yet implemented
      this.logger.info(
        `Latest context found for ${category}, but parsing not yet implemented`,
        'ToolContextManager'
      );
      return null;
    } catch (error) {
      this.logger.error('Failed to load latest context', 'ToolContextManager', error as Error);
      return null;
    }
  }

  /**
   * Load a specific context document by timestamp
   * @param category - Category to search in
   * @param timestamp - Timestamp identifier
   * @returns Context document or null if not found
   */
  async loadContextByTimestamp(
    category: string,
    timestamp: string
  ): Promise<ToolContextDocument | null> {
    try {
      const categoryDir = path.join(this.contextDir, category);
      const files = await fs.readdir(categoryDir);

      // Find file matching timestamp
      const matchingFile = files.find(f => f.includes(timestamp));

      if (!matchingFile) {
        this.logger.warn(`No context found for timestamp: ${timestamp}`, 'ToolContextManager');
        return null;
      }

      const filePath = path.join(categoryDir, matchingFile);
      await fs.readFile(filePath, 'utf-8');

      // Parsing not yet implemented
      this.logger.info(
        `Context found for timestamp ${timestamp}, but parsing not yet implemented`,
        'ToolContextManager'
      );
      return null;
    } catch (error) {
      this.logger.error(
        'Failed to load context by timestamp',
        'ToolContextManager',
        error as Error
      );
      return null;
    }
  }

  /**
   * List all context documents in a category
   * @param category - Category to list
   * @returns Array of filenames
   */
  async listContexts(category: string): Promise<string[]> {
    try {
      const categoryDir = path.join(this.contextDir, category);
      const files = await fs.readdir(categoryDir);

      // Filter out latest.md and only return timestamped files
      return files
        .filter(f => f.endsWith('.md') && f !== 'latest.md')
        .sort()
        .reverse();
    } catch (error) {
      this.logger.error('Failed to list contexts', 'ToolContextManager', error as Error);
      return [];
    }
  }

  /**
   * Update the latest.md symlink or copy for a category
   * @param category - Category directory
   * @param filePath - Path to the latest context document
   */
  async updateLatestSymlink(category: string, filePath: string): Promise<void> {
    try {
      const latestPath = path.join(this.contextDir, category, 'latest.md');

      // Remove existing latest.md
      try {
        await fs.unlink(latestPath);
      } catch {
        // File doesn't exist, that's fine
      }

      // Copy file to latest.md (symlinks can be problematic on some systems)
      const content = await fs.readFile(filePath, 'utf-8');
      await fs.writeFile(latestPath, content, 'utf-8');

      this.logger.info(`Updated latest.md for category: ${category}`, 'ToolContextManager');
    } catch (error) {
      this.logger.error('Failed to update latest symlink', 'ToolContextManager', error as Error);
    }
  }

  /**
   * Clean up old context documents, keeping only the most recent N
   * @param category - Category to clean up
   * @param keepCount - Number of recent contexts to keep (default: 10)
   */
  async cleanupOldContexts(category: string, keepCount: number = 10): Promise<void> {
    try {
      const contexts = await this.listContexts(category);

      if (contexts.length <= keepCount) {
        this.logger.info(
          `No cleanup needed for ${category} (${contexts.length} contexts)`,
          'ToolContextManager'
        );
        return;
      }

      // Delete oldest contexts
      const toDelete = contexts.slice(keepCount);
      const categoryDir = path.join(this.contextDir, category);

      for (const filename of toDelete) {
        const filePath = path.join(categoryDir, filename);
        await fs.unlink(filePath);
        this.logger.info(`Deleted old context: ${filename}`, 'ToolContextManager');
      }

      this.logger.info(
        `Cleaned up ${toDelete.length} old contexts from ${category}`,
        'ToolContextManager'
      );
    } catch (error) {
      this.logger.error('Failed to cleanup old contexts', 'ToolContextManager', error as Error);
    }
  }

  /**
   * Generate markdown content from a context document
   * @param document - Context document to convert
   * @returns Markdown string
   */
  generateMarkdown(document: ToolContextDocument): string {
    const lines: string[] = [];

    // Title and metadata
    lines.push(`# Tool Context: ${document.metadata.toolName}`);
    lines.push('');
    lines.push(`> **Generated**: ${document.metadata.generated}`);
    lines.push(`> **Tool Version**: ${document.metadata.toolVersion}`);
    lines.push(`> **Project**: ${document.metadata.projectName}`);
    lines.push('');

    // Quick Reference
    lines.push('## Quick Reference');
    lines.push('');
    lines.push(document.quickReference.trim());
    lines.push('');

    // Execution Summary
    lines.push('## Execution Summary');
    lines.push('');
    lines.push(`- **Status**: ${document.executionSummary.status}`);
    if (document.executionSummary.confidence !== undefined) {
      lines.push(`- **Confidence**: ${document.executionSummary.confidence.toFixed(0)}%`);
    }
    lines.push('- **Key Findings**:');
    for (const finding of document.executionSummary.keyFindings) {
      lines.push(`  - ${finding}`);
    }
    lines.push('');

    // Detected Context
    lines.push('## Detected Context');
    lines.push('');
    lines.push('```json');
    lines.push(JSON.stringify(document.detectedContext, null, 2));
    lines.push('```');
    lines.push('');

    // Generated Artifacts
    if (document.generatedArtifacts && document.generatedArtifacts.length > 0) {
      lines.push('## Generated Artifacts');
      lines.push('');
      for (const artifact of document.generatedArtifacts) {
        lines.push(`- \`${artifact}\``);
      }
      lines.push('');
    }

    // Key Decisions
    if (document.keyDecisions && document.keyDecisions.length > 0) {
      lines.push('## Key Decisions');
      lines.push('');
      for (let i = 0; i < document.keyDecisions.length; i++) {
        const decision = document.keyDecisions[i];
        if (decision) {
          lines.push(`### ${i + 1}. ${decision.decision}`);
          lines.push(`- **Rationale**: ${decision.rationale}`);
          if (decision.alternatives && decision.alternatives.length > 0) {
            lines.push('- **Alternatives Considered**:');
            for (const alt of decision.alternatives) {
              lines.push(`  - ${alt}`);
            }
          }
          lines.push('');
        }
      }
    }

    // Learnings & Recommendations
    if (document.learnings) {
      lines.push('## Learnings & Recommendations');
      lines.push('');

      if (document.learnings.successes.length > 0) {
        lines.push('### Successes ✅');
        for (const success of document.learnings.successes) {
          lines.push(`- ${success}`);
        }
        lines.push('');
      }

      if (document.learnings.failures.length > 0) {
        lines.push('### Failures ⚠️');
        for (const failure of document.learnings.failures) {
          lines.push(`- ${failure}`);
        }
        lines.push('');
      }

      if (document.learnings.recommendations.length > 0) {
        lines.push('### Recommendations');
        for (const rec of document.learnings.recommendations) {
          lines.push(`- ${rec}`);
        }
        lines.push('');
      }

      if (document.learnings.environmentSpecific.length > 0) {
        lines.push('### Environment-Specific Notes');
        for (const note of document.learnings.environmentSpecific) {
          lines.push(`- ${note}`);
        }
        lines.push('');
      }
    }

    // Usage in Future Sessions
    lines.push('## Usage in Future Sessions');
    lines.push('');
    lines.push('### How to Reference This Context');
    lines.push('');
    lines.push('```text');
    lines.push('Example prompt:');
    lines.push(`"Using the context from docs/context/${document.metadata.toolName}/latest.md,`);
    lines.push('continue the work from the previous session"');
    lines.push('```');
    lines.push('');

    // Related Documents
    if (document.relatedDocuments) {
      lines.push('### Related Documents');
      lines.push('');

      if (document.relatedDocuments.adrs.length > 0) {
        lines.push('**ADRs**:');
        for (const adr of document.relatedDocuments.adrs) {
          lines.push(`- \`${adr}\``);
        }
        lines.push('');
      }

      if (document.relatedDocuments.configs.length > 0) {
        lines.push('**Configuration Files**:');
        for (const config of document.relatedDocuments.configs) {
          lines.push(`- \`${config}\``);
        }
        lines.push('');
      }

      if (document.relatedDocuments.otherContexts.length > 0) {
        lines.push('**Other Context Documents**:');
        for (const ctx of document.relatedDocuments.otherContexts) {
          lines.push(`- \`${ctx}\``);
        }
        lines.push('');
      }
    }

    // Raw Data (Optional)
    if (document.rawData) {
      lines.push('## Raw Data');
      lines.push('');
      lines.push('<details>');
      lines.push('<summary>Full execution output</summary>');
      lines.push('');
      lines.push('```json');
      lines.push(JSON.stringify(document.rawData, null, 2));
      lines.push('```');
      lines.push('</details>');
      lines.push('');
    }

    // Footer
    lines.push('---');
    lines.push('');
    lines.push(
      `*Auto-generated by ${document.metadata.toolName} v${document.metadata.toolVersion}*`
    );

    return lines.join('\n');
  }
}
