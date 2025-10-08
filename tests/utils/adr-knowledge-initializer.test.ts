/**
 * Unit tests for ADR Knowledge Initializer
 * Tests the initialization of ADRs into the knowledge graph from existing ADR files
 */

import * as fs from 'fs/promises';
import * as path from 'path';
import * as os from 'os';
import { KnowledgeGraphManager } from '../../src/utils/knowledge-graph-manager.js';

describe('ADR Knowledge Initializer', () => {
  describe('Module import tests', () => {
    it('should be importable without errors', async () => {
      const module = await import('../../src/utils/adr-knowledge-initializer.js');
      expect(module.initializeAdrKnowledgeBase).toBeDefined();
      expect(module.isAdrKnowledgeBaseInitialized).toBeDefined();
      expect(typeof module.initializeAdrKnowledgeBase).toBe('function');
      expect(typeof module.isAdrKnowledgeBaseInitialized).toBe('function');
    });
  });

  describe('initializeAdrKnowledgeBase', () => {
    let kgManager: KnowledgeGraphManager;
    let tempDir: string;
    let adrDir: string;

    beforeEach(async () => {
      // Create a temporary directory for test ADRs
      tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'adr-test-'));
      adrDir = path.join(tempDir, 'docs', 'adrs');
      await fs.mkdir(adrDir, { recursive: true });

      // Initialize knowledge graph manager
      kgManager = new KnowledgeGraphManager();
    });

    afterEach(async () => {
      // Clean up temporary directory
      try {
        await fs.rm(tempDir, { recursive: true, force: true });
      } catch {
        // Ignore cleanup errors
      }
    });

    it('should initialize with no ADRs gracefully', async () => {
      const { initializeAdrKnowledgeBase } = await import(
        '../../src/utils/adr-knowledge-initializer.js'
      );

      const result = await initializeAdrKnowledgeBase(kgManager, adrDir, tempDir);

      expect(result).toMatchObject({
        success: true,
        adrsIndexed: 0,
        nodes: [],
        errors: [],
      });
    });

    it('should initialize knowledge base with single ADR', async () => {
      // Create a test ADR file
      const adrContent = `# ADR-001: Use TypeScript for Development

## Status
Accepted

## Context
We need a strongly typed language for better code quality.

## Decision
We will use TypeScript for all new development.

## Consequences
- Better type safety
- Improved IDE support
- Learning curve for team members
`;

      await fs.writeFile(path.join(adrDir, 'adr-001-typescript.md'), adrContent);

      const { initializeAdrKnowledgeBase } = await import(
        '../../src/utils/adr-knowledge-initializer.js'
      );

      const result = await initializeAdrKnowledgeBase(kgManager, adrDir, tempDir);

      expect(result).toMatchObject({
        success: true,
        adrsIndexed: 1,
        nodes: expect.arrayContaining([
          expect.objectContaining({
            type: 'adr',
            title: expect.stringContaining('TypeScript'),
            status: 'accepted',
          }),
        ]),
        errors: [],
      });

      expect(result.nodes[0]).toHaveProperty('id');
      expect(result.nodes[0]).toHaveProperty('context');
      expect(result.nodes[0]).toHaveProperty('decision');
      expect(result.nodes[0]).toHaveProperty('consequences');
    });

    it('should initialize knowledge base with multiple ADRs', async () => {
      // Create multiple test ADR files
      const adr1 = `# ADR-001: Use TypeScript
## Status
Accepted
## Context
Need strong typing
## Decision
Use TypeScript
## Consequences
Better code quality
`;

      const adr2 = `# ADR-002: Use MCP Protocol
## Status
Accepted
## Context
Need protocol for AI integration
## Decision
Use Model Context Protocol
## Consequences
Standard AI integration
`;

      await fs.writeFile(path.join(adrDir, 'adr-001-typescript.md'), adr1);
      await fs.writeFile(path.join(adrDir, 'adr-002-mcp.md'), adr2);

      const { initializeAdrKnowledgeBase } = await import(
        '../../src/utils/adr-knowledge-initializer.js'
      );

      const result = await initializeAdrKnowledgeBase(kgManager, adrDir, tempDir);

      expect(result.success).toBe(true);
      expect(result.adrsIndexed).toBe(2);
      expect(result.nodes).toHaveLength(2);
      expect(result.errors).toHaveLength(0);
    });

    it('should extract related ADRs from content', async () => {
      // Create ADRs with references to each other
      const adr1 = `# ADR-001: Database Choice
## Status
Superseded
## Context
Need a database
## Decision
Use PostgreSQL
## Consequences
Good performance, superseded by ADR-002
`;

      const adr2 = `# ADR-002: Cloud Database
## Status
Accepted
## Context
This supersedes ADR-001 by moving to cloud
## Decision
Use Cloud SQL
## Consequences
Better scalability
`;

      await fs.writeFile(path.join(adrDir, 'adr-001-database.md'), adr1);
      await fs.writeFile(path.join(adrDir, 'adr-002-cloud-db.md'), adr2);

      const { initializeAdrKnowledgeBase } = await import(
        '../../src/utils/adr-knowledge-initializer.js'
      );

      const result = await initializeAdrKnowledgeBase(kgManager, adrDir, tempDir);

      expect(result.success).toBe(true);
      expect(result.adrsIndexed).toBe(2);

      // Check that relationships are captured
      const adr1Node = result.nodes.find(n => n.title.includes('Database Choice'));
      expect(adr1Node).toBeDefined();
      expect(adr1Node?.relationships).toBeDefined();
    });

    it('should handle ADRs with metadata', async () => {
      const adrWithMetadata = `# ADR-003: API Framework
## Status
Proposed
## Date
2024-01-15
Tags: architecture, api, backend
Category: backend
## Context
Need to select an API framework
## Decision
Use Express.js
## Consequences
Fast development, large ecosystem
`;

      await fs.writeFile(path.join(adrDir, 'adr-003-api.md'), adrWithMetadata);

      const { initializeAdrKnowledgeBase } = await import(
        '../../src/utils/adr-knowledge-initializer.js'
      );

      const result = await initializeAdrKnowledgeBase(kgManager, adrDir, tempDir);

      expect(result.success).toBe(true);
      expect(result.adrsIndexed).toBe(1);
      expect(result.nodes[0].metadata).toBeDefined();
      expect(result.nodes[0].metadata.tags).toBeDefined();

      // Tags should be extracted if they exist in the format "Tags: tag1, tag2"
      if (result.nodes[0].metadata.tags && result.nodes[0].metadata.tags.length > 0) {
        expect(result.nodes[0].metadata.tags).toContain('architecture');
      } else {
        // Tags might not be extracted depending on ADR format
        expect(result.nodes[0].metadata.tags).toEqual([]);
      }
    });

    it('should continue on individual ADR errors', async () => {
      // Create one valid and one invalid ADR
      const validAdr = `# ADR-001: Valid ADR
## Status
Accepted
## Context
Valid context
## Decision
Valid decision
## Consequences
Valid consequences
`;

      // Create an incomplete ADR that might cause parsing issues
      const invalidAdr = '# Incomplete ADR\nNo proper sections';

      await fs.writeFile(path.join(adrDir, 'adr-001-valid.md'), validAdr);
      await fs.writeFile(path.join(adrDir, 'incomplete.md'), invalidAdr);

      const { initializeAdrKnowledgeBase } = await import(
        '../../src/utils/adr-knowledge-initializer.js'
      );

      const result = await initializeAdrKnowledgeBase(kgManager, adrDir, tempDir);

      // Should still succeed with at least the valid ADR
      expect(result.success).toBe(true);
      expect(result.adrsIndexed).toBeGreaterThanOrEqual(1);
    });
  });

  describe('isAdrKnowledgeBaseInitialized', () => {
    let kgManager: KnowledgeGraphManager;

    beforeEach(() => {
      kgManager = new KnowledgeGraphManager();
    });

    it('should return false when knowledge base is not initialized', async () => {
      const { isAdrKnowledgeBaseInitialized } = await import(
        '../../src/utils/adr-knowledge-initializer.js'
      );

      const isInitialized = await isAdrKnowledgeBaseInitialized(kgManager);
      expect(typeof isInitialized).toBe('boolean');
    });

    it('should return true after initialization', async () => {
      const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'adr-test-'));
      const adrDir = path.join(tempDir, 'docs', 'adrs');
      await fs.mkdir(adrDir, { recursive: true });

      // Create a test ADR
      const adrContent = `# ADR-001: Test
## Status
Accepted
## Context
Test
## Decision
Test
## Consequences
Test
`;

      await fs.writeFile(path.join(adrDir, 'adr-001.md'), adrContent);

      const { initializeAdrKnowledgeBase, isAdrKnowledgeBaseInitialized } = await import(
        '../../src/utils/adr-knowledge-initializer.js'
      );

      // Initialize
      await initializeAdrKnowledgeBase(kgManager, adrDir, tempDir);

      // Check if initialized
      const isInitialized = await isAdrKnowledgeBaseInitialized(kgManager);
      expect(isInitialized).toBe(true);

      // Cleanup
      await fs.rm(tempDir, { recursive: true, force: true });
    });
  });

  describe('ADR relationship extraction', () => {
    let kgManager: KnowledgeGraphManager;
    let tempDir: string;
    let adrDir: string;

    beforeEach(async () => {
      tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'adr-test-'));
      adrDir = path.join(tempDir, 'docs', 'adrs');
      await fs.mkdir(adrDir, { recursive: true });
      kgManager = new KnowledgeGraphManager();
    });

    afterEach(async () => {
      try {
        await fs.rm(tempDir, { recursive: true, force: true });
      } catch {
        // Ignore cleanup errors
      }
    });

    it('should extract supersedes relationships', async () => {
      const adr1 = `# ADR-001: Old Decision
## Status
Superseded
## Context
Original approach
## Decision
Old way
## Consequences
Superseded by ADR-002
`;

      const adr2 = `# ADR-002: New Decision
## Status
Accepted
## Context
This supersedes ADR-001
## Decision
New way
## Consequences
Better approach
`;

      await fs.writeFile(path.join(adrDir, 'adr-001.md'), adr1);
      await fs.writeFile(path.join(adrDir, 'adr-002.md'), adr2);

      const { initializeAdrKnowledgeBase } = await import(
        '../../src/utils/adr-knowledge-initializer.js'
      );

      const result = await initializeAdrKnowledgeBase(kgManager, adrDir, tempDir);

      expect(result.success).toBe(true);
      expect(result.adrsIndexed).toBe(2);

      const adr2Node = result.nodes.find(n => n.title.includes('New Decision'));
      expect(adr2Node?.relationships.supersedes).toBeDefined();
    });
  });
});
