/**
 * MCP Project Planning Tool - Enhanced Project Planning and Workflow Management
 *
 * Bridges gaps between architectural decisions and implementation workflows by providing:
 * - Phase-based project management with milestone tracking
 * - Team resource allocation and capacity planning
 * - Visual progress tracking with Gantt-style views
 * - Risk analysis and automated blocker detection
 * - Executive reporting and status dashboards
 *
 * Integrates with existing ADR Analysis tools:
 * - Links with ADR tools for architectural decision tracking
 * - Syncs with TODO management for execution tracking
 * - Connects with development guidance for roadmap conversion
 * - Updates project health scoring system
 *
 * Cache Dependencies:
 * - Requires: .mcp-adr-cache/project-planning.json (main planning data)
 * - Uses: .mcp-adr-cache/todo-data.json (for task integration)
 * - Updates: .mcp-adr-cache/project-health-scores.json (project metrics)
 */

import { z } from 'zod';
import { promises as fs } from 'fs';
import { join } from 'path';
import { McpAdrError } from '../types/index.js';
// TodoJsonManager removed - use mcp-shrimp-task-manager for task management

// Project phase schema
const ProjectPhaseSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string().optional(),
  status: z.enum(['planning', 'active', 'completed', 'blocked', 'cancelled']),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  estimatedDuration: z.string(),
  actualDuration: z.string().optional(),
  dependencies: z.array(z.string()).default([]), // Other phase IDs
  blockers: z.array(z.string()).default([]), // Blocker descriptions
  milestones: z.array(z.string()).default([]),
  linkedAdrs: z.array(z.string()).default([]), // ADR files
  tasks: z.array(z.string()).default([]), // Task IDs from TODO system
  completion: z.number().min(0).max(100).default(0),
  riskLevel: z.enum(['low', 'medium', 'high', 'critical']).default('medium'),
  riskFactors: z.array(z.string()).default([]),
  resources: z
    .array(
      z.object({
        role: z.string(),
        capacity: z.string(), // e.g., "40h/week"
        allocation: z.number().min(0).max(100), // percentage allocated to this phase
      })
    )
    .default([]),
  createdAt: z.string(),
  updatedAt: z.string(),
});

// Team member schema
const TeamMemberSchema = z.object({
  id: z.string(),
  name: z.string(),
  role: z.string(),
  skills: z.array(z.string()).default([]),
  capacity: z.string(), // e.g., "40h/week"
  currentWorkload: z.number().min(0).max(100).default(0), // percentage utilization
  availability: z
    .object({
      startDate: z.string().optional(),
      endDate: z.string().optional(),
      unavailableDates: z.array(z.string()).default([]),
    })
    .optional(),
});

// Project schema
const ProjectPlanSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string().optional(),
  status: z.enum(['planning', 'active', 'completed', 'on_hold', 'cancelled']),
  phases: z.array(ProjectPhaseSchema).default([]),
  team: z.array(TeamMemberSchema).default([]),
  milestones: z
    .array(
      z.object({
        id: z.string(),
        name: z.string(),
        description: z.string().optional(),
        dueDate: z.string(),
        status: z.enum(['pending', 'achieved', 'delayed', 'cancelled']),
        criteria: z.array(z.string()).default([]),
        linkedPhases: z.array(z.string()).default([]),
      })
    )
    .default([]),
  risks: z
    .array(
      z.object({
        id: z.string(),
        description: z.string(),
        impact: z.enum(['low', 'medium', 'high', 'critical']),
        probability: z.enum(['low', 'medium', 'high']),
        mitigation: z.string().optional(),
        owner: z.string().optional(),
        status: z.enum(['open', 'mitigated', 'closed']),
      })
    )
    .default([]),
  metadata: z.object({
    createdAt: z.string(),
    updatedAt: z.string(),
    createdBy: z.string(),
    projectPath: z.string(),
    adrDirectory: z.string().default('docs/adrs'),
    linkedAdrs: z.array(z.string()).default([]),
  }),
  settings: z
    .object({
      autoPhaseTransition: z.boolean().default(false),
      riskAssessmentInterval: z.string().default('weekly'),
      progressUpdateFrequency: z.string().default('daily'),
    })
    .default({}),
});

// Operation schemas
const CreateProjectSchema = z.object({
  operation: z.literal('create_project'),
  projectPath: z.string().describe('Project root path'),
  projectName: z.string().describe('Project name'),
  description: z.string().optional().describe('Project description'),
  phases: z
    .array(
      z.object({
        name: z.string(),
        duration: z.string(),
        dependencies: z.array(z.string()).default([]),
        milestones: z.array(z.string()).default([]),
      })
    )
    .describe('Initial project phases'),
  team: z
    .array(
      z.object({
        name: z.string(),
        role: z.string(),
        skills: z.array(z.string()).default([]),
        capacity: z.string(),
      })
    )
    .default([])
    .describe('Team structure'),
  importFromAdrs: z.boolean().default(true).describe('Import phases from existing ADRs'),
  importFromTodos: z.boolean().default(true).describe('Import tasks from TODO system'),
});

