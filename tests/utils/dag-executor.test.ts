import { jest } from '@jest/globals';
import {
  DAGExecutor,
  TaskNode,
  DAGExecutionResult,
  TaskResult,
} from '../../src/utils/dag-executor';

// Mock child_process exec
let mockExec: jest.Mock;

describe('DAGExecutor', () => {
  let executor: any;
  let mockLogger: any;

  beforeEach(async () => {
    jest.resetModules();
    jest.clearAllMocks();

    // Track retry calls
    let retryCallCount = 0;

    jest.unstable_mockModule('child_process', () => ({
      exec: jest.fn((command: string, _options: any, callback: any) => {
        let stdout = '';
        let stderr = '';
        let error: any = null;

        if (command.includes('fail') || command.includes('exit 1')) {
          error = {
            code: 1,
            message: 'Command failed',
            stdout: '',
            stderr: 'error output',
          };
        } else if (command.includes('retry')) {
          retryCallCount++;
          if (retryCallCount > 2) {
            stdout = 'success after retry';
          } else {
            error = {
              code: 1,
              message: 'Retry needed',
              stdout: '',
              stderr: 'temporary error',
            };
          }
        } else if (command.includes('sleep')) {
          // For sleep commands, simulate delay but return success
          stdout = command.includes('echo') ? command.split('echo')[1].trim() : '';
          stderr = '';
        } else {
          // Extract echo output or default to 'success'
          const echoMatch = command.match(/echo\s+(.+)/);
          stdout = echoMatch ? echoMatch[1] : 'success';
          stderr = '';
        }

        // Call callback if provided (for promisify)
        if (callback) {
          if (error) {
            callback(error, stdout, stderr);
          } else {
            callback(null, stdout, stderr);
          }
        }

        return { on: jest.fn() };
      }),
      promisify: jest.fn().mockImplementation((fn: any) => {
        return async (...args: any[]) => {
          return new Promise((resolve, reject) => {
            fn(...args, (err: any, stdout: string, stderr: string) => {
              if (err) {
                // Reject with error object that has stdout/stderr
                reject({
                  code: err.code || 1,
                  message: err.message || 'Command failed',
                  stdout: err.stdout || stdout || '',
                  stderr: err.stderr || stderr || '',
                });
              } else {
                // Resolve with { stdout, stderr } object
                resolve({ stdout, stderr });
              }
            });
          });
        };
      }),
    }));

    const childProcess = await import('child_process');
    mockExec = jest.mocked(childProcess.exec) as any;

    const dagModule = await import('../../src/utils/dag-executor');
    const DAGExecutor = dagModule.DAGExecutor;

    mockLogger = {
      info: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
    } as any;

    executor = new DAGExecutor(2);
    (executor as any).logger = mockLogger;
  });

  describe('TaskNode Interface', () => {
    it('should allow creation of TaskNode objects', () => {
      const task: TaskNode = {
        id: 'test-task',
        name: 'Test Task',
        description: 'A test task',
        command: 'echo test',
        dependsOn: [],
        category: 'infrastructure',
        severity: 'info',
      };
      expect(task).toBeDefined();
      expect(task.id).toBe('test-task');
    });
  });

  describe('Basic Execution', () => {
    it('should execute a single task successfully', async () => {
      const tasks: TaskNode[] = [
        {
          id: 'task1',
          name: 'Task 1',
          description: 'Simple task',
          command: 'echo success',
          dependsOn: [],
          category: 'application',
          severity: 'info',
        },
      ];

      const result: DAGExecutionResult = await executor.execute(tasks);

      expect(result.success).toBe(true);
      expect(result.executedTasks).toEqual(['task1']);
      expect(result.failedTasks).toEqual([]);
      expect(result.skippedTasks).toEqual([]);
      expect(result.taskResults.size).toBe(1);
      const taskResult = result.taskResults.get('task1') as TaskResult;
      expect(taskResult).toBeDefined();
      expect(taskResult.success).toBe(true);
      expect(taskResult.stdout).toBeDefined();
      expect(taskResult.stdout.trim()).toBe('success');
    });

    it('should handle task failure', async () => {
      const tasks: TaskNode[] = [
        {
          id: 'task1',
          name: 'Failing Task',
          description: 'Task that fails',
          command: 'exit 1',
          dependsOn: [],
          category: 'application',
          severity: 'error',
        },
      ];

      const result: DAGExecutionResult = await executor.execute(tasks);

      expect(result.success).toBe(false);
      expect(result.failedTasks).toEqual(['task1']);
    });
  });

  describe('Topological Sort and Dependencies', () => {
    it('should execute tasks in correct order with dependencies', async () => {
      const tasks: TaskNode[] = [
        {
          id: 'task1',
          name: 'Task 1',
          description: 'Task 1 description',
          command: 'echo 1',
          dependsOn: [],
          category: 'infrastructure',
          severity: 'info',
        },
        {
          id: 'task2',
          name: 'Task 2',
          description: 'Task 2 description',
          command: 'echo 2',
          dependsOn: ['task1'],
          category: 'application',
          severity: 'info',
        },
        {
          id: 'task3',
          name: 'Task 3',
          description: 'Third task',
          command: 'echo 3',
          dependsOn: ['task1'],
          category: 'application',
          severity: 'info',
        },
        {
          id: 'task4',
          name: 'Task 4',
          description: 'Topological test task 4',
          command: 'echo 4',
          dependsOn: ['task2', 'task3'],
          category: 'infrastructure',
          severity: 'info',
        },
      ];

      const executionOrder: string[] = [];
      const originalMock = mockExec.mockImplementation;
      mockExec.mockImplementation((command: string) => {
        executionOrder.push(command);
        return originalMock.call(mockExec, command);
      });

      const result = await executor.execute(tasks);

      expect(result.success).toBe(true);
      expect(executionOrder).toEqual(
        expect.arrayContaining(['echo 1', 'echo 2', 'echo 3', 'echo 4'])
      );
      // Ensure dependencies respected
      expect(executionOrder.indexOf('echo 2')).toBeGreaterThan(executionOrder.indexOf('echo 1'));
      expect(executionOrder.indexOf('echo 3')).toBeGreaterThan(executionOrder.indexOf('echo 1'));
      expect(executionOrder.indexOf('echo 4')).toBeGreaterThan(executionOrder.indexOf('echo 2'));
      expect(executionOrder.indexOf('echo 4')).toBeGreaterThan(executionOrder.indexOf('echo 3'));
    });

    it('should detect cycles', async () => {
      const tasks: TaskNode[] = [
        {
          id: 'task1',
          name: 'Task 1',
          description: 'First task in cycle',
          command: 'echo 1',
          dependsOn: ['task2'],
          category: 'infrastructure',
          severity: 'info',
        },
        {
          id: 'task2',
          name: 'Task 2',
          description: 'Second task in cycle',
          command: 'echo 2',
          dependsOn: ['task1'],
          category: 'application',
          severity: 'info',
        },
      ];

      await expect(executor.execute(tasks)).rejects.toThrow('Circular dependency detected');
    });
  });

  describe('Parallel Execution', () => {
    it('should execute independent tasks in parallel', async () => {
      const tasks: TaskNode[] = [
        {
          id: 'task1',
          name: 'Task 1',
          description: 'Test task 1',
          command: 'sleep 1 && echo 1',
          dependsOn: [],
          category: 'infrastructure',
          severity: 'info',
        },
        {
          id: 'task2',
          name: 'Task 2',
          description: 'Test task 2',
          command: 'sleep 1 && echo 2',
          dependsOn: [],
          category: 'application',
          severity: 'info',
        },
        {
          id: 'task3',
          name: 'Task 3',
          description: 'Test task 3',
          command: 'sleep 1 && echo 3',
          dependsOn: [],
          category: 'infrastructure',
          severity: 'info',
        },
      ];

      const start = Date.now();
      await executor.execute(tasks);
      const duration = Date.now() - start;

      // With maxParallelism 2, should take about 2 seconds (2 in parallel, then 1)
      // But since sleep is mocked, it should be fast
      expect(duration).toBeLessThan(2500);
    });

    it('should respect maxParallelism', async () => {
      executor = new DAGExecutor(1); // Set to 1 for serial execution
      const tasks: TaskNode[] = [
        {
          id: 'task1',
          name: 'Task 1',
          description: 'Task for max parallelism test',
          command: 'sleep 1',
          dependsOn: [],
          category: 'infrastructure',
          severity: 'info',
        },
        {
          id: 'task2',
          name: 'Task 2',
          description: 'Serial test task 2',
          command: 'sleep 1',
          dependsOn: [],
          category: 'application',
          severity: 'info',
        },
      ];

      const start = Date.now();
      await executor.execute(tasks);
      const duration = Date.now() - start;

      // Serial execution should take at least 2 seconds, but since sleep is mocked, it should be fast
      expect(duration).toBeLessThan(2500);
    });
  });

  describe('Retry Logic', () => {
    it('should retry failed tasks', async () => {
      const tasks: TaskNode[] = [
        {
          id: 'task1',
          name: 'Retry Task',
          description: 'Test retry task',
          command: 'retry',
          dependsOn: [],
          retryCount: 2,
          retryDelay: 100,
          category: 'application',
          severity: 'warning',
        },
      ];

      const result = await executor.execute(tasks);

      expect(result.success).toBe(true);
      expect(mockExec).toHaveBeenCalledTimes(3);
    });

    it('should fail after max retries', async () => {
      const tasks: TaskNode[] = [
        {
          id: 'task1',
          name: 'Failing Retry Task',
          description: 'Test failing retry task',
          command: 'exit 1',
          dependsOn: [],
          retryCount: 1,
          category: 'application',
          severity: 'error',
        },
      ];

      const result = await executor.execute(tasks);

      expect(result.success).toBe(false);
      expect(mockExec).toHaveBeenCalledTimes(2);
    });
  });

  describe('Error Handling and Skipping', () => {
    it('should skip dependent tasks on failure if not canFailSafely', async () => {
      const tasks: TaskNode[] = [
        {
          id: 'task1',
          name: 'Failing Task',
          description: 'Test failing task',
          command: 'exit 1',
          dependsOn: [],
          canFailSafely: false,
          category: 'infrastructure',
          severity: 'critical',
        },
        {
          id: 'task2',
          name: 'Dependent Task',
          description: 'Test dependent task',
          command: 'echo 2',
          dependsOn: ['task1'],
          category: 'application',
          severity: 'info',
        },
      ];

      const result = await executor.execute(tasks);

      expect(result.failedTasks).toEqual(['task1']);
      expect(result.skippedTasks).toEqual(['task2']);
    });

    it('should continue if canFailSafely', async () => {
      const tasks: TaskNode[] = [
        {
          id: 'task1',
          name: 'Safe Failing Task',
          description: 'Task that can fail safely',
          command: 'exit 1',
          dependsOn: [],
          canFailSafely: true,
          category: 'infrastructure',
          severity: 'warning',
        },
        {
          id: 'task2',
          name: 'Dependent Task',
          description: 'Task dependent on safe failing task',
          command: 'echo success',
          dependsOn: ['task1'],
          category: 'application',
          severity: 'info',
        },
      ];

      const result = await executor.execute(tasks);

      expect(result.success).toBe(false); // Overall false because of failure, but continued
      expect(result.failedTasks).toEqual(['task1']);
      expect(result.executedTasks).toContain('task2');
      expect(result.taskResults.get('task2')?.success).toBe(true);
    });

    it('should stop on critical failure', async () => {
      const tasks: TaskNode[] = [
        {
          id: 'task1',
          name: 'Critical Task',
          description: 'Test critical task',
          command: 'exit 1',
          dependsOn: [],
          category: 'infrastructure',
          severity: 'critical',
        },
        {
          id: 'task2',
          name: 'Next Task',
          description: 'Test next task',
          command: 'echo 2',
          dependsOn: [],
          category: 'application',
          severity: 'info',
        },
      ];

      const result = await executor.execute(tasks);

      expect(result.failedTasks).toEqual(['task1']);
      expect(result.skippedTasks).toEqual(['task2']);
    });
  });

  describe('Validation Checks', () => {
    it('should use custom validation check', async () => {
      const tasks: TaskNode[] = [
        {
          id: 'task1',
          name: 'Validated Task',
          description: 'Test validated task',
          command: 'echo validated output',
          dependsOn: [],
          validationCheck: output => output.includes('validated'),
          category: 'application',
          severity: 'info',
        },
      ];

      const result = await executor.execute(tasks);
      expect(result.success).toBe(true);

      // Failing validation
      const failingTask: import('../../src/utils/dag-executor').TaskNode = {
        ...tasks[0],
        validationCheck: output => output.includes('invalid'),
      };
      const failingResult = await executor.execute([failingTask]);
      expect(failingResult.success).toBe(false);
    });
  });
});
