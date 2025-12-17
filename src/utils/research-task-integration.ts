/**
 * MCP Tasks Integration for Research Orchestrator
 *
 * This module provides standardized task tracking for research operations,
 * implementing ADR-020: MCP Tasks Integration Strategy.
 *
 * Key features:
 * - Creates MCP Tasks for research operations
 * - Returns research plans for LLM delegation (non-blocking)
 * - Tracks progress through research phases
 * - Supports cancellation between phases
 *
 * @see ADR-020: MCP Tasks Integration Strategy
 * @see https://modelcontextprotocol.io/specification/2025-11-25/basic/utilities/tasks
 */

import { getTaskManager, type AdrTask, type TaskResult, type TaskManager } from './task-manager.js';
import { createComponentLogger, type ComponentLogger } from './enhanced-logging.js';

const logger: ComponentLogger = createComponentLogger('ResearchTaskIntegration');

/**
 * Research phases that map to MCP Task phases
 */
export const RESEARCH_PHASES = [
  'initialization',
  'project_files_search',
  'knowledge_graph_query',
  'environment_analysis',
  'web_search',
  'synthesis',
] as const;

export type ResearchPhase = (typeof RESEARCH_PHASES)[number];

/**
 * Research task context for tracking state across research steps
 */
export interface ResearchTaskContext {
  taskId: string;
  currentPhase: ResearchPhase;
  question: string;
  projectPath: string;
  cancelled: boolean;
  projectFilesResult?: {
    filesFound: number;
    relevantFiles: string[];
    confidence: number;
  };
  knowledgeGraphResult?: {
    nodesFound: number;
    relationshipsFound: number;
    confidence: number;
  };
  environmentResult?: {
    capabilitiesFound: number;
    relevantData: Record<string, unknown>;
    confidence: number;
  };
  webSearchResult?: {
    resultsFound: number;
    sources: string[];
    confidence: number;
  };
  synthesizedAnswer?: string;
  overallConfidence?: number;
}

/**
 * Options for creating a research task
 */
export interface CreateResearchTaskOptions {
  question: string;
  projectPath: string;
  includeWebSearch?: boolean;
  confidenceThreshold?: number;
}

/**
 * Result from research task execution
 */
export interface ResearchTaskResult extends TaskResult {
  data?: {
    answer: string;
    confidence: number;
    sources: ResearchSource[];
    phasesCompleted: ResearchPhase[];
  };
}

/**
 * Research source from a phase
 */
export interface ResearchSource {
  type: 'project_files' | 'knowledge_graph' | 'environment' | 'web_search';
  confidence: number;
  data: unknown;
  timestamp: string;
}

/**
 * Research plan phase - describes a tool to execute
 */
export interface ResearchPlanPhase {
  phase: ResearchPhase;
  tool: string;
  params: Record<string, unknown>;
  purpose: string;
  condition?: string;
  expectedOutput: string;
}

/**
 * Research plan returned for LLM delegation
 */
export interface ResearchPlan {
  taskId: string;
  question: string;
  phases: ResearchPlanPhase[];
  synthesisInstructions: string;
  expectedResultFormat: string;
}

/**
 * Research Task Manager - Provides MCP Tasks integration for research operations
 *
 * This class wraps the TaskManager to provide research-specific functionality:
 * - Creates tasks with research phases
 * - Returns research plans for LLM delegation (non-blocking)
 * - Tracks research progress through multiple phases
 * - Supports cancellation between phases
 */
export class ResearchTaskManager {
  private taskManager: TaskManager;
  private activeContexts: Map<string, ResearchTaskContext> = new Map();

  constructor(taskManager?: TaskManager) {
    this.taskManager = taskManager ?? getTaskManager();
  }

  /**
   * Initialize the research task manager
   */
  async initialize(): Promise<void> {
    await this.taskManager.initialize();
    logger.info('ResearchTaskManager initialized');
  }

