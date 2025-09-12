/**
 * Large Data Utilities
 *
 * Provides efficient utilities for handling large datasets in TODO operations
 * Enhanced with lodash for optimal performance
 */

import _ from 'lodash';
import { TodoJsonData, TodoTask } from '../types/todo-json-schemas.js';
import { createComponentLogger } from './enhanced-logging.js';

const logger = createComponentLogger('LargeDataUtils');

export interface DataProcessingOptions {
  batchSize?: number;
  parallel?: boolean;
  maxConcurrency?: number;
}

export interface BatchProcessingResult<T> {
  results: T[];
  processingTime: number;
  batchCount: number;
  errors: Error[];
}

/**
 * Process large arrays in batches to improve performance and memory usage
 */
export async function processInBatches<T, R>(
  items: T[],
  processor: (batch: T[]) => Promise<R[]>,
  options: DataProcessingOptions = {}
): Promise<BatchProcessingResult<R>> {
  const startTime = Date.now();
  const batchSize = options.batchSize || 100;
  const results: R[] = [];
  const errors: Error[] = [];

  // Use lodash for efficient chunking
  const batches = _.chunk(items, batchSize);

  logger.info('Starting batch processing', {
    totalItems: items.length,
    batchSize,
    batchCount: batches.length,
    parallel: options.parallel,
  });

  if (options.parallel) {
    // Process batches in parallel with concurrency limit
    const concurrency = options.maxConcurrency || 3;
    const batchPromises = batches.map(async (batch, index) => {
      try {
        const batchResults = await processor(batch);
        logger.debug(`Batch ${index + 1} completed`, {
          batchSize: batch.length,
          resultsCount: batchResults.length,
        });
        return batchResults;
      } catch (error) {
        logger.error(`Batch ${index + 1} failed`, error as Error);
        errors.push(error as Error);
        return [];
      }
    });

    // Use lodash's throttling for controlled parallel execution
    const throttledPromises = _.chunk(batchPromises, concurrency);

    for (const promiseChunk of throttledPromises) {
      const chunkResults = await Promise.all(promiseChunk);
      results.push(..._.flatten(chunkResults));
    }
  } else {
    // Process batches sequentially
    for (let i = 0; i < batches.length; i++) {
      try {
        const batch = batches[i];
        if (!batch) continue;

        const batchResults = await processor(batch);
        results.push(...batchResults);

        logger.debug(`Sequential batch ${i + 1}/${batches.length} completed`, {
          batchSize: batch.length,
          resultsCount: batchResults.length,
        });
      } catch (error) {
        logger.error(`Sequential batch ${i + 1} failed`, error as Error);
        errors.push(error as Error);
      }
    }
  }

  const processingTime = Date.now() - startTime;

  logger.info('Batch processing completed', {
    totalResults: results.length,
    processingTime,
    errorCount: errors.length,
  });

  return {
    results,
    processingTime,
    batchCount: batches.length,
    errors,
  };
}

/**
 * Efficiently filter and group large task collections
 */
export function filterAndGroupTasks(
  tasks: Record<string, TodoTask>,
  criteria: {
    status?: string[];
    priority?: string[];
    hasDeadline?: boolean;
    archived?: boolean;
  } = {}
): { [key: string]: TodoTask[] } {
  const startTime = Date.now();

  // Use lodash for efficient filtering and grouping
  const filteredTasks = _.pickBy(tasks, (task: TodoTask) => {
    if (criteria.status && !criteria.status.includes(task.status)) {
      return false;
    }
    if (criteria.priority && !criteria.priority.includes(task.priority || 'medium')) {
      return false;
    }
    if (criteria.hasDeadline !== undefined) {
      const hasDeadline = Boolean(task.dueDate);
      if (criteria.hasDeadline !== hasDeadline) {
        return false;
      }
    }
    if (criteria.archived !== undefined && task.archived !== criteria.archived) {
      return false;
    }
    return true;
  });

  // Group by status for efficient organization
  const grouped = _.groupBy(filteredTasks, 'status');

  const processingTime = Date.now() - startTime;
  logger.debug('Task filtering and grouping completed', {
    originalCount: Object.keys(tasks).length,
    filteredCount: Object.keys(filteredTasks).length,
    groupCount: Object.keys(grouped).length,
    processingTime,
  });

  return grouped;
}

