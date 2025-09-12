/**
 * JSON Performance Utilities
 *
 * Enhanced JSON processing using fast-json-stringify
 * for improved performance with large datasets
 */

import fastStringify from 'fast-json-stringify';
import { TodoJsonData, TodoTask } from '../types/todo-json-schemas.js';
import { createComponentLogger } from './enhanced-logging.js';

const logger = createComponentLogger('JSONPerformanceUtils');

// Define schemas for fast-json-stringify with proper types
const todoTaskSchema = {
  type: 'object' as const,
  properties: {
    id: { type: 'string' as const },
    title: { type: 'string' as const },
    status: { type: 'string' as const },
    createdAt: { type: 'string' as const },
    updatedAt: { type: 'string' as const },
    dueDate: { type: 'string' as const },
    priority: { type: 'string' as const },
    tags: { type: 'array' as const, items: { type: 'string' as const } },
    dependencies: { type: 'array' as const, items: { type: 'string' as const } },
    subtasks: { type: 'array' as const, items: { type: 'string' as const } },
    parentTaskId: { type: 'string' as const },
    archived: { type: 'boolean' as const },
    description: { type: 'string' as const },
    estimatedHours: { type: 'number' as const },
    actualHours: { type: 'number' as const },
  },
};

const todoJsonDataSchema = {
  type: 'object' as const,
  properties: {
    tasks: {
      type: 'object' as const,
      additionalProperties: todoTaskSchema,
    },
    sections: {
      type: 'array' as const,
      items: {
        type: 'object' as const,
        properties: {
          id: { type: 'string' as const },
          title: { type: 'string' as const },
          tasks: { type: 'array' as const, items: { type: 'string' as const } },
          type: { type: 'string' as const },
          order: { type: 'number' as const },
        },
      },
    },
    metadata: {
      type: 'object' as const,
      properties: {
        totalTasks: { type: 'number' as const },
        completedTasks: { type: 'number' as const },
        lastUpdated: { type: 'string' as const },
        version: { type: 'string' as const },
        createdBy: { type: 'string' as const },
        lastModifiedBy: { type: 'string' as const },
      },
    },
    scoringSync: {
      type: 'object' as const,
      properties: {
        lastScoreUpdate: { type: 'string' as const },
        scoringVersion: { type: 'string' as const },
      },
    },
  },
};

// Create fast stringifiers
const stringifyTask = fastStringify(todoTaskSchema);
const stringifyTodoData = fastStringify(todoJsonDataSchema);

/**
 * Fast JSON stringification for TodoTask objects
 */
export function fastStringifyTask(task: TodoTask): string {
  const startTime = Date.now();
  try {
    const result = stringifyTask(task);
    const duration = Date.now() - startTime;

    logger.debug('Fast stringify task completed', {
      duration,
      inputSize: JSON.stringify(task).length,
      outputSize: result.length,
    });

    return result;
  } catch (error) {
    logger.warn('Fast stringify failed, falling back to JSON.stringify', {
      error: error instanceof Error ? error.message : String(error),
    });
    return JSON.stringify(task);
  }
}

/**
 * Fast JSON stringification for TodoJsonData objects
 */
export function fastStringifyTodoData(data: TodoJsonData): string {
  const startTime = Date.now();
  try {
    const result = stringifyTodoData(data);
    const duration = Date.now() - startTime;

    logger.debug('Fast stringify todo data completed', {
      duration,
      tasksCount: Object.keys(data.tasks || {}).length,
      sectionsCount: (data.sections || []).length,
      outputSize: result.length,
    });

    return result;
  } catch (error) {
    logger.warn('Fast stringify failed, falling back to JSON.stringify', {
      error: error instanceof Error ? error.message : String(error),
    });
    return JSON.stringify(data);
  }
}

/**
 * Simple JSON streaming processor (simplified without stream-json dependency)
 */