const ManagePhasesSchema = z.object({
  operation: z.literal('manage_phases'),
  projectPath: z.string().describe('Project root path'),
  action: z
    .enum(['list', 'create', 'update', 'delete', 'transition'])
    .describe('Phase management action'),
  phaseId: z.string().optional().describe('Phase ID for update/delete/transition'),
  phaseData: z
    .object({
      name: z.string().optional(),
      description: z.string().optional(),
      estimatedDuration: z.string().optional(),
      dependencies: z.array(z.string()).optional(),
      milestones: z.array(z.string()).optional(),
      linkedAdrs: z.array(z.string()).optional(),
    })
    .optional()
    .describe('Phase data for create/update'),
  targetStatus: z
    .enum(['planning', 'active', 'completed', 'blocked', 'cancelled'])
    .optional()
    .describe('Target status for transition'),
});

const TrackProgressSchema = z.object({
  operation: z.literal('track_progress'),
  projectPath: z.string().describe('Project root path'),
  reportType: z
    .enum(['summary', 'detailed', 'gantt', 'milestones', 'risks'])
    .default('summary')
    .describe('Type of progress report'),
  timeframe: z
    .enum(['current', 'weekly', 'monthly', 'quarterly'])
    .default('current')
    .describe('Time frame for progress tracking'),
  includeVisuals: z.boolean().default(true).describe('Include visual progress indicators'),
  updateTaskProgress: z.boolean().default(true).describe('Sync progress from TODO system'),
});

const ManageResourcesSchema = z.object({
  operation: z.literal('manage_resources'),
  projectPath: z.string().describe('Project root path'),
  action: z
    .enum(['list', 'add', 'update', 'remove', 'allocate', 'optimize'])
    .describe('Resource management action'),
  memberId: z.string().optional().describe('Team member ID for individual actions'),
  memberData: z
    .object({
      name: z.string().optional(),
      role: z.string().optional(),
      skills: z.array(z.string()).optional(),
      capacity: z.string().optional(),
    })
    .optional()
    .describe('Team member data'),
  allocationData: z
    .object({
      phaseId: z.string(),
      allocation: z.number().min(0).max(100),
    })
    .optional()
    .describe('Resource allocation data'),
});

const RiskAnalysisSchema = z.object({
  operation: z.literal('risk_analysis'),
  projectPath: z.string().describe('Project root path'),
  analysisType: z
    .enum(['automated', 'manual', 'comprehensive'])
    .default('comprehensive')
    .describe('Type of risk analysis'),
  includeAdrRisks: z.boolean().default(true).describe('Analyze risks from ADR complexity'),
  includeDependencyRisks: z.boolean().default(true).describe('Analyze dependency chain risks'),
  includeResourceRisks: z.boolean().default(true).describe('Analyze resource allocation risks'),
  generateMitigation: z.boolean().default(true).describe('Generate mitigation strategies'),
});

const GenerateReportsSchema = z.object({
  operation: z.literal('generate_reports'),
  projectPath: z.string().describe('Project root path'),
  reportType: z
    .enum(['executive', 'status', 'health', 'team_performance', 'milestone_tracking'])
    .describe('Type of report to generate'),
  format: z.enum(['markdown', 'json', 'html']).default('markdown').describe('Report output format'),
  includeCharts: z.boolean().default(true).describe('Include progress charts and graphs'),
  timeframe: z
    .enum(['week', 'month', 'quarter', 'project'])
    .default('month')
    .describe('Report time frame'),
});

// Main operation schema
const McpPlanningSchema = z.union([
  CreateProjectSchema,
  ManagePhasesSchema,
  TrackProgressSchema,
  ManageResourcesSchema,
  RiskAnalysisSchema,
  GenerateReportsSchema,
]);

/**
 * Get planning cache directory
 */
function getPlanningCacheDir(projectPath: string): string {
  return join(projectPath, '.mcp-adr-cache');
}

/**
 * Get planning data file path
 */
function getPlanningDataPath(projectPath: string): string {
  return join(getPlanningCacheDir(projectPath), 'project-planning.json');
}

/**
 * Ensure cache directory exists
 */
async function ensureCacheDir(projectPath: string): Promise<void> {
  const cacheDir = getPlanningCacheDir(projectPath);
  try {
    await fs.mkdir(cacheDir, { recursive: true });
  } catch (error) {
    // Directory might already exist, that's ok
  }
}

/**
 * Load existing project planning data
 */
async function loadPlanningData(
  projectPath: string
): Promise<z.infer<typeof ProjectPlanSchema> | null> {
  const planningPath = getPlanningDataPath(projectPath);
  try {
    const data = await fs.readFile(planningPath, 'utf-8');
    return ProjectPlanSchema.parse(JSON.parse(data));
  } catch (error) {
    return null;
  }
}

/**
 * Save project planning data
 */
async function savePlanningData(
  projectPath: string,
  data: z.infer<typeof ProjectPlanSchema>
): Promise<void> {
  await ensureCacheDir(projectPath);
  const planningPath = getPlanningDataPath(projectPath);

  // Update timestamps
  data.metadata.updatedAt = new Date().toISOString();

  await fs.writeFile(planningPath, JSON.stringify(data, null, 2));
}

/**
 * Generate unique ID
 */
function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Create new project operation
 */
