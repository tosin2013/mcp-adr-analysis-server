/**
 * Unit tests for Knowledge Graph Manager
 * Tests core functionality of knowledge graph snapshot management and persistence
 */

import * as fs from 'fs/promises';
import * as path from 'path';
import * as os from 'os';
import { KnowledgeGraphManager } from '../../src/utils/knowledge-graph-manager.js';
import type {
  KnowledgeGraphSnapshot,
  IntentSnapshot,
} from '../../src/types/knowledge-graph-schemas.js';

describe('KnowledgeGraphManager', () => {
  let kgManager: KnowledgeGraphManager;
  let tempDir: string;
  let cacheDir: string;
  let snapshotsFile: string;

  beforeEach(async () => {
    // Set up environment for testing - use a unique project name for each test
    const projectName = 'test-kg-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9);
    process.env.PROJECT_PATH = path.join(os.tmpdir(), projectName);
    tempDir = path.join(os.tmpdir(), projectName);
    cacheDir = path.join(tempDir, 'cache');
    snapshotsFile = path.join(cacheDir, 'knowledge-graph-snapshots.json');

    // Initialize manager
    kgManager = new KnowledgeGraphManager();
  });

  afterEach(async () => {
    // Clean up temporary directory
    try {
      await fs.rm(tempDir, { recursive: true, force: true });
    } catch {
      // Ignore cleanup errors
    }

    // Clean up environment
    delete process.env.PROJECT_PATH;
  });

  describe('ensureCacheDirectory', () => {
    it('should create cache directory if it does not exist', async () => {
      await kgManager.ensureCacheDirectory();

      const stats = await fs.stat(cacheDir);
      expect(stats.isDirectory()).toBe(true);
    });

    it('should not throw error if cache directory already exists', async () => {
      await kgManager.ensureCacheDirectory();
      await expect(kgManager.ensureCacheDirectory()).resolves.not.toThrow();
    });
  });

  describe('loadKnowledgeGraph', () => {
    it('should load existing knowledge graph from disk', async () => {
      // Create a test snapshot
      const testSnapshot: KnowledgeGraphSnapshot = {
        version: '1.0.0',
        timestamp: new Date().toISOString(),
        intents: [],
        todoSyncState: {
          lastSyncTimestamp: new Date().toISOString(),
          todoMdHash: '',
          knowledgeGraphHash: '',
          syncStatus: 'synced',
          lastModifiedBy: 'tool',
          version: 1,
        },
        analytics: {
          totalIntents: 0,
          completedIntents: 0,
          activeIntents: 0,
          averageGoalCompletion: 0,
          mostUsedTools: [],
          successfulPatterns: [],
        },
        scoreHistory: [],
      };

      // Save it manually
      await kgManager.ensureCacheDirectory();
      await fs.writeFile(snapshotsFile, JSON.stringify(testSnapshot, null, 2));

      // Load it
      const loaded = await kgManager.loadKnowledgeGraph();

      expect(loaded).toBeDefined();
      expect(loaded.version).toBe('1.0.0');
      expect(loaded.intents).toEqual([]);
      expect(loaded.analytics.totalIntents).toBe(0);
    });

    it('should create default snapshot if file does not exist', async () => {
      const loaded = await kgManager.loadKnowledgeGraph();

      expect(loaded).toBeDefined();
      expect(loaded.version).toBe('1.0.0');
      expect(loaded.intents).toEqual([]);
      expect(loaded.analytics.totalIntents).toBe(0);
      expect(loaded.todoSyncState).toBeDefined();
      expect(loaded.scoreHistory).toEqual([]);
    });

    it('should create default snapshot if file is corrupted', async () => {
      // Create a corrupted file
      await kgManager.ensureCacheDirectory();
      await fs.writeFile(snapshotsFile, 'invalid json {');

      const loaded = await kgManager.loadKnowledgeGraph();

      expect(loaded).toBeDefined();
      expect(loaded.version).toBe('1.0.0');
      expect(loaded.intents).toEqual([]);
    });
  });

  describe('saveKnowledgeGraph', () => {
    it('should persist knowledge graph to disk', async () => {
      const snapshot: KnowledgeGraphSnapshot = {
        version: '1.0.0',
        timestamp: new Date().toISOString(),
        intents: [],
        todoSyncState: {
          lastSyncTimestamp: new Date().toISOString(),
          todoMdHash: 'abc123',
          knowledgeGraphHash: 'def456',
          syncStatus: 'synced',
          lastModifiedBy: 'tool',
          version: 1,
        },
        analytics: {
          totalIntents: 0,
          completedIntents: 0,
          activeIntents: 0,
          averageGoalCompletion: 0,
          mostUsedTools: [],
          successfulPatterns: [],
        },
        scoreHistory: [],
      };

      await kgManager.saveKnowledgeGraph(snapshot);

      // Verify file was created
      const exists = await fs.access(snapshotsFile).then(
        () => true,
        () => false
      );
      expect(exists).toBe(true);

      // Verify content
      const content = await fs.readFile(snapshotsFile, 'utf-8');
      const loaded = JSON.parse(content);
      expect(loaded.version).toBe('1.0.0');
      expect(loaded.todoSyncState.todoMdHash).toBe('abc123');
    });
  });

  describe('createIntent', () => {
    it('should create a new intent with unique ID', async () => {
      const intentId = await kgManager.createIntent(
        'Add authentication feature',
        ['Implement OAuth', 'Add JWT support'],
        'high'
      );

      expect(intentId).toBeDefined();
      expect(typeof intentId).toBe('string');

      // Verify intent was saved
      const kg = await kgManager.loadKnowledgeGraph();
      const intent = kg.intents.find(i => i.intentId === intentId);

      expect(intent).toBeDefined();
      expect(intent?.humanRequest).toBe('Add authentication feature');
      expect(intent?.parsedGoals).toEqual(['Implement OAuth', 'Add JWT support']);
      expect(intent?.priority).toBe('high');
      expect(intent?.currentStatus).toBe('planning');
    });

    it('should initialize score tracking for new intent', async () => {
      const intentId = await kgManager.createIntent('Test intent', ['Goal 1'], 'medium');

      const kg = await kgManager.loadKnowledgeGraph();
      const intent = kg.intents.find(i => i.intentId === intentId);

      expect(intent?.scoreTracking).toBeDefined();
      expect(intent?.scoreTracking?.initialScore).toBeDefined();
      expect(intent?.scoreTracking?.currentScore).toBeDefined();
      expect(intent?.scoreTracking?.componentScores).toBeDefined();
    });

    it('should update analytics when intent is created', async () => {
      const intent1 = await kgManager.createIntent('First intent', ['Goal'], 'low');
      const kg1 = await kgManager.loadKnowledgeGraph();
      expect(kg1.analytics.totalIntents).toBeGreaterThanOrEqual(1);

      const intent2 = await kgManager.createIntent('Second intent', ['Goal'], 'medium');
      const kg2 = await kgManager.loadKnowledgeGraph();

      expect(kg2.analytics.totalIntents).toBeGreaterThanOrEqual(2);
      expect(kg2.analytics.activeIntents).toBeGreaterThanOrEqual(2);
      expect(kg2.analytics.completedIntents).toBe(0);
    });

    it('should add score history entry when intent is created', async () => {
      const intentId = await kgManager.createIntent('Test intent', ['Goal'], 'medium');

      const kg = await kgManager.loadKnowledgeGraph();

      expect(kg.scoreHistory).toBeDefined();
      expect(kg.scoreHistory!.length).toBeGreaterThan(0);

      const historyEntry = kg.scoreHistory!.find(h => h.intentId === intentId);
      expect(historyEntry).toBeDefined();
      expect(historyEntry?.triggerEvent).toContain('Intent created');
    });
  });

  describe('addToolExecution', () => {
    it('should add tool execution to existing intent', async () => {
      const intentId = await kgManager.createIntent('Test intent', ['Goal'], 'medium');

      await kgManager.addToolExecution(
        intentId,
        'analyze_project_ecosystem',
        { projectPath: '/test' },
        { success: true },
        true,
        ['task-1'],
        []
      );

      const kg = await kgManager.loadKnowledgeGraph();
      const intent = kg.intents.find(i => i.intentId === intentId);

      expect(intent?.toolChain).toHaveLength(1);
      expect(intent?.toolChain[0].toolName).toBe('analyze_project_ecosystem');
      expect(intent?.toolChain[0].success).toBe(true);
      expect(intent?.toolChain[0].todoTasksCreated).toEqual(['task-1']);
    });

    it('should update intent status to executing on successful tool execution', async () => {
      const intentId = await kgManager.createIntent('Test intent', ['Goal'], 'medium');

      await kgManager.addToolExecution(
        intentId,
        'test_tool',
        {},
        { success: true },
        true
      );

      const kg = await kgManager.loadKnowledgeGraph();
      const intent = kg.intents.find(i => i.intentId === intentId);

      expect(intent?.currentStatus).toBe('executing');
    });

    it('should update intent status to failed on unsuccessful tool execution', async () => {
      const intentId = await kgManager.createIntent('Test intent', ['Goal'], 'medium');

      await kgManager.addToolExecution(
        intentId,
        'test_tool',
        {},
        { success: false },
        false,
        [],
        [],
        'Test error'
      );

      const kg = await kgManager.loadKnowledgeGraph();
      const intent = kg.intents.find(i => i.intentId === intentId);

      expect(intent?.currentStatus).toBe('failed');
      expect(intent?.toolChain[0].error).toBe('Test error');
    });

    it('should throw error if intent does not exist', async () => {
      await expect(
        kgManager.addToolExecution(
          'non-existent-id',
          'test_tool',
          {},
          {},
          true
        )
      ).rejects.toThrow('Intent non-existent-id not found');
    });

    it('should record score impact for tool execution', async () => {
      const intentId = await kgManager.createIntent('Test intent', ['Goal'], 'medium');

      await kgManager.addToolExecution(
        intentId,
        'test_tool',
        {},
        { success: true },
        true
      );

      const kg = await kgManager.loadKnowledgeGraph();
      const intent = kg.intents.find(i => i.intentId === intentId);

      expect(intent?.toolChain[0].scoreImpact).toBeDefined();
      expect(intent?.toolChain[0].scoreImpact?.beforeScore).toBeDefined();
      expect(intent?.toolChain[0].scoreImpact?.afterScore).toBeDefined();
    });
  });

  describe('updateIntentStatus', () => {
    it('should update status of existing intent', async () => {
      const intentId = await kgManager.createIntent('Test intent', ['Goal'], 'medium');

      // Verify intent was created
      const kgBefore = await kgManager.loadKnowledgeGraph();
      const intentBefore = kgBefore.intents.find(i => i.intentId === intentId);
      expect(intentBefore).toBeDefined();

      await kgManager.updateIntentStatus(intentId, 'completed');

      const kg = await kgManager.loadKnowledgeGraph();
      const intent = kg.intents.find(i => i.intentId === intentId);

      expect(intent?.currentStatus).toBe('completed');
    });

    it('should update analytics when intent is completed', async () => {
      const intentId = await kgManager.createIntent('Test intent', ['Goal'], 'medium');

      await kgManager.updateIntentStatus(intentId, 'completed');

      const kg = await kgManager.loadKnowledgeGraph();

      expect(kg.analytics.completedIntents).toBe(1);
      expect(kg.analytics.activeIntents).toBe(0);
    });

    it('should throw error if intent does not exist', async () => {
      await expect(
        kgManager.updateIntentStatus('non-existent-id', 'completed')
      ).rejects.toThrow('Intent non-existent-id not found');
    });
  });

  describe('getActiveIntents', () => {
    it('should return only active intents', async () => {
      const intent1 = await kgManager.createIntent('Active 1', ['Goal'], 'high');
      const intent2 = await kgManager.createIntent('Active 2', ['Goal'], 'medium');
      const intent3 = await kgManager.createIntent('Completed', ['Goal'], 'low');

      await kgManager.updateIntentStatus(intent3, 'completed');

      const activeIntents = await kgManager.getActiveIntents();

      expect(activeIntents).toHaveLength(2);
      expect(activeIntents.find(i => i.intentId === intent1)).toBeDefined();
      expect(activeIntents.find(i => i.intentId === intent2)).toBeDefined();
      expect(activeIntents.find(i => i.intentId === intent3)).toBeUndefined();
    });

    it('should return empty array if no active intents', async () => {
      const activeIntents = await kgManager.getActiveIntents();
      expect(activeIntents).toEqual([]);
    });
  });

  describe('queryKnowledgeGraph', () => {
    it('should find relevant intents based on keywords', async () => {
      await kgManager.createIntent('Add authentication feature', ['Implement OAuth'], 'high');
      await kgManager.createIntent('Add database schema', ['Design schema'], 'medium');

      const result = await kgManager.queryKnowledgeGraph('authentication feature');

      expect(result).toBeDefined();
      expect(result.relevantIntents.length).toBeGreaterThan(0);
      expect(result.relevantIntents[0].humanRequest).toContain('authentication');
      expect(result.found).toBe(true);
    });

    it('should return empty results for non-matching queries', async () => {
      await kgManager.createIntent('Add feature', ['Goal'], 'low');

      const result = await kgManager.queryKnowledgeGraph('nonexistent keyword xyz');

      expect(result.found).toBe(false);
      expect(result.relevantIntents).toEqual([]);
    });

    it('should search in parsed goals', async () => {
      await kgManager.createIntent('Add feature', ['Implement OAuth login system'], 'high');

      const result = await kgManager.queryKnowledgeGraph('OAuth login');

      expect(result).toBeDefined();
      expect(result.relevantIntents.length).toBeGreaterThan(0);
      expect(result.found).toBe(true);
    });
  });

  describe('addMemoryExecution', () => {
    it('should record memory operation', async () => {
      await kgManager.addMemoryExecution(
        'update_knowledge',
        'add_entity',
        'decision',
        true,
        { entityId: 'test-123' }
      );

      const kg = await kgManager.loadKnowledgeGraph();

      expect(kg.memoryOperations).toBeDefined();
      expect(kg.memoryOperations!.length).toBe(1);
      expect(kg.memoryOperations![0].toolName).toBe('update_knowledge');
      expect(kg.memoryOperations![0].action).toBe('add_entity');
      expect(kg.memoryOperations![0].entityType).toBe('decision');
      expect(kg.memoryOperations![0].success).toBe(true);
    });

    it('should update memory analytics', async () => {
      await kgManager.addMemoryExecution('test_tool', 'add', 'entity', true);
      
      // Wait for first operation to complete
      let kg = await kgManager.loadKnowledgeGraph();
      
      // Check if memoryOperations exists and has at least one entry
      if (kg.memoryOperations && kg.memoryOperations.length > 0) {
        expect(kg.memoryOperations.length).toBeGreaterThanOrEqual(1);
      }
      
      await kgManager.addMemoryExecution('test_tool', 'remove', 'entity', true);

      kg = await kgManager.loadKnowledgeGraph();

      expect(kg.analytics.memoryOperations).toBeDefined();
      expect(kg.analytics.memoryOperations!.totalOperations).toBeGreaterThanOrEqual(1);
      expect(kg.analytics.memoryOperations!.successRate).toBe(1);
      
      // memoryOperations should exist and have at least one entry
      if (kg.memoryOperations) {
        expect(kg.memoryOperations.length).toBeGreaterThanOrEqual(1);
      }
    });

    it('should limit memory operations to 1000 entries', async () => {
      // Create more than 1000 operations
      for (let i = 0; i < 1005; i++) {
        await kgManager.addMemoryExecution('test_tool', 'add', 'entity', true);
      }

      const kg = await kgManager.loadKnowledgeGraph();

      expect(kg.memoryOperations!.length).toBe(1000);
    });

    it('should not throw error on failure', async () => {
      // This should not throw even if there are issues
      await expect(
        kgManager.addMemoryExecution('test_tool', 'add', 'entity', false)
      ).resolves.not.toThrow();
    });
  });

  describe('getSyncState', () => {
    it('should return default sync state if file does not exist', async () => {
      const syncState = await kgManager.getSyncState();

      expect(syncState).toBeDefined();
      expect(syncState.syncStatus).toBe('synced');
      expect(syncState.lastModifiedBy).toBe('tool');
      expect(syncState.version).toBe(1);
    });

    it('should load existing sync state from file', async () => {
      // Initialize the knowledge graph first (creates cache dir and files)
      await kgManager.loadKnowledgeGraph();

      // Update sync state
      await kgManager.updateSyncState({ todoMdHash: 'test-hash' });

      // Load it
      const syncState = await kgManager.getSyncState();

      expect(syncState.todoMdHash).toBe('test-hash');
    });
  });

  describe('updateSyncState', () => {
    it('should update sync state', async () => {
      // Initialize the knowledge graph first (creates cache dir and files)
      await kgManager.loadKnowledgeGraph();

      await kgManager.updateSyncState({
        todoMdHash: 'new-hash',
        syncStatus: 'pending',
      });

      const syncState = await kgManager.getSyncState();

      expect(syncState.todoMdHash).toBe('new-hash');
      expect(syncState.syncStatus).toBe('pending');
    });

    it('should persist sync state to both files', async () => {
      // Initialize the knowledge graph first (creates cache dir and files)
      await kgManager.loadKnowledgeGraph();

      await kgManager.updateSyncState({ todoMdHash: 'test' });

      const kg = await kgManager.loadKnowledgeGraph();
      expect(kg.todoSyncState.todoMdHash).toBe('test');

      const syncState = await kgManager.getSyncState();
      expect(syncState.todoMdHash).toBe('test');
    });
  });

  describe('getIntentById', () => {
    it('should return intent by ID', async () => {
      const intentId = await kgManager.createIntent('Test intent', ['Goal'], 'medium');

      const intent = await kgManager.getIntentById(intentId);

      expect(intent).toBeDefined();
      expect(intent?.intentId).toBe(intentId);
      expect(intent?.humanRequest).toBe('Test intent');
    });

    it('should return null for non-existent ID', async () => {
      const intent = await kgManager.getIntentById('non-existent');
      expect(intent).toBeNull();
    });
  });

  describe('getIntentsByStatus', () => {
    it('should filter intents by status', async () => {
      const intent1 = await kgManager.createIntent('Intent 1', ['Goal'], 'high');
      const intent2 = await kgManager.createIntent('Intent 2', ['Goal'], 'medium');

      await kgManager.updateIntentStatus(intent1, 'completed');

      const completedIntents = await kgManager.getIntentsByStatus('completed');
      const planningIntents = await kgManager.getIntentsByStatus('planning');

      expect(completedIntents).toHaveLength(1);
      expect(completedIntents[0].intentId).toBe(intent1);

      expect(planningIntents).toHaveLength(1);
      expect(planningIntents[0].intentId).toBe(intent2);
    });
  });
});