  /**
   * Create a new research task and return a research plan for LLM delegation
   *
   * This method does NOT execute research - it returns a plan that the calling
   * LLM should execute using atomic tools.
   *
   * @returns The created task, context, and research plan for LLM delegation
   */
  async createResearchTask(options: CreateResearchTaskOptions): Promise<{
    task: AdrTask;
    context: ResearchTaskContext;
    plan: ResearchPlan;
  }> {
    const { question, projectPath, includeWebSearch = true, confidenceThreshold = 0.6 } = options;

    const task = await this.taskManager.createTask({
      type: 'research',
      tool: 'research_orchestrator',
      phases: [...RESEARCH_PHASES],
      projectPath,
      ttl: 300000, // 5 minute TTL for research
      pollInterval: 1000,
    });

    const context: ResearchTaskContext = {
      taskId: task.taskId,
      currentPhase: 'initialization',
      question,
      projectPath,
      cancelled: false,
    };

    this.activeContexts.set(task.taskId, context);

    // Generate research plan for LLM delegation
    const plan = this.generateResearchPlan(
      task.taskId,
      question,
      projectPath,
      includeWebSearch,
      confidenceThreshold
    );

    logger.info('Research task created with LLM delegation plan', {
      taskId: task.taskId,
      question,
      projectPath,
      phasesCount: plan.phases.length,
    });

    return { task, context, plan };
  }

  /**
   * Generate a research plan for LLM delegation
   *
   * This creates a structured plan that tells the calling LLM what tools
   * to use and in what order to complete the research.
   */
  private generateResearchPlan(
    taskId: string,
    question: string,
    projectPath: string,
    includeWebSearch: boolean,
    confidenceThreshold: number
  ): ResearchPlan {
    const phases: ResearchPlanPhase[] = [
      {
        phase: 'project_files_search',
        tool: 'searchCodebase',
        params: {
          query: question,
          projectPath,
          includeAdr: true,
          maxResults: 20,
        },
        purpose: 'Search project files for relevant code, documentation, and ADRs',
        expectedOutput: 'List of relevant files with content snippets and relevance scores',
      },
      {
        phase: 'knowledge_graph_query',
        tool: 'query_knowledge_graph',
        params: {
          question,
          projectPath,
        },
        purpose: 'Query the knowledge graph for architectural decisions and relationships',
        expectedOutput: 'Nodes and relationships relevant to the question',
      },
      {
        phase: 'environment_analysis',
        tool: 'environment_analysis',
        params: {
          projectPath,
          analysisType: 'research',
        },
        purpose: 'Analyze the runtime environment for relevant capabilities and context',
        expectedOutput: 'Environment capabilities and configuration relevant to the question',
      },
    ];

    if (includeWebSearch) {
      phases.push({
        phase: 'web_search',
        tool: 'web_search',
        params: {
          query: question,
          maxResults: 5,
        },
        purpose: 'Search the web for external information if internal sources are insufficient',
        condition: `Only execute if overall confidence from previous phases is below ${confidenceThreshold}`,
        expectedOutput: 'Web search results with relevant external information',
      });
    }

    return {
      taskId,
      question,
      phases,
      synthesisInstructions: `
After executing the applicable phases, synthesize the results into a comprehensive answer:

1. **Combine Sources**: Merge information from all phases that returned useful data
2. **Calculate Confidence**: Weight each source by its confidence score:
   - project_files: 0.9 weight
   - knowledge_graph: 0.85 weight
   - environment: 0.95 weight
   - web_search: 0.7 weight
3. **Identify Conflicts**: Note any conflicting information between sources
4. **Provide Answer**: Generate a clear, actionable answer to the original question
5. **Cite Sources**: Reference which phase(s) provided each piece of information

Report progress by calling updateResearchProgress() after each phase completes.
`,
      expectedResultFormat: `{
  "answer": "The synthesized answer to the question",
  "confidence": 0.0-1.0,
  "sources": [
    { "type": "project_files|knowledge_graph|environment|web_search", "confidence": 0.0-1.0, "data": {...} }
  ],
  "phasesCompleted": ["phase1", "phase2", ...]
}`,
    };
  }