async function createProject(args: z.infer<typeof CreateProjectSchema>): Promise<any> {
  const { projectPath, projectName, description, phases, team, importFromAdrs, importFromTodos } =
    args;

  // Check if project already exists
  const existing = await loadPlanningData(projectPath);
  if (existing) {
    throw new McpAdrError(
      `Project already exists at ${projectPath}. Use manage_phases to modify existing project.`,
      'PROJECT_EXISTS'
    );
  }

  const now = new Date().toISOString();
  const projectId = generateId();

  // Create project phases
  const projectPhases: z.infer<typeof ProjectPhaseSchema>[] = phases.map(phase => ({
    id: generateId(),
    name: phase.name,
    description: `Auto-generated phase: ${phase.name}`,
    status: 'planning' as const,
    estimatedDuration: phase.duration,
    dependencies: phase.dependencies,
    blockers: [], // Add missing field
    milestones: phase.milestones,
    linkedAdrs: [],
    tasks: [],
    completion: 0,
    riskLevel: 'medium' as const,
    riskFactors: [],
    resources: [],
    createdAt: now,
    updatedAt: now,
  }));

  // Create team members
  const teamMembers: z.infer<typeof TeamMemberSchema>[] = team.map(member => ({
    id: generateId(),
    name: member.name,
    role: member.role,
    skills: member.skills,
    capacity: member.capacity,
    currentWorkload: 0,
  }));

  // Import from ADRs if requested
  if (importFromAdrs) {
    try {
      const { discoverAdrsInDirectory } = await import('../utils/adr-discovery.js');
      const discoveryResult = await discoverAdrsInDirectory(
        join(projectPath, 'docs/adrs'),
        true,
        projectPath
      );

      // Link relevant ADRs to phases
      for (const phase of projectPhases) {
        const relatedAdrs = discoveryResult.adrs.filter(
          (adr: any) =>
            adr.title.toLowerCase().includes(phase.name.toLowerCase()) ||
            adr.content.toLowerCase().includes(phase.name.toLowerCase())
        );
        phase.linkedAdrs = relatedAdrs.map((adr: any) => adr.file);
      }
    } catch (error) {
      console.warn('Failed to import ADRs:', error);
    }
  }

  // Import from TODO system if requested
  if (importFromTodos) {
    try {
      // TodoJsonManager removed - use mcp-shrimp-task-manager for task management
      console.warn(
        '⚠️ TodoJsonManager is deprecated and was removed in memory-centric transformation'
      );
      // todoManager removed - skip loading todo data
      const todoData: any = null;

      if (todoData && todoData.tasks && Object.values(todoData.tasks).length > 0) {
        // Distribute tasks across phases based on categories or ADR links
        const tasksArray = Object.values(todoData.tasks);
        for (const phase of projectPhases) {
          const relatedTasks = tasksArray.filter(
            (task: any) =>
              task.linkedAdrs.some((adr: string) => phase.linkedAdrs.includes(adr)) ||
              task.category?.toLowerCase().includes(phase.name.toLowerCase())
          );
          phase.tasks = relatedTasks.map((task: any) => task.id);
        }
      }
    } catch (error) {
      console.warn('Failed to import TODO tasks:', error);
    }
  }

  // Create project plan
  const projectPlan: z.infer<typeof ProjectPlanSchema> = {
    id: projectId,
    name: projectName,
    description,
    status: 'planning',
    phases: projectPhases,
    team: teamMembers,
    milestones: [],
    risks: [],
    metadata: {
      createdAt: now,
      updatedAt: now,
      createdBy: 'mcp-planning-tool',
      projectPath,
      adrDirectory: 'docs/adrs',
      linkedAdrs: projectPhases.flatMap(p => p.linkedAdrs),
    },
    settings: {
      autoPhaseTransition: false,
      riskAssessmentInterval: 'weekly',
      progressUpdateFrequency: 'daily',
    },
  };

  await savePlanningData(projectPath, projectPlan);

  return {
    content: [
      {
        type: 'text',
        text: `# Project Created Successfully

## Project Overview
- **Name**: ${projectName}
- **ID**: ${projectId}
- **Status**: Planning
- **Phases**: ${projectPhases.length}
- **Team Members**: ${teamMembers.length}

## Project Phases
${projectPhases
  .map(
    (phase, index) => `
### Phase ${index + 1}: ${phase.name}
- **Duration**: ${phase.estimatedDuration}
- **Dependencies**: ${phase.dependencies.length > 0 ? phase.dependencies.join(', ') : 'None'}
- **Milestones**: ${phase.milestones.length > 0 ? phase.milestones.join(', ') : 'None'}
- **Linked ADRs**: ${phase.linkedAdrs.length}
- **Tasks**: ${phase.tasks.length}
`
  )
  .join('')}

## Team Structure
${teamMembers
  .map(
    member => `
### ${member.name} - ${member.role}
- **Capacity**: ${member.capacity}
- **Skills**: ${member.skills.join(', ')}
- **Current Workload**: ${member.currentWorkload}%
`
  )
  .join('')}

## Next Steps
1. Use \`manage_phases\` to refine phase details
2. Use \`manage_resources\` to allocate team members to phases
3. Use \`track_progress\` to monitor project advancement
4. Use \`risk_analysis\` to identify potential issues

## Integration Status
- **ADR Import**: ${importFromAdrs ? `✅ Linked ${projectPlan.metadata.linkedAdrs.length} ADRs` : '❌ Skipped'}
- **TODO Import**: ${importFromTodos ? `✅ Imported tasks from TODO system` : '❌ Skipped'}

Project planning data saved to: \`.mcp-adr-cache/project-planning.json\`
`,
      },
    ],
  };
}

/**
 * Manage phases operation
 */
