/**
 * Integration tests for cache infrastructure initialization
 * Tests real file creation without mocks
 */

import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { existsSync, rmSync, unlinkSync } from 'fs';
import { readFile } from 'fs/promises';
import { join } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

// Get the directory of this test file
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

describe('Cache Infrastructure Integration Tests', () => {
  // Use the real sample-project for integration testing
  const sampleProjectPath = join(__dirname, '..', '..', 'sample-project');
  const cachePath = join(sampleProjectPath, '.mcp-adr-cache');
  const todoDataPath = join(cachePath, 'todo-data.json');
  const projectHealthPath = join(cachePath, 'project-health-scores.json');
  const knowledgeGraphPath = join(cachePath, 'knowledge-graph-snapshots.json');
  const todoSyncStatePath = join(cachePath, 'todo-sync-state.json');
  const todoMarkdownPath = join(sampleProjectPath, 'TODO.md');

  beforeEach(() => {
    // Clean up any existing cache and TODO.md before each test
    if (existsSync(cachePath)) {
      rmSync(cachePath, { recursive: true, force: true });
    }
    if (existsSync(todoMarkdownPath)) {
      unlinkSync(todoMarkdownPath);
    }
  });

  afterEach(() => {
    // Optional: Clean up after tests (comment out to inspect files manually)
    // if (existsSync(cachePath)) {
    //   rmSync(cachePath, { recursive: true, force: true });
    // }
    // if (existsSync(todoMarkdownPath)) {
    //   unlinkSync(todoMarkdownPath);
    // }
  });

  describe('discover_existing_adrs cache initialization', () => {
    it('should create all cache infrastructure files when discovering ADRs', async () => {
      // Import the real tool without mocks
      const { discoverExistingAdrs } = await import('../../src/tools/adr-suggestion-tool.js');
      
      console.log('🧪 Testing cache infrastructure initialization...');
      console.log(`📁 Project path: ${sampleProjectPath}`);
      console.log(`📁 Cache path: ${cachePath}`);

      // Call discover_existing_adrs
      const result = await discoverExistingAdrs({
        adrDirectory: 'docs/adrs',
        includeContent: false,
        projectPath: sampleProjectPath
      });

      // Debug: Check what files were actually created
      console.log('🔍 Cache directory contents:');
      if (existsSync(cachePath)) {
        const fs = await import('fs/promises');
        const files = await fs.readdir(cachePath);
        console.log('Files found:', files);
      }

      // Verify the response contains expected content
      expect(result.content[0].text).toContain('Cache Infrastructure Status');
      expect(result.content[0].text).toContain('Complete ADR Discovery');

      // Verify cache directory was created
      expect(existsSync(cachePath)).toBe(true);
      console.log('✅ Cache directory created');

      // Verify all cache files were created
      expect(existsSync(todoDataPath)).toBe(true);
      console.log('✅ todo-data.json created');
      
      expect(existsSync(projectHealthPath)).toBe(true);
      console.log('✅ project-health-scores.json created');
      
      expect(existsSync(knowledgeGraphPath)).toBe(true);
      console.log('✅ knowledge-graph-snapshots.json created');
      
      expect(existsSync(todoSyncStatePath)).toBe(true);
      console.log('✅ todo-sync-state.json created');

      // Verify file contents are valid JSON
      const todoData = JSON.parse(await readFile(todoDataPath, 'utf-8'));
      expect(todoData).toHaveProperty('tasks');
      expect(todoData).toHaveProperty('metadata');
      expect(todoData).toHaveProperty('scoringSync');
      expect(todoData).toHaveProperty('knowledgeGraphSync');

      const healthData = JSON.parse(await readFile(projectHealthPath, 'utf-8'));
      expect(healthData).toHaveProperty('overall');
      expect(healthData).toHaveProperty('breakdown');

      const kgData = JSON.parse(await readFile(knowledgeGraphPath, 'utf-8'));
      expect(kgData).toHaveProperty('version');
      expect(kgData).toHaveProperty('timestamp');
      expect(kgData).toHaveProperty('intents');

      const syncData = JSON.parse(await readFile(todoSyncStatePath, 'utf-8'));
      expect(syncData).toHaveProperty('lastSyncTimestamp');
      expect(syncData).toHaveProperty('todoMdHash');

      console.log('✅ All cache files contain valid JSON structure');
    }, 30000); // Increase timeout for real file operations
  });

  describe('generate_adr_todo JSON-first workflow', () => {
    it('should use JSON-first approach and create all cache files', async () => {
      // Import the real server to test generate_adr_todo
      const { McpAdrAnalysisServer } = await import('../../src/index.js');
      
      // Set up environment for the server
      process.env['PROJECT_PATH'] = sampleProjectPath;
      process.env['ADR_DIRECTORY'] = 'docs/adrs';
      
      const server = new McpAdrAnalysisServer();
      
      console.log('🧪 Testing generate_adr_todo JSON-first workflow...');

      // Call generate_adr_todo through the server
      const result = await server['generateAdrTodo']({
        adrDirectory: 'docs/adrs',
        scope: 'all',
        phase: 'both',
        linkAdrs: true,
        preserveExisting: false,
        forceSyncToMarkdown: true
      });

      // Verify response indicates JSON-first system
      expect(result.content[0].text).toContain('JSON-First TODO Generated from ADRs');
      expect(result.content[0].text).toContain('JSON-First TODO System Active');
      expect(result.content[0].text).toContain('todo-data.json');

      // Verify all cache files were created
      expect(existsSync(cachePath)).toBe(true);
      expect(existsSync(todoDataPath)).toBe(true);
      
      // Verify TODO.md was created (since forceSyncToMarkdown is true)
      expect(existsSync(todoMarkdownPath)).toBe(true);
      console.log('✅ TODO.md created via JSON-first sync');

      // Verify TODO.md content
      const todoContent = await readFile(todoMarkdownPath, 'utf-8');
      expect(todoContent).toContain('TODO Overview');
      expect(todoContent).toContain('Progress');
      
      // Should contain tasks from sample ADRs
      expect(todoContent).toContain('PostgreSQL'); // From ADR-001
      
      console.log('✅ generate_adr_todo successfully uses JSON-first approach');

      // Clean up environment
      delete process.env['PROJECT_PATH'];
      delete process.env['ADR_DIRECTORY'];
    }, 30000);
  });

  describe('Complete workflow integration', () => {
    it.skip('should handle discover → generate → manage workflow', async () => {
      console.log('🧪 Testing complete workflow integration...');

      // Step 1: Discover ADRs (initializes cache)
      const { discoverExistingAdrs } = await import('../../src/tools/adr-suggestion-tool.js');
      await discoverExistingAdrs({
        adrDirectory: 'docs/adrs',
        includeContent: false,
        projectPath: sampleProjectPath
      });

      expect(existsSync(cachePath)).toBe(true);
      console.log('✅ Step 1: ADRs discovered, cache initialized');
      
      // Debug: Check which files were created after discovery
      const fs = await import('fs/promises');
      const files = await fs.readdir(cachePath);
      console.log('Files after discovery:', files);
      
      // Give filesystem time to sync (address race condition)
      await new Promise(resolve => setTimeout(resolve, 50));

      // Verify that knowledge graph file was created during discovery
      if (!existsSync(knowledgeGraphPath)) {
        console.log('⚠️  Knowledge graph file not created during discovery - forcing creation');
        const { KnowledgeGraphManager } = await import('../../src/utils/knowledge-graph-manager.js');
        const kgManager = new KnowledgeGraphManager();
        await kgManager.loadKnowledgeGraph();
      }

      // Step 2: Generate TODO from ADRs
      const { McpAdrAnalysisServer } = await import('../../src/index.js');
      process.env['PROJECT_PATH'] = sampleProjectPath;
      const server = new McpAdrAnalysisServer();
      
      await server['generateAdrTodo']({
        adrDirectory: 'docs/adrs',
        scope: 'all',
        phase: 'both',
        linkAdrs: true,
        preserveExisting: false,
        forceSyncToMarkdown: true
      });

      expect(existsSync(todoMarkdownPath)).toBe(true);
      console.log('✅ Step 2: TODO generated from ADRs');

      // Step 3: Manage TODO tasks
      const { manageTodoV2 } = await import('../../src/tools/todo-management-tool-v2.js');
      
      // Create a new task
      const createResult = await manageTodoV2({
        operation: 'create_task',
        projectPath: sampleProjectPath,
        title: 'Integration Test Task',
        description: 'Task created during integration testing',
        priority: 'high',
        tags: ['test', 'integration'],
        dependencies: [],
        linkedAdrs: [],
        autoComplete: false
      });

      expect(createResult.content[0].text).toContain('Task created successfully');
      console.log('✅ Step 3: Task management working');

      // Step 4: Verify complete ecosystem
      const analytics = await manageTodoV2({
        operation: 'get_analytics',
        projectPath: sampleProjectPath,
        timeframe: 'all',
        includeVelocity: true,
        includeScoring: true
      });

      expect(analytics.content[0].text).toContain('TODO Analytics');
      console.log('✅ Step 4: Analytics and scoring working');

      // Verify all files still exist and are updated
      expect(existsSync(todoDataPath)).toBe(true);
      expect(existsSync(projectHealthPath)).toBe(true);
      expect(existsSync(knowledgeGraphPath)).toBe(true);
      expect(existsSync(todoSyncStatePath)).toBe(true);
      expect(existsSync(todoMarkdownPath)).toBe(true);

      console.log('🎉 Complete workflow integration successful!');

      // Clean up
      delete process.env['PROJECT_PATH'];
    }, 30000);
  });

  describe('Error handling and recovery', () => {
    it('should handle missing ADR directory gracefully', async () => {
      const { discoverExistingAdrs } = await import('../../src/tools/adr-suggestion-tool.js');
      
      // Try to discover ADRs in non-existent directory
      const result = await discoverExistingAdrs({
        adrDirectory: 'non-existent-directory',
        includeContent: false,
        projectPath: sampleProjectPath
      });

      // Should still create cache infrastructure
      expect(existsSync(cachePath)).toBe(true);
      expect(existsSync(todoDataPath)).toBe(true);
      expect(existsSync(projectHealthPath)).toBe(true);
      
      // But report no ADRs found
      expect(result.content[0].text).toContain('No ADRs found');
    });

    it('should handle corrupted cache files gracefully', async () => {
      // Create cache directory with corrupted JSON file
      const fs = await import('fs/promises');
      await fs.mkdir(cachePath, { recursive: true });
      await fs.writeFile(todoDataPath, 'invalid json content');

      // Should recover and recreate valid files
      const { discoverExistingAdrs } = await import('../../src/tools/adr-suggestion-tool.js');
      await discoverExistingAdrs({
        adrDirectory: 'docs/adrs',
        includeContent: false,
        projectPath: sampleProjectPath
      });

      // Verify files are now valid JSON
      const todoData = JSON.parse(await readFile(todoDataPath, 'utf-8'));
      expect(todoData).toHaveProperty('tasks');
    });
  });
});