  /**
   * Get research task context
   */
  getContext(taskId: string): ResearchTaskContext | undefined {
    return this.activeContexts.get(taskId);
  }

  /**
   * Start a research phase
   */
  async startPhase(taskId: string, phase: ResearchPhase, message?: string): Promise<void> {
    const context = this.activeContexts.get(taskId);
    if (!context) {
      logger.warn('No context found for task', { taskId });
      return;
    }

    if (context.cancelled) {
      throw new Error('Task was cancelled');
    }

    context.currentPhase = phase;

    await this.taskManager.startPhase(taskId, phase);

    const phaseIndex = RESEARCH_PHASES.indexOf(phase);
    const phaseProgress =
      phaseIndex >= 0 ? Math.floor((phaseIndex / RESEARCH_PHASES.length) * 100) : 0;

    await this.taskManager.updateProgress({
      taskId,
      progress: phaseProgress,
      phase,
      phaseProgress: 0,
      ...(message !== undefined && { message }),
    });

    logger.info('Research phase started', { taskId, phase, progress: phaseProgress });
  }

  /**
   * Update phase progress
   */
  async updatePhaseProgress(
    taskId: string,
    phase: ResearchPhase,
    phaseProgress: number,
    message?: string
  ): Promise<void> {
    const context = this.activeContexts.get(taskId);
    if (!context) {
      return;
    }

    const phaseIndex = RESEARCH_PHASES.indexOf(phase);
    const phaseFraction = 100 / RESEARCH_PHASES.length;
    const baseProgress = phaseIndex * phaseFraction;
    const overallProgress = Math.floor(baseProgress + (phaseProgress / 100) * phaseFraction);

    await this.taskManager.updateProgress({
      taskId,
      progress: overallProgress,
      phase,
      phaseProgress,
      ...(message !== undefined && { message }),
    });
  }

  /**
   * Complete a research phase
   */
  async completePhase(taskId: string, phase: ResearchPhase, _message?: string): Promise<void> {
    const context = this.activeContexts.get(taskId);
    if (!context) {
      return;
    }

    await this.taskManager.completePhase(taskId, phase);

    logger.info('Research phase completed', { taskId, phase });
  }

  /**
   * Fail a research phase
   */
  async failPhase(taskId: string, phase: ResearchPhase, error: string): Promise<void> {
    const context = this.activeContexts.get(taskId);
    if (!context) {
      return;
    }

    await this.taskManager.failPhase(taskId, phase, error);

    logger.warn('Research phase failed', { taskId, phase, error });
  }

  /**
   * Store project files search result
   */
  async storeProjectFilesResult(
    taskId: string,
    result: { filesFound: number; relevantFiles: string[]; confidence: number }
  ): Promise<void> {
    const context = this.activeContexts.get(taskId);
    if (!context) {
      return;
    }

    context.projectFilesResult = result;

    await this.taskManager.updateProgress({
      taskId,
      progress: 20,
      message: `Found ${result.filesFound} files, ${result.relevantFiles.length} relevant (${Math.round(result.confidence * 100)}% confidence)`,
    });

    logger.info('Project files result stored', { taskId, ...result });
  }

  /**
   * Store knowledge graph query result
   */
  async storeKnowledgeGraphResult(
    taskId: string,
    result: { nodesFound: number; relationshipsFound: number; confidence: number }
  ): Promise<void> {
    const context = this.activeContexts.get(taskId);
    if (!context) {
      return;
    }

    context.knowledgeGraphResult = result;

    await this.taskManager.updateProgress({
      taskId,
      progress: 40,
      message: `Found ${result.nodesFound} nodes, ${result.relationshipsFound} relationships (${Math.round(result.confidence * 100)}% confidence)`,
    });

    logger.info('Knowledge graph result stored', { taskId, ...result });
  }