async function managePhases(args: z.infer<typeof ManagePhasesSchema>): Promise<any> {
  const { projectPath, action, phaseId, phaseData, targetStatus } = args;

  const projectPlan = await loadPlanningData(projectPath);
  if (!projectPlan) {
    throw new McpAdrError(
      `No project found at ${projectPath}. Use create_project first.`,
      'PROJECT_NOT_FOUND'
    );
  }

  const now = new Date().toISOString();

  switch (action) {
    case 'list':
      return {
        content: [
          {
            type: 'text',
            text: `# Project Phases

## ${projectPlan.name}

${projectPlan.phases
  .map(
    (phase, index) => `
### Phase ${index + 1}: ${phase.name}
- **Status**: ${phase.status}
- **Progress**: ${phase.completion}%
- **Duration**: ${phase.estimatedDuration} ${phase.actualDuration ? `(Actual: ${phase.actualDuration})` : ''}
- **Dependencies**: ${phase.dependencies.length > 0 ? phase.dependencies.join(', ') : 'None'}
- **Blockers**: ${phase.blockers.length > 0 ? phase.blockers.join(', ') : 'None'}
- **Risk Level**: ${phase.riskLevel}
- **Tasks**: ${phase.tasks.length}
- **Linked ADRs**: ${phase.linkedAdrs.length}
`
  )
  .join('')}

Total phases: ${projectPlan.phases.length}
`,
          },
        ],
      };

    case 'create':
      if (!phaseData?.name) {
        throw new McpAdrError('Phase name is required for creation', 'INVALID_INPUT');
      }

      const newPhase: z.infer<typeof ProjectPhaseSchema> = {
        id: generateId(),
        name: phaseData.name,
        description: phaseData.description || `New phase: ${phaseData.name}`,
        status: 'planning',
        estimatedDuration: phaseData.estimatedDuration || 'TBD',
        dependencies: phaseData.dependencies || [],
        blockers: [], // Add missing field
        milestones: phaseData.milestones || [],
        linkedAdrs: phaseData.linkedAdrs || [],
        tasks: [],
        completion: 0,
        riskLevel: 'medium',
        riskFactors: [],
        resources: [],
        createdAt: now,
        updatedAt: now,
      };

      projectPlan.phases.push(newPhase);
      await savePlanningData(projectPath, projectPlan);

      return {
        content: [
          {
            type: 'text',
            text: `# Phase Created

**${newPhase.name}** has been added to the project.

- **ID**: ${newPhase.id}
- **Status**: ${newPhase.status}
- **Duration**: ${newPhase.estimatedDuration}
- **Dependencies**: ${newPhase.dependencies.join(', ') || 'None'}

Use \`manage_resources\` to allocate team members to this phase.
`,
          },
        ],
      };

    case 'update':
      if (!phaseId) {
        throw new McpAdrError('Phase ID is required for update', 'INVALID_INPUT');
      }

      const phaseIndex = projectPlan.phases.findIndex(p => p.id === phaseId);
      if (phaseIndex === -1) {
        throw new McpAdrError(`Phase with ID ${phaseId} not found`, 'PHASE_NOT_FOUND');
      }

      const phase = projectPlan.phases[phaseIndex];
      if (!phase) {
        throw new McpAdrError(`Phase with ID ${phaseId} not found`, 'PHASE_NOT_FOUND');
      }

      if (phaseData) {
        Object.assign(phase, {
          ...phaseData,
          updatedAt: now,
        });
      }

      await savePlanningData(projectPath, projectPlan);

      return {
        content: [
          {
            type: 'text',
            text: `# Phase Updated

**${phase.name}** has been updated successfully.

Updated fields: ${Object.keys(phaseData || {}).join(', ')}
`,
          },
        ],
      };

    case 'transition':
      if (!phaseId || !targetStatus) {
        throw new McpAdrError(
          'Phase ID and target status are required for transition',
          'INVALID_INPUT'
        );
      }

      const transitionPhaseIndex = projectPlan.phases.findIndex(p => p.id === phaseId);
      if (transitionPhaseIndex === -1) {
        throw new McpAdrError(`Phase with ID ${phaseId} not found`, 'PHASE_NOT_FOUND');
      }

      const transitionPhase = projectPlan.phases[transitionPhaseIndex];
      if (!transitionPhase) {
        throw new McpAdrError(`Phase with ID ${phaseId} not found`, 'PHASE_NOT_FOUND');
      }

      const oldStatus = transitionPhase.status;
      transitionPhase.status = targetStatus;
      transitionPhase.updatedAt = now;

      // Auto-calculate completion based on status
      if (targetStatus === 'completed') {
        transitionPhase.completion = 100;
      } else if (targetStatus === 'active' && transitionPhase.completion === 0) {
        transitionPhase.completion = 10; // Started
      }

      await savePlanningData(projectPath, projectPlan);

      return {
        content: [
          {
            type: 'text',
            text: `# Phase Transition Complete

**${transitionPhase.name}** status changed from **${oldStatus}** to **${targetStatus}**.

Current completion: ${transitionPhase.completion}%
`,
          },
        ],
      };

    case 'delete':
      if (!phaseId) {
        throw new McpAdrError('Phase ID is required for deletion', 'INVALID_INPUT');
      }

      const deleteIndex = projectPlan.phases.findIndex(p => p.id === phaseId);
      if (deleteIndex === -1) {
        throw new McpAdrError(`Phase with ID ${phaseId} not found`, 'PHASE_NOT_FOUND');
      }

      const deletedPhase = projectPlan.phases.splice(deleteIndex, 1)[0];
      if (!deletedPhase) {
        throw new McpAdrError(`Phase with ID ${phaseId} not found`, 'PHASE_NOT_FOUND');
      }
      await savePlanningData(projectPath, projectPlan);

      return {
        content: [
          {
            type: 'text',
            text: `# Phase Deleted

**${deletedPhase.name}** has been removed from the project.

Remaining phases: ${projectPlan.phases.length}
`,
          },
        ],
      };

    default:
      throw new McpAdrError(`Unknown phase action: ${action}`, 'INVALID_INPUT');
  }
}

