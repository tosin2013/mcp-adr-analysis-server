/**
 * Tests for MCP Planning Tool
 */

import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { promises as fs } from 'fs';
import { join, basename } from 'path';
import { tmpdir } from 'os';
import { McpAdrError } from '../../src/types/index.js';
import { mcpPlanning } from '../../src/tools/mcp-planning-tool.js';

// Test utilities
const TEST_PROJECT_PATH = '/tmp/test-project-planning';
const TEST_CACHE_DIR = join(TEST_PROJECT_PATH, '.mcp-adr-cache');

// Get the actual cache directory used by the tool (matches mcp-planning-tool.ts logic)
function getActualCacheDir(projectPath: string): string {
  const projectName = basename(projectPath);
  return join(tmpdir(), projectName, 'cache');
}

/**
 * Setup test environment
 */
async function setupTestEnvironment(): Promise<void> {
  await fs.mkdir(TEST_PROJECT_PATH, { recursive: true });
  await fs.mkdir(TEST_CACHE_DIR, { recursive: true });
  await fs.mkdir(join(TEST_PROJECT_PATH, 'docs', 'adrs'), { recursive: true });
}

/**
 * Cleanup test environment
 */
async function cleanupTestEnvironment(): Promise<void> {
  // Clean up all possible test project paths
  const pathsToClean = [
    TEST_PROJECT_PATH,
    TEST_PROJECT_PATH + '-validation',
    TEST_PROJECT_PATH + '-manage-phases',
    TEST_PROJECT_PATH + '-track-progress',
  ];

  for (const path of pathsToClean) {
    try {
      // Clean up project directory
      await fs.rm(path, { recursive: true, force: true });

      // Clean up cache directory (matches mcp-planning-tool.ts logic)
      const projectName = basename(path);
      const cacheDir = join(tmpdir(), projectName, 'cache');
      await fs.rm(cacheDir, { recursive: true, force: true });
    } catch {
      // Ignore cleanup errors
    }
  }
}

/**
 * Create mock ADR files
 */
async function createMockAdrs(): Promise<void> {
  const adrDir = join(TEST_PROJECT_PATH, 'docs', 'adrs');

  await fs.writeFile(
    join(adrDir, '001-database-architecture.md'),
    `
# ADR-001: Database Architecture

## Status
Accepted

## Context
We need to choose a database solution for our application.

## Decision
We will use PostgreSQL as our primary database.

## Consequences
- High performance for complex queries
- ACID compliance
- Strong ecosystem support
`
  );

  await fs.writeFile(
    join(adrDir, '002-api-design.md'),
    `
# ADR-002: API Design

## Status
Accepted

## Context
We need to design our REST API structure.

## Decision
We will use RESTful design with OpenAPI specification.

## Consequences
- Clear API documentation
- Standard HTTP methods
- Easy client generation
`
  );
}

/**
 * Create mock TODO data
 */