export async function processLargeJsonData(
  data: any,
  processor: (key: string, value: any) => Promise<void> | void
): Promise<{ processedCount: number; duration: number; errors: Error[] }> {
  const startTime = Date.now();
  let processedCount = 0;
  const errors: Error[] = [];

  try {
    // Process object recursively
    const processObject = async (obj: any, keyPrefix: string = ''): Promise<void> => {
      if (obj && typeof obj === 'object' && !Array.isArray(obj)) {
        for (const [key, value] of Object.entries(obj)) {
          try {
            const fullKey = keyPrefix ? `${keyPrefix}.${key}` : key;
            await processor(fullKey, value);
            processedCount++;

            // Recursively process nested objects
            if (value && typeof value === 'object') {
              await processObject(value, fullKey);
            }
          } catch (error) {
            errors.push(error as Error);
            logger.warn('Processing error', {
              key,
              error: error instanceof Error ? error.message : String(error),
            });
          }
        }
      } else if (Array.isArray(obj)) {
        for (let i = 0; i < obj.length; i++) {
          try {
            const key = `${keyPrefix}[${i}]`;
            await processor(key, obj[i]);
            processedCount++;

            if (obj[i] && typeof obj[i] === 'object') {
              await processObject(obj[i], key);
            }
          } catch (error) {
            errors.push(error as Error);
            logger.warn('Array processing error', {
              index: i,
              error: error instanceof Error ? error.message : String(error),
            });
          }
        }
      }
    };

    await processObject(data);

    const duration = Date.now() - startTime;
    logger.info('Data processing completed', {
      processedCount,
      duration,
      errorCount: errors.length,
    });

    return { processedCount, duration, errors };
  } catch (error) {
    logger.error('Data processing failed', error as Error);
    throw error;
  }
}

/**
 * Efficient JSON parsing with performance monitoring
 */
export function performanceParse<T = any>(
  jsonString: string
): {
  data: T;
  parseTime: number;
  inputSize: number;
} {
  const startTime = Date.now();
  const inputSize = jsonString.length;

  try {
    const data = JSON.parse(jsonString) as T;
    const parseTime = Date.now() - startTime;

    logger.debug('JSON parse completed', {
      parseTime,
      inputSize,
      dataType: typeof data,
    });

    return { data, parseTime, inputSize };
  } catch (error) {
    logger.error('JSON parse failed', error as Error);
    throw error;
  }
}

/**
 * Batch stringify multiple objects efficiently
 */
export function batchStringify<T>(
  objects: T[],
  schema?: any
): { results: string[]; totalTime: number; avgTimePerObject: number } {
  const startTime = Date.now();
  const results: string[] = [];

  // Use custom stringifier if schema provided
  const stringifier = schema ? fastStringify(schema) : JSON.stringify;

  for (const obj of objects) {
    try {
      const result = typeof stringifier === 'function' ? stringifier(obj) : JSON.stringify(obj);
      results.push(result);
    } catch (error) {
      logger.warn('Batch stringify item failed', {
        error: error instanceof Error ? error.message : String(error),
      });
      results.push(JSON.stringify(obj)); // Fallback
    }
  }

  const totalTime = Date.now() - startTime;
  const avgTimePerObject = totalTime / objects.length;

  logger.debug('Batch stringify completed', {
    objectCount: objects.length,
    totalTime,
    avgTimePerObject,
    totalOutputSize: results.reduce((sum, str) => sum + str.length, 0),
  });

  return { results, totalTime, avgTimePerObject };
}

/**
 * Compare performance between standard JSON and fast-json-stringify
 */
export function compareStringifyPerformance<T>(
  object: T,
  schema?: any,
  iterations: number = 1000
): {
  standardJson: { totalTime: number; avgTime: number };
  fastJson: { totalTime: number; avgTime: number };
  improvement: number;
} {
  const startTime = Date.now();

  // Test standard JSON.stringify
  const jsonStart = Date.now();
  for (let i = 0; i < iterations; i++) {
    JSON.stringify(object);
  }
  const jsonTime = Date.now() - jsonStart;

  // Test fast-json-stringify
  let fastTime = 0;
  if (schema) {
    const fastStringifier = fastStringify(schema);
    const fastStart = Date.now();
    for (let i = 0; i < iterations; i++) {
      try {
        fastStringifier(object);
      } catch (error) {
        JSON.stringify(object); // Fallback
      }
    }
    fastTime = Date.now() - fastStart;
  } else {
    fastTime = jsonTime; // No schema, so same performance
  }

  const totalTime = Date.now() - startTime;
  const improvement = jsonTime > 0 ? ((jsonTime - fastTime) / jsonTime) * 100 : 0;

  logger.info('Stringify performance comparison completed', {
    iterations,
    standardJsonTime: jsonTime,
    fastJsonTime: fastTime,
    improvementPercent: improvement.toFixed(2),
    totalTestTime: totalTime,
  });

  return {
    standardJson: { totalTime: jsonTime, avgTime: jsonTime / iterations },
    fastJson: { totalTime: fastTime, avgTime: fastTime / iterations },
    improvement,
  };
}