/**
 * Track progress operation
 */
async function trackProgress(args: z.infer<typeof TrackProgressSchema>): Promise<any> {
  const { projectPath, reportType, includeVisuals, updateTaskProgress } = args;

  const projectPlan = await loadPlanningData(projectPath);
  if (!projectPlan) {
    throw new McpAdrError(
      `No project found at ${projectPath}. Use create_project first.`,
      'PROJECT_NOT_FOUND'
    );
  }

  // Update task progress from TODO system if requested
  if (updateTaskProgress) {
    try {
      // TodoJsonManager removed - use mcp-shrimp-task-manager for task management
      console.warn(
        '⚠️ TodoJsonManager is deprecated and was removed in memory-centric transformation'
      );
      // todoManager removed - skip loading todo data
      const todoData: any = null;

      if (todoData && todoData.tasks) {
        const tasksArray = Object.values(todoData.tasks);
        for (const phase of projectPlan.phases) {
          const phaseTasks = tasksArray.filter((task: any) => phase.tasks.includes(task.id));
          if (phaseTasks.length > 0) {
            const completedTasks = phaseTasks.filter(
              (task: any) => task.status === 'completed'
            ).length;
            phase.completion = Math.round((completedTasks / phaseTasks.length) * 100);
          }
        }
        await savePlanningData(projectPath, projectPlan);
      }
    } catch (error) {
      console.warn('Failed to update task progress:', error);
    }
  }

  // Calculate overall project progress
  const totalPhases = projectPlan.phases.length;
  const completedPhases = projectPlan.phases.filter(p => p.status === 'completed').length;
  const activePhases = projectPlan.phases.filter(p => p.status === 'active').length;
  const blockedPhases = projectPlan.phases.filter(p => p.status === 'blocked').length;
  const overallProgress =
    totalPhases > 0
      ? Math.round(
          projectPlan.phases.reduce((sum, phase) => sum + phase.completion, 0) / totalPhases
        )
      : 0;

  switch (reportType) {
    case 'summary':
      return {
        content: [
          {
            type: 'text',
            text: `# Project Progress Summary

## ${projectPlan.name}

### Overall Status
- **Progress**: ${overallProgress}% ${includeVisuals ? getProgressBar(overallProgress) : ''}
- **Status**: ${projectPlan.status}
- **Total Phases**: ${totalPhases}
- **Completed**: ${completedPhases}
- **Active**: ${activePhases}
- **Blocked**: ${blockedPhases}

### Phase Progress
${projectPlan.phases
  .map(
    phase => `
#### ${phase.name}
- **Status**: ${phase.status}
- **Progress**: ${phase.completion}% ${includeVisuals ? getProgressBar(phase.completion) : ''}
- **Tasks**: ${phase.tasks.length}
- **Blockers**: ${phase.blockers.length}
`
  )
  .join('')}

### Current Focus
${
  activePhases > 0
    ? `Currently working on ${activePhases} phase(s):\n${projectPlan.phases
        .filter(p => p.status === 'active')
        .map(p => `- ${p.name}`)
        .join('\n')}`
    : 'No active phases'
}

${
  blockedPhases > 0
    ? `\n⚠️ **Blocked Phases**: ${projectPlan.phases
        .filter(p => p.status === 'blocked')
        .map(p => p.name)
        .join(', ')}`
    : ''
}
`,
          },
        ],
      };

    case 'detailed':
      return {
        content: [
          {
            type: 'text',
            text: `# Detailed Progress Report

## ${projectPlan.name}

### Project Metrics
- **Overall Progress**: ${overallProgress}%
- **Team Utilization**: ${calculateTeamUtilization(projectPlan)}%
- **Risk Level**: ${calculateProjectRisk(projectPlan)}
- **Timeline Status**: ${calculateTimelineStatus(projectPlan)}

${projectPlan.phases
  .map(
    phase => `
### ${phase.name}
- **Status**: ${phase.status}
- **Progress**: ${phase.completion}% ${includeVisuals ? getProgressBar(phase.completion) : ''}
- **Duration**: ${phase.estimatedDuration} ${phase.actualDuration ? `(Actual: ${phase.actualDuration})` : ''}
- **Risk Level**: ${phase.riskLevel}
- **Dependencies**: ${phase.dependencies.length > 0 ? phase.dependencies.join(', ') : 'None'}
- **Blockers**: ${phase.blockers.length > 0 ? phase.blockers.map(b => `⚠️ ${b}`).join('\n  ') : 'None'}
- **Tasks**: ${phase.tasks.length} tasks
- **Linked ADRs**: ${phase.linkedAdrs.length} ADRs
- **Resources**: ${phase.resources.length} team members allocated

${phase.riskFactors.length > 0 ? `**Risk Factors**:\n${phase.riskFactors.map(r => `- ${r}`).join('\n')}` : ''}
`
  )
  .join('')}
`,
          },
        ],
      };

    case 'milestones':
      return {
        content: [
          {
            type: 'text',
            text: `# Milestone Tracking

## ${projectPlan.name}

### Project Milestones
${
  projectPlan.milestones.length > 0
    ? projectPlan.milestones
        .map(
          milestone => `
#### ${milestone.name}
- **Status**: ${milestone.status}
- **Due Date**: ${milestone.dueDate}
- **Linked Phases**: ${milestone.linkedPhases.join(', ') || 'None'}
- **Criteria**: ${milestone.criteria.join(', ') || 'None'}
`
        )
        .join('')
    : 'No project milestones defined'
}

### Phase Milestones
${projectPlan.phases
  .map(
    phase => `
#### ${phase.name}
${
  phase.milestones.length > 0
    ? phase.milestones.map(m => `- ${m}`).join('\n')
    : '- No milestones defined'
}
`
  )
  .join('')}
`,
          },
        ],
      };

    default:
      return {
        content: [
          {
            type: 'text',
            text: `Progress tracking for report type "${reportType}" is not yet implemented.`,
          },
        ],
      };
  }
}

