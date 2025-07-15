/**
 * Migration Utility for JSON-First TODO System
 * 
 * Helps users transition from markdown-based TODO.md files to the new
 * JSON-first system with backup and validation.
 */

import * as fs from 'fs/promises';
import path from 'path';
import { TodoJsonManager } from './todo-json-manager.js';
import { loadConfig } from './config.js';

export interface MigrationOptions {
  projectPath?: string;
  backupOriginal?: boolean;
  preserveMarkdown?: boolean;
  validateAfterMigration?: boolean;
  dryRun?: boolean;
}

export interface MigrationResult {
  success: boolean;
  migratedTasks: number;
  backupPath?: string;
  errors: string[];
  warnings: string[];
  summary: string;
}

export class TodoMigrationUtility {
  private todoManager: TodoJsonManager;
  private projectPath: string;
  private todoMdPath: string;
  private backupDir: string;

  constructor(projectPath?: string) {
    const config = loadConfig();
    this.projectPath = projectPath || config.projectPath;
    this.todoManager = new TodoJsonManager(this.projectPath);
    this.todoMdPath = path.join(this.projectPath, 'TODO.md');
    this.backupDir = path.join(this.projectPath, '.mcp-adr-cache', 'migration-backups');
  }

  /**
   * Migrate existing TODO.md to JSON format
   */
  async migrateToJsonFormat(options: MigrationOptions = {}): Promise<MigrationResult> {
    const result: MigrationResult = {
      success: false,
      migratedTasks: 0,
      errors: [],
      warnings: [],
      summary: ''
    };

    try {
      // Check if TODO.md exists
      const todoMdExists = await this.fileExists(this.todoMdPath);
      if (!todoMdExists) {
        result.warnings.push('No TODO.md file found - creating fresh JSON structure');
        await this.todoManager.loadTodoData(); // Creates default structure
        result.success = true;
        result.summary = 'Created new JSON TODO structure (no existing TODO.md found)';
        return result;
      }

      // Check if JSON already exists
      const jsonExists = await this.fileExists(path.join(this.projectPath, '.mcp-adr-cache', 'todo-data.json'));
      if (jsonExists && !options.dryRun) {
        result.warnings.push('JSON TODO data already exists - this will merge with existing data');
      }

      // Create backup if requested
      if (options.backupOriginal && !options.dryRun) {
        await this.ensureBackupDirectory();
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const backupPath = path.join(this.backupDir, `TODO-${timestamp}.md`);
        await fs.copyFile(this.todoMdPath, backupPath);
        result.backupPath = backupPath;
      }

      // Read existing TODO.md
      const todoMdContent = await fs.readFile(this.todoMdPath, 'utf-8');
      
      // Parse and validate markdown
      const { parseMarkdownToJson } = await import('./todo-markdown-converter.js');
      const parsedData = await parseMarkdownToJson(todoMdContent);
      
      result.migratedTasks = Object.keys(parsedData.tasks).length;

      if (options.dryRun) {
        result.summary = `Dry run: Would migrate ${result.migratedTasks} tasks to JSON format`;
        result.success = true;
        return result;
      }

      // Save to JSON backend
      await this.todoManager.saveTodoData(parsedData, false); // Don't sync back to markdown yet

      // Validate migration
      if (options.validateAfterMigration) {
        const validationResult = await this.validateMigration(parsedData);
        if (!validationResult.valid) {
          result.errors.push(...validationResult.errors);
          result.warnings.push(...validationResult.warnings);
        }
      }

      // Generate new markdown from JSON to ensure consistency
      if (options.preserveMarkdown) {
        await this.todoManager.convertToMarkdown();
        result.warnings.push('TODO.md has been regenerated from JSON data for consistency');
      }

      result.success = result.errors.length === 0;
      result.summary = `Successfully migrated ${result.migratedTasks} tasks to JSON format`;

    } catch (error) {
      result.errors.push(`Migration failed: ${error instanceof Error ? error.message : String(error)}`);
      result.summary = 'Migration failed - see errors for details';
    }

    return result;
  }

  /**
   * Validate migration results
   */
  private async validateMigration(parsedData: any): Promise<{
    valid: boolean;
    errors: string[];
    warnings: string[];
  }> {
    const validation = { valid: true, errors: [] as string[], warnings: [] as string[] };

    try {
      // Validate JSON structure
      const { TodoJsonDataSchema } = await import('../types/todo-json-schemas.js');
      TodoJsonDataSchema.parse(parsedData);

      // Check for orphaned dependencies
      const taskIds = Object.keys(parsedData.tasks);
      for (const [taskId, task] of Object.entries(parsedData.tasks) as [string, any][]) {
        if (task.dependencies) {
          for (const depId of task.dependencies) {
            if (!taskIds.includes(depId)) {
              validation.warnings.push(`Task ${taskId} has dependency ${depId} which doesn't exist`);
            }
          }
        }
      }

      // Check section integrity
      const sectionTaskIds = parsedData.sections.flatMap((s: any) => s.tasks);
      const orphanedTasks = taskIds.filter(id => !sectionTaskIds.includes(id));
      if (orphanedTasks.length > 0) {
        validation.warnings.push(`${orphanedTasks.length} tasks are not assigned to any section`);
      }

    } catch (error) {
      validation.valid = false;
      validation.errors.push(`Validation failed: ${error instanceof Error ? error.message : String(error)}`);
    }

    return validation;
  }

