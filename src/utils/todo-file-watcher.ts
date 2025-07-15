import * as fs from 'fs/promises';
import path from 'path';
import { KnowledgeGraphManager } from './knowledge-graph-manager.js';
import { loadConfig } from './config.js';

export class TodoFileWatcher {
  private kgManager: KnowledgeGraphManager;
  private todoPath: string;
  private watcherActive: boolean = false;
  private lastKnownHash: string = '';
  private pollInterval: NodeJS.Timeout | null = null;

  constructor(todoPath?: string) {
    this.kgManager = new KnowledgeGraphManager();
    const config = loadConfig();
    this.todoPath = todoPath || path.join(config.projectPath, 'TODO.md');
  }

  async startWatching(intervalMs: number = 2000): Promise<void> {
    if (this.watcherActive) {
      return;
    }

    this.watcherActive = true;
    
    // Initialize with current hash
    this.lastKnownHash = await this.kgManager.calculateTodoMdHash(this.todoPath);
    
    // Start polling for changes
    this.pollInterval = setInterval(async () => {
      try {
        await this.checkForChanges();
      } catch (error) {
        console.error('Error checking TODO.md changes:', error);
      }
    }, intervalMs);

    console.error(`[TodoFileWatcher] Started watching ${this.todoPath}`);
  }

  async stopWatching(): Promise<void> {
    if (!this.watcherActive) {
      return;
    }

    this.watcherActive = false;
    
    if (this.pollInterval) {
      clearInterval(this.pollInterval);
      this.pollInterval = null;
    }

    console.error(`[TodoFileWatcher] Stopped watching ${this.todoPath}`);
  }

  private async checkForChanges(): Promise<void> {
    if (!this.watcherActive) {
      return;
    }

    const detection = await this.kgManager.detectTodoChanges(this.todoPath);
    
    if (detection.hasChanges) {
      console.error(`[TodoFileWatcher] TODO.md changes detected`);
      
      // Read the new content
      let todoContent = '';
      try {
        todoContent = await fs.readFile(this.todoPath, 'utf-8');
      } catch (error) {
        console.error(`[TodoFileWatcher] Error reading TODO.md:`, error);
        return;
      }

      // Parse changes and extract task modifications
      const changes = await this.parseChanges(this.lastKnownHash, detection.currentHash, todoContent);
      
      // Update sync state
      await this.kgManager.updateSyncState({
        lastSyncTimestamp: new Date().toISOString(),
        todoMdHash: detection.currentHash,
        syncStatus: changes.length > 0 ? 'pending' : 'synced',
        lastModifiedBy: 'human',
        version: (await this.kgManager.getSyncState()).version + 1
      });

      // Notify active intents about TODO changes
      await this.notifyActiveIntents(todoContent, changes);
      
      this.lastKnownHash = detection.currentHash;
    }
  }

  private async parseChanges(
    oldHash: string, 
    newHash: string, 
    todoContent: string
  ): Promise<Array<{
    type: 'added' | 'modified' | 'removed' | 'status_changed';
    taskId: string;
    description: string;
    details: Record<string, any>;
  }>> {
    const changes: Array<{
      type: 'added' | 'modified' | 'removed' | 'status_changed';
      taskId: string;
      description: string;
      details: Record<string, any>;
    }> = [];

    // Simple change detection by analyzing the TODO content
    // In a more sophisticated implementation, this would diff the actual content
    const lines = todoContent.split('\n');
    const taskLines = lines.filter(line => 
      line.trim().match(/^-\s*\[[\sx]\]/) || 
      line.trim().match(/^\d+\.\s*\[[\sx]\]/) ||
      line.trim().match(/^##\s+/) // Section headers
    );

    // For now, we'll create a generic change record
    if (oldHash !== newHash && taskLines.length > 0) {
      changes.push({
        type: 'modified',
        taskId: `todo-change-${Date.now()}`,
        description: 'TODO.md content modified externally',
        details: {
          taskCount: taskLines.length,
          timestamp: new Date().toISOString(),
          contentLength: todoContent.length
        }
      });
    }

    return changes;
  }

  private async notifyActiveIntents(
    todoContent: string, 
    changes: Array<{
      type: 'added' | 'modified' | 'removed' | 'status_changed';
      taskId: string;
      description: string;
      details: Record<string, any>;
    }>
  ): Promise<void> {
    const activeIntents = await this.kgManager.getActiveIntents();
    
    for (const intent of activeIntents) {
      // Update TODO snapshot for each active intent
      await this.kgManager.updateTodoSnapshot(intent.intentId, todoContent);
      
      // Add a tool execution record for the TODO change
      const changeDetails = changes.map(c => `${c.type}: ${c.description}`).join('; ');
      
      await this.kgManager.addToolExecution(
        intent.intentId,
        'todo_file_watcher_change_detected',
        { todoPath: this.todoPath },
        { 
          changes: changes.length,
          changeDetails,
          todoContentLength: todoContent.length,
          detectedAt: new Date().toISOString()
        },
        true,
        [],
        changes.map(c => c.taskId),
        undefined
      );
    }
  }

  async manualSync(): Promise<{
    changesDetected: boolean;
    syncStatus: string;
    activeIntentsNotified: number;
  }> {
    const detection = await this.kgManager.detectTodoChanges(this.todoPath);
    
    if (!detection.hasChanges) {
      return {
        changesDetected: false,
        syncStatus: 'no_changes',
        activeIntentsNotified: 0
      };
    }

    let todoContent = '';
    try {
      todoContent = await fs.readFile(this.todoPath, 'utf-8');
    } catch (error) {
      return {
        changesDetected: true,
        syncStatus: 'error_reading_file',
        activeIntentsNotified: 0
      };
    }

    const changes = await this.parseChanges(this.lastKnownHash, detection.currentHash, todoContent);
    await this.notifyActiveIntents(todoContent, changes);
    
    await this.kgManager.updateSyncState({
      lastSyncTimestamp: new Date().toISOString(),
      todoMdHash: detection.currentHash,
      syncStatus: 'synced',
      lastModifiedBy: 'sync',
      version: (await this.kgManager.getSyncState()).version + 1
    });

    this.lastKnownHash = detection.currentHash;
    
    const activeIntents = await this.kgManager.getActiveIntents();
    
    return {
      changesDetected: true,
      syncStatus: 'synced',
      activeIntentsNotified: activeIntents.length
    };
  }

  async getWatcherStatus(): Promise<{
    isActive: boolean;
    todoPath: string;
    lastKnownHash: string;
    lastSyncTime: string;
    syncStatus: string;
  }> {
    const syncState = await this.kgManager.getSyncState();
    
    return {
      isActive: this.watcherActive,
      todoPath: this.todoPath,
      lastKnownHash: this.lastKnownHash,
      lastSyncTime: syncState.lastSyncTimestamp,
      syncStatus: syncState.syncStatus
    };
  }


}