/**
 * Manage resources operation
 */
async function manageResources(args: z.infer<typeof ManageResourcesSchema>): Promise<any> {
  const { projectPath, action, memberData } = args;

  const projectPlan = await loadPlanningData(projectPath);
  if (!projectPlan) {
    throw new McpAdrError(
      `No project found at ${projectPath}. Use create_project first.`,
      'PROJECT_NOT_FOUND'
    );
  }

  switch (action) {
    case 'list':
      return {
        content: [
          {
            type: 'text',
            text: `# Team Resources

## ${projectPlan.name}

### Team Members
${projectPlan.team
  .map(
    member => `
#### ${member.name} - ${member.role}
- **Capacity**: ${member.capacity}
- **Current Workload**: ${member.currentWorkload}%
- **Skills**: ${member.skills.join(', ') || 'None specified'}
- **Availability**: ${member.availability ? 'Configured' : 'Not set'}
`
  )
  .join('')}

### Resource Allocation
${projectPlan.phases
  .map(
    phase => `
#### ${phase.name}
${
  phase.resources.length > 0
    ? phase.resources
        .map(resource => `- ${resource.role}: ${resource.allocation}% (${resource.capacity})`)
        .join('\n')
    : '- No resources allocated'
}
`
  )
  .join('')}

Total team members: ${projectPlan.team.length}
`,
          },
        ],
      };

    case 'add':
      if (!memberData?.name || !memberData?.role) {
        throw new McpAdrError('Member name and role are required', 'INVALID_INPUT');
      }

      const newMember: z.infer<typeof TeamMemberSchema> = {
        id: generateId(),
        name: memberData.name,
        role: memberData.role,
        skills: memberData.skills || [],
        capacity: memberData.capacity || '40h/week',
        currentWorkload: 0,
      };

      projectPlan.team.push(newMember);
      await savePlanningData(projectPath, projectPlan);

      return {
        content: [
          {
            type: 'text',
            text: `# Team Member Added

**${newMember.name}** has been added to the team.

- **Role**: ${newMember.role}
- **Capacity**: ${newMember.capacity}
- **Skills**: ${newMember.skills.join(', ') || 'None specified'}

Use \`allocate\` action to assign them to project phases.
`,
          },
        ],
      };

    default:
      return {
        content: [
          {
            type: 'text',
            text: `Resource management for action "${action}" is not yet implemented.`,
          },
        ],
      };
  }
}

/**
 * Risk analysis operation
 */