  /**
   * Create a summary report of existing TODO.md
   */
  async generateMigrationReport(): Promise<string> {
    try {
      const todoMdExists = await this.fileExists(this.todoMdPath);
      if (!todoMdExists) {
        return '# TODO Migration Report\n\n❌ No TODO.md file found in project root.\n\n*Use `manage_todo_json` with `create_task` to start with the new JSON system.*';
      }

      const todoMdContent = await fs.readFile(this.todoMdPath, 'utf-8');
      const lines = todoMdContent.split('\n');
      
      // Basic analysis
      const taskLines = lines.filter(line => line.match(/^- \[(x| )\]/));
      const completedTasks = taskLines.filter(line => line.includes('[x]')).length;
      const pendingTasks = taskLines.filter(line => line.includes('[ ]')).length;
      const totalTasks = taskLines.length;

      // Analyze sections
      const sectionLines = lines.filter(line => line.startsWith('## '));
      const sections = sectionLines.map(line => line.replace('## ', '').trim());

      // Check for potential issues
      const issues = [];
      if (totalTasks === 0) {
        issues.push('No tasks found in TODO.md');
      }
      if (sections.length === 0) {
        issues.push('No sections found - tasks may be unorganized');
      }

      // Check for complex formatting that might be lost
      const hasNestedTasks = lines.some(line => line.match(/^  - \[(x| )\]/));
      const hasMetadata = lines.some(line => line.includes('@') || line.includes('📅'));
      
      if (hasNestedTasks) {
        issues.push('Nested tasks detected - these will be converted to subtasks');
      }
      if (hasMetadata) {
        issues.push('Task metadata detected (assignees, dates) - these will be preserved');
      }

      let report = '# TODO Migration Report\n\n';
      report += `## Current TODO.md Analysis\n\n`;
      report += `- **Total Tasks**: ${totalTasks}\n`;
      report += `- **Completed**: ${completedTasks}\n`;
      report += `- **Pending**: ${pendingTasks}\n`;
      report += `- **Sections**: ${sections.length}\n\n`;

      if (sections.length > 0) {
        report += `### Sections Found:\n`;
        sections.forEach(section => {
          report += `- ${section}\n`;
        });
        report += '\n';
      }

      if (issues.length > 0) {
        report += `### Migration Notes:\n`;
        issues.forEach(issue => {
          report += `- ${issue}\n`;
        });
        report += '\n';
      }

      report += `## Migration Options\n\n`;
      report += `### Recommended Command:\n`;
      report += '```\n';
      report += `manage_todo_json --operation=import_from_markdown --mergeStrategy=merge --backupExisting=true\n`;
      report += '```\n\n';

      report += `### Alternative: Start Fresh\n`;
      report += 'If you prefer to start with a clean JSON system and manually recreate important tasks:\n';
      report += '```\n';
      report += `manage_todo_json --operation=create_task --title="Your first task" --priority=high\n`;
      report += '```\n\n';

      report += `*Run this migration when ready to switch to the new JSON-first TODO system.*`;

      return report;

    } catch (error) {
      return `# TODO Migration Report\n\n❌ Error analyzing TODO.md: ${error instanceof Error ? error.message : String(error)}`;
    }
  }

  /**
   * Generate a comparison between old and new systems
   */
  async generateFeatureComparison(): Promise<string> {
    return `# TODO System Comparison

## Old System (Markdown-based)
- ✅ Human-readable TODO.md file
- ❌ Inconsistent LLM updates
- ❌ Manual task status tracking
- ❌ No automatic scoring integration
- ❌ Limited metadata support
- ❌ No dependency tracking
- ❌ No automation features

## New System (JSON-first)
- ✅ Human-readable TODO.md file (auto-generated)
- ✅ Consistent LLM interactions with structured JSON
- ✅ Automatic task status updates
- ✅ Seamless scoring integration
- ✅ Rich metadata (assignees, due dates, priorities, tags)
- ✅ Full dependency tracking
- ✅ Auto-completion rules
- ✅ Knowledge graph integration
- ✅ Versioning and changelog
- ✅ Velocity tracking and analytics
- ✅ Backup and recovery

## Migration Benefits
1. **Consistency**: No more broken markdown from LLM updates
2. **Automation**: Tasks automatically move between sections
3. **Intelligence**: Smart scoring and progress tracking
4. **Memory**: Full integration with knowledge graph
5. **Analytics**: Velocity tracking and recommendations
6. **Reliability**: Versioning and backup built-in

## Migration Process
1. **Backup**: Original TODO.md is preserved
2. **Parse**: Existing tasks are analyzed and converted
3. **Validate**: Migration integrity is checked
4. **Sync**: New TODO.md is generated from JSON
5. **Test**: Verify all features work correctly

*The new system maintains backward compatibility while adding powerful new features.*`;
  }

  private async fileExists(filePath: string): Promise<boolean> {
    try {
      await fs.access(filePath);
      return true;
    } catch {
      return false;
    }
  }

  private async ensureBackupDirectory(): Promise<void> {
    try {
      await fs.mkdir(this.backupDir, { recursive: true });
    } catch (error) {
      // Directory might already exist
    }
  }
}