/**
 * Efficiently find task dependencies and create dependency map
 */
export function createDependencyMap(tasks: Record<string, TodoTask>): Map<string, string[]> {
  const dependencyMap = new Map<string, string[]>();

  // Use lodash for efficient iteration and filtering
  _.forEach(tasks, (task, taskId) => {
    if (task.dependencies && task.dependencies.length > 0) {
      // Filter out invalid dependencies
      const validDependencies = _.filter(
        task.dependencies,
        depId => tasks[depId] && !tasks[depId].archived
      ) as string[];

      if (validDependencies.length > 0) {
        dependencyMap.set(taskId, validDependencies);
      }
    }
  });

  return dependencyMap;
}

/**
 * Efficiently merge and deduplicate large arrays
 */
export function mergeAndDeduplicateArrays<T>(
  arrays: T[][],
  keySelector?: (item: T) => string | number
): T[] {
  const startTime = Date.now();

  // Use lodash for efficient merging and deduplication
  const merged = _.flatten(arrays);

  const result = keySelector ? _.uniqBy(merged, keySelector) : _.uniq(merged);

  const processingTime = Date.now() - startTime;
  logger.debug('Array merge and deduplication completed', {
    inputArrays: arrays.length,
    totalItems: merged.length,
    uniqueItems: result.length,
    processingTime,
  });

  return result;
}

/**
 * Deep clone large objects efficiently
 */
export function deepCloneData<T>(data: T): T {
  const startTime = Date.now();

  // Use lodash's optimized deep clone
  const cloned = _.cloneDeep(data);

  const processingTime = Date.now() - startTime;
  logger.debug('Deep clone completed', {
    processingTime,
    dataSize: JSON.stringify(data).length,
  });

  return cloned;
}

/**
 * Efficiently search through large task collections
 */
export function searchTasks(
  tasks: Record<string, TodoTask>,
  searchTerm: string,
  searchFields: (keyof TodoTask)[] = ['title', 'description']
): TodoTask[] {
  const startTime = Date.now();
  const searchTermLower = searchTerm.toLowerCase();

  // Use lodash for efficient searching
  const results = _.filter(tasks, (task: TodoTask) => {
    return _.some(searchFields, field => {
      const fieldValue = task[field];
      if (typeof fieldValue === 'string') {
        return fieldValue.toLowerCase().includes(searchTermLower);
      }
      return false;
    });
  });

  const processingTime = Date.now() - startTime;
  logger.debug('Task search completed', {
    searchTerm,
    searchFields,
    totalTasks: Object.keys(tasks).length,
    resultsCount: results.length,
    processingTime,
  });

  return results;
}

/**
 * Create efficient summary statistics for large datasets
 */
export function createDataSummary(data: TodoJsonData): {
  taskCount: number;
  completedTasks: number;
  priorityDistribution: { [key: string]: number };
  statusDistribution: { [key: string]: number };
  avgTasksPerSection: number;
  taskWithDependencies: number;
  orphanedTasks: number;
} {
  const tasks = Object.values(data.tasks || {});

  // Use lodash for efficient aggregation
  const priorityDistribution = _.countBy(tasks, 'priority');
  const statusDistribution = _.countBy(tasks, 'status');

  const completedTasks = _.filter(tasks, { status: 'completed' }).length;
  const taskWithDependencies = _.filter(
    tasks,
    task => task.dependencies && task.dependencies.length > 0
  ).length;

  // Calculate orphaned tasks (tasks not in any section)
  const tasksInSections = new Set(
    _.flatten((data.sections || []).map(section => section.tasks || []))
  );
  const orphanedTasks = tasks.filter(task => !tasksInSections.has(task.id)).length;

  const avgTasksPerSection = data.sections?.length
    ? _.mean(data.sections.map(section => section.tasks?.length || 0))
    : 0;

  return {
    taskCount: tasks.length,
    completedTasks,
    priorityDistribution,
    statusDistribution,
    avgTasksPerSection: Math.round(avgTasksPerSection * 100) / 100,
    taskWithDependencies,
    orphanedTasks,
  };
}