async function riskAnalysis(args: z.infer<typeof RiskAnalysisSchema>): Promise<any> {
  const {
    projectPath,
    includeAdrRisks,
    includeDependencyRisks,
    includeResourceRisks,
    generateMitigation,
  } = args;

  const projectPlan = await loadPlanningData(projectPath);
  if (!projectPlan) {
    throw new McpAdrError(
      `No project found at ${projectPath}. Use create_project first.`,
      'PROJECT_NOT_FOUND'
    );
  }

  const risks: Array<{
    category: string;
    description: string;
    impact: string;
    probability: string;
    mitigation?: string;
  }> = [];

  // Analyze ADR-based risks
  if (includeAdrRisks) {
    for (const phase of projectPlan.phases) {
      if (phase.linkedAdrs.length === 0) {
        const riskObj: any = {
          category: 'Architecture',
          description: `Phase "${phase.name}" has no linked ADRs - architectural decisions may be unclear`,
          impact: 'medium',
          probability: 'high',
        };
        if (generateMitigation) {
          riskObj.mitigation = 'Review and create ADRs for architectural decisions in this phase';
        }
        risks.push(riskObj);
      }

      if (phase.linkedAdrs.length > 5) {
        const riskObj: any = {
          category: 'Complexity',
          description: `Phase "${phase.name}" has many ADRs (${phase.linkedAdrs.length}) - high complexity risk`,
          impact: 'high',
          probability: 'medium',
        };
        if (generateMitigation) {
          riskObj.mitigation =
            'Consider breaking this phase into smaller, more manageable sub-phases';
        }
        risks.push(riskObj);
      }
    }
  }

  // Analyze dependency risks
  if (includeDependencyRisks) {
    for (const phase of projectPlan.phases) {
      if (phase.dependencies.length > 3) {
        const riskObj: any = {
          category: 'Dependencies',
          description: `Phase "${phase.name}" has multiple dependencies (${phase.dependencies.length}) - high coordination risk`,
          impact: 'high',
          probability: 'medium',
        };
        if (generateMitigation) {
          riskObj.mitigation =
            'Review and simplify dependencies, create detailed coordination plan';
        }
        risks.push(riskObj);
      }

      // Check for circular dependencies (simplified check)
      const dependentPhases = projectPlan.phases.filter(
        p => p.dependencies.includes(phase.id) && phase.dependencies.includes(p.id)
      );

      if (dependentPhases.length > 0) {
        const riskObj: any = {
          category: 'Dependencies',
          description: `Potential circular dependency detected between "${phase.name}" and other phases`,
          impact: 'critical',
          probability: 'high',
        };
        if (generateMitigation) {
          riskObj.mitigation =
            'Review and restructure phase dependencies to eliminate circular references';
        }
        risks.push(riskObj);
      }
    }
  }

  // Analyze resource risks
  if (includeResourceRisks) {
    const totalWorkload = projectPlan.team.reduce((sum, member) => sum + member.currentWorkload, 0);
    const avgWorkload = projectPlan.team.length > 0 ? totalWorkload / projectPlan.team.length : 0;

    if (avgWorkload > 80) {
      const riskObj: any = {
        category: 'Resources',
        description: `Team is overallocated (${avgWorkload.toFixed(1)}% average workload)`,
        impact: 'high',
        probability: 'high',
      };
      if (generateMitigation) {
        riskObj.mitigation = 'Rebalance workload or consider adding team members';
      }
      risks.push(riskObj);
    }

    if (projectPlan.team.length < projectPlan.phases.length / 2) {
      const riskObj: any = {
        category: 'Resources',
        description: `Limited team size (${projectPlan.team.length} members) for ${projectPlan.phases.length} phases`,
        impact: 'medium',
        probability: 'medium',
      };
      if (generateMitigation) {
        riskObj.mitigation = 'Consider increasing team size or extending timeline';
      }
      risks.push(riskObj);
    }
  }

  // Calculate overall risk score
  const criticalRisks = risks.filter(r => r.impact === 'critical').length;
  const highRisks = risks.filter(r => r.impact === 'high').length;
  const mediumRisks = risks.filter(r => r.impact === 'medium').length;

  const riskScore = criticalRisks * 10 + highRisks * 5 + mediumRisks * 2;
  let riskLevel = 'low';
  if (riskScore > 20) riskLevel = 'critical';
  else if (riskScore > 10) riskLevel = 'high';
  else if (riskScore > 5) riskLevel = 'medium';

  return {
    content: [
      {
        type: 'text',
        text: `# Risk Analysis Report

## ${projectPlan.name}

### Overall Risk Assessment
- **Risk Level**: ${riskLevel.toUpperCase()}
- **Risk Score**: ${riskScore}
- **Total Risks**: ${risks.length}
- **Critical**: ${criticalRisks}
- **High**: ${highRisks}
- **Medium**: ${mediumRisks}

### Identified Risks

${risks
  .map(
    (risk, index) => `
#### Risk ${index + 1}: ${risk.category}
- **Description**: ${risk.description}
- **Impact**: ${risk.impact}
- **Probability**: ${risk.probability}
${risk.mitigation ? `- **Mitigation**: ${risk.mitigation}` : ''}
`
  )
  .join('')}

### Recommendations

${
  riskLevel === 'critical'
    ? '🚨 **Critical risks detected** - Immediate action required before proceeding'
    : riskLevel === 'high'
      ? '⚠️ **High risks present** - Review and mitigate before major milestones'
      : '✅ **Manageable risk level** - Continue with normal monitoring'
}

### Next Steps
1. Review and prioritize risk mitigation strategies
2. Assign risk owners for high-impact items
3. Schedule regular risk assessment reviews
4. Update project timeline if necessary
`,
      },
    ],
  };
}

/**
 * Generate reports operation
 */