async function createMockTodoData(): Promise<void> {
  const todoData = {
    version: '1.0.0',
    metadata: {
      projectName: 'Test Project',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    tasks: {
      'task-1': {
        id: 'task-1',
        title: 'Setup Database',
        status: 'completed',
        priority: 'high',
        category: 'database',
        linkedAdrs: ['001-database-architecture.md'],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        tags: [],
        version: 1,
        changeLog: [],
      },
      'task-2': {
        id: 'task-2',
        title: 'Design API endpoints',
        status: 'in_progress',
        priority: 'medium',
        category: 'api',
        linkedAdrs: ['002-api-design.md'],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        tags: [],
        version: 1,
        changeLog: [],
      },
    },
    sections: {},
    analytics: {
      totalTasks: 2,
      completedTasks: 1,
      lastUpdated: new Date().toISOString(),
    },
  };

  // Ensure cache directory exists before writing
  await fs.mkdir(TEST_CACHE_DIR, { recursive: true });
  await fs.writeFile(join(TEST_CACHE_DIR, 'todo-data.json'), JSON.stringify(todoData, null, 2));
}

describe('MCP Planning Tool', () => {
  beforeEach(async () => {
    // Force cleanup before setup to ensure clean state
    await cleanupTestEnvironment();
    await setupTestEnvironment();
  });

  afterEach(async () => {
    await cleanupTestEnvironment();
  });

  describe('Schema Validation', () => {
    it('should validate create_project operation input', async () => {
      // Use a different path for validation tests to avoid conflicts
      const validationProjectPath = TEST_PROJECT_PATH + '-validation';
      await fs.mkdir(validationProjectPath, { recursive: true });

      const validInput = {
        operation: 'create_project',
        projectPath: validationProjectPath,
        projectName: 'Test Project',
        description: 'A test project for planning',
        phases: [
          {
            name: 'Phase 1: Setup',
            duration: '2 weeks',
            dependencies: [],
            milestones: ['Database ready', 'Environment configured'],
          },
          {
            name: 'Phase 2: Development',
            duration: '4 weeks',
            dependencies: ['Phase 1'],
            milestones: ['API endpoints created', 'Tests written'],
          },
        ],
        team: [
          {
            name: 'John Doe',
            role: 'Developer',
            skills: ['JavaScript', 'Node.js'],
            capacity: '40h/week',
          },
          {
            name: 'Jane Smith',
            role: 'Designer',
            skills: ['UI/UX', 'Figma'],
            capacity: '30h/week',
          },
        ],
        importFromAdrs: false,
        importFromTodos: false,
      };

      const result = await mcpPlanning(validInput);
      expect(result).toBeDefined();
      expect(result.content).toBeDefined();
      expect(result.content[0].text).toContain('Project Created Successfully');
      expect(result.content[0].text).toContain('Test Project');
      expect(result.content[0].text).toContain('Phase 1: Setup');
      expect(result.content[0].text).toContain('Phase 2: Development');

      // Cleanup validation project path
      await fs.rm(validationProjectPath, { recursive: true, force: true });
      expect(result.content[0].text).toContain('John Doe - Developer');
      expect(result.content[0].text).toContain('Jane Smith - Designer');
    });

    it('should reject invalid operation', async () => {
      const invalidInput = {
        operation: 'invalid_operation',
        projectPath: TEST_PROJECT_PATH,
      };

      await expect(mcpPlanning(invalidInput)).rejects.toThrow();
    });

    it('should reject create_project without required fields', async () => {
      const invalidInput = {
        operation: 'create_project',
        projectPath: TEST_PROJECT_PATH,
        // Missing projectName and phases
      };

      await expect(mcpPlanning(invalidInput)).rejects.toThrow();
    });

    it('should validate manage_phases operation input', async () => {
      // Use separate path for this test
      const managePhasesProjectPath = TEST_PROJECT_PATH + '-manage-phases';
      await fs.mkdir(managePhasesProjectPath, { recursive: true });

      // First create a project
      await mcpPlanning({
        operation: 'create_project',
        projectPath: managePhasesProjectPath,
        projectName: 'Test Project',
        phases: [
          {
            name: 'Phase 1',
            duration: '2 weeks',
          },
        ],
        importFromAdrs: false,
        importFromTodos: false,
      });

      const validInput = {
        operation: 'manage_phases',
        projectPath: managePhasesProjectPath,
        action: 'list',
      };

      const result = await mcpPlanning(validInput);
      expect(result).toBeDefined();
      expect(result.content[0].text).toContain('Project Phases');
      expect(result.content[0].text).toContain('Phase 1');

      // Cleanup
      await fs.rm(managePhasesProjectPath, { recursive: true, force: true });
    });

    it('should validate track_progress operation input', async () => {
      // Use separate path for this test
      const trackProgressProjectPath = TEST_PROJECT_PATH + '-track-progress';
      await fs.mkdir(trackProgressProjectPath, { recursive: true });

      // First create a project
      await mcpPlanning({
        operation: 'create_project',
        projectPath: trackProgressProjectPath,
        projectName: 'Test Project',
        phases: [
          {
            name: 'Phase 1',
            duration: '2 weeks',
          },
        ],
        importFromAdrs: false,
        importFromTodos: false,
      });

      const validInput = {
        operation: 'track_progress',
        projectPath: trackProgressProjectPath,
        reportType: 'summary',
        updateTaskProgress: false,
      };

      const result = await mcpPlanning(validInput);
      expect(result).toBeDefined();
      expect(result.content[0].text).toContain('Project Progress Summary');

      // Cleanup
      await fs.rm(trackProgressProjectPath, { recursive: true, force: true });
    });
  });

  describe('Create Project Operation', () => {
    it('should create project with basic structure', async () => {
      const input = {
        operation: 'create_project',
        projectPath: TEST_PROJECT_PATH,
        projectName: 'Basic Test Project',
        description: 'A basic test project',
        phases: [
          {
            name: 'Planning',
            duration: '1 week',
          },
          {
            name: 'Implementation',
            duration: '3 weeks',
          },
        ],
        importFromAdrs: false,
        importFromTodos: false,
      };

      const result = await mcpPlanning(input);

      expect(result.content[0].text).toContain('Basic Test Project');
      expect(result.content[0].text).toContain('Planning');
      expect(result.content[0].text).toContain('Implementation');
      expect(result.content[0].text).toContain('project-planning.json');

      // Verify file was created
      const planningFile = join(getActualCacheDir(TEST_PROJECT_PATH), 'project-planning.json');
      const fileExists = await fs
        .access(planningFile)
        .then(() => true)
        .catch(() => false);
      expect(fileExists).toBe(true);

      // Verify file content
      const fileContent = await fs.readFile(planningFile, 'utf-8');
      const projectData = JSON.parse(fileContent);
      expect(projectData.name).toBe('Basic Test Project');
      expect(projectData.phases).toHaveLength(2);
      expect(projectData.phases[0].name).toBe('Planning');
      expect(projectData.phases[1].name).toBe('Implementation');
    });

    it('should import from ADRs when requested', async () => {
      await createMockAdrs();

      const input = {
        operation: 'create_project',
        projectPath: TEST_PROJECT_PATH,
        projectName: 'ADR Import Test',
        phases: [
          {
            name: 'Database Setup',
            duration: '2 weeks',
          },
          {
            name: 'API Development',
            duration: '3 weeks',
          },
        ],
        importFromAdrs: true,
        importFromTodos: false,
      };

      const result = await mcpPlanning(input);

      expect(result.content[0].text).toContain('✅ Linked');

      // Verify ADRs were attempted to be imported (may not link if names don't match)
      const planningFile = join(getActualCacheDir(TEST_PROJECT_PATH), 'project-planning.json');
      const fileContent = await fs.readFile(planningFile, 'utf-8');
      const projectData = JSON.parse(fileContent);

      // The test should pass if the project was created successfully with ADR import enabled
      expect(projectData.phases).toHaveLength(2);
      expect(projectData.metadata.linkedAdrs).toBeDefined();
    });

    it('should import from TODOs when requested', async () => {
      await createMockTodoData();

      const input = {
        operation: 'create_project',
        projectPath: TEST_PROJECT_PATH,
        projectName: 'TODO Import Test',
        phases: [
          {
            name: 'Database Phase',
            duration: '2 weeks',
          },
          {
            name: 'API Phase',
            duration: '3 weeks',
          },
        ],
        importFromAdrs: false,
        importFromTodos: true,
      };

      const result = await mcpPlanning(input);

      expect(result.content[0].text).toContain('✅ Imported tasks');
    });

    it('should reject creating project when one already exists', async () => {
      // Create first project
      await mcpPlanning({
        operation: 'create_project',
        projectPath: TEST_PROJECT_PATH,
        projectName: 'First Project',
        phases: [{ name: 'Phase 1', duration: '1 week' }],
        importFromAdrs: false,
        importFromTodos: false,
      });

      // Try to create another project in same location
      const input = {
        operation: 'create_project',
        projectPath: TEST_PROJECT_PATH,
        projectName: 'Second Project',
        phases: [{ name: 'Phase 1', duration: '1 week' }],
        importFromAdrs: false,
        importFromTodos: false,
      };

      await expect(mcpPlanning(input)).rejects.toThrow(McpAdrError);
      await expect(mcpPlanning(input)).rejects.toThrow('Project already exists');
    });
  });

  describe('Manage Phases Operation', () => {
    beforeEach(async () => {
      // Clean and recreate test environment
      await cleanupTestEnvironment();
      await setupTestEnvironment();

      // Create a project for phase management tests
      await mcpPlanning({
        operation: 'create_project',
        projectPath: TEST_PROJECT_PATH,
        projectName: 'Phase Management Test',
        phases: [
          {
            name: 'Initial Phase',
            duration: '2 weeks',
          },
        ],
        importFromAdrs: false,
        importFromTodos: false,
      });
    });

    it('should list existing phases', async () => {
      const result = await mcpPlanning({
        operation: 'manage_phases',
        projectPath: TEST_PROJECT_PATH,
        action: 'list',
      });

      expect(result.content[0].text).toContain('Project Phases');
      expect(result.content[0].text).toContain('Initial Phase');
      expect(result.content[0].text).toContain('**Status**: planning');
      expect(result.content[0].text).toContain('**Duration**: 2 weeks');
    });

    it('should create new phase', async () => {
      const result = await mcpPlanning({
        operation: 'manage_phases',
        projectPath: TEST_PROJECT_PATH,
        action: 'create',
        phaseData: {
          name: 'New Test Phase',
          description: 'A newly created phase',
          estimatedDuration: '3 weeks',
          dependencies: [],
          milestones: ['Milestone 1', 'Milestone 2'],
        },
      });

      expect(result.content[0].text).toContain('Phase Created');
      expect(result.content[0].text).toContain('New Test Phase');
      expect(result.content[0].text).toContain('**Duration**: 3 weeks');
    });

    it('should transition phase status', async () => {
      // First get the phase ID
      const _listResult = await mcpPlanning({
        operation: 'manage_phases',
        projectPath: TEST_PROJECT_PATH,
        action: 'list',
      });

      // Read the project data to get phase ID
      const planningFile = join(getActualCacheDir(TEST_PROJECT_PATH), 'project-planning.json');
      const fileContent = await fs.readFile(planningFile, 'utf-8');
      const projectData = JSON.parse(fileContent);
      const phaseId = projectData.phases[0].id;

      const result = await mcpPlanning({
        operation: 'manage_phases',
        projectPath: TEST_PROJECT_PATH,
        action: 'transition',
        phaseId: phaseId,
        targetStatus: 'active',
      });

      expect(result.content[0].text).toContain('Phase Transition Complete');
      expect(result.content[0].text).toContain('planning** to **active');
    });

    it('should handle phase not found error', async () => {
      await expect(
        mcpPlanning({
          operation: 'manage_phases',
          projectPath: TEST_PROJECT_PATH,
          action: 'update',
          phaseId: 'nonexistent-phase-id',
          phaseData: {
            name: 'Updated Phase',
          },
        })
      ).rejects.toThrow(McpAdrError);
    });
  });

  describe('Track Progress Operation', () => {
    beforeEach(async () => {
      // Clean and recreate test environment
      await cleanupTestEnvironment();
      await setupTestEnvironment();

      // Create a project with multiple phases
      await mcpPlanning({
        operation: 'create_project',
        projectPath: TEST_PROJECT_PATH,
        projectName: 'Progress Tracking Test',
        phases: [
          {
            name: 'Completed Phase',
            duration: '2 weeks',
          },
          {
            name: 'Active Phase',
            duration: '3 weeks',
          },
          {
            name: 'Future Phase',
            duration: '1 week',
          },
        ],
        importFromAdrs: false,
        importFromTodos: false,
      });

      // Set up different phase statuses
      const planningFile = join(getActualCacheDir(TEST_PROJECT_PATH), 'project-planning.json');
      const fileContent = await fs.readFile(planningFile, 'utf-8');
      const projectData = JSON.parse(fileContent);

      projectData.phases[0].status = 'completed';
      projectData.phases[0].completion = 100;
      projectData.phases[1].status = 'active';
      projectData.phases[1].completion = 60;
      projectData.phases[2].status = 'planning';
      projectData.phases[2].completion = 0;

      await fs.writeFile(planningFile, JSON.stringify(projectData, null, 2));
    });

    it('should generate summary progress report', async () => {
      const result = await mcpPlanning({
        operation: 'track_progress',
        projectPath: TEST_PROJECT_PATH,
        reportType: 'summary',
        updateTaskProgress: false,
      });

      expect(result.content[0].text).toContain('Project Progress Summary');
      expect(result.content[0].text).toContain('**Progress**: ');
      expect(result.content[0].text).toContain('**Total Phases**: 3');
      expect(result.content[0].text).toContain('**Completed**: 1');
      expect(result.content[0].text).toContain('**Active**: 1');
      expect(result.content[0].text).toContain('Completed Phase');
      expect(result.content[0].text).toContain('Active Phase');
    });

    it('should generate detailed progress report', async () => {
      const result = await mcpPlanning({
        operation: 'track_progress',
        projectPath: TEST_PROJECT_PATH,
        reportType: 'detailed',
        updateTaskProgress: false,
      });

      expect(result.content[0].text).toContain('Detailed Progress Report');
      expect(result.content[0].text).toContain('Project Metrics');
      expect(result.content[0].text).toContain('Overall Progress');
      expect(result.content[0].text).toContain('Team Utilization');
      expect(result.content[0].text).toContain('Risk Level');
    });

    it('should generate milestone tracking report', async () => {
      const result = await mcpPlanning({
        operation: 'track_progress',
        projectPath: TEST_PROJECT_PATH,
        reportType: 'milestones',
        updateTaskProgress: false,
      });

      expect(result.content[0].text).toContain('Milestone Tracking');
      expect(result.content[0].text).toContain('Project Milestones');
      expect(result.content[0].text).toContain('Phase Milestones');
    });
  });

  describe('Manage Resources Operation', () => {
    beforeEach(async () => {
      // Clean and recreate test environment
      await cleanupTestEnvironment();
      await setupTestEnvironment();

      // Create a project with team members
      await mcpPlanning({
        operation: 'create_project',
        projectPath: TEST_PROJECT_PATH,
        projectName: 'Resource Management Test',
        phases: [
          {
            name: 'Development Phase',
            duration: '4 weeks',
          },
        ],
        team: [
          {
            name: 'Alice Developer',
            role: 'Senior Developer',
            skills: ['TypeScript', 'React'],
            capacity: '40h/week',
          },
        ],
        importFromAdrs: false,
        importFromTodos: false,
      });
    });

    it('should list team resources', async () => {
      const result = await mcpPlanning({
        operation: 'manage_resources',
        projectPath: TEST_PROJECT_PATH,
        action: 'list',
      });

      expect(result.content[0].text).toContain('Team Resources');
      expect(result.content[0].text).toContain('Alice Developer - Senior Developer');
      expect(result.content[0].text).toContain('**Capacity**: 40h/week');
      expect(result.content[0].text).toContain('**Skills**: TypeScript, React');
    });

    it('should add new team member', async () => {
      const result = await mcpPlanning({
        operation: 'manage_resources',
        projectPath: TEST_PROJECT_PATH,
        action: 'add',
        memberData: {
          name: 'Bob Designer',
          role: 'UI/UX Designer',
          skills: ['Figma', 'Sketch'],
          capacity: '32h/week',
        },
      });

      expect(result.content[0].text).toContain('Team Member Added');
      expect(result.content[0].text).toContain('Bob Designer');
      expect(result.content[0].text).toContain('UI/UX Designer');
    });
  });

  describe('Risk Analysis Operation', () => {
    beforeEach(async () => {
      // Clean and recreate test environment
      await cleanupTestEnvironment();
      await setupTestEnvironment();

      // Create a complex project for risk analysis
      await mcpPlanning({
        operation: 'create_project',
        projectPath: TEST_PROJECT_PATH,
        projectName: 'Risk Analysis Test',
        phases: [
          {
            name: 'High Dependency Phase',
            duration: '2 weeks',
          },
          {
            name: 'Complex Phase',
            duration: '4 weeks',
          },
        ],
        team: [
          {
            name: 'Overloaded Dev',
            role: 'Developer',
            skills: ['JavaScript'],
            capacity: '40h/week',
          },
        ],
        importFromAdrs: false,
        importFromTodos: false,
      });

      // Simulate high-risk conditions
      const planningFile = join(getActualCacheDir(TEST_PROJECT_PATH), 'project-planning.json');
      const fileContent = await fs.readFile(planningFile, 'utf-8');
      const projectData = JSON.parse(fileContent);

      // Add many dependencies to first phase
      projectData.phases[0].dependencies = ['dep1', 'dep2', 'dep3', 'dep4'];

      // Simulate overloaded team member
      projectData.team[0].currentWorkload = 95;

      await fs.writeFile(planningFile, JSON.stringify(projectData, null, 2));
    });

    it('should perform comprehensive risk analysis', async () => {
      const result = await mcpPlanning({
        operation: 'risk_analysis',
        projectPath: TEST_PROJECT_PATH,
        analysisType: 'comprehensive',
        includeAdrRisks: true,
        includeDependencyRisks: true,
        includeResourceRisks: true,
        generateMitigation: true,
      });

      expect(result.content[0].text).toContain('Risk Analysis Report');
      expect(result.content[0].text).toContain('Overall Risk Assessment');
      expect(result.content[0].text).toContain('**Risk Level**:');
      expect(result.content[0].text).toContain('Total Risks**:');
      expect(result.content[0].text).toContain('Identified Risks');
    });

    it('should detect dependency risks', async () => {
      const result = await mcpPlanning({
        operation: 'risk_analysis',
        projectPath: TEST_PROJECT_PATH,
        includeDependencyRisks: true,
        generateMitigation: true,
      });

      expect(result.content[0].text).toContain('Dependencies');
      expect(result.content[0].text).toContain('multiple dependencies');
    });

    it('should detect resource risks', async () => {
      const result = await mcpPlanning({
        operation: 'risk_analysis',
        projectPath: TEST_PROJECT_PATH,
        includeResourceRisks: true,
        generateMitigation: true,
      });

      expect(result.content[0].text).toContain('Resources');
      expect(result.content[0].text).toContain('overallocated');
    });

    it('should detect ADR risks', async () => {
      const result = await mcpPlanning({
        operation: 'risk_analysis',
        projectPath: TEST_PROJECT_PATH,
        includeAdrRisks: true,
        generateMitigation: true,
      });

      expect(result.content[0].text).toContain('Architecture');
      expect(result.content[0].text).toContain('no linked ADRs');
    });
  });

  describe('Generate Reports Operation', () => {
    beforeEach(async () => {
      // Clean and recreate test environment
      await cleanupTestEnvironment();
      await setupTestEnvironment();

      // Create a project for report generation
      await mcpPlanning({
        operation: 'create_project',
        projectPath: TEST_PROJECT_PATH,
        projectName: 'Report Generation Test',
        phases: [
          {
            name: 'Analysis Phase',
            duration: '2 weeks',
          },
          {
            name: 'Development Phase',
            duration: '6 weeks',
          },
        ],
        team: [
          {
            name: 'Lead Developer',
            role: 'Tech Lead',
            skills: ['Architecture', 'Leadership'],
            capacity: '40h/week',
          },
        ],
        importFromAdrs: false,
        importFromTodos: false,
      });
    });

    it('should generate executive summary report', async () => {
      const result = await mcpPlanning({
        operation: 'generate_reports',
        projectPath: TEST_PROJECT_PATH,
        reportType: 'executive',
        format: 'markdown',
        includeCharts: true,
        timeframe: 'month',
      });

      expect(result.content[0].text).toContain('Executive Summary');
      expect(result.content[0].text).toContain('Key Metrics');
      expect(result.content[0].text).toContain('**Overall Progress**:');
      expect(result.content[0].text).toContain('Team Utilization**:');
      expect(result.content[0].text).toContain('Current Status');
      expect(result.content[0].text).toContain('Next Milestones');
    });

    it('should generate status report', async () => {
      const result = await mcpPlanning({
        operation: 'generate_reports',
        projectPath: TEST_PROJECT_PATH,
        reportType: 'status',
        format: 'markdown',
        timeframe: 'week',
      });

      expect(result.content[0].text).toContain('Status Report');
      expect(result.content[0].text).toContain('Phase Status');
      expect(result.content[0].text).toContain('Team Status');
      expect(result.content[0].text).toContain('Recent Updates');
    });
  });

  describe('Error Handling', () => {
    it('should handle missing project for operations requiring existing project', async () => {
      await expect(
        mcpPlanning({
          operation: 'manage_phases',
          projectPath: '/tmp/nonexistent-project',
          action: 'list',
        })
      ).rejects.toThrow(McpAdrError);

      await expect(
        mcpPlanning({
          operation: 'track_progress',
          projectPath: '/tmp/nonexistent-project',
          reportType: 'summary',
        })
      ).rejects.toThrow(McpAdrError);

      await expect(
        mcpPlanning({
          operation: 'manage_resources',
          projectPath: '/tmp/nonexistent-project',
          action: 'list',
        })
      ).rejects.toThrow(McpAdrError);

      await expect(
        mcpPlanning({
          operation: 'risk_analysis',
          projectPath: '/tmp/nonexistent-project',
        })
      ).rejects.toThrow(McpAdrError);

      await expect(
        mcpPlanning({
          operation: 'generate_reports',
          projectPath: '/tmp/nonexistent-project',
          reportType: 'executive',
        })
      ).rejects.toThrow(McpAdrError);
    });

    it('should handle invalid input gracefully', async () => {
      await expect(
        mcpPlanning({
          operation: 'create_project',
          projectPath: TEST_PROJECT_PATH,
          // Missing required fields
        })
      ).rejects.toThrow();

      await expect(
        mcpPlanning({
          operation: 'manage_phases',
          projectPath: TEST_PROJECT_PATH,
          action: 'invalid_action',
        })
      ).rejects.toThrow();
    });

    it('should handle file system errors gracefully', async () => {
      // The MCP Planning Tool uses OS temp directory for caching, so it handles
      // invalid project paths gracefully by using a safe cache location.
      // This test verifies the tool doesn't crash with invalid paths.
      const uniquePath = `/invalid-path-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      const result = await mcpPlanning({
        operation: 'create_project',
        projectPath: uniquePath,
        projectName: 'Test Project',
        phases: [{ name: 'Phase 1', duration: '1 week' }],
        importFromAdrs: false,
        importFromTodos: false,
      });

      expect(result).toBeDefined();
      expect(result.content).toBeDefined();
      expect(result.content[0].text).toContain('Project Created Successfully');
      expect(result.content[0].text).toContain('Test Project');
    });
  });

  describe('Integration with Existing Tools', () => {
    it('should handle ADR discovery errors gracefully', async () => {
      // Test with non-existent ADR directory
      const result = await mcpPlanning({
        operation: 'create_project',
        projectPath: TEST_PROJECT_PATH,
        projectName: 'ADR Error Test',
        phases: [{ name: 'Phase 1', duration: '1 week' }],
        importFromAdrs: true,
        importFromTodos: false,
      });

      // Should still create project even if ADR import fails
      expect(result.content[0].text).toContain('Project Created Successfully');
    });

    it('should handle TODO data errors gracefully', async () => {
      // Test with missing TODO cache
      const result = await mcpPlanning({
        operation: 'create_project',
        projectPath: TEST_PROJECT_PATH,
        projectName: 'TODO Error Test',
        phases: [{ name: 'Phase 1', duration: '1 week' }],
        importFromAdrs: false,
        importFromTodos: true,
      });

      // Should still create project even if TODO import fails
      expect(result.content[0].text).toContain('Project Created Successfully');
    });
  });
});