  /**
   * Store environment analysis result
   */
  async storeEnvironmentResult(
    taskId: string,
    result: { capabilitiesFound: number; relevantData: Record<string, unknown>; confidence: number }
  ): Promise<void> {
    const context = this.activeContexts.get(taskId);
    if (!context) {
      return;
    }

    context.environmentResult = result;

    await this.taskManager.updateProgress({
      taskId,
      progress: 60,
      message: `Found ${result.capabilitiesFound} capabilities (${Math.round(result.confidence * 100)}% confidence)`,
    });

    logger.info('Environment result stored', {
      taskId,
      capabilitiesFound: result.capabilitiesFound,
    });
  }

  /**
   * Store web search result
   */
  async storeWebSearchResult(
    taskId: string,
    result: { resultsFound: number; sources: string[]; confidence: number }
  ): Promise<void> {
    const context = this.activeContexts.get(taskId);
    if (!context) {
      return;
    }

    context.webSearchResult = result;

    await this.taskManager.updateProgress({
      taskId,
      progress: 80,
      message: `Found ${result.resultsFound} web results from ${result.sources.length} sources (${Math.round(result.confidence * 100)}% confidence)`,
    });

    logger.info('Web search result stored', { taskId, ...result });
  }

  /**
   * Store synthesized answer
   */
  async storeSynthesizedAnswer(taskId: string, answer: string, confidence: number): Promise<void> {
    const context = this.activeContexts.get(taskId);
    if (!context) {
      return;
    }

    context.synthesizedAnswer = answer;
    context.overallConfidence = confidence;

    await this.taskManager.updateProgress({
      taskId,
      progress: 95,
      message: `Answer synthesized (${Math.round(confidence * 100)}% confidence)`,
    });

    logger.info('Synthesized answer stored', { taskId, confidence });
  }

  /**
   * Check if task is cancelled
   */
  async isCancelled(taskId: string): Promise<boolean> {
    const context = this.activeContexts.get(taskId);
    if (!context) {
      return false;
    }

    const task = await this.taskManager.getTask(taskId);
    if (task?.status === 'cancelled') {
      context.cancelled = true;
    }

    return context.cancelled;
  }

  /**
   * Cancel a research task
   */
  async cancelTask(taskId: string, reason?: string): Promise<void> {
    const context = this.activeContexts.get(taskId);
    if (context) {
      context.cancelled = true;
    }

    await this.taskManager.cancelTask(taskId, reason ?? 'Research cancelled by user');
    this.activeContexts.delete(taskId);

    logger.info('Research task cancelled', { taskId, reason });
  }

  /**
   * Complete a research task successfully
   */
  async completeTask(taskId: string, result: ResearchTaskResult): Promise<void> {
    await this.taskManager.completeTask(taskId, result);
    this.activeContexts.delete(taskId);

    logger.info('Research task completed', { taskId, success: result.success });
  }

  /**
   * Fail a research task
   */
  async failTask(taskId: string, error: string): Promise<void> {
    await this.taskManager.failTask(taskId, error);
    this.activeContexts.delete(taskId);

    logger.error('Research task failed', undefined, { taskId, error });
  }

  /**
   * Get task status
   */
  async getTaskStatus(taskId: string): Promise<{
    task: AdrTask | null;
    context: ResearchTaskContext | undefined;
  }> {
    const task = await this.taskManager.getTask(taskId);
    const context = this.activeContexts.get(taskId);
    return { task, context };
  }
}

/**
 * Get the global ResearchTaskManager instance
 */
let globalResearchTaskManager: ResearchTaskManager | null = null;

export function getResearchTaskManager(): ResearchTaskManager {
  if (!globalResearchTaskManager) {
    globalResearchTaskManager = new ResearchTaskManager();
  }
  return globalResearchTaskManager;
}

/**
 * Reset the global ResearchTaskManager (for testing)
 */
export async function resetResearchTaskManager(): Promise<void> {
  globalResearchTaskManager = null;
}

