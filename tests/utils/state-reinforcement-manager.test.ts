/**
 * Unit tests for State Reinforcement Manager
 * Tests context injection and state reinforcement functionality
 */

import * as fs from 'fs/promises';
import * as path from 'path';
import * as os from 'os';
import { StateReinforcementManager } from '../../src/utils/state-reinforcement-manager.js';
import { KnowledgeGraphManager } from '../../src/utils/knowledge-graph-manager.js';
import type { ContextReinforcementConfig } from '../../src/types/state-reinforcement.js';

describe('StateReinforcementManager', () => {
  let kgManager: KnowledgeGraphManager;
  let srManager: StateReinforcementManager;
  let tempDir: string;

  beforeEach(async () => {
    // Set up environment for testing - use a unique project name for each test
    const projectName = 'test-sr-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9);
    process.env.PROJECT_PATH = path.join(os.tmpdir(), projectName);
    tempDir = path.join(os.tmpdir(), projectName);

    // Initialize managers
    kgManager = new KnowledgeGraphManager();
    srManager = new StateReinforcementManager(kgManager);
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

  describe('constructor', () => {
    it('should initialize with default configuration', () => {
      const config = srManager.getConfig();

      expect(config).toBeDefined();
      expect(config.turnInterval).toBe(5);
      expect(config.tokenThreshold).toBe(3000);
      expect(config.includeKnowledgeGraphContext).toBe(true);
      expect(config.maxRecentIntents).toBe(3);
    });

    it('should accept custom configuration', () => {
      const customConfig: Partial<ContextReinforcementConfig> = {
        turnInterval: 10,
        tokenThreshold: 5000,
        includeKnowledgeGraphContext: false,
        maxRecentIntents: 5,
      };

      const customManager = new StateReinforcementManager(kgManager, customConfig);
      const config = customManager.getConfig();

      expect(config.turnInterval).toBe(10);
      expect(config.tokenThreshold).toBe(5000);
      expect(config.includeKnowledgeGraphContext).toBe(false);
      expect(config.maxRecentIntents).toBe(5);
    });
  });

  describe('turn counter management', () => {
    it('should start at turn 0', () => {
      expect(srManager.getCurrentTurn()).toBe(0);
    });

    it('should increment turn counter', () => {
      const turn1 = srManager.incrementTurn();
      expect(turn1).toBe(1);

      const turn2 = srManager.incrementTurn();
      expect(turn2).toBe(2);

      expect(srManager.getCurrentTurn()).toBe(2);
    });

    it('should reset turn counter', () => {
      srManager.incrementTurn();
      srManager.incrementTurn();
      srManager.incrementTurn();

      expect(srManager.getCurrentTurn()).toBe(3);

      srManager.resetTurnCounter();

      expect(srManager.getCurrentTurn()).toBe(0);
    });
  });

  describe('enrichResponseWithContext', () => {
    it('should not inject context on first few turns', async () => {
      const content = 'Test response content';

      const result = await srManager.enrichResponseWithContext(content);

      expect(result.contextInjected).toBe(false);
      expect(result.enrichedContent).toBe(content);
      expect(result.originalContent).toBe(content);
      expect(result.turnNumber).toBe(1);
    });

    it('should inject context at turn interval', async () => {
      const content = 'Test response content';

      // Advance to turn 5 (default interval)
      for (let i = 0; i < 4; i++) {
        await srManager.enrichResponseWithContext('dummy');
      }

      const result = await srManager.enrichResponseWithContext(content);

      expect(result.contextInjected).toBe(true);
      expect(result.injectionReason).toBe('turn-interval');
      expect(result.turnNumber).toBe(5);
      expect(result.enrichedContent).toContain('Context Reminder');
      expect(result.enrichedContent).toContain(content);
    });

    it('should inject context when token threshold exceeded', async () => {
      // Create content that exceeds default token threshold (3000 tokens = ~12000 chars)
      const content = 'a'.repeat(13000);

      const result = await srManager.enrichResponseWithContext(content);

      expect(result.contextInjected).toBe(true);
      expect(result.injectionReason).toBe('token-threshold');
      expect(result.tokenCount).toBeGreaterThan(3000);
    });

    it('should estimate token count correctly', async () => {
      // Test content with known length
      const content = 'test'.repeat(1000); // 4000 characters

      const result = await srManager.enrichResponseWithContext(content);

      expect(result.tokenCount).toBeGreaterThan(900); // ~1000 tokens
      expect(result.tokenCount).toBeLessThan(1100);
    });

    it('should include knowledge graph context when enabled', async () => {
      // Create some intents in the knowledge graph
      await kgManager.createIntent('Test intent 1', ['Goal 1'], 'high');
      await kgManager.createIntent('Test intent 2', ['Goal 2'], 'medium');

      // Advance to turn interval
      for (let i = 0; i < 4; i++) {
        await srManager.enrichResponseWithContext('dummy');
      }

      const result = await srManager.enrichResponseWithContext('test');

      expect(result.contextInjected).toBe(true);
      expect(result.enrichedContent).toContain('Recent Actions');
      expect(result.enrichedContent).toContain('Test intent');
    });

    it('should not include knowledge graph context when disabled', async () => {
      const customManager = new StateReinforcementManager(kgManager, {
        includeKnowledgeGraphContext: false,
      });

      // Create some intents
      await kgManager.createIntent('Test intent', ['Goal'], 'high');

      // Advance to turn interval
      for (let i = 0; i < 4; i++) {
        await customManager.enrichResponseWithContext('dummy');
      }

      const result = await customManager.enrichResponseWithContext('test');

      expect(result.contextInjected).toBe(true);
      expect(result.enrichedContent).not.toContain('Recent Actions');
    });

    it('should limit recent intents to maxRecentIntents', async () => {
      // Create more intents than the limit
      for (let i = 0; i < 5; i++) {
        await kgManager.createIntent(`Intent ${i}`, ['Goal'], 'medium');
      }

      // Advance to turn interval
      for (let i = 0; i < 4; i++) {
        await srManager.enrichResponseWithContext('dummy');
      }

      const result = await srManager.enrichResponseWithContext('test');

      expect(result.contextInjected).toBe(true);

      // Count occurrences of "Intent" in the enriched content
      const intentMatches = (result.enrichedContent.match(/Intent \d/g) || []).length;
      expect(intentMatches).toBeLessThanOrEqual(3); // maxRecentIntents default is 3
    });

    it('should include objective and principles in context reminder', async () => {
      // Advance to turn interval
      for (let i = 0; i < 4; i++) {
        await srManager.enrichResponseWithContext('dummy');
      }

      const result = await srManager.enrichResponseWithContext('test');

      expect(result.contextInjected).toBe(true);
      expect(result.enrichedContent).toContain('Objective');
      expect(result.enrichedContent).toContain('MCP server');
      expect(result.enrichedContent).toContain('Key Principles');
      expect(result.enrichedContent).toContain('architectural consistency');
    });

    it('should return original content if enrichment fails', async () => {
      // Create a manager with a broken KG manager
      const brokenKgManager = {
        getActiveIntents: vi.fn().mockRejectedValue(new Error('Test error')),
        loadKnowledgeGraph: vi.fn().mockResolvedValue({
          version: '1.0.0',
          timestamp: new Date().toISOString(),
          intents: [],
          analytics: {},
        }),
      } as any;

      const brokenManager = new StateReinforcementManager(brokenKgManager);

      // Advance to turn interval
      for (let i = 0; i < 4; i++) {
        await brokenManager.enrichResponseWithContext('dummy');
      }

      const content = 'test content';
      const result = await brokenManager.enrichResponseWithContext(content);

      // Should inject context but without recent intents (since KG failed)
      expect(result.originalContent).toBe(content);
      expect(result.contextInjected).toBe(true);
      // The enriched content will have context reminder but no recent intents
      expect(result.enrichedContent).toContain('Context Reminder');
    });
  });

  describe('configuration management', () => {
    it('should get current configuration', () => {
      const config = srManager.getConfig();

      expect(config).toBeDefined();
      expect(config.turnInterval).toBeDefined();
      expect(config.tokenThreshold).toBeDefined();
      expect(config.includeKnowledgeGraphContext).toBeDefined();
      expect(config.maxRecentIntents).toBeDefined();
    });

    it('should update configuration', () => {
      srManager.updateConfig({
        turnInterval: 3,
        tokenThreshold: 2000,
      });

      const config = srManager.getConfig();

      expect(config.turnInterval).toBe(3);
      expect(config.tokenThreshold).toBe(2000);
      // Other values should remain unchanged
      expect(config.includeKnowledgeGraphContext).toBe(true);
      expect(config.maxRecentIntents).toBe(3);
    });

    it('should apply updated configuration immediately', async () => {
      srManager.updateConfig({ turnInterval: 2 });

      // Should inject at turn 2 now
      await srManager.enrichResponseWithContext('dummy');
      const result = await srManager.enrichResponseWithContext('test');

      expect(result.contextInjected).toBe(true);
      expect(result.injectionReason).toBe('turn-interval');
      expect(result.turnNumber).toBe(2);
    });

    it('should apply updated token threshold immediately', async () => {
      srManager.updateConfig({ tokenThreshold: 100 });

      // Create content that exceeds new threshold
      const content = 'a'.repeat(500);

      const result = await srManager.enrichResponseWithContext(content);

      expect(result.contextInjected).toBe(true);
      expect(result.injectionReason).toBe('token-threshold');
    });
  });

  describe('context reminder formatting', () => {
    it('should format context reminder with all sections', async () => {
      // Create intents for recent actions (these will be active)
      await kgManager.createIntent('Test intent', ['Goal'], 'high');

      // Advance to turn interval
      for (let i = 0; i < 4; i++) {
        await srManager.enrichResponseWithContext('dummy');
      }

      const result = await srManager.enrichResponseWithContext('test');

      expect(result.enrichedContent).toContain('## 🔄 Context Reminder');
      expect(result.enrichedContent).toContain('**Objective**:');
      expect(result.enrichedContent).toContain('**Key Principles**:');
      // Recent Actions section will only appear if there are active intents
      expect(result.enrichedContent).toContain('**Recent Actions**:');
      expect(result.enrichedContent).toContain('---');
    });

    it('should format recent intents with timestamp and status', async () => {
      // Create an intent and keep it active (don't complete it)
      const intentId = await kgManager.createIntent('Test intent', ['Goal'], 'high');
      await kgManager.updateIntentStatus(intentId, 'executing');

      // Advance to turn interval
      for (let i = 0; i < 4; i++) {
        await srManager.enrichResponseWithContext('dummy');
      }

      const result = await srManager.enrichResponseWithContext('test');

      expect(result.enrichedContent).toContain('Test intent');
      expect(result.enrichedContent).toContain('executing');
    });
  });

  describe('multiple enrichment cycles', () => {
    it('should inject context at each interval', async () => {
      let injectionCount = 0;

      // Run 15 turns (should inject at turns 5, 10, 15)
      for (let i = 0; i < 15; i++) {
        const result = await srManager.enrichResponseWithContext('test');
        if (result.contextInjected) {
          injectionCount++;
        }
      }

      expect(injectionCount).toBe(3);
    });

    it('should maintain turn counter across enrichments', async () => {
      for (let i = 0; i < 7; i++) {
        const result = await srManager.enrichResponseWithContext('test');
        expect(result.turnNumber).toBe(i + 1);
      }
    });

    it('should reset properly and start counting again', async () => {
      // Advance some turns
      for (let i = 0; i < 3; i++) {
        await srManager.enrichResponseWithContext('test');
      }

      srManager.resetTurnCounter();

      const result = await srManager.enrichResponseWithContext('test');
      expect(result.turnNumber).toBe(1);
    });
  });
});
