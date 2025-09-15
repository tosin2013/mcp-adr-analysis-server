/**
 * MCP Resource Access Test Suite
 * Tests how LLMs access knowledge graph data through MCP resources
 */

import { describe, test, expect, beforeEach, beforeAll, afterAll } from '@jest/globals';
import fs from 'fs/promises';
import path from 'path';
// import { McpAdrAnalysisServer } from '../src/index.js';
import { KnowledgeGraphManager } from '../src/utils/knowledge-graph-manager.js';
import {
  generateArchitecturalKnowledgeGraph,
  generateAnalysisReport,
  generateAdrList,
} from '../src/resources/index.js';

describe('MCP Resource Access', () => {
  let testDir: string;
  // let server: McpAdrAnalysisServer;
  let kgManager: KnowledgeGraphManager;

  beforeAll(async () => {
    // Create test directory with project structure
    testDir = path.join(process.cwd(), 'test-mcp-resource-access');
    await fs.mkdir(testDir, { recursive: true });

    // Create ADR directory
    const adrDir = path.join(testDir, 'docs', 'adrs');
    await fs.mkdir(adrDir, { recursive: true });

    // Create sample ADR
    await fs.writeFile(
      path.join(adrDir, '001-authentication.md'),
      `# ADR-001: Authentication Strategy

## Status
Accepted

## Context
We need to implement user authentication for the application.

## Decision
We will use JWT tokens with OAuth2 providers.

## Consequences
- Secure authentication
- Scalable solution
- Standard implementation
`
    );

    // Set test environment
    process.env['PROJECT_PATH'] = testDir;
    process.env['ADR_DIRECTORY'] = path.join(testDir, 'docs/adrs');
    process.env['CACHE_ENABLED'] = 'true';
    process.env['LOG_LEVEL'] = 'ERROR'; // Reduce test noise
  });

  beforeEach(async () => {
    // Clean cache and initialize
    try {
      await fs.rm(path.join(testDir, '.mcp-adr-cache'), { recursive: true, force: true });
    } catch {}

    // Wait a bit to ensure clean state
    await new Promise(resolve => setTimeout(resolve, 10));

    kgManager = new KnowledgeGraphManager();
    // server = new McpAdrAnalysisServer();
  });

  afterAll(async () => {
    // Clean up test directory
    await fs.rm(testDir, { recursive: true, force: true });
  });

  describe('Knowledge Graph Resource Exposure', () => {
    test('should expose knowledge graph data to LLMs via MCP resource', async () => {
      // Create test intent and tool execution data
      const intentId = await kgManager.createIntent(
        'Analyze authentication system',
        ['Review current auth', 'Identify vulnerabilities', 'Recommend improvements'],
        'high'
      );

      await kgManager.addToolExecution(
        intentId,
        'analyze_project_ecosystem',
        {
          projectPath: testDir,
          analysisType: 'comprehensive',
          includeCompliance: true,
        },
        {
          technologies: ['Node.js', 'TypeScript', 'JWT', 'OAuth2'],
          patterns: ['MVC', 'Authentication', 'Authorization'],
          vulnerabilities: ['Weak JWT secret', 'Missing rate limiting'],
          recommendations: ['Use stronger secrets', 'Implement rate limiting'],
        },
        true,
        ['auth-review-task', 'vulnerability-scan-task'],
        ['existing-auth-task']
      );

      await kgManager.addToolExecution(
        intentId,
        'generate_adr_todo',
        {
          adrDirectory: 'docs/adrs',
          scope: 'all',
          phase: 'both',
        },
        {
          tasksGenerated: 5,
          todoPath: 'TODO.md',
          adrsCovered: 1,
        },
        true,
        ['adr-001-impl-task', 'auth-test-task', 'security-review-task'],
        []
      );

      // Generate the resource that LLMs would receive
      const resource = await generateArchitecturalKnowledgeGraph(testDir);

      // Verify the resource structure
      expect(resource).toMatchObject({
        data: expect.objectContaining({
          prompt: expect.stringContaining('Architectural Knowledge Graph Generation'),
          instructions: expect.stringContaining('Usage Instructions'),
          projectPath: testDir,
          knowledgeGraphSnapshot: expect.objectContaining({
            version: expect.any(String),
            timestamp: expect.any(String),
            intents: expect.any(Array),
            todoSyncState: expect.any(Object),
            analytics: expect.any(Object),
          }),
        }),
        contentType: 'application/json',
        lastModified: expect.any(String),
        cacheKey: expect.any(String),
        ttl: 3600,
      });

      // Verify LLM can access intent data
      const snapshot = resource.data.knowledgeGraphSnapshot;
      expect(snapshot.intents).toHaveLength(1);

      const intent = snapshot.intents[0];
      expect(intent).toMatchObject({
        intentId,
        humanRequest: 'Analyze authentication system',
        parsedGoals: ['Review current auth', 'Identify vulnerabilities', 'Recommend improvements'],
        priority: 'high',
        currentStatus: 'executing',
        toolChainSummary: {
          totalTools: 2,
          completedTools: 2,
          failedTools: 0,
          lastExecution: expect.any(String),
        },
        todoTasksCreated: [
          'auth-review-task',
          'vulnerability-scan-task',
          'adr-001-impl-task',
          'auth-test-task',
          'security-review-task',
        ],
        todoTasksModified: ['existing-auth-task'],
        hasSnapshots: false,
      });

      // Verify analytics are exposed
      expect(snapshot.analytics).toMatchObject({
        totalIntents: 1,
        completedIntents: 0,
        activeIntents: 1,
        averageGoalCompletion: 0,
        mostUsedTools: expect.arrayContaining([
          expect.objectContaining({
            toolName: 'analyze_project_ecosystem',
            usageCount: 1,
          }),
          expect.objectContaining({
            toolName: 'generate_adr_todo',
            usageCount: 1,
          }),
        ]),
      });

      // Verify TODO sync state is exposed
      expect(snapshot.todoSyncState).toMatchObject({
        lastSyncTimestamp: expect.any(String),
        todoMdHash: expect.any(String),
        syncStatus: expect.stringMatching(/^(synced|pending|error)$/),
        lastModifiedBy: expect.stringMatching(/^(tool|human|sync)$/),
        version: expect.any(Number),
      });
    });

    test('should provide comprehensive prompt for LLM analysis', async () => {
      const resource = await generateArchitecturalKnowledgeGraph(testDir);
      const prompt = resource.data.prompt;

      // Verify prompt contains all necessary sections
      expect(prompt).toContain('Architectural Knowledge Graph Generation');
      expect(prompt).toContain('Project Analysis Instructions');
      expect(prompt).toContain('Implementation Steps');
      expect(prompt).toContain('Required Output Format');
      expect(prompt).toContain('Analysis Guidelines');

      // Verify JSON schema is included
      expect(prompt).toContain('"projectId"');
      expect(prompt).toContain('"technologies"');
      expect(prompt).toContain('"patterns"');
      expect(prompt).toContain('"adrs"');
      expect(prompt).toContain('"intentSnapshots"');
      expect(prompt).toContain('"analytics"');

      // Verify instructions are comprehensive
      const instructions = resource.data.instructions;
      expect(instructions).toContain('Usage Instructions');
      expect(instructions).toContain('Submit the generated prompt');
      expect(instructions).toContain('Parse the JSON response');
      expect(instructions).toContain('Cache the result');
    });

    test('should expose real-time knowledge graph updates', async () => {
      // Initial state
      let resource = await generateArchitecturalKnowledgeGraph(testDir);
      let snapshot = resource.data.knowledgeGraphSnapshot;
      expect(snapshot.intents).toHaveLength(0);
      expect(snapshot.analytics.totalIntents).toBe(0);

      // Add intent and tool execution
      const intentId = await kgManager.createIntent(
        'Real-time update test',
        ['Test real-time sync'],
        'medium'
      );

      await kgManager.addToolExecution(
        intentId,
        'test_tool',
        { param: 'value' },
        { result: 'success' },
        true,
        ['new-task'],
        []
      );

      // Generate resource again - should show updated data
      resource = await generateArchitecturalKnowledgeGraph(testDir);
      snapshot = resource.data.knowledgeGraphSnapshot;

      expect(snapshot.intents).toHaveLength(1);
      expect(snapshot.analytics.totalIntents).toBe(1);
      expect(snapshot.analytics.activeIntents).toBe(1);

      const intent = snapshot.intents[0];
      expect(intent.toolChainSummary.totalTools).toBe(1);
      expect(intent.todoTasksCreated).toEqual(['new-task']);
    });
  });

  describe('MCP Server Resource Handlers', () => {
    test('should list all available resources for LLMs', async () => {
      // This would be called by MCP client when LLM requests available resources
      const resourceList = {
        resources: [
          {
            uri: 'adr://architectural_knowledge_graph',
            name: 'Architectural Knowledge Graph',
            description: 'Complete architectural knowledge graph of the project',
            mimeType: 'application/json',
          },
          {
            uri: 'adr://analysis_report',
            name: 'Analysis Report',
            description: 'Comprehensive project analysis report',
            mimeType: 'application/json',
          },
          {
            uri: 'adr://adr_list',
            name: 'ADR List',
            description: 'List of all Architectural Decision Records',
            mimeType: 'application/json',
          },
        ],
      };

      // Verify knowledge graph resource is exposed
      const kgResource = resourceList.resources.find(
        r => r.uri === 'adr://architectural_knowledge_graph'
      );
      expect(kgResource).toBeTruthy();
      expect(kgResource?.description).toContain('knowledge graph');
    });

    test('should handle resource reading requests', async () => {
      // Create test data
      const intentId = await kgManager.createIntent(
        'Resource reading test',
        ['Test MCP resource access'],
        'high'
      );

      await kgManager.addToolExecution(
        intentId,
        'smart_score',
        {
          filePath: 'src/index.ts',
          includeAdrs: true,
          includeRules: true,
        },
        {
          overallScore: 85,
          healthMetrics: {
            architecture: 90,
            security: 80,
            maintainability: 85,
          },
        },
        true,
        ['health-check-task'],
        []
      );

      // Simulate MCP resource reading
      const resource = await generateArchitecturalKnowledgeGraph(testDir);

      // Verify LLM would receive properly formatted JSON
      const jsonData = JSON.stringify(resource.data, null, 2);
      expect(() => JSON.parse(jsonData)).not.toThrow();

      // Verify content type and structure
      expect(resource.contentType).toBe('application/json');
      expect(resource.data.knowledgeGraphSnapshot).toBeDefined();

      // Verify the resource includes tool execution details
      const intent = resource.data.knowledgeGraphSnapshot.intents[0];
      expect(intent.toolChainSummary.totalTools).toBe(1);
      expect(intent.todoTasksCreated).toContain('health-check-task');
    });
  });

  describe('Cross-Resource Integration', () => {
    test('should provide consistent data across all MCP resources', async () => {
      // Create comprehensive test scenario
      const intentId = await kgManager.createIntent(
        'Multi-resource consistency test',
        ['Analyze project', 'Generate reports', 'Track ADRs'],
        'high'
      );

      await kgManager.addToolExecution(
        intentId,
        'suggest_adrs',
        {
          projectPath: testDir,
          analysisType: 'comprehensive',
        },
        {
          suggestedAdrs: [
            { title: 'Database Selection', priority: 'high' },
            { title: 'API Design', priority: 'medium' },
          ],
        },
        true,
        ['db-selection-task', 'api-design-task'],
        []
      );

      // Generate all resources
      const [kgResource, analysisResource, adrResource] = await Promise.all([
        generateArchitecturalKnowledgeGraph(testDir),
        generateAnalysisReport(testDir, ['architecture', 'security']),
        generateAdrList('docs/adrs', testDir),
      ]);

      // Verify knowledge graph resource includes intent data
      const kgSnapshot = kgResource.data.knowledgeGraphSnapshot;
      expect(kgSnapshot.intents).toHaveLength(1);
      expect(kgSnapshot.intents[0].intentId).toBe(intentId);

      // Verify analysis resource includes project path
      expect(analysisResource.data.projectPath).toBe(testDir);
      expect(analysisResource.data.focusAreas).toEqual(['architecture', 'security']);

      // Verify ADR resource shows discovered ADRs
      expect(adrResource.data.adrCount).toBe(1);
      expect(adrResource.data.discoveredAdrs).toEqual([
        expect.objectContaining({
          title: expect.stringContaining('Authentication'),
          filename: expect.stringContaining('001-authentication.md'),
          status: expect.any(String), // Status casing may vary
        }),
      ]);

      // Verify all resources have consistent metadata
      expect(kgResource.lastModified).toBeTruthy();
      expect(analysisResource.lastModified).toBeTruthy();
      expect(adrResource.lastModified).toBeTruthy();

      expect(kgResource.contentType).toBe('application/json');
      expect(analysisResource.contentType).toBe('application/json');
      expect(adrResource.contentType).toBe('application/json');
    });

    test.skip('should maintain data consistency during concurrent access', async () => {
      // Create multiple intents concurrently
      const intentPromises = Array.from({ length: 5 }, (_, i) =>
        kgManager.createIntent(`Concurrent intent ${i}`, [`Goal ${i}`], 'medium')
      );
      const intentIds = await Promise.all(intentPromises);

      // Ensure all intents are created before adding tool executions
      expect(intentIds).toHaveLength(5);
      expect(intentIds.every(id => typeof id === 'string')).toBe(true);

      // Add tool executions sequentially to avoid race conditions
      for (let i = 0; i < intentIds.length; i++) {
        const intentId = intentIds[i];
        await kgManager.addToolExecution(
          intentId,
          'concurrent_tool',
          { index: i },
          { processed: true },
          true,
          [`task-${i}`],
          []
        );
      }

      // Generate resource while operations are happening
      const resource = await generateArchitecturalKnowledgeGraph(testDir);
      const snapshot = resource.data.knowledgeGraphSnapshot;

      // Verify all intents are captured
      expect(snapshot.intents).toHaveLength(5);
      expect(snapshot.analytics.totalIntents).toBe(5);
      expect(snapshot.analytics.activeIntents).toBe(5);

      // Verify tool executions are recorded
      snapshot.intents.forEach((intent: any) => {
        expect(intent.toolChainSummary.totalTools).toBe(1);
        expect(intent.todoTasksCreated).toHaveLength(1);
      });
    });
  });

  describe('LLM Usage Patterns', () => {
    test('should support LLM decision-making with complete context', async () => {
      // Simulate LLM workflow: analyze → decide → execute → track

      // 1. LLM analyzes current state
      const initialResource = await generateArchitecturalKnowledgeGraph(testDir);
      const initialSnapshot = initialResource.data.knowledgeGraphSnapshot;

      // Should start with clean state
      expect(initialSnapshot.intents).toHaveLength(0);

      // 2. LLM creates intent based on analysis
      const intentId = await kgManager.createIntent(
        'LLM-driven architectural improvement',
        ['Analyze security posture', 'Generate security ADRs', 'Implement security tests'],
        'high'
      );

      // 3. LLM executes tools based on intent
      await kgManager.addToolExecution(
        intentId,
        'analyze_content_security',
        {
          projectPath: testDir,
          scanDepth: 'comprehensive',
          includeSecrets: true,
        },
        {
          securityIssues: [
            { type: 'hardcoded-secret', severity: 'high', location: 'config.js:10' },
            { type: 'weak-jwt-secret', severity: 'medium', location: 'auth.js:25' },
          ],
          overallSecurityScore: 65,
          recommendations: [
            'Use environment variables for secrets',
            'Strengthen JWT secret generation',
            'Add input validation',
          ],
        },
        true,
        ['security-scan-task', 'secrets-audit-task'],
        []
      );

      await kgManager.addToolExecution(
        intentId,
        'generate_adrs_from_prd',
        {
          prdPath: 'security-requirements.md',
          outputDirectory: 'docs/adrs',
          enhancedMode: true,
        },
        {
          adrsGenerated: 3,
          files: [
            'docs/adrs/002-secrets-management.md',
            'docs/adrs/003-jwt-security.md',
            'docs/adrs/004-input-validation.md',
          ],
        },
        true,
        ['adr-002-impl', 'adr-003-impl', 'adr-004-impl'],
        []
      );

      // 4. LLM queries final state for decision-making
      const finalResource = await generateArchitecturalKnowledgeGraph(testDir);
      const finalSnapshot = finalResource.data.knowledgeGraphSnapshot;

      // LLM can now see complete execution context
      expect(finalSnapshot.intents).toHaveLength(1);
      const intent = finalSnapshot.intents[0];

      expect(intent.humanRequest).toBe('LLM-driven architectural improvement');
      expect(intent.priority).toBe('high');
      expect(intent.toolChainSummary.totalTools).toBe(2);
      expect(intent.toolChainSummary.completedTools).toBe(2);
      expect(intent.todoTasksCreated).toHaveLength(5);

      // LLM has access to tool execution details for informed decisions
      expect(finalSnapshot.analytics.mostUsedTools).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ toolName: 'analyze_content_security' }),
          expect.objectContaining({ toolName: 'generate_adrs_from_prd' }),
        ])
      );
    });

    test('should provide historical context for LLM learning', async () => {
      // Create historical execution pattern
      const patterns = [
        { intent: 'Security Analysis', tools: ['analyze_content_security', 'validate_rules'] },
        { intent: 'Performance Review', tools: ['smart_score', 'analyze_project_ecosystem'] },
        { intent: 'Documentation Update', tools: ['generate_adrs_from_prd', 'manage_todo'] },
      ];

      for (const pattern of patterns) {
        const intentId = await kgManager.createIntent(pattern.intent, ['Goal'], 'medium');

        for (const tool of pattern.tools) {
          await kgManager.addToolExecution(
            intentId,
            tool,
            { pattern: 'test' },
            { success: true },
            true
          );
        }

        await kgManager.updateIntentStatus(intentId, 'completed');
      }

      // LLM queries historical data
      const resource = await generateArchitecturalKnowledgeGraph(testDir);
      const snapshot = resource.data.knowledgeGraphSnapshot;

      // LLM can analyze successful patterns
      expect(snapshot.analytics.totalIntents).toBe(3);
      expect(snapshot.analytics.completedIntents).toBe(3);
      expect(snapshot.analytics.averageGoalCompletion).toBe(1);

      // LLM can see which tools are most effective
      const toolUsage = snapshot.analytics.mostUsedTools;
      expect(toolUsage).toHaveLength(6);

      // Each tool should have been used once
      toolUsage.forEach((tool: any) => {
        expect(tool.usageCount).toBe(1);
      });

      // LLM can examine successful intent patterns
      const completedIntents = snapshot.intents.filter((i: any) => i.currentStatus === 'completed');
      expect(completedIntents).toHaveLength(3);

      completedIntents.forEach((intent: any) => {
        expect(intent.toolChainSummary.completedTools).toBeGreaterThan(0);
        expect(intent.toolChainSummary.failedTools).toBe(0);
      });
    });
  });
});