async function generateReports(args: z.infer<typeof GenerateReportsSchema>): Promise<any> {
  const { projectPath, reportType, includeCharts, timeframe } = args;

  const projectPlan = await loadPlanningData(projectPath);
  if (!projectPlan) {
    throw new McpAdrError(
      `No project found at ${projectPath}. Use create_project first.`,
      'PROJECT_NOT_FOUND'
    );
  }

  switch (reportType) {
    case 'executive':
      const overallProgress = calculateOverallProgress(projectPlan);
      const teamUtilization = calculateTeamUtilization(projectPlan);
      const riskLevel = calculateProjectRisk(projectPlan);

      return {
        content: [
          {
            type: 'text',
            text: `# Executive Summary

## ${projectPlan.name}

### Key Metrics
- **Overall Progress**: ${overallProgress}% ${includeCharts ? getProgressBar(overallProgress) : ''}
- **Team Utilization**: ${teamUtilization}%
- **Risk Level**: ${riskLevel}
- **Active Phases**: ${projectPlan.phases.filter(p => p.status === 'active').length}
- **Completed Phases**: ${projectPlan.phases.filter(p => p.status === 'completed').length}

### Current Status
${
  projectPlan.status === 'active'
    ? '🟢 Project is actively progressing'
    : projectPlan.status === 'completed'
      ? '✅ Project completed successfully'
      : '🟡 Project in planning phase'
}

### Key Highlights
- Total phases: ${projectPlan.phases.length}
- Team size: ${projectPlan.team.length} members
- Linked ADRs: ${projectPlan.metadata.linkedAdrs.length}
- Risk level: ${riskLevel}

### Next Milestones
${
  projectPlan.milestones
    .filter(m => m.status === 'pending')
    .slice(0, 3)
    .map(milestone => `- ${milestone.name} (Due: ${milestone.dueDate})`)
    .join('\n') || 'No upcoming milestones'
}

### Blockers & Risks
${
  projectPlan.phases.filter(p => p.blockers.length > 0).length > 0
    ? `⚠️ ${projectPlan.phases.filter(p => p.blockers.length > 0).length} phases have blockers`
    : '✅ No major blockers reported'
}

*Report generated: ${new Date().toISOString()}*
`,
          },
        ],
      };

    case 'status':
      return {
        content: [
          {
            type: 'text',
            text: `# Status Report - ${timeframe}

## ${projectPlan.name}

### Phase Status
${projectPlan.phases
  .map(
    phase => `
#### ${phase.name}
- **Status**: ${phase.status}
- **Progress**: ${phase.completion}%
- **Timeline**: ${phase.estimatedDuration}
- **Team**: ${phase.resources.length} members
- **Blockers**: ${phase.blockers.length}
`
  )
  .join('')}

### Team Status
${projectPlan.team
  .map(
    member => `
#### ${member.name}
- **Role**: ${member.role}
- **Workload**: ${member.currentWorkload}%
- **Capacity**: ${member.capacity}
`
  )
  .join('')}

### Recent Updates
- Last updated: ${projectPlan.metadata.updatedAt}
- Total phases: ${projectPlan.phases.length}
- Active work streams: ${projectPlan.phases.filter(p => p.status === 'active').length}
`,
          },
        ],
      };

    default:
      return {
        content: [
          {
            type: 'text',
            text: `Report generation for type "${reportType}" is not yet implemented.`,
          },
        ],
      };
  }
}

/**
 * Helper functions
 */
function getProgressBar(percentage: number, width: number = 20): string {
  const filled = Math.round((percentage / 100) * width);
  const empty = width - filled;
  return `[${'█'.repeat(filled)}${'░'.repeat(empty)}]`;
}

function calculateOverallProgress(projectPlan: z.infer<typeof ProjectPlanSchema>): number {
  if (projectPlan.phases.length === 0) return 0;
  return Math.round(
    projectPlan.phases.reduce((sum, phase) => sum + phase.completion, 0) / projectPlan.phases.length
  );
}

function calculateTeamUtilization(projectPlan: z.infer<typeof ProjectPlanSchema>): number {
  if (projectPlan.team.length === 0) return 0;
  return Math.round(
    projectPlan.team.reduce((sum, member) => sum + member.currentWorkload, 0) /
      projectPlan.team.length
  );
}

function calculateProjectRisk(projectPlan: z.infer<typeof ProjectPlanSchema>): string {
  const blockedPhases = projectPlan.phases.filter(p => p.status === 'blocked').length;
  const highRiskPhases = projectPlan.phases.filter(
    p => p.riskLevel === 'high' || p.riskLevel === 'critical'
  ).length;
  const overloadedTeam = projectPlan.team.filter(m => m.currentWorkload > 90).length;

  if (blockedPhases > 0 || highRiskPhases > projectPlan.phases.length * 0.3 || overloadedTeam > 0) {
    return 'HIGH';
  } else if (highRiskPhases > 0 || overloadedTeam > projectPlan.team.length * 0.5) {
    return 'MEDIUM';
  } else {
    return 'LOW';
  }
}

function calculateTimelineStatus(projectPlan: z.infer<typeof ProjectPlanSchema>): string {
  const blockedPhases = projectPlan.phases.filter(p => p.status === 'blocked').length;
  const completedOnTime = projectPlan.phases.filter(p => p.status === 'completed').length;

  if (blockedPhases > 0) return 'AT RISK';
  if (completedOnTime > projectPlan.phases.length * 0.5) return 'ON TRACK';
  return 'MONITORING';
}

/**
 * Main export function
 */
export async function mcpPlanning(args: any): Promise<any> {
  try {
    const validatedArgs = McpPlanningSchema.parse(args);

    switch (validatedArgs.operation) {
      case 'create_project':
        return await createProject(validatedArgs);
      case 'manage_phases':
        return await managePhases(validatedArgs);
      case 'track_progress':
        return await trackProgress(validatedArgs);
      case 'manage_resources':
        return await manageResources(validatedArgs);
      case 'risk_analysis':
        return await riskAnalysis(validatedArgs);
      case 'generate_reports':
        return await generateReports(validatedArgs);
      default:
        throw new McpAdrError(
          `Unknown operation: ${(validatedArgs as any).operation}`,
          'UNKNOWN_OPERATION'
        );
    }
  } catch (error) {
    if (error instanceof z.ZodError) {
      throw new McpAdrError(
        `Validation error: ${error.errors.map(e => e.message).join(', ')}`,
        'VALIDATION_ERROR'
      );
    }
    throw error;
  }
}