/**
 * Helper function to create a research task and get the LLM delegation plan
 *
 * This is the primary entry point for research operations. It:
 * 1. Creates an MCP Task for tracking
 * 2. Returns a research plan for the calling LLM to execute
 * 3. The LLM executes each phase using atomic tools
 * 4. The LLM reports progress back via the tracker interface
 *
 * @example
 * ```typescript
 * const { taskId, plan, tracker } = await createResearchWithDelegation({
 *   question: 'How does authentication work in this codebase?',
 *   projectPath: '/path/to/project',
 * });
 *
 * // LLM receives the plan and executes each phase:
 * // Phase 1: searchCodebase({ query: question, ... })
 * // Phase 2: query_knowledge_graph({ question, ... })
 * // etc.
 *
 * // After each phase, LLM reports progress:
 * await tracker.storeProjectFilesResult({ filesFound: 10, ... });
 * await tracker.completePhase('project_files_search');
 *
 * // Finally, LLM synthesizes and completes:
 * await tracker.storeSynthesizedAnswer(answer, confidence);
 * await tracker.complete({ success: true, data: { answer, ... } });
 * ```
 */
export async function createResearchWithDelegation(options: CreateResearchTaskOptions): Promise<{
  taskId: string;
  plan: ResearchPlan;
  tracker: ResearchTaskTracker;
}> {
  const rtm = getResearchTaskManager();
  await rtm.initialize();

  const { task, context, plan } = await rtm.createResearchTask(options);
  const taskId = task.taskId;

  const tracker: ResearchTaskTracker = {
    taskId,
    startPhase: (phase, message) => rtm.startPhase(taskId, phase, message),
    updatePhaseProgress: (phase, progress, message) =>
      rtm.updatePhaseProgress(taskId, phase, progress, message),
    completePhase: (phase, message) => rtm.completePhase(taskId, phase, message),
    failPhase: (phase, error) => rtm.failPhase(taskId, phase, error),
    storeProjectFilesResult: result => rtm.storeProjectFilesResult(taskId, result),
    storeKnowledgeGraphResult: result => rtm.storeKnowledgeGraphResult(taskId, result),
    storeEnvironmentResult: result => rtm.storeEnvironmentResult(taskId, result),
    storeWebSearchResult: result => rtm.storeWebSearchResult(taskId, result),
    storeSynthesizedAnswer: (answer, confidence) =>
      rtm.storeSynthesizedAnswer(taskId, answer, confidence),
    isCancelled: () => rtm.isCancelled(taskId),
    cancel: reason => rtm.cancelTask(taskId, reason),
    complete: result => rtm.completeTask(taskId, result),
    fail: error => rtm.failTask(taskId, error),
    getContext: () => context,
  };

  return { taskId, plan, tracker };
}

/**
 * Task tracker interface provided to LLM for research execution
 */
export interface ResearchTaskTracker {
  taskId: string;
  startPhase: (phase: ResearchPhase, message?: string) => Promise<void>;
  updatePhaseProgress: (phase: ResearchPhase, progress: number, message?: string) => Promise<void>;
  completePhase: (phase: ResearchPhase, message?: string) => Promise<void>;
  failPhase: (phase: ResearchPhase, error: string) => Promise<void>;
  storeProjectFilesResult: (result: {
    filesFound: number;
    relevantFiles: string[];
    confidence: number;
  }) => Promise<void>;
  storeKnowledgeGraphResult: (result: {
    nodesFound: number;
    relationshipsFound: number;
    confidence: number;
  }) => Promise<void>;
  storeEnvironmentResult: (result: {
    capabilitiesFound: number;
    relevantData: Record<string, unknown>;
    confidence: number;
  }) => Promise<void>;
  storeWebSearchResult: (result: {
    resultsFound: number;
    sources: string[];
    confidence: number;
  }) => Promise<void>;
  storeSynthesizedAnswer: (answer: string, confidence: number) => Promise<void>;
  isCancelled: () => Promise<boolean>;
  cancel: (reason?: string) => Promise<void>;
  complete: (result: ResearchTaskResult) => Promise<void>;
  fail: (error: string) => Promise<void>;
  getContext: () => ResearchTaskContext;